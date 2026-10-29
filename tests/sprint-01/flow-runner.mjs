#!/usr/bin/env node
// Sprint-01 flow runner. Every sub-case here drives the real case loader and the
// real keyless oracle — no fixture replays a recorded result.
//
//   node tests/sprint-01/flow-runner.mjs grd-04 --case traversal-escape   --expect red
//   node tests/sprint-01/flow-runner.mjs grd-04 --case absolute-escape    --expect red
//   node tests/sprint-01/flow-runner.mjs grd-04 --case symlink-escape     --expect red
//   node tests/sprint-01/flow-runner.mjs grd-04 --case decoy-file         --expect red
//   node tests/sprint-01/flow-runner.mjs grd-04 --case declared-path      --expect green
//   node tests/sprint-01/flow-runner.mjs grd-05 --fixture swapped-twin    --expect red
//   node tests/sprint-01/flow-runner.mjs grd-05 --fixture false-positive  --expect red
//   node tests/sprint-01/flow-runner.mjs grd-05 --fixture clean-twin      --expect green
//   node tests/sprint-01/flow-runner.mjs jrn-planted-twin --fixture missing-planted-report --expect red
//
// `--expect red` passes when the case's negative control was rejected — a refused
// escape, a refused discovery fallback, a refused binding, or a refused pass.
// `--expect green` passes when the legitimate pair really detected / really was clean.
// `observed` reports which of those actually happened.

import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  CaseInvalid,
  CasePathRefused,
  applyFactsMutation,
  bindReportPath,
  freshInvocationDir,
  listDir,
  loadCase,
  materialize,
  protectedSnapshot,
  sha256File,
  validatePair,
  writeObservedReport,
} from "../../test/harness/kit/case-loader.mjs";
import { observedEvidence, runOraclePrecheck } from "../../test/harness/kit/oracle-precheck.mjs";

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

/** Observed outcome for a verify case, read off the oracle's own exit and drift list. */
export function observedOutcome(caseManifest, oracleRun) {
  const drifted = (oracleRun.report?.drifted || []).map((d) => d.key);
  const exit = oracleRun.exit_code;
  if (caseManifest.role === "defect") {
    const hit = caseManifest.defect_key && drifted.includes(caseManifest.defect_key);
    return hit && exit === 1 ? "defect-detected" : "missed-defect";
  }
  const dirty = exit !== 0 || drifted.length > 0 || (oracleRun.report?.violations || []).length > 0;
  return dirty ? "false-positive" : "clean";
}

/**
 * One real verify invocation: bind the declared path, materialize a fresh copy,
 * run the keyless oracle, write the report at the bound path only.
 *
 * `oracle` is injectable for exactly one purpose: the derivation control in
 * `grd-04-named-path.test.mjs`, which proves the report's outcome is computed from
 * the oracle's own exit and drift list. Every detection assertion uses the real,
 * keyless `verify-catalog.mjs`.
 */
export function runVerifyCase(caseId, { keep = false, oracle = runOraclePrecheck } = {}) {
  const caseManifest = loadCase(caseId);
  const invocation = freshInvocationDir(caseId);
  // Binding happens before any copy or write, so a refusal leaves the dir empty.
  const boundPath = bindReportPath(caseManifest, invocation.dir);
  materialize(caseManifest, invocation);
  const protectedBefore = protectedSnapshot(invocation.dir);
  const oracleRun = oracle(invocation.dir, { platform: caseManifest.platform });
  const evidence = observedEvidence(invocation.dir, caseManifest, oracleRun);
  const observed = observedOutcome(caseManifest, oracleRun);
  // Read off the oracle's own drift list, never echoed back from the manifest.
  const observedDefectKey =
    observed === "defect-detected" ? evidence.drifted_keys.find((key) => key === caseManifest.defect_key) ?? null : null;

  const report = {
    schema_version: "verify-report/v1",
    invocation_id: invocation.invocationId,
    case_id: caseManifest.case_id,
    harness: caseManifest.harness,
    track: caseManifest.track,
    verification_scope: caseManifest.verification_scope,
    expected_defect_key: caseManifest.defect_key,
    observed_defect_key: observedDefectKey,
    observed_verify_outcome: observed,
    missed_defect: observed === "missed-defect",
    clean_project_failed: observed === "false-positive",
    denied_tool_call: false,
    process_exit_code: oracleRun.exit_code,
    could_not_run_reason: oracleRun.report === null ? `oracle output unparseable: ${oracleRun.parse_error}` : null,
    evidence: { ...evidence, oracle_command: oracleRun.command },
  };
  writeObservedReport(boundPath, report);

  const protectedAfter = protectedSnapshot(invocation.dir);
  const result = {
    case_id: caseId,
    role: caseManifest.role,
    invocation,
    bound_path: boundPath,
    report_relative_path: caseManifest.report_relative_path,
    overlay_changed: invocation.overlay_changed,
    reports_listing: listDir(path.join(invocation.dir, "reports")),
    report,
    report_sha256: sha256File(boundPath),
    oracle: { exit_code: oracleRun.exit_code, drifted_keys: evidence.drifted_keys },
    evidence,
    protected_before: protectedBefore,
    protected_after: protectedAfter,
    protected_unchanged: JSON.stringify(protectedBefore) === JSON.stringify(protectedAfter),
    dir: invocation.dir,
  };
  if (!keep) {
    rmSync(invocation.dir, { recursive: true, force: true });
  }
  return result;
}

