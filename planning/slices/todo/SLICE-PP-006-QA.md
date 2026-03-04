# SLICE-PP-006-QA: Verify Missing Adapter Stubs and INTEGRATE Phase Expansion

---

## ADVERSARIAL QA INSTRUCTIONS

**Your role is to FIND PROBLEMS, not rubber-stamp work.**

This slice creates 6 new files and modifies 1. Adversarial focus:
- Are the adapter stubs actually useful, or are they placeholders?
- Is the INTEGRATE phase expansion accurate for each framework?
- Did Dev miss any of the 6 adapters?
- Is the format consistent with existing adapter docs?

**If in doubt, mark as FAIL and require fixes.**

---

## Metadata

SLICE-ID: PP-006
ROLE: QA
STATUS: BLOCKED (waiting for Dev)
PRIORITY: MEDIUM
EFFORT: M
TYPE: verification
EVIDENCE_TIER: T3
PARENT_SLICE: PP-006
DEPENDS_ON: PP-006-DEV
CONTEXT_SCOPE: FRESH
TASK_LIST_ID: PP-006-QA

---

## Scope

Verify that:
1. All 6 adapter stubs exist and are substantive (not placeholders)
2. Each stub follows the established adapter format
3. Phase 7 INTEGRATE in build.md has meaningful framework-specific guidance
4. No existing files were unexpectedly modified

---

## Verification Checklist

### A. Adapter Stubs — Existence

- [ ] **A1.** `docs/adapters/tamagui.md` exists
- [ ] **A2.** `docs/adapters/gluestack.md` exists
- [ ] **A3.** `docs/adapters/mantine.md` exists
- [ ] **A4.** `docs/adapters/headless-ui.md` exists
- [ ] **A5.** `docs/adapters/daisyui.md` exists
- [ ] **A6.** `docs/adapters/radix.md` exists

### B. Adapter Stubs — Format Compliance

For EACH of the 6 adapter files, verify it contains:

- [ ] **B1.** A `# [Library Name]` h1 header
- [ ] **B2.** A `## Platforms` section with listed platform targets
- [ ] **B3.** A `## Category` section
- [ ] **B4.** A `## Scaffold` section with installation commands
- [ ] **B5.** A `## Verify` checklist
- [ ] **B6.** A `## Source URLs` section with actual URLs (not placeholder text)

**Adversarial probe — Is it a placeholder?**
Read each file. Look for "TODO", "TBD", "PLACEHOLDER", "[FILL THIS IN]" or similar. If any file is a stub without real content, FAIL that file.

### C. Adapter Stubs — Content Accuracy

For each adapter:

- [ ] **C1.** tamagui.md: Scaffold shows `@tamagui/core` package; `TamaguiProvider` is mentioned; Source URL is `https://tamagui.dev`
- [ ] **C2.** gluestack.md: Scaffold shows `npx gluestack-ui init` or equivalent; `GluestackUIProvider` is mentioned; Source URL is `https://gluestack.io`
- [ ] **C3.** mantine.md: Scaffold shows `@mantine/core`; `MantineProvider` is mentioned; CSS import (`@mantine/core/styles.css`) is documented; Source URL is `https://mantine.dev`
- [ ] **C4.** headless-ui.md: Scaffold shows `@headlessui/react`; notes that components are unstyled; lists specific component names (Dialog, Popover, etc.); Source URL is `https://headlessui.com`
- [ ] **C5.** daisyui.md: Scaffold shows DaisyUI as a Tailwind plugin; uses CSS class-based approach (not React components); `data-theme` is mentioned; Source URL is `https://daisyui.com`
- [ ] **C6.** radix.md: Scaffold shows per-package installation; notes no provider needed; lists components with their import pattern; Source URL is `https://www.radix-ui.com`

### D. Phase 7 INTEGRATE Expansion

- [ ] **D1.** Read `commands/build.md` Phase 7 INTEGRATE section fully
- [ ] **D2.** React Navigation example is present for mobile projects (imports `@react-navigation/native`)
- [ ] **D3.** Next.js App Router navigation pattern is present for web projects
- [ ] **D4.** React Router example is present for React/Vite projects
- [ ] **D5.** State management section is present (even if brief — React Context or similar)
- [ ] **D6.** Data fetching with loading/error/empty state handling is present
- [ ] **D7.** Phase 7 exit gate has specific verification checks (not just "the app works")

**Adversarial probe — Specificity:**
Is the Phase 7 content at the same level of detail as Phase 5 (ATOMS)? Phase 5 has full argTypes examples, compilation verification, file path verification. Phase 7 should have equivalently specific integration checks. If Phase 7 is still vague ("configure your router"), FAIL.

### E. Scope Containment

