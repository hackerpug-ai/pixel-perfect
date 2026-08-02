# TOOLING

The deterministic generators that own everything which must ALWAYS be correct —
token emission, theme separation, link depth, bundling, render, and the audit. They
ship in `assets/tooling/` and the orchestrator **stages** them into `<output>/` at run
start (step [3] of the orchestration algorithm), then runs them per phase.

Why deterministic code and not agent steps: per the *Deterministic vs Probabilistic*
boundary (SKILL.md § AGENT DISPATCH RULES), an agent can skip a step, miscount `../`,
or bleed a theme. Code can't. Subagents author markup + (for tokens) fill data tables;
the tooling does the rest.

## Staging

```
cp -R assets/tooling/* <output>/
# yields: <output>/{_preflight.sh,_head.mjs,_split.mjs,_build-bundle.mjs,_render.sh,
#                   _process.mjs,_audit.mjs,_sanity.py,_coverage.mjs,_build-catalog.mjs}
#         <output>/browse/{index.html,browse.css,browse.js}
#         <output>/tokens/build-tokens.mjs
```

All are zero-dependency (Node ≥ ESM, Python 3 + PIL, Chrome headless). Run from
`<output>/` so relative paths resolve.

## The generators

### `_preflight.sh` — Phase-0 concept smoke-render + reference frames
- **Purpose:** prove the concept renders LIVE before any phase spends work on it,
  and extract per-frame reference PNGs for the optional vision-fidelity pass.
  Bundled exports (Claude Design standalone HTML) resolve assets at runtime via
  an inline JS bundler — a pre-settle capture is an empty page.
- **CLI:** `bash _preflight.sh <concept.html> [outdir]` (default `reference/`)
- **Env:** `VTB` virtual-time budget ms (default 15000) · `FRAME_SELECTOR` the
  concept's frame element selector (default `.fr`) · `CHROME` binary override.
- **How:** full-width render → pixel-variance blank check (fails closed with the
  blob:/asset-id diagnosis) → frame bounding rects measured FROM THE DOM (a
  wrapper page iframes the concept and reads `getBoundingClientRect`; pixel
  heuristics are deliberately not used — real decks put cream phones on a cream
  page with shadow-filled gaps) → per-frame crops in reading order.
- **Invariant:** a blank render exits 1 and the run must not proceed. Zero
  selector matches is NOT fatal — the full render is the single reference.

### `tokens/build-tokens.mjs` — token synthesizer (Phase 1)
- **Purpose:** emit the entire token system from two data tables the Phase-1 subagent
  fills (CONCEPT = Tier-1 primitives, verbatim source keys; SEMANTIC = Tier-2 role
  aliases). Everything below the `★ FILL PER CONCEPT ★` markers is generic machinery.
- **CLI:** `node tokens/build-tokens.mjs`
- **Emits:** `tokens.css` (Tier-1 `--_` primitives + Tier-2 aliases via `var()`, declared
  under `:root,[data-theme]`), `theme.dark.json`, `theme.light.json`, `theme.schema.json`,
  `semantic-tokens.json`, `TOKEN-MAP.md`.
- **Invariants:** dark = exact source (round-trip target); single-theme source → derived
  light, flagged. Fails closed on dangling conceptRef, duplicate id/cssVar, or a Tier-2
  cssVar colliding with a Tier-1 `--_` name (would create a circular `var()`).

### `_head.mjs` — link-depth single source of truth
- **Purpose:** compute the `<link>` block for any output file from its path
  (`path.relative(fileDir, ROOT)`), so depth is never hand-typed. Eliminates the
  link-depth bug class.
- **API:** `buildLinks(outAbs, basenames)` → ordered `<link>` lines. CANON maps basenames
  to canonical locations (`tokens.css`→`tokens/tokens.css`, `_lower.css`→`{layer}/_lower.css`, …).
- Used by `_split.mjs`; not run directly.

### `_split.mjs` — theme splitter
- **Purpose:** turn an authored 2-theme document into the THEME-PAIR files.
- **CLI:** `node _split.mjs <input.html> <outDir>` → `<outDir>/dark.html` + `light.html`.
  Also imported by `_process.mjs` (the CLI block is guarded by an entry-module
  check so importing never triggers it).
- **How:** strips comments, drops the opposite-theme `<div data-theme>` blocks (balanced
  `<div>` scan), removes theme-label bars, rebuilds `<head>` links via `_head.mjs` at the
  correct depth, preserves `<style>`/`<title>`/`<body>` attrs.
- **Self-validates each output** (one `<html data-theme>`, no opposite-theme markup, every
  link resolves) and **fails closed** — never writes a half-split file silently.

### `_build-bundle.mjs` — per-layer CSS bundle
- **Purpose:** emit `{layer}/_lower.css` so a layer composes lower components by class
  without redefining them.
- **CLI:** `node _build-bundle.mjs <molecules|organisms|views>`
- **How:** reads each lower component's `dark.html` (canonical; `.atom/.mol/.org-*` rules are
  theme-identical), keeps prefix-matching rules + `@keyframes` (deduped) + relevant `@media`.

