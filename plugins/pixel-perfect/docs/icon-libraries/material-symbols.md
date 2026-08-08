# Material Symbols

## Overview

- **Type:** Variable font (woff2 format, CSS ligatures)
- **Style:** Outlined, Rounded, Sharp (three separate font families)
- **Icon Count:** 2,500+ glyphs with variable font axes (weight, fill, grade, optical size)
- **Naming Convention:** snake_case (lowercase with underscores, e.g., `arrow_forward`, `settings`)
- **Design System Pairings:** Material Design 3 (official), Google products
- **Note:** Successor to Material Icons; uses variable font technology for weight/fill customization

## CDN Link

```html
<!-- Outlined (default/recommended) -->
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" rel="stylesheet" />

<!-- Rounded -->
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded" rel="stylesheet" />

<!-- Sharp -->
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Sharp" rel="stylesheet" />
```

## HTML Pattern

```html
<span class="material-symbols-outlined">home</span>
<span class="material-symbols-rounded">settings</span>
<span class="material-symbols-sharp">search</span>
```

## Initialization Script

None required — uses CSS ligatures. The font renders the icon glyph from the text content.

## Naming Convention

- **Format:** snake_case (lowercase with underscores)
- **Examples:** `arrow_back`, `arrow_forward`, `account_circle`, `more_horiz`
- **Text content** of the element IS the icon name (CSS ligature rendering)

## Common Icons Table

| Action | Icon Name |
|--------|-----------|
| home | `home` |
| search | `search` |
| settings | `settings` |
| user / profile | `person` or `account_circle` |
| back / arrow-left | `arrow_back` |
| forward / arrow-right | `arrow_forward` |
| menu | `menu` |
| close / x | `close` |
| add / plus | `add` |
| delete / trash | `delete` |
| edit / pencil | `edit` |
| save | `save` |
| notifications / bell | `notifications` |
| calendar | `calendar_month` |
| filter | `filter_list` or `filter_alt` |
| sort | `sort` |
| download | `download` |
| upload | `upload` |
| share | `share` |
| copy | `content_copy` |
| check / confirm | `check` or `done` |
| warning | `warning` |
| info | `info` |
| error | `error` |
| heart / favorite | `favorite` |
| star | `star` |
| eye / view | `visibility` |
| lock | `lock` |
| mail | `mail` |
| phone | `call` |
| image | `image` |
| file | `description` |
| folder | `folder` |
| chevron-down | `expand_more` |
| chevron-right | `chevron_right` |
| more-horizontal | `more_horiz` |
| more-vertical | `more_vert` |
| refresh | `refresh` |
| external-link | `open_in_new` |
| logout | `logout` |

## Size Tokens

```yaml
icons:
  library: "material-symbols"
  sizeScale:
    sm: "18px"
    md: "24px"    # Default Material size
    lg: "36px"
    xl: "48px"
```

Apply via CSS `font-size` property on the `<span>` element.

## Gore Detection

**Valid patterns:**
```html
<span class="material-symbols-outlined">home</span>       <!-- Correct -->
<span class="material-symbols-rounded">settings</span>    <!-- Correct -->
```

**Gore patterns (invalid):**
```html
<span class="material-symbols-outlined"></span>            <!-- Empty = gore (no icon rendered) -->
<span class="material-icons">home</span>                   <!-- Wrong: old Material Icons class -->
<span class="material-symbols-outlined">Home</span>        <!-- Wrong: PascalCase -->
<span class="material-symbols-outlined">arrow-back</span>  <!-- Wrong: kebab-case, should be arrow_back -->
<i class="material-symbols-outlined">home</i>              <!-- Acceptable but non-standard (span preferred) -->
```

**Detection rules:**
- Elements with `material-symbols-*` class must have **text content** (the icon name)
- Text content must be snake_case (no hyphens, no PascalCase)
- Class must be one of: `material-symbols-outlined`, `material-symbols-rounded`, `material-symbols-sharp`
- Do NOT confuse with legacy `material-icons` class
