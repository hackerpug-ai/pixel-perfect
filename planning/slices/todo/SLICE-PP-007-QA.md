# SLICE-PP-007-QA: Verify BUILD PLAN Phase Added

---

## ADVERSARIAL QA INSTRUCTIONS

**Your role is to FIND PROBLEMS, not rubber-stamp work.**

This slice adds a significant new phase to the build pipeline. Adversarial focus:
- Is the BUILD PLAN section actually complete, or is it a shallow stub?
- Does the gate logic correctly handle brownfield vs. greenfield scenarios?
- Does the bottom-up propagation rule appear in the documentation?
- Did Dev accidentally break Phase 5, 5b, or 6 while editing build.md?

**If in doubt, mark as FAIL and require fixes.**

---

## Metadata

SLICE-ID: PP-007
ROLE: QA
STATUS: BLOCKED (waiting for Dev)
PRIORITY: HIGH
EFFORT: S
TYPE: verification
EVIDENCE_TIER: T3
PARENT_SLICE: PP-007
DEPENDS_ON: PP-007-DEV
CONTEXT_SCOPE: FRESH
TASK_LIST_ID: PP-007-QA

---

## Scope

Verify that:
1. Phase 4b: BUILD PLAN section exists and is complete in `commands/build.md`
2. The section correctly documents: codebase audit, requirements analysis, delta computation, gate logic, plan output format, greenfield vs. brownfield, manifest write, exit gate
3. Manifest gate examples in build.md include the `plan` gate
4. Prior phases (5 ATOMS, 5b MOLECULES, 6 COMPOSE) are intact — Dev did not damage earlier work while adding Phase 4b

---

## Verification Checklist

### A. Phase 4b — Presence and Position

- [ ] **A1.** Read `commands/build.md` fully. Confirm `## Phase 4b: BUILD PLAN` (or equivalent heading) exists.
- [ ] **A2.** Confirm Phase 4b appears BEFORE `## Phase 5: ATOMS` in the file — not after.
- [ ] **A3.** Confirm the Overview block lists Phase 4b alongside Phase 5, 5b, and 6.

### B. Phase 4b — Completeness

- [ ] **B1.** Codebase audit step present — documents how to discover existing tokens, atoms, molecules, screens
- [ ] **B2.** Requirements analysis step present — documents how to read spec and identify what's needed per level
- [ ] **B3.** Delta computation documented — explains how to compare required vs. existing
- [ ] **B4.** Gate-opening factors documented — at least Tokens, Atoms, Molecules, Screens gate conditions listed
- [ ] **B5.** Bottom-up propagation rule documented — states that a lower-level ACTIVE forces re-evaluation of higher levels
- [ ] **B6.** Work plan output format shown — example with SKIP/BUILD tags per level and user confirmation prompt
- [ ] **B7.** Greenfield handling documented — explains all-levels-ACTIVE behavior when no existing components found
- [ ] **B8.** Brownfield handling documented — explains delta-only behavior when existing components exist
- [ ] **B9.** Manifest write step present — shows JSON format for `build_plan` and `plan: passed` gate
- [ ] **B10.** Phase 4b exit gate documented — states `plan` gate set to `passed` after user confirmation

### C. Manifest Gate Examples

- [ ] **C1.** Find at least one manifest JSON example in build.md. Confirm it includes `"plan"` gate.
- [ ] **C2.** Confirm `"plan"` gate appears BEFORE `"atoms"` gate in the example sequence.

### D. Resuming Behavior

- [ ] **D1.** The "Resuming" section (or equivalent) mentions that BUILD PLAN runs if not yet confirmed.
- [ ] **D2.** A resumed build shows the plan status (which levels are SKIP, BUILD, or in-progress).

### E. Prior Phase Integrity — Critical Regression Check

These phases were added by PP-001 and PP-006. PP-007 also edited build.md. Verify PP-007 did not damage prior work:

- [ ] **E1.** `grep -n "Phase 5b" commands/build.md` → ≥1 match
- [ ] **E2.** `grep -n "Molecules/" commands/build.md` → ≥2 matches
- [ ] **E3.** `grep -n "Phase 7\|INTEGRATE" commands/build.md` → 0 matches (Phase 7 was removed by PP-006)
- [ ] **E4.** Read Phase 5 ATOMS section — confirm it is complete (has build steps, argTypes example, exit gate)
- [ ] **E5.** Read Phase 6 COMPOSE section — confirm it is complete (has build steps, story example, exit gate)

