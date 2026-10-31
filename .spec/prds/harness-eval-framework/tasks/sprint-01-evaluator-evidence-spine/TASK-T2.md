# TASK-T2: Create test/harness/pins.json (six exact CLI versions, provider/model, credential env names, pins-vs-package.json reconciliation) + JSON schemas (harness-eval-result/v1, HarnessCell/HarnessGrade, InstallationIdentity) + version-lookup resolver with pins_sha256 binding

> Task ID: T2
> Sprint: [SPRINT.md](./SPRINT.md)
> Status: ✅ Completed

Commit: ead12559a15e323ad092378b3dfc37a7ecc5f0e9
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


## Handoff

```json
{
  "task": "T2",
  "commit_sha": "ead12559a15e323ad092378b3dfc37a7ecc5f0e9",
  "done": "PROVISIONAL SUBSTITUTE-AUTHOR DRAFT ONLY; unapproved and not the original author's testimony. Recorded landing d49507dedc40264b2c93e68b6a64e494fa6b3dfe contains approved candidate ead12559a15e323ad092378b3dfc37a7ecc5f0e9 against base 0ac4d7aea735d8e9e03ffdcbf0b63f2219d30ad4: test/harness/pins.json, pins.mjs, validate.mjs, three JSON schemas, and the two sprint-01 identity-contract tests. The eight-file delta establishes six exact CLI pins, bytes-derived pins_sha256, a twelve-cell could-not-run builder, a per-resolver frozen newest-version lookup, package.json reconciliation, structural validation, pass-evidence presence checks and caller-supplied dispatch identity checks. The recorded cycle-2 reviewer approved the candidate and reported both local checks passing; AC-1/AC-2 and both hosted flows remained DEFERRED with live_artifact=absent. This draft does not record a handoff, complete T2, qualify any pin or establish hosted acceptance.",
  "deviations": [
    "The locked scenarios name tests/sprint-01/flow-runner.mjs, but that file is absent from the approved candidate. Negative controls instead run inside the two allowed test files. This describes the landed difference; no original-author reason or approved scenario amendment is established.",
    "The required initial RED proof was not authenticated by the frozen review: it verified the missing-base-files premise structurally and later reviewed cycle-2 pre-fix/post-fix probes. Both required .tmp/sprint-01-verification/*.json.red files exist now and contain ERR_MODULE_NOT_FOUND pins.mjs TAP text, but lack commit/session bindings; their current presence does not prove original pre-manifest test execution.",
    "The pass-evidence condition is implemented by validateResult/assertPassEvidence, not the cell schema alone. Schema-only consumers can accept present-but-empty evidence fields. The shipped validator supports a limited JSON-Schema keyword subset.",
    "pins.json extends the example shape with authority/tracks/checks, package_name/model_kind/binding_env, fixer_harness and qualification fields. Cursor uses CURSOR_API_KEY as its credential name, consistent with task Notes despite the critical constraints listing only the five SMOKE_* names.",
    "The manifest selects claude-code model alias opus and marks all pins/provider-model selections unqualified. The model identity ruling and resolved-model representation remain unresolved (F-T2-7/U-T2-2).",
    "The newest-version test injects canned successful lookup strings and a simulated failure instead of exercising the production defaultExec registry/network path. This is stubbed external-dependency coverage and is a concrete blocker to fresh resolver-integration or completion claims under the no-stubbing rule."
  ],
  "concerns": [
    "Original registered implementer session 435bc7f5-d46b-416 is historical/unreachable in this thread. No owner authorization for substitute authorship has been supplied. State records landed with handoff_delivery pending; the older T2/handoff.json is only an unrecorded substitute lead. No authenticated original final report is established by this preparation.",
    "Hosted proof remains deferred: AC-1/FLOW-GRD-01-TWELVE-CELLS on T1/T10/T8; AC-2/FLOW-RUN-02-HAND on T1/T8. The historical local tests and approval establish neither real model grading nor a hosted dispatch artifact. No product tests, model calls, registry calls or hosted runs were executed for this documentation preparation.",
    "F-T2-8 remains advisory and unresolved: nonempty evidence_paths arrays can contain blank or nonexistent paths. The validator checks array presence, invocation_id length, integer exit status and a check not marked could-not-run; it does not authenticate evidence bytes or the claimed invocation.",
    "F-T2-9 remains advisory and unresolved: both live-artifact test branches fall back from HARNESS_EVAL_DISPATCH_SHA to artifact.head_sha. Matching fabricated candidate_sha/head_sha can satisfy that comparison; trusted dispatch identity must come from outside the artifact.",
    "F-T2-7 remains advisory and unresolved: no shipped cell/installation schema field records the resolved model id for opus, and cellsFromPins copies requested_cli_version into resolved_cli_version without actual installation resolution. Its emitted verdicts remain could-not-run.",
    "Cycle-2 summary and evidence report improvements for F-T2-4/F-T2-5/F-T2-6, but their structured rows still say ADVISORY with resolution null. Preserve this inconsistency; do not silently convert those rows into closed findings. F-T2-1/F-T2-2/F-T2-3 are explicitly FIXED.",
    "The reviewer reports version-match pass mutants survived vacuously because local installed versions did not match pins. Unconditional pass mutants were caught. This does not prove every matching-version runtime path. The canned resolver callback separately leaves actual lookup integration unverified.",
    "pins_sha256 is aed5c0c03c0ced2f879b67703163ed94191cff662cc07768b01d1833d3c9d411 for these exact bytes; whitespace edits change identity. validateResult requires the readable colocated manifest and an external dispatchSha for checkout records. Reconciliation skips harnesses without a package_name present in package.json; the named pi disagreement is 1.0.4 versus 0.84.4."
  ],
  "findings": [
    "Recorded review evidence, source snapshots and exact candidate bytes agree on the three blocking repairs: reject missing pass evidence, bind result digests unconditionally to manifest bytes, and accept dispatch identity as an external comparison target. The substitute inspected those records and source; it did not rerun their tests.",
    "The approved delta is exactly eight allowed files with 1564 inserted lines, and package.json bytes equal the reviewed base. Candidate ead1255 is a merge commit; its full task delta must be compared against reviewed base 0ac4d7a, not only its first-parent diff.",
    "All four cycle-2 review-bundle references, all four delivery-bundle references and all 24 recorded evidence artifact hashes matched when read. The retained pins.json/pins.mjs/validate.mjs snapshots match exact candidate blobs. Hash agreement establishes retained-byte consistency, not fresh execution or original-author testimony.",
    "Recovery source inspection exposes canned newest-version dependency responses at grd-01-twelve-cells.test.mjs:291-320 (and simulated failure immediately after). Production createVersionResolver defaults to defaultExec at pins.mjs:237 and executes commands through bash at pins.mjs:214-219. No real lookup verification was established from this frozen bundle.",
    "Current .red-file presence contradicts the older substitute draft's blanket absence statement. Their contents and provenance limits are retained in T2.evidence.md; no replacement receipt or retrospective author statement was invented."
  ],
  "scope_impact": [
    {
      "target": "T3",
      "found": "The pass validator checks evidence-field presence but accepts blank/nonexistent evidence paths (F-T2-8).",
      "change": "Proposed follow-up only: define the run evidence root and evidence authenticity/path validation, populate real invocation evidence, and review the fix before relying on pass verdicts."
    },
    {
      "target": "T5",
      "found": "CLI/model selections are unqualified; opus lacks a resolved-model field; newest-version coverage uses a canned dependency callback.",
      "change": "Proposed follow-up only: obtain the planner ruling for U-T2-2, record actual observed CLI/model identities, and verify the production resolver against real lookup endpoints before claiming qualification."
    },
    {
      "target": "T8",
      "found": "validateResult needs its manifest and an external trusted dispatchSha; schema-only validation omits pass-evidence and identity rules.",
      "change": "Proposed follow-up only: make recorder validation call validateResult with independently obtained run identity and authentic invocation artifacts; verify it on a real hosted artifact."
    },
    {
      "target": "T1",
      "found": "Both tests' live branches trust artifact.head_sha as a fallback (F-T2-9), and no live artifact was present in the recorded review.",
      "change": "Proposed follow-up only: remove artifact-derived trust, supply HARNESS_EVAL_RESULT and trusted HARNESS_EVAL_DISPATCH_SHA from run metadata, and run the hosted flow when dependencies permit."
    },
    {
      "target": "T10",
      "found": "Cursor credential_env is CURSOR_API_KEY; the task notes declare it absent on day one and the builder retains both cursor cells as could-not-run.",
      "change": "Preserve the declared credential name and explicit cells; any credential/environment setup and hosted missing-key/available-key proof remain separate authorized work. This draft does not inspect or assert current secret availability."
    },
    {
      "target": "T12",
      "found": "Recorded advisory closure labels disagree with the summary; evidence presence and source-shaped resolver tests do not establish real integration.",
      "change": "Proposed follow-up only: reconcile F-T2-4/5/6 dispositions, preserve F-T2-7/8/9 and U-T2-1/2, and audit recorder consumers plus real resolver proof without treating historical approval as final acceptance."
    },
    {
      "target": "GATE:FLOW-GRD-01-TWELVE-CELLS",
      "found": "The locked scenario invokes an absent flow-runner while shipped negatives are in-process tests; real hosted proof remains deferred.",
      "change": "Planner/orchestrator must resolve the executable scenario mismatch through an authorized amendment or implementation and then obtain the required hosted proof; this draft grants neither."
    },
    {
      "target": "ROADMAP",
      "found": "Historical RED was structurally inferred, later probes predate the final candidate, present .red files lack authenticated provenance, and substitute authorship is not yet authorized.",
      "change": "Keep these evidence limits and completion block visible. Seek owner authorization only for concrete substitute delivery, and obtain any required missing proof through the governed path; do not silently waive it."
    }
  ],
  "feedback": [
    "Separate historical landed-code reconstruction from original-author intent, current runtime verification and completion authority. This draft supplies only the reconstruction.",
    "Retain structured finding statuses even when summary prose claims closure; request an explicit disposition rather than rewriting review history.",
    "Keep the real-registry resolver proof distinct from parser/caching controls fed with canned responses. Passing those controls cannot satisfy the no-stubbing integration standard.",
    "T2.evidence.md records exact candidate/base identities, source line references, consulted bundle hashes, historical command results, new read-only integrity checks and unresolved questions. Suggested scope changes here are not recorded decisions."
  ]
}
```
