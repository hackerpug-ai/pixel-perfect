# Reference refresh contract

`evolve --refresh <source...> [--platform <name>] [--reanalyze]` owns the analysis and accepted plan. `evolve --resume <run-id>` resumes its worklist. `verify --refresh <run-id>` checks current evidence. Existing additive imports and targeted refinement keep their entry points.

## Intake and decisions

Invocation authorizes analysis, temporary rendering, and staging under `design/refresh/<run-id>/`. It does not authorize product edits. Render the local HTML/image exports afresh. Keep extracted bundles beside their CSS, fonts, images, and imported partials. Remote exports must first be saved with their assets. Archives must be extracted before intake.

The helper renders through real HTTP and Chrome. Revisions hash rendered frame content and render settings. It also records locally requested files to detect later asset changes. `history/` preserves the old inventory, manifest, and reference images; `exports/` preserves the observed new export files. Frame order is not identity. Match through source, route, state, viewport, and label or content. A renamed source requires an explicit `sourceMap`; a changed/ambiguous frame requires `mappings` with a reason. Omitted frames keep the run unresolved. Never infer deletion from an incomplete export.

Use one whole-design analysis over the staged frames, current implementation captures, and preserved inventory. Classify every selected item as `unchanged`, `visual-update`, `addition-extension`, `removal-candidate`, or `unresolved-conflict`. Include affected consumers and every selected state, viewport, and theme. Resolve conflicts before acceptance. Removal candidates retain evolve's existing E3 reachability and E4 removal confirmation path; refresh does not delete files. For a partial export, obtain the missing states or narrow the source set before staging. Do not fabricate a match to force promotion.

Present one complete plan for confirmation. A confirmed plan is passed to `accept` once. Resume reads the accepted record and never asks for those same decisions again. A new ambiguity, changed source, or outside edit requires a specific reconciliation decision. Do not broaden the plan silently.

## Helper interface

All paths below are relative to the project unless stated otherwise. Run helpers from the project directory. `{plugin}` is the installed plugin root. JSON input files can live in a temporary directory; do not hand-edit run records.

```sh
node {plugin}/scripts/refresh-run.mjs stage <project> <request.json>
node {plugin}/scripts/refresh-run.mjs accept <project> <run-id> <plan.json>
node {plugin}/scripts/refresh-run.mjs resume <project> <run-id>
node {plugin}/scripts/refresh-run.mjs capture <project> <run-id> <item-id> before
node {plugin}/scripts/refresh-run.mjs apply <project> <run-id> <item-id> <patch-directory>
node {plugin}/scripts/refresh-run.mjs capture <project> <run-id> <item-id> after
node {plugin}/scripts/refresh-run.mjs judge <project> <run-id> <item-id> <judgments.json>
node {plugin}/scripts/refresh-run.mjs check <project> <run-id> <item-id>
node {plugin}/scripts/refresh-run.mjs verify <project> <run-id>
node {plugin}/scripts/refresh-run.mjs complete <project> <run-id>
node {plugin}/scripts/refresh-run.mjs status <project>
```

`stage` requires `sources` (local paths), `implementationRoots` (nonempty file/directory paths covering source, tokens, stories, configuration, dependencies/lockfiles, and consumers), and a platform when more than one exists. Optional fields: `id`, `reanalyze`, `render` (`width`, `mobileWidth`, `settleMs`, `selector`), `sourceMap` (`from`, `to`, optional prior `revision`), and `mappings` (`from`, `to`, `reason`). Source paths must agree with the reference index; use absolute paths consistently. A `from: null` source is additive. All refreshed sources must appear in an explicit source map. A legacy source hash is accepted as the mapping revision only when no rendered revision exists.

`plan.json` has `version: 1`, optional `inventoryDelta` and `mappings`, and nonempty `items`. Each item has:

| Field | Required value |
|---|---|
| `id`, `name` | Unique item id and existing inventory identity, or confirmed new name |
| `layer` | `tokens`, `atoms`, `molecules`, `organisms`, or `screens`, in that order |
| `classification` | One of the five classes above; unresolved/removal candidates block acceptance |
| `files` | Exact editable file paths, all covered by implementation roots |
| `dependsOn` | Item ids that precede this item and must verify before edits |
| `states` | Nonempty selected state/viewport/theme matrix |
| `checks.regression`, `checks.behavior` | Nonempty lists of actual command argument arrays |

