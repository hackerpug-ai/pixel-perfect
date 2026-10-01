# Red-Hat Review Report

**Report Date**: 2026-10-01T22:21:04Z
**Target**: Built landing components in `site/src` compared with the Claude Code concepts in `design`
**Source revision**: `cbf07fd88048e6aecd0bab5a9f94c621cba0f0a2`
**Reviewed By**: frontend-designer, sveltekit-reviewer, test-quality-reviewer; orchestrator independently checked browser evidence, screenshots, source and branch integrity
**Test-reality lens**: ran (implemented mode); three bounded mutation probes in a disposable checkout

## Executive Summary

**The build preserves the fundamental design.** All seven page sections, the component hierarchy, typography, print-inspired visual devices, responsive layouts, light/dark themes and explanatory motion are present. This does not need a visual rebuild.

The substantial unfinished work is delivering the social/brand assets and replacing the acknowledged demo/evolve examples with real proof. One smaller navigation defect hides the first install command on direct agent links. The catalog checks also have proven blind spots; their green results alone cannot establish design or interaction fidelity.

Review result: **needs-revision for complete public delivery**, while fundamental visual translation passes. The current compose gate already remains pending/failed; this review does not claim anyone marked the site complete.

## Comparison criteria and verdicts

These criteria were derived from the user's comparison request. They are not newly invented sprint requirements. No task checkboxes or implementation files were changed.

| Criterion | Verdict | Evidence and limits |
|---|---|---|
| AC-1: Preserve concept section/component inventory | PASS | `site/src/lib/components/screens/Home.svelte:44-130` renders Hero, Why, Build, Grow, Install, FAQ and Close. Inventory contains 22 atoms, 18 molecules, 15 organisms and one screen. Component-sheet content is represented through reusable components; the sheet itself is intentionally a reference (`site/design/manifest.json:443-445`). |
| AC-2: Preserve desktop/mobile, light/dark visual system | PASS for fundamental fidelity | Compared real Chrome renders at 1440px and 390px in both themes. Typography, palette, hierarchy, spacing and stacking closely follow the concept. All eight layout samples had zero horizontal page overflow. `site/src/app.css:31-69,128-155,194-195`; `design/pixel-perfect Landing.dc.html:23-36`. Exact pixel equality is not claimed. |
| AC-3: Preserve explanatory motion and comparison | PASS for sampled behavior | Real scroll changes the layer separation, drift illustration, build rail and growth illustration; normal-motion progress differs across scroll positions. Slider keyboard endpoints change the split to 0%/100%. `ProofSlider.svelte:44-73`, `LayerStack.svelte:25-79`, `DriftComparison.svelte:55-83`, `StepsTimeline.svelte:65-82`, `EvolveThread.svelte:32-49`. Full timing parity and every browser engine were not tested. |
| AC-4: Working install/navigation/copy/FAQ | PARTIAL | Real Chrome at both widths: six tabs show their respective commands, keyboard tab wrapping works, FAQ opens, and Copy writes the exact instruction to the actual clipboard. Agent deep links select correctly but scroll beneath the header (F-003). Installation commands were displayed, not executed against six harnesses. |
| AC-5: Deliver social/logo concepts in usable website output | FAIL | SocialCard exists, but the page has no Open Graph/Twitter metadata. The favicon is still the Svelte starter logo. Expected image/icon paths return HTTP 404 (F-001). |

## HIGH Confidence Findings (3+ Agents Agree)

None under the skill's reviewer-agreement rule. Direct browser observations are strong evidence, but agreement counts are kept separate from evidence strength.

## MEDIUM Confidence Findings (2 Agents Agree)

- [ ] F-001: The social-card and favicon designs are not delivered by the website. | Severity: HIGH → CHG-001
  Agents: frontend-designer, sveltekit-reviewer.
  Concept: `design/Social preview.dc.html:15-56`; `design/pixel-perfect Landing.dc.html:6-8,16-18`; approved delivery contract at `site/design/manifest.json:437-479`.
  Build: `site/src/lib/components/organisms/SocialCard.svelte:2-7,34-50` implements the card and claims an export at build, but `site/src/routes/+page.svelte:5-12` has only title and description. `site/src/routes/+layout.svelte:3,8` imports `site/src/lib/assets/favicon.svg:1`, titled `svelte-logo`.
  Real HTTP/browser observation: no `og:*` or `twitter:*` tags; `/og.png`, `/favicon-32.png` and `/apple-touch-icon.png` return 404. The header/footer logos themselves are correct. Severity reflects the missing social deliverable; the favicon alone is MEDIUM.

