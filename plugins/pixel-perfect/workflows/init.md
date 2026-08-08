# Project Initialization (Phases 1-3)

Interactive setup that captures your project's goal, selects target platforms, identifies the framework and toolchain, and locks in your tool choices. Produces a `design/manifest.json` that drives all subsequent phases. The sandbox defaults to **custom** — a native component browser generated in your framework during scaffold.

## Usage

```
pixel-perfect:init [directory] [options]
```

## Arguments

- `[directory]`: Target directory to initialize. Defaults to current directory.

## Options

- `--force`: Overwrite existing `design/manifest.json`
- `--quick`: Auto-accept inferred values with minimal prompts
- `--platforms <list>`: Pre-set platforms (comma-separated: `mobile-ios,web-desktop`)
- `--vibe <description>`: Pre-set design vibe
- `--framework <name>`: Pre-set framework (e.g., `react-native`, `nextjs`, `vite`, `sveltekit`)
- `--icons <name>`: Pre-set icon library (e.g., `lucide`, `heroicons`, `phosphor`)

## What It Does

Walks through three phases sequentially. Each phase has an exit gate that must pass before proceeding.

1. **Phase 1: DISCOVER** - Define what you're building
2. **Phase 2: TARGET** - Define where it runs, what framework, what style system, what component library, what icon library
3. **Phase 3: EQUIP** - Confirm tool selections and validate adapters

Output: `design/manifest.json` with gates discover/target/equip = passed.

---

## How this workflow asks

Every decision below is collected with `USER_CHOICE` — see `workflows/RUNTIME-CONTRACT.md`, "User choice protocol" and "Turn shape". The `user_choice` blocks in this file are the wording and options to use with the harness's question mechanism; they are never printed.

On a repository that already carries planning artifacts, init produces a lot of analysis. **The analysis goes in a file, not in the chat:**

1. Write `design/init-brief.md` — what was found (requirements doc, route map, doctrine docs, existing tokens, `package.json` evidence), what each finding implies, which decisions that settles and why, and which remain open. The brief is advisory; `design/manifest.json` stays the only durable record.
2. Say in twelve lines or fewer what was found, what is settled, and what is being asked, and name the brief's path.
3. Fire the batch's `USER_CHOICE` **in the same turn**. Because each option description stands on its own, the user can answer without opening the brief; the brief is there when they want the reasoning.

**A turn in this workflow ends on a `USER_CHOICE` or on finished work. Never on analysis.**

| Batch | Phase | Decisions | Fires |
|-------|-------|-----------|-------|
| B1 | DISCOVER | requirements doc · views/spec doc · goal · vibe | always |
| B2 | DISCOVER | route map · reference URLs | when a route map was derived, or references are still unknown |
| B3 | TARGET | platforms (multi) · framework | always. Framework joins B3 only when the platform category is already settled by evidence; otherwise it is asked alone in B3b immediately after |
| B4 | TARGET | style system · component library · icon library · sandbox | always. Option lists are selected by the framework answered in B3. Sandbox is normally settled (`custom`) and dropped |
| B5 | EQUIP | styling contract · write the manifest | styling contract only when no built-in matches |

Drop any decision the evidence has settled and report it in the summary instead. `--quick` drops every batch whose decisions all have confident detected values and fires only B5. Worst case is six calls; the common case on a planning-heavy repository is three.

---

## Phase 1: DISCOVER

Capture the project's purpose and aesthetic direction.

### Step 0: Detect prior design artifacts (optional)

**Wireframes** — if `design/wireframes.json` (or a `design/wireframes/` directory) exists, produced by `pixel-perfect:wireframe` (the low-fi sibling), pre-seed the **screen list** (the Step 1b component hierarchy) from its `screens` inventory — including the atoms/molecules each screen implies — and append each wireframe file to `references`. Set top-level `wireframed: true`. **One wireframe = one route = one screen**: assign each wireframe a `route`, and seed that screen's `states` list from the wireframe's `## States` annotation (e.g. `default · empty · loading · error`) — do not create a separate screen per state. Wireframes commit the *structure*; a later `design-deconstruct` run (or the build phases) adds fidelity. Each `design/wireframes/{screen}.md` is the structural target the real screen is built to match.

**Deconstruction** — if `design/deconstruction.json` (or a `design/system/` directory) exists — produced by `pixel-perfect:design-deconstruct` — use it to pre-seed this init:

- **Vibe**: infer the vibe from the extracted tokens/typography (low-chroma + generous spacing → "clean, minimal"; high-contrast → "bold") and propose it in Step 3 for confirmation.
- **Theme**: note that `design/theme-seed.json` exists — scaffold will generate the theme from it instead of from vibe keywords.
- **Inventory**: read `design/deconstruction.json` `inventory` + `level_map` to pre-fill the component hierarchy (Step 1b) and the build lists — atoms→atoms, molecules→molecules (organisms become screen sections). For **views → screens, do NOT map 1:1**: deconstruction views are often **state-split** into nested folders (`feed/default`, `feed/empty`, `feed/loading`). First assign each view a **route** (strip state suffixes like `-empty`/`-loading`/`-error` and tab suffixes; nested folders like `feed/empty` share route `/feed`), then **collapse** views sharing a route into ONE screen whose `states` list is those variants (apply the state-vs-route rule in `docs/state-patterns.md`). Seed the manifest's `atoms`/`molecules` and the collapsed `screens` (status `pending`); each screen carries its `route` + `states`, and each per-state mockup HTML/PNG becomes the `target` for that state's story. Confirm the collapsed route map with the user (the route-map confirm in Step 1b).
- **References**: add each view's mockup to the manifest `references`.
- **Markers**: set top-level `deconstructed: true` and `design_system: "design/system"` when writing the manifest.

