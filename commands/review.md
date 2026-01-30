---
description: "Review mockups against specifications and design standards"
---

# Design Review

Review mockups against specifications and design standards.

## Usage

```
/claude-code-design:review <epic-path> [options]
```

## Arguments

- `<epic-path>`: Path to epic directory with mockups

## Options

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
/claude-code-design:review .spec/epics/epic-1

# Review single mockup
/claude-code-design:review .spec/epics/epic-1 --key user_profile

# Reset and re-review all
/claude-code-design:review .spec/epics/epic-1 --reset --all
```
