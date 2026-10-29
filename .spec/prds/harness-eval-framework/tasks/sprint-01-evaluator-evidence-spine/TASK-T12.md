# TASK-T12 — Review the evaluator workflow, capture layer, and grader contracts: secret placement, banned triggers, path confinement, aggregation order, exit-code independence, twelve-cell completeness, no root-level `harness/` or branch-9624a4b gate wiring landing

> Status: Backlog
> Assignee: github-agentic-workflow-reviewer
> Priority: P2
> Points: 3
> Type: INFRA
> Planner: github-agentic-workflow-planner
> Proposed By: github-agentic-workflow-planner + evals-planner
> TDD_MODE: skipped
> RED_GREEN_REQUIRED: false

planner=github-agentic-workflow-planner | implementer=github-agentic-workflow-reviewer | reviewer=code-reviewer

**why_required:** protects FLOW-GRD-01-TWELVE-CELLS, FLOW-GRD-02-FOUR-GRADES and FLOW-GRD-03-FILES-AND-STREAM — the twelve-cell recorder, the four-grade adapter, and the evidence-not-exit-code capture are exactly the contracts this review reads; a defect here makes those flows green for the wrong reason. Exercised only indirectly, through human-testing gate steps 6–11.

**Depends on:** T1 (the workflow file under review), T2 (the pins/schemas surfaces reviewed), T3 (the capture/guard/writer under review), T4 (the case manifests whose report paths are reviewed), T5 (the claude-code adapter under review), T6 (the stream mapping under review), T7 (the grader contracts under review), T8 (the recorder under review), T9 (the secret placement under review), T10 (the fail-closed cells whose reasons are reviewed), T11 (the controls whose verdicts are reviewed)
**Blocks:** nothing — the review gates publication of the sprint's other eleven tasks; it starts no later work

## What this does

Reviews the sprint's whole evaluator surface against the PRD's non-negotiables and files findings: no harness key outside a cell's model step, no `pull_request` / `pull_request_target` / `workflow_run` trigger, no shared or invented verify-report path, `could-not-run` aggregating before `fail` before `pass`, no verdict derived from an exit code, twelve cells always complete with Cursor present, and no root-level `harness/` directory or branch-9624a4b gate wiring landing in `main`.

## Why

Every other task in this sprint asserts its own behaviour. None of them can see the whole picture: a key on an install step, a banned trigger added for convenience, two invocations writing the same report path, or a recorder that quietly drops a cell will each pass their own task's tests and still destroy the property the sprint exists to prove. This is the only task whose subject is the cross-task contract.

## How to verify

- A review record exists with one verdict per checklist item, each citing a file:line or a command's output.
- Every `BLOCKER` finding is either fixed by its owning task (re-reviewed) or named as an unresolved blocker in the sprint's report — never silently downgraded.
- Zero unchecked checklist edges: the review reports `pass`, `finding` or `blocked` for each item.

## Scope

Read-only. `write_allowed`: review comments only (no repo files). `write_prohibited`: everything.

<details>
<summary>▸ Full agent specification (TASK-TEMPLATE v5.2 — required reading for implementer + reviewer)</summary>

```
TASK_TYPE:  INFRA
STATUS:     Backlog
PRIORITY:   P2
POINTS:     3
AGENT:      planner=github-agentic-workflow-planner | implementer=github-agentic-workflow-reviewer | reviewer=code-reviewer

RUNTIME_COMMANDS:
  verify:    gh workflow view harness-eval --repo hackerpug-ai/pixel-perfect --yaml
  lint:      node scripts/validate-workflows.mjs

PROGRESS:   AC-1 none · 0/1 complete
```

--------------------------------------------------------------------------------
OUTCOME (1 sentence, ≤30 words — observable success)
--------------------------------------------------------------------------------

Every checklist edge is answered with a receipt (file:line or command output), and every BLOCKER is either fixed by its owner and re-reviewed or named as an unresolved sprint blocker.

