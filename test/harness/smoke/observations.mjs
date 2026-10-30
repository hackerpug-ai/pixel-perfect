// The four negative-control observations, and the merge that carries them out of the smoke job.
//
// Each producer answers ONE question from what the run really measured, and returns
// `{ verdict, reason, evidence }` — or `null` when the run genuinely did not observe the control.
// `null` is the important half: it is what keeps an unobserved control at could-not-run /
// control-unobservable instead of letting a default fill the gap.
//
// The observations ride on the cell records, because `cell/cell.json` is the only channel that
// leaves the smoke job (the upload ships that one path and nothing else). `cells/controls.json`
// remains the ONLY thing the recorder routes into `.controls[]`, so a per-cell observation can
// never impersonate one of the four rows.
import { existsSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { approveIdentity, installationIdentity, manifestDigest } from "../adapters/claude-code.mjs";
import { scanTree } from "./image-scan.mjs";

/** The reason an unobserved control carries. The controls module owns the vocabulary; this names it once. */
export const UNOBSERVABLE_REASON = "control-unobservable";

/** The field of the cell record the observations travel on. Additive: the schema does not forbid it. */
export const CONTROL_OBSERVATIONS_FIELD = "control_observations";

const IDS = Object.freeze(["missing-key", "stale-cache", "exit0-denied-read", "hidden-image-judge"]);

/** A real observation, or null. Anything that cannot be observed is expressed as null, never a guess. */
function observation(verdict, reason, evidence = {}) {
  return { verdict, reason, evidence: { ...evidence } };
}

/**
 * `missing-key` — the keyless control step's own row. Observed only when the guard refused with its
 * own reason, made zero model requests, and no child ever started: a refusal recorded after a spawn
 * would carry the same reason while proving nothing.
 */
export function observeMissingKey({ row } = {}) {
  if (!row || row.control_id !== "missing-key") return null;
  if (row.verdict !== "could-not-run" || row.reason !== "missing-api-key") return null;
  if (row.model_requests !== 0 || row.child_ran !== false) return null;
  return observation("could-not-run", "missing-api-key", {
    model_request_count: row.model_requests,
    child_ran: row.child_ran,
    capture_path: row.capture_path ?? null,
  });
}

/**
 * `stale-cache` — `approveIdentity` fed the checkout payload's digest as expected and a stale copy's
 * digest as observed. The refusal is the observation; a pair of matching digests approves, so nothing
 * was observed and the control is not this run's.
 */
export function observeStaleCache({
  checkoutRoot,
  staleRoot,
  mutatedFile = null,
  observedCliVersion = null,
  requestedCliVersion = null,
  pluginLoadEvidence = null,
} = {}) {
  if (!checkoutRoot || !staleRoot) return null;
  const expected = manifestDigest(checkoutRoot);
  const observed = manifestDigest(staleRoot);
  if (expected === null || observed === null) return null;
  const version = observedCliVersion ?? requestedCliVersion;
  let identity;
  try {
    identity = installationIdentity({
      requested_cli_version: requestedCliVersion,
      resolved_cli_version: requestedCliVersion,
      observed_cli_version: version,
      install_mode: "checkout",
      plugin_revision: null,
      expected_plugin_manifest_sha256: expected,
      observed_plugin_manifest_sha256: observed,
      // The identity exists here to reach the digest comparison, which is decided first: these two
      // fields are only read when the digests agree, and then the control is not observed at all.
      loaded_plugin_root: checkoutRoot,
      plugin_load_evidence: pluginLoadEvidence ?? `manifest digests compared: ${expected.slice(0, 12)}… (checkout) vs ${observed.slice(0, 12)}… (observed payload)`,
    });
  } catch {
    return null;
  }
  const decision = approveIdentity(identity, { requested_cli_version: requestedCliVersion ?? version });
  if (decision.ok) return null;
  if (decision.reason !== "installation-identity-mismatch") return null;
  return observation("could-not-run", "installation-identity-mismatch", {
    field: decision.detail?.field ?? null,
    expected: decision.detail?.expected ?? expected,
    observed: decision.detail?.observed ?? observed,
    mutated_file: mutatedFile,
    checkout_root: checkoutRoot,
    stale_root: staleRoot,
  });
}

/**
 * `exit0-denied-read` — a guarded invocation that exited 0 while its own stream carries a required
 * denial. The clean exit is recorded beside the denial precisely so a reader cannot mistake the
 * status for the verdict.
 */
export function observeExit0DeniedRead({ record, check = null } = {}) {
  if (!record) return null;
  const exitCode = record.process_status?.exit_code;
  if (exitCode !== 0) return null;
  const denial = (record.observations ?? []).find(
    (entry) => entry.kind === "permission_denied" && entry.required_read === true,
  );
  if (!denial) return null;
  return observation("fail", "denied_tool_call", {
    process_exit_code: exitCode,
    check,
    operation: denial.operation ?? null,
    target: denial.target ?? null,
    required_read: true,
    stream_offset: denial.stream_offset,
    stream_end_offset: denial.stream_end_offset,
    raw_sha256: denial.raw_sha256,
    invocation_id: record.invocation_id ?? null,
  });
}

/**
 * `hidden-image-judge` — the scanner over the verify child tree(s). A tree it could not read yields
 * no observation, so the control stays unobservable rather than passing on an empty scan.
 */
export function observeHiddenImageJudge({ roots = [] } = {}) {
  const scan = scanTree({ roots });
  if (scan === null) return null;
  const evidence = {
    files_scanned: scan.files_scanned,
    tree_sha256: scan.tree_sha256,
    roots: scan.roots,
  };
  if (scan.verdict === "pass") return observation("pass", "no-image-judge-in-child-tree", evidence);
  return observation("fail", "image-judge-in-child-tree", {
    ...evidence,
    findings: scan.findings.map((finding) => ({ file: finding.file, offset: finding.offset, kind: finding.kind })),
  });
}

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
  return mergeObservations(
    ...walkJson(resolve(cellsDir)).map((file) => {
      let record;
      try {
        record = JSON.parse(readFileSync(file, "utf8"));
      } catch {
        return null;
      }
      if (!record || typeof record !== "object" || Array.isArray(record)) return null;
      if (typeof record.harness !== "string" || typeof record.track !== "string") return null;
      return record[CONTROL_OBSERVATIONS_FIELD] ?? null;
    }),
  );
}

