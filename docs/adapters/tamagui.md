# Tamagui

Cross-platform component library and style system for React Native and web. Provides universal components and a performant, compiler-optimized style system.

## Platforms

- mobile-ios
- mobile-android
- web-desktop
- web-mobile

## Category

Components + Style (combined system)

## Scaffold

1. Install core packages:
   ```bash
   pnpm add @tamagui/core tamagui @tamagui/config
   ```
2. Generate `tamagui.config.ts` at project root:
   ```typescript
   import { config } from '@tamagui/config/v3';
   import { createTamagui } from 'tamagui';

   export const tamaguiConfig = createTamagui(config);

   export default tamaguiConfig;

   export type Conf = typeof tamaguiConfig;

   declare module 'tamagui' {
     interface TamaguiCustomConfig extends Conf {}
   }
   ```
3. Wrap app root with `TamaguiProvider`:
   ```tsx
   import { TamaguiProvider } from 'tamagui';
   import tamaguiConfig from './tamagui.config';

   export default function App() {
     return (
       <TamaguiProvider config={tamaguiConfig}>
         {/* app content */}
       </TamaguiProvider>
     );
   }
   ```
4. For Expo, install the Metro transformer:
   ```bash
   pnpm add @tamagui/metro-plugin
   ```
   Then update `metro.config.js` to include the Tamagui plugin.
5. Create a hello-world component using Tamagui `Button` to verify the setup.

### Project Structure

```
src/
├── components/
│   └── ui/            # Tamagui-based atoms
├── tamagui.config.ts  # Tamagui token configuration
└── app/
    └── _layout.tsx    # TamaguiProvider setup
```

## Theme Integration

Tamagui uses a token system configured in `tamagui.config.ts`. Map the project vibe to token overrides:

```typescript
import { createTamagui, createTokens } from 'tamagui';

const tokens = createTokens({
  color: {
    // Vibe-derived primary colors
    primary: '#007AFF',
    primaryDark: '#0062CC',
    background: '#FFFFFF',
    backgroundDark: '#1C1C1E',
  },
  space: {
    sm: 8,
    md: 16,
    lg: 24,
  },
  radius: {
    sm: 4,
    md: 8,
    lg: 16,
    full: 9999,
  },
});
```

### Vibe-to-Token Mapping

| Vibe Keyword | Tamagui Impact |
|-------------|----------------|
| clean / minimal | Neutral palette, `radius.md: 8`, generous space tokens |
| bold / vibrant | Saturated `color.primary`, `radius.md: 12`, strong contrast |
| professional | Slate tones, `radius.md: 6`, compact spacing |
| playful | Multi-hue colors, `radius.md: 16`, larger spacing |

### Storybook Decorator

Wrap all stories with `TamaguiProvider` in `.storybook/preview.tsx`:

```tsx
import type { Preview } from '@storybook/react';
import { TamaguiProvider } from 'tamagui';
import tamaguiConfig from '../tamagui.config';

const preview: Preview = {
  decorators: [
    (Story) => (
      <TamaguiProvider config={tamaguiConfig}>
        <Story />
      </TamaguiProvider>
    ),
  ],
};

export default preview;
```

## Key Components

| Generic | Tamagui |
|---------|---------|
| Layout | `Stack`, `XStack`, `YStack` |
| Button | `Button` |
| Text | `Text`, `H1`–`H6`, `Paragraph` |
| Input | `Input`, `TextArea` |
| Image | `Image` |
| Card | `Card` with `Card.Header`, `Card.Footer` |
| Modal / Sheet | `Sheet` |
| Dialog | `Dialog` |
| Select | `Select` |
| Switch | `Switch` |
| Checkbox | `Checkbox` |
| Separator | `Separator` |

## Verify

- [ ] `TamaguiProvider` wraps story decorator with correct config
- [ ] Components use Tamagui token references (e.g., `$primary`, `$space.md`) — not hardcoded values
- [ ] Tokens resolve at build time (no runtime style computation visible in dev tools)
- [ ] Components render on both iOS/Android and web Storybook without errors
- [ ] `tamagui.config.ts` exports are correctly typed (no TypeScript errors)

## Source URLs

- Official site: https://tamagui.dev
- Installation: https://tamagui.dev/docs/core/installation
- Configuration: https://tamagui.dev/docs/core/configuration
- GitHub: https://github.com/tamagui/tamagui