--------------------------------------------------------------------------------
🚫 CRITICAL CONSTRAINTS (Never tier — read before acting)
--------------------------------------------------------------------------------

- NEVER write, edit, or "tidy" product or test files. This task is read-only; a reviewer edit removes the independent check the sprint relies on.
- NEVER accept "tests pass" as a receipt. Each item needs the file:line, the command output, or the artifact field that proves it.
- NEVER downgrade a BLOCKER to a nit to keep a green sprint. An unproven non-negotiable is reported as blocked.
- NEVER review from the task descriptions alone — read the landed bytes on `main` (the workflow YAML, `test/harness/**`, `tests/sprint-01/**`) and, where a claim is about behaviour, the real run's artifact.
- NEVER touch `SPRINT.md`, `human-flows.json`, or the e2e policy files; they are the lock this review checks against, not editable inputs.

--------------------------------------------------------------------------------
DONE WHEN
--------------------------------------------------------------------------------

- [ ] Every checklist item below carries a verdict (`pass` / `finding` / `blocked`) plus a receipt — maps to AC-1
- [ ] Secret placement: no `secrets.*` reference outside a cell's model-step `env:`; recorder, drift-proof and install steps are keyless — maps to AC-1 (TC-1)
- [ ] Banned triggers: the workflow declares none of `pull_request`, `pull_request_target`, `workflow_run` — maps to AC-1 (TC-2)
- [ ] Report-path confinement: the case loader rejects absolute paths, `..`, symlinked ancestors/leaves, and any path outside the invocation directory; no discovery, glob or timestamp fallback — maps to AC-1
- [ ] Aggregation order: `could-not-run` before `fail` before `pass`, with every constituent result and block reason preserved — maps to AC-1
- [ ] Exit-code independence: no verdict is computed from `process_exit_code`, a Claude `subtype`, `is_error`, or a Codex `type: error` item — maps to AC-1
- [ ] Twelve-cell completeness: 12 unique (harness, track) cells, six harnesses, Cursor present — maps to AC-1
- [ ] No root-level `harness/` directory, no `harness-matrix.yml`, and no branch-9624a4b gate wiring in `scripts/release.mjs` — maps to AC-1 (TC-3)
- [ ] All findings filed with severity; every BLOCKER resolved by its owner and re-reviewed, or named unresolved

--------------------------------------------------------------------------------
BACKGROUND
--------------------------------------------------------------------------------

The PRD fixes this review's subject matter in three places. `01-architecture-posture` states the secret posture ("Secrets stay off pull-request workflows") and the verdict vocabulary. `02-system-components` fixes the per-cell key placement and the aggregation rule. `03-data-schema` fixes the report-path confinement rules ("Reject absolute paths, `..`, symlinks in any ancestor/leaf, and resolved paths outside the invocation directory. No glob, discovery, timestamp fallback, or any-new-file fallback is allowed") and names branch 9624a4b as salvage-only: "its root-level harness/ directory, its harness-matrix.yml, and its gate wiring must not land before this build".

This is the sprint's only dark task (3 of 60 points, ~5%, under the 30% ceiling). It produces no product-surface behaviour; the human-testing gate exercises it indirectly through steps 6–11, which fail if the reviewed contracts are broken.

--------------------------------------------------------------------------------
SPECIFICATION
--------------------------------------------------------------------------------

**objective:** Independently certify — or refuse — the evaluator's cross-task contracts before the sprint is called done.

**success_state:** A review record in which every checklist edge has a verdict and a receipt, and every BLOCKER is either fixed by its owner and re-reviewed or explicitly named as an unresolved blocker.

Checklist (each item one verdict + one receipt):

