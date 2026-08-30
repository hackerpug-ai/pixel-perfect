# Upgrading to Pixel Perfect 9.0

Version 9.0 removes `design-deconstruct` and the bundled deconstruct engine. Its one useful step — reading every frame of a design once and coming back with the complete list of components and screen states to make — is now **Phase 4a DESIGN INVENTORY inside `build`**. Nothing produces HTML mockups any more; the design is the reference and the component is the deliverable.

## What breaks

- **`pixel-perfect:design-deconstruct` is gone** (all harnesses). Its outputs — `design/system/{atoms,molecules,organisms,views}/`, `design/deconstruction.json`, `design/theme-seed.json`, and the `deconstructed`/`design_system` manifest markers — are no longer read by any workflow.
- **`build` reads designs before it plans.** When `manifest.references` names a design source and `design/inventory.json` is missing or stale, the first turn of `build` renders the references to `design/reference/`, dispatches one whole-design read, gates it with `verify-inventory.mjs`, and asks `B-inv` before anything else. Projects with no design references are unchanged.
- **Per-item targets are frames**, not mockups: `design/reference/{slug}/{NN}.png`, tied to each entity by `design/inventory.json`.
- **`scaffold`** no longer reads `theme-seed.json`; it reads the spec's token table, then the design references directly, then vibe keywords.

## Migrate an existing project

1. Keep `design/system/tokens/` — that is scaffold's token home and still used. Delete the mock layers if you like: `design/system/{atoms,molecules,organisms,views,browse,reference}`, `design/deconstruction.json`, `design/theme-seed.json`. Drop `deconstructed` and `design_system` from `design/manifest.json` (ignored either way).
2. Make sure every design source is listed in `manifest.references` **where it lives** (decks that import sibling partials must stay beside them).
3. Run `pixel-perfect:build`. Phase 4a renders the references, reads them once, and asks you to confirm the inventory; existing component names in the manifest are reused, not renamed. Confirmed, the manifest carries an `inventory` receipt (`file`, `reference`, `confirmed`, `sources[].hash`).
4. Later phases now read their lists from `design/inventory.json`; `B-atoms`, `B-mol`, and `B-org` no longer fire on an inventoried project.

## Frame detection

`render-frames.mjs --frame-selector` defaults to `auto`: the Claude Design `.fr` frame class, then the top-most bordered boxes of screen size (how Claude Design canvases draw screens — their runtime rewrites inline colors to `rgb()`, so an authored-style selector never matches the live DOM), then one full-page frame with a warning. Set the selector when a multi-screen deck falls back to full page.
