# Multi-Platform Support for pixel-perfect

**Date:** 2026-03-31
**Version:** 5.0.0 (breaking manifest schema change)

## Summary

Add support for multiple independent platforms within a single pixel-perfect project. Each platform has its own toolchain (framework, style, components, icons, sandbox), independent phase progression (scaffold through compose), and its own component inventory (atoms, molecules, screens). A new `/pixel-perfect:add-platform` command allows adding platforms after initial setup, even when existing platforms are fully built.

## Motivation

pixel-perfect currently treats platforms as a flat array and stores a single toolchain. This works for projects targeting one platform category (e.g., mobile-ios + mobile-android sharing Expo), but breaks down when a project needs fundamentally different rendering targets (e.g., web + TUI). Each platform category requires different frameworks, style systems, component libraries, and sandbox types.

## Manifest Schema Change

### Before (v4.5.0)

```json
{
  "version": "4.5.0",
  "created": "2026-03-01",
  "goal": "Field service management app for HVAC technicians",
  "vibe": "clean, professional, high-contrast for outdoor use",
  "spec": "PRD.md",
  "references": ["https://servicetitan.com"],
  "platforms": ["web-desktop"],
  "tools": {
    "framework": "vite",
    "style": "tailwind",
    "components": "shadcn",
    "icons": "lucide-react",
    "sandbox": "storybook"
  },
  "phase": "atoms",
  "gates": {
    "discover": "passed",
    "target": "passed",
    "equip": "passed",
    "scaffold": "passed",
    "plan": "passed",
    "atoms": "in-progress",
    "molecules": "pending",
    "compose": "pending"
  },
  "atoms": [...],
  "molecules": [...],
  "screens": [...]
}
```

### After (v5.0.0)

```json
{
  "version": "5.0.0",
  "created": "2026-03-01",
  "goal": "Field service management app for HVAC technicians",
  "vibe": "clean, professional, high-contrast for outdoor use",
  "spec": "PRD.md",
  "references": ["https://servicetitan.com"],
  "gates": {
    "discover": "passed",
    "target": "passed",
    "equip": "passed"
  },
  "platforms": {
    "web-desktop": {
      "tools": {
        "framework": "vite",
        "style": "tailwind",
        "components": "shadcn",
        "icons": "lucide-react",
        "sandbox": "storybook"
      },
      "phase": "atoms",
      "gates": {
        "scaffold": "passed",
        "plan": "passed",
        "atoms": "in-progress",
        "molecules": "pending",
        "compose": "pending"
      },
      "atoms": [],
      "molecules": [],
      "screens": []
    }
  }
}
```

### Key structural changes

- `platforms` changes from **array** to **object**, keyed by platform name
- Per-platform fields: `tools`, `phase`, `gates` (scaffold through compose), `atoms`, `molecules`, `screens`
- Top-level shared fields: `goal`, `vibe`, `spec`, `references`, `version`, `created`
- Top-level `gates`: only discover, target, equip (shared across all platforms)
- Top-level `phase` and `tools` removed (live per-platform now)

### Multi-platform example

```json
{
  "version": "5.0.0",
  "goal": "Field service management app for HVAC technicians",
  "vibe": "clean, professional, high-contrast for outdoor use",
  "spec": "PRD.md",
  "gates": {
    "discover": "passed",
    "target": "passed",
    "equip": "passed"
  },
  "platforms": {
    "web-desktop": {
      "tools": {
        "framework": "vite",
        "style": "tailwind",
        "components": "shadcn",
        "icons": "lucide-react",
        "sandbox": "storybook"
      },
      "phase": "compose",
      "gates": {
        "scaffold": "passed",
        "plan": "passed",
        "atoms": "passed",
        "molecules": "passed",
        "compose": "in-progress"
      },
      "atoms": [...],
      "molecules": [...],
      "screens": [...]
    },
    "tui": {
      "tools": {
        "framework": "bubbletea",
        "style": "lipgloss",
        "components": "bubbletea",
        "icons": "nerd-fonts",
        "sandbox": "tui-sandbox"
      },
      "phase": "scaffold",
      "gates": {
        "scaffold": "in-progress",
        "plan": "pending",
        "atoms": "pending",
        "molecules": "pending",
        "compose": "pending"
      },
      "atoms": [],
      "molecules": [],
      "screens": []
    }
  }
}
```

## Auto-Migration (v4.x to v5.0)

When any command reads `design/manifest.json`, it detects the format:

- **If `platforms` is an array** — old format, auto-migrate:
  1. Convert the array to an object. Since v4.x only had one `tools` object, all platforms in the array shared the same toolchain. Create one entry per platform, each getting a copy of the same `tools` object. (e.g., `["mobile-ios", "mobile-android"]` both get the Expo toolchain.)
  2. Move `tools`, `phase`, `atoms`, `molecules`, `screens` under each platform key.
  3. Split `gates`: discover/target/equip stay top-level; scaffold through compose move per-platform.
  4. Bump manifest `version` to `5.0.0`.
  5. Write back and inform user: `Migrated manifest to v5.0.0 (multi-platform format)`.

