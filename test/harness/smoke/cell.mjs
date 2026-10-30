// cell.mjs — the one module a smoke leg calls.
//
// A leg's only job is to leave `cell/cell.json` behind, and the honest shape of that file depends on
// what the run could actually do:
//
//   1. The registry answers FIRST. A guard refusal (`missing-api-key`) or an absent adapter
//      (`<harness>-adapter-not-implemented`) is a could-not-run cell whose reason is the deciding
//      component's own string — never a constant written here.
//   2. When no registry decision applies, the loaded adapter owns the grade: measure the identity
//      with a real load, run the five invocations, and aggregate four checks whose verdicts come from
//      captured bytes. A check never reads a process exit code.
//   3. Anything throwable becomes a named could-not-run record, so a leg always writes a file and the
//      step's exit code never carries a verdict.
//
// The verdict reports; the exit code does not.
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import * as claudeCode from "../adapters/claude-code.mjs";
import { REGISTERED, cellFor as registryCellFor } from "../adapters/registry.mjs";
import { manifestOf } from "../runtime/index.mjs";
import { validateAgainst } from "../validate.mjs";
import { attachObservation, attachPair, mergeObservations, observeLeg } from "./observations.mjs";

export const SMOKE_CELL_DIR = "cell";
export const SMOKE_CELL_FILE = "cell.json";
export const FAILURE_FILE = "failure.json";
export const CELL_SCHEMA = "harness-cell.v1.schema.json";
export const DEFAULT_FAILURE_REASON = "smoke-cell-failed";

const ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));

/** The first relative path whose bytes differ between two payloads, or null when they are equal. */
function firstDivergence(expectedRoot, observedRoot) {
  if (!expectedRoot || !observedRoot) return null;
  const expected = manifestOf(expectedRoot);
  const observed = manifestOf(observedRoot);
  if (!expected || !observed) return null;
  const keys = [...new Set([...Object.keys(expected), ...Object.keys(observed)])].sort();
  return keys.find((key) => expected[key] !== observed[key]) ?? null;
}

/**
 * The payload the stale-cache control compares against: the run's own loaded payload when it already
 * disagrees with the checkout, otherwise a byte-identical copy with one byte moved. Returns the root,
 * the file that moved, and a cleanup. An uncertain copy yields a null root, which the control layer
 * turns into could-not-run / control-unobservable rather than a pass.
 */
function staleCopy({ checkoutRoot, loadedRoot, scratch = null }) {
  try {
    if (loadedRoot) {
      const natural = firstDivergence(checkoutRoot, loadedRoot);
      if (natural !== null) return { root: loadedRoot, mutatedFile: natural, planted: false, cleanup: null };
    }
    if (!checkoutRoot) return { root: null, mutatedFile: null, planted: false, cleanup: null };
    const base = scratch ?? mkdtempSync(join(tmpdir(), "pp-stale-payload-"));
    mkdirSync(base, { recursive: true });
    const root = join(base, "stale-payload");
    rmSync(root, { recursive: true, force: true });
    cpSync(checkoutRoot, root, { recursive: true });
    const target = firstDivergence(checkoutRoot, root) ?? "package.json";
    const victim = join(root, target);
    if (!existsSync(victim)) return { root: null, mutatedFile: null, planted: false, cleanup: null };
    writeFileSync(victim, `${readFileSync(victim, "utf8")} `, "utf8");
    return {
      root,
      mutatedFile: target,
      planted: true,
      cleanup: scratch ? null : () => rmSync(base, { recursive: true, force: true }),
    };
  } catch {
    return { root: null, mutatedFile: null, planted: false, cleanup: null };
  }
}

/**
 * Writes one cell record atomically and reads it back.
 *
 * A graded record is validated against the shipped HarnessCell schema; a bare could-not-run record
 * has no grade to validate, so it is checked for the three fields a reader needs instead. A write
 * that does not read back is a refusal, not a file.
 */
