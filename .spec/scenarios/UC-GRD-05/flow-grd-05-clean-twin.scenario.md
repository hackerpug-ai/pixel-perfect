---
flow_id: FLOW-GRD-05-CLEAN-TWIN
service: harness-eval
feature: UC-GRD-05
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
    - The planted tree for Grok pinned contains defect atoms/Button/default.
  must_not_observe:
    - A pass taken from process exit code 0 alone.
negative_control:
  would_fail_if:
    - The opposite input still produces the success result.
evidence:
  artifact_type: grade-file
  required_capture: true
---

# The clean twin passes and retains its own report

The planted tree for Grok pinned contains defect atoms/Button/default. The clean twin is that same tree with the defect removed. Verify runs on the clean twin for Grok pinned. The verify grade is pass. The evaluator retains the twin's case-declared reports/verify-clean.json, distinct from the planted invocation's report. Correct planted detection in the other invocation does not change the twin's pass; the pair earns evaluation pass. The twin result names the clean fixture as what was verified.
