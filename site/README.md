# pixel-perfect landing site

The landing page for pixel-perfect, built with pixel-perfect. SvelteKit (static) + Tailwind v4 + Storybook.

| Command | What it does |
|---|---|
| `pnpm dev` | Site dev server |
| `pnpm build` | Static site to `build/` |
| `pnpm sandbox` | Storybook on http://localhost:6006 |
| `pnpm sandbox:capture` | Catalog capture (used by pixel-perfect's `verify-catalog.mjs`) |
| `pnpm check` | Type-check |
| `node scripts/record-demo.mjs record\|cut\|scrub` | Re-record the terminal demo (asciinema); the method is in the script's header |
| `node scripts/verify-demo.mjs <preview url>` | Check the demo loop and the evolve counts in Chrome |

Design system record: `design/manifest.json`. Styling rules: `design/research/styling/tailwind-sveltekit.md`.
