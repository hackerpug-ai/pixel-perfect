# React Native Web (Storybook Polyfill Layer)

Reference adapter for rendering React Native components in web-based Storybook via `react-native-web`.

## Purpose

pixel-perfect always runs Storybook in a web browser, even for React Native projects. This adapter documents how to alias `react-native` imports to `react-native-web` so components render in the browser without a native runtime.

## Platforms

- mobile-ios (rendered as web preview)
- mobile-android (rendered as web preview)

## Category

Polyfill (used alongside the primary style and component adapters)

## Setup

### 1. Install Dependencies

```bash
npm install --save-dev react-native-web react-dom
```

### 2. Configure Storybook Aliases

**Vite (`vite.config.ts` or `.storybook/main.ts`):**

```typescript
// .storybook/main.ts
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  viteFinal: async (config) => {
    return {
      ...config,
      resolve: {
        ...config.resolve,
        alias: {
          ...config.resolve?.alias,
          'react-native': 'react-native-web',
        },
      },
    };
  },
};

export default config;
```

**Webpack (`.storybook/main.ts`):**

```typescript
const config: StorybookConfig = {
  framework: '@storybook/react-webpack5',
  webpackFinal: async (config) => {
    config.resolve = {
      ...config.resolve,
      alias: {
        ...config.resolve?.alias,
        'react-native$': 'react-native-web',
      },
    };
    return config;
  },
};
```

### 3. Additional Polyfills

**Gesture Handler:**
```bash
npm install --save-dev react-native-gesture-handler
```

In `.storybook/preview.ts`:
```typescript
import 'react-native-gesture-handler/jestSetup';
// Or for web-specific setup:
import { enableExperimentalWebImplementation } from 'react-native-gesture-handler';
enableExperimentalWebImplementation(true);
```

**Safe Area Context:**
```bash
npm install --save-dev react-native-safe-area-context
```

The web version auto-polyfills when imported — no additional config needed.

**Reanimated:**
```bash
npm install --save-dev react-native-reanimated
```

Add to Vite config or webpack config:
```typescript
alias: {
  'react-native-reanimated': 'react-native-reanimated/lib/module/web',
}
```

## Icon Polyfill Strategy

React Native vector icon libraries don't render in web Storybook. Replace them with web equivalents:

| Native Library | Web Replacement | Notes |
|----------------|----------------|-------|
| `react-native-vector-icons` | Lucide React or Material Symbols web font | Wrap in adapter component |
| `@expo/vector-icons` | Same web font approach | Expo icons use vector-icons under the hood |
| `react-native-svg` | Works via `react-native-web` | SVG support is built into RNW |

**Recommended pattern** — create an icon adapter:

```typescript
// src/components/Icon.tsx
import { Platform } from 'react-native';

// In Storybook (web), Platform.OS === 'web'
// On device, Platform.OS === 'ios' | 'android'

export const Icon = ({ name, size, color }: IconProps) => {
  if (Platform.OS === 'web') {
    // Use Lucide or other web icon library
    return <LucideIcon name={name} size={size} color={color} />;
  }
  // Use native vector icons on device
  return <NativeIcon name={name} size={size} color={color} />;
};
```

## Known Limitations

Components that **work** in web Storybook:
- View, Text, ScrollView, FlatList, Pressable, TouchableOpacity
- TextInput, Switch, ActivityIndicator
- Image (with web URLs)
- Animated API (basic animations)
- StyleSheet, Platform, Dimensions

Components that **need shimming**:
- Vector icons → web icon library adapter
- Gesture handler → web implementation
- Reanimated → web module
- Safe area → auto-polyfills

Components that **don't work** (show disclaimer only):
- Camera, NFC, Bluetooth, biometrics
- Native file system access
- Native share sheet (can mock)
- Haptic feedback (no-op on web)
- Push notifications

## Polyfill Disclaimer Decorator

Every React Native component rendered in web Storybook must include a visual disclaimer. Apply this as a global decorator in `.storybook/preview.ts`:

```typescript
// .storybook/preview.ts
import type { Preview } from '@storybook/react';
import React from 'react';

const WebPolyfillNotice: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div>
    <div style={{
      background: '#FFF3CD',
      border: '1px solid #FFECB5',
      padding: '8px 12px',
      borderRadius: 4,
      fontSize: 12,
      color: '#664D03',
      marginBottom: 12,
      fontFamily: 'system-ui, sans-serif',
    }}>
      Web Preview — Some native elements (icons, gestures, haptics) are
      polyfilled via react-native-web and may differ from device rendering.
    </div>
    {children}
  </div>
);

const preview: Preview = {
  decorators: [
    (Story) => (
      <WebPolyfillNotice>
        <Story />
      </WebPolyfillNotice>
    ),
  ],
};

export default preview;
```

## Verify

After setup, verify:
1. `npm run storybook` starts without errors
2. Basic React Native components (View, Text, Pressable) render
3. Theme provider wraps all stories
4. Polyfill disclaimer banner appears on all stories
5. Icons render via web adapter (not blank/broken)
