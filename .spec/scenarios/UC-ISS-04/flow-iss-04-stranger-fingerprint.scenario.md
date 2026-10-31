---
flow_id: FLOW-ISS-04-STRANGER-FINGERPRINT
service: harness-eval
feature: UC-ISS-04
priority: P0
type: security
tier: holdout
scope: task
test_tier: e2e
ac_ref: AC-6
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
    - "The run files the issue as if the stranger's issue and comment did not exist."
  must_not_observe:
    - "A finding silenced by an issue the filer did not write."
negative_control:
  would_fail_if:
    - "A person's issue with the line `Fingerprint: could-not-run/requiredness-undeclared`, closed as not planned, stops the filer."
    - "A person's comment with a matching `Identity:` line stops the filer from commenting."
evidence:
  artifact_type: grade-file
  required_capture: true
---

# A stranger cannot silence a finding

This repository is public. A stranger opens an issue carrying a real fingerprint, closes it as not planned, and comments a matching identity on another issue. None of it counts, because only issues and comments authored by the workflow's own identity are read.
