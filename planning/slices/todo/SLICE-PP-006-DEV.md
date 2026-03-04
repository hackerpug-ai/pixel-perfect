# SLICE-PP-006-DEV: Add Missing Adapter Stubs and Expand INTEGRATE Phase

---

## Metadata

SLICE-ID: PP-006
ROLE: Dev
STATUS: READY
PRIORITY: MEDIUM
EFFORT: M
TYPE: enhancement
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

**Fix:** Create focused adapter stubs for 6 missing libraries. Stubs must follow the established adapter format and provide enough guidance to scaffold and build components (not just a placeholder).

**Finding #12 — Phase 7 INTEGRATE severely underspecified:**
`commands/build.md` Phase 7 (INTEGRATE) is ~35 lines vs ~150+ lines for Phase 5 (ATOMS) and Phase 6 (COMPOSE). It lists 4 integration topics without concrete guidance for how to implement them in common frameworks. Developers using the plugin to wire navigation, state, or data fetching get no specific patterns.

**Fix:** Expand Phase 7 in build.md with framework-aware examples for navigation (React Navigation for mobile, Next.js App Router / React Router for web), state management, and data fetching — at the same specificity level as Phases 5-6.

---

## WRITE-ALLOWED

- `docs/adapters/tamagui.md` — CREATE new adapter stub
- `docs/adapters/gluestack.md` — CREATE new adapter stub
- `docs/adapters/mantine.md` — CREATE new adapter stub
- `docs/adapters/headless-ui.md` — CREATE new adapter stub
- `docs/adapters/daisyui.md` — CREATE new adapter stub
- `docs/adapters/radix.md` — CREATE new adapter stub
- `commands/build.md` — Expand Phase 7 INTEGRATE section

---

## WRITE-PROHIBITED

- `commands/init.md` — Do NOT modify (owned by PP-001, PP-002)
- `docs/adapters/react-native-reusables.md` — Do NOT modify (owned by PP-003, PP-005)
- `docs/adapters/react-native-paper.md` — Do NOT modify
- `docs/adapters/shadcn.md` — Do NOT modify
- `skills/` — Do NOT modify

---

## Implementation Steps

### Step 1: Create Missing Adapter Stubs

Each adapter must follow the established format: platforms, category, scaffold steps, theme integration, component names/patterns, verify checklist, sandbox, source URLs.

Study `docs/adapters/react-native-paper.md` and `docs/adapters/shadcn.md` as format references before writing.

**Create `docs/adapters/tamagui.md`** (mobile-first cross-platform UI):
- Platforms: mobile-ios, mobile-android, web-desktop, web-mobile
- Category: Components + Style
- Key scaffold: `npm install @tamagui/core tamagui` + `tamagui.config.ts`
- Theme integration: `createTamagui()` config, `TamaguiProvider` wrapper
- Key components: `Button`, `Text`, `Stack`, `XStack`, `YStack`, `Sheet`, `Dialog`
- Verify: Components use Tamagui tokens, not hardcoded values; `TamaguiProvider` in story decorator
- Source URLs: https://tamagui.dev, https://tamagui.dev/docs/core/installation

**Create `docs/adapters/gluestack.md`** (Gluestack UI v2):
- Platforms: mobile-ios, mobile-android, web-desktop, web-mobile
- Category: Components
- Key scaffold: `npx gluestack-ui@latest init`
- Theme integration: `GluestackUIProvider` with config
- Key components: `Button`, `Text`, `Box`, `VStack`, `HStack`, `Input`, `Select`, `Modal`
- Verify: Uses Gluestack theme tokens; GluestackUIProvider wraps story decorator
- Source URLs: https://gluestack.io, https://gluestack.io/ui/docs/home/overview

