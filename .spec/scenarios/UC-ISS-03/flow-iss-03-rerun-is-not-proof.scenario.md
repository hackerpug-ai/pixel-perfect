---
flow_id: FLOW-ISS-03-RERUN-IS-NOT-PROOF
service: harness-eval
feature: UC-ISS-03
priority: P0
type: edge_case
tier: holdout
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
    - "After `gh run rerun` of the failing run, the proof's first line prints the failing commit, not the fix commit."
  must_not_observe:
    - "A green rerun accepted as proof."
negative_control:
  would_fail_if:
    - "The issue omits `gh run rerun` from what is not proof."
    - "A rerun's result matches the expected output because the proof never compares `candidate_sha` to the fix commit."
evidence:
  artifact_type: grade-file
  required_capture: true
---

# Rerunning the failed run proves nothing

A fixer lands a fix and reruns the old failed run. GitHub replays the old commit in a new attempt, so the run may even pass for an unrelated reason. The proof catches this on its first line: the evaluated commit is not the fix commit.
