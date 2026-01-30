---
description: "Generate visual mockups from specification files"
---

# Design Mockups

Generate visual mockups from specification files.

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

  CHECK: prompts/*.spec.json exists?
    NO → ┌──────────────────────────────────────────────────┐
         │ STOP. Execute /pixel-perfect:prompts completely.│
         │ Wait for prompts to finish. Then return here.   │
         └──────────────────────────────────────────────────┘

  ALL EXIST → Proceed to mockup generation
```

**This check is NOT optional. You MUST run missing steps.**

---

## Command Order: init → plan → prompts → **mockups**

## Usage

```
/pixel-perfect:mockups <epic-path> [options]
```

## Arguments

- `<target>`: Epic or feature with spec files. Supports smart path resolution:
  - **Full path**: `.spec/epics/epic-1` → uses exact path
  - **Name only**: `epic-1` → searches spec directory for matching folder

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
