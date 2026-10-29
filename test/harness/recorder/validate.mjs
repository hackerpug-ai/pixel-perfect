// Per-record validation for the grade recorder.
//
// Nothing here decides a grade. This module decides whether a record may be ACCEPTED as a cell at
// all: the closed verdict vocabulary, the shipped schemas (a complete InstallationIdentity), and the
// twelve-unique-cell rule. A refusal is a named `RecorderRefusal`, never a partial result.
import { CHECKS, HARNESSES, TRACKS } from "../pins.mjs";
import { VERDICTS, validateAgainst } from "../validate.mjs";

export { VERDICTS };

export class RecorderRefusal extends Error {
  constructor(reason, details = {}) {
    super(`${reason}: ${JSON.stringify(details)}`);
    this.name = "RecorderRefusal";
    this.reason = reason;
    this.details = details;
  }
}

const EXPECTED_CELLS = HARNESSES.length * TRACKS.length;

// A bare smoke cell carries no grade record, so the only verdict it may claim is that it could not
// run. Anything else would be a verdict without the evidence a verdict requires.
const BARE_CELL_STATES = ["could-not-run"];

const pairOf = (cell) => `${cell.harness}/${cell.track}`;

/**
 * Twelve cells: exactly one per (harness, track). A duplicate is refused by name before a missing
 * cell is reported, so an eleven-cell result can never be completed by a duplicate.
 */
export function enforceTwelveCells(cells) {
  const pairs = cells.map(pairOf);
  const duplicates = [...new Set(pairs.filter((pair, index) => pairs.indexOf(pair) !== index))];
  if (duplicates.length > 0) throw new RecorderRefusal("cells-duplicate", { duplicates });

  const seen = new Set(pairs);
  const missing = HARNESSES.flatMap((harness) =>
    TRACKS.filter((track) => !seen.has(`${harness}/${track}`)).map((track) => `${harness}/${track}`),
  );
  if (missing.length > 0 || cells.length !== EXPECTED_CELLS) {
    throw new RecorderRefusal("cells-incomplete", { expected: EXPECTED_CELLS, got: cells.length, missing });
  }
  return { cells: cells.length, harnesses: new Set(cells.map((cell) => cell.harness)).size, pairs: seen.size };
}

function pinnedVersion(pins, harness) {
  return pins?.manifest?.harnesses?.[harness]?.pinned_cli_version ?? null;
}

function bareCell(record, { pins, installMode }) {
  const pair = pairOf(record);
  const state = record.cell_state;
  if (state === undefined || state === null) {
    throw new RecorderRefusal("cell-verdict-missing", { cell: pair, why: "no verdict and no cell_state in the record" });
  }
  if (!BARE_CELL_STATES.includes(state)) {
    throw new RecorderRefusal("cell-state-not-a-verdict", { cell: pair, cell_state: state, allowed: BARE_CELL_STATES });
  }
  const reason = String(record.reason ?? "").trim();
  if (reason === "") throw new RecorderRefusal("cell-reason-missing", { cell: pair, why: "a could-not-run cell names its reason" });
  // The pinned request comes from the pins authority; the newest request is only knowable from the
  // run's own lookup, which a bare cell did not perform — so it is null, never substituted.
  const requested = record.track === "pinned" ? pinnedVersion(pins, record.harness) : null;
  return {
    harness: record.harness,
    track: record.track,
    installation: {
      requested_cli_version: requested,
      resolved_cli_version: requested,
      observed_cli_version: null,
      install_mode: installMode ?? record.install_mode,
      plugin_revision: null,
      expected_plugin_manifest_sha256: null,
      observed_plugin_manifest_sha256: null,
      loaded_plugin_root: null,
      plugin_load_evidence: null,
    },
    verdict: "could-not-run",
    reason,
    invocation_id: null,
    check_id: null,
    process_exit_code: null,
    source: "smoke-cell",
    denied_tool_call: null,
    evidence_paths: [],
    report_paths: [],
    observed_verify_outcome: null,
    checks: CHECKS.map((check_id) => ({ check_id, verdict: "could-not-run", reason, source: "smoke-cell" })),
  };
}

/**
 * One record → one validated cell. A record carrying a `verdict` is a grade record and must satisfy
 * the closed vocabulary and the shipped schema; a bare smoke record is present-as-could-not-run.
 */
export function toHarnessCell(record, { pins = null, installMode = null } = {}) {
  const harness = record?.harness;
  const track = record?.track;
  if (!HARNESSES.includes(harness)) throw new RecorderRefusal("cell-harness-unknown", { harness: harness ?? null });
  if (!TRACKS.includes(track)) throw new RecorderRefusal("cell-track-unknown", { track: track ?? null });

  let cell;
  if (record.verdict !== undefined) {
    if (!VERDICTS.includes(record.verdict)) {
      throw new RecorderRefusal("verdict-vocabulary", { cell: pairOf(record), verdict: record.verdict, allowed: VERDICTS });
    }
    cell = { ...record };
  } else {
    cell = bareCell(record, { pins, installMode });
  }
  // InstallationIdentity completeness and every other structural rule come from the shipped schema.
  validateAgainst("harness-cell.v1.schema.json", cell);
  // One run is one install mode, whatever shape the record arrived in: a cell from another mode can
  // never be counted as this run's cell.
  if (installMode && cell.installation.install_mode !== installMode) {
    throw new RecorderRefusal("cell-install-mode-mismatch", {
      cell: pairOf(cell),
      cell_install_mode: cell.installation.install_mode,
      run_install_mode: installMode,
    });
  }
  return cell;
}

/** Validate every record, then enforce the cell set. Order matters: one bad record blocks first. */
export function collectCells(records, { pins = null, installMode = null } = {}) {
  const cells = (records ?? []).map((record) => toHarnessCell(record, { pins, installMode }));
  enforceTwelveCells(cells);
  return cells;
}
