# Remix Icons

## Overview

- **Type:** Font-based icon system
- **Style:** Line (outlined) and Fill (solid) — every icon has both styles
- **Icon Count:** 3,200+ icons
- **Naming Convention:** kebab-case with style suffix: `ri-{name}-{line|fill}`
- **Design System Pairings:** Independent (general-purpose, works with any framework)

## CDN Link

```html
<!-- jsDelivr -->
<link href="https://cdn.jsdelivr.net/npm/remixicon@4/fonts/remixicon.css" rel="stylesheet" />

<!-- cdnjs -->
<link href="https://cdnjs.cloudflare.com/ajax/libs/remixicon/4.6.0/remixicon.css" rel="stylesheet" />
```

## HTML Pattern

```html
<!-- Line style (outlined) -->
<i class="ri-home-line"></i>

<!-- Fill style (solid) -->
<i class="ri-home-fill"></i>
```

## Initialization Script

None required (CSS-based font icon system).

## Naming Convention

- **Format:** `ri-{icon-name}-{style}` where style is `line` or `fill`
- **Examples:** `ri-search-line`, `ri-heart-fill`, `ri-settings-3-line`
- **Note:** Some icons have number suffixes (e.g., `ri-settings-3-line`)

## Common Icons Table

| Action | Line Style | Fill Style |
|--------|-----------|------------|
| home | `ri-home-line` | `ri-home-fill` |
| search | `ri-search-line` | `ri-search-fill` |
| settings | `ri-settings-3-line` | `ri-settings-3-fill` |
| user / profile | `ri-user-line` | `ri-user-fill` |
| back / arrow-left | `ri-arrow-left-line` | `ri-arrow-left-fill` |
| forward / arrow-right | `ri-arrow-right-line` | `ri-arrow-right-fill` |
| menu | `ri-menu-line` | `ri-menu-fill` |
| close / x | `ri-close-line` | `ri-close-fill` |
| add / plus | `ri-add-line` | `ri-add-fill` |
| delete / trash | `ri-delete-bin-line` | `ri-delete-bin-fill` |
| edit / pencil | `ri-pencil-line` | `ri-pencil-fill` |
| save | `ri-save-line` | `ri-save-fill` |
| notifications / bell | `ri-notification-2-line` | `ri-notification-2-fill` |
| calendar | `ri-calendar-line` | `ri-calendar-fill` |
| filter | `ri-filter-line` | `ri-filter-fill` |
| sort | `ri-sort-asc` | `ri-sort-desc` |
| download | `ri-download-2-line` | `ri-download-2-fill` |
| upload | `ri-upload-2-line` | `ri-upload-2-fill` |
| share | `ri-share-forward-line` | `ri-share-forward-fill` |
| copy | `ri-file-copy-line` | `ri-file-copy-fill` |
| check / confirm | `ri-check-line` | `ri-check-fill` |
| warning | `ri-alert-line` | `ri-alert-fill` |
| info | `ri-information-line` | `ri-information-fill` |
| error | `ri-close-circle-line` | `ri-close-circle-fill` |
| heart / favorite | `ri-heart-line` | `ri-heart-fill` |
| star | `ri-star-line` | `ri-star-fill` |
| eye / view | `ri-eye-line` | `ri-eye-fill` |
| lock | `ri-lock-line` | `ri-lock-fill` |
| mail | `ri-mail-line` | `ri-mail-fill` |
| phone | `ri-phone-line` | `ri-phone-fill` |
| image | `ri-image-line` | `ri-image-fill` |
| file | `ri-file-line` | `ri-file-fill` |
| folder | `ri-folder-line` | `ri-folder-fill` |
| chevron-down | `ri-arrow-down-s-line` | `ri-arrow-down-s-fill` |
| chevron-right | `ri-arrow-right-s-line` | `ri-arrow-right-s-fill` |
| more-horizontal | `ri-more-2-line` | `ri-more-2-fill` |
| more-vertical | `ri-more-line` | `ri-more-fill` |
| refresh | `ri-refresh-line` | `ri-refresh-fill` |
| external-link | `ri-external-link-line` | `ri-external-link-fill` |
| logout | `ri-logout-box-line` | `ri-logout-box-fill` |

## Size Tokens

```yaml
icons:
  library: "remix"
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
<i class="ri-home-line"></i>         <!-- Correct: line style -->
<i class="ri-home-fill"></i>         <!-- Correct: fill style -->
```

**Gore patterns (invalid):**
```html
<i class="ri-home-line">home</i>    <!-- Text inside = gore -->
<i class="ri-home"></i>              <!-- Missing style suffix (-line or -fill) -->
<i class="remix-home-line"></i>      <!-- Wrong prefix -->
<i class="ri-Home-line"></i>         <!-- Wrong: PascalCase -->
```

**Detection rules:**
- Classes must follow `ri-{name}-{line|fill}` pattern
- Should have **no text content**
- Must include style suffix (`-line` or `-fill`)
- Icon names must be kebab-case between `ri-` and `-line`/`-fill`
