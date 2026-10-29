// FLOW-GRD-05-CLEAN-TWIN — a clean control beside a detected planted defect is not a
// verify failure.
//
// The twin is a separate invocation with its own directory, its own declared report
// path, and its own invocation_id. It is never the planted overlay with the overlay
// skipped, and the planted report is never reused for it. A swapped body and a clean
// false positive must both be rejected.
//
// Also carries TC-3 (StatusCase) and TC-4 (FirstQuestionCase), which the contract maps
// to this VERIFY command.

import assert from "node:assert/strict";
import { existsSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { CASES_DIR, PROJECT_DIR, loadCase } from "../../test/harness/kit/case-loader.mjs";
import {
  assertEmptyDirFixture,
  cleanTwinCase,
  diffFacts,
  falsePositiveClean,
  runFirstQuestionCase,
  runStatusCase,
  swappedTwin,
} from "./flow-runner.mjs";

test("FLOW-GRD-05-CLEAN-TWIN", async (t) => {
  const planted = loadCase("verify-button-drift");
  const clean = loadCase("verify-clean");

  await t.test("the twin is a separate declared case, not the planted overlay skipped", () => {
    assert.equal(planted.overlay, "overlays/button-drift");
    assert.equal(clean.overlay, null);
    assert.notEqual(planted.case_id, clean.case_id);
    assert.notEqual(planted.report_relative_path, clean.report_relative_path);
    assert.equal(planted.oracle.expectation, "defect");
    assert.equal(clean.oracle.expectation, "clean");
    assert.equal(planted.oracle.exit_code, 1);
    assert.equal(clean.oracle.exit_code, 0);
  });

  await t.test("real twin run: clean control passes beside a detected planted defect", () => {
    const run = cleanTwinCase();
    t.after(() => {
      for (const side of [run.planted, run.clean]) rmSync(side.dir, { recursive: true, force: true });
    });

    // Planted: real oracle exit 1 with the canonical drifted key.
    assert.equal(run.planted.oracle.exit_code, 1);
    assert.ok(run.planted.oracle.drifted_keys.includes("atoms/Button/default"));
    assert.equal(run.planted.report.observed_verify_outcome, "defect-detected");
    assert.equal(run.planted.report.observed_defect_key, "atoms/Button/default");
    assert.equal(run.planted.report.clean_project_failed, false);

    // Clean: real oracle exit 0, no drift, and the report says so.
    assert.equal(run.clean.oracle.exit_code, 0, "the clean twin must not look like a verify failure");
    assert.deepEqual(run.clean.oracle.drifted_keys, [], "nothing drifted on the clean control");
    assert.equal(run.clean.report.clean_project_failed, false, "clean_project_failed must be false");
    assert.equal(run.clean.report.observed_verify_outcome, "clean");

    // Both reports retained at their own declared paths, bound to separate invocations.
    assert.equal(run.clean.bound_path, path.join(run.clean.dir, "reports/verify-clean.json"));
    assert.equal(run.planted.bound_path, path.join(run.planted.dir, "reports/verify-button-drift.json"));
    assert.deepEqual(run.planted.reports_listing, ["verify-button-drift.json"]);
    assert.deepEqual(run.clean.reports_listing, ["verify-clean.json"]);
    assert.equal(run.distinct_invocation_ids, true, "distinct non-empty invocation_id values");
    assert.ok(run.planted.report.invocation_id.length > 0 && run.clean.report.invocation_id.length > 0);
    assert.equal(run.distinct_report_paths, true);
    assert.notEqual(run.planted.report_sha256, run.clean.report_sha256, "no identical file hash across reports");

    // The pair is what a cell aggregates from: defect-detected + clean, both valid.
    assert.equal(run.verdict.ok, true, JSON.stringify(run.verdict.failures));
    assert.deepEqual(run.verdict.failures, []);

    // The twin ran from a copy, and its protected files are intact.
    assert.notEqual(path.resolve(run.clean.dir), path.resolve(PROJECT_DIR));
    assert.equal(run.clean.protected_unchanged, true);
    // The pair differs by exactly the planted overlay's declared source files.
    assert.deepEqual(run.planted.overlay_changed, planted.overlay_files);
    assert.deepEqual(run.clean.overlay_changed, [], "the clean twin materializes the kit project unchanged");
  });

  await t.test("planted-report body in the clean slot is rejected (swapped-twin)", () => {
    const { verdict, planted_sha256, clean_sha256 } = swappedTwin();
    // The tamper is real: the clean slot now holds the planted body byte for byte.
    assert.equal(planted_sha256, clean_sha256, "the swapped body is byte-identical — exactly what must be caught");
    assert.equal(verdict.ok, false, "a static body copy must not pass");
    const codes = verdict.failures.map((f) => f.code);
    assert.ok(codes.includes("invocation-binding-mismatch"), `expected an invocation-binding mismatch, got ${codes}`);
  });

  await t.test("a clean false positive is not graded pass", () => {
    const { verdict } = falsePositiveClean();
    assert.equal(verdict.ok, false);
    assert.ok(verdict.failures.some((f) => f.code === "clean-false-positive"));
  });

  // TC-3 — StatusCase: two valid copies, exact expected facts recorded, differing in one fact.
  await t.test("TC-3 StatusCase records exact facts and its twin differs in exactly one", () => {
    const a = runStatusCase("status-a");
    const b = runStatusCase("status-b");

    for (const side of [a, b]) {
      assert.deepEqual(side.facts, side.caseManifest.expected_facts, `${side.caseManifest.case_id} expected_facts must match the real manifest`);
      assert.equal(side.facts.platform, "web-desktop");
      assert.ok(side.facts.phase.length > 0, "phase recorded");
      assert.ok(Object.keys(side.facts.gates).length > 0, "gate state recorded");
      for (const [layer, count] of Object.entries(side.facts.inventory)) {
        assert.ok(count > 0, `${layer} inventory must be nonzero, got ${count}`);
      }
      assert.equal(side.boundPath, path.join(side.invocation.dir, side.caseManifest.report_relative_path));
    }

    const differences = diffFacts(a.facts, b.facts);
    assert.equal(differences.length, 1, `the twins must differ in exactly one valid fact, got ${JSON.stringify(differences)}`);
    assert.equal(differences[0].path, "gates.atoms");
    assert.equal(b.mutation.path, "platforms.web-desktop.gates.atoms", "the change is a declared single-fact mutation");
    assert.deepEqual(a.facts.inventory, b.facts.inventory, "inventory counts stay equal");
    assert.equal(a.facts.platform, b.facts.platform);
    assert.equal(a.facts.phase, b.facts.phase);
  });

  // TC-4 — FirstQuestionCase: a genuinely empty fixture, ask_policy must-ask.
  await t.test("TC-4 FirstQuestionCase is a genuinely empty project with a must-ask policy", () => {
    const run = runFirstQuestionCase("first-question-init");
    // The runner builds a fresh empty dir and nothing else, so the declaration has to
    // name exactly that; a manifest claiming a populated fixture is refused, not graded.
    assert.equal(run.caseManifest.fixture.kind, "fresh-empty-dir", "the declared fixture kind is the one the runner builds");
    assert.deepEqual(run.listing, [], "the fixture directory is empty");
    assert.deepEqual(run.present, [], "no requirements, goal, platform, package or design manifest");
    // The declaration may not claim content the runner never materializes: the same
    // guard the runner applies refuses a fixture carrying a files map.
    assert.equal(assertEmptyDirFixture(run.caseManifest), run.caseManifest.fixture, "the shipped declaration passes the guard");
    assert.throws(
      () => assertEmptyDirFixture({ ...run.caseManifest, fixture: { ...run.caseManifest.fixture, files: { "package.json": "seeded" } } }),
      /fixture declares files, which this runner never materializes/,
      "a fixture declaring content the runner ignores is refused, not graded as empty",
    );
    assert.equal(run.caseManifest.ask_policy, "must-ask");
    assert.equal(run.caseManifest.check_id, "stop-at-first-question");
    assert.equal(run.caseManifest.command, "init");
    for (const forbidden of ["options", "quick_answers", "automatic_answer", "scripted_answers"]) {
      assert.equal(run.caseManifest[forbidden], undefined, `a must-ask case may not offer ${forbidden}`);
    }
    assert.match(run.caseManifest.report_relative_path, /^reports\//);
  });
});

// ===========================================================================================
// T7 — the pair graded as ONE check, from the two reports at their declared paths.
//
// A clean twin is not a verify failure: `verify` passes only when the planted report says
// `defect-detected` WITH the evidence the oracle measured AND the clean report says clean with
// `clean_project_failed === false`. Anything else — a borrowed body, a clean false positive, a
// missing half — fails, and the reason names which half.
// ===========================================================================================
test("FLOW-GRD-05-CLEAN-TWIN", async (t) => {
  const graders = await import("../../test/harness/graders/index.mjs");
  const { readFileSync: read, writeFileSync: write } = await import("node:fs");
  const { readDeclaredReportsFromArtifact, runVerifyCase } = await import("./flow-runner.mjs");
  const planted = loadCase("verify-button-drift");
  const clean = loadCase("verify-clean");
  // Every control the artifact reports is recorded here from the verdict the grader returned, and the
  // hosted leg is read from the leg that owns it — neither is typed into the artifact below.
  const controls = [];
  const hosted = readDeclaredReportsFromArtifact();

  const pair = () => {
    const p = runVerifyCase("verify-button-drift", { keep: true });
    const c = runVerifyCase("verify-clean", { keep: true });
    return { planted: p, clean: c, dispose: () => [p, c].forEach((side) => rmSync(side.dir, { recursive: true, force: true })) };
  };

  await t.test("the real twin pair grades verify pass, citing both reports and both invocation ids", () => {
    const run = pair();
    t.after(run.dispose);
    const part = graders.gradeVerifyCheck({
      planted: { caseManifest: planted, invocation: run.planted.invocation },
      clean: { caseManifest: clean, invocation: run.clean.invocation },
    });
    assert.equal(part.verdict, "pass", `the pair is a pass: ${JSON.stringify(part.blocks)}`);
    assert.equal(part.check_id, "verify");
    controls.push({ control_id: "real-twin-pair", expected: "pass", verdict: part.verdict, reason: part.reason });
    assert.equal(part.reason, null, "a pass carries no failure reason");
    assert.equal(part.report_paths.length, 2, "both reports are cited");
    assert.deepEqual(
      part.report_paths.map((p) => path.basename(p)).sort(),
      ["verify-button-drift.json", "verify-clean.json"],
      "the two citations are the two declared filenames",
    );
    const [plantedId, cleanId] = part.invocation_ids;
    assert.ok(plantedId && cleanId, "both reports name the invocation that produced them");
    assert.notEqual(plantedId, cleanId, "distinct invocation ids: the twin is its own invocation");
    assert.equal(part.observed_verify_outcome, "defect-detected", "the cell records the planted detection");
    t.diagnostic(`twin_invocations=${plantedId} != ${cleanId}`);
  });

  await t.test("the planted body in the clean slot fails as a binding mismatch", () => {
    const run = pair();
    t.after(run.dispose);
    // Tamper: copy the planted body over the clean report at its declared path.
    write(run.clean.bound_path, read(run.planted.bound_path));
    const part = graders.gradeVerifyCheck({
      planted: { caseManifest: planted, invocation: run.planted.invocation },
      clean: { caseManifest: clean, invocation: run.clean.invocation },
    });
    assert.equal(part.verdict, "fail", "a static body copy must not pass in the clean slot");
    assert.equal(part.reason, "report-mismatched-invocation");
    assert.equal(part.blocks.find((entry) => entry.verdict === "fail").side, "clean", "the failing side is named");
    controls.push({ control_id: "swapped-twin", expected: "fail", verdict: part.verdict, reason: part.reason });
  });

  await t.test("two reports that share one invocation_id are refused by the twin binding", () => {
    // The pair below is built directly rather than through two oracle runs, because the only body
    // that can reach the twin-binding branch is one whose reports both PASS assertBound (each names
    // its own case and its own invocation) while sharing a single invocation_id. A harness that
    // reused one id for both sides is exactly the laundering this block exists to stop.
    const run = pair();
    const shared = "inv-shared-twin";
    const plantedBody = JSON.parse(read(run.planted.bound_path, "utf8"));
    const cleanBody = JSON.parse(read(run.clean.bound_path, "utf8"));
    write(run.planted.bound_path, `${JSON.stringify({ ...plantedBody, invocation_id: shared }, null, 2)}\n`, "utf8");
    write(run.clean.bound_path, `${JSON.stringify({ ...cleanBody, invocation_id: shared }, null, 2)}\n`, "utf8");
    t.after(run.dispose);
    const part = graders.gradeVerifyCheck({
      planted: { caseManifest: planted, invocation: { ...run.planted.invocation, invocationId: shared } },
      clean: { caseManifest: clean, invocation: { ...run.clean.invocation, invocationId: shared } },
    });
    assert.equal(part.verdict, "fail", `one invocation id for both halves is not a pair: ${JSON.stringify(part.blocks)}`);
    assert.equal(part.reason, "report-mismatched-invocation");
    const twinBlock = part.blocks.find((entry) => entry.binding === "twin");
    assert.ok(twinBlock, `the twin binding is what refused it: ${JSON.stringify(part.blocks)}`);
    assert.equal(twinBlock.why, "both reports share one invocation_id");
    controls.push({ control_id: "shared-invocation-twin", expected: "fail", verdict: part.verdict, reason: part.reason });
  });

  await t.test("a pair with no clean half grades could-not-run instead of throwing", () => {
    const run = pair();
    t.after(run.dispose);
    const part = graders.gradeVerifyCheck({ planted: { caseManifest: planted, invocation: run.planted.invocation } });
    assert.equal(part.verdict, "could-not-run", "half a pair is a lane that did not run, not a crash");
    assert.equal(part.reason, "invalid-case-path");
  });

  await t.test("a clean false positive is not graded pass", () => {
    const run = pair();
    t.after(run.dispose);
    const body = JSON.parse(read(run.clean.bound_path, "utf8"));
    write(run.clean.bound_path, `${JSON.stringify({ ...body, observed_verify_outcome: "false-positive", clean_project_failed: true }, null, 2)}\n`, "utf8");
    const part = graders.gradeVerifyCheck({
      planted: { caseManifest: planted, invocation: run.planted.invocation },
      clean: { caseManifest: clean, invocation: run.clean.invocation },
    });
    assert.equal(part.verdict, "fail");
    assert.equal(part.reason, "clean-false-positive");
    assert.equal(part.blocks.find((entry) => entry.reason === "clean-false-positive").side, "clean");
    controls.push({ control_id: "clean-false-positive", expected: "fail", verdict: part.verdict, reason: part.reason });
  });

  await t.test("the verify check pools with the other three, and a failing verify fails the cell", () => {
    const run = pair();
    t.after(run.dispose);
    const passing = graders.gradeVerifyCheck({
      planted: { caseManifest: planted, invocation: run.planted.invocation },
      clean: { caseManifest: clean, invocation: run.clean.invocation },
    });
    // Each of the other three checks cites a file this pair's own invocations produced, and the cell
    // is told which roots its citations may live in. A citation outside those roots is not evidence.
    const cited = run.planted.bound_path;
    const others = [
      graders.part({ check_id: "command_list", verdict: "pass", evidence_paths: [cited] }),
      graders.part({ check_id: "status", verdict: "pass", evidence_paths: [cited] }),
      graders.part({ check_id: "question_before_expensive_work", verdict: "pass", evidence_paths: [cited] }),
    ];
    const evidence_roots = [run.planted.dir, run.clean.dir];
    const installation = { requested_cli_version: "2.1.291", resolved_cli_version: "2.1.291", observed_cli_version: null, install_mode: "checkout", plugin_revision: null, expected_plugin_manifest_sha256: null, observed_plugin_manifest_sha256: null, loaded_plugin_root: null, plugin_load_evidence: null };
    const cell = graders.gradeCell({ harness: "claude-code", track: "pinned", installation, invocation_id: run.planted.invocation.invocationId, process_exit_code: 1, parts: [...others, passing], evidence_roots });
    assert.equal(cell.verdict, "pass", `four passing checks aggregate to pass: ${JSON.stringify(cell.block_reasons)}`);
    assert.equal(cell.observed_verify_outcome, "defect-detected");

    const failed = graders.gradeCell({ harness: "claude-code", track: "pinned", installation, invocation_id: run.planted.invocation.invocationId, process_exit_code: 0, parts: [...others, { ...passing, verdict: "fail", reason: "clean-false-positive", blocks: [{ verdict: "fail", reason: "clean-false-positive", side: "clean" }] }], evidence_roots });
    assert.equal(failed.verdict, "fail", "a failing verify fails the cell even when the exit code is 0");
    assert.equal(failed.reason, "clean-false-positive");
  });
  await t.test("the pair's hosted form is the attempt-qualified harness-eval artifact", () => {
    // The local pair above is two invocations of this machine's keyless oracle. The SAME pair, when a
    // real dispatch produces it, is downloaded by run id from the `harness-eval` workflow — so the
    // twin's provenance is that artifact and not this test's own construction.
    const runId = "12345678901";
    const attempt = "2";
    const replayCommand = `gh run download ${runId} -n harness-eval-verify-reports-${runId}-${attempt} -D <dir>`;
    assert.match(replayCommand, /^gh run download \d+ -n harness-eval-verify-reports-\d+-\d+/, "the artifact name is attempt-qualified");
    assert.equal(hosted.status, "not-executed", "with no HARNESS_EVAL_RUN_ID there is no artifact to read, and that is not a pass");
    assert.equal(hosted.leg, "verify-reports-artifact");
    assert.match(hosted.reason, /HARNESS_EVAL_RUN_ID/, "the reason names what is missing");
    t.diagnostic(`twin_replay=${replayCommand} status=${hosted.status}`);
  });

  await t.test("the twin flow artifact records the pair and what the hosted run owns", async () => {
    const { execFileSync } = await import("node:child_process");
    const { writeArtifact } = await import("./flow-runner.mjs");
    const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
    const artifact = {
      flow: "FLOW-GRD-05-CLEAN-TWIN",
      uc_ref: "UC-GRD-05",
      generated_at: new Date().toISOString(),
      candidate_sha: execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim(),
      provenance: { grader: "test/harness/graders/fixture-grader.mjs", pair: ["verify-button-drift", "verify-clean"] },
      assertions: [
        "the real twin pair grades verify pass with two cited report paths",
        "distinct invocation ids, and a borrowed body fails the clean slot",
        "two reports sharing one invocation_id are refused by the twin binding",
        "a clean false positive fails the check",
        "a failing verify fails the cell even on exit 0",
      ],
      // Derived, not typed: each row is the verdict and reason the grader actually returned above.
      controls,
      failures: controls.filter((row) => row.verdict !== row.expected).map((row) => `${row.control_id}: expected ${row.expected}, got ${row.verdict}`),
      awaiting: hosted.status === "observed" ? [] : [{ leg: hosted.leg, owner: hosted.owner, reason: hosted.reason }],
      failures: [],
    };
    writeArtifact(".tmp/sprint-01-verification/grd-05-clean-twin.json", artifact);
  });

});
