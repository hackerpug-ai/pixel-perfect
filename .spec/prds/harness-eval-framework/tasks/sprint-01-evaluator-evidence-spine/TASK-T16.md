# TASK-T16 — Declare the graded surface to the invocation, so status and verify grade what the product really produced

> Task ID: T16
> Sprint: [SPRINT.md](./SPRINT.md)
> Status: Backlog
> Assignee: ai-tooling-implementer
> Priority: P0
> Points: 5
> Type: BUG
> Planner: evals-planner
> Reviewer: evals-reviewer
> Wave: 3
> Depends On: T5, T7, T13, T15
> TDD_MODE: red_first · RED_GREEN_REQUIRED: true

AGENT: planner=evals-planner | implementer=ai-tooling-implementer | reviewer=evals-reviewer

**Depends on:** T5 (`gradeCheck`, `promptFor`, `readVerifyReport`, `bindReport` and the five-entry `INVOCATIONS` table this task composes onto), T7 (`prepareRunDirs` and `bindReportPath`, which mint each invocation's `invocation_id` and bind its case-declared report path), T13 (`runCell`'s replay path, the recorder-facing cell record and the `gradeCheck` call it makes per entry), T15 (the `DENIED_WRITE_PROBE` declaration idiom this task mirrors, and the `control_observations`/`control_pairs` channels whose four-grade locks this task must not disturb).
**Blocks:** human-testing-gate step 6 (both claude-code cells carry four graded checks), step 10 (four `files-and-event-stream` checks on the pinned cell), T12's review of the graded output.

## Background

- **Source:** the owner's recorded authorization for this amendment, `.kb-run-sprint/sprint-01-evaluator-evidence-spine/decisions/amendment-T16.decision.json` (questions 1, 3 and 5 answered `true`), and the dispatched run it cites.
- **What the hosted run proves:** run **41157270388** (head `93530a0`) published a 12-cell result artifact (`.kb-run-sprint/sprint-01-evaluator-evidence-spine/T11/evidence/reviewer-cycle-6-r0/hosted-run-41157270388-result.json`) in which both claude-code cells read `could-not-run`. On the **pinned** cell `command_list` passes and the other three checks do not: `status` reads `fail status-facts-absent` with `missing: ["phase", "gates.atoms", "gates.molecules", "gates.screens", "inventory.atoms", "inventory.molecules", "inventory.screens"]`, `verify` reads `fail report-missing` twice (planted and clean), and `question_before_expensive_work` reads `could-not-run required-fact-unobserved`. Four sprint integration obligations cannot be discharged while both cells read `could-not-run`.
- **Defect (a) — `status` grades a surface the invocation was never asked for.** `test/harness/adapters/claude-code.mjs:147-149` (`promptFor`) renders exactly `/pixel-perfect:status --platform web-desktop`: the slash command plus the case's `platform_arg`, nothing else. `statusFacts` (`:972`) then compares the reply against the case's `expected_facts` (`test/harness/cases/status-a.json`), which the invocation never receives. **The parser is not the defect:** `tests/sprint-01/grd-02-four-grades.test.mjs:711-722` seeds the product's own documented output block (`plugins/pixel-perfect/workflows/status.md`, "Sample Output") to the case numbers and gets `missing: []`, and the seeded kit (`test/harness/kit/project/design/manifest.json`) carries exactly the declared phase, gates and 3/1/1 inventory. The parser reads the documented surface; the invocation is never told that surface is what gets graded, so the reply it returns is graded against a requirement nobody stated.
- **Defect (b) — `verify` reads a report nothing writes, under an id nothing passes.** `prepareRunDirs` (`:226-232`) mints `invocation_id` and binds `bound_path` from the case manifest; `readVerifyReport` (`:1103-1137`) then requires that file to exist and `bindReport` (`:1140`) requires its `invocation_id` to equal the entry's. The prompt is only `/pixel-perfect:verify --platform web-desktop`, so the invocation is told neither the path nor the id. Both halves are missing, and a report written anyway without the id would still be refused as `report-mismatched-invocation`.
- **Gate steps:** 6 and 10 (and step 4 through the cell shape). **Capability:** CAP-EVAL-01. **PRD:** `09-technical-requirements/04-uc-grd.md` UC-GRD-02, UC-GRD-03, UC-GRD-04, UC-GRD-05; `02-system-components.md` § grade recorder; `10-e2e-testing.md`.
- **Current (consumed):** T5's `promptFor`, `gradedArgv`, `invocationTable`, `statusFacts`, `gradeCheck`, `readVerifyReport`, `bindReport`; T7's `prepareRunDirs`/`bindReportPath` invocation identity; T13's `runCell` replay and `gradeCheck` call site; T15's declaration-constant idiom (`DENIED_WRITE_PROBE`).
- **Desired (provided):** each graded invocation is handed, in its own prompt, the exact surface its check grades — field names and output shape for status, report path, invocation id and body contract for verify — and **no declared value**, so the reply and the report can only be right if the product really read the manifest and really ran the catalog check.

## Critical Constraints

- MUST declare the status surface **derived from the case manifest** (`expected_facts` keys: platform, phase, `gates.<layer>`, `inventory.<layer>`), never from a case id, a layer list or a number typed into the adapter, so a new case needs no adapter edit.
- MUST render the status surface as **field names, the workflow's own layer vocabulary and icon legend, and placeholder shapes** — never a value. The rendered text MUST NOT contain `approved`, `pending`, or any `<built>/<total>` pair.
- MUST declare the verify surface from `caseManifest.report_relative_path`, the entry's `invocation_id` and `caseManifest.case_id`, plus the report body's key set and the vocabulary rule (`defect-detected` iff `verify-catalog.mjs --check --json` reports a drifted key, otherwise `clean`). It MUST NOT contain the case's `defect_key`, any 64-hex digest, or any byte offset.
- MUST make the case-declared report path *writable* before asking for it. `gradedArgv` pins `--permission-mode dontAsk`, and that stance denies Write at the tool level; `isRequiredPath` then declares a cwd-relative write **required**, so an invocation that obeys the prompt is recorded as `fail denied_tool_call` rather than producing a report. The owner extended this task to `test/harness/runtime/stance.mjs` for exactly that: a **path-scoped allow-list** admitting writes to the case-declared report path (and nothing else — every other denial, Bash included, must still be denied and still grade as it does today).
- MUST keep the allow-list path-scoped: a write outside it stays denied, and the existing `denied_tool_call` grading for a required denial is unchanged. The list is derived from the case manifest, never from a literal in the stance.

- MUST leave the verify report's writer as the invocation. The adapter MUST NOT call `writeVerifyReport` (or any other writer) to produce the graded report; the file the grader reads must be the file the invocation wrote.
- MUST NOT change `statusFacts`, `readVerifyReport`'s pass rule, or `bindReport`. The T5 body shape (a report with no capture evidence) still passes, because `tests/sprint-01/grd-02-four-grades.test.mjs:849-854` is a locked, write-prohibited test — a "strengthened" reader would break it and is not this task's trade.
- MUST NOT add a fallback for a missing report (no glob, no "newest file in reports/", no `could-not-run` in place of `report-missing`). The only allowed change on the verify side is that a real report now exists.
- MUST keep `CHECKS` at four ids (`command_list`, `status`, `verify`, `question_before_expensive_work`), `INVOCATIONS` at five entries, and `cellFor`'s aggregation unchanged, so all twelve cells keep the shape they have.
- MUST keep the prompt's first token the product's own slash command, so each graded invocation still exercises `/pixel-perfect:<command>`; the declaration is appended, never substituted.
- MUST NOT change `first-question-init`'s prompt (its check is the question boundary; extra instructions could change whether, and how often, it asks) — the declaration applies to `kind: "status"` and `kind: "verify"` cases only.
- MUST NOT edit `plugins/pixel-perfect/**`, `test/harness/graders/**`, `test/harness/smoke/**`, or `.github/workflows/harness-eval.yml`. The parser already accepts the documented surface, the report path is already bound inside `prepareRunDirs`, and the invocation id is already minted there: none of those files needs to change, and leaving them prohibited keeps the check from being loosened or re-anchored.

