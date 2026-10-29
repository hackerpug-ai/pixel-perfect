// T11 cycle-2 reproduction: the two blockers that make the sprint's headline promise unprovable
// on a real run. Both live in files T11's contract does not own; this script is the replayable
// proof, and it prints `dead` the moment the owner's patch lands.
//
//   node .tmp/sprint-01-verification/t11-controls-wiring.repro.mjs
//
// F-T11-1  nothing produces controls.json, `controls` is not a required field, and assembleResult
//          defaults it to [], so a dispatched run publishes `controls: []`, still validates, and
//          the gate's `jq -r '.controls[]'` prints zero rows forever.
// F-T11-2  the smoke job uploads its whole cell/ dir, so keyless-control.json, binding.json and
//          evidence/*.capture.json land in cells/, where the recursive walk classifies every
//          *.json as a cell record and the recorder refuses the whole run.
//
// The cells/ layout below mirrors what the download job really assembles: actions/download-artifact
// with `pattern:` + `merge-multiple: false` writes one subdir per artifact, named after the artifact.
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { readCellArtifacts } from "../../test/harness/recorder.mjs";
import { assembleResult } from "../../test/harness/recorder/result.mjs";
import { collectCells } from "../../test/harness/recorder/validate.mjs";
import { HARNESSES, TRACKS, loadPins } from "../../test/harness/pins.mjs";

const RUN = "1234567890";
const ATTEMPT = "1";
const SCHEMA = "test/harness/schemas/harness-eval-result.v1.schema.json";

// Every file the smoke job's cell/ dir really carries, for the one matrix leg that runs the keyless
// control. Names come from .github/workflows/harness-eval.yml: binding.json, the keyless row, and
// capture.persist("cell/evidence") -> <harness>-<uuid>.capture.json.
const STRAYS = {
  "binding.json": { harness: "claude-code", credential_env: "ANTHROPIC_API_KEY", binding_env: "ANTHROPIC_API_KEY", present: false, verdict: "could-not-run", reason: "missing-api-key" },
  "keyless-control.json": { control_id: "missing-key", verdict: "could-not-run", reason: "missing-api-key", model_requests: 0, child_ran: false },
  "evidence/claude-code-verify.capture.json": { harness: "claude-code", check_id: "verify", model_request_count: 0 },
};

function buildDownloadedCells() {
  const root = mkdtempSync(join(tmpdir(), "t11-cells-"));
  for (const harness of HARNESSES) {
    for (const track of TRACKS) {
      const dir = join(root, `harness-eval-cell-${RUN}-${ATTEMPT}-${harness}-${track}`);
      mkdirSync(join(dir, "evidence"), { recursive: true });
      writeFileSync(
        join(dir, "cell.json"),
        `${JSON.stringify({ harness, track, cell_state: "could-not-run", reason: "smoke-not-implemented", install_mode: "checkout", event: "workflow_dispatch", run_id: RUN, run_attempt: ATTEMPT })}\n`,
      );
      if (harness !== "claude-code" || track !== "pinned") continue;
      for (const [name, body] of Object.entries(STRAYS)) {
        writeFileSync(join(dir, name), `${JSON.stringify(body)}\n`);
      }
    }
  }
  return root;
}

function reproduceF2(root) {
  const artifacts = readCellArtifacts(root);
  const strays = artifacts.files.filter((file) => !file.endsWith("/cell.json") && !file.endsWith("/controls.json"));
  let refusal = null;
  try {
    collectCells(artifacts.cells, { pins: loadPins(), installMode: "checkout" });
  } catch (error) {
    refusal = { reason: error.reason ?? error.name, details: error.details ?? String(error.message) };
  }
  const dead = artifacts.cells.length === HARNESSES.length * TRACKS.length && refusal === null;
  return {
    status: dead ? "dead" : "ALIVE",
    cells_classified: artifacts.cells.length,
    expected_cells: HARNESSES.length * TRACKS.length,
    strays_classified_as_cells: strays,
    recorder_refusal: refusal,
    why: dead
      ? "the walk classifies only real cell records, so a genuinely malformed cell is the only thing it refuses"
      : `${strays.length} non-cell files were classified as cell records and the recorder refused the run`,
  };
}

function reproduceF1() {
  const schema = JSON.parse(readFileSync(SCHEMA, "utf8"));
  const controlsSchema = schema.properties?.controls ?? {};
  const controlsInRequired = (schema.required ?? []).includes("controls");
  const pins = loadPins();
  const records = HARNESSES.flatMap((harness) =>
    TRACKS.map((track) => ({ harness, track, cell_state: "could-not-run", reason: "smoke-not-implemented", install_mode: "checkout" })),
  );
  const cells = collectCells(records, { pins, installMode: "checkout" });
  const context = {
    repository: "hackerpug-ai/pixel-perfect",
    runId: Number(RUN),
    runNumber: 1,
    attempt: Number(ATTEMPT),
    event: "workflow_dispatch",
    installMode: "checkout",
    dispatchSha: "a".repeat(40),
    sourceBranch: "main",
    now: new Date().toISOString(),
  };
  const timestamps = { evaluation_started_at: "2026-10-29T00:00:00Z", evaluation_completed_at: "2026-10-29T00:01:00Z" };
  let emptyAccepted = null;
  let refusal = null;
  try {
    emptyAccepted = assembleResult({ cells, pins, context, timestamps, controls: [] }).controls.length;
  } catch (error) {
    refusal = { reason: error.reason ?? error.name, details: error.details ?? String(error.message) };
  }
  const dead = refusal !== null && controlsInRequired;
  return {
    status: dead ? "dead" : "ALIVE",
    controls_in_schema_required: controlsInRequired,
    controls_min_items: controlsSchema.minItems ?? null,
    empty_controls_accepted_rows: emptyAccepted,
    assemble_result_refusal: refusal,
    why: dead
      ? "an empty controls array cannot validate, so a run with no controls row is a refused run"
      : "an empty controls array is accepted and validates, so the gate's `jq -r '.controls[]'` prints nothing while the artifact reads as a result",
  };
}

const root = buildDownloadedCells();
const f2 = reproduceF2(root);
rmSync(root, { recursive: true, force: true });
const f1 = reproduceF1();

for (const [id, report] of [
  ["F-T11-1", f1],
  ["F-T11-2", f2],
]) {
  process.stdout.write(`${id} ${report.status}: ${report.why}\n`);
  for (const [key, value] of Object.entries(report)) {
    if (key === "status" || key === "why") continue;
    process.stdout.write(`  ${key} = ${JSON.stringify(value)}\n`);
  }
}
process.exitCode = f1.status === "dead" && f2.status === "dead" ? 0 : 1;
