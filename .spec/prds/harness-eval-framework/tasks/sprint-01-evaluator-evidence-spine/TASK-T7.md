# TASK-T7: Implement the deterministic graders: fixture-grader (verify pair + status), question-boundary checks, VerifyReport writer, grade records — keyless evaluator owns every verdict

> Task ID: T7
> Sprint: [SPRINT.md](./SPRINT.md)
> Status: ✅ Completed

Commit: a0badf607c27ae323579e9b4a8b16d19875708ba
> Assignee: evals-implementer
> Priority: P1
> Points: 8
> Type: FEATURE
> Planner: evals-planner
> Proposed By: github-agentic-workflow-planner + evals-planner
> TDD_MODE: red_first · RED_GREEN_REQUIRED: true

AGENT: planner=evals-planner | implementer=evals-implementer | reviewer=evals-reviewer

**Depends on:** T4 (cases@v1), T6 (stream-mapping@v1)
**Blocks:** T11 (its code needs this task's landed work), T12 (its code needs this task's landed work)

## Background

- **Source:** `.spec/prds/harness-eval-framework/09-technical-requirements/03-data-schema.md` (HarnessCell/HarnessGrade, VerifyReport, StatusCase), `02-system-components.md` (fixture-grader, question-boundary, grade-writer), `09-capability-chains.md` (grader@v1)
- **Human testing gate steps that exercise this task:** 6, 8
- **PRD references:** `03-data-schema.md` § Grades and reports; `02-system-components.md` § fixture-grader; `04-uc-grd.md` UC-GRD-02, UC-GRD-03, UC-GRD-04, UC-GRD-05; `10-e2e-testing-criteria.md` T-GRD-007..T-GRD-020
- **Capabilities touched:** CAP-EVAL-01
- **Why it matters:** this task is where a verdict is actually decided. It runs with no model credential, so the plugin can supply observed output but can never supply its own grade. The aggregate rule (could-not-run before fail before pass, preserving every constituent result) is what stops a setup failure from being relabelled as a product defect.
- **Current (what this task consumes):** T4's case manifests and kit fixture; T6's CanonicalEvent normalizer and mapping coverage verdict.
- **Desired (what this task provides):** the fixture-grader (verify pair plus status with before/after protected hashes), the question-boundary checks, the `VerifyReport` writer that writes only at the case-declared path, per-check grade records that cite their evidence, and the aggregate verdict rule.
- **Boundary contracts:** missing case-declared report after an otherwise evaluable run is fail `report-missing`; unwritable artifact storage is could-not-run `report-unavailable`; an unsafe case path is could-not-run `invalid-case-path`; an oracle exit 1 for the planted project is the expected detection, not a failure.

## Critical Constraints

- MUST write each VerifyReport only at the path its case declared and MUST NEVER use a glob, a timestamp, or an any-new-file fallback; a report at any other path is not evidence.
- MUST aggregate could-not-run before fail before pass, preserving every constituent result and block reason — a setup or storage failure is NEVER relabelled as a plugin defect.
- MUST require actual harness output or a completed verification tool result the harness invoked for detection; a copied `expected_defect_key`, a case label, or a filename alone MUST NOT count as detection.
- MUST run without any model credential, and MUST fail the run if the fixture source changed (before/after hashes over manifest, goldens, sandbox, `src` and package files).
- MUST treat a missing case-declared report after an otherwise evaluable run as fail `report-missing`, and MUST keep both reports (planted and clean) on an evaluation pass.

## Specification

- **Objective:** Decide every verdict from files and stream offsets, with a keyless grader that can only cite evidence the harness produced.
- **Success state:** The four checks are graded from files and streams with cited evidence, both verify reports persist at their declared paths with correct invocation bindings, a generic status reply fails, and a deleted planted report grades fail `report-missing`.

## Acceptance Criteria (GIVEN-WHEN-THEN)

### AC-1: Four grades per graded cell: command_list, status, verify, question_before_expensive_work — ask-nothing enforced, must-a [PRIMARY]

- **GIVEN:** seed/live-dispatch-run (RUN_ID + attempt-qualified artifacts via gh run download)
- **WHEN:** adapter runs the five real invocations via claude -p with stream-json; grader assigns four verdicts from files and streams
- **THEN:** claude-code/pinned cell shows all 4 checks "pass"; status reply states platform "web-desktop", seeded phase, gate state, nonzero inventory counts matching StatusCase; must-ask capture contains exactly 1 valid USER_CHOICE and 0 answer deliveries

```text
FLOW_REF:              FLOW-GRD-02-FOUR-GRADES
TEST_TIER:             integration
VERIFICATION_SERVICE:  GitHub Actions harness-eval workflow + real harness CLIs + harness-smoke keys
SURFACE_POLICY:        .spec/e2e-policy/sprint-01/artifact-only-read.json
TDD_STATE:             none
TEST_FILE:             tests/sprint-01/grd-02-four-grades.test.mjs
TEST_FUNCTION:         FLOW-GRD-02-FOUR-GRADES
VERIFY:                node --test tests/sprint-01/grd-02-four-grades.test.mjs --test-name-pattern FLOW-GRD-02-FOUR-GRADES
```

- **RED input (fails on base):** On base main the module cannot find any grade record (no test/harness exists) and exits 1 writing .red; locally, a fixture where the status check's stream contains a question flips verdict to fail.
- **RED proof:** `.tmp/sprint-01-verification/grd-02-four-grades.json.red`
- **positive_example (passes after landing):** Fixture pair: claude-code pinned cell with four pass verdicts where list/status/verify streams contain zero question events and the init prefix stops at the first USER_CHOICE with no answer sent — module exits 0.

SCENARIO_SUMMARY: complete SCENARIO lives once, in this AC's row of the REQUIREMENT-CONTRACT block below.

### AC-2: Evidence-not-exit-code grading: verdicts cite files and stream offsets; a denied read fails on exit 0

- **GIVEN:** seed/live-dispatch-run (RUN_ID + attempt-qualified artifacts via gh run download)
- **WHEN:** download result artifact; jq claude-code/pinned checks for source and process_exit_code
- **THEN:** checks with .source files-and-event-stream count == 4; raw integer `process_exit_code` present as diagnostic; controls row exit0-denied-read fail denied_tool_call

```text
FLOW_REF:              FLOW-GRD-03-FILES-AND-STREAM
TEST_TIER:             integration
VERIFICATION_SERVICE:  GitHub Actions harness-eval workflow + real harness CLIs + harness-smoke keys
SURFACE_POLICY:        .spec/e2e-policy/sprint-01/artifact-only-read.json
TDD_STATE:             none
TEST_FILE:             tests/sprint-01/grd-03-evidence.test.mjs
TEST_FUNCTION:         FLOW-GRD-03-FILES-AND-STREAM
VERIFY:                node --test tests/sprint-01/grd-03-evidence.test.mjs --test-name-pattern FLOW-GRD-03-FILES-AND-STREAM
```

- **RED input (fails on base):** Base main: no grader exists, module exits 1 with .red. Behavior RED: a verdict equal to its exit-code mapping (pass with exit 0 and a denied-read stream) makes the module exit 1 — the negative fixture is the recorded deny-under-default-mode stream from T5.
- **RED proof:** `.tmp/sprint-01-verification/grd-03-evidence.json.red`
- **positive_example (passes after landing):** Controls row exit0-denied-read fail denied_tool_call present next to a raw process_exit_code of 0, and every graded check citing at least 1 evidence path — module exits 0.

SCENARIO_SUMMARY: complete SCENARIO lives once, in this AC's row of the REQUIREMENT-CONTRACT block below.

### AC-3: Verify report at the case-declared path naming the planted defect, bound to its producing invocation; no invented filena [PRIMARY]

- **GIVEN:** seed/live-dispatch-run (RUN_ID + attempt-qualified artifacts via gh run download)
- **WHEN:** gh run download verify-reports artifact; jq planted and clean reports
- **THEN:** reports/verify-button-drift.json exists with expected_defect_key "atoms/Button/default" and outcome "defect-detected"; planted report prints "claude-code pinned"; detection evidence cites "capture path/hash" and event offsets

```text
FLOW_REF:              FLOW-GRD-04-NAMED-PATH
TEST_TIER:             integration
VERIFICATION_SERVICE:  GitHub Actions harness-eval workflow + real harness CLIs + harness-smoke keys
SURFACE_POLICY:        .spec/e2e-policy/sprint-01/artifact-only-read.json
TDD_STATE:             none
TEST_FILE:             tests/sprint-01/grd-04-named-path.test.mjs
TEST_FUNCTION:         FLOW-GRD-04-NAMED-PATH
VERIFY:                node --test tests/sprint-01/grd-04-named-path.test.mjs --test-name-pattern FLOW-GRD-04-NAMED-PATH
```

- **RED input (fails on base):** Base main: no case manifest or writer exists, module exits 1 with .red. Confinement RED (exists today as a pure check): a manifest declaring report_relative_path '../escape.json' or '/abs.json' must be rejected by the loader — run against the loader alone on base it cannot even load, exiting 1.
- **RED proof:** `.tmp/sprint-01-verification/grd-04-named-path.json.red`
- **positive_example (passes after landing):** Both reports exist at exactly reports/verify-button-drift.json and reports/verify-clean.json inside their invocation dirs, bodies carrying harness claude-code, track, expected_defect_key atoms/Button/default, observed_defect_key atoms/Button/default — module exits 0; a swapped-body fixture fails.

SCENARIO_SUMMARY: complete SCENARIO lives once, in this AC's row of the REQUIREMENT-CONTRACT block below.

### AC-4: Clean twin is not a verify failure: clean control passes beside a detected planted defect

- **GIVEN:** seed/live-dispatch-run (RUN_ID + attempt-qualified artifacts via gh run download)
- **WHEN:** verify on planted copy and clean twin copy as separate invocations; write both reports at declared paths
- **THEN:** verify-clean.json clean_project_failed == false outcome clean; cell aggregates "pass" with planted "defect-detected" plus clean "pass"; distinct non-empty `invocation_id` values

