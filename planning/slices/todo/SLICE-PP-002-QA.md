# SLICE-PP-002-QA: Verify Version Staleness and Sandbox Fix

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

---

## Metadata

SLICE-ID: PP-002
ROLE: QA
STATUS: BLOCKED (waiting for Dev)
PRIORITY: HIGH
EFFORT: XS
TYPE: verification
EVIDENCE_TIER: T3
PARENT_SLICE: PP-002
DEPENDS_ON: PP-002-DEV
CONTEXT_SCOPE: FRESH
TASK_LIST_ID: PP-002-QA

---

## Scope

Verify that:
1. All `v4.0` version strings are updated to `v4.3.1` across all affected files
2. The status.md mobile sample shows the correct `Storybook Native` sandbox adapter
3. No unintended content changes occurred

---

## Verification Checklist

### A. Version String Audit (EXHAUSTIVE)

- [ ] **A1.** Run `grep -rn "v4\.0" commands/ skills/` — must return 0 results
- [ ] **A2.** Run `grep -rn '"version": "4\.0"' commands/` — must return 0 results
- [ ] **A3.** Read `commands/status.md` fully — confirm BOTH sample headers say `pixel-perfect v4.3.1`
- [ ] **A4.** Read `skills/process-context/SKILL.md` fully — confirm version string updated
- [ ] **A5.** Read `commands/init.md` — confirm ALL manifest JSON examples show `"version": "4.3.1"`, not a mix of old/new

**Adversarial probe:** Did Dev update only SOME occurrences but miss others? Check every `4.0` in every modified file.

### B. Sandbox Fix Verification

- [ ] **B1.** Read the "Sample Output" section of `commands/status.md` — Tools block must show `Storybook Native (adapter: storybook-native.md)`
- [ ] **B2.** Confirm `storybook.md` (web adapter) is NOT referenced in the mobile sample output
- [ ] **B3.** Confirm `storybook-native.md` IS referenced in the mobile sample output
- [ ] **B4.** Verify consistency: `commands/init.md` Phase 3 (EQUIP) section documents that mobile projects auto-select `storybook-native.md` — does the status.md fix align with this?

**Adversarial probe:** Did Dev fix the wrong occurrence? Check both sample sections in status.md (there is also a "No Manifest Found" section — it should NOT have sandbox info since there's no manifest).

### C. Scope Containment

- [ ] **C1.** Run `git diff --name-only` — confirm only `commands/status.md`, `skills/process-context/SKILL.md`, and `commands/init.md` appear
- [ ] **C2.** Run `git diff commands/build.md commands/verify.md commands/scaffold.md` — must be empty
- [ ] **C3.** Run `git diff docs/` — must be empty

### D. No Regression

- [ ] **D1.** The status.md "No Manifest Found" section still shows `pixel-perfect v4.3.1` (version updated there too, not just the main sample)
- [ ] **D2.** The SKILL.md edit did not accidentally remove adjacent content (read the full paragraph where version appears)
- [ ] **D3.** The init.md manifest JSON examples are still valid JSON after the version edit (no broken syntax)

---

## Test Commands

```bash
# A1: Zero v4.0 occurrences
grep -rn "v4\.0" commands/ skills/
# Expected: (empty)

# A2: Zero "version": "4.0" occurrences
grep -rn '"version": "4\.0"' commands/
# Expected: (empty)

# B2: No web storybook in mobile sample
grep -n "storybook\.md" commands/status.md
# Expected: should NOT appear in the mobile Tools sample block (check line context)

# B3: Native storybook in mobile sample
grep -n "storybook-native\.md" commands/status.md
# Expected: at least 1 match

# C1: Only expected files changed
git diff --name-only
# Expected: commands/init.md, commands/status.md, skills/process-context/SKILL.md
```

---

## Regression Checks

- [ ] The status.md status icons table (`[x]`, `[~]`, `[ ]`) is unchanged
- [ ] The status.md "frontend-design Detection" section is unchanged
- [ ] The SKILL.md phase awareness table is unchanged (only version string updated)
- [ ] The init.md manifest structure is unchanged (only version value updated)

---

## Evidence to Collect

1. `grep -rn "v4\.0" commands/ skills/` → must be empty
2. `grep -rn '"version": "4\.0"' commands/` → must be empty
3. `git diff --name-only` output
4. Relevant excerpt from status.md showing the fixed mobile sample Tools block

---

## Pass/Fail Criteria

**PASS** if:
- Zero `v4.0` occurrences in commands/ and skills/
- Zero `"version": "4.0"` in commands/
- status.md mobile sample shows `Storybook Native (adapter: storybook-native.md)`
- Only expected files in git diff
- No regression in surrounding content

**FAIL** if:
- Any `v4.0` or `"version": "4.0"` remains anywhere in the plugin files
- status.md still shows the web storybook adapter for the mobile sample
- Any unexpected files modified
- JSON syntax broken in init.md examples

---

## Rollback Trigger

If FAIL: `git checkout commands/status.md skills/process-context/SKILL.md commands/init.md`

---

## REMINDER: You Are Adversarial QA

**FIND PROBLEMS. Do not rubber-stamp.**

Specific adversarial checks:
1. Search for `4.0` broadly — not just `v4.0` — in case version was written without the `v` prefix
2. Verify BOTH status.md sample blocks have correct version (there are two: one with manifest, one without)
3. Check that the storybook-native adapter name is spelled correctly (`storybook-native.md` not `storybook_native.md` or `native-storybook.md`)

---

--- END SLICE: PP-002-QA ---
