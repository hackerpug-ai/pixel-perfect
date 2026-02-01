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
- `--artifacts <list>` - Specific artifacts to merge (default: all promotable)
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

### Selective Artifact Merge

```
/pixel-perfect:merge features/auth --artifacts tokens,components,paradigm
```

1. Merges only specified artifacts
2. Leaves other artifacts untouched in source directory

## Merge Planning

The command analyzes what will be merged and presents a plan:

```
═══════════════════════════════════════════════════════════
MERGE PLAN
═══════════════════════════════════════════════════════════

Source: features/auth/design/
Target: project/design/

Artifacts to merge:
  ✅ tokens.yaml        → will be promoted
  ✅ components.yaml    → will be promoted
  ✅ paradigm.yaml      → will be promoted

Artifacts remaining in source:
  ⏸️  workflows.yaml    → kept in features/auth/design/
  ⏸️  screens.yaml      → kept in features/auth/design/
  ⏸️  flows.yaml        → kept in features/auth/design/
  ⏸️  views.yaml        → kept in features/auth/design/
  ⏸️  UX-DESIGN-PLAN.md → kept in features/auth/design/

Conflict detection:
  ⚠️  tokens.yaml exists in target - will be overwritten
  ⚠️  components.yaml exists in target - will be overwritten

═══════════════════════════════════════════════════════════

? Proceed with merge?
  > Confirm - Execute merge as planned
    Modify - Select different artifacts or target
    Cancel - Abort merge
```

## Conflict Resolution

When target artifacts already exist:

| Situation | Behavior |
|-----------|----------|
| Target has artifact, source doesn't | Target unchanged |
| Source has artifact, target doesn't | Copy to target |
| Both have artifact | Target **overwritten** (you're warned) |
| Both have artifact, use `--dry-run` | Show conflict, don't execute |

**Recommendation:** Back up target directory before merging, or use `--dry-run` first.

## Smart Detection

If the invocation includes descriptions of what to merge:

```
/pixel-perfect:merge features/auth "just the color tokens and button components"
```

Analyzes the free-text input:
- "color tokens" → tokens.yaml (colors section)
- "button components" → components.yaml (Button variants)

Presents detected plan:
```
Detected from your description:
  ✅ tokens.yaml (colors section)
  ✅ components.yaml (Button component family)

? Is this correct?
  > Yes - merge these artifacts
    No - I meant something else
```

## What Can Be Merged

| Artifact | Mergeable | Notes |
|----------|-----------|-------|
| `tokens.yaml` | ✅ Yes | Commonly promoted - colors, spacing, typography |
| `components.yaml` | ✅ Yes | Reusable components |
| `paradigm.yaml` | ✅ Yes | Design patterns, principles |
| `workflows.yaml` | ⚠️ Rare | Usually feature-specific, but possible |
| `screens.yaml` | ❌ No | Always directory-specific - not mergeable |
| `flows.yaml` | ❌ No | Always directory-specific - not mergeable |
| `views.yaml` | ❌ No | Always directory-specific - not mergeable |

Attempting to merge non-mergeable artifacts shows warning:

```
⚠️  screens.yaml cannot be merged (directory-specific)
   Did you mean to copy the file manually instead?
```

## Post-Merge

After successful merge:

1. **Source artifacts removed** (moved to target, not copied)
2. **Target updated** with merged artifacts
3. **Children of source** now inherit from target
4. **Summary displayed:**

```
✓ Merge complete!

Merged:
  → tokens.yaml (features/auth/design/ → project/design/)
  → components.yaml (features/auth/design/ → project/design/)
  → paradigm.yaml (features/auth/design/ → project/design/)

Impact:
  → features/auth now inherits tokens from project/design/
  → features/booking now inherits tokens from project/design/
  → features/payment now inherits tokens from project/design/

Next steps:
  → /pixel-perfect:status features/auth (verify inheritance)
  → /pixel-perfect:plan features/auth (regenerate with parent tokens)
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

### Merge all promotable artifacts
```bash
/pixel-perfect:merge features/auth

# Promotes tokens, components, paradigm to parent
# Keeps workflows, screens, flows, views in source
```

### Merge to specific parent
```bash
/pixel-perfect:merge features/auth/sessions --target features/auth

# Merges sessions → auth (not all the way to root)
```

### Selective merge
```bash
/pixel-perfect:merge features/auth --artifacts tokens

# Only merges tokens.yaml
```

### Dry run first
```bash
/pixel-perfect:merge features/auth --dry-run
# Review plan
/pixel-perfect:merge features/auth
# Execute for real
```

### Smart detection
```bash
/pixel-perfect:merge features/auth "move the color system and button components"

# Detects: tokens.yaml (colors), components.yaml (buttons)
```

## Safety

**This command ALWAYS confirms before merging.** The confirmation screen shows:

- Source and target paths
- Exactly which artifacts will move
- Which artifacts will stay
- Any conflicts that will be overwritten

Only after explicit confirmation does the merge execute.
