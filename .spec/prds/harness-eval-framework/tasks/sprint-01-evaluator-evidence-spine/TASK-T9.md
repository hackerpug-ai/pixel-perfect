# TASK-T9 — Wire the `harness-smoke` environment and credential binding with least-exposure verification

> Status: ✅ Completed

Commit: 395b371ca36fdc688f6407458e4e10f0e44683bb
> Assignee: devops-engineer
> Priority: P1
> Points: 2
> Type: FEATURE
> Planner: github-agentic-workflow-planner
> Proposed By: github-agentic-workflow-planner + evals-planner
> TDD_MODE: red_first
> RED_GREEN_REQUIRED: true

planner=github-agentic-workflow-planner | implementer=devops-engineer | reviewer=github-agentic-workflow-reviewer

**Depends on:** T1 (the smoke matrix job and its steps, where the environment and the per-step key bindings attach)
**Blocks:** T11 (its negative controls need the real key present and really removed), T12 (reviews the secret placement)

## What this does

Attaches the existing `harness-smoke` environment to the smoke matrix and binds each harness's key to that cell's own model step only — `SMOKE_CLAUDE_KEY`→`ANTHROPIC_API_KEY`, `SMOKE_CODEX_KEY`→`CODEX_API_KEY`, `SMOKE_GROK_KEY`→`XAI_API_KEY`, `SMOKE_OPENCODE_KEY`→the pinned Anthropic provider key, `SMOKE_PI_KEY`→`GEMINI_API_KEY` (provider google) — with an in-workflow least-exposure proof and an honest `could-not-run` for Cursor, whose key is not in the environment.

## Why

UC-GRD-06's promise is that a missing credential cannot be read as a pass. That needs two things this task supplies: the key present on the right step (so a real grade can exist at all) and provably absent everywhere else (install, marketplace, plugin install, command list, recorder, drift proof). The five secret names already exist in the `harness-smoke` environment; no agent creates secrets and no task in this sprint prints one.

## How to verify

- `gh api repos/hackerpug-ai/pixel-perfect/environments/harness-smoke/secrets --jq '[.secrets[].name]|sort'` returns exactly the five `SMOKE_*` names — names only, never values.
- In `.github/workflows/harness-eval.yml`, each `secrets.SMOKE_*` reference sits inside a cell's smoke model step `env:` block; no install/list/recorder step references a secret.
- The keyless control step asserts the absence of the consumed key and of every fallback, and the run records `missing-key could-not-run missing-api-key` while the same run's authenticated cells grade.
- `node --test tests/sprint-01/grd-06-missing-key.test.mjs --test-name-pattern FLOW-GRD-06-MISSING-KEY` exits 0.

## Scope

`write_allowed`: the smoke-step `env:` blocks and the keyless control step of `.github/workflows/harness-eval.yml` (shared lane — coordinate marker with T1/T8), the environment setup runbook under `test/harness/`, `tests/sprint-01/flow-runner.mjs` and `tests/sprint-01/grd-06-missing-key.test.mjs` (both shared lanes, coordinate markers).

<details>
<summary>▸ Full agent specification (TASK-TEMPLATE v5.2 — required reading for implementer + reviewer)</summary>

```
TASK_TYPE:  FEATURE
PRIORITY:   P1
POINTS:     2
AGENT:      planner=github-agentic-workflow-planner | implementer=devops-engineer | reviewer=github-agentic-workflow-reviewer

RUNTIME_COMMANDS:
  test:      node --test tests/sprint-01/grd-06-missing-key.test.mjs
  lint:      node scripts/validate-workflows.mjs

PROGRESS:   AC-1 none · 0/1 complete
```

--------------------------------------------------------------------------------
OUTCOME (1 sentence, ≤30 words — observable success)
--------------------------------------------------------------------------------

The smoke matrix runs under `harness-smoke` with each harness key on its own model step only, a keyless control proving refusal, and no secret visible to install, list, or recorder steps.

--------------------------------------------------------------------------------
🚫 CRITICAL CONSTRAINTS (Never tier — read before acting)
--------------------------------------------------------------------------------

