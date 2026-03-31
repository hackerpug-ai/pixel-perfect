---
name: process-context
description: "Auto-activating context for pixel-perfect projects. Detects manifest, injects phase awareness and adapter conventions."
autoActivate:
  files:
    - "design/manifest.json"
    - "design/manifest.yaml"
---

# pixel-perfect Process Context

You are working in a project managed by **pixel-perfect v5.0.0**, a 6-phase build process orchestrator that produces real code sandboxed in Storybook. This context was auto-loaded because `design/manifest.json` exists in the project.

## Legacy YAML Migration

If `design/manifest.yaml` exists but `design/manifest.json` does not, **auto-migrate** before proceeding:

1. Read `design/manifest.yaml`
2. Parse the YAML content into a JSON structure
3. Write the equivalent `design/manifest.json`
4. Delete `design/manifest.yaml`
5. Inform the user:

```
Migrated design/manifest.yaml → design/manifest.json
  All data preserved. YAML file removed.
```

This migration is automatic and transparent. No user confirmation needed — JSON is the canonical format going forward.

## Legacy v4.x Manifest Migration

If `design/manifest.json` exists and its `platforms` field is an **array** (v4.x format), auto-migrate to v5.0 object format before proceeding:

1. Read the existing manifest
2. Create a `platforms` object. For each platform name in the array, create a key with:
   - `tools`: copy from the top-level `tools` object
   - `phase`: copy from the top-level `phase`
   - `gates`: copy scaffold, plan, atoms, molecules, compose from top-level `gates`
   - `atoms`: copy from top-level `atoms` (or `[]` if missing)
   - `molecules`: copy from top-level `molecules` (or `[]` if missing)
   - `screens`: copy from top-level `screens` (or `[]` if missing)
3. Keep top-level `gates` with only: discover, target, equip
4. Remove top-level `tools`, `phase`, `atoms`, `molecules`, `screens`
5. Set `version` to `5.0.0`
6. Write back `design/manifest.json`
7. Inform user:

```
Migrated manifest to v5.0.0 (multi-platform format).
  Platforms: {list of platform keys}
  All data preserved.
```

This migration is automatic and transparent. No user confirmation needed.

## Your Responsibilities

1. **Respect the current phase** - Don't skip ahead. If the project is in ATOMS, build atoms before composing screens.
2. **Follow adapter conventions** - Components should match the tool stack's patterns.
3. **Use the theme** - Never hardcode colors, fonts, or spacing. Always reference theme tokens.
4. **Track in manifest** - When you create or modify components/screens, update `design/manifest.json`.
5. **Wire controls** - Every component prop must have a corresponding Storybook `argType` control.
6. **Organize stories** - Use the correct Storybook hierarchy prefix (`Design System/`, `Components/`, `Screens/`).

## Read the Manifest

Before doing any component or screen work, read `design/manifest.json` to understand:

- **Project-level**: `goal`, `vibe`, `spec`, `references` (shared across all platforms)
- **Shared gates**: discover, target, equip (top-level `gates`)
- **Platforms**: `platforms` object — each key is a platform name containing:
  - `tools`: framework, style, components, icons, sandbox for this platform
  - `phase`: current active phase for this platform
  - `gates`: scaffold through compose gate status for this platform
  - `atoms`, `molecules`, `screens`: component inventory for this platform

When a command operates on a specific platform, read `platforms[platformName]` for all platform-specific state.

## Phase Awareness

Commands that operate on build phases (scaffold, build, verify, refine) are **platform-scoped**:

- If only one platform exists in the manifest, it is auto-selected
- If multiple platforms exist and no `--platform` flag is provided, prompt the user to choose
- The `--platform` flag explicitly selects which platform to operate on

| Current Phase | What You Should Do | What You Should NOT Do |
|---------------|-------------------|----------------------|
| discover | Help define goal and vibe | Write any code |
| target | Help select platforms, framework, style, components | Write any code |
| equip | Help confirm tool selections | Write any code |
| scaffold | Set up project, create theme, generate token stories **for the selected platform** | Build feature components |
| plan | Review the BUILD PLAN for the selected platform | Write component code |
| atoms | Build individual components for the selected platform | Skip to molecules or compose directly |
| molecules | Build functional atom compositions for the selected platform | Compose screens before molecules are verified |
| compose | Assemble screens from molecules and atoms for the selected platform | Skip atom/molecule verification, wire data |

**Important:** Each platform progresses independently. One platform may be at `compose: passed` while another is at `scaffold: in-progress`. Always check the selected platform's gates, not another platform's.

## Adapter Conventions

Based on the tools in the manifest, follow these conventions:

### When `platforms[name].tools.style` is tailwind/nativewind:
- Use utility classes, not inline styles
- Reference theme colors as `text-primary`, `bg-secondary`, etc.
- Use the spacing scale (`p-4`, `gap-6`), not arbitrary values
- Apply responsive variants (`sm:`, `md:`, `lg:`) where needed

### When `platforms[name].tools.components` is shadcn:
- Import primitives from `@/components/ui/`
- Use `cn()` for conditional class merging
- Follow shadcn's CSS variable theming
- Compose from shadcn primitives, don't rebuild them

### When `platforms[name].tools.components` is react-native-paper:
- Use `useTheme()` for dynamic values
- Wrap with `PaperProvider` at app root
- Follow Material Design 3 patterns
- Minimum 44x44pt touch targets
- In web Storybook, components render via `react-native-web` polyfill

### When `platforms[name].tools.sandbox` is storybook:
- Co-locate stories with components (`ComponentName.stories.tsx`)
- Use CSF3 format
- Every component gets at least a Default story
- Interactive components get variant stories

For full argTypes control conventions, see `docs/storybook-conventions.md`.

### When `platforms[name].tools.sandbox` is tui-sandbox:
- Stories use `.story.ts` format (not CSF3)
- Co-locate stories in `stories/` directory (not with components)
- Stories have `StoryMeta` default export with `title`, `adapter`, `terminal` dimensions
- Stories use declarative `mount` or imperative `run` functions
- Terminal output is captured as frames, not browser DOM
- Use `createTestHarness()` for automated testing
- ANSI codes must be stripped for text assertions

## Story Organization Convention

Stories must use the correct hierarchy prefix:

| Category | Prefix | Example |
|----------|--------|---------|
| Design tokens | `Design System/` | `title: 'Design System/Colors'` |
| Atomic components | `Components/` | `title: 'Components/StatusBadge'` |
| Molecule compositions | `Molecules/` | `title: 'Molecules/JobRow'` |
| Composed screens | `Screens/` | `title: 'Screens/TodayFeed'` |

**Note for TUI projects:** Stories use the `.story.ts` format with `StoryMeta` in the default export, not CSF3. The hierarchy prefixes are the same, but the story file format differs.

For design token story regeneration and the polyfill disclaimer pattern (required for React Native web Storybook), see `docs/storybook-conventions.md` and `docs/adapters/react-native-web.md`.

## Commands Reference

| Command | What It Does |
|---------|-------------|
| `/pixel-perfect:init` | Phases 1-3: discover + target + equip |
| `/pixel-perfect:add-platform` | Add a new platform to an existing project (post-init) |
| `/pixel-perfect:scaffold` | Phase 4: set up project structure, theme, token stories |
| `/pixel-perfect:build` | Phases 4b-6: plan → atoms → molecules → compose |
| `/pixel-perfect:verify` | Run gate checks for current phase |
| `/pixel-perfect:status` | Show progress |
| `/pixel-perfect:research` | Design research |
| `/pixel-perfect:refine` | Iterate on code |
