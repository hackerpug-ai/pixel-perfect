---
description: "Merge design artifacts from a child directory to parent design scope"
---

# Design Merge

Promote design artifacts from a child directory to a parent design scope. This is the explicit version of "promoting" artifacts described in the configuration documentation.

## Usage

```
/pixel-perfect:merge [source] [options]
```

## Arguments

- `[source]`: Source directory containing design artifacts to merge. Defaults to asking for selection.

## Options

- `--target <path>` - Target parent directory (default: upper-most design scope)
- `--dry-run` - Show what would be merged without executing
- `--force` - Skip confirmation prompts (use with caution)

## Behavior

### Default Mode (No Arguments)

```
/pixel-perfect:merge
```

1. Detects all directories with `design/` folders in the project
2. Prompts to select source directory:
   ```
   ? Which design folder do you want to merge upward?
     > features/auth/design/
       features/booking/design/
       features/payment/design/
   ```
3. Detects upper-most design scope as target
4. Shows merge plan and asks for confirmation

### With Source Specified

```
/pixel-perfect:merge features/auth
```

1. Uses `features/auth/design/` as source
2. Detects upper-most design scope as target
3. Shows merge plan and asks for confirmation

### With Target Specified

```
/pixel-perfect:merge features/auth --target features
```

1. Merges `features/auth/design/` → `features/design/`
2. Useful for merging to intermediate parent (not just root)

## Merge Planning

The command analyzes what will be merged and presents a plan:

```
Merge: features/auth/design/ → project/design/

Merging:
  config.yaml, workflows.yaml, screens.yaml, flows.yaml, views.yaml
  tokens.yaml, components.yaml, paradigm.yaml, prompts/, mocks/

Keeping in source:
  research/, UX-DESIGN-PLAN.md

⚠️  Conflicts: tokens.yaml, components.yaml exist in target (will overwrite)

Proceed? (y/n)
```

**What gets merged:** ALL artifacts in the `design/` folder except `research/` and `UX-DESIGN-PLAN.md` (which are always directory-specific).

## Conflict Resolution

When target artifacts already exist:

| Situation | Behavior |
|-----------|----------|
| Target has artifact, source doesn't | Target unchanged |
| Source has artifact, target doesn't | Copy to target |
| Both have artifact | Target **overwritten** (you're warned) |
| Both have artifact, use `--dry-run` | Show conflict, don't execute |

**Recommendation:** Back up target directory before merging, or use `--dry-run` first.

## What Gets Merged

By default, **ALL artifacts** are merged except:

| Excluded | Reason |
|----------|--------|
| `research/` | Context-specific findings (URL analysis, competitor research) |
| `UX-DESIGN-PLAN.md` | Directory-specific design summary |

**Everything else merges:**
- `config.yaml` - Configuration (merges/overrides values)
- `workflows.yaml` - User journeys and task flows
- `screens.yaml` - Screen inventory
- `flows.yaml` - Interaction flows
- `views.yaml` - View specifications
- `tokens.yaml` - Design tokens
- `components.yaml` - Component definitions
- `paradigm.yaml` - Design patterns
- `prompts/` - Specification files
- `mocks/` - HTML mockups

## Post-Merge

After successful merge:

```
✓ Merge complete!

Merged: features/auth/design/ → project/design/
  config.yaml, workflows.yaml, screens.yaml, flows.yaml, views.yaml
  tokens.yaml, components.yaml, paradigm.yaml, prompts/, mocks/

Keeping in source: research/, UX-DESIGN-PLAN.md

Impact: features/auth now inherits from project/design/

Next: /pixel-perfect:status features/auth
```

## Dry Run Mode

Preview changes without executing:

```bash
/pixel-perfect:merge features/auth --dry-run
```

Shows the full merge plan but doesn't modify any files. Use this to:

- Verify what will be merged
- Check for conflicts
- Plan the merge before executing

## Examples

### Merge all artifacts (default)
```bash
/pixel-perfect:merge features/auth

# Merges everything except research/, UX-DESIGN-PLAN.md
# Confirmation shows exactly what will move
```

### Merge to specific parent
```bash
/pixel-perfect:merge features/auth/sessions --target features/auth

# Merges sessions → auth (intermediate parent, not root)
```

### Dry run first
```bash
/pixel-perfect:merge features/auth --dry-run
# Review plan
/pixel-perfect:merge features/auth
# Execute for real
```

## Safety

**This command ALWAYS confirms before merging.** The confirmation screen shows:

- Source and target paths
- Exactly which artifacts will move
- Which artifacts will stay
- Any conflicts that will be overwritten

Only after explicit confirmation does the merge execute.
