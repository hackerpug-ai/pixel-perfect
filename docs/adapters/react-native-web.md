# react-native-web (Storybook Polyfill)

Enables React Native components to render in web-based Storybook via `react-native-web`. This is the standard approach for developing React Native / Expo components with a web-based Storybook workflow.

## Platforms

- mobile-ios
- mobile-android

## Category

Sandbox / Polyfill

## What It Does

`react-native-web` provides a thin translation layer that maps React Native primitives (`View`, `Text`, `Image`, etc.) to their web equivalents. This allows your React Native components to render in a browser-based Storybook instance without device builds.

**Trade-off:** Some native behaviors — gestures, haptics, device-specific animations — differ from device rendering. The polyfill disclaimer banner communicates this to developers.

## Setup

### 1. Install react-native-web

```bash
pnpm add react-native-web
```

### 2. Configure Storybook aliases

In `.storybook/main.ts`, add webpack/Vite aliases to redirect React Native imports to web equivalents:

```typescript
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  // ... other config
  viteFinal: async (config) => ({
    ...config,
    resolve: {
      ...config.resolve,
      alias: {
        ...config.resolve?.alias,
        'react-native': 'react-native-web',
        // If using Lucide React Native icons:
        'lucide-react-native': 'lucide-react',
      },
    },
  }),
};

export default config;
```

### 3. Add Polyfill Disclaimer Decorator

In `.storybook/preview.tsx`, add a global decorator that displays a polyfill warning banner above every story. This communicates to developers that they're viewing a web approximation:

```tsx
import type { Preview } from '@storybook/react';

const preview: Preview = {
  decorators: [
    (Story) => (
      <div className="p-4">
        <div style={{
          background: '#FFF3CD',
          border: '1px solid #FFECB5',
          padding: '8px 12px',
          borderRadius: 4,
          fontSize: 12,
          color: '#664D03',
          marginBottom: 12,
          fontFamily: 'system-ui',
        }}>
          Web Preview — Some native elements (icons, gestures, haptics) are
          polyfilled via react-native-web and may differ from device rendering.
        </div>
        <Story />
      </div>
    ),
  ],
};

export default preview;
```

For React Native Reusables projects, also include `PortalHost`:

```tsx
import { PortalHost } from '@rn-primitives/portal';

const preview: Preview = {
  decorators: [
    (Story) => (
      <div className="p-4">
        <div style={{
          background: '#FFF3CD',
          border: '1px solid #FFECB5',
          padding: '8px 12px',
          borderRadius: 4,
          fontSize: 12,
          color: '#664D03',
          marginBottom: 12,
          fontFamily: 'system-ui',
        }}>
          Web Preview — Some native elements (icons, gestures, haptics) are
          polyfilled via react-native-web and may differ from device rendering.
        </div>
        <Story />
        <PortalHost />
      </div>
    ),
  ],
};
```

### 4. Configure global.css (if using NativeWind)

Import the project's global CSS so Tailwind utilities apply in Storybook:

```tsx
// .storybook/preview.tsx
import '../global.css';
```

## Verify

- [ ] `pnpm storybook` starts without errors
- [ ] React Native components render in the browser
- [ ] The polyfill disclaimer banner appears at the top of every story
- [ ] Icons render correctly (via `lucide-react` alias or similar)
- [ ] Gesture-based components show expected polyfill behavior (may differ from device)

## What Works vs. What Differs

| Behavior | Web Storybook | Device |
|----------|---------------|--------|
| View, Text, Image | ✅ Full support | ✅ |
| StyleSheet | ✅ Full support | ✅ |
| Pressable / TouchableOpacity | ✅ (mouse events) | ✅ (touch events) |
| Animated | ✅ Most animations | ✅ |
| Gesture Handler | ⚠️ Limited (web gestures) | ✅ Full touch |
| Haptics | ❌ No web equivalent | ✅ |
| Native modules | ❌ Not available | ✅ |
| Safe area insets | ⚠️ Simulated | ✅ Real values |

## Source URLs

- react-native-web docs: https://necolas.github.io/react-native-web/
- GitHub: https://github.com/necolas/react-native-web
- Storybook React Native: https://storybook.js.org/blog/storybook-react-native/