| # | Edge | What proves it |
|---|---|---|
| 1 | Secret placement | `grep -n 'secrets\.' .github/workflows/harness-eval.yml` — every hit inside a cell model-step `env:` |
| 2 | Banned triggers | `grep -Ec '^  (pull_request\|pull_request_target\|workflow_run):' .github/workflows/harness-eval.yml` = 0 |
| 3 | Report-path confinement | case loader code + its rejection tests: absolute, `..`, symlink ancestor/leaf, outside-invocation |
| 4 | Aggregation order | the aggregator's unit tests: could-not-run ≻ fail ≻ pass, constituents preserved |
| 5 | Exit-code independence | grep for `process_exit_code` on any verdict path; the exit0-denied-read control |
| 6 | Twelve-cell completeness | the recorder's cell-set enforcement + a real artifact |
| 7 | Cursor present | the artifact's cursor cell, `could-not-run`, never omitted |
| 8 | No forbidden salvage | `test ! -d harness`, no `harness-matrix.yml`, no branch-9624a4b wiring in `scripts/release.mjs` |
| 9 | Permissions floor | workflow-level `permissions: {}`, agent/cell jobs read-only, recorder `actions: read` only |
| 10 | No invented report filename | the writer reads the case-declared path only; no fallback |

--------------------------------------------------------------------------------
ACCEPTANCE CRITERIA (Implementation steps — INFRA)
--------------------------------------------------------------------------------

AC-1: Every checklist edge answered with a receipt; every BLOCKER resolved or named
  GIVEN: the eleven implementation tasks of sprint 01 landed on `main`, plus one real dispatched run and its artifact
  WHEN:  the reviewer works the ten-edge checklist against the landed bytes and the artifact
  THEN:  each edge carries pass/finding/blocked with a file:line or command-output receipt, and each BLOCKER is fixed-and-re-reviewed or reported unresolved

  TEST_TIER:             unit (justification: read-only observation of already-executed artifacts; no new behavioural assertion is introduced by this task)
  VERIFICATION_SERVICE:  review checklist
  SURFACE_POLICY:        read-only
  TDD_STATE:             none
  TEST_FILE:             null
  TEST_FUNCTION:         null
  VERIFY:                null (manual observation through human-testing gate steps 6–11)

  RED_INPUT:    On base `main` every edge is unanswerable: there is no workflow, no `test/harness/**`, no artifact — the checklist cannot produce a single receipt, which is the review's RED state today (gate step 1's before state).
  POSITIVE_EXAMPLE: The same ten edges answered on the landed sprint with a receipt each, zero unaddressed BLOCKERs — the review record reads clean with receipts.

  OBSERVATION_PATH: The landed sprint on `main` → the ten-edge checklist worked against real bytes and one real artifact → ten verdicts, each with a file:line or captured-command receipt, no unchecked edge, no fabricated-file path accepted.

  NOTE: this AC deliberately carries **no `scenario` key**. It is an observation-only AC — `verify: null`, no test file, no flow — so there is no seeded start state, no surface action and no machine-observed end state to model, and writing one would describe a check that does not exist. Its proof shape is `observation_gates` plus the three receipt commands in TEST CRITERIA, and the evidence is the reviewer's captured output. This keeps the fakeability gate honest: `validate_scenario` refuses a scenario it cannot falsify, and the fix is to stop claiming one, not to dress a review up as a behavioral check.

--------------------------------------------------------------------------------
TEST CRITERIA (Boolean Verification)
--------------------------------------------------------------------------------

Not applicable — INFRA task (denominator 100, threshold 70). Observation gates below stand in for TC rows; the contract still carries three TCs because the machine contract requires at least one. Each TC's `verify` is `null` by design — this task writes no files, so no owned test path exists to select — and its receipt command is named in the statement for the reviewer to run and capture:

| # | Boolean Statement | Maps To AC | Receipt command | Status |
|---|-------------------|------------|-----------------|--------|
| 1 | No `secrets.` reference sits outside a cell model-step `env:` block | AC-1 | `grep -n 'secrets\.' .github/workflows/harness-eval.yml` | [ ] TRUE [ ] FALSE |
| 2 | The workflow declares none of the banned `pull_request`-family triggers | AC-1 | `grep -Ec '^  (pull_request\|pull_request_target\|workflow_run):' .github/workflows/harness-eval.yml` | [ ] TRUE [ ] FALSE |
| 3 | No root-level `harness/`, no `harness-matrix.yml`, no branch-9624a4b gate wiring | AC-1 | `test ! -d harness && test ! -f .github/workflows/harness-matrix.yml && grep -c 'harness-matrix' scripts/release.mjs` | [ ] TRUE [ ] FALSE |

--------------------------------------------------------------------------------
SCOPE / GUARDRAILS (WRITE-ALLOWED / WRITE-PROHIBITED)
--------------------------------------------------------------------------------

writeAllowed:
- review comments only (no repository path is written by this task)

writeProhibited:
- everything — `plugins/pixel-perfect/**`, `.github/workflows/**`, `test/harness/**`, `tests/sprint-01/**`, `scripts/release.mjs`, `SPRINT.md`, `human-flows.json`, `.spec/e2e-policy/**`

--------------------------------------------------------------------------------
BOUNDARIES (✅ Always / ⚠️ Ask First)
--------------------------------------------------------------------------------

✅ Always:
- Review the landed bytes on `main`, not the task descriptions.
- Cite a file:line or a command's output for every verdict.
- File findings against the owning task id so remediation routes correctly.
- Re-review after a fix; a fixed BLOCKER needs a new receipt.

⚠️ Ask First:
- Whether a finding is a BLOCKER or a nit when the PRD names the rule but not its severity.
- Any request to review code that has not landed on `main` yet.

--------------------------------------------------------------------------------
DELIVERABLE
--------------------------------------------------------------------------------

- A review record: ten edges × (verdict, receipt, severity, owner task) plus an explicit unresolved-blocker list. Delivered as review comments on this task; no file changes.

--------------------------------------------------------------------------------
CODE PATTERN
--------------------------------------------------------------------------------

Review shape follows `review-red-hat` staging: findings bucketed by severity (BLOCKER / MAJOR / NIT), each with evidence and an owning task, and a final `APPROVED | NEEDS_FIXES` verdict. Do not re-derive the PRD's rules; quote the clause and cite the line.

--------------------------------------------------------------------------------
DESIGN
--------------------------------------------------------------------------------

none — no UI surface.

--------------------------------------------------------------------------------
AGENT INSTRUCTIONS (Review Flow)
--------------------------------------------------------------------------------

1. READ: the PRD's four non-negotiable sources — `01-architecture-posture`, `02-system-components` (`smoke matrix`, `grade recorder`, `fixture-grader`, `stream-grader`), `03-data-schema` (`VerifyPair`, `FixPatch`), `04-api-design` (trigger table).
2. READ: the landed bytes — `.github/workflows/harness-eval.yml`, `test/harness/**`, `tests/sprint-01/**`, `scripts/release.mjs`.
3. RUN: each command in the checklist table; capture output verbatim as the receipt.
4. RUN: download one real run's `harness-eval-result` and `harness-eval-verify-reports` artifacts; the twelve-cell, cursor-present and report-path edges are read from those, not from source alone.
5. FILE: one finding per broken edge, severity + owning task id.
6. RE-REVIEW: after the owner's fix, re-run that edge's command and attach the new receipt.
7. RETURN: `APPROVED` only when zero BLOCKER remains unresolved; otherwise `NEEDS_FIXES` with the blockers listed.

--------------------------------------------------------------------------------
READING LIST (max 5 files — canonical pattern first)
--------------------------------------------------------------------------------

