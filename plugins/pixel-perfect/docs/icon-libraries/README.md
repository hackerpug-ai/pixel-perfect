# Icon Libraries Reference

Reference documentation for supported icon libraries. Used by the pipeline via progressive disclosure — loaded when an icon library is configured or auto-paired with a design system.

## Supported Libraries

| Library | Type | Styles | Icon Count | Naming | CDN |
|---------|------|--------|------------|--------|-----|
| [Lucide](lucide.md) | SVG | Outlined | ~1,669 | kebab-case | unpkg |
| [Material Symbols](material-symbols.md) | Variable Font | Outlined, Rounded, Sharp | 2,500+ | snake_case | Google Fonts |
| [Heroicons](heroicons.md) | SVG | Outline, Solid | 316 | kebab-case | (SVG only) |
| [Phosphor](phosphor.md) | Font/SVG | 6 weights | 1,512+ | kebab-case | jsDelivr |
| [Tabler](tabler.md) | SVG/Font | Outlined | 5,900+ | kebab-case | jsDelivr |
| [Remix](remix.md) | Font | Line, Fill | 3,200+ | kebab-case + style suffix | jsDelivr / cdnjs |
| [Font Awesome](font-awesome.md) | Font | Solid, Regular, Light, Brands | 1,535 free / 8,555+ total | kebab-case | cdnjs / jsDelivr |
| [Ionicons](ionicons.md) | Web Component | Filled, Outline, Sharp | 1,300+ | kebab-case + variant suffix | jsDelivr |
| [Feather](feather.md) | SVG | Outlined | 286 | kebab-case | jsDelivr / unpkg |
| [Ant Design Icons](ant-design-icons.md) | React SVG | Outlined, Filled, TwoTone | 800+ | PascalCase (React) | cdnjs |
| [Bootstrap Icons](bootstrap-icons.md) | Font/SVG | Outlined | 2,000+ | kebab-case | jsDelivr |

## Design System Pairings

| Design System | Default Icon Library |
|---------------|---------------------|
| shadcn-ui | Lucide |
| material-design-3 | Material Symbols |
| chakra-ui | Tabler Icons |
| ant-design | Ant Design Icons |
| radix-ui | Lucide (Radix Icons are React-only) |
| headless-ui | Heroicons (or Lucide for CDN) |
| daisyui | Lucide |
| park-ui | Tabler Icons |
| mantine | Tabler Icons |

## Vibe-Based Defaults

When no design system is selected, icon library is chosen by design vibe:

| Vibe | Icon Library | Reason |
|------|-------------|--------|
| minimal | Lucide | Clean, consistent 24x24 stroke icons |
| modern | Lucide | Contemporary, widely adopted |
| playful | Phosphor | 6 weights including duotone |
| corporate | Font Awesome | Industry standard, comprehensive |
| bold | Material Symbols | Variable font axes for weight adjustment |
| technical | Tabler | Largest collection (5,900+), consistent stroke |
| elegant | Feather | Refined, minimal strokes |

## CDN Priority for Mockups

For HTML mockup generation, libraries with CDN font support are preferred (no JS initialization needed):

1. **Best CDN support:** Material Symbols, Font Awesome, Bootstrap Icons, Remix, Tabler (CSS font)
2. **Good CDN support:** Lucide, Feather, Phosphor (require JS initialization)
3. **Limited CDN:** Ionicons (Web Component), Heroicons (SVG only), Ant Design Icons (React only)

## Doc Template

Each icon library doc follows this structure:

```
# {Name}
## Overview
## CDN Link
## HTML Pattern
## Naming Convention
## Common Icons Table
## Size Tokens
## Gore Detection
```
