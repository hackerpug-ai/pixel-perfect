// T11-FIX2 — the controls array on a real run: produced, required, refused when absent, and
// readable by the recorder out of a cells dir that also carries control evidence.
//
// The four control ids and their verdict/reason vocabulary are T11's (`test/harness/controls/`);
// this file only proves they are WIRED. It encodes the two blockers T11's review reproduced:
//   F-T11-1  nothing writes controls.json, `controls` is optional in the schema, and assembleResult
//            defaults it to [], so a dispatched run publishes `controls: []` and the gate's
//            `jq -r '.controls[]'` prints nothing forever.
//   F-T11-2  the smoke upload shipped its whole cell/ dir, so binding.json, keyless-control.json and
//            evidence/*.capture.json landed under cells/ and the walk graded them as cell records.
//
// Every test drives the shipped modules against a real cells layout on disk; nothing here stubs the
// reader, the schema or the workflow — the controls producer below is the workflow's OWN step body,
// executed against the real controls module.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { CONTROL_IDS, UNOBSERVABLE_REASON, qualifyControls } from "../../test/harness/controls/index.mjs";
import { HARNESSES, TRACKS, loadPins } from "../../test/harness/pins.mjs";
import { RecorderRefusal, collectCells, main, readCellArtifacts } from "../../test/harness/recorder.mjs";
import { assembleResult } from "../../test/harness/recorder/result.mjs";
import { validateAgainst, validateResult } from "../../test/harness/validate.mjs";
import { readWorkflow } from "./flow-runner.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SCHEMA_FILE = join(ROOT, "test/harness/schemas/harness-eval-result.v1.schema.json");
const RUN = "1234567890";
const ATTEMPT = "1";
const PREFIX = `harness-eval-cell-${RUN}-${ATTEMPT}`;

