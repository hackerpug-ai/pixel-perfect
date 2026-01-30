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
/pixel-perfect:review .spec/epics/epic-1

# Review single mockup
/pixel-perfect:review .spec/epics/epic-1 --key user_profile

# Reset and re-review all
/pixel-perfect:review .spec/epics/epic-1 --reset --all
```
