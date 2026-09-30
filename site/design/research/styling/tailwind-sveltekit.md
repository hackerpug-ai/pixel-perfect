---
id: tailwind-sveltekit
name: Tailwind CSS v4 (SvelteKit)
appliesTo:
  platforms: [web-desktop, web-mobile]
  frameworks: [sveltekit]
  styleSystem: tailwind
  componentLibrary: none
source: researched
canonicalDocs: https://tailwindcss.com/docs/installation/framework-guides/sveltekit
lastUpdated: 2026-09-29
---

# Tailwind CSS v4 (SvelteKit) — Styling Contract

All styling is expressed as **Tailwind utility classes on the Svelte `class` attribute** (string, array, or object form, which Svelte 5.16+ resolves with clsx) or the `class:` directive. `src/app.css` is the only stylesheet: it imports Tailwind, declares design tokens in `@theme`, and holds base element rules. Components carry no `<style>` blocks, no custom CSS classes, and no static inline styles. The site's real theme is `src/app.css` (see manifest `scaffold.token_names`). The single inline-style exception is setting a CSS custom property from a dynamic value with `style:--name={value}`, then consuming it from a utility.

## Sources

| Fact | Source |
|------|--------|
| Install: `tailwindcss` + `@tailwindcss/vite` plugin before `sveltekit()` in `vite.config.ts`; `@import "tailwindcss";` in `src/app.css`; `app.css` imported in `src/routes/+layout.svelte` | https://tailwindcss.com/docs/installation/framework-guides/sveltekit (official) |
| "If you're using Tailwind with these tools [Vue, Svelte, Astro], we recommend avoiding `<style>` blocks in your components and just styling things with utility classes directly in your markup" | https://tailwindcss.com/docs/compatibility (official) |
| Tokens are theme variables in `@theme`, which generate utilities and CSS variables; `@theme inline` for tokens that reference other variables; `@keyframes` for `--animate-*` live inside `@theme` | https://tailwindcss.com/docs/theme (official) |
| Inline styles are for dynamic values; "setting CSS variables based on dynamic sources using inline styles, then referencing those variables with utility classes"; reuse via components in Svelte, custom CSS classes only for templating languages | https://tailwindcss.com/docs/styling-with-utility-classes (official) |
| Manual dark mode: `@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));` | https://tailwindcss.com/docs/dark-mode (official) |
| `class` accepts objects and arrays (clsx) since Svelte 5.16; `class:` directive | https://svelte.dev/docs/svelte/class (official) |
| `style:` directive can set CSS custom properties | https://svelte.dev/docs/svelte/style (official) |

## Emit method

**How:** `utility-classes-via-class-attribute`

Every visual property is a Tailwind utility on the element's `class`. Conditional classes use Svelte's array/object `class` form (or `class:`), not string concatenation helpers.

```svelte
<!-- ✓ correct -->
<button class="bg-ink text-paper px-4 py-2 font-mono text-small hover:bg-accent-text">Copy</button>

<a class={["inline-block text-ink", active && "ring-2 ring-focus", "mix-blend-multiply dark:mix-blend-screen"]}>…</a>

<!-- ✓ the one inline-style form: a dynamic custom property consumed by a utility -->
<div style:--reveal="{pos}%" class="[clip-path:inset(0_calc(100%-var(--reveal))_0_0)]">…</div>
```

```svelte
<!-- ✗ wrong — bypasses Tailwind -->
<button style="background:#e5007e; padding:8px 16px">Copy</button>
<div class="atom-card">…</div>   <!-- custom class defined in CSS -->
<style> .card { border: 1px solid black; } </style>
```

## File placement

**Rule:** `colocated`

Styles live on the markup, in the component that renders it. Reuse happens by extracting a Svelte component, never a CSS class.

