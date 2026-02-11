# Change Plan: Directory-Scoped Design (ESLint-Style Cascading)

## Summary

Simplify pixel-perfect to work like ESLint: directory-scoped with cascading configuration. Remove "design system," "epic," and "coding system" terminology. Every directory can have a `design/` folder. Configuration and artifacts cascade from parent directories - more specific (deeper) overrides less specific (higher).

---

## Pending Changes

### ASCII Blueprints for TUI/CLI Platforms

**Status**: Documentation updated, implementation pending

**Summary**: Auto-generate `.blueprint.txt` ASCII blueprints alongside HTML mockups when platform is `tui` or `cli`. Add `--ascii-only` flag to skip HTML entirely.

**Changes**:
- ✅ Updated `commands/mockups.md` with `--ascii-only` flag and blueprint generation rules
- ✅ Updated `commands/prompts.md` with TUI spec metadata (`terminalDimensions`, `outputFormats`)
- ✅ Updated `commands/design.md` Gate 4 to accept `.blueprint.txt` files, added `--ascii-only` passthrough
- ✅ Updated `commands/review.md` with Phase 1b blueprint review checks
- ⏳ Blueprint rendering logic (box drawing, layout generation from spec)
- ⏳ Spec generation logic for `terminalDimensions` and `outputFormats` fields

**Implementation details**:
- Blueprints use Unicode box drawing characters with terminal dimension constraints
- Auto-generated for TUI/CLI platforms; `--ascii-only` works on any platform
- Blueprint review validates structure, dimensions, component coverage, and key bindings
- Follows TUI layout patterns from `docs/ui-design-standards.md` PATTERN 15

---

### Device Frame Support for Mockups

**Status**: Documentation updated, implementation pending

**Summary**: Add `--deviceFrame` flag to `/pixel-perfect:mockups` command to render HTML mockups within appropriate device frames (mobile, tablet, desktop, terminal) with correct aspect ratios.

**Changes**:
- ✅ Updated `commands/mockups.md` with `--deviceFrame` flag documentation
- ✅ Updated `README.md` with flag reference
- ⏳ HTML generation logic to wrap mockups in device frame containers
- ⏳ CSS for device frame styling (bezels, notches, aspect ratios)
- ⏳ Auto-detection logic for platform-based frame selection

**Implementation details**:
- Device frames wrap mockup HTML in a container styled to look like the target device
- HTML comment added indicating frame is for prototyping only, not for production
- Platform-specific frames: iPhone (iOS), Android phone, iPad, Android tablet, desktop browser, terminal window
- Aspect ratio enforcement using CSS to maintain correct proportions
- Customizable frame dimensions for CLI/TUI via tokens

---

## ESLint Analogy

**ESLint model:**
- `.eslintrc` files cascade from parent directories
- Nearest config wins
- Works in any directory - no project-wide setup required

**pixel-perfect model (same pattern):**
- `design/config.yaml` OR `design/design.config.yaml` files cascade from parent directories
- Check for `config.yaml` first, fall back to `design.config.yaml`
- Nearest config wins
- Works in any directory - no setup required
- `design/` folder in any directory contains artifacts for that scope

## Change Type

**MAJOR** - Breaking change to configuration model and terminology. This removes the concept of a global "design system" in favor of simple directory-based scoping.

## Current Version

1.7.0

## New Version

2.0.0

## Affected Files

| File | Change | Description |
|------|--------|-------------|
| `commands/plan.md` | major | Remove designSystem gates, simplify to directory-scoped |
| `commands/init.md` | major | Remove design system detection, simplify to directory init |
| `commands/design-system.md` | delete | Remove design-system command entirely |
| `commands/refine.md` | modify | Update for directory-scoped workflow |
| `commands/status.md` | modify | Update for directory-scoped workflow |
| `docs/CONFIG.md` | major | Remove designSystem section, simplify config |
| `schemas/config.schema.json` | modify | Remove designSystem from schema |
| `README.md` | major | Remove design-system language, simplify docs |
| `.claude-plugin/plugin.json` | modify | Bump version to 2.0.0 |
| `.claude-plugin/marketplace.json` | modify | Bump version to 2.0.0 |

## Implementation Tasks

### Remove Design System Command

- [ ] Delete `commands/design-system.md` entirely
- [ ] Remove design-system command from README command list
- [ ] Remove all references to design-system from documentation

### Config File Support (Both Names)

