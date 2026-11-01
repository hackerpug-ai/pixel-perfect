# TASK-E1: Grade every keyed cell's rows from its own captured bytes through a per-harness table, on the live path

> Task ID: E1
> Sprint: [SPRINT.md](./SPRINT.md)
> Status: Backlog
> Assignee: evals-implementer
> Priority: P0
> Points: 8
> Type: FEATURE
> Planner: evals-planner
> Reviewer: evals-reviewer
> Proposed By: evals-planner
> Wave: B
> TDD_MODE: red_first · RED_GREEN_REQUIRED: true

AGENT: planner=evals-planner | implementer=evals-implementer | reviewer=evals-reviewer

## Background

- **Human testing gate steps:** flow steps 5, 7, 13, 14, 15; also exercised at 3, 11, 12, 16, 20, 26.
- **PRD references:** `04-uc-grd.md UC-GRD-02`; `09-technical-requirements/02-system-components.md stream-grader and question-boundary`; `09-technical-requirements/03-data-schema.md Grades and reports`, under `.spec/prds/harness-eval-framework/`. Capability: CAP-EVAL-01.
- **Why it matters:** T6 and T7 landed green modules with test callers only, so the hosted cell never reached them: run 41249460968 at 36e864a grades 0 of 40 keyed rows from evidence. A row with no cited bytes cannot be trusted or debugged.
- **Current:** `smoke/cell.mjs` calls claude's `runCheck` and `gradeCheck`. `normalise.mjs` branches on claude rule ids. `validateMapping` demands all six facts of one capture, which no status stream can satisfy.
- **Desired:** One grade function reads any harness's capture through that harness's table and writes a row citing those bytes.
- **Boundary:** capture record to check row: a verdict comes from that record's bytes through a table, or the row reads could-not-run with a stream-mapping reason.

## Critical Constraints

