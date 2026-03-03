# Existing Repository Onboarding Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add `--existing` flag to init command that detects installed tools, inventories existing components, and generates Storybook stories for uncovered components.

**Architecture:** Extend the init command to branch between greenfield (current) and existing repo flows. The existing flow runs a detection engine, presents an overview, asks confirmation questions, then writes a manifest pre-populated with discovered components.

**Tech Stack:** Markdown command docs (no executable code — pixel-perfect is a process orchestrator plugin)

---

## Task 1: Add --existing Flag to Init Command Options

**Files:**
- Modify: `commands/init.md:19-27`

**Step 1: Read current options section**

Read lines 19-27 of init.md to see current options.

**Step 2: Add --existing option**

Add the `--existing` flag to the Options section after `--icons`:

```markdown
- `--existing`: Onboard an existing repository by detecting installed tools and components
```

**Step 3: Verify the change**

Confirm the Options section now includes all flags: `--force`, `--quick`, `--platforms`, `--vibe`, `--framework`, `--icons`, `--existing`.

**Step 4: Commit**

```bash
git add commands/init.md
git commit -m "feat(init): add --existing flag to options"
```

---

## Task 2: Add Detection Flow Branching to What It Does Section

**Files:**
- Modify: `commands/init.md:29-36`

**Step 1: Read current What It Does section**

Read lines 29-36 to see current description.

**Step 2: Add branching logic**

Replace the What It Does section to include the `--existing` branch:

```markdown
## What It Does

Walks through three phases sequentially. Each phase has an exit gate that must pass before proceeding.

**Standard Flow (greenfield projects):**
1. **Phase 1: DISCOVER** - Define what you're building
2. **Phase 2: TARGET** - Define where it runs, what framework, what style system, what component library, what icon library
3. **Phase 3: EQUIP** - Confirm tool selections and validate adapters

**Existing Repo Flow (`--existing` flag):**
1. **Phase 1: DISCOVER** - Inventory what exists (detect tools, components, theme)
2. **Phase 2: TARGET** - Confirm detected platforms
3. **Phase 3: EQUIP** - Confirm detected tools and validate adapters

Output: `design/manifest.json` with gates discover/target/equip = passed.

---

## Flow Selection

When `--existing` is passed, skip to [Phase 1: DISCOVER (Existing)](#phase-1-discover-existing).

Otherwise, follow the standard [Phase 1: DISCOVER](#phase-1-discover) flow below.
```

**Step 3: Commit**

```bash
git add commands/init.md
git commit -m "feat(init): add flow branching for --existing flag"
```

---

## Task 3: Create Detection Engine Section

**Files:**
- Modify: `commands/init.md` (add new section after Phase 3: EQUIP)

**Step 1: Insert Detection Engine section**

Add a new section titled "Phase 1: DISCOVER (Existing)" after the current Phase 3: EQUIP section (after line ~418). This section describes the detection engine.

