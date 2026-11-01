# TASK-T17 — The product writes its own verify report, and the cell ships it

> Task ID: T17
> Sprint: [SPRINT.md](./SPRINT.md)
> Status: ✅ Completed

Commit: 3e05f29416304f09be047470cddbd03e9934b3af
> Assignee: ai-tooling-implementer
> Priority: P0
> Points: 5
> Type: FEATURE
> Planner: evals-planner
> Reviewer: evals-reviewer
> Wave: 4
> Depends On: T5, T7, T16
> TDD_MODE: red_first · RED_GREEN_REQUIRED: true

AGENT: planner=evals-planner | implementer=ai-tooling-implementer | reviewer=evals-reviewer

**Depends on:** T5 (`gradeCheck`, `readVerifyReport`, `bindReport`, `promptFor`, `INVOCATIONS`), T7 (`prepareRunDirs`/`bindReportPath`, the minted `invocation_id` and the case-declared bound path), T16 (the declared verify surface in `verifyReportPrompt`, `VERIFY_REPORT_CONTRACT`, and the path-scoped stance this task must not widen).
**Blocks:** human-testing-gate step 6 (four graded checks on the pinned cell), step 8 (the downloaded report at the case-declared path), T11's four integration obligations, T12's review of the graded output.

## Background

- **Source:** the owner's recorded authorization for this amendment, `.kb-run-sprint/sprint-01-evaluator-evidence-spine/decisions/amendment-T17.decision.json` (questions 1, 3 and 5 answered `true`; question 2 `false`: T16's review is APPROVED and its status fix is proven on the same run).
- **What the dispatched run proves:** run **41249460968**, archived at `.kb-run-sprint/sprint-01-evaluator-evidence-spine/T16/hosted/run-41249460968/harness-eval-result-41249460968-1/grade/harness-eval-result.json`. On both claude-code cells `command_list` and `status` read `pass`, and `verify` reads `fail report-missing` twice (planted and clean). T16 declared the case-declared path, the minted `invocation_id`, the case id and the `verify-report/v1` body contract in the prompt, and its stance allow-listed exactly that one file — and no report appeared.
- **Defect (a) — a permission policy is not a writer.** `--permission-mode dontAsk` (`test/harness/runtime/stance.mjs`, `stanceArgv`) denies every tool call no rule allows, and an `Edit(<path>)` allow rule admits a write at that path; it does not make a headless `claude -p` produce one. The instruction to write arrived as prose appended after the slash command (`test/harness/adapters/claude-code.mjs:262-268`, `promptFor`), which is the command's `$ARGUMENTS`: text the product's own verify path never parses, for a body whose `observed_verify_outcome` and `evidence.drifted_keys` can only come from a catalog run. So the graded file was neither required by the product nor producible by the invocation's tool set, and both verify blocks stayed red.
- **Defect (b) — nothing uploads a report even if one exists.** `.github/workflows/harness-eval.yml:458-463` downloads `pattern: harness-eval-verify-*` into `verify-reports`, and `:493-501` uploads the recorder's bundle as `harness-eval-verify-reports-<run>-<attempt>`. No smoke step uploads a per-cell `harness-eval-verify-*` artifact, so `test/harness/recorder.mjs:155-176` (`writeVerifyReceipt`) walks an empty directory and writes `"no verify report artifact arrived for this attempt"`. Sprint gate step 8 then downloads a bundle holding an index and nothing else.
- **Why the report does not ride a new artifact — a locked constraint found at planning time.** `tests/sprint-01/t11-controls-wiring.test.mjs:296-304` asserts that **every** `actions/upload-artifact` step in `jobs.smoke` ships exactly `path: cell/cell.json`, and `tests/sprint-01/run-02-hand.test.mjs:169` pins the job list to `[download, drift, grade, smoke]`. A second per-cell upload, or a fifth job, fails a locked test — and buying green by editing that test is forbidden. `cell/cell.json` is therefore the only file the smoke job can ship, and the report must travel inside it. That is the established mechanism in this repo: T15 attaches `control_observations` and `control_pairs` to the same record, and the recorder reads them there.
- **Gate steps:** 6 and 8. **Capability:** CAP-EVAL-01. **PRD:** `09-technical-requirements/04-uc-grd.md` UC-GRD-02, UC-GRD-03, UC-GRD-04, UC-GRD-05; `02-system-components.md` § grade recorder; `10-e2e-testing.md`.
- **Current (consumed):** T16's `verifyReportPrompt` (path, id, case id, ten declared fields, outcome rule) and its declaration that the report's writer is the invocation; T7's `prepareRunDirs`/`bindReportPath` identity; T5's `readVerifyReport`/`bindReport` pass rule; the recorder's `writeVerifyReceipt` and `uploadPlan`.
- **Desired (provided):** the product's own verify path writes the report at the case-declared relative path, echoing the invocation id it is given, and the job publishes those exact bytes at the bundle path step 8 reads. The harness supplies the path and the id; it never writes a byte of the body.

## Critical Constraints

- MUST keep the report's **writer in the product**: `plugins/pixel-perfect/scripts/verify-report.mjs` runs the product's own `verify-catalog.mjs --check` and writes the body. No harness module — adapter, cell, model step, grader, recorder — may write the graded report or synthesise its content. `readVerifyReport` must keep grading bytes the product produced.
- MUST carry the path and the invocation id in a form the product can **parse**: explicit `--report <case-relative path>` and `--invocation-id <minted id>` arguments appended to the slash command, never only prose. The prompt's first token MUST stay `/pixel-perfect:<command>` so each graded invocation still exercises the product's own command.
- MUST echo the id **verbatim**. The writer must refuse to write at all when no id is given (`report-invocation-id-missing`), so an unbound body cannot exist: `bindReport` (`claude-code.mjs:1261-1268`) refuses a mismatched id, and a borrowed body must still grade `fail report-mismatched-invocation`.
- MUST derive the outcome from the product's own catalog check, never from a flag, a case id or the model's opinion: `observed_verify_outcome` is `defect-detected` iff `verify-catalog.mjs --check --json` reports at least one drifted key.
- MUST confine the write: refuse an absolute `--out`, a `..` segment, a non-`.json` leaf, and a publish directory that is not absolute. The write happens only inside the invocation's working directory, at the case manifest's own `report_relative_path`.
- MUST NOT widen any permission. `test/harness/runtime/stance.mjs` is write-prohibited here: the approved mode and the single-path allow-list are T16's, and this task must not add a Bash rule, a directory, or a second path to reach the writer.
- MUST keep `readVerifyReport`, `bindReport`, `statusFacts`, `CHECKS`, `INVOCATIONS`, `gradedArgv` and `prepareRunDirs` unchanged, and MUST NOT add a fallback for a missing report (no glob, no "newest file", no `could-not-run` in place of `report-missing`).
- MUST ship the report through the only file the smoke job may upload: attach the product's published bytes, the case-relative path and their `sha256` to `cell/cell.json` as `verify_reports`, and leave the record untouched when nothing was published. The smoke job MUST gain no second `actions/upload-artifact` step, and the workflow MUST gain no fifth job.
- MUST keep the grade job's verify download working when nothing arrived: the `pattern: harness-eval-verify-*` download stays the shape a per-cell artifact would arrive in, tolerates an empty match, and the staging step writes the cell-carried reports beside it under `reports/` for the pinned claude-code cell and under `<harness>-<track>/reports/` for any other cell, so no two cells can overwrite each other and gate step 8 reads `reports/verify-button-drift.json`.
- MUST verify transport: the staging step recomputes each report's `sha256` and fails the step when it differs from the carried digest, so a corrupted copy is named rather than graded as a product failure.
- MUST keep the product's report step honest about detection: a detected defect is a successful report, not a failed step. The writer exits `0` when it wrote a report, whatever the outcome.

## Specification

### Seam 1 — the product's report writer

New: `plugins/pixel-perfect/scripts/verify-report.mjs`. Zero dependencies, same idiom as `verify-catalog.mjs` and `gate.mjs`, ESM, run with `node`.

```
node plugins/pixel-perfect/scripts/verify-report.mjs \
  --out <case-relative path>          # e.g. reports/verify-button-drift.json
  --invocation-id <id>                # echoed verbatim into the body
  --case-id <id> --harness <h> --track <pinned|newest> \
  [--platform <id>] [--project <root>] [--publish-dir <absolute dir>] [--json]
```

Behavior, in this order:

1. **Refuse before writing.** Exit `3` with one JSON line `{ ok: false, reason, detail }` and **no file created** for: `report-invocation-id-missing` (absent, empty or whitespace id), `report-out-missing`, `report-out-not-relative` (absolute, or a `..` segment), `report-out-not-json`, `publish-dir-not-absolute`, `catalog-check-unreadable`. Exit `2` for an unknown flag or a missing `--case-id`/`--harness`/`--track`.
2. **Run the product's own check.** `node <plugin>/scripts/verify-catalog.mjs --check <project> --platform <platform> --json`, reading its JSON report. The catalog's exit code decides the outcome; the writer never trusts a caller's claim about the project.
3. **Write the body** at `--out`, creating parent directories, atomically (`.partial` + rename), with exactly the ten declared keys from `VERIFY_REPORT_CONTRACT` (`claude-code.mjs:206-222`): `schema: "verify-report/v1"`, `harness`, `track`, `invocation_id` (verbatim), `case_id`, `observed_verify_outcome`, `observed_defect_key` (first drifted key, or `null`), `expected_defect_key` (the key the check reported, or `null`), `evidence: { drifted_keys: [...] }`, `clean_project_failed` (`true` when the catalog check reported any failure at all; `false` on a clean project, which is what gate step 8 reads on the twin).
4. **Publish, when asked.** With `--publish-dir` or `PIXEL_PERFECT_VERIFY_PUBLISH_DIR`, write a byte-identical copy at `<publish-dir>/<the same relative path>` and print both `{ path, bytes, sha256 }` receipts, so a job can ship the report while the graded copy stays inside the invocation's directory. A publish directory that cannot be created is a refusal, not a silent skip.
5. Print `{ ok: true, out, publish, outcome, drifted_keys, sha256 }` and exit `0`.

