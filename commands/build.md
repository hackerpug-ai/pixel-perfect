---
description: "Build components and screens: PLAN → ATOMS → MOLECULES → COMPOSE (phases 4b-6)"
agent: primary
---

# Build (Phases 4b-6)

The main orchestration command. Reads requirements, identifies components, builds them as real code, composes them into screens, and wires up navigation and data flow.

## Usage

```
/pixel-perfect:build [directory] [options]
```

## Arguments

- `[directory]`: Project directory. Defaults to current directory.

## Options

- `--platform <name>`: Target platform to build (e.g., `mobile-ios`, `web-desktop`). Required when multiple platforms exist. Auto-selected when only one platform is configured.
- `--phase <name>`: Start from a specific phase (atoms, molecules, compose). Default: resume from current phase.
- `--component <name>`: Build or rebuild a specific component
- `--screen <name>`: Build or rebuild a specific screen

## Gate Check

**Requires:** `design/manifest.json` with the selected platform's `scaffold: passed`.

**Platform selection:**
- If only one platform exists, auto-selected.
- If multiple platforms exist and `--platform` is not provided, prompt the user to choose.
- If the selected platform's scaffold gate is not passed:
  ```
  Cannot build: scaffold not complete for "{platform}".
  Run /pixel-perfect:scaffold --platform {platform} first.
  ```

## Overview

Build progresses through an analysis phase followed by adaptive build phases. Each phase has entry/exit gates and tracks progress in the manifest.

```
Phase 4b: PLAN      → Analyze spec + codebase; produce level-tagged work plan; confirm with user
Phase 5: ATOMS      → Individual components (Button, Card, Badge, etc.)
Phase 5b: MOLECULES → Functional compositions of 2-3 atoms (SearchBar, UserCard, FormField)
Phase 5c: ORGANISMS  → Complex stateful compositions of molecules + atoms (DataTable, Accordion)
Phase 6: COMPOSE    → Screen layouts composing organisms, molecules and atoms
```

Phases 5, 5b, 5c, and 6 execute only for levels where the BUILD PLAN identifies non-zero delta.

The command resumes from wherever the manifest says the project is. If atoms are partially complete, it picks up where it left off.

### Platform Scoping

All build operations read from and write to `manifest.platforms[platform]`. References to `tools`, `phase`, `gates`, `atoms`, `molecules`, `screens` in this document refer to the selected platform's fields. The `spec` field remains top-level (shared across platforms).

---

## Phase 4b: BUILD PLAN

Analyze the requirements spec against the current codebase state. Determine which build levels have non-zero delta — what needs to be created, updated, or is already complete. Produce a work plan. The user confirms the plan before any code is written.

This phase runs automatically when `/pixel-perfect:build` is invoked and `plan` is not yet `passed` in the manifest.

**If the project was seeded by `/pixel-perfect:design-deconstruct`** (`design/deconstruction.json` exists): the atoms/molecules lists are pre-populated from the deconstruction inventory (atoms→atoms, molecules→molecules), and the screens are the deconstruction views **collapsed by route** — state-split views (`feed/default`, `feed/empty`, …) become ONE screen with a `states` list, not separate screens (see Phase 6 Step 1). Each item carries a `target` mockup (per state for collapsed screens). Treat these as the required set, reconcile against the spec, and confirm the route map with the user as usual.

**If the project was wireframed** (`design/wireframes.json` exists): the **screen list** — and the atoms/molecules each screen implies — is pre-populated from the wireframe inventory, with each screen carrying its `design/wireframes/{screen}.md` as a structural target. (A later `design-deconstruct` run upgrades these structural targets to high-fi mockups.)

### The Build Levels

The build system works bottom-up across four levels:

| Level | What It Covers | Can Skip? |
|-------|---------------|-----------|
| Tokens | Design primitives: color palette, type scale, spacing scale | Yes — if spec has no new brand/theme changes |
| Atoms | Single-purpose UI primitives: Button, Input, Icon, Badge | Yes — if spec requires no new/changed components |
| Molecules | Functional atom compositions: SearchBar, FormField, UserCard | Yes — if spec has no repeated multi-atom patterns |
| Organisms | Complex stateful compositions: DataTable, Accordion, CommandPalette | Yes — optional, only if spec demands reusable complex blocks |
| Screens | Full view layouts composing organisms, molecules, and atoms | No — screens are always the primary output |

**Bottom-up rule:** A lower-level change propagates upward. If atoms change, molecules must be re-evaluated. If molecules change, screens must be re-evaluated. You cannot mark a higher level as SKIP if a lower level was ACTIVE — the propagation is automatic.

### Step 1: Analyze Existing Codebase

Before reading requirements, audit what already exists:

```
Auditing codebase...

Tokens:    design/tokens.ts found (24 color tokens, 6 type sizes, 8 spacing steps)
Atoms:     src/components/ — 3 files found (StatusBadge, JobCard, DateChip)
Molecules: src/molecules/ — 0 files found
Screens:   src/screens/ — 0 files found
```

If `design/tokens.ts` (or equivalent per framework) does not exist, the Tokens level is automatically ACTIVE (greenfield token setup needed).

If `src/components/` (or equivalent) does not exist or is empty, Atoms is automatically ACTIVE.

### Step 2: Analyze Requirements

Read the requirements document (from `manifest.spec`). For each build level, identify what the spec demands:

```
Analyzing requirements (PRD.md)...

Tokens required:    existing palette matches spec (no new colors mentioned)
Atoms required:     StatusBadge ✓, JobCard ✓, DateChip ✓, ActionButton ✗ (missing)
Molecules required: JobRow (StatusBadge + DateChip) — pattern repeated in 3 screens
Organisms required: DataTable (SearchBar + Pagination + TableRow) — used in 3 screens
Screens required:   grouped by route — state-variants collapse into one screen per route:
  /today      → TodayFeed  [default, empty, loading]   (missing)
  /jobs/:id   → JobDetail  [default, loading]           (missing)
```

Screens are counted by **route**, not by visual state. Views that differ only by state (default/empty/loading/error, or different tabs of one page) are one screen with a `states` list — see Phase 6 Step 1 for the collapse + the state-vs-route rule.

### Step 2b: Ecosystem Scan (Component Library Recommendations)

Before committing to building custom components, scan the planned atom/molecule list against well-supported ecosystem libraries. Many UI patterns — tables, calendars, charts, date pickers, command palettes, rich-text editors, drag-and-drop, carousels — have mature, battle-tested libraries that are almost always a better choice than rolling your own.

**Purpose:** Catch opportunities where a popular, well-maintained library can replace a planned custom build — saving time, reducing bugs, and giving the user a richer feature set out of the box.

#### When to Scan

This step runs for every component in the ACTIVE atoms, molecules, and organisms lists. It is controlled by `ecosystemMode` in `design/manifest.json`:

| `ecosystemMode` | Behavior |
|-----------------|----------|
| `suggest` (default) | Runs the scan. Presents library suggestions but **never blocks** the BUILD PLAN. User can ignore all suggestions and proceed with custom builds. |
| `off` | Skips the scan entirely. No library suggestions appear. The agent builds everything custom. |
| `required` | Runs the scan and **blocks** the BUILD PLAN until every complex pattern has a resolved library choice ("use X" or "build custom confirmed"). |

If `ecosystemMode` is not set in the manifest, default to `suggest`. The scan also respects per-category overrides in `manifest.librarySuggestions.categories` (each category can independently be `off`, `suggest`, or `required`).

