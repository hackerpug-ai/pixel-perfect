# TASK-T12 — Review the evaluator workflow, capture layer, and grader contracts: secret placement, banned triggers, path confinement, aggregation order, exit-code independence, twelve-cell completeness, no root-level `harness/` or branch-9624a4b gate wiring landing

> Status: ✅ Completed

Commit: 670286bc8bb5013f1015cecae98bb02a458e7a2f
> Assignee: github-agentic-workflow-reviewer
> Priority: P2
> Points: 3
> Type: INFRA
> Planner: github-agentic-workflow-planner
> Proposed By: github-agentic-workflow-planner + evals-planner
> TDD_MODE: red_first
> RED_GREEN_REQUIRED: true

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

Read-only apart from one assertion file. `write_allowed`: `tests/sprint-01/t12-review-record.test.mjs`; review comments only — the review record itself, delivered in the commit message and under the run's evidence root, writes no other repository path. `write_prohibited`: everything else — `.github/workflows/**`, `test/harness/**`, `tests/sprint-01/**` other than `tests/sprint-01/t12-review-record.test.mjs`, `scripts/release.mjs`, `plugins/pixel-perfect/**`, `SPRINT.md`, `human-flows.json`, `.spec/e2e-policy/**`.

<details>
<summary>▸ Full agent specification (TASK-TEMPLATE v5.2 — required reading for implementer + reviewer)</summary>

