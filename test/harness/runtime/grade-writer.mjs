// grade-writer: one grade file per harness x version track x install mode x check.
//
// The writer never takes an API key and never derives a verdict from an exit code. It writes through
// a temp file in the grade directory, fsyncs it, renames it in the same directory, then reads it back
// from disk and compares the five identity fields. A mismatch, a partial file, or a citation that no
// longer resolves is could-not-run — a grade that cannot be read back is not a pass.
import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, rmSync, statSync, writeSync } from "node:fs";
import { join } from "node:path";

import { assertPassEvidence, validateAgainst } from "../validate.mjs";
import { worstVerdict } from "../lib/verdict.mjs";
import { denials, observedFacts, resolveObservation } from "./capture.mjs";

export const GRADE_SCHEMA = "harness-cell/v1";
export const SOURCE = "files-and-event-stream";
/** The five fields a read-back must return unchanged before a verdict exists. */
export const IDENTITY_FIELDS = ["verdict", "harness", "version", "track", "check_id"];

function block(verdict, reason, detail = {}) {
  return { verdict, reason, ...detail };
}

/** Every cited path must be a file that is really on this disk. */
function evidenceBlocks(evidencePaths) {
  const blocks = [];
  if (!Array.isArray(evidencePaths) || evidencePaths.length === 0) {
    return [block("could-not-run", "evidence-unresolvable", { why: "no evidence path was cited" })];
  }
  for (const path of evidencePaths) {
    if (typeof path !== "string" || path.trim() === "" || !existsSync(path) || !statSync(path).isFile()) {
      blocks.push(block("could-not-run", "evidence-unresolvable", { path }));
      continue;
    }
    // A captured byte stream may legitimately be empty (a process killed before it wrote anything),
    // but any other cited artifact must carry something or it is not evidence of anything.
    const byteArtifact = /\.(stdout|stderr)\.bin$/.test(path);
    if (!byteArtifact && statSync(path).size === 0) {
      blocks.push(block("could-not-run", "evidence-unresolvable", { path, why: "empty" }));
    }
  }
  return blocks;
}

/**
 * Builds the graded cell from a capture record. The verdict comes from what the record observed —
 * termination kind, resolvable citations, required facts, required-read denials — and from nothing
 * else. A pass needs at least one observed required fact: absence of a denial is not a pass.
 */
export function gradeFromEvidence({
  record,
  installation,
  harness,
  track,
  check_id,
  evidence_paths = record?.evidence_paths ?? [],
  report_paths = [],
  required_facts = [],
  observed_verify_outcome = null,
}) {
  const blocks = [...evidenceBlocks(evidence_paths)];
  const kind = record?.termination_kind;
  if (kind === "timeout") blocks.push(block("could-not-run", "termination-timeout", { timeout_ms: record.timeout_ms ?? null }));
  if (kind === "unexpected") blocks.push(block("could-not-run", "termination-unexpected", { process_status: record.process_status ?? null }));
  if (record?.prefix_complete === false) blocks.push(block("could-not-run", "capture-prefix-incomplete", { boundary_event_offset: record.boundary_event_offset ?? null }));

  const observations = record?.observations ?? [];
  const unresolved = [];
  for (const observation of observations) {
    try {
      resolveObservation(record, observation);
    } catch (error) {
      unresolved.push({ sequence: observation.sequence ?? null, reason: error.reason ?? String(error.message ?? error) });
    }
  }
  if (unresolved.length > 0) blocks.push(block("could-not-run", "evidence-unresolvable", { unresolved }));

  const seen = observedFacts(record);
  const missingFacts = required_facts.filter((fact) => !seen.has(fact.fact_id)).map((fact) => fact.fact_id);
  if (missingFacts.length > 0) blocks.push(block("could-not-run", "required-fact-unobserved", { missing: missingFacts }));

  const denied = denials(record);
  if (denied.length > 0) {
    blocks.push(block("fail", "denied_tool_call", { denials: denied.length }));
  }

  if (blocks.length === 0) {
    // Reaching here means nothing was refused, but a required fact is what makes a pass a pass.
    blocks.push(
      required_facts.length === 0
        ? block("could-not-run", "nothing-graded", { why: "no required fact was declared, so nothing was graded" })
        : block("pass", null),
    );
  }

  const verdict = worstVerdict(blocks.map((entry) => entry.verdict));
  const winning = blocks.find((entry) => entry.verdict === verdict) ?? {};
  const firstDenial = denied[0] ?? null;

  const cell = {
    harness,
    track,
    installation,
    invocation_id: record?.invocation_id ?? null,
    check_id,
    verdict,
    reason: winning.reason ?? null,
    source: SOURCE,
    denied_tool_call: firstDenial
      ? {
          operation: firstDenial.operation ?? null,
          target: firstDenial.target ?? null,
          required_read: true,
          stream_offset: firstDenial.stream_offset,
          stream_end_offset: firstDenial.stream_end_offset,
          raw_sha256: firstDenial.raw_sha256,
        }
      : null,
    process_exit_code: Number.isInteger(record?.process_status?.exit_code) ? record.process_status.exit_code : null,
    evidence_paths: [...evidence_paths],
    report_paths: [...report_paths],
    observed_verify_outcome: observed_verify_outcome ?? (firstDenial ? "permission-denied" : null),
    checks: [{ check_id, verdict, reason: winning.reason ?? null, source: SOURCE }],
  };
  cell.block_reasons = blocks;

  validateAgainst("harness-cell.v1.schema.json", cell);
  assertPassEvidence(cell);
  return cell;
}

