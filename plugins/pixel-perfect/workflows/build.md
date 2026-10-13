# Build (Phases 4b-6)

The main orchestration command. Reads requirements, identifies components, builds them as real code, composes them into screens, and wires up navigation and data flow.

## Pending refresh work

Before phase selection or rerendering active references, run `refresh-run.mjs status <project>` when `design/refresh/` exists. An accepted unfinished run controls its selected scope, including previously completed items it reopened. The accepted refresh plan replaces B-inv, B-plan, and per-layer inventory confirmations for this scope; do not repeat those decisions. Read `docs/REFRESH-CONTRACT.md`; implement additions/extensions from that worklist and return their evidence to the run. Preserve unrelated progress and platform configuration. Visual updates use the shared refinement path. Historical phase passes cannot complete current refresh work. For projects with refresh receipts, use the refresh helper's current rendered-revision result for freshness; a render-neutral entry-file edit must not trigger another inventory confirmation based only on its raw hash. Updated exports requiring reassessment route to `evolve --refresh`, rather than overwriting active references through Phase 4a.

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
| B-inv | 4a | the design inventory — every frame claimed, every component and screen×state to make | only when the manifest lists design references and `design/inventory.json` is missing or a reference changed |
| B-plan | 4b | the level plan · the platform | always. Platform joins it only when several are configured and no `--platform` was passed |
| B-eco | 4b | which complex components take a library | after B-plan, only when the plan left components that match a library pattern and `ecosystemMode` is not `off` |
| B-val | 4b | how to handle a library that failed validation | only when a chosen library fails its install or peer-dependency check |
| B-atoms | 5 | the atom list | only when the plan's atom list changed during B-plan, or the list is being derived rather than read |
| B-mol | 5b | the molecule list · their state declarations | only when MOLECULES is ACTIVE |
| B-org | 5c | the organism list | only when ORGANISMS is ACTIVE |
| B-screens | 6 | the route map | only when the collapse is significant or a route is ambiguous |
| B-item | 5, 5b, 5c, 6 | the item the designer could not finish | only after two re-assignments fail, or after a blocker the orchestrator cannot clear |

Worst case is nine calls across a greenfield multi-platform build with designs and libraries, plus one `B-item` call for each item the designer cannot finish; the common case on a scaffolded single-platform project is two — `B-plan`, then `B-screens` — or three with designs, `B-inv` first. A level whose list the plan already settled spends no call on re-confirming it, and a project with a confirmed inventory never fires `B-atoms`, `B-mol`, or `B-org` at all.

## Overview

Build progresses through an analysis phase followed by adaptive build phases. Each phase has entry/exit gates and tracks progress in the manifest.