Confirm the seeded values with the user — don't accept them blindly. If no wireframes or deconstruction exist, proceed normally.

### Step 1: Requirements Discovery

**If a path is provided via argument:** Use that file directly.

**Otherwise, search in this order:**
1. `{directory}/PRD.md`
2. `{directory}/requirements.md`
3. `{directory}/README.md`
4. `{directory}/*.md` (any markdown file)

**If a candidate file is found**, it becomes option 1 of **B1 Q1** with its path and what was read from it in the description — never a separate yes/no confirmation. If several candidates exist, the best two or three become options 2–4.

If no document exists, proceed without one; B1 Q1 is dropped and the user provides goal and vibe through B1 Q3/Q4.

### Step 1b: Spec Document for Sandbox Views

After identifying the requirements document, ask the user if they have a **spec document (PRD or design spec)** that describes the views/screens they want to build. This spec drives the component hierarchy during build phases.

This is **B1 Q2**. When the requirements document found in Step 1 also describes the views, it is option 1 ("the document already found"); the alternatives are a different file (via Other) and defining views later.

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

4. **Derive a route map**: From the spec's information architecture / navigation, list the distinct **routes** (pages) — not states. A screen is keyed by its route and carries a **list of states**; views that differ only by state (default/empty/loading/error, or different tabs of one page) are ONE route with a states list, not separate screens. A login page with an error state is `/login` with `[default, error]`; a settings page with three tabs is `/settings` with `[account, billing, team]`. Use the **state-vs-route decision rule** in `docs/state-patterns.md` to decide whether a tab/sub-view is a state or its own route.

The hierarchy goes in `design/init-brief.md`. The digest carries the route map only — one line per route:

```
  /dashboard  Dashboard  default · empty · loading
  /profile    Profile    view · edit
  /settings   Settings   account · billing · team
```

The full hierarchy is recorded in the manifest (each screen carries a `route` + `states` list) and drives the build phase ordering.

The derived route map is confirmed in **B2 Q1**:

```user_choice
batch: B2 — the screens and what they should look like
- header: Route map
  question: Does this route map match the app you have in mind?
  options:
    - label: Yes, build these routes (Recommended)
      description: Accepts the routes derived above, with state variants (default, empty, loading, error) collapsed into one screen per route. Each state becomes its own sandbox story rather than its own screen.
    - label: Keep states separate
      description: Treats each state variant as its own screen with its own route. More screens to build and verify, and the states cannot share a layout — choose this only when the variants really are different pages.
    - label: The routes are wrong
      description: Reopens the route map for editing. Choose Other and name the routes you want, or the ones to drop, and the map is rebuilt before anything is written to the manifest.
```

If the route/page layout can't be confidently derived from the spec, do not guess — fire B2 Q1 with the best-effort map and say in the question that it was inferred rather than read.

### Step 2: Goal Statement

This is **B1 Q3**. Extract a one-sentence goal from the requirements document and make it option 1 — phrased so accepting it is one click, for example "Field service management app for HVAC technicians". Options 2–4 are materially different readings of the same document, not rewordings of the same one. The question names Other as the way to type a different sentence.

Store the user's own text when they choose Other, and the chosen option's plain sentence (never its short label) otherwise. If no requirements document exists, B1 Q3 carries the two or three readings the repository suggests, or is asked with no recommendation at all.

### Step 3: Design Vibe

This is **B1 Q4**. Capture the aesthetic direction as a free-form description, proposed rather than asked blank. When a deconstruction or a live token layer exists, read the vibe off the tokens and typography and make that option 1. When the requirements document carries tone or style language, extract it. Otherwise compose four candidate directions from the keyword table below.

Store the vibe verbatim in `manifest.vibe` — the user's own text when they choose Other, the option's plain sentence otherwise ("clean, professional, high-contrast for outdoor use"), never the short label.

**Vibe keywords for reference** — these compose the options; the table itself is never presented as a menu:

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

### The B1 batch

Fire all four DISCOVER questions in one call, after writing `design/init-brief.md` and digesting it. The option text below is a shape to fill from the actual evidence — never emit these words when the repository says something else. Drop any question the evidence has settled and report it in the digest instead.

