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
│     NO  → dir = find nearest config.yaml or design.config.yaml     │
│            (search upward through parent directories)               │
└─────────────────────────────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────────────────────────────┐
│ GATE 1: RESOLVE CONFIG (Cascading Lookup)                          │
│                                                                     │
│   Search for config files in order:                                │
│     1. {dir}/config.yaml              (preferred)                  │
│     2. {dir}/design.config.yaml       (backward compat)            │
│     3. {parent}/design/config.yaml    (search upward)              │
│     4. {parent}/design/design.config.yaml (search upward)          │
│                                                                     │
│   ANY found → CONTINUE to GATE 2                                   │
│                                                                     │
│   NONE found →                                                     │
│           ╔═══════════════════════════════════════════════════════╗│
│           ║ HALT. Execute: /pixel-perfect:init {target}           ║│
│           ║ WAIT for init to finish. Then RESTART from GATE 1.    ║│
│           ╚═══════════════════════════════════════════════════════╝│
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

- `--skip-init`: Error if config missing instead of running init
- `--key <design_key>`: Generate mockup for single design key only
- `--force`: Regenerate existing mockups
- `--format <format>`: Output format (default: html)
- `--deviceFrame`: Render mockup within a device-appropriate frame (mobile, TUI, etc.)
- `--ascii-only`: Generate only ASCII blueprints (no HTML/ANSI mockups). For TUI/CLI projects that don't need HTML previews.

## Design System and Icon Library Integration

When generating HTML mockups, the design system and icon library from config (via the spec file) determine the CSS framework and icon rendering approach.

### Required HTML Comments for AI Agents

Every generated mockup MUST include the following HTML comment block immediately after `<html>`. This tells downstream AI Engineer Agents what the file is and how to use it:

```html
<!DOCTYPE html>
<html>
<!--
  ============================================================
  AI ENGINEER AGENT: IMPLEMENTATION GUIDANCE
  ============================================================
  This file is a DESIGN MOCKUP — a visual reference only.
  It is NOT production code. Do NOT copy this HTML verbatim.

  PURPOSE: Use this mockup as a visual blueprint to understand
  layout, component hierarchy, spacing, colors, and typography.
  Then implement using your project's actual framework, component
  library, and build system.

  WHAT TO EXTRACT:
  - Layout structure and component hierarchy
  - Spacing, sizing, and alignment relationships
  - Color values and typography choices
  - Component states and interaction patterns

  WHAT TO IGNORE:
  - CDN script tags (use your project's bundled dependencies)
  - Inline styles (translate to your styling system)
  - Raw HTML structure (translate to your component framework)
  ============================================================
-->
<head>
  ...
</head>
```

