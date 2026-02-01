---
description: "Initialize design project with interactive preplanning: requirements discovery, device targeting, design vibe"
---

# Design Initialization

Interactive preplanning phase that configures your design project before generating artifacts.

## EXECUTION REQUIREMENT

Init is STEP 1 of the workflow. It MUST complete when no config is available.

```
┌─────────────────────────────────────────────────────────────────────┐
│ INIT CREATES: design.config.yaml (OPTIONAL with design system)     │
│                                                                     │
│ Config resolution order (cascading):                                │
│   1. Local design.config.yaml (most specific)                      │
│   2. Project design system (if enabled)                            │
│   3. Project config (.pixel-perfect/config.json)                   │
│   4. Built-in defaults                                             │
│                                                                     │
│ When to run init:                                                  │
│   • No local config AND no design system → MUST RUN INIT           │
│   • Design system exists, want local overrides → RUN INIT          │
│   • Design system exists, no overrides needed → SKIP INIT          │
│                                                                     │
│ Init MUST ask the user about:                                      │
│   1. Requirements file location (or paste content)                 │
│   2. Target platforms (multi-select: iOS, Android, Web, etc.)      │
│   3. Design vibe (modern, minimal, playful, corporate, etc.)       │
│                                                                     │
│ NEVER auto-skip these questions. NEVER use defaults without asking.│
└─────────────────────────────────────────────────────────────────────┘
```

---

## Usage

```
/pixel-perfect:init <target> [options]
```

## Arguments

- `<target>`: Epic or feature to initialize. Supports smart path resolution:
  - **Full path**: `.spec/epics/epic-1` → uses exact path
  - **Name only**: `epic-1` → searches spec directory for matching folder
  - **Nested**: `lunch-menu` → finds `.spec/epics/epic-1/sprints/lunch-menu`

## Options

- `--requirements <path>`: Use this file as requirements (skips discovery search)
- `--force`: Overwrite existing `design.config.yaml`
- `--quick`: Auto-accept inferred values with minimal prompts
- `--platforms <list>`: Pre-set platforms (comma-separated: `mobile-ios,web-desktop`)
- `--vibe <name>`: Pre-set design vibe (`minimal`, `modern`, `playful`, etc.)

## What It Does

This command walks you through setting up your design project:

1. **Load Project Config** - Reads `.pixel-perfect/config.json` for defaults (if exists)
2. **Detect Design System** - Checks for shared design artifacts (if `designSystem` enabled)
3. **Check if Config Needed** - If design system exists, asks if local overrides are needed
4. **Requirements Discovery** - Finds or asks for your PRD/requirements document
5. **Device Targeting** - Infers and confirms which platforms you're designing for
6. **Design Vibe** - Captures the aesthetic direction for your mockups
7. **URL Analysis** - Fetches and analyzes any reference URLs in requirements
8. **Configuration** - Saves preferences to `{epic}/design/design.config.yaml` (override file)

**Note:** When a design system exists, `design.config.yaml` becomes an **override file**. Only the values specified locally will override the design system. Unspecified values inherit from the design system.

## Project Configuration

If `.pixel-perfect/config.json` exists in your project root, init uses it for:
- **Search root**: Where to search for targets (default: project root)
- **Pre-selected platforms**: Skip platform multi-select if configured
- **Default vibe**: Skip vibe question if configured
- **Naming style**: Default design key naming convention

Example `.pixel-perfect/config.json`:
```json
{
  "specRoot": ".",
  "defaults": {
    "platforms": ["mobile-ios", "web-desktop"],
    "vibe": "modern"
  }
}
```

If no project config exists, init searches from project root for your target folder.

## Preplanning Workflow

### Step 0: Design System Detection & Config Need

**If `designSystem.enabled` is `true` in project config:**

Check for existing global design artifacts at the configured path (default: `/design`).

```
Checking for design system...

Design system detected at .spec/design-system/:
  ✓ paradigm.yaml (design patterns)
  ✓ tokens.yaml (design tokens)
  ✓ components.yaml (reusable components)

These artifacts will be used as defaults for this epic.
Local design.config.yaml is OPTIONAL.

? Does this epic need local configuration overrides?
  > No, inherit everything from design system (recommended)
    Yes, create local overrides for this epic
    Cancel
```

**If user selects "No" (inherit):**
- Skip config creation
- Proceed directly to artifact generation
- Epic will use design system defaults

**If user selects "Yes" (overrides):**
- Continue with full init workflow
- Create `design.config.yaml` with override values
- Only specified values will override design system

**If design system is enabled but artifacts don't exist:**

