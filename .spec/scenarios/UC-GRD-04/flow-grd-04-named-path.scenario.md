---
flow_id: FLOW-GRD-04-NAMED-PATH
service: harness-eval
feature: UC-GRD-04
priority: P0
type: happy_path
tier: visible
scope: task
test_tier: e2e
ac_ref: AC-1
start_state:
  description: A clean checkout and an empty run list for this flow.
  seed_method: public_workflow
  records: []
action:
  actor: github_actions
  steps:
    - Run the harness-eval workflow for this use case on a real runner.
end_state:
  must_observe:
    - Both case-declared reports match the invocation and observed evidence, including on evaluation pass.
  must_not_observe:
    - A pass taken from process exit code 0 alone.
negative_control:
  would_fail_if:
    - The opposite input still produces the success result.
evidence:
  artifact_type: grade-file
  required_capture: true
---

# Exact case paths retain planted and clean evidence

The case loader binds reports/verify-button-drift.json and reports/verify-clean.json inside their separate invocation directories before launch. Real verify observes atoms/Button/default in the planted project and passes the clean twin. The key, source event offsets, capture hashes, harness, track, and invocation ID agree with actual evidence. The evaluator writes and retains both reports even though the verify evaluation passes. The summary links their invocation-specific artifact paths.

Place an unrelated new note and an old report in the work area. Neither satisfies the contract. Suppress observed detection while retaining the expected key in case metadata: evaluation must fail for missed-defect. Delete or swap the produced report: acceptance must fail. No alternative filename is discovered or invented.