- NEVER print, echo, `cat`, or persist a secret value — not in a step, not in a log, not in a test fixture. Only names are ever read: `gh api .../secrets --jq '[.secrets[].name]'`.
- NEVER invent a secret name. The five bindings are `SMOKE_CLAUDE_KEY`, `SMOKE_CODEX_KEY`, `SMOKE_GROK_KEY`, `SMOKE_OPENCODE_KEY`, `SMOKE_PI_KEY`. `ANTHROPIC_API_KEY` is a *step-level env var* mapped from `SMOKE_CLAUDE_KEY`, never a repository secret.
- NEVER place a key on an install, marketplace, plugin-install, command-list, recorder, or drift-proof step. The environment attaches to the smoke matrix job; the key attaches to that cell's model step.
- NEVER claim Cursor passes. `CURSOR_API_KEY` is not in `harness-smoke`; its cells read `could-not-run missing-api-key` and that is the honest day-one result, not a gap to paper over.
- NEVER add a cache step to the smoke matrix — a cache on a secret-bearing job is prohibited by the PRD.

--------------------------------------------------------------------------------
DONE WHEN
--------------------------------------------------------------------------------
- [ ] The smoke matrix job declares `environment: harness-smoke`; the drift-proof and recorder jobs declare no environment — maps to AC-1
- [ ] Each of the five harness bindings appears only on that cell's model step `env:`, mapping the `SMOKE_*` secret to the CLI's expected variable — maps to AC-1 (TC-1, TC-2)
- [ ] A keyless control step runs with the consumed key and every permitted fallback absent, asserts that absence in-step, and yields `missing-key could-not-run missing-api-key` with zero model requests — maps to AC-1 (TC-3)
- [ ] Cursor cells are emitted with `could-not-run` and reason `missing-api-key` from the guard path, never omitted — maps to AC-1
- [ ] No install, list, recorder or drift step references `secrets.` — maps to AC-1 (TC-4)
- [ ] `test/harness/ENVIRONMENT.md` documents the environment name, the five secret names, which step each may appear on, and that no agent creates or rotates them — maps to AC-1
- [ ] The flow module passes; `git diff --name-only` ⊆ `GUARDRAILS.write_allowed`

--------------------------------------------------------------------------------
BACKGROUND
--------------------------------------------------------------------------------

The `harness-smoke` environment already exists and already holds the five `SMOKE_*` secrets (owner action, completed). The PRD's `CredentialBinding` table (03-data-schema) assigns one variable per harness and forbids any login-cache or alternate-provider fallback; `02-system-components` states the placement rule in one sentence: "The smoke step for that cell is the only step with that harness key."

Sprint 01 grades claude-code live and leaves Cursor honestly keyless; the other four adapters arrive in a later sprint, so their bindings are wired now and their cells stay `could-not-run` until their adapters exist (T10).

--------------------------------------------------------------------------------
SPECIFICATION
--------------------------------------------------------------------------------

**objective:** Make credential exposure on the evaluator workflow minimal, provable, and per-cell, so a graded run is possible and a missing key can never read as a pass.

**success_state:** A dispatched run shows `harness-smoke` on the matrix job only; `gh api` lists the five secret names; a grep of the workflow shows no secret reference outside a cell's model-step `env:`; the keyless control records `could-not-run missing-api-key` with zero model requests in the same run that produced authenticated passes.

Binding table (fixed by 03-data-schema `CredentialBinding`; do not substitute):

| Harness | Environment secret | Step variable | Note |
|---|---|---|---|
| claude-code | `SMOKE_CLAUDE_KEY` | `ANTHROPIC_API_KEY` | graded live this sprint |
| codex | `SMOKE_CODEX_KEY` | `CODEX_API_KEY` | adapter in a later sprint |
| grok | `SMOKE_GROK_KEY` | `XAI_API_KEY` | adapter in a later sprint; no `--trust` in any keyed step |
| opencode | `SMOKE_OPENCODE_KEY` | `ANTHROPIC_API_KEY` (pinned Anthropic provider) | adapter in a later sprint; no `--auto` |
| pi | `SMOKE_PI_KEY` | `GEMINI_API_KEY` (provider `google`, exact model in pins) | adapter in a later sprint |
| cursor | absent | `CURSOR_API_KEY` | `could-not-run missing-api-key` — never omitted |

--------------------------------------------------------------------------------
ACCEPTANCE CRITERIA (TDD Beads — ordered happy-path first)
--------------------------------------------------------------------------------

