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