```
Phase 4a: INVENTORY → Render every design reference to frames; ONE whole-design read; coverage gate; confirm
Phase 4b: PLAN      → Analyze inventory + spec + codebase; produce level-tagged work plan; confirm with user
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

## Phase 4a: DESIGN INVENTORY

Read every design the project has, once, before anything is planned — and come back with the list of real components and screen states to make, each tied to the rendered frame that justifies it. This phase exists because deriving component lists per layer from the spec's prose undercounts: it misses what the prose never named (a mobile tab bar that replaces the desktop rail, a row's overflow menu, a sign-in form drawn once) and it leaves organisms scattered across documents. One read, one confirmation, and every later phase dispatches from a settled list.

**Runs when** `manifest.references` names at least one design source — an HTML deck, a URL, a screenshot, a `design/wireframes/` directory — and either `design/inventory.json` does not exist or a listed source's content hash differs from the one recorded in `manifest.inventory.sources[]`. **Skipped** silently when the project has no design references. **Skipped** in one line when the inventory is current: `Inventory current — 32 frames · 11 atoms · 13 molecules · 3 organisms · 5 screens (confirmed 2026-08-30)`.

The inventory is never HTML and never a mockup. The frames it points at are the pixel-targets the real components are built to match; the inventory is the index that says which target belongs to which component. `design/` here means the directory holding `design/manifest.json`.

**Steps 1–3 are the shared design analysis** (`docs/DESIGN-ANALYSIS.md`), run with build's parameters: `SOURCES` = `manifest.references` (all own), `OUT` = `design/`, `PRIOR` = `design/inventory.json` when re-running, no notes, no aesthetic lens. `pixel-perfect:assimilate` and `evolve` run the same procedure, so an inventory reads the same however it was made. Step 4 — the confirmation and the receipt — is build's own.

### Step 1: Render the references to frames (deterministic)

```
node {plugin}/scripts/render-frames.mjs <ref>… --out design/reference [--frame-selector <css>]
```

One PNG per drawn frame, cropped from the rendered source, plus `design/reference/frames.json` (ids `{source-slug}/{NN}`, labels, viewports, a content hash per source). Sources are loaded **in place** — a deck that pulls in sibling partials at runtime keeps working. `--frame-selector` names the source's frame wrapper; the default `auto` tries `.fr` (the Claude Design frame class), then `[data-screen-label]` sections (how Claude Design marks the sections of a long page; the attribute becomes the frame label), then the top-most bordered boxes of screen size (how Claude Design canvases draw their screens — the live DOM re-serializes inline colors, so an authored-style selector never matches), and only then falls back to one full-page frame while saying so — a full-page fallback on a multi-screen deck means the selector needs setting, not accepting. Every deck also gets one **full-page frame per width and theme** (`full · 1440 · default`, `full · 390 · dark`, …; `state` carries the theme): at `--width` and `--mobile-width`, and in dark when the deck styles `[data-theme="dark"]` — so a sticky header or unbordered hero outside every selected frame, the phone layout, and the dark theme all reach the inventory. A full page records the image's real size; a page wider than a phone is zoomed out to fit, as on a real phone. Exit `1` (a blank render — the deck did not settle) or `2` (no Chrome, an unreadable reference) stops the phase with the script's diagnosis; never proceed on a partial render. A URL renders at desktop and mobile widths; an image is its own frame; a wireframes directory contributes text, not frames.

`design/reference/` is committed — the frames are the targets the rest of the build refers to.

### Step 2: One whole-design read (probabilistic)

`DESIGN_EXECUTE` with `docs/INVENTORY-CONTRACT.md` (`<<CALLER>>` and `<<ANALYSIS_EXTRAS>>` as `docs/DESIGN-ANALYSIS.md` Step 2 gives them for build), substituting: the frames index and every frame image, the source files, `manifest.spec`, the platform's existing atoms/molecules/organisms/screens (names are reused, never re-invented), `scaffold.components[]` (library primitives are recorded, not re-created), and the prior `design/inventory.json` when re-running. **One dispatch, to the packaged designer with slug `inventory-read`, on the session's model** — do not split the read per source; cross-source compositions are what a split loses. The designer returns `design/inventory.json` (`docs/inventory.schema.json`).

**Adopted components.** Before the gate, add each component in `manifest.assimilations[].adopted.components` that the read did not return — in the layer its receipt records, with `undrawn: "adopted from inspiration — assimilation <run>"` and the receipt's `evidence` — so what the user adopted through `pixel-perfect:assimilate` is planned and built like everything else.

### Step 3: Gate (deterministic)

```
node {plugin}/scripts/verify-inventory.mjs design/inventory.json --frames design/reference/frames.json
```

Every rendered frame is claimed — by a screen state or by a component's `appears_on` — or listed as unclaimed with a reason; every `composes` name exists one layer down or lower; every screen state and every component has a frame or an `undrawn` reason; names are unique. Exit `1` → re-dispatch the read with the printed violations (cap 2, then stop and surface to the user); `2` → the returned JSON is malformed, re-dispatch once with the shape errors; `3` → nothing was looked at, treat as a failed render.

### Step 4: Write the brief, digest it, and confirm

Write `design/inventory.md` — the human view: frames per source, the route map with states and their frames, each layer's list with what it composes and where it appears, the unclaimed frames and why, the `undrawn` items, and the designer's `notes`. Then digest it and fire `B-inv` in the same turn:

```
DESIGN INVENTORY — 6 sources · 32 frames (30 claimed · 2 palette sheets) · design/inventory.md

  ATOMS      11  (4 library primitives)
  MOLECULES  13
  ORGANISMS   3  NavRail · ResearchCard · DocumentBody
  SCREENS     5  /chats [6 states] · /library [4] · /library/:id [4] · /d/:token [3] · /sign-in [4]
  UNDRAWN     1  Citation — spec G1, no frame draws it

  Note: the deck draws interrupted and cancelled as two outcomes; the routing doc lists one.
