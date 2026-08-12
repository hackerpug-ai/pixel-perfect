# Scaffold (Phase 4)

Set up the project for the chosen tools. Installs dependencies, configures the build environment, creates a theme file from the project vibe, generates design token stories for the component sandbox, and verifies with a hello-world component.

## Usage

```
pixel-perfect:scaffold [directory] [options]
```

## Arguments

- `[directory]`: Project directory. Defaults to current directory.

## Options

- `--platform <name>`: Target platform to scaffold (e.g., `mobile-ios`, `web-desktop`). Required when multiple platforms exist. Auto-selected when only one platform is configured.

## Gate Check

**Requires:** `design/manifest.json` with top-level gates discover, target, and equip = passed.

**Platform selection:**
- If only one platform exists in the manifest, it is auto-selected.
- If multiple platforms exist and `--platform` is not provided, ask. One option per configured platform, carrying its current gate state; the first platform whose scaffold gate is still `pending` is the recommendation:

  ```user_choice
  batch: S1 — which platform to scaffold
  - header: Platform
    question: Which platform should be scaffolded now?
    options:
      - label: mobile-ios (Recommended)
        description: Scaffold gate is still pending, so this platform has no theme, no sandbox, and no hello-world component yet. Scaffolding it does not touch the platforms already done.
      - label: web-desktop
        description: Scaffold gate already passed — theme, sandbox, and hello-world component exist. Re-scaffolding needs --force and resets that platform's downstream gates.
  ```
- If the selected platform's scaffold gate is already `passed`:
  ```
  Scaffold already complete for "web-desktop".
  Run with --force to re-scaffold, or choose a different platform.
  ```

If top-level gates are not met:
```
Cannot scaffold: missing prerequisites.
  discover: passed
  target: passed
  equip: NOT PASSED — run pixel-perfect:init first

Run pixel-perfect:init to complete project setup.
```

## What It Does

1. **Read manifest** - Load tool choices and vibe from `design/manifest.json`
2. **Load adapters** - Read relevant adapter docs from `docs/adapters/`
3. **Install tools** - Follow adapter scaffold steps
4. **Configure Sandbox** - Generate a native component browser by default (`custom` — see `docs/sandbox-spec.md`); or set up the chosen tool (Storybook, tui-sandbox, etc.)
5. **Create theme** - Generate the theme from the vibe through the bundled design contract
6. **Enforce semantic colors** - Detect non-semantic color tokens, guide migration, verify in sandbox
7. **Generate design token stories** - Create visual documentation for Colors, Typography, Spacing, and Icons
8. **Hello world** - Create first component + story with sandbox controls example
9. **Verify** - Confirm sandbox runs, token stories render, and hello-world component renders
10. **Update manifest** - Set `scaffold: passed`

## How this workflow asks

Every decision below is collected with `USER_CHOICE` — see `workflows/RUNTIME-CONTRACT.md`, "User choice protocol" and "Turn shape". The `user_choice` blocks in this file are the wording and options to use with the harness's question mechanism; they are never printed.

Scaffold is mostly execution: it installs, configures, and generates. Its output is therefore **progress, not analysis** — one line per step naming what ran and what it produced. Adapter tables, install logs, and file inventories go nowhere; the artifacts on disk are the evidence.

Open with a digest of what is about to be installed, in twelve lines or fewer:

```
SCAFFOLD — web-desktop · vite + tailwind + shadcn/ui + lucide-react → custom sandbox
  Adapters: tailwind, shadcn, custom-sandbox   Theme: from vibe "clean, high-contrast"
  10 steps. Nothing installed yet.
```

| Batch | Step | Decisions | Fires |
|-------|------|-----------|-------|
| S1 | entry | which platform to scaffold | only when several platforms are configured and no `--platform` was passed |
| S2 | 3b | reuse or regenerate the theme | only when a sibling platform already has a passing scaffold gate |
| S3 | 4b | migrate non-semantic color names | only when the generated theme contains colors named for what they look like |
| S4 | 4b | the color gate | always — this is the human check that the palette renders |

Worst case is four calls; the common case on a single-platform project is one — the color gate.

---

## Task-Based Execution

Scaffold uses TASK_LIST for compaction-resilient progress tracking. On start, create one task per step above (Steps 1–10). On resume after compaction, call `TASK_LIST()`, find the first non-completed task, and continue from there. Each task stores phase, step number, and relevant adapter paths in metadata for recovery context. Show progress at the start of each task.