### Seam 2 — the product's verify path owns the step

- `plugins/pixel-perfect/workflows/verify.md`: document `--report <path>` and `--invocation-id <id>` in **Options**, and add one section, "Machine-readable verify report": when `--report` is given, the verify run **ends** by producing that report with `scripts/verify-report.mjs`, echoing the given id exactly, writing no other file, and treating a detected defect as a successful report. The section names the ten keys and states that a report without the given id is invalid, so the product refuses its own unbound output.
- `plugins/pixel-perfect/commands/verify.md`: list the two new inputs in "Inputs and prerequisites" and say the report is written by the workflow's report step.
- `plugins/pixel-perfect/README.md` (only if it documents verify options): one row for the same two flags. No other product doc changes.

### Seam 3 — the harness supplies the path and the id, in a form the plugin parses

`test/harness/adapters/claude-code.mjs`, one addition beside `verifyReportPrompt`:

- `verifyReportArgs({ caseManifest, invocationId })` returns `["--report", caseManifest.report_relative_path, "--invocation-id", invocationId]` for a `kind: "verify"` case with a declared path and a minted id, and `[]` otherwise.
- `promptFor` composes `[/pixel-perfect:<command>, ...caseArgs, ...verifyReportArgs(...), verifyReportPrompt(...)].join(" ")`, so the slash command and its parsed arguments come first and T16's declared prose surface follows unchanged. `first-question-init` and `status` prompts stay byte-identical.

Nothing else in the adapter changes: the publish directory reaches the invocation as the ordinary inherited environment variable the workflow sets on the keyed step (`PIXEL_PERFECT_VERIFY_PUBLISH_DIR`), which the guard already passes through (`test/harness/runtime/guard.mjs:107-114`, `childEnvFor`).

### Seam 4 — the bytes reach the recorder's bundle

`.github/workflows/harness-eval.yml`:

1. The keyed `claude-code` step (`:116-123`) gains one environment line: `PIXEL_PERFECT_VERIFY_PUBLISH_DIR: ${{ github.workspace }}/cell/verify-upload`.
2. New step **"Attach this cell's verify reports"**, `if: always()` and only for `matrix.harness == 'claude-code'`: an inline `node --input-type=module -e` body (the idiom at `:228-256` and `:138-159`) that reads `cell/verify-upload/reports/*.json`, records `{ path: "reports/<name>", bytes, sha256, body }` for each into `cell/cell.json` as `verify_reports`, and prints a receipt. No file → no key added; the record is left exactly as the leg wrote it.
3. The grade job's `pattern: harness-eval-verify-*` download (`:458-463`) gains `continue-on-error: true`, because a run whose cells produced no report must still reach the recorder and report the absence by name.
4. New step **"Stage the verify reports"** between that download and the recorder: reads every `cells/**/cell.json`, and writes each `verify_reports[]` entry into `verify-reports/reports/<name>` for `claude-code`/`pinned` and into `verify-reports/<harness>-<track>/reports/<name>` for any other cell; recomputes `sha256` and exits `1` on a mismatch. `HARNESS_EVAL_VERIFY_DIR` stays `verify-reports`, so `writeVerifyReceipt` bundles `reports/verify-button-drift.json` and `reports/verify-clean.json` at the bundle root.
5. The recorder call and the `harness-eval-verify-reports-<run>-<attempt>` upload (`:468-501`) are unchanged.

### What does not change

| Surface | Change |
|---|---|
| `readVerifyReport`, `bindReport`, `statusFacts`, `CHECKS`, `INVOCATIONS`, `gradedArgv`, `prepareRunDirs`, `bindReportPath` | none |
| `test/harness/runtime/**` (the stance and its one-path allow-list) | none |
| `test/harness/graders/**`, `test/harness/recorder/**`, `test/harness/cases/**`, `test/harness/kit/**`, `test/harness/smoke/**` | none |
| the smoke job's upload steps and its `path: cell/cell.json` | none (locked by t11) |
| the job list `[download, drift, grade, smoke]` | none (locked by run-02-hand) |
| `verifyReportPrompt`'s declared text | none — the argument pair is added ahead of it |

## Acceptance Criteria (GIVEN-WHEN-THEN)

### AC-1: The product writes its own report at the case-declared path under the id it was given, and the real reader grades it `pass` (PRIMARY)

- **GIVEN:** `seed/verify-pair` — the two entries `prepareVerifyPair()` mints (each with its own `invocation_id`, its own directory, and its own case-declared bound path), each carrying the kit project its case declares (planted overlay; untouched twin)
- **WHEN:** the product's writer runs from each entry's directory with that entry's `--out` and `--invocation-id`, and the written file is graded through the real `readVerifyReport` with that entry
- **THEN:** the planted body reads `{ ok: true, observed_verify_outcome: "defect-detected" }` with `evidence.drifted_keys` containing `atoms/Button/default`, the clean twin reads `{ ok: true, observed_verify_outcome: "clean", clean_project_failed: false }`, neither reads `report-missing`, and a byte copy of the planted body carrying the clean side's id reads `fail report-mismatched-invocation`

```text
TEST_TIER:             integration
VERIFICATION_SERVICE:  local: the product's own verify-report.mjs run over the materialized kit, graded through the real readVerifyReport of the entry prepareVerifyPair minted, node --test (no dispatch)
SURFACE_POLICY:        .spec/e2e-policy/sprint-01/artifact-only-read.json
TDD_STATE:             red_first
VERIFY:                node --test --test-name-pattern t17-product-writes-report tests/sprint-01/t17-verify-report-writer.test.mjs
EXPECT:                exit 0 · TAP `ok` for t17-product-writes-report · fail 0
```

- **RED input (fails on base):** on base main there is no `plugins/pixel-perfect/scripts/verify-report.mjs`, so the invocation has no product code that writes a report; the only writer is the prompt's prose, and the dispatched run 41249460968 records `verify fail report-missing` on both claude-code cells (`.kb-run-sprint/sprint-01-evaluator-evidence-spine/T16/hosted/run-41249460968/harness-eval-result-41249460968-1/grade/harness-eval-result.json`).
- **RED proof:** `.tmp/sprint-01-verification/t17-verify-report-writer.red.log`
- **positive_example (passes after landing):** planted `{ ok: true, observed_verify_outcome: "defect-detected", observed_defect_key: "atoms/Button/default", clean_project_failed: true }`; clean `{ ok: true, observed_verify_outcome: "clean", observed_defect_key: null, clean_project_failed: false }`; borrowed id `{ ok: false, verdict: "fail", reason: "report-mismatched-invocation", expected: <planted id>, seen: <clean id> }`.
- **Hosted receipt (the sprint gate, not this test's proof):** a dispatched `harness-eval` run whose pinned claude-code cell prints `verify pass`, and whose recorder index for the attempt carries `reason: null` with both `reports/*.json` entries.

SCENARIO_SUMMARY: complete SCENARIO lives once, in this AC's row of the REQUIREMENT-CONTRACT block below.

### AC-2: The report's bytes reach the recorder's bundle at the path gate step 8 reads

- **GIVEN:** `seed/report-published` — the two report bodies the writer publishes for the planted and clean entries, each with the `sha256` its receipt printed
- **WHEN:** the bodies are placed in the download-shaped `verify-reports/` layout the grade job stages, and the real `writeVerifyReceipt` bundles them
- **THEN:** the bundle holds `reports/verify-button-drift.json` and `reports/verify-clean.json`, each with the `sha256` the writer printed, and the index reads `reason: null`; with no report present the index names the directory it looked in instead of inventing one

```text
TEST_TIER:             integration
VERIFICATION_SERVICE:  local: the real recorder writeVerifyReceipt over a staged verify-reports layout, node --test (no dispatch)
SURFACE_POLICY:        .spec/e2e-policy/sprint-01/artifact-only-read.json
TDD_STATE:             red_first
VERIFY:                node --test --test-name-pattern t17-report-reaches-recorder tests/sprint-01/t17-verify-report-writer.test.mjs
EXPECT:                exit 0 · TAP `ok` for t17-report-reaches-recorder · fail 0
```

- **RED input (fails on base):** on base no step stages or uploads a report, so `writeVerifyReceipt` over the run's layout writes `{"reports": [], "reason": "no verify report artifact arrived for this attempt (looked in verify-reports)"}` — the reason recorded by run 41249460968's recorder log.
- **RED proof:** `.tmp/sprint-01-verification/t17-verify-report-writer.red.log`
- **positive_example (passes after landing):** `{ reports: [{ path: "reports/verify-button-drift.json", sha256: <writer receipt> }, { path: "reports/verify-clean.json", sha256: <writer receipt> }], reason: null }`.
- **Hosted receipt (the sprint gate):** sprint gate step 8 — `gh run download <run> -n harness-eval-verify-reports-<run>-1` then `jq -r '.expected_defect_key + " " + .observed_defect_key + " " + .observed_verify_outcome' .../reports/verify-button-drift.json` prints `atoms/Button/default atoms/Button/default defect-detected`.

SCENARIO_SUMMARY: complete SCENARIO lives once, in this AC's row of the REQUIREMENT-CONTRACT block below.

### AC-3: Four checks, five invocations, twelve cells and every neighbour hold still (PRIMARY)

- **GIVEN:** `seed/dispatched-run-41249460968` (the recorded twelve-cell artifact this task repairs) and the live module in its working tree
- **WHEN:** `CHECKS`/`invocationTable()` are read from the changed module, the artifact's cells are read, and the six locked GRD/run-02 files plus T16's owned file run beside the new lane file
- **THEN:** `CHECKS` still holds the four ids, `invocationTable()` still holds five entries with four distinct check ids, the artifact still parses as twelve unique `(harness, track)` cells with the ten non-claude cells keeping their five named reasons, the pinned cell's `status` still reads `pass`, and every locked file reports its recorded baseline (`pass 76` for the six, `pass 7` for T16's own file)

