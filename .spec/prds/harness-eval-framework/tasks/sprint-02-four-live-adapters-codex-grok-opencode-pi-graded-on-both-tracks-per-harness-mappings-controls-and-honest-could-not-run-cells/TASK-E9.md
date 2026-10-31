# TASK-E9: Grade a newest cell with the pinned table only when that run's own captures re-prove every required fact

> Task ID: E9
> Sprint: [SPRINT.md](./SPRINT.md)
> Status: Backlog
> Assignee: evals-implementer
> Priority: P1
> Points: 3
> Type: FEATURE
> Planner: evals-planner
> Reviewer: evals-reviewer
> Proposed By: evals-planner
> Wave: C
> TDD_MODE: red_first · RED_GREEN_REQUIRED: true

AGENT: planner=evals-planner | implementer=evals-implementer | reviewer=evals-reviewer

## Background

- **Human testing gate steps:** exercised at 12, 13.
- **PRD references:** `04-uc-grd.md UC-GRD-02 AC-2`; `ROADMAP.md Open Owner Decisions D-05`, under `.spec/prds/harness-eval-framework/`. Capability: CAP-EVAL-01.
- **Why it matters:** The newest CLI changes without notice, so no committed table can sit at its version. Without this path every newest row reads absent, and with a naive fallback a renamed event reads as a clean pass (ROADMAP D-05).
- **Current:** `loadTable` refuses any version with no exact table, so a newest capture can only read mapping-table-absent.
- **Desired:** A newest leg shows the pinned table good on its own bytes, or it says which facts it could not show.
- **Boundary:** newest leg's captures to mapping state: the pinned table grades a newest cell only on this leg's own proof, and any other outcome reads could-not-run by name.

## Critical Constraints

- MUST leave validateMapping's version refusal unchanged, because tests/sprint-01/grd-03 pins it: re-proof is a separate path, used only on a newest leg with no exact-version table
- MUST count a fact only from a capture this leg produced, at the leg's own observed CLI version, through a mapped event; a `harness_specific` line never counts
- MUST record the basis on the cell: table id, observed version, and each capture's sha256 with one offset per fact
- NEVER re-prove on the pinned track, from a committed fixture, or from another leg's captures, and NEVER declare a fact not applicable at run time: only a committed table may
- NEVER read an unproven newest row as a pass: state `unqualified` makes status, verify and the question check could-not-run `stream-mapping-unqualified`; command_list reads no stream and still grades

## Specification

- **Objective:** A newest cell with no exact-version table is graded through the pinned table only when that leg's own captures show every required fact through it, records that basis as state `reproved`, and otherwise reads could-not-run stream-mapping-unqualified naming the missing facts.
- **Success state:** A newest leg reads `reproved` with a basis citing its own capture's sha256 and one offset per fact, a renamed event reads `unqualified` naming the missing fact, and a pinned leg performs 0 re-proofs.