### `_render.sh` — per-theme render + trim
- **Purpose:** PDF + PNG for every `*.html` under a layer, or one component subtree.
- **CLI:** `bash _render.sh <layer> [subpath]` (`views` also renders 375px `*-mobile.png`).
  The subpath form is what `_process.mjs` uses to render exactly one component.
- **Env:** `VTB` virtual-time budget ms (default 7000) — raise for mocks that load
  runtime-resolved assets. `CHROME` binary override.
- **How:** Chrome headless print/screenshot, then PIL-trims each PNG against the canvas
  read **per theme from `theme.{theme}.json`** (`surface.arena`→`surface.page`). See
  RENDER-ARTIFACTS.md.

### `_process.mjs` — one call per component (the phase-loop workhorse)
- **Purpose:** run the entire post-authoring pipeline for ONE component in one
  deterministic call, so the orchestrator cannot skip a sub-step and the result
  is machine-readable.
- **CLI:** `node _process.mjs <layer> <component-subpath>` — e.g.
  `node _process.mjs atoms button`, `node _process.mjs views rig/timeout`.
- **How:** `_src.html` present → split (via `_split.mjs` import; `_src.html`
  removed on clean split) → `_render.sh <layer> <subpath>` → `_audit.mjs` →
  `_sanity.py`. Later steps still run after an early failure so the verdict is
  complete.
- **Output:** last stdout line is one JSON verdict
  `{layer, component, split, render, audit:{ok,output}, sanity:{ok,output}, ok}`;
  exit 0 iff everything passed. On failure the verdict carries the offending
  lines for the re-dispatch prompt.

### `_audit.mjs` — token-purity + link-resolution gate
- **CLI:** `node _audit.mjs <layer> [component]` (recursive).
- Allowlist = Tier-2 cssVars from `semantic-tokens.json`. Axes 1 (purity) + 2 (links). See
  TOKEN-AUDIT.md.

### `_sanity.py` — render sanity
- **CLI:** `python3 _sanity.py <layer-dir>` (recursive).
- Axis 3: a `dark*.png` must read dark, a `light*.png` light (theme-agnostic luma threshold).

### `_coverage.mjs` — external-inventory coverage gate (--views-from)
- **Purpose:** make "looks complete" and "is complete" the same thing: join the
  route→state→variant inventory file against `manifest.json` § coverage and
  VERIFY every "mocked" claim on disk (dark/light html + png present).
- **CLI:** `node _coverage.mjs <inventory.md> [--manifest manifest.json] [--advisory]`
- **Parses:** `##`/`###` section headers (route = text after the last `·`) containing
  tables headed `| # | State | …` or `| # | Variant | …`; one data row per variant.
  Rows glyphed ⚠ (spec gap) are counted separately and never gate. Prose-only
  variants are not parsed — cross-check against the inventory's own summary.
- **Output:** totals (mocked/deferred/missing/broken/spec-gap) + per-route counts +
  every missing/broken key. Exit 0 iff missing = broken = 0 (`--advisory` always 0;
  exit 2 = inventory unparseable, with the expected format printed).

### `_build-catalog.mjs` + `browse/` — Design Review Browser
- **Purpose:** knit every deconstruct leaf into one human review surface. Generic
  over any `<output>/` tree — no project constants. Catalog is deterministic;
  the shell is a staged static SPA (editorial lightbox: film-strip, keyboard,
  theme/pair, live HTML, local feedback export).
- **CLI:** `node _build-catalog.mjs` (cwd = `<output>/`)
  - `--root <dir>` · `--out browse/catalog.json` · `--layer views|atoms|…`
- **Scans:** `views/**/dark.html` (route→state→leaf), plus `atoms|molecules|organisms/{name}/`.
  Optional: `manifest.json` § coverage for status enrichment; nearest `README.md` H1 for labels.
- **Emits:** `browse/catalog.json`
- **Shell:** `browse/index.html` (+ `browse.css`, `browse.js`) — serve from `<output>/`:
  ```
  cd <output> && python3 -m http.server 8765
  open http://localhost:8765/browse/
  ```
  Requires http(s) (`fetch` catalog + iframe leaves). Do not open via `file://`.
- **Standalone regen** (existing trees without a full re-run): copy staged tooling
  from this skill's `assets/tooling/{_build-catalog.mjs,browse/}` into `<output>/`, then
  `node _build-catalog.mjs`.
- **Invariant:** `catalog.counts.views` equals the number of view leaves with `dark.html`.

## Per-phase call order

```
Phase 0:  bash _preflight.sh <concept>                 # blank-check + reference frames
Phase 1:  (subagent fills build-tokens.mjs tables) → node tokens/build-tokens.mjs → render tokens.html
Phase N:  node _build-bundle.mjs <layer>               # molecules/organisms/views only
          (subagent authors {component}/_src.html)
          node _process.mjs <layer> {component}        # split + render + audit + sanity → verdict
Phase 5:  + node _coverage.mjs <inventory>             # with --views-from
          + node _build-catalog.mjs                    # Design Review catalog
Final:    node _audit.mjs {atoms,molecules,organisms,views} ; python3 _sanity.py … (all layers)
          + node _coverage.mjs <inventory>             # with --views-from
          + node _build-catalog.mjs                    # refresh catalog
```
