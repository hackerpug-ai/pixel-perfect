---
description: "Optional first step: deconstruct existing UI (code, URL, screenshot, or concept) into token-governed HTML mockups that seed the pixel-perfect build (Phase 0)"
---

# Design Deconstruct (Phase 0 — optional on-ramp)

Most pixel-perfect projects start from a PRD. **This command lets you start from an existing design instead.** Point it at any UI — a running site, a component repo, a screenshot, a Claude Design export, or a written concept — and it produces a **token-governed atomic design system of HTML mockups** under `design/system/`, then wires those outputs so `init` → `scaffold` → `build` reconstruct them as real, themed components in Storybook.

This does **not** contradict pixel-perfect's "skip the mockup abstraction" philosophy. The deconstructed HTML is a *precise, token-governed reference spec* — clean markup + semantic tokens the AI reads perfectly ("AI reads code better than pixels"). It is the **target**, never the deliverable: the real framework components still supersede it. Mockups live in `design/system/` and are never shipped.

```
design-deconstruct (Phase 0, optional)   ← you have existing UI or a concept
        │  produces design/system/ (tokens + atoms…views HTML mockups + PNGs)
        ▼
     research (optional) ─▶ init ─▶ scaffold ─▶ build ─▶ verify
        (seeds vibe + theme + screen/atom inventory + pixel-perfect targets)
```

## Usage

```
/pixel-perfect:design-deconstruct <source> [options]
```

## Arguments

- `<source>`: what to deconstruct. Auto-detected:
  - **path to UI code** — a component file, a directory, or a repo (`.svelte`/`.tsx`/`.jsx`/`.vue`/`.html`/`.css`)
  - **URL** — a running site/app (`https://…`)
  - **image** — a screenshot of a UI (`.png`/`.jpg`/`.webp`)
  - **Claude Design HTML** — a standalone HTML export (passed through; bundled exports are decoded)
  - **concept** — a `.md`/`.txt` description, or quoted free text
  - **wireframes** — a `design/wireframes/` directory from `/pixel-perfect:wireframe` (the low-fi rung; its ASCII screens become the concept)

## Options

- `--output <dir>`: design-system output directory (default: `design/system`)
- `--from <type>`: force the input type (`code` | `url` | `image` | `html` | `concept`) instead of auto-detecting
- `--name <name>`: name for the generated concept file (default: derived from the source)
- `--resume-from <phase>`: resume the deconstruction at a phase (`tokens` | `atoms` | `molecules` | `organisms` | `views`)
- `--force`: full re-deconstruction, ignoring existing output
- `--no-seed`: produce `design/system/` only; do **not** write the pixel-perfect seed files (`theme-seed.json`, `deconstruction.json`) or touch the manifest

## Gate Check

**No gate required** — this command runs before `init`. If a `design/manifest.json` already exists, the seed/marker step (Step 3) updates it in place; otherwise the artifacts are left for `init` to detect.

---

## Workflow

### Step 0: Detect engine + renderer

1. **Deconstruction engine.** Check whether the **`design-deconstruct` skill** is available (it is the authoritative engine: 5 phases tokens → atoms → molecules → organisms → views, each component a README + HTML + PDF + PNG quartet, token-governed with a zero-hardcoded-values audit).
   - **Available** → delegate the deconstruction to it (Step 2A). This mirrors how pixel-perfect optionally delegates aesthetics to `frontend-design`.
   - **Not available** → run the **built-in fallback** deconstruction (Step 2B). The fallback is real (it extracts tokens and emits atom + screen HTML mockups) but lighter (no PDF, PNG only if headless Chrome is present, no cascade engine). Tell the user which engine ran.
2. **Renderer.** Check for headless Chrome (`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` on macOS, or `google-chrome`/`chromium` on PATH). PNG snapshots require it. If absent, continue with HTML-only mockups and note the degradation — **do not fail**.

Report the detected engine + renderer before proceeding. Never silently substitute a stub for the deconstruction.

### Step 1: Acquire & normalize the source into a concept HTML

The engine consumes a **concept HTML**. Normalize every input type into one self-contained file at `design/concepts/<name>.html`. Use whatever tools are available; if a source genuinely cannot be acquired, **stop and report** — never fabricate a design.