### F. Scope Containment

- [ ] **F1.** `git diff --name-only` → `commands/build.md` only
- [ ] **F2.** No other files modified

---

## Test Commands

```bash
# A1: Phase 4b exists
grep -n "Phase 4b" commands/build.md
# Expected: ≥1 match

# B5: Propagation rule
grep -n "propagat\|lower.level\|bottom.up" commands/build.md
# Expected: ≥1 match (the propagation rule must be documented)

# B6: SKIP/BUILD output format
grep -n "SKIP\|BUILD" commands/build.md
# Expected: ≥4 matches (showing the plan output format)

# B9: plan gate in manifest
grep -n '"plan"' commands/build.md
# Expected: ≥1 match

# C2: plan gate before atoms gate in example
# Manual check: read the manifest example and verify sequence

# E1: Phase 5b intact
grep -n "Phase 5b" commands/build.md
# Expected: ≥1 match

# E3: Phase 7 still gone
grep -cn "Phase 7\|INTEGRATE\|integrate" commands/build.md
# Expected: 0

# F1: Scope
git diff --name-only
# Expected: commands/build.md only
```

---

## Adversarial Probes

1. **Is Phase 4b a real implementation guide or a vague description?** A stub would say "analyze requirements and determine what to build." A complete implementation would have: codebase audit with directory patterns, requirements analysis steps, gate-opening factors per level, example plan output with SKIP/BUILD tags, manifest JSON format. If it's vague, FAIL.

2. **Is the bottom-up propagation rule explicitly stated?** This is the core correctness property: if Atoms change, Molecules must be re-evaluated. If this rule is absent, Dev left a gap in the specification.

3. **Is greenfield vs. brownfield both handled?** Greenfield is easy (build everything). Brownfield is hard (only build what changed). Both must be documented.

4. **Did Phase 4b accidentally end up AFTER Phase 5?** Check the file ordering. Phase 4b must precede Phase 5.

5. **Did Dev touch Phase 5 ATOMS and accidentally modify it?** Read Phase 5 fully. Compare to what's expected: identify components step, build each atom step, argTypes example, progress tracking, exit gate. Any missing element = regression.

---

## Evidence to Collect

1. Output of `grep -n "Phase 4b\|BUILD PLAN" commands/build.md`
2. Output of `grep -n '"plan"' commands/build.md`
3. Output of `grep -n "Phase 5b\|Molecules/" commands/build.md`
4. Output of `grep -cn "Phase 7\|INTEGRATE" commands/build.md` → must be 0
5. Output of `git diff --name-only`
6. Full text of Phase 4b section (copy/paste into evidence file for completeness check)

---

## Pass/Fail Criteria

**PASS** if:
- A1-A3: Phase 4b exists and is positioned before Phase 5
- B1-B10: All required sub-elements present (codebase audit, requirements analysis, delta computation, gate logic, propagation rule, plan output format, greenfield/brownfield, manifest write, exit gate)
- C1-C2: `plan` gate in manifest examples, positioned before `atoms`
- D1-D2: Resuming behavior updated
- E1-E5: Prior phases (5, 5b, 6) are intact and undamaged
- F1-F2: Only build.md changed

**FAIL** if:
- Phase 4b section is absent
- Phase 4b is a shallow stub (missing gate logic, propagation rule, or plan output format)
- Bottom-up propagation rule is not documented
- Greenfield or brownfield handling is absent
- `plan` gate not in manifest examples
- Phase 5b MOLECULES is missing or damaged
- Phase 7 INTEGRATE somehow reappeared
- Any file other than build.md in git diff

---

## Rollback Trigger

If FAIL:
```bash
# Restore build.md to post-PP-006-merge state
git checkout commands/build.md
```

---

## REMINDER: You Are Adversarial QA

**FIND PROBLEMS. Do not rubber-stamp.**

The most likely failure modes:
1. Phase 4b is vague — describes the concept without the actionable steps an AI agent needs to actually execute it
2. Propagation rule missing — the spec allows skipping Molecules even if Atoms changed, which is wrong
3. Phase 4b placed after Phase 5 instead of before (ordering error)
4. Phase 5 ATOMS or 5b MOLECULES damaged during the edit

---

--- END SLICE: PP-007-QA ---
