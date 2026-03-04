# SLICE-PP-001-QA: Verify Molecules Hierarchy Inconsistency Fix

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
- Verify rollback procedures actually work

**If in doubt, mark as FAIL and require fixes.**

Your job is to protect quality, not to be agreeable. Be thorough, be critical, be adversarial.

---

## Context Scope (HIERARCHICAL CONTEXT POLICY)

**Your context scope: FRESH**

### CRITICAL: You Are QA - Fresh Context Required

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
- Dev handoffs (PROHIBITED - preserves fresh context)

### Handoff Policy:
- **When pausing:** Run `/handoff` → produces QA handoff automatically
- **When resuming:** Run `/handoff-resume` → shows only QA handoffs for this slice
- **What you write:** Evidence-focused review state only
- **What you read:** QA handoffs for same slice only
- **PROHIBITED:** Reading Dev handoffs (violates fresh context)

---

## Metadata

SLICE-ID: PP-001
ROLE: QA
STATUS: BLOCKED (waiting for Dev)
PRIORITY: CRITICAL
EFFORT: XS
TYPE: verification
EVIDENCE_TIER: T3
PARENT_SLICE: PP-001
DEPENDS_ON: PP-001-DEV
CONTEXT_SCOPE: FRESH
TASK_LIST_ID: PP-001-QA

---

## Scope

Verify that the Dev implementation:
- Removed all Molecules references from `commands/init.md`
- Updated the component hierarchy to 2-level (atoms → screens)
- Updated the ASCII diagram
- Did NOT modify any files outside `commands/init.md`

---

## Verification Checklist

### A. Primary Fix Verification

- [ ] **A1.** Read `commands/init.md` completely. Confirm ZERO occurrences of "Molecules" or "Molecule" (case-sensitive and case-insensitive)
- [ ] **A2.** Confirm the "Step 1b" section describes only 2 levels: Components (atoms) and Screens (views)
- [ ] **A3.** Confirm the ASCII hierarchy diagram shows only 2 rows: Components (atoms) and Screens (views)
- [ ] **A4.** Confirm the "Storybook story prefixes" mentioned in the hierarchy use only `Components/` and `Screens/` — NOT `Molecules/`
- [ ] **A5.** Confirm "Plan the build order" text does not mention molecules

### B. Cross-Reference Verification

- [ ] **B1.** Read `commands/build.md` — confirm it is IDENTICAL to its pre-edit state (no Molecules added)
- [ ] **B2.** Read `commands/verify.md` — confirm it is IDENTICAL to its pre-edit state
- [ ] **B3.** Read `skills/process-context/SKILL.md` — confirm it is IDENTICAL to its pre-edit state
- [ ] **B4.** Read `commands/status.md` — confirm it is IDENTICAL to its pre-edit state

### C. Consistency Verification

- [ ] **C1.** Verify that the story prefixes in init.md (`Components/`, `Screens/`) match those defined in `commands/build.md` (Phase 5: `Components/`, Phase 6: `Screens/`)
- [ ] **C2.** Verify that the story prefixes in init.md match those in `docs/storybook-conventions.md`
- [ ] **C3.** Verify the component hierarchy in init.md matches the phase names in `skills/process-context/SKILL.md` Phase Awareness table (atoms, compose — no molecules)

### D. Git Diff Verification

- [ ] **D1.** Run `git diff --name-only` — only `commands/init.md` should appear
- [ ] **D2.** Run `git diff commands/init.md` — confirm only the Molecules-related text is removed, no other content changed
- [ ] **D3.** Confirm no new files were created

### E. Evidence Review

- [ ] **E1.** Review `.tmp/evidence/PP-001/after-grep.txt` — confirm it shows 0 Molecule matches in init.md

---

## Test Commands

```bash
# A1: Zero Molecules occurrences
grep -ci "molecules\|molecule" commands/init.md
# Expected output: 0

# B: Other files unchanged
git diff commands/build.md commands/verify.md skills/process-context/SKILL.md commands/status.md
# Expected output: (empty — no changes)

# D1: Only init.md changed
git diff --name-only
# Expected output: commands/init.md

# C1: Story prefixes match between init.md and build.md
grep -n "Components/\|Screens/\|Molecules/" commands/init.md commands/build.md
# Expected: Molecules/ appears in NEITHER file
```

---

## Regression Checks

- [ ] **R1.** The 2-level hierarchy in init.md still includes the full explanation of what atoms are (Button, Badge, Avatar, Input examples)
- [ ] **R2.** The "Plan the build order" text still exists and is coherent (atoms then screens)
- [ ] **R3.** No markdown formatting was broken in the edit (headers, code blocks, lists are properly closed)
- [ ] **R4.** init.md still has the 3-step numbered list under "Spec Document for Sandbox Views" (just with Molecules removed from steps 1, 2, and 3)

---

## Evidence to Collect

1. Output of `grep -ci "molecules\|molecule" commands/init.md` → must be `0`
2. Output of `git diff --name-only` → must be `commands/init.md` only
3. Screenshot or text capture of the updated hierarchy section in init.md showing the 2-level structure
4. Output of `git diff commands/build.md commands/verify.md skills/process-context/SKILL.md commands/status.md` → must be empty

---

## Pass/Fail Criteria

**PASS** if:
- A1-A5: All "Molecules" references removed from init.md
- B1-B4: No other files modified
- C1-C3: Story prefixes consistent across all referenced files
- D1-D3: Git diff shows only init.md changed
- R1-R4: No regressions in init.md structure

**FAIL** if:
- Any occurrence of "Molecules" or "Molecule" remains in init.md
- Any file other than init.md appears in git diff
- The hierarchy section is incoherent, broken, or missing the atoms-to-screens explanation
- Markdown formatting is broken

---

## Rollback Trigger

If FAIL: `git checkout commands/init.md` to restore the original file. No other files were modified so no other rollback needed.

---

## REMINDER: You Are Adversarial QA

**FIND PROBLEMS. Do not rubber-stamp.**

If ANY criterion is not fully met → **FAIL** and send back to Dev.

Key adversarial probes:
1. Did Dev accidentally delete MORE than the Molecules text? (regression check)
2. Did Dev leave "Molecule" in a singular form somewhere? (search both "Molecules" and "Molecule")
3. Did Dev modify the ASCII diagram correctly — is it still readable and accurate?
4. Does the remaining text flow coherently after removal, or are there orphaned references?

---

--- END SLICE: PP-001-QA ---
