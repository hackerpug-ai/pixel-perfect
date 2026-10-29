// FLOW-JRN-PLANTED-AND-TWIN — the planted-and-clean verify pair through one real
// dispatched run, from oracle precheck to the summary links.
//
// This journey is executed by T7's workflow; T4 supplies the fixtures it replays and
// exercises it at human-testing gate step 8. It therefore has three parts:
//
//   1. local and always provable: a missing planted report on an otherwise evaluable
//      run downgrades to fail `report-missing`, and a static replay with no live-run
//      provenance grades `not-executed` — never pass;
//   2. the live dispatch: resolve a run (HARNESS_EVAL_RUN_ID / HARNESS_EVAL_RUN_ATTEMPT,
//      or dispatch `harness-eval` ourselves), download the attempt-qualified
//      verify-reports artifact, and require its oracle transcript and both reports
//      to agree with the case manifests;
//   3. honest not-executed for exactly ONE cause: the harness-eval workflow not being on
//      this branch, which T7 lands (post-integration obligation
//      obl-FLOW-JRN-PLANTED-AND-TWIN). Only that cause may defer, and it carries its
//      reason. Every other way the live leg can fail to start — gh unauthenticated, the
//      dispatch refused, the run list unreadable, no run appearing — is a failure to
//      execute the leg and goes RED. A catch-all deferral would let T7's gate step stay
//      green while the journey's THEN was never observed.

import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { loadCase, sha256File } from "../../test/harness/kit/case-loader.mjs";
import { missingPlantedReport } from "./flow-runner.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "../..");
const WORKFLOW_PATH = ".github/workflows/harness-eval.yml";
const REPO = process.env.HARNESS_EVAL_REPO || "hackerpug-ai/pixel-perfect";

const gh = (args, opts = {}) => spawnSync("gh", args, { encoding: "utf8", cwd: REPO_ROOT, timeout: 120_000, ...opts });

/**
 * Provenance for one downloaded artifact. A directory of reports with no live-run
 * binding is a replay: it grades `not-executed`, never pass.
 */
export function readProvenance(dir, { runId, attempt }) {
  const candidates = ["harness-eval-result.json", "run.json", "provenance.json"];
  const file = candidates.map((name) => path.join(dir, name)).find((p) => existsSync(p));
  if (!file) return { live: false, reason: `no live-run provenance in ${dir} — a static replay cannot grade pass` };
  let meta;
  try {
    meta = JSON.parse(readFileSync(file, "utf8"));
  } catch (err) {
    return { live: false, reason: `unparseable provenance ${path.basename(file)}: ${err.message}` };
  }
  const observedRun = String(meta.run_id ?? meta.workflow_run_id ?? "");
  const observedAttempt = String(meta.run_attempt ?? "");
  if (!observedRun || observedRun !== String(runId)) {
    return { live: false, reason: `provenance run_id ${observedRun || "(absent)"} does not match the dispatched run ${runId}` };
  }
  if (!observedAttempt) return { live: false, reason: "provenance carries no run_attempt" };
  if (attempt !== undefined && observedAttempt !== String(attempt)) {
    return { live: false, reason: `provenance run_attempt ${observedAttempt} does not match ${attempt}` };
  }
  return { live: true, runId: observedRun, attempt: observedAttempt, file };
}

/** Read the oracle transcript the run recorded, if it shipped one. */
export function readOracleTranscript(dir) {
  for (const name of ["oracle-precheck.json", "oracle.json"]) {
    const p = path.join(dir, name);
    if (existsSync(p)) return JSON.parse(readFileSync(p, "utf8"));
  }
  return null;
}

export function resolveLiveRun({
  hasWorkflow = () => existsSync(path.join(REPO_ROOT, WORKFLOW_PATH)),
  gh: runGh = gh,
} = {}) {
  // The one legitimate deferral: T7 has not landed the workflow yet, so there is nothing
  // to dispatch. Everything below is a genuine failure and must not reach the green branch.
  if (!hasWorkflow()) {
    return {
      ok: false,
      deferral: true,
      reason: `no ${WORKFLOW_PATH} to dispatch — the harness-eval workflow is not on this branch (T7 owns it)`,
    };
  }
  const auth = runGh(["auth", "status"]);
  if (auth.status !== 0) return { ok: false, reason: "gh is not authenticated" };

  const suppliedRun = process.env.HARNESS_EVAL_RUN_ID;
  if (suppliedRun) {
    return { ok: true, runId: suppliedRun, attempt: process.env.HARNESS_EVAL_RUN_ATTEMPT || "1", dispatched: false };
  }

  const dispatch = runGh(["workflow", "run", "harness-eval", "--repo", REPO]);
  if (dispatch.status !== 0) {
    return { ok: false, reason: `gh workflow run harness-eval failed: ${(dispatch.stderr || "").trim()}` };
  }
  const list = runGh(["run", "list", "--repo", REPO, "--workflow", "harness-eval", "--limit", "1", "--json", "databaseId,attempt,status"]);
  if (list.status !== 0) return { ok: false, reason: `gh run list failed: ${(list.stderr || "").trim()}` };
  const [latest] = JSON.parse(list.stdout || "[]");
  if (!latest) return { ok: false, reason: "no harness-eval run appeared after dispatch" };
  return { ok: true, runId: String(latest.databaseId), attempt: String(latest.attempt || 1), dispatched: true, status: latest.status };
}