```
Design system enabled but no artifacts found at .spec/design-system/

? How would you like to proceed?
  > Continue without design system (generate all artifacts per-epic)
    Initialize design system now (/pixel-perfect:design-system init)
    Cancel
```

**If design system is not enabled:** Skip detection, run full init.

### Step 1: Requirements Discovery

**If `--requirements <path>` is provided:** Use that file directly, skip all discovery.

**Otherwise, search for requirements in this order:**
1. `{epic}/PRD.md`
2. `{epic}/requirements.md`
3. `{epic}/REQUIREMENTS.md`
4. `{epic}/spec.md`
5. `{epic}/*.md` (any markdown file)

**If a candidate file is found**, ask the user to confirm:
```
Found potential requirements file: {epic}/PRD.md

? Is this your requirements document?
  > Yes, use this file
    No, search for another
    Enter path manually
```

**If no candidate files found**, ask user for path:
```
No requirements file found in {epic}/

? Where are your requirements?
  > Enter path to requirements file
    Paste requirements directly
```

### Step 2: Device Targeting

**Default: Responsive Web** (covers desktop + mobile web). Only ask for other platforms if requirements indicate them.

| Platform | Indicators | Default |
|----------|------------|---------|
| Responsive Web | DEFAULT - use unless requirements specify otherwise | ✓ PRE-SELECTED |
| Mobile (iOS) | "iOS", "iPhone", "Swift", "App Store" | |
| Mobile (Android) | "Android", "Kotlin", "Play Store" | |
| Desktop App | "electron", "desktop app", "native app", "menubar" | |
| CLI/Terminal | "command line", "terminal", "CLI", "shell" | |
| Tablet-specific | "tablet-only", "iPad-specific", "large screen only" | |

```
? What platforms are you designing for?
  [x] Responsive Web (Recommended - covers desktop & mobile)
  [ ] Mobile - iOS native
  [ ] Mobile - Android native
  [ ] Desktop App (Electron/Tauri)
  [ ] CLI/Terminal
  [ ] Tablet-specific
```

User can add additional platforms or deselect Responsive Web if building native-only.

### Step 3: Design Vibe

Infers aesthetic direction from requirements, or asks you to choose:

| Vibe | Description |
|------|-------------|
| Minimal | Clean, whitespace-focused, essential elements only |
| Modern | Contemporary patterns, subtle animations, current trends |
| Playful | Rounded corners, bright colors, friendly feel |
| Corporate | Professional, structured, enterprise-appropriate |
| Bold | High contrast, strong typography, impactful |
| Technical | Data-dense, developer-focused, functional |
| Elegant | Refined, sophisticated, premium feel |

You can also provide a custom vibe description.

### Step 4: URL Analysis

If your requirements contain URLs (design references, competitor analysis, inspiration):
- Fetches and analyzes each URL using available web tools (WebFetch, MCP servers, or other configured tools)
- Extracts relevant design patterns
- Saves analysis to `{epic}/design/research/url-analysis.md`

**Note:** URL analysis requires web access tools. If no web tools are available, this step is skipped and URLs are listed in the config for manual review.

### Step 6: Configuration Output

Saves preferences to `{epic}/design/design.config.yaml`:

**When inheriting from design system (minimal override):**

```yaml
# Auto-generated by /pixel-perfect:init
version: "1.0"
created: "2025-01-30"
cascadeMode: "override"  # Only these values override design system

# Local overrides (unspecified values inherit from design system)
platforms:
  - mobile-ios  # Override: design system has responsive-web
  - mobile-android

vibe:
  primary: "playful"  # Override: design system has "minimal"

# Requirements source
requirements:
  path: "PRD.md"
```

**When no design system exists (full config):**

```yaml
# Auto-generated by /pixel-perfect:init
version: "1.0"
created: "2025-01-30"
cascadeMode: "full"  # No design system to inherit from

# Requirements source
requirements:
  path: "PRD.md"
  analyzed: true

# Target platforms (full definition required)
platforms:
  - responsive-web

# Design aesthetic (full definition required)
vibe:
  primary: "modern"
  description: "Clean, contemporary design with subtle micro-interactions"
  colors: "neutral with accent"

# Analyzed references
references:
  urls_analyzed: 3
  patterns_extracted:
    - "bottom navigation"
    - "card-based layout"

# Output preferences
extensions:
  spec: ".spec.json"
  mock: ".mock.html"
paths:
  specs: "prompts"
  mocks: "mocks"
naming:
  style: "snake_case"
```

## Example Sessions

