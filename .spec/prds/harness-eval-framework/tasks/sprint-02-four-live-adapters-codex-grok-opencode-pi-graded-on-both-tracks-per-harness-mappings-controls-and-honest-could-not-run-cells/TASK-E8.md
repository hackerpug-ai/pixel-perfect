# TASK-E8: Map and qualify the Pi stream at its pinned version

> Task ID: E8
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

- **Human testing gate steps:** exercised at 5, 6, 10, 11, 12, 13, 14, 15, 16, 24.
- **PRD references:** `04-uc-grd.md UC-GRD-02 AC-2`; `09-technical-requirements/02-system-components.md pi-adapter`, under `.spec/prds/harness-eval-framework/`. Capability: CAP-EVAL-01.
- **Why it matters:** Without this table every Pi pinned row reads stream-mapping-absent, and Pi's JSON mode can exit 0 after a failed model call.
- **Current:** No Pi table exists, so `loadTable` refuses with mapping-table-absent.
- **Desired:** The table cites real captures at exactly 1.0.4, and a failed model call never reads as a pass.
- **Boundary:** captured bytes to table state: pi@1.0.4 qualifies only on real bytes at exactly that version, and any change to those bytes or rules stops it qualifying.

## Critical Constraints

- MUST commit only real CLI bytes, never hand-written ones: sprint 01's hand-written denial fixture hid a real parser bug. Qualification cites hosted captures only. A negative case may use real CLI bytes from an induced run at the exact pinned version, with its source recorded
- NEVER commit a capture holding a key value
- NEVER add a catch-all rule, a wildcard version or a `latest` table

## Specification

- **Objective:** The Pi table at its pinned version qualifies on real hosted captures, and a JSON-mode exit 0 after a failed model call reads could-not-run.
- **Success state:** Table pi@1.0.4 computes to state qualified from real captures at exactly that version, with required-read-denial declared not applicable, and a JSON-mode exit 0 after a failed model call reads could-not-run model-never-answered.

- Pi's no-gate row is approved, so required-read-denial stays declared not applicable. The other-version case runs on the pinned track; a newest leg goes through E9.

## Acceptance Criteria (GIVEN-WHEN-THEN)

### AC-1: The pi 1.0.4 table qualifies on real captures, and stops when its bytes or rules change [PRIMARY]

- **GIVEN:** `archived_captures`, real pi stdout at exactly 1.0.4 from a hosted run, with hashes and the source run id, and real CLI bytes from an induced run for the negative case
- **WHEN:** qualification is computed from them, then on temp copies with one changed byte, one removed rule and another declared version, and real captures of a failed model call and a boundary-stopped init are graded
- **THEN:** state reads qualified with 5 required facts and `required-read-denial` declared not applicable citing offsets, a changed byte reads capture-citation-mismatch, a removed rule reads required-fact-unmapped, another version reads stream-mapping-absent, the failed call reads could-not-run model-never-answered, and the init grades must-ask from its prefix

```text
FLOW_REF:              null
TEST_FILE:             tests/sprint-02/mapping-pi.test.mjs
TEST_FUNCTION:         MAP-PI-QUALIFIES
TEST_TIER:             integration
VERIFICATION_SERVICE:  real pi 1.0.4 stdout bytes captured on a hosted run, through the real normaliser and validator
SURFACE_POLICY:        null
```

SCENARIO_SUMMARY: One real capture set read four ways, plus a real failed model call on exit 0 and a real init stopped at its question.

## Test Criteria

| TC | Statement | Maps to |
|----|-----------|---------|
| TC-1 | Table pi@1.0.4 reads state qualified when computed from its archived captures | AC-1 |
| TC-2 | One changed capture byte reads state unqualified with reason capture-citation-mismatch | AC-1 |
| TC-3 | A removed rule reads reason required-fact-unmapped naming that fact | AC-1 |
| TC-4 | A temp table declaring another version reads reason stream-mapping-absent | AC-1 |
| TC-5 | A JSON-mode exit 0 after a failed model call reads `could-not-run` `model-never-answered` | AC-1 |
| TC-6 | A boundary-stopped init capture grades must-ask from its complete prefix | AC-1 |

## Reading List

1. `.spec/prds/harness-eval-framework/09-technical-requirements/02-system-components.md` lines 99: pi-adapter: message_end rule, boundary stop, no permission gate
2. `test/harness/stream/tables/claude-code@2.1.291.json` lines 1-60: the table shape and provenance block to follow

