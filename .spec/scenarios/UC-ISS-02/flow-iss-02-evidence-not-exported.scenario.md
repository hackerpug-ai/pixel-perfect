---
flow_id: FLOW-ISS-02-EVIDENCE-NOT-EXPORTED
service: harness-eval
feature: UC-ISS-02
priority: P0
type: edge_case
tier: visible
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
    - "The issue names an evidence artifact whose digest matches the GitHub API and whose named paths exist, or it reads `not exported` and names none."
  must_not_observe:
    - "A path in an issue that nobody can open."
negative_control:
  would_fail_if:
    - "The issue cites `cell/evidence/...` paths from a run that uploaded only `cell.json`, as run 41140522995 did."
    - "A capture containing the cell's own key value is uploaded instead of being withheld."
evidence:
  artifact_type: grade-file
  required_capture: true
---

# An issue never points at evidence that died with the runner

Download the evidence using only the values in the issue. When the run exported evidence, the artifact downloads and the paths resolve. When it did not, the issue says so plainly. A capture holding the key the model step used is withheld, and the cell records that it was.
