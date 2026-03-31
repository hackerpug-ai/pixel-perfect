---
description: "Build components and screens: PLAN → ATOMS → MOLECULES → COMPOSE (phases 4b-6)"
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

- `--platform <name>`: Target platform to build (e.g., `tui`, `web-desktop`). Required when multiple platforms exist. Auto-selected when only one platform is configured.
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
Phase 6: COMPOSE    → Screen layouts composing molecules and atoms (Dashboard, Settings, etc.)
```

Phases 5, 5b, and 6 execute only for levels where the BUILD PLAN identifies non-zero delta.

The command resumes from wherever the manifest says the project is. If atoms are partially complete, it picks up where it left off.

### Platform Scoping

All build operations read from and write to `manifest.platforms[platform]`. References to `tools`, `phase`, `gates`, `atoms`, `molecules`, `screens` in this document refer to the selected platform's fields. The `spec` field remains top-level (shared across platforms).

---

## Phase 4b: BUILD PLAN

Analyze the requirements spec against the current codebase state. Determine which build levels have non-zero delta — what needs to be created, updated, or is already complete. Produce a work plan. The user confirms the plan before any code is written.

This phase runs automatically when `/pixel-perfect:build` is invoked and `plan` is not yet `passed` in the manifest.

### The Build Levels

The build system works bottom-up across four levels:

| Level | What It Covers | Can Skip? |
|-------|---------------|-----------|
| Tokens | Design primitives: color palette, type scale, spacing scale | Yes — if spec has no new brand/theme changes |
| Atoms | Single-purpose UI primitives: Button, Input, Icon, Badge | Yes — if spec requires no new/changed components |
| Molecules | Functional atom compositions: SearchBar, FormField, UserCard | Yes — if spec has no repeated multi-atom patterns |
| Screens | Full view layouts composing molecules and atoms | No — screens are always the primary output |

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
Screens required:   TodayFeed, JobDetail — both missing
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
SCREENS   [ BUILD ]  — Need: TodayFeed (missing), JobDetail (missing).

Planned work:
  - 1 atom to create: ActionButton
  - 1 molecule to create: JobRow
  - 2 screens to create: TodayFeed, JobDetail

? Proceed with this plan? [Yes / Modify / Cancel]
```

**Modification flow:** If the user selects "Modify", ask which level to adjust:
- Add items to a level
- Remove items from a level
- Change a SKIP to BUILD or vice versa (user may have context the analysis missed)

**Cancellation:** If "Cancel", exit build cleanly. Manifest `plan` gate remains `pending`.

### Step 5: Write Plan to Manifest

After user confirms, write the plan to manifest:

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
    "screens": {
      "status": "build",
      "create": ["TodayFeed", "JobDetail"]
    }
  },
  "gates": {
    "plan": "passed"
  }
}
```

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

After PLAN is confirmed, `/pixel-perfect:build` resumes from the first ACTIVE level in order (Tokens → Atoms → Molecules → Screens), executing only ACTIVE levels.

If build is interrupted and resumed later, the plan in the manifest drives where to pick up:

```
> /pixel-perfect:build

Resuming from BUILD PLAN:
  [x] Tokens    — skipped (no changes)
  [~] Atoms     — 0/1 built (ActionButton pending)
  [ ] Molecules — pending (JobRow)
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
   - Adapter docs for the chosen tools
   - Project theme file
   - frontend-design aesthetic context (if available)

2. **Write component file:**
   - Real component code (`.tsx`, `.vue`, `.svelte`, etc.)
   - Uses theme tokens (not hardcoded values)
   - Follows adapter conventions (shadcn patterns, Paper patterns, etc.)
   - If frontend-design is available: distinctive typography, intentional color hierarchy, considered motion

3. **Write story file:**
   - Uses CSF3 format for Storybook
   - Shows all states (default, loading, error, disabled, etc.)
   - Uses realistic mock data
   - **Story title MUST use `Components/` prefix** (e.g., `title: 'Components/StatusBadge'`)
   - Includes `parameters.docs.description` for auto-generated docs
   - **ALL props MUST be wired to Storybook controls via `argTypes`**
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
   - Component renders in Storybook
   - All props are wired to argTypes controls

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

All atoms in the manifest have `status: verified` and `controls: true`. Update manifest:
```json
{
  "phase": "atoms",
  "gates": {
    "plan": "passed",
    "atoms": "passed"
  }
}
```

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

### Step 2: Build Each Molecule

For each molecule, in order:

1. **Load context:**
   - Atom files this molecule composes
   - Project theme file
   - Adapter docs for the chosen tools

2. **Write molecule file:**
   - Composes 2-3 atoms — does NOT re-implement atom internals
   - Accepts props that delegate to constituent atoms
   - Uses the same style system and theme tokens as the atoms
   - File location: `src/molecules/MoleculeName.tsx` (or equivalent per framework)

3. **Write story file:**
   - Uses CSF3 format for Storybook
   - **Story title MUST use `Molecules/` prefix** (e.g., `title: 'Molecules/JobRow'`)
   - Shows molecule in realistic context with all variant combinations
   - All molecule-level props wired to `argTypes` controls

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
   - Story loads in Storybook under `Molecules/` hierarchy
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

All molecules in the manifest have `status: verified`. Update manifest:
```json
{
  "phase": "molecules",
  "gates": {
    "molecules": "passed"
  }
}
```

---

## Phase 6: COMPOSE

Assemble atoms into complete screens.

### Step 1: Identify Screens

Read flow requirements and define screens:

```
Analyzing requirements for screens...

Proposed screens:
  1. TodayFeed    — Main view: today's jobs with status
     atoms: StatusBadge, JobCard, DateChip, SectionHeader
  2. JobDetail    — Single job view with actions
     atoms: StatusBadge, ActionButton, SectionHeader

? Confirm screen list? [Yes / Add more / Remove some]
```

Update manifest with screen list (all `status: pending`).

### Step 2: Build Each Screen

For each screen:

1. **Load context:**
   - All atom files this screen composes
   - Adapter docs
   - Theme file
   - frontend-design spatial composition rules (if available)

2. **Write screen file:**
   - Composes atoms into a complete layout
   - Uses theme spacing and layout tokens
   - Follows platform conventions (ScrollView for mobile, flex layouts for web, etc.)
   - If frontend-design available: intentional visual hierarchy, considered negative space, eye-flow guidance

3. **Write screen story:**
   - Uses CSF3 format for Storybook
   - **Story title MUST use `Screens/` prefix** (e.g., `title: 'Screens/TodayFeed'`)
   - Realistic mock data
   - Shows primary state and key variations (empty state, loading state, error state)
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
         "file": "src/screens/TodayFeed.tsx",
         "story": "src/screens/TodayFeed.stories.tsx",
         "status": "verified",
         "atoms": ["StatusBadge", "JobCard", "DateChip", "SectionHeader"]
       }
     ]
   }
   ```

### Phase 6 Exit Gate

All screens have `status: verified`. Update manifest:
```json
{
  "phase": "compose",
  "gates": {
    "compose": "passed"
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
  Screens:  2/2 verified

All phases passed for {platform}. Your project has running code with:
  - 5 themed components with full Storybook controls
  - Functional molecule compositions sandboxed in Storybook
  - 2 composed screens at target viewport

To iterate: /pixel-perfect:refine --platform {platform}
To verify:  /pixel-perfect:verify --platform {platform}
To check:   /pixel-perfect:status
```
