# SLICE-PP-003-QA: Verify Dead Link Fix and react-native-web Adapter Creation

---

## ADVERSARIAL QA INSTRUCTIONS

**Your role is to FIND PROBLEMS, not rubber-stamp work.**

Approach this verification with SKEPTICISM:
- Assume the Dev missed edge cases
- Verify the new file is substantive, not a stub with placeholder text
- Check that no unintended modifications occurred
- Verify EVERY acceptance criterion strictly
- Do not mark PASS unless FULLY verified

**If in doubt, mark as FAIL and require fixes.**

---

## Metadata

SLICE-ID: PP-003
ROLE: QA
STATUS: BLOCKED (waiting for Dev)
PRIORITY: HIGH
EFFORT: S
TYPE: verification
EVIDENCE_TIER: T3
PARENT_SLICE: PP-003
DEPENDS_ON: PP-003-DEV
CONTEXT_SCOPE: FRESH
TASK_LIST_ID: PP-003-QA

---

## Scope

Verify that:
1. The wrong GitHub URL for react-native-reusables is corrected
2. `docs/adapters/react-native-web.md` exists and contains the polyfill disclaimer decorator pattern
3. The reference in storybook-conventions.md is now resolvable
4. No unintended modifications occurred

---

## Verification Checklist

### A. GitHub URL Fix

- [ ] **A1.** Read `docs/adapters/react-native-reusables.md`, Source URLs section — confirm `https://github.com/roninoss/react-native-reusables` appears
- [ ] **A2.** Confirm `https://github.com/founded-labs/react-native-reusables` does NOT appear anywhere in the file
- [ ] **A3.** Run `grep -n "github.com" docs/adapters/react-native-reusables.md` — confirm only the correct URL present

**Adversarial probe:** Did Dev change ONLY the GitHub URL, or did they accidentally modify surrounding content in the Source URLs section?

### B. New File Verification

- [ ] **B1.** `docs/adapters/react-native-web.md` exists
- [ ] **B2.** File is >50 lines (not a placeholder stub)
- [ ] **B3.** File contains the polyfill disclaimer decorator pattern (the yellow banner with `#FFF3CD` background)
- [ ] **B4.** File contains Storybook Vite/webpack alias configuration (`'react-native': 'react-native-web'`)
- [ ] **B5.** File contains a verify checklist
- [ ] **B6.** File follows the same structural format as other adapter docs (has header sections: Platforms, Category, Setup, Verify, Source URLs)

**Adversarial probe:** Is the decorator code correct? Check that the decorator is in the right format for Storybook's preview.tsx (it should export a `Preview` object with `decorators` array).

### C. Reference Resolution

- [ ] **C1.** Read `docs/storybook-conventions.md` line ~268 — confirm the text still says "See `docs/adapters/react-native-web.md`"
- [ ] **C2.** Confirm `docs/adapters/react-native-web.md` now exists at that exact path
- [ ] **C3.** The reference path in storybook-conventions.md exactly matches the created file path (case-sensitive)

### D. Scope Containment

- [ ] **D1.** Run `git diff --name-only` — only `docs/adapters/react-native-reusables.md` and `docs/adapters/react-native-web.md` appear
- [ ] **D2.** `docs/storybook-conventions.md` is UNCHANGED (the reference text should still be there, just the target file now exists)
- [ ] **D3.** No command files (commands/) modified
- [ ] **D4.** No skill files (skills/) modified

### E. Content Quality of New File

- [ ] **E1.** The decorator pattern in react-native-web.md shows the `#FFF3CD` yellow banner text: "Web Preview — Some native elements..."
- [ ] **E2.** The alias config shows `'react-native': 'react-native-web'`
- [ ] **E3.** A "What Works vs. What Differs" table or equivalent communicates polyfill limitations
- [ ] **E4.** Source URLs section is present with at least react-native-web GitHub link

---

## Test Commands

```bash
# A1: Correct URL present
grep -n "roninoss" docs/adapters/react-native-reusables.md
# Expected: 1 match in Source URLs

# A2: Old URL absent
grep -n "founded-labs" docs/adapters/react-native-reusables.md
# Expected: 0 matches

# B1: File exists
ls docs/adapters/react-native-web.md
# Expected: file listed

# B2: File is substantive
wc -l docs/adapters/react-native-web.md
# Expected: >50

# B3: Polyfill banner present
grep -n "FFF3CD\|Web Preview" docs/adapters/react-native-web.md
# Expected: at least 1 match

# D1: Only expected files changed
git diff --name-only
# Expected: docs/adapters/react-native-reusables.md (modified) + docs/adapters/react-native-web.md (new)
```

---

## Regression Checks

- [ ] The rest of `docs/adapters/react-native-reusables.md` is unchanged (scaffold steps, theme integration, verify checklist all intact)
- [ ] `docs/storybook-conventions.md` polyfill disclaimer section (around line 266-274) is unchanged
- [ ] No adapter files in `docs/adapters/` were deleted or renamed

---

## Evidence to Collect

1. `grep -n "roninoss\|founded-labs" docs/adapters/react-native-reusables.md` output
2. `ls -la docs/adapters/react-native-web.md` output
3. `wc -l docs/adapters/react-native-web.md` output
4. `git diff --name-only` output
5. First 30 lines of `docs/adapters/react-native-web.md` (showing structure)

---

## Pass/Fail Criteria

**PASS** if:
- A1-A3: GitHub URL corrected in react-native-reusables.md
- B1-B6: react-native-web.md exists, is substantive, and contains all required sections
- C1-C3: Reference in storybook-conventions.md resolves to the new file
- D1-D4: Only expected files in git diff
- E1-E4: New file content is accurate and useful

**FAIL** if:
- `founded-labs` URL still exists in react-native-reusables.md
- react-native-web.md is missing or is a placeholder stub
- The decorator pattern in react-native-web.md is syntactically wrong
- Any unexpected files modified

---

## Rollback Trigger

If FAIL:
```bash
git checkout docs/adapters/react-native-reusables.md
rm docs/adapters/react-native-web.md
```

---

## REMINDER: You Are Adversarial QA

**FIND PROBLEMS. Do not rubber-stamp.**

Key adversarial checks:
1. Is the new file's decorator actually valid TypeScript/JSX for Storybook preview.tsx?
2. Does the alias config distinguish between Vite and webpack? (Different projects use different bundlers)
3. Is the polyfill banner text EXACTLY consistent with what `docs/storybook-conventions.md` quotes it as? (It quotes: "Web Preview — Some native elements (icons, gestures, haptics) are polyfilled via react-native-web and may differ from device rendering.")
4. Did Dev use the right file extension conventions for the project?

---

--- END SLICE: PP-003-QA ---
