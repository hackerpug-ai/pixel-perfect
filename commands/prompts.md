---
description: "Generate specification files from views.yaml for mockup generation"
---

# Design Prompts

Generate specification files from design artifacts for mockup generation.

## EXECUTION GATES - MANDATORY

You MUST pass ALL gates IN ORDER before generating specs.

```
┌─────────────────────────────────────────────────────────────────────┐
│ GATE 0: RESOLVE TARGET                                              │
│                                                                     │
│   target provided?                                                  │
│     YES → dir = {target}/design/                                    │
│     NO  → dir = find nearest design.config.yaml (search upward)    │
└─────────────────────────────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────────────────────────────┐
│ GATE 1: CHECK design.config.yaml                                    │
│                                                                     │
│   File exists: {dir}/design.config.yaml ?                          │
│                                                                     │
│     NO  → ╔═══════════════════════════════════════════════════════╗│
│           ║ HALT. Execute: /pixel-perfect:init {target}           ║│
│           ║ WAIT for init to finish. Then RESTART from GATE 1.    ║│
│           ╚═══════════════════════════════════════════════════════╝│
│     YES → CONTINUE to GATE 2                                       │
└─────────────────────────────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────────────────────────────┐
│ GATE 2: CHECK views.yaml                                            │
│                                                                     │
│   File exists: {dir}/views.yaml ?                                  │
│                                                                     │
│     NO  → ╔═══════════════════════════════════════════════════════╗│
│           ║ HALT. Execute: /pixel-perfect:plan {target}           ║│
│           ║ WAIT for plan to finish. Then RESTART from GATE 2.    ║│
│           ╚═══════════════════════════════════════════════════════╝│
│     YES → CONTINUE to spec generation                              │
└─────────────────────────────────────────────────────────────────────┘
          ↓
     ALL GATES PASSED → Generate spec files
```

**NEVER generate specs without passing ALL gates. NEVER skip init or plan.**

---

## Command Order: init → plan → **prompts** → mockups

## Usage

```
/pixel-perfect:prompts <epic-path> [options]
```

## Arguments

- `<target>`: Epic or feature with design artifacts. Supports smart path resolution:
  - **Full path**: `.spec/epics/epic-1` → uses exact path
  - **Name only**: `epic-1` → searches spec directory for matching folder

Use `--skip-deps` to error instead of auto-running missing steps.

## Options

- `--skip-init`: Error if design.config.yaml missing instead of running init
- `--key <design_key>`: Generate spec for single design key only
- `--force`: Regenerate existing specs

## Input Requirements

- `{epic}/design/views.yaml` must exist
- `{epic}/design/screens.yaml` recommended
- `{epic}/design/components.yaml` recommended
- `{epic}/design/tokens.yaml` recommended

## Output

```
{epic}/design/prompts/
├── {design_key}.spec.json    # Specification per screen
└── manifest.json              # Index of all specs
```

## Example

```
# Generate all specs
/pixel-perfect:prompts .spec/epics/epic-1

# Generate single spec
/pixel-perfect:prompts .spec/epics/epic-1 --key user_profile
```

## Design System and Icon Library Context

After gates pass, read config for design system and icon library:

```
config.designSystem.name set?
  YES → Read docs/design-systems/{name}.md for component names and CDN links
config.iconLibrary.name set?
  YES → Read docs/icon-libraries/{name}.md for icon naming conventions
```

When configured, specs include:
- `metadata.designSystem` and `metadata.iconLibrary` fields
- `cdnLinks` with CSS framework + icon library CDN URLs
- `iconSetup` with HTML snippet for icon library initialization
- Component names mapped to design system equivalents
- Icon names using the correct library naming convention

## Spec Format

Each `.spec.json` contains:
- Screen metadata (including `designSystem` and `iconLibrary` if configured)
- Component specifications (using design system component names if configured)
- Layout requirements
- Token references (using design system token format if configured)
- Interaction states
- **CDN links** for CSS framework and icon library (if design system configured)
- **Icon references** with library-specific icon names for each interactive element

### TUI/CLI Context in Specs

When `config.yaml` has `platforms` containing `tui` or `cli`, specs include additional terminal-specific metadata:

```json
{
  "metadata": {
    "design_key": "dashboard_main",
    "platform": "tui",
    "terminalDimensions": {
      "width": 120,
      "height": 36
    },
    "outputFormats": ["html", "blueprint"]
  }
}
```

- `terminalDimensions`: Read from `tokens.yaml` under `cli.terminal.width` / `cli.terminal.height`. Defaults: 80x24 (CLI), 120x36 (TUI).
- `outputFormats`: Tells the mockup command which files to generate. Defaults to `["html", "blueprint"]` for TUI/CLI. Set to `["blueprint"]` when `--ascii-only` is intended.

### Design System Context in Specs

When a design system and/or icon library is configured:

```json
{
  "metadata": {
    "design_key": "user_profile",
    "designSystem": "shadcn-ui",
    "iconLibrary": "lucide"
  },
  "cdnLinks": {
    "css": "https://cdn.tailwindcss.com",
    "icons": "https://unpkg.com/lucide@latest"
  },
  "iconSetup": "<script src=\"https://unpkg.com/lucide@latest\"></script>\n<script>lucide.createIcons();</script>",
  "icons": [
    { "action": "back", "iconName": "arrow-left", "size": "icon-lg" },
    { "action": "settings", "iconName": "settings", "size": "icon-lg" },
    { "action": "notifications", "iconName": "bell", "size": "icon-lg" }
  ]
}
```
