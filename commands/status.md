---
description: "Show design workflow status and progress"
---

# Design Status

Show the current status of design artifacts and workflow progress.

## Usage

```
/pixel-perfect:status <epic-path>
```

## Arguments

- `<epic-path>`: Path to epic directory

## Output

Displays:
- Artifact completion status
- Mockup generation progress
- Review status summary
- Next recommended action

## Example

```
/pixel-perfect:status .spec/epics/epic-1
```

## Sample Output

```
Design Status: epic-1
=====================

Artifacts:
  [x] workflows.yaml (12 workflows)
  [x] paradigm.yaml
  [x] screens.yaml (8 screens)
  [x] flows.yaml (15 flows)
  [x] views.yaml (8 views)
  [x] components.yaml (24 components)
  [x] tokens.yaml
  [x] UX-DESIGN-PLAN.md

Specs: 8/8 generated
Mocks: 6/8 generated

Review Status:
  approved:    4
  needs_work:  2
  pending:     2

Next: /pixel-perfect:mockups epic-1 --key settings_page
```
