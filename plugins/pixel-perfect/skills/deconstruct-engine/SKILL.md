---
name: deconstruct-engine
description: "Reverse-engineer a concept HTML file into a token-governed atomic design system across 5 phases (tokens → atoms → molecules → organisms → views). Every mock ships one file per theme (dark.html + light.html) with its own PDF + PNG; views are state-split into nested route folders and can be driven by an external view inventory (--views-from) with a deterministic coverage gate. Deterministic tooling owns token emission, theme-split, link-depth, bundling, render, per-component processing (_process.mjs), a Phase-0 concept preflight, and a 3-axis audit (token-purity + link-resolution + render-sanity)."
---

# deconstruct-engine

Sequentially decompose a concept HTML into a governed atomic design system. Five phases, one TASK_LIST chain, zero hardcoded values. Per-theme single-state mocks, governed by deterministic tooling.

## THE FIVE SEQUENTIAL PHASES

```
concept.html ──► [0] PREFLIGHT (smoke-render + reference frames) ──► [3.5] INVENTORY PRE-SCAN
     │
     ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ T1 TOKENS   │───►│ T2 ATOMS    │───►│ T3 MOLECULES│───►│ T4 ORGANISMS│───►│ T5 VIEWS    │
│             │    │             │    │             │    │             │    │             │
│ tokens.css  │    │ atoms/{N}/  │    │ molecules/  │    │ organisms/  │    │ views/      │
│ theme.*.json│    │ dark+light  │    │ dark+light  │    │ dark+light  │    │ route→state │
│ TOKEN-MAP   │    │  gallery    │    │  gallery    │    │  gallery    │    │ dark+light  │
│ fonts.css   │    │             │    │             │    │             │    │  per leaf   │
│ tokens.html │    │ _preview.css│    │ _lower.css  │    │ _lower.css  │    │ _lower.css  │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
      │                 ▲ TOKEN_GAP         ▲ TOKEN_GAP / VARIANT_REQUEST → cascades DOWN
      └─────────────────┴───────────────────┴────────────────────────────────────┘
```

**Tasks chain via `addBlockedBy`**: T2 blocked by T1, T3 by T2, T4 by T3, T5 by T4. No task starts until its predecessor completes.

**Cascade** (docs/REGEN-CASCADE.md): a later phase can surface a `VARIANT_REQUEST` for a missing lower-layer variant. The orchestrator pauses the current phase, extends the lower layer, regenerates that component's full artifacts (README + dark/light HTML + PDF + PNG), then resumes. Hard-capped at 3-layer recursion.

## THEME-PAIR CONTRACT (every component)

**One theme + one state per file — never crammed.** Each mock folder holds a single-theme pair, each with its own render:

```
{layer}/{name}/
├── README.md            recipe — atoms-used table, token references per property
├── dark.html  dark.png  dark.pdf      single-theme preview (dark) + its renders
└── light.html light.png light.pdf     single-theme preview (light) + its renders
```

Views add `dark-mobile.png` / `light-mobile.png` (375px). For components (atoms/molecules/organisms) each HTML is a **single gallery** showing every variant × state side-by-side, **theme-split only**. For views the structure is also **state-split** — see Phase 5.

**How it's produced:** `DESIGN_EXECUTE` authors ONE document with both theme panes; the orchestrator runs `node _process.mjs {layer} {component}` — one deterministic call that splits into `dark.html` + `light.html`, renders each theme, and gates the result through all three audit axes, returning one JSON verdict. The design execution unit never hand-separates themes or counts `../` link depth.

## VIEW STRUCTURE — route → state (Phase 5)

Views are grouped **recursively by route → state**, each leaf folder a single-theme pair:

```
views/
  {single-state-route}/        dark.{html,png,pdf,-mobile.png}  light.{…}     # e.g. home, rules
  {stateful-route}/
    _base/                     dark.{…} light.{…}                             # the base page
    {state}/                   dark.{…} light.{…}                             # one mock per state
    {surface}/{state}/         dark.{…} light.{…}                             # multi-state → nested
```

