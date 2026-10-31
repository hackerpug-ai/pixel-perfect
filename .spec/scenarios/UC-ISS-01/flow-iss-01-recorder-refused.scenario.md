---
flow_id: FLOW-ISS-01-RECORDER-REFUSED
service: harness-eval
feature: UC-ISS-01
priority: P0
type: error_handling
tier: visible
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
    - "One open issue titled `harness-eval recorder: refused (timestamps-missing)`, built from `grade/refusal.json`."
  must_not_observe:
    - "A filer that reads the reason out of `recorder.log`."
negative_control:
  would_fail_if:
    - "A run that wrote no `harness-eval-result.json` files no issue, as runs 41122997333 and 41111463326 would have."
    - "The issue still files after `grade/refusal.json` is removed and only `recorder.log` remains, proving the log is being parsed."
evidence:
  artifact_type: grade-file
  required_capture: true
---

# A run the recorder refused still reaches the maintainer

The recorder refuses and writes no result, as it really did with `timestamps-missing`. There are no cells to read. The recorder writes only its closed reason to a small record, and the issue job reads that record. If neither a result nor a refusal record arrived, the job files `refused/no-result-artifact`. The failed run does not disappear just because it produced nothing to grade.