- **If `platforms` is an object** — new format, no migration needed.

This is transparent and non-destructive, following the same pattern as the existing YAML-to-JSON migration in process-context.

## New Command: `/pixel-perfect:add-platform`

### Purpose

Add a new platform to an existing pixel-perfect project after init is complete.

### Usage

```
/pixel-perfect:add-platform [platform]
```

### Arguments

- `[platform]`: Optional. The platform to add (e.g., `tui`, `web-desktop`, `mobile-ios`). If omitted, presents the platform selection prompt.

### Preconditions

- `design/manifest.json` must exist
- Top-level gates discover, target, equip must be `passed`

### Flow

1. Read manifest, verify preconditions
2. Show current platforms: `Current platforms: web-desktop (compose, passed)`
3. Present available platforms (excluding already-added ones)
4. Run TARGET drill-down for the new platform only:
   - Framework selection (scoped to platform category)
   - Style system selection
   - Component library selection
   - Icon library selection
5. Auto-select sandbox based on platform (same mapping as init)
6. Run EQUIP validation (adapter check) for the new platform's tools
7. Add new platform entry to `manifest.platforms` with all build gates set to `pending`
8. Inform user of next step

### Output

```
Added platform "tui":
  Framework:   Bubbletea
  Style:       Lipgloss
  Components:  Bubbletea (built-in)
  Icons:       Nerd Fonts
  Sandbox:     tui-sandbox (auto-selected for TUI)

Next: /pixel-perfect:scaffold --platform tui
```

### What it does NOT do

- Does not re-run discover (goal, vibe, spec are project-wide)
- Does not affect existing platforms or their progress
- Does not run scaffold (that's a separate step)

## Theme Carry-Over

During scaffold for a new platform, if a sibling platform already has a theme (its scaffold gate is `passed`), prompt the user:

```
Existing theme found from web-desktop:
  Primary: #2563eb, Secondary: #64748b, Destructive: #dc2626
  Font: Inter, Spacing scale: 4px base

? Translate these values to your tui platform?
  > Yes, adapt for terminal (map to closest ANSI colors, keep semantic names)
    Start fresh (generate new theme from vibe)
    Cherry-pick (I'll tell you which tokens to keep)
```

This is an AskUserQuestion prompt in `commands/scaffold.md` — it fires before theme generation, only when a sibling platform has an established theme.

## Platform-Scoped Commands

All build-phase commands accept a `--platform` flag:

```
/pixel-perfect:scaffold --platform tui
/pixel-perfect:build --platform tui
/pixel-perfect:verify --platform tui
/pixel-perfect:refine --platform tui
```

### Auto-selection rules

- **Single platform:** No flag needed, auto-selected.
- **Multiple platforms, no flag:** Prompt user to choose:
  ```
  Multiple platforms configured:
    1. web-desktop (phase: compose, passed)
    2. tui (phase: scaffold, pending)

  ? Which platform? [1/2]
  ```

### Status command

`/pixel-perfect:status` always shows all platforms:

```
pixel-perfect status

  Project: Field service management app
  Vibe: clean, professional

  web-desktop  [compose passed]   vite + tailwind + shadcn -> storybook
  tui          [scaffold pending] bubbletea + lipgloss -> tui-sandbox
```

## Files to Change

| File | Change |
|------|--------|
| `commands/init.md` | Write manifest in v5.0 format (platforms as object). Update all examples. |
| `commands/scaffold.md` | Accept `--platform` flag. Read `platforms[platform].tools`. Add theme carry-over AskUserQuestion when sibling theme exists. |
| `commands/build.md` | Accept `--platform` flag. Read/write atoms/molecules/screens per-platform. |
| `commands/verify.md` | Accept `--platform` flag. Check gates per-platform. |
| `commands/status.md` | Show all-platform summary view. |
| `commands/refine.md` | Accept `--platform` flag. |
| **New:** `commands/add-platform.md` | New command: TARGET + EQUIP for a single new platform. |
| `skills/process-context/SKILL.md` | Update manifest reading instructions. Add migration logic. Update phase awareness to be per-platform. |
| `.claude-plugin/plugin.json` | Bump version to 5.0.0. Update description to mention multi-platform and TUI. |

### Files NOT changing

- `docs/adapters/*` — Already platform-agnostic reference material. No changes needed.
- `docs/storybook-conventions.md` — Conventions are sandbox-specific, not platform-specific.
- `docs/icon-libraries/*` — Reference docs, no structural changes.

## Sandbox Mapping (unchanged)

The platform-to-sandbox mapping remains the same, now applied per-platform:

| Platform | Sandbox |
|----------|---------|
| `web-desktop`, `web-mobile` | `storybook` |
| `mobile-ios`, `mobile-android` | `storybook-native` |
| `tui`, `cli` | `tui-sandbox` |

For TUI there is only one sandbox type: `tui-sandbox`.