- [ ] F-002: Real demonstrations remain unfinished: Play does nothing, and the evolve thread still shows `[n]` counts. | Severity: HIGH → NO-CHANGE: upstream — recording and real evolve evidence are required — owner: T8 and T6/T21 proof owners
  Agents: frontend-designer, sveltekit-reviewer.
  `site/src/lib/components/screens/Home.svelte:79` renders DemoStats without a player. `DemoStats.svelte:19,27,35` passes an absent callback to `PlayButton.svelte:12-18`. Real pointer activation opens no media, dialog or iframe. `EvolveThread.svelte:23-27` still contains `reuse [n]`, `new [n]`, `[n] captured components moved` and the explicit example caption.
  **This is known deferred launch work, not an accidental failure to reproduce the design.** `site/design/init-brief.md:85,89` records the owner's interim decisions. The concept itself calls the evolve thread an example to replace at launch (`design/pixel-perfect Landing.dc.html:290-311`). The HIGH severity applies to a claim of complete launch proof, not the accepted interim build. Preserve that distinction.

## LOW Confidence Findings (Single Agent)

- [ ] F-003: Direct agent install links hide the first command behind the sticky header. | Severity: MEDIUM → CHG-002
  Agent: sveltekit-reviewer; independently reproduced by orchestrator.
  `site/src/lib/components/organisms/InstallSection.svelte:108-114` calls `scrollIntoView()` on a panel with no scroll margin (`:164-170`). `SiteHeader.svelte:54-55` supplies the sticky header.
  On `/#install-opencode`, the header ends at 61px. At 1440px the first command starts at 40.47px and ends at 60.72px, entirely behind the header. At 390px it starts at 33.73px, hiding its first lines. The selected tab is correct; the viewport position is wrong.

- [ ] F-004: The catalog check cannot prove behavior, motion or complete visual fidelity. | Severity: MEDIUM → NO-CHANGE: upstream — verification tooling is outside the named source/design artifact — owner: site verification owner
  Agent: test-quality-reviewer; orchestrator independently inspected its gate receipts and the differing images/identical HTML.
  In an isolated checkout, all three deliberately broken variants passed the actual catalog check: omit clipboard writing while retaining the success response; change the card radius from 4px to 40px; disable the plate animation. Each targeted run matched 10 captures and returned exit 0 with no drift.
  `site/scripts/sandbox-capture.mjs:118-124` records selected colors, border and typography, omitting radius/geometry. `:139` forces reduced motion. `Home.stories.svelte:28-35` presets selected/open/copied states instead of proving their transitions. PNGs are review artifacts, excluded from automated comparison (`plugins/pixel-perfect/scripts/verify-catalog.mjs:379`).
  These mutations were restored and **are not present in production**. This finding limits what the existing checks prove. It does not negate the real browser behavior observed in this review.

## Test-reality audit

| AC | Could the relevant broken implementation pass current checks? | Real rendering/seed | Mutation result | Interpretation |
|---|---|---|---|---|
| AC-1 | Not mutation-probed | Real Svelte rendering; inventory declarations checked | Not probed within bound | Structural coverage is distinct from concept completeness. |
| AC-2 | Yes | Real Svelte, filesystem, HTTP and Chrome | 4px → 40px radius survived | Before/after PNGs differ visibly; structural capture bytes are identical. |
| AC-3 | Yes | Real component, with reduced motion forced | `--animate-plate: none` survived | End-state snapshots cannot prove animation. |
| AC-4 | Yes | Real component, but copied/open/tab states preset through props | Removed clipboard write survived | Rendering “Copied” cannot prove copying occurred. |
| AC-5 | Not mutation-probed | Component capture does not fetch exported assets | Not probed within bound | Live route/asset checks found the real delivery failure. |

The catalog never exercises denied clipboard access, malformed remembered/hash tab values or normal-motion transitions. The current implementation includes real clipboard handling; the missing negative tests are not evidence that its fallback is broken. This review's live checks add direct evidence but do not create durable regression coverage.

## Gate steps

The target is a pair of source/design directories, not a sprint folder. The skill's Human Testing Gate pre-check does not apply. `site/design/verify-report.md:5,44` already records a failed compose gate and explicitly excludes interaction, focus and motion from its static screenshot assessment. No sprint completion status was changed.

## OVER-ENGINEERING (scoped to the artifact)

Lean already (in artifact scope). No cuts recommended. The current component decomposition preserves the design's repeated typography, print devices and controls.

## Agent Contradictions & Debates

