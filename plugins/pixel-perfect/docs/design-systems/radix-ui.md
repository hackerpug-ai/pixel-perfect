# Radix UI

## Overview

- **CSS Framework:** Unstyled (headless) — bring your own CSS (Tailwind, Panda, Emotion, vanilla CSS)
- **Component Pattern:** Unstyled accessible primitives; headless state management; prop-driven data attributes for styling
- **Official Icon Library:** Radix Icons (`@radix-ui/react-icons`) — 332 crisp 15x15 icons
- **Theming Approach:** No built-in theming; Radix Themes (optional layer) adds theme object; Radix Colors provides 30 color scales

## Token Conventions

Radix UI is unstyled — tokens depend on the styling approach. When Radix Colors is used:

```yaml
tokens:
  colors:
    # Radix Colors uses 12-step scales with semantic step meanings:
    #   1-2: App/subtle backgrounds
    #   3-5: Component backgrounds (normal, hover, active)
    #   6-8: Borders (subtle, normal, hover)
    #   9-10: Solid backgrounds (normal, hover)
    #   11-12: Text (low-contrast, high-contrast)
    # 30 accent color scales available (indigo, blue, cyan, etc.)
    format: "hex"
    scale: "12-step per color family"
    step_semantics: [app_bg, subtle_bg, element_bg, hover_bg, active_bg, subtle_border, border, hover_border, solid_bg, hover_solid, low_text, high_text]
  spacing:
    unit: "4px"
  typography:
    fontFamily: "system-ui, sans-serif"
  borderRadius:
    # Defined by implementor; Radix Themes defaults shown
    scale: { sm: "4px", md: "6px", lg: "8px", xl: "12px", full: "9999px" }
```

Fetch current palette values: see Source URLs below.

## Component Names

| Generic | Radix UI Primitive | Notes |
|---------|-------------------|-------|
| Button | — (not provided) | Implement with `<button>` + styling |
| Dialog / Modal | Dialog | AlertDialog also available |
| Select | Select | — |
| Checkbox | Checkbox | — |
| Radio | RadioGroup | — |
| Toggle | Switch | — |
| Slider | Slider | — |
| Dropdown | DropdownMenu | — |
| Context Menu | ContextMenu | — |
| Tooltip | Tooltip | — |
| Popover | Popover | — |
| Tabs | Tabs | — |
| Accordion | Accordion | — |
| Hover Card | HoverCard | — |
| Progress | Progress | — |
| Avatar | Avatar | — |
| Scroll Area | ScrollArea | — |
| Separator | Separator | — |
| Toggle Group | ToggleGroup | — |
| Toolbar | Toolbar | — |
| Navigation Menu | NavigationMenu | — |
| Collapsible | Collapsible | — |
| Aspect Ratio | AspectRatio | — |
| Form | Form | — |
| Combobox | Combobox | — |

## Mockup CDN Links

Radix UI is unstyled; mockup CDN depends on chosen styling approach. If using with Tailwind (most common):

```html
<script src="https://cdn.tailwindcss.com"></script>

<!-- Radix Icons are React-only; for mockups use Lucide as alternative -->
<script src="https://unpkg.com/lucide@latest"></script>
```

## Class Patterns

Since Radix is unstyled, patterns depend on implementation. Most common pairing is Tailwind:

```html
<!-- Dialog overlay -->
<div class="fixed inset-0 bg-black/50" data-state="open"></div>

<!-- Dialog content -->
<div class="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-6 shadow-lg" data-state="open">
  Dialog content
</div>

<!-- Radix data attributes for styling states -->
<button data-state="open" class="data-[state=open]:bg-gray-100">
  Toggle
</button>
```

Key patterns:
- `data-state` attributes for interactive states (`open`, `closed`, `checked`, `unchecked`)
- `data-highlighted` for menu item focus
- `data-disabled` for disabled states
- CSS selectors target data attributes: `[data-state="open"]`

## Review Checklist

- [ ] Components use data attributes for state styling (not class toggling)
- [ ] Accessible markup (ARIA attributes present via Radix primitives)
- [ ] Styling approach is consistent (all Tailwind, or all custom CSS — not mixed)
- [ ] If Radix Colors used: 12-step color scales applied correctly
- [ ] Dialog/modal uses overlay + centered content pattern
- [ ] Dropdown menus have proper focus management styling
- [ ] Icons use Radix Icons or Lucide (compatible alternative)
- [ ] No pre-styled framework classes mixed in (Material, Bootstrap, etc.)

## Source URLs

- Radix Primitives: https://www.radix-ui.com/primitives
- Radix Colors: https://www.radix-ui.com/colors
- Color scale guide: https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale
- Radix Themes: https://www.radix-ui.com/themes
- Radix Icons: https://www.radix-ui.com/icons
- Components list: https://www.radix-ui.com/primitives/docs/overview/getting-started
