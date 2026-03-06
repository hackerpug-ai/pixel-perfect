---
description: "Show phase progress, gate status, and component tracking for the current project"
---

# Project Status

Display the current state of the pixel-perfect build process: phase progress, gate statuses, tool choices, design token stories, controls coverage, and component/screen tracking.

## Usage

```
/pixel-perfect:status [directory]
```

## Arguments

- `[directory]`: Directory to check. Defaults to current directory.

## What It Shows

Reads `design/manifest.json` and displays:

1. **Phase overview** - All 6 phases with gate status
2. **Project info** - Goal, vibe, platforms, framework, tools
3. **frontend-design detection** - Whether the frontend-design plugin is available
4. **Design Token stories** - Status of Colors, Typography, Spacing, Icons stories
5. **Controls coverage** - How many atoms have all props wired to Storybook controls
6. **Molecule progress** - Molecules built and verified
7. **Component progress** - Atoms built and verified
8. **Screen progress** - Screens composed and verified
8. **Next action** - What to do next based on current phase

## Status Icons

| Icon | Meaning |
|------|---------|
| `[x]` | Gate passed |
| `[~]` | In progress |
| `[ ]` | Pending |

## Sample Output

```
pixel-perfect v4.3.1 — Project Status
====================================

Goal: Field service management app for HVAC technicians
Vibe: clean, professional, high-contrast for outdoor use

Phases:
  [x] 1. DISCOVER    — Goal and vibe captured
  [x] 2. TARGET      — mobile-ios, mobile-android
  [x] 3. EQUIP       — expo + nativewind + react-native-paper + storybook
  [x] 4. SCAFFOLD    — Project structure ready, theme configured
  [x] 4b. PLAN       — Build plan confirmed
  [~] 5. ATOMS       — 3/5 components verified
  [ ] 5b. MOLECULES  — 0/2 molecules identified
  [ ] 6. COMPOSE     — 0/2 screens verified

Tools:
  Framework:  Expo
  Style:      NativeWind        (adapter: tailwind.md)
  Components: React Native Paper (adapter: react-native-paper.md)
  Sandbox:    Storybook Native    (adapter: storybook-native.md)

frontend-design: available (aesthetic gates active)

Design Token Stories:
  [x] Design System/Colors       — 4 color groups rendered
  [x] Design System/Typography   — 15 type variants rendered
  [x] Design System/Spacing      — 7-step scale rendered
  [x] Design System/Icons        — 10 project icons rendered

Controls Coverage: 3/5 atoms have full argTypes controls

Atoms (3/5 verified):
  [x] StatusBadge     src/components/StatusBadge.tsx        (controls: yes)
  [x] JobCard         src/components/JobCard.tsx            (controls: yes)
  [x] DateChip        src/components/DateChip.tsx           (controls: yes)
  [~] SectionHeader   src/components/SectionHeader.tsx      (controls: pending)
  [ ] ActionButton    src/components/ActionButton.tsx       (controls: pending)

Molecules (0/2 identified):
  [ ] JobRow          src/molecules/JobRow.tsx
      atoms: StatusBadge, DateChip
  [ ] ActionPanel     src/molecules/ActionPanel.tsx
      atoms: ActionButton, StatusBadge

Screens (0/2 verified):
  [ ] TodayFeed       src/screens/TodayFeed.tsx
      atoms: StatusBadge, JobCard, DateChip, SectionHeader
  [ ] JobDetail       src/screens/JobDetail.tsx
      atoms: StatusBadge, ActionButton

Next: Continue building atoms
  /pixel-perfect:build    — Resume building from current phase
  /pixel-perfect:verify   — Run gate checks for atoms phase
```

## No Manifest Found

If no `design/manifest.json` exists in the directory or parents:

```
pixel-perfect v4.3.1 — Project Status
====================================

Status: Not initialized

No design/manifest.json found in this directory or parent directories.

Next: /pixel-perfect:init
  This will walk you through project setup (discover → target → equip)
```

## frontend-design Detection

The status command checks if the `frontend-design` plugin is available at runtime:

- **Available**: Aesthetic gates are active during atoms and compose phases. Components get font pairing, color hierarchy, and spatial composition guidance.
- **Not available**: Process gates still enforced (files exist, tests pass). Aesthetic quality depends on AI's general knowledge. A warning is shown:

```
frontend-design: NOT DETECTED (aesthetic gates degraded)
  Install the frontend-design plugin for distinctive visual output.
  Without it, components may look generic.
```

## Workflow Integration

Status is informational only — it reads the manifest and displays it. It does not modify any files.

Use it:
- Before starting work to see where things stand
- After running build or verify to confirm progress
- To determine what command to run next
