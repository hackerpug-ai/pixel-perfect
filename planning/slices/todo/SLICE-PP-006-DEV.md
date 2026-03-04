# SLICE-PP-006-DEV: Add Adapter Stubs and Remove Phase 7 INTEGRATE

---

## Metadata

SLICE-ID: PP-006
ROLE: Dev
STATUS: READY (execute after PP-001 merges)
PRIORITY: MEDIUM
EFFORT: M
TYPE: enhancement + removal
EVIDENCE_TIER: T3
PARENT_SLICE: PP-006
CONTEXT_SCOPE: SLICE
TASK_LIST_ID: PP-006-DEV

---

## Context Scope (HIERARCHICAL CONTEXT POLICY)

**Your context scope: SLICE**

### You Receive:
- This slice definition (full document)
- Current content of build.md and docs/adapters/

### You Do NOT Receive:
- Other slice details (scope creep prevention)
- Prior QA feedback
- Conversation history from prior sessions

---

## Dev Environment

**Model:** Claude Sonnet 4.6
**Environment:** Claude Code CLI
**MCP Servers Available:** None required
**Major Tools Available:** Read, Write, Edit, Glob

---

## Scope

**Finding #9 — Missing adapter docs for libraries listed in init.md:**
`commands/init.md` offers these component library options to users: React Native Reusables, React Native Paper, Tamagui, Gluestack (mobile); shadcn/ui, Radix, Mantine, Chakra, Headless UI, DaisyUI (web). Existing adapters: `react-native-reusables.md`, `react-native-paper.md`, `shadcn.md`. Missing adapters: Tamagui, Gluestack, Mantine, Headless UI, DaisyUI, Radix. Users selecting these libraries get only the generic adapter, with no tool-specific guidance.

**Fix:** Create focused adapter stubs for 6 missing libraries.

**Confirmed architectural decision — Phase 7 INTEGRATE is out of scope:**
The pixel-perfect plugin's purpose is to build UI components and screens in a Storybook sandbox. Navigation, state management, and data fetching are explicitly outside this scope. UI components expose props; backend/data/business logic consuming those props is a separate concern. Phase 7 INTEGRATE is removed entirely — not reduced, not marked optional. Clean break.

**Fix:** Remove the entire Phase 7 INTEGRATE section from `commands/build.md`. Update all references to the phase count and gate sequence.

---

## WRITE-ALLOWED

- `docs/adapters/tamagui.md` — CREATE new adapter stub
- `docs/adapters/gluestack.md` — CREATE new adapter stub
- `docs/adapters/mantine.md` — CREATE new adapter stub
- `docs/adapters/headless-ui.md` — CREATE new adapter stub
- `docs/adapters/daisyui.md` — CREATE new adapter stub
- `docs/adapters/radix.md` — CREATE new adapter stub
- `commands/build.md` — Remove Phase 7 INTEGRATE section; update Overview; update Completion block; update manifest gate examples

---

## WRITE-PROHIBITED

- `commands/init.md` — Do NOT modify (owned by PP-001, PP-002)
- `commands/status.md` — Do NOT modify (INTEGRATE already removed by PP-001)
- `skills/process-context/SKILL.md` — Do NOT modify (INTEGRATE already removed by PP-001)
- `docs/adapters/react-native-reusables.md` — Do NOT modify (owned by PP-003, PP-005)
- `docs/adapters/react-native-paper.md` — Do NOT modify
- `docs/adapters/shadcn.md` — Do NOT modify
- `docs/adapters/tailwind.md` — Do NOT modify

---

## Prerequisite: PP-001 Must Have Merged

Before executing this slice, confirm PP-001 has merged into the branch. PP-001 also modifies build.md (adding Phase 5b). This slice removes Phase 7 from the end of build.md. These are non-overlapping sections, but you must operate on the post-PP-001 version to avoid conflicts.

**Verify PP-001 is merged:**
```bash
grep -n "Phase 5b" commands/build.md
# Expected: ≥1 match — if missing, PP-001 has not merged yet. STOP and wait.
```

