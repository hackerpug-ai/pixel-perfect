# Landing remediation plan

Stop. This document does not implement F-001, F-002, F-003, or F-004.

Status: open. Work on F-001, F-002, F-003, and F-004 has not started. This plan does not mark those findings done. A later rerun of `.spec/reviews/red-hat-2026-10-01-design-comparison.md` is not the oracle for any task. Each task below has its own command. The review and `.spec/reviews/red-hat-2026-10-01-design-comparison-evidence/` stay as the record of the current failure.

Checked at planning time: `HEAD` is `86381ff` on `main`. `npm run check`, `npm run build`, and `npm run sandbox:capture` already exist in `site/package.json`. The site package has no `lint` script and no `test` script. This plan adds neither of those scripts.

## Integration owner

Integration owner: `sveltekit-implementer`.

That owner sequences the shared paths, runs the literal command for each task, and leaves the task open when the command fails. The owner does not close F-002 while Play does nothing or while `[n]` is still rendered. No other role is the integration owner.

## ID legend

| ID | What it is |
|---|---|
| F-001, F-002, F-003, F-004 | Findings in the 2026-10-01 design comparison. Open. |
| CHG-001 | The review change that closes F-001. Not started. |
| CHG-002 | The review change that closes F-003. Not started. |
| Review AC-1 through AC-5 | Comparison criteria in the review's verdict table. AC-1 is section and component inventory. AC-2 is the visual system. AC-3 is sampled motion. AC-4 is install, navigation, copy, and FAQ. AC-5 is social and logo delivery. These are not the new task checks in this plan, and they are not the acceptance criteria of T6, T8, or T21. |
| T6, T8, T21 | Existing tasks in `.spec/prds/landing/strategy.md` (the table at lines 809-811). Their own AC lists stay theirs. A task below names which of those it closes or depends on. |

New task checks are the "Done when" lines in each task. They do not reuse the labels AC-1 through AC-5.

## Source, upstream evidence, and publication

- Source edits change Svelte files, `site/vite.config.ts`, `site/scripts/`, `site/package.json`, and files the export script writes under `site/static/`.
- Upstream evidence is the real T6 evolve run, the T21 transcript, counts, and result page, and the T8 recording and captions. F-002 wiring waits on those files.
- Publication is an absolute social URL and any deploy. It waits on the hostname named under F-001. F-002, F-003, and F-004 do not wait on it. No task deploys or publishes.

## Ownership sequence

One file owner per task is named on the task. Shared paths follow this order. The integration owner does not let a later task start a shared path early.

| Order | Task | Paths it may write | Waits on |
|---|---|---|---|
| 1 | F-003 / CHG-002 | `site/src/lib/components/organisms/InstallSection.svelte`. Creates `NEW: site/scripts/verify-landing.mjs` with the `install-deeplink` case only. | Nothing in this plan. |
| 2 | F-001 / CHG-001 | First edit to `site/package.json` (`export:social`). `NEW: site/scripts/export-social-card.mjs`. Route, layout, page, `site/vite.config.ts`, and the static icon and `og.png` outputs. | Nothing in this plan. The hostname blocks publication only. |
| 3 | F-004 | Second edit to `site/package.json` (`verify:landing`), after `export:social` is present. Extends `site/scripts/verify-landing.mjs`. Edits `site/scripts/sandbox-capture.mjs`. | F-003, so healthy `install-deeplink` can pass. F-001, for the `package.json` sequence. |
| 4 | F-002 wiring | `site/src/lib/components/organisms/DemoStats.svelte`, `site/src/lib/components/organisms/EvolveThread.svelte`, `NEW: site/scripts/verify-demo.mjs`. | F-002 phases 1 to 3 (the evidence). No shared path with F-001 or F-004. |

F-002 phases 1 to 3 write only `site/design/evolve-run/` and `site/static/demo/`. They may run beside tasks 1 to 3. They do not edit `site/package.json` or `site/scripts/verify-landing.mjs`.

Do not remove, reset, or repurpose the three existing worktrees:

- `.claude/worktrees/agent-a17301792657d87fa`
- `.claude/worktrees/assim-live`
- `.claude/worktrees/imp-all-6-steps-utilize-github-1790890719-all-6-steps-utilize-github`

Mutation worktrees for F-004 are new detached worktrees, created for that run and removed after the evidence is copied.