/**
 * Grade the live leg's resolution. Only `deferral: true` — the missing-workflow cause —
 * may record not-executed; any other failure to start the leg fails the check.
 */
export function gradeLiveRun(run, emitDiagnostic) {
  if (run.ok) return;
  if (run.deferral) {
    assert.ok(run.reason && run.reason.length > 0, "a deferred live leg always carries its reason");
    emitDiagnostic(`not-executed leg=live-dispatched-run owner=T7 obligation=obl-FLOW-JRN-PLANTED-AND-TWIN reason=${run.reason}`);
    return;
  }
  assert.fail(`live-dispatched-run could not execute: ${run.reason}`);
}

function downloadVerifyReports(runId, attempt) {
  const dir = mkdtempSync(path.join(tmpdir(), `pp-verify-reports-${runId}-`));
  const name = `harness-eval-verify-reports-${runId}-${attempt}`;
  const res = gh(["run", "download", runId, "--repo", REPO, "-n", name, "-D", dir]);
  return { dir, name, ok: res.status === 0, stderr: (res.stderr || "").trim() };
}

test("FLOW-JRN-PLANTED-AND-TWIN", async (t) => {
  const planted = loadCase("verify-button-drift");
  const clean = loadCase("verify-clean");

  // ---- Part 1: local, always provable -------------------------------------
  await t.test("a missing planted report downgrades to fail report-missing, not could-not-run", () => {
    const { verdict, planted_listing } = missingPlantedReport();
    assert.equal(verdict.ok, false, "an evaluable run missing its planted report must not pass");
    assert.ok(
      verdict.failures.some((f) => f.code === "report-missing"),
      `expected report-missing, got ${verdict.failures.map((f) => f.code)}`,
    );
    assert.ok(
      !verdict.failures.some((f) => f.code === "report-unavailable" || f.code === "could-not-run"),
      "a missing report is never excused as could-not-run",
    );
    assert.deepEqual(planted_listing, [], "the planted report really was removed from its declared path");
  });

  await t.test("a static replay with no live-run provenance grades not-executed, never pass", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "pp-replay-"));
    try {
      writeFileSync(path.join(dir, "verify-button-drift.json"), JSON.stringify({ observed_verify_outcome: "defect-detected" }), "utf8");
      writeFileSync(path.join(dir, "verify-clean.json"), JSON.stringify({ observed_verify_outcome: "clean" }), "utf8");
      const provenance = readProvenance(dir, { runId: "12345", attempt: "1" });
      assert.equal(provenance.live, false, "a replay is not a live run");
      assert.match(provenance.reason, /no live-run provenance/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  await t.test("provenance bound to a different run is rejected", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "pp-replay-"));
    try {
      writeFileSync(path.join(dir, "harness-eval-result.json"), JSON.stringify({ run_id: 999, run_attempt: 1 }), "utf8");
      const provenance = readProvenance(dir, { runId: "12345", attempt: "1" });
      assert.equal(provenance.live, false);
      assert.match(provenance.reason, /does not match the dispatched run 12345/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // ---- Part 2/3: the live journey, or the one legitimate not-executed -------
  await t.test("only the missing workflow defers; any other failure to dispatch goes red", () => {
    // Control 1: a dispatch failure that is NOT the missing-workflow case. The workflow
    // is present, gh answers, and the dispatch is refused — nothing this leg owns is
    // absent, so it must fail rather than quietly defer.
    const dispatchFailed = resolveLiveRun({
      hasWorkflow: () => true,
      gh: (args) =>
        args[0] === "auth"
          ? { status: 0, stdout: "", stderr: "" }
          : { status: 1, stdout: "", stderr: "could not find any workflows named harness-eval" },
    });
    assert.equal(dispatchFailed.ok, false);
    assert.equal(dispatchFailed.deferral, undefined, "a refused dispatch is not a deferral");
    const emitted = [];
    assert.throws(
      () => gradeLiveRun(dispatchFailed, (m) => emitted.push(m)),
      /live-dispatched-run could not execute: gh workflow run harness-eval failed/,
      "a genuine dispatch failure must fail the check, not record not-executed",
    );
    assert.deepEqual(emitted, [], "a failed dispatch emits no not-executed diagnostic");

    // Control 2: gh unauthenticated, likewise not a deferral.
    const unauthenticated = resolveLiveRun({ hasWorkflow: () => true, gh: () => ({ status: 1, stdout: "", stderr: "" }) });
    assert.equal(unauthenticated.deferral, undefined);
    assert.throws(() => gradeLiveRun(unauthenticated, () => {}), /gh is not authenticated/);

    // Control 3: the one legitimate cause still defers, with its reason.
    const absent = resolveLiveRun({ hasWorkflow: () => false, gh: () => assert.fail("must not call gh when the workflow is absent") });
    assert.equal(absent.ok, false);
    assert.equal(absent.deferral, true);
    const deferred = [];
    gradeLiveRun(absent, (m) => deferred.push(m));
    assert.equal(deferred.length, 1);
    assert.match(deferred[0], /^not-executed leg=live-dispatched-run owner=T7 .*reason=no \.github\/workflows\/harness-eval\.yml to dispatch/);

    // A deferral with no reason cannot hide behind the marker.
    assert.throws(() => gradeLiveRun({ ok: false, deferral: true, reason: "" }, () => {}), /always carries its reason/);
  });

  await t.test("one live dispatched run: oracle precheck, both reports, distinct invocation_ids", (tt) => {
    const run = resolveLiveRun();
    if (!run.ok) {
      // Red unless the sole legitimate cause above applies: T7 has not landed the
      // workflow, so there is nothing to dispatch and the leg records not-executed with
      // its owner and obligation. This task's own failures still fail the check.
      gradeLiveRun(run, (m) => tt.diagnostic(m));
      return;
    }
    const download = downloadVerifyReports(run.runId, run.attempt);
    tt.after(() => rmSync(download.dir, { recursive: true, force: true }));
    assert.equal(download.ok, true, `could not download ${download.name}: ${download.stderr}`);

    // Oracle transcript: planted exit 1 with the canonical drifted key, clean exit 0.
    const oracle = readOracleTranscript(download.dir);
    assert.ok(oracle, `the run shipped no oracle transcript (listing: ${readdirSync(download.dir).sort().join(", ")})`);
    const plantedOracle = oracle.planted || oracle;
    const cleanOracle = oracle.clean || {};
    assert.equal(plantedOracle.exit_code ?? plantedOracle.exit, 1, "oracle exits 1 on the planted project");
    const drifted = (plantedOracle.drifted || []).map((d) => d.key ?? d);
    assert.ok(drifted.includes("atoms/Button/default"), `drifted[].key must include atoms/Button/default, got ${JSON.stringify(drifted)}`);
    assert.equal(cleanOracle.exit_code ?? cleanOracle.exit ?? 0, 0, "oracle exits 0 on the clean project");

    // Both reports at their declared paths, bound to distinct live invocations.
    const plantedPath = path.join(download.dir, planted.report_relative_path);
    const cleanPath = path.join(download.dir, clean.report_relative_path);
    assert.ok(existsSync(plantedPath), `${planted.report_relative_path} is absent from the run — fail report-missing`);
    assert.ok(existsSync(cleanPath), `${clean.report_relative_path} is absent from the run — fail report-missing`);
    const plantedReport = JSON.parse(readFileSync(plantedPath, "utf8"));
    const cleanReport = JSON.parse(readFileSync(cleanPath, "utf8"));

    assert.equal(plantedReport.expected_defect_key, "atoms/Button/default");
    assert.equal(plantedReport.observed_verify_outcome, "defect-detected");
    assert.equal(plantedReport.clean_project_failed, false);
    assert.equal(cleanReport.observed_verify_outcome, "clean");
    assert.equal(cleanReport.clean_project_failed, false);
    assert.notEqual(plantedReport.invocation_id, cleanReport.invocation_id, "distinct invocation_ids of the same live run");
    assert.ok(plantedReport.invocation_id && cleanReport.invocation_id);
    assert.notEqual(sha256File(plantedPath), sha256File(cleanPath), "the planted report is never reused for the twin");

    // Bound to the live run itself, not to a replay.
    const provenance = readProvenance(download.dir, { runId: run.runId, attempt: run.attempt });
    assert.equal(provenance.live, true, provenance.reason);
  });
});