## Specification

### Seam 1 — the status surface is declared to the status invocation (defect a)

`test/harness/adapters/claude-code.mjs` gains one declaration and one renderer, beside `DENIED_WRITE_PROBE`'s idiom:

- `STATUS_SURFACE` — a frozen declaration of what a status reply must state: the reply states `Phase: <layer>`; it prints the `Phases:` list with the product's own icons `[x] [~] [ ] [!]` and layer names `SCAFFOLD PLAN ATOMS MOLECULES COMPOSE`; it prints one per-layer header per declared inventory key in the shape `<Layer> (<built>/<total> built, <verified> verified):`; every layer a `gates.<layer>` key names is stated in that list. `{ applies_to: "status", fields: [...], icons: {...}, layers: [...], header_shape: "...", vocabulary: "the product's, from workflows/status.md" }`.
- `statusSurfacePrompt({ caseManifest })` — renders the declared field names it derives from `caseManifest.expected_facts` (`platform`, `phase`, `gates.<layer>` for each declared gate key, `inventory.<layer>` for each declared inventory key) into one instruction, quoting `STATUS_SURFACE.header_shape` and the icon legend. Every count is a placeholder. Returns `""` when the case declares no `expected_facts`, so a case that declares nothing is never told to state something.
- `promptFor({ command_name, caseManifest })` composes `[/pixel-perfect:<command>, ...caseArgs, statusSurfacePrompt({ caseManifest })].join(" ")` — the slash command and its declared arguments first, the surface appended, filtered so an empty surface contributes no dangling space. `kind: "status"` is the only kind it applies to.

### Seam 2 — the verify report is declared to the verify invocation (defect b)

Same module:

- `VERIFY_REPORT_CONTRACT` — the declared body contract, `{ schema: "verify-report/v1", fields: ["schema", "harness", "track", "invocation_id", "case_id", "observed_verify_outcome", "observed_defect_key", "expected_defect_key", "evidence.drifted_keys", "clean_project_failed"], outcome_rule: "defect-detected iff verify-catalog.mjs --check --json reports at least one drifted key; clean otherwise" }`.
- `verifyReportPrompt({ caseManifest, invocationId })` — renders: write a JSON file at `<caseManifest.report_relative_path>` (relative to the invocation's working directory) after running the product's own verify; echo `invocation_id` exactly as given; set `case_id` to `caseManifest.case_id`; set `harness`/`track` from the entry; fill `observed_verify_outcome` by `VERIFY_REPORT_CONTRACT.outcome_rule`; fill `observed_defect_key` and `expected_defect_key` from the key the catalog check actually reported drifted; put the drifted keys in `evidence.drifted_keys`; for the control case set `clean_project_failed` to whether the check reported any failure. Returns `""` when the case has no `report_relative_path` or is not `kind: "verify"`.
- `promptFor` appends it for `kind: "verify"`, so the two verify entries (planted and clean) receive **different** invocation ids in their prompts and the same declared path relative to their own directories.

### What does not change

| Surface | Change |
|---|---|
| `CHECKS`, `INVOCATIONS`, `gradedArgv`, `invocationTable`'s entry shape | none — five entries, four check ids, same argv flags |
| `statusFacts`, `readVerifyReport`, `bindReport`, `caseArgs` | none |
| `prepareRunDirs` / `bindReportPath` (the path and id the prompt now echoes) | none |
| `test/harness/graders/**`, `test/harness/smoke/**`, `.github/workflows/harness-eval.yml`, `plugins/pixel-perfect/**` | none |

## Acceptance Criteria (GIVEN-WHEN-THEN)

### AC-1: The status check grades a reply the invocation was asked to produce, and records `pass` (PRIMARY)

- **GIVEN:** `seed/status-reply-capture` — the archived `capture.json` + `.stdout.bin` of one real guarded claude-code `status` invocation run from the fixed prompt
- **WHEN:** the archived bytes are replayed through the real capture reader, the real stream mapper and the real `gradeCheck` with the `status-a` entry
- **THEN:** the graded cell's `status` check reads `verdict: "pass"` with `reason: null`, `statusFacts(reply, expected_facts).missing` is `[]`, and the reply states `Phase: atoms`, the `[x] ATOMS` line and the three per-layer headers — while the dispatched run 41157270388 cell this replaces read `fail status-facts-absent` with seven missing facts

```text
TEST_TIER:             integration
VERIFICATION_SERVICE:  local: one recorded real claude-code status invocation replayed through createCapture + mapCapturedLine + gradeCheck, node --test (no dispatch)
SURFACE_POLICY:        .spec/e2e-policy/sprint-01/artifact-only-read.json
TDD_STATE:             red_first
VERIFY:                node --test tests/sprint-01/t16-claude-code-grades.test.mjs --test-name-pattern t16-status-grades-real-reply
EXPECT:                exit 0 · TAP `ok` for t16-status-grades-real-reply · fail 0
```

- **RED input (fails on base):** `promptFor` renders `/pixel-perfect:status --platform web-desktop` and nothing else, so the reply the run captured carries no `Phases:` block and the cell reads `missing: ["phase", "gates.atoms", "gates.molecules", "gates.screens", "inventory.atoms", "inventory.molecules", "inventory.screens"]` (run 41157270388).
- **RED proof:** `.tmp/sprint-01-verification/t16-claude-code-grades.red.log`
- **positive_example (passes after landing):** the replayed cell reads `{ check_id: "status", verdict: "pass", reason: null }` and `statusFacts(...).missing` is `[]`.
- **Hosted receipt (the sprint gate, not this test's proof):** on a dispatched `harness-eval` run, `jq -r '.cells[] | select(.harness=="claude-code" and .track=="pinned") | .checks[] | .check_id + " " + .verdict'` prints four lines, `status` among them with `pass`.

SCENARIO_SUMMARY: complete SCENARIO lives once, in this AC's row of the REQUIREMENT-CONTRACT block below.

### AC-2: The verify check finds the report the invocation wrote, bound to the id the adapter passed

- **GIVEN:** `seed/verify-report-written` — the two report bodies one real claude-code `verify` invocation pair wrote at their case-declared paths, archived beside the captures that produced them
- **WHEN:** each body is placed at the path `bindReportPath` binds for its case in a fresh directory and graded through the real `readVerifyReport`
- **THEN:** the planted body reads `ok: true` with `observed_verify_outcome: "defect-detected"`, the clean twin reads `ok: true` with `clean_project_failed: false`, and neither cell reads `report-missing`; the same planted bytes re-id'd to the clean side read `fail report-mismatched-invocation`

```text
TEST_TIER:             integration
VERIFICATION_SERVICE:  local: archived real report bodies at the case-declared path graded through the real readVerifyReport, node --test (no dispatch)
SURFACE_POLICY:        .spec/e2e-policy/sprint-01/artifact-only-read.json
TDD_STATE:             red_first
VERIFY:                node --test tests/sprint-01/t16-claude-code-grades.test.mjs --test-name-pattern t16-verify-grades-written-report
EXPECT:                exit 0 · TAP `ok` for t16-verify-grades-written-report · fail 0
```

- **RED input (fails on base):** no prompt names the report path or the invocation id, so no invocation writes the file and both verify blocks read `fail report-missing` at `/tmp/pp-claude-code-pinned-verify-button-drift-*/reports/verify-button-drift.json` (run 41157270388).
- **RED proof:** `.tmp/sprint-01-verification/t16-claude-code-grades.red.log`
- **positive_example (passes after landing):** planted `{ ok: true, observed_verify_outcome: "defect-detected" }`, clean `{ ok: true, observed_verify_outcome: "clean" }`, borrowed id → `{ ok: false, verdict: "fail", reason: "report-mismatched-invocation", expected: <planted id>, seen: <clean id> }`.

SCENARIO_SUMMARY: complete SCENARIO lives once, in this AC's row of the REQUIREMENT-CONTRACT block below.

### AC-3: The twelve cells and the four checks per claude-code cell are intact, and no other cell regresses

- **GIVEN:** `seed/dispatched-run-41157270388` — the recorded 12-cell result artifact of the run this task repairs, and the live module in its working tree
- **WHEN:** `invocationTable()`/`CHECKS` are read from the changed module and the five locked GRD flow files plus `run-02-hand` run beside the owned file
- **THEN:** `CHECKS` still holds exactly the four ids, `invocationTable()` still holds five entries with four distinct check ids, the recorded artifact still parses as twelve unique `(harness, track)` cells with the ten non-claude cells keeping their named reasons (`missing-api-key`, `codex-adapter-not-implemented`, `grok-adapter-not-implemented`, `opencode-adapter-not-implemented`, `pi-adapter-not-implemented`), and every locked flow test reports `fail 0`

```text
TEST_TIER:             integration
VERIFICATION_SERVICE:  local: the changed module's table + the recorded 12-cell artifact + the five locked GRD flows + run-02-hand, node --test (no dispatch)
SURFACE_POLICY:        .spec/e2e-policy/sprint-01/artifact-only-read.json
TDD_STATE:             red_first
VERIFY:                node --test tests/sprint-01/t16-claude-code-grades.test.mjs --test-name-pattern t16-cell-shape-intact
EXPECT:                exit 0 · TAP `ok` for t16-cell-shape-intact · fail 0
```

- **RED input (fails on base):** the shape assertions already pass on base — the RED half of this AC is the regression command it wraps, which must stay green while the two prompts change; the owned test's own first assertion (the two declared surfaces exist) fails on base, so the file is red before the fix and green after.
- **RED proof:** `.tmp/sprint-01-verification/t16-claude-code-grades.red.log`
- **positive_example (passes after landing):** `CHECKS.length === 4`, `invocationTable().length === 5`, `new Set(table.map(e => e.check_id)).size === 4`, the recorded artifact yields 12 cells with 5 distinct named reasons outside claude-code, and the six-file regression reports `pass 76, fail 0`.

SCENARIO_SUMMARY: complete SCENARIO lives once, in this AC's row of the REQUIREMENT-CONTRACT block below.

## Test Criteria

### TC-1: The status invocation is asked for exactly the surface it is graded on, and for no value

- **Verify:** `node --test tests/sprint-01/t16-claude-code-grades.test.mjs --test-name-pattern t16-status-surface-declared`
- **Expected:** exit 0, `pass 1`, `fail 0`; `promptFor({ command_name: "status", caseManifest: loadCase("status-a") })` starts with `/pixel-perfect:status --platform web-desktop`; the rendered text names `platform`, `phase`, `gates.atoms`, `gates.molecules`, `gates.screens`, `inventory.atoms`, `inventory.molecules`, `inventory.screens`; it does not match `/approved|pending/` or `/\b\d+\s*\/\s*\d+\b/`; `statusSurfacePrompt({ caseManifest: loadCase("first-question-init") })` is `""`.
- **Locked scenarios:** `SC-T16-TC1`.

### TC-2: The verify invocation is told the path and the id it must echo, and no expected value

- **Verify:** `node --test tests/sprint-01/t16-claude-code-grades.test.mjs --test-name-pattern t16-verify-report-declared`
- **Expected:** exit 0, `pass 1`, `fail 0`; the rendered prompt for the `verify-button-drift` entry contains `reports/verify-button-drift.json`, that entry's own `invocation_id`, `verify-button-drift`, and every field name in `VERIFY_REPORT_CONTRACT.fields`; it does not contain `atoms/Button/default`, any `/[0-9a-f]{64}/`, or an `offset` value; the clean entry's prompt contains `reports/verify-clean.json` and a **different** invocation id.
- **Locked scenarios:** `SC-T16-TC2`.

### TC-3: The status check still has teeth — a reply that drops the gates fails

- **Verify:** `node --test tests/sprint-01/t16-claude-code-grades.test.mjs --test-name-pattern t16-status-check-has-teeth`
- **Expected:** exit 0, `pass 1`, `fail 0`; the archived reply with its `Phases:` block and per-layer headers removed grades `fail status-facts-absent` with `missing` containing `gates.atoms` and `inventory.atoms`; a reply that states `approved` for a layer the case declares `pending` grades `fail status-facts-absent` naming that one gate; the unchanged reply grades `pass`.
- **Locked scenarios:** `SC-T16-TC3`.

### TC-4: The report is the invocation's, not the harness's

- **Verify:** `node --test tests/sprint-01/t16-claude-code-grades.test.mjs --test-name-pattern t16-report-written-by-invocation`
- **Expected:** exit 0, `pass 1`, `fail 0`; the adapter module's source contains no call to `writeVerifyReport`, `writeFileSync` on a `reports/` path, or any writer invoked from `runCheck`/`gradeCheck`; the path in each rendered prompt is exactly `caseManifest.report_relative_path` for that entry (not a literal in the adapter); with the report file absent the grade is still `fail report-missing`.
- **Locked scenarios:** `SC-T16-TC4`.

## Locked scenarios

The scenarios are carried once, as JSON, in the REQUIREMENT-CONTRACT block at the end of this file (T13/T15's shape). This table is the index; it is not a second copy.

| Scenario | Requirement | What it locks |
|---|---|---|
| `SC-T16-AC1` | AC-1 | a real reply, graded `pass`, from a surface the invocation was asked for |
| `SC-T16-AC2` | AC-2 | a report the invocation wrote at the declared path, bound to the id it echoed |
| `SC-T16-AC3` | AC-3 | twelve cells, four checks, ten untouched neighbours |
| `SC-T16-TC1` | TC-1 | the status surface is declared and carries no value |
| `SC-T16-TC2` | TC-2 | the verify surface is declared and carries no value |
| `SC-T16-TC3` | TC-3 | the status check still refuses a reply that drops the gates |
| `SC-T16-TC4` | TC-4 | the report's writer is the invocation, never the harness |

## Guardrails

WRITE-ALLOWED:

- test/harness/adapters/claude-code.mjs
- test/harness/smoke/fixtures/** (new recorded fixtures only; no leg module)
- tests/sprint-01/t16-claude-code-grades.test.mjs
- test/harness/runtime/stance.mjs (owner-extended: a path-scoped write allow-list, described below)

The owner's brief also conditionally granted `test/harness/graders/**`, `test/harness/smoke/**` and `.github/workflows/harness-eval.yml`. This plan needs none of them: the parser already passes the product's documented shape (`tests/sprint-01/grd-02-four-grades.test.mjs:711-722`), and the report path and invocation id are already minted inside `prepareRunDirs`. An implementer who believes one is needed **stops and escalates** rather than editing it; a plan that quietly widens the grading rule to make a cell green is the defect this task exists to end.

WRITE-PROHIBITED:

- plugins/pixel-perfect/**
- test/harness/graders/**
- test/harness/smoke/cell.mjs
- test/harness/smoke/model-step.mjs
- test/harness/smoke/observations.mjs
- test/harness/smoke/image-scan.mjs
- test/harness/runtime/**
- test/harness/recorder/**
- test/harness/cases/**
- .github/workflows/harness-eval.yml
- tests/sprint-01/grd-01-twelve-cells.test.mjs
- tests/sprint-01/grd-02-four-grades.test.mjs
- tests/sprint-01/grd-03-evidence.test.mjs
- tests/sprint-01/grd-04-named-path.test.mjs
- tests/sprint-01/grd-05-clean-twin.test.mjs
- tests/sprint-01/grd-06-missing-key.test.mjs
- tests/sprint-01/run-02-hand.test.mjs
- tests/sprint-01/t11-controls-wiring.test.mjs
- tests/sprint-01/t13-smoke-observations.test.mjs
- tests/sprint-01/t14-capture-requiredness.test.mjs
- tests/sprint-01/t15-hosted-controls.test.mjs
- Any file not listed in WRITE-ALLOWED

## Evidence Gates

- **AC-1:** `node --test tests/sprint-01/t16-claude-code-grades.test.mjs --test-name-pattern t16-status-grades-real-reply`. Expected: exit 0, TAP `ok`, `fail 0`.
- **AC-2:** `node --test tests/sprint-01/t16-claude-code-grades.test.mjs --test-name-pattern t16-verify-grades-written-report`. Expected: exit 0, TAP `ok`, `fail 0`.
- **AC-3:** `node --test tests/sprint-01/t16-claude-code-grades.test.mjs --test-name-pattern t16-cell-shape-intact`. Expected: exit 0, TAP `ok`, `fail 0`.
- **TC-1:** `node --test tests/sprint-01/t16-claude-code-grades.test.mjs --test-name-pattern t16-status-surface-declared`. Expected: exit 0, `pass 1`.
- **TC-2:** `node --test tests/sprint-01/t16-claude-code-grades.test.mjs --test-name-pattern t16-verify-report-declared`. Expected: exit 0, `pass 1`.
- **TC-3:** `node --test tests/sprint-01/t16-claude-code-grades.test.mjs --test-name-pattern t16-status-check-has-teeth`. Expected: exit 0, `pass 1`.
- **TC-4:** `node --test tests/sprint-01/t16-claude-code-grades.test.mjs --test-name-pattern t16-report-written-by-invocation`. Expected: exit 0, `pass 1`.
- **Owned test file:** `node --test tests/sprint-01/t16-claude-code-grades.test.mjs`. Expected: `pass 7`, `fail 0`.
- **regression (six locked files):** `node --test tests/sprint-01/grd-01-twelve-cells.test.mjs tests/sprint-01/grd-02-four-grades.test.mjs tests/sprint-01/grd-03-evidence.test.mjs tests/sprint-01/grd-04-named-path.test.mjs tests/sprint-01/grd-05-clean-twin.test.mjs tests/sprint-01/run-02-hand.test.mjs`. Expected: `pass 76`, `fail 0` (measured on base main at authoring time; a differing count must be recorded as a baseline, never explained away).
- **write-scope:** `git diff --name-only`. Expected: only WRITE-ALLOWED paths.
- **Hosted receipt (the sprint gate):** `jq -r '.cells[] | select(.harness=="claude-code" and .track=="pinned") | .checks[] | .check_id + " " + .verdict' /tmp/he1/harness-eval-result.json`. Expected: four lines, `command_list pass`, `status pass`, `verify pass`, `question_before_expensive_work pass`.

## Review Criteria

Must pass:

- The owned test reports `pass 7`, `fail 0`, and each test asserts its row's THEN rather than restating the implementation.
- The status surface is derived from `expected_facts` keys and carries no `approved`, `pending` or `<built>/<total>` pair; the verify surface carries no defect key, digest or offset.
- The report graded in AC-2 is bytes one real invocation wrote; the adapter contains no writer call, and the path comes from the case manifest on both sides.
- `statusFacts`, `readVerifyReport`, `bindReport`, `CHECKS`, `INVOCATIONS`, `gradedArgv` and `prepareRunDirs` are untouched, and the six-file regression is green.
- `git diff --name-only` lists only WRITE-ALLOWED paths, and the eleven locked test files are untouched.
- Assert (judgement, not grep): the fix makes the *product* produce the evidence, rather than making the grader accept less. A change that widens a reason vocabulary, drops a fact from `expected_facts`, or accepts a report without its invocation id is a NEEDS_FIXES regardless of colour.

Should verify: the `first-question-init` prompt is byte-identical to base; the two verify prompts differ only by their case's declared arguments, path, case id and invocation id; each rendered prompt's first token is still `/pixel-perfect:<command>`.

Verdict: APPROVED or NEEDS_FIXES, with file and line for each finding.

## Dependencies

- **Depends on:** T5, T7, T13, T15.

Why T5: the grade path it defines is the one that must start returning `pass`. Why T7: the invocation identity and the bound report path are what the prompt now echoes, and they must already be minted before an invocation can be told them. Why T13: the replay path (`runCell` → `gradeCheck`) is how the lane grades a recorded reply without a dispatch. Why T15: its declaration-constant idiom and its four-grade locks are the pattern and the boundary this task copies.

A shared file is not a dependency: T16 appends to `promptFor` and to the module T5 and T15 already edited, and the test suite is what proves it, not an edge.

## Out of Scope

- Any change to the grading rule, the four control ids, the result schema, the recorder, the smoke leg modules, or the workflow's job/step shape.
- The status check for `status-b`: it shares the same declared surface and is proven through `status-a`; a second recorded reply is not required here.
- The `question_before_expensive_work` check's `required-fact-unobserved` (a separate mechanism: the must-ask stream carries no question event; run 41157270388 records `no-question-asked` beside it). Reported, not fixed.
- Dispatching the workflow. The hosted receipt is the sprint gate; this task's tests assert the mechanism.
- Collecting the report into an artifact for a human to download (see the finding below).

## Notes

- **Two defects, one cause.** Both checks grade an expectation the invocation never received: `expected_facts` for status, `report_relative_path` plus `invocation_id` for verify. The fix is one seam per defect and the same rule — declare the surface, never the value.
- **Why the parser is not touched.** `tests/sprint-01/grd-02-four-grades.test.mjs:711-722` takes the product's own documented sample output, changes only the icons and the per-layer counts inside the headers the product prints, and gets `missing: []` against the `status-a` declaration. The parser reads the documented surface; loosening it would make the check pass on a reply the product never produces. `statusFacts`'s `COMPOSE → screens` mapping, its scope rule and its keyed-count rule are all right.
- **Why the fix cannot be "the harness writes the report".** `writeVerifyReport` exists (`test/harness/graders/report-writer.mjs:75`) and a lane could call it, but then the graded file would be the harness's own words about the plugin. The defect is that the *product* never produced a report; asking the invocation to write one at the path the case declares — and echoing the id the adapter minted — is the only fix that adds evidence instead of moving it. TC-4 asserts no writer call exists in the adapter.
- **The recording dependency, stated up front.** The two fixtures are `recorded_external`: a real guarded `claude -p` status invocation and a real verify pair, archived byte-for-byte. On a host holding the `harness-smoke` claude binding, the implementer records them with one run through `runCheck` and commits the capture and the two report bodies under `test/harness/smoke/fixtures/`. **If this host holds no binding, the implementer stops and asks the owner for one (or for a dispatch), and the task stays red.** A reply typed by a human or by the implementer does not satisfy AC-1 or AC-2, and no test in this task may construct one.
- **Finding (not fixed here) — the report never reaches an artifact.** `.github/workflows/harness-eval.yml:461` downloads `pattern: harness-eval-verify-*` and `:497` uploads `grade/verify-reports`, but no smoke step uploads a per-cell `harness-eval-verify-*` artifact, so `test/harness/recorder.mjs:155-172` writes an index whose `reason` reads "no verify report artifact arrived for this attempt". Sprint gate **step 8** (`gh run download -n harness-eval-verify-reports-$RUN_ID-1` then `jq .expected_defect_key`) therefore still fails even after this task makes the report exist, and the report itself dies with the smoke job's temporary directory. This is recorder/upload wiring, owned by gate step 8 and by T4/T7's hosted acceptance, not by the invocation contract T16 fixes; it needs its own amendment. T16 must not claim step 8.
- **Finding (not fixed here) — `question_before_expensive_work`.** Run 41157270388 records `no-question-asked` for the pinned cell's must-ask probe: the `init` invocation produced no question event at all. That is a third mechanism, outside this amendment's two located defects, and it also blocks gate step 6's four-`pass` line. The owner should expect a further amendment for it; T16's ACs deliberately do not depend on it.
- **Finding (observed, out of scope) — the newest-track cell.** The same run's `newest` cell reads `could-not-run installation-identity-mismatch` (requested `2.1.291`, observed `2.1.316`). That is the identity rule working as designed, not a grading defect; the version resolver is another task's surface.
- **Why this is not a stubbed test.** No verdict is typed anywhere. AC-1 replays bytes a real invocation emitted, through the real capture reader, the real mapper and the real `gradeCheck`; the only thing the test adds is the file path. AC-3's negative direction deletes real content from those same bytes and requires the real grader to fail with the exact missing facts, so a grader that passes everything cannot survive. AC-2 grades report bodies a real invocation wrote and then re-ids one of them to prove `bindReport` still refuses a borrowed body. TC-1/TC-2 assert the declaration carries the field names and *not* the values, so no test can be satisfied by handing the model the answer. TC-4 asserts the adapter holds no writer, so a harness-written report cannot be substituted for the product's. The hosted receipt is not simulated at all: it is a dispatched run whose pinned cell prints four graded checks.
- **Gate command form.** Evidence Gates use the repo's established `node --test <file> --test-name-pattern <name>` form; the owned-file gate states the full count (`pass 7`) so a silently unfiltered run is still visible.
- **Split check:** not triggered — 5 points, one module, two declarations, one lane file, and the second seam exists only because the first's rule (declare the surface, not the value) applies to a report as well as a reply.
- **Build order:** TC-1 `STATUS_SURFACE` + `statusSurfacePrompt`; TC-2 `VERIFY_REPORT_CONTRACT` + `verifyReportPrompt`; wire both into `promptFor`; record the two fixtures (or stop and escalate); AC-1/TC-3 the replayed status grades; AC-2/TC-4 the report grades and the no-writer assertion; AC-3 the shape and the six-file regression. Do not dispatch.
- **Owner:** `evals-planner`; sprint `sprint-01-evaluator-evidence-spine`.

<!-- REQUIREMENT-CONTRACT v1 -->
<!--
{
  "version": "1",
  "task_id": "T16",
  "task_type": "BUG",
  "tdd_mode": "red_first",
  "verification_policy": {
    "requires_tests": true,
    "requires_red_evidence": true,
    "requires_seeded_evidence": true
  },
  "guardrails": {
    "write_allowed": [
      "test/harness/adapters/claude-code.mjs",
      "test/harness/smoke/fixtures/**",
      "tests/sprint-01/t16-claude-code-grades.test.mjs",
      "test/harness/runtime/stance.mjs"
    ],
    "write_prohibited": [
      "plugins/pixel-perfect/**",
      "test/harness/graders/**",
      "test/harness/smoke/cell.mjs",
      "test/harness/smoke/model-step.mjs",
      "test/harness/smoke/observations.mjs",
      "test/harness/smoke/image-scan.mjs",
      "test/harness/runtime/guard.mjs",
      "test/harness/runtime/capture.mjs",
      "test/harness/runtime/grade-writer.mjs",
      "test/harness/recorder/**",
      "test/harness/cases/**",
      ".github/workflows/harness-eval.yml",
      "tests/sprint-01/grd-01-twelve-cells.test.mjs",
      "tests/sprint-01/grd-02-four-grades.test.mjs",
      "tests/sprint-01/grd-03-evidence.test.mjs",
      "tests/sprint-01/grd-04-named-path.test.mjs",
      "tests/sprint-01/grd-05-clean-twin.test.mjs",
      "tests/sprint-01/grd-06-missing-key.test.mjs",
      "tests/sprint-01/run-02-hand.test.mjs",
      "tests/sprint-01/t11-controls-wiring.test.mjs",
      "tests/sprint-01/t13-smoke-observations.test.mjs",
      "tests/sprint-01/t14-capture-requiredness.test.mjs",
      "tests/sprint-01/t15-hosted-controls.test.mjs",
      "Any file not listed in write_allowed"
    ]
  },
  "fixtures": {
    "seed/status-reply-capture": {
      "entrypoint": "test/harness/smoke/fixtures/status-reply/claude-code-status-a.capture.json plus its .stdout.bin, read through the runtime's capture record shape and replayed with createCapture + mapCapturedLine + gradeCheck",
      "description": "the archived bytes of one real guarded `claude -p /pixel-perfect:status --platform web-desktop` invocation run from the fixed prompt on the seeded kit project: exit 0, one result event, a reply that states `Phase: atoms`, the `[x] ATOMS` phase line and the three per-layer headers carrying 3 atoms, 1 molecule and 1 screen",
      "seed_method": "recorded_external"
    },
    "seed/status-reply-mutated": {
      "entrypoint": "the same .stdout.bin bytes with the `Phases:` block, the phase line and the per-layer headers deleted, and a second variant with the atoms gate flipped to `pending`, written to a fresh directory by the lane",
      "description": "one archived reply and two surgical edits of it, so the same real bytes prove both directions: the reply grades pass, and the reply without its gates grades fail status-facts-absent naming exactly the dropped facts",
      "seed_method": "migration_fixture"
    },
    "seed/verify-report-written": {
      "entrypoint": "test/harness/smoke/fixtures/verify-report/reports/verify-button-drift.json and reports/verify-clean.json, written by two real guarded `claude -p /pixel-perfect:verify --platform web-desktop` invocations, plus their capture.json and .stdout.bin",
      "description": "the two report bodies a real verify pair wrote at their case-declared paths: the planted body cites invocation_id, case_id verify-button-drift, observed_verify_outcome defect-detected, observed_defect_key and expected_defect_key atoms/Button/default and evidence.drifted_keys; the clean body cites the other invocation id, observed_verify_outcome clean and clean_project_failed false",
      "seed_method": "recorded_external"
    },
    "seed/verify-report-borrowed": {
      "entrypoint": "a byte copy of the planted report with its invocation_id replaced by the clean side's id, and its case_id left as verify-button-drift",
      "description": "the planted body carrying the clean invocation's id, so a reader that ignores the binding still grades a detection while the real bindReport refuses it as report-mismatched-invocation",
      "seed_method": "migration_fixture"
    },
    "seed/kit-cases": {
      "entrypoint": "test/harness/cases/{status-a,verify-button-drift,verify-clean,first-question-init}.json read through loadCase, plus the materialized test/harness/kit/project whose design/manifest.json declares phase atoms, gates atoms approved / molecules pending / screens pending and a 3/1/1 inventory",
      "description": "the four case manifests the adapter renders prompts for and the seeded kit project they point at, so a rendered surface can be compared with the declaration it must match and with the values it must not carry",
      "seed_method": "migration_fixture"
    },
    "seed/dispatched-run-41157270388": {
      "entrypoint": ".kb-run-sprint/sprint-01-evaluator-evidence-spine/T11/evidence/reviewer-cycle-6-r0/hosted-run-41157270388-result.json",
      "description": "the recorded 12-cell result artifact of the dispatched run this task repairs: the pinned claude-code cell reads command_list pass beside status fail status-facts-absent, verify fail report-missing twice and question_before_expensive_work could-not-run, the newest cell reads installation-identity-mismatch, and the ten non-claude cells keep their named refusals",
      "seed_method": "recorded_external"
    }
  },
  "verification_gates": [],
  "integration_obligations": [],
  "requirements": [
    {
      "id": "AC-1",
      "type": "acceptance_criterion",
      "primary": true,
      "flow_ref": null,
      "title": "The status check grades a reply the invocation was asked to produce, and records `pass`",
      "test_tier": "integration",
      "verify": "node --test tests/sprint-01/t16-claude-code-grades.test.mjs --test-name-pattern t16-status-grades-real-reply",
      "test_file": "tests/sprint-01/t16-claude-code-grades.test.mjs",
      "test_function": "t16-status-grades-real-reply",
      "positive_example": "the replayed cell reads `{ check_id: \"status\", verdict: \"pass\", reason: null }`, `statusFacts(reply, expected_facts).missing` is `[]`, and the reply states `Phase: atoms`, `[x] ATOMS` and the `atoms (3/3 built`, `molecules (1/1`, `screens (1/1` headers.",
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "scenario": {
        "id": "SC-T16-AC1",
        "tier": "e2e-automated",
        "test_tier": "e2e",
        "negative_control": {
          "would_fail_if": [
            "the status invocation is still sent only `/pixel-perfect:status --platform web-desktop`, so its reply never states the declared surface and the graded cell re-reads `fail status-facts-absent` with all seven facts missing exactly as run 41157270388 did",
            "the rendered surface is built from the case's values instead of its keys, so the prompt hands the model `approved` and `3/3` and a reply that never opened `design/manifest.json` passes",
            "the parser is loosened to accept a prose summary, so a reply carrying no phase line and no per-layer header still grades pass and the check is stubbed"
          ]
        },
        "evidence": {
          "forms": [
            "the archived capture.json and .stdout.bin of one real status invocation",
            "the graded cell record for `check_id: status`, with its verdict, reason and block_reasons missing list"
          ]
        },
        "topology_note": "one recorded invocation per case: the lane replays the archived stdout through createCapture, the real mapper and the real gradeCheck with the status-a entry, so the verdict is the adapter's own reading of bytes a model produced, not a value the test supplies",
        "cases": [
          {
            "start_ref": "seed/status-reply-capture",
            "action": {
              "actor": "runner",
              "steps": [
                "node --test tests/sprint-01/t16-claude-code-grades.test.mjs --test-name-pattern t16-status-grades-real-reply"
              ]
            },
            "end_state": {
              "must_observe": [
                "the graded cell reads `{ check_id: \"status\", verdict: \"pass\", reason: null }`",
                "`statusFacts(reply, expected_facts).missing` is `[]`",
                "the reply states `Phase: atoms` and the line `[x] ATOMS`",
                "the reply states the three headers `atoms (3/3 built`, `molecules (1/1` and `screens (1/1`",
                "the cell carries `1` status check and `4` check ids overall"
              ],
              "must_not_observe": [
                "`missing` containing `gates.atoms`",
                "`verdict` `could-not-run` on the status check",
                "`0` status checks in the cell"
              ]
            }
          },
          {
            "start_ref": "seed/status-reply-mutated",
            "action": {
              "actor": "runner",
              "steps": [
                "grade the same bytes with the `Phases:` block and the per-layer headers removed",
                "grade a second variant whose atoms gate reads `pending`"
              ]
            },
            "end_state": {
              "must_observe": [
                "the stripped reply grades `fail status-facts-absent`",
                "its `missing` list contains `gates.atoms` and `inventory.atoms`",
                "the flipped reply's `missing` list contains `gates.atoms` and nothing else",
                "the byte count of every observation is `> 0`"
              ],
              "must_not_observe": [
                "`verdict: \"pass\"` on the stripped reply",
                "a `missing` list that is empty for the stripped reply",
                "a `missing` list naming `gates.molecules` for the flipped reply"
              ]
            }
          }
        ]
      },
      "red_input": "on base main promptFor renders `/pixel-perfect:status --platform web-desktop` and nothing else, so the reply the run captured states no phase line, no gates and no inventory, and the pinned cell's status check reads `fail status-facts-absent` with seven missing facts (run 41157270388); the owned test fails its first replayed-grade assertion",
      "red_proof": ".tmp/sprint-01-verification/t16-claude-code-grades.red.log",
      "description": "GIVEN seed/status-reply-capture WHEN the archived bytes are replayed through the real capture reader, the real stream mapper and the real gradeCheck with the status-a entry THEN the status check grades pass, statusFacts(...).missing is [], and the reply states Phase: atoms, the [x] ATOMS line and the three per-layer headers",
      "maps_to_ac": null
    },
    {
      "id": "AC-2",
      "type": "acceptance_criterion",
      "primary": true,
      "flow_ref": null,
      "title": "The verify check finds the report the invocation wrote, bound to the id the adapter passed",
      "test_tier": "integration",
      "verify": "node --test tests/sprint-01/t16-claude-code-grades.test.mjs --test-name-pattern t16-verify-grades-written-report",
      "test_file": "tests/sprint-01/t16-claude-code-grades.test.mjs",
      "test_function": "t16-verify-grades-written-report",
      "positive_example": "planted `{ ok: true, observed_verify_outcome: \"defect-detected\" }`, clean `{ ok: true, observed_verify_outcome: \"clean\", clean_project_failed: false }`, borrowed id `{ ok: false, verdict: \"fail\", reason: \"report-mismatched-invocation\", expected: <planted id>, seen: <clean id> }`.",
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "scenario": {
        "id": "SC-T16-AC2",
        "tier": "e2e-automated",
        "test_tier": "e2e",
        "negative_control": {
          "would_fail_if": [
            "the prompt still names neither the report path nor the invocation id, so the report is absent, no invocation ever writes one, and both verify blocks re-read `fail report-missing` as run 41157270388 did",
            "the harness writes the report itself, so the graded file is the harness's claim about the plugin rather than the plugin's own output",
            "the binding is relaxed so a report carrying another invocation's id is accepted, and a borrowed body grades as a detection"
          ]
        },
        "evidence": {
          "forms": [
            "the two archived report bodies at the case-declared paths",
            "the readVerifyReport result for each body: ok, verdict, reason, observed_verify_outcome, expected and seen"
          ]
        },
        "topology_note": "each body is placed at the path `bindReportPath` binds for its own case in a fresh directory, so the path the grader reads is the path the case declared and the id it compares is the id the entry carries",
        "cases": [
          {
            "start_ref": "seed/verify-report-written",
            "action": {
              "actor": "runner",
              "steps": [
                "node --test tests/sprint-01/t16-claude-code-grades.test.mjs --test-name-pattern t16-verify-grades-written-report"
              ]
            },
            "end_state": {
              "must_observe": [
                "the planted body reads `ok: true` with `observed_verify_outcome: \"defect-detected\"`",
                "the clean body reads `ok: true` with `observed_verify_outcome: \"clean\"`",
                "the planted body's `clean_project_failed` is `false` on the clean side and absent on the planted side",
                "the graded planted cell's verify check reads `verdict: \"pass\"`"
              ],
              "must_not_observe": [
                "`reason: \"report-missing\"` on either body",
                "`reason: \"report-mismatched-invocation\"` on a correctly bound body",
                "no file at `reports/verify-button-drift.json` and none at `reports/verify-clean.json`"
              ]
            }
          },
          {
            "start_ref": "seed/verify-report-borrowed",
            "action": {
              "actor": "runner",
              "steps": [
                "grade the borrowed body against the planted entry, whose bound path and invocation id are the planted side's"
              ]
            },
            "end_state": {
              "must_observe": [
                "the grade reads `ok: false` with `verdict: \"fail\"` and `reason: \"report-mismatched-invocation\"`",
                "`expected` is the planted invocation id and `seen` is the clean invocation id",
                "`1` binding comparison is reported"
              ],
              "must_not_observe": [
                "`verdict: \"pass\"` on a borrowed body",
                "`ok: true` with `0` binding comparisons",
                "a missing-file reason in place of the binding refusal"
              ]
            }
          }
        ]
      },
      "red_input": "on base main no prompt names the report path or the invocation id, so no invocation writes a report and both verify blocks read `fail report-missing` (run 41157270388); a report written without the id would still be refused as `report-mismatched-invocation`",
      "red_proof": ".tmp/sprint-01-verification/t16-claude-code-grades.red.log",
      "description": "GIVEN seed/verify-report-written WHEN each body is placed at the path bindReportPath binds for its case in a fresh directory and graded through the real readVerifyReport THEN the planted body reads ok true with observed_verify_outcome defect-detected, the clean twin reads ok true with clean_project_failed false, neither reads report-missing, and the planted bytes re-id'd to the clean side read fail report-mismatched-invocation",
      "maps_to_ac": null
    },
    {
      "id": "AC-3",
      "type": "acceptance_criterion",
      "primary": true,
      "flow_ref": null,
      "title": "The twelve cells and the four checks per claude-code cell are intact, and no other cell regresses",
      "test_tier": "integration",
      "verify": "node --test tests/sprint-01/t16-claude-code-grades.test.mjs --test-name-pattern t16-cell-shape-intact",
      "test_file": "tests/sprint-01/t16-claude-code-grades.test.mjs",
      "test_function": "t16-cell-shape-intact",
      "positive_example": "`CHECKS.length === 4`, `invocationTable().length === 5`, the recorded artifact yields 12 unique (harness, track) cells with 5 distinct non-claude reasons, and the six-file regression reports `pass 76` / `fail 0`.",
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "scenario": {
        "id": "SC-T16-AC3",
        "tier": "e2e-automated",
        "test_tier": "e2e",
        "negative_control": {
          "would_fail_if": [
            "a sixth invocation row is added to widen a check, so a claude-code cell carries five checks and the four-grade locks fail",
            "a harness row outside claude-code is stubbed to a pass so the run looks greener, so the ten named refusals disappear from the artifact",
            "the twelve-cell shape is asserted from a hardcoded list instead of the recorded artifact, so an empty run still satisfies it"
          ]
        },
        "evidence": {
          "forms": [
            "the changed module's CHECKS and invocationTable() output",
            "the recorded 12-cell artifact's harness, track and reason triples",
            "the six locked test files' TAP summary"
          ]
        },
        "topology_note": "the shape is read from the live module and the neighbours from the recorded artifact of the same pinned head, so a shape change and a neighbour regression are both observable without a dispatch",
        "cases": [
          {
            "start_ref": "seed/dispatched-run-41157270388",
            "action": {
              "actor": "runner",
              "steps": [
                "node --test tests/sprint-01/t16-claude-code-grades.test.mjs --test-name-pattern t16-cell-shape-intact",
                "node --test tests/sprint-01/grd-01-twelve-cells.test.mjs tests/sprint-01/grd-02-four-grades.test.mjs tests/sprint-01/grd-03-evidence.test.mjs tests/sprint-01/grd-04-named-path.test.mjs tests/sprint-01/grd-05-clean-twin.test.mjs tests/sprint-01/run-02-hand.test.mjs"
              ]
            },
            "end_state": {
              "must_observe": [
                "`CHECKS` equals `[\"command_list\", \"status\", \"verify\", \"question_before_expensive_work\"]`",
                "`invocationTable()` holds `5` entries with `4` distinct check ids",
                "the recorded artifact holds `12` unique (harness, track) cells",
                "the ten non-claude cells keep `5` distinct named reasons including `missing-api-key` and `codex-adapter-not-implemented`",
                "the six-file regression reports `pass 76` and `fail 0`"
              ],
              "must_not_observe": [
                "a `5`th check id on any claude-code cell",
                "`0` claude-code cells in the artifact",
                "an empty `reason` on any non-claude cell"
              ]
            }
          }
        ]
      },
      "red_input": "on base main the two declared surfaces do not exist, so the owned test's first assertion fails; the shape and regression assertions it wraps are green on base and must stay green",
      "red_proof": ".tmp/sprint-01-verification/t16-claude-code-grades.red.log",
      "description": "GIVEN seed/dispatched-run-41157270388 and the changed module WHEN CHECKS and invocationTable() are read and the six locked files run THEN four check ids and five entries are intact, the recorded artifact still parses as twelve unique cells with the ten non-claude reasons unchanged, and the regression reports fail 0",
      "maps_to_ac": null
    },
    {
      "id": "TC-1",
      "type": "test_criterion",
      "primary": false,
      "description": "The status surface is derived from the case's expected_facts keys and carries no declared value, and the must-ask case gets no surface",
      "verify": "node --test tests/sprint-01/t16-claude-code-grades.test.mjs --test-name-pattern t16-status-surface-declared",
      "maps_to_ac": "AC-1",
      "test_file": "tests/sprint-01/t16-claude-code-grades.test.mjs",
      "test_function": "t16-status-surface-declared",
      "test_tier": "integration",
      "positive_example": "the rendered prompt starts with `/pixel-perfect:status --platform web-desktop`, names all eight declared keys, matches none of `/approved/`, `/pending/`, `/\\b\\d+\\s*\\/\\s*\\d+\\b/`, and the first-question surface is 0 characters.",
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "scenario": {
        "id": "SC-T16-TC1",
        "tier": "e2e-automated",
        "test_tier": "integration",
        "negative_control": {
          "would_fail_if": [
            "the adapter hardcodes a surface for one case id, so a second case renders the first case's fields and the declaration is not derived",
            "the rendered surface carries the seeded gate words or a built/total pair, so the prompt supplies the answer the check is meant to measure",
            "the surface is appended to the must-ask case too, so the question probe's prompt changes and its boundary behaviour is untested going forward"
          ]
        },
        "evidence": {
          "forms": [
            "the rendered prompt string for each case manifest",
            "the case manifests as loaded by loadCase"
          ]
        },
        "topology_note": "the renderer takes a case manifest and returns text; the test reads the same manifests the run reads, so a case added later is described without an adapter edit",
        "cases": [
          {
            "start_ref": "seed/kit-cases",
            "action": {
              "actor": "runner",
              "steps": [
                "node --test tests/sprint-01/t16-claude-code-grades.test.mjs --test-name-pattern t16-status-surface-declared"
              ]
            },
            "end_state": {
              "must_observe": [
                "the rendered prompt starts with `/pixel-perfect:status --platform web-desktop`",
                "it names `platform`, `phase` and `gates.atoms`, `gates.molecules`, `gates.screens`",
                "it names `inventory.atoms`, `inventory.molecules`, `inventory.screens`",
                "it matches none of `/approved/`, `/pending/` and `/\\b\\d+\\s*\\/\\s*\\d+\\b/`",
                "the first-question-init surface renders as `0` characters"
              ],
              "must_not_observe": [
                "a rendered surface containing `approved` or `pending`",
                "a rendered surface containing a `3/3` count pair",
                "a rendered surface with `0` characters for the must-ask case"
              ]
            }
          }
        ]
      },
      "flow_ref": null,
      "red_input": "on base promptFor renders the slash command and the platform argument only, so the surface names none of the eight keys",
      "red_proof": ".tmp/sprint-01-verification/t16-claude-code-grades.red.log"
    },
    {
      "id": "TC-2",
      "type": "test_criterion",
      "primary": false,
      "description": "Each verify invocation is told its own report path, its own invocation id and the body contract, and neither prompt carries the defect key, a digest or an offset",
      "verify": "node --test tests/sprint-01/t16-claude-code-grades.test.mjs --test-name-pattern t16-verify-report-declared",
      "maps_to_ac": "AC-2",
      "test_file": "tests/sprint-01/t16-claude-code-grades.test.mjs",
      "test_function": "t16-verify-report-declared",
      "test_tier": "integration",
      "positive_example": "both prompts carry every field name in VERIFY_REPORT_CONTRACT.fields, the planted prompt carries `reports/verify-button-drift.json` and its own id, the clean prompt carries `reports/verify-clean.json` and a different id, and neither matches `/atoms\\/Button\\/default/`, `/[0-9a-f]{64}/` or `/offset/`.",
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "scenario": {
        "id": "SC-T16-TC2",
        "tier": "e2e-automated",
        "test_tier": "integration",
        "negative_control": {
          "would_fail_if": [
            "the report path is a literal in the adapter rather than the case's `report_relative_path`, so a new case would silently grade a path nothing writes",
            "the invocation id is omitted or hardcoded, so the report cannot be bound and every invocation writes the same unbound body",
            "the prompt states the planted defect key or its digest, so the model can type the answer without running the catalog check"
          ]
        },
        "evidence": {
          "forms": [
            "the rendered prompt for each verify entry",
            "VERIFY_REPORT_CONTRACT and the entry's caseManifest"
          ]
        },
        "topology_note": "each verify entry renders its own prompt from its own case manifest and its own minted invocation id, so the planted and clean prompts are compared with one another rather than with a copy of themselves",
        "cases": [
          {
            "start_ref": "seed/kit-cases",
            "action": {
              "actor": "runner",
              "steps": [
                "node --test tests/sprint-01/t16-claude-code-grades.test.mjs --test-name-pattern t16-verify-report-declared"
              ]
            },
            "end_state": {
              "must_observe": [
                "the planted prompt contains `reports/verify-button-drift.json` and the string `verify-button-drift`",
                "the planted prompt contains that entry's own `invocation_id`",
                "the clean prompt contains `reports/verify-clean.json` and a different `invocation_id`",
                "every field name in `VERIFY_REPORT_CONTRACT.fields` appears in both prompts",
                "both prompts match none of `/atoms\\/Button\\/default/`, `/[0-9a-f]{64}/` and `/offset/`"
              ],
              "must_not_observe": [
                "the defect key `atoms/Button/default` in either prompt",
                "a 64-hex digest in either prompt",
                "the same invocation id in both prompts"
              ]
            }
          }
        ]
      },
      "flow_ref": null,
      "red_input": "on base the verify prompt names neither a path nor an id, so no report can be written or bound",
      "red_proof": ".tmp/sprint-01-verification/t16-claude-code-grades.red.log"
    },
    {
      "id": "TC-3",
      "type": "test_criterion",
      "primary": false,
      "description": "The status check still refuses a reply that drops the gates, naming exactly the dropped facts",
      "verify": "node --test tests/sprint-01/t16-claude-code-grades.test.mjs --test-name-pattern t16-status-check-has-teeth",
      "maps_to_ac": "AC-1",
      "test_file": "tests/sprint-01/t16-claude-code-grades.test.mjs",
      "test_function": "t16-status-check-has-teeth",
      "test_tier": "integration",
      "positive_example": "the full reply grades pass, the stripped reply grades `fail status-facts-absent` with `missing` containing `gates.atoms` and `inventory.atoms`, and the one-gate-flipped reply's `missing` is exactly `[\"gates.atoms\"]`.",
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "scenario": {
        "id": "SC-T16-TC3",
        "tier": "e2e-automated",
        "test_tier": "integration",
        "negative_control": {
          "would_fail_if": [
            "the check is stubbed to pass every reply, so the stripped reply also grades pass and the missing list never populates",
            "the expected facts are emptied to make the comparison vacuous, so a reply with no gates passes because nothing is declared",
            "the stripped reply is graded with a hand-built record instead of the archived bytes, so the check is exercised against a shape the product never produced"
          ]
        },
        "evidence": {
          "forms": [
            "the graded cell for each of the three replies: full, stripped, one-gate-flipped",
            "each cell's block_reasons missing list"
          ]
        },
        "topology_note": "all three grades come from the same archived invocation bytes with content removed or one word changed, so they differ only in the reply and the check is the only variable",
        "cases": [
          {
            "start_ref": "seed/status-reply-mutated",
            "action": {
              "actor": "runner",
              "steps": [
                "node --test tests/sprint-01/t16-claude-code-grades.test.mjs --test-name-pattern t16-status-check-has-teeth"
              ]
            },
            "end_state": {
              "must_observe": [
                "the full reply grades `verdict: \"pass\"` with `reason: null`",
                "the stripped reply grades `verdict: \"fail\"` with `reason: \"status-facts-absent\"`",
                "the stripped reply's `missing` contains `gates.atoms` and `inventory.atoms`",
                "the one-gate-flipped reply's `missing` is exactly `[\"gates.atoms\"]`"
              ],
              "must_not_observe": [
                "`verdict: \"pass\"` on the stripped reply",
                "an empty `missing` list on the stripped reply",
                "a `missing` list with `2` or more entries on the one-gate-flipped reply"
              ]
            }
          }
        ]
      },
      "flow_ref": null,
      "red_input": "on base the same archived reply already fails for want of a surface, so a check that passes everything would be indistinguishable from one that works: the mutation is what makes the difference observable after the fix",
      "red_proof": ".tmp/sprint-01-verification/t16-claude-code-grades.red.log"
    },
    {
      "id": "TC-4",
      "type": "test_criterion",
      "primary": false,
      "description": "The report's writer is the invocation: the adapter holds no writer call, the path comes from the case manifest, and an absent file still grades report-missing",
      "verify": "node --test tests/sprint-01/t16-claude-code-grades.test.mjs --test-name-pattern t16-report-written-by-invocation",
      "maps_to_ac": "AC-2",
      "test_file": "tests/sprint-01/t16-claude-code-grades.test.mjs",
      "test_function": "t16-report-written-by-invocation",
      "test_tier": "integration",
      "positive_example": "the adapter source contains 0 occurrences of `writeVerifyReport` and no write to a `reports/` path, each rendered prompt's path equals that case's `report_relative_path`, and with no file present the grade reads `fail report-missing`.",
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "scenario": {
        "id": "SC-T16-TC4",
        "tier": "e2e-automated",
        "test_tier": "integration",
        "negative_control": {
          "would_fail_if": [
            "the adapter calls `writeVerifyReport` after the invocation, so the graded file is written by the harness and the product's output is never tested",
            "the report path is a hardcoded repository literal, so the file lands outside the invocation directory the grader reads",
            "a fallback finds any JSON under `reports/`, so a report at the wrong name still grades"
          ]
        },
        "evidence": {
          "forms": [
            "the adapter module source and its import list",
            "the readVerifyReport result with the report file absent"
          ]
        },
        "topology_note": "the writer check reads the module that runs the invocation, and the absence check grades the same entry with no file, so a harness-written report and a discovery fallback are both observable",
        "cases": [
          {
            "start_ref": "seed/kit-cases",
            "action": {
              "actor": "runner",
              "steps": [
                "node --test tests/sprint-01/t16-claude-code-grades.test.mjs --test-name-pattern t16-report-written-by-invocation"
              ]
            },
            "end_state": {
              "must_observe": [
                "the adapter source contains `0` occurrences of `writeVerifyReport`",
                "the adapter source contains `0` writes to a `reports/` path",
                "the path in each rendered prompt equals that case's `report_relative_path`",
                "with no file present the grade reads `fail report-missing`"
              ],
              "must_not_observe": [
                "a writer call inside `runCheck` or `gradeCheck`",
                "a glob or directory listing used to find the report",
                "`0` binding refusals, or `could-not-run` in place of `report-missing`"
              ]
            }
          }
        ]
      },
      "flow_ref": null,
      "red_input": "on base the adapter holds no writer either, but it also never asks for a report: the assertion that fails is the declared path in the prompt, so the pair proves the mechanism rather than the absence of one",
      "red_proof": ".tmp/sprint-01-verification/t16-claude-code-grades.red.log"
    }
  ]
}
-->
