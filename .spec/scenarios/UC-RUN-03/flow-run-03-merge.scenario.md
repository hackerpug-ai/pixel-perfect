---
flow_id: FLOW-RUN-03-MERGE
service: harness-eval
feature: UC-RUN-03
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
    - A pull request edits a plugin command file and an adapter file.
  must_not_observe:
    - A pass taken from process exit code 0 alone.
negative_control:
  would_fail_if:
    - The opposite input still produces the success result.
evidence:
  artifact_type: grade-file
  required_capture: true
---

# A plugin merge to main starts a grade and a pull request does not

A pull request edits a plugin command file and an adapter file. While that pull request is open, no grade starts. The pull request is merged to main at its recorded full commit SHA. A checkout-mode grade run starts for that exact SHA and records the trigger as a plugin change on main. The run uses the same six harnesses as the nightly grade. A second pull request that edits the same plugin file does not start a grade before it is merged. Pushing more commits onto the unmerged pull request still does not start a grade.

Observe loaded plugin revision and content digest equal to that commit, not the latest published release. T-RUN-010 is separately verified by FLOW-RUN-03-TRUNK-HISTORY, not by this trigger.
