# TASK-GAW-I1: Give the smoke job the runner the Pi and Codex CLIs need

> Task ID: GAW-I1
> Sprint: [SPRINT.md](./SPRINT.md)
> Status: Backlog
> Assignee: devops-engineer
> Priority: P0
> Points: 2
> Type: INFRA
> Planner: github-agentic-workflow-planner
> Reviewer: github-agentic-workflow-reviewer
> Proposed By: github-agentic-workflow-planner
> Wave: A
> TDD_MODE: skipped · RED_GREEN_REQUIRED: false

AGENT: planner=github-agentic-workflow-planner | implementer=devops-engineer | reviewer=github-agentic-workflow-reviewer

## Background

- **Why required:** GAW-6 cannot run: @earendil-works/pi-coding-agent@1.0.4 declares engines node >=22.19.0 and jobs.smoke has no setup-node step, so it runs whatever Node the runner image ships. GAW-3's status and verify cannot run: Codex's sandbox on Ubuntu 24.04 fails with bwrap: loopback: Failed RTM_NEWADDR: Operation not permitted until the AppArmor user-namespace restriction is lifted (openai/codex-action does this on hosted Linux runners).
- **Current:** `jobs.smoke` has no setup-node step and no sysctl step.
- **Gate steps that exercise this task:** 18, 22. Capability: CAP-EVAL-01.

## Critical Constraints

- **NEVER** put a secret or an `env` entry on either new step.
- **NEVER** add a `cache` input: the smoke job must stay free of cache steps.
- **MUST** place both steps after checkout and before the install slot.
- **MUST** leave every keyed step and the Keyless control step as they are.
- **NEVER** set the sysctl on any leg but codex.

## Specification

- **Objective:** The smoke job gives each leg Node 24 and gives each codex leg the user-namespace setting its sandbox needs, with no secret on either new step.
- **Success state:** `jobs.smoke` holds one setup-node step reading `node-version: 24` with no `cache`, and one codex-only step that sets the sysctl with no `env`. Both sit before the install slot, and the sprint-01 declaration flows still pass.

Implementation steps:

1. Add `actions/setup-node@v4` with `node-version` 24 and no `cache` input to `jobs.smoke`, after checkout and before the install slot. [PRIMARY]
2. Add one keyless step, `if: matrix.harness == 'codex'`, before the install slot, that runs `sudo sysctl -w kernel.apparmor_restrict_unprivileged_userns=0` when the current value is not 0. It holds no secret and no env entry.
3. Run FLOW-GRD-06-MISSING-KEY to confirm no credential moved onto a keyless step.
4. Run FLOW-RUN-02-HAND to confirm the smoke job still has no cache step and no secret on an install step.

## Acceptance Criteria (GIVEN-WHEN-THEN)

### AC-1: The smoke job sets up Node 24 with no cache

- **GIVEN:** `jobs.smoke` after this change
- **WHEN:** the gate `smoke-node-24` reads its setup-node step
- **THEN:** it prints `node-version: 24` with no `cache` line
- **CHECKLIST_GATE_REFS:** `smoke-node-24`

### AC-2: The sysctl step runs on codex alone and binds nothing

- **GIVEN:** `jobs.smoke` after this change
- **WHEN:** the gate `codex-sysctl-step` reads the step that sets the sysctl
- **THEN:** it prints `matrix.harness == 'codex'` and `false` for an `env` key
- **CHECKLIST_GATE_REFS:** `codex-sysctl-step`

### AC-3: No credential moved onto a keyless step

- **GIVEN:** the workflow after this change
- **WHEN:** the gate `regression-missing-key` runs FLOW-GRD-06-MISSING-KEY
- **THEN:** it exits 0, so no credential moved onto a keyless step
- **CHECKLIST_GATE_REFS:** `regression-missing-key`

### AC-4: The job list and declaration rules still hold

- **GIVEN:** the workflow after this change
- **WHEN:** the gate `regression-run-02` runs FLOW-RUN-02-HAND
- **THEN:** it exits 0, so the job list and declaration rules still hold
- **CHECKLIST_GATE_REFS:** `regression-run-02`

## Test Criteria

| ID | Statement | Maps to | Gate |
|---|---|---|---|
| TC-1 | The smoke job's setup-node step reads `node-version: 24` | AC-1 | `smoke-node-24` |
| TC-2 | The sysctl step's condition reads `matrix.harness == 'codex'` | AC-2 | `codex-sysctl-step` |
| TC-3 | FLOW-GRD-06-MISSING-KEY exits 0 on this workflow | AC-3 | `regression-missing-key` |
| TC-4 | FLOW-RUN-02-HAND exits 0 on this workflow | AC-4 | `regression-run-02` |

