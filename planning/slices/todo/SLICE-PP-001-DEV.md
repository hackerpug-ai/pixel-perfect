# SLICE-PP-001-DEV: Resolve Molecules Hierarchy Inconsistency

---

## Metadata

SLICE-ID: PP-001
ROLE: Dev
STATUS: READY
PRIORITY: CRITICAL
EFFORT: S
TYPE: bugfix
EVIDENCE_TIER: T3
PARENT_SLICE: PP-001
CONTEXT_SCOPE: SLICE
TASK_LIST_ID: PP-001-DEV

---

## Context Scope (HIERARCHICAL CONTEXT POLICY)

**Your context scope: SLICE**

### You Receive:
- This slice definition (full document)
- Relevant codebase patterns for this slice
- Prior Dev work on THIS slice (if resuming via `/handoff-resume`)

### You Do NOT Receive:
- Other slice details (scope creep prevention)
- Prior QA feedback (prevents anticipatory bias)
- Strategic/roadmap context (PM's domain)
- Conversation history from prior sessions

### Handoff Policy:
- **When pausing:** Run `/handoff` → produces Dev handoff automatically
- **When resuming:** Run `/handoff-resume` → shows only Dev handoffs for this slice
- **What you write:** Slice-scoped implementation state only
- **What you read:** Dev handoffs for same slice only

**Reference:** `docs/HIERARCHICAL-HANDOFF-POLICY.md`

---

## Dev Environment

**Model:** Claude Sonnet 4.6
**Settings:**
- Temperature: default
- Max Tokens: default
- Other: N/A

**Environment:** Claude Code CLI

**MCP Servers Available:**
- None required

**Major Tools Available:**
- Read, Edit, Grep, Glob

---

## Scope

`init.md` defines a 3-level component hierarchy (Atoms → Molecules → Screens) in the spec-document section. Every other file in the plugin uses a 2-level hierarchy (Atoms → Screens): `build.md`, `verify.md`, `skills/process-context/SKILL.md`, `commands/status.md`. There is no `Molecules/` Storybook prefix, no Molecules gate, and no Molecules phase in any command. The inconsistency misleads users into expecting a Molecules layer that the system never produces.

**Fix:** Remove the Molecules intermediate layer from `commands/init.md` so its component hierarchy matches the 2-level system implemented everywhere else (Components/atoms → Screens/views).

---

## WRITE-ALLOWED

- `commands/init.md` — Remove the Molecules layer from the spec-document hierarchy description

---

## WRITE-PROHIBITED

- `commands/build.md` — Do NOT add a Molecules phase (out of scope)
- `commands/verify.md` — Do NOT modify
- `skills/process-context/SKILL.md` — Do NOT modify
- `commands/status.md` — Do NOT modify
- Any other file not listed in WRITE-ALLOWED

---

## Implementation Steps

### Step 1: Verify the Inconsistency

Read `commands/init.md` and locate the component hierarchy section inside "Step 1b: Spec Document for Sandbox Views".

Confirm the current text defines three layers:
- Components (atoms)
- **Molecules** — Compositions of 2-3 atoms that form a functional unit
- Views (screens)

Confirm `commands/build.md` Phase 5 (ATOMS) and Phase 6 (COMPOSE/screens) do NOT include a Molecules phase.

Confirm `skills/process-context/SKILL.md` Phase Awareness table does NOT list `molecules` as a phase.

### Step 2: Edit init.md — Remove Molecules Layer

In `commands/init.md`, inside the "Step 1b: Spec Document for Sandbox Views" section, update the component hierarchy to match the 2-level system:

**Remove** the Molecules row from the hierarchy diagram and its explanation text.

**Before:**
```
1. **Derive the component hierarchy** following the progression:
   - **Components** (atoms) — Smallest reusable UI elements (Button, Badge, Avatar, Input)
   - **Molecules** — Compositions of 2-3 atoms that form a functional unit (SearchBar, UserCard, FormField)
   - **Views** (screens) — Full screen layouts composed of molecules and components (Dashboard, Settings, Profile)

2. **Generate sandbox stories** at each level of the hierarchy:
   - `Components/` — Individual atom stories with controls
   - **`Molecules/`** — Molecule stories showing atom composition
   - `Views/` — Full view stories with realistic data

3. **Plan the build order**: Components first, then molecules that compose them, then views that arrange molecules into layouts.
```

**After:**
```
1. **Derive the component hierarchy** following the progression:
   - **Components** (atoms) — Smallest reusable UI elements (Button, Badge, Avatar, Input)
   - **Screens** (views) — Full screen layouts that compose atoms into complete interfaces (Dashboard, Settings, Profile)

2. **Generate sandbox stories** at each level of the hierarchy:
   - `Components/` — Individual atom stories with controls
   - `Screens/` — Full screen stories with realistic data

3. **Plan the build order**: Components first, then screens that arrange them into complete layouts.
```

**Also update** the ASCII diagram block immediately after to remove the Molecules row:

**Before:**
```
Component Hierarchy (from spec):

  Components (atoms):     Button, Badge, Avatar, TextField, Icon
                              ↓ compose into
  Molecules:              SearchBar (TextField + Icon + Button)
                          UserCard (Avatar + Badge + Text)
                          NavItem (Icon + Text + Badge)
                              ↓ compose into
  Views (screens):        Dashboard (SearchBar + UserCard list + NavItem sidebar)
                          Profile (Avatar + FormFields + ActionButtons)
```

**After:**
```
Component Hierarchy (from spec):

  Components (atoms):     Button, Badge, Avatar, TextField, Icon
                              ↓ compose into
  Screens (views):        Dashboard (Button + Avatar + Badge + TextField)
                          Profile (Avatar + TextField + Button)
```

### Step 3: Verify Consistency

After the edit, perform a cross-reference check:

```bash
# Confirm "Molecules" no longer appears in init.md
grep -n "Molecules\|Molecule" commands/init.md

# Confirm build.md, verify.md, SKILL.md, status.md are unchanged
grep -n "Molecules\|Molecule" commands/build.md commands/verify.md skills/process-context/SKILL.md commands/status.md
```

Expected: `init.md` returns 0 matches. Other files unchanged.

### Step 4: Capture Evidence

Save grep output to `.tmp/evidence/PP-001/after-grep.txt` for QA.

---

## Acceptance Criteria

1. **`commands/init.md` no longer mentions Molecules** — zero occurrences of "Molecules" or "Molecule" in the file
2. **The component hierarchy in init.md is 2-level** — Components (atoms) → Screens (views)
3. **The ASCII diagram is updated** — no Molecules row
4. **Storybook prefixes match** — init.md references only `Components/` and `Screens/` prefixes (matching build.md, verify.md, storybook-conventions.md)
5. **No other files modified** — build.md, verify.md, SKILL.md, status.md are byte-identical to their pre-edit state

---

## Quality Gates

1. `grep -c "Molecules" commands/init.md` → `0`
2. `grep -c "Molecules" commands/build.md commands/verify.md skills/process-context/SKILL.md commands/status.md` → `0` for each (these files should not have had Molecules to begin with)
3. No new files created
4. Only `commands/init.md` in git diff

---

## Deliverables

1. Edited `commands/init.md` with Molecules removed
2. Evidence file: `.tmp/evidence/PP-001/after-grep.txt` showing 0 Molecule matches in init.md
3. Git diff showing only `commands/init.md` changed

---

--- END SLICE: PP-001-DEV ---