```

```user_choice
batch: B-inv — the design inventory
- header: Inventory
  question: Is this inventory of components and screen states the set to build?
  options:
    - label: Yes, this is the set (Recommended)
      description: Records the inventory as the required set. Every later phase reads its lists from it — the plan, the atoms, the molecules, the organisms, the route map — and none of them re-asks what the designs contain. Each item is built to match the frames the inventory ties it to.
    - label: Change the inventory
      description: Choose Other and name what to add, drop, rename, merge, or re-layer — for example a molecule that is really an organism, two screen states that are one, or a component the read missed. The inventory is corrected and re-gated before it is recorded; nothing is built from the uncorrected version.
    - label: Cancel
      description: Writes nothing to the manifest. The rendered frames and the unconfirmed inventory stay on disk for inspection, and re-running build resumes here from the same read instead of redoing it.
```

**Change the inventory** applies the named edits to the JSON, re-runs the gate, and re-presents the digest. On acceptance, write `confirmed` (ISO time) into `design/inventory.json` and record the receipt in the manifest:

```json
{
  "inventory": {
    "file": "design/inventory.json",
    "reference": "design/reference",
    "confirmed": "2026-08-30T18:40:00Z",
    "sources": [ { "ref": ".spec/prds/web-client/designs/concepts/Cockpit.dc.html", "hash": "sha256:…" } ]
  }
}
```

### Phase 4a Exit Gate

`design/inventory.json` exists with `confirmed` set, `verify-inventory.mjs` exits `0` against the current `frames.json`, and `manifest.inventory.sources[].hash` matches every reference. A reference whose hash later changes makes the inventory stale: before `compose` has passed, build re-runs this phase (the prior inventory is an input, so confirmed names survive); after `compose` has passed, route the change to `pixel-perfect:evolve`, which classifies the delta against the golden catalog.

---

## Phase 4b: BUILD PLAN

Analyze the requirements spec against the current codebase state. Determine which build levels have non-zero delta — what needs to be created, updated, or is already complete. Produce a work plan. The user confirms the plan before any code is written.

This phase runs automatically when `pixel-perfect:build` is invoked and `plan` is not yet `passed` in the manifest.

**If the project has design references** (`manifest.references` names decks, URLs, screenshots, or a `design/wireframes/` directory): Phase 4a has already run and `design/inventory.json` is the required set — atoms, molecules, organisms, and screens (route-keyed, with `states`), each carrying the reference frames that justify it. The lists below are read from it, not re-derived from the spec. Reconcile against the spec (an item the spec requires and no frame draws is already in the inventory as `undrawn`) and confirm the plan as usual.

**If the project has no design references**: the lists are derived from the spec as Step 2 describes, and the per-layer identification steps (Phase 5 Step 1, 5b Step 1, 5c Step 1, 6 Step 1) ask their batches as written. A wireframed project (`design/wireframes.json`) has design references — the wireframes directory is a source the inventory reads.

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

Read the requirements document (from `manifest.spec`) and, when it exists, `design/inventory.json`. For each level, **delta = required − already verified in the codebase**, where *required* is the inventory's list for that level when an inventory exists and otherwise what the spec names. A level is ACTIVE when its delta is above zero, SKIP when the delta is zero and no lower level is ACTIVE.

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

**Adopted components.** `manifest.assimilations[].adopted.components` are required items too. When Phase 4a ran, its "Adopted components" step already put them in the inventory; when the project has no design references (so no inventory), add them to the spec-derived lists here, each as an undrawn item to build in the project's own style.

**Greenfield** (no existing components) skips delta computation: every level is ACTIVE and the plan proposes creating everything the spec describes. **Brownfield** runs the delta per level and proposes only what is missing or changed. Say which mode ran in the digest.

### Step 3: Write the brief, digest it, and confirm the plan

This is the workflow's first turn and it ends on a question.

1. **Write `design/build-plan.md`** — what the audit found, what the spec demands, the per-level delta, and the reasoning behind every SKIP. This is where the analysis lives.
2. **Digest it in twelve lines or fewer**, naming the brief's path:

```
BUILD PLAN — web-desktop · brownfield · design/build-plan.md

  INVENTORY  9 frames · 4 atoms · 2 molecules · 1 organism · 2 screens (confirmed)
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

