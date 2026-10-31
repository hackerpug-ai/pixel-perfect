# TASK-GAW-2: Stop a must-ask probe at its first question

> Task ID: GAW-2
> Sprint: [SPRINT.md](./SPRINT.md)
> Status: Backlog
> Assignee: ai-tooling-implementer
> Priority: P1
> Points: 3
> Type: FEATURE
> Planner: github-agentic-workflow-planner
> Reviewer: ai-tooling-reviewer
> Proposed By: github-agentic-workflow-planner
> Wave: A
> TDD_MODE: red_first · RED_GREEN_REQUIRED: true

AGENT: planner=github-agentic-workflow-planner | implementer=ai-tooling-implementer | reviewer=ai-tooling-reviewer

## Background

- **Problem:** a must-ask probe has to end at its first question. `spawnCaptured` has no per-line hook, so a child runs to its own end. `adapters/claude-code.mjs` lines 22-30 record that the boundary stop has no producer.
- **Already there:** `terminationKind` in `capture.mjs` lines 60-66 reads `question-boundary`, and `boundaryStopCheck` in `stream/question-boundary.mjs` lines 75-109 consumes it. Only the producer is missing.
- **Gate steps that exercise this task:** 15, 20. Capability: CAP-EVAL-01.

## Critical Constraints

- **MUST:** spawnCaptured gains one option, stop_at(line). The caller supplies the predicate, because what counts as a question is the evaluator lane's mapping. On the first true line the child is killed and the status carries stop_reason question-boundary with that line's measured byte offset.
- **WHY:** Grok tells the model to continue after a question, so waiting for exit grades work done after it. That is why this stop exists.
- **STRICTLY:** This proof is task-local because no hosted flow can observe a byte that was never written. FLOW-GRD-02 replays the outcome: list GAW-2 in the exercises of the gate step that flow names.

## Specification

- **Objective:** `spawnCaptured` ends a child at the first line a caller's predicate matches and records that line's measured byte offset.
- **Success state:** With `stop_at`, a child whose third line is a question reads `boundary-stop` with its measured offset in under 10 seconds. With no match it reads `native` and a null offset. Past its timeout it reads `timeout`.

## Acceptance Criteria (GIVEN-WHEN-THEN)

### AC-1: The child dies at the first question and later bytes are never captured [PRIMARY]

- **GIVEN:** a real node child that prints a question on line 3, then keeps printing for 20 seconds
- **WHEN:** it runs through `spawnCaptured` with `stop_at` matching that line, and the capture persists
- **THEN:** `termination_kind` reads `boundary-stop`, `boundary_event_offset` equals line 3's measured offset, `duration_ms` is under 10000, and the child's final line is absent from stdout

```text
FLOW_REF:              null
TEST_TIER:             integration
VERIFICATION_SERVICE:  real child process through spawnCaptured and the real capture record
SURFACE_POLICY:        null
TDD_STATE:             none
TEST_FILE:             tests/sprint-02/capture-boundary-stop.test.mjs
TEST_FUNCTION:         CAPTURE-BOUNDARY-STOP
VERIFY:                node --test --test-name-pattern 'CAPTURE-BOUNDARY-STOP' tests/sprint-02/capture-boundary-stop.test.mjs
```

SCENARIO_SUMMARY: A real child with a question on line 3 is killed at that line, and later bytes are never captured.

### AC-2: No question and a timeout never read as a boundary stop [PRIMARY]

- **GIVEN:** the same child
- **WHEN:** it runs with a predicate that matches no line, then with a 1000 ms timeout and no predicate
- **THEN:** the first reads `native` with a null offset, and the second reads `timeout` with `boundaryStopCheck` returning `termination-timeout`

```text
FLOW_REF:              null
TEST_TIER:             integration
VERIFICATION_SERVICE:  real child process through spawnCaptured and boundaryStopCheck
SURFACE_POLICY:        null
TDD_STATE:             none
TEST_FILE:             tests/sprint-02/capture-boundary-stop.test.mjs
TEST_FUNCTION:         CAPTURE-BOUNDARY-NEGATIVES
VERIFY:                node --test --test-name-pattern 'CAPTURE-BOUNDARY-NEGATIVES' tests/sprint-02/capture-boundary-stop.test.mjs
```

