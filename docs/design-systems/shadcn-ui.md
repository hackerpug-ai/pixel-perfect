# shadcn/ui

## Overview

- **CSS Framework:** Tailwind CSS
- **Component Pattern:** Copy-paste code distribution; composable components built on Radix UI primitives
- **Official Icon Library:** Lucide React (`lucide-react`); also supports Radix Icons
- **Theming Approach:** CSS Variables with OKLCH color format; semantic naming convention
- **Distribution:** Not a traditional npm package — components are copied into your project via CLI

## Token Conventions

Structure for `tokens.yaml` generation:

```yaml
tokens:
  colors:
    # shadcn/ui uses OKLCH color format with semantic role names
    # Roles: background, foreground, primary, secondary, muted, accent, destructive, border, ring
    # Each role has a base + foreground pair (e.g., primary + primary_foreground)
    # Default theme is monochrome (neutral grays); projects customize via CSS variables
    format: "oklch"
    roles: [background, foreground, primary, secondary, muted, accent, destructive, border, ring, card, popover]
  spacing:
    unit: "4px"
    scale: "Tailwind default spacing scale"
  typography:
    fontFamily: "Inter, system-ui, sans-serif"
  borderRadius:
    # shadcn uses a base --radius variable with calculated variants
    system: "calc-based"   # sm/md/lg/xl derived from single base value
    default_base: "0.625rem"
```

Fetch current defaults: see Source URLs below.

## Component Names

Mapping from generic names to shadcn/ui component names:

| Generic | shadcn/ui | Variants |
|---------|-----------|----------|
| Button | Button | default, destructive, outline, secondary, ghost, link |
| Text Input | Input | — |
| Select | Select | — |
| Checkbox | Checkbox | — |
| Radio | RadioGroup | — |
| Toggle | Switch | — |
| Slider | Slider | — |
| Dialog / Modal | Dialog | — |
| Bottom Sheet | Sheet | — |
| Card | Card | with CardHeader, CardContent, CardFooter |
| Tabs | Tabs | — |
| Toast | Sonner (Toast) | — |
| Dropdown | DropdownMenu | — |
| Tooltip | Tooltip | — |
| Navigation | NavigationMenu | — |
| Sidebar | Sidebar | — |
| Table | Table | with DataTable pattern |
| Form | Form | uses react-hook-form + zod |
| Badge | Badge | default, secondary, destructive, outline |
| Avatar | Avatar | with AvatarImage, AvatarFallback |
| Accordion | Accordion | — |
| Alert | Alert | default, destructive |
| Breadcrumb | Breadcrumb | — |
| Calendar | Calendar | — |
| Pagination | Pagination | — |
| Progress | Progress | — |
| Skeleton | Skeleton | — |
| Separator | Separator | — |
| Popover | Popover | — |
| Command | Command | (command palette pattern) |
| Combobox | Combobox | (built on Command + Popover) |
| Carousel | Carousel | — |
| Drawer | Drawer | — |

## Mockup CDN Links

For HTML mockups, include in `<head>`:

```html
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://unpkg.com/lucide@latest"></script>
```

And before `</body>`:

```html
<script>lucide.createIcons();</script>
```

## Class Patterns

shadcn/ui uses Tailwind utility classes with semantic CSS variable references:

```html
<!-- Button variants -->
<button class="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground h-10 px-4 py-2">
  Primary Button
</button>

<button class="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent h-10 px-4 py-2">
  Outline Button
</button>

<!-- Card -->
<div class="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
  Card content
</div>

<!-- Badge -->
<div class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">
  Badge
</div>
```

Key patterns:
- Semantic color classes: `bg-primary`, `text-foreground`, `border-border`
- Consistent border radius via `rounded-md`, `rounded-lg`
- Size variants via height + padding: `h-10 px-4 py-2`
- Focus styles: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

## Review Checklist

When reviewing mockups for shadcn/ui compliance:

- [ ] Tailwind CSS CDN loaded in `<head>`
- [ ] Lucide icons CDN loaded and initialized
- [ ] Uses semantic color classes (`bg-primary`, not `bg-blue-500`)
- [ ] Consistent border radius (uses `rounded-md` or `rounded-lg`)
- [ ] Button variants match shadcn patterns (no custom button styles)
- [ ] Card structure uses border + shadow-sm pattern
- [ ] Form inputs use consistent `h-10 px-3 py-2 rounded-md border` pattern
- [ ] Focus states use `ring-2 ring-ring` pattern
- [ ] Icons use `<i data-lucide="icon-name"></i>` pattern
- [ ] No Material Design, Bootstrap, or other framework classes mixed in

## Source URLs

- Official site: https://ui.shadcn.com
- Theming / CSS variables: https://ui.shadcn.com/docs/theming
- Components list: https://ui.shadcn.com/docs/components
- Default theme colors: https://ui.shadcn.com/themes
- Tailwind CSS defaults: https://tailwindcss.com/docs/theme
