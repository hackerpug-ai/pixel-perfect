# Build (Phases 4b-6)

The main orchestration command. Reads requirements, identifies components, builds them as real code, composes them into screens, and wires up navigation and data flow.

## Usage

```
pixel-perfect:build [directory] [options]
```

## Arguments

- `[directory]`: Project directory. Defaults to current directory.

## Options

- `--platform <name>`: Target platform to build (e.g., `mobile-ios`, `web-desktop`). Required when multiple platforms exist. Auto-selected when only one platform is configured.
- `--phase <name>`: Start from a specific phase (atoms, molecules, organisms, compose). Default: resume from current phase.
- `--component <name>`: Build or rebuild a specific component
- `--screen <name>`: Build or rebuild a specific screen

### Resolving free-form input

The invocation input is frequently a bare word rather than a flag — `build molecules`, `build StatusBadge`, `build the feed screen`, `build moleclues`. Resolve it against what the manifest actually holds, in this order: a phase name (`tokens`, `atoms`, `molecules`, `organisms`, `screens`/`compose`), a component name in `atoms`/`molecules`/`organisms`, a screen name or route, a platform name, a directory that exists.

Resolve it silently only on an **exact, unique** match. Anything else — a near-match, a match in two categories, a name that is not in the manifest at all — is asked as **B-arg**, the first thing the turn does. Option 1 is the nearest match with what it would do in the description; options 2–4 are the other plausible readings and the full run. Never treat a misspelling as its nearest neighbour without asking, and never silently widen a narrow request into a full build.

```user_choice
batch: B-arg — what was meant by the input
- header: Target
  question: That input does not match anything in the manifest exactly. Which did you mean?
  options:
    - label: The molecules phase (Recommended)
      description: Closest match to what was typed. Builds every molecule the plan lists that is not yet verified, then stops before organisms, leaving the levels above untouched.
    - label: One named component
      description: Choose Other and give the exact component name. Only that component and its story are rebuilt, and only the screens composing it are re-verified afterward.
    - label: Resume the whole build
      description: Ignores the input and picks up wherever the manifest says the project stopped, running each remaining level bottom-up. This is what a bare pixel-perfect:build does.
```

## Gate Check

**Requires:** `design/manifest.json` with the selected platform's `scaffold: passed`.

Only one platform in the manifest means it is auto-selected and reported as settled. Several platforms with no `--platform` flag means the platform is asked as part of the opening batch, one option per platform carrying its current gate state. A selected platform whose scaffold gate has not passed stops the run and names `pixel-perfect:scaffold --platform {platform}` as the fix.

## How this workflow asks

Every decision below is collected with `USER_CHOICE` — see `workflows/RUNTIME-CONTRACT.md`, "User choice protocol" and "Turn shape". The `user_choice` blocks in this file are the wording and options to use with the harness's question mechanism; they are never printed.

Build analyzes a whole codebase against a whole spec, so it has more to say than a digest holds. **The analysis goes in a file, not in the chat:**

1. Write `design/build-plan.md` — what exists on disk, what the spec demands, the delta per level, and the reasoning behind each SKIP. Advisory only; `design/manifest.json` stays the durable record.
2. Say in twelve lines or fewer what the delta is per level, what the next move is, and name the brief's path.
3. Fire `B-plan` **in the same turn**. Each option stands on its own, so the user can answer without opening the brief.

**No web search, no package install, and no generated file happens before `B-plan` is answered.** The plan is derived from the manifest, the spec, and the files already on disk — all of it cheap. Library research is execution, so it runs after the plan is approved and only for the components that survived it.

| Batch | Phase | Decisions | Fires |
|-------|-------|-----------|-------|
| B-arg | entry | what the free-form input meant | only when the input does not resolve to exactly one thing |
| B-plan | 4b | the level plan · the platform | always. Platform joins it only when several are configured and no `--platform` was passed |
| B-eco | 4b | which complex components take a library | after B-plan, only when the plan left components that match a library pattern and `ecosystemMode` is not `off` |
| B-val | 4b | how to handle a library that failed validation | only when a chosen library fails its install or peer-dependency check |
| B-atoms | 5 | the atom list | only when the plan's atom list changed during B-plan, or the list is being derived rather than read |
| B-mol | 5b | the molecule list · their state declarations | only when MOLECULES is ACTIVE |
| B-org | 5c | the organism list | only when ORGANISMS is ACTIVE |
| B-screens | 6 | the route map | only when the collapse is significant or a route is ambiguous |

Worst case is eight calls across a greenfield multi-platform build with libraries; the common case on a scaffolded single-platform project is two — `B-plan`, then `B-screens`. A level whose list the plan already settled spends no call on re-confirming it.

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

This phase runs automatically when `pixel-perfect:build` is invoked and `plan` is not yet `passed` in the manifest.