## Reading List

1. `.github/workflows/harness-eval.yml` lines 73-115: the smoke job's checkout and install slot
2. `tests/sprint-01/run-02-hand.test.mjs` lines all: the job list and declaration rules this must keep
3. `tests/sprint-01/grd-06-missing-key.test.mjs` lines 600-612: what pins a keyless step

Standards: `AGENTS.md`, `brain/docs/kanban/SCENARIO-CONTRACT-V1.md`.

## Guardrails

WRITE-ALLOWED:

- .github/workflows/harness-eval.yml (MODIFY)

WRITE-PROHIBITED:

- Any keyed model step in `.github/workflows/harness-eval.yml`
- The Keyless control step
- Any file not listed in WRITE-ALLOWED

## Code Pattern

```yaml
# harness-eval.yml, jobs.grade: the setup-node shape to copy, minus any cache input.
- name: Set up Node.js
  uses: actions/setup-node@v4
  with:
    node-version: 24
```

- **Anti-pattern:** A shared env block holding a key; a sysctl on every leg; a cache step; a Node version read from a file the checkout does not pin.

## Design

None. This task has no UI surface.

## Agent Instructions

Work the steps above in order, then run the gates, fast before slow. Report command output for each gate.

## Orchestrator Verification Protocol

1. Confirm the gates `smoke-node-24` and `codex-sysctl-step` printed their RED output on base.
2. Run every Evidence Gate and compare with Expected.
3. `git diff --name-only` lists only `.github/workflows/harness-eval.yml`.
4. Dispatch `github-agentic-workflow-reviewer` with this file and the command output.

## Agent Assignment

- **Planner:** `github-agentic-workflow-planner`
- **Implementer:** `devops-engineer`
- **Reviewer:** `github-agentic-workflow-reviewer`
- **Rationale:** `devops-engineer` owns CI runner setup. `github-agentic-workflow-reviewer` audits that the sysctl stays scoped and that no secret moved.

## Evidence Gates

- **smoke-node-24:** `yq '.jobs.smoke.steps[] | select(.uses == "actions/setup-node@v4") | .with' .github/workflows/harness-eval.yml`. Expected: `node-version: 24` and no `cache` line
- **codex-sysctl-step:** `yq '.jobs.smoke.steps[] | select((.run // "") | test("kernel.apparmor_restrict_unprivileged_userns")) | [.if, (has("env"))]' .github/workflows/harness-eval.yml`. Expected: `matrix.harness == 'codex'` then `false`
- **regression-missing-key:** `node --test --test-name-pattern 'FLOW-GRD-06-MISSING-KEY' tests/sprint-01/grd-06-missing-key.test.mjs`. Expected: exit 0
- **regression-run-02:** `node --test --test-name-pattern 'FLOW-RUN-02-HAND' tests/sprint-01/run-02-hand.test.mjs`. Expected: exit 0
- **validate:** `pnpm validate`. Expected: exit 0

## Review Criteria

Must pass:

- Every step above is done.
- Every gate output matches Expected.
- No secret, `env` entry or `cache` input sits on either new step.
- Only `.github/workflows/harness-eval.yml` changed.

Should verify:

- The sysctl runs only when the current value is not 0.
- The rollback below is plausible.

Verdict: APPROVED or NEEDS_FIXES, with file and line for each finding.

## Dependencies

- **Depends on:** none
- **Blocks:** none

## Notes

- **Hosted proof:** the record's third check needs GAW-3 and GAW-6, which land later, so it cannot gate this task. On a dispatched run the codex cells' load evidence shows `codex sandbox linux /bin/true` exiting 0, and both pi cells read an `observed_cli_version`. Gate steps 18 and 22 list this task in their exercises and fail if either is missing.
- **Rollback:** `git revert` the commit. The sysctl lives on one hosted runner and ends with it, so nothing persists.

