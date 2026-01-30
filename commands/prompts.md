---
description: "Generate specification files from views.yaml for mockup generation"
---

# Design Prompts

Generate specification files from design artifacts for mockup generation.

## Usage

```
/claude-code-design:prompts <epic-path> [options]
```

## Arguments

- `<epic-path>`: Path to epic directory with design artifacts

## Options

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
/claude-code-design:prompts .spec/epics/epic-1

# Generate single spec
/claude-code-design:prompts .spec/epics/epic-1 --key user_profile
```

## Spec Format

Each `.spec.json` contains:
- Screen metadata
- Component specifications
- Layout requirements
- Token references
- Interaction states