AC-1: Missing credential fails closed and is never readable as a pass
  GIVEN: the `harness-smoke` environment with five `SMOKE_*` secrets and the smoke matrix wired to it
  WHEN:  a dispatched run executes the keyless control step beside the authenticated claude-code cells
  THEN:  the control records `could-not-run missing-api-key` with zero model-request events and the authenticated cells still grade, with cursor reading `could-not-run missing-api-key` from the same guard path

  FLOW_REF:              FLOW-GRD-06-MISSING-KEY
  TEST_TIER:             integration
  VERIFICATION_SERVICE:  GitHub Actions harness-eval workflow + real harness CLIs + harness-smoke keys
  SURFACE_POLICY:        .spec/e2e-policy/sprint-01/artifact-only-read.json
  TDD_STATE:             none
  TEST_FILE:             tests/sprint-01/grd-06-missing-key.test.mjs
  TEST_FUNCTION:         FLOW-GRD-06-MISSING-KEY
  VERIFY:                node --test tests/sprint-01/grd-06-missing-key.test.mjs --test-name-pattern FLOW-GRD-06-MISSING-KEY

  RED_INPUT:    Base main: no guard and no binding exist, so the module exits 1 with `.red`. Behaviour RED: with `ANTHROPIC_API_KEY` unset and every fallback store absent, nothing refuses today — the guard must refuse with `missing-api-key` and zero model requests in the capture.
  RED_PROOF:    .tmp/sprint-01-verification/grd-06-missing-key.json.red
  POSITIVE_EXAMPLE: A controls row `missing-key could-not-run missing-api-key` with an empty request stream, paired with the authenticated claude-code pass rows from the same run — module exits 0.

  SCENARIO_SUMMARY: The keyless control step inside the real workflow → env-absence assertion, refusal, capture with zero model events → `could-not-run missing-api-key`, while the same guard lets the keyed cells proceed.

  NOTE: T10 is the [PRIMARY] owner of FLOW-GRD-06-MISSING-KEY. This AC asserts the binding half — which step may hold a key, and that removal produces the refusal.

--------------------------------------------------------------------------------
TEST CRITERIA (Boolean Verification)
--------------------------------------------------------------------------------

| # | Boolean Statement | Maps To AC | Verify | Status |
|---|-------------------|------------|--------|--------|
| 1 | The missing-key flow module records the `harness-smoke` environment as holding exactly the five `SMOKE_` bindings | AC-1 | `node --test tests/sprint-01/grd-06-missing-key.test.mjs --test-name-pattern FLOW-GRD-06-MISSING-KEY` | [ ] TRUE [ ] FALSE |
| 2 | The missing-key flow module records the pi binding as `SMOKE_PI_KEY` mapped to `GEMINI_API_KEY` | AC-1 | `node --test tests/sprint-01/grd-06-missing-key.test.mjs --test-name-pattern FLOW-GRD-06-MISSING-KEY` | [ ] TRUE [ ] FALSE |
| 3 | The keyless control writes `could-not-run missing-api-key` while the same run's authenticated cells grade | AC-1 | `node --test tests/sprint-01/grd-06-missing-key.test.mjs --test-name-pattern FLOW-GRD-06-MISSING-KEY` | [ ] TRUE [ ] FALSE |
| 4 | The missing-key flow module finds no `write-all` permission grant in the workflow | AC-1 | `node --test tests/sprint-01/grd-06-missing-key.test.mjs --test-name-pattern FLOW-GRD-06-MISSING-KEY` | [ ] TRUE [ ] FALSE |

The module reads the environment's secret names (never a value), the workflow's step `env:`
blocks and its permissions before it exercises the keyless control, so one module proves all four rows.

--------------------------------------------------------------------------------
SCOPE / GUARDRAILS (WRITE-ALLOWED / WRITE-PROHIBITED)
--------------------------------------------------------------------------------

writeAllowed:
- `.github/workflows/harness-eval.yml` (MODIFY — smoke-step `env:` blocks + the keyless control step only; coordinate marker: T1 owns trigger/matrix, T8 owns the recorder job)
- `test/harness/ENVIRONMENT.md` (NEW) — the environment setup runbook: names, allowed step placement, owner-only secret management
- `tests/sprint-01/flow-runner.mjs` (shared lane, coordinate marker — append helpers only)
- `tests/sprint-01/grd-06-missing-key.test.mjs` (shared lane, coordinate marker — assertions only; T3 owns the module skeleton)

