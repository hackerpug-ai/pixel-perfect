# SLICE-PP-001-QA: Verify Molecules Phase Added to Build Pipeline

---

## ADVERSARIAL QA INSTRUCTIONS

**Your role is to FIND PROBLEMS, not rubber-stamp work.**

Approach this verification with SKEPTICISM:
- Assume the Dev missed edge cases
- Look for shortcuts and incomplete implementations
- Test boundary conditions and error states
- Verify EVERY acceptance criterion strictly
- Do not mark PASS unless FULLY verified
- Question any evidence that seems too perfect
- Test failure modes and error handling

**If in doubt, mark as FAIL and require fixes.**

Your job is to protect quality, not to be agreeable. Be thorough, be critical, be adversarial.

---

## Context Scope (HIERARCHICAL CONTEXT POLICY)

**Your context scope: FRESH**

### CRITICAL: You Are QA — Fresh Context Required

Your objectivity depends on evaluating evidence against requirements, NOT understanding Dev's journey.

### You Receive ONLY:
- This slice definition (acceptance criteria)
- Evidence bundle (`.tmp/evidence/PP-001/`)
- Git diff (what changed)
- Acceptance criteria to verify

### You Do NOT Receive:
- Conversation history (anchoring bias)
- Dev's implementation narrative (confirmation bias)
- Dev's debugging journey (sympathy bias)
- Dev's commentary or reasoning (sycophancy risk)
- Dev handoffs (PROHIBITED — preserves fresh context)

---

## Metadata

SLICE-ID: PP-001
ROLE: QA
STATUS: BLOCKED (waiting for Dev)
PRIORITY: CRITICAL
EFFORT: S
TYPE: verification
EVIDENCE_TIER: T3
PARENT_SLICE: PP-001
DEPENDS_ON: PP-001-DEV
CONTEXT_SCOPE: FRESH
TASK_LIST_ID: PP-001-QA

---

## Scope

Verify that the Dev implementation:
- Added Phase 5b MOLECULES to `commands/build.md` (between ATOMS and COMPOSE)
- Updated manifest gate sequence in build.md (molecules gate added, integrate removed)
- Updated `skills/process-context/SKILL.md` Phase Awareness table (molecules added, integrate removed)
- Updated `skills/process-context/SKILL.md` Story Organization table (Molecules/ prefix added)
- Updated `commands/status.md` to show molecules progress and remove INTEGRATE line
- Left `commands/init.md` COMPLETELY UNCHANGED

---

## Verification Checklist

### A. build.md — Phase 5b Presence

- [ ] **A1.** Read `commands/build.md` fully. Confirm a `## Phase 5b: MOLECULES` section exists between the Phase 5 exit gate and the `## Phase 6: COMPOSE` header.
- [ ] **A2.** Confirm Phase 5b includes a "When to Build Molecules" or equivalent guidance (explaining when to skip Phase 5b)
- [ ] **A3.** Confirm Phase 5b includes a step to identify molecules from the atom list + spec
- [ ] **A4.** Confirm Phase 5b includes build steps: write molecule file + write story file
- [ ] **A5.** Confirm the story file instructions specify `Molecules/` as the required Storybook prefix (e.g., `title: 'Molecules/JobRow'`)
- [ ] **A6.** Confirm Phase 5b includes a manifest update format showing `"molecules": [...]` array with name, file, story, status, atoms fields
- [ ] **A7.** Confirm Phase 5b has an exit gate block with `"molecules": "passed"` manifest update

### B. build.md — Manifest Gate Sequence

- [ ] **B1.** Locate at least one manifest JSON example in build.md. Confirm it shows `"molecules"` gate between `"atoms"` and `"compose"`.
- [ ] **B2.** Confirm `"integrate"` does NOT appear in manifest gate examples in build.md.
- [ ] **B3.** Confirm the Overview block at the top of build.md lists `Phase 5b: MOLECULES` and does NOT list `Phase 7: INTEGRATE`.

### C. SKILL.md — Phase Awareness Table

- [ ] **C1.** Read `skills/process-context/SKILL.md` fully. Confirm the Phase Awareness table has a `molecules` row.
- [ ] **C2.** Confirm the `molecules` row appears BETWEEN the `atoms` row and the `compose` row.
- [ ] **C3.** Confirm the `integrate` row has been REMOVED from the Phase Awareness table.
- [ ] **C4.** Confirm the phase list string (e.g., `discover → target → ... → compose`) includes `molecules` and excludes `integrate`.
- [ ] **C5.** Confirm "7-phase" has been updated to "6-phase" (or equivalent count).

### D. SKILL.md — Story Organization Table

- [ ] **D1.** Confirm the Story Organization table includes a `Molecules/` prefix row.
- [ ] **D2.** Confirm the row is positioned between `Components/` and `Screens/`.

### E. SKILL.md — Commands Reference

- [ ] **E1.** Confirm the `/pixel-perfect:build` entry in the Commands Reference reflects the new phase range (no longer "Phases 5-7: atoms → compose → integrate").

### F. status.md Updates

- [ ] **F1.** Read `commands/status.md` fully. Confirm the sample output Phases block includes a MOLECULES line.
- [ ] **F2.** Confirm INTEGRATE has been removed from the sample output Phases block.
- [ ] **F3.** Confirm a Molecules progress section exists in the sample output (showing molecule name, file path, constituent atoms).
- [ ] **F4.** Confirm the "What It Shows" section references molecules tracking.

