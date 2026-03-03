# Existing Repository Onboarding Design

**Date:** 2026-03-03
**Status:** Approved
**Author:** Claude + Justin Rich

## Overview

Extend the pixel-perfect plugin to support onboarding existing repositories by detecting installed design systems, UI components, and tooling — then generating Storybook stories and a manifest that tracks what already exists.

## Entry Point

The `init` command gains an `--existing` flag:

```bash
/pixel-perfect:init --existing [directory]
```

This transforms the 3-phase init process:
- **DISCOVER** becomes an inventory phase (detect what exists)
- **TARGET** confirms detected platforms
- **EQUIP** confirms detected tools

---

## Section 1: Detection Engine

### Package.json Signals

| Signal | Detected Tool |
|--------|---------------|
| `tailwindcss` | Tailwind CSS (style) |
| `nativewind` | NativeWind (style) |
| `@radix-ui/*` | shadcn/ui likely (components) |
| `react-native-paper` | React Native Paper (components) |
| `@react-native-reusables/*` | React Native Reusables (components) |
| `lucide-react` | Lucide icons |
| `lucide-react-native` | Lucide React Native icons |
| `@storybook/*` | Storybook already installed |
| `expo` | Expo framework |
| `next` | Next.js framework |
| `react-native` | React Native (mobile platform) |

### Config File Detection

| File | Confirms |
|------|----------|
| `tailwind.config.js/ts` | Tailwind active |
| `nativewind.config.js` | NativeWind active |
| `components.json` | shadcn/ui configuration |
| `.storybook/` | Storybook configured |
| `app.json` / `app.config.js` | Expo project |
| `next.config.js` | Next.js project |

### Component Discovery

Scan common component directories:
- `src/components/`
- `components/`
- `app/components/`
- `lib/components/`

For each `.tsx`/`.jsx` file found:
1. Check if matching `.stories.tsx` exists
2. Parse exports to identify component names
3. Detect prop types from TypeScript interfaces or PropTypes
4. Categorize as atom/molecule/view based on:
   - Import depth (atoms import few/no other components)
   - File location (screens/, views/ = views)
   - Naming conventions

### Theme Detection

Look for theme files:
- `tailwind.config.js` → extract `theme.extend.colors`
- `theme.ts` / `theme.js` → parse color/spacing tokens
- `global.css` → extract CSS variables
- React Native Paper `DefaultTheme` customizations

---

## Section 2: Rich Overview Display

After detection, present a categorized overview:

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

---

## Section 3: Manifest Structure

The manifest for onboarded projects includes an `onboarded` flag and tracks existing components:

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
  "phase": "scaffold",
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

Key additions:
- `onboarded: true` — marks this as an existing project
- `status: "existing"` — distinguishes from newly created components
- `hasStory: boolean` — tracks story coverage

---

## Section 4: Scaffold Behavior for Onboarded Projects

When `onboarded: true`, scaffold behaves differently:

### Skip Tool Installation
Tools are already installed. Scaffold verifies they work rather than installing:

```
Verifying tools...
  [x] NativeWind configured (tailwind.config.js)
  [x] React Native Reusables installed
  [x] Lucide React Native installed
```

### Install/Configure Storybook Only If Needed
If `.storybook/` doesn't exist:
- Install Storybook with appropriate variant (native vs web)
- Configure with detected theme
- Set up story autodiscovery

If Storybook exists:
- Verify MCP addon is installed
- Check story coverage

### Generate Stories for Uncovered Components
For each component with `hasStory: false`:

1. Parse component file for:
   - Exported component name
   - Props interface/type
   - Default prop values

2. Generate story with:
   - All variants based on prop types
   - argTypes for Storybook controls
   - Realistic example data

Example generated story:
```tsx
// Auto-generated by pixel-perfect onboarding
import type { Meta, StoryObj } from '@storybook/react';
import { Avatar } from './avatar';

const meta: Meta<typeof Avatar> = {
  title: 'Components/Avatar',
  component: Avatar,
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
After generating stories, update manifest:
- Set `hasStory: true` for covered components
- Move to ATOMS phase for verification

---

## Section 5: Error Handling

### Ambiguous Detection
When signals conflict (e.g., both `react-native-paper` and `@react-native-reusables` in package.json):

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

---

## Section 6: Phase Progression

After onboarding completes:

1. **DISCOVER** (complete) — Inventory captured
2. **TARGET** (complete) — Platforms confirmed
3. **EQUIP** (complete) — Tools confirmed
4. **SCAFFOLD** (next) — Storybook setup + story generation
5. **ATOMS** — Verify all components render in Storybook
6. **COMPOSE** — Verify screens composed from atoms
7. **INTEGRATE** — Wire navigation/state (if needed)

The onboarded project joins the standard process at SCAFFOLD, with the manifest pre-populated from detection.

---

## Implementation Scope

### Files to Modify
- `commands/init.md` — Add `--existing` flag and detection flow

### Files to Create
- `commands/onboard.md` (optional) — Standalone onboard command as alias
- `docs/adapters/detection-engine.md` — Detection patterns reference

### Adapter Updates
Each adapter gains a "detection" section:
- How to detect if this tool is in use
- How to extract theme/config from existing setup
- How to generate stories for components using this tool

---

## Success Criteria

1. Running `/pixel-perfect:init --existing` on a React Native Reusables project:
   - Detects framework, style, components, icons
   - Shows accurate component inventory
   - Generates working Storybook stories for uncovered components
   - Creates valid manifest with `onboarded: true`

2. Generated stories:
   - Compile without errors
   - Show all component variants
   - Have working Storybook controls

3. Storybook runs and displays all existing + generated stories