---

## Implementation Steps

### Step 1: Read Reference Adapters

Before writing any adapter stub, read these two reference files completely to internalize the format:
- `docs/adapters/react-native-paper.md`
- `docs/adapters/shadcn.md`

The format consists of: h1 title, Platforms section, Category section, Scaffold section (with install commands), Theme integration, Key components list, Verify checklist, Source URLs.

---

### Step 2: Create 6 Adapter Stubs

Each stub must be ≥40 lines and follow the established format. No placeholders, no TODOs. Real content only.

#### `docs/adapters/tamagui.md`
- Platforms: mobile-ios, mobile-android, web-desktop, web-mobile
- Category: Components + Style (combined system)
- Scaffold: `npm install @tamagui/core tamagui` + generate `tamagui.config.ts`
- Theme integration: `createTamagui()` config, `TamaguiProvider` wrapper in Storybook decorator
- Key components: `Button`, `Text`, `Stack`, `XStack`, `YStack`, `Sheet`, `Dialog`, `Input`
- Verify checklist: Components use Tamagui tokens (not hardcoded values); `TamaguiProvider` present in story decorator; tokens resolve at build time
- Source URLs: https://tamagui.dev, https://tamagui.dev/docs/core/installation

#### `docs/adapters/gluestack.md`
- Platforms: mobile-ios, mobile-android, web-desktop, web-mobile
- Category: Components
- Scaffold: `npx gluestack-ui@latest init` (interactive CLI handles setup)
- Theme integration: `GluestackUIProvider` with config object; wrap Storybook preview with provider
- Key components: `Button`, `Text`, `Box`, `VStack`, `HStack`, `Input`, `Select`, `Modal`, `Badge`, `Pressable`
- Verify checklist: GluestackUIProvider wraps story decorator; theme tokens resolve; components render in both native and web Storybook
- Source URLs: https://gluestack.io, https://gluestack.io/ui/docs/home/overview

#### `docs/adapters/mantine.md`
- Platforms: web-desktop, web-mobile
- Category: Components
- Scaffold: `npm install @mantine/core @mantine/hooks`; CSS import required: `import '@mantine/core/styles.css'` in Storybook preview
- Theme integration: `MantineProvider` wrapper with `createTheme()` config; CSS import is mandatory — missing it causes unstyled components
- Key components: `Button`, `TextInput`, `Select`, `Modal`, `Drawer`, `Card`, `Stack`, `Group`, `Badge`, `Tabs`
- Verify checklist: `@mantine/core/styles.css` imported in `.storybook/preview.tsx`; `MantineProvider` wraps story decorator; Mantine CSS vars resolve to theme values
- Source URLs: https://mantine.dev, https://mantine.dev/getting-started/

#### `docs/adapters/headless-ui.md`
- Platforms: web-desktop, web-mobile
- Category: Components (unstyled — requires separate style system)
- Scaffold: `npm install @headlessui/react`; requires Tailwind CSS (see tailwind.md adapter); no provider needed
- Theme integration: None — components are intentionally unstyled. All visual styling applied via Tailwind utility classes per project vibe. AI must supply all visual styling.
- Key components: `Dialog`, `Disclosure`, `Listbox`, `Menu`, `Popover`, `RadioGroup`, `Switch`, `Tab`, `Transition`, `Combobox`
- Note: Components handle accessibility and behavior only (keyboard nav, focus management, ARIA). Visual design is 100% Tailwind classes.
- Verify checklist: Components render without default browser styling; all visual styling from Tailwind classes; keyboard navigation works; focus is managed correctly
- Source URLs: https://headlessui.com, https://headlessui.com/react/dialog