## The Item Loop (Phases 5, 5b, 5c, and 6)

Each component and screen in a layer is built by the packaged designer, one child per item. The orchestrator never writes an item's files. It records the item, assigns it, checks what the child returns, and records the outcome. `docs/BUILD-BRIEF.md` holds the rules a child follows. `scripts/brief.mjs` puts the rules for the item's layer into that child's assignment, and it prints the gate commands for the item.

Never write or finish an item yourself while a child is available. The one exception is the inline row in `RUNTIME-CONTRACT.md` ("Packaged agents"). Use it only when that file's "none of these" row applies: no spawning tool exists. Never use it after a failed spawn.

Two re-assignments at most, for each item. Every re-run counts toward this cap, whatever the reason: a finding, a blocked result, or a `gate-failed`. Each failed result writes one findings file (see "Findings and re-assignment"). After the second re-assignment, a result that still fails goes to `USER_CHOICE` (batch `B-item`).

### Assign one item

Run the brief command for the item. It writes the child's assignment and prints one line. Start one packaged designer child with that line as its whole prompt. Do not paraphrase the line or add to it. Each phase gives the command.

If the command exits non-zero, stop and read its error. The usual causes are: the item has no `file` or `story` in the manifest (record them, then run again); a composed item is still `pending` (build it first); a layer before this one is not passed (pass its gate first); a molecule or organism has no `state` key (record `state`, or `null` when it declares none).

### Accept the result

Read the child's reply. It must be one JSON object with a `status`. A reply that is not one JSON object, has no `status`, or has a status other than `complete` or `blocked` is a finding. Re-assign.

| Child returns | You do |
|---------------|--------|
| `status: blocked`, `reason: missing-input` | Clear each item in `needs`: install the named package, add the named token, record the named file or story, or pull the named primitive with the library's CLI. Then write a findings file, and re-run with it. |
| `status: blocked`, `reason: contract-missing` | Re-run the Resolve step for that contract in `workflows/init.md`. Set its enforcement to `off` only when the user asks. Then write a findings file, and re-run. |
| `status: blocked`, `reason: no-render-command` | Fix `capture.command` for the platform in the manifest. Then write a findings file, and re-run. |
| `status: blocked`, `reason: no-image` | The render command wrote no image or text artifact for a state. Check the capture command for this item. Then write a findings file, and re-run. |
| `status: blocked`, `reason: gate-failed` | The gate still fails after the child's own fixes. Its output is in `notes`. Write a findings file with that output, and re-assign. If a second `gate-failed` comes back, go to `USER_CHOICE` (batch `B-item`) without a third child. |
| `blocked` with any other reason, or with no reason | A finding. Write a findings file, and re-assign. |
| `status: complete` | Run the checks below. Any failed check is a finding. |

