# Build plan — pixel-perfect landing

Advisory. `design/manifest.json` is the durable record; `design/inventory.json` (confirmed 2026-09-30T22:28:46Z) is the required set. Greenfield for components: nothing in the inventory exists on disk yet, so every level is ACTIVE.

## Audit (what exists)

| Level | On disk |
|---|---|
| Tokens | `src/app.css`: 28 colour tokens (both themes), 13 type tokens, radius, layout, the 720px breakpoint, fonts. **No motion keyframes or `--animate-*` tokens; no hatching pattern.** |
| Atoms | None from the inventory. `HelloWorld` is the scaffold's reference component, not part of the landing. |
| Molecules | None |
| Organisms | None |
| Screens | None. `src/routes/+page.svelte` is the SvelteKit starter page. |

## Delta per level

| Level | Status | Create |
|---|---|---|
| Tokens | build | Motion: the three load keyframes (plate registration, ink reveal, Fig. 1 flatten) as `--animate-*` in `@theme`, and the scroll-driven keyframes named in `manifest.motion`; the design-frame hatching as a background token. Everything else is already in `src/app.css`. |
| Atoms | build | 22: Button, ThemeToggle, TextLink, NavLink, Logo, CropMark, RegistrationTarget, ColorStrip, SlugLine, PlateLabel, ProofMark, VersionPill, Stat, InlineCode, PlayButton, SliderHandle, Tab, DisclosureIcon, PlateText, SectionHeading, PrincipleCard, TabNote |
| Molecules | build | 19: CopyBlock, CommandRow, CodePanel, StepCard, PlanCard, ProofNote, GrowCard, ThreadRow, MetaStrip, StatGrid, FaqItem, TouchList, ScanBox, FigureCaption, ChangelogMini, DesignMdCard, SectionStrip, CopyNextStep, ProofFrame |
| Organisms | build | 15: SiteHeader, Hero, ProofSlider, LayerStack, DriftComparison, PrinciplesGrid, StepsTimeline, DemoStats, EvolveThread, DesignMdPromo, InstallSection, FaqList, CloseCta, SiteFooter, SocialCard |
| Screens | build | 1 route: Home `/` with 11 states (default, dark, install-claude, install-codex, install-cursor, install-grok, install-opencode, install-pi, faq-open, copied, headline-alternate) |

No level is SKIP: this is greenfield, and each lower level is ACTIVE.

## How each level is built and verified

- Each item is a Svelte 5 component in `src/lib/components/{atoms,molecules,organisms}/` with a `.stories.svelte` story (title prefix `Components/`, `Molecules/`, `Organisms/`, `Screens/`), every prop on a control, built to match the frames its inventory entry names (`design/reference/…`).
- Styles go only through the `tailwind-sveltekit` contract. States the frames never draw follow `manifest.ui_states`; motion follows `manifest.motion` (CSS scroll timelines, end state under reduced motion).
- Per layer, in order: `svelte-check`, `npm run build-storybook`, the styling gate (`verify-styling-contract.mjs` at the project root), then the layer's catalog goldens. The component-contract gate is `n/a` (no component library).
- Layers above atoms run the composition check (`verify-catalog.mjs --blast <Name>`): every component that claims to compose a lower one must move when that one is perturbed. A copy that does not move fails the layer.
- The gate forbids organisms inside organisms, so Home places ProofSlider and LayerStack into Hero, and CloseCta and SiteFooter sit side by side (inventory notes).

## Other notes

- `HelloWorld` (the scaffold reference) is retired once real atoms exist: it is removed with its goldens at the end of the atoms layer.
- Placeholder content (the brief's placeholder register) is built labelled "Example" or wired to real values; the compose gate cannot pass while any placeholder is unlabelled.
- Ecosystem scan: no component matches a library pattern the project has not already decided (motion is CSS, tabs are hand-built, the slider is a native range input, code colours are hand-authored). Nothing is researched or installed.
