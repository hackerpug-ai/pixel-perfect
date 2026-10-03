# Evolve (Existing System Changes)

Absorb a new screen, extend an existing entity, promote a repeated pattern, or shed a screen along with the components unique to it. **Add and remove are one operation**: a change to the system's inventory, with a computed blast radius, gated on confirmation, proved by re-capture.

`evolve` never grows its own build path. It computes and confirms the delta, then seeds `build_plan` and hands off to `build` for additions/variants. Removal is its own atomic apply step because `build` has no equivalent.

## Usage

```
pixel-perfect:evolve --refresh <source...> [--platform <name>] [--reanalyze]
pixel-perfect:evolve --resume <run-id>
pixel-perfect:evolve <input>
pixel-perfect:evolve ./progress-modal.png
pixel-perfect:evolve "add a settings screen with profile and billing tabs"
pixel-perfect:evolve "drop the settings screen"
pixel-perfect:evolve --replace /settings ./new-settings.png
pixel-perfect:evolve ./updated-design-system/
pixel-perfect:evolve --deprecate <name>
```

## Arguments

- `<input>`: A file, URL, screenshot, directory, or prose instruction describing the inventory change.

## Options

- `--platform <name>`: Target platform. Required when multiple platforms exist.
- `--replace <route-or-name> <input>`: Remove + add in one confirmed gate.
- `--deprecate <name>`: Mark a shared entity deprecated (migration mode) without removing it yet.

## Gate Check

**Requires:** `design/manifest.json` with at least `scaffold: passed`, and catalog capture configured (`platforms[platform].capture` or goldens under `design/goldens/`). If capture is missing, stop and name `pixel-perfect:scaffold` / piece #8 as the fix — evolve cannot classify against a catalog that does not exist.

## How this workflow asks

Every decision below is collected with `USER_CHOICE` — see `workflows/RUNTIME-CONTRACT.md`, "User choice protocol" and "Turn shape". The `user_choice` blocks in this file are the wording and options to use with the harness's question mechanism; they are never printed.

Evolve is a **one-gate command in the common case** (E4 confirms the whole delta). A second call fires only when E2 hits a low-confidence match or E3 finds an ambiguous sweep.

Open with a digest naming the input and the provisional intent:

```
EVOLVE — drop Settings · candidates: Settings screen + 2 sweep atoms
```

| Batch | Phase | Decisions | Fires |
|-------|-------|-----------|-------|
| E2-ask | E2 | which existing entity a low-confidence match refers to | only when classifier confidence is not decisive |
| E3-ask | E3 | whether an ambiguous sweep candidate is dead or pinned | only when reachability is inconclusive or pinned status is unclear |
| E4 | E4 | confirm the whole delta (reuse / add / promote / remove / sweep) | before legacy inventory edits |
| E-refresh | refresh | accept the complete refresh plan | once before product edits; staging is already authorized |

Worst case is three calls; a high-confidence single-screen drop or add with a clear catalog match is one (E4 only).

## Where refine ends and evolve begins

| Command | Changes |
|---------|---------|
| **`refine`** | An existing entity's **implementation** — "make the badge more rounded". Nothing added, removed, or extended. |
| **`evolve`** | Broad reassessment of updated designs or requirements, including visual updates and inventory changes. |

If `refine` detects an inventory-level request, it routes here rather than doing half of it.

---

## Reference refresh branch

Resolve `--refresh` and `--resume` before E1. Read `docs/REFRESH-CONTRACT.md` and execute its helper sequence. These options use the refresh branch instead of the additive E1–E6 sequence.

Explicit refresh invocation authorizes analysis and staged artifacts. Inspect returning-project readiness using `docs/RETURNING-PROJECT.md`. Stage references with `refresh-run.mjs stage`, analyze the rendered exports and current implementation, then present one complete plan. Classification includes unchanged, existing visual update, addition/extension, removal candidate, and unresolved conflict. Ask only for genuine source/frame ambiguity and the one plan confirmation. Do not ask whether to start analysis.

```user_choice
batch: E-refresh — accept complete refresh scope
- header: Refresh
  question: Apply the staged refresh plan and verify all selected states?
  options:
    - label: Apply plan (Recommended)
      description: Accepts the complete listed visual and inventory scope, preserves existing identities, and runs implementation plus evidence checks.
    - label: Revise scope
      description: Keeps the staged references and current implementation intact while you adjust the selected scope or resolve ambiguous mappings.
```

After confirmation, call `accept`, capture the selected before states, and execute visual updates with `docs/REFINEMENT-EXECUTION.md`. Hand additions/extensions to build with the accepted worklist. Preserve the existing explicit removal confirmation path. Use `apply` for journaled writes and `capture`, `judge`, and `check` for evidence. Run `verify`, then `complete` only when it passes. Update progress through helpers, never hand-edit the run status.

`--resume` calls `resume`, reads the stored plan/worklist, and continues the first unfinished dependency. Preserve accepted decisions and completed work. Outside edits block writes until reconciliation; never reset the project to a prior snapshot. An unchanged rerun returns without tracked changes; `--reanalyze` requests fresh analysis explicitly.

