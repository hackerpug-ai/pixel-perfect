# Ant Design Icons

## Overview

- **Type:** SVG React component library
- **Style:** Outlined, Filled, TwoTone (three themes)
- **Icon Count:** 800+ icons
- **Naming Convention:** PascalCase with theme suffix: `{IconName}Outlined`, `{IconName}Filled`, `{IconName}TwoTone`
- **Design System Pairings:** Ant Design (official)
- **Note:** React-only distribution; no font CDN. For HTML mockups, approximate with inline SVG or Font Awesome.

## CDN Link

Ant Design Icons are primarily React components. For HTML mockups, use an alternative font library:

**Option A: Use Font Awesome as CDN proxy** (similar icon set):
```html
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.0/css/all.min.css" />
```

**Option B: Inline SVG** (copy from ant.design/components/icon):
```html
<!-- No font CDN available -->
```

## HTML Pattern

In React (native usage):
```jsx
import { HomeOutlined, HomeFilled, HomeTwoTone } from '@ant-design/icons';

<HomeOutlined />
<HomeFilled />
<HomeTwoTone twoToneColor="#eb2f96" />
```

For HTML mockups, use Font Awesome equivalents:
```html
<i class="fa-solid fa-house"></i>
```

## Initialization Script

None (React component based). When using Font Awesome fallback, none needed.

## Naming Convention

- **Format (React):** PascalCase with theme suffix
- **Themes:** `Outlined`, `Filled`, `TwoTone`
- **Examples:** `HomeOutlined`, `HeartFilled`, `SettingTwoTone`
- **For mockups:** Map to Font Awesome kebab-case equivalents

## Common Icons Table

| Action | React Component | Font Awesome Equivalent |
|--------|----------------|------------------------|
| home | `HomeOutlined` | `fa-solid fa-house` |
| search | `SearchOutlined` | `fa-solid fa-magnifying-glass` |
| settings | `SettingOutlined` | `fa-solid fa-gear` |
| user / profile | `UserOutlined` | `fa-solid fa-user` |
| back / arrow-left | `ArrowLeftOutlined` | `fa-solid fa-arrow-left` |
| forward / arrow-right | `ArrowRightOutlined` | `fa-solid fa-arrow-right` |
| menu | `MenuOutlined` | `fa-solid fa-bars` |
| close / x | `CloseOutlined` | `fa-solid fa-xmark` |
| add / plus | `PlusOutlined` | `fa-solid fa-plus` |
| delete / trash | `DeleteOutlined` | `fa-solid fa-trash` |
| edit / pencil | `EditOutlined` | `fa-solid fa-pencil` |
| save | `SaveOutlined` | `fa-solid fa-floppy-disk` |
| notifications / bell | `BellOutlined` | `fa-solid fa-bell` |
| calendar | `CalendarOutlined` | `fa-solid fa-calendar` |
| filter | `FilterOutlined` | `fa-solid fa-filter` |
| sort | `SortAscendingOutlined` | `fa-solid fa-sort` |
| download | `DownloadOutlined` | `fa-solid fa-download` |
| upload | `UploadOutlined` | `fa-solid fa-upload` |
| share | `ShareAltOutlined` | `fa-solid fa-share-nodes` |
| copy | `CopyOutlined` | `fa-solid fa-copy` |
| check / confirm | `CheckOutlined` | `fa-solid fa-check` |
| warning | `WarningOutlined` | `fa-solid fa-triangle-exclamation` |
| info | `InfoCircleOutlined` | `fa-solid fa-circle-info` |
| error | `CloseCircleOutlined` | `fa-solid fa-circle-exclamation` |
| heart / favorite | `HeartOutlined` | `fa-solid fa-heart` |
| star | `StarOutlined` | `fa-solid fa-star` |
| eye / view | `EyeOutlined` | `fa-solid fa-eye` |
| lock | `LockOutlined` | `fa-solid fa-lock` |
| mail | `MailOutlined` | `fa-solid fa-envelope` |
| phone | `PhoneOutlined` | `fa-solid fa-phone` |
| image | `PictureOutlined` | `fa-solid fa-image` |
| file | `FileOutlined` | `fa-solid fa-file` |
| folder | `FolderOutlined` | `fa-solid fa-folder` |
| chevron-down | `CaretDownOutlined` | `fa-solid fa-chevron-down` |
| chevron-right | `CaretRightOutlined` | `fa-solid fa-chevron-right` |
| more-horizontal | `EllipsisOutlined` | `fa-solid fa-ellipsis` |
| refresh | `ReloadOutlined` | `fa-solid fa-rotate-right` |
| external-link | `ExportOutlined` | `fa-solid fa-arrow-up-right-from-square` |
| logout | `LogoutOutlined` | `fa-solid fa-arrow-right-from-bracket` |

## Size Tokens

```yaml
icons:
  library: "ant-design-icons"
  sizeScale:
    sm: "14px"
    md: "16px"     # Ant Design default inline size
    lg: "24px"
    xl: "32px"
```

## Gore Detection

Since Ant Design Icons are React components, gore detection for mockups depends on the fallback library used:

**When using Font Awesome fallback:** Apply Font Awesome gore detection rules.

**When using inline SVG:**
- SVG elements should contain `<path>` data, not text
- No empty `<svg>` elements

**Cross-library contamination check:**
- If config says `ant-design-icons`, mockups should NOT use Lucide, Tabler, or Material Symbols patterns
- Font Awesome is acceptable as the approved CDN proxy for Ant Design Icons
