---
description: "Generate design artifacts from PRD: workflows, paradigm, screens, flows, views, components, tokens"
---

# Design Plan

Generate design artifacts from a PRD (Product Requirements Document).

## Usage

```
/pixel-perfect:plan <epic-path> [options]
```

## Arguments

- `<target>`: Epic or feature to plan. Supports smart path resolution:
  - **Full path**: `.spec/epics/epic-1` → uses exact path
  - **Name only**: `epic-1` → searches spec directory for matching folder
  - **Nested**: `lunch-menu` → finds it anywhere under spec directory

## Prerequisites

**Auto-init:** If `{epic}/design/design.config.yaml` doesn't exist, runs `/pixel-perfect:init` first.

Use `--skip-init` to error instead of auto-initializing.

## Options

- `--skip-init`: Error if design.config.yaml missing instead of running init
- `--foundation`: Generate only foundation artifacts (workflows, paradigm, screens)
- `--continue`: Continue with detail artifacts (flows, views, components, tokens)
- `--research <scope>`: Paradigm research scope: `codebase`, `web`, or `both`
- `--skip-research`: Skip paradigm research phase

## Phases

### Foundation (Phase 1-3)
1. **workflows.yaml** - User journeys and task flows
2. **paradigm.yaml** - Design patterns, principles, references
3. **screens.yaml** - Screen inventory with hierarchy

### Detail (Phase 4-7)
4. **flows.yaml** - Interaction flows between screens
5. **views.yaml** - Detailed view specifications
6. **components.yaml** - Reusable component definitions
7. **tokens.yaml** - Design tokens (colors, spacing, typography)

### Summary
- **UX-DESIGN-PLAN.md** - Human-readable design summary

## Example

```
# Full planning
/pixel-perfect:plan .spec/epics/epic-1

# Foundation only
/pixel-perfect:plan .spec/epics/epic-1 --foundation

# Continue with details
/pixel-perfect:plan .spec/epics/epic-1 --continue
```

## Input Requirements

- `{epic}/PRD.md` must exist with product requirements

## Output

All YAML artifacts written to `{epic}/design/`