1. `.spec/prds/harness-eval-framework/09-technical-requirements/02-system-components.md` [PRIMARY PATTERN] — the component contracts this review checks.
2. `.spec/prds/harness-eval-framework/09-technical-requirements/03-data-schema.md` — report-path confinement, aggregation order, `FixPatch` salvage rule.
3. `.spec/prds/harness-eval-framework/09-technical-requirements/04-api-design.md` — trigger × mode table.
4. `.spec/prds/harness-eval-framework/09-technical-requirements/01-architecture-posture.md` — secret posture and verdict vocabulary.
5. `.spec/prds/harness-eval-framework/tasks/sprint-01-evaluator-evidence-spine/SPRINT.md` — the human-testing gate steps this review is exercised by.

--------------------------------------------------------------------------------
ORCHESTRATOR VERIFICATION PROTOCOL
--------------------------------------------------------------------------------

1. VERIFY_RECEIPTS: every one of the ten edges has a non-empty receipt (file:line or captured output).
2. VERIFY_SEVERITY: BLOCKERs are listed with an owner task id.
3. VERIFY_CLOSURE: a BLOCKER marked fixed has a re-review receipt dated after the fix.
4. VERIFY_NO_WRITES: `git diff --name-only` is empty for this task.
5. VERIFY_INDEPENDENCE: the review cites landed bytes, not task descriptions.

--------------------------------------------------------------------------------
EVIDENCE GATES (fast/cheap first — fail fast)
--------------------------------------------------------------------------------

Gate 1: Ten verdicts present (no blanks).
Gate 2: Ten receipts present and each names a file:line or a command.
Gate 3: Secret-placement and banned-trigger greps run and captured verbatim.
Gate 4: One real artifact downloaded; the twelve-cell and cursor-present edges cite artifact fields.
Gate 5: Zero `git diff` from this task.
Gate 6: Final verdict is `APPROVED` or `NEEDS_FIXES`; nothing in between.

--------------------------------------------------------------------------------
AGENT ASSIGNMENT
--------------------------------------------------------------------------------

- **Implementer (reviewer-of-record):** `github-agentic-workflow-reviewer` — adversarial workflow review (safe-outputs trust boundaries, sandbox/network policy, silent-drop keys, green-runs-that-wrote-nothing) is precisely this task's lens.
- **Reviewer (of the review):** `code-reviewer` — AGENTS.md defines it as general code-quality review on any surface; it audits the review's own receipts for independence and evidence.
- **Planner:** `github-agentic-workflow-planner`.

--------------------------------------------------------------------------------
OUT OF SCOPE
--------------------------------------------------------------------------------

- Fixing anything. Findings route to the owning task; a reviewer edit destroys the independence the sprint depends on.
- Re-deriving the PRD's rules or proposing new ones.
- Reviewing later-sprint surfaces (release gate, fix agent, heal PR, status job).
- Judging whether a graded harness *should* pass — that is the grader's job (T7).

--------------------------------------------------------------------------------
CONTEXT (read if unclear)
--------------------------------------------------------------------------------

**Current state:** nothing exists to review; the sprint's eleven implementation tasks are the subject.
**Gap:** Without an independent cross-task reading, each task can be green while the combination violates the PRD's non-negotiables.

--------------------------------------------------------------------------------
REVIEW CRITERIA (for code-reviewer, reviewing the review)
--------------------------------------------------------------------------------

Must pass (≤5, evidence-gate-backed):
- Ten edges, ten verdicts, ten receipts.
- Each receipt is checkable by a third party (a command they can re-run, or a file:line they can open).
- Every BLOCKER names an owning task and a resolution state.
- No repository file changed by this task.
- The final verdict is one of the two allowed words.

Should verify (≤5, judgment):
- The review quotes the PRD clause it is enforcing, not a paraphrase.
- Artifact-level edges cite artifact fields rather than source reading alone.
- Findings are neither softened nor inflated to reach a target verdict.

Verdict: [APPROVED | NEEDS_FIXES]

--------------------------------------------------------------------------------
DEPENDENCIES
--------------------------------------------------------------------------------