A view that stacks N element states becomes N coherent single-state mocks (never one mega-page with repeated headers). README lives at the route level and documents the state tree.

**With `--views-from <inventory>` the inventory file — not the concept deck — drives the tree.** A deck typically draws a fraction of the product's real variants; driven by the deck alone, Phase 5 passes every audit while silently under-covering. The inventory is the checklist: every variant row is either mocked (claim recorded in `manifest.json` § coverage, verified on disk by `_coverage.mjs`) or explicitly deferred with a reason. Prose-only variants (no table row) are not parsed — cross-check the report against the inventory's own summary.

## THE NON-NEGOTIABLE QUALITY BAR

Every component artifact MUST satisfy these (verified by the staged tooling at the end of each phase — docs/TOKEN-AUDIT.md):

1. **Zero hex / rgb / hsl literals** — every color is `var(--{semantic})`.
2. **Zero numeric font-size / font-weight / line-height / letter-spacing** — use `var(--font-size-*)`, `var(--font-weight-*)`, `var(--line-height-*)`, `var(--tracking-*)`.
3. **Zero raw px in padding / margin / gap** — use `var(--space-*)` scale (0/1/2/3px hairlines allowed).
4. **Tier-2 only** — components reference ONLY semantic aliases; no Tier-1 `--_` leaks, no bare concept names.
5. **No placeholder content** — every preview renders real markup (titles, labels, actual glyphs) from the concept.
6. **One theme + one state per file** — `dark.html`/`light.html`; views also one state per mock.
7. **Self-contained HTML** — `<link>` to `tokens.css`, `_preview.css`, `_lower.css` only (depth computed by `_head.mjs`); no CDNs, no build; every link resolves.
8. **Composition purity** — molecules import atom classes, never redefine them; organisms import molecules; views import organisms (via the generated `_lower.css` bundle).

The three governance axes — **token-purity + link-resolution** (`_audit.mjs`) and **render-sanity** (`_sanity.py`) — gate every phase (all three run inside `_process.mjs`). With `--views-from`, **coverage** (`_coverage.mjs`) gates Phase 5. If any artifact fails, the orchestrator reruns `DESIGN_EXECUTE` for that component with the offending lines quoted. The optional `--fidelity` pass is **advisory and probabilistic** — it files divergence findings, it never gates.

## QUICK REFERENCE