```user_choice
batch: B1 — what this project is
- header: Spec doc
  question: Which document describes what this project should do?
  options:
    - label: PRD.md (Recommended)
      description: Found at the repository root, 400 lines, with a Requirements section and an Information Architecture section. Read as the source for the goal, the route map, and the platform detection below.
    - label: README.md
      description: The repository's readme, which describes the project but has no requirements or view inventory. Usable for the goal sentence; the route map would be inferred rather than read.
    - label: No requirements document
      description: Proceed without one. The goal and vibe come from your answers below, and the route map is defined later during the build phase rather than now.
- header: Views
  question: Which document describes the views and screens to build?
  options:
    - label: The same document (Recommended)
      description: PRD.md also contains the screen inventory, so it drives the component hierarchy — atoms, then molecules, then screens — and the route map derived below.
    - label: A different file
      description: A separate design spec describes the views. Choose Other and give its path; it is recorded in the manifest as `spec` and read during the build phase.
    - label: Define views later
      description: No view spec now. Init records the toolchain only, and the component hierarchy is derived during the build phase from whatever exists then.
- header: Goal
  question: What does this project do? Pick the closest, or choose Other to write your own sentence.
  options:
    - label: Field service management (Recommended)
      description: "Field service management app for HVAC technicians" — extracted from PRD.md, Overview. Stored verbatim as the manifest goal and quoted back in every later phase.
    - label: Dispatch and scheduling
      description: "Dispatch and scheduling tool for HVAC service teams" — a narrower reading of the same document, centered on the office rather than the technician in the field.
    - label: Customer-facing booking
      description: "Customer booking and job tracking for an HVAC company" — reads the document as an end-customer product rather than an internal tool, which changes who every screen is designed for.
- header: Vibe
  question: What should this look and feel like? Pick the closest, or choose Other to write your own sentence.
  options:
    - label: Clean and high-contrast (Recommended)
      description: Proposed from PRD.md, Design Principles ("legible in direct sunlight", "glanceable") — generous whitespace, one accent color, heavy weights on numerics, AAA text contrast. Produces a near-black-on-white theme with a single brand accent.
    - label: Dense and technical
      description: Data first — tighter spacing, smaller type, tables rather than cards, monospaced numerics. Suits operators who live in the tool all day; harder to read on a phone in the field.
    - label: Warm and approachable
      description: Rounded corners, softer neutrals, larger type, illustrated empty states. Reads friendlier to occasional users at the cost of vertical density.
    - label: Match an existing product
      description: Derives the theme from reference products rather than from vibe keywords. Choosing this makes the reference-URL question below required rather than optional.
```

### Step 4: Reference URLs

This is **B2 Q2**, asked alongside the route map. When the vibe answer was "Match an existing product", the question is required and names Other as the way to paste URLs; otherwise "none" is a first-class option.

```user_choice
batch: B2 — the screens and what they should look like
- header: References
  question: Are there products whose design this should borrow from? Choose Other to paste URLs.
  options:
    - label: No references (Recommended)
      description: The theme is generated from the vibe alone. Nothing is fetched, and scaffold derives colors and type scale from the vibe keywords rather than from an existing product.
    - label: The competitors named in the spec
      description: Fetches the URLs already named in the requirements document, extracts their navigation style, layout approach, and color usage, and records the observed patterns in the manifest.
    - label: Products I will name
      description: Choose Other and paste URLs, comma-separated. Each is fetched and read for navigation, layout, and color patterns, which are recorded in the manifest references section.
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

**If PRD exists**, scan for keywords. Every matched platform carries the `(Recommended)` suffix and sorts first — no harness can pre-check a box, so the suffix is how the proposal is conveyed. **If no PRD**, `web-desktop` is option 1 and no other option is marked.

When `--platforms` was passed, drop this question entirely and report the platforms as settled in the digest.

```user_choice
batch: B3 — where it runs and what it is built on
- header: Platforms
  multiSelect: true
  question: Which platforms does this ship to? Select every one that applies.
  options:
    - label: iOS (Recommended)
      description: Detected "iPhone" and "React Native" in PRD.md. Produces a native iOS app and adds a mobile-ios entry to the manifest with its own theme and its own gate set.
    - label: Android (Recommended)
      description: Detected "Android" in PRD.md. Shares component source with iOS but is tracked as its own platform, so its gates can pass or fail independently.
    - label: Desktop web
      description: A browser application at desktop widths — dashboards, admin, SaaS. Adds a web-desktop platform that picks its own framework and component library.
    - label: Mobile web
      description: A responsive browser application or PWA at phone widths. Distinct from a native mobile app: the same code as desktop web at different breakpoints, not a second codebase.
```

### Step 2: Framework Drill-Down

Emit **exactly one** option list — the row matching the platform category. This question joins B3 only when the platform category is already settled by evidence (a `--platforms` flag, or an unambiguous PRD match); otherwise it is asked alone in **B3b** immediately after the platforms answer arrives, because the option list depends on it.

**Detection folds into option 1.** When a framework is named in the requirements document, or `package.json` declares `expo` / `next` / `vite` / `@sveltejs/kit`, that framework becomes option 1 with its evidence inside the description. There is never a separate yes/no confirmation. When `--framework` was passed, or exactly one framework is unambiguously present in the repository, drop this question and report it as settled.

```user_choice
batch: B3 — where it runs and what it is built on
- header: Framework
  question: Which framework does this project build on?
  options[mobile]:
    - label: Expo (Recommended)
      description: Found expo in package.json and "built with Expo" in PRD.md. React Native with managed builds, config plugins, and over-the-air updates. Scaffold generates an Expo-native component browser; there is no Xcode project to maintain.
    - label: React Native CLI
      description: Bare React Native. You own the ios/ and android/ directories, so any native module works, at the cost of managing Xcode and Gradle yourself. Choose this if the repository already has native project directories you maintain.
    - label: A different framework
      description: Any other mobile framework. Choose Other and paste a link to its documentation; the link is recorded as tools.framework_docs and read by scaffold and every later phase.
  options[web]:
    - label: Next.js (Recommended)
      description: Found next in package.json. React with file-based routing, server components, and a build pipeline already configured. Scaffold generates the component browser as a route inside the existing app.
    - label: Vite + React
      description: React on a plain Vite dev server — fastest startup, no server rendering, no routing conventions imposed. Choose this for a single-page app where you control routing yourself.
    - label: SvelteKit
      description: Svelte rather than React. Loads a dedicated SvelteKit adapter at scaffold and switches the component and icon options below to their Svelte equivalents — React libraries such as shadcn/ui and Radix do not run in Svelte.
    - label: A different framework
      description: Any other web framework. Choose Other and paste a link to its documentation; the link is recorded as tools.framework_docs and read by scaffold and every later phase.
