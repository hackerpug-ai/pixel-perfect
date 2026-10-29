// FLOW-GRD-06-MISSING-KEY: a missing credential fails closed before any model request, and the same
// guard lets a bound invocation run.
//
// What is real here: the host's own environment, read as booleans only; a child process spawned by the
// guard whose env is the guard's own assembly; a marker file that exists only if the guard actually
// ran the child; the runtime's real modules scanned for a rejected stance; and the same guard object
// answering both ways inside one run. The runner's environment is never mutated — the keyless
// environment is a child env, which is the only place a key can be absent without lying.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createCapture } from "../../test/harness/runtime/capture.mjs";
import { gradeFromEvidence, readGrade, writeGrade } from "../../test/harness/runtime/grade-writer.mjs";
import { guardInvocation, resolveCredential, runGuarded, sessionId } from "../../test/harness/runtime/guard.mjs";
import { APPROVED_MODES, assertStance, recordStance, serializeStance } from "../../test/harness/runtime/stance.mjs";
import { loadPins } from "../../test/harness/pins.mjs";
import { ADAPTER_PENDING, ABSENT_REASONS, absentReason } from "../../test/harness/adapters/absent.mjs";
import { CELL_SOURCES, cellFor, planCells } from "../../test/harness/adapters/registry.mjs";
import { inspectWorkflowDeclaration, readWorkflow } from "./flow-runner.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const RUNTIME_DIR = join(ROOT, "test/harness/runtime");
const REPORT_DIR = join(ROOT, ".tmp", "sprint-01-verification");
const ARTIFACT = join(REPORT_DIR, "grd-06-missing-key.json");
const LIVE_ARTIFACT =
  process.env.HARNESS_EVAL_RESULT ?? join(ROOT, ".tmp", "sprint-01-artifacts", "he1", "harness-eval-result.json");
const PLUGIN_ROOT = join(ROOT, "plugins/pixel-perfect");

// Every credential name the eval knows about. Built here, never spelled into the runtime.
const SECRET_NAMES = /^(SMOKE_[A-Z0-9_]+|ANTHROPIC_API_KEY|CODEX_API_KEY|XAI_API_KEY|GEMINI_API_KEY|CURSOR_API_KEY)$/;
// § CommandTranslation / CredentialBinding: the five bindings harness-smoke supplies, mapped onto
// the CLI variables the guard checks. Cursor's own name is the one harness-smoke does not have.
const SMOKE_BINDINGS = {
  "claude-code": "ANTHROPIC_API_KEY",
  codex: "CODEX_API_KEY",
  grok: "XAI_API_KEY",
  opencode: "ANTHROPIC_API_KEY",
  pi: "GEMINI_API_KEY",
};

// The stance the owner rejected; assembled at run time so it is not spelled into the repo.
const REJECTED_MODE = ["bypass", "Permissions"].join("");

/** The runner's environment with every model credential removed — the keyless child env. */
function withoutSecrets(env) {
  return Object.fromEntries(Object.entries(env).filter(([name]) => !SECRET_NAMES.test(name)));
}

// Writes a marker only if it really ran, and reports which credential names reached its env.
const MARKER_CHILD = `
const { writeFileSync } = require("node:fs");
writeFileSync(process.argv[1], "ran");
const names = Object.keys(process.env).filter((name) => new RegExp("^(SMOKE_[A-Z0-9_]+|ANTHROPIC_API_KEY|CODEX_API_KEY|XAI_API_KEY|GEMINI_API_KEY|CURSOR_API_KEY)$").test(name)).sort();
process.stdout.write(JSON.stringify({ type: "child_env", secret_names: names }) + "\\n");
`;

function installation() {
  return {
    requested_cli_version: "2.1.291",
    resolved_cli_version: "2.1.291",
    observed_cli_version: null,
    install_mode: "checkout",
    plugin_revision: null,
    expected_plugin_manifest_sha256: null,
    observed_plugin_manifest_sha256: null,
    loaded_plugin_root: null,
    plugin_load_evidence: null,
  };
}

/** The both-ways assertion an always-refusing guard must fail. */
function bothWays({ keylessDecision, keyedDecision }) {
  const failures = [];
  if (keylessDecision?.allowed !== false) failures.push("the keyless invocation was not refused");
  if (keylessDecision?.refusal?.reason !== "missing-api-key") failures.push(`keyless refusal is ${keylessDecision?.refusal?.reason}`);
  if (keyedDecision?.allowed !== true) failures.push("the bound invocation did not proceed");
  if (keyedDecision?.refusal != null) failures.push(`the bound invocation recorded ${keyedDecision.refusal.reason}`);
  return { ok: failures.length === 0, failures };
}

/** A static always-refuse guard: one refusal for every input. The control the flow must catch. */
function alwaysRefuse() {
  return { allowed: false, refusal: { verdict: "could-not-run", reason: "missing-api-key" } };
}

// ---------------------------------------------------------------------------
// [T9] The credential binding: which step may hold which key, and the keyless control that proves
// a removed key is refused rather than read as a pass. The table below is the PRD's
// CredentialBinding table; pins.json is the grading authority, so the two are cross-checked and
// neither can drift alone. The workflow's own step bodies are then EXECUTED with the runner's
// credentials stripped, so the control row is observed rather than read off the file.
// ---------------------------------------------------------------------------
const WORKFLOW_PATH = ".github/workflows/harness-eval.yml";
const RUNBOOK_PATH = "test/harness/ENVIRONMENT.md";
const REPO = process.env.HARNESS_EVAL_REPO ?? "hackerpug-ai/pixel-perfect";
const SECRET_BINDINGS = {
  "claude-code": { secret: "SMOKE_CLAUDE_KEY", variable: "ANTHROPIC_API_KEY" },
  codex: { secret: "SMOKE_CODEX_KEY", variable: "CODEX_API_KEY" },
  grok: { secret: "SMOKE_GROK_KEY", variable: "XAI_API_KEY" },
  opencode: { secret: "SMOKE_OPENCODE_KEY", variable: "ANTHROPIC_API_KEY" },
  pi: { secret: "SMOKE_PI_KEY", variable: "GEMINI_API_KEY" },
};
const BOUND_VARIABLES = [...new Set(Object.values(SECRET_BINDINGS).map((binding) => binding.variable)), "CURSOR_API_KEY"];
// The workflow's own matrix expression and secret expression, assembled so a template literal here
// never interpolates them.
const MATRIX_TRACK_EXPR = `\${{ matrix.track }}`;
const secretRefFor = (name) => ["$" + "{{", `secrets.${name}`, "}}"].join(" ");

