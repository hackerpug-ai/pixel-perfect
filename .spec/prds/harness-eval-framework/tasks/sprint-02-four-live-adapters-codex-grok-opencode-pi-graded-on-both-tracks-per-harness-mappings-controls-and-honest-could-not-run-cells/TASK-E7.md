# TASK-E7: Map and qualify the OpenCode stream at its pinned version

> Task ID: E7
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

- **Human testing gate steps:** exercised at 5, 6, 10, 11, 12, 13, 14, 15, 16, 21, 24.
- **PRD references:** `04-uc-grd.md UC-GRD-02 AC-2`; `09-technical-requirements/02-system-components.md opencode-adapter`, under `.spec/prds/harness-eval-framework/`. Capability: CAP-EVAL-01.
- **Why it matters:** Without this table every OpenCode pinned row reads stream-mapping-absent, and the PRD leaves the reply field unknown until real bytes name it.
- **Current:** No OpenCode table exists, so `loadTable` refuses with mapping-table-absent.
- **Desired:** The table names the reply field from real captures at exactly 1.18.34.
- **Boundary:** captured bytes to table state: opencode@1.18.34 qualifies only on real bytes at exactly that version, and any change to those bytes or rules stops it qualifying.

## Critical Constraints

- MUST commit only real CLI bytes, never hand-written ones: sprint 01's hand-written denial fixture hid a real parser bug. Qualification cites hosted captures only. A negative case may use real CLI bytes from an induced run at the exact pinned version, with its source recorded
- NEVER commit a capture holding a key value
- NEVER add a catch-all rule, a wildcard version or a `latest` table

## Specification

- **Objective:** The OpenCode table at its pinned version qualifies on real hosted captures, and the reply field is named from those bytes instead of assumed.
- **Success state:** Table opencode@1.18.34 computes to state qualified from real captures at exactly that version, its `reply_path` resolves in an archived line, and a no-key error capture reads could-not-run model-never-answered.

- GAW-5 sends arguments through the message, and one hosted capture decides: `web-desktop` must appear in the expanded prompt or a tool call's arguments. This table expects status and verify captures. If that capture proves the channel fails, status and verify read GAW-5's named refusal, the table qualifies on the init and probe captures, and any required fact those cannot show reads stream-mapping-unqualified as a finding. A real keyless line from 1.18.34 on this machine is `{"type":"error","timestamp":...,"sessionID":"ses_...","error":{...}}`, so the session id path is sessionID. Local opencode 2.2.2 has no `--command` flag; npm's opencode-ai newest is still 1.19.5, which has it. If the npm line reaches 2.x, re-proof fails and the row reads stream-mapping-unqualified. The other-version case runs on the pinned track; a newest leg goes through E9.

## Acceptance Criteria (GIVEN-WHEN-THEN)

### AC-1: The opencode 1.18.34 table qualifies on real captures, and stops when its bytes or rules change [PRIMARY]

- **GIVEN:** `archived_captures`, real opencode stdout at exactly 1.18.34 from a hosted run, with hashes and the source run id, and real CLI bytes from an induced run for the negative case
- **WHEN:** qualification is computed from them, then on temp copies with one changed byte, one removed rule and another declared version, and the reply is read through the table's named field from a real capture, then a no-key error capture is graded
- **THEN:** state reads qualified with all 6 required facts citing offsets, a changed byte reads capture-citation-mismatch, a removed rule reads required-fact-unmapped, another version reads stream-mapping-absent, `reply_path` resolves to a non-empty string, and the error capture reads could-not-run model-never-answered

```text
FLOW_REF:              null
TEST_FILE:             tests/sprint-02/mapping-opencode.test.mjs
TEST_FUNCTION:         MAP-OPENCODE-QUALIFIES
TEST_TIER:             integration
VERIFICATION_SERVICE:  real opencode 1.18.34 stdout bytes captured on a hosted run, through the real normaliser and validator
SURFACE_POLICY:        null
```

SCENARIO_SUMMARY: One real capture set read four ways, plus the named reply field on a real line and a real no-key error capture.

## Test Criteria