/** `harness.track.install_mode.check` — one file per identity, so no grade can overwrite another. */
export function gradeFileName(cell) {
  const installMode = cell?.installation?.install_mode;
  for (const field of ["harness", "track", "check_id"]) {
    if (typeof cell?.[field] !== "string" || cell[field].length === 0) {
      throw new Error(`grade identity is incomplete: ${field}`);
    }
  }
  if (typeof installMode !== "string" || installMode.length === 0) throw new Error("grade identity is incomplete: install_mode");
  return `${cell.harness}.${cell.track}.${installMode}.${cell.check_id}.json`;
}

/**
 * temp file in the grade directory -> fsync -> rename in the same directory -> read back.
 * A read-back that disagrees is could-not-run, and the unreadable grade file is removed rather than
 * left where a later reader could mistake it for a verdict.
 */
export function writeGrade({ dir, cell, now = () => Date.now() }) {
  mkdirSync(dir, { recursive: true });
  const path = join(dir, gradeFileName(cell));
  const tempPath = `${path}.tmp-${process.pid}-${now()}`;
  const text = `${JSON.stringify(cell, null, 2)}\n`;

  const fd = openSync(tempPath, "w");
  try {
    writeSync(fd, text);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  renameSync(tempPath, path);

  const readBack = readGrade(path);
  const identity = verifyReadBack(cell, readBack);
  if (!identity.ok) {
    rmSync(path, { force: true });
    return { ok: false, path, temp_path: tempPath, verdict: identity.verdict, reason: identity.reason, mismatches: identity.mismatches, read_back: readBack };
  }
  return { ok: true, path, temp_path: tempPath, verdict: identity.verdict, reason: identity.reason, read_back: readBack };
}

/** Reads a grade file from disk. A missing or unparseable file is could-not-run, never a grade. */
export function readGrade(path) {
  if (!existsSync(path)) return { ok: false, verdict: "could-not-run", reason: "grade-missing", path };
  const text = readFileSync(path, "utf8");
  try {
    return { ...JSON.parse(text), ok: true, path };
  } catch {
    return { ok: false, verdict: "could-not-run", reason: "grade-partial", path, byte_length: Buffer.byteLength(text) };
  }
}

/**
 * Compares the five identity fields of what was written against what came back.
 * `version` is the pinned/resolved CLI version the grade was computed for.
 */
export function verifyReadBack(cell, readBack) {
  if (readBack?.ok === false) {
    return { ok: false, verdict: "could-not-run", reason: readBack.reason, mismatches: [{ field: "file", value: null, expected: "readable grade" }] };
  }
  const mismatches = [];
  const compare = (field, expected, actual) => {
    if (expected !== actual) mismatches.push({ field, expected: expected ?? null, value: actual ?? null });
  };
  const written = {
    verdict: cell.verdict,
    harness: cell.harness,
    version: cell.installation?.resolved_cli_version,
    track: cell.track,
    check_id: cell.check_id,
  };
  const stored = {
    verdict: readBack.verdict,
    harness: readBack.harness,
    version: readBack.installation?.resolved_cli_version,
    track: readBack.track,
    check_id: readBack.check_id,
  };
  for (const field of IDENTITY_FIELDS) compare(field, written[field], stored[field]);

  if (mismatches.length > 0) return { ok: false, verdict: "could-not-run", reason: "read-back-mismatch", mismatches };
  return { ok: true, verdict: readBack.verdict, reason: readBack.reason ?? null, mismatches: [] };
}

