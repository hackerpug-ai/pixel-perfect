# Skeleton

Component + design-system adapter for **Svelte / SvelteKit**. Skeleton is a Tailwind-based UI toolkit that ships **both** a styling system (semantic color/typography tokens via themes) and a set of accessible Svelte components. Unlike Bits UI (headless) or shadcn-svelte (copy-in), Skeleton is installed as a dependency and themed centrally.

> **Version note:** validated package names against npm — Skeleton is at **v4** (`@skeletonlabs/skeleton` + `@skeletonlabs/skeleton-svelte`, built for Svelte 5 + Tailwind v4). Skeleton's Tailwind wiring has changed across majors; confirm the exact `@import`/plugin directives against the current docs at https://skeleton.dev during scaffold.

## Platforms

- web-desktop
- web-mobile

## Category

Components (also provides style tokens — it overlaps the style layer; pair it with the Tailwind style adapter rather than a second component library)

## Scaffold

1. Install (requires Tailwind already set up — see `docs/adapters/tailwind.md`):
   ```bash
   npm install @skeletonlabs/skeleton @skeletonlabs/skeleton-svelte
   ```
   - `@skeletonlabs/skeleton` — core: the Tailwind plugin + theme system (framework-agnostic).
   - `@skeletonlabs/skeleton-svelte` — the Svelte 5 components.
2. Register Skeleton + a theme in the global stylesheet (`src/app.css`). With Tailwind v4 this is done via `@import`/`@plugin`/`@source` directives plus a `[data-theme]` selection — **use the exact snippet from the current Skeleton docs** (it is version-specific):
   ```css
   /* src/app.css — shape only; confirm against skeleton.dev */
   @import 'tailwindcss';
   @import '@skeletonlabs/skeleton';
   @import '@skeletonlabs/skeleton/themes/cerberus'; /* or your chosen/ custom theme */
   ```
3. Select the active theme on the root element:
   ```html
   <!-- src/app.html -->
   <html data-theme="cerberus">
   ```
4. Import components from `@skeletonlabs/skeleton-svelte` and build project atoms/screens on top.

### Project Structure
```
src/
├── app.css            # Tailwind + Skeleton plugin + theme import
├── app.html           # <html data-theme="...">
├── lib/components/     # project atoms/molecules using Skeleton components + utility classes
└── routes/
```

## Theme Integration

Skeleton's theme **is** the project theme. It exposes semantic design tokens (e.g. `primary`, `secondary`, `tertiary`, `surface`, plus type scale and spacing) as Tailwind utilities and CSS custom properties.

- Map the project **vibe** to a Skeleton **preset theme** (e.g. clean → a low-chroma theme; bold → a high-contrast theme), or generate a **custom theme** with Skeleton's theme generator and import it instead of a preset.
- When a `design-deconstruct` run produced `design/theme-seed.json`, translate those semantic tokens into a custom Skeleton theme (the token names align: surface/primary/secondary/…).
- Components and atoms reference Skeleton's semantic classes/tokens — never hardcode colors.

| Vibe Keyword | Skeleton Theme Direction |
|--------------|--------------------------|
| clean / minimal | low-chroma preset (e.g. `rose`/`mona`), generous surface range |
| bold / vibrant | high-contrast preset (e.g. `cerberus`/`vintage`), strong primary |
| professional | neutral preset (e.g. `nosh`/`hamlindigo`), restrained accent |
| playful | warm multi-hue preset, larger radii |

## Verify

### Component Level
- Components imported from `@skeletonlabs/skeleton-svelte`
- Styling uses Skeleton tokens / Tailwind utilities — no hardcoded colors
- A theme is selected via `data-theme` and renders in Storybook
- All props wired to Storybook `argTypes`; a11y addon clean

### Screen Level
- Screens use Skeleton layout primitives + theme spacing
- Theme switch (light/dark or alternate `data-theme`) renders correctly

## Sandbox

Pair with the **Storybook** sandbox via the SvelteKit framework adapter (`docs/adapters/sveltekit.md`). Import `app.css` in `.storybook/preview.ts` and set `data-theme` on the preview root (global decorator) so stories render themed.

```bash
npm run storybook
```

### Notes
- Skeleton v4 targets Svelte 5 + Tailwind v4. If the project is on an older Tailwind, follow Skeleton's migration/legacy docs.
- Recommended icons: `@lucide/svelte` (Skeleton is icon-agnostic).
