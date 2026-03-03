---
description: "Set up project structure, install tools, create theme, generate design token stories, and verify with hello-world component (phase 4: SCAFFOLD)"
---

# Scaffold (Phase 4)

Set up the project for the chosen tools. Installs dependencies, configures the build environment, creates a theme file from the project vibe, generates design token stories for the component sandbox, and verifies with a hello-world component.

## Usage

```
/pixel-perfect:scaffold [directory]
```

## Arguments

- `[directory]`: Project directory. Defaults to current directory.

## Gate Check

**Requires:** `design/manifest.json` with gates discover, target, and equip = passed.

If gates are not met:
```
Cannot scaffold: missing prerequisites.
  discover: passed
  target: passed
  equip: NOT PASSED — run /pixel-perfect:init first

Run /pixel-perfect:init to complete project setup.
```

## What It Does

1. **Read manifest** - Load tool choices and vibe from `design/manifest.json`
2. **Load adapters** - Read relevant adapter docs from `docs/adapters/`
3. **Install tools** - Follow adapter scaffold steps
4. **Configure Storybook** - Platform-aware setup (native for mobile, web for web projects)
5. **Create theme** - Generate theme file from vibe (with frontend-design if available)
6. **Generate design token stories** - Create visual documentation for Colors, Typography, Spacing, and Icons
7. **Hello world** - Create first component + story with Storybook controls example
8. **Verify** - Confirm sandbox runs, token stories render, and hello-world component renders
9. **Update manifest** - Set `scaffold: passed`

## Workflow

### Step 1: Load Adapter Docs

Based on manifest tool choices, load the corresponding adapter docs:

**Mobile project example:**
```
Tools from manifest:
  framework: expo              → context for scaffold decisions
  style: nativewind            → load docs/adapters/tailwind.md
  components: react-native-reusables → load docs/adapters/react-native-reusables.md
  icons: lucide-react-native   → install lucide-react-native
  sandbox: storybook-native    → load docs/adapters/storybook-native.md
```

**Web project example:**
```
Tools from manifest:
  framework: nextjs            → context for scaffold decisions
  style: tailwind              → load docs/adapters/tailwind.md
  components: shadcn           → load docs/adapters/shadcn.md
  icons: lucide-react          → install lucide-react
  sandbox: storybook           → load docs/adapters/storybook.md
```

If no adapter exists for a tool, load `docs/adapters/generic.md` and warn:
```
No adapter found for "tamagui". Using generic adapter (process enforcement only).
The AI will use its general knowledge for tool-specific setup.
```

### Step 2: Execute Adapter Scaffold Steps

Follow the **Scaffold** section of each loaded adapter doc, in order:

1. **Style adapter** scaffold steps (install, configure)
2. **Component adapter** scaffold steps (install, configure)
3. **Icon library** installation (see Step 2a)
4. **Sandbox adapter** scaffold steps (install, configure) -- see Step 3 for Storybook specifics

Each adapter doc specifies exact commands. Execute them sequentially.

### Step 2a: Install Icon Library

Install the icon library specified in the manifest. Icon libraries are essential for UI components.

**React Native / Expo:**

| Icon Library | Install Command |
|--------------|-----------------|
| `lucide-react-native` | `npm install lucide-react-native react-native-svg` |
| `@expo/vector-icons` | Included with Expo (no install needed) |
| `react-native-vector-icons` | `npm install react-native-vector-icons` |
| `phosphor-react-native` | `npm install phosphor-react-native react-native-svg` |

**React / Next.js / Vite:**

| Icon Library | Install Command |
|--------------|-----------------|
| `lucide-react` | `npm install lucide-react` |
| `heroicons` | `npm install @heroicons/react` |
| `phosphor-icons` | `npm install @phosphor-icons/react` |
| `react-icons` | `npm install react-icons` |

**After installation**, create an Icon wrapper component for consistent usage:

**For React Native with Lucide:**
```tsx
// lib/icons/index.tsx
import type { LucideIcon } from 'lucide-react-native';
import { cssInterop } from 'nativewind';

export function iconWithClassName(icon: LucideIcon) {
  cssInterop(icon, {
    className: {
      target: 'style',
      nativeStyleToProp: {
        color: true,
        opacity: true,
      },
    },
  });
}

export { iconWithClassName as Icon };
```

**For React with Lucide:**
```tsx
// components/ui/icon.tsx
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IconProps {
  icon: LucideIcon;
  className?: string;
  size?: number;
}

export function Icon({ icon: IconComponent, className, size = 24 }: IconProps) {
  return <IconComponent className={cn('shrink-0', className)} size={size} />;
}
```

**For custom icon libraries** (when `icons_docs` is provided in manifest), reference the documentation URL for installation and usage patterns.

### Step 2b: CLI-Based Component Libraries (shadcn/ui, React Native Reusables)

**If using a CLI-based component library** (shadcn/ui, React Native Reusables), pull ALL components during scaffold so they're available from the start. Each component gets themed and receives a story file.

#### Detecting CLI-Based Libraries

Check the manifest for these component library values:
- `components: "shadcn"` → CLI-based (web)
- `components: "react-native-reusables"` → CLI-based (mobile)

If detected, execute this step. Otherwise, skip to Step 3.

#### 2b.1: Pull All Components

**For shadcn/ui:**
```bash
# Add all available components at once
npx shadcn@latest add --all --overwrite
```

**For React Native Reusables:**
```bash
# Add all core components (no --all flag, so list them explicitly)
npx @react-native-reusables/cli@latest add \
  accordion alert alert-dialog aspect-ratio avatar \
  badge button card checkbox collapsible \
  context-menu dialog dropdown-menu hover-card input \
  label menubar navigation-menu popover progress \
  radio-group scroll-area select separator skeleton \
  slider switch table tabs textarea toggle \
  toggle-group tooltip
```

