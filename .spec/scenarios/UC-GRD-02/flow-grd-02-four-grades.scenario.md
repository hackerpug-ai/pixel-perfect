---
flow_id: FLOW-GRD-02-FOUR-GRADES
service: harness-eval
feature: UC-GRD-02
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
    - The reader opens the Claude Code pinned result.
  must_not_observe:
    - A pass taken from process exit code 0 alone.
negative_control:
  would_fail_if:
    - The opposite input still produces the success result.
evidence:
  artifact_type: grade-file
  required_capture: true
---

# Four grades are readable and the first checks ask nothing

The reader opens the Claude Code pinned result. It shows a command-list grade, a status grade, a verify grade for the planted defect, and a first-turn grade for asking before expensive work. In this run the command list passes, status passes, verify fails because the planted defect is still present, and the first-turn grade passes because the harness asked before the expensive edit. The command-list transcript contains no question to the person. The status transcript contains no question. Those first checks do not consume a scripted answer.
