---
description: "Generate design artifacts from PRD: UX plan, paradigm, tokens, components, flows, views"
---

# Design Plan

Generate design artifacts from a PRD (Product Requirements Document).

## Directory-Scoped Model (ESLint-Style)

pixel-perfect works like ESLint: configuration and artifacts cascade from parent directories.

```
project/
├── design/
│   ├── config.yaml           # Base settings
│   ├── tokens.yaml           # Shared tokens
│   └── components.yaml       # Shared components
└── features/
    └── auth/
        └── design/
            ├── config.yaml   # Auth overrides (optional)
            ├── flows.yaml    # Auth-specific flows
            └── views.yaml    # Auth-specific views
```

**Config resolution:**
1. Check `{target}/design/config.yaml`
2. Check `{target}/design/design.config.yaml`
3. Check parent directories for `design/config.yaml` or `design/design.config.yaml`
4. Merge all found configs (most specific wins for conflicts)

**Artifact resolution:**
1. Check `{target}/design/{artifact}.yaml`
2. Check parent directories for `{artifact}.yaml`
3. Use first found, generate in target if not found

## EXECUTION GATES - MANDATORY

You MUST execute these gates BEFORE generating any YAML.

```
┌─────────────────────────────────────────────────────────────────────┐
│ GATE 0: RESOLVE TARGET DIRECTORY                                  │
│                                                                     │
│   target provided?                                                  │
│     YES → dir = {target}                                           │
│     NO  → dir = current working directory                          │
└─────────────────────────────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────────────────────────────┐
│ GATE 1: RESOLVE CONFIG (ESLint-Style Cascading)                  │
│                                                                     │
│   Search upward for config files:                                  │
│                                                                     │
│   1. {dir}/design/config.yaml                                     │
│   2. {dir}/design/design.config.yaml                               │
│   3. {parent}/design/config.yaml                                 │
│   4. {parent}/design/design.config.yaml                           │
│   ... (continue until root or config found)                        │
│                                                                     │
│   If NO config found → HALT and run init                           │
│                                                                     │
│   Display "cascade path" showing which configs were read:          │
│     Found: design/config.yaml                                      │
│     Parent: /project/design/config.yaml (merged)                   │
│     Effective: merged (parent + local overrides)                   │
└─────────────────────────────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────────────────────────────┐
│ GATE 2: LOAD DESIGN SYSTEM REFERENCE (Progressive Disclosure)    │
│                                                                     │
│   config.designSystem.name exists AND is not null?                 │
│     YES → Read docs/design-systems/{name}.md                      │
│           Read docs/icon-libraries/{iconLibrary.name}.md           │
│           Use as context for ALL subsequent artifact generation     │
│     NO  → config.iconLibrary.name exists AND is not null?          │
│             YES → Read docs/icon-libraries/{name}.md only          │
│             NO  → Skip (use generic patterns)                      │
│                                                                     │
│   This is progressive disclosure: design system docs are ONLY      │
│   loaded when relevant, not always.                                │
└─────────────────────────────────────────────────────────────────────┘
          ↓
     ALL GATES PASSED → Generate YAML artifacts
```

**NEVER generate YAML without passing config check. NEVER skip init if config missing.**

---

## Command Order: init → **plan** → prompts → mockups

## Usage

```
/pixel-perfect:plan [directory] [options]
```

## Arguments

- `[directory]`: Target directory for design artifacts. Defaults to current directory.

## Options

- `--force-init`: Run init even if config exists (recreates config)
- `--show-cascade`: Display full cascade path and config resolution
- `--foundation`: Generate only foundation artifacts (paradigm, tokens, components)
- `--continue`: Continue with detail artifacts (flows, workflows, views, screens)
- `--research <scope>`: Paradigm research scope: `codebase`, `web`, or `both`
- `--skip-research`: Skip paradigm research phase

## Generation Sequence

**Relative ordering, not mandatory steps.** Only generate what's needed, but maintain this order:

```
UX plan → paradigm → tokens → components → flows/workflows → views/screens
```

See `docs/GENERATION-SEQUENCE.md` for full details.

### Foundation (Phase 1-4)
1. **UX-DESIGN-PLAN.md** - Design overview
2. **paradigm.yaml** - Design patterns, principles, references
   - If design system selected: reference its component patterns and conventions
3. **tokens.yaml** - Design tokens (colors, spacing, typography)
   - If design system selected: use its default token values as starting point
   - See design system reference doc for token conventions
4. **components.yaml** - Reusable component definitions
   - If design system selected: use its component names and variant patterns
   - See design system reference doc for component name mapping

### Detail (Phase 5-8)
5. **flows.yaml** - Interaction flows
6. **workflows.yaml** - User journeys and task flows
7. **views.yaml** - Detailed view specifications
8. **screens.yaml** - Screen inventory with hierarchy

### Smart Generation
- Skip artifacts that exist in parent `design/` folders
- Skip artifacts that already exist locally (unless `--force`)
- When regenerating, only update changed artifacts + downstream dependencies

### Cascading Artifact Resolution

When generating artifacts, the system checks parent directories:

```
Working in: features/auth/design/

For paradigm.yaml:
  1. Check features/auth/design/paradigm.yaml → missing
  2. Check features/design/paradigm.yaml → missing
  3. Check design/paradigm.yaml → FOUND, use parent

Result: Skip paradigm.yaml generation (inherit from parent)

For views.yaml:
  1. Check features/auth/design/views.yaml → missing
  2. Check features/design/views.yaml → missing
  3. Check design/views.yaml → missing

Result: Generate views.yaml locally (auth-specific)
```

## Examples

```bash
# Plan current directory
/pixel-perfect:plan

# Plan specific directory
/pixel-perfect:plan features/auth

# Show cascade path
/pixel-perfect:plan features/auth --show-cascade

# Foundation only
/pixel-perfect:plan . --foundation

# Continue with details
/pixel-perfect:plan . --continue
```

## Config File Resolution

Both `config.yaml` and `design.config.yaml` are supported:

```
design/
├── config.yaml           # Preferred
├── design.config.yaml   # Also supported (backward compat)
└── tokens.yaml
```

**Resolution order:**
1. `{directory}/design/config.yaml`
2. `{directory}/design/design.config.yaml`
3. Parent directories (same order)

If both exist, `config.yaml` takes precedence.

## Input Requirements

- `{directory}/PRD.md` or `{directory}/requirements.md` must exist

## Design System Context Injection

When a design system is selected in config, the following context is injected into artifact generation:

| Artifact | Context Injected |
|----------|-----------------|
| paradigm.yaml | Design system patterns, component model (composable, props-based, etc.) |
| tokens.yaml | Default token values from design system (colors, spacing, border-radius) |
| components.yaml | Component names mapped to design system equivalents, variants |
| views.yaml | Component references use design system component names |

**How it works:**
- The design system reference doc (`docs/design-systems/{name}.md`) is read ONCE at the start of plan generation
- Its content informs all artifact generation within this plan run
- No reference doc is loaded for projects without a design system selected
- Icon library doc (`docs/icon-libraries/{name}.md`) is loaded whenever an icon library is configured (even without a design system)
- Icon library context is added to `tokens.yaml` under `icons.library` and `icons.sizeScale`

**Token defaults:** When a design system is selected, `tokens.yaml` starts with the system's default values (from the reference doc's "Token Conventions" section). Users can override any values during refinement.

**Component mapping:** `components.yaml` uses the design system's component names (from the reference doc's "Component Names" section). A generic `Modal` becomes `Dialog` in shadcn/ui projects, for example.

## Output

All YAML artifacts written to `{directory}/design/`