## Task F-001 / CHG-001

### Finding and existing criteria

Closes F-001 and CHG-001.

Closes the social-tag part of T6 AC-7 (title, description, and social tags are present on the built page). Does not close T6 AC-1, AC-2, AC-3, AC-4, AC-5, or AC-6. Does not add the cookieless analytics script from T6 AC-7. Depends on T6 only for that social-tag slice. Does not close or depend on T8 or T21.

Review AC-5 is the comparison criterion this finding came from. The checks below are not review AC-5, and they are not T6's AC list.

### Paths and owner

File owner: `sveltekit-implementer`. Reviewer: `sveltekit-reviewer`. `frontend-designer` is not used. SocialCard and the mark-B artwork already exist, so there is no design session.

Order: task 2 in the ownership sequence. First writer of `site/package.json`.

Existing paths this task edits:

- `site/src/routes/+page.svelte`
- `site/src/routes/+layout.svelte`
- `site/src/lib/assets/favicon.svg` (stop using it as the icon; the starter file is removed from the layout)
- `site/vite.config.ts`
- `site/package.json` (add `export:social` only)

New paths this task creates:

- `NEW: site/src/routes/social-card/+page.svelte`
- `NEW: site/scripts/export-social-card.mjs`
- `NEW: site/static/og.png`
- `NEW: site/static/favicon-16.png`
- `NEW: site/static/favicon-32.png`
- `NEW: site/static/favicon-64.png`
- `NEW: site/static/apple-touch-icon.png`

Read-only inputs: `site/src/lib/components/organisms/SocialCard.svelte`, `design/logo/favicon-16.png`, `design/logo/favicon-32.png`, `design/logo/favicon-64.png`, `design/logo/favicon-180.png`, `site/design/manifest.json`.

### Behavior

One arrangement. `export-social-card.mjs` is the only producer of the public PNG and the only copier of the icons.

1. `site/src/routes/social-card/+page.svelte` renders `SocialCard` and nothing else. Body margin is 0. The root layout already prerenders (`site/src/routes/+layout.ts`). The card keeps its own `data-theme="light"` and its 1200 by 630 box. The page waits until `/proof/install-card-desktop-light.png` has decoded before a screenshot is taken.
2. `site/scripts/export-social-card.mjs` runs after `npm run build`. `npm run preview` does not read `site/build`. It sirvs `site/.svelte-kit/output/client` under `paths.base`, and it reads HTML from `site/.svelte-kit/output/prerendered/pages`. `kit.outDir` defaults to `.svelte-kit`. The script's screenshot server uses that same mapping on an ephemeral port, with Playwright `playwright-core` and `channel: 'chrome'`, then closes before it returns. It opens the prerendered social-card page, screenshots the SocialCard element (not the browser chrome) at 1200×630 with `deviceScaleFactor` 1, and writes `site/static/og.png`. The script is rerun whenever SocialCard changes. Nobody draws a replacement PNG by hand.
3. The same script copies the approved mark-B rasters, byte for byte, into `site/static/`:
   - `design/logo/favicon-16.png` to `site/static/favicon-16.png`
   - `design/logo/favicon-32.png` to `site/static/favicon-32.png`
   - `design/logo/favicon-64.png` to `site/static/favicon-64.png`
   - `design/logo/favicon-180.png` to `site/static/apple-touch-icon.png`

   Strategy D5 and `manifest.json` `deploy.static` already assign these PNGs to mark B. The task ships those files. It does not render the favicon from `mark-B-*.svg`, and it does not ship mark A or mark C as the icon.
   Before the script exits, it copies those five files into `site/.svelte-kit/output/client/`, which is the directory `npm run preview` sirvs: `og.png`, `favicon-16.png`, `favicon-32.png`, `favicon-64.png`, and `apple-touch-icon.png`. It also copies the same five next to `site/build/index.html` so the adapter-static folder matches. Preview does not read that folder. The command does not run `npm run build` a second time. A later plain `npm run build` copies `site/static/` into both output trees again.
4. `+layout.svelte` drops the `favicon.svg` import and the starter icon link. It emits icon links for the four static files. Each `href` uses `base` from `$app/paths`.
5. `+page.svelte` keeps the current title and description strings and adds prerendered Open Graph and Twitter tags in the static HTML: `og:title`, `og:description`, `og:image`, `og:image:width` of 1200, `og:image:height` of 630, `og:type` of `website`, `twitter:card` of `summary_large_image`, `twitter:title`, `twitter:description`, and `twitter:image`. The image `href` is `${base}/og.png` through the same `base` import.

