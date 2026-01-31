---
description: "Manage project-level global design system for shared artifacts across epics"
---

# Design System

Manage the shared design system used across all epics. The global design system allows you to maintain consistent design tokens, components, and paradigms across your entire project.

## Usage

```
/pixel-perfect:design-system <action> [options]
```

## Actions

### init

Create an empty global design system folder with template files.

```
/pixel-perfect:design-system init [--path <path>]
```

**Options:**
- `--path <path>`: Custom location for global design (default: `design-system/`)

**Creates:**
```
{path}/
├── paradigm.yaml   (empty template with structure)
├── tokens.yaml     (empty template with structure)
└── components.yaml (empty template with structure)
```

**Example:**
```
> /pixel-perfect:design-system init

Creating global design system at /design-system/...

Created:
  ✓ /design-system/paradigm.yaml (design patterns template)
  ✓ /design-system/tokens.yaml (design tokens template)
  ✓ /design-system/components.yaml (components template)

Next steps:
  1. Populate the template files with your design standards
  2. Enable in .pixel-perfect/config.json:
     {
       "designSystem": {
         "enabled": true,
         "path": "design-system"
       }
     }
  3. Run /pixel-perfect:plan on any epic to use global design
```

### promote

Promote foundation artifacts from an existing epic to the global design system.

```
/pixel-perfect:design-system promote <epic> [--artifacts <list>]
```

**Arguments:**
- `<epic>`: Source epic with established design artifacts

**Options:**
- `--artifacts <list>`: Comma-separated list of artifacts to promote (default: `paradigm,tokens,components`)

**Workflow:**
1. Validates source epic has the specified artifacts
2. Shows diff if global artifacts already exist
3. Confirms before overwriting
4. Copies artifacts to global location
5. Updates config if needed

**Example:**
```
> /pixel-perfect:design-system promote epic-1

Promoting design artifacts from epic-1 to global library...

Source: epic-1/design-system/
  ✓ paradigm.yaml (3.2 KB)
  ✓ tokens.yaml (4.1 KB)
  ✓ components.yaml (8.7 KB)

Destination: /design-system/
  (empty - no existing global design)

? Promote these artifacts to the global design system?
  > Yes, copy to /design-system/
    No, cancel

Copying artifacts...
  ✓ paradigm.yaml → /design-system/paradigm.yaml
  ✓ tokens.yaml → /design-system/tokens.yaml
  ✓ components.yaml → /design-system/components.yaml

Global design system created!

Other epics can now use these shared artifacts.
Enable in .pixel-perfect/config.json if not already configured.
```

**When global artifacts already exist:**
```
> /pixel-perfect:design-system promote epic-2

Destination: /design-system/
  ⚠ paradigm.yaml exists (last modified: 2025-01-25)
  ⚠ tokens.yaml exists (last modified: 2025-01-25)
  ⚠ components.yaml exists (last modified: 2025-01-25)

? How would you like to handle existing files?
  > Show diff for each file
    Overwrite all (use epic-2 versions)
    Skip existing (only copy missing)
    Cancel

[If "Show diff" selected, displays diff for each file with option to accept/reject]
```

### merge

Merge epic design artifacts into the global design system with diff-based conflict resolution.

```
/pixel-perfect:design-system merge <epic> [options]
```

**Arguments:**
- `<epic>`: Source epic to merge from

**Options:**
- `--skip`: Skip all conflicting files (keep global versions)
- `--accept-all`: Auto-accept all changes from epic (overwrite global)
- `--artifacts <list>`: Only merge specific artifacts (comma-separated)

**Difference from promote:**
- `promote` - Copies/overwrites without detailed comparison
- `merge` - Shows diffs for conflicts and lets you resolve each one

**Workflow:**
1. Check if global design system exists
   - If not configured → offer to set up design system first
2. Load epic artifacts and global artifacts
3. For each artifact in scope:
   - If global doesn't exist → copy from epic (no conflict)
   - If global exists and identical → skip (no change needed)
   - If global exists and different → show diff, prompt for resolution

