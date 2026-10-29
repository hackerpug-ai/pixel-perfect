# TASK-T11: Qualify the negative controls on a real hosted run and record them in the result's controls array

> Task ID: T11
> Sprint: [SPRINT.md](./SPRINT.md)
> Status: Backlog
> Assignee: evals-implementer
> Priority: P1
> Points: 5
> Type: FEATURE
> Planner: evals-planner
> Proposed By: github-agentic-workflow-planner + evals-planner
> TDD_MODE: red_first · RED_GREEN_REQUIRED: true

AGENT: planner=evals-planner | implementer=evals-implementer | reviewer=evals-reviewer

**Depends on:** T5 (claude-code-cells@v1), T7 (grader@v1), T8 (recorder@v1), T9 (env-wiring@v1)
**Blocks:** T12 (its code needs this task's landed work)

## Background

- **Source:** `.spec/prds/harness-eval-framework/09-technical-requirements/03-data-schema.md` (InvocationCapture, PermissionStance, HarnessEvalResult.controls), `02-system-components.md` (invocation-guard, stream-grader, smoke matrix), `09-capability-chains.md` (controls@v1)
- **Human testing gate steps that exercise this task:** 11
- **PRD references:** `03-data-schema.md` § InvocationCapture / PermissionStance, § Negative controls; `02-system-components.md` § smoke matrix, § stream-grader; `04-uc-grd.md` UC-GRD-03 AC-3, UC-GRD-06; `10-e2e-testing-criteria.md` T-GRD-012, T-GRD-021, T-GRD-022
- **Capabilities touched:** CAP-EVAL-01
- **Why it matters:** a grader that has only ever seen correct input is unproven. The four negative controls are the only evidence that the framework refuses: a stale cache must not become candidate evidence, a missing key must not become a pass, a clean exit with a denied read must not become a pass, and a hidden screenshot judge must not be invisible. Qualifying them on a real hosted run is what turns the claim into a receipt.
- **Current (what this task consumes):** T5's live claude-code cells, T7's graders, T8's recorder contract, T9's `harness-smoke` credential wiring.
- **Desired (what this task provides):** the four negative controls exercised on a real hosted run and recorded in the result's `controls` array — `missing-key` → `could-not-run missing-api-key`, `stale-cache` → `could-not-run installation-identity-mismatch`, `exit0-denied-read` → `fail denied_tool_call` beside a raw `process_exit_code` of 0, and `hidden-image-judge` → a child-tree scan proving no screenshot judging occurred.
- **Boundary contracts:** a control that cannot be observed is could-not-run, never pass; an intentional question-boundary stop is a distinct termination kind; denied required reads are failures even on exit 0; observed image judging is fail even when its score is hidden.

## Critical Constraints

- MUST record four controls in the result's `controls` array with these exact verdict/reason pairs: `missing-key` → `could-not-run` / `missing-api-key`, `stale-cache` → `could-not-run` / `installation-identity-mismatch`, `exit0-denied-read` → `fail` / `denied_tool_call`, and one `hidden-image-judge` row carrying its child-tree scan evidence.
- MUST qualify every control on a real hosted run — a local replay or a synthesised control row MUST NOT stand in for the hosted receipt.
- MUST pair each refusal with a real authenticated call using the same binding, so a guard that always refuses is exposed as a static always-refusing guard.
- MUST scan the whole verify child tree (tool calls and model requests) for image input; inaccessible child activity makes the control could-not-run, never pass.
- MUST remove the actually consumed key and every allowed alternative credential source for the missing-key control, and MUST assert env absence before asserting the refusal.

## Specification

- **Objective:** Prove on a real hosted run that the framework refuses four specific ways, and record that proof where the maintainer reads it.
- **Success state:** The finished run's `controls` array holds all four controls with their exact verdict/reason pairs, each paired with an authenticated control, and the `hidden-image-judge` row carries child-tree scan evidence.

## Acceptance Criteria (GIVEN-WHEN-THEN)

### AC-1: Evidence-not-exit-code grading: verdicts cite files and stream offsets; a denied read fails on exit 0

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

### AC-2: Missing credential fails closed: could-not-run missing-api-key before any model request, never readable as pass

- **GIVEN:** seed/env/key-removed (missing-key refusal capture with zero model events)
- **WHEN:** run guard-evaluated invocation with ANTHROPIC_API_KEY and all fallbacks removed; run paired authenticated invocations in the same workflow
- **THEN:** controls row missing-key reads "could-not-run missing-api-key"; missing-key capture has 0 model-request events before refusal; paired authenticated cells grade "pass" (guard fires on absence, not unconditionally); cursor/pinned reason == "missing-api-key" from the same guard path

```text
FLOW_REF:              FLOW-GRD-06-MISSING-KEY
TEST_TIER:             integration
VERIFICATION_SERVICE:  GitHub Actions harness-eval workflow + real harness CLIs + harness-smoke keys
SURFACE_POLICY:        .spec/e2e-policy/sprint-01/artifact-only-read.json
TDD_STATE:             none
TEST_FILE:             tests/sprint-01/grd-06-missing-key.test.mjs
TEST_FUNCTION:         FLOW-GRD-06-MISSING-KEY
VERIFY:                node --test tests/sprint-01/grd-06-missing-key.test.mjs --test-name-pattern FLOW-GRD-06-MISSING-KEY
```

- **RED input (fails on base):** Base main: no guard exists, module exits 1 with .red. Behavior RED: env with ANTHROPIC_API_KEY unset and all fallback stores absent — guard must refuse with missing-api-key and zero model requests in the capture; on base nothing refuses, exit 1.
- **RED proof:** `.tmp/sprint-01-verification/grd-06-missing-key.json.red`
- **positive_example (passes after landing):** Controls row missing-key could-not-run missing-api-key with an empty request stream, paired with the authenticated claude-code pass rows from the same run — module exits 0.

SCENARIO_SUMMARY: complete SCENARIO lives once, in this AC's row of the REQUIREMENT-CONTRACT block below.

## Test Criteria

Each TC is an assertion inside its mapped AC's VERIFY command; its fail input and positive example are on its row in the REQUIREMENT-CONTRACT block.

| TC | Statement | Maps to |
|----|-----------|---------|

## Reading List

1. `.spec/prds/harness-eval-framework/09-technical-requirements/03-data-schema.md` § InvocationCapture / PermissionStance, § HarnessEvalResult (the `controls` array) — the control vocabulary and the child-tree rule
2. `.spec/prds/harness-eval-framework/09-technical-requirements/02-system-components.md` § smoke matrix, § stream-grader — where the controls run and what makes evidence complete
3. `.spec/prds/harness-eval-framework/10-e2e-testing-criteria.md` T-GRD-006, T-GRD-012, T-GRD-021, T-GRD-022 — the criteria the controls prove
4. `.spec/prds/harness-eval-framework/09-technical-requirements/08-technical-risks.md` — the stale-cache and hidden-judge risks these controls mitigate
5. `test/harness/controls/` — the directory this task creates (control definitions and the child-tree scanner)

Coding standards:

- `AGENTS.md`
- `brain/docs/TDD-METHODOLOGY.md`
- `brain/docs/kanban/SCENARIO-CONTRACT-V1.md`

## Guardrails

WRITE-ALLOWED:

- test/harness/controls/**
- tests/sprint-01/grd-06-missing-key.test.mjs
- tests/sprint-01/grd-03-evidence.test.mjs
- tests/sprint-01/flow-runner.mjs

WRITE-PROHIBITED:

- plugins/pixel-perfect/**
- Any file not listed in write_allowed

## Code Pattern

```js
const CONTROLS = [
  { control_id: "missing-key",       expect: ["could-not-run", "missing-api-key"] },
  { control_id: "stale-cache",       expect: ["could-not-run", "installation-identity-mismatch"] },
  { control_id: "exit0-denied-read", expect: ["fail", "denied_tool_call"] },
  { control_id: "hidden-image-judge",expect: ["pass", "no-image-judge-in-child-tree"] },
];
// a control that could not be observed is could-not-run, never pass
for (const c of CONTROLS) record(c.control_id, observe(c) ?? { verdict: "could-not-run", reason: "control-unobservable" });
```

- **Source:** `.spec/prds/harness-eval-framework/09-technical-requirements/03-data-schema.md` § InvocationCapture / PermissionStance
- **Anti-pattern:** Recording a control pass from a local replay; a `missing-key` row with no paired authenticated control; an `exit0-denied-read` row whose verdict equals its exit code; a `hidden-image-judge` row with no child-tree scan behind it.

## Design

None. The controls land in the result artifact and the run summary, not on a screen.

## Agent Instructions

Work each AC as one RED, GREEN, REFACTOR cycle in AC order. AC-1's RED is the keyless environment with the consumed key and every fallback store removed: on base nothing refuses and the module exits 1. AC-2's RED is the `key-present-misfire` fixture, where a static always-refusing guard emits `missing-api-key` on a key-present environment and must be rejected. Never qualify a control against a replay; the receipt must name the hosted run and attempt.

- **AC-1:** `FLOW-GRD-03-FILES-AND-STREAM` in `tests/sprint-01/grd-03-evidence.test.mjs`, seeded from `seed/live-dispatch-run`.
- **AC-2:** `FLOW-GRD-06-MISSING-KEY` in `tests/sprint-01/grd-06-missing-key.test.mjs`, seeded from `seed/env/key-removed`.

## Orchestrator Verification Protocol

1. **VERIFY_RED:** on base `main` both VERIFY commands exit non-zero and the `.red` proofs exist at `.tmp/sprint-01-verification/grd-03-evidence.json.red` and `.tmp/sprint-01-verification/grd-06-missing-key.json.red`.
2. **VERIFY_GREEN:** both VERIFY commands exit 0; the downloaded artifact's `controls` array prints all four rows with their exact verdict/reason pairs, and the `hidden-image-judge` row carries child-tree scan evidence.
3. Run every Evidence Gate and compare with Expected.
4. `git diff --name-only` lists only WRITE-ALLOWED paths; `plugins/pixel-perfect/**` is untouched.
5. Dispatch `evals-reviewer` with this file, the RED and GREEN outputs, and the evidence.

## Agent Assignment

- **Planner role:** `evals-planner`
- **Implementer role:** `evals-implementer`
- **Reviewer role:** `evals-reviewer`
- **Rationale:** `evals-implementer` owns the eval/grading surface this task lands; `evals-reviewer` audits oracle strength, fixture reality and negative-path coverage.
- **Pairing:** `evals-implementer` builds; `evals-reviewer` reviews adversarially against the Review Criteria below.

## Evidence Gates

- **AC-1:** `node --test tests/sprint-01/grd-03-evidence.test.mjs --test-name-pattern FLOW-GRD-03-FILES-AND-STREAM`. Expected: prints the TAP `ok` line for FLOW-GRD-03-FILES-AND-STREAM after the exit0-denied-read control reads fail `denied_tool_call` beside a raw process_exit_code of 0
- **AC-2:** `node --test tests/sprint-01/grd-06-missing-key.test.mjs --test-name-pattern FLOW-GRD-06-MISSING-KEY`. Expected: prints the TAP `ok` line for FLOW-GRD-06-MISSING-KEY after the keyless capture holds 0 model-request events before the refusal
- **controls:** `jq -r '.controls[] | .control_id + " " + .verdict + " " + .reason' /tmp/he1/harness-eval-result.json`. Expected: prints exactly four rows: `missing-key could-not-run missing-api-key`, `stale-cache could-not-run installation-identity-mismatch`, `exit0-denied-read fail denied_tool_call`, and a `hidden-image-judge` row with its scan reason

## Review Criteria

Must pass:

- One test per AC, named exactly as its TEST_FUNCTION, in its TEST_FILE.
- RED evidence for every AC; the key-present-misfire RED is a real with-key run, not a hand-written fixture.
- All four controls are present with their exact verdict/reason pairs and are bound to a real hosted run and attempt.
- The `hidden-image-judge` row carries child-tree scan evidence, and an inaccessible child is could-not-run.
- `git diff --name-only` lists only WRITE-ALLOWED paths.

Should verify:

- Each refusal is paired with a real authenticated call using the same binding.
- The `stale-cache` control records both digests and is never attributed to the candidate.
- No secret value appears in any control capture, log or evidence file.

Verdict: APPROVED or NEEDS_FIXES, with file and line for each finding.

## Dependencies

- **Depends on:** T5 (claude-code-cells@v1), T7 (grader@v1), T8 (recorder@v1), T9 (env-wiring@v1)
- **Blocks:** T12 (its code needs this task's landed work)

A shared file is not a dependency, and needing another task's output to test against is that flow's integration obligation, not an edge.

## Out of Scope

- Implementing the guard or the graders (T3 and T7 own them; this task exercises them).
- Adding a fifth control or changing the four names.
- Deciding the release effect of a control — the recorder and the release resolver own that.

## Context

- **Current state:** No negative control exists, so no refusal has ever been demonstrated on a hosted run.
- **Gap:** Without the controls, 'a clean exit is not a pass' and 'a missing key cannot read as a pass' are claims, not receipts.

## Notes

- **Flow ownership:** this task is the PRIMARY owner of `FLOW-GRD-06-MISSING-KEY` and exercises `FLOW-GRD-03-FILES-AND-STREAM` (T6 owns it) at gate steps 10 and 11. Its own consumers are none; T12 reviews it.
- **Read-only dependency on the hosted run:** this task cannot pass on a machine-local replay. If the hosted run is unavailable the controls are could-not-run and the task is not done.
- **Split check:** not triggered — 5 points, one failure mode (an unproven refusal).
- **Owner:** evals-planner; sprint `sprint-01-evaluator-evidence-spine`.

<!-- REQUIREMENT-CONTRACT v1 -->
<!--
{
  "version": "1",
  "task_id": "T11",
  "task_type": "FEATURE",
  "tdd_mode": "red_first",
  "verification_policy": {
    "requires_tests": true,
    "requires_red_evidence": true,
    "requires_seeded_evidence": true
  },
  "guardrails": {
    "write_allowed": [
      "test/harness/controls/**",
      "tests/sprint-01/grd-06-missing-key.test.mjs",
      "tests/sprint-01/grd-03-evidence.test.mjs",
      "tests/sprint-01/flow-runner.mjs"
    ],
    "write_prohibited": [
      "plugins/pixel-perfect/**"
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
  "integration_obligations": [],
  "requirements": [
    {
      "id": "AC-1",
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
      "id": "AC-2",
      "type": "acceptance_criterion",
      "primary": false,
      "flow_ref": "FLOW-GRD-06-MISSING-KEY",
      "title": "Missing credential fails closed: could-not-run missing-api-key before any model request, never readable as pass",
      "test_tier": "integration",
      "verification_service": "GitHub Actions harness-eval workflow + real harness CLIs + harness-smoke keys",
      "verify": "node --test tests/sprint-01/grd-06-missing-key.test.mjs --test-name-pattern FLOW-GRD-06-MISSING-KEY",
      "test_file": "tests/sprint-01/grd-06-missing-key.test.mjs",
      "test_function": "FLOW-GRD-06-MISSING-KEY",
      "positive_example": "Controls row missing-key could-not-run missing-api-key with an empty request stream, paired with the authenticated claude-code pass rows from the same run \u2014 module exits 0.",
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "scenario": {
        "tier": "e2e-automated",
        "negative_control": {
          "would_fail_if": [
            "the guard recorded missing-api-key while the key was present (key-present-misfire: a static always-refusing guard)",
            "any model request appeared in the missing-key capture before the refusal \u2014 control invalid",
            "the missing-key result readable as pass anywhere",
            "the cursor cell reason came from a special-cased string instead of the guard code path"
          ]
        },
        "evidence": {
          "forms": [
            "controls rows control_id/verdict/reason",
            "missing-key capture empty of model events",
            "cursor cell reason string"
          ],
          "examples": [
            "missing-key could-not-run missing-api-key",
            "stale-cache could-not-run installation-identity-mismatch",
            "exit0-denied-read fail denied_tool_call",
            "hidden-image-judge row with child-tree scan evidence",
            "cursor reason identical to the control row's reason"
          ],
          "required_capture": "the keyless step's env-absence assertion, its capture with zero model events before refusal, and the authenticated cells' passes in the same run"
        },
        "cases": [
          {
            "start_ref": "seed/env/key-removed",
            "action": {
              "actor": "workflow",
              "steps": [
                "run guard-evaluated invocation with ANTHROPIC_API_KEY and all fallbacks removed",
                "run paired authenticated invocations in the same workflow"
              ]
            },
            "end_state": {
              "must_observe": [
                "controls row missing-key reads \"could-not-run missing-api-key\"",
                "missing-key capture has 0 model-request events before refusal",
                "paired authenticated cells grade \"pass\" (guard fires on absence, not unconditionally)",
                "cursor/pinned reason == \"missing-api-key\" from the same guard path"
              ],
              "must_not_observe": [
                "pass on the keyless cell",
                "0 model requests in the keyless capture",
                "the authenticated control also recording missing-api-key"
              ]
            }
          },
          {
            "start_ref": "seed/env/anthropic-key-present",
            "action": {
              "actor": "runner",
              "steps": [
                "node tests/sprint-01/flow-runner.mjs grd-06 --fixture key-present-misfire --expect red"
              ]
            },
            "end_state": {
              "must_observe": [
                "guard does not emit \"missing-api-key\" when the binding is present",
                ".red records the with-key guard decision (\"no missing-api-key refusal\")"
              ],
              "must_not_observe": [
                "a \"missing-api-key\" refusal on a key-present environment (the fallback-store enumeration comes up empty)",
                "refusal logged before the credential check ran"
              ]
            }
          }
        ],
        "topology_note": "invocation-guard evaluates the credential binding inside the real workflow; one control step runs with the key actually removed; paired authenticated cells in the same run; results in the controls array",
        "test_tier": "e2e"
      },
      "red_input": "Base main: no guard exists, module exits 1 with .red. Behavior RED: env with ANTHROPIC_API_KEY unset and all fallback stores absent \u2014 guard must refuse with missing-api-key and zero model requests in the capture; on base nothing refuses, exit 1.",
      "red_proof": ".tmp/sprint-01-verification/grd-06-missing-key.json.red",
      "description": "GIVEN seed/env/key-removed (missing-key refusal capture with zero model events) WHEN run guard-evaluated invocation with ANTHROPIC_API_KEY and all fallbacks removed; run paired authenticated invocations in the same workflow THEN controls row missing-key reads \"could-not-run missing-api-key\"; missing-key capture has 0 model-request events before refusal; paired authenticated cells grade \"pass\" (guard fires on absence, not unconditionally); cursor/pinned reason == \"missing-api-key\" from the same guard path",
      "maps_to_ac": null
    },
    {
      "id": "TC-1",
      "type": "test_criterion",
      "primary": false,
      "description": "The missing-key control refuses before any model request with all fallback credential stores removed",
      "verify": "node --test tests/sprint-01/grd-06-missing-key.test.mjs --test-name-pattern FLOW-GRD-06-MISSING-KEY",
      "maps_to_ac": "AC-2",
      "test_file": "tests/sprint-01/grd-06-missing-key.test.mjs",
      "test_function": "FLOW-GRD-06-MISSING-KEY",
      "test_tier": "integration",
      "verification_service": "GitHub Actions harness-eval workflow + real harness CLIs + harness-smoke keys",
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "scenario": {
        "tier": "e2e-automated",
        "negative_control": {
          "would_fail_if": [
            "the guard recorded missing-api-key while the key was present (key-present-misfire: a static always-refusing guard)",
            "any model request appeared in the missing-key capture before the refusal \u2014 control invalid",
            "the missing-key result readable as pass anywhere",
            "the cursor cell reason came from a special-cased string instead of the guard code path"
          ]
        },
        "evidence": {
          "forms": [
            "controls rows control_id/verdict/reason",
            "missing-key capture empty of model events",
            "cursor cell reason string"
          ],
          "examples": [
            "missing-key could-not-run missing-api-key",
            "stale-cache could-not-run installation-identity-mismatch",
            "exit0-denied-read fail denied_tool_call",
            "hidden-image-judge row with child-tree scan evidence",
            "cursor reason identical to the control row's reason"
          ],
          "required_capture": "the keyless step's env-absence assertion, its capture with zero model events before refusal, and the authenticated cells' passes in the same run"
        },
        "cases": [
          {
            "start_ref": "seed/env/key-removed",
            "action": {
              "actor": "workflow",
              "steps": [
                "run guard-evaluated invocation with ANTHROPIC_API_KEY and all fallbacks removed",
                "run paired authenticated invocations in the same workflow"
              ]
            },
            "end_state": {
              "must_observe": [
                "controls row missing-key reads \"could-not-run missing-api-key\"",
                "missing-key capture has 0 model-request events before refusal",
                "paired authenticated cells grade \"pass\" (guard fires on absence, not unconditionally)",
                "cursor/pinned reason == \"missing-api-key\" from the same guard path"
              ],
              "must_not_observe": [
                "pass on the keyless cell",
                "0 model requests in the keyless capture",
                "the authenticated control also recording missing-api-key"
              ]
            }
          },
          {
            "start_ref": "seed/env/anthropic-key-present",
            "action": {
              "actor": "runner",
              "steps": [
                "node tests/sprint-01/flow-runner.mjs grd-06 --fixture key-present-misfire --expect red"
              ]
            },
            "end_state": {
              "must_observe": [
                "guard does not emit \"missing-api-key\" when the binding is present",
                ".red records the with-key guard decision (\"no missing-api-key refusal\")"
              ],
              "must_not_observe": [
                "a \"missing-api-key\" refusal on a key-present environment (the fallback-store enumeration comes up empty)",
                "refusal logged before the credential check ran"
              ]
            }
          }
        ],
        "topology_note": "invocation-guard evaluates the credential binding inside the real workflow; one control step runs with the key actually removed; paired authenticated cells in the same run; results in the controls array",
        "test_tier": "e2e"
      },
      "flow_ref": null,
      "red_input": "a guard that logs the refusal after a model request has started fails the control",
      "positive_example": "the keyless step's capture holds 0 model-request events before the guard records could-not-run missing-api-key"
    },
    {
      "id": "TC-2",
      "type": "test_criterion",
      "primary": false,
      "description": "The stale-cache control reads could-not-run installation-identity-mismatch and is never attributed to the candidate",
      "verify": "node --test tests/sprint-01/grd-06-missing-key.test.mjs --test-name-pattern FLOW-GRD-06-MISSING-KEY",
      "maps_to_ac": "AC-2",
      "test_file": "tests/sprint-01/grd-06-missing-key.test.mjs",
      "test_function": "FLOW-GRD-06-MISSING-KEY",
      "test_tier": "integration",
      "verification_service": "GitHub Actions harness-eval workflow + real harness CLIs + harness-smoke keys",
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "scenario": {
        "tier": "e2e-automated",
        "negative_control": {
          "would_fail_if": [
            "the guard recorded missing-api-key while the key was present (key-present-misfire: a static always-refusing guard)",
            "any model request appeared in the missing-key capture before the refusal \u2014 control invalid",
            "the missing-key result readable as pass anywhere",
            "the cursor cell reason came from a special-cased string instead of the guard code path"
          ]
        },
        "evidence": {
          "forms": [
            "controls rows control_id/verdict/reason",
            "missing-key capture empty of model events",
            "cursor cell reason string"
          ],
          "examples": [
            "missing-key could-not-run missing-api-key",
            "stale-cache could-not-run installation-identity-mismatch",
            "exit0-denied-read fail denied_tool_call",
            "hidden-image-judge row with child-tree scan evidence",
            "cursor reason identical to the control row's reason"
          ],
          "required_capture": "the keyless step's env-absence assertion, its capture with zero model events before refusal, and the authenticated cells' passes in the same run"
        },
        "cases": [
          {
            "start_ref": "seed/env/key-removed",
            "action": {
              "actor": "workflow",
              "steps": [
                "run guard-evaluated invocation with ANTHROPIC_API_KEY and all fallbacks removed",
                "run paired authenticated invocations in the same workflow"
              ]
            },
            "end_state": {
              "must_observe": [
                "controls row missing-key reads \"could-not-run missing-api-key\"",
                "missing-key capture has 0 model-request events before refusal",
                "paired authenticated cells grade \"pass\" (guard fires on absence, not unconditionally)",
                "cursor/pinned reason == \"missing-api-key\" from the same guard path"
              ],
              "must_not_observe": [
                "pass on the keyless cell",
                "0 model requests in the keyless capture",
                "the authenticated control also recording missing-api-key"
              ]
            }
          },
          {
            "start_ref": "seed/env/anthropic-key-present",
            "action": {
              "actor": "runner",
              "steps": [
                "node tests/sprint-01/flow-runner.mjs grd-06 --fixture key-present-misfire --expect red"
              ]
            },
            "end_state": {
              "must_observe": [
                "guard does not emit \"missing-api-key\" when the binding is present",
                ".red records the with-key guard decision (\"no missing-api-key refusal\")"
              ],
              "must_not_observe": [
                "a \"missing-api-key\" refusal on a key-present environment (the fallback-store enumeration comes up empty)",
                "refusal logged before the credential check ran"
              ]
            }
          }
        ],
        "topology_note": "invocation-guard evaluates the credential binding inside the real workflow; one control step runs with the key actually removed; paired authenticated cells in the same run; results in the controls array",
        "test_tier": "e2e"
      },
      "flow_ref": null,
      "red_input": "a stale cache graded as a product fail, or as pass, fails the control",
      "positive_example": "the stale-cache control reads could-not-run installation-identity-mismatch with both digests recorded"
    },
    {
      "id": "TC-3",
      "type": "test_criterion",
      "primary": false,
      "description": "A denied required read fails on exit 0 and is recorded as fail denied_tool_call",
      "verify": "node --test tests/sprint-01/grd-03-evidence.test.mjs --test-name-pattern FLOW-GRD-03-FILES-AND-STREAM",
      "maps_to_ac": "AC-1",
      "test_file": "tests/sprint-01/grd-03-evidence.test.mjs",
      "test_function": "FLOW-GRD-03-FILES-AND-STREAM",
      "test_tier": "integration",
      "verification_service": "GitHub Actions harness-eval workflow + real harness CLIs + harness-smoke keys",
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
      "flow_ref": null,
      "red_input": "a clean exit graded pass despite an observed denial fails the control",
      "positive_example": "the exit0-denied-read control reads fail denied_tool_call beside a raw process_exit_code of 0"
    },
    {
      "id": "TC-4",
      "type": "test_criterion",
      "primary": false,
      "description": "The hidden-image-judge control proves no screenshot judging occurred anywhere in the verify child tree",
      "verify": "node --test tests/sprint-01/grd-03-evidence.test.mjs --test-name-pattern FLOW-GRD-03-FILES-AND-STREAM",
      "maps_to_ac": "AC-1",
      "test_file": "tests/sprint-01/grd-03-evidence.test.mjs",
      "test_function": "FLOW-GRD-03-FILES-AND-STREAM",
      "test_tier": "integration",
      "verification_service": "GitHub Actions harness-eval workflow + real harness CLIs + harness-smoke keys",
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
      "flow_ref": null,
      "red_input": "a hidden image-judge call in the child tree, or an unscannable child process, fails the control",
      "positive_example": "the hidden-image-judge control row carries the child-tree scan evidence and reads pass for a structural-only verify run"
    }
  ]
}
-->

