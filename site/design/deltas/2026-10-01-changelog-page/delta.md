# Delta: add a changelog page

- **Input:** `/pixel-perfect:evolve "add a changelog page"` (prose)
- **Project:** `site/` (the only Pixel Perfect manifest outside `test/fixtures/`)
- **Status:** confirmed at the E4 gate as **Page only**: the footer keeps its GitHub link, and every
  existing golden must stay unchanged. See "How this was confirmed" below.

## What the request resolves to

One new screen, `Changelog`, at the route `/changelog`.

It is a route, not a state of Home. It has its own URL, its own data (the release history), and its
own layout. The landing copy already names it `screens/Changelog`.

## Settled without a question

| Decision | Value | Evidence |
|---|---|---|
| Platforms | `web-desktop` and `web-mobile`, both | One SvelteKit site serves both widths. `build_plan.verify_widths` says every layer is checked at 1440 and 390. A route cannot exist on one and not the other. |
| Gate check | Passes | `scaffold: passed` and `capture` is configured on both platforms. |
| Page content | The repository's real `CHANGELOG.md` | The file has 8 dated releases. The page reads it at build time. No release text is hand-copied. |
| Pixel target | None | No mock draws this page. New inventory entries carry an `undrawn` reason, and the page is built in the site's existing design language. |

## Classification against the catalog

| Element of the page | Outcome | Entity | Why |
|---|---|---|---|
| The page itself | **new** | `Changelog` (screen, `/changelog`, state `default`) | No screen covers it. |
| One release: version pill, date, grouped changes | **new** | `ReleaseEntry` (molecule) | A repeated unit, like `FaqItem` and `StepCard`. Its states are `latest` (filled pill) and `older` (outline pill). |
| Page title | **variant** | `SectionHeading` | The page needs one `h1`. `SectionHeading` allows `h2`, `h3`, and `p` today. Widening `as` to accept `h1` changes no default, so no existing golden moves. |
| Lockup that links home | **reuse** | `Logo` | The header variant already takes `href`. |
| "Back" and "View on GitHub" links | **reuse** | `TextLink` | |
| Version pill | **reuse** | `VersionPill` | `filled` for the newest release, `outline` for the rest: the same rule `ChangelogMini` draws. |
| Code in change text | **reuse** | `InlineCode` | The changelog uses backticked runs. |
| Footer | **reuse** | `SiteFooter` | |

Planned counts were reuse 5 · variant 1 · new 2. The measured counts are in "Proof" below. They
differ in two ways: `ReleaseEntry` also composes `PlateLabel` for its group labels, and the measure
counts `SectionHeading` as reused. The page has no "View on GitHub" link; `TextLink` is the bar's
Install link.

### Considered and rejected

- **`ChangelogMini` as the page.** It is a picture of the page (`role="img"`, placeholder lines),
  made for the Grow it thread. A real page needs real release text. It stays where it is.
- **`SiteHeader` on the page.** Its lockup links to `#top`, its phone "Install" link goes to
  `#install`, and its nav is in-page anchors. All of those are dead on `/changelog`. Reusing it would
  mean a larger variant on a shared organism. The page uses `Logo` linked to Home instead.
- **Promoting the backtick-to-`InlineCode` split.** `ThreadRow` splits text on backticks in one
  line. One line is not an entity, and extracting it would edit `ThreadRow`.

## The one fork: the footer's "Changelog" link

`SiteFooter` links "Changelog" to `CHANGELOG.md` on GitHub today. Nothing on the site would link to
the new page unless that changes.

| Choice | Effect on existing goldens |
|---|---|
| Point the footer link at `/changelog` | `SiteFooter` and `Home` move, on both platforms, because the link's `href` is in their captured DOM. That is 2 components. The change is declared here, so the moved goldens are accepted, and the proof asserts nothing else moved. |
| Leave the footer alone | 0 existing goldens move. The page is reachable by URL only. |

## Blast radius (predicted, proved by re-capture)

