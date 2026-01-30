---
description: "Run the full design workflow: plan → prompts → mockups → review"
---

# Design Workflow

Run the complete design workflow for an epic.

## Usage

```
/pixel-perfect:design <epic-path> [options]
```

## Arguments

- `<epic-path>`: Path to epic directory containing PRD.md (e.g., `.spec/epics/epic-1`)

## Options

- `--skip-plan`: Skip planning phase, use existing YAML artifacts
- `--skip-prompts`: Skip prompt generation, use existing specs
- `--skip-mockups`: Skip mockup generation, use existing mocks
- `--review-only`: Only run review phase

## Workflow Phases

1. **Plan** (`/pixel-perfect:plan`) - Generate design artifacts from PRD
2. **Prompts** (`/pixel-perfect:prompts`) - Create spec files from views.yaml
3. **Mockups** (`/pixel-perfect:mockups`) - Generate visual mockups
4. **Review** (`/pixel-perfect:review`) - Review mockups against specs

## Example

```
/pixel-perfect:design .spec/epics/epic-1
```

## Output Structure

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
│   ├── {design_key}.spec.json
│   └── manifest.json
├── mocks/
│   ├── {design_key}.mock.html
│   └── DESIGN-REVIEW.md
└── research/
```

## Configuration

Override defaults via `.spec/design.config.yaml`:

```yaml
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