| Input type | How to normalize → `design/concepts/<name>.html` |
|------------|---------------------------------------------------|
| **Code** (file/dir/repo) | Read the components + styles. Assemble one static, self-contained HTML page that renders the source UI's structure and visual styling (inline the relevant CSS / Tailwind classes). For a multi-screen repo, capture the primary screens; **log which screens were included and which were skipped**. |
| **URL** | Fetch the rendered page. Prefer a tool that returns real DOM + a screenshot: `mcp__claude-in-chrome` (navigate + screenshot), else `mcp__jina__read_url` / `mcp__jina__capture_screenshot_url`, else `WebFetch`. Inline styles/assets into a self-contained concept HTML. |
| **Image** | View the screenshot and reconstruct a faithful concept HTML from the visual (layout, hierarchy, colors, type). If `frontend-design` is available, use it to raise fidelity. |
| **Claude Design HTML** | Use as the concept directly (copy into `design/concepts/`). The engine decodes bundled `__bundler/template` exports itself. |
| **Concept** (text/PRD) | Synthesize a concept HTML from the description (use `frontend-design` if available for a distinctive, coherent starting point). |
| **Wireframes** (`design/wireframes/`) | Read the per-screen ASCII wireframes and assemble one concept HTML laying out the same screens/regions (box-drawing layout → HTML structure; the annotations name the components). Produced by `/pixel-perfect:wireframe` — the low-fi rung below this command. |

Write `design/concepts/<name>.html`. This file is the hand-off to the deconstruction engine.

### Step 2A: Deconstruct via the skill (when available)

Invoke the skill against the normalized concept, targeting the pixel-perfect output dir:

```
Skill("design-deconstruct", "design/concepts/<name>.html --output <output>")
# pass through --resume-from / --force when supplied
```

It produces `<output>/` with: `tokens/` (`tokens.css`, `theme.light.json`, `theme.dark.json`, `theme.schema.json`), `typography/`, `atoms/…`, `molecules/…`, `organisms/…`, `views/…` (each a README + HTML + PDF + PNG quartet), `tokens.html`, and `manifest.json`. Let the skill own its TaskList, quality audit, and cascades.

### Step 2B: Built-in fallback deconstruction (when the skill is absent)

Produce the same `<output>/` shape, lighter but **real** — not a stub:

1. **Tokens** — extract semantic tokens from the concept (colors, type scale, spacing, radii, shadows) into `tokens/tokens.css` (light + dark CSS custom properties) and `tokens/theme.light.json` + `tokens/theme.dark.json`. Name every token by role, not by value — use pixel-perfect's semantic color names (`primary`, `primary-foreground`, `secondary`, `background`, `foreground`, `muted`, `muted-foreground`, `accent`, `destructive`, `border`, …; the full table is in `commands/scaffold.md` Step 4b). (If the `design-deconstruct` skill is installed, prefer its richer `docs/SEMANTIC-TOKENS.md` vocabulary — but the fallback must not depend on it.)
2. **Atoms / Molecules / Screens** — identify components from the concept and write a self-contained HTML mockup per component (`<output>/{layer}/{name}/{name}.html`) that references `tokens.css` (zero hardcoded colors/spacing). Group full pages under `views/`.
3. **PNGs** — if headless Chrome is present, render each HTML to a sibling `.png` with a headless screenshot, e.g. `"<chrome>" --headless --screenshot="<name>.png" --window-size=1320,2400 --hide-scrollbars "<name>.html"` (use the resolved Chrome/Chromium path from Step 0). If Chrome is absent, skip PNGs and note it — HTML mockups alone are still usable targets.
4. Write `<output>/manifest.json` recording engine=`builtin`, the concept path, and any gaps.

### Step 3: Wire outputs into pixel-perfect

(Skip this entire step if `--no-seed`.) Translate the design system into pixel-perfect's process inputs:

1. **Theme seed** — read `tokens/theme.light.json` + `tokens/theme.dark.json` and write **`design/theme-seed.json`**, mapping the deconstruction's semantic vocabulary to pixel-perfect's theme token names (the bridge is in `SEMANTIC-TOKENS.md`: e.g. `semantic.accent.primary → primary`, `semantic.surface.page → background`, `semantic.text.body → foreground`, `semantic.border.default → border`). Shape:
   ```json
   {
     "derived_from": "design/system/tokens/theme.{light,dark}.json",
     "themes": ["light", "dark"],
     "colors": { "primary": { "light": "#…", "dark": "#…" }, "background": { "light": "#…", "dark": "#…" } },
     "typography": { "font_body": "…", "scale": { "…": "…" } },
     "spacing": { "…": "…" }, "radius": { "…": "…" }
   }
   ```