export function writeCell({ file, cell }) {
  if (!cell || typeof cell !== "object") throw new TypeError("writeCell needs a cell record");
  if (cell.verdict !== undefined) {
    validateAgainst(CELL_SCHEMA, cell);
  } else {
    const missing = ["harness", "track", "cell_state", "reason"].filter((field) => typeof cell[field] !== "string" || cell[field].trim() === "");
    if (missing.length > 0) throw new TypeError(`a bare cell record must state ${missing.join(", ")}`);
  }
  mkdirSync(dirname(file), { recursive: true });
  const partial = `${file}.partial`;
  writeFileSync(partial, `${JSON.stringify(cell, null, 2)}\n`, "utf8");
  renameSync(partial, file);
  const back = JSON.parse(readFileSync(file, "utf8"));
  const mismatches = ["harness", "track", "verdict"].filter(
    (field) => JSON.stringify(back[field] ?? null) !== JSON.stringify(cell[field] ?? null),
  );
  return { ok: mismatches.length === 0 && existsSync(file), path: file, cell: back, mismatches };
}

/** The bare record a leg writes when nothing could be graded. It always names a reason. */
export function bareRecord({ harness, track, installMode, reason, detail = null }) {
  return {
    harness,
    track,
    cell_state: "could-not-run",
    reason: typeof reason === "string" && reason.trim() !== "" ? reason : DEFAULT_FAILURE_REASON,
    install_mode: installMode,
    ...(detail ? { detail } : {}),
  };
}

/**
 * One (harness, track) leg → one cell record.
 *
 * @param {object} options
 * @param {string} options.harness
 * @param {"pinned"|"newest"} options.track
 * @param {"checkout"|"published"} [options.installMode]
 * @param {Record<string, string|undefined>} [options.env]   the step's environment (never logged)
 * @param {Set<string>} [options.adapters]                    harnesses with a loaded adapter
 * @param {object|null} [options.resolver]                    newest-version lookup, frozen per run
 * @param {object|null} [options.manifest]                    the pins authority
 * @param {string} [options.workspace]
 * @param {string|null} [options.configDir]
 * @param {string} [options.pluginRoot]
 * @param {string|null} [options.requestedCliVersion]
 * @param {Function|null} [options.loadCell]                  the load leg; defaults to the adapter's
 * @param {object|null} [options.records]                     capture records keyed by table `key`
 * @param {object|null} [options.dirs]                        a prepared run-dirs set
 * @param {string|null} [options.evidenceDir]
 * @param {boolean} [options.controlObservations]             attach the three leg-level observations
 * @param {Function} [options.now]
 * @returns {Promise<object>} the cell record that was assembled
 */
