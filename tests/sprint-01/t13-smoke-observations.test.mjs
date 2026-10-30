// T13 — the smoke matrix observes and exports what it grades.
//
// Two seams are pinned here, and each is proven by a control that would pass under the old shape:
//
//   Seam 1  a leg writes a GRADED cell. Before this task every leg wrote one constant bare record,
//           so `bareCell()` could only ever produce could-not-run. The legs now ask the registry
//           first and, when an adapter owns the grade, measure the identity, run the five
//           invocations and aggregate four checks whose verdicts come from captured bytes.
//   Seam 2  the four control observations ride on the cell records into the producer step, because
//           the cells artifact is the only channel that leaves the smoke job. A control nobody
//           observed stays could-not-run / control-unobservable — never pass, never absent.
//
// What is real in this file, and when:
//   * always: the real registry, the real adapter (identity approval, grading, aggregation), the
//     real plugin payload on disk, the real archived claude-code capture and its byte hashes, the
//     real controls module and its exactly-four rule, the real recorder, and the real workflow bytes.
//   * never here: a model call. The harness-smoke credential lives only on the hosted runner, so the
//     graded leg replays the archived capture's real bytes and the hosted identity the run installs;
//     the hosted four `pass` verdicts are the sprint gate's receipt, not this file's.
//
// A control the run cannot observe locally is reported as unobservable, never as a pass: that is
// exactly the state this task exists to make legible instead of permanent.
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  CHECKS,
  HARNESS,
  PLUGIN_NAME,
  cellFor as adapterCellFor,
  commandNames,
  gradeCheck,
  installationIdentity,
  invocationTable,
  manifestDigest,
  mapCapturedLine,
  prepareRunDirs,
} from "../../test/harness/adapters/claude-code.mjs";
import { REGISTERED } from "../../test/harness/adapters/registry.mjs";
import { CONTROL_IDS, assertControlRows, qualifyControls, writeControls } from "../../test/harness/controls/index.mjs";
import { HARNESSES, TRACKS, loadPins, sha256Hex } from "../../test/harness/pins.mjs";
import { collectCells, readCellArtifacts, recorderExit } from "../../test/harness/recorder.mjs";
import { createCapture } from "../../test/harness/runtime/capture.mjs";
import { runCell, writeCell } from "../../test/harness/smoke/cell.mjs";
import { scanTree } from "../../test/harness/smoke/image-scan.mjs";
import {
  attachMissingKey,
  mergeObservations,
  mergeObservationsFromCells,
  observeExit0DeniedRead,
  observeHiddenImageJudge,
  observeMissingKey,
  observeStaleCache,
  parseObservations,
} from "../../test/harness/smoke/observations.mjs";
import { inspectWorkflowDeclaration, parseYaml, readWorkflow } from "./flow-runner.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const PLUGIN_ROOT = join(ROOT, "plugins", PLUGIN_NAME);
const CAPTURES = join(ROOT, "test/harness/stream/captures");
const PROBE_BYTES = join(CAPTURES, "claude-code-stream-probe.stdout.bin");
const PINNED = loadPins().manifest.harnesses[HARNESS].pinned_cli_version;
const DENIAL_TARGET_NAME = ["write", "outside", "the", "work", "dir"].join("-");
const IMAGE_LINE = {
  type: "assistant",
  message: { content: [{ type: "image", source: { type: "base64", media_type: "image/png", data: "iVBORw0KGgoAAAANSUhEUg==" } }] },
};

