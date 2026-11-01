# TASK-E4: Qualify the claude-code 2.1.291 table on hosted captures

> Task ID: E4
> Sprint: [SPRINT.md](./SPRINT.md)
> Status: Backlog
> Assignee: evals-implementer
> Priority: P0
> Points: 3
> Type: FEATURE
> Planner: evals-planner
> Reviewer: evals-reviewer
> Proposed By: evals-planner
> Wave: C
> TDD_MODE: red_first · RED_GREEN_REQUIRED: true

AGENT: planner=evals-planner | implementer=evals-implementer | reviewer=evals-reviewer

## Background

- **Human testing gate steps:** exercised at 5, 10, 11, 12, 13, 14, 15, 16, 24.
- **PRD references:** `04-uc-grd.md UC-GRD-02 AC-2`; `09-technical-requirements/02-system-components.md stream-grader`, under `.spec/prds/harness-eval-framework/`. Capability: CAP-EVAL-01.
- **Why it matters:** FLOW-GRD-02 needs no pinned row to read a `stream-mapping-` reason, and this table reads qualified false because its only capture is a keyless 2.1.312 probe that shows no tool call.
- **Current:** `claude-code@2.1.291.json` carries `qualified: false` and cites one capture at another version.
- **Desired:** The table cites real captures at exactly 2.1.291 for every required fact.
- **Boundary:** captured bytes to table state: claude-code@2.1.291 qualifies only on real bytes at exactly that version, and any change to those bytes or rules stops it qualifying.

## Critical Constraints

- MUST commit only bytes captured from the real CLI on a hosted run: sprint 01's hand-written denial fixture hid a real parser bug
- NEVER commit a capture holding a key value
- NEVER add a catch-all rule, a wildcard version or a `latest` table

## Specification

- **Objective:** The claude-code 2.1.291 table qualifies on real hosted captures at exactly that version, with the question fact read as agent text when no question tool is offered.
- **Success state:** Table claude-code@2.1.291 computes to state qualified from real captures at exactly that version, with all 6 required facts citing an offset and a sha256.

- Captures must come from the approved stance, which allows node on plugin scripts and which GAW-11 adds to claude-code. A capture recorded while Bash was denied, including any T16 fixture recorded that way, proves shape only and cannot qualify this table. T16 landed without that rule, so its fixtures count as that. The other-version case runs on the pinned track; a newest leg goes through E9.

## Acceptance Criteria (GIVEN-WHEN-THEN)

### AC-1: The claude-code 2.1.291 table qualifies on real captures, and stops when its bytes or rules change [PRIMARY]

- **GIVEN:** `archived_captures`, real claude-code stdout at exactly 2.1.291 from a hosted run, with hashes and the source run id
- **WHEN:** qualification is computed from them, then on temp copies with one changed byte, one removed rule and another declared version
- **THEN:** state reads qualified with all 6 required facts citing offsets, a changed byte reads capture-citation-mismatch, a removed rule reads required-fact-unmapped, and another version reads stream-mapping-absent

```text
FLOW_REF:              null
TEST_FILE:             tests/sprint-02/mapping-claude-code.test.mjs
TEST_FUNCTION:         MAP-CLAUDECODE-QUALIFIES
TEST_TIER:             integration
VERIFICATION_SERVICE:  real claude-code 2.1.291 stdout bytes captured on a hosted run, through the real normaliser and validator
SURFACE_POLICY:        null
```

SCENARIO_SUMMARY: One real capture set read four ways: as committed, with a changed byte, with a removed rule, and under another version.

## Test Criteria

| TC | Statement | Maps to |
|----|-----------|---------|
| TC-1 | Table claude-code@2.1.291 reads state qualified when computed from its archived captures | AC-1 |
| TC-2 | One changed capture byte reads state unqualified with reason capture-citation-mismatch | AC-1 |
| TC-3 | A removed rule reads reason required-fact-unmapped naming that fact | AC-1 |
| TC-4 | A temp table declaring another version reads reason stream-mapping-absent | AC-1 |

## Reading List

1. `test/harness/stream/tables/claude-code@2.1.291.json` lines 16-20: qualified false, and why
2. `test/harness/stream/archive-capture.mjs` lines 1-30: the keyless probe, which cannot prove tool facts
3. `test/harness/stream/validate-mapping.mjs` lines 51-99: what qualifying must check

Coding standards: `AGENTS.md`, `brain/docs/TDD-METHODOLOGY.md`, `brain/docs/kanban/SCENARIO-CONTRACT-V1.md`.

## Guardrails

WRITE-ALLOWED:

- test/harness/stream/tables/claude-code@2.1.291.json (MODIFY)
- test/harness/fixtures/streams/claude-code@2.1.291/ (NEW)
- tests/sprint-02/mapping-claude-code.test.mjs (NEW)

WRITE-PROHIBITED:

- tests/sprint-01/** - locked
- test/harness/stream/*.mjs - E1 owns the normaliser and qualification; a table is data
- test/harness/graders/** - E1 and E2 own grading
- test/harness/adapters/** - GAW-1 owns the adapter contract
- .github/workflows/** - GAW tasks own the workflow
- plugins/pixel-perfect/** - the graded product
- Any file not listed in WRITE-ALLOWED

## Code Pattern

```json
{
  "schema": "stream-mapping/v1",
  "harness": "claude-code",
  "cli_version": "2.1.291",
  "provenance": { "captures": [ { "capture_id": "<id>", "stdout_path": "<committed .stdout.bin>", "stdout_sha256": "<of those bytes>", "facts_proven": ["<fact id>"] } ] },
  "rules": [ { "rule_id": "<any name>", "canonical_type": "session_started", "fact_id": "native-session-identity", "match": { "<field in a real line>": "<its value>" }, "extract": { "session_id": "<path in a real line>" } } ]
}
```

- **Source:** `test/harness/stream/tables/claude-code@2.1.291.json:1-60` for the full shape; E1 adds the rule vocabulary. This shows the shape only.
- **Anti-pattern:** A hand-written line; a catch-all rule; a wildcard version or a `latest` table; `qualified: true` with no capture behind it; a `harness_specific` line claiming a fact.

## Design

None. This task has no UI surface.

## Agent Instructions

1. Write `MAP-CLAUDECODE-QUALIFIES` first, and capture its RED at `.tmp/sprint-02-verification/mapping-claude-code.red.log`. It reads committed bytes locally. Changed bytes, removed rules and other versions go in temp copies, never over the fixture.
2. Get the bytes from the `harness-eval-evidence-<run>-<attempt>-claude-code-pinned` artifact of a completed harness-eval run at a commit where GAW-11 and GAW-9 have landed. If no such run exists, dispatch one with `gh workflow run harness-eval --repo hackerpug-ai/pixel-perfect`.
3. Commit the status, verify, init and denied-write probe captures under `test/harness/fixtures/streams/claude-code@2.1.291/`, each with its capture record and source run id. Commit only files GAW-9's key scan exported.
4. Write the table from those bytes: every `match` and `extract` comes from a real line, and its qualification is computed, never stored.

## Orchestrator Verification Protocol

1. VERIFY_RED: each task-local VERIFY exits non-zero on the base commit.
2. VERIFY_GREEN: AC-1's command exits 0 on the landed task.
3. Regression: `node --test tests/sprint-01/grd-02-four-grades.test.mjs`; `node --test tests/sprint-01/grd-03-evidence.test.mjs`; `node --test tests/sprint-02/grade-invocation.test.mjs` each exit 0.
4. `git diff --name-only` lists only WRITE-ALLOWED paths.
5. Dispatch `evals-reviewer` with this file, the RED and GREEN outputs, and the evidence.

## Agent Assignment

- **Planner role:** `evals-planner`
- **Implementer role:** `evals-implementer`
- **Reviewer role:** `evals-reviewer`
- **Rationale:** `evals-implementer` owns tables against real captures; `evals-reviewer` audits that no fact is claimed without real bytes.

## Evidence Gates

- **AC-1:** `node --test --test-name-pattern 'MAP-CLAUDECODE-QUALIFIES' tests/sprint-02/mapping-claude-code.test.mjs`. Expected: TAP `ok` after `table claude-code@2.1.291: qualified`, `capture-citation-mismatch`, `required-fact-unmapped`, and `stream-mapping-absent`.

## Review Criteria

Must pass:

- Every cited capture's sha256 equals its committed bytes, and each capture record names its source run id.
- Every `match` and `extract` resolves on a real captured line, and no rule is a catch-all.
- The state is computed from cited captures, and a stored boolean decides nothing.
- AC-1 reads committed real bytes; a hand-written capture or an empty table fails review.
- The question fact reads as agent text when no question tool is offered.

Verdict: APPROVED or NEEDS_FIXES, with file and line for each finding.

## Dependencies

- **Depends on:** E1 (the capture-set qualification and the table schema this table must satisfy), GAW-9 (AC-1 needs its exported captures at 2.1.291; no locked flow replays it)
- **Blocks:** none

## Notes

- **Flow use:** owns no locked flow. Gate steps 5, 10, 11, 12, 13, 14, 15, 16, 24 replay it through the flows that list it in `available_after`, so it carries no integration obligation.

<!-- REQUIREMENT-CONTRACT v1 -->
<!--
{"version":"1","task_id":"E4","task_type":"FEATURE","tdd_mode":"red_first","verification_policy":{"requires_tests":true,"requires_red_evidence":true,"requires_seeded_evidence":true},"guardrails":{"write_allowed":["test/harness/stream/tables/claude-code@2.1.291.json (MODIFY)","test/harness/fixtures/streams/claude-code@2.1.291/ (NEW)","tests/sprint-02/mapping-claude-code.test.mjs (NEW)"],"write_prohibited":["tests/sprint-01/** - locked","test/harness/stream/*.mjs - E1 owns the normaliser and qualification; a table is data","test/harness/graders/** - E1 and E2 own grading","test/harness/adapters/** - GAW-1 owns the adapter contract",".github/workflows/** - GAW tasks own the workflow","plugins/pixel-perfect/** - the graded product"]},"fixtures":{"archived_captures":{"description":"Real stdout bytes from a hosted run at the exact pinned CLI version, committed with hashes and source run id","seed_method":"recorded_external","records":["test/harness/fixtures/streams/<harness>@<version>/<invocation-key>.stdout.bin","its capture record, whose stdout sha256 equals those bytes"]}},"verification_gates":[],"integration_obligations":[],"requirements":[{"id":"AC-1","type":"acceptance_criterion","primary":true,"title":"The claude-code 2.1.291 table qualifies on real captures, and stops when its bytes or rules change","description":"GIVEN `archived_captures`, real claude-code stdout at exactly 2.1.291 from a hosted run, with hashes and the source run id WHEN qualification is computed from them, then on temp copies with one changed byte, one removed rule and another declared version THEN state reads qualified with all 6 required facts citing offsets, a changed byte reads capture-citation-mismatch, a removed rule reads required-fact-unmapped, and another version reads stream-mapping-absent","flow_ref":null,"test_file":"tests/sprint-02/mapping-claude-code.test.mjs","test_function":"MAP-CLAUDECODE-QUALIFIES","verify":"node --test --test-name-pattern 'MAP-CLAUDECODE-QUALIFIES' tests/sprint-02/mapping-claude-code.test.mjs","positive_example":"Real captures of status, verify, init and the denied-write probe at 2.1.291: table state qualified, with each of the 6 required facts citing an offset and a sha256.","red":"On base the table reads qualified false and cites only a keyless 2.1.312 capture, so its state reads unqualified and this test fails.","test_tier":"integration","verification_service":"real claude-code 2.1.291 stdout bytes captured on a hosted run, through the real normaliser and validator","unit_test_justified":null,"surface_policy":null,"scenario":{"id":"SC-MAP-claude-code-1","use_case_ref":"UC-GRD-02","ac_ref":"AC-2","primary":false,"tier":"visible","test_tier":"integration","verification_service":"real claude-code 2.1.291 stdout bytes captured on a hosted run, through the real normaliser and validator","topology":"single-node","negative_control":{"would_fail_if":["the table is empty or holds a catch-all rule","the capture is hand-written instead of captured from the real CLI","qualified is a stored boolean with no capture behind it"]},"evidence":{"forms":["stdout","file_artifact"],"examples":["`table claude-code@2.1.291: qualified`"],"required_capture":true},"build_proof":{"range":"anything that proves the claude-code table at exactly 2.1.291 maps every required fact to spans of real captured bytes, and that it stops qualifying when those bytes or rules change","examples":["test/harness/stream/tables/claude-code@2.1.291.json citing archived captures"]},"cases":[{"start_ref":"archived_captures","action":{"actor":"cli_user","steps":["load claude-code@2.1.291 and compute its qualification from its archived captures","change one byte of one archived capture in a temp copy and recompute","remove the rule for one required fact in a temp copy and recompute","normalise the archived capture against a temp table declaring another version"]},"end_state":{"must_observe":["table state `qualified` with all `6` required facts, each citing an offset and a sha256","one byte changed: state `unqualified`, reason `capture-citation-mismatch`","rule removed: reason `required-fact-unmapped` naming that fact","other version: reason `stream-mapping-absent`"],"must_not_observe":["a `harness_specific` event claiming a fact","an empty offsets list on a fact the table declares observed","state `qualified` after the byte change"]}}]},"maps_to_ac":null},{"id":"TC-1","type":"test_criterion","description":"Table claude-code@2.1.291 reads state qualified when computed from its archived captures","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'MAP-CLAUDECODE-QUALIFIES' tests/sprint-02/mapping-claude-code.test.mjs","positive_example":"Real captures of status, verify, init and the denied-write probe at 2.1.291: table state qualified, with each of the 6 required facts citing an offset and a sha256."},{"id":"TC-2","type":"test_criterion","description":"One changed capture byte reads state unqualified with reason capture-citation-mismatch","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'MAP-CLAUDECODE-QUALIFIES' tests/sprint-02/mapping-claude-code.test.mjs","positive_example":"Real captures of status, verify, init and the denied-write probe at 2.1.291: table state qualified, with each of the 6 required facts citing an offset and a sha256."},{"id":"TC-3","type":"test_criterion","description":"A removed rule reads reason required-fact-unmapped naming that fact","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'MAP-CLAUDECODE-QUALIFIES' tests/sprint-02/mapping-claude-code.test.mjs","positive_example":"Real captures of status, verify, init and the denied-write probe at 2.1.291: table state qualified, with each of the 6 required facts citing an offset and a sha256."},{"id":"TC-4","type":"test_criterion","description":"A temp table declaring another version reads reason stream-mapping-absent","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'MAP-CLAUDECODE-QUALIFIES' tests/sprint-02/mapping-claude-code.test.mjs","positive_example":"Real captures of status, verify, init and the denied-write probe at 2.1.291: table state qualified, with each of the 6 required facts citing an offset and a sha256."}]}
-->