This installs all components into `components/ui/` with the project's configured style (from `components.json` or `global.css`).

#### 2b.2: Apply Project Theme

After pulling components, ensure the theme is applied:

1. **Verify `global.css`** has the CSS variables from Step 4 (Create Theme)
2. **Verify `tailwind.config.ts`** references the CSS variables
3. **For React Native Reusables:** Verify `theme.ts` mirrors the CSS variables

The components automatically use theme tokens via CSS variables — no per-component customization needed.

#### 2b.3: Generate Component Stories

Create a story file for EACH pulled component. Stories provide:
- Visual documentation in Storybook
- Interactive prop controls (argTypes)
- Multiple variants showing component states

**Story location:**
- Web: `src/components/ui/{component-name}.stories.tsx`
- Mobile: `components/ui/{component-name}.stories.tsx`

**Story template for each component:**

```tsx
import type { Meta, StoryObj } from '@storybook/react';
// Import the component and its sub-components
import { Button } from './button';
// For React Native Reusables, also import Text:
// import { Text } from './text';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
      description: 'Visual style variant',
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon'],
      description: 'Button size',
    },
    disabled: {
      control: 'boolean',
      description: 'Disabled state',
    },
  },
  args: {
    variant: 'default',
    size: 'default',
    disabled: false,
  },
};
export default meta;

type Story = StoryObj<typeof Button>;

export const Default: Story = {
  render: (args) => <Button {...args}>Button</Button>,
  // For React Native Reusables:
  // render: (args) => <Button {...args}><Text>Button</Text></Button>,
};

export const Destructive: Story = {
  args: { variant: 'destructive' },
  render: (args) => <Button {...args}>Delete</Button>,
};

export const Outline: Story = {
  args: { variant: 'outline' },
  render: (args) => <Button {...args}>Outline</Button>,
};

export const Ghost: Story = {
  args: { variant: 'ghost' },
  render: (args) => <Button {...args}>Ghost</Button>,
};

export const WithIcon: Story = {
  render: (args) => (
    <Button {...args}>
      {/* Add appropriate icon import */}
      <span className="mr-2">+</span>
      Add Item
    </Button>
  ),
};

export const Loading: Story = {
  render: (args) => (
    <Button {...args} disabled>
      <span className="animate-spin mr-2">⏳</span>
      Loading...
    </Button>
  ),
};
```

**Generate stories for these component categories:**

| Category | Components |
|----------|------------|
| **Buttons & Actions** | button, toggle, toggle-group |
| **Form Controls** | input, textarea, checkbox, radio-group, select, switch, slider, label |
| **Feedback** | alert, alert-dialog, dialog, progress, skeleton, badge |
| **Navigation** | tabs, navigation-menu, menubar, dropdown-menu, context-menu |
| **Layout** | card, separator, aspect-ratio, scroll-area, collapsible, accordion |
| **Overlays** | popover, tooltip, hover-card, sheet (RN Reusables) |
| **Data Display** | table, avatar |

**Each story should include:**
1. **Default** — Base state with default props
2. **Variants** — All visual variants (if applicable)
3. **States** — Disabled, loading, error states
4. **Sizes** — All size options (if applicable)
5. **With children** — Showing composition patterns (icons, text combinations)

#### 2b.4: Storybook Organization

After generating component stories, the Storybook sidebar shows:

```
Storybook sidebar:
  Design System/
    Colors
    Typography
    Spacing
    Icons
  Components/
    Accordion
    Alert
    AlertDialog
    Avatar
    Badge
    Button           ← Each component has its own story
    Card
    Checkbox
    ... (all components)
    Toggle
    ToggleGroup
    Tooltip
  Screens/
    (empty — populated during COMPOSE phase)
```

#### 2b.5: Track in Manifest

After pulling components, record them in the manifest:

```json
{
  "tools": {
    "components": "react-native-reusables",
    "components_pulled": true,
    "components_count": 32
  },
  "components": [
    "accordion", "alert", "alert-dialog", "avatar", "badge",
    "button", "card", "checkbox", "collapsible", "context-menu",
    "dialog", "dropdown-menu", "hover-card", "input", "label",
    "menubar", "navigation-menu", "popover", "progress",
    "radio-group", "scroll-area", "select", "separator", "skeleton",
    "slider", "switch", "table", "tabs", "textarea", "toggle",
    "toggle-group", "tooltip"
  ]
}
```

This lets the build phase know which components are available and have stories.

### Step 3: Configure Storybook (Platform-Aware)

The manifest `sandbox` field determines which Storybook variant to install:
- `sandbox: "storybook-native"` → Native on-device Storybook (`@storybook/react-native`)
- `sandbox: "storybook"` → Web-based Storybook (`@storybook/react-vite` or `@storybook/react-webpack5`)

**Check the manifest and branch accordingly:**

```
if manifest.tools.sandbox === "storybook-native":
  → Follow Section 3A: Native Storybook Setup
else:
  → Follow Section 3B: Web Storybook Setup
```

---

#### Section 3A: Native Storybook Setup (Mobile Projects)

**Use this section when `manifest.tools.sandbox === "storybook-native"`**

Follow the complete scaffold steps from `docs/adapters/storybook-native.md`. Key steps:

##### 3A.1: Install Dependencies

```bash
pnpm add -D @storybook/react-native @storybook/addon-ondevice-controls @storybook/addon-ondevice-actions
pnpm add @react-native-async-storage/async-storage
```

##### 3A.2: Create Config Directory