### With design system (inherit - no local config)
```
> /pixel-perfect:init lunch-menu

Searching for "lunch-menu"...
Found: specs/epics/epic-1/sprints/lunch-menu

Checking for design system...
Design system detected at .spec/design-system/:
  ✓ paradigm.yaml (design patterns)
  ✓ tokens.yaml (design tokens)
  ✓ components.yaml (reusable components)

These artifacts will be used as defaults for this epic.

? Does this epic need local configuration overrides?
  > No, inherit everything from design system (recommended)
    Yes, create local overrides for this epic

Scanning for requirements...
Found: specs/epics/epic-1/sprints/lunch-menu/PRD.md

Using: specs/epics/epic-1/sprints/lunch-menu/PRD.md

Configuration: Inheriting from design system
No local design.config.yaml created

Ready to plan! Run:
  /pixel-perfect:plan lunch-menu
```

### With design system (local overrides)
```
> /pixel-perfect:init lunch-menu

Searching for "lunch-menu"...
Found: specs/epics/epic-1/sprints/lunch-menu

Checking for design system...
Design system detected at .spec/design-system/:
  ✓ paradigm.yaml (design patterns)
  ✓ tokens.yaml (design tokens)
  ✓ components.yaml (reusable components)

? Does this epic need local configuration overrides?
  > No, inherit everything from design system (recommended)
    Yes, create local overrides for this epic

[User selects "Yes"]

Scanning for requirements...
Found: specs/epics/epic-1/sprints/lunch-menu/PRD.md

Using: specs/epics/epic-1/sprints/lunch-menu/PRD.md

? What platforms are you designing for?
    [ ] Responsive Web (Design system default)
  > [x] Mobile - iOS native
    [x] Mobile - Android native

? What's the design vibe you're going for?
    Minimal (Design system default)
  > Playful

Configuration saved to specs/epics/epic-1/sprints/lunch-menu/design/design.config.yaml

Cascade path:
  Base: .pixel-perfect/config.json
  Design system: .spec/design-system/
  Local overrides: lunch-menu/design/design.config.yaml

Ready to plan! Run:
  /pixel-perfect:plan lunch-menu
```

### With automatic discovery (no global design)
```
> /pixel-perfect:init lunch-menu

Searching for "lunch-menu"...
Found: specs/epics/epic-1/sprints/lunch-menu

Scanning for requirements...
Found potential requirements file: specs/epics/epic-1/sprints/lunch-menu/PRD.md

? Is this your requirements document?
  > Yes, use this file
    No, search for another
    Enter path manually

Using: specs/epics/epic-1/sprints/lunch-menu/PRD.md

? What platforms are you designing for?
  [x] Responsive Web (Recommended - covers desktop & mobile)
  [ ] Mobile - iOS native
  [ ] Mobile - Android native
  [ ] Desktop App (Electron/Tauri)
  [ ] CLI/Terminal
  [ ] Tablet-specific

Analyzing design direction...
Detected vibe: "Modern" (based on: "clean interface", "minimal navigation")

? What's the design vibe you're going for?
  > Modern (Recommended)
    Minimal
    Playful
    Corporate
    Other...

Found 2 URLs in requirements. Analyzing...
- https://dribbble.com/shots/... (design inspiration)
- https://competitor.app/... (competitor reference)

Configuration saved to specs/epics/epic-1/sprints/lunch-menu/design/design.config.yaml

Ready to plan! Run:
  /pixel-perfect:plan .spec/epics/epic-1
```

### With explicit requirements path
```
> /pixel-perfect:init lunch-menu --requirements ../shared/product-spec.md

Searching for "lunch-menu"...
Found: specs/epics/epic-1/sprints/lunch-menu

Using requirements: ../shared/product-spec.md

Analyzing requirements for platform hints...
```

### When no requirements found
```
> /pixel-perfect:init new-feature

Searching for "new-feature"...
Found: specs/epics/epic-2/new-feature

Scanning for requirements...
No requirements file found in specs/epics/epic-2/new-feature/

? Where are your requirements?
  > Enter path to requirements file
    Paste requirements directly

Enter path: ../docs/NEW-FEATURE-PRD.md

Using: ../docs/NEW-FEATURE-PRD.md
```

## Skipping Init

**When design system exists:** Init is OPTIONAL. The design workflow will use design system defaults automatically if no local config exists.

**When no design system exists:** Init is REQUIRED. The workflow will halt and prompt you to run init.

To reconfigure an existing epic:
- Delete `design.config.yaml` and run init again
- Run `/pixel-perfect:init --force` to overwrite existing config
- Edit the config file directly (changes take effect on next run)

## Integration with Design Workflow

When you run `/pixel-perfect:design`:
1. Checks for `design.config.yaml`
2. If missing, automatically runs init first
3. Uses config to inform all subsequent phases

This ensures every design project has explicit platform targets and aesthetic direction before generating artifacts.
