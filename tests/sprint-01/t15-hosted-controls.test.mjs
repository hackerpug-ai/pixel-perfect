// T15 — give the four negative controls a hosted producer, an honest hosted half, real pairs, and a
// gate that reads the pairs.
//
// Four defects are pinned here, all four visible in hosted run 41139161972's own artifact
// (`missing-key`, `stale-cache` and `exit0-denied-read` read could-not-run/control-unobservable,
// `hidden-image-judge` read pass, and EVERY row carried `hosted.status: "not-executed"` with
// `qualified: false`):
//
//   (a) `exit0-denied-read` had no hosted producer. Nothing ever made a graded invocation attempt a
//       write the recorded stance denies, so `observeExit0DeniedRead` (which fires only on a denial
//       whose requiredness was declared TRUE) could only ever return null on a dispatched run.
//   (b) The rows denied their own qualification. The producer called `qualifyControls` with no
//       hosted half and `hostHalf` accepts only `{ status: "observed" }`, so `qualified` was
//       unreachable by construction.
//   (c) Two rows carried no pair, so `discriminates` was false for `missing-key` and
//       `hidden-image-judge` even though their authenticated halves ran in the same run.
//   (d) Nothing read the pairs. `assertControlRows` enforces exactly four rows with schema-valid
//       verdicts, so a run that observed nothing published four could-not-run rows and stayed green.
//
// WHAT IS REAL IN THIS FILE, AND WHEN:
//   * always: the workflow's own `run:` bodies, executed the way CI executes them; the real
//     `runCell` replay over the archived denied-write capture's real bytes; the real guard, stance
//     and capture layer; the real scanner; and the real
//     `qualifyControls`/`recordControl`/`assertControlRows`/`controlVerdictGate`/`writeControls`.
//   * never here: a model call. The harness-smoke binding lives only on the hosted runner, so the
//     probe's two invocations are proven through the two producers the probe itself uses
//     (`observeExit0DeniedRead`, `observeExit0DeniedReadPair`) replayed over the archived capture's
//     real bytes, and the probe's *refusal* path is executed for real (no binding -> the guard
//     refuses -> no observation, no pair, which is the fail-closed rule).
//   * the hosted receipt is NOT produced here. It is `node test/harness/controls/index.mjs --gate`
//     over a downloaded artifact from a dispatched run — the sprint gate's own step. What this file
//     proves about the hosted half is its producer: the stamp comes from the runner's identity and
//     is absent without it.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  CHECKS,
  DENIED_WRITE_PROBE,
  HARNESS,
  PLUGIN_ROOT_REL,
  commandNames,
  controlProbeEntry,
  installationIdentity,
  invocationTable,
  mapCapturedLine,
  manifestDigest,
  observedCliVersion,
  prepareRunDirs,
  runControlProbe,
} from "../../test/harness/adapters/claude-code.mjs";
import { REGISTERED } from "../../test/harness/adapters/registry.mjs";
import {
  CONTROL_IDS,
  assertControlRows,
  controlVerdictGate,
  hostedHalfFromEnv,
  qualifyControls,
  recordControl,
} from "../../test/harness/controls/index.mjs";
import { loadPins, sha256Hex } from "../../test/harness/pins.mjs";
import { createCapture } from "../../test/harness/runtime/capture.mjs";
import { runCell, writeCell } from "../../test/harness/smoke/cell.mjs";
import {
  attachDeniedWriteProbe,
  attachMissingKey,
  mergeObservationsFromCells,
  mergePairsFromCells,
  observeExit0DeniedRead,
  observeExit0DeniedReadPair,
} from "../../test/harness/smoke/observations.mjs";
import { inspectWorkflowDeclaration, parseYaml, readWorkflow } from "./flow-runner.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const PLUGIN_ROOT = join(ROOT, PLUGIN_ROOT_REL);
const DENIED_DIR = join(ROOT, "test/harness/smoke/fixtures/denied-write");
const PROBE_BYTES = join(ROOT, "test/harness/stream/captures", "claude-code-stream-probe.stdout.bin");
const GATE_CLI = join(ROOT, "test/harness/controls/index.mjs");
const PINNED = loadPins().manifest.harnesses[HARNESS].pinned_cli_version;
const RUN_ID = 41139161972;
const OTHER_RUN_ID = 41086556471;
const CREDENTIAL_NAMES = ["ANTHROPIC_API_KEY", "CODEX_API_KEY", "XAI_API_KEY", "GEMINI_API_KEY", "CURSOR_API_KEY"];
const CELLS_PREFIX = `harness-eval-cell-${RUN_ID}-1`;

