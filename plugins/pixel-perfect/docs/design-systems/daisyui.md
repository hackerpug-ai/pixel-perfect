# DaisyUI

## Overview

- **CSS Framework:** Tailwind CSS plugin (CSS variables underneath; pure CSS, no JavaScript dependency)
- **Component Pattern:** Class-based semantic naming; Tailwind-first; high-level abstraction of Tailwind utilities
- **Official Icon Library:** None official; recommends Lucide, Feather Icons, or Font Awesome
- **Theming Approach:** CSS variables for semantic colors; 35+ pre-built themes; easy custom theme generation

## Token Conventions

```yaml
tokens:
  colors:
    # DaisyUI uses semantic color names with HSL values under the hood
    # Colors change per theme (35+ built-in themes); "light" theme is default
    # Roles: primary, secondary, accent, neutral — each with a _content pair
    # Status: info, success, warning, error
    # Backgrounds: base_100 (lightest), base_200, base_300, base_content
    format: "hsl (CSS variables)"
    roles: [primary, secondary, accent, neutral, base_100, base_200, base_300, info, success, warning, error]
    content_pairs: true  # Each role has a matching _content color for text
  spacing:
    unit: "4px"
    scale: "Tailwind default spacing scale"
  typography:
    fontFamily: "system-ui, sans-serif"
  borderRadius:
    # DaisyUI uses CSS variables for radius categories
    system: "css-variables"
    variables: ["--rounded-box", "--rounded-btn", "--rounded-badge"]
```

Fetch current theme defaults: see Source URLs below.

## Component Names

| Generic | DaisyUI | Class Pattern |
|---------|---------|---------------|
| Button | btn | `btn btn-primary`, `btn btn-outline` |
| Text Input | input | `input input-bordered` |
| Select | select | `select select-bordered` |
| Checkbox | checkbox | `checkbox` |
| Radio | radio | `radio` |
| Toggle | toggle | `toggle` |
| Slider | range | `range` |
| Dialog / Modal | modal | `modal` with `modal-box` |
| Card | card | `card` with `card-body` |
| Tabs | tabs | `tabs tabs-boxed` |
| Toast | toast | `toast` |
| Dropdown | dropdown | `dropdown` with `dropdown-content` |
| Tooltip | tooltip | `tooltip` |
| Navbar | navbar | `navbar` |
| Menu | menu | `menu` |
| Badge | badge | `badge badge-primary` |
| Avatar | avatar | `avatar` |
| Accordion | collapse | `collapse collapse-arrow` |
| Alert | alert | `alert alert-info` |
| Breadcrumb | breadcrumbs | `breadcrumbs` |
| Divider | divider | `divider` |
| Progress | progress | `progress` |
| Steps | steps | `steps` |
| Table | table | `table table-zebra` |
| Stat | stat | `stats` with `stat` |
| Chat Bubble | chat | `chat chat-start` |
| Rating | rating | `rating` |
| Carousel | carousel | `carousel` |
| Drawer | drawer | `drawer` |
| Pagination | join | `join` with `btn` |
| Countdown | countdown | `countdown` |
| Loading | loading | `loading loading-spinner` |

## Mockup CDN Links

```html
<!-- DaisyUI + Tailwind (CDN) -->
<link href="https://cdn.jsdelivr.net/npm/daisyui@5" rel="stylesheet" type="text/css" />
<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>

<!-- Icons (recommended: Lucide) -->
<script src="https://unpkg.com/lucide@latest"></script>
```

With theme selection:
```html
<html data-theme="light">
<!-- or data-theme="dark", "cupcake", "bumblebee", "emerald", "corporate", etc. -->
```

## Class Patterns

DaisyUI uses semantic class names (high-level Tailwind abstractions):

```html
<!-- Primary Button -->
<button class="btn btn-primary">Primary</button>

<!-- Outline Button -->
<button class="btn btn-outline">Outline</button>

<!-- Ghost Button -->
<button class="btn btn-ghost">Ghost</button>

<!-- Card -->
<div class="card bg-base-100 shadow-xl">
  <div class="card-body">
    <h2 class="card-title">Card Title</h2>
    <p>Card content</p>
    <div class="card-actions justify-end">
      <button class="btn btn-primary">Action</button>
    </div>
  </div>
</div>

<!-- Alert -->
<div class="alert alert-info">
  <span>Info message</span>
</div>

<!-- Navbar -->
<div class="navbar bg-base-100">
  <div class="flex-1">
    <a class="btn btn-ghost text-xl">App Name</a>
  </div>
  <div class="flex-none">
    <button class="btn btn-square btn-ghost">
      <i data-lucide="menu"></i>
    </button>
  </div>
</div>
```

Key patterns:
- Semantic class names: `btn`, `card`, `alert`, `navbar` (not raw Tailwind utilities)
- Color modifiers: `btn-primary`, `btn-secondary`, `btn-accent`, `btn-error`
- Size modifiers: `btn-xs`, `btn-sm`, `btn-md`, `btn-lg`
- Can mix DaisyUI classes with Tailwind utilities freely
- Theme via `data-theme` attribute on `<html>`

## Review Checklist

- [ ] DaisyUI CDN loaded in `<head>` (before Tailwind)
- [ ] Tailwind CSS loaded (required as base)
- [ ] Uses DaisyUI semantic classes (`btn`, `card`, `alert`), not raw Tailwind for components
- [ ] Color modifiers use DaisyUI naming (`btn-primary`, not `bg-blue-500`)
- [ ] `data-theme` attribute set on `<html>` element
- [ ] Cards use `card` > `card-body` structure
- [ ] Buttons use `btn` base class with modifiers
- [ ] Icons use Lucide (or chosen icon library), not emoji or text placeholders
- [ ] Tables use `table` class (optional: `table-zebra`)
- [ ] No Material Design or Bootstrap classes mixed in

## Source URLs

- Official site: https://daisyui.com
- Theme generator: https://daisyui.com/theme-generator
- Built-in themes list: https://daisyui.com/docs/themes
- Components list: https://daisyui.com/components
- Colors / semantic naming: https://daisyui.com/docs/colors
- Tailwind CSS defaults: https://tailwindcss.com/docs/theme
