# React Native Reusables

## Overview

- **CSS Framework:** NativeWind (Tailwind CSS for React Native) or Uniwind
- **Component Pattern:** Copy-paste code distribution via CLI; composable components built on RN Primitives (Radix UI port)
- **Official Icon Library:** Lucide React Native (`lucide-react-native`) via wrapper component
- **Theming Approach:** CSS Variables with HSL format in `global.css`; TypeScript mirror in `theme.ts`
- **Distribution:** CLI-based — components are copied into your project via `npx @react-native-reusables/cli@latest add`

## Token Conventions

Structure for `tokens.yaml` generation:

```yaml
tokens:
  colors:
    # Uses HSL color format (same as shadcn/ui)
    # Roles: background, foreground, primary, secondary, muted, accent, destructive, border, input, ring
    # Each role has a base + foreground pair (e.g., primary + primary-foreground)
    format: "hsl"
    roles: [background, foreground, primary, secondary, muted, accent, destructive, border, input, ring, card, popover]
  spacing:
    unit: "4px"
    scale: "Tailwind default spacing scale via NativeWind"
  typography:
    fontFamily: "System font (platform default)"
  borderRadius:
    # Uses --radius CSS variable
    system: "variable-based"
    default_base: "0.5rem"
```

## Component Names

Mapping from generic names to React Native Reusables component names:

| Generic | React Native Reusables | Notes |
|---------|------------------------|-------|
| Button | Button | with Text child required |
| Text | Text | wrapper for styled text |
| Text Input | Input | — |
| Text Area | Textarea | — |
| Select | Select | with SelectTrigger, SelectContent, SelectItem |
| Checkbox | Checkbox | — |
| Radio | RadioGroup | with RadioGroupItem |
| Toggle | Switch | — |
| Slider | Slider | — |
| Dialog / Modal | Dialog | requires PortalHost |
| Bottom Sheet | Sheet | requires PortalHost |
| Card | Card | with CardHeader, CardContent, CardFooter |
| Tabs | Tabs | with TabsList, TabsTrigger, TabsContent |
| Toast | Toast | via Sonner pattern |
| Dropdown | DropdownMenu | ref-based control, requires PortalHost |
| Tooltip | Tooltip | requires PortalHost |
| Badge | Badge | — |
| Avatar | Avatar | with AvatarImage, AvatarFallback |
| Accordion | Accordion | — |
| Alert | Alert | — |
| Alert Dialog | AlertDialog | requires PortalHost |
| Progress | Progress | — |
| Skeleton | Skeleton | — |
| Separator | Separator | — |
| Popover | Popover | requires PortalHost |
| Context Menu | ContextMenu | requires PortalHost |
| Collapsible | Collapsible | — |
| Hover Card | HoverCard | web-only behavior |
| Label | Label | — |
| Toggle | Toggle | — |
| Toggle Group | ToggleGroup | — |
| Aspect Ratio | AspectRatio | — |
| Scroll Area | ScrollArea | — |
| Table | Table | — |
| Data Table | DataTable | built on Table |

## Import Pattern

Components are imported from `@/components/ui/`:

```tsx
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
```

## Button Pattern

Unlike web shadcn/ui, React Native requires explicit Text children:

```tsx
// Correct
<Button>
  <Text>Click me</Text>
</Button>

// With variant
<Button variant="destructive">
  <Text>Delete</Text>
</Button>

// Incorrect (won't work in RN)
<Button>Click me</Button>
```

## Icon Pattern

Icons use a wrapper component with `as` prop:

```tsx
import { Icon } from '@/lib/icons';
import { ChevronRight, Mail, Check } from 'lucide-react-native';

// Basic usage
<Icon as={ChevronRight} className="h-4 w-4" />

// With colors
<Icon as={Mail} className="h-5 w-5 text-muted-foreground" />

// In a button
<Button>
  <Icon as={Check} className="mr-2 h-4 w-4" />
  <Text>Confirm</Text>
</Button>
```

## Class Patterns

React Native Reusables uses NativeWind utility classes matching shadcn/ui patterns:

```tsx
// Button variants (from component source)
const buttonVariants = cva(
  'flex-row items-center justify-center rounded-md',
  {
    variants: {
      variant: {
        default: 'bg-primary',
        destructive: 'bg-destructive',
        outline: 'border border-input bg-background',
        secondary: 'bg-secondary',
        ghost: '',
        link: '',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3',
        lg: 'h-11 px-8',
        icon: 'h-10 w-10',
      },
    },
  }
);

// Card
<View className="rounded-lg border border-border bg-card p-6 shadow-sm">
  {/* Card content */}
</View>

// Badge
<View className="inline-flex items-center rounded-full border px-2.5 py-0.5">
  <Text className="text-xs font-semibold">Badge</Text>
</View>
```

Key patterns:
- Semantic color classes: `bg-primary`, `text-foreground`, `border-border`
- Consistent border radius: `rounded-md`, `rounded-lg`, `rounded-full`
- Size variants via height + padding: `h-10 px-4 py-2`
- Flex layout: `flex-row`, `flex-col`, `items-center`, `justify-center`

## Portal Components

Components that render above other content require `PortalHost`:

```tsx
// In _layout.tsx
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

Portal-dependent components:
- Dialog, AlertDialog
- DropdownMenu, ContextMenu
- Popover, Tooltip, HoverCard
- Sheet (bottom sheet)

## Review Checklist

When reviewing components for React Native Reusables compliance:

- [ ] NativeWind configured with `global.css` and `tailwind.config.ts`
- [ ] Components imported from `@/components/ui/*`
- [ ] Uses semantic color classes (`bg-primary`, not `bg-blue-500`)
- [ ] Text wrapped in `<Text>` component (not raw strings)
- [ ] Icons use `<Icon as={...} />` wrapper pattern
- [ ] Button children include `<Text>` wrapper
- [ ] Consistent border radius (uses `rounded-md` or `rounded-lg`)
- [ ] Portal-dependent components have `PortalHost` in layout
- [ ] Touch targets minimum 44x44pt
- [ ] Both light and dark themes supported
- [ ] No hardcoded color values (uses theme variables)
- [ ] Components work on both iOS and Android

## Source URLs

- Official site: https://reactnativereusables.com
- Documentation: https://reactnativereusables.com/docs
- Customization: https://reactnativereusables.com/docs/customization
- GitHub: https://github.com/founded-labs/react-native-reusables
- NativeWind: https://nativewind.dev
- RN Primitives: https://rn-primitives.vercel.app
- Lucide Icons: https://lucide.dev