```text
TEST_TIER:             integration
VERIFICATION_SERVICE:  local: the changed module's tables + the recorded 12-cell artifact + the six locked flows + T16's owned file, node --test (no dispatch)
SURFACE_POLICY:        .spec/e2e-policy/sprint-01/artifact-only-read.json
TDD_STATE:             red_first
VERIFY:                node --test --test-name-pattern t17-cell-shape-and-neighbours tests/sprint-01/t17-verify-report-writer.test.mjs
EXPECT:                exit 0 · TAP `ok` for t17-cell-shape-and-neighbours · fail 0
```

- **RED input (fails on base):** the shape assertions pass on base; the RED half is the owned file's first assertion — `plugins/pixel-perfect/scripts/verify-report.mjs` does not exist — so the file is red before the fix and green after, while the shape it wraps must stay green throughout.
- **RED proof:** `.tmp/sprint-01-verification/t17-verify-report-writer.red.log`
- **positive_example (passes after landing):** `CHECKS.length === 4`, `invocationTable().length === 5`, `new Set(table.map((e) => e.check_id)).size === 4`, the artifact yields 12 cells with 5 distinct non-claude reasons including `missing-api-key`, the pinned cell's `status` reads `pass`, and the regression reports `pass 76` / `fail 0` plus `pass 7` / `fail 0` for T16's file.

SCENARIO_SUMMARY: complete SCENARIO lives once, in this AC's row of the REQUIREMENT-CONTRACT block below.

## Test Criteria

### TC-1: The body is the declared contract, computed by the catalog check

- **Verify:** `node --test --test-name-pattern t17-report-body-contract tests/sprint-01/t17-verify-report-writer.test.mjs`
- **Expected:** exit 0, `pass 1`, `fail 0`; the written body's own key set equals `VERIFY_REPORT_CONTRACT.fields` mapped to ten real keys (`schema`, `harness`, `track`, `invocation_id`, `case_id`, `observed_verify_outcome`, `observed_defect_key`, `expected_defect_key`, `evidence`, `clean_project_failed`) with `evidence` holding exactly `drifted_keys`; `schema` is `verify-report/v1`, `harness`/`track` come from the arguments, `invocation_id` is the argument verbatim; on the planted kit `observed_verify_outcome` is `defect-detected` and `drifted_keys` equals the catalog's own drifted list; on the untouched kit it is `clean` with `drifted_keys` `[]` and `clean_project_failed` `false`; the published copy's `sha256` equals the graded file's.
- **Locked scenarios:** `SC-T17-TC1`.

### TC-2: The writer refuses anything it cannot bind or cannot honestly write

- **Verify:** `node --test --test-name-pattern t17-writer-refuses-unbindable tests/sprint-01/t17-verify-report-writer.test.mjs`
- **Expected:** exit 0, `pass 1`, `fail 0`; no `--invocation-id` exits `3` with `report-invocation-id-missing` and creates no file; an empty or whitespace id does the same; `--out /abs.json`, `--out ../escape.json` and `--out reports/notjson` each exit `3` with `report-out-not-relative`/`report-out-not-json` and leave the directory unchanged; a relative `--publish-dir` exits `3` with `publish-dir-not-absolute` and still writes no graded file; re-running over an existing report rewrites it atomically and leaves no `.partial` file; a detected defect still exits `0` with `observed_verify_outcome: "defect-detected"`.
- **Locked scenarios:** `SC-T17-TC2`.

### TC-3: The prompt carries the path and the id as parsed arguments, and the harness writes nothing

- **Verify:** `node --test --test-name-pattern t17-prompt-carries-path-and-id tests/sprint-01/t17-verify-report-writer.test.mjs`
- **Expected:** exit 0, `pass 1`, `fail 0`; `invocationTable({ dirs }).find(e => e.case_id === "verify-button-drift").prompt` starts with `/pixel-perfect:verify --platform web-desktop`, contains `--report reports/verify-button-drift.json` and `--invocation-id <that entry's id>`, and still carries T16's declared field names; the clean entry carries `--report reports/verify-clean.json` and a **different** id; neither prompt matches `/atoms\/Button\/default/`, `/[0-9a-f]{64}/` or `/offset/`; `first-question-init`'s prompt is byte-identical to base; the adapter source contains `0` occurrences of `writeVerifyReport` and `0` writes to a `reports/` path; with the report file removed the grade is still `fail report-missing`.
- **Locked scenarios:** `SC-T17-TC3`.

### TC-4: The published bytes reach the bundle shape the download and step 8 expect

- **Verify:** `node --test --test-name-pattern t17-upload-shape-matches-download tests/sprint-01/t17-verify-report-writer.test.mjs`
- **Expected:** exit 0, `pass 1`, `fail 0`; every `actions/upload-artifact` step in `jobs.smoke` still ships exactly `path: cell/cell.json`; the grade job's verify download keeps `pattern: harness-eval-verify-*` and `continue-on-error: true`; the staging step writes `reports/<name>` for `claude-code`/`pinned` and `<harness>-<track>/reports/<name>` otherwise; `uploadPlan({ runId: "41249460968", attempt: 1 })` names the bundle `harness-eval-verify-reports-41249460968-1` and the workflow's final upload uses that exact name with `path: grade/verify-reports`; `writeVerifyReceipt` over the staged layout yields `reports/verify-button-drift.json` with a `sha256` equal to the writer's receipt; a foreign `harness-eval-verify-reports-…` directory is ignored by the staging step rather than re-bundled.
- **Locked scenarios:** `SC-T17-TC4`.

## Locked scenarios

