# Assimilate

Take something that is **not** components you can use — a new mockup of your own design, or the UI of a site or design you admire — analyze it, and fold what it holds into your design system. Works on a brand-new project (no manifest yet) and on an existing one.

The analysis is the same one `pixel-perfect:build` runs before it plans: `docs/DESIGN-ANALYSIS.md` renders the sources to frames, reads every frame once through the design contract and the bundled aesthetic lens (`docs/frontend-design/FRONTEND-DESIGN.md`), and gates the result with `verify-inventory.mjs`. Assimilate adds the two things build does not do: it can learn from a source you do **not** own without copying it, and it shows you a report before anything joins your system.

```
your mockup  ─┐                                         ┌─ own: frames + inventory → build / evolve
              ├→ design analysis (render · read · gate) →┤
admired UI   ─┘                                         └─ inspiration: adopted components + token proposals
```

## Usage

```
pixel-perfect:assimilate [<source>…]
```

## Arguments

- `<source>`: what to analyze — an HTML export or deck, a URL, a screenshot, or a directory of screenshots and HTML files (each file is its own source). Several may be given. Omitted → detected candidates are offered in `A0`.

## Gate Check

**No gate required** — this runs before or after `init`. Without a manifest, persisting leaves `design/inventory.json`, `design/reference/`, and a receipt for `init` to pick up; with one, it records into the manifest directly.

## What it never does

- **Copy a brand.** From a source you admire it takes structure, tokens, and patterns — never logos, brand marks, product names, copy text, or proprietary assets. Those are recorded as unclaimed with the reason "third-party brand or content — not assimilated".
- **Publish someone else's pixels.** Screenshots of an admired source stay in the run's `reference/` folder, which the run git-ignores with its own `reference/.gitignore` (`*`) — your project's `.gitignore` is never edited. The manifest keeps the URL, the capture date, the content hash, and what was adopted.
- **Turn an admired source into your screens.** Its frames can justify a component, never a route or a screen state (`verify-inventory.mjs` Check N).
- **Build.** It records what to make; `pixel-perfect:build` (or `evolve`, after `compose`) makes it.

## How this workflow asks

Every decision below is collected with `USER_CHOICE` — see `workflows/RUNTIME-CONTRACT.md`, "User choice protocol" and "Turn shape". The `user_choice` blocks in this file are the wording and options to use with the harness's question mechanism; they are never printed.

The analysis produces more than a digest holds. **It goes in a file, not in the chat:** `design/assimilations/<run>/report.md`, named in the digest that precedes `A1`.

| Batch | Phase | Decisions | Fires |
|-------|-------|-----------|-------|
| A0 | orient | what you want to do · what the analysis should know · which sources | always, before anything is rendered. Sources joins it only when the input named none or did not resolve |
| A1 | report | persist the findings | always, after the report. Re-asked after a "Change" edit |

Two calls in the common case; three when the user changes the result once. Nothing is rendered, read, or written before `A0` is answered.

---

## Phase 1: ORIENT (cheap)

1. **Resolve the sources.** Each argument must exist (a URL is accepted as given). Anything that does not resolve is asked in `A0` Sources, with the nearest match first — never guessed.
2. **Detect candidates** when no source was given: design files under `design/` that are not in `manifest.references` and not in an earlier assimilation receipt, plus `manifest.assimilate_candidates` (products the user named at init). When there are none, drop the detected-candidates option from `A0` Sources.
3. **Set each source's role.** Intent sets the default; when the sources mix kinds, a file under the project's `design/` is `own` and a URL or a path outside the project is `inspiration`, and the digest lists each source with its role so the user can correct it with Other.
4. **Classify the project** — this decides what persisting writes:
   - **new** — no `design/manifest.json`
   - **pre-compose** — a manifest, and no platform has `compose: passed`
   - **post-compose** — a platform has `compose: passed`
5. **Digest** in twelve lines or fewer — the sources, the project state, and what the analysis will do — then fire `A0`:

```
ASSIMILATE — 2 sources · project: pre-compose (web-desktop, web-mobile)
  design/new-dispatch-board.dc.html       html export
  https://fieldpro.example/pricing          url
  Next: one design analysis (render · read · gate), then a report before anything is kept.
```