A blocker you cannot clear goes to `USER_CHOICE` (batch `B-item`).

For `status: complete`, check in this order:

1. **Files.** `files_written` contains the item's recorded `file` and its recorded `story`. Every path in `files_written` is one of those two, or the one sandbox registry entry the sandbox adapter allows. Every path exists on disk.
2. **Renders.** `renders` has at least one entry for each state the Item section in the brief lists. Count its `states`, or count one default state when it lists none. Every `renders[].path` exists on disk.
3. **Compared.** When the Frames section lists a frame, `compared` is not empty. Every `compared[].differences_remaining` is empty.
4. **Needs.** `needs` is empty. A complete item has nothing left to install or record.
5. **Look.** Open the brief file. Take the first state under Frames. Open that state's render and its frame. Compare them in the order `agents/designer.md` lists. Each difference is a finding. With no frame, check that a render exists and shows the component. On a text-rendering platform, read the text artifact instead.
6. **Gates.** Run the commands printed under `## Gates` in the item's brief file, exactly as written. Do not change them. Exit `0` passes. Exit `1` is a finding under `hard-fail`; under `warn`, record the violations and pass. Exit `2` and exit `3` block the item even under `warn`.

Collect each `flags` entry from complete results. A flag is not a finding. When the layer's last item is verified, print the collected flags once, each as `file:line` and its text.

### Findings and re-assignment

Each failed result writes one findings file, numbered by its attempt. The first is `findings-1.json`, and the second is `findings-2.json`:

```
<project-root>/design/.briefs/{platform}/{layer}-{Name}.findings-1.json
```

Write the failures in it, in this shape. The `reason` appears only for a blocked result:

```json
{"item": "{layer}/{Name}", "attempt": 1, "reason": "gate-failed", "findings": ["src/components/Button.tsx:12 — padding is 12px; the frame shows 16px"]}
```

Then run the brief command again with `--findings <absolute path to that file>`, and start a new child.

The file survives compaction. An existing `findings-1.json` means one re-assignment is used. An existing `findings-2.json` means both are used, so the next failed result goes to `USER_CHOICE`.

### B-item

```user_choice
batch: B-item — an item the designer could not finish
- header: Item
  question: {Name} is still not finished after two re-assignments. How should it be handled?
  options:
    - label: Accept with the differences recorded
      description: Marks the item verified and writes the remaining differences into its manifest entry as notes. The gap stays on the record, and later levels build on the item as it is. Choose Other to name a different fix instead.
    - label: Stop this layer
      description: Leaves the item pending and stops the layer here. Nothing above it is built until you run build again after the cause is fixed.
```

### Record the item

Set the item's `status` to `verified` in `design/manifest.json`. Write decisions and receipts only: no authored composition-edge arrays and no `controls` authority field. Controls coverage comes from catalog capture.

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

For atoms wrapping an ecosystem library, the entry also carries the `ecosystemLib` record from the build plan, with its vetting:

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

Then print the progress line for the layer (see its Progress Tracking).

### Report the design engine

Report the route once per run, as the table in `RUNTIME-CONTRACT.md` ("Packaged agents") gives it.

---

## Phase 5: ATOMS

Build individual, reusable components.

### Step 1: Identify Components

**The approved plan already carries the atom list.** When `build_plan.atoms.create` came through `B-plan` unchanged, that list is settled — report it in one line and start building. Do not re-confirm a list the user just approved.

Fire `B-atoms` only when the list is genuinely open: the user chose "Change what gets built" at the plan gate, or the atoms are being derived here for the first time because the plan was seeded without them.

**With an inventory** (`design/inventory.json`), the list is never open here: the atoms are `inventory.atoms` minus what is verified on disk, confirmed at `B-inv` and again at `B-plan`. Each atom's `states` and `variants` come from its inventory entry; an atom with `library_primitive` set is configured from the component library, not created.

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

Step 2 records each atom in the manifest, with its `file` and `story`.

### Step 2: Prepare the Layer

