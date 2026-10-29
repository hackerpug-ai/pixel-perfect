// The adapter registry: who decides a cell, in the one order that cannot invent a verdict.
//
// Twelve cells exist on every run because they are enumerated from pins, not from what happened to
// succeed. For each (harness, track) this module answers one question — who owns this cell right
// now — and returns either a could-not-run cell with the deciding component's own reason, or null,
// meaning "a loaded adapter grades it". It never returns `pass`: a verdict needs evidence, and this
// module has none.
//
// The order is load-bearing:
//   1. the invocation-guard's credential check — a missing key is the truth even when the adapter is
//      also absent, and the reason string is the guard's, never a per-harness constant here;
//   2. adapter absence — a real cell with a named reason (./absent.mjs);
//   3. the newest-version lookup — a failed lookup makes that one cell could-not-run, it never drops
//      it and never substitutes the pinned version.
// Adapter absence is checked before the lookup so a run with no adapters performs no network lookup
// and no absent harness can be reported as a version problem.
import { CHECKS, HARNESSES, TRACKS, loadPins } from "../pins.mjs";
import { guardInvocation } from "../runtime/guard.mjs";
import { absentReason } from "./absent.mjs";

export { ABSENT_REASONS, ADAPTER_PENDING, absentReason } from "./absent.mjs";

/** The component that decided each could-not-run cell, recorded in the cell's `source`. */
export const CELL_SOURCES = Object.freeze({
  GUARD: "invocation-guard",
  ABSENT: "adapter-registry",
  LOOKUP: "version-lookup",
});

/** A newest-version lookup that produced no version: this cell is could-not-run, never defaulted. */
export const LOOKUP_FAILED_REASON = "version-lookup-failed";

export class RegistryError extends Error {
  constructor(reason, detail = {}) {
    super(`${reason}: ${JSON.stringify(detail)}`);
    this.name = "RegistryError";
    this.reason = reason;
    this.detail = detail;
  }
}

const pairOf = (harness, track) => `${harness}/${track}`;

function cellOf({ harness, track, reason, source, requested, observed, installMode }) {
  return {
    harness,
    track,
    installation: {
      requested_cli_version: requested,
      resolved_cli_version: requested,
      observed_cli_version: observed,
      install_mode: installMode,
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
    source,
    denied_tool_call: null,
    evidence_paths: [],
    report_paths: [],
    observed_verify_outcome: null,
    checks: CHECKS.map((check_id) => ({ check_id, verdict: "could-not-run", reason, source })),
  };
}

/**
 * Only what decided this cell: the guard's credential check and, when it refused, the guard's own
 * refusal record. A stance refusal is deliberately not surfaced — the stance is recorded per harness
 * just before that harness's first model call, which is after cell planning, so reporting it here
 * would claim the registry refused something it never consulted. Names and booleans only, no values.
 */
function summarise(harness, track, decision, credentialCheck) {
  return {
    harness,
    track,
    refusal: credentialCheck.ok ? null : decision.refusal,
    credential: {
      binding_env: decision.credential.binding_env,
      credential_env: decision.credential.credential_env,
      present: decision.credential.present,
      present_name: decision.credential.present_name,
      checked: decision.credential.checked,
    },
  };
}

/**
 * One (harness, track) cell. Returns `{ cell, decision }`: `cell` is the could-not-run cell this
 * module can prove, or null when a loaded adapter owns the grade. `decision` is the guard's own
 * record, so a caller can show what was checked before anything was spawned.
 *
 * @param {string} harness
 * @param {"pinned"|"newest"} track
 * @param {{
 *   env?: Record<string, string|undefined>,
 *   adapters?: Set<string>,
 *   manifest?: object|null,
 *   resolver?: { resolve(harness: string): string|null }|null,
 *   observed?: Record<string, string|null>,
 *   installMode?: "checkout"|"published",
 * }} ctx
 */
export function cellFor(harness, track, ctx = {}) {
  const {
    env = process.env,
    adapters = new Set(),
    manifest = null,
    resolver = null,
    observed = {},
    installMode = "checkout",
  } = ctx;

  const seen = observed[harness] ?? null;
  // The pins authority, resolved once: the guard reads its binding from the same bytes the cell's
  // requested version comes from, so the two can never disagree about which manifest this is.
  const pinsManifest = manifest ?? loadPins().manifest;
  const pin = pinsManifest.harnesses?.[harness] ?? null;
  const pinnedRequest = pin?.pinned_cli_version ?? null;

  // No stance: the stance is recorded per harness immediately before that harness's first model
  // call, which is after cell planning. The credential check is what decides a cell, and it is
  // evaluated first inside the guard, so passing no stance cannot mask a missing key.
  const decision = guardInvocation({ harness, stance: null, env, manifest: pinsManifest });
  const credentialCheck = decision.checks.find((check) => check.name === "credential");
  if (!credentialCheck) throw new RegistryError("guard-credential-check-missing", { harness });

  // 1. The guard's own credential check. The reason is the guard's string, not one written here.
  if (!credentialCheck.ok) {
    return {
      cell: cellOf({
        harness,
        track,
        reason: credentialCheck.reason,
        source: CELL_SOURCES.GUARD,
        requested: track === "pinned" ? pinnedRequest : null,
        observed: seen,
        installMode,
      }),
      decision: summarise(harness, track, decision, credentialCheck),
    };
  }

  // 2. No adapter loaded: a real cell with that harness's own named reason.
  if (!adapters.has(harness)) {
    return {
      cell: cellOf({
        harness,
        track,
        reason: absentReason(harness),
        source: CELL_SOURCES.ABSENT,
        requested: track === "pinned" ? pinnedRequest : null,
        observed: seen,
        installMode,
      }),
      decision: summarise(harness, track, decision, credentialCheck),
    };
  }

  // 3. The version this cell asks for. A failed newest lookup is this cell's own could-not-run.
  // The pinned request is the pins authority's, which loadPins has already validated as exact.
  let requested = pinnedRequest;
  if (track === "newest") {
    if (!resolver) throw new RegistryError("resolver-missing", { harness, track });
    requested = resolver.resolve(harness) ?? null;
    if (requested === null) {
      return {
        cell: cellOf({
          harness,
          track,
          reason: LOOKUP_FAILED_REASON,
          source: CELL_SOURCES.LOOKUP,
          requested: null,
          observed: seen,
          installMode,
        }),
        decision: summarise(harness, track, decision, credentialCheck),
      };
    }
  }

  // A loaded adapter looked up a real version: the grade is the adapter's to produce, not ours.
  return { cell: null, decision: summarise(harness, track, decision, credentialCheck) };
}

/**
 * All twelve cells, always. `pairs` is every (harness, track) the matrix must contain;
 * `adapterOwned` names the cells a loaded adapter will grade instead. A caller that ends up with a
 * cell neither in `cells` nor in `adapterOwned` has dropped a cell, and the recorder refuses eleven.
 */
export function planCells(ctx = {}) {
  const { adapters = new Set() } = ctx;
  const cells = [];
  const adapterOwned = [];
  const decisions = [];
  const pairs = [];
  for (const harness of HARNESSES) {
    for (const track of TRACKS) {
      const pair = pairOf(harness, track);
      pairs.push(pair);
      const { cell, decision } = cellFor(harness, track, ctx);
      decisions.push(decision);
      if (cell) cells.push(cell);
      else adapterOwned.push({ harness, track, pair });
    }
  }
  return {
    cells,
    adapterOwned,
    decisions,
    pairs,
  };
}
