# Design Systems Reference

Reference documentation for supported design systems. Used by the pipeline via progressive disclosure — loaded only when a design system is configured.

## Supported Systems

| System | CSS Framework | Icon Library (Default) | Theming | CDN Available |
|--------|---------------|------------------------|---------|---------------|
| [shadcn-ui](shadcn-ui.md) | Tailwind CSS | Lucide | CSS Variables (OKLCH) | Tailwind CDN |
| [material-design-3](material-design-3.md) | CSS-in-JS / CSS Variables | Material Symbols | Design Tokens (3-tier) | Google Fonts |
| [chakra-ui](chakra-ui.md) | Emotion / Panda CSS | Tabler Icons | Theme Object | No |
| [ant-design](ant-design.md) | CSS-in-JS | Ant Design Icons | Seed Tokens | unpkg CDN |
| [radix-ui](radix-ui.md) | Unstyled (BYO) | Radix Icons | Radix Colors | No |
| [headless-ui](headless-ui.md) | Unstyled (BYO) | Heroicons | None (BYO) | No |
| [daisyui](daisyui.md) | Tailwind CSS Plugin | Lucide (recommended) | CSS Variables + Themes | jsDelivr CDN |
| [park-ui](park-ui.md) | Panda CSS | Tabler Icons (recommended) | Panda Tokens | No |
| [mantine](mantine.md) | Emotion / PostCSS | Tabler Icons | Theme Object | No |

## Design System → Icon Library Pairing Matrix

When a design system is selected, the pipeline auto-suggests the paired icon library:

| Design System | Official/Default Icon Library | Alternative Pairings |
|---------------|-------------------------------|----------------------|
| shadcn-ui | **Lucide** | Radix Icons |
| material-design-3 | **Material Symbols** | — |
| chakra-ui | **Tabler Icons** | Lucide, Phosphor |
| ant-design | **Ant Design Icons** | — |
| radix-ui | **Radix Icons** | Lucide |
| headless-ui | **Heroicons** | Lucide |
| daisyui | **Lucide** (recommended) | Font Awesome, Feather |
| park-ui | **Tabler Icons** (recommended) | Lucide, Phosphor |
| mantine | **Tabler Icons** | Lucide |

## Vibe → Icon Library Fallback Table

When no design system is selected, the icon library is suggested based on the design vibe:

| Vibe | Suggested Icon Library | Reason |
|------|------------------------|--------|
| minimal | Lucide | Clean, consistent stroke weight |
| modern | Lucide | Contemporary, widely adopted |
| playful | Phosphor | Multiple weights including duotone |
| corporate | Font Awesome | Industry standard, comprehensive |
| bold | Material Symbols | Variable font axes for weight/fill |
| technical | Tabler | Largest collection, consistent stroke |
| elegant | Feather | Refined, minimal strokes |

## How Progressive Disclosure Works

1. User selects design system during `/pixel-perfect:init`
2. `/pixel-perfect:plan` GATE 2 loads `docs/design-systems/{name}.md`
3. Token generation uses design system defaults
4. Component naming maps to design system equivalents
5. Mockup generation includes correct CDN links and class patterns
6. Review validates design system compliance

## Doc Template

Each design system doc follows this structure:

```
# {Name}
## Overview
## Token Conventions
## Component Names
## Mockup CDN Links
## Class Patterns
## Review Checklist
```
