# Font Awesome

## Overview

- **Type:** Font-based icon toolkit
- **Style:** Solid, Regular, Light, Brands (free: Solid + Regular + Brands)
- **Icon Count:** 1,535 free / 8,555+ total (with Pro)
- **Naming Convention:** kebab-case with style prefix: `fa-{style} fa-{icon-name}`
- **Design System Pairings:** Bootstrap (common pairing), general enterprise/corporate
- **Note:** Most widely adopted icon library; extensive brand icon collection

## CDN Link

```html
<!-- cdnjs (recommended) -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.0/css/all.min.css" />

<!-- jsDelivr -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6/css/all.min.css" />
```

## HTML Pattern

```html
<!-- Solid (default) -->
<i class="fa-solid fa-house"></i>

<!-- Regular (outlined) -->
<i class="fa-regular fa-heart"></i>

<!-- Brands -->
<i class="fa-brands fa-github"></i>
```

## Initialization Script

None required (CSS-based font).

## Naming Convention

- **Format:** `fa-{style} fa-{icon-name}`
- **Styles:** `fa-solid` (fas), `fa-regular` (far), `fa-light` (fal, Pro only), `fa-brands` (fab)
- **Examples:** `fa-solid fa-house`, `fa-regular fa-heart`, `fa-brands fa-github`
- **Note:** v6 uses descriptive names (e.g., `fa-house` not `fa-home`); many aliases exist for backward compatibility

## Common Icons Table

| Action | Icon Class (Solid) |
|--------|-------------------|
| home | `fa-solid fa-house` |
| search | `fa-solid fa-magnifying-glass` |
| settings | `fa-solid fa-gear` |
| user / profile | `fa-solid fa-user` or `fa-solid fa-circle-user` |
| back / arrow-left | `fa-solid fa-arrow-left` |
| forward / arrow-right | `fa-solid fa-arrow-right` |
| menu | `fa-solid fa-bars` |
| close / x | `fa-solid fa-xmark` |
| add / plus | `fa-solid fa-plus` |
| delete / trash | `fa-solid fa-trash` or `fa-solid fa-trash-can` |
| edit / pencil | `fa-solid fa-pencil` or `fa-solid fa-pen` |
| save | `fa-solid fa-floppy-disk` |
| notifications / bell | `fa-solid fa-bell` |
| calendar | `fa-solid fa-calendar` |
| filter | `fa-solid fa-filter` |
| sort | `fa-solid fa-sort` |
| download | `fa-solid fa-download` |
| upload | `fa-solid fa-upload` |
| share | `fa-solid fa-share-nodes` |
| copy | `fa-solid fa-copy` |
| check / confirm | `fa-solid fa-check` |
| warning | `fa-solid fa-triangle-exclamation` |
| info | `fa-solid fa-circle-info` |
| error | `fa-solid fa-circle-exclamation` |
| heart / favorite | `fa-solid fa-heart` |
| star | `fa-solid fa-star` |
| eye / view | `fa-solid fa-eye` |
| lock | `fa-solid fa-lock` |
| mail | `fa-solid fa-envelope` |
| phone | `fa-solid fa-phone` |
| image | `fa-solid fa-image` |
| file | `fa-solid fa-file` |
| folder | `fa-solid fa-folder` |
| chevron-down | `fa-solid fa-chevron-down` |
| chevron-right | `fa-solid fa-chevron-right` |
| more-horizontal | `fa-solid fa-ellipsis` |
| more-vertical | `fa-solid fa-ellipsis-vertical` |
| refresh | `fa-solid fa-rotate-right` |
| external-link | `fa-solid fa-arrow-up-right-from-square` |
| logout | `fa-solid fa-arrow-right-from-bracket` |

## Size Tokens

```yaml
icons:
  library: "font-awesome"
  sizeScale:
    sm: "0.875em"    # fa-sm
    md: "1em"        # default
    lg: "1.25em"     # fa-lg
    xl: "1.5em"      # fa-xl
```

Font Awesome also provides sizing classes: `fa-2xs`, `fa-xs`, `fa-sm`, `fa-lg`, `fa-xl`, `fa-2xl`.

## Gore Detection

**Valid patterns:**
```html
<i class="fa-solid fa-house"></i>       <!-- Correct: solid style -->
<i class="fa-regular fa-heart"></i>     <!-- Correct: regular style -->
<i class="fa-brands fa-github"></i>     <!-- Correct: brand icon -->
```

**Gore patterns (invalid):**
```html
<i class="fa-solid fa-house">house</i>  <!-- Text inside = gore -->
<i class="fa-house"></i>                 <!-- Missing style prefix -->
<i class="fa fa-house"></i>              <!-- Outdated v4 prefix (use fa-solid) -->
<i class="font-awesome-house"></i>       <!-- Wrong class format entirely -->
```

**Detection rules:**
- Must have style class (`fa-solid`, `fa-regular`, `fa-light`, `fa-brands`) AND icon class (`fa-{name}`)
- Should have **no text content**
- v6 style: `fa-solid fa-{name}` (not legacy `fa fa-{name}`)
- Icon names must be kebab-case
