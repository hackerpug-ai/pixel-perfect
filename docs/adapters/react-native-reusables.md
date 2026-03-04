# React Native Reusables

Component adapter for React Native / Expo applications. Brings shadcn/ui's design philosophy and component patterns to React Native using NativeWind (or Uniwind) styling.

## Platforms

- mobile-ios
- mobile-android

## Category

Components

## Scaffold

1. **Initialize with CLI** (recommended for new projects):
   ```bash
   npx @react-native-reusables/cli@latest init
   ```

2. **Or manual setup for existing projects:**
   ```bash
   # Install dependencies
   npm install @rn-primitives/portal @rn-primitives/types react-native-reanimated

   # NativeWind setup (if not already installed)
   npm install nativewind tailwindcss
   ```

3. **Configure `components.json`** in project root:
   ```json
   {
     "aliases": {
       "components": "@/components",
       "lib": "@/lib",
       "hooks": "@/hooks"
     },
     "style": "nativewind"
   }
   ```

4. **Create `global.css`** with theme variables:
   ```css
   @import "tailwindcss";
   ```

   > **NativeWind version note:** If you are using NativeWind 2.x (Tailwind v3), use `@tailwind base; @tailwind components; @tailwind utilities;` instead. Check your `nativewind` package version before choosing.

   Continue adding theme variables in `:root`:

   ```css
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

   .dark\:root {
     --background: 240 10% 3.9%;
     --foreground: 0 0% 98%;
     /* ... dark mode values */
   }
   ```

5. **Create `theme.ts`** to mirror CSS variables in TypeScript:
   ```typescript
   export const THEME = {
     light: {
       background: 'hsl(0 0% 100%)',
       foreground: 'hsl(240 10% 3.9%)',
       primary: 'hsl(240 5.9% 10%)',
       // ... mirror all CSS variables
     },
     dark: {
       background: 'hsl(240 10% 3.9%)',
       foreground: 'hsl(0 0% 98%)',
       // ... dark mode values
     },
   };

   export const NAV_THEME = {
     light: { background: THEME.light.background, ... },
     dark: { background: THEME.dark.background, ... },
   };
   ```

6. **Add components via CLI:**
   ```bash
   npx @react-native-reusables/cli@latest add button
   npx @react-native-reusables/cli@latest add card
   npx @react-native-reusables/cli@latest add text
   ```

7. **Configure PortalHost** in app layout (required for modals/menus):
   ```tsx
   import { PortalHost } from '@rn-primitives/portal';

   export default function Layout() {
     return (
       <>
         <Slot />
         <PortalHost />
       </>
     );
   }
   ```

8. **Create hello-world component** to verify setup:
   ```tsx
   import { Button } from '@/components/ui/button';
   import { Text } from '@/components/ui/text';

   export function HelloWorld() {
     return (
       <Button>
         <Text>Hello React Native Reusables!</Text>
       </Button>
     );
   }
   ```

### Project Structure
```
src/
├── components/
│   └── ui/                    # CLI-generated components
│       ├── button.tsx
│       ├── card.tsx
│       ├── text.tsx
│       └── ...
├── lib/
│   ├── utils.ts               # cn() utility
│   └── icons/                 # Icon wrapper components
├── hooks/
├── global.css                 # Theme CSS variables
├── theme.ts                   # TypeScript theme mirror
└── app/
    └── _layout.tsx            # PortalHost setup
```

## Theme Integration

React Native Reusables uses shadcn/ui's CSS variable-based theming, adapted for NativeWind. Map the project vibe to theme values:

### Vibe-to-Theme Mapping

| Vibe Keyword | Theme Impact |
|-------------|-------------|
| clean / minimal | Neutral grays, `--radius: 0.5rem`, subtle borders |
| bold / vibrant | Saturated primary colors, `--radius: 0.75rem`, higher contrast |
| professional | Slate/zinc palette, `--radius: 0.375rem`, muted accents |
| playful | Multi-hue colors, `--radius: 1rem`, vibrant accents |
| high-contrast | Maximum contrast ratios, `--radius: 0.25rem`, strong borders |

### Theme Files Sync

When updating `global.css`, sync `theme.ts` using this pattern:
1. Define colors in CSS variables (HSL format without `hsl()` wrapper)
2. Mirror in `theme.ts` with `hsl()` wrapper
3. Keep `NAV_THEME` updated for React Navigation integration

### Using shadcn/ui Themes

