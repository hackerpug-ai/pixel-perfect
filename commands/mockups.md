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
- `--deviceFrame`: Render mockup within a device-appropriate frame (mobile, TUI, etc.)

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
| ansi | .mock.ans | TUI applications (Bubble Tea, Ratatui, Textual) |

## Device Frames

When `--deviceFrame` is enabled, mockups are rendered within an appropriate device frame that maintains the target platform's aspect ratio. This helps visualize how the design will appear in its intended context.

### Device Frame Types by Platform

| Platform | Frame Type | Aspect Ratio | Dimensions |
|----------|------------|--------------|------------|
| `mobile-ios` | iPhone frame | 9:19.5 | 390 × 844 |
| `mobile-android` | Android phone frame | 9:20 | 360 × 800 |
| `tablet-ios` | iPad frame | 3:4 | 1024 × 1366 |
| `tablet-android` | Android tablet frame | 3:4 | 800 × 1067 |
| `web-mobile` | Mobile browser frame | 9:16 | 375 × 667 |
| `web-desktop` | Desktop browser frame | 16:9 | 1920 × 1080 |
| `cli` | Terminal window frame | Variable | 80 × 24 (default) |
| `tui` | Terminal emulator frame | Variable | 120 × 36 (default) |

### Frame Implementation

When `--deviceFrame` is active, the generated HTML includes:

1. **Outer container** styled as the device frame with realistic bezels, borders, and shadows
2. **Aspect-ratio enforcement** using CSS to maintain correct proportions
3. **Platform-specific styling** (notch for iOS, camera hole for Android, etc.)
4. **Prototyping comment** in HTML source:

```html
<!--
  DEVICE FRAME: FOR PROTOTYPING PURPOSES ONLY
  This frame is a visualization aid for design review.
  DO NOT include this frame in the final implementation.
  The frame represents the target aspect ratio and form factor.
-->
<div class="device-frame iphone-14">
  <div class="device-screen">
    <!-- Actual mockup content goes here -->
  </div>
</div>
```

### Usage Examples

```bash
# Generate mobile mockups with iPhone frame
/pixel-perfect:mockups auth-flow --deviceFrame

# Generate with specific key and device frame
/pixel-perfect:mockups .spec/epics/epic-1 --key user_profile --deviceFrame

# Desktop mockups with browser frame (inherits from config platforms)
/pixel-perfect:mockups dashboard --deviceFrame
```

### Platform Auto-Detection

The device frame type is automatically selected based on the `platforms` array in `design/config.yaml`:

- **Single platform**: Uses matching frame
- **Multiple platforms**: Uses primary/first platform's frame
- **Mobile + web**: Prioritizes mobile frame (most constrained)
- **CLI/TUI**: Uses terminal window frame with configurable dimensions

### Custom Frame Dimensions

For CLI/TUI platforms, frame dimensions can be customized via tokens:

```yaml
# tokens.yaml
cli:
  terminal:
    width: 120      # Terminal columns
    height: 36      # Terminal rows
    font: "monospace"
```

### Removing the Frame

To view mockups without the device frame, simply omit the flag:

```bash
/pixel-perfect:mockups auth-flow  # No frame, full-width responsive
```