When `ecosystemMode` is `off`: output a brief note and skip directly to Step 2c (skip Steps 2a and 2b entirely).

#### How It Works

For each planned component, evaluate whether it matches a known "complex UI pattern" category from `docs/ecosystem-patterns.md`. These are patterns where the ecosystem consensus is strong and the build-vs-adopt calculus favors adopting.

The **Category → Pattern Map** lives in `docs/ecosystem-patterns.md` — a reference document with 19 pattern categories and their historically dominant libraries. This is a starting point; the scan verifies every match against the current ecosystem using the search guardrails below.

#### Research-Enhanced Scan

The scan uses `docs/ecosystem-patterns.md` for pattern matching and `docs/library-vetting-rubric.md` for scoring. Every library recommendation is verified against the current ecosystem state before being presented.

**Search guardrails — preferred tools in order of availability:**

| Tool | Priority | Use Case |
|------|----------|----------|
| **Default harness search** (built-in WebSearch) | **First** — always available, zero setup | Broad queries, npm package existence, GitHub repo lookups |
| **Jina Reader** (`jina_read_url`) | Use when provisioned | Deep-read npm package pages, GitHub READMEs, library docs |
| **Exa** (`exa_web_search_exa`) | Use when provisioned | Semantic search for current alternatives, design research |
| **Firecrawl MCP** (`firecrawl` tools) | Use when provisioned | Scraping changelogs, release pages, structured data extraction |

**Fallback:** Default harness search is sufficient for all queries. The other tools enrich the research but are not required. Never assume a tool is available — check the harness's available tools before referencing them.

**Reputational signals — objective metrics for library quality:**

| Signal | Source | How to Check |
|--------|--------|---------------|
| **Stars** | GitHub | Search `"{library-name} github stars"` |
| **Weekly Downloads** | npm registry | Search `"{library-name} weekly downloads npm"` or `npm view {library-name}` |
| **Last Release** | npm / GitHub | Search `"{library-name} latest release"` or `npm view {library-name} time` |
| **Rating (if available)** | npm search | Search `"{library-name} rating"` or check npm page |

These signals feed into the vetting rubric (`maintenance` ← Last Release, `popularity` ← Stars + Downloads, `community` ← Rating + Stars). Libraries with STRONG downloads + ACTIVE releases + HIGH rating are top-tier recommendations.

**Scan steps:**

1. **Start from the pattern map.** Match each planned component against categories in `docs/ecosystem-patterns.md`.
2. **Verify current state.** For each match, search framework-specifically:
   ```
   "best {framework} {pattern} library 2026"
   "{library-name} npm downloads stars 2026"
   "{library-name} latest release date"
   ```
3. **Check reputation.** Verify the four reputational signals (stars, downloads, last release, rating). A library stale for >12 months is automatically flagged and alternatives are searched.
4. **Check for stale entries.** If a table entry has no recent release, search:
   ```
   "{stale-library} alternative {framework} 2026"
   "best {framework} {pattern} library 2026"
   ```
5. **Apply the vetting rubric.** Score each candidate against `docs/library-vetting-rubric.md`. Library scoring ≥5/8 is recommended.
6. **Present with scores.** Show ranked recommendations with vetting scores, reputational signals, and tradeoffs.

**Pre-research caching:** If `design/research/libraries/{pattern}.md` exists from a prior `/pixel-perfect:research --libraries` run and was researched within the last 30 days, reuse those findings. Search fresh only if cached research is stale or absent. No libraries are cached outside the project directory.

#### The Scan Process

1. **Categorize:** For each planned atom/molecule/organism, determine if it falls into one of the pattern categories in `docs/ecosystem-patterns.md` (or seems like it *might* benefit from an ecosystem library).

2. **Check existing tools:** If the user's chosen component adapter already provides this component (e.g., shadcn/ui has a Data Table built on TanStack Table), note that the adapter covers it and move on — no recommendation needed.

3. **Verify via web search:** For each match, verify the pattern map's recommendation against the current ecosystem using the search guardrails documented above. Search:
   ```
   "best {framework} {pattern} library 2026"
   "{framework} {pattern} component npm stars downloads"
   ```
   Verify reputational signals (stars, weekly downloads, last release date, rating). Apply `docs/library-vetting-rubric.md` to each candidate. Prefer libraries that are:
   - **Actively maintained** (LAST RELEASE ≤ 6 months)
   - **Well-adopted** (STARS + DOWNLOADS both STRONG or MODERATE)
   - **Framework-native** (React lib for React, Svelte lib for Svelte, etc.)
   - **Compatible** with the project's existing component adapter where possible

4. **Present ranked recommendations:** For each component where a library match was found, present scored recommendations to the user **before** the BUILD PLAN is finalized:

   ```
   ECOSYSTEM SCAN
   ==============
   Scanning planned components for ecosystem library opportunities...

   ✓ ActionButton         — Custom build (simple button, covered by component adapter)
   ✓ StatusBadge          — Custom build (simple, domain-specific)
   ✓ JobCard              — Custom build (domain-specific composition)
   ⚠ DataTable            — Library recommended!

     → TanStack Table (@tanstack/react-table) — 8/8
       Maintenance: PASS | Popularity: STRONG | Compat: PASS | Bundle: SMALL
       A11y: YES | License: MIT | Tests: HIGH | Community: ACTIVE
       Tradeoff: Headless — requires UI wrapper. shadcn/ui provides a built-in wrapper.

     → AG Grid (ag-grid-react) — 7/8
       Maintenance: PASS | Popularity: STRONG | Compat: PASS | Bundle: LARGE
       A11y: YES | License: MIT | Tests: HIGH | Community: ACTIVE
       Tradeoff: ~200KB gzipped. Enterprise features require paid license.

   ⚠ DateRangePicker      — Library recommended!

     → react-day-picker — 7/8
       Maintenance: PASS | Popularity: MODERATE | Compat: PASS | Bundle: SMALL
       A11y: YES | License: MIT | Tests: HIGH | Community: ACTIVE
       Tradeoff: Build custom only if a simple native <input type="date"> suffices.

   ? How would you like to handle these?
     1. Use top-ranked libraries (recommended, install + wrap as project components)
     2. Build some custom (specify which)
     3. Use a different library (specify which)
   ```

5. **User decision is final.** Respect the user's choice:
   - **"Use top-ranked libraries"** → The atom/molecule/organism is still built, but it wraps the ecosystem library rather than implementing from scratch. The manifest records the dependency and vetting score:
     ```json
     {
       "name": "DataTable",
       "file": "src/components/DataTable.tsx",
       "status": "pending",
       "ecosystemLib": {
         "package": "@tanstack/react-table",
         "version": "^8.x",
         "purpose": "Headless table logic (sorting, filtering, pagination)",
         "vetting": {
           "maintenance": "PASS",
           "popularity": "STRONG",
           "compatibility": "PASS",
           "bundleSize": "SMALL",
           "accessibility": "YES",
           "license": "COMPATIBLE",
           "tests": "HIGH",
           "community": "ACTIVE",
           "score": "8/8",
           "researchDate": "2026-06-04"
         },
         "tradeoffs": "Headless — requires UI wrapper. shadcn/ui provides a built-in wrapper."
       }
     }
     ```
   - **"Build custom"** → Proceed as a normal custom build. No ecosystem entry.
   - **"Different library"** → Record the user's choice in the manifest with `"userChoice": true` and build the wrapper for their preferred library. Include a note about which library was the top recommendation.

