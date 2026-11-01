# TASK-GAW-7: Show the ten keyed cells' four grades and their identity from the finished run

> Task ID: GAW-7
> Sprint: [SPRINT.md](./SPRINT.md)
> Status: Backlog
> Assignee: github-platform-implementer
> Priority: P0
> Points: 3
> Type: FEATURE
> Planner: github-agentic-workflow-planner
> Reviewer: github-agentic-workflow-reviewer
> Proposed By: github-agentic-workflow-planner
> Wave: C
> TDD_MODE: red_first · RED_GREEN_REQUIRED: true

AGENT: planner=github-agentic-workflow-planner | implementer=github-platform-implementer | reviewer=github-agentic-workflow-reviewer

## Background

- **Problem:** run 41157270388's artifact has 0 of 40 check rows citing evidence, 32 reading adapter-not-implemented, and requested equal to observed on 1 of 10 keyed cells. The summary shows one row per cell and no plugin identity.
- **Source:** PRD `04-uc-grd.md` UC-GRD-01 AC-2 and AC-6, and the sprint gate sentence.
- **Gate steps that exercise this task:** 2, 3, 5, 7, 9, 26. Capability: CAP-EVAL-01.

## Critical Constraints

- **MUST:** The flow resolves the newest completed harness-eval run whose head_sha equals git rev-parse HEAD, then downloads its attempt-qualified result. A hardcoded run id is forbidden, and an older commit's run cannot satisfy it.
- **MUST:** The summary gains one row per check: harness, track, check, verdict, reason, source. The identity table gains plugin revision and digest. Both render from the validated record.
- **MUST:** The two sprint-02 policy files are committed with the plan, not written here: the validator refuses a flow whose policy file is absent at plan time.
- **MUST:** The recorder refuses a keyed pass check with no evidence path. A check whose capture GAW-9 withheld reads could-not-run evidence-withheld before it reaches the recorder, so a withheld capture is reported rather than refusing the whole result.
- **STRICTLY:** This flow replays only after GAW-1 and GAW-3 to GAW-6 land. Review reports it DEFERRED until then, and the trunk replay decides.

## Specification

- **Objective:** A finished hand dispatch shows twelve cells, with four evidenced checks and a proven identity on each of the ten keyed cells, and the recorder refuses a graded pass that cites nothing.
- **Success state:** On the newest completed run for HEAD, 40 check rows cite evidence, requested equals observed on 10 of 10 keyed cells, `plugin_revision` equals `candidate_sha`, both cursor cells read could-not-run `missing-api-key`, and the summary carries one row per check. A pass check with blank `evidence_paths` is refused with `check-unevidenced`.

Contract details:

- The result lands at grade/harness-eval-result.json inside the artifact. Sprint 01's gate text says the artifact root, which is wrong.

## Acceptance Criteria (GIVEN-WHEN-THEN)

### AC-1: A finished dispatch reads twelve cells, with four evidenced checks on each keyed cell [PRIMARY]

- **GIVEN:** a real hand dispatch finished on the landed commit
- **WHEN:** the flow resolves the newest completed harness-eval run whose `head_sha` equals `git rev-parse HEAD`, downloads its attempt-qualified result, and reads `grade/harness-eval-result.json` and `recorder.log`
- **THEN:** `.cells | length` prints 12 across 6 harnesses, 40 check rows on the ten keyed cells cite evidence, requested equals observed on 10 of 10 keyed cells with `plugin_revision` equal to `candidate_sha`, both cursor cells read `could-not-run` `missing-api-key`, and `recorder.log` prints `files-and-event-stream` on 40 rows

```text
FLOW_REF:              FLOW-GRD-01-TWELVE-CELLS
TEST_TIER:             e2e
VERIFICATION_SERVICE:  GitHub Actions harness-eval run on hackerpug-ai/pixel-perfect, read through gh and its harness-eval-result artifact
SURFACE_POLICY:        .spec/e2e-policy/sprint-02/artifact-only-read.json
TDD_STATE:             none
TEST_FILE:             tests/sprint-02/grd-01-twelve-cells.test.mjs
TEST_FUNCTION:         FLOW-GRD-01-TWELVE-CELLS
VERIFY:                node --test --test-name-pattern 'FLOW-GRD-01-TWELVE-CELLS' tests/sprint-02/grd-01-twelve-cells.test.mjs
```

SCENARIO_SUMMARY: The finished run for HEAD reads twelve cells, each keyed cell with four evidenced checks bound to the version and plugin it ran.

### AC-2: The recorder refuses a keyed pass check with no evidence path

