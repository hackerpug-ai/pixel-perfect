# React Native Paper

Component adapter for mobile applications. Provides Material Design 3 components for React Native.

## Platforms

- mobile-ios
- mobile-android

## Category

Components

## Scaffold

1. Install:
   ```bash
   npm install react-native-paper react-native-safe-area-context react-native-vector-icons
   ```
2. For Expo projects, also install:
   ```bash
   npx expo install react-native-safe-area-context
   ```
3. Configure `babel.config.js` for tree-shaking:
   ```javascript
   module.exports = function(api) {
     api.cache(true);
     return {
       presets: ['babel-preset-expo'],
       env: {
         production: {
           plugins: ['react-native-paper/babel'],
         },
       },
     };
   };
   ```
4. Wrap app root with `PaperProvider`:
   ```tsx
   import { PaperProvider } from 'react-native-paper';
   import { theme } from './theme';

   export default function App() {
     return (
       <PaperProvider theme={theme}>
         {/* app content */}
       </PaperProvider>
     );
   }
   ```
5. Create `theme.ts` with vibe-derived values (see Theme Integration)
6. Create a hello-world component using Paper's `Button` to verify the setup

### Project Structure
```
src/
├── components/
│   ├── StatusBadge.tsx    # project atoms (built on Paper primitives)
│   └── JobCard.tsx
├── screens/
│   └── TodayFeed.tsx
├── theme.ts               # Paper theme configuration
└── App.tsx
```

## Theme Integration

React Native Paper uses Material Design 3 theming. Map the project vibe to a Paper theme:

```typescript
import { MD3LightTheme, MD3DarkTheme, configureFonts } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';

const fontConfig = {
  // Vibe-derived font family
  fontFamily: '/* vibe-derived font */',
};

export const theme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '/* vibe-derived */',
    onPrimary: '/* vibe-derived */',
    primaryContainer: '/* vibe-derived */',
    secondary: '/* vibe-derived */',
    onSecondary: '/* vibe-derived */',
    secondaryContainer: '/* vibe-derived */',
    tertiary: '/* vibe-derived */',
    surface: '/* vibe-derived */',
    onSurface: '/* vibe-derived */',
    background: '/* vibe-derived */',
    error: '/* vibe-derived */',
  },
  fonts: configureFonts({ config: fontConfig }),
  roundness: /* vibe-derived: 4 to 16 */,
};

export const darkTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    // dark mode overrides
  },
  fonts: configureFonts({ config: fontConfig }),
  roundness: theme.roundness,
};
```

### Vibe-to-Theme Mapping

| Vibe Keyword | Paper Impact |
|-------------|-------------|
| clean / minimal | Neutral palette, `roundness: 8`, standard elevation |
| bold / vibrant | Saturated primary/tertiary, `roundness: 12`, higher elevation |
| professional | Slate/zinc tones, `roundness: 6`, minimal elevation |
| playful | Multi-hue colors, `roundness: 16`, varied elevation |
| high-contrast | Maximum contrast ratios, `roundness: 4`, strong outlines |

### NativeWind Bridge
When paired with NativeWind/Tailwind (style adapter), use Paper for interactive components and NativeWind for layout/spacing:
- Paper: `Button`, `TextInput`, `Card`, `Dialog`, `FAB`, `Snackbar`
- NativeWind: `View className="flex-1 p-4"`, `Text className="text-lg font-bold"`

## Web Storybook via react-native-web

All Paper components render in web-based Storybook through `react-native-web`. This is the only supported sandbox approach — there is no on-device Storybook.

### Components That Work Natively in Web Storybook

Most Paper components render correctly through react-native-web without additional shimming:

- `Button`, `IconButton`, `FAB` — Full support
- `Card`, `Surface` — Full support (elevation renders as box-shadow)
- `TextInput` — Full support
- `Chip`, `Badge` — Full support
- `List`, `List.Item`, `List.Section` — Full support
- `Divider`, `Banner` — Full support
- `Dialog`, `Modal`, `Portal` — Work but require `Portal.Host` in preview decorator
- `DataTable` — Full support
- `Avatar` — Full support
- `ProgressBar`, `ActivityIndicator` — Full support

### Components That Need Shimming

| Component | Issue | Web Workaround |
|-----------|-------|---------------|
| `Icon` (via react-native-vector-icons) | Native font icons don't load in web | Use `@expo/vector-icons` with web support, or map to Lucide/Material Symbols web equivalents |
| `Menu` | Relies on native `UIMenu` on iOS | Works but positioning may differ — test in Storybook |
| `Drawer` | Navigation-dependent | Mock navigation context in story decorator |
| `BottomNavigation` | Needs `react-native-safe-area-context` web shim | Install `react-native-safe-area-context` (has web support) |

### Icon Polyfill Strategy

For vector icons in web Storybook:

1. **Expo projects**: `@expo/vector-icons` has built-in web support — no changes needed
2. **Non-Expo projects**: Replace `react-native-vector-icons` imports with a web-compatible icon library:
   ```tsx
   // Create an icon mapping file: src/utils/icons.web.ts
   // Maps vector-icon names to web equivalents (Lucide, Material Symbols)
   ```
3. **Storybook alias** in `.storybook/main.ts`:
   ```typescript
   viteFinal: async (config) => ({
     ...config,
     resolve: {
       ...config.resolve,
       alias: {
         ...config.resolve?.alias,
         'react-native': 'react-native-web',
         'react-native-vector-icons/MaterialCommunityIcons': '@mdi/react',
       },
     },
   }),
   ```

### PaperProvider in Web Storybook

Configure `.storybook/preview.tsx` to wrap all stories with PaperProvider:

```tsx
import type { Preview } from '@storybook/react';
import { PaperProvider } from 'react-native-paper';
import { theme } from '../src/theme';

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
        <PaperProvider theme={theme}>
          <Story />
        </PaperProvider>
      </div>
    ),
  ],
};
export default preview;
```

## Verify

### Component Level
- Component imports from `react-native-paper` for primitives
- Component uses `useTheme()` hook for dynamic theme values (not hardcoded colors)
- Component handles both light and dark themes
- Component works on both iOS and Android (no platform-specific code without fallbacks)
- Touch targets are at least 44x44pt (accessibility)
- Component uses Paper's built-in animation/motion where applicable
- **Story has all props wired to `argTypes` controls**
- **Story renders in web Storybook** (via react-native-web)

### Screen Level
- Screen uses `SafeAreaView` for proper insets
- Screen composes Paper components + project atoms correctly
- Screen scrolls properly (FlatList/ScrollView where needed)
- Navigation integrates with Paper's `Appbar` or `BottomNavigation`
- Screen looks correct on both small (iPhone SE) and large (iPad) viewports
- **Screen story renders in web Storybook** at mobile viewport

## Sandbox

### Dev Server
```bash
# Storybook (web-based, renders RN components via react-native-web)
npm run storybook

# For on-device testing (separate from Storybook)
npx expo start          # Expo
npx react-native start  # React Native CLI
```

### Commonly Used Components by Phase
- **Atoms**: Button, Chip, Badge, TextInput, IconButton, Avatar, Divider
- **Compose**: Card, List, DataTable, Surface, FAB, Banner
- **Integrate**: Appbar, BottomNavigation, Drawer, Dialog, Snackbar, Portal
