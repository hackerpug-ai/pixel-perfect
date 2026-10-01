# Verify — compose gate, 2026-10-01

Platforms: web-desktop (1440) and web-mobile (390). One route, `/` (Home). Source at `bd97164`.

**Result: FAILED on both platforms.** The compose gate stays `pending`, and `design/manifest.json` is unchanged.

## Checks

| Check | web-desktop | web-mobile | Evidence |
|---|---|---|---|
| File exists | pass | pass | `src/lib/components/screens/Home.svelte` |
| Story exists | pass | pass | `src/lib/components/screens/Home.stories.svelte` |
| Compiles | pass | pass | svelte-check: 0 errors, 0 warnings. The vite build and prerender exit 0. |
| Renders | pass | pass | The page served from `build/` in Chrome, light and dark: no page errors, no failed requests. Catalog capture renders every story with no render failures. |
| Composed parts used | pass | pass | Every one of the 17 parts Home composes was perturbed with `verify-catalog --blast`, and Home moved each time. The source is unchanged since that run (`git diff 7bdce85 HEAD -- site/src` is empty). |
| States covered | pass | pass | 11 of 11. Each state's story drives Home into that state, checked against the captured DOM: the tab is selected and only its panel shows, one question is open, the button reads 'Copied ✓', the headline is the alternate one. `dark` is each story's dark capture pass. |
| Responsive | pass | pass | No horizontal overflow at either width. At 1440: two-column hero, Fig. 1 shown, the desktop nav. At 390: one column, Fig. 1 hidden, the phone header. |
| Controls wired | pass | pass | All four props (headline, installTab, faqOpen, copied) have argTypes. |
| Story organization | pass | pass | `Screens/Home` |
| Viewport | pass | **FAIL** | No mobile viewport preset: the Home stories set no `viewport` parameter, and `.storybook/preview.ts` defines none. The 390 render exists only in catalog capture (`--width 390`). |
| Styling contract | pass | pass | `verify-styling-contract.mjs`: 0 violations |
| Component contract | n/a | n/a | `component_contract_source: none` |
| Catalog capture | pass | pass | `--check`: all 346 stories match, with 0 drift, 0 missing, 0 extra. `--layer screens`: 0 uncatalogued. |
| Inventory | pass | pass | `verify-inventory.mjs`: 22 of 22 frames claimed, inventory covered |
| Placeholders (init-brief register) | **FAIL** | **FAIL** | `EvolveThread.svelte:14` and `:25`: `reuse [n]`, `new [n]`, `[n] captured components moved`. These wait for the real evolve run (strategy T6 AC-3). |
| Aesthetic | pass, with a defect | pass, with defects | `frontend-designer` under `docs/DESIGN-CONTRACT.md` compared 32 bands against frames 08–11. Hierarchy, flow, negative space and rhythm all pass. Defects are listed below. |

## Defects to fix

1. **Drift pins 2 and 3 are swapped** (both widths, both themes; confirmed in the 1440 screenshot).
   - Pin 2 sits beside the outlined Copy button, which is note 3, "A fifth button style".
   - Pin 3 sits beside the grey helper line, which is note 2, "An invented gray".
   - Cause: the pins kept the export's positions when the plan card was replaced by the install card, whose button is at the top.
   - Fix: in `DriftComparison.svelte`, swap marks 2 and 3, or move each pin next to the element its note names.
2. **The 390 status panel clips its counts** ("25 co…", "22 co…").
   - Strategy line 546 asks that the "Check the proof" status block not clip.
   - Fix: shorten the status lines in `scripts/record-run.mjs` so they fit at 390.
3. **The 390 code-panel headers wrap** (steps 1 and 3): "This site's / build".
   - Fix: use a shorter header label.
4. **Negligible:** at 1440 the Fig. 1 layer labels are spaced about 42px apart, against about 34px in the frame.

## Not assessed

- Interaction, focus and motion were not assessed: the screenshots are static, with reduced motion. Earlier real-Chrome checks covered the theme toggle, the slider keys and the install tabs.
- Contrast ratios and the tap area of the phone section strip were not measured.

## Fixes since this run (2026-10-01)

These address the defects above. The gate result above stands until verify runs again, and the gate still needs the evolve placeholder resolved.

1. **Drift pins.** Pins 2 and 3 have traded places. In real Chrome, at 1440 and 390, pin 2 sits beside the drift-gray helper line and pin 3 beside the restyled button.
2. **Mobile viewport.** `.storybook/preview.ts` now defines the two platform widths as viewport presets, Desktop (1440) and Phone (390).
   - The new `Screens/Home` story `Phone` opens at 390 in Storybook's UI. Measured: the preview is 390px wide and shows the phone header.
   - Every other story keeps the full canvas.
3. **390 code panels.**
   - The status lines are now at most 36 characters, so the status panel no longer clips at 390 (0px overflow).
   - The header label is "This build", and every header fits on one line at both widths.
   - The other panels still scroll sideways at 390, as the design specifies.

The run numbers were re-recorded with `scripts/record-run.mjs`.

Afterwards:
- Catalog `--check` matches 348 stories at each width. The only changes accepted were the expected ones: Stat, StatGrid, DemoStats, FaqList, CodePanel, StepsTimeline, DriftComparison and Home, plus the new Phone story.
- All 11 Home states are re-proven.
- No import changed.
- svelte-check is clean, the styling contract has 0 violations, and both builds pass.
