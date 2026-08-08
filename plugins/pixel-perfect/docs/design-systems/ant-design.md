# Ant Design

## Overview

- **CSS Framework:** CSS-in-JS with token-based theming (since v5)
- **Component Pattern:** Pre-styled components with comprehensive API; enterprise-focused
- **Official Icon Library:** `@ant-design/icons` (1000+ SVG icons in Outlined, Filled, TwoTone themes)
- **Theming Approach:** Seed Token system — set a few seed values, algorithm generates full palette

## Token Conventions

Structure for `tokens.yaml` generation:

```yaml
tokens:
  colors:
    # Ant Design uses Seed Token system: set seed values, algorithm generates full palette
    # Roles: primary, success, warning, error, info (each generates 10-shade scale)
    # Text uses opacity-based grading: base (0.88), secondary (0.65), tertiary (0.45)
    format: "hex + rgba for text"
    system: "seed-token-algorithm"
    roles: [primary, success, warning, error, info, text_base, background, border]
  spacing:
    unit: "4px"
    scale: "multiples of 4px"
  typography:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    baseFontSize: "14px"
    # Heading scale: h1=38px, h2=30px, h3=24px, h4=20px, h5=16px
  borderRadius:
    # Ant default: 6px; configurable via borderRadius seed token
    default: "6px"
    scale: { sm: "4px", default: "6px", lg: "8px" }
```

Fetch current defaults: see Source URLs below.

## Component Names

| Generic | Ant Design | Variants |
|---------|-----------|----------|
| Button | Button | default, primary, dashed, text, link |
| Text Input | Input | with Input.Search, Input.TextArea, Input.Password |
| Select | Select | with mode: multiple, tags |
| Checkbox | Checkbox | with Checkbox.Group |
| Radio | Radio | with Radio.Group, Radio.Button |
| Toggle | Switch | — |
| Slider | Slider | — |
| Dialog / Modal | Modal | — |
| Bottom Sheet | Drawer | — |
| Card | Card | with Card.Meta, Card.Grid |
| Tabs | Tabs | line, card, editable-card |
| Toast | message / notification | — |
| Dropdown | Dropdown | — |
| Tooltip | Tooltip | — |
| Menu | Menu | vertical, horizontal, inline |
| Table | Table | with sorter, filter, selection |
| Form | Form | with Form.Item, Form.List |
| Badge | Badge | — |
| Avatar | Avatar | with Avatar.Group |
| Breadcrumb | Breadcrumb | — |
| Pagination | Pagination | simple, mini |
| Steps | Steps | — |
| Progress | Progress | line, circle, dashboard |
| Timeline | Timeline | — |
| Tag | Tag | closable, checkable |
| TreeSelect | TreeSelect | — |
| DatePicker | DatePicker | with RangePicker |
| Upload | Upload | with Dragger |
| Divider | Divider | horizontal, vertical |
| Empty | Empty | — |
| Spin | Spin | — |
| Alert | Alert | success, info, warning, error |

## Mockup CDN Links

```html
<!-- Ant Design CSS (for basic styling reference) -->
<link rel="stylesheet" href="https://unpkg.com/antd@5/dist/reset.css" />

<!-- System font stack (Ant uses system fonts by default) -->
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: rgba(0,0,0,0.88); }
</style>
```

Note: Ant Design Icons are React components; for mockups use inline SVG or approximate with another font-based icon library.

## Class Patterns

Ant Design uses its own class naming convention (`ant-*`):

```html
<!-- Primary Button -->
<button style="background: #1677ff; color: white; border: none; border-radius: 6px; padding: 4px 15px; height: 32px; font-size: 14px; cursor: pointer;">
  Primary
</button>

<!-- Default Button -->
<button style="background: white; color: rgba(0,0,0,0.88); border: 1px solid #d9d9d9; border-radius: 6px; padding: 4px 15px; height: 32px; font-size: 14px;">
  Default
</button>

<!-- Card -->
<div style="background: white; border: 1px solid #f0f0f0; border-radius: 8px; padding: 24px;">
  <div style="font-size: 16px; font-weight: 600; margin-bottom: 12px;">Card Title</div>
  Card content
</div>

<!-- Table -->
<table style="width: 100%; border-collapse: collapse; font-size: 14px;">
  <thead>
    <tr style="background: #fafafa; border-bottom: 1px solid #f0f0f0;">
      <th style="padding: 16px; text-align: left;">Column</th>
    </tr>
  </thead>
</table>
```

Key patterns:
- Clean, professional aesthetic with minimal shadows
- Primary blue (#1677ff) as accent color
- Tables with `#fafafa` header background
- Consistent 6px border radius
- Button height: 32px (default), 24px (small), 40px (large)

## Review Checklist

- [ ] Clean professional aesthetic (enterprise feel)
- [ ] Primary color matches Ant blue (#1677ff) or configured primary
- [ ] Buttons use correct height (32px default) and 6px border radius
- [ ] Tables use header background (#fafafa) and border patterns
- [ ] Form layout follows Ant patterns (label above or beside input)
- [ ] Icons are from Ant Design icon set (Outlined/Filled/TwoTone themes)
- [ ] Typography uses system font stack at 14px base
- [ ] Cards use border (not heavy shadow) pattern
- [ ] No Tailwind, Material, or Bootstrap classes mixed in
- [ ] Spacing follows 4px grid scale

## Source URLs

- Official site: https://ant.design
- Design tokens: https://ant.design/docs/react/customize-theme
- Seed tokens reference: https://ant.design/docs/react/customize-theme#seedtoken
- Color palette algorithm: https://ant.design/docs/spec/colors
- Components list: https://ant.design/components/overview
- Ant Design Icons: https://ant.design/components/icon
