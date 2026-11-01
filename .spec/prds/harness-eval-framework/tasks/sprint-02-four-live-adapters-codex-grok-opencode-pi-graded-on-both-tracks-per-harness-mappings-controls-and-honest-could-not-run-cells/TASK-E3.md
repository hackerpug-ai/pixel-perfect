# TASK-E3: Exit-0 denials and hidden image judging are observed per keyed harness, and each graded row cites evidence a reader can open

> Task ID: E3
> Sprint: [SPRINT.md](./SPRINT.md)
> Status: Backlog
> Assignee: evals-implementer
> Priority: P0
> Points: 5
> Type: FEATURE
> Planner: evals-planner
> Reviewer: evals-reviewer
> Proposed By: evals-planner
> Wave: B
> TDD_MODE: red_first · RED_GREEN_REQUIRED: true

AGENT: planner=evals-planner | implementer=evals-implementer | reviewer=evals-reviewer

## Background

- **Human testing gate steps:** flow steps 10, 24, 25; also exercised at 17, 26.
- **PRD references:** `04-uc-grd.md UC-GRD-03 AC-1, AC-2, AC-3`; `04-uc-grd.md UC-GRD-01 AC-6`, under `.spec/prds/harness-eval-framework/`. Capability: CAP-EVAL-01.
- **Why it matters:** In run 41235273928 only claude-code carries control observations, and its check rows cite nothing a reader can open. A harness release that denies every tool call on exit 0 would go unnoticed on the other harnesses.
- **Current:** `observeExit0DeniedRead` reads claude-shaped observations, `observeLeg` takes no harness, and `IMAGE_PATTERNS` holds three shapes.
- **Desired:** Each pinned keyed cell records its own denial and image observation, read through that harness's table.
- **Boundary:** probe capture to cell record: a denial is read through table-driven events, and an unobservable control reads could-not-run by name.

## Critical Constraints

- MUST leave `.controls[]` at exactly the four rows and test/harness/controls/index.mjs to GAW-8: per-cell observations ride on cells[].control_observations, which the result already preserves
- MUST read a harness's denial from table-driven permission_denied events
- MUST write an explicit could-not-run control-unobservable observation on a pinned cell whose probe did not exit 0, so the row is reported rather than omitted
- NEVER exercise a delete or cleanup guard on a real path; test such guards as pure functions, and NEVER print or compare a key value
- Pi has no permission gate, so its exit0 row is could-not-run with `stream-mapping-fact-not-applicable`, never a fabricated denial

## Specification

- **Objective:** Each pinned keyed cell records its own exit0-denied-read and hidden-image-judge observation, a denial on exit 0 reads fail, and every first-cited evidence path opens inside that leg's exported artifact.
- **Success state:** On a finished run at HEAD, 5 pinned harnesses open every first-cited evidence path, claude-code reads exit0-denied-read fail denied_tool_call with process_exit_code 0, and 5 pinned cells read no-image-judge-in-child-tree.

- GAW-1's runProbe and each adapter's controlProbeEntry produce the denied-write captures. E3 reads them: attachDeniedWriteProbe derives the observation and its pair from the probe's required and optional records through table-driven events, and one call at the end of smoke/control-probe.mjs attaches them to the cell. Nothing else in that file changes, and without that call the captures never reach control_observations.
- observeLeg first writes the explicit row on every pinned keyed cell, reading the harness from the verify record: could-not-run control-unobservable, or stream-mapping-fact-not-applicable when that harness's table declares required-read-denial not applicable. A real probe observation replaces it.

## Acceptance Criteria (GIVEN-WHEN-THEN)

### AC-1: Each pinned keyed cell opens its cited evidence and records its own denial and image observations [PRIMARY]

- **GIVEN:** `dispatched_run`, a finished hand dispatch of harness-eval on the landed commit
- **WHEN:** the maintainer downloads the result and each pinned leg's evidence artifact, then opens the first evidence path of every check row of the five pinned cells
- **THEN:** 5 harnesses open every first-cited path, claude-code reads exit0-denied-read fail denied_tool_call with exit 0, and 5 cells read no-image-judge-in-child-tree

