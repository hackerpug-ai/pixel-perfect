# TASK-T15 — Give the four negative controls a hosted producer, an honest hosted half, real pairs, and a gate that reads the pairs

> Task ID: T15
> Sprint: [SPRINT.md](./SPRINT.md)
> Status: Backlog
> Assignee: ai-tooling-implementer
> Priority: P0
> Points: 5
> Type: FEATURE
> Planner: evals-planner
> Proposed By: evals-planner
> Reviewer: github-agentic-workflow-reviewer
> Depends On: T14
> Wave: 2
> TDD_MODE: red_first · RED_GREEN_REQUIRED: true

AGENT: planner=evals-planner | implementer=ai-tooling-implementer | reviewer=github-agentic-workflow-reviewer

**Depends on:** T14 (a mapper-declared `required_read: false` must stop collapsing to `null` in `test/harness/runtime/capture.mjs`, or a denial's requiredness is meaningless and the probe's optional half cannot be read as optional)
**Blocks:** T11 (its hosted acceptance names the four exact verdict/reason pairs), T12 (reviews the graded output), human-testing-gate step 11

## Background

- **Source:** `PLAN-AMENDMENT-2026-10-30-hosted-controls.json` (owner-authorized, item `amendment:T15`, recorded at `.kb-run-sprint/sprint-01-evaluator-evidence-spine/decisions/amendment-T15.decision.json`) and T11's cycle-3 review, findings **F-T11-6** and **F-T11-7** (`.kb-run-sprint/sprint-01-evaluator-evidence-spine/T11/capture-review3/out5/response.raw`, both `basis: "reproduced"`).
- **What the hosted run proves:** run **41139161972** (head `09547bc`) published a result artifact whose four controls read `missing-key could-not-run control-unobservable`, `stale-cache could-not-run control-unobservable`, `exit0-denied-read could-not-run control-unobservable`, `hidden-image-judge pass no-image-judge-in-child-tree`, with **every** row carrying `hosted.status: "not-executed"` and `qualified: false` — inside the artifact of the hosted run itself.
- **Defect (a) — `exit0-denied-read` has no hosted producer.** `.github/workflows/harness-eval.yml:116-123` runs the graded invocations from the adapter's invocation table, whose prompts never make an invocation attempt a write the recorded stance denies, so no hosted capture carries a `permission_denied` with `required_read: true` beside `exit 0`. `test/harness/smoke/observations.mjs:153` (`observeExit0DeniedRead`) fires only on `required_read === true`, so the row can only read `could-not-run control-unobservable` where the sprint's gate names `fail denied_tool_call` (SPRINT.md step 11). The only stream that proves the control is a purpose-built archived probe (`test/harness/smoke/fixtures/denied-write/`), which the local flow grades instead of the verify invocation a dispatched run executes.
- **Defect (b) — the rows deny their own qualification.** `.github/workflows/harness-eval.yml:358` calls `qualifyControls({ observations, pairs })` with no hosted half, and `test/harness/controls/index.mjs:84-92` (`hostHalf`) accepts only `{ status: "observed" }`, so `qualified` (`:135`) is **unreachable by construction**: every row of every dispatched artifact is `not-executed` / `qualified: false`, and `fully_qualified` (`:167`) can never be true.
- **Defect (c) — two rows carry no pair.** `test/harness/smoke/observations.mjs:316-326` (`observeLeg`) returns a pair for `stale-cache` only, and `attachMissingKey` (`:286`) attaches none, so `missing-key` and `hidden-image-judge` publish `pair: null` and `discriminates: false` even though the authenticated cells they must be paired with ran in the same run. A row whose pair is null proves failure, not discrimination.
- **Defect (d) — nothing reads the pairs (the amendment's item (c)).** No step or gate asserts a verdict/reason pair at all: `assertControlRows` (`test/harness/controls/index.mjs:177`) enforces exactly four rows with schema-valid verdicts, so a run that observed nothing publishes four `could-not-run` rows and every check the framework has stays green.
- **Gate steps:** 10, 11, 13 (and 6 through them). **Capability:** CAP-EVAL-01. **PRD:** `09-technical-requirements/04-uc-grd.md` UC-GRD-03, UC-GRD-06; `03-data-schema.md` § Negative controls; `02-system-components.md` § smoke matrix, § grade recorder; `10-e2e-testing.md`.
- **Current (consumed):** T13's `runCell`/`observeLeg`/`attachMissingKey`/`attachPair` and the cells-carried `control_observations`/`control_pairs` channels; T11's `CONTROLS`, `recordControl`, `qualifyControls`, `assertControlRows`, `writeControls`; T5's `gradedArgv`, `recordStance`, `mapCapturedLine`, `isRequiredPath`, `runGuarded`; T14's preserved requiredness.
- **Desired (provided):** one graded claude-code leg attempts a write the recorded stance denies and captures the denial beside its own exit 0; the producer stamps each row it publishes with the runner's own identity so a hosted row reads `hosted.status: "observed"` and `qualified: true` while a machine-local replay reads `not-executed`; all four rows carry a paired measurement that came out the other way; and one gate implementation asserts the four exact verdict/reason pairs both in-run and over a downloaded artifact.
- **Boundary contracts (read before editing):** the four control ids, their `expect` pairs, `assertControlRows`' exactly-four rule and the `controls-missing`/`controls-invalid` refusals are untouched. The workflow keeps exactly four jobs `[download, drift, grade, smoke]` (`tests/sprint-01/run-02-hand.test.mjs:169`); the record step keeps the literal anchor `- name: Record the cell` (`:233`); exactly one smoke step uploads the cell record and it is the record step's path (`tests/sprint-01/t11-controls-wiring.test.mjs:296-302`); each `Smoke model step` keeps exactly one credential binding and the record step binds none (`tests/sprint-01/grd-06-missing-key.test.mjs:531-552`). `tests/sprint-01/t13-smoke-observations.test.mjs:880` pins the producer's call text **character for character** (`qualifyControls({ observations, pairs })`), so the hosted half must arrive through `observations`, never as a fourth argument. `tests/sprint-01/flow-runner.mjs:442-484` and `tests/sprint-01/grd-06-missing-key.test.mjs:576` resolve the record step as the **first** smoke step whose run text matches the cell-record path, so the model step's body must compose that path at run time and never spell it.

## Critical Constraints

- MUST make one graded claude-code invocation attempt a write the recorded stance denies, on a target that resolves inside that invocation's own work dir, so `isRequiredPath` declares the denial required and `observeExit0DeniedRead` reads `fail denied_tool_call` from a captured stream whose `process_exit_code` is 0. NEVER add the probe to the invocation table: a sixth graded row would give the cell five checks and break the four-grade locks.
- MUST derive the probe's pair from a second real invocation whose denial target is outside every required root, so the pair is a measurement (`required_read: false`) rather than a claim, and MUST return no pair when the optional denial never happened.
- MUST stamp the hosted half from the runner's own identity (`GITHUB_ACTIONS`, `GITHUB_RUN_ID`, `GITHUB_RUN_ATTEMPT`, `GITHUB_EVENT_NAME`) and MUST leave it absent when that identity is absent — a machine-local replay reports `not-executed` / `qualified: false`, never `observed`.
- MUST keep `hostHalf`'s fail-closed rule: only `status === "observed"` is an executed half, and `assertControlRows` still refuses a qualified row without one. The hosted channel is additive; it is not a default.
- MUST give all four rows a paired measurement that came out the other way and let `recordControl` COMPUTE `discriminates` from it — never accept a caller's boolean.
- MUST assert the four exact verdict/reason pairs, in one implementation used by both the in-run producer and the documented gate command, so a run that observed nothing exits non-zero and names every unmatched id.
- MUST NOT add a job, rename or re-anchor the record step, widen the cell-record upload (the probe's capture stays in `cell/` and its observation cites offsets and the stdout sha256), add a secret-bearing step, add a second credential binding to any model step, or put the cell-record path literal in the model step's run text.
- MUST NOT modify `test/harness/smoke/cell.mjs`, `test/harness/smoke/model-step.mjs`, `test/harness/smoke/image-scan.mjs`, `test/harness/runtime/**`, `test/harness/recorder/**`, any other task's test file, or `plugins/pixel-perfect/**`.

## Specification

### Seam 1 — a graded invocation that attempts a denied write (defect a)

`test/harness/adapters/claude-code.mjs` gains one control probe. It is not a table row and contributes no check.

- `runControlProbe({ track, configDir, env, evidenceDir, pluginRoot, timeout_ms = 180_000 })` runs **two** guarded invocations through the shared runtime, each in its own fresh directory:
  1. **required half** — a `claude -p` whose instruction tells the model to create `work/keep.txt` inside that directory using the Write tool. Under `--permission-mode dontAsk` the CLI denies the write and still exits 0, which is exactly the shape `test/harness/smoke/fixtures/denied-write/` recorded: `process_status.exit_code: 0`, `model_request_count: 1`, a `permission_denied` of operation `Write` whose target resolves under the invocation's own `cwd`, so `isRequiredPath` declares `required_read: true`.
  2. **optional half** — a `claude -p` in a different fresh directory whose instruction tells the model to write an absolute path **outside** that directory, so the denial's target resolves under neither the plugin root nor the invocation `cwd` and `mapCapturedLine` declares `required_read: false`. That is the same stream with the denial not required: the control must not fire on it.
- Both argv come from `gradedArgv({ prompt, pluginRoot })`, so the child runs the `--permission-mode dontAsk` the recorded stance declares (`recordStance` recorded before the first call), and both go through `runGuarded`, so a run without the binding records the guard's own refusal instead of a silent skip. `capture.observe` is called with the probe's own entry, so requiredness is declared against the probe's `cwd`.
- `runControlProbe` returns `{ required: { entry, decision, record }, optional: { entry, decision, record }, observation, pair }`, where `observation = observeExit0DeniedRead({ record: required.record, check: "verify" })` and `pair = observeExit0DeniedReadPair({ record: optional.record })`. Either may be `null`, and a refusal yields `null` for both.
- `DENIED_WRITE_PROBE` records the probe's declared shape (`key: "denied-write-probe"`, the two roles, the denied targets' roots, `timeout_ms`), so a reader can see what the probe asked for without inferring it from a prompt string.

`test/harness/smoke/observations.mjs` gains two producers and one attacher:

| Export | Reads | Returns |
|---|---|---|
| `observeExit0DeniedReadPair({ record })` | a record that exited 0 and whose `permission_denied` entries are all explicitly `required_read: false` | `pass optional-denial-not-a-failure` with `required_read: false`, `target`, `stream_offset`, `invocation_id`, `stdout_sha256` — or `null` when the record carries a required denial, a non-zero exit, or no denial at all |
| `observeMissingKeyPair({ record })` | the authenticated graded leg's verify record: no `refusal`, `model_request_count >= 1`, a resolvable capture citation | `pass binding-accepted` with `model_request_count`, `invocation_id`, `process_exit_code`, `stdout_sha256` — the same guard, the same code path, coming out the other way — or `null` |
| `observeHiddenImageJudgePair({ roots })` | a scratch copy of the run's **own** captured bytes with one image content block appended, scanned by the real `scanTree` | `fail image-judge-in-child-tree` with `planted: true`, the planted file name and its byte offset — or `null` when the scanner could not read the copy |
| `attachDeniedWriteProbe({ cellFile, probe })` | the cell record the leg wrote | merges `control_observations["exit0-denied-read"]` and `control_pairs["exit0-denied-read"]` atomically (`*.partial` → rename), reads back, returns `{ ok, reason, cell_file }`; `not-observed` when the probe produced nothing, `no-cell-record` / `cell-record-unreadable` when the leg wrote none |

`observeLeg` gains the two pairs it can already measure from what it receives (`verifyRecord`, `verifyRoots`): `missing-key` from `observeMissingKeyPair({ record: verifyRecord })` and `hidden-image-judge` from `observeHiddenImageJudgePair({ roots: verifyRoots })`, beside the existing `stale-cache` pair. `exit0-denied-read`'s pair arrives with its observation through the probe. `attachMissingKey` keeps the pair already on the record, never overwrites one, and reports `pair: true|false` in its receipt.

### Seam 2 — the hosted half and the four pairs (defects b and c)

`test/harness/controls/index.mjs`:

- `hostedHalfFromEnv(env = process.env)` → `{ status: "observed", run_id, run_attempt, event, workflow: "harness-eval" }` only when `GITHUB_ACTIONS === "true"`, `GITHUB_RUN_ID` and `GITHUB_RUN_ATTEMPT` parse to positive integers, and `GITHUB_EVENT_NAME` is non-empty; otherwise `null`. `run_id`/`run_attempt` are Numbers so they compare with the artifact's own numeric `run_id` (`test/harness/recorder/result.mjs:147`).
- `qualifyControls` resolves each row's hosted half in this order: an explicit `hosted[id]` argument → `observations[id].hosted` → the definition's `awaiting` record. `recordControl` and `hostHalf` keep the rule that only `status === "observed"` is an executed half; nothing else becomes qualified.

`.github/workflows/harness-eval.yml`, inside the existing producer step's `run:` body:

- compute `const hosted = hostedHalfFromEnv(process.env)` once and stamp it on every observation inside the **existing** `merge` closure (`into[id] = hosted ? { ...value, hosted } : value`), so the pinned call text `qualifyControls({ observations, pairs })` is unchanged and no new argument is introduced.
- after `writeControls`, call `controlVerdictGate(rows, { runId: hosted?.run_id ?? null })`, print one line per mismatch with `::error::`, and `process.exit(1)` when it is not ok. The `Hand the cells to the recorder` step already carries `if: always()`, so a failed run still publishes its cells and controls.

`.github/workflows/harness-eval.yml`, inside the existing `Smoke model step claude-code ${{ matrix.track }}` `run:` body, after `model-step.mjs` and only for `matrix.track == 'pinned'` (symmetric with the keyless control step):

- call `runControlProbe` (the step already holds the credential), then `attachDeniedWriteProbe({ cellFile, probe })` with `const cellFile = join("cell", "cell.json")` — composed, never a literal — and write `cell/denied-write-probe.json` as the receipt (`{ ok, reason, observation_reason, pair_reason, required_stdout_sha256, optional_stdout_sha256 }`).
- a throw writes `{ ok: false, reason: error?.reason ?? "denied-write-probe-failed" }` and prints it. The step still exits 0: the verdict reports, the shell does not.

### Seam 3 — the gate reads the pairs (defect d)

`test/harness/controls/index.mjs` gains one gate and one CLI:

- `controlVerdictGate(rows, { runId = null } = {})` → `{ ok, expected, rows: [{ control_id, verdict, reason }], mismatches: [...] }`. `mismatches` names, per row: an unknown, missing or duplicated id; `verdict`/`reason` unequal to the row's own `expect` pair; `qualified !== true`; `hosted.status !== "observed"`; and, when `runId` is given, `hosted.run_id !== runId`. `assertControlRows` runs first, so a three-row or five-row array is refused there rather than reported as mismatches.
- `node test/harness/controls/index.mjs --gate <artifact.json>` (an `isMain` block, like `test/harness/smoke/cell.mjs`) reads `.controls` and `.run_id`, prints `{ ok, mismatches, rows }`, and exits 0 only when `ok`. That is the documented command the hosted gate and the maintainer both run, over a downloaded artifact.

### Workflow shape — no job added, no pinned anchor moved

| Step | Job | Change |
|---|---|---|
| `Smoke model step claude-code ${{ matrix.track }}` | smoke | keep the single binding and `model-step.mjs`; add the pinned-track probe call, the receipt file, the composed cell path, and a throw that reports instead of failing |
| `Keyless control - a missing credential must refuse` | smoke | name, `if:`, absence assertions and the guard call unchanged; its `attachMissingKey` receipt now reports whether the leg's pair survived |
| `Qualify the four negative controls` | download | stamp the hosted half inside the existing `merge`; the pinned `qualifyControls({ observations, pairs })` call text is untouched; gate the rows after `writeControls` |
| `Record the cell`, uploads, `grade`, `drift` | all | unchanged |

`jobs.smoke.timeout-minutes` stays 45: the probe is two short invocations on one leg.

## Acceptance Criteria (GIVEN-WHEN-THEN)

### AC-1: A dispatched run's controls array carries the four exact verdict/reason pairs, each observed and qualified

- **GIVEN:** `seed/real-cells-dir` — the cells dir the download job really assembles, built by the real `runCell` replay of `seed/denied-write-capture` plus the real keyless control step body
- **WHEN:** the workflow's real producer step body runs twice: once with `GITHUB_ACTIONS=true GITHUB_RUN_ID=41139161972 GITHUB_RUN_ATTEMPT=1`, once with every `GITHUB_*` variable absent
- **THEN:** both runs write `cells/controls.json` with exactly four rows printing `missing-key could-not-run missing-api-key`, `stale-cache could-not-run installation-identity-mismatch`, `exit0-denied-read fail denied_tool_call`, `hidden-image-judge pass no-image-judge-in-child-tree`; the runner-identity run reads `hosted.status: "observed"`, `hosted.run_id` 41139161972, `discriminates: true` and `qualified: true` on all four; the machine-local run reads `not-executed` and `qualified: false` on all four with the same pairs

```text
TEST_TIER:             integration
VERIFICATION_SERVICE:  local: the real producer step body + the real cells dir from a real runCell replay + the recorded denied-write capture, node --test (no dispatch)
SURFACE_POLICY:        .spec/e2e-policy/sprint-01/artifact-only-read.json
TDD_STATE:             red_first
VERIFY:                node --test tests/sprint-01/t15-hosted-controls.test.mjs --test-name-pattern t15-hosted-four-pairs
EXPECT:                exit 0 · TAP `ok` for t15-hosted-four-pairs · fail 0
```

- **RED input (fails on base):** the producer passes no hosted half, `hostHalf` accepts only `status: "observed"` so `qualified` is unreachable, `observeLeg` pairs `stale-cache` alone, and no graded invocation attempts a denied write — a dispatched run republishes run 41139161972's rows. The owned test fails at import.
- **RED proof:** `.tmp/sprint-01-verification/t15-hosted-controls.red.log`
- **positive_example (passes after landing):** four rows, four exact pairs, `hosted.status: "observed"`, `hosted.run_id` 41139161972, `discriminates: true`, `qualified: true`; the same body with no runner identity keeps the pairs and drops to `not-executed` / `qualified: false`.
- **Hosted receipt (the sprint gate, not this test's proof):** on a dispatched `harness-eval` run, `node test/harness/controls/index.mjs --gate /tmp/he1/harness-eval-result.json` exits 0 over the downloaded artifact.

SCENARIO_SUMMARY: complete SCENARIO lives once, in this AC's row of the REQUIREMENT-CONTRACT block below.

### AC-2: The controls gate asserts the four exact verdict/reason pairs, so a run that observed nothing fails loudly

- **GIVEN:** `seed/planted-row-mismatch` (an otherwise green artifact with one row's reason flipped) and `seed/hosted-run-41139161972` (a real recorded artifact whose four rows observed nothing)
- **WHEN:** the gate runs over each, in-run (`controlVerdictGate` inside the producer) and over the file (`--gate`)
- **THEN:** it exits non-zero and names the mismatched ids — `hidden-image-judge` with expected `pass` and observed `fail` on the planted copy, and all four ids plus `hosted.status not-executed` on the recorded run — while the unflipped green fixture exits 0

```text
TEST_TIER:             integration
VERIFICATION_SERVICE:  local: the real gate implementation and the recorded run 41139161972 artifact, node --test (no dispatch)
SURFACE_POLICY:        .spec/e2e-policy/sprint-01/artifact-only-read.json
TDD_STATE:             red_first
VERIFY:                node --test tests/sprint-01/t15-hosted-controls.test.mjs --test-name-pattern t15-gate-refuses-mismatch
EXPECT:                exit 0 · TAP `ok` for t15-gate-refuses-mismatch · fail 0
```

- **RED input (fails on base):** no gate exists; `assertControlRows` checks four valid rows and nothing else, so an artifact that observed nothing is indistinguishable from one that observed everything.
- **RED proof:** `.tmp/sprint-01-verification/t15-hosted-controls.red.log`
- **positive_example (passes after landing):** `{ ok: false, mismatches: ["hidden-image-judge: expected pass/no-image-judge-in-child-tree, observed fail/..."] }` and exit 1 on the planted copy; exit 0 on the green fixture.

SCENARIO_SUMMARY: complete SCENARIO lives once, in this AC's row of the REQUIREMENT-CONTRACT block below.

## Test Criteria

### TC-1: The workflow carries the probe and the hosted half without moving a pinned anchor

- **Verify:** `node --test tests/sprint-01/t15-hosted-controls.test.mjs --test-name-pattern t15-workflow-wiring`
- **Expected:** exit 0, `pass 1`, `fail 0`; `inspectWorkflowDeclaration(...).failures.length === 0`; four job keys; exactly one smoke step whose run matches the cell-record path; the producer still contains `qualifyControls({ observations, pairs })`; the claude-code model step's run text names `runControlProbe` and never spells the cell-record path; `CHECKS.length === 4`.
- **Locked scenarios:** `SC-T15-TC1`.

### TC-2: The probe observes a required denial and stays silent on an optional one

- **Verify:** `node --test tests/sprint-01/t15-hosted-controls.test.mjs --test-name-pattern t15-denied-write-probe`
- **Expected:** exit 0, `pass 1`, `fail 0`; the archived capture yields `fail denied_tool_call` with `process_exit_code` 0 and a Write target ending `keep.txt`; `mapCapturedLine` declares `required_read: true` inside the probe's cwd and `false` outside it; `observeExit0DeniedRead` returns `null` on the optional-denial stream; `attachDeniedWriteProbe` writes and reads back `control_observations["exit0-denied-read"]`; a thrown probe leaves `cell/denied-write-probe.json` with a reason and the step exits 0.
- **Locked scenarios:** `SC-T15-TC2`.

### TC-3: All four rows carry a pair that came out the other way

- **Verify:** `node --test tests/sprint-01/t15-hosted-controls.test.mjs --test-name-pattern t15-pairs-discriminate`
- **Expected:** exit 0, `pass 1`, `fail 0`; `control_pairs` holds all four ids; each pair's verdict/reason differs from its control's `expect` pair; `discriminates` is `true` on all four; the `hidden-image-judge` pair reads `fail image-judge-in-child-tree` with `planted: true` and a byte offset; a null pair leaves `pair: null` and `discriminates: false`.
- **Locked scenarios:** `SC-T15-TC3`.

### TC-4: The hosted claim is bound to the run that publishes it

- **Verify:** `node --test tests/sprint-01/t15-hosted-controls.test.mjs --test-name-pattern t15-gate-run-binding`
- **Expected:** exit 0, `pass 1`, `fail 0`; the gate exits 0 on the green fixture with `run_id` 41139161972; exits 1 on the same rows carrying `run_id` 41086556471; exits 1 on a three-row array and on a duplicated id.
- **Locked scenarios:** `SC-T15-TC4`.

## Locked scenarios

The scenarios are carried once, as JSON, in the REQUIREMENT-CONTRACT block at the end of this file (T13's shape). This table is the index; it is not a second copy.

| Scenario | Requirement | What it locks |
|---|---|---|
| `SC-T15-AC1` | AC-1 | the four exact pairs, the run-bound hosted half, and the machine-local refusal to claim it |
| `SC-T15-AC2` | AC-2 | the gate fails on a planted mismatch and on a real artifact that observed nothing |
| `SC-T15-TC1` | TC-1 | the workflow carries the probe without moving a pinned anchor |
| `SC-T15-TC2` | TC-2 | requiredness decides the control; an optional denial is not it |
| `SC-T15-TC3` | TC-3 | every row's pair is a real second measurement |
| `SC-T15-TC4` | TC-4 | the hosted claim is compared against the artifact's own run id |

## Guardrails

WRITE-ALLOWED:

- .github/workflows/harness-eval.yml
- test/harness/smoke/observations.mjs
- test/harness/adapters/claude-code.mjs
- test/harness/controls/index.mjs
- tests/sprint-01/t15-hosted-controls.test.mjs

WRITE-PROHIBITED:

- plugins/pixel-perfect/**
- test/harness/smoke/cell.mjs
- test/harness/smoke/model-step.mjs
- test/harness/smoke/image-scan.mjs
- test/harness/runtime/**
- test/harness/recorder/**
- tests/sprint-01/t13-smoke-observations.test.mjs
- tests/sprint-01/grd-06-missing-key.test.mjs
- tests/sprint-01/grd-03-evidence.test.mjs
- tests/sprint-01/t11-controls-wiring.test.mjs
- tests/sprint-01/run-02-hand.test.mjs
- Any file not listed in write_allowed

## Evidence Gates

- **AC-1:** `node --test tests/sprint-01/t15-hosted-controls.test.mjs --test-name-pattern t15-hosted-four-pairs`. Expected: exit 0, TAP `ok`, `fail 0`.
- **AC-2:** `node --test tests/sprint-01/t15-hosted-controls.test.mjs --test-name-pattern t15-gate-refuses-mismatch`. Expected: exit 0, TAP `ok`, `fail 0`.
- **TC-1:** `node --test tests/sprint-01/t15-hosted-controls.test.mjs --test-name-pattern t15-workflow-wiring`. Expected: exit 0, `declaration.failures.length === 0`.
- **TC-2:** `node --test tests/sprint-01/t15-hosted-controls.test.mjs --test-name-pattern t15-denied-write-probe`. Expected: exit 0 — `fail denied_tool_call` from the archived capture, `null` from the optional-denial stream.
- **TC-3:** `node --test tests/sprint-01/t15-hosted-controls.test.mjs --test-name-pattern t15-pairs-discriminate`. Expected: exit 0, four pairs, four `discriminates: true`.
- **TC-4:** `node --test tests/sprint-01/t15-hosted-controls.test.mjs --test-name-pattern t15-gate-run-binding`. Expected: exit 0, gate rejects a mismatched run id.
- **Owned test file:** `node --test tests/sprint-01/t15-hosted-controls.test.mjs`. Expected: `pass 6`, `fail 0`.
- **Controls gate (hosted, over a downloaded artifact):** `node test/harness/controls/index.mjs --gate /tmp/he1/harness-eval-result.json`. Expected: exit 0 and `{"ok":true,...}`; exit 1 with the unmatched ids named on any artifact whose four rows are not the four exact pairs.
- **regression (five locked files):** `node --test tests/sprint-01/t13-smoke-observations.test.mjs tests/sprint-01/grd-06-missing-key.test.mjs tests/sprint-01/grd-03-evidence.test.mjs tests/sprint-01/t11-controls-wiring.test.mjs tests/sprint-01/run-02-hand.test.mjs`. Expected: `fail 0`.
- **write-scope:** `git diff --name-only`. Expected: only WRITE-ALLOWED paths.

## Review Criteria

Must pass:

- The owned test is committed and reports `pass 6`, `fail 0`, and each test asserts its row's THEN rather than restating the implementation.
- `exit0-denied-read` is observed on a stream a real guarded invocation produced: exit 0 beside a denial whose target resolves inside that invocation's own work dir, with the offset cited. No verdict is read from an exit code.
- The probe contributes no check: `CHECKS` still holds four ids and the cell still carries four grades.
- The hosted half is derived from the runner's own identity and is absent without it; `qualified` is reachable and only when `matched && discriminates && hosted.status === "observed"`.
- Every pair is a measurement that came out the other way; `discriminates` is computed, never accepted from a caller.
- The gate is one implementation used by both the producer and the documented command, and it names every unmatched id.
- `git diff --name-only` lists only WRITE-ALLOWED paths, and the five locked test files are untouched and green.

Should verify: the model step's run text contains no cell-record path literal; the producer's call text is character-for-character `qualifyControls({ observations, pairs })`; the probe's capture is not uploaded and no secret value appears in any observation, receipt or log; `jobs.smoke.timeout-minutes` is 45; `hostedHalfFromEnv({})` is `null`.

Verdict: APPROVED or NEEDS_FIXES, with file and line for each finding.

## Dependencies

- **Depends on:** T14

Why T14: a mapper-declared `required_read: false` must survive `capture.observe` before a denial's requiredness means anything. Without it the probe's optional half is recorded as `null` (requiredness undeclared), the pair cannot be read as optional, and `gradeFromEvidence` refuses any record that carries an optional denial. T15 starts only after T14 lands.
- **Blocks:** T11 (its AC-1 and AC-2 name the four exact pairs in a downloaded artifact), T12 (reviews the graded output), human-testing-gate step 11.

A shared file is not a dependency: T15 edits the same workflow T1 scaffolded and the same modules T13 and T11 wrote, and each of those tasks' pins are enforced by the regression list above rather than by an edge. T11 and T12 are deliberately **not** edges — T15 must be dispatchable without them, and their acceptance is what T15 unblocks.

## Out of Scope

- The capture layer's requiredness rule (T14 owns `test/harness/runtime/capture.mjs` and the `requiredness-undeclared` block).
- Transporting a probe capture into an artifact: the smoke job admits exactly one upload path and this task keeps it. The observation cites offsets and the stdout sha256; the capture stays on the runner.
- Grading the probe, adding a fifth check, adding a job, or changing the four control ids, their vocabulary, `assertControlRows`' exactly-four rule, the `controls-missing`/`controls-invalid` refusals, or the result schema.
- Dispatching the workflow. The hosted receipt is the sprint gate; this task's tests assert the mechanism and the gate.
- The other two controls' hosted producers beyond their pairs (their observations already exist).

## Notes

- **Why the probe is not an invocation-table row.** `cellFor` aggregates every table entry into the cell's checks, and the four-grade locks (`FLOW-GRD-02`, `grd-02-four-grades`) count them. A sixth row would either change those four grades or add a fifth check. The probe is a control, not a grade: it runs beside the table, writes its own record, and contributes one observation and one pair.
- **Why the hosted half rides on the observation.** `tests/sprint-01/t13-smoke-observations.test.mjs:880` pins the producer's call text, so a fourth argument is not available without editing a file this task may not touch. `qualifyControls` therefore resolves the hosted half from the observation the producer stamped, which keeps one call, one implementation and one fail-closed rule. `T13`'s handoff feedback asked for exactly this channel for `control_pairs`; the same reasoning applies to `hosted`.
- **Why the run id is compared.** A producer that stamps `hosted: observed` from a bare constant would be self-certifying. Requiring `hosted.run_id` to equal the artifact's own `run_id` ties the claim to the run that published it, so a stale artifact cannot be read as this attempt's receipt (TC-4).
- **Why `required_read: false` is load-bearing for the pair.** The probe's optional half is only optional if the declared `false` survives capture — that is T14, and it is why T15 names it as a dependency rather than a nicety.
- **Why this is not a stubbed test.** No verdict is typed by the test. The four rows in AC-1 are the module's own output over bytes the real `runCell` replay and the real keyless step body produced from the archived capture's real stdout; the hosted stamp is the module's own reader over real environment values; the gate compares each row with its own `expect` pair and with the artifact's `run_id`. The only value the test supplies is `GITHUB_RUN_ID`, because no runner exists on this host — and the test then requires the gate to reject the same rows under a different run id, so a constant could not pass. The hosted proof is not simulated at all: it is `node test/harness/controls/index.mjs --gate` over a downloaded artifact from a real dispatch.
- **Gate command and pattern order.** The Evidence Gates use the repo's established `node --test <file> --test-name-pattern <name>` form. T13's handoff recorded that on Node 24.14.0 the pattern-first form filters and the suffix form reports every test in the file; both forms exit 0 on a green file, so the gates are sound either way, and the owned-file gate states the full count (`pass 6`) so a silently unfiltered run is still visible.
- **Split check:** not triggered — 5 points, two ACs and four TCs over one mechanism (a real denial, a run-bound hosted half, four pairs, one gate), and the workflow edits are constrained by TC-1 rather than being a second feature.
- **Build order:** TC-2 the adapter probe and `attachDeniedWriteProbe`; TC-3 the three pairs in `observations.mjs`; AC-1 `hostedHalfFromEnv` + the producer's stamp + the probe call in the model step; AC-2/TC-4 `controlVerdictGate` + the CLI + the producer's gate. Verify with the six `--test-name-pattern` commands under Evidence Gates, then the five-file regression. Do not dispatch: the hosted receipt is the sprint gate.
- **Owner:** `evals-planner`; sprint `sprint-01-evaluator-evidence-spine`.

<!-- REQUIREMENT-CONTRACT v1 -->
<!--
{
  "version": "1",
  "task_id": "T15",
  "task_type": "FEATURE",
  "tdd_mode": "red_first",
  "verification_policy": {
    "requires_tests": true,
    "requires_red_evidence": true,
    "requires_seeded_evidence": true
  },
  "guardrails": {
    "write_allowed": [
      ".github/workflows/harness-eval.yml",
      "test/harness/smoke/observations.mjs",
      "test/harness/adapters/claude-code.mjs",
      "test/harness/controls/index.mjs",
      "tests/sprint-01/t15-hosted-controls.test.mjs"
    ],
    "write_prohibited": [
      "plugins/pixel-perfect/**"
    ]
  },
  "fixtures": {
    "seed/real-cells-dir": {
      "entrypoint": "mkdtemp cells dir holding the two claude-code cells the real runCell replay writes (records[verify-button-drift] = the archived denied-write capture under test/harness/smoke/fixtures/denied-write/), then the workflow's real keyless control step body executed against it so attachMissingKey writes the missing-key observation onto the cell record",
      "description": "the cells dir the download job really assembles: two claude-code cell records carrying control_observations and control_pairs for the four ids, produced by real module calls over archived bytes rather than typed by the test",
      "seed_method": "migration_fixture"
    },
    "seed/denied-write-capture": {
      "entrypoint": "test/harness/smoke/fixtures/denied-write/claude-code-denied-write.capture.json plus its .stdout.bin, read through the runtime's capture record shape; the same fixture T13 graded",
      "description": "one real guarded claude -p under --permission-mode dontAsk whose instruction attempted a write the policy denies: exit 0, model_request_count 1, a Write denial on a path inside the invocation's own work dir with required_read true, plus one Bash denial with no target",
      "seed_method": "recorded_external"
    },
    "seed/hosted-run-41139161972": {
      "entrypoint": ".kb-run-sprint/sprint-01-evaluator-evidence-spine/T11/evidence/reviewer-cycle-3-r0/hosted-run-41139161972-result.json (the recorded result artifact of the dispatched run the amendment cites)",
      "description": "a real downloaded harness-eval-result artifact whose four controls read missing-key, stale-cache and exit0-denied-read as could-not-run control-unobservable and hidden-image-judge as pass no-image-judge-in-child-tree, with every row hosted not-executed and qualified false",
      "seed_method": "recorded_external"
    },
    "seed/planted-row-mismatch": {
      "entrypoint": "a byte copy of the green fixture artifact (the producer's own cells/controls.json rows wrapped with run_id 41139161972) with one row's reason changed from pass to fail while control_id stays hidden-image-judge",
      "description": "an otherwise passing artifact with exactly one planted verdict/reason mismatch, so a gate that only counts four rows still exits 0 and the exact-pair gate exits 1",
      "seed_method": "migration_fixture"
    },
    "seed/optional-denial-stream": {
      "entrypoint": "createCapture over stdout bytes the test writes, observed through the real mapCapturedLine with an entry whose cwd is elsewhere, so the mapper declares required_read false for a Write denial outside the invocation's work dir",
      "description": "a captured stream whose only denial targets a path the invocation does not need: the real capture layer records required_read false after T14, and observeExit0DeniedRead must return null on it",
      "seed_method": "migration_fixture"
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
      "title": "A dispatched run's controls array carries the four exact verdict/reason pairs, each observed and qualified",
      "test_tier": "integration",
      "verify": "node --test tests/sprint-01/t15-hosted-controls.test.mjs --test-name-pattern t15-hosted-four-pairs",
      "test_file": "tests/sprint-01/t15-hosted-controls.test.mjs",
      "test_function": "t15-hosted-four-pairs",
      "positive_example": "the real producer step body, run over the real cells dir with GITHUB_RUN_ID set, writes four rows printing `missing-key could-not-run missing-api-key`, `stale-cache could-not-run installation-identity-mismatch`, `exit0-denied-read fail denied_tool_call` and `hidden-image-judge pass no-image-judge-in-child-tree`, each `hosted.status: \"observed\"`, `hosted.run_id` 41139161972, `discriminates: true` and `qualified: true`; the same body with no runner identity writes the same four pairs with `not-executed` and `qualified: false`.",
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "scenario": {
        "id": "SC-T15-AC1",
        "tier": "e2e-automated",
        "test_tier": "e2e",
        "negative_control": {
          "would_fail_if": [
            "the producer keeps calling qualifyControls without a hosted half, so every row in a dispatched artifact reads hosted not-executed and qualified false exactly as run 41139161972 did",
            "a stub producer writes hosted observed from a constant instead of the runner's own run identity, so a machine-local replay also claims the hosted half",
            "a row reaches qualified true with pair null, so the receipt claims a discrimination no paired measurement supports"
          ]
        },
        "evidence": {
          "forms": [
            "the four control rows control_id/verdict/reason/hosted/qualified/discriminates",
            "the cells/controls.json file the producer writes and reads back"
          ]
        },
        "topology_note": "the download job's producer step walks the cells dir the smoke matrix produced, stamps the hosted half from the runner's own identity, and calls qualifyControls then assertControlRows then writeControls; a machine-local replay runs the same body with no runner identity, so it must not claim the hosted half",
        "cases": [
          {
            "start_ref": "seed/real-cells-dir",
            "action": {
              "actor": "runner",
              "steps": [
                "GITHUB_ACTIONS=true GITHUB_RUN_ID=41139161972 GITHUB_RUN_ATTEMPT=1 node <the real producer step body read out of jobs.download>"
              ]
            },
            "end_state": {
              "must_observe": [
                "row 1 prints `missing-key could-not-run missing-api-key`",
                "row 2 prints `stale-cache could-not-run installation-identity-mismatch`",
                "row 3 prints `exit0-denied-read fail denied_tool_call`",
                "row 4 prints `hidden-image-judge pass no-image-judge-in-child-tree`",
                "cells/controls.json row count == 4",
                "all 4 rows read `qualified: true`",
                "all 4 rows read `hosted.status: \"observed\"`",
                "all 4 rows read `discriminates: true`",
                "every row's `hosted.run_id` equals 41139161972"
              ],
              "must_not_observe": [
                "any row reading `hosted.status: \"not-executed\"`",
                "any row with `pair: null`",
                "a row reading `could-not-run control-unobservable`",
                "4 rows present with 0 observations behind them"
              ]
            }
          },
          {
            "start_ref": "seed/real-cells-dir",
            "action": {
              "actor": "runner",
              "steps": [
                "run the same producer step body with every GITHUB_* variable absent, as a machine-local replay does"
              ]
            },
            "end_state": {
              "must_observe": [
                "the same 4 exact verdict/reason pairs are still written",
                "all 4 rows read `hosted.status: \"not-executed\"`",
                "all 4 rows read `qualified: false`",
                "cells/controls.json row count == 4"
              ],
              "must_not_observe": [
                "a row reading `qualified: true` on a machine-local replay",
                "a row reading `hosted.status: \"observed\"` with no run identity",
                "0 rows written, or 3 rows written"
              ]
            }
          }
        ]
      },
      "red_input": "on base main the producer calls qualifyControls({ observations, pairs }) with no hosted half, recordControl's hostHalf accepts only { status: \"observed\" } so qualified is unreachable, observeLeg returns a pair for stale-cache alone, and nothing makes a graded invocation attempt a denied write, so a dispatched artifact reads exit0-denied-read could-not-run control-unobservable with every row hosted not-executed (recorded run 41139161972); the owned test fails at import",
      "red_proof": ".tmp/sprint-01-verification/t15-hosted-controls.red.log",
      "description": "GIVEN seed/real-cells-dir WHEN the real producer step body runs twice, with and without the runner's identity THEN the four exact verdict/reason pairs are written both times, and only the run with a real run identity reports hosted observed, run-bound and qualified",
      "maps_to_ac": null
    },
    {
      "id": "AC-2",
      "type": "acceptance_criterion",
      "primary": true,
      "flow_ref": null,
      "title": "The controls gate asserts the four exact verdict/reason pairs, so a run that observed nothing fails loudly",
      "test_tier": "integration",
      "verify": "node --test tests/sprint-01/t15-hosted-controls.test.mjs --test-name-pattern t15-gate-refuses-mismatch",
      "test_file": "tests/sprint-01/t15-hosted-controls.test.mjs",
      "test_function": "t15-gate-refuses-mismatch",
      "positive_example": "the gate exits 0 on the green fixture and exits 1 on a byte copy with one row's reason flipped, naming `hidden-image-judge` and both expected and observed; it also exits 1 on the recorded run 41139161972 artifact, naming all four ids and `not-executed`.",
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "scenario": {
        "id": "SC-T15-AC2",
        "tier": "e2e-automated",
        "test_tier": "e2e",
        "negative_control": {
          "would_fail_if": [
            "the gate only counts rows, so an artifact whose four rows observed nothing still exits 0",
            "the gate compares a constant expectation instead of each row's own expect pair, so a flipped reason passes",
            "a hardcoded four-row list is asserted instead of the rows the run produced, so the gate passes on an empty run"
          ]
        },
        "evidence": {
          "forms": [
            "the gate CLI exit code",
            "the gate's ok flag and its named mismatches"
          ]
        },
        "topology_note": "one gate implementation in test/harness/controls/index.mjs runs two ways: the producer calls it in-run over the rows it just wrote, and the documented command runs it over a downloaded artifact; both read the same rows and the same expect pairs",
        "cases": [
          {
            "start_ref": "seed/planted-row-mismatch",
            "action": {
              "actor": "maintainer",
              "steps": [
                "node test/harness/controls/index.mjs --gate <the planted artifact>"
              ]
            },
            "end_state": {
              "must_observe": [
                "the gate exits 1",
                "the gate's mismatches name `hidden-image-judge`",
                "the mismatch states expected `pass` and observed `fail`"
              ],
              "must_not_observe": [
                "exit 0",
                "`ok: true`",
                "0 mismatches reported"
              ]
            }
          },
          {
            "start_ref": "seed/hosted-run-41139161972",
            "action": {
              "actor": "maintainer",
              "steps": [
                "node test/harness/controls/index.mjs --gate <the recorded run 41139161972 artifact>"
              ]
            },
            "end_state": {
              "must_observe": [
                "the gate exits 1",
                "the mismatches name all 4 control ids",
                "the mismatch names `hosted.status` `not-executed`"
              ],
              "must_not_observe": [
                "exit 0 on the artifact that observed nothing",
                "a pass recorded for `exit0-denied-read`",
                "0 mismatches on a 4-row artifact"
              ]
            }
          }
        ]
      },
      "red_input": "on base main assertControlRows enforces exactly four rows with schema-valid verdicts and nothing else, so an artifact whose four rows all read could-not-run control-unobservable passes every check the framework has and the run republishes as green",
      "red_proof": ".tmp/sprint-01-verification/t15-hosted-controls.red.log",
      "description": "GIVEN seed/planted-row-mismatch and seed/hosted-run-41139161972 WHEN the gate CLI runs over each THEN it exits 1 and names the mismatched ids, while the unflipped green fixture exits 0",
      "maps_to_ac": null
    },
    {
      "id": "TC-1",
      "type": "test_criterion",
      "primary": false,
      "description": "The workflow carries the probe and the hosted half without moving a pinned anchor: four jobs, the record step's literal anchor, exactly one upload of the cell record, one credential per model step, the producer's pinned call text unchanged",
      "verify": "node --test tests/sprint-01/t15-hosted-controls.test.mjs --test-name-pattern t15-workflow-wiring",
      "maps_to_ac": "AC-1",
      "test_file": "tests/sprint-01/t15-hosted-controls.test.mjs",
      "test_function": "t15-workflow-wiring",
      "test_tier": "integration",
      "positive_example": "the declaration reports no failures, the four job keys are unchanged, exactly one smoke step matches the cell-record upload path, the producer still contains qualifyControls({ observations, pairs }), and the claude-code model step's run text names runControlProbe while never spelling the upload path.",
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "scenario": {
        "id": "SC-T15-TC1",
        "tier": "e2e-automated",
        "test_tier": "integration",
        "negative_control": {
          "would_fail_if": [
            "the probe is added as a sixth row in the invocation table, so the cell carries 5 checks instead of 4 and the locked four-grade flow fails",
            "the probe command is pasted into the model step body with the literal upload path, so the recorder resolution moves onto a keyed step and the record step stops being the one that interpolates install_mode",
            "a stub probe export is referenced but never called, so the declaration inspects clean while no denied write is ever attempted"
          ]
        },
        "evidence": {
          "forms": [
            "inspectWorkflowDeclaration over the real workflow bytes",
            "the literal anchors the locked flows pin"
          ]
        },
        "topology_note": "the declaration inspector reads the real workflow bytes; the test asserts the properties the locked flows pin (four jobs, the record anchor, the single upload path, one credential per model step) plus the properties this task adds (the probe runs inside the claude-code model step and that step never spells the upload path)",
        "cases": [
          {
            "start_ref": "seed/hosted-run-41139161972",
            "action": {
              "actor": "runner",
              "steps": [
                "readWorkflow() + inspectWorkflowDeclaration(parseYaml(text))",
                "node --test tests/sprint-01/t15-hosted-controls.test.mjs --test-name-pattern t15-workflow-wiring"
              ]
            },
            "end_state": {
              "must_observe": [
                "declaration failures length == 0",
                "jobs keys sorted equal `[download, drift, grade, smoke]`",
                "exactly 1 smoke step whose run matches `cell/cell.json`",
                "the producer's run text contains `qualifyControls({ observations, pairs })`",
                "the claude-code model step's run text names `runControlProbe`",
                "exactly 4 check ids remain in CHECKS"
              ],
              "must_not_observe": [
                "a 5th job",
                "`cell/cell.json` inside the model step's run text",
                "0 steps matching the record anchor"
              ]
            }
          }
        ]
      },
      "flow_ref": null,
      "red_input": "on base main no step runs a denied-write probe, the producer passes no hosted half, and the model step's body has nothing to name; the owned test fails at import",
      "red_proof": ".tmp/sprint-01-verification/t15-hosted-controls.red.log"
    },
    {
      "id": "TC-2",
      "type": "test_criterion",
      "primary": false,
      "description": "The denied-write probe observes the control from a real denial and stays silent on an optional one: required_read true inside the probe's own work dir, false outside it, and a thrown probe leaves a named refusal instead of a lost cell",
      "verify": "node --test tests/sprint-01/t15-hosted-controls.test.mjs --test-name-pattern t15-denied-write-probe",
      "maps_to_ac": "AC-1",
      "test_file": "tests/sprint-01/t15-hosted-controls.test.mjs",
      "test_function": "t15-denied-write-probe",
      "test_tier": "integration",
      "positive_example": "the archived capture yields fail denied_tool_call with process_exit_code 0 and a named Write target ending keep.txt, the mapper declares required_read true inside the probe's cwd and false outside it, and a probe that throws leaves cell/denied-write-probe.json with a reason while the step exits 0.",
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "scenario": {
        "id": "SC-T15-TC2",
        "tier": "e2e-automated",
        "test_tier": "integration",
        "negative_control": {
          "would_fail_if": [
            "the probe prompt asks for a read the policy allows, so no denial is ever recorded and exit0-denied-read stays unobservable",
            "requiredness is hardcoded true for every denial, so a denial on a path the invocation does not need would also be read as the control",
            "a thrown probe aborts the model step, so the matrix loses the cell instead of reporting a named refusal"
          ]
        },
        "evidence": {
          "forms": [
            "the capture record with its observations, stream offsets and stdout sha256",
            "the attached control_observations and control_pairs entries on the cell record"
          ]
        },
        "topology_note": "the probe reuses the adapter's graded argv and the shared guard, so the child runs under the same recorded stance as every graded invocation; requiredness is declared by the adapter's own mapper against the probe's cwd, and the capture layer records what the mapper declared",
        "cases": [
          {
            "start_ref": "seed/denied-write-capture",
            "action": {
              "actor": "runner",
              "steps": [
                "node --test tests/sprint-01/t15-hosted-controls.test.mjs --test-name-pattern t15-denied-write-probe"
              ]
            },
            "end_state": {
              "must_observe": [
                "the archived capture yields `fail denied_tool_call` with `process_exit_code` 0",
                "the mapper returns `required_read: true` for a target under the probe's own cwd",
                "attachDeniedWriteProbe writes `control_observations.exit0-denied-read` and reads it back",
                "the observation carries the probe's `stdout_sha256`"
              ],
              "must_not_observe": [
                "an observation assembled from a constant instead of the record",
                "0 denials recorded while the row reads `fail`",
                "a `pass` verdict beside exit 0"
              ]
            }
          },
          {
            "start_ref": "seed/optional-denial-stream",
            "action": {
              "actor": "runner",
              "steps": [
                "observeExit0DeniedRead over the stream whose only denial targets a path outside the invocation's work dir"
              ]
            },
            "end_state": {
              "must_observe": [
                "the mapper declares `required_read: false` for the outside target",
                "observeExit0DeniedRead returns null, so the control stays unobserved"
              ],
              "must_not_observe": [
                "a `fail denied_tool_call` row for an optional denial",
                "a null requiredness read as permission",
                "0 observations reported as an observation"
              ]
            }
          }
        ]
      },
      "flow_ref": null,
      "red_input": "on base main the adapter exposes no probe, so no graded invocation attempts a denied write and observeExit0DeniedRead can only ever return null on a hosted run",
      "red_proof": ".tmp/sprint-01-verification/t15-hosted-controls.red.log"
    },
    {
      "id": "TC-3",
      "type": "test_criterion",
      "primary": false,
      "description": "All four rows carry a paired measurement that came out the other way, so discriminates is computed rather than claimed: missing-key from an authenticated admission, stale-cache from a matching digest, exit0-denied-read from an optional denial, hidden-image-judge from a planted image line",
      "verify": "node --test tests/sprint-01/t15-hosted-controls.test.mjs --test-name-pattern t15-pairs-discriminate",
      "maps_to_ac": "AC-1",
      "test_file": "tests/sprint-01/t15-hosted-controls.test.mjs",
      "test_function": "t15-pairs-discriminate",
      "test_tier": "integration",
      "positive_example": "control_pairs holds all four ids, each pair's verdict/reason differs from its control's expect pair, discriminates reads true for all four, and the hidden-image-judge pair names a planted file with a byte offset.",
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "scenario": {
        "id": "SC-T15-TC3",
        "tier": "e2e-automated",
        "test_tier": "integration",
        "negative_control": {
          "would_fail_if": [
            "the pair for missing-key is absent, so the row publishes pair null and discriminates false while its authenticated half ran in the same run",
            "a caller-supplied discriminates boolean is copied onto the row instead of computed from the pair's own outcome, so a guard that refuses unconditionally still claims discrimination",
            "the planted image twin is scanned in place of the run's own bytes, so the pair proves a fixture rather than the scanner"
          ]
        },
        "evidence": {
          "forms": [
            "the four control_pairs entries on the cell records",
            "the computed discriminates flag on each row"
          ]
        },
        "topology_note": "each pair is a real second measurement on the same code path: the authenticated guard admission for missing-key, the matching digest for stale-cache, the optional denial for exit0-denied-read, and a planted image line in a scratch copy of the run's own bytes for hidden-image-judge",
        "cases": [
          {
            "start_ref": "seed/real-cells-dir",
            "action": {
              "actor": "runner",
              "steps": [
                "node --test tests/sprint-01/t15-hosted-controls.test.mjs --test-name-pattern t15-pairs-discriminate"
              ]
            },
            "end_state": {
              "must_observe": [
                "all 4 control ids appear in control_pairs",
                "each pair's verdict/reason differs from its control's expect pair",
                "discriminates reads true for all 4 rows",
                "the hidden-image-judge pair reads `fail image-judge-in-child-tree` with `planted: true`"
              ],
              "must_not_observe": [
                "pair null for `missing-key`",
                "a pair identical to its control's outcome counted as discrimination",
                "discriminates true with 0 pair measurements behind it"
              ]
            }
          }
        ]
      },
      "flow_ref": null,
      "red_input": "on base main observeLeg returns a pair for stale-cache only and attachMissingKey attaches none, so two rows publish pair null and discriminates false even though the authenticated cells ran in the same run",
      "red_proof": ".tmp/sprint-01-verification/t15-hosted-controls.red.log"
    },
    {
      "id": "TC-4",
      "type": "test_criterion",
      "primary": false,
      "description": "The hosted claim is bound to the run that publishes it: the gate requires each row's hosted.run_id to equal the artifact's run_id, and still refuses a short or duplicated controls array",
      "verify": "node --test tests/sprint-01/t15-hosted-controls.test.mjs --test-name-pattern t15-gate-run-binding",
      "maps_to_ac": "AC-2",
      "test_file": "tests/sprint-01/t15-hosted-controls.test.mjs",
      "test_function": "t15-gate-run-binding",
      "test_tier": "integration",
      "positive_example": "the gate exits 0 on the green fixture with run_id 41139161972, exits 1 on the same rows carrying run_id 41086556471, and exits 1 on a three-row or duplicated-id array.",
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "scenario": {
        "id": "SC-T15-TC4",
        "tier": "e2e-automated",
        "test_tier": "integration",
        "negative_control": {
          "would_fail_if": [
            "the gate accepts any artifact whose controls array has four entries, so a stub artifact copied from a different run id passes",
            "the gate compares the run id loosely, so a stale cached artifact from an earlier attempt is accepted as this attempt's receipt",
            "a duplicated control id counts as four rows, so assertControlRows is bypassed"
          ]
        },
        "evidence": {
          "forms": [
            "the gate CLI exit code and its ok flag",
            "the named mismatches per run id and per duplicate id"
          ]
        },
        "topology_note": "the gate reads the artifact's own run_id and requires every row's hosted.run_id to match it, which ties the hosted claim to the run that published the artifact rather than to whatever produced the rows",
        "cases": [
          {
            "start_ref": "seed/planted-row-mismatch",
            "action": {
              "actor": "maintainer",
              "steps": [
                "node test/harness/controls/index.mjs --gate <green fixture with its own run id>",
                "node test/harness/controls/index.mjs --gate <the same rows carrying run id 41086556471>"
              ]
            },
            "end_state": {
              "must_observe": [
                "the green fixture with run_id 41139161972 exits 0",
                "the same rows with run_id 41086556471 exit 1",
                "a duplicated control id exits 1"
              ],
              "must_not_observe": [
                "exit 0 on a mismatched run id",
                "`ok: true` on a 3-row array",
                "0 mismatches reported for a duplicate id"
              ]
            }
          }
        ]
      },
      "flow_ref": null,
      "red_input": "on base main there is no gate at all, so nothing compares a row's hosted claim with the artifact's own run identity and a stale artifact from an earlier attempt reads the same as this attempt's",
      "red_proof": ".tmp/sprint-01-verification/t15-hosted-controls.red.log"
    }
  ]
}
-->

## Handoff

_To be written by the implementer when the work lands: `task`, `commit_sha`, `done`, `deviations`, `concerns`, `findings`, `scope_impact`, `feedback` — the shape T13's Handoff block uses._

## Review

_To be written by the reviewer: verdict (`APPROVED` or `NEEDS_FIXES`), a file and line for each finding, the six gate commands with their observed exit codes and counts, the five-file regression result, and `git diff --name-only` against the WRITE-ALLOWED list._
