# SLICE-PP-005-DEV: Update Tailwind v4 Syntax and Fix Chakra v3 API Docs

---

## Metadata

SLICE-ID: PP-005
ROLE: Dev
STATUS: BLOCKED (waiting for PP-003-DEV merge)
PRIORITY: MEDIUM
EFFORT: M
TYPE: bugfix
EVIDENCE_TIER: T3
PARENT_SLICE: PP-005
DEPENDS_ON: PP-003-DEV
CONTEXT_SCOPE: SLICE
TASK_LIST_ID: PP-005-DEV

---

## Context Scope (HIERARCHICAL CONTEXT POLICY)

**Your context scope: SLICE**

### You Receive:
- This slice definition (full document)
- Git diff of PP-003 (prior merge that touched react-native-reusables.md)
- Current content of affected files

### You Do NOT Receive:
- Other slice details
- QA feedback from other slices
- Conversation history from prior sessions

---

## Dev Environment

**Model:** Claude Sonnet 4.6
**Environment:** Claude Code CLI
**MCP Servers Available:** None required
**Major Tools Available:** Read, Edit

---

## Scope

**Finding #7 — Tailwind v3 syntax in react-native-reusables adapter:**
`docs/adapters/react-native-reusables.md` instructs users to create `global.css` with `@tailwind base; @tailwind components; @tailwind utilities;` (Tailwind v3 syntax). NativeWind 4.x uses Tailwind CSS 4, which replaces directives with `@import "tailwindcss"`. The adapter also says "Use the Tailwind v3 version (CSS variables format)" when recommending shadcn/ui themes, which is outdated guidance.

**Finding #8 — Chakra v3 API reflected as v2:**
`docs/design-systems/chakra-ui.md` acknowledges Chakra v3 in its Overview but then describes v2's API throughout: hex colors from v2 palette (`#3182ce`), `HStack`/`VStack` components (deprecated in v3), `Modal (Dialog)` naming, `Spinner` unchanged, v2 CSS variable names in mockup CDN block. Chakra v3 uses oklch colors, a fully redesigned component API built on Panda CSS, and the snippet-based component model.

---

## WRITE-ALLOWED

- `docs/adapters/react-native-reusables.md` — Update Tailwind/NativeWind version guidance
- `docs/design-systems/chakra-ui.md` — Update to Chakra v3 API (Panda CSS, new component patterns)

---

## WRITE-PROHIBITED

- `docs/adapters/react-native-web.md` — Do NOT modify (owned by PP-003)
- Any command files in `commands/`
- `skills/`

---

## Implementation Steps

### Step 1: Update react-native-reusables.md — Tailwind v4 Syntax

Read `docs/adapters/react-native-reusables.md` post-PP-003 merge (GitHub URL already fixed).

**Change 1: global.css scaffold step**

Locate the `global.css` creation step under "Scaffold" (step 4). Currently:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

NativeWind 4.x uses Tailwind v4. Update to show the v4 syntax:

```css
@import "tailwindcss";
```

Keep the CSS variables block (`:root { --background: ... }`) unchanged — this is NativeWind-specific and still valid.

Add a compatibility note immediately after the updated block:

```
> **NativeWind version note:** If you are using NativeWind 2.x (Tailwind v3), use `@tailwind base; @tailwind components; @tailwind utilities;` instead. Check your `nativewind` package version before choosing.
```

**Change 2: shadcn/ui theme import guidance**

Locate the "Using shadcn/ui Themes" section which says:
```
- Use the **Tailwind v3 version** (CSS variables format)
```

Update to:
```
- Use the **CSS variables format** from the shadcn/ui themes page
- For NativeWind 4.x (Tailwind v4), the CSS variables theme format is compatible
- For NativeWind 2.x (Tailwind v3), select the "v3" tab on the themes page
```

### Step 2: Update chakra-ui.md — Chakra v3 API

Read `docs/design-systems/chakra-ui.md` in full.

Chakra UI v3 (released late 2024) is built on Panda CSS and introduces a fundamentally different component model. Key changes to document:

**Overview section:** Already mentions "v3+ built on Panda CSS" but the description of Emotion/styled-components is wrong for v3. Update:

```markdown
## Overview

- **CSS Framework:** Panda CSS (v3+); Emotion/styled-components in v2
- **Component Pattern:** Composable "snippet" components generated into your project; semantic tokens via `createSystem()`
- **Official Icon Library:** `@chakra-ui/icons` removed in v3; use Lucide or other icon libraries
- **Theming Approach:** `createSystem()` config with semantic tokens and CSS variables
```

**Token Conventions section:** The color format changed in v3. Update:

Replace the v2-specific yaml example with a v3 note:
```markdown
## Token Conventions

Chakra v3 uses semantic tokens via `createSystem()`. Colors use oklch format (not hex).

```typescript
import { createSystem, defaultConfig } from '@chakra-ui/react';

export const system = createSystem(defaultConfig, {
  theme: {
    tokens: {
      colors: {
        brand: {
          // oklch format: chakra v3 default palette
          500: { value: 'oklch(0.623 0.214 259.815)' },  // blue equivalent
        },
      },
    },
  },
});
```

For a full default token reference, see: https://chakra-ui.com/docs/get-started/theming
```

**Component Names section:** Update deprecated components:

Key v3 changes:
- `HStack` / `VStack` → Still exist but implemented as `<Stack direction="row">` variants; import from `@chakra-ui/react`
- `Modal` → renamed to `Dialog` in v3
- `Drawer` → `Drawer` (same name but new API using `placement` prop)
- `Spinner` → `Spinner` (still exists)
- `Menu` → `Menu` (renamed internals: `MenuButton` → `Menu.Trigger`, etc.)
- `Popover` → Same name, new composable API

Update the component table to reflect v3 names and note major renames.

**Mockup CDN Links section:** The hex colors shown (`#3182ce`) are v2 values. Update the CSS variables to reflect v3's oklch-based palette approximations, or note that v3 uses CSS variables via the generated snippet system:

```html
<!-- Chakra v3 approximation for mockups -->
<style>
  :root {
    /* Chakra v3 uses oklch; these are sRGB approximations for mockup use */
    --chakra-blue-500: #3b82f6;
    --chakra-gray-100: #f4f4f5;
    --chakra-gray-800: #27272a;
    --chakra-radii-md: 0.375rem;
  }
  body { font-family: Inter, system-ui, sans-serif; color: #18181b; }
</style>
```

**Review Checklist section:** Add v3-specific checks:
- [ ] Component imports from `@chakra-ui/react` (not separate packages)
- [ ] Theme configured via `ChakraProvider` with `createSystem()` value
- [ ] No `@chakra-ui/icons` used (removed in v3)

**Source URLs section:** Update to v3 docs:
```
- Official site: https://chakra-ui.com
- v3 Getting Started: https://chakra-ui.com/docs/get-started/installation
- v3 Theming: https://chakra-ui.com/docs/get-started/theming
- v3 Components: https://chakra-ui.com/docs/components
- Migration from v2: https://chakra-ui.com/docs/get-started/migration
```

### Step 3: Verify

```bash
# Tailwind v3 syntax removed from RNR adapter (the @tailwind directives)
grep -n "@tailwind base\|@tailwind components\|@tailwind utilities" docs/adapters/react-native-reusables.md
# Expected: 0 matches (or only inside a compatibility note block)

# Chakra v3 references updated
grep -n "oklch\|createSystem\|Panda CSS" docs/design-systems/chakra-ui.md
# Expected: ≥2 matches

# Old v2 color #3182ce still appears but with appropriate context
grep -n "#3182ce\|blue.500" docs/design-systems/chakra-ui.md
# Expected: If it appears, it should be in context of "v2 approximation" or mockup context
```

---

## Acceptance Criteria

1. `docs/adapters/react-native-reusables.md` no longer has bare `@tailwind base/components/utilities` directives as primary guidance
2. A NativeWind version compatibility note explains v3 vs v4 syntax choice
3. The shadcn/ui theme import guidance no longer says "Tailwind v3 version" without qualification
4. `docs/design-systems/chakra-ui.md` Overview correctly identifies Panda CSS as the v3 CSS engine
5. Chakra v3 uses `createSystem()` for theming (documented)
6. `@chakra-ui/icons` removal noted in v3
7. `Modal` → `Dialog` rename noted in component table
8. Source URLs point to v3 documentation
9. No other files modified

---

## Quality Gates

```bash
# Tailwind directives updated
grep -c "@tailwind base" docs/adapters/react-native-reusables.md
# Expected: 0 (removed as primary guidance)

# Chakra v3 content present
grep -c "createSystem\|Panda CSS\|oklch" docs/design-systems/chakra-ui.md
# Expected: ≥2

# Scope containment
git diff --name-only
# Expected: docs/adapters/react-native-reusables.md, docs/design-systems/chakra-ui.md
```

---

## Deliverables

1. Updated `docs/adapters/react-native-reusables.md` (Tailwind v4 syntax, version note)
2. Updated `docs/design-systems/chakra-ui.md` (v3 API: Panda CSS, createSystem, Dialog, updated tokens)
3. Evidence: grep outputs saved to `.tmp/evidence/PP-005/after-grep.txt`

---

--- END SLICE: PP-005-DEV ---