Create `.rnstorybook/` (NOT `.storybook/`):
```
.rnstorybook/
├── index.tsx          # Entry point with AsyncStorage
├── main.ts            # Story globs, addons
├── preview.tsx        # Decorators, parameters
└── storybook.requires.ts  # Auto-generated by Metro
```

##### 3A.3: Configure Entry Point (CRITICAL)

`.rnstorybook/index.tsx`:
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage'
import { view } from './storybook.requires'

// CRITICAL: Pass AsyncStorage explicitly to fix storage errors
const StorybookUI = view.getStorybookUI({
  storage: AsyncStorage,
})

export default StorybookUI
```

##### 3A.4: Configure Metro

Wrap Metro config with `withStorybook`, using environment variable:

```javascript
// metro.config.js
const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro') // if using NativeWind
const { withStorybook } = require('@storybook/react-native/metro/withStorybook')

const config = getDefaultConfig(__dirname)
const styledConfig = withNativeWind(config, { input: './global.css' })

// Use EXPO_PUBLIC_ prefix for client-side env vars (Expo SDK 50+)
const STORYBOOK_ENABLED = process.env.EXPO_PUBLIC_STORYBOOK_ENABLED === 'true'

module.exports = withStorybook(styledConfig, {
  enabled: STORYBOOK_ENABLED,
  configPath: './.rnstorybook',
})
```

##### 3A.5: Configure Root Layout for Auto-Loading

**CRITICAL for Expo Router projects:** Modify the root `app/_layout.tsx` to check for the Storybook environment variable and render Storybook directly when enabled. This enables auto-loading without navigating to a route.

```typescript
// app/_layout.tsx
import '../global.css' // if using NativeWind

import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
// ... other imports

// When EXPO_PUBLIC_STORYBOOK_ENABLED=true, render Storybook directly
const STORYBOOK_ENABLED = process.env.EXPO_PUBLIC_STORYBOOK_ENABLED === 'true'

export default function RootLayout() {
  // Render Storybook UI directly, bypassing Expo Router
  if (STORYBOOK_ENABLED) {
    const StorybookUI = require('../.rnstorybook').default
    return <StorybookUI />
  }

  // Normal app rendering when Storybook is disabled
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      {/* Add storybook route for manual navigation if needed */}
      <Stack.Screen name="storybook" options={{ headerShown: false }} />
      {/* other routes */}
    </Stack>
  )
}
```

You can also keep the optional route for manual access:

```typescript
// app/storybook.tsx
export { default } from '../.rnstorybook'
```

##### 3A.6: Add npm Scripts

```json
{
  "scripts": {
    "storybook": "EXPO_PUBLIC_STORYBOOK_ENABLED=true expo start --clear",
    "storybook:ios": "EXPO_PUBLIC_STORYBOOK_ENABLED=true expo start --ios --clear",
    "storybook:android": "EXPO_PUBLIC_STORYBOOK_ENABLED=true expo start --android --clear"
  }
}
```

##### 3A.7: Story File Requirements

**CRITICAL: Stories must use React Native components, NOT HTML.**

```typescript
// ✅ CORRECT - React Native components
import { View, Text, StyleSheet, ScrollView } from 'react-native'

// ❌ WRONG - HTML elements (will crash with "h2 is not defined")
<div>, <h2>, <span>, etc.
```

---

#### Section 3B: Web Storybook Setup (Web Projects)

**Use this section when `manifest.tools.sandbox === "storybook"`**

##### 3B.1: Install Storybook Core

```bash
npx storybook@latest init --type react
```

This installs `@storybook/react-vite` (or `@storybook/react-webpack5` depending on the project bundler).

##### 3B.2: Configure Bundler

**For Vite** (`.storybook/main.ts`):
```typescript
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: [
    '../src/**/*.stories.@(ts|tsx)',
  ],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-a11y',
  ],
  framework: '@storybook/react-vite',
};
export default config;
```

**For Webpack** (`.storybook/main.ts`):
```typescript
import type { StorybookConfig } from '@storybook/react-webpack5';

const config: StorybookConfig = {
  stories: [
    '../src/**/*.stories.@(ts|tsx)',
  ],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-a11y',
  ],
  framework: '@storybook/react-webpack5',
};
export default config;
```

##### 3B.3: Configure Preview with Theme Provider

`.storybook/preview.tsx`:
```tsx
import type { Preview } from '@storybook/react';
// Import your project's theme provider and theme
// The provider depends on the user's chosen component library:
//   - shadcn/Tailwind: just import globals.css
//   - Chakra: ChakraProvider
//   - Custom: your ThemeProvider
import { ThemeProvider } from '../src/theme';

const preview: Preview = {
  decorators: [
    (Story) => (
      <ThemeProvider>
        <Story />
      </ThemeProvider>
    ),
  ],
};
export default preview;
```

The exact provider depends on the user's chosen component library. Consult the loaded adapter docs for the specific import and wrapping pattern.

---

### Troubleshooting: React / React-DOM Version Mismatch

A common problem during scaffold — especially with React Native and Storybook — is a **React and React-DOM version mismatch**. This happens because:

- React Native pins a specific React version (e.g., `react@18.2.0`)
- Storybook or `react-native-web` may install a different `react-dom` version (e.g., `react-dom@18.3.1`)
- Multiple copies of React in `node_modules` cause hooks errors, context failures, or cryptic "Invalid hook call" crashes

#### Symptoms

```
Error: Invalid hook call. Hooks can only be called inside of the body of a function component.
```
```
Warning: Invalid hook call. Hooks can only be called inside the body of a function component.
This could happen for one of the following reasons:
1. You might have mismatching versions of React and React DOM.
```
```
TypeError: Cannot read properties of null (reading 'useState')
```

Or Storybook renders a blank page with console errors about React internals.

#### Diagnosis

Check for version mismatches:

```bash
npm ls react react-dom
```

Look for multiple versions or version conflicts. The `react` and `react-dom` versions **must match exactly**.

#### Fix

1. **Align versions** — Force `react-dom` to match the `react` version your framework requires:

```bash
# Check what react version is installed
npm ls react

