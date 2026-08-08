# Bootstrap Icons

## Overview

- **Type:** SVG icon font
- **Style:** Outlined (single consistent style); some icons have `-fill` variants
- **Icon Count:** 2,000+ icons
- **Naming Convention:** kebab-case with `bi-` prefix: `bi bi-{icon-name}`
- **Design System Pairings:** Bootstrap 5+ (official), general web projects

## CDN Link

```html
<!-- jsDelivr -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1/font/bootstrap-icons.min.css" />

<!-- BootstrapCDN -->
<link rel="stylesheet" href="https://cdn.bootstrapcdn.com/bootstrap-icons/1.11.3/font/bootstrap-icons.css" />
```

## HTML Pattern

```html
<!-- Regular (outlined) -->
<i class="bi bi-house"></i>
<i class="bi bi-search"></i>

<!-- Fill variant -->
<i class="bi bi-heart-fill"></i>
<i class="bi bi-star-fill"></i>
```

## Initialization Script

None required (CSS-based icon font).

## Naming Convention

- **Format:** `bi bi-{icon-name}` (two classes required)
- **Fill variants:** append `-fill` suffix (e.g., `bi-heart-fill`)
- **Examples:** `bi bi-house`, `bi bi-person-circle`, `bi bi-arrow-left`

## Common Icons Table

| Action | Icon Class | Fill Variant |
|--------|-----------|-------------|
| home | `bi bi-house` | `bi bi-house-fill` |
| search | `bi bi-search` | — |
| settings | `bi bi-gear` | `bi bi-gear-fill` |
| user / profile | `bi bi-person` | `bi bi-person-fill` |
| back / arrow-left | `bi bi-arrow-left` | — |
| forward / arrow-right | `bi bi-arrow-right` | — |
| menu | `bi bi-list` | — |
| close / x | `bi bi-x-lg` | — |
| add / plus | `bi bi-plus-lg` | — |
| delete / trash | `bi bi-trash` | `bi bi-trash-fill` |
| edit / pencil | `bi bi-pencil` | `bi bi-pencil-fill` |
| save | `bi bi-check2` | — |
| notifications / bell | `bi bi-bell` | `bi bi-bell-fill` |
| calendar | `bi bi-calendar` | `bi bi-calendar-fill` |
| filter | `bi bi-funnel` | `bi bi-funnel-fill` |
| sort | `bi bi-sort-down` | — |
| download | `bi bi-download` | — |
| upload | `bi bi-upload` | — |
| share | `bi bi-share` | `bi bi-share-fill` |
| copy | `bi bi-clipboard` | `bi bi-clipboard-fill` |
| check / confirm | `bi bi-check-circle` | `bi bi-check-circle-fill` |
| warning | `bi bi-exclamation-triangle` | `bi bi-exclamation-triangle-fill` |
| info | `bi bi-info-circle` | `bi bi-info-circle-fill` |
| error | `bi bi-x-circle` | `bi bi-x-circle-fill` |
| heart / favorite | `bi bi-heart` | `bi bi-heart-fill` |
| star | `bi bi-star` | `bi bi-star-fill` |
| eye / view | `bi bi-eye` | `bi bi-eye-fill` |
| lock | `bi bi-lock` | `bi bi-lock-fill` |
| mail | `bi bi-envelope` | `bi bi-envelope-fill` |
| phone | `bi bi-telephone` | `bi bi-telephone-fill` |
| image | `bi bi-image` | `bi bi-image-fill` |
| file | `bi bi-file-text` | `bi bi-file-text-fill` |
| folder | `bi bi-folder` | `bi bi-folder-fill` |
| chevron-down | `bi bi-chevron-down` | — |
| chevron-right | `bi bi-chevron-right` | — |
| more-horizontal | `bi bi-three-dots` | — |
| more-vertical | `bi bi-three-dots-vertical` | — |
| refresh | `bi bi-arrow-clockwise` | — |
| external-link | `bi bi-box-arrow-up-right` | — |
| logout | `bi bi-box-arrow-right` | — |

## Size Tokens

```yaml
icons:
  library: "bootstrap-icons"
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
<i class="bi bi-house"></i>           <!-- Correct -->
<i class="bi bi-heart-fill"></i>      <!-- Correct: fill variant -->
```

**Gore patterns (invalid):**
```html
<i class="bi bi-house">house</i>     <!-- Text inside = gore -->
<i class="bi-house"></i>              <!-- Missing base `bi` class -->
<i class="bootstrap-house"></i>       <!-- Wrong class format -->
<i class="bi bi-House"></i>           <!-- Wrong: PascalCase -->
```

**Detection rules:**
- Must have BOTH `bi` base class AND `bi-{name}` icon class
- Should have **no text content**
- Icon names must be kebab-case
- Fill variants use `-fill` suffix (not `-filled` or `-solid`)