## Phases

### E1 — ACQUIRE

Normalize the input.

- A **persisted assimilation run** (`design/assimilations/<run>/` with a `receipt.json`, from `pixel-perfect:assimilate`) is already analyzed: take the delta from its `inventory.json` and receipt. No re-render, no re-read. A run without a receipt was not kept; analyze its sources afresh.
- A **file, URL, screenshot, or directory** goes through the shared design analysis (`docs/DESIGN-ANALYSIS.md`) with `SOURCES` = the input (own), `OUT` = `design/deltas/<date>-<slug>/`, `PRIOR` = `design/inventory.json`, and the aesthetic lens — the same render, read, and gate build Phase 4a uses. It renders into the delta directory, so nothing reaches `design/reference` before E4, and what comes back is a delta over confirmed names, not a fresh list.
- **Prose** is parsed for target and intent against the manifest inventory and golden catalog. Anything that does not resolve to exactly one entity or one clear intent is asked — uncertainty is asked, not guessed (runtime contract).

Write intermediate notes to `design/deltas/<date>-<slug>/acquire.md` when the input needs multi-step normalization. The turn still ends on a digest or a question.

### E2 — CLASSIFY

Classify every element of the change against the **golden catalog** — what the system actually renders today — not manifest archaeology.

| Outcome | Meaning |
|---------|---------|
| **reuse** | An existing entity already covers this. Nothing to build. |
| **variant** | An existing entity needs a new state, prop, or size. Extends in place. |
| **new** | A genuinely new entity, placed at its layer. |
| **promote** | A pattern that now appears in two or more places — extract it as a shared molecule/organism. |
| **remove** | An entity the change drops. |
| **token change** | Routed to the token flow (changelog + re-capture). |

`promote` is what makes this *grow the system* instead of growing the pile. Near-duplicate renders are detectable in the catalog; the engine proposes extraction rather than a near-duplicate atom.

**Low-confidence match → ask, never silently create a near-duplicate:**

```user_choice
batch: E2-ask — low-confidence catalog match
- header: Match
  question: The new element looks close to an existing entity. How should it be classified?
  options:
    - label: Reuse existing (Recommended)
      description: Treats the catalog match as covering this need, so nothing new is built and the shared entity stays the single source. Prefer this when the visual and prop differences are cosmetic or already expressible as a variant.
    - label: Extend as variant
      description: Adds a state, size, or prop to the matched entity in place, then re-captures only that entity and its dependents. Use when the need is a real capability the existing API almost has.
    - label: Create as new
      description: Adds a separate entity at the appropriate layer. Use only when the match is coincidental and the two would diverge; near-duplicates rot the system.
```

**State-vs-route** (`build.md` Phase 6 Step 1c): a modal over a page is a *state of that page*. A progress modal classifies as a new organism plus a new state on an existing screen — not a new screen.

### E3 — REACH

Compute the blast radius in the direction the delta needs.

**For additions** — assertion is *non-disturbance*: capture before and after applying the candidate. Any pre-existing golden that moves means a shared entity was edited (a **variant** E2 missed). Stop and reclassify rather than shipping a silent change to everything that composes it.

**For removals** — mark-and-sweep with capture as the reachability oracle:

1. **Live roots** = screens that remain after the removal.
2. For each component in the removed screen's constituent set, run:
   ```
   node {plugin}/scripts/verify-catalog.mjs --reach <Name> <project-root> --platform {platform}
   ```
3. If **no live root moves**, nothing that survives depends on it → **sweep candidate**.

Transitivity is automatic: an atom used only by a molecule used only by the removed screen moves no live root, so it is swept in the same pass.

**Three guards:**

- **Pinned entities are never swept.** `platforms[platform].pinned` (or top-level) exempts deliberate primitives.
- **The sweep list is always confirmed** (E4), never automatic. Deleting code is the one irreversible act.
- **Pre-existing dead inventory is reported separately.** A component that reached no live root *before* the removal was already dead; say so, but do not blame this change.

Ambiguous sweep:

```user_choice
batch: E3-ask — ambiguous sweep candidate
- header: Sweep
  question: Reachability for this component is unclear. How should evolve treat it?
  options:
    - label: Keep (pin) (Recommended)
      description: Leaves the component in the inventory and adds it to pinned so future sweeps skip it. Prefer this when the entity is a shared primitive you still expect to use.
    - label: Sweep with removal
      description: Includes it in the deletion set with the screen. Only choose this when you are sure nothing outside the removed screen will need it.
    - label: Leave as dead inventory
      description: Does not delete it and does not pin it; status will keep reporting it under dead inventory until a later evolve decides.
```

### E4 — CONFIRM

One `USER_CHOICE` gate carrying the **whole** delta. Nothing is written, installed, or deleted before this gate.

Write full reasoning to `design/deltas/<date>-<slug>/delta.md`. The turn ends on a short digest plus the question:

```
DELTA — +1 screen · +1 organism · ~1 variant · −1 screen · sweep 2 atoms
  reuse: StatusBadge, DateChip
  new: ProgressModal (organism), JobDetail state "progress"
  remove: Settings (+ UnusedToggle, LegacyBanner sweep)
  pinned kept: EmptyState
```

```user_choice
batch: E4 — confirm the inventory delta
- header: Confirm
  question: Apply this inventory change? Nothing has been written yet.
  options:
    - label: Apply the full delta (Recommended)
      description: Runs the atomic apply for removals and hands additions/variants to build with the seeded plan, then proves the result with catalog re-capture. This is the whole confirmed change in one pass.
    - label: Apply without sweep
      description: Removes only the named screen or entity and leaves sweep candidates in place (they stay as dead inventory). Use when you want to delete the surface first and clean orphans later.
    - label: Cancel
      description: Writes nothing. The delta artifact under design/deltas/ remains for review; re-run evolve when ready.
```

### E5 — APPLY

**Additions and variants** are persisted through `docs/DESIGN-ANALYSIS.md` Step 5 (staged; own frames merged and the inventory re-gated with `--prior` before anything in `design/` changes), then `build_plan` is updated and the work is handed to `build`. Removals, renames, and promotions take the path below, never that additive step, whose `--prior` gate forbids them. New entities pass every existing gate — styling contract, component contract, sandbox registration, state stories, **catalog capture** — because they go through the normal path.

**Removals** execute an **atomic checklist**. Partial removal is the drift that poisons the next run — all of it lands together or none does:

- component file and story file
- the sandbox registry entry (spec piece #1 is an explicit registry — it must be edited)
- goldens under `design/goldens/{platform}/…`
- the `design/inventory.json` entry, and the reference frames only it claimed (when present)
- the manifest entry
- the route from navigation, when a screen

**Deprecate mode** (`--deprecate <name>`): does not delete. Apply with the deterministic helper (or equivalent steps):

```
// after E4 confirm
import { applyDeprecation } from "{plugin}/scripts/evolve-lib.mjs";
applyDeprecation(projectRoot, platform, name, { replacement, reason });
```

That **writes** `platforms[platform].deprecations[name]`, **badges** the entity's story source with `[deprecated]`, and makes composing it fail on the next:

```
node {plugin}/scripts/verify-catalog.mjs --check <project-root> --platform {platform}
```

(`deprecatedUsage` in the report — dependents that still import / `--- composed:Name ---` the deprecated entity). Removal later runs the normal path.

### E6 — PROVE

Re-capture and assert, per direction:

| Direction | Assertion |
|-----------|-----------|
| **Add** | Every pre-existing golden is unchanged; new goldens exist for every new entity. |
| **Variant** | Only the varied entity and the stories that compose it moved. |
| **Promote** | The extracted entity exists, and its adopters moved to compose it (they must move — a non-moving adopter kept its copy). |
| **Remove** | The removed stories are gone from the catalog, and **no remaining story moved**. |

```
node {plugin}/scripts/verify-catalog.mjs --check <project-root> --platform {platform}
```

The **removal assertion** is the one that makes shedding safe: if deleting something changes something else, reachability missed a live dependent — **revert the removal** rather than report done.

Report a short digest, then the measured integers. Each integer is the inventory difference. Do not drop a part because this run extended it.

- `reuse` counts every `composes` name on a screen this run added, when that name already existed before the run. An extended part still counts.
- `new` counts entity keys present after the run and absent before it.
- `capturedMoved` counts pre-existing golden HTML files whose bytes changed. New goldens are not in that count.

Print these lines with nothing else on the line. The numbers below are illustrations; substitute the measured ones. Do not send a later message to reprint them.

```
EVOLVE proved — add ProgressModal · JobDetail+progress · check clean · 0 pre-existing goldens moved
reuse: 2
new: 1
capturedMoved: 0
Result route: /jobs/progress
pre-existing golden HTML files changed: 0 of 12
```

## Tokens

Token changes use `design/system/tokens/CHANGELOG.json` (create if missing). Blast radius is measured, not declared:

| Change | Handling |
|--------|----------|
| Value change | Re-capture; stories that moved are the visual consumers to review. |
| Addition | No cascade. |
| Rename | Codemod emit sites; re-capture must show **zero** stories moved. |
| Removal | Remove, re-capture; blocked unless nothing moves and nothing fails to build. |

## Deprecation is a mode, not a step

There is no forced `verified → deprecated → removed` ceremony for an app-local design system. Capture already identifies every consumer. `evolve --deprecate` remains for the genuine multi-screen migration case.

## Manifest fields (decisions and receipts only)

```json
{
  "capture": {
    "command": "npm run sandbox:capture",
    "medium": "dom+png",
    "goldens": "design/goldens/web-desktop",
    "captured_at": "2026-08-11T00:00:00Z"
  },
  "pinned": ["EmptyState"],
  "deprecations": {
    "LegacyJobCard": {
      "since": "2026-08-11",
      "replacement": "JobCard",
      "reason": "Unified card with status strip"
    }
  }
}
```

Do not author composition-edge arrays or `controls: true` as authority. Controls coverage and dependencies come from catalog capture.
