# TASK-E2: The evaluator writes each case's verify report at its declared path on the live path, for every keyed cell

> Task ID: E2
> Sprint: [SPRINT.md](./SPRINT.md)
> Status: Backlog
> Assignee: evals-implementer
> Priority: P0
> Points: 5
> Type: FEATURE
> Planner: evals-planner
> Reviewer: evals-reviewer
> Proposed By: evals-planner
> Wave: C
> TDD_MODE: red_first · RED_GREEN_REQUIRED: true

AGENT: planner=evals-planner | implementer=evals-implementer | reviewer=evals-reviewer

## Background

- **Human testing gate steps:** flow steps 16, 17; also exercised at 14, 26.
- **PRD references:** `04-uc-grd.md UC-GRD-04 AC-6`; `09-technical-requirements/03-data-schema.md VerifyReport`, under `.spec/prds/harness-eval-framework/`. Capability: CAP-EVAL-01.
- **Why it matters:** Nothing on the live path calls `writeVerifyReport`, so run 41235273928's verify-reports artifact is empty and claude-code's verify row reads fail report-missing. The owner decided the evaluator writes the report (ROADMAP D-02).
- **Current:** `writeVerifyReport` and the keyless oracle are real and tested, and neither has a live caller. T16 landed at 6872fbd with its verify half live, so the prompt still tells the model to write this same path until GAW-11 removes it.
- **Desired:** After each verify invocation the keyless evaluator writes the report from what that invocation observed.
- **Boundary:** invocation bytes to verify report: a report exists at exactly the case-declared path, and only that invocation's own bytes can name a detected defect.

## Critical Constraints

- MUST run the evaluator step with no model credential in its environment
- MUST run the keyless oracle precheck before live verify; a mismatch is could-not-run, never a plugin failure
- MUST NOT change readVerifyReport or bindReport, because tests/sprint-01/grd-02 locks them, and MUST keep the writer in graders/, because adapters do not grade
- NEVER count a copied expected_defect_key as detection: the observed key must sit in a real stream or tool-result span, and NEVER glob, pick the newest file or fall back to any new file
- NEVER relabel unwritable storage as a plugin defect: it stays `report-unavailable`

## Specification

- **Objective:** After each verify invocation the keyless evaluator writes the planted and clean reports at exactly their case-declared paths from what that invocation observed, and a denied tool call on exit 0 appears in its report.
- **Success state:** On a finished run at HEAD, 10 `verify-button-drift.json` and 10 `verify-clean.json` bodies each match the cell that produced them, and `reports/denied-write-probe.json` reads process_exit_code 0 beside denied operation Write.

- The evaluator writes the report: owner decision, 2026-10-31, matching PRD 03-data-schema line 72. T16 landed at 6872fbd with its verify half live, meaning its verify prompt and its one-path write allow-list. GAW-11 removes both, so no graded run is told to write a report.
- The writer must not race the invocation at the report path: it starts only after that invocation's process has exited, and it needs GAW-11's removal landed, because T16's prompt and allow-list otherwise let the model write the same path.
- Detection comes from a raw span of the invocation's own stdout or tool result naming the defect key, plus the staged capture's sha256 and offsets. With node allowed on plugin scripts, the expected span is the `verify-catalog.mjs --check` tool result. When the stream mapping state is neither `qualified` nor `reproved`, the report reads observed_verify_outcome `unavailable` with could_not_run_reason naming that stream-mapping reason.
- A verify that never ran still gets both reports, so step 16's `10` and `10` hold. A refusal record, such as opencode-args-channel-unknown or stance-unrecorded, reaches the gradeInvocation verify branch. A failed install reaches the same writer through one call in runCell's install-failure branch. Each report reads observed_verify_outcome `unavailable`, observed_defect_key null, evaluation_verdict `could-not-run`, and could_not_run_reason naming the refusal. A cell the registry refuses before any adapter runs writes none: that means a keyed secret is missing from harness-smoke, and gate step 1 already fails.
- Each report lands in its invocation directory, and runCell copies it to <evidenceDir>/reports/<entry.key>/, which GAW-9 exports. A failed install uses a fresh directory and the same copy.
- attachDeniedWriteProbe writes reports/denied-write-probe.json under <evidenceDir>/reports/denied-write-probe/, so GAW-9 exports it. Its case manifest stays out of cases/index.json, because the sprint-01 locks read that list and loadCase reads by filename.

