---
description: "Review mockups against specifications and design standards"
---

# Design Review

Review mockups against specifications and design standards.

## Usage

```
/pixel-perfect:review <epic-path> [options]
```

## Arguments

- `<target>`: Epic or feature with mockups. Supports smart path resolution:
  - **Full path**: `.spec/epics/epic-1` → uses exact path
  - **Name only**: `epic-1` → searches spec directory for matching folder

## Command Order: init → plan → prompts → mockups → **review**

Review is step 5. Before running, check previous steps are complete.

## Scope Resolution

If no target specified, find the nearest `design/` directory or `design.config.yaml` from current location.

## Dependency Check

**BEFORE doing anything else**, verify prerequisites for the scoped directory:

```
CHECK 1: {target}/design/design.config.yaml exists?
  NO  → Run /pixel-perfect:init first

CHECK 2: {target}/design/views.yaml exists?
  NO  → Run /pixel-perfect:plan first

CHECK 3: {target}/design/prompts/*.spec.json exists?
  NO  → Run /pixel-perfect:prompts first

CHECK 4: {target}/design/mocks/*.mock.html exists?
  NO  → Run /pixel-perfect:mockups first

ALL CHECKS PASS → Proceed to review
```

Use `--skip-deps` to error instead of auto-running missing steps.

## Options

- `--skip-init`: Error if design.config.yaml missing instead of running init
- `--key <design_key>`: Review single mockup only
- `--all`: Review all mockups regardless of status
- `--continue`: Continue review from last position
- `--reset`: Reset all review statuses to pending

## Review Criteria

1. **Spec Compliance** - Matches specification requirements
2. **Component Usage** - Uses defined components correctly
3. **Token Consistency** - Applies design tokens properly
4. **Flow Integration** - Fits within user flows
5. **Accessibility** - Meets accessibility guidelines

## Status Values

| Status | Meaning |
|--------|---------|
| `pending` | Awaiting review |
| `in_progress` | Currently being reviewed |
| `approved` | Passed review |
| `needs_work` | Failed review, needs revision |
| `failed` | Error occurred |

## Output

Updates `{epic}/design/mocks/DESIGN-REVIEW.md` with:
- Review status per design_key
- Issues found
- Recommendations

## Example

```
# Review all pending mockups
/pixel-perfect:review .spec/epics/epic-1

# Review single mockup
/pixel-perfect:review .spec/epics/epic-1 --key user_profile

# Reset and re-review all
/pixel-perfect:review .spec/epics/epic-1 --reset --all
```
