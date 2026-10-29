# TASK-T1 — Scaffold `.github/workflows/harness-eval.yml`: `workflow_dispatch` (install_mode input, checkout default), empty default permissions, six-harness by two-track smoke matrix (fail-fast false, no cache, keyless install), no banned events

> Status: Backlog
> Assignee: github-platform-implementer
> Priority: P1
> Points: 5
> Type: FEATURE
> Planner: github-agentic-workflow-planner
> Proposed By: github-agentic-workflow-planner + evals-planner
> TDD_MODE: red_first
> RED_GREEN_REQUIRED: true

planner=github-agentic-workflow-planner | implementer=github-platform-implementer | reviewer=github-agentic-workflow-reviewer

**Depends on:** none (T1 is the A-wave root; its code needs no other task's landed work)
**Blocks:** T8 (the recorder job is appended to this workflow file), T9 (the environment binding lives on these smoke steps), T12 (the reviewed workflow is this file), FLOW-RUN-02-HAND (the dispatch surface it replays)

## What this does

Creates the `harness-eval` GitHub Actions workflow: a hand dispatch with an `install_mode` input defaulting to `checkout`, no default permissions, and a twelve-cell (six harnesses × pinned/newest) smoke matrix whose install steps hold no key — plus the empty download→grade skeleton jobs the later tasks fill in.

## Why

UC-RUN-02 says a hand start grades the same harnesses and the same checks as the night run. Nothing can be graded until a dispatchable, trigger-safe workflow exists: today `gh workflow list --all` shows only `ci.yml`, `pages.yml`, `tag-release.yml`, so the gate's very first step is RED.

## How to verify

- `gh workflow list --repo hackerpug-ai/pixel-perfect --all | grep harness-eval` prints a line containing `active`.
- `gh workflow run harness-eval --repo hackerpug-ai/pixel-perfect` produces a run whose `event` is `workflow_dispatch` and whose recorded `install_mode` is `checkout`.
- `node --test tests/sprint-01/run-02-hand.test.mjs --test-name-pattern FLOW-RUN-02-HAND` exits 0 with the flow's artifact written.

## Scope

`write_allowed`: `.github/workflows/harness-eval.yml` (NEW), `tests/sprint-01/run-02-hand.test.mjs` (NEW), `tests/sprint-01/flow-runner.mjs` (NEW — shared lane, coordinate marker). Nothing else.

<details>
<summary>▸ Full agent specification (TASK-TEMPLATE v5.2 — required reading for implementer + reviewer)</summary>

```
TASK_TYPE:  FEATURE
STATUS:     Backlog
PRIORITY:   P1
POINTS:     5
AGENT:      planner=github-agentic-workflow-planner | implementer=github-platform-implementer | reviewer=github-agentic-workflow-reviewer

RUNTIME_COMMANDS:
  test:      node --test tests/sprint-01/run-02-hand.test.mjs
  lint:      node scripts/validate-workflows.mjs

PROGRESS:   AC-1 none · 0/1 complete
```

--------------------------------------------------------------------------------
OUTCOME (1 sentence, ≤30 words — observable success)
--------------------------------------------------------------------------------

`gh workflow run harness-eval` starts a real run on hackerpug-ai/pixel-perfect whose twelve-cell smoke matrix records `install_mode: checkout` and whose install steps hold no harness key.

--------------------------------------------------------------------------------
🚫 CRITICAL CONSTRAINTS (Never tier — read before acting)
--------------------------------------------------------------------------------

- NEVER declare `pull_request`, `pull_request_target`, or `workflow_run` as a trigger — the PRD bans all three because secrets must stay off pull-request workflows (architecture posture; API Design trigger table).
- NEVER put a harness API key (or any `secrets.*`) on an install, marketplace, plugin-install, or command-list step. The only keyed step is that cell's own smoke model step (T9 owns the binding; T1 owns the job shape that leaves the slot empty).
- NEVER grant a write permission and never omit the permissions block. Default permissions are empty: `permissions: {}` at workflow level, `contents: read` on the cell job.
- NEVER let a job decide a grade from the process exit code. This task ships no verdict logic at all; the skeleton jobs pass files through.
- NEVER add a `cache` step to the smoke matrix (the drift-proof job is the only place a package cache is allowed, and it is not this task).

--------------------------------------------------------------------------------
DONE WHEN
--------------------------------------------------------------------------------

- [ ] `.github/workflows/harness-eval.yml` exists with a `workflow_dispatch` trigger carrying `install_mode` (`type: choice`, `options: [checkout, published]`, `default: checkout`) — maps to AC-1 (PRIMARY)
- [ ] `permissions: {}` at workflow level; the matrix job declares `contents: read` only — maps to AC-1
- [ ] The matrix declares exactly twelve cells (six harnesses × `pinned`/`newest`) with `fail-fast: false`, `timeout-minutes`, and no cache step — maps to AC-1 / TC-2
- [ ] Skeleton `download` → `grade` jobs exist and are empty of verdict logic (artifacts in, artifacts out) — maps to AC-1
- [ ] `node --test tests/sprint-01/run-02-hand.test.mjs --test-name-pattern FLOW-RUN-02-HAND` passes
- [ ] `git diff --name-only` ⊆ `GUARDRAILS.write_allowed`

--------------------------------------------------------------------------------
BACKGROUND
--------------------------------------------------------------------------------

The evaluator is one run = one install mode = twelve cells ([03-data-schema](../../09-technical-requirements/03-data-schema.md), `HarnessEvalResult`). Sprint 01 only demonstrates UC-RUN-02 (hand dispatch); the nightly schedule (UC-RUN-01) and the post-merge push trigger (UC-RUN-03) land in later sprints, so this task ships the `workflow_dispatch` trigger alone and must not pre-add the other two — the PRD's full trigger table in [04-api-design](../../09-technical-requirements/04-api-design.md) stays the eventual target.

--------------------------------------------------------------------------------
SPECIFICATION
--------------------------------------------------------------------------------

**objective:** Ship the dispatchable skeleton of `harness-eval` — trigger, permissions, twelve-cell matrix shape, and empty transfer jobs — so a real hand dispatch exists and every later task has a file to extend.

**success_state:** `gh workflow list --all` shows `harness-eval` active; a no-input dispatch creates a run with `event: workflow_dispatch`; the run page shows a twelve-cell matrix (all six harnesses, `pinned` and `newest`) and the grade-recorder placeholder, with no `pull_request`-family trigger anywhere in the file.

Implementation facts fixed by the PRD (do not invent alternatives):

| Concern | Required value | Source |
|---|---|---|
| Triggers | `workflow_dispatch` only, on `main`, with input `install_mode` (`checkout` default, `published` selectable) | 04-api-design trigger table; SPRINT-01 owns UC-RUN-02 |
| Banned triggers | `pull_request`, `pull_request_target`, `workflow_run` | 02-system-components (`harness-eval workflow`) |
| Workflow permissions | empty (`permissions: {}`) | 02-system-components |
| Cell job | `permissions: contents: read`, `environment: harness-smoke` (T9 finishes the binding), `fail-fast: false`, GitHub-hosted `ubuntu-latest`, one fresh VM per job, no cache | 02-system-components (`smoke matrix`) |
| Matrix | `harness: [claude-code, codex, grok, opencode, pi, cursor]` × `track: [pinned, newest]` = 12, even when the two versions coincide | 03-data-schema; UC-GRD-01 AC-3 (cursor never omitted) |
| Concurrency | group `harness-eval`, `cancel-in-progress: false` | 02-system-components |
| Upload-on-failure | the cell job uploads the grade file, event stream and any verify report even when the process exits non-zero | 02-system-components (`smoke matrix`) |

The `download` and `grade` skeleton jobs named in the task title are the seams the recorder (T8) and graders (T7) fill: one job that fetches the cell artifacts with `actions/download-artifact`, one that hands them to the recorder. They carry no verdict, no secret, and no write permission.

--------------------------------------------------------------------------------
ACCEPTANCE CRITERIA (TDD Beads — ordered happy-path first)
--------------------------------------------------------------------------------

AC-1: Hand dispatch with the checkout default and a complete twelve-cell matrix [PRIMARY]
  GIVEN: the `harness-eval` workflow file does not exist on `main` and no run of it has ever been dispatched
  WHEN:  the maintainer runs `gh workflow run harness-eval --repo hackerpug-ai/pixel-perfect` with no inputs
  THEN:  a run exists with `event workflow_dispatch`, `install_mode checkout`, `candidate_sha` equal to the dispatch commit, and six harnesses including cursor

  FLOW_REF:              FLOW-RUN-02-HAND
  TEST_TIER:             integration
  VERIFICATION_SERVICE:  GitHub Actions harness-eval workflow + real harness CLIs + harness-smoke keys
  SURFACE_POLICY:        .spec/e2e-policy/sprint-01/dispatch-allowed.json
  TDD_STATE:             none
  TEST_FILE:             tests/sprint-01/run-02-hand.test.mjs
  TEST_FUNCTION:         FLOW-RUN-02-HAND
  VERIFY:                node --test tests/sprint-01/run-02-hand.test.mjs --test-name-pattern FLOW-RUN-02-HAND

  RED_INPUT:    Base main: `gh workflow run harness-eval` fails with "could not find any workflows named harness-eval" — the module captures that failure, exits 1 and writes `.red`. This is the state of the repo today.
  RED_PROOF:    .tmp/sprint-01-verification/run-02-hand.json.red
  POSITIVE_EXAMPLE: Dispatch with no inputs creates a run with event `workflow_dispatch` and `install_mode=checkout` recorded in the result (same twelve cells, same four checks as the nightly matrix shape) — module exits 0. An explicit `published` input is accepted and recorded as the mode; full published grading resolution lands in sprint-03 by dependency plan (not declined debt).

  SCENARIO_SUMMARY: A real no-input dispatch → artifact identity fields (event, install_mode, candidate_sha) → `workflow_dispatch` + `checkout` + candidate_sha == dispatch commit + six harnesses; a second `install_mode=published` dispatch records `published` with `candidate_sha null` and never substitutes checkout identity.

Complete scenario (single copy) — see this AC's row in the REQUIREMENT-CONTRACT block below.

--------------------------------------------------------------------------------
TEST CRITERIA (Boolean Verification)
--------------------------------------------------------------------------------

| # | Boolean Statement | Maps To AC | Verify | Status |
|---|-------------------|------------|--------|--------|
| 1 | The hand-dispatch flow records `install_mode checkout` when a dispatch passes no `install_mode` input | AC-1 | `node --test tests/sprint-01/run-02-hand.test.mjs --test-name-pattern FLOW-RUN-02-HAND` | [ ] TRUE [ ] FALSE |
| 2 | The hand-dispatch flow rejects a workflow that declares any banned `pull_request`-family trigger | AC-1 | `node --test tests/sprint-01/run-02-hand.test.mjs --test-name-pattern FLOW-RUN-02-HAND` | [ ] TRUE [ ] FALSE |
| 3 | A default dispatch records `event workflow_dispatch` and `install_mode checkout` | AC-1 | `node --test tests/sprint-01/run-02-hand.test.mjs --test-name-pattern FLOW-RUN-02-HAND` | [ ] TRUE [ ] FALSE |

--------------------------------------------------------------------------------
SCOPE / GUARDRAILS (WRITE-ALLOWED / WRITE-PROHIBITED)
--------------------------------------------------------------------------------

writeAllowed:
- `.github/workflows/harness-eval.yml` (NEW) — the dispatchable workflow skeleton
- `tests/sprint-01/run-02-hand.test.mjs` (NEW) — the locked flow module for FLOW-RUN-02-HAND
- `tests/sprint-01/flow-runner.mjs` (NEW) — shared flow runner shell (coordinate marker: T3/T9 also append to this file; land additions as separate functions, never rewrite another task's block)

writeProhibited:
- `scripts/release.mjs` — the release side effect belongs to a later sprint and carries the publish gate
- `.github/workflows/ci.yml`, `.github/workflows/tag-release.yml` — existing pipelines outside this sprint
- `plugins/pixel-perfect/**` — the evaluated product; a task that changes it invalidates its own grade
- any root-level `harness/` directory and branch `9624a4b` gate wiring — explicitly refused by 03-data-schema (`FixPatch`) until this build lands
- anything not listed in writeAllowed

--------------------------------------------------------------------------------
BOUNDARIES (✅ Always / ⚠️ Ask First)
--------------------------------------------------------------------------------

✅ Always:
- Use `permissions: {}` at workflow level and add the narrowest per-job scope.
- Keep every job on GitHub-hosted `ubuntu-latest` (no self-hosted secret-bearing workspace).
- Give each matrix cell its own fresh workspace and its own artifact name (keys include harness and track).
- Write artifact upload steps with `if: always()` so a non-zero process still uploads evidence.

⚠️ Ask First:
- Adding the `schedule` or `push` trigger (they belong to UC-RUN-01 / UC-RUN-03, a later sprint).
- Adding any new third-party action; if unavoidable it must be SHA-pinned.
- Raising `timeout-minutes` above the claude-code case timeout budget.

--------------------------------------------------------------------------------
DELIVERABLE
--------------------------------------------------------------------------------

- `.github/workflows/harness-eval.yml` (NEW): trigger block, empty workflow permissions, drift-proof placeholder job, twelve-cell smoke matrix (`fail-fast: false`, no cache, keyless install slots), download and grade skeleton jobs, run/attempt-qualified artifact names.
- `tests/sprint-01/run-02-hand.test.mjs` (NEW): the FLOW-RUN-02-HAND module — dispatch (or replay a recorded dispatch), download the attempt-qualified artifact, assert the identity fields, exit 0/1, write `.tmp/sprint-01-verification/run-02-hand.json{,.red}`.
- `tests/sprint-01/flow-runner.mjs` (NEW): shared helpers the sprint's flow modules call (dispatch, `gh run download`, artifact read, `.red` writer).

--------------------------------------------------------------------------------
CODE PATTERN
--------------------------------------------------------------------------------

Follow the existing workflow style in `.github/workflows/ci.yml` and `.github/workflows/tag-release.yml`: quoted `on:`-key-safe YAML, explicit `permissions`, `actions/checkout` with `persist-credentials: false` where the job holds a secret, and `actions/upload-artifact` / `download-artifact` with names built from `${{ github.run_id }}` and `${{ github.run_attempt }}`. Quote the `on:` key is not needed in real Actions YAML (the file is consumed by Actions, not by a YAML 1.1 parser at author time) — match whatever `ci.yml` does.

--------------------------------------------------------------------------------
DESIGN
--------------------------------------------------------------------------------

none — no UI surface. The reader is the run page and the artifact (UC-GRD-01: "The summary is the reader. There is no product screen").

--------------------------------------------------------------------------------
AGENT INSTRUCTIONS (TDD Flow)
--------------------------------------------------------------------------------

## FOR EACH ACCEPTANCE CRITERION:

### RED PHASE
  READ:   AC-1, `.spec/prds/harness-eval-framework/09-technical-requirements/04-api-design.md` trigger table, `ci.yml`
  WRITE:  `tests/sprint-01/run-02-hand.test.mjs` + the minimum `flow-runner.mjs` helpers it needs
  RUN:    node --test tests/sprint-01/run-02-hand.test.mjs --test-name-pattern FLOW-RUN-02-HAND
  VERIFY: The module exits 1 and writes `.tmp/sprint-01-verification/run-02-hand.json.red` because no workflow exists
  RETURN: { phase: "RED", test_file, test_function, failure_output }

### GREEN PHASE (after orchestrator VERIFY_RED passes)
  READ:   The failing module, AC-1, the PRD trigger/permission tables
  WRITE:  `.github/workflows/harness-eval.yml` with the trigger, permissions, twelve-cell matrix and skeleton jobs
  RUN:    node --test tests/sprint-01/run-02-hand.test.mjs --test-name-pattern FLOW-RUN-02-HAND
  VERIFY: exits 0; the recorded artifact carries `event workflow_dispatch`, `install_mode checkout`, `candidate_sha` == dispatch commit, six harnesses
  RETURN: { phase: "GREEN", files_changed, test_output }

### REFACTOR PHASE (after orchestrator VERIFY_GREEN passes)
  READ:   The workflow you wrote
  WRITE:  Nothing behavioural — extract repeated matrix steps into one reusable step shape if it removes duplication
  VERIFY: Re-run the flow module; still 0

--------------------------------------------------------------------------------
READING LIST (max 5 files — canonical pattern first)
--------------------------------------------------------------------------------

1. `.github/workflows/ci.yml` [PRIMARY PATTERN] — existing trigger/permissions/job style in this repo.
2. `.spec/prds/harness-eval-framework/09-technical-requirements/04-api-design.md` — trigger × install-mode × release-use table, artifact attempt binding.
3. `.spec/prds/harness-eval-framework/09-technical-requirements/02-system-components.md` — `harness-eval workflow` and `smoke matrix` sections (permissions, cache ban, upload-on-failure).
4. `.spec/prds/harness-eval-framework/09-technical-requirements/03-data-schema.md` — `HarnessEvalResult`: the identity fields the run must record.
5. `.spec/prds/harness-eval-framework/07-uc-run.md` — UC-RUN-02 acceptance criteria.

--------------------------------------------------------------------------------
ORCHESTRATOR VERIFICATION PROTOCOL
--------------------------------------------------------------------------------

1. VERIFY_RED: confirm `.tmp/sprint-01-verification/run-02-hand.json.red` exists and its captured failure names the missing workflow.
2. VERIFY_GREEN: run the flow module; require exit 0 and the artifact's identity fields, not merely "workflow exists".
3. VERIFY_SHAPE: `gh workflow list --all` contains `harness-eval`; `grep -Ec '^  (pull_request|pull_request_target|workflow_run):'` is 0; `permissions: {}` present at workflow level.
4. VERIFY_SCOPE: `git diff --name-only` ⊆ writeAllowed.

--------------------------------------------------------------------------------
EVIDENCE GATES (fast/cheap first — fail fast)
--------------------------------------------------------------------------------

Gate 1: RED evidence — `.red` artifact present with the "could not find any workflows named harness-eval" failure.
Gate 2: AC-1 has one test — the module's `FLOW-RUN-02-HAND` name pattern matches exactly one test.
Gate 3: All tests pass — `node --test tests/sprint-01/run-02-hand.test.mjs --test-name-pattern FLOW-RUN-02-HAND` exits 0.
Gate 4: Shape — the workflow declares `permissions: {}`, `fail-fast: false`, twelve cells, no cache step, no banned trigger.
Gate 5: Keyless install — no `secrets.` reference on any install/plugin/list step (grep the file; T9 adds the one smoke-step binding).
Gate 6: Scope — `git diff --name-only` ⊆ writeAllowed.
Gate 7: Scenario un-fakeable — the artifact must show `candidate_sha` equal to the real dispatch commit and six distinct harness values; a file claiming a run without a matching `gh run list` row fails.

--------------------------------------------------------------------------------
AGENT ASSIGNMENT
--------------------------------------------------------------------------------

- **Implementer:** `github-platform-implementer` — this is repo platform control work (a real Actions workflow, permissions, triggers), the surface that role owns per AGENTS.md.
- **Reviewer:** `github-agentic-workflow-reviewer` — adversarial review of workflows: secret placement, banned triggers, green-runs-that-wrote-nothing. That is exactly this file's risk set.
- **Planner:** `github-agentic-workflow-planner`.

--------------------------------------------------------------------------------
OUT OF SCOPE
--------------------------------------------------------------------------------

- Any grading, verdict, or grade-file authoring (T7 graders, T8 recorder).
- The `harness-smoke` secret binding and least-exposure proof (T9) — leave the empty slot and a comment naming it.
- The `schedule` (nightly, published) and `push` (post-merge checkout) triggers — later sprints own UC-RUN-01 / UC-RUN-03.
- The pinned-channel status job and the release gate — later sprints.
- Populating `test/harness/pins.json` (T2).

--------------------------------------------------------------------------------
CONTEXT (read if unclear)
--------------------------------------------------------------------------------

**Current state:** `.github/workflows/` holds only `ci.yml`, `pages.yml`, `tag-release.yml`; no evaluator workflow, no harness under test.
**Gap:** There is no dispatchable surface for a grade, so every downstream flow module is RED for the same reason: the workflow does not exist.

--------------------------------------------------------------------------------
REVIEW CRITERIA (for github-agentic-workflow-reviewer)
--------------------------------------------------------------------------------

Must pass (≤5, evidence-gate-backed):
- No `pull_request`, `pull_request_target`, `workflow_run` trigger in the file.
- `permissions: {}` at workflow level; the only job scope is `contents: read`.
- Twelve cells present with `fail-fast: false`, no cache step, one fresh VM per cell.
- No `secrets.*` on any install / marketplace / plugin-install / command-list step.
- RED evidence present, and the GREEN proof is a real dispatch, not a YAML grep alone.

Should verify (≤5, judgment):
- Artifact names carry `${{ github.run_id }}` and `${{ github.run_attempt }}` so attempts cannot overwrite each other.
- Uploads use `if: always()` so a failing process still produces evidence.
- `concurrency` group is `harness-eval` with `cancel-in-progress: false`.
- Timeouts bound every job.

Verdict: [APPROVED | NEEDS_FIXES]

--------------------------------------------------------------------------------
DEPENDENCIES
--------------------------------------------------------------------------------

Depends on: none

Blocks: T8 (appends the recorder job to this workflow file), T9 (binds the harness-smoke environment on these smoke steps), T12 (reviews this file), T10 (its cells land in this matrix), T5/T6/T7/T11 (their graded work is stepped here).

Not a dependency: T2/T4 — this task's flow needs their output to test against, so they appear in FLOW-RUN-02-HAND's `available_after` (see `integration_obligations`), not as code edges.

--------------------------------------------------------------------------------
NOTES
--------------------------------------------------------------------------------

- FLOW-RUN-02-HAND is owned by this task (single [PRIMARY] owner). T8 also references the flow in a non-primary AC, which is assertion coverage, not ownership.
- The workflow file is a shared lane: T8 edits the recorder job block, T9 edits the smoke step `env:` blocks. Land each in its own region; never reformat another task's region.
- A dispatch during development costs real model calls only once T9 lands the key; before that the cells are honestly `could-not-run`.

<!-- REQUIREMENT-CONTRACT v1 -->
<!--
{
  "version": "1",
  "task_id": "T1",
  "task_type": "FEATURE",
  "tdd_mode": "red_first",
  "verification_policy": {
    "requires_tests": true,
    "requires_red_evidence": true,
    "requires_seeded_evidence": true
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
    }
  },
  "guardrails": {
    "write_allowed": [
      ".github/workflows/harness-eval.yml",
      "tests/sprint-01/run-02-hand.test.mjs",
      "tests/sprint-01/flow-runner.mjs"
    ],
    "write_prohibited": [
      "scripts/release.mjs",
      ".github/workflows/ci.yml",
      ".github/workflows/tag-release.yml",
      "plugins/pixel-perfect/**",
      "anything under a root-level harness/ directory"
    ]
  },
  "integration_obligations": [
    {
      "id": "obl-FLOW-RUN-02-HAND",
      "obligation_id": "obl-FLOW-RUN-02-HAND",
      "flow_ref": "FLOW-RUN-02-HAND",
      "phase": "post-integration",
      "mandatory": true,
      "owner_task_id": "T1",
      "available_after": [
        "T1",
        "T2",
        "T8"
      ],
      "required_by": [
        "T9",
        "T12"
      ],
      "recheck_on": [
        "T9",
        "T12"
      ],
      "recheck_paths": [
        "tests/sprint-01/run-02-hand.test.mjs",
        "test/harness/pins.json",
        ".github/workflows/harness-eval.yml"
      ],
      "completion_rule": "After T1, T2 and T8 land, replay FLOW-RUN-02-HAND on the trunk: a no-input dispatch must produce a run with event workflow_dispatch, install_mode checkout, candidate_sha equal to the dispatch commit, and six harnesses including cursor.",
      "verification_gates": [],
      "requirements": [],
      "owner_bindings": [
        {
          "owner_task_id": "T1",
          "flow_ref": "FLOW-RUN-02-HAND",
          "command": "node --test tests/sprint-01/run-02-hand.test.mjs --test-name-pattern FLOW-RUN-02-HAND"
        }
      ]
    }
  ],
  "requirements": [
    {
      "id": "AC-1",
      "type": "acceptance_criterion",
      "primary": true,
      "flow_ref": "FLOW-RUN-02-HAND",
      "title": "Hand dispatch: maintainer starts the grade by hand, checkout default, same matrix and checks as nightly",
      "description": "GIVEN the harness-eval workflow does not exist on main WHEN the maintainer runs gh workflow run harness-eval with no inputs THEN a run exists with event workflow_dispatch, install_mode checkout, candidate_sha equal to the dispatch commit, and six harnesses including cursor",
      "test_tier": "integration",
      "verification_service": "GitHub Actions harness-eval workflow + real harness CLIs + harness-smoke keys",
      "verify": "node --test tests/sprint-01/run-02-hand.test.mjs --test-name-pattern FLOW-RUN-02-HAND",
      "test_file": "tests/sprint-01/run-02-hand.test.mjs",
      "test_function": "FLOW-RUN-02-HAND",
      "positive_example": "Dispatch with no inputs creates a run with event workflow_dispatch and install_mode=checkout recorded in the result (same twelve cells, same four checks as the nightly matrix shape) \u2014 module exits 0. Explicit published input is accepted and recorded as mode; full published grading resolution lands in sprint-03 by dependency plan (not declined debt).",
      "surface_policy": ".spec/e2e-policy/sprint-01/dispatch-allowed.json",
      "maps_to_ac": null,
      "red_input": "Base main: gh workflow run harness-eval fails with 'could not find any workflows named harness-eval' \u2014 the module captures that failure, exits 1, writes .red. Exists today.",
      "red_proof": ".tmp/sprint-01-verification/run-02-hand.json.red",
      "scenario": {
        "tier": "e2e-automated",
        "topology_note": "workflow_dispatch on main with install_mode input (checkout default); artifact records event, install_mode, candidate_sha; a second dispatch with explicit published records published mode without checkout substitution",
        "test_tier": "e2e",
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
        "build_proof": {
          "range": "anything that proves a real dispatch created a real run whose artifact records the checkout identity",
          "examples": [
            "gh workflow run + gh run list row + downloaded harness-eval-result-<RUN_ID>-1"
          ]
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
        ]
      }
    },
    {
      "id": "TC-1",
      "type": "test_criterion",
      "description": "The hand-dispatch flow records install_mode checkout when a dispatch passes no install_mode input",
      "verify": "node --test tests/sprint-01/run-02-hand.test.mjs --test-name-pattern FLOW-RUN-02-HAND",
      "maps_to_ac": "AC-1"
    },
    {
      "id": "TC-2",
      "type": "test_criterion",
      "description": "The hand-dispatch flow rejects a workflow that declares any of the banned triggers",
      "verify": "node --test tests/sprint-01/run-02-hand.test.mjs --test-name-pattern FLOW-RUN-02-HAND",
      "maps_to_ac": "AC-1"
    },
    {
      "id": "TC-3",
      "type": "test_criterion",
      "description": "A default dispatch records event workflow_dispatch and install_mode checkout in the result artifact",
      "verify": "node --test tests/sprint-01/run-02-hand.test.mjs --test-name-pattern FLOW-RUN-02-HAND",
      "maps_to_ac": "AC-1"
    }
  ]
}
-->
</details>
