# TASK-T11-FIX2 — Produce and validate the controls array on a real run

> Task ID: T11-FIX2
> Sprint: [SPRINT.md](./SPRINT.md)
> Status: ✅ Completed

Commit: 63503ce81e70004b0a8a2a1fb73900fcd93c6f2d
> Assignee: github-platform-implementer
> Priority: P1
> Points: 3
> Type: FIX
> Planner: github-agentic-workflow-planner
> Proposed By: evals-implementer
> TDD_MODE: red_first · RED_GREEN_REQUIRED: true

AGENT: planner=github-agentic-workflow-planner | implementer=github-platform-implementer | reviewer=github-agentic-workflow-reviewer

**Depends on:** T5 (claude-code-cells@v1), T7 (grader@v1), T8 (recorder@v1), T9 (env-wiring@v1)
**Blocks:** none

## Background

- **Source:** T11's cycle-1 review, `.kb-run-sprint/sprint-01-evaluator-evidence-spine/T11/review-cycle-1.json` (verdict `NEEDS_FIXES`, base `7e08e1a`, commit `433e655`, cycle 1, revision 0). Two open blocking findings, both `basis: reproduced`, both `blocks_approval: true`:
  - **F-T11-1** — nothing produces `controls.json`. `.github/workflows/harness-eval.yml` has no controls producer and never mentions controls, `controls` is absent from `test/harness/schemas/harness-eval-result.v1.schema.json`'s 27 required fields, and `test/harness/recorder/result.mjs:119` defaults it to `[]`. A dispatched run therefore publishes `controls: []`, still validates, and the gate's `jq -r '.controls[]'` prints zero rows forever.
  - **F-T11-2** — the smoke job uploads its whole `cell/` directory (`.github/workflows/harness-eval.yml:266`), so `binding.json`, `keyless-control.json` and `evidence/*.capture.json` land under `cells/`. `readCellArtifacts` walks recursively (`test/harness/recorder.mjs:52-58`) and classifies every `*.json` that is not `controls.json`/`INDEX.json` as a cell record (`:81-94`), so `collectCells` refuses the whole run with `cell-harness-unknown`/`cell-track-unknown` and the grade job produces no result at all.
- **Handoff with the four exact patches:** `.tmp/sprint-01-verification/t11-out-of-scope-handoff.md` (sha256 `c2c3e5f7f23521bc6b796c880ba4810237b68ce65314191b9c8be110926fefd8`), written by T11 because every file either blocker needs is outside its four-path write scope.
- **Replayable receipt (gitignored, not a verify):** `.tmp/sprint-01-verification/t11-controls-wiring.repro.mjs` (sha256 `a71b4cfaa71cf5024a9130d7b87d1863bed9c6d25ff161d9608d5549b0339cf5`). Base-tree run recorded in `.tmp/sprint-01-verification/t11-controls-wiring.repro.log` (sha256 `387eff83e3f254d5769a37d1cfcd147d7ebad35397672ee6d36dd2249ae84cd7`): `F-T11-1 ALIVE`, `F-T11-2 ALIVE`, `@@EXIT=1@@`.
- **Human testing gate steps that exercise this task:** 11 (SPRINT.md line 73 — `jq -r '.controls[] | .control_id + " " + .verdict + " " + .reason'` over the downloaded result).
- **PRD references:** `03-data-schema.md` § HarnessEvalResult (the `controls` array); `02-system-components.md` § smoke matrix, § recorder, § stream-grader; `09-capability-chains.md` controls@v1; `04-uc-grd.md` UC-GRD-03 AC-3, UC-GRD-06; `10-e2e-testing-criteria.md` T-GRD-021, T-GRD-022
- **Capabilities touched:** CAP-EVAL-01
- **Why it matters:** T11 proves that the framework refuses four specific ways, and the receipt is the result's `controls` array. While nothing writes `controls.json` and an empty array still validates, no dispatched run can carry that receipt — so `not-executed` would persist forever without a single run ever failing, and "a control that cannot be produced is not a refusal" stays true. F-T11-2 kills the run even earlier: with today's upload layout no result artifact is published at all.
- **Current (what this task consumes):** T11's `test/harness/controls/index.mjs` (`qualifyControls`, `assertControlRows`, `writeControls`, the four `CONTROL_IDS`), T8's recorder (`readCellArtifacts`, `assembleResult`, `collectCells`), T9's smoke matrix and keyless control step, T1's download/grade job wiring, T2's result schema.
- **Desired (what this task provides):** a controls producer in the workflow that writes a four-row `controls.json` into the cells dir, a result schema where `controls` is required with exactly four rows, a recorder that refuses a run that published none, and a cells-dir reader that classifies only real cell records so the run is not killed by an artifact that is not a cell.
- **Boundary contracts:** the four control ids and their verdict/reason vocabulary are T11's (`missing-key` → `could-not-run` / `missing-api-key`, `stale-cache` → `could-not-run` / `installation-identity-mismatch`, `exit0-denied-read` → `fail` / `denied_tool_call`, `hidden-image-judge`); this task wires them and MUST NOT rename, add or re-label a row. A control that was not observed is `could-not-run` / `control-unobservable` — never `pass`, never absent.

## Critical Constraints

- MUST produce a `controls.json` array of exactly T11's four rows for every dispatched run and land it in the cells dir the recorder reads, so the dispatched artifact's `.controls[]` is never empty.
- MUST make `controls` a required field of `harness-eval-result.v1.schema.json` with `minItems: 4` and `maxItems: 4`, so `controls: []` cannot validate even if a caller slips past the recorder.
- NEVER default `controls` to `[]`. A run that executed the controls and published none MUST stop with the named refusal `controls-missing`, and a caller that passes an explicitly empty array MUST be refused; a caller that passes no `controls` argument MUST keep working (see the third constraint below).
- MUST keep `assembleResult` backwards-compatible for its two out-of-scope callers: `tests/sprint-01/grd-01-twelve-cells.test.mjs:640` and `tests/sprint-01/run-02-hand.test.mjs:526,552` call it with no `controls` argument. Those files are outside this task's write scope, and the lane is a gate.
- MUST classify a `*.json` under the cells dir by what it is (cell record, `controls.json`, `INDEX.json`, or one of the three named control-evidence forms) and MUST NOT silently skip an unrecognised record: an unclassifiable record is a named refusal. The recursive walk's fail-closed guarantee is the property worth keeping.
- MUST NOT weaken, re-order or delete the four control ids, their verdict/reason pairs, or `assertControlRows`' exactly-four rule from `test/harness/controls/index.mjs`.
- NEVER dispatch a workflow run from this task. Every gate below is local and deterministic; the hosted receipt is T11's Evidence Gate, re-run by the orchestrator, not a step here.

## Specification

- **Objective:** Make a dispatched run's `controls` array non-empty, required, schema-validated and readable by the recorder — closing F-T11-1 and F-T11-2 without touching any other task's contract.
- **Success state:** `node --test tests/sprint-01/t11-controls-wiring.test.mjs` is green with `pass 5`, `fail 0`, its five tests encoding the repro's `F-T11-1 dead` / `F-T11-2 dead` assertions; the workflow's `download` job carries a producer step that writes `cells/controls.json` before the cells artifact is uploaded; the schema requires exactly four controls rows; `assembleResult` refuses an explicitly empty array and defaults a silent caller to the four unobserved rows; `readCellArtifacts` classifies 12 cells out of a layout that also carries `binding.json`, `keyless-control.json` and `evidence/*.capture.json`.

### Patch 1 — F-T11-1: a controls producer in `.github/workflows/harness-eval.yml`

The recorder already reads a `controls.json` that arrives in the cells dir (`test/harness/recorder.mjs:88-91` → `assembleResult({ controls })`), and nothing ever writes one. Add one producer step carrying that file, in the job that already assembles this attempt's cells.

**Why a step in `download` and not a job of its own.** The first cut of this patch added a `controls:` job after `smoke`. It cannot land: `tests/sprint-01/run-02-hand.test.mjs:169` — T1's locked `FLOW-RUN-02-HAND` — asserts `artifact.declaration.jobs` is exactly `["download", "drift", "grade", "smoke"]`, so a fifth job fails that flow. That file is outside this task's write scope, and this task's own TC-3 forbids buying green by editing it. The producer therefore rides the `download` job, which is also where the file has to end up: it runs after the cells are fetched and before they are handed on, so `controls.json` ships inside `harness-eval-cells-<run>-<attempt>` and the grade job can never receive a cells dir without it.

In the `download` job, between `Fetch every cell from this attempt` and `Hand the cells to the recorder`:

```yaml
      - name: Qualify the four negative controls
        if: always()
        run: |
          set -eu
          mkdir -p cells
          node --input-type=module -e '
          import { qualifyControls, assertControlRows, writeControls } from "./test/harness/controls/index.mjs";
          const observations = JSON.parse(process.env.HARNESS_EVAL_CONTROL_OBSERVATIONS ?? "{}");
          const rows = assertControlRows(qualifyControls({ observations }).rows);
          const written = writeControls({ file: "cells/controls.json", rows });
          if (!written.ok) { console.error("controls.json did not read back: " + JSON.stringify(written.mismatches)); process.exit(1); }
          '
```

The job needs `actions/checkout@v4` (`persist-credentials: false`) and `actions/setup-node@v4` before that step, because it imports the module out of the dispatch commit.

`HARNESS_EVAL_CONTROL_OBSERVATIONS` is T11's input shape (`{ "<control_id>": { "verdict", "reason", "evidence" } }`); whichever step really observes a control exports its row into it. Until that plumbing exists, passing `{}` is **not** an escape: all four rows come back `could-not-run` / `control-unobservable`, which is the honest reading of a run that observed nothing.

That lands the file at `cells/controls.json`, the exact name `readCellArtifacts` routes into `artifacts.controls`, before the `harness-eval-cells-*` upload picks up the whole dir. No recorder change is needed for the happy path.

`tests/sprint-01/flow-runner.mjs`'s `inspectWorkflowDeclaration` constrains the job that now carries the producer: it MUST declare `permissions: contents: read` and no other scope, every job MUST have at least one step, and its upload MUST carry `if: always()` and an attempt-qualified name. Those rules already cover `download`, so `flow-runner.mjs` needs no edit — and adding `controls` to its `["smoke", "download", "grade"]` upload scan would assert a job that does not exist.

### Patch 2 — F-T11-1: refuse an empty array — `test/harness/recorder/result.mjs`, `test/harness/recorder.mjs`

`assembleResult` defaults `controls = []`, so a run that executed controls and published none is indistinguishable from a run that had none. In `main()`, after `collectCells` — so a broken grid is still named by the more specific defect (`cells-incomplete`, `cells-duplicate`) rather than masked as a missing controls file, which is the ordering F-T8-2 established:

```js
    if (artifacts.controls.length === 0) {
      throw new RecorderRefusal("controls-missing", {
        dir: env.HARNESS_EVAL_CELLS_DIR ?? "cells",
        why: "every run executes the four negative controls; controls.json never arrived, so .controls[] would be empty and the gate would print nothing",
      });
    }
```

In `assembleResult`, drop the `= []` default and refuse an empty array — but keep the two out-of-scope callers working by defaulting a *silent* caller to the four unobserved rows (the handoff names `qualifyControls({}).rows` as the correct unobserved set):

```js
-export function assembleResult({ cells, pins, context, timestamps, controls = [], laterChecks = [] }) {
+export function assembleResult({ cells, pins, context, timestamps, controls, laterChecks = [] }) {
+  // A silent caller gets the honest unobserved set; a caller that states zero rows is refused.
+  const controlRows = controls ?? qualifyControls({}).rows;
+  if (!Array.isArray(controlRows) || controlRows.length === 0) {
+    throw new RecorderRefusal("controls-missing", { why: "a result with no controls array cannot say what the controls proved" });
+  }
```

and use `controlRows` in the record body where `controls` is spread today. `test/harness/controls/index.mjs` imports only `node:fs` and `node:path`, so the import adds no cycle.

The shipped validator (`test/harness/validate.mjs`) implements a JSON-Schema subset with no `minItems`/`maxItems`, so Patch 3's bound is a statement for a full validator and the hosted contract. `assembleResult` therefore also runs `assertControlRows` over the rows it is about to write and re-raises a non-conforming set as one named `controls-invalid` refusal — three rows, five rows and a re-labelled row are all refused by the writer, not only by a schema nobody here evaluates.

Both halves matter: `main()` is what makes a real run fail closed, and `assembleResult` is what the repro exercises (`assembleResult({ ..., controls: [] })`).

### Patch 3 — F-T11-1: `test/harness/schemas/harness-eval-result.v1.schema.json`

```diff
-  "required": ["schema", "repository_id", ... "fix"]
+  "required": ["schema", "repository_id", ... "fix", "controls"]
   "controls": {
     "type": "array",
+    "minItems": 4,
+    "maxItems": 4,
```

`minItems` is what makes `controls: []` unvalidatable even if a caller slips past Patch 2. The row schema (required `control_id`, `verdict`, `reason`) and its closed verdict enum already exist and MUST NOT change.

### Patch 4 — F-T11-2: scope the smoke upload

The smoke job's `Upload this cell even when the smoke step failed` uploads `path: cell/`, so `cell/binding.json`, `cell/keyless-control.json` and `cell/evidence/*.capture.json` arrive in `cells/`.

```diff
       - name: Upload this cell even when the smoke step failed
         if: always()
         uses: actions/upload-artifact@v4
         with:
           name: harness-eval-cell-${{ github.run_id }}-${{ github.run_attempt }}-${{ matrix.harness }}-${{ matrix.track }}
-          path: cell/
+          # Exactly the cell record. binding.json, the keyless row and the captures are control
+          # evidence, not cell records: the recorder classifies every *.json under cells/ by what it
+          # is and refuses what it cannot classify, so they must not ride in here.
+          path: cell/cell.json
           if-no-files-found: warn
```

Do **not** solve this by teaching `readCellArtifacts` to skip unknown `*.json` files: that turns a real malformed cell (wrong name, truncated write) into a silent omission. The strays are not discarded either — an already-published attempt still carries them, and Patch 5 is what makes that attempt readable: they are classified as control evidence, by name.

### Patch 5 — F-T11-2: classify the cells dir by content, not by extension

Patch 4 stops a *future* run from carrying strays. It does not make an already-published attempt readable, and it does not touch the repro, which builds today's real layout on purpose and reads it back through `readCellArtifacts`. The repro's own success condition (`cells_classified === 12 && recorder_refusal === null`) is therefore met only when the walk stops classifying every `*.json` as a cell.

`readCellArtifacts` classifies each `*.json` by what it is:

- `INDEX.json` → skipped (existing behaviour)
- `controls.json` → `controls` (existing behaviour; an array, else `controls-invalid`)
- a record with string `harness` and `track` → a cell record (the existing downstream `collectCells` checks stay exactly as they are)
- one of the three named control-evidence forms → a new `controlEvidence` bucket, never merged into `controls`:
  - `binding.json` (carries `credential_env` and `binding_env`)
  - a row carrying `control_id` and `verdict` (today's `keyless-control.json`)
  - `*.capture.json` (carries `check_id` and `model_request_count`)
- anything else → `throw new RecorderRefusal("cell-unclassified", { file, why })`

`controlEvidence` is named, kept and never read as a cell or as one of the four controls: a per-cell keyless row MUST NOT stand in for the controls artifact, which is exactly what Patch 2's `controls-missing` refusal is for. An unrecognised record MUST still fail the run by name — this replaces "treated as a cell" with "refused as itself", it does not replace it with silence.

### Owned test — `tests/sprint-01/t11-controls-wiring.test.mjs`

This task owns one tracked sprint test, `tests/sprint-01/t11-controls-wiring.test.mjs`, added to WRITE-ALLOWED. It is where the repro's assertions land as five `node --test` tests, one per requirement row, so every row's `verify` selects exactly one test of a path this task owns:

| Test (`--test-name-pattern`) | Encodes | Row |
|---|---|---|
| `controls-producer` | a controls producer step exists in `.github/workflows/harness-eval.yml`, writing `cells/controls.json` before the cells artifact is uploaded, and `controls` is in the result schema's `required` array with `minItems: 4` / `maxItems: 4` | AC-1 |
| `controls-classification` | the `cell/` upload layout classifies into exactly 12 cells with no refusal | AC-2 |
| `controls-refusal` | `assembleResult` refuses an explicitly empty `controls` array with `RecorderRefusal("controls-missing")`, and the schema cannot validate an empty one | TC-1 |
| `controls-evidence-bucket` | `binding.json`, `keyless-control.json` and `evidence/*.capture.json` land in a separate `controlEvidence` bucket, never in `cells` or `controls`, while an unclassifiable record is refused by name (`cell-unclassified`) | TC-2 |
| `controls-back-compat` | a silent caller — no `controls` argument, as `grd-01-twelve-cells.test.mjs:640` and `run-02-hand.test.mjs:526,552` call it — receives the four unobserved rows and a validating result | TC-3 |

All five are RED at this task's base head: base has no controls producer, no `controls` in the schema's `required`, an `assembleResult` that accepts `controls: []`, a walk that classifies 15 records as cells, and a silent caller that gets `[]`. The repro in `.tmp/` stays the recorded receipt of that RED run (it is gitignored and is not a verify command); the tracked test is the proof the runner runs.

## Acceptance Criteria (GIVEN-WHEN-THEN)

### AC-1: A run that publishes no controls row is a refused run — controls.json is produced, required, and exactly four rows

- **GIVEN:** the base tree at `7e08e1a` (today's `main`) and `tests/sprint-01/t11-controls-wiring.test.mjs`, whose `controls-producer` test encodes the F-T11-1 half of `.tmp/sprint-01-verification/t11-controls-wiring.repro.mjs` (`reproduceF1`)
- **WHEN:** `node --test tests/sprint-01/t11-controls-wiring.test.mjs --test-name-pattern controls-producer`
- **THEN:** exit 0 and a TAP `ok` line for `controls-producer`; `controls_in_schema_required === true`; `controls_min_items === 4`; `assemble_result_refusal.reason === "controls-missing"`; the workflow's producer writes `cells/controls.json` before the cells artifact is uploaded, so the four rows reach the grade job, and `main()` refuses a cells dir that carries none

```text
FINDING:               F-T11-1
TEST_TIER:             integration
VERIFICATION_SERVICE:  local repro + node --test (no dispatch)
SURFACE_POLICY:        .spec/e2e-policy/sprint-01/artifact-only-read.json
TDD_STATE:             red_first
VERIFY:                node --test tests/sprint-01/t11-controls-wiring.test.mjs --test-name-pattern controls-producer
EXPECT:                exit 0 · TAP `ok` for controls-producer · fail 0
```

- **RED input (fails on base):** on base `main` nothing writes `controls.json`, `controls` is absent from the schema's 27 required fields, and `assembleResult({ ..., controls: [] })` is accepted (`empty_controls_accepted_rows = 0`, `assemble_result_refusal = null`), so the repro prints `F-T11-1 ALIVE` and exits 1. Recorded at `.tmp/sprint-01-verification/t11-controls-wiring.repro.log`.
- **RED proof:** `.tmp/sprint-01-verification/t11-controls-wiring.repro.log`; re-record at this task's base head into `.tmp/sprint-01-verification/t11-fix.repro.red.log` (same content, `F-T11-1 ALIVE`, `@@EXIT=1@@`).
- **positive_example (passes after landing):** the same call throws `RecorderRefusal("controls-missing")`, `controls` is in the schema's `required` list with `minItems: 4`/`maxItems: 4`, and the producer step's `writeControls` read-back is `ok` with T11's four rows — `controls-producer` asserts `controls_in_schema_required = true` and `assemble_result_refusal = {"reason":"controls-missing"}`, and the recorded repro receipt still prints `F-T11-1 dead`, exit 0.

SCENARIO_SUMMARY: complete SCENARIO lives once, in this AC's row of the REQUIREMENT-CONTRACT block below.

### AC-2: The cells dir carries only cell records — a stray artifact no longer kills the run

- **GIVEN:** the base tree at `7e08e1a` and `tests/sprint-01/t11-controls-wiring.test.mjs`, whose `controls-classification` test encodes the repro's `buildDownloadedCells()`, which mirrors what the `download` job really assembles — 12 `harness-eval-cell-*` artifacts, one of which also carries `binding.json`, `keyless-control.json` and `evidence/claude-code-verify.capture.json`
- **WHEN:** `node --test tests/sprint-01/t11-controls-wiring.test.mjs --test-name-pattern controls-classification`
- **THEN:** exit 0 and a TAP `ok` line for `controls-classification`; `cells_classified === 12`; `expected_cells === 12`; `recorder_refusal === null`; and an unclassifiable record still stops the run by name

```text
FINDING:               F-T11-2
TEST_TIER:             integration
VERIFICATION_SERVICE:  local repro + node --test (no dispatch)
SURFACE_POLICY:        .spec/e2e-policy/sprint-01/artifact-only-read.json
TDD_STATE:             red_first
VERIFY:                node --test tests/sprint-01/t11-controls-wiring.test.mjs --test-name-pattern controls-classification
EXPECT:                exit 0 · TAP `ok` for controls-classification · fail 0
```

- **RED input (fails on base):** on base `main` `readCellArtifacts` classifies 15 records as cells — the 12 real cells plus `binding.json`, `evidence/claude-code-verify.capture.json` and `keyless-control.json` — and `collectCells` refuses with `cell-track-unknown`/`cell-harness-unknown`, so the grade job publishes no result artifact at all. The repro prints `F-T11-2 ALIVE` and exits 1. Recorded at `.tmp/sprint-01-verification/t11-controls-wiring.repro.log`.
- **RED proof:** `.tmp/sprint-01-verification/t11-controls-wiring.repro.log`; re-record into `.tmp/sprint-01-verification/t11-fix.repro.red.log` (`F-T11-2 ALIVE`, `cells_classified = 15`, `@@EXIT=1@@`).
- **positive_example (passes after landing):** `readCellArtifacts` returns 12 cells with `refusal === null` — the three named control-evidence forms land in `controlEvidence` and `binding.json`/`keyless-control.json`/captures never enter `collectCells`; a record that is neither a cell nor a named form raises `cell-unclassified` naming the file. `controls-classification` and `controls-evidence-bucket` assert `cells_classified = 12` and `recorder_refusal = null`; the recorded repro receipt still prints `F-T11-2 dead`, exit 0.

SCENARIO_SUMMARY: complete SCENARIO lives once, in this AC's row of the REQUIREMENT-CONTRACT block below.

## Test Criteria

Each TC is an assertion inside its mapped AC's VERIFY command; its fail input and positive example are on its row in the REQUIREMENT-CONTRACT block.

| TC | Statement | Maps to | Bound test (`--test-name-pattern`) |
|----|-----------|---------|--------------------------------|
| TC-1 | `assembleResult` refuses an explicitly empty `controls` array with `controls-missing`, and the result schema cannot validate an empty one | AC-1 | `controls-refusal` |
| TC-2 | A cells dir that also carries `binding.json`, `keyless-control.json` and `evidence/*.capture.json` yields exactly 12 cells and no refusal, while an unclassifiable record is refused by name | AC-2 | `controls-evidence-bucket` |
| TC-3 | `FLOW-GRD-03-FILES-AND-STREAM` and `FLOW-GRD-06-MISSING-KEY` stay green, and the whole sprint-01 lane stays green — no out-of-scope caller of `assembleResult` broke | AC-1, AC-2 | `controls-back-compat` (the two flow replays and the whole lane are gates TC-3a/3b/3c, not this row's verify) |

## Reading List

1. `.tmp/sprint-01-verification/t11-out-of-scope-handoff.md` — the four exact patches this task owns (sha256 pinned in Background)
2. `.tmp/sprint-01-verification/t11-controls-wiring.repro.mjs` — the replayable receipt this task encodes as `tests/sprint-01/t11-controls-wiring.test.mjs`; read `reproduceF1`, `reproduceF2` and `buildDownloadedCells` before changing anything
3. `.kb-run-sprint/sprint-01-evaluator-evidence-spine/T11/review-cycle-1.json` — findings F-T11-1 and F-T11-2 with their file:line locations
4. `test/harness/controls/index.mjs` — `CONTROLS`, `qualifyControls`, `assertControlRows`, `writeControls`: the producer's only legal output shape
5. `test/harness/recorder.mjs` § `readCellArtifacts`/`main`, `test/harness/recorder/result.mjs` § `assembleResult`, `test/harness/recorder/validate.mjs` § `toHarnessCell` — the reader being changed and the fail-closed checks that must survive it
6. `.github/workflows/harness-eval.yml` — the smoke, download and grade jobs; `tests/sprint-01/flow-runner.mjs` § `inspectWorkflowDeclaration` — the workflow's own constraints
7. `.spec/prds/harness-eval-framework/09-technical-requirements/03-data-schema.md` § HarnessEvalResult (the `controls` array)

Coding standards:

- `AGENTS.md`
- `brain/docs/TDD-METHODOLOGY.md`
- `brain/docs/kanban/SCENARIO-CONTRACT-V1.md`

## Guardrails

WRITE-ALLOWED:

- .github/workflows/harness-eval.yml
- test/harness/schemas/harness-eval-result.v1.schema.json
- test/harness/recorder.mjs
- test/harness/recorder/**
- test/harness/controls/**
- tests/sprint-01/grd-03-evidence.test.mjs
- tests/sprint-01/grd-06-missing-key.test.mjs
- tests/sprint-01/flow-runner.mjs
- tests/sprint-01/t11-controls-wiring.test.mjs
- .spec/prds/harness-eval-framework/tasks/sprint-01-evaluator-evidence-spine/TASK-T11-FIX2.md
- .spec/prds/harness-eval-framework/tasks/sprint-01-evaluator-evidence-spine/TASK-T11-FIX2.contract.json

WRITE-PROHIBITED:

- plugins/pixel-perfect/**
- Any file not listed in write_allowed

## Code Pattern

```js
// readCellArtifacts: classify by what the record is, never skip it
for (const file of jsonFiles) {
  const record = readJson(file);
  if (file.endsWith(`${sep}${VERIFY_INDEX}`)) continue;
  if (file.endsWith(`${sep}controls.json`)) { controls.push(...record); continue; }
  if (typeof record?.harness === "string" && typeof record?.track === "string") { cells.push(record); continue; }
  const form = CONTROL_EVIDENCE_FORM(record, file);      // binding | control-row | capture
  if (form) { controlEvidence.push({ form, file, record }); continue; }
  throw new RecorderRefusal("cell-unclassified", { file, why: "not a cell record and not one of the named control-evidence forms" });
}
```

```js
// assembleResult: a silent caller gets the honest unobserved set; zero rows is refused
const controlRows = controls ?? qualifyControls({}).rows;
if (!Array.isArray(controlRows) || controlRows.length === 0) {
  throw new RecorderRefusal("controls-missing", { why: "a result with no controls array cannot say what the controls proved" });
}
```

- **Source:** `test/harness/controls/index.mjs` (`CONTROLS`, `qualifyControls`, `assertControlRows`, `writeControls`) — the only producer; `test/harness/recorder.mjs` § `readCellArtifacts`
- **Anti-pattern:** `controls = []` as a default; `controls` left optional in the schema; a schema `minItems` without the recorder refusal behind it; teaching the walk to silently ignore unknown `*.json`; merging a per-cell `keyless-control.json` into the four rows so a stray can impersonate the controls artifact; editing `tests/sprint-01/grd-01-twelve-cells.test.mjs` or `run-02-hand.test.mjs` to make the lane green.

## Design

None. This task changes a workflow, a schema and the recorder; nothing lands on a screen.

## Agent Instructions

Work the two ACs as two RED, GREEN, REFACTOR cycles in AC order, and land Patches 1–5 in the order the handoff gives them — Patch 1 depends on T11's module, Patch 2 and Patch 5 both touch the recorder.

**PRECONDITION — the repro is gitignored, the owned test is not.** `.tmp/` is in `.gitignore`, so `.tmp/sprint-01-verification/t11-controls-wiring.repro.mjs` does **not** travel with a branch. Before starting, confirm it exists at this task's repo root; if it does not, copy it (and `t11-controls-wiring.repro.log`) from T11's worktree at `.kb-run-sprint/worktrees/sprint-01-evaluator-evidence-spine/T11/.tmp/sprint-01-verification/`. The proof the runner runs is `tests/sprint-01/t11-controls-wiring.test.mjs`, which this task owns and commits: write its five tests from the repro's `reproduceF1`/`reproduceF2`/`buildDownloadedCells` and the handoff, so a missing repro degrades the RED receipt to the recorded `.tmp/sprint-01-verification/t11-fix.repro.red.log` rather than blocking. Never rewrite the repro to pass.

- **AC-1:** RED = `node --test tests/sprint-01/t11-controls-wiring.test.mjs --test-name-pattern controls-producer` fails at this task's base head (no controls producer, `controls` not required), captured to `.tmp/sprint-01-verification/t11-fix.repro.red.log` beside the repro's `F-T11-1 ALIVE`. GREEN = Patches 2, 3, 1 in that order, then `controls-producer` and `controls-refusal` are TAP `ok`, and the repro receipt prints `F-T11-1 dead`.
- **AC-2:** RED = the same log's `F-T11-2 ALIVE` with `cells_classified = 15`, and `--test-name-pattern controls-classification` fails. GREEN = Patch 4 and Patch 5, then `controls-classification` and `controls-evidence-bucket` are TAP `ok`, and the repro receipt prints `F-T11-2 dead` with `cells_classified = 12`.
- After both: `node --test tests/sprint-01/t11-controls-wiring.test.mjs` reports `pass 5`, `fail 0`, and the three regression gates (grd-03, grd-06, whole lane) are recorded to `.tmp/sprint-01-verification/t11-fix.repro.green.log`.
- Do not edit `tests/sprint-01/grd-01-twelve-cells.test.mjs` or `tests/sprint-01/run-02-hand.test.mjs`. If the lane fails there, Patch 2's default is wrong — fix `assembleResult`, not the test.
- Do not dispatch the workflow. The hosted receipt is T11's gate, not this task's.

## Orchestrator Verification Protocol

0. Confirm `.tmp/sprint-01-verification/t11-controls-wiring.repro.mjs` exists before dispatching (it is gitignored; copy it from T11's worktree if missing). It is the recorded receipt, not the proof: the proof is `tests/sprint-01/t11-controls-wiring.test.mjs`, which this task commits.
1. **VERIFY_RED:** at the task's base head all five `node --test tests/sprint-01/t11-controls-wiring.test.mjs` tests fail, the repro exits 1 with `F-T11-1 ALIVE` and `F-T11-2 ALIVE`, and `.tmp/sprint-01-verification/t11-fix.repro.red.log` records both.
2. **VERIFY_GREEN:** `node --test tests/sprint-01/t11-controls-wiring.test.mjs` reports `pass 5`, `fail 0`; the repro receipt exits 0 printing `F-T11-1 dead` and `F-T11-2 dead`; the two flow replays and the whole lane exit 0.
3. Run every Evidence Gate and compare with Expected.
4. `git diff --name-only` lists only WRITE-ALLOWED paths; `plugins/pixel-perfect/**` is untouched; no other task's test file is modified.
5. Re-run T11's hosted controls gate (SPRINT.md step 11) on the next dispatch and confirm the downloaded result's `.controls[]` prints four rows. This is T11's gate, not this task's: record the outcome, do not fail T11-FIX2 for an undelivered dispatch.
6. Dispatch `github-agentic-workflow-reviewer` with this file, the RED and GREEN logs, and the diff.

## Agent Assignment

- **Planner role:** `github-agentic-workflow-planner`
- **Implementer role:** `github-platform-implementer`
- **Reviewer role:** `github-agentic-workflow-reviewer`
- **Rationale:** the change is workflow, schema and recorder plumbing — no eval semantics are being decided, so the platform implementer owns it and the workflow reviewer audits the fail-closed guarantees rather than the control vocabulary (which stays T11's).
- **Pairing:** `github-platform-implementer` builds; `github-agentic-workflow-reviewer` reviews adversarially against the Review Criteria below.

## Evidence Gates

- **AC-1:** `node --test tests/sprint-01/t11-controls-wiring.test.mjs --test-name-pattern controls-producer`. Expected: exit 0, a TAP `ok` line for `controls-producer`, `fail 0` — the test asserts the producer step exists in `harness-eval.yml` and writes `cells/controls.json` before the cells artifact is uploaded, and `controls` is in the schema's `required` with `minItems: 4`/`maxItems: 4`. The recorded repro receipt (not a verify) still shows `controls_in_schema_required = true`, `assemble_result_refusal = {"reason":"controls-missing",...}`.
- **AC-2:** `node --test tests/sprint-01/t11-controls-wiring.test.mjs --test-name-pattern controls-classification`. Expected: exit 0, a TAP `ok` line for `controls-classification`, `fail 0` — `cells_classified = 12`, `expected_cells = 12`, `recorder_refusal = null`; the recorded repro receipt (not a verify) prints `F-T11-2 dead`.
- **Owned test file (all five):** `node --test tests/sprint-01/t11-controls-wiring.test.mjs`. Expected: `pass 5`, `fail 0` — `controls-producer`, `controls-classification`, `controls-refusal`, `controls-evidence-bucket`, `controls-back-compat`
- **repro receipt (recorded, not a verify):** `node .tmp/sprint-01-verification/t11-controls-wiring.repro.mjs`. Expected: exit 0 printing `F-T11-1 dead` and `F-T11-2 dead`; captured into `.tmp/sprint-01-verification/t11-fix.repro.green.log`
- **TC-3a:** `node --test tests/sprint-01/grd-03-evidence.test.mjs --test-name-pattern FLOW-GRD-03-FILES-AND-STREAM`. Expected: every matched `FLOW-GRD-03-FILES-AND-STREAM` test prints a TAP `ok` line; `fail 0`
- **TC-3b:** `node --test tests/sprint-01/grd-06-missing-key.test.mjs --test-name-pattern FLOW-GRD-06-MISSING-KEY`. Expected: the `FLOW-GRD-06-MISSING-KEY` test prints a TAP `ok` line; `fail 0`
- **TC-3c (whole lane):** `node --test tests/sprint-01/*.test.mjs`. Expected: `pass 98`, `fail 0` — and it is not green if `grd-01-twelve-cells` or `run-02-hand` needed an edit to get there
- **controls round-trip:** the producer's own step, run locally as `node --input-type=module -e '<qualifyControls → assertControlRows → writeControls into a scratch dir>'`. Expected: `writeControls` returns `ok: true` with four rows, and `readCellArtifacts` over a cells dir holding that `controls.json` returns `controls.length === 4`

## Review Criteria

Must pass:

- The owned test `tests/sprint-01/t11-controls-wiring.test.mjs` is committed and reports `pass 5`, `fail 0`, with `controls-producer`, `controls-classification`, `controls-refusal`, `controls-evidence-bucket` and `controls-back-compat` each asserting its row's THEN.
- The repro exits 0 with both `F-T11-1 dead` and `F-T11-2 dead`; the RED log from the task's base head exists and shows both `ALIVE`.
- `controls` is in the result schema's `required` list with `minItems: 4` and `maxItems: 4`; `assembleResult` has no `= []` default and refuses an explicitly empty array with `controls-missing`.
- The `download` job carries a producer step that runs T11's `qualifyControls` → `assertControlRows` → `writeControls` over `cells/controls.json`, before the cells artifact is uploaded.
- `readCellArtifacts` classifies by content: 12 cells out of the repro's layout, the three named control-evidence forms in a bucket that never becomes `controls`, and an unclassifiable record refused by name.
- The four control ids and their verdict/reason pairs are byte-identical to T11's `CONTROL_IDS`; nothing in `test/harness/controls/**` was re-labelled.
- `git diff --name-only` lists only WRITE-ALLOWED paths; `tests/sprint-01/grd-01-twelve-cells.test.mjs` and `tests/sprint-01/run-02-hand.test.mjs` are untouched and the lane is green.

Should verify:

- A cells dir with no `controls.json` still makes `main()` refuse with `controls-missing` — a silent caller's default must never paper over a real run.
- `minItems`/`maxItems` cannot be gamed: five rows fail, three rows fail, zero rows fail.
- An unrecognised `*.json` (e.g. a truncated cell write) still stops the run, with the file named in the refusal.
- The job carrying the producer declares only `permissions: contents: read`; the producer step is `if: always()`; no secret reaches it.

Verdict: APPROVED or NEEDS_FIXES, with file and line for each finding.

## Dependencies

- **Depends on:** T5 (claude-code-cells@v1), T7 (grader@v1), T8 (recorder@v1), T9 (env-wiring@v1)
- **Blocks:** none

A shared file is not a dependency, and needing another task's output to test against is that flow's integration obligation, not an edge.

**Why the edge moved off T11.** The previous `Depends on: T11` was circular: T11 cannot land while these two findings are open, and these two findings cannot close without the wiring this task owns. So T11's controls module (`test/harness/controls/**` — `qualifyControls`, `assertControlRows`, `writeControls`, the four `CONTROL_IDS`) is **adopted into this branch** verbatim instead, exactly as the predecessor did in commit `68646e9`; nothing in it is renamed, re-ordered or weakened. What this task really builds on is the landed sprint-01 modules T5, T7, T8 and T9 ship — the cells, the grader, the recorder and the credential wiring — which is what the four edges above name.

## Notes

- **Flow ownership:** this task owns no flow. It is exercised by `FLOW-GRD-03-FILES-AND-STREAM` (T6 owns it) and `FLOW-GRD-06-MISSING-KEY` (T11 owns it) only as the two replays that must stay green; its real gate is the repro and T11's hosted controls step.
- **Why the fixes landed here and not in T11:** T11's contract allows `test/harness/controls/**`, the two flow tests and `flow-runner.mjs`. F-T11-1 needs the workflow, the schema and the recorder; F-T11-2 needs the workflow and the recorder. T11 cannot reach either without a guardrail violation, which is why its review recorded both as `suggested_owner: orchestrator`.
- **Patches 4 and 5 are independent, and both are required:** Patch 4 stops a future run from shipping strays into `cells/`; Patch 5 makes an already-published attempt readable and keeps the walk fail-closed. Neither alone makes AC-2's verify command reach `dead`, because the repro builds today's real layout on purpose.
- **The repro is gitignored:** `.tmp/` is in `.gitignore`, so the repro travels only via the orchestrator (see the precondition). This task does not commit it.
- **Out of scope:** implementing the guard or graders (T3, T7); observing controls inside the workflow's harness invocations (T9's smoke steps export `HARNESS_EVAL_CONTROL_OBSERVATIONS` — until then the four rows are `could-not-run` / `control-unobservable`, which is honest); deciding the release effect of a control (T8's recorder and the release resolver); re-dispatching the workflow.
- **Split check:** not triggered — 3 points, one failure mode per AC, no shared file with another ready task.
- **Plan correction — no separate `controls` job.** The first cut of Patch 1 declared one. It cannot land: `tests/sprint-01/run-02-hand.test.mjs:169` (T1's locked `FLOW-RUN-02-HAND`) asserts the workflow's job list is exactly `[download, drift, grade, smoke]`, and that file is outside this task's write scope. The producer therefore runs as a step of `download`, which already moves this attempt's cells. Anything that adds a job to `harness-eval.yml` has to move that assertion in T1's flow first.
- **Plan-wide, reported not fixed — `--test-name-pattern` after the file is ignored.** Every verify command in this sprint reads `node --test <file> --test-name-pattern <name>`. Node 24.14 does not filter in that order (it runs the whole file); the flag works only before the file position, `node --test --test-name-pattern <name> <file>`. The gates still fail closed — a broken named test fails the file — but they do not isolate, and a deleted test would not be noticed by the pattern alone. Fixing that is a sprint-wide change to every task's verify commands, not this task's.
- **Owner:** `github-agentic-workflow-planner`; sprint `sprint-01-evaluator-evidence-spine`.

<!-- REQUIREMENT-CONTRACT v1 -->
<!--
{
  "version": "1",
  "task_id": "T11-FIX2",
  "task_type": "FIX",
  "tdd_mode": "red_first",
  "verification_policy": {
    "requires_tests": true,
    "requires_red_evidence": true,
    "requires_seeded_evidence": true
  },
  "guardrails": {
    "write_allowed": [
      ".github/workflows/harness-eval.yml",
      "test/harness/schemas/harness-eval-result.v1.schema.json",
      "test/harness/recorder.mjs",
      "test/harness/recorder/**",
      "test/harness/controls/**",
      "tests/sprint-01/grd-03-evidence.test.mjs",
      "tests/sprint-01/grd-06-missing-key.test.mjs",
      "tests/sprint-01/flow-runner.mjs",
      "tests/sprint-01/t11-controls-wiring.test.mjs",
      ".spec/prds/harness-eval-framework/tasks/sprint-01-evaluator-evidence-spine/TASK-T11-FIX2.md",
      ".spec/prds/harness-eval-framework/tasks/sprint-01-evaluator-evidence-spine/TASK-T11-FIX2.contract.json"
    ],
    "write_prohibited": [
      "plugins/pixel-perfect/**"
    ]
  },
  "fixtures": {
    "seed/t11-controls-wiring-repro": {
      "entrypoint": ".tmp/sprint-01-verification/t11-controls-wiring.repro.mjs (gitignored; copied from .kb-run-sprint/worktrees/sprint-01-evaluator-evidence-spine/T11/.tmp/sprint-01-verification/ by the orchestrator)",
      "description": "the replayable F-T11-1 + F-T11-2 proof; prints ALIVE/dead per finding and exits 1 until both are dead",
      "seed_method": "migration_fixture"
    },
    "seed/t11-repro-base-log": {
      "entrypoint": ".tmp/sprint-01-verification/t11-controls-wiring.repro.log",
      "description": "base-tree run at head 433e655: F-T11-1 ALIVE, F-T11-2 ALIVE, @@EXIT=1@@",
      "seed_method": "recorded_external"
    },
    "seed/cells-with-strays": {
      "entrypoint": "repro buildDownloadedCells(): 12 harness-eval-cell-* dirs, one leg also carrying binding.json, keyless-control.json and evidence/claude-code-verify.capture.json",
      "description": "the cells dir today's smoke upload really assembles",
      "seed_method": "migration_fixture"
    },
    "seed/controls-roundtrip": {
      "entrypoint": "node --input-type=module: qualifyControls({ observations }) -> assertControlRows -> writeControls into a scratch dir, then readCellArtifacts over that dir",
      "description": "four rows written, read back and collected as artifacts.controls",
      "seed_method": "cli"
    },
    "seed/base-workflow-7e08e1a": {
      "entrypoint": ".github/workflows/harness-eval.yml at base 7e08e1a (jobs drift, smoke, download, grade; smoke upload path: cell/)",
      "description": "the workflow state F-T11-1 and F-T11-2 were reproduced against",
      "seed_method": "migration_fixture"
    }
  },
  "verification_gates": [],
  "integration_obligations": [],
  "requirements": [
    {
      "id": "AC-1",
      "type": "acceptance_criterion",
      "primary": false,
      "flow_ref": null,
      "title": "A run that publishes no controls row is a refused run \u2014 controls.json is produced, required, and exactly four rows",
      "test_tier": "integration",
      "verification_service": "local repro + node --test (no dispatch)",
      "verify": "node --test tests/sprint-01/t11-controls-wiring.test.mjs --test-name-pattern controls-producer",
      "test_file": "tests/sprint-01/t11-controls-wiring.test.mjs",
      "test_function": "controls-producer",
      "positive_example": "assembleResult({ ..., controls: [] }) throws RecorderRefusal(\"controls-missing\"); controls sits in the schema's required list with minItems 4 / maxItems 4; the producer step's writeControls read-back is ok with T11's four rows \u2014 the repro prints F-T11-1 dead with controls_in_schema_required = true and assemble_result_refusal = {\"reason\":\"controls-missing\"}, exit 0.",
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "scenario": {
        "tier": "e2e-automated",
        "negative_control": {
          "would_fail_if": [
            "an empty controls array is accepted by assembleResult, or the schema leaves controls optional \u2014 the repro prints F-T11-1 ALIVE and exits 1",
            "controls is required but the workflow still produces no controls.json (a stub controls producer), so the gate's jq prints zero rows while the artifact validates",
            "a stub producer writes three or five rows \u2014 assertControlRows refuses a set that is not exactly the four controls",
            "main() fills a missing controls.json with a hardcoded unobserved default instead of refusing with controls-missing"
          ]
        },
        "evidence": {
          "forms": [
            "repro F-T11-1 report: controls_in_schema_required, controls_min_items, empty_controls_accepted_rows, assemble_result_refusal",
            "schema required list and controls minItems/maxItems",
            "producer step output and cells/controls.json read-back"
          ],
          "examples": [
            "F-T11-1 dead",
            "controls_in_schema_required = true",
            "controls_min_items = 4",
            "assemble_result_refusal = {\"reason\":\"controls-missing\"}"
          ],
          "required_capture": ".tmp/sprint-01-verification/t11-fix.repro.red.log (base head, both ALIVE) and .tmp/sprint-01-verification/t11-fix.repro.green.log (both dead, exit 0)"
        },
        "cases": [
          {
            "start_ref": "seed/t11-controls-wiring-repro",
            "action": {
              "actor": "runner",
              "steps": [
                "node --test tests/sprint-01/t11-controls-wiring.test.mjs --test-name-pattern controls-producer"
              ]
            },
            "end_state": {
              "must_observe": [
                "exit 0",
                "F-T11-1 dead",
                "controls_in_schema_required == true with the literal \"controls\" in the schema's required array",
                "controls_min_items = 4",
                "assemble_result_refusal.reason == \"controls-missing\""
              ],
              "must_not_observe": [
                "F-T11-1 ALIVE",
                "an empty controls array accepted by assembleResult",
                "any hosted claim from this local gate"
              ]
            }
          },
          {
            "start_ref": "seed/controls-roundtrip",
            "action": {
              "actor": "runner",
              "steps": [
                "qualifyControls({ observations }) -> assertControlRows -> writeControls into a scratch dir",
                "readCellArtifacts over a cells dir holding that controls.json"
              ]
            },
            "end_state": {
              "must_observe": [
                "writeControls returns ok: true with four rows in T11's order",
                "readCellArtifacts returns controls.length === 4"
              ],
              "must_not_observe": [
                "a written array that is not exactly the four control ids",
                "a controls.json that does not read back row-for-row",
                "an empty controls.json (0 rows) written by writeControls"
              ]
            }
          }
        ],
        "topology_note": "T11's controls module writes controls.json as a step of the download job, after the cells are fetched and before they are handed on; readCellArtifacts routes cells/controls.json into artifacts.controls; assembleResult requires it and the schema requires exactly four rows; main() refuses a cells dir with none",
        "test_tier": "e2e"
      },
      "red_input": "on base main nothing writes controls.json, controls is absent from the schema's required fields, and assembleResult({ ..., controls: [] }) is accepted (empty_controls_accepted_rows = 0, assemble_result_refusal = null), so the repro prints F-T11-1 ALIVE and exits 1",
      "red_proof": ".tmp/sprint-01-verification/t11-controls-wiring.repro.log",
      "description": "GIVEN the base tree at 7e08e1a and the repro .tmp/sprint-01-verification/t11-controls-wiring.repro.mjs that the owned test encodes WHEN node --test tests/sprint-01/t11-controls-wiring.test.mjs --test-name-pattern controls-producer THEN exit 0 with F-T11-1 dead; controls_in_schema_required === true; controls_min_items === 4; assemble_result_refusal.reason === \"controls-missing\"; the workflow's producer writes cells/controls.json before the cells artifact is uploaded and main() refuses a cells dir that carries none",
      "maps_to_ac": null
    },
    {
      "id": "AC-2",
      "type": "acceptance_criterion",
      "primary": false,
      "flow_ref": null,
      "title": "The cells dir carries only cell records \u2014 a stray artifact no longer kills the run",
      "test_tier": "integration",
      "verification_service": "local repro + node --test (no dispatch)",
      "verify": "node --test tests/sprint-01/t11-controls-wiring.test.mjs --test-name-pattern controls-classification",
      "test_file": "tests/sprint-01/t11-controls-wiring.test.mjs",
      "test_function": "controls-classification",
      "positive_example": "readCellArtifacts over the repro's real layout returns 12 cells with refusal === null \u2014 binding.json, keyless-control.json and evidence/*.capture.json land in controlEvidence and never enter collectCells \u2014 while a record that is neither a cell nor a named form raises cell-unclassified naming the file. The repro prints F-T11-2 dead with cells_classified = 12 and recorder_refusal = null, exit 0.",
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "scenario": {
        "tier": "e2e-automated",
        "negative_control": {
          "would_fail_if": [
            "an unchanged walk still classifies every *.json as a cell record \u2014 15 cells and a cell-track-unknown refusal, repro prints F-T11-2 ALIVE",
            "the walk silently omits an unrecognised *.json, so a malformed cell becomes an omission instead of a named refusal",
            "a per-cell keyless-control.json row is merged into the four controls, so the real four-row artifact stays empty and is impersonated",
            "the smoke upload path stays unchanged at cell/, so a future run ships strays again"
          ]
        },
        "evidence": {
          "forms": [
            "repro F-T11-2 report: cells_classified, expected_cells, strays_classified_as_cells, recorder_refusal",
            "readCellArtifacts return value over the repro layout",
            "smoke job upload path"
          ],
          "examples": [
            "F-T11-2 dead",
            "cells_classified = 12",
            "expected_cells = 12",
            "recorder_refusal = null"
          ],
          "required_capture": ".tmp/sprint-01-verification/t11-fix.repro.red.log (cells_classified = 15, refusal present) and .tmp/sprint-01-verification/t11-fix.repro.green.log (cells_classified = 12, refusal null)"
        },
        "cases": [
          {
            "start_ref": "seed/cells-with-strays",
            "action": {
              "actor": "runner",
              "steps": [
                "node --test tests/sprint-01/t11-controls-wiring.test.mjs --test-name-pattern controls-classification"
              ]
            },
            "end_state": {
              "must_observe": [
                "exit 0",
                "F-T11-2 dead",
                "cells_classified = 12",
                "cells_classified = 12 and recorder_refusal == null"
              ],
              "must_not_observe": [
                "F-T11-2 ALIVE",
                "a stray classified as a cell record",
                "an unclassifiable record dropped with 0 named refusals"
              ]
            }
          },
          {
            "start_ref": "seed/base-workflow-7e08e1a",
            "action": {
              "actor": "runner",
              "steps": [
                "read the smoke job's upload step path"
              ]
            },
            "end_state": {
              "must_observe": [
                "path: cell/cell.json",
                "`cells/controls.json` carries the four rows before the `harness-eval-cells-<run>-<attempt>` upload, so readCellArtifacts returns controls.length == 4"
              ],
              "must_not_observe": [
                "path: cell/",
                "a stray capture or binding shipped inside harness-eval-cell-*",
                "an empty cells/ after download: 0 cell records and strays only"
              ]
            }
          }
        ],
        "topology_note": "the smoke job uploads exactly cell/cell.json; readCellArtifacts classifies a *.json as a cell only when it carries string harness and track, routes controls.json into controls and the three named control-evidence forms into controlEvidence, and refuses anything else by name; collectCells is unchanged",
        "test_tier": "e2e"
      },
      "red_input": "on base main readCellArtifacts classifies 15 records as cells \u2014 the 12 real cells plus binding.json, evidence/claude-code-verify.capture.json and keyless-control.json \u2014 and collectCells refuses with cell-track-unknown, so the grade job publishes no result artifact; the repro prints F-T11-2 ALIVE and exits 1",
      "red_proof": ".tmp/sprint-01-verification/t11-controls-wiring.repro.log",
      "description": "GIVEN the base tree at 7e08e1a and the repro's buildDownloadedCells() mirroring what the download job assembles WHEN node --test tests/sprint-01/t11-controls-wiring.test.mjs --test-name-pattern controls-classification THEN exit 0 with F-T11-2 dead; cells_classified === 12; expected_cells === 12; recorder_refusal === null; and an unclassifiable record still stops the run by name",
      "maps_to_ac": null
    },
    {
      "id": "TC-1",
      "type": "test_criterion",
      "primary": false,
      "description": "assembleResult refuses an explicitly empty controls array with controls-missing, and the result schema cannot validate an empty one",
      "verify": "node --test tests/sprint-01/t11-controls-wiring.test.mjs --test-name-pattern controls-refusal",
      "maps_to_ac": "AC-1",
      "test_file": "tests/sprint-01/t11-controls-wiring.test.mjs",
      "test_function": "controls-refusal",
      "test_tier": "integration",
      "verification_service": "local repro + node --test (no dispatch)",
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "scenario": {
        "tier": "e2e-automated",
        "negative_control": {
          "would_fail_if": [
            "assembleResult keeps its = [] default (a static empty array), or controls stays optional in the schema",
            "the schema gains minItems but assembleResult still accepts an explicitly empty array",
            "the refusal is raised only in main(), so the repro's direct assembleResult call still returns an empty 0-row array"
          ]
        },
        "evidence": {
          "forms": [
            "repro F-T11-1 report",
            "the RecorderRefusal reason and details"
          ],
          "examples": [
            "controls_in_schema_required = true",
            "controls_min_items = 4",
            "assemble_result_refusal = {\"reason\":\"controls-missing\"}"
          ],
          "required_capture": ".tmp/sprint-01-verification/t11-fix.repro.green.log"
        },
        "cases": [
          {
            "start_ref": "seed/t11-controls-wiring-repro",
            "action": {
              "actor": "runner",
              "steps": [
                "assembleResult({ cells, pins, context, timestamps, controls: [] })"
              ]
            },
            "end_state": {
              "must_observe": [
                "assembleResult throws RecorderRefusal with reason == \"controls-missing\"",
                "the schema's required array contains the literal \"controls\" and validateResult returns ok: true for the 4-row record",
                "controls minItems 4 and maxItems 4"
              ],
              "must_not_observe": [
                "a returned result whose .controls is an empty array",
                "an empty array that passes validateResult"
              ]
            }
          }
        ],
        "topology_note": "assembleResult is the only writer of the result record; validateResult runs the shipped schema over it, so the refusal and the required field are two independent locks",
        "test_tier": "e2e"
      },
      "flow_ref": null,
      "red_input": "assembleResult({ ..., controls: [] }) returns a record with zero controls rows and validateResult accepts it \u2014 the gate's jq then prints nothing",
      "positive_example": "assembleResult({ ..., controls: [] }) throws RecorderRefusal(\"controls-missing\") and the schema's required list plus minItems 4 makes an empty array unvalidatable"
    },
    {
      "id": "TC-2",
      "type": "test_criterion",
      "primary": false,
      "description": "A cells dir that also carries binding.json, keyless-control.json and evidence/*.capture.json yields exactly 12 cells and no refusal, while an unclassifiable record is refused by name",
      "verify": "node --test tests/sprint-01/t11-controls-wiring.test.mjs --test-name-pattern controls-evidence-bucket",
      "maps_to_ac": "AC-2",
      "test_file": "tests/sprint-01/t11-controls-wiring.test.mjs",
      "test_function": "controls-evidence-bucket",
      "test_tier": "integration",
      "verification_service": "local repro + node --test (no dispatch)",
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "scenario": {
        "tier": "e2e-automated",
        "negative_control": {
          "would_fail_if": [
            "an unchanged walk still classifies any *.json as a cell (15 cells, cell-track-unknown)",
            "an unrecognised *.json is omitted silently instead of refused by name",
            "a control-evidence row is merged into artifacts.controls so the real four-row artifact stays empty and is impersonated",
            "a stub collectCells tolerates an unknown harness or track"
          ]
        },
        "evidence": {
          "forms": [
            "repro F-T11-2 report",
            "readCellArtifacts return value over the repro layout"
          ],
          "examples": [
            "cells_classified = 12",
            "expected_cells = 12",
            "recorder_refusal = null",
            "strays_classified_as_cells lists the three named forms, none of them entered as cells"
          ],
          "required_capture": ".tmp/sprint-01-verification/t11-fix.repro.green.log"
        },
        "cases": [
          {
            "start_ref": "seed/cells-with-strays",
            "action": {
              "actor": "runner",
              "steps": [
                "readCellArtifacts(root) over the repro's downloaded layout",
                "collectCells(artifacts.cells, { pins, installMode: \"checkout\" })"
              ]
            },
            "end_state": {
              "must_observe": [
                "artifacts.cells.length === 12",
                "collectCells returns 12 cells with refusal == null",
                "controlEvidence carries 3 entries: \"binding.json\", \"keyless-control.json\" and \"evidence/claude-code-verify.capture.json\""
              ],
              "must_not_observe": [
                "any stray record inside artifacts.cells",
                "an unclassifiable record dropped with 0 named refusals"
              ]
            }
          }
        ],
        "topology_note": "actions/download-artifact with pattern: + merge-multiple: false writes one subdir per artifact; readCellArtifacts classifies by record content, so the artifact layout and the record shape are checked separately",
        "test_tier": "e2e"
      },
      "flow_ref": null,
      "red_input": "the same layout yields 15 records classified as cells and a cell-track-unknown refusal, so no result artifact is published",
      "positive_example": "the same layout yields 12 cells, zero strays inside artifacts.cells and refusal === null, while an unknown record raises cell-unclassified naming the file"
    },
    {
      "id": "TC-3",
      "type": "test_criterion",
      "primary": false,
      "description": "FLOW-GRD-03-FILES-AND-STREAM and FLOW-GRD-06-MISSING-KEY stay green, and the whole sprint-01 lane stays green \u2014 no out-of-scope caller of assembleResult broke",
      "verify": "node --test tests/sprint-01/t11-controls-wiring.test.mjs --test-name-pattern controls-back-compat",
      "maps_to_ac": "AC-1",
      "test_file": "tests/sprint-01/t11-controls-wiring.test.mjs",
      "test_function": "controls-back-compat",
      "test_tier": "integration",
      "verification_service": "node --test over the sprint-01 lane (no dispatch)",
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "scenario": {
        "tier": "e2e-automated",
        "negative_control": {
          "would_fail_if": [
            "assembleResult throws for a caller that passes no controls argument because the ?? default was removed \u2014 grd-01-twelve-cells and run-02-hand call it that way and are outside this task's write scope",
            "a hardcoded minItems 4 makes a pre-existing 3-row test record unvalidatable",
            "a recorder walk change disconnects the two flow replays from the 12-cell fixture they seed",
            "the lane is made green by an assertion omitted from grd-01-twelve-cells.test.mjs or run-02-hand.test.mjs instead of by fixing assembleResult"
          ]
        },
        "evidence": {
          "forms": [
            "TAP output of the two --test-name-pattern replays",
            "whole-lane pass/fail counts",
            "git diff --name-only over tests/sprint-01/"
          ],
          "examples": [
            "FLOW-GRD-03-FILES-AND-STREAM ok",
            "FLOW-GRD-06-MISSING-KEY ok",
            "pass 98, fail 0",
            "grd-01-twelve-cells.test.mjs and run-02-hand.test.mjs absent from the diff"
          ],
          "required_capture": ".tmp/sprint-01-verification/t11-fix.repro.green.log"
        },
        "cases": [
          {
            "start_ref": "seed/base-workflow-7e08e1a",
            "action": {
              "actor": "runner",
              "steps": [
                "node --test tests/sprint-01/grd-03-evidence.test.mjs --test-name-pattern FLOW-GRD-03-FILES-AND-STREAM",
                "node --test tests/sprint-01/grd-06-missing-key.test.mjs --test-name-pattern FLOW-GRD-06-MISSING-KEY",
                "node --test tests/sprint-01/*.test.mjs"
              ]
            },
            "end_state": {
              "must_observe": [
                "grd-03 TAP: 1 pass 0 fail; grd-06 TAP: 1 pass 0 fail",
                "the lane reports fail 0",
                "git diff --name-only prints 0 paths outside the 9-entry write_allowed list"
              ],
              "must_not_observe": [
                "any touch of tests/sprint-01/grd-01-twelve-cells.test.mjs or tests/sprint-01/run-02-hand.test.mjs",
                "a relaxed assertion used to buy green",
                "a lane run that reports 0 tests executed"
              ]
            }
          }
        ],
        "topology_note": "the recorder is shared: T8's grd-01-twelve-cells and run-02-hand drive assembleResult directly with no controls argument, so Patch 2's default is what keeps the lane green without editing them",
        "test_tier": "e2e"
      },
      "flow_ref": "FLOW-GRD-03-FILES-AND-STREAM",
      "red_input": "an assembleResult that throws whenever controls is absent fails grd-01-twelve-cells.test.mjs:640 and run-02-hand.test.mjs:526,552 \u2014 two files this task may not edit",
      "positive_example": "both flow replays and the whole lane stay green with no edit to grd-01-twelve-cells.test.mjs or run-02-hand.test.mjs, because a silent caller receives the four unobserved rows"
    }
  ]
}
-->

## Handoff

```json
{
  "task": "T11-FIX2",
  "commit_sha": "63503ce81e70004b0a8a2a1fb73900fcd93c6f2d",
  "done": "Fixed the blocking defect (F-T11-FIX2-1) for real: in `jobs.download` of `.github/workflows/harness-eval.yml` the `actions/checkout@v4` + `actions/setup-node@v4` pair now runs ABOVE `Fetch every cell from this attempt`, so the workspace is reset and cloned before the twelve cell artifacts are written into `cells/` and the producer appends `controls.json` beside them instead of into an emptied directory. The producer, the `controls.json` it writes, and the `harness-eval-cells-*` handoff are otherwise unchanged, and `clean: false` was not attempted. The ordering is now pinned by the owned test, which asserts `jobs.download`'s checkout index is lower than its download-artifact index next to the existing producer-before-upload assertion. I also closed the advisory (F-T11-FIX2-2): the `main()` leg now asserts the refusal's IDENTITY rather than only its exit code — the step summary must name `controls-missing`, must carry the cells dir only main()'s guard reports, and must carry that guard's own `why` text, and a counting fetch stub proves the guard refuses before the Actions API is touched. Both pins were verified by mutation: restoring the cycle-1 step order fails `controls-producer`, and deleting `main()`'s guard (the reviewer's exact mutation, which previously left the file green) now fails it on the identity assertion. Cycle-2 evidence is captured at the new candidate under `implementer-cycle-2/green/`, with `red` still pointing at the cycle-1 capture because the base has not moved. The sprint-01 lane is 98 pass / 0 fail, `pnpm validate` passes, T11's untouched repro prints `F-T11-1 dead` / `F-T11-2 dead` with exit 0, and all four publication gates still pass with flow-coverage introducing zero findings.",
  "deviations": [
    "The F-T11-FIX2-2 pin asserts the refusal identity through the step summary's `dir` value and main()'s own `why` text, and additionally asserts `apiCalls === 0`. The reviewer's suggested form was to require the summary to contain 'controls-missing'; that alone does not survive the mutation the finding is about, so the assertion is stronger than suggested rather than different in kind.",
    "The cycle-2 evidence directory also carries two mutation-probe logs (`mutation-F-T11-FIX2-1-…`, `mutation-F-T11-FIX2-2-…`) beyond the per-requirement green logs, so a reviewer can re-run the exact probes that prove both pins bite. They are evidence only; nothing under evidence is committed.",
    "One commit only, touching exactly the two files the reviewer's remediation named; the task file and its contract are byte-identical to cycle 1."
  ],
  "concerns": [
    "The fix is proven by declaration-level assertion plus a local model of the artefact layout; nothing in this task can execute `actions/checkout@v4` to demonstrate the workspace reset first-hand. The ordering is now correct per checkout's documented behaviour and is pinned against regression, but the only end-to-end confirmation remains a real dispatch (SPRINT step 11), which is out of this task's scope.",
    "The `download` job still checks out the full dispatch commit and runs Node in what used to be a pure artefact-transfer job. That is now ordered correctly, but it means the job cannot be reasoned about from the workflow alone — the producer's behaviour depends on the checked-out tree.",
    "The refusal-identity assertion matches on main()'s `why` sentence ('every run executes the four negative controls'). If someone legitimately rewords that message the test fails on wording rather than on behaviour; the more durable half of the same assertion is the cells-dir match plus `apiCalls === 0`.",
    "`tests/sprint-01/grd-01-twelve-cells.test.mjs:824` still exercises its 'throw after the write' leg through the `controls-missing` refusal rather than a post-write throw, as I flagged last cycle; that leg remains weaker than its comment claims and is outside this task's write scope.",
    "The producer still writes four `could-not-run` / `control-unobservable` rows on every run until something exports `HARNESS_EVAL_CONTROL_OBSERVATIONS`; a hosted dispatch now produces the receipt, but it is an honest 'we observed nothing' receipt rather than a discrimination proof."
  ],
  "findings": [
    "F-T11-FIX2-1 is a real, run-killing ordering hazard that no local gate could see: `actions/checkout@v4` clears `$GITHUB_WORKSPACE` (removes the directory contents when `.git` is absent, `git clean -ffdx` when present), so any step that fetches artefacts before a checkout in the same job silently loses them. The plan's Patch 1 described adding checkout + setup-node to a job whose first step was a download-artifact step and never mentioned the interaction.",
    "F-T11-FIX2-2's mutation is now closed at the reason level: deleting main()'s `controls-missing` guard fails `controls-producer` with 'the refusal must name the cells dir it read …', whereas before this cycle the same deletion left the file at 5/5 green.",
    "The task file's Patch 1 remains incomplete about step ordering (checkout must precede the cells download, not merely precede the producer). A future implementer reading only Patch 1 can reproduce exactly this defect; the workflow comment and the test now carry the constraint, but the charter does not.",
    "The reviewer's cycle-1 evidence (`reviewer-cycle-1-r0/`) already contained a standalone `checkout-ordering-probe.mjs` and a `mut-AC-1-main-guard-removed.log`; both reproduce cleanly against this candidate and agree with the findings, so the two reports converge rather than conflict.",
    "`git diff --name-only HEAD~1 HEAD` at this candidate lists exactly `.github/workflows/harness-eval.yml` and `tests/sprint-01/t11-controls-wiring.test.mjs`, both inside the task's `write_allowed`; the working tree is clean at `63503ce`."
  ],
  "scope_impact": [],
  "feedback": [
    "Patch 1 of a workflow task should state the full step ORDER, not just where a new step goes: 'checkout, then setup-node, then download artifacts, then produce, then upload' would have prevented this cycle entirely.",
    "Any task that adds `actions/checkout@v4` to a job with `actions/download-artifact` should carry an explicit note that checkout resets the workspace, because the failure mode is invisible to every local test — it only appears on a dispatched run.",
    "When a review asks for 'assert the refusal identity', name the discriminator, not just the reason string: two different guards in this codebase raise `controls-missing`, so the reason alone cannot distinguish them. The `dir`/`why` pair plus a call count is what actually pins the guard.",
    "The charter's Evidence Gates should include the mutation that proves each new assertion bites. Both findings in this cycle were reproducible by deletion or reordering, and a one-line 'delete X, the gate must fail' row per assertion would have caught F-T11-FIX2-2 before the first review.",
    "The remediation brief's `red` convention (keep pointing at the cycle that first captured RED while the base is unchanged) is sound and should be stated in the task file's Agent Instructions, so an implementer does not re-capture a meaningless RED at an implemented tree."
  ]
}
```