function sandbox(t, label = "t13-") {
  const dir = mkdtempSync(join(tmpdir(), label));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

/** A copy of the real plugin payload: the second payload a digest is measured over. */
function payloadCopy(t) {
  const dest = join(sandbox(t, "t13-payload-"), PLUGIN_NAME);
  cpSync(PLUGIN_ROOT, dest, { recursive: true });
  return dest;
}

/**
 * The identity the run installs. Both digests are measured from real payload bytes (the checkout
 * payload and a byte-identical copy), the load evidence is derived from the payload's own
 * `commands/` directory, and the version is the pin the install step installs exactly. A hosted run
 * additionally gets `observed_cli_version` from `claude --version` and `plugin_load_evidence` from
 * the graded invocation's `system/init` event; the local leg below proves those readers work.
 */
function contractIdentity({ observedRoot, observedCliVersion = PINNED }) {
  const expected = manifestDigest(PLUGIN_ROOT);
  const observed = manifestDigest(observedRoot);
  const names = commandNames({ pluginRoot: PLUGIN_ROOT });
  return installationIdentity({
    requested_cli_version: observedCliVersion,
    resolved_cli_version: observedCliVersion,
    observed_cli_version: observedCliVersion,
    install_mode: "checkout",
    plugin_revision: null,
    expected_plugin_manifest_sha256: expected,
    observed_plugin_manifest_sha256: observed,
    loaded_plugin_root: observedRoot,
    plugin_load_evidence: `plugin details lists all ${names.length} command names from the installed payload`,
  });
}

/**
 * One invocation's capture record over REAL archived bytes, persisted so every citation resolves.
 * `extra` appends whole JSON lines — the planted controls use this, exactly as
 * `seed/planted-image-capture` describes, and never to claim a pass.
 */
function replayRecord({ dir, key, check_id, invocation_id, entry = null, extra = [], exit_code = 1, tamperStdout = null }) {
  const base = readFileSync(PROBE_BYTES);
  const bytes = tamperStdout ?? Buffer.concat([base, ...extra.map((line) => Buffer.from(`\n${JSON.stringify(line)}\n`))]);
  const capture = createCapture({
    harness: HARNESS,
    check_id,
    cwd: entry?.cwd ?? null,
    timeout_ms: entry?.timeout_ms ?? 180_000,
    argv: entry?.argv ?? [],
    invocation_id,
  });
  capture.append(bytes);
  capture.observe((json, line) => mapCapturedLine({ json, text: line.text, entry }), { required_read_paths: null });
  capture.finish({ exit_code, signal: null, timed_out: false, spawn_error: null });
  return capture.persist(dir);
}

/** The four/five invocation records a graded leg replays, keyed by the table's own `key`. */
function replayRecords({ evidenceDir, table }) {
  const records = {};
  for (const entry of table) {
    const result = replayRecord({
      dir: join(evidenceDir, entry.key),
      key: entry.key,
      check_id: entry.check_id,
      invocation_id: entry.invocation_id,
      entry,
    });
    if (result.model_request_count !== 0) throw new Error(`${entry.key}: the replay made a model request`);
    records[entry.key] = result;
  }
  return records;
}

/** Twelve records for one env shape, so the recorder judges them exactly as it judges a hosted run. */
async function twelveCells({ env, loadCell, records, evidenceRoot, resolver = { resolve: () => null } }) {
  const out = [];
  for (const harness of HARNESSES) {
    for (const track of TRACKS) {
      const cell = await runCell({
        harness,
        track,
        installMode: "checkout",
        env,
        adapters: new Set(REGISTERED),
        resolver,
        loadCell,
        records: harness === HARNESS ? records : null,
        evidenceDir: join(evidenceRoot, `${harness}-${track}`),
      });
      out.push(cell);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// AC-1 — a smoke leg writes a graded cell from captured bytes and a measured identity
// ---------------------------------------------------------------------------

test("smoke-cell-graded: a leg writes four checks from captured bytes bound to a measured identity", async (t) => {
  const work = sandbox(t);
  const observedRoot = payloadCopy(t);
  const identity = contractIdentity({ observedRoot });

  // The identity is measured, not labelled: 64 hex, equal on both real payloads, and the pin.
  assert.match(identity.observed_plugin_manifest_sha256, /^[0-9a-f]{64}$/);
  assert.equal(identity.observed_plugin_manifest_sha256, identity.expected_plugin_manifest_sha256);
  assert.equal(identity.observed_cli_version, "2.1.291");

  const dirs = prepareRunDirs({ runId: "t13-ac1", track: "pinned" });
  t.after(() => dirs.cleanup());
  const table = invocationTable({ track: "pinned", dirs, pluginRoot: PLUGIN_ROOT });
  const records = replayRecords({ evidenceDir: join(work, "captures"), table });

  const cell = await runCell({
    harness: HARNESS,
    track: "pinned",
    installMode: "checkout",
    env: { ANTHROPIC_API_KEY: "present-binding-not-a-model-call" },
    adapters: new Set(REGISTERED),
    loadCell: async () => ({ identity, installed: { installPath: observedRoot }, steps: [], command_list: { deduped: commandNames({ pluginRoot: PLUGIN_ROOT }) } }),
    records,
    dirs,
    evidenceDir: join(work, "graded"),
  });

  // Four checks, in CHECK_IDS order, each one graded from files and the event stream.
  assert.ok(Array.isArray(cell.checks), "the aggregate carries checks");
  assert.deepEqual(cell.checks.map((check) => check.check_id), CHECKS);
  for (const check of cell.checks) assert.equal(check.source, "files-and-event-stream");
  assert.equal(cell.source, "files-and-event-stream");

  // The identity a pass requires, asserted where it lives.
  assert.equal(cell.installation.observed_cli_version, "2.1.291");
  assert.equal(cell.installation.observed_plugin_manifest_sha256, cell.installation.expected_plugin_manifest_sha256);
  assert.equal(cell.invocation_id !== null, true, `the aggregate carries an invocation id: ${String(cell.invocation_id)}`);
  assert.ok(cell.invocation_id.length > 0, "a non-empty invocation id");
  assert.ok(Number.isInteger(cell.process_exit_code), `an integer exit code, got ${String(cell.process_exit_code)}`);

  // Every cited path resolves, and at least one of them is inside the invocation root.
  assert.ok(cell.evidence_paths.length > 0, "the cell cites evidence");
  for (const cited of cell.evidence_paths) assert.ok(existsSync(cited) && statSync(cited).isFile(), `${cited} resolves`);
  assert.ok(cell.evidence_paths.some((cited) => resolve(cited).startsWith(resolve(work))), "a citation lands inside the invocation root");

  // A stream whose plugin gate never opened is NOT a pass, and the record proves it from bytes.
  assert.notEqual(cell.verdict, "pass", "an unauthenticated probe stream cannot pass");
  assert.ok(cell.checks.some((check) => check.verdict !== "pass"), "no check passed on a stream that never answered");

  // The leg's own observations ride on the cell: the stale-cache control is exercised by a planted
  // one-byte drift measured against the real payload, and the image scan reads the real child tree.
  assert.ok(cell.control_observations?.["stale-cache"], "the leg observed the stale-cache control");
  assert.equal(cell.control_observations["stale-cache"].reason, "installation-identity-mismatch");
  assert.equal(cell.control_observations["stale-cache"].evidence.field, "observed_plugin_manifest_sha256");
  assert.ok(cell.control_observations["hidden-image-judge"], "the leg scanned the verify child tree");
  assert.equal(cell.control_observations["hidden-image-judge"].verdict, "pass");

  // The recorder accepts it as one of the twelve cells.
  const rest = [];
  for (const harness of HARNESSES) {
    for (const track of TRACKS) {
      if (harness === HARNESS && track === "pinned") continue;
      rest.push({
        harness,
        track,
        cell_state: "could-not-run",
        reason: `${harness}-adapter-not-implemented`,
        install_mode: "checkout",
      });
    }
  }
  const collected = collectCells([...rest, cell], { pins: loadPins(), installMode: "checkout" });
  assert.equal(collected.length, 12, "collectCells accepts the graded cell among the twelve");
  assert.equal(collected.find((entry) => entry.harness === HARNESS && entry.track === "pinned").checks.length, 4);

  // writeCell is a read-back, not a blind write: what lands on disk is what was assembled.
  const written = writeCell({ file: join(work, "cell", "cell.json"), cell });
  assert.equal(written.ok, true, JSON.stringify(written.mismatches));
  const back = JSON.parse(readFileSync(join(work, "cell", "cell.json"), "utf8"));
  assert.equal(back.verdict, cell.verdict);
  assert.equal(back.checks.length, 4);

  // An identity that disagrees by one file short-circuits BEFORE any check verdict is read.
  const mutated = join(work, "mutated");
  cpSync(observedRoot, mutated, { recursive: true });
  const victim = join(mutated, "package.json");
  writeFileSync(victim, `${readFileSync(victim, "utf8")} `, "utf8");
  const stale = contractIdentity({ observedRoot: mutated });
  assert.notEqual(stale.observed_plugin_manifest_sha256, stale.expected_plugin_manifest_sha256, "one byte moved the digest");

  const refused = adapterCellFor({
    track: "pinned",
    cells: [cell.checks.map((check) => ({ ...check, evidence_paths: ["x"] }))].flat().map((check) => ({
      harness: HARNESS,
      track: "pinned",
      installation: stale,
      invocation_id: "inv",
      check_id: check.check_id,
      verdict: check.verdict,
      reason: check.reason,
      source: check.source,
      denied_tool_call: null,
      process_exit_code: 0,
      evidence_paths: [],
      report_paths: [],
      observed_verify_outcome: null,
      checks: [check],
    })),
    installation: stale,
  });
  assert.equal(refused.verdict, "could-not-run");
  assert.equal(refused.reason, "installation-identity-mismatch");
  assert.equal(refused.identity_decision.detail.field, "observed_plugin_manifest_sha256");
});

// ---------------------------------------------------------------------------
// AC-2 — the four observations travel on the cells; an unobserved control stays unobservable
// ---------------------------------------------------------------------------

/** A cells dir in the layout `actions/download-artifact` writes, with observations on two records. */
function cellsDirWithObservations(t, { drop = null } = {}) {
  const root = join(sandbox(t, "t13-cells-"), "cells");
  const observations = {
    "missing-key": { verdict: "could-not-run", reason: "missing-api-key", evidence: { model_request_count: 0, child_ran: false } },
    "stale-cache": {
      verdict: "could-not-run",
      reason: "installation-identity-mismatch",
      evidence: { field: "observed_plugin_manifest_sha256" },
    },
    "exit0-denied-read": { verdict: "fail", reason: "denied_tool_call", evidence: { process_exit_code: 0, stream_offset: 4096 } },
    "hidden-image-judge": {
      verdict: "pass",
      reason: "no-image-judge-in-child-tree",
      evidence: { files_scanned: 2, tree_sha256: "b".repeat(64) },
    },
  };
  if (drop) delete observations[drop];
  for (const harness of HARNESSES) {
    for (const track of TRACKS) {
      const folder = join(root, `harness-eval-cell-1-1-${harness}-${track}`, "cell");
      mkdirSync(folder, { recursive: true });
      const carries = harness === HARNESS && Object.keys(observations).length > 0;
      const record = {
        harness,
        track,
        cell_state: "could-not-run",
        reason: "missing-api-key",
        install_mode: "checkout",
        ...(carries ? { control_observations: { ...observations } } : {}),
      };
      writeFileSync(join(folder, "cell.json"), `${JSON.stringify(record)}\n`, "utf8");
    }
  }
  return root;
}

test("smoke-control-observations: observed rows reach the producer, an unobserved control stays control-unobservable", (t) => {
  const work = sandbox(t);

  // --- the complete dir: all four observed ------------------------------------------------
  const complete = cellsDirWithObservations(t);
  const observations = mergeObservationsFromCells(complete);
  assert.deepEqual(Object.keys(observations).sort(), [...CONTROL_IDS].sort(), "all four observations travel with the cells");
  const rows = assertControlRows(qualifyControls({ observations }).rows);
  const line = (id) => {
    const row = rows.find((entry) => entry.control_id === id);
    return `${row.control_id} ${row.verdict} ${row.reason}`;
  };
  assert.equal(line("missing-key"), "missing-key could-not-run missing-api-key");
  assert.equal(line("stale-cache"), "stale-cache could-not-run installation-identity-mismatch");
  assert.equal(line("exit0-denied-read"), "exit0-denied-read fail denied_tool_call");
  assert.equal(line("hidden-image-judge"), "hidden-image-judge pass no-image-judge-in-child-tree");
  assert.equal(rows.length, 4);

  const written = writeControls({ file: join(work, "cells", "controls.json"), rows });
  assert.equal(written.ok, true, JSON.stringify(written.mismatches));
  assert.equal(written.rows.length, 4, "controls.json reads back four rows");

  // A per-cell observation is NOT a controls artifact: the recorder routes only cells/controls.json.
  const artifacts = readCellArtifacts(complete);
  assert.equal(artifacts.cells.length, 12, "twelve cell records");
  assert.equal(artifacts.controls.length, 0, "a control_observations field never impersonates the four rows");

  // --- the partial dir: the fourth control was never observed ------------------------------
  const partial = cellsDirWithObservations(t, { drop: "hidden-image-judge" });
  const partialRows = assertControlRows(qualifyControls({ observations: mergeObservationsFromCells(partial) }).rows);
  const partialLine = (id) => {
    const row = partialRows.find((entry) => entry.control_id === id);
    return `${row.control_id} ${row.verdict} ${row.reason}`;
  };
  assert.equal(partialLine("hidden-image-judge"), "hidden-image-judge could-not-run control-unobservable");
  assert.equal(partialLine("missing-key"), "missing-key could-not-run missing-api-key");
  assert.equal(partialLine("stale-cache"), "stale-cache could-not-run installation-identity-mismatch");
  assert.equal(partialLine("exit0-denied-read"), "exit0-denied-read fail denied_tool_call");
  assert.equal(partialRows.length, 4, "an unobserved control is a row, not an omission");
  assert.equal(partialRows.find((row) => row.control_id === "hidden-image-judge").matched, false);

  // --- the exactly-four rule and the empty job output ------------------------------------
  assert.throws(() => assertControlRows(rows.slice(0, 3)), /expected exactly/);
  assert.throws(() => assertControlRows([...rows, rows[0]]), /expected exactly/);
  assert.deepEqual(parseObservations(""), {}, "an unset job output arrives as an empty string");
  assert.deepEqual(parseObservations(undefined), {});
  assert.deepEqual(Object.keys(parseObservations(JSON.stringify(observations))).sort(), [...CONTROL_IDS].sort());

  // A later non-null observation wins; a null never erases one.
  const merged = mergeObservations({ "missing-key": { verdict: "fail", reason: "wrong" } }, { "missing-key": null });
  assert.equal(merged["missing-key"].reason, "wrong", "a null observation does not erase a real one");

  // --- the exit-0 denial: a clean exit beside a required denial is a FAIL -----------------
  const denialDir = join(work, "denial");
  mkdirSync(denialDir, { recursive: true });
  const denialTarget = join(denialDir, DENIAL_TARGET_NAME);
  const deniedRecord = replayRecord({
    dir: denialDir,
    key: "verify-button-drift",
    check_id: "verify",
    invocation_id: "inv-denied-write",
    entry: { cwd: denialDir },
    exit_code: 0,
    extra: [
      {
        type: "result",
        subtype: "success",
        is_error: false,
        permissionMode: "dontAsk",
        permission_denials: [{ tool_name: "Write", input: { file_path: denialTarget } }],
      },
    ],
  });
  assert.equal(deniedRecord.process_status.exit_code, 0, "the process exited 0");
  const denied = observeExit0DeniedRead({ record: deniedRecord, check: "verify" });
  assert.ok(denied, "the denial was observed");
  assert.equal(denied.verdict, "fail");
  assert.equal(denied.reason, "denied_tool_call");
  assert.equal(denied.evidence.process_exit_code, 0, "a pass beside exit 0 is what the control refuses");
  assert.equal(denied.evidence.required_read, true);
  assert.ok(Number.isInteger(denied.evidence.stream_offset), "the denial cites its own stream offset");

  // The paired observation: the same bytes without the denial produce no observation at all.
  const cleanDir = join(work, "clean-denial");
  mkdirSync(cleanDir, { recursive: true });
  const cleanRecord = replayRecord({ dir: cleanDir, key: "clean", check_id: "verify", invocation_id: "inv-clean", entry: { cwd: cleanDir }, exit_code: 0 });
  assert.equal(observeExit0DeniedRead({ record: cleanRecord, check: "verify" }), null, "no denial, no observation");

  // --- the missing-key producer reads the leg's own row ----------------------------------
  const legCell = join(work, "leg");
  mkdirSync(legCell, { recursive: true });
  writeFileSync(join(legCell, "cell.json"), `${JSON.stringify({ harness: HARNESS, track: "pinned", cell_state: "could-not-run", reason: "missing-api-key" })}\n`, "utf8");
  const attached = attachMissingKey({
    row: { control_id: "missing-key", verdict: "could-not-run", reason: "missing-api-key", model_requests: 0, child_ran: false },
    cellFile: join(legCell, "cell.json"),
  });
  assert.equal(attached.ok, true);
  const missing = observeMissingKey({ row: { control_id: "missing-key", verdict: "could-not-run", reason: "missing-api-key", model_requests: 0, child_ran: false } });
  assert.equal(missing.verdict, "could-not-run");
  assert.equal(missing.reason, "missing-api-key");
  assert.equal(observeMissingKey({ row: { control_id: "missing-key", verdict: "pass", reason: null, model_requests: 1, child_ran: true } }), null);
  const replayed = mergeObservationsFromCells(work);
  assert.equal(replayed["missing-key"].reason, "missing-api-key", "the merged observation is the one the leg attached");

  // --- the stale cache: approveIdentity refuses a digest that moved by one file -----------
  const checkoutRoot = payloadCopy(t);
  const staleRoot = join(sandbox(t, "t13-stale-"), PLUGIN_NAME);
  cpSync(checkoutRoot, staleRoot, { recursive: true });
  const staleTarget = join(staleRoot, "package.json");
  writeFileSync(staleTarget, `${readFileSync(staleTarget, "utf8")}\u0020`, "utf8");
  const stale = observeStaleCache({ checkoutRoot, staleRoot, mutatedFile: "package.json", observedCliVersion: PINNED });
  assert.ok(stale, "the stale cache was observed");
  assert.equal(stale.verdict, "could-not-run");
  assert.equal(stale.reason, "installation-identity-mismatch");
  assert.equal(stale.evidence.field, "observed_plugin_manifest_sha256");
  assert.equal(observeStaleCache({ checkoutRoot, staleRoot: checkoutRoot, mutatedFile: null, observedCliVersion: PINNED }), null, "a matching digest approves, so nothing is observed");
  assert.equal(sha256Hex(readFileSync(staleTarget)).length, 64);
});

// ---------------------------------------------------------------------------
// AC-3 — fail-closed survives: named reasons, twelve cells, nothing passes unevidenced
// ---------------------------------------------------------------------------

test("smoke-cell-fail-closed: three env shapes produce three named reasons and twelve cells", async (t) => {
  const work = sandbox(t);
  const observedRoot = payloadCopy(t);
  const identity = contractIdentity({ observedRoot });

  // --- shape 1: every credential absent ------------------------------------------------
  const absentEnv = {};
  let loadCalls = 0;
  const keyless = await twelveCells({
    env: absentEnv,
    loadCell: async () => {
      loadCalls += 1;
      throw new Error("the load leg ran for a cell the guard refused");
    },
    records: null,
    evidenceRoot: join(work, "absent"),
  });
  assert.equal(loadCalls, 0, "no cell that the registry decided ever reached the load leg");
  const claudeKeyless = keyless.find((cell) => cell.harness === HARNESS && cell.track === "pinned");
  assert.equal(claudeKeyless.verdict, "could-not-run");
  assert.equal(claudeKeyless.reason, "missing-api-key");
  assert.equal(keyless.length, 12, "twelve records after the keyless shape");
  for (const record of keyless) {
    assert.equal(record.verdict, "could-not-run", `${record.harness}/${record.track} is present-as-could-not-run, never omitted`);
    // The registry decides the credential BEFORE adapter absence, so an absent key is the reason
    // even for a harness with no adapter — the guard's refusal is the truth, not a per-harness label.
    assert.equal(record.reason, "missing-api-key");
  }
  assert.equal(keyless.some((cell) => cell.reason === "smoke-not-implemented"), false, "the constant bare record is gone");
  const collectedKeyless = collectCells(keyless, { pins: loadPins(), installMode: "checkout" });
  assert.equal(collectedKeyless.length, 12);
  assert.equal(recorderExit({ cells: collectedKeyless }).reason, "could-not-run");

  // --- shape 2: every binding present (the hosted runner's own shape) -------------------
  // With a key present the guard proceeds, so adapter absence is what decides those four cells.
  const dirs = prepareRunDirs({ runId: "t13-ac3", track: "pinned" });
  t.after(() => dirs.cleanup());
  const table = invocationTable({ track: "pinned", dirs, pluginRoot: PLUGIN_ROOT });
  const records = replayRecords({ evidenceDir: join(work, "captures"), table });
  const boundEnv = {
    ANTHROPIC_API_KEY: "present-binding-not-a-model-call",
    CODEX_API_KEY: "present-binding-not-a-model-call",
    XAI_API_KEY: "present-binding-not-a-model-call",
    GEMINI_API_KEY: "present-binding-not-a-model-call",
  };
  const loadCell = async () => ({ identity, installed: { installPath: observedRoot } });

  const bound = await twelveCells({ env: boundEnv, loadCell, records, evidenceRoot: join(work, "bound") });
  assert.equal(bound.length, 12, "twelve records after the bound shape");
  for (const harness of ["codex", "grok", "opencode", "pi"]) {
    for (const track of TRACKS) {
      const cell = bound.find((entry) => entry.harness === harness && entry.track === track);
      assert.equal(cell.verdict, "could-not-run", `${harness}/${track} is present-as-could-not-run, never omitted`);
      assert.equal(cell.reason, `${harness}-adapter-not-implemented`, `${harness}/${track} names its own reason`);
    }
  }
  // cursor has no secret in harness-smoke and invents none: the guard still decides it.
  for (const track of TRACKS) {
    assert.equal(bound.find((entry) => entry.harness === "cursor" && entry.track === track).reason, "missing-api-key");
  }
  const graded = bound.find((entry) => entry.harness === HARNESS && entry.track === "pinned");
  assert.notEqual(graded.reason, "missing-api-key", "a present binding is NOT refused for a missing key");
  assert.notEqual(graded.verdict, "pass", "the probe stream cannot pass either");
  if (graded.verdict === "pass") {
    assert.ok(graded.invocation_id && Number.isInteger(graded.process_exit_code) && graded.evidence_paths.length > 0);
  }
  const collectedBound = collectCells(bound, { pins: loadPins(), installMode: "checkout" });
  assert.equal(collectedBound.length, 12);
  assert.equal(recorderExit({ cells: collectedBound }).reason, "could-not-run");

  // --- shape 3: one genuinely broken leg ------------------------------------------------
  const broken = await runCell({
    harness: HARNESS,
    track: "pinned",
    installMode: "checkout",
    env: boundEnv,
    adapters: new Set(REGISTERED),
    loadCell: async () => {
      throw new Error("executeLoad could not isolate a config directory");
    },
    records: null,
    evidenceDir: join(work, "broken"),
  });
  assert.equal(broken.cell_state, "could-not-run");
  assert.equal(broken.reason, "smoke-cell-failed");
  assert.match(String(broken.detail), /executeLoad could not isolate/, "the failure keeps its own message");

  // A could-not-run record always names a reason, and nothing passes without evidence.
  for (const record of [broken, claudeKeyless, graded, ...keyless, ...bound]) {
    assert.ok(String(record.reason ?? "").trim().length > 0, `${record.harness}/${record.track} names its reason`);
    if (record.verdict === "pass") {
      assert.ok(record.evidence_paths.length > 0, `${record.harness}/${record.track} cites evidence`);
    }
  }

  // The three shapes produced three DISTINCT named reasons — not one placeholder for every leg.
  const reasons = new Set([claudeKeyless.reason, broken.reason, bound.find((entry) => entry.harness === "codex").reason]);
  assert.equal(reasons.size, 3, `three env shapes must read three reasons, got ${[...reasons].join(", ")}`);
});


// ---------------------------------------------------------------------------
// TC-1 — the workflow carries the wiring without moving a pinned anchor
// ---------------------------------------------------------------------------

const stepsOf = (job) => (Array.isArray(job?.steps) ? job.steps : []);
const nameOf = (step) => String(step?.name ?? "");
const runOf = (step) => String(step?.run ?? "");

test("smoke-workflow-wiring: four jobs, the record anchor, one cell upload, runCell in every keyed step", () => {
  const { text, yaml } = readWorkflow();
  const declaration = inspectWorkflowDeclaration(parseYaml(text));
  assert.deepEqual(declaration.failures, [], `the workflow declaration fails: ${declaration.failures.join("; ")}`);
  assert.deepEqual(Object.keys(yaml.jobs).sort(), ["download", "drift", "grade", "smoke"]);
  assert.equal(yaml.jobs.smoke["timeout-minutes"], 45, "the graded legs run five real invocations, each capped at 600s");

  const smokeSteps = stepsOf(yaml.jobs.smoke);

  // The record anchor is literal and adjacent: `- name: Record the cell` then `run: |`.
  assert.match(text, /^      - name: Record the cell\n        run: \|$/m, "the record anchor moved");
  const recordSteps = smokeSteps.filter((step) => nameOf(step) === "Record the cell");
  assert.equal(recordSteps.length, 1, "exactly one record step");
  const [recordStep] = recordSteps;
  assert.match(runOf(recordStep), /\$\{\{ inputs\.install_mode \}\}/, "the record step interpolates the dispatch input");
  assert.equal(/"install_mode"\s*:\s*"(?:checkout|published)"/.test(runOf(recordStep)), false, "the record step hardcodes an install mode");
  assert.equal(/smoke-not-implemented/.test(text), false, "the constant bare record is gone from the workflow");
  assert.match(runOf(recordStep), /cell\/failure\.json/, "the fallback reads the leg's own failure reason");
  assert.match(runOf(recordStep), /cell-not-recorded/, "a leg that wrote nothing is named");

  // The recorder resolution takes the FIRST step whose run text matches, so exactly one does.
  const matching = smokeSteps.filter((step) => /cell\/cell\.json/.test(runOf(step)));
  assert.equal(matching.length, 1, `the record step must be the only step naming the cell file: ${matching.map(nameOf).join(", ")}`);
  assert.equal(nameOf(matching[0]), "Record the cell");

  // One upload, one path.
  const uploads = smokeSteps.filter((step) => /actions\/upload-artifact/.test(String(step?.uses ?? "")));
  assert.equal(uploads.length, 1);
  assert.equal(uploads[0].with?.path, "cell/cell.json");

  // Six model steps (one per harness); five carry exactly one binding, cursor none.
  const keyed = smokeSteps.filter((step) => /^Smoke model step\b/.test(nameOf(step)));
  assert.equal(keyed.length, 6, "one model step per harness");
  assert.equal(keyed.filter((step) => Object.keys(step.env ?? {}).length === 1).length, 5, "five harnesses have a key");
  for (const step of keyed) {
    assert.match(runOf(step), /test\/harness\/smoke\/model-step\.mjs/, `${nameOf(step)} does not run the smoke cell`);
    assert.ok(Object.keys(step.env ?? {}).length <= 1, `${nameOf(step)} binds more than one variable`);
  }

  // The install slot installs the resolved version for real.
  const install = smokeSteps.find((step) => /matrix\.harness/.test(runOf(step)));
  assert.ok(install, "the install slot is missing");
  assert.match(runOf(install), /test\/harness\/smoke\/install\.mjs/, "the install slot still reserves a slot instead of installing");

  // The keyless control keeps its name and its in-step absence assertion, and merges its own row.
  const control = smokeSteps.find((step) => /^Keyless control\b/.test(nameOf(step)));
  assert.ok(control, "the keyless control step is missing");
  assert.match(runOf(control), /\[ -n "\$\{!name:-\}" \]/, "the in-step absence assertion was dropped");
  assert.match(runOf(control), /attachMissingKey/, "the keyless control does not merge its own observation");

  // The producer merges the cells' observations and tolerates an empty job output.
  const producer = stepsOf(yaml.jobs.download).find((step) => /qualifyControls/.test(runOf(step)));
  assert.ok(producer, "the controls producer is missing");
  assert.match(runOf(producer), /control_observations/, "the producer never reads the cells' observations");
  assert.match(runOf(producer), /HARNESS_EVAL_CONTROL_OBSERVATIONS/, "the producer ignores the optional job output");
  assert.match(runOf(producer), /\.trim\(\)/, "the producer still JSON.parses an empty job output, which throws");
  assert.equal(/cell\/cell\.json/.test(runOf(producer)), false, "the producer must not become the recorder's first match");
});

// ---------------------------------------------------------------------------
// TC-2 — the hidden-image-judge scan discriminates
// ---------------------------------------------------------------------------

test("smoke-image-scan: a planted image request fails the scan, a clean tree passes, an unreadable tree yields nothing", (t) => {
  const work = sandbox(t);

  // --- the clean real tree: the archived capture and its stdout bytes --------------------
  const clean = scanTree({ roots: [CAPTURES] });
  assert.ok(clean, "the archived capture tree is readable");
  assert.equal(clean.verdict, "pass");
  assert.equal(clean.reason, "no-image-judge-in-child-tree");
  assert.ok(clean.files_scanned >= 2, `files_scanned ${clean.files_scanned} must count the capture and its bytes`);
  assert.match(clean.tree_sha256, /^[0-9a-f]{64}$/, "the pass cites a tree hash, not a constant");
  assert.deepEqual(clean.findings, []);

  // --- the planted copy: one appended image content block -------------------------------
  const plantedDir = join(work, "planted");
  mkdirSync(plantedDir, { recursive: true });
  const base = readFileSync(PROBE_BYTES);
  const plantedBytes = Buffer.concat([base, Buffer.from(`\n${JSON.stringify(IMAGE_LINE)}\n`)]);
  const plantedFile = join(plantedDir, "planted-image.stdout.bin");
  writeFileSync(plantedFile, plantedBytes);
  writeFileSync(join(plantedDir, "planted-image.capture.json"), readFileSync(join(CAPTURES, "claude-code-stream-probe.capture.json")));
  const planted = scanTree({ roots: [plantedDir] });
  assert.ok(planted, "the planted tree is readable");
  assert.equal(planted.verdict, "fail");
  assert.equal(planted.reason, "image-judge-in-child-tree");
  assert.equal(planted.findings.length > 0, true);
  assert.ok(planted.findings.some((finding) => finding.file.endsWith("planted-image.stdout.bin")), JSON.stringify(planted.findings));
  const hit = planted.findings.find((finding) => finding.file.endsWith("planted-image.stdout.bin"));
  assert.equal(hit.offset, plantedBytes.indexOf('"type":"image"'), "the finding cites the byte offset the image block was appended at");
  assert.ok(planted.tree_sha256 !== clean.tree_sha256, "the planted tree hashes differently");

  // --- an unreadable tree: no observation at all ----------------------------------------
  assert.equal(scanTree({ roots: [join(work, "absent")] }), null, "a tree the scanner cannot open is not a pass");
  assert.equal(scanTree({ roots: [] }), null);
  assert.equal(observeHiddenImageJudge({ roots: [join(work, "absent")] }), null, "an unreadable tree leaves the control unobservable");

  const observed = observeHiddenImageJudge({ roots: [CAPTURES] });
  assert.equal(observed.verdict, "pass");
  assert.equal(observed.reason, "no-image-judge-in-child-tree");
  const observedPlanted = observeHiddenImageJudge({ roots: [plantedDir] });
  assert.equal(observedPlanted.verdict, "fail");
  assert.equal(observedPlanted.reason, "image-judge-in-child-tree");
});

// `gradeCheck` is imported so the replay leg above grades through the same function a live run
// uses; this binding keeps the import honest if the aggregate path ever stops calling it.
assert.equal(typeof gradeCheck, "function");
