---
flow_id: FLOW-REL-05-DRIFT
service: harness-eval
feature: UC-REL-05
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
    - Every live pinned and newest grade in the run is pass.
  must_not_observe:
    - A pass taken from process exit code 0 alone.
negative_control:
  would_fail_if:
    - The opposite input still produces the success result.
evidence:
  artifact_type: grade-file
  required_capture: true
---

# Command, adapter, or question-rule drift refuses a release without looking at pixels

Every live pinned and newest grade in the run is pass. The repo command list has one added command that the release baseline does not have. The release is refused for command drift, and the refusal names the extra command. A second build changes only an adapter id, with live grades all pass, and is also refused. A third build changes only the question-rule text and is refused. None of these checks open a screenshot or compare pixels. A green live grade does not override the drift refusal.