- **Allowed:** utilities in `src/**/*.svelte`; one stylesheet, `src/app.css`, containing `@import "tailwindcss";`, `@custom-variant`, `@theme` / `@theme inline` (tokens and `@keyframes`), token custom properties on `:root` and `[data-theme=dark]`, `@font-face`, and base element rules.
- **Forbidden:** any other `.css`/`.scss`/`.sass`/`.less` file under `src/`; class selectors in `src/app.css`; `<style>` blocks in `.svelte` files (stories excepted); a JavaScript `tailwind.config.*` (v4 is configured in CSS).
- **Markup-free wrappers:** a component that renders no styled markup of its own (for example a `Mark` that only outputs an `<img>` of a logo file) fails `mustInclude utility-class-usage` by design. Exempt it by name in `tools.style_contract_overrides` with the reason, rather than adding a meaningless class.
- **When the gate applies:** from scaffold onward. Before `src/` exists the gate scans nothing and exits 3 (a vacuous scan), which is expected at init and must not be read as a pass.

## Token binding

**Mechanism:** `css-custom-properties-to-tailwind-theme`

Theme values are CSS custom properties that switch per theme; `@theme inline` maps them to Tailwind theme variables, which generate the utilities components use. Components never hard-code values and never read tokens except through utilities (or `var(--…)` inside an arbitrary-value utility).

```css
/* src/app.css */
@import "tailwindcss";
@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));

:root { color-scheme: light dark; --paper: light-dark(#f3f4f1, #0d0f12); --ink: light-dark(#111316, #ecede8); --accent: light-dark(#e0007a, #ff3d9e); }
:root[data-theme=dark] { color-scheme: dark; }

@theme inline {
  --color-paper: var(--paper);
  --color-ink: var(--ink);
  --color-accent: var(--accent);
  --font-display: "Anybody", sans-serif;
  --animate-register: register 700ms ease-out both;
  @keyframes register { from { translate: 6px -4px; } to { translate: 0 0; } }
}
```

```svelte
<!-- access pattern — utilities only -->
<h1 class="font-display text-ink bg-paper motion-safe:animate-register">…</h1>
```

## Forbidden patterns

- **`<style>` blocks in components.** *Rationale:* Tailwind's docs recommend avoiding them in Svelte; they are processed separately and become a second styling system beside the utilities.
- **Static inline styles** (`style="…"`, `style={…}`, or `style:property` for any real CSS property). *Rationale:* inline values are magic numbers that cannot use theme tokens or state, responsive, and dark variants. Dynamic values go through `style:--custom-property`, consumed by a utility.
- **Extra stylesheets** under `src/` beyond `src/app.css`. *Rationale:* one stylesheet keeps tokens in one place and stops a parallel CSS system from forming.
- **Class selectors in `src/app.css`.** *Rationale:* global custom classes (`.atom-*`, `.card`, BEM blocks) bypass the utilities — the `fabrio` failure. Svelte components are the reuse unit.
- **Arbitrary color literals** (`bg-[#…]`, `text-[oklch(…)]`, …). *Rationale:* they bypass the theme and break dark mode; add a token instead.
- **A JavaScript `tailwind.config.*`.** *Rationale:* Tailwind v4 is configured in CSS; a JS config splits tokens across two sources.

## Verify checklist (component level)

- The component uses Tailwind utilities on `class` (or `class:`), with no `<style>` block.
- Colors, fonts, and motion come from token utilities (`bg-paper`, `text-accent-text`, `font-display`, `animate-register`), not arbitrary literals.
- Spacing uses the Tailwind scale; arbitrary values are rare and justified.
- Both widths are handled with responsive variants (`md:`, `lg:`), and both themes with `dark:` where the theme variables do not already switch.
- Blend modes follow the medium (`mix-blend-multiply` light, `dark:mix-blend-screen` dark), and motion is gated with `motion-safe:` / `motion-reduce:`.
- Any `style:` usage sets only a `--custom-property` from a dynamic value.

## Checks

