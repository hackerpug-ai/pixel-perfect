---
description: "Set up project structure, install tools, create theme, generate design token stories, and verify with hello-world component (phase 4: SCAFFOLD)"
---

# Scaffold (Phase 4)

Set up the project for the chosen tools. Installs dependencies, configures the build environment, creates a theme file from the project vibe, generates design token stories for the component sandbox, and verifies with a hello-world component.

## Usage

```
/pixel-perfect:scaffold [directory]
```

## Arguments

- `[directory]`: Project directory. Defaults to current directory.

## Gate Check

**Requires:** `design/manifest.json` with gates discover, target, and equip = passed.

If gates are not met:
```
Cannot scaffold: missing prerequisites.
  discover: passed
  target: passed
  equip: NOT PASSED — run /pixel-perfect:init first

Run /pixel-perfect:init to complete project setup.
```

## What It Does

1. **Read manifest** - Load tool choices and vibe from `design/manifest.json`
2. **Load adapters** - Read relevant adapter docs from `docs/adapters/`
3. **Install tools** - Follow adapter scaffold steps
4. **Configure Storybook** - Platform-aware setup (native for mobile, web for web projects)
5. **Create theme** - Generate theme file from vibe (with frontend-design if available)
6. **Enforce semantic colors** - Detect non-semantic color tokens, guide migration, verify in Storybook
7. **Generate design token stories** - Create visual documentation for Colors, Typography, Spacing, and Icons
8. **Hello world** - Create first component + story with Storybook controls example
9. **Verify** - Confirm sandbox runs, token stories render, and hello-world component renders
10. **Update manifest** - Set `scaffold: passed`

---

## Task-Based Execution

Scaffold uses TaskList for compaction-resilient progress tracking. On start, create one task per step above (Steps 1–10). On resume after compaction, call `TaskList()`, find the first non-completed task, and continue from there. Each task stores phase, step number, and relevant adapter paths in metadata for recovery context. Show progress at the start of each task.

---

## Workflow

### Step 1: Load Adapter Docs

Read manifest tool choices, then load the corresponding docs:

| Manifest field | Adapter location |
|----------------|-----------------|
| `tools.style` | `docs/adapters/{style}.md` |
| `tools.components` | `docs/adapters/{components}.md` |
| `tools.sandbox` | `docs/adapters/storybook.md` or `docs/adapters/storybook-native.md` |

If no adapter exists for a tool, load `docs/adapters/generic.md` and warn:
```
No adapter found for "{tool}". Using generic adapter (process enforcement only).
The AI will use its general knowledge for tool-specific setup.
```

### Step 2: Execute Adapter Scaffold Steps

Follow the **Scaffold** section of each loaded adapter doc, in order:

1. Style adapter scaffold steps (install, configure)
2. Component adapter scaffold steps (install, configure)
3. Icon library installation (Step 2a)
4. Sandbox adapter scaffold steps (Step 3)

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

If `tools.components` is `shadcn` or `react-native-reusables`, pull ALL components during scaffold:

- **shadcn/ui:** `npx shadcn@latest add --all --overwrite`
- **React Native Reusables:** `npx @react-native-reusables/cli@latest add` (all components)

After pulling:
1. Verify the project theme is applied (CSS variables in global.css, theme.ts mirror if RN)
2. Generate a story file for each pulled component — follow the story template in `docs/adapters/{components}.md`
3. Track in manifest: `components_pulled: true`, `components_count: N`, and array of component names

Follow `docs/adapters/{components}.md` for the exact component list and story template.

### Step 3: Configure Storybook

Check `manifest.tools.sandbox`:
- `"storybook-native"` → Follow `docs/adapters/storybook-native.md` (creates `.rnstorybook/`, custom `index.js` entry point, Metro config with `withStorybook`)
- `"storybook"` → Follow `docs/adapters/storybook.md` (web Storybook, `.storybook/` config, theme provider decorator)

