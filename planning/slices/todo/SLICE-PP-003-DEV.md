# SLICE-PP-003-DEV: Fix Dead Links and Create Missing react-native-web Adapter

---

## Metadata

SLICE-ID: PP-003
ROLE: Dev
STATUS: READY
PRIORITY: HIGH
EFFORT: S
TYPE: bugfix
EVIDENCE_TIER: T3
PARENT_SLICE: PP-003
CONTEXT_SCOPE: SLICE
TASK_LIST_ID: PP-003-DEV

---

## Context Scope (HIERARCHICAL CONTEXT POLICY)

**Your context scope: SLICE**

### You Receive:
- This slice definition (full document)
- Relevant codebase content for this slice

### You Do NOT Receive:
- Other slice details (scope creep prevention)
- Prior QA feedback
- Conversation history from prior sessions

---

## Dev Environment

**Model:** Claude Sonnet 4.6
**Environment:** Claude Code CLI
**MCP Servers Available:** None required
**Major Tools Available:** Read, Edit, Write, Grep

---

## Scope

**Finding #2 — Wrong GitHub URL for react-native-reusables:**
`docs/adapters/react-native-reusables.md` lists `https://github.com/founded-labs/react-native-reusables` as the GitHub URL. The correct URL is `https://github.com/roninoss/react-native-reusables`.

**Finding #10 — Missing `docs/adapters/react-native-web.md`:**
`docs/storybook-conventions.md` line 268 references `docs/adapters/react-native-web.md` for the polyfill disclaimer decorator pattern: "See `docs/adapters/react-native-web.md` for the full decorator pattern." This file does not exist. The decorator pattern is partially documented in `docs/adapters/react-native-reusables.md` but needs a dedicated adapter file so the reference resolves.

---

## WRITE-ALLOWED

- `docs/adapters/react-native-reusables.md` — Fix GitHub URL in Source URLs section
- `docs/adapters/react-native-web.md` — CREATE this new file (polyfill decorator adapter)

---

## WRITE-PROHIBITED

- `docs/storybook-conventions.md` — Do NOT modify the reference; the goal is to make the file exist
- `commands/` — Do NOT modify any command files
- `skills/` — Do NOT modify

---

## Implementation Steps

### Step 1: Fix GitHub URL in react-native-reusables.md

Read `docs/adapters/react-native-reusables.md`. Locate the "Source URLs" section at the bottom:

```
- GitHub: https://github.com/founded-labs/react-native-reusables
```

Change to:
```
- GitHub: https://github.com/roninoss/react-native-reusables
```

Save the change.

### Step 2: Create docs/adapters/react-native-web.md

The file `docs/adapters/react-native-web.md` is referenced by `docs/storybook-conventions.md` for the polyfill disclaimer decorator. The content of this adapter should document how to configure `react-native-web` as a Storybook polyfill for React Native projects.

The decorator pattern is already shown in `docs/adapters/react-native-reusables.md` under "Storybook Preview Decorator". Extract and expand this into a proper adapter file.

Create `docs/adapters/react-native-web.md` with the following content:

```markdown
# react-native-web (Storybook Polyfill)

Enables React Native components to render in web-based Storybook via `react-native-web`. This is the standard approach for developing React Native / Expo components with a web-based Storybook workflow.

## Platforms

- mobile-ios
- mobile-android

## Category

Sandbox / Polyfill

## What It Does

`react-native-web` provides a thin translation layer that maps React Native primitives (`View`, `Text`, `Image`, etc.) to their web equivalents. This allows your React Native components to render in a browser-based Storybook instance without device builds.

**Trade-off:** Some native behaviors — gestures, haptics, device-specific animations — differ from device rendering. The polyfill disclaimer banner communicates this to developers.

## Setup

### 1. Install react-native-web

```bash
npm install react-native-web
# or
pnpm add react-native-web
```

### 2. Configure Storybook aliases

In `.storybook/main.ts`, add webpack/Vite aliases to redirect React Native imports to web equivalents:

```typescript
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  // ... other config
  viteFinal: async (config) => ({
    ...config,
    resolve: {
      ...config.resolve,
      alias: {
        ...config.resolve?.alias,
        'react-native': 'react-native-web',
        // If using Lucide React Native icons:
        'lucide-react-native': 'lucide-react',
      },
    },
  }),
};

export default config;
```

### 3. Add Polyfill Disclaimer Decorator

In `.storybook/preview.tsx`, add a global decorator that displays a polyfill warning banner above every story. This communicates to developers that they're viewing a web approximation:

```tsx
import type { Preview } from '@storybook/react';