**If the project was seeded by `pixel-perfect:design-deconstruct`** (`design/deconstruction.json` exists): the atoms/molecules lists are pre-populated from the deconstruction inventory (atoms→atoms, molecules→molecules), and the screens are the deconstruction views **collapsed by route** — state-split views (`feed/default`, `feed/empty`, …) become ONE screen with a `states` list, not separate screens (see Phase 6 Step 1). Each item carries a `target` mockup (per state for collapsed screens). Treat these as the required set, reconcile against the spec, and confirm the route map with the user as usual.

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

### Step 1: Audit what exists

Read what is already on disk. This is a file listing and a manifest read — no search, no install, no generation.

```
Tokens     design/tokens.ts — 24 colors, 6 type sizes, 8 spacing steps
Atoms      src/components/ — 3 (StatusBadge, JobCard, DateChip)
Molecules  src/molecules/ — none
Screens    src/screens/ — none
```

A missing token file makes Tokens ACTIVE (greenfield token setup). A missing or empty `src/components/` makes Atoms ACTIVE.

### Step 2: Read the spec and compute the delta

Read the requirements document (from `manifest.spec`). For each level, **delta = required by spec − already verified in the codebase**. A level is ACTIVE when its delta is above zero, SKIP when the delta is zero and no lower level is ACTIVE.

**Bottom-up propagation is automatic.** A lower ACTIVE level forces every higher level to be re-evaluated, even when its own delta is zero — changed atoms mean the molecules composing them need re-checking. A level cannot be SKIP while something below it is ACTIVE.

What opens each level:

| Level | Opens when |
|-------|-----------|
| Tokens | No token file; or the spec names new colors, fonts, or a spacing system; or it calls for a new theme variant; or a component-library version change moved the tokens |
| Atoms | Tokens is ACTIVE; or the spec names a UI element absent from the atom inventory; or it describes a new state or variant on an existing atom; or a screen references a component that does not exist |
| Molecules | Atoms is ACTIVE; or the same two-to-three atom combination appears in two or more spec screens; or no molecules exist and the spec's complexity warrants them |
| Organisms | Atoms or Molecules is ACTIVE; or a complex composition of molecules and atoms appears in two or more screens; or a composition manages real internal state (sort, pagination, selection, toggles) |
| Screens | Always, unless every lower level is SKIP and the spec describes no new or changed screens |

Screens are counted by **route**, not by visual state. Views differing only by state — default, empty, loading, error, or the tabs of one page — are one screen carrying a `states` list. Phase 6 Step 1 holds the collapse and the state-vs-route rule.

**Greenfield** (no existing components) skips delta computation: every level is ACTIVE and the plan proposes creating everything the spec describes. **Brownfield** runs the delta per level and proposes only what is missing or changed. Say which mode ran in the digest.

### Step 3: Write the brief, digest it, and confirm the plan

This is the workflow's first turn and it ends on a question.

1. **Write `design/build-plan.md`** — what the audit found, what the spec demands, the per-level delta, and the reasoning behind every SKIP. This is where the analysis lives.
2. **Digest it in twelve lines or fewer**, naming the brief's path:

```
BUILD PLAN — web-desktop · brownfield · design/build-plan.md

  TOKENS     skip    token file matches spec
  ATOMS      build   1 new (ActionButton); 3 already verified
  MOLECULES  build   1 new (JobRow) — triggered by the atoms change
  ORGANISMS  build   1 new (DataTable) — used by 3 screens
  SCREENS    build   2 routes: /today [3 states], /jobs/:id [2 states]

  Next: build ActionButton, then JobRow, then DataTable, then the 2 screens.
```

3. **Fire `B-plan` in the same turn.** When several platforms are configured and no `--platform` was passed, the platform is the batch's second question — one option per platform carrying its gate state, the first with a pending scaffold gate recommended.

```user_choice
batch: B-plan — the build plan
- header: Plan
  question: Proceed with this build plan?
  options:
    - label: Build this plan (Recommended)
      description: Builds every listed item bottom-up — atoms, then the molecules composing them, then organisms, then screens — verifying each level before the next starts. Nothing above a failing level is attempted.
    - label: Change what gets built
      description: Reopens the plan so you can add or remove items at a level, or flip a level between SKIP and BUILD. Choose this when the analysis missed context you have, such as a component you know is already correct.
    - label: Cancel
      description: Exits build without writing anything. The manifest plan gate stays pending, so re-running build later re-derives the plan from whatever the codebase looks like then.
```

**Change what gets built** reopens the plan as a follow-up call scoped to one level at a time: add items, remove items, or flip a level between SKIP and BUILD. **Cancel** exits cleanly with the `plan` gate still `pending` and nothing written.

### Step 4: Write the plan to the manifest

```json
{
  "build_plan": {
    "tokens": "skip",
    "atoms": { "status": "build", "create": ["ActionButton"], "existing_verified": ["StatusBadge", "JobCard", "DateChip"] },
    "molecules": { "status": "build", "create": ["JobRow"] },
    "organisms": { "status": "build", "create": ["DataTable"] },
    "screens": { "status": "build", "create": ["TodayFeed", "JobDetail"] },
    "ecosystemLibs": {}
  },
  "gates": { "plan": "passed" }
}
```