# Install the matching react-dom version
npm install react-dom@<same-version-as-react>
```

For example, if `react` is `18.2.0`:
```bash
npm install react-dom@18.2.0
```

2. **If using npm**, add an `overrides` field to `package.json` to prevent drift:

```json
{
  "overrides": {
    "react-dom": "$react"
  }
}
```

3. **If using yarn**, use `resolutions` instead:

```json
{
  "resolutions": {
    "react-dom": "18.2.0"
  }
}
```

4. **Clean install** after fixing:

```bash
rm -rf node_modules package-lock.json
npm install
```

5. **Verify** the fix:

```bash
npm ls react react-dom
# Should show a single version for each, matching exactly
```

#### Prevention During Scaffold

During Step 3b (installing `react-native-web` and `react-dom`), **always check the existing `react` version first** and install the matching `react-dom`:

```bash
# Read the react version from package.json or node_modules
REACT_VERSION=$(node -p "require('react/package.json').version")

# Install matching react-dom
npm install --save-dev react-native-web react-dom@$REACT_VERSION
```

If a version mismatch is detected during verification (Step 7), report it clearly:

```
Verification FAILED:
  [ ] Storybook starts — Error: Invalid hook call (React version mismatch)

  Detected versions:
    react:     18.2.0
    react-dom: 18.3.1  ← MISMATCH

  Fix: npm install react-dom@18.2.0
  Then run /pixel-perfect:verify to retry.
```

### Step 4: Create Theme

Generate a theme that matches the structure expected by the selected component library. Each UI system has its own theming convention.

**If frontend-design plugin is available:**
1. Pass the project vibe to frontend-design
2. frontend-design produces concrete aesthetic decisions:
   - Font pairing (display + body)
   - Color palette (primary, secondary, accent, neutrals, semantic)
   - Border radius / shape philosophy
   - Motion philosophy (which interactions get animation, duration, easing)
   - Spatial rhythm (spacing scale, density)
3. Write these decisions into the theme file(s) using the component library's required format

**If frontend-design is NOT available:**
1. Warn the user:
   ```
   frontend-design plugin not detected. Generating theme from vibe keywords only.
   Install frontend-design for distinctive, characterful output.
   ```
2. Map vibe keywords to theme values using the adapter's vibe-to-theme mapping table
3. Generate a functional but potentially generic theme

#### Component Library Theme Structures

**shadcn/ui + React Native Reusables** (CSS Variables):

Both use CSS variables in HSL format. Generate `globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 240 10% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 240 10% 3.9%;
    --primary: 240 5.9% 10%;
    --primary-foreground: 0 0% 98%;
    --secondary: 240 4.8% 95.9%;
    --secondary-foreground: 240 5.9% 10%;
    --muted: 240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 46.1%;
    --accent: 240 4.8% 95.9%;
    --accent-foreground: 240 5.9% 10%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 5.9% 90%;
    --input: 240 5.9% 90%;
    --ring: 240 5.9% 10%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 240 10% 3.9%;
    --foreground: 0 0% 98%;
    /* ... dark mode values */
  }
}
```

**For React Native Reusables only**, also generate `lib/theme.ts` to mirror CSS variables:

```typescript
export const THEME = {
  light: {
    background: 'hsl(0 0% 100%)',
    foreground: 'hsl(240 10% 3.9%)',
    primary: 'hsl(240 5.9% 10%)',
    primaryForeground: 'hsl(0 0% 98%)',
    secondary: 'hsl(240 4.8% 95.9%)',
    secondaryForeground: 'hsl(240 5.9% 10%)',
    muted: 'hsl(240 4.8% 95.9%)',
    mutedForeground: 'hsl(240 3.8% 46.1%)',
    accent: 'hsl(240 4.8% 95.9%)',
    accentForeground: 'hsl(240 5.9% 10%)',
    destructive: 'hsl(0 84.2% 60.2%)',
    destructiveForeground: 'hsl(0 0% 98%)',
    border: 'hsl(240 5.9% 90%)',
    input: 'hsl(240 5.9% 90%)',
    ring: 'hsl(240 5.9% 10%)',
  },
  dark: {
    background: 'hsl(240 10% 3.9%)',
    foreground: 'hsl(0 0% 98%)',
    // ... dark mode values
  },
};

export const NAV_THEME = {
  light: {
    background: THEME.light.background,
    border: THEME.light.border,
    card: THEME.light.background,
    notification: THEME.light.destructive,
    primary: THEME.light.primary,
    text: THEME.light.foreground,
  },
  dark: {
    background: THEME.dark.background,
    // ...
  },
};
```

**React Native Paper** (MD3 Theme Object):

Generate `src/theme.ts` using Material Design 3 structure:

```typescript
import { MD3LightTheme, MD3DarkTheme, configureFonts } from 'react-native-paper';

