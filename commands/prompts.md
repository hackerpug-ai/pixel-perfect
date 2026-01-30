---
description: "Generate specification files from views.yaml for mockup generation"
---

# Design Prompts

Generate specification files from design artifacts for mockup generation.

## ⚠️ EXECUTE THIS FIRST - MANDATORY

```
STEP 1: Resolve target directory
  - If target provided: use {target}/design/
  - If no target: find nearest design.config.yaml or design/ directory

STEP 2: Check dependencies IN ORDER

  CHECK: design.config.yaml exists?
    NO → ┌──────────────────────────────────────────────────┐
         │ STOP. Execute /pixel-perfect:init completely.   │
         │ Wait for init to finish. Then return here.      │
         └──────────────────────────────────────────────────┘

  CHECK: views.yaml exists?
    NO → ┌──────────────────────────────────────────────────┐
         │ STOP. Execute /pixel-perfect:plan completely.   │
         │ Wait for plan to finish. Then return here.      │
         └──────────────────────────────────────────────────┘

  ALL EXIST → Proceed to prompts generation
```

**This check is NOT optional. You MUST run missing steps.**

---

## Command Order: init → plan → **prompts** → mockups

## Usage

```
/pixel-perfect:prompts <epic-path> [options]
```

## Arguments

- `<target>`: Epic or feature with design artifacts. Supports smart path resolution:
  - **Full path**: `.spec/epics/epic-1` → uses exact path
  - **Name only**: `epic-1` → searches spec directory for matching folder

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