```

Record a documentation URL supplied through Other under `tools.framework_docs` so adapters and downstream phases can reference it.

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

A detected style system becomes option 1 of **B4 Q1** with its `package.json` evidence in the description. There is never a separate yes/no confirmation. If nothing is detected, no option carries `(Recommended)` and the question says the choice is open.

### Steps 3–5: The B4 batch

Style system, component library, and icon library are independent of each other but all depend on the framework answered in B3, so they are asked together in **one** call once the framework is known. Sandbox joins them only on the rare occasion it is not already settled (see Phase 3).

**Emit exactly one option list per question** — the row whose key matches the framework recorded in B3. Detection promotes the detected value to option 1 of that row with the evidence in its description; it never becomes a separate question. Option lists are capped at four, so the longer menus are pruned to the four choices that differ in outcome; anything else stays reachable through Other with a documentation link, recorded under `tools.style_docs`, `tools.components_docs`, or `tools.icons_docs`.

```user_choice
batch: B4 — the toolchain
- header: Style
  question: How are styles written in this project?
  options[react-native|expo]:
    - label: NativeWind (Recommended)
      description: Found nativewind in package.json. Tailwind utility classes compiled to React Native styles, so the same class vocabulary works on mobile and web. Pairs with React Native Reusables below.
    - label: StyleSheet
      description: React Native's built-in StyleSheet.create. No extra dependency and no build step, but no shared class vocabulary either — every component carries its own style object.
    - label: Tamagui
      description: A cross-platform style system with its own optimizing compiler and component set. Fastest runtime of the options here, at the cost of a heavier build setup and its own API to learn.
    - label: Something else
      description: Restyle, Unistyles, or any other system. Choose Other and paste a link to its documentation; the link is recorded as tools.style_docs and read during scaffold.
  options[react|nextjs|vite]:
    - label: Tailwind CSS (Recommended)
      description: Found tailwindcss in package.json. Utility classes written inline on each element, with the theme expressed as design tokens in the Tailwind config. Required by shadcn/ui below.
    - label: CSS Modules
      description: Scoped stylesheets imported per component, so class names never collide across files. Plain CSS with no utility vocabulary — more verbose, but no framework to learn.
    - label: Something else
      description: Any other style system. Choose Other and paste a link to its documentation; the link is recorded as tools.style_docs, and a styling contract is researched for it in Phase 3.
  options[sveltekit]:
    - label: Tailwind CSS (Recommended)
      description: Utility classes written inline, the same system shadcn-svelte and Skeleton both expect underneath. The theme lives as design tokens in the Tailwind config.
    - label: Plain scoped CSS
      description: Svelte's built-in per-component style blocks, scoped automatically with no extra dependency. No shared utility vocabulary across components.
    - label: Something else
      description: Any other style system. Choose Other and paste a link to its documentation; the link is recorded as tools.style_docs, and a styling contract is researched for it in Phase 3.
- header: Components
  question: Which component library should the build wrap?
  options[react-native|expo]:
    - label: React Native Reusables (Recommended)
      description: shadcn/ui for React Native — components are copied into your repository rather than imported, so you own and can edit every one. Expects NativeWind and pairs with Lucide icons.
    - label: React Native Paper
      description: Material Design 3 components as an imported dependency. Comprehensive and accessible out of the box, but restyling it away from Material takes real effort.
    - label: Gluestack
      description: Universal components that run on React Native and web from one source. Useful when a web target shares this codebase; a heavier abstraction if you only ship mobile.
    - label: None, build from scratch
      description: Every atom is written by hand against the style system above. Most control and no dependency, at the cost of building focus states, accessibility, and keyboard handling yourself.
  options[react|nextjs|vite]:
    - label: shadcn/ui (Recommended)
      description: Components copied into your repository rather than imported, built on Radix primitives and styled with Tailwind. You own and can edit every file. Pairs with Lucide icons.
    - label: Radix primitives
      description: Unstyled, accessible behavior only — menus, dialogs, and popovers with correct focus and keyboard handling, and no visual opinion at all. You supply every style.
    - label: Mantine
      description: A styled component library imported as a dependency, with its own hooks and theming system. Fast to start; restyling it to a bespoke design system fights the library.
    - label: None, build from scratch
      description: Every atom is written by hand against the style system above. Most control and no dependency, at the cost of building focus states, accessibility, and keyboard handling yourself.
  options[sveltekit]:
    - label: shadcn-svelte (Recommended)
      description: shadcn/ui for Svelte, built on Bits UI. Components are copied into your repository rather than imported, so you own and can edit every one. Pairs with @lucide/svelte.
    - label: Bits UI
      description: Unstyled, accessible Svelte primitives — the Radix equivalent for this framework. Correct behavior and no visual opinion; you supply every style.
    - label: Skeleton
      description: A Tailwind-based design system with components and themes included. Fastest to a finished look, and the hardest of these to pull toward a bespoke visual identity.
    - label: None, build from scratch
      description: Every atom is written by hand against the style system above. Most control and no dependency, at the cost of building focus states, accessibility, and keyboard handling yourself.
