---
description: "Generate visual mockups from specification files"
---

# Design Mockups

Generate visual mockups from specification files.

## Usage

```
/pixel-perfect:mockups <epic-path> [options]
```

## Arguments

- `<target>`: Epic or feature with spec files. Supports smart path resolution:
  - **Full path**: `.spec/epics/epic-1` → uses exact path
  - **Name only**: `epic-1` → searches spec directory for matching folder

## Command Order: init → plan → prompts → **mockups**

Mockups is step 4. Before running, check previous steps are complete.

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

ALL CHECKS PASS → Proceed to mockup generation
```

Use `--skip-deps` to error instead of auto-running missing steps.

## Options

- `--skip-init`: Error if design.config.yaml missing instead of running init
- `--key <design_key>`: Generate mockup for single design key only
- `--force`: Regenerate existing mockups
- `--format <format>`: Output format (default: html)

## Input Requirements

- `{epic}/design/prompts/{design_key}.spec.json` must exist
- `{epic}/design/tokens.yaml` recommended for consistent styling

## Output

```
{epic}/design/mocks/
├── {design_key}.mock.html    # Visual mockup per screen
└── DESIGN-REVIEW.md           # Review status tracking
```

## Example

```
# Generate all mockups
/pixel-perfect:mockups .spec/epics/epic-1

# Generate single mockup
/pixel-perfect:mockups .spec/epics/epic-1 --key user_profile
```

## Supported Formats

| Format | Extension | Best For |
|--------|-----------|----------|
| html | .mock.html | Web preview, React, Vue |
| png | .mock.png | Mobile, Flutter, native |
| ascii | .mock.txt | CLI applications |
