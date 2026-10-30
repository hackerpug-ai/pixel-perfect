# TASK-T6: Implement the claude-code CanonicalEvent stream mapping, the per-version mapping validator, and question-boundary semantics (ask-nothing + FirstQuestion boundary-stop)

> Task ID: T6
> Sprint: [SPRINT.md](./SPRINT.md)
> Status: ✅ Completed

Commit: 9b3afad88d6777867c526222825231bad1941b7a
> Assignee: evals-implementer
> Priority: P1
> Points: 8
> Type: FEATURE
> Planner: evals-planner
> Proposed By: github-agentic-workflow-planner + evals-planner
> TDD_MODE: red_first · RED_GREEN_REQUIRED: true

AGENT: planner=evals-planner | implementer=evals-implementer | reviewer=evals-reviewer

**Depends on:** T5 (claude-code-cells@v1)
**Blocks:** T7 (its code needs this task's landed work), T12 (its code needs this task's landed work)

## Background

- **Source:** `.spec/prds/harness-eval-framework/09-technical-requirements/03-data-schema.md` (CanonicalEvent, InvocationCapture), `02-system-components.md` (stream-grader, question-boundary), `09-capability-chains.md` (stream-mapping@v1)
- **Human testing gate steps that exercise this task:** 10, 11
- **PRD references:** `03-data-schema.md` § Canonical stream and capture; `02-system-components.md` § stream-grader, question-boundary; `04-uc-grd.md` UC-GRD-03; `10-e2e-testing-criteria.md` T-GRD-010..T-GRD-012
- **Capabilities touched:** CAP-EVAL-01
- **Why it matters:** 'a clean exit is not a pass' is only true if the grade is read from the event stream. That requires a mapping table per harness and version that is backed by real captured stdout, plus explicit question-boundary semantics so a must-ask probe can pass on a complete prefix without a native completion, and an ask-nothing check can fail on the first observed question.
- **Current (what this task consumes):** T5's claude-code cells — real captured stdout with byte offsets, the installed CLI version and its loaded plugin manifest digest.
- **Desired (what this task provides):** the claude-code `CanonicalEvent` normalizer for version 2.1.291, the per-version mapping validator that refuses to grade from an unqualified capture, and question-boundary capture (ask-nothing fail on the first question; must-ask stop at the first valid `USER_CHOICE` with nothing sent).
- **Boundary contracts:** unknown lines survive as `harness_specific` with their original bytes; `original_event` is lossless; an unmapped required fact makes the affected check could-not-run; a boundary stop is recorded as `termination_kind: boundary-stop` with `boundary_event_offset` and `prefix_complete`, and never fabricated.

## Critical Constraints

- MUST preserve every raw line as `original_event` and record `stream_offset`/`stream_end_offset` so capture completeness is stated, never inferred.
- MUST keep an unmapped required fact (incremental text, question-tool start, expensive-tool start, required-read denial, native session identity, completion) as could-not-run for the affected check — NEVER pass, NEVER inferred from exit 0 or an opaque line.
- MUST NEVER treat a Claude Code `subtype: success` / `is_error: false` as a verdict, and MUST NEVER treat the turn ending as the question signal.
- MUST stop a must-ask probe immediately at the first valid question text or question-tool start and send nothing; a boundary stop may grade the complete captured prefix without a native `session_ended`, and that exception MUST NOT turn a timeout or a truncated capture into a pass.
- MUST fail an ask-nothing check on the first question observed in a list/status/verify stream, with the question's stream offset cited.

## Specification

- **Objective:** Make the event stream, not the exit code, the thing a grade is computed from — with mapping coverage proven against real captured stdout.
- **Success state:** The 2.1.291 mapping validator passes on the qualified capture, each CanonicalEvent tiles the raw stdout exactly once with unknown lines preserved as `harness_specific`, an ask-nothing stream containing a question grades fail at its offset, and a must-ask capture grades pass on exactly 1 `USER_CHOICE` with 0 answers sent.

## Acceptance Criteria (GIVEN-WHEN-THEN)

### AC-1: Four grades per graded cell: command_list, status, verify, question_before_expensive_work — ask-nothing enforced, must-a

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

### AC-2: Evidence-not-exit-code grading: verdicts cite files and stream offsets; a denied read fails on exit 0 [PRIMARY]

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

## Test Criteria

Each TC is an assertion inside its mapped AC's VERIFY command; its fail input and positive example are on its row in the REQUIREMENT-CONTRACT block.

| TC | Statement | Maps to |
|----|-----------|---------|