/** A scratch dir, removed when the test ends. */
function sandbox(t) {
  const dir = mkdtempSync(join(tmpdir(), "t11-fix-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

/** The bare smoke record the matrix really writes: identity plus an honest named reason. */
function bareRecord(harness, track) {
  return {
    harness,
    track,
    cell_state: "could-not-run",
    reason: "smoke-not-implemented",
    install_mode: "checkout",
    event: "workflow_dispatch",
    run_id: RUN,
    run_attempt: ATTEMPT,
  };
}

/** Twelve cell artifacts, laid out the way actions/download-artifact writes them. */
function writeCells(dir, records = HARNESSES.flatMap((harness) => TRACKS.map((track) => bareRecord(harness, track)))) {
  for (const record of records) {
    const folder = join(dir, `${PREFIX}-${record.harness}-${record.track}`);
    mkdirSync(folder, { recursive: true });
    writeFileSync(join(folder, "cell.json"), `${JSON.stringify(record)}\n`, "utf8");
  }
  return dir;
}

// The three named control-evidence forms, in the shapes the workflow and the runtime really write:
// the keyless row and binding.json from the claude-code/pinned leg of harness-eval.yml, the capture
// from capture.persist("cell/evidence") in that same leg.
const CONTROL_EVIDENCE = {
  "binding.json": {
    harness: "claude-code",
    credential_env: "ANTHROPIC_API_KEY",
    binding_env: "ANTHROPIC_API_KEY",
    present: false,
    present_name: "ANTHROPIC_API_KEY",
    checked: ["ANTHROPIC_API_KEY"],
    verdict: "could-not-run",
    reason: "missing-api-key",
  },
  "keyless-control.json": {
    control_id: "missing-key",
    verdict: "could-not-run",
    reason: "missing-api-key",
    model_requests: 0,
    child_ran: false,
  },
  "evidence/claude-code-verify.capture.json": {
    harness: "claude-code",
    check_id: "verify",
    model_request_count: 0,
  },
};

/** The cells dir one attempt really assembles: twelve cells, one leg also carrying the evidence. */
function downloadedCells(root) {
  writeCells(root);
  const leg = join(root, `${PREFIX}-claude-code-pinned`);
  for (const [name, body] of Object.entries(CONTROL_EVIDENCE)) {
    mkdirSync(dirname(join(leg, name)), { recursive: true });
    writeFileSync(join(leg, name), `${JSON.stringify(body)}\n`, "utf8");
  }
  return root;
}

/** The result inputs the recorder assembles from: real pins, real cells, a copied interval. */
function resultInputs() {
  const pins = loadPins();
  const records = HARNESSES.flatMap((harness) => TRACKS.map((track) => bareRecord(harness, track)));
  return {
    pins,
    cells: collectCells(records, { pins, installMode: "checkout" }),
    context: {
      repository: "hackerpug-ai/pixel-perfect",
      runId: Number(RUN),
      runNumber: 1,
      attempt: Number(ATTEMPT),
      event: "workflow_dispatch",
      installMode: "checkout",
      dispatchSha: "a".repeat(40),
      sourceBranch: "main",
      now: new Date().toISOString(),
    },
    timestamps: { evaluation_started_at: "2026-10-29T00:00:00Z", evaluation_completed_at: "2026-10-29T00:01:00Z" },
  };
}

const stepsOf = (job) => (Array.isArray(job?.steps) ? job.steps : []);
const isUploadOf = (step, artifact) =>
  /actions\/upload-artifact/.test(String(step?.uses ?? "")) && String(step?.with?.name ?? "").startsWith(artifact);

/** The one step whose command writes the four rows, and the job that declares it. */
function controlsProducerStep(yaml) {
  for (const [jobName, job] of Object.entries(yaml?.jobs ?? {})) {
    const steps = stepsOf(job);
    const index = steps.findIndex(
      (step) => /writeControls\s*\(/.test(String(step?.run ?? "")) && /cells\/controls\.json/.test(String(step?.run ?? "")),
    );
    if (index >= 0) return { jobName, job, steps, index, step: steps[index] };
  }
  return null;
}

const CELLS_ARTIFACT = "harness-eval-cells-";

test("controls-producer: a run produces its four control rows, the schema requires them, and a run that publishes none is refused", async (t) => {
  // --- the schema: `controls` is required, exactly four rows, so `controls: []` cannot validate ---
  const schema = JSON.parse(readFileSync(SCHEMA_FILE, "utf8"));
  assert.ok(schema.required.includes("controls"), `controls is not required by the schema (${schema.required.length} required fields)`);
  assert.equal(schema.properties?.controls?.minItems, 4, "controls must declare minItems 4");
  assert.equal(schema.properties?.controls?.maxItems, 4, "controls must declare maxItems 4");
  assert.deepEqual(schema.properties.controls.items.required, ["control_id", "verdict", "reason"], "the row shape T11 owns is unchanged");

  // --- the workflow: a producer writes cells/controls.json BEFORE the cells artifact is built ---
  const { yaml, path } = readWorkflow();
  const producer = controlsProducerStep(yaml);
  assert.ok(producer, `${path} declares no step running writeControls into cells/controls.json, so nothing produces the four rows`);
  const { jobName, job, steps, index, step } = producer;
  // The producer must live in the job that already moves this attempt's cells. A job of its own
  // would be cleaner, but `tests/sprint-01/run-02-hand.test.mjs` (T1's locked FLOW-RUN-02-HAND)
  // pins the workflow's job list to [download, drift, grade, smoke] and is outside this task's
  // write scope, so the rows ride the transfer that carries them.
  assert.equal(jobName, "download", `the producer runs in jobs.${jobName}; it must run where this attempt's cells are assembled`);
  assert.deepEqual(job.permissions, { contents: "read" }, `jobs.${jobName} must hold contents: read and nothing else`);
  assert.equal(/(secrets\s*(?:\.|\[))/.test(JSON.stringify(step)), false, "the controls producer must reference no secret");

  // The four rows land in `cells/` — the same dir the recorder reads — and they land there BEFORE
  // the cells artifact is uploaded, so the grade job never receives a cells dir without them.
  const uploadIndex = steps.findIndex((candidate) => isUploadOf(candidate, CELLS_ARTIFACT));
  assert.ok(uploadIndex > index, `the producer (step ${index}) must run before the ${CELLS_ARTIFACT} upload (step ${uploadIndex}), so controls.json ships with the cells`);
  assert.ok(
    steps.slice(0, index).some((candidate) => /actions\/download-artifact/.test(String(candidate?.uses ?? ""))),
    "the producer must run after this attempt's cells are downloaded into cells/",
  );
  assert.ok(
    stepsOf(yaml.jobs.grade).some((candidate) => isUploadOf(candidate, "harness-eval-result-")),
    "the grade job still publishes the attempt-qualified result",
  );

  // --- the producer really produces: run the workflow's own step body against the real module ---
  const scratch = sandbox(t);
  mkdirSync(join(scratch, "test/harness"), { recursive: true });
  symlinkSync(join(ROOT, "test/harness/controls"), join(scratch, "test/harness/controls"), "dir");
  execFileSync("/bin/sh", ["-c", String(step.run)], { cwd: scratch, stdio: "pipe", env: { ...process.env } });
  const produced = readCellArtifacts(join(scratch, "cells"));
  assert.equal(produced.controls.length, 4, "the producer wrote exactly four rows");
  assert.deepEqual(produced.controls.map((row) => row.control_id), [...CONTROL_IDS], "in T11's control order");
  assert.deepEqual(
    produced.controls.map((row) => `${row.verdict}/${row.reason}`),
    CONTROL_IDS.map(() => `could-not-run/${UNOBSERVABLE_REASON}`),
    "a run that observed nothing says so, and never invents a pass",
  );

  // --- the entry point: a cells dir with no controls.json is a refused run ---
  const { pins } = resultInputs();
  const env = {
    INSTALL_MODE: "checkout",
    GITHUB_RUN_ID: RUN,
    GITHUB_RUN_NUMBER: "1",
    GITHUB_RUN_ATTEMPT: ATTEMPT,
    GITHUB_EVENT_NAME: "workflow_dispatch",
    GITHUB_SHA: "a".repeat(40),
    GITHUB_REPOSITORY: "hackerpug-ai/pixel-perfect",
    GITHUB_REF_NAME: "main",
  };
  const jobs = await fetchStub();
  const noControlsOut = join(scratch, "grade-no-controls");
  const refused = await main({
    env: { ...env, HARNESS_EVAL_CELLS_DIR: writeCells(join(scratch, "cells-no-controls")), HARNESS_EVAL_VERIFY_DIR: join(scratch, "none"), HARNESS_EVAL_OUT_DIR: noControlsOut },
    fetchImpl: jobs,
  });
  assert.equal(refused, 1, "a run whose controls.json never arrived exits 1");
  assert.equal(existsIn(noControlsOut, "harness-eval-result.json"), false, "a refused run leaves no result behind");
  assert.ok(pins.pins_sha256.length === 64);

  // --- and a failure after the writes still leaves no result (F-T8-2's ordering, kept) ---
  const withControls = join(scratch, "cells-with-controls");
  downloadedCells(withControls);
  writeFileSync(join(withControls, "controls.json"), `${JSON.stringify(qualifyControls({}).rows)}\n`, "utf8");
  const summaryAsDir = join(scratch, "summary-is-a-directory");
  mkdirSync(summaryAsDir, { recursive: true });
  const crashOut = join(scratch, "grade-crash");
  const crashed = await main({
    env: { ...env, HARNESS_EVAL_CELLS_DIR: withControls, HARNESS_EVAL_VERIFY_DIR: join(scratch, "none"), HARNESS_EVAL_OUT_DIR: crashOut, GITHUB_STEP_SUMMARY: summaryAsDir },
    fetchImpl: jobs,
  });
  assert.equal(crashed, 1, "a throw after the result write exits 1");
  assert.equal(existsIn(crashOut, "harness-eval-result.json"), false, "and the written result is discarded, not left to read as a success");
});

test("controls-classification: the real cell/ upload layout classifies into exactly twelve cells with no refusal", async () => {
  const root = downloadedCells(join(mkdtempSync(join(tmpdir(), "t11-cells-")), "cells"));
  try {
    const artifacts = readCellArtifacts(root);
    const expected = HARNESSES.length * TRACKS.length;
    assert.equal(artifacts.cells.length, expected, `cells_classified = ${artifacts.cells.length}, expected_cells = ${expected}`);
    assert.equal(artifacts.controls.length, 0, "this attempt shipped no controls.json, so none is invented");

    // The recorder's own gate accepts the twelve cells: no stray reaches collectCells.
    const collected = collectCells(artifacts.cells, { pins: loadPins(), installMode: "checkout" });
    assert.equal(collected.length, expected);

    // The strays are still named, never dropped: each one is classified as itself.
    assert.equal(artifacts.controlEvidence.length, Object.keys(CONTROL_EVIDENCE).length, "every stray is accounted for");

    // ...and the upload that carried them no longer ships them.
    const { yaml } = readWorkflow();
    const uploads = stepsOf(yaml.jobs.smoke).filter((step) => /actions\/upload-artifact/.test(String(step?.uses ?? "")));
    assert.ok(uploads.length > 0, "the smoke job uploads its cell");
    for (const upload of uploads) {
      assert.equal(upload.with?.path, "cell/cell.json", `the smoke upload ships "${String(upload.with?.path)}", so strays still land under cells/`);
    }
  } finally {
    rmSync(dirname(root), { recursive: true, force: true });
  }
});

test("controls-refusal: an explicitly empty controls array is refused, and the schema bounds the array at four", () => {
  const inputs = resultInputs();
  assert.throws(
    () => assembleResult({ ...inputs, controls: [] }),
    (error) => error instanceof RecorderRefusal && error.reason === "controls-missing",
    "an explicitly empty controls array must be refused with controls-missing",
  );
  assert.throws(
    () => assembleResult({ ...inputs, controls: qualifyControls({}).rows.slice(0, 3) }),
    (error) => error instanceof RecorderRefusal,
    "three rows must be refused",
  );
  assert.throws(
    () => assembleResult({ ...inputs, controls: [...qualifyControls({}).rows, qualifyControls({}).rows[0]] }),
    (error) => error instanceof RecorderRefusal,
    "five rows must be refused",
  );

  // Four rows is the only accepted shape, and the record it produces validates.
  const result = assembleResult({ ...inputs, controls: qualifyControls({}).rows });
  assert.equal(result.controls.length, 4);
  const schema = JSON.parse(readFileSync(SCHEMA_FILE, "utf8"));
  assert.ok(schema.required.includes("controls"), "controls is required, so a record without it cannot validate");
  validateAgainst("harness-eval-result.v1.schema.json", result);
  validateResult(result, { dispatchSha: inputs.context.dispatchSha, requiredPinsSha256: inputs.pins.pins_sha256 });
  // shortcut: the shipped validator implements a JSON-Schema subset with no minItems/maxItems, so the
  // exactly-four rule is enforced by assertControlRows inside assembleResult; the schema bound is what
  // a full validator (and the hosted contract) reads. Upgrade when validate.mjs learns minItems.
});

test("controls-evidence-bucket: control evidence lands in its own bucket, and an unclassifiable record is still refused by name", async () => {
  const root = downloadedCells(join(mkdtempSync(join(tmpdir(), "t11-cells-")), "cells"));
  try {
    const artifacts = readCellArtifacts(root);
    const forms = artifacts.controlEvidence.map((entry) => `${entry.form}:${entry.file.split("/").pop()}`).sort();
    assert.deepEqual(forms, [
      "binding:binding.json",
      "capture:claude-code-verify.capture.json",
      "control-row:keyless-control.json",
    ]);
    const cellFiles = artifacts.cells.map((cell) => `${cell.harness}/${cell.track}`);
    assert.equal(cellFiles.includes("undefined/undefined"), false, "no stray was read as a cell");
    assert.equal(artifacts.controls.length, 0, "a per-cell keyless row never stands in for the four controls");

    // An unclassifiable record is a named refusal, never a silent omission.
    const strayLeg = join(root, `${PREFIX}-codex-pinned`);
    writeFileSync(join(strayLeg, "notes.json"), `${JSON.stringify({ note: "a truncated cell write" })}\n`, "utf8");
    assert.throws(
      () => readCellArtifacts(root),
      (error) => error instanceof RecorderRefusal && error.reason === "cell-unclassified" && /notes\.json/.test(String(error.details?.file)),
      "an unrecognised *.json must stop the run, naming the file",
    );
  } finally {
    rmSync(dirname(root), { recursive: true, force: true });
  }
});

test("controls-back-compat: a silent caller gets the four unobserved rows and a validating result", () => {
  const inputs = resultInputs();
  // Exactly how grd-01-twelve-cells.test.mjs:640 and run-02-hand.test.mjs:526,552 call it: no controls.
  const result = assembleResult({ cells: inputs.cells, pins: inputs.pins, context: inputs.context, timestamps: inputs.timestamps });
  assert.equal(result.controls.length, 4, "a silent caller must not receive an empty controls array");
  assert.deepEqual(result.controls.map((row) => row.control_id), [...CONTROL_IDS], "the four unobserved rows, in T11's order");
  for (const row of result.controls) {
    assert.equal(row.verdict, "could-not-run");
    assert.equal(row.reason, UNOBSERVABLE_REASON);
  }
  validateAgainst("harness-eval-result.v1.schema.json", result);
  assert.deepEqual(validateResult(result, { dispatchSha: inputs.context.dispatchSha, requiredPinsSha256: inputs.pins.pins_sha256 }), {
    cells: 12,
    harnesses: 6,
    pairs: 12,
  });
});

// The Actions API boundary for the entry-point legs: a pinned job payload, never a live call.
async function fetchStub() {
  const payload = HARNESSES.flatMap((harness) =>
    TRACKS.map((track) => ({
      name: `smoke ${harness} ${track}`,
      started_at: "2026-10-29T00:00:00Z",
      completed_at: "2026-10-29T00:01:00Z",
    })),
  );
  return async () => ({ ok: true, json: async () => ({ jobs: payload, total_count: payload.length }) });
}

function existsIn(dir, name) {
  try {
    readFileSync(join(dir, name));
    return true;
  } catch {
    return false;
  }
}