| TC | Statement | Maps to |
|----|-----------|---------|
| TC-1 | Table opencode@1.18.34 reads state qualified when computed from its archived captures | AC-1 |
| TC-2 | One changed capture byte reads state unqualified with reason capture-citation-mismatch | AC-1 |
| TC-3 | A removed rule reads reason required-fact-unmapped naming that fact | AC-1 |
| TC-4 | A temp table declaring another version reads reason stream-mapping-absent | AC-1 |
| TC-5 | The table's `reply_path` resolves to a non-empty string in an archived line | AC-1 |
| TC-6 | A no-key error capture reads `could-not-run` `model-never-answered` | AC-1 |

## Reading List

1. `.spec/prds/harness-eval-framework/09-technical-requirements/02-system-components.md` lines 105: opencode-adapter: reply field unknown, args channel, permission stance
2. `test/harness/stream/tables/claude-code@2.1.291.json` lines 1-60: the table shape and provenance block to follow
3. `INSTALL.md` lines 119-156: the real-copy install the captures come from

Coding standards: `AGENTS.md`, `brain/docs/TDD-METHODOLOGY.md`, `brain/docs/kanban/SCENARIO-CONTRACT-V1.md`.

## Guardrails

WRITE-ALLOWED:

- test/harness/stream/tables/opencode@1.18.34.json (NEW)
- test/harness/fixtures/streams/opencode@1.18.34/ (NEW)
- tests/sprint-02/mapping-opencode.test.mjs (NEW)

WRITE-PROHIBITED:

- tests/sprint-01/** - locked
- test/harness/stream/*.mjs - E1 owns the normaliser and qualification; a table is data
- test/harness/graders/** - E1 and E2 own grading
- test/harness/adapters/** - GAW-5 owns the adapter
- .github/workflows/** - GAW tasks own the workflow
- plugins/pixel-perfect/** - the graded product
- Any file not listed in WRITE-ALLOWED

## Code Pattern

```json
{
  "schema": "stream-mapping/v1",
  "harness": "opencode",
  "cli_version": "1.18.34",
  "provenance": { "captures": [ { "capture_id": "<id>", "stdout_path": "<committed .stdout.bin>", "stdout_sha256": "<of those bytes>", "facts_proven": ["<fact id>"] } ] },
  "rules": [ { "rule_id": "<any name>", "canonical_type": "session_started", "fact_id": "native-session-identity", "match": { "<field in a real line>": "<its value>" }, "extract": { "session_id": "<path in a real line>" } } ]
}
```

- **Source:** `test/harness/stream/tables/claude-code@2.1.291.json:1-60` for the full shape; E1 adds the rule vocabulary. This shows the shape only.
- **Anti-pattern:** A hand-written line; a catch-all rule; a wildcard version or a `latest` table; `qualified: true` with no capture behind it; a `harness_specific` line claiming a fact; a reply field guessed with no capture.

## Design

None. This task has no UI surface.

## Agent Instructions

1. Write `MAP-OPENCODE-QUALIFIES` first, and capture its RED at `.tmp/sprint-02-verification/mapping-opencode.red.log`. It reads committed bytes locally. Changed bytes, removed rules and other versions go in temp copies, never over the fixture.
2. Get the bytes from the `harness-eval-evidence-<run>-<attempt>-opencode-pinned` artifact of a completed harness-eval run at a commit where GAW-5 and GAW-9 have landed. If no such run exists, dispatch one with `gh workflow run harness-eval --repo hackerpug-ai/pixel-perfect`.
3. Commit the status, verify, init and denied-write probe captures under `test/harness/fixtures/streams/opencode@1.18.34/`, each with its capture record and source run id. Commit only files GAW-9's key scan exported.
4. Write the table from those bytes: every `match` and `extract` comes from a real line, and its qualification is computed, never stored.
5. Case 2 needs a real capture from a run with no key, whose only line is `{"type":"error", ...}`. A normal dispatch has a key, so it may not produce one. Induce it with the real CLI at exactly 1.18.34 and no key (`tests/sprint-02/real-cli.mjs` installs it under a temp prefix and temp HOME), record its source, and keep it out of the table's qualification citations. If no real run yields the shape, stop and report it. Never hand-write one.

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

- **AC-1:** `node --test --test-name-pattern 'MAP-OPENCODE-QUALIFIES' tests/sprint-02/mapping-opencode.test.mjs`. Expected: TAP `ok` after `table opencode@1.18.34: qualified`, `capture-citation-mismatch`, `required-fact-unmapped`, and `stream-mapping-absent`.

## Review Criteria

Must pass:

- Every cited capture's sha256 equals its committed bytes, and each capture record names its source run id.
- Every `match` and `extract` resolves on a real captured line, and no rule is a catch-all.
- The state is computed from cited captures, and a stored boolean decides nothing.
- AC-1 reads committed real bytes; a hand-written capture or an empty table fails review.
- A negative-case capture records its source, and no qualification citation points at it.
- `reply_path` is named from a real line, and a bare `Button` match in an existing design file never counts as detection.

Verdict: APPROVED or NEEDS_FIXES, with file and line for each finding.

## Dependencies

- **Depends on:** E1 (the rule vocabulary and capture-set qualification this table relies on), GAW-9 (AC-1 needs its exported captures; no locked flow replays it), GAW-5 (AC-1 needs its hosted captures at 1.18.34; no locked flow replays it), GAW-10 (the plugin fix a headless OpenCode session needs before its captures can exist)
- **Blocks:** none

## Notes

- **Flow use:** owns no locked flow. Gate steps 5, 6, 10, 11, 12, 13, 14, 15, 16, 21, 24 replay it through the flows that list it in `available_after`, so it carries no integration obligation.

<!-- REQUIREMENT-CONTRACT v1 -->
<!--
{"version":"1","task_id":"E7","task_type":"FEATURE","tdd_mode":"red_first","verification_policy":{"requires_tests":true,"requires_red_evidence":true,"requires_seeded_evidence":true},"guardrails":{"write_allowed":["test/harness/stream/tables/opencode@1.18.34.json (NEW)","test/harness/fixtures/streams/opencode@1.18.34/ (NEW)","tests/sprint-02/mapping-opencode.test.mjs (NEW)"],"write_prohibited":["tests/sprint-01/** - locked","test/harness/stream/*.mjs - E1 owns the normaliser and qualification; a table is data","test/harness/graders/** - E1 and E2 own grading","test/harness/adapters/** - GAW-5 owns the adapter",".github/workflows/** - GAW tasks own the workflow","plugins/pixel-perfect/** - the graded product"]},"fixtures":{"archived_captures":{"description":"Real stdout bytes from a hosted run at the exact pinned CLI version, committed with hashes and source run id","seed_method":"recorded_external","records":["test/harness/fixtures/streams/<harness>@<version>/<invocation-key>.stdout.bin","its capture record, whose stdout sha256 equals those bytes","a negative case's capture from an induced run: real CLI bytes at the exact pinned version, with its source recorded, and cited by no qualification"]}},"verification_gates":[],"integration_obligations":[],"requirements":[{"id":"AC-1","type":"acceptance_criterion","primary":true,"title":"The opencode 1.18.34 table qualifies on real captures, and stops when its bytes or rules change","description":"GIVEN `archived_captures`, real opencode stdout at exactly 1.18.34 from a hosted run, with hashes and the source run id, and real CLI bytes from an induced run for the negative case WHEN qualification is computed from them, then on temp copies with one changed byte, one removed rule and another declared version, and the reply is read through the table's named field from a real capture, then a no-key error capture is graded THEN state reads qualified with all 6 required facts citing offsets, a changed byte reads capture-citation-mismatch, a removed rule reads required-fact-unmapped, another version reads stream-mapping-absent, `reply_path` resolves to a non-empty string, and the error capture reads could-not-run model-never-answered","flow_ref":null,"test_file":"tests/sprint-02/mapping-opencode.test.mjs","test_function":"MAP-OPENCODE-QUALIFIES","verify":"node --test --test-name-pattern 'MAP-OPENCODE-QUALIFIES' tests/sprint-02/mapping-opencode.test.mjs","positive_example":"Real captures of status, verify, init and the denied-write probe at 1.18.34: table state qualified, with each required fact citing an offset and a sha256. The table's reply_path resolves to the reply text in a real line.","red":"On base test/harness/stream/tables holds no opencode@1.18.34.json, so loading it refuses `mapping-table-absent` and this test fails.","test_tier":"integration","verification_service":"real opencode 1.18.34 stdout bytes captured on a hosted run, through the real normaliser and validator","unit_test_justified":null,"surface_policy":null,"scenario":{"id":"SC-MAP-opencode-1","use_case_ref":"UC-GRD-02","ac_ref":"AC-2","primary":false,"tier":"visible","test_tier":"integration","verification_service":"real opencode 1.18.34 stdout bytes captured on a hosted run, through the real normaliser and validator","topology":"single-node","negative_control":{"would_fail_if":["the table is empty or holds a catch-all rule","the capture is hand-written instead of captured from the real CLI","qualified is a stored boolean with no capture behind it"]},"evidence":{"forms":["stdout","file_artifact"],"examples":["`table opencode@1.18.34: qualified`"],"required_capture":true},"build_proof":{"range":"anything that proves the opencode table at exactly 1.18.34 maps every required fact to spans of real captured bytes, and that it stops qualifying when those bytes or rules change","examples":["test/harness/stream/tables/opencode@1.18.34.json citing archived captures"]},"cases":[{"start_ref":"archived_captures","action":{"actor":"cli_user","steps":["load opencode@1.18.34 and compute its qualification from its archived captures","change one byte of one archived capture in a temp copy and recompute","remove the rule for one required fact in a temp copy and recompute","normalise the archived capture against a temp table declaring another version"]},"end_state":{"must_observe":["table state `qualified` with all `6` required facts, each citing an offset and a sha256","one byte changed: state `unqualified`, reason `capture-citation-mismatch`","rule removed: reason `required-fact-unmapped` naming that fact","other version: reason `stream-mapping-absent`"],"must_not_observe":["a `harness_specific` event claiming a fact","an empty offsets list on a fact the table declares observed","state `qualified` after the byte change"]}},{"start_ref":"archived_captures","action":{"actor":"cli_user","steps":["read the reply from the archived real capture through the table's named field","grade a real capture whose only line is `{\"type\":\"error\", ...}` from a run with no key"]},"end_state":{"must_observe":["the table's `reply_path` resolves to a non-empty string in `1` or more archived lines","the error capture reads `could-not-run` `model-never-answered`"],"must_not_observe":["a reply field guessed with no capture","verdict `pass` from exit code `0`","a bare `Button` match in an existing design file counted as detection"]}}]},"maps_to_ac":null},{"id":"TC-1","type":"test_criterion","description":"Table opencode@1.18.34 reads state qualified when computed from its archived captures","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'MAP-OPENCODE-QUALIFIES' tests/sprint-02/mapping-opencode.test.mjs","positive_example":"Real captures of status, verify, init and the denied-write probe at 1.18.34: table state qualified, with each required fact citing an offset and a sha256. The table's reply_path resolves to the reply text in a real line."},{"id":"TC-2","type":"test_criterion","description":"One changed capture byte reads state unqualified with reason capture-citation-mismatch","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'MAP-OPENCODE-QUALIFIES' tests/sprint-02/mapping-opencode.test.mjs","positive_example":"Real captures of status, verify, init and the denied-write probe at 1.18.34: table state qualified, with each required fact citing an offset and a sha256. The table's reply_path resolves to the reply text in a real line."},{"id":"TC-3","type":"test_criterion","description":"A removed rule reads reason required-fact-unmapped naming that fact","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'MAP-OPENCODE-QUALIFIES' tests/sprint-02/mapping-opencode.test.mjs","positive_example":"Real captures of status, verify, init and the denied-write probe at 1.18.34: table state qualified, with each required fact citing an offset and a sha256. The table's reply_path resolves to the reply text in a real line."},{"id":"TC-4","type":"test_criterion","description":"A temp table declaring another version reads reason stream-mapping-absent","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'MAP-OPENCODE-QUALIFIES' tests/sprint-02/mapping-opencode.test.mjs","positive_example":"Real captures of status, verify, init and the denied-write probe at 1.18.34: table state qualified, with each required fact citing an offset and a sha256. The table's reply_path resolves to the reply text in a real line."},{"id":"TC-5","type":"test_criterion","description":"The table's `reply_path` resolves to a non-empty string in an archived line","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'MAP-OPENCODE-QUALIFIES' tests/sprint-02/mapping-opencode.test.mjs","positive_example":"Real captures of status, verify, init and the denied-write probe at 1.18.34: table state qualified, with each required fact citing an offset and a sha256. The table's reply_path resolves to the reply text in a real line."},{"id":"TC-6","type":"test_criterion","description":"A no-key error capture reads `could-not-run` `model-never-answered`","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'MAP-OPENCODE-QUALIFIES' tests/sprint-02/mapping-opencode.test.mjs","positive_example":"Real captures of status, verify, init and the denied-write probe at 1.18.34: table state qualified, with each required fact citing an offset and a sha256. The table's reply_path resolves to the reply text in a real line."}]}
-->
