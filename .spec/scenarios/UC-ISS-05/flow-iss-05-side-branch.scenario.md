---
flow_id: FLOW-ISS-05-SIDE-BRANCH
service: harness-eval
feature: UC-ISS-05
priority: P0
type: security
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
    - "A dispatch on a side branch and a cancelled dispatch both make no write call to the issues API."
  must_not_observe:
    - "An issue filed from code that has not landed on main."
negative_control:
  would_fail_if:
    - "A dispatch from a side branch files an issue."
    - "With the job condition removed, the code files anyway instead of refusing the ref."
    - "One of the five cancelled runs at `09547bc` files an issue."
evidence:
  artifact_type: grade-file
  required_capture: true
---

# Only the trusted trigger files

A side branch can carry any workflow text, so its run must not write to the public issue list. Filing runs for this repository on main only, checked in the job condition and again in code. A cancelled run measured nothing and files nothing.
