# Design Analysis

The one procedure that turns design sources into a gated inventory. Three workflows run it:
`workflows/build.md` Phase 4a (the project's own designs, before planning), `workflows/assimilate.md`
(a new mockup, or a source the user admires), and `workflows/evolve.md` E1 (a design change to an
existing system). The procedure renders, reads once, and gates. **Confirmation and recording belong to
the caller**: build asks `B-inv`, assimilate asks `A1`, evolve asks `E4`. Nothing outside `OUT` is
written until the caller's confirmation says so.

`docs/INVENTORY-CONTRACT.md` is the brief the designer receives; this file is the orchestrator's side.

## Parameters

| Parameter | Meaning | build | assimilate | evolve |
|---|---|---|---|---|
| `SOURCES` | refs to read, each with a role: `own` (the project's design, pixel targets) or `inspiration` (a source the user admires) | `manifest.references`, all own | the user's sources, one role per intent | the new design, own |
| `OUT` | where this run writes | `design/` | `design/assimilations/<date>-<slug>/` | `design/deltas/<date>-<slug>/` |
| `PRIOR` | the inventory the read extends | `design/inventory.json` when re-running | `design/inventory.json` if it exists | `design/inventory.json` |
| `CALLER` | first line of the brief | `"build" workflow (Phase 4a — DESIGN INVENTORY)` | `"assimilate" workflow (DESIGN ANALYSIS)` | `"evolve" workflow (E1 — ACQUIRE)` |
| `NOTES` | what the user asked the read to focus on or ignore | none | the answer to `A0` Context | none |
| `LENS` | the aesthetic lens | none | `docs/frontend-design/FRONTEND-DESIGN.md` | `docs/frontend-design/FRONTEND-DESIGN.md` |

## Step 1 — Render (deterministic)

```
node {plugin}/scripts/render-frames.mjs <refs>… --out <OUT>/reference [--reserve design/reference/frames.json] [--frame-selector <css>]
```

Pass `--reserve` whenever `OUT` is not `design/` and `design/reference/frames.json` exists, so a new source never takes a slug another source already owns; the same ref keeps its slug. A directory stands for its html and image files, each rendered as its own source. Exit `1` (blank render) or `2` (no Chrome, unreadable ref) stops the run with the script's diagnosis — never proceed on a partial render. See `workflows/build.md` Phase 4a Step 1 for what the frames are: selected frames plus one full page per width and theme.

## Step 2 — One read (probabilistic)

`DESIGN_EXECUTE` with `docs/INVENTORY-CONTRACT.md`, `docs/DESIGN-CONTRACT.md`, and `LENS` when set. **One dispatch, strongest available vision-capable model.** Never split the read per source and never fan it out: cross-source compositions are what a split loses.

- **build** — the read returns the complete inventory to `<OUT>/inventory.json`, as it always has.
- **assimilate and evolve** (additive) — the read returns only what this run adds or changes, to `<OUT>/delta.json`. When `PRIOR` exists, merge it over the prior in code, never by asking the model to copy the prior: `node {plugin}/scripts/merge-inventory.mjs <PRIOR> <OUT>/delta.json --out <OUT>/inventory.json`. Without a prior, the delta is the inventory. Prior items are immutable here — a rename, a move between layers, or a removal goes through `evolve`'s own path.

Substitute the brief's placeholders:

| Placeholder | Value |
|---|---|
| `<<CALLER>>` | the `CALLER` value above |
| `<<FRAMES_JSON>>` | `<OUT>/reference/frames.json` |
| `<<SOURCE_REFS>>` | build: the refs. assimilate and evolve: the refs, each with its role |
| `<<SPEC_PATH>>` | `manifest.spec`, or none |
| `<<MANIFEST_INVENTORY>>` | the platform's recorded atoms, molecules, organisms, and screens, or none |
| `<<LIBRARY_PRIMITIVES>>` | `manifest.platforms[platform].scaffold.components[]`, or none |
| `<<PRIOR_INVENTORY>>` | `PRIOR`, or none |
| `<<ANALYSIS_EXTRAS>>` | build: delete the line. assimilate and evolve: the block below, filled in |
| `<<INTENT>>` | inside the block: each source with its role, for example `design/new-board.html — own; https://fieldpro.example — inspiration` |
| `<<USER_NOTES>>` | inside the block: `NOTES`, or `none` |
| `<<AESTHETIC_LENS>>` | inside the block: the `LENS` path |

The analysis-extras block:

```
  • Intent:            <<INTENT>> — own: the project's own new design; its frames are pixel
                       targets. inspiration: a source the user admires; learn from it, never
                       copy it.
  • User notes:        <<USER_NOTES>> — follow them; a part the user said to ignore is
                       listed UNCLAIMED with the user's words as the reason.
  • Aesthetic lens:    <<AESTHETIC_LENS>> — read it, then record per source in
                       tokens_observed: "aesthetic" for own sources, "inspiration": {"<ref>":
                       {...}} for admired ones, each with typography · color · motion ·
                       spatial · backgrounds. Describe what the source does; do not redesign
                       it, and never let the lens overrule the design, styling, or component
                       contracts.
  • Return a delta:    return only what this run adds or changes — new items, and new
                       states, variants, or frames for existing ones. Do not repeat prior
                       items; the orchestrator merges your result over the prior inventory.
                       Never rename, re-layer, or remove a prior item here.
  • Provenance rules:  set sources[].role on every source. An inspiration source never
                       defines the project's screens: its frames are claimed only by
                       components' appears_on, or listed UNCLAIMED. Brand marks, logos,
                       product names, and copy text are UNCLAIMED with the reason
                       "third-party brand or content — not assimilated". A component learned
                       from an inspiration source keeps the project's existing name when one
                       already covers it; put the difference in evidence.
```

With build's values the brief gives the same instructions it always has (one line now wraps differently).

## Step 3 — Gate (deterministic)

```
node {plugin}/scripts/verify-inventory.mjs <OUT>/inventory.json --frames <OUT>/reference/frames.json [--prior <PRIOR>]
```

Pass `--prior` whenever `PRIOR` is set and the caller is additive (assimilate, evolve): nothing the prior held may disappear. Gate the merged `<OUT>/inventory.json`, not the delta. Exit `1` → re-dispatch the read with the printed violations (cap 2, then stop and surface to the user); `2` → malformed JSON, re-dispatch once with the shape errors; `3` → nothing was looked at, treat as a failed render.

## Step 4 — Return to the caller

Return the gated `<OUT>/inventory.json` and a one-line summary: frames (claimed · unclaimed), and per layer what is new, reused, or a variant of something that exists. The caller writes its human brief, states `design engine: frontend-designer` or `design engine: bundled contract` (whichever ran the read), and asks its confirmation.

## Step 5 — Persist (assimilate and evolve, after the caller's confirmation)

Build records in place (`OUT` is `design/`). The other callers fold the run into the project — **staged, so a failure leaves `design/` exactly as it was**:

1. **Stage** — copy `design/reference/` (if it exists) to `<OUT>/stage/reference/`. Merge the run's own sources into the stage: `node {plugin}/scripts/render-frames.mjs --merge-from <OUT>/reference <own refs>… --out <OUT>/stage/reference`, where the own refs are the `ref` values in `<OUT>/reference/frames.json` whose inventory role is `own` (a directory the user named appears there as its individual files). Inspiration frames are **never** merged: they stay in the run's `reference/`, which the run git-ignores with its own `reference/.gitignore` (`*`).
2. **Candidate inventory** — write `<OUT>/stage/inventory.json` from `<OUT>/inventory.json`, dropping inspiration sources and their frames. A component that appeared only on inspiration frames loses `appears_on` and gets `undrawn: "adopted from inspiration — assimilation <run>"` with `evidence` naming the source; one that also appears on own frames keeps those. Move `tokens_observed.inspiration` into the caller's receipt. **If there is no inventory to extend and the run holds no own sources, stop here** — the copy would hold no frames and fail as vacuous; the adopted components wait in the caller's receipt (each with its name, layer, and evidence), and build plans them.
3. **Gate the stage** — `verify-inventory.mjs <OUT>/stage/inventory.json --frames <OUT>/stage/reference/frames.json --prior <the current design/inventory.json, if any>` must exit `0`. On any other exit, delete the stage and stop with the violations; nothing in `design/` has changed.
4. **Swap** — replace `design/reference/` with the staged one, write `design/inventory.json` from the candidate with `confirmed` set, and delete `<OUT>/stage/`.

The caller then records its receipt (see its workflow).

## Reference metadata

Copy rendered `sources[].hash`, `revision`, `render_config`, `inputs`, and frame `hash` fields exactly into the inventory. They are deterministic provenance, not analysis fields. `verify-inventory --frames` validates source revisions and mappings in both directions. For existing-library refresh, stage through `docs/REFRESH-CONTRACT.md`; do not use additive persistence to supersede active references.
