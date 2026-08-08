# Mantine

## Overview

- **CSS Framework:** PostCSS modules (v7+); previously Emotion CSS-in-JS
- **Component Pattern:** React-first composable components; props-based configuration; rich feature set
- **Official Icon Library:** Tabler Icons (`@tabler/icons-react`) — recommended and used in Mantine UI
- **Theming Approach:** Theme object with tokens and semantic tokens; CSS variables; 10-shade color palettes

## Token Conventions

```yaml
tokens:
  colors:
    # Mantine uses 10-shade palettes (0-9) for each color family
    # Default primary is blue (shade 6); each family has shades 0 (lightest) to 9 (darkest)
    # Shade 6 is the standard "filled" shade; shade 0 is the "light" variant background
    # Color families: gray, red, pink, grape, violet, indigo, blue, cyan, teal, green, lime, yellow, orange
    format: "hex"
    scale: "10-shade (0-9)"
    primary_shade: 6  # Which shade is used for filled components
    roles: [primary, background, foreground, border]
  spacing:
    unit: "4px"
    scale: { xs: "0.625rem", sm: "0.75rem", md: "1rem", lg: "1.25rem", xl: "2rem" }
  typography:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSizes: { xs: "0.75rem", sm: "0.875rem", md: "1rem", lg: "1.125rem", xl: "1.25rem" }
  borderRadius:
    defaultRadius: "sm"
    scale: { xs: "0.125rem", sm: "0.25rem", md: "0.5rem", lg: "1rem", xl: "2rem" }
```

Fetch current palette values: see Source URLs below.

## Component Names

| Generic | Mantine | Variants |
|---------|---------|----------|
| Button | Button | filled (default), light, outline, subtle, transparent, white, gradient |
| Action Button | ActionIcon | (icon-only button) |
| Text Input | TextInput | — |
| Select | Select | with NativeSelect |
| Checkbox | Checkbox | with Checkbox.Group |
| Radio | Radio | with Radio.Group |
| Toggle | Switch | — |
| Slider | Slider | with RangeSlider |
| Dialog / Modal | Modal | — |
| Bottom Sheet | Drawer | — |
| Card | Card | with Card.Section |
| Tabs | Tabs | default, outline, pills |
| Toast | Notification / notifications | (via @mantine/notifications) |
| Dropdown | Menu | — |
| Tooltip | Tooltip | — |
| Accordion | Accordion | — |
| Avatar | Avatar | with Avatar.Group |
| Badge | Badge | filled, light, outline |
| Breadcrumb | Breadcrumbs | — |
| Divider | Divider | — |
| Progress | Progress | with RingProgress |
| Skeleton | Skeleton | — |
| Table | Table | — |
| Stepper | Stepper | — |
| Timeline | Timeline | — |
| Autocomplete | Autocomplete | — |
| MultiSelect | MultiSelect | — |
| DatePicker | DateInput / DatePicker | (via @mantine/dates) |
| Rating | Rating | — |
| Segmented Control | SegmentedControl | — |
| ColorPicker | ColorInput / ColorPicker | — |
| Stack | Stack | — |
| Group | Group | (horizontal layout) |
| Container | Container | — |
| Grid | Grid / SimpleGrid | — |
| Pagination | Pagination | — |
| Chip | Chip | — |
| Pill | Pill | with PillsInput |
| Code | Code / CodeHighlight | — |

## Mockup CDN Links

Mantine doesn't have a traditional CDN. For mockups, approximate the style:

```html
<style>
  :root {
    --mantine-color-blue-6: #228be6;
    --mantine-color-gray-0: #f8f9fa;
    --mantine-color-gray-3: #dee2e6;
    --mantine-color-gray-7: #495057;
    --mantine-color-gray-9: #212529;
    --mantine-radius-sm: 0.25rem;
    --mantine-radius-md: 0.5rem;
    --mantine-spacing-md: 1rem;
  }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #212529; }
</style>

<!-- Tabler Icons (official Mantine icon library) -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css" />
```

## Class Patterns

Mantine is React props-based. For mockups, use inline styles matching Mantine patterns:

```html
<!-- Filled Button (default) -->
<button style="background: #228be6; color: white; border: none; border-radius: 0.25rem; padding: 7px 18px; font-size: 0.875rem; font-weight: 600; height: 36px; cursor: pointer;">
  Filled
</button>

<!-- Light Button -->
<button style="background: #e7f5ff; color: #228be6; border: none; border-radius: 0.25rem; padding: 7px 18px; font-size: 0.875rem; font-weight: 600; height: 36px;">
  Light
</button>

<!-- Outline Button -->
<button style="background: transparent; color: #228be6; border: 1px solid #228be6; border-radius: 0.25rem; padding: 7px 18px; font-size: 0.875rem; font-weight: 600; height: 36px;">
  Outline
</button>

<!-- Card -->
<div style="background: white; border: 1px solid #dee2e6; border-radius: 0.5rem; padding: 16px;">
  Card content
</div>

<!-- Badge -->
<span style="background: #e7f5ff; color: #228be6; border-radius: 9999px; padding: 3px 10px; font-size: 0.6875rem; font-weight: 700;">
  Badge
</span>
```

Key patterns:
- Blue primary (#228be6) as default accent
- System font stack (Apple-first)
- Compact button height (36px default)
- `sm` default border radius (0.25rem)
- Light variant = lighter shade of primary
- 10-shade color palette system (0-9)

## Review Checklist

- [ ] Primary color matches Mantine blue (#228be6) or configured primary
- [ ] Button variants match Mantine patterns (filled, light, outline, subtle)
- [ ] Uses system font stack
- [ ] Default border radius is `sm` (0.25rem)
- [ ] Color shading follows 10-step scale pattern
- [ ] Icons use Tabler Icons with `ti ti-*` class pattern
- [ ] Cards use border-based containment
- [ ] Spacing follows Mantine scale (xs through xl)
- [ ] No Tailwind, Material, or Bootstrap classes mixed in
- [ ] Light button variant uses lighter shade of primary color

## Source URLs

- Official site: https://mantine.dev
- Default theme: https://mantine.dev/theming/default-theme
- Color palette: https://mantine.dev/theming/colors
- Components list: https://mantine.dev/getting-started
- Spacing / sizes: https://mantine.dev/styles/rem
- Tabler Icons: https://tabler.io/icons