Each state has `name`, `frame` (accepted reference frame id), `viewport` (`WxH`), `theme`, `medium`, and `capture` (command argument array containing `{output}`). Use actual project compile/regression checks and actual consumer interaction/accessibility tests. A successful command without assertions about the affected behavior is insufficient evidence.

The capture command must create the PNG at `{output}` and a JSON sidecar at `{output}.json` with `medium`, `viewport`, `theme`, and `source`. Supported media are `browser`, `ios-simulator`, `android-emulator`, and `native-device`. Use the appropriate real platform capture tool. Browser rendering of React Native is `browser` and proves only that browser surface; a selected native target needs native captures and behavior checks. The bundled browser adapter takes positional arguments:

```sh
node {plugin}/scripts/capture-refresh-browser.mjs <URL-or-HTML> <output.png> <width> <height> <theme> <ready-selector>
```

The adapter serves local HTML over HTTP, waits for fonts/images and the selected surface, rejects rendering errors, and records browser provenance. Native capture adapters must produce truthful sidecars from their real tool run.

`apply` reads a prepared directory mirroring the project file paths. Every file must belong to that accepted item. It checks the entire watched snapshot before writing, journals intended writes, then updates progress. A crash leaves before/after byte hashes in the journal. `resume` finishes only matching journal writes; any third version blocks recovery. It never resets or rolls back outside edits. Missing/new watched files count as changes. One run owns the project at a time.

For intentional outside implementation edits, inspect the diff and use `reconcile <project> <run-id> <decision.json>`. The decision has the accepted `planHash`, a `reason`, and the exact changed `files` (`path`, current `hash`, or null for a deleted file). Reconciliation keeps the edits and decisions, invalidates after evidence, and requires new verification. Reference/configuration changes require new analysis; do not adopt them as implementation edits. If exports change during an unfinished run, preserve its history and stop for source reconciliation instead of overwriting it.

## Shared implementation path

Visual updates execute `docs/REFINEMENT-EXECUTION.md`, also used by `refine`. Additions/extensions execute the applicable build phases with this run's accepted item scope. Tokens and shared components precede consuming views. Preserve public component APIs, navigation/data wiring, interactions, accessibility constraints, and accepted differences. Prepare changed files in a patch directory, then use `apply`; do not edit watched project files directly during a refresh.

Only affected existing manifest entries reopen. Other platforms, configuration, and completed work survive. Historical phase passes remain historical until this run passes. New build entries remain the build workflow's responsibility; refresh receipts do not require project reinitialization.

## Current evidence and completion

Capture all before states before the first edit. Capture after states only from the actual resulting implementation. `judge` takes exactly one judgment per selected state in plan order: `frame`, `reviewer`, `reason`, `verdict` (`pass` or `fail`), and `discrepancies`. Each discrepancy has `description`; an accepted exception also needs `accepted: true`, `acceptedBy`, and `reason`. View both images and the accepted reference before writing that judgment. Never turn golden acceptance into a reference judgment.

`check` executes and stores the accepted regression and behavior commands separately from the visual judgment. `verify` checks nonempty coverage, current implementation/reference hashes, exact selected captures, current source inputs, checks, and exceptions. Missing/skipped states, stale receipts, failed checks, or unresolved discrepancies keep the run incomplete. Completion is a deterministic transition through `complete`, never a model-authored status edit. A later implementation change invalidates earlier receipts conservatively; capture and verify the final affected matrix again after all edits.

A fresh render matching the last complete run, with the same implementation roots and fingerprint and still-valid evidence, returns `unchanged` without changing active sources, inventory, goldens, progress, or run records. `--reanalyze` explicitly stages a fresh analysis even in that case. Projects without a previous refresh receipt establish that record on their first refresh.

The shipped automated tests exercise helpers, real file changes, HTTP, and Chrome. Their explicit test judgments validate the evidence protocol; they do not claim model visual judgment or application acceptance. The full model-driven application refresh and Ruthwell acceptance are deferred to the user.