export async function runCell({
  harness,
  track,
  installMode: requestedInstallMode = "checkout",
  env = process.env,
  adapters = new Set(REGISTERED),
  resolver = null,
  manifest = null,
  workspace = ROOT,
  configDir = null,
  pluginRoot = join(ROOT, claudeCode.PLUGIN_ROOT_REL),
  requestedCliVersion = null,
  loadCell = null,
  records = null,
  dirs = null,
  evidenceDir = null,
  controlObservations = true,
  now = () => new Date(),
} = {}) {
  const installMode = normalizeInstallMode(requestedInstallMode);
  let ownedDirs = null;
  let disposeDirs = false;
  let ownedConfig = null;
  try {
    const decided = registryCellFor(harness, track, { env, adapters, manifest, resolver, installMode });
    if (decided.cell) {
      // The registry owns this cell: its refusal (or its absence of an adapter) IS the reason, and
      // nothing below may overwrite it with a guess.
      return { ...decided.cell, recorded_at: now().toISOString() };
    }

    const load =
      loadCell ??
      (async (options) => {
        ownedConfig = options.configDir ?? mkdtempSync(join(tmpdir(), `pp-${harness}-load-config-`));
        return claudeCode.executeLoad({ workspace: options.workspace, configDir: ownedConfig, installMode: options.installMode });
      });
    const loaded = await load({ workspace, configDir, installMode, pluginRoot });
    const installation = loaded?.identity ?? loaded;
    if (!installation) throw new Error("the load leg produced no identity");

    ownedDirs = dirs ?? claudeCode.prepareRunDirs({ runId: `smoke-${harness}-${track}`, track });
    disposeDirs = dirs === null;
    const table = claudeCode.invocationTable({ track, dirs: ownedDirs, pluginRoot });

    const results = [];
    for (const entry of table) {
      if (records && records[entry.key]) {
        // A replay: the record is real captured bytes; the grading below is the adapter's own.
        results.push({
          entry,
          record: records[entry.key],
          ...claudeCode.gradeCheck({
            record: records[entry.key],
            entry,
            track,
            installation,
          }),
        });
        continue;
      }
      results.push(
        await claudeCode.runCheck({
          entry,
          track,
          configDir: ownedConfig ?? configDir,
          env,
          installation,
          installMode,
          evidenceDir: evidenceDir ? join(evidenceDir, entry.key) : null,
        }),
      );
    }

    const cell = claudeCode.cellFor({ track, cells: results.map((result) => result.cell), installation });

    let observed = { observations: {}, pairs: {} };
    if (controlObservations) {
      const loadedRoot = loaded?.installed?.installPath ?? null;
      // A negative control is a deliberate perturbation: the stale-cache control exists to prove
      // that the identity rule REFUSES a payload that moved, so when the run's own payload agrees
      // with the checkout (the healthy case) the leg plants the one-byte drift itself and measures
      // the rule against real digests. The observation carries `planted: true` so no reader mistakes
      // it for a run that drifted on its own, and the matching-digest half travels as its pair.
      const stale = staleCopy({ checkoutRoot: pluginRoot, loadedRoot, scratch: evidenceDir });
      // The roots are what the invocation PRODUCED, not what it could read: the captured stream —
      // the only place an `image` content block can appear — is persisted beside the model's
      // requests, in the evidence dir the adapter wrote. Scanning the kit-project working tree alone
      // would clear a tree that never held the bytes.
      observed = observeLeg({
        checkoutRoot: pluginRoot,
        staleRoot: stale.root,
        mutatedFile: stale.mutatedFile,
        planted: stale.planted === true,
        verifyRecord: verifyRecordOf(results),
        verifyCheck: "verify",
        verifyRoots: verifyRootsOf(ownedDirs, results),
        observedCliVersion: installation.observed_cli_version ?? null,
        requestedCliVersion: installation.requested_cli_version ?? requestedCliVersion,
      });
      stale.cleanup?.();
    }
    const observations = mergeObservations(observed.observations);
    const pairs = mergeObservations(observed.pairs);
    let withControls = cell;
    for (const [id, value] of Object.entries(observations)) withControls = attachObservation(withControls, id, value);
    for (const [id, value] of Object.entries(pairs)) withControls = attachPair(withControls, id, value);
    return withControls;
  } catch (error) {
    return bareRecord({
      harness,
      track,
      installMode,
      reason: error?.reason ?? DEFAULT_FAILURE_REASON,
      detail: String(error?.message ?? error),
    });
  } finally {
    if (disposeDirs) ownedDirs?.cleanup?.();
    if (ownedConfig) rmSync(ownedConfig, { recursive: true, force: true });
  }
}

export const INSTALL_MODES = Object.freeze(["checkout", "published"]);
export const TRACKS = Object.freeze(["pinned", "newest"]);

/**
 * A cell is written only for a cell the runner actually instantiated. `${{ matrix.track }}` is
 * substituted by Actions; a literal template can only reach a body that was run outside a matrix
 * (the locked grd-06 flow executes a step body directly to prove credential placement), and writing
 * a cell for a track that does not exist would be a record of a cell nobody ran.
 */
