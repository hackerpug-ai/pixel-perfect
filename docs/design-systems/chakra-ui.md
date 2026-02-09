# Chakra UI

## Overview

- **CSS Framework:** Emotion + styled-components (CSS-in-JS); v3+ built on Panda CSS
- **Component Pattern:** Props-based composable compound components; Slot Recipes for complex components
- **Official Icon Library:** `@chakra-ui/icons` (Chakra's own); Tabler Icons recommended
- **Theming Approach:** Theme object with tokens and semantic tokens; CSS variables support

## Token Conventions

Structure for `tokens.yaml` generation:

```yaml
tokens:
  colors:
    # Chakra uses 10-shade color scales (50-900) per color family
    # Default primary: blue scale; semantic roles: primary, secondary, error, success, warning, info
    # Each shade accessed as color.{shade} (e.g., blue.500)
    format: "hex"
    scale: "10-shade (50, 100, 200, 300, 400, 500, 600, 700, 800, 900)"
    primary_shade: 500          # Default interactive shade
    roles: [primary, secondary, background, foreground, muted, border, error, success, warning, info]
  spacing:
    unit: "4px"
    scale: "Chakra spacing scale (0-96 in 4px increments)"
  typography:
    fontFamily: "Inter, system-ui, sans-serif"
    sizes: { xs: "0.75rem", sm: "0.875rem", md: "1rem", lg: "1.125rem", xl: "1.25rem" }
  borderRadius:
    # Chakra default: md = 0.375rem
    scale: { sm: "0.125rem", md: "0.375rem", lg: "0.5rem", xl: "0.75rem", full: "9999px" }
```

Fetch current defaults: see Source URLs below.

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
| Dialog / Modal | Modal (Dialog) | — |
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
<!-- Use system fonts and custom CSS variables -->
<style>
  :root {
    --chakra-colors-blue-500: #3182ce;
    --chakra-colors-gray-100: #edf2f7;
    --chakra-colors-gray-200: #e2e8f0;
    --chakra-colors-gray-800: #1a202c;
    --chakra-radii-md: 0.375rem;
    --chakra-space-4: 1rem;
  }
  body { font-family: Inter, system-ui, sans-serif; color: #1a202c; }
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

- [ ] Color palette matches Chakra's 10-shade scale approach
- [ ] Buttons use Chakra variant patterns (solid, outline, ghost)
- [ ] Cards use border + subtle shadow pattern
- [ ] Layout uses Stack/Flex/Grid patterns
- [ ] Spacing follows 4px base unit scale
- [ ] Border radius consistent (default `md` = 0.375rem)
- [ ] Icons use Tabler Icons (or Chakra's own icon set)
- [ ] No Tailwind utility classes or Material Design patterns mixed in
- [ ] Toast/notification patterns match Chakra's Toast component

## Source URLs

- Official site: https://chakra-ui.com
- Default theme tokens: https://chakra-ui.com/docs/styled-system/theme
- Color palette: https://chakra-ui.com/docs/styled-system/theme#colors
- Components list: https://chakra-ui.com/docs/components
- Spacing scale: https://chakra-ui.com/docs/styled-system/theme#spacing
