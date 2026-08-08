# Generic Adapter

Fallback adapter for any toolchain not covered by a specific adapter. Enforces the pixel-perfect process without tool-specific guidance.

## Platforms

All platforms: web-desktop, web-mobile, mobile-ios, mobile-android

## Category

Fallback (covers all categories when no specific adapter is selected)

## Scaffold

1. Read `design/manifest.json` for tool choices
2. Create project structure appropriate for the platform:
   - Source directory for components
   - Theme/config file location
   - Story file convention (co-located with components)
3. Generate a theme file based on the project vibe:
   - Color palette (primary, secondary, accent, neutral, semantic)
   - Typography scale
   - Spacing scale
   - Border radius / shape tokens
4. Create a "hello world" component that uses the theme
5. Create a corresponding Storybook story with controls (argTypes for all props)
6. Generate Design Token stories (Colors, Typography, Spacing) under `Design System/` group
7. Verify the component renders in Storybook

No specific install commands are provided. The AI uses its general knowledge of the chosen tools to determine package installation and configuration.

## Theme Integration

Generate a theme file in whatever format the project's tools expect:
- TypeScript/JavaScript: `theme.ts` or `theme.js`
- CSS: `theme.css` or CSS custom properties
- JSON: `theme.json` for tool-agnostic consumption

The theme must express the project's vibe from the manifest. Map vibe keywords to concrete values:
- "clean" / "minimal" → generous whitespace, muted palette, thin borders
- "bold" / "vibrant" → saturated colors, strong contrast, heavier type weights
- "professional" → neutral palette, consistent spacing, subdued accents
- "playful" → rounded corners, varied colors, dynamic spacing

## Verify

### Component Level
- File exists at the path recorded in manifest
- Story file exists alongside component with `argTypes` for all props
- Component compiles without errors
- Component uses theme tokens (not hardcoded values)
- Story title uses `Components/` prefix

### Screen Level
- Screen file exists at the path recorded in manifest
- Screen composes atoms listed in manifest
- Screen compiles without errors
- Layout uses theme spacing (not arbitrary values)
- Story title uses `Screens/` prefix

## Sandbox

Storybook is always the sandbox. If no specific Storybook configuration is known for the chosen tools, use the generic `@storybook/react-vite` setup and configure theme wrapping manually.