// Custom colors derived from project vibe
const customColors = {
  primary: '#6750A4',
  primaryContainer: '#EADDFF',
  secondary: '#625B71',
  secondaryContainer: '#E8DEF8',
  tertiary: '#7D5260',
  tertiaryContainer: '#FFD8E4',
  surface: '#FFFBFE',
  surfaceVariant: '#E7E0EC',
  background: '#FFFBFE',
  error: '#B3261E',
  errorContainer: '#F9DEDC',
  onPrimary: '#FFFFFF',
  onPrimaryContainer: '#21005D',
  onSecondary: '#FFFFFF',
  onSecondaryContainer: '#1D192B',
  onTertiary: '#FFFFFF',
  onTertiaryContainer: '#31111D',
  onSurface: '#1C1B1F',
  onSurfaceVariant: '#49454F',
  onError: '#FFFFFF',
  onErrorContainer: '#410E0B',
  onBackground: '#1C1B1F',
  outline: '#79747E',
  outlineVariant: '#CAC4D0',
  shadow: '#000000',
  scrim: '#000000',
  inverseSurface: '#313033',
  inverseOnSurface: '#F4EFF4',
  inversePrimary: '#D0BCFF',
  elevation: {
    level0: 'transparent',
    level1: '#F7F2FA',
    level2: '#F3EDF7',
    level3: '#EFE9F4',
    level4: '#EEE8F3',
    level5: '#EBE5F1',
  },
};

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    ...customColors,
  },
  roundness: 2, // Adjust based on vibe: 0=sharp, 2=default, 4=rounded
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    // Dark mode overrides
    primary: '#D0BCFF',
    primaryContainer: '#4F378B',
    surface: '#1C1B1F',
    background: '#1C1B1F',
    // ... complete dark palette
  },
};
```

Apply in your app:
```tsx
import { PaperProvider } from 'react-native-paper';
import { lightTheme, darkTheme } from './src/theme';

export default function App() {
  const colorScheme = useColorScheme();
  return (
    <PaperProvider theme={colorScheme === 'dark' ? darkTheme : lightTheme}>
      {/* app content */}
    </PaperProvider>
  );
}
```

**Mantine** (Theme Object):

Generate `src/theme.ts`:

```typescript
import { createTheme, MantineColorsTuple } from '@mantine/core';

const primary: MantineColorsTuple = [
  '#f0f1fe', '#dfe0f2', '#bcc0e3', '#96a0d4', '#7785c7',
  '#6474bf', '#5a6cbc', '#4a5aa6', '#415094', '#344483',
];

export const theme = createTheme({
  primaryColor: 'primary',
  colors: { primary },
  fontFamily: 'Inter, system-ui, sans-serif',
  headings: { fontFamily: 'Inter, system-ui, sans-serif' },
  radius: { xs: '0.25rem', sm: '0.5rem', md: '0.75rem', lg: '1rem', xl: '1.5rem' },
  defaultRadius: 'md',
});
```

**Tailwind (no component library)**:

Configure `tailwind.config.ts` with theme extensions:

```typescript
import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#6750A4', foreground: '#FFFFFF' },
        secondary: { DEFAULT: '#625B71', foreground: '#FFFFFF' },
        accent: { DEFAULT: '#7D5260', foreground: '#FFFFFF' },
        background: '#FFFBFE',
        foreground: '#1C1B1F',
        muted: { DEFAULT: '#E7E0EC', foreground: '#49454F' },
        destructive: { DEFAULT: '#B3261E', foreground: '#FFFFFF' },
        border: '#CAC4D0',
        input: '#E7E0EC',
        ring: '#6750A4',
      },
      borderRadius: {
        lg: '0.75rem',
        md: '0.5rem',
        sm: '0.25rem',
      },
    },
  },
  plugins: [],
} satisfies Config;
```

#### Vibe-to-Theme Mapping

When generating colors from vibe keywords, apply these transformations:

| Vibe Keyword | Color Strategy | Border Radius | Shadows |
|-------------|----------------|---------------|---------|
| minimal | Neutral grays, low saturation | `0.5rem` | Subtle or none |
| bold / vibrant | High saturation primary, strong contrast | `0.75rem` | Prominent |
| professional | Slate/zinc palette, desaturated accents | `0.375rem` | Subtle |
| playful | Bright multi-hue, warm accents | `1rem+` | Soft, colorful |
| elegant | Muted palette, gold/rose accents | `0.25rem` | Refined |
| brutalist | Black/white + one accent | `0` (sharp) | None |
| high-contrast | Maximum contrast ratios | `0.25rem` | Strong borders |

The loaded component adapter doc contains the specific vibe-to-theme mapping table — use it for concrete values.

### Step 5: Generate Design Token Stories

Create visual documentation stories that render the design tokens from the theme. These stories serve as a living style guide and verify the theme is configured correctly.

All design token stories live under the **"Design System"** group in the Storybook sidebar.

#### 5a: Colors Story

`src/stories/tokens/Colors.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react';
// Import theme colors from YOUR project's theme file
// Adapt imports based on chosen tools (useTheme hook, CSS vars, Tailwind config, etc.)
import { themeColors } from '../src/theme';

function ColorSwatch({ name, color }: { name: string; color: string }) {
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', margin: 8 }}>
      <div style={{ width: 64, height: 64, backgroundColor: color, borderRadius: 8, border: '1px solid #eee' }} />
      <span style={{ fontSize: 12, marginTop: 4 }}>{name}</span>
      <span style={{ fontSize: 10, color: '#888' }}>{color}</span>
    </div>
  );
}

