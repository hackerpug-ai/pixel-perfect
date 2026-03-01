# Storybook

Sandbox adapter for isolated component development and visual verification. Storybook is the **only supported sandbox** in pixel-perfect — all components, screens, and design tokens are developed and previewed in Storybook's web interface.

## Platforms

- web-desktop
- web-mobile
- mobile-ios (via react-native-web polyfill)
- mobile-android (via react-native-web polyfill)

**All platforms render in web-based Storybook.** React Native projects use `react-native-web` to render components in the browser. See `docs/adapters/react-native-web.md` for polyfill setup.

## Category

Sandbox (always selected — not a user choice)

## Scaffold

### Web (React / Next.js / Vite)

1. Install: `npx storybook@latest init`
2. Verify `.storybook/` directory was created with `main.ts` and `preview.ts`
3. Configure `preview.ts` to import the project's global styles and theme provider
4. Install required addons:
   ```bash
   npm install --save-dev @storybook/addon-essentials @storybook/addon-a11y @storybook/addon-themes
   ```
5. Remove default example stories

### React Native (via react-native-web)

1. Install Storybook for web (NOT `@storybook/react-native`):
   ```bash
   npx storybook@latest init --type react
   ```
2. Install polyfill layer:
   ```bash
   npm install --save-dev react-native-web react-dom
   ```
3. Configure `react-native` → `react-native-web` alias in `.storybook/main.ts`:
   ```typescript
   viteFinal: async (config) => ({
     ...config,
     resolve: {
       ...config.resolve,
       alias: { ...config.resolve?.alias, 'react-native': 'react-native-web' },
     },
   }),
   ```
4. Configure `preview.tsx` to wrap stories with the app's theme provider and polyfill disclaimer
5. Install required addons (same as web)
6. See `docs/adapters/react-native-web.md` for complete polyfill setup

## Story File Convention

- Co-locate stories with components: `ComponentName.stories.tsx`
- Use CSF3 format (Component Story Format)
- Every component gets at least a `Default` story
- Interactive components get variant stories (e.g., `Disabled`, `Loading`, `Error`)
- **All props must have corresponding `argTypes`** — this is mandatory

### Story Organization

Stories are organized into three hierarchy groups:

```
Design System/          ← Token reference stories (scaffold phase)
  Colors
  Typography
  Spacing
  Icons
Components/             ← Atomic components (atoms phase)
  StatusBadge
  JobCard
  ActionButton
Screens/                ← Composed screens (compose phase)
  TodayFeed
  JobDetail
```

Set the `title` in meta to control placement:

```typescript
const meta: Meta<typeof StatusBadge> = {
  title: 'Components/StatusBadge',
  component: StatusBadge,
};
```

## Controls Convention

**Every component prop must be wired to a Storybook control.** Use `argTypes` in the story meta:

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { StatusBadge } from './StatusBadge';

const meta: Meta<typeof StatusBadge> = {
  title: 'Components/StatusBadge',
  component: StatusBadge,
  parameters: {
    docs: {
      description: {
        component: 'Colored badge showing job status. Uses theme colors for each variant.',
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
      description: 'Pulse animation for active statuses',
    },
    onPress: { action: 'pressed' },
  },
  args: {
    status: 'open',
    size: 'md',
    animated: false,
    onPress: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof StatusBadge>;

export const Default: Story = {};
export const InProgress: Story = { args: { status: 'in-progress', animated: true } };
```

### Control Type Mapping

| Prop Type | Control | Example |
|-----------|---------|---------|
| `string` | `text` | `label: { control: 'text' }` |
| `number` | `number` | `size: { control: { type: 'number', min: 1, max: 100 } }` |
| `boolean` | `boolean` | `disabled: { control: 'boolean' }` |
| `enum / union` | `select` | `variant: { control: 'select', options: [...] }` |
| `color string` | `color` | `tint: { control: 'color' }` |
| `() => void` | `action` | `onPress: { action: 'pressed' }` |

## Polyfill Disclaimer

For React Native projects, apply a global decorator in `.storybook/preview.ts`:

```typescript
const preview: Preview = {
  decorators: [
    (Story) => (
      <div>
        <div style={{
          background: '#FFF3CD', border: '1px solid #FFECB5',
          padding: '8px 12px', borderRadius: 4, fontSize: 12,
          color: '#664D03', marginBottom: 12, fontFamily: 'system-ui, sans-serif',
        }}>
          Web Preview — Some native elements (icons, gestures, haptics) are
          polyfilled via react-native-web and may differ from device rendering.
        </div>
        <Story />
      </div>
    ),
  ],
};
```

## Design Token Stories

During scaffold, generate stories that visualize the project's design tokens:

| Story | Content |
|-------|---------|
| `Design System/Colors` | Color swatches from theme palette |
| `Design System/Typography` | Font scale with sample text |
| `Design System/Spacing` | Spacing scale as visual boxes |
| `Design System/Icons` | Grid of available icons from chosen library |

See `docs/storybook-conventions.md` for full token story examples.

## Theme Integration

Configure `.storybook/preview.ts` to wrap all stories with the project's theme:

- **Tailwind projects**: Import the global CSS file (`globals.css` or similar)
- **shadcn projects**: Import globals + wrap with any required providers
- **React Native Paper**: Wrap with `PaperProvider` and the project theme (via `react-native-web`)
- **Custom themes**: Wrap with the project's `ThemeProvider`

Add dark mode toggle using `@storybook/addon-themes` if the project supports dark mode.

## Verify

### Component Level
- Story file exists alongside the component
- `npm run storybook` starts without errors
- Component renders in Storybook without console errors
- **All props have `argTypes` controls** — no missing controls
- Component responds to controls in Storybook UI
- Story uses correct hierarchy prefix (`Components/` or `Screens/`)

### Token Level
- Token stories exist under `Design System/` group
- Color swatches render with correct values from theme
- Typography scale renders with correct fonts and sizes

### Screen Level
- Screen-level story exists with realistic mock data
- All composed atoms render within the screen story
- Screen responds to viewport resizing
- Mobile projects use mobile viewport preset as default

## Sandbox

### Dev Server
```bash
npm run storybook        # typically port 6006
```

### Required Addons
- `@storybook/addon-essentials` (controls, actions, viewport, backgrounds, docs)
- `@storybook/addon-a11y` (accessibility checks)
- `@storybook/addon-themes` (theme switching)

### Verification Command
```bash
npm run build-storybook
```