---

## Workflow

### Step 1: Load Adapter Docs

Read the selected platform's tool choices from `manifest.platforms[platform].tools`, then load the corresponding docs:

| Manifest field | Adapter location |
|----------------|-----------------|
| `platforms[platform].tools.framework` | `docs/adapters/{framework}.md` (optional — load only if it exists) |
| `platforms[platform].tools.style` | `docs/adapters/{style}.md` |
| `platforms[platform].tools.components` | `docs/adapters/{components}.md` |
| `platforms[platform].tools.sandbox` | `docs/adapters/{sandbox}.md` |

**Framework adapter (optional).** Some frameworks ship a dedicated adapter that teaches framework-specific project structure, sandbox setup, and story format (e.g., `docs/adapters/sveltekit.md`). Load `docs/adapters/{framework}.md` **if it exists**. React / Next.js / Vite have **no** framework adapter — their setup is the default path baked into `docs/adapters/custom-sandbox.md` (or `storybook.md` if Storybook was chosen), so finding none is expected and is **not** a warning.

If no adapter exists for a **style, components, or sandbox** tool, load `docs/adapters/generic.md` and warn:
```
No adapter found for "{tool}". Using generic adapter (process enforcement only).
The AI will use its general knowledge for tool-specific setup.
```

### Step 2: Execute Adapter Scaffold Steps

Follow the **Scaffold** section of each loaded adapter doc, in order:

1. Framework adapter scaffold steps — **only if a framework adapter was loaded** (project structure + framework-specific Storybook init + story format)
2. Style adapter scaffold steps (install, configure)
3. Component adapter scaffold steps (install, configure)
4. Icon library installation (Step 2a)
5. Sandbox adapter scaffold steps (Step 3)

Each adapter doc specifies exact commands. Execute them sequentially.

### Step 2a: Install Icon Library

Install the icon library specified in the manifest:

| Library | Platform | Install |
|---------|----------|---------|
| `lucide-react-native` | RN/Expo | `npm install lucide-react-native react-native-svg` |
| `@expo/vector-icons` | Expo | Included with Expo — no install needed |
| `lucide-react` | Web | `npm install lucide-react` |
| `heroicons` | Web | `npm install @heroicons/react` |

After installation, create an Icon wrapper component for consistent usage. Consult the loaded adapter doc for the exact wrapper pattern (cssInterop for NativeWind, cn() wrapper for web Tailwind).

For custom icon libraries, reference the `icons_docs` URL in the manifest.

### Step 2b: CLI-Based Component Libraries

If `tools.components` is `shadcn`, `shadcn-svelte`, or `react-native-reusables`, pull ALL components during scaffold:

- **shadcn/ui:** `npx shadcn@latest add --all --overwrite`
- **shadcn-svelte:** `npx shadcn-svelte@latest add --all --overwrite --yes` (components land in `$lib/components/ui/`)
- **React Native Reusables:** `npx @react-native-reusables/cli@latest add` (all components)

After pulling:
1. Verify the project theme is applied (CSS variables in global.css, theme.ts mirror if RN)
2. Generate a story file for each pulled component — follow the story template in `docs/adapters/{components}.md`
3. Track in manifest: `components_pulled: true`, `components_count: N`, and array of component names

Follow `docs/adapters/{components}.md` for the exact component list and story template.

### Step 3: Configure Sandbox

Check `manifest.platforms[platform].tools.sandbox`:
- `"custom"` (**default**) -> **Build a native component browser from scratch** per `docs/adapters/custom-sandbox.md` (implementing `docs/sandbox-spec.md`): create the sandbox project for the framework, the token codegen (`theme.*.json` → target constants), the registry + two-pane navigator, and a run command. Nothing off-the-shelf to install.
- `"storybook"` -> Follow `docs/adapters/storybook.md`
- `"storybook-native"` -> Follow `docs/adapters/storybook-native.md`
- `"tui-sandbox"` -> Follow `docs/adapters/tui-sandbox.md`

If a **framework adapter** was loaded (e.g. `sveltekit.md`), apply its sandbox-setup guidance for the chosen sandbox.

**Troubleshooting React/React-DOM version mismatch:** If Storybook shows `Invalid hook call` or blank page errors, run `npm ls react react-dom` to check for version conflicts. Install the matching `react-dom` version and use `overrides` in package.json to prevent drift on future installs.

