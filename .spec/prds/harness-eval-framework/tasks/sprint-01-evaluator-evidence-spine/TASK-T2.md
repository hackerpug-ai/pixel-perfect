# TASK-T2: Create test/harness/pins.json (six exact CLI versions, provider/model, credential env names, pins-vs-package.json reconciliation) + JSON schemas (harness-eval-result/v1, HarnessCell/HarnessGrade, InstallationIdentity) + version-lookup resolver with pins_sha256 binding

> Task ID: T2
> Sprint: [SPRINT.md](./SPRINT.md)
> Status: Backlog
> Assignee: evals-implementer
> Priority: P1
> Points: 3
> Type: FEATURE
> Planner: evals-planner
> Proposed By: github-agentic-workflow-planner + evals-planner
> TDD_MODE: red_first · RED_GREEN_REQUIRED: true

AGENT: planner=evals-planner | implementer=evals-implementer | reviewer=evals-reviewer

**Depends on:** none
**Blocks:** T3 (its code needs this task's landed work), T5 (its code needs this task's landed work), T8 (its code needs this task's landed work), T12 (its code needs this task's landed work)

## Background

- **Source:** `.spec/prds/harness-eval-framework/09-technical-requirements/03-data-schema.md` (HarnessPins), `02-system-components.md` (version-lookup), `09-capability-chains.md` (pins@v1)
- **Human testing gate steps that exercise this task:** 5, 7
- **PRD references:** `03-data-schema.md` § Run and installation identity; `02-system-components.md` § version-lookup; `04-uc-grd.md` UC-GRD-01; `10-e2e-testing-criteria.md` T-GRD-001/T-GRD-002
- **Capabilities touched:** CAP-EVAL-01
- **Why it matters:** every one of the twelve cells is identified by an exact CLI version and a pins digest. Without one authoritative manifest there is no identity to bind a grade to, and a moving tag ('latest') would let two runs disagree while both read pass. The owner pre-answered the initial pin: claude-code 2.1.291, subject to real hosted-runner qualification.
- **Current (what this task consumes):** nothing. `test/harness/pins.json` does not exist; the surveyed versions in `02-system-components.md` are research observations, explicitly not qualified pins.
- **Desired (what this task provides):** `test/harness/pins.json` with one exact version per harness, the provider/model selection, and the credential environment name per harness; JSON schemas for `harness-eval-result/v1`, `HarnessCell`/`HarnessGrade` and `InstallationIdentity`; a version-lookup resolver that freezes the newest version once per run and computes `pins_sha256`; a reconciliation check against `package.json` that records intentional differences as named exceptions.
- **Boundary contracts:** no ranges, no `latest` alias, no missing harness; `pins.json` wins for grading; the fixer CLI version is a separate exact field in the same manifest; the digests are computed from the manifest bytes, never from a cache label or an install exit code.

## Critical Constraints