## Acceptance Criteria (GIVEN-WHEN-THEN)

### AC-1: Both case-declared reports exist per keyed cell, bound to the invocation that produced them [PRIMARY]

- **GIVEN:** `dispatched_run`, a finished hand dispatch of harness-eval on the landed commit
- **WHEN:** the maintainer downloads harness-eval-verify-reports for the newest completed run at HEAD and opens each report, with claude-code pinned's denied-write-probe report
- **THEN:** 10 verify-button-drift.json and 10 verify-clean.json bodies match their cells, and the probe report reads process_exit_code 0 beside denied operation Write

```text
FLOW_REF:              FLOW-GRD-04-NAMED-PATH
TEST_FILE:             tests/sprint-02/grd-04-named-path.test.mjs
TEST_FUNCTION:         FLOW-GRD-04-NAMED-PATH
TEST_TIER:             e2e
VERIFICATION_SERVICE:  real harness-eval run on a hosted runner with real CLIs and keys, read through gh artifacts
SURFACE_POLICY:        .spec/e2e-policy/sprint-02/artifact-only-read.json
```

SCENARIO_SUMMARY: Twenty reports from a real run, each bound to its own invocation, and a denied Write visible on exit 0.

### AC-2: The report comes from the invocation's own bytes, and decoys, copied keys and refusals cannot satisfy it

- **GIVEN:** `committed_real_capture`, the real claude-code run with no detected defect and a Write denial, and a materialized planted kit with its clean twin
- **WHEN:** the writer grades that capture as each case, decoys sit beside the declared path, the keyless oracle runs, and a refusal and a failed install reach the verify branch
- **THEN:** the report reads missed-defect at its declared path, the probe report shows the denial, decoys read report-missing, the oracle exits 1 then 0, and never-ran verifies read unavailable

```text
FLOW_REF:              null
TEST_FILE:             tests/sprint-02/verify-report.test.mjs
TEST_FUNCTION:         VERIFY-REPORT-REAL-BYTES
TEST_TIER:             integration
VERIFICATION_SERVICE:  the real report writer and keyless oracle over a committed real claude-code capture and a real materialized kit
SURFACE_POLICY:        null
```

SCENARIO_SUMMARY: Five cases: a missed defect, a denial on exit 0, decoys and borrowed bodies, the keyless oracle pair, and reports for verifies that never ran.

## Test Criteria

| TC | Statement | Maps to |
|----|-----------|---------|
| TC-1 | The verify-reports artifact holds 10 verify-button-drift.json files when the run at HEAD finishes | AC-1 |
| TC-2 | The verify-reports artifact holds 10 verify-clean.json files when the run at HEAD finishes | AC-1 |
| TC-3 | Each report body's invocation_id equals the invocation that produced it when the run at HEAD finishes | AC-1 |
| TC-4 | The claude-code pinned probe report reads denied_tool_call.operation Write beside process_exit_code 0 when the run at HEAD finishes | AC-1 |
| TC-5 | The committed capture graded as verify-button-drift writes observed_verify_outcome missed-defect at the declared path | AC-2 |
| TC-6 | A decoy file beside the declared path reads fail report-missing when no report was written | AC-2 |
| TC-7 | The keyless oracle exits 1 naming atoms/Button/default on the planted kit | AC-2 |
| TC-8 | A refused verify writes a report reading observed_verify_outcome unavailable at each declared name | AC-2 |

## Reading List