writeProhibited:
- `plugins/pixel-perfect/**` — the evaluated product
- `scripts/release.mjs` — release side effects are a later sprint
- `test/harness/pins.json` — T2 owns pins (this task reads the provider/model it names)
- anything not listed in writeAllowed

--------------------------------------------------------------------------------
BOUNDARIES (✅ Always / ⚠️ Ask First)
--------------------------------------------------------------------------------

✅ Always:
- Reference secrets only through `${{ secrets.NAME }}` inside a step `env:` block on the model step itself.
- Assert the credential absence in-step (`[ -z "${ANTHROPIC_API_KEY:-}" ]`) before running the keyless control.
- Document each binding's allowed placement in `test/harness/ENVIRONMENT.md` so the next adapter cannot widen it.
- Keep `curl`/install steps keyless, including the grok installer step (which must never receive `--trust` with a key).

⚠️ Ask First:
- Any new secret name or environment (owner-only action).
- Rotating or adding a binding for cursor (the owner decides when Cursor gets a key).
- Moving the environment from the matrix job to a per-cell job (cost and blast-radius change).

--------------------------------------------------------------------------------
DELIVERABLE
--------------------------------------------------------------------------------

- `.github/workflows/harness-eval.yml` (MODIFY): `environment: harness-smoke` on the matrix job; per-cell model-step `env:` bindings for the five names; the keyless control step; no cache step.
- `test/harness/ENVIRONMENT.md` (NEW): the binding table above, the placement rule, the owner-only management note, and how the absence assertion works.
- `tests/sprint-01/grd-06-missing-key.test.mjs` (MODIFY — assertions only): the controls-row and cursor-reason assertions.

--------------------------------------------------------------------------------
CODE PATTERN
--------------------------------------------------------------------------------

Follow `.github/workflows/tag-release.yml` for environment/secret usage in this repo (the only existing workflow that consumes an environment-scoped value), and `.github/workflows/ci.yml` for job structure. Steps that assert absence use plain shell, not a composite action.

--------------------------------------------------------------------------------
DESIGN
--------------------------------------------------------------------------------

none — no UI surface.

--------------------------------------------------------------------------------
AGENT INSTRUCTIONS (TDD Flow)
--------------------------------------------------------------------------------

## FOR EACH ACCEPTANCE CRITERION:

### RED PHASE
  READ:   AC-1, 03-data-schema `CredentialBinding`, 02-system-components `smoke matrix`
  WRITE:  The failing assertions in `tests/sprint-01/grd-06-missing-key.test.mjs`
  RUN:    the AC's VERIFY command
  VERIFY: fails and writes `.red` because no binding or control step exists
  RETURN: { phase: "RED", test_file, test_function, failure_output }

### GREEN PHASE (after orchestrator VERIFY_RED passes)
  READ:   The failing assertions and the binding table
  WRITE:  The environment, the five step-level bindings, the keyless control step, the runbook
  RUN:    the AC's VERIFY command
  VERIFY: exits 0; artifact shows `missing-key could-not-run missing-api-key` and cursor with the same reason
  RETURN: { phase: "GREEN", files_changed, test_output }

### REFACTOR PHASE (after orchestrator VERIFY_GREEN passes)
  READ:   The workflow you edited
  WRITE:  Move repeated `env:` blocks into one documented shape if it removes duplication without widening exposure
  VERIFY: The module still passes and no secret reference moved outside a model step
  RETURN: { phase: "REFACTOR", files_changed, still_passing }

--------------------------------------------------------------------------------
READING LIST (max 5 files — canonical pattern first)
--------------------------------------------------------------------------------

1. `.github/workflows/tag-release.yml` [PRIMARY PATTERN] — how this repo consumes environment-scoped secrets.
2. `.spec/prds/harness-eval-framework/09-technical-requirements/03-data-schema.md` — `CredentialBinding` table and the negative-test requirement.
3. `.spec/prds/harness-eval-framework/09-technical-requirements/02-system-components.md` — `smoke matrix` and `invocation-guard`.
4. `.spec/prds/harness-eval-framework/04-uc-grd.md` — UC-GRD-06 acceptance criteria.
5. `.github/workflows/ci.yml` — job/permission structure.

--------------------------------------------------------------------------------
ORCHESTRATOR VERIFICATION PROTOCOL
--------------------------------------------------------------------------------