```text
FLOW_REF:              FLOW-GRD-03-FILES-AND-STREAM
TEST_FILE:             tests/sprint-02/grd-03-files-and-stream.test.mjs
TEST_FUNCTION:         FLOW-GRD-03-FILES-AND-STREAM
TEST_TIER:             e2e
VERIFICATION_SERVICE:  real harness-eval run on a hosted runner with real CLIs and keys, read through gh artifacts
SURFACE_POLICY:        .spec/e2e-policy/sprint-02/artifact-only-read.json
```

SCENARIO_SUMMARY: Every first-cited path opens inside its leg's real artifact, and a denied Write fails its cell beside exit 0.

### AC-2: A denial read through a harness's table on exit 0 fails, and a harness with no gate says so by name

- **GIVEN:** `committed_real_capture`, the real claude-code run with exit 0 and a Write denial
- **WHEN:** the observer reads it through a temp table at 2.1.314 with the Write target required, with no target required, and on a Pi leg
- **THEN:** the required case reads fail denied_tool_call with exit 0, the optional case reads optional-denial-not-a-failure, and Pi reads could-not-run stream-mapping-fact-not-applicable

```text
FLOW_REF:              null
TEST_FILE:             tests/sprint-02/controls-per-harness.test.mjs
TEST_FUNCTION:         CTRL-EXIT0-TABLE-DRIVEN
TEST_TIER:             integration
VERIFICATION_SERVICE:  the real denial observer and image scanner over a committed real claude-code capture
SURFACE_POLICY:        null
```

SCENARIO_SUMMARY: One real capture read three ways: required denial, optional denial, and a leg with no denial surface.

### AC-3: Each leg scans its own tree, a planted image fails, and an unreadable tree is not a pass

- **GIVEN:** `committed_real_capture`'s real stream in a scratch directory
- **WHEN:** the scanner runs on it as a codex leg, on two planted copies, and on a root that does not exist
- **THEN:** the real stream reads no-image-judge-in-child-tree naming codex, both planted copies read fail image-judge-in-child-tree, and the missing root reads could-not-run control-unobservable

```text
FLOW_REF:              null
TEST_FILE:             tests/sprint-02/controls-per-harness.test.mjs
TEST_FUNCTION:         CTRL-HIDDEN-IMAGE-PER-HARNESS
TEST_TIER:             integration
VERIFICATION_SERVICE:  the real denial observer and image scanner over a committed real claude-code capture
SURFACE_POLICY:        null
```

SCENARIO_SUMMARY: A real stream scanned clean as a codex leg, planted twins caught with a byte offset, and a missing root reported as unobservable.

## Test Criteria

| TC | Statement | Maps to |
|----|-----------|---------|
| TC-1 | Every first-cited evidence path opens inside its pinned leg's evidence artifact when the run at HEAD finishes | AC-1 |
| TC-2 | The claude-code pinned cell reads exit0-denied-read fail denied_tool_call beside evidence.process_exit_code 0 | AC-1 |
| TC-3 | Five pinned cells read hidden-image-judge reason no-image-judge-in-child-tree when the run at HEAD finishes | AC-1 |
| TC-4 | The committed capture reads fail denied_tool_call naming Write beside process_exit_code 0 when its Write target is required | AC-2 |
| TC-5 | The committed capture reads optional-denial-not-a-failure when no path is declared required | AC-2 |
| TC-6 | A Pi leg reads `could-not-run` `stream-mapping-fact-not-applicable` when its table declares required-read-denial not applicable | AC-2 |
| TC-7 | A scratch copy with a planted image content block reads fail image-judge-in-child-tree | AC-3 |
| TC-8 | The cell row reads `could-not-run` `control-unobservable` when the observer returns null | AC-3 |

## Reading List