## Reading List

1. `.spec/prds/harness-eval-framework/09-technical-requirements/03-data-schema.md` § Canonical stream and capture — the CanonicalEvent field set and the boundary-stop exception
2. `.spec/prds/harness-eval-framework/09-technical-requirements/02-system-components.md` § stream-grader, § question-boundary — the required-fact list and the ask-nothing/must-ask split
3. `.spec/prds/harness-eval-framework/09-technical-requirements/06-external-dependencies.md` — the pinned claude-code CLI this mapping table is qualified for
4. `test/harness/stream/` — the directory this task creates (mapping tables plus provenance hashes)
5. `.spec/e2e-policy/sprint-01/artifact-only-read.json` — the governed surface policy every AC on this task uses

Coding standards:

- `AGENTS.md`
- `brain/docs/TDD-METHODOLOGY.md`
- `brain/docs/kanban/SCENARIO-CONTRACT-V1.md`

## Guardrails

WRITE-ALLOWED:

- test/harness/stream/**
- tests/sprint-01/grd-03-evidence.test.mjs
- tests/sprint-01/grd-02-four-grades.test.mjs

WRITE-PROHIBITED:

- plugins/pixel-perfect/**
- test/harness/adapters/**
- Any file not listed in write_allowed

## Code Pattern

```js
// one mapper per version; unmapped required fact => could-not-run, never pass
export function normalise(capture, table) {
  const events = [];
  let off = 0;
  for (const line of capture.rawLines) {
    const end = off + Buffer.byteLength(line) + 1;
    const kind = table.match(line);
    events.push(kind
      ? { type: kind.type, original_event: line, harness: "claude-code",
          invocation_id: capture.invocation_id, stream_offset: off, stream_end_offset: end, sequence: events.length }
      : { type: "harness_specific", original_event: line, stream_offset: off, stream_end_offset: end });
    off = end;
  }
  const missing = table.requiredFacts.filter((f) => !events.some((e) => table.satisfies(f, e)));
  return { events, coverage: missing.length ? { verdict: "could-not-run", missing } : { verdict: "pass" } };
}
```

- **Source:** `.spec/prds/harness-eval-framework/09-technical-requirements/03-data-schema.md` § CanonicalEvent
- **Anti-pattern:** Reading a home session file or a terminal replay instead of the captured stdout; inferring absence of a question from an opaque event; grading a must-ask probe pass on an incomplete prefix; letting `is_error: false` become a pass.

## Design

None. This task produces mapping tables and a normalizer; there is no screen.

## Agent Instructions

Work each AC as one RED, GREEN, REFACTOR cycle in AC order. AC-1's RED is the qualified-capture fixture with a required fact removed from the mapping: the validator must move that check from pass to could-not-run, and on base it does not run at all. AC-2's RED is the recorded `question-in-ask-nothing` capture: a grader that reads only the exit code passes it, and the module must exit 1. Never satisfy a coverage test by adding a permissive fallback mapping.

- **AC-1:** `FLOW-GRD-02-FOUR-GRADES` in `tests/sprint-01/grd-02-four-grades.test.mjs`, seeded from `seed/live-dispatch-run`.
- **AC-2:** `FLOW-GRD-03-FILES-AND-STREAM` in `tests/sprint-01/grd-03-evidence.test.mjs`, seeded from `seed/live-dispatch-run`.

## Orchestrator Verification Protocol

1. **VERIFY_RED:** on base `main` both VERIFY commands exit non-zero and the `.red` proofs exist at `.tmp/sprint-01-verification/grd-02-four-grades.json.red` and `.tmp/sprint-01-verification/grd-03-evidence.json.red`.
2. **VERIFY_GREEN:** both VERIFY commands exit 0, the mapping validator reports pass on 2.1.291, and the offsets tile the capture exactly once with no gap.
3. Run every Evidence Gate and compare with Expected.
4. `git diff --name-only` lists only WRITE-ALLOWED paths; `plugins/pixel-perfect/**` and `test/harness/adapters/**` are untouched.
5. Dispatch `evals-reviewer` with this file, the RED and GREEN outputs, and the evidence.

## Agent Assignment

- **Planner role:** `evals-planner`
- **Implementer role:** `evals-implementer`
- **Reviewer role:** `evals-reviewer`
- **Rationale:** `evals-implementer` owns the eval/grading surface this task lands; `evals-reviewer` audits oracle strength, fixture reality and negative-path coverage.
- **Pairing:** `evals-implementer` builds; `evals-reviewer` reviews adversarially against the Review Criteria below.

## Evidence Gates

- **AC-1:** `node --test tests/sprint-01/grd-02-four-grades.test.mjs --test-name-pattern FLOW-GRD-02-FOUR-GRADES`. Expected: prints the TAP `ok` line for FLOW-GRD-02-FOUR-GRADES after the four check_ids carry verdicts and the must-ask capture shows exactly 1 USER_CHOICE and 0 answer deliveries
- **AC-2:** `node --test tests/sprint-01/grd-03-evidence.test.mjs --test-name-pattern FLOW-GRD-03-FILES-AND-STREAM`. Expected: prints the TAP `ok` line for FLOW-GRD-03-FILES-AND-STREAM after the exit0-denied-read fixture grades fail with the denial offset cited while process_exit_code reads 0
- **mapping:** `node test/harness/stream/validate-mapping.mjs --version 2.1.291 --capture <qualified-capture>`. Expected: exits 0 and prints `pass` with all six required facts covered

## Review Criteria

Must pass:

- One test per AC, named exactly as its TEST_FUNCTION, in its TEST_FILE.
- RED evidence for every AC; the ask-nothing RED is a real capture containing a question, not a synthetic event JSON.
- The mapping table records capture hashes and source event paths beside it, and every required fact is backed by real captured stdout.
- No verdict path reads the process exit code, `subtype`, or `is_error`.
- `git diff --name-only` lists only WRITE-ALLOWED paths.

Should verify:

- Unknown lines survive losslessly as `harness_specific` and the offsets tile the capture with no gap and no overlap.
- The boundary-stop exception is reachable only from `termination_kind: boundary-stop` with a complete prefix.
- The question boundary is the stream, never the turn ending or the final reply file.

Verdict: APPROVED or NEEDS_FIXES, with file and line for each finding.

## Dependencies

- **Depends on:** T5 (claude-code-cells@v1)
- **Blocks:** T7 (its code needs this task's landed work), T12 (its code needs this task's landed work)

A shared file is not a dependency, and needing another task's output to test against is that flow's integration obligation, not an edge.

## Out of Scope

- Installing or invoking the CLI (T5 owns install and the four graded invocations).
- Writing grade records or the VerifyReport (T7 owns the graders).
- Mapping any harness other than claude-code in this sprint.

## Context

- **Current state:** No stream normalizer, no mapping table and no question-boundary logic exists in the repo.
- **Gap:** Without a qualified mapping the graders would have to trust the exit code, which UC-GRD-03 promises they do not.

## Notes

- **Partial mappings are leads, not coverage:** the PRD's existing Claude init/denial observations are research evidence. This task's table is the accepted coverage, backed by the real 2.1.291 capture T5 produces.
- **Shared file:** `tests/sprint-01/grd-02-four-grades.test.mjs` is also written by T5 and T7, and `tests/sprint-01/grd-03-evidence.test.mjs` by T3, T7 and T11. Shared files are not dependencies.
- **Split check:** not triggered — 8 points, one failure mode (unmapped evidence), and its report needs no 'and also'.
- **Owner:** evals-planner; sprint `sprint-01-evaluator-evidence-spine`.

## Integration Obligations

- **obl-FLOW-GRD-03-FILES-AND-STREAM** — `FLOW-GRD-03-FILES-AND-STREAM`, phase `post-integration`, mandatory. available_after ['T11', 'T3', 'T6', 'T7', 'T9']; required_by ['T12']; recheck_on ['T12'].
  - command: `node --test tests/sprint-01/grd-03-evidence.test.mjs --test-name-pattern FLOW-GRD-03-FILES-AND-STREAM`

<!-- REQUIREMENT-CONTRACT v1 -->
<!--
{
  "version": "1",
  "task_id": "T6",
  "task_type": "FEATURE",
  "tdd_mode": "red_first",
  "verification_policy": {
    "requires_tests": true,
    "requires_red_evidence": true,
    "requires_seeded_evidence": true
  },
  "guardrails": {
    "write_allowed": [
      "test/harness/stream/**",
      "tests/sprint-01/grd-03-evidence.test.mjs",
      "tests/sprint-01/grd-02-four-grades.test.mjs"
    ],
    "write_prohibited": [
      "plugins/pixel-perfect/**",
      "test/harness/adapters/**"
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
      "id": "obl-FLOW-GRD-03-FILES-AND-STREAM",
      "flow_ref": "FLOW-GRD-03-FILES-AND-STREAM",
      "phase": "post-integration",
      "mandatory": true,
      "owner_task_id": "T6",
      "available_after": [
        "T11",
        "T3",
        "T6",
        "T7",
        "T9"
      ],
      "required_by": [
        "T12"
      ],
      "recheck_on": [
        "T12"
      ],
      "recheck_paths": [
        "tests/sprint-01/grd-03-evidence.test.mjs",
        "test/harness/pins.json",
        ".github/workflows/harness-eval.yml"
      ],
      "completion_rule": "FLOW-GRD-03-FILES-AND-STREAM passes on the trunk when `node --test tests/sprint-01/grd-03-evidence.test.mjs --test-name-pattern FLOW-GRD-03-FILES-AND-STREAM` exits 0 and the flow's artifact .tmp/sprint-01-verification/grd-03-evidence.json is retained with its expected observations matched.",
      "verification_gates": [],
      "requirements": [],
      "owner_bindings": [
        {
          "owner_task_id": "T6",
          "flow_ref": "FLOW-GRD-03-FILES-AND-STREAM",
          "command": "node --test tests/sprint-01/grd-03-evidence.test.mjs --test-name-pattern FLOW-GRD-03-FILES-AND-STREAM"
        }
      ]
    }
  ],
  "requirements": [
    {
      "id": "AC-1",
      "type": "acceptance_criterion",
      "primary": false,
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
      "primary": true,
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
      "id": "TC-1",
      "type": "test_criterion",
      "primary": false,
      "description": "Every required fact in a qualified capture maps to a CanonicalEvent type, and an unmapped required fact makes the affected check could-not-run",
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
      "red_input": "a capture whose question-tool start has no mapping is graded pass instead of could-not-run",
      "positive_example": "the qualified 2.1.291 mapping table covers incremental text, question-tool start, expensive-tool start, required-read denial, native session identity and completion"
    },
    {
      "id": "TC-2",
      "type": "test_criterion",
      "primary": false,
      "description": "A question event in an ask-nothing invocation fails that check, and a must-ask probe stops at the first valid question with zero answers sent",
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
      "red_input": "a spliced stream carrying a question in an ask-nothing check is graded pass",
      "positive_example": "the must-ask capture holds exactly 1 USER_CHOICE and 0 answer deliveries, graded pass from a complete prefix"
    },
    {
      "id": "TC-3",
      "type": "test_criterion",
      "primary": false,
      "description": "Unknown lines are preserved as harness_specific with their original bytes, so completeness can be stated rather than inferred",
      "verify": "node --test tests/sprint-01/grd-03-evidence.test.mjs --test-name-pattern FLOW-GRD-03-FILES-AND-STREAM",
      "maps_to_ac": "AC-2",
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
      "red_input": "a normalizer that drops unknown lines cannot state capture completeness and fails the tiling check",
      "positive_example": "the qualified capture's offsets tile the raw stdout exactly once, and unknown lines survive as harness_specific"
    }
  ]
}
-->


## Handoff

```json
{
  "task": "T6",
  "commit_sha": "9b3afad88d6777867c526222825231bad1941b7a",
  "done": "PROVISIONAL SUBSTITUTE-AUTHOR DRAFT, unapproved: reconstructed from the exact landed candidate and frozen cycle-3 review, not original-author testimony. T6 added the claude-code CanonicalEvent normalizer, exact-version mapping table and validator, capture archive reader/archiver, stream-derived grading, and ask-nothing/must-ask boundary evaluation under test/harness/stream/, with controls in tests/sprint-01/grd-02-four-grades.test.mjs and grd-03-evidence.test.mjs. The source preserves raw lines and offsets, requires declared facts, checks capture integrity and citations, and retains exit status as a diagnostic. Recorded landing cbfbc4c1595ee1fbf0c2b7a18ec40d3313094d27 binds approved candidate 9b3afad88d6777867c526222825231bad1941b7a to base 8a9c1ceacacd920cefb9212360cb67eab870c3e3. Historical local review approval does not establish hosted harness/provider integration or task completion.",
  "deviations": [
    "The retained real capture is a keyless local CLI 2.1.312 run, not the pinned 2.1.291 capture. Its 6,233 stdout bytes hash to 47298ec50ca80cde9ef86eabce7c3de0da7a591f1722da4263730eb4bef100ab; it records exit 1, zero model requests and no child credentials. The shipped 2.1.291 table declares qualified=false and the validator refuses this capture.",
    "The must-ask pass uses an authored question splice and authored boundary-stop metadata. These legs are published as branch_conformance with evidence:false; no recorder-produced boundary-stop capture or four-pass answering-model cell was established by this candidate.",
    "Cycle 3 supplied retained RED proofs without changing the candidate: a throwaway base tree holding candidate tests failed on the missing stream module. The reviewer also relied on historical behavioral mutation results; an import failure alone does not establish assertion strength."
  ],
  "concerns": [
    "U-T6-1 remains OPEN and non-blocking in the frozen review: pinned-version capture, recorder-produced must-ask boundary stop, four graded checks on a real answering model, and hosted result artifact remain unobserved here. AC-1 is DEFERRED on T7/T9 and AC-2 on T11/T7/T9. Later task landings do not by themselves resolve these observations.",
    "F-T6-10 remains ADVISORY: the persisted splice record inherits archived evidence_root/evidence_relative_paths and has no authored-splice marker of its own. The report labels it evidence:false, but the record alone is ambiguous and relocation fails closed with evidence-unresolvable.",
    "The grade-stream entry point does not invoke validateMapping or independently enforce pinned-version qualification; callers must preserve that separate qualification gate. Mapping table coverage and authored pass-branch controls are not real capture qualification.",
    "Only historical local results were inspected: cycle 3 records check-AC-1 and check-AC-2 exit 0 and both local flow replays PASS, while AC-1/AC-2 remain DEFERRED. No tests, runtime launches, model calls, hosted downloads, native receipt capture, recording or completion ran during this draft preparation.",
    "Original implementer session 5f2a2c82-b795-44a is historical and unavailable to this preparer. This draft grants no substitute-author approval, original authorship, recording authority or completion authority; handoff_delivery remains pending in inspected state."
  ],
  "findings": [
    "Frozen cycle 3/revision 0 records APPROVED at the exact candidate/base. F-T6-1 through F-T6-9 and F-T6-11 are recorded FIXED; F-T6-10 remains ADVISORY and U-T6-1 remains OPEN. These are retained reviewer dispositions, not fresh adjudication.",
    "The source refuses undeclared expected facts, unattributable denial requiredness, event streams that fail tiling/losslessness, mismatched capture citations and unqualified table-only validation. Three declared question shapes map to question events. Missing or opaque facts do not prove absence.",
    "The recorded aggregate decision is could-not-run over fail over pass. A denied read remains a fail/denied_tool_call block with its offset even when model-never-answered controls the headline; the answering exit-0 denied-read control was historically reported fail.",
    "Retained mutation results show six valid mutants killed (C2-M2 through C2-M7). C2-M1 is recorded SURVIVED but was explicitly excluded by the reviewer as invalid because its mutation left the mandatory-facts throw intact. No new mutation run was performed."
  ],
  "scope_impact": [
    {
      "target": "T6",
      "found": "F-T6-10 remains an advisory on the authored splice record at the approved candidate.",
      "change": "Carry its unresolved provenance and portability limitation forward; this recovery draft makes no source repair or finding disposition."
    },
    {
      "target": "T11",
      "found": "The candidate lacks a qualified 2.1.291 capture and a recorder-produced boundary-stop must-ask capture.",
      "change": "Retain the existing capture-qualification and boundary-stop proof obligations; authored streams and the 2.1.312 keyless archive do not satisfy them."
    },
    {
      "target": "GATE:FLOW-GRD-02-FOUR-GRADES",
      "found": "Historical local flow PASS coexists with AC-1 DEFERRED on T7/T9 and unobserved hosted-four-pass-cell proof.",
      "change": "Keep the real five-invocation/four-grade observation pending until exact hosted artifacts establish the pinned cell, status facts and one question with zero answer deliveries."
    },
    {
      "target": "GATE:FLOW-GRD-03-FILES-AND-STREAM",
      "found": "Historical local controls and flow PASS do not establish AC-2 hosted evidence; the frozen context defers it on T11/T7/T9 and candidate tests also await a T8/T11 result artifact.",
      "change": "Retain the existing hosted artifact and real exit-0 denied-read proof obligations; preserve file/offset/hash citations and diagnostic exit codes without promoting local authored controls to service evidence."
    }
  ],
  "feedback": [
    "Evidence and line-level support are in .kb-run-sprint/sprint-01-evaluator-evidence-spine/recovery/handoff-drafts/T6.evidence.md. The draft is preparation only; no product files, sprint state, approvals, native envelopes or Git lifecycle were changed.",
    "Any future accepted substitute handoff requires the explicit owner-authorized envelope and provenance checks in Brain tools/sprint-handoff/CONTRACT.md. This document is not that authorization and cannot be used to claim original-session testimony."
  ]
}
```