```markdown
---

## Phase 1: DISCOVER (Existing)

When `--existing` flag is passed, DISCOVER becomes an inventory phase that detects what's already in the repository.

### Detection Engine

The detection engine analyzes the repository to identify installed tools and existing components.

#### Package.json Signals

Scan `package.json` dependencies for tool indicators:

| Signal | Detected Tool | Category |
|--------|---------------|----------|
| `tailwindcss` | Tailwind CSS | style |
| `nativewind` | NativeWind | style |
| `@radix-ui/*` | shadcn/ui likely | components |
| `react-native-paper` | React Native Paper | components |
| `@react-native-reusables/*` | React Native Reusables | components |
| `lucide-react` | Lucide React | icons |
| `lucide-react-native` | Lucide React Native | icons |
| `@heroicons/react` | Heroicons | icons |
| `@expo/vector-icons` | Expo Vector Icons | icons |
| `@storybook/*` | Storybook | sandbox |
| `expo` | Expo | framework |
| `next` | Next.js | framework |
| `react-native` | React Native | platform (mobile) |

#### Config File Detection

Confirm tool usage by checking for config files:

| File | Confirms |
|------|----------|
| `tailwind.config.js` / `tailwind.config.ts` | Tailwind active |
| `nativewind.config.js` | NativeWind active |
| `components.json` | shadcn/ui configured |
| `.storybook/` | Storybook Web configured |
| `.rnstorybook/` | Storybook Native configured |
| `app.json` / `app.config.js` | Expo project |
| `next.config.js` / `next.config.ts` | Next.js project |

#### Platform Detection

Determine target platforms from detected framework:

| Framework | Detected Platforms |
|-----------|-------------------|
| `expo` | `mobile-ios`, `mobile-android` |
| `react-native` (without expo) | `mobile-ios`, `mobile-android` |
| `next` | `web-desktop` (+ `web-mobile` if responsive detected) |
| `vite` + `react` | `web-desktop` |

#### Component Discovery

Scan common component directories to find existing UI components:

**Search paths (in order):**
1. `src/components/`
2. `components/`
3. `app/components/`
4. `lib/components/`
5. `components/ui/` (shadcn/RNR pattern)

**For each `.tsx` / `.jsx` file found:**
1. Check if matching `.stories.tsx` / `.stories.jsx` exists
2. Parse exports to identify component name(s)
3. Detect props interface from TypeScript or PropTypes
4. Categorize as atom/molecule/view based on:
   - **Atom**: imports few/no other local components
   - **Molecule**: imports 2-3 other components
   - **View**: located in `screens/`, `views/`, `pages/`, or imports many components

#### Theme Detection

Extract existing theme values:

| Source | What to Extract |
|--------|-----------------|
| `tailwind.config.js` | `theme.extend.colors`, `theme.extend.spacing` |
| `global.css` / `globals.css` | CSS variables (`:root { --primary: ... }`) |
| `theme.ts` / `theme.js` | Exported theme object colors |
| React Native Paper theme | `MD3LightTheme` customizations |
```

**Step 2: Commit**

```bash
git add commands/init.md
git commit -m "feat(init): add detection engine for existing repos"
```

---

## Task 4: Create Rich Overview Display Section

**Files:**
- Modify: `commands/init.md` (continue after Detection Engine)

**Step 1: Add Rich Overview section**

```markdown
### Rich Overview Display

After detection completes, present a categorized overview of what was found:

```
Existing Project Analysis
=========================

Framework:    Expo (detected from app.json)
Platforms:    mobile-ios, mobile-android

Style System
------------
  [x] NativeWind (tailwind.config.js found)
      Theme colors: primary (#3B82F6), secondary (#10B981), ...

Component Library
-----------------
  [x] React Native Reusables (package.json)
      14 components detected in components/ui/

Icon Library
------------
  [x] Lucide React Native (package.json)

Existing Components (23 total)
------------------------------
  Atoms (12):
    [x] Button          → has story
    [x] Badge           → has story
    [ ] Avatar          → needs story
    [ ] Card            → needs story
    ...

  Molecules (7):
    [ ] SearchBar       → needs story
    [ ] UserCard        → needs story
    ...

  Views (4):
    [ ] Dashboard       → needs story
    [ ] Settings        → needs story
    ...

Storybook Status
----------------
  [ ] Not installed — will be added during scaffold

? Does this look correct? [Yes / Adjust something]
```

**If user selects "Adjust something":**
- Ask which category to adjust
- Present relevant options (e.g., different framework, different component library)
- Re-display overview with changes

**Exit gate:** User confirms overview is correct. Proceed to TARGET (Existing).
```

**Step 2: Commit**

```bash
git add commands/init.md
git commit -m "feat(init): add rich overview display for existing repos"
```

---

## Task 5: Create TARGET and EQUIP for Existing Repos

**Files:**
- Modify: `commands/init.md` (continue after Rich Overview)

**Step 1: Add TARGET (Existing) section**

```markdown
---

## Phase 2: TARGET (Existing)

Confirm the detected platforms and tools.

### Platform Confirmation

```
Detected platforms: mobile-ios, mobile-android

? Confirm target platforms: (multi-select)
  [x] mobile-ios
  [x] mobile-android
  [ ] web-desktop
  [ ] web-mobile
```

### Tool Confirmation

Present each detected tool category for confirmation:

```
Detected configuration:

  Framework:   Expo
  Style:       NativeWind
  Components:  React Native Reusables
  Icons:       Lucide React Native
  Sandbox:     Storybook Native (auto-selected for mobile)

? Is this correct? [Yes / Change something]
```

If user wants to change, loop back to the specific drill-down (same as greenfield flow).

**Exit gate:** Platforms and tools confirmed. Manifest has `target: passed`.

---

## Phase 3: EQUIP (Existing)

Validate adapter availability for confirmed tools. Same as greenfield EQUIP phase.

**Exit gate:** All tool categories have a selection. Manifest has `equip: passed`.
```

**Step 2: Commit**

```bash
git add commands/init.md
git commit -m "feat(init): add TARGET/EQUIP for existing repos"
```

---

## Task 6: Create Manifest Structure for Onboarded Projects

**Files:**
- Modify: `commands/init.md` (update Manifest Output section)

**Step 1: Read current Manifest Output section**

Read the current Manifest Output section to understand its location.

**Step 2: Add onboarded manifest example**

Add a new subsection showing the manifest structure for onboarded projects:

```markdown
### Manifest for Onboarded Projects

When `--existing` is used, the manifest includes additional fields to track existing components:

```json
{
  "version": "4.0",
  "created": "2026-03-03",
  "onboarded": true,
  "goal": "Existing mobile app for task management",
  "vibe": "detected: clean, minimal (from theme analysis)",
  "platforms": ["mobile-ios", "mobile-android"],
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
  },
  "atoms": [
    {
      "name": "Button",
      "file": "components/ui/button.tsx",
      "story": "components/ui/button.stories.tsx",
      "status": "existing",
      "hasStory": true
    },
    {
      "name": "Avatar",
      "file": "components/ui/avatar.tsx",
      "story": null,
      "status": "existing",
      "hasStory": false
    }
  ],
  "screens": [
    {
      "name": "Dashboard",
      "file": "app/(tabs)/index.tsx",
      "story": null,
      "status": "existing",
      "hasStory": false
    }
  ]
}
```

**Key additions for onboarded projects:**
- `onboarded: true` — marks this as an existing project (not greenfield)
- `status: "existing"` — distinguishes discovered components from newly created ones
- `hasStory: boolean` — tracks Storybook story coverage for each component
```

**Step 3: Commit**

```bash
git add commands/init.md
git commit -m "feat(init): add manifest structure for onboarded projects"
```

---

## Task 7: Add Error Handling for Ambiguous Detection

**Files:**
- Modify: `commands/init.md` (add Error Handling section after EQUIP Existing)

**Step 1: Add Error Handling section**

```markdown
---

## Error Handling (Existing Repos)

### Ambiguous Detection

When signals conflict (e.g., multiple component libraries detected):

```
Ambiguous component library detected:
  - React Native Paper (react-native-paper in package.json)
  - React Native Reusables (@react-native-reusables/* in package.json)

? Which is your primary component library?
  > React Native Reusables (Recommended — more components detected)
    React Native Paper
    Both (hybrid setup)
```

### Missing Dependencies

When expected tools aren't fully configured:

```
NativeWind detected in package.json but tailwind.config.js not found.

? How should we proceed?
  > Create tailwind.config.js with detected theme
    Skip NativeWind — use StyleSheet instead
    I'll configure it manually
```

### No Components Found

When component directories are empty or non-standard:

```
No components found in standard locations.

? Where are your UI components located?
  > [Enter path]: src/ui/
```

After user provides path, re-scan that directory.

### Invalid Component Files

When a file exists but can't be parsed:

```
Warning: Could not parse components/Button.tsx
  Error: No default export found

Skipping this file. Component can be added manually later.
```
```

**Step 2: Commit**

```bash
git add commands/init.md
git commit -m "feat(init): add error handling for existing repo detection"
```

---

## Task 8: Update Scaffold Command for Onboarded Projects

**Files:**
- Modify: `commands/scaffold.md` (add onboarded project behavior)

**Step 1: Read current scaffold.md structure**

Identify where to add the onboarded project section.

**Step 2: Add Scaffold Behavior for Onboarded Projects section**

Add after Step 1 (Load Adapter Docs):

```markdown
### Onboarded Project Detection

Before executing scaffold steps, check if this is an onboarded project:

```
if manifest.onboarded === true:
  → Follow Section: Scaffold for Onboarded Projects
else:
  → Follow standard scaffold steps
```

---

## Scaffold for Onboarded Projects

When `manifest.onboarded === true`, scaffold behaves differently:

### Skip Tool Installation

Tools are already installed. Verify they work rather than installing:

```
Verifying tools...
  [x] NativeWind configured (tailwind.config.js found)
  [x] React Native Reusables installed (components/ui/ has 14 files)
  [x] Lucide React Native installed
```

If a required tool is missing, prompt:

```
Missing: @storybook/react-native not found in package.json

? Install Storybook Native now? [Yes / No, skip Storybook]
```

### Install/Configure Storybook Only If Needed

**If `.storybook/` or `.rnstorybook/` doesn't exist:**
- Install Storybook with appropriate variant (native vs web)
- Configure with detected theme
- Set up story autodiscovery

**If Storybook exists:**
- Verify configuration is valid
- Check story coverage

### Generate Stories for Uncovered Components

For each component in manifest with `hasStory: false`:

1. **Parse component file** for:
   - Exported component name
   - Props interface/type
   - Default prop values

2. **Generate story** with:
   - All variants based on prop types
   - argTypes for Storybook controls
   - Realistic example data

**Example generated story:**

```tsx
// Auto-generated by pixel-perfect onboarding
import type { Meta, StoryObj } from '@storybook/react';
import { Avatar } from './avatar';

const meta: Meta<typeof Avatar> = {
  title: 'Components/Avatar',
  component: Avatar,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    src: { control: 'text' },
    fallback: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof Avatar>;

export const Default: Story = {
  args: {
    size: 'md',
    src: 'https://github.com/shadcn.png',
    fallback: 'CN',
  },
};

export const Small: Story = {
  args: { ...Default.args, size: 'sm' },
};

export const Large: Story = {
  args: { ...Default.args, size: 'lg' },
};

export const WithFallback: Story = {
  args: {
    size: 'md',
    fallback: 'JR',
  },
};
```

### Update Manifest After Story Generation

After generating stories:
- Set `hasStory: true` for each covered component
- Update `story` field with the story file path
- Log summary:

```
Stories generated:
  [+] Avatar → components/ui/avatar.stories.tsx
  [+] Card → components/ui/card.stories.tsx
  [+] Input → components/ui/input.stories.tsx
  ... (12 more)

Components with existing stories (unchanged):
  [=] Button → components/ui/button.stories.tsx
  [=] Badge → components/ui/badge.stories.tsx
```
```

**Step 3: Commit**

```bash
git add commands/scaffold.md
git commit -m "feat(scaffold): add behavior for onboarded projects"
```

---

## Task 9: Create Detection Engine Reference Doc

**Files:**
- Create: `docs/adapters/detection-engine.md`

**Step 1: Create the detection engine reference doc**

```markdown
# Detection Engine Reference

This document provides detailed detection patterns for the `--existing` flag on `/pixel-perfect:init`.

## Package.json Detection Patterns

### Framework Detection

| Package | Framework | Priority |
|---------|-----------|----------|
| `expo` | Expo | 1 |
| `next` | Next.js | 1 |
| `react-native` (without expo) | React Native CLI | 2 |
| `vite` + `@vitejs/plugin-react` | Vite | 2 |
| `react-scripts` | Create React App | 3 |

When multiple frameworks detected, use priority order and confirm with user.

### Style System Detection

| Package | Style System | Confidence |
|---------|--------------|------------|
| `nativewind` | NativeWind | High |
| `tailwindcss` (mobile project) | NativeWind | Medium |
| `tailwindcss` (web project) | Tailwind CSS | High |
| `@emotion/react` | Emotion | High |
| `styled-components` | Styled Components | High |

### Component Library Detection

| Package Pattern | Library | Confidence |
|-----------------|---------|------------|
| `@react-native-reusables/*` | React Native Reusables | High |
| `react-native-paper` | React Native Paper | High |
| `@radix-ui/react-*` (3+ packages) | shadcn/ui likely | Medium |
| `@mantine/core` | Mantine | High |
| `@chakra-ui/react` | Chakra UI | High |
| `tamagui` | Tamagui | High |

### Icon Library Detection

| Package | Icon Library |
|---------|--------------|
| `lucide-react-native` | Lucide React Native |
| `lucide-react` | Lucide React |
| `@heroicons/react` | Heroicons |
| `@phosphor-icons/react` | Phosphor Icons |
| `react-native-vector-icons` | React Native Vector Icons |
| `@expo/vector-icons` | Expo Vector Icons |

## Config File Detection

### Priority Order

When detecting tools, config files take precedence over package.json:

1. Config file exists → tool is definitely in use
2. Package in dependencies but no config → tool may be partially configured
3. Package not found → tool not installed

### Config File Patterns

| Tool | Config Files | Validation |
|------|--------------|------------|
| Tailwind | `tailwind.config.js`, `tailwind.config.ts` | Check `content` array has paths |
| shadcn | `components.json` | Check `style` and `aliases` fields |
| Storybook Web | `.storybook/main.ts` | Check `stories` glob patterns |
| Storybook Native | `.rnstorybook/main.ts` | Check `stories` glob patterns |
| Expo | `app.json`, `app.config.js` | Check `expo.name` field |
| Next.js | `next.config.js`, `next.config.ts` | File exists |

## Component Categorization

### Atom Detection

A component is an **atom** if:
- Located in `components/ui/` (shadcn/RNR pattern)
- Has 0-2 imports from other local components
- File is < 200 lines
- Component name is single word (Button, Badge, Input)

### Molecule Detection

A component is a **molecule** if:
- Imports 2-4 other components from the project
- Combines atoms into a functional unit
- Name suggests composition (SearchBar, UserCard, FormField)

### View Detection

A component is a **view** if:
- Located in `screens/`, `views/`, `pages/`, or `app/(tabs)/`
- Imports 4+ other components
- Name ends with Screen, View, Page
- Is a route component (has `export default` and no props or route props only)

## Theme Extraction

### CSS Variables

Parse `:root` block from `global.css` or `globals.css`:

```css
:root {
  --background: 0 0% 100%;     → extract as HSL
  --foreground: 240 10% 3.9%;  → extract as HSL
  --primary: 240 5.9% 10%;     → extract as HSL
}
```

### Tailwind Config

Parse `theme.extend.colors` from `tailwind.config.js`:

```javascript
theme: {
  extend: {
    colors: {
      primary: '#6750A4',       → extract hex
      secondary: 'hsl(262, 83%, 58%)',  → extract HSL
    }
  }
}
```

### Vibe Inference

Based on extracted theme colors, infer a vibe description:

| Color Pattern | Inferred Vibe |
|---------------|---------------|
| High saturation, multiple hues | playful |
| Low saturation, grays | minimal |
| High contrast, limited palette | bold |
| Warm tones, soft saturation | elegant |
| Sharp edges, black/white | brutalist |

Default: "detected: [primary color name] palette"
```

**Step 2: Commit**

```bash
git add docs/adapters/detection-engine.md
git commit -m "docs: add detection engine reference"
```

---

## Task 10: Update Adapters README

**Files:**
- Modify: `docs/adapters/README.md`

**Step 1: Read current README**

Read the current adapters README to understand structure.

**Step 2: Add detection engine reference**

Add to the Available Adapters table:

```markdown
| [Detection Engine](detection-engine.md) | detection | all platforms |
```

And add a new section explaining how adapters support detection:

```markdown
## Detection Support

When onboarding existing repositories (`/pixel-perfect:init --existing`), adapters are used in reverse — to detect if a tool is already in use.

Each adapter's detection rules are consolidated in [detection-engine.md](detection-engine.md), which the AI references during the DISCOVER (Existing) phase.
```

**Step 3: Commit**

```bash
git add docs/adapters/README.md
git commit -m "docs: add detection engine to adapters README"
```

---

## Task 11: Bump Plugin Version

**Files:**
- Modify: `.claude-plugin/plugin.json`

**Step 1: Read current version**

Read plugin.json to get current version.

**Step 2: Bump minor version**

Change version from `4.1.0` to `4.2.0` (minor bump for new feature).

**Step 3: Commit**

```bash
git add .claude-plugin/plugin.json
git commit -m "chore: bump version to 4.2.0"
```

---

## Task 12: Final Verification and Summary Commit

**Files:**
- All modified files

**Step 1: Run git status**

Verify all changes are committed.

**Step 2: Run git log**

Review commit history for this feature.

**Step 3: Create summary**

List all files modified and created:
- `commands/init.md` - Added --existing flag, detection engine, overview display, TARGET/EQUIP for existing repos
- `commands/scaffold.md` - Added onboarded project behavior
- `docs/adapters/detection-engine.md` - New reference doc for detection patterns
- `docs/adapters/README.md` - Added detection engine reference
- `.claude-plugin/plugin.json` - Version bump to 4.2.0

**Step 4: Final commit (if needed)**

If any uncommitted changes remain:

```bash
git add -A
git commit -m "feat: complete existing repo onboarding feature"
```