Base-path rule. `deploy.target` is `github-pages`. `deploy.base_path` in `site/design/manifest.json` says `''` on a custom domain and `/pixel-perfect` on the github.io project URL, and it says strategy D4 is open. The selected proof value is `/pixel-perfect`, the project-URL value already written in that field. Set it in the existing `sveltekit({...})` call in `site/vite.config.ts` as `paths: { base: '/pixel-perfect' }`. Leave `paths.assets` unset. Leave `paths.relative` at the SvelteKit default `true`, so server-rendered `href`s stay host-less and resolve against the page URL. Do not add a `svelte.config.js`. The custom-domain value `''` is that same `paths.base` field after a hostname is written into the manifest. It is not a second export and not a second icon set.

Hostname dependency. The manifest does not name a hostname. This task does not invent one and does not write `localhost`, `127.0.0.1`, or any other host into `og:image` or `twitter:image`. Absolute publication (`https://` plus the hostname plus `base` plus `/og.png`) is the last step of this same task, and it stays blocked until `deploy.base_path` records that hostname. F-002, F-003, and F-004 do not wait on it.

A Storybook-only card check does not pass.

### Done when

- `npm run check` exits 0.
- The static homepage, fetched with no JavaScript, contains the Open Graph and Twitter tags listed above.
- Resolving those `href`s against the fetched page URL yields paths that start with `/pixel-perfect/`, each GET returns HTTP 200 from the preview of this build, and the served `og.png` IHDR is 1200×630.
- The served `favicon-32.png` bytes equal `design/logo/favicon-32.png`, and the served `apple-touch-icon.png` bytes equal `design/logo/favicon-180.png`. Those files are the mark B artwork. `export:social` has copied them into `site/.svelte-kit/output/client/` before preview.
- No social or icon URL in the HTML contains a scheme or a host.

### Verification command

```bash
cd /Users/justinrich/Projects/pixel-perfect/site
npm run check
npm run build
npm run export:social
npm run preview -- --host 127.0.0.1 --port 4177 --strictPort
node scripts/export-social-card.mjs --check http://127.0.0.1:4177/pixel-perfect/
```

`export:social` is `node scripts/export-social-card.mjs`. That run writes `site/static/` and copies `og.png`, `favicon-16.png`, `favicon-32.png`, `favicon-64.png`, and `apple-touch-icon.png` into `site/.svelte-kit/output/client/` before it returns. Preview sirvs that directory. Copying the files only next to `site/build/index.html` leaves these GETs at 404. The `--check` mode only fetches. It does not write assets and it does not open Storybook. It parses the homepage HTML, rejects any social or icon URL that has a host, resolves the rest against the page URL, requires HTTP 200 for `og.png`, `favicon-32.png`, and `apple-touch-icon.png`, reads the PNG IHDR, and compares those two icon files to `design/logo/`. The preview origin is the checker's fetch target. It is not a value stored in the page.

### Initial state

The current homepage has a title and a description and no `og:` or `twitter:` tags. `+layout.svelte` points at `site/src/lib/assets/favicon.svg`, whose title is `svelte-logo`. Fetches of `/og.png`, `/favicon-32.png`, and `/apple-touch-icon.png` return 404. `paths.base` is unset, so the built site is served at `/`.

### Negative control

Run the `--check` command against the current build, before this task's edits. It must exit nonzero because the tags are absent and the icon URLs 404. Opening SocialCard in Storybook and calling that a pass is a failed control. The control passes only when that Storybook render is rejected and the static fetch fails for the reasons above.

### Evidence

`site/design/evidence/landing-remediation/f-001/check.txt` — stdout of the verification command, the IHDR line, and the byte-compare results. Written by the implementer when the task runs. Not created by this plan.

### Expected failure before the fix

`--check` exits nonzero. The HTML has no `og:` or `twitter:` tags. The icon link is the starter SVG. `/og.png`, `/favicon-32.png`, and `/apple-touch-icon.png` return 404.

### Blockers and unresolved decisions

Blocker for publication: strategy D4 has no hostname. Recorded in `site/design/manifest.json` `deploy.base_path`. Do not invent a domain. This blocker does not stop the root-relative proof, and it does not stop F-002, F-003, or F-004.

