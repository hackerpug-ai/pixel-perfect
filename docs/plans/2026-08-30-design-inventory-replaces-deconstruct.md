# Design Inventory replaces design-deconstruct

Status: proposed
Date: 2026-08-30
Evidence: the holocron `web-client` session (cmux `holocron` workspace, surface "pixel perfect",
transcript `~/.claude/projects/-Users-justinrich-Projects-holocron/7d7bd2ba-….jsonl`, 2026-08-29 → 08-30)

## The problem in one paragraph

`design-deconstruct` does two things. One is worth keeping: it reads **every screen of a design
once, up front, looking at rendered frames**, and comes back with the complete list of atoms,
molecules, organisms and screen×states — confirmed with the user — before anything is built. The
other is the waste: it then spends five phases turning that list into token-pure HTML galleries
(dark + light, PDF + PNG, three audit axes) that a project with a component library never needed,
because a Button comes from `shadcn add`, not from a mock. `build` has the opposite shape: it goes
straight to real code (right) but identifies components **per layer, at the moment that layer is
built, from the spec's prose** (wrong). It never looks at the designs when it plans. The fix is to
move deconstruct's first step into `build` as a gated phase that produces an inventory of real
components to make — and delete everything else.

## What actually happened on holocron

The session is the best evidence for both halves of that claim.

1. `design-deconstruct` was invoked on six Claude Design decks. It did the preflight analysis and
   asked four decisions. The user interrupted — "do we need design deconstruct w output work from
   claude design?" — and the workflow's own answer was **no**: the PRD already held the token table,
   the route map and the registry; the engine would re-derive tokens the PRD had already settled
   (the deck still shows abandoned explorations) and mock atoms that `shadcn add` provides.
2. So the project ran `init → scaffold → build atoms → build molecules` with **no inventory step**.
   Build's Phase 4b derived the atom list from the PRD registry table and the molecule list from
   the PRD's "Component reuse" table (components named as reused ≥2 times). Result: 8 molecules.
3. User: *"why are there so few of them? do we need to do an honest deconstruct of the designs to
   make sure we don't forget important components"*. The workflow admitted the method was narrow and
   offered a screen-by-screen visual audit instead of the engine.
4. User: *"you were never meant to just do the gaps but the whole app being mindful of the gaps"*.
   A fork rendered all 32 screens in headless Chrome and wrote `WHOLE-APP-INVENTORY.md`:
   **+1 atom, +5 molecules, 3 bugs in components already marked `verified`**. Cost: 865K tokens,
   34 tool calls. The biggest miss was `MobileTabBar` — at 390px the desktop `NavRail` is replaced by
   a bottom tab bar, a structurally different composition that no prose ever named. Only visible by
   looking at the mobile frame. The earlier text-grep pass (`COMPONENT-GAPS.md`, self-described as
   "source inspection, not visual review") had also marked `TableOfContents` as "verified covered"
   because a mockup carried a `toc` *prop*. A prop is not a component.
5. `build organisms` → user: *"have you processed all design for organism metadata"* → no. A third
   organism (`NavRail`) was sitting in prose only; `DocumentBody` had no composition spec;
   `ResearchCard`'s state matrix was incomplete (the deck draws "Interrupted" and "Cancelled by the
   operator" as two states; the routing doc lists one).
6. User: *"reanalyze our designs such that manifest.json fully covers all our designs"* → a second
   fork, 900K+ tokens, extracting organism metadata and re-rendering two decks that had "only ever
   been spot-checked".

Four user interventions, two ~900K-token forks, three "verified" components that were wrong, and a
`build_plan` that was "frozen at the first pass" — all because the whole-design read that deconstruct
does in its step [3.5] never ran, and `build` has no step that does it.

## The diagnosis (cause vs. consequences)

**Cause:** `build.md` Phase 4b reads `manifest.spec` (text) and computes `delta = spec − code`. It
reads `manifest.references` (the designs) nowhere. Designs enter only as a per-item `target` at build
time, and only when `deconstruction.json` exists. So without deconstruct, the designs are never the
checklist.

