// Grade records: one grade file per (harness, track, install mode, check), each citing its own evidence.
//
// A cell is the unit a dashboard reads; a grade record is the unit a reader clicks into. Both are
// written through T3's atomic writer (temp file -> fsync -> rename -> read back), so a grade that
// cannot be read back is could-not-run rather than a verdict somebody later mistakes for a pass.
import { worstVerdict } from "../lib/verdict.mjs";
import { readGrade, verifyReadBack, writeGrade } from "../runtime/grade-writer.mjs";
import { validateAgainst } from "../validate.mjs";

export { readGrade, verifyReadBack, writeGrade };

/**
 * One cell per check, carrying only that check's verdict, reason, citations and block reasons.
 * The identity fields are untouched, so two records can never overwrite each other on disk.
 */
export function perCheckCells(cell) {
  const checks = Array.isArray(cell?.checks) ? cell.checks : [];
  if (checks.length === 0) throw new Error("a cell with no checks has no grade records");
  return checks.map((check) => {
    const record = {
      ...cell,
      check_id: check.check_id,
      verdict: check.verdict,
      reason: check.reason ?? null,
      checks: [check],
      evidence_paths: check.evidence_paths ?? cell.evidence_paths ?? [],
      report_paths: cell.report_paths ?? [],
      block_reasons: (cell.block_reasons ?? []).filter((entry) => entry.check_id === check.check_id),
    };
    validateAgainst("harness-cell.v1.schema.json", record);
    return record;
  });
}

/**
 * The cell's aggregate verdict, recomputed from its own check records. Exported so a reader can prove
 * a stored cell was not hand-edited: aggregate(perCheck verdicts) must equal the stored verdict.
 */
export function aggregate(cell) {
  return worstVerdict((cell?.checks ?? []).map((check) => check.verdict));
}

/**
 * Writes one grade file per check under `dir`. Returns a receipt per record: the path, the verdict
 * that came back off disk, and whether the read-back matched the five identity fields.
 */
export function writeCellGrades({ dir, cell, now = () => Date.now() }) {
  const receipts = perCheckCells(cell).map((record) => {
    const written = writeGrade({ dir, cell: record, now });
    return {
      check_id: record.check_id,
      verdict: written.verdict,
      reason: written.reason,
      ok: written.ok,
      path: written.path,
      read_back_verdict: written.read_back?.verdict ?? null,
    };
  });
  return { dir, ok: receipts.every((receipt) => receipt.ok), receipts };
}