- header: Icons
  question: Which icon set should components draw from?
  options[react-native|expo]:
    - label: Lucide React Native (Recommended)
      description: The set React Native Reusables expects, wired through its wrapper pattern. Around 1500 consistent outline icons, tree-shaken so only what you import ships.
    - label: "@expo/vector-icons"
      description: Bundled with Expo, exposing several icon families including Material and Ionicons. No install needed; the families differ in visual style, so mixing them looks inconsistent.
    - label: Phosphor React Native
      description: A large set with six weights per icon, which is useful when icon weight is part of the design language. Heavier install than Lucide for the same coverage.
  options[react|nextjs|vite]:
    - label: Lucide React (Recommended)
      description: The set shadcn/ui uses by default, so copied components reference it already. Around 1500 consistent outline icons, tree-shaken so only what you import ships.
    - label: Heroicons
      description: Tailwind's own icon set, in outline and solid weights. Smaller than Lucide and visually tuned to Tailwind's defaults; fewer icons for uncommon concepts.
    - label: Phosphor Icons
      description: A large set with six weights per icon, which is useful when icon weight is part of the design language. Heavier install than Lucide for the same coverage.
  options[sveltekit]:
    - label: "@lucide/svelte (Recommended)"
      description: The set shadcn-svelte uses by default, so copied components reference it already. Around 1500 consistent outline icons, tree-shaken so only what you import ships.
    - label: Iconify
      description: One interface over many icon sets, resolved at build time. Widest coverage by far; mixing sets within a screen looks inconsistent unless you stay disciplined.
    - label: unplugin-icons
      description: Icons imported as Svelte components at build time from any Iconify set. Zero runtime cost, at the price of a Vite plugin in the build configuration.
```

**The component-library-to-icons pairing table below picks icons option 1. It is not a separate question.**

| Component Library | Recommended Icons | Reason |
|------------------|-------------------|--------|
| shadcn/ui | Lucide React | shadcn/ui uses Lucide by default |
| shadcn-svelte | @lucide/svelte | shadcn-svelte uses Lucide by default |
| Skeleton | @lucide/svelte | Skeleton is icon-agnostic; Lucide pairs well |
| React Native Reusables | Lucide React Native | RNR uses Lucide via wrapper pattern |
| React Native Paper | @expo/vector-icons | Paper integrates with Expo icons |

When the answers within B4 turn out mutually incompatible — an icon package with no build for the chosen library — re-ask only that one question in a single-question **B4b**. Do not re-ask the batch.

**Exit gate:** At least one platform selected, framework chosen, style system chosen, component library chosen (or explicitly "none"), icon library chosen. Manifest has `target: passed`.

---

## Phase 3: EQUIP

Confirm tool selections, validate adapter availability, and lock the manifest. The **sandbox** defaults to a **custom** native component browser built from scratch in the target framework (see `docs/sandbox-spec.md`). An off-the-shelf tool (Storybook, tui-sandbox) is used only if the user asks.

### Sandbox: Custom by Default

The sandbox defaults to **`custom`** — a native component browser generated from scratch in the project's framework, implementing `docs/sandbox-spec.md` (adapter: `docs/adapters/custom-sandbox.md`). It renders the *real* components; nothing extra to install.

**This is normally settled, not asked.** Report `custom` in the digest as a settled fact with its reason, and spend no question slot on it. Add it as **B4 Q4** only when the user asks for a choice, or the requirements document mentions Storybook, or the project targets a terminal UI:

```user_choice
batch: B4 — the toolchain
- header: Sandbox
  question: How should components be previewed in isolation?
  options:
    - label: Custom browser (Recommended)
      description: A component browser generated from scratch in this project's own framework, rendering the real components with nothing extra to install. This is the default for every platform.
    - label: Storybook
      description: The off-the-shelf tool, storybook-native on mobile. Familiar to most teams and brings its own addon ecosystem, at the cost of a second build pipeline to keep working.
    - label: tui-sandbox
      description: The terminal-UI equivalent, for projects whose interface is text in a terminal rather than a rendered screen. Only meaningful for TUI targets.
```

| Choice | Adapter | When |
|--------|---------|------|
| `custom` (default) | `custom-sandbox.md` | any framework — the native, from-scratch browser |
| `storybook` / `storybook-native` | `storybook.md` / `storybook-native.md` | user asks for Storybook (web / mobile) |
| `tui-sandbox` | `tui-sandbox.md` | terminal UIs |

Record the choice in `platforms[platform].tools.sandbox` (default `"custom"`).

### Confirmation Summary

Digest the full tool selection on one or two lines using the **actual selected values**, then fire **B5 Q2** in the same turn. Each "change" option reopens exactly that batch — never the whole interview.

```
Configuration — mobile-ios, mobile-android
  Expo + Tamagui + React Native Reusables + Lucide React Native → custom sandbox
```

```user_choice
batch: B5 — lock it in
- header: Confirm
  question: Write design/manifest.json with this configuration?
  options:
    - label: Write the manifest (Recommended)
      description: Records the configuration above, marks the discover, target, and equip gates passed, and hands off to pixel-perfect:scaffold. Nothing is installed yet; scaffold does that.
    - label: Change the toolchain
      description: Reopens the style system, component library, and icon library questions with the current answers as their defaults. The goal, vibe, and platforms are kept as answered.
    - label: Change goal or vibe
      description: Reopens the goal and vibe questions only. The toolchain and platforms are kept as answered, so nothing about the framework or libraries is re-asked.
    - label: Cancel
      description: Writes nothing and exits. The brief at design/init-brief.md is left in place, so re-running init later starts from the same analysis rather than redoing it.