2. **Inventory + targets** — write **`design/deconstruction.json`** mapping the design-system layers to pixel-perfect build levels:
   ```json
   {
     "design_system": "design/system",
     "engine": "skill",
     "source": { "type": "url", "ref": "https://…", "concept_html": "design/concepts/<name>.html" },
     "level_map": { "tokens": "theme", "atoms": "atoms", "molecules": "molecules", "organisms": "screen-sections", "views": "screens" },
     "inventory": {
       "atoms":     [{ "name": "Button", "html": "design/system/atoms/button/button.html", "png": "design/system/atoms/button/button.png" }],
       "molecules": [ … ],
       "organisms": [ … ],
       "views":     [{ "name": "Feed", "html": "design/system/views/feed/feed.html", "png": "design/system/views/feed/feed.png" }]
     }
   }
   ```
   Each view (and its PNG) is a **pixel-perfect target** — the reference the real screen is built to match during COMPOSE.
3. **Manifest markers** — if `design/manifest.json` exists, set top-level `deconstructed: true`, `design_system: "design/system"`, and append each view's HTML/PNG to `references`. If no manifest exists, leave the seed files for `init` to detect (Step in `init.md`).

### Step 4: Report + next step

```
Deconstructed: <source>  (engine: skill | builtin; renderer: chrome | html-only)

  design/concepts/<name>.html      normalized concept
  design/system/                   tokens + atoms…views (HTML mockups[, PNGs])
  design/theme-seed.json           semantic theme for scaffold
  design/deconstruction.json       inventory + pixel-perfect targets

  Inventory: N atoms, N molecules, N organisms, N views
  [skipped: <screens not captured>]   ← only if a source was sampled

These HTML mockups are design TARGETS — pixel-perfect will build real, themed
components in Storybook to match them.

Next: /pixel-perfect:init   (it will detect design/system/ and pre-seed vibe,
theme, and the screen/atom inventory)
```

---

## Edge Cases

| Case | Handling |
|------|----------|
| Source missing / unreadable / URL unreachable | Stop and report; suggest a valid source. Never fabricate a design. |
| `design-deconstruct` skill absent | Run the built-in fallback (Step 2B); state that output is lighter (no PDF/cascade). |
| Headless Chrome absent | Produce HTML-only mockups; note PNGs were skipped. Do not fail. |
| Large repo / many screens | Capture the primary screens; **log included vs skipped** in the report. Offer `--from code --name <screen>` to target more. |
| Existing `design/system/` | Honor `--resume-from` / `--force` (skill handles selective regen). Without flags, the skill prompts which phases to regenerate. |
| Manifest already at a later phase | Write seed files; warn that `init`/`scaffold` already ran and that re-seeding the theme may require `--force` on scaffold to take effect. |
| Multi-platform project | The design system is framework-agnostic HTML — the same `design/system/` drives any platform's build (React or SvelteKit). |

## Relationship to other commands

- **`/pixel-perfect:research`** gathers *external* design patterns/competitor analysis into `design/research/`. `design-deconstruct` instead captures a *specific* UI as a buildable spec. They compose: research informs vibe; deconstruct provides the concrete target.
- **`/pixel-perfect:init --existing`** onboards components that already live *in the current repo* (detect + generate stories). `design-deconstruct` brings in an *external* source (or a concept) and produces mockups to build toward. Use `--existing` when the code is already yours; use `design-deconstruct` when you're recreating an external design or a concept.

## Examples

```bash
# From a live site
/pixel-perfect:design-deconstruct https://linear.app

# From a screenshot
/pixel-perfect:design-deconstruct ./refs/dashboard.png

# From an existing component repo
/pixel-perfect:design-deconstruct ../old-app/src/components

# From a Claude Design export
/pixel-perfect:design-deconstruct .spec/design/concepts/home.html

# From a written concept, custom output, no manifest seeding
/pixel-perfect:design-deconstruct "a calm, data-dense analytics dashboard, dark mode" --from concept --no-seed
```
