# Lucide

## Overview

- **Type:** SVG icon library with JS rendering
- **Style:** Outlined (consistent 2px stroke, 24x24 viewBox)
- **Icon Count:** ~1,669 icons
- **Naming Convention:** kebab-case (e.g., `arrow-left`, `chevron-down`)
- **Design System Pairings:** shadcn/ui (official), DaisyUI, Radix UI, Headless UI
- **Note:** Modern fork of Feather Icons with significantly expanded icon set

## CDN Link

```html
<script src="https://unpkg.com/lucide@latest"></script>
```

## HTML Pattern

```html
<i data-lucide="home"></i>
<i data-lucide="search"></i>
<i data-lucide="settings"></i>
```

## Initialization Script

Required after DOM load:

```html
<script>lucide.createIcons();</script>
```

## Naming Convention

- **Format:** kebab-case (lowercase with hyphens)
- **Examples:** `arrow-left`, `chevron-down`, `file-text`, `log-out`
- **No prefixes** — just the icon name directly

## Common Icons Table

| Action | Icon Name |
|--------|-----------|
| home | `home` |
| search | `search` |
| settings | `settings` |
| user / profile | `user` |
| back / arrow-left | `arrow-left` |
| forward / arrow-right | `arrow-right` |
| menu | `menu` |
| close / x | `x` |
| add / plus | `plus` |
| delete / trash | `trash-2` |
| edit / pencil | `pencil` |
| save | `save` |
| notifications / bell | `bell` |
| calendar | `calendar` |
| filter | `filter` |
| sort | `arrow-up-down` |
| download | `download` |
| upload | `upload` |
| share | `share-2` |
| copy | `copy` |
| check / confirm | `check` |
| warning | `alert-triangle` |
| info | `info` |
| error | `x-circle` |
| heart / favorite | `heart` |
| star | `star` |
| eye / view | `eye` |
| lock | `lock` |
| mail | `mail` |
| phone | `phone` |
| image | `image` |
| file | `file` |
| folder | `folder` |
| chevron-down | `chevron-down` |
| chevron-right | `chevron-right` |
| more-horizontal | `more-horizontal` |
| more-vertical | `more-vertical` |
| refresh | `refresh-cw` |
| external-link | `external-link` |
| logout | `log-out` |

## Size Tokens

```yaml
icons:
  library: "lucide"
  sizeScale:
    sm: "16px"    # Inline text, badges
    md: "20px"    # Buttons, inputs
    lg: "24px"    # Navigation, primary actions (default SVG size)
    xl: "32px"    # Empty states, features
```

Apply via CSS: `width` and `height` attributes or CSS on the `<svg>` element.

## Gore Detection

**Valid patterns:**
```html
<i data-lucide="home"></i>           <!-- Correct -->
<i data-lucide="arrow-left"></i>     <!-- Correct -->
```

**Gore patterns (invalid):**
```html
<i data-lucide="home">home</i>      <!-- Text inside = gore -->
<i class="lucide-home"></i>          <!-- Wrong: no class-based rendering -->
<span data-lucide="Home"></span>     <!-- Wrong: PascalCase not kebab-case -->
<i data-lucide="arrow_left"></i>     <!-- Wrong: underscore not hyphen -->
```

**Detection rules:**
- Elements with `data-lucide` attribute should have **no text content**
- After `lucide.createIcons()`, elements are replaced with `<svg>` — if text remains, initialization failed
- Icon names must be kebab-case (no underscores, no PascalCase)
