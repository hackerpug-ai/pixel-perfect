# Phosphor Icons

## Overview

- **Type:** Font-based icon system (CSS/SVG)
- **Style:** 6 weights — Thin, Light, Regular, Bold, Fill, Duotone
- **Icon Count:** 1,512+ icons
- **Naming Convention:** kebab-case with weight prefix class (e.g., `ph ph-house`, `ph-bold ph-heart`)
- **Design System Pairings:** Independent (works with any framework); recommended for playful vibes
- **Note:** Unique duotone weight allows two-tone icons

## CDN Link

```html
<!-- Regular weight (default) -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@phosphor-icons/web@2/src/regular/style.css" />

<!-- Bold weight -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@phosphor-icons/web@2/src/bold/style.css" />

<!-- All weights -->
<script src="https://unpkg.com/@phosphor-icons/web"></script>
```

## HTML Pattern

```html
<!-- Regular -->
<i class="ph ph-house"></i>

<!-- Bold -->
<i class="ph-bold ph-heart"></i>

<!-- Light -->
<i class="ph-light ph-magnifying-glass"></i>

<!-- Fill -->
<i class="ph-fill ph-star"></i>

<!-- Duotone -->
<i class="ph-duotone ph-bell"></i>
```

Format: `ph-[weight] ph-[icon-name]` (regular weight uses just `ph`)

## Initialization Script

None required (CSS-based font icon system).

## Naming Convention

- **Format:** kebab-case (lowercase with hyphens)
- **Prefix:** `ph-` before icon name in class
- **Weight prefix:** `ph` (regular), `ph-thin`, `ph-light`, `ph-bold`, `ph-fill`, `ph-duotone`
- **Examples:** `ph-house`, `ph-magnifying-glass`, `ph-gear`, `ph-share-network`

## Common Icons Table

| Action | Icon Name (class) |
|--------|-------------------|
| home | `ph-house` |
| search | `ph-magnifying-glass` |
| settings | `ph-gear` |
| user / profile | `ph-user` |
| back / arrow-left | `ph-arrow-left` |
| forward / arrow-right | `ph-arrow-right` |
| menu | `ph-list` |
| close / x | `ph-x` |
| add / plus | `ph-plus` |
| delete / trash | `ph-trash` |
| edit / pencil | `ph-pencil` or `ph-note-pencil` |
| save | `ph-floppy-disk` |
| notifications / bell | `ph-bell` |
| calendar | `ph-calendar` |
| filter | `ph-funnel` |
| sort | `ph-sort-ascending` |
| download | `ph-download` |
| upload | `ph-upload` |
| share | `ph-share-network` |
| copy | `ph-copy` |
| check / confirm | `ph-check` |
| warning | `ph-warning` |
| info | `ph-info` |
| error | `ph-warning-circle` |
| heart / favorite | `ph-heart` |
| star | `ph-star` |
| eye / view | `ph-eye` |
| lock | `ph-lock` |
| mail | `ph-envelope` |
| phone | `ph-phone` |
| image | `ph-image` |
| file | `ph-file` |
| folder | `ph-folder` |
| chevron-down | `ph-caret-down` |
| chevron-right | `ph-caret-right` |
| more-horizontal | `ph-dots-three` |
| more-vertical | `ph-dots-three-vertical` |
| refresh | `ph-arrow-clockwise` |
| external-link | `ph-arrow-square-out` |
| logout | `ph-sign-out` |

## Size Tokens

```yaml
icons:
  library: "phosphor"
  sizeScale:
    sm: "16px"
    md: "20px"
    lg: "24px"
    xl: "32px"
```

Apply via CSS `font-size` property.

## Gore Detection

**Valid patterns:**
```html
<i class="ph ph-house"></i>              <!-- Regular weight -->
<i class="ph-bold ph-heart"></i>         <!-- Bold weight -->
<i class="ph-fill ph-star"></i>          <!-- Fill weight -->
```

**Gore patterns (invalid):**
```html
<i class="ph ph-house">house</i>        <!-- Text inside = gore -->
<i class="ph-house"></i>                  <!-- Missing weight prefix class -->
<i class="phosphor-house"></i>            <!-- Wrong prefix -->
<i class="ph ph-House"></i>               <!-- Wrong: PascalCase -->
```

**Detection rules:**
- Elements with `ph` or `ph-*` weight class should have **no text content**
- Must have both weight class AND icon class (e.g., `ph ph-house`, not just `ph-house`)
- Icon names must be kebab-case after `ph-` prefix
- Duotone weight renders two layers — special CSS may be needed
