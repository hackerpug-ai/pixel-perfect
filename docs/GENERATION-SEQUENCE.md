# Generation Sequence

This document defines the canonical order of operations for all pixel-perfect commands.

## Core Principle

**Relative ordering, not mandatory steps.**

When generating or refining artifacts, only run the steps that are needed, but always maintain this relative order:

```
config → UX plan → paradigm → tokens → components → flows/workflows → views/screens → prompts → mocks
```

## Order of Operations

| Order | Artifact | Depends On |
|-------|----------|------------|
| 1 | design.config.yaml | (none) |
| 2 | UX-DESIGN-PLAN.md | config |
| 3 | paradigm.yaml | UX plan |
| 4 | tokens.yaml | paradigm |
| 5 | components.yaml | tokens |
| 6 | flows.yaml, workflows.yaml | components |
| 7 | views.yaml, screens.yaml | flows, components |
| 8 | prompts/*.spec.json | views, screens |
| 9 | mocks/*.mock.html | prompts |

## How It Works

### Example 1: Full generation
All steps run in order 1 → 9

### Example 2: Only tokens changing
Run: tokens → components → prompts → mocks
Skip: config, UX plan, paradigm, flows, views (unchanged)

### Example 3: Only components changing
Run: components → flows → views → prompts → mocks
Skip: config, UX plan, paradigm, tokens (unchanged)

### Example 4: Only views changing
Run: views → prompts → mocks
Skip: everything before views (unchanged)

### Example 5: Adding a new screen
Run: screens → prompts (for new screen) → mocks (for new screen)
Skip: everything else (unchanged)

## Dependency Cascade

When an artifact changes, everything downstream MAY need regeneration:

```
config ──────────────────────────────────────────────────────────────►
         UX plan ────────────────────────────────────────────────────►
                  paradigm ──────────────────────────────────────────►
                            tokens ──────────────────────────────────►
                                    components ──────────────────────►
                                                flows ───────────────►
                                                       views ────────►
                                                              prompts►
                                                                 mocks
```

**"MAY need"** - not always required. Use judgment:
- Token color change → regenerate mocks (visual change)
- Token spacing change → regenerate mocks (layout change)
- Component API change → regenerate views that use it
- Component internal change → may not need downstream regeneration

## Smart Regeneration

Commands should:

1. **Detect what changed** - Compare against existing artifacts
2. **Identify affected downstream** - Based on dependency graph
3. **Skip unchanged** - Don't regenerate artifacts that aren't affected
4. **Maintain order** - When regenerating multiple, follow the sequence

## Applying to Commands

### /pixel-perfect:plan
- Generates artifacts 2-8 (UX plan through screens)
- Skips any that already exist unless `--force`
- Always maintains relative order

### /pixel-perfect:prompts
- Generates artifact 8 (prompts)
- Only for views/screens that changed or are new

### /pixel-perfect:mockups
- Generates artifact 9 (mocks)
- Only for prompts that changed or are new

### /pixel-perfect:refine
- Identifies which artifacts need changes
- Runs only those + their downstream dependencies
- Maintains relative order

### /pixel-perfect:design
- Full workflow: init → plan → prompts → mocks → review
- Each phase respects the sequence internally

## Summary

The sequence ensures:
1. **Consistency** - Downstream artifacts always reflect upstream changes
2. **Efficiency** - Skip unchanged steps
3. **Correctness** - Dependencies are satisfied before dependents run