### Step 3b: Theme Carry-Over Check

Before generating a theme, check if any sibling platform in the manifest already has a theme (its scaffold gate is `passed`).

If a sibling theme exists, prompt the user:

Report the sibling's actual values in the digest (primary, secondary, destructive, font family, spacing base), then ask. Name the real platforms and colors in the option text rather than the placeholders below.

```user_choice
batch: S2 — the theme for this platform
- header: Theme
  question: Should this platform reuse the theme already built for the other one?
  options:
    - label: Adapt the existing theme (Recommended)
      description: Maps each color to the closest equivalent this platform can render and keeps the semantic token names, so both platforms stay recognizably the same product. On a terminal UI that means the nearest ANSI 256 color.
    - label: Start fresh
      description: Generates a new theme from the project vibe, ignoring the sibling. The two platforms will not match unless you reconcile them by hand later.
    - label: Cherry-pick tokens
      description: Keeps some of the sibling's tokens and regenerates the rest. Choose Other and name the tokens to keep — for example the color palette but not the spacing scale.
```

For TUI platforms, "adapt" means mapping hex colors to the closest ANSI 256-color equivalents while preserving semantic token names (primary, secondary, destructive, etc.).

If no sibling theme exists, skip this step and proceed to theme generation as normal.

### Step 4: Create Theme

**If `design/theme-seed.json` exists (from `pixel-perfect:design-deconstruct`):**
1. Generate the theme directly from the seed — its semantic tokens (colors light/dark, typography, spacing, radius) map onto the chosen component library's theme format (CSS variables for shadcn / shadcn-svelte, `tailwind.config` extensions for plain Tailwind, a Skeleton theme, an MD3 object for Paper, etc.).
2. The seed is already semantic, so it satisfies the semantic-color requirement (Step 4b) by construction — verify, don't regenerate from vibe keywords.
3. `DESIGN_EXECUTE` may refine non-color aesthetics (font-pairing nuance, motion); do not discard the seed's grounded color/spacing values.

Load `docs/DESIGN-CONTRACT.md`, then run `DESIGN_EXECUTE` with the project vibe, selected platform, adapters, any theme seed, and existing product constraints. When `frontend-designer` is available it performs this work; otherwise the primary agent applies the same contract directly. Write the resulting concrete decisions into the theme file using the component library's required format. Never replace this step with a generic design agent or a keyword-only theme.

Follow `docs/adapters/{components}.md` for the component library's required theme file format (CSS variables for shadcn/RN Reusables, MD3 theme object for React Native Paper, createTheme for Mantine, tailwind.config.ts extensions for plain Tailwind).

### Step 4b: Enforce Semantic Color System

**CRITICAL:** After generating the theme, verify all color tokens use **semantic naming** (named by usage, not by value).

#### Semantic Color Token Reference

| Semantic Token | Usage | NOT |
|----------------|-------|-----|
| `primary` | Main brand action | `blue`, `indigo-600` |
| `primary-foreground` | Text on primary | `white`, `#fff` |
| `secondary` | Secondary action | `gray`, `slate-500` |
| `secondary-foreground` | Text on secondary | `gray-900`, `#1a1a1a` |
| `background` | Page background | `white`, `#fafafa` |
| `foreground` | Default text | `black`, `gray-900` |
| `muted` | Subdued backgrounds | `gray-100`, `#f5f5f5` |
| `muted-foreground` | Secondary text | `gray-500`, `#666` |
| `destructive` | Danger/delete | `red`, `red-600` |
| `destructive-foreground` | Text on destructive | `white`, `#fff` |
| `border` | Border color | `gray-200`, `#e5e5e5` |
| `accent` | Highlight/accent | `purple`, `amber-500` |
| `card` | Card background | `white`, `#fff` |

#### Detection Flow

After theme generation, scan theme files for non-semantic color patterns. If detected, ask — naming the actual offending tokens in the question:

```user_choice
batch: S3 — token naming
- header: Tokens
  question: Some theme colors are named for what they look like rather than what they do. Migrate them to semantic names?
  options:
    - label: Migrate now (Recommended)
      description: Renames colors like blue-500 to roles like primary. Semantic names are what make one theme swap cleanly to dark mode, and what makes a component's intent readable — and both shadcn/ui and Tailwind expect them.
    - label: Keep the current names
      description: Leaves the literal color names in place. Dark mode and any later re-theming become manual find-and-replace work across every component that references a color.
```

