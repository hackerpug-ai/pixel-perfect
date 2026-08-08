# Feather Icons

## Overview

- **Type:** SVG icon library with JS rendering
- **Style:** Outlined (single consistent stroke style, 2px stroke, 24x24)
- **Icon Count:** 286 icons
- **Naming Convention:** kebab-case (e.g., `arrow-left`, `chevron-down`)
- **Design System Pairings:** Minimal design systems, open-source projects
- **Note:** Lucide is the actively maintained fork with 5x more icons. Feather is recommended for elegant/minimal vibes.

## CDN Link

```html
<!-- jsDelivr -->
<script src="https://cdn.jsdelivr.net/npm/feather-icons/dist/feather.min.js"></script>

<!-- unpkg -->
<script src="https://unpkg.com/feather-icons"></script>
```

## HTML Pattern

```html
<i data-feather="home"></i>
<i data-feather="search"></i>
<i data-feather="settings"></i>
```

## Initialization Script

Required after DOM load:

```html
<script>feather.replace();</script>
```

## Naming Convention

- **Format:** kebab-case (lowercase with hyphens)
- **Examples:** `arrow-left`, `chevron-down`, `file-text`, `log-out`
- **Uses `data-feather` attribute** on `<i>` elements
- **Identical naming to Lucide** (Lucide forked from Feather)

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
| delete / trash | `trash-2` or `trash` |
| edit / pencil | `edit-2` or `edit` |
| save | `save` |
| notifications / bell | `bell` |
| calendar | `calendar` |
| filter | `filter` |
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
  library: "feather"
  sizeScale:
    sm: "16px"
    md: "20px"
    lg: "24px"    # Default SVG size
    xl: "32px"
```

Apply via CSS `width` and `height` on the rendered `<svg>`.

## Gore Detection

**Valid patterns:**
```html
<i data-feather="home"></i>           <!-- Correct -->
<i data-feather="arrow-left"></i>     <!-- Correct -->
```

**Gore patterns (invalid):**
```html
<i data-feather="home">home</i>      <!-- Text inside = gore -->
<i class="feather-home"></i>          <!-- Wrong: no class-based rendering -->
<span data-feather="Home"></span>     <!-- Wrong: PascalCase -->
<i data-feather="arrow_left"></i>     <!-- Wrong: underscore not hyphen -->
```

**Detection rules:**
- Elements with `data-feather` attribute should have **no text content**
- After `feather.replace()`, elements are replaced with `<svg>` — if text remains, initialization failed
- Icon names must be kebab-case (no underscores, no PascalCase)
- Limited set (286 icons) — names not in the set won't render
