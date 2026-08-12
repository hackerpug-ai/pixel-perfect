# Upgrading to Pixel Perfect 8.0

Version 8.0 introduces the **living design system**: catalog capture as durable truth, and `evolve` for inventory changes.

## What breaks

- **Authored composition edges are no longer gates.** `molecules[].atoms`, `screens[].organisms`, and similar arrays (if present) are optional human hints only. Dependencies come from catalog capture (`verify-catalog.mjs --blast` / `--reach`).
- **`controls: true` is not authority.** Controls/variants coverage is derived from the capture artifact.
- **Inventory changes** (add a screen, drop a screen, promote a pattern, deprecate) go through **`pixel-perfect:evolve`**. `refine` stays implementation-only.

## Migrate an existing project

1. **Generate a capture command** if missing (`npm run sandbox:capture` or platform equivalent). See `plugins/pixel-perfect/docs/sandbox-spec.md` piece #8 and `docs/adapters/custom-sandbox.md`.
2. **Record capture on the platform** in `design/manifest.json`:
   ```json
   "capture": {
     "command": "npm run sandbox:capture",
     "medium": "dom+png",
     "goldens": "design/goldens/web-desktop"
   },
   "pinned": [],
   "deprecations": {}
   ```
3. **Baseline once** (writes committed goldens):
   ```
   node {plugin}/scripts/verify-catalog.mjs --baseline <project-root> --platform {platform}
   ```
4. **Stop re-authoring** composition-edge arrays or `controls: true` as pass/fail signals. Optional cleanup of those fields is fine; not required for goldens to work.
5. Use **`status`** / **`verify`** for drift; use **`evolve`** for inventory; use **`refine`** for look-and-feel of an existing entity.

## Tokens

Scaffold creates `design/system/tokens/CHANGELOG.json`. Value/rename/remove changes append an entry and **re-capture** (rename must leave zero stories drifted after codemod). See refine’s token recipe.

## Deprecations

`evolve --deprecate <name>` writes `platforms[platform].deprecations`, badges the story, and fails `verify-catalog.mjs --check` when other files still compose that name.