1. VERIFY_RED: `.red` exists and names the missing binding/control step.
2. VERIFY_GREEN: module exits 0.
3. VERIFY_NAMES_ONLY: the `gh api` secrets call is used with `--jq '[.secrets[].name]'`; no step or script reads a value.
4. VERIFY_PLACEMENT: grep the workflow for `secrets.` — every hit is inside a cell model-step `env:` block.
5. VERIFY_CURSOR: the artifact's cursor cell reads `could-not-run` with reason `missing-api-key`, present, not omitted.
6. VERIFY_SCOPE: `git diff --name-only` ⊆ writeAllowed.

--------------------------------------------------------------------------------
EVIDENCE GATES (fast/cheap first — fail fast)
--------------------------------------------------------------------------------

Gate 1: RED evidence.
Gate 2: The flow module has one test matching the pattern.
Gate 3: Module exits 0.
Gate 4: Seeded evidence — the controls row and the paired authenticated rows come from the same real run.
Gate 5: Least exposure — no secret reference outside a model step; no cache step on the matrix; no `permissions: write-all`.
Gate 6: Scope compliance.

--------------------------------------------------------------------------------
AGENT ASSIGNMENT
--------------------------------------------------------------------------------

- **Implementer:** `devops-engineer` — CI/CD pipeline, environment and secret-binding work is this role's domain per AGENTS.md.
- **Reviewer:** `github-agentic-workflow-reviewer` — secret placement and permission review of workflow files is its stated specialty; no devops-specific reviewer exists, so the workflow-review suite reviews this workflow change.
- **Planner:** `github-agentic-workflow-planner`.

--------------------------------------------------------------------------------
OUT OF SCOPE
--------------------------------------------------------------------------------

- Creating, rotating, or deleting any secret or environment — owner-only action, already done.
- The five non-claude adapters' install and invocation code (T10 and a later sprint; the bindings are wired now, the cells stay `could-not-run`).
- The keyless-guard logic itself (T3) and the controls array (T11).
- Cursor's real grading — no key exists in `harness-smoke` and the PRD leaves that to the owner.

--------------------------------------------------------------------------------
CONTEXT (read if unclear)
--------------------------------------------------------------------------------

**Current state:** the `harness-smoke` environment and its five `SMOKE_*` secrets exist; the workflow skeleton from T1 has no environment and no key binding.
**Gap:** Without a binding a graded run is impossible; without the placement rule and the keyless control, a missing key can be mistaken for a pass.

--------------------------------------------------------------------------------
REVIEW CRITERIA (for github-agentic-workflow-reviewer)
--------------------------------------------------------------------------------

Must pass (≤5, evidence-gate-backed):
- Exactly one secret reference per cell, on that cell's model step, mapped to the CLI's expected variable.
- No secret on install / marketplace / plugin-install / command-list / recorder / drift steps.
- The keyless control asserts absence in-step and produces `could-not-run missing-api-key` with zero model requests.
- Cursor is present and honestly `could-not-run`; never omitted, never `pass`.
- No cache step on the matrix job; no `write-all`.

Should verify (≤5, judgment):
- The runbook names all five secrets and forbids agent-side creation.
- Grok's keyed steps pass no `--trust`.
- Environment scope is the matrix job only.

Verdict: [APPROVED | NEEDS_FIXES]

--------------------------------------------------------------------------------
DEPENDENCIES
--------------------------------------------------------------------------------

Depends on: T1 (the smoke matrix job and its step boundaries are where these bindings attach)

Blocks: T11 (its missing-key and key-present controls need a real bound key and a real removal).

Not a dependency: T3 — the guard is a code need for the *flow*, satisfied through T3's own landing; the flow's `available_after` names the tasks whose work makes the replay runnable.

--------------------------------------------------------------------------------
NOTES
--------------------------------------------------------------------------------

- T9 owns no locked flow (T10 owns FLOW-GRD-06-MISSING-KEY), so the contract carries no `integration_obligations` entry.
- The owner decision is explicit: the environment already exists with `SMOKE_CLAUDE_KEY`, `SMOKE_CODEX_KEY`, `SMOKE_GROK_KEY`, `SMOKE_OPENCODE_KEY`, `SMOKE_PI_KEY`. Do not invent `ANTHROPIC_API_KEY` as a repository secret; it is a step variable.
- `.github/workflows/harness-eval.yml` is a three-way shared lane: T1 (trigger/matrix), T8 (recorder job), T9 (smoke `env:` + control step). Land only your region.