```text
FLOW_REF:              FLOW-GRD-05-CLEAN-TWIN
TEST_TIER:             integration
VERIFICATION_SERVICE:  GitHub Actions harness-eval workflow + real harness CLIs + harness-smoke keys
SURFACE_POLICY:        .spec/e2e-policy/sprint-01/artifact-only-read.json
TDD_STATE:             none
TEST_FILE:             tests/sprint-01/grd-05-clean-twin.test.mjs
TEST_FUNCTION:         FLOW-GRD-05-CLEAN-TWIN
VERIFY:                node --test tests/sprint-01/grd-05-clean-twin.test.mjs --test-name-pattern FLOW-GRD-05-CLEAN-TWIN
```

- **RED input (fails on base):** Base main: no twin machinery exists, module exits 1 with .red. Behavior RED: a fixture where the clean invocation's report shows observed_verify_outcome false-positive (clean_project_failed=true) must yield fail — the module exits 1 on that fixture.
- **RED proof:** `.tmp/sprint-01-verification/grd-05-clean-twin.json.red`
- **positive_example (passes after landing):** Fixture with clean report observed_verify_outcome=clean, clean_project_failed=false, distinct invocation_id from the planted report — module exits 0.

SCENARIO_SUMMARY: complete SCENARIO lives once, in this AC's row of the REQUIREMENT-CONTRACT block below.

### AC-5: Journey: planted-and-clean verify pair through a real dispatched run, from oracle precheck to summary links [PRIMARY]

- **GIVEN:** seed/live-dispatch-run (RUN_ID + attempt-qualified artifacts via gh run download)
- **WHEN:** dispatch; watch to completion; download verify-reports; read the defect name and twin result
- **THEN:** planted names "atoms/Button/default" with "defect-detected"; clean twin clean_project_failed == false; both bound to distinct `invocation_id`s of the same live run

```text
FLOW_REF:              None
TEST_TIER:             e2e
VERIFICATION_SERVICE:  GitHub Actions harness-eval workflow + real harness CLIs + harness-smoke keys
SURFACE_POLICY:        .spec/e2e-policy/sprint-01/artifact-only-read.json
TDD_STATE:             none
TEST_FILE:             tests/sprint-01/jrn-planted-and-twin.test.mjs
TEST_FUNCTION:         FLOW-JRN-PLANTED-AND-TWIN
VERIFY:                node --test tests/sprint-01/jrn-planted-and-twin.test.mjs --test-name-pattern FLOW-JRN-PLANTED-AND-TWIN
```

- **RED input (fails on base):** Base main: the journey cannot start (no workflow to dispatch, no oracle wrapper) — module exits 1 with .red.
- **RED proof:** `.tmp/sprint-01-verification/jrn-planted-and-twin.json.red`
- **positive_example (passes after landing):** One real dispatched run whose artifact chain satisfies: oracle exited 1 on planted with drifted[].key atoms/Button/default and 0 on clean, planted report defect-detected at its declared path, clean report clean, both linked from the summary — module exits 0.

SCENARIO_SUMMARY: complete SCENARIO lives once, in this AC's row of the REQUIREMENT-CONTRACT block below.

## Test Criteria

Each TC is an assertion inside its mapped AC's VERIFY command; its fail input and positive example are on its row in the REQUIREMENT-CONTRACT block.

| TC | Statement | Maps to |
|----|-----------|---------|

## Reading List

1. `.spec/prds/harness-eval-framework/09-technical-requirements/03-data-schema.md` § Grades and reports — the verdict vocabulary, the aggregate rule and the report field set
2. `.spec/prds/harness-eval-framework/09-technical-requirements/02-system-components.md` § fixture-grader, § question-boundary — the copy-and-protect rule and the ask-nothing/must-ask split
3. `.spec/prds/harness-eval-framework/09-technical-requirements/02-system-components.md` § grade-writer — temp file, fsync, rename, read-back
4. `.spec/prds/harness-eval-framework/10-e2e-testing-criteria.md` T-GRD-013..T-GRD-020 — the per-criterion pass/fail the grader must reproduce
5. `.spec/scenarios/UC-GRD-04/*.scenario.md`, `.spec/scenarios/UC-GRD-05/*.scenario.md`, `.spec/scenarios/journeys/*` — the registry entries behind this task's flows

Coding standards:

- `AGENTS.md`
- `brain/docs/TDD-METHODOLOGY.md`
- `brain/docs/kanban/SCENARIO-CONTRACT-V1.md`

## Guardrails

WRITE-ALLOWED:

- test/harness/grade/**
- test/harness/graders/
- tests/sprint-01/grd-02-four-grades.test.mjs
- tests/sprint-01/grd-03-evidence.test.mjs
- tests/sprint-01/grd-04-named-path.test.mjs
- tests/sprint-01/grd-05-clean-twin.test.mjs
- tests/sprint-01/jrn-planted-and-twin.test.mjs
- tests/sprint-01/flow-runner.mjs

WRITE-PROHIBITED:

- plugins/pixel-perfect/**
- test/harness/kit/** (case manifests are inputs)
- Any file not listed in write_allowed

## Code Pattern

```js
const RANK = { "could-not-run": 0, fail: 1, pass: 2 };
export function aggregate(parts) {
  const verdict = parts.map((p) => p.verdict).sort((a, b) => RANK[a] - RANK[b])[0]; // worst wins
  return { verdict, reason: verdict === "pass" ? "defect-detected+clean" : parts.find((p) => p.verdict === verdict).reason, parts };
}
export async function writeReport(invocation, caseManifest, body) {
  const target = bindReportPath(caseManifest, invocation.dir);   // T4 loader, sole authority
  await writeAtomic(target, body);                               // temp -> fsync -> rename -> read back
  return readBack(target);
}
```

- **Source:** `.spec/prds/harness-eval-framework/09-technical-requirements/03-data-schema.md` § HarnessCell / HarnessGrade (aggregate order) and § VerifyPair / VerifyReport (case-declared path)
- **Anti-pattern:** Choosing `reports/<timestamp>.json`; passing a planted case because `expected_defect_key` was copied into the body; grading a clean twin `fail`; turning a missing key into a product failure instead of could-not-run; reusing the planted report for the twin.

## Design

None. The graders and the report writer have no UI surface.

## Agent Instructions

Work each AC as one RED, GREEN, REFACTOR cycle in AC order, seeded from the `start_ref` on its row. AC-1's RED is a fixture with no grade record at all: on base the module cannot find one and exits 1. AC-3's RED is a manifest declaring `report_relative_path: '../escape.json'`, which the loader must refuse before writing; run it against the loader alone on base and it cannot even load, exiting 1. AC-4's RED is a clean report carrying `observed_verify_outcome: false-positive` with `clean_project_failed: true`, which must yield fail. AC-5's RED is a copied artifact with the planted report deleted: the check must land on fail `report-missing`, not could-not-run. Never make a RED pass by loosening the aggregate order.

- **AC-1:** `FLOW-GRD-02-FOUR-GRADES` in `tests/sprint-01/grd-02-four-grades.test.mjs`, seeded from `seed/live-dispatch-run`.
- **AC-2:** `FLOW-GRD-03-FILES-AND-STREAM` in `tests/sprint-01/grd-03-evidence.test.mjs`, seeded from `seed/live-dispatch-run`.
- **AC-3:** `FLOW-GRD-04-NAMED-PATH` in `tests/sprint-01/grd-04-named-path.test.mjs`, seeded from `seed/live-dispatch-run`.
- **AC-4:** `FLOW-GRD-05-CLEAN-TWIN` in `tests/sprint-01/grd-05-clean-twin.test.mjs`, seeded from `seed/live-dispatch-run`.
- **AC-5:** `FLOW-JRN-PLANTED-AND-TWIN` in `tests/sprint-01/jrn-planted-and-twin.test.mjs`, seeded from `seed/live-dispatch-run`.

## Orchestrator Verification Protocol

1. **VERIFY_RED:** on base `main` all five VERIFY commands exit non-zero and the `.red` proofs exist under `.tmp/sprint-01-verification/` for grd-02, grd-03, grd-04, grd-05 and jrn-planted-and-twin.
2. **VERIFY_GREEN:** all five VERIFY commands exit 0; each report exists only at its declared path; the deleted-planted-report fixture lands on fail `report-missing`.
3. Run every Evidence Gate and compare with Expected.
4. `git diff --name-only` lists only WRITE-ALLOWED paths; `plugins/pixel-perfect/**` and `test/harness/kit/**` are untouched.
5. Dispatch `evals-reviewer` with this file, the RED and GREEN outputs, and the evidence.

## Agent Assignment

- **Planner role:** `evals-planner`
- **Implementer role:** `evals-implementer`
- **Reviewer role:** `evals-reviewer`
- **Rationale:** `evals-implementer` owns the eval/grading surface this task lands; `evals-reviewer` audits oracle strength, fixture reality and negative-path coverage.
- **Pairing:** `evals-implementer` builds; `evals-reviewer` reviews adversarially against the Review Criteria below.

## Evidence Gates

- **AC-1:** `node --test tests/sprint-01/grd-02-four-grades.test.mjs --test-name-pattern FLOW-GRD-02-FOUR-GRADES`. Expected: prints the TAP `ok` line for FLOW-GRD-02-FOUR-GRADES after the four check_ids carry verdicts with non-empty reasons and the must-ask capture shows 1 USER_CHOICE and 0 answers
- **AC-2:** `node --test tests/sprint-01/grd-03-evidence.test.mjs --test-name-pattern FLOW-GRD-03-FILES-AND-STREAM`. Expected: prints the TAP `ok` line for FLOW-GRD-03-FILES-AND-STREAM after 4 checks cite `files-and-event-stream` and the exit0-denied-read control reads fail beside process_exit_code 0
- **AC-3:** `node --test tests/sprint-01/grd-04-named-path.test.mjs --test-name-pattern FLOW-GRD-04-NAMED-PATH`. Expected: prints the TAP `ok` line for FLOW-GRD-04-NAMED-PATH after `reports/verify-button-drift.json` carries atoms/Button/default with outcome defect-detected and the escape cases wrote 0 files
- **AC-4:** `node --test tests/sprint-01/grd-05-clean-twin.test.mjs --test-name-pattern FLOW-GRD-05-CLEAN-TWIN`. Expected: prints the TAP `ok` line for FLOW-GRD-05-CLEAN-TWIN after `verify-clean.json` reads clean_project_failed=false with a distinct invocation_id
- **AC-5:** `node --test tests/sprint-01/jrn-planted-and-twin.test.mjs --test-name-pattern FLOW-JRN-PLANTED-AND-TWIN`. Expected: prints the TAP `ok` line for FLOW-JRN-PLANTED-AND-TWIN after the live run's two reports and the oracle transcript agree, and the missing-planted-report fixture grades fail `report-missing`

## Review Criteria

Must pass:

- One test per AC, named exactly as its TEST_FUNCTION, in its TEST_FILE.
- RED evidence for every AC, each RED being a real input that fails, not a missing file alone.
- The aggregate order is could-not-run before fail before pass, with every constituent result preserved.
- No code path writes a report anywhere but the case-declared path, and no discovery fallback exists.
- `git diff --name-only` lists only WRITE-ALLOWED paths.

Should verify:

- Detection requires real harness output or a completed verification tool result; a copied expected key cannot pass.
- The grader holds no model credential and reads no API key.
- Fixture source integrity is checked before and after each invocation.

Verdict: APPROVED or NEEDS_FIXES, with file and line for each finding.

## Dependencies

- **Depends on:** T4 (cases@v1), T6 (stream-mapping@v1)
- **Blocks:** T11 (its code needs this task's landed work), T12 (its code needs this task's landed work)

A shared file is not a dependency, and needing another task's output to test against is that flow's integration obligation, not an edge.

## Out of Scope

- Producing the capture (T5 invokes the harness; T6 normalizes the stream).
- Declaring the case manifests or the fixture project (T4 owns those).
- Recording the result artifact or the twelve-cell matrix (T8 owns the recorder).

## Context

- **Current state:** No grader, no report writer, no grade records exist anywhere in the repo.
- **Gap:** Nothing turns captured evidence into a verdict, so no harness can be graded at all.

## Notes

- **Flow ownership:** this task is the PRIMARY owner of `FLOW-GRD-02-FOUR-GRADES`, `FLOW-GRD-04-NAMED-PATH` and the post-integration journey `FLOW-JRN-PLANTED-AND-TWIN`. It exercises `FLOW-GRD-03-FILES-AND-STREAM` (T6 owns it) and `FLOW-GRD-05-CLEAN-TWIN` (T4 owns it) at gate step 8, which is why those obligations name T7 in `available_after` but not in `required_by`.
- **Split check:** not triggered — 8 points, but one failure mode (an unearned verdict) reported as a single sentence.
- **Owner:** evals-planner; sprint `sprint-01-evaluator-evidence-spine`.

## Integration Obligations

- **obl-FLOW-GRD-02-FOUR-GRADES** — `FLOW-GRD-02-FOUR-GRADES`, phase `post-integration`, mandatory. available_after ['T5', 'T6', 'T7', 'T9']; required_by ['T11', 'T12']; recheck_on ['T11', 'T12'].
  - command: `node --test tests/sprint-01/grd-02-four-grades.test.mjs --test-name-pattern FLOW-GRD-02-FOUR-GRADES`
- **obl-FLOW-GRD-04-NAMED-PATH** — `FLOW-GRD-04-NAMED-PATH`, phase `post-integration`, mandatory. available_after ['T4', 'T7']; required_by ['T11', 'T12']; recheck_on ['T11', 'T12'].
  - command: `node --test tests/sprint-01/grd-04-named-path.test.mjs --test-name-pattern FLOW-GRD-04-NAMED-PATH`
- **obl-FLOW-JRN-PLANTED-AND-TWIN** — `FLOW-JRN-PLANTED-AND-TWIN`, phase `post-integration`, mandatory. available_after ['T4', 'T7']; required_by ['T11', 'T12']; recheck_on ['T11', 'T12'].
  - command: `node --test tests/sprint-01/jrn-planted-and-twin.test.mjs --test-name-pattern FLOW-JRN-PLANTED-AND-TWIN`

<!-- REQUIREMENT-CONTRACT v1 -->
<!--
{
  "version": "1",
  "task_id": "T7",
  "task_type": "FEATURE",
  "tdd_mode": "red_first",
  "verification_policy": {
    "requires_tests": true,
    "requires_red_evidence": true,
    "requires_seeded_evidence": true
  },
  "guardrails": {
    "write_allowed": [
      "test/harness/grade/**",
      "test/harness/graders/",
      "tests/sprint-01/grd-02-four-grades.test.mjs",
      "tests/sprint-01/grd-03-evidence.test.mjs",
      "tests/sprint-01/grd-04-named-path.test.mjs",
      "tests/sprint-01/grd-05-clean-twin.test.mjs",
      "tests/sprint-01/jrn-planted-and-twin.test.mjs",
      "tests/sprint-01/flow-runner.mjs"
    ],
    "write_prohibited": [
      "plugins/pixel-perfect/**",
      "test/harness/kit/** (case manifests are inputs)"
    ]
  },
  "fixtures": {
    "seed/live-dispatch-run": {
      "entrypoint": "gh workflow run harness-eval --repo hackerpug-ai/pixel-perfect (real dispatch, checkout default)",
      "description": "RUN_ID + attempt-qualified artifacts via gh run download",
      "seed_method": "cli"
    },
    "seed/live-dispatch-published": {
      "entrypoint": "gh workflow run harness-eval -f install_mode=published",
      "description": "second RUN_ID recording published mode",
      "seed_method": "cli"
    },
    "seed/result-artifact": {
      "entrypoint": "gh run download <RUN_ID> -n harness-eval-result-<RUN_ID>-1",
      "description": "harness-eval-result.json with cells, controls, pins_sha256, identity fields",
      "seed_method": "cli"
    },
    "seed/verify-reports-artifact": {
      "entrypoint": "gh run download <RUN_ID> -n harness-eval-verify-reports-<RUN_ID>-1",
      "description": "reports/verify-button-drift.json and reports/verify-clean.json",
      "seed_method": "cli"
    },
    "seed/streams/exit0-denied-read": {
      "entrypoint": "real claude-code capture from T11 qualification (recorded-stance run, reads denied, exit 0); archived under test/harness/fixtures/streams/ with capture hash",
      "description": "raw stream bytes with offsets",
      "seed_method": "recorded_external"
    },
    "seed/streams/clean-verify-pass": {
      "entrypoint": "real captured clean-verify invocation from the same qualification run",
      "description": "grader-passing capture fixture",
      "seed_method": "recorded_external"
    },
    "seed/streams/question-in-ask-nothing": {
      "entrypoint": "splice of real bytes only: USER_CHOICE from the must-ask capture inserted into the real verify stream, provenance hashes recorded",
      "description": "the GRD-02 red fixture",
      "seed_method": "recorded_external"
    },
    "seed/case/verify-button-drift": {
      "entrypoint": "test/harness/kit/project fresh copy + overlays/button-drift by the case loader",
      "description": "planted invocation dir with declared report path",
      "seed_method": "migration_fixture"
    },
    "seed/case/verify-clean": {
      "entrypoint": "same kit copy without overlay, separate fresh dir",
      "description": "clean invocation dir",
      "seed_method": "migration_fixture"
    },
    "seed/scratch-invocation-dir": {
      "entrypoint": "mkdtemp created by the case loader",
      "description": "empty workspace for confinement negatives with post-run listings",
      "seed_method": "migration_fixture"
    },
    "seed/env/anthropic-key-present": {
      "entrypoint": "harness-smoke environment, ANTHROPIC_API_KEY on exec steps (owner secret)",
      "description": "authenticated cells + key-present-misfire control",
      "seed_method": "cli"
    },
    "seed/env/key-removed": {
      "entrypoint": "control step's real environment with ANTHROPIC_API_KEY and all fallbacks unset (asserted in-step)",
      "description": "missing-key refusal capture with zero model events",
      "seed_method": "cli"
    }
  },
  "verification_gates": [],
  "integration_obligations": [
    {
      "id": "obl-FLOW-GRD-02-FOUR-GRADES",
      "flow_ref": "FLOW-GRD-02-FOUR-GRADES",
      "phase": "post-integration",
      "mandatory": true,
      "owner_task_id": "T7",
      "available_after": [
        "T5",
        "T6",
        "T7",
        "T9"
      ],
      "required_by": [
        "T11",
        "T12"
      ],
      "recheck_on": [
        "T11",
        "T12"
      ],
      "recheck_paths": [
        "tests/sprint-01/grd-02-four-grades.test.mjs",
        "test/harness/pins.json",
        ".github/workflows/harness-eval.yml"
      ],
      "completion_rule": "FLOW-GRD-02-FOUR-GRADES passes on the trunk when `node --test tests/sprint-01/grd-02-four-grades.test.mjs --test-name-pattern FLOW-GRD-02-FOUR-GRADES` exits 0 and the flow's artifact .tmp/sprint-01-verification/grd-02-four-grades.json is retained with its expected observations matched.",
      "verification_gates": [],
      "requirements": [],
      "owner_bindings": [
        {
          "owner_task_id": "T7",
          "flow_ref": "FLOW-GRD-02-FOUR-GRADES",
          "command": "node --test tests/sprint-01/grd-02-four-grades.test.mjs --test-name-pattern FLOW-GRD-02-FOUR-GRADES"
        }
      ]
    },
    {
      "id": "obl-FLOW-GRD-04-NAMED-PATH",
      "flow_ref": "FLOW-GRD-04-NAMED-PATH",
      "phase": "post-integration",
      "mandatory": true,
      "owner_task_id": "T7",
      "available_after": [
        "T4",
        "T7"
      ],
      "required_by": [
        "T11",
        "T12"
      ],
      "recheck_on": [
        "T11",
        "T12"
      ],
      "recheck_paths": [
        "tests/sprint-01/grd-04-named-path.test.mjs",
        "test/harness/pins.json",
        ".github/workflows/harness-eval.yml"
      ],
      "completion_rule": "FLOW-GRD-04-NAMED-PATH passes on the trunk when `node --test tests/sprint-01/grd-04-named-path.test.mjs --test-name-pattern FLOW-GRD-04-NAMED-PATH` exits 0 and the flow's artifact .tmp/sprint-01-verification/grd-04-named-path.json is retained with its expected observations matched.",
      "verification_gates": [],
      "requirements": [],
      "owner_bindings": [
        {
          "owner_task_id": "T7",
          "flow_ref": "FLOW-GRD-04-NAMED-PATH",
          "command": "node --test tests/sprint-01/grd-04-named-path.test.mjs --test-name-pattern FLOW-GRD-04-NAMED-PATH"
        }
      ]
    },
    {
      "id": "obl-FLOW-JRN-PLANTED-AND-TWIN",
      "flow_ref": "FLOW-JRN-PLANTED-AND-TWIN",
      "phase": "post-integration",
      "mandatory": true,
      "owner_task_id": "T7",
      "available_after": [
        "T4",
        "T7"
      ],
      "required_by": [
        "T11",
        "T12"
      ],
      "recheck_on": [
        "T11",
        "T12"
      ],
      "recheck_paths": [
        "tests/sprint-01/jrn-planted-and-twin.test.mjs",
        "test/harness/pins.json",
        ".github/workflows/harness-eval.yml"
      ],
      "completion_rule": "FLOW-JRN-PLANTED-AND-TWIN passes on the trunk when `node --test tests/sprint-01/jrn-planted-and-twin.test.mjs --test-name-pattern FLOW-JRN-PLANTED-AND-TWIN` exits 0 and the flow's artifact .tmp/sprint-01-verification/jrn-planted-and-twin.json is retained with its expected observations matched.",
      "verification_gates": [],
      "requirements": [],
      "owner_bindings": [
        {
          "owner_task_id": "T7",
          "flow_ref": "FLOW-JRN-PLANTED-AND-TWIN",
          "command": "node --test tests/sprint-01/jrn-planted-and-twin.test.mjs --test-name-pattern FLOW-JRN-PLANTED-AND-TWIN"
        }
      ],
      "command": "node --test tests/sprint-01/jrn-planted-and-twin.test.mjs --test-name-pattern FLOW-JRN-PLANTED-AND-TWIN",
      "trigger": "The sprint's integration runner replays this journey after T4 and T7 have landed on the trunk (available_after).",
      "expected": "Both verify reports from one live dispatched run persist at their case-declared paths: reports/verify-button-drift.json carries observed_defect_key atoms/Button/default with observed_verify_outcome defect-detected, and reports/verify-clean.json carries clean_project_failed=false, each bound to its own invocation_id of that run.",
      "completion_boundary": "Complete when the flow command exits 0 on the trunk candidate commit and the recorded artifact carries the live run_id/run_attempt binding; a replay with no live run grades not-executed and never pass.",
      "evidence_artifacts": [
        ".tmp/sprint-01-verification/jrn-planted-and-twin.json",
        ".tmp/sprint-01-verification/jrn-planted-and-twin.json.red"
      ]
    }
  ],
  "requirements": [
    {
      "id": "AC-1",
      "type": "acceptance_criterion",
      "primary": true,
      "flow_ref": "FLOW-GRD-02-FOUR-GRADES",
      "title": "Four grades per graded cell: command_list, status, verify, question_before_expensive_work \u2014 ask-nothing enforced, must-a",
      "test_tier": "integration",
      "verification_service": "GitHub Actions harness-eval workflow + real harness CLIs + harness-smoke keys",
      "verify": "node --test tests/sprint-01/grd-02-four-grades.test.mjs --test-name-pattern FLOW-GRD-02-FOUR-GRADES",
      "test_file": "tests/sprint-01/grd-02-four-grades.test.mjs",
      "test_function": "FLOW-GRD-02-FOUR-GRADES",
      "positive_example": "Fixture pair: claude-code pinned cell with four pass verdicts where list/status/verify streams contain zero question events and the init prefix stops at the first USER_CHOICE with no answer sent \u2014 module exits 0.",
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "scenario": {
        "tier": "e2e-automated",
        "negative_control": {
          "would_fail_if": [
            "a question event appeared in any list/status/verify stream and the grader still passed that check (an empty question count must fail ask-nothing)",
            "the must-ask probe graded pass with zero question events or with an answer delivered",
            "a generic status reply passed the status check",
            "verdicts were derived from exit codes instead of streams"
          ]
        },
        "evidence": {
          "forms": [
            "CanonicalEvent streams with original_event bytes and offsets",
            "grade records per check",
            "archived real captures with provenance hashes"
          ],
          "examples": [
            "four check_ids with verdicts for claude-code/pinned",
            "question event count 0 in ask-nothing streams",
            "USER_CHOICE count 1, answers sent 0 in must-ask"
          ],
          "required_capture": "raw captured stdout per invocation with byte offsets, capture hashes, grader evidence citations"
        },
        "cases": [
          {
            "start_ref": "seed/live-dispatch-run",
            "action": {
              "actor": "workflow",
              "steps": [
                "adapter runs the five real invocations via claude -p with stream-json",
                "grader assigns four verdicts from files and streams"
              ]
            },
            "end_state": {
              "must_observe": [
                "claude-code/pinned cell shows all 4 checks \"pass\"",
                "status reply states platform \"web-desktop\", seeded phase, gate state, nonzero inventory counts matching StatusCase",
                "must-ask capture contains exactly 1 valid USER_CHOICE and 0 answer deliveries"
              ],
              "must_not_observe": [
                "any question event in list/status/verify streams",
                "a scripted answer consumed by any first check",
                "an empty checks array or null reason on a pass verdict"
              ]
            }
          },
          {
            "start_ref": "seed/streams/question-in-ask-nothing",
            "action": {
              "actor": "runner",
              "steps": [
                "node tests/sprint-01/flow-runner.mjs grd-02 --fixture question-in-ask-nothing --expect red"
              ]
            },
            "end_state": {
              "must_observe": [
                "grader returns \"fail\" citing the question event offset",
                ".red records the spliced capture's \"provenance hashes\""
              ],
              "must_not_observe": [
                "pass on a stream containing a question",
                "synthetic event JSON with no capture provenance"
              ]
            }
          }
        ],
        "topology_note": "real claude-code CLI executes list/status/planted-verify/clean-verify/must-ask-init; keyless grader reads files plus CanonicalEvent streams; replay runs the same grader over archived real captures",
        "test_tier": "e2e"
      },
      "red_input": "On base main the module cannot find any grade record (no test/harness exists) and exits 1 writing .red; locally, a fixture where the status check's stream contains a question flips verdict to fail.",
      "red_proof": ".tmp/sprint-01-verification/grd-02-four-grades.json.red",
      "description": "GIVEN seed/live-dispatch-run (RUN_ID + attempt-qualified artifacts via gh run download) WHEN adapter runs the five real invocations via claude -p with stream-json; grader assigns four verdicts from files and streams THEN claude-code/pinned cell shows all 4 checks \"pass\"; status reply states platform \"web-desktop\", seeded phase, gate state, nonzero inventory counts matching StatusCase; must-ask capture contains exactly 1 valid USER_CHOICE and 0 answer deliveries",
      "maps_to_ac": null
    },
    {
      "id": "AC-2",
      "type": "acceptance_criterion",
      "primary": false,
      "flow_ref": "FLOW-GRD-03-FILES-AND-STREAM",
      "title": "Evidence-not-exit-code grading: verdicts cite files and stream offsets; a denied read fails on exit 0",
      "test_tier": "integration",
      "verification_service": "GitHub Actions harness-eval workflow + real harness CLIs + harness-smoke keys",
      "verify": "node --test tests/sprint-01/grd-03-evidence.test.mjs --test-name-pattern FLOW-GRD-03-FILES-AND-STREAM",
      "test_file": "tests/sprint-01/grd-03-evidence.test.mjs",
      "test_function": "FLOW-GRD-03-FILES-AND-STREAM",
      "positive_example": "Controls row exit0-denied-read fail denied_tool_call present next to a raw process_exit_code of 0, and every graded check citing at least 1 evidence path \u2014 module exits 0.",
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "scenario": {
        "tier": "e2e-automated",
        "negative_control": {
          "would_fail_if": [
            "a denied required read with exit 0 graded pass \u2014 the real exit0-denied-read capture yields fail denied_tool_call",
            "an unmapped required fact silently omitted \u2014 version-bumped capture yields could-not-run",
            "the stored exit code could influence the verdict"
          ]
        },
        "evidence": {
          "forms": [
            "CanonicalEvent records with original_event preserved",
            "capture hashes and stream_offset citations",
            "controls row exit0-denied-read"
          ],
          "examples": [
            "source files-and-event-stream count == 4",
            "process_exit_code 0 next to verdict fail",
            "denied_tool_call naming operation and target path"
          ],
          "required_capture": "the raw exit-0 denial capture from T11 qualification with before/after fixture manifests"
        },
        "cases": [
          {
            "start_ref": "seed/live-dispatch-run",
            "action": {
              "actor": "maintainer",
              "steps": [
                "download result artifact",
                "jq claude-code/pinned checks for source and process_exit_code"
              ]
            },
            "end_state": {
              "must_observe": [
                "checks with .source files-and-event-stream count == 4",
                "raw integer `process_exit_code` present as diagnostic",
                "controls row exit0-denied-read fail denied_tool_call"
              ],
              "must_not_observe": [
                "any check where verdict equals an exit-code mapping",
                "pass verdict with non-empty denied_tool_call",
                "opaque events used to infer absence"
              ]
            }
          },
          {
            "start_ref": "seed/streams/exit0-denied-read",
            "action": {
              "actor": "runner",
              "steps": [
                "node tests/sprint-01/flow-runner.mjs grd-03 --fixture exit0-denied-read --expect red"
              ]
            },
            "end_state": {
              "must_observe": [
                "verdict fail with denied_tool_call citing the denial offset while process_exit_code reads 0",
                "mapping-validator \"pass\" on the qualified version"
              ],
              "must_not_observe": [
                "pass or could-not-run on an observable denial",
                "fabricated denial events with no capture provenance"
              ]
            }
          }
        ],
        "topology_note": "InvocationCapture records stdout with byte offsets; stream-grader normalizes to CanonicalEvent; grader cites offsets and capture hashes; live artifact carries source and process_exit_code per check",
        "test_tier": "e2e"
      },
      "red_input": "Base main: no grader exists, module exits 1 with .red. Behavior RED: a verdict equal to its exit-code mapping (pass with exit 0 and a denied-read stream) makes the module exit 1 \u2014 the negative fixture is the recorded deny-under-default-mode stream from T5.",
      "red_proof": ".tmp/sprint-01-verification/grd-03-evidence.json.red",
      "description": "GIVEN seed/live-dispatch-run (RUN_ID + attempt-qualified artifacts via gh run download) WHEN download result artifact; jq claude-code/pinned checks for source and process_exit_code THEN checks with .source files-and-event-stream count == 4; raw integer `process_exit_code` present as diagnostic; controls row exit0-denied-read fail denied_tool_call",
      "maps_to_ac": null
    },
    {
      "id": "AC-3",
      "type": "acceptance_criterion",
      "primary": true,
      "flow_ref": "FLOW-GRD-04-NAMED-PATH",
      "title": "Verify report at the case-declared path naming the planted defect, bound to its producing invocation; no invented filena",
      "test_tier": "integration",
      "verification_service": "GitHub Actions harness-eval workflow + real harness CLIs + harness-smoke keys",
      "verify": "node --test tests/sprint-01/grd-04-named-path.test.mjs --test-name-pattern FLOW-GRD-04-NAMED-PATH",
      "test_file": "tests/sprint-01/grd-04-named-path.test.mjs",
      "test_function": "FLOW-GRD-04-NAMED-PATH",
      "positive_example": "Both reports exist at exactly reports/verify-button-drift.json and reports/verify-clean.json inside their invocation dirs, bodies carrying harness claude-code, track, expected_defect_key atoms/Button/default, observed_defect_key atoms/Button/default \u2014 module exits 0; a swapped-body fixture fails.",
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "scenario": {
        "tier": "e2e-automated",
        "negative_control": {
          "would_fail_if": [
            "the loader accepted ../escape.json, an absolute path, or a symlinked ancestor \u2014 refusal before any write",
            "a decoy reports/verify-button-drift.backup.json planted in the reports dir were read \u2014 no discovery fallback",
            "a report citing no harness output were awarded detection \u2014 copied metadata cannot pass",
            "the planted report were reused unchanged for the clean twin"
          ]
        },
        "evidence": {
          "forms": [
            "VerifyReport JSON at case-declared paths",
            "case manifest declared pre-launch",
            "loader refusal records with directory listings"
          ],
          "examples": [
            "reports/verify-button-drift.json with expected/observed defect_key atoms/Button/default, outcome defect-detected",
            "report .harness claude-code .track pinned matching its cell"
          ],
          "required_capture": "both report files from the live run plus rejection logs and directory listings"
        },
        "cases": [
          {
            "start_ref": "seed/live-dispatch-run",
            "action": {
              "actor": "maintainer",
              "steps": [
                "gh run download verify-reports artifact",
                "jq planted and clean reports"
              ]
            },
            "end_state": {
              "must_observe": [
                "reports/verify-button-drift.json exists with expected_defect_key \"atoms/Button/default\" and outcome \"defect-detected\"",
                "planted report prints \"claude-code pinned\"",
                "detection evidence cites \"capture path/hash\" and event offsets"
              ],
              "must_not_observe": [
                "any report at a path other than the two declared",
                "observed_defect_key == expected with empty evidence",
                "report body harness/track/invocation mismatching its cell"
              ]
            }
          },
          {
            "start_ref": "seed/scratch-invocation-dir",
            "action": {
              "actor": "runner",
              "steps": [
                "plant decoy reports/verify-button-drift.backup.json",
                "node tests/sprint-01/flow-runner.mjs grd-04 --case traversal-escape --expect red",
                "node tests/sprint-01/flow-runner.mjs grd-04 --case decoy-file --expect red"
              ]
            },
            "end_state": {
              "must_observe": [
                "traversal case refused, directory listing shows 0 files written",
                "decoy case cites only the declared path, never \".backup.json\"",
                ".red records \"refusal logs and listings\""
              ],
              "must_not_observe": [
                "any file created before refusal \u2014 the listing shows 0 entries",
                "the decoy filename in any evidence path",
                "a timestamp- or glob-derived path"
              ]
            }
          }
        ],
        "topology_note": "case loader binds declared relative report paths to fresh invocation dirs before launch; keyless evaluator writes VerifyReport only there; confinement negatives run the real loader in a scratch dir",
        "test_tier": "e2e"
      },
      "red_input": "Base main: no case manifest or writer exists, module exits 1 with .red. Confinement RED (exists today as a pure check): a manifest declaring report_relative_path '../escape.json' or '/abs.json' must be rejected by the loader \u2014 run against the loader alone on base it cannot even load, exiting 1.",
      "red_proof": ".tmp/sprint-01-verification/grd-04-named-path.json.red",
      "description": "GIVEN seed/live-dispatch-run (RUN_ID + attempt-qualified artifacts via gh run download) WHEN gh run download verify-reports artifact; jq planted and clean reports THEN reports/verify-button-drift.json exists with expected_defect_key \"atoms/Button/default\" and outcome \"defect-detected\"; planted report prints \"claude-code pinned\"; detection evidence cites \"capture path/hash\" and event offsets",
      "maps_to_ac": null
    },
    {
      "id": "AC-4",
      "type": "acceptance_criterion",
      "primary": false,
      "flow_ref": "FLOW-GRD-05-CLEAN-TWIN",
      "title": "Clean twin is not a verify failure: clean control passes beside a detected planted defect",
      "test_tier": "integration",
      "verification_service": "GitHub Actions harness-eval workflow + real harness CLIs + harness-smoke keys",
      "verify": "node --test tests/sprint-01/grd-05-clean-twin.test.mjs --test-name-pattern FLOW-GRD-05-CLEAN-TWIN",
      "test_file": "tests/sprint-01/grd-05-clean-twin.test.mjs",
      "test_function": "FLOW-GRD-05-CLEAN-TWIN",
      "positive_example": "Fixture with clean report observed_verify_outcome=clean, clean_project_failed=false, distinct invocation_id from the planted report \u2014 module exits 0.",
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "scenario": {
        "tier": "e2e-automated",
        "negative_control": {
          "would_fail_if": [
            "the planted report body passed as the clean twin's \u2014 binding mismatch rejected (swapped-twin): a static body copy must not pass",
            "a clean false positive graded pass",
            "only one report retained on an evaluation pass"
          ]
        },
        "evidence": {
          "forms": [
            "two VerifyReports with distinct invocation_ids",
            "oracle precheck results (planted exit 1 with drifted key; clean exit 0)"
          ],
          "examples": [
            "verify-clean.json clean_project_failed false outcome clean",
            "distinct invocation_id values"
          ],
          "required_capture": "both invocation captures with before/after fixture manifests"
        },
        "cases": [
          {
            "start_ref": "seed/live-dispatch-run",
            "action": {
              "actor": "workflow",
              "steps": [
                "verify on planted copy and clean twin copy as separate invocations",
                "write both reports at declared paths"
              ]
            },
            "end_state": {
              "must_observe": [
                "verify-clean.json clean_project_failed == false outcome clean",
                "cell aggregates \"pass\" with planted \"defect-detected\" plus clean \"pass\"",
                "distinct non-empty `invocation_id` values"
              ],
              "must_not_observe": [
                "identical invocation_id or file hash across reports",
                "clean_project_failed true on clean control",
                "missing or empty clean report on an evaluable run (that is fail \"report-missing\")"
              ]
            }
          },
          {
            "start_ref": "seed/verify-reports-artifact",
            "action": {
              "actor": "runner",
              "steps": [
                "node tests/sprint-01/flow-runner.mjs grd-05 --fixture swapped-twin --expect red"
              ]
            },
            "end_state": {
              "must_observe": [
                "validator rejects the swapped pair citing \"invocation-binding mismatch\"",
                ".red records the tampered pair's \"hashes\""
              ],
              "must_not_observe": [
                "the planted report validating in the clean slot",
                "silent acceptance of a duplicate report (no rejection recorded)"
              ]
            }
          }
        ],
        "topology_note": "VerifyPair runs two fresh invocations (planted overlay vs clean control); evaluator retains both reports; validator enforces body-to-invocation binding",
        "test_tier": "e2e"
      },
      "red_input": "Base main: no twin machinery exists, module exits 1 with .red. Behavior RED: a fixture where the clean invocation's report shows observed_verify_outcome false-positive (clean_project_failed=true) must yield fail \u2014 the module exits 1 on that fixture.",
      "red_proof": ".tmp/sprint-01-verification/grd-05-clean-twin.json.red",
      "description": "GIVEN seed/live-dispatch-run (RUN_ID + attempt-qualified artifacts via gh run download) WHEN verify on planted copy and clean twin copy as separate invocations; write both reports at declared paths THEN verify-clean.json clean_project_failed == false outcome clean; cell aggregates \"pass\" with planted \"defect-detected\" plus clean \"pass\"; distinct non-empty `invocation_id` values",
      "maps_to_ac": null
    },
    {
      "id": "AC-5",
      "type": "acceptance_criterion",
      "primary": true,
      "flow_ref": null,
      "title": "Journey: planted-and-clean verify pair through a real dispatched run, from oracle precheck to summary links",
      "test_tier": "e2e",
      "verification_service": "GitHub Actions harness-eval workflow + real harness CLIs + harness-smoke keys",
      "verify": "node --test tests/sprint-01/jrn-planted-and-twin.test.mjs --test-name-pattern FLOW-JRN-PLANTED-AND-TWIN",
      "test_file": "tests/sprint-01/jrn-planted-and-twin.test.mjs",
      "test_function": "FLOW-JRN-PLANTED-AND-TWIN",
      "positive_example": "One real dispatched run whose artifact chain satisfies: oracle exited 1 on planted with drifted[].key atoms/Button/default and 0 on clean, planted report defect-detected at its declared path, clean report clean, both linked from the summary \u2014 module exits 0.",
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "scenario": {
        "tier": "e2e-automated",
        "negative_control": {
          "would_fail_if": [
            "the planted report went missing from an otherwise-evaluable run and the cell still passed \u2014 fail report-missing",
            "the journey claimed execution from a cached replay instead of a live run \u2014 a static replay must grade not-executed, never pass"
          ]
        },
        "evidence": {
          "forms": [
            "verify-reports pair",
            "live run result cells",
            "oracle precheck transcript"
          ],
          "examples": [
            "planted: atoms/Button/default defect-detected; clean: clean_project_failed false"
          ],
          "required_capture": "live run_id/attempt binding, both invocation captures, maintainer's gate-step-13 reading"
        },
        "cases": [
          {
            "start_ref": "seed/live-dispatch-run",
            "action": {
              "actor": "maintainer",
              "steps": [
                "dispatch",
                "watch to completion",
                "download verify-reports",
                "read the defect name and twin result"
              ]
            },
            "end_state": {
              "must_observe": [
                "planted names \"atoms/Button/default\" with \"defect-detected\"",
                "clean twin clean_project_failed == false",
                "both bound to distinct `invocation_id`s of the same live run"
              ],
              "must_not_observe": [
                "pass claimed from a replay with no live run",
                "either report absent"
              ]
            }
          },
          {
            "start_ref": "seed/verify-reports-artifact",
            "action": {
              "actor": "runner",
              "steps": [
                "delete planted report from a copied artifact",
                "node tests/sprint-01/flow-runner.mjs jrn-planted-twin --fixture missing-planted-report --expect red"
              ]
            },
            "end_state": {
              "must_observe": [
                "validator downgrades the check to fail \"report-missing\" (not could-not-run, not pass)"
              ],
              "must_not_observe": [
                "the missing report excused as could-not-run report-unavailable",
                "a silent pass",
                "no report-missing downgrade recorded for the missing report"
              ]
            }
          }
        ],
        "topology_note": "one live dispatch drives planted verify and clean twin through the real CLI on the runner; maintainer reads both reports; replay revalidates the downloaded pair",
        "test_tier": "e2e"
      },
      "red_input": "Base main: the journey cannot start (no workflow to dispatch, no oracle wrapper) \u2014 module exits 1 with .red.",
      "red_proof": ".tmp/sprint-01-verification/jrn-planted-and-twin.json.red",
      "description": "GIVEN seed/live-dispatch-run (RUN_ID + attempt-qualified artifacts via gh run download) WHEN dispatch; watch to completion; download verify-reports; read the defect name and twin result THEN planted names \"atoms/Button/default\" with \"defect-detected\"; clean twin clean_project_failed == false; both bound to distinct `invocation_id`s of the same live run",
      "maps_to_ac": null
    },
    {
      "id": "TC-1",
      "type": "test_criterion",
      "primary": false,
      "description": "The grader assigns the four checks from files and streams and never from the process exit code",
      "verify": "node --test tests/sprint-01/grd-02-four-grades.test.mjs --test-name-pattern FLOW-GRD-02-FOUR-GRADES",
      "maps_to_ac": "AC-1",
      "test_file": "tests/sprint-01/grd-02-four-grades.test.mjs",
      "test_function": "FLOW-GRD-02-FOUR-GRADES",
      "test_tier": "integration",
      "verification_service": "GitHub Actions harness-eval workflow + real harness CLIs + harness-smoke keys",
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "scenario": {
        "tier": "e2e-automated",
        "negative_control": {
          "would_fail_if": [
            "a question event appeared in any list/status/verify stream and the grader still passed that check (an empty question count must fail ask-nothing)",
            "the must-ask probe graded pass with zero question events or with an answer delivered",
            "a generic status reply passed the status check",
            "verdicts were derived from exit codes instead of streams"
          ]
        },
        "evidence": {
          "forms": [
            "CanonicalEvent streams with original_event bytes and offsets",
            "grade records per check",
            "archived real captures with provenance hashes"
          ],
          "examples": [
            "four check_ids with verdicts for claude-code/pinned",
            "question event count 0 in ask-nothing streams",
            "USER_CHOICE count 1, answers sent 0 in must-ask"
          ],
          "required_capture": "raw captured stdout per invocation with byte offsets, capture hashes, grader evidence citations"
        },
        "cases": [
          {
            "start_ref": "seed/live-dispatch-run",
            "action": {
              "actor": "workflow",
              "steps": [
                "adapter runs the five real invocations via claude -p with stream-json",
                "grader assigns four verdicts from files and streams"
              ]
            },
            "end_state": {
              "must_observe": [
                "claude-code/pinned cell shows all 4 checks \"pass\"",
                "status reply states platform \"web-desktop\", seeded phase, gate state, nonzero inventory counts matching StatusCase",
                "must-ask capture contains exactly 1 valid USER_CHOICE and 0 answer deliveries"
              ],
              "must_not_observe": [
                "any question event in list/status/verify streams",
                "a scripted answer consumed by any first check",
                "an empty checks array or null reason on a pass verdict"
              ]
            }
          },
          {
            "start_ref": "seed/streams/question-in-ask-nothing",
            "action": {
              "actor": "runner",
              "steps": [
                "node tests/sprint-01/flow-runner.mjs grd-02 --fixture question-in-ask-nothing --expect red"
              ]
            },
            "end_state": {
              "must_observe": [
                "grader returns \"fail\" citing the question event offset",
                ".red records the spliced capture's \"provenance hashes\""
              ],
              "must_not_observe": [
                "pass on a stream containing a question",
                "synthetic event JSON with no capture provenance"
              ]
            }
          }
        ],
        "topology_note": "real claude-code CLI executes list/status/planted-verify/clean-verify/must-ask-init; keyless grader reads files plus CanonicalEvent streams; replay runs the same grader over archived real captures",
        "test_tier": "e2e"
      },
      "flow_ref": null,
      "red_input": "a grader that derives a verdict from exit 0 is rejected by the missing-evidence check",
      "positive_example": "the graded cell prints command_list pass, status pass, verify pass, question_before_expensive_work pass next to a raw process_exit_code"
    },
    {
      "id": "TC-2",
      "type": "test_criterion",
      "primary": false,
      "description": "A generic status reply fails the status check, and the exact seeded platform, phase, gate state and inventory counts are required",
      "verify": "node --test tests/sprint-01/grd-02-four-grades.test.mjs --test-name-pattern FLOW-GRD-02-FOUR-GRADES",
      "maps_to_ac": "AC-1",
      "test_file": "tests/sprint-01/grd-02-four-grades.test.mjs",
      "test_function": "FLOW-GRD-02-FOUR-GRADES",
      "test_tier": "integration",
      "verification_service": "GitHub Actions harness-eval workflow + real harness CLIs + harness-smoke keys",
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "scenario": {
        "tier": "e2e-automated",
        "negative_control": {
          "would_fail_if": [
            "a question event appeared in any list/status/verify stream and the grader still passed that check (an empty question count must fail ask-nothing)",
            "the must-ask probe graded pass with zero question events or with an answer delivered",
            "a generic status reply passed the status check",
            "verdicts were derived from exit codes instead of streams"
          ]
        },
        "evidence": {
          "forms": [
            "CanonicalEvent streams with original_event bytes and offsets",
            "grade records per check",
            "archived real captures with provenance hashes"
          ],
          "examples": [
            "four check_ids with verdicts for claude-code/pinned",
            "question event count 0 in ask-nothing streams",
            "USER_CHOICE count 1, answers sent 0 in must-ask"
          ],
          "required_capture": "raw captured stdout per invocation with byte offsets, capture hashes, grader evidence citations"
        },
        "cases": [
          {
            "start_ref": "seed/live-dispatch-run",
            "action": {
              "actor": "workflow",
              "steps": [
                "adapter runs the five real invocations via claude -p with stream-json",
                "grader assigns four verdicts from files and streams"
              ]
            },
            "end_state": {
              "must_observe": [
                "claude-code/pinned cell shows all 4 checks \"pass\"",
                "status reply states platform \"web-desktop\", seeded phase, gate state, nonzero inventory counts matching StatusCase",
                "must-ask capture contains exactly 1 valid USER_CHOICE and 0 answer deliveries"
              ],
              "must_not_observe": [
                "any question event in list/status/verify streams",
                "a scripted answer consumed by any first check",
                "an empty checks array or null reason on a pass verdict"
              ]
            }
          },
          {
            "start_ref": "seed/streams/question-in-ask-nothing",
            "action": {
              "actor": "runner",
              "steps": [
                "node tests/sprint-01/flow-runner.mjs grd-02 --fixture question-in-ask-nothing --expect red"
              ]
            },
            "end_state": {
              "must_observe": [
                "grader returns \"fail\" citing the question event offset",
                ".red records the spliced capture's \"provenance hashes\""
              ],
              "must_not_observe": [
                "pass on a stream containing a question",
                "synthetic event JSON with no capture provenance"
              ]
            }
          }
        ],
        "topology_note": "real claude-code CLI executes list/status/planted-verify/clean-verify/must-ask-init; keyless grader reads files plus CanonicalEvent streams; replay runs the same grader over archived real captures",
        "test_tier": "e2e"
      },
      "flow_ref": null,
      "red_input": "a status grader satisfied by a fixture instruction to mark pass is rejected",
      "positive_example": "the passing status reply names web-desktop plus the seeded phase, gate state and inventory counts"
    },
    {
      "id": "TC-3",
      "type": "test_criterion",
      "primary": false,
      "description": "VerifyReport is written only at the case-declared relative path, with no timestamp, glob or any-new-file fallback",
      "verify": "node --test tests/sprint-01/grd-04-named-path.test.mjs --test-name-pattern FLOW-GRD-04-NAMED-PATH",
      "maps_to_ac": "AC-3",
      "test_file": "tests/sprint-01/grd-04-named-path.test.mjs",
      "test_function": "FLOW-GRD-04-NAMED-PATH",
      "test_tier": "integration",
      "verification_service": "GitHub Actions harness-eval workflow + real harness CLIs + harness-smoke keys",
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "scenario": {
        "tier": "e2e-automated",
        "negative_control": {
          "would_fail_if": [
            "the loader accepted ../escape.json, an absolute path, or a symlinked ancestor \u2014 refusal before any write",
            "a decoy reports/verify-button-drift.backup.json planted in the reports dir were read \u2014 no discovery fallback",
            "a report citing no harness output were awarded detection \u2014 copied metadata cannot pass",
            "the planted report were reused unchanged for the clean twin"
          ]
        },
        "evidence": {
          "forms": [
            "VerifyReport JSON at case-declared paths",
            "case manifest declared pre-launch",
            "loader refusal records with directory listings"
          ],
          "examples": [
            "reports/verify-button-drift.json with expected/observed defect_key atoms/Button/default, outcome defect-detected",
            "report .harness claude-code .track pinned matching its cell"
          ],
          "required_capture": "both report files from the live run plus rejection logs and directory listings"
        },
        "cases": [
          {
            "start_ref": "seed/live-dispatch-run",
            "action": {
              "actor": "maintainer",
              "steps": [
                "gh run download verify-reports artifact",
                "jq planted and clean reports"
              ]
            },
            "end_state": {
              "must_observe": [
                "reports/verify-button-drift.json exists with expected_defect_key \"atoms/Button/default\" and outcome \"defect-detected\"",
                "planted report prints \"claude-code pinned\"",
                "detection evidence cites \"capture path/hash\" and event offsets"
              ],
              "must_not_observe": [
                "any report at a path other than the two declared",
                "observed_defect_key == expected with empty evidence",
                "report body harness/track/invocation mismatching its cell"
              ]
            }
          },
          {
            "start_ref": "seed/scratch-invocation-dir",
            "action": {
              "actor": "runner",
              "steps": [
                "plant decoy reports/verify-button-drift.backup.json",
                "node tests/sprint-01/flow-runner.mjs grd-04 --case traversal-escape --expect red",
                "node tests/sprint-01/flow-runner.mjs grd-04 --case decoy-file --expect red"
              ]
            },
            "end_state": {
              "must_observe": [
                "traversal case refused, directory listing shows 0 files written",
                "decoy case cites only the declared path, never \".backup.json\"",
                ".red records \"refusal logs and listings\""
              ],
              "must_not_observe": [
                "any file created before refusal \u2014 the listing shows 0 entries",
                "the decoy filename in any evidence path",
                "a timestamp- or glob-derived path"
              ]
            }
          }
        ],
        "topology_note": "case loader binds declared relative report paths to fresh invocation dirs before launch; keyless evaluator writes VerifyReport only there; confinement negatives run the real loader in a scratch dir",
        "test_tier": "e2e"
      },
      "flow_ref": null,
      "red_input": "a writer that discovers the newest file in the reports directory passes the check",
      "positive_example": "reports/verify-button-drift.json exists at the declared path and the decoy reports/verify-button-drift.backup.json is absent from every evidence path"
    },
    {
      "id": "TC-4",
      "type": "test_criterion",
      "primary": false,
      "description": "The report body is bound to its producing invocation and carries harness, track, canonical defect key and evidence references",
      "verify": "node --test tests/sprint-01/grd-04-named-path.test.mjs --test-name-pattern FLOW-GRD-04-NAMED-PATH",
      "maps_to_ac": "AC-3",
      "test_file": "tests/sprint-01/grd-04-named-path.test.mjs",
      "test_function": "FLOW-GRD-04-NAMED-PATH",
      "test_tier": "integration",
      "verification_service": "GitHub Actions harness-eval workflow + real harness CLIs + harness-smoke keys",
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "scenario": {
        "tier": "e2e-automated",
        "negative_control": {
          "would_fail_if": [
            "the loader accepted ../escape.json, an absolute path, or a symlinked ancestor \u2014 refusal before any write",
            "a decoy reports/verify-button-drift.backup.json planted in the reports dir were read \u2014 no discovery fallback",
            "a report citing no harness output were awarded detection \u2014 copied metadata cannot pass",
            "the planted report were reused unchanged for the clean twin"
          ]
        },
        "evidence": {
          "forms": [
            "VerifyReport JSON at case-declared paths",
            "case manifest declared pre-launch",
            "loader refusal records with directory listings"
          ],
          "examples": [
            "reports/verify-button-drift.json with expected/observed defect_key atoms/Button/default, outcome defect-detected",
            "report .harness claude-code .track pinned matching its cell"
          ],
          "required_capture": "both report files from the live run plus rejection logs and directory listings"
        },
        "cases": [
          {
            "start_ref": "seed/live-dispatch-run",
            "action": {
              "actor": "maintainer",
              "steps": [
                "gh run download verify-reports artifact",
                "jq planted and clean reports"
              ]
            },
            "end_state": {
              "must_observe": [
                "reports/verify-button-drift.json exists with expected_defect_key \"atoms/Button/default\" and outcome \"defect-detected\"",
                "planted report prints \"claude-code pinned\"",
                "detection evidence cites \"capture path/hash\" and event offsets"
              ],
              "must_not_observe": [
                "any report at a path other than the two declared",
                "observed_defect_key == expected with empty evidence",
                "report body harness/track/invocation mismatching its cell"
              ]
            }
          },
          {
            "start_ref": "seed/scratch-invocation-dir",
            "action": {
              "actor": "runner",
              "steps": [
                "plant decoy reports/verify-button-drift.backup.json",
                "node tests/sprint-01/flow-runner.mjs grd-04 --case traversal-escape --expect red",
                "node tests/sprint-01/flow-runner.mjs grd-04 --case decoy-file --expect red"
              ]
            },
            "end_state": {
              "must_observe": [
                "traversal case refused, directory listing shows 0 files written",
                "decoy case cites only the declared path, never \".backup.json\"",
                ".red records \"refusal logs and listings\""
              ],
              "must_not_observe": [
                "any file created before refusal \u2014 the listing shows 0 entries",
                "the decoy filename in any evidence path",
                "a timestamp- or glob-derived path"
              ]
            }
          }
        ],
        "topology_note": "case loader binds declared relative report paths to fresh invocation dirs before launch; keyless evaluator writes VerifyReport only there; confinement negatives run the real loader in a scratch dir",
        "test_tier": "e2e"
      },
      "flow_ref": null,
      "red_input": "a report whose harness, track or invocation_id does not match its cell is accepted",
      "positive_example": "the planted report reads claude-code pinned with observed_defect_key atoms/Button/default and cites its capture hash and event offsets"
    },
    {
      "id": "TC-5",
      "type": "test_criterion",
      "primary": false,
      "description": "A clean twin is not a verify failure, and the two reports are distinguishable by invocation",
      "verify": "node --test tests/sprint-01/grd-05-clean-twin.test.mjs --test-name-pattern FLOW-GRD-05-CLEAN-TWIN",
      "maps_to_ac": "AC-4",
      "test_file": "tests/sprint-01/grd-05-clean-twin.test.mjs",
      "test_function": "FLOW-GRD-05-CLEAN-TWIN",
      "test_tier": "integration",
      "verification_service": "GitHub Actions harness-eval workflow + real harness CLIs + harness-smoke keys",
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "scenario": {
        "tier": "e2e-automated",
        "negative_control": {
          "would_fail_if": [
            "the planted report body passed as the clean twin's \u2014 binding mismatch rejected (swapped-twin): a static body copy must not pass",
            "a clean false positive graded pass",
            "only one report retained on an evaluation pass"
          ]
        },
        "evidence": {
          "forms": [
            "two VerifyReports with distinct invocation_ids",
            "oracle precheck results (planted exit 1 with drifted key; clean exit 0)"
          ],
          "examples": [
            "verify-clean.json clean_project_failed false outcome clean",
            "distinct invocation_id values"
          ],
          "required_capture": "both invocation captures with before/after fixture manifests"
        },
        "cases": [
          {
            "start_ref": "seed/live-dispatch-run",
            "action": {
              "actor": "workflow",
              "steps": [
                "verify on planted copy and clean twin copy as separate invocations",
                "write both reports at declared paths"
              ]
            },
            "end_state": {
              "must_observe": [
                "verify-clean.json clean_project_failed == false outcome clean",
                "cell aggregates \"pass\" with planted \"defect-detected\" plus clean \"pass\"",
                "distinct non-empty `invocation_id` values"
              ],
              "must_not_observe": [
                "identical invocation_id or file hash across reports",
                "clean_project_failed true on clean control",
                "missing or empty clean report on an evaluable run (that is fail \"report-missing\")"
              ]
            }
          },
          {
            "start_ref": "seed/verify-reports-artifact",
            "action": {
              "actor": "runner",
              "steps": [
                "node tests/sprint-01/flow-runner.mjs grd-05 --fixture swapped-twin --expect red"
              ]
            },
            "end_state": {
              "must_observe": [
                "validator rejects the swapped pair citing \"invocation-binding mismatch\"",
                ".red records the tampered pair's \"hashes\""
              ],
              "must_not_observe": [
                "the planted report validating in the clean slot",
                "silent acceptance of a duplicate report (no rejection recorded)"
              ]
            }
          }
        ],
        "topology_note": "VerifyPair runs two fresh invocations (planted overlay vs clean control); evaluator retains both reports; validator enforces body-to-invocation binding",
        "test_tier": "e2e"
      },
      "flow_ref": null,
      "red_input": "a swapped pair where the planted body sits in the clean slot validates",
      "positive_example": "verify-clean.json reads clean_project_failed=false and its invocation_id differs from the planted report's"
    },
    {
      "id": "TC-6",
      "type": "test_criterion",
      "primary": false,
      "description": "A missing case-declared report after an otherwise evaluable run is fail report-missing, not could-not-run and not pass",
      "verify": "node --test tests/sprint-01/jrn-planted-and-twin.test.mjs --test-name-pattern FLOW-JRN-PLANTED-AND-TWIN",
      "maps_to_ac": "AC-5",
      "test_file": "tests/sprint-01/jrn-planted-and-twin.test.mjs",
      "test_function": "FLOW-JRN-PLANTED-AND-TWIN",
      "test_tier": "e2e",
      "verification_service": "GitHub Actions harness-eval workflow + real harness CLIs + harness-smoke keys",
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "scenario": {
        "tier": "e2e-automated",
        "negative_control": {
          "would_fail_if": [
            "the planted report went missing from an otherwise-evaluable run and the cell still passed \u2014 fail report-missing",
            "the journey claimed execution from a cached replay instead of a live run \u2014 a static replay must grade not-executed, never pass"
          ]
        },
        "evidence": {
          "forms": [
            "verify-reports pair",
            "live run result cells",
            "oracle precheck transcript"
          ],
          "examples": [
            "planted: atoms/Button/default defect-detected; clean: clean_project_failed false"
          ],
          "required_capture": "live run_id/attempt binding, both invocation captures, maintainer's gate-step-13 reading"
        },
        "cases": [
          {
            "start_ref": "seed/live-dispatch-run",
            "action": {
              "actor": "maintainer",
              "steps": [
                "dispatch",
                "watch to completion",
                "download verify-reports",
                "read the defect name and twin result"
              ]
            },
            "end_state": {
              "must_observe": [
                "planted names \"atoms/Button/default\" with \"defect-detected\"",
                "clean twin clean_project_failed == false",
                "both bound to distinct `invocation_id`s of the same live run"
              ],
              "must_not_observe": [
                "pass claimed from a replay with no live run",
                "either report absent"
              ]
            }
          },
          {
            "start_ref": "seed/verify-reports-artifact",
            "action": {
              "actor": "runner",
              "steps": [
                "delete planted report from a copied artifact",
                "node tests/sprint-01/flow-runner.mjs jrn-planted-twin --fixture missing-planted-report --expect red"
              ]
            },
            "end_state": {
              "must_observe": [
                "validator downgrades the check to fail \"report-missing\" (not could-not-run, not pass)"
              ],
              "must_not_observe": [
                "the missing report excused as could-not-run report-unavailable",
                "a silent pass",
                "no report-missing downgrade recorded for the missing report"
              ]
            }
          }
        ],
        "topology_note": "one live dispatch drives planted verify and clean twin through the real CLI on the runner; maintainer reads both reports; replay revalidates the downloaded pair",
        "test_tier": "e2e"
      },
      "flow_ref": null,
      "red_input": "a missing report excused as could-not-run report-unavailable passes the check",
      "positive_example": "the deleted-planted-report fixture grades fail report-missing while an unwritable artifact store still grades could-not-run report-unavailable"
    }
  ]
}
-->


## Handoff

```json
{
  "task": "T7",
  "commit_sha": "a0badf607c27ae323579e9b4a8b16d19875708ba",
  "done": "PROVISIONAL SUBSTITUTE-AUTHOR DRAFT — unapproved reconstruction of landed bytes, not original-author testimony or a completion claim. T7 landed deterministic four-check cell grading (command_list, status, verify, question_before_expensive_work), report writing/reading at case-declared paths, planted/clean invocation binding, capture file/hash/span resolution, refusal and aggregate reasons, and per-check grade persistence under test/harness/graders/ and test/harness/grade/. The candidate adds ten files/changes over frozen base 34f826229e8e7768f19869ca18cb691876efb58b, with five test files extended and flow-runner.mjs unchanged. Saved cycle-2 review APPROVED the candidate; merge e220cdfcc2fa1ae1c850389873f1e0a0aa731ccb is recorded. Handoff delivery remains pending for registered implementer session e9b680c3-a505-49e. This recovery prepared only this draft and T7.evidence.md; it performed no new runtime verification, implementation, receipt authorship, handoff recording, or task completion.",
  "deviations": [
    "Historical local checks do not enact all live acceptance observations. FLOW-GRD-02-FOUR-GRADES is DEFERRED on T9; FLOW-GRD-03-FILES-AND-STREAM is DEFERRED on T9/T11 in the frozen context/review. The named-path and clean-twin flow PASS records retain not-executed hosted artifact legs; the journey check passed local failure lanes while its real dispatch and model-produced pair remained unobserved.",
    "The local VerifyReports are constructed by runVerifyCase from the shipped keyless verify-catalog oracle over structural-only text fixtures. This proves the local oracle/writer/grader path, not that a real harness invoked verification and produced those reports. Hash equality and an in-bounds span prove cited bytes exist; they do not independently authenticate a harness producer or the truth of a copied outcome.",
    "Preserved test-only substitutes: grd-04 lines 155-177 inject canned oracle results for derivation controls; the journey defines modelGh test doubles; grd-02 authors a USER_CHOICE splice and earlier must-ask branch-conformance records; grd-03 includes authored denial/exit-0 controls. They are not real provider/hosted evidence and this draft grants no mock exception.",
    "Cycle-2 reviewer recaptured missing gitignored RED proofs from base plus candidate tests; those base REDs fail ERR_MODULE_NOT_FOUND. Stronger overlaid-test REDs against prior candidate b2c89475f186634b88043887f5d9940385e3be42 demonstrate the grd-04/grd-05 repairs; the journey was NOT_RED against that prior candidate. These are historical reviewer captures, not original-author RED testimony."
  ],
  "concerns": [
    "U-T7-1/U-T7-2/U-T7-3 remain OPEN in the frozen review: no qualified hosted four-pass cell, downloaded real verify-reports artifact, or end-to-end dispatched journey was established. Historical preconditions recorded absent SMOKE_CLAUDE_KEY and HARNESS_EVAL_RUN_ID, local Claude Code 2.1.312 versus pin 2.1.291, and remote workflow HTTP 404. Review E-28 says local main was 57 commits ahead of origin/main; this is historical, not a current remote-state claim.",
    "F-T7-9 remains ADVISORY: gradeCell trusts caller-supplied evidence_roots; repo-wide roots can admit unrelated/sibling files, statSync follows symlinks, and relative citations are checked under the first matching root only. validate.mjs:assertPassEvidence remains a shape-only backstop; the frozen grd-01 test requires a nonexistent citation not to be flagged.",
    "F-T7-10 remains ADVISORY: grd-05-clean-twin.test.mjs:319/321 declares failures twice, overwriting the derived array with []. Source inspection also finds the same duplicate at jrn-planted-and-twin.test.mjs:777/782 and literal awaiting rows at 778-780, contradicting review E-25/E-26 descriptions that the journey has one derived failures field and artifact-derived awaiting. This source-observed discrepancy has no new review disposition.",
    "U-T7-4 remains OPEN: RED proofs vanished with the recreated worktree before historical reviewer recapture. Retained copies exist, but lifecycle ownership/durability is unresolved. The historical hosted-preconditions text prints HTTP 404 beside exit=0 and leaves pin_manifest_expected blank; treat the response and reviewed source as evidence, not that shell exit as successful dispatch.",
    "No owner authorization for substitute authorship, native substitute envelope, original-session response, or completion authority is supplied by this draft. The registered original session is historical/unreachable here as stated in the recovery brief. Git author fields do not establish native-session authorship."
  ],
  "findings": [
    "Frozen cycle 1 was NEEDS_FIXES at b2c89475f186634b88043887f5d9940385e3be42. Cycle 2 marks F-T7-1 and F-T7-2 FIXED, with byte resolution and pass-citation refusals; its summary reports repairs for F-T7-3 through F-T7-8, but those six structured rows still say ADVISORY with null resolution. Preserve that inconsistency; do not silently mark the rows closed. F-T7-3 shared-hash dead code and F-T7-6 artifact residues also retain limits.",
    "Historical review E-01..E-05 records the exact five node --test commands and exit 0 (26, 8, 20, 16, 16 tests). The logs show command_list could-not-run, seeded status mismatch fail, local verify pass, archived ask-nothing pass, and an aggregate could-not-run. Test-suite pass is not the four-pass hosted cell.",
    "Historical cycle-2 mutation battery records 14/14 mutants KILLED. Historical gate runner logs record PASS for named-path, clean-twin, and the local journey wrapper while explicitly retaining hosted not-executed diagnostics. This reconstruction rechecked hashes for all 30 artifacts referenced by the cycle-2 verdict, plus the landing-bound context/bundle; it did not rerun tests or infer real provider proof.",
    "Detailed candidate/source line citations, exact historical invocation index, artifact hashes, known evidence contradictions, and provenance limits are in .kb-run-sprint/sprint-01-evaluator-evidence-spine/recovery/handoff-drafts/T7.evidence.md."
  ],
  "scope_impact": [
    {
      "target": "T7",
      "found": "Landed candidate has pending original-author handoff and no approved substitute authority.",
      "change": "Keep this reconstruction provisional; require the original native report or an explicit owner-authorized substitute path before any recording/completion. No task status is changed here."
    },
    {
      "target": "GATE:FLOW-GRD-02-FOUR-GRADES",
      "found": "Frozen flow DEFERRED on T9; no real pinned four-pass cell or genuine must-ask boundary stop was established.",
      "change": "Retain the deferred boundary and require the existing integrated hosted obligation to produce qualified captures and all four observations."
    },
    {
      "target": "GATE:FLOW-GRD-03-FILES-AND-STREAM",
      "found": "Frozen flow DEFERRED on T9/T11; local controls and shape validation do not prove a hosted exit-0 denial or trustworthy production citations.",
      "change": "Retain the deferred boundary, F-T7-9, and shape-backstop limitation for downstream integration/review; no new scope is implemented."
    },
    {
      "target": "T11",
      "found": "T7 historical reports preserve unexecuted hosted model invocations and live verify-report artifacts; invocation owners differ between old diagnostics and later artifact rows.",
      "change": "Use existing T11 integration obligations to establish real provider-produced reports and captures; do not reinterpret local PASS or synthetic controls as that proof."
    },
    {
      "target": "T12",
      "found": "Historical APPROVED review retains F-T7-9/F-T7-10, stale advisory row dispositions, and newly observed journey artifact contradictions.",
      "change": "Carry these exact source/evidence limits into the independent cross-task receipt audit without claiming current disposition or silently correcting the frozen review."
    },
    {
      "target": "GATE:FLOW-GRD-04-NAMED-PATH",
      "found": "Historical PASS covers real local filesystem/oracle operations; hosted artifact download remained not-executed.",
      "change": "Preserve U-T7-2/U-T7-4 and require existing hosted evidence to establish same-run provenance and the exact two report paths before gate acceptance."
    },
    {
      "target": "GATE:FLOW-GRD-05-CLEAN-TWIN",
      "found": "Historical PASS retains the unexecuted hosted twin and duplicate failures key; journey has an additional duplicate not identified by the frozen finding.",
      "change": "Preserve these as unresolved evidence limits; route any repair through its owning task/review rather than altering product or receipts in recovery."
    }
  ],
  "feedback": [
    "Keep local deterministic oracle proof, synthetic/mocked branch checks, frozen review approval, hosted qualification, original authorship, and completion as separate claims.",
    "No runtime launches, test mutations, product/state edits, Git lifecycle actions, or native receipt/envelope fabrication occurred in this preparation. Only the two assigned recovery draft files were written."
  ]
}
```
