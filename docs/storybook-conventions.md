# Storybook Conventions

> **Applies when `tools.sandbox: "storybook"`** (opt-in). pixel-perfect's default sandbox is a `custom` native browser — the portable, sandbox-agnostic conventions (layer grouping, isolation, variants×states, token codegen) live in `docs/sandbox-spec.md`. This doc is the Storybook-specific reference.

Comprehensive reference for the pixel-perfect Storybook approach (when Storybook is the chosen sandbox). All components, screens, and design tokens are developed and previewed in Storybook.

## Story Organization

Stories are organized into three top-level groups in the Storybook sidebar:

```
Design System/          ← Token reference stories
  Colors
  Typography
  Spacing
  Icons
Components/             ← Atomic components (Phase 5)
  StatusBadge
  JobCard
  DateChip
  ActionButton
Screens/                ← Composed screens (Phase 6)
  TodayFeed
  JobDetail
  Settings
```

Set the `title` in each story's meta to control placement:

```typescript
// Token story
const meta: Meta = { title: 'Design System/Colors' };

// Component story
const meta: Meta<typeof StatusBadge> = { title: 'Components/StatusBadge' };

// Screen story
const meta: Meta<typeof TodayFeed> = { title: 'Screens/TodayFeed' };
```

## Controls Convention

**Every exported prop must have a corresponding Storybook control.** This is non-negotiable. Controls let designers and developers explore component behavior interactively.

### argTypes Mapping

| Prop Type | Storybook Control | Example |
|-----------|------------------|---------|
| `string` | `text` | `label: { control: 'text' }` |
| `number` | `number` | `size: { control: { type: 'number', min: 1, max: 100 } }` |
| `boolean` | `boolean` | `disabled: { control: 'boolean' }` |
| `enum / union` | `select` | `variant: { control: 'select', options: ['primary', 'secondary'] }` |
| `color string` | `color` | `tint: { control: 'color' }` |
| `object` | `object` | `style: { control: 'object' }` |
| `function` | `action` | `onPress: { action: 'pressed' }` |
| `ReactNode` | — | Omit from controls (use `args` with JSX) |

### Full Example

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { StatusBadge } from './StatusBadge';

const meta: Meta<typeof StatusBadge> = {
  title: 'Components/StatusBadge',
  component: StatusBadge,
  parameters: {
    docs: {
      description: {
        component: 'Colored badge showing job status. Uses theme colors for each status variant.',
      },
    },
  },
  argTypes: {
    status: {
      control: 'select',
      options: ['open', 'in-progress', 'complete', 'cancelled'],
      description: 'The current job status',
    },
    label: {
      control: 'text',
      description: 'Override the default status label text',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Badge size variant',
    },
    animated: {
      control: 'boolean',
      description: 'Whether to show a pulse animation for active statuses',
    },
  },
  args: {
    status: 'open',
    size: 'md',
    animated: false,
  },
};

export default meta;
type Story = StoryObj<typeof StatusBadge>;

export const Default: Story = {};

export const InProgress: Story = {
  args: { status: 'in-progress', animated: true },
};

export const Complete: Story = {
  args: { status: 'complete' },
};

export const AllSizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <StatusBadge {...args} size="sm" />
      <StatusBadge {...args} size="md" />
      <StatusBadge {...args} size="lg" />
    </div>
  ),
};
```

### Actions for Callbacks

Use `fn()` from `@storybook/test` for callback props:

```typescript
import { fn } from '@storybook/test';

const meta: Meta<typeof ActionButton> = {
  title: 'Components/ActionButton',
  component: ActionButton,
  args: {
    onPress: fn(),
    onLongPress: fn(),
  },
};
```

## Design Token Stories

Token stories provide a visual reference for the project's design system. They're generated during the SCAFFOLD phase and updated when the theme changes.

### Colors Story

```typescript
// src/stories/tokens/Colors.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { theme } from '../../theme';

const ColorSwatch = ({ name, value }: { name: string; value: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
    <div style={{
      width: 48, height: 48, borderRadius: 8,
      backgroundColor: value, border: '1px solid #e5e5e5',
    }} />
    <div>
      <div style={{ fontWeight: 600, fontSize: 14 }}>{name}</div>
      <div style={{ fontSize: 12, color: '#666', fontFamily: 'monospace' }}>{value}</div>
    </div>
  </div>
);

const ColorPalette = () => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 24 }}>
    {Object.entries(theme.colors).map(([name, value]) => (
      <ColorSwatch key={name} name={name} value={value as string} />
    ))}
  </div>
);

