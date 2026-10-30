---
flow_id: FLOW-ISS-01-REAL-RUN-FILES
service: harness-eval
feature: UC-ISS-01
priority: P0
type: happy_path
tier: visible
scope: task
test_tier: e2e
ac_ref: AC-2
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
    - "One open issue titled `harness-eval: could-not-run (requiredness-undeclared)` lists the claude-code pinned cell plus `status` and `verify` on both tracks."
  must_not_observe:
    - "An issue naming `cursor` or an adapter-pending harness."
negative_control:
  would_fail_if:
    - "Run 41140522995's `requiredness-undeclared` rows produce no issue, or one issue per row instead of one for the reason."
    - "`installation-identity-mismatch`, which appears only on the claude-code newest cell, produces no issue."
evidence:
  artifact_type: grade-file
  required_capture: true
---

# A real run with unexpected could-not-run results files one issue per reason

Dispatch the real workflow on main with a real evaluator defect present, as run 41140522995 had. When the run finishes, the issue job files on its own with nobody present. Each distinct reason becomes one issue that lists every affected row. A reason carried only on a cell, and on no check, still files. The ten cells on the expected list file nothing. Read the issue list and the run summary together; they agree.
