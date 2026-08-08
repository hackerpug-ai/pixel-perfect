---
id: shadcn
name: shadcn/ui
appliesTo:
  platforms: [web-desktop, web-mobile]
  frameworks: [react, nextjs, vite]
  componentLibrary: shadcn
distribution: vendored
importRoot: "@/components/ui"
source: builtin
canonicalDocs: https://ui.shadcn.com/docs
lastUpdated: 2026-08-08
---

# shadcn/ui — Component Contract

shadcn/ui is a **copy-in** library. `npx shadcn@latest add …` writes real source files into `components/ui/`, which the project then owns. Those files are the project's primitive layer, already wired to the CSS-variable theme, to `cva` variants, to `cn()` merging, and to the Radix accessibility behavior underneath.

A project component therefore **composes `@/components/ui/*`**. Dropping a raw `<button>` into an atom rebuilds a component the project already owns, without the variant system, the focus-visible ring, or the disabled semantics.

## Compose method

**How:** `compose-vendored-ui-layer`

```tsx
// ✓ correct
import { Button } from "@/components/ui/button";

export function SubmitAction({ children, ...rest }) {
  return <Button variant="default" size="sm" {...rest}>{children}</Button>;
}
```

```tsx
// ✗ wrong — re-implements ui/button
export function SubmitAction({ children, ...rest }) {
  return (
    <button className="inline-flex items-center rounded-md bg-primary px-4 py-2" {...rest}>
      {children}
    </button>
  );
}
```

Both pass the styling contract — both use Tailwind utilities on `className`. Only this contract can tell them apart.

## Vendored inventory

Whatever the CLI pulled lives in `components/ui/`. The elements this contract enforces are the ones shadcn vendors in every install:

| Raw element | Vendored replacement |
|---|---|
| `<button>` | `@/components/ui/button` |
| `<input>` | `@/components/ui/input` |
| `<textarea>` | `@/components/ui/textarea` |
| `<select>` | `@/components/ui/select` |

If a component you need was not pulled, pull it — `npx shadcn@latest add checkbox` — rather than hand-rolling it.

**Deliberately not enforced:** `<label>`, `<form>`, `<table>`. shadcn vendors wrappers for all three, but each has enough legitimate bare usage (a `<label>` inside a vendored component's composition, a plain `<form action>`) that banning them would fire on correct code.

## Free primitives

Every structural and text element: `<div>`, `<span>`, `<p>`, `<section>`, `<nav>`, `<ul>`, `<li>`, `<a>`, headings, `<img>`, `<svg>`. These are markup, not components shadcn replaces.

## Forbidden patterns

- **Raw interactive element** — a bare `<button>`, `<input>`, `<textarea>`, or `<select>` in a project component. *Rationale:* rebuilds a component the project already owns in `components/ui/`, losing the `cva` variant system, focus-visible ring, and Radix accessibility behavior.
- **Bypassing the vendored wrapper** — importing `@radix-ui/*` directly outside `components/ui/`. *Rationale:* shadcn's `ui/` layer is the project's wrapper over Radix; going direct skips the theming and prop contract it establishes. `@radix-ui/react-icons` and `@radix-ui/colors` are exempt — they are an icon set and a palette, not primitives with vendored wrappers.

`components/ui/**` is excluded from both — those files legitimately render raw elements and import Radix.

## Verify checklist (component level)

- Interactive elements come from `@/components/ui/*`, not bare HTML tags.
- Variants are expressed by configuring the vendored component, not by re-deriving its classes.
- A primitive the project needs and does not have was pulled with the CLI, not hand-rolled.

## Checks

```json
{
  "forbiddenPatterns": [
    {
      "id": "raw-interactive-element",
      "mode": "content",
      "glob": [
        "components/**/*.{tsx,jsx}",
        "src/components/**/*.{tsx,jsx}",
        "app/**/*.{tsx,jsx}",
        "src/app/**/*.{tsx,jsx}",
        "pages/**/*.{tsx,jsx}",
        "src/pages/**/*.{tsx,jsx}"
      ],
      "exclude": [
        "**/ui/**",
        "**/*.stories.*",
        "**/*.test.*",
        "**/*.spec.*"
      ],
      "regex": "<(?:button|input|textarea|select)[\\s/>]",
      "rationale": "shadcn/ui vendored this element into @/components/ui/*. A bare HTML tag rebuilds a component the project already owns, losing the cva variant system, the focus-visible ring, and Radix accessibility behavior. Compose the vendored component instead, or pull it with the CLI if it is missing."
    },
    {
      "id": "radix-direct-import",
      "mode": "content",
      "glob": [
        "components/**/*.{tsx,jsx,ts}",
        "src/components/**/*.{tsx,jsx,ts}",
        "app/**/*.{tsx,jsx,ts}",
        "src/app/**/*.{tsx,jsx,ts}",
        "pages/**/*.{tsx,jsx,ts}",
        "src/pages/**/*.{tsx,jsx,ts}"
      ],
      "exclude": [
        "**/ui/**",
        "**/*.stories.*",
        "**/*.test.*",
        "**/*.spec.*"
      ],
      "regex": "from\\s*['\"]@radix-ui/(?!react-icons\\b|colors\\b)",
      "rationale": "The components/ui layer is the project's wrapper over Radix. Importing a Radix primitive directly in a project component skips that wrapper's theming and prop contract. (react-icons and colors are exempt: an icon set and a palette, not primitives with vendored wrappers.)"
    }
  ]
}
```