/** Runs one workflow step's own shell body in a sandbox, with the given child env. */
function runStepBody(step, env) {
  const dir = mkdtempSync(join(tmpdir(), "pp-grd-06-step-"));
  symlinkSync(join(ROOT, "test"), join(dir, "test"), "dir");
  const result = spawnSync("bash", ["-e"], { input: String(step?.run ?? ""), cwd: dir, env, encoding: "utf8", timeout: 120_000 });
  return {
    dir,
    result,
    read(file) {
      const path = join(dir, "cell", file);
      if (!existsSync(path)) return { missing: path, stdout: result.stdout, stderr: result.stderr };
      return JSON.parse(readFileSync(path, "utf8"));
    },
    /** The guard's own capture, when the step body ran an invocation: the observation, not a claim. */
    capture() {
      const dir = join(this.dir, "cell", "evidence");
      if (!existsSync(dir)) return null;
      const file = readdirSync(dir).find((entry) => entry.endsWith(".capture.json"));
      return file ? JSON.parse(readFileSync(join(dir, file), "utf8")) : null;
    },
  };
}

/** The environment's secret NAMES, read through gh's `--jq` name projection. Never a value. */
function readEnvironmentSecretNames() {
  const command = `gh api repos/${REPO}/environments/harness-smoke/secrets --jq '[.secrets[].name]|sort'`;
  try {
    const stdout = execFileSync("gh", ["api", `repos/${REPO}/environments/harness-smoke/secrets`, "--jq", "[.secrets[].name]|sort"], {
      encoding: "utf8",
      timeout: 30_000,
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { status: "observed", command, names: JSON.parse(stdout) };
  } catch (error) {
    // No gh, no token, no network: the environment is unobservable here, which is not a pass.
    return { status: "not-executed", command, reason: String(error.stderr || error.message).trim().slice(0, 300) };
  }
}

test("FLOW-GRD-06-MISSING-KEY", async (t) => {
  const projectDir = mkdtempSync(join(tmpdir(), "pp-grd-06-"));
  const evidenceDir = mkdtempSync(join(tmpdir(), "pp-grd-06-evidence-"));
  const gradeDir = mkdtempSync(join(tmpdir(), "pp-grd-06-grades-"));
  const markerPath = join(projectDir, "child-ran.marker");
  const runnerKeyBefore = Boolean(process.env.ANTHROPIC_API_KEY);
  const stance = recordStance({ harness: "claude-code", plugin_root: PLUGIN_ROOT });

  const artifact = {
    flow: "FLOW-GRD-06-MISSING-KEY",
    uc_ref: "UC-GRD-06",
    generated_at: new Date().toISOString(),
    candidate_sha: execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim(),
    runner_env: { anthropic_key_present: runnerKeyBefore, mutated: false },
    controls: [],
    stances: [],
    awaiting: [],
    failures: [],
  };

  try {
    // ---- keyless: refused before any model request --------------------------------------
    const keylessEnv = withoutSecrets(process.env);
    assert.equal(Boolean(keylessEnv.ANTHROPIC_API_KEY), false, "the keyless child env really has no binding");
    const keylessCapture = createCapture({ harness: "claude-code", check_id: "verify", cwd: projectDir, timeout_ms: 20_000 });
    const keyless = await runGuarded({
      harness: "claude-code",
      stance,
      env: keylessEnv,
      capture: keylessCapture,
      command: process.execPath,
      args: ["-e", MARKER_CHILD, markerPath],
      cwd: projectDir,
      timeout_ms: 20_000,
    });
    assert.equal(keyless.decision.allowed, false);
    assert.equal(keyless.decision.refusal.verdict, "could-not-run");
    assert.equal(keyless.decision.refusal.reason, "missing-api-key");
    assert.equal(keyless.decision.credential.present, false);
    assert.deepEqual(keyless.decision.credential.checked, ["ANTHROPIC_API_KEY"], "no fallback store is invented");
    assert.equal(keyless.status, null, "a refused invocation has no process status");

    const keylessRecord = keylessCapture.persist(evidenceDir);
    assert.equal(keylessRecord.model_request_count, 0, "zero model requests before the refusal");
    assert.equal(keylessRecord.model_requests.length, 0);
    assert.equal(keylessRecord.refusal.reason, "missing-api-key");
    assert.equal(keylessRecord.decided_before, "model-request");
    assert.equal(existsSync(markerPath), false, "the child never ran, so no request was made");
    artifact.controls.push({
      control_id: "missing-key",
      verdict: keyless.decision.refusal.verdict,
      reason: keyless.decision.refusal.reason,
      model_request_count: keylessRecord.model_request_count,
      child_ran: existsSync(markerPath),
    });

    // ---- the one write path expresses the refusal (F-T3-1) ------------------------------
    // The guard refuses, so no process ever ran: the writer must carry the guard's OWN reason,
    // and must not dress a never-started invocation up as a crash or a truncated capture.
    const keylessCell = gradeFromEvidence({
      record: keylessRecord,
      installation: installation(),
      harness: "claude-code",
      track: "pinned",
      check_id: "verify",
      evidence_paths: keylessRecord.evidence_paths,
      report_paths: [],
      required_facts: [],
    });
    assert.equal(keylessCell.verdict, "could-not-run", "a refused invocation is never a pass");
    assert.equal(keylessCell.reason, "missing-api-key", "the guard's own reason reaches the written cell");
    assert.deepEqual(
      keylessCell.block_reasons.map((entry) => entry.reason),
      ["missing-api-key"],
      "a refusal is neither a termination-unexpected nor a capture-prefix-incomplete",
    );
    const keylessWritten = writeGrade({ dir: gradeDir, cell: keylessCell });
    assert.equal(keylessWritten.ok, true, `keyless grade did not read back: ${JSON.stringify(keylessWritten.mismatches)}`);
    const keylessRead = readGrade(keylessWritten.path);
    assert.equal(keylessRead.verdict, "could-not-run");
    assert.equal(keylessRead.reason, "missing-api-key", "the reason survives temp->fsync->rename->read-back");
    artifact.controls.push({
      control_id: "missing-key-cell",
      verdict: keylessRead.verdict,
      reason: keylessRead.reason,
      block_reasons: keylessCell.block_reasons.map((entry) => entry.reason),
      grade_path: keylessWritten.path,
    });

    // ---- bound: the same guard proceeds down the same code path --------------------------
    const keyedEnv = { ...process.env, ANTHROPIC_API_KEY: "present-binding-not-a-model-call" };
    const keyedCapture = createCapture({ harness: "claude-code", check_id: "verify", cwd: projectDir, timeout_ms: 20_000 });
    const keyed = await runGuarded({
      harness: "claude-code",
      stance,
      env: keyedEnv,
      capture: keyedCapture,
      command: process.execPath,
      args: ["-e", MARKER_CHILD, markerPath],
      cwd: projectDir,
      timeout_ms: 20_000,
    });
    assert.equal(keyed.decision.allowed, true, "the guard fires on absence, not unconditionally");
    assert.equal(keyed.decision.refusal, null);
    assert.equal(keyed.decision.credential.present_name, "ANTHROPIC_API_KEY");
    assert.equal(existsSync(markerPath), true, "the bound path really spawned the child");
    const keyedRecord = keyedCapture.persist(evidenceDir);
    assert.equal(keyedRecord.model_request_count, 1, "the bound path records the request it made");
    assert.equal(keyedRecord.refusal, null);

    const childEnv = JSON.parse(keyedCapture.lines().map((line) => line.text).join("\n").trim());
    assert.deepEqual(childEnv.secret_names, ["ANTHROPIC_API_KEY"], "the child receives only its own binding");
    artifact.controls.push({
      control_id: "key-present",
      verdict: "proceeded",
      reason: null,
      model_request_count: keyedRecord.model_request_count,
      child_env_secret_names: childEnv.secret_names,
    });

    // No secret value is written anywhere the artifact can see.
    const reportText = `${JSON.stringify(keylessRecord)}${JSON.stringify(keyedRecord)}`;
    assert.equal(reportText.includes("present-binding-not-a-model-call"), false, "no credential value reaches the capture");

    // ---- the both-ways control, and the static-refuse mutant it must catch ---------------
    const pair = bothWays({ keylessDecision: keyless.decision, keyedDecision: keyed.decision });
    assert.equal(pair.ok, true, pair.failures.join("; "));
    const mutant = bothWays({ keylessDecision: keyless.decision, keyedDecision: alwaysRefuse() });
    assert.equal(mutant.ok, false, "a static always-refusing guard must fail this control");
    assert.ok(mutant.failures.some((failure) => failure.includes("did not proceed")));
    artifact.controls.push({ control_id: "static-always-refuse-guard", verdict: "caught", reason: mutant.failures[0] });

    // ---- stance: recorded dontAsk + --add-dir, and no stance blocks the run --------------
    assert.deepEqual(stance.argv, ["--permission-mode", "dontAsk", "--add-dir", PLUGIN_ROOT]);
    assert.equal(stance.mode, "dontAsk");
    assert.equal(stance.add_dir, PLUGIN_ROOT);
    assert.equal(stance.recorded_before, "first-model-call");
    assert.equal(serializeStance(stance), JSON.stringify(stance));
    artifact.stances.push({ harness: stance.harness, mode: stance.mode, add_dir: stance.add_dir });

    const noStance = guardInvocation({ harness: "claude-code", stance: null, env: keyedEnv });
    assert.equal(noStance.allowed, false);
    assert.equal(noStance.refusal.reason, "stance-unrecorded");
    artifact.controls.push({ control_id: "no-stance", verdict: noStance.refusal.verdict, reason: noStance.refusal.reason });

    // TC-4: zero rejected-mode stances recorded, and the literal is not in the runtime at all.
    const hits = [];
    const walk = (dir) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) walk(path);
        else if (readFileSync(path, "utf8").includes(REJECTED_MODE)) hits.push(path);
      }
    };
    walk(RUNTIME_DIR);
    assert.deepEqual(hits, [], `the rejected mode is spelled in the runtime: ${hits.join(", ")}`);
    for (const recorded of artifact.stances) assert.ok(APPROVED_MODES.includes(recorded.mode));
    assert.throws(
      () => assertStance(recordStance({ harness: "claude-code", plugin_root: PLUGIN_ROOT, mode: REJECTED_MODE }), "claude-code"),
      (error) => error.reason === "stance-mode-not-approved",
    );
    assert.throws(
      () => assertStance(recordStance({ harness: "claude-code", plugin_root: PLUGIN_ROOT }), "codex"),
      (error) => error.reason === "stance-harness-mismatch",
    );
    artifact.stance_scan = { runtime_dir: RUNTIME_DIR, rejected_mode_hits: hits.length, approved_modes: APPROVED_MODES };

    // ---- the cursor cell cites the same reason string, from the same code path -----------
    const cursorNoStance = guardInvocation({ harness: "cursor", stance, env: withoutSecrets(process.env) });
    assert.equal(cursorNoStance.allowed, false);
    assert.equal(
      cursorNoStance.refusal.reason,
      keyless.decision.refusal.reason,
      "a per-harness special-cased reason string would be a fabricated verdict",
    );
    artifact.controls.push({
      control_id: "cursor-missing-key",
      verdict: cursorNoStance.refusal.verdict,
      reason: cursorNoStance.refusal.reason,
      same_reason_as_missing_key: cursorNoStance.refusal.reason === keyless.decision.refusal.reason,
    });

    // ---- the guard's own identity rules --------------------------------------------------
    const credential = resolveCredential({ harness: "pi", env: withoutSecrets(process.env) });
    assert.equal(credential.binding_env, "GEMINI_API_KEY");
    assert.equal(credential.credential_env, "SMOKE_PI_KEY");
    assert.equal(credential.present, false);
    assert.deepEqual(credential.checks.map((check) => check.name), ["GEMINI_API_KEY"], "no login cache, no alternate secret");
    assert.match(sessionId("claude-code"), /^claude-code:/);
    assert.notEqual(sessionId("claude-code"), sessionId("codex"));
    artifact.assertions = [
      `credential names are read from pins: pi binding ${credential.binding_env}`,
      `session ids are harness-namespaced: ${sessionId("claude-code")}`,
    ];
    artifact.session_id_sample = sessionId("claude-code");

    // ---- T10: the twelve cells come from that same guard decision ------------------------
    // The registry decides who owns each (harness, track) cell. It is fed the harness-smoke
    // binding shape as a child env: five bindings mapped onto their CLI variables, Cursor's absent.
    const pins = loadPins();
    const placeholder = (name) => `placeholder-not-a-credential-${name.toLowerCase()}`;
    const smokeEnv = withoutSecrets(process.env);
    for (const name of new Set(Object.values(SMOKE_BINDINGS))) smokeEnv[name] = placeholder(name);

    // Env absence is asserted through the guard's own check BEFORE any refusal is asserted.
    assert.equal(resolveCredential({ harness: "cursor", env: smokeEnv }).present, false, "cursor's binding is absent in the smoke shape");
    for (const harness of Object.keys(SMOKE_BINDINGS)) {
      assert.equal(resolveCredential({ harness, env: smokeEnv }).present, true, `${harness}'s binding is present, so absence cannot be what refuses it`);
    }

    const keyedPlan = planCells({ manifest: pins.manifest, env: smokeEnv, adapters: new Set(), observed: {}, installMode: "checkout" });
    assert.equal(keyedPlan.pairs.length, 12, "twelve pairs are enumerated");
    assert.equal(new Set(keyedPlan.pairs).size, 12, "no duplicate pair");
    assert.equal(keyedPlan.cells.length + keyedPlan.adapterOwned.length, 12, "no cell is dropped");
    assert.deepEqual(keyedPlan.adapterOwned, [], "no adapter is loaded, so every cell is decided here");
    assert.deepEqual(
      [...new Set(keyedPlan.cells.map((cell) => cell.harness))].sort(),
      [...Object.keys(ABSENT_REASONS)].sort(),
      "six harnesses, cursor included",
    );
    for (const cell of keyedPlan.cells) {
      assert.equal(cell.verdict, "could-not-run", `${cell.harness}/${cell.track} may not pass`);
    }

    // TC-4: the cursor reason is the live guard refusal from THIS run, not a constant anywhere.
    for (const track of ["pinned", "newest"]) {
      const cell = keyedPlan.cells.find((candidate) => candidate.harness === "cursor" && candidate.track === track);
      assert.equal(cell.verdict, "could-not-run");
      assert.equal(cell.reason, keyless.decision.refusal.reason, `cursor/${track} carries the guard's own reason`);
      assert.equal(cell.reason, "missing-api-key");
      assert.equal(cell.source, CELL_SOURCES.GUARD, `cursor/${track} was decided by the guard, not by the registry's fallback`);
    }
    for (const decision of keyedPlan.decisions.filter((entry) => entry.harness === "cursor")) {
      assert.equal(decision.refusal.check, "credential", "cursor is refused by the credential check");
      assert.equal(decision.refusal.model_requests, 0, "zero model requests before the refusal");
      assert.equal(decision.refusal.decided_before, "model-request");
    }

    // TC-3: the four adapter-pending harnesses are real cells with distinct named reasons.
    const pendingReasons = [];
    for (const harness of ADAPTER_PENDING) {
      for (const track of ["pinned", "newest"]) {
        const cell = keyedPlan.cells.find((candidate) => candidate.harness === harness && candidate.track === track);
        assert.ok(cell, `${harness}/${track} exists`);
        assert.equal(cell.verdict, "could-not-run", `${harness}/${track} is never a pass`);
        assert.equal(cell.reason, absentReason(harness), `${harness}/${track} names its own absent adapter`);
        // Distinctness alone lets a meaningless string through, so pin the documented shape.
        assert.match(cell.reason, new RegExp(`^${harness}-adapter-not-implemented$`), `${harness}/${track} names why nothing was graded`);
        assert.equal(cell.source, CELL_SOURCES.ABSENT);
        assert.notEqual(cell.reason, "missing-api-key", `${harness} has a key here, so a key problem would be a lie`);
      }
      pendingReasons.push(absentReason(harness));
    }
    assert.equal(new Set(pendingReasons).size, 4, "four distinct named reasons, not one shared string");

    // The control a static always-refusing guard fails: with a binding present the registry
    // defers to the loaded adapter instead of refusing. Pinned needs no lookup, so this leg makes
    // no network call and no version is borrowed from anywhere.
    const deferred = cellFor("claude-code", "pinned", { manifest: pins.manifest, env: smokeEnv, adapters: new Set(["claude-code"]), observed: {} });
    assert.equal(deferred.decision.credential.present, true, "the binding is present");
    assert.equal(deferred.decision.refusal, null, "a present binding records no refusal");
    assert.equal(deferred.cell, null, "a loaded adapter grades this cell; this module does not");

    // The fully keyless plan: every cell is the guard's own reason, and still twelve cells.
    const keylessPlan = planCells({ manifest: pins.manifest, env: withoutSecrets(process.env), adapters: new Set(), observed: {}, installMode: "checkout" });
    assert.equal(keylessPlan.cells.length, 12, "a keyless environment still yields twelve cells");
    for (const cell of keylessPlan.cells) {
      assert.equal(cell.verdict, "could-not-run");
      assert.equal(cell.reason, keyless.decision.refusal.reason, `${cell.harness}/${cell.track} carries the live guard reason`);
      assert.equal(cell.reason, "missing-api-key");
    }

    // No placeholder value reaches any record this flow writes.
    for (const name of new Set(Object.values(SMOKE_BINDINGS))) {
      assert.equal(
        JSON.stringify({ cells: keyedPlan.cells, decisions: keyedPlan.decisions }).includes(placeholder(name)),
        false,
        `no credential value for ${name} reaches the record`,
      );
    }

    artifact.t10 = {
      task: "T10",
      pins_sha256: pins.pins_sha256,
      cells: keyedPlan.cells.length,
      pairs: keyedPlan.pairs.length,
      cells_detail: keyedPlan.cells.map((cell) => ({
        cell: `${cell.harness}/${cell.track}`,
        verdict: cell.verdict,
        reason: cell.reason,
        source: cell.source,
      })),
      cursor_reason: keyedPlan.cells.find((cell) => cell.harness === "cursor" && cell.track === "pinned").reason,
      guard_refusal_reason: keyless.decision.refusal.reason,
      pending_adapters: Object.fromEntries(ADAPTER_PENDING.map((harness) => [harness, absentReason(harness)])),
      bindings_checked: [...new Set(Object.values(SMOKE_BINDINGS)), "CURSOR_API_KEY"],
      deferred_when_adapter_loaded: deferred.cell === null ? ["claude-code/pinned"] : [],
      negative_controls: [
        "binding present -> no missing-api-key (a static always-refuse guard fails this)",
        "adapter absent with a key -> named absent reason, never a key problem",
        "adapter loaded -> the registry defers instead of grading",
        "four pending harnesses -> four distinct reasons",
        "keyless environment -> twelve cells, all the guard's reason",
      ],
    };
    artifact.controls.push({
      control_id: "registry-missing-key",
      verdict: artifact.t10.cursor_reason === keyless.decision.refusal.reason ? "could-not-run" : "invalid",
      reason: artifact.t10.cursor_reason,
      same_reason_as_guard: artifact.t10.cursor_reason === keyless.decision.refusal.reason,
      cells: keyedPlan.cells.length,
    });

    // ---- the hosted run's controls rows, when an artifact exists -------------------------
    if (existsSync(LIVE_ARTIFACT)) {
      const live = JSON.parse(readFileSync(LIVE_ARTIFACT, "utf8"));
      const controls = live.controls ?? [];
      const missingKey = controls.find((row) => row.control_id === "missing-key");
      assert.ok(missingKey, "the hosted artifact carries a missing-key control row");
      assert.equal(missingKey.verdict, "could-not-run");
      assert.equal(missingKey.reason, "missing-api-key");
      const cursorCell = (live.cells ?? []).find((cell) => cell.harness === "cursor");
      if (cursorCell) assert.equal(cursorCell.reason, missingKey.reason, "the cursor cell reason is the control row's reason");
      const authenticated = (live.cells ?? []).filter((cell) => cell.harness === "claude-code" && cell.verdict === "pass");
      assert.ok(authenticated.length > 0, "the authenticated claude-code cells graded pass in the same run");
      artifact.provenance = { live_artifact: { status: "present", path: LIVE_ARTIFACT, controls: controls.length } };
    } else {
      artifact.provenance = {
        live_artifact: {
          status: "absent",
          path: LIVE_ARTIFACT,
          owner: "T8/T11",
          why: "the controls array and the authenticated claude-code pass rows exist only in a hosted run artifact",
        },
      };
      artifact.awaiting.push(
        'controls row "missing-key could-not-run missing-api-key" from a hosted run',
        "paired authenticated claude-code pass rows in the same run",
      );
    }

    // =====================================================================================
    // T9 — the credential binding. Everything below reads or EXECUTES the real workflow.
    // =====================================================================================
    const workflow = readWorkflow(WORKFLOW_PATH);
    const smokeSteps = workflow.yaml?.jobs?.smoke?.steps ?? [];
    const nameOf = (step) => String(step?.name ?? "");
    const envOf = (step) => step?.env ?? {};
    const secretRefsIn = (step) => JSON.stringify(envOf(step)).match(/secrets\.[A-Za-z0-9_]+/g) ?? [];
    const sandboxDirs = [];
    artifact.t9 = { task: "T9", workflow: WORKFLOW_PATH, runbook: RUNBOOK_PATH, bindings: [], observed: [], provenance: {} };

    try {
      // --- TC-2: the workflow's table IS the pins authority's table, cross-checked --------
      const pinsHarnesses = loadPins().manifest.harnesses;
      for (const [harness, binding] of Object.entries(SECRET_BINDINGS)) {
        assert.equal(pinsHarnesses[harness]?.credential_env, binding.secret, `${harness} credential_env disagrees with the binding table`);
        assert.equal(pinsHarnesses[harness]?.binding_env, binding.variable, `${harness} binding_env disagrees with the binding table`);
      }
      assert.equal(pinsHarnesses.pi?.provider, "google", "pi's provider is google, so GEMINI_API_KEY is the variable it consumes");
      assert.equal(pinsHarnesses.cursor?.credential_env, "CURSOR_API_KEY", "cursor's binding name is its own variable");

      // --- the environment attaches to the smoke matrix, and to no other job -------------
      assert.equal(workflow.yaml?.jobs?.smoke?.environment, "harness-smoke", "the smoke matrix is not bound to the harness-smoke environment");
      for (const job of ["drift", "download", "grade"]) {
        assert.equal(workflow.yaml?.jobs?.[job]?.environment, undefined, `jobs.${job} runs in an environment, so it could read a key`);
      }

      // --- TC-4: no write-all grant, and every job opts into read only -------------------
      assert.deepEqual(workflow.yaml?.permissions, {}, `workflow-level permissions are ${JSON.stringify(workflow.yaml?.permissions)}`);
      assert.equal(/write[-_]all/.test(workflow.text), false, "the workflow grants write-all");
      for (const [jobName, job] of Object.entries(workflow.yaml?.jobs ?? {})) {
        for (const [scope, level] of Object.entries(job?.permissions ?? {})) {
          assert.equal(level, "read", `jobs.${jobName} permissions ${scope} is ${String(level)}, not read`);
        }
        assert.ok("contents" in (job?.permissions ?? {}), `jobs.${jobName} declares no contents scope`);
        assert.equal(/id-token|packages|deployments|attestations|issues|pull-requests/.test(JSON.stringify(job?.permissions ?? {})), false, `jobs.${jobName} requests more than read`);
      }

      // --- TC-1/TC-2: one keyed step per harness, on that cell's own model step ----------
      const keyedSteps = {};
      for (const [harness, binding] of Object.entries(SECRET_BINDINGS)) {
        const owners = smokeSteps.filter((step) => secretRefsIn(step).includes(`secrets.${binding.secret}`));
        assert.equal(owners.length, 1, `${harness}: ${owners.length} smoke steps hold ${binding.secret}, expected exactly one`);
        const [step] = owners;
        assert.equal(nameOf(step), `Smoke model step ${harness} ${MATRIX_TRACK_EXPR}`, `${harness}'s key is not on its own model step`);
        assert.deepEqual(
          envOf(step),
          { [binding.variable]: secretRefFor(binding.secret) },
          `${harness} must bind exactly ${binding.variable} from ${binding.secret}, with no alternate provider`,
        );
        assert.match(String(step.if ?? ""), new RegExp(`matrix\\.harness == '${harness}'`), `${harness}'s keyed step is not gated to its own cells`);
        keyedSteps[harness] = step;
        artifact.t9.bindings.push({ harness, secret: binding.secret, variable: binding.variable, step: nameOf(step) });
      }

      // --- exactly those five secret names, and cursor invents none ---------------------
      assert.deepEqual(
        smokeSteps.flatMap(secretRefsIn).sort(),
        Object.values(SECRET_BINDINGS).map((binding) => `secrets.${binding.secret}`).sort(),
        "a smoke step references a secret outside the five SMOKE_ bindings",
      );
      assert.equal(/secrets\s*[.[]\s*['\"]?CURSOR_API_KEY/.test(workflow.text), false, "CURSOR_API_KEY is not in harness-smoke; referencing it would be invented");

      // --- no other step, and no job/workflow env, ever reaches a secret -----------------
      for (const [surface, env] of [["workflow", workflow.yaml?.env], ...Object.entries(workflow.yaml?.jobs ?? {}).map(([name, job]) => [`jobs.${name}`, job?.env])]) {
        assert.equal(/secrets/.test(JSON.stringify(env ?? {})), false, `the ${surface} env binds a secret, so every step below it inherits the key`);
      }
      for (const [jobName, job] of Object.entries(workflow.yaml?.jobs ?? {})) {
        for (const step of job?.steps ?? []) {
          const label = `${jobName}/${nameOf(step)}`;
          // `if:` is a surface too: `if: ${{ secrets.SMOKE_PI_KEY != '' }}` probes a credential's
          // presence on any step without ever naming it in run/with/name, and it is evaluated by
          // the runner, so the scan must read it or the placement proof is blind there.
          const surfaces = [nameOf(step), String(step?.run ?? ""), JSON.stringify(step?.with ?? {}), String(step?.if ?? "")].join("\n");
          assert.equal(/secrets/.test(surfaces), false, `${label} names a secret in name/run/with/if, outside an env block`);
          const isModelStep = Object.values(keyedSteps).includes(step);
          if (!isModelStep) assert.deepEqual(secretRefsIn(step), [], `${label} binds a key but is not a model step`);
        }
      }
      const installStep = smokeSteps.find((step) => /matrix\.harness/.test(String(step?.run ?? "")));
      assert.ok(installStep, "the smoke job has no install slot");
      assert.deepEqual(secretRefsIn(installStep), [], "the install slot binds a key");
      const recordStep = smokeSteps.find((step) => /cell\/cell\.json/.test(String(step?.run ?? "")));
      assert.ok(recordStep, "the smoke job has no step writing cell/cell.json");
      assert.deepEqual(secretRefsIn(recordStep), [], "the cell recorder binds a key");

      // --- T9 widened a shared rule; this is the only check that exercises it, so pin it ------
      // flow-runner's placement rule used to allow a key only on the cell's recording step. T9
      // relaxed it to "any step named `Smoke model step ...`", which is load-bearing for grd-01
      // and run-02. Both directions are asserted here: the real workflow's five model steps must
      // pass, and the same binding moved onto a step that is not a model step must still fail.
      const declaration = inspectWorkflowDeclaration(workflow.yaml);
      assert.deepEqual(declaration.failures, [], `the workflow's declaration fails: ${declaration.failures.join("; ")}`);
      const smuggled = structuredClone(workflow.yaml);
      const movedStep = smuggled.jobs.smoke.steps.find((step) => /^Smoke model step pi /.test(nameOf(step)));
      assert.ok(movedStep, "the pi model step is missing, so the relaxation has nothing to allow");
      assert.equal(Object.keys(envOf(movedStep)).length, 1, "the pi model step holds no binding to move");
      movedStep.name = "Install slot - not a model step";
      const movedFailures = inspectWorkflowDeclaration(smuggled).failures;
      assert.ok(
        movedFailures.some((failure) => /binds a secret outside the cell's own recording step/.test(failure)),
        `the placement rule no longer refuses a key on a non-model step: ${JSON.stringify(movedFailures)}`,
      );
      artifact.t9.observed.push("the shared placement rule exercised both ways: the five model steps pass, the same binding on a non-model step still fails");

      // --- the keyless control: asserts absence in-step, then refuses -------------------
      const controlStep = smokeSteps.find((step) => /^Keyless control\b/.test(nameOf(step)));
      assert.ok(controlStep, "the smoke job has no keyless control step");
      assert.deepEqual(secretRefsIn(controlStep), [], "the keyless control binds a key, so it proves nothing");
      for (const variable of BOUND_VARIABLES) {
        assert.match(String(controlStep.run), new RegExp(variable), `the keyless control never asserts ${variable} is absent`);
      }
      assert.match(String(controlStep.run), /\[ -n "\$\{!name:-\}" \]/, "the keyless control does not assert the consumed key and every fallback are absent");
      assert.match(String(controlStep.if ?? ""), /matrix\.harness == 'claude-code'/, "the keyless control must run beside the authenticated claude-code cells");

      // ------------------- the keyless control, EXECUTED with every credential removed ------
      const keylessRun = runStepBody(controlStep, withoutSecrets(process.env));
      sandboxDirs.push(keylessRun.dir);
      assert.equal(keylessRun.result.status, 0, `the keyless control exited ${keylessRun.result.status}: ${keylessRun.result.stderr}`);
      const controlRow = keylessRun.read("keyless-control.json");
      assert.equal(controlRow.control_id, "missing-key", `the control row is ${JSON.stringify(controlRow)}`);
      assert.equal(controlRow.verdict, "could-not-run", "a missing key was readable as a pass");
      assert.equal(controlRow.reason, "missing-api-key", `the control refused with ${String(controlRow.reason)}`);
      assert.equal(controlRow.model_requests, 0, "the control made a model request before refusing");
      assert.equal(controlRow.child_ran, false, "a refused invocation started a child, so its zero requests prove nothing");
      // The count must be the guard's own capture, not the refusal object's constant: guard.mjs
      // writes model_requests: 0 into EVERY refusal, so a refusal placed after a spawn would still
      // read 0 there while the capture knows no request was begun.
      const controlCapture = keylessRun.capture();
      assert.ok(controlCapture, "the keyless control persisted no capture, so its zero is a constant, not an observation");
      assert.equal(controlRow.model_requests, controlCapture.model_request_count, "the recorded zero is not the observed count");
      assert.deepEqual(controlCapture.model_requests, [], "a model request was begun before the refusal");
      assert.equal(controlCapture.refusal.reason, "missing-api-key", `the captured refusal is ${String(controlCapture.refusal?.reason)}`);
      assert.equal(JSON.stringify(controlRow).includes("present-binding-not-a-model-call"), false, "a credential value reached the control row");
      artifact.t9.controls = [controlRow];
      artifact.t9.observed.push("keyless control executed with every binding absent -> missing-key could-not-run missing-api-key, 0 model requests");

      // --- the negative control: the same step body must NOT refuse when the key is there ---
      // A placeholder, never a credential: it proves the refusal fires on absence, not always.
      const placeholder = ["present", "binding", "not", "a", "model", "call"].join("-");
      const controlWithKey = runStepBody(controlStep, { ...withoutSecrets(process.env), ANTHROPIC_API_KEY: placeholder });
      sandboxDirs.push(controlWithKey.dir);
      assert.notEqual(controlWithKey.result.status, 0, "a key-present environment passed the absence assertion — the control is not wired to the real env");
      assert.match(String(controlWithKey.result.stdout), /the keyless control is invalid/, "the control did not refuse to run when the consumed key was present");
      artifact.t9.observed.push("keyless control executed with ANTHROPIC_API_KEY present -> in-step absence assertion fails, no refusal recorded");

      // --- the EMPTY-string credential: the shape a real runner actually produces ---------
      // A step `env:` binding whose environment secret is unset yields "" on the runner, not an
      // absent variable. If the guard treats "" as present, a hosted keyless cell records bound
      // and the missing-api-key refusal silently becomes stance-unrecorded — so the empty shape is
      // pinned here on the guard, on the control step body, and on a model step body.
      const emptyEnv = withoutSecrets(process.env);
      const emptyCredential = resolveCredential({ harness: "claude-code", env: { ...emptyEnv, ANTHROPIC_API_KEY: "" } });
      assert.deepEqual(emptyCredential.checks, [{ name: "ANTHROPIC_API_KEY", present: false }], "an empty string counted as a credential");
      assert.equal(emptyCredential.present, false, "an empty credential read as present, so a hosted keyless cell could spawn");
      const emptyRun = runStepBody(controlStep, { ...emptyEnv, ANTHROPIC_API_KEY: "" });
      sandboxDirs.push(emptyRun.dir);
      assert.equal(emptyRun.result.status, 0, `the keyless control exited ${emptyRun.result.status} with an empty credential: ${emptyRun.result.stderr}`);
      const emptyRow = emptyRun.read("keyless-control.json");
      assert.equal(emptyRow.verdict, "could-not-run", `an empty credential recorded ${String(emptyRow.verdict)}`);
      assert.equal(emptyRow.reason, "missing-api-key", `an empty credential refused with ${String(emptyRow.reason)}`);
      assert.equal(emptyRow.child_ran, false, "an empty credential started the child");
      assert.equal(emptyRow.model_requests, 0, "an empty credential made a model request");
      const emptyCapture = emptyRun.capture();
      assert.ok(emptyCapture, "the empty-credential control persisted no capture");
      assert.equal(emptyRow.model_requests, emptyCapture.model_request_count, "the empty-credential zero is not the observed count");

      const emptyPi = runStepBody(keyedSteps.pi, { ...emptyEnv, GEMINI_API_KEY: "" });
      sandboxDirs.push(emptyPi.dir);
      assert.equal(emptyPi.result.status, 0, `the pi model step exited ${emptyPi.result.status} with an empty credential: ${emptyPi.result.stderr}`);
      const emptyPiRow = emptyPi.read("binding.json");
      assert.equal(emptyPiRow.present, false, "the pi model step read an empty GEMINI_API_KEY as present");
      assert.equal(emptyPiRow.verdict, "could-not-run", `an empty pi credential recorded ${String(emptyPiRow.verdict)}`);
      assert.equal(emptyPiRow.reason, "missing-api-key", `an empty pi credential refused with ${String(emptyPiRow.reason)}`);
      artifact.t9.observed.push("an EMPTY-string credential — the runner's shape for an unset secret — refuses missing-api-key on the control and on a model step");

      // --- the pi cell's own step, both ways (TC-2) --------------------------------------
      const piAbsent = runStepBody(keyedSteps.pi, withoutSecrets(process.env));
      sandboxDirs.push(piAbsent.dir);
      assert.equal(piAbsent.result.status, 0, `the pi model step body exited ${piAbsent.result.status}: ${piAbsent.result.stderr}`);
      const piRow = piAbsent.read("binding.json");
      assert.equal(piRow.credential_env, "SMOKE_PI_KEY", "TC-2: pi's environment secret is SMOKE_PI_KEY");
      assert.equal(piRow.binding_env, "GEMINI_API_KEY", "TC-2: pi's step variable is GEMINI_API_KEY");
      assert.equal(piRow.verdict, "could-not-run");
      assert.equal(piRow.reason, controlRow.reason, "the model step and the control must refuse for the same reason");
      assert.deepEqual(piRow.checked, ["GEMINI_API_KEY"], "no login cache and no alternate provider is consulted");

      const piPresent = runStepBody(keyedSteps.pi, { ...withoutSecrets(process.env), GEMINI_API_KEY: placeholder });
      sandboxDirs.push(piPresent.dir);
      assert.equal(piPresent.result.status, 0, `the bound pi body exited ${piPresent.result.status}: ${piPresent.result.stderr}`);
      const piBound = piPresent.read("binding.json");
      assert.equal(piBound.present, true, "the binding is refused even when it is present — a static guard");
      assert.equal(piBound.present_name, "GEMINI_API_KEY");
      assert.equal(piBound.verdict, "bound", `the bound pi step recorded ${String(piBound.verdict)}`);
      assert.equal(JSON.stringify(piBound).includes(placeholder), false, "a credential value reached the record");
      artifact.t9.cells = [piRow, piBound];

      // --- cursor: no key to bind, and its reason comes from the same guard path ---------
      const cursorStep = smokeSteps.find((step) => nameOf(step) === `Smoke model step cursor ${MATRIX_TRACK_EXPR}`);
      assert.ok(cursorStep, "cursor has no cell step — a keyless cell may never be omitted");
      assert.deepEqual(secretRefsIn(cursorStep), [], "cursor's step binds a key that does not exist");
      const cursorAbsent = runStepBody(cursorStep, withoutSecrets(process.env));
      sandboxDirs.push(cursorAbsent.dir);
      assert.equal(cursorAbsent.result.status, 0, `the cursor step body exited ${cursorAbsent.result.status}: ${cursorAbsent.result.stderr}`);
      const cursorRow = cursorAbsent.read("binding.json");
      assert.equal(cursorRow.verdict, "could-not-run", "a keyless cursor cell must be could-not-run, never pass");
      assert.equal(cursorRow.reason, controlRow.reason, "a special-cased cursor reason string would be a fabricated verdict");
      assert.equal(cursorRow.credential_env, "CURSOR_API_KEY");
      artifact.t9.cells.push(cursorRow);
      artifact.t9.observed.push("cursor executed without a binding -> could-not-run missing-api-key, the control row's own reason");

      // --- TC-1: the environment really holds exactly the five names --------------------
      const environment = readEnvironmentSecretNames();
      artifact.t9.provenance.environment = environment;
      assert.notEqual(environment.status, "absent", "the environment lookup produced no status");
      if (environment.status === "observed") {
        assert.deepEqual(
          environment.names,
          Object.values(SECRET_BINDINGS).map((binding) => binding.secret).sort(),
          `harness-smoke holds ${JSON.stringify(environment.names)}`,
        );
        assert.equal(
          Object.values(SECRET_BINDINGS).every((binding) => environment.names.includes(binding.secret)),
          true,
          "every binding the workflow consumes is named in the environment",
        );
        artifact.t9.observed.push(`harness-smoke lists ${environment.names.join(",")} (names only, never a value)`);
      } else {
        artifact.t9.provenance.environment.why = "the environment's secret names are only observable through an authenticated gh api call";
        artifact.t9.awaiting = [...(artifact.t9.awaiting ?? []), "harness-smoke secret names from an authenticated gh api call"];
      }

      // --- the runbook: the placement rule the next adapter must not widen --------------
      const runbookPath = join(ROOT, RUNBOOK_PATH);
      assert.ok(existsSync(runbookPath), `${RUNBOOK_PATH} is missing, so the binding rule is undocumented`);
      const runbook = readFileSync(runbookPath, "utf8");
      assert.match(runbook, /harness-smoke/, "the runbook never names the environment");
      assert.match(runbook, /Smoke model step/, "the runbook never names the only step allowed to hold a key");
      for (const binding of Object.values(SECRET_BINDINGS)) {
        assert.ok(runbook.includes(binding.secret), `the runbook never names ${binding.secret}`);
        assert.ok(runbook.includes(binding.variable), `the runbook never names ${binding.variable}`);
      }
      assert.match(runbook, /never creates|creates no|no agent creates|owner/i, "the runbook never states that no agent creates or rotates a secret");
      for (const variable of BOUND_VARIABLES) assert.ok(runbook.includes(variable), `the runbook never names the fallback ${variable}`);
      assert.equal(/secrets\.[A-Za-z0-9_]+\s*=\s*\S/.test(runbook), false, "the runbook shows a secret value");

      // --- TC-3's paired half: authenticated cells grading beside the control row -------
      if (existsSync(LIVE_ARTIFACT)) {
        const live = JSON.parse(readFileSync(LIVE_ARTIFACT, "utf8"));
        const hosted = (live.controls ?? []).find((row) => row.control_id === "missing-key");
        assert.ok(hosted, "the hosted artifact carries no missing-key control row");
        assert.equal(hosted.reason, controlRow.reason, "the hosted control row disagrees with the wired control");
        const authenticatedLive = (live.cells ?? []).filter((cell) => cell.harness === "claude-code" && cell.verdict === "pass");
        assert.ok(authenticatedLive.length > 0, "no authenticated claude-code cell graded in the same run");
        artifact.t9.provenance.hosted = { status: "observed", path: LIVE_ARTIFACT, authenticated_cells: authenticatedLive.length };
      } else {
        artifact.t9.provenance.hosted = {
          status: "not-executed",
          path: LIVE_ARTIFACT,
          why: "authenticated cells grading beside the control row exist only in a dispatched run's artifact",
          owner: "T8/T11 (the recorder and the controls array)",
        };
        artifact.t9.awaiting = [
          ...(artifact.t9.awaiting ?? []),
          "paired authenticated claude-code pass rows in the same run as the control row",
        ];
      }
    } finally {
      for (const dir of sandboxDirs) rmSync(dir, { recursive: true, force: true });
    }
  } finally {
    assert.equal(
      Boolean(process.env.ANTHROPIC_API_KEY),
      runnerKeyBefore,
      "the runner's own environment is never mutated by this flow",
    );
    rmSync(projectDir, { recursive: true, force: true });
    rmSync(evidenceDir, { recursive: true, force: true });
    rmSync(gradeDir, { recursive: true, force: true });
  }

  mkdirSync(REPORT_DIR, { recursive: true });
  writeFileSync(ARTIFACT, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");

  // The product-owned success target: the report the gate reads back off disk, not the in-memory
  // object. It must carry the pins identity and every cell, or the cell counts prove nothing.
  const published = JSON.parse(readFileSync(ARTIFACT, "utf8"));
  assert.match(published.t10.pins_sha256, /^[0-9a-f]{64}$/, "the published report carries a 64-hex pins_sha256 identity");
  assert.equal(published.t10.cells_detail.length, 12, "the published report carries all twelve cells");
  assert.equal(published.t9.bindings.length, 5, "the published report carries all five credential bindings");
  assert.deepEqual(
    published.t9.bindings.map((binding) => `${binding.secret}->${binding.variable}`).sort(),
    Object.values(SECRET_BINDINGS).map((binding) => `${binding.secret}->${binding.variable}`).sort(),
    "the published binding table is the one that was checked",
  );
  assert.equal(published.t9.controls[0].verdict, "could-not-run", "the published control row is not a refusal");
  assert.equal(published.t9.controls[0].reason, "missing-api-key");

  t.diagnostic(`controls=${artifact.controls.map((row) => `${row.control_id}:${row.verdict}/${row.reason}`).join(",")}`);
  t.diagnostic(`rejected_mode_hits=${artifact.stance_scan.rejected_mode_hits}`);
  t.diagnostic(`live_artifact=${artifact.provenance.live_artifact.status}`);
  t.diagnostic(`bindings=${artifact.t9.bindings.map((binding) => `${binding.harness}:${binding.secret}->${binding.variable}`).join(",")}`);
  t.diagnostic(`keyless_control=${artifact.t9.controls.map((row) => `${row.control_id}:${row.verdict}/${row.reason}/${row.model_requests}`).join(",")}`);
  t.diagnostic(`environment=${artifact.t9.provenance.environment.status}`);
  t.diagnostic(`t9_hosted=${artifact.t9.provenance.hosted.status}`);
  assert.equal(artifact.failures.length, 0, artifact.failures.join("; "));
});
