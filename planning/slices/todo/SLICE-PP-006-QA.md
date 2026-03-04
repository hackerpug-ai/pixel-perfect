# SLICE-PP-006-QA: Verify Adapter Stubs and INTEGRATE Phase Removal

---

## ADVERSARIAL QA INSTRUCTIONS

**Your role is to FIND PROBLEMS, not rubber-stamp work.**

This slice creates 6 new files and destructively removes a section from build.md.
Adversarial focus:
- Are the adapter stubs actually useful, or are they placeholders?
- Was Phase 7 INTEGRATE completely removed — not just commented out or shrunk?
- Did Dev accidentally remove Phase 5b MOLECULES (PP-001's work) while editing build.md?
- Is the format consistent with existing adapter docs?

**If in doubt, mark as FAIL and require fixes.**

---

## Metadata

SLICE-ID: PP-006
ROLE: QA
STATUS: BLOCKED (waiting for Dev)
PRIORITY: MEDIUM
EFFORT: S
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
3. Phase 7 INTEGRATE is completely absent from build.md
4. Phase 5b MOLECULES (from PP-001) is still intact in build.md
5. No existing files were unexpectedly modified

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
- [ ] **B2.** A `## Platforms` section listing target platforms
- [ ] **B3.** A `## Category` section
- [ ] **B4.** A `## Scaffold` section with real installation commands (not "install the package")
- [ ] **B5.** A `## Verify` or verification checklist section
- [ ] **B6.** A `## Source URLs` section with actual https:// links

**Adversarial probe — Placeholders?**
Read each file. Look for "TODO", "TBD", "PLACEHOLDER", "[FILL THIS IN]", "add content here". Any match → FAIL that file.

### C. Adapter Stubs — Content Accuracy

For each adapter, verify the technically specific details are correct:

- [ ] **C1.** tamagui.md: Mentions `@tamagui/core`; mentions `TamaguiProvider`; mentions `createTamagui()`; Source URL is `https://tamagui.dev`
- [ ] **C2.** gluestack.md: Mentions `npx gluestack-ui` init command (or equivalent); mentions `GluestackUIProvider`; Source URL is `https://gluestack.io`
- [ ] **C3.** mantine.md: Mentions `@mantine/core`; mentions `MantineProvider`; **critically: mentions the required CSS import** `@mantine/core/styles.css` (missing this is a common cause of unstyled Mantine components); Source URL is `https://mantine.dev`
- [ ] **C4.** headless-ui.md: Mentions `@headlessui/react`; **explicitly states components are unstyled**; lists specific component names (Dialog, Popover, Menu, etc.); notes Tailwind is required for styling; Source URL is `https://headlessui.com`
- [ ] **C5.** daisyui.md: Mentions DaisyUI is a Tailwind plugin (not React components); mentions `data-theme` attribute; describes CSS class-based approach (e.g., `btn`, `card`, `badge`); mentions wrapping classes in React components for API; Source URL is `https://daisyui.com`
- [ ] **C6.** radix.md: **Correctly shows per-component package installation** (not a monolithic `@radix-ui` install); shows namespace import pattern `import * as Dialog from '@radix-ui/react-dialog'`; notes no provider needed; Source URL is `https://www.radix-ui.com`

### D. build.md — Phase 7 INTEGRATE Removal

- [ ] **D1.** Run `grep -n "Phase 7" commands/build.md` → expected: **0 matches**
- [ ] **D2.** Run `grep -n "INTEGRATE" commands/build.md` → expected: **0 matches**
- [ ] **D3.** Run `grep -n "integrate" commands/build.md` → expected: **0 matches** (including lowercase)
- [ ] **D4.** Read `commands/build.md` fully. The file should end at or after the Phase 6 (COMPOSE) exit gate and Completion block — there should be no Phase 7 content whatsoever.
- [ ] **D5.** Confirm the `--phase` option documentation lists only `atoms, molecules, compose` — not `integrate`

**Adversarial probe — Was Phase 7 just commented out or reduced to a stub?**
Search for any remnant: `<!-- Phase 7`, `~~Phase 7~~`, `[REMOVED]`, `## ~~INTEGRATE~~`. Any form of preserved but hidden content is a FAIL. Complete removal required.

### E. build.md — Phase 5b MOLECULES Preserved (Regression Check)

This is the most important regression check. PP-006-DEV edited build.md. PP-001-DEV previously added Phase 5b. PP-006 must not have accidentally removed PP-001's work.

- [ ] **E1.** Run `grep -n "Phase 5b" commands/build.md` → expected: **≥1 match**
- [ ] **E2.** Run `grep -n "Molecules/" commands/build.md` → expected: **≥2 matches**
- [ ] **E3.** Read the section of build.md between Phase 5 exit gate and Phase 6 header. Confirm Phase 5b MOLECULES section is complete (has identify step, build step, story example with `Molecules/` prefix, exit gate).

### F. Scope Containment

- [ ] **F1.** Run `git diff --name-only` → expected: `commands/build.md` only
- [ ] **F2.** Run `git status --short docs/adapters/` → expected: 6 new `??` files (untracked)
- [ ] **F3.** Run `git diff docs/adapters/react-native-paper.md docs/adapters/shadcn.md docs/adapters/tailwind.md docs/adapters/react-native-reusables.md` → expected: empty
- [ ] **F4.** Confirm `commands/status.md` is unchanged (INTEGRATE already removed by PP-001)
- [ ] **F5.** Confirm `skills/process-context/SKILL.md` is unchanged (INTEGRATE already removed by PP-001)

---

## Test Commands

```bash
# A: All 6 stubs exist
ls docs/adapters/{tamagui,gluestack,mantine,headless-ui,daisyui,radix}.md
# Expected: all 6 listed, exit code 0

# B: Stubs are substantive
wc -l docs/adapters/tamagui.md docs/adapters/gluestack.md docs/adapters/mantine.md \
       docs/adapters/headless-ui.md docs/adapters/daisyui.md docs/adapters/radix.md
# Expected: each ≥40 lines

# B: No placeholders
grep -ri "TODO\|TBD\|PLACEHOLDER" docs/adapters/tamagui.md docs/adapters/gluestack.md \
     docs/adapters/mantine.md docs/adapters/headless-ui.md docs/adapters/daisyui.md \
     docs/adapters/radix.md
# Expected: 0 matches

# C3: Mantine CSS import documented (critical detail)
grep -i "styles.css\|@mantine/core/styles" docs/adapters/mantine.md
# Expected: ≥1 match

# C6: Radix per-package install pattern
grep -n "@radix-ui/react-" docs/adapters/radix.md
# Expected: ≥2 matches (showing individual packages)

# D1-D3: Phase 7 completely gone
grep -cin "phase 7\|INTEGRATE\|integrate" commands/build.md
# Expected: 0

# E1: Phase 5b preserved
grep -n "Phase 5b" commands/build.md
# Expected: ≥1 match

# E2: Molecules/ prefix preserved
grep -n "Molecules/" commands/build.md
# Expected: ≥2 matches

# F1: Scope check
git diff --name-only
# Expected: commands/build.md only

# F3: Existing adapters untouched
git diff docs/adapters/react-native-paper.md docs/adapters/shadcn.md
# Expected: empty
```

---

## Regression Checks

- [ ] build.md Phase 5 ATOMS section is unchanged (read it fully — Dev should not have touched it)
- [ ] build.md Phase 5b MOLECULES section is complete (from PP-001)
- [ ] build.md Phase 6 COMPOSE section is unchanged
- [ ] build.md Overview block correctly shows 3 phases (5 ATOMS, 5b MOLECULES, 6 COMPOSE) — no Phase 7

---

## Evidence to Collect

1. `ls docs/adapters/` output (showing all adapter files including the 6 new ones)
2. `wc -l docs/adapters/{tamagui,gluestack,mantine,headless-ui,daisyui,radix}.md` output
3. `grep -cin "phase 7\|INTEGRATE\|integrate" commands/build.md` → must be 0
4. `grep -n "Phase 5b\|Molecules/" commands/build.md` → must show ≥3 total matches
5. `git diff --name-only` output
6. First 15 lines of each new adapter stub (format verification)

---

## Pass/Fail Criteria

**PASS** if:
- A1-A6: All 6 adapter stubs exist
- B1-B6: All stubs have required sections (no placeholders)
- C1-C6: All stubs have accurate, technically specific content
- D1-D5: Phase 7 INTEGRATE is completely absent from build.md
- E1-E3: Phase 5b MOLECULES from PP-001 is fully intact
- F1-F5: Scope contained to expected files

**FAIL** if:
- Any of the 6 adapter stubs is missing
- Any stub contains TODO/TBD/placeholder content
- "Phase 7" or "INTEGRATE" or "integrate" appears anywhere in build.md
- Phase 5b MOLECULES section is missing or damaged in build.md
- Any unexpected files in git diff
- Mantine stub omits the `@mantine/core/styles.css` CSS import requirement
- Radix stub shows monolithic install instead of per-component packages

---

## Rollback Trigger

If FAIL:
```bash
# Restore build.md to PP-001's post-merge state
git checkout commands/build.md

# Remove the 6 new adapter stubs
rm -f docs/adapters/{tamagui,gluestack,mantine,headless-ui,daisyui,radix}.md
```

---

## REMINDER: You Are Adversarial QA

**FIND PROBLEMS. Do not rubber-stamp.**

Key adversarial checks:
1. **Was Phase 7 fully removed or just reduced?** Read from the Phase 6 exit gate to end of file. Any Phase 7 remnant = FAIL.
2. **Did removing Phase 7 accidentally delete the Completion block?** The Completion block (showing build totals) should still exist.
3. **Is the DaisyUI adapter technically accurate?** DaisyUI uses CSS classes, NOT React components. If Dev wrote it as if you import `<Button>` from DaisyUI, that's wrong.
4. **Is the Radix adapter correct about per-package installs?** `npm install @radix-ui/react-dialog` — not a single `npm install @radix-ui`. If Dev shows a single package install, that's inaccurate.
5. **Did Dev accidentally delete Phase 5b while removing Phase 7?** Both PP-001 and PP-006 edited build.md. PP-006's job was to remove the END of the file (Phase 7). If Phase 5b (in the middle) is missing, Dev made a mistake.

---

--- END SLICE: PP-006-QA ---