<!-- REQUIREMENT-CONTRACT v1 -->
<!--
{"version":"1","task_id":"GAW-I1","task_type":"INFRA","tdd_mode":"skipped","verification_policy":{"requires_tests":false,"requires_red_evidence":false,"requires_seeded_evidence":false},"guardrails":{"write_allowed":[".github/workflows/harness-eval.yml (MODIFY)"],"write_prohibited":["Any keyed model step in `.github/workflows/harness-eval.yml`","The Keyless control step","Any file not listed in WRITE-ALLOWED"]},"fixtures":{},"verification_gates":[{"gate":"smoke-node-24","command":"yq '.jobs.smoke.steps[] | select(.uses == \"actions/setup-node@v4\") | .with' .github/workflows/harness-eval.yml","expected":"`node-version: 24` and no `cache` line","red":"today it prints nothing: the smoke job has no setup-node step","positive_example":"the landed workflow prints `node-version: 24`"},{"gate":"codex-sysctl-step","command":"yq '.jobs.smoke.steps[] | select((.run // \"\") | test(\"kernel.apparmor_restrict_unprivileged_userns\")) | [.if, (has(\"env\"))]' .github/workflows/harness-eval.yml","expected":"`matrix.harness == 'codex'` then `false`","red":"today it prints `[]`: no step sets the sysctl","positive_example":"the landed workflow prints the condition, then `false`"},{"gate":"regression-missing-key","command":"node --test --test-name-pattern 'FLOW-GRD-06-MISSING-KEY' tests/sprint-01/grd-06-missing-key.test.mjs","expected":"exit 0","positive_example":"the flow passes with both new steps in the workflow"},{"gate":"regression-run-02","command":"node --test --test-name-pattern 'FLOW-RUN-02-HAND' tests/sprint-01/run-02-hand.test.mjs","expected":"exit 0","positive_example":"the flow passes with both new steps in the workflow"},{"gate":"validate","command":"pnpm validate","expected":"exit 0","positive_example":"every repo validator prints its pass line"}],"integration_obligations":[],"requirements":[{"id":"AC-1","type":"acceptance_criterion","primary":false,"description":"GIVEN `jobs.smoke` after this change WHEN the gate `smoke-node-24` reads its setup-node step THEN it prints `node-version: 24` with no `cache` line","flow_ref":null,"maps_to_ac":null,"verification_kind":"configuration","checklist_gate_refs":["smoke-node-24"],"verify":null,"positive_example":"the landed workflow prints `node-version: 24`"},{"id":"AC-2","type":"acceptance_criterion","primary":false,"description":"GIVEN `jobs.smoke` after this change WHEN the gate `codex-sysctl-step` reads the step that sets the sysctl THEN it prints `matrix.harness == 'codex'` and `false` for an `env` key","flow_ref":null,"maps_to_ac":null,"verification_kind":"configuration","checklist_gate_refs":["codex-sysctl-step"],"verify":null,"positive_example":"the landed workflow prints the condition, then `false`"},{"id":"AC-3","type":"acceptance_criterion","primary":false,"description":"GIVEN the workflow after this change WHEN the gate `regression-missing-key` runs FLOW-GRD-06-MISSING-KEY THEN it exits 0, so no credential moved onto a keyless step","flow_ref":null,"maps_to_ac":null,"verification_kind":"configuration","checklist_gate_refs":["regression-missing-key"],"verify":null,"positive_example":"the flow passes with both new steps in the workflow"},{"id":"AC-4","type":"acceptance_criterion","primary":false,"description":"GIVEN the workflow after this change WHEN the gate `regression-run-02` runs FLOW-RUN-02-HAND THEN it exits 0, so the job list and declaration rules still hold","flow_ref":null,"maps_to_ac":null,"verification_kind":"configuration","checklist_gate_refs":["regression-run-02"],"verify":null,"positive_example":"the flow passes with both new steps in the workflow"},{"id":"TC-1","type":"test_criterion","description":"The smoke job's setup-node step reads `node-version: 24`","maps_to_ac":"AC-1","verification_kind":"configuration","checklist_gate_refs":["smoke-node-24"],"verify":null,"positive_example":"the landed workflow prints `node-version: 24`"},{"id":"TC-2","type":"test_criterion","description":"The sysctl step's condition reads `matrix.harness == 'codex'`","maps_to_ac":"AC-2","verification_kind":"configuration","checklist_gate_refs":["codex-sysctl-step"],"verify":null,"positive_example":"the landed workflow prints the condition, then `false`"},{"id":"TC-3","type":"test_criterion","description":"FLOW-GRD-06-MISSING-KEY exits 0 on this workflow","maps_to_ac":"AC-3","verification_kind":"configuration","checklist_gate_refs":["regression-missing-key"],"verify":null,"positive_example":"the flow passes with both new steps in the workflow"},{"id":"TC-4","type":"test_criterion","description":"FLOW-RUN-02-HAND exits 0 on this workflow","maps_to_ac":"AC-4","verification_kind":"configuration","checklist_gate_refs":["regression-run-02"],"verify":null,"positive_example":"the flow passes with both new steps in the workflow"}]}
-->