| Topic | Positions | Assessment |
|---|---|---|
| Missing video/evolve proof | Design reviewer calls them HIGH launch gaps; implementation reviewer stresses explicit owner deferrals. | Both are true. Record upstream launch incompleteness without calling it an accidental design omission or reversing the interim decision. |
| Weak catalog oracle | Standing seat recommends CRITICAL under its test-reality rubric. | Consolidated as MEDIUM in this comparison: no injected failure exists in production, the compose gate is already failed, and reviewers directly observed working behavior. Its inability to prove fidelity remains explicit and reproducible. |
| Interaction verdict | Design reviewer passes sampled ordinary navigation; implementation reviewer finds agent deep-link clipping. | AC-4 is PARTIAL because ordinary links and tab selection working do not repair the direct-link scroll defect. |

## RECOMMENDED CHANGES (the change set)

### CHG-001 — Deliver the approved social preview and favicon family · HIGH · effort M

- **Closes**: F-001
- **Target**: `site/src/routes/+page.svelte:L1-12`; `site/src/routes/+layout.svelte:L1-9`; `site/src/lib/assets/favicon.svg:L1`; `NEW: site/src/lib/assets/og.png`; `NEW: site/src/lib/assets/favicon-16.png`; `NEW: site/src/lib/assets/favicon-32.png`; `NEW: site/src/lib/assets/favicon-64.png`; `NEW: site/src/lib/assets/apple-touch-icon.png`
- **Now**: SocialCard is available to Storybook, while the public page exposes only ordinary title/description metadata and the starter favicon.
- **Change to**: Render the existing SocialCard into an actual 1200×630 PNG; import and reference that emitted asset from prerendered Open Graph/Twitter image, title, description and card-type metadata. Resolve the image URL against the chosen deployment origin and base path. Replace the starter SVG with approved mark B and connect the supplied size/touch variants from `design/logo/`. Reuse the existing SocialCard and brand artwork; no redesign is needed. Assets may be imported from `src/lib/assets` to stay within this review's source boundary; fixed root filenames or an automatic export script require the deployment task's supporting-file changes.
- **Verify**: Run `cd site && npm run check && npm run build`; serve the real static output. Fetch the homepage without executing JavaScript, extract social/icon URLs, fetch those exact URLs and check image types and dimensions. The preview must be 1200×630 and visually match the built SocialCard. The favicon must show mark B. The current output fails because social metadata is absent and the icon is Svelte's logo. Check the chosen deployment base path, not just localhost `/`.

### CHG-002 — Keep install commands below the sticky header on deep links · MEDIUM · effort S

- **Closes**: F-003
- **Target**: `site/src/lib/components/organisms/InstallSection.svelte:L108-114`; `site/src/lib/components/organisms/InstallSection.svelte:L164-170`
- **Now**: Deep-link handling scrolls the panel to y≈0, under the 61px header.
- **Change to**: Add `scroll-mt-16` to the tab panels so the existing `scrollIntoView()` clears the header. Apply it to the shared panel template so every agent benefits.
- **Verify**: In real Chrome at 1440px and 390px, open a fresh `/#install-opencode` page and then trigger a hash change from another section. Assert OpenCode is selected and its first command's top is at or below the header's bottom. Repeat for a second agent. Current measured tops are 40.47px and 33.73px against the header's 61px bottom, so this observation fails before the change.

### Not fixable in this artifact

- **F-002 — NO-CHANGE: upstream — owner: T8 recording and T6/T21 proof owners.** Record the actual demo and perform the real evolve run described in `.spec/prds/landing/strategy.md:809-811`. A component edit cannot manufacture that evidence. Once available, wire media/captions in `site/src/lib/components/organisms/DemoStats.svelte`, and supply the real transcript, measured counts and resulting page in `site/src/lib/components/organisms/EvolveThread.svelte`. Verify pointer/keyboard playback advances real media time, captions work, the result page opens, displayed counts match real inventory/capture artifacts, and rendered output contains no `[n]`. Keep the current interim exception explicit until then.
- **F-004 — NO-CHANGE: upstream — owner: site verification owner.** Add `NEW: site/scripts/verify-landing.mjs`, improve `site/scripts/sandbox-capture.mjs`, and expose the command through `site/package.json`. Exercise the real route and browser actions, including actual clipboard contents and denied-permission behavior; add geometry/image checks and motion-enabled temporal assertions. Use original concept frames or independent measurements to establish fidelity before accepting implementation goldens. Each of the three recorded mutations must make its targeted check exit nonzero. These supporting tools are outside the requested `site/src`/`design` change boundary; no plugin-wide remediation was performed.

## Intentional differences retained