Do this once, before the first atom. The orchestrator does it. No child does.

1. **Stop unless the scaffold gate is passed.** Check that `platforms[platform].gates.scaffold` is `"passed"`. If it is not, stop and name `pixel-perfect:scaffold --platform {platform}` as the fix.
2. **Record every atom.** Add each atom to `manifest.platforms[platform].atoms` with `name`, `file`, `story`, and `status: "pending"`. Choose the paths like this:
   - `file`: `src/components/{Name}.tsx`, or the framework's equivalent.
   - `story`: beside the component, named by the sandbox adapter (`docs/adapters/{sandbox}.md`), for example `src/components/{Name}.stories.tsx`.
   - If `build_plan.atoms.ecosystemLibs` holds a record for this atom, copy it onto the entry as `ecosystemLib`.
3. **Pull library primitives.** Skip this when `component_contract_source` is `"none"` or absent. Otherwise, for each atom whose inventory entry sets `library_primitive` and whose primitive is not in `manifest.platforms[platform].scaffold.components[]`, pull it with the library's CLI. The components adapter (`docs/adapters/{components}.md`) gives the command. Add the name to that list.
4. **Install approved packages.** For each library approved at `B-eco`, install it at its recorded version (`npm install {package}@{version}`, or the project's package manager). Check that its import resolves.
5. **Add theme tokens.** When the approved plan calls for a theme token this layer uses, add it to the theme file before the first atom. The style adapter (`docs/adapters/{style}.md`) gives the file format.
6. **Report unenforced styles.** If `style_contract_source` is `"none"`, tell the user once that styles are not enforced, and that the styling gate does not run for this platform.

Do only what `B-plan`, `B-eco`, or `B-val` approved.

### Step 3: Build Each Atom, One at a Time

Build the atoms one at a time, in manifest order. Finish one before you start the next.

1. **Assign.** `SUBAGENT(designer, node <plugin-root>/scripts/brief.mjs build <project-root> --platform {platform} --layer atoms --name {Name})`. Start one child with the line the command prints.
2. **Accept.** Follow "Accept the result" in The Item Loop.
3. **Re-assign on failure.** Write the failures to `design/.briefs/{platform}/atoms-{Name}.findings-N.json`, where N is the attempt: 1, then 2. Run the brief command again with `--findings <absolute path to that file>`, then start a new child. Two re-assignments at most, counting every re-run. After the second one still fails, ask through `USER_CHOICE` (batch `B-item`).
4. **Record.** When the atom passes, set its `status` to `verified` (see "Record the item").
5. **Print the progress line** (see Progress Tracking).

After the last atom, print the collected flags once (see The Item Loop).

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

> **Both contract gates run for every layer.** Each item's brief names the gate commands for its platform, and The Item Loop runs them after each child returns. Each layer records `{layer}_styling_contract` and `{layer}_component_contract`. When enforcement is `hard-fail` (default), a layer whose emitted files violate either contract is **blocked** until fixed or a per-component override is recorded in `tools.style_contract_overrides` / `tools.component_contract_overrides`.
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

**With an inventory**, the molecules are `inventory.molecules` minus what is verified on disk, and each one's state declarations (Step 1b) are seeded from its inventory `states[]` — digest them one line each and continue; `B-mol` never fires. Otherwise, review the verified atoms and the spec for repeated atom groupings, then digest the candidates with the screens that justify each one:

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

Write state declarations into the manifest (**no authored composition-edge authority** — do not gate on `atoms: [...]`; composition is proved by `--blast`):
```json
{
  "molecules": [
    {
      "name": "JobRow",
      "file": "src/molecules/JobRow.tsx",
      "story": "src/molecules/JobRow.stories.tsx",
      "status": "pending",
      "state": null
    },
    {
      "name": "SearchBar",
      "file": "src/molecules/SearchBar.tsx",
      "story": "src/molecules/SearchBar.stories.tsx",
      "status": "pending",
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

### Step 2: Prepare the Layer

1. **Stop unless the atoms gate is passed.** Check that `platforms[platform].gates.atoms` is `"passed"`. If it is not, stop.
2. **Record every molecule.** Add each molecule to `manifest.platforms[platform].molecules` with `name`, `file`, `story`, `status: "pending"`, and `state`. Set `state` to the object declared in Step 1b, or to `null` when the molecule declares no state. The brief exits 2 for a molecule with no `state` key. Paths: `src/molecules/{Name}.tsx` (or the framework's equivalent), and its story beside it, named by the sandbox adapter. If `build_plan.molecules.ecosystemLibs` holds a record for this molecule, copy it onto the entry as `ecosystemLib`.
3. **Install approved packages.** For each library approved at `B-eco` for a molecule, install it at its recorded version (`npm install {package}@{version}`, or the project's package manager), and check that its import resolves. Do only what `B-eco` or `B-val` approved.
4. **Check the atoms.** Every atom a molecule composes must already be `verified`. The brief exits 2 while a composed item is still `pending`.

### Step 3: Build Each Molecule, One at a Time

Build the molecules one at a time, in manifest order. Finish one before you start the next.

1. **Assign.** `SUBAGENT(designer, node <plugin-root>/scripts/brief.mjs build <project-root> --platform {platform} --layer molecules --name {Name})`. Start one child with the line the command prints.
2. **Accept.** Follow "Accept the result" in The Item Loop.
3. **Re-assign on failure.** Write the failures to `design/.briefs/{platform}/molecules-{Name}.findings-N.json`, where N is the attempt: 1, then 2. Run the brief command again with `--findings <absolute path to that file>`, then start a new child. Two re-assignments at most, counting every re-run. After the second one still fails, ask through `USER_CHOICE` (batch `B-item`).
4. **Record.** When the molecule passes, set its `status` to `verified` (see "Record the item").
5. **Print the progress line** (see Progress Tracking).

After the last molecule, print the collected flags once (see The Item Loop).

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

**With an inventory**, the organisms are `inventory.organisms` minus what is verified on disk, each with its `composes`, `states`, and the frames it appears on — digest them one line each and continue; `B-org` never fires. Otherwise, review molecules, atoms, and the spec for complex compositions spanning multiple screens. Digest each candidate as one line — what it composes, what state it owns, and where it is reused:

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

### Step 2: Prepare the Layer

1. **Stop unless the molecules gate is passed.** Check that `platforms[platform].gates.molecules` is `"passed"`. If it is not, stop.
2. **Record every organism.** Step 1 wrote each entry. Confirm that each has `name`, `file`, `story`, `status: "pending"`, and `state`: the object declared in Step 1, or `null` when it declares no state. The brief exits 2 for an organism with no `state` key. Paths: `src/organisms/{Name}.tsx` (or the framework's equivalent), and its story beside it, named by the sandbox adapter. If `build_plan.organisms.ecosystemLibs` holds a record for this organism, copy it onto the entry as `ecosystemLib`.
3. **Install approved packages.** For each library approved at `B-eco` for an organism, install it at its recorded version, and check that its import resolves. Do only what `B-eco` or `B-val` approved.
4. **Check the molecules and atoms.** Every item an organism composes must already be `verified`. The brief exits 2 while a composed item is still `pending`.

### Step 3: Build Each Organism, One at a Time

Build the organisms one at a time, in manifest order. Finish one before you start the next.

1. **Assign.** `SUBAGENT(designer, node <plugin-root>/scripts/brief.mjs build <project-root> --platform {platform} --layer organisms --name {Name})`. Start one child with the line the command prints.
2. **Accept.** Follow "Accept the result" in The Item Loop.
3. **Re-assign on failure.** Write the failures to `design/.briefs/{platform}/organisms-{Name}.findings-N.json`, where N is the attempt: 1, then 2. Run the brief command again with `--findings <absolute path to that file>`, then start a new child. Two re-assignments at most, counting every re-run. After the second one still fails, ask through `USER_CHOICE` (batch `B-item`).
4. **Record.** When the organism passes, set its `status` to `verified` (see "Record the item").
5. **Print the progress line** (see Progress Tracking).

After the last organism, print the collected flags once (see The Item Loop).

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
- `design/inventory.json` `screens[]` (if the project has design references) — already route-keyed and state-split, each state naming its frames. **With an inventory, Steps 1b and 1c are done**: go to Step 1d and present its route map, forcing the gate only when the inventory's `notes` flag an ambiguous collapse or the collapse rule below says so

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

Write the confirmed screens to the manifest (all `status: pending`), each with its `route`, its `file` and `story` paths (`src/screens/{Name}.tsx`, and its story beside it, named by the sandbox adapter), and its `states` list. Single-state routes carry `states: ["default"]`.

### Step 2: Prepare the Layer

1. **Stop unless the gate of the last layer with recorded items is passed.** That is `platforms[platform].gates.organisms` when organisms are recorded; otherwise `gates.molecules` when molecules are recorded; otherwise `gates.atoms`. If it is not passed, stop.
2. **Check the records.** Every screen from Step 1e must be in `manifest.platforms[platform].screens` with `name`, `route`, `file`, `story`, `states`, and `status: "pending"`.
3. **Check the components.** Every atom, molecule, and organism a screen composes must already be `verified`. The brief exits 2 while a composed item is still `pending`.

### Step 3: Build Each Screen, One at a Time

Build the screens one at a time, in route-map order. Finish one before you start the next.

1. **Assign.** `SUBAGENT(designer, node <plugin-root>/scripts/brief.mjs build <project-root> --platform {platform} --layer screens --name {Name})`. Start one child with the line the command prints.
2. **Accept.** Follow "Accept the result" in The Item Loop.
3. **Re-assign on failure.** Write the failures to `design/.briefs/{platform}/screens-{Name}.findings-N.json`, where N is the attempt: 1, then 2. Run the brief command again with `--findings <absolute path to that file>`, then start a new child. Two re-assignments at most, counting every re-run. After the second one still fails, ask through `USER_CHOICE` (batch `B-item`).
4. **Record.** When the screen passes, set its `status` to `verified` (see "Record the item").
5. **Print one line:** the count of screens verified, and the next screen. After the last screen, print the collected flags once (see The Item Loop).

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

If the project has design references and no current inventory (missing, unconfirmed, or a reference's hash changed), `pixel-perfect:build` runs Phase 4a first. If BUILD PLAN has not been confirmed (plan gate is `pending`), it runs Phase 4b next, before resuming any other phase.

Otherwise build resumes from the current phase in one line and keeps going. It does not re-audit the codebase, re-read the spec, or re-present a plan the manifest already holds.

Inside a layer, resuming means going back into The Item Loop at the first item whose `status` is not `verified`. Before you assign that item, count its findings files: `design/.briefs/{platform}/{layer}-{Name}.findings-1.json` and `findings-2.json`. Each file that exists is a re-assignment already used.

```
Resuming: ATOMS 3/5 — building SectionHeader, then ActionButton.
```

## Building Specific Items

Target a specific component or screen:

```
pixel-perfect:build --component StatusBadge    # Rebuild one atom
pixel-perfect:build --screen TodayFeed         # Rebuild one screen
```

This re-generates the specified item while preserving everything else. Both go through The Item Loop for that one item: the same assign, accept, and re-assign rules apply, and its findings files count toward the cap.

## Completion

Report the counts and the next command. Omit any level the plan skipped.

```
Build complete — {platform}

  Atoms 5/5 · Molecules 2/2 · Organisms 1/1 · Screens 2/2 (5 state stories)
  All registered in the sandbox with controls wired.

  Next: pixel-perfect:verify --platform {platform}
        pixel-perfect:refine --platform {platform} to iterate
```