```

A web project reads the same way — `web-desktop, web-mobile · Next.js + Tailwind CSS + shadcn/ui + Lucide React → custom sandbox`. If the user wants to change something, loop back to that batch alone.

### Adapter Validation

After confirmation, verify adapter docs exist for the chosen tools. Every tool with an adapter in `docs/adapters/` loads it during scaffold; a tool without one falls back to `generic.md` — process enforcement only, no tool-specific guidance.

Report this as one line. **Name only what is missing**, because that is the part with a consequence:

```
Adapters: tailwind, shadcn-svelte, custom-sandbox, sveltekit — all found.
Adapters: tailwind, custom-sandbox found. mantine has none → generic adapter.
```

The framework adapter is optional and only named when one exists (`sveltekit` has one; React, Next.js, and Vite do not, and finding none is expected, not a warning). A tool selected through Other with a docs URL has no adapter either — say that scaffold will read the supplied URL instead.

### Resolve Styling Contract

Now that platform, framework, style system, and component library are all chosen, resolve the **styling contract** that will govern how styles are emitted during BUILD (see `docs/styling-contracts/README.md`). This is the step that turns a *declared* style system into an *enforced* one — the gap that let a prior project drift into a parallel global-CSS system.

**Step 1 — Built-in match (fast path).** If the `(platform, framework, style, components)` tuple matches a shipped built-in, use it automatically:

| Platform | Framework | Style | Components | Contract ID |
|----------|-----------|-------|------------|-------------|
| web | react / nextjs / vite | tailwind | shadcn | `shadcn-tailwind-web` |
| web | react / nextjs / vite | tailwind | (none / other) | `tailwind-web` |
| web | react / nextjs / vite | css-modules | any | `css-modules-web` |
| mobile | react-native / expo | nativewind | any | `nativewind-mobile` |
| mobile | react-native / expo | stylesheet | paper | `paper-md3-mobile` |
| mobile | react-native / expo | stylesheet | (none / other) | `rn-stylesheet-mobile` |

Most-specific row wins. Report the match:
```
Styling contract: shadcn-tailwind-web (built-in)
  emit: utility-classes-via-className · colocated · forbids global custom CSS + inline styles
```

**Step 2 — Research (no built-in).** If nothing matches — exotic framework (SvelteKit, Vue), exotic style system, or "Other" — and a docs URL was recorded (`tools.style_docs`) or can be derived, trigger `pixel-perfect:research --styling <system> --framework <framework> --docs <url>`:

This is **B5 Q1**, asked in the same call as the final confirm when it fires at all. Name the actual framework and style system in the question rather than the placeholders below.

```user_choice
batch: B5 — lock it in
- header: Styling
  question: There is no built-in styling contract for this framework and style system. How should one be resolved?
  options:
    - label: Research it now (Recommended)
      description: Searches the official documentation for about 30 to 60 seconds, synthesizes a contract, and vets it against the convention rubric. Without a contract the build layer cannot tell a correct style from a drifting one.
    - label: I will author it
      description: You write docs/styling-contracts/{id}.md yourself. Init validates that it loads before recording it, so the build layer still gets an enforced contract — it just is not researched.
    - label: Proceed without one
      description: Styles are unenforced for this platform, and every later build reports that. Choose this only deliberately: it is how a project drifts into a parallel styling system without noticing.