1. `test/harness/graders/report-writer.mjs` lines 75-127: writeVerifyReport: real, tested, and with no caller on the live path
2. `test/harness/kit/oracle-precheck.mjs` lines 39-91: the keyless oracle, also with no live caller
3. `.spec/prds/harness-eval-framework/09-technical-requirements/03-data-schema.md` lines 72-74: report fields and who owns the report
4. `.spec/prds/harness-eval-framework/tasks/sprint-01-evaluator-evidence-spine/TASK-T16.md` lines 59-65: Seam 2, T16's verify half: live on main until GAW-11 removes it
5. `test/harness/adapters/claude-code.mjs` lines 231-247: verifyReportPrompt: the live prompt naming this report path, which GAW-11 removes
6. `test/harness/runtime/stance.mjs` lines 93-97: allowed_writes: the one-path write allow-list, which GAW-11 removes
7. `test/harness/smoke/observations.mjs` lines 457-480: attachDeniedWriteProbe, where the probe's report is written
8. `.spec/scenarios/UC-GRD-04/flow-grd-04-named-path.scenario.md` lines all: the registry entry behind this task's flow

Coding standards: `AGENTS.md`, `brain/docs/TDD-METHODOLOGY.md`, `brain/docs/kanban/SCENARIO-CONTRACT-V1.md`.

## Guardrails

WRITE-ALLOWED:

- test/harness/graders/verify-report.mjs (NEW)
- test/harness/graders/grade-invocation.mjs (MODIFY)
- test/harness/smoke/observations.mjs (MODIFY)
- test/harness/smoke/cell.mjs (MODIFY)
- test/harness/cases/denied-write-probe.json (NEW)
- tests/sprint-02/grd-04-named-path.test.mjs (NEW)
- tests/sprint-02/verify-report.test.mjs (NEW)

WRITE-PROHIBITED:

- tests/sprint-01/** - locked; grd-02 reads readVerifyReport and bindReport
- test/harness/adapters/** - adapters do not grade
- test/harness/graders/report-writer.mjs - the writer is called, not changed
- test/harness/kit/** - the oracle is called, not changed
- test/harness/cases/index.json - sprint-01 locks read that list, and loadCase reads by filename
- .github/workflows/** - GAW-9 owns report transport
- plugins/pixel-perfect/** - the graded product
- Any file not listed in WRITE-ALLOWED

## Code Pattern

```js
// test/harness/graders/verify-report.mjs. The writer is real; other names show the shape only.
import { writeVerifyReport } from "./report-writer.mjs";

export function writeInvocationReport({ caseManifest, invocation, record }) {
  const span = spanNaming(record, caseManifest.defect_key); // this invocation's own stdout or tool result
  const body = {
    schema: "verify-report/v1",
    case_id: caseManifest.case_id,
    invocation_id: invocation.invocationId,
    observed_verify_outcome: span ? "defect-detected" : "missed-defect",
    observed_defect_key: span ? caseManifest.defect_key : null,
    evidence: span ? { capture_sha256: record.stdout.sha256, event_offsets: span.offsets } : null,
  };
  return writeVerifyReport({ caseManifest, invocation, body });
}
```

- **Source:** `test/harness/graders/report-writer.mjs:75-127`, `test/harness/kit/oracle-precheck.mjs:39-91`
- **Anti-pattern:** Copying `expected_defect_key` into the body; `reports/*.json`, the newest file, or any new file; a prompt telling the model to write the report; relabelling unwritable storage as a plugin defect.

## Design

None. This task has no UI surface.

## Agent Instructions

1. Work AC-2 first, as the local RED, GREEN, REFACTOR loop. Run the oracle on a materialized kit in a temp dir, and get the refusal capture from the real guard with no key in the child environment. Pass a temp copy of the claude table declaring 2.1.314 as `mapping` with state `qualified`, as E1's proof does, because the real tables directory holds none for 2.1.314.
2. Then write `FLOW-GRD-04-NAMED-PATH`. It reads the newest completed harness-eval run whose head_sha equals `git rev-parse HEAD` through `gh`, and writes `.tmp/sprint-02-verification/grd-04-named-path.json` on a pass. With no such run it fails naming the missing run, and it never skips or hard-codes a run id.
3. Capture the flow's RED at `.tmp/sprint-02-verification/grd-04-named-path.json.red` from a scratch worktree detached at c5c9272, with the new test copied in, because HEAD there equals run 41235273928's head_sha.
4. Do not dispatch the workflow; the integration step does, at the trunk candidate. Review reports AC-1 DEFERRED while an `available_after` task is unlanded, and AC-1 never runs against a stand-in.

## Orchestrator Verification Protocol

1. VERIFY_RED: each task-local VERIFY exits non-zero on the base commit, and the flow's RED proof exists at `.tmp/sprint-02-verification/grd-04-named-path.json.red`.
2. VERIFY_GREEN: AC-2's command exits 0 on the landed task. AC-1 exits 0 on the trunk replay and retains its artifact.
3. Regression: `node --test tests/sprint-01/grd-02-four-grades.test.mjs`; `node --test tests/sprint-01/t13-smoke-observations.test.mjs`; `node --test tests/sprint-01/t15-hosted-controls.test.mjs` each exit 0.
4. `git diff --name-only` lists only WRITE-ALLOWED paths.
5. Dispatch `evals-reviewer` with this file, the RED and GREEN outputs, and the evidence.

## Agent Assignment

- **Planner role:** `evals-planner`
- **Implementer role:** `evals-implementer`
- **Reviewer role:** `evals-reviewer`
- **Rationale:** `evals-implementer` owns the keyless report writer against real captures; `evals-reviewer` audits that detection cannot be copied or faked.

## Evidence Gates

- **AC-1:** `node --test --test-name-pattern 'FLOW-GRD-04-NAMED-PATH' tests/sprint-02/grd-04-named-path.test.mjs`. Expected: TAP `ok` after 10 and 10 reports match their cells, and the probe report reads exit 0 beside `Write`.
- **AC-2:** `node --test --test-name-pattern 'VERIFY-REPORT-REAL-BYTES' tests/sprint-02/verify-report.test.mjs`. Expected: TAP `ok` after `missed-defect` at `reports/verify-button-drift.json`, the oracle's exit 1 and exit 0, and four `unavailable` bodies.

## Review Criteria

Must pass:

- Detection needs a raw span of the invocation's own stdout or tool result. A body with a copied key and no span reads missed-defect.
- No code path picks a report by glob, recency or any-new-file.
- The evaluator step reads no model credential, and no test compares a key value.
- A verify that never ran writes both reports reading unavailable with a named could_not_run_reason, never fail report-missing.
- The writer starts only after the invocation's process has exited, and no prompt or allow-list lets a graded run write the declared path.
- An oracle precheck mismatch reads could-not-run, never a plugin failure.
- `readVerifyReport`, `bindReport` and `cases/index.json` are unchanged in the diff.

Verdict: APPROVED or NEEDS_FIXES, with file and line for each finding.

## Dependencies

- **Depends on:** E1 (the gradeInvocation verify branch this writer plugs into), GAW-11 (verify cases with no report declaration and no write rule, so the evaluator is the only writer)
- **Blocks:** none

## Notes

- **Flow ownership:** PRIMARY owner of `FLOW-GRD-04-NAMED-PATH`. Its trunk proof is `obl-FLOW-GRD-04-NAMED-PATH`, in the contract block.
- **Dropped from this task:** editing readVerifyReport and adapters/claude-code.mjs, because tests/sprint-01/grd-02 locks the reader and adapters do not grade; graders/index.mjs, because gradeInvocation imports the module directly. Report transport is GAW-9's.

<!-- REQUIREMENT-CONTRACT v1 -->
<!--
{"version":"1","task_id":"E2","task_type":"FEATURE","tdd_mode":"red_first","verification_policy":{"requires_tests":true,"requires_red_evidence":true,"requires_seeded_evidence":true},"guardrails":{"write_allowed":["test/harness/graders/verify-report.mjs (NEW)","test/harness/graders/grade-invocation.mjs (MODIFY)","test/harness/smoke/observations.mjs (MODIFY)","test/harness/smoke/cell.mjs (MODIFY)","test/harness/cases/denied-write-probe.json (NEW)","tests/sprint-02/grd-04-named-path.test.mjs (NEW)","tests/sprint-02/verify-report.test.mjs (NEW)"],"write_prohibited":["tests/sprint-01/** - locked; grd-02 reads readVerifyReport and bindReport","test/harness/adapters/** - adapters do not grade","test/harness/graders/report-writer.mjs - the writer is called, not changed","test/harness/kit/** - the oracle is called, not changed","test/harness/cases/index.json - sprint-01 locks read that list, and loadCase reads by filename",".github/workflows/** - GAW-9 owns report transport","plugins/pixel-perfect/** - the graded product"]},"fixtures":{"dispatched_run":{"description":"One finished hand dispatch of harness-eval on hackerpug-ai/pixel-perfect with its real artifacts","seed_method":"cli","records":["gh workflow run harness-eval --repo hackerpug-ai/pixel-perfect","run_id re-fetched on every cold boot, never hard-coded"]},"committed_real_capture":{"description":"The real claude-code run committed by T15: CLI 2.1.314, process exit 0, one model request, a Bash denial and a Write denial, and no question","seed_method":"recorded_external","records":["test/harness/smoke/fixtures/denied-write/claude-code-denied-write.stdout.bin","test/harness/smoke/fixtures/denied-write/claude-code-denied-write.capture.json"]}},"verification_gates":[],"integration_obligations":[{"id":"obl-FLOW-GRD-04-NAMED-PATH","flow_ref":"FLOW-GRD-04-NAMED-PATH","phase":"post-integration","mandatory":true,"owner_task_id":"E2","available_after":["E2","E4","E5","E6","E7","E8","GAW-3","GAW-4","GAW-5","GAW-6","GAW-9","E1","GAW-11","E3"],"required_by":[],"recheck_on":["GAW-8","E9","GAW-I1"],"recheck_paths":["tests/sprint-02/grd-04-named-path.test.mjs","test/harness/graders/**","test/harness/stream/**","test/harness/smoke/**","test/harness/adapters/**","test/harness/cases/**","test/harness/kit/**","test/harness/pins.json",".github/workflows/harness-eval.yml","plugins/pixel-perfect/**"],"build_identity":{"kind":"interpreted-source"},"completion_rule":"FLOW-GRD-04-NAMED-PATH passes on the trunk when `node --test --test-name-pattern 'FLOW-GRD-04-NAMED-PATH' tests/sprint-02/grd-04-named-path.test.mjs` exits 0 against a completed harness-eval run whose head_sha equals the trunk candidate, and its artifact .tmp/sprint-02-verification/grd-04-named-path.json is retained with its expected observations matched.","verification_gates":[],"requirements":[],"owner_bindings":[{"owner_task_id":"E2","flow_ref":"FLOW-GRD-04-NAMED-PATH","command":"node --test --test-name-pattern 'FLOW-GRD-04-NAMED-PATH' tests/sprint-02/grd-04-named-path.test.mjs"}]}],"requirements":[{"id":"AC-1","type":"acceptance_criterion","primary":true,"title":"Both case-declared reports exist per keyed cell, bound to the invocation that produced them","description":"GIVEN `dispatched_run`, a finished hand dispatch of harness-eval on the landed commit WHEN the maintainer downloads harness-eval-verify-reports for the newest completed run at HEAD and opens each report, with claude-code pinned's denied-write-probe report THEN 10 verify-button-drift.json and 10 verify-clean.json bodies match their cells, and the probe report reads process_exit_code 0 beside denied operation Write","flow_ref":"FLOW-GRD-04-NAMED-PATH","test_file":"tests/sprint-02/grd-04-named-path.test.mjs","test_function":"FLOW-GRD-04-NAMED-PATH","verify":"node --test --test-name-pattern 'FLOW-GRD-04-NAMED-PATH' tests/sprint-02/grd-04-named-path.test.mjs","positive_example":"A run where 10 verify-button-drift.json and 10 verify-clean.json sit in harness-eval-verify-reports, each body's harness, track and invocation_id equal to the cell that produced it, and reports/denied-write-probe.json reads process_exit_code 0 beside denied operation Write.","red":"Run 41235273928: harness-eval-verify-reports holds INDEX.json with `reports: []`, and claude-code's verify row reads `fail report-missing`.","test_tier":"e2e","verification_service":"real harness-eval run on a hosted runner with real CLIs and keys, read through gh artifacts","unit_test_justified":null,"surface_policy":".spec/e2e-policy/sprint-02/artifact-only-read.json","scenario":{"id":"SC-GRD-04-1","use_case_ref":"UC-GRD-04","ac_ref":"AC-6","primary":true,"tier":"visible","test_tier":"e2e","verification_service":"real harness-eval run on a hosted runner with real CLIs and keys, read through gh artifacts","topology":"single-node","negative_control":{"would_fail_if":["nothing on the live path writes the report, so report-missing stays the reading","a copied expected_defect_key stands in for detection with the observed evidence absent","the denied-write report is omitted on a clean exit"]},"evidence":{"forms":["file_artifact","stdout"],"examples":["`reports/verify-button-drift.json` body names `atoms/Button/default` with a capture sha256 and byte offsets","`reports/denied-write-probe.json` reads process_exit_code `0` beside denied_tool_call operation `Write`"],"required_capture":true},"build_proof":{"range":"anything that proves the keyless evaluator writes each case's report at exactly its declared path from what that invocation really observed, and that the report shows a denied tool call on a clean exit","examples":["an evaluator step after each verify invocation that derives the report from captured bytes and the fixture capture, then calls writeVerifyReport"]},"cases":[{"start_ref":"dispatched_run","action":{"actor":"cli_user","steps":["resolve the newest completed harness-eval run whose head_sha equals `git rev-parse HEAD`","download harness-eval-verify-reports-<run_id>-<attempt>","open every verify-button-drift.json and verify-clean.json"]},"end_state":{"must_observe":["`10` files named `verify-button-drift.json` and `10` named `verify-clean.json`, each body's `harness`, `track` and `invocation_id` equal to the cell that produced it","a body with observed_defect_key `atoms/Button/default` cites capture_sha256 and event_offsets that resolve in that invocation's bytes"],"must_not_observe":["INDEX.json with `reports: []`, the reading of run 41235273928","`0` files","one report body shared by two invocations"]}},{"start_ref":"dispatched_run","action":{"actor":"cli_user","steps":["resolve the newest completed harness-eval run whose head_sha equals `git rev-parse HEAD`","open reports/denied-write-probe.json for claude-code pinned"]},"end_state":{"must_observe":["process_exit_code `0`, denied_tool_call.operation `Write`, evaluation_verdict `fail`, observed_verify_outcome `permission-denied`"],"must_not_observe":["evaluation_verdict `pass`","denied_tool_call `null`","an empty report body"]}}]},"maps_to_ac":null},{"id":"AC-2","type":"acceptance_criterion","primary":false,"title":"The report comes from the invocation's own bytes, and decoys, copied keys and refusals cannot satisfy it","description":"GIVEN `committed_real_capture`, the real claude-code run with no detected defect and a Write denial, and a materialized planted kit with its clean twin WHEN the writer grades that capture as each case, decoys sit beside the declared path, the keyless oracle runs, and a refusal and a failed install reach the verify branch THEN the report reads missed-defect at its declared path, the probe report shows the denial, decoys read report-missing, the oracle exits 1 then 0, and never-ran verifies read unavailable","flow_ref":null,"test_file":"tests/sprint-02/verify-report.test.mjs","test_function":"VERIFY-REPORT-REAL-BYTES","verify":"node --test --test-name-pattern 'VERIFY-REPORT-REAL-BYTES' tests/sprint-02/verify-report.test.mjs","positive_example":"The committed capture graded as the planted invocation writes reports/verify-button-drift.json reading observed_verify_outcome missed-defect, because its reply never names the key. The same capture graded as the probe writes reports/denied-write-probe.json reading process_exit_code 0 and denied operation Write. A verify refused before it ran writes both reports reading unavailable, with could_not_run_reason naming the refusal.","red":"On base test/harness/graders/verify-report.mjs does not exist and nothing on the live path calls writeVerifyReport, so the import fails and the declared path stays absent.","test_tier":"integration","verification_service":"the real report writer and keyless oracle over a committed real claude-code capture and a real materialized kit","unit_test_justified":null,"surface_policy":null,"scenario":{"id":"SC-VERIFY-REPORT-1","use_case_ref":"UC-GRD-04","ac_ref":"AC-6","primary":false,"tier":"visible","test_tier":"integration","verification_service":"the real report writer and keyless oracle over a committed real claude-code capture and a real materialized kit","topology":"single-node","negative_control":{"would_fail_if":["a copied expected_defect_key stands in for detection with the observed evidence absent","a stale or decoy file satisfies the declared path","a stubbed writer reports success with no file on disk"]},"evidence":{"forms":["file_artifact","stdout"],"examples":["`missed-defect` at `reports/verify-button-drift.json`"],"required_capture":true},"build_proof":{"range":"anything that proves the evaluator writes a case's report at exactly its declared path from that invocation's own bytes, and never counts metadata as detection","examples":["a report builder that searches the invocation's stdout spans for the case's defect key"]},"cases":[{"start_ref":"committed_real_capture","action":{"actor":"cli_user","steps":["grade the capture as verify-button-drift in a fresh invocation directory"]},"end_state":{"must_observe":["a report at exactly `reports/verify-button-drift.json` with observed_verify_outcome `missed-defect`, observed_defect_key `null`, evaluation_verdict `fail`"],"must_not_observe":["evaluation_verdict `pass`","an empty report body"]}},{"start_ref":"committed_real_capture","action":{"actor":"cli_user","steps":["grade the capture as denied-write-probe in a fresh invocation directory"]},"end_state":{"must_observe":["a report at exactly `reports/denied-write-probe.json` with process_exit_code `0`, denied_tool_call.operation `Write`, evaluation_verdict `fail`"],"must_not_observe":["denied_tool_call `null`","an empty report body"]}},{"start_ref":"committed_real_capture","action":{"actor":"cli_user","steps":["plant reports/verify-button-drift.backup.json and another invocation's report in the work area, then read the declared path with no report written"]},"end_state":{"must_observe":["the read reads `fail` `report-missing`, and a body carrying another invocation's id reads `fail` `report-mismatched-invocation`"],"must_not_observe":["the decoy read as the report","no reason on the refusal"]}},{"start_ref":"committed_real_capture","action":{"actor":"cli_user","steps":["run the keyless oracle on a materialized planted kit and on its clean twin"]},"end_state":{"must_observe":["the planted kit exits `1` naming `atoms/Button/default`, the clean twin exits `0`"],"must_not_observe":["exit `0` on the planted kit","no drifted key on the planted kit"]}},{"start_state":{"description":"A verify invocation with its binding removed, refused by the real guard, and a failed install with no invocation directory","seed_method":"cli","records":["a persisted refusal capture from runGuarded with no key in the child environment","the reason grok-install-failed from a real non-zero install step"]},"action":{"actor":"cli_user","steps":["grade the refusal capture as verify-button-drift and as verify-clean through the gradeInvocation verify branch","call the failed-install branch with reason `grok-install-failed`"]},"end_state":{"must_observe":["each of the `4` bodies sits at its declared report name and reads observed_verify_outcome `unavailable`, evaluation_verdict `could-not-run`, could_not_run_reason `missing-api-key` or `grok-install-failed`"],"must_not_observe":["verdict `fail` reason `report-missing`","observed_verify_outcome `missed-defect`","no file at the declared name"]}}]},"maps_to_ac":null},{"id":"TC-1","type":"test_criterion","description":"The verify-reports artifact holds 10 verify-button-drift.json files when the run at HEAD finishes","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'FLOW-GRD-04-NAMED-PATH' tests/sprint-02/grd-04-named-path.test.mjs","positive_example":"A run where 10 verify-button-drift.json and 10 verify-clean.json sit in harness-eval-verify-reports, each body's harness, track and invocation_id equal to the cell that produced it, and reports/denied-write-probe.json reads process_exit_code 0 beside denied operation Write."},{"id":"TC-2","type":"test_criterion","description":"The verify-reports artifact holds 10 verify-clean.json files when the run at HEAD finishes","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'FLOW-GRD-04-NAMED-PATH' tests/sprint-02/grd-04-named-path.test.mjs","positive_example":"A run where 10 verify-button-drift.json and 10 verify-clean.json sit in harness-eval-verify-reports, each body's harness, track and invocation_id equal to the cell that produced it, and reports/denied-write-probe.json reads process_exit_code 0 beside denied operation Write."},{"id":"TC-3","type":"test_criterion","description":"Each report body's invocation_id equals the invocation that produced it when the run at HEAD finishes","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'FLOW-GRD-04-NAMED-PATH' tests/sprint-02/grd-04-named-path.test.mjs","positive_example":"A run where 10 verify-button-drift.json and 10 verify-clean.json sit in harness-eval-verify-reports, each body's harness, track and invocation_id equal to the cell that produced it, and reports/denied-write-probe.json reads process_exit_code 0 beside denied operation Write."},{"id":"TC-4","type":"test_criterion","description":"The claude-code pinned probe report reads denied_tool_call.operation Write beside process_exit_code 0 when the run at HEAD finishes","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'FLOW-GRD-04-NAMED-PATH' tests/sprint-02/grd-04-named-path.test.mjs","positive_example":"A run where 10 verify-button-drift.json and 10 verify-clean.json sit in harness-eval-verify-reports, each body's harness, track and invocation_id equal to the cell that produced it, and reports/denied-write-probe.json reads process_exit_code 0 beside denied operation Write."},{"id":"TC-5","type":"test_criterion","description":"The committed capture graded as verify-button-drift writes observed_verify_outcome missed-defect at the declared path","maps_to_ac":"AC-2","verify":"node --test --test-name-pattern 'VERIFY-REPORT-REAL-BYTES' tests/sprint-02/verify-report.test.mjs","positive_example":"The committed capture graded as the planted invocation writes reports/verify-button-drift.json reading observed_verify_outcome missed-defect, because its reply never names the key. The same capture graded as the probe writes reports/denied-write-probe.json reading process_exit_code 0 and denied operation Write. A verify refused before it ran writes both reports reading unavailable, with could_not_run_reason naming the refusal."},{"id":"TC-6","type":"test_criterion","description":"A decoy file beside the declared path reads fail report-missing when no report was written","maps_to_ac":"AC-2","verify":"node --test --test-name-pattern 'VERIFY-REPORT-REAL-BYTES' tests/sprint-02/verify-report.test.mjs","positive_example":"The committed capture graded as the planted invocation writes reports/verify-button-drift.json reading observed_verify_outcome missed-defect, because its reply never names the key. The same capture graded as the probe writes reports/denied-write-probe.json reading process_exit_code 0 and denied operation Write. A verify refused before it ran writes both reports reading unavailable, with could_not_run_reason naming the refusal."},{"id":"TC-7","type":"test_criterion","description":"The keyless oracle exits 1 naming atoms/Button/default on the planted kit","maps_to_ac":"AC-2","verify":"node --test --test-name-pattern 'VERIFY-REPORT-REAL-BYTES' tests/sprint-02/verify-report.test.mjs","positive_example":"The committed capture graded as the planted invocation writes reports/verify-button-drift.json reading observed_verify_outcome missed-defect, because its reply never names the key. The same capture graded as the probe writes reports/denied-write-probe.json reading process_exit_code 0 and denied operation Write. A verify refused before it ran writes both reports reading unavailable, with could_not_run_reason naming the refusal."},{"id":"TC-8","type":"test_criterion","description":"A refused verify writes a report reading observed_verify_outcome unavailable at each declared name","maps_to_ac":"AC-2","verify":"node --test --test-name-pattern 'VERIFY-REPORT-REAL-BYTES' tests/sprint-02/verify-report.test.mjs","positive_example":"The committed capture graded as the planted invocation writes reports/verify-button-drift.json reading observed_verify_outcome missed-defect, because its reply never names the key. The same capture graded as the probe writes reports/denied-write-probe.json reading process_exit_code 0 and denied operation Write. A verify refused before it ran writes both reports reading unavailable, with could_not_run_reason naming the refusal."}]}
-->