```
SYNTAX:
  pixel-perfect:design-deconstruct <concept-html-path>
  pixel-perfect:design-deconstruct <concept-html-path> --output <dir>
  pixel-perfect:design-deconstruct <concept-html-path> --tokens-from <system-deck.html>
  pixel-perfect:design-deconstruct <concept-html-path> --views-from <inventory.md>
  pixel-perfect:design-deconstruct <concept-html-path> --doctrine <file> [--doctrine <file> …]
  pixel-perfect:design-deconstruct <concept-html-path> --parallel <N>
  pixel-perfect:design-deconstruct <concept-html-path> --fidelity
  pixel-perfect:design-deconstruct <concept-html-path> --resume-from <tokens|atoms|molecules|organisms|views>
  pixel-perfect:design-deconstruct <concept-html-path> --force

FLAGS:
  --tokens-from   second deck that Phases 1–2 read for tokens/atoms (a design-
                  system deck) while Phases 3–5 read the main concept. On value
                  conflict the token source wins; conflicts land in manifest.
  --views-from    external route→state→variant inventory that DRIVES the Phase-5
                  tree and gates it via _coverage.mjs (format: SKILL.md § VIEW
                  STRUCTURE + docs/OUTPUT-SCHEMA.md § coverage).
  --doctrine      project constraint file(s) injected VERBATIM into every
                  subagent preamble (banned primitives, struck clauses, ink
                  rules). Doctrine overrides the concept on conflict.
  --parallel N    opt-in within-phase fan-out (default: sequential). See AGENT
                  DISPATCH RULES § Parallel waves.
  --fidelity      after Phase 5, an advisory vision pass compares each view PNG
                  to its preflight reference frame; divergences are findings in
                  the report, never gate failures.

DEFAULT OUTPUT:
  ./.spec/design/system

STAGED TOOLING (orchestrator copies assets/tooling/* into <output>/ at run start):
  tokens/build-tokens.mjs  emit tokens.css + theme JSON + semantic-tokens.json + TOKEN-MAP.md (deterministic, round-trip-verified)
  _preflight.sh            Phase-0 smoke-render + DOM-rect reference frames (fails closed on a blank render)
  _head.mjs                compute <link> depth from a file path (single source of truth)
  _split.mjs               split an authored 2-theme mock → {dark,light}.html
  _build-bundle.mjs        emit {layer}/_lower.css (sources dark.html)
  _render.sh               per-theme PDF + PNG (+ mobile for views); canvas from theme JSON; VTB env for settle; optional subpath arg
  _process.mjs             ONE call per component: split → render → audit → sanity → JSON verdict
  _audit.mjs               token-purity + link-resolution gate (recursive)
  _sanity.py               render-sanity: dark PNG reads dark, light reads light (recursive)
  _coverage.mjs            inventory × manifest coverage gate (--views-from), claims verified on disk
  _build-catalog.mjs       scan layers → browse/catalog.json for the Design Review Browser
  browse/                  Design Review Browser shell (index.html + css + js); load after catalog build

PER-PHASE DESIGN EXECUTION:
  DESIGN_EXECUTE(../../docs/DESIGN-CONTRACT.md
    + docs/PHASE-CONTRACTS.md § phase + component brief)
  # Dispatches frontend-designer when available; otherwise executes directly.

SUBAGENT RETURN (docs/OUTPUT-SCHEMA.md § ReturnEnvelope):
  One JSON envelope: {status, component, files_written, escapes[], notes}
  escapes: {type: TOKEN_GAP, key, value, reason}
           {type: VARIANT_REQUEST, layer, name, variant, recipe, reason}
  Enforce via structured output where the harness supports it; legacy string
  protocol (TOKEN_GAP: … / VARIANT_REQUEST: … at top of reply) is the fallback.
```

## ORCHESTRATION ALGORITHM

