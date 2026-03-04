# SLICE-PP-007-DEV: Add BUILD PLAN Phase (Adaptive Delta-Gated Execution)

---

## Metadata

SLICE-ID: PP-007
ROLE: Dev
STATUS: BLOCKED (execute after PP-001 and PP-006 both merge)
PRIORITY: HIGH
EFFORT: M
TYPE: enhancement
EVIDENCE_TIER: T3
PARENT_SLICE: PP-007
CONTEXT_SCOPE: SLICE
TASK_LIST_ID: PP-007-DEV

---

## Context Scope (HIERARCHICAL CONTEXT POLICY)

**Your context scope: SLICE**

### You Receive:
- This slice definition (full document)
- Current content of build.md, init.md, SKILL.md, status.md after PP-001 and PP-006 have merged

### You Do NOT Receive:
- Other slice details (scope creep prevention)
- Prior QA feedback
- Conversation history from prior sessions

---

## Dev Environment

**Model:** Claude Sonnet 4.6
**Environment:** Claude Code CLI
**MCP Servers Available:** None required
**Major Tools Available:** Read, Edit, Grep, Glob

---

## Scope

After `scaffold` completes, the current `build` command immediately begins building atoms without first analyzing what actually needs to change. This works for greenfield projects (everything needs creation) but fails for brownfield projects (some atoms/molecules/screens may already exist, tokens may be unchanged, only specific components need updating).

**The gap:** There is no analysis phase between scaffold and the first build step. Developers using the plugin to add a feature to an existing UI project get no guidance on what has changed and what can be skipped.

**The fix:** Add Phase 4b: BUILD PLAN — a mandatory analysis phase that runs once before atoms, produces a level-tagged work plan, and gates adaptive execution. The work plan determines which levels (Tokens, Atoms, Molecules, Screens) are active for this build session. Levels with zero delta are skipped; levels with changes are executed in bottom-up order.

**Key rules:**
- BUILD PLAN runs once, when `build` is first invoked after scaffold
- The plan is written to manifest and drives subsequent phase execution
- Skipping a level requires explicit confirmation (zero delta, not laziness)
- Lower-level changes propagate upward: if atoms change, molecules must be re-evaluated even if the spec hasn't changed
- This is a BUILD-TIME analysis, not an init-time choice

---

## WRITE-ALLOWED

- `commands/build.md` — Add Phase 4b: BUILD PLAN section before Phase 5 ATOMS; update Overview; update Resuming behavior; update manifest examples to include `plan` gate

---

## WRITE-PROHIBITED

- `commands/init.md` — Do NOT modify
- `commands/scaffold.md` — Do NOT modify
- `skills/process-context/SKILL.md` — Do NOT modify (SKILL.md already updated by PP-001; manifest gate list auto-updates)
- `commands/status.md` — Do NOT modify
- Any file not listed in WRITE-ALLOWED

**Note:** The SKILL.md Phase Awareness table and status.md sample output may need updating to show the `plan` gate and phase. However, given that PP-001 and PP-006 already touched those files, add a note at the end of this slice listing what follow-up edits SKILL.md and status.md need — but do NOT make those edits in this slice to avoid cascading conflicts.

---

## Prerequisite: PP-001 and PP-006 Must Have Merged

Before executing, confirm both PP-001 and PP-006 are merged:
```bash
grep -n "Phase 5b" commands/build.md   # PP-001: Expected ≥1 match
grep -n "Phase 7\|INTEGRATE" commands/build.md  # PP-006: Expected 0 matches
```
If either check fails, STOP and wait for the prerequisite slice to merge.

---

## Implementation Steps

### Step 1: Read `commands/build.md` Fully

Read the entire current state of build.md before making any edits.

---

### Step 2: Update the Overview block

Locate the Overview block. Add Phase 4b and update the description:

OLD:
```
Build progresses through three phases. Each phase has entry/exit gates and tracks progress in the manifest.

Phase 5: ATOMS      → Individual components (Button, Card, Badge, etc.)
Phase 5b: MOLECULES → Functional compositions of 2-3 atoms (SearchBar, UserCard, FormField)
Phase 6: COMPOSE    → Screen layouts composing molecules and atoms (Dashboard, Settings, etc.)
```

NEW:
```
Build progresses through an analysis phase followed by adaptive build phases. Each phase has entry/exit gates and tracks progress in the manifest.

Phase 4b: PLAN      → Analyze spec + codebase; produce level-tagged work plan; confirm with user
Phase 5: ATOMS      → Individual components (Button, Card, Badge, etc.)
Phase 5b: MOLECULES → Functional compositions of 2-3 atoms (SearchBar, UserCard, FormField)
Phase 6: COMPOSE    → Screen layouts composing molecules and atoms (Dashboard, Settings, etc.)

Phases 5, 5b, and 6 execute only for levels where the BUILD PLAN identifies non-zero delta.
```

---

### Step 3: Add Phase 4b: BUILD PLAN section

Insert this section BEFORE the existing `## Phase 5: ATOMS` header. This is the first section executed when `/pixel-perfect:build` runs.

