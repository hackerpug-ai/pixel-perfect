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

1. **Project info** - Goal, vibe (shared across all platforms)
2. **Platform overview** - All platforms with phase status and tool summary
3. **Per-platform detail** - For each platform: gates, tools, atoms, molecules, screens
4. **frontend-design detection** - Whether the frontend-design plugin is available
5. **Next action** - What to do next based on platform states

## Status Icons

| Icon | Meaning |
|------|---------|
| `[x]` | Gate passed |
| `[~]` | In progress |
| `[ ]` | Pending |

## Sample Output

```
pixel-perfect v5.0.0 — Project Status
====================================

Goal: Field service management app for HVAC technicians
Vibe: clean, professional, high-contrast for outdoor use

Platforms:
  web-desktop  [compose passed]     vite + tailwind + shadcn -> storybook
  tui          [scaffold pending]   bubbletea + lipgloss -> tui-sandbox

--- web-desktop ---

  Phases:
    [x] SCAFFOLD    — Project structure ready, theme configured
    [x] PLAN        — Build plan confirmed
    [x] ATOMS       — 5/5 components verified
    [x] MOLECULES   — 2/2 molecules verified
    [x] COMPOSE     — 2/2 screens verified

  Tools:
    Framework:  Vite
    Style:      Tailwind CSS      (adapter: tailwind.md)
    Components: shadcn/ui         (adapter: shadcn.md)
    Icons:      Lucide React      (adapter: n/a)
    Sandbox:    Storybook         (adapter: storybook.md)

  Atoms (5/5 verified):
    [x] StatusBadge     src/components/StatusBadge.tsx        (controls: yes)
    [x] JobCard         src/components/JobCard.tsx            (controls: yes)
    [x] DateChip        src/components/DateChip.tsx           (controls: yes)
    [x] SectionHeader   src/components/SectionHeader.tsx      (controls: yes)
    [x] ActionButton    src/components/ActionButton.tsx       (controls: yes)

  Screens (2/2 verified):
    [x] TodayFeed       src/screens/TodayFeed.tsx
    [x] JobDetail       src/screens/JobDetail.tsx

--- tui ---

  Phases:
    [ ] SCAFFOLD    — Pending
    [ ] PLAN        — Pending
    [ ] ATOMS       — Pending
    [ ] MOLECULES   — Pending
    [ ] COMPOSE     — Pending

  Tools:
    Framework:  Bubbletea
    Style:      Lipgloss          (adapter: lipgloss.md)
    Components: Bubbletea         (adapter: bubbletea.md)
    Icons:      Nerd Fonts        (adapter: n/a)
    Sandbox:    tui-sandbox       (adapter: tui-sandbox.md)

frontend-design: available (aesthetic gates active)

Next: Scaffold the tui platform
  /pixel-perfect:scaffold --platform tui
```

## No Manifest Found

If no `design/manifest.json` exists in the directory or parents:

```
pixel-perfect v5.0.0 — Project Status
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
