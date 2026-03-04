# Gluestack UI

Universal component library for React Native and web. Provides accessible, themeable components using NativeWind/Tailwind for styling.

## Platforms

- mobile-ios
- mobile-android
- web-desktop
- web-mobile

## Category

Components

## Scaffold

1. Run the interactive CLI (handles full setup automatically):
   ```bash
   npx gluestack-ui@latest init
   ```
   The CLI will:
   - Detect your framework (Expo, React Native, Next.js)
   - Install required dependencies
   - Configure NativeWind/Tailwind integration
   - Generate the `gluestack-ui.config.json`

2. For manual install in existing projects:
   ```bash
   pnpm add @gluestack-ui/themed @gluestack-style/react react-native-svg
   ```

3. Wrap app root with `GluestackUIProvider`:
   ```tsx
   import { GluestackUIProvider } from '@gluestack-ui/themed';
   import { config } from '@gluestack-ui/config';

   export default function App() {
     return (
       <GluestackUIProvider config={config}>
         {/* app content */}
       </GluestackUIProvider>
     );
   }
   ```

4. Create a hello-world component using Gluestack `Button` to verify the setup.

### Project Structure

```
src/
├── components/
│   └── ui/              # Gluestack-based atoms
├── gluestack-ui.config.json
└── app/
    └── _layout.tsx      # GluestackUIProvider setup
```

## Theme Integration

Gluestack uses a config object for theming. Customize via the config:

```typescript
import { createConfig } from '@gluestack-ui/themed';

export const config = createConfig({
  aliases: {
    bg: 'backgroundColor',
    p: 'padding',
    m: 'margin',
  },
  tokens: {
    colors: {
      primary500: '#007AFF',   // vibe-derived
      primary600: '#0062CC',
      neutral100: '#F5F5F5',
      neutral900: '#1A1A1A',
    },
    space: {
      sm: 8,
      md: 16,
      lg: 24,
    },
    radii: {
      sm: 4,
      md: 8,
      lg: 16,
    },
  },
});
```

### Storybook Decorator

Wrap all stories with `GluestackUIProvider` in `.storybook/preview.tsx`:

```tsx
import type { Preview } from '@storybook/react';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { config } from '@gluestack-ui/config';

const preview: Preview = {
  decorators: [
    (Story) => (
      <GluestackUIProvider config={config}>
        <Story />
      </GluestackUIProvider>
    ),
  ],
};

export default preview;
```

## Key Components

| Generic | Gluestack UI |
|---------|--------------|
| Box / Container | `Box` |
| Layout | `VStack`, `HStack`, `Center` |
| Button | `Button`, `ButtonText`, `ButtonIcon` |
| Text | `Text`, `Heading` |
| Input | `Input`, `InputField`, `Textarea` |
| Image | `Image` |
| Badge | `Badge`, `BadgeText` |
| Pressable | `Pressable` |
| Card | Compose with `Box` + styling |
| Modal | `Modal`, `ModalContent`, `ModalHeader` |
| Select | `Select`, `SelectTrigger`, `SelectPortal` |
| Switch | `Switch` |
| Spinner | `Spinner` |

## Verify

- [ ] `GluestackUIProvider` wraps story decorator with correct config
- [ ] Theme tokens resolve (no hardcoded color values in components)
- [ ] Components render in both React Native and web Storybook without errors
- [ ] `VStack`/`HStack` layout components render at correct dimensions
- [ ] TypeScript types resolve without errors for all component props

## Source URLs

- Official site: https://gluestack.io
- Documentation: https://gluestack.io/ui/docs/home/overview
- Installation: https://gluestack.io/ui/docs/home/getting-started/installation
- GitHub: https://github.com/gluestack/gluestack-ui