- Closed states of `.stream_mapping.state`: `qualified` (a table for this exact version, backed by committed captures), `reproved` (the pinned table, shown good on this version by this leg's own captures), `unqualified` (a table exists, and the captures did not show every required fact), `absent` (no usable table). A pinned table that does not itself qualify cannot re-prove anything.
- On such a leg runCell runs every invocation and GAW-1's runProbe first, then re-proves once, then grades each row with that mapping. The probe runs inside the keyed step on the newest track because a required-read-denial capture must come from this version. Cost: two more model calls per gated harness per dispatch. Pi has no gate and needs none.
- runCell passes the result to gradeInvocation through E1's optional mapping field; its four named fields stay as fusion fixed them.
- On a newest leg the question stop predicate comes from the pinned table, so a renamed question event gets no stop and reads stream-mapping-unqualified.

## Acceptance Criteria (GIVEN-WHEN-THEN)

### AC-1: A newest cell uses the pinned table only when its own captures re-prove every required fact [PRIMARY]

- **GIVEN:** `committed_real_capture` at CLI 2.1.314 and `committed_keyless_capture` at 2.1.312, both real runs
- **WHEN:** re-proof runs on newest legs over those captures, a renamed `permission_denials` copy and a foreign-version capture, then on pinned, exact-table and no-table legs
- **THEN:** only the leg whose own capture shows every required fact reads reproved, others read unqualified naming the facts, the pinned leg performs 0 re-proofs, and no-table reads absent

```text
FLOW_REF:              null
TEST_FILE:             tests/sprint-02/reprove-newest.test.mjs
TEST_FUNCTION:         REPROVE-NEWEST-REAL-BYTES
TEST_TIER:             integration
VERIFICATION_SERVICE:  the real re-proof path and normaliser over committed real claude-code captures at two CLI versions
SURFACE_POLICY:        null
```

SCENARIO_SUMMARY: Five cases over two real captures: a real negative, a re-proof with its basis, a renamed event, a foreign version, and the three legs that take no re-proof.

## Test Criteria

| TC | Statement | Maps to |
|----|-----------|---------|
| TC-1 | The untouched 2.1.312 capture reads state unqualified naming required-read-denial on a 2.1.312 newest leg | AC-1 |
| TC-2 | The 2.1.314 capture reads state reproved with table claude-code@2.1.291 through the temp table | AC-1 |
| TC-3 | A renamed permission_denials key reads state unqualified naming required-read-denial | AC-1 |
| TC-4 | A capture at another CLI version contributes 0 facts | AC-1 |
| TC-5 | A pinned leg performs 0 re-proofs | AC-1 |
| TC-6 | A newest leg with no pinned table reads state absent with reason stream-mapping-absent | AC-1 |
| TC-7 | A temp pinned table with no capture at its own version resolves to state absent | AC-1 |

## Reading List

1. `test/harness/stream/validate-mapping.mjs` lines 51-99: the version refusal this path leaves alone
2. `tests/sprint-01/grd-03-evidence.test.mjs` lines 781-790: the locked version-bumped-capture control
3. `test/harness/stream/table.mjs` lines 1-14: the exact-version rule; re-proof is its one named exception
4. `test/harness/smoke/cell.mjs` lines 182-213: the invocation loop whose grading waits on a newest leg
5. `test/harness/stream/captures/claude-code-stream-probe.capture.json` lines 1-30: the real negative: no tool ran
6. `test/harness/smoke/fixtures/denied-write/claude-code-denied-write.capture.json` lines 1-30: the real run with tool calls and denials

Coding standards: `AGENTS.md`, `brain/docs/TDD-METHODOLOGY.md`, `brain/docs/kanban/SCENARIO-CONTRACT-V1.md`.

## Guardrails

WRITE-ALLOWED:

- test/harness/stream/reprove.mjs (NEW)
- test/harness/smoke/cell.mjs (MODIFY)
- tests/sprint-02/reprove-newest.test.mjs (NEW)

WRITE-PROHIBITED:

- tests/sprint-01/** - locked; grd-03 pins the version refusal
- test/harness/stream/validate-mapping.mjs - its version refusal stays; re-proof is a separate path
- test/harness/stream/table.mjs - the exact-version rule stays
- test/harness/stream/tables/** - only a committed table may declare a fact not applicable, and E4 to E8 own them
- test/harness/graders/grade-invocation.mjs - E1's optional mapping field is the whole seam
- test/harness/adapters/** - GAW-1 owns runProbe
- .github/workflows/** - GAW tasks own the workflow
- plugins/pixel-perfect/** - the graded product
- Any file not listed in WRITE-ALLOWED

## Code Pattern

```js
// test/harness/stream/reprove.mjs. This shows the shape only.
export function reprove({ harness, version, captures, pinnedTable }) {
  if (!pinnedTable) { // runCell resolves it: a pinned table that does not qualify resolves to null
    return { state: "absent", reason: "stream-mapping-absent", missing_facts: [] };
  }
  const own = captures.filter((capture) => observedVersion(capture) === version);
  const shown = factsThrough(pinnedTable, own); // mapped events only; harness_specific never counts
  const missing = requiredFacts(pinnedTable).filter((fact) => !shown.has(fact));
  if (missing.length > 0) {
    return { state: "unqualified", reason: "stream-mapping-unqualified", missing_facts: missing };
  }
  return { state: "reproved", table: pinnedTable, observed_version: version, basis: basisFrom(shown) };
}
```

- **Source:** `test/harness/stream/validate-mapping.mjs:51-99`, `test/harness/stream/table.mjs:1-14`, `test/harness/smoke/cell.mjs:182-213`
- **Anti-pattern:** Loosening `validateMapping` or `loadTable` for a newest version; counting a `harness_specific` line as a fact; re-proving from a committed fixture or another leg; declaring a fact not applicable at run time.

## Design

None. This task has no UI surface.

## Agent Instructions

1. Work the one AC as one RED, GREEN, REFACTOR cycle. It reads committed real captures locally and needs no dispatch. Planted renames go in scratch copies, and temp tables live in a temp dir.
2. The temp table's not-applicable declaration exists only in the test, so the real re-proof logic runs against a real capture. The first case keeps the real table and the untouched capture, as the real negative.
3. Check the pinned table's own qualification where runCell resolves it, so a table that does not qualify resolves to null and reads `absent`. `reprove()` takes its table as given, because the real claude table qualifies only after E4 lands and E9 has no edge on E4.
4. Capture the RED at `.tmp/sprint-02-verification/reprove-newest.red.log`.

## Orchestrator Verification Protocol

1. VERIFY_RED: each task-local VERIFY exits non-zero on the base commit.
2. VERIFY_GREEN: AC-1's command exits 0 on the landed task.
3. Regression: `node --test tests/sprint-01/grd-03-evidence.test.mjs`; `node --test tests/sprint-01/t13-smoke-observations.test.mjs`; `node --test tests/sprint-01/t15-hosted-controls.test.mjs` each exit 0.
4. `git diff --name-only` lists only WRITE-ALLOWED paths.
5. Dispatch `evals-reviewer` with this file, the RED and GREEN outputs, and the evidence.

## Agent Assignment

- **Planner role:** `evals-planner`
- **Implementer role:** `evals-implementer`
- **Reviewer role:** `evals-reviewer`
- **Rationale:** `evals-implementer` owns the re-proof against real captures; `evals-reviewer` audits that an unproven newest row cannot read pass.

## Evidence Gates

- **AC-1:** `node --test --test-name-pattern 'REPROVE-NEWEST-REAL-BYTES' tests/sprint-02/reprove-newest.test.mjs`. Expected: TAP `ok` after `unqualified` naming `required-read-denial`, `reproved claude-code@2.1.291` with a basis, and `0` re-proofs on the pinned leg.

## Review Criteria

Must pass:

- `validateMapping`'s version refusal is unchanged, and `tests/sprint-01/grd-03-evidence.test.mjs:781-790` stays green.
- A fact counts only from a capture this leg produced, at its own observed version, through a mapped event.
- The cell records its basis: table id, observed version, and each capture's sha256 with one offset per fact.
- State `unqualified` makes status, verify and the question check read could-not-run, and command_list still grades.
- A stubbed re-proof or an empty capture set cannot read `reproved`.
- A pinned table that does not qualify resolves to `absent` where runCell resolves it, and `reprove()` holds no such check.

Verdict: APPROVED or NEEDS_FIXES, with file and line for each finding.

## Dependencies

- **Depends on:** E1 (gradeInvocation and the capture-set coverage this reuses), GAW-1 (runProbe, which this runs on a newest leg before grading)
- **Blocks:** none

## Notes

- **Sizing:** split from E1 rather than growing it to 10. The seam is which table grades a cell: E1 grades through a given table, and E9 decides the table on a newest leg.
- **Owner decision:** ROADMAP D-05. Gate steps 12 and 13 replay this behavior; it owns no locked flow, so it carries no integration obligation.

<!-- REQUIREMENT-CONTRACT v1 -->
<!--
{"version":"1","task_id":"E9","task_type":"FEATURE","tdd_mode":"red_first","verification_policy":{"requires_tests":true,"requires_red_evidence":true,"requires_seeded_evidence":true},"guardrails":{"write_allowed":["test/harness/stream/reprove.mjs (NEW)","test/harness/smoke/cell.mjs (MODIFY)","tests/sprint-02/reprove-newest.test.mjs (NEW)"],"write_prohibited":["tests/sprint-01/** - locked; grd-03 pins the version refusal","test/harness/stream/validate-mapping.mjs - its version refusal stays; re-proof is a separate path","test/harness/stream/table.mjs - the exact-version rule stays","test/harness/stream/tables/** - only a committed table may declare a fact not applicable, and E4 to E8 own them","test/harness/graders/grade-invocation.mjs - E1's optional mapping field is the whole seam","test/harness/adapters/** - GAW-1 owns runProbe",".github/workflows/** - GAW tasks own the workflow","plugins/pixel-perfect/** - the graded product"]},"fixtures":{"committed_real_capture":{"description":"The real claude-code run committed by T15: CLI 2.1.314, process exit 0, one model request, a Bash denial and a Write denial, and no question","seed_method":"recorded_external","records":["test/harness/smoke/fixtures/denied-write/claude-code-denied-write.stdout.bin","test/harness/smoke/fixtures/denied-write/claude-code-denied-write.capture.json"]},"committed_keyless_capture":{"description":"The real keyless claude-code first turn committed by T6: CLI 2.1.312, zero model requests, no tool call and no denial","seed_method":"recorded_external","records":["test/harness/stream/captures/claude-code-stream-probe.stdout.bin","test/harness/stream/captures/claude-code-stream-probe.capture.json"]}},"verification_gates":[],"integration_obligations":[],"requirements":[{"id":"AC-1","type":"acceptance_criterion","primary":true,"title":"A newest cell uses the pinned table only when its own captures re-prove every required fact","description":"GIVEN `committed_real_capture` at CLI 2.1.314 and `committed_keyless_capture` at 2.1.312, both real runs WHEN re-proof runs on newest legs over those captures, a renamed `permission_denials` copy and a foreign-version capture, then on pinned, exact-table and no-table legs THEN only the leg whose own capture shows every required fact reads reproved, others read unqualified naming the facts, the pinned leg performs 0 re-proofs, and no-table reads absent","flow_ref":null,"test_file":"tests/sprint-02/reprove-newest.test.mjs","test_function":"REPROVE-NEWEST-REAL-BYTES","verify":"node --test --test-name-pattern 'REPROVE-NEWEST-REAL-BYTES' tests/sprint-02/reprove-newest.test.mjs","positive_example":"The committed 2.1.314 capture through a temp copy of the pinned table with its question facts declared not applicable reads state reproved, table claude-code@2.1.291, with a basis citing that capture's sha256 and an offset per fact.","red":"On base test/harness/stream/reprove.mjs does not exist, and loadTable refuses any version with no exact table, so a newest capture can only read mapping-table-absent and this test fails.","test_tier":"integration","verification_service":"the real re-proof path and normaliser over committed real claude-code captures at two CLI versions","unit_test_justified":null,"surface_policy":null,"scenario":{"id":"SC-REPROVE-1","use_case_ref":"UC-GRD-02","ac_ref":"AC-2","primary":false,"tier":"visible","test_tier":"integration","verification_service":"the real re-proof path and normaliser over committed real claude-code captures at two CLI versions","topology":"single-node","negative_control":{"would_fail_if":["a stubbed re-proof returns `reproved` without reading the run's captures","a fact is counted from a capture at another CLI version","an empty capture set reads `reproved`"]},"evidence":{"forms":["stdout","file_artifact"],"examples":["`reproved claude-code@2.1.291`","`unqualified` naming `required-read-denial`"],"required_capture":true},"build_proof":{"range":"anything that proves the pinned table grades a newest cell only when that same run's captures show every required fact through it, that the cell records the basis, and that a renamed event reads stream-mapping-unqualified","examples":["a re-proof step that runs after a newest leg's invocations and probe, before any row is graded"]},"cases":[{"start_ref":"committed_keyless_capture","action":{"actor":"cli_user","steps":["run re-proof on a newest leg at 2.1.312, with this untouched capture as the whole set, against the real claude-code@2.1.291 table"]},"end_state":{"must_observe":["state `unqualified`, reason `stream-mapping-unqualified`, missing_facts naming `question-tool-start`, `expensive-tool-start` and `required-read-denial`"],"must_not_observe":["state `reproved`","an empty missing_facts list","verdict `pass` on a status row"]}},{"start_ref":"committed_real_capture","action":{"actor":"cli_user","steps":["run re-proof on a newest leg at 2.1.314 through a temp copy of the pinned table that declares its question facts not applicable"]},"end_state":{"must_observe":["state `reproved`, table `claude-code@2.1.291`, observed version `2.1.314`, `0` missing facts, and a basis citing the capture's stdout sha256 and one offset per fact","a status row graded with that mapping reads no `stream-mapping-` reason"],"must_not_observe":["state `qualified`","a basis with no offsets"]}},{"start_ref":"committed_real_capture","action":{"actor":"cli_user","steps":["in a scratch copy, rename the `permission_denials` key the way a CLI release might, and run re-proof again through that temp table"]},"end_state":{"must_observe":["state `unqualified`, reason `stream-mapping-unqualified`, missing_facts naming `required-read-denial`"],"must_not_observe":["state `reproved`","an empty missing_facts list"]}},{"start_ref":"committed_keyless_capture","action":{"actor":"cli_user","steps":["add this 2.1.312 capture to a 2.1.314 leg's set, with the 2.1.314 capture removed"]},"end_state":{"must_observe":["the foreign capture contributes `0` facts, and the state reads `unqualified`"],"must_not_observe":["state `reproved`","a fact citing a capture at another version","no state on the row"]}},{"start_ref":"committed_real_capture","action":{"actor":"cli_user","steps":["run the same path on a pinned leg, on a newest leg whose exact version has a table, and on a newest leg with no pinned table"]},"end_state":{"must_observe":["the pinned leg performs `0` re-proofs, the exact-version leg reads `qualified`, and the third reads `absent` with reason `stream-mapping-absent`"],"must_not_observe":["state `reproved` on the pinned leg","no state on any of the three"]}}]},"maps_to_ac":null},{"id":"TC-1","type":"test_criterion","description":"The untouched 2.1.312 capture reads state unqualified naming required-read-denial on a 2.1.312 newest leg","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'REPROVE-NEWEST-REAL-BYTES' tests/sprint-02/reprove-newest.test.mjs","positive_example":"The committed 2.1.314 capture through a temp copy of the pinned table with its question facts declared not applicable reads state reproved, table claude-code@2.1.291, with a basis citing that capture's sha256 and an offset per fact."},{"id":"TC-2","type":"test_criterion","description":"The 2.1.314 capture reads state reproved with table claude-code@2.1.291 through the temp table","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'REPROVE-NEWEST-REAL-BYTES' tests/sprint-02/reprove-newest.test.mjs","positive_example":"The committed 2.1.314 capture through a temp copy of the pinned table with its question facts declared not applicable reads state reproved, table claude-code@2.1.291, with a basis citing that capture's sha256 and an offset per fact."},{"id":"TC-3","type":"test_criterion","description":"A renamed permission_denials key reads state unqualified naming required-read-denial","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'REPROVE-NEWEST-REAL-BYTES' tests/sprint-02/reprove-newest.test.mjs","positive_example":"The committed 2.1.314 capture through a temp copy of the pinned table with its question facts declared not applicable reads state reproved, table claude-code@2.1.291, with a basis citing that capture's sha256 and an offset per fact."},{"id":"TC-4","type":"test_criterion","description":"A capture at another CLI version contributes 0 facts","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'REPROVE-NEWEST-REAL-BYTES' tests/sprint-02/reprove-newest.test.mjs","positive_example":"The committed 2.1.314 capture through a temp copy of the pinned table with its question facts declared not applicable reads state reproved, table claude-code@2.1.291, with a basis citing that capture's sha256 and an offset per fact."},{"id":"TC-5","type":"test_criterion","description":"A pinned leg performs 0 re-proofs","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'REPROVE-NEWEST-REAL-BYTES' tests/sprint-02/reprove-newest.test.mjs","positive_example":"The committed 2.1.314 capture through a temp copy of the pinned table with its question facts declared not applicable reads state reproved, table claude-code@2.1.291, with a basis citing that capture's sha256 and an offset per fact."},{"id":"TC-6","type":"test_criterion","description":"A newest leg with no pinned table reads state absent with reason stream-mapping-absent","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'REPROVE-NEWEST-REAL-BYTES' tests/sprint-02/reprove-newest.test.mjs","positive_example":"The committed 2.1.314 capture through a temp copy of the pinned table with its question facts declared not applicable reads state reproved, table claude-code@2.1.291, with a basis citing that capture's sha256 and an offset per fact."},{"id":"TC-7","type":"test_criterion","description":"A temp pinned table with no capture at its own version resolves to state absent","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'REPROVE-NEWEST-REAL-BYTES' tests/sprint-02/reprove-newest.test.mjs","positive_example":"The committed 2.1.314 capture through a temp copy of the pinned table with its question facts declared not applicable reads state reproved, table claude-code@2.1.291, with a basis citing that capture's sha256 and an offset per fact."}]}
-->