```user_choice
batch: A0 — what to assimilate
- header: Intent
  question: What do you want to do with these sources?
  options:
    - label: Break down my new mockup (Recommended)
      description: The source is your own design. Its frames become pixel targets, and its screens, states, and components join your inventory for build to make. Use this for a new page or flow you designed.
    - label: Learn from a source I admire
      description: The source is someone else's UI. The analysis records its tokens, patterns, and component structures as proposals you can adopt in your own style. Nothing of its brand, copy, or screens is copied.
    - label: Something else
      description: Choose Other and describe it. A request that belongs to evolve (change the existing system), refine (adjust a built component), or research (notes only) is sent there instead.
- header: Context
  question: Anything the analysis should know before it starts? Choose Other to type it.
  options:
    - label: Nothing to add (Recommended)
      description: The analysis reads every frame with the inventory contract and the aesthetic lens, and reports everything it finds. You narrow it afterwards in the report step.
    - label: Focus on specific parts
      description: Choose Other and name the parts, such as the pricing table or the onboarding flow. The analysis still accounts for every frame but goes deepest on what you named.
    - label: Ignore some parts
      description: Choose Other and name what to skip, such as the footer or the ads. Those parts are listed as unclaimed with your words as the reason, so nothing about them is adopted.
- header: Sources
  question: Which sources should be analyzed?
  options:
    - label: The detected candidates (Recommended)
      description: Uses the design files found under design/ that no reference or earlier assimilation covers yet, plus the products you named at init. The digest above lists them.
    - label: Paths or URLs I will paste
      description: Choose Other and paste file paths, directories of screenshots, or URLs, separated by commas. Each file in a directory is analyzed as its own source.
```

Order the Intent options so the detected intent is first and recommended: a source under `design/` reads as your own mockup, a URL or a named product as a source you admire. **Something else** that resolves to another command names it and stops; otherwise its text becomes the intent the brief carries.

---

## Phase 2: ANALYZE

The `A0` answer authorizes this phase. Run `docs/DESIGN-ANALYSIS.md` Steps 1–4 with:

| Parameter | Value |
|---|---|
| `SOURCES` | the resolved sources, each with the role the intent gives (`own` or `inspiration`) |
| `OUT` | `design/assimilations/<YYYY-MM-DD>-<slug>/` (the slug names the first source) |
| `PRIOR` | `design/inventory.json`, when it exists |
| `CALLER` | `"assimilate" workflow (DESIGN ANALYSIS)` |
| `NOTES` | the `A0` Context answer, or none |
| `LENS` | `docs/frontend-design/FRONTEND-DESIGN.md` |

Before rendering, write `<run>/reference/.gitignore` containing `*`, so the run's screenshots are never committed and nothing outside the run changes. The gate must pass before the report is written; a read that fails it twice stops the run and shows the violations.

---

## Phase 3: REPORT

Write `<run>/report.md`:

1. **What was done** — the sources with their roles, frames rendered (claimed · unclaimed), the `design engine:` line, and the user's notes.
2. **What was found** — per layer, each item marked **new**, **reused** (an existing component covers it), or **variant** (an existing component needs a new state or variant), with the frames that show it. For your own mockup, the routes and states as well.
3. **The aesthetic lens** — for each source, the five headings: typography, color, motion, spatial, backgrounds.
4. **Proposals** — for a source you admire: the tokens, patterns, and components worth adopting, each with its evidence and how it would fit your system. For your own mockup: what joins the inventory.
5. **Left out** — every unclaimed frame or part and why, including third-party brand and copy.
6. **What persisting writes** — the matrix row for this project state, in plain words.

Then digest it in twelve lines or fewer, naming the report, and fire `A1`:

```
ASSIMILATED — https://fieldpro.example/pricing (inspiration) · design/assimilations/2026-09-30-fieldpro-pricing/report.md
  14 frames (11 claimed · 3 brand/copy, left out)
  NEW        2  PlanComparisonTable (organism) · BillingToggle (molecule)
  REUSED     3  Button · Tab · Badge
  VARIANT    1  Button — a ghost variant with an arrow
  TOKENS     4  proposals: denser type scale, 8px grid, one neutral border, softer radius
  Lens: tight grotesk type, monochrome with one accent, generous whitespace, no motion.
```