#### `docs/adapters/daisyui.md`
- Platforms: web-desktop, web-mobile
- Category: Components (CSS class-based — not React components)
- Scaffold: `npm install -D daisyui@latest`; add to `tailwind.config.js` plugins array: `require('daisyui')`
- Theme integration: DaisyUI theme system via `data-theme` attribute on `<html>` or root element; theme list configured in `tailwind.config.js` under `daisyui.themes`
- Key "components": DaisyUI uses CSS class names applied to HTML elements, not React component imports. Examples: `btn`, `btn-primary`, `card`, `badge`, `input`, `select`, `modal`, `drawer`, `navbar`, `tabs`
- Scaffold approach: Generate thin React wrapper components that apply DaisyUI class names, giving them a React API. E.g., `<Button variant="primary">` renders `<button className="btn btn-primary">`.
- Verify checklist: DaisyUI classes resolve to correct styles (not unstyled); `data-theme` attribute switches theme correctly; generated React wrappers expose variant props as argTypes
- Source URLs: https://daisyui.com, https://daisyui.com/docs/install/

#### `docs/adapters/radix.md`
- Platforms: web-desktop, web-mobile
- Category: Components (unstyled accessible primitives)
- Scaffold: Per-component package installation — `npm install @radix-ui/react-dialog`, `npm install @radix-ui/react-dropdown-menu`, etc. No monolithic install, no provider needed.
- Theme integration: No built-in theme. Style entirely with the project's existing style system (CSS Modules, Tailwind, or CSS-in-JS). Project theme tokens apply directly via className or style props.
- Key components: `Dialog`, `DropdownMenu`, `Select`, `Popover`, `Tooltip`, `Switch`, `Checkbox`, `Slider`, `Tabs`, `Accordion`, `HoverCard`
- Import pattern: `import * as Dialog from '@radix-ui/react-dialog'` — namespace import required
- Verify checklist: Components are accessible (keyboard nav, focus trap, ARIA attributes); all visual styling from project style system (no Radix default styles leaking); TypeScript types satisfied
- Source URLs: https://www.radix-ui.com, https://www.radix-ui.com/primitives/docs/overview/introduction

---

### Step 3: Remove Phase 7 INTEGRATE from `commands/build.md`

Read `commands/build.md` in full first. Then make the following edits:

#### 3a. Remove the Phase 7 section entirely

Delete from the `## Phase 7: INTEGRATE` header through the Phase 7 Exit Gate closing block (everything in that section including "What Gets Wired", "Integration Steps", "Phase 7 Exit Gate"). This is a clean removal — no replacement text, no stub, no "out of scope" placeholder.

#### 3b. Update the Overview block

The Overview block references Phase 7. Update it (PP-001 already removed Phase 7 from this block, but verify it is gone):

```
Phase 5: ATOMS      → Individual components (Button, Card, Badge, etc.)
Phase 5b: MOLECULES → Functional compositions of 2-3 atoms (SearchBar, UserCard, FormField)
Phase 6: COMPOSE    → Screen layouts composing molecules and atoms (Dashboard, Settings, etc.)
```

If Phase 7 still appears in the Overview after PP-001's merge, remove it now.

#### 3c. Update the Completion block

The Completion message at the bottom of build.md may reference "Integration: complete". Remove that line:

OLD (if present after PP-001):
```
  - Functional molecule compositions sandboxed in Storybook
  - 2 composed screens at target viewport
  - Navigation and data flow wired
```

NEW:
```
  - Functional molecule compositions sandboxed in Storybook
  - 2 composed screens at target viewport
```

Remove the "Navigation and data flow wired" line or any integration-related completion note.

#### 3d. Update the --phase option docs

`commands/build.md` has an Options section showing `--phase <name>` with valid values `atoms, compose, integrate`. Update to remove `integrate`:

OLD:
```
- `--phase <name>`: Start from a specific phase (atoms, compose, integrate). Default: resume from current phase.
```

NEW:
```
- `--phase <name>`: Start from a specific phase (atoms, molecules, compose). Default: resume from current phase.
```

---

### Step 4: Verify

