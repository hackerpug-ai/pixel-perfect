---
flow_id: FLOW-REL-01-PINNED-BLOCK
service: harness-eval
feature: UC-REL-01
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
    - Claude Code pinned fails verify on DEF-SHIFT-BASELINE.
  must_not_observe:
    - A pass taken from process exit code 0 alone.
negative_control:
  would_fail_if:
    - The opposite input still produces the success result.
evidence:
  artifact_type: grade-file
  required_capture: true
---

# A pinned verify failure blocks release despite exit 0 and an open fix

Claude Code pinned fails verify on DEF-SHIFT-BASELINE. Claude Code newest passes. The release job for the next version starts after the grader process has exited 0. A fix pull request for the verify failure is already open. The release stays blocked. No release artifact is published. The open pull request is visible and is not a clearance. Seeing exit 0 on the grader does not remove the block.
