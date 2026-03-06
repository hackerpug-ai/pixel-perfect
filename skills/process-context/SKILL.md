---
name: process-context
description: "Auto-activating context for pixel-perfect projects. Detects manifest, injects phase awareness and adapter conventions."
autoActivate:
  files:
    - "design/manifest.json"
    - "design/manifest.yaml"
---

# pixel-perfect Process Context

You are working in a project managed by **pixel-perfect v4.3.1**, a 6-phase build process orchestrator that produces real code sandboxed in Storybook. This context was auto-loaded because `design/manifest.json` exists in the project.

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

## Your Responsibilities

1. **Respect the current phase** - Don't skip ahead. If the project is in ATOMS, build atoms before composing screens.
2. **Follow adapter conventions** - Components should match the tool stack's patterns.
3. **Use the theme** - Never hardcode colors, fonts, or spacing. Always reference theme tokens.
4. **Track in manifest** - When you create or modify components/screens, update `design/manifest.json`.
5. **Wire controls** - Every component prop must have a corresponding Storybook `argType` control.
6. **Organize stories** - Use the correct Storybook hierarchy prefix (`Design System/`, `Components/`, `Screens/`).

## Read the Manifest

Before doing any component or screen work, read `design/manifest.json` to understand:

- **Current phase**: Which phase is active (discover → target → equip → scaffold → atoms → molecules → compose)
- **Gate status**: Which phases are passed, in-progress, or pending
- **Tools**: What framework, style system, component library, and sandbox are configured
- **Vibe**: The project's aesthetic direction
- **Atoms**: Which components exist, their files, and their status
- **Screens**: Which screens exist, their files, and their status

## Phase Awareness

| Current Phase | What You Should Do | What You Should NOT Do |
|---------------|-------------------|----------------------|
| discover | Help define goal and vibe | Write any code |
| target | Help select platforms, framework, style, components | Write any code |
| equip | Help confirm tool selections | Write any code |
| scaffold | Set up project, create theme, generate token stories | Build feature components |
| plan | Review the BUILD PLAN; confirm component hierarchy before coding | Write component code |
| atoms | Build individual components with Storybook controls | Skip to molecules or compose directly |
| molecules | Build functional atom compositions (2-3 atoms per molecule) | Compose screens before molecules are verified |
| compose | Assemble screens from molecules and atoms | Skip atom/molecule verification, wire data |

## Adapter Conventions

Based on the tools in the manifest, follow these conventions:

### When `tools.style` is tailwind/nativewind:
- Use utility classes, not inline styles
- Reference theme colors as `text-primary`, `bg-secondary`, etc.
- Use the spacing scale (`p-4`, `gap-6`), not arbitrary values
- Apply responsive variants (`sm:`, `md:`, `lg:`) where needed

### When `tools.components` is shadcn:
- Import primitives from `@/components/ui/`
- Use `cn()` for conditional class merging
- Follow shadcn's CSS variable theming
- Compose from shadcn primitives, don't rebuild them

### When `tools.components` is react-native-paper:
- Use `useTheme()` for dynamic values
- Wrap with `PaperProvider` at app root
- Follow Material Design 3 patterns
- Minimum 44x44pt touch targets
- In web Storybook, components render via `react-native-web` polyfill

### When `tools.sandbox` is storybook:
- Co-locate stories with components (`ComponentName.stories.tsx`)
- Use CSF3 format
- Every component gets at least a Default story
- Interactive components get variant stories

For full argTypes control conventions, see `docs/storybook-conventions.md`.

## Story Organization Convention

Stories must use the correct hierarchy prefix:

| Category | Prefix | Example |
|----------|--------|---------|
| Design tokens | `Design System/` | `title: 'Design System/Colors'` |
| Atomic components | `Components/` | `title: 'Components/StatusBadge'` |
| Molecule compositions | `Molecules/` | `title: 'Molecules/JobRow'` |
| Composed screens | `Screens/` | `title: 'Screens/TodayFeed'` |

For design token story regeneration and the polyfill disclaimer pattern (required for React Native web Storybook), see `docs/storybook-conventions.md` and `docs/adapters/react-native-web.md`.

## Commands Reference

| Command | What It Does |
|---------|-------------|
| `/pixel-perfect:init` | Phases 1-3: discover + target + equip |
| `/pixel-perfect:scaffold` | Phase 4: set up project structure, theme, token stories |
| `/pixel-perfect:build` | Phases 4b-6: plan → atoms → molecules → compose |
| `/pixel-perfect:verify` | Run gate checks for current phase |
| `/pixel-perfect:status` | Show progress |
| `/pixel-perfect:research` | Design research |
| `/pixel-perfect:refine` | Iterate on code |
