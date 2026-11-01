// T17 — the product writes its own verify report, and the recorder receives it.
//
// The defect this file exists for: run 41249460968 graded `verify fail report-missing` on both
// claude-code cells. T16 declared the report's path, the invocation id it must echo and the body's
// ten keys — and declared them as PROSE appended after a slash command. The CLI delivers that text
// as the command's `$ARGUMENTS`, which the product's verify path never parsed, and the body's two
// load-bearing facts (`observed_verify_outcome`, `evidence.drifted_keys`) can only come from a
// catalog run. A permission rule admits a write at a path; it does not make a headless invocation
// perform one. So the fix is not a louder prompt: the product writes the report itself.
//
// What is REAL in this file:
//   * `plugins/pixel-perfect/scripts/verify-report.mjs`, executed as a process inside the
//     materialized kit project, so the body is what the product's own `verify-catalog.mjs` reported;
//   * the adapter's `prepareVerifyPair()`, so the path is the case manifest's, the id is what
//     `prepareRunDirs` minted, and `readVerifyReport`/`bindReport` are the production pass rule;
//   * the WORKFLOW'S OWN STEP BODIES — the attach step and the stage step are extracted from
//     `.github/workflows/harness-eval.yml` with the parser the locked flows use and executed with
//     `bash`, so what runs here is character-for-character what CI runs;
//   * the real `writeVerifyReceipt` and `uploadPlan` of the recorder;
//   * the six locked GRD/run-02 files and T16's owned file, run as real subprocesses, so a
//     neighbour's baseline is measured rather than restated.
//
// What is NOT here, and is said plainly: no model call and no dispatch. This host holds no
// harness-smoke binding, so no guarded `claude -p` runs here. This file proves the product's writer,
// its refusals, the binding rule, the carrier path and the shipping shape. The hosted receipt — a
// dispatched run whose pinned cell prints `verify pass` and whose bundle holds both reports — is the
// sprint gate's, not this file's.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import * as adapter from "../../test/harness/adapters/claude-code.mjs";
import { loadCase } from "../../test/harness/kit/case-loader.mjs";
import { sha256Hex } from "../../test/harness/pins.mjs";
import { uploadPlan, writeVerifyReceipt } from "../../test/harness/recorder.mjs";
import { readWorkflow } from "./flow-runner.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const PLUGIN_ROOT = join(ROOT, "plugins", "pixel-perfect");
const WRITER = join(PLUGIN_ROOT, "scripts", "verify-report.mjs");
const CATALOG = join(PLUGIN_ROOT, "scripts", "verify-catalog.mjs");
const ADAPTER_SOURCE = join(ROOT, "test/harness/adapters/claude-code.mjs");
const RUN = "41249460968";
const ATTEMPT = "1";

/** The tracked projection of the recorded twelve-cell artifact: read unconditionally, so the shape
 *  assertions are alive in a clean checkout where the git-ignored artifact is absent. */
const PROJECTION = join(ROOT, "test/harness/smoke/fixtures/dispatched-run/run-41157270388.cells.json");
/** The run this task repairs. Git-ignored, so its half of AC-3 is asserted only where it is on disk. */
const RECORDED_ARTIFACT = join(
  ROOT,
  ".kb-run-sprint/sprint-01-evaluator-evidence-spine/T16/hosted/run-41249460968/harness-eval-result-41249460968-1/grade/harness-eval-result.json",
);

const SIX_LOCKED = [
  "tests/sprint-01/grd-01-twelve-cells.test.mjs",
  "tests/sprint-01/grd-02-four-grades.test.mjs",
  "tests/sprint-01/grd-03-evidence.test.mjs",
  "tests/sprint-01/grd-04-named-path.test.mjs",
  "tests/sprint-01/grd-05-clean-twin.test.mjs",
  "tests/sprint-01/run-02-hand.test.mjs",
];
const T16_OWNED = ["tests/sprint-01/t16-claude-code-grades.test.mjs"];

