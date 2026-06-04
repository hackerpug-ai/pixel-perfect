---
description: "Run gate checks for the current phase and advance if all pass"
---

# Verify (Gate Checks)

Run verification checks appropriate for the current build phase. Reports pass/fail per check with actionable feedback. If all checks pass, advances the phase gate in the manifest.

## Usage

```
/pixel-perfect:verify [directory] [options]
```

## Arguments

- `[directory]`: Project directory. Defaults to current directory.

## Options

- `--platform <name>`: Target platform to verify. Required when multiple platforms exist. Auto-selected when only one platform is configured.
- `--phase <name>`: Verify a specific phase instead of current (scaffold, atoms, compose, integrate)
- `--component <name>`: Verify a specific component only
- `--screen <name>`: Verify a specific screen only
- `--fix`: Attempt to fix failures automatically before reporting

## Gate Check

**Requires:** `design/manifest.json` exists.

## What It Does

1. Reads `design/manifest.json` and selects the target platform
2. Reads the selected platform's current phase from `manifest.platforms[platform].phase`
3. Runs gate checks appropriate for that phase
4. Reports results per check
5. If all pass, advances the platform's phase gate in manifest

---

## Phase-Specific Checks

### Scaffold Gate

Verifies the project is set up correctly with the sandbox and theme.

| Check | What It Verifies |
|-------|-----------------|
| Theme exists | Theme file exists at expected location |
| Sandbox runs | `npm run sandbox` (or `make sandbox` / `pnpm storybook`) starts without errors |
| Hello world renders | First component renders in the sandbox with controls |
| Token stories exist | Design System stories render (Colors, Typography, Spacing) |
| Story organization | Stories use correct hierarchy prefixes (Design System/, Components/) |
| Adapters loaded | Correct adapter docs loaded for chosen tools |
| Polyfill configured | (React Native + Storybook only) `react-native-web` alias configured |

```
Scaffold verification:
  [x] Theme file exists (src/theme.ts)
  [x] Sandbox starts without errors (npm run sandbox)
  [x] HelloWorld component renders with controls
  [x] Token stories: Colors, Typography, Spacing
  [x] Story hierarchy: Design System/, Components/
  [x] Adapters: tailwind.md, shadcn.md, custom-sandbox.md
  [x] Polyfill: n/a (not a Storybook RN project)

Result: PASSED — scaffold gate advanced
```

### Atoms Gate

Verifies all atomic components with sandbox controls.

| Check | What It Verifies |
|-------|-----------------|
| File exists | Component file at path in manifest |
| Story exists | Companion story/registry file alongside component |
| Compiles | No type errors or import errors |
| Renders | Component visible in the sandbox |
| Uses theme | Theme tokens used (not hardcoded values) |
| Controls wired | All component props exposed to sandbox controls (`argTypes` or labeled variants) |
| Story organization | Registered under `Components/` layer (or `Components/` prefix in Storybook) |
| Polyfill disclaimer | (React Native + Storybook only) Stories include polyfill notice decorator |
| **Ecosystem lib validated** | **If `ecosystemLib` exists, package is installed, importable, and vetting matches manifest** |
| Aesthetic* | Font pairing, color hierarchy, intentional motion |

*Aesthetic checks only run if frontend-design plugin is available.

```
Atoms verification (5 components):

StatusBadge:
     [x] File exists: src/components/StatusBadge.tsx
     [x] Story exists: src/components/StatusBadge.stories.tsx
     [x] Compiles without errors
     [x] Renders in sandbox
     [x] Uses theme tokens
     [x] Controls: status (select), label (text), size (select), animated (boolean)
     [x] Layer: Components/StatusBadge
     [x] Polyfill: n/a
     [x] Ecosystem lib: n/a
     [x] Aesthetic: font pairing, color hierarchy

  JobCard:
    [x] File exists
    [x] Story exists
    [x] Compiles
    [ ] Renders — Error: Missing import for DateChip
    [ ] Uses theme — Blocked by render failure
    [ ] Controls — Blocked
    [ ] Story title — Blocked
    [ ] Polyfill — Blocked
    [ ] Aesthetic — Blocked

  ...

Result: FAILED — 1 component has errors
  Fix JobCard import and run /pixel-perfect:verify again
```