```
[0] PREFLIGHT (DETERMINISTIC — before anything else)
    bash _preflight.sh <concept>   → reference/concept-full.png + frame-NN.png
    Fails closed on a blank render (bundled decks resolve assets via JS at
    runtime; a pre-settle capture is empty). Do not proceed until live.
    FRAME_SELECTOR env tunes the frame class (default .fr — Claude Design).
    With --tokens-from, preflight BOTH decks.

[1] PARSE INPUT
    Required: <concept-html-path>   — single file, bundled OK (decoded in [3])
    Optional: --output, --tokens-from, --views-from, --doctrine (repeatable),
              --parallel N, --fidelity, --resume-from, --force
    Verify every named file exists and is readable. Assemble the DOCTRINE PACK
    (concatenated --doctrine files, verbatim, with per-file headers).

[1.5] DETECT EXISTING OUTPUT (re-run UX)
    Resolve output directory (default: ./.spec/design/system).
    IF --force flag set → skip detection, full regeneration.
    IF output directory exists AND contains component folders:
      Glob all {layer}/{name}/README.md files to build inventory.
      IF inventory is non-empty:
        PHASE_ORDER = [tokens, atoms, molecules, organisms, views]
        ASK 1 — Phase selection (USER_CHOICE, multiSelect):
          "Found {N} existing components. Which phases to regenerate?"
          Build "dirty set" from selected phases.
        CASCADE — Upward dependency propagation:
          For each selected phase at index I: add all phases at index > I to dirty set.
          (tokens selected → all 5; atoms → {atoms…views}; views only → {views}.)
        ASK 2 — Confirmation screen (Confirm / Cancel).
        Mark phases NOT in dirty set as "cached" — skip their subagent dispatch.
    IF no existing output → full run.

[2] PLAN THE 5-TASK CHAIN
    TASK_CREATE one task per phase. Chain with addBlockedBy:
      T1 tokens → T2 atoms → T3 molecules → T4 organisms → T5 views.

[3] PREPARE OUTPUT + STAGE TOOLING + DECODE CONCEPT
    mkdir -p <output>/{tokens,typography,atoms,molecules,organisms,views,primitives,reference}
    Copy assets/tooling/* into <output>/ (the deterministic generators above).
    IF concept is a bundled template (has <script type="__bundler/template">):
      Decode via base64 + gzip manifest extraction (docs/PHASE-CONTRACTS.md § 1).
    Copy _preview.css skeleton to atoms/_preview.css.
    Write <output>/manifest.json with concept path(s), doctrine paths, run timestamp.

[3.5] INVENTORY PRE-SCAN (ONE whole-concept read — kills mid-phase escape churn)
    Run DESIGN_EXECUTE once for the inventory pre-scan: read the ENTIRE concept
    (and --tokens-from deck),
    plus --views-from inventory when given. Return (as a ReturnEnvelope note-
    free JSON): proposed atom/molecule/organism inventories, the view
    route→state tree, and the anticipated token vocabulary (keys only).
    Write to manifest.json "inventory". Confirm/adjust with the user
    (USER_CHOICE) before Phase 1. Later phases dispatch FROM this confirmed
    inventory (subagents may still flag adjustments in their envelope notes).

[4] EXECUTE PHASE 1 — TOKENS  (T1)
    TASK_UPDATE T1 → in_progress.
    DESIGN_EXECUTE(docs/PHASE-CONTRACTS.md § 1 + bundled design contract):
      Token source = --tokens-from deck when given, else the concept.
      The subagent fills the CONCEPT (Tier-1 primitives, verbatim source keys) and
      SEMANTIC (Tier-2 role aliases) data tables in tokens/build-tokens.mjs, plus
      typography/fonts.css + type-modules.css + tokens.html. dark = exact source;
      single-theme source → derive light + flag (derived:true).
    After return (DETERMINISTIC):
      • node tokens/build-tokens.mjs   → tokens.css, theme.{dark,light}.json,
        theme.schema.json, semantic-tokens.json, TOKEN-MAP.md (round-trip verified:
        every non-derived Tier-2 dark value == source value, or it fails closed).
      • Render tokens.html (both themes shown) for the primitives index.
      • Run _audit.mjs / _sanity.py as applicable.
    TASK_UPDATE T1 → completed.

[5] EXECUTE PHASE 2 — ATOMS  (T2)
    TASK_UPDATE T2 → in_progress.
    Atom list = confirmed inventory from [3.5].
    FOR EACH atom (sequential by default; waves under --parallel):
      DESIGN_EXECUTE(docs/PHASE-CONTRACTS.md § 2 + bundled design contract)
        (includes doctrine pack + whole-file concept read + reference frames).
      ON ENVELOPE ESCAPES (sequential mode — immediate; parallel — at barrier):
        TOKEN_GAP → orchestrator adds the alias (+ any primitive) to
        tokens/build-tokens.mjs; node tokens/build-tokens.mjs; re-render tokens.html.
      DETERMINISTIC per atom:
        • node _process.mjs atoms {name}     → split + render + audit + sanity,
          one JSON verdict. Any violation → re-dispatch with offending lines.
    Update atoms/README.md with the atom index + atoms-used matrix.
    TASK_UPDATE T2 → completed.

[6] EXECUTE PHASE 3 — MOLECULES  (T3)
    TASK_UPDATE T3 → in_progress.
    node _build-bundle.mjs molecules  → molecules/_lower.css (atom rules from dark.html).
    FOR EACH molecule (from inventory; sequential default / waves): run
      DESIGN_EXECUTE with docs/PHASE-CONTRACTS.md § 3 — compose atoms by class; never redefine atom
      styling; README lists every atom used.
      ON VARIANT_REQUEST escape (docs/REGEN-CASCADE.md): extend the atom via the
      Regen Handler, node _process.mjs atoms {name}, rebuild molecules/_lower.css,
      resume.
      DETERMINISTIC per molecule: node _process.mjs molecules {name}.
    Update molecules/README.md.
    TASK_UPDATE T3 → completed.

[7] EXECUTE PHASE 4 — ORGANISMS  (T4)
    TASK_UPDATE T4 → in_progress.
    node _build-bundle.mjs organisms  → organisms/_lower.css (atom + molecule rules).
    FOR EACH organism (from inventory): run DESIGN_EXECUTE with docs/PHASE-CONTRACTS.md § 4. Compose
      molecules + atoms; no redefinition. VARIANT_REQUEST may target atom OR
      molecule (cascade, max depth 3).
      DETERMINISTIC per organism: node _process.mjs organisms {name}.
    Update organisms/README.md.
    TASK_UPDATE T4 → completed.

[8] EXECUTE PHASE 5 — VIEWS  (T5)
    TASK_UPDATE T5 → in_progress.
    node _build-bundle.mjs views  → views/_lower.css (atom + molecule + organism rules).
    View tree = --views-from inventory when given (the checklist), else the
    confirmed pre-scan tree.
    FOR EACH view-mock (route → state leaf):
      IF in cached set (from [1.5]) → skip.
      IF the variant cannot be mocked now (spec gap, blocked decision) →
        record {status:"deferred", reason} in manifest.json coverage; continue.
      Run DESIGN_EXECUTE with docs/PHASE-CONTRACTS.md § 5, the inventory key +
        the variant row's concrete requirement text as the content contract.
      DETERMINISTIC per view-mock:
        • node _process.mjs views {route}[/{state}…]   → split + render desktop
          + mobile + audit + sanity.
        • Record {status:"mocked", path} in manifest.json coverage.
    Update views/README.md (route → state tree + dark/light convention).
    WITH --views-from: node _coverage.mjs <inventory>   → gate; any missing/broken
      variant → mock it, defer it with a reason, or surface to the user.
    DETERMINISTIC review catalog:
      • node _build-catalog.mjs   → browse/catalog.json (views + atoms/molecules/organisms)
    TASK_UPDATE T5 → completed.

[9] FINAL AUDIT (deterministic axes, recursive, all layers)
    node _audit.mjs {atoms,molecules,organisms,views}   token-purity + link-resolution
    python3 _sanity.py {atoms,molecules,organisms,views} render-sanity (theme correctness)
    WITH --views-from: node _coverage.mjs <inventory>    coverage (mocked/deferred/missing)
    node _build-catalog.mjs                              refresh Design Review catalog
    Confirm no file contains both themes; confirm token round-trip (build-tokens re-run
      produces no drift). Any violation → re-dispatch offending component (cap 2);
      log unresolved to <output>/manifest.json "gaps".
    WITH --fidelity (ADVISORY — after the deterministic axes pass):
      For each view mock with a matching reference frame: view the mock PNG and
      the reference frame side by side (vision), file divergences as findings
      {mock, frame, divergence, "doctrine override?"} in manifest.json
      "fidelity". Never a gate; doctrine-driven divergence is expected.

[10] REPORT
    Print summary: token counts (concept/semantic/derived), per-layer folder counts,
      themed-PNG sanity totals, coverage N/M (with deferred reasons), fidelity
      findings count, any gaps. Emit paths:
      <output>/tokens/TOKEN-MAP.md          semantic ⇄ concept round-trip
      <output>/{layer}/README.md            per-layer index
      <output>/manifest.json                run metadata + coverage + gaps
      <output>/browse/                      Design Review Browser
    Always print how to review (http only — not file://):
      cd <output> && python3 -m http.server 8765
      open http://localhost:8765/browse/
```

