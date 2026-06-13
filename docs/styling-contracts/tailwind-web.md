---
id: tailwind-web
name: Tailwind CSS (Web)
appliesTo:
  platforms: [web-desktop, web-mobile]
  frameworks: [react, nextjs, vite, sveltekit]
  styleSystem: tailwind
  componentLibrary: any
source: builtin
canonicalDocs: https://tailwindcss.com/docs
lastUpdated: 2026-06-13
---

# Tailwind CSS (Web) — Styling Contract

All styling is expressed as **Tailwind utility classes** applied through the framework's class attribute (`className` for React, `class` for Svelte/Vue). There are no per-component CSS files, no global custom classes, and no inline style objects. Design tokens reach components through Tailwind's theme (CSS custom properties mapped into the Tailwind theme config) and are consumed as utilities (`bg-primary`, `text-foreground`, `border-border`).

This contract exists precisely because "declared Tailwind" is easy to bypass: without an enforced rule, a build can ship a parallel global-CSS system of custom `.atom-*` / `.mol-*` classes (the `fabrio` failure). The checks below make that drift a blocking violation.

## Emit method

**How:** `utility-classes-via-className`

Express every visual property as a Tailwind utility in the element's class attribute. Compose variants with the `cn()` helper (or framework equivalent) when classes are conditional.

```tsx
// ✓ correct
<button className="bg-primary text-primary-foreground rounded-md px-4 py-2 hover:bg-primary/90">
  Save
</button>

<button className={cn("inline-flex items-center gap-2", isActive && "ring-2 ring-ring")}>
  {label}
</button>
```

```tsx
// ✗ wrong — bypasses Tailwind
<button style={{ backgroundColor: "#2563eb", padding: "8px 16px" }}>Save</button>
<div className="atom-card">…</div>   {/* custom class defined in a global .css */}
```

## File placement

**Rule:** `colocated`

Styles live **inline in the component** via utility classes. The only CSS files in the project are framework/theme entry points (`globals.css` / `index.css` with `@import "tailwindcss";`, `@theme`, and token CSS custom properties) and any CSS the chosen component library requires (e.g. shadcn's `globals.css`). There is **no** `src/styles/`, `styles/`, or per-component `.css` defining custom classes.

- **Allowed:** `src/**/*.tsx`, `src/**/*.jsx`, `src/**/*.svelte`, `src/**/*.vue`; the theme entry CSS (`src/**/globals.css`, `src/**/index.css`); component-library-managed CSS.
- **Forbidden:** any `.css`/`.scss` defining custom component classes (`.atom-*`, `.mol-*`, `.org-*`, BEM blocks, etc.); per-component stylesheets.

## Token binding

**Mechanism:** `css-custom-properties-to-tailwind-theme`

Design tokens are emitted as CSS custom properties in the theme entry CSS (`:root`, `.dark`) and surfaced as Tailwind utilities via `@theme` / the Tailwind config. Components never read token values directly — they reference the utility.

```css
/* globals.css */
@import "tailwindcss";
@theme {
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  /* … */
}
:root { --primary: …; --primary-foreground: …; }
```

```tsx
// access pattern — utilities only
<div className="bg-primary text-primary-foreground">…</div>
```

## Forbidden patterns

- **Global CSS with custom classes** — any `.css`/`.scss` defining `.atom-*`, `.mol-*`, `.org-*`, or bespoke component classes. *Rationale:* creates a parallel styling system that bypasses Tailwind and the theme (the `fabrio` failure).
- **Inline `style={{}}` / `style="…"`** for static layout, color, spacing, or typography. *Rationale:* inline styles cannot use Tailwind utilities or bind to theme tokens, and break responsive/dark-mode variants. (Dynamic, computed values that genuinely cannot be a utility — e.g. a transform offset from a measurement — are the only exception.)
- **Arbitrary color literals** like `bg-[#ff0000]`, `text-[#00ff00]`. *Rationale:* breaks theme consistency and dark mode. Use the token utility (`bg-primary`); extend the theme if a token is missing.

## Verify checklist (component level)

- Component uses Tailwind utility classes (not inline styles or raw CSS).
- Colors reference theme tokens (`text-primary`, `bg-secondary`) not arbitrary values.
- Spacing uses the Tailwind scale (`p-4`, `gap-6`) not arbitrary pixel values.
- Responsive variants applied where needed (`sm:`, `md:`, `lg:`).
- Dark-mode variants present if the project supports dark mode (`dark:`).

## Checks

```json
{
  "forbiddenPatterns": [
    {
      "id": "global-custom-class-css",
      "mode": "content",
      "glob": ["src/**/*.css", "src/**/*.scss", "styles/**/*.css", "styles/**/*.scss"],
      "regex": "\\.(atom|mol|org)-[a-z][\\w-]*",
      "rationale": "Custom .atom-* / .mol-* / .org-* classes in CSS bypass Tailwind and create a parallel global-CSS system (the fabrio failure)."
    },
    {
      "id": "inline-style-objects",
      "mode": "content",
      "glob": ["src/**/*.{tsx,jsx,ts,js}"],
      "regex": "\\bstyle=\\{\\{",
      "rationale": "Inline style={{}} cannot use Tailwind utilities or theme tokens; use utility classes (dynamic computed values are the only exception)."
    },
    {
      "id": "arbitrary-color-literals",
      "mode": "content",
      "glob": ["src/**/*.{tsx,jsx}"],
      "regex": "(bg|text|border|ring|fill|stroke)-(\\[#[0-9a-fA-F]{3,8}\\])",
      "rationale": "Arbitrary hex colors bypass the theme and break dark mode; use token utilities (bg-primary) or extend the theme."
    }
  ],
  "mustInclude": [
    {
      "id": "utility-class-usage",
      "glob": ["src/components/**/*.{tsx,jsx}"],
      "exclude": ["**/index.{ts,tsx,js,jsx}", "**/*.stories.*", "**/*.test.*", "**/*.spec.*"],
      "regex": "className=",
      "description": "Every project component references className with Tailwind utilities."
    }
  ]
}
```
