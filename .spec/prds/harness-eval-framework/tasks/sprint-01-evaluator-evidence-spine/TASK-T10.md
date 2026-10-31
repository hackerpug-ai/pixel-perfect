# TASK-T10: Wire fail-closed cells: cursor version-lookup + could-not-run missing-api-key on every check, and adapter-absent could-not-run for codex/grok/opencode/pi so all twelve cells always exist

> Task ID: T10
> Sprint: [SPRINT.md](./SPRINT.md)
> Status: ✅ Completed

Commit: d0971632371f2069f4209e66ff38fbacd560bcd5
> Assignee: evals-implementer
> Priority: P1
> Points: 3
> Type: FEATURE
> Planner: evals-planner
> Proposed By: github-agentic-workflow-planner + evals-planner
> TDD_MODE: red_first · RED_GREEN_REQUIRED: true

AGENT: planner=evals-planner | implementer=evals-implementer | reviewer=evals-reviewer

**Depends on:** T3 (capture@v1), T8 (recorder@v1)
**Blocks:** T12 (its code needs this task's landed work)

## Background

- **Source:** `.spec/prds/harness-eval-framework/09-technical-requirements/03-data-schema.md` (HarnessCell, CredentialBinding), `02-system-components.md` (version-lookup, cursor-adapter, invocation-guard), `09-capability-chains.md` (lookup@v1)
- **Human testing gate steps that exercise this task:** 5, 9, 11
- **PRD references:** `03-data-schema.md` § CommandTranslation / CredentialBinding, § Run and installation identity; `02-system-components.md` § version-lookup, § cursor-adapter, § invocation-guard; `04-uc-grd.md` UC-GRD-01 AC-3, UC-GRD-06; `10-e2e-testing-criteria.md` T-GRD-003, T-GRD-021, T-GRD-022
- **Capabilities touched:** CAP-EVAL-01
- **Why it matters:** the run has to be complete before it can be honest. Twelve cells must always exist; cursor must be a real cell reading could-not-run `missing-api-key` on day one rather than an omission, and the four adapter-pending harnesses must read could-not-run with named reasons rather than disappearing. An absent cell is indistinguishable from a green run, which is exactly the failure this task prevents.
- **Current (what this task consumes):** T3's invocation-guard and credential binding; T8's recorder contract for the twelve-cell matrix.
- **Desired (what this task provides):** the cursor version-lookup path (parse `https://cursor.com/install` for the first `downloads.cursor.com/lab/<version>` token) with a lookup failure making the newest track could-not-run; `could-not-run missing-api-key` emitted from the guard's credential check on every check of a keyless cell; and an absent-adapter registry that emits a real could-not-run cell with a named reason for codex, grok, opencode and pi.
- **Boundary contracts:** a version-lookup failure never omits a cell; a missing key never becomes pass through exit 0 or another harness's credential; cursor's reason comes from the guard code path, never from a cursor-specific constant; no Cursor installer runs on the maintainer Mac (it relinks `~/.local/bin/agent`, which is Grok).

## Critical Constraints

- MUST emit a real cell reading `could-not-run` with reason `missing-api-key` for cursor from the guard's own credential check — NEVER omit the cell, NEVER a pass, and NEVER a special-cased cursor string.
- MUST emit all four adapter-pending harnesses (codex, grok, opencode, pi) as real cells reading `could-not-run` with named reasons — an absent cell or a pass fails the twelve-cell rule.
- MUST make a version-lookup failure produce could-not-run for the newest track with the lookup reason recorded, keeping the cell count at twelve.
- MUST NEVER invent `ANTHROPIC_API_KEY` as a secret name and MUST NEVER print, log or echo a secret value — the binding names are the `harness-smoke` secrets that already exist.
- MUST NOT run the Cursor installer on the maintainer Mac; cursor is proven only on a runner.

## Specification

- **Objective:** Guarantee twelve cells on every run, each with an honest named reason when it could not be graded.
- **Success state:** A run whose lookups fail or whose keys are absent still yields 12 unique (harness, track) cells: cursor reads could-not-run `missing-api-key` from the guard, and codex, grok, opencode and pi read could-not-run with their own named reasons.

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

### AC-2: Missing credential fails closed: could-not-run missing-api-key before any model request, never readable as pass [PRIMARY]

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

1. `.spec/prds/harness-eval-framework/09-technical-requirements/03-data-schema.md` § CommandTranslation / CredentialBinding — the per-harness binding table and 'unsupported credential mapping is a blocker, not an invented success'
2. `.spec/prds/harness-eval-framework/09-technical-requirements/02-system-components.md` § version-lookup, § cursor-adapter — the exact lookup commands and the Cursor installer hazard
3. `.spec/prds/harness-eval-framework/09-technical-requirements/02-system-components.md` § invocation-guard — the missing-api-key refusal contract
4. `.spec/prds/harness-eval-framework/10-e2e-testing-criteria.md` T-GRD-021, T-GRD-022 — the missing-key criteria this task proves
5. `test/harness/adapters/registry.mjs` — the registry this task creates and the absent-adapter module beside it

Coding standards:

- `AGENTS.md`
- `brain/docs/TDD-METHODOLOGY.md`
- `brain/docs/kanban/SCENARIO-CONTRACT-V1.md`

## Guardrails

WRITE-ALLOWED:

- test/harness/adapters/absent.mjs
- test/harness/adapters/registry.mjs
- tests/sprint-01/grd-01-twelve-cells.test.mjs
- tests/sprint-01/grd-06-missing-key.test.mjs

WRITE-PROHIBITED:

- plugins/pixel-perfect/**
- .github/workflows/**
- Any file not listed in write_allowed

## Code Pattern

```js
// every harness always yields two cells; absence is a verdict, never an omission
export function cellFor(harness, track, ctx) {
  const binding = PINNED[harness].credential_env;
  if (!ctx.env[binding]) {
    return cell(harness, track, "could-not-run", "missing-api-key", { source: "invocation-guard" });
  }
  if (!ctx.adapters.has(harness)) {
    return cell(harness, track, "could-not-run", ctx.absentReason[harness]);
  }
  const resolved = track === "newest" ? lookup(harness) : PINNED[harness].pinned_cli_version;
  if (!resolved) return cell(harness, track, "could-not-run", "version-lookup-failed");
  return null; // the adapter grades it
}
```

- **Source:** `.spec/prds/harness-eval-framework/09-technical-requirements/03-data-schema.md` § HarnessCell / HarnessGrade and § CommandTranslation / CredentialBinding
- **Anti-pattern:** Skipping cursor because the `harness-smoke` environment has no Cursor key; a `pass` on an adapter-pending harness; a hardcoded `if (harness === 'cursor') return 'missing-api-key'` that would fire even with the key present; a failed lookup that drops the newest cell instead of grading it could-not-run.

## Design

None. This task emits data, not a screen.

## Agent Instructions

Work each AC as one RED, GREEN, REFACTOR cycle in AC order. AC-1's RED is the drop-cell mutation over a real downloaded artifact: 11 cells and a duplicate pair must be rejected with reason `cells-incomplete`, and on base there is no validator. AC-2's RED is an environment with the consumed key and every fallback store removed: nothing refuses today, so the module exits 1. Never satisfy a cell-count test by synthesising a verdict for a harness that was never attempted without its named reason.

- **AC-1:** `FLOW-GRD-01-TWELVE-CELLS` in `tests/sprint-01/grd-01-twelve-cells.test.mjs`, seeded from `seed/live-dispatch-run`.
- **AC-2:** `FLOW-GRD-06-MISSING-KEY` in `tests/sprint-01/grd-06-missing-key.test.mjs`, seeded from `seed/env/key-removed`.

## Orchestrator Verification Protocol

1. **VERIFY_RED:** on base `main` both VERIFY commands exit non-zero and the `.red` proofs exist at `.tmp/sprint-01-verification/grd-01-twelve-cells.json.red` and `.tmp/sprint-01-verification/grd-06-missing-key.json.red`.
2. **VERIFY_GREEN:** both VERIFY commands exit 0; the run's artifact carries 12 unique cells with 6 harnesses including cursor; cursor/pinned prints `could-not-run missing-api-key`.
3. Run every Evidence Gate and compare with Expected.
4. `git diff --name-only` lists only WRITE-ALLOWED paths; `plugins/pixel-perfect/**` and `.github/workflows/**` are untouched.
5. Dispatch `evals-reviewer` with this file, the RED and GREEN outputs, and the evidence.

## Agent Assignment

- **Planner role:** `evals-planner`
- **Implementer role:** `evals-implementer`
- **Reviewer role:** `evals-reviewer`
- **Rationale:** `evals-implementer` owns the eval/grading surface this task lands; `evals-reviewer` audits oracle strength, fixture reality and negative-path coverage.
- **Pairing:** `evals-implementer` builds; `evals-reviewer` reviews adversarially against the Review Criteria below.

## Evidence Gates

- **AC-1:** `node --test tests/sprint-01/grd-01-twelve-cells.test.mjs --test-name-pattern FLOW-GRD-01-TWELVE-CELLS`. Expected: prints the TAP `ok` line for FLOW-GRD-01-TWELVE-CELLS after 12 cells, 6 unique harnesses including cursor, and a 64-hex pins_sha256
- **AC-2:** `node --test tests/sprint-01/grd-06-missing-key.test.mjs --test-name-pattern FLOW-GRD-06-MISSING-KEY`. Expected: prints the TAP `ok` line for FLOW-GRD-06-MISSING-KEY after the keyless capture holds 0 model-request events before the refusal and the paired authenticated cells grade pass
- **cells:** `node -e "const r=require('/tmp/he1/harness-eval-result.json');const u=new Set(r.cells.map(c=>c.harness+'/'+c.track));if(r.cells.length!==12||u.size!==12)process.exit(1)"`. Expected: exits 0 — twelve cells and twelve unique (harness, track) pairs

## Review Criteria

Must pass:

- One test per AC, named exactly as its TEST_FUNCTION, in its TEST_FILE.
- RED evidence for every AC; the drop-cell RED is a real 11-cell mutated artifact, not a hand-written object.
- Cursor is present as a real cell with reason `missing-api-key` produced by the guard, with no cursor-specific constant.
- The four adapter-pending harnesses are present with named reasons and no `pass` verdict.
- `git diff --name-only` lists only WRITE-ALLOWED paths.

Should verify:

- No secret value appears in any test, log, evidence file or diff; the binding names match the `harness-smoke` secrets that exist.
- A simulated lookup failure keeps the cell count at twelve and names the lookup reason.
- The keyless step asserts env absence before it asserts the refusal.

Verdict: APPROVED or NEEDS_FIXES, with file and line for each finding.

## Dependencies

- **Depends on:** T3 (capture@v1), T8 (recorder@v1)
- **Blocks:** T12 (its code needs this task's landed work)

A shared file is not a dependency, and needing another task's output to test against is that flow's integration obligation, not an edge.

## Out of Scope

- Building any of the four pending adapters — this task records their honest absence, not their behaviour.
- Providing Cursor's credential — the owner has not bound it, so could-not-run is the correct day-one verdict.
- Deciding the release effect of a could-not-run cell (the recorder and the release resolver own that).

## Context

- **Current state:** No adapter registry, no lookup resolver and no guard exist; an absent harness would today simply be missing from any output.
- **Gap:** A run can look complete while silently covering five harnesses instead of six.

## Notes

- **Day-one honesty:** cursor has no Cursor key in `harness-smoke` and this adapter must not install Cursor on the maintainer Mac. `could-not-run missing-api-key` is the designed, owner-approved day-one verdict, and UC-REL-04 keeps it release-blocking until the owner says otherwise.
- **Owner decisions applied:** the `harness-smoke` environment exists with `SMOKE_CLAUDE_KEY`, `SMOKE_CODEX_KEY`, `SMOKE_GROK_KEY`, `SMOKE_OPENCODE_KEY` and `SMOKE_PI_KEY`. No secret is printed anywhere in this task's evidence.
- **Flow ownership:** this task is the PRIMARY owner of `FLOW-GRD-06-MISSING-KEY` and exercises `FLOW-GRD-01-TWELVE-CELLS` (T8 owns it) at gate step 5.
- **Split check:** not triggered — 3 points, one failure mode (a cell that should exist and does not).
- **Owner:** evals-planner; sprint `sprint-01-evaluator-evidence-spine`.

## Integration Obligations

- **obl-FLOW-GRD-06-MISSING-KEY** — `FLOW-GRD-06-MISSING-KEY`, phase `post-integration`, mandatory. available_after ['T10', 'T11', 'T3', 'T9']; required_by ['T12']; recheck_on ['T12'].
  - command: `node --test tests/sprint-01/grd-06-missing-key.test.mjs --test-name-pattern FLOW-GRD-06-MISSING-KEY`

<!-- REQUIREMENT-CONTRACT v1 -->
<!--
{
  "version": "1",
  "task_id": "T10",
  "task_type": "FEATURE",
  "tdd_mode": "red_first",
  "verification_policy": {
    "requires_tests": true,
    "requires_red_evidence": true,
    "requires_seeded_evidence": true
  },
  "guardrails": {
    "write_allowed": [
      "test/harness/adapters/absent.mjs",
      "test/harness/adapters/registry.mjs",
      "tests/sprint-01/grd-01-twelve-cells.test.mjs",
      "tests/sprint-01/grd-06-missing-key.test.mjs"
    ],
    "write_prohibited": [
      "plugins/pixel-perfect/**",
      ".github/workflows/**"
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
      "id": "obl-FLOW-GRD-06-MISSING-KEY",
      "flow_ref": "FLOW-GRD-06-MISSING-KEY",
      "phase": "post-integration",
      "mandatory": true,
      "owner_task_id": "T10",
      "available_after": [
        "T10",
        "T11",
        "T3",
        "T9"
      ],
      "required_by": [
        "T12"
      ],
      "recheck_on": [
        "T12"
      ],
      "recheck_paths": [
        "tests/sprint-01/grd-06-missing-key.test.mjs",
        "test/harness/pins.json",
        ".github/workflows/harness-eval.yml"
      ],
      "completion_rule": "FLOW-GRD-06-MISSING-KEY passes on the trunk when `node --test tests/sprint-01/grd-06-missing-key.test.mjs --test-name-pattern FLOW-GRD-06-MISSING-KEY` exits 0 and the flow's artifact .tmp/sprint-01-verification/grd-06-missing-key.json is retained with its expected observations matched.",
      "verification_gates": [],
      "requirements": [],
      "owner_bindings": [
        {
          "owner_task_id": "T10",
          "flow_ref": "FLOW-GRD-06-MISSING-KEY",
          "command": "node --test tests/sprint-01/grd-06-missing-key.test.mjs --test-name-pattern FLOW-GRD-06-MISSING-KEY"
        }
      ]
    }
  ],
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
      "primary": true,
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
      "description": "Every one of the twelve cells exists and carries an observed CLI version, with cursor present and never omitted",
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
      "red_input": "a result artifact with 11 cells, a duplicate pair, or no cursor cell is rejected with reason cells-incomplete",
      "positive_example": "the live artifact prints 12 cells, 6 unique harnesses including cursor, and a dotted observed_cli_version on each"
    },
    {
      "id": "TC-2",
      "type": "test_criterion",
      "primary": false,
      "description": "A version-lookup failure makes the newest track could-not-run and never omits the cell",
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
      "red_input": "a failed lookup that drops the cell, or reports it pass, fails the check",
      "positive_example": "a simulated Cursor lookup failure still yields 12 cells with cursor/newest reading could-not-run and a named reason"
    },
    {
      "id": "TC-3",
      "type": "test_criterion",
      "primary": false,
      "description": "An absent adapter is a real cell reading could-not-run with a named reason, and never a pass",
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
      "red_input": "any of the four adapter-pending cells reading pass, or being omitted, fails the check",
      "positive_example": "the four adapter-pending cells read could-not-run with distinct named reasons on pinned and newest"
    },
    {
      "id": "TC-4",
      "type": "test_criterion",
      "primary": false,
      "description": "cursor reads could-not-run missing-api-key from the same guard code path, not from a special-cased string",
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
      "red_input": "a cursor reason produced by a cursor-specific constant rather than the guard fails the check",
      "positive_example": "cursor/pinned prints could-not-run missing-api-key, identical to the missing-key control row"
    }
  ]
}
-->


## Handoff

```json
{
  "task": "T10",
  "commit_sha": "d0971632371f2069f4209e66ff38fbacd560bcd5",
  "done": "PROVISIONAL SUBSTITUTE-AUTHOR DRAFT — UNAPPROVED. Reconstructed from the landed candidate and frozen cycle-2 review, not original-author testimony. Candidate d0971632371f2069f4209e66ff38fbacd560bcd5, reviewed against base 51c0f4ee7594efc0fd26463fe52c611f895cee81 and recorded landed by merge 8a9c1ceacacd920cefb9212360cb67eab870c3e3, adds test/harness/adapters/absent.mjs and fail-closed cell planning in registry.mjs plus assertions in grd-01-twelve-cells.test.mjs and grd-06-missing-key.test.mjs. The registry checks credential presence before adapter absence and newest-version lookup; emits could-not-run cells with the guard, adapter, or lookup reason; preserves all twelve harness/track pairs including cursor; leaves unresolved identity fields null; and returns a null cell for loaded-adapter-owned grading rather than inventing a pass. Historical cycle-2 review was APPROVED at revision 0; it recorded AC-1, TC-1 through TC-4, both frozen checks and FLOW-GRD-01 as PASS, while AC-2 and FLOW-GRD-06 remained DEFERRED on T11 and T9. This draft neither records a handoff nor completes the task.",
  "deviations": [
    "This is an unapproved substitute reconstruction. State records original evals-implementer session 9e0ae644-e62e-43f and handoff_delivery pending. The recovery brief reports that historical session unreachable here; this session cannot attest to the maker’s intent, original authorship, native final report, or original-session continuation. No substitute authorization, native provenance envelope, recording, or completion is supplied.",
    "The historical local proof did not execute the hosted scenarios literally. The tests report live_artifact=absent and use a synthetic smoke-shaped environment, injected/canned version-lookup responses, and a Node marker child for the key-present guard path. A counted model-request event in that marker test is not a provider request or authenticated model result.",
    "The repaired RED files are run_flow driver captures of missing absent.mjs, not captures of an 11-cell downloaded-artifact mutation. F-T10-6 retains the mismatch: the locked grd-01 --mutate drop-cell runner command is unavailable at this candidate, and no RED file records the required mutated artifact hash."
  ],
  "concerns": [
    "U-T10-1 remains OPEN in the frozen review: no candidate-bound hosted artifact proves twelve unique cells, six harnesses, claude-code’s four graded passes, cursor missing-api-key, the missing-key control and authenticated paired passes in one real run. Local checks and recorded approval do not establish those observations. AC-2/FLOW-GRD-06 stay deferred under their frozen T11/T9 bindings; no later satisfaction is inferred.",
    "Credential presence in tests is synthetic or historical. No current credential binding, fallback-store state, provider authentication, harness installation qualification, or hosted outcome was inspected or inferred. Missing credentials and absent adapters must remain could-not-run, never pass; the four pending adapters and Cursor credentials were not delivered by T10.",
    "F-T10-3 and U-T10-3 remain advisory/OPEN: pins.mjs cellsFromPins and registry.mjs planCells disagree about the same cell’s reason because they consult different credential-name layers; T12 must reconcile the authority and placement of planning relative to jobs that hold CLI bindings. This draft does not claim that later work resolved them.",
    "U-T10-4 remains OPEN: registry.mjs writes resolved_cli_version null at the approved candidate, but the historical M9 mutant restoring the requested version survived both frozen checks. Historical null-field correctness is not regression protection.",
    "No tests, runtime flows, provider calls, hosted workflows, installations, or credential probes were run during this documentation-only recovery. The retained local test logs include mock/synthetic boundaries and cannot satisfy real-service acceptance by themselves."
  ],
  "findings": [
    "Historical cycle-2 evidence: both frozen checks exited 0 (3/3 and 1/1); two governed local replays recorded exit 0, fresh artifacts, surface_ok, coldboot_ok and red_proof_ok; the sprint lane recorded 52/52 tests; 14 of 15 mutants were killed, with M9 surviving. All are historical results at d097163, not fresh execution or hosted acceptance.",
    "F-T10-1 is recorded FIXED for replacing hand-written RED narratives with driver captures. The separate missing 11-cell mutation-hash observation remains F-T10-6 ADVISORY. F-T10-5 is recorded REFUTED; cycle-2 scope evidence reports exactly four allowed changed files and preservation of T5’s registry exports.",
    "Preserve stale review rows explicitly: F-T10-2 and F-T10-4 remain ADVISORY with old claim text and null resolutions, although the cycle-2 summary/source show resolved_cli_version null and per-harness reason-shape assertions, and the reviewer reports the corresponding reason mutants killed. Their record statuses are not silently rewritten or independently closed here; the null-field oracle gap remains U-T10-4.",
    "U-T10-2 is recorded RESOLVED by cycle-2 surface and read-back attribution evidence, although its retained reason text still describes the earlier PRODUCT_TARGET_MISSING failure. The candidate adds report read-back assertions; this draft preserves the discrepancy rather than carrying the old description as a current failure.",
    "Retained bundle, context and verdict hashes matched the landing references when inspected; all eighteen artifacts referenced by the cycle-2 verdict existed and matched their recorded hashes. Byte integrity does not establish semantic completeness, fresh runtime success, native author provenance, or owner approval."
  ],
  "scope_impact": [
    {
      "target": "T12",
      "found": "Frozen F-T10-3 and U-T10-3 retain conflicting twelve-cell producers and unresolved credential-job placement.",
      "change": "Carry the recorded reconciliation/wiring obligation forward; do not treat T10’s local plan as proof of the assembled hosted result or claim later resolution without evidence."
    },
    {
      "target": "GATE:FLOW-GRD-01-TWELVE-CELLS",
      "found": "The review records local PASS but U-T10-1 retains absent hosted proof and F-T10-6 retains the non-executable drop-cell command and missing mutated-artifact hash.",
      "change": "Preserve both gaps for the existing integration/final gate and planner disposition; any runner repair or locked-case amendment requires its own authorized review, not this draft."
    },
    {
      "target": "GATE:FLOW-GRD-06-MISSING-KEY",
      "found": "AC-2 and this flow are DEFERRED on T11/T9, despite a green local check; no same-run authenticated provider grades are established.",
      "change": "Retain the published post-integration obligation and require real candidate-bound keyless refusal and paired authenticated cells before acceptance; do not convert marker-child success into hosted proof."
    },
    {
      "target": "T10",
      "found": "Original author handoff remains pending, this draft is unapproved, and U-T10-4 retains a surviving null-field mutant.",
      "change": "Keep landed status distinct from handoff delivery and completion. A valid original report or explicit owner-authorized substitute process is still required; do not close review findings through this reconstruction."
    }
  ],
  "feedback": [
    "Evidence and exact source-line references are in .kb-run-sprint/sprint-01-evaluator-evidence-spine/recovery/handoff-drafts/T10.evidence.md. Only that file and T10.draft.json were authored for this assignment.",
    "This preparation grants no implementation, merge, runtime, remote-write, substitute-approval, handoff-recording, or completion authority. Preserve the frozen review and original evidence; the orchestrator must separately resolve provenance and acceptance requirements."
  ]
}
```
