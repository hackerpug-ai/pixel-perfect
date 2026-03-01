---
description: "Initialize design project: DISCOVER goal + vibe, TARGET platforms, EQUIP tools (phases 1-3)"
---

# Project Initialization (Phases 1-3)

Interactive setup that captures your project's goal, selects target platforms, identifies the framework and toolchain, and locks in Storybook as the component sandbox. Produces a `design/manifest.yaml` that drives all subsequent phases.

## Usage

```
/pixel-perfect:init [directory] [options]
```

## Arguments

- `[directory]`: Target directory to initialize. Defaults to current directory.

## Options

- `--force`: Overwrite existing `design/manifest.yaml`
- `--quick`: Auto-accept inferred values with minimal prompts
- `--platforms <list>`: Pre-set platforms (comma-separated: `mobile-ios,web-desktop`)
- `--vibe <description>`: Pre-set design vibe
- `--framework <name>`: Pre-set framework (e.g., `react-native`, `nextjs`, `vite`)

## What It Does

Walks through three phases sequentially. Each phase has an exit gate that must pass before proceeding.

1. **Phase 1: DISCOVER** - Define what you're building
2. **Phase 2: TARGET** - Define where it runs, what framework, what style system, what component library
3. **Phase 3: EQUIP** - Confirm tool selections and validate adapters

Output: `design/manifest.yaml` with gates discover/target/equip = passed.

---

## Phase 1: DISCOVER

Capture the project's purpose and aesthetic direction.

### Step 1: Requirements Discovery

**If a path is provided via argument:** Use that file directly.

**Otherwise, search in this order:**
1. `{directory}/PRD.md`
2. `{directory}/requirements.md`
3. `{directory}/README.md`
4. `{directory}/*.md` (any markdown file)

**If a candidate file is found**, confirm with the user:
```
Found: PRD.md
? Is this your requirements document? [Yes / No, choose different / No requirements doc]
```

If no document exists, proceed without one. The user provides goal and vibe manually.

### Step 2: Goal Statement

Extract or ask for a one-sentence goal:
```
? What does this project do? (one sentence)
> Field service management app for HVAC technicians
```

If a PRD exists, propose a goal extracted from it and ask for confirmation.

### Step 3: Design Vibe

Capture the aesthetic direction as a free-form description:
```
? Describe the design vibe:
> Clean, professional, high-contrast for outdoor use
```

**Vibe keywords for reference** (user can combine or use their own):

| Keyword | Feel |
|---------|------|
| minimal | Clean, whitespace-focused |
| modern | Contemporary patterns, current trends |
| playful | Rounded corners, bright colors |
| professional | Structured, business-appropriate |
| bold | High contrast, strong typography |
| technical | Data-dense, developer-focused |
| elegant | Refined, sophisticated |
| brutalist | Raw, monospaced, intentionally stark |

If the PRD contains tone/style language, extract it as a starting suggestion.

### Step 4: Reference URLs

```
? Any reference URLs for design inspiration? (comma-separated, or "none")
> https://servicetitan.com, https://housecallpro.com
```

If URLs are provided:
1. Fetch each URL using available web tools (Jina, WebFetch)
2. Extract design patterns observed (navigation style, layout approach, color usage)
3. Record patterns in manifest references section

**Exit gate:** Goal and vibe are captured. Manifest has `discover: passed`.

---

## Phase 2: TARGET

Define which platforms the project targets, then drill down into the framework, style system, and component library for each.

### Step 1: Platform Selection

Present options with auto-detection from PRD keywords:

| Platform | Detection Keywords |
|----------|-------------------|
| `web-desktop` | "web app", "dashboard", "browser", "SaaS" |
| `web-mobile` | "responsive", "mobile web", "PWA" |
| `mobile-ios` | "iOS", "iPhone", "Swift", "React Native", "Expo" |
| `mobile-android` | "Android", "Kotlin", "React Native", "Expo" |

**If PRD exists**, scan for keywords and pre-select matches:
```
Detected platforms from requirements: mobile-ios, mobile-android

? Confirm target platforms: (multi-select)
  [x] mobile-ios
  [x] mobile-android
  [ ] web-desktop
  [ ] web-mobile
```

**If no PRD**, default to `web-desktop` and ask for confirmation.

### Step 2: Framework Drill-Down

Based on the selected platform category, ask which framework the project uses.

**If any mobile platform is selected** (`mobile-ios`, `mobile-android`):
```
? What mobile framework?
  > React Native
    Expo
    Other (provide link to framework docs)
```

**If any web platform is selected** (`web-desktop`, `web-mobile`):
```
? What web framework?
  > React (Create React App / standalone)
    Next.js
    Vite (React + Vite)
    Other (provide link to framework docs)
```

**If the user selects "Other":** Ask them to provide a URL to the framework's documentation. Record the URL in the manifest under `tools.framework_docs` so adapters and downstream phases can reference it.