**When no design system exists:**
```
> /pixel-perfect:design-system merge epic-1

No global design system configured.

? Would you like to set one up now?
  > Yes, create design system at /design-system/
    Yes, create at custom path
    No, cancel

Creating global design system at /design-system/...

Updating .pixel-perfect/config.json:
  ✓ Added designSystem.enabled = true
  ✓ Added designSystem.path = "design"

Now merging epic-1 into the new design system...

paradigm.yaml: NEW → copying from epic
tokens.yaml: NEW → copying from epic
components.yaml: NEW → copying from epic

Design system created and populated from epic-1:
  ✓ /design-system/paradigm.yaml
  ✓ /design-system/tokens.yaml
  ✓ /design-system/components.yaml

Future epics will now use these shared artifacts.
```

**Example:**
```
> /pixel-perfect:design-system merge epic-1

Comparing epic-1/design-system/ with /design-system/...

paradigm.yaml: No changes (identical)
tokens.yaml: CONFLICT (3 differences)
components.yaml: CONFLICT (1 new component)

tokens.yaml:
  ┌─ CONFLICT ────────────────────────────────────────────┐
  │ Global (current):                                      │
  │   colors:                                              │
  │     primary: "#2563eb"                                 │
  │                                                        │
  │ Epic (incoming):                                       │
  │   colors:                                              │
  │     primary: "#0d9488"                                 │
  │     accent: "#f59e0b"  # NEW                          │
  └────────────────────────────────────────────────────────┘

? How would you like to resolve this conflict?
  > Accept epic changes (update global)
    Keep global (skip this file)
    View full diff
    Accept all remaining (--accept-all)
    Skip all remaining (--skip)

? tokens.yaml: Accept epic changes?
  > Yes, update global

? components.yaml: Accept epic changes?
  > Yes, update global

Merge complete:
  ✓ tokens.yaml updated
  ✓ components.yaml updated
  - paradigm.yaml unchanged
```

**Using --skip to keep global versions:**
```
> /pixel-perfect:design-system merge epic-2 --skip

Comparing epic-2/design-system/ with /design-system/...

paradigm.yaml: CONFLICT → skipped (kept global)
tokens.yaml: No changes (identical)
components.yaml: CONFLICT → skipped (kept global)

Merge complete:
  - paradigm.yaml skipped (conflict)
  - tokens.yaml unchanged
  - components.yaml skipped (conflict)
```

**Using --accept-all to auto-merge:**
```
> /pixel-perfect:design-system merge epic-3 --accept-all

Comparing epic-3/design-system/ with /design-system/...

paradigm.yaml: No changes (identical)
tokens.yaml: CONFLICT → accepted epic version
components.yaml: CONFLICT → accepted epic version

Merge complete:
  - paradigm.yaml unchanged
  ✓ tokens.yaml updated (auto-accepted)
  ✓ components.yaml updated (auto-accepted)
```

**Merging specific artifacts only:**
```
> /pixel-perfect:design-system merge epic-1 --artifacts tokens

Comparing epic-1/design-system/ with /design-system/...
(Only checking: tokens.yaml)

tokens.yaml: CONFLICT (3 differences)

? Accept epic changes for tokens.yaml?
  > Yes, update global

Merge complete:
  ✓ tokens.yaml updated
```

### status

Show current global design system status and usage.

```
/pixel-perfect:design-system status
```

**Example:**
```
> /pixel-perfect:design-system status

Global Design System Status
════════════════════════════════════════════════════════════════

Configuration: .pixel-perfect/config.json
  enabled: true
  path: design-system/

Artifacts:
  ✓ paradigm.yaml    (2.8 KB, modified 2025-01-28)
  ✓ tokens.yaml      (4.2 KB, modified 2025-01-30)
  ✓ components.yaml  (9.1 KB, modified 2025-01-30)

Epics using global design:
  • epic-1/design-system/ (linked: paradigm, tokens, components)
  • epic-2/design-system/ (linked: paradigm, tokens, components)
  • epic-3/design-system/ (linked: tokens only - has local paradigm override)

Epics NOT using global design:
  • epic-4/design-system/ (no designSystem in config)
  • legacy-feature/design-system/ (predates global design)

════════════════════════════════════════════════════════════════
```

