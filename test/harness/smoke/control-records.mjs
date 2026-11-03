// control-records.mjs — the merge that carries the control observations out of the smoke job.
//
// The producers (the `observe*` functions in `observations.mjs`) each answer ONE question from
// what the run really measured; this module owns the carry half: merging observation sets per
// control id, reading the observations back out of a cells dir, and attaching them to — or reading
// them back from — `cell/cell.json`, the only channel that leaves the smoke job. `observations.mjs`
// re-exports every exported name here, so importers keep importing from one module.
//
// The observations ride on the cell records, because `cell/cell.json` is the only channel that
// leaves the smoke job (the upload ships that one path and nothing else). `cells/controls.json`
// remains the ONLY thing the recorder routes into `.controls[]`, so a per-cell observation can
// never impersonate one of the four rows.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

import { ReadBackMismatch, writeDurable } from "../lib/write-durable.mjs";
import { CONTROL_OBSERVATIONS_FIELD, CONTROL_PAIRS_FIELD, observeMissingKey } from "./observations.mjs";

/**
 * Merge observation sets per control id. A later NON-NULL observation wins, because two legs can
 * produce the same control (both claude-code tracks) and a leg that produced nothing must not
 * clobber the leg that did. A null never erases a real observation.
 */
export function mergeObservations(...sets) {
  const out = {};
  for (const set of sets) {
    if (!set || typeof set !== "object") continue;
    for (const [id, value] of Object.entries(set)) {
      if (value == null) continue;
      out[id] = value;
    }
  }
  return out;
}

/**
 * Parses the optional `HARNESS_EVAL_CONTROL_OBSERVATIONS` job output. An unset output arrives as an
 * empty string on a runner, and `JSON.parse("")` throws — so an empty value means "no extra
 * observations", not a broken run.
 */
export function parseObservations(text) {
  if (text === undefined || text === null) return {};
  const trimmed = String(text).trim();
  if (trimmed === "") return {};
  const parsed = JSON.parse(trimmed);
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new TypeError(`HARNESS_EVAL_CONTROL_OBSERVATIONS must be a JSON object, got ${Array.isArray(parsed) ? "array" : typeof parsed}`);
  }
  return parsed;
}

/** Every `*.json` record under a cells dir, in a deterministic order. A missing dir is no records. */
function walkJson(dir, out = []) {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walkJson(full, out);
    else if (entry.isFile() && entry.name.endsWith(".json")) out.push(full);
  }
  return out;
}

/**
 * The observations the smoke legs attached to their own cell records, read back out of the cells dir
 * the download job already fetched. Only a cell record carries them; anything else is ignored.
 */
export function mergeObservationsFromCells(cellsDir) {
  return mergeObservations(...cellRecords(cellsDir).map((record) => record[CONTROL_OBSERVATIONS_FIELD] ?? null));
}

/** The paired observations the same records carry, merged the same way. */
export function mergePairsFromCells(cellsDir) {
  return mergeObservations(...cellRecords(cellsDir).map((record) => record[CONTROL_PAIRS_FIELD] ?? null));
}

/** Every parsed cell record under a cells dir, in a deterministic order. */
function cellRecords(cellsDir) {
  return walkJson(resolve(cellsDir))
    .map((file) => {
      try {
        return JSON.parse(readFileSync(file, "utf8"));
      } catch {
        return null;
      }
    })
    .filter((record) => record && typeof record === "object" && !Array.isArray(record))
    .filter((record) => typeof record.harness === "string" && typeof record.track === "string");
}

/** Attaches one observation to a cell record, in place of any earlier one for the same id. */
export function attachObservation(cell, id, value) {
  if (value == null) return cell;
  const existing = cell[CONTROL_OBSERVATIONS_FIELD] ?? {};
  return { ...cell, [CONTROL_OBSERVATIONS_FIELD]: { ...existing, [id]: value } };
}

/** Attaches the paired observation that makes a control discriminate rather than merely fire. */
export function attachPair(cell, id, value) {
  if (value == null) return cell;
  const existing = cell[CONTROL_PAIRS_FIELD] ?? {};
  return { ...cell, [CONTROL_PAIRS_FIELD]: { ...existing, [id]: value } };
}