**Consequences:** per-layer lists derived late from prose (undercount); the plan frozen at the first
pass; organism metadata never consolidated; no coverage statement ("every drawn screen×state is
accounted for"); every recovery is an ad-hoc fork that re-renders and re-reads everything.

**What the engine does that build does not** (its `SKILL.md` orchestration algorithm):

| Engine step | What it is | Build has… |
|---|---|---|
| `[0] PREFLIGHT` (`_preflight.sh`) | Deterministic: render the concept, fail closed on a blank render, crop one reference PNG per frame from DOM rects | nothing — the model greps text or renders ad hoc |
| `[3.5] INVENTORY PRE-SCAN` | **ONE** whole-concept read (all frames + source) → proposed atom/molecule/organism inventories, the route→state tree, token vocabulary. Written to the manifest, **confirmed with the user before Phase 1**. "Kills mid-phase escape churn." | Phase 4b level plan + per-layer Step 1 lists from spec text; B-mol/B-org asked when reached |
| Per-component record (`PHASE-CONTRACTS.md` READMEs) | Required `## Composes` / `## Atoms used`, `## States`, `## Variants` tables per item | state declarations authored at build time from spec |
| `--views-from` + `_coverage.mjs` | An external route→state→variant checklist; every row mocked or deferred-with-reason; claims verified on disk; exit 1 otherwise | no statement that every drawn state is a story or explicitly deferred |
| TOKEN_GAP / VARIANT_REQUEST escapes + regen cascade | bottom-up propagation | `--blast` in the catalog gate (adequate) |

Everything below the pre-scan in the engine — Phases 1–5, `_process.mjs`, `_split.mjs`,
`_render.sh`, `_audit.mjs`, `_sanity.py`, `_build-bundle.mjs`, `_build-catalog.mjs`, the Design
Review Browser, `theme-seed.json`, `deconstruction.json`, native mode Step 2.5 — exists to produce and
police HTML mocks. That is the part the maxim forbids: the component *is* the mock.

## The design: Phase 4a — DESIGN INVENTORY

A new phase in `workflows/build.md`, before Phase 4b, that runs when the manifest has design
references and no current inventory. Its output is **the list of real components and compositions
to make**, tied to the frames that justify each one — never HTML.

### Artifacts

```
design/reference/{source-slug}/NN.png     one PNG per frame, cropped from the rendered source (committed — these are the targets)
design/inventory.json                     the whole-app inventory (durable; schema below)
design/inventory.md                       human view of the same (advisory)
```

### Steps

1. **Render (deterministic).** `node {plugin}/scripts/render-frames.mjs <ref>… --out design/reference`.
   Ported from `_preflight.sh`, node + headless Chrome only (no Python/PIL — matches the plugin's
   other scripts). Per reference kind: an HTML deck is rendered with a virtual-time budget and
   frames cropped from DOM rects (`--frame-selector`, default `.fr`; falls back to one full-page
   frame); a URL is captured at desktop + mobile widths; an image is copied through; a
   `design/wireframes/` directory is read as text (it already carries a build mapping). Fails
   closed on a blank render (DOM text under a threshold after settle — `ponytail:` weaker than the
   engine's pixel-variance check; upgrade if a deck ever passes blank). Exit `0/1/2/3` like the other
   gates. Records each source's content hash.
2. **Read once (probabilistic).** `DESIGN_EXECUTE` with `docs/INVENTORY-CONTRACT.md`: the designer
   reads **every** frame PNG and the source files (and the spec), and returns the inventory JSON.
   Strongest available model, one dispatch — the engine's own rule for its pre-scan. The contract
   carries the classification rules already in `build.md` (atom/molecule/organism/screen, state-vs-
   route) plus the anti-undercount rules this session paid for:
   - a mobile layout whose *structure* differs is a separate composition, not a breakpoint;
   - a prop on a mock is not a component;
   - the spec's reuse table is a floor, never the list;
   - every distinct drawn outcome is a state (interrupted ≠ cancelled);
   - every frame is claimed by at least one screen×state, or listed as unclaimed with a reason;
   - each item names the frames it appears on and what it composes.
3. **Validate (deterministic).** `node {plugin}/scripts/verify-inventory.mjs design/inventory.json`:
   every frame claimed or excused; every `composes` name exists at a strictly lower layer; every
   `shows` name exists somewhere; every screen state has a frame or an `undrawn` reason; names
   unique; atoms compose nothing. Exit `0/1/2/3`. On `1`, re-dispatch with the offending lines (the
   engine's re-dispatch pattern) — cap 2.
4. **Confirm.** Digest (counts per layer, the route map, the frames-claimed line, the path) and fire
   `B-inv` in the same turn. Options: accept · change the list (Other) · cancel. Write
   `inventory.confirmed` and the source hashes to the manifest.

### What changes downstream

- **Phase 4b** computes each level's `create` as `inventory.{level} − verified on disk`. The plan can
  no longer be "frozen at the first pass": re-running build re-derives the delta from the inventory.
- **Phase 5 / 5b / 5c Step 1** read the list from the inventory; `B-atoms`, `B-mol`, `B-org` become
  *settled, shown not asked* unless no inventory exists (no references → the existing spec-derivation
  is the fallback, unchanged). Molecule/organism `state.declared` is seeded from `inventory.*.states`.
- **Phase 6 Step 1** candidates are `inventory.screens` — already route-keyed and state-split — so
  `B-screens` fires only when something is ambiguous.
- **Per-item `target`** becomes the item's `appears_on` frames. Replaces the deconstruction mockup
  target everywhere `build.md` names one (lines ~382, 547, 1159, 1227).
- **`init` Step 0** seeds the route map and hierarchy from `design/inventory.json` when present
  (replacing the `deconstruction.json` block); when absent and references exist, it says the
  inventory will run at build.
- **`evolve`** acquires a new design through `render-frames.mjs`, diffs the inventory, and classifies
  from there (its E1–E6 flow is unchanged; only the acquisition path moves).
- **`wireframe`** ladder becomes `wireframe (structure) → inventory (what to make) → build (real)`.
- **`status`** reports `inventory: N frames · A atoms · M molecules · O organisms · S screens ·
  confirmed <date>` instead of the `design/system/` line.
- **`scaffold`** keeps its theme path; `inventory.tokens_observed` is offered as evidence to the
  theme step when no token table exists (replaces `theme-seed.json`).

### `design/inventory.json` schema (v1)

```json
{
  "version": 1,
  "sources": [
    { "ref": ".spec/prds/web-client/designs/concepts/Cockpit.dc.html", "kind": "html-deck",
      "hash": "sha256:…", "frames": ["cockpit/01", "cockpit/02"] }
  ],
  "frames": [
    { "id": "cockpit/14", "png": "design/reference/cockpit/14.png", "source": "…/Cockpit.dc.html",
      "label": "mobile /chats", "viewport": "390x844", "route": "/chats", "state": "idle",
      "shows": ["MobileTabBar", "DeviceStatusIndicator", "EmptyState", "SuggestedCommands"] }
  ],
  "unclaimed_frames": [ { "id": "foundations/02", "reason": "token palette sheet, not a screen" } ],
  "screens": [
    { "name": "Chats", "route": "/chats/[[...conversationId]]",
      "states": [
        { "name": "empty", "frames": ["cockpit/05"] },
        { "name": "cancelled", "frames": ["cockpit/12"], "note": "deck draws interrupted and cancelled as distinct outcomes" },
        { "name": "device-unreachable", "frames": ["cockpit/08"] }
      ],
      "composes": ["NavRail", "MobileTabBar", "EmptyState", "Conversation", "PromptInput"] }
  ],
  "organisms": [
    { "name": "NavRail", "composes": ["Kbd", "ConversationRow", "Button"],
      "states": ["expanded", "collapsed", "asleep"], "variants": [],
      "appears_on": ["cockpit/04", "library/01"], "evidence": "NavRail.dc.html; Cockpit 04 annotation" }
  ],
  "molecules": [ { "name": "MobileTabBar", "composes": ["NavItem"], "states": ["chats-active", "library-active"], "appears_on": ["cockpit/14"] } ],
  "atoms": [ { "name": "DeviceStatusIndicator", "states": ["online", "asleep"], "appears_on": ["cockpit/04", "cockpit/14"], "library_primitive": null } ],
  "tokens_observed": { "colors": ["#F5A623", "#4FD1C5", "#0A0E14"], "fonts": ["…"], "note": "PRD token table is authoritative; this is evidence only" },
  "confirmed": "2026-08-30T18:40:00Z"
}
```

`frames` are the checklist (the engine's `--views-from` inverted: the design is the inventory, not a
separate markdown file). `composes` is a *hint* for build order and for the read — the catalog gate's
`--blast` remains the dependency oracle after code exists, per 8.0.

### What this costs, honestly

One read of every frame. On holocron that is 32 images plus six HTML sources — comparable to one of
the two forks the session ran, but it runs once, deterministically rendered, before any layer is
built, and it replaces both forks and the four re-asks. It does not replace `polish` (which judges
real screens) or the catalog gate (which proves composition in code).

## What gets deleted

| Path | Notes |
|---|---|
| `plugins/pixel-perfect/skills/deconstruct-engine/` (412K, 24 files) | the mock pipeline |
| `plugins/pixel-perfect/.opencode/skills/deconstruct-engine/` | generated surface |
| `plugins/pixel-perfect/skills/design-deconstruct/`, `commands/design-deconstruct.md`, `.opencode/commands/design-deconstruct.md` | generated from `scripts/adapters/capabilities.json` — remove the entry and rebuild |
| `plugins/pixel-perfect/workflows/design-deconstruct.md` | replaced by build Phase 4a |
| `theme-seed.json`, `deconstruction.json`, `design/system/`, `deconstructed:`/`design_system:` manifest markers | replaced by `inventory.json` |

References to update (30 mentions across 18 files outside the engine): `workflows/{build,init,
wireframe,evolve,scaffold,status}.md`, `skills/process-context/SKILL.md`, four adapter docs
(`bits-ui`, `shadcn-svelte`, `skeleton`, `sveltekit` — one line each), three `plugin.json`
(description + `design-deconstruct`/`deconstruct` keywords), `README.md`, and the validators:
`scripts/check-runtime-paths.mjs`, `validate-workflows.mjs` (`SILENT_WORKFLOWS`, `INTERNAL_SKILLS`),
`validate-skills.mjs`, `validate-package.mjs`, `test/adapters.test.mjs`. `CHANGELOG` 9.0.0, breaking.

Two pieces of engine code are worth porting rather than rewriting: the DOM-rect frame extraction in
`_preflight.sh` (the wrapper-iframe + `getBoundingClientRect` trick, which exists because pixel
heuristics fail on cream-on-cream decks) and the claim-verified-on-disk idea in `_coverage.mjs`.

## Task list

Order: T1 → (T2 ∥ T3) → T4 → T5 → T6 (prove on holocron) → T7 (delete). Deletion is last and gated on
T6 so the plugin is never without a working "start from a design" path.

### T1 — Write `docs/INVENTORY-CONTRACT.md` and the `inventory.json` schema
- **Scope:** `plugins/pixel-perfect/docs/INVENTORY-CONTRACT.md` (the `DESIGN_EXECUTE` brief: inputs,
  classification rules, anti-undercount rules, return envelope = the JSON schema above),
  `plugins/pixel-perfect/docs/inventory.schema.json`.
- **AC-1:** the contract is self-contained — a designer given only it, the frames and the sources can
  return a valid `inventory.json`. **AC-2:** every anti-undercount rule from the holocron session is
  present with its example. **AC-3:** `validate-contracts.mjs` passes.
- **Deps:** none. **Agent:** `ai-tooling-implementer`; review by `frontend-designer` (are the
  classification rules what a designer would apply?) and `ai-tooling-reviewer`.

### T2 — `scripts/render-frames.mjs` + integration test
- **Scope:** `plugins/pixel-perfect/scripts/render-frames.mjs`, `test/render-frames.test.mjs`,
  `test/fixtures/deck.html` (a two-frame `.fr` deck).
- **AC-1 (integration, real Chrome):** renders the fixture and writes exactly two cropped PNGs with
  valid PNG magic and non-trivial dimensions. **AC-2:** a deliberately blank fixture exits `1` with
  the diagnosis. **AC-3:** an image reference is copied through; a URL reference produces
  desktop + mobile PNGs against a local `http.server`. **AC-4:** writes `sources[].hash`. **AC-5:**
  zero runtime dependencies; exit vocabulary matches `verify-catalog.mjs`.
- **Deps:** T1 (schema). **Agent:** `node-implementer` → `node-reviewer`; `test-quality-reviewer`.

### T3 — `scripts/verify-inventory.mjs` + tests
- **Scope:** `plugins/pixel-perfect/scripts/verify-inventory.mjs`, `test/verify-inventory.test.mjs`,
  fixtures for each failure class.
- **AC-1:** exit `1` for an unclaimed frame, a `composes` name at the same or higher layer, a screen
  state with no frame and no `undrawn` reason, a duplicate name, an atom that composes. **AC-2:**
  exit `0` on the holocron-shaped fixture. **AC-3:** exit `2` on schema violation, `3` on an empty
  `frames[]`. **AC-4:** report lists offending paths so a re-dispatch can quote them.
- **Deps:** T1. **Agent:** `node-implementer` → `node-reviewer`; `test-quality-reviewer`.

### T4 — Build Phase 4a in `workflows/build.md`; rewire 4b, 5, 5b, 5c, 6
- **Scope:** `plugins/pixel-perfect/workflows/build.md` (new Phase 4a section; `B-inv` added to the
  "How this workflow asks" table; Step 1 of each layer reads from the inventory; targets = frames;
  all `deconstruction.json` mentions replaced), regenerated command/skill surfaces.
- **AC-1:** with references and no inventory, build's first turn renders, reads, validates and ends on
  `B-inv`; nothing is generated before it. **AC-2:** with a confirmed inventory, `B-atoms`/`B-mol`/
  `B-org` are shown as settled, not asked. **AC-3:** no references → behavior identical to today
  (spec-derived lists). **AC-4:** `validate-workflows.mjs` passes; batch table counts updated.
- **Deps:** T1–T3. **Agent:** `ai-tooling-implementer` → `ai-tooling-reviewer`.

### T5 — Rewire `init`, `scaffold`, `status`, `evolve`, `wireframe`, `process-context`
- **Scope:** the six files named above; `README.md` ladder and "Bringing a design in" section.
- **AC-1:** no remaining reference to `deconstruction.json`, `theme-seed.json`, `design/system`,
  `deconstructed:` outside `CHANGELOG`. **AC-2:** `init` Step 0 seeds from `inventory.json`.
  **AC-3:** `evolve` acquisition names `render-frames.mjs`. **AC-4:** `npm run validate` passes.
- **Deps:** T4. **Agent:** `ai-tooling-implementer` → `ai-tooling-reviewer`.

### T6 — Prove on holocron (the human testing gate)
- **Scope:** run `pixel-perfect:build` on `~/Projects/holocron/packages/web` with the six decks as
  references and no inventory; no code changes to holocron beyond `design/reference/` and
  `design/inventory.json`.
- **AC-1:** `render-frames.mjs` produces ≥32 frames across the three product decks (the whole-app
  audit's count) with the deck's own frame wrapper as `--frame-selector`. **AC-2:** the returned
  inventory contains `MobileTabBar`, `TableOfContents`, `DeviceStatusIndicator`, `SignInForm`,
  `LibraryRowActions`, `SuggestedCommands` (the six the narrow pass missed), `NavRail`/`ResearchCard`/
  `DocumentBody` as organisms, and `cancelled` vs `interrupted` as distinct Chats states. **AC-3:**
  `verify-inventory.mjs` exits `0`; every frame claimed or excused. **AC-4:** the delta the plan
  computes against the manifest's 11 atoms + 13 molecules is exactly the still-unbuilt set (three
  organisms, five screens) — no phantom rebuilds. **AC-5:** total tokens for the read recorded in the
  plan doc for comparison with the 865K fork.
- **Deps:** T4, T5. **Agent:** `claude` (drives the real workflow); findings back to T1/T4 if AC-2
  misses anything.

### T7 — Delete deconstruct; release 9.0.0
- **Scope:** the deletion table above; `scripts/adapters/capabilities.json`; the four validators and
  `test/adapters.test.mjs`; three `plugin.json`; `CHANGELOG.md`; `docs/UPGRADING-9.0.md` (one page:
  `deconstruction.json` → run build once to get `inventory.json`).
- **AC-1:** `npm run ci` green. **AC-2:** `grep -ri deconstruct plugins/ scripts/ test/` returns only
  `CHANGELOG`/`UPGRADING` hits. **AC-3:** `release.mjs verify` passes at 9.0.0.
- **Deps:** T6 passed. **Agent:** `ai-tooling-implementer` → `code-reviewer`.

## Decisions for the user

1. **Go / no-go on the direction** — build Phase 4a as designed and delete deconstruct after it is
   proven on holocron (T6).
2. **Surface** — inventory lives inside `build` only (recommended: no new command; the ladder is
   `wireframe → build`), or also as a standalone `pixel-perfect:inventory` command that can run
   before `init` for URL/screenshot sources (takes deconstruct's Phase-0 slot; one more public
   surface to maintain).

## Non-goals

- No HTML output of any kind. No token extraction pipeline; `tokens_observed` is evidence, not a
  theme.
- No change to the catalog gate, styling/component contracts, `polish`, or the 8.0 manifest rules
  (decisions and receipts only — `composes` in the inventory is a read-time hint, never gate
  authority).
