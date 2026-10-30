---
flow_id: FLOW-ISS-04-SECOND-RUN-ADDS-NOTHING
service: harness-eval
feature: UC-ISS-04
priority: P0
type: happy_path
tier: visible
scope: task
test_tier: e2e
ac_ref: AC-1
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
    - "After a second dispatch of the same commit, the issue count and comment count are unchanged, and the receipt lists the finding as unchanged."
  must_not_observe:
    - "A second issue or a repeated comment for one failure on one identity."
negative_control:
  would_fail_if:
    - "Two dispatches of `09547bc` produce two issues or two comments for `could-not-run/requiredness-undeclared`."
    - "A new CLI version on the same commit adds no comment, so a real change goes unnoticed."
evidence:
  artifact_type: grade-file
  required_capture: true
---

# Ten dispatches of one commit are one issue

The development runs dispatched one commit over and over. Each dispatch sees the open issue and the same identity, and adds nothing. A later run on a new commit or a new CLI adds exactly one comment, and that comment does not change the issue's status.