SCENARIO_SUMMARY: No match reads native and a timeout reads timeout, so neither can pass as a boundary stop.

Each AC's RED input and positive example are in its row of the contract block below.

## Test Criteria

Each TC runs its mapped AC's VERIFY.

| ID | Statement | Maps to |
|---|---|---|
| TC-1 | `termination_kind` reads `boundary-stop` when `stop_at` matches line 3 | AC-1 |
| TC-2 | `boundary_event_offset` equals line 3's measured byte offset when `stop_at` matches line 3 | AC-1 |
| TC-3 | Stdout holds no bytes from the child's final line when `stop_at` matches line 3 | AC-1 |
| TC-4 | `termination_kind` reads `native` when `stop_at` matches no line | AC-2 |
| TC-5 | `boundaryStopCheck` returns reason `termination-timeout` when the child outlives a 1000 ms timeout | AC-2 |

## Reading List

1. `test/harness/runtime/capture.mjs` lines 368-396: spawnCaptured, with no per-chunk hook today
2. `test/harness/runtime/capture.mjs` lines 60-66: terminationKind already reads question-boundary
3. `test/harness/stream/question-boundary.mjs` lines 75-109: boundaryStopCheck, the existing consumer

Standards: `AGENTS.md`, `brain/docs/kanban/SCENARIO-CONTRACT-V1.md`.

## Guardrails

WRITE-ALLOWED:

- test/harness/runtime/capture.mjs (MODIFY)
- tests/sprint-02/capture-boundary-stop.test.mjs (NEW)

WRITE-PROHIBITED:

- test/harness/stream/** - what counts as a question is the evaluator lane's mapping
- test/harness/adapters/** - each adapter passes its own predicate
- Any file not listed in WRITE-ALLOWED

## Code Pattern

```js
// test/harness/runtime/capture.mjs:389: the handler this option wraps.
child.stdout.on("data", (chunk) => capture.append(chunk, "stdout"));
```

- **Anti-pattern:** Deciding what a question is inside `capture.mjs`; recording any kill as a boundary stop; a hardcoded offset; testing against a line that lands whole in one chunk only.

## Design

None. This task has no UI surface.

## Agent Instructions

Work AC-1 then AC-2, one RED, GREEN, REFACTOR cycle each. Buffer stdout by line, because a chunk can split a line. Count bytes, not characters, for the offset. Keep every byte up to and including the matched chunk in the capture.

## Orchestrator Verification Protocol

1. **VERIFY_RED:** each VERIFY fails on base for the reason its RED names.
2. **VERIFY_GREEN:** each VERIFY exits 0.
3. Run every Evidence Gate and compare with Expected.
4. `git diff --name-only` lists only WRITE-ALLOWED paths.
5. Dispatch `ai-tooling-reviewer` with this file, the RED and GREEN output, and the evidence.

## Agent Assignment

- **Planner:** `github-agentic-workflow-planner`
- **Implementer:** `ai-tooling-implementer`
- **Reviewer:** `ai-tooling-reviewer`
- **Rationale:** `ai-tooling-implementer` owns the capture layer inside the evaluator workflow. `ai-tooling-reviewer` checks the seam the adapters pass their predicates through.

## Evidence Gates

Every VERIFY above exits 0, then:

- **tests:** `node --test tests/sprint-02/capture-boundary-stop.test.mjs`. Expected: exit 0 with 2 passing tests
- **regression-capture:** `node --test test/harness/runtime/capture-observe.test.mjs`. Expected: exit 0: existing capture behavior holds

## Review Criteria

Must pass:

- One test per AC, named exactly as its TEST_FUNCTION.
- `stop_reason` is set only in the predicate branch.
- The offset is measured from captured bytes.
- A spawn with no `stop_at` behaves exactly as before.

Should verify:

- A line split across two chunks still matches.
- The child is gone before `settle` resolves.

Verdict: APPROVED or NEEDS_FIXES, with file and line for each finding.

## Dependencies

- **Depends on:** none
- **Blocks:** GAW-3, GAW-4, GAW-5, GAW-6

## Notes

- **Flows:** owns no locked flow. Both ACs are task-local because no hosted flow can observe a byte that was never written. FLOW-GRD-02 replays the outcome at gate step 15, and step 20 reads Grok's stop.
- **Provenance:** prd 09-technical-requirements/02-system-components.md question-boundary; adapters/claude-code.mjs lines 22-30 record that boundary-stop has no producer

<!-- REQUIREMENT-CONTRACT v1 -->
<!--
{"version":"1","task_id":"GAW-2","task_type":"FEATURE","tdd_mode":"red_first","verification_policy":{"requires_tests":true,"requires_red_evidence":true,"requires_seeded_evidence":true},"guardrails":{"write_allowed":["test/harness/runtime/capture.mjs (MODIFY)","tests/sprint-02/capture-boundary-stop.test.mjs (NEW)"],"write_prohibited":["test/harness/stream/** - what counts as a question is the evaluator lane's mapping","test/harness/adapters/** - each adapter passes its own predicate","Any file not listed in WRITE-ALLOWED"]},"fixtures":{"seed/real-child":{"description":"A real node child that prints a known line sequence with a question line at a measured offset, then keeps printing for 20 seconds","seed_method":"cli","records":["line 3 of the child's output is the question line"]}},"verification_gates":[{"gate":"tests","command":"node --test tests/sprint-02/capture-boundary-stop.test.mjs","expected":"exit 0 with 2 passing tests","positive_example":"both CAPTURE-BOUNDARY tests pass against a real child process"},{"gate":"regression-capture","command":"node --test test/harness/runtime/capture-observe.test.mjs","expected":"exit 0: existing capture behavior holds","positive_example":"the existing capture tests pass with no stop_at option given"}],"integration_obligations":[],"requirements":[{"id":"AC-1","type":"acceptance_criterion","primary":true,"description":"GIVEN a real node child that prints a question on line 3, then keeps printing for 20 seconds WHEN it runs through `spawnCaptured` with `stop_at` matching that line, and the capture persists THEN `termination_kind` reads `boundary-stop`, `boundary_event_offset` equals line 3's measured offset, `duration_ms` is under 10000, and the child's final line is absent from stdout","flow_ref":null,"test_file":"tests/sprint-02/capture-boundary-stop.test.mjs","test_function":"CAPTURE-BOUNDARY-STOP","verify":"node --test --test-name-pattern 'CAPTURE-BOUNDARY-STOP' tests/sprint-02/capture-boundary-stop.test.mjs","test_tier":"integration","verification_service":"real child process through spawnCaptured and the real capture record","surface_policy":null,"positive_example":"Child with its question on line 3: termination_kind boundary-stop, boundary_event_offset equal to line 3's offset, prefix_complete true, and captured bytes ending within line 3 or the next chunk.","red":"On base spawnCaptured ignores stop_at, the child runs to its end, termination_kind reads native and this test fails.","maps_to_ac":null,"scenario":{"tier":"visible","test_tier":"integration","verification_service":"real child process through spawnCaptured and the real capture record","topology":"single-node","negative_control":{"would_fail_if":["stop_at is a no-op, so termination stays native","the child is not killed and later bytes are captured"]},"evidence":{"forms":["file_artifact"],"examples":["capture.json with termination_kind boundary-stop"],"required_capture":true},"build_proof":{"range":"anything that proves the recorder ends the process at the first question and records where","examples":["a line-buffered predicate in the stdout handler"]},"cases":[{"start_ref":"seed/real-child","action":{"actor":"runner","steps":["spawn the child with stop_at matching the question line","persist the capture"]},"end_state":{"must_observe":["`termination_kind` is `boundary-stop`","`boundary_event_offset` equals the measured offset of line 3","`duration_ms` is under 10000 against a 20000 ms child"],"must_not_observe":["bytes from the child's final line in stdout","a null boundary_event_offset","an empty capture of 0 bytes"]}}]}},{"id":"AC-2","type":"acceptance_criterion","primary":true,"description":"GIVEN the same child WHEN it runs with a predicate that matches no line, then with a 1000 ms timeout and no predicate THEN the first reads `native` with a null offset, and the second reads `timeout` with `boundaryStopCheck` returning `termination-timeout`","flow_ref":null,"test_file":"tests/sprint-02/capture-boundary-stop.test.mjs","test_function":"CAPTURE-BOUNDARY-NEGATIVES","verify":"node --test --test-name-pattern 'CAPTURE-BOUNDARY-NEGATIVES' tests/sprint-02/capture-boundary-stop.test.mjs","test_tier":"integration","verification_service":"real child process through spawnCaptured and boundaryStopCheck","surface_policy":null,"positive_example":"A child with no question line reads native with a null offset, and a child that outlives its timeout reads timeout.","red":"On base the option does not exist, so a predicate that is expected to fire never does and the first assertion on the positive half fails.","maps_to_ac":null,"scenario":{"tier":"visible","test_tier":"integration","verification_service":"real child process through spawnCaptured and boundaryStopCheck","topology":"single-node","negative_control":{"would_fail_if":["a kill for any reason is recorded as boundary-stop","the offset is hardcoded instead of measured"]},"evidence":{"forms":["file_artifact"],"examples":["capture.json with termination_kind timeout"],"required_capture":true},"build_proof":{"range":"anything that proves only a matched question can produce a boundary stop","examples":["stop_reason set solely by the predicate branch"]},"cases":[{"start_ref":"seed/real-child","action":{"actor":"runner","steps":["spawn the child with a predicate that matches no line","spawn it again with a 1000 ms timeout and no predicate"]},"end_state":{"must_observe":["first: `termination_kind` is `native` and `boundary_event_offset` is null","second: `termination_kind` is `timeout` and boundaryStopCheck returns reason `termination-timeout`"],"must_not_observe":["`boundary-stop` on either run","a pass from boundaryStopCheck on the timeout","an empty capture of 0 bytes on the first run"]}}]}},{"id":"TC-1","type":"test_criterion","description":"`termination_kind` reads `boundary-stop` when `stop_at` matches line 3","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'CAPTURE-BOUNDARY-STOP' tests/sprint-02/capture-boundary-stop.test.mjs","positive_example":"Child with its question on line 3: termination_kind boundary-stop, boundary_event_offset equal to line 3's offset, prefix_complete true, and captured bytes ending within line 3 or the next chunk."},{"id":"TC-2","type":"test_criterion","description":"`boundary_event_offset` equals line 3's measured byte offset when `stop_at` matches line 3","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'CAPTURE-BOUNDARY-STOP' tests/sprint-02/capture-boundary-stop.test.mjs","positive_example":"Child with its question on line 3: termination_kind boundary-stop, boundary_event_offset equal to line 3's offset, prefix_complete true, and captured bytes ending within line 3 or the next chunk."},{"id":"TC-3","type":"test_criterion","description":"Stdout holds no bytes from the child's final line when `stop_at` matches line 3","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'CAPTURE-BOUNDARY-STOP' tests/sprint-02/capture-boundary-stop.test.mjs","positive_example":"Child with its question on line 3: termination_kind boundary-stop, boundary_event_offset equal to line 3's offset, prefix_complete true, and captured bytes ending within line 3 or the next chunk."},{"id":"TC-4","type":"test_criterion","description":"`termination_kind` reads `native` when `stop_at` matches no line","maps_to_ac":"AC-2","verify":"node --test --test-name-pattern 'CAPTURE-BOUNDARY-NEGATIVES' tests/sprint-02/capture-boundary-stop.test.mjs","positive_example":"A child with no question line reads native with a null offset, and a child that outlives its timeout reads timeout."},{"id":"TC-5","type":"test_criterion","description":"`boundaryStopCheck` returns reason `termination-timeout` when the child outlives a 1000 ms timeout","maps_to_ac":"AC-2","verify":"node --test --test-name-pattern 'CAPTURE-BOUNDARY-NEGATIVES' tests/sprint-02/capture-boundary-stop.test.mjs","positive_example":"A child with no question line reads native with a null offset, and a child that outlives its timeout reads timeout."}]}
-->
