---
description: "Run the full design workflow: init → plan → prompts → mockups → review"
---

# Design Workflow

## EXECUTION GATE - MANDATORY

You MUST execute these gates IN ORDER. HALT means STOP COMPLETELY and run that command.

```
┌─────────────────────────────────────────────────────────────────────┐
│ GATE 0: RESOLVE TARGET                                              │
│                                                                     │
│   target provided?                                                  │
│     YES → dir = {target}/design/                                    │
│     NO  → dir = find nearest design.config.yaml (search upward)    │
│                                                                     │
│   FAIL if no target and no design.config.yaml found anywhere       │
└─────────────────────────────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────────────────────────────┐
│ GATE 1: CHECK design.config.yaml                                    │
│                                                                     │
│   File exists: {dir}/design.config.yaml ?                          │
│                                                                     │
│     NO  → ╔═══════════════════════════════════════════════════════╗│
│           ║ HALT. Execute: /pixel-perfect:init {target}           ║│
│           ║                                                       ║│
│           ║ Init MUST complete. It will ask:                      ║│
│           ║   • Requirements file location                        ║│
│           ║   • Target platforms (iOS, Android, Web, etc.)        ║│
│           ║   • Design vibe (modern, minimal, playful, etc.)      ║│
│           ║                                                       ║│
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
│     YES → CONTINUE to GATE 4                                       │
└─────────────────────────────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────────────────────────────┐
│ GATE 4: CHECK mocks/*.mock.html OR mocks/*.blueprint.txt           │
│                                                                     │
│   Any files exist: {dir}/mocks/*.mock.html                         │
│                 OR {dir}/mocks/*.blueprint.txt ?                    │
│                                                                     │
│     NO  → ╔═══════════════════════════════════════════════════════╗│
│           ║ HALT. Execute: /pixel-perfect:mockups {target}        ║│
│           ║ WAIT for mockups to finish. Then RESTART from GATE 4. ║│
│           ╚═══════════════════════════════════════════════════════╝│
│     YES → CONTINUE to review phase                                 │
└─────────────────────────────────────────────────────────────────────┘
          ↓
     ALL GATES PASSED → Execute review phase
```

**NEVER skip gates. NEVER proceed past a HALT. NEVER generate artifacts without passing all prior gates.**

---

## Design is a Router

Orchestrates: `init → plan → prompts → mockups → review`

## Usage

```
/pixel-perfect:design <epic-path> [options]
```

## Arguments

- `<target>`: Epic or feature to design. Supports smart path resolution:
  - **Full path**: `.spec/epics/epic-1` → uses exact path
  - **Name only**: `epic-1` → searches spec directory for matching folder
  - **Nested**: `lunch-menu` → finds `.spec/epics/epic-1/sprints/lunch-menu`

## Options

### Preplanning Control
- `--skip-init`: Skip preplanning, use existing `design.config.yaml`
- `--reconfigure`: Force re-run preplanning even if config exists
- `--quick`: Minimal prompts - auto-accept inferred values

### Phase Control
- `--skip-plan`: Skip planning phase, use existing YAML artifacts
- `--skip-prompts`: Skip prompt generation, use existing specs
- `--skip-mockups`: Skip mockup generation, use existing mocks
- `--review-only`: Only run review phase

### Mockup Options
- `--deviceFrame`: Render mockups within device-appropriate frames (mobile, tablet, browser, terminal) with correct aspect ratios for prototyping
- `--ascii-only`: Generate only ASCII blueprints (no HTML/ANSI mockups). Passed through to `/pixel-perfect:mockups`.

## Workflow Phases

### Phase 0: Initialize (Preplanning)
- Discovers or asks for requirements document
- Confirms target platforms (mobile, web, desktop, CLI, etc.)
- Establishes design vibe/aesthetic direction
- **Selects design system** (optional: shadcn/ui, Material Design 3, Chakra UI, etc.)
- **Selects icon library** (auto-paired with design system or vibe)
- Analyzes reference URLs found in requirements
- Saves configuration to `design.config.yaml`

**Runs automatically if `design.config.yaml` doesn't exist.**

### Phase 1: Plan
Generates design artifacts from PRD in this exact sequence:
1. **UX-DESIGN-PLAN.md** - Design overview (guides all artifacts)
2. **paradigm.yaml** - Design patterns and principles
3. **tokens.yaml** - Design tokens (colors, spacing, typography)
4. **components.yaml** - Reusable components (uses tokens)
5. **flows.yaml** - Interaction flows (uses components)
6. **workflows.yaml** - User journeys and task flows
7. **views.yaml** - Detailed view specifications
8. **screens.yaml** - Screen inventory with hierarchy

### Phase 2: Prompts
Creates specification files from views.yaml

### Phase 3: Mockups
Generates HTML mockups from specifications

### Phase 4: Review
Reviews mockups against specs with approval workflow

## Examples

```bash
# Full workflow with preplanning
/pixel-perfect:design .spec/epics/epic-1

# Skip preplanning (use existing config)
/pixel-perfect:design .spec/epics/epic-1 --skip-init

# Re-run preplanning to change platforms or vibe
/pixel-perfect:design .spec/epics/epic-1 --reconfigure

# Quick mode - auto-accept inferred values
/pixel-perfect:design .spec/epics/epic-1 --quick

# Continue from existing plan
/pixel-perfect:design .spec/epics/epic-1 --skip-init --skip-plan

# Review only
/pixel-perfect:design .spec/epics/epic-1 --review-only
```