No other unresolved choice. The PNG producer, the icon files, and the proof base `/pixel-perfect` are decided above.

### Stop condition

Stop if the PNG cannot be a screenshot of the existing SocialCard, if the task would edit SocialCard's layout, if `design/logo/favicon-32.png` or `design/logo/favicon-180.png` is missing, or if the only way to fill `og:image` is to invent a host. Do not continue by drawing a PNG or by swapping in mark A.

### Scope exclusions

No visual redesign. No change to header mark A or footer mark C. No `llms.txt`, no analytics, no deploy, no plugin edit. No `lint` or `test` script. No edit to `site/scripts/verify-landing.mjs` or `site/scripts/sandbox-capture.mjs`.

## Task F-002

### Finding and existing criteria

Closes F-002. There is no CHG id. The review left F-002 upstream.

Depends on, in this order, and then closes these slices:

1. T6 evolve evidence. Closes T6 AC-3 (one page added by sentence with `evolve`, re-capture shows no other component moved) and records the evolve counts that belong to T6 AC-4. Does not close the rest of T6.
2. T21 transcript, counts, and result page. Closes T21 AC-2 (the evolve thread uses the real T6 AC-3 output). Does not close T21 AC-1 (three slider pairs judged outside the project).
3. T8 recording and captions. Closes T8 AC-1 and T8 AC-2 for the landing demo (real `init`, `build`, sandbox, and one `evolve`, no edited output, captioned, under 8 MB).

Wiring `DemoStats.svelte` and `EvolveThread.svelte` happens after those three phases. It closes none of T6, T8, or T21 by itself.

Review AC-3 and AC-4 are comparison criteria. They are not these checks.

Until phases 1 to 3 exist, the accepted interim presentation stays:

- The demo poster stays inactive. Play does nothing. `init-brief.md` records that decision.
- The evolve thread stays the example thread, including the example caption.
- The install-card comparison stays. The `$24` PlanCard stays absent.
- The scan box stays omitted.
- Mobile navigation stays.
- The approved P-mark family stays (header A, favicon B, footer C).
- CSS view timelines stay. The concept's JavaScript scroll listener stays unported. Reduced motion still shows the end state.

### Paths and owner

This is one task with four ordered phases. A component edit cannot be marked done while Play does nothing or while `[n]` remains.

| Phase | Owner | Writes | Must not write |
|---|---|---|---|
| 1. T6 evolve run | `sveltekit-implementer` | `NEW: site/design/evolve-run/transcript.md`, `counts.json`, `result-path.txt`, `inventory-before.json`, `inventory-after.json`, and the re-capture note | `DemoStats.svelte`, `EvolveThread.svelte` |
| 2. T21 transcript, counts, result page | `sveltekit-implementer` | Reads the phase 1 files, confirms the result route opens, and stops if the transcript, counts, and inventory pair disagree. | The same Svelte files. Does not rewrite the transcript or the counts. |
| 3. T8 recording and captions | The T8 assignment in `strategy.md`: the general `claude` agent with `cmux-cua` | `NEW: site/static/demo/demo.mp4`, `demo.vtt`, `poster.png` | The Svelte files. `frontend-designer` is not used. |
| 4. Wiring | `sveltekit-implementer` | `DemoStats.svelte`, `EvolveThread.svelte`, `NEW: site/scripts/verify-demo.mjs` | `site/package.json`, `verify-landing.mjs` |

Wiring file owner: `sveltekit-implementer`. Reviewer for phase 4: `sveltekit-reviewer`.

The evolve sentence is the strategy sentence: `/pixel-perfect:evolve "add a changelog page"`. The transcript is that run's output.

`counts.json` is `{ "reuse": <integer>, "new": <integer>, "capturedMoved": <integer> }` taken from that run. `result-path.txt` is the site route of the page evolve added. `inventory-before.json` and `inventory-after.json` are copies of the site inventory at the start and end of the run.

Home.svelte already renders both organisms with their defaults. Phase 4 reads the new files from inside the two organisms. It edits `Home.svelte` only if an organism cannot read those files itself, and the integration owner records that reason. The default is that `Home.svelte` stays as it is.

### Behavior

Phase 4, and only phase 4, does this:

- `DemoStats.svelte` points Play at `demo.mp4` with `demo.vtt` and uses `poster.png` as the poster. Pointer activation and keyboard activation both start playback. The poster remains the idle state until the video exists.
- `EvolveThread.svelte` renders the transcript text, the three integers from `counts.json`, and a link to the route in `result-path.txt`. The rendered thread contains no `[n]`. The example caption is replaced by a caption that says the thread is the recorded run.

`verify-demo.mjs` drives the built site in Chrome (`playwright-core`, `channel: 'chrome'`). It fails if any evidence file is missing, if `video.currentTime` does not increase, if no caption cue is available, if the DOM contains `[n]`, if the displayed integers disagree with `counts.json`, if `counts.json` disagrees with the transcript and with the inventory-before / inventory-after difference, or if the result route is not HTTP 200.

Forbidden: an invented transcript, invented counts, a canned media success, a text-presence-only assertion, and stubbed playback. A silent file, a sample clip, or a `currentTime` write from the test is stubbed playback.

### Done when

- After a pointer click on Play, and after a separate keyboard activation, the real video's `currentTime` advances and a caption cue from `demo.vtt` is usable.
- The evolve integers on the page match `counts.json`, the transcript, and the inventory and capture artifacts from phase 1.
- The result page opens (HTTP 200 on the recorded route).
- The rendered page contains no `[n]`.

### Verification command

```bash
cd /Users/justinrich/Projects/pixel-perfect/site
npm run build
npm run preview -- --host 127.0.0.1 --port 4177 --strictPort
node scripts/verify-demo.mjs http://127.0.0.1:4177/pixel-perfect/
```

The script exits 0 only when every done-when line holds. Wiring is task 4, after F-001 has set `paths.base` to `/pixel-perfect`, so this command has one page URL. The preview host is the fetch target. It is not written into the page.

### Initial state

`Home.svelte` renders `DemoStats` with no play handler. `PlayButton` receives an absent callback. A real pointer click opens no media, dialog, or iframe. `EvolveThread.svelte` defaults are `reuse [n]`, `new [n]`, `[n] captured components moved`, and the caption `Example thread — replaced by the real run at launch.` No file exists under `site/design/evolve-run/` or `site/static/demo/`.

### Negative control

Before phase 4, `verify-demo.mjs` must exit nonzero: `currentTime` stays 0 and the DOM still contains `[n]`. A check that only finds the poster label `demo video` is not a pass. Text presence is not playback.

### Evidence

Upstream files listed in the phase table, plus `site/design/evidence/landing-remediation/f-002/check.txt` (stdout of `verify-demo.mjs`, including the two `currentTime` readings, the cue text, the reconciled counts, and the result-route status). Written when the task runs. Not created by this plan.

### Expected failure before the fix

Pointer and keyboard activation leave `currentTime` at 0. The thread still shows `[n]`. The result route does not exist. The command exits nonzero.

### Blockers and unresolved decisions

Phases 1 and 3 have not been run. That blocks phase 4. It does not block F-001, F-003, or F-004. The hostname does not block this task.

No open product choice. The evolve sentence is the strategy sentence. The interim presentation stays until the evidence files exist.

### Stop condition

Stop phase 4 if `transcript.md`, `counts.json`, `result-path.txt`, the inventory pair, `demo.mp4`, or `demo.vtt` is missing. Do not fill `[n]` with guessed numbers. Do not point Play at a file the T8 recording did not produce. Stop phase 1 if evolve did not actually run.

### Scope exclusions

No T21 slider-pair program (T21 AC-1). No scan box. No PlanCard. No removal of mobile navigation. No change to the P-mark family. No JavaScript scroll handler. No execution of the six install commands. No deploy. No stubbed player. No edit to `site/package.json`.

## Task F-003 / CHG-002

### Finding and existing criteria

Closes F-003 and CHG-002.

Closes none of T6, T8, or T21. Depends on none of them.

Review AC-4 is PARTIAL because ordinary tab selection works and this deep link still clips. The checks below are not review AC-4.

### Paths and owner

File owner: `sveltekit-implementer`. Reviewer: `sveltekit-reviewer`.

Order: task 1. This task creates `verify-landing.mjs`. F-004 is the later editor of that file. This task does not edit `site/package.json`.

Existing path: `site/src/lib/components/organisms/InstallSection.svelte`.