## AGENT DISPATCH RULES

1. **Sequential is the default; `--parallel N` opts into within-phase waves.**
   Sequential keeps cascades trivially clean. Parallel waves are safe because
   the pre-scan ([3.5]) front-loads the token vocabulary and inventory that
   previously surfaced as mid-phase escapes:
   - A wave = up to N same-layer components dispatched concurrently, each in
     its own folder (no shared files are written by subagents).
   - **Escapes queue at the wave barrier**: collect every envelope, dedupe
     TOKEN_GAPs by key and VARIANT_REQUESTs by (layer,name,variant), resolve
     each ONCE, then re-dispatch only the components whose output depended on
     a resolved escape.
   - **Token mutations never run concurrently** — the orchestrator serializes
     all build-tokens.mjs edits + rebuilds at the barrier.
   - `_process.mjs` calls after a wave may run in sequence (cheap) or
     concurrently (independent folders); `_build-bundle.mjs` runs once per
     phase AFTER the wave settles.
   - First run of a new concept: run atoms sequentially, then go parallel from
     molecules on if the escape rate was low. When in doubt, sequential.
2. **Every design execution includes the bundled aesthetic contract** from `../../docs/DESIGN-CONTRACT.md`. `design-deconstruct` owns the structural discipline. `DESIGN_EXECUTE` dispatches only `frontend-designer` when available and otherwise executes the same contract directly.
3. **Every subagent prompt embeds the Quality Bar, the doctrine pack, and the Return Envelope contract** (docs/PHASE-CONTRACTS.md § Shared Preamble). Enforce the envelope via structured output where the harness supports it.
4. **Do not instruct subagents to verify tooling-gated properties, and do not hand-verify them yourself.** Current-generation models self-verify; stacked verification instructions cause over-verification loops that burn tokens without adding safety. The gates are deterministic code — trust them, read their verdicts.
5. **Delegation boundary.** All design authoring, pre-scan design analysis, cascade work, and fidelity review go through `DESIGN_EXECUTE`. When `frontend-designer` is available, dispatch it directly and do not add intermediate agents. When it is unavailable, the orchestrator performs the same work inline and does not substitute any other design subagent.
6. **Deterministic vs probabilistic boundary.** Anything that must ALWAYS be correct is orchestrator-owned CODE (the staged tooling), never an agent judgment call:

   | Deterministic (orchestrator runs the staged script) | Probabilistic (frontend-designer authors) |
   |---|---|
   | concept preflight + reference frames (`_preflight.sh`) | which tokens/roles exist; derived light values |
   | token CSS/JSON emission + round-trip map (`build-tokens.mjs`) | the component markup + variant grid |
   | theme-split, render, 3-axis gate — one call (`_process.mjs`) | component CSS (token-pure) |
   | `<link>` depth (`_head.mjs`) | which view states exist (bounded by --views-from) |
   | per-layer `_lower.css` bundle (`_build-bundle.mjs`) | fidelity divergence findings (advisory) |
   | coverage gate vs inventory (`_coverage.mjs`) | — |
   | escape recording + coverage claims in manifest.json | — |

   The design execution unit uses file read/write/search tools plus the bundled design contract only — it authors documents and (for tokens) fills data tables; it never shells out to Chrome, separates themes, counts link depth, or hand-bundles.