const preview: Preview = {
  decorators: [
    (Story) => (
      <div className="p-4">
        <div style={{
          background: '#FFF3CD',
          border: '1px solid #FFECB5',
          padding: '8px 12px',
          borderRadius: 4,
          fontSize: 12,
          color: '#664D03',
          marginBottom: 12,
          fontFamily: 'system-ui',
        }}>
          Web Preview — Some native elements (icons, gestures, haptics) are
          polyfilled via react-native-web and may differ from device rendering.
        </div>
        <Story />
      </div>
    ),
  ],
};

export default preview;
```

For React Native Reusables projects, also include `PortalHost`:

```tsx
import { PortalHost } from '@rn-primitives/portal';

const preview: Preview = {
  decorators: [
    (Story) => (
      <div className="p-4">
        <div style={{
          background: '#FFF3CD',
          border: '1px solid #FFECB5',
          padding: '8px 12px',
          borderRadius: 4,
          fontSize: 12,
          color: '#664D03',
          marginBottom: 12,
          fontFamily: 'system-ui',
        }}>
          Web Preview — Some native elements (icons, gestures, haptics) are
          polyfilled via react-native-web and may differ from device rendering.
        </div>
        <Story />
        <PortalHost />
      </div>
    ),
  ],
};
```

### 4. Configure global.css (if using NativeWind)

Import the project's global CSS so Tailwind utilities apply in Storybook:

```tsx
// .storybook/preview.tsx
import '../global.css';
```

## Verify

- [ ] `npm run storybook` starts without errors
- [ ] React Native components render in the browser
- [ ] The polyfill disclaimer banner appears at the top of every story
- [ ] Icons render correctly (via `lucide-react` alias or similar)
- [ ] Gesture-based components show expected polyfill behavior (may differ from device)

## What Works vs. What Differs

| Behavior | Web Storybook | Device |
|----------|---------------|--------|
| View, Text, Image | ✅ Full support | ✅ |
| StyleSheet | ✅ Full support | ✅ |
| Pressable / TouchableOpacity | ✅ (mouse events) | ✅ (touch events) |
| Animated | ✅ Most animations | ✅ |
| Gesture Handler | ⚠️ Limited (web gestures) | ✅ Full touch |
| Haptics | ❌ No web equivalent | ✅ |
| Native modules | ❌ Not available | ✅ |
| Safe area insets | ⚠️ Simulated | ✅ Real values |

## Source URLs

- react-native-web docs: https://necolas.github.io/react-native-web/
- GitHub: https://github.com/necolas/react-native-web
- Storybook React Native: https://storybook.js.org/blog/storybook-react-native/
```

### Step 3: Verify

```bash
# Confirm GitHub URL is fixed
grep -n "github.com" docs/adapters/react-native-reusables.md

# Confirm new file exists
ls -la docs/adapters/react-native-web.md

# Confirm storybook-conventions.md reference now resolves
grep -n "react-native-web.md" docs/storybook-conventions.md
```

---

## Acceptance Criteria

1. `docs/adapters/react-native-reusables.md` GitHub URL is `https://github.com/roninoss/react-native-reusables`
2. `docs/adapters/react-native-web.md` exists and is non-empty (>100 lines)
3. `docs/adapters/react-native-web.md` contains: polyfill disclaimer decorator pattern, Storybook alias configuration, and a verify checklist
4. The reference in `docs/storybook-conventions.md` line 268 now points to a file that exists
5. No other files modified

---

## Quality Gates

```bash
grep "roninoss" docs/adapters/react-native-reusables.md | wc -l
# Expected: 1

grep "founded-labs" docs/adapters/react-native-reusables.md | wc -l
# Expected: 0

ls docs/adapters/react-native-web.md
# Expected: file exists

wc -l docs/adapters/react-native-web.md
# Expected: >50 lines (substantive content)

git diff --name-only
# Expected: docs/adapters/react-native-reusables.md
# Plus: docs/adapters/react-native-web.md (new file)
```

---

## Deliverables

1. Edited `docs/adapters/react-native-reusables.md` (URL fix)
2. New `docs/adapters/react-native-web.md` (polyfill adapter)
3. Evidence: `grep "roninoss\|founded-labs" docs/adapters/react-native-reusables.md` saved to `.tmp/evidence/PP-003/after-grep.txt`

---

--- END SLICE: PP-003-DEV ---
