---
flow_id: FLOW-ISS-02-UNKNOWN-NOT-GUESSED
service: harness-eval
feature: UC-ISS-02
priority: P1
type: edge_case
tier: holdout
scope: task
test_tier: e2e
ac_ref: AC-5
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
    - "A cell with no observed CLI version reads `not observed`, and the `Workaround exists?` field reads `unknown`."
  must_not_observe:
    - "A pinned version standing in for one nobody observed."
negative_control:
  would_fail_if:
    - "The issue prints `2.1.291` for a cell whose `observed_cli_version` is null."
    - "`Reachable for follow-up` or `Workaround exists?` carries a value nobody supplied."
evidence:
  artifact_type: grade-file
  required_capture: true
---

# A value nobody knows stays unknown

A cell could not install, so it has no observed CLI version and no digest. The issue says so. It does not fill the gap with the pinned value or a guess, because a fixer will trust whatever the issue states.