### Molecules Gate

Verifies all molecule compositions including state coverage for stateful molecules.

| Check | What It Verifies |
|-------|-----------------|
| File exists | Molecule file at path in manifest |
| Story exists | Companion story file alongside molecule |
| Compiles | No type errors or import errors |
| Renders | Molecule renders in the sandbox |
| Atoms composed (not re-implemented) | Constituent atoms are imported and used, not re-created |
| Controls wired | All molecule-level props exposed to sandbox controls |
| Story organization | Registered under `Molecules/` layer |
| **State scenarios** | **Every declared state scenario has a corresponding named story export** |
| **State isolation** | **Each scenario exercises a distinct internal state (not just prop variants)** |

**State scenario check (stateful molecules only):**

For each molecule with `state.declared`, verify:
1. The manifest's `state.scenarios` list has ≥1 entry
2. Each scenario name has a matching named story export
3. Stories exercise internal state transitions, not just external prop changes

```
Molecules verification (3 molecules):

  JobRow:
    [x] File exists: src/molecules/JobRow.tsx
    [x] Story exists: src/molecules/JobRow.stories.tsx
    [x] Compiles
    [x] Renders
    [x] Atoms composed: StatusBadge, DateChip
    [x] Controls: status, date, jobTitle
    [x] Layer: Molecules/JobRow
    [x] State: N/A (stateless molecule)

  SearchBar:
    [x] File exists
    [x] Story exists
    [x] Compiles
    [x] Renders
    [x] Atoms composed: Input, Button
    [x] Controls: placeholder, onSearch
    [x] Layer: Molecules/SearchBar
    [x] State scenarios: 5/5 declared scenarios have named story exports
    [x] State isolation: each story exercises a distinct internal state

  FormField:
    [x] File exists
    [x] Story exists
    [x] Compiles
    [ ] Renders — Error: useFieldContext requires provider
    [ ] Controls — Blocked
    [ ] State scenarios: 0/4 (blocked by render failure)

Result: FAILED — 1 molecule has errors
  Fix FormField render and run /pixel-perfect:verify again
```

### Organisms Gate

Verifies all organism compositions with state coverage.

| Check | What It Verifies |
|-------|-----------------|
| File exists | Organism file at path in manifest |
| Story exists | Companion story file |
| Compiles | No errors |
| Renders | Organism renders with composed molecules/atoms |
| Molecules/atoms composed | All listed dependencies are imported, not re-implemented |
| Controls wired | All organism-level props exposed to controls |
| Story organization | Registered under `Organisms/` layer |
| **State scenarios** | **Every declared state scenario has a named story export** |
| **State isolation** | **Each scenario exercises a distinct internal state** |
| **Ecosystem lib validated** | **If `ecosystemLib` exists, package is installed, importable, vetting matches** |

```
Organisms verification (1 organism):

  DataTable:
    [x] File exists: src/organisms/DataTable.tsx
    [x] Story exists: src/organisms/DataTable.stories.tsx
    [x] Compiles
    [x] Renders
    [x] Molecules composed: SearchBar (imported)
    [x] Atoms composed: Pagination, TableRow (imported)
    [x] Controls: columns, data, sortable, selectable
    [x] Layer: Organisms/DataTable
    [x] State scenarios: 6/6 declared scenarios have named story exports
    [x] State isolation: each story exercises a distinct state configuration
    [x] Ecosystem lib: @tanstack/react-table@^8.20.0 installed, import verified, 8/8 (researched 2026-06-04)

  CommandPalette:
    [x] File exists
    [x] Story exists
    [x] Compiles
    [ ] Renders — Error: Missing SuggestionList component
    [ ] State scenarios: 0/3 (blocked by render failure)

Result: FAILED — 1 organism has errors
```