**PRD keyword detection:** If the PRD mentions a specific framework (e.g., "built with Expo", "Next.js app"), auto-detect and suggest:
```
Detected "Expo" in requirements.
? Use Expo as your mobile framework? [Yes / No, choose different]
```

### Step 3: Style System Drill-Down

Based on the framework selection, present the appropriate style system options.

**React Native / Expo:**
```
? Style system:
  > NativeWind (Tailwind for React Native)
    StyleSheet (React Native built-in)
    Other (provide link to docs)
```

**React / Next.js / Vite:**
```
? Style system:
  > Tailwind CSS
    CSS Modules
    Other (provide link to docs)
```

**If the user selects "Other":** Ask for a URL to the style system's documentation. Record under `tools.style_docs`.

**PRD keyword detection:** If the PRD mentions a style system (e.g., "using Tailwind", "NativeWind styles"):
```
Detected "Tailwind CSS" in requirements.
? Use Tailwind CSS as your style system? [Yes / No, choose different]
```

### Step 4: Component Library Drill-Down

Based on the framework selection, present the appropriate component library options.

**React Native / Expo:**
```
? Component library:
  > React Native Paper
    Tamagui
    Gluestack
    Other (provide link to docs)
    None (build from scratch)
```

**React / Next.js / Vite:**
```
? Component library:
  > shadcn/ui
    Radix
    Mantine
    Chakra
    Headless UI
    DaisyUI
    Other (provide link to docs)
    None (build from scratch)
```

**If the user selects "Other":** Ask for a URL to the component library's documentation. Record under `tools.components_docs`.

**PRD keyword detection:** If the PRD mentions a specific library (e.g., "shadcn components", "using Paper"):
```
Detected "shadcn" in requirements.
? Use shadcn/ui as your component library? [Yes / No, choose different]
```

**Exit gate:** At least one platform selected, framework chosen, style system chosen, component library chosen (or explicitly "none"). Manifest has `target: passed`.

---

## Phase 3: EQUIP

Confirm tool selections, validate adapter availability, and lock the manifest. Storybook is the sandbox -- this is non-negotiable.

### Sandbox: Storybook (Non-Negotiable)

Storybook is always the component sandbox. It is not presented as a choice. It is recorded automatically.

```
Sandbox: Storybook (locked)
```

### Confirmation Summary

Present the full tool selection for confirmation before writing the manifest:

```
Your configuration:

  Platforms:   mobile-ios, mobile-android
  Framework:   Expo
  Style:       NativeWind
  Components:  React Native Paper
  Sandbox:     Storybook (locked)

? Confirm and write manifest? [Yes / Change something]
```

If the user wants to change something, loop back to the relevant step.

### Adapter Validation

After confirmation, verify adapter docs exist for chosen tools:
- If adapter exists in `docs/adapters/`: note it will be loaded during scaffold
- If no adapter exists: inform user the generic adapter will be used (process enforcement only, no tool-specific guidance)

```
Adapter check:
  [x] storybook    → docs/adapters/storybook.md
  [x] tailwind     → docs/adapters/tailwind.md
  [ ] mantine      → No adapter found. Generic adapter will be used.
```

For tools selected as "Other" with a docs URL provided, inform the user:
```
  [ ] custom-style → No adapter. AI will reference provided docs URL during scaffold.
```

**Exit gate:** All tool categories have a selection. Manifest has `equip: passed`.

---

## Manifest Output

Creates `{directory}/design/manifest.yaml`:

```yaml
version: "3.0"
created: "2026-03-01"

# Phase 1: DISCOVER
goal: "Field service management app for HVAC technicians"
vibe: "clean, professional, high-contrast for outdoor use"
references:
  - "https://servicetitan.com"

# Phase 2: TARGET
platforms:
  - mobile-ios
  - mobile-android

# Phase 3: EQUIP
tools:
  framework: expo
  style: nativewind
  components: react-native-paper
  sandbox: storybook

# Process state
phase: equip
gates:
  discover: passed
  target: passed
  equip: passed
  scaffold: pending
  atoms: pending
  compose: pending
  integrate: pending
```

**When "Other" is selected for any tool**, the manifest includes the docs URL:

```yaml
tools:
  framework: custom
  framework_docs: "https://example.com/framework/docs"
  style: custom
  style_docs: "https://example.com/style-system/docs"
  components: react-native-paper
  sandbox: storybook
```

---

## Re-Initialization

If `design/manifest.yaml` already exists:
- Without `--force`: warn and exit
- With `--force`: overwrite, resetting all gates

```
design/manifest.yaml already exists (phase: atoms, 3/5 atoms verified).
Run with --force to reconfigure from scratch, or use /pixel-perfect:status to see progress.
```

## Next Steps

After init completes:
```
Initialization complete. Manifest saved to design/manifest.yaml

Next: /pixel-perfect:scaffold
  This will set up your project with NativeWind + React Native Paper + Storybook
```