- MUST keep tests/sprint-01/** unchanged and green, except the edits GAW-1 and GAW-11 declare under their top-level `supersedes`; T16 landed at 6872fbd with its verify half live and GAW-11 removes that half, so T16's tests/sprint-01/t16-claude-code-grades.test.mjs stays green in the form GAW-11's removal leaves it. If a locked assertion blocks this, stop and report it
- MUST leave statusFacts, readVerifyReport, bindReport, gradeCheck, mapCapturedLine and the five INVOCATIONS as they are: the sprint-01 locks read them, and gradeInvocation replaces gradeCheck on the live path only
- MUST read a denial as required when its target is under installation.loaded_plugin_root or the invocation cwd, or when it is a Bash call running a script under that plugin root. The approved stance allows node on plugin scripts on every gated harness, so such a denial is unexpected, and it grades fail denied_tool_call. A denied Bash call running anything else reads optional
- NEVER grade a stream with another version's table, except through E9's re-proof on a newest leg; on the pinned track a table without a capture at its exact version is `stream-mapping-unqualified`
- NEVER treat exit 0, a success subtype or is_error false as a verdict, and NEVER let a stored qualified boolean decide: compute it from the table's cited captures

## Specification

- **Objective:** A dispatched keyed cell computes command_list, status and question_before_expensive_work rows from table-driven CanonicalEvents, each row citing evidence, and an absent or unqualified table reads could-not-run with a reason beginning `stream-mapping-`.
- **Success state:** On a finished run at HEAD, 10 keyed cells carry 40 rows that cite evidence, each question row carries question_count with answers_delivered 0, generic status text reads fail status-facts-absent, and both cursor cells read could-not-run missing-api-key.

- Lives at test/harness/graders/grade-invocation.mjs and exports gradeInvocation({record, entry, track, installation}). It removes GAW-1's floor: contract.mjs's gradeInvocation becomes a re-export of this function, and one line in smoke/cell.mjs stops reading adapter.grade, so every adapter reaches E1's export and no seam-stub survives. It takes one optional field, mapping {table, state}: with none it resolves the exact-version table, and E9 passes the re-proved one.
- Rules drive every extraction: path predicates beyond json.type and message.content, and extract paths for session id, reply text, call id, tool name, denial list and completion error, with no branch on a claude rule_id.
- Per-check required facts, and table qualification computed over a capture SET, so a status capture need not contain a denial.
- Closed cell-level reasons: `stream-mapping-absent`, `stream-mapping-unqualified`, `stream-mapping-fact-unmapped`, `stream-mapping-fact-not-applicable`. The validator's own vocabulary stays, because tests/sprint-01/grd-03 pins it.
- Question detection counts a question-tool start or agent text in the USER_CHOICE shape: a sentence ending in a question mark plus 2 to 4 options. Exports the same rule as a line predicate; the cell.mjs seam passes it as GAW-2's stop_at, and a version with no table gets no stop.
- Must-ask: no question on a complete capture is `fail no-question-asked`, and an expensive tool start before the first question is `fail expensive-before-question`; no path grades that today, and node now runs. `could-not-run` is only for a missing mapping or an incomplete capture. A Bash call running a plugin script counts as local-read and any other Bash as expensive. Ceiling: a plugin script that renders also counts as local; tighten the rule if a capture shows one before a first question.
- Status reads the reply through the table, grades it with the existing statusFacts, and checks that protected fixture hashes did not change. T16 owns what the prompt asks for.
- Additive row and cell fields, needing no schema edit because the schemas allow extra keys: question_count, answers_delivered, stream_mapping {table, state, missing_facts}. E1 writes the states `qualified`, `unqualified` and `absent`, and E9 adds `reproved`. GAW-1 owns per-check evidence_paths.
- A table declares a fact not applicable with `not_applicable: true` and a `why` on its `required_facts` entry. E3, E8 and E9's temp tables read this one key.

## Acceptance Criteria (GIVEN-WHEN-THEN)

### AC-1: Ten keyed cells carry four evidence-citing rows computed from their own streams [PRIMARY]

- **GIVEN:** `dispatched_run`, a finished hand dispatch of harness-eval on the landed commit, and `archived_captures`, real bytes at each pinned CLI version
- **WHEN:** the maintainer downloads the result artifact of the newest completed run at HEAD and reads every keyed cell's check rows
- **THEN:** 10 keyed cells carry 40 rows citing evidence, each question row carries question_count with answers_delivered 0, and generic status text reads fail status-facts-absent

```text
FLOW_REF:              FLOW-GRD-02-FOUR-GRADES
TEST_FILE:             tests/sprint-02/grd-02-four-grades.test.mjs
TEST_FUNCTION:         FLOW-GRD-02-FOUR-GRADES
TEST_TIER:             e2e
VERIFICATION_SERVICE:  real harness-eval run on a hosted runner with real CLIs and keys, read through gh artifacts
SURFACE_POLICY:        .spec/e2e-policy/sprint-02/artifact-only-read.json
```

SCENARIO_SUMMARY: Forty evidence-citing rows on ten keyed cells from a real run, plus an archived status-a reply failing against status-b's facts.

### AC-2: One grade function reads a real capture through a table, and a missing table is could-not-run

- **GIVEN:** `committed_real_capture`, the real claude-code run at CLI 2.1.314 with exit 0, Bash and Write denials, and no question
- **WHEN:** gradeInvocation grades those bytes through a temp table at 2.1.314, through renamed rule ids, with no table, and in planted scratch copies
- **THEN:** must-ask reads fail no-question-asked, renamed rules keep every event, no table reads could-not-run stream-mapping-absent, and a Write before a planted question reads fail expensive-before-question

```text
FLOW_REF:              null
TEST_FILE:             tests/sprint-02/grade-invocation.test.mjs
TEST_FUNCTION:         GRADE-INVOCATION-REAL-BYTES
TEST_TIER:             integration
VERIFICATION_SERVICE:  the real normaliser and gradeInvocation over a committed real claude-code capture
SURFACE_POLICY:        null
```

SCENARIO_SUMMARY: Five cases on one committed real capture: no question, renamed rules, no table, requiredness of denials, and expensive work before a planted question.

## Test Criteria

| TC | Statement | Maps to |
|----|-----------|---------|
| TC-1 | Ten keyed cells each carry four check rows when the run at HEAD finishes | AC-1 |
| TC-2 | Every keyed check row cites a non-empty evidence_paths list when the run at HEAD finishes | AC-1 |
| TC-3 | Both cursor cells read `could-not-run` `missing-api-key` when the run at HEAD finishes | AC-1 |
| TC-4 | An archived status-a reply reads fail status-facts-absent naming gates.atoms when graded against status-b's expected_facts | AC-1 |
| TC-5 | The committed capture reads fail no-question-asked when graded must-ask through a 2.1.314 mapping | AC-2 |
| TC-6 | A table with every rule_id renamed yields the same event count as the original table on the committed capture | AC-2 |
| TC-7 | The committed capture reads `could-not-run` `stream-mapping-absent` on the pinned track with no table at 2.1.314 | AC-2 |
| TC-8 | The Write denial reads required_read true beside process_exit_code 0 on the committed capture | AC-2 |
| TC-9 | A planted question after the real Write start reads fail expensive-before-question when graded must-ask | AC-2 |
| TC-10 | The committed capture graded through contract.mjs's gradeInvocation with a qualified 2.1.314 mapping reads no `stream-mapping-absent` reason | AC-2 |

## Reading List

1. `test/harness/smoke/cell.mjs` lines 182-213: the live path: runCheck and gradeCheck, never the stream layer
2. `test/harness/adapters/claude-code.mjs` lines 1135-1218: gradeCheck, the path gradeInvocation replaces on a live run and leaves in place for the locked tests
3. `test/harness/adapters/claude-code.mjs` lines 971-1028: mapCapturedLine and isRequiredPath: checkout root, not the loaded root
4. `test/harness/stream/normalise.mjs` lines 72-133: the claude-shaped rule_id and message.content branches to make table-driven
5. `test/harness/stream/validate-mapping.mjs` lines 51-99: all six facts demanded of one capture, which no real status stream can satisfy
6. `test/harness/stream/question-boundary.mjs` lines 23-46: questions counts tool starts only
7. `test/harness/runtime/grade-writer.mjs` lines 90-92: required-fact-unobserved outranking a real no-question fail
8. `test/harness/smoke/fixtures/denied-write/claude-code-denied-write.capture.json` lines 1-30: the real run the task-local proof grades
9. `.spec/prds/harness-eval-framework/tasks/sprint-01-evaluator-evidence-spine/TASK-T16.md` lines 33-48: what T16 locks: statusFacts, readVerifyReport, bindReport, five INVOCATIONS
10. `.spec/scenarios/UC-GRD-02/flow-grd-02-four-grades.scenario.md` lines all: the registry entry behind this task's flow

Coding standards: `AGENTS.md`, `brain/docs/TDD-METHODOLOGY.md`, `brain/docs/kanban/SCENARIO-CONTRACT-V1.md`.

## Guardrails

WRITE-ALLOWED:

- test/harness/stream/table.mjs (MODIFY)
- test/harness/stream/normalise.mjs (MODIFY)
- test/harness/stream/validate-mapping.mjs (MODIFY)
- test/harness/stream/grade-stream.mjs (MODIFY)
- test/harness/stream/question-boundary.mjs (MODIFY)
- test/harness/stream/tables/claude-code@2.1.291.json (MODIFY)
- test/harness/graders/grade-invocation.mjs (NEW)
- test/harness/smoke/cell.mjs (MODIFY)
- test/harness/adapters/contract.mjs (MODIFY)
- tests/sprint-02/grd-02-four-grades.test.mjs (NEW)
- tests/sprint-02/grade-invocation.test.mjs (NEW)

WRITE-PROHIBITED:

- tests/sprint-01/** - locked; only GAW-1's and GAW-11's declared edits change them
- test/harness/adapters/claude-code.mjs - adapters do not grade, and gradeCheck stays for the locked tests
- test/harness/adapters/registry.mjs - GAW tasks own the registry
- test/harness/adapters/codex.mjs - GAW-3 owns it
- test/harness/adapters/grok.mjs - GAW-4 owns it
- test/harness/adapters/opencode.mjs - GAW-5 owns it
- test/harness/adapters/pi.mjs - GAW-6 owns it
- test/harness/graders/fixture-grader.mjs - gradeInvocation imports it unchanged
- test/harness/schemas/** - the added fields need no schema edit
- test/harness/fixtures/streams/** - E4 owns the archived captures
- .github/workflows/** - GAW tasks own the workflow
- plugins/pixel-perfect/** - the graded product
- Any file not listed in WRITE-ALLOWED

## Code Pattern

```js
// test/harness/adapters/contract.mjs: the floor is gone, and this line replaces it.
export { gradeInvocation } from "../graders/grade-invocation.mjs";

// test/harness/graders/grade-invocation.mjs. Imports are real; other names show the shape only.
import { statusFacts } from "../adapters/claude-code.mjs"; // as fixture-grader.mjs:18 does
import { normalise } from "../stream/normalise.mjs";

export function gradeInvocation({ record, entry, track, installation, mapping = null }) {
  const resolved = mapping ?? exactTable(record.harness, installation);
  if (resolved.state === "absent") return couldNotRun("stream-mapping-absent", record, resolved);
  if (resolved.state === "unqualified") return couldNotRun("stream-mapping-unqualified", record, resolved);
  const events = normalise({
    bytes: bytesOf(record),
    table: resolved.table,
    invocation_id: record.invocation_id,
    required_read_paths: requiredRoots(record, installation),
  });
  return rowFor(entry, events, record, resolved); // missing per-check facts read stream-mapping-fact-unmapped
}
```

- **Source:** `test/harness/stream/normalise.mjs:178`, `test/harness/graders/fixture-grader.mjs:18`, `test/harness/smoke/cell.mjs:182-213`
- **Anti-pattern:** Branching on `rule.rule_id === "session-init"` as `normalise.mjs` does today; storing `qualified: true` and trusting it; reading a verdict from exit 0; grading with another version's table on the pinned track.

## Design

None. This task has no UI surface.

## Agent Instructions

1. Work AC-2 first, as the local RED, GREEN, REFACTOR loop on committed bytes through real modules. Planted variants go in scratch copies, never over the fixture.
2. Remove GAW-1's floor in the same change: `adapters/contract.mjs` re-exports E1's function, and its seam-stub flag goes with the floor. A seam-stub must not survive this task.
3. Then write `FLOW-GRD-02-FOUR-GRADES`. It reads the newest completed harness-eval run whose head_sha equals `git rev-parse HEAD` through `gh`, and writes `.tmp/sprint-02-verification/grd-02-four-grades.json` on a pass. With no such run it fails naming the missing run, and it never skips or hard-codes a run id.
4. Capture the flow's RED at `.tmp/sprint-02-verification/grd-02-four-grades.json.red` from a scratch worktree detached at 36e864a, with the new test copied in, because HEAD there equals run 41249460968's head_sha.
5. Do not dispatch the workflow; the integration step does, at the trunk candidate. Review reports AC-1 DEFERRED while an `available_after` task is unlanded, and AC-1 never runs against a stand-in.

## Orchestrator Verification Protocol

1. VERIFY_RED: each task-local VERIFY exits non-zero on the base commit, and the flow's RED proof exists at `.tmp/sprint-02-verification/grd-02-four-grades.json.red`.
2. VERIFY_GREEN: AC-2's command exits 0 on the landed task. AC-1 exits 0 on the trunk replay and retains its artifact.
3. Regression: `node --test tests/sprint-01/grd-02-four-grades.test.mjs`; `node --test tests/sprint-01/grd-03-evidence.test.mjs`; `node --test tests/sprint-01/t16-claude-code-grades.test.mjs`; `node --test --test-name-pattern 'ADAPTER-CONTRACT-GRADE-FLOOR' tests/sprint-02/adapter-contract.test.mjs` each exit 0.
4. `git diff --name-only` lists only WRITE-ALLOWED paths.
5. Dispatch `evals-reviewer` with this file, the RED and GREEN outputs, and the evidence.

## Agent Assignment

- **Planner role:** `evals-planner`
- **Implementer role:** `evals-implementer`
- **Reviewer role:** `evals-reviewer`
- **Rationale:** `evals-implementer` owns grading against real captures; `evals-reviewer` audits oracle strength, fixture reality and negative paths.

## Evidence Gates

- **AC-1:** `node --test --test-name-pattern 'FLOW-GRD-02-FOUR-GRADES' tests/sprint-02/grd-02-four-grades.test.mjs`. Expected: TAP `ok` after 40 evidence-citing rows on 10 keyed cells, and `status-facts-absent` carrying `gates.atoms`.
- **AC-2:** `node --test --test-name-pattern 'GRADE-INVOCATION-REAL-BYTES' tests/sprint-02/grade-invocation.test.mjs`. Expected: TAP `ok` after `fail no-question-asked` citing sha256 `dbbdfe9c...`, `stream-mapping-absent` naming 2.1.314, `expensive-before-question` naming `Write`, and no `stream-mapping-absent` through `contract.mjs` on a qualified mapping.

## Review Criteria

Must pass:

- No branch on a claude rule_id remains in `normalise.mjs`, and renaming every rule in the temp table changes no event.
- Qualification is computed from cited captures on every call, and no stored boolean decides it.
- `adapters/contract.mjs` holds no floor and no seam-stub flag: its `gradeInvocation` is the same function `graders/grade-invocation.mjs` exports, and `contract.mjs` is the only adapter file in the diff.
- A row with reason `stream-mapping-absent` names the observed version and carries no table id.
- A must-ask capture with no question reads fail, not could-not-run, and only a missing mapping or an incomplete capture reads could-not-run.
- AC-2 reads the committed bytes; a stubbed verdict, a mocked table or a hand-written stream fails review.
- `statusFacts`, `gradeCheck`, `mapCapturedLine`, `readVerifyReport`, `bindReport` and the five INVOCATIONS are unchanged in the diff.

Verdict: APPROVED or NEEDS_FIXES, with file and line for each finding.

## Dependencies

- **Depends on:** GAW-1 (the runCell seam and adapter entry shape gradeInvocation plugs into)
- **Blocks:** E2, E4, E5, E6, E7, E8, E9

## Notes

- **Flow ownership:** PRIMARY owner of `FLOW-GRD-02-FOUR-GRADES`. Its trunk proof is `obl-FLOW-GRD-02-FOUR-GRADES`, in the contract block.
- **Split check:** I tried cutting the neutral normaliser from the live wiring. That is the exact seam sprint 01 shipped: T6 and T7 landed green modules with test callers only, and the hosted cell never reached them. The behavior is one row computed from one capture, and it cannot be watched until both halves are joined.
- **Interim state:** run 41249460968 reads claude-code status pass through `gradeCheck`. Between E1 and E4 landing, pinned claude-code rows read `stream-mapping-unqualified`, because no capture at 2.1.291 backs the table yet. FLOW-GRD-02 lists E4 in `available_after`, so its trunk replay waits for E4.
- **Dropped from this task:** moving statusFacts into a neutral grader, because T16 locks it; the live status-b run, because T16 keeps INVOCATIONS at five (a real status-a reply against status-b's facts stays as the discriminating case); edits to gradeCheck, cellFor, claude-code.mjs, fixture-grader.mjs and the cell schema; `test/harness/fixtures/streams/claude-code@2.1.291/`, which E4 owns.

<!-- REQUIREMENT-CONTRACT v1 -->
<!--
{"version":"1","task_id":"E1","task_type":"FEATURE","tdd_mode":"red_first","verification_policy":{"requires_tests":true,"requires_red_evidence":true,"requires_seeded_evidence":true},"guardrails":{"write_allowed":["test/harness/stream/table.mjs (MODIFY)","test/harness/stream/normalise.mjs (MODIFY)","test/harness/stream/validate-mapping.mjs (MODIFY)","test/harness/stream/grade-stream.mjs (MODIFY)","test/harness/stream/question-boundary.mjs (MODIFY)","test/harness/stream/tables/claude-code@2.1.291.json (MODIFY)","test/harness/graders/grade-invocation.mjs (NEW)","test/harness/smoke/cell.mjs (MODIFY)","test/harness/adapters/contract.mjs (MODIFY)","tests/sprint-02/grd-02-four-grades.test.mjs (NEW)","tests/sprint-02/grade-invocation.test.mjs (NEW)"],"write_prohibited":["tests/sprint-01/** - locked; only GAW-1's and GAW-11's declared edits change them","test/harness/adapters/claude-code.mjs - adapters do not grade, and gradeCheck stays for the locked tests","test/harness/adapters/registry.mjs - GAW tasks own the registry","test/harness/adapters/codex.mjs - GAW-3 owns it","test/harness/adapters/grok.mjs - GAW-4 owns it","test/harness/adapters/opencode.mjs - GAW-5 owns it","test/harness/adapters/pi.mjs - GAW-6 owns it","test/harness/graders/fixture-grader.mjs - gradeInvocation imports it unchanged","test/harness/schemas/** - the added fields need no schema edit","test/harness/fixtures/streams/** - E4 owns the archived captures",".github/workflows/** - GAW tasks own the workflow","plugins/pixel-perfect/** - the graded product"]},"fixtures":{"dispatched_run":{"description":"One finished hand dispatch of harness-eval on hackerpug-ai/pixel-perfect with its real artifacts","seed_method":"cli","records":["gh workflow run harness-eval --repo hackerpug-ai/pixel-perfect","run_id re-fetched on every cold boot, never hard-coded"]},"archived_captures":{"description":"Real stdout bytes from a hosted run at the exact pinned CLI version, committed with hashes and source run id","seed_method":"recorded_external","records":["test/harness/fixtures/streams/<harness>@<version>/<invocation-key>.stdout.bin","its capture record, whose stdout sha256 equals those bytes"]},"committed_real_capture":{"description":"The real claude-code run committed by T15: CLI 2.1.314, process exit 0, one model request, a Bash denial and a Write denial, and no question","seed_method":"recorded_external","records":["test/harness/smoke/fixtures/denied-write/claude-code-denied-write.stdout.bin","test/harness/smoke/fixtures/denied-write/claude-code-denied-write.capture.json"]}},"verification_gates":[],"integration_obligations":[{"id":"obl-FLOW-GRD-02-FOUR-GRADES","flow_ref":"FLOW-GRD-02-FOUR-GRADES","phase":"post-integration","mandatory":true,"owner_task_id":"E1","available_after":["E1","E4","E5","E6","E7","E8","GAW-1","GAW-7","GAW-3","GAW-4","GAW-5","GAW-6","E9","E2","GAW-11","GAW-2"],"required_by":[],"recheck_on":["GAW-8","E3","GAW-I1"],"recheck_paths":["tests/sprint-02/grd-02-four-grades.test.mjs","test/harness/graders/**","test/harness/stream/**","test/harness/smoke/**","test/harness/adapters/**","test/harness/recorder/**","test/harness/runtime/**","test/harness/pins.json",".github/workflows/harness-eval.yml","plugins/pixel-perfect/**"],"build_identity":{"kind":"interpreted-source"},"completion_rule":"FLOW-GRD-02-FOUR-GRADES passes on the trunk when `node --test --test-name-pattern 'FLOW-GRD-02-FOUR-GRADES' tests/sprint-02/grd-02-four-grades.test.mjs` exits 0 against a completed harness-eval run whose head_sha equals the trunk candidate, and its artifact .tmp/sprint-02-verification/grd-02-four-grades.json is retained with its expected observations matched.","verification_gates":[],"requirements":[],"owner_bindings":[{"owner_task_id":"E1","flow_ref":"FLOW-GRD-02-FOUR-GRADES","command":"node --test --test-name-pattern 'FLOW-GRD-02-FOUR-GRADES' tests/sprint-02/grd-02-four-grades.test.mjs"}]}],"requirements":[{"id":"AC-1","type":"acceptance_criterion","primary":true,"title":"Ten keyed cells carry four evidence-citing rows computed from their own streams","description":"GIVEN `dispatched_run`, a finished hand dispatch of harness-eval on the landed commit, and `archived_captures`, real bytes at each pinned CLI version WHEN the maintainer downloads the result artifact of the newest completed run at HEAD and reads every keyed cell's check rows THEN 10 keyed cells carry 40 rows citing evidence, each question row carries question_count with answers_delivered 0, and generic status text reads fail status-facts-absent","flow_ref":"FLOW-GRD-02-FOUR-GRADES","test_file":"tests/sprint-02/grd-02-four-grades.test.mjs","test_function":"FLOW-GRD-02-FOUR-GRADES","verify":"node --test --test-name-pattern 'FLOW-GRD-02-FOUR-GRADES' tests/sprint-02/grd-02-four-grades.test.mjs","positive_example":"A run on the landed commit where 40 check rows on the ten keyed cells cite evidence, no pinned row reads a `stream-mapping-` reason, each question row carries question_count and answers_delivered 0, and both cursor cells read could-not-run missing-api-key.","red":"Run 41249460968's artifact at 36e864a: 0 of 40 keyed rows cite evidence, 32 rows read `<harness>-adapter-not-implemented`, and claude-code's status row reads pass beside its question row reading `required-fact-unobserved`.","test_tier":"e2e","verification_service":"real harness-eval run on a hosted runner with real CLIs and keys, read through gh artifacts","unit_test_justified":null,"surface_policy":".spec/e2e-policy/sprint-02/artifact-only-read.json","scenario":{"id":"SC-GRD-02-1","use_case_ref":"UC-GRD-02","ac_ref":"AC-1","primary":true,"tier":"visible","test_tier":"e2e","verification_service":"real harness-eval run on a hosted runner with real CLIs and keys, read through gh artifacts","topology":"single-node","negative_control":{"would_fail_if":["the live cell still grades with the adapter's own line mapper and the table-driven stream layer stays disconnected","a check row is written with an empty evidence_paths list","a complete capture with no question reads could-not-run instead of fail"]},"evidence":{"forms":["stdout","file_artifact"],"examples":["jq prints `40` over the result artifact","`.checks[] | select(.check_id == \"status\")` carries `missing` beside reason `status-facts-absent`"],"required_capture":true},"build_proof":{"range":"anything that proves a keyed cell's four rows are computed from its own captured bytes through a per-harness table, with the reply, the question and the completion read from events","examples":["a harness-neutral normaliser driven by table rules","a live grade function every adapter calls after its invocation ends"]},"cases":[{"start_ref":"dispatched_run","action":{"actor":"cli_user","steps":["resolve the newest completed harness-eval run whose head_sha equals `git rev-parse HEAD`","download harness-eval-result-<run_id>-<attempt>","read every keyed cell's check rows"]},"end_state":{"must_observe":["`10` keyed cells each carry `4` rows, `40` rows in total, each with source `files-and-event-stream` and a non-empty `evidence_paths`","no row reads `required-fact-unobserved` where its capture record has prefix_complete `true`","each `question_before_expensive_work` row carries integer `question_count` and `answers_delivered` equal to `0`","both `cursor` cells read `could-not-run` `missing-api-key`"],"must_not_observe":["`0` rows carrying evidence_paths, the reading of run 41249460968","a row with an empty reason and a verdict other than `pass`","any `<harness>-adapter-not-implemented` reason"]}},{"start_ref":"archived_captures","action":{"actor":"cli_user","steps":["grade the archived real claude-code status-a reply against status-b's expected_facts, which differ only in gates.atoms"]},"end_state":{"must_observe":["verdict `fail`, reason `status-facts-absent`, `missing` contains `gates.atoms`"],"must_not_observe":["verdict `pass`","an empty `missing` list"]}}]},"maps_to_ac":null},{"id":"AC-2","type":"acceptance_criterion","primary":false,"title":"One grade function reads a real capture through a table, and a missing table is could-not-run","description":"GIVEN `committed_real_capture`, the real claude-code run at CLI 2.1.314 with exit 0, Bash and Write denials, and no question WHEN gradeInvocation grades those bytes through a temp table at 2.1.314, through renamed rule ids, with no table, and in planted scratch copies THEN must-ask reads fail no-question-asked, renamed rules keep every event, no table reads could-not-run stream-mapping-absent, and a Write before a planted question reads fail expensive-before-question","flow_ref":null,"test_file":"tests/sprint-02/grade-invocation.test.mjs","test_function":"GRADE-INVOCATION-REAL-BYTES","verify":"node --test --test-name-pattern 'GRADE-INVOCATION-REAL-BYTES' tests/sprint-02/grade-invocation.test.mjs","positive_example":"The committed capture graded must-ask with a temp copy of the table at 2.1.314 as its mapping reads `fail no-question-asked`, citing its stdout sha256. On the pinned track with no mapping, the same bytes read `could-not-run stream-mapping-absent`. A planted question placed before the first tool start reads pass, and one placed after the real `Write` reads fail expensive-before-question.","red":"On base test/harness/graders/grade-invocation.mjs does not exist, normalise.mjs branches on rule_id `session-init` and `required-read-denial`, and no path fails a must-ask probe for expensive work first, so the import fails, a table with renamed rules loses its session and denial events, and the planted copy would pass.","test_tier":"integration","verification_service":"the real normaliser and gradeInvocation over a committed real claude-code capture","unit_test_justified":null,"surface_policy":null,"scenario":{"id":"SC-GRADE-INVOCATION-1","use_case_ref":"UC-GRD-02","ac_ref":"AC-1","primary":false,"tier":"visible","test_tier":"integration","verification_service":"the real normaliser and gradeInvocation over a committed real claude-code capture","topology":"single-node","negative_control":{"would_fail_if":["normalise.mjs keeps a branch on a claude rule_id, so a renamed table loses events","a stubbed verdict is returned with no capture read","a complete capture with no question reads could-not-run","an empty table still yields a verdict"]},"evidence":{"forms":["stdout","file_artifact"],"examples":["`fail no-question-asked` citing the capture's sha256"],"required_capture":true},"build_proof":{"range":"anything that proves one grade function computes a row from any harness's captured bytes through that harness's table, and that a missing table is could-not-run by name","examples":["a rule-driven normaliser with path predicates and extract paths"]},"cases":[{"start_ref":"committed_real_capture","action":{"actor":"cli_user","steps":["grade the capture with ask_policy must-ask, passing a temp copy of the claude table declaring 2.1.314 as its mapping with state `qualified`"]},"end_state":{"must_observe":["verdict `fail`, reason `no-question-asked`, citing the capture's stdout sha256"],"must_not_observe":["verdict `could-not-run`","reason `required-fact-unobserved`","an empty evidence list"]}},{"start_ref":"committed_real_capture","action":{"actor":"cli_user","steps":["normalise the capture through that temp table","rename every rule_id in the temp table and normalise again"]},"end_state":{"must_observe":["both runs yield the same event count, the same session id and the same reply beginning `I couldn't write to the file`"],"must_not_observe":["a reply that is empty","`0` permission_denied events on the renamed run"]}},{"start_ref":"committed_real_capture","action":{"actor":"cli_user","steps":["grade the capture on the pinned track with the real tables directory, which holds no table for 2.1.314"]},"end_state":{"must_observe":["verdict `could-not-run`, reason `stream-mapping-absent`, naming `2.1.314`"],"must_not_observe":["verdict `pass`","table id `claude-code@2.1.291` on the row","no row at all for that check"]}},{"start_ref":"committed_real_capture","action":{"actor":"cli_user","steps":["grade the capture with required_read_paths taken from the run's cwd and loaded plugin root","in a scratch copy, rewrite the denied Bash call's command to run `node <plugin root>/scripts/gate.mjs audit`, labelled planted, and grade again"]},"end_state":{"must_observe":["the `Write` denial on `work/keep.txt` reads required_read `true` and verdict `fail` reason `denied_tool_call` beside process_exit_code `0`","the real Bash denial of `ls` reads required_read `false`","the planted denial of a plugin script reads required_read `true`"],"must_not_observe":["verdict `pass` from exit code `0`","required_read `null` on the `Write` denial"]}},{"start_ref":"committed_real_capture","action":{"actor":"cli_user","steps":["in a scratch copy, append a planted USER_CHOICE-shaped agent text after the real `Write` tool start, and grade must-ask with that same mapping","in another, place that text before the first tool start, and grade must-ask","in a third, rewrite the first Bash call to run `node <plugin root>/scripts/gate.mjs audit`, place the text after it, and grade must-ask"]},"end_state":{"must_observe":["first copy: verdict `fail`, reason `expensive-before-question`, naming `Write`","second copy: verdict `pass`, question_count `1`, answers_delivered `0`","third copy: the plugin script counts as local-read, so the reason is not `expensive-before-question`"],"must_not_observe":["verdict `pass` on the first copy","no reason on the first copy"]}}]},"maps_to_ac":null},{"id":"TC-1","type":"test_criterion","description":"Ten keyed cells each carry four check rows when the run at HEAD finishes","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'FLOW-GRD-02-FOUR-GRADES' tests/sprint-02/grd-02-four-grades.test.mjs","positive_example":"A run on the landed commit where 40 check rows on the ten keyed cells cite evidence, no pinned row reads a `stream-mapping-` reason, each question row carries question_count and answers_delivered 0, and both cursor cells read could-not-run missing-api-key."},{"id":"TC-2","type":"test_criterion","description":"Every keyed check row cites a non-empty evidence_paths list when the run at HEAD finishes","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'FLOW-GRD-02-FOUR-GRADES' tests/sprint-02/grd-02-four-grades.test.mjs","positive_example":"A run on the landed commit where 40 check rows on the ten keyed cells cite evidence, no pinned row reads a `stream-mapping-` reason, each question row carries question_count and answers_delivered 0, and both cursor cells read could-not-run missing-api-key."},{"id":"TC-3","type":"test_criterion","description":"Both cursor cells read `could-not-run` `missing-api-key` when the run at HEAD finishes","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'FLOW-GRD-02-FOUR-GRADES' tests/sprint-02/grd-02-four-grades.test.mjs","positive_example":"A run on the landed commit where 40 check rows on the ten keyed cells cite evidence, no pinned row reads a `stream-mapping-` reason, each question row carries question_count and answers_delivered 0, and both cursor cells read could-not-run missing-api-key."},{"id":"TC-4","type":"test_criterion","description":"An archived status-a reply reads fail status-facts-absent naming gates.atoms when graded against status-b's expected_facts","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'FLOW-GRD-02-FOUR-GRADES' tests/sprint-02/grd-02-four-grades.test.mjs","positive_example":"A run on the landed commit where 40 check rows on the ten keyed cells cite evidence, no pinned row reads a `stream-mapping-` reason, each question row carries question_count and answers_delivered 0, and both cursor cells read could-not-run missing-api-key."},{"id":"TC-5","type":"test_criterion","description":"The committed capture reads fail no-question-asked when graded must-ask through a 2.1.314 mapping","maps_to_ac":"AC-2","verify":"node --test --test-name-pattern 'GRADE-INVOCATION-REAL-BYTES' tests/sprint-02/grade-invocation.test.mjs","positive_example":"The committed capture graded must-ask with a temp copy of the table at 2.1.314 as its mapping reads `fail no-question-asked`, citing its stdout sha256. On the pinned track with no mapping, the same bytes read `could-not-run stream-mapping-absent`. A planted question placed before the first tool start reads pass, and one placed after the real `Write` reads fail expensive-before-question."},{"id":"TC-6","type":"test_criterion","description":"A table with every rule_id renamed yields the same event count as the original table on the committed capture","maps_to_ac":"AC-2","verify":"node --test --test-name-pattern 'GRADE-INVOCATION-REAL-BYTES' tests/sprint-02/grade-invocation.test.mjs","positive_example":"The committed capture graded must-ask with a temp copy of the table at 2.1.314 as its mapping reads `fail no-question-asked`, citing its stdout sha256. On the pinned track with no mapping, the same bytes read `could-not-run stream-mapping-absent`. A planted question placed before the first tool start reads pass, and one placed after the real `Write` reads fail expensive-before-question."},{"id":"TC-7","type":"test_criterion","description":"The committed capture reads `could-not-run` `stream-mapping-absent` on the pinned track with no table at 2.1.314","maps_to_ac":"AC-2","verify":"node --test --test-name-pattern 'GRADE-INVOCATION-REAL-BYTES' tests/sprint-02/grade-invocation.test.mjs","positive_example":"The committed capture graded must-ask with a temp copy of the table at 2.1.314 as its mapping reads `fail no-question-asked`, citing its stdout sha256. On the pinned track with no mapping, the same bytes read `could-not-run stream-mapping-absent`. A planted question placed before the first tool start reads pass, and one placed after the real `Write` reads fail expensive-before-question."},{"id":"TC-8","type":"test_criterion","description":"The Write denial reads required_read true beside process_exit_code 0 on the committed capture","maps_to_ac":"AC-2","verify":"node --test --test-name-pattern 'GRADE-INVOCATION-REAL-BYTES' tests/sprint-02/grade-invocation.test.mjs","positive_example":"The committed capture graded must-ask with a temp copy of the table at 2.1.314 as its mapping reads `fail no-question-asked`, citing its stdout sha256. On the pinned track with no mapping, the same bytes read `could-not-run stream-mapping-absent`. A planted question placed before the first tool start reads pass, and one placed after the real `Write` reads fail expensive-before-question."},{"id":"TC-9","type":"test_criterion","description":"A planted question after the real Write start reads fail expensive-before-question when graded must-ask","maps_to_ac":"AC-2","verify":"node --test --test-name-pattern 'GRADE-INVOCATION-REAL-BYTES' tests/sprint-02/grade-invocation.test.mjs","positive_example":"The committed capture graded must-ask with a temp copy of the table at 2.1.314 as its mapping reads `fail no-question-asked`, citing its stdout sha256. On the pinned track with no mapping, the same bytes read `could-not-run stream-mapping-absent`. A planted question placed before the first tool start reads pass, and one placed after the real `Write` reads fail expensive-before-question."},{"id":"TC-10","type":"test_criterion","description":"The committed capture graded through contract.mjs's gradeInvocation with a qualified 2.1.314 mapping reads no `stream-mapping-absent` reason","maps_to_ac":"AC-2","verify":"node --test --test-name-pattern 'GRADE-INVOCATION-REAL-BYTES' tests/sprint-02/grade-invocation.test.mjs","positive_example":"The committed capture graded must-ask with a temp copy of the table at 2.1.314 as its mapping reads `fail no-question-asked`, citing its stdout sha256. On the pinned track with no mapping, the same bytes read `could-not-run stream-mapping-absent`. A planted question placed before the first tool start reads pass, and one placed after the real `Write` reads fail expensive-before-question."}]}
-->
