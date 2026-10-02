# Evolve delta — add a changelog page

Status: the recorded session is `../2026-10-01-changelog-page/delta.md`. This note is the earlier classification. The recorded counts are reuse 4, new 2, capturedMoved 0.

Sentence: `/pixel-perfect:evolve "add a changelog page"`

Date: 2026-10-01. Project root: `site/`. Inventory before this apply: `site/design/evolve-run/inventory-before.json`.

## E1 — Acquire

The input is prose, not a file or an assimilation run. It names one intent: add a page. It does not name a second screen.

The catalog already has `ChangelogMini`. Its inventory evidence is the assembled Changelog page inside the evolve thread (`Landing.dc.html:298-304`): a bar, the title Changelog, and three release rows. That molecule is the page body. It is not a new screen and it has no route.

The three release labels are the three newest `## [x.y.z]` headings in the repository `CHANGELOG.md` at this apply: `9.2.0` (2026-10-01), `9.1.0` (2026-09-02), `9.0.0` (2026-08-30). The full history stays on the repository changelog.

## E2 — Classify

| Entity | Class | Reason |
|---|---|---|
| SiteHeader | not used | Its logo is `#top` and its phone Install link is `#install`. On `/changelog` those ids do not exist, and prerender fails. Editing the organism would move pre-existing goldens, so the screen does not compose it. |
| SectionHeading | reuse | Existing atom. Page heading. The atom file is not edited. |
| ChangelogMini | reuse | Existing molecule. Page body. The molecule file is not edited. |
| TextLink | reuse | Existing atom. Link to the repository changelog. The atom file is not edited. |
| SiteFooter | reuse | Existing organism. The organism file is not edited. |
| Changelog | new | New screen at route `/changelog`. No reference frame. One story, `Default`. |

No variant, promote, remove, or token change. No sweep.

## E3 — Reach

Addition only. The assertion is non-disturbance: pre-existing catalog goldens must be unchanged, and the new screen must gain goldens. Golden SHA-256 list taken before any edit: 696 `*.html` files under `site/design/goldens/`.

## E4 — Confirm

```
DELTA — +1 screen
  reuse: SectionHeading, ChangelogMini, TextLink, SiteFooter
  not used: SiteHeader (home-only hash links; file not edited)
  new: Changelog (screen, route /changelog)
  remove: none
  sweep: none
```

The recorded session is `design/deltas/2026-10-01-changelog-page/`. It ran on the pre-add tree `af0eb9a`, asked the inventory question, and applied Page only. It added the Changelog screen and the ReleaseEntry molecule. Catalog check on web-desktop and web-mobile each matched, with 8 new stories per platform and no pre-existing golden changed. Measured counts are reuse 4, new 2, capturedMoved 0. The result route is `/changelog`. The captioned recording is that Claude session.

## E5 — Apply

Hand the addition to the existing screen path: `src/lib/components/screens/Changelog.svelte`, its story, `src/routes/changelog/+page.svelte`, the inventory screen entry, and both platform screen registries. Prerender entries include `/changelog` so the unlinked route is in the static build before the thread links to it.

## E6 — Prove

Run `verify-catalog.mjs --check` on `web-desktop` and `web-mobile` before accepting new goldens. `capturedMoved` is the number of pre-existing goldens that drift. Accept only `screens/Changelog/**`, then check again. Counts in `site/design/evolve-run/counts.json` are filled from that measurement and from the inventory diff, not from a predicted line.
