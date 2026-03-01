---
name: process-context
description: "Auto-activating context for pixel-perfect projects. Detects manifest, injects phase awareness and adapter conventions."
autoActivate:
  files:
    - "design/manifest.yaml"
---

# pixel-perfect Process Context

You are working in a project managed by **pixel-perfect v4.0**, a 7-phase build process orchestrator that produces real code sandboxed in Storybook. This context was auto-loaded because `design/manifest.yaml` exists in the project.

## Your Responsibilities

1. **Respect the current phase** - Don't skip ahead. If the project is in ATOMS, build atoms before composing screens.
2. **Follow adapter conventions** - Components should match the tool stack's patterns.
3. **Use the theme** - Never hardcode colors, fonts, or spacing. Always reference theme tokens.
4. **Track in manifest** - When you create or modify components/screens, update `design/manifest.yaml`.
5. **Wire controls** - Every component prop must have a corresponding Storybook `argType` control.
6. **Organize stories** - Use the correct Storybook hierarchy prefix (`Design System/`, `Components/`, `Screens/`).

## Read the Manifest

Before doing any component or screen work, read `design/manifest.yaml` to understand:

- **Current phase**: Which phase is active (discover → target → equip → scaffold → atoms → compose → integrate)
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
| atoms | Build individual components with Storybook controls | Compose screens, wire navigation |
| compose | Assemble screens from atoms | Skip atom verification, wire data |
| integrate | Wire navigation, state, data | Rebuild verified components |

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

## Storybook Controls Convention

**Every component prop must be wired to a Storybook control via `argTypes`.** This is mandatory — no exceptions.

| Prop Type | Control | Example |
|-----------|---------|---------|
| `string` | `text` | `label: { control: 'text' }` |
| `number` | `number` | `size: { control: { type: 'number', min: 1, max: 100 } }` |
| `boolean` | `boolean` | `disabled: { control: 'boolean' }` |
| `enum / union` | `select` | `variant: { control: 'select', options: [...] }` |
| `color string` | `color` | `tint: { control: 'color' }` |
| `() => void` | `action` | `onPress: { action: 'pressed' }` |

When a prop is added during refinement, the corresponding argType must be added too.

## Story Organization Convention

Stories must use the correct hierarchy prefix:

| Category | Prefix | Example |
|----------|--------|---------|
| Design tokens | `Design System/` | `title: 'Design System/Colors'` |
| Atomic components | `Components/` | `title: 'Components/StatusBadge'` |
| Composed screens | `Screens/` | `title: 'Screens/TodayFeed'` |

## Polyfill Disclaimer Convention

For React Native projects rendered in web Storybook via `react-native-web`, a polyfill disclaimer must be visible. This is typically a global decorator in `.storybook/preview.tsx`:

```
Web Preview — Some native elements (icons, gestures, haptics) are
polyfilled via react-native-web and may differ from device rendering.
```

## Design Token Stories Convention

When the theme changes (vibe refinement, theme-only changes), the Design Token stories must be regenerated:

- `Design System/Colors` — Reflects current theme palette
- `Design System/Typography` — Reflects current font scale
- `Design System/Spacing` — Reflects current spacing scale
- `Design System/Icons` — Reflects current icon library (if any)

## Aesthetic Guidance

The project vibe (from the manifest) should inform every visual decision:

- **Color choices**: Follow the theme's hierarchy. Primary for key actions, secondary for supporting elements, accent for highlights.
- **Typography**: Use the configured font pairing. Display font for headings, body font for content.
- **Spacing**: Use the theme's spacing scale consistently. Don't mix different spacing approaches.
- **Motion**: Be intentional. Not every element needs animation. Key transitions (page enter, state change, user action feedback) deserve motion. Idle states don't.

If the **frontend-design** plugin is available in the environment, defer to its aesthetic standards for:
- Font pairing selection and usage
- Color palette application and hierarchy
- Spatial composition and layout rhythm
- Motion design philosophy

## Manifest Updates

When you create or modify a component:

```yaml
# Add to atoms list or update status
atoms:
  - name: ComponentName
    file: src/components/ComponentName.tsx
    story: src/components/ComponentName.stories.tsx
    status: verified  # or: pending, in-progress
    controls: true    # all props wired to argTypes
```

When you create or modify a screen:

```yaml
# Add to screens list or update status
screens:
  - name: ScreenName
    file: src/screens/ScreenName.tsx
    story: src/screens/ScreenName.stories.tsx
    status: verified
    atoms: [Atom1, Atom2, Atom3]
```

## Commands Reference

| Command | What It Does |
|---------|-------------|
| `/pixel-perfect:init` | Phases 1-3: discover + target + equip |
| `/pixel-perfect:scaffold` | Phase 4: set up project structure, theme, token stories |
| `/pixel-perfect:build` | Phases 5-7: atoms → compose → integrate |
| `/pixel-perfect:verify` | Run gate checks for current phase |
| `/pixel-perfect:status` | Show progress |
| `/pixel-perfect:research` | Design research |
| `/pixel-perfect:refine` | Iterate on code |