- MUST write exactly one exact CLI version for each of claude-code, codex, grok, opencode, pi and cursor into `test/harness/pins.json` — no range, no `latest`, no missing entry.
- MUST pin claude-code at 2.1.291 as the owner pre-answered, and MUST record that the pin is unqualified until a real hosted runner observes that version (a real run's `observed_cli_version` is the qualification, not this file).
- MUST compute `pins_sha256` as the SHA-256 of the exact `pins.json` bytes and MUST NOT accept a registry, cache or npm-resolved digest in its place.
- MUST record the credential environment name per harness as the names that already exist in the `harness-smoke` environment (`SMOKE_CLAUDE_KEY`, `SMOKE_CODEX_KEY`, `SMOKE_GROK_KEY`, `SMOKE_OPENCODE_KEY`, `SMOKE_PI_KEY`), and MUST NOT invent `ANTHROPIC_API_KEY` as a secret name or print any secret value.
- NEVER make `package.json` the grading authority or edit it: `pins.json` wins, and every intentional difference is a named exception inside `pins.json`.

## Specification

- **Objective:** Make one version-controlled manifest the sole pinned authority every cell's identity resolves against.
- **Success state:** `test/harness/pins.json` parses, names six exact CLI versions plus provider/model and credential env names, hashes to a 64-hex `pins_sha256`, and reconciles with `package.json` down to zero unnamed disagreements.

## Acceptance Criteria (GIVEN-WHEN-THEN)

### AC-1: Twelve-cell summary: every (harness, track) cell present with verdict word and observed CLI version, cursor never omitte

- **GIVEN:** seed/live-dispatch-run (RUN_ID + attempt-qualified artifacts via gh run download)
- **WHEN:** gh workflow run harness-eval; gh run watch <RUN_ID> until completed; gh run download <RUN_ID> -n harness-eval-result-<RUN_ID>-1 -D /tmp/he1
- **THEN:** jq '.cells|length' prints 12; unique harness count prints 6 with cursor in the set; claude-code/pinned checks print exactly: command_list pass, status pass, verify pass, question_before_expensive_work pass; cursor/pinned prints "could-not-run missing-api-key"; pins_sha256 is a 64-character hex string

```text
FLOW_REF:              FLOW-GRD-01-TWELVE-CELLS
TEST_TIER:             integration
VERIFICATION_SERVICE:  GitHub Actions harness-eval workflow + real harness CLIs + harness-smoke keys
SURFACE_POLICY:        .spec/e2e-policy/sprint-01/artifact-only-read.json
TDD_STATE:             none
TEST_FILE:             tests/sprint-01/grd-01-twelve-cells.test.mjs
TEST_FUNCTION:         FLOW-GRD-01-TWELVE-CELLS
VERIFY:                node --test tests/sprint-01/grd-01-twelve-cells.test.mjs --test-name-pattern FLOW-GRD-01-TWELVE-CELLS
```

- **RED input (fails on base):** Run the same command on base main: gh workflow list shows no harness-eval row, the download 404s, the module exits 1 and writes the .red report — exists today, verified by step 1's before state.
- **RED proof:** `.tmp/sprint-01-verification/grd-01-twelve-cells.json.red`
- **positive_example (passes after landing):** A fixture artifact with exactly 12 unique (harness,track) cells, each carrying an observed_cli_version, cursor present with could-not-run — the module exits 0. Mutation fixture (drop the cursor/pinned cell) flips it to 1.

SCENARIO_SUMMARY: complete SCENARIO lives once, in this AC's row of the REQUIREMENT-CONTRACT block below.

### AC-2: Hand dispatch: maintainer starts the grade by hand, checkout default, same matrix and checks as nightly

- **GIVEN:** seed/live-dispatch-run (RUN_ID + attempt-qualified artifacts via gh run download)
- **WHEN:** git rev-parse HEAD; gh workflow run harness-eval with no inputs; download artifact and read event/install_mode/candidate_sha
- **THEN:** event == workflow_dispatch; install_mode == checkout; candidate_sha == the dispatch commit sha; six harnesses present ("claude-code", "codex", "grok", "opencode", "pi", "cursor")

```text
FLOW_REF:              FLOW-RUN-02-HAND
TEST_TIER:             integration
VERIFICATION_SERVICE:  GitHub Actions harness-eval workflow + real harness CLIs + harness-smoke keys
SURFACE_POLICY:        .spec/e2e-policy/sprint-01/dispatch-allowed.json
TDD_STATE:             none
TEST_FILE:             tests/sprint-01/run-02-hand.test.mjs
TEST_FUNCTION:         FLOW-RUN-02-HAND
VERIFY:                node --test tests/sprint-01/run-02-hand.test.mjs --test-name-pattern FLOW-RUN-02-HAND
```

- **RED input (fails on base):** Base main: gh workflow run harness-eval fails with 'could not find any workflows named harness-eval' — the module captures that failure, exits 1, writes .red. Exists today.
- **RED proof:** `.tmp/sprint-01-verification/run-02-hand.json.red`
- **positive_example (passes after landing):** Dispatch with no inputs creates a run with event workflow_dispatch and install_mode=checkout recorded in the result (same twelve cells, same four checks as the nightly matrix shape) — module exits 0. Explicit published input is accepted and recorded as mode; full published grading resolution lands in sprint-03 by dependency plan (not declined debt).

SCENARIO_SUMMARY: complete SCENARIO lives once, in this AC's row of the REQUIREMENT-CONTRACT block below.

## Test Criteria

Each TC is an assertion inside its mapped AC's VERIFY command; its fail input and positive example are on its row in the REQUIREMENT-CONTRACT block.

| TC | Statement | Maps to |
|----|-----------|---------|

## Reading List

1. `.spec/prds/harness-eval-framework/09-technical-requirements/03-data-schema.md` § HarnessPins, InstallationIdentity — the exact field set this manifest must carry
2. `.spec/prds/harness-eval-framework/09-technical-requirements/02-system-components.md` § version-lookup — the per-harness newest-version command for each of the six CLIs
3. `.spec/prds/harness-eval-framework/09-technical-requirements/09-capability-chains.md` — pins@v1's position in the chain
4. `package.json` — the existing independent pins (for example `@earendil-works/pi-coding-agent`) the reconciliation reads
5. `brain/docs/TDD-METHODOLOGY.md` § TDD Cycle, Integration TDD — the RED → GREEN → REFACTOR shape

Coding standards:

- `AGENTS.md`
- `brain/docs/TDD-METHODOLOGY.md`
- `brain/docs/kanban/SCENARIO-CONTRACT-V1.md`

## Guardrails

WRITE-ALLOWED:

- test/harness/pins.json
- test/harness/schemas/
- test/harness/*.mjs (resolver + validation)
- tests/sprint-01/grd-01-twelve-cells.test.mjs
- tests/sprint-01/run-02-hand.test.mjs

WRITE-PROHIBITED:

- plugins/pixel-perfect/**
- .github/workflows/**
- package.json (read-only reconciliation)
- Any file not listed in write_allowed

## Code Pattern

```json
{
  "schema": "harness-pins/v1",
  "harnesses": {
    "claude-code": { "pinned_cli_version": "2.1.291", "provider": "anthropic", "model": "<exact>", "credential_env": "SMOKE_CLAUDE_KEY", "newest_lookup": "npm view @anthropic-ai/claude-code version" },
    "codex":       { "pinned_cli_version": "0.160.1", "credential_env": "SMOKE_CODEX_KEY", "newest_lookup": "npm view @openai/codex version" }
  },
  "fixer_cli_version": "<exact>",
  "exceptions": [ { "harness": "pi", "package_json_range": "<as declared>", "reason": "<named>" } ]
}
```

- **Source:** `.spec/prds/harness-eval-framework/09-technical-requirements/03-data-schema.md` § HarnessPins
- **Anti-pattern:** A `latest` alias or a semver range; a `pins_sha256` taken from a registry response; a silent disagreement with `package.json`; a cursor entry omitted because no Cursor CLI exists on the maintainer Mac.

## Design

None. This task has no screen or interaction surface.

## Agent Instructions

Work each AC as one RED, GREEN, REFACTOR cycle in AC order. For AC-1 write the pins loader test first and watch it fail because `test/harness/pins.json` is absent, then write the manifest. For AC-2 write the reconciliation test first and watch it fail on the missing manifest, then implement the check that reads `package.json` read-only. Never satisfy a test by adding a default; a missing pin is a missing pin.

- **AC-1:** `FLOW-GRD-01-TWELVE-CELLS` in `tests/sprint-01/grd-01-twelve-cells.test.mjs`, seeded from `seed/live-dispatch-run`.
- **AC-2:** `FLOW-RUN-02-HAND` in `tests/sprint-01/run-02-hand.test.mjs`, seeded from `seed/live-dispatch-run`.

## Orchestrator Verification Protocol

1. **VERIFY_RED:** on base `main` both VERIFY commands exit non-zero and the `.red` proof files exist at `.tmp/sprint-01-verification/grd-01-twelve-cells.json.red` and `.tmp/sprint-01-verification/run-02-hand.json.red`.
2. **VERIFY_GREEN:** after landing, the AC-1 and AC-2 VERIFY commands exit 0, and `pins_sha256` recomputed from the landed bytes equals the value the result artifact carries.
3. Run every Evidence Gate and compare with Expected.
4. `git diff --name-only` lists only WRITE-ALLOWED paths; `package.json` is untouched.
5. Dispatch `evals-reviewer` with this file, the RED and GREEN outputs, and the evidence.

## Agent Assignment

- **Planner role:** `evals-planner`
- **Implementer role:** `evals-implementer`
- **Reviewer role:** `evals-reviewer`
- **Rationale:** `evals-implementer` owns the eval/grading surface this task lands; `evals-reviewer` audits oracle strength, fixture reality and negative-path coverage.
- **Pairing:** `evals-implementer` builds; `evals-reviewer` reviews adversarially against the Review Criteria below.

## Evidence Gates

- **AC-1:** `node --test tests/sprint-01/grd-01-twelve-cells.test.mjs --test-name-pattern FLOW-GRD-01-TWELVE-CELLS`. Expected: prints the TAP `ok` line for FLOW-GRD-01-TWELVE-CELLS after reporting 12 cells, 6 unique harnesses including cursor, and a dotted observed_cli_version on each
- **AC-2:** `node --test tests/sprint-01/run-02-hand.test.mjs --test-name-pattern FLOW-RUN-02-HAND`. Expected: prints the TAP `ok` line for FLOW-RUN-02-HAND after reading `install_mode checkout` and a non-null `candidate_sha` from the artifact
- **reconciliation:** `node --check test/harness/pins.json`. Expected: exits 0 — the manifest is valid JSON with exactly six harness entries

## Review Criteria

Must pass:

- One test per AC, named exactly as its TEST_FUNCTION, in its TEST_FILE.
- RED evidence for every AC: the command failed before the manifest existed.
- Six exact versions, one per harness, with no range and no `latest`.
- `pins_sha256` is the digest of the manifest bytes and is not read from a registry or a cache label.
- `git diff --name-only` lists only WRITE-ALLOWED paths.

Should verify:

- The credential env names match the secrets that actually exist in `harness-smoke`, and no secret value appears anywhere in the diff or the evidence.
- Every deliberate `package.json` difference is a named exception with a reason, not a comment.
- The `newest_lookup` command per harness matches the PRD's per-harness lookup.

Verdict: APPROVED or NEEDS_FIXES, with file and line for each finding.

## Dependencies

- **Depends on:** none
- **Blocks:** T3 (its code needs this task's landed work), T5 (its code needs this task's landed work), T8 (its code needs this task's landed work), T12 (its code needs this task's landed work)

A shared file is not a dependency, and needing another task's output to test against is that flow's integration obligation, not an edge.

## Out of Scope

- Installing any harness CLI, or running any model call (T5 owns install, T9 owns credential binding).
- Deciding whether a historical surveyed version is a qualified pin — only a real hosted run qualifies a pin.
- Editing `package.json`, `plugins/pixel-perfect/**` or the workflow.

## Context

- **Current state:** `test/harness/` does not exist; there is no pins manifest, no schema and no resolver.
- **Gap:** Twelve cells cannot be identity-bound without a single pinned authority, so no grade can be reproduced.

## Notes

- **Owner decision applied:** claude-code pinned at 2.1.291 (sprint owner question 3). The pin is not a support promise; T5 records the version that was actually installed, and a mismatch is could-not-run `installation-identity-mismatch`.
- **Credential names:** the five `SMOKE_*` names are the secrets that exist in the `harness-smoke` environment. Cursor's binding stays declared as its own name and stays absent on day one, which is why cursor reads could-not-run `missing-api-key` (T10).
- **Split check:** not triggered — 3 points, one failure mode (no authoritative pin).
- **Owner:** evals-planner; sprint `sprint-01-evaluator-evidence-spine`.

<!-- REQUIREMENT-CONTRACT v1 -->
<!--
{
  "version": "1",
  "task_id": "T2",
  "task_type": "FEATURE",
  "tdd_mode": "red_first",
  "verification_policy": {
    "requires_tests": true,
    "requires_red_evidence": true,
    "requires_seeded_evidence": true
  },
  "guardrails": {
    "write_allowed": [
      "test/harness/pins.json",
      "test/harness/schemas/",
      "test/harness/*.mjs (resolver + validation)",
      "tests/sprint-01/grd-01-twelve-cells.test.mjs",
      "tests/sprint-01/run-02-hand.test.mjs"
    ],
    "write_prohibited": [
      "plugins/pixel-perfect/**",
      ".github/workflows/**",
      "package.json (read-only reconciliation)"
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
      "flow_ref": "FLOW-GRD-01-TWELVE-CELLS",
      "title": "Twelve-cell summary: every (harness, track) cell present with verdict word and observed CLI version, cursor never omitte",
      "test_tier": "integration",
      "verification_service": "GitHub Actions harness-eval workflow + real harness CLIs + harness-smoke keys",
      "verify": "node --test tests/sprint-01/grd-01-twelve-cells.test.mjs --test-name-pattern FLOW-GRD-01-TWELVE-CELLS",
      "test_file": "tests/sprint-01/grd-01-twelve-cells.test.mjs",
      "test_function": "FLOW-GRD-01-TWELVE-CELLS",
      "positive_example": "A fixture artifact with exactly 12 unique (harness,track) cells, each carrying an observed_cli_version, cursor present with could-not-run \u2014 the module exits 0. Mutation fixture (drop the cursor/pinned cell) flips it to 1.",
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "scenario": {
        "tier": "e2e-automated",
        "negative_control": {
          "would_fail_if": [
            "the recorder emitted fewer than 12 cells or a duplicate (harness, track) pair \u2014 the .red drop-cell mutation must be rejected with reason cells-incomplete",
            "any verdict outside pass|fail|could-not-run appeared \u2014 vocabulary rejection fires",
            "an absent adapter were omitted instead of present-as-could-not-run \u2014 cells|length != 12 fails",
            "pins_sha256 were absent or not 64-hex \u2014 identity binding fails"
          ]
        },
        "evidence": {
          "forms": [
            "harness-eval-result artifact JSON",
            "Actions run metadata"
          ],
          "examples": [
            "cells|length == 12",
            "unique harnesses == 6",
            "pins_sha256 matches ^[0-9a-f]{64}$"
          ],
          "required_capture": "the downloaded artifact file plus its gh api artifact listing line so cell counts are bound to a real run"
        },
        "cases": [
          {
            "start_ref": "seed/live-dispatch-run",
            "action": {
              "actor": "maintainer",
              "steps": [
                "gh workflow run harness-eval",
                "gh run watch <RUN_ID> until completed",
                "gh run download <RUN_ID> -n harness-eval-result-<RUN_ID>-1 -D /tmp/he1"
              ]
            },
            "end_state": {
              "must_observe": [
                "jq '.cells|length' prints 12",
                "unique harness count prints 6 with cursor in the set",
                "claude-code/pinned checks print exactly: command_list pass, status pass, verify pass, question_before_expensive_work pass",
                "cursor/pinned prints \"could-not-run missing-api-key\"",
                "pins_sha256 is a 64-character hex string"
              ],
              "must_not_observe": [
                "any empty or null .verdict field",
                "a cursor cell with reason adapter-absent",
                "any of codex/grok/opencode/pi cells with verdict pass",
                "cells|length of 11 or 13, or a duplicate (harness,track) pair"
              ]
            }
          },
          {
            "start_ref": "seed/live-dispatch-run",
            "action": {
              "actor": "runner",
              "steps": [
                "node tests/sprint-01/flow-runner.mjs grd-01 --run latest --mutate drop-cell --expect red"
              ]
            },
            "end_state": {
              "must_observe": [
                "exit code non-zero with rejection reason containing \"cells-incomplete\"",
                ".red file written recording the 11-cell mutated artifact hash"
              ],
              "must_not_observe": [
                "validator acceptance of the 11-cell result",
                "any write to the downloaded original artifact (0 writes besides the flow report)"
              ]
            }
          }
        ],
        "topology_note": "GitHub-hosted runner runs harness-eval (12-cell matrix) + grade recorder; local replay downloads harness-eval-result-<run_id>-<attempt> via gh and validates with the recorder's own schema validator",
        "test_tier": "e2e"
      },
      "red_input": "Run the same command on base main: gh workflow list shows no harness-eval row, the download 404s, the module exits 1 and writes the .red report \u2014 exists today, verified by step 1's before state.",
      "red_proof": ".tmp/sprint-01-verification/grd-01-twelve-cells.json.red",
      "description": "GIVEN seed/live-dispatch-run (RUN_ID + attempt-qualified artifacts via gh run download) WHEN gh workflow run harness-eval; gh run watch <RUN_ID> until completed; gh run download <RUN_ID> -n harness-eval-result-<RUN_ID>-1 -D /tmp/he1 THEN jq '.cells|length' prints 12; unique harness count prints 6 with cursor in the set; claude-code/pinned checks print exactly: command_list pass, status pass, verify pass, question_before_expensive_work pass; cursor/pinned prints \"could-not-run missing-api-key\"; pins_sha256 is a 64-character hex string",
      "maps_to_ac": null
    },
    {
      "id": "AC-2",
      "type": "acceptance_criterion",
      "primary": false,
      "flow_ref": "FLOW-RUN-02-HAND",
      "title": "Hand dispatch: maintainer starts the grade by hand, checkout default, same matrix and checks as nightly",
      "test_tier": "integration",
      "verification_service": "GitHub Actions harness-eval workflow + real harness CLIs + harness-smoke keys",
      "verify": "node --test tests/sprint-01/run-02-hand.test.mjs --test-name-pattern FLOW-RUN-02-HAND",
      "test_file": "tests/sprint-01/run-02-hand.test.mjs",
      "test_function": "FLOW-RUN-02-HAND",
      "positive_example": "Dispatch with no inputs creates a run with event workflow_dispatch and install_mode=checkout recorded in the result (same twelve cells, same four checks as the nightly matrix shape) \u2014 module exits 0. Explicit published input is accepted and recorded as mode; full published grading resolution lands in sprint-03 by dependency plan (not declined debt).",
      "surface_policy": ".spec/e2e-policy/sprint-01/dispatch-allowed.json",
      "scenario": {
        "tier": "e2e-automated",
        "negative_control": {
          "would_fail_if": [
            "a default (no-input) dispatch recorded install_mode published or a release candidate_sha \u2014 the checkout identity is omitted",
            "a published dispatch carried checkout identity \u2014 R-mode-mixup guard fires",
            "mode were inferred from logs instead of artifact fields"
          ]
        },
        "evidence": {
          "forms": [
            "artifact identity fields (event, install_mode, candidate_sha, plugin_revision)",
            "gh run list event column"
          ],
          "examples": [
            "event workflow_dispatch",
            "install_mode checkout with candidate_sha == dispatch commit",
            "published input yields install_mode published, candidate_sha null, could-not-run cells naming release resolution"
          ],
          "required_capture": "dispatch commit sha from git and the artifact's candidate_sha for equality, plus both run ids"
        },
        "cases": [
          {
            "start_ref": "seed/live-dispatch-run",
            "action": {
              "actor": "maintainer",
              "steps": [
                "git rev-parse HEAD",
                "gh workflow run harness-eval with no inputs",
                "download artifact and read event/install_mode/candidate_sha"
              ]
            },
            "end_state": {
              "must_observe": [
                "event == workflow_dispatch",
                "install_mode == checkout",
                "candidate_sha == the dispatch commit sha",
                "six harnesses present (\"claude-code\", \"codex\", \"grok\", \"opencode\", \"pi\", \"cursor\")"
              ],
              "must_not_observe": [
                "install_mode \"published\" on a default (no-input) dispatch",
                "candidate_sha null on the checkout run",
                "mode asserted from logs"
              ]
            }
          },
          {
            "start_ref": "seed/live-dispatch-published",
            "action": {
              "actor": "runner",
              "steps": [
                "gh workflow run harness-eval -f install_mode=published",
                "node tests/sprint-01/flow-runner.mjs run-02 --fixture published-dispatch --expect red"
              ]
            },
            "end_state": {
              "must_observe": [
                "artifact records install_mode \"published\" and candidate_sha null",
                "cells honestly read \"could-not-run\" naming release resolution, never checkout-substituted"
              ],
              "must_not_observe": [
                "candidate_sha == dispatch commit on the published run",
                "a pass verdict on any published-mode cell in sprint-01 (no graded cells exist there)"
              ]
            }
          }
        ],
        "topology_note": "workflow_dispatch on main with install_mode input (checkout default); artifact records event, install_mode, candidate_sha; a second dispatch with explicit published records published mode without checkout substitution",
        "test_tier": "e2e"
      },
      "red_input": "Base main: gh workflow run harness-eval fails with 'could not find any workflows named harness-eval' \u2014 the module captures that failure, exits 1, writes .red. Exists today.",
      "red_proof": ".tmp/sprint-01-verification/run-02-hand.json.red",
      "description": "GIVEN seed/live-dispatch-run (RUN_ID + attempt-qualified artifacts via gh run download) WHEN git rev-parse HEAD; gh workflow run harness-eval with no inputs; download artifact and read event/install_mode/candidate_sha THEN event == workflow_dispatch; install_mode == checkout; candidate_sha == the dispatch commit sha; six harnesses present (\"claude-code\", \"codex\", \"grok\", \"opencode\", \"pi\", \"cursor\")",
      "maps_to_ac": null
    },
    {
      "id": "TC-1",
      "type": "test_criterion",
      "primary": false,
      "description": "The pins manifest names exactly one exact CLI version for each of the six harnesses, with no range or latest alias",
      "verify": "node --test tests/sprint-01/grd-01-twelve-cells.test.mjs --test-name-pattern FLOW-GRD-01-TWELVE-CELLS",
      "maps_to_ac": "AC-1",
      "test_file": "tests/sprint-01/grd-01-twelve-cells.test.mjs",
      "test_function": "FLOW-GRD-01-TWELVE-CELLS",
      "test_tier": "integration",
      "verification_service": "GitHub Actions harness-eval workflow + real harness CLIs + harness-smoke keys",
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "scenario": {
        "tier": "e2e-automated",
        "negative_control": {
          "would_fail_if": [
            "the recorder emitted fewer than 12 cells or a duplicate (harness, track) pair \u2014 the .red drop-cell mutation must be rejected with reason cells-incomplete",
            "any verdict outside pass|fail|could-not-run appeared \u2014 vocabulary rejection fires",
            "an absent adapter were omitted instead of present-as-could-not-run \u2014 cells|length != 12 fails",
            "pins_sha256 were absent or not 64-hex \u2014 identity binding fails"
          ]
        },
        "evidence": {
          "forms": [
            "harness-eval-result artifact JSON",
            "Actions run metadata"
          ],
          "examples": [
            "cells|length == 12",
            "unique harnesses == 6",
            "pins_sha256 matches ^[0-9a-f]{64}$"
          ],
          "required_capture": "the downloaded artifact file plus its gh api artifact listing line so cell counts are bound to a real run"
        },
        "cases": [
          {
            "start_ref": "seed/live-dispatch-run",
            "action": {
              "actor": "maintainer",
              "steps": [
                "gh workflow run harness-eval",
                "gh run watch <RUN_ID> until completed",
                "gh run download <RUN_ID> -n harness-eval-result-<RUN_ID>-1 -D /tmp/he1"
              ]
            },
            "end_state": {
              "must_observe": [
                "jq '.cells|length' prints 12",
                "unique harness count prints 6 with cursor in the set",
                "claude-code/pinned checks print exactly: command_list pass, status pass, verify pass, question_before_expensive_work pass",
                "cursor/pinned prints \"could-not-run missing-api-key\"",
                "pins_sha256 is a 64-character hex string"
              ],
              "must_not_observe": [
                "any empty or null .verdict field",
                "a cursor cell with reason adapter-absent",
                "any of codex/grok/opencode/pi cells with verdict pass",
                "cells|length of 11 or 13, or a duplicate (harness,track) pair"
              ]
            }
          },
          {
            "start_ref": "seed/live-dispatch-run",
            "action": {
              "actor": "runner",
              "steps": [
                "node tests/sprint-01/flow-runner.mjs grd-01 --run latest --mutate drop-cell --expect red"
              ]
            },
            "end_state": {
              "must_observe": [
                "exit code non-zero with rejection reason containing \"cells-incomplete\"",
                ".red file written recording the 11-cell mutated artifact hash"
              ],
              "must_not_observe": [
                "validator acceptance of the 11-cell result",
                "any write to the downloaded original artifact (0 writes besides the flow report)"
              ]
            }
          }
        ],
        "topology_note": "GitHub-hosted runner runs harness-eval (12-cell matrix) + grade recorder; local replay downloads harness-eval-result-<run_id>-<attempt> via gh and validates with the recorder's own schema validator",
        "test_tier": "e2e"
      },
      "flow_ref": null,
      "red_input": "on base main test/harness/pins.json does not exist, so the loader exits non-zero",
      "positive_example": "pins.json resolves claude-code 2.1.291, codex 0.160.1, grok 1.0.46, opencode 1.18.34, pi 1.0.4, cursor 2026.10.01-e373342"
    },
    {
      "id": "TC-2",
      "type": "test_criterion",
      "primary": false,
      "description": "pins_sha256 is the 64-hex SHA-256 of the pins manifest bytes and is bound into the result",
      "verify": "node --test tests/sprint-01/grd-01-twelve-cells.test.mjs --test-name-pattern FLOW-GRD-01-TWELVE-CELLS",
      "maps_to_ac": "AC-1",
      "test_file": "tests/sprint-01/grd-01-twelve-cells.test.mjs",
      "test_function": "FLOW-GRD-01-TWELVE-CELLS",
      "test_tier": "integration",
      "verification_service": "GitHub Actions harness-eval workflow + real harness CLIs + harness-smoke keys",
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "scenario": {
        "tier": "e2e-automated",
        "negative_control": {
          "would_fail_if": [
            "the recorder emitted fewer than 12 cells or a duplicate (harness, track) pair \u2014 the .red drop-cell mutation must be rejected with reason cells-incomplete",
            "any verdict outside pass|fail|could-not-run appeared \u2014 vocabulary rejection fires",
            "an absent adapter were omitted instead of present-as-could-not-run \u2014 cells|length != 12 fails",
            "pins_sha256 were absent or not 64-hex \u2014 identity binding fails"
          ]
        },
        "evidence": {
          "forms": [
            "harness-eval-result artifact JSON",
            "Actions run metadata"
          ],
          "examples": [
            "cells|length == 12",
            "unique harnesses == 6",
            "pins_sha256 matches ^[0-9a-f]{64}$"
          ],
          "required_capture": "the downloaded artifact file plus its gh api artifact listing line so cell counts are bound to a real run"
        },
        "cases": [
          {
            "start_ref": "seed/live-dispatch-run",
            "action": {
              "actor": "maintainer",
              "steps": [
                "gh workflow run harness-eval",
                "gh run watch <RUN_ID> until completed",
                "gh run download <RUN_ID> -n harness-eval-result-<RUN_ID>-1 -D /tmp/he1"
              ]
            },
            "end_state": {
              "must_observe": [
                "jq '.cells|length' prints 12",
                "unique harness count prints 6 with cursor in the set",
                "claude-code/pinned checks print exactly: command_list pass, status pass, verify pass, question_before_expensive_work pass",
                "cursor/pinned prints \"could-not-run missing-api-key\"",
                "pins_sha256 is a 64-character hex string"
              ],
              "must_not_observe": [
                "any empty or null .verdict field",
                "a cursor cell with reason adapter-absent",
                "any of codex/grok/opencode/pi cells with verdict pass",
                "cells|length of 11 or 13, or a duplicate (harness,track) pair"
              ]
            }
          },
          {
            "start_ref": "seed/live-dispatch-run",
            "action": {
              "actor": "runner",
              "steps": [
                "node tests/sprint-01/flow-runner.mjs grd-01 --run latest --mutate drop-cell --expect red"
              ]
            },
            "end_state": {
              "must_observe": [
                "exit code non-zero with rejection reason containing \"cells-incomplete\"",
                ".red file written recording the 11-cell mutated artifact hash"
              ],
              "must_not_observe": [
                "validator acceptance of the 11-cell result",
                "any write to the downloaded original artifact (0 writes besides the flow report)"
              ]
            }
          }
        ],
        "topology_note": "GitHub-hosted runner runs harness-eval (12-cell matrix) + grade recorder; local replay downloads harness-eval-result-<run_id>-<attempt> via gh and validates with the recorder's own schema validator",
        "test_tier": "e2e"
      },
      "flow_ref": null,
      "red_input": "a result artifact with an absent or non-hex pins_sha256 is rejected",
      "positive_example": "the live artifact's .pins_sha256 equals the locally recomputed digest of the same pins.json"
    },
    {
      "id": "TC-3",
      "type": "test_criterion",
      "primary": false,
      "description": "pins.json and package.json agree for every harness both files pin, and an intentional difference is a named exception in pins.json",
      "verify": "node --test tests/sprint-01/run-02-hand.test.mjs --test-name-pattern FLOW-RUN-02-HAND",
      "maps_to_ac": "AC-2",
      "test_file": "tests/sprint-01/run-02-hand.test.mjs",
      "test_function": "FLOW-RUN-02-HAND",
      "test_tier": "integration",
      "verification_service": "GitHub Actions harness-eval workflow + real harness CLIs + harness-smoke keys",
      "surface_policy": ".spec/e2e-policy/sprint-01/dispatch-allowed.json",
      "scenario": {
        "tier": "e2e-automated",
        "negative_control": {
          "would_fail_if": [
            "a default (no-input) dispatch recorded install_mode published or a release candidate_sha \u2014 the checkout identity is omitted",
            "a published dispatch carried checkout identity \u2014 R-mode-mixup guard fires",
            "mode were inferred from logs instead of artifact fields"
          ]
        },
        "evidence": {
          "forms": [
            "artifact identity fields (event, install_mode, candidate_sha, plugin_revision)",
            "gh run list event column"
          ],
          "examples": [
            "event workflow_dispatch",
            "install_mode checkout with candidate_sha == dispatch commit",
            "published input yields install_mode published, candidate_sha null, could-not-run cells naming release resolution"
          ],
          "required_capture": "dispatch commit sha from git and the artifact's candidate_sha for equality, plus both run ids"
        },
        "cases": [
          {
            "start_ref": "seed/live-dispatch-run",
            "action": {
              "actor": "maintainer",
              "steps": [
                "git rev-parse HEAD",
                "gh workflow run harness-eval with no inputs",
                "download artifact and read event/install_mode/candidate_sha"
              ]
            },
            "end_state": {
              "must_observe": [
                "event == workflow_dispatch",
                "install_mode == checkout",
                "candidate_sha == the dispatch commit sha",
                "six harnesses present (\"claude-code\", \"codex\", \"grok\", \"opencode\", \"pi\", \"cursor\")"
              ],
              "must_not_observe": [
                "install_mode \"published\" on a default (no-input) dispatch",
                "candidate_sha null on the checkout run",
                "mode asserted from logs"
              ]
            }
          },
          {
            "start_ref": "seed/live-dispatch-published",
            "action": {
              "actor": "runner",
              "steps": [
                "gh workflow run harness-eval -f install_mode=published",
                "node tests/sprint-01/flow-runner.mjs run-02 --fixture published-dispatch --expect red"
              ]
            },
            "end_state": {
              "must_observe": [
                "artifact records install_mode \"published\" and candidate_sha null",
                "cells honestly read \"could-not-run\" naming release resolution, never checkout-substituted"
              ],
              "must_not_observe": [
                "candidate_sha == dispatch commit on the published run",
                "a pass verdict on any published-mode cell in sprint-01 (no graded cells exist there)"
              ]
            }
          }
        ],
        "topology_note": "workflow_dispatch on main with install_mode input (checkout default); artifact records event, install_mode, candidate_sha; a second dispatch with explicit published records published mode without checkout substitution",
        "test_tier": "e2e"
      },
      "flow_ref": null,
      "red_input": "a pins.json value differing from package.json with no recorded exception makes the check exit 1",
      "positive_example": "pi pins 1.0.4 against package.json's @earendil-works/pi-coding-agent pin with the exception recorded by name"
    }
  ]
}
-->

