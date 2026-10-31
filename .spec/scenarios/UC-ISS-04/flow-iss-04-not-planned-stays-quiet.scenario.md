---
flow_id: FLOW-ISS-04-NOT-PLANNED-STAYS-QUIET
service: harness-eval
feature: UC-ISS-04
priority: P1
type: edge_case
tier: visible
scope: task
test_tier: e2e
ac_ref: AC-4
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
    - "No new issue files, the summary names the closed issue, and the cell's release effect is unchanged."
  must_not_observe:
    - "A nightly re-file of a failure a person declined."
negative_control:
  would_fail_if:
    - "A finding whose bot-authored issue was closed as not planned files again on the next run."
    - "Closing the issue as not planned changes the cell's release effect."
evidence:
  artifact_type: grade-file
  required_capture: true
---

# A person's decline stays decided

The maintainer closes a filed issue as not planned. The next nights file nothing for that failure, and each summary says which issue silenced it, so the silence stays visible. The release still holds if the result says it should.
