// FLOW-GRD-04-NAMED-PATH — the failing case names the report path, and that path is
// declared in the case manifest before either invocation runs.
//
// The report exists at exactly the declared path inside its own fresh invocation
// directory, names the planted defect with evidence the real oracle produced, and no
// other file appears in `reports/`. Confinement: absolute, `..`, and a symlinked
// ancestor are refused before anything is written, and a decoy file is never read.

import assert from "node:assert/strict";
import { existsSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { assertConfined, bindReportPath, freshInvocationDir, listDir, loadCase, CASES_DIR, PROJECT_DIR } from "../../test/harness/kit/case-loader.mjs";
import { confinementCase, declaredPathCase, readDeclaredReportsFromArtifact, runVerifyCase } from "./flow-runner.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));

test("FLOW-GRD-04-NAMED-PATH", async (t) => {
  const planted = loadCase("verify-button-drift");
  const clean = loadCase("verify-clean");

  await t.test("both report paths are declared in the manifests, before any invocation", () => {
    for (const [caseId, expected] of [
      ["verify-button-drift", "reports/verify-button-drift.json"],
      ["verify-clean", "reports/verify-clean.json"],
    ]) {
      const manifest = JSON.parse(readFileSync(path.join(CASES_DIR, `${caseId}.json`), "utf8"));
      assert.equal(manifest.report_relative_path, expected, `${caseId} must declare ${expected}`);
    }
    assert.notEqual(
      planted.report_relative_path,
      clean.report_relative_path,
      "the planted report is never reused for the twin",
    );
    assert.equal(planted.defect_key, "atoms/Button/default");
    assert.equal(planted.capture_path, "design/.captures/web-desktop/atoms/Button/default.txt");
    // The one place the two cases may diverge, declared before launch.
    assert.deepEqual(planted.overlay_files, ["sandbox/stories/atoms/Button/default.txt"]);
    assert.deepEqual(clean.overlay_files, [], "the clean twin carries no overlay at all");
  });

  await t.test("the loader binds each case to its own fresh invocation directory", () => {
    const a = freshInvocationDir("verify-button-drift");
    const b = freshInvocationDir("verify-clean");
    const boundA = bindReportPath(planted, a.dir);
    const boundB = bindReportPath(clean, b.dir);
    assert.equal(boundA, path.join(a.dir, "reports/verify-button-drift.json"));
    assert.equal(boundB, path.join(b.dir, "reports/verify-clean.json"));
    assert.notEqual(a.dir, b.dir, "each case gets a fresh directory");
    assert.notEqual(boundA, boundB, "no two cases share a report path");
    assert.equal(listDir(a.dir).length, 0, "binding writes nothing");
    assert.equal(listDir(b.dir).length, 0, "binding writes nothing");
  });

  await t.test("absolute, .., and symlinked-ancestor paths are refused before any write", () => {
    for (const subCase of ["traversal-escape", "traversal-inner", "absolute-escape", "symlink-escape"]) {
      const record = confinementCase(subCase);
      assert.equal(record.refused, true, `${subCase} must be refused`);
      assert.equal(record.code, "invalid-case-path");
      assert.deepEqual(
        record.listing_after,
        record.listing_before,
        `${subCase} wrote nothing: listing must be unchanged`,
      );
      if (subCase !== "symlink-escape") {
        assert.equal(record.listing_after.length, 0, `${subCase} left 0 entries in the invocation dir`);
      } else {
        assert.deepEqual(record.symlink_target_listing_after, [], "nothing was written through the symlink");
      }
    }
  });

  await t.test("a path resolving to the invocation directory itself is refused by the containment guard", () => {
    const dir = freshInvocationDir("root-path");
    try {
      // "." has no `..`, is not absolute and follows no symlink, so the containment
      // guard is the only one that can refuse it — the guard left un-pinned before.
      assert.throws(
        () => assertConfined(".", dir.dir),
        (err) => err.code === "invalid-case-path" && err.why === "resolves outside the invocation directory",
        "a path resolving to the invocation dir itself must be refused by containment",
      );
      assert.throws(
        () => bindReportPath({ ...planted, report_relative_path: "." }, dir.dir),
        (err) => err.code === "invalid-case-path",
      );
      assert.deepEqual(listDir(dir.dir), [], "the refusal wrote nothing");
    } finally {
      rmSync(dir.dir, { recursive: true, force: true });
    }
  });

  await t.test("a decoy file in reports/ is never selected — no discovery fallback", () => {
    const record = confinementCase("decoy-file");
    assert.equal(record.refused, false, "the declared path is legitimate even beside a decoy");
    assert.equal(record.bound_is_declared, true);
    assert.equal(record.decoy_selected, false, "the loader must never return the .backup.json");
    assert.ok(!record.bound_path.includes(".backup.json"));
  });

  await t.test("the real oracle puts the report at the declared path, naming the planted defect", () => {
    const run = declaredPathCase();
    t.after(() => rmSync(run.dir, { recursive: true, force: true }));
    const expectedAbs = path.join(run.dir, planted.report_relative_path);
    assert.equal(run.bound_path, expectedAbs, "report lives at exactly the declared path");
    assert.ok(existsSync(run.bound_path), `${planted.report_relative_path} must exist`);
    assert.deepEqual(
      run.reports_listing,
      ["verify-button-drift.json"],
      "reports/ holds exactly the declared file — no invented filename",
    );

    // The overlay is the only place the pair diverges: exactly its declared files.
    assert.deepEqual(
      run.overlay_changed,
      planted.overlay_files,
      "the planted overlay rewrites exactly its declared source file — a second, unrelated drift is a failure",
    );

    const report = run.report;
    assert.equal(report.expected_defect_key, "atoms/Button/default");
    assert.equal(report.observed_defect_key, "atoms/Button/default");
    assert.equal(report.observed_verify_outcome, "defect-detected");
    assert.equal(report.missed_defect, false);
    assert.equal(report.clean_project_failed, false);
    assert.equal(report.harness, planted.harness, "report harness matches its cell");
    assert.equal(report.track, planted.track, "report track matches its cell");
    assert.equal(report.invocation_id, run.invocation.invocationId, "report is bound to its producing invocation");
    assert.equal(report.case_id, planted.case_id);

    // The detection cites real evidence: the oracle's own exit and drift list, the
    // capture file it wrote, its hash, and the byte offsets that drifted.
    assert.equal(report.process_exit_code, 1, "the oracle exited 1 on the planted project");
    assert.equal(run.oracle.exit_code, 1);
    assert.ok(run.oracle.drifted_keys.includes("atoms/Button/default"), "drifted[].key atoms/Button/default");
    assert.equal(report.evidence.capture_path, "design/.captures/web-desktop/atoms/Button/default.txt");
    assert.match(report.evidence.capture_sha256, /^[0-9a-f]{64}$/, "capture hash is recorded");
    assert.notEqual(report.evidence.capture_sha256, report.evidence.golden_sha256, "capture differs from its golden");
    assert.ok(report.evidence.event_offsets, "event byte offsets are cited");
    assert.equal(typeof report.evidence.event_offsets.offset, "number");
    assert.ok(report.evidence.event_offsets.end_offset > report.evidence.event_offsets.offset);

    // The offsets point at the real drifted bytes in the captured file.
    const captured = readFileSync(path.join(run.dir, report.evidence.capture_path));
    const sliced = captured.subarray(report.evidence.event_offsets.offset, report.evidence.event_offsets.end_offset);
    assert.match(sliced.toString("utf8"), /label=DRIFTED/, "the cited offsets cover the planted drift");

    // The fixture was copied, never run in place, and its protected files are intact.
    assert.notEqual(path.resolve(run.dir), path.resolve(PROJECT_DIR), "the fixture is never run in place");
    assert.equal(run.protected_unchanged, true, "protected manifest/goldens/sandbox/src/package unchanged");
  });

  await t.test("the report's outcome is derived from the oracle, never from the case role", () => {
    // Derivation control only: the oracle result is supplied so the report's observation
    // can be compared against an outcome its case role does not predict. Detection above
    // is the real keyless oracle; nothing here stands in for a real capture.
    const stub = (exit_code, driftedKeys) => ({
      command: "stub: derivation control, no oracle spawned",
      exit_code,
      report: { drifted: driftedKeys.map((key) => ({ key })), violations: [] },
      parse_error: null,
    });

    const plantedSeenClean = runVerifyCase("verify-button-drift", { oracle: () => stub(0, []) });
    assert.equal(
      plantedSeenClean.report.observed_verify_outcome,
      "missed-defect",
      "an oracle that reports no drift cannot yield defect-detected",
    );
    assert.equal(plantedSeenClean.report.missed_defect, true);
    assert.equal(plantedSeenClean.report.observed_defect_key, null, "no observed key when the oracle saw no drift");

    const cleanSeenDirty = runVerifyCase("verify-clean", { oracle: () => stub(1, ["atoms/Button/default"]) });
    assert.equal(cleanSeenDirty.report.observed_verify_outcome, "false-positive");
    assert.equal(cleanSeenDirty.report.clean_project_failed, true, "a dirty clean control is a false positive, not a pass");
  });

  await t.test("the run's verify-reports artifact carries both reports at their declared paths", (tt) => {
    // AC-1's GIVEN is `gh run download verify-reports artifact`. That artifact is produced
    // by T7's harness-eval workflow, so with no dispatched run this leg grades
    // not-executed with its reason — never a silent pass, never a hard failure. The
    // declared-path legs above carry the row until T7's obligation runs it.
    const leg = readDeclaredReportsFromArtifact();
    if (leg.status === "not-executed") {
      tt.diagnostic(`not-executed leg=${leg.leg} owner=${leg.owner} reason=${leg.reason}`);
      assert.ok(leg.reason.length > 0, "a not-executed leg records its reason");
      return;
    }
    tt.after(() => rmSync(leg.dir, { recursive: true, force: true }));
    assert.equal(leg.planted.report.expected_defect_key, "atoms/Button/default");
    assert.equal(leg.planted.report.observed_verify_outcome, "defect-detected");
    assert.equal(leg.clean.report.observed_verify_outcome, "clean");
    assert.equal(leg.clean.report.clean_project_failed, false);
  });
});