Depends on: T1 (the workflow file under review), T2 (the pins/schemas surfaces reviewed), T3 (the capture and guard under review), T4 (the case manifests whose report paths are reviewed), T5 (the claude-code adapter under review), T6 (the stream mapping under review), T7 (the grader contracts under review), T8 (the recorder under review), T9 (the secret placement under review), T10 (the fail-closed cells whose reasons are reviewed), T11 (the controls whose verdicts are reviewed)

Blocks: nothing. The review gates the sprint's completion, not a later task's start.

--------------------------------------------------------------------------------
NOTES
--------------------------------------------------------------------------------

- Dark task: no product-surface behaviour; exercised indirectly through human-testing gate steps 6–11. 3 of 60 sprint points (~5%), under the 30% dark ceiling.
- `why_required` names the three flows this review protects. That is the honest relationship: the review protects them, it does not replay them.
- Change the checklist only by changing the PRD clause it enforces — the ten edges are the review's contract.

<!-- REQUIREMENT-CONTRACT v1 -->
<!--
{
  "version": "1",
  "task_id": "T12",
  "task_type": "INFRA",
  "tdd_mode": "skipped",
  "verification_policy": {
    "requires_tests": false,
    "requires_red_evidence": false,
    "requires_seeded_evidence": false
  },
  "fixtures": {
    "seed/live-dispatch-run": {
      "entrypoint": "gh workflow run harness-eval --repo hackerpug-ai/pixel-perfect (real dispatch, checkout default)",
      "description": "RUN_ID + attempt-qualified artifacts via gh run download",
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
    }
  },
  "why_required": "protects FLOW-GRD-01-TWELVE-CELLS, FLOW-GRD-02-FOUR-GRADES and FLOW-GRD-03-FILES-AND-STREAM: the twelve-cell recorder, the four-grade adapter, and the evidence-not-exit-code capture are exactly the contracts this review reads; exercised only indirectly through human-testing gate steps 6-11",
  "guardrails": {
    "write_allowed": [
      "review comments only"
    ],
    "write_prohibited": [
      "everything \u2014 review task writes no files"
    ]
  },
  "requirements": [
    {
      "id": "AC-1",
      "type": "acceptance_criterion",
      "primary": false,
      "flow_ref": null,
      "title": "Review findings filed; merge-blocking contract violations resolved or named",
      "description": "GIVEN the eleven implementation tasks of sprint 01 landed on main plus one real dispatched run and its artifact WHEN the reviewer works the ten-edge checklist against the landed bytes and the artifact THEN each edge carries pass/finding/blocked with a file:line or command-output receipt and each BLOCKER is fixed-and-re-reviewed or reported unresolved",
      "test_tier": "unit",
      "verification_service": "review checklist",
      "verify": null,
      "test_file": null,
      "test_function": null,
      "positive_example": "checklist clean with receipts",
      "surface_policy": "read-only",
      "maps_to_ac": null,
      "observation_gates": [
        {
          "gate": "review checklist complete",
          "expected": "every contract edge answered with a receipt; any fabricated-file path rejected"
        }
      ]
    },
    {
      "id": "TC-1",
      "type": "test_criterion",
      "description": "No secrets. reference in the workflow sits outside a cell model-step env block (receipt command: grep -n 'secrets\\.' .github/workflows/harness-eval.yml)",
      "verify": null,
      "maps_to_ac": "AC-1"
    },
    {
      "id": "TC-2",
      "type": "test_criterion",
      "description": "The workflow declares none of the banned triggers pull_request, pull_request_target or workflow_run (receipt command: grep -Ec '^  (pull_request|pull_request_target|workflow_run):' .github/workflows/harness-eval.yml)",
      "verify": null,
      "maps_to_ac": "AC-1"
    },
    {
      "id": "TC-3",
      "type": "test_criterion",
      "description": "No root-level harness directory, no harness-matrix workflow and no branch-9624a4b gate wiring exist on main (receipt command: test ! -d harness && grep -c 'harness-matrix' scripts/release.mjs)",
      "verify": null,
      "maps_to_ac": "AC-1"
    }
  ]
}
-->
</details>
