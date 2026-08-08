# REGEN-CASCADE

Upstream-variant propagation semantics. When a later phase surfaces a
`VARIANT_REQUEST` that targets a lower layer, the orchestrator pauses, updates
the lower layer, regenerates ALL of its artifacts, and resumes.

## THE CASCADE RULE

> When any phase N emits `VARIANT_REQUEST: {layer}=<name> variant=<class> recipe=<rules>`:
> 1. **Pause** the current dispatch in phase N.
> 2. **Dispatch targeted subagent** for the named component at its lower layer
>    with the variant spec (see PHASE-CONTRACTS.md § Orchestrator Regen Handler).
>    It re-authors the component's `_src.html` (2-theme gallery) + README additively.
> 3. **Regenerate** that component's full artifact set (DETERMINISTIC) — ONE call:
>    - `{layer}/{name}/README.md` (new variant row in tables)
>    - `node _process.mjs {layer} {name}` → split → render → `_audit.mjs` → `_sanity.py`,
>      returning one JSON verdict (non-zero exit on any axis failure).
> 4. **Rebuild the consuming layers' bundles** so the new rules propagate:
>    - atom variant added → `node _build-bundle.mjs molecules` (and organisms/views)
>    - molecule variant added → `node _build-bundle.mjs organisms` (and views)
>    - organism variant added → `node _build-bundle.mjs views`
> 5. **Resume** the paused phase.

## DEPTH CAP

Maximum cascade depth per `VARIANT_REQUEST`: **3**.

- Views → atoms is depth 3 (view → organism → molecule → atom). Allowed.
- A view requesting an atom variant that requires a new token is depth 4
  (view → organism → molecule → atom → token). **Rejected** — rewrite as two
  separate escapes: `TOKEN_GAP` first (depth 0), then `VARIANT_REQUEST`.

If cascade attempts exceed depth 3, orchestrator logs to manifest and warns.

## CYCLE DETECTION

Keep a `visited` set per originating request, scoped `{layer}/{name}/{variant}`.

If during cascade the same tuple re-appears, abort with:
```
CASCADE_CYCLE detected: {a} → {b} → {a}
Original request: {source}
```
Surface to user; do not auto-resolve.

## IDEMPOTENCE

A `VARIANT_REQUEST` for a variant that already exists:
- Orchestrator notes the duplicate in manifest's `cascade_trail`.
- No re-write of the atom.
- Resume the paused phase immediately.

## EDITED-ARTIFACT PROTECTION

If a lower-layer artifact was edited by hand between phases (detected via
mtime mismatch with manifest's last known hash):
- Orchestrator warns the user before overwriting.
- Offer options:
  1. **Overwrite** (discard manual edits; lose them)
  2. **Merge** (re-dispatch subagent with the current edited file + variant spec; ask the subagent to preserve hand-edits where possible)
  3. **Skip** (leave the atom unchanged; the cascade REQUEST fails up to the caller)

## CASCADE AUDIT TRAIL

Every cascade emits an entry in `manifest.json`:

```json
{
  "cascade_trail": [
    {
      "timestamp": "2026-04-23T14:20:00-07:00",
      "source_phase": "organisms",
      "source_component": "nav",
      "target_layer": "atom",
      "target_component": "button",
      "variant_added": "atom-button--subtle-inverse",
      "depth": 2,
      "resolved": true,
      "regenerated": [
        "atoms/button/README.md",
        "atoms/button/dark.html",  "atoms/button/light.html",
        "atoms/button/dark.pdf",   "atoms/button/light.pdf",
        "atoms/button/dark.png",   "atoms/button/light.png",
        "molecules/_lower.css"
      ]
    }
  ]
}
```

## WHAT TRIGGERS A CASCADE VS. A TOKEN_GAP

| Request | Handler |
|---|---|
| "I need a color that doesn't exist" | `TOKEN_GAP` — add to tokens.css |
| "I need a font-size I don't have" | `TOKEN_GAP` — add to tokens.css |
| "I need a button variant that doesn't exist" | `VARIANT_REQUEST` — cascade to atom |
| "I need a molecule variant" | `VARIANT_REQUEST` — cascade to molecule |
| "I need a spacing step between existing ones" | `TOKEN_GAP` — add to tokens.css |
| "I need a new layout pattern that combines atoms I haven't seen yet" | This is a NEW molecule — don't cascade; add to this phase's molecule list if in Phase 3, or raise to user if in Phase 4+ |

## WHEN TO ESCALATE TO USER

- Cycle detected (see above)
- Depth > 3 required
- Edited artifact + user chose "skip"
- `VARIANT_REQUEST` names a component that doesn't exist at the target layer
  (user may want to add a new component instead)

The orchestrator pauses, surfaces the situation with full context, and asks
for direction.

## PARALLEL BARRIER (--parallel N)

Under `--parallel`, same-layer components dispatch in waves of N. Cascades and
token gaps do NOT interrupt a wave mid-flight — they queue at the barrier:

```
WAVE: dispatch N subagents (own folders; no shared writes)
  ↓  all envelopes collected
BARRIER:
  1. DEDUPE  — TOKEN_GAPs by key; VARIANT_REQUESTs by (layer, name, variant).
     Two subagents proposing DIFFERENT values for the same token key → the
     orchestrator picks one (or asks the user) and records the loser in the
     manifest cascade_trail.
  2. RESOLVE — serialized, one at a time:
       TOKEN_GAP        → edit build-tokens.mjs → node tokens/build-tokens.mjs
       VARIANT_REQUEST  → Regen Handler → node _process.mjs {layer} {name}
     Token mutations are NEVER concurrent.
  3. REBUILD — node _build-bundle.mjs for each consuming layer touched.
  4. RE-DISPATCH — only the components whose envelope declared a dependency on
     a resolved escape (their output referenced the missing token/variant).
     Components that authored clean stay untouched.
  5. PROCESS — node _process.mjs per component (may run concurrently; folders
     are independent).
```

Cycle detection, depth cap (3), and the edited-artifact protection all apply
unchanged — the barrier only changes WHEN resolution happens, not WHAT happens.

Sequential mode remains the default and the recommended first run on a new
concept; go parallel when the pre-scan is confirmed and the escape rate is low.
