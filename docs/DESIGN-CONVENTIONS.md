---
name: design-conventions
description: "[REFERENCE ONLY] Design artifact conventions - tech-agnostic patterns for UI/UX workflows"
invokable: false
---

# Design Conventions

**Reference document** for design skill suite. Platform and tech-stack agnostic.

---

## CONFIGURATION

Projects can override defaults via `.spec/design.config.yaml`:

```yaml
# .spec/design.config.yaml (optional - all have defaults)
extensions:
  spec: ".spec.json"      # default: .spec.json
  mock: ".mock.html"      # default: .mock.html

paths:
  specs: "prompts"        # default: prompts
  mocks: "mocks"          # default: mocks

naming:
  style: "snake_case"     # default: snake_case (options: snake_case, kebab-case, camelCase)
```

If no config exists, defaults apply.

---

## DESIGN KEY CONVENTION

The **design key** is the primary identifier for a design artifact, scoped to an epic.

```
DEFINITION:
  design_key = filename stem without extensions
  scope = epic directory

PATTERN:
  Key:    {design_key}                    # e.g., user_profile
  Scope:  {epic}/{design_key}             # e.g., epic-1/user_profile

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

Design artifacts for an epic:

```
{epic}/design/
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
{epic}/design/
├── prompts/
│   └── {design_key}.spec.json
└── mocks/
    └── {design_key}.mock.html
```

**Full structure** (complete design system):
```
{epic}/design/
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
└── research/
```

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
tokens:
  colors:
    primary: "{value}"
    secondary: "{value}"
  spacing:
    unit: "{value}"
  typography:
    fontFamily: "{value}"
```

---

## KEY LOOKUP

```
GIVEN design_key and epic:
  spec_path = {epic}/design/{paths.specs}/{design_key}{extensions.spec}
  mock_path = {epic}/design/{paths.mocks}/{design_key}{extensions.mock}

GIVEN file path:
  design_key = basename(path) with extensions stripped
  epic = path segment after .spec/epics/
```

---

## UNIQUENESS

- design_key MUST be unique within an epic
- design_key MAY repeat across epics (different scope)
- Full identifier: `{epic}/{design_key}` is globally unique

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

| Artifact | Web/React | Mobile/Flutter | CLI |
|----------|-----------|----------------|-----|
| screens.yaml | Routes/Pages | Screens | Commands |
| components.yaml | Components | Widgets | Output formatters |
| tokens.yaml | CSS vars | ThemeData | ANSI colors |
| flows.yaml | Navigation | Navigator | Menu flow |
| mocks | HTML | PNG/Figma | ASCII art |

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

- `brain/docs/DESIGN-KEYS.md` - Extended key patterns
- `brain/docs/ui-design-standards/README.md` - Visual standards
