# TASK-T13 — Make the smoke matrix observe and export what it grades

> Task ID: T13
> Sprint: [SPRINT.md](./SPRINT.md)
> Status: ✅ Completed

Commit: 45142ee711db83891a1b559e057fe699de79ba63
> Assignee: evals-implementer
> Priority: P1
> Points: 8
> Type: FIX
> Planner: evals-planner
> Proposed By: evals-planner
> TDD_MODE: red_first · RED_GREEN_REQUIRED: true

AGENT: planner=evals-planner | implementer=evals-implementer | reviewer=evals-reviewer

**Depends on:** T5 (claude-code-cells@v1 — `installPlan`/`executeLoad`/`runCheck`/`cellFor` are the only path that produces a graded claude-code cell), T7 (grader@v1 — the four-check assembly and the verify-report reader decide every verdict), T8 (recorder@v1 — the cell record shape the twelve-cell grid accepts and the exit rule it feeds), T9 (env-wiring@v1 — the five keyed `Smoke model step` steps this task runs the graded invocations inside)
**Blocks:** T11 (its hosted acceptance reads graded cells), T12 (reviews graded output), human-testing-gate steps 5–13

## Background

- **Source:** `PLAN-AMENDMENT-2026-10-30-smoke-observations.json` (owner-authorized, item `amendment:T13`) and hosted run **41086556471** on candidate `0ff55750adc7cc5e042257fccc5070f94a595788`, pins `aed5c0c03c0ced2f879b67703163ed94191cff662cc07768b01d1833d3c9d411`.
- **What the run proved:** the plumbing works — it dispatched, the twelve-cell matrix ran, the result and verify-reports artifacts published, `.controls[]` held four rows, and the recorder refused honestly (`Exit: 1 (could-not-run)`). The framework runs and refuses; it never observes.
- **What it did not:** all twelve cells read `verdict: could-not-run`, `reason: smoke-not-implemented`, `installation.observed_cli_version: null`, four `could-not-run` checks; all four controls read `could-not-run` / `control-unobservable`; the verify-reports index reads `"reports": []`.
- **Seam 1 — no graded evidence reaches the cell.** `smoke`'s `Record the cell` step writes a constant bare record (`harness-eval.yml:250-259`) that `bareCell()` (`test/harness/recorder/validate.mjs:51-101`) can only turn into `could-not-run`, so no check ever cites a file or a stream offset and gate step 6 can never print four `pass`. Nothing in the job calls `runCheck`, `gradeCheck` or `cellFor`.
- **Seam 2 — the control observation never leaves the smoke job.** The keyless control step *does* observe `could-not-run` / `missing-api-key` with zero model requests and no child (`harness-eval.yml:207-248`), writes `cell/keyless-control.json`, and T11-FIX2 Patch 4 narrowed the upload to `cell/cell.json`, so the file is excluded. `harness-eval.yml:334-345` reads `HARNESS_EVAL_CONTROL_OBSERVATIONS`; nothing anywhere sets it, so every run writes four `control-unobservable` rows.
- **Gate steps:** 5, 6, 7, 9, 10, 11, 12 (and 13 through them). **Capability:** CAP-EVAL-01. **PRD:** `09-technical-requirements/03-data-schema.md` § HarnessCell/HarnessGrade, § InstallationIdentity, § Negative controls; `02-system-components.md` § smoke matrix, § stream-grader, § grade recorder; `04-uc-grd.md` UC-GRD-01..06; `07-uc-run.md` UC-RUN-02.
- **Why it matters:** the Done statement requires twelve cells in which **both** claude-code cells carry four verdicts graded from files-and-event-stream evidence and bound to observed CLI versions and loaded-plugin manifest digests, plus a `controls` array recording the stale-cache, exit0-denied-read, missing-key and hidden-image-judge outcomes. No re-dispatch reaches that while the matrix writes a constant, and every task that reads a graded cell — T11's hosted acceptance, T12's review, gate steps 5–13 — is blocked behind this seam.
- **Current (consumed):** T5's `installPlan`, `executeLoad`, `invocationTable`, `prepareRunDirs`, `runCheck`, `cellFor`, `approveIdentity`, `manifestDigest`; T7's `gradeCheck`/`gradeFromEvidence` and the four-check aggregate; T8's `toHarnessCell`; T9's five keyed model steps and the keyless control step.
- **Desired (provided):** each leg writes a `cell/cell.json` that is **graded** when anything can be graded and a **named** `could-not-run` cell when it cannot; the claude-code legs measure the identity and grade four checks from captured bytes; the four observations travel with the cells into `HARNESS_EVAL_CONTROL_OBSERVATIONS`, and a control nobody observed stays `could-not-run` / `control-unobservable`.
- **Boundary contracts (read before editing):** T11's four control ids, their verdict/reason vocabulary, `assertControlRows`' exactly-four rule, the `controls-missing`/`controls-invalid` refusals and the checkout-before-download ordering are untouched. `cell/cell.json` stays the smoke job's **only** upload path (`tests/sprint-01/t11-controls-wiring.test.mjs:296-302`). The workflow keeps exactly four jobs `[download, drift, grade, smoke]` (`tests/sprint-01/run-02-hand.test.mjs:169`); the record step keeps the literal anchor `- name: Record the cell` immediately followed by `run: |` (`:233`); the keyless control step keeps its name and in-step absence assertions (`tests/sprint-01/grd-06-missing-key.test.mjs:596-612`); each `Smoke model step` keeps exactly one credential binding (`:531-552`).

## Critical Constraints

- MUST write a real `cell/cell.json` per leg: a grade record (carries `verdict`) whenever the cell can be graded, otherwise a bare record with `cell_state: "could-not-run"` and a **named** `reason`. NEVER `smoke-not-implemented`, never an omission, never a `pass` without the evidence a pass requires.
- MUST grade claude-code checks only from captured bytes and files (`source: "files-and-event-stream"`), with the identity **measured**: `observed_cli_version` from the CLI's own report, both manifest digests from the two real payloads, `plugin_load_evidence` from the `system/init` plugin list. A version label, an install exit code or a cache directory name is never identity.
- MUST produce a cell whose aggregate can legally pass: a passing cell carries a non-empty `invocation_id`, an integer `process_exit_code`, at least one resolving `evidence_paths` citation and at least one non-`could-not-run` check (`test/harness/validate.mjs:116-128`). A cell that cannot satisfy that MUST NOT be reported as passing.
- MUST carry the observations into `HARNESS_EVAL_CONTROL_OBSERVATIONS` and MUST leave every control it did not observe at `could-not-run` / `control-unobservable` — never `pass`, never absent, never filled from the definition's expectation.
- MUST NOT add a job, rename the record step, widen the `cell/cell.json` upload, add a secret-bearing step, or add a non-secret key to a `Smoke model step` `env:` block (each stays exactly one binding).
- MUST keep the producer step's run text free of the literal `cell/cell.json` — the recorder resolution in `tests/sprint-01/flow-runner.mjs:475` and `tests/sprint-01/grd-06-missing-key.test.mjs:576` takes the **first** matching step — and MUST tolerate an empty `HARNESS_EVAL_CONTROL_OBSERVATIONS` (`JSON.parse("")` throws today).
- MUST NOT modify any other task's test file, `test/harness/controls/index.mjs`, the result schema, the recorder (`test/harness/recorder.mjs`, `test/harness/recorder/**`), or `plugins/pixel-perfect/**`.