- The example $24 pricing card became a real design-frame/live-CopyBlock pair. It was an approved substitution, not a missing PlanCard (`site/design/init-brief.md:90`).
- The pending security-scan box is omitted until real results exist (`:88`).
- The mobile header adds an Install link and section strip to fill an undrawn state (`site/design/manifest.json:431-435`).
- CSS view timelines replace the concept's JavaScript scroll listener, with an end-state fallback for reduced motion or unsupported browsers (`site/design/init-brief.md:65`).
- The social crosshair lockup is replaced by approved mark A; header A and footer C are present. Only favicon delivery is missing.
- Previously recorded drift-pin and mobile status-panel issues are fixed in the reviewed revision. They are not repeated as current findings.

## Agent Reports (Summary)

- **frontend-designer**: No fundamental visual omissions; social/brand delivery gap; two explicit proof deferrals. Independently viewed desktop/mobile light/dark renders and sampled real motion.
- **sveltekit-reviewer**: Social/icon delivery gaps consolidated into one root cause; agent deep-link clipping; direct browser confirmation of tabs, keyboard navigation, clipboard, slider and FAQ.
- **test-quality-reviewer**: One consolidated verification gap supported by three surviving mutations. Real rendering, fixture/seed reality and negative paths audited; no mutation of the main checkout.

## Verification and evidence

Evidence folder: [red-hat-2026-10-01-design-comparison-evidence](red-hat-2026-10-01-design-comparison-evidence/).

- [Desktop concept](red-hat-2026-10-01-design-comparison-evidence/concept-1440-light-top.png) and [desktop build](red-hat-2026-10-01-design-comparison-evidence/built-1440-light-top.png).
- [Mobile concept](red-hat-2026-10-01-design-comparison-evidence/concept-390-light-top.png) and [mobile build](red-hat-2026-10-01-design-comparison-evidence/built-390-light-top.png); [dark desktop](red-hat-2026-10-01-design-comparison-evidence/built-1440-dark-top.png), [dark mobile](red-hat-2026-10-01-design-comparison-evidence/built-390-dark-top.png).
- [Browser and HTTP probes](red-hat-2026-10-01-design-comparison-evidence/implementation-probes.json), [layout/motion measurements](red-hat-2026-10-01-design-comparison-evidence/layout-motion.json), [independent deep-link measurements](red-hat-2026-10-01-design-comparison-evidence/deeplinks.json).
- [Mutation summary](red-hat-2026-10-01-design-comparison-evidence/probe-summary.json), plus individual gate receipts in the same directory. [Radius before](red-hat-2026-10-01-design-comparison-evidence/radius-before.png) / [after](red-hat-2026-10-01-design-comparison-evidence/radius-after.png) visibly differ while the accompanying HTML files are byte-identical.
- `npm run check`: exit 0, no errors or warnings. `npm run build`: exit 0, static output generated. Logs saved as `check.txt` and `build.txt`. The site package declares no lint or test command.
- Anti-stub source scan found no explicit TODO/NotImplemented/fake-named production bodies. Semantic review found the acknowledged inactive demo and example proof content. No source or concept files were modified.
- The main branch remained at the recorded SHA throughout reviewer dispatch. Mutations ran only in an isolated checkout and were restored.

Limits: this is a local design/build comparison, not a deployment certification, six-harness installation test, full accessibility audit or cross-browser performance assessment. No external service or database is part of this static page's interaction path. Clipboard-denied fallback was reviewed in source but not exercised in the live happy-path probes.

## Metadata

- **Agents**: frontend-designer (source, real Chrome, image inspection); sveltekit-reviewer (source, real Chrome/HTTP/clipboard); test-quality-reviewer (source, isolated builds, real Chrome mutation probes).
- **Reviewer selection**: No local AGENTS.md specialist table. Used the mandated design role, the site's SvelteKit reviewer and the unconditional standing seat.
- **Confidence Framework**: HIGH (3+ reviewers), MEDIUM (2), LOW (1); independent orchestrator checks are noted without inflating reviewer counts.
- **Artifact file set**: `site/src/**` and `design/**`, derived from the user's named paths. Site planning, verification and packaging files were supporting evidence. No feature diff/base was supplied; no repository-wide over-engineering hunt.
- **dropped_out_of_scope**: 0 over-engineering findings.
- **changes_recommended**: 2 from 4 consolidated findings; 2 findings require upstream work.
- **no_change_upstream**: 2.
- **Report gate**: PASS 6/6 via check-report.sh; its 14/14 self-tests also passed. This validates report completeness, not product completion.
- **Report Generated**: 2026-10-01T22:21:04Z.
- **Duration**: Approximately 11 minutes through report drafting.
- **Next Steps**: Implement CHG-001/002; finish the already-planned real proof; strengthen the supporting verification before treating catalog green as proof of fidelity.
