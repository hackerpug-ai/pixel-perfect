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
    - The verify case for Claude Code pinned names the report path reports/claude-code-pinned-verify.md.
  must_not_observe:
    - A pass taken from process exit code 0 alone.
negative_control:
  would_fail_if:
    - The opposite input still produces the success result.
evidence:
  artifact_type: grade-file
  required_capture: true
---

# A failed verify writes only the report path the case names

The verify case for Claude Code pinned names the report path reports/claude-code-pinned-verify.md. Verify fails because the planted defect DEF-SHIFT-BASELINE is still present. The grader writes that file at that path and nowhere else. The file states the harness Claude Code, the track pinned, and the defect DEF-SHIFT-BASELINE. It does not name a different harness. The grader does not also create reports/verify-failed.md or a timestamped name of its own. The case path is the only new report for this failure.