- The shared panel is the `role="tabpanel"` element at lines 164-170. One template covers every agent.
- `follow()` at lines 108-114 calls `scrollIntoView()` on that panel. Leave that call in place.

New path: `NEW: site/scripts/verify-landing.mjs`, containing the `install-deeplink` case only.

### Behavior

Add `scroll-mt-16` to the shared panel's `class`. Every agent uses that one element, so every tab gets the same offset. Do not add a second scroll mechanism, a per-tab class, or a JavaScript padding adjustment.

The same task ships the browser check. `verify-landing.mjs --only install-deeplink` opens real Chrome through `playwright-core` (`channel: 'chrome'`) against the static preview.

For each width, 1440px and 390px:

1. Fresh document, `scrollY` 0, load `/#install-opencode` on the site root. This task runs before F-001 changes `paths.base`.
2. Assert the selected tab is OpenCode.
3. Measure the sticky header's bottom (`header` in `SiteHeader.svelte`, the element with `sticky top-0`) and the top of the first command inside `#install-opencode`. Use `getBoundingClientRect`. Pass only when the command top is greater than or equal to the header bottom.
4. Load a different hash, then change the hash to `#install-opencode` without a full reload. Repeat the selection and geometry asserts.
5. Repeat steps 1 to 4 for a second agent tab, `#install-claude`.

Visibility of the command is not the assert. The numbers are.

### Done when

At 1440px and at 390px, a fresh `/#install-opencode` load and a later hash change select OpenCode, and the first command's top is at or below the sticky header's bottom. The same holds for `#install-claude`.

### Verification command

```bash
cd /Users/justinrich/Projects/pixel-perfect/site
npm run build
npm run preview -- --host 127.0.0.1 --port 4177 --strictPort
node scripts/verify-landing.mjs --only install-deeplink http://127.0.0.1:4177/
```

F-003 is task 1, so `paths.base` is still empty and the page URL is the site root. The assert compares rectangle edges. The script reads that URL from the argument. It does not hardcode `http://127.0.0.1:4177/`. F-004 passes `http://127.0.0.1:4177/pixel-perfect/` to the same case.

### Initial state

The panel has no scroll margin. On `/#install-opencode` the header bottom is 61px. The first command top is 40.47px at 1440px and 33.73px at 390px. The selected tab is already correct.

### Negative control

A check that only asserts the OpenCode tab is selected, or that the command text is in the DOM, must not pass this task. Those asserts already hold in the failing measurement.

### Evidence

`site/design/evidence/landing-remediation/f-003/geometry.json` — for each of the four runs (two widths, two agents) and for both the fresh load and the later hash change: header bottom, first-command top, and pass or fail. Written when the task runs. Not created by this plan.

### Expected failure before the fix

The command exits nonzero. Header bottom is 61px. First-command top is 40.47px at 1440px and 33.73px at 390px, both above the header's bottom edge and therefore clipped.

### Blockers and unresolved decisions

None. The hostname does not block this task. The edit is `scroll-mt-16` on the shared panel. The reviewed header bottom is 61px. In the current Tailwind setup `scroll-mt-16` is 4rem (64px). If a measured width still overlaps after that class is present, stop and report the new rectangles. Do not add a second mechanism.

### Stop condition

Stop if the fix would be a per-agent offset, a change to `SiteHeader.svelte`, or a rewrite of `follow()`. Stop if the check reports visibility without the two rectangle numbers.

### Scope exclusions

No other install-section behavior. The six install commands are displayed, not executed. No plugin edit. No `package.json` edit. No motion or clipboard work (those belong to F-004).

## Task F-004

### Finding and existing criteria

Closes F-004. There is no CHG id. The review left F-004 upstream of the source and design comparison.

Closes none of T6, T8, or T21. Depends on none of them. Depends on F-003 only for the ownership sequence: `install-deeplink` is already in `verify-landing.mjs`, and the `scroll-mt-16` edit is already on the branch, before this task's healthy run.

Review AC-2, AC-3, and AC-4 are the comparison criteria whose mutations survived the catalog gate. The checks below are not those review criteria.

`npm run check`, `npm run build`, and `npm run sandbox:capture` already exist. The site package has no `lint` script and no `test` script. This task does not add those two scripts.

### Paths and owner

File owner: `sveltekit-implementer`. Discrimination reviewer: `test-quality-reviewer`. Integration review of the script: `sveltekit-reviewer`.

