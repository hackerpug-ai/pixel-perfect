# Park UI

## Overview

- **CSS Framework:** Panda CSS + Ark UI primitives
- **Component Pattern:** Composable Ark UI primitives styled with Panda CSS recipes; framework-agnostic (React, Solid, Vue, Svelte)
- **Official Icon Library:** None official; Tabler Icons commonly used in examples
- **Theming Approach:** Panda CSS token system; CSS variables; semantic design tokens

## Token Conventions

```yaml
tokens:
  colors:
    # Park UI uses semantic color aliases similar to shadcn/ui
    # Default palette is monochrome (black primary); highly configurable
    # Each role has a base + foreground pair (e.g., primary + primary_foreground)
    # Built on Panda CSS token system with CSS variables
    format: "hex"
    roles: [primary, background, foreground, muted, border, accent, destructive, card, success, warning, info]
    foreground_pairs: true  # Each role has a matching _foreground color
  spacing:
    unit: "4px"
    scale: "Panda CSS default spacing scale"
  typography:
    fontFamily: "Inter, system-ui, sans-serif"
  borderRadius:
    # Panda CSS token scale
    scale: { sm: "0.25rem", md: "0.5rem", lg: "1rem", xl: "1.5rem", full: "9999px" }
```

Fetch current token defaults: see Source URLs below.

## Component Names

| Generic | Park UI | Variants |
|---------|---------|----------|
| Button | Button | solid (default), outline, ghost |
| Text Input | Input | — |
| Select | Select | — |
| Checkbox | Checkbox | — |
| Radio | RadioGroup | — |
| Toggle | Switch | — |
| Slider | Slider | — |
| Dialog / Modal | Dialog | — |
| Bottom Sheet | Drawer | — |
| Card | Card | with CardHeader, CardContent, CardFooter |
| Tabs | Tabs | — |
| Toast | Toast | — |
| Dropdown | Menu | — |
| Tooltip | Tooltip | — |
| Accordion | Accordion | — |
| Avatar | Avatar | — |
| Badge | Badge | — |
| Breadcrumb | Breadcrumb | — |
| Carousel | Carousel | — |
| Combobox | Combobox | — |
| Date Picker | DatePicker | — |
| Hover Card | HoverCard | — |
| Number Input | NumberInput | — |
| Pagination | Pagination | — |
| Popover | Popover | — |
| Progress | Progress | — |
| Rating | Rating | — |
| Spinner | Spinner | — |
| Table | Table | with DataTable |
| Tree View | TreeView | — |

## Mockup CDN Links

Park UI uses Panda CSS which doesn't have a traditional CDN. For mockups, approximate the style:

```html
<style>
  :root {
    --colors-primary: #000000;
    --colors-bg: #ffffff;
    --colors-fg: #000000;
    --colors-muted: #f4f4f5;
    --colors-border: #e4e4e7;
    --radii-md: 0.5rem;
    --spacing-4: 1rem;
  }
  body { font-family: Inter, system-ui, sans-serif; color: #09090b; }
</style>

<!-- Tabler Icons (commonly used with Park UI) -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css" />
```

## Class Patterns

Park UI uses Panda CSS atomic classes in React. For mockups, use inline styles:

```html
<!-- Solid Button -->
<button style="background: #000000; color: white; border: none; border-radius: 0.5rem; padding: 8px 16px; font-size: 14px; font-weight: 500; height: 40px; cursor: pointer;">
  Solid
</button>

<!-- Outline Button -->
<button style="background: transparent; color: #000000; border: 1px solid #e4e4e7; border-radius: 0.5rem; padding: 8px 16px; font-size: 14px; font-weight: 500; height: 40px;">
  Outline
</button>

<!-- Ghost Button -->
<button style="background: transparent; color: #000000; border: none; border-radius: 0.5rem; padding: 8px 16px; font-size: 14px; font-weight: 500; height: 40px;">
  Ghost
</button>

<!-- Card -->
<div style="background: white; border: 1px solid #e4e4e7; border-radius: 0.5rem; padding: 24px;">
  Card content
</div>
```

Key patterns:
- Clean, modern aesthetic similar to shadcn/ui
- Monochrome default palette (black primary)
- Consistent border + radius pattern for cards
- Three button variants: solid, outline, ghost
- Built on Ark UI primitives (accessible by default)

## Review Checklist

- [ ] Clean modern aesthetic with consistent spacing
- [ ] Color palette follows Park UI token conventions
- [ ] Buttons use solid/outline/ghost variants
- [ ] Cards use border + border-radius pattern
- [ ] Icons use Tabler Icons (or chosen library)
- [ ] Border radius consistent (default 0.5rem)
- [ ] Font uses Inter or system-ui
- [ ] No Tailwind utility classes (Park UI uses Panda CSS)
- [ ] No Material Design or Bootstrap patterns mixed in

## Source URLs

- Official site: https://park-ui.com
- Theme configuration: https://park-ui.com/docs/overview/introduction
- Components list: https://park-ui.com/docs/components/accordion
- Ark UI primitives: https://ark-ui.com
- Panda CSS tokens: https://panda-css.com/docs/customization/theme
