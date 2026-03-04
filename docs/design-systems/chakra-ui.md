# Chakra UI

## Overview

- **CSS Framework:** Panda CSS (v3+); Emotion/styled-components in v2
- **Component Pattern:** Composable "snippet" components generated into your project; semantic tokens via `createSystem()`
- **Official Icon Library:** `@chakra-ui/icons` removed in v3; use Lucide or Tabler Icons
- **Theming Approach:** `createSystem()` config with semantic tokens and CSS variables

## Token Conventions

Chakra v3 uses semantic tokens via `createSystem()`. Colors use oklch format (not hex).

```typescript
import { createSystem, defaultConfig } from '@chakra-ui/react';

export const system = createSystem(defaultConfig, {
  theme: {
    tokens: {
      colors: {
        brand: {
          // oklch format: chakra v3 default palette
          500: { value: 'oklch(0.623 0.214 259.815)' },  // blue equivalent
        },
      },
    },
  },
});
```

For a full default token reference, see: https://chakra-ui.com/docs/get-started/theming

## Component Names

| Generic | Chakra UI | Variants |
|---------|-----------|----------|
| Button | Button | solid, outline, ghost, subtle, link |
| Text Input | Input | — |
| Select | Select | — |
| Checkbox | Checkbox | — |
| Radio | RadioGroup / Radio | — |
| Toggle | Switch | — |
| Slider | Slider | — |
| Dialog / Modal | Dialog (was `Modal` in v2) | — |
| Bottom Sheet | Drawer | — |
| Card | Card | with CardHeader, CardBody, CardFooter |
| Tabs | Tabs | line, enclosed, soft-rounded |
| Toast | Toast | — |
| Dropdown | Menu | — |
| Tooltip | Tooltip | — |
| Stack | Stack, HStack, VStack | — |
| Box | Box | — |
| Grid | Grid, SimpleGrid | — |
| Flex | Flex | — |
| Badge | Badge | solid, subtle, outline |
| Avatar | Avatar | with AvatarBadge, AvatarGroup |
| Accordion | Accordion | — |
| Alert | Alert | info, warning, success, error |
| Breadcrumb | Breadcrumb | — |
| Divider | Divider | — |
| Progress | Progress | — |
| Spinner | Spinner | — |
| Table | Table | simple, striped |
| Pagination | Pagination | — |

## Mockup CDN Links

Chakra UI does not have a traditional CDN for mockups. For HTML mockups, approximate the style:

```html
<!-- Chakra v3 approximation for mockups -->
<style>
  :root {
    /* Chakra v3 uses oklch; these are sRGB approximations for mockup use */
    --chakra-blue-500: #3b82f6;
    --chakra-gray-100: #f4f4f5;
    --chakra-gray-800: #27272a;
    --chakra-radii-md: 0.375rem;
  }
  body { font-family: Inter, system-ui, sans-serif; color: #18181b; }
</style>

<!-- Tabler Icons -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css" />
```

## Class Patterns

Chakra UI is props-based in React, but for mockups use inline styles matching Chakra conventions:

```html
<!-- Solid Button -->
<button style="background: #3182ce; color: white; font-weight: 600; padding: 8px 16px; border-radius: 0.375rem; border: none; font-size: 1rem; height: 40px;">
  Solid Button
</button>

<!-- Outline Button -->
<button style="background: transparent; color: #3182ce; border: 2px solid #3182ce; padding: 8px 16px; border-radius: 0.375rem; font-size: 1rem; height: 40px;">
  Outline
</button>

<!-- Card -->
<div style="border: 1px solid #e2e8f0; border-radius: 0.375rem; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
  Card content
</div>

<!-- Stack (vertical) -->
<div style="display: flex; flex-direction: column; gap: 16px;">
  <!-- items -->
</div>
```

## Review Checklist

- [ ] Component imports from `@chakra-ui/react` (not separate packages)
- [ ] Theme configured via `ChakraProvider` with `createSystem()` value
- [ ] No `@chakra-ui/icons` used (removed in v3)
- [ ] Buttons use Chakra variant patterns (solid, outline, ghost)
- [ ] Cards use border + subtle shadow pattern
- [ ] Layout uses Stack/Flex/Grid patterns
- [ ] Spacing follows 4px base unit scale
- [ ] Border radius consistent (default `md` = 0.375rem)
- [ ] Icons use Lucide or Tabler Icons
- [ ] No Tailwind utility classes or Material Design patterns mixed in
- [ ] Toast/notification patterns match Chakra's Toast component

## Source URLs

- Official site: https://chakra-ui.com
- v3 Getting Started: https://chakra-ui.com/docs/get-started/installation
- v3 Theming: https://chakra-ui.com/docs/get-started/theming
- v3 Components: https://chakra-ui.com/docs/components
- Migration from v2: https://chakra-ui.com/docs/get-started/migration