- **GIVEN:** the downloaded result with one pass check's `evidence_paths` blanked
- **WHEN:** those cells pass through `collectCells`
- **THEN:** it throws `RecorderRefusal` with reason `check-unevidenced`, and no result file is written

```text
FLOW_REF:              null
TEST_TIER:             integration
VERIFICATION_SERVICE:  real recorder module and shipped schema over a real downloaded result
SURFACE_POLICY:        null
TDD_STATE:             none
TEST_FILE:             tests/sprint-02/grd-01-twelve-cells.test.mjs
TEST_FUNCTION:         RECORDER-REFUSES-UNEVIDENCED
VERIFY:                node --test --test-name-pattern 'RECORDER-REFUSES-UNEVIDENCED' tests/sprint-02/grd-01-twelve-cells.test.mjs
```

SCENARIO_SUMMARY: A real result with one citation blanked is refused, and the unchanged result is accepted.

Each AC's RED input and positive example are in its row of the contract block below.

## Test Criteria

Each TC runs its mapped AC's VERIFY.

| ID | Statement | Maps to |
|---|---|---|
| TC-1 | `.cells | length` prints 12 when the flow reads the newest completed run for HEAD | AC-1 |
| TC-2 | 40 check rows on the ten keyed cells carry a non-empty `evidence_paths` when the result is read | AC-1 |
| TC-3 | `requested_cli_version` equals `observed_cli_version` on 10 of 10 keyed cells when the result is read | AC-1 |
| TC-4 | Both cursor cells read reason `missing-api-key` when the result is read | AC-1 |
| TC-5 | `recorder.log` prints `files-and-event-stream` on 40 check rows when the summary is rendered | AC-1 |
| TC-6 | `collectCells` throws reason `check-unevidenced` when a pass check's `evidence_paths` is blank | AC-2 |

## Reading List

1. `test/harness/recorder/validate.mjs` lines 103-141: toHarnessCell and collectCells
2. `test/harness/recorder/summary.mjs` lines 20-55: the summary table
3. `test/harness/recorder.mjs` lines 202-240: main and the artifact layout
4. `tests/sprint-01/grd-01-twelve-cells.test.mjs` lines 1-60: the sprint-01 reader this one replaces at the hosted surface

Standards: `AGENTS.md`, `brain/docs/kanban/SCENARIO-CONTRACT-V1.md`.

## Guardrails

WRITE-ALLOWED:

- test/harness/recorder/validate.mjs (MODIFY)
- test/harness/recorder/summary.mjs (MODIFY)
- tests/sprint-02/grd-01-twelve-cells.test.mjs (NEW)

WRITE-PROHIBITED:

- .github/workflows/harness-eval.yml - no workflow change in this task
- .spec/e2e-policy/** - the two policy files are committed with the plan
- test/harness/adapters/** - GAW-1 and the adapter tasks own them
- test/harness/smoke/** - GAW-1, E1, E2, E3 and E9 own them
- Any file not listed in WRITE-ALLOWED

## Code Pattern

```js
// test/harness/recorder/summary.mjs:36-37: the per-cell table the per-check table sits beside.
"| harness | track | verdict | observed CLI version | reason | release effect |",
"|---|---|---|---|---|---|",

// test/harness/recorder/validate.mjs:110: the validation style to follow.
if (!HARNESSES.includes(harness)) throw new RecorderRefusal("cell-harness-unknown", { harness: harness ?? null });
```

- **Anti-pattern:** A hardcoded run id; expecting a verdict word in advance; a screenshot score field; refusing a withheld capture instead of reading its could-not-run row.

## Design

None. This task has no UI surface.

## Agent Instructions

Write the FLOW-GRD-01 test first, and retain its RED at `.tmp/sprint-02-verification/grd-01-twelve-cells.json.red`, then work AC-2 with one RED, GREEN, REFACTOR cycle. The flow writes only `.tmp/sprint-02-verification/grd-01-twelve-cells.json` and a scratch download dir, and it never dispatches, pushes or commits. Report the flow DEFERRED at review until its prerequisites land; the trunk replay decides it.

## Orchestrator Verification Protocol

1. **VERIFY_RED:** AC-1 fails against run 41157270388's artifact, and AC-2 fails on base for the reason its RED names.
2. **VERIFY_GREEN:** AC-2 exits 0. AC-1 is DEFERRED until every `available_after` task has landed, and is not reported as passing before then.
3. Run every Evidence Gate and compare with Expected.
4. `git diff --name-only` lists only WRITE-ALLOWED paths.
5. Dispatch `github-agentic-workflow-reviewer` with this file, the RED and GREEN output, and the evidence.

## Agent Assignment

- **Planner:** `github-agentic-workflow-planner`
- **Implementer:** `github-platform-implementer`
- **Reviewer:** `github-agentic-workflow-reviewer`
- **Rationale:** `github-platform-implementer` owns the artifact reader and the run summary. `github-agentic-workflow-reviewer` audits that the flow reads the run's own bytes and expects no verdict in advance.

## Evidence Gates

Every VERIFY above exits 0, then:

- **tests:** `node --test --test-name-pattern 'RECORDER-REFUSES-UNEVIDENCED' tests/sprint-02/grd-01-twelve-cells.test.mjs`. Expected: exit 0: the refusal holds on a real result
- **regression-recorder:** `node --test tests/sprint-01/grd-01-twelve-cells.test.mjs`. Expected: exit 0: the recorder's twelve-cell rules still hold

## Review Criteria

Must pass:

- The FLOW-GRD-01 test name and command equal the locked flow's.
- The flow resolves its run by `head_sha`, with no hardcoded run id.
- The flow asserts no pass verdict: it reads the verdict words from the run.
- The recorder refuses a keyed pass check with no evidence path.
- The withheld path still reaches the recorder as could-not-run `evidence-withheld`.

Should verify:

- No secret value appears in the flow's report.
- Both summary additions render from the validated record.

Verdict: APPROVED or NEEDS_FIXES, with file and line for each finding.

## Dependencies

- **Depends on:** GAW-1 (the checks evidence_paths schema field the recorder validates)
- **Blocks:** none

## Notes

- **Flows:** this task is the PRIMARY owner of FLOW-GRD-01-TWELVE-CELLS. AC-2 is task-local.
- **Integration obligation:** `obl-FLOW-GRD-01-TWELVE-CELLS` in the contract block schedules the trunk replay.
- **First integrated demonstration:** start from a landed commit on `main` with GAW-1 to GAW-9 and GAW-I1, run `gh workflow run harness-eval --repo hackerpug-ai/pixel-perfect`, then read `grade/harness-eval-result.json` with the gate's jq steps. It needs the harness-smoke keys and the owner's stance approvals. `github-platform-implementer` owns proof and repair.
- **Provenance:** prd 04-uc-grd.md UC-GRD-01 AC-2, AC-6; target-sprint.json gate_sentence

<!-- REQUIREMENT-CONTRACT v1 -->
<!--
{"version":"1","task_id":"GAW-7","task_type":"FEATURE","tdd_mode":"red_first","verification_policy":{"requires_tests":true,"requires_red_evidence":true,"requires_seeded_evidence":true},"guardrails":{"write_allowed":["test/harness/recorder/validate.mjs (MODIFY)","test/harness/recorder/summary.mjs (MODIFY)","tests/sprint-02/grd-01-twelve-cells.test.mjs (NEW)"],"write_prohibited":[".github/workflows/harness-eval.yml - no workflow change in this task",".spec/e2e-policy/** - the two policy files are committed with the plan","test/harness/adapters/** - GAW-1 and the adapter tasks own them","test/harness/smoke/** - GAW-1, E1, E2, E3 and E9 own them","Any file not listed in WRITE-ALLOWED"]},"fixtures":{"seed/hosted-dispatch":{"description":"The newest completed harness-eval run on the landed commit, started by a real dispatch","seed_method":"cli","records":["12 cells in grade/harness-eval-result.json"]}},"verification_gates":[{"gate":"tests","command":"node --test --test-name-pattern 'RECORDER-REFUSES-UNEVIDENCED' tests/sprint-02/grd-01-twelve-cells.test.mjs","expected":"exit 0: the refusal holds on a real result","positive_example":"the blanked result is refused and the unchanged result is accepted"},{"gate":"regression-recorder","command":"node --test tests/sprint-01/grd-01-twelve-cells.test.mjs","expected":"exit 0: the recorder's twelve-cell rules still hold","positive_example":"the sprint-01 file passes with the new summary rows and validation"}],"integration_obligations":[{"id":"obl-FLOW-GRD-01-TWELVE-CELLS","flow_ref":"FLOW-GRD-01-TWELVE-CELLS","phase":"post-integration","mandatory":true,"owner_task_id":"GAW-7","available_after":["GAW-1","GAW-7","E1","GAW-3","GAW-4","GAW-5","GAW-6","E4","E5","E6","E7","E8"],"required_by":[],"recheck_on":["GAW-2","GAW-8","GAW-9","GAW-10","GAW-I1","E2","E3","E9"],"recheck_paths":["tests/sprint-02/grd-01-twelve-cells.test.mjs",".github/workflows/harness-eval.yml","test/harness/pins.json","test/harness/recorder.mjs","test/harness/recorder/**","test/harness/adapters/**","test/harness/smoke/**","test/harness/schemas/**","test/harness/stream/**"],"completion_rule":"FLOW-GRD-01-TWELVE-CELLS passes on the trunk when `node --test --test-name-pattern 'FLOW-GRD-01-TWELVE-CELLS' tests/sprint-02/grd-01-twelve-cells.test.mjs` exits 0 and the flow's artifact .tmp/sprint-02-verification/grd-01-twelve-cells.json is retained with its expected observations matched.","verification_gates":[],"requirements":[],"owner_bindings":[{"owner_task_id":"GAW-7","flow_ref":"FLOW-GRD-01-TWELVE-CELLS","command":"node --test --test-name-pattern 'FLOW-GRD-01-TWELVE-CELLS' tests/sprint-02/grd-01-twelve-cells.test.mjs"}],"build_identity":{"kind":"interpreted-source"}}],"requirements":[{"id":"AC-1","type":"acceptance_criterion","primary":true,"description":"GIVEN a real hand dispatch finished on the landed commit WHEN the flow resolves the newest completed harness-eval run whose `head_sha` equals `git rev-parse HEAD`, downloads its attempt-qualified result, and reads `grade/harness-eval-result.json` and `recorder.log` THEN `.cells | length` prints 12 across 6 harnesses, 40 check rows on the ten keyed cells cite evidence, requested equals observed on 10 of 10 keyed cells with `plugin_revision` equal to `candidate_sha`, both cursor cells read `could-not-run` `missing-api-key`, and `recorder.log` prints `files-and-event-stream` on 40 rows","flow_ref":"FLOW-GRD-01-TWELVE-CELLS","test_file":"tests/sprint-02/grd-01-twelve-cells.test.mjs","test_function":"FLOW-GRD-01-TWELVE-CELLS","verify":"node --test --test-name-pattern 'FLOW-GRD-01-TWELVE-CELLS' tests/sprint-02/grd-01-twelve-cells.test.mjs","test_tier":"e2e","verification_service":"GitHub Actions harness-eval run on hackerpug-ai/pixel-perfect, read through gh and its harness-eval-result artifact","surface_policy":".spec/e2e-policy/sprint-02/artifact-only-read.json","positive_example":"A run on the landed commit where 40 check rows on the ten keyed cells cite evidence, requested equals observed on all ten, and both cursor cells read could-not-run missing-api-key.","red":"Run 41157270388's artifact: 0 of 40 check rows cite evidence, 32 read adapter-not-implemented, and requested equals observed on 1 of 10 keyed cells.","maps_to_ac":null,"scenario":{"tier":"visible","test_tier":"e2e","verification_service":"GitHub Actions harness-eval run on hackerpug-ai/pixel-perfect, read through gh and its harness-eval-result artifact","topology":"single-node","negative_control":{"would_fail_if":["a keyed cell omits a check, or a check carries an empty evidence_paths array","a newest cell is stamped with the pin instead of the version that track resolved","a keyed cell still reads <harness>-adapter-not-implemented","the recorder is disconnected, so the artifact is absent or static"]},"evidence":{"forms":["file_artifact","stdout"],"examples":["jq prints 40 for checks with evidence paths"],"required_capture":true},"build_proof":{"range":"anything that proves a real dispatch produced twelve cells whose ten keyed cells each carry four evidenced checks bound to the version and plugin they ran","examples":["recorder validation of checks evidence_paths","a summary row per check"]},"cases":[{"start_ref":"seed/hosted-dispatch","action":{"actor":"maintainer","steps":["gh run download the newest completed run's harness-eval-result-<RUN_ID>-<attempt> artifact for this commit","read grade/harness-eval-result.json and recorder.log from it"]},"end_state":{"must_observe":["`.cells | length` prints 12 and 6 unique harnesses","40 check rows on the ten keyed cells carry a non-empty evidence_paths array","requested_cli_version equals observed_cli_version on 10 of 10 keyed cells, and plugin_revision equals candidate_sha","both cursor cells read `could-not-run` with reason `missing-api-key`","recorder.log prints `files-and-event-stream` on 40 check rows"],"must_not_observe":["any check reason ending in `adapter-not-implemented`","a keyed cell with an empty checks array or 0 evidence paths","a screenshot score, pixel percentage, or image-diff field in any cell","a pass taken from process_exit_code 0 alone"]}}]}},{"id":"AC-2","type":"acceptance_criterion","primary":false,"description":"GIVEN the downloaded result with one pass check's `evidence_paths` blanked WHEN those cells pass through `collectCells` THEN it throws `RecorderRefusal` with reason `check-unevidenced`, and no result file is written","flow_ref":null,"test_file":"tests/sprint-02/grd-01-twelve-cells.test.mjs","test_function":"RECORDER-REFUSES-UNEVIDENCED","verify":"node --test --test-name-pattern 'RECORDER-REFUSES-UNEVIDENCED' tests/sprint-02/grd-01-twelve-cells.test.mjs","test_tier":"integration","verification_service":"real recorder module and shipped schema over a real downloaded result","surface_policy":null,"positive_example":"The real result unchanged is accepted; the same result with one pass check's evidence_paths blanked is refused.","red":"On base toHarnessCell accepts a pass check with no evidence_paths, so collectCells does not throw and this test fails.","maps_to_ac":null,"scenario":{"tier":"visible","test_tier":"integration","verification_service":"real recorder module and shipped schema over a real downloaded result","topology":"single-node","negative_control":{"would_fail_if":["the recorder validation is a no-op, so a keyed pass with empty evidence_paths is recorded"]},"evidence":{"forms":["stdout"],"examples":["refusal reason check-unevidenced"],"required_capture":true},"build_proof":{"range":"anything that proves the recorder refuses a graded pass check with no evidence path","examples":["validation in toHarnessCell"]},"cases":[{"start_ref":"seed/hosted-dispatch","action":{"actor":"runner","steps":["take the downloaded result, blank one pass check's evidence_paths, and feed the cells to collectCells"]},"end_state":{"must_observe":["collectCells throws RecorderRefusal with reason `check-unevidenced`"],"must_not_observe":["a result file written with 0 evidence paths on a pass check"]}}]}},{"id":"TC-1","type":"test_criterion","description":"`.cells | length` prints 12 when the flow reads the newest completed run for HEAD","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'FLOW-GRD-01-TWELVE-CELLS' tests/sprint-02/grd-01-twelve-cells.test.mjs","positive_example":"A run on the landed commit where 40 check rows on the ten keyed cells cite evidence, requested equals observed on all ten, and both cursor cells read could-not-run missing-api-key."},{"id":"TC-2","type":"test_criterion","description":"40 check rows on the ten keyed cells carry a non-empty `evidence_paths` when the result is read","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'FLOW-GRD-01-TWELVE-CELLS' tests/sprint-02/grd-01-twelve-cells.test.mjs","positive_example":"A run on the landed commit where 40 check rows on the ten keyed cells cite evidence, requested equals observed on all ten, and both cursor cells read could-not-run missing-api-key."},{"id":"TC-3","type":"test_criterion","description":"`requested_cli_version` equals `observed_cli_version` on 10 of 10 keyed cells when the result is read","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'FLOW-GRD-01-TWELVE-CELLS' tests/sprint-02/grd-01-twelve-cells.test.mjs","positive_example":"A run on the landed commit where 40 check rows on the ten keyed cells cite evidence, requested equals observed on all ten, and both cursor cells read could-not-run missing-api-key."},{"id":"TC-4","type":"test_criterion","description":"Both cursor cells read reason `missing-api-key` when the result is read","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'FLOW-GRD-01-TWELVE-CELLS' tests/sprint-02/grd-01-twelve-cells.test.mjs","positive_example":"A run on the landed commit where 40 check rows on the ten keyed cells cite evidence, requested equals observed on all ten, and both cursor cells read could-not-run missing-api-key."},{"id":"TC-5","type":"test_criterion","description":"`recorder.log` prints `files-and-event-stream` on 40 check rows when the summary is rendered","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'FLOW-GRD-01-TWELVE-CELLS' tests/sprint-02/grd-01-twelve-cells.test.mjs","positive_example":"A run on the landed commit where 40 check rows on the ten keyed cells cite evidence, requested equals observed on all ten, and both cursor cells read could-not-run missing-api-key."},{"id":"TC-6","type":"test_criterion","description":"`collectCells` throws reason `check-unevidenced` when a pass check's `evidence_paths` is blank","maps_to_ac":"AC-2","verify":"node --test --test-name-pattern 'RECORDER-REFUSES-UNEVIDENCED' tests/sprint-02/grd-01-twelve-cells.test.mjs","positive_example":"The real result unchanged is accepted; the same result with one pass check's evidence_paths blanked is refused."}]}
-->
