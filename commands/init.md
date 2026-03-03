---
description: "Initialize design project: DISCOVER goal + vibe, TARGET platforms, EQUIP tools (phases 1-3)"
---

# Project Initialization (Phases 1-3)

Interactive setup that captures your project's goal, selects target platforms, identifies the framework and toolchain, and locks in Storybook as the component sandbox. Produces a `design/manifest.json` that drives all subsequent phases.

## Usage

```
/pixel-perfect:init [directory] [options]
```

## Arguments

- `[directory]`: Target directory to initialize. Defaults to current directory.

## Options

- `--force`: Overwrite existing `design/manifest.json`
- `--quick`: Auto-accept inferred values with minimal prompts
- `--platforms <list>`: Pre-set platforms (comma-separated: `mobile-ios,web-desktop`)
- `--vibe <description>`: Pre-set design vibe
- `--framework <name>`: Pre-set framework (e.g., `react-native`, `nextjs`, `vite`)
- `--icons <name>`: Pre-set icon library (e.g., `lucide`, `heroicons`, `phosphor`)

## What It Does

Walks through three phases sequentially. Each phase has an exit gate that must pass before proceeding.

1. **Phase 1: DISCOVER** - Define what you're building
2. **Phase 2: TARGET** - Define where it runs, what framework, what style system, what component library, what icon library
3. **Phase 3: EQUIP** - Confirm tool selections and validate adapters

Output: `design/manifest.json` with gates discover/target/equip = passed.

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

### Step 1b: Spec Document for Sandbox Views

After identifying the requirements document, ask the user if they have a **spec document (PRD or design spec)** that describes the views/screens they want to build. This spec drives the component hierarchy during build phases.

```
? Do you have a spec or PRD that describes your app's views/screens?
  > Use the requirements doc found above (PRD.md)
    Point to a different file
    No spec — I'll define views later
```

If a spec is provided, record its path in the manifest under `spec`. This spec is used during the build phase to:

1. **Derive the component hierarchy** following the progression:
   - **Components** (atoms) — Smallest reusable UI elements (Button, Badge, Avatar, Input)
   - **Molecules** — Compositions of 2-3 atoms that form a functional unit (SearchBar, UserCard, FormField)
   - **Views** (screens) — Full screen layouts composed of molecules and components (Dashboard, Settings, Profile)

2. **Generate sandbox stories** at each level of the hierarchy:
   - `Components/` — Individual atom stories with controls
   - **`Molecules/`** — Molecule stories showing atom composition
   - `Views/` — Full view stories with realistic data

3. **Plan the build order**: Components first, then molecules that compose them, then views that arrange molecules into layouts.

```
Component Hierarchy (from spec):

  Components (atoms):     Button, Badge, Avatar, TextField, Icon
                              ↓ compose into
  Molecules:              SearchBar (TextField + Icon + Button)
                          UserCard (Avatar + Badge + Text)
                          NavItem (Icon + Text + Badge)
                              ↓ compose into
  Views (screens):        Dashboard (SearchBar + UserCard list + NavItem sidebar)
                          Profile (Avatar + FormFields + ActionButtons)
```

This hierarchy is recorded in the manifest and drives the build phase ordering.

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

Based on the framework selection, detect installed style frameworks or present options.

#### Detection First

Before prompting, check `package.json` for installed style frameworks:

**React Native / Expo:**
| Signal | Detected Framework |
|--------|-------------------|
| `nativewind` | NativeWind |
| `tamagui` | Tamagui |
| `@shopify/restyle` | Restyle |
| `react-native-unistyles` | Unistyles |

**React / Next.js / Vite:**
| Signal | Detected Framework |
|--------|-------------------|
| `tailwindcss` | Tailwind CSS |

If a framework is detected:
```
Detected "nativewind" in package.json.
? Use NativeWind as your style system? [Yes / No, choose different]
```

#### No Detection - Present Options

If no style framework detected, present options **without a default**:

