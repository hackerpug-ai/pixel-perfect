# Init brief — pixel-perfect landing site

Advisory only. `design/manifest.json` (written at the end of init) is the durable record.
Prepared 2026-09-29 by `/pixel-perfect:init`.

## Invocation input, as read

| Input | Read as | Why |
|---|---|---|
| `design/` | The design references folder, not the project directory | It holds four Claude Design exports plus logo assets. Treating it as the project directory would put the manifest at `design/design/manifest.json`. |
| `.spec/prds/landing/strategy.md` | Requirements and view spec | Named directly. §9 is the page architecture; §10 the creative direction; §16 T6 the build task. |
| "use storybook for components" | `sandbox: storybook` | Overrides the default custom browser. The SvelteKit adapter documents a verified Storybook + Svelte 5 setup. |
| "svelte and tailwind … latest … sveltekit and vite" | `framework: sveltekit`, `style: tailwind`, latest majors | SvelteKit is Vite-based, so Vite comes with it. Scaffold installs `@latest` (Svelte 5 runes, Tailwind v4). |

## What was found

- **No `design/manifest.json`.** Fresh init; nothing to migrate.
- **Design references** (Claude Design exports, recorded where they live, read by build Phase 4a — not here):
  - `design/pixel-perfect Landing.dc.html` — the page. Seven labelled sections: Hero, Why, Build it, Grow it, Install, FAQ, Close. This matches strategy §9.1's recommended order exactly.
  - `design/Component sheet.dc.html` — the component sheet, including a six-tab list (the harness install tabs).
  - `design/Social preview.dc.html` — the 1200×630 social image (strategy T6 AC-7).
  - `design/Logo.dc.html` plus `design/logo/` — mark variants A, B, C in light/dark/mono, and favicons. Which mark ships was decided 2026-09-29 (strategy D5): the P mark family — A in the header, README banner and social image; B as the favicon; C in the footer.
  - `design/uploads/` — two PNGs. Corrected by the red-hat review (F-013): `pasted-1790742949005-0.png` is a screenshot of the landing hero, and both are the only drawings of Fig. 1 in its separated state (light and dark). Recorded as references.
  - The old `design/concepts/pixel-perfect.html` is removed; the `.dc.html` exports supersede it (strategy frontmatter and T6 AC-1 updated).
- **Root `package.json`** belongs to the plugin repository (release, validate, and test scripts). No web framework is installed anywhere.
- **Adapters on disk:** `sveltekit`, `tailwind`, `storybook`, `shadcn-svelte`, `bits-ui`, `skeleton`.
- **Styling contract:** no built-in covers SvelteKit + Tailwind. The `tailwind-web` built-in is scoped to React (`className`); SvelteKit needs one researched with `class=` checks.
- **Component contract:** built-in exists for `shadcn-svelte`; none for Bits UI (it would be researched in the background).

## What the evidence settles

| Decision | Value | Evidence |
|---|---|---|
| Requirements + view spec | `.spec/prds/landing/strategy.md` | Passed by you; §9 describes every section. |
| Framework | SvelteKit (latest), static output for GitHub Pages | Your instruction; strategy D3 and D4. |
| Style system | Tailwind CSS (latest, v4) | Your instruction. |
| Sandbox | Storybook | Your instruction. |
| Platforms | `web-desktop` + `web-mobile` | Strategy §9.2 specifies both 1440×900 and 390 px, and the mobile hero is a different composition (the slider replaces Fig. 1). |
| Vibe | "Press proof" (below) | Strategy §10, and all four design exports use its three typefaces. |
| Route map | One route, `/` | The design is one page with seven sections. The changelog page is deliberately *not* built now: strategy T6 AC-3 adds it later with `evolve` as the live demo. `/sandbox` is the published Storybook build and `/inventory.json` a static file — served, not screens. |