## Specification

- **Objective:** make a dispatched `harness-eval` run observe what it grades, so its result artifact carries graded claude-code cells and control rows that report real observations.
- **Success state:** `node --test tests/sprint-01/t13-smoke-observations.test.mjs` is green with `pass 5`, `fail 0`; `inspectWorkflowDeclaration(parseYaml(readWorkflow().text)).failures` is `[]`; an assembled claude-code cell carries four `files-and-event-stream` checks with resolving citations and a measured identity; a cells dir whose records carry `control_observations` produces rows with the observed verdicts and reasons, while an unobserved control stays `could-not-run` / `control-unobservable`.

### Seam 1 — every leg writes a cell; the claude-code legs write a graded one

`test/harness/smoke/cell.mjs` is the one module a smoke leg calls.

1. `runCell({ harness, track, installMode, env, now })` asks the registry **first**: `cellFor(harness, track, { adapters: new Set(REGISTERED), env, installMode, resolver, manifest })`. A non-null `cell` is written verbatim — the fail-closed path, whose reason is the registry's own string: `cursor` → `missing-api-key`; `codex`/`grok`/`opencode`/`pi` → `<harness>-adapter-not-implemented`.
2. When `cellFor` returns `{ cell: null }` the adapter owns the grade: `executeLoad({ workspace, configDir, installMode })` for the identity and command-list capture, then `prepareRunDirs` + `invocationTable` + `runCheck` for the five invocations, then `cellFor({ track, cells: results.map((result) => result.cell), installation })`. One cell per leg, four checks.
3. Every throwable path returns a cell: `runCell` catches, writes `{ harness, track, cell_state: "could-not-run", reason: error.reason ?? "smoke-cell-failed", detail }` and returns it, so the step body always leaves a `cell/cell.json` and exits 0. The **verdict** reports; the step's exit code never does.
4. `writeCell({ file, cell })` validates against `harness-cell.v1.schema.json`, writes atomically (`*.partial` → rename), reads back and compares `harness`/`track`/`verdict`. A write that does not read back is a refusal, not a file.