**React Native / Expo:**
```
? Style system:
    NativeWind (Tailwind for React Native)
    StyleSheet (React Native built-in)
    Tamagui (cross-platform style system)
    Restyle (Shopify's type-safe styling)
    Unistyles (universal styling)
    Other (provide link to docs)
```

**React / Next.js / Vite:**
```
? Style system:
    Tailwind CSS
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
    React Native Reusables (shadcn/ui for React Native)
    React Native Paper
    Tamagui
    Gluestack
    Other (provide link to docs)
    None (build from scratch)
```

**React / Next.js / Vite:**
```
? Component library:
    shadcn/ui
    Radix
    Mantine
    Chakra
    Headless UI
    DaisyUI
    Other (provide link to docs)
    None (build from scratch)
```

**If the user selects "Other":** Ask for a URL to the component library's documentation. Record under `tools.components_docs`.

**PRD keyword detection:** If the PRD mentions a specific library (e.g., "shadcn components", "using Paper", "react-native-reusables"):
```
Detected "shadcn" in requirements.
? Use shadcn/ui as your component library? [Yes / No, choose different]
```

For mobile projects mentioning shadcn:
```
Detected "shadcn" in requirements (mobile project).
? Use React Native Reusables (shadcn/ui for React Native)? [Yes / No, choose different]
```

### Step 5: Icon Library Drill-Down

Based on the framework selection, present the appropriate icon library options. Icons are essential for UI development and should always be selected during setup.

**React Native / Expo:**
```
? Icon library:
  > Lucide React Native (recommended for React Native Reusables)
    @expo/vector-icons (Expo built-in, multiple icon sets)
    React Native Vector Icons
    Phosphor React Native
    Other (provide link to docs)
```

**React / Next.js / Vite:**
```
? Icon library:
  > Lucide React (recommended for shadcn/ui)
    Heroicons
    Phosphor Icons
    React Icons (multiple icon sets)
    Other (provide link to docs)
```

**If the user selects "Other":** Ask for a URL to the icon library's documentation. Record under `tools.icons_docs`.

**PRD keyword detection:** If the PRD mentions a specific icon library (e.g., "using Lucide icons", "Heroicons", "vector-icons"):
```
Detected "Lucide" in requirements.
? Use Lucide React as your icon library? [Yes / No, choose different]
```

**Component library auto-suggestion:** If certain component libraries are selected, suggest their recommended icon library:

| Component Library | Recommended Icons | Reason |
|------------------|-------------------|--------|
| shadcn/ui | Lucide React | shadcn/ui uses Lucide by default |
| React Native Reusables | Lucide React Native | RNR uses Lucide via wrapper pattern |
| React Native Paper | @expo/vector-icons | Paper integrates with Expo icons |

```
You selected React Native Reusables.
? Use Lucide React Native (recommended)? [Yes / No, choose different]
```

**Exit gate:** At least one platform selected, framework chosen, style system chosen, component library chosen (or explicitly "none"), icon library chosen. Manifest has `target: passed`.

---

## Phase 3: EQUIP

Confirm tool selections, validate adapter availability, and lock the manifest. Storybook is the sandbox -- this is non-negotiable.

### Sandbox: Storybook (Platform-Aware, Non-Negotiable)

Storybook is always the component sandbox. The **variant** is automatically determined by platform:

| Platform | Sandbox Variant | Adapter |
|----------|-----------------|---------|
| `mobile-ios`, `mobile-android` | Storybook Native | `storybook-native.md` |
| `web-desktop`, `web-mobile` | Storybook Web | `storybook.md` |

This is **not a user choice**. The manifest records the platform-appropriate variant automatically:

```
Sandbox: Storybook Native (auto-selected for mobile)
```
or
```
Sandbox: Storybook Web (auto-selected for web)
```

### Confirmation Summary

Present the full tool selection for confirmation before writing the manifest. Use the **actual selected values** (not hardcoded examples):

```
Your configuration:

  Platforms:   {selected_platforms}
  Framework:   {selected_framework}
  Style:       {selected_style}
  Components:  {selected_components}
  Icons:       {selected_icons}
  Sandbox:     {auto_selected_sandbox}

? Confirm and write manifest? [Yes / Change something]
```