```json
{
  "forbiddenPatterns": [
    {
      "id": "svelte-style-blocks",
      "mode": "content",
      "glob": ["src/**/*.svelte"],
      "exclude": ["**/*.stories.svelte"],
      "regex": "^\\s*<style[\\s>]",
      "rationale": "Tailwind recommends avoiding <style> blocks in Svelte components; they form a second styling system beside the utilities."
    },
    {
      "id": "inline-static-styles",
      "mode": "content",
      "glob": ["src/**/*.svelte"],
      "exclude": ["**/*.stories.svelte"],
      "regex": "\\bstyle=[\"'{]|\\bstyle:(?!--)[a-zA-Z]",
      "rationale": "Static inline styles cannot use tokens or variants; only style:--custom-property for dynamic values is allowed, consumed by a utility."
    },
    {
      "id": "extra-stylesheets",
      "mode": "exists",
      "glob": ["src/**/*.{css,scss,sass,less}"],
      "exclude": ["src/app.css"],
      "rationale": "src/app.css is the only stylesheet; extra stylesheets start a parallel CSS system."
    },
    {
      "id": "custom-class-selectors",
      "mode": "content",
      "glob": ["src/app.css"],
      "regex": "^\\s*\\.[A-Za-z_-][\\w-]*",
      "rationale": "Global custom classes bypass the utilities (the fabrio failure); reuse by extracting a Svelte component."
    },
    {
      "id": "arbitrary-color-literals",
      "mode": "content",
      "glob": ["src/**/*.svelte"],
      "regex": "\\b(bg|text|border|ring|outline|fill|stroke|decoration|shadow|accent|caret|divide|placeholder|from|via|to)-\\[(#|rgb|hsl|oklch|oklab|lab|lch)",
      "rationale": "Arbitrary color literals bypass the theme and break dark mode; add a token in @theme instead."
    },
    {
      "id": "js-tailwind-config",
      "mode": "exists",
      "glob": ["tailwind.config.{js,ts,cjs,mjs}"],
      "rationale": "Tailwind v4 is configured in CSS; a JS config splits tokens across two sources."
    }
  ],
  "mustInclude": [
    {
      "id": "utility-class-usage",
      "glob": ["src/lib/components/**/*.svelte"],
      "exclude": ["**/*.stories.svelte", "**/index.{ts,js}"],
      "regex": "\\bclass(=|:)",
      "description": "Every project component styles its markup with Tailwind utilities on class or class:."
    },
    {
      "id": "tailwind-import",
      "glob": ["src/app.css"],
      "regex": "@import\\s+[\"']tailwindcss[\"']",
      "description": "The single stylesheet imports Tailwind."
    },
    {
      "id": "theme-tokens",
      "glob": ["src/app.css"],
      "regex": "@theme\\b",
      "description": "Design tokens are declared as Tailwind theme variables in src/app.css."
    }
  ]
}
```

## Rubric

Scored against `docs/styling-convention-rubric.md` on 2026-09-29: **7/7 PASS** — accepted.

| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| 1 | Official docs cited | PASS | tailwindcss.com and svelte.dev pages fetched and quoted in Sources. |
| 2 | Colocation rule | PASS | `colocated`, with concrete allowed/forbidden globs. |
| 3 | Token binding | PASS | `:root`/`[data-theme=dark]` custom properties → `@theme inline` → utilities, per the Theme variables page. |
| 4 | Forbidden patterns, detection-shaped | PASS | Six runnable checks. Proven with a known-good sample (exit 0, 4 files) and a known-bad sample (exit 1, all six forbidden checks and the mustInclude check fired). |
| 5 | Framework idiom | PASS | Utilities on the markup is what Tailwind's SvelteKit guide and Compatibility page lead with. |
| 6 | No contradictions | PASS | Forbids global custom classes and static inline styles; permits utilities on `class`. |
| 7 | Completeness | PASS | Frontmatter complete; all body sections present; checks JSON parses in the real gate. |

The `style:--*` exception follows Tailwind's documented pattern: set CSS variables from dynamic sources, then reference them with utilities. Stories (`*.stories.svelte`) are excluded from the `<style>` and inline-style checks because Storybook decorators are not product components.