You can import themes from [shadcn/ui themes](https://ui.shadcn.com/themes):
- Use the **CSS variables format** from the shadcn/ui themes page
- For NativeWind 4.x (Tailwind v4), the CSS variables theme format is compatible
- For NativeWind 2.x (Tailwind v3), select the "v3" tab on the themes page
- Replace `.dark` with `.dark:root` for NativeWind compatibility

## Web Storybook via react-native-web

React Native Reusables components work in web-based Storybook through `react-native-web`. This enables rapid development iteration without device builds.

### Components That Work Natively in Web Storybook

Most components render correctly through react-native-web:

- `Button`, `Text`, `Card` — Full support
- `Input`, `Textarea` — Full support
- `Badge`, `Avatar` — Full support
- `Checkbox`, `Switch`, `RadioGroup` — Full support
- `Progress`, `Skeleton` — Full support
- `Separator`, `Label` — Full support

### Components That Need Portal/Provider Setup

| Component | Requirement |
|-----------|-------------|
| `Dialog`, `AlertDialog` | `PortalHost` in story decorator |
| `DropdownMenu`, `ContextMenu` | `PortalHost` + ref-based control |
| `Popover`, `Tooltip` | `PortalHost` in story decorator |
| `Sheet` (Bottom Sheet) | `PortalHost` + gesture handler setup |

### Storybook Preview Decorator

Configure `.storybook/preview.tsx`:

```tsx
import type { Preview } from '@storybook/react';
import { PortalHost } from '@rn-primitives/portal';
import '../global.css';

const preview: Preview = {
  decorators: [
    (Story) => (
      <div className="p-4">
        <div style={{
          background: '#FFF3CD', border: '1px solid #FFECB5',
          padding: '8px 12px', borderRadius: 4, fontSize: 12,
          color: '#664D03', marginBottom: 12, fontFamily: 'system-ui',
        }}>
          Web Preview — Native gestures and animations are polyfilled via
          react-native-web and may differ from device rendering.
        </div>
        <Story />
        <PortalHost />
      </div>
    ),
  ],
};
export default preview;
```

### Icon Setup

React Native Reusables uses a wrapper pattern for Lucide icons:

```tsx
import { Icon } from '@/lib/icons';
import { ChevronRight } from 'lucide-react-native';

<Icon as={ChevronRight} className="h-4 w-4" />
```

For web Storybook, ensure `lucide-react-native` is aliased to `lucide-react`:

```typescript
// .storybook/main.ts
viteFinal: async (config) => ({
  ...config,
  resolve: {
    ...config.resolve,
    alias: {
      ...config.resolve?.alias,
      'react-native': 'react-native-web',
      'lucide-react-native': 'lucide-react',
    },
  },
}),
```

## Verify

### Component Level
- Component imports from `@/components/ui/*` (not third-party packages)
- Component uses NativeWind utility classes (not inline styles)
- Component uses theme CSS variables via Tailwind classes (`bg-background`, `text-foreground`)
- Component handles both light and dark themes via `.dark:root` classes
- Component works on both iOS and Android
- Touch targets are at least 44x44pt (accessibility)
- Text components use `<Text>` wrapper (not raw text in RN)
- Icons use the `<Icon as={...} />` wrapper pattern
- **Story has all props wired to `argTypes` controls**
- **Story renders in web Storybook** (via react-native-web)

### Screen Level
- Screen uses `SafeAreaView` or safe area insets
- Screen composes reusable components from `@/components/ui/`
- Screen uses proper scrolling (ScrollView/FlatList where needed)
- Screen handles keyboard avoidance for inputs
- Portals (modals, menus) render correctly with `PortalHost`
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

### Adding New Components
```bash
# Add individual component
npx @react-native-reusables/cli@latest add button

# Add multiple components
npx @react-native-reusables/cli@latest add card input badge avatar
```

### Available Components

The CLI provides these components (matching shadcn/ui naming):

**Atoms:**
- `button`, `text`, `badge`, `avatar`, `icon`
- `input`, `textarea`, `label`, `checkbox`, `switch`, `radio-group`
- `separator`, `skeleton`, `progress`

**Compose:**
- `card`, `alert`, `alert-dialog`, `dialog`
- `dropdown-menu`, `context-menu`, `menubar`
- `popover`, `tooltip`, `hover-card`
- `select`, `tabs`, `accordion`, `collapsible`
- `table`, `data-table`

**Integrate:**
- `sheet` (bottom sheet), `drawer`
- `navigation-menu`, `toggle`, `toggle-group`
- `aspect-ratio`, `scroll-area`

### Commonly Used Components by Phase
- **Atoms**: Button, Text, Badge, Input, Avatar, Checkbox, Switch
- **Compose**: Card, Dialog, Tabs, Accordion, Select, Table
- **Integrate**: Sheet, NavigationMenu, Drawer

## Source URLs

- Official site: https://reactnativereusables.com
- Documentation: https://reactnativereusables.com/docs
- Customization: https://reactnativereusables.com/docs/customization
- GitHub: https://github.com/roninoss/react-native-reusables
- shadcn/ui themes: https://ui.shadcn.com/themes
