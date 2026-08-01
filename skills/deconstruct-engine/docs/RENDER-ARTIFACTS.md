# RENDER-ARTIFACTS

Chrome headless + PIL trim recipe for the PNG + PDF half of every mock. The
implementation is the staged `_render.sh` (copied into `<output>/` at run start);
this doc explains what it does and the invariants. The orchestrator runs it after
`_split.mjs` has emitted the single-theme files. **Subagents never run Chrome.**

## REQUIREMENTS

- `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` on macOS (override
  with `CHROME=…`). If missing, exit with an install prompt — no fallback.
- Python 3 with PIL (`Pillow`) on `python3`.

## ONE THEME + ONE STATE PER ARTIFACT

The THEME-PAIR contract means every leaf folder holds `dark.html` + `light.html`.
`_render.sh` renders each separately:

```
{leaf}/dark.html   → dark.pdf   dark.png   (+ dark-mobile.png  for views)
{leaf}/light.html  → light.pdf  light.png  (+ light-mobile.png for views)
```

Never render both themes from one document, and never trim a dark artifact against
a light canvas (or vice-versa) — the per-theme canvas (below) prevents that.

## RUN

```bash
bash _render.sh <layer> [subpath]

bash _render.sh atoms             # every atom gallery — desktop only
bash _render.sh molecules
bash _render.sh organisms
bash _render.sh views             # full pages — desktop (1320px) + mobile (375px)
bash _render.sh atoms button      # ONE component subtree
bash _render.sh views rig/timeout # one nested view-state leaf
```

The optional `subpath` narrows the scope to a single component subtree — that is
the form `_process.mjs` uses, so a per-component regen never re-renders the whole
layer.

`_render.sh`:
1. **Recurses arbitrary depth** — `find "$DIR/$LAYER" -name '*.html'` — so nested
   view state folders (`views/rig/arena-terminal/timeout/dark.html`) are covered.
2. For each HTML: prints a PDF (`--no-pdf-header-footer`), shoots a tall PNG
   (`--window-size 1320,…`), and for views also a `375`-wide `*-mobile.png`.
3. **Trims each PNG to content** against the canvas implied by its theme.

## PER-THEME CANVAS (read from tokens — never hardcoded)

The PIL trim finds the last row that differs from the page background. That canvas
color is resolved **per theme from the emitted tokens**, so it generalizes to any
concept's palette:

- `dark.*`  → `tokens/theme.dark.json`  surface value
- `light.*` → `tokens/theme.light.json` surface value
- tries `surface.arena` then `surface.page`, then the first `surface.*`; accepts
  `#rgb` / `#rrggbb` / `rgb()/rgba()`; falls back to a near-black / near-paper default.

This is why the page's outermost background MUST be a surface token (it is, by the
token contract) — the trim canvas and the rendered background are the same value.

## RENDER-SANITY (third governance axis)

After rendering, `_sanity.py` confirms each PNG read the RIGHT theme (a 404-CSS
"unstyled" page renders white → a `dark.png` reading bright is flagged; a wrong-theme
render is flagged). It uses a theme-agnostic luma threshold on the top band:

```bash
python3 _sanity.py views        # dark.* must read dark, light.* must read light
```

This catches the two failures token/link audits cannot see: unstyled renders
(broken stylesheet link) and wrong-theme renders.

## PER-CATEGORY PRIMITIVES PNG (Phase 1 only)

After rendering `tokens.html`, optionally crop each category section
(typography, surface, text, border, accent, status, elevation, spacing, radius,
motion, layout/stroke) into `<output>/primitives/{category}.png` for LLM reference
(measure bounding boxes via a wrapper that reports `getBoundingClientRect()`).

## FAILURES

- **Chrome GPU errors** — keep `--disable-gpu`; harmless on macOS headless.
- **Empty PDF** — fonts (or runtime-resolved assets) haven't loaded; raise the
  virtual-time budget via the `VTB` env: `VTB=15000 bash _render.sh views`. See
  § SETTLE below — no script edit needed.
- **Untrimmed (full-height) PNG** — the trim canvas didn't match the page bg: the
  outermost background isn't the `surface.arena`/`surface.page` token, or the theme
  JSON is missing. Fix the page bg token or the canvas resolution, re-run.
- **`_sanity.py` flags a dark PNG as too bright** — almost always a broken stylesheet
  link (page rendered unstyled). Check `_audit.mjs` link-resolution for that file.

## REPRODUCIBILITY

Deterministic modulo font substitution (if `@font-face` fails to download) and the
`--virtual-time-budget` clock. Keep the budget constant and avoid ambient timestamps
(`new Date()`) in mocks for byte-stable output.

## SETTLE — documents that resolve assets at runtime

Bundled concept exports (and any mock loading runtime-resolved assets) need the
page's JS to finish before capture: Claude Design standalone HTML carries a
manifest of base64+gzip blobs that an inline bundler decodes into `blob:` URLs
after load. Chrome's virtual time budget fast-forwards timers, so the knob is
the `VTB` env var:

```bash
VTB=15000 bash _render.sh views          # generous budget for asset-heavy mocks
VTB=30000 bash _preflight.sh concept.html  # stubborn decks
```

Defaults: `_render.sh` 7000ms (component mocks are local-CSS only),
`_preflight.sh` 15000ms (raw concepts are the risky ones). Symptoms of a
too-small budget: empty/cream PNG, missing photographs, `_sanity.py` flagging a
dark PNG as bright. The preflight blank-check catches this at Phase 0 — if it
fired, fix the budget BEFORE running any phase.

## PREFLIGHT REFERENCE FRAMES (Phase 0)

`_preflight.sh <concept.html>` renders the raw concept once and extracts one
PNG per design frame into `reference/`:

- Frame boxes are measured **from the DOM** — a wrapper page iframes the
  concept and reads `getBoundingClientRect` for `FRAME_SELECTOR` (default
  `.fr`, the Claude Design frame class). Pixel-gap heuristics are deliberately
  not used: real decks put cream phones on a cream page with shadow-filled
  gaps, which defeats background detection.
- Reading order: row bands by top edge, then left→right.
- The frames feed the OPTIONAL `--fidelity` vision pass (advisory findings,
  never a gate) and give phase subagents a visual reference next to the HTML.
- No selector match → `concept-full.png` is the single reference and the run
  continues with a warning; set `FRAME_SELECTOR` to the concept's frame class
  and re-run to get per-frame crops.
