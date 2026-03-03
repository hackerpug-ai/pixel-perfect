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

- `--phase <name>`: Verify a specific phase instead of current (scaffold, atoms, compose, integrate)
- `--component <name>`: Verify a specific component only
- `--screen <name>`: Verify a specific screen only
- `--fix`: Attempt to fix failures automatically before reporting

## Gate Check

**Requires:** `design/manifest.json` exists.

## What It Does

1. Reads `design/manifest.json` to determine current phase
2. Runs gate checks appropriate for that phase
3. Reports results per check
4. If all pass, advances the phase gate in manifest

---

## Phase-Specific Checks

### Scaffold Gate

Verifies the project is set up correctly with Storybook and theme.

| Check | What It Verifies |
|-------|-----------------|
| Theme exists | Theme file exists at expected location |
| Storybook runs | `npm run storybook` starts without errors |
| Hello world renders | First component renders in Storybook with controls |
| Token stories exist | Design System stories render (Colors, Typography, Spacing) |
| Story organization | Stories use correct hierarchy prefixes (Design System/, Components/) |
| Adapters loaded | Correct adapter docs loaded for chosen tools |
| Polyfill configured | (React Native only) `react-native-web` alias configured |

```
Scaffold verification:
  [x] Theme file exists (src/theme.ts)
  [x] Storybook starts without errors
  [x] HelloWorld component renders with controls
  [x] Token stories: Colors, Typography, Spacing
  [x] Story hierarchy: Design System/, Components/
  [x] Adapters: tailwind.md, shadcn.md, storybook.md
  [x] Polyfill: react-native-web alias configured

Result: PASSED — scaffold gate advanced
```

### Atoms Gate

Verifies all atomic components with Storybook controls.

| Check | What It Verifies |
|-------|-----------------|
| File exists | Component file at path in manifest |
| Story exists | Companion `.stories.tsx` file alongside component |
| Compiles | No type errors or import errors |
| Renders | Component visible in Storybook |
| Uses theme | Theme tokens used (not hardcoded values) |
| Controls wired | All component props have corresponding `argTypes` |
| Story organization | Story title uses `Components/` prefix |
| Polyfill disclaimer | (React Native only) Stories include polyfill notice decorator |
| Aesthetic* | Font pairing, color hierarchy, intentional motion |

*Aesthetic checks only run if frontend-design plugin is available.

```
Atoms verification (5 components):

  StatusBadge:
    [x] File exists: src/components/StatusBadge.tsx
    [x] Story exists: src/components/StatusBadge.stories.tsx
    [x] Compiles without errors
    [x] Renders in Storybook
    [x] Uses theme tokens
    [x] Controls: status (select), label (text), size (select), animated (boolean)
    [x] Story title: 'Components/StatusBadge'
    [x] Polyfill disclaimer present
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

### Compose Gate

Verifies all composed screens.

| Check | What It Verifies |
|-------|-----------------|
| File exists | Screen file at path in manifest |
| Story exists | Screen-level companion file |
| Compiles | No errors |
| Renders | Screen visible with all atoms |
| Atoms correct | All listed atoms are used in the screen |
| Responsive | Layout responds to viewport changes (if applicable) |
| Controls wired | Screen-level props have `argTypes` where applicable |
| Story organization | Story title uses `Screens/` prefix |
| Viewport | Mobile projects use mobile viewport preset |
| Aesthetic* | Intentional hierarchy, visual flow, spatial composition |

```
Compose verification (2 screens):

  TodayFeed:
    [x] File exists: src/screens/TodayFeed.tsx
    [x] Story exists: src/screens/TodayFeed.stories.tsx
    [x] Compiles
    [x] Renders
    [x] Atoms used: StatusBadge, JobCard, DateChip, SectionHeader
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

On full phase pass, verify updates the manifest:

```json
{
  "gates": {
    "atoms": "passed"
  }
}
```

On failure, the gate remains unchanged and the manifest is not modified.
