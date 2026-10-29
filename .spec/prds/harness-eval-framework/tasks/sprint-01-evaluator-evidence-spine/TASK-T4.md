# TASK-T4: Build test/harness/kit fixture and ALL case manifests — VerifyPair, StatusCase, FirstQuestionCase — with the case loader and oracle precheck

> Task ID: T4
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

**Depends on:** none
**Blocks:** T5 (its code needs this task's landed work), T7 (its code needs this task's landed work), T12 (its code needs this task's landed work)

## Background

- **Source:** `.spec/prds/harness-eval-framework/09-technical-requirements/03-data-schema.md` (VerifyPair/VerifyReport, StatusCase, FirstQuestionCase), `02-system-components.md` (fixture-grader, oracle-precheck), `09-capability-chains.md` (cases@v1)
- **Human testing gate steps that exercise this task:** 8
- **PRD references:** `03-data-schema.md` § VerifyPair / StatusCase / FirstQuestionCase; `02-system-components.md` § fixture-grader, oracle-precheck; `04-uc-grd.md` UC-GRD-04, UC-GRD-05; `10-e2e-testing-criteria.md` T-GRD-013..T-GRD-020
- **Capabilities touched:** CAP-EVAL-01
- **Why it matters:** the case manifest is the only place a report path is decided. If the grader could pick a filename, 'verify failed' would mean whatever file happened to exist; 'the failing case names the report path' is the promise UC-GRD-04 makes, and it is only keepable if the path is declared before either invocation runs.
- **Current (what this task consumes):** nothing. There is no `test/harness/kit`, no fixture project, no case manifest and no case loader in the repo.
- **Desired (what this task provides):** the `test/harness/kit` fixture project (a project the real public verify route can run against, with the `atoms/Button/default` capture and a seeded manifest), the VerifyPair, StatusCase and FirstQuestionCase manifests with their case-declared relative report paths, the case loader that binds each declared path to a fresh invocation directory and refuses escapes, and the keyless oracle precheck wrapper.
- **Boundary contracts:** the loader rejects absolute paths, `..`, any symlinked ancestor or leaf, and any resolved path outside the invocation directory; no glob, discovery, timestamp or any-new-file fallback; the clean case is materially the planted project without the overlay, and it is a separate invocation with its own directory.

## Critical Constraints

- MUST declare `reports/verify-button-drift.json` for case `verify-button-drift` and `reports/verify-clean.json` for case `verify-clean` in the manifests, before either invocation is launched, and MUST hand each to a fresh invocation directory.
- MUST refuse an absolute path, a `..` segment, a symlinked ancestor or leaf, and any path resolving outside the invocation directory — before writing anything.
- MUST NEVER run the fixture in place: the grader copies `test/harness/kit/project` into the invocation directory, and protected files (manifest, goldens, sandbox, `src`, package files) are compared before and after.
- MUST declare the planted and clean case separately: the clean twin is not the planted overlay with the overlay skipped, and the planted report is never reused for the twin.
- MUST keep the `atoms/Button/default` capture path (`design/.captures/web-desktop/atoms/Button/default.txt`) and the oracle script contract (`verify-catalog.mjs`; planted exit 1 with `drifted[].key atoms/Button/default`, clean exit 0) as the case declares them.

## Specification

- **Objective:** Make every graded report path and every seeded fact a pre-declared property of a case manifest, bound to a fresh invocation directory before launch.
- **Success state:** Loading the manifests resolves each case to its declared relative report path inside its own invocation directory, the loader refuses all three path-escape shapes without writing, and the oracle precheck exits 1 on the planted project and 0 on the clean one.

## Acceptance Criteria (GIVEN-WHEN-THEN)

### AC-1: Verify report at the case-declared path naming the planted defect, bound to its producing invocation; no invented filena

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

### AC-2: Clean twin is not a verify failure: clean control passes beside a detected planted defect [PRIMARY]

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

### AC-3: Journey: planted-and-clean verify pair through a real dispatched run, from oracle precheck to summary links

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

1. `.spec/prds/harness-eval-framework/09-technical-requirements/03-data-schema.md` § VerifyPair / VerifyReport, StatusCase, FirstQuestionCase — the declared values this task must materialize
2. `.spec/prds/harness-eval-framework/09-technical-requirements/02-system-components.md` § fixture-grader, § oracle-precheck — the copy-and-protect rule and the dual-exit oracle contract
3. `plugins/pixel-perfect/scripts/verify-catalog.mjs` — the existing oracle the precheck runs (read only)
4. `test/fixtures/**` — the read-only consumer-web lineage the kit fixture derives from
5. `.spec/scenarios/UC-GRD-04/*.scenario.md`, `.spec/scenarios/UC-GRD-05/*.scenario.md` — the scenario registry entries this task's flows prove

Coding standards:

- `AGENTS.md`
- `brain/docs/TDD-METHODOLOGY.md`
- `brain/docs/kanban/SCENARIO-CONTRACT-V1.md`

## Guardrails

WRITE-ALLOWED:

- test/harness/kit/**
- test/harness/cases/**
- tests/sprint-01/grd-04-named-path.test.mjs
- tests/sprint-01/grd-05-clean-twin.test.mjs
- tests/sprint-01/flow-runner.mjs
- tests/sprint-01/jrn-planted-and-twin.test.mjs

WRITE-PROHIBITED:

- test/fixtures/** (read-only source lineage)
- plugins/pixel-perfect/scripts/verify-catalog.mjs (invoked, never edited)
- Any file not listed in write_allowed

## Code Pattern

```js
export function bindReportPath(manifestCase, invocationDir) {
  const rel = manifestCase.report_relative_path;      // declared before launch
  const abs = path.resolve(invocationDir, rel);
  if (path.isAbsolute(rel) || rel.split(path.sep).includes("..")) throw new CasePathRefused(rel);
  if (!abs.startsWith(path.resolve(invocationDir) + path.sep)) throw new CasePathRefused(rel);
  if (hasSymlinkComponent(invocationDir, rel)) throw new CasePathRefused(rel);
  return abs;                                          // exactly one path, no discovery
}
```

- **Source:** `.spec/prds/harness-eval-framework/09-technical-requirements/03-data-schema.md` § VerifyPair / VerifyReport ("No glob, discovery, timestamp fallback, or any-new-file fallback is allowed")
- **Anti-pattern:** Resolving the newest file under `reports/`; accepting `../escape.json` because it stays on the same volume; letting the clean twin read the planted report; a status case whose two copies differ in more than one fact.

## Design

None. The case manifests are data; there is no screen.

## Agent Instructions

Work each AC as one RED, GREEN, REFACTOR cycle in AC order, seeded from the `start_ref` on its row. AC-1's RED is a confinement case: the loader does not exist, so `../escape.json`, `/abs.json` and a symlinked ancestor all fail to load and exit 1. AC-2's RED is a manifest with no recorded expected facts, which cannot tell a generic acknowledgement from a correct reply. Never make a confinement case pass by widening the check.

- **AC-1:** `FLOW-GRD-04-NAMED-PATH` in `tests/sprint-01/grd-04-named-path.test.mjs`, seeded from `seed/live-dispatch-run`.
- **AC-2:** `FLOW-GRD-05-CLEAN-TWIN` in `tests/sprint-01/grd-05-clean-twin.test.mjs`, seeded from `seed/live-dispatch-run`.
- **AC-3:** `FLOW-JRN-PLANTED-AND-TWIN` in `tests/sprint-01/jrn-planted-and-twin.test.mjs`, seeded from `seed/live-dispatch-run`.

## Orchestrator Verification Protocol

1. **VERIFY_RED:** on base `main` every VERIFY command exits non-zero and the `.red` proofs exist at `.tmp/sprint-01-verification/grd-04-named-path.json.red`, `.tmp/sprint-01-verification/grd-05-clean-twin.json.red` and `.tmp/sprint-01-verification/jrn-planted-and-twin.json.red`.
2. **VERIFY_GREEN:** each VERIFY command exits 0 and the directory listing after each confinement case shows 0 files written.
3. Run every Evidence Gate and compare with Expected.
4. `git diff --name-only` lists only WRITE-ALLOWED paths; `test/fixtures/**` and the oracle script are untouched.
5. Dispatch `evals-reviewer` with this file, the RED and GREEN outputs, and the evidence.

## Agent Assignment

- **Planner role:** `evals-planner`
- **Implementer role:** `evals-implementer`
- **Reviewer role:** `evals-reviewer`
- **Rationale:** `evals-implementer` owns the eval/grading surface this task lands; `evals-reviewer` audits oracle strength, fixture reality and negative-path coverage.
- **Pairing:** `evals-implementer` builds; `evals-reviewer` reviews adversarially against the Review Criteria below.

## Evidence Gates

- **AC-1:** `node --test tests/sprint-01/grd-04-named-path.test.mjs --test-name-pattern FLOW-GRD-04-NAMED-PATH`. Expected: prints the TAP `ok` line for FLOW-GRD-04-NAMED-PATH after `reports/verify-button-drift.json` exists at its declared path with expected_defect_key atoms/Button/default and 0 files were written by the refusal cases
- **AC-2:** `node --test tests/sprint-01/grd-05-clean-twin.test.mjs --test-name-pattern FLOW-GRD-05-CLEAN-TWIN`. Expected: prints the TAP `ok` line for FLOW-GRD-05-CLEAN-TWIN after `verify-clean.json` reads clean_project_failed=false with an invocation_id distinct from the planted report
- **AC-3:** `node --test tests/sprint-01/jrn-planted-and-twin.test.mjs --test-name-pattern FLOW-JRN-PLANTED-AND-TWIN`. Expected: prints the TAP `ok` line for FLOW-JRN-PLANTED-AND-TWIN once the live run's two reports and the oracle transcript agree
- **oracle:** `node plugins/pixel-perfect/scripts/verify-catalog.mjs --check <planted> --platform web-desktop --json`. Expected: exits 1 with `drifted[].key` equal to `atoms/Button/default`; the same command on the clean copy exits 0

## Review Criteria

Must pass:

- One test per AC, named exactly as its TEST_FUNCTION, in its TEST_FILE.
- RED evidence for every AC, with the confinement RED captured as a real refusal, not a missing file.
- Every declared report path is in the manifest before launch, and no discovery fallback exists in the loader.
- The three escape shapes (absolute, `..`, symlinked ancestor) are refused before any write, evidenced by a 0-entry listing.
- `git diff --name-only` lists only WRITE-ALLOWED paths.

Should verify:

- The kit fixture is a project the real public verify route can actually run against, not a stub tree.
- StatusCase's two copies differ in exactly one valid fact and both carry nonzero inventory counts.
- FirstQuestionCase's fixture is genuinely empty (no requirements, goal, platform, package or design manifest).

Verdict: APPROVED or NEEDS_FIXES, with file and line for each finding.

## Dependencies

- **Depends on:** none
- **Blocks:** T5 (its code needs this task's landed work), T7 (its code needs this task's landed work), T12 (its code needs this task's landed work)

A shared file is not a dependency, and needing another task's output to test against is that flow's integration obligation, not an edge.

## Out of Scope

- Writing the VerifyReport (T7 owns the writer and the verdict).
- Running the live harness (T5 owns install and invocation).
- Editing `plugins/pixel-perfect/scripts/verify-catalog.mjs` — it is invoked, never edited.

## Context

- **Current state:** No fixture project, no case manifest, no loader, no precheck wrapper exists.
- **Gap:** Nothing decides where a verify report lives before the grader writes it, so 'the failing case names the report path' is unenforceable.

## Notes

- **Shared file:** `tests/sprint-01/flow-runner.mjs` is also written by T1, T3, T7, T9 and T11. A shared file is not a dependency; git answers at landing whether a change applies.
- **Journey:** the `FLOW-JRN-PLANTED-AND-TWIN` journey is owned by T7 for execution; this task supplies the fixtures it replays and exercises it at gate step 8.
- **Split check:** not triggered — 5 points, two fixtures' worth of declared data and one loader.
- **Owner:** evals-planner; sprint `sprint-01-evaluator-evidence-spine`.

## Integration Obligations

- **obl-FLOW-GRD-05-CLEAN-TWIN** — `FLOW-GRD-05-CLEAN-TWIN`, phase `post-integration`, mandatory. available_after ['T4', 'T7']; required_by ['T12']; recheck_on ['T12'].
  - command: `node --test tests/sprint-01/grd-05-clean-twin.test.mjs --test-name-pattern FLOW-GRD-05-CLEAN-TWIN`

<!-- REQUIREMENT-CONTRACT v1 -->
<!--
{
  "version": "1",
  "task_id": "T4",
  "task_type": "FEATURE",
  "tdd_mode": "red_first",
  "verification_policy": {
    "requires_tests": true,
    "requires_red_evidence": true,
    "requires_seeded_evidence": true
  },
  "guardrails": {
    "write_allowed": [
      "test/harness/kit/**",
      "test/harness/cases/**",
      "tests/sprint-01/grd-04-named-path.test.mjs",
      "tests/sprint-01/grd-05-clean-twin.test.mjs",
      "tests/sprint-01/flow-runner.mjs",
      "tests/sprint-01/jrn-planted-and-twin.test.mjs"
    ],
    "write_prohibited": [
      "test/fixtures/** (read-only source lineage)",
      "plugins/pixel-perfect/scripts/verify-catalog.mjs (invoked, never edited)"
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
      "id": "obl-FLOW-GRD-05-CLEAN-TWIN",
      "flow_ref": "FLOW-GRD-05-CLEAN-TWIN",
      "phase": "post-integration",
      "mandatory": true,
      "owner_task_id": "T4",
      "available_after": [
        "T4",
        "T7"
      ],
      "required_by": [
        "T12"
      ],
      "recheck_on": [
        "T12"
      ],
      "recheck_paths": [
        "tests/sprint-01/grd-05-clean-twin.test.mjs",
        "test/harness/pins.json",
        ".github/workflows/harness-eval.yml"
      ],
      "completion_rule": "FLOW-GRD-05-CLEAN-TWIN passes on the trunk when `node --test tests/sprint-01/grd-05-clean-twin.test.mjs --test-name-pattern FLOW-GRD-05-CLEAN-TWIN` exits 0 and the flow's artifact .tmp/sprint-01-verification/grd-05-clean-twin.json is retained with its expected observations matched.",
      "verification_gates": [],
      "requirements": [],
      "owner_bindings": [
        {
          "owner_task_id": "T4",
          "flow_ref": "FLOW-GRD-05-CLEAN-TWIN",
          "command": "node --test tests/sprint-01/grd-05-clean-twin.test.mjs --test-name-pattern FLOW-GRD-05-CLEAN-TWIN"
        }
      ]
    }
  ],
  "requirements": [
    {
      "id": "AC-1",
      "type": "acceptance_criterion",
      "primary": false,
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
      "id": "AC-2",
      "type": "acceptance_criterion",
      "primary": true,
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
      "id": "AC-3",
      "type": "acceptance_criterion",
      "primary": false,
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
      "description": "The case manifest declares the planted and clean report paths before either invocation, and the loader binds them without discovery",
      "verify": "node --test tests/sprint-01/grd-04-named-path.test.mjs --test-name-pattern FLOW-GRD-04-NAMED-PATH",
      "maps_to_ac": "AC-1",
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
      "red_input": "a manifest with no report_relative_path, or a loader that searches the reports directory, fails the check",
      "positive_example": "case verify-button-drift binds reports/verify-button-drift.json and case verify-clean binds reports/verify-clean.json inside fresh invocation dirs"
    },
    {
      "id": "TC-2",
      "type": "test_criterion",
      "primary": false,
      "description": "The loader refuses an absolute path, a .. segment, and a symlinked ancestor before it writes anything",
      "verify": "node --test tests/sprint-01/grd-04-named-path.test.mjs --test-name-pattern FLOW-GRD-04-NAMED-PATH",
      "maps_to_ac": "AC-1",
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
      "red_input": "a loader that accepts ../escape.json writes outside the invocation directory and fails the listing assertion",
      "positive_example": "the three refusal cases each exit non-zero with the directory listing showing 0 files written"
    },
    {
      "id": "TC-3",
      "type": "test_criterion",
      "primary": false,
      "description": "StatusCase records the expected platform, phase, gate state and nonzero inventory counts before launch, and differs from its twin in exactly one valid fact",
      "verify": "node --test tests/sprint-01/grd-05-clean-twin.test.mjs --test-name-pattern FLOW-GRD-05-CLEAN-TWIN",
      "maps_to_ac": "AC-2",
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
      "red_input": "two case manifests with identical facts, or with no recorded expected facts, fail the check",
      "positive_example": "case status-a and status-b share platform web-desktop and inventory counts and differ in one gate value"
    },
    {
      "id": "TC-4",
      "type": "test_criterion",
      "primary": false,
      "description": "FirstQuestionCase declares ask_policy must-ask with an empty project fixture and no quick or automatic-answer option",
      "verify": "node --test tests/sprint-01/grd-05-clean-twin.test.mjs --test-name-pattern FLOW-GRD-05-CLEAN-TWIN",
      "maps_to_ac": "AC-2",
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
      "red_input": "a first-question case seeded with a requirements file or carrying an automatic-answer option fails the check",
      "positive_example": "case first-question-init resolves the empty fixture and its ask_policy reads must-ask"
    }
  ]
}
-->