**Create `docs/adapters/mantine.md`** (web React component library):
- Platforms: web-desktop, web-mobile
- Category: Components
- Key scaffold: `npm install @mantine/core @mantine/hooks`; import CSS: `import '@mantine/core/styles.css'`
- Theme integration: `MantineProvider` with `createTheme()` config
- Key components: `Button`, `TextInput`, `Select`, `Modal`, `Drawer`, `Card`, `Stack`, `Group`, `Badge`
- Verify: Components use Mantine theme vars; `MantineProvider` in story decorator
- Source URLs: https://mantine.dev, https://mantine.dev/getting-started/

**Create `docs/adapters/headless-ui.md`** (Tailwind-first headless components for web):
- Platforms: web-desktop, web-mobile
- Category: Components
- Key scaffold: `npm install @headlessui/react`; requires Tailwind CSS (see tailwind.md adapter)
- Theme integration: No theme provider — components are unstyled, styled entirely via Tailwind classes
- Key components: `Dialog`, `Disclosure`, `Listbox`, `Menu`, `Popover`, `RadioGroup`, `Switch`, `Tab`, `Transition`
- Note: Components are intentionally unstyled — AI must apply Tailwind utility classes per the project vibe
- Verify: Components render without default browser styling; all visual styling from Tailwind classes
- Source URLs: https://headlessui.com, https://headlessui.com/react/dialog

**Create `docs/adapters/daisyui.md`** (Tailwind plugin providing pre-styled components for web):
- Platforms: web-desktop, web-mobile
- Category: Components
- Key scaffold: `npm install -D daisyui`; add to tailwind.config.js plugins
- Theme integration: DaisyUI theme system via `data-theme` attribute; `theme` in tailwind.config.js
- Key components: Class-based (not React components): `btn`, `card`, `badge`, `input`, `select`, `modal`, `drawer`, `navbar`, `tabs`
- Note: DaisyUI uses CSS classes applied to HTML elements — no React component imports; scaffold generates utility components wrapping DaisyUI classes
- Verify: DaisyUI classes resolve to correct styles; theme attribute switches correctly
- Source URLs: https://daisyui.com, https://daisyui.com/docs/install/

**Create `docs/adapters/radix.md`** (unstyled accessible primitives for web):
- Platforms: web-desktop, web-mobile
- Category: Components
- Key scaffold: `npm install @radix-ui/react-{component}` per component; no provider needed
- Theme integration: No built-in theme — style with CSS Modules, Tailwind, or CSS-in-JS; tokens from project theme apply
- Key components: `Dialog`, `DropdownMenu`, `Select`, `Popover`, `Tooltip`, `Switch`, `Checkbox`, `Slider`, `Tabs`, `Accordion`
- Import pattern: `import * as Dialog from '@radix-ui/react-dialog'`
- Verify: Components are accessible (keyboard nav, focus management); all visual styling from project's style system
- Source URLs: https://www.radix-ui.com, https://www.radix-ui.com/primitives/docs/overview/introduction

### Step 2: Expand build.md Phase 7 INTEGRATE

Read `commands/build.md`. Locate Phase 7 INTEGRATE section (~line 362 to end of phase).

Current Phase 7 is:
- "What Gets Wired" (4 bullet points: navigation, state, data fetching, end-to-end verification)
- "Integration Steps" (checklist)
- Phase 7 Exit Gate

Expand to match the specificity of Phases 5-6. Add framework-aware subsections:

**Add: Navigation Integration (with framework-specific examples)**

For React Native / Expo:
```typescript
// Example: React Navigation stack setup
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="TodayFeed">
        <Stack.Screen name="TodayFeed" component={TodayFeedScreen} />
        <Stack.Screen name="JobDetail" component={JobDetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

For Next.js (App Router):
```typescript
// Screens map to app/ directory structure
// app/
// ├── page.tsx          → TodayFeed screen
// └── job/[id]/page.tsx → JobDetail screen
```

For React (React Router / Vite):
```typescript
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