**When global design is not configured:**
```
> /pixel-perfect:design-system status

Global Design System Status
════════════════════════════════════════════════════════════════

Configuration: Not enabled

To enable global design system:

1. Create config: mkdir -p .pixel-perfect

2. Add to .pixel-perfect/config.json:
   {
     "designSystem": {
       "enabled": true,
       "path": "design-system"
     }
   }

3. Initialize library: /pixel-perfect:design-system init

4. Or promote from existing epic: /pixel-perfect:design-system promote <epic>
```

### validate

Validate integrity of global design system and check for issues.

```
/pixel-perfect:design-system validate
```

**Checks performed:**
- YAML syntax validation
- Required fields presence
- Token references in components
- Cross-reference integrity

**Example:**
```
> /pixel-perfect:design-system validate

Validating global design system at /design-system/...

paradigm.yaml
  ✓ Valid YAML syntax
  ✓ Required sections present (principles, patterns, references)

tokens.yaml
  ✓ Valid YAML syntax
  ✓ Required sections present (colors, spacing, typography)
  ⚠ Warning: color 'accent-tertiary' defined but not used in components

components.yaml
  ✓ Valid YAML syntax
  ✓ Required sections present (primitives, composites)
  ✓ All token references resolve

Summary:
  3 files validated
  0 errors
  1 warning

Global design system is valid.
```

## Project Configuration

The library command respects and can update `.pixel-perfect/config.json`:

```json
{
  "designSystem": {
    "enabled": true,
    "path": "design-system",
    "artifacts": ["paradigm", "tokens", "components"]
  }
}
```

## Workflow Benefits

When a global design-system is configured, all commands automatically:

1. **Read from design-system first** - Commands check `design-system/` for paradigm, tokens, and components before generating new ones
2. **Use library defaults** - Epic-level design inherits colors, spacing, typography, and component definitions from the global library
3. **Skip foundation preconditions** - Sequential epics don't need to re-run `/pixel-perfect:plan --foundation` since they inherit from the library
4. **Focus on epic-specific artifacts** - Commands only generate workflows, screens, flows, and views (the epic-specific parts)

**Example: Second epic workflow**
```bash
# First epic - full workflow
/pixel-perfect:design epic-1
/pixel-perfect:design-system promote epic-1

# Second epic - streamlined (library provides foundation)
/pixel-perfect:design epic-2
# ↳ Skips: paradigm, tokens, components (uses library)
# ↳ Generates: workflows, screens, flows, views, prompts, mocks
```

This means new epics start faster with consistent design foundations.

## Examples

### Setting up global design from scratch
```
# 1. Initialize empty library
/pixel-perfect:design-system init

# 2. Manually populate templates or...

# 3. Design first epic, then promote
/pixel-perfect:design epic-1
/pixel-perfect:design-system promote epic-1

# 4. Future epics use global design automatically
/pixel-perfect:design epic-2
```

### Checking what's shared
```
/pixel-perfect:design-system status
```

### Updating global design
```
# Option 1: Edit global files directly
# Edit /design-system/tokens.yaml

# Option 2: Refine from an epic (with global option)
/pixel-perfect:refine epic-1
# Select tokens → Choose "Refine globally"

# Option 3: Promote updated epic (overwrites)
/pixel-perfect:design-system promote epic-1 --artifacts tokens

# Option 4: Merge with conflict resolution
/pixel-perfect:design-system merge epic-1
```

### Merging epic improvements back to global
```
# After refining an epic, merge changes back
/pixel-perfect:design-system merge epic-1

# Auto-accept all changes
/pixel-perfect:design-system merge epic-1 --accept-all

# Skip conflicts, only merge identical files
/pixel-perfect:design-system merge epic-1 --skip

# Merge only specific artifacts
/pixel-perfect:design-system merge epic-1 --artifacts tokens,components
```
