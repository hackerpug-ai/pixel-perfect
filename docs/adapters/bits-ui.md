# Bits UI

Component adapter for **Svelte / SvelteKit**. Bits UI is a library of **headless, unstyled, accessible** component primitives for Svelte 5 — the Svelte counterpart to Radix / Headless UI. It provides behavior, state, and ARIA/keyboard accessibility; **you** supply all styling from the project theme. (shadcn-svelte is built on top of Bits UI — choose Bits UI directly when you want full styling control without a preset look.)

## Platforms

- web-desktop
- web-mobile

## Category

Components

## Scaffold

1. Install:
   ```bash
   npm install bits-ui
   ```
2. Pair with a **style** adapter for the actual look — almost always Tailwind (`docs/adapters/tailwind.md`). Bits UI ships **no** colors, spacing, or fonts of its own.
3. Build project atoms by wrapping Bits UI primitives and applying theme classes. Example `Button` atom:
   ```svelte
   <script lang="ts">
     import { Button } from 'bits-ui';
     interface Props { variant?: 'primary' | 'secondary'; }
     let { variant = 'primary', children, ...rest }: Props = $props();
   </script>

   <Button.Root
     class="inline-flex items-center rounded-[var(--radius)] px-4 py-2 font-medium
            {variant === 'primary'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground'}"
     {...rest}
   >
     {@render children?.()}
   </Button.Root>
   ```

### Project Structure
Bits UI is consumed directly from the package — there is no generated `ui/` folder (unlike shadcn-svelte). Project atoms/molecules live in `src/lib/components/` and import the primitives they need.

```
src/lib/
├── components/
│   ├── Button.svelte      # wraps Bits UI Button.Root + theme classes
│   └── StatusBadge.svelte
└── routes/
```

## Theme Integration

Bits UI has no theme. Styling comes entirely from the **style adapter** and the project theme tokens:

- **Tailwind**: reference theme tokens as utilities (`bg-primary`, `text-muted-foreground`, `rounded-[var(--radius)]`). Define the semantic tokens (`--primary`, `--background`, `--radius`, …) in `app.css` exactly as the shadcn token model (see `docs/adapters/shadcn.md` → Theme Integration; the same `:root` / `.dark` CSS-variable block applies).
- Keep all values semantic (no hardcoded colors) so the project theme — including a `design/theme-seed.json` produced by `design-deconstruct` — drives the look.

## Verify

### Component Level
- Atoms import primitives from `bits-ui` and apply **theme classes only** (no hardcoded colors/spacing)
- Accessibility comes from the primitive (ARIA roles, focus management, keyboard nav) — confirm with `@storybook/addon-a11y`
- Component has a typed `Props` interface (Svelte 5 runes `$props()`)
- All props wired to Storybook `argTypes`

### Screen Level
- Screens compose project atoms (which wrap Bits UI), not raw primitives scattered inline
- Responsive layout uses theme spacing tokens

## Sandbox

Bits UI has no sandbox of its own — pair with the **Storybook** sandbox via the SvelteKit framework adapter (`docs/adapters/sveltekit.md`). Stories render the styled wrapper atoms, not the bare primitives.

```bash
npm run storybook
```

### Notes
- Bits UI targets Svelte 5 (runes, snippets). Use snippet children (`{@render children?.()}`) rather than legacy slots.
- Recommended icons: `@lucide/svelte`.
