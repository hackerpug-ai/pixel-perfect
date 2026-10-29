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

import { bindReportPath, freshInvocationDir, listDir, loadCase, CASES_DIR, PROJECT_DIR } from "../../test/harness/kit/case-loader.mjs";
import { confinementCase, declaredPathCase } from "./flow-runner.mjs";

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
});