Coding standards: `AGENTS.md`, `brain/docs/TDD-METHODOLOGY.md`, `brain/docs/kanban/SCENARIO-CONTRACT-V1.md`.

## Guardrails

WRITE-ALLOWED:

- test/harness/stream/tables/pi@1.0.4.json (NEW)
- test/harness/fixtures/streams/pi@1.0.4/ (NEW)
- tests/sprint-02/mapping-pi.test.mjs (NEW)

WRITE-PROHIBITED:

- tests/sprint-01/** - locked
- test/harness/stream/*.mjs - E1 owns the normaliser and qualification; a table is data
- test/harness/graders/** - E1 and E2 own grading
- test/harness/adapters/** - GAW-6 owns the adapter
- .github/workflows/** - GAW tasks own the workflow
- plugins/pixel-perfect/** - the graded product
- Any file not listed in WRITE-ALLOWED

## Code Pattern

```json
{
  "schema": "stream-mapping/v1",
  "harness": "pi",
  "cli_version": "1.0.4",
  "provenance": { "captures": [ { "capture_id": "<id>", "stdout_path": "<committed .stdout.bin>", "stdout_sha256": "<of those bytes>", "facts_proven": ["<fact id>"] } ] },
  "rules": [ { "rule_id": "<any name>", "canonical_type": "session_started", "fact_id": "native-session-identity", "match": { "<field in a real line>": "<its value>" }, "extract": { "session_id": "<path in a real line>" } } ]
}
```

- **Source:** `test/harness/stream/tables/claude-code@2.1.291.json:1-60` for the full shape; E1 adds the rule vocabulary. This shows the shape only.
- **Anti-pattern:** A hand-written line; a catch-all rule; a wildcard version or a `latest` table; `qualified: true` with no capture behind it; a `harness_specific` line claiming a fact.

## Design

None. This task has no UI surface.

## Agent Instructions

1. Write `MAP-PI-QUALIFIES` first, and capture its RED at `.tmp/sprint-02-verification/mapping-pi.red.log`. It reads committed bytes locally. Changed bytes, removed rules and other versions go in temp copies, never over the fixture.
2. Get the bytes from the `harness-eval-evidence-<run>-<attempt>-pi-pinned` artifact of a completed harness-eval run at a commit where GAW-6 and GAW-9 have landed. If no such run exists, dispatch one with `gh workflow run harness-eval --repo hackerpug-ai/pixel-perfect`.
3. Commit the status, verify and init captures under `test/harness/fixtures/streams/pi@1.0.4/`, each with its capture record and source run id. Commit only files GAW-9's key scan exported.
4. Write the table from those bytes: every `match` and `extract` comes from a real line, and its qualification is computed, never stored.
5. Case 2 needs a real capture a normal dispatch may not produce: JSON mode exiting 0 after a failed model call. Look for it in the run's captures first. If none holds it, induce one with the real CLI at exactly 1.0.4 (`tests/sprint-02/real-cli.mjs` installs it under a temp prefix and temp HOME), record its source, and keep it out of the table's qualification citations. If no real run yields the shape, stop and report it. Never hand-write one.
6. Case 2 also needs an init stopped at its question. A version with no table gets no stop (E1), so the first dispatch's init runs past the question. Write the table from it, then take the stopped init from a dispatch whose ref holds the table.

## Orchestrator Verification Protocol

1. VERIFY_RED: each task-local VERIFY exits non-zero on the base commit.
2. VERIFY_GREEN: AC-1's command exits 0 on the landed task.
3. Regression: `node --test tests/sprint-01/grd-03-evidence.test.mjs` each exit 0.
4. `git diff --name-only` lists only WRITE-ALLOWED paths.
5. Dispatch `evals-reviewer` with this file, the RED and GREEN outputs, and the evidence.

## Agent Assignment

- **Planner role:** `evals-planner`
- **Implementer role:** `evals-implementer`
- **Reviewer role:** `evals-reviewer`
- **Rationale:** `evals-implementer` owns tables against real captures; `evals-reviewer` audits that no fact is claimed without real bytes.

## Evidence Gates

- **AC-1:** `node --test --test-name-pattern 'MAP-PI-QUALIFIES' tests/sprint-02/mapping-pi.test.mjs`. Expected: TAP `ok` after `table pi@1.0.4: qualified`, `capture-citation-mismatch`, `required-fact-unmapped`, and `stream-mapping-absent`.

## Review Criteria

Must pass:

- Every cited capture's sha256 equals its committed bytes, and each capture record names its source run id.
- Every `match` and `extract` resolves on a real captured line, and no rule is a catch-all.
- The state is computed from cited captures, and a stored boolean decides nothing.
- AC-1 reads committed real bytes; a hand-written capture or an empty table fails review.
- A negative-case capture records its source, and no qualification citation points at it.
- `required-read-denial` carries `not_applicable: true` on its `required_facts` entry in the committed table, never at run time.
- No event is fabricated for a stopped init that has no message_end.

Verdict: APPROVED or NEEDS_FIXES, with file and line for each finding.

## Dependencies

- **Depends on:** E1 (the rule vocabulary and capture-set qualification this table relies on), GAW-9 (AC-1 needs its exported captures; no locked flow replays it), GAW-6 (AC-1 needs its hosted captures at 1.0.4; no locked flow replays it)
- **Blocks:** none

## Notes

- **Flow use:** owns no locked flow. Gate steps 5, 6, 10, 11, 12, 13, 14, 15, 16, 24 replay it through the flows that list it in `available_after`, so it carries no integration obligation.

<!-- REQUIREMENT-CONTRACT v1 -->
<!--
{"version":"1","task_id":"E8","task_type":"FEATURE","tdd_mode":"red_first","verification_policy":{"requires_tests":true,"requires_red_evidence":true,"requires_seeded_evidence":true},"guardrails":{"write_allowed":["test/harness/stream/tables/pi@1.0.4.json (NEW)","test/harness/fixtures/streams/pi@1.0.4/ (NEW)","tests/sprint-02/mapping-pi.test.mjs (NEW)"],"write_prohibited":["tests/sprint-01/** - locked","test/harness/stream/*.mjs - E1 owns the normaliser and qualification; a table is data","test/harness/graders/** - E1 and E2 own grading","test/harness/adapters/** - GAW-6 owns the adapter",".github/workflows/** - GAW tasks own the workflow","plugins/pixel-perfect/** - the graded product"]},"fixtures":{"archived_captures":{"description":"Real stdout bytes from a hosted run at the exact pinned CLI version, committed with hashes and source run id","seed_method":"recorded_external","records":["test/harness/fixtures/streams/<harness>@<version>/<invocation-key>.stdout.bin","its capture record, whose stdout sha256 equals those bytes","a negative case's capture from an induced run: real CLI bytes at the exact pinned version, with its source recorded, and cited by no qualification"]}},"verification_gates":[],"integration_obligations":[],"requirements":[{"id":"AC-1","type":"acceptance_criterion","primary":true,"title":"The pi 1.0.4 table qualifies on real captures, and stops when its bytes or rules change","description":"GIVEN `archived_captures`, real pi stdout at exactly 1.0.4 from a hosted run, with hashes and the source run id, and real CLI bytes from an induced run for the negative case WHEN qualification is computed from them, then on temp copies with one changed byte, one removed rule and another declared version, and real captures of a failed model call and a boundary-stopped init are graded THEN state reads qualified with 5 required facts and `required-read-denial` declared not applicable citing offsets, a changed byte reads capture-citation-mismatch, a removed rule reads required-fact-unmapped, another version reads stream-mapping-absent, the failed call reads could-not-run model-never-answered, and the init grades must-ask from its prefix","flow_ref":null,"test_file":"tests/sprint-02/mapping-pi.test.mjs","test_function":"MAP-PI-QUALIFIES","verify":"node --test --test-name-pattern 'MAP-PI-QUALIFIES' tests/sprint-02/mapping-pi.test.mjs","positive_example":"Real captures of status, verify and init at 1.0.4: table state qualified, with each of the 5 required facts citing an offset and a sha256, and required-read-denial declared not applicable. A JSON-mode exit 0 after a failed model call reads could-not-run model-never-answered.","red":"On base test/harness/stream/tables holds no pi@1.0.4.json, so loading it refuses `mapping-table-absent` and this test fails.","test_tier":"integration","verification_service":"real pi 1.0.4 stdout bytes captured on a hosted run, through the real normaliser and validator","unit_test_justified":null,"surface_policy":null,"scenario":{"id":"SC-MAP-pi-1","use_case_ref":"UC-GRD-02","ac_ref":"AC-2","primary":false,"tier":"visible","test_tier":"integration","verification_service":"real pi 1.0.4 stdout bytes captured on a hosted run, through the real normaliser and validator","topology":"single-node","negative_control":{"would_fail_if":["the table is empty or holds a catch-all rule","the capture is hand-written instead of captured from the real CLI","qualified is a stored boolean with no capture behind it"]},"evidence":{"forms":["stdout","file_artifact"],"examples":["`table pi@1.0.4: qualified`"],"required_capture":true},"build_proof":{"range":"anything that proves the pi table at exactly 1.0.4 maps every required fact to spans of real captured bytes, and that it stops qualifying when those bytes or rules change","examples":["test/harness/stream/tables/pi@1.0.4.json citing archived captures"]},"cases":[{"start_ref":"archived_captures","action":{"actor":"cli_user","steps":["load pi@1.0.4 and compute its qualification from its archived captures","change one byte of one archived capture in a temp copy and recompute","remove the rule for one required fact in a temp copy and recompute","normalise the archived capture against a temp table declaring another version"]},"end_state":{"must_observe":["table state `qualified` with `5` required facts and `required-read-denial` declared not applicable, each citing an offset and a sha256","one byte changed: state `unqualified`, reason `capture-citation-mismatch`","rule removed: reason `required-fact-unmapped` naming that fact","other version: reason `stream-mapping-absent`"],"must_not_observe":["a `harness_specific` event claiming a fact","an empty offsets list on a fact the table declares observed","state `qualified` after the byte change"]}},{"start_ref":"archived_captures","action":{"actor":"cli_user","steps":["grade the archived real capture whose JSON mode exited `0` after a failed model call","grade the archived real init capture stopped at its question without a message_end"]},"end_state":{"must_observe":["the first reads `could-not-run` `model-never-answered`, because the last assistant message_end is missing or its stopReason is not `stop`","the second grades must-ask from its complete prefix with termination_kind `boundary-stop`"],"must_not_observe":["verdict `pass` from exit code `0`","a fabricated message_end event"]}}]},"maps_to_ac":null},{"id":"TC-1","type":"test_criterion","description":"Table pi@1.0.4 reads state qualified when computed from its archived captures","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'MAP-PI-QUALIFIES' tests/sprint-02/mapping-pi.test.mjs","positive_example":"Real captures of status, verify and init at 1.0.4: table state qualified, with each of the 5 required facts citing an offset and a sha256, and required-read-denial declared not applicable. A JSON-mode exit 0 after a failed model call reads could-not-run model-never-answered."},{"id":"TC-2","type":"test_criterion","description":"One changed capture byte reads state unqualified with reason capture-citation-mismatch","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'MAP-PI-QUALIFIES' tests/sprint-02/mapping-pi.test.mjs","positive_example":"Real captures of status, verify and init at 1.0.4: table state qualified, with each of the 5 required facts citing an offset and a sha256, and required-read-denial declared not applicable. A JSON-mode exit 0 after a failed model call reads could-not-run model-never-answered."},{"id":"TC-3","type":"test_criterion","description":"A removed rule reads reason required-fact-unmapped naming that fact","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'MAP-PI-QUALIFIES' tests/sprint-02/mapping-pi.test.mjs","positive_example":"Real captures of status, verify and init at 1.0.4: table state qualified, with each of the 5 required facts citing an offset and a sha256, and required-read-denial declared not applicable. A JSON-mode exit 0 after a failed model call reads could-not-run model-never-answered."},{"id":"TC-4","type":"test_criterion","description":"A temp table declaring another version reads reason stream-mapping-absent","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'MAP-PI-QUALIFIES' tests/sprint-02/mapping-pi.test.mjs","positive_example":"Real captures of status, verify and init at 1.0.4: table state qualified, with each of the 5 required facts citing an offset and a sha256, and required-read-denial declared not applicable. A JSON-mode exit 0 after a failed model call reads could-not-run model-never-answered."},{"id":"TC-5","type":"test_criterion","description":"A JSON-mode exit 0 after a failed model call reads `could-not-run` `model-never-answered`","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'MAP-PI-QUALIFIES' tests/sprint-02/mapping-pi.test.mjs","positive_example":"Real captures of status, verify and init at 1.0.4: table state qualified, with each of the 5 required facts citing an offset and a sha256, and required-read-denial declared not applicable. A JSON-mode exit 0 after a failed model call reads could-not-run model-never-answered."},{"id":"TC-6","type":"test_criterion","description":"A boundary-stopped init capture grades must-ask from its complete prefix","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'MAP-PI-QUALIFIES' tests/sprint-02/mapping-pi.test.mjs","positive_example":"Real captures of status, verify and init at 1.0.4: table state qualified, with each of the 5 required facts citing an offset and a sha256, and required-read-denial declared not applicable. A JSON-mode exit 0 after a failed model call reads could-not-run model-never-answered."}]}
-->