function sandbox(t, label = "t15-") {
  const dir = mkdtempSync(join(tmpdir(), label));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

/**
 * `seed/denied-write-capture`: the real guarded `claude -p` archived under
 * `test/harness/smoke/fixtures/denied-write/` — exit 0, one model request, and a `Write` denial
 * whose target resolves inside that invocation's own work dir. Read through the runtime's archive
 * reader, and re-hashed so a fixture edited to carry a denial the run never made is refused.
 */
function readDeniedCapture() {
  const recordPath = join(DENIED_DIR, "claude-code-denied-write.capture.json");
  const stdoutPath = join(DENIED_DIR, "claude-code-denied-write.stdout.bin");
  const record = JSON.parse(readFileSync(recordPath, "utf8"));
  const bytes = readFileSync(stdoutPath);
  if (sha256Hex(bytes) !== record.stdout.sha256) throw new Error(`the archived denial capture was modified: ${recordPath}`);
  return { record: { ...record, evidence_root: DENIED_DIR, evidence_paths: [recordPath, stdoutPath] }, bytes, path: recordPath };
}

const ARCHIVED = readDeniedCapture();

/**
 * One invocation record over real bytes, minted by the runtime's own capture so every citation
 * resolves and every observation carries its own span. Nothing about the verdict is typed here:
 * `observe` runs the adapter's real mapper, and `finish` records the exit status the run had.
 */
function replayStream({ dir, entry, bytes, exitCode }) {
  const capture = createCapture({
    harness: HARNESS,
    check_id: entry.check_id ?? "verify",
    cwd: entry.cwd ?? null,
    timeout_ms: entry.timeout_ms ?? 180_000,
    argv: entry.argv ?? [],
    invocation_id: entry.invocation_id,
  });
  capture.append(bytes);
  capture.observe((json, line) => mapCapturedLine({ json, text: line.text, entry }), { required_read_paths: null });
  capture.finish({ exit_code: exitCode, signal: null, timed_out: false, spawn_error: null });
  return capture.persist(dir);
}

/**
 * The shape `runControlProbe` returns, built from the archived bytes through the probe's own two
 * entry-points and the two producers the probe itself calls. This is
 * `seed/optional-denial-stream` plus `seed/denied-write-capture`: the required half is the archived
 * stream observed against the invocation's own work dir, the optional half is the SAME stream
 * observed against a work dir that does not contain the denial's target — so the only difference
 * between the two is requiredness, which is the whole question the control asks.
 *
 * The live invocation cannot run here (no harness-smoke binding: the guard refuses before spawning,
 * and a spawned `claude -p` would be a model call this test never makes).
 */
function probeFromArchive(t, work) {
  const requiredEntry = controlProbeEntry({ role: "required", cwd: ARCHIVED.record.cwd, pluginRoot: PLUGIN_ROOT });
  const optionalWorkDir = sandbox(t, "t15-optional-workdir-");
  const optionalEntry = controlProbeEntry({ role: "optional", cwd: optionalWorkDir, pluginRoot: PLUGIN_ROOT });
  const requiredRecord = replayStream({ dir: join(work, "probe", "required"), entry: requiredEntry, bytes: ARCHIVED.bytes, exitCode: 0 });
  const optionalRecord = replayStream({ dir: join(work, "probe", "optional"), entry: optionalEntry, bytes: ARCHIVED.bytes, exitCode: 0 });
  return {
    required: { entry: requiredEntry, decision: null, record: requiredRecord },
    optional: { entry: optionalEntry, decision: null, record: optionalRecord },
    observation: observeExit0DeniedRead({ record: requiredRecord, check: "verify" }),
    pair: observeExit0DeniedReadPair({ record: optionalRecord }),
  };
}

/** The identity the run installs, assembled from real payload digests like the adapter's own. */
function contractIdentity() {
  const digest = manifestDigest(PLUGIN_ROOT);
  const names = commandNames({ pluginRoot: PLUGIN_ROOT });
  return installationIdentity({
    requested_cli_version: PINNED,
    resolved_cli_version: PINNED,
    observed_cli_version: observedCliVersion({ text: `${PINNED} (Claude Code)`, exit_code: 0 }),
    install_mode: "checkout",
    plugin_revision: null,
    expected_plugin_manifest_sha256: digest,
    observed_plugin_manifest_sha256: digest,
    loaded_plugin_root: PLUGIN_ROOT,
    plugin_load_evidence: `plugin details lists all ${names.length} command names from the installed payload`,
  });
}

const stepsOf = (job) => (Array.isArray(job?.steps) ? job.steps : []);
const nameOf = (step) => String(step?.name ?? "");
const runOf = (step) => String(step?.run ?? "");

/** The one step whose command writes the four rows. */
function producerStep(yaml) {
  const step = stepsOf(yaml?.jobs?.download).find((candidate) => /qualifyControls\s*\(/.test(runOf(candidate)));
  assert.ok(step, "jobs.download carries no controls producer");
  return step;
}

function keylessStep(yaml) {
  const step = stepsOf(yaml?.jobs?.smoke).find((candidate) => /^Keyless control\b/.test(nameOf(candidate)));
  assert.ok(step, "the keyless control step is missing");
  return step;
}

/**
 * The probe block inside the claude-code model step, as shell text: from the line that opens the
 * inline node program to the line that closes it. Extracted rather than re-typed, so the block this
 * file executes is character-for-character the block CI executes.
 */
function probeBlockOf(step) {
  const lines = runOf(step).split("\n");
  const start = lines.findIndex((line) => line.trim() === "node --input-type=module -e '");
  assert.ok(start >= 0, `${nameOf(step)} runs no inline node program, so no denied-write probe can be called`);
  assert.equal(lines.slice(0, start).some((line) => /runControlProbe/.test(line)), false, "runControlProbe is called outside the probe block");
  const end = lines.findIndex((line, index) => index > start && line.trim() === "'");
  assert.ok(end > start, "the probe block is never closed");
  return lines.slice(start, end + 1).join("\n");
}

/** The environment a machine-local replay has: no runner identity, no credential. */
function localEnv(extra = {}) {
  const env = {};
  for (const [name, value] of Object.entries(process.env)) {
    if (name.startsWith("GITHUB_")) continue;
    if (CREDENTIAL_NAMES.includes(name)) continue;
    env[name] = value;
  }
  return { ...env, ...extra };
}

function runBody(body, cwd, env) {
  return spawnSync("bash", ["-e"], { input: body, cwd, env, encoding: "utf8", timeout: 180_000 });
}

/**
 * `seed/real-cells-dir`: the cells dir the download job really assembles. Two claude-code cells
 * written by the REAL `runCell` leg over replayed records — `verify-button-drift` is the archived
 * denied-write capture itself, so the exit-0 denial the third control asks about is in the run's own
 * stream rather than typed by this test.
 */
async function realCellsDir(t) {
  const work = sandbox(t, "t15-cells-");
  const cells = join(work, "cells");
  const identity = contractIdentity();
  for (const track of ["pinned", "newest"]) {
    const dirs = prepareRunDirs({ runId: `t15-${track}`, track });
    t.after(() => dirs.cleanup());
    const table = invocationTable({ track, dirs, pluginRoot: PLUGIN_ROOT });
    const records = {};
    for (const entry of table) {
      // The verified-denial record is the ARCHIVED capture itself, not a replay: its requiredness
      // was declared by the mapper against the invocation's own work dir when it was recorded, and
      // replaying it under today's run dir would re-declare it as optional (the target is elsewhere).
      records[entry.key] =
        entry.key === "verify-button-drift"
          ? ARCHIVED.record
          : replayStream({ dir: join(work, "captures", track, entry.key), entry, bytes: readFileSync(PROBE_BYTES), exitCode: 1 });
    }
    const cell = await runCell({
      harness: HARNESS,
      track,
      installMode: "checkout",
      env: { ANTHROPIC_API_KEY: "present-binding-not-a-model-call" },
      adapters: new Set(REGISTERED),
      loadCell: async () => ({ identity, installed: { installPath: null }, steps: [], command_list: { deduped: [] } }),
      records,
      dirs,
      evidenceDir: join(work, "graded", track),
    });
    if (track === "pinned") {
      assert.equal(
        cell.control_observations?.["exit0-denied-read"]?.reason,
        "denied_tool_call",
        `the pinned leg did not observe the archived denial: ${JSON.stringify(cell.control_observations ?? {})}`,
      );
    } else {
      // The newest track resolves no version on this host, so the registry owns that cell and it is
      // an honest named refusal that observed nothing — the second cell a dispatched run can also
      // produce, and the case the producer's merge has to tolerate.
      assert.equal(cell.cell_state, "could-not-run", `the newest cell is ${JSON.stringify(cell.cell_state)}`);
      assert.equal(cell.control_observations, undefined, "the newest cell claims an observation it never made");
    }
    writeCell({ file: join(cells, `${CELLS_PREFIX}-claude-code-${track}`, "cell", "cell.json"), cell });
  }
  return { work, cells };
}

/**
 * The two step bodies that write onto the cells: the keyless control (the `missing-key`
 * observation) and the denied-write probe (the `exit0-denied-read` pair). Both run as CI runs them.
 */
function fillCellsDir(t, { work, cells }, yaml) {
  const pinnedDir = join(cells, `${CELLS_PREFIX}-claude-code-pinned`);
  symlinkSync(join(ROOT, "test"), join(pinnedDir, "test"), "dir");
  const keyless = runBody(runOf(keylessStep(yaml)), pinnedDir, localEnv());
  assert.equal(keyless.status, 0, `the keyless control body exited ${keyless.status}: ${keyless.stderr}`);
  const keylessRow = JSON.parse(readFileSync(join(pinnedDir, "cell", "keyless-control.json"), "utf8"));
  assert.equal(`${keylessRow.control_id} ${keylessRow.verdict} ${keylessRow.reason}`, "missing-key could-not-run missing-api-key");

  const probe = probeFromArchive(t, work);
  const attached = attachDeniedWriteProbe({ cellFile: join(pinnedDir, "cell", "cell.json"), probe });
  assert.equal(attached.ok, true, `the probe's pair did not reach the cell: ${JSON.stringify(attached)}`);

  const modelStep = stepsOf(yaml.jobs.smoke).find((step) => nameOf(step) === `Smoke model step claude-code \${{ matrix.track }}`);
  assert.ok(modelStep, "the claude-code model step is missing");
  return { pinnedDir, modelStep, probe };
}

/**
 * Executes the workflow's real producer step body in a sandbox laid out the way the download job
 * lays it out: the checkout's controls module reachable, and this attempt's cells under `cells/`.
 */
function runProducerStep(t, cells, env) {
  const run = join(sandbox(t, "t15-producer-"), "run");
  mkdirSync(join(run, "test/harness"), { recursive: true });
  symlinkSync(join(ROOT, "test/harness/controls"), join(run, "test/harness/controls"), "dir");
  symlinkSync(resolve(cells), join(run, "cells"), "dir");
  const result = runBody(runOf(producerStep(readWorkflow().yaml)), run, env);
  const file = join(cells, "controls.json");
  const rows = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : [];
  return { status: result.status, stdout: String(result.stdout ?? ""), stderr: String(result.stderr ?? ""), rows, file, dir: run };
}

const line = (row) => `${row.control_id} ${row.verdict} ${row.reason}`;

const EXACT_LINES = [
  "missing-key could-not-run missing-api-key",
  "stale-cache could-not-run installation-identity-mismatch",
  "exit0-denied-read fail denied_tool_call",
  "hidden-image-judge pass no-image-judge-in-child-tree",
];

/**
 * `seed/hosted-run-41139161972`: the four control rows of the recorded result artifact of the
 * dispatched run the amendment cites, copied verbatim from
 * `.kb-run-sprint/sprint-01-evaluator-evidence-spine/T11/evidence/reviewer-cycle-3-r0/hosted-run-41139161972-result.json`
 * (sha256 65703a969cf1cdd1ecc6486e64d78084fd673c085b290e75b15d566abf4418a0). That directory is not
 * committed (`.kb-run-sprint/` is git-ignored) and this task's write scope admits no new fixture
 * file, so the rows travel here — the fields the gate reads, unchanged, never re-derived.
 */
const HOSTED_RUN_41139161972 = {
  schema: "harness-eval-result/v1",
  run_id: RUN_ID,
  run_attempt: 1,
  event: "workflow_dispatch",
  controls: [
    {
      control_id: "missing-key",
      verdict: "could-not-run",
      reason: "missing-api-key",
      expect: { verdict: "could-not-run", reason: "missing-api-key" },
      matched: true,
      discriminates: false,
      pair: null,
      pair_claimed_discrimination: null,
      local: { status: "observed", model_request_count: 0, child_ran: false },
      hosted: {
        status: "not-executed",
        awaiting: "the keyless control step's row from a dispatched run, beside that run's authenticated claude-code pass rows",
        owner: "harness-eval controls job (T8 recorder contract) on a dispatched run; T11 owns the qualification rule",
        why: "a hosted harness-eval run is not reachable from a machine-local tree",
      },
      qualified: false,
      qualified_why: "no paired observation came out the other way, so the control proves failure, not discrimination",
    },
    {
      control_id: "stale-cache",
      verdict: "could-not-run",
      reason: "installation-identity-mismatch",
      expect: { verdict: "could-not-run", reason: "installation-identity-mismatch" },
      matched: true,
      discriminates: true,
      pair: { pair_id: null, verdict: "pass", reason: "identity-approved", planted: true },
      pair_claimed_discrimination: false,
      local: { status: "observed", field: "observed_plugin_manifest_sha256", planted: true },
      hosted: {
        status: "not-executed",
        awaiting: "the installed payload's expected and observed digests as the runner measured them",
        owner: "harness-eval smoke job (T5 adapter identity, T8 controls job) on a dispatched run",
        why: "a hosted harness-eval run is not reachable from a machine-local tree",
      },
      qualified: false,
      qualified_why: "the hosted half is not executed",
    },
    {
      control_id: "exit0-denied-read",
      verdict: "could-not-run",
      reason: "control-unobservable",
      expect: { verdict: "fail", reason: "denied_tool_call" },
      matched: false,
      discriminates: false,
      pair: null,
      pair_claimed_discrimination: null,
      local: { status: "unobservable" },
      hosted: {
        status: "not-executed",
        awaiting: "the raw exit-0 denial capture recorded by the runner (test/harness/fixtures/streams/exit0-denied-read)",
        owner: "a dispatched run's verify invocation (capture archive is T5/T6 write scope), qualified here",
        why: "a hosted harness-eval run is not reachable from a machine-local tree",
      },
      qualified: false,
      qualified_why: "observable read could-not-run/control-unobservable, expected fail/denied_tool_call",
    },
    {
      control_id: "hidden-image-judge",
      verdict: "pass",
      reason: "no-image-judge-in-child-tree",
      expect: { verdict: "pass", reason: "no-image-judge-in-child-tree" },
      matched: true,
      discriminates: false,
      pair: null,
      pair_claimed_discrimination: null,
      local: { status: "observed", files_scanned: 36, tree_sha256: "fb449d8992356a7a5ac2149d63ecfb4c19f6d14d1c8143712e88865074a197be" },
      hosted: {
        status: "not-executed",
        awaiting: "the verify child tree as the runner produced it (tree manifests, request log, captured bytes)",
        owner: "harness-eval verify job on a dispatched run; T11 owns the scanner and this qualification",
        why: "a hosted harness-eval run is not reachable from a machine-local tree",
      },
      qualified: false,
      qualified_why: "no paired observation came out the other way, so the control proves failure, not discrimination",
    },
  ],
};

/** One scratch artifact file, and the gate CLI's own verdict over it. */
function gateOverArtifact(t, artifact) {
  const dir = sandbox(t, "t15-gate-");
  const file = join(dir, "harness-eval-result.json");
  writeFileSync(file, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  const result = spawnSync(process.execPath, [GATE_CLI, "--gate", file], { encoding: "utf8", timeout: 60_000 });
  let printed = null;
  try {
    printed = JSON.parse(String(result.stdout ?? "").trim().split("\n").at(-1));
  } catch {
    printed = null;
  }
  return { status: result.status, stdout: String(result.stdout ?? ""), stderr: String(result.stderr ?? ""), printed, file };
}

/**
 * The download job's producer over the real cells dir, run twice: once with the runner's identity
 * and once without it. This is the whole of AC-1 — the four rows, the four exact pairs, and the
 * hosted half existing only where the runner's own identity does.
 */
async function produceBothWays(t) {
  const context = await realCellsDir(t);
  const cells = context.cells;
  fillCellsDir(t, context, readWorkflow().yaml);
  const hostedRun = runProducerStep(t, cells, localEnv({
    GITHUB_ACTIONS: "true",
    GITHUB_RUN_ID: String(RUN_ID),
    GITHUB_RUN_ATTEMPT: "1",
    GITHUB_EVENT_NAME: "workflow_dispatch",
  }));
  const rowsWithIdentity = hostedRun.rows.map((row) => ({ ...row }));
  const localRun = runProducerStep(t, cells, localEnv());
  return { context, hostedRun, rowsWithIdentity, localRun };
}

// ---------------------------------------------------------------------------
// AC-1 — the four exact pairs, hosted-bound when the runner says so and never otherwise
// ---------------------------------------------------------------------------

test("t15-hosted-four-pairs", async (t) => {
  const produced = await produceBothWays(t);
  const { hostedRun, localRun, rowsWithIdentity } = produced;

  // --- the run with the runner's own identity -------------------------------------------
  assert.equal(hostedRun.status, 0, `the producer exited ${hostedRun.status}: ${hostedRun.stderr}`);
  assert.equal(hostedRun.rows.length, 4, `controls.json holds ${hostedRun.rows.length} rows`);
  assert.deepEqual(hostedRun.rows.map(line), EXACT_LINES, "the four rows are not the four exact verdict/reason pairs");
  assert.deepEqual(hostedRun.rows.map((row) => row.control_id), [...CONTROL_IDS], "the rows are not in the controls module's order");

  for (const row of hostedRun.rows) {
    assert.equal(row.hosted.status, "observed", `${row.control_id}: the hosted half was not stamped from the runner's identity`);
    assert.equal(row.hosted.run_id, RUN_ID, `${row.control_id}: hosted.run_id is ${String(row.hosted.run_id)}, not the runner's own`);
    assert.equal(row.hosted.run_attempt, 1, `${row.control_id}: hosted.run_attempt is not the runner's`);
    assert.equal(row.hosted.event, "workflow_dispatch", `${row.control_id}: hosted.event is not the runner's`);
    assert.equal(row.discriminates, true, `${row.control_id}: no paired measurement came out the other way`);
    assert.equal(row.qualified, true, `${row.control_id}: ${String(row.qualified_why)}`);
  }

  // The rows read back off disk are the rows the gate accepts, and the gate accepts this run.
  const gate = controlVerdictGate(hostedRun.rows, { runId: RUN_ID });
  assert.deepEqual(gate.mismatches, [], `the gate refused the run's own rows: ${gate.mismatches.join("; ")}`);
  assert.equal(gate.ok, true);

  // --- the same body with every GITHUB_* variable absent --------------------------------
  assert.equal(localRun.rows.length, 4, `the machine-local run wrote ${localRun.rows.length} rows`);
  assert.deepEqual(localRun.rows.map(line), EXACT_LINES, "a machine-local replay changed the verdicts it observed");
  for (const row of localRun.rows) {
    assert.equal(row.hosted.status, "not-executed", `${row.control_id}: a machine-local replay claimed the hosted half`);
    assert.equal(row.qualified, false, `${row.control_id}: a machine-local replay reached qualified`);
  }
  // The panels are identical, which is the point: only the hosted claim moves.
  assert.deepEqual(
    localRun.rows.map((row) => row.discriminates),
    rowsWithIdentity.map((row) => row.discriminates),
    "the pairs did not survive the loss of the runner's identity",
  );

  // --- the stamped half is read from the environment, never from a constant --------------
  assert.equal(hostedHalfFromEnv({}), null, "an empty environment produced a hosted half");
  assert.equal(hostedHalfFromEnv({ GITHUB_ACTIONS: "true" }), null, "a hosted half was produced without a run id");
  assert.equal(
    hostedHalfFromEnv({ GITHUB_ACTIONS: "true", GITHUB_RUN_ID: String(RUN_ID), GITHUB_RUN_ATTEMPT: "1" }),
    null,
    "a hosted half was produced without an event name",
  );
  const half = hostedHalfFromEnv({
    GITHUB_ACTIONS: "true",
    GITHUB_RUN_ID: String(RUN_ID),
    GITHUB_RUN_ATTEMPT: "2",
    GITHUB_EVENT_NAME: "workflow_dispatch",
  });
  assert.equal(half?.status, "observed");
  assert.equal(half?.run_id, RUN_ID, "run_id must be a Number, so it compares with the artifact's own");
  assert.equal(half?.run_attempt, 2);
  assert.equal(half?.workflow, "harness-eval");
});

// ---------------------------------------------------------------------------
// AC-2 — the gate reads the pairs: a planted mismatch and a real observed-nothing run both fail
// ---------------------------------------------------------------------------

test("t15-gate-refuses-mismatch", async (t) => {
  const produced = await produceBothWays(t);

  // --- the green fixture: the producer's own rows, run-bound -----------------------------
  const green = gateOverArtifact(t, { run_id: RUN_ID, controls: produced.rowsWithIdentity });
  assert.equal(green.status, 0, `the gate refused the run's own rows: ${green.stdout}${green.stderr}`);
  assert.equal(green.printed?.ok, true);
  assert.deepEqual(green.printed?.mismatches, []);

  // --- `seed/planted-row-mismatch`: one row's outcome flipped, id unchanged --------------
  const planted = structuredClone(produced.rowsWithIdentity);
  const victim = planted.find((row) => row.control_id === "hidden-image-judge");
  victim.verdict = "fail";
  victim.reason = "image-judge-in-child-tree";
  const flipped = gateOverArtifact(t, { run_id: RUN_ID, controls: planted });
  assert.notEqual(flipped.status, 0, "the gate accepted an artifact with a flipped verdict");
  assert.equal(flipped.printed?.ok, false);
  const named = flipped.printed?.mismatches ?? [];
  assert.ok(named.some((mismatch) => /hidden-image-judge/.test(mismatch)), `the mismatch does not name the id: ${JSON.stringify(named)}`);
  assert.ok(
    named.some((mismatch) => /hidden-image-judge: expected pass\/no-image-judge-in-child-tree, observed fail\/image-judge-in-child-tree/.test(mismatch)),
    `the mismatch does not state expected and observed: ${JSON.stringify(named)}`,
  );
  // Only the planted row is named: a gate that refuses everything is not reading the pairs.
  assert.equal(named.filter((mismatch) => /missing-key|stale-cache|exit0-denied-read/.test(mismatch)).length, 0, `an unrelated row was named: ${JSON.stringify(named)}`);

  // --- `seed/hosted-run-41139161972`: the real artifact that observed nothing -----------
  const recorded = gateOverArtifact(t, HOSTED_RUN_41139161972);
  assert.notEqual(recorded.status, 0, "the gate accepted the recorded artifact whose four rows observed nothing");
  assert.equal(recorded.printed?.ok, false);
  const recordedMismatches = recorded.printed?.mismatches ?? [];
  for (const id of CONTROL_IDS) {
    assert.ok(recordedMismatches.some((mismatch) => mismatch.includes(id)), `the gate did not name ${id}: ${JSON.stringify(recordedMismatches)}`);
  }
  assert.ok(
    recordedMismatches.some((mismatch) => /hosted\.status is not-executed/.test(mismatch)),
    `the gate did not name the unexecuted hosted half: ${JSON.stringify(recordedMismatches)}`,
  );
  assert.ok(
    recordedMismatches.some((mismatch) => /exit0-denied-read: expected fail\/denied_tool_call, observed could-not-run\/control-unobservable/.test(mismatch)),
    `the gate did not name the unobservable control with its own expect pair: ${JSON.stringify(recordedMismatches)}`,
  );

  // --- the in-run half: the same producer body over a cells dir that observed nothing ---
  // With a runner identity present, a dispatched run whose cells produced no observations must
  // fail the step, or the artifact of run 41139161972 republishes as green.
  const emptyCells = join(sandbox(t, "t15-empty-cells-"), "cells");
  for (const harness of ["claude-code", "codex"]) {
    const folder = join(emptyCells, `${CELLS_PREFIX}-${harness}-pinned`, "cell");
    mkdirSync(folder, { recursive: true });
    writeFileSync(join(folder, "cell.json"), `${JSON.stringify({ harness, track: "pinned", cell_state: "could-not-run", reason: "missing-api-key", install_mode: "checkout" })}\n`, "utf8");
  }
  const emptyHosted = runProducerStep(t, emptyCells, localEnv({
    GITHUB_ACTIONS: "true",
    GITHUB_RUN_ID: String(RUN_ID),
    GITHUB_RUN_ATTEMPT: "1",
    GITHUB_EVENT_NAME: "workflow_dispatch",
  }));
  assert.notEqual(emptyHosted.status, 0, "a dispatched run whose rows observed nothing exited 0");
  assert.match(emptyHosted.stderr, /::error::/, "the failing producer printed no ::error:: line");
  for (const id of CONTROL_IDS) assert.match(emptyHosted.stderr, new RegExp(id), `the producer's failure did not name ${id}`);
  assert.deepEqual(emptyHosted.rows.map((row) => `${row.verdict}/${row.reason}`), CONTROL_IDS.map(() => "could-not-run/control-unobservable"));

  // The gate is one implementation: the module's verdict and the CLI's verdict agree.
  const moduleVerdict = controlVerdictGate(HOSTED_RUN_41139161972.controls, { runId: RUN_ID });
  assert.equal(moduleVerdict.ok, false);
  assert.deepEqual(moduleVerdict.mismatches, recordedMismatches, "the CLI and controlVerdictGate disagreed");
});

// ---------------------------------------------------------------------------
// TC-1 — the workflow carries the probe and the hosted half, and no pinned anchor moved
// ---------------------------------------------------------------------------

test("t15-workflow-wiring", () => {
  const { text, yaml } = readWorkflow();
  const declaration = inspectWorkflowDeclaration(parseYaml(text));
  assert.deepEqual(declaration.failures, [], `the workflow declaration fails: ${declaration.failures.join("; ")}`);
  assert.deepEqual(Object.keys(yaml.jobs).sort(), ["download", "drift", "grade", "smoke"], "a job was added or removed");
  assert.equal(yaml.jobs.smoke["timeout-minutes"], 45, "the probe is two short invocations on one leg, not a longer matrix");

  const smokeSteps = stepsOf(yaml.jobs.smoke);

  // The record anchor is literal, and it is still the only step the recorder can resolve.
  assert.match(text, /^      - name: Record the cell\n        run: \|$/m, "the record anchor moved");
  const recordSteps = smokeSteps.filter((step) => /cell\/cell\.json/.test(runOf(step)));
  assert.equal(recordSteps.length, 1, `the cell record is written by ${recordSteps.map(nameOf).join(", ")}`);
  assert.equal(nameOf(recordSteps[0]), "Record the cell");

  // Exactly one upload, one path: the probe's capture stays on the runner.
  const uploads = smokeSteps.filter((step) => /actions\/upload-artifact/.test(String(step?.uses ?? "")));
  assert.equal(uploads.length, 1);
  assert.equal(uploads[0].with?.path, "cell/cell.json");

  // The producer's call text is character-for-character the one T13 pinned: the hosted half rides
  // on the observations, never on a new argument.
  const producer = producerStep(yaml);
  assert.match(runOf(producer), /qualifyControls\(\{ observations, pairs \}\)/, "the producer's call text changed");
  assert.match(runOf(producer), /hostedHalfFromEnv/, "the producer never reads the runner's identity");
  assert.match(runOf(producer), /controlVerdictGate/, "the producer never gates the rows it wrote");
  assert.match(runOf(producer), /::error::/, "the producer's gate prints no annotated error");
  assert.equal(/cell\/cell\.json/.test(runOf(producer)), false, "the producer must not become the recorder's first match");

  // The probe lives on the claude-code model step, which keeps its single binding and never spells
  // the cell-record path.
  const modelStep = smokeSteps.find((step) => nameOf(step) === `Smoke model step claude-code \${{ matrix.track }}`);
  assert.ok(modelStep, "the claude-code model step is missing");
  assert.deepEqual(Object.keys(modelStep.env ?? {}), ["ANTHROPIC_API_KEY"], "the model step's binding changed");
  assert.match(runOf(modelStep), /runControlProbe/, "the model step never calls the probe");
  assert.match(runOf(modelStep), /attachDeniedWriteProbe/, "the model step never attaches the probe's observation");
  assert.match(runOf(modelStep), /denied-write-probe\.json/, "the model step writes no receipt");
  assert.equal(/cell\/cell\.json/.test(runOf(modelStep)), false, "the model step spells the cell-record path");
  const probeCallers = smokeSteps.filter((step) => /runControlProbe/.test(runOf(step)));
  assert.deepEqual(probeCallers.map(nameOf), [nameOf(modelStep)], "the probe runs in a step other than the claude-code model step");

  // The probe is a control, not a grade: four checks, four control ids.
  assert.equal(CHECKS.length, 4, "the probe added a check to the cell");
  assert.deepEqual([...CONTROL_IDS], ["missing-key", "stale-cache", "exit0-denied-read", "hidden-image-judge"]);
  assert.equal(DENIED_WRITE_PROBE.contributes_checks, 0, "the probe declares itself as contributing a check");
  assert.deepEqual(Object.keys(DENIED_WRITE_PROBE.roles), ["required", "optional"], "the probe does not declare both halves");

  // The probe's block is executable on its own: that is what makes its failure path testable.
  const block = probeBlockOf(modelStep);
  assert.match(block, /runControlProbe/);
  assert.equal(/cell\/cell\.json/.test(block), false, "the probe block spells the cell-record path");
});

// ---------------------------------------------------------------------------
// TC-2 — a required denial is the control; an optional denial is not
// ---------------------------------------------------------------------------

test("t15-denied-write-probe", async (t) => {
  // --- the archived capture: exit 0 beside a denial the invocation needed ----------------
  assert.equal(ARCHIVED.record.process_status.exit_code, 0, "the archived capture did not exit 0");
  assert.equal(ARCHIVED.record.model_request_count, 1, "the model was never asked, so the denial proves nothing");
  const writeDenial = ARCHIVED.record.observations.find((entry) => entry.kind === "permission_denied" && entry.operation === "Write");
  assert.ok(writeDenial, "the archived capture carries no Write denial");
  assert.equal(writeDenial.required_read, true, "the archived denial's requiredness is not declared required");
  assert.ok(String(writeDenial.target).endsWith("keep.txt"), `the archived denial targets ${String(writeDenial.target)}`);

  const work = sandbox(t, "t15-probe-");
  const probe = probeFromArchive(t, work);

  // required half: observed as the control, from the record's own bytes.
  assert.ok(probe.observation, "the required half produced no observation");
  assert.equal(probe.observation.verdict, "fail");
  assert.equal(probe.observation.reason, "denied_tool_call");
  assert.equal(probe.observation.evidence.process_exit_code, 0, "the observation must sit beside the clean exit");
  assert.equal(probe.observation.evidence.required_read, true);
  assert.ok(String(probe.observation.evidence.target).endsWith("keep.txt"), probe.observation.evidence.target);
  assert.ok(Number.isInteger(probe.observation.evidence.stream_offset), "the observation cites no stream offset");
  assert.match(String(probe.observation.evidence.stdout_sha256 ?? ARCHIVED.record.stdout.sha256), /^[0-9a-f]{64}$/);
  assert.equal(probe.required.record.stdout.sha256, ARCHIVED.record.stdout.sha256, "the replay is not the archived bytes");

  // The mapper declared requiredness itself, and capture.observe preserved it — the pair is only
  // optional because a declared `false` survived (T14).
  const requiredDenial = probe.required.record.observations.find((entry) => entry.kind === "permission_denied" && entry.operation === "Write");
  const optionalDenial = probe.optional.record.observations.find((entry) => entry.kind === "permission_denied" && entry.operation === "Write");
  assert.equal(requiredDenial.required_read, true, "a target under the probe's own work dir was not declared required");
  assert.equal(optionalDenial.required_read, false, "a target outside the work dir was not declared optional");

  // The same mapper, called directly, agrees — so the declaration is the mapper's, not a rewrite.
  const resultLine = ARCHIVED.record.observations.find((entry) => entry.kind === "result");
  assert.ok(resultLine, "the archived capture carries no result event");
  const direct = mapCapturedLine({
    json: {
      type: "result",
      is_error: false,
      permission_denials: [{ tool_name: "Write", tool_input: { file_path: join(ARCHIVED.record.cwd, "work", "keep.txt") } }],
    },
    text: "",
    entry: probe.required.entry,
  });
  assert.equal(direct.find((entry) => entry.kind === "permission_denied").required_read, true);
  const directOutside = mapCapturedLine({
    json: {
      type: "result",
      is_error: false,
      permission_denials: [{ tool_name: "Write", tool_input: { file_path: join(tmpdir(), "t15-outside-keep.txt") } }],
    },
    text: "",
    entry: probe.optional.entry,
  });
  assert.equal(directOutside.find((entry) => entry.kind === "permission_denied").required_read, false);

  // The optional half: the control must NOT fire on it, and its pair must.
  assert.equal(probe.optional.record.process_status.exit_code, 0);
  assert.equal(observeExit0DeniedRead({ record: probe.optional.record, check: "verify" }), null, "an optional denial was read as the control");
  assert.ok(probe.pair, "the optional half produced no pair");
  assert.equal(probe.pair.verdict, "pass");
  assert.equal(probe.pair.reason, "optional-denial-not-a-failure");
  assert.equal(probe.pair.evidence.required_read, false);

  // --- the attacher: the pair lands on the cell record, atomically, and reads back ------
  const cellDir = join(sandbox(t, "t15-attach-"), "cell");
  mkdirSync(cellDir, { recursive: true });
  const cellFile = join(cellDir, "cell.json");
  writeFileSync(cellFile, `${JSON.stringify({ harness: "claude-code", track: "pinned", cell_state: "could-not-run", reason: "missing-api-key" })}\n`, "utf8");
  const attached = attachDeniedWriteProbe({ cellFile, probe });
  assert.equal(attached.ok, true, JSON.stringify(attached));
  assert.equal(attached.reason, null);
  assert.equal(attached.cell_file, cellFile);
  const back = JSON.parse(readFileSync(cellFile, "utf8"));
  assert.equal(back.control_observations["exit0-denied-read"].reason, "denied_tool_call", "the observation did not reach the cell");
  assert.equal(back.control_pairs["exit0-denied-read"].reason, "optional-denial-not-a-failure", "the pair did not reach the cell");
  assert.equal(back.harness, "claude-code", "the attacher lost the record it edited");

  // A probe that produced nothing claims nothing.
  assert.deepEqual(
    attachDeniedWriteProbe({ cellFile, probe: { observation: null, pair: null } }),
    { ok: false, reason: "not-observed", cell_file: cellFile },
  );
  assert.equal(attachDeniedWriteProbe({ cellFile: join(cellDir, "absent.json"), probe }).reason, "no-cell-record");
  writeFileSync(join(cellDir, "broken.json"), "{not json", "utf8");
  assert.equal(attachDeniedWriteProbe({ cellFile: join(cellDir, "broken.json"), probe }).reason, "cell-record-unreadable");

  // --- a real probe with no binding: the guard refuses, so nothing is claimed -----------
  const refused = await runControlProbe({
    track: "pinned",
    configDir: null,
    env: localEnv(),
    evidenceDir: join(work, "probe", "live"),
  });
  assert.equal(refused.observation, null, "a refused probe still produced an observation");
  assert.equal(refused.pair, null, "a refused probe still produced a pair");
  assert.equal(refused.required.decision.refusal.reason, "missing-api-key");
  assert.equal(refused.required.record.model_request_count, 0, "a refused invocation began a model request");
  assert.equal(attachDeniedWriteProbe({ cellFile, probe: refused }).reason, "not-observed", "a refused probe attached a row");

  // --- a thrown probe leaves a named receipt, and the step still exits 0 ----------------
  // The block is executed exactly as the workflow holds it, in a sandbox where the receipt's own
  // directory is a regular file: the probe's first mkdir throws, its catch writes the receipt, and
  // the shell keeps its exit code out of the verdict.
  const { yaml } = readWorkflow();
  const modelStep = stepsOf(yaml.jobs.smoke).find((step) => nameOf(step) === `Smoke model step claude-code \${{ matrix.track }}`);
  const throwDir = sandbox(t, "t15-probe-throw-");
  symlinkSync(join(ROOT, "test"), join(throwDir, "test"), "dir");
  mkdirSync(join(throwDir, "cell"), { recursive: true });
  writeFileSync(join(throwDir, "cell", "cell.json"), `${JSON.stringify({ harness: "claude-code", track: "pinned", cell_state: "could-not-run", reason: "missing-api-key" })}\n`, "utf8");
  writeFileSync(join(throwDir, "cell", "evidence"), "not a directory\n", "utf8");
  const thrown = runBody(probeBlockOf(modelStep), throwDir, localEnv());
  assert.equal(thrown.status, 0, `a thrown probe failed the step: ${thrown.stderr}`);
  const receipt = JSON.parse(readFileSync(join(throwDir, "cell", "denied-write-probe.json"), "utf8"));
  assert.equal(receipt.ok, false);
  assert.equal(typeof receipt.reason, "string");
  assert.ok(receipt.reason.length > 0, "the receipt names no reason");
  assert.equal(existsSync(join(throwDir, "cell", "denied-write-probe.json.partial")), false);
});

// ---------------------------------------------------------------------------
// TC-3 — every row's pair is a second real measurement, and discriminates is computed
// ---------------------------------------------------------------------------

test("t15-pairs-discriminate", async (t) => {
  const produced = await produceBothWays(t);
  const { context, rowsWithIdentity } = produced;

  // --- the pairs the cells really carry -------------------------------------------------
  const pairs = mergePairsFromCells(context.cells);
  assert.deepEqual(Object.keys(pairs).sort(), [...CONTROL_IDS].sort(), `the cells carry pairs for ${Object.keys(pairs).join(", ")}`);
  const observations = mergeObservationsFromCells(context.cells);
  assert.deepEqual(Object.keys(observations).sort(), [...CONTROL_IDS].sort(), `the cells carry observations for ${Object.keys(observations).join(", ")}`);

  // Each pair's outcome differs from its control's own expect pair: a measurement the other way.
  for (const row of rowsWithIdentity) {
    assert.ok(row.pair, `${row.control_id}: the row publishes pair null`);
    assert.notEqual(
      `${row.pair.verdict}/${row.pair.reason}`,
      `${row.expect.verdict}/${row.expect.reason}`,
      `${row.control_id}: its pair came out the same way as the control, so it proves failure, not discrimination`,
    );
    assert.equal(row.discriminates, true, `${row.control_id}: discriminates is ${String(row.discriminates)}`);
  }

  // The planted image twin is a scan of the run's OWN bytes with one block appended.
  const imagePair = pairs["hidden-image-judge"];
  assert.equal(imagePair.verdict, "fail");
  assert.equal(imagePair.reason, "image-judge-in-child-tree");
  assert.equal(imagePair.evidence.planted, true, "the planted twin is not labelled as planted");
  assert.match(String(imagePair.evidence.planted_file), /\.(bin|json)$/, `the planted file is ${String(imagePair.evidence.planted_file)}`);
  assert.ok(Number.isInteger(imagePair.evidence.offset), "the planted finding cites no byte offset");
  assert.ok(imagePair.evidence.offset > 0, "the planted finding sits at offset 0, so it read a different file");

  // The authenticated admission is the missing-key pair; the matching digest the stale-cache pair.
  assert.equal(pairs["missing-key"].verdict, "pass");
  assert.equal(pairs["missing-key"].reason, "binding-accepted");
  assert.equal(pairs["missing-key"].evidence.model_request_count, 1, "the authenticated half made no model request");
  assert.match(String(pairs["missing-key"].evidence.stdout_sha256), /^[0-9a-f]{64}$/);
  assert.equal(pairs["stale-cache"].reason, "identity-approved");

  // --- discriminates is COMPUTED, never copied from a caller ----------------------------
  const claimed = recordControl({
    control_id: "stale-cache",
    observed: { verdict: "could-not-run", reason: "installation-identity-mismatch" },
    pair: { control_id: "stale-cache", verdict: "could-not-run", reason: "installation-identity-mismatch", discriminates: true },
  });
  assert.equal(claimed.discriminates, false, "a caller's discriminates boolean was believed");
  assert.equal(claimed.pair_claimed_discrimination, true, "the caller's claim is not recorded beside the computed value");
  assert.equal(claimed.qualified, false);

  // --- a null pair leaves the row unpaired and undiscriminating --------------------------
  const unpaired = qualifyControls({ observations: { "exit0-denied-read": { verdict: "fail", reason: "denied_tool_call" } } }).rows.find(
    (row) => row.control_id === "exit0-denied-read",
  );
  assert.equal(unpaired.pair, null, "a row with no pair invented one");
  assert.equal(unpaired.discriminates, false);
  assert.equal(unpaired.qualified, false);
  assert.match(String(unpaired.qualified_why), /no paired observation/);

  // --- the keyless step keeps the leg's paired admission, and says whether it survived --
  // It holds no credential, so anything it wrote here would be a claim: the pair it reports is the
  // one the authenticated leg measured, never one this step made up.
  const keylessRow = { control_id: "missing-key", verdict: "could-not-run", reason: "missing-api-key", model_requests: 0, child_ran: false };
  const withPair = join(sandbox(t, "t15-missing-key-"), "cell.json");
  writeFileSync(withPair, `${JSON.stringify({ harness: "claude-code", track: "pinned", control_pairs: { "missing-key": pairs["missing-key"] } })}\n`, "utf8");
  const kept = attachMissingKey({ row: keylessRow, cellFile: withPair });
  assert.equal(kept.ok, true, JSON.stringify(kept));
  assert.equal(kept.pair, true, "the keyless receipt does not report the pair it kept");
  const keptBack = JSON.parse(readFileSync(withPair, "utf8"));
  assert.equal(keptBack.control_pairs["missing-key"].reason, "binding-accepted", "the keyless step overwrote the leg's pair");
  assert.equal(keptBack.control_observations["missing-key"].reason, "missing-api-key");

  const withoutPair = join(sandbox(t, "t15-missing-key-"), "cell.json");
  writeFileSync(withoutPair, `${JSON.stringify({ harness: "claude-code", track: "pinned" })}\n`, "utf8");
  const bare = attachMissingKey({ row: keylessRow, cellFile: withoutPair });
  assert.equal(bare.ok, true);
  assert.equal(bare.pair, false, "a receipt with no pair reported one");
});

// ---------------------------------------------------------------------------
// TC-4 — the hosted claim is bound to the run that publishes it
// ---------------------------------------------------------------------------

test("t15-gate-run-binding", async (t) => {
  const produced = await produceBothWays(t);
  const rows = produced.rowsWithIdentity;

  // The green fixture, carrying its own run id, is the receipt this attempt can read.
  const green = gateOverArtifact(t, { run_id: RUN_ID, controls: rows });
  assert.equal(green.status, 0, `the gate refused its own run: ${green.stdout}${green.stderr}`);

  // The same rows under a different run id are somebody else's receipt.
  const stale = gateOverArtifact(t, { run_id: OTHER_RUN_ID, controls: rows });
  assert.notEqual(stale.status, 0, "the gate accepted rows stamped with another run's identity");
  assert.equal(stale.printed?.ok, false);
  assert.ok(
    (stale.printed?.mismatches ?? []).some((mismatch) => /hosted\.run_id is 41139161972, expected 41086556471/.test(mismatch)),
    `the gate did not name the run-id disagreement: ${JSON.stringify(stale.printed?.mismatches)}`,
  );

  // A short array and a duplicated id are refused for being the wrong shape, not for a mismatch.
  const short = gateOverArtifact(t, { run_id: RUN_ID, controls: rows.slice(0, 3) });
  assert.notEqual(short.status, 0, "the gate accepted three rows");
  assert.equal(short.printed?.ok, false);
  assert.ok((short.printed?.mismatches ?? []).length > 0, "a three-row artifact reported no refusal");

  const duplicated = gateOverArtifact(t, { run_id: RUN_ID, controls: [...rows.slice(0, 3), rows[0]] });
  assert.notEqual(duplicated.status, 0, "the gate accepted a duplicated control id as four rows");
  assert.equal(duplicated.printed?.ok, false);

  // The module refuses the same shapes, so the CLI is not the only guard.
  assert.throws(() => controlVerdictGate(rows.slice(0, 3), { runId: RUN_ID }), /expected exactly/);
  assert.throws(() => controlVerdictGate([...rows.slice(0, 3), rows[0]], { runId: RUN_ID }), /expected exactly/);
  assert.deepEqual(assertControlRows(rows).length, 4);

  // Without a run id the rows are still compared with their own expect pairs: the gate reads the
  // pairs whether or not it can bind them to a run.
  const unbound = controlVerdictGate(rows, {});
  assert.equal(unbound.ok, true, `the module refused its own rows: ${unbound.mismatches.join("; ")}`);
});
