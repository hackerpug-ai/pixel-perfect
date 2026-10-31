---
flow_id: FLOW-ISS-01-CHECK-UNDER-AGGREGATE
service: harness-eval
feature: UC-ISS-01
priority: P1
type: edge_case
tier: holdout
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
    - "An issue for the failing check, with its harness and reason, even though the cell's aggregate reads could-not-run."
  must_not_observe:
    - "Only an issue about the cell's could-not-run reason."
negative_control:
  would_fail_if:
    - "A cell whose aggregate reads could-not-run hides a `verify` check reading `fail`, and no graded-failure issue files."
evidence:
  artifact_type: grade-file
  required_capture: true
---

# A real failure hidden under a could-not-run cell still files

One cell has a `verify` check that read fail and a `status` check that could not run. The cell's aggregate reads could-not-run, because that order wins. A reader of the aggregate alone would see no failure at all. The maintainer gets both findings: the graded failure and the could-not-run.