```markdown
## Phase 4b: BUILD PLAN

Analyze the requirements spec against the current codebase state. Determine which build levels have non-zero delta — what needs to be created, updated, or is already complete. Produce a work plan. The user confirms the plan before any code is written.

This phase runs automatically when `/pixel-perfect:build` is invoked and `plan` is not yet `passed` in the manifest.

### The Build Levels

The build system works bottom-up across four levels:

| Level | What It Covers | Can Skip? |
|-------|---------------|-----------|
| Tokens | Design primitives: color palette, type scale, spacing scale | Yes — if spec has no new brand/theme changes |
| Atoms | Single-purpose UI primitives: Button, Input, Icon, Badge | Yes — if spec requires no new/changed components |
| Molecules | Functional atom compositions: SearchBar, FormField, UserCard | Yes — if spec has no repeated multi-atom patterns |
| Screens | Full view layouts composing molecules and atoms | No — screens are always the primary output |

**Bottom-up rule:** A lower-level change propagates upward. If atoms change, molecules must be re-evaluated. If molecules change, screens must be re-evaluated. You cannot mark a higher level as SKIP if a lower level was ACTIVE — the propagation is automatic.

### Step 1: Analyze Existing Codebase

Before reading requirements, audit what already exists:

```
Auditing codebase...

Tokens:    design/tokens.ts found (24 color tokens, 6 type sizes, 8 spacing steps)
Atoms:     src/components/ — 3 files found (StatusBadge, JobCard, DateChip)
Molecules: src/molecules/ — 0 files found
Screens:   src/screens/ — 0 files found
```

If `design/tokens.ts` (or equivalent per framework) does not exist, the Tokens level is automatically ACTIVE (greenfield token setup needed).

If `src/components/` (or equivalent) does not exist or is empty, Atoms is automatically ACTIVE.

### Step 2: Analyze Requirements

Read the requirements document (from `manifest.spec`). For each build level, identify what the spec demands:

```
Analyzing requirements (PRD.md)...

Tokens required:    existing palette matches spec (no new colors mentioned)
Atoms required:     StatusBadge ✓, JobCard ✓, DateChip ✓, ActionButton ✗ (missing)
Molecules required: JobRow (StatusBadge + DateChip) — pattern repeated in 3 screens
Screens required:   TodayFeed, JobDetail — both missing
```

### Step 3: Compute Delta and Apply Gate Logic

For each level:
- **Delta = required by spec − already verified in codebase**
- A level is **ACTIVE** if delta > 0
- A level is **SKIP** if delta = 0 AND no lower level is ACTIVE
- A lower-level ACTIVE status forces re-evaluation of all higher levels (even if their own delta is 0)

Gate-opening factors per level:

**Tokens gate opens when:**
- No existing token file (`design/tokens.ts` or equivalent)
- Spec mentions new colors, fonts, or spacing system
- Spec references a new theme variant (dark mode, rebrand)
- Component library version change that alters design tokens

**Atoms gate opens when:**
- Tokens gate is ACTIVE (new tokens → atoms must use them)
- Spec names a UI element not in the existing atom inventory
- Spec describes a new interactive state or variant on an existing atom
- A screen references a component that doesn't exist in codebase

**Molecules gate opens when:**
- Atoms gate is ACTIVE (changed atoms → compositions need re-evaluation)
- The same 2-3 atom combination appears in ≥2 spec screens
- No molecules exist and spec complexity warrants them

**Screens gate:**
- Never SKIP if any lower level is ACTIVE
- Always ACTIVE if spec describes new or changed screens

### Step 4: Output BUILD PLAN

Present the plan for user confirmation before writing any code:

```
BUILD PLAN
==========
Analyzing: PRD.md vs current codebase (scaffold: passed)

Mode: brownfield (existing components found)

TOKENS    [ SKIP ]   — Existing token file matches spec. No new colors or fonts required.
ATOMS     [ BUILD ]  — Need: ActionButton (missing). StatusBadge, JobCard, DateChip already verified.
MOLECULES [ BUILD ]  — Need: JobRow (StatusBadge + DateChip). Triggered by atoms change.
SCREENS   [ BUILD ]  — Need: TodayFeed (missing), JobDetail (missing).

Planned work:
  - 1 atom to create: ActionButton
  - 1 molecule to create: JobRow
  - 2 screens to create: TodayFeed, JobDetail