#### When NOT to Recommend

Do **not** recommend a library when:
- The component is simple enough that a library adds more complexity than value (a basic badge, a single button, a label)
- The component is **domain-specific** (StatusBadge, JobCard, UserCard — these are *your* product, not generic UI)
- The project's existing component adapter already provides a good implementation
- The user has set `ecosystemMode: "off"` (or set the specific category to `"off"` in `librarySuggestions.categories`)

#### Step 2c: Library Validation (after user accepts)

Before the BUILD PLAN is finalized, validate each accepted library:

1. **Package exists:** Run `npm view {package}@{version}` (or equivalent for the project's package manager). Confirm the package resolves.
2. **No version clash:** Check against existing `package.json` dependencies for conflicting peer deps (e.g., library requires React 18 but project uses React 19).
3. **Framework compatibility check:** If the library has `peerDependencies`, verify they match the project's framework version.
4. **Import smoke test:** Install the package temporarily and verify the import resolves:
   ```bash
   npm install --save-dev {package}@{version}
   # Agent verifies: import { X } from '{package}' resolves without errors
   ```

If validation fails for any library:

```
LIBRARY VALIDATION
==================
  ✗ DataTable → @tanstack/react-table@^8.20.0
    Failed: peerDependency conflict
      Requires: react@^18.0.0
      Project has: react@^19.0.0
    → This may still work. Accept with caution, or choose an alternative.

? How to proceed?
  1. Accept anyway (at your own risk)
  2. Use alternative: {next-best option}
  3. Build custom
```

If all libraries validate:

```
LIBRARY VALIDATION
==================
  ✓ DataTable → @tanstack/react-table@^8.20.0 — installed, imports verified
  ✓ DateRangePicker → react-day-picker@^9.0.0 — installed, imports verified

All ecosystem libraries validated.
```

#### Ecosystem Scan Output in the Build Plan

The BUILD PLAN output (Step 4) now includes an ecosystem scan summary:

```
BUILD PLAN
==========
Analyzing: PRD.md vs current codebase (scaffold: passed)
Mode: brownfield (existing components found)

ECOSYSTEM SCAN:
  ✓ ActionButton, StatusBadge, JobCard, DateChip — custom build
  📦 DataTable → @tanstack/react-table 8/8 (user approved)

TOKENS    [ SKIP ]   — ...
ATOMS     [ BUILD ]  — Need: DataTable (wrapping @tanstack/react-table), ActionButton, ...
MOLECULES [ BUILD ]  — ...
ORGANISMS [ BUILD ]  — Need: DataTable (complex stateful composition)
SCREENS   [ BUILD ]  — ...

Planned work:
  - 1 atom wrapping ecosystem library: DataTable (@tanstack/react-table)
  - 2 atoms to create custom: ActionButton, StatusBadge
  ...

? Proceed with this plan? [Yes / Modify / Cancel]
```

### Step 3: Compute Delta and Apply Gate Logic

For each level:
- **Delta = required by spec − already verified in codebase**
- A level is **ACTIVE** if delta > 0
- A level is **SKIP** if delta = 0 AND no lower level is ACTIVE
- A lower-level ACTIVE status forces re-evaluation of all higher levels (even if their own delta is 0)

Gate-opening factors per level:

**Tokens gate opens when:**
- No existing token file (`design/tokens.ts` or equivalent)
- Spec mentions new colors, fonts, or spacing system
- Spec references a new theme variant (dark mode, rebrand)
- Component library version change that alters design tokens

**Atoms gate opens when:**
- Tokens gate is ACTIVE (new tokens → atoms must use them)
- Spec names a UI element not in the existing atom inventory
- Spec describes a new interactive state or variant on an existing atom
- A screen references a component that doesn't exist in codebase

**Molecules gate opens when:**
- Atoms gate is ACTIVE (changed atoms → compositions need re-evaluation)
- The same 2-3 atom combination appears in ≥2 spec screens
- No molecules exist and spec complexity warrants them

**Organisms gate opens when:**
- Molecules or atoms gate is ACTIVE (changed lower levels → organisms need re-evaluation)
- A complex composition of molecules + atoms appears in ≥2 spec screens
- The composition manages significant internal state (sort/pagination/selection/toggles)

**Screens gate:**
- Never SKIP if any lower level is ACTIVE
- Always ACTIVE if spec describes new or changed screens

### Step 4: Output BUILD PLAN

Present the plan for user confirmation before writing any code:

```
BUILD PLAN
==========
Analyzing: PRD.md vs current codebase (scaffold: passed)

Mode: brownfield (existing components found)

TOKENS    [ SKIP ]   — Existing token file matches spec. No new colors or fonts required.
ATOMS     [ BUILD ]  — Need: ActionButton (missing). StatusBadge, JobCard, DateChip already verified.
MOLECULES [ BUILD ]  — Need: JobRow (StatusBadge + DateChip). Triggered by atoms change.
ORGANISMS [ BUILD ]  — Need: DataTable (SearchBar + Pagination + TableRow). Used in 3 screens.
SCREENS   [ BUILD ]  — 2 routes (state-variants collapsed): /today → TodayFeed [3 states], /jobs/:id → JobDetail [2 states].

Planned work:
  - 1 atom to create: ActionButton
  - 1 molecule to create: JobRow
  - 1 organism to create: DataTable
  - 2 screens to create across 2 routes: TodayFeed (/today, 3 states), JobDetail (/jobs/:id, 2 states)

? Proceed with this plan? [Yes / Modify / Cancel]
```

**Modification flow:** If the user selects "Modify", ask which level to adjust:
- Add items to a level
- Remove items from a level
- Change a SKIP to BUILD or vice versa (user may have context the analysis missed)

**Cancellation:** If "Cancel", exit build cleanly. Manifest `plan` gate remains `pending`.

### Step 5: Write Plan to Manifest

After user confirms, write the plan to manifest. If any ecosystem library recommendations were accepted in Step 2b, include the `ecosystemLibs` record:

```json
{
  "build_plan": {
    "tokens": "skip",
    "atoms": {
      "status": "build",
      "create": ["ActionButton"],
      "existing_verified": ["StatusBadge", "JobCard", "DateChip"]
    },
    "molecules": {
      "status": "build",
      "create": ["JobRow"]
    },
    "organisms": {
      "status": "build",
      "create": ["DataTable"]
    },
    "screens": {
      "status": "build",
      "create": ["TodayFeed", "JobDetail"]
    },
    "ecosystemLibs": {}
  },
  "gates": {
    "plan": "passed"
  }
}
```

If ecosystem libraries were accepted:

```json
{
  "build_plan": {
    "atoms": {
      "status": "build",
      "create": ["DataTable", "ActionButton"],
      "ecosystemLibs": {
        "DataTable": {
          "package": "@tanstack/react-table",
          "version": "^8.x",
          "purpose": "Headless table logic (sorting, filtering, pagination)"
        }
      }
    }
  }
}
```

When building an atom that has an `ecosystemLibs` entry, the build process installs the package and wraps it as a project component (using theme tokens and adapter conventions) rather than implementing the logic from scratch.

### Greenfield vs. Brownfield

**Greenfield** (no existing components):
- All levels are ACTIVE by default (everything needs creation)
- No delta computation needed — BUILD PLAN immediately proposes creating everything from spec
- Plan output shows: `Mode: greenfield (no existing components)`

**Brownfield** (existing components found):
- Delta computation runs per level
- Plan proposes only what's missing or changed
- Plan output shows: `Mode: brownfield (N existing components found)`

### Resuming the Build

After PLAN is confirmed, `/pixel-perfect:build` resumes from the first ACTIVE level in order (Tokens → Atoms → Molecules → Organisms → Screens), executing only ACTIVE levels.

If build is interrupted and resumed later, the plan in the manifest drives where to pick up:

```
> /pixel-perfect:build

Resuming from BUILD PLAN:
  [x] Tokens    — skipped (no changes)
  [~] Atoms     — 0/1 built (ActionButton pending)
  [ ] Molecules — pending (JobRow)
  [ ] Organisms  — pending (DataTable)
  [ ] Screens   — pending (TodayFeed, JobDetail)

Building: ActionButton...
```

### Phase 4b Exit Gate

BUILD PLAN is confirmed by user. Manifest has `"plan": "passed"`. Subsequent build phases execute only ACTIVE levels from the plan.

---

## Phase 5: ATOMS

Build individual, reusable components.

### Step 1: Identify Components

Read requirements (PRD, user input) and break into an atomic component list:

```
Analyzing requirements for components...

Proposed atoms:
  1. StatusBadge    — Colored badge showing job status (open, in-progress, complete)
  2. JobCard        — Summary card for a single job
  3. DateChip       — Date display chip with relative time
  4. SectionHeader  — Section title with optional action button
  5. ActionButton   — Primary action button with loading state

? Confirm component list? [Yes / Add more / Remove some]
```

Update manifest with the component list (all `status: pending`).

### Step 2: Build Each Atom

For each component, in order:

1. **Load context:**
   - Adapter docs for the chosen tools, including the **framework adapter** if one exists (e.g. `docs/adapters/sveltekit.md`) — it defines the component file extension and story format
   - **Styling contract** for this platform's style system (`manifest.platforms[platform].tools.style_contract`). Load `docs/styling-contracts/{id}.md` when `style_contract_source` is `builtin`/`manual`, or `design/research/styling/{id}.md` when `researched`. This is a **hard constraint** on how styles are emitted (Step 1b) — not optional guidance. If `style_contract_source: "none"`, no contract is loaded (styles are unenforced; flag this to the user).
   - Project theme file
   - frontend-design aesthetic context (if available)
   - **Deconstruction target** (if `design/deconstruction.json` exists): the matching mockup for this atom (its `inventory.atoms[].html` / `.png`) — build the real component to match the mockup's structure, tokens, and states

### Step 1b: Apply Styling Contract

Before writing the component, read the loaded styling contract and treat it as a **hard constraint**, not a suggestion. This is precisely what prevents the drift where a build silently bypasses the declared style system — e.g. inventing a parallel global-CSS system of custom `.atom-*` / `.mol-*` classes ported from a mockup's `<style>` block, the failure that motivated contracts.

**If a contract should apply but failed to load** (no `style_contract` in the manifest, or the contract file is missing/malformed): STOP and report to the user — do not build the component against an unknown styling basis. Re-run the EQUIP "Resolve Styling Contract" step (built-in / research / manual) or proceed only if the user explicitly set `style_contract_enforcement: "off"`.

From the contract, you MUST:
- **Emit styles via `<emitMethod>`** — e.g. Tailwind utility classes on `className`; colocated `StyleSheet.create`; `import styles from './X.module.css'`. No other mechanism for static styles.
- **Place styles per `<filePlacement.rule>`** — e.g. colocated; never a top-level `styles/` of global CSS.
- **Bind tokens via `<tokenBinding.mechanism>`** — e.g. CSS custom properties → Tailwind theme; theme object → `StyleSheet.create`. The theme flows through the chosen system, not a side channel.

You MUST NOT:
- Use any **forbidden pattern** in the contract's `checks` block (e.g. global custom-class CSS, inline `style={{}}` for static values, hardcoded color literals). These are blocking — Step 4's gate fails the layer on any.
- **Port a mockup's `<style>` block verbatim into the project.** A deconstruction target's CSS is a *pixel reference only*; translate every style into the contract's emit method. (The gate would block the verbatim port anyway.)

The contract governs the **styling mechanism**; the adapter doc governs **component-library patterns** (shadcn's `cn()`/`@/components/ui/`, Paper's themed components). Both apply.

### Step 2: Build Each Atom (continued)

2. **Write component file:**
   - Real component code (`.tsx`, `.vue`, `.svelte`, etc.)
   - **Emits styles exactly per the styling contract (Step 1b)** — emit method, file placement, token binding, and no forbidden patterns
   - Uses theme tokens (not hardcoded values)
   - Follows adapter conventions (shadcn patterns, Paper patterns, etc.)
   - If frontend-design is available: distinctive typography, intentional color hierarchy, considered motion
   - **If an ecosystem library was approved** (the atom has an `ecosystemLibs` entry in the build plan):
     1. Install the package: `npm install {package}@{version}` (or pnpm/yarn as appropriate)
     2. Build a **wrapper component** that wraps the library's API and applies:
        - The project's theme tokens (colors, spacing, typography)
        - Adapter conventions (follow the same patterns as hand-built components)
        - Any domain-specific props or defaults the spec requires
     3. The wrapper is the atom — it has the same story file, controls, and manifest entry as any other atom. The library is an implementation detail, not a leaky abstraction

3. **Write story file:**
   - Registered in the project's sandbox (the sandbox adapter defines the format — for `custom`, a registry entry in the target language per `docs/sandbox-spec.md`; for Storybook, CSF3)
   - Shows all states (default, loading, error, disabled, etc.)
   - Uses realistic mock data
   - **Story title MUST use `Components/` prefix** (e.g., `title: 'Components/StatusBadge'`)
   - Includes `parameters.docs.description` for auto-generated docs
   - **ALL props MUST be exposed to the sandbox's controls** (Storybook `argTypes`; or rendered as labeled variants in a `custom` sandbox)
   - Controls use the appropriate type for each prop:
     - `select` for enums / union types
     - `boolean` for flags
     - `text` for strings
     - `number` for numeric values
     - `color` for color values

   **argTypes example:**

   ```tsx
   // StatusBadge.stories.tsx
   import type { Meta, StoryObj } from '@storybook/react';
   import { StatusBadge } from './StatusBadge';

   const meta: Meta<typeof StatusBadge> = {
     title: 'Components/StatusBadge',
     component: StatusBadge,
     parameters: {
       docs: {
         description: {
           component: 'Colored badge indicating job status. Supports open, in-progress, and complete states with semantic color mapping.',
         },
       },
     },
     argTypes: {
       status: {
         control: { type: 'select' },
         options: ['open', 'in-progress', 'complete'],
         description: 'Current status of the job',
       },
       label: {
         control: { type: 'text' },
         description: 'Override the default label text',
       },
       size: {
         control: { type: 'select' },
         options: ['sm', 'md', 'lg'],
         description: 'Badge size variant',
       },
       pulsing: {
         control: { type: 'boolean' },
         description: 'Whether the badge pulses to draw attention',
       },
     },
     args: {
       status: 'open',
       size: 'md',
       pulsing: false,
     },
   };

   export default meta;
   type Story = StoryObj<typeof StatusBadge>;

   export const Default: Story = {};

   export const InProgress: Story = {
     args: { status: 'in-progress', pulsing: true },
   };

   export const Complete: Story = {
     args: { status: 'complete' },
   };
   ```

   **Framework story format (React shown above; other frameworks differ):**

   The story file's language, extension, and imports follow the **framework adapter**. The example above is React (`StatusBadge.stories.tsx`, `@storybook/react`, JSX). For **SvelteKit**, write `StatusBadge.stories.svelte` using native Svelte CSF (`defineMeta` + `<Story>` from `@storybook/addon-svelte-csf`) — or `StatusBadge.stories.ts` importing `Meta`/`StoryObj` from `@storybook/svelte`. The `argTypes`/`args`/controls conventions are identical across frameworks. See `docs/adapters/{framework}.md` and `docs/storybook-conventions.md`.

   **React Native polyfill decorator:**

   For React Native projects rendering in web Storybook, add a polyfill disclaimer decorator to the story preview or individual stories where RN primitives need web shimming:

   ```tsx
   // .storybook/preview.tsx — global decorator for RN-in-web
   import { View, Text } from 'react-native-web';

   const withRNWeb: Decorator = (Story) => (
     <View style={{ padding: 16 }}>
       <Story />
     </View>
   );

   export const decorators = [withRNWeb];
   ```

4. **Verify:**
   - File exists at path recorded in manifest
   - Story file exists alongside component
   - Compilation succeeds (no type errors, no import errors)
   - Component renders in the sandbox (in isolation, under its layer)
   - All props are exposed to the sandbox's controls / variants
   - **Styling contract gate** (unless `style_contract_enforcement: "off"`): run
     `node {plugin}/scripts/verify-styling-contract.mjs <contract.md> <project-root> [--allow GLOB ...]`
     where `<contract.md>` is the resolved contract path and `<project-root>` is the **project root** (the directory containing `src/`; usually `.`). **Do not pass `src/` itself** — contract globs are written relative to the project root, so pointing at `src/` makes them match zero files and the gate fails the run (exit `3`, vacuous scan). Pass one `--allow <glob>` per active override in `tools.style_contract_overrides` (component files legitimately exempted). If the script exits non-zero (`1` = violations, `2` = contract/usage error, `3` = vacuous scan — treat **all** as blocking):
     - `hard-fail` (default): **block this atom** — print the violations (file, line, pattern, rationale) and fix the component to comply before continuing. Do NOT mark the atom verified. (Exit `2` = malformed/missing contract; exit `3` = wrong source-root — stop and fix the cause before building.)
     - `warn`: print the violations and continue (the atom is still verified).
     - Non-Node target, or the script path unresolvable: run the contract's `checks` block detections directly with `grep`/`glob` against `<project-root>` and apply the same pass/fail rule. The decision is deterministic either way — the LLM only formats the report.
   - If a deconstruction `target` exists for this atom: the rendered component matches the mockup's structure, tokens, and states (the literal pixel-perfect goal)

5. **Aesthetic gate** (if frontend-design available):
   - Component uses the project font pairing
   - Color usage follows the vibe's hierarchy (not arbitrary)
   - Interactive components have intentional motion (not default browser transitions)
   - Spacing uses the theme scale

6. **Update manifest:**
   ```json
   {
     "atoms": [
       {
         "name": "StatusBadge",
         "file": "src/components/StatusBadge.tsx",
         "story": "src/components/StatusBadge.stories.tsx",
         "status": "verified",
         "controls": true
       }
     ]
   }
   ```
For atoms wrapping an ecosystem library, the entry includes the `ecosystemLib` record from the build plan with vetting:
    ```json
    {
      "name": "DataTable",
      "file": "src/components/DataTable.tsx",
      "story": "src/components/DataTable.stories.tsx",
      "status": "verified",
      "controls": true,
      "ecosystemLib": {
        "package": "@tanstack/react-table",
        "version": "^8.20.0",
        "purpose": "Headless table logic (sorting, filtering, pagination)",
        "vetting": {
          "maintenance": "PASS",
          "popularity": "STRONG",
          "compatibility": "PASS",
          "bundleSize": "SMALL",
          "accessibility": "YES",
          "license": "COMPATIBLE",
          "tests": "HIGH",
          "community": "ACTIVE",
          "score": "8/8",
          "researchDate": "2026-06-04"
        },
        "tradeoffs": "Headless — requires UI wrapper. shadcn/ui provides a built-in wrapper."
      }
    }
    ```

### Progress Tracking

After each atom:
```
Atoms: 3/5 verified
  [x] StatusBadge     (controls: yes)
  [x] JobCard         (controls: yes)
  [x] DateChip        (controls: yes)
  [~] SectionHeader   (building...)
  [ ] ActionButton
```

### Phase 5 Exit Gate

All atoms in the manifest have `status: verified` and `controls: true`, AND the styling contract gate passes for the atom files (or `style_contract_enforcement` is `"off"`/`"warn"`). Update manifest:
```json
{
  "phase": "atoms",
  "gates": {
    "plan": "passed",
    "atoms": "passed",
    "atoms_styling_contract": "passed"
  }
}
```

> **The styling-contract gate (Step 4) runs for every layer.** Molecules (5b), organisms (5c), and compose (6) each load the same contract (their Step 1), apply it (Step 1b), and run the same `verify-styling-contract.mjs` gate before their exit gate opens. Each layer records `{layer}_styling_contract: "passed"`. When `style_contract_enforcement` is `hard-fail` (default), a layer whose emitted files violate the contract is **blocked** until fixed or a per-component override is recorded in `tools.style_contract_overrides`. This is the gate that would have caught a parallel global-CSS system before it shipped.

---

## Phase 5b: MOLECULES

Assemble 2-3 atoms into functional, reusable UI groups. A molecule is not a full screen — it is a named, reusable composition that appears in multiple screens.

### When to Build Molecules

Build molecules when the spec or atom list reveals:
- The same 2-3 atom combination appears in ≥2 screens
- A named functional UI pattern exists (SearchBar, FormField, UserCard, NavItem)
- Composing atoms directly in screens would cause repetition

If none of these conditions apply, skip Phase 5b and proceed to Phase 6.

### Step 1: Identify Molecules

Review the atom list from Phase 5 and the requirements spec. Look for repeated atom groupings:

```
Analyzing atoms and spec for molecule candidates...

Proposed molecules:
  1. JobRow       — StatusBadge + DateChip (appears on TodayFeed, JobList, SearchResults)
  2. ActionPanel  — ActionButton + StatusBadge (appears on JobDetail, QuickActions)

? Confirm molecule list? [Yes / Add more / Remove / Skip molecules entirely]
```

Update manifest with the molecule list (all `status: pending`).

#### Step 1b: Declare Molecule State

For each proposed molecule, identify whether it needs internal state. Molecules that only compose atoms visually (layout + prop delegation) are **stateless**. Molecules that manage interaction state (input tracking, toggles, validation, debouncing) are **stateful**.

Present state declarations for confirmation:

```
Analyzing molecules for state requirements...

  JobRow (StatusBadge + DateChip):
    State: NONE — pure composition, all data from props

  SearchBar (Input + Button + SuggestionList):
    State: DECLARED
      - query (string) — current input value, debounced for callbacks
      - isFocused (boolean) — controls suggestion visibility
      - showSuggestions (boolean) — derived from query + isFocused
    Scenarios: empty, typing, results-visible, no-results, error

  FormField (Label + Input + ErrorMessage):
    State: DECLARED
      - isTouched (boolean) — tracks whether user has interacted
      - error (string | null) — validation error message
    Scenarios: pristine, focused, invalid, valid

  ToggleGroup (N × ToggleButton atoms):
    State: DECLARED
      - selectedIndex (number) — currently active toggle
    Scenarios: none-selected, first-selected, last-selected

? Confirm state declarations? [Yes / Adjust / Remove state from specific molecules]
```

**Rules:**
- If a molecule has NO declared state, it is a **pure composition** (`"state": null`).
- If a molecule HAS declared state, it must have at least one **state scenario** beyond "default" for sandbox stories.
- Atoms are NEVER stateful. If a state need is identified at the atom level, promote it to a molecule or move the state to the consuming screen.

Write state declarations into the manifest:
```json
{
  "molecules": [
    {
      "name": "JobRow",
      "file": "src/molecules/JobRow.tsx",
      "story": "src/molecules/JobRow.stories.tsx",
      "status": "pending",
      "atoms": ["StatusBadge", "DateChip"],
      "state": null
    },
    {
      "name": "SearchBar",
      "file": "src/molecules/SearchBar.tsx",
      "story": "src/molecules/SearchBar.stories.tsx",
      "status": "pending",
      "atoms": ["Input", "Button"],
      "state": {
        "declared": [
          { "name": "query", "type": "string", "initial": "''" },
          { "name": "isFocused", "type": "boolean", "initial": "false" },
          { "name": "showSuggestions", "type": "boolean", "initial": "false" }
        ],
        "scenarios": ["empty", "typing", "results-visible", "no-results", "error"]
      }
    }
  ]
}
```

### Step 2: Build Each Molecule

For each molecule, in order:

1. **Load context:**
   - Atom files this molecule composes
   - Project theme file
   - Adapter docs for the chosen tools
   - **If molecule has declared state:** Read `docs/state-patterns.md` for the project's framework. Apply the appropriate state pattern (useState, $state, @State, Entity, Model+Update, etc.)

2. **Write molecule file:**
   - Composes 2-3 atoms — does NOT re-implement atom internals
   - Accepts props that delegate to constituent atoms
   - Uses the same style system and theme tokens as the atoms
   - File location: `src/molecules/MoleculeName.tsx` (or equivalent per framework)

3. **Write story file:**
   - Registered in the project's sandbox (the sandbox adapter defines the format — for `custom`, a registry entry in the target language per `docs/sandbox-spec.md`; for Storybook, CSF3)
   - **Story title MUST use `Molecules/` prefix** (e.g., `title: 'Molecules/JobRow'`)
   - Shows molecule in realistic context with all variant combinations
   - All molecule-level props wired to `argTypes` controls
   - **For stateful molecules:** Includes a named story export for EVERY declared state scenario. Each scenario exercises a specific internal state configuration.

   **State scenario example:**
   ```tsx
   // SearchBar.stories.tsx — stateful molecule with 4 scenarios
   import type { Meta, StoryObj } from '@storybook/react';
   import { userEvent, within } from '@storybook/test';
   import { SearchBar } from './SearchBar';

   const meta: Meta<typeof SearchBar> = {
     title: 'Molecules/SearchBar',
     component: SearchBar,
     parameters: {
       docs: {
         description: {
           component: 'Search input with debounced query and suggestion dropdown.',
         },
       },
     },
     argTypes: {
       placeholder: { control: { type: 'text' } },
       onSearch: { action: 'searched' },
     },
     args: {
       placeholder: 'Search jobs...',
     },
   };

   export default meta;
   type Story = StoryObj<typeof SearchBar>;

   export const Empty: Story = {};

   export const Typing: Story = {
     play: async ({ canvasElement }) => {
       const canvas = within(canvasElement);
       const input = canvas.getByRole('textbox');
       await userEvent.type(input, 'hva');
     },
   };

   export const ResultsVisible: Story = {
     args: {
       initialQuery: 'hvac',
       suggestions: mockSuggestions,
     },
   };

   export const NoResults: Story = {
     args: {
       initialQuery: 'xyz',
       suggestions: [],
     },
   };

   export const Error: Story = {
     args: {
       initialQuery: 'hvac',
       error: 'Search failed. Try again.',
     },
   };
   ```

   For non-React frameworks, follow `docs/state-patterns.md` for the equivalent pattern:
   - **Svelte**: Pass initial values via props; use component args to set up `$state()`.
   - **Bubbletea**: Initialize model instances to target state values.
   - **GPUI**: Create Entity instances with specific initial values.
   - **Textual**: Set `reactive` initial values in story setup.
   - **Ink**: Same as React (Ink uses React hooks).

   **Example:**
   ```tsx
   // JobRow.stories.tsx
   import type { Meta, StoryObj } from '@storybook/react';
   import { JobRow } from './JobRow';

   const meta: Meta<typeof JobRow> = {
     title: 'Molecules/JobRow',
     component: JobRow,
     parameters: {
       docs: {
         description: {
           component: 'Job summary row combining status badge and date chip. Used on feed and list screens.',
         },
       },
     },
     argTypes: {
       status: { control: { type: 'select' }, options: ['open', 'in-progress', 'complete'] },
       date: { control: { type: 'text' } },
       jobTitle: { control: { type: 'text' } },
     },
     args: {
       status: 'open',
       date: 'Today, 9:00 AM',
       jobTitle: 'Annual HVAC Service',
     },
   };

   export default meta;
   type Story = StoryObj<typeof JobRow>;

   export const Default: Story = {};
   export const InProgress: Story = { args: { status: 'in-progress' } };
   export const Complete: Story = { args: { status: 'complete' } };
   ```

4. **Verify:**
   - Molecule renders without errors
   - Constituent atoms are composed (not re-implemented)
   - Registered in the sandbox under the `Molecules/` layer
   - All props wired to argTypes controls

5. **Update manifest:**
   ```json
   {
     "molecules": [
       {
         "name": "JobRow",
         "file": "src/molecules/JobRow.tsx",
         "story": "src/molecules/JobRow.stories.tsx",
         "status": "verified",
         "atoms": ["StatusBadge", "DateChip"]
       }
     ]
   }
   ```

### Progress Tracking

After each molecule:
```
Molecules: 1/2 verified
  [x] JobRow        (atoms: StatusBadge + DateChip)
  [ ] ActionPanel   (atoms: ActionButton + StatusBadge)
```

### Phase 5b Exit Gate

All molecules in the manifest have `status: verified`, AND the styling-contract gate passes for the molecule files (Step 4 gate; `hard-fail` blocks). Update manifest:
```json
{
  "phase": "molecules",
  "gates": {
    "molecules": "passed",
    "molecules_styling_contract": "passed"
  }
}
```

---

## Phase 5c: ORGANISMS

Build complex stateful compositions that combine molecules and atoms into domain-specific UI blocks. An organism is larger than a molecule (may compose multiple molecules + atoms) and always manages its own state, but is not a full screen.

### When to Build Organisms

Build organisms when the spec reveals:
- A **repeated complex UI block** spanning multiple screens (e.g., a DataTable used on 3+ screens, an Accordion FAQ used on 2 pages)
- A composition that **manages significant internal state** (sort/pagination/selection for tables, open/close panels for accordion, multi-step wizard state)
- Something that is **too complex to be a molecule** (composes 4+ atoms or multiple molecules) but **not a full screen** (no routing, no data fetching, no page layout)

If no patterns meet these criteria, skip Phase 5c and proceed to Phase 6. This phase is optional — many projects don't need it.

### Step 1: Identify Organisms

Review molecules, atoms, and the spec for complex compositions that span multiple screens:

```
Analyzing for organism candidates...

Proposed organisms:
  1. DataTable      — Molecule: SearchBar + Atoms: Pagination, TableRow × N
     State: sortColumn, sortDirection, currentPage, selectedRows, filterQuery
     Appears in: AdminDashboard, ReportsView, UserList
  2. CommandPalette  — Atoms: TextInput + SuggestionList + KeyboardHint
     State: isOpen, query, selectedIndex, results
     Appears in: global overlay (app-level)

? Confirm organism list? [Yes / Add more / Remove / Skip organisms entirely]
```

**Organism vs. Screen rule:**
- An organism is **reusable across screens** and manages its own internal state
- A screen is a **top-level view** with routing, layout, and (potentially) data fetching
- When in doubt, if it appears in the page's URL structure, it's a screen. If it's embedded within a screen, it's an organism.

Update manifest with organism list (all `status: pending`):
```json
{
  "organisms": [
    {
      "name": "DataTable",
      "file": "src/organisms/DataTable.tsx",
      "story": "src/organisms/DataTable.stories.tsx",
      "status": "pending",
      "molecules": ["SearchBar"],
      "atoms": ["Pagination", "TableRow"],
      "state": {
        "declared": [
          { "name": "sortColumn", "type": "string | null", "initial": "null" },
          { "name": "sortDirection", "type": "'asc' | 'desc'", "initial": "'asc'" },
          { "name": "currentPage", "type": "number", "initial": "1" },
          { "name": "selectedRows", "type": "Set<string>", "initial": "new Set()" },
          { "name": "filterQuery", "type": "string", "initial": "''" }
        ],
        "scenarios": ["default-sort", "custom-sort", "page-2", "rows-selected", "empty", "filtered"]
      }
    }
  ]
}
```

### Step 2: Build Each Organism

For each organism, in order:

1. **Load context:**
   - Molecule and atom files this organism composes
   - Project theme file
   - Adapter docs for the chosen tools
   - `docs/state-patterns.md` for the project's framework

2. **Write organism file:**
   - Composes molecules and atoms — does NOT re-implement internals
   - Manages declared internal state using the framework-appropriate pattern from `docs/state-patterns.md`
   - Accepts props for configuration and callback events (onSortChange, onRowSelect, etc.)
   - Uses theme tokens and adapter conventions
   - File location: `src/organisms/OrganismName.tsx` (or equivalent per framework)
   - **If an ecosystem library was approved** (the organism has an `ecosystemLibs` entry): install the package and build a wrapper, same pattern as atoms

3. **Write story file:**
   - Registered in the project's sandbox under `Organisms/` layer
   - **Story title MUST use `Organisms/` prefix** (e.g., `title: 'Organisms/DataTable'`)
   - Includes a named story export for EVERY declared state scenario
   - All organism-level props wired to `argTypes` controls
   - Shows realistic data (not minimal stubs)
   - Follow the same state scenario story patterns as Phase 5b molecules

4. **Verify:**
   - Organism renders without errors
   - Constituent molecules/atoms are composed (not re-implemented)
   - Registered in the sandbox under `Organisms/` layer
   - All declared state scenarios have corresponding named story exports
   - All props wired to argTypes controls

5. **Update manifest:**
   ```json
   {
     "organisms": [
       {
         "name": "DataTable",
         "file": "src/organisms/DataTable.tsx",
         "story": "src/organisms/DataTable.stories.tsx",
         "status": "verified",
         "molecules": ["SearchBar"],
         "atoms": ["Pagination", "TableRow"],
         "state": {
           "declared": [
             { "name": "sortColumn", "type": "string | null", "initial": "null" },
             { "name": "sortDirection", "type": "'asc' | 'desc'", "initial": "'asc'" },
             { "name": "currentPage", "type": "number", "initial": "1" },
             { "name": "selectedRows", "type": "Set<string>", "initial": "new Set()" },
             { "name": "filterQuery", "type": "string", "initial": "''" }
           ],
           "scenarios": ["default-sort", "custom-sort", "page-2", "rows-selected", "empty", "filtered"]
         }
       }
     ]
   }
   ```

### Progress Tracking

After each organism:
```
Organisms: 1/2 verified
  [x] DataTable     (molecules: SearchBar, atoms: Pagination + TableRow, state: 5 variables, 6 scenarios)
  [ ] CommandPalette (atoms: TextInput + SuggestionList, state: 4 variables, 3 scenarios)
```

### Phase 5c Exit Gate

All organisms in the manifest have `status: verified` AND all declared state scenarios have corresponding stories, AND the styling-contract gate passes for the organism files (Step 4 gate; `hard-fail` blocks). Update manifest:
```json
{
  "phase": "organisms",
  "gates": {
    "organisms": "passed",
    "organisms_styling_contract": "passed"
  }
}
```

---

## Phase 6: COMPOSE

Assemble atoms, molecules, and organisms into complete screens.

### Step 1: Identify Screens

Screens are keyed by **route**, not by visual state. Multiple state-variants of the same route (default/empty/loading/error, or different tabs of one page) collapse into **ONE screen** that owns internal state and carries a `states` list — each state still renders as its own sandbox story. Build the route map in four steps.

#### Step 1a: Collect candidate views

Gather every candidate view from all available sources:
- The spec/PRD's described screens and information architecture / navigation
- `design/wireframes.json` `screens[]` (if wireframed) — note each wireframe's `## States` annotation (default/empty/loading/error)
- `design/deconstruction.json` `inventory.views[]` (if deconstructed) — these are often **already state-split** into nested folders (`feed/default`, `feed/empty`, `feed/loading`)

#### Step 1b: Assign a route to each candidate

A candidate's **route** is its page identity stripped of state — the dedup key:
- web: the URL path from the spec's IA / nav (`/feed`, `/jobs/:id`, `/settings`)
- mobile: the navigator destination name (`Feed`, `JobDetail`, `Settings`)
- TUI/desktop: the named top-level view/pane (`feed`, `settings`)
- default when underived: web → `"/" + kebab-case(name)`; else `PascalCase(name)`

`feed-empty`, `feed-loading`, `feed-default` (and nested `feed/empty`, `feed/loading`) all map to route `/feed`. `settings-profile`, `settings-billing` all map to `/settings`.

#### Step 1c: Collapse state-only variants into one screen

Group candidates by route. Within each route group, apply the **state-vs-route decision rule** (`docs/state-patterns.md`):
- **Collapse** when the variants share the same data + same URL + instant toggle + shared layout chrome (they differ only by data-state or active tab) → ONE screen whose `states` list is those variants. Infer the state names from what varies (default/empty/loading/error; or the tab names).
- **Do NOT collapse** when two candidates share a route but load different data behind their own fetch boundary, need a distinct URL/deep-link, or can be entered independently — those are separate routes (or one parent + nested routes). A parameterized route (`/jobs/:id`) is one screen; the `:id` is data, not a state. A modal/overlay over a page is a state of that page.
- When **ambiguous**, do not guess — flag it for the confirm gate (Step 1d) and ask the user.

#### Step 1d: Propose the route map and confirm

```
Analyzing requirements for screens...

Proposed screens (grouped by route — state-variants collapsed):

  /feed       → Feed        3 states  [default · empty · loading]
      atoms: StatusBadge, DateChip, SectionHeader   molecules: JobRow
  /jobs/:id   → JobDetail   2 states  [default · loading]
      atoms: StatusBadge, ActionButton, SectionHeader
  /admin      → AdminDashboard  1 state  [default]
      atoms: SectionHeader, ActionButton   organisms: DataTable

  Collapsed 6 candidate views → 3 screens. Each state becomes its own sandbox
  story — no visual coverage is lost.

? Confirm screen list? [Yes / Adjust routes / Split a route / Merge routes / Add / Remove]
```

The options: **Adjust routes** (rename or reassign a candidate's route), **Split a route** (a route collapsed too aggressively — promote a state back to its own screen because it's really a separate page), **Merge routes** (two routes that are really one), plus the usual Add/Remove.

**Force this gate** (don't silently collapse) when EITHER the collapse is **significant** — candidate→screen count drops ≥30%, or any single route absorbs ≥3 candidates — OR a route is **ambiguous** (two candidates share a route but differ in composition, or a route couldn't be confidently derived). For a 1:1 / trivial map, still present it but `--quick` may auto-accept.

#### Step 1e: Record screens

Write the confirmed screens to the manifest (all `status: pending`), each with its `route` and `states` list. Single-state routes carry `states: ["default"]`.

### Step 2: Build Each Screen

For each screen:

1. **Load context:**
   - All atom files this screen composes
   - All molecule files this screen composes (if applicable)
   - All organism files this screen composes (if applicable)
   - Adapter docs
   - Theme file
   - frontend-design spatial composition rules (if available)
   - **Target (fidelity precedence)** — build the screen to match the highest-fidelity reference available: a **deconstruction mockup** (`design/deconstruction.json` → `inventory.views[].html`/`.png`, high-fi) if present; otherwise the screen's **wireframe** (`design/wireframes/{screen}.md`, structural — match its layout/IA/regions). If both exist, the mockup governs pixels while the wireframe still informs structure.

2. **Write screen file:**
   - Composes atoms into a complete layout
   - Uses theme spacing and layout tokens
   - Follows platform conventions (ScrollView for mobile, flex layouts for web, etc.)
   - If frontend-design available: intentional visual hierarchy, considered negative space, eye-flow guidance
   - **If the screen has more than one state** (its `states` list has >1 entry): own the internal state that switches between those states, using the framework's state pattern (`docs/state-patterns.md`). The screen must be **drivable into any listed state** so each renders as its own story — wire whatever override/controlled mechanism the framework and adapter favor (the prop shape, naming, and precedence are your implementation choice; the plan does not prescribe them). In the real app the screen uses its own internal state; the sandbox stories drive it into each named state.

3. **Write screen story:**
   - Registered in the project's sandbox (the sandbox adapter defines the format — for `custom`, a registry entry in the target language per `docs/sandbox-spec.md`; for Storybook, CSF3)
   - **Story title MUST use `Screens/` prefix** (e.g., `title: 'Screens/TodayFeed'`)
   - Realistic mock data
   - **One named story per entry in the screen's `states` list**, each driving the screen into that state — the same convention molecules/organisms use (`docs/storybook-conventions.md`, `docs/sandbox-spec.md`). A single-state screen (`["default"]`) has just a Default story. The example below drives the screen into each state via story args; the exact mechanism is the implementer's/adapter's choice.
   - **Set viewport to match target platform** in story parameters:

   ```tsx
   // TodayFeed.stories.tsx
   import type { Meta, StoryObj } from '@storybook/react';
   import { TodayFeed } from './TodayFeed';

   const meta: Meta<typeof TodayFeed> = {
     title: 'Screens/TodayFeed',
     component: TodayFeed,
     parameters: {
       docs: {
         description: {
           component: 'Main dashboard showing today\'s scheduled jobs with status overview and quick actions.',
         },
       },
       // Match target platform viewport
       viewport: {
         defaultViewport: 'mobile1',  // for mobile projects
       },
       layout: 'fullscreen',
     },
   };

   export default meta;
   type Story = StoryObj<typeof TodayFeed>;

   export const Default: Story = {
     args: {
       jobs: mockJobs,
     },
   };

   export const Empty: Story = {
     args: {
       jobs: [],
     },
   };

   export const Loading: Story = {
     args: {
       isLoading: true,
     },
   };
   ```

   For **web-desktop** projects, use standard desktop viewports. For **mobile** projects (mobile-ios, mobile-android, web-mobile), set viewport to a mobile breakpoint so screens render at realistic dimensions.

4. **Verify:**
   - Screen renders without errors
   - All listed atoms are used correctly
   - Layout responds to viewport changes (if applicable)
   - No hardcoded spacing or colors (uses theme)
   - If a `target` exists for this screen (a deconstruction mockup, or else the wireframe): the layout matches it — structure, spacing rhythm, responsive behavior (and pixels too when the target is a high-fi mockup)

5. **Aesthetic gate** (if frontend-design available):
   - Layout has intentional hierarchy (not uniform spacing)
   - Visual flow guides attention to primary content
   - Negative space is deliberate, not leftover
   - Component arrangement creates rhythm

6. **Update manifest:**
   ```json
   {
"screens": [
    {
      "name": "TodayFeed",
      "route": "/today",
      "states": ["default", "empty", "loading"],
      "file": "src/screens/TodayFeed.tsx",
      "story": "src/screens/TodayFeed.stories.tsx",
      "status": "verified",
      "atoms": ["StatusBadge", "JobCard", "DateChip", "SectionHeader"],
      "molecules": [],
      "organisms": []
    }
  ]
   }
   ```
   `route` is the page identity / dedup key; `states` lists the named states for that route (one sandbox story each). See `docs/state-patterns.md`.

### Phase 6 Exit Gate

All screens have `status: verified`, **and** every screen has one sandbox story per entry in its `states` list (each driving the screen into that state), **and** the styling-contract gate passes across all built component/screen files (Step 4 gate; `hard-fail` blocks). Update manifest:
```json
{
  "phase": "compose",
  "gates": {
    "compose": "passed",
    "compose_styling_contract": "passed"
  }
}
```

---

## Resuming

If BUILD PLAN has not been confirmed (plan gate is `pending`), `/pixel-perfect:build` runs Phase 4b first before resuming any other phase.

Build automatically resumes from the current phase. If you stopped mid-atoms:

```
> /pixel-perfect:build

Resuming from: ATOMS (3/5 verified)
Remaining: SectionHeader, ActionButton

Building SectionHeader...
```

## Building Specific Items

Target a specific component or screen:

```
/pixel-perfect:build --component StatusBadge    # Rebuild one atom
/pixel-perfect:build --screen TodayFeed         # Rebuild one screen
```

This re-generates the specified item while preserving everything else.

## Completion

```
Build complete for {platform}!

  Atoms:    5/5 verified (all controls wired)
  Molecules: verified (if applicable)
  Organisms: verified (if applicable)
  Screens:  2/2 verified

All phases passed for {platform}. Your project has running code with:
  - 5 themed components registered in the sandbox with full controls
  - Functional molecule compositions in the sandbox
  - Complex stateful organisms in the sandbox
  - 2 composed screens at target viewport

To iterate: /pixel-perfect:refine --platform {platform}
To verify:  /pixel-perfect:verify --platform {platform}
To check:   /pixel-perfect:status
```