/** Attaches one observation to a cell record, in place of any earlier one for the same id. */
export function attachObservation(cell, id, value) {
  if (value == null) return cell;
  const existing = cell[CONTROL_OBSERVATIONS_FIELD] ?? {};
  return { ...cell, [CONTROL_OBSERVATIONS_FIELD]: { ...existing, [id]: value } };
}

/**
 * The keyless control step's merge: the row it just observed is attached to the cell record the leg
 * already wrote, because that record is the only thing that leaves this job. A leg that wrote no
 * record has nothing to carry, and says so instead of inventing one.
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
  const next = attachObservation(cell, "missing-key", value);
  const partial = `${cellFile}.partial`;
  writeFileSync(partial, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  renameSync(partial, cellFile);
  const back = JSON.parse(readFileSync(cellFile, "utf8"));
  return {
    ok: back[CONTROL_OBSERVATIONS_FIELD]?.["missing-key"]?.reason === value.reason,
    reason: null,
    cell_file: cellFile,
    observation: value,
  };
}

/** The control ids this module produces, in the controls module's order. */
export const OBSERVED_CONTROL_IDS = IDS;

/** The observations one graded claude-code leg produces, from what it measured. */
export function observeLeg({ checkoutRoot, staleRoot, mutatedFile, verifyRecord, verifyCheck, verifyRoots, observedCliVersion, requestedCliVersion }) {
  return mergeObservations({
    "stale-cache": observeStaleCache({ checkoutRoot, staleRoot, mutatedFile, observedCliVersion, requestedCliVersion }),
    "exit0-denied-read": observeExit0DeniedRead({ record: verifyRecord, check: verifyCheck }),
    "hidden-image-judge": observeHiddenImageJudge({ roots: verifyRoots ?? [] }),
  });
}