If "Yes, migrate now": present the proposed semantic mapping table (non-semantic → semantic, with usage notes) and allow the user to confirm or adjust before applying.

#### Sandbox Verification Gate

**CRITICAL:** After semantic colors are applied, the user verifies them in the sandbox before scaffold continues. Give them the two steps and nothing else:

```
Run: npm run sandbox   (or make sandbox / pnpm storybook)
Open: Design System → Colors — check the swatches render and the contrast holds.
```

Then ask. This is a **gate** — scaffold cannot complete until the user confirms the colors render acceptably:

```user_choice
batch: S4 — the color gate
- header: Colors
  question: Do the color swatches look right in the sandbox?
  options:
    - label: Colors look good (Recommended)
      description: Passes the scaffold color gate and continues to the build phase. Every component built from here inherits these swatches, so changing them later means re-verifying the components already done.
    - label: They need adjusting
      description: Holds scaffold open so you can edit the theme by hand. Nothing downstream runs until the colors pass, which is the point of the gate — it is cheaper to fix the palette now than after twenty components reference it.
```

### Step 5: Generate the Token Catalog

Register a token catalog in the sandbox under the **Tokens** layer (in Storybook these are `Design System/` stories; in a `custom` sandbox, Tokens-layer registry entries):

- **Colors** — Color swatches from theme palette
- **Typography** — Font scale with all type variants
- **Spacing** — Spacing scale visualization
- **Icons** — Icon gallery (only if icon library is configured)

Follow `docs/adapters/{components}.md` for the correct theme access method (useTheme hook, CSS vars, Tailwind config, etc.) and adapt the story to the actual theme structure. For native projects, stories must use React Native components — not HTML.

### Step 6: Hello World Component

Create a minimal component that uses the theme to verify the full stack works:

- **Component file** (`src/components/HelloWorld.tsx`): uses theme tokens for colors, fonts, spacing; accepts props controllable in Storybook (title, subtitle, variant, showIcon)
- **Story file** (`src/components/HelloWorld.stories.tsx`): typed meta, argTypes with controls for all props, Default + named variant stories

The hello-world story is a **reference example** for all future component stories. Follow `docs/storybook-conventions.md` for the argTypes pattern.

### Step 7: Verify

Confirm every one of these before the gate advances: the sandbox runs; Colors, Typography, Spacing (and Icons, when an icon library was selected) each render; HelloWorld — or every pulled CLI-library component — renders with its controls wired; the theme colors are actually applied; **and the catalog capture command exists and has produced a hello-world golden** (sandbox-spec piece #8).

**Catalog capture (piece #8).** Generate `sandbox:capture` (or the platform equivalent) per `docs/adapters/custom-sandbox.md` / the sandbox adapter. Record on the platform:

```json
"capture": {
  "command": "npm run sandbox:capture",
  "medium": "dom+png",
  "goldens": "design/goldens/{platform}"
}
```

Then run the deterministic gate so the first golden exists before the first atom:

```
node {plugin}/scripts/verify-catalog.mjs --baseline <project-root> --platform {platform}
```

Exit `0` required. Exit `3` (zero stories) means the capture command is not producing artifacts — fix it before advancing scaffold. Goldens commit under `design/goldens/{platform}/…`.

Report a pass as one line. Report a failure by naming the specific check and the error, and do **not** advance the gate — the user runs `pixel-perfect:verify` to retry after fixing.

```
Verified: sandbox runs · 4 token stories render · HelloWorld renders with controls.
```

### Step 8: Update Manifest

On success, update the selected platform's gates:
```json
{
  "platforms": {
    "{platform}": {
      "phase": "scaffold",
      "gates": {
        "scaffold": "passed"
      }
    }
  }
}
```

---

## Sandbox Organization

After scaffold, the sidebar/catalog structure is (same layout for custom sandbox or Storybook):

```
Design System/
  Colors
  Typography
  Spacing
  Icons (conditional)
Components/
  HelloWorld
  (+ all CLI-library components, if applicable)
Screens/
  (empty — populated during COMPOSE phase)
```

---

## Completion Output

```
Scaffold complete — {platform}

  vite + tailwind + shadcn/ui → custom sandbox   ·   47 components pulled
  Theme: Space Grotesk / Inter, primary #D97706   ·   4 token stories

  Next: pixel-perfect:build --platform {platform}
```
