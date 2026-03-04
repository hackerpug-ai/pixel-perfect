# SLICE-PP-005-QA: Verify Tailwind v4 and Chakra v3 API Updates

---

## ADVERSARIAL QA INSTRUCTIONS

**Your role is to FIND PROBLEMS, not rubber-stamp work.**

This slice requires domain knowledge verification — not just "is the text updated" but "is the updated text ACCURATE". Be skeptical:
- Did Dev use correct Tailwind v4 / NativeWind 4 syntax?
- Did Dev accurately describe Chakra v3 API (vs. v2)?
- Are the new Source URLs real and pointing to v3 docs?
- Did the version compatibility note actually help, or confuse?

**If in doubt, mark as FAIL and require fixes.**

---

## Metadata

SLICE-ID: PP-005
ROLE: QA
STATUS: BLOCKED (waiting for Dev)
PRIORITY: MEDIUM
EFFORT: M
TYPE: verification
EVIDENCE_TIER: T3
PARENT_SLICE: PP-005
DEPENDS_ON: PP-005-DEV
CONTEXT_SCOPE: FRESH
TASK_LIST_ID: PP-005-QA

---

## Scope

Verify that:
1. react-native-reusables.md uses Tailwind v4 / NativeWind 4.x syntax with backward-compat note for v3
2. chakra-ui.md accurately reflects Chakra v3 API (Panda CSS, createSystem, new component names)
3. No inaccurate technical claims were introduced
4. No other files modified

---

## Verification Checklist

### A. Tailwind v4 Syntax in react-native-reusables.md

- [ ] **A1.** Read `docs/adapters/react-native-reusables.md` fully. The `global.css` scaffold step shows `@import "tailwindcss"` as primary guidance (not `@tailwind base/components/utilities`)
- [ ] **A2.** A compatibility note is present explaining NativeWind 2.x vs 4.x syntax difference
- [ ] **A3.** The compatibility note mentions checking the `nativewind` package version
- [ ] **A4.** The shadcn/ui theme import guidance no longer exclusively says "Tailwind v3 version"
- [ ] **A5.** The CSS variables block (`:root { --background: ... }`) is still present and unchanged

**Adversarial probe — Technical accuracy:**
- `@import "tailwindcss"` is correct for Tailwind CSS v4. Verify this is what NativeWind 4.x actually uses. If Dev used different syntax (e.g., `@import "nativewind"`), that may be wrong.
- NativeWind 4.x requires Tailwind CSS v3 OR v4 depending on the NativeWind version. NativeWind 4.x DOES support Tailwind v4. Verify the note doesn't overclaim.

### B. Chakra v3 Accuracy in chakra-ui.md

- [ ] **B1.** Read `docs/design-systems/chakra-ui.md` fully.
- [ ] **B2.** Overview section correctly states Panda CSS is the v3 engine (not Emotion/styled-components)
- [ ] **B3.** `createSystem()` is mentioned as the theming API
- [ ] **B4.** `@chakra-ui/icons` removal in v3 is documented
- [ ] **B5.** `Modal` → `Dialog` rename is reflected in the component names table
- [ ] **B6.** Source URLs point to v3 documentation paths (e.g., `/docs/get-started/installation`, not v2 paths)
- [ ] **B7.** oklch color format is mentioned (Chakra v3 uses oklch in its default tokens)

**Adversarial probe — Technical accuracy:**
- Is `createSystem()` the actual Chakra v3 theming API? Verify the function name is correct (it is — `createSystem` from `@chakra-ui/react`).
- Does Chakra v3 ACTUALLY remove `@chakra-ui/icons`? The icons package WAS deprecated but may still exist. Verify the claim is accurate vs. "deprecated/moved to separate project."
- `HStack` and `VStack` — did Dev say they're "removed" or "deprecated"? They are still available in v3 but are now aliases. The claim should be accurate.
- Is the updated component table complete? Did Dev miss any renamed components?

### C. Scope Containment

- [ ] **C1.** `git diff --name-only` shows only `docs/adapters/react-native-reusables.md` and `docs/design-systems/chakra-ui.md`
- [ ] **C2.** `docs/adapters/react-native-web.md` (PP-003 artifact) is NOT modified
- [ ] **C3.** No command files modified
- [ ] **C4.** No skill files modified

### D. No Regression

