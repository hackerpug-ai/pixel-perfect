# Tabler Icons

## Overview

- **Type:** SVG icon library with webfont distribution
- **Style:** Outlined (consistent 2px stroke)
- **Icon Count:** 5,900+ icons (largest open-source icon set)
- **Naming Convention:** kebab-case with `ti-` prefix (e.g., `ti ti-home`, `ti ti-search`)
- **Design System Pairings:** Mantine (official), Chakra UI, Park UI, Tabler Dashboard Kit

## CDN Link

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css" />
```

## HTML Pattern

```html
<i class="ti ti-home"></i>
<i class="ti ti-search"></i>
<i class="ti ti-settings"></i>
```

## Initialization Script

None required (CSS-based webfont).

## Naming Convention

- **Format:** kebab-case with `ti-` prefix
- **Class pattern:** `ti ti-{icon-name}`
- **Examples:** `ti ti-home`, `ti ti-arrow-left`, `ti ti-user-circle`

## Common Icons Table

| Action | Icon Class |
|--------|-----------|
| home | `ti ti-home` |
| search | `ti ti-search` |
| settings | `ti ti-settings` |
| user / profile | `ti ti-user` or `ti ti-user-circle` |
| back / arrow-left | `ti ti-arrow-left` |
| forward / arrow-right | `ti ti-arrow-right` |
| menu | `ti ti-menu-2` |
| close / x | `ti ti-x` |
| add / plus | `ti ti-plus` |
| delete / trash | `ti ti-trash` |
| edit / pencil | `ti ti-pencil` or `ti ti-edit` |
| save | `ti ti-check` |
| notifications / bell | `ti ti-bell` |
| calendar | `ti ti-calendar` |
| filter | `ti ti-filter` |
| sort | `ti ti-sort-ascending` |
| download | `ti ti-download` |
| upload | `ti ti-upload` |
| share | `ti ti-share` |
| copy | `ti ti-copy` |
| check / confirm | `ti ti-check` |
| warning | `ti ti-alert-triangle` |
| info | `ti ti-info-circle` |
| error | `ti ti-alert-circle` |
| heart / favorite | `ti ti-heart` |
| star | `ti ti-star` |
| eye / view | `ti ti-eye` |
| lock | `ti ti-lock` |
| mail | `ti ti-mail` |
| phone | `ti ti-phone` |
| image | `ti ti-photo` |
| file | `ti ti-file` |
| folder | `ti ti-folder` |
| chevron-down | `ti ti-chevron-down` |
| chevron-right | `ti ti-chevron-right` |
| more-horizontal | `ti ti-dots` |
| more-vertical | `ti ti-dots-vertical` |
| refresh | `ti ti-refresh` |
| external-link | `ti ti-external-link` |
| logout | `ti ti-logout` |

## Size Tokens

```yaml
icons:
  library: "tabler"
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
<i class="ti ti-home"></i>           <!-- Correct -->
<i class="ti ti-arrow-left"></i>     <!-- Correct -->
```

**Gore patterns (invalid):**
```html
<i class="ti ti-home">home</i>      <!-- Text inside = gore -->
<i class="ti-home"></i>              <!-- Missing base `ti` class -->
<i class="tabler-home"></i>          <!-- Wrong prefix -->
<i class="ti ti-Home"></i>           <!-- Wrong: PascalCase -->
```

**Detection rules:**
- Elements must have BOTH `ti` base class AND `ti-{name}` icon class
- Should have **no text content**
- Icon names must be kebab-case
- Font must be loaded (check for `@tabler/icons-webfont` CSS)