### G. init.md UNCHANGED — Critical Check

- [ ] **G1.** Run `git diff commands/init.md`. Confirm the output is **completely empty**.
- [ ] **G2.** Read `commands/init.md` Step 1b section. Confirm it STILL shows the 3-level hierarchy: Components (atoms) → Molecules → Views (screens). If Dev accidentally touched init.md, FAIL immediately.

### H. Scope Containment

- [ ] **H1.** Run `git diff --name-only`. Confirm only these files appear: `commands/build.md`, `skills/process-context/SKILL.md`, `commands/status.md`
- [ ] **H2.** Confirm `commands/verify.md` is UNCHANGED
- [ ] **H3.** Confirm `commands/scaffold.md` is UNCHANGED
- [ ] **H4.** Confirm no new files were created

---

## Test Commands

```bash
# A1: Phase 5b section exists
grep -n "Phase 5b" commands/build.md
# Expected: ≥1 match

# A5: Molecules/ story prefix documented in build.md
grep -n "Molecules/" commands/build.md
# Expected: ≥2 matches (instruction + example)

# B1: molecules gate in manifest example
grep -n '"molecules"' commands/build.md
# Expected: ≥1 match

# B2: integrate gate removed from manifest examples
grep -n '"integrate"' commands/build.md
# Expected: 0 matches (or only in Phase 7 section — which PP-006 will remove)

# C1/C2/C3: SKILL.md Phase Awareness table
grep -n "molecules\|integrate" skills/process-context/SKILL.md
# Expected: molecules appears ≥2x; integrate appears 0x

# D1: Molecules/ prefix in SKILL.md Story table
grep -n "Molecules/" skills/process-context/SKILL.md
# Expected: ≥1 match

# G1: CRITICAL — init.md untouched
git diff commands/init.md
# Expected: (empty — absolutely nothing)

# H1: Scope check
git diff --name-only
# Expected: commands/build.md, skills/process-context/SKILL.md, commands/status.md
```

---

## Adversarial Probes

1. **Did Dev accidentally remove content from build.md Phase 5 or Phase 6?** Read both phases completely — they should be byte-identical to before the edit. Only the Phase 5b section and manifest examples should have changed.

2. **Is Phase 5b actually complete, or is it a stub?** A stub would have the header but vague content like "TODO: add molecule steps here." Read the section fully — it should have identify step, build step, story example, manifest update, exit gate. All five elements required.

3. **Did Dev touch init.md?** Run `git diff commands/init.md` — this is the single most important check. init.md was correct before and must remain unchanged.

4. **Is the `Molecules/` prefix capitalized correctly?** The Storybook prefix must be `Molecules/` (capital M), not `molecules/` or `molecule/`. Check the story example in Phase 5b.

5. **Was the integrate row actually removed from SKILL.md's Phase Awareness table, or just commented out?** Read the table raw — the row should not exist at all.

6. **Does the status.md sample output make sense after the edit?** Read the full sample output from top to bottom. Does it flow logically? Is the MOLECULES line positioned correctly between ATOMS and COMPOSE?

---

## Evidence to Collect

1. Output of `grep -n "Phase 5b" commands/build.md`
2. Output of `grep -n "Molecules/" commands/build.md`
3. Output of `grep -n "molecules\|integrate" skills/process-context/SKILL.md`
4. Output of `git diff commands/init.md` → **must be empty**
5. Output of `git diff --name-only`
6. Full text of the Phase 5b section from build.md (copy/paste into evidence file)

---

## Pass/Fail Criteria

**PASS** if:
- A1-A7: Phase 5b section is present and complete in build.md
- B1-B3: Manifest gate examples updated (molecules added, integrate removed)
- C1-C5: SKILL.md Phase Awareness table correct
- D1-D2: SKILL.md Story Organization table has Molecules/ row
- E1: Commands Reference updated
- F1-F4: status.md shows molecules
- G1-G2: `git diff commands/init.md` is empty AND init.md still shows 3-level hierarchy
- H1-H4: Only expected files changed

**FAIL** if:
- Phase 5b section is absent or incomplete (missing any of: identify step, build step, Molecules/ prefix, manifest format, exit gate)
- `git diff commands/init.md` shows ANY changes whatsoever
- `integrate` row still present in SKILL.md Phase Awareness table
- `Molecules/` prefix not documented in SKILL.md Story Organization table
- Any unexpected files in git diff

---

## Rollback Trigger

If FAIL:
```bash
git checkout commands/build.md
git checkout skills/process-context/SKILL.md
git checkout commands/status.md
# DO NOT touch init.md — it should be unchanged
```

---

## REMINDER: You Are Adversarial QA

**FIND PROBLEMS. Do not rubber-stamp.**

The most common failure modes for this slice:
1. Dev removed Molecules from init.md instead of adding to build.md (wrong direction fix)
2. Phase 5b stub is incomplete (missing exit gate, missing manifest format, missing story example)
3. SKILL.md integrate row was left in table
4. status.md INTEGRATE line was not removed

---

--- END SLICE: PP-001-QA ---