- [ ] **E1.** `git diff --name-only` shows only `commands/build.md` as modified
- [ ] **E2.** 6 new files in `docs/adapters/` (new files don't appear in `git diff`, check `git status`)
- [ ] **E3.** `docs/adapters/react-native-paper.md`, `docs/adapters/react-native-reusables.md`, `docs/adapters/shadcn.md`, `docs/adapters/tailwind.md` are UNCHANGED
- [ ] **E4.** No command files other than build.md were modified

### F. No Regression in build.md

- [ ] **F1.** Phase 5 ATOMS section is unchanged
- [ ] **F2.** Phase 6 COMPOSE section is unchanged
- [ ] **F3.** The "Gate Check" at the top of build.md is unchanged
- [ ] **F4.** Phase 7 "What Gets Wired" original 4 bullet points are still present (or replaced by a more detailed equivalent — not missing)

---

## Test Commands

```bash
# A: All 6 stubs exist
ls docs/adapters/{tamagui,gluestack,mantine,headless-ui,daisyui,radix}.md
# Expected: all 6 files listed

# B/C: Stubs are substantive (check line counts)
wc -l docs/adapters/tamagui.md docs/adapters/gluestack.md docs/adapters/mantine.md \
       docs/adapters/headless-ui.md docs/adapters/daisyui.md docs/adapters/radix.md
# Expected: each ≥40 lines

# B6: Source URLs present in all stubs
for f in docs/adapters/tamagui.md docs/adapters/gluestack.md docs/adapters/mantine.md \
         docs/adapters/headless-ui.md docs/adapters/daisyui.md docs/adapters/radix.md; do
  grep -c "Source URLs\|https://" "$f" | xargs echo "$f:"
done
# Expected: each file has ≥1 match for Source URLs section and https:// links

# D2: React Navigation in build.md
grep -n "NavigationContainer\|react-navigation" commands/build.md
# Expected: at least 1 match

# D3: Next.js App Router pattern
grep -n "App Router\|app/.*page.tsx" commands/build.md
# Expected: at least 1 match

# E1: Scope check
git diff --name-only
# Expected: commands/build.md

# E2: New files count
git status --short docs/adapters/
# Expected: 6 new ?? files (untracked or staged new files)

# E3: Existing adapter files unchanged
git diff docs/adapters/react-native-paper.md docs/adapters/shadcn.md docs/adapters/tailwind.md
# Expected: empty (no changes)
```

---

## Regression Checks

- [ ] build.md Phase 5 ATOMS still has the argTypes example
- [ ] build.md Phase 5 ATOMS still has the "progress tracking" section
- [ ] build.md Phase 6 COMPOSE still has the viewport configuration section
- [ ] build.md overall structure (Phase 5 → 6 → 7 ordering) is intact

---

## Evidence to Collect

1. `ls docs/adapters/` output (showing all adapter files)
2. `wc -l docs/adapters/{tamagui,gluestack,mantine,headless-ui,daisyui,radix}.md` output
3. `git diff --name-only` output
4. `grep -n "NavigationContainer\|App Router\|createBrowserRouter" commands/build.md` output
5. First 15 lines of each new adapter stub (showing format compliance)

---

## Pass/Fail Criteria

**PASS** if:
- A1-A6: All 6 adapter stubs exist
- B1-B6: All stubs have required sections
- C1-C6: All stubs have accurate, substantive content
- D1-D7: Phase 7 expanded with framework-specific examples
- E1-E4: Scope contained to expected files
- F1-F4: No regressions in build.md

**FAIL** if:
- Any of the 6 adapter stubs is missing
- Any stub is a placeholder (TODO/TBD content)
- Phase 7 expansion is still vague without framework-specific examples
- Any existing adapter file was modified
- Any unexpected files in git diff

---

## Rollback Trigger

If FAIL:
```bash
git checkout commands/build.md
rm -f docs/adapters/{tamagui,gluestack,mantine,headless-ui,daisyui,radix}.md
```

---

## REMINDER: You Are Adversarial QA

**FIND PROBLEMS. Do not rubber-stamp.**

Key adversarial checks:
1. Read tamagui.md fully — is the scaffold content actually correct for Tamagui? Or did Dev just write generic placeholder text about "install the library and wrap with provider"?
2. Is the DaisyUI adapter technically accurate? (DaisyUI is CSS classes, not React components — this is a common misunderstanding)
3. Does the Radix adapter correctly note that each Radix component is a separate package (`@radix-ui/react-dialog`, etc.)?
4. Phase 7: Are the React Navigation imports correct (`@react-navigation/native` + `@react-navigation/native-stack`)? This is a common source of errors.
5. Does Phase 7 cover BOTH mobile and web navigation patterns? Or only one?

---

--- END SLICE: PP-006-QA ---
