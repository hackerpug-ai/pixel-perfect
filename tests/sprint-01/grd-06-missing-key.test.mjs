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
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createCapture } from "../../test/harness/runtime/capture.mjs";
import { gradeFromEvidence, readGrade, writeGrade } from "../../test/harness/runtime/grade-writer.mjs";
import { guardInvocation, resolveCredential, runGuarded, sessionId } from "../../test/harness/runtime/guard.mjs";
import { APPROVED_MODES, assertStance, recordStance, serializeStance } from "../../test/harness/runtime/stance.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const RUNTIME_DIR = join(ROOT, "test/harness/runtime");
const REPORT_DIR = join(ROOT, ".tmp", "sprint-01-verification");
const ARTIFACT = join(REPORT_DIR, "grd-06-missing-key.json");
const LIVE_ARTIFACT =
  process.env.HARNESS_EVAL_RESULT ?? join(ROOT, ".tmp", "sprint-01-artifacts", "he1", "harness-eval-result.json");
const PLUGIN_ROOT = join(ROOT, "plugins/pixel-perfect");

// Every credential name the eval knows about. Built here, never spelled into the runtime.
const SECRET_NAMES = /^(SMOKE_[A-Z0-9_]+|ANTHROPIC_API_KEY|CODEX_API_KEY|XAI_API_KEY|GEMINI_API_KEY|CURSOR_API_KEY)$/;
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

  t.diagnostic(`controls=${artifact.controls.map((row) => `${row.control_id}:${row.verdict}/${row.reason}`).join(",")}`);
  t.diagnostic(`rejected_mode_hits=${artifact.stance_scan.rejected_mode_hits}`);
  t.diagnostic(`live_artifact=${artifact.provenance.live_artifact.status}`);
  assert.equal(artifact.failures.length, 0, artifact.failures.join("; "));
});
