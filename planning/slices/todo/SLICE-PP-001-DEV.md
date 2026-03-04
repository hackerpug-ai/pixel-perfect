# SLICE-PP-001-DEV: Add Molecules Phase (Phase 5b) to Build Pipeline

---

## Metadata

SLICE-ID: PP-001
ROLE: Dev
STATUS: READY
PRIORITY: CRITICAL
EFFORT: M
TYPE: enhancement
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

**Reference:** `docs/HIERARCHICAL-HANDOFF-POLICY.md`

---

## Dev Environment

**Model:** Claude Sonnet 4.6
**Settings:**
- Temperature: default
- Max Tokens: default

**Environment:** Claude Code CLI

**MCP Servers Available:**
- None required

**Major Tools Available:**
- Read, Edit, Grep, Glob

---

## Scope

`init.md` correctly documents a 3-level component hierarchy: **Atoms → Molecules → Screens**. `build.md` only implements 2 phases (**ATOMS → COMPOSE**). This inconsistency means the system documents a Molecules layer it never builds. The fix is NOT to remove Molecules from `init.md` — `init.md` is correct. The fix is to add Phase 5b (MOLECULES) to `build.md` between ATOMS and COMPOSE, then update the manifest gate sequence, `skills/process-context/SKILL.md`, and `commands/status.md` to reflect the full phase set.

Also: the INTEGRATE phase has been confirmed out of scope for this plugin. This slice removes INTEGRATE from the supporting documentation files (SKILL.md and status.md). PP-006 handles removing it from build.md.

**Molecule definition:** A functional composition of 2-3 atoms that forms a reusable UI group (e.g., SearchBar = Input + Icon + Button; UserCard = Avatar + Badge + Text; FormField = Label + Input + ValidationText). Molecules appear in the `Molecules/` Storybook prefix.

---

## WRITE-ALLOWED

- `commands/build.md` — Add Phase 5b MOLECULES section between Phase 5 (ATOMS) and Phase 6 (COMPOSE); update manifest gate examples; update Overview table; update build description
- `skills/process-context/SKILL.md` — Update Phase Awareness table (add molecules, remove integrate); update phase description string; update Commands Reference
- `commands/status.md` — Add MOLECULES phase to sample output; remove INTEGRATE line; update phase count

---

## WRITE-PROHIBITED

- `commands/init.md` — **DO NOT TOUCH. It is correct as written.**
- `commands/verify.md` — Do NOT modify
- `commands/scaffold.md` — Do NOT modify
- Any file not listed in WRITE-ALLOWED

---

## Implementation Steps

### Step 1: Read All Three Target Files Fully

Before making any edits, read the complete contents of:
- `commands/build.md`
- `skills/process-context/SKILL.md`
- `commands/status.md`

---

### Step 2: Add Phase 5b MOLECULES to `commands/build.md`

#### 2a. Update the Overview block

Locate the Overview block at the top of build.md:
```
Phase 5: ATOMS      → Individual components (Button, Card, Badge, etc.)
Phase 6: COMPOSE    → Screen layouts composing atoms (Dashboard, Settings, etc.)
Phase 7: INTEGRATE  → Navigation, state, data wiring
```

Replace with:
```
Phase 5: ATOMS      → Individual components (Button, Card, Badge, etc.)
Phase 5b: MOLECULES → Functional compositions of 2-3 atoms (SearchBar, UserCard, FormField)
Phase 6: COMPOSE    → Screen layouts composing molecules and atoms (Dashboard, Settings, etc.)
```

#### 2b. Add Phase 5b section after Phase 5 Exit Gate