<!-- REQUIREMENT-CONTRACT v1 -->
<!--
{
  "version": "1",
  "task_id": "T9",
  "task_type": "FEATURE",
  "tdd_mode": "red_first",
  "verification_policy": {
    "requires_tests": true,
    "requires_red_evidence": true,
    "requires_seeded_evidence": true
  },
  "fixtures": {
    "seed/env/anthropic-key-present": {
      "entrypoint": "harness-smoke environment, ANTHROPIC_API_KEY on exec steps (owner secret)",
      "description": "authenticated cells + key-present-misfire control",
      "seed_method": "cli"
    },
    "seed/env/key-removed": {
      "entrypoint": "control step's real environment with ANTHROPIC_API_KEY and all fallbacks unset (asserted in-step)",
      "description": "missing-key refusal capture with zero model events",
      "seed_method": "cli"
    },
    "seed/live-dispatch-run": {
      "entrypoint": "gh workflow run harness-eval --repo hackerpug-ai/pixel-perfect (real dispatch, checkout default)",
      "description": "RUN_ID + attempt-qualified artifacts via gh run download",
      "seed_method": "cli"
    },
    "seed/result-artifact": {
      "entrypoint": "gh run download <RUN_ID> -n harness-eval-result-<RUN_ID>-1",
      "description": "harness-eval-result.json with cells, controls, pins_sha256, identity fields",
      "seed_method": "cli"
    }
  },
  "guardrails": {
    "write_allowed": [
      ".github/workflows/harness-eval.yml",
      "test/harness docs for the env setup runbook",
      "tests/sprint-01/flow-runner.mjs",
      "tests/sprint-01/grd-06-missing-key.test.mjs"
    ],
    "write_prohibited": [
      "plugins/pixel-perfect/**",
      "scripts/release.mjs"
    ]
  },
  "requirements": [
    {
      "id": "AC-1",
      "type": "acceptance_criterion",
      "primary": false,
      "flow_ref": "FLOW-GRD-06-MISSING-KEY",
      "title": "Missing credential fails closed: could-not-run missing-api-key before any model request, never readable as pass",
      "description": "GIVEN the harness-smoke environment with five SMOKE_ secrets and the smoke matrix wired to it WHEN a dispatched run executes the keyless control step beside the authenticated claude-code cells THEN the control records could-not-run missing-api-key with zero model-request events and the authenticated cells still grade, with cursor reading could-not-run missing-api-key from the same guard path",
      "test_tier": "integration",
      "verification_service": "GitHub Actions harness-eval workflow + real harness CLIs + harness-smoke keys",
      "verify": "node --test tests/sprint-01/grd-06-missing-key.test.mjs --test-name-pattern FLOW-GRD-06-MISSING-KEY",
      "test_file": "tests/sprint-01/grd-06-missing-key.test.mjs",
      "test_function": "FLOW-GRD-06-MISSING-KEY",
      "positive_example": "Controls row missing-key could-not-run missing-api-key with an empty request stream, paired with the authenticated claude-code pass rows from the same run \u2014 module exits 0.",
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "maps_to_ac": null,
      "red_input": "Base main: no guard exists, module exits 1 with .red. Behavior RED: env with ANTHROPIC_API_KEY unset and all fallback stores absent \u2014 guard must refuse with missing-api-key and zero model requests in the capture; on base nothing refuses, exit 1.",
      "red_proof": ".tmp/sprint-01-verification/grd-06-missing-key.json.red",
      "scenario": {
        "tier": "e2e-automated",
        "topology_note": "invocation-guard evaluates the credential binding inside the real workflow; one control step runs with the key actually removed; paired authenticated cells in the same run; results in the controls array",
        "test_tier": "e2e",
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
        "build_proof": {
          "range": "anything that proves the key was really absent on that step and really present on the graded steps",
          "examples": [
            "step env assertion output plus the paired authenticated cell rows of the same run"
          ]
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
        ]
      }
    },
    {
      "id": "TC-1",
      "type": "test_criterion",
      "description": "The missing-key flow module records the harness-smoke environment as holding exactly the five SMOKE_ bindings",
      "verify": "node --test tests/sprint-01/grd-06-missing-key.test.mjs --test-name-pattern FLOW-GRD-06-MISSING-KEY",
      "maps_to_ac": "AC-1"
    },
    {
      "id": "TC-2",
      "type": "test_criterion",
      "description": "The missing-key flow module records the pi binding as SMOKE_PI_KEY mapped to GEMINI_API_KEY",
      "verify": "node --test tests/sprint-01/grd-06-missing-key.test.mjs --test-name-pattern FLOW-GRD-06-MISSING-KEY",
      "maps_to_ac": "AC-1"
    },
    {
      "id": "TC-3",
      "type": "test_criterion",
      "description": "The keyless control writes could-not-run missing-api-key while the same run's authenticated cells grade",
      "verify": "node --test tests/sprint-01/grd-06-missing-key.test.mjs --test-name-pattern FLOW-GRD-06-MISSING-KEY",
      "maps_to_ac": "AC-1"
    },
    {
      "id": "TC-4",
      "type": "test_criterion",
      "description": "The missing-key flow module finds no write-all permission grant in the workflow",
      "verify": "node --test tests/sprint-01/grd-06-missing-key.test.mjs --test-name-pattern FLOW-GRD-06-MISSING-KEY",
      "maps_to_ac": "AC-1"
    }
  ]
}
-->
</details>