Order: task 3. Second writer of `site/package.json`. Second writer of `site/scripts/verify-landing.mjs`. Sole writer of the `sandbox-capture.mjs` change.

Existing paths:

- `site/package.json` — add `verify:landing` after `export:social` exists. The script value is `node scripts/verify-landing.mjs`. The page URL is an argument. The script does not default it to `/` or to `http://127.0.0.1:4177/`.
- `site/scripts/sandbox-capture.mjs` — the structural record at the `data-cs` write (about lines 118-124) omits radius. The default page sets `reducedMotion: 'reduce'` (about line 139).
- `site/scripts/verify-landing.mjs` — created by F-003. This task adds cases. It does not remove `install-deeplink`.

New path: none besides the evidence directory. The chosen entry point is `NEW: site/scripts/verify-landing.mjs` (created in F-003, completed here), invoked as `npm run verify:landing -- http://127.0.0.1:4177/pixel-perfect/`. `npm run sandbox:capture` stays the catalog capture. It is not this entry point.

Chosen entry: `site/scripts/verify-landing.mjs`.

### Behavior

`sandbox-capture.mjs` gains `radius:` from `borderTopLeftRadius` in the `data-cs` record, so a 4px to 40px change alters the structural HTML. The default capture keeps `reducedMotion: 'reduce'`, because catalog goldens are end states and CSS view timelines stay as they are. After the radius field exists, regenerate goldens by running `npm run sandbox:capture` on healthy code. Do not hand-edit golden HTML. Do not treat that regenerated HTML as the fidelity oracle.

Normal-motion proof lives in `verify-landing.mjs`, against the built homepage, not in the catalog goldens.

`verify-landing.mjs` drives real Chrome (`playwright-core`, `channel: 'chrome'`) against `npm run preview` of the real build. Each case starts from a fresh navigation with `scrollY` 0. Cases:

| Case | What it does |
|---|---|
| `install-deeplink` | The same geometry asserts F-003 wrote. This task's page URL is `http://127.0.0.1:4177/pixel-perfect/`, because F-001 has set `paths.base`. The root URL from F-003's own command is not reused here. |
| `clipboard` | Granted clipboard permission: activate Copy on a real command, read `navigator.clipboard.readText()`, require the command string. Denied permission: `copyText` in `site/src/lib/copy.svelte.ts` takes the fallback, the control reports `selected`, and the announcement is `Command selected. Press Command-C or Control-C to copy.` |
| `tabs-hash-persistence` | Choosing a tab writes `#install-{id}` and `localStorage` key `pixel-perfect:install-tab`. A reload restores that tab. `#install-grok` selects Grok. A hash that names no agent does not throw and does not select an unknown tab. |
| `slider` | Focus the range input in `ProofSlider.svelte`. End sets the split to 100. Home sets it to 0. Read the input value. |
| `faq` | Click a `FaqItem` `summary`. The `details` element is `open` and the answer is visible. Click again. It is closed. |
| `motion-normal` | `prefers-reduced-motion: no-preference`. Sample the plate layer (`--animate-plate` in `site/src/app.css`) at two times during the load. The computed transform or opacity differs. |
| `motion-reduced` | Emulate `prefers-reduced-motion: reduce`. The plate end state is the registered rest state, and the evolve thread is assembled. The check does not require the animation to run. |
| `fidelity-radius` | A `rounded-md` element on the homepage has computed `border-radius` of 4px, the independent measurement of `--radius-md` in `site/src/app.css`. Compare that measurement with the concept frames in `design/pixel-perfect Landing.dc.html` and `site/design/reference/pixel-perfect-landing-dc/`. A PNG regenerated from the implementation is not this oracle. |

Healthy code: every case exits 0.

Mutations run in an isolated checkout: a new detached git worktree, never on shared `main`, and never in the three worktrees listed at the top. Apply one mutation, run `npm run verify:landing -- http://127.0.0.1:4177/pixel-perfect/`, record which case failed, discard the worktree.

| Mutation | Targeted case that must fail | Cases that must still pass |
|---|---|---|
| `site/src/lib/copy.svelte.ts`: replace `await navigator.clipboard.writeText(text)` with `await Promise.resolve()` | `clipboard` | every other case |
| `site/src/app.css`: `--radius-md` from `4px` to `40px` | `fidelity-radius` | every other case, including `motion-normal` and `motion-reduced` |
| `site/src/app.css`: `--animate-plate` set to `none` | `motion-normal` | every other case, including `motion-reduced` and `fidelity-radius` |