Two adapter changes belong to this task, in `test/harness/adapters/claude-code.mjs`: `executeLoad` accepts `installMode` and threads it into `installationIdentity` (today it hardcodes `"checkout"`, and `collectCells` refuses a cell whose `installation.install_mode` disagrees with the run's — `test/harness/recorder/validate.mjs:126-132`); and `cellFor` carries the aggregate's evidence identity from the winning per-check record (`invocation_id`, `check_id`, integer `process_exit_code`), which are both `null` today so a passing aggregate throws `pass-without-evidence` — a graded pass is currently unrepresentable.

### Seam 2 — the observations travel with the cells

`test/harness/smoke/observations.mjs` owns the four producers and the merge. Each returns `{ verdict, reason, evidence }`, or `null` when the run genuinely did not observe the control; `mergeObservations` merges per id (later non-null wins).

| Producer | Observation it reads | Row when observed |
|---|---|---|
| `observeMissingKey({ row })` | the keyless control's own row: verdict, reason, `model_request_count`, `child_ran`, the persisted capture | `could-not-run missing-api-key` |
| `observeStaleCache({ checkoutRoot, staleRoot, mutatedFile })` | `approveIdentity` fed the checkout digest as expected and a stale copy's digest as observed | `could-not-run installation-identity-mismatch` |
| `observeExit0DeniedRead({ record, check })` | a guarded invocation that exited 0 while its stream carries a required denial | `fail denied_tool_call` |
| `observeHiddenImageJudge({ roots })` | `test/harness/smoke/image-scan.mjs` scanning the verify child tree for an `image` content block, an `image/*` media type or a base64 image payload | `pass no-image-judge-in-child-tree`, or `fail image-judge-in-child-tree` |

A leg attaches what it produced to its own cell as `control_observations` — an additive cell field (`harness-cell.v1.schema.json` does not forbid it) — because `cell/cell.json` is the only channel that leaves the smoke job. The producer step then assembles the variable from the cells it already holds:

```js
const observations = { ...mergeObservationsFromCells("cells"), ...parseObservations(process.env.HARNESS_EVAL_CONTROL_OBSERVATIONS) };
const rows = assertControlRows(qualifyControls({ observations }).rows);
```

`parseObservations` tolerates `""` (an unset job output arrives as an empty string). The cell field is **not** a controls artifact: `cells/controls.json` remains the only thing `readCellArtifacts` routes into `artifacts.controls`, so a per-cell observation can never impersonate the four rows.

### Workflow shape — no job added, no pinned anchor moved

| Step (smoke job) | Key | Change |
|---|---|---|
| `Install ${{ matrix.harness }} ${{ matrix.track }}` | keyless | real: resolve the exact version (`createVersionResolver` for `newest`, `pins.json` for `pinned`), `npm install -g @anthropic-ai/claude-code@<version>` with `DISABLE_AUTOUPDATER=1`, then the keyless load for claude-code (`executeLoad` into an isolated `CLAUDE_CONFIG_DIR`) writing `cell/load.json` |
| `Smoke model step <harness> ${{ matrix.track }}` | one secret | keep the binding probe and `cell/binding.json`, then call `runCell`, which writes `cell/cell.json`; on claude-code it also produces `stale-cache`, `exit0-denied-read` and `hidden-image-judge` and attaches them to the cell |
| `Keyless control - a missing credential must refuse` | keyless | unchanged except that it merges its own `missing-key` observation |
| `Record the cell` | keyless | unchanged anchor; writes the fallback `cell/cell.json` **only** when the leg wrote none (`cell_state: "could-not-run"`, reason from `cell/failure.json` or `cell-not-recorded`), and interpolates `${{ inputs.install_mode }}` |
| `Upload this cell even when the smoke step failed` | — | unchanged (`path: cell/cell.json`, `if: always()`, attempt-qualified name) |

`jobs.smoke.timeout-minutes` rises from 25 to 45: the graded claude-code legs run five real invocations and each `verify` is capped at 600 s.

## Acceptance Criteria (GIVEN-WHEN-THEN)

### AC-1: A smoke leg writes a graded cell — four checks from captured bytes, bound to an observed CLI version and a loaded-plugin manifest digest

- **GIVEN:** `seed/verify-pair` (a real keyless oracle pair at the case-declared report paths) and `seed/identity-mismatch`
- **WHEN:** `node --test tests/sprint-01/t13-smoke-observations.test.mjs --test-name-pattern smoke-cell-graded`
- **THEN:** exit 0 and a TAP `ok` line; four check ids in `CHECK_IDS` order each `source: "files-and-event-stream"`; `installation.observed_cli_version` reads `2.1.291`; `observed_plugin_manifest_sha256` is 64 hex characters equal to the expected digest; `invocation_id` non-empty; `process_exit_code` an integer; every cited path resolves; `collectCells` accepts the cell; the mismatched identity short-circuits to `could-not-run` / `installation-identity-mismatch` before any check verdict is read

```text
TEST_TIER:             integration
VERIFICATION_SERVICE:  local: real kit project + real oracle pair + real archived capture, node --test (no dispatch)
SURFACE_POLICY:        .spec/e2e-policy/sprint-01/artifact-only-read.json
TDD_STATE:             red_first
VERIFY:                node --test tests/sprint-01/t13-smoke-observations.test.mjs --test-name-pattern smoke-cell-graded
EXPECT:                exit 0 · TAP `ok` for smoke-cell-graded · fail 0
```

- **RED input (fails on base):** `test/harness/smoke/cell.mjs` does not exist; the leg writes the constant `smoke-not-implemented` record; `executeLoad` hardcodes `install_mode: "checkout"`; `cellFor` sets `invocation_id: null`, so a graded pass throws `pass-without-evidence`. The owned test fails at import.
- **RED proof:** `.tmp/sprint-01-verification/t13-smoke.red.log`
- **positive_example (passes after landing):** `checks[].length === 4`, `checks[0].source === "files-and-event-stream"`, `installation.observed_cli_version === "2.1.291"`, `invocation_id` non-empty, `Number.isInteger(cell.process_exit_code)`, and `assembleResult` validates.

SCENARIO_SUMMARY: complete SCENARIO lives once, in this AC's row of the REQUIREMENT-CONTRACT block below.

### AC-2: The four negative-control observations reach `HARNESS_EVAL_CONTROL_OBSERVATIONS`, and an unobserved control stays `control-unobservable`

- **GIVEN:** `seed/cells-dir-with-observations`, `seed/cells-dir-partial-observations` (the same dir with the hidden-image-judge observation removed) and `seed/denied-write-capture`
- **WHEN:** `node --test tests/sprint-01/t13-smoke-observations.test.mjs --test-name-pattern smoke-control-observations`
- **THEN:** exit 0 and a TAP `ok` line; the rows print `missing-key could-not-run missing-api-key`, `stale-cache could-not-run installation-identity-mismatch`, `exit0-denied-read fail denied_tool_call` and `hidden-image-judge pass no-image-judge-in-child-tree`; in the partial dir the fourth row prints `could-not-run control-unobservable` and the first three are unchanged; `assertControlRows` still refuses a three-row and a five-row set; an empty `HARNESS_EVAL_CONTROL_OBSERVATIONS` parses to `{}`

```text
TEST_TIER:             integration
VERIFICATION_SERVICE:  local: the assembled cells dir + T11's qualifyControls/assertControlRows/writeControls, node --test (no dispatch)
SURFACE_POLICY:        .spec/e2e-policy/sprint-01/artifact-only-read.json
TDD_STATE:             red_first
VERIFY:                node --test tests/sprint-01/t13-smoke-observations.test.mjs --test-name-pattern smoke-control-observations
EXPECT:                exit 0 · TAP `ok` for smoke-control-observations · fail 0
```

- **RED input (fails on base):** no step or job sets `HARNESS_EVAL_CONTROL_OBSERVATIONS` (the string appears in `harness-eval.yml` only at the producer's read, line 341), the keyless row is excluded from the upload, and every run writes four `could-not-run` / `control-unobservable` rows.
- **RED proof:** `.tmp/sprint-01-verification/t13-controls.red.log`
- **positive_example (passes after landing):** the four rows print the observed verdict/reason pairs, the partial dir leaves `hidden-image-judge could-not-run control-unobservable`, and `writeControls` reads back four rows.

SCENARIO_SUMMARY: complete SCENARIO lives once, in this AC's row of the REQUIREMENT-CONTRACT block below.

### AC-3: Fail-closed is preserved — a cell that cannot run reports `could-not-run` with a named reason, all twelve cells exist, nothing passes unevidenced

- **GIVEN:** `seed/keyset` — every credential variable absent; `ANTHROPIC_API_KEY` set to a placeholder that authenticates nothing; and one deliberately broken leg
- **WHEN:** `node --test tests/sprint-01/t13-smoke-observations.test.mjs --test-name-pattern smoke-cell-fail-closed`
- **THEN:** exit 0 and a TAP `ok` line; claude-code keyless reads `could-not-run` / `missing-api-key`; codex, grok, opencode and pi read `could-not-run` / `<harness>-adapter-not-implemented`; the broken leg reads `smoke-cell-failed`; the twelve records validate and `recorderExit` reports `could-not-run`; no cell reads `smoke-not-implemented` and no cell passes without evidence

```text
TEST_TIER:             integration
VERIFICATION_SERVICE:  local: the real registry, guard and recorder over three env shapes, node --test (no dispatch)
SURFACE_POLICY:        .spec/e2e-policy/sprint-01/artifact-only-read.json
TDD_STATE:             red_first
VERIFY:                node --test tests/sprint-01/t13-smoke-observations.test.mjs --test-name-pattern smoke-cell-fail-closed
EXPECT:                exit 0 · TAP `ok` for smoke-cell-fail-closed · fail 0
```

- **RED input (fails on base):** the only outcome a leg can write is the constant bare record `smoke-not-implemented`, so no code path distinguishes a missing credential from an absent adapter from a crash; the owned test fails at import.
- **RED proof:** `.tmp/sprint-01-verification/t13-smoke.red.log`
- **positive_example (passes after landing):** three env shapes produce three distinct named reasons, all twelve cells assemble, and `recorderExit({cells}).reason === "could-not-run"`.

SCENARIO_SUMMARY: complete SCENARIO lives once, in this AC's row of the REQUIREMENT-CONTRACT block below.

## Guardrails

WRITE-ALLOWED:

- .github/workflows/harness-eval.yml
- test/harness/smoke/cell.mjs
- test/harness/smoke/observations.mjs
- test/harness/smoke/image-scan.mjs
- test/harness/smoke/**
- test/harness/adapters/claude-code.mjs
- tests/sprint-01/t13-smoke-observations.test.mjs
- .spec/prds/harness-eval-framework/tasks/sprint-01-evaluator-evidence-spine/TASK-T13.md
- .spec/prds/harness-eval-framework/tasks/sprint-01-evaluator-evidence-spine/TASK-T13.contract.json

WRITE-PROHIBITED:

- plugins/pixel-perfect/**
- Any file not listed in write_allowed

## Evidence Gates

- **AC-1:** `node --test tests/sprint-01/t13-smoke-observations.test.mjs --test-name-pattern smoke-cell-graded`. Expected: exit 0, TAP `ok`, `fail 0`.
- **AC-2:** `node --test tests/sprint-01/t13-smoke-observations.test.mjs --test-name-pattern smoke-control-observations`. Expected: exit 0, TAP `ok`, `fail 0`.
- **AC-3:** `node --test tests/sprint-01/t13-smoke-observations.test.mjs --test-name-pattern smoke-cell-fail-closed`. Expected: exit 0, TAP `ok`, `fail 0`.
- **TC-1:** `node --test tests/sprint-01/t13-smoke-observations.test.mjs --test-name-pattern smoke-workflow-wiring`. Expected: exit 0, `declaration.failures.length === 0`.
- **TC-2:** `node --test tests/sprint-01/t13-smoke-observations.test.mjs --test-name-pattern smoke-image-scan`. Expected: exit 0 — `pass` on the archived capture, `fail` on the planted copy, `null` on an unreadable tree.
- **Owned test file:** `node --test tests/sprint-01/t13-smoke-observations.test.mjs`. Expected: `pass 5`, `fail 0`.
- **regression (three locked files):** `node --test tests/sprint-01/run-02-hand.test.mjs tests/sprint-01/grd-06-missing-key.test.mjs tests/sprint-01/t11-controls-wiring.test.mjs`. Expected: `fail 0`.

## Review Criteria

Must pass:

- The owned test is committed and reports `pass 5`, `fail 0`, each test asserting its row's THEN.
- Every claude-code check verdict cites `files-and-event-stream` evidence that resolves at assembly time; no verdict is read from an exit code.
- The identity is measured (observed version from the CLI's report, both digests from real payload bytes, load evidence from `system/init`), and `executeLoad` threads the run's install mode.
- The four observations come from the smoke legs' own measurements; a control nobody observed reads `could-not-run` / `control-unobservable`.
- `cell/cell.json` is still the only smoke upload path; the record anchor, the four-job list, the five single-binding model steps and the keyless control step's name are unchanged; the three locked test files are untouched and green.
- `git diff --name-only` lists only WRITE-ALLOWED paths.

Should verify: a keyless leg still exits 0 with `cell/cell.json` on disk; `parseObservations("")` returns `{}`; the producer's run text has no literal `cell/cell.json`; `jobs.smoke.timeout-minutes` is 45; no secret value appears in any cell, observation, capture or log.

Verdict: APPROVED or NEEDS_FIXES, with file and line for each finding.

## Dependencies

- **Depends on:** T5 (claude-code-cells@v1), T7 (grader@v1), T8 (recorder@v1), T9 (env-wiring@v1)
- **Blocks:** T11 (its hosted acceptance reads graded cells), T12 (reviews graded output)

A shared file is not a dependency, and needing another task's output to test against is that flow's integration obligation, not an edge. T1 owns the workflow file this task edits, but the file is shared, not a producer: T1's declaration rules are enforced by `inspectWorkflowDeclaration` at TC-1. T11 and T12 are deliberately **not** edges — T11 cannot land while its hosted acceptance is unobservable, and this task must be dispatchable now.

## Out of Scope

- Implementing the adapter, the guard or the graders (T5, T3, T7 own them; this task calls them).
- Transporting the verify reports into `harness-eval-verify-reports-<run>-<attempt>` (gate step 8). The smoke job admits exactly one upload path — `cell/cell.json`, pinned by `tests/sprint-01/t11-controls-wiring.test.mjs:296-302` — and the grade job's `pattern: harness-eval-verify-*` download matches nothing today. The cell carries each report's path in `report_paths` and in the verify check's citations; making the reports travel needs its own task, because it must reconcile the per-artifact bundling pinned by `tests/sprint-01/grd-01-twelve-cells.test.mjs:771-777` with the gate's flat path.
- Changing the four control ids, their verdict/reason vocabulary, `assertControlRows`' exactly-four rule, the `controls-missing`/`controls-invalid` refusals, or the result schema; dispatching the workflow; deciding a control's release effect.

## Notes

- **Flow ownership:** this task owns no locked flow. It is the producer the locked flows read: `FLOW-GRD-01-TWELVE-CELLS`, `FLOW-GRD-02-FOUR-GRADES`, `FLOW-GRD-06-MISSING-KEY` and `FLOW-RUN-02-HAND` keep every assertion; gate steps 5–13 become reachable for the first time.
- **Why the observations ride on the cell and not in a job output.** A matrix job's outputs merge last-writer-wins and two claude-code legs produce overlapping control ids, so a leg that produced nothing could clobber the leg that did. The cells artifact already carries one record per leg into `download`, so attaching the observation to the record it came from is deterministic and needs no new artifact, no job output and no widened upload path.
- **Why the graded run lives in the model step.** `inspectWorkflowDeclaration` allows a credential only on the recorder step or on a step named `Smoke model step …`, and `grd-06` pins that the recorder step binds none — so the graded invocations run where the key already is and the record step stays keyless.
- **The record step keeps its exact shape.** `tests/sprint-01/run-02-hand.test.mjs:233` mutates the literal `- name: Record the cell` line followed by `run: |`, and asserts the mutation applied. An `id:` or `if: always()` between those two lines would silently disarm that negative control; the fallback write goes inside the existing `run:` body.
- **The hosted pass is not this task's proof.** The four `pass` verdicts gate step 6 asks for need a real `SMOKE_CLAUDE_KEY` on a hosted runner. Locally the honest aggregate is `could-not-run` with named reasons; this task's tests assert the assembly and observation contracts, and the sprint gate asserts the hosted result.
- **Split check:** not triggered — 8 points, three ACs each with one failure mode, and the workflow edits are constrained by TC-1 rather than being a second feature.
- **Build order:** AC-1 `smoke/cell.mjs` then the two adapter changes; AC-2 `observations.mjs` + `image-scan.mjs` + the producer's merge; AC-3 the three env shapes and the catch-all; TC-1 the four step bodies, the record fallback and the 45-minute job budget. Verify with the five `--test-name-pattern` commands under Evidence Gates, then the three-file regression. Do not dispatch: the hosted receipt is the sprint gate.
- **Owner:** `evals-planner`; sprint `sprint-01-evaluator-evidence-spine`.

<!-- REQUIREMENT-CONTRACT v1 -->
<!--
{
  "version": "1",
  "task_id": "T13",
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
      "test/harness/smoke/cell.mjs",
      "test/harness/smoke/observations.mjs",
      "test/harness/smoke/image-scan.mjs",
      "test/harness/smoke/**",
      "test/harness/adapters/claude-code.mjs",
      "tests/sprint-01/t13-smoke-observations.test.mjs",
      ".spec/prds/harness-eval-framework/tasks/sprint-01-evaluator-evidence-spine/TASK-T13.md",
      ".spec/prds/harness-eval-framework/tasks/sprint-01-evaluator-evidence-spine/TASK-T13.contract.json"
    ],
    "write_prohibited": [
      "plugins/pixel-perfect/**"
    ]
  },
  "fixtures": {
    "seed/hosted-run-41086556471": {
      "entrypoint": "gh run download 41086556471 -n harness-eval-result-41086556471-1 (already recorded under .kb-run-sprint/sprint-01-evaluator-evidence-spine/hosted/run-41086556471)",
      "description": "the recorded attempt: 12 cells / 6 harnesses all could-not-run smoke-not-implemented, 4 controls 0 qualified, verify-reports INDEX reports []",
      "seed_method": "recorded_external"
    },
    "seed/verify-pair": {
      "entrypoint": "runVerifyCase('verify-button-drift') from tests/sprint-01/flow-runner.mjs: the keyless oracle pair materialized from test/harness/kit/project plus overlays/button-drift, each side in its own fresh dir, each report written at the case-declared path",
      "description": "two real invocation dirs, two reports at reports/verify-button-drift.json and reports/verify-clean.json, and the oracle's own exit codes",
      "seed_method": "migration_fixture"
    },
    "seed/identity-mismatch": {
      "entrypoint": "installationIdentity() over a scratch payload whose manifestDigest is computed from real file bytes, with one byte changed in the observed copy before hashing",
      "description": "expected and observed manifest digests differ by one file, so approveIdentity must refuse installation-identity-mismatch before any check verdict is read",
      "seed_method": "migration_fixture"
    },
    "seed/cells-dir-with-observations": {
      "entrypoint": "mkdtemp cells dir with 12 harness-eval-cell-<run>-<attempt>-<harness>-<track> folders; the two claude-code cell.json records carry control_observations for all four ids",
      "description": "the cells dir the download job really assembles, with the four observations a smoke leg produced travelling on the cell records",
      "seed_method": "migration_fixture"
    },
    "seed/cells-dir-partial-observations": {
      "entrypoint": "the same 12-cell dir with the hidden-image-judge observation removed from every record",
      "description": "a run that observed three controls and could not scan the fourth",
      "seed_method": "migration_fixture"
    },
    "seed/keyset": {
      "entrypoint": "three env shapes passed to runCell: every credential variable absent; ANTHROPIC_API_KEY set to the placeholder present-binding-not-a-model-call; and one payload that makes executeLoad throw",
      "description": "the keyless shape a hosted runner produces for an unset secret, the with-key shape that must not refuse, and one genuinely broken leg",
      "seed_method": "cli"
    },
    "seed/archived-probe-capture": {
      "entrypoint": "test/harness/stream/captures/claude-code-stream-probe.capture.json plus claude-code-stream-probe.stdout.bin, read through test/harness/stream/archive-capture.mjs",
      "description": "one real captured claude-code stream with its byte offsets and stdout sha256: zero question events, no image content",
      "seed_method": "recorded_external"
    },
    "seed/planted-image-capture": {
      "entrypoint": "a byte copy of the archived probe capture with one appended model_request line carrying an image content block",
      "description": "the scanner's positive control: an otherwise identical child tree with one hidden image request",
      "seed_method": "migration_fixture"
    },
    "seed/denied-write-capture": {
      "entrypoint": "a real guarded claude-code invocation under --permission-mode dontAsk whose stream carries a denied write on a path inside the invocation's own work dir, process exit 0, recorded by capture.persist()",
      "description": "the exit-0 denial the exit0-denied-read control needs, produced by the smoke leg on a hosted run",
      "seed_method": "recorded_external"
    }
  },
  "verification_gates": [],
  "integration_obligations": [],
  "requirements": [
    {
      "id": "AC-1",
      "type": "acceptance_criterion",
      "primary": true,
      "flow_ref": null,
      "title": "A smoke leg writes a graded cell: four checks from captured bytes, bound to an observed CLI version and a loaded-plugin manifest digest",
      "test_tier": "integration",
      "verify": "node --test tests/sprint-01/t13-smoke-observations.test.mjs --test-name-pattern smoke-cell-graded",
      "test_file": "tests/sprint-01/t13-smoke-observations.test.mjs",
      "test_function": "smoke-cell-graded",
      "positive_example": "four check ids in order each citing files-and-event-stream with resolving citations, observed_cli_version 2.1.291, a 64-hex observed digest equal to the expected one, a non-empty invocation_id and an integer process_exit_code, accepted by collectCells.",
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "scenario": {
        "id": "SC-T13-AC1",
        "tier": "e2e-automated",
        "negative_control": {
          "would_fail_if": [
            "the leg keeps writing the bare smoke record, so all twelve cells stay could-not-run smoke-not-implemented and the artifact republishes run 41086556471",
            "a check verdict is derived from the invocation exit code instead of the captured bytes, so a clean exit 0 with no result event grades pass",
            "the identity is stubbed from pins.json instead of measured, so observed_cli_version is null and gate step 7 prints MISSING"
          ]
        },
        "evidence": {
          "forms": [
            "HarnessCell record with four checks, each citing files-and-event-stream",
            "InstallationIdentity with observed CLI version and both manifest digests"
          ]
        },
        "cases": [
          {
            "start_ref": "seed/verify-pair",
            "action": {
              "actor": "runner",
              "steps": [
                "node --test tests/sprint-01/t13-smoke-observations.test.mjs --test-name-pattern smoke-cell-graded"
              ]
            },
            "end_state": {
              "must_observe": [
                "checks with `.source` `files-and-event-stream` count == 4",
                "`installation.observed_cli_version` is 2.1.291",
                "`installation.observed_plugin_manifest_sha256` is 64 hex characters and equals the expected digest",
                "at least 1 cited `evidence_paths` entry resolves inside the invocation root",
                "`invocation_id` is a non-empty string and `process_exit_code` is an integer",
                "`collectCells` accepts the cell as 1 of the 12 cells"
              ],
              "must_not_observe": [
                "a graded check whose `evidence_paths` array has 0 entries",
                "`installation.observed_cli_version` null",
                "a check whose verdict is read from a process exit code"
              ]
            }
          },
          {
            "start_ref": "seed/identity-mismatch",
            "action": {
              "actor": "runner",
              "steps": [
                "assemble the same four parts against an identity whose observed digest differs by one file"
              ]
            },
            "end_state": {
              "must_observe": [
                "the aggregate reads `could-not-run` with reason `installation-identity-mismatch`",
                "the refusal names the field `observed_plugin_manifest_sha256`"
              ],
              "must_not_observe": [
                "a `pass` verdict on an unattributable run",
                "a candidate-attributed `fail` with 0 identity fields checked",
                "an empty block list with a pass"
              ]
            }
          }
        ],
        "topology_note": "the smoke leg calls runCell once per (harness, track); runCell consults the registry first and the claude-code adapter second; gradeCheck writes one per-check cell per invocation from captured bytes; cellFor aggregates them and applies the identity decision before any check verdict is read",
        "test_tier": "e2e"
      },
      "red_input": "on base main a smoke leg writes only {harness,track,cell_state:could-not-run,reason:smoke-not-implemented}: test/harness/smoke/cell.mjs does not exist, executeLoad hardcodes install_mode checkout, cellFor sets invocation_id null so a graded pass throws pass-without-evidence, and the owned test fails at import",
      "red_proof": ".tmp/sprint-01-verification/t13-smoke.red.log",
      "description": "GIVEN seed/verify-pair and seed/identity-mismatch WHEN smoke-cell-graded runs THEN four checks cite files-and-event-stream with a measured identity (2.1.291, 64-hex digests), a non-empty invocation_id and an integer exit code, and a mismatched identity reads could-not-run installation-identity-mismatch",
      "maps_to_ac": null
    },
    {
      "id": "AC-2",
      "type": "acceptance_criterion",
      "primary": true,
      "flow_ref": null,
      "title": "The four negative-control observations reach HARNESS_EVAL_CONTROL_OBSERVATIONS, and an unobserved control stays control-unobservable",
      "test_tier": "integration",
      "verify": "node --test tests/sprint-01/t13-smoke-observations.test.mjs --test-name-pattern smoke-control-observations",
      "test_file": "tests/sprint-01/t13-smoke-observations.test.mjs",
      "test_function": "smoke-control-observations",
      "positive_example": "the four rows print the observed verdict/reason pairs; with the hidden-image-judge observation removed the fourth reads could-not-run control-unobservable and the first three hold; assertControlRows still refuses three and five rows.",
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "scenario": {
        "id": "SC-T13-AC2",
        "tier": "e2e-automated",
        "negative_control": {
          "would_fail_if": [
            "no step sets HARNESS_EVAL_CONTROL_OBSERVATIONS, so the producer writes four could-not-run control-unobservable rows exactly as run 41086556471 did",
            "a stub producer writes four rows from the control definitions instead of the run's observations, so the array looks populated while nothing was observed",
            "an unobserved control is written as pass, or a default pass fills the gap an absent observation left"
          ]
        },
        "evidence": {
          "forms": [
            "the four controls rows control_id/verdict/reason",
            "cell records carrying control_observations with their evidence"
          ]
        },
        "cases": [
          {
            "start_ref": "seed/cells-dir-with-observations",
            "action": {
              "actor": "runner",
              "steps": [
                "node --test tests/sprint-01/t13-smoke-observations.test.mjs --test-name-pattern smoke-control-observations"
              ]
            },
            "end_state": {
              "must_observe": [
                "`missing-key could-not-run missing-api-key`",
                "`stale-cache could-not-run installation-identity-mismatch`",
                "`exit0-denied-read fail denied_tool_call`",
                "`hidden-image-judge pass no-image-judge-in-child-tree`",
                "controls rows count == 4 after assertControlRows"
              ],
              "must_not_observe": [
                "`hidden-image-judge could-not-run control-unobservable` in the complete dir",
                "a control row whose verdict is `pass` with 0 observation behind it",
                "a per-cell observation appearing in `artifacts.controls`"
              ]
            }
          },
          {
            "start_ref": "seed/cells-dir-partial-observations",
            "action": {
              "actor": "runner",
              "steps": [
                "merge the observations from the same cells dir with the hidden-image-judge entry absent"
              ]
            },
            "end_state": {
              "must_observe": [
                "`hidden-image-judge could-not-run control-unobservable`",
                "`missing-key could-not-run missing-api-key`, `stale-cache could-not-run installation-identity-mismatch` and `exit0-denied-read fail denied_tool_call` still hold"
              ],
              "must_not_observe": [
                "a default `pass` filling the missing observation",
                "3 rows written, or 5 rows written",
                "an empty controls.json"
              ]
            }
          },
          {
            "start_ref": "seed/denied-write-capture",
            "action": {
              "actor": "runner",
              "steps": [
                "observeExit0DeniedRead({ record, check }) over the captured denial"
              ]
            },
            "end_state": {
              "must_observe": [
                "`exit0-denied-read fail denied_tool_call`",
                "the evidence carries `process_exit_code` 0 beside the denial's stream offset",
                "`required_read` is true for the denied target inside the invocation's own work dir"
              ],
              "must_not_observe": [
                "a `pass` verdict beside exit 0",
                "an observation assembled from a constant instead of the capture",
                "0 denials recorded while the row reads `fail`"
              ]
            }
          }
        ],
        "topology_note": "each smoke leg attaches the observations it really produced to its own cell record; the download job's producer step walks the cells dir it already fetched, merges those observations with an optional HARNESS_EVAL_CONTROL_OBSERVATIONS value, and runs T11's qualifyControls -> assertControlRows -> writeControls into cells/controls.json, which the recorder routes into .controls[]",
        "test_tier": "e2e"
      },
      "red_input": "on base main nothing sets HARNESS_EVAL_CONTROL_OBSERVATIONS (the string appears in harness-eval.yml only at the producer's read), the keyless row is written to cell/keyless-control.json and excluded from the upload, and the four rows read could-not-run control-unobservable on every run",
      "red_proof": ".tmp/sprint-01-verification/t13-controls.red.log",
      "description": "GIVEN seed/cells-dir-with-observations, seed/cells-dir-partial-observations and seed/denied-write-capture WHEN smoke-control-observations runs THEN the four rows print the observed verdict/reason pairs, the partial dir leaves hidden-image-judge at could-not-run control-unobservable, and an empty HARNESS_EVAL_CONTROL_OBSERVATIONS parses to {}",
      "maps_to_ac": null
    },
    {
      "id": "AC-3",
      "type": "acceptance_criterion",
      "primary": false,
      "flow_ref": null,
      "title": "Fail-closed is preserved: a cell that cannot run reports could-not-run with a named reason, all twelve cells exist, nothing passes unevidenced",
      "test_tier": "integration",
      "verify": "node --test tests/sprint-01/t13-smoke-observations.test.mjs --test-name-pattern smoke-cell-fail-closed",
      "test_file": "tests/sprint-01/t13-smoke-observations.test.mjs",
      "test_function": "smoke-cell-fail-closed",
      "positive_example": "three env shapes produce three distinct named reasons (missing-api-key, <harness>-adapter-not-implemented, smoke-cell-failed), all twelve cells assemble, and recorderExit reports could-not-run.",
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "scenario": {
        "id": "SC-T13-AC3",
        "tier": "e2e-automated",
        "negative_control": {
          "would_fail_if": [
            "a leg that cannot run exits non-zero and writes no cell.json, so the matrix loses a cell and the recorder refuses cells-incomplete",
            "a missing credential is recorded as pass, or as a blank reason",
            "a static placeholder reason is written for every leg, so the missing credential and the absent adapter become indistinguishable"
          ]
        },
        "evidence": {
          "forms": [
            "the twelve cell records after three env shapes",
            "recorder acceptance of the assembled result"
          ]
        },
        "cases": [
          {
            "start_ref": "seed/keyset",
            "action": {
              "actor": "runner",
              "steps": [
                "node --test tests/sprint-01/t13-smoke-observations.test.mjs --test-name-pattern smoke-cell-fail-closed"
              ]
            },
            "end_state": {
              "must_observe": [
                "claude-code/keyless reads `could-not-run` with reason `missing-api-key`",
                "codex, grok, opencode and pi read `could-not-run` with `<harness>-adapter-not-implemented`",
                "the thrown leg reads `smoke-cell-failed`",
                "12 cells across 6 harnesses validate as a result",
                "`recorderExit` reports `could-not-run`"
              ],
              "must_not_observe": [
                "any cell reading `pass` with 0 evidence paths",
                "a could-not-run cell with an empty reason",
                "11 cells after the grid is assembled"
              ]
            }
          }
        ],
        "topology_note": "runCell is called once per (harness, track); the registry's guard and absent-adapter decisions come before any spawn; a thrown adapter path is caught and written as a bare could-not-run record; the recorder's collectCells/assembleResult/recorderExit judge the twelve records exactly as they judge a hosted attempt",
        "test_tier": "e2e"
      },
      "red_input": "on base main the only outcome a leg can write is the constant bare record smoke-not-implemented, so no code path distinguishes a missing credential from an absent adapter from a crash, and the owned test fails at import",
      "red_proof": ".tmp/sprint-01-verification/t13-smoke.red.log",
      "description": "GIVEN seed/keyset WHEN smoke-cell-fail-closed runs THEN the keyless cell reads could-not-run missing-api-key, the four adapter-pending harnesses read could-not-run <harness>-adapter-not-implemented, the thrown leg reads smoke-cell-failed, and twelve records validate with recorderExit could-not-run",
      "maps_to_ac": null
    },
    {
      "id": "TC-1",
      "type": "test_criterion",
      "primary": false,
      "description": "The workflow carries the wiring without moving a pinned anchor: four jobs, the record step's literal anchor, exactly one cell/cell.json upload, install_mode interpolated",
      "verify": "node --test tests/sprint-01/t13-smoke-observations.test.mjs --test-name-pattern smoke-workflow-wiring",
      "maps_to_ac": "AC-1",
      "test_file": "tests/sprint-01/t13-smoke-observations.test.mjs",
      "test_function": "smoke-workflow-wiring",
      "test_tier": "integration",
      "positive_example": "the declaration reports no failures while the record anchor, the single cell/cell.json upload and the install_mode interpolation are all present and a runCell call appears in each of the five keyed steps",
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "scenario": {
        "id": "SC-T13-TC1",
        "tier": "e2e-automated",
        "negative_control": {
          "would_fail_if": [
            "a fifth job is added, so tests/sprint-01/run-02-hand.test.mjs:169 fails the locked job list",
            "the model step's runCell call is removed, so the record step writes the default constant and the declaration still inspects clean",
            "a second smoke step's run text matches cell/cell.json, so the recorder resolution and grd-06's recordStep move onto a keyed step"
          ]
        },
        "evidence": {
          "forms": [
            "inspectWorkflowDeclaration over the real workflow bytes",
            "the literal record-step anchor and the single upload path"
          ]
        },
        "cases": [
          {
            "start_ref": "seed/hosted-run-41086556471",
            "action": {
              "actor": "runner",
              "steps": [
                "readWorkflow() + inspectWorkflowDeclaration(parseYaml(text))",
                "node --test tests/sprint-01/t13-smoke-observations.test.mjs --test-name-pattern smoke-workflow-wiring"
              ]
            },
            "end_state": {
              "must_observe": [
                "declaration `failures` array length == 0",
                "`jobs` keys sorted equal `['download','drift','grade','smoke']`",
                "exactly 1 smoke step whose run matches `cell/cell.json`",
                "the record step's run contains `${{ inputs.install_mode }}`",
                "exactly 1 smoke upload step with path `cell/cell.json`"
              ],
              "must_not_observe": [
                "`smoke-not-implemented` anywhere in the workflow",
                "a hardcoded `\"install_mode\": \"checkout\"` in the record step",
                "0 steps matching the record anchor"
              ]
            }
          }
        ],
        "topology_note": "the declaration inspector reads the real workflow bytes; the test asserts the properties the locked flows pin (job list, recorder anchor, upload path, secret placement) and the properties this task adds (each keyed step calls runCell, the record step writes only a fallback, the producer merges the cells' observations)",
        "test_tier": "e2e"
      },
      "flow_ref": null,
      "red_input": "on base main the model step bodies write only binding.json, the record step writes smoke-not-implemented, and the producer step has no observations source; the owned test fails",
      "red_proof": ".tmp/sprint-01-verification/t13-smoke.red.log"
    },
    {
      "id": "TC-2",
      "type": "test_criterion",
      "primary": false,
      "description": "The hidden-image-judge scan discriminates: a planted image request fails it, a clean real tree reads pass with its tree hash, and an unreadable tree yields no observation",
      "verify": "node --test tests/sprint-01/t13-smoke-observations.test.mjs --test-name-pattern smoke-image-scan",
      "maps_to_ac": "AC-2",
      "test_file": "tests/sprint-01/t13-smoke-observations.test.mjs",
      "test_function": "smoke-image-scan",
      "test_tier": "integration",
      "positive_example": "the archived real capture scans pass with its tree hash and file list, while the planted copy fails at the offset where the image block was appended",
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "scenario": {
        "id": "SC-T13-TC2",
        "tier": "e2e-automated",
        "negative_control": {
          "would_fail_if": [
            "the scanner reports pass because it scans nothing, so a hidden screenshot judge in the verify child tree stays invisible",
            "the scanner reports pass on an unreadable or absent child tree instead of could-not-run control-unobservable",
            "the scanner is stubbed to return pass without reading any bytes, so an empty child tree and a clean child tree are the same row"
          ]
        },
        "evidence": {
          "forms": [
            "the scan result files_scanned and tree_sha256",
            "the observed control row verdict/reason"
          ]
        },
        "cases": [
          {
            "start_ref": "seed/archived-probe-capture",
            "action": {
              "actor": "runner",
              "steps": [
                "node --test tests/sprint-01/t13-smoke-observations.test.mjs --test-name-pattern smoke-image-scan"
              ]
            },
            "end_state": {
              "must_observe": [
                "the clean tree reads `pass` with 1 tree sha256",
                "`files_scanned` is at least 2 for the capture plus its stdout bytes"
              ],
              "must_not_observe": [
                "`fail image-judge-in-child-tree` on the clean tree",
                "an observation with 0 files scanned",
                "a pass on a tree the scanner could not open"
              ]
            }
          },
          {
            "start_ref": "seed/planted-image-capture",
            "action": {
              "actor": "runner",
              "steps": [
                "scan the planted copy with the same function"
              ]
            },
            "end_state": {
              "must_observe": [
                "`fail image-judge-in-child-tree`",
                "the evidence names the planted file `planted-image.stdout.bin` and its stream offset in bytes"
              ],
              "must_not_observe": [
                "`pass no-image-judge-in-child-tree` on the planted copy",
                "a could-not-run row when the image bytes were readable",
                "a `pass` row with 0 files scanned"
              ]
            }
          }
        ],
        "topology_note": "the same scanner runs over the verify invocation's real child tree on a hosted run and over the two local trees here; a scan that cannot read its tree returns null, so the control stays unobservable rather than passing",
        "test_tier": "e2e"
      },
      "flow_ref": null,
      "red_input": "on base main no scanner exists, so hidden-image-judge can only ever be control-unobservable; the owned test fails at import",
      "red_proof": ".tmp/sprint-01-verification/t13-smoke.red.log"
    }
  ]
}
-->

## Handoff

```json
{
  "task": "T13",
  "commit_sha": "45142ee711db83891a1b559e057fe699de79ba63",
  "done": "All four blocking findings are fixed by making the observation real and by assertions that fail when it is removed. The hidden-image-judge control now scans what the verify invocations actually produced: `cell.mjs` derives `verifyRoots` from the records' own cited evidence paths (the `<key>.capture.json` and `<key>.stdout.bin` beside the model requests) plus the run dirs, the model step persists captures under `<cell-dir>/evidence`, and `scanTree` returns null when it inspected zero files, so an empty tree is control-unobservable, never a pass. The controls producer that runs in CI now skips nulls the way `mergeObservations` does, carries `control_pairs`, and passes them to `qualifyControls`; the owned test executes that exact step body over a populated cells dir and requires it to agree row for row with the module, including that a null in a later record or in the job output does not erase a real observation. AC-1's identity is read, not echoed: `observed_cli_version` comes out of the adapter's `observedCliVersion` over a captured `claude --version` line, a step reporting 2.1.314 must refuse on `observed_cli_version`, and the live load's measured version is compared with a version parsed independently in the test. AC-2's exit-0 denial is the declared `seed/denied-write-capture`, produced for real — one guarded `claude -p` under `--permission-mode dontAsk` whose instruction attempted a denied write, captured with its own exit 0 — and producing it exposed a second defect: the CLI sends denials under `tool_input`, which the stream mapper did not read, so every real denial was invisible; that is fixed and the archived capture now records the Write denial as required. A leg that never denies stays control-unobservable, asserted as such; the hand-written line survives only as a parser unit test. The stale-cache observation records the matching-digest half as its pair and labels a constructed drift `planted: true`, so `discriminates` is computed. Six mutations — empty tree passes, run-dirs-only scan, pin-echoing reader, producer drops the merge, null overwrites, `tool_input` unread — each fail the owned file.",
  "deviations": [
    "The producer step body still merges the cells' observations inline instead of importing `observations.mjs`, because the locked t11 flow runs that body in a sandbox that exposes only `test/harness/controls`; the compensation is a test that executes the real body over a populated cells dir and requires row-for-row agreement with the module.",
    "AC-1 re-derives the identity version from `observedCliVersion`, but that reader lives inside `executeLoad`; to detect a pin-echoing stub deterministically the test feeds a 2.1.314 step and requires a refusal, and additionally compares a live load's measured version with a version parsed independently in the test.",
    "The exit-0 denial row is demonstrated from a real captured stream produced on this host, not from a hosted run; a hosted leg that never denies reads `control-unobservable`, which the test now asserts explicitly."
  ],
  "concerns": [
    "Only `stale-cache` can discriminate locally: `missing-key`, `exit0-denied-read` and `hidden-image-judge` still pass no pair to `qualifyControls`, so `local_ok` stays false and `qualified_why` still names the missing pair for those three — the pairs exist to be produced (the keyless step's with-binding half, the clean verify stream, and a planted capture scan).",
    "`qualifyControls`' `qualified` also requires `hosted.status === 'observed'`, so even a discriminating row cannot read `qualified` from a local run; the hosted receipt is still the gate.",
    "The recorded denied-write capture contains a real model reply and tool ids (~188 KB); it carries no credential string, but it is a transcript and will grow the repo.",
    "`jobs.smoke.timeout-minutes` is 45 while the real leg now spawns five invocations against a live model; a full hosted run must fit install + load + five checks inside that budget.",
    "The live-load cross-check in AC-1 runs only when a `claude` CLI is on PATH; on a runner without one it is a diagnostic, not a pass."
  ],
  "findings": [
    "The CLI's real denial shape is `permission_denials: [{tool_name, tool_use_id, tool_input: {file_path, content}}]` — the adapter read `input` only, so a genuine exit-0 denial was invisible and the control could never fire on a real stream.",
    "`capture.observe` silently converts a mapper-declared `required_read: false` into `null` unless `required_read_paths` is an array, which turns any optional denial into `could-not-run requiredness-undeclared` at grade time (see blockers).",
    "`executeLoad`'s `claude --version` reader is exercised only by a live load, which is why a pin-echoing stub was invisible to cycle 1; the test now parses the CLI's own text independently.",
    "A step body executed by a locked flow reaches `process.argv[1]` through a symlink, so `realpathSync` must be compared on both sides or the CLI silently does nothing.",
    "`node --test --test-name-pattern '<name>' <file>` (pattern first) does filter on Node 24.14.0, and reports `tests 1`; the suffix form ignores the pattern entirely."
  ],
  "scope_impact": [
    {
      "target": "T11",
      "found": "the producer now carries paired observations as well as the four, and passes `pairs` to `qualifyControls`, so `discriminates` can be computed instead of always false.",
      "change": "T11's four ids, vocabulary, exactly-four rule and refusals are untouched; its locked test is green."
    },
    {
      "target": "GATE:FLOW-GRD-03-FILES-AND-STREAM",
      "found": "the stream mapper did not read `tool_input`, the shape the CLI actually uses for a denial, so a real exit-0 denial was invisible to the record.",
      "change": "`mapCapturedLine` reads `tool_input` and `input`, records `tool_use_id` and the argument keys, and declares requiredness from the resolved path; a real archived denial now grades `fail denied_tool_call`."
    },
    {
      "target": "GATE:FLOW-GRD-06-MISSING-KEY",
      "found": "each `Smoke model step` still binds exactly one variable and the step bodies still execute under the sandbox's `test/` symlink (the main-module check now compares `realpathSync` on both sides).",
      "change": "step bodies replaced; the locked flow is green."
    }
  ],
  "feedback": [
    "AC-2 should state that `seed/denied-write-capture` is recorded_external and therefore not producible in a hermetic CI sandbox: it needs an authenticated CLI, so a runner without one must skip-and-name rather than fail.",
    "AC-2's complete-dir case should say explicitly that a leg which never denies reads `could-not-run control-unobservable`, so the four-row expectation does not read as 'all four must always show observed verdicts'.",
    "AC-1 should name the negative case it wants — 'a version step reporting a different version must refuse on observed_cli_version' — because the positive assertion alone can be satisfied by echoing the pin.",
    "The task's Boundary Contracts should say that a per-cell paired observation may travel as `control_pairs` beside `control_observations`, since `discriminates` cannot be computed without it."
  ]
}
```