## Handoff

```json
{
  "task": "T9",
  "commit_sha": "395b371ca36fdc688f6407458e4e10f0e44683bb",
  "done": "PROVISIONAL SUBSTITUTE-AUTHOR DRAFT, UNAPPROVED: reconstructed from landed candidate 395b371ca36fdc688f6407458e4e10f0e44683bb against saved review base f9ff7829a190deb2a341809d614da1db51e17358, cycle 2 revision 0 APPROVED, recorded merge 7e08e1a79d3e38725c045a1bd9c7dfd0650a0f95. This is not original-author testimony, substitution approval, a recorded handoff, completion, or fresh runtime proof. The candidate retains harness-smoke on the smoke matrix, adds five harness-gated step env mappings (SMOKE_CLAUDE_KEY to ANTHROPIC_API_KEY, SMOKE_CODEX_KEY to CODEX_API_KEY, SMOKE_GROK_KEY to XAI_API_KEY, SMOKE_OPENCODE_KEY to ANTHROPIC_API_KEY, SMOKE_PI_KEY to GEMINI_API_KEY), and adds a secret-free Cursor presence probe. These model-named steps write cell/binding.json with credential presence and bound/could-not-run status; they do not invoke authenticated models. Its keyless control asserts absence, executes the real runGuarded path with a marker-writing Node child command, persists capture evidence, and records could-not-run/missing-api-key, model_requests and child_ran. It adds test/harness/ENVIRONMENT.md, expands the shared credential test with placement, empty-string and real local step-body checks, adjusts flow-runner's model-step placement allowance, and retains a T9-specific historical RED artifact. Source and frozen historical evidence support these statements; details and limits are in recovery/handoff-drafts/T9.evidence.md.",
  "deviations": [
    "This reconstruction is prepared by a substitute session with no original authorship or substitution authority. Saved original implementer session e59186a6-ec6e-4f1 is historical and unreachable in this recovery context; saved handoff delivery remains pending. No native author response, substitute authorization envelope, receipt, state transition, recording or completion was created.",
    "The candidate's workflow provides credential-presence probes, a keyless guard control and artifact files. Its install step remains a reserved slot and Record the cell still emits smoke-not-implemented in cell/cell.json. Full authenticated CLI execution and same-run authenticated grades are not demonstrated by T9's candidate.",
    "The local test uses explicit synthetic noncredential bindings, a Node marker child, an always-refuse test double for a negative control, and in-memory registry inputs without loaded adapters. These exercise real filesystem/process/guard code but do not prove provider authentication, actual harness installation or model behavior. The optional hosted-artifact branch is absent in the retained run."
  ],
  "concerns": [
    "FLOW-GRD-06-MISSING-KEY remains DEFERRED on T11 in the frozen review context. Historical diagnostics say live_artifact=absent and t9_hosted=not-executed; no same-run authenticated claude-code pass paired with the control row is established. No new hosted run or real-service qualification occurred during this preparation.",
    "Historical environment=observed means the names-only GitHub environment query returned the five named bindings then. It establishes neither current secret availability nor valid credential values nor working provider authentication; no credential values were read or printed in this recovery.",
    "Step-level credential isolation is supported by candidate declarations and historical local checks, not a newly observed installed harness or hosted execution. Install, upload, download, drift and recorder steps remain keyless in the candidate declaration; no new install or credential/environment changes were made.",
    "U-T9-2 remains OPEN: candidate binding.json carries the guard reason, while the unchanged cell/cell.json carries smoke-not-implemented. T9 does not establish which file the downstream recorder consumes.",
    "U-T9-3 remains OPEN: the workflow sources model_requests from the persisted capture, but replacing that expression with literal zero survives M17. Treat the mutation-pinned child_ran:false marker as the local no-spawn evidence; the count-source relationship remains source-traced."
  ],
  "findings": [
    "Frozen cycle-2 review records F-T9-1 FIXED: absent and empty-string bindings are checked on the guard, the control body and the pi body; the previously surviving M9 empty-string-presence mutation now fails. This is retained historical reviewer evidence, not a new execution claim.",
    "F-T9-2, F-T9-3 and F-T9-4 remain ADVISORY with null resolution in the saved review. Their older claim text is partly stale: cycle-2 evidence kills the secret-in-if mutation M11, the reverted shared-rule mutation M13 and permissive-rule mutation M15, and the spawn-before-refusal mutation M16. Preserve the recorded status and cite the later counterevidence rather than silently closing or repeating the old claims as current defects.",
    "U-T9-1, U-T9-2 and U-T9-3 remain OPEN and nonblocking in the frozen approved review: hosted authenticated pairing, recorder file selection, and count-source mutation discrimination respectively. The approved local review does not close these uncertainties or establish final acceptance.",
    "Historical cycle-2 mutation evidence records 19 probes, 15 killed, four survivors: M7 (inline step self-check removal is not distinguished locally), M17 (constant-zero count), and deliberate attribution probes M18/M19 (removing the if-scan). The frozen review summary's wording about survivor categories is inconsistent; retain the explicit IDs and evidence rows rather than infer extra kills."
  ],
  "scope_impact": [
    {
      "target": "T11",
      "found": "Frozen T9 flow is deferred on T11 and lacks a real hosted run pairing authenticated claude-code grades with the missing-key control.",
      "change": "Retain the existing hosted proof obligation and U-T9-1; this provisional draft neither supplies the missing run nor releases the obligation."
    },
    {
      "target": "T8",
      "found": "At the approved T9 candidate, binding.json and keyless-control.json coexist with cell/cell.json containing smoke-not-implemented, leaving U-T9-2 OPEN.",
      "change": "Carry the recorder-consumption uncertainty into the existing integration review; do not assume the T9 binding row becomes the final graded Cursor cell. No new implementation is authorized by this draft."
    },
    {
      "target": "T12",
      "found": "Credential placement has frozen local source/process evidence, while advisories remain recorded and hosted/install/provider qualification is missing.",
      "change": "Preserve the advisory statuses, later cycle-2 counterevidence, shared flow-runner dependency and real-artifact review requirement when auditing the existing cross-task contracts."
    },
    {
      "target": "GATE:FLOW-GRD-06-MISSING-KEY",
      "found": "Local checks and a recorded APPROVED review exist, but the frozen flow status is DEFERRED and U-T9-1 through U-T9-3 remain OPEN.",
      "change": "Keep the gate unproven by this draft. Recording, substitute authorization and completion remain separate decisions through the governed recovery path."
    }
  ],
  "feedback": [
    "Historical evidence only: E-C2-01 records the declared grd-06 check passing 1/1; E-C2-12 through E-C2-15 record grd-01 3/3, grd-02 26/26, run-02 3/3 and workflow validation passing. No tests, workflow runs, provider calls or runtime verification were performed for this documentation preparation.",
    "Read-only recovery checks verified the task worktree HEAD equals the approved candidate, inspected the base-to-candidate diff, and rehashed the saved cycle-1/cycle-2 bundle members and all 24 cycle-2 evidence artifacts against their recorded hashes. Hash agreement validates retained bytes, not native session reachability or current service behavior.",
    "Use T9.evidence.md for source lines, frozen identities, historical commands and proof limits. Obtain original-session delivery or explicit owner-authorized substitute provenance through the documented contract before recording any handoff; this draft supplies neither authority."
  ]
}
```