```

- **Yes →** research synthesizes a contract, vets it against `docs/styling-convention-rubric.md` (≥6/7, no-contradiction auto-reject), caches it to `design/research/styling/{id}.md`. Record `style_contract_source: "researched"`.
- **Manual →** the user authors `docs/styling-contracts/{id}.md` (validate it loads in the gate before recording). Record `style_contract_source: "manual"`.
- **Proceed without →** explicit opt-out only. Record `style_contract_source: "none"`, `style_contract_enforcement: "off"`. Flag at every subsequent build that styles are unenforced. This is never the default and never silent.

**Step 3 — Fail closed.** If research cannot produce a rubric-passing contract, do **not** fabricate one and do **not** silently proceed. Offer: provide a better docs URL / author manually / choose a supported system from the menu / explicit proceed-without (above). A missing contract is an honest blocker.

**Step 4 — Record.** Write the resolution into the manifest under `platforms[platform].tools`:
- `style_contract` — the contract id (e.g. `shadcn-tailwind-web`, `swiftui-view-modifiers`).
- `style_contract_source` — `builtin` | `researched` | `manual` | `none`.
- `style_contract_enforcement` — `hard-fail` (default) | `warn` | `off`. Hard-fail blocks the BUILD layer on any forbidden pattern; `warn` reports but proceeds (for legacy/migration projects).
- `style_contract_overrides` — `{}` initially; per-component justified exceptions added later during BUILD (`{componentName: reason}`).

**Staleness nudge.** When a built-in's `lastUpdated` is older than ~90 days, offer: "Built-in contract `<id>` was last reviewed `<date>`. Re-run `pixel-perfect:research --styling` to refresh?" Re-research writes to `design/research/styling/` (it does not overwrite the shipped built-in).

### Resolve Component Contract

The styling contract governs *how styles are emitted*. It says nothing about *what components are built on* — a hand-rolled button with perfect utility classes satisfies it completely. The **component contract** closes that second gap (see `docs/component-contracts/README.md`), and BUILD runs both.

**Step 0 — No library, no contract.** If `tools.components` is absent, `none`, or `custom`, record `component_contract_source: "none"` and **stop here silently**. Print nothing, ask nothing. Hand-building every primitive is the correct and complete behavior for a project with no component library, and it must not be framed as a gap.

**Step 1 — Built-in match (fast path).** Otherwise, if `tools.components` matches a shipped built-in, use it automatically. The contract id is the library name:

| `tools.components` | Contract ID | Distribution |
|--------------------|-------------|--------------|
| `react-native-reusables` | `react-native-reusables` | vendored (CLI copies into `components/ui/`) |
| `shadcn` | `shadcn` | vendored |
| `shadcn-svelte` | `shadcn-svelte` | vendored |
| `react-native-paper` | `react-native-paper` | package |
| `mantine` | `mantine` | package |

Fold the match into the same line the styling contract reports:
```
Component contract: react-native-reusables (built-in)
  compose: @/components/ui/* · forbids re-implementing vendored primitives
```

**Step 2 — Research (no built-in).** If the library has no built-in contract, trigger `pixel-perfect:research --libraries <library> --framework <framework>` and synthesize one to the same schema, cached at `design/research/libraries/{id}.md`. Record `component_contract_source: "researched"`. **Do not ask first** — this is a background resolution, not a decision the user needs to make.

**Step 3 — Fail open, but say so once.** If research cannot produce a usable contract, do not fabricate one. Record `component_contract_source: "none"` and print exactly one line:
```
Component contract: none for {library} — composition is unenforced. Author docs/component-contracts/{id}.md to enforce it.
```
This is a notice, not a question. It differs from the styling path deliberately: a styling contract is always applicable, so proceeding without one is a real decision worth a prompt. A component library that has no contract yet is a gap in this plugin's coverage, not a choice the user made.

**Step 4 — Record.** Write the resolution into the manifest under `platforms[platform].tools`, mirroring the styling four:
- `component_contract` — the contract id (omit when `none`).
- `component_contract_source` — `builtin` | `researched` | `manual` | `none`.
- `component_contract_enforcement` — `hard-fail` (default) | `warn` | `off`. Hard-fail blocks the BUILD layer when a component re-implements a primitive the library provides.
- `component_contract_overrides` — `{}` initially; per-component justified exceptions added during BUILD (`{componentName: reason}`).

**Exit gate:** All tool categories have a selection AND a styling contract is resolved (or the user explicitly chose proceed-without, recorded as `style_contract_source: "none"`) AND the component contract is resolved or explicitly `"none"`. Manifest has `equip: passed`.

---

## Manifest Output

Creates `{directory}/design/manifest.json`:

**Single platform example (web):**
```json
{
  "version": "6.0.0",
  "created": "2026-03-31",
  "goal": "Field service management app for HVAC technicians",
  "vibe": "clean, professional, high-contrast for outdoor use",
  "spec": "PRD.md",
  "references": [
    "https://servicetitan.com"
  ],
  "gates": {
    "discover": "passed",
    "target": "passed",
    "equip": "passed"
  },
  "platforms": {
    "web-desktop": {
      "tools": {
        "framework": "vite",
        "style": "tailwind",
        "components": "shadcn",
        "icons": "lucide-react",
        "sandbox": "custom",
        "style_contract": "shadcn-tailwind-web",
        "style_contract_source": "builtin",
        "style_contract_enforcement": "hard-fail",
        "style_contract_overrides": {},
        "component_contract": "shadcn",
        "component_contract_source": "builtin",
        "component_contract_enforcement": "hard-fail",
        "component_contract_overrides": {}
      },
      "phase": "equip",
      "gates": {
        "scaffold": "pending",
        "plan": "pending",
        "atoms": "pending",
        "molecules": "pending",
        "compose": "pending"
      }
    }
  }
}
```

**Multi-platform example (mobile):**
```json
{
  "version": "6.0.0",
  "created": "2026-03-31",
  "goal": "Field service management app for HVAC technicians",
  "vibe": "clean, professional, high-contrast for outdoor use",
  "spec": "PRD.md",
  "references": [
    "https://servicetitan.com"
  ],
  "gates": {
    "discover": "passed",
    "target": "passed",
    "equip": "passed"
  },
  "platforms": {
    "mobile-ios": {
      "tools": {
        "framework": "expo",
        "style": "nativewind",
        "components": "react-native-reusables",
        "icons": "lucide-react-native",
        "sandbox": "custom",
        "style_contract": "nativewind-mobile",
        "style_contract_source": "builtin",
        "style_contract_enforcement": "hard-fail",
        "style_contract_overrides": {},
        "component_contract": "react-native-reusables",
        "component_contract_source": "builtin",
        "component_contract_enforcement": "hard-fail",
        "component_contract_overrides": {}
      },
      "phase": "equip",
      "gates": {
        "scaffold": "pending",
        "plan": "pending",
        "atoms": "pending",
        "molecules": "pending",
        "compose": "pending"
      }
    },
    "mobile-android": {
      "tools": {
        "framework": "expo",
        "style": "nativewind",
        "components": "react-native-reusables",
        "icons": "lucide-react-native",
        "sandbox": "custom",
        "style_contract": "nativewind-mobile",
        "style_contract_source": "builtin",
        "style_contract_enforcement": "hard-fail",
        "style_contract_overrides": {},
        "component_contract": "react-native-reusables",
        "component_contract_source": "builtin",
        "component_contract_enforcement": "hard-fail",
        "component_contract_overrides": {}
      },
      "phase": "equip",
      "gates": {
        "scaffold": "pending",
        "plan": "pending",
        "atoms": "pending",
        "molecules": "pending",
        "compose": "pending"
      }
    }
  }
}
```

The `spec` field is the path to the spec/PRD document (relative to the project root) that drives the component hierarchy during build. If no spec was provided, this field is omitted.

**Deconstruction fields (optional).** When the project was seeded by `pixel-perfect:design-deconstruct`, the manifest also carries top-level `"deconstructed": true` and `"design_system": "design/system"`, and seeded `atoms`/`molecules`/`screens` entries include a `"target"` (the mockup the real component is built to match), e.g. `"target": "design/system/views/feed/feed.html"`. These are additive and ignored by projects that never ran deconstruct.

**Ecosystem mode (optional, top-level).** Controls how the BUILD PLAN Ecosystem Scan (Phase 4b Step 5) behaves. See `docs/ecosystem-patterns.md` for the full matrix. Omitting it defaults to `"suggest"`.

```json
{
  "ecosystemMode": "suggest",
  "librarySuggestions": {
    "threshold": 5,
    "categories": {
      "ai-chat-surface": "suggest",
      "data-table": "suggest",
      "date-picker": "off",
      "drag-and-drop": "required"
    }
  }
}
```

**Pre-declared ecosystem libs (optional, top-level).** When a project knows its AI chat stack upfront (or any other ecosystem choice), it can pre-declare it under `ecosystemLibs` to skip re-research during BUILD PLAN. The BUILD PLAN honors this and only re-verifies if the entry is older than 30 days. Each entry follows the format in `docs/library-vetting-rubric.md`. AI chat entries additionally carry an `aiSdk` sub-block (see [AI SDK Dependency Vetting](../docs/library-vetting-rubric.md#ai-sdk-dependency-vetting)).

```json
{
  "ecosystemLibs": {
    "aiChat": {
      "package": "ai-elements",
      "version": "^1.9.0",
      "purpose": "AI chat component registry (shadcn-based)",
      "vetting": {
        "maintenance": "PASS",
        "popularity": "STRONG",
        "compatibility": "PASS",
        "bundleSize": "LARGE",
        "accessibility": "PARTIAL",
        "license": "COMPATIBLE",
        "tests": "HIGH",
        "community": "ACTIVE",
        "score": "6/8",
        "researchDate": "2026-06-20",
        "aiSdk": {
          "peerVsBundled": "bundled",
          "aiSdkVersion": "^6.0.0",
          "typeContract": "direct-from-ai",
          "frameworkCoupling": "next.js-preferred-vite-compatible",
          "distributionModel": "shadcn-registry",
          "streamingMockSupport": "mocked-not-tested",
          "bundleWeight": "heavy-default-install"
        }
      },
      "tradeoffs": "Bundled deps (no peerDeps) means heavy default install. a11y PARTIAL. shadcn registry = copy-in (no auto-updates)."
    },
    "streamingMarkdown": {
      "package": "streamdown",
      "version": "^2.4.0",
      "purpose": "Streaming markdown renderer with plugin ecosystem"
    }
  }
}
```

When `ecosystemLibs.aiChat` (or any AI chat category entry) is present, the BUILD PLAN additionally loads [`docs/ai-chat-patterns.md`](../docs/ai-chat-patterns.md) and [`docs/styling-contracts/ai-chat-tailwind-web.md`](../docs/styling-contracts/ai-chat-tailwind-web.md) (when the platform uses shadcn + Tailwind) so the build applies the streaming-aware state pattern, compound-component conventions, and group-marker theming automatically.

**Screen entries (`platforms[platform].screens[]`).** Each screen is keyed by **`route`** (the page identity / dedup key — a URL path on web like `/feed`; a navigator destination on mobile like `Feed`; a named view on TUI/desktop; default `"/" + kebab-case(name)` on web, `PascalCase(name)` elsewhere) and carries a **`states`** list — the named states for that route (`["default","empty","loading","error"]`, or tab names like `["account","billing","team"]`), each of which becomes one sandbox story. Views that differ only by state collapse into ONE screen with a `states` list rather than separate screens. Single-state screens carry `["default"]` (or omit `states`). The remaining fields are `name`, `file`, `story`, `status`, `atoms`/`molecules`/`organisms`, and optional `target`. Both fields are additive and backward-compatible (a screen with no `route` uses the default derivation; no `states` means a single Default story). See `docs/state-patterns.md`.

**When "Other" is selected for any tool**, the manifest includes the docs URL inside the platform's tools. For a custom style system, the styling contract is resolved by research (`style_contract_source: "researched"`) or, if research was inconclusive and the user opted out, marked `"none"`:

```json
{
  "platforms": {
    "web-desktop": {
      "tools": {
        "framework": "custom",
        "framework_docs": "https://example.com/framework/docs",
        "style": "custom",
        "style_docs": "https://example.com/style-system/docs",
        "components": "react-native-paper",
        "icons": "custom",
        "icons_docs": "https://example.com/icons/docs",
        "sandbox": "custom",
        "style_contract": "swiftui-view-modifiers",
        "style_contract_source": "researched",
        "style_contract_enforcement": "hard-fail",
        "style_contract_overrides": {},
        "component_contract": "react-native-paper",
        "component_contract_source": "builtin",
        "component_contract_enforcement": "hard-fail",
        "component_contract_overrides": {}
      }
    }
  }
}
```

If research could not produce a rubric-passing contract and the user chose to proceed without one, `style_contract` is omitted and `style_contract_source: "none"`, `style_contract_enforcement: "off"` are recorded instead (flagged at every build).

---

## Re-Initialization

If `design/manifest.json` already exists:
- Without `--force`: warn and exit
- With `--force`: overwrite, resetting all gates

```
design/manifest.json already exists (phase: atoms, 3/5 atoms verified).
Run with --force to reconfigure from scratch, or use pixel-perfect:status to see progress.
```

## Next Steps

After init completes:
```
Initialization complete. Manifest saved to design/manifest.json

Next: pixel-perfect:scaffold
  This will set up your project with {style} + {components} + your sandbox ({sandbox})

To add another platform later: pixel-perfect:add-platform
```

The message uses the actual tools selected during init (from the manifest).