const meta: Meta = {
  title: 'Design System/Colors',
  component: ColorPalette,
};
export default meta;

type Story = StoryObj;
export const Default: Story = {};
```

### Typography Story

```typescript
// src/stories/tokens/Typography.stories.tsx
const TypographyScale = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    {Object.entries(theme.typography).map(([name, style]) => (
      <div key={name}>
        <div style={{ fontSize: 11, color: '#999', fontFamily: 'monospace', marginBottom: 4 }}>
          {name} — {style.fontSize}px / {style.fontWeight}
        </div>
        <div style={style}>The quick brown fox jumps over the lazy dog</div>
      </div>
    ))}
  </div>
);
```

### Spacing Story

```typescript
// src/stories/tokens/Spacing.stories.tsx
const SpacingScale = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    {Object.entries(theme.spacing).map(([name, value]) => (
      <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 60, fontSize: 12, fontFamily: 'monospace', color: '#666' }}>
          {name}: {value}px
        </div>
        <div style={{
          width: value as number, height: 24,
          backgroundColor: '#3B82F6', borderRadius: 2, opacity: 0.7,
        }} />
      </div>
    ))}
  </div>
);
```

### Icons Story

```typescript
// src/stories/tokens/Icons.stories.tsx
// Renders a grid of all available icons from the project's icon library
const IconGallery = () => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 80px)', gap: 16 }}>
    {iconNames.map((name) => (
      <div key={name} style={{ textAlign: 'center' }}>
        <Icon name={name} size={24} />
        <div style={{ fontSize: 10, color: '#666', marginTop: 4, wordBreak: 'break-all' }}>{name}</div>
      </div>
    ))}
  </div>
);
```

## CSF3 Format Reference

All stories use Component Story Format 3 (CSF3). The example below is **React**; the `Meta`/`StoryObj`/`argTypes` shape is the same on every framework — only the import source and component syntax change:

| Framework | Story file | Import | Notes |
|-----------|-----------|--------|-------|
| React / Next.js / Vite | `Name.stories.tsx` | `@storybook/react` | JSX render functions |
| SvelteKit | `Name.stories.ts` | `@storybook/svelte` | CSF object format |
| SvelteKit (native) | `Name.stories.svelte` | `@storybook/addon-svelte-csf` (`defineMeta` + `<Story>`) | recommended for slots/snippets — see `docs/adapters/sveltekit.md` |

```typescript
// Required structure (React)
import type { Meta, StoryObj } from '@storybook/react';
import { ComponentName } from './ComponentName';

// Meta: component registration + defaults
const meta: Meta<typeof ComponentName> = {
  title: 'Components/ComponentName',     // Sidebar placement
  component: ComponentName,               // Auto-generates controls from props
  parameters: { /* storybook config */ },
  argTypes: { /* control overrides */ },
  args: { /* default prop values */ },
};
export default meta;

// Type alias
type Story = StoryObj<typeof ComponentName>;

// Stories: named exports
export const Default: Story = {};
export const Variant: Story = { args: { variant: 'secondary' } };
export const Custom: Story = { render: (args) => <ComponentName {...args} /> };
```

## Polyfill Disclaimer

For React Native projects rendered in web Storybook, a disclaimer banner is required. See `docs/adapters/react-native-web.md` for the full decorator pattern.

The disclaimer:
- Appears at the top of every story
- Has a warm yellow background (#FFF3CD) with dark text
- States: "Web Preview — Some native elements (icons, gestures, haptics) are polyfilled via react-native-web and may differ from device rendering."
- Applied globally in `.storybook/preview.ts` as a decorator

## Preview Configuration

### Theme Wrapping

All stories must be wrapped with the project's theme provider:

```typescript
// .storybook/preview.ts
import { ThemeProvider } from '../src/theme';
// or for React Native Paper:
import { PaperProvider } from 'react-native-paper';
import { theme } from '../src/theme';