## Smart Path Resolution

You don't need to specify full paths. The plugin finds your target automatically:

```bash
# Just use the folder name - searches entire project by default
/pixel-perfect:design lunch-menu
/pixel-perfect:design epic-1
/pixel-perfect:design my-feature
```

**Resolution order:**
1. Check if target is an exact path that exists
2. Recursively search from `specRoot` (default: project root) for folder named `{target}`

**Example:** If your structure is:
```
my-project/
├── .pixel-perfect/
│   └── config.json
├── docs/
├── src/
└── specs/
    └── epics/
        └── epic-1/
            └── sprints/
                └── lunch-menu/
                    └── PRD.md
```

Then `/pixel-perfect:design lunch-menu` finds `specs/epics/epic-1/sprints/lunch-menu` and creates `design/` folder there.

**Limit search scope:** Set `specRoot` in `.pixel-perfect/config.json` to search only specific directories:
```json
{
  "specRoot": "specs"
}
```

**Ambiguous matches:** If multiple folders match, you'll be asked to choose:
```
Found multiple matches for "menu":
  1. specs/epics/epic-1/lunch-menu
  2. specs/epics/epic-2/dinner-menu
Which one? [1-2]:
```

## Preplanning Details

### Requirements Discovery

Searches for requirements in order:
1. `{epic}/PRD.md`
2. `{epic}/requirements.md`
3. `{epic}/REQUIREMENTS.md`
4. Any `.md` file in epic directory

If none found, prompts you to:
- Provide a path to your requirements
- Paste requirements directly

### Platform Detection

Infers from requirements keywords:

| Platform | Detected From |
|----------|---------------|
| Mobile iOS | "iOS", "iPhone", "Swift", "native app" |
| Mobile Android | "Android", "Kotlin", "native app" |
| Web Desktop | "dashboard", "website", "browser" |
| Web Mobile | "responsive", "mobile-first", "PWA" |
| Desktop App | "Electron", "Tauri", "desktop application" |
| CLI | "command line", "terminal", "CLI" |
| TUI | "TUI", "terminal UI", "Bubble Tea", "Ratatui", "bubbletea", "lipgloss", "charmbracelet", "textual" |
| Tablet | "tablet", "iPad", "large screen" |

Presents multi-selector to confirm or modify.

### Design Vibe Detection

Analyzes requirements for aesthetic hints:

| Vibe | Indicators |
|------|------------|
| Minimal | "clean", "simple", "whitespace", "essential" |
| Modern | "contemporary", "current", "fresh" |
| Playful | "fun", "friendly", "colorful", "engaging" |
| Corporate | "enterprise", "professional", "business" |
| Bold | "impactful", "strong", "dramatic" |
| Technical | "developer", "data", "code", "technical" |
| Elegant | "premium", "sophisticated", "refined" |

If no clear vibe detected, asks you to choose or describe.

### URL Analysis

If requirements contain URLs:
- Design references (Dribbble, Behance, etc.)
- Competitor sites
- Documentation or inspiration

The init phase fetches and analyzes each URL using available web tools (WebFetch, MCP servers, etc.), extracting:
- Layout patterns
- Color schemes
- Component styles
- Navigation approaches

Results saved to `{epic}/design/research/url-analysis.md`

## Output Structure

Generated in dependency order:

```
{epic}/design/
├── design.config.yaml      # 1. Preplanning configuration
├── UX-DESIGN-PLAN.md       # 2. Design overview
├── paradigm.yaml           # 3. Design patterns
├── tokens.yaml             # 4. Design tokens
├── components.yaml         # 5. Reusable components
├── flows.yaml              # 6. Interaction flows
├── workflows.yaml          # 6. User journeys
├── views.yaml              # 7. View specifications
├── screens.yaml            # 7. Screen inventory
├── prompts/                # 8. JSON specifications
│   ├── {design_key}.spec.json
│   └── manifest.json
├── mocks/                  # 9. Visual mockups
│   ├── {design_key}.mock.html
│   ├── {design_key}.blueprint.txt   # TUI/CLI platforms only
│   └── DESIGN-REVIEW.md
└── research/
    └── url-analysis.md     # If URLs analyzed
```

## Configuration

The `design.config.yaml` created during preplanning:

```yaml
version: "1.0"
created: "2025-01-30"

requirements:
  path: "PRD.md"

platforms:
  - responsive-web  # Default: covers desktop + tablet + mobile web

vibe:
  primary: "modern"
  description: "Clean, contemporary with subtle interactions"

designSystem:
  name: "shadcn-ui"

iconLibrary:
  name: "lucide"
  autoSelected: true

references:
  urls_analyzed: 2
  patterns:
    - "card-based layout"
    - "bottom navigation"

extensions:
  spec: ".spec.json"
  mock: ".mock.html"
paths:
  specs: "prompts"
  mocks: "mocks"
naming:
  style: "snake_case"
```

See `docs/DESIGN-CONVENTIONS.md` for full configuration options.