7. **Orchestrator stages + runs the tooling** in `<output>/` and owns all token mutations — subagents propose via TOKEN_GAP escapes; the orchestrator edits `build-tokens.mjs` and rebuilds.
8. **Cascade regen is orchestrator-driven** — on VARIANT_REQUEST, run a targeted `DESIGN_EXECUTE` limited to adding the new variant, then `node _process.mjs {layer} {name}` + rebuild bundles.
9. **Model routing (advisory — use what the harness exposes).** Route by phase
   difficulty, not uniformly:

   | Work | Tier |
   |---|---|
   | Phase 1 tokens · Phase 5 views · inventory pre-scan | strongest available model |
   | Phase 2–4 component galleries | default session model |
   | Cascade variant additions · audit-failure re-dispatches | cheap/fast tier (mechanical, tightly-scoped prompts) |
   | Fidelity pass | strong vision model |

## REGENERATION CASCADE (summary)

When a `VARIANT_REQUEST` surfaces at layer N:
1. Orchestrator pauses the current phase (or queues to the wave barrier under `--parallel`).
2. Runs targeted `DESIGN_EXECUTE` at layer N-1 (or N-2/N-3) with the variant spec.
3. The design execution unit updates the lower component's README (new variant row) + gallery (new state cell).
4. Orchestrator runs `node _process.mjs {layer} {name}` (split + render + audit + sanity).
5. Rebuilds the affected `_lower.css` bundle(s).
6. Resumes the current phase / wave.