```
TASK_TYPE:  INFRA
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

- NEVER write, edit, or "tidy" product files, or any test file other than `tests/sprint-01/t12-review-record.test.mjs`. The review is read-only; a reviewer edit removes the independent check the sprint relies on, and this task's one owned file exists only to assert the record's shape and its receipts.
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

  TEST_TIER:             unit (justification: the assertion reads the landed workflow bytes and the review record; it introduces no product behaviour of its own)
  VERIFICATION_SERVICE:  review checklist
  SURFACE_POLICY:        read-only
  TDD_STATE:             red_first
  TEST_FILE:             tests/sprint-01/t12-review-record.test.mjs
  TEST_FUNCTION:         t12-review-record-complete
  VERIFY:                node --test tests/sprint-01/t12-review-record.test.mjs --test-name-pattern t12-review-record-complete

  RED_INPUT:    On base `main` every edge is unanswerable: there is no workflow, no `test/harness/**`, no artifact — the checklist cannot produce a single receipt, which is the review's RED state today (gate step 1's before state). The case fails on the same bytes for the same reason: it reads the review record and the workflow, and neither exists.
  POSITIVE_EXAMPLE: The same ten edges answered on the landed sprint with a receipt each, zero unaddressed BLOCKERs — the review record reads clean with receipts.

  OBSERVATION_PATH: The landed sprint on `main` → the ten-edge checklist worked against real bytes and one real artifact → ten verdicts, each with a file:line or captured-command receipt, no unchecked edge, no fabricated-file path accepted.

  NOTE: this AC carries **no `scenario` key**. Its subject is a record of the repo's own bytes — ten verdicts, their receipts and the final word — not a seeded start state with a surface action and a machine-observed end state, so a scenario would model a check that does not exist and `validate_scenario` would rightly refuse it. `verify` selects the case in `tests/sprint-01/t12-review-record.test.mjs` that asserts the record's shape and each edge's receipt; the record's receipts, not the test, remain the proof of the ten edges.

--------------------------------------------------------------------------------
TEST CRITERIA (Boolean Verification)
--------------------------------------------------------------------------------

Not applicable as a product-behaviour suite — INFRA task (denominator 100, threshold 70). Observation gates below stand in for TC rows; the contract still carries three TCs because the machine contract requires at least one. Each TC's `verify` selects one case in `tests/sprint-01/t12-review-record.test.mjs`, which re-executes the receipt command in the statement against the landed bytes and then asserts the review record cites that command and its result, so the row is TRUE only when the repo and the record agree. The receipt-command column stays the human-runnable form:

| # | Boolean Statement | Maps To AC | Receipt command | Status |
|---|-------------------|------------|-----------------|--------|
| 1 | No `secrets.` reference sits outside a cell model-step `env:` block | AC-1 | `grep -n 'secrets\.' .github/workflows/harness-eval.yml` | [ ] TRUE [ ] FALSE |
| 2 | The workflow declares none of the banned `pull_request`-family triggers | AC-1 | `grep -Ec '^  (pull_request\|pull_request_target\|workflow_run):' .github/workflows/harness-eval.yml` | [ ] TRUE [ ] FALSE |
| 3 | No root-level `harness/`, no `harness-matrix.yml`, no branch-9624a4b gate wiring | AC-1 | `test ! -d harness && test ! -f .github/workflows/harness-matrix.yml && grep -c 'harness-matrix' scripts/release.mjs` | [ ] TRUE [ ] FALSE |

Each row runs as a named case in `tests/sprint-01/t12-review-record.test.mjs`: TC-1 → `t12-edge1-secret-placement`, TC-2 → `t12-edge2-banned-triggers`, TC-3 → `t12-edge8-no-forbidden-salvage`.

--------------------------------------------------------------------------------
SCOPE / GUARDRAILS (WRITE-ALLOWED / WRITE-PROHIBITED)
--------------------------------------------------------------------------------

writeAllowed:
- tests/sprint-01/t12-review-record.test.mjs
- review comments only — the review record itself, delivered in the commit message and under the run's evidence root, writes no other repository path

writeProhibited:
- everything else — `plugins/pixel-perfect/**`, `.github/workflows/**`, `test/harness/**`, `tests/sprint-01/**` except `tests/sprint-01/t12-review-record.test.mjs`, `scripts/release.mjs`, `SPRINT.md`, `human-flows.json`, `.spec/e2e-policy/**`

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

- A review record: ten edges × (verdict, receipt, severity, owner task) plus an explicit unresolved-blocker list — at `.kb-run-sprint/sprint-01-evaluator-evidence-spine/T12/evidence/t12-review-record.md`, and in the message of an empty commit.
- `tests/sprint-01/t12-review-record.test.mjs`: the one repository file this task writes. It asserts the record's shape and re-executes each cited receipt; it reads the record and the workflow from the repo and fails when the record is absent.

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
4. VERIFY_NO_WRITES: `git diff --name-only` names no path but `tests/sprint-01/t12-review-record.test.mjs`.
5. VERIFY_INDEPENDENCE: the review cites landed bytes, not task descriptions.

--------------------------------------------------------------------------------
EVIDENCE GATES (fast/cheap first — fail fast)
--------------------------------------------------------------------------------

Gate 1: Ten verdicts present (no blanks).
Gate 2: Ten receipts present and each names a file:line or a command.
Gate 3: Secret-placement and banned-trigger greps run and captured verbatim.
Gate 4: One real artifact downloaded; the twelve-cell and cursor-present edges cite artifact fields.
Gate 5: `git diff --name-only` names no path but `tests/sprint-01/t12-review-record.test.mjs`; no product file, no other test, no policy file.
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
- No repository file changed by this task except `tests/sprint-01/t12-review-record.test.mjs`.
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
  "tdd_mode": "red_first",
  "verification_policy": {
    "requires_tests": true,
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
      "tests/sprint-01/t12-review-record.test.mjs",
      "review comments only \u2014 the review record itself, delivered in the commit message and under the run's evidence root, writes no other repository path"
    ],
    "write_prohibited": [
      "everything else \u2014 `plugins/pixel-perfect/**`, `.github/workflows/**`, `test/harness/**`, `tests/sprint-01/**` except `tests/sprint-01/t12-review-record.test.mjs`, `scripts/release.mjs`, `SPRINT.md`, `human-flows.json`, `.spec/e2e-policy/**`"
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
      "verify": "node --test tests/sprint-01/t12-review-record.test.mjs --test-name-pattern t12-review-record-complete",
      "test_file": "tests/sprint-01/t12-review-record.test.mjs",
      "test_function": "t12-review-record-complete",
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
      "test_file": "tests/sprint-01/t12-review-record.test.mjs",
      "test_function": "t12-edge1-secret-placement",
      "verify": "node --test tests/sprint-01/t12-review-record.test.mjs --test-name-pattern t12-edge1-secret-placement",
      "maps_to_ac": "AC-1"
    },
    {
      "id": "TC-2",
      "type": "test_criterion",
      "description": "The workflow declares none of the banned triggers pull_request, pull_request_target or workflow_run (receipt command: grep -Ec '^  (pull_request|pull_request_target|workflow_run):' .github/workflows/harness-eval.yml)",
      "test_file": "tests/sprint-01/t12-review-record.test.mjs",
      "test_function": "t12-edge2-banned-triggers",
      "verify": "node --test tests/sprint-01/t12-review-record.test.mjs --test-name-pattern t12-edge2-banned-triggers",
      "maps_to_ac": "AC-1"
    },
    {
      "id": "TC-3",
      "type": "test_criterion",
      "description": "No root-level harness directory, no harness-matrix workflow and no branch-9624a4b gate wiring exist on main (receipt command: test ! -d harness && grep -c 'harness-matrix' scripts/release.mjs)",
      "test_file": "tests/sprint-01/t12-review-record.test.mjs",
      "test_function": "t12-edge8-no-forbidden-salvage",
      "verify": "node --test tests/sprint-01/t12-review-record.test.mjs --test-name-pattern t12-edge8-no-forbidden-salvage",
      "maps_to_ac": "AC-1"
    }
  ]
}
-->
</details>

## Deliverables

1. **The review record** at `.kb-run-sprint/sprint-01-evaluator-evidence-spine/T12/evidence/t12-review-record.md` — ten edges, each carrying `verdict` (`pass` | `finding` | `blocked`), `severity`, `owner_task` and `receipt` (the command run and its output line, or a `file:line`), plus an `## Unresolved blockers` section.
2. **`tests/sprint-01/t12-review-record.test.mjs`** — the one repository file this task writes. It asserts the record's shape and re-executes each cited receipt:
   - `t12-review-record-complete` (AC-1): all ten edges exist, each with a `verdict` and a non-empty `receipt`, and the record ends in `APPROVED` or `NEEDS_FIXES`.
   - `t12-edge1-secret-placement` (TC-1): the secret-placement edge cites a `secrets.` grep over `.github/workflows/harness-eval.yml`, and every hit it cites falls inside a cell model-step `env:` block.
   - `t12-edge2-banned-triggers` (TC-2): the banned-trigger edge cites the `grep -Ec` over the same file and reads zero.
   - `t12-edge8-no-forbidden-salvage` (TC-3): the salvage edge cites the full three-part `test ! -d harness && test ! -f .github/workflows/harness-matrix.yml && grep -c 'harness-matrix' scripts/release.mjs`.
3. **The record as a commit message** — `git commit --allow-empty -F <record>`, because the task changes no product file.
4. **No fabricated receipts.** The test reads the record file and the workflow file from the repo and fails when the record is absent; it never writes, invents or repairs a receipt, and never stubs the workflow.

## Amendments

### 2026-11-01 — the four `verify` fields filled (superseded by the entry below)
- **Source:** `.kb-run-sprint/sprint-01-evaluator-evidence-spine/T12/cycle-1.blocked.json` · sha256 `1a935c241633a09d0a3f2a56e560b76b3a32737fd6838035a4aa54d9c8bf6121` — the reviewer's blocked report, whose blockers name `TASK-T12.md:343,360,367,374` as the `"verify": null` fields.
- **What changed then:** every `"verify": null` became the receipt command the task already declared — `grep -n 'secrets\.' .github/workflows/harness-eval.yml` for TC-1, `grep -Ec '^  (pull_request|pull_request_target|workflow_run):' .github/workflows/harness-eval.yml` for TC-2, the full three-part `test ! -d harness && test ! -f .github/workflows/harness-matrix.yml && grep -c 'harness-matrix' scripts/release.mjs` for TC-3, and the checklist command set for AC-1.
- **Why it was replaced:** `publish-plan` refused that shape with `BROAD_PROOF_COMMAND: T12/AC-1 verify command must select its bound test path`, and the same for TC-1, TC-2 and TC-3. A verify that observes is not a verify that selects, and a read-only task owned no test path for it to select. The fix is the entry below, not a softer command.

### 2026-11-01 — write scope widened by exactly one test file
- **Source:** `.kb-run-sprint/sprint-01-evaluator-evidence-spine/owner-answers/a36f35b458795e360623f6cad969fba57f334799a1177bb0cf78d19c7309e643.json` · sha256 `e8f82cd7d789cd541982bcd27efacbd2082820f59449aa4bc1d079480ccb1dc3` · answer `push, widen T12, authorize the fix` (owner).
- **What changed:** `write_allowed` gained exactly one path, `tests/sprint-01/t12-review-record.test.mjs`; all four requirements are bound to that file — AC-1 → `t12-review-record-complete`, TC-1 → `t12-edge1-secret-placement`, TC-2 → `t12-edge2-banned-triggers`, TC-3 → `t12-edge8-no-forbidden-salvage` — with `verify` = `node --test tests/sprint-01/t12-review-record.test.mjs --test-name-pattern <case>`; the header became `TDD_MODE: red_first` / `RED_GREEN_REQUIRED: true` and `verification_policy.requires_tests` became `true`; a `## Deliverables` section states what must exist; the DELIVERABLE line, the first critical constraint, the `VERIFY_NO_WRITES` step, evidence gate 5 and the review criteria's no-write clause now name that one path instead of claiming a clean tree; the AC-1 NOTE and the TEST CRITERIA lead-in no longer call the verifies `null` by design.
- **What did not change:** every checklist edge, every expected observation, every human-testing gate step (SPRINT.md steps 1–13), AC-1's GIVEN/WHEN/THEN, the three TC statements and their receipt commands, the reading list, the review flow, the remaining critical constraints, and the forbidden-path list — which now reads its `tests/sprint-01/**` entry as "everything except that one file".

## Handoff

```json
{
  "task": "T12",
  "commit_sha": "670286bc8bb5013f1015cecae98bb02a458e7a2f",
  "done": "Re-reviewed the sprint-01 evaluator surface on a widened contract and produced both deliverables: the refreshed ten-edge record at .kb-run-sprint/sprint-01-evaluator-evidence-spine/T12/evidence/t12-review-record.md (delivered as the message of empty commit 670286b, test file committed at a8fc35e) and tests/sprint-01/t12-review-record.test.mjs with exactly four cases. All ten edges pass with receipts re-run this cycle against the current worktree: five `secrets.` hits, each inside a cell model-step `env:` gated to its own harness (and the `harness-smoke` environment admits deployments from `main` only, a platform bound I verified via the API); zero banned triggers; 49/49 path-confinement/aggregation/named-path tests; `AGGREGATE_ORDER` plus a live `recorderExit` of `code 1 / could-not-run`; 14 `process_exit_code` hits, none a verdict branch, with `exitCodeVerdict` appearing only as trap assertions in tests; twelve cells across six harnesses accepted by the production `enforceTwelveCells` and a live `cells-incomplete {expected:12,got:0}` refusal on run 41396331824; cursor present on both tracks as `could-not-run / missing-api-key`; no root-level `harness/`, no `harness-matrix.yml`, no salvage wiring; `permissions: {}` with `actions: read` only on the recorder. Final verdict stays NEEDS_FIXES because two BLOCKERs remain unresolved outside the ten edges: F-T12-1 (owner T17/T16) — on both hosted runs at head 8011672 the verify-reports artifact is a 254-byte INDEX.json with `reports: []`, no cell carries `verify_reports`, and both claude-code cells grade `verify fail report-missing` plus `question_before_expensive_work could-not-run` (missing `question-start`), so gate steps 6 and 8 cannot pass; and the new F-T12-2 (owner T3, correction sited in locked SPRINT.md step 10) — step 10's second jq reads `.checks[0].process_exit_code`, which the shipped cell schema and 03-data-schema.md:42 do not declare, so it prints `null` where the step promises an integer (the exit code is stored at cell level and reads `0`). The test reads the record from the workspace resolved through `git rev-parse --path-format=absolute --git-common-dir`, parses all ten edges for verdict/severity/owner/receipt, asserts the final verdict, and re-executes the TC-1/TC-2/TC-3 receipt commands against the real workflow and repo bytes, asserting the record cites each with the matching count.",
  "deviations": [
    "The task's `verify` commands place `--test-name-pattern` after the positional test file; Node 24.14 ignores the flag in that order, so each verify runs all four cases (exit 0 only when all four pass). I kept the commands exactly as the task specifies — the behaviour is strictly stronger, not weaker — and documented it in the record. With the flag before the file it does isolate, if the harness ever wants that.",
    "The record's edge-2 assertion was tightened after a surviving mutant: the first version accepted the word 'zero' from surrounding prose, so a record saying '1 match' still passed. It now parses the recorded number and compares it to the re-run count; the mutant dies. Recorded in the record rather than quietly fixed.",
    "I moved the review record aside once to prove all four cases fail when it is absent, then restored it and re-checked its sha256 byte-identical (implementer-cycle-2/record-absent-proof.log). Four mutations of the record were likewise applied-then-restored, each scored on which case failed (mutation-proof.log, mutation-proof-round2.log).",
    "The empty commit was amended once (20ef0c1 → 670286b) after making two probe-table commands literally runnable instead of using a comma-shorthand; all four verifies were re-run and stayed green against the edited record."
  ],
  "concerns": [
    "F-T12-1 is the sprint's real risk: a report that treats the 254-byte INDEX.json as evidence that gate step 8 passed would be the 'green run that wrote nothing' failure this role exists to catch. The artifact is honest — it says reports: [].",
    "F-T12-2 invites the wrong fix. Adding process_exit_code to a check row would contradict 03-data-schema.md:42 and the shipped cell schema; the exit code already exists where the PRD requires it, on the cell.",
    "The newest dispatch (41396331824) produced zero cells because the harness-smoke environment refuses deployments from any branch but main. That is correct secret posture, but it means a hosted grade can only be produced by dispatching from main — a reviewer or gate runner working from a sprint branch will see twelve failed jobs and a cells-incomplete refusal, which is the framework refusing, not a broken workflow.",
    "test/harness/controls/child-tree.mjs is test-only (imported at tests/sprint-01/grd-03-evidence.test.mjs:1297, no production importer) and duplicates the scan that test/harness/smoke/image-scan.mjs:84 already performs; two implementations of one reason can drift. Outside the ten edges, flagged for T11's later cycles.",
    "The workflow declares only workflow_dispatch; PRD 02-system-components.md:15 also names schedule and push-to-main, which the file documents as a later sprint (.github/workflows/harness-eval.yml:3-8). Correct for locked scope, but UC-RUN-01 and UC-RUN-03 are not evidenced here."
  ],
  "findings": [
    "edge 1 | pass | none | T9 | `grep -n 'secrets\\.' .github/workflows/harness-eval.yml` → 5 hits (119, 172, 182, 193, 202), each in a cell model-step env: gated to its own harness; harness-smoke branch policy = main only",
    "edge 2 | pass | none | T1 | `grep -Ec '^  (pull_request|pull_request_target|workflow_run):' .github/workflows/harness-eval.yml` → `0`, exit 1 (zero matches is the pass); indentation-agnostic scan also finds none",
    "edge 3 | pass | none | T4 | `node --test tests/sprint-01/grd-01-twelve-cells.test.mjs tests/sprint-01/grd-02-four-grades.test.mjs tests/sprint-01/grd-04-named-path.test.mjs` → 49 tests, 49 pass, 0 fail, exit 0; `✔ absolute, .., and symlinked-ancestor paths are refused before any write`",
    "edge 4 | pass | none | T7 | `grep -n 'export const AGGREGATE_ORDER' -A1 test/harness/lib/verdict.mjs` → `9:export const AGGREGATE_ORDER = [\"could-not-run\", \"fail\", \"pass\"];`; `✔ the aggregate is could-not-run before fail before pass, and every constituent survives`",
    "edge 5 | pass | none | T3 | `grep -rn 'process_exit_code' test/harness --include='*.mjs'` → 14 hits, none a verdict branch; `exitCodeVerdict` only in trap assertions; artifact claude-code/newest = could-not-run with process_exit_code 0",
    "edge 6 | pass | none | T8 | `enforceTwelveCells(<hosted cells>)` → {\"cells\":12,\"harnesses\":6,\"pairs\":12}; live refusal on run 41396331824: `cells-incomplete: {\"expected\":12,\"got\":0,...}`",
    "edge 7 | pass | none | T10 | artifact cursor cells: 2 → newest and pinned both could-not-run/missing-api-key/invocation-guard; six harnesses present",
    "edge 8 | pass | none | T1 | `test ! -d harness && test ! -f .github/workflows/harness-matrix.yml && grep -c 'harness-matrix' scripts/release.mjs` → `0`, exit 1",
    "edge 9 | pass | none | T1 | `grep -nE '^\\s*permissions:' -A3 .github/workflows/harness-eval.yml` → `23:permissions: {}`, four `contents: read`, `actions: read` only at :492; `grep -nE ':\\s*(write|write-all)\\s*$'` → no matches",
    "edge 10 | pass | none | T7 | `tests/sprint-01/grd-04-named-path.test.mjs:241` → `assert.equal(path.basename(written.path), \"verify-button-drift.json\", \"no timestamp, pid or suffix in the filename\")`; artifact report_paths name only case-declared leaves",
    "F-T12-1 | blocked | BLOCKER | T17/T16 | both head-8011672 runs: harness-eval-verify-reports-<run>-1 = 254 bytes, INDEX.json `{\"reports\":[],\"reason\":\"no verify report artifact arrived...\"}`; no cell carries verify_reports; both claude-code cells `verify fail report-missing` — gate steps 6 and 8 red",
    "F-T12-2 | blocked | BLOCKER | T3 | `jq -r '.cells[] | select(.harness==\"claude-code\" and .track==\"pinned\") | .checks[0].process_exit_code'` → `null` (check rows carry only check_id/reason/source/verdict; schema and 03-data-schema.md:42 agree); cell-level `.process_exit_code` → `0` — gate step 10 red as written"
  ],
  "scope_impact": [
    {
      "target": "T17",
      "found": "The verify report never reaches the recorder: on both hosted runs at head 8011672 no cell carries `verify_reports`, `later_checks.verify_reports` is null, and harness-eval-verify-reports-<run>-1 is a 254-byte INDEX.json with reports: []. Both claude-code cells grade `verify fail report-missing` (both verify-button-drift and verify-clean) and `question_before_expensive_work could-not-run` with missing [\"question-start\"].",
      "change": "None by me (read-only). T17 must make the hosted claude-code verify invocation write the report at the case-declared path under cell/verify-upload/reports/, then re-dispatch and re-review F-T12-1 with the new report bytes as the receipt."
    },
    {
      "target": "T16",
      "found": "Secondary owner of F-T12-1: the report path plus invocation id the verify invocation declares never arrive, so no report can be bound.",
      "change": "None by me. Re-review needed after T17's fix lands."
    },
    {
      "target": "T3",
      "found": "Gate step 10's second jq path `.checks[0].process_exit_code` reads a field that no artifact carries and that test/harness/schemas/harness-cell.v1.schema.json and 03-data-schema.md:42 do not declare; it prints `null` on both runs. The exit code IS stored at cell level (`process_exit_code: 0`), which is what the PRD requires.",
      "change": "None by me. The correction is a one-word path change in SPRINT.md step 10 (`.process_exit_code`), or an owner decision to keep the step; adding the field to a check row on the other hand would contradict 03-data-schema.md:42 and must be refused."
    },
    {
      "target": "GATE:FLOW-GRD-03-FILES-AND-STREAM",
      "found": "Gate steps 6 and 8 are red on both hosted runs: `verify pass` reads `fail / report-missing`, and the step-8 download has no reports/verify-button-drift.json or reports/verify-clean.json to read.",
      "change": "None by me. The gate cannot go green until F-T12-1 is fixed and a fresh dispatch produces the reports."
    },
    {
      "target": "GATE:FLOW-GRD-04-NAMED-PATH",
      "found": "Gate step 10 prints `4` then `null` where it promises an integer exit code (F-T12-2); the path authority the edge protects itself holds, with all four report_paths confined to their own mkdtemp invocation directories and named only by case-declared leaves.",
      "change": "None by me; the gate step's jq path needs correcting by its owner."
    }
  ],
  "feedback": [
    "For code-reviewer (reviewing the review): every receipt above is re-runnable from the worktree; the log for each is named in the record and lives under implementer-cycle-2/. The two BLOCKERs are the only non-green signals and neither is downgraded.",
    "For the sprint owner: F-T12-1 needs a dispatch, not a code review of the recorder — the recorder is correct and says so honestly. F-T12-2 needs one word changed in a locked file; if the lock is expensive to move, the step could be rewritten to read the cell, which is the same evidence.",
    "For whoever runs the human gate: dispatch from main. Any other branch fails all twelve smoke jobs at environment deployment and produces no artifact to read."
  ]
}
```