**Mobile example:**
```
Your configuration:

  Platforms:   mobile-ios, mobile-android
  Framework:   Expo
  Style:       Tamagui
  Components:  React Native Reusables
  Icons:       Lucide React Native
  Sandbox:     Storybook Native (auto-selected for mobile)
```

**Web example:**
```
Your configuration:

  Platforms:   web-desktop, web-mobile
  Framework:   Next.js
  Style:       Tailwind CSS
  Components:  shadcn/ui
  Icons:       Lucide React
  Sandbox:     Storybook Web (auto-selected for web)
```

If the user wants to change something, loop back to the relevant step.

### Adapter Validation

After confirmation, verify adapter docs exist for chosen tools:
- If adapter exists in `docs/adapters/`: note it will be loaded during scaffold
- If no adapter exists: inform user the generic adapter will be used (process enforcement only, no tool-specific guidance)

**Mobile project example (with React Native Reusables):**
```
Adapter check:
  [x] storybook-native → docs/adapters/storybook-native.md (auto-selected for mobile)
  [x] tailwind         → docs/adapters/tailwind.md
  [x] react-native-reusables → docs/adapters/react-native-reusables.md
```

**Mobile project example (with React Native Paper):**
```
Adapter check:
  [x] storybook-native → docs/adapters/storybook-native.md (auto-selected for mobile)
  [x] tailwind         → docs/adapters/tailwind.md
  [x] react-native-paper → docs/adapters/react-native-paper.md
```

**Web project example:**
```
Adapter check:
  [x] storybook        → docs/adapters/storybook.md (auto-selected for web)
  [x] tailwind         → docs/adapters/tailwind.md
  [ ] mantine          → No adapter found. Generic adapter will be used.
```

For tools selected as "Other" with a docs URL provided, inform the user:
```
  [ ] custom-style → No adapter. AI will reference provided docs URL during scaffold.
```

**Exit gate:** All tool categories have a selection. Manifest has `equip: passed`.

---

## Manifest Output

Creates `{directory}/design/manifest.json`:

**Mobile project example:**
```json
{
  "version": "4.0",
  "created": "2026-03-01",
  "goal": "Field service management app for HVAC technicians",
  "vibe": "clean, professional, high-contrast for outdoor use",
  "spec": "PRD.md",
  "references": [
    "https://servicetitan.com"
  ],
  "platforms": [
    "mobile-ios",
    "mobile-android"
  ],
  "tools": {
    "framework": "expo",
    "style": "nativewind",
    "components": "react-native-reusables",
    "icons": "lucide-react-native",
    "sandbox": "storybook-native"
  },
  "phase": "equip",
  "gates": {
    "discover": "passed",
    "target": "passed",
    "equip": "passed",
    "scaffold": "pending",
    "atoms": "pending",
    "compose": "pending",
    "integrate": "pending"
  }
}
```

The `spec` field is the path to the spec/PRD document (relative to the project root) that drives the component hierarchy during build. If no spec was provided, this field is omitted.

**When "Other" is selected for any tool**, the manifest includes the docs URL:

```json
{
  "tools": {
    "framework": "custom",
    "framework_docs": "https://example.com/framework/docs",
    "style": "custom",
    "style_docs": "https://example.com/style-system/docs",
    "components": "react-native-paper",
    "icons": "custom",
    "icons_docs": "https://example.com/icons/docs",
    "sandbox": "storybook"
  }
}
```

---

## Re-Initialization

If `design/manifest.json` already exists:
- Without `--force`: warn and exit
- With `--force`: overwrite, resetting all gates

```
design/manifest.json already exists (phase: atoms, 3/5 atoms verified).
Run with --force to reconfigure from scratch, or use /pixel-perfect:status to see progress.
```

## Next Steps

After init completes:
```
Initialization complete. Manifest saved to design/manifest.json

Next: /pixel-perfect:scaffold
  This will set up your project with {style} + {components} + Storybook
```

The message uses the actual tools selected during init (from the manifest).