const preview: Preview = {
  decorators: [
    (Story) => (
      <ThemeProvider>  {/* or <PaperProvider theme={theme}> */}
        <Story />
      </ThemeProvider>
    ),
  ],
};
```

### Viewport Presets

For mobile projects, configure viewport presets:

```typescript
const preview: Preview = {
  parameters: {
    viewport: {
      viewports: {
        iPhone14: { name: 'iPhone 14', styles: { width: '390px', height: '844px' } },
        iPhone14Pro: { name: 'iPhone 14 Pro', styles: { width: '393px', height: '852px' } },
        Pixel7: { name: 'Pixel 7', styles: { width: '412px', height: '915px' } },
        iPadMini: { name: 'iPad Mini', styles: { width: '744px', height: '1133px' } },
      },
      defaultViewport: 'iPhone14',
    },
  },
};
```

### Required Addons

```bash
npm install --save-dev \
  @storybook/addon-essentials \
  @storybook/addon-a11y \
  @storybook/addon-themes
```

Configure in `.storybook/main.ts`:
```typescript
addons: [
  '@storybook/addon-essentials',  // controls, actions, viewport, backgrounds, docs
  '@storybook/addon-a11y',        // accessibility checks
  '@storybook/addon-themes',      // theme switching (light/dark)
],
```

## State Scenario Stories

For molecules and organisms with declared internal state (`state.declared` in the manifest), each `state.scenarios[]` entry must have a corresponding named story export. State scenarios exercise specific internal state configurations, not just external prop variations.

**Screens** follow the same rule against their `states` list (a route + its named states — see `docs/state-patterns.md`): each state name gets one named story that drives the screen into that state. A screen collapsed from several route-variants (e.g. `/feed` with `["default","empty","loading","error"]`) exports one story per state — the same states stay viewable as siblings under `Screens/Feed`, just not as separate screens. *How* the screen is driven into a state (override/controlled props, naming, precedence) is left to the implementer/adapter; the examples below show the molecule pattern, and screens reuse it.

### Pattern (React)

```tsx
// SearchBar.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { userEvent, within } from '@storybook/test';
import { SearchBar } from './SearchBar';

const meta: Meta<typeof SearchBar> = {
  title: 'Molecules/SearchBar',
  component: SearchBar,
  parameters: {
    docs: { description: { component: '...' } },
  },
  argTypes: {
    placeholder: { control: { type: 'text' } },
    onSearch: { action: 'searched' },
  },
};

export default meta;
type Story = StoryObj<typeof SearchBar>;

// State scenario: empty (default — no input, no focus)
export const Empty: Story = {};

// State scenario: typing (user types — suggestions visible)
export const Typing: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByRole('textbox'), 'hva');
  },
};

// State scenario: results visible (pre-populated with suggestions)
export const ResultsVisible: Story = {
  args: {
    initialQuery: 'hvac',
    suggestions: [{ id: 1, label: 'HVAC Service' }],
  },
};

// State scenario: no-results (query returned empty)
export const NoResults: Story = {
  args: {
    initialQuery: 'xyz',
    suggestions: [],
  },
};

// State scenario: error (search failed)
export const Error: Story = {
  args: {
    initialQuery: 'hvac',
    error: 'Search failed. Try again.',
  },
};
```

### Pattern (Svelte)

For SvelteKit projects, pass initial state via component props and use `$state()` values in the story:

```svelte
<!-- SearchBar.stories.svelte -->
<script lang="ts" context="module">
  export const meta = defineMeta({
    title: 'Molecules/SearchBar',
    component: SearchBar,
    args: {
      placeholder: 'Search jobs...',
    },
  });
</script>
```

Each scenario gets its own `<Story>` block with the initial state configured through args:

```svelte
<Story name="Empty">
  <SearchBar placeholder="Search jobs..." />
</Story>

<Story name="Typing" args={{ initialQuery: 'hva', initialSuggestions: [{ id: 1, label: 'HVAC Service' }] }}>
  <SearchBar {args} />
</Story>
```

### Rules

1. **Every declared scenario gets a named story.** If `state.scenarios` lists 5 scenarios, the story file must export 5 named stories (or Svelte CSF `<Story>` blocks).
2. **Each scenario exercises a distinct state.** Don't reuse the same state values across scenarios — each one should demonstrate a unique internal state configuration.
3. **Use `play` functions (React) for interactive scenarios** (typing, clicking, focusing).
4. **Use initial props (Svelte, pre-populated) for static scenarios.**
5. **For TUI stories**, create separate model instances initialized to the target state values. Register each as its own story entry in the terminal catalog.
6. **Stateless molecules/organisms** (those with `"state": null`) don't need state scenario stories — standard prop-variant stories suffice.
7. **Screens** export one named story per entry in their `states` list (each driving the screen into that state). Single-state screens (`["default"]` or no `states`) need only a Default story.
