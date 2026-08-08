---
id: shadcn-svelte
name: shadcn-svelte
appliesTo:
  platforms: [web-desktop, web-mobile]
  frameworks: [sveltekit]
  componentLibrary: shadcn-svelte
distribution: vendored
importRoot: "$lib/components/ui"
source: builtin
canonicalDocs: https://shadcn-svelte.com/docs
lastUpdated: 2026-08-08
---

# shadcn-svelte — Component Contract

shadcn-svelte is a **copy-in** library. `npx shadcn-svelte@latest add …` writes real `.svelte` source into `$lib/components/ui/`, which the project then owns. Those files are the project's primitive layer, wired to the CSS-variable theme, to `tailwind-variants`, and to the Bits UI behavior underneath.

A project component therefore **composes `$lib/components/ui/*`**. A bare `<button>` in a route or a project component rebuilds something the project already owns.

## Compose method

**How:** `compose-vendored-ui-layer`

```svelte
<!-- ✓ correct -->
<script lang="ts">
  import { Button } from "$lib/components/ui/button";
</script>

<Button variant="default" size="sm">Save</Button>
```

```svelte
<!-- ✗ wrong — re-implements ui/button -->
<button class="inline-flex items-center rounded-md bg-primary px-4 py-2">Save</button>
```

## Vendored inventory

| Raw element | Vendored replacement |
|---|---|
| `<button>` | `$lib/components/ui/button` |
| `<input>` | `$lib/components/ui/input` |
| `<textarea>` | `$lib/components/ui/textarea` |
| `<select>` | `$lib/components/ui/select` |

**Deliberately not enforced:** `<label>`, `<form>`, `<table>` — same reasoning as the React contract; enough legitimate bare usage that banning them would fire on correct code.

## Free primitives

`<div>`, `<span>`, `<p>`, `<section>`, `<nav>`, `<ul>`, `<li>`, `<a>`, headings, `<img>`, `<svg>`, and every Svelte block (`{#if}`, `{#each}`, `<slot>`).

## Forbidden patterns

- **Raw interactive element** — a bare `<button>`, `<input>`, `<textarea>`, or `<select>` in a project component or route. *Rationale:* rebuilds a component the project already owns in `$lib/components/ui/`, losing the variant system and Bits UI accessibility behavior.
- **Bypassing the vendored wrapper** — importing `bits-ui` directly outside `$lib/components/ui/`. *Rationale:* the `ui/` layer is the project's wrapper over Bits UI; going direct skips the theming and prop contract it establishes.

`src/lib/components/ui/**` is excluded from both.

## Verify checklist (component level)

- Interactive elements come from `$lib/components/ui/*`, not bare HTML tags.
- Variants configure the vendored component rather than re-deriving its classes.
- A primitive the project needs and does not have was pulled with the CLI.

## Checks

```json
{
  "forbiddenPatterns": [
    {
      "id": "raw-interactive-element",
      "mode": "content",
      "glob": [
        "src/lib/components/**/*.svelte",
        "src/routes/**/*.svelte",
        "src/components/**/*.svelte"
      ],
      "exclude": [
        "**/ui/**",
        "**/*.stories.*",
        "**/*.test.*",
        "**/*.spec.*"
      ],
      "regex": "<(?:button|input|textarea|select)[\\s/>]",
      "rationale": "shadcn-svelte vendored this element into $lib/components/ui/*. A bare HTML tag rebuilds a component the project already owns, losing the variant system and Bits UI accessibility behavior. Compose the vendored component instead, or pull it with the CLI if it is missing."
    },
    {
      "id": "bits-ui-direct-import",
      "mode": "content",
      "glob": [
        "src/lib/components/**/*.{svelte,ts}",
        "src/routes/**/*.{svelte,ts}",
        "src/components/**/*.{svelte,ts}"
      ],
      "exclude": [
        "**/ui/**",
        "**/*.stories.*",
        "**/*.test.*",
        "**/*.spec.*"
      ],
      "regex": "from\\s*['\"]bits-ui['\"]",
      "rationale": "The $lib/components/ui layer is the project's wrapper over Bits UI. Importing it directly in a project component skips that wrapper's theming and prop contract."
    }
  ]
}
```