`ecosystemLibs` stays empty until Step 5 fills it.

### Step 5: Ecosystem Scan (component library recommendations)

**This step runs after `B-plan` is answered, never before it.** Searching the web for a library that covers a component the user has not yet agreed to build is work spent on nothing. The plan is approved first; then the surviving list is scanned.

Many UI patterns — tables, calendars, charts, date pickers, command palettes, rich-text editors, drag-and-drop, carousels — have mature libraries that beat rolling your own. This step catches those cases.

#### Scope: only what warrants it

Scan **only** the components the approved plan will actually create, and only those matching a complex-pattern category in `docs/ecosystem-patterns.md`. Skip the rest without comment. Do not scan:

- Simple components where a library costs more than it saves — a badge, a button, a label
- **Domain-specific** components — StatusBadge, JobCard, UserCard are *your product*, not generic UI
- Anything the project's component adapter already provides well (shadcn/ui ships a Data Table on TanStack Table — note the coverage and move on)

If nothing survives that filter, say so in one line and go straight to Phase 5. Most projects land here.

#### Mode

`ecosystemMode` in `design/manifest.json` controls the step. Absent, it defaults to `suggest`.

| `ecosystemMode` | Behavior |
|-----------------|----------|
| `suggest` (default) | Scans and recommends; never blocks. Ignoring every suggestion and building custom is a valid answer. |
| `off` | Skips this step entirely. Output one line and continue to Phase 5. |
| `required` | Blocks Phase 5 until every complex pattern has a resolved choice — a named library or a confirmed custom build. |

Per-category overrides in `manifest.librarySuggestions.categories` apply independently, each `off`, `suggest`, or `required`. A pre-declared entry under `manifest.ecosystemLibs` is honored as-is and re-verified only if older than 30 days.

#### Research

`docs/ecosystem-patterns.md` supplies the Category → Pattern map (19 categories and their historically dominant libraries); `docs/library-vetting-rubric.md` supplies the scoring. The map is a starting point — every match is verified against the current ecosystem before it is offered.

**Reuse cached research first.** If `design/research/libraries/{pattern}.md` exists from a prior `pixel-perfect:research --libraries` run and is under 30 days old, use it and search nothing. Nothing is cached outside the project directory.

**Search tools, in order of availability.** The harness's built-in web search is always present and is sufficient on its own. Jina Reader (`jina_read_url`) deep-reads npm and GitHub pages, Exa (`exa_web_search_exa`) finds current alternatives semantically, and Firecrawl scrapes changelogs — each only when provisioned. Check what the harness exposes; never assume a tool exists.

For each surviving match: confirm the pattern's dominant library is still current (`best {framework} {pattern} library 2026`), then check four objective signals — GitHub stars, npm weekly downloads, last release date, and rating. These feed the rubric (`maintenance` ← last release, `popularity` ← stars + downloads, `community` ← rating + stars). A library with no release in over 12 months is flagged and its alternatives searched. Prefer libraries that are actively maintained (released within 6 months), well-adopted, framework-native, and compatible with the project's component adapter. Score ≥5/8 to be recommendable.

#### Present and ask

Report only the components with a match, at one line each plus their candidates:

```
ECOSYSTEM SCAN — 2 of 5 components matched a library pattern

  DataTable       → TanStack Table (@tanstack/react-table)  8/8   headless; shadcn ships a wrapper
                    AG Grid (ag-grid-react)                 7/8   ~200KB gzipped; enterprise tier is paid
  DateRangePicker → react-day-picker                        7/8   skip if <input type="date"> is enough

  Full scores in design/build-plan.md.
```

Then ask, naming the actual libraries and scores:

```user_choice
batch: B-eco — the ecosystem libraries
- header: Libraries
  question: Two components would be better served by an existing library than by building from scratch. How should they be handled?
  options:
    - label: Use both libraries (Recommended)
      description: Installs AG Grid and react-day-picker and wraps each as a project component, so your code still owns the API. Both scored 7 of 8 on the vetting rubric; the manifest records the dependency and the score.
    - label: Build them from scratch
      description: Implements both by hand against the style system. No dependency and total control, at the cost of writing the keyboard handling, virtualization, and accessibility these libraries already solved.
    - label: Pick per component
      description: Choose Other and say which to take as a library and which to build. Common when a date picker is simple enough to hand-roll but a data grid is not.
    - label: Use different libraries
      description: Choose Other and name the packages you prefer. Each is put through the same vetting rubric before it is installed, and rejected if it fails.
```

The answer is final. A library choice means the component is still built — as a wrapper owning the project's API, theme tokens, and adapter conventions, with the library as an implementation detail rather than a leaky abstraction. A custom choice proceeds as a normal build with no ecosystem entry. A different library is recorded with `"userChoice": true` and a note naming the top recommendation.

Record each accepted library on its component in `build_plan.{level}.ecosystemLibs`:

```json
{
  "DataTable": {
    "package": "@tanstack/react-table",
    "version": "^8.x",
    "purpose": "Headless table logic (sorting, filtering, pagination)",
    "vetting": {
      "maintenance": "PASS", "popularity": "STRONG", "compatibility": "PASS", "bundleSize": "SMALL",
      "accessibility": "YES", "license": "COMPATIBLE", "tests": "HIGH", "community": "ACTIVE",
      "score": "8/8", "researchDate": "2026-06-04"
    },
    "tradeoffs": "Headless — requires UI wrapper. shadcn/ui provides a built-in wrapper."
  }
}
```

### Step 6: Validate accepted libraries

For each library the user accepted: confirm the package resolves (`npm view {package}@{version}`, or the project's package manager equivalent), check its peer dependencies against `package.json` for a version clash, and install it and verify the import resolves.

Report validation as one line per library. On failure, name the conflict and ask:

```
  ✗ DataTable → @tanstack/react-table@^8.20.0 — peer dependency conflict
      requires react@^18.0.0 · project has react@^19.0.0
```

```user_choice
batch: B-val — the failed validation
- header: Conflict
  question: This library declares a peer dependency your project does not satisfy. How should it be handled?
  options:
    - label: Use the next-best library (Recommended)
      description: Installs the runner-up from the vetting rubric instead, which validates cleanly against your React version. Slightly lower score, but no version conflict to manage.
    - label: Accept the conflict
      description: Installs it anyway. Peer-dependency warnings are often harmless across a single major version, but nothing here can prove it works — you would be verifying that yourself at build time.
    - label: Build it from scratch
      description: Implements the component by hand against the style system. No dependency and no conflict, at the cost of writing behavior the library already solved.
```

### Resuming the build

After the plan gate passes, build runs the ACTIVE levels bottom-up — Tokens, Atoms, Molecules, Organisms, Screens — skipping the rest. A build re-entered later reads the plan from the manifest and picks up at the first unfinished item. Report the level and the count, then continue:

```
Resuming: ATOMS 0/1 — building ActionButton. Then JobRow, DataTable, 2 screens.
```

Do not re-derive or re-present the plan the manifest already holds.

### Phase 4b Exit Gate

BUILD PLAN is confirmed by the user. Manifest has `"plan": "passed"`. Subsequent build phases execute only ACTIVE levels from the plan.

---

## Phase 5: ATOMS

Build individual, reusable components.

### Step 1: Identify Components

**The approved plan already carries the atom list.** When `build_plan.atoms.create` came through `B-plan` unchanged, that list is settled — report it in one line and start building. Do not re-confirm a list the user just approved.

Fire `B-atoms` only when the list is genuinely open: the user chose "Change what gets built" at the plan gate, or the atoms are being derived here for the first time because the plan was seeded without them.

```
ATOMS 0/5 — StatusBadge, JobCard, DateChip, SectionHeader, ActionButton. Building StatusBadge.
```

```user_choice
batch: B-atoms — the atom list
- header: Atoms
  question: Build these five atoms?
  options:
    - label: Build all five (Recommended)
      description: Each becomes one component and one sandbox story, built and verified in order. Everything above this level composes these five, so adding one later means re-verifying whatever already uses it.
    - label: Change the list
      description: Choose Other and name the atoms to add or drop. Worth doing now: an atom missing here surfaces as a gap during the molecule phase, which is a more expensive place to discover it.
```

Update manifest with the component list (all `status: pending`).

### Step 2: Build Each Atom

For each component, in order:

1. **Load context:**

   Resolve every adapter from the manifest by field — do not infer which file to read. Same table `scaffold` uses:

   | Manifest field | Adapter to load |
   |----------------|-----------------|
   | `platforms[platform].tools.framework` | `docs/adapters/{framework}.md` (optional — load only if it exists; React/Next/Vite have none, which is expected) |
   | `platforms[platform].tools.style` | `docs/adapters/{style}.md` |
   | `platforms[platform].tools.components` | `docs/adapters/{components}.md` — defines the composition patterns for the chosen component library |
   | `platforms[platform].tools.sandbox` | `docs/adapters/{sandbox}.md` |

   The framework adapter defines the component file extension and story format. If no adapter exists for a style, components, or sandbox tool, load `docs/adapters/generic.md`.

   - **Styling contract** for this platform's style system (`manifest.platforms[platform].tools.style_contract`). Load `docs/styling-contracts/{id}.md` when `style_contract_source` is `builtin`/`manual`, or `design/research/styling/{id}.md` when `researched`. This is a **hard constraint** on how styles are emitted (Step 1b) — not optional guidance. If `style_contract_source: "none"`, no contract is loaded (styles are unenforced; flag this to the user).
   - **Component contract** for this platform's component library (`manifest.platforms[platform].tools.component_contract`). Load `docs/component-contracts/{id}.md` when `component_contract_source` is `builtin`/`manual`, or `design/research/libraries/{id}.md` when `researched`. This is a **hard constraint** on what the component is built on (Step 1c) — not optional guidance. If `component_contract_source` is `"none"` or absent, **no contract is loaded and nothing is printed** — a project with no component library is a normal project, and Step 1c and its gate are skipped entirely.
   - Project theme file
   - The bundled design contract (`docs/DESIGN-CONTRACT.md`) and the result of `DESIGN_EXECUTE` for this atom
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

The styling contract governs the **styling mechanism**. What the component is *built on* is governed by the component contract — Step 1c. Both apply, and neither can catch the other's failure.

### Step 1c: Apply Component Contract

**Skip this step entirely when `component_contract_source` is `"none"` or absent.** No contract, no constraint, no output. Building every primitive by hand is the correct behavior for a project with no component library.

Otherwise: read the loaded component contract and treat it as a **hard constraint**, not a suggestion. This is what prevents the drift where a build declares a component library, lets `scaffold` install it, and then hand-rolls every primitive anyway — emitting correct-looking styled code that composes none of the library. That drift passes every styling contract, because styled-but-hand-rolled markup is still correctly styled.

**If a contract should apply but failed to load** (`tools.components` names a library but no `component_contract` is recorded, or the contract file is missing/malformed): STOP and report to the user — do not build the component against an unknown composition basis. Re-run the EQUIP "Resolve Component Contract" step (built-in / research / manual) or proceed only if the user explicitly set `component_contract_enforcement: "off"`.

From the contract, you MUST:
- **Compose the library's primitive** for anything in its inventory. A `vendored` library was copied into the repo by the CLI at scaffold time — those files are the project's primitive layer, already wired to the theme, to variants, and to accessibility. A `package` library is imported from `importRoot`. Either way the library's component is the basis; your atom configures it.
- **Check what scaffold actually installed** before deciding something is unavailable. `manifest.platforms[platform].scaffold.components[]` is the inventory the CLI pulled. If the primitive you need is missing from it, pull it with the library's CLI rather than hand-rolling a replacement.

You MUST NOT:
- **Re-implement a primitive the library already provides.** Importing `Pressable` and `Text` from `react-native` to build a button, when `components/ui/button.tsx` is sitting in the tree, is the exact defect this contract exists to stop. These are blocking — Step 4's gate fails the layer on any.
- **Translate a mockup's DOM structure straight into framework primitives.** A design reference tells you what the component must *look like*; it does not tell you what to build it *on*. Read the target for its visual contract, then express that contract by configuring the library's component — the two are not in tension, and a faithful rebuild on the library's primitive is the deliverable.

The contract's `Free primitives` section is as binding as its ban list: layout and platform primitives (`View`, `ScrollView`, `<div>`, `<span>`) are always yours to use directly. A genuine exception to the ban list is recorded in `tools.component_contract_overrides` as `{ComponentName: "reason"}` — a decision on the record, not an invisible default.

### Step 2: Build Each Atom (continued)

2. **Write component file:**
   - Real component code (`.tsx`, `.vue`, `.svelte`, etc.)
   - **Emits styles exactly per the styling contract (Step 1b)** — emit method, file placement, token binding, and no forbidden patterns
   - **Composes the component library exactly per the component contract (Step 1c)** — the library's primitive is the basis; this component configures it rather than re-deriving it. Skip when no component contract is in force.
   - Uses theme tokens (not hardcoded values)
   - Follows the composition patterns in `docs/adapters/{components}.md`
   - Applies the `DESIGN_EXECUTE` decisions for distinctive typography, intentional color hierarchy, and considered motion
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
   - **Component contract gate** — skip entirely when `component_contract_source` is `"none"`/absent or `component_contract_enforcement: "off"`. Otherwise run the **same script** against the component contract:
     `node {plugin}/scripts/verify-styling-contract.mjs <component-contract.md> <project-root> [--allow GLOB ...]`
     where `<component-contract.md>` is the resolved component-contract path. The `<project-root>` rule is identical — pass the project root, never `src/`, or the globs match nothing and the run fails as a vacuous scan. Pass one `--allow <glob>` per active override in `tools.component_contract_overrides`. Exit codes and handling match the styling gate exactly (`1` = violations, `2` = contract/usage error, `3` = vacuous scan — all blocking):
     - `hard-fail` (default): **block this atom** — print the violations (file, pattern, rationale) and rebuild the component on the library's primitive before continuing. Do NOT mark the atom verified.
     - `warn`: print the violations and continue (the atom is still verified).
     - The two gates are independent and both must pass. A styling-contract pass says nothing about composition: hand-rolled markup with correct utility classes satisfies every styling contract in the repo. This is the gate that would have caught a component library declared, installed, and then ignored.
   - If a deconstruction `target` exists for this atom: the rendered component matches the mockup's structure, tokens, and states (the literal pixel-perfect goal)

5. **Aesthetic gate** (always active through the bundled design contract):
   - Component uses the project font pairing
   - Color usage follows the vibe's hierarchy (not arbitrary)
   - Interactive components have intentional motion (not default browser transitions)
   - Spacing uses the theme scale

6. **Update manifest** (decisions and receipts only — no authored composition-edge arrays, no `controls` authority field; controls coverage comes from catalog capture):
   ```json
   {
     "atoms": [
       {
         "name": "StatusBadge",
         "file": "src/components/StatusBadge.tsx",
         "story": "src/components/StatusBadge.stories.tsx",
         "status": "verified"
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

One line after each atom — the count, and what is next. Not a re-listing of what is already done.

```
Atoms 3/5 — StatusBadge, JobCard, DateChip verified. Building SectionHeader.
```

### Phase 5 Exit Gate

All atoms in the manifest have `status: verified`, both contract gates pass for the atom files (or the corresponding enforcement is `"off"`/`"warn"`, or no contract of that kind is in force), **and catalog capture is green**. Controls coverage is derived from the capture (props/variants present in the structural artifact), not a stored `controls: true` field.

**Catalog capture gate (deterministic):**
```
node {plugin}/scripts/verify-catalog.mjs --baseline <project-root> --platform {platform} --layer atoms
```
Writes goldens under `design/goldens/{platform}/atoms/…`. Record `atoms_capture: "passed"` beside the contract gate keys.

**Composition mutation check** (replaces the "composed, not re-implemented" LLM judgment): for any atom that molecules claim to compose, run
```
node {plugin}/scripts/verify-catalog.mjs --blast <AtomName> <project-root> --platform {platform}
```
Every declared dependent must appear in `moved`. A dependent that does not move is a copy, not a composition — rebuild it to compose the atom before the layer gate opens.

Update manifest:
```json
{
  "phase": "atoms",
  "gates": {
    "plan": "passed",
    "atoms": "passed",
    "atoms_styling_contract": "passed",
    "atoms_component_contract": "passed",
    "atoms_capture": "passed"
  },
  "capture": {
    "command": "npm run sandbox:capture",
    "medium": "dom+png",
    "goldens": "design/goldens/{platform}",
    "captured_at": "<ISO-8601>"
  }
}
```

Record `atoms_component_contract: "n/a"` when `component_contract_source` is `"none"`/absent — the key is always written so a later reader can tell "no library" apart from "gate skipped".

> **Both contract gates (Step 4) run for every layer.** Molecules (5b), organisms (5c), and compose (6) each load the same two contracts (their Step 1), apply them (Steps 1b and 1c), and run the same `verify-styling-contract.mjs` gate against each before their exit gate opens. Each layer records `{layer}_styling_contract` and `{layer}_component_contract`. When enforcement is `hard-fail` (default), a layer whose emitted files violate either contract is **blocked** until fixed or a per-component override is recorded in `tools.style_contract_overrides` / `tools.component_contract_overrides`.
>
> The two catch different failures and neither substitutes for the other. The styling gate would have caught a parallel global-CSS system before it shipped. The component gate would have caught a component library that was chosen, installed, and then never composed — 18 atoms built from raw framework primitives while the vendored library sat unused in the same tree, every styling check green.

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

Review the verified atoms and the spec for repeated atom groupings, then digest the candidates with the screens that justify each one:

```
Proposed molecules
  JobRow       StatusBadge + DateChip     — TodayFeed, JobList, SearchResults
  ActionPanel  ActionButton + StatusBadge — JobDetail, QuickActions
```

The molecule list and its state declarations are one call — the state answer only makes sense against the list it describes:

```user_choice
batch: B-mol — the molecules and their state
- header: Molecules
  question: Build these two molecules?
  options:
    - label: Build both (Recommended)
      description: Each becomes one component and one sandbox story composed from atoms already verified. Both appear on more than one screen, which is what makes them worth extracting rather than inlining.
    - label: Change the list
      description: Choose Other and name the molecules to add or drop. A grouping that appears on only one screen is often better left inside that screen than extracted.
    - label: Skip molecules entirely
      description: Screens compose atoms directly with no intermediate layer. Simpler for a small app; repeated atom groupings then get duplicated across screens rather than shared.
- header: State
  question: Are these state declarations right?
  options:
    - label: Yes, as declared (Recommended)
      description: Each stateful molecule gets a sandbox story per scenario, so empty, error, and loading are all previewable. Pure compositions with no state get a single default story.
    - label: Adjust them
      description: Choose Other and say which molecules should gain or lose state. Remember that atoms are never stateful — a state need at the atom level moves up to a molecule or to the screen.
```

Update manifest with the molecule list (all `status: pending`).

#### Step 1b: Declare Molecule State

For each proposed molecule, identify whether it needs internal state. Molecules that only compose atoms visually (layout + prop delegation) are **stateless**. Molecules that manage interaction state (input tracking, toggles, validation, debouncing) are **stateful**.

Digest the declarations as one line per molecule — its state variables and the scenarios they produce. A stateless molecule is one word.

```
  JobRow     none — pure composition, all data from props
  SearchBar  query · isFocused · showSuggestions  → empty, typing, results-visible, no-results, error
  FormField  isTouched · error                    → pristine, focused, invalid, valid
```

The state answer is the second question of the `B-mol` batch — it is not asked separately.

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
   - **Adapter docs for the chosen tools**, resolved by manifest field per the table in Phase 5 Step 1 — including `docs/adapters/{components}.md` for `tools.components`
   - **Styling contract and component contract** — the same two resolved in Phase 5 Step 1 (`tools.style_contract`, `tools.component_contract`). Both remain hard constraints at this layer: apply them per Steps 1b and 1c, and both gates run at Step 4. A component contract that is `"none"`/absent stays silent here too.
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
   - **Both contract gates** pass for the molecule files — same script, same invocation, same exit-code handling as Phase 5 Step 4. The component gate is skipped when no component contract is in force.

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

One line after each molecule — the count, and what is next.
```
Molecules 1/2 — JobRow verified. Building ActionPanel (ActionButton + StatusBadge).
```

### Phase 5b Exit Gate

All molecules in the manifest have `status: verified`, both contract gates pass for the molecule files (Step 4 gates; `hard-fail` blocks), **and catalog capture is green**. Composition is proved by the mutation check (`--blast` each composed atom; dependents must move) — not by authored `molecules[].atoms` arrays.

```
node {plugin}/scripts/verify-catalog.mjs --baseline <project-root> --platform {platform} --layer molecules
```

Update manifest:
```json
{
  "phase": "molecules",
  "gates": {
    "molecules": "passed",
    "molecules_styling_contract": "passed",
    "molecules_component_contract": "passed",
    "molecules_capture": "passed"
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

Review molecules, atoms, and the spec for complex compositions spanning multiple screens. Digest each candidate as one line — what it composes, what state it owns, and where it is reused:

```
Proposed organisms
  DataTable       SearchBar + Pagination + TableRow  · sort, page, selection, filter
                  → AdminDashboard, ReportsView, UserList
  CommandPalette  TextInput + SuggestionList + KeyboardHint · isOpen, query, selection
                  → global overlay
```

```user_choice
batch: B-org — the organism list
- header: Organisms
  question: Build these two organisms?
  options:
    - label: Build both (Recommended)
      description: Each becomes one stateful component reused across the screens listed above, with a sandbox story per state scenario. Building them once here is what keeps three screens from each growing their own copy.
    - label: Change the list
      description: Choose Other and name the organisms to add or drop. The test is reuse: something appearing on only one screen usually belongs inside that screen rather than extracted.
    - label: Skip organisms entirely
      description: Screens compose molecules and atoms directly with no organism layer. Simpler when screens share little; complex stateful compositions then get duplicated per screen.
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
   - **Adapter docs for the chosen tools**, resolved by manifest field per the table in Phase 5 Step 1 — including `docs/adapters/{components}.md` for `tools.components`
   - **Styling contract and component contract** — the same two resolved in Phase 5 Step 1 (`tools.style_contract`, `tools.component_contract`). Both remain hard constraints at this layer: apply them per Steps 1b and 1c, and both gates run at Step 4. A component contract that is `"none"`/absent stays silent here too.
   - `docs/state-patterns.md` for the project's framework

2. **Write organism file:**
   - Composes molecules and atoms — does NOT re-implement internals
   - Manages declared internal state using the framework-appropriate pattern from `docs/state-patterns.md`
   - Accepts props for configuration and callback events (onSortChange, onRowSelect, etc.)
   - Uses theme tokens, and composes the component library per the component contract (Step 1c) rather than re-deriving its primitives
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
   - **Both contract gates** pass for the organism files — same script, same invocation, same exit-code handling as Phase 5 Step 4. The component gate is skipped when no component contract is in force.
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

One line after each organism — the count, and what is next.
```
Organisms 1/2 — DataTable verified (6 state scenarios). Building CommandPalette.
```

### Phase 5c Exit Gate

All organisms in the manifest have `status: verified` AND all declared state scenarios have corresponding stories, AND both contract gates pass for the organism files (Step 4 gates; `hard-fail` blocks), **and catalog capture is green** (`organisms_capture`).

```
node {plugin}/scripts/verify-catalog.mjs --baseline <project-root> --platform {platform} --layer organisms
```

Update manifest:
```json
{
  "phase": "organisms",
  "gates": {
    "organisms": "passed",
    "organisms_styling_contract": "passed",
    "organisms_component_contract": "passed",
    "organisms_capture": "passed"
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

One line per route — the route, its screen, and its states. The components each screen composes go in `design/build-plan.md`, not the digest.

```
Route map — 6 candidate views → 3 screens

  /feed      Feed            default · empty · loading
  /jobs/:id  JobDetail       default · loading
  /admin     AdminDashboard  default

  Every state still gets its own sandbox story; no visual coverage is lost.
```

```user_choice
batch: B-screens — the route map
- header: Screens
  question: Build these three screens, with state variants collapsed into one screen per route?
  options:
    - label: Build these three (Recommended)
      description: Six candidate views collapse to three routes, and every state still gets its own sandbox story, so no visual coverage is lost. Each screen composes only components already verified below it.
    - label: Split a route apart
      description: One route was collapsed too aggressively and a state is really its own page. Choose Other and name it; it is promoted back to a screen with its own route and its own gate.
    - label: Merge two routes
      description: Two routes are really one page in different states. Choose Other and name them; they collapse into a single screen whose states list covers both.
    - label: Change the list
      description: Choose Other and name the screens to add, drop, or re-route. Worth getting right now — the route map is what every later phase organizes verification around.
```

The middle options exist because collapsing is a judgment call: **Split a route** promotes a state back to its own screen when it is really a separate page, and **Merge routes** folds two routes that are really one.

**Force this gate** (don't silently collapse) when EITHER the collapse is **significant** — candidate→screen count drops ≥30%, or any single route absorbs ≥3 candidates — OR a route is **ambiguous** (two candidates share a route but differ in composition, or a route couldn't be confidently derived). For a 1:1 / trivial map, still present it but `--quick` may auto-accept.

#### Step 1e: Record screens

Write the confirmed screens to the manifest (all `status: pending`), each with its `route` and `states` list. Single-state routes carry `states: ["default"]`.

### Step 2: Build Each Screen

For each screen:

1. **Load context:**
   - All atom files this screen composes
   - All molecule files this screen composes (if applicable)
   - All organism files this screen composes (if applicable)
   - **Adapter docs for the chosen tools**, resolved by manifest field per the table in Phase 5 Step 1 — including `docs/adapters/{components}.md` for `tools.components`
   - **Styling contract and component contract** — the same two resolved in Phase 5 Step 1 (`tools.style_contract`, `tools.component_contract`). Both remain hard constraints at this layer: apply them per Steps 1b and 1c, and both gates run at Step 4. A component contract that is `"none"`/absent stays silent here too.
   - Theme file
   - The bundled design contract and the result of `DESIGN_EXECUTE` for this screen
   - **Target (fidelity precedence)** — build the screen to match the highest-fidelity reference available: a **deconstruction mockup** (`design/deconstruction.json` → `inventory.views[].html`/`.png`, high-fi) if present; otherwise the screen's **wireframe** (`design/wireframes/{screen}.md`, structural — match its layout/IA/regions). If both exist, the mockup governs pixels while the wireframe still informs structure.

2. **Write screen file:**
   - Composes atoms into a complete layout
   - Uses theme spacing and layout tokens
   - Follows platform conventions (ScrollView for mobile, flex layouts for web, etc.)
   - Applies the `DESIGN_EXECUTE` decisions for intentional visual hierarchy, considered negative space, and eye-flow guidance
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
   - **Both contract gates** pass across the built component/screen files — same script, same invocation, same exit-code handling as Phase 5 Step 4. The component gate is skipped when no component contract is in force.
   - If a `target` exists for this screen (a deconstruction mockup, or else the wireframe): the layout matches it — structure, spacing rhythm, responsive behavior (and pixels too when the target is a high-fi mockup)

5. **Aesthetic gate** (always active through the bundled design contract):
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

All screens have `status: verified`, **and** every screen has one sandbox story per entry in its `states` list (each driving the screen into that state), **and** both contract gates pass across all built component/screen files (Step 4 gates; `hard-fail` blocks), **and catalog capture is green** (`compose_capture` / screens layer).

```
node {plugin}/scripts/verify-catalog.mjs --baseline <project-root> --platform {platform} --layer screens
```

Do not author `screens[].atoms` / `screens[].molecules` / `screens[].organisms` composition edges as authority — blast/reach from capture is the dependency oracle. Optional inventory hints may remain for human readability but are never the gate.

Update manifest:
```json
{
  "phase": "compose",
  "gates": {
    "compose": "passed",
    "compose_styling_contract": "passed",
    "compose_component_contract": "passed",
    "compose_capture": "passed"
  }
}
```

---

## Resuming

If BUILD PLAN has not been confirmed (plan gate is `pending`), `pixel-perfect:build` runs Phase 4b first before resuming any other phase.

Otherwise build resumes from the current phase in one line and keeps going. It does not re-audit the codebase, re-read the spec, or re-present a plan the manifest already holds.

```
Resuming: ATOMS 3/5 — building SectionHeader, then ActionButton.
```

## Building Specific Items

Target a specific component or screen:

```
pixel-perfect:build --component StatusBadge    # Rebuild one atom
pixel-perfect:build --screen TodayFeed         # Rebuild one screen
```

This re-generates the specified item while preserving everything else.

## Completion

Report the counts and the next command. Omit any level the plan skipped.

```
Build complete — {platform}

  Atoms 5/5 · Molecules 2/2 · Organisms 1/1 · Screens 2/2 (5 state stories)
  All registered in the sandbox with controls wired.

  Next: pixel-perfect:verify --platform {platform}
        pixel-perfect:refine --platform {platform} to iterate
```