`test-quality-reviewer` reads those three runs and rejects the task if a mutation fails no case, or fails a case other than its target. That review is required. A green catalog capture is not a substitute.

The plugin is not rewritten. `plugins/pixel-perfect/scripts/verify-catalog.mjs` stays as it is.

### Done when

- Healthy `npm run check`, `npm run build`, `npm run sandbox:capture`, and `npm run verify:landing -- http://127.0.0.1:4177/pixel-perfect/` exit 0.
- Each mutation above fails only its targeted case, in an isolated worktree.
- The run includes the real clipboard grant, the denied-permission fallback, tabs, hash, persistence, the slider, the FAQ, one normal-motion temporal assert, and the reduced-motion fallback.
- Fidelity uses the 4px measurement and the named concept reference, not only a regenerated snapshot.

### Verification command

```bash
cd /Users/justinrich/Projects/pixel-perfect/site
npm run check
npm run build
npm run sandbox:capture
npm run preview -- --host 127.0.0.1 --port 4177 --strictPort
npm run verify:landing -- http://127.0.0.1:4177/pixel-perfect/
```

Mutation rerun, from a new detached worktree of this repo, after each single edit:

```bash
npm run build
npm run preview -- --host 127.0.0.1 --port 4177 --strictPort
npm run verify:landing -- http://127.0.0.1:4177/pixel-perfect/
```

`verify:landing` prints `PASS` or `FAIL` per case and exits 0 only when every case passes. Every case, including `install-deeplink`, opens `http://127.0.0.1:4177/pixel-perfect/`. A missing argument, or an argument whose path does not start with `/pixel-perfect/`, exits nonzero. Port 4177 is `strictPort`. If it is taken, stop and free it. Do not silently switch ports.

### Initial state

`verify-landing.mjs` does not exist until F-003 creates it. `package.json` has no `verify:landing` script, no `lint` script, and no `test` script. `sandbox-capture.mjs` records color, border, and type, omits radius, and forces reduced motion. `Home.stories.svelte` can preset copied, open, and selected states. The catalog compare ignores PNG bytes (`plugins/pixel-perfect/scripts/verify-catalog.mjs`).

### Negative control

The recorded mutations survived the real catalog check: all three exited 0 (`probe-summary.json` in the review evidence directory, source SHA `cbf07fd`). A task that uses that catalog compare as its oracle fails this control. Storybook props that start in the copied, open, or selected state do not prove the action.

### Evidence

`site/design/evidence/landing-remediation/f-004/` — healthy stdout, and one log per mutation naming the failed case and the passed cases. Written when the task runs, from the isolated worktree, onto the branch that does not contain the mutation. Not created by this plan.

### Expected failure before the fix

Today there is no `verify:landing` command. The catalog compare exits 0 for the clipboard removal, the 4px to 40px radius change, and `--animate-plate: none`.

### Blockers and unresolved decisions

None inside this task once F-003 has landed the panel fix and the `install-deeplink` case. The hostname does not block this task. No open choice of entry point: the entry is `site/scripts/verify-landing.mjs`.

### Stop condition

Stop if a mutation is applied on shared `main` or on one of the three existing worktrees. Stop if the plugin tree would be rewritten. Stop if a case passes by reading a preset story prop instead of performing the click, key, or clipboard read. Stop if healthy code fails `install-deeplink` because F-003 is not on the branch yet.

### Scope exclusions

No plugin-wide rewrite. No new test runner. No `lint` or `test` script. No deletion of the review or its evidence. No execution of the six install commands. No removal of the three existing worktrees. No hand-edited goldens. Catalog capture stays on reduced motion.

## Retained decisions

These stay in force for every task. They are copied from `site/design/init-brief.md` lines 65-93 and from `manifest.json` `ui_states` and `deploy`:

- CSS view timelines replace the exported JavaScript scroll handler. Reduced motion and unsupported browsers show the end state.
- The demo poster and the example evolve thread are accepted interim states until F-002's evidence exists.
- The install-card comparison replaces the `$24` PlanCard.
- The scan box stays out until a real scan result exists.
- Mobile navigation stays.
- The P-mark family stays. F-001 delivers mark B to the favicon slots. It does not redraw mark A or mark C.