/** Swap the planted report body into the clean slot: a static copy must not pass. */
export function swappedTwin({ keep = false } = {}) {
  const planted = runVerifyCase("verify-button-drift", { keep: true });
  const clean = runVerifyCase("verify-clean", { keep: true });
  const plantedBody = readFileSync(planted.bound_path);
  writeFileSync(clean.bound_path, plantedBody);
  const tampered = {
    ...clean,
    report: JSON.parse(plantedBody.toString("utf8")),
    report_sha256: sha256(plantedBody),
  };
  const verdict = validatePair({
    planted: { caseManifest: loadCase("verify-button-drift"), invocation: planted.invocation, report: planted.report, sha256: planted.report_sha256 },
    clean: { caseManifest: loadCase("verify-clean"), invocation: clean.invocation, report: tampered.report, sha256: tampered.report_sha256 },
  });
  const result = { verdict, planted_sha256: planted.report_sha256, clean_sha256: tampered.report_sha256, clean_invocation: clean.invocation };
  if (!keep) for (const dir of [planted.dir, clean.dir]) rmSync(dir, { recursive: true, force: true });
  return result;
}

/** A clean control that reported a false positive must not be graded pass. */
export function falsePositiveClean({ keep = false } = {}) {
  const planted = runVerifyCase("verify-button-drift", { keep: true });
  const clean = runVerifyCase("verify-clean", { keep: true });
  const faked = {
    ...clean.report,
    observed_verify_outcome: "false-positive",
    clean_project_failed: true,
  };
  const verdict = validatePair({
    planted: { caseManifest: loadCase("verify-button-drift"), invocation: planted.invocation, report: planted.report, sha256: planted.report_sha256 },
    clean: { caseManifest: loadCase("verify-clean"), invocation: clean.invocation, report: faked, sha256: clean.report_sha256 },
  });
  const result = { verdict, clean_invocation: clean.invocation };
  if (!keep) for (const dir of [planted.dir, clean.dir]) rmSync(dir, { recursive: true, force: true });
  return result;
}

/** A missing planted report on an otherwise evaluable run is `report-missing`. */
export function missingPlantedReport() {
  const planted = runVerifyCase("verify-button-drift", { keep: true });
  const clean = runVerifyCase("verify-clean", { keep: true });
  rmSync(planted.bound_path, { force: true });
  const verdict = validatePair({
    planted: { caseManifest: loadCase("verify-button-drift"), invocation: planted.invocation, report: null, sha256: null },
    clean: { caseManifest: loadCase("verify-clean"), invocation: clean.invocation, report: clean.report, sha256: clean.report_sha256 },
  });
  const result = { verdict, deleted_path: planted.bound_path, planted_listing: listDir(path.join(planted.dir, "reports")) };
  for (const dir of [planted.dir, clean.dir]) rmSync(dir, { recursive: true, force: true });
  return result;
}

/**
 * AC-1's GIVEN: download the run's attempt-qualified `verify-reports` artifact and
 * read both reports at their declared paths.
 *
 * Without a live run this is `not-executed` with its reason — never a pass and never
 * a failure, because the artifact is produced by T7's `harness-eval` workflow.
 */
export function readDeclaredReportsFromArtifact({
  runId = process.env.HARNESS_EVAL_RUN_ID,
  attempt = process.env.HARNESS_EVAL_RUN_ATTEMPT || "1",
  repo = process.env.HARNESS_EVAL_REPO || "hackerpug-ai/pixel-perfect",
} = {}) {
  if (!runId) {
    return {
      status: "not-executed",
      leg: "verify-reports-artifact",
      owner: "T7",
      reason: "no HARNESS_EVAL_RUN_ID: the verify-reports artifact is produced by T7's harness-eval workflow",
    };
  }
  const dir = mkdtempSync(path.join(tmpdir(), `pp-artifact-${runId}-`));
  const artifact = `harness-eval-verify-reports-${runId}-${attempt}`;
  const res = spawnSync("gh", ["run", "download", String(runId), "--repo", repo, "-n", artifact, "-D", dir], {
    encoding: "utf8",
    timeout: 120_000,
  });
  if (res.status !== 0) {
    throw new Error(`gh run download ${artifact} failed: ${(res.stderr || res.stdout || "").trim()}`);
  }
  const read = (caseId) => {
    const rel = loadCase(caseId).report_relative_path;
    const abs = path.join(dir, rel);
    if (!existsSync(abs)) throw new Error(`${rel} is absent from artifact ${artifact} — fail report-missing`);
    return { path: abs, report: JSON.parse(readFileSync(abs, "utf8")) };
  };
  return {
    status: "observed",
    leg: "verify-reports-artifact",
    dir,
    artifact,
    planted: read("verify-button-drift"),
    clean: read("verify-clean"),
  };
}