- [ ] **D1.** The scaffold steps in react-native-reusables.md are otherwise complete (CLI init, dependencies, PortalHost, hello-world component)
- [ ] **D2.** The GitHub URL in react-native-reusables.md is still the PP-003 corrected version (`roninoss`)
- [ ] **D3.** chakra-ui.md still has a Review Checklist section
- [ ] **D4.** chakra-ui.md still has a Source URLs section with valid URLs

---

## Test Commands

```bash
# A1: v3 Tailwind syntax updated
grep -n "@tailwind base\|@tailwind components\|@tailwind utilities" docs/adapters/react-native-reusables.md
# Expected: 0 main occurrences (or only inside a "v2/v3 compatibility" note block)

# A1: v4 syntax present
grep -n "@import.*tailwindcss" docs/adapters/react-native-reusables.md
# Expected: at least 1 match

# A5: CSS variables block still present
grep -n "background: 0 0% 100%\|--background" docs/adapters/react-native-reusables.md
# Expected: at least 1 match

# B2: Panda CSS mentioned in chakra-ui.md
grep -n "Panda CSS\|panda" docs/design-systems/chakra-ui.md
# Expected: at least 1 match

# B3: createSystem mentioned
grep -n "createSystem" docs/design-systems/chakra-ui.md
# Expected: at least 1 match

# B5: Dialog (not Modal) in component table
grep -n "Dialog\|Modal" docs/design-systems/chakra-ui.md
# Expected: Dialog present; Modal should reference the rename

# C1: Scope check
git diff --name-only
# Expected: docs/adapters/react-native-reusables.md, docs/design-systems/chakra-ui.md
```

---

## Regression Checks

- [ ] react-native-reusables.md GitHub URL is still `roninoss` (PP-003 fix preserved)
- [ ] react-native-reusables.md PortalHost setup step is still present
- [ ] react-native-reusables.md hello-world component example is still present
- [ ] chakra-ui.md Review Checklist is present (with updated v3 checks)
- [ ] chakra-ui.md Source URLs section is present

---

## Evidence to Collect

1. `grep -n "@tailwind base" docs/adapters/react-native-reusables.md` → expected 0 main occurrences
2. `grep -n "@import.*tailwindcss" docs/adapters/react-native-reusables.md` → expected ≥1 match
3. `grep -n "createSystem\|Panda CSS\|oklch" docs/design-systems/chakra-ui.md` → expected ≥2 matches
4. `git diff --name-only` output
5. Updated component table from chakra-ui.md (showing Dialog entry)

---

## Pass/Fail Criteria

**PASS** if:
- A1-A5: Tailwind v4 syntax used in react-native-reusables.md with backward-compat note
- B1-B7: chakra-ui.md accurately reflects v3 API (Panda CSS, createSystem, Dialog, oklch)
- C1-C4: Only expected files in git diff
- D1-D4: No regressions

**FAIL** if:
- `@tailwind base` still appears as primary guidance in react-native-reusables.md
- chakra-ui.md still describes Emotion/styled-components as v3's CSS engine
- `createSystem()` not mentioned in chakra-ui.md
- `Modal` not updated to reference `Dialog` rename
- Any inaccurate technical claims about NativeWind 4 / Tailwind v4 / Chakra v3 API
- Any unexpected files in git diff

---

## Rollback Trigger

If FAIL:
```bash
git checkout docs/adapters/react-native-reusables.md docs/design-systems/chakra-ui.md
```

---

## REMINDER: You Are Adversarial QA

**FIND PROBLEMS. Do not rubber-stamp.**

This slice has the highest domain-accuracy risk of all 6 slices. The adversarial question is not just "did Dev change it" but "did Dev change it CORRECTLY."

Key adversarial checks:
1. Is `@import "tailwindcss"` the correct v4 import? (Yes — this is the Tailwind v4 way)
2. Is NativeWind 4.x actually using Tailwind v4? (NativeWind 4.x supports Tailwind v4 via the new CSS-first approach)
3. Does `createSystem` come from `@chakra-ui/react`? (Yes, correct)
4. Is `@chakra-ui/icons` truly removed in v3? (It was deprecated; the icons were moved to Lucide / project-generated snippets)
5. Did Dev handle the `HStack`/`VStack` situation accurately? (They still exist but are thin wrappers — not "removed")

---

--- END SLICE: PP-005-QA ---
