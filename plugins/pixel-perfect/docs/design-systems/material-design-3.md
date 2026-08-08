# Material Design 3

## Overview

- **CSS Framework:** CSS-in-JS (Material UI uses Emotion); Material Web uses vanilla CSS + CSS variables
- **Component Pattern:** Pre-styled components with theme-based configuration; semantic color roles
- **Official Icon Library:** Material Symbols (variable font); formerly Material Icons
- **Theming Approach:** Design tokens with three-tier system: Seed Tokens → Map Tokens → Alias Tokens

## Token Conventions

Structure for `tokens.yaml` generation:

```yaml
tokens:
  colors:
    # Material Design 3 uses semantic color roles with on-* pairs
    # Three-tier system: Seed Tokens → Map Tokens → Alias Tokens
    # Roles: primary, secondary, tertiary, error, surface (each with on-*, container, on-container variants)
    # Colors are algorithm-generated from a seed color via Material Theme Builder
    format: "hex"
    roles: [primary, on_primary, primary_container, secondary, tertiary, error, surface, on_surface, outline]
  spacing:
    unit: "4dp"
    scale: "multiples of 4dp"
  typography:
    fontFamily: "Roboto, sans-serif"
    # Material type scale: display, headline, title, body, label (each large/medium/small)
    scale: [display_large, headline_large, title_large, body_large, label_large]
  borderRadius:
    # Material uses semantic corner sizes, not pixel values
    scale: { extra_small: "4dp", small: "8dp", medium: "12dp", large: "16dp", extra_large: "28dp", full: "50%" }
  elevation:
    # Material uses 6 elevation levels (0-5) rendered as box-shadow
    levels: [0, 1, 3, 6, 8, 12]
```

Fetch current defaults: see Source URLs below.

## Component Names

| Generic | Material Design 3 | Variants |
|---------|-------------------|----------|
| Button | Button | Text, Tonal, Filled, Elevated, Outlined |
| Text Input | TextField | Filled, Outlined |
| Select | Select / Menu | — |
| Checkbox | Checkbox | — |
| Radio | RadioButton | — |
| Toggle | Switch | — |
| Slider | Slider | Continuous, Discrete |
| Dialog / Modal | Dialog | AlertDialog, FullscreenDialog |
| Bottom Sheet | BottomSheet | Standard, Modal |
| Card | Card | Filled, Elevated, Outlined |
| Tabs | Tabs | Primary, Secondary |
| Toast | Snackbar | — |
| Dropdown | Menu | DropdownMenu, ContextMenu |
| Tooltip | Tooltip | Plain, Rich |
| Navigation | NavigationBar, NavigationRail, NavigationDrawer | — |
| Table | DataTable | — |
| Badge | Badge | — |
| Avatar | — (custom) | — |
| Chip | Chip | Assist, Filter, Input, Suggestion |
| Progress | Progress | Linear, Circular |
| Divider | Divider | — |
| List | List | — |
| FAB | FloatingActionButton | Small, Regular, Large, Extended |

## Mockup CDN Links

```html
<!-- Material Symbols (icons) -->
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" rel="stylesheet" />

<!-- Roboto Font -->
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet" />
```

Note: Material Web components require npm. For mockups, use CSS-only approximations with Material Symbols font.

## Class Patterns

Material Design 3 mockups use semantic class naming:

```html
<!-- Filled Button -->
<button style="background: var(--md-sys-color-primary); color: var(--md-sys-color-on-primary); border-radius: 20px; padding: 10px 24px; font-family: Roboto; font-weight: 500; font-size: 14px; border: none; height: 40px;">
  Filled Button
</button>

<!-- Outlined Button -->
<button style="background: transparent; color: var(--md-sys-color-primary); border: 1px solid var(--md-sys-color-outline); border-radius: 20px; padding: 10px 24px; height: 40px;">
  Outlined Button
</button>

<!-- Card (Elevated) -->
<div style="background: var(--md-sys-color-surface); border-radius: 12px; padding: 16px; box-shadow: 0 1px 2px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.15);">
  Card content
</div>

<!-- Icons -->
<span class="material-symbols-outlined">home</span>
```

Key patterns:
- Buttons use full rounded corners (`border-radius: 20px` for 40px height buttons)
- Elevation via box-shadow, not border
- Color roles: `primary`, `on-primary`, `surface`, `on-surface`
- Typography scale: display, headline, title, body, label (each with large/medium/small)

## Review Checklist

- [ ] Material Symbols font loaded from Google Fonts
- [ ] Roboto font loaded
- [ ] Icons use `<span class="material-symbols-outlined">icon_name</span>` pattern
- [ ] Icon names use snake_case (e.g., `arrow_back`, not `arrow-back`)
- [ ] Buttons use full rounded corners (pill shape)
- [ ] Color scheme follows Material color roles (primary, secondary, tertiary, surface)
- [ ] Cards use elevation (shadow) not borders for depth
- [ ] Navigation follows Material patterns (Bottom nav, Rail, or Drawer)
- [ ] FABs present for primary actions where appropriate
- [ ] Typography uses Roboto with Material type scale
- [ ] No Tailwind classes mixed in

## Source URLs

- Material Design guidelines: https://m3.material.io
- Color system: https://m3.material.io/styles/color/overview
- Material Theme Builder: https://www.figma.com/community/plugin/1034969338659738588
- Typography scale: https://m3.material.io/styles/typography/overview
- Material Symbols: https://fonts.google.com/icons
- Material Web components: https://github.com/nicholasgasior/material-web