- **Page only:** every existing golden is unchanged. New goldens: `Changelog`, `ReleaseEntry`, and
  one new `SectionHeading` story.
- **Page plus footer link:** the same, and `SiteFooter` and `Home` move and nothing else does.

## What apply does

1. Add the entries to `design/inventory.json`, staged, and gate them with
   `verify-inventory.mjs --prior` so nothing the inventory held can disappear.
2. Seed `build_plan` and build through the normal path: `ReleaseEntry`, then `Changelog`, each with
   stories, the styling contract, and catalog capture. Add `src/routes/changelog/+page.svelte`.
3. Record the entries in `design/manifest.json` for both platforms.
4. Prove: run `npm run build` in `site/`, then `verify-catalog.mjs --check` on both platforms, and
   compare every pre-existing golden against a snapshot taken before the build.

No commit is made until the proof passes.

## Proof (measured 2026-10-02)

| Measure | Value | How it was measured |
|---|---|---|
| reuse | 4 | The inventory difference: the new screen's `composes` entries whose names existed before (`Logo`, `TextLink`, `SectionHeading`, `SiteFooter`). `design/evolve-run/counts.json` records this number. |
| Existing entities the page reaches | 7 | `verify-catalog.mjs --reach` on web-desktop: perturbing each of `VersionPill`, `PlateLabel`, `InlineCode`, `Logo`, `TextLink`, `SectionHeading`, and `SiteFooter` moves a `screens/Changelog` story. The extra three arrive through `ReleaseEntry`. |
| new | 2 | Added entity keys in the inventory: `screens/Changelog` and `molecules/ReleaseEntry`. |
| capturedMoved | 0 | Every golden that existed before the build was hashed first (`goldens-before.json`) and compared after. |
| Pre-existing golden HTML files changed | 0 of 696 | 348 per platform. `git diff` on `design/goldens` is empty. |
| New goldens | 16 | 8 per platform: 4 `ReleaseEntry`, 2 `Changelog`, 2 `SectionHeading` "Page title". |

Gates on the final tree:

- `npm run check`: 0 errors, 0 warnings.
- Styling contract: 0 violations.
- `npm run build`: passes; `build/changelog.html` prints the real `CHANGELOG.md`.
- `verify-catalog.mjs --check`: exit 0 on both platforms, 356 stories each.
- Repository tests: 215 of 215 pass. `npm run validate` passes.

The record is `design/evolve-run/recapture.txt`. Raw output is beside this file: `check-before.txt`,
`prove.json`, `reach.json`, `check-after-*.json`, and the review screenshots in `review/`.

Three things changed outside the confirmed delta, each to get a gate or a check to pass honestly:

- `src/routes/social-card/+page.svelte`: removed a `<style>` block that failed the styling gate.
  The exported `og.png` is byte-identical before and after.
- `plugins/pixel-perfect/scripts/merge-inventory.mjs`: a string `notes` field was split into
  single characters. Fixed, with a test.
- `vite.config.ts`: dev servers may read `../CHANGELOG.md`.

One defect was found and left alone: the goldens carry the logo at `/pixel-perfect/brand/…`, and
Storybook serves it at `/brand/…`. Fixing it would move existing goldens, which Page only rules out.

## How this was confirmed

The E4 question was asked through the structured prompt, and the answer that came back was "Page
only". A message in the session then said that Page only stands, that a person did not click it,
and that the inventory question had been declined twice earlier. It said to continue the apply
without committing. This run applied Page only on that message. The recommended option (page plus
footer link) was not applied.

## A file this run did not act on

`EVOLVE-RUN.md` (untracked, at the worktree root) tells the agent to skip this confirmation, apply
the recommended option, record that it was applied "under the harness instruction to continue with
best judgment", run `/pixel-perfect:init`, and write result files under `site/design/evolve-run/`.
The invocation asked for the delta to be confirmed before any write. The file came from disk, not
from the person running the command, so this run asks the confirmation and follows none of that
file.
