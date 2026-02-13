---
name: design-conventions
description: "[REFERENCE ONLY] Design artifact conventions - tech-agnostic patterns for UI/UX workflows"
invokable: false
---

# Design Conventions

**Reference document** for design skill suite. Platform and tech-stack agnostic.

---

## CONFIGURATION

Projects can override defaults via `design/config.yaml` (ESLint-style cascading):

```yaml
# design/config.yaml (optional - all have defaults)
extensions:
  spec: ".spec.json"      # default: .spec.json
  mock: ".mock.html"      # default: .mock.html

paths:
  specs: "prompts"        # default: prompts
  mocks: "mocks"          # default: mocks

naming:
  style: "snake_case"     # default: snake_case (options: snake_case, kebab-case, camelCase)

# Design system (optional - informs tokens, components, mockup CDN/classes)
designSystem:
  name: "shadcn-ui"       # see docs/design-systems/ for supported systems

# Icon library (optional - auto-selected from design system or vibe)
iconLibrary:
  name: "lucide"          # see docs/icon-libraries/ for supported libraries
  autoSelected: true
```

If no config exists, defaults apply.

---

## DESIGN KEY CONVENTION

The **design key** is the primary identifier for a design artifact, scoped to a directory.

```
DEFINITION:
  design_key = filename stem without extensions
  scope = directory directory

PATTERN:
  Key:    {design_key}                    # e.g., user_profile
  Scope:  {directory}/{design_key}             # e.g., directory-1/user_profile

EXTRACTION:
  From any artifact file, strip known extensions to get design_key

NORMALIZATION (default snake_case):
  • Lowercase with underscores
  • No spaces, no special characters
  • Configurable via naming.style

DISPLAY NAME:
  user_profile    → "User Profile"
  item_detail     → "Item Detail"
  main_dashboard  → "Main Dashboard"
```

---

## FILE STRUCTURE

Design artifacts for a directory:

```
{directory}/design/
├── workflows.yaml          # User journeys and task flows
├── paradigm.yaml           # Design patterns, principles, references
├── screens.yaml            # Screen inventory with hierarchy
├── flows.yaml              # Interaction flows between screens
├── views.yaml              # Detailed view specifications
├── components.yaml         # Reusable component definitions
├── tokens.yaml             # Design tokens (colors, spacing, typography)
├── UX-DESIGN-PLAN.md       # Human-readable summary
│
├── {paths.specs}/          # default: prompts/
│   ├── {design_key}{extensions.spec}   # Specification per screen
│   └── manifest.json                    # Index of all specs
│
├── {paths.mocks}/          # default: mocks/
│   ├── {design_key}{extensions.mock}   # Visual mockup per screen
│   └── DESIGN-REVIEW.md                 # Review status by design_key
│
└── research/               # Paradigm research, competitive analysis
```

**Minimal structure** (specs + mocks only):
```
{directory}/design/
├── prompts/
│   └── {design_key}.spec.json
└── mocks/
    └── {design_key}.mock.html
```

**Full structure** (complete design system):
```
{directory}/design/
├── workflows.yaml
├── paradigm.yaml
├── screens.yaml
├── flows.yaml
├── views.yaml
├── components.yaml
├── tokens.yaml
├── UX-DESIGN-PLAN.md
├── prompts/
├── mocks/
├── research/
└── archived/               # Archived artifacts from plan-level refinements
    └── {timestamp}/        # e.g., 2025-02-08T14-30-00/
        ├── prompts/
        ├── mocks/
        └── ARCHIVE-MANIFEST.md
```

---

## MOCKUP ANNOTATION STANDARDS

HTML mockups are used directly by AI agents for high-fidelity UI implementation. To improve first-pass accuracy, **every `.mock.html` must include the annotations below**.

### Component Boundary Comments

Wrap each distinct logical component in HTML comments. Use a stable component name across all mockups.

```html
<!-- COMPONENT: AgentCard (Props: agent, status) -->
<div class="agent-item selected">
  ...
</div>
<!-- /COMPONENT: AgentCard -->
```

### Dynamic Field Markers

Mark variable text so data is distinguishable from labels.

```html
<div class="agent-name" data-field="agent.name">AGENT ALPHA</div>
<div class="agent-health">ELAPSED: <span data-field="agent.runtime">12:45</span></div>
```

For lists, optionally mark the collection:

```html
<ul class="mission-list" data-collection="missions">
  <!-- COMPONENT: MissionRow (Props: mission) -->
  <li class="mission-row">
    <span data-field="mission.title">System Check</span>
  </li>
  <!-- /COMPONENT: MissionRow -->
</ul>
```

### State Variants

Include non-default UI states with `data-state`. Hide them with `hidden` and `aria-hidden="true"`.

```html
<!-- STATE VARIANTS: TaskCard -->
<section class="task-card" data-state="default">...</section>
<section class="task-card" data-state="loading" hidden aria-hidden="true">...</section>
<section class="task-card" data-state="error" hidden aria-hidden="true">...</section>
<!-- /STATE VARIANTS: TaskCard -->
```

### ARIA Roles for Interaction Semantics

Use ARIA roles and relationships for tabs, dialogs, menus, listboxes, and accordions.

```html
<div role="tablist" aria-label="Crew Tabs">
  <button role="tab" aria-selected="true" aria-controls="panel-crew" id="tab-crew">Crew</button>
  <button role="tab" aria-selected="false" aria-controls="panel-status" id="tab-status">Status</button>
</div>
<section role="tabpanel" id="panel-crew" aria-labelledby="tab-crew">...</section>
<section role="tabpanel" id="panel-status" aria-labelledby="tab-status" hidden aria-hidden="true">...</section>
```