After the Phase 5 exit gate block (the ````json` block showing `"atoms": "passed"`), insert the following new section:

```markdown
---

## Phase 5b: MOLECULES

Assemble 2-3 atoms into functional, reusable UI groups. A molecule is not a full screen — it is a named, reusable composition that appears in multiple screens.

### When to Build Molecules

Build molecules when the spec or atom list reveals:
- The same 2-3 atom combination appears in ≥2 screens
- A named functional UI pattern exists (SearchBar, FormField, UserCard, NavItem)
- Composing atoms directly in screens would cause repetition

If none of these conditions apply, skip Phase 5b and proceed to Phase 6.

### Step 1: Identify Molecules

Review the atom list from Phase 5 and the requirements spec. Look for repeated atom groupings:

```
Analyzing atoms and spec for molecule candidates...

Proposed molecules:
  1. JobRow       — StatusBadge + DateChip (appears on TodayFeed, JobList, SearchResults)
  2. ActionPanel  — ActionButton + StatusBadge (appears on JobDetail, QuickActions)

? Confirm molecule list? [Yes / Add more / Remove / Skip molecules entirely]
```

Update manifest with the molecule list (all `status: pending`).

### Step 2: Build Each Molecule

For each molecule, in order:

1. **Load context:**
   - Atom files this molecule composes
   - Project theme file
   - Adapter docs for the chosen tools

2. **Write molecule file:**
   - Composes 2-3 atoms — does NOT re-implement atom internals
   - Accepts props that delegate to constituent atoms
   - Uses the same style system and theme tokens as the atoms
   - File location: `src/molecules/MoleculeName.tsx` (or equivalent per framework)

3. **Write story file:**
   - Uses CSF3 format for Storybook
   - **Story title MUST use `Molecules/` prefix** (e.g., `title: 'Molecules/JobRow'`)
   - Shows molecule in realistic context with all variant combinations
   - All molecule-level props wired to `argTypes` controls

   **Example:**
   ```tsx
   // JobRow.stories.tsx
   import type { Meta, StoryObj } from '@storybook/react';
   import { JobRow } from './JobRow';

   const meta: Meta<typeof JobRow> = {
     title: 'Molecules/JobRow',
     component: JobRow,
     parameters: {
       docs: {
         description: {
           component: 'Job summary row combining status badge and date chip. Used on feed and list screens.',
         },
       },
     },
     argTypes: {
       status: { control: { type: 'select' }, options: ['open', 'in-progress', 'complete'] },
       date: { control: { type: 'text' } },
       jobTitle: { control: { type: 'text' } },
     },
     args: {
       status: 'open',
       date: 'Today, 9:00 AM',
       jobTitle: 'Annual HVAC Service',
     },
   };

   export default meta;
   type Story = StoryObj<typeof JobRow>;

   export const Default: Story = {};
   export const InProgress: Story = { args: { status: 'in-progress' } };
   export const Complete: Story = { args: { status: 'complete' } };
   ```

4. **Verify:**
   - Molecule renders without errors
   - Constituent atoms are composed (not re-implemented)
   - Story loads in Storybook under `Molecules/` hierarchy
   - All props wired to argTypes controls

5. **Update manifest:**
   ```json
   {
     "molecules": [
       {
         "name": "JobRow",
         "file": "src/molecules/JobRow.tsx",
         "story": "src/molecules/JobRow.stories.tsx",
         "status": "verified",
         "atoms": ["StatusBadge", "DateChip"]
       }
     ]
   }
   ```

### Progress Tracking

After each molecule:
```
Molecules: 1/2 verified
  [x] JobRow        (atoms: StatusBadge + DateChip)
  [ ] ActionPanel   (atoms: ActionButton + StatusBadge)
```

### Phase 5b Exit Gate

All molecules in the manifest have `status: verified`. Update manifest:
```json
{
  "phase": "molecules",
  "gates": {
    "molecules": "passed"
  }
}
```
```

#### 2c. Update the manifest gate examples

Find any manifest example in build.md that shows the gates sequence. Update to include molecules and remove integrate:

OLD gate sequence:
```json
"gates": {
  "discover": "passed",
  "target": "passed",
  "equip": "passed",
  "scaffold": "passed",
  "atoms": "pending",
  "compose": "pending",
  "integrate": "pending"
}
```

NEW gate sequence:
```json
"gates": {
  "discover": "passed",
  "target": "passed",
  "equip": "passed",
  "scaffold": "passed",
  "atoms": "pending",
  "molecules": "pending",
  "compose": "pending"
}
```

#### 2d. Update the Completion block

At the end of build.md, the Completion message references INTEGRATE. Update:

OLD:
```
All phases passed. Your project has running code with:
  - 5 themed components with full Storybook controls
  - 2 composed screens at target viewport
  - Navigation and data flow wired
```

NEW:
```
All phases passed. Your project has running code with:
  - 5 themed components with full Storybook controls
  - Functional molecule compositions sandboxed in Storybook
  - 2 composed screens at target viewport
```

---

### Step 3: Update `skills/process-context/SKILL.md`

#### 3a. Update the phase description string

Locate:
```
- **Current phase**: Which phase is active (discover → target → equip → scaffold → atoms → compose → integrate)
```

Replace with:
```
- **Current phase**: Which phase is active (discover → target → equip → scaffold → atoms → molecules → compose)
```

#### 3b. Update the "7-phase" reference

Locate:
```
a 7-phase build process orchestrator
```

Replace with:
```
a 6-phase build process orchestrator
```

#### 3c. Update the Phase Awareness table

OLD table (partial):
```markdown
| atoms | Build individual components with Storybook controls | Compose screens, wire navigation |
| compose | Assemble screens from atoms | Skip atom verification, wire data |
| integrate | Wire navigation, state, data | Rebuild verified components |
```

NEW table (partial):
```markdown
| atoms | Build individual components with Storybook controls | Skip to molecules or compose directly |
| molecules | Build functional atom compositions (2-3 atoms per molecule) | Compose screens before molecules are verified |
| compose | Assemble screens from molecules and atoms | Skip atom/molecule verification, wire data |
```

Remove the `integrate` row entirely.

#### 3d. Update the Story Organization Convention table

Locate the Story Organization table:
```markdown
| Category | Prefix | Example |
|----------|--------|---------|
| Design tokens | `Design System/` | `title: 'Design System/Colors'` |
| Atomic components | `Components/` | `title: 'Components/StatusBadge'` |
| Composed screens | `Screens/` | `title: 'Screens/TodayFeed'` |
```

Add the Molecules row:
```markdown
| Category | Prefix | Example |
|----------|--------|---------|
| Design tokens | `Design System/` | `title: 'Design System/Colors'` |
| Atomic components | `Components/` | `title: 'Components/StatusBadge'` |
| Molecule compositions | `Molecules/` | `title: 'Molecules/JobRow'` |
| Composed screens | `Screens/` | `title: 'Screens/TodayFeed'` |
```

#### 3e. Update the Commands Reference

Locate:
```
| `/pixel-perfect:build` | Phases 5-7: atoms → compose → integrate |
```

Replace with:
```
| `/pixel-perfect:build` | Phases 5-6: atoms → molecules → compose |
```

---

### Step 4: Update `commands/status.md`

#### 4a. Update "What It Shows" list

Locate:
```
1. **Phase overview** - All 7 phases with gate status
```

Replace with:
```
1. **Phase overview** - All 6 phases with gate status
```

Also add molecules to the tracking list:
```
6. **Molecule progress** - Molecules built and verified
7. **Component progress** - Atoms built and verified
8. **Screen progress** - Screens composed and verified
```
(Renumber as appropriate.)

#### 4b. Update the Sample Output block

Replace the Phases block in the sample output:

OLD:
```
  [x] 4. SCAFFOLD    — Project structure ready, theme configured
  [~] 5. ATOMS       — 3/5 components verified
  [ ] 6. COMPOSE     — 0/2 screens verified
  [ ] 7. INTEGRATE   — Pending
```

NEW:
```
  [x] 4. SCAFFOLD    — Project structure ready, theme configured
  [~] 5. ATOMS       — 3/5 components verified
  [ ] 5b. MOLECULES  — 0/2 molecules identified
  [ ] 6. COMPOSE     — 0/2 screens verified
```

#### 4c. Add Molecules progress section to sample output

After the `Atoms (3/5 verified):` block, add:

```
Molecules (0/2 identified):
  [ ] JobRow          src/molecules/JobRow.tsx
      atoms: StatusBadge, DateChip
  [ ] ActionPanel     src/molecules/ActionPanel.tsx
      atoms: ActionButton, StatusBadge
```

---

### Step 5: Verify All Changes

```bash
# 1. Molecules/ prefix appears in build.md
grep -n "Molecules/" commands/build.md
# Expected: ≥2 matches (Phase 5b section + example)

# 2. Phase 5b section exists in build.md
grep -n "Phase 5b" commands/build.md
# Expected: ≥1 match

# 3. INTEGRATE removed from build.md overview (PP-006 removes the full Phase 7 section)
grep -n "INTEGRATE" commands/build.md
# Expected: 0 matches in overview/completion (Phase 7 section still exists until PP-006 runs)

# 4. SKILL.md has molecules in Phase Awareness table
grep -n "molecules" skills/process-context/SKILL.md
# Expected: ≥2 matches

# 5. SKILL.md no longer has integrate in Phase Awareness table
grep -n "integrate" skills/process-context/SKILL.md
# Expected: 0 matches (the word "integrate" should be gone from the table)

# 6. init.md is COMPLETELY UNCHANGED
git diff commands/init.md
# Expected: empty (zero diff)

# 7. Scope check
git diff --name-only
# Expected: commands/build.md, skills/process-context/SKILL.md, commands/status.md
```

---

## Acceptance Criteria

1. **`commands/build.md` has Phase 5b MOLECULES** — section exists between Phase 5 exit gate and Phase 6 header
2. **MOLECULES section is complete** — includes: identify step, build steps, Molecules/ story prefix, manifest update format, exit gate
3. **Manifest gate sequence updated** — examples in build.md show `molecules` gate between `atoms` and `compose`; `integrate` gate removed from examples
4. **SKILL.md Phase Awareness table updated** — `molecules` row added between `atoms` and `compose`; `integrate` row removed
5. **SKILL.md Story Organization table updated** — `Molecules/` prefix row added
6. **SKILL.md phase description and count updated** — "7-phase" → "6-phase"; phase list includes molecules, excludes integrate
7. **status.md shows molecules** — sample output includes `5b. MOLECULES` line and molecules progress section; INTEGRATE line removed
8. **`commands/init.md` is UNCHANGED** — `git diff commands/init.md` returns empty

---

## Quality Gates

```bash
# QG1: Phase 5b section exists in build.md
grep -c "Phase 5b" commands/build.md
# Expected: ≥1

# QG2: Molecules/ story prefix documented in build.md
grep -c "Molecules/" commands/build.md
# Expected: ≥2

# QG3: Molecules in SKILL.md Phase Awareness table
grep -c "molecules" skills/process-context/SKILL.md
# Expected: ≥2

# QG4: Integrate removed from SKILL.md Phase Awareness table
grep -c "^| integrate" skills/process-context/SKILL.md
# Expected: 0

# QG5: init.md zero diff (most important gate)
git diff --stat commands/init.md
# Expected: (empty — no output)

# QG6: Only expected files in diff
git diff --name-only
# Expected: commands/build.md, skills/process-context/SKILL.md, commands/status.md
```

---

## Deliverables

1. Edited `commands/build.md` with Phase 5b MOLECULES added
2. Edited `skills/process-context/SKILL.md` with Phase Awareness table updated
3. Edited `commands/status.md` with molecules progress added
4. Evidence file: `.tmp/evidence/PP-001/after-grep.txt` containing outputs of all QG commands above
5. Git diff confirming only the 3 expected files changed and `init.md` is untouched

---

## Merge Note

PP-006-DEV also modifies `commands/build.md` (it removes Phase 7 INTEGRATE). PP-001 must merge **before** PP-006 executes. PP-006 will operate on the post-PP-001 version of build.md. The edits are in different sections (PP-001 adds in the middle; PP-006 removes from the end), so a clean merge is expected.

---

--- END SLICE: PP-001-DEV ---
