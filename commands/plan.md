---
description: "Generate design artifacts from PRD: UX plan, paradigm, tokens, components, flows, views"
---

# Design Plan

Generate design artifacts from a PRD (Product Requirements Document).

## EXECUTION GATES - MANDATORY

You MUST execute these gates BEFORE generating any YAML.

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
│ GATE 1: CASCADING CONFIG RESOLUTION                                 │
│                                                                     │
│   Check configs in order (most specific first):                     │
│                                                                     │
│   1. {dir}/design.config.yaml (local epic config)                  │
│   2. Parent dir design.config.yaml (if nested epic)                │
│   3. Project design system (if enabled in .pixel-perfect/config)   │
│   4. .pixel-perfect/config.json (project defaults)                 │
│                                                                     │
│   Resolution:                                                       │
│     • Local config found → USE as base, override design system     │
│     • No local, design system exists → INHERIT from design system  │
│     • Neither exists → HALT and run init                           │
│                                                                     │
│   Display "cascade path" showing which configs were read:          │
│     Base config: .pixel-perfect/config.json                        │
│     Design system: .spec/design-system/ (enabled)                  │
│     Local override: epic-1/design/design.config.yaml               │
│     Effective: merged (design system + local overrides)            │
└─────────────────────────────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────────────────────────────┐
│ GATE 2: RESOLVE ARTIFACT INHERITANCE                                │
│                                                                     │
│   For each foundation artifact (paradigm, tokens, components):     │
│                                                                     │
│   1. Check if {dir}/design/{artifact}.yaml exists (local override) │
│   2. If not, check designSystem.path for artifact                  │
│   3. If neither, mark for generation                               │
│                                                                     │
│   Display resolution status:                                        │
│     Global artifacts: paradigm ✓, tokens ✓, components ✓           │
│     Epic artifacts: flows, workflows, views, screens                │
│     Local overrides: None (or list overrides if present)           │
└─────────────────────────────────────────────────────────────────────┘
          ↓
     ALL GATES PASSED → Generate YAML artifacts (respecting resolution)
```

**NEVER generate YAML without passing all gates. NEVER skip init.**

---

## Command Order: init → **plan** → prompts → mockups

## Usage

```
/pixel-perfect:plan <epic-path> [options]
```

## Arguments

- `<target>`: Epic or feature to plan. Supports smart path resolution:
  - **Full path**: `.spec/epics/epic-1` → uses exact path
  - **Name only**: `epic-1` → searches spec directory for matching folder
  - **Nested**: `lunch-menu` → finds it anywhere under spec directory

Use `--skip-deps` to error instead of auto-running missing steps.

## Options

- `--skip-init`: Error if no config available instead of running init
- `--force-local`: Ignore design system, require local config or run init
- `--show-cascade`: Display full cascade path and resolution order
- `--foundation`: Generate only foundation artifacts (UX plan, paradigm, tokens, components)
- `--continue`: Continue with detail artifacts (flows, workflows, views, screens)
- `--research <scope>`: Paradigm research scope: `codebase`, `web`, or `both`
- `--skip-research`: Skip paradigm research phase

## Generation Sequence

**Relative ordering, not mandatory steps.** Only generate what's needed, but maintain this order:

```
UX plan → paradigm → tokens → components → flows/workflows → views/screens
```

See `docs/GENERATION-SEQUENCE.md` for full details.

### Foundation (Phase 1-4)
1. **UX-DESIGN-PLAN.md** - Design overview (references other artifacts, not hardcoded values)
2. **paradigm.yaml** - Design patterns, principles, references
3. **tokens.yaml** - Design tokens (colors, spacing, typography)
4. **components.yaml** - Reusable component definitions (uses tokens)

### Detail (Phase 5-8)
5. **flows.yaml** - Interaction flows (uses components)
6. **workflows.yaml** - User journeys and task flows
7. **views.yaml** - Detailed view specifications (uses components, tokens)
8. **screens.yaml** - Screen inventory with hierarchy (uses views)

### Smart Generation
- Skip artifacts that already exist (unless `--force`)
- When regenerating, only update changed artifacts + downstream dependencies
- Always maintain relative order when multiple artifacts need updates

### Cascading Config Resolution

Config values follow a cascading inheritance model (most specific wins):

**Hierarchy:**
```
Project (.pixel-perfect/config.json)
    ↓
Design System ({specRoot}/{designSystem.path}/) [if enabled]
    ↓
Epic Config ({epic}/design/design.config.yaml) [optional]
    ↓
Sub-Epic Config ({epic}/sprints/{sub}/design/design.config.yaml) [optional]
```

**Resolution order for any config value:**
1. **Most specific local config** (deepest nested folder with config)
2. **Parent epic config** (if exists and nested)
3. **Project design system** (if enabled)
4. **Project config** (`.pixel-perfect/config.json`)
5. **Built-in defaults** (lowest priority)

**AI Agent Read Order:**
When reading configs, agents should:
1. Search upward from working directory for local configs
2. Read all configs found in the "cascade path"
3. Merge with "most specific wins" rule
4. Report the effective config and cascade path to user

**Terminology:**
- **base config** - highest level config (project/design-system)
- **overriding config** - more specific config that modifies base
- **effective config** - final merged result
- **cascade path** - ordered list of configs read to produce effective config

### Global Design Resolution

When `designSystem.enabled` is true in project config:

**Resolution order for each artifact:**
1. Local override exists (`{epic}/design/{artifact}.yaml`) → use local version
2. Global artifact enabled AND exists → use global version (SKIP generation)
3. Neither → generate in `{epic}/design/`

**Example output when global design is active (no local config):**
```
Resolving design artifacts...

Cascade path:
  Base: .pixel-perfect/config.json
  Design system: .spec/design-system/ (enabled)
  Local config: None (inheriting from design system)

Global design system (.spec/design-system/):
  ✓ paradigm.yaml → USING GLOBAL
  ✓ tokens.yaml → USING GLOBAL
  ✓ components.yaml → USING GLOBAL

Generating epic-specific artifacts:
  → UX-DESIGN-PLAN.md
  → flows.yaml
  → workflows.yaml
  → views.yaml
  → screens.yaml
```

**Example output with local config override:**
```
Resolving design artifacts...

Cascade path:
  Base: .pixel-perfect/config.json
  Design system: .spec/design-system/ (enabled)
  Local config: epic-1/design/design.config.yaml (overrides present)

Global design system (.spec/design-system/):
  ✓ paradigm.yaml → USING GLOBAL
  ✓ tokens.yaml → USING GLOBAL
  ✗ components.yaml → OVERRIDDEN (using epic-1/design/components.yaml)

Generating epic-specific artifacts:
  → UX-DESIGN-PLAN.md
  → flows.yaml
  → workflows.yaml
  → views.yaml
  → screens.yaml
```

**Fallback behavior:**
- If global artifact is missing, generate in epic (with info message)
- Local overrides always take precedence over global
- `design.config.yaml` is OPTIONAL when design system exists

## Example

```
# Full planning (uses design system if configured)
/pixel-perfect:plan .spec/epics/epic-1

# Foundation only
/pixel-perfect:plan .spec/epics/epic-1 --foundation

# Continue with details
/pixel-perfect:plan .spec/epics/epic-1 --continue

# Force local config even if design system exists
/pixel-perfect:plan .spec/epics/epic-1 --force-local
```

## Input Requirements

- `{epic}/PRD.md` must exist with product requirements

## Output

All YAML artifacts written to `{epic}/design/`
