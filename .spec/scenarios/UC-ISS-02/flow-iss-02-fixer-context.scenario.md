---
flow_id: FLOW-ISS-02-FIXER-CONTEXT
service: harness-eval
feature: UC-ISS-02
priority: P0
type: happy_path
tier: visible
scope: task
test_tier: e2e
ac_ref: AC-2
start_state:
  description: A finished harness-eval run on main in this repository, with its result artifact.
  seed_method: public_workflow
  records: []
action:
  actor: github_actions
  steps:
    - Run the harness-eval workflow on a real runner, then read the issues, the receipt, and the summary.
end_state:
  must_observe:
    - "The issue states the run link and attempt, event, install mode, evaluated commit, plugin digest, pins digest, observed CLI versions, and the twelve-cell grid, each equal to the result artifact."
  must_not_observe:
    - "A field in the issue that differs from the result artifact."
negative_control:
  would_fail_if:
    - "The issue's grid differs from the grid command's output on the same run."
    - "An observed CLI version in the issue is the pin rather than the version the runner measured."
evidence:
  artifact_type: grade-file
  required_capture: true
---

# A fixer can start from the issue alone

A fixer who has never seen the run opens the issue and nothing else. From it they can tell which harness, track, and check failed, what the failure blocks, which commit and CLI were measured, and whether the same check passed elsewhere. They do not need to ask a question before starting.