```bash
# Step 4a: All 6 adapter stubs exist
ls docs/adapters/{tamagui,gluestack,mantine,headless-ui,daisyui,radix}.md
# Expected: all 6 files listed without error

# Step 4b: Stubs are substantive (not placeholders)
wc -l docs/adapters/tamagui.md docs/adapters/gluestack.md docs/adapters/mantine.md \
       docs/adapters/headless-ui.md docs/adapters/daisyui.md docs/adapters/radix.md
# Expected: each ≥40 lines

# Step 4c: No TODOs or placeholders in stubs
grep -ri "TODO\|TBD\|PLACEHOLDER\|\[FILL" docs/adapters/tamagui.md \
     docs/adapters/gluestack.md docs/adapters/mantine.md docs/adapters/headless-ui.md \
     docs/adapters/daisyui.md docs/adapters/radix.md
# Expected: 0 matches

# Step 4d: Phase 7 INTEGRATE removed from build.md
grep -n "Phase 7\|INTEGRATE" commands/build.md
# Expected: 0 matches

# Step 4e: Phase 5b still present (PP-001's work preserved)
grep -n "Phase 5b" commands/build.md
# Expected: ≥1 match (PP-001's addition must be intact)

# Step 4f: Scope check
git diff --name-only
# Expected: commands/build.md only (the 6 adapter stubs show as untracked new files)
git status --short docs/adapters/
# Expected: 6 ?? (untracked) new adapter files
```

---

## Acceptance Criteria

1. **6 adapter stubs created:** tamagui.md, gluestack.md, mantine.md, headless-ui.md, daisyui.md, radix.md
2. **Each stub ≥40 lines** with: h1 title, Platforms section, Category section, Scaffold section (with real install commands), Theme integration details, Key components list, Verify checklist, Source URLs
3. **No stub contains placeholder text** — no "TODO", "TBD", "[FILL THIS IN]"
4. **Phase 7 INTEGRATE is completely absent from `commands/build.md`** — `grep -c "Phase 7\|INTEGRATE" commands/build.md` returns 0
5. **Phase 5b MOLECULES is intact** — PP-001's additions to build.md are not accidentally removed
6. **build.md `--phase` option docs updated** — `integrate` removed, `molecules` added to valid values
7. **No existing adapter files modified** — react-native-paper.md, shadcn.md, tailwind.md, react-native-reusables.md are unchanged
8. **No other command files modified** — only build.md in the commands/ directory

---

## Quality Gates

```bash
# QG1: All 6 stubs exist
ls docs/adapters/tamagui.md docs/adapters/gluestack.md docs/adapters/mantine.md \
   docs/adapters/headless-ui.md docs/adapters/daisyui.md docs/adapters/radix.md
# Expected: exit code 0

# QG2: No placeholders
grep -ric "TODO\|TBD\|PLACEHOLDER" docs/adapters/tamagui.md docs/adapters/gluestack.md \
     docs/adapters/mantine.md docs/adapters/headless-ui.md docs/adapters/daisyui.md \
     docs/adapters/radix.md | grep -v ":0"
# Expected: no output (all files return 0)

# QG3: Phase 7 completely gone from build.md
grep -c "Phase 7\|INTEGRATE\|integrate" commands/build.md
# Expected: 0

# QG4: Phase 5b still intact
grep -c "Phase 5b" commands/build.md
# Expected: ≥1

# QG5: Existing adapters untouched
git diff docs/adapters/react-native-paper.md docs/adapters/shadcn.md docs/adapters/tailwind.md
# Expected: empty

# QG6: Scope check
git diff --name-only
# Expected: commands/build.md only
```

---

## Deliverables

1. 6 new adapter stub files in `docs/adapters/`
2. Edited `commands/build.md` with Phase 7 removed
3. Evidence saved to `.tmp/evidence/PP-006/`:
   - `before-build-linecount.txt`: `wc -l commands/build.md` before edit
   - `after-build-linecount.txt`: `wc -l commands/build.md` after edit
   - `adapter-list.txt`: `ls -la docs/adapters/` after creation
   - `adapter-linecounts.txt`: `wc -l docs/adapters/{tamagui,gluestack,mantine,headless-ui,daisyui,radix}.md`
   - `integrate-grep.txt`: `grep -n "Phase 7\|INTEGRATE" commands/build.md` → must be empty

---

--- END SLICE: PP-006-DEV ---