```user_choice
batch: A1 — keep the findings
- header: Persist
  question: Fold these findings into your design system?
  options[own]:
    - label: Fold it into the system (Recommended)
      description: Merges the mockup's frames into design/reference, adds its screens, states, and components to design/inventory.json, and records the source in your manifest; build makes the new items next. If your system is already composed, it is recorded for evolve instead, which proves the change.
    - label: Change what's folded in
      description: Choose Other and name new items to drop, rename, merge, or move to another layer (items already in your system change through evolve). The run is corrected, re-gated, and shown again before anything is kept.
    - label: Keep the report only
      description: Leaves the report and the run's analysis in design/assimilations to read later and changes nothing else in your project. Nothing is recorded in the manifest.
    - label: Discard this run
      description: Deletes the run folder, including its screenshots and analysis. Your inventory, reference frames, and manifest are exactly as they were before the run.
  options[inspiration]:
    - label: Adopt the proposals (Recommended)
      description: Adds the proposed components to your inventory as things to build in your own style, and records the token and pattern proposals in your manifest. The admired source's screenshots stay local and are never committed.
    - label: Change what's adopted
      description: Choose Other and name the proposals to keep or drop, for example adopt the comparison table but not the type scale. The run is corrected, re-gated, and shown again before anything is kept.
    - label: Keep the report only
      description: Leaves the report and the run's analysis in design/assimilations for later and adopts nothing. Your inventory and manifest are unchanged.
    - label: Discard this run
      description: Deletes the run folder, including the local screenshots and the analysis. Nothing about this source remains in your project.
```

---

## Phase 4: PERSIST

**Change** applies the named edits to `<run>/inventory.json` and the proposals, re-runs the gate (`docs/DESIGN-ANALYSIS.md` Step 3), rewrites the report, and asks `A1` again. **Keep the report only** writes nothing outside the run folder. **Discard** deletes the run folder.

**Fold it in / Adopt** runs `docs/DESIGN-ANALYSIS.md` Step 5 (staged: own frames merged and the inventory gated with `--prior` before anything in `design/` changes) — except post-compose, where `evolve` runs that step — then writes `<run>/receipt.json`, removes its sources from `manifest.assimilate_candidates`, and records it by project state:

| Project | Your own mockup | A source you admire |
|---|---|---|
| **new** | `receipt.json` — `init` adds its own sources to `references`, writes the inventory receipt, and records the assimilation. Next: `pixel-perfect:init` | `receipt.json` only — adopted components, tokens, and patterns wait there; `init` records them and build plans the components. Next: `pixel-perfect:init` |
| **pre-compose** | Add the sources to `manifest.references`, write the manifest `inventory` receipt, append to `assimilations[]`, and set the `plan` gate back to `pending` if it had passed so build plans the new items. Next: `pixel-perfect:build` | Append to `assimilations[]`; never touch `references`. Adopted components join `design/inventory.json` when one exists (and `plan` resets if it grew); otherwise build plans them from the receipt. Next: `pixel-perfect:build`, or `pixel-perfect:refine` to apply adopted tokens to an existing theme |
| **post-compose** | Append to `assimilations[]` only. Next: `pixel-perfect:evolve design/assimilations/<run>/`, which proves the change against the golden catalog | Same |

`<run>/receipt.json` and each `manifest.assimilations[]` entry share one shape:

```json
{
  "run": "2026-09-30-fieldpro-pricing",
  "date": "2026-09-30",
  "intent": "inspiration",
  "notes": "Focus on the plan comparison table",
  "sources": [{ "ref": "https://fieldpro.example/pricing", "hash": "sha256:…", "role": "inspiration" }],
  "adopted": {
    "components": [
      { "name": "PlanComparisonTable", "layer": "organisms", "evidence": "fieldpro.example/pricing frame 03 — plan columns with a sticky header row" },
      { "name": "BillingToggle", "layer": "molecules", "evidence": "fieldpro.example/pricing frame 02 — monthly / yearly switch" }
    ],
    "tokens": [{ "role": "radius-md", "value": "6px", "from": "https://fieldpro.example/pricing", "note": "softer than the current 4px" }],
    "patterns": ["Plan columns stay aligned on scroll with a sticky header row"]
  },
  "report": "design/assimilations/2026-09-30-fieldpro-pricing/report.md"
}
```

Adopted tokens are **proposals**. They change no theme here: `refine`'s token recipe applies them to an existing theme, and `scaffold` reads them when it creates one.

## Completion

One line naming what changed and what runs next:

```
Assimilated — 2 new components and 4 token proposals adopted from fieldpro.example/pricing. Next: pixel-perfect:build
```
