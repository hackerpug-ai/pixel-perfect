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

- `<epic-path>`: Path to epic directory containing PRD.md

## Options

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