1. `test/harness/smoke/observations.mjs` lines 163-217: the exit0 observer reading claude-shaped observations
2. `test/harness/smoke/observations.mjs` lines 457-480: attachDeniedWriteProbe, which GAW-1's probe records now reach
3. `test/harness/smoke/observations.mjs` lines 495-507: observeLeg, which each keyed leg now calls
4. `test/harness/smoke/image-scan.mjs` lines 17-22: three image shapes
5. `test/harness/smoke/fixtures/denied-write/claude-code-denied-write.capture.json` lines 1-30: the real run these proofs read
6. `.spec/scenarios/UC-GRD-03/flow-grd-03-files-and-stream.scenario.md` lines all: the registry entry behind this task's flow

Coding standards: `AGENTS.md`, `brain/docs/TDD-METHODOLOGY.md`, `brain/docs/kanban/SCENARIO-CONTRACT-V1.md`.

## Guardrails

WRITE-ALLOWED:

- test/harness/smoke/observations.mjs (MODIFY)
- test/harness/smoke/image-scan.mjs (MODIFY)
- test/harness/smoke/control-probe.mjs (MODIFY)
- tests/sprint-02/grd-03-files-and-stream.test.mjs (NEW)
- tests/sprint-02/controls-per-harness.test.mjs (NEW)

WRITE-PROHIBITED:

- tests/sprint-01/** - locked; t13 and t15 read observations.mjs
- test/harness/controls/** - GAW-8 owns `.controls[]` and its merge
- test/harness/stream/** - E1 owns the table-driven layer this reads
- test/harness/adapters/** - GAW-1 owns runProbe and controlProbeEntry
- .github/workflows/** - GAW tasks own the workflow
- plugins/pixel-perfect/** - the graded product
- Any file not listed in WRITE-ALLOWED

## Code Pattern

```js
// test/harness/smoke/observations.mjs. Imported names are real; other names show the shape only.
import { normalise } from "../stream/normalise.mjs";
import { streamDenials } from "../stream/grade-stream.mjs";

export function observeDeniedWrite({ harness, record, table, requiredReadPaths }) {
  if (declaresNotApplicable(table, "required-read-denial")) {
    return couldNotRun("stream-mapping-fact-not-applicable", harness);
  }
  const events = normalise({
    bytes: bytesOf(record),
    table,
    invocation_id: record.invocation_id,
    required_read_paths: requiredReadPaths,
  });
  return verdictFrom(streamDenials(events), record, harness); // never from exitCodeVerdict
}
```

- **Source:** `test/harness/smoke/observations.mjs:163-217`, `test/harness/stream/normalise.mjs:178`, `test/harness/stream/grade-stream.mjs:109`
- **Anti-pattern:** Reading only claude's result event; a verdict derived from exit 0; omitting the row when a probe did not run; reporting pass on an empty scan; a fifth row in `.controls[]`.

## Design

None. This task has no UI surface.

## Agent Instructions

1. Work AC-2 and AC-3 first, as local RED, GREEN, REFACTOR loops on committed real bytes. Planted variants go in scratch copies, never over the fixture. AC-2's Pi case uses a temp table whose `required_facts` entry for required-read-denial carries `not_applicable: true`, because E8's table lands later.
2. Then write `FLOW-GRD-03-FILES-AND-STREAM`. It reads the newest completed harness-eval run whose head_sha equals `git rev-parse HEAD` through `gh`, and writes `.tmp/sprint-02-verification/grd-03-files-and-stream.json` on a pass. With no such run it fails naming the missing run, and it never skips or hard-codes a run id.
3. Capture the flow's RED at `.tmp/sprint-02-verification/grd-03-files-and-stream.json.red` from a scratch worktree detached at c5c9272, with the new test copied in, because HEAD there equals run 41235273928's head_sha.
4. Do not dispatch the workflow; the integration step does, at the trunk candidate. Review reports AC-1 DEFERRED while an `available_after` task is unlanded, and AC-1 never runs against a stand-in.

## Orchestrator Verification Protocol

1. VERIFY_RED: each task-local VERIFY exits non-zero on the base commit, and the flow's RED proof exists at `.tmp/sprint-02-verification/grd-03-files-and-stream.json.red`.
2. VERIFY_GREEN: AC-2's and AC-3's commands exit 0 on the landed task. AC-1 exits 0 on the trunk replay and retains its artifact.
3. Regression: `node --test tests/sprint-01/t13-smoke-observations.test.mjs`; `node --test tests/sprint-01/t15-hosted-controls.test.mjs` each exit 0.
4. `git diff --name-only` lists only WRITE-ALLOWED paths.
5. Dispatch `evals-reviewer` with this file, the RED and GREEN outputs, and the evidence.

## Agent Assignment

- **Planner role:** `evals-planner`
- **Implementer role:** `evals-implementer`
- **Reviewer role:** `evals-reviewer`
- **Rationale:** `evals-implementer` owns the observers against real captures; `evals-reviewer` audits that a denial on exit 0 cannot read as success.

## Evidence Gates

- **AC-1:** `node --test --test-name-pattern 'FLOW-GRD-03-FILES-AND-STREAM' tests/sprint-02/grd-03-files-and-stream.test.mjs`. Expected: TAP `ok` after `0` missing first-cited paths across 5 harnesses, and `claude-code fail denied_tool_call exit=0`.
- **AC-2:** `node --test --test-name-pattern 'CTRL-EXIT0-TABLE-DRIVEN' tests/sprint-02/controls-per-harness.test.mjs`. Expected: TAP `ok` after `fail denied_tool_call exit=0`, `optional-denial-not-a-failure`, and `stream-mapping-fact-not-applicable`.
- **AC-3:** `node --test --test-name-pattern 'CTRL-HIDDEN-IMAGE-PER-HARNESS' tests/sprint-02/controls-per-harness.test.mjs`. Expected: TAP `ok` after `codex no-image-judge-in-child-tree`, two planted failures with byte offsets, and `control-unobservable`.

## Review Criteria

Must pass:

- `.controls[]` stays at exactly four rows, and per-cell observations ride on cells[].control_observations.
- No observation derives from exitCodeVerdict or the process exit code.
- A pinned cell whose probe did not exit 0 carries an explicit could-not-run row, never an omitted one.
- Pi's exit0 row names stream-mapping-fact-not-applicable and carries no fabricated denial.
- The planted twins prove the scanner finds each added shape, and files_scanned 0 never reads pass.
- `control-probe.mjs` gains one call at its end and no other change.

Verdict: APPROVED or NEEDS_FIXES, with file and line for each finding.

## Dependencies

- **Depends on:** GAW-1 (the runProbe capture records and the control-probe.mjs CLI this observer attaches from)
- **Blocks:** none

## Notes

- **Flow ownership:** PRIMARY owner of `FLOW-GRD-03-FILES-AND-STREAM`. Its trunk proof is `obl-FLOW-GRD-03-FILES-AND-STREAM`, in the contract block.
- **Dropped from this task:** CTRL-MISSING-KEY-PER-HARNESS, its gate step and controls/index.mjs, which GAW-8 owns.

<!-- REQUIREMENT-CONTRACT v1 -->
<!--
{"version":"1","task_id":"E3","task_type":"FEATURE","tdd_mode":"red_first","verification_policy":{"requires_tests":true,"requires_red_evidence":true,"requires_seeded_evidence":true},"guardrails":{"write_allowed":["test/harness/smoke/observations.mjs (MODIFY)","test/harness/smoke/image-scan.mjs (MODIFY)","test/harness/smoke/control-probe.mjs (MODIFY)","tests/sprint-02/grd-03-files-and-stream.test.mjs (NEW)","tests/sprint-02/controls-per-harness.test.mjs (NEW)"],"write_prohibited":["tests/sprint-01/** - locked; t13 and t15 read observations.mjs","test/harness/controls/** - GAW-8 owns `.controls[]` and its merge","test/harness/stream/** - E1 owns the table-driven layer this reads","test/harness/adapters/** - GAW-1 owns runProbe and controlProbeEntry",".github/workflows/** - GAW tasks own the workflow","plugins/pixel-perfect/** - the graded product"]},"fixtures":{"dispatched_run":{"description":"One finished hand dispatch of harness-eval on hackerpug-ai/pixel-perfect with its real artifacts","seed_method":"cli","records":["gh workflow run harness-eval --repo hackerpug-ai/pixel-perfect","run_id re-fetched on every cold boot, never hard-coded"]},"committed_real_capture":{"description":"The real claude-code run committed by T15: CLI 2.1.314, process exit 0, one model request, a Bash denial and a Write denial, and no question","seed_method":"recorded_external","records":["test/harness/smoke/fixtures/denied-write/claude-code-denied-write.stdout.bin","test/harness/smoke/fixtures/denied-write/claude-code-denied-write.capture.json"]}},"verification_gates":[],"integration_obligations":[{"id":"obl-FLOW-GRD-03-FILES-AND-STREAM","flow_ref":"FLOW-GRD-03-FILES-AND-STREAM","phase":"post-integration","mandatory":true,"owner_task_id":"E3","available_after":["E3","GAW-1","GAW-3","GAW-4","GAW-5","GAW-6","GAW-9","E4","E5","E6","E7","E8","GAW-8"],"required_by":[],"recheck_on":["GAW-7","E2","E9","GAW-I1"],"recheck_paths":["tests/sprint-02/grd-03-files-and-stream.test.mjs","test/harness/graders/**","test/harness/stream/**","test/harness/smoke/**","test/harness/controls/**","test/harness/adapters/**","test/harness/recorder/**","test/harness/runtime/**","test/harness/pins.json",".github/workflows/harness-eval.yml","plugins/pixel-perfect/**"],"build_identity":{"kind":"interpreted-source"},"completion_rule":"FLOW-GRD-03-FILES-AND-STREAM passes on the trunk when `node --test --test-name-pattern 'FLOW-GRD-03-FILES-AND-STREAM' tests/sprint-02/grd-03-files-and-stream.test.mjs` exits 0 against a completed harness-eval run whose head_sha equals the trunk candidate, and its artifact .tmp/sprint-02-verification/grd-03-files-and-stream.json is retained with its expected observations matched.","verification_gates":[],"requirements":[],"owner_bindings":[{"owner_task_id":"E3","flow_ref":"FLOW-GRD-03-FILES-AND-STREAM","command":"node --test --test-name-pattern 'FLOW-GRD-03-FILES-AND-STREAM' tests/sprint-02/grd-03-files-and-stream.test.mjs"}]}],"requirements":[{"id":"AC-1","type":"acceptance_criterion","primary":true,"title":"Each pinned keyed cell opens its cited evidence and records its own denial and image observations","description":"GIVEN `dispatched_run`, a finished hand dispatch of harness-eval on the landed commit WHEN the maintainer downloads the result and each pinned leg's evidence artifact, then opens the first evidence path of every check row of the five pinned cells THEN 5 harnesses open every first-cited path, claude-code reads exit0-denied-read fail denied_tool_call with exit 0, and 5 cells read no-image-judge-in-child-tree","flow_ref":"FLOW-GRD-03-FILES-AND-STREAM","test_file":"tests/sprint-02/grd-03-files-and-stream.test.mjs","test_function":"FLOW-GRD-03-FILES-AND-STREAM","verify":"node --test --test-name-pattern 'FLOW-GRD-03-FILES-AND-STREAM' tests/sprint-02/grd-03-files-and-stream.test.mjs","positive_example":"A run where all five pinned harnesses open every first-cited evidence path inside their harness-eval-evidence artifact, and claude-code reads exit0-denied-read fail denied_tool_call with process_exit_code 0.","red":"Run 41235273928: check rows carry no evidence_paths, the cell-level `cell/evidence/...` paths sit in no artifact because each cell artifact holds cell.json alone, and only claude-code carries control observations.","test_tier":"e2e","verification_service":"real harness-eval run on a hosted runner with real CLIs and keys, read through gh artifacts","unit_test_justified":null,"surface_policy":".spec/e2e-policy/sprint-02/artifact-only-read.json","scenario":{"id":"SC-GRD-03-1","use_case_ref":"UC-GRD-03","ac_ref":"AC-3","primary":true,"tier":"visible","test_tier":"e2e","verification_service":"real harness-eval run on a hosted runner with real CLIs and keys, read through gh artifacts","topology":"single-node","negative_control":{"would_fail_if":["evidence paths point at a runner that no longer exists, so nothing they cite can be opened","the denial observer reads only claude-code's result event and stays empty on the other harnesses","a verdict is derived from the process exit code"]},"evidence":{"forms":["stdout","file_artifact"],"examples":["jq prints `claude-code fail denied_tool_call exit=0` from cells[].control_observations","each harness's first cited path opens inside its downloaded evidence artifact"],"required_capture":true},"build_proof":{"range":"anything that proves each keyed cell's grades cite bytes a reader can open, and that a denial observed on exit 0 reads fail","examples":["per-harness observations attached to each cell record beside the existing four .controls rows"]},"cases":[{"start_ref":"dispatched_run","action":{"actor":"cli_user","steps":["resolve the newest completed harness-eval run whose head_sha equals `git rev-parse HEAD`","download the result and each pinned leg's harness-eval-evidence artifact","open the first evidence path of every check row of the five pinned cells"]},"end_state":{"must_observe":["`5` harnesses each open every first-cited path, so `0` paths are missing","`claude-code` pinned reads exit0-denied-read verdict `fail`, reason `denied_tool_call`, evidence.process_exit_code `0`","`5` pinned cells read hidden-image-judge reason `no-image-judge-in-child-tree`"],"must_not_observe":["a cited path that no downloaded artifact holds, the reading of run 41235273928","verdict `pass` beside a required denial","an empty evidence artifact"]}}]},"maps_to_ac":null},{"id":"AC-2","type":"acceptance_criterion","primary":false,"title":"A denial read through a harness's table on exit 0 fails, and a harness with no gate says so by name","description":"GIVEN `committed_real_capture`, the real claude-code run with exit 0 and a Write denial WHEN the observer reads it through a temp table at 2.1.314 with the Write target required, with no target required, and on a Pi leg THEN the required case reads fail denied_tool_call with exit 0, the optional case reads optional-denial-not-a-failure, and Pi reads could-not-run stream-mapping-fact-not-applicable","flow_ref":null,"test_file":"tests/sprint-02/controls-per-harness.test.mjs","test_function":"CTRL-EXIT0-TABLE-DRIVEN","verify":"node --test --test-name-pattern 'CTRL-EXIT0-TABLE-DRIVEN' tests/sprint-02/controls-per-harness.test.mjs","positive_example":"The committed capture, exit 0, read through a temp copy of the claude table at 2.1.314: the observer returns fail denied_tool_call naming Write with process_exit_code 0, and a Pi leg returns could-not-run stream-mapping-fact-not-applicable.","red":"On base no observer takes a harness and a table, and runControlProbe is hard-wired to the claude binary, so the import fails.","test_tier":"integration","verification_service":"the real denial observer and image scanner over a committed real claude-code capture","unit_test_justified":null,"surface_policy":null,"scenario":{"id":"SC-CTRL-EXIT0-1","use_case_ref":"UC-GRD-03","ac_ref":"AC-3","primary":false,"tier":"visible","test_tier":"integration","verification_service":"the real denial observer and image scanner over a committed real claude-code capture","topology":"single-node","negative_control":{"would_fail_if":["the observer still reads only claude's own line mapper, so another harness's denial stays absent","a stubbed observation is returned with no capture read","a verdict equals the value exitCodeVerdict returns for exit `0`"]},"evidence":{"forms":["stdout","file_artifact"],"examples":["`fail denied_tool_call exit=0`"],"required_capture":true},"build_proof":{"range":"anything that proves a denial read from a harness's table-driven events on exit 0 fails the grade, and that a harness with no denial surface says so by name","examples":["a neutral observer fed by normalise and streamDenials"]},"cases":[{"start_ref":"committed_real_capture","action":{"actor":"cli_user","steps":["observe the capture through a temp table declaring 2.1.314, with its Write target declared required"]},"end_state":{"must_observe":["verdict `fail`, reason `denied_tool_call`, operation `Write`, process_exit_code `0`"],"must_not_observe":["verdict `pass`","an empty evidence block"]}},{"start_ref":"committed_real_capture","action":{"actor":"cli_user","steps":["observe the same capture with no path declared required and the Write target outside them"]},"end_state":{"must_observe":["no `denied_tool_call` verdict, and reason `optional-denial-not-a-failure` on the pair"],"must_not_observe":["verdict `fail` reason `denied_tool_call`","an empty denial list"]}},{"start_ref":"committed_real_capture","action":{"actor":"cli_user","steps":["ask for the observation on a Pi leg, whose table declares required-read-denial not applicable"]},"end_state":{"must_observe":["verdict `could-not-run`, reason `stream-mapping-fact-not-applicable`"],"must_not_observe":["verdict `fail`","a fabricated denial with no offset"]}}]},"maps_to_ac":null},{"id":"AC-3","type":"acceptance_criterion","primary":false,"title":"Each leg scans its own tree, a planted image fails, and an unreadable tree is not a pass","description":"GIVEN `committed_real_capture`'s real stream in a scratch directory WHEN the scanner runs on it as a codex leg, on two planted copies, and on a root that does not exist THEN the real stream reads no-image-judge-in-child-tree naming codex, both planted copies read fail image-judge-in-child-tree, and the missing root reads could-not-run control-unobservable","flow_ref":null,"test_file":"tests/sprint-02/controls-per-harness.test.mjs","test_function":"CTRL-HIDDEN-IMAGE-PER-HARNESS","verify":"node --test --test-name-pattern 'CTRL-HIDDEN-IMAGE-PER-HARNESS' tests/sprint-02/controls-per-harness.test.mjs","positive_example":"The committed real stream scans pass no-image-judge-in-child-tree with the leg's harness named in its evidence. The same bytes plus one planted `\"type\":\"image\"` line, or one planted `\"mime\":\"image/png\"` file part, read fail image-judge-in-child-tree.","red":"On base observeLeg takes no harness, so the observation names none, and IMAGE_PATTERNS has no `mime` shape, so a planted file part scans pass.","test_tier":"integration","verification_service":"the real denial observer and image scanner over a committed real claude-code capture","unit_test_justified":null,"surface_policy":null,"scenario":{"id":"SC-CTRL-IMAGE-1","use_case_ref":"UC-GRD-01","ac_ref":"AC-6","primary":false,"tier":"visible","test_tier":"integration","verification_service":"the real denial observer and image scanner over a committed real claude-code capture","topology":"single-node","negative_control":{"would_fail_if":["the scanner is stubbed to always pass, which the planted twin catches","a tree it could not read reports pass on an empty scan"]},"evidence":{"forms":["stdout","file_artifact"],"examples":["`codex no-image-judge-in-child-tree`"],"required_capture":true},"build_proof":{"range":"anything that proves each keyed leg records its own scan of what its verify runs produced, that the scan can find an image in that harness's stream shape, and that an unreadable tree is not a pass","examples":["observeLeg taking the leg's harness, and scan patterns extended from real captures"]},"cases":[{"start_ref":"committed_real_capture","action":{"actor":"cli_user","steps":["scan a directory holding the real stream as a codex leg","append one planted image content block to a scratch copy and scan","append one planted `mime` file part to a scratch copy and scan"]},"end_state":{"must_observe":["first scan: reason `no-image-judge-in-child-tree`, evidence.harness `codex`, files_scanned `1`","both planted scans: verdict `fail`, reason `image-judge-in-child-tree`, with a byte offset"],"must_not_observe":["files_scanned `0` read as a pass","verdict `pass` on a planted copy"]}},{"start_ref":"committed_real_capture","action":{"actor":"cli_user","steps":["scan a root that does not exist"]},"end_state":{"must_observe":["the observer returns `null`, and the cell row reads `could-not-run` `control-unobservable`"],"must_not_observe":["verdict `pass`","an empty scan read as evidence"]}}]},"maps_to_ac":null},{"id":"TC-1","type":"test_criterion","description":"Every first-cited evidence path opens inside its pinned leg's evidence artifact when the run at HEAD finishes","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'FLOW-GRD-03-FILES-AND-STREAM' tests/sprint-02/grd-03-files-and-stream.test.mjs","positive_example":"A run where all five pinned harnesses open every first-cited evidence path inside their harness-eval-evidence artifact, and claude-code reads exit0-denied-read fail denied_tool_call with process_exit_code 0."},{"id":"TC-2","type":"test_criterion","description":"The claude-code pinned cell reads exit0-denied-read fail denied_tool_call beside evidence.process_exit_code 0","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'FLOW-GRD-03-FILES-AND-STREAM' tests/sprint-02/grd-03-files-and-stream.test.mjs","positive_example":"A run where all five pinned harnesses open every first-cited evidence path inside their harness-eval-evidence artifact, and claude-code reads exit0-denied-read fail denied_tool_call with process_exit_code 0."},{"id":"TC-3","type":"test_criterion","description":"Five pinned cells read hidden-image-judge reason no-image-judge-in-child-tree when the run at HEAD finishes","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'FLOW-GRD-03-FILES-AND-STREAM' tests/sprint-02/grd-03-files-and-stream.test.mjs","positive_example":"A run where all five pinned harnesses open every first-cited evidence path inside their harness-eval-evidence artifact, and claude-code reads exit0-denied-read fail denied_tool_call with process_exit_code 0."},{"id":"TC-4","type":"test_criterion","description":"The committed capture reads fail denied_tool_call naming Write beside process_exit_code 0 when its Write target is required","maps_to_ac":"AC-2","verify":"node --test --test-name-pattern 'CTRL-EXIT0-TABLE-DRIVEN' tests/sprint-02/controls-per-harness.test.mjs","positive_example":"The committed capture, exit 0, read through a temp copy of the claude table at 2.1.314: the observer returns fail denied_tool_call naming Write with process_exit_code 0, and a Pi leg returns could-not-run stream-mapping-fact-not-applicable."},{"id":"TC-5","type":"test_criterion","description":"The committed capture reads optional-denial-not-a-failure when no path is declared required","maps_to_ac":"AC-2","verify":"node --test --test-name-pattern 'CTRL-EXIT0-TABLE-DRIVEN' tests/sprint-02/controls-per-harness.test.mjs","positive_example":"The committed capture, exit 0, read through a temp copy of the claude table at 2.1.314: the observer returns fail denied_tool_call naming Write with process_exit_code 0, and a Pi leg returns could-not-run stream-mapping-fact-not-applicable."},{"id":"TC-6","type":"test_criterion","description":"A Pi leg reads `could-not-run` `stream-mapping-fact-not-applicable` when its table declares required-read-denial not applicable","maps_to_ac":"AC-2","verify":"node --test --test-name-pattern 'CTRL-EXIT0-TABLE-DRIVEN' tests/sprint-02/controls-per-harness.test.mjs","positive_example":"The committed capture, exit 0, read through a temp copy of the claude table at 2.1.314: the observer returns fail denied_tool_call naming Write with process_exit_code 0, and a Pi leg returns could-not-run stream-mapping-fact-not-applicable."},{"id":"TC-7","type":"test_criterion","description":"A scratch copy with a planted image content block reads fail image-judge-in-child-tree","maps_to_ac":"AC-3","verify":"node --test --test-name-pattern 'CTRL-HIDDEN-IMAGE-PER-HARNESS' tests/sprint-02/controls-per-harness.test.mjs","positive_example":"The committed real stream scans pass no-image-judge-in-child-tree with the leg's harness named in its evidence. The same bytes plus one planted `\"type\":\"image\"` line, or one planted `\"mime\":\"image/png\"` file part, read fail image-judge-in-child-tree."},{"id":"TC-8","type":"test_criterion","description":"The cell row reads `could-not-run` `control-unobservable` when the observer returns null","maps_to_ac":"AC-3","verify":"node --test --test-name-pattern 'CTRL-HIDDEN-IMAGE-PER-HARNESS' tests/sprint-02/controls-per-harness.test.mjs","positive_example":"The committed real stream scans pass no-image-judge-in-child-tree with the leg's harness named in its evidence. The same bytes plus one planted `\"type\":\"image\"` line, or one planted `\"mime\":\"image/png\"` file part, read fail image-judge-in-child-tree."}]}
-->
