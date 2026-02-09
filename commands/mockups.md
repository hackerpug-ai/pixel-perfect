---
description: "Generate visual mockups from specification files"
---

# Design Mockups

Generate visual mockups from specification files.

## EXECUTION GATES - MANDATORY

You MUST pass ALL gates IN ORDER before generating mockups.

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
│     YES → CONTINUE to GATE 3                                       │
└─────────────────────────────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────────────────────────────┐
│ GATE 3: CHECK prompts/*.spec.json                                   │
│                                                                     │
│   Any files exist: {dir}/prompts/*.spec.json ?                     │
│                                                                     │
│     NO  → ╔═══════════════════════════════════════════════════════╗│
│           ║ HALT. Execute: /pixel-perfect:prompts {target}        ║│
│           ║ WAIT for prompts to finish. Then RESTART from GATE 3. ║│
│           ╚═══════════════════════════════════════════════════════╝│
│     YES → CONTINUE to mockup generation                            │
└─────────────────────────────────────────────────────────────────────┘
          ↓
     ALL GATES PASSED → Generate mockups
```

**NEVER generate mockups without passing ALL gates. NEVER skip init, plan, or prompts.**

---

## Command Order: init → plan → prompts → **mockups**

## Usage

```
/pixel-perfect:mockups <epic-path> [options]
```

## Arguments

- `<target>`: Epic or feature with spec files. Supports smart path resolution:
  - **Full path**: `.spec/epics/epic-1` → uses exact path
  - **Name only**: `epic-1` → searches spec directory for matching folder

Use `--skip-deps` to error instead of auto-running missing steps.

## Options

- `--skip-init`: Error if design.config.yaml missing instead of running init
- `--key <design_key>`: Generate mockup for single design key only
- `--force`: Regenerate existing mockups
- `--format <format>`: Output format (default: html)

## Design System and Icon Library Integration

When generating HTML mockups, the design system and icon library from config (via the spec file) determine the CSS framework and icon rendering approach.

### CDN Injection

The spec file contains `cdnLinks` and `iconSetup` fields. These are injected into the `<head>` of every generated mockup:

```html
<!DOCTYPE html>
<html>
<head>
  <!-- CSS Framework from design system -->
  <script src="https://cdn.tailwindcss.com"></script>

  <!-- Icon Library from config -->
  <script src="https://unpkg.com/lucide@latest"></script>
  <script>lucide.createIcons();</script>
</head>
```

### Icon Rendering by Library

Each icon library has a different HTML pattern. Use the correct pattern from the icon library reference doc (`docs/icon-libraries/{name}.md`):

| Library | HTML Pattern |
|---------|-------------|
| Lucide | `<i data-lucide="home"></i>` |
| Material Symbols | `<span class="material-symbols-outlined">home</span>` |
| Heroicons | Inline `<svg>` with path data |
| Phosphor | `<i class="ph ph-house"></i>` |
| Tabler | `<i class="ti ti-home"></i>` |
| Font Awesome | `<i class="fa-solid fa-house"></i>` |
| Ionicons | `<ion-icon name="home"></ion-icon>` |
| Feather | `<i data-feather="home"></i>` |
| Remix | `<i class="ri-home-line"></i>` |
| Bootstrap Icons | `<i class="bi bi-house"></i>` |

### Design System CSS Patterns

When a design system is selected, mockups use its CSS patterns:

| Design System | CSS Approach |
|---------------|-------------|
| shadcn/ui | Tailwind utility classes |
| Material Design 3 | Material Web components or Tailwind |
| Chakra UI | Tailwind approximation for mockups |
| Ant Design | Ant Design CDN classes |
| DaisyUI | Tailwind + DaisyUI utility classes |
| Park UI | Panda CSS or Tailwind approximation |
| Mantine | Mantine CDN or Tailwind approximation |

**Important:** Mockups are HTML approximations for blueprint purposes. They use CDN versions of CSS frameworks, not full component library builds. The goal is visual fidelity and structural accuracy, not runtime correctness.

## Input Requirements

- `{epic}/design/prompts/{design_key}.spec.json` must exist
- `{epic}/design/tokens.yaml` recommended for consistent styling
- `{epic}/design/config.yaml` checked for:
  - `designSystem.name` → loads CSS framework CDN
  - `iconLibrary.name` → loads icon CDN and uses correct HTML patterns

## Output

```
{epic}/design/mocks/
├── {design_key}.mock.html    # Visual mockup per screen
└── DESIGN-REVIEW.md           # Review status tracking
```

## Example

```
# Generate all mockups
/pixel-perfect:mockups .spec/epics/epic-1

# Generate single mockup
/pixel-perfect:mockups .spec/epics/epic-1 --key user_profile
```

## Supported Formats

| Format | Extension | Best For |
|--------|-----------|----------|
| html | .mock.html | Web preview, React, Vue |
| png | .mock.png | Mobile, Flutter, native |
| ascii | .mock.txt | CLI applications |
