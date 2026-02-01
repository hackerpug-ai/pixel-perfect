---
description: "Show design workflow status and progress"
---

# Design Status

Show the current status of design artifacts and workflow progress.

## Usage

```
/pixel-perfect:status [directory]
```

## Arguments

- `[directory]`: Directory to check. Defaults to current directory.

## Output

Displays:
- Config status (whether `design/config.yaml` or `design/design.config.yaml` exists)
- Config cascade path (which parent configs are being used)
- Artifact completion status (local vs inherited)
- Mockup generation progress
- Review status summary
- Next recommended action

**Inheritance indicators:**
- `[x] artifact.yaml` - Local artifact (exists in this directory)
- `[ ] artifact.yaml [inherited from ../design/]` - Uses parent's version

**Note:** If no config exists in directory or parent, status shows "Not initialized" and recommends running init.

## Example

```
/pixel-perfect:status .spec/epics/epic-1
```

## Sample Output

```
Design Status: features/auth
=====================

Config cascade:
  → features/auth/design/config.yaml (local)
  → project/design/config.yaml (parent)

Artifacts:
  [x] workflows.yaml (12 workflows)
  [x] screens.yaml (8 screens)
  [x] flows.yaml (15 flows)
  [x] views.yaml (8 views)
  [ ] paradigm.yaml [inherited from project/design/]
  [ ] components.yaml [inherited from project/design/]
  [ ] tokens.yaml [inherited from project/design/]
  [x] UX-DESIGN-PLAN.md

Specs: 8/8 generated
Mocks: 6/8 generated

Review Status:
  approved:    4
  needs_work:  2
  pending:     2

Next: /pixel-perfect:mockups features/auth --key settings_page
```