See **`docs/REGEN-CASCADE.md`** for depth cap (3), cycle detection, edited-artifact protection, and parallel-barrier semantics.

## SUCCESS CRITERIA

1. Preflight passed: the concept renders live (no blank capture); reference frames extracted.
2. Five TASK_LIST tasks chain via `addBlockedBy` and complete in order.
3. Every mock folder holds the THEME-PAIR (`README` + `dark.{html,png,pdf}` + `light.{html,png,pdf}`; views + `*-mobile.png`).
4. **Token purity** — zero hex/rgb/typography-numeric/raw-px-spacing/Tier-1-leak across every atom/molecule/organism/view (`_audit.mjs` CLEAN).
5. **Link resolution** — every `<link>` stylesheet href resolves (`_audit.mjs`).
6. **Render sanity** — every `dark.*` PNG reads dark, every `light.*` reads light (`_sanity.py`).
7. **Token round-trip** — every non-derived Tier-2 dark value equals the source value; `build-tokens.mjs` re-run produces no drift; `TOKEN-MAP.md` emitted.
8. **Coverage** (with `--views-from`) — `_coverage.mjs` exits clean: every inventory variant mocked or deferred-with-reason; zero broken claims.
9. No single file contains both themes; views never stack multiple states in one document.
10. `theme.dark.json` / `theme.light.json` validate identically against `theme.schema.json`.
11. Every layer's `README.md` has a composition matrix; views/README documents the route→state tree.
12. All `VARIANT_REQUEST` cascades left no stale artifacts (touched components re-processed + re-bundled).
13. **Design Review Browser** — `browse/index.html` is staged, `browse/catalog.json` exists, and
    `counts.views` matches `find views -name dark.html`. Human review is via the browser, not
    filesystem click-through.

## EXAMPLES

```bash
# Preferred: via pixel-perfect command
pixel-perfect:design-deconstruct .spec/design/concepts.html

# Full deconstruction from a single concept file (engine-direct)
pixel-perfect:design-deconstruct .spec/design/concepts.html

# Two decks + external view inventory + project doctrine (the real-project shape)
pixel-perfect:design-deconstruct .spec/prds/app-v1/designs/concepts.html \
  --tokens-from .spec/prds/app-v1/designs/design-system.html \
  --views-from  .spec/prds/app-v1/11-technical-requirements/routes.md \
  --doctrine    .spec/prds/app-v1/11-technical-requirements/07-ui-infrastructure.md

# Parallel atoms/molecules after a clean sequential first run; advisory vision pass
pixel-perfect:design-deconstruct concepts.html --parallel 4 --fidelity

# Resume after interruption (skill reads TASK_LIST state)
pixel-perfect:design-deconstruct concepts.html --resume-from organisms

# Force full re-run (clears TASK_LIST, starts over)
pixel-perfect:design-deconstruct concepts.html --force
```

## EDGE CASES