When `--deviceFrame` is enabled, also include the frame-specific comment (see [Device Frames](#device-frames) section).

### Mockup Annotation Requirements (HTML)

To maximize first-pass fidelity for AI code generation, **every `.mock.html` must include the annotations below**.

#### 1) Component Boundary Comments

Wrap distinct logical components with explicit HTML comments. This prevents ambiguous component slicing during implementation.

```html
<!-- COMPONENT: AgentCard (Props: agent, status) -->
<div class="agent-item selected">
  ...
</div>
<!-- /COMPONENT: AgentCard -->
```

Rules:
- Use a stable component name for the same UI object across all mockups.
- Include Props when known (based on spec or reasonable inference).
- Prefer one component per repeated list item.

#### 2) Dynamic Field Markers

Mark variable content explicitly so the AI can distinguish **data** from **labels**.

```html
<div class="agent-name" data-field="agent.name">AGENT ALPHA</div>
<div class="agent-health">ELAPSED: <span data-field="agent.runtime">12:45</span></div>
```

Rules:
- Apply `data-field` to the **exact element** containing dynamic text.
- Use dot-paths (`user.name`, `agent.runtime`, `task.status`) for clarity.
- For lists, optionally mark the container with `data-collection`:

```html
<ul class="mission-list" data-collection="missions">
  <!-- COMPONENT: MissionRow (Props: mission) -->
  <li class="mission-row">
    <span data-field="mission.title">System Check</span>
  </li>
  <!-- /COMPONENT: MissionRow -->
</ul>
```

#### 3) State Variations

Include hidden variants for key states so conditional logic is implemented correctly.

```html
<!-- STATE VARIANTS: TaskCard -->
<section class="task-card" data-state="default">
  ...
</section>

<section class="task-card" data-state="loading" hidden aria-hidden="true">
  <div class="skeleton-line"></div>
  <div class="skeleton-line"></div>
</section>

<section class="task-card" data-state="error" hidden aria-hidden="true">
  <div class="error-title" data-field="error.title">Connection Lost</div>
  <div class="error-body" data-field="error.message">Retry in 10 seconds</div>
</section>
<!-- /STATE VARIANTS: TaskCard -->
```

Rules:
- Use `data-state` for each variant.
- Hide non-default variants with `hidden` + `aria-hidden="true"`.
- Keep variant markup structurally similar to the default state.

#### 4) ARIA Roles for Interactive Patterns

Add ARIA roles and relationships so the AI infers interaction semantics.

**Tabs example:**
```html
<div class="tabs" role="tablist" aria-label="Crew Tabs">
  <button role="tab" aria-selected="true" aria-controls="panel-crew" id="tab-crew">Crew</button>
  <button role="tab" aria-selected="false" aria-controls="panel-status" id="tab-status">Status</button>
</div>
<section role="tabpanel" id="panel-crew" aria-labelledby="tab-crew">...</section>
<section role="tabpanel" id="panel-status" aria-labelledby="tab-status" hidden aria-hidden="true">...</section>
```

Apply the same pattern for dialogs (`role="dialog"`), menus (`role="menu"`/`menuitem`), listboxes, and accordions.

#### 5) CSS Variable Definitions

If the mockup uses `var(--token-name)`, **define those variables in a `:root` block** near the top of the `<head>`.

```html
<style>
:root {
  --moonlit-violet: #6c5ce7;
  --surface-1: #0f1115;
  --text-primary: #f5f7fb;
}
</style>
```

This preserves token names and allows AI to map visual values to design tokens.

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
├── {design_key}.mock.html         # Visual mockup per screen
├── {design_key}.blueprint.txt     # ASCII blueprint (TUI/CLI platforms only)
└── DESIGN-REVIEW.md               # Review status tracking
```

**TUI/CLI platforms**: Both `.mock.html` and `.blueprint.txt` are generated by default.
**With `--ascii-only`**: Only `.blueprint.txt` files are generated (no HTML/ANSI).

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
| blueprint | .blueprint.txt | ASCII blueprint for TUI/CLI (auto-generated alongside mockups) |

## ASCII Blueprints (TUI/CLI Platforms)

When `config.yaml` has `platforms` containing `tui` or `cli`, an ASCII blueprint is **automatically generated alongside** the standard mockup for each design key. This gives developers a plain-text reference that shows exactly how the interface will render in a terminal.

### Auto-Generation Rules

```
config.platforms includes "tui" or "cli"?
  YES → Generate {design_key}.blueprint.txt for EVERY design key
        (in addition to .mock.html/.mock.ans unless --ascii-only)
  NO  → No blueprints generated (standard behavior)

--ascii-only flag set?
  YES → Generate ONLY .blueprint.txt files. Skip HTML/ANSI entirely.
  NO  → Generate both mockup + blueprint (default for TUI/CLI)
```

**`--ascii-only` with non-TUI/CLI platforms**: The flag works regardless of platform. When used on a web project, it still generates `.blueprint.txt` files — useful for quick structural sketches without full HTML rendering.

### Blueprint Format

Each `.blueprint.txt` file contains:

1. **Header comment** with dimensions and design key
2. **ASCII layout** using Unicode box drawing characters
3. **Component annotations** showing widget types and key bindings
4. **Footer** with navigation hints and status bar

```
# Blueprint: dashboard_main
# Dimensions: 120 x 36 (columns x rows)
# Platform: tui
# ─────────────────────────────────────

┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Dashboard                                                                                          [?] Help  [Q]uit │
├────────────────┬─────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Sidebar        │ Main Content                                                                                       │
│                │                                                                                                     │
│ > Projects     │  ┌─ Active Tasks ─────────────────────────────────────────────────────────────────────────────────┐ │
│   Settings     │  │ NAME              STATUS      PRIORITY    DUE        ASSIGNEE                                 │ │
│   Help         │  │ Fix login bug     ● Active    High        Jan 15     @alice                                   │ │
│                │  │ Add dark mode     ○ Pending   Medium      Jan 20     @bob                                     │ │
│                │  │ Update docs       ○ Pending   Low         Jan 25     @carol                                   │ │
│                │  └────────────────────────────────────────────────────────────────────────────────────────────────┘ │
│                │                                                                                                     │
│                ├─────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                │ Preview                                                                                             │
│                │ Select a task to see details...                                                                     │
├────────────────┴─────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ ↑↓ Navigate  Enter Select  / Search  Tab Switch Panel                                              CPU: ██░░ 45%   │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Blueprint Generation Rules

1. **Dimensions**: Read from `tokens.yaml` under `cli.terminal.width` / `cli.terminal.height`. Defaults: 80x24 (CLI), 120x36 (TUI).
2. **Box drawing**: Use Unicode characters (`┌ ┐ └ ┘ │ ─ ├ ┤ ┬ ┴ ┼`). Use rounded corners (`╭ ╮ ╰ ╯`) for inner panels when vibe is `modern` or `playful`.
3. **Layout**: Follow TUI layout patterns from `docs/ui-design-standards.md` PATTERN 15 (panel split, tabbed, dashboard, form).
4. **Components**: Map spec components to TUI widgets using the TUI Component Mapping table in `docs/ui-design-standards.md`.
5. **Status bar**: Always include a bottom status bar showing key bindings for the current view.
6. **Content**: Use realistic placeholder content (not lorem ipsum) — show representative data that communicates the interface purpose.
7. **Focus indicators**: Show the focused/selected element with `>` prefix or reverse-style bracket markers `[selected]`.

### Usage Examples

```bash
# TUI project: generates both HTML mockup + ASCII blueprint
/pixel-perfect:mockups my-tui-app

# TUI project: generate only ASCII blueprints (no HTML)
/pixel-perfect:mockups my-tui-app --ascii-only

# Single blueprint for one screen
/pixel-perfect:mockups my-tui-app --key dashboard_main --ascii-only

# Web project: force blueprint generation (even without TUI platform)
/pixel-perfect:mockups my-web-app --ascii-only
```

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
4. **Prototyping comment** in HTML source (required for AI Engineer Agents):

```html
<!--
  ============================================================
  AI ENGINEER AGENT: DEVICE FRAME — DO NOT IMPLEMENT
  ============================================================
  The outer frame (.device-frame-container, .device-frame,
  .device-screen) exists ONLY to preserve the design's target
  aspect ratio during review. It is a visualization wrapper.

  DO NOT include any frame markup or frame CSS in the final UI.
  Only implement the content INSIDE .device-screen.

  Target device: {platform} ({width} × {height})
  ============================================================
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
