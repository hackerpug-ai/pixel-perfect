---
flow_id: FLOW-ISS-05-CONTROL-FAIL-ROW
service: harness-eval
feature: UC-ISS-05
priority: P0
type: edge_case
tier: holdout
scope: task
test_tier: e2e
ac_ref: AC-3
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
    - "With `exit0-denied-read` reading `fail` and `matched: true`, and `verify` passing while the oracle exits 1, no issue files."
  must_not_observe:
    - "An alarm raised by the word `fail` on a control."
negative_control:
  would_fail_if:
    - "A control reading `fail` with `matched: true` files an issue."
    - "Correct planted detection with the oracle exiting 1 files an issue."
    - "A control with `matched: false` files nothing."
evidence:
  artifact_type: grade-file
  required_capture: true
---

# A control doing its job is not a failure

The denied-read control is supposed to read fail. The planted defect is supposed to be found, and the oracle exits 1 when it is. Both are the evaluator working. A filer keyed on verdict words or exit codes would raise a false alarm on every healthy run.