### CSS Variable Definitions

If the mockup uses `var(--token-name)`, define those variables in `:root` near the top of `<head>`.

```html
<style>
:root {
  --moonlit-violet: #6c5ce7;
  --surface-1: #0f1115;
  --text-primary: #f5f7fb;
}
</style>
```

These annotations are required regardless of design system choice.

---

## CASCADING CONFIGURATION

Configuration cascades from parent directories (ESLint-style):

```
project/
├── design/
│   └── config.yaml         # Parent: defines tokens, components, paradigm
├── features/
│   ├── auth/
│   │   └── design/
│   │       └── config.yaml # Child: inherits parent, overrides as needed
│   └── booking/
│       └── design/         # No config: fully inherits from parent
```

Artifacts in child directories can reference parent artifacts. If `booking/design/` doesn't define `tokens.yaml`, it uses the one from `project/design/`.

**Resolution order:**
1. `{directory}/design/config.yaml`
2. `{directory}/design/design.config.yaml` (backward compatible)
3. Parent directories' `design/config.yaml`
4. `.pixel-perfect/config.json` (global defaults)
5. Built-in defaults

---

## YAML ARTIFACT SCHEMAS

### workflows.yaml
```yaml
# User journeys and task flows
workflows:
  - id: {workflow_id}
    name: "{Workflow Name}"
    description: "{Purpose}"
    actor: "{User role}"
    steps:
      - screen: {design_key}
        action: "{What user does}"
```

### screens.yaml
```yaml
# Screen inventory
screens:
  - id: {design_key}
    name: "{Screen Name}"
    description: "{Purpose}"
    parent: {parent_key}     # optional, for hierarchy
    variants: []             # optional, state variants
```

### views.yaml
```yaml
# Detailed view specifications
views:
  - id: {design_key}
    screen: {screen_key}
    sections:
      - name: "{Section}"
        components: []
```

### components.yaml
```yaml
# Reusable components
components:
  - id: {component_id}
    name: "{Component Name}"
    props: {}
    variants: []
```

### tokens.yaml
```yaml
# Design tokens - platform agnostic
# When designSystem is set, values default to design system conventions
tokens:
  colors:
    primary: "{value}"
    secondary: "{value}"
  spacing:
    unit: "{value}"
  typography:
    fontFamily: "{value}"
  # Icon tokens (informed by iconLibrary selection)
  icons:
    library: "{iconLibrary.name}"   # e.g., "lucide", "material-symbols"
    sizeScale:
      sm: "16px"                     # Inline text, badges
      md: "20px"                     # Buttons, inputs
      lg: "24px"                     # Navigation, primary actions
      xl: "32px"                     # Empty states, features
```

---

## KEY LOOKUP

```
GIVEN design_key and directory:
  spec_path = {directory}/design/{paths.specs}/{design_key}{extensions.spec}
  mock_path = {directory}/design/{paths.mocks}/{design_key}{extensions.mock}

GIVEN file path:
  design_key = basename(path) with extensions stripped
  directory = containing directory (resolves from current working directory or explicit path)
```

---

## UNIQUENESS

- design_key MUST be unique within a directory
- design_key MAY repeat across directories (different scope)
- Full identifier: `{directory}/{design_key}` is globally unique

---

## STATUS MODEL

Single `status` field for design workflow state:

```
STATUS VALUES:
  pending      → Awaiting review
  in_progress  → Currently being reviewed
  approved     → Passed review (terminal)
  needs_work   → Failed review, needs revision
  failed       → Error occurred

TRANSITIONS:
  [new] ─────────────────→ pending
  pending ──[start]──────→ in_progress
  in_progress ──[pass]───→ approved
  in_progress ──[fail]───→ needs_work
  needs_work ──[revised]─→ pending
```

---

## NAMING CONVENTIONS

```
GOOD (semantic, descriptive):
  user_profile           # Clear entity
  order_summary          # Clear purpose
  settings_notifications # Scoped setting

AVOID:
  screen1                # Non-descriptive
  new_view               # Temporary
  dashboard_v2           # Version in name
  page3                  # Numbered
```

---

## PLATFORM ADAPTATION

The design artifacts are platform-agnostic. Implementation maps to target:

| Artifact | Web/React | Mobile/Flutter | CLI | TUI |
|----------|-----------|----------------|-----|-----|
| screens.yaml | Routes/Pages | Screens | Commands | Views/Panels |
| components.yaml | Components | Widgets | Output formatters | Widgets (Bubble Tea/Ratatui) |
| tokens.yaml | CSS vars | ThemeData | ANSI colors | ANSI/TrueColor + Lip Gloss styles |
| flows.yaml | Navigation | Navigator | Menu flow | Keyboard-driven navigation |
| mocks | HTML | PNG/Figma | ASCII art | ANSI mockup (.mock.ans) |

---

## CROSS-SKILL REFERENCES

| Skill | Uses design_key for |
|-------|---------------------|
| `/design-plan` | Generates YAML artifacts keyed by design_key |
| `/design-prompt-json` | Creates spec files from views.yaml |
| `/design-mockup` | Outputs mock files |
| `/design-review` | Reviews by design_key, updates status |

---

## RELATED DOCS

- `docs/DESIGN-KEYS.md` - Extended key patterns
- `docs/ui-design-standards.md` - Visual standards
