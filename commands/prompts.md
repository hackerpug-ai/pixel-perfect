---
description: "Generate specification files from views.yaml for mockup generation"
---

# Design Prompts

Generate specification files from design artifacts for mockup generation.

## Usage

```
/pixel-perfect:prompts <epic-path> [options]
```

## Arguments

- `<target>`: Epic or feature with design artifacts. Supports smart path resolution:
  - **Full path**: `.spec/epics/epic-1` → uses exact path
  - **Name only**: `epic-1` → searches spec directory for matching folder

## Command Order: init → plan → **prompts** → mockups

Prompts is step 3. Before running, check previous steps are complete.

## Scope Resolution

If no target specified, find the nearest `design/` directory or `design.config.yaml` from current location.

## Dependency Check

**BEFORE doing anything else**, verify prerequisites for the scoped directory:

```
CHECK 1: {target}/design/design.config.yaml exists?
  NO  → Run /pixel-perfect:init first

CHECK 2: {target}/design/views.yaml exists?
  NO  → Run /pixel-perfect:plan first

ALL CHECKS PASS → Proceed to prompts generation
```

Use `--skip-deps` to error instead of auto-running missing steps.

## Options

- `--skip-init`: Error if design.config.yaml missing instead of running init
- `--key <design_key>`: Generate spec for single design key only
- `--force`: Regenerate existing specs

## Input Requirements

- `{epic}/design/views.yaml` must exist
- `{epic}/design/screens.yaml` recommended
- `{epic}/design/components.yaml` recommended
- `{epic}/design/tokens.yaml` recommended

## Output

```
{epic}/design/prompts/
├── {design_key}.spec.json    # Specification per screen
└── manifest.json              # Index of all specs
```

## Example

```
# Generate all specs
/pixel-perfect:prompts .spec/epics/epic-1

# Generate single spec
/pixel-perfect:prompts .spec/epics/epic-1 --key user_profile
```

## Spec Format

Each `.spec.json` contains:
- Screen metadata
- Component specifications
- Layout requirements
- Token references
- Interaction states