### Compose Gate

Verifies all composed screens.

| Check | What It Verifies |
|-------|-----------------|
| File exists | Screen file at path in manifest |
| Story exists | Screen-level companion file |
| Compiles | No errors |
| Renders | Screen visible with all atoms |
| Atoms correct | All listed atoms are used in the screen |
| States covered | Every state in the screen's `states` list has a story that drives the screen into that state |
| Responsive | Layout responds to viewport changes (if applicable) |
| Controls wired | Screen-level props have `argTypes` where applicable |
| Story organization | Story title uses `Screens/` prefix |
| Viewport | Mobile projects use mobile viewport preset |
| Aesthetic* | Intentional hierarchy, visual flow, spatial composition |

```
Compose verification (2 screens):

  TodayFeed (route /today):
    [x] File exists: src/screens/TodayFeed.tsx
    [x] Story exists: src/screens/TodayFeed.stories.tsx
    [x] Compiles
    [x] Renders
    [x] Atoms used: StatusBadge, JobCard, DateChip, SectionHeader
    [x] States: 3/3 (default, empty, loading) — each has a story
    [x] Responsive: mobile and tablet breakpoints
    [x] Controls: filter (select), showCompleted (boolean)
    [x] Story title: 'Screens/TodayFeed'
    [x] Viewport: iPhone14 default
    [x] Aesthetic: clear hierarchy, guided visual flow

Result: PASSED — compose gate advanced
```

### Integrate Gate

Verifies the app works end-to-end.

| Check | What It Verifies |
|-------|-----------------|
| Navigation | Screens navigate correctly between each other |
| Data flow | Data passes between screens correctly |
| States | Loading, error, and empty states work |
| End-to-end | Full user flow completes successfully |

```
Integrate verification:

  [x] Navigation: TodayFeed → JobDetail works
  [x] Navigation: JobDetail → back to TodayFeed works
  [x] Data flow: job data passes to detail screen
  [x] Loading state: skeleton renders during fetch
  [x] Error state: error message displays on failure
  [x] Empty state: "no jobs today" message displays

Result: PASSED — integrate gate advanced. Build complete!
```

---

## Failure Handling

When checks fail, verify provides actionable feedback:

```
FAILED: JobCard does not compile

  Error: Cannot find module './DateChip'
  File: src/components/JobCard.tsx:3

  Suggestion: DateChip may not be built yet, or the import path is wrong.
  Check that DateChip exists at src/components/DateChip.tsx
```

With `--fix`:
```
FAILED: JobCard import path incorrect
  Auto-fix: Updated import from './DateChip' to '../DateChip'
  Re-verifying...
  [x] JobCard now compiles
```

### Controls Failure Example

```
FAILED: StatusBadge controls incomplete

  Props without argTypes: animated, onStatusChange

  Suggestion: Add argTypes for all props. See docs/storybook-conventions.md
  for the full controls mapping guide.
```

### Polyfill Disclaimer Failure Example

```
FAILED: StatusBadge missing polyfill disclaimer

  This is a React Native project. All stories must include the
  WebPolyfillNotice decorator. See docs/adapters/react-native-web.md

  Auto-fix available: run with --fix to add the global decorator
```

## Targeted Verification

Verify a single component or screen without running the full phase check:

```
/pixel-perfect:verify --component StatusBadge

StatusBadge:
  [x] File exists
  [x] Story exists
  [x] Compiles
  [x] Renders
  [x] Uses theme
  [x] Controls: 4/4 props wired
  [x] Story organization: Components/StatusBadge
```

## Manifest Updates

On full phase pass, verify updates the selected platform's manifest entry:

```json
{
  "platforms": {
    "{platform}": {
      "gates": {
        "atoms": "passed"
      }
    }
  }
}
```

On failure, the gate remains unchanged and the manifest is not modified.
