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
3. **Review downstream for compliance** - Even if not regenerating, validate downstream artifacts still comply with upstream changes
4. **Skip unchanged** - Don't regenerate artifacts that aren't affected
5. **Maintain order** - When regenerating multiple, follow the sequence

### Cascade Review

When an upstream artifact changes, downstream artifacts need at least a **compliance review**:

| Changed | Review These for Compliance |
|---------|----------------------------|
| tokens | components (token usage), views (spacing/colors), mocks (visual) |
| components | views (component usage), flows (component refs), mocks |
| paradigm | all artifacts (pattern adherence) |

**Review vs Regenerate:**
- **Review**: Check if existing artifact still complies with upstream changes. Flag issues.
- **Regenerate**: Recreate the artifact from scratch.

Example: If `tokens.yaml` changes the primary color:
1. **Review** `components.yaml` - Do components reference the token correctly? (likely yes)
2. **Review** `views.yaml` - Do views use the components/tokens correctly? (likely yes)
3. **Regenerate** `prompts/` - Specs need updated token values
4. **Regenerate** `mocks/` - Visuals need to reflect new color

Example: If `tokens.yaml` adds a new spacing scale:
1. **Review** `components.yaml` - Should any components use the new spacing?
2. **Review** `views.yaml` - Should any views adopt the new spacing?
3. **Prompt user** if reviews find opportunities to apply new standards

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

## UX-DESIGN-PLAN.md: Progressive Disclosure

The UX-DESIGN-PLAN.md serves as an **overview that references other artifacts** rather than duplicating their content.

**DO:**
```markdown
## Design Tokens
See `tokens.yaml` for the complete token system.

Key decisions:
- Using 8px base grid (see `tokens.yaml#spacing`)
- Primary palette inspired by ocean tones (see `tokens.yaml#colors.primary`)

## Components
See `components.yaml` for full component specifications.

Core patterns:
- Card-based layouts for content display (see `components.yaml#Card`)
- Bottom sheet for contextual actions (see `components.yaml#BottomSheet`)
```

**DON'T:**
```markdown
## Design Tokens
- Primary color: #0d9488
- Spacing: 4px, 8px, 12px, 16px, 24px, 32px
- Font sizes: 12px, 14px, 16px, 18px, 24px, 32px
```

**Benefits:**
- Single source of truth (YAML files)
- UX plan stays readable and high-level
- Changes to tokens/components don't require UX plan updates
- Progressive disclosure: overview → details

## Summary

The sequence ensures:
1. **Consistency** - Downstream artifacts always reflect upstream changes
2. **Efficiency** - Skip unchanged steps
3. **Correctness** - Dependencies are satisfied before dependents run
4. **Compliance** - Downstream artifacts are reviewed when upstream changes
