---
description: "Generate design artifacts from PRD: UX plan, paradigm, tokens, components, flows, views"
---

# Design Plan

Generate design artifacts from a PRD (Product Requirements Document).

## EXECUTION GATES - MANDATORY

You MUST execute these gates BEFORE generating any YAML.

```
┌─────────────────────────────────────────────────────────────────────┐
│ GATE 0: RESOLVE TARGET                                              │
│                                                                     │
│   target provided?                                                  │
│     YES → dir = {target}/design/                                    │
│     NO  → dir = find nearest design.config.yaml (search upward)    │
└─────────────────────────────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────────────────────────────┐
│ GATE 1: CHECK design.config.yaml                                    │
│                                                                     │
│   File exists: {dir}/design.config.yaml ?                          │
│                                                                     │
│     NO  → ╔═══════════════════════════════════════════════════════╗│
│           ║ HALT. Execute: /pixel-perfect:init {target}           ║│
│           ║                                                       ║│
│           ║ Init MUST complete. It will ask:                      ║│
│           ║   • Requirements file location                        ║│
│           ║   • Target platforms (iOS, Android, Web, etc.)        ║│
│           ║   • Design vibe (modern, minimal, playful, etc.)      ║│
│           ║                                                       ║│
│           ║ WAIT for init to finish. Then RESTART from GATE 1.    ║│
│           ╚═══════════════════════════════════════════════════════╝│
│     YES → CONTINUE to GATE 2                                       │
└─────────────────────────────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────────────────────────────┐
│ GATE 2: RESOLVE GLOBAL DESIGN SYSTEM                               │
│                                                                     │
│   Read design.config.yaml → check designSystem.enabled              │
│                                                                     │
│   designSystem.enabled == true ?                                    │
│     YES → Build resolution map:                                     │
│           For each artifact in designSystem.using:                  │
│             Check if {designSystem.path}/{artifact}.yaml exists     │
│               EXISTS → resolution[artifact] = "global"              │
│               MISSING → resolution[artifact] = "epic"               │
│                                                                     │
│     NO  → resolution[*] = "epic" (generate all locally)            │
│                                                                     │
│   Display resolution status:                                        │
│     Global artifacts: paradigm ✓, tokens ✓, components ✓           │
│     Epic artifacts: flows, workflows, views, screens                │
└─────────────────────────────────────────────────────────────────────┘
          ↓
     ALL GATES PASSED → Generate YAML artifacts (respecting resolution)
```

**NEVER generate YAML without passing all gates. NEVER skip init.**

---

## Command Order: init → **plan** → prompts → mockups

## Usage

```
/pixel-perfect:plan <epic-path> [options]
```

## Arguments

- `<target>`: Epic or feature to plan. Supports smart path resolution:
  - **Full path**: `.spec/epics/epic-1` → uses exact path
  - **Name only**: `epic-1` → searches spec directory for matching folder
  - **Nested**: `lunch-menu` → finds it anywhere under spec directory

Use `--skip-deps` to error instead of auto-running missing steps.

## Options

- `--skip-init`: Error if design.config.yaml missing instead of running init
- `--skip-global`: Ignore global design system, generate all artifacts locally
- `--foundation`: Generate only foundation artifacts (UX plan, paradigm, tokens, components)
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
1. **UX-DESIGN-PLAN.md** - Design overview (references other artifacts, not hardcoded values)
2. **paradigm.yaml** - Design patterns, principles, references
3. **tokens.yaml** - Design tokens (colors, spacing, typography)
4. **components.yaml** - Reusable component definitions (uses tokens)

### Detail (Phase 5-8)
5. **flows.yaml** - Interaction flows (uses components)
6. **workflows.yaml** - User journeys and task flows
7. **views.yaml** - Detailed view specifications (uses components, tokens)
8. **screens.yaml** - Screen inventory with hierarchy (uses views)

### Smart Generation
- Skip artifacts that already exist (unless `--force`)
- When regenerating, only update changed artifacts + downstream dependencies
- Always maintain relative order when multiple artifacts need updates

### Global Design Resolution

When `designSystem.enabled` is true in `design.config.yaml`:

**Resolution order for each artifact:**
1. Epic override exists (`{epic}/design/{artifact}.yaml`) → use epic version
2. Global artifact enabled AND exists → use global version (SKIP generation)
3. Neither → generate in `{epic}/design/`

**Example output when global design is active:**
```
Resolving design artifacts...

Global design system (/design/):
  ✓ paradigm.yaml → USING GLOBAL
  ✓ tokens.yaml → USING GLOBAL
  ✓ components.yaml → USING GLOBAL

Generating epic-specific artifacts:
  → UX-DESIGN-PLAN.md
  → flows.yaml
  → workflows.yaml
  → views.yaml
  → screens.yaml
```

**Fallback behavior:**
- If global artifact is missing, generate in epic (with info message)
- Epic overrides always take precedence over global

## Example

```
# Full planning
/pixel-perfect:plan .spec/epics/epic-1

# Foundation only
/pixel-perfect:plan .spec/epics/epic-1 --foundation

# Continue with details
/pixel-perfect:plan .spec/epics/epic-1 --continue

# Ignore global design, generate everything locally
/pixel-perfect:plan .spec/epics/epic-1 --skip-global
```

## Input Requirements

- `{epic}/PRD.md` must exist with product requirements

## Output

All YAML artifacts written to `{epic}/design/`
