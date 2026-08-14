# HANDOFF — Build the `polish` capability in pixel-perfect

**Written** 2026-08-14T22:10Z by Claude Code / Fable 5
**Repo** pixel-perfect (`/Users/justinrich/Projects/pixel-perfect`) · **Branch** main · **HEAD** 054d00a (clean tree)
**Executor**: written for the Grok CLI harness (or any agent). It is self-contained — every
design rule you need is in this file; external URLs are optional deepening, not dependencies.
**How to use this**: read §1–§2 and §5 (binding laws), run the checks in §4, then start at §2.
Claims are labeled VERIFIED / CLAIMED / ASSUMED — re-verify anything not VERIFIED before you
rely on it. Raw evidence is in §10.

## 1. Mission

Add a new public capability **`polish`** to the pixel-perfect plugin: an autonomous,
reference-free UI quality loop that captures every screen/state of a pixel-perfect project's
REAL running app, judges the screenshots against a published principle taxonomy plus a
generated `DESIGN.md`, auto-fixes the safe tiers through the existing `refine` machinery, and
ratchets a tri-state ledger in `design/polish/` so repeated runs converge instead of thrash.
"Done" = tasks P1–P8 in §2 complete, `npm run ci` green, and the P8 human gate passed on a
real app (not just the fixture).