The scenarios are carried once, as JSON, in the REQUIREMENT-CONTRACT block at the end of this file (T13/T15/T16's shape). This table is the index; it is not a second copy.

| Scenario | Requirement | What it locks |
|---|---|---|
| `SC-T17-AC1` | AC-1 | the product writes the report, bound to the id it was given, refused when borrowed |
| `SC-T17-AC2` | AC-2 | the bundle carries both reports at the case-declared paths with their digests, and names an absence |
| `SC-T17-AC3` | AC-3 | four checks, five invocations, twelve cells, ten untouched neighbours |
| `SC-T17-TC1` | TC-1 | the body is the declared contract computed by the catalog check |
| `SC-T17-TC2` | TC-2 | the writer refuses what it cannot bind or honestly write |
| `SC-T17-TC3` | TC-3 | the path and id are parsed arguments and no harness writes |
| `SC-T17-TC4` | TC-4 | the published bytes land in the layout the recorder and step 8 read |

## Guardrails

WRITE-ALLOWED:

- plugins/pixel-perfect/scripts/verify-report.mjs (new)
- plugins/pixel-perfect/workflows/verify.md
- plugins/pixel-perfect/commands/verify.md
- plugins/pixel-perfect/README.md (only the verify-options row)
- .github/workflows/harness-eval.yml
- test/harness/adapters/claude-code.mjs (only `verifyReportArgs` and its composition in `promptFor`)
- tests/sprint-01/t17-verify-report-writer.test.mjs (new)

WRITE-PROHIBITED:

- test/harness/runtime/** (the stance and its one-path allow-list: no Bash rule, no second path)
- test/harness/graders/**
- test/harness/smoke/cell.mjs
- test/harness/smoke/model-step.mjs
- test/harness/smoke/observations.mjs
- test/harness/smoke/image-scan.mjs
- test/harness/recorder/**
- test/harness/cases/**
- test/harness/kit/**
- tests/sprint-01/grd-01-twelve-cells.test.mjs
- tests/sprint-01/grd-02-four-grades.test.mjs
- tests/sprint-01/grd-03-evidence.test.mjs
- tests/sprint-01/grd-04-named-path.test.mjs
- tests/sprint-01/grd-05-clean-twin.test.mjs
- tests/sprint-01/grd-06-missing-key.test.mjs
- tests/sprint-01/run-02-hand.test.mjs
- tests/sprint-01/t11-controls-wiring.test.mjs
- tests/sprint-01/t13-smoke-observations.test.mjs
- tests/sprint-01/t14-capture-requiredness.test.mjs
- tests/sprint-01/t15-hosted-controls.test.mjs
- tests/sprint-01/t16-claude-code-grades.test.mjs
- Any file not listed in WRITE-ALLOWED

An implementer who believes a prohibited file must change **stops and escalates**. The two locked constraints that shaped this plan — every smoke upload ships `cell/cell.json` (`tests/sprint-01/t11-controls-wiring.test.mjs:296-304`) and the job list is `[download, drift, grade, smoke]` (`tests/sprint-01/run-02-hand.test.mjs:169`) — are the reason the report travels inside the cell record; editing either test to make room for a per-cell upload is the forbidden move.

## Evidence Gates

- **AC-1:** `node --test --test-name-pattern t17-product-writes-report tests/sprint-01/t17-verify-report-writer.test.mjs`. Expected: exit 0, TAP `ok`, `fail 0`.
- **AC-2:** `node --test --test-name-pattern t17-report-reaches-recorder tests/sprint-01/t17-verify-report-writer.test.mjs`. Expected: exit 0, TAP `ok`, `fail 0`.
- **AC-3:** `node --test --test-name-pattern t17-cell-shape-and-neighbours tests/sprint-01/t17-verify-report-writer.test.mjs`. Expected: exit 0, TAP `ok`, `fail 0`.
- **TC-1:** `node --test --test-name-pattern t17-report-body-contract tests/sprint-01/t17-verify-report-writer.test.mjs`. Expected: exit 0, `pass 1`.
- **TC-2:** `node --test --test-name-pattern t17-writer-refuses-unbindable tests/sprint-01/t17-verify-report-writer.test.mjs`. Expected: exit 0, `pass 1`.
- **TC-3:** `node --test --test-name-pattern t17-prompt-carries-path-and-id tests/sprint-01/t17-verify-report-writer.test.mjs`. Expected: exit 0, `pass 1`.
- **TC-4:** `node --test --test-name-pattern t17-upload-shape-matches-download tests/sprint-01/t17-verify-report-writer.test.mjs`. Expected: exit 0, `pass 1`.
- **Owned test file:** `node --test tests/sprint-01/t17-verify-report-writer.test.mjs`. Expected: `pass 7`, `fail 0`.
- **regression (six locked files):** `node --test tests/sprint-01/grd-01-twelve-cells.test.mjs tests/sprint-01/grd-02-four-grades.test.mjs tests/sprint-01/grd-03-evidence.test.mjs tests/sprint-01/grd-04-named-path.test.mjs tests/sprint-01/grd-05-clean-twin.test.mjs tests/sprint-01/run-02-hand.test.mjs`. Expected: `pass 76`, `fail 0` (measured on this working tree at authoring time, head `9c4f4c5`; a differing count must be recorded as a baseline, never explained away).
- **regression (T16's owned file):** `node --test tests/sprint-01/t16-claude-code-grades.test.mjs`. Expected: `pass 7`, `fail 0` (measured at authoring time) — the prompt gains arguments ahead of T16's declared surface, so its assertions must still hold unchanged.
- **write-scope:** `git diff --name-only`. Expected: only WRITE-ALLOWED paths.
- **Hosted receipt (the sprint gate):** `jq -r '.cells[] | select(.harness=="claude-code" and .track=="pinned") | .checks[] | .check_id + " " + .verdict'` prints `verify pass` beside `command_list pass` and `status pass`, and `jq -r '.reason'` over the downloaded bundle's `verify-reports-index.json` prints `null` with two `reports/*.json` entries.

## Review Criteria

Must pass:

- The owned test reports `pass 7`, `fail 0`, and each test asserts its row's THEN rather than restating the implementation.
- The graded report in AC-1 is a file `plugins/pixel-perfect/scripts/verify-report.mjs` wrote after running the real catalog check; the adapter contains no writer call, and no harness module creates a report body.
- `readVerifyReport`, `bindReport`, `statusFacts`, `CHECKS`, `INVOCATIONS`, `gradedArgv`, `prepareRunDirs` and `test/harness/runtime/**` are untouched; the six-file regression and T16's file are green.
- The writer refuses a missing id and a path outside the invocation directory, and a borrowed body still grades `fail report-mismatched-invocation`.
- The smoke job still has exactly one `actions/upload-artifact` step, and it still ships exactly `cell/cell.json`; the workflow still declares four jobs.
- `git diff --name-only` lists only WRITE-ALLOWED paths.
- Assert (judgement, not grep): the fix makes the *product* produce the report, and the harness only carries it. A change that has the adapter, the cell, a grader or the recorder write a body, that relaxes `bindReport`, or that turns `report-missing` into `could-not-run` is a NEEDS_FIXES regardless of colour.

Should verify: the `status` and `first-question-init` prompts are byte-identical to base; the two verify prompts differ only by their case's path, case id and invocation id; the staging step's digest check fails loudly instead of writing a body it did not verify.

Verdict: APPROVED or NEEDS_FIXES, with file and line for each finding.

## Dependencies

- **Depends on:** T5, T7, T16.

Why T5: `readVerifyReport`/`bindReport` are the pass rule the report must satisfy, and `INVOCATIONS` is the table whose entries carry the id and bound path. Why T7: the invocation id and the bound path are minted there, and the writer echoes them rather than inventing its own. Why T16: its declared surface stays in the prompt, its `VERIFY_REPORT_CONTRACT` is the body the writer fills, and its path-scoped stance is the policy this task must work *within* rather than widen.

A shared file is not a dependency: T17 appends two renderers beside T16's, and the lane test is what proves the composition.

## Out of Scope

- Any change to the recorded stance, the permission mode, or the allow-list. If a dispatched run still reads `report-missing`, the implementer must first read the capture for a masked required denial (T16's recorded finding: check-blocks-first precedence prints `report-missing` beside a denial) and report it; widening the policy is a new amendment, not this task's fix.
- `question_before_expensive_work`'s `could-not-run required-fact-unobserved` (amendment T18).
- The newest-track cell's `installation-identity-mismatch` (the identity rule working as designed).
- Recorder internals, the result schema, the bundle's own name, and gate step 8's command.
- Dispatching the workflow. The hosted receipt is the sprint gate; this task's tests assert the mechanism.

## Notes

- **One writer, two copies, no third author.** The graded copy stays at the case-declared path inside the invocation's directory; the published copy exists because `prepareRunDirs.cleanup()` (`claude-code.mjs:352-360`) deletes that directory before the job can upload anything, and the only file the smoke job may ship is `cell/cell.json`. The product writes both copies; the job only carries bytes and their digest.
- **Why the arguments, not more prose.** T16 declared the surface in the prompt and the write did not happen. The instruction arrived as `$ARGUMENTS` of a slash command whose workflow never parsed it, so the product had no step that required a report. `--report`/`--invocation-id` are inputs the product's own Options section documents, so the step is the product's, and the prose surface stays as the model-facing explanation.
- **Why a script and not a longer prompt.** The body's two load-bearing facts — the outcome and the drifted keys — are the catalog check's output. A model that cannot run the check can only guess them, and a guessed body that happens to match grades a defect nobody detected. The script removes the guess.
- **Recorded conflict with the brief's upload instruction.** The brief asks for a per-cell `harness-eval-verify-*` artifact. `tests/sprint-01/t11-controls-wiring.test.mjs:296-304` and `tests/sprint-01/run-02-hand.test.mjs:169` are locked and forbid the extra upload step and the extra job, and T17 may not edit them. The report therefore travels inside the cell record (T15's `control_observations` precedent), and the grade job stages it back into the `verify-reports` layout the recorder and step 8 already read. `cell/cell.json`'s schema sets no `additionalProperties: false`, and T15's attached keys prove extra keys survive the recorder's validation.
- **Why this is not a stubbed test.** No verdict and no report body is typed anywhere. AC-1 runs the real product writer over the real materialized kit (planted overlay and untouched twin) and hands the file to the real `readVerifyReport` of the entry `prepareVerifyPair()` minted — id, path and pass rule are all the production ones. The borrowed-id case is a byte copy of the real body with one field replaced, so a reader that ignores the binding is visible as a pass and the real `bindReport` still refuses it. TC-1 derives the expected outcome and drifted keys by running the product's own `verify-catalog.mjs`, so a hand-written body cannot satisfy it. TC-2 asserts *no file* for every refusal, so a writer that always writes cannot survive. TC-3 asserts the prompt carries the path and id and that the adapter holds no writer, so a harness-written report cannot be substituted. TC-4 reads the workflow and the recorder's own `uploadPlan`/`writeVerifyReceipt`, so the shipping shape is checked against the code that consumes it. The hosted receipt is not simulated: it is a dispatched run whose pinned cell prints `verify pass` and whose bundle holds both reports. **Known local limit:** this host holds no `harness-smoke` claude binding, so no guarded `claude -p` runs here; the lane proves the product's writer, the binding rule and the shipping shape, and a dispatched run proves the cell.
- **Baselines.** Six locked files report `pass 76`; T16's owned file reports `pass 7` (both measured at authoring time, head `9c4f4c5`). The new lane file must report `pass 7`.
- **Test-name filtering.** T16 recorded that on Node v24 `--test-name-pattern` only filters when it precedes the file positional. Every gate above uses that corrected order; an unfiltered run would print 7 tests and hide a mistyped pattern.
- **Build order:** TC-1/TC-2 the writer and its refusals; Seam 2 the product docs; TC-3 the argument renderer and prompt composition; AC-1 the graded pair and the borrowed body; Seam 4 the attach and stage steps; TC-4/AC-2 the bundle shape; AC-3 the shape and the regressions. Do not dispatch.
- **Owner:** `evals-planner`; sprint `sprint-01-evaluator-evidence-spine`.


<!-- REQUIREMENT-CONTRACT v1 -->
<!--
{
  "version": "1",
  "task_id": "T17",
  "task_type": "FEATURE",
  "tdd_mode": "red_first",
  "verification_policy": {
    "requires_tests": true,
    "requires_red_evidence": true,
    "requires_seeded_evidence": true
  },
  "guardrails": {
    "write_allowed": [
      "plugins/pixel-perfect/scripts/verify-report.mjs",
      "plugins/pixel-perfect/workflows/verify.md",
      "plugins/pixel-perfect/commands/verify.md",
      "plugins/pixel-perfect/README.md",
      ".github/workflows/harness-eval.yml",
      "test/harness/adapters/claude-code.mjs",
      "tests/sprint-01/t17-verify-report-writer.test.mjs"
    ],
    "write_prohibited": [
      "test/harness/runtime/**",
      "test/harness/graders/**",
      "test/harness/smoke/cell.mjs",
      "test/harness/smoke/model-step.mjs",
      "test/harness/smoke/observations.mjs",
      "test/harness/smoke/image-scan.mjs",
      "test/harness/recorder/**",
      "test/harness/cases/**",
      "test/harness/kit/**",
      "tests/sprint-01/grd-01-twelve-cells.test.mjs",
      "tests/sprint-01/grd-02-four-grades.test.mjs",
      "tests/sprint-01/grd-03-evidence.test.mjs",
      "tests/sprint-01/grd-04-named-path.test.mjs",
      "tests/sprint-01/grd-05-clean-twin.test.mjs",
      "tests/sprint-01/grd-06-missing-key.test.mjs",
      "tests/sprint-01/run-02-hand.test.mjs",
      "tests/sprint-01/t11-controls-wiring.test.mjs",
      "tests/sprint-01/t13-smoke-observations.test.mjs",
      "tests/sprint-01/t14-capture-requiredness.test.mjs",
      "tests/sprint-01/t15-hosted-controls.test.mjs",
      "tests/sprint-01/t16-claude-code-grades.test.mjs",
      "Any file not listed in write_allowed"
    ]
  },
  "fixtures": {
    "seed/verify-pair": {
      "entrypoint": "prepareVerifyPair({ runId: \"t17\", track: \"pinned\" }) from test/harness/adapters/claude-code.mjs \u2014 the planted and clean entries, each with its own minted invocation_id, its own mkdtemp directory and its own bound_path under it",
      "description": "the two verify entries the adapter mints, so the writer is handed the production path and id rather than a literal: verify-button-drift binds reports/verify-button-drift.json and verify-clean binds reports/verify-clean.json, in separate directories carrying the kit project each case declares",
      "seed_method": "migration_fixture"
    },
    "seed/kit-planted": {
      "entrypoint": "the planted entry's directory: test/harness/kit/project materialized with the overlays/button-drift overlay applied, whose design/manifest.json declares phase atoms and gates molecules pending",
      "description": "the kit project with the planted button drift: plugins/pixel-perfect/scripts/verify-catalog.mjs --check . --platform web-desktop --json exits 1 and reports atoms/Button/default among its drifted keys",
      "seed_method": "migration_fixture"
    },
    "seed/kit-clean": {
      "entrypoint": "the clean entry's directory: test/harness/kit/project materialized with no overlay",
      "description": "the untouched kit twin: the same catalog check exits 0 with an empty drifted list, so a clean project is not a verify failure",
      "seed_method": "migration_fixture"
    },
    "seed/borrowed-report": {
      "entrypoint": "a byte copy of the planted report with its invocation_id replaced by the clean entry's id, written at the planted entry's bound path by the lane",
      "description": "the real planted body carrying another invocation's id, so a reader that ignores the binding still sees a detection while the real bindReport refuses it as report-mismatched-invocation",
      "seed_method": "migration_fixture"
    },
    "seed/report-published": {
      "entrypoint": "the publish copies plugins/pixel-perfect/scripts/verify-report.mjs writes under --publish-dir for the planted and clean entries, plus each run's printed { path, bytes, sha256 } receipt",
      "description": "the two report bodies as the job carries them: reports/verify-button-drift.json and reports/verify-clean.json with the digests the writer printed, byte-identical to the graded files",
      "seed_method": "cli"
    },
    "seed/workflow-and-recorder": {
      "entrypoint": ".github/workflows/harness-eval.yml plus test/harness/recorder.mjs and test/harness/recorder/result.mjs as checked in, read through the workflow parser the locked flows use",
      "description": "the shipping shape as code: the smoke job's upload steps, the grade job's harness-eval-verify-* download, writeVerifyReceipt's bundling rule and uploadPlan's attempt-qualified bundle name",
      "seed_method": "migration_fixture"
    },
    "seed/dispatched-run-41249460968": {
      "entrypoint": ".kb-run-sprint/sprint-01-evaluator-evidence-spine/T16/hosted/run-41249460968/harness-eval-result-41249460968-1/grade/harness-eval-result.json",
      "description": "the recorded twelve-cell artifact of the dispatched run this task repairs: both claude-code cells read command_list pass and status pass beside verify fail report-missing twice, question_before_expensive_work reads could-not-run, the newest cell reads installation-identity-mismatch, and the ten non-claude cells keep their named refusals",
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
      "title": "The product writes its own report at the case-declared path under the id it was given, and the real reader grades it `pass`",
      "test_tier": "integration",
      "verify": "node --test --test-name-pattern t17-product-writes-report tests/sprint-01/t17-verify-report-writer.test.mjs",
      "test_file": "tests/sprint-01/t17-verify-report-writer.test.mjs",
      "test_function": "t17-product-writes-report",
      "positive_example": "planted `{ ok: true, observed_verify_outcome: \"defect-detected\", observed_defect_key: \"atoms/Button/default\" }`, clean `{ ok: true, observed_verify_outcome: \"clean\", observed_defect_key: null, clean_project_failed: false }`, borrowed `{ ok: false, verdict: \"fail\", reason: \"report-mismatched-invocation\", expected: <planted id>, seen: <clean id> }`.",
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "scenario": {
        "id": "SC-T17-AC1",
        "tier": "e2e-automated",
        "test_tier": "e2e",
        "negative_control": {
          "would_fail_if": [
            "the report is produced by a harness module instead of the product's script, so the graded file says whatever the harness decided about the plugin",
            "the writer is a stub that copies a body from a fixture or from the case manifest, so a planted kit and a clean kit produce the same outcome",
            "the invoked copy omits the invocation id or invents one, so bindReport's refusal is never exercised and a borrowed body would pass"
          ]
        },
        "evidence": {
          "forms": [
            "the two files the product wrote at the case-declared paths, with the writer's printed { path, bytes, sha256 } receipts",
            "the readVerifyReport result for each entry: ok, verdict, reason, observed_verify_outcome, expected and seen",
            "the byte copy carrying the other invocation's id and its refusal"
          ]
        },
        "topology_note": "each entry comes from the adapter's own prepareVerifyPair, so the path is the case manifest's, the id is the one prepareRunDirs minted, and the pass rule is readVerifyReport's; the lane supplies only the process invocation",
        "cases": [
          {
            "start_ref": "seed/verify-pair",
            "action": {
              "actor": "runner",
              "steps": [
                "node plugins/pixel-perfect/scripts/verify-report.mjs --out reports/verify-button-drift.json --invocation-id <that entry's id> --case-id verify-button-drift --harness claude-code --track pinned --platform web-desktop --publish-dir cell/verify-upload, run from the planted entry's directory",
                "grade the written file through readVerifyReport with the planted entry"
              ]
            },
            "end_state": {
              "must_observe": [
                "the planted file exists at the bound path and parses as JSON with `10` keys",
                "its `schema` is `verify-report/v1` and its `invocation_id` equals the planted entry's minted id exactly",
                "its `observed_verify_outcome` is `defect-detected` and `evidence.drifted_keys` contains `atoms/Button/default`",
                "`readVerifyReport({ entry })` returns `ok: true` with `verdict: null` and `reason: null`",
                "the published copy at `cell/verify-upload/reports/verify-button-drift.json` has the same `sha256` as the graded file"
              ],
              "must_not_observe": [
                "`reason: \"report-missing\"`, which is what run 41249460968 read on both claude-code cells",
                "an empty `evidence.drifted_keys` list on the planted kit",
                "`invocation_id` rewritten to a different id than the one passed"
              ]
            }
          },
          {
            "start_ref": "seed/kit-clean",
            "action": {
              "actor": "runner",
              "steps": [
                "run the same writer from the clean entry's directory with --out reports/verify-clean.json and the clean entry's own id",
                "grade it through readVerifyReport with the clean entry",
                "write a byte copy of the planted body, with the clean entry's id substituted, at the planted entry's bound path and grade it with the planted entry"
              ]
            },
            "end_state": {
              "must_observe": [
                "the clean body's `observed_verify_outcome` is `clean` and `clean_project_failed` is `false`",
                "the clean body's `observed_defect_key` is `null` and `evidence.drifted_keys` is `[]`",
                "`readVerifyReport` on the clean entry returns `ok: true` with `reason: null`",
                "the borrowed copy reads `ok: false`, `verdict: \"fail\"`, `reason: \"report-mismatched-invocation\"` with `expected` the planted id and `seen` the clean id"
              ],
              "must_not_observe": [
                "`defect-detected` on the clean entry",
                "`verdict: \"pass\"` on the borrowed copy",
                "a missing-file reason in place of the binding refusal",
                "an empty `evidence.drifted_keys` list on the clean entry"
              ]
            }
          }
        ]
      },
      "red_input": "on base main no plugins/pixel-perfect/scripts/verify-report.mjs exists, so the invocation has no product code that writes a report; run 41249460968 records `verify fail report-missing` on both claude-code cells",
      "red_proof": ".tmp/sprint-01-verification/t17-verify-report-writer.red.log",
      "description": "GIVEN seed/verify-pair WHEN the product's writer runs from each entry's directory with that entry's --out and --invocation-id and the written file is graded through the real readVerifyReport THEN the planted body reads ok true with observed_verify_outcome defect-detected, the clean twin reads ok true with clean_project_failed false, neither reads report-missing, and the borrowed-id copy reads fail report-mismatched-invocation",
      "maps_to_ac": null
    },
    {
      "id": "AC-2",
      "type": "acceptance_criterion",
      "primary": true,
      "flow_ref": null,
      "title": "The report's bytes reach the recorder's bundle at the path gate step 8 reads",
      "test_tier": "integration",
      "verify": "node --test --test-name-pattern t17-report-reaches-recorder tests/sprint-01/t17-verify-report-writer.test.mjs",
      "test_file": "tests/sprint-01/t17-verify-report-writer.test.mjs",
      "test_function": "t17-report-reaches-recorder",
      "positive_example": "`{ reports: [{ path: \"reports/verify-button-drift.json\", sha256: <writer receipt> }, { path: \"reports/verify-clean.json\", sha256: <writer receipt> }], reason: null }`.",
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "scenario": {
        "id": "SC-T17-AC2",
        "tier": "e2e-automated",
        "test_tier": "e2e",
        "negative_control": {
          "would_fail_if": [
            "the staging step copies nothing and the recorder bundles an empty directory, so the index keeps the 'no verify report artifact arrived' reason",
            "the bundle path keeps the artifact or cell directory name, so step 8's `reports/verify-button-drift.json` does not exist",
            "a digest is invented instead of read from the carried receipt, so a truncated copy still bundles"
          ]
        },
        "evidence": {
          "forms": [
            "the verify-reports-index.json the recorder wrote, with its reports[] entries and reason",
            "the bundled files under grade/verify-reports/reports/ and their sha256 values",
            "the writer's printed receipts the entries are compared against"
          ]
        },
        "topology_note": "the staged directory is the same shape the grade job produces (verify-reports/reports/<case>.json), so the recorder is exercised on the layout it will actually read rather than on a copy of its own output",
        "cases": [
          {
            "start_ref": "seed/report-published",
            "action": {
              "actor": "runner",
              "steps": [
                "place the two published bodies under verify-reports/reports/ as the staging step writes them",
                "run the real writeVerifyReceipt with outDir the grade directory and verifyDir verify-reports"
              ]
            },
            "end_state": {
              "must_observe": [
                "the index lists `reports/verify-button-drift.json` and `reports/verify-clean.json`",
                "each entry's `sha256` equals the digest the writer printed for that body",
                "the index `reason` is `null`",
                "the bundled files exist at `grade/verify-reports/reports/verify-button-drift.json` and `grade/verify-reports/reports/verify-clean.json`"
              ],
              "must_not_observe": [
                "the reason string `no verify report artifact arrived for this attempt`",
                "an empty `reports` array in the index",
                "a bundled path that still carries a cell or artifact directory name"
              ]
            }
          },
          {
            "start_ref": "seed/workflow-and-recorder",
            "action": {
              "actor": "runner",
              "steps": [
                "run writeVerifyReceipt with a verify dir that holds no report file"
              ]
            },
            "end_state": {
              "must_observe": [
                "the index `reason` names the directory it looked in and the string `no verify report artifact arrived`",
                "`reports` is `[]` and `0` files were copied into the bundle"
              ],
              "must_not_observe": [
                "a fabricated `reports` entry for a file nobody wrote",
                "`reason: null` with no files present"
              ]
            }
          }
        ]
      },
      "red_input": "on base no step stages or uploads a report, so writeVerifyReceipt writes an empty reports array and the reason `no verify report artifact arrived for this attempt`, which is what run 41249460968's recorder log records",
      "red_proof": ".tmp/sprint-01-verification/t17-verify-report-writer.red.log",
      "description": "GIVEN seed/report-published WHEN the bodies are placed in the download-shaped verify-reports layout the grade job stages and the real writeVerifyReceipt bundles them THEN the bundle holds reports/verify-button-drift.json and reports/verify-clean.json with the writer's sha256 values and the index reason is null, and with no report present the index names the directory it looked in",
      "maps_to_ac": null
    },
    {
      "id": "AC-3",
      "type": "acceptance_criterion",
      "primary": true,
      "flow_ref": null,
      "title": "Four checks, five invocations, twelve cells and every neighbour hold still",
      "test_tier": "integration",
      "verify": "node --test --test-name-pattern t17-cell-shape-and-neighbours tests/sprint-01/t17-verify-report-writer.test.mjs",
      "test_file": "tests/sprint-01/t17-verify-report-writer.test.mjs",
      "test_function": "t17-cell-shape-and-neighbours",
      "positive_example": "`CHECKS.length === 4`, `invocationTable().length === 5`, the artifact yields 12 unique (harness, track) cells with 5 distinct non-claude reasons, the pinned `status` check reads `pass`, and the regressions report `pass 76` / `fail 0` plus `pass 7` / `fail 0`.",
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "scenario": {
        "id": "SC-T17-AC3",
        "tier": "e2e-automated",
        "test_tier": "e2e",
        "negative_control": {
          "would_fail_if": [
            "a sixth invocation row or a fifth check id is added to make a cell look greener, so the four-grade locks break",
            "a non-claude cell is stubbed to a pass, so the ten named refusals disappear from the recorded artifact",
            "a locked test file is edited to accept the new shape, so the regression is green by construction"
          ]
        },
        "evidence": {
          "forms": [
            "the changed module's CHECKS and invocationTable() output",
            "the recorded twelve-cell artifact's harness, track, verdict and reason triples",
            "the six locked files' and T16's owned file's TAP summaries"
          ]
        },
        "topology_note": "the shape is read from the live module while the neighbours are read from the recorded artifact of the head the defect was measured on, so a shape change and a neighbour regression are both observable without a dispatch",
        "cases": [
          {
            "start_ref": "seed/dispatched-run-41249460968",
            "action": {
              "actor": "runner",
              "steps": [
                "node --test --test-name-pattern t17-cell-shape-and-neighbours tests/sprint-01/t17-verify-report-writer.test.mjs",
                "node --test tests/sprint-01/grd-01-twelve-cells.test.mjs tests/sprint-01/grd-02-four-grades.test.mjs tests/sprint-01/grd-03-evidence.test.mjs tests/sprint-01/grd-04-named-path.test.mjs tests/sprint-01/grd-05-clean-twin.test.mjs tests/sprint-01/run-02-hand.test.mjs",
                "node --test tests/sprint-01/t16-claude-code-grades.test.mjs"
              ]
            },
            "end_state": {
              "must_observe": [
                "`CHECKS` equals `[\"command_list\", \"status\", \"verify\", \"question_before_expensive_work\"]`",
                "`invocationTable()` holds `5` entries with `4` distinct check ids",
                "the recorded artifact holds `12` unique (harness, track) cells",
                "the `10` non-claude cells keep `5` distinct named reasons including `missing-api-key`",
                "the pinned cell's `status` check still reads `pass`",
                "the six-file regression reports `pass 76` and `fail 0`, and T16's file reports `pass 7` and `fail 0`"
              ],
              "must_not_observe": [
                "a `5`th check id on any claude-code cell",
                "an empty `reason` on a non-claude cell",
                "a `0`-cell artifact, or a regression that reads `fail 0` because no file ran"
              ]
            }
          }
        ]
      },
      "red_input": "on base the owned file's first assertion fails because plugins/pixel-perfect/scripts/verify-report.mjs does not exist; the shape and regression assertions it wraps are green on base and must stay green",
      "red_proof": ".tmp/sprint-01-verification/t17-verify-report-writer.red.log",
      "description": "GIVEN seed/dispatched-run-41249460968 and the changed module WHEN CHECKS and invocationTable() are read, the artifact's cells are read, and the six locked files plus T16's own file run THEN four check ids and five entries are intact, the artifact yields twelve unique cells with the ten non-claude reasons unchanged, the pinned status check still passes, and every locked file reports its recorded baseline",
      "maps_to_ac": null
    },
    {
      "id": "TC-1",
      "type": "test_criterion",
      "primary": false,
      "description": "The body is the declared contract, computed by the catalog check rather than typed",
      "verify": "node --test --test-name-pattern t17-report-body-contract tests/sprint-01/t17-verify-report-writer.test.mjs",
      "maps_to_ac": "AC-1",
      "test_file": "tests/sprint-01/t17-verify-report-writer.test.mjs",
      "test_function": "t17-report-body-contract",
      "test_tier": "integration",
      "positive_example": "the key set equals the `10` declared fields, `schema` is `verify-report/v1`, `invocation_id` is the argument verbatim, `evidence.drifted_keys` equals the catalog's drifted list, and the published copy's sha256 equals the graded file's.",
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "scenario": {
        "id": "SC-T17-TC1",
        "tier": "e2e-automated",
        "test_tier": "integration",
        "negative_control": {
          "would_fail_if": [
            "the outcome is taken from a flag or a case id rather than the catalog check, so a clean kit reports `defect-detected`",
            "the body carries extra keys or drops `evidence.drifted_keys`, so the declared contract is not the body's contract",
            "the published copy is re-serialised, so its bytes and digest differ from the graded file",
            "the writer is a stub keyed on the case id, so the body is static and never reads the catalog check"
          ]
        },
        "evidence": {
          "forms": [
            "the parsed body of each written report",
            "the catalog check's own JSON report the body is compared against",
            "both files' sha256 values"
          ]
        },
        "topology_note": "the body is compared with the catalog check's own output rather than with the case manifest's expectation, so the writer cannot satisfy the test by copying what the case says",
        "cases": [
          {
            "start_ref": "seed/kit-planted",
            "action": {
              "actor": "runner",
              "steps": [
                "node --test --test-name-pattern t17-report-body-contract tests/sprint-01/t17-verify-report-writer.test.mjs"
              ]
            },
            "end_state": {
              "must_observe": [
                "the body's key set is exactly the `10` declared fields, with `evidence` holding only `drifted_keys`",
                "`schema` is `verify-report/v1`, and `harness`/`track` are the argument values",
                "`invocation_id` is the argument string, character for character",
                "`evidence.drifted_keys` equals the drifted list the catalog check printed",
                "the published copy's `sha256` equals the graded file's `sha256`"
              ],
              "must_not_observe": [
                "a key outside the declared `10`",
                "an `evidence` object whose `drifted_keys` is empty for the planted kit",
                "a digest that differs between the graded file and its published copy"
              ]
            }
          }
        ]
      },
      "flow_ref": null,
      "red_input": "on base there is no writer, so no body can be inspected; a writer that copied a fixture body would fail the catalog-check comparison",
      "red_proof": ".tmp/sprint-01-verification/t17-verify-report-writer.red.log"
    },
    {
      "id": "TC-2",
      "type": "test_criterion",
      "primary": false,
      "description": "The writer refuses what it cannot bind or honestly write, and leaves no partial file",
      "verify": "node --test --test-name-pattern t17-writer-refuses-unbindable tests/sprint-01/t17-verify-report-writer.test.mjs",
      "maps_to_ac": "AC-1",
      "test_file": "tests/sprint-01/t17-verify-report-writer.test.mjs",
      "test_function": "t17-writer-refuses-unbindable",
      "test_tier": "integration",
      "positive_example": "no id exits `3` with `report-invocation-id-missing` and creates no file; an absolute, escaping or non-json `--out` exits `3` with its named reason; a relative publish dir exits `3`; the valid second run exits `0` with a parsing body and no `.partial` file.",
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "scenario": {
        "id": "SC-T17-TC2",
        "tier": "e2e-automated",
        "test_tier": "integration",
        "negative_control": {
          "would_fail_if": [
            "the writer defaults an id when none is given, so an unbound body exists and bindReport's rule is never exercised",
            "a path outside the working directory is accepted, so the report lands where the grader will not read it",
            "a non-atomic write leaves a partial file, so a half-written body can be graded",
            "a stub writer that always writes a body, even with an empty id, so the refusal branch is dead code"
          ]
        },
        "evidence": {
          "forms": [
            "each run's exit code, refusal reason and the directory listing taken before and after",
            "the written file and its absence in the refusal cases"
          ]
        },
        "topology_note": "every case runs the same script against a fresh copy of the planted kit, so the only variable is the argument set",
        "cases": [
          {
            "start_ref": "seed/kit-planted",
            "action": {
              "actor": "runner",
              "steps": [
                "run the writer with no --invocation-id, then with an empty id and with a whitespace id"
              ]
            },
            "end_state": {
              "must_observe": [
                "each run exits `3` with reason `report-invocation-id-missing`",
                "no report file exists after any of the three runs: `find . -name \"verify-*.json\"` returns `0` paths",
                "the directory listing after the runs names `0` reports and equals the `3` lines it held before"
              ],
              "must_not_observe": [
                "a written file with an invented id",
                "an empty refusal reason",
                "`0` refusals across the three runs"
              ]
            }
          },
          {
            "start_ref": "seed/kit-planted",
            "action": {
              "actor": "runner",
              "steps": [
                "run the writer with --out /abs/report.json, then --out ../escape.json, then --out reports/notjson, then with a relative --publish-dir",
                "run the writer twice on the same valid --out with a real id"
              ]
            },
            "end_state": {
              "must_observe": [
                "the absolute and escaping paths exit `3` with `report-out-not-relative` and create no file outside the directory",
                "`--out reports/notjson` exits `3` with `report-out-not-json`",
                "a relative `--publish-dir` exits `3` with `publish-dir-not-absolute` and writes no graded file",
                "the second valid run reports `ok: true`, the file parses, and its `observed_verify_outcome` is `defect-detected` with exit `0`"
              ],
              "must_not_observe": [
                "a file created outside the invocation directory",
                "an empty refusal reason on any of the four refusals",
                "a `.partial` file left beside the rewritten report"
              ]
            }
          }
        ]
      },
      "flow_ref": null,
      "red_input": "on base no writer exists, so every refusal case is vacuously absent and the assertions fail on the missing script",
      "red_proof": ".tmp/sprint-01-verification/t17-verify-report-writer.red.log"
    },
    {
      "id": "TC-3",
      "type": "test_criterion",
      "primary": false,
      "description": "The prompt carries the path and the id as parsed arguments, and no harness module writes the report",
      "verify": "node --test --test-name-pattern t17-prompt-carries-path-and-id tests/sprint-01/t17-verify-report-writer.test.mjs",
      "maps_to_ac": "AC-1",
      "test_file": "tests/sprint-01/t17-verify-report-writer.test.mjs",
      "test_function": "t17-prompt-carries-path-and-id",
      "test_tier": "integration",
      "positive_example": "both verify prompts carry `--report <their own path>` and `--invocation-id <their own id>`, still carry T16's declared fields, match none of `/atoms\\/Button\\/default/`, `/[0-9a-f]{64}/` and `/offset/`, the must-ask prompt is byte-identical to base, the adapter holds `0` writer calls, and an absent report still grades `fail report-missing`.",
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "scenario": {
        "id": "SC-T17-TC3",
        "tier": "e2e-automated",
        "test_tier": "integration",
        "negative_control": {
          "would_fail_if": [
            "the path and id stay in prose only, so the product parses nothing and the report step never runs",
            "the defect key or a digest is placed in the prompt, so a model could type the answer without running the catalog check",
            "the adapter writes the report itself, so the graded file is the harness's claim about the plugin",
            "the argument pair is rendered from a stub constant, so both entries carry the same path and the same id"
          ]
        },
        "evidence": {
          "forms": [
            "the rendered prompt strings for the verify entries and the untouched must-ask entry",
            "the adapter module source and its import list",
            "the grade of the verify entry with no report file present"
          ]
        },
        "topology_note": "the prompts are rendered from the adapter's own table with real minted ids, so the assertion covers the composition the run uses rather than a hand-built string",
        "cases": [
          {
            "start_ref": "seed/verify-pair",
            "action": {
              "actor": "runner",
              "steps": [
                "node --test --test-name-pattern t17-prompt-carries-path-and-id tests/sprint-01/t17-verify-report-writer.test.mjs"
              ]
            },
            "end_state": {
              "must_observe": [
                "the planted prompt starts with `/pixel-perfect:verify --platform web-desktop`",
                "it contains `--report reports/verify-button-drift.json` and `--invocation-id ` followed by that entry's own id",
                "the clean prompt contains `--report reports/verify-clean.json` and a different id",
                "both prompts still carry every field name of `VERIFY_REPORT_CONTRACT`",
                "the adapter source contains `0` occurrences of `writeVerifyReport` and `0` writes to a `reports/` path",
                "with the report absent the verify grade is `fail report-missing`, not `could-not-run`"
              ],
              "must_not_observe": [
                "the defect key `atoms/Button/default` in either prompt",
                "a 64-hex digest in either prompt",
                "an empty `--invocation-id` value, or the same id in both prompts"
              ]
            }
          }
        ]
      },
      "flow_ref": null,
      "red_input": "on base the prompt carries the path and id only as prose, so no argument the product parses exists and the renderer's first assertion fails",
      "red_proof": ".tmp/sprint-01-verification/t17-verify-report-writer.red.log"
    },
    {
      "id": "TC-4",
      "type": "test_criterion",
      "primary": false,
      "description": "The published bytes reach the bundle shape the download and gate step 8 read",
      "verify": "node --test --test-name-pattern t17-upload-shape-matches-download tests/sprint-01/t17-verify-report-writer.test.mjs",
      "maps_to_ac": "AC-2",
      "test_file": "tests/sprint-01/t17-verify-report-writer.test.mjs",
      "test_function": "t17-upload-shape-matches-download",
      "test_tier": "integration",
      "positive_example": "every smoke upload ships exactly `cell/cell.json`, the verify download keeps `pattern: harness-eval-verify-*` with `continue-on-error: true`, the bundle name equals `uploadPlan`'s and the final upload uses it with `path: grade/verify-reports`, and a digest mismatch is refused.",
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "scenario": {
        "id": "SC-T17-TC4",
        "tier": "e2e-automated",
        "test_tier": "integration",
        "negative_control": {
          "would_fail_if": [
            "a second upload step is added to the smoke job, so the locked assertion that every smoke upload ships `cell/cell.json` fails",
            "the staging step writes the bundle with an artifact-name prefix, so step 8's path does not exist",
            "the bundle name is spelled by hand instead of read from uploadPlan, so the published name drifts from the recorder's",
            "the staging step ships an empty directory, so the bundle carries an index and no report at all"
          ]
        },
        "evidence": {
          "forms": [
            "the workflow parsed with the locked flows' parser: job names, smoke upload steps and their paths, the grade job's download pattern and the bundle upload name",
            "uploadPlan's returned names for the recorded run and attempt",
            "the recorder index and bundled files produced from the staged layout"
          ]
        },
        "topology_note": "the workflow is read with the same parser the locked flows use, and the bundle name is compared with the recorder's own uploadPlan rather than with a literal, so a rename on either side is visible",
        "cases": [
          {
            "start_ref": "seed/workflow-and-recorder",
            "action": {
              "actor": "runner",
              "steps": [
                "node --test --test-name-pattern t17-upload-shape-matches-download tests/sprint-01/t17-verify-report-writer.test.mjs"
              ]
            },
            "end_state": {
              "must_observe": [
                "every `actions/upload-artifact` step in `jobs.smoke` ships exactly `path: cell/cell.json`",
                "the grade job's verify download keeps `pattern: harness-eval-verify-*` and carries `continue-on-error: true`",
                "`uploadPlan({ runId: \"41249460968\", attempt: 1 })` names the bundle `harness-eval-verify-reports-41249460968-1`",
                "the workflow's final verify-reports upload uses that exact name with `path: grade/verify-reports`",
                "the staging step writes `reports/verify-button-drift.json` for the claude-code pinned cell and refuses a digest mismatch"
              ],
              "must_not_observe": [
                "a `2`nd `actions/upload-artifact` step in `jobs.smoke`",
                "an empty `path` on the bundle upload",
                "a foreign `harness-eval-verify-reports-` directory re-bundled as this attempt's report"
              ]
            }
          }
        ]
      },
      "flow_ref": null,
      "red_input": "on base the workflow has no staging step, so no cell-carried report reaches verify-reports and the shape assertions fail",
      "red_proof": ".tmp/sprint-01-verification/t17-verify-report-writer.red.log"
    }
  ]
}
-->

## Handoff

```json
{"task":"T17","commit_sha":"3e05f29416304f09be047470cddbd03e9934b3af","done":"The product now writes its own verify report and the cell carries it. New plugins/pixel-perfect/scripts/verify-report.mjs runs the product's own verify-catalog.mjs --check, writes the ten-key verify-report/v1 body at the case-declared relative path atomically, echoes --invocation-id verbatim, and refuses before writing (exit 3, one JSON line, no file) a missing/empty/whitespace id, an absolute or ..-escaping --out, a non-.json leaf, a relative --publish-dir, and an unreadable catalog check; exit 2 for an unknown flag or a missing --case-id/--harness/--track; exit 0 whenever it wrote a report, defect or not. --publish-dir (or PIXEL_PERFECT_VERIFY_PUBLISH_DIR) writes a byte-identical copy and prints both {path,bytes,sha256} receipts. workflows/verify.md documents --report/--invocation-id plus a 'Machine-readable verify report' section (ten keys, outcome rule, refusal vocabulary, 'a detected defect is a successful report'); the adapter gains verifyReportArgs and composes [/pixel-perfect:<cmd>, ...caseArgs, ...verifyReportArgs, verifyReportSurface] so the path and id are parsed arguments ahead of T16's untouched prose, and the adapter still contains zero 'reports/' literals, zero writeVerifyReport and no writer import. The smoke job publishes to cell/verify-upload, a new 'Attach this cell's verify reports' step (always(), claude-code only) attaches {path,bytes,sha256,body} to cell/cell.json as verify_reports without spelling the cell path, the grade job's harness-eval-verify-* download gains continue-on-error, and a new 'Stage the verify reports' step writes reports/<name> for claude-code/pinned and <harness>-<track>/reports/<name> otherwise, recomputes each sha256 (removing and naming a mismatch, exit 1), and drops a foreign harness-eval-verify-reports-* bundle instead of re-bundling it. No second smoke upload, no fifth job. Owned lane tests/sprint-01/t17-verify-report-writer.test.mjs reports 7/7 (AC-1..AC-3, TC-1..TC-4) and executes the workflow's own attach and stage step bodies character-for-character. RED proof at .tmp/sprint-01-verification/t17-verify-report-writer.red.log (final test text against a git-archive of 2e6592c: 0 pass / 7 fail, exit 1); GREEN transcript beside it. Baselines held unchanged: six locked files 76/0, T16 7/7, t11+t13+t14+t15 19/0, whole tests/sprint-01 126/126, node scripts/validate-workflows.mjs valid, pnpm validate and pnpm verify green.","deviations":["Seam 2's plugins/pixel-perfect/commands/verify.md line was NOT applied: that file is generated by scripts/build-adapters.mjs from scripts/adapters/capabilities.json (claude surface path 'plugins/pixel-perfect/commands/{name}.md'), so a hand edit is overwritten by the build and fails `pnpm validate` ('adapter drift: plugins/pixel-perfect/commands/verify.md'). Doing it properly needs scripts/adapters/capabilities.json (not in WRITE-ALLOWED) plus 5 regenerated surfaces (skills/verify/SKILL.md, .cursor-plugin/commands/pixel-perfect-verify.md, .opencode/commands/pixel-perfect/verify.md, .pi/skills/pixel-perfect-verify/SKILL.md, commands/verify.md) — also outside the write scope, so per the guardrail it is escalated rather than reached around. The load-bearing text lives in workflows/verify.md, which is write-allowed and is the authoritative workflow the command delegates to; no AC/TC asserts the command file.","The publish directory is set inline in the claude-code step's run body (PIXEL_PERFECT_VERIFY_PUBLISH_DIR=\"${{ github.workspace }}/cell/verify-upload\" node test/harness/smoke/model-step.mjs ...) rather than as an env: line, because tests/sprint-01/t15-hosted-controls.test.mjs:621 asserts deepEqual(Object.keys(modelStep.env), [\"ANTHROPIC_API_KEY\"]) and t13:858 asserts five keyed steps carry exactly one env key; both are locked and uneditable here. The variable is inherited by the child and passed through by guard.childEnvFor, so the effect is identical.","AC-1's positive example states readVerifyReport returns verdict: null on a pass; the real (write-locked) function's pass shape is {ok:true, observed_verify_outcome, report} with no verdict field. The lane therefore asserts ok:true + no reason from readVerifyReport and reads {ok:true, verdict:null, reason:null} from bindReport, the rule that produces that null — readVerifyReport was not touched.","AC-3's GIVEN names the run-41249460968 artifact, which lives under the git-ignored .kb-run-sprint/ and is absent from this worktree and from any clean checkout, and no projection path is in T17's write scope. The unconditional shape assertions read the tracked test/harness/smoke/fixtures/dispatched-run/run-41157270388.cells.json projection (t16's own precedent) and the 41249460968 artifact is asserted only where it is on disk; the pinned cell's `status pass` is measured unconditionally by T16's own file in the same regression run.","the cell carries each report's body as the exact file text (not a re-serialized object), because a parsed-object round trip would change the bytes and break the sha256 the stage step recomputes."],"concerns":["commands/verify.md is still silent about --report/--invocation-id until a task with scripts/adapters/capabilities.json in scope regenerates the six surfaces; a human reading the command file alone will not see the new inputs (the workflow file they are told to execute does document them).","The hostile half is unproven here: this host holds no harness-smoke binding, so no guarded `claude -p` ran and no dispatched run was made (dispatch is out of scope). If a hosted run still reads verify fail after this lands, read the capture for a masked required denial first (T16's finding) before touching the stance — the stance and its one-path allow-list are untouched by this task.","The stage step runs if: always() and exits 1 on a carried-digest mismatch, which stops the recorder step (no `always()` on it) and therefore publishes no result artifact for that attempt. That is deliberate (a corrupted carrier must not be graded) but it converts a transport fault into a missing result, so the step log is the only place that names it."],"findings":["tests/sprint-01/t13-smoke-observations.test.mjs:858-860 and t15:621-622 lock the keyed claude-code step to exactly one env key; t13:847 and t15:606 lock /cell\\/cell\\.json/ to exactly one smoke step (Record the cell). Both directly constrain how the publish directory and the attach step could be written, and both were satisfiable only by composing the cell path at run time and setting the variable inline — worth recording in the sprint's constraint list.","scripts/build-adapters.mjs generates all six harness surfaces from scripts/adapters/capabilities.json, so any future task touching commands/*.md or skills/*/SKILL.md must have capabilities.json plus the generated outputs in its write scope.","expected_defect_key and observed_defect_key are both the first reported drifted key (per Seam 1 step 3 and the gate-8 command that prints 'atoms/Button/default atoms/Button/default defect-detected'); on the planted kit the catalog reports drifted = [atoms/Button/default, molecules/Card/default, screens/Home/default], so gate step 8's expectation holds by the ordering of the check's own story walk.","node --test test/*.test.mjs (the repo's `pnpm test`) has exactly one failure in this worktree — 'the real pi package manager installs the packed artifact', ENOENT node_modules/.bin/pi — because the worktree has no node_modules; it is environmental and unrelated to T17 (pnpm validate and pnpm verify are green)."],"scope_impact":[{"target":"plugins/pixel-perfect/commands/verify.md","found":"generated by scripts/build-adapters.mjs from scripts/adapters/capabilities.json (naming.claude.path = plugins/pixel-perfect/commands/{name}.md); a hand edit is reverted by the build and fails pnpm validate with 'adapter drift'","change":"not modified — its doc line is deferred/escalated; a future task needs scripts/adapters/capabilities.json plus 5 regenerated surfaces in scope"},{"target":"plugins/pixel-perfect/skills/verify/SKILL.md, .cursor-plugin/commands/pixel-perfect-verify.md, .opencode/commands/pixel-perfect/verify.md, .pi/skills/pixel-perfect-verify/SKILL.md","found":"the same five generated surfaces carry the identical 'Inputs and prerequisites' sentence for the codex/grok/cursor/opencode/pi harnesses","change":"untouched for the same reason; one capabilities.json edit would rewrite all five"},{"target":".github/workflows/harness-eval.yml (claude-code model step env)","found":"t15:621 pins the step's env keys to exactly [ANTHROPIC_API_KEY] and t13:858 requires five keyed steps with one env key each","change":"PIXEL_PERFECT_VERIFY_PUBLISH_DIR is set inline on the model-step command line instead of in env:, same inherited value, both locked assertions still green"},{"target":"test/harness/smoke/fixtures/dispatched-run/","found":"holds only the tracked run-41157270388 cells projection; run 41249460968's artifact is git-ignored under .kb-run-sprint/ and absent from the worktree","change":"AC-3 reads the tracked projection unconditionally and the 41249460968 artifact only where present; no fixture file added (not in write scope)"}],"feedback":["Add scripts/adapters/capabilities.json (plus the generated surface check) to any task whose scope names a file under plugins/pixel-perfect/commands/ or plugins/pixel-perfect/skills/ — generators make those paths un-editable, and this task's Seam 2 bullet is unachievable as written.","State locked-test constraints inline in the task's Specification, not only in the Notes: 'the keyed step has one env key' (t15) and 'exactly one smoke step names cell/cell.json' (t13) each invalidate a literal reading of Seam 4 items 1 and 2, and cost a round trip to discover.","If AC-1's THEN needs verdict: null from readVerifyReport, either unlock that function in the task or word the THEN as bindReport's pass rule; the current wording contradicts a write-locked implementation detail.","Give tasks that must cite a specific hosted run a tracked projection path in their write scope, or name the existing projection to reuse — AC-3's GIVEN otherwise points at a git-ignored artifact that only the gate machine has.","The sprint gate should treat 'stage step exits 1 on a digest mismatch' as an intended stop (no result artifact for that attempt), so a future reviewer does not read the missing artifact as a recorder bug."]}
```
