---
description: "Build components and screens: ATOMS → MOLECULES → COMPOSE (phases 5-6)"
---

# Build (Phases 5-7)

The main orchestration command. Reads requirements, identifies components, builds them as real code, composes them into screens, and wires up navigation and data flow.

## Usage

```
/pixel-perfect:build [directory] [options]
```

## Arguments

- `[directory]`: Project directory. Defaults to current directory.

## Options

- `--phase <name>`: Start from a specific phase (atoms, compose, integrate). Default: resume from current phase.
- `--component <name>`: Build or rebuild a specific component
- `--screen <name>`: Build or rebuild a specific screen

## Gate Check

**Requires:** `design/manifest.json` with `scaffold: passed`.

If not met:
```
Cannot build: scaffold not complete.
Run /pixel-perfect:scaffold first.
```

## Overview

Build progresses through three phases. Each phase has entry/exit gates and tracks progress in the manifest.

```
Phase 5: ATOMS      → Individual components (Button, Card, Badge, etc.)
Phase 5b: MOLECULES → Functional compositions of 2-3 atoms (SearchBar, UserCard, FormField)
Phase 6: COMPOSE    → Screen layouts composing molecules and atoms (Dashboard, Settings, etc.)
```

The command resumes from wherever the manifest says the project is. If atoms are partially complete, it picks up where it left off.

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

## Phase 7: INTEGRATE

Wire up the real-world connections.

### What Gets Wired

1. **Navigation/Routing:**
   - Configure router or navigation container
   - Define screen transitions
   - Set up deep linking (if applicable)

2. **State Management** (if needed):
   - Shared state between screens
   - Form state persistence
   - User preferences/settings

3. **Data Fetching** (if applicable):
   - API client configuration
   - Data loading patterns (loading, error, empty states)
   - Cache strategy

4. **End-to-End Verification:**
   - Navigate between all screens
   - Data flows correctly through the app
   - Loading and error states work
   - The app functions as a cohesive whole

### Integration Steps

```
Integration:
  [x] Navigation configured (React Navigation / Next.js Router / etc.)
  [x] Screen transitions defined
  [x] State management wired
  [ ] Data fetching connected
  [ ] End-to-end flow verified
```

### Phase 7 Exit Gate

The app runs, screens navigate, data flows. Update manifest:
```json
{
  "phase": "integrate",
  "gates": {
    "integrate": "passed"
  }
}
```

---

## Resuming

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
Build complete!

  Atoms:    5/5 verified (all controls wired)
  Screens:  2/2 verified
  Integration: complete

All phases passed. Your project has running code with:
  - 5 themed components with full Storybook controls
  - Functional molecule compositions sandboxed in Storybook
  - 2 composed screens at target viewport

To iterate: /pixel-perfect:refine
To verify:  /pixel-perfect:verify
To check:   /pixel-perfect:status
```