**Out of scope**: motion/animation judging (agents can't evaluate it yet — leave to humans);
the brain repo's `review-ui`/`design-review` skills (legacy siblings, untouched); the
`product-explorer` interactive-drive stage (optional later add); mock-fidelity comparison
(pixel-perfect `verify` already covers goldens drift).

## 2. Start Here

```bash
cd /Users/justinrich/Projects/pixel-perfect
git rev-parse --short HEAD          # expect 054d00a or a descendant
npm run ci                          # VERIFY the baseline is green before you touch anything
cat plugins/pixel-perfect/workflows/RUNTIME-CONTRACT.md   # the law for every workflow you author
cat plugins/pixel-perfect/workflows/evolve.md             # the freshest capability — your structural template
head -40 CHANGELOG.md                                     # 8.0.0 catalog-capture context
```

**Authoring model (critical)**: the single source of truth is `plugins/pixel-perfect/`
(workflows/ + skills/ + commands/ + scripts/). Harness adapters are **generated** by
`node scripts/build-adapters.mjs` (repo root) and drift-checked by `npm run validate`. Author
in the source, regenerate, never hand-edit generated surfaces. A new capability = one
`workflows/polish.md` + one `skills/polish/` dir + one `commands/polish.md`, mirroring
`evolve`. — VERIFIED (structure listed in §10; generation claim from `package.json` validate
script + 7.4.0 changelog line "generate harness adapters from one source").

### The task plan (execute in this order; P1/P2/P3 can run in parallel)

**P1 — DESIGN.md bridge** (`plugins/pixel-perfect/scripts/design-md.mjs`)
Google open-sourced DESIGN.md (github.com/google-labs-code/design.md): YAML front-matter
design tokens + markdown prose rationale; canonical sections end with "Do's and Don'ts". CLI:
`npx @google/design.md lint|diff|export|spec` (lint = 11 rules incl. WCAG AA contrast, broken
token refs; diff = token-level changes + boolean `regression` + non-zero exit). Spec status:
alpha — pin the npm version you test against.
- Write `design-md.mjs` with modes: `--generate` (project manifest + tokens → `DESIGN.md` at
  the project root; carry the theme rationale from `design/init-brief.md` into prose; put
  project taste rules in Do's and Don'ts), `--lint`, `--diff` (both shelling to the npm CLI,
  mapping its exits to the house convention 0 pass / 1 drift / 2 config / 3 vacuous).
- Wire `--generate` into the `init` and `refine` workflows (small edits: after token/theme
  changes, regenerate + `--diff` as a drift receipt).
- Test: `test/design-md.test.mjs`, fixture-driven, drives the REAL script (copy the pattern
  in `test/catalog.test.mjs`). AC: fixture project yields a lint-clean DESIGN.md; a token
  edit flips the diff regression bit; exit codes correct.
- Trap: the npm bin name `design.md` can mis-resolve; the portable alias is
  `npx -p @google/design.md designmd`.

**P2 — Lens pack + findings schema** (`plugins/pixel-perfect/skills/polish/lenses/*.md`,
`skills/polish/findings-schema.json`)
Seven lens files, each self-contained: (1) `cognitive` C1–C6, (2) `composition` D1–D3,
(3) `a11y-manual` (the criteria automation catches 0% of: focus visible, focus order,
non-text contrast, meaningful sequence, keyboard reach), (4) `states-coverage` (empty/
loading/error/long-content exist and are designed), (5) `consistency` (cross-screen: same
control styled the same everywhere), (6) `adherence` (against the project's DESIGN.md,
especially Do's and Don'ts), (7) `anti-slop` (generic-template tells: identical card grids,
default-blue CTAs, timid evenly-spread palettes, no committed direction).
Each lens file MUST contain: identity (name@version, inputs), the rubric (principle IDs +
definitions from §5.A), a calibration section (what NOT to file), the output contract
(schema below + laws 5/6/13 from §5 verbatim in the prompt), and 2 worked examples.
Findings schema (all lenses emit exactly this):
```json
{ "screen": "orders", "state": "empty", "platform": "web", "lens": "composition@1.0",
  "principle": "D3", "tier": "T1|T2|T3", "severity": "BLOCKER|MAJOR|MINOR|POLISH",
  "observed": "one sentence, describes only what is in the image",
  "proposal": "one concrete change",
  "element": { "ax_ref": "accessibility-tree node ref or testID", "bbox": null },
  "evidence": { "shot": "design/polish/runs/<ts>/shots/orders.empty.png" },
  "fingerprint": "sha1(screen|principle|ax_ref)" }
```
Tier rules (mechanical): **T1** visual polish (spacing, alignment, contrast, token
violations, type scale, focus rings, truncation, dark-mode bugs) → auto-fix. **T2** additive
UX (missing empty/loading/error states, missing feedback, labels, microcopy, a11y labels —
adds without changing flows) → auto-fix. **T3** structural (navigation/IA, flow changes,
removals) → propose-only behind one USER_CHOICE confirm (same shape as `evolve`'s confirm
gate). AC: a schema validator passes/fails example findings; each lens file stands alone.

**P3 — Capture extension** (extend the existing capture path; new
`plugins/pixel-perfect/scripts/capture-polish.mjs` if cleaner)
8.0.0 already captures goldens per `design/goldens/{platform}/{layer}/{name}/{state}.{ext}`
via the scaffold-generated `sandbox:capture` command and `verify-catalog.mjs` — VERIFIED from
CHANGELOG; read `verify-catalog.mjs` before writing anything. Polish additionally needs, per
screen×state: the screenshot, the **accessibility tree / DOM snapshot** (for `ax_ref`
targeting — never model-guessed coordinates), and console errors. Output to
`design/polish/runs/<ts>/{shots,ax,console}/`.
- **Zero-reward render rule**: a screen/state that fails to render is recorded as a BLOCKER
  finding (`principle: "RENDER"`) and is NEVER passed to a lens as an image.
- Adversarial-content variant where the project's seed supports it: long names, wrapped
  headings, validation errors, localized strings ("short demo copy hides breakage").
AC: full matrix from the fixture project; a deliberately broken route produces a RENDER
finding, not a judged screenshot.

**P4 — Deterministic gate** (`plugins/pixel-perfect/scripts/verify-polish.mjs`)
No model involved. Runs: axe-core against captured/live pages (this alone covers ~57% of
accessibility issues BY VOLUME — but 0% of focus-order/focus-visible, which is why lens 3
exists); `design-md.mjs --lint`; horizontal-scroll/overflow probes (320px→1920px); console
error scan. Emits findings in the P2 schema; exit codes 0/1/2/3 (3 = vacuous: no shots).
AC: headless run on fixture emits schema-valid findings; vacuous case exits 3.

**P5 — Calibration harness — the RED test for the critic**
(`plugins/pixel-perfect/scripts/polish-calibrate.mjs` + `test/polish-calibration.test.mjs`)
A probabilistic judge is only trusted after it catches planted defects. Inject known
violations into a clean fixture page, re-render, run the lens, assert the catch:
overflow-a-heading → D3; strip a focus ring → a11y-manual; make all CTAs identical weight →
C2/C4; jitter a card grid's gaps → D1; remove the empty state → states-coverage. The
inject→re-render→verify recipe is published in arXiv 2607.20690 (they released their
injection prompts). **The clean fixture must return zero findings** — a lens that cannot
return "no significant issues" has no concept of significance.
Calibration results land in `design/polish/calibration.json`; the polish workflow REFUSES to
let an uncalibrated or failing lens write ledger entries. AC: every shipped lens passes its
probes; clean-fixture-zero test passes; both run in `npm test` driving the real scripts.

**P6 — The `polish` capability** (`workflows/polish.md` + `skills/polish/SKILL.md` +
`commands/polish.md`, then `node scripts/build-adapters.mjs` + `npm run validate`)
Orchestration, RUNTIME-CONTRACT-compliant (DIGEST turns ≤12 lines; USER_CHOICE only for the
first-run DESIGN.md blessing and T3 confirms; no stubs; durable truth in files):
```
[0] PREFLIGHT  manifest + DESIGN.md (generate+bless on first run) + calibration.json check
[1] CAPTURE    P3 matrix (zero-reward rule live)
[2] GATES      P4 deterministic findings
[3] LENSES     one separate agent session per lens per screen-batch, vision-mandatory,
               each returns schema findings only
[4] MERGE      dedupe by fingerprint · reproducibility filter (law 7) · merge with ledger
[5] FIX        T1/T2 batched by shared root cause, applied via the refine machinery;
               T3 → USER_CHOICE proposals
[6] VERIFY     re-capture changed screens (refine already re-captures — reuse it) ·
               before/after pairwise judged with EXACTLY this question: "Which of these two
               would you be more likely to deliver to a client?" · re-run the one lens that
               filed the finding · NOT clearly improved ⇒ revert (law 3)
[7] RECORD     ledger + trend + report.html (before/after pairs) · DIGEST
Loop [5]–[7] at most 3 cycles (law 4), stop early when a cycle lands nothing.
```
AC: a zero-interaction run on the fixture fixes at least one planted T1 finding end-to-end;
a test that forces a bad fix demonstrates the revert path; `npm run ci` green with adapters
regenerated.

**P7 — Ledger, trend, report** (deterministic writer, `evolve-lib.mjs` style)
`design/polish/ledger.json`: entries `{fingerprint, principle, screen, status, first_seen,
last_seen, note}` with **exactly three statuses, copied from Storybook's a11y addon
semantics**: `error` (open, fails the polish gate), `todo` (known, deferred — warns, never
re-filed as new), `off` (wontfix/not-applicable). `design/polish/trend.json`: per-run open
counts per principle family — **never an aesthetic score** (law 1). `report.html`:
before/after image pairs + family counts. Agents propose; only the script writes.
AC: run 2 on an unchanged app re-files nothing marked todo/off; a regression (fixed finding
reappears) re-opens as `error`; report opens locally.

**P8 — Real end-to-end + release (human gate — the fixture does NOT satisfy this)**
Run the full loop TWICE on the pilot app the user names (§7). Run 1 must show real
before/after improvements in the report; run 2 must converge (few/no new findings — "no
significant issues" is success, not failure). The user eyeballs the report. Then:
CHANGELOG entry, version bump + release via `scripts/release.mjs` per house process.

## 3. State of Play

- Nothing of P1–P8 is implemented — `VERIFIED`: `git log --oneline -8` at 054d00a shows only
  8.0.0 catalog/evolve work (§10); no polish files exist.
- pixel-perfect working tree clean at HEAD 054d00a — `VERIFIED` 22:06Z: `git status
  --porcelain` empty (§10).
- Repo CI baseline green — `ASSUMED` from the release discipline in CHANGELOG; confirm with
  `npm run ci` as your first command.
- The research grounding this plan is stored in the user's knowledge base (holocron document
  `documents_01941a2571991f3cb56cd1df`, revision 3, 29 sources) — `VERIFIED` stored this
  session. You likely cannot reach holocron from your harness; everything load-bearing is
  restated in this file. A markdown copy sits at the Claude session scratchpad (perishable,
  see §4).
**Landed**: nothing in this repo this session. **In progress**: nothing. **Broken**: nothing known.

## 4. Perishable — Check Before Touching Anything

- **Version skew trap** (observed 22:06Z): the installed plugin cache at
  `~/.claude/plugins/cache/pixel-perfect/pixel-perfect/` tops out at **7.4.0**; this repo is
  **8.0.0**. Never read structure or behavior from the cache — repo HEAD only.
- No live processes, servers, watchers, or queued jobs belong to this work — `VERIFIED` 22:06Z
  (nothing was started).
- **Uncommitted work**: none in pixel-perfect — `VERIFIED` 22:06Z, `git status` clean. (The
  brain repo at `~/Projects/brain` is dirty with ~100 unrelated pre-existing entries; nothing
  there blocks or belongs to this task — do not touch it.)
- A scratch copy of the research report exists at
  `/private/tmp/claude-501/-Users-justinrich-Projects-brain/3ab9eff1-dbcd-4d47-a84a-458d929e3f60/scratchpad/design-fidelity-without-a-picture-report.md`
  (observed 22:05Z; tmp — may vanish on reboot; holocron holds the canonical copy).

## 5. Decisions — Binding. Do Not Undo Without Reading

### 5.A The judging rubric (why these principle IDs)
From the published 19-principle taxonomy (arXiv 2607.20690, UCSC/CMU, 2026-08-04; a 4B
vision model reached 84% F1 against it — it is learnable, citable, and reference-free).
Admission rule for any principle you add: it must be **grounded** (traces to a citable
standard), **injectable** (you can plant a violation programmatically — that is what P5
does), **verifiable** (confirmable from the rendered page). C/D violations are judged
**relative to the page's own visual language**, which is why no mock is needed.
- **C1 Similarity** — same-function elements must look alike (inconsistent nav links).
- **C2 Von Restorff** — the most important item must stand out (all CTAs equal = nothing draws the eye).
- **C3 Miller's Law** — chunk information (a flat 15-item menu with no grouping violates).
- **C4 Hick's Law** — reduce equal-weight choices; there must be a primary action.
- **C5 Affordance** — interactive elements need signifiers (clickable card with no cursor/hover cue).
- **C6 Fitts's Law** — primary targets large and near their context (tiny submit far from its form).
- **D1 Spacing Consistency** — even gaps between same-level elements (jittery card grid).
- **D2 Visual Balance** — weight distributed, not lopsided (content crammed to one side).
- **D3 Content-Container Fit** — no overflow/clipping/under-fill (text spilling out of a button).
- **A-family (verified subset)**: A1 Non-text Contrast (WCAG 1.4.11, ≥3:1 for UI component
  boundaries), A2 Semantic Structure (real buttons/labels, not styled divs), A3 Target Size
  (WCAG 2.5.8, ≥24×24px). A4/A5 and the dark-pattern B-family are defined in the paper —
  fetch it if you extend; they are NOT required for v1 lenses.
The a11y-manual lens targets exactly what automation catches 0% of (Deque, 294,958-issue
dataset): Focus Order, Focus Visible, Non-text Contrast, Meaningful Sequence, Keyboard.

### 5.B The laws (each exists because measured evidence says the naive version fails)
1. **No numeric aesthetic scores, ever.** Model exact-scoring is near-random on fine
   differences (48%/40% exact accuracy; "near random on pairwise tasks with small degrees of
   difference"). Verdicts are per-principle binary + severity; the trend is violation counts.
2. **Zero-reward render rule.** An invalid render is a finding, never a judged image —
   prevents the critic hallucinating over a blank/broken page (ReLook).
3. **Accept only improving revisions.** Before/after pairwise with the client-delivery
   question; unclear or worse ⇒ revert. This is the only published mechanism that makes the
   loop monotonic (ReLook "Forced Optimization"). Pairwise IS reliable when the gap is big
   (~90–93%) — which a real fix should produce.
4. **≤3 fix-verify cycles per run.** Gains measured through three cycles; feedback utility
   measurably decays with iteration. "No significant issues" is a legal terminal state.
5. **Inventory before absence.** A lens must list the visible controls BEFORE any "X is
   missing" claim (defeats hallucinated absence — same image judged missing/present/missing
   across runs in the documented experiment).
6. **Binding caps, not polite ones.** "MUST return at most 8 findings per screen. No
   exceptions." — polite phrasing ("be ruthless") was ignored on every measured run.
7. **Reproducibility filter.** A model-lens finding enters the ledger only if it survives two
   independent runs (deterministic P4 findings are exempt).
8. **Vision mandatory.** Lenses judge the PNG. The AX tree is for targeting only — a lens
   that only read the DOM is judging code, not design.
9. **No model coordinates.** Findings anchor to AX-tree refs/testIDs (measured bounding-box
   IoU for model localization: ≤0.22 — unusable).
10. **Conformance is a floor, never a score.** Maximizing token coverage/adoption manufactures
    the generic sameness this tool exists to kill ("stripped of specificity… so generic it
    becomes useless" — and UI-Bench's losing tools "converged on generic templates").
11. **Calibration before trust.** A lens that fails its P5 probes is barred from the ledger.
12. **Real captures only.** No mocked screenshots, no fabricated findings, no stubbed gates —
    house supreme rule; the P5 harness is how the probabilistic part is verified for real.
13. **Strip the framing.** Lens prompts contain the image, the rubric, and DESIGN.md — never
    a narrative of what the screen is "supposed" to be (framing leaks into findings: models
    report the controls they were told to expect).
14. **DESIGN.md is generated, not hand-authored**, from manifest+tokens — one source of
    truth; `--diff` regression bit guards drift. (Also: the brain `frontend-design` skill
    deliberately varies aesthetics between generations — good for greenfield, poison for a
    polish loop; DESIGN.md is the pin. Never let that skill's variety directive into fixes.)

### 5.C Placement decisions
- **Home is pixel-perfect, not the brain review skills** — user-confirmed. The manifest is
  the capture matrix, `refine` is the fixer, catalog goldens are the fingerprint, and
  `design/` is the per-project state home. Chromatic/Storybook (market CI) gate only on
  change and human approval — no reference-free quality gate exists there; polish fills a
  real hole, it duplicates nothing.
- **Ledger semantics are Storybook's tri-state**, not an invented enum — developers already
  understand error/todo/off and the commit-the-baseline ratchet.

## 6. Dead Ends & Traps

- **Trap**: hand-editing generated adapter surfaces. Symptom: `npm run validate` fails
  `build-adapters.mjs --check`. Cause: authoring outside `plugins/pixel-perfect/`. Always
  author source → regenerate.
- **Trap**: reading plugin structure from the installed 7.4.0 cache. 8.0.0 made a breaking
  change: the manifest stores decisions+receipts ONLY; composition edges and controls
  coverage now come from catalog capture — do not read `molecules[].atoms`-style arrays.
- **Trap**: exit codes. House convention is 0 pass / 1 drift / 2 config-or-usage / 3 vacuous
  ("vacuous" = the gate had nothing real to check — passing vacuously is a failure mode).
  Match it in every new script.
- **Tried and failed (this session)**: delegating research to parallel worker agents — 2 of 3
  went idle and never returned output despite two direct requests. Do not build the polish
  workflow to block indefinitely on lens agent returns: give each lens dispatch a timeout and
  a recorded `lens-no-report` outcome.
- **Trap**: `npx @google/design.md` bin-name resolution can fail; use
  `npx -p @google/design.md designmd …`. The format is alpha — pin the version, and treat a
  CLI schema change as a P1 maintenance task, not a reason to fork the format.
- **Do not cite**: the "70% of software experts say quality degraded" statistic floating in
  QA-vendor blogs — primary study unverified.

## 7. Blockers / Decisions Needed From the User

- **Pilot app for P8**: the user must name the real pixel-perfect project for the final gate.
  Until then, develop against the repo's own fixture(s) under `test/` — a fixture pass does
  NOT satisfy P8.
- **Vision capability of the executing harness** — `ASSUMED` risk: lenses require a model
  that actually reads PNGs. If your session's model cannot ingest images, implement
  P1/P3/P4/P5-injection/P7 (deterministic parts) and leave lens authoring validation (P2
  worked-examples) plus P6 lens execution to a vision-capable session; say so in your report
  rather than faking lens output (law 12).

## 8. Map — Pointers, Not Payloads

| What | Where |
|---|---|
| Capability template (freshest, 8.0.0) | `plugins/pixel-perfect/workflows/evolve.md` + `skills/evolve/` + `commands/evolve.md` |
| Workflow law | `plugins/pixel-perfect/workflows/RUNTIME-CONTRACT.md` |
| Gate-script exemplar (modes, exit codes) | `plugins/pixel-perfect/scripts/verify-catalog.mjs` |
| Deterministic-writer exemplar | `plugins/pixel-perfect/scripts/evolve-lib.mjs` |
| Test pattern (fixture-driven, real scripts) | `test/catalog.test.mjs` |
| Adapter generation / repo gates | `scripts/build-adapters.mjs` · `npm run validate` · `npm run ci` |
| Release process | `scripts/release.mjs` · `plugin-release.json` · `CHANGELOG.md` |
| DESIGN.md spec + CLI | https://github.com/google-labs-code/design.md |
| 19-principle taxonomy + injection recipe | https://arxiv.org/pdf/2607.20690 |
| Loop guards (zero-reward, Forced Optimization) | https://arxiv.org/pdf/2510.11498 (ReLook) |
| Ledger tri-state precedent | https://storybook.js.org/docs/writing-tests/accessibility-testing |
| Full research report (28+ sources, quotes) | holocron doc `documents_01941a2571991f3cb56cd1df` (Claude-side; may be unreachable from Grok — this file restates the load-bearing parts) |
| Session memory of the design's evolution | `~/.claude/projects/-Users-justinrich-Projects-brain/memory/ui-polish-loop-goal.md` |

## 9. Environment & Bootstrap

**Test**: `npm test` (`node --test test/*.test.mjs`) · **Full gate**: `npm run ci`
(= `verify` + `validate` + test) · **Adapters**: `node scripts/build-adapters.mjs` after any
source change. None of these were run this session — `ASSUMED` green; run `npm run ci` first
(§2). New runtime deps to add: `@google/design.md` (pin it), `axe-core`, and Playwright if
`capture-polish.mjs` needs its own driver (check what the scaffold-generated
`sandbox:capture` already provides before adding one).
**Conventions**: work on `main` directly (branch creation is blocked by a repo-wide guard);
commit each finished task with a message saying what and why; never `git add -A`; stubs,
fake captures, and self-asserted "verified" are forbidden — a gate passes only when its real
script ran against real renders. Exit-code convention per §6.

## 10. Evidence Appendix

```
$ date -u   →  2026-08-14T22:06:58Z

pixel-perfect (/Users/justinrich/Projects/pixel-perfect):
$ git rev-parse --short HEAD        →  054d00a
$ git branch --show-current         →  main
$ git status --porcelain=v1 | wc -l →  0        (clean tree)
$ git stash list                    →  (empty)
$ git worktree list                 →  /Users/justinrich/Projects/pixel-perfect  054d00a [main]
$ git log --oneline -8
054d00a chore: drop duplicate extensionless icon asset
6b37341 feat: prove living design system on consumer path and close 8.0 gaps
2446f8a feat: ship living design system as major release 8.0.0
062e43d feat: generate harness adapters from one source; ship Cursor channel at 7.4.0
3f1158f chore: bump all channels to v7.3.0
5c511ce feat(ci): fail the build when the contract wiring goes missing
fdbf7d8 feat(build,init): wire the component contract through every layer
1550503 feat(component-contracts): enforce the component library, not just the styling

$ ls (repo root)  →  CHANGELOG.md design docs LICENSE opencode.json package.json planning
                     plugin-release.json plugins README.md scripts test V4-DIRECTION.md
$ ls plugins/pixel-perfect  →  assets commands docs LICENSE scripts skills workflows
$ ls plugins/pixel-perfect/workflows  →  add-platform build design-deconstruct evolve init
                     refine research RUNTIME-CONTRACT scaffold status verify wireframe (.md)
$ ls plugins/pixel-perfect/scripts  →  evolve-lib.mjs verify-catalog.mjs verify-styling-contract.mjs
$ package.json scripts:
  test     = node --test test/*.test.mjs
  verify   = node scripts/release.mjs verify
  validate = node scripts/build-adapters.mjs --check && node scripts/validate-plugin.mjs
             && node scripts/validate-skills.mjs && node scripts/check-runtime-paths.mjs
             && node scripts/validate-workflows.mjs && node scripts/validate-contracts.mjs
             && node scripts/validate-package.mjs
  ci       = npm run verify && npm run validate && npm test
$ plugins/pixel-perfect/.claude-plugin/plugin.json  →  "name": "pixel-perfect", "version": "8.0.0"

CHANGELOG 8.0.0 (2026-08-12), load-bearing lines:
  - verify-catalog.mjs gate: modes --baseline --check --blast --reach --accept;
    exit codes 0 pass / 1 drift / 2 config/usage / 3 vacuous;
    goldens at design/goldens/{platform}/{layer}/{name}/{state}.{ext}
  - public capability `evolve` (workflow + generated command/skill/OpenCode surfaces),
    one confirm gate before writes
  - BREAKING: manifest stores decisions and receipts only; dependencies/controls from capture
  - refine re-captures after change; status reports drift from capture
```
