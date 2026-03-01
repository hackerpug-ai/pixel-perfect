# Storybook Conventions

Comprehensive reference for the pixel-perfect Storybook-centric approach. All components, screens, and design tokens are developed and previewed in Storybook.

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

All stories use Component Story Format 3 (CSF3):

```typescript
// Required structure
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
