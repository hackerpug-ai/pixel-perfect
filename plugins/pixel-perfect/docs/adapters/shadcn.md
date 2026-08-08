# shadcn/ui

Component adapter for web applications. Provides accessible, composable UI primitives built on Radix UI.

## Platforms

- web-desktop
- web-mobile

## Category

Components

## Scaffold

1. Initialize: `npx shadcn@latest init`
   - Select style (Default or New York)
   - Configure CSS variables: **yes** (required for theme integration)
   - Select base color matching project vibe
   - Configure `components.json` path aliases
2. Verify `components.json` exists at project root
3. Verify `lib/utils.ts` exists with the `cn()` helper
4. Install initial components needed for the project:
   ```bash
   npx shadcn@latest add button card input label
   ```
5. Create a hello-world component that uses a shadcn Button to verify the setup

### Project Structure
shadcn components land in `src/components/ui/` (or as configured in `components.json`). Project-specific atoms and screens live outside this directory:

```
src/
├── components/
│   ├── ui/           # shadcn primitives (managed by CLI)
│   ├── StatusBadge.tsx    # project atoms (built on top of ui/)
│   └── JobCard.tsx
├── screens/
│   └── TodayFeed.tsx
```

## Theme Integration

shadcn uses CSS custom properties for theming. Map the project vibe to these variables in `globals.css`:

```css
@layer base {
  :root {
    --background: /* vibe-derived HSL */;
    --foreground: /* vibe-derived HSL */;
    --primary: /* vibe-derived HSL */;
    --primary-foreground: /* vibe-derived HSL */;
    --secondary: /* vibe-derived HSL */;
    --secondary-foreground: /* vibe-derived HSL */;
    --accent: /* vibe-derived HSL */;
    --accent-foreground: /* vibe-derived HSL */;
    --muted: /* vibe-derived HSL */;
    --muted-foreground: /* vibe-derived HSL */;
    --destructive: /* vibe-derived HSL */;
    --border: /* vibe-derived HSL */;
    --ring: /* vibe-derived HSL */;
    --radius: /* vibe-derived: 0.25rem to 1rem */;
  }

  .dark {
    /* dark mode overrides */
  }
}
```

### Vibe-to-Theme Mapping

| Vibe Keyword | shadcn Impact |
|-------------|--------------|
| clean / minimal | Low-saturation palette, `--radius: 0.375rem`, generous `--muted` range |
| bold / vibrant | High-saturation `--primary`, `--radius: 0.75rem`, strong `--accent` |
| professional | Slate-based neutrals, `--radius: 0.5rem`, subtle `--accent` |
| playful | Multi-hue `--primary`/`--secondary`, `--radius: 1rem`, warm `--muted` |

### Tailwind Bridge
When paired with Tailwind (style adapter), shadcn's CSS variables are automatically available as Tailwind utilities:
- `bg-primary`, `text-primary-foreground`, `border-border`, etc.
- The `@theme` section in CSS connects them

## Verify

### Component Level
- Component imports from `@/components/ui/` for shadcn primitives
- Component uses `cn()` for conditional class merging
- Component respects the CSS variable theme (no hardcoded colors)
- Component has proper TypeScript props interface
- Component handles all interactive states (hover, focus, disabled)
- Accessibility: proper ARIA attributes via Radix primitives

### Screen Level
- Screen composes shadcn primitives + project atoms correctly
- Layout uses shadcn's Card, Sheet, Dialog patterns where appropriate
- Forms use shadcn Form components with proper validation display
- Responsive behavior works (shadcn components are responsive by default)
- Dark mode renders correctly if supported

## Sandbox

shadcn does not include its own sandbox. Pair with Storybook (sandbox adapter) or use the framework dev server.

```bash
# Add new components as needed
npx shadcn@latest add [component-name]

# List available components
npx shadcn@latest add --help
```

### Commonly Used Components by Phase
- **Atoms**: Button, Badge, Input, Label, Avatar, Separator
- **Compose**: Card, Dialog, Sheet, Table, Tabs, Form
- **Integrate**: Navigation Menu, Command, Toast, Sonner
