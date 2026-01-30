---
description: "Generate specification files from views.yaml for mockup generation"
---

# Design Prompts

Generate specification files from design artifacts for mockup generation.

## EXECUTION GATES - MANDATORY

You MUST pass ALL gates IN ORDER before generating specs.

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
│           ║ WAIT for init to finish. Then RESTART from GATE 1.    ║│
│           ╚═══════════════════════════════════════════════════════╝│
│     YES → CONTINUE to GATE 2                                       │
└─────────────────────────────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────────────────────────────┐
│ GATE 2: CHECK views.yaml                                            │
│                                                                     │
│   File exists: {dir}/views.yaml ?                                  │
│                                                                     │
│     NO  → ╔═══════════════════════════════════════════════════════╗│
│           ║ HALT. Execute: /pixel-perfect:plan {target}           ║│
│           ║ WAIT for plan to finish. Then RESTART from GATE 2.    ║│
│           ╚═══════════════════════════════════════════════════════╝│
│     YES → CONTINUE to spec generation                              │
└─────────────────────────────────────────────────────────────────────┘
          ↓
     ALL GATES PASSED → Generate spec files
```

**NEVER generate specs without passing ALL gates. NEVER skip init or plan.**

---

## Command Order: init → plan → **prompts** → mockups

## Usage

```
/pixel-perfect:prompts <epic-path> [options]
```

## Arguments

- `<target>`: Epic or feature with design artifacts. Supports smart path resolution:
  - **Full path**: `.spec/epics/epic-1` → uses exact path
  - **Name only**: `epic-1` → searches spec directory for matching folder

Use `--skip-deps` to error instead of auto-running missing steps.

## Options

- `--skip-init`: Error if design.config.yaml missing instead of running init
- `--key <design_key>`: Generate spec for single design key only
- `--force`: Regenerate existing specs

## Input Requirements

- `{epic}/design/views.yaml` must exist
- `{epic}/design/screens.yaml` recommended
- `{epic}/design/components.yaml` recommended
- `{epic}/design/tokens.yaml` recommended

## Output

```
{epic}/design/prompts/
├── {design_key}.spec.json    # Specification per screen
└── manifest.json              # Index of all specs
```

## Example

```
# Generate all specs
/pixel-perfect:prompts .spec/epics/epic-1

# Generate single spec
/pixel-perfect:prompts .spec/epics/epic-1 --key user_profile
```

## Spec Format

Each `.spec.json` contains:
- Screen metadata
- Component specifications
- Layout requirements
- Token references
- Interaction states