**Vibe, to be stored verbatim:** "Press proof — a printer's proof sheet. The four process inks (cyan, magenta, yellow, black) on cool neutral paper; overlaps multiply in light mode and screen in dark mode; magenta is the only accent for action and emphasis, and yellow is never text. Anybody for display, Libre Franklin for body, IBM Plex Mono for code and labels. Crop marks, registration targets, a color control strip, slug lines, and numbered proofreader marks, each meaning something. Both themes designed deliberately; WCAG 2.2 AA; CSS-only motion that honors reduced motion."

## What stays open (as asked)

1. **Where the site lives.** Strategy T6 says "new site folder". A SvelteKit app at the repository root would mix its dependencies and scripts into the plugin's release tooling. Recommended: `site/`.
2. **Goal sentence.** Three materially different readings of the strategy: page plus published proof (recommended), page only, or a wider launch site with the launch post.
3. **Component library.** The page needs few interactive parts: one six-tab list, copy buttons, a range slider, and eight `<details>` disclosures. shadcn-svelte is recommended for its accessible tabs, copy-in ownership, and built-in contract; Bits UI or hand-built are leaner.
4. **Icons.** The landing design uses no icon set today. Lucide pairs with shadcn-svelte.
5. **Styling contract.** Needs research (about 30–60 seconds of documentation search), asked with the final confirm.

## Answers (2026-09-29)

| Decision | Answer |
|---|---|
| Location | `site/` — manifest at `site/design/manifest.json`; references recorded as `../design/…` |
| Goal | Page plus published proof |
| Component library | None — every part hand-built; no component contract |
| Icons | `@lucide/svelte` at init; dropped 2026-09-29 (`none`) — the designs draw no icons, only text symbols and CSS shapes |
| Styling contract | Researched: `site/design/research/styling/tailwind-sveltekit.md`, 7/7 on the rubric |
| Confirm | Write the manifest |

Carried from the spec for scaffold: static output (`@sveltejs/adapter-static`) for GitHub Pages (strategy D3, D4). `design/logo/` holds the brand assets; `manifest.deploy.static` lists which reach `site/static/`.

Motion (2026-09-29): the landing's two load animations and five scroll-driven animations are recorded in `manifest.json` under `motion`, because the frame renderer forces reduced motion and captures only end states. Mechanism decided the same day: CSS scroll-driven animations (view timelines), with the end state wherever unsupported or when reduced motion is on; the design's scroll listener is not ported.

## Placeholder register (red-hat F-005, strategy blocker B3)

The landing export contains placeholder content. Build renders each item either wired to the real value or visibly labelled "Example"; it never ships a placeholder as fact. The `compose` gate cannot pass while any item remains unresolved, checked by `grep -rnE '\[n\]|<release-tag>|\.pixel-perfect/|TEAM PLAN' site/src` printing nothing.

| Placeholder | Landing lines | Real value comes from |
|---|---|---|
| `[n]` run numbers (stats, status panel, evolve summary, "Cascades into … [n] more", FAQ token answer) | 257, 273-277, 297, 312, 395 | T6 AC-4 — measured dogfood run numbers |
| `.pixel-perfect/manifest.yaml`, `.pixel-perfect/inventory.yaml`, `frames: 12`, "WRITES `.pixel-perfect/`" | 235-249, 381 | This site's real `site/design/manifest.json` and `site/design/inventory.json` |
| `git clone --branch <release-tag>` (Cursor, OpenCode tabs) | 423-426 | T1 — the published release tag |
| "Third-party scan results — pending" | 383 | T18 — scan results, or remove the box until they exist |
| Demo video poster "60–90 s" | 266 | T8 — the recorded demo and its poster frame |
| `$24` Team plan card in the proof slider, Why section, and social image (the slider compares identical markup) | 123-138 | T21 — real frame-to-component pairs from this build |
| "V9 · 2026-09-29", "version 9", `v9.1` pill | 66, 398, 301 | The release version at build time |
