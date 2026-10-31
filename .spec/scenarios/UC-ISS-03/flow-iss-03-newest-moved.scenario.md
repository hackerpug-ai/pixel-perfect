---
flow_id: FLOW-ISS-03-NEWEST-MOVED
service: harness-eval
feature: UC-ISS-03
priority: P1
type: edge_case
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
    - "The proof prints a newest CLI version different from the one in `## Evidence`, and the issue says the pass does not isolate the fix."
  must_not_observe:
    - "A newest pass reported as proof of the fix while the CLI also moved."
negative_control:
  would_fail_if:
    - "The proof omits the observed CLI version, so a CLI release that fixed the failure upstream reads as the fixer's fix."
evidence:
  artifact_type: grade-file
  required_capture: true
---

# A pass on a moved CLI does not isolate the fix

A newest-track failure is fixed, and the new run also resolves a newer CLI. The check passes, but two things changed. The issue tells the closer to say so rather than crediting the fix alone.
