// VerifyReport writer: the case manifest is the only authority for where a report lands.
//
// There is no glob, no timestamp, no "newest file in reports/", and no any-new-file fallback anywhere
// in this module. The path comes out of T4's `bindReportPath`, which refuses `..`, an absolute path and
// a symlinked ancestor before a single byte is written; a refusal here is `could-not-run
// invalid-case-path`, never a report at a different location.
//
// The write is temp file in the report's own directory -> fsync -> rename -> read back. Three
// outcomes are kept strictly apart, because collapsing them is how a storage problem becomes a
// product defect (or worse, a pass):
//
//   fail            `report-missing`     — the file the case declared is not there. The run was
//                                          otherwise evaluable, so the plugin failed to produce it.
//   fail            `report-unreadable`  — the file is there but is not JSON.
//   fail            `report-mismatched-invocation` — the body belongs to another invocation.
//   could-not-run   `report-unavailable` — the store could not be written or read (EACCES, ENOSPC,
//                                          EROFS). Artifact storage is not the plugin under test.
//   could-not-run   `invalid-case-path`  — the declared path would leave the invocation directory.
import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, rmSync, statSync, writeSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

import { CasePathRefused, bindReportPath } from "../kit/case-loader.mjs";

export const REPORT_SCHEMA = "verify-report/v1";

/** The reason vocabulary a verify grade may report. Exported so a caller cannot invent one. */
export const REPORT_REASONS = Object.freeze({
  missing: "report-missing",
  unreadable: "report-unreadable",
  unavailable: "report-unavailable",
  invalidPath: "invalid-case-path",
  unbound: "report-mismatched-invocation",
  unboundEvidence: "detection-unevidenced",
});

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

const isStorageError = (error) =>
  ["EACCES", "EPERM", "EROFS", "ENOSPC", "EDQUOT", "EMFILE", "ENFILE", "EIO", "ENOTDIR", "ENOENT"].includes(error?.code);

/**
 * The one absolute path this invocation's report may occupy, or `could-not-run invalid-case-path`.
 * Pure: reads no report and writes nothing, so a refusal leaves the directory exactly as it was.
 */
export function classifyReportPath(caseManifest, invocationDir) {
  try {
    return { ok: true, path: bindReportPath(caseManifest, invocationDir) };
  } catch (error) {
    if (error instanceof CasePathRefused) {
      return { ok: false, verdict: "could-not-run", reason: REPORT_REASONS.invalidPath, why: error.why, rel: error.rel };
    }
    return { ok: false, verdict: "could-not-run", reason: REPORT_REASONS.invalidPath, why: String(error?.message ?? error), rel: caseManifest?.report_relative_path ?? null };
  }
}

/** A body is bound to the invocation that produced it; anything else is refused before it is written. */
export function assertBound(caseManifest, invocation, body) {
  const expected = invocation?.invocationId ?? null;
  const seen = body?.invocation_id ?? null;
  if (typeof seen !== "string" || seen.length === 0 || seen !== expected) {
    return { ok: false, verdict: "fail", reason: REPORT_REASONS.unbound, binding: "invocation_id", expected, seen };
  }
  const declaredCase = caseManifest?.case_id ?? null;
  if (declaredCase && body.case_id !== declaredCase) {
    return { ok: false, verdict: "fail", reason: REPORT_REASONS.unbound, binding: "case_id", expected: declaredCase, seen: body.case_id ?? null };
  }
  return { ok: true, verdict: null, reason: null };
}

/**
 * Writes the VerifyReport at the case-declared path and returns what a read-back saw.
 * Every storage failure is `could-not-run report-unavailable`; nothing here can return `pass`.
 */
export function writeVerifyReport({ caseManifest, invocation, body }) {
  const bound = classifyReportPath(caseManifest, invocation?.dir);
  if (!bound.ok) return { ...bound, wrote: 0, path: null };

  const binding = assertBound(caseManifest, invocation, body);
  if (!binding.ok) return { ...binding, wrote: 0, path: bound.path };

  const target = bound.path;
  const text = `${JSON.stringify(body, null, 2)}\n`;
  let tempPath = null;
  try {
    mkdirSync(path.dirname(target), { recursive: true });
    tempPath = `${target}.tmp-${process.pid}-${Date.now()}`;
    const fd = openSync(tempPath, "w");
    try {
      writeSync(fd, text);
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    renameSync(tempPath, target);
    tempPath = null;
  } catch (error) {
    if (tempPath) rmSync(tempPath, { force: true });
    if (!isStorageError(error)) throw error;
    return { ok: false, verdict: "could-not-run", reason: REPORT_REASONS.unavailable, path: target, code: error.code, wrote: 0 };
  }

  // Read back from disk and compare the bytes, not the intention. A short or substituted write is
  // a storage fault, so it is could-not-run rather than a grade about the plugin.
  let readBack;
  try {
    readBack = readFileSync(target);
  } catch (error) {
    if (!isStorageError(error)) throw error;
    return { ok: false, verdict: "could-not-run", reason: REPORT_REASONS.unavailable, path: target, code: error.code, wrote: 1 };
  }
  const written = Buffer.from(text);
  const digest = sha256(readBack);
  if (readBack.length !== written.length || digest !== sha256(written)) {
    return {
      ok: false,
      verdict: "could-not-run",
      reason: REPORT_REASONS.unavailable,
      path: target,
      wrote: 1,
      why: "read-back differs from the bytes written",
      byte_length: readBack.length,
      expected_byte_length: written.length,
    };
  }
  return { ok: true, path: target, sha256: digest, byte_length: readBack.length, wrote: 1, read_back: JSON.parse(readBack.toString("utf8")) };
}

/**
 * Reads the report at the case-declared path. Only an absent file is `fail report-missing`; a store
 * this process may not read is `could-not-run report-unavailable`.
 */
export function readVerifyReportAt({ caseManifest, invocation }) {
  const bound = classifyReportPath(caseManifest, invocation?.dir);
  if (!bound.ok) return bound;
  const target = bound.path;
  if (!existsSync(target) || !statSync(target).isFile()) {
    return { ok: false, verdict: "fail", reason: REPORT_REASONS.missing, path: target };
  }
  let bytes;
  try {
    bytes = readFileSync(target);
  } catch (error) {
    if (!isStorageError(error)) throw error;
    return { ok: false, verdict: "could-not-run", reason: REPORT_REASONS.unavailable, path: target, code: error.code };
  }
  let report;
  try {
    report = JSON.parse(bytes.toString("utf8"));
  } catch {
    return { ok: false, verdict: "fail", reason: REPORT_REASONS.unreadable, path: target, byte_length: bytes.length };
  }
  const binding = assertBound(caseManifest, invocation, report);
  if (!binding.ok) return { ...binding, path: target };
  return { ok: true, path: target, sha256: sha256(bytes), byte_length: bytes.length, report };
}
