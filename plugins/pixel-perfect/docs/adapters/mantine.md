# Mantine

Full-featured React component library for web applications. Provides 100+ accessible components with a built-in theming system and hooks.

## Platforms

- web-desktop
- web-mobile

## Category

Components

## Scaffold

1. Install core packages:
   ```bash
   pnpm add @mantine/core @mantine/hooks
   ```

2. **Critical:** Import Mantine's CSS in `.storybook/preview.tsx`. Missing this causes completely unstyled components:
   ```tsx
   import '@mantine/core/styles.css';
   ```

3. Wrap your app and Storybook with `MantineProvider`:
   ```tsx
   import { MantineProvider } from '@mantine/core';
   import '@mantine/core/styles.css';

   export default function App() {
     return (
       <MantineProvider>
         {/* app content */}
       </MantineProvider>
     );
   }
   ```

4. Create a custom theme with `createTheme()`:
   ```typescript
   import { createTheme } from '@mantine/core';

   export const theme = createTheme({
     primaryColor: 'blue',   // vibe-derived
     fontFamily: 'Inter, sans-serif',
     defaultRadius: 'md',
     colors: {
       // Custom color scale (10 shades required)
       brand: [
         '#EBF5FF', '#C3DFFE', '#9AC9FD', '#70B3FC', '#479DFB',
         '#1D87FA', '#0070E0', '#0058B0', '#004080', '#002850',
       ],
     },
   });
   ```

5. Pass the theme to `MantineProvider`:
   ```tsx
   <MantineProvider theme={theme}>
   ```

6. Create a hello-world component using Mantine `Button` to verify the setup.

### Project Structure

```
src/
├── components/
│   └── ui/          # Mantine-based atoms
├── theme.ts         # Mantine theme configuration
└── app/
    └── layout.tsx   # MantineProvider setup
```

## Theme Integration

Mantine uses CSS variables under the hood. The theme object drives all component styling.

### Vibe-to-Theme Mapping

| Vibe Keyword | Mantine Impact |
|-------------|----------------|
| clean / minimal | `defaultRadius: 'sm'`, neutral `primaryColor`, generous spacing |
| bold / vibrant | High-saturation `colors.brand`, `defaultRadius: 'md'` |
| professional | `primaryColor: 'gray'` or `'slate'`, `defaultRadius: 'xs'` |
| playful | Multi-color palette, `defaultRadius: 'lg'`, rounded buttons |

### Storybook Decorator

In `.storybook/preview.tsx`:

```tsx
import type { Preview } from '@storybook/react';
import { MantineProvider } from '@mantine/core';
import { theme } from '../src/theme';
import '@mantine/core/styles.css';

const preview: Preview = {
  decorators: [
    (Story) => (
      <MantineProvider theme={theme}>
        <Story />
      </MantineProvider>
    ),
  ],
};

export default preview;
```

## Key Components

| Generic | Mantine |
|---------|---------|
| Button | `Button` |
| Text Input | `TextInput` |
| Select | `Select` |
| Checkbox | `Checkbox` |
| Radio | `Radio`, `Radio.Group` |
| Toggle | `Switch` |
| Slider | `Slider` |
| Dialog / Modal | `Modal` |
| Drawer | `Drawer` |
| Card | `Card` with `Card.Section` |
| Tabs | `Tabs` |
| Badge | `Badge` |
| Stack | `Stack`, `Group` |
| Alert | `Alert` |
| Loader | `Loader` |
| Table | `Table` |
| Accordion | `Accordion` |

## Verify

- [ ] `@mantine/core/styles.css` imported in `.storybook/preview.tsx` (first import — missing this = unstyled)
- [ ] `MantineProvider` wraps story decorator with correct theme
- [ ] Mantine CSS variables resolve correctly (inspect element shows `--mantine-*` vars)
- [ ] Custom color scale has exactly 10 shades if defining custom colors
- [ ] Components render with correct fonts and spacing in Storybook

## Source URLs

- Official site: https://mantine.dev
- Getting started: https://mantine.dev/getting-started/
- Theming: https://mantine.dev/theming/theme-object/
- Components: https://mantine.dev/core/button/
- GitHub: https://github.com/mantinedev/mantine
