---
id: shadcn-tailwind-web
name: shadcn/ui + Tailwind (Web)
appliesTo:
  platforms: [web-desktop, web-mobile]
  frameworks: [react, nextjs, vite]
  styleSystem: tailwind
  componentLibrary: shadcn
source: builtin
canonicalDocs: https://ui.shadcn.com/docs
lastUpdated: 2026-06-13
---

# shadcn/ui + Tailwind (Web) — Styling Contract

This contract **extends `tailwind-web`**: all styling is Tailwind utility classes applied via `className`, and the `fabrio`-class anti-patterns (global custom-class CSS, inline `style={{}}`, arbitrary hex) are equally forbidden. The shadcn layer adds three conventions on top: theme tokens are shadcn's CSS custom properties consumed as utilities, conditional classes are merged with the `cn()` helper, and primitives are sourced from `@/components/ui/`.

The drift to avoid is identical to Tailwind (a parallel global-CSS system), plus the shadcn-specific drift of hardcoding colors instead of using the CSS-variable token utilities (`bg-primary`, not `bg-blue-600`).

## Emit method

**How:** `utility-classes-via-className` (+ `cn()` for conditional merge, `@/components/ui/` for primitives)

```tsx
// ✓ correct
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SaveAction({ disabled, loading }) {
  return (
    <Button variant="default" className={cn("gap-2", loading && "opacity-70")} disabled={disabled}>
      Save
    </Button>
  );
}
```

```tsx
// ✗ wrong — hardcoded color instead of token utility
<button className="bg-blue-600 text-white">Save</button>

// ✗ wrong — global custom-class CSS (the fabrio failure)
import "./styles/atoms.css";
<div className="atom-card">…
```

## File placement

**Rule:** `colocated`

shadcn primitives live in `src/components/ui/` (managed by the CLI); project atoms/screens live alongside under `src/components/`, `src/screens/`. Styling is inline utilities; the only CSS is `globals.css` (Tailwind entry + shadcn CSS-variable tokens). No `src/styles/` of custom classes.

- **Allowed:** `src/components/**`, `src/screens/**`, `src/app/**`; `src/**/globals.css` (Tailwind + tokens).
- **Forbidden:** any `.css`/`.scss` defining custom component classes.

## Token binding

**Mechanism:** `shadcn-css-variables-as-tailwind-utilities`

shadcn defines semantic tokens as CSS custom properties (`:root`/`.dark` in `globals.css`) and bridges them into Tailwind utilities. Components use the token utilities — never literal colors.

```css
/* globals.css */
:root { --primary: …; --primary-foreground: …; --background: …; }
```
```tsx
<div className="bg-primary text-primary-foreground">…
```

## Forbidden patterns

(Inherits `tailwind-web`; restated for the report.)

- **Global CSS with custom classes** (`.atom-*`/`.mol-*`/`.org-*` or bespoke component classes). *Rationale:* parallel system that bypasses Tailwind + the shadcn token layer (the `fabrio` failure).
- **Inline `style={{}}`** for static values. *Rationale:* bypasses utilities + tokens.

> **Advisory, not blocking:** prefer shadcn token utilities (`bg-primary`, `text-muted-foreground`) over literal palette colors (`bg-blue-600`) for *semantic* values. Neutral palette colors for non-semantic styling (e.g. `border-slate-200`) are acceptable, so this is a verify-checklist item rather than a blocking check — a blocking palette ban would false-positive on legitimate neutral usage.

## Verify checklist (component level)

- Component uses Tailwind utilities via `className`; conditional classes merged with `cn()`.
- Colors reference shadcn token utilities (`bg-primary`, `text-muted-foreground`) not palette literals.
- Primitives sourced from `@/components/ui/`; project atoms compose them.
- Dark mode works via `.dark` token overrides.

## Checks

```json
{
  "forbiddenPatterns": [
    {
      "id": "global-custom-class-css",
      "mode": "content",
      "glob": ["src/**/*.css", "src/**/*.scss", "styles/**/*.css", "styles/**/*.scss"],
      "regex": "\\.(atom|mol|org)-[a-z][\\w-]*",
      "rationale": "Custom .atom-* / .mol-* / .org-* classes bypass Tailwind + the shadcn token layer (the fabrio failure)."
    },
    {
      "id": "inline-style-objects",
      "mode": "content",
      "glob": ["src/**/*.{tsx,jsx,ts,js}"],
      "regex": "\\bstyle=\\{\\{",
      "rationale": "Inline style={{}} bypasses utilities and the shadcn token layer."
    }
  ],
  "mustInclude": [
    {
      "id": "utility-class-usage",
      "glob": ["src/components/**/*.{tsx,jsx}"],
      "exclude": ["**/index.{ts,tsx,js,jsx}", "**/ui/**", "**/*.stories.*", "**/*.test.*", "**/*.spec.*"],
      "regex": "className=",
      "description": "Every project component (outside the shadcn-managed ui/ folder) references className with Tailwind utilities."
    }
  ]
}
```