/** Facts a status reply must state, read off the materialized manifest. */
export function deriveFacts(projectDir, platformKey) {
  const manifest = JSON.parse(readFileSync(path.join(projectDir, "design/manifest.json"), "utf8"));
  const platform = manifest.platforms[platformKey];
  if (!platform) throw new Error(`no platform ${platformKey} in the materialized manifest`);
  return {
    platform: platformKey,
    phase: platform.phase,
    gates: { ...(platform.gates || {}) },
    inventory: {
      atoms: (platform.atoms || []).length,
      molecules: (platform.molecules || []).length,
      screens: (platform.screens || []).length,
    },
  };
}

/** Every leaf fact where two status fixtures differ. One entry means exactly one fact. */
export function diffFacts(a, b, prefix = "") {
  const out = [];
  for (const key of new Set([...Object.keys(a || {}), ...Object.keys(b || {})])) {
    const path_ = prefix ? `${prefix}.${key}` : key;
    const av = a?.[key];
    const bv = b?.[key];
    if (av && bv && typeof av === "object" && typeof bv === "object") out.push(...diffFacts(av, bv, path_));
    else if (JSON.stringify(av) !== JSON.stringify(bv)) out.push({ path: path_, a: av, b: bv });
  }
  return out;
}

/** One status case: bound path, fresh copy, declared single-fact mutation, derived facts. */
export function runStatusCase(caseId) {
  const caseManifest = loadCase(caseId);
  const invocation = freshInvocationDir(caseId);
  const boundPath = bindReportPath(caseManifest, invocation.dir);
  materialize(caseManifest, invocation);
  const mutation = applyFactsMutation(caseManifest, invocation);
  const platformKey = caseManifest.platform_arg.replace(/^--platform\s+/, "").trim();
  const facts = deriveFacts(invocation.dir, platformKey);
  const result = { caseManifest, invocation, boundPath, mutation, facts };
  rmSync(invocation.dir, { recursive: true, force: true });
  return result;
}

/** One first-question case: a genuinely empty project directory. */
export function runFirstQuestionCase(caseId) {
  const caseManifest = loadCase(caseId);
  // This runner builds a fresh, empty directory and nothing else, so a case
  // declaring any other fixture kind cannot be graded here — it is refused, not
  // silently graded as empty.
  if (caseManifest.fixture?.kind !== "fresh-empty-dir") {
    throw new CaseInvalid(caseId, `fixture kind ${JSON.stringify(caseManifest.fixture?.kind)} is not fresh-empty-dir`);
  }
  const invocation = freshInvocationDir(caseId);
  const boundPath = bindReportPath(caseManifest, invocation.dir);
  const listing = listDir(invocation.dir);
  const present = (caseManifest.fixture.must_not_contain || []).filter((rel) => listing.some((e) => e === rel || e.startsWith(`${rel}/`)));
  const result = { caseManifest, invocation, boundPath, listing, present };
  rmSync(invocation.dir, { recursive: true, force: true });
  return result;
}