- [ ] **Support both `config.yaml` and `design.config.yaml`**
  - Prefer: `design/config.yaml` (new default)
  - Fallback: `design/design.config.yaml` (for backward compatibility)
  - Check both files when resolving config, use whichever exists
  - Like ESLint supports `.eslintrc`, `.eslintrc.json`, `package.json`
  - Update all documentation to mention both options

### Simplify Config

- [ ] Remove `designSystem` section from `.pixel-perfect/config.json` schema
- [ ] Remove `designSystem` from `schemas/config.schema.json`
- [ ] Simplify config to only: `version`, `defaults`, `extensions`

### Update Plan Command

- [ ] Remove GATE 2 (Resolve Artifact Inheritance)
- [ ] Simplify GATE 1 to just check for local `design.config.yaml`
- [ ] Remove all design system terminology
- [ **New behavior**: Target directory → check for `design/config.yaml` → if missing, run init → generate artifacts

### Update Init Command

- [ ] Remove design system detection
- [ ] Remove "inherit from design system" prompt
- [ ] Simplify to: "Initialize design in this directory?"
- [ ] Create `design/config.yaml` with user inputs
- [ ] Create all artifact templates in `design/`

### Update Refine Command

- [ ] Remove design system merge options
- [ ] Simplify to: refine artifacts in current directory's `design/` folder

### Update Status Command

- [ ] Remove design system status display
- [ ] Show only: current directory's design artifacts and their status

### Update Documentation

- [ ] Rewrite README to remove "epic," "design system" terminology
- [ ] Update examples to show directory-based workflow
- [ ] Simplify getting started guide

## New Directory-Scoped Model (ESLint-Style)

### Universal Rule (Like ESLint)

**Any directory can have a `design/` folder. Configuration cascades upward from the target directory.**

```
any-directory/
└── design/
    ├── config.yaml           # Directory settings (preferred)
    # OR
    ├── design.config.yaml   # Also supported (backward compatibility)
    ├── paradigm.yaml
    ├── tokens.yaml
    └── components.yaml
```

**Config file resolution (in order):**
1. Check `{directory}/design/config.yaml`
2. Check `{directory}/design/design.config.yaml`
3. Use whichever is found (prefer `config.yaml` if both exist)
4. Like ESLint checks `.eslintrc`, `.eslintrc.json`, `package.json`

```
project-root/
├── design/
│   ├── config.yaml           # Base settings (like root .eslintrc)
│   ├── tokens.yaml           # Shared tokens
│   └── components.yaml       # Shared components
├── features/
│   ├── design/
│   │   ├── config.yaml       # Feature overrides (like .eslintrc in features/)
│   │   └── views.yaml        # Feature-specific views
│   └── auth/
│       └── design/
│           ├── config.yaml   # Auth overrides (most specific, wins)
│           └── flows.yaml    # Auth-specific flows
```

**When working in `features/auth/`:**

Config resolution (like ESLint):
1. Start with `project-root/design/config.yaml` → ALL settings apply here
2. Check `features/design/config.yaml` → if exists, merge in overrides
3. Check `features/auth/design/config.yaml` → if exists, merge in overrides
4. Result: Parent configs apply completely, child configs only specify changes

Artifact resolution:
1. Check `features/auth/design/tokens.yaml` → missing
2. Check `features/design/tokens.yaml` → missing
3. Check `project-root/design/tokens.yaml` → found, use it!

**Just like ESLint:** Parent configs/rules apply to all child directories. Child configs only specify what they want to override or add.

**Example - child config with overrides only:**
```yaml
# project-root/design/config.yaml (base)
platforms: [web-desktop, web-mobile]
vibe: minimal
naming: snake_case

# features/auth/design/config.yaml (overrides ONLY)
platforms: [mobile-ios, mobile-android]  # Override: replaces parent
# vibe, naming inherited from parent
```

```
any-directory/
├── design/
│   ├── config.yaml           # Directory-specific settings
│   ├── paradigm.yaml
│   ├── tokens.yaml
│   ├── components.yaml
│   ├── workflows.yaml
│   ├── screens.yaml
│   ├── flows.yaml
│   ├── views.yaml
│   ├── prompts/
│   └── mocks/
└── (other project files)
```

### Cascading Configuration

Configs cascade naturally by directory hierarchy:

```
project-root/
├── design/
│   └── config.yaml           # Base settings
├── features/
│   ├── design/
│   │   └── config.yaml       # Overrides for this feature
│   └── auth/
│       └── design/
│           └── config.yaml   # Overrides for auth (most specific)
```

**Resolution:**
1. Most specific (deepest nested) `design/config.yaml` wins
2. Parent configs provide defaults
3. No global "design system" - just directory hierarchy

### Artifact Resolution

When working in a directory:

1. **Check for artifacts in current directory's `design/` folder**
2. **If missing, check parent directory's `design/` folder**
3. **Continue up until found or root reached**
4. **Generate in current directory if not found**

**Example:**
```
project/design/tokens.yaml exists (base colors)
features/auth/design/ (no tokens.yaml)

When working in features/auth/:
  → Inherit tokens.yaml from project/design/
  → Generate auth-specific artifacts locally
```

## Simplified Commands

### /pixel-perfect:init

Initialize design in the current/target directory.

```
/pixel-perfect:init [directory]
```

**What it does:**
1. Creates `directory/design/config.yaml` with user inputs
2. Creates empty artifact templates in `directory/design/`
3. Asks: platforms, vibe, requirements location

### /pixel-perfect:plan

Generate design artifacts for the target directory.

```
/pixel-perfect:plan [directory]
```

**What it does:**
1. Checks for `design/config.yaml` in target (or parent)
2. If missing, runs init first
3. Reads PRD from target directory
4. Generates artifacts in `target/design/`
5. Inherits from parent `design/` if available

### /pixel-perfect:design

Full workflow: init → plan → prompts → mockups → review

```
/pixel-perfect:design [directory]
```

## Removed Concepts

| Removed | Replaced By |
|---------|-------------|
| "epic" | "directory" or "target" |
| "design system" | Directory hierarchy with `design/` folders |
| "promote to design system" | Manual copy or parent directory setup |
| "merge to design system" | Manual file management |
| "specRoot" | Current working directory or explicit path |

## New Config Schema

```json
{
  "version": "2.0",
  "defaults": {
    "platforms": [],
    "vibe": null,
    "naming": "snake_case"
  },
  "extensions": {
    "spec": ".spec.json",
    "mock": ".mock.html"
  }
}
```

**Removed fields:**
- `specRoot` - Use explicit paths or current directory
- `designSystem` - No global design system

## Examples

### Single Project Workflow

```bash
# Initialize design in current directory
/pixel-perfect:init

# Generate design artifacts
/pixel-perfect:plan

# Generate mockups
/pixel-perfect:mockups

# Review
/pixel-perfect:review
```

### Multi-Directory Project

```bash
# Initialize base design at project root
cd /project
/pixel-perfect:init

# Work on feature subdirectory
/pixel-perfect:plan features/auth

# Auth inherits tokens/components from project/design/
# Auth-specific artifacts (views, flows) generated in features/auth/design/
```

### Nested Directories (ESLint-Style)

```
project/
├── design/
│   ├── config.yaml       # Base: vibe=minimal, platforms=[web]
│   ├── tokens.yaml       # Base colors
│   └── components.yaml   # Base components
├── features/
│   └── auth/
│       └── design/
│           ├── config.yaml   # Override: platforms (only what changes)
│           ├── flows.yaml    # Auth-specific flows
│           └── views.yaml    # Auth-specific views

# project/design/config.yaml:
platforms: [web-desktop, web-mobile]
vibe: minimal
naming: snake_case

# features/auth/design/config.yaml:
platforms: [mobile-ios, mobile-android]  # Only override what changes
# vibe, naming inherited from parent

# When working in features/auth:
# - Config: platforms=[mobile-ios, mobile-android], vibe=minimal, naming=snake_case
# - Artifacts: tokens, components inherited from project/design/
```

## Required: Version Bump

- [ ] Update `.claude-plugin/plugin.json` version to 2.0.0
- [ ] Update `.claude-plugin/marketplace.json` metadata.version to 2.0.0
- [ ] Update `.claude-plugin/marketplace.json` plugins[0].version to 2.0.0

## Required: Test Updates

- [ ] Create/update tests in `/tests/` for:
  - Directory-scoped artifact resolution
  - Cascading config from parent directories
  - Init in nested directories
  - Plan command without global config
  - Status without design system
  - Artifact inheritance from parent `design/` folders

## Migration Notes

**For users with existing design-system setup:**

1. Your existing `design-system/` folder becomes a `design/` folder
2. Rename: `.spec/design-system/` → `.spec/design/`
3. Update config: Remove `designSystem` section
4. Each epic that inherited from design system now works the same way via directory hierarchy
5. No artifact changes needed - just folder structure

**Migration script:**
```bash
# Rename design-system to design
mv .spec/design-system .spec/design

# Update config (remove designSystem section)
# No other changes needed
```