**Troubleshooting React/React-DOM version mismatch:** If Storybook shows `Invalid hook call` or blank page errors, run `npm ls react react-dom` to check for version conflicts. Install the matching `react-dom` version and use `overrides` in package.json to prevent drift on future installs.

### Step 4: Create Theme

**If frontend-design plugin is available:**
1. Pass the project vibe to frontend-design for concrete aesthetic decisions (font pairing, color palette, border radius, motion philosophy, spatial rhythm)
2. Write these decisions into the theme file using the component library's required format

**If frontend-design is NOT available:**
```
frontend-design plugin not detected. Generating theme from vibe keywords only.
Install frontend-design for distinctive, characterful output.
```
Map vibe keywords to theme values using the vibe-to-theme mapping table in the loaded adapter doc.

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

After theme generation, scan theme files for non-semantic color patterns. If detected, use `AskUserQuestion`:

```
? Non-semantic colors detected. Migrate to semantic tokens?

Semantic naming is STRONGLY RECOMMENDED because:
  • Enables consistent theming across components
  • Simplifies dark mode implementation
  • Makes intent clear when reading code
  • Follows shadcn/ui and Tailwind best practices

    Yes, migrate now (Recommended)
    No, keep non-semantic colors
```

If "Yes, migrate now": present the proposed semantic mapping table (non-semantic → semantic, with usage notes) and allow the user to confirm or adjust before applying.

#### Storybook Verification Gate

**CRITICAL:** After semantic colors are applied, verify in Storybook before continuing:

```
## Storybook Color Verification

Open Storybook and verify the Colors story:
  → Navigate to: Design System > Colors
  → Check all color swatches render correctly
  → Verify contrast ratios are acceptable

? Do the colors look acceptable in Storybook?
    Yes, colors look good — continue to build
    No, I need to adjust colors — stay in scaffold
```

This is a **gate** — scaffold cannot complete until user confirms colors are acceptable. If "No", scaffold pauses until the user fixes colors manually.

### Step 5: Generate Design Token Stories

Create four stories under the `Design System/` group:

- `Design System/Colors` — Color swatches from theme palette
- `Design System/Typography` — Font scale with all type variants
- `Design System/Spacing` — Spacing scale visualization
- `Design System/Icons` — Icon gallery (only if icon library is configured)

Follow `docs/adapters/{components}.md` for the correct theme access method (useTheme hook, CSS vars, Tailwind config, etc.) and adapt the story to the actual theme structure. For native projects, stories must use React Native components — not HTML.

### Step 6: Hello World Component

Create a minimal component that uses the theme to verify the full stack works:

- **Component file** (`src/components/HelloWorld.tsx`): uses theme tokens for colors, fonts, spacing; accepts props controllable in Storybook (title, subtitle, variant, showIcon)
- **Story file** (`src/components/HelloWorld.stories.tsx`): typed meta, argTypes with controls for all props, Default + named variant stories

The hello-world story is a **reference example** for all future component stories. Follow `docs/storybook-conventions.md` for the argTypes pattern.

### Step 7: Verify

```
Verification:
  [x] Storybook starts
  [x] Design System/Colors renders palette
  [x] Design System/Typography renders font scale
  [x] Design System/Spacing renders spacing boxes
  [x] Design System/Icons renders gallery (if icon lib selected)
  [x] HelloWorld (or all CLI-library components) renders with controls
  [x] Theme colors applied correctly

Scaffold complete!
```

If any check fails, report the specific error and do not advance the gate. User must run `/pixel-perfect:verify` to retry after fixing.

### Step 8: Update Manifest

On success:
```json
{
  "phase": "scaffold",
  "gates": {
    "scaffold": "passed"
  }
}
```

---

## Storybook Organization

After scaffold, the sidebar structure is:

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
Scaffold complete for: [project name]

Tools configured: [framework] / [style] / [components] / [sandbox]
Theme created: [files] — [font pairing], [primary color]
[Component library pulled: N components (if CLI-based)]
Design token stories: Colors, Typography, Spacing[, Icons]

Next: /pixel-perfect:build
```