export function confinementCase(name) {
  const base = loadCase("verify-button-drift");
  const invocation = freshInvocationDir(`confinement-${name}`);
  const record = { sub_case: name, invocation_dir: invocation.dir, refused: false, code: null, why: null, listing_before: null, listing_after: null };

  try {
    if (name === "traversal-escape") {
      record.listing_before = listDir(invocation.dir);
      bindReportPath({ ...base, report_relative_path: "../escape.json" }, invocation.dir);
    } else if (name === "traversal-inner") {
      // Resolves INSIDE the invocation directory, so the containment check alone
      // would let it through: only the `..` segment guard refuses it.
      record.listing_before = listDir(invocation.dir);
      bindReportPath({ ...base, report_relative_path: "reports/../escape.json" }, invocation.dir);
    } else if (name === "absolute-escape") {
      record.listing_before = listDir(invocation.dir);
      bindReportPath({ ...base, report_relative_path: "/tmp/pp-escape.json" }, invocation.dir);
    } else if (name === "symlink-escape") {
      const elsewhere = freshInvocationDir("symlink-target");
      symlinkSync(elsewhere.dir, path.join(invocation.dir, "reports"), "dir");
      record.symlink_target = elsewhere.dir;
      record.listing_before = listDir(invocation.dir);
      bindReportPath(base, invocation.dir);
    } else if (name === "decoy-file") {
      mkdirSync(path.join(invocation.dir, "reports"), { recursive: true });
      writeFileSync(path.join(invocation.dir, "reports/verify-button-drift.backup.json"), "{}\n", "utf8");
      record.decoy_planted = "reports/verify-button-drift.backup.json";
      record.listing_before = listDir(invocation.dir);
      const bound = bindReportPath(base, invocation.dir);
      record.bound_path = bound;
      record.bound_relative = path.relative(invocation.dir, bound).split(path.sep).join("/");
      record.bound_is_declared = record.bound_relative === base.report_relative_path;
      record.decoy_selected = /\.backup\.json$/.test(bound);
    } else {
      throw new Error(`unknown confinement case ${name}`);
    }
  } catch (err) {
    if (!(err instanceof CasePathRefused)) throw err;
    record.refused = true;
    record.code = err.code;
    record.why = err.why;
  } finally {
    record.listing_after = listDir(invocation.dir);
    if (record.symlink_target) {
      record.symlink_target_listing_after = listDir(record.symlink_target);
      rmSync(record.symlink_target, { recursive: true, force: true });
    }
    rmSync(invocation.dir, { recursive: true, force: true });
  }
  return record;
}

export function declaredPathCase({ keep = true } = {}) {
  return runVerifyCase("verify-button-drift", { keep });
}

export function cleanTwinCase() {
  const planted = runVerifyCase("verify-button-drift", { keep: true });
  const clean = runVerifyCase("verify-clean", { keep: true });
  const verdict = validatePair({
    planted: { caseManifest: loadCase("verify-button-drift"), invocation: planted.invocation, report: planted.report, sha256: planted.report_sha256 },
    clean: { caseManifest: loadCase("verify-clean"), invocation: clean.invocation, report: clean.report, sha256: clean.report_sha256 },
  });
  const result = {
    verdict,
    planted,
    clean,
    distinct_invocation_ids: planted.report.invocation_id !== clean.report.invocation_id,
    distinct_report_paths: planted.bound_path !== clean.bound_path,
  };
  for (const dir of [planted.dir, clean.dir]) rmSync(dir, { recursive: true, force: true });
  return result;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function main(argv) {
  const [flow, ...rest] = argv;
  const flag = (name) => {
    const i = rest.indexOf(`--${name}`);
    return i === -1 ? undefined : rest[i + 1];
  };
  const expect = flag("expect") || "red";
  const which = flag("case") || flag("fixture");

  let payload;
  let observed;
  if (flow === "grd-04") {
    if (which === "declared-path") {
      payload = declaredPathCase();
      observed = payload.report.observed_verify_outcome === "defect-detected" ? "green" : "red";
    } else {
      payload = confinementCase(which);
      const wroteNothing =
        JSON.stringify(payload.listing_after) === JSON.stringify(payload.listing_before) &&
        (payload.sub_case !== "symlink-escape" || (payload.symlink_target_listing_after || []).length === 0);
      // A refusal is red. So is a decoy that could not displace the declared path.
      const rejected = payload.refused
        ? payload.refused && wroteNothing
        : payload.bound_is_declared === true && payload.decoy_selected === false;
      payload.negative_control_rejected = rejected;
      observed = rejected ? "red" : "green";
    }
  } else if (flow === "grd-05") {
    if (which === "clean-twin") {
      payload = cleanTwinCase();
      observed = payload.verdict.ok ? "green" : "red";
    } else if (which === "swapped-twin") {
      payload = swappedTwin();
      observed = payload.verdict.ok ? "green" : "red";
    } else if (which === "false-positive") {
      payload = falsePositiveClean();
      observed = payload.verdict.ok ? "green" : "red";
    } else {
      throw new Error(`grd-05 has no fixture ${which}`);
    }
  } else if (flow === "jrn-planted-twin") {
    if (which !== "missing-planted-report") throw new Error(`jrn-planted-twin has no fixture ${which}`);
    payload = missingPlantedReport();
    observed = payload.verdict.ok ? "green" : "red";
  } else {
    throw new Error(`unknown flow ${flow}`);
  }

  const ok = observed === expect;
  process.stdout.write(`${JSON.stringify({ flow, case: which, expect, observed, ok, detail: payload }, null, 2)}\n`);
  return ok ? 0 : 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exit(main(process.argv.slice(2)));
  } catch (err) {
    process.stderr.write(`${err.stack || err.message}\n`);
    process.exit(1);
  }
}