const router = createBrowserRouter([
  { path: '/', element: <TodayFeedScreen /> },
  { path: '/job/:id', element: <JobDetailScreen /> },
]);
```

**Add: State Management (with examples)**

For shared state between screens, use React Context as the default minimal approach:
```typescript
// Simple shared state pattern
const AppStateContext = React.createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [selectedJobId, setSelectedJobId] = React.useState<string | null>(null);
  return (
    <AppStateContext.Provider value={{ selectedJobId, setSelectedJobId }}>
      {children}
    </AppStateContext.Provider>
  );
}
```

**Add: Data Fetching (brief pattern)**

Loading state pattern that connects to atoms:
```typescript
// Standard data loading with loading/error/empty states
function TodayFeedScreen() {
  const { data: jobs, isLoading, error } = useJobs();

  if (isLoading) return <LoadingSkeleton />;  // Verified atom
  if (error) return <ErrorState message={error.message} />;  // Verified atom
  if (!jobs?.length) return <EmptyState />;   // Verified atom
  return <JobList jobs={jobs} />;
}
```

**Add: INTEGRATE Exit Gate**

Expand the current gate check to include:
- All screens navigate from the entry point
- Back navigation returns to expected screen
- Data passes correctly between screens (no prop drilling issues)
- Loading, error, and empty states all render correctly in the real app (not just Storybook)
- App compiles without TypeScript errors

### Step 3: Verify

```bash
# All 6 new adapter stubs created
ls docs/adapters/{tamagui,gluestack,mantine,headless-ui,daisyui,radix}.md

# Adapter stubs are substantive (not empty)
for f in docs/adapters/tamagui.md docs/adapters/gluestack.md docs/adapters/mantine.md \
         docs/adapters/headless-ui.md docs/adapters/daisyui.md docs/adapters/radix.md; do
  echo "$f: $(wc -l < $f) lines"
done
# Expected: each >40 lines

# Phase 7 is expanded
wc -l commands/build.md
# Expected: meaningfully longer than before (was ~60 lines for phase 7, should be ~120+)

# Only expected files changed
git diff --name-only
git status --short | grep "^?"  # new files
```

---

## Acceptance Criteria

1. 6 new adapter files created: tamagui.md, gluestack.md, mantine.md, headless-ui.md, daisyui.md, radix.md
2. Each adapter file is ≥40 lines with: platforms, category, scaffold steps, theme integration, verify checklist, source URLs
3. `commands/build.md` Phase 7 INTEGRATE section is expanded with: framework-specific navigation examples (React Navigation + Next.js App Router + React Router), state management pattern, data fetching pattern with loading/error/empty states
4. Phase 7 exit gate in build.md includes specific navigation and data-flow verification checks
5. No existing files modified except `commands/build.md`
6. Adapter stubs follow the same format as `docs/adapters/react-native-paper.md`

---

## Quality Gates

```bash
# All 6 stubs exist
ls docs/adapters/tamagui.md docs/adapters/gluestack.md docs/adapters/mantine.md \
   docs/adapters/headless-ui.md docs/adapters/daisyui.md docs/adapters/radix.md
# Expected: all 6 found

# Stubs are substantive
wc -l docs/adapters/tamagui.md docs/adapters/gluestack.md | awk '{print $1}' | sort -n | head -1
# Expected: ≥40

# Phase 7 has navigation examples
grep -n "NavigationContainer\|createBrowserRouter\|App Router" commands/build.md
# Expected: ≥2 matches

# Scope check
git diff --name-only
# Expected: commands/build.md only
# New files: 6 adapter stubs
```

---

## Deliverables

1. 6 new adapter stub files in `docs/adapters/`
2. Expanded `commands/build.md` Phase 7 INTEGRATE section
3. Evidence: `ls docs/adapters/ | wc -l` before and after, `wc -l commands/build.md` before and after, saved to `.tmp/evidence/PP-006/`

---

--- END SLICE: PP-006-DEV ---
