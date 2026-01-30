---
description: "Generate design artifacts from PRD: UX plan, paradigm, tokens, components, flows, views"
---

# Design Plan

Generate design artifacts from a PRD (Product Requirements Document).

## ⚠️ EXECUTE THIS FIRST - MANDATORY

```
STEP 1: Resolve target directory
  - If target provided: use {target}/design/
  - If no target: find nearest design.config.yaml or design/ directory

STEP 2: Check design.config.yaml exists

  IF NOT EXISTS:
    ┌─────────────────────────────────────────────────────────┐
    │ STOP. Run /pixel-perfect:init for this target.          │
    │ DO NOT generate any YAML until init completes.          │
    │ Init will ask about: requirements, platforms, vibe.     │
    └─────────────────────────────────────────────────────────┘

  IF EXISTS:
    → Read config and proceed to planning
```

**This check is NOT optional. Never skip to generation.**

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

- `--skip-init`: Error if design.config.yaml missing instead of running init
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
