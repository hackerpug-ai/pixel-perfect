# Ionicons

## Overview

- **Type:** Web Component icon system (custom `<ion-icon>` element)
- **Style:** Filled (default), Outline, Sharp — via name suffix
- **Icon Count:** 1,300+ icons
- **Naming Convention:** kebab-case with optional variant suffix: `{name}`, `{name}-outline`, `{name}-sharp`
- **Design System Pairings:** Ionic Framework (official), cross-platform mobile apps

## CDN Link

```html
<!-- ESM module (modern browsers) -->
<script type="module" src="https://cdn.jsdelivr.net/npm/ionicons/dist/ionicons/ionicons.esm.js"></script>

<!-- Non-ESM fallback -->
<script nomodule src="https://cdn.jsdelivr.net/npm/ionicons/dist/ionicons/ionicons.js"></script>
```

## HTML Pattern

```html
<!-- Filled (default) -->
<ion-icon name="heart"></ion-icon>

<!-- Outline -->
<ion-icon name="heart-outline"></ion-icon>

<!-- Sharp -->
<ion-icon name="heart-sharp"></ion-icon>

<!-- With sizing -->
<ion-icon name="home" size="large"></ion-icon>
```

## Initialization Script

None — Web Component auto-registers when the script loads.

## Naming Convention

- **Format:** kebab-case with optional style suffix
- **Styles:** default (filled), `-outline`, `-sharp`
- **Examples:** `home`, `home-outline`, `home-sharp`, `person-circle`
- **Uses `name` attribute** on `<ion-icon>` element

## Common Icons Table

| Action | Filled | Outline | Sharp |
|--------|--------|---------|-------|
| home | `home` | `home-outline` | `home-sharp` |
| search | `search` | `search-outline` | `search-sharp` |
| settings | `settings` | `settings-outline` | `settings-sharp` |
| user / profile | `person` | `person-outline` | `person-sharp` |
| back / arrow-left | `arrow-back` | `arrow-back-outline` | `arrow-back-sharp` |
| forward / arrow-right | `arrow-forward` | `arrow-forward-outline` | `arrow-forward-sharp` |
| menu | `menu` | `menu-outline` | `menu-sharp` |
| close / x | `close` | `close-outline` | `close-sharp` |
| add / plus | `add` | `add-outline` | `add-sharp` |
| delete / trash | `trash` | `trash-outline` | `trash-sharp` |
| edit / pencil | `create` | `create-outline` | `create-sharp` |
| save | `checkmark` | `checkmark-outline` | `checkmark-sharp` |
| notifications / bell | `notifications` | `notifications-outline` | `notifications-sharp` |
| calendar | `calendar` | `calendar-outline` | `calendar-sharp` |
| filter | `funnel` | `funnel-outline` | `funnel-sharp` |
| download | `download` | `download-outline` | `download-sharp` |
| upload | `cloud-upload` | `cloud-upload-outline` | `cloud-upload-sharp` |
| share | `share-social` | `share-social-outline` | `share-social-sharp` |
| copy | `copy` | `copy-outline` | `copy-sharp` |
| check / confirm | `checkmark-done` | `checkmark-done-outline` | `checkmark-done-sharp` |
| warning | `warning` | `warning-outline` | `warning-sharp` |
| info | `information-circle` | `information-circle-outline` | `information-circle-sharp` |
| error | `close-circle` | `close-circle-outline` | `close-circle-sharp` |
| heart / favorite | `heart` | `heart-outline` | `heart-sharp` |
| star | `star` | `star-outline` | `star-sharp` |
| eye / view | `eye` | `eye-outline` | `eye-sharp` |
| lock | `lock-closed` | `lock-closed-outline` | `lock-closed-sharp` |
| mail | `mail` | `mail-outline` | `mail-sharp` |
| phone | `call` | `call-outline` | `call-sharp` |
| image | `image` | `image-outline` | `image-sharp` |
| file | `document` | `document-outline` | `document-sharp` |
| folder | `folder` | `folder-outline` | `folder-sharp` |
| chevron-down | `chevron-down` | `chevron-down-outline` | `chevron-down-sharp` |
| chevron-right | `chevron-forward` | `chevron-forward-outline` | `chevron-forward-sharp` |
| more-horizontal | `ellipsis-horizontal` | `ellipsis-horizontal-outline` | `ellipsis-horizontal-sharp` |
| more-vertical | `ellipsis-vertical` | `ellipsis-vertical-outline` | `ellipsis-vertical-sharp` |
| refresh | `refresh` | `refresh-outline` | `refresh-sharp` |
| external-link | `open` | `open-outline` | `open-sharp` |
| logout | `log-out` | `log-out-outline` | `log-out-sharp` |

## Size Tokens

```yaml
icons:
  library: "ionicons"
  sizeScale:
    sm: "small"      # Built-in size attribute
    md: "default"    # No size attribute needed
    lg: "large"      # Built-in size attribute
    xl: "48px"       # Custom via CSS
```

Use `size` attribute (`small`, `large`) or CSS `font-size`.

## Gore Detection

**Valid patterns:**
```html
<ion-icon name="heart"></ion-icon>             <!-- Correct -->
<ion-icon name="heart-outline"></ion-icon>     <!-- Correct -->
<ion-icon name="heart-sharp"></ion-icon>       <!-- Correct -->
```

**Gore patterns (invalid):**
```html
<ion-icon name="heart">heart</ion-icon>        <!-- Text inside = gore -->
<ion-icon>heart</ion-icon>                      <!-- Missing name attribute -->
<i class="ion-heart"></i>                        <!-- Wrong: not a web component -->
<ion-icon name="Heart"></ion-icon>               <!-- Wrong: PascalCase -->
```

**Detection rules:**
- `<ion-icon>` must have a `name` attribute
- Should have **no text content** (the icon is rendered in shadow DOM)
- `name` must be kebab-case
- Variant suffix must be `-outline` or `-sharp` (not `-outlined` or `-sharp-outline`)