export function isInstantiatedCell(track) {
  return TRACKS.includes(track);
}

/**
 * The dispatch input, or the default when the value is not a substituted choice. The workflow passes
 * `${{ inputs.install_mode }}`, which GitHub substitutes to one of the two options; a literal template
 * can only reach here when the step body is run outside Actions (a locked flow executes the body
 * directly), and inventing a third mode for it would fail the run's one-mode-per-run rule.
 */
export function normalizeInstallMode(value) {
  if (INSTALL_MODES.includes(value)) return value;
  if (value !== undefined && value !== null && value !== "") {
    process.stderr.write(`install mode ${JSON.stringify(String(value))} is not a substituted dispatch choice; using checkout\n`);
  }
  return "checkout";
}

/** The planted verify record: the invocation whose stream a denial or an image block would appear in. */
function verifyRecordOf(results) {
  const row = results.find((result) => result.entry?.key === "verify-button-drift") ?? results.find((result) => result.entry?.check_id === "verify") ?? null;
  return row?.record ?? null;
}

/**
 * What the verify invocations PRODUCED and what they could touch: the evidence dirs their captured
 * streams were persisted into (resolved from the records' own citations, so a replay and a live run
 * give the same answer) plus the run dirs the child worked in.
 */
function verifyRootsOf(dirs, results) {
  const captureRoots = results
    .filter((result) => result.entry?.check_id === "verify")
    .flatMap((result) => (result.record?.evidence_paths ?? []).map((path) => dirname(resolve(path))));
  const runRoots = ["verify-button-drift", "verify-clean"].map((key) => dirs.for(key)?.dir).filter(Boolean);
  return [...new Set([...captureRoots, ...runRoots])];
}

/** `cell/cell.json` for a leg, or the fallback record when the leg produced nothing. */
export async function writeLegCell({ file, options = {} }) {
  const cell = await runCell(options);
  const written = writeCell({ file, cell });
  return { ...written, cell };
}

// ---------------------------------------------------------------------------
// CLI — what the model step calls
// ---------------------------------------------------------------------------

// `process.argv[1]` may be reached through a symlinked tree (the locked flows run a step body in a
// sandbox whose `test/` is a symlink), so both sides are resolved to their real path before compare.
const isMain =
  process.argv[1] !== undefined &&
  (() => {
    try {
      return realpathSync(resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url));
    } catch {
      return false;
    }
  })();

if (isMain) {
  const [harness, track, ...rest] = process.argv.slice(2);
  const flag = (name) => {
    const index = rest.indexOf(`--${name}`);
    return index === -1 ? undefined : rest[index + 1];
  };
  if (!harness || !track) {
    process.stderr.write("usage: cell.mjs <harness> <track> [--cell-dir D] [--install-mode checkout|published] [--config-dir D]\n");
    process.exitCode = 2;
  } else {
    const cellDir = flag("cell-dir") ?? SMOKE_CELL_DIR;
    const file = join(cellDir, SMOKE_CELL_FILE);
    // A body that throws still has to leave a named cell behind: the fallback is written here, and
    // the step's exit code stays 0 because the verdict — not the shell — reports.
    let result;
    try {
      result = await writeLegCell({
        file,
        options: {
          harness,
          track,
          installMode: flag("install-mode") ?? "checkout",
          configDir: flag("config-dir") ?? null,
          requestedCliVersion: flag("requested-version") ?? null,
        },
      });
    } catch (error) {
      const fallback = bareRecord({ harness, track, installMode: flag("install-mode") ?? "checkout", reason: DEFAULT_FAILURE_REASON, detail: String(error?.message ?? error) });
      result = writeCell({ file, cell: fallback });
    }
    process.stdout.write(`${JSON.stringify({ verdict: result.cell.verdict ?? null, cell_state: result.cell.cell_state ?? null, reason: result.cell.reason ?? null, file })}\n`);
    process.exitCode = result.ok ? 0 : 1;
  }
}