function sandbox(t, label = "t17-") {
  const dir = mkdtempSync(join(tmpdir(), label));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

/**
 * The arguments the harness supplies, and nothing else: the case's own declared path, the id the
 * run minted, the case's identity, and (when a run publishes) the directory to copy the bytes to.
 * The body is never described here — the product computes it.
 */
function writerArgs({ side, publishDir = null, out = null, id = null }) {
  const args = [
    "--out",
    out ?? side.report_relative_path,
    "--invocation-id",
    id ?? side.invocation_id,
    "--case-id",
    side.case_id,
    "--harness",
    "claude-code",
    "--track",
    "pinned",
    "--platform",
    "web-desktop",
    "--project",
    ".",
    "--json",
  ];
  if (publishDir) args.push("--publish-dir", publishDir);
  return args;
}

/** Runs the product's writer as a process and reads the receipt it printed. */
function runWriter(cwd, args) {
  const result = spawnSync(process.execPath, [WRITER, ...args], { cwd, encoding: "utf8", timeout: 180_000 });
  const stdout = String(result.stdout ?? "");
  let receipt = null;
  try {
    receipt = JSON.parse(stdout.trim().split("\n").at(-1));
  } catch {
    receipt = null;
  }
  return { status: result.status, stdout, stderr: String(result.stderr ?? ""), receipt };
}

/** The product's own catalog check, run by this file, as the oracle for the body's observed facts. */
function runCatalog(cwd) {
  const result = spawnSync(process.execPath, [CATALOG, "--check", ".", "--platform", "web-desktop", "--json"], {
    cwd,
    encoding: "utf8",
    timeout: 180_000,
  });
  let report = null;
  try {
    report = JSON.parse(String(result.stdout ?? ""));
  } catch {
    report = null;
  }
  return { status: result.status, report };
}

const stepsOf = (job) => (Array.isArray(job?.steps) ? job.steps : []);
const nameOf = (step) => String(step?.name ?? "");
const runOf = (step) => String(step?.run ?? "");

/** Executes a workflow step's own `run:` body with bash, in a sandbox, exactly as CI would. */
function runBody(body, cwd, env = process.env) {
  return spawnSync("bash", ["-e"], { input: body, cwd, env, encoding: "utf8", timeout: 180_000 });
}

function stepNamed(yaml, job, name) {
  const step = stepsOf(yaml.jobs?.[job]).find((candidate) => nameOf(candidate) === name);
  assert.ok(step, `jobs.${job} has no step named ${JSON.stringify(name)}`);
  return step;
}

/** Runs one locked test file set and reads the TAP summary the reporter printed.
 *
 *  `NODE_TEST_CONTEXT` is cleared: this file is itself a `node --test` child, and Node refuses a
 *  nested test run that inherits it ("run() is being called recursively"), which would measure
 *  nothing and read as a silently empty baseline. */
function runLockedTests(files) {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const result = spawnSync(process.execPath, ["--test", "--test-reporter=tap", ...files], {
    cwd: ROOT,
    env,
    encoding: "utf8",
    timeout: 600_000,
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  const count = (label) => {
    const found = output.match(new RegExp(`^# ${label} (\\d+)$`, "m"));
    return found ? Number(found[1]) : null;
  };
  return { status: result.status, tests: count("tests"), pass: count("pass"), fail: count("fail"), output };
}

// ---------------------------------------------------------------------------
// TC-1 — the body is the declared contract, computed by the catalog check rather than typed
// ---------------------------------------------------------------------------

test("t17-report-body-contract", (t) => {
  const pair = adapter.prepareVerifyPair({ runId: "t17-tc1", track: "pinned" });
  t.after(() => pair.cleanup());
  const publishDir = join(sandbox(t, "t17-tc1-publish-"), "verify-upload");

  const declared = [...new Set(adapter.VERIFY_REPORT_CONTRACT.fields.map((field) => field.split(".")[0]))];
  assert.equal(declared.length, 10, `the declared contract names ${declared.join(", ")}`);

  for (const [slot, side, expectedOutcome] of [
    ["planted", pair.planted, "defect-detected"],
    ["clean", pair.clean, "clean"],
  ]) {
    // The oracle first, in the same directory the writer runs in: the body below is compared with
    // the product's own output rather than with anything the case manifest expects.
    const oracle = runCatalog(side.dir);
    const drifted = (oracle.report?.drifted ?? []).map((entry) => entry.key);

    const run = runWriter(side.dir, writerArgs({ side, publishDir }));
    assert.equal(run.status, 0, `${slot}: the writer exited ${run.status}: ${run.stderr}`);
    assert.equal(run.receipt?.ok, true, `${slot}: the writer printed ${run.stdout}`);
    assert.ok(existsSync(side.bound_path), `${slot}: no report at the case-declared path`);

    const body = JSON.parse(readFileSync(side.bound_path, "utf8"));
    assert.deepEqual(Object.keys(body).sort(), [...declared].sort(), `${slot}: the body's key set is the declared contract`);
    assert.deepEqual(Object.keys(body.evidence), ["drifted_keys"], `${slot}: evidence holds exactly drifted_keys`);
    assert.equal(body.schema, "verify-report/v1", `${slot}: schema`);
    assert.equal(body.harness, "claude-code", `${slot}: harness is the argument's value`);
    assert.equal(body.track, "pinned", `${slot}: track is the argument's value`);
    assert.equal(body.invocation_id, side.invocation_id, `${slot}: the id is the argument, character for character`);
    assert.equal(body.case_id, side.case_id, `${slot}: case id is the argument's value`);
    assert.deepEqual(body.evidence.drifted_keys, drifted, `${slot}: the drifted list is the catalog check's own`);
    assert.equal(body.observed_verify_outcome, expectedOutcome, `${slot}: the outcome comes from the check`);
    // "any failure at all" is the check's own exit, not this file's opinion.
    assert.equal(body.clean_project_failed, oracle.status !== 0, `${slot}: clean_project_failed is the check's exit`);
    assert.equal(body.observed_defect_key, drifted[0] ?? null, `${slot}: observed key is the first reported drift`);
    assert.equal(body.expected_defect_key, drifted[0] ?? null, `${slot}: expected key is the key the check reported`);

    const published = join(publishDir, side.report_relative_path);
    assert.ok(existsSync(published), `${slot}: nothing was published`);
    assert.equal(sha256Hex(readFileSync(published)), sha256Hex(readFileSync(side.bound_path)), `${slot}: the published copy is the graded bytes`);
    assert.equal(run.receipt.out.sha256, sha256Hex(readFileSync(side.bound_path)), `${slot}: the receipt's digest is the file's`);
    assert.equal(run.receipt.publish.sha256, run.receipt.out.sha256, `${slot}: both copies share one digest`);
    assert.equal(run.receipt.drifted_keys.length, drifted.length, `${slot}: the receipt reports the drifted list`);
  }

  // The oracle really disagrees between the sides, so the two outcomes above are two measurements.
  assert.equal(runCatalog(pair.planted.dir).status, 1, "the planted kit is not clean");
  assert.equal(runCatalog(pair.clean.dir).status, 0, "the clean twin is clean");
});

// ---------------------------------------------------------------------------
// TC-2 — the writer refuses what it cannot bind or honestly write
// ---------------------------------------------------------------------------

test("t17-writer-refuses-unbindable", (t) => {
  const dirs = adapter.prepareRunDirs({ runId: "t17-tc2", track: "pinned" });
  t.after(() => dirs.cleanup());
  const prepared = dirs.for("verify-button-drift");
  const side = {
    case_id: "verify-button-drift",
    invocation_id: prepared.invocation_id,
    dir: prepared.dir,
    bound_path: prepared.bound_path,
    report_relative_path: "reports/verify-button-drift.json",
  };
  const scratch = sandbox(t, "t17-tc2-scratch-");

  const refuse = ({ label, args, reason }) => {
    const before = readdirSync(side.dir).sort();
    const run = runWriter(side.dir, args);
    assert.equal(run.status, 3, `${label}: expected exit 3, got ${run.status}: ${run.stderr}`);
    assert.equal(run.receipt?.ok, false, `${label}: the refusal is one JSON line: ${JSON.stringify(run.stdout)}`);
    assert.equal(run.receipt.reason, reason, `${label}: refused for ${run.receipt.reason}`);
    assert.notEqual(run.receipt.detail, undefined, `${label}: the refusal names its detail`);
    assert.deepEqual(readdirSync(side.dir).sort(), before, `${label}: a refusal created something`);
    assert.equal(existsSync(side.bound_path), false, `${label}: a refused run graded a file`);
    return run;
  };

  // No id, an empty id and a whitespace id: an unbound body cannot exist.
  const withId = writerArgs({ side });
  const idPosition = withId.indexOf("--invocation-id");
  const withoutId = [...withId.slice(0, idPosition), ...withId.slice(idPosition + 2)];
  for (const [label, args] of [
    ["no id", withoutId],
    ["empty id", writerArgs({ side, id: "" })],
    ["whitespace id", writerArgs({ side, id: "   " })],
  ]) {
    refuse({ label, args, reason: "report-invocation-id-missing" });
  }
  assert.equal(existsSync(join(side.dir, "reports")), false, "the missing-id runs created no directory at all");

  // A path that could leave the invocation directory is refused, and nothing lands outside it.
  const absoluteOut = join(scratch, "abs.json");
  refuse({ label: "absolute out", args: writerArgs({ side, out: absoluteOut }), reason: "report-out-not-relative" });
  assert.equal(existsSync(absoluteOut), false, "an absolute --out was written");
  refuse({ label: "traversal out", args: writerArgs({ side, out: "../escape.json" }), reason: "report-out-not-relative" });
  assert.equal(existsSync(join(dirname(side.dir), "escape.json")), false, "a traversing --out escaped the invocation directory");
  refuse({ label: "not json", args: writerArgs({ side, out: "reports/notjson" }), reason: "report-out-not-json" });

  // A publish directory that is not absolute is a refusal, not a silent skip of the graded write.
  const relativePublish = runWriter(side.dir, [...writerArgs({ side }), "--publish-dir", join("cell", "verify-upload")]);
  assert.equal(relativePublish.status, 3, `a relative --publish-dir exited ${relativePublish.status}`);
  assert.equal(relativePublish.receipt?.reason, "publish-dir-not-absolute");
  assert.equal(existsSync(side.bound_path), false, "a refused publish still wrote the graded report");

  // An unknown flag is a usage error (2), never a silent extra option.
  const unknown = runWriter(side.dir, [...writerArgs({ side }), "--overwrite-everything"]);
  assert.equal(unknown.status, 2, `an unknown flag exited ${unknown.status}`);

  // A project the product's own check cannot read is a refusal, not an invented body.
  refuse({
    label: "unreadable catalog",
    args: [...writerArgs({ side }), "--project", join(scratch, "no-such-project")],
    reason: "catalog-check-unreadable",
  });

  // Two valid runs over the same path: the second rewrites atomically and leaves no partial file.
  for (const pass of [1, 2]) {
    const run = runWriter(side.dir, writerArgs({ side }));
    assert.equal(run.status, 0, `pass ${pass}: the writer exited ${run.status}: ${run.stderr}`);
    assert.equal(run.receipt.ok, true, `pass ${pass}: ${run.stdout}`);
  }
  const body = JSON.parse(readFileSync(side.bound_path, "utf8"));
  assert.equal(body.observed_verify_outcome, "defect-detected", "a detected defect is a successful report");
  assert.equal(body.invocation_id, side.invocation_id);
  const reportsListing = readdirSync(join(side.dir, "reports")).sort();
  assert.deepEqual(reportsListing, ["verify-button-drift.json"], `the reports directory holds ${reportsListing.join(", ")}`);

  // `--report` is the same input under the name the product's slash command documents, so the
  // argument pair the harness appends can be passed straight through.
  const synonym = runWriter(
    side.dir,
    writerArgs({ side }).map((arg) => (arg === "--out" ? "--report" : arg)),
  );
  assert.equal(synonym.status, 0, `--report exited ${synonym.status}: ${synonym.stderr}`);
  assert.equal(JSON.parse(readFileSync(side.bound_path, "utf8")).invocation_id, side.invocation_id);
});

// ---------------------------------------------------------------------------
// TC-3 — the path and the id are parsed arguments, and the harness writes nothing
// ---------------------------------------------------------------------------

test("t17-prompt-carries-path-and-id", (t) => {
  const pair = adapter.prepareVerifyPair({ runId: "t17-tc3", track: "pinned" });
  t.after(() => pair.cleanup());
  const planted = pair.planted.entry;
  const clean = pair.clean.entry;

  // The command stays first: the graded invocation still exercises the product's own command.
  assert.ok(
    planted.prompt.startsWith("/pixel-perfect:verify --platform web-desktop"),
    `the invocation is still the product's command: ${planted.prompt.slice(0, 160)}`,
  );
  assert.ok(planted.prompt.includes("--report reports/verify-button-drift.json"), "the planted path is a parsed argument");
  assert.ok(planted.prompt.includes(`--invocation-id ${pair.planted.invocation_id}`), "the planted id is a parsed argument");
  assert.ok(clean.prompt.includes("--report reports/verify-clean.json"), "the clean path is a parsed argument");
  assert.ok(clean.prompt.includes(`--invocation-id ${pair.clean.invocation_id}`), "the clean id is a parsed argument");
  assert.equal(planted.prompt.includes("reports/verify-clean.json"), false, "each entry names only its own path");
  assert.notEqual(pair.planted.invocation_id, pair.clean.invocation_id, "the two entries carry different ids");

  // T16's declared surface survives, unchanged, after the arguments.
  for (const field of adapter.VERIFY_REPORT_CONTRACT.fields) {
    assert.ok(planted.prompt.includes(field), `the prompt still declares ${field}`);
  }
  for (const [slot, prompt] of [
    ["planted", planted.prompt],
    ["clean", clean.prompt],
  ]) {
    assert.doesNotMatch(prompt, /atoms\/Button\/default/, `${slot}: the prompt states the defect key`);
    assert.doesNotMatch(prompt, /[0-9a-f]{64}/, `${slot}: the prompt carries a digest`);
    assert.doesNotMatch(prompt, /offset/i, `${slot}: the prompt carries a byte offset`);
  }

  // Every field name, argument pairs and no value: a model reading it still has to run the check.
  // Nothing covers a case that declares no report path.
  assert.equal(adapter.verifyReportPrompt({ caseManifest: loadCase("status-a"), invocationId: "x" }), "");
  // T18 deliberately opens the promise this pair used to pin: the question probe's prompt is now the
  // command PLUS the one declared question surface, so it still begins with the command and is no
  // longer the bare command alone.
  const questionPrompt = adapter.promptFor({ command_name: "init", caseManifest: loadCase("first-question-init") });
  assert.ok(questionPrompt.startsWith("/pixel-perfect:init"), "the question probe's prompt still begins with the command");
  assert.notEqual(questionPrompt, "/pixel-perfect:init", "the question probe's prompt is no longer the bare command alone");

  // The harness composes arguments and holds no writer.
  const source = readFileSync(ADAPTER_SOURCE, "utf8");
  assert.equal(source.includes("writeVerifyReport"), false, "the adapter calls a report writer");
  assert.equal((source.match(/reports\//g) ?? []).length, 0, "the adapter spells a reports/ path of its own");
  assert.equal(source.includes("verify-report.mjs"), false, "the adapter imports the writer");

  // With no report written, the grade is still `fail report-missing`: no fallback, no could-not-run.
  const missing = adapter.readVerifyReport({ entry: planted });
  assert.equal(missing.ok, false, "an absent report graded ok");
  assert.equal(missing.verdict, "fail");
  assert.equal(missing.reason, "report-missing");
});

// ---------------------------------------------------------------------------
// AC-1 — the product writes the report, bound to the id it was given
// ---------------------------------------------------------------------------

test("t17-product-writes-report", (t) => {
  const pair = adapter.prepareVerifyPair({ runId: "t17-ac1", track: "pinned" });
  t.after(() => pair.cleanup());
  const publishDir = join(sandbox(t, "t17-ac1-publish-"), "cell", "verify-upload");

  // --- the planted kit: the product's own check reports the drift it was planted with ----------
  const planted = runWriter(pair.planted.dir, writerArgs({ side: pair.planted, publishDir }));
  assert.equal(planted.status, 0, `the writer exited ${planted.status}: ${planted.stderr}`);
  assert.equal(planted.receipt?.ok, true, `the writer printed ${planted.stdout}`);
  assert.equal(planted.receipt.outcome, "defect-detected");

  const plantedBody = JSON.parse(readFileSync(pair.planted.bound_path, "utf8"));
  assert.equal(Object.keys(plantedBody).length, 10, `the body carries ${Object.keys(plantedBody).length} keys`);
  assert.equal(plantedBody.schema, "verify-report/v1");
  assert.equal(plantedBody.invocation_id, pair.planted.invocation_id, "the body echoes the minted id verbatim");
  assert.equal(plantedBody.observed_verify_outcome, "defect-detected");
  assert.ok(plantedBody.evidence.drifted_keys.includes("atoms/Button/default"), `the drift is named: ${JSON.stringify(plantedBody.evidence)}`);
  assert.equal(plantedBody.clean_project_failed, true, "a drifting project is a failed check");

  // The published copy is the same bytes: the graded file stays inside the invocation directory.
  const publishedPlanted = join(publishDir, pair.planted.report_relative_path);
  assert.equal(sha256Hex(readFileSync(publishedPlanted)), sha256Hex(readFileSync(pair.planted.bound_path)));

  const plantedGrade = adapter.readVerifyReport({ entry: pair.planted.entry });
  assert.equal(plantedGrade.ok, true, `the real reader refused the product's own report: ${JSON.stringify(plantedGrade)}`);
  assert.equal(plantedGrade.reason ?? null, null, "the read produced a reason, so the report was not accepted");
  assert.equal(plantedGrade.observed_verify_outcome, "defect-detected");
  // The pass rule itself, called with the body the product wrote: a bound body is `ok` with no
  // verdict and no reason. `readVerifyReport`'s pass shape carries no `verdict` field — the grade
  // path in `gradeCheck` is what renders the null verdict — so the rule is read where it lives.
  assert.deepEqual(adapter.bindReport({ invocation: pair.planted.entry, reported: plantedBody }), { ok: true, verdict: null, reason: null });

  // --- the untouched twin ----------------------------------------------------------------------
  const clean = runWriter(pair.clean.dir, writerArgs({ side: pair.clean, publishDir }));
  assert.equal(clean.status, 0, `the writer exited ${clean.status}: ${clean.stderr}`);
  assert.equal(clean.receipt.outcome, "clean");

  const cleanBody = JSON.parse(readFileSync(pair.clean.bound_path, "utf8"));
  assert.equal(cleanBody.observed_verify_outcome, "clean", "the clean twin is not reported defective");
  assert.deepEqual(cleanBody.evidence.drifted_keys, [], "the clean twin reports no drift");
  assert.equal(cleanBody.observed_defect_key, null);
  assert.equal(cleanBody.clean_project_failed, false, "a clean project is not a failed check");

  const cleanGrade = adapter.readVerifyReport({ entry: pair.clean.entry });
  assert.equal(cleanGrade.ok, true, `the real reader refused the clean twin's report: ${JSON.stringify(cleanGrade)}`);
  assert.equal(cleanGrade.reason ?? null, null, "the clean twin's report was refused");
  assert.equal(cleanGrade.observed_verify_outcome, "clean");
  assert.deepEqual(adapter.bindReport({ invocation: pair.clean.entry, reported: cleanBody }), { ok: true, verdict: null, reason: null });

  for (const [slot, grade] of [
    ["planted", plantedGrade],
    ["clean", cleanGrade],
  ]) {
    assert.notEqual(grade.reason, "report-missing", `${slot} read report-missing, which is the defect this task repairs`);
  }

  // --- a body borrowed from the other invocation is refused by the binding ---------------------
  const borrowed = { ...plantedBody, invocation_id: pair.clean.invocation_id };
  writeFileSync(pair.planted.bound_path, `${JSON.stringify(borrowed, null, 2)}\n`, "utf8");
  const borrowedGrade = adapter.readVerifyReport({ entry: pair.planted.entry });
  assert.equal(borrowedGrade.ok, false, "a borrowed body passed");
  assert.equal(borrowedGrade.verdict, "fail");
  assert.equal(borrowedGrade.reason, "report-mismatched-invocation");
  assert.equal(borrowedGrade.detail.expected, pair.planted.invocation_id, "the refusal names the id it expected");
  assert.equal(borrowedGrade.detail.seen, pair.clean.invocation_id, "the refusal names the id it saw");
});

// ---------------------------------------------------------------------------
// AC-2 — the report's bytes reach the recorder's bundle at the path step 8 reads
// ---------------------------------------------------------------------------

test("t17-report-reaches-recorder", (t) => {
  const pair = adapter.prepareVerifyPair({ runId: "t17-ac2", track: "pinned" });
  t.after(() => pair.cleanup());
  const work = sandbox(t, "t17-ac2-");
  const publishDir = join(work, "cell", "verify-upload");

  const receipts = [];
  for (const side of [pair.planted, pair.clean]) {
    const run = runWriter(side.dir, writerArgs({ side, publishDir }));
    assert.equal(run.status, 0, `${side.case_id}: the writer exited ${run.status}: ${run.stderr}`);
    receipts.push({ relative: side.report_relative_path, sha256: run.receipt.out.sha256, bytes: run.receipt.out.bytes });
  }

  // The layout the grade job stages: the published bytes at the case-declared relative path.
  const verifyDir = join(work, "verify-reports");
  for (const receipt of receipts) {
    const destination = join(verifyDir, receipt.relative);
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(join(publishDir, receipt.relative), destination);
  }

  const outDir = join(work, "grade");
  const index = writeVerifyReceipt({ outDir, verifyDir });
  assert.deepEqual(
    index.reports.map((entry) => entry.path).sort(),
    ["reports/verify-button-drift.json", "reports/verify-clean.json"],
    `the bundle holds ${index.reports.map((entry) => entry.path).join(", ")}`,
  );
  assert.equal(index.reason, null, `the index names a reason: ${index.reason}`);
  for (const receipt of receipts) {
    const entry = index.reports.find((report) => report.path === receipt.relative);
    assert.ok(entry, `${receipt.relative} is absent from the index`);
    assert.equal(entry.sha256, receipt.sha256, `${receipt.relative}: the bundled digest is the writer's receipt`);
    assert.equal(entry.bytes, receipt.bytes, `${receipt.relative}: the bundled size is the writer's receipt`);
    const bundled = join(outDir, "verify-reports", receipt.relative);
    assert.ok(existsSync(bundled), `${receipt.relative} never reached the bundle`);
    assert.equal(sha256Hex(readFileSync(bundled)), receipt.sha256, `${receipt.relative}: the bundled bytes are the graded bytes`);
  }

  // With nothing present the index names the directory it looked in instead of inventing a report.
  const emptyVerifyDir = join(work, "verify-reports-empty");
  const emptyIndex = writeVerifyReceipt({ outDir: join(work, "grade-empty"), verifyDir: emptyVerifyDir });
  assert.deepEqual(emptyIndex.reports, [], "an empty bundle invented a report entry");
  assert.match(String(emptyIndex.reason), /no verify report artifact arrived/, `the reason reads ${emptyIndex.reason}`);
  assert.ok(String(emptyIndex.reason).includes(emptyVerifyDir), `the reason does not name the directory it looked in: ${emptyIndex.reason}`);
  assert.deepEqual(readdirSync(join(work, "grade-empty", "verify-reports")), ["INDEX.json"], "a file was fabricated for an empty bundle");
});

// ---------------------------------------------------------------------------
// TC-4 — the published bytes reach the bundle shape the download and step 8 read
// ---------------------------------------------------------------------------

test("t17-upload-shape-matches-download", (t) => {
  const { text, yaml } = readWorkflow();

  // The only file a smoke cell may ship is its own record: no second upload, no fifth job.
  const smokeUploads = stepsOf(yaml.jobs.smoke).filter((step) => /actions\/upload-artifact/.test(String(step?.uses ?? "")));
  assert.equal(smokeUploads.length, 1, `jobs.smoke carries ${smokeUploads.length} upload steps`);
  for (const upload of smokeUploads) {
    assert.equal(upload.with?.path, "cell/cell.json", `a smoke upload ships "${String(upload.with?.path)}"`);
  }
  assert.deepEqual(Object.keys(yaml.jobs).sort(), ["download", "drift", "grade", "smoke"], "the job list changed");

  // The grade job's verify download keeps the per-cell shape and tolerates an empty match.
  const verifyDownload = stepsOf(yaml.jobs.grade).find(
    (step) => /actions\/download-artifact/.test(String(step?.uses ?? "")) && String(step?.with?.pattern ?? "").startsWith("harness-eval-verify-"),
  );
  assert.ok(verifyDownload, "the grade job never fetches a verify report");
  assert.equal(verifyDownload.with?.pattern, "harness-eval-verify-*", "the download's pattern changed");
  assert.equal(String(verifyDownload["continue-on-error"]), "true", "an attempt with no report must still reach the recorder");

  // The bundle name is the recorder's own, not a spelling of the workflow's.
  const plan = uploadPlan({ runId: RUN, attempt: Number(ATTEMPT) });
  const plannedBundle = plan.find((entry) => entry.logical === "harness-eval-verify-reports");
  assert.equal(plannedBundle?.name, `harness-eval-verify-reports-${RUN}-${ATTEMPT}`, `uploadPlan names ${plannedBundle?.name}`);
  const bundleUpload = stepsOf(yaml.jobs.grade)
    .filter((step) => /actions\/upload-artifact/.test(String(step?.uses ?? "")))
    .find((step) => String(step?.with?.name ?? "").startsWith("harness-eval-verify-reports-"));
  assert.ok(bundleUpload, "the grade job never uploads the verify bundle");
  const resolvedName = String(bundleUpload.with.name).replace("${{ github.run_id }}", RUN).replace("${{ github.run_attempt }}", ATTEMPT);
  assert.equal(resolvedName, plannedBundle.name, `the workflow publishes ${resolvedName}, the recorder plans ${plannedBundle.name}`);
  assert.equal(bundleUpload.with?.path, "grade/verify-reports", `the bundle ships "${String(bundleUpload.with?.path)}"`);

  // --- the cell ships the bytes: the attach step, executed as CI executes it -------------------
  const pair = adapter.prepareVerifyPair({ runId: "t17-tc4", track: "pinned" });
  t.after(() => pair.cleanup());
  const cellWork = sandbox(t, "t17-tc4-cell-");
  const publishDir = join(cellWork, "cell", "verify-upload");
  const receipts = new Map();
  for (const side of [pair.planted, pair.clean]) {
    const run = runWriter(side.dir, writerArgs({ side, publishDir }));
    assert.equal(run.status, 0, `${side.case_id}: the writer exited ${run.status}: ${run.stderr}`);
    receipts.set(side.report_relative_path, { sha256: run.receipt.out.sha256, bytes: run.receipt.out.bytes });
  }

  const record = {
    harness: "claude-code",
    track: "pinned",
    cell_state: "graded",
    reason: null,
    install_mode: "checkout",
    event: "workflow_dispatch",
    run_id: RUN,
    run_attempt: ATTEMPT,
  };
  const cellFile = join(cellWork, "cell", "cell.json");
  writeFileSync(cellFile, `${JSON.stringify(record)}\n`, "utf8");

  const attachStep = stepNamed(yaml, "smoke", "Attach this cell's verify reports");
  assert.match(String(attachStep.if ?? ""), /always\(\)/, "the attach step does not run on a failed leg");
  assert.match(String(attachStep.if ?? ""), /claude-code/, "the attach step is not scoped to the harness that writes reports");
  // It must not become the recorder's first match for the cell-record path (T13's locked rule).
  assert.equal(/cell\/cell\.json/.test(runOf(attachStep)), false, "the attach step spells the cell-record path");

  const attached = runBody(runOf(attachStep), cellWork);
  assert.equal(attached.status, 0, `the attach step exited ${attached.status}: ${attached.stderr}`);
  const carried = JSON.parse(readFileSync(cellFile, "utf8"));
  assert.deepEqual(
    carried.verify_reports.map((entry) => entry.path).sort(),
    ["reports/verify-button-drift.json", "reports/verify-clean.json"],
    `the cell carries ${JSON.stringify(carried.verify_reports?.map((entry) => entry.path))}`,
  );
  for (const entry of carried.verify_reports) {
    const receipt = receipts.get(entry.path);
    assert.ok(receipt, `${entry.path} is not a report the writer produced`);
    assert.equal(entry.sha256, receipt.sha256, `${entry.path}: the carried digest is the writer's receipt`);
    assert.equal(entry.bytes, receipt.bytes, `${entry.path}: the carried size is the writer's receipt`);
    assert.equal(typeof entry.body, "string", `${entry.path}: the body is carried as text, so the bytes survive the round trip`);
  }
  for (const key of Object.keys(record)) assert.equal(carried[key], record[key], `the attach step rewrote ${key}`);

  // No report published: the record is left exactly as the leg wrote it.
  const bareWork = sandbox(t, "t17-tc4-bare-");
  const bareFile = join(bareWork, "cell", "cell.json");
  mkdirSync(dirname(bareFile), { recursive: true });
  writeFileSync(bareFile, `${JSON.stringify(record)}\n`, "utf8");
  const bare = runBody(runOf(attachStep), bareWork);
  assert.equal(bare.status, 0, `the attach step exited ${bare.status}: ${bare.stderr}`);
  assert.equal(readFileSync(bareFile, "utf8"), `${JSON.stringify(record)}\n`, "a leg with no report had its record rewritten");

  // --- the stage step, executed as CI executes it ---------------------------------------------
  const stageStep = stepNamed(yaml, "grade", "Stage the verify reports");
  const stageWork = sandbox(t, "t17-tc4-stage-");
  const cellsRoot = join(stageWork, "cells");
  mkdirSync(join(cellsRoot, `harness-eval-cell-${RUN}-${ATTEMPT}-claude-code-pinned`), { recursive: true });
  writeFileSync(
    join(cellsRoot, `harness-eval-cell-${RUN}-${ATTEMPT}-claude-code-pinned`, "cell.json"),
    `${JSON.stringify(carried)}\n`,
    "utf8",
  );
  // A cell on another (harness, track) carries its report into its own region, so no two cells can
  // overwrite each other. The bytes are the product's: the clean body the writer published.
  const otherCell = {
    harness: "codex",
    track: "newest",
    cell_state: "could-not-run",
    reason: "codex-adapter-not-implemented",
    verify_reports: [
      {
        path: "reports/verify-clean.json",
        bytes: receipts.get("reports/verify-clean.json").bytes,
        sha256: receipts.get("reports/verify-clean.json").sha256,
        body: readFileSync(join(publishDir, "reports", "verify-clean.json"), "utf8"),
      },
    ],
  };
  mkdirSync(join(cellsRoot, `harness-eval-cell-${RUN}-${ATTEMPT}-codex-newest`), { recursive: true });
  writeFileSync(
    join(cellsRoot, `harness-eval-cell-${RUN}-${ATTEMPT}-codex-newest`, "cell.json"),
    `${JSON.stringify(otherCell)}\n`,
    "utf8",
  );
  // A previous attempt's bundle lands inside the download's own directory; it is not this
  // attempt's report and must not be re-bundled as one.
  const foreignDir = join(stageWork, "verify-reports", `harness-eval-verify-reports-${RUN}-${ATTEMPT}`);
  mkdirSync(join(foreignDir, "reports"), { recursive: true });
  writeFileSync(join(foreignDir, "reports", "verify-clean.json"), '{"stale":true}\n', "utf8");

  const staged = runBody(runOf(stageStep), stageWork);
  assert.equal(staged.status, 0, `the stage step exited ${staged.status}: ${staged.stderr}`);
  const stagedPlanted = join(stageWork, "verify-reports", "reports", "verify-button-drift.json");
  assert.ok(existsSync(stagedPlanted), "the pinned claude-code cell's report was not staged at reports/");
  assert.equal(sha256Hex(readFileSync(stagedPlanted)), receipts.get("reports/verify-button-drift.json").sha256, "the staged bytes are the published bytes");
  assert.ok(existsSync(join(stageWork, "verify-reports", "reports", "verify-clean.json")), "the pinned cell's second report is missing");
  assert.ok(existsSync(join(stageWork, "verify-reports", "codex-newest", "reports", "verify-clean.json")), "another harness/track did not get its own region");
  assert.equal(existsSync(foreignDir), false, "a foreign harness-eval-verify-reports- directory was re-bundled");
  assert.equal(readFileSync(join(stageWork, "verify-reports", "codex-newest", "reports", "verify-clean.json"), "utf8").includes("stale"), false);

  // The recorder reads the staged layout at the path gate step 8 downloads.
  const stagedIndex = writeVerifyReceipt({ outDir: join(stageWork, "grade"), verifyDir: join(stageWork, "verify-reports") });
  const stagedEntry = stagedIndex.reports.find((entry) => entry.path === "reports/verify-button-drift.json");
  assert.ok(stagedEntry, `the staged bundle holds ${stagedIndex.reports.map((entry) => entry.path).join(", ")}`);
  assert.equal(stagedEntry.sha256, receipts.get("reports/verify-button-drift.json").sha256);

  // A corrupted carrier is named, not graded as a product failure.
  const corruptWork = sandbox(t, "t17-tc4-corrupt-");
  const corruptCells = join(corruptWork, "cells");
  mkdirSync(join(corruptCells, `harness-eval-cell-${RUN}-${ATTEMPT}-claude-code-pinned`), { recursive: true });
  const tampered = {
    ...carried,
    verify_reports: carried.verify_reports.map((entry) =>
      entry.path === "reports/verify-button-drift.json" ? { ...entry, body: `${entry.body}\n` } : entry,
    ),
  };
  writeFileSync(
    join(corruptCells, `harness-eval-cell-${RUN}-${ATTEMPT}-claude-code-pinned`, "cell.json"),
    `${JSON.stringify(tampered)}\n`,
    "utf8",
  );
  const corrupt = runBody(runOf(stageStep), corruptWork);
  assert.equal(corrupt.status, 1, `a digest mismatch exited ${corrupt.status}`);
  assert.match(`${corrupt.stdout}${corrupt.stderr}`, /verify-button-drift\.json/, "the mismatch does not name the file");
  assert.equal(
    existsSync(join(corruptWork, "verify-reports", "reports", "verify-button-drift.json")),
    false,
    "a report whose digest did not match was left on disk to be graded",
  );
  assert.equal(
    existsSync(join(corruptWork, "verify-reports", "reports", "verify-clean.json")),
    true,
    "the intact report beside the corrupt one was not staged",
  );
  assert.match(text, /Stage the verify reports/, "the workflow no longer declares the staging step");
});

// ---------------------------------------------------------------------------
// AC-3 — four checks, five invocations, twelve cells, and every neighbour holds still
// ---------------------------------------------------------------------------

test("t17-cell-shape-and-neighbours", (t) => {
  // The owned file's first assertion, and the RED half: before the fix the product has no writer.
  assert.ok(existsSync(WRITER), "plugins/pixel-perfect/scripts/verify-report.mjs does not exist, so no product writes the report");

  assert.deepEqual(adapter.CHECKS, ["command_list", "status", "verify", "question_before_expensive_work"], "the four check ids changed");

  const dirs = adapter.prepareRunDirs({ runId: "t17-ac3", track: "pinned" });
  t.after(() => dirs.cleanup());
  const table = adapter.invocationTable({ track: "pinned", dirs, pluginRoot: PLUGIN_ROOT });
  assert.equal(table.length, 5, `the table holds ${table.length} entries`);
  assert.equal(new Set(table.map((entry) => entry.check_id)).size, 4, "a fifth check id appeared");
  assert.deepEqual(table.map((entry) => entry.check_id), ["command_list", "status", "verify", "verify", "question_before_expensive_work"]);

  // The recorded twelve cells, from the tracked projection, unconditionally.
  const projection = JSON.parse(readFileSync(PROJECTION, "utf8"));
  const recorded = projection.cells;
  assert.equal(recorded.length, 12, `the recorded run holds ${recorded.length} cells`);
  assert.equal(new Set(recorded.map((cell) => `${cell.harness}/${cell.track}`)).size, 12, "the cells are not unique");
  const outside = recorded.filter((cell) => cell.harness !== adapter.HARNESS);
  assert.equal(outside.length, 10, `ten cells outside claude-code, found ${outside.length}`);
  assert.ok(outside.every((cell) => typeof cell.reason === "string" && cell.reason.length > 0), "a neighbour lost its named reason");
  assert.deepEqual([...new Set(outside.map((cell) => cell.reason))].sort(), [
    "codex-adapter-not-implemented",
    "grok-adapter-not-implemented",
    "missing-api-key",
    "opencode-adapter-not-implemented",
    "pi-adapter-not-implemented",
  ]);
  assert.equal(recorded.filter((cell) => cell.harness === adapter.HARNESS).length, 2);

  // The run this task repairs, where its artifact is on disk: twelve cells, and the pinned cell's
  // `status` still reads pass beside the `verify` failure this task removes.
  if (existsSync(RECORDED_ARTIFACT)) {
    const artifact = JSON.parse(readFileSync(RECORDED_ARTIFACT, "utf8"));
    assert.equal(artifact.cells.length, 12, "the recorded artifact lost a cell");
    assert.equal(new Set(artifact.cells.map((cell) => `${cell.harness}/${cell.track}`)).size, 12, "the artifact's cells are not unique");
    const pinned = artifact.cells.find((cell) => cell.harness === adapter.HARNESS && cell.track === "pinned");
    assert.ok(pinned, "the recorded artifact holds no pinned claude-code cell");
    const status = (pinned.checks ?? []).find((check) => check.check_id === "status");
    assert.equal(status?.verdict, "pass", `the pinned cell's status reads ${status?.verdict}`);
  }

  // Every locked neighbour, measured as a real subprocess rather than restated.
  const six = runLockedTests(SIX_LOCKED);
  assert.equal(six.pass, 76, `the six locked files report pass ${six.pass}, fail ${six.fail}: ${six.output.slice(-2000)}`);
  assert.equal(six.fail, 0, `the six locked files report fail ${six.fail}`);
  const t16 = runLockedTests(T16_OWNED);
  assert.equal(t16.pass, 7, `T16's owned file reports pass ${t16.pass}, fail ${t16.fail}: ${t16.output.slice(-2000)}`);
  assert.equal(t16.fail, 0, `T16's owned file reports fail ${t16.fail}`);
});
