---
flow_id: FLOW-ISS-04-MANY-AT-ONCE
service: harness-eval
feature: UC-ISS-04
priority: P1
type: boundary
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
    - "Five issues in priority order, with pinned graded failures first, and one roll-up issue listing the rest."
  must_not_observe:
    - "A sixth new issue in one attempt."
negative_control:
  would_fail_if:
    - "A run with twelve distinct findings opens twelve issues."
    - "A could-not-run takes one of the five slots while a pinned graded failure waits in the roll-up."
evidence:
  artifact_type: grade-file
  required_capture: true
---

# Everything breaking at once does not flood the repository

A runner image change breaks most cells at once, with many distinct reasons. The run files five issues, most serious first, and one roll-up names the rest. The next run files more as the first ones stay open, and comments on the open roll-up rather than opening another.
