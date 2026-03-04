# SLICE-PP-004-QA: Verify SKILL.md Trim and scaffold.md Weight Reduction

---

## ADVERSARIAL QA INSTRUCTIONS

**Your role is to FIND PROBLEMS, not rubber-stamp work.**

This slice is high-risk: trimming can break functionality if essential content is removed. Be aggressive:
- Assume the Dev cut too aggressively
- Assume the Dev left too much (didn't actually trim)
- Verify every kept section is complete
- Verify every removed section was truly redundant
- Test that references to external docs actually exist

**If in doubt, mark as FAIL and require fixes.**

---

## Metadata

SLICE-ID: PP-004
ROLE: QA
STATUS: BLOCKED (waiting for Dev)
PRIORITY: HIGH
EFFORT: M
TYPE: verification
EVIDENCE_TIER: T3
PARENT_SLICE: PP-004
DEPENDS_ON: PP-004-DEV
CONTEXT_SCOPE: FRESH
TASK_LIST_ID: PP-004-QA

---

## Scope

Verify that:
1. SKILL.md is meaningfully trimmed without losing essential phase-awareness content
2. scaffold.md is meaningfully trimmed without losing orchestration logic
3. All references to external docs point to files that actually exist
4. The trimmed SKILL.md still fully enables phase-aware operation

---

## Verification Checklist

### A. SKILL.md Size Verification

- [ ] **A1.** `wc -l skills/process-context/SKILL.md` returns ≤120 lines
- [ ] **A2.** If A1 fails: was the file actually trimmed at all? (`git diff --stat skills/process-context/SKILL.md`)

**Adversarial probe:** Did Dev trim to exactly 121 lines (just barely failing)? Did Dev replace content with comments instead of actually removing it?

### B. SKILL.md Content — Required Sections Present

Read the trimmed SKILL.md completely and verify:

- [ ] **B1.** `autoActivate` frontmatter with `files: ["design/manifest.json", "design/manifest.yaml"]` is present
- [ ] **B2.** Phase Awareness table is present with all 7 phases (discover, target, equip, scaffold, atoms, compose, integrate)
- [ ] **B3.** Adapter Conventions section still has rules for: tailwind/nativewind, shadcn, react-native-paper, storybook
- [ ] **B4.** Story Organization Convention is present with the 3-tier prefix table (`Design System/`, `Components/`, `Screens/`)
- [ ] **B5.** Commands Reference table is present

### C. SKILL.md Content — Removed Sections Absent

- [ ] **C1.** The full Storybook Controls argTypes mapping table is REMOVED (or reduced to ≤2 lines pointing to storybook-conventions.md)
- [ ] **C2.** The full Manifest Updates JSON examples are REMOVED (or reduced to a brief note)
- [ ] **C3.** The full polyfill decorator code block (`.storybook/preview.tsx` with the yellow banner) is REMOVED (or reduced to a 1-line reference)

### D. scaffold.md Size Verification

- [ ] **D1.** `wc -l commands/scaffold.md` returns ≤280 lines
- [ ] **D2.** If D1 fails: confirm the file was actually trimmed (`git diff --stat commands/scaffold.md`)

### E. scaffold.md Content — Required Sections Present

Read the trimmed scaffold.md completely and verify:

- [ ] **E1.** Gate check logic is present (requires `discover`, `target`, `equip` gates)
- [ ] **E2.** Phase step ordering is preserved (Read manifest → Load adapters → Install → Configure Storybook → Create theme → Semantic color enforcement → Token stories → Hello world → Verify)
- [ ] **E3.** Semantic color enforcement section is still present (unique to scaffold.md)
- [ ] **E4.** frontend-design integration note is present

### F. Reference Integrity

- [ ] **F1.** Any adapter reference in trimmed SKILL.md (e.g., "See docs/adapters/...") points to a file that EXISTS on disk
- [ ] **F2.** Any adapter reference in trimmed scaffold.md points to a file that EXISTS on disk
- [ ] **F3.** The reference to `docs/storybook-conventions.md` in SKILL.md points to a file that exists (it does — verified in PP-003)

```bash
# Check all referenced adapter files exist
for f in $(grep -o "docs/adapters/[a-z-]*\.md" skills/process-context/SKILL.md); do
  [ -f "$f" ] && echo "OK: $f" || echo "MISSING: $f"
done

for f in $(grep -o "docs/adapters/[a-z-]*\.md" commands/scaffold.md); do
  [ -f "$f" ] && echo "OK: $f" || echo "MISSING: $f"
done
```

### G. Scope Containment

- [ ] **G1.** `git diff --name-only` shows only `skills/process-context/SKILL.md` and `commands/scaffold.md`
- [ ] **G2.** No adapter docs were modified
- [ ] **G3.** No command files other than scaffold.md were modified

---

## Test Commands

```bash
# A1: SKILL.md line count
wc -l skills/process-context/SKILL.md
# Expected: ≤120

# D1: scaffold.md line count
wc -l commands/scaffold.md
# Expected: ≤280

# B2: Phase Awareness table present
grep -c "discover\|scaffold\|atoms\|compose\|integrate" skills/process-context/SKILL.md
# Expected: ≥5 matches

# B3: Adapter conventions present
grep -c "tailwind\|shadcn\|react-native-paper" skills/process-context/SKILL.md
# Expected: ≥3 matches

# E3: Semantic color section in scaffold.md
grep -i "semantic" commands/scaffold.md | head -5
# Expected: at least 1 match referencing semantic color enforcement

# G1: Scope check
git diff --name-only
# Expected: skills/process-context/SKILL.md, commands/scaffold.md
```

---

## Regression Checks

- [ ] The `autoActivate` trigger conditions in SKILL.md are unchanged
- [ ] The Phase Awareness table in SKILL.md has the SAME phases as before (none added, none removed)
- [ ] scaffold.md still references adapters using correct relative paths (`docs/adapters/`)
- [ ] The hello-world component concept in scaffold.md is still mentioned (even if inline code removed)

---

## Evidence to Collect

1. `wc -l skills/process-context/SKILL.md` output
2. `wc -l commands/scaffold.md` output
3. `git diff --stat` for both files (shows lines added/removed)
4. Output of adapter reference check (F1, F2)
5. `git diff --name-only` output

---

## Pass/Fail Criteria

**PASS** if:
- A1: SKILL.md ≤120 lines
- B1-B5: All required sections present in SKILL.md
- C1-C3: All specified sections removed from SKILL.md
- D1: scaffold.md ≤280 lines
- E1-E4: All required sections present in scaffold.md
- F1-F3: All referenced files exist on disk
- G1-G3: Only expected files in git diff

**FAIL** if:
- Either file is not actually trimmed (same or nearly same size as before)
- Phase Awareness table is missing or incomplete
- Adapter conventions are missing from SKILL.md
- Semantic color enforcement is missing from scaffold.md
- Any referenced adapter file does not exist on disk
- Unexpected files appear in git diff

---

## Rollback Trigger

If FAIL:
```bash
git checkout skills/process-context/SKILL.md commands/scaffold.md
```

---

## REMINDER: You Are Adversarial QA

**FIND PROBLEMS. Do not rubber-stamp.**

Specific adversarial checks:
1. Did Dev actually trim scaffold.md or just remove comments/whitespace? (Check git diff --stat for meaningful line reduction)
2. Is the trimmed SKILL.md still operational? Read it as if you're an agent seeing it for the first time — do you have enough to operate in phase-aware mode?
3. Does scaffold.md reference `docs/adapters/react-native-web.md`? If yes, verify that file now exists (PP-003 created it). If not, is the polyfill setup still covered?
4. Are the references added by Dev syntactically correct markdown links (not broken paths)?

---

--- END SLICE: PP-004-QA ---
