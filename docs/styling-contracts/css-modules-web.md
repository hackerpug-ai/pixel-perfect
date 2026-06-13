---
id: css-modules-web
name: CSS Modules (Web)
appliesTo:
  platforms: [web-desktop, web-mobile]
  frameworks: [react, nextjs, vite]
  styleSystem: css-modules
  componentLibrary: any
source: builtin
canonicalDocs: https://github.com/css-modules/css-modules
lastUpdated: 2026-06-13
---

# CSS Modules (Web) — Styling Contract

Component styles are authored as **colocated CSS Modules** — a `*.module.css` (or `.module.scss`) file sitting next to the component, imported as a styles object, and applied via `className={styles.localName}`. Scoping is enforced by the build (each local name is hashed), so there are no global class collisions. Design tokens reach components through CSS custom properties (`var(--token)`) referenced inside the module.

CSS Modules are explicitly scoped by design. The failure to avoid is **global, unscoped CSS** (a plain `.css` defining `.atom-*` / `.mol-*` classes imported globally) — that recreates the parallel-system drift this contract family exists to prevent.

## Emit method

**How:** `css-modules-via-import`

Import the colocated module and apply local class names through the framework's class attribute.

```tsx
// ✓ correct
import styles from "./StatusBadge.module.css";

export function StatusBadge({ label }: { label: string }) {
  return <span className={styles.badge}>{label}</span>;
}
```

```css
/* StatusBadge.module.css — scoped */
.badge {
  background: var(--color-primary);
  color: var(--color-primary-foreground);
  padding: var(--space-2) var(--space-3);
}
```

```tsx
// ✗ wrong — global unscoped class
import "./styles/atoms.css";
<span className="atom-badge">{label}</span>

// ✗ wrong — inline static styles
<span style={{ background: "#2563eb", padding: "8px 12px" }}>{label}</span>
```

## File placement

**Rule:** `colocated`

Each component owns a sibling `*.module.css`. The only non-module CSS is the global token/entry layer (`globals.css`, `tokens.css`, `:root` custom properties) and any framework-required entry.

- **Allowed:** `src/**/*.{tsx,jsx,svelte,vue}` + colocated `src/**/*.module.{css,scss}`; global token entry CSS.
- **Forbidden:** non-module `.css`/`.scss` defining component classes (`.atom-*`, `.mol-*`, BEM blocks) imported globally; per-component global stylesheets.

## Token binding

**Mechanism:** `css-custom-properties-in-module`

Tokens are CSS custom properties in the global entry (`:root`, `.dark`), referenced inside each module via `var(--*)`. The module never hardcodes a value.

```css
/* globals.css */
:root {
  --color-primary: …;
  --space-3: 0.75rem;
}
```

```css
/* Component.module.css */
.badge { background: var(--color-primary); padding: var(--space-3); }
```

## Forbidden patterns

- **Global unscoped CSS with component classes** — plain `.css` defining `.atom-*`/`.mol-*`/`.org-*` or bespoke component classes. *Rationale:* recreates an unscoped parallel system that bypasses CSS Modules' hashing and the token layer (the `fabrio` failure).
- **Inline `style={{}}` / `style="…"`** for static layout/color/spacing. *Rationale:* bypasses the module and the token layer; cannot be responsive or themed. (Dynamic computed values are the only exception.)

## Verify checklist (component level)

- Component imports its colocated `*.module.css` and applies `styles.*` local names.
- The module references tokens via `var(--*)`, not hardcoded values.
- No global component-class CSS is imported.
- Dark mode handled via `.dark` custom-property overrides (no duplicate class trees).

## Checks

```json
{
  "forbiddenPatterns": [
    {
      "id": "global-custom-class-css",
      "mode": "content",
      "glob": ["src/**/*.css", "src/**/*.scss", "styles/**/*.css", "styles/**/*.scss"],
      "exclude": ["src/**/*.module.css", "src/**/*.module.scss", "**/*.globals.css", "**/globals.css", "**/tokens.css"],
      "regex": "\\.(atom|mol|org)-[a-z][\\w-]*",
      "rationale": "Non-module CSS defining .atom-* / .mol-* / .org-* classes is unscoped and bypasses CSS Modules + the token layer (the fabrio failure)."
    },
    {
      "id": "inline-style-objects",
      "mode": "content",
      "glob": ["src/**/*.{tsx,jsx,ts,js}"],
      "regex": "\\bstyle=\\{\\{",
      "rationale": "Inline style={{}} bypasses the module and token layer; use a colocated module class (dynamic computed values are the only exception)."
    }
  ],
  "mustInclude": []
}
```
