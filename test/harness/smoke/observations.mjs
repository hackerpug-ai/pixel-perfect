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
import { existsSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";

import { approveIdentity, installationIdentity, manifestDigest } from "../adapters/claude-code.mjs";
import { resolveEvidencePath } from "../runtime/capture.mjs";
import { scanTree } from "./image-scan.mjs";

/** The reason an unobserved control carries. The controls module owns the vocabulary; this names it once. */
export const UNOBSERVABLE_REASON = "control-unobservable";

/** The one image block the planted twin appends: a screenshot reaching a model request. */
const IMAGE_BLOCK_LINE = Object.freeze({
  type: "assistant",
  message: {
    content: [{ type: "image", source: { type: "base64", media_type: "image/png", data: "iVBORw0KGgoAAAANSUhEUg==" } }],
  },
});

/** The field of the cell record the observations travel on. Additive: the schema does not forbid it. */
export const CONTROL_OBSERVATIONS_FIELD = "control_observations";
/** The paired observations travel beside them, so `recordControl` can COMPUTE discrimination. */
export const CONTROL_PAIRS_FIELD = "control_pairs";

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
 *
 * `planted` is recorded in the evidence whenever the mismatch was produced by a deliberate one-byte
 * drift (`cell.mjs`'s `staleCopy`) rather than found in the run's own payload, so no reader can
 * mistake a constructed negative control for a run that really drifted.
 */
export function observeStaleCache({
  checkoutRoot,
  staleRoot,
  mutatedFile = null,
  observedCliVersion = null,
  requestedCliVersion = null,
  pluginLoadEvidence = null,
  planted = false,
} = {}) {
  if (!checkoutRoot || !staleRoot) return null;
  const expected = manifestDigest(checkoutRoot);
  const observed = manifestDigest(staleRoot);
  if (expected === null || observed === null) return null;
  const version = observedCliVersion ?? requestedCliVersion;
  let identity;
  try {
    // The version is held equal on both sides so ONLY the digest rule can decide: this control is
    // about a payload that moved, and a version disagreement would answer a different question.
    identity = installationIdentity({
      requested_cli_version: version,
      resolved_cli_version: version,
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
  const decision = approveIdentity(identity, { requested_cli_version: version });
  if (decision.ok) return null;
  if (decision.reason !== "installation-identity-mismatch") return null;
  // Only a DIGEST refusal belongs to this control; anything else is a different rule's answer.
  if (decision.detail?.field !== "observed_plugin_manifest_sha256") return null;
  return observation("could-not-run", "installation-identity-mismatch", {
    field: decision.detail?.field ?? null,
    expected: decision.detail?.expected ?? expected,
    observed: decision.detail?.observed ?? observed,
    mutated_file: mutatedFile,
    checkout_root: checkoutRoot,
    stale_root: staleRoot,
    planted,
  });
}

/**
 * The paired half of `stale-cache`: the SAME identity rule on a matching digest, which must approve.
 * A control whose pair came out the same way proves failure, not discrimination, so this is the
 * observation that lets `recordControl` compute `discriminates` instead of leaving it false forever.
 */
export function observeStaleCachePair({
  checkoutRoot,
  observedCliVersion = null,
  requestedCliVersion = null,
  pluginLoadEvidence = null,
} = {}) {
  if (!checkoutRoot) return null;
  const digest = manifestDigest(checkoutRoot);
  if (digest === null) return null;
  const version = observedCliVersion ?? requestedCliVersion;
  let identity;
  try {
    identity = installationIdentity({
      requested_cli_version: requestedCliVersion,
      resolved_cli_version: requestedCliVersion,
      observed_cli_version: version,
      install_mode: "checkout",
      plugin_revision: null,
      expected_plugin_manifest_sha256: digest,
      observed_plugin_manifest_sha256: digest,
      loaded_plugin_root: checkoutRoot,
      plugin_load_evidence: pluginLoadEvidence ?? `manifest digest measured once from ${checkoutRoot}`,
    });
  } catch {
    return null;
  }
  const decision = approveIdentity(identity, { requested_cli_version: version });
  if (!decision.ok) return null;
  return observation("pass", "identity-approved", {
    field: "observed_plugin_manifest_sha256",
    digest,
    checkout_root: checkoutRoot,
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
    // Which arguments the denial's tool actually carried, so a reader can see the observer did not
    // depend on one blessed event shape.
    denial_shape: denial.detail?.input_keys ?? [],
  });
}

/**
 * The paired half of `exit0-denied-read`: the SAME guarded invocation shape with the denial on a
 * path the invocation does not need, so `required_read` is declared `false` and the control must not
 * fire. It is a measurement, not a claim: every denial on the record must be explicitly optional,
 * the process must have exited 0, and the citation comes from the record's own span.
 *
 * A record that carries a required denial, a non-zero exit, or no denial at all yields `null` — the
 * pair only exists where the other answer really came out.
 */
export function observeExit0DeniedReadPair({ record } = {}) {
  if (!record) return null;
  const exitCode = record.process_status?.exit_code;
  if (exitCode !== 0) return null;
  const denials = (record.observations ?? []).filter((entry) => entry.kind === "permission_denied");
  if (denials.length === 0) return null;
  // One required denial anywhere on the record and this is not the optional half: the pair would
  // then be measuring the same answer as the control.
  if (denials.some((entry) => entry.required_read !== false)) return null;
  const denial = denials.find((entry) => entry.target != null) ?? denials[0];
  return observation("pass", "optional-denial-not-a-failure", {
    process_exit_code: exitCode,
    operation: denial.operation ?? null,
    target: denial.target ?? null,
    required_read: false,
    stream_offset: denial.stream_offset,
    stream_end_offset: denial.stream_end_offset,
    raw_sha256: denial.raw_sha256,
    invocation_id: record.invocation_id ?? null,
    stdout_sha256: record.stdout?.sha256 ?? null,
  });
}

/**
 * The paired half of `missing-key`: the same guard, on the same code path, with the binding present.
 * The keyless control proves that absence refuses; this proves that presence is not refused — a
 * guard that refuses unconditionally would produce the control's verdict for free.
 *
 * Read off the authenticated graded leg's own verify record: a refusal there is not an admission, a
 * zero request count means nothing was admitted, and a capture the record cannot cite is no evidence.
 */
export function observeMissingKeyPair({ record } = {}) {
  if (!record) return null;
  if (record.refusal) return null;
  if (!Number.isInteger(record.model_request_count) || record.model_request_count < 1) return null;
  const capturePath = (record.evidence_paths ?? []).find((path) => path.endsWith(".capture.json"));
  if (!capturePath) return null;
  if (!existsSync(resolveEvidencePath(record, capturePath))) return null;
  return observation("pass", "binding-accepted", {
    model_request_count: record.model_request_count,
    invocation_id: record.invocation_id ?? null,
    process_exit_code: record.process_status?.exit_code ?? null,
    stdout_sha256: record.stdout?.sha256 ?? null,
    capture_path: capturePath,
  });
}

/**
 * The paired half of `hidden-image-judge`: a scratch copy of the run's OWN captured bytes with one
 * image content block appended, scanned by the same `scanTree`. The control claims an absence, and an
 * absence is only worth something when the scanner could have found the opposite in the same bytes.
 *
 * The twin is built from the roots' files, never from a fixture of its own, and it is labelled
 * `planted: true` with the file name and byte offset the scan reported so no reader can mistake it
 * for a run that really judged an image. A tree that cannot be read, holds no file, or ALREADY fails
 * the scan yields `null`: there is no other-way measurement to make.
 */
export function observeHiddenImageJudgePair({ roots = [] } = {}) {
  const sources = (roots ?? []).filter((root) => typeof root === "string" && root.length > 0);
  if (sources.length === 0) return null;
  const base = scanTree({ roots: sources });
  if (base === null || base.verdict !== "pass") return null;
  const files = sortedFiles(sources);
  // The twin is a copy of the run's OWN captured stream plus one image block; without a captured
  // stream there is nothing to append to and nothing to prove.
  const stream = files.find((file) => file.path.endsWith(".stdout.bin")) ?? null;
  if (stream === null) return null;
  const scratch = mkdtempSync(join(tmpdir(), "pp-hidden-image-twin-"));
  try {
    const plantedName = `twin-${basename(stream.path)}`;
    for (const [index, file] of files.entries()) {
      const name = file === stream ? plantedName : `${String(index).padStart(3, "0")}-${basename(file.path)}`;
      const bytes = readFileSync(file.path);
      // Exactly one image content block, appended to the stream the run really produced: the scanner
      // matches raw bytes, so this is the shape a screenshot-judging child would emit.
      writeFileSync(join(scratch, name), file === stream ? Buffer.concat([bytes, Buffer.from(`\n${JSON.stringify(IMAGE_BLOCK_LINE)}\n`)]) : bytes);
    }
    const scan = scanTree({ roots: [scratch] });
    if (scan === null || scan.verdict !== "fail") return null;
    const finding = scan.findings.find((entry) => basename(entry.file) === plantedName) ?? null;
    if (!finding) return null;
    return observation("fail", "image-judge-in-child-tree", {
      planted: true,
      planted_file: plantedName,
      offset: finding.offset,
      kind: finding.kind,
      files_scanned: scan.files_scanned,
      tree_sha256: scan.tree_sha256,
      base_tree_sha256: base.tree_sha256,
      roots: base.roots,
    });
  } catch {
    return null;
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

/** Every file under the given roots, in a deterministic order. */
function sortedFiles(roots) {
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) out.push({ path: full });
    }
  };
  for (const root of roots) {
    if (!existsSync(root) || !statSync(root).isDirectory()) continue;
    walk(root);
  }
  return out;
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
  const partial = `${cellFile}.partial`;
  writeFileSync(partial, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  renameSync(partial, cellFile);
  const back = JSON.parse(readFileSync(cellFile, "utf8"));
  return {
    ok: back[CONTROL_OBSERVATIONS_FIELD]?.["missing-key"]?.reason === value.reason,
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
  const partial = `${cellFile}.partial`;
  writeFileSync(partial, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  renameSync(partial, cellFile);
  const back = JSON.parse(readFileSync(cellFile, "utf8"));
  const observationOk = value == null || back[CONTROL_OBSERVATIONS_FIELD]?.["exit0-denied-read"]?.reason === value.reason;
  const pairOk = pair == null || back[CONTROL_PAIRS_FIELD]?.["exit0-denied-read"]?.reason === pair.reason;
  return {
    ok: observationOk && pairOk,
    reason: observationOk && pairOk ? null : "cell-record-write-unverified",
    cell_file: cellFile,
  };
}

/** The control ids this module produces, in the controls module's order. */
export const OBSERVED_CONTROL_IDS = IDS;

/**
 * What one graded claude-code leg produced, from what it measured: the four control observations it
 * could make, and the paired halves that let `recordControl` compute discrimination.
 *
 * Every pair is a measurement that had to come out the other way, taken from what this leg already
 * has in its hands: the matching digest for `stale-cache`, the authenticated admission for
 * `missing-key` (the same guard, the same code path, with the binding present), and an image line
 * planted in a scratch copy of the run's own captured bytes for `hidden-image-judge`.
 * `exit0-denied-read`'s pair arrives with its observation, through the denied-write probe.
 */
export function observeLeg({ checkoutRoot, staleRoot, mutatedFile, planted = false, verifyRecord, verifyCheck, verifyRoots, observedCliVersion, requestedCliVersion }) {
  const observations = mergeObservations({
    "stale-cache": observeStaleCache({ checkoutRoot, staleRoot, mutatedFile, observedCliVersion, requestedCliVersion, planted }),
    "exit0-denied-read": observeExit0DeniedRead({ record: verifyRecord, check: verifyCheck }),
    "hidden-image-judge": observeHiddenImageJudge({ roots: verifyRoots ?? [] }),
  });
  const pairs = mergeObservations({
    "stale-cache": observeStaleCachePair({ checkoutRoot, observedCliVersion, requestedCliVersion }),
    "missing-key": observeMissingKeyPair({ record: verifyRecord }),
    "hidden-image-judge": observeHiddenImageJudgePair({ roots: verifyRoots ?? [] }),
  });
  return { observations, pairs };
}