function ColorsGallery() {
  // Access colors from your theme — adapt to your style system:
  //   - React Native Paper: useTheme().colors
  //   - Tailwind: read from tailwind.config.ts or CSS custom properties
  //   - shadcn: read CSS variables
  //   - Custom: import your theme object
  const colorGroups = [
    { title: 'Primary', items: [
      { name: 'primary', color: themeColors.primary },
      { name: 'primaryLight', color: themeColors.primaryLight },
    ]},
    { title: 'Secondary', items: [
      { name: 'secondary', color: themeColors.secondary },
    ]},
    { title: 'Neutral', items: [
      { name: 'background', color: themeColors.background },
      { name: 'surface', color: themeColors.surface },
      { name: 'text', color: themeColors.text },
    ]},
    { title: 'Semantic', items: [
      { name: 'error', color: themeColors.error },
      { name: 'success', color: themeColors.success },
    ]},
  ];

  return (
    <div style={{ padding: 16 }}>
      {colorGroups.map(group => (
        <div key={group.title} style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{group.title}</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            {group.items.map(item => (
              <ColorSwatch key={item.name} name={item.name} color={item.color} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const meta: Meta = {
  title: 'Design System/Colors',
  component: ColorsGallery,
};
export default meta;

type Story = StoryObj;

export const Palette: Story = {};
```

**Adapt** the color entries and access pattern to match the actual theme structure of the user's chosen tools. The example above is generic — consult the loaded adapter docs for the correct theme access method.

#### 5b: Typography Story

`src/stories/tokens/Typography.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react';
// Import your typography scale from the project theme
// Adapt to your style system (Tailwind classes, Paper fonts, CSS custom properties, etc.)

// Generic type scale — adapt names and sizes to your theme
const typeScale = [
  { name: 'Display', size: 36, weight: '700', sample: 'Display Heading' },
  { name: 'H1', size: 30, weight: '700', sample: 'Heading One' },
  { name: 'H2', size: 24, weight: '600', sample: 'Heading Two' },
  { name: 'H3', size: 20, weight: '600', sample: 'Heading Three' },
  { name: 'Body Large', size: 18, weight: '400', sample: 'The quick brown fox jumps over the lazy dog' },
  { name: 'Body', size: 16, weight: '400', sample: 'The quick brown fox jumps over the lazy dog' },
  { name: 'Body Small', size: 14, weight: '400', sample: 'The quick brown fox jumps over the lazy dog' },
  { name: 'Caption', size: 12, weight: '400', sample: 'Caption text for metadata' },
  { name: 'Label', size: 11, weight: '600', sample: 'LABEL TEXT' },
];

function TypographyScale() {
  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {typeScale.map(({ name, size, weight, sample }) => (
        <div key={name} style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
          <span style={{ width: 120, color: '#888', fontSize: 12, flexShrink: 0 }}>
            {name} ({size}px)
          </span>
          <span style={{ fontSize: size, fontWeight: weight }}>{sample}</span>
        </div>
      ))}
    </div>
  );
}

const meta: Meta = {
  title: 'Design System/Typography',
  component: TypographyScale,
};
export default meta;

type Story = StoryObj;

export const FontScale: Story = {};
```

**Adapt** the type scale to your actual theme. For Tailwind/web projects, render using `text-*` utility classes. For Paper, use `theme.fonts.*` variants. For custom themes, use your defined type tokens.

#### 5c: Spacing Story

`src/stories/tokens/Spacing.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react';
// Import spacing values from your project theme if defined
// Otherwise use defaults from your style system (Tailwind scale, etc.)

const spacingScale = [
  { name: 'xs', value: 4 },
  { name: 'sm', value: 8 },
  { name: 'md', value: 16 },
  { name: 'lg', value: 24 },
  { name: 'xl', value: 32 },
  { name: '2xl', value: 48 },
  { name: '3xl', value: 64 },
];

function SpacingBoxes() {
  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {spacingScale.map(({ name, value }) => (
        <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ width: 80, color: '#888', fontSize: 12 }}>{name} ({value}px)</span>
          <div
            style={{
              width: value,
              height: value,
              backgroundColor: '#6366f1',
              borderRadius: 2,
            }}
          />
        </div>
      ))}
    </div>
  );
}

const meta: Meta = {
  title: 'Design System/Spacing',
  component: SpacingBoxes,
};
export default meta;

type Story = StoryObj;

export const Scale: Story = {};
```

Pull spacing values from the project's theme or Tailwind config. If the project defines a custom spacing scale, use those values. Otherwise, use the standard scale from the style adapter.

#### 5d: Icons Story (conditional)

`src/stories/tokens/Icons.stories.tsx` -- **only generated if an icon library is selected or detected** (e.g., `react-native-vector-icons`, `lucide-react`, `@expo/vector-icons`, `react-native-heroicons`):

```tsx
import type { Meta, StoryObj } from '@storybook/react';
// Import icons from YOUR project's chosen icon library
// Adapt to: lucide-react, @expo/vector-icons, react-native-vector-icons,
//           @heroicons/react, @mdi/react, or any other icon set

// Curated subset of icons relevant to the project's domain
// Replace these with actual icons from the chosen library
const projectIcons = [
  { name: 'home', label: 'Home' },
  { name: 'user', label: 'Account' },
  { name: 'bell', label: 'Notifications' },
  { name: 'settings', label: 'Settings' },
  { name: 'search', label: 'Search' },
  { name: 'plus', label: 'Add' },
  { name: 'check', label: 'Success' },
  { name: 'alert-triangle', label: 'Warning' },
  { name: 'x', label: 'Close' },
  { name: 'chevron-right', label: 'Navigate' },
];

function IconGallery() {
  return (
    <div style={{ padding: 16, display: 'flex', flexWrap: 'wrap', gap: 24 }}>
      {projectIcons.map(({ name, label }) => (
        <div key={name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 72 }}>
          {/* Replace with actual icon component from chosen library */}
          <span style={{ fontSize: 24 }}>{name}</span>
          <span style={{ fontSize: 10, color: '#888', marginTop: 4 }}>{label}</span>
          <span style={{ fontSize: 9, color: '#bbb' }}>{name}</span>
        </div>
      ))}
    </div>
  );
}

const meta: Meta = {
  title: 'Design System/Icons',
  component: IconGallery,
};
export default meta;

type Story = StoryObj;

export const Gallery: Story = {};
```

Adapt the icon import and icon names to match the actual icon library in use. Curate the icon set to include icons relevant to the project's domain (based on the PRD/goal).

### Step 6: Hello World Component

Create a minimal component that uses the theme to verify the full stack works. The hello-world component must include **Storybook controls** (argTypes) to demonstrate interactive prop editing in the Storybook UI.

**Component file** (`src/components/HelloWorld.tsx`):
- Uses theme tokens for colors, fonts, spacing
- Accepts props that can be controlled in Storybook (title, subtitle, variant, etc.)
- Follows adapter conventions (Paper components for RN Paper, shadcn primitives for web, etc.)

**Story file** (`src/components/HelloWorld.stories.tsx`):

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { HelloWorld } from './HelloWorld';

const meta: Meta<typeof HelloWorld> = {
  title: 'Components/HelloWorld',
  component: HelloWorld,
  argTypes: {
    title: {
      control: 'text',
      description: 'Primary heading text',
    },
    subtitle: {
      control: 'text',
      description: 'Secondary description text',
    },
    variant: {
      control: 'select',
      options: ['default', 'accent', 'muted'],
      description: 'Visual variant of the component',
    },
    showIcon: {
      control: 'boolean',
      description: 'Whether to display the icon',
    },
  },
  args: {
    title: 'Hello, World',
    subtitle: 'Your project is set up and ready to build.',
    variant: 'default',
    showIcon: true,
  },
};
export default meta;

type Story = StoryObj<typeof HelloWorld>;

export const Default: Story = {};

export const Accent: Story = {
  args: {
    variant: 'accent',
    title: 'Accent Variant',
  },
};

export const Muted: Story = {
  args: {
    variant: 'muted',
    title: 'Muted Variant',
    showIcon: false,
  },
};
```

The hello-world story serves as a **reference example** for how all future component stories should be structured: typed meta, argTypes with controls, named variants, and realistic default args.

### Step 7: Verify

Run verification checks:

1. **Sandbox starts** - Storybook dev server runs without errors
2. **Design token stories render** - All generated token stories appear under "Design System" group
3. **Component library stories render** - If CLI-based library was pulled, all component stories render
4. **HelloWorld renders** - HelloWorld component visible in Storybook with working controls
5. **Theme applied** - All components and token stories use theme values (not defaults)

**For projects with CLI-based component libraries (shadcn/ui, React Native Reusables):**
```
Verification:
  [x] Storybook starts (port 6006)
  [x] Design System/Colors renders palette
  [x] Design System/Typography renders font scale
  [x] Design System/Spacing renders spacing boxes
  [x] Design System/Icons renders gallery
  [x] Components pulled (32 components)
  [x] Component stories generated (32 stories)
  [x] Components/Button renders with variants
  [x] Components/Card renders with sections
  [x] Components/Dialog renders with portal
  [x] All component stories render without errors
  [x] Theme colors applied to all components

Scaffold complete!
```

**For projects with non-CLI component libraries:**
```
Verification:
  [x] Storybook starts (port 6006)
  [x] Design System/Colors renders palette
  [x] Design System/Typography renders font scale
  [x] Design System/Spacing renders spacing boxes
  [x] Design System/Icons renders gallery
  [x] Components/HelloWorld renders with controls
  [x] Theme colors applied correctly

Scaffold complete!
```

If verification fails, report the error and do not advance the gate:
```
Verification FAILED:
  [x] Storybook starts (port 6006)
  [x] Design System/Colors renders palette
  [ ] Design System/Typography — Error: theme.fonts is undefined
  [ ] Components/HelloWorld — Blocked by theme error
  [ ] Theme colors applied — Blocked

Fix the theme configuration and run /pixel-perfect:verify to retry.
```

### Step 8: Update Manifest

On success, update `design/manifest.json`:
```json
{
  "phase": "scaffold",
  "gates": {
    "...": "...",
    "scaffold": "passed"
  }
}
```

## Storybook Organization Structure

After scaffold completes, the Storybook sidebar is organized as follows:

```
Storybook sidebar:
  Design System/
    Colors           ← Color swatches from theme palette
    Typography       ← Font scale with all type variants
    Spacing          ← Spacing scale visualization
    Icons            ← Icon gallery (if icon lib selected)
  Components/
    HelloWorld       ← First component with controls example
  Screens/
    (empty)          ← Populated during COMPOSE phase
```

This organization is enforced by the `title` field in each story's meta:
- Token stories: `title: 'Design System/...'`
- Atom stories: `title: 'Components/...'`
- Screen stories: `title: 'Screens/...'`

## File Structure After Scaffold

**Mobile project (storybook-native):**
```
project/
├── .rnstorybook/             ← Native Storybook config (NOT .storybook/)
│   ├── index.tsx             ← Entry point with AsyncStorage
│   ├── main.ts               ← Story globs, addons
│   ├── preview.tsx           ← Global decorators (theme provider)
│   └── storybook.requires.ts ← Auto-generated by Metro
├── app/
│   ├── _layout.tsx           ← Root layout with Storybook auto-load check
│   └── storybook.tsx         ← Optional Expo Router route to Storybook
├── stories/
│   ├── tokens/
│   │   ├── Colors.stories.tsx     ← Color palette (React Native components)
│   │   ├── Typography.stories.tsx ← Font scale (React Native components)
│   │   ├── Spacing.stories.tsx    ← Spacing scale (React Native components)
│   │   └── Icons.stories.tsx      ← Icon gallery (conditional)
│   └── components/
│       ├── HelloWorld.tsx            ← First component using theme
│       └── HelloWorld.stories.tsx    ← Story with argTypes/controls
├── lib/
│   └── theme.ts              ← Theme derived from project vibe
├── design/
│   └── manifest.json         ← Updated with scaffold: passed
├── metro.config.js           ← Wrapped with withStorybook
└── tailwind.config.ts        ← (if NativeWind selected)
```

**Web project (storybook):**
```
project/
├── .storybook/
│   ├── main.ts               ← Storybook config
│   └── preview.tsx           ← Global decorators (theme provider)
├── src/
│   ├── components/
│   │   ├── HelloWorld.tsx            ← First component using theme
│   │   └── HelloWorld.stories.tsx    ← Story with argTypes/controls
│   ├── stories/
│   │   └── tokens/
│   │       ├── Colors.stories.tsx     ← Color palette swatches
│   │       ├── Typography.stories.tsx ← Font scale display
│   │       ├── Spacing.stories.tsx    ← Spacing scale boxes
│   │       └── Icons.stories.tsx      ← Icon gallery (conditional)
│   └── theme.ts              ← Theme derived from project vibe
├── design/
│   └── manifest.json         ← Updated with scaffold: passed
└── tailwind.config.ts        ← (if Tailwind selected)
```

## Output Summary

**Mobile project with React Native Reusables:**
```
Scaffold complete for: Field service management app

Tools configured:
  Framework:  Expo
  Style:      NativeWind
  Components: React Native Reusables (shadcn for RN)
  Sandbox:    Storybook Native (on-device)

Theme created: global.css + theme.ts
  Font: Space Grotesk + Inter
  Primary: hsl(213 50% 24%)
  Accent: hsl(17 100% 60%)

Component library pulled (32 components):
  accordion, alert, alert-dialog, avatar, badge, button, card,
  checkbox, collapsible, context-menu, dialog, dropdown-menu,
  hover-card, input, label, menubar, navigation-menu, popover,
  progress, radio-group, scroll-area, select, separator, skeleton,
  slider, switch, table, tabs, textarea, toggle, toggle-group, tooltip

Component stories generated (32 stories):
  components/ui/button.stories.tsx   — 6 variants, 3 controls
  components/ui/card.stories.tsx     — 4 variants
  components/ui/dialog.stories.tsx   — 3 variants
  ... (all 32 components)

Design token stories:
  stories/tokens/Colors.stories.tsx      — 4 color groups
  stories/tokens/Typography.stories.tsx  — 15 type variants
  stories/tokens/Spacing.stories.tsx     — 7-step scale
  stories/tokens/Icons.stories.tsx       — 10 project icons

Storybook sidebar:
  Design System/ (Colors, Typography, Spacing, Icons)
  Components/ (Accordion, Alert, AlertDialog, ..., Tooltip) — 32 components
  Screens/ (empty — populated during compose)

Run: pnpm storybook → opens Expo with Storybook

Next: /pixel-perfect:build
```

**Web project with shadcn/ui:**
```
Scaffold complete for: Dashboard web app

Tools configured:
  Framework:  Next.js
  Style:      Tailwind CSS
  Components: shadcn/ui
  Sandbox:    Storybook Web (browser, port 6006)

Theme created: globals.css + tailwind.config.ts
  Font: Space Grotesk + Inter
  Primary: hsl(213 50% 24%)
  Accent: hsl(17 100% 60%)

Component library pulled (45 components):
  accordion, alert, alert-dialog, aspect-ratio, avatar, badge,
  breadcrumb, button, calendar, card, carousel, chart, checkbox,
  collapsible, command, context-menu, dialog, drawer, dropdown-menu,
  form, hover-card, input, input-otp, label, menubar, navigation-menu,
  pagination, popover, progress, radio-group, resizable, scroll-area,
  select, separator, sheet, skeleton, slider, sonner, switch, table,
  tabs, textarea, toast, toggle, toggle-group, tooltip

Component stories generated (45 stories):
  src/components/ui/button.stories.tsx   — 6 variants, 3 controls
  src/components/ui/card.stories.tsx     — 4 variants
  src/components/ui/dialog.stories.tsx   — 3 variants
  ... (all 45 components)

Design token stories:
  src/stories/tokens/Colors.stories.tsx      — 4 color groups
  src/stories/tokens/Typography.stories.tsx  — 15 type variants
  src/stories/tokens/Spacing.stories.tsx     — 7-step scale
  src/stories/tokens/Icons.stories.tsx       — 10 project icons

Storybook sidebar:
  Design System/ (Colors, Typography, Spacing, Icons)
  Components/ (Accordion, Alert, AlertDialog, ..., Tooltip) — 45 components
  Screens/ (empty — populated during compose)

Run: pnpm storybook → http://localhost:6006

Next: /pixel-perfect:build
  The build phase will compose these components into screens.
```

**Mobile project with React Native Paper (non-CLI library):**
```
Scaffold complete for: Field service management app

Tools configured:
  Framework:  Expo
  Style:      NativeWind
  Components: React Native Paper
  Sandbox:    Storybook Native (on-device, /storybook route)

Theme created: lib/theme.ts
  Font: Space Grotesk + Inter
  Primary: #1E3A5F
  Accent: #FF6B35

Design token stories (React Native components):
  stories/tokens/Colors.stories.tsx      — 4 color groups
  stories/tokens/Typography.stories.tsx  — 15 type variants
  stories/tokens/Spacing.stories.tsx     — 7-step scale
  stories/tokens/Icons.stories.tsx       — 10 project icons

Hello world: stories/components/HelloWorld.tsx + story (3 variants, 4 controls)

Run: pnpm storybook → opens Expo, navigate to /storybook

Next: /pixel-perfect:build
```
