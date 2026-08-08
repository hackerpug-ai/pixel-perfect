# Heroicons

## Overview

- **Type:** SVG library (React/Vue components + inline SVG)
- **Style:** Outline (1.5px stroke, 24x24), Solid (filled, 24x24), Mini (solid, 20x20), Micro (solid, 16x16)
- **Icon Count:** 316 icons
- **Naming Convention:** kebab-case (e.g., `magnifying-glass`, `arrow-left`)
- **Design System Pairings:** Tailwind CSS (official, by Tailwind Labs), Headless UI, Catalyst UI Kit
- **Note:** No font-based CDN; SVG-only. For HTML mockups, use Lucide as CDN alternative (similar names)

## CDN Link

Heroicons does not have a traditional font CDN. For mockups, two approaches:

**Option A: Use Lucide as CDN proxy** (recommended for mockups):
```html
<script src="https://unpkg.com/lucide@latest"></script>
```

**Option B: Inline SVG** (copy from heroicons.com):
```html
<!-- No CDN needed, SVGs are inlined directly -->
```

## HTML Pattern

Heroicons are primarily used as React components:
```jsx
import { HomeIcon } from '@heroicons/react/24/outline'
```

For HTML mockups, use inline SVG or Lucide equivalents:
```html
<!-- Lucide equivalent for mockups -->
<i data-lucide="home"></i>
```

## Initialization Script

None (SVG-based; when using Lucide fallback, use `lucide.createIcons()`).

## Naming Convention

- **Format:** kebab-case (lowercase with hyphens)
- **Examples:** `magnifying-glass`, `arrow-left`, `x-mark`, `bars-3`
- **Note:** Some names differ from other libraries (e.g., `magnifying-glass` instead of `search`)

## Common Icons Table

| Action | Heroicons Name | Lucide Equivalent |
|--------|---------------|-------------------|
| home | `home` | `home` |
| search | `magnifying-glass` | `search` |
| settings | `cog-6-tooth` | `settings` |
| user / profile | `user` | `user` |
| back / arrow-left | `arrow-left` | `arrow-left` |
| forward / arrow-right | `arrow-right` | `arrow-right` |
| menu | `bars-3` | `menu` |
| close / x | `x-mark` | `x` |
| add / plus | `plus` | `plus` |
| delete / trash | `trash` | `trash-2` |
| edit / pencil | `pencil-square` | `pencil` |
| save | — (no direct icon) | `save` |
| notifications / bell | `bell` | `bell` |
| calendar | `calendar` | `calendar` |
| filter | `funnel` | `filter` |
| download | `arrow-down-tray` | `download` |
| upload | `arrow-up-tray` | `upload` |
| share | `share` | `share-2` |
| copy | `document-duplicate` | `copy` |
| check / confirm | `check` | `check` |
| warning | `exclamation-triangle` | `alert-triangle` |
| info | `information-circle` | `info` |
| error | `exclamation-circle` | `x-circle` |
| heart / favorite | `heart` | `heart` |
| star | `star` | `star` |
| eye / view | `eye` | `eye` |
| lock | `lock-closed` | `lock` |
| mail | `envelope` | `mail` |
| phone | `phone` | `phone` |
| image | `photo` | `image` |
| file | `document` | `file` |
| folder | `folder` | `folder` |
| chevron-down | `chevron-down` | `chevron-down` |
| chevron-right | `chevron-right` | `chevron-right` |
| more-horizontal | `ellipsis-horizontal` | `more-horizontal` |
| more-vertical | `ellipsis-vertical` | `more-vertical` |
| refresh | `arrow-path` | `refresh-cw` |
| external-link | `arrow-top-right-on-square` | `external-link` |
| logout | `arrow-left-on-rectangle` | `log-out` |

## Size Tokens

```yaml
icons:
  library: "heroicons"
  sizeScale:
    sm: "16px"    # Micro size (16x16)
    md: "20px"    # Mini size (20x20)
    lg: "24px"    # Default (24x24)
    xl: "32px"    # Scaled up
```

## Gore Detection

Since Heroicons are SVG-based and don't use font rendering, gore detection focuses on:

**Valid patterns:**
```html
<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path ... />
</svg>
```

**Gore patterns (invalid):**
```html
<i class="heroicon-home"></i>          <!-- Wrong: no font-based class system -->
<span class="hero-home"></span>        <!-- Wrong: not a font icon -->
magnifying-glass                        <!-- Raw text, no SVG rendering -->
```

**When using Lucide as CDN fallback**, apply Lucide's gore detection rules instead.