? Proceed with this plan? [Yes / Modify / Cancel]
```

**Modification flow:** If the user selects "Modify", ask which level to adjust:
- Add items to a level
- Remove items from a level
- Change a SKIP to BUILD or vice versa (user may have context the analysis missed)

**Cancellation:** If "Cancel", exit build cleanly. Manifest `plan` gate remains `pending`.

### Step 5: Write Plan to Manifest

After user confirms, write the plan to manifest:

```json
{
  "build_plan": {
    "tokens": "skip",
    "atoms": {
      "status": "build",
      "create": ["ActionButton"],
      "existing_verified": ["StatusBadge", "JobCard", "DateChip"]
    },
    "molecules": {
      "status": "build",
      "create": ["JobRow"]
    },
    "screens": {
      "status": "build",
      "create": ["TodayFeed", "JobDetail"]
    }
  },
  "gates": {
    "plan": "passed"
  }
}
```

### Greenfield vs. Brownfield

**Greenfield** (no existing components):
- All levels are ACTIVE by default (everything needs creation)
- No delta computation needed — BUILD PLAN immediately proposes creating everything from spec
- Plan output shows: `Mode: greenfield (no existing components)`

**Brownfield** (existing components found):
- Delta computation runs per level
- Plan proposes only what's missing or changed
- Plan output shows: `Mode: brownfield (N existing components found)`

### Resuming the Build

After PLAN is confirmed, `/pixel-perfect:build` resumes from the first ACTIVE level in order (Tokens → Atoms → Molecules → Screens), executing only ACTIVE levels.

If build is interrupted and resumed later, the plan in the manifest drives where to pick up:

```
> /pixel-perfect:build

Resuming from BUILD PLAN:
  [x] Tokens    — skipped (no changes)
  [~] Atoms     — 0/1 built (ActionButton pending)
  [ ] Molecules — pending (JobRow)
  [ ] Screens   — pending (TodayFeed, JobDetail)

Building: ActionButton...
```

### Phase 4b Exit Gate

BUILD PLAN is confirmed by user. Manifest has `"plan": "passed"`. Subsequent build phases execute only ACTIVE levels from the plan.
```

---

### Step 4: Update the Resuming section

The existing "Resuming" section in build.md describes resumption from mid-atoms. Update to account for BUILD PLAN:

Add before the existing Resuming content:
```
If BUILD PLAN has not been confirmed (plan gate is `pending`), `/pixel-perfect:build` runs Phase 4b first before resuming any other phase.
```

---

### Step 5: Update manifest gate examples

Find manifest examples in build.md and add the `plan` gate before `atoms`:

```json
"gates": {
  "discover": "passed",
  "target": "passed",
  "equip": "passed",
  "scaffold": "passed",
  "plan": "pending",
  "atoms": "pending",
  "molecules": "pending",
  "compose": "pending"
}
```

---

### Step 6: Verify

```bash
# Phase 4b section exists in build.md
grep -n "Phase 4b" commands/build.md
# Expected: ≥1 match

# BUILD PLAN appears in the file
grep -n "BUILD PLAN" commands/build.md
# Expected: ≥3 matches

# plan gate in manifest example
grep -n '"plan"' commands/build.md
# Expected: ≥1 match

# Phase 5 ATOMS still present
grep -n "## Phase 5" commands/build.md
# Expected: ≥1 match

# Phase 5b MOLECULES still present
grep -n "Phase 5b" commands/build.md
# Expected: ≥1 match

# Scope check
git diff --name-only
# Expected: commands/build.md only
```

---

## Acceptance Criteria

1. **`commands/build.md` has Phase 4b: BUILD PLAN** — section appears before Phase 5 ATOMS
2. **BUILD PLAN section includes:** codebase audit step, requirements analysis step, delta computation with gate logic, work plan output format (with SKIP/BUILD tags per level), user confirmation step, greenfield vs brownfield handling, manifest write step, exit gate
3. **Gate-opening factors are documented** — at least Tokens, Atoms, Molecules, Screens gate conditions specified
4. **Manifest gate examples updated** — `plan` gate appears before `atoms` in gate sequence
5. **Resuming behavior updated** — documents that PLAN runs first if not yet confirmed
6. **Phase 5, 5b, and 6 are intact** — PP-001 and PP-006 additions untouched

---

## Quality Gates

```bash
# QG1: Phase 4b exists
grep -c "Phase 4b" commands/build.md
# Expected: ≥1

# QG2: BUILD PLAN documented
grep -c "BUILD PLAN" commands/build.md
# Expected: ≥3

# QG3: plan gate in manifest example
grep -c '"plan"' commands/build.md
# Expected: ≥1

# QG4: Prior work intact
grep -c "Phase 5b\|Molecules/" commands/build.md
# Expected: ≥3 (Phase 5b from PP-001 + Molecules/ prefix references)

# QG5: Scope
git diff --name-only
# Expected: commands/build.md only
```

---

## Deliverables

1. Edited `commands/build.md` with Phase 4b: BUILD PLAN section added
2. Evidence saved to `.tmp/evidence/PP-007/`:
   - `after-grep.txt`: outputs of all QG commands

---

## Follow-Up Notes (Do NOT implement in this slice)

After this slice merges, the following supporting docs will need updates in a separate cleanup pass:
- `skills/process-context/SKILL.md` — Phase Awareness table should include `plan` phase
- `commands/status.md` — Sample output should show `4b. PLAN — confirmed` in phase list
- `init.md` — The description of what `/pixel-perfect:build` does may reference the new planning step

These are intentionally deferred to avoid additional build.md conflicts with this slice.

---

--- END SLICE: PP-007-DEV ---