/**
 * The keyless control step's merge: the row it just observed is attached to the cell record the leg
 * already wrote, because that record is the only thing that leaves this job. A leg that wrote no
 * record has nothing to carry, and says so instead of inventing one.
 *
 * The PAIR already on that record is kept, never overwritten: it is the authenticated admission the
 * leg measured, and this step holds no credential, so anything it could write here would be a claim.
 * `pair` in the receipt says whether the leg's pair survived, so a hosted run can tell a control that
 * discriminates from one that only refuses.
 */
export function attachMissingKey({ row, cellFile, capturePath = null } = {}) {
  const value = observeMissingKey({ row: { ...row, capture_path: capturePath ?? row?.capture_path ?? null } });
  if (value === null) return { ok: false, reason: "not-observed" };
  if (!existsSync(cellFile)) return { ok: false, reason: "no-cell-record", cell_file: cellFile };
  let cell;
  try {
    cell = JSON.parse(readFileSync(cellFile, "utf8"));
  } catch {
    return { ok: false, reason: "cell-record-unreadable", cell_file: cellFile };
  }
  const carried = cell[CONTROL_PAIRS_FIELD]?.["missing-key"] ?? null;
  const next = attachObservation(cell, "missing-key", value);
  // The read-back a durable write is counted by: the observation must come back carrying the
  // reason this step measured.
  const compare = (path) => {
    const back = JSON.parse(readFileSync(path, "utf8"));
    return { ok: back[CONTROL_OBSERVATIONS_FIELD]?.["missing-key"]?.reason === value.reason, read_back: back };
  };
  let outcome;
  try {
    outcome = writeDurable(cellFile, `${JSON.stringify(next, null, 2)}\n`, { compare }).result;
  } catch (error) {
    if (!(error instanceof ReadBackMismatch)) throw error;
    outcome = error.result;
  }
  const back = outcome.read_back;
  return {
    ok: outcome.ok,
    reason: null,
    cell_file: cellFile,
    observation: value,
    pair: back[CONTROL_PAIRS_FIELD]?.["missing-key"] != null,
    pair_carried: carried !== null,
  };
}

/**
 * The denied-write probe's own merge: `exit0-denied-read`'s observation and its pair land on the cell
 * record together, atomically, so a reader can never see one half without the other. The probe is the
 * only producer of that pair — the graded leg cannot make a denied write happen — so when it produced
 * nothing there is nothing to attach, and the row stays unobservable instead of paired to a claim.
 */
export function attachDeniedWriteProbe({ cellFile, probe } = {}) {
  const value = probe?.observation ?? null;
  const pair = probe?.pair ?? null;
  if (value == null && pair == null) return { ok: false, reason: "not-observed", cell_file: cellFile ?? null };
  if (!cellFile || !existsSync(cellFile)) return { ok: false, reason: "no-cell-record", cell_file: cellFile ?? null };
  let cell;
  try {
    cell = JSON.parse(readFileSync(cellFile, "utf8"));
  } catch {
    return { ok: false, reason: "cell-record-unreadable", cell_file: cellFile };
  }
  const next = attachPair(attachObservation(cell, "exit0-denied-read", value), "exit0-denied-read", pair);
  // The read-back a durable write is counted by: observation and pair must come back together,
  // each with the reason its own half measured.
  const compare = (path) => {
    const back = JSON.parse(readFileSync(path, "utf8"));
    const observationOk = value == null || back[CONTROL_OBSERVATIONS_FIELD]?.["exit0-denied-read"]?.reason === value.reason;
    const pairOk = pair == null || back[CONTROL_PAIRS_FIELD]?.["exit0-denied-read"]?.reason === pair.reason;
    return { ok: observationOk && pairOk };
  };
  let ok;
  try {
    ok = writeDurable(cellFile, `${JSON.stringify(next, null, 2)}\n`, { compare }).result.ok;
  } catch (error) {
    if (!(error instanceof ReadBackMismatch)) throw error;
    ok = error.result.ok;
  }
  return {
    ok,
    reason: ok ? null : "cell-record-write-unverified",
    cell_file: cellFile,
  };
}
