---
flow_id: FLOW-GRD-03-FILES-AND-STREAM
service: harness-eval
feature: UC-GRD-03
priority: P0
type: happy_path
tier: visible
scope: task
test_tier: e2e
ac_ref: AC-1
start_state:
  description: A clean checkout and an empty run list for this flow.
  seed_method: public_workflow
  records: []
action:
  actor: github_actions
  steps:
    - Run the harness-eval workflow for this use case on a real runner.
end_state:
  must_observe:
    - Cursor newest exits 0.
  must_not_observe:
    - A pass taken from process exit code 0 alone.
negative_control:
  would_fail_if:
    - The opposite input still produces the success result.
evidence:
  artifact_type: grade-file
  required_capture: true
---

# Files and the event stream decide, and a denied tool call fails

Cursor newest exits 0. The status grade file says fail, and the event stream for that check contains a denied tool call. The recorded status grade is fail. The exit code is kept as a side fact and is not the grade. Pi pinned also exits 0, its verify file says pass, and its stream shows a denied tool call during verify. That verify grade is fail because of the denial. No grade is pass from exit 0 alone.
