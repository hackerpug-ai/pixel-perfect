# TASK-E5: Map and qualify the Codex stream at its pinned version

> Task ID: E5
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
- **PRD references:** `04-uc-grd.md UC-GRD-02 AC-2`; `09-technical-requirements/02-system-components.md codex-adapter`, under `.spec/prds/harness-eval-framework/`. Capability: CAP-EVAL-01.
- **Why it matters:** Without this table every Codex pinned row reads stream-mapping-absent, and Codex emits `error` items that a naive reading would fail.
- **Current:** No Codex table exists, so `loadTable` refuses with mapping-table-absent.
- **Desired:** The table cites real captures at exactly 0.160.1, and a warning item alone never fails a row.
- **Boundary:** captured bytes to table state: codex@0.160.1 qualifies only on real bytes at exactly that version, and any change to those bytes or rules stops it qualifying.

## Critical Constraints

- MUST commit only real CLI bytes, never hand-written ones: sprint 01's hand-written denial fixture hid a real parser bug. Qualification cites hosted captures only. A negative case may use real CLI bytes from an induced run at the exact pinned version, with its source recorded
- NEVER commit a capture holding a key value
- NEVER add a catch-all rule, a wildcard version or a `latest` table

## Specification

- **Objective:** The Codex table at its pinned version qualifies on real hosted captures, and a warning item of type error alone never fails a row.
- **Success state:** Table codex@0.160.1 computes to state qualified from real captures at exactly that version, and an `error` item beside a completed turn adds 0 fail blocks.

- The approved stance rules and the pinned model apply to these captures. The other-version case runs on the pinned track; a newest leg goes through E9.

## Acceptance Criteria (GIVEN-WHEN-THEN)

### AC-1: The codex 0.160.1 table qualifies on real captures, and stops when its bytes or rules change [PRIMARY]

- **GIVEN:** `archived_captures`, real codex stdout at exactly 0.160.1 from a hosted run, with hashes and the source run id, and real CLI bytes from an induced run for the negative case
- **WHEN:** qualification is computed from them, then on temp copies with one changed byte, one removed rule and another declared version, and a real capture with an `error` item beside a completed turn is graded
- **THEN:** state reads qualified with all 6 required facts or a declared not-applicable entry citing offsets, a changed byte reads capture-citation-mismatch, a removed rule reads required-fact-unmapped, another version reads stream-mapping-absent, and that item adds 0 fail blocks

```text
FLOW_REF:              null
TEST_FILE:             tests/sprint-02/mapping-codex.test.mjs
TEST_FUNCTION:         MAP-CODEX-QUALIFIES
TEST_TIER:             integration
VERIFICATION_SERVICE:  real codex 0.160.1 stdout bytes captured on a hosted run, through the real normaliser and validator
SURFACE_POLICY:        null
```

SCENARIO_SUMMARY: One real capture set read four ways, plus a real `error` item beside a completed turn that fails nothing.

## Test Criteria

| TC | Statement | Maps to |
|----|-----------|---------|
| TC-1 | Table codex@0.160.1 reads state qualified when computed from its archived captures | AC-1 |
| TC-2 | One changed capture byte reads state unqualified with reason capture-citation-mismatch | AC-1 |
| TC-3 | A removed rule reads reason required-fact-unmapped naming that fact | AC-1 |
| TC-4 | A temp table declaring another version reads reason stream-mapping-absent | AC-1 |
| TC-5 | An `error` item beside a completed turn adds 0 fail blocks | AC-1 |

## Reading List

1. `.spec/prds/harness-eval-framework/09-technical-requirements/02-system-components.md` lines 81: codex-adapter: --json, -o reply, error items, sandbox split
2. `test/harness/stream/tables/claude-code@2.1.291.json` lines 1-60: the table shape and provenance block to follow

Coding standards: `AGENTS.md`, `brain/docs/TDD-METHODOLOGY.md`, `brain/docs/kanban/SCENARIO-CONTRACT-V1.md`.

## Guardrails

WRITE-ALLOWED:

- test/harness/stream/tables/codex@0.160.1.json (NEW)
- test/harness/fixtures/streams/codex@0.160.1/ (NEW)
- tests/sprint-02/mapping-codex.test.mjs (NEW)

WRITE-PROHIBITED:

- tests/sprint-01/** - locked
- test/harness/stream/*.mjs - E1 owns the normaliser and qualification; a table is data
- test/harness/graders/** - E1 and E2 own grading
- test/harness/adapters/** - GAW-3 owns the adapter
- .github/workflows/** - GAW tasks own the workflow
- plugins/pixel-perfect/** - the graded product
- Any file not listed in WRITE-ALLOWED

## Code Pattern

```json
{
  "schema": "stream-mapping/v1",
  "harness": "codex",
  "cli_version": "0.160.1",
  "provenance": { "captures": [ { "capture_id": "<id>", "stdout_path": "<committed .stdout.bin>", "stdout_sha256": "<of those bytes>", "facts_proven": ["<fact id>"] } ] },
  "rules": [ { "rule_id": "<any name>", "canonical_type": "session_started", "fact_id": "native-session-identity", "match": { "<field in a real line>": "<its value>" }, "extract": { "session_id": "<path in a real line>" } } ]
}
```

- **Source:** `test/harness/stream/tables/claude-code@2.1.291.json:1-60` for the full shape; E1 adds the rule vocabulary. This shows the shape only.
- **Anti-pattern:** A hand-written line; a catch-all rule; a wildcard version or a `latest` table; `qualified: true` with no capture behind it; a `harness_specific` line claiming a fact.

## Design

None. This task has no UI surface.

## Agent Instructions

1. Write `MAP-CODEX-QUALIFIES` first, and capture its RED at `.tmp/sprint-02-verification/mapping-codex.red.log`. It reads committed bytes locally. Changed bytes, removed rules and other versions go in temp copies, never over the fixture.
2. Get the bytes from the `harness-eval-evidence-<run>-<attempt>-codex-pinned` artifact of a completed harness-eval run at a commit where GAW-3 and GAW-9 have landed. If no such run exists, dispatch one with `gh workflow run harness-eval --repo hackerpug-ai/pixel-perfect`.
3. Commit the status, verify, init and denied-write probe captures under `test/harness/fixtures/streams/codex@0.160.1/`, each with its capture record and source run id. Commit only files GAW-9's key scan exported.
4. Write the table from those bytes: every `match` and `extract` comes from a real line, and its qualification is computed, never stored.
5. Case 2 needs a real capture a normal dispatch may not produce: an item of type `error` beside a completed turn. Look for it in the run's captures first. If none holds it, induce one with the real CLI at exactly 0.160.1 (`tests/sprint-02/real-cli.mjs` installs it under a temp prefix and temp HOME), record its source, and keep it out of the table's qualification citations. If no real run yields the shape, stop and report it. Never hand-write one.

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

- **AC-1:** `node --test --test-name-pattern 'MAP-CODEX-QUALIFIES' tests/sprint-02/mapping-codex.test.mjs`. Expected: TAP `ok` after `table codex@0.160.1: qualified`, `capture-citation-mismatch`, `required-fact-unmapped`, and `stream-mapping-absent`.

## Review Criteria

Must pass:

- Every cited capture's sha256 equals its committed bytes, and each capture record names its source run id.
- Every `match` and `extract` resolves on a real captured line, and no rule is a catch-all.
- The state is computed from cited captures, and a stored boolean decides nothing.
- AC-1 reads committed real bytes; a hand-written capture or an empty table fails review.
- A negative-case capture records its source, and no qualification citation points at it.
- A row's verdict beside an `error` item comes from its reply and files, never from exit 0.

Verdict: APPROVED or NEEDS_FIXES, with file and line for each finding.

## Dependencies

- **Depends on:** E1 (the rule vocabulary and capture-set qualification this table relies on), GAW-9 (AC-1 needs its exported captures; no locked flow replays it), GAW-3 (AC-1 needs its hosted captures at 0.160.1; no locked flow replays it)
- **Blocks:** none

## Notes

- **Flow use:** owns no locked flow. Gate steps 5, 6, 10, 11, 12, 13, 14, 15, 16, 24 replay it through the flows that list it in `available_after`, so it carries no integration obligation.

<!-- REQUIREMENT-CONTRACT v1 -->
<!--
{"version":"1","task_id":"E5","task_type":"FEATURE","tdd_mode":"red_first","verification_policy":{"requires_tests":true,"requires_red_evidence":true,"requires_seeded_evidence":true},"guardrails":{"write_allowed":["test/harness/stream/tables/codex@0.160.1.json (NEW)","test/harness/fixtures/streams/codex@0.160.1/ (NEW)","tests/sprint-02/mapping-codex.test.mjs (NEW)"],"write_prohibited":["tests/sprint-01/** - locked","test/harness/stream/*.mjs - E1 owns the normaliser and qualification; a table is data","test/harness/graders/** - E1 and E2 own grading","test/harness/adapters/** - GAW-3 owns the adapter",".github/workflows/** - GAW tasks own the workflow","plugins/pixel-perfect/** - the graded product"]},"fixtures":{"archived_captures":{"description":"Real stdout bytes from a hosted run at the exact pinned CLI version, committed with hashes and source run id","seed_method":"recorded_external","records":["test/harness/fixtures/streams/<harness>@<version>/<invocation-key>.stdout.bin","its capture record, whose stdout sha256 equals those bytes","a negative case's capture from an induced run: real CLI bytes at the exact pinned version, with its source recorded, and cited by no qualification"]}},"verification_gates":[],"integration_obligations":[],"requirements":[{"id":"AC-1","type":"acceptance_criterion","primary":true,"title":"The codex 0.160.1 table qualifies on real captures, and stops when its bytes or rules change","description":"GIVEN `archived_captures`, real codex stdout at exactly 0.160.1 from a hosted run, with hashes and the source run id, and real CLI bytes from an induced run for the negative case WHEN qualification is computed from them, then on temp copies with one changed byte, one removed rule and another declared version, and a real capture with an `error` item beside a completed turn is graded THEN state reads qualified with all 6 required facts or a declared not-applicable entry citing offsets, a changed byte reads capture-citation-mismatch, a removed rule reads required-fact-unmapped, another version reads stream-mapping-absent, and that item adds 0 fail blocks","flow_ref":null,"test_file":"tests/sprint-02/mapping-codex.test.mjs","test_function":"MAP-CODEX-QUALIFIES","verify":"node --test --test-name-pattern 'MAP-CODEX-QUALIFIES' tests/sprint-02/mapping-codex.test.mjs","positive_example":"Real captures of status, verify, init and the denied-write probe at 0.160.1: table state qualified, with each required fact citing an offset and a sha256. An `error` item beside a completed turn adds no fail block.","red":"On base test/harness/stream/tables holds no codex@0.160.1.json, so loading it refuses `mapping-table-absent` and this test fails.","test_tier":"integration","verification_service":"real codex 0.160.1 stdout bytes captured on a hosted run, through the real normaliser and validator","unit_test_justified":null,"surface_policy":null,"scenario":{"id":"SC-MAP-codex-1","use_case_ref":"UC-GRD-02","ac_ref":"AC-2","primary":false,"tier":"visible","test_tier":"integration","verification_service":"real codex 0.160.1 stdout bytes captured on a hosted run, through the real normaliser and validator","topology":"single-node","negative_control":{"would_fail_if":["the table is empty or holds a catch-all rule","the capture is hand-written instead of captured from the real CLI","qualified is a stored boolean with no capture behind it"]},"evidence":{"forms":["stdout","file_artifact"],"examples":["`table codex@0.160.1: qualified`"],"required_capture":true},"build_proof":{"range":"anything that proves the codex table at exactly 0.160.1 maps every required fact to spans of real captured bytes, and that it stops qualifying when those bytes or rules change","examples":["test/harness/stream/tables/codex@0.160.1.json citing archived captures"]},"cases":[{"start_ref":"archived_captures","action":{"actor":"cli_user","steps":["load codex@0.160.1 and compute its qualification from its archived captures","change one byte of one archived capture in a temp copy and recompute","remove the rule for one required fact in a temp copy and recompute","normalise the archived capture against a temp table declaring another version"]},"end_state":{"must_observe":["table state `qualified` with all `6` required facts or a declared not-applicable entry, each citing an offset and a sha256","one byte changed: state `unqualified`, reason `capture-citation-mismatch`","rule removed: reason `required-fact-unmapped` naming that fact","other version: reason `stream-mapping-absent`"],"must_not_observe":["a `harness_specific` event claiming a fact","an empty offsets list on a fact the table declares observed","state `qualified` after the byte change"]}},{"start_ref":"archived_captures","action":{"actor":"cli_user","steps":["grade the archived real capture holding an item of type `error` beside a completed turn"]},"end_state":{"must_observe":["the `error` item alone adds `0` fail blocks; the row's verdict comes from its reply and files"],"must_not_observe":["verdict `fail` caused only by that item","verdict `pass` from exit code `0`"]}}]},"maps_to_ac":null},{"id":"TC-1","type":"test_criterion","description":"Table codex@0.160.1 reads state qualified when computed from its archived captures","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'MAP-CODEX-QUALIFIES' tests/sprint-02/mapping-codex.test.mjs","positive_example":"Real captures of status, verify, init and the denied-write probe at 0.160.1: table state qualified, with each required fact citing an offset and a sha256. An `error` item beside a completed turn adds no fail block."},{"id":"TC-2","type":"test_criterion","description":"One changed capture byte reads state unqualified with reason capture-citation-mismatch","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'MAP-CODEX-QUALIFIES' tests/sprint-02/mapping-codex.test.mjs","positive_example":"Real captures of status, verify, init and the denied-write probe at 0.160.1: table state qualified, with each required fact citing an offset and a sha256. An `error` item beside a completed turn adds no fail block."},{"id":"TC-3","type":"test_criterion","description":"A removed rule reads reason required-fact-unmapped naming that fact","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'MAP-CODEX-QUALIFIES' tests/sprint-02/mapping-codex.test.mjs","positive_example":"Real captures of status, verify, init and the denied-write probe at 0.160.1: table state qualified, with each required fact citing an offset and a sha256. An `error` item beside a completed turn adds no fail block."},{"id":"TC-4","type":"test_criterion","description":"A temp table declaring another version reads reason stream-mapping-absent","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'MAP-CODEX-QUALIFIES' tests/sprint-02/mapping-codex.test.mjs","positive_example":"Real captures of status, verify, init and the denied-write probe at 0.160.1: table state qualified, with each required fact citing an offset and a sha256. An `error` item beside a completed turn adds no fail block."},{"id":"TC-5","type":"test_criterion","description":"An `error` item beside a completed turn adds 0 fail blocks","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'MAP-CODEX-QUALIFIES' tests/sprint-02/mapping-codex.test.mjs","positive_example":"Real captures of status, verify, init and the denied-write probe at 0.160.1: table state qualified, with each required fact citing an offset and a sha256. An `error` item beside a completed turn adds no fail block."}]}
-->
