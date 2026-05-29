# shadcn-svelte

Component adapter for **Svelte / SvelteKit**. The Svelte port of shadcn/ui: accessible, composable components built on **Bits UI** primitives and styled with Tailwind + CSS custom properties. Components are **copied into your project** (not imported from a package) via the `shadcn-svelte` CLI, so you own and can edit them.

> **Verified CLI surface** (shadcn-svelte 1.x): `init`, `add [components...]`, with `add --all` / `--overwrite` / `--yes` flags. Use `@latest`.

## Platforms

- web-desktop
- web-mobile

## Category

Components

## Scaffold

1. Initialize (requires Tailwind — see `docs/adapters/tailwind.md`):
   ```bash
   npx shadcn-svelte@latest init
   ```
   - Configures CSS variables for theming (**yes** — required for theme integration)
   - Sets base color matching the project vibe
   - Writes `components.json`, the `cn()` util to `$lib/utils.ts`, and theme variables into `src/app.css`
2. Verify `components.json` exists at project root and `$lib/utils.ts` exports `cn()`.
3. Add the components the project needs:
   ```bash
   npx shadcn-svelte@latest add button card input label
   ```
4. Create a hello-world atom that uses a shadcn-svelte `Button` to verify the setup.

### Project Structure
shadcn-svelte components land in `$lib/components/ui/` (per `components.json`). Project-specific atoms and screens live outside that directory and compose the primitives:

```
src/lib/
├── components/
│   ├── ui/                 # shadcn-svelte primitives (managed by CLI)
│   ├── StatusBadge.svelte  # project atoms (built on ui/)
│   └── JobCard.svelte
└── ...
src/routes/                  # SvelteKit pages compose screens
```

> **Pull-all during scaffold:** when `tools.components` is `shadcn-svelte`, the scaffold command pulls every component up front with `npx shadcn-svelte@latest add --all --overwrite` and generates a story per component (mirrors the shadcn/React flow — see `commands/scaffold.md` Step 2b).

## Theme Integration

shadcn-svelte uses the **same CSS-custom-property theme model as shadcn/ui**. Map the project vibe to these variables in `src/app.css`:

```css
@layer base {
  :root {
    --background: /* vibe-derived */;
    --foreground: /* vibe-derived */;
    --primary: /* vibe-derived */;
    --primary-foreground: /* vibe-derived */;
    --secondary: /* vibe-derived */;
    --muted: /* vibe-derived */;
    --muted-foreground: /* vibe-derived */;
    --accent: /* vibe-derived */;
    --destructive: /* vibe-derived */;
    --border: /* vibe-derived */;
    --ring: /* vibe-derived */;
    --radius: /* vibe-derived: 0.25rem to 1rem */;
  }
  .dark { /* dark mode overrides */ }
}
```

### Vibe-to-Theme Mapping
| Vibe Keyword | Impact |
|-------------|--------|
| clean / minimal | Low-saturation palette, `--radius: 0.375rem`, generous `--muted` range |
| bold / vibrant | High-saturation `--primary`, `--radius: 0.75rem`, strong `--accent` |
| professional | Slate-based neutrals, `--radius: 0.5rem`, subtle `--accent` |
| playful | Multi-hue `--primary`/`--secondary`, `--radius: 1rem`, warm `--muted` |

When a `design-deconstruct` run produced `design/theme-seed.json`, write those semantic tokens straight into this `:root` / `.dark` block instead of deriving from vibe keywords (the token names align 1:1).

### Tailwind Bridge
The CSS variables are exposed as Tailwind utilities (`bg-primary`, `text-primary-foreground`, `border-border`, …) via the Tailwind theme wiring that `init` sets up.

## Verify

### Component Level
- Component imports primitives from `$lib/components/ui/`
- Uses `cn()` for conditional class merging
- Respects the CSS-variable theme (no hardcoded colors)
- Typed `Props` interface (Svelte 5 runes `$props()`); snippet children, not legacy slots
- Accessibility via the underlying Bits UI primitive (confirm with `@storybook/addon-a11y`)

### Screen Level
- Screens compose `ui/` primitives + project atoms
- Uses Card / Dialog / Sheet patterns where appropriate
- Responsive + dark mode render correctly

## Sandbox

shadcn-svelte has no sandbox of its own — pair with **Storybook** via the SvelteKit framework adapter (`docs/adapters/sveltekit.md`).

```bash
# add more components as needed
npx shadcn-svelte@latest add [component]

# pull everything (scaffold)
npx shadcn-svelte@latest add --all --overwrite
```

### Commonly Used Components by Phase
- **Atoms**: Button, Badge, Input, Label, Avatar, Separator
- **Compose**: Card, Dialog, Sheet, Table, Tabs, Form
- **Integrate**: Command, Sonner (toasts), Navigation Menu

### Notes
- Built on **Bits UI** — if you want headless primitives without the preset shadcn look, use the `bits-ui` adapter instead.
- Recommended icons: `@lucide/svelte`.