| Case | Handling |
|---|---|
| Concept HTML missing | Exit with message; suggest path |
| Concept is bundled (`__bundler/template`) | Decode via base64 + gzip extraction before Phase 1 (docs/PHASE-CONTRACTS.md § 1) |
| Preflight renders blank | `_preflight.sh` fails closed with the blob:/asset-id diagnosis; raise VTB or pre-rewrite asset srcs; NEVER proceed on a blank render |
| Frame selector matches nothing | Full-page render becomes the single reference; set `FRAME_SELECTOR` and re-run preflight |
| Source is single-theme (e.g. dark-only) | dark = exact source; light derived + flagged `derived:true`; round-trip verifies non-derived only |
| `--tokens-from` and concept disagree on a value | Token source wins; conflict recorded in manifest + Phase-1 envelope notes |
| `--views-from` file has no parseable variant tables | `_coverage.mjs` exits 2 with the expected format; fall back to deck-driven views WITH an explicit "coverage unknown" warning in the report |
| Inventory variant is prose-only (no table row) | Not parsed — cross-check the coverage report against the inventory's own summary section |
| Phase 1 token round-trip mismatch (Tier-2 dark ≠ source) | `build-tokens.mjs` fails closed; surface offending keys; re-dispatch Phase 1 |
| Atom contains raw hex / font-size literal / Tier-1 leak | `_process.mjs` verdict carries the offending lines; re-dispatch atom subagent with them quoted |
| `_split.mjs` can't balance `<div>` (malformed authored HTML) | self-validate fails closed → re-dispatch that component; never write a half-split file |
| Two parallel subagents emit the same TOKEN_GAP | Deduped by key at the wave barrier; resolved once |
| Parallel wave + VARIANT_REQUEST cascade | Cascade queues at the barrier; lower layer extended once; only dependent components re-dispatched |
| View has one state | no `_base/` split — emit dark/light at the route root |
| Multi-state surface (e.g. 3 header modes) | one mock per state in nested folders; never stack states in one document |
| Variant cannot be mocked (spec gap / open decision) | `{status:"deferred", reason}` in manifest coverage — visible in the report, never silent |
| Canvas color for trim unknown | `_render.sh` reads it from `theme.{theme}.json` (surface.arena → surface.page); fail with message if absent |
| VARIANT_REQUEST for existing variant | Merge into existing; log in manifest audit trail |
| VARIANT_REQUEST cascades more than 3 layers | Hard-cap recursion; warn |
| Headless Chrome / PIL unavailable | Exit with install prompt; no fallback |
| `--resume-from X` | Mark X + successors pending in TASK_LIST; re-execute from X |
| User edited a lower-layer artifact by hand between phases | mtime vs manifest hash mismatch; prompt before overwriting |
| Subagent emits `>preview<` or `TODO` placeholder | Reject + re-dispatch with "no placeholder" reminder |
| Subagent returns prose instead of the envelope | Retry once quoting the schema; then parse the legacy string protocol |

## PROGRESSIVE DISCLOSURE

**Core skill** (this file): orchestration + task chain + contract + quality bar + success criteria.

**Load on demand**:
- `docs/PHASE-CONTRACTS.md` — full subagent dispatch prompts per phase (loaded at dispatch time)
- `docs/TOOLING.md` — the staged deterministic generators: purpose, CLI, IO, invariants (loaded when staging/running tooling)
- `docs/TOKEN-AUDIT.md` — the 3 governance axes + reject-and-regen policy (loaded at phase completion)
- `docs/REGEN-CASCADE.md` — cascade semantics + recursion limits + parallel barrier (loaded only when a VARIANT_REQUEST surfaces)
- `docs/RENDER-ARTIFACTS.md` — Chrome headless + per-theme PIL trim + settle/preflight recipe (loaded at render time)
- `docs/SEMANTIC-TOKENS.md` — two-tier token model, round-trip, derived-theme (loaded by Phase 1)
- `docs/OUTPUT-SCHEMA.md` — JSON schemas for theme/snapshot files + ReturnEnvelope + coverage map (loaded by Phase 1 and at dispatch)
