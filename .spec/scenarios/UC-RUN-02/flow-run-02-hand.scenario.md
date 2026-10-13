---
flow_id: FLOW-RUN-02-HAND
service: harness-eval
feature: UC-RUN-02
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
    - A maintainer runs the hand-start command with no harness filter.
  must_not_observe:
    - A pass taken from process exit code 0 alone.
negative_control:
  would_fail_if:
    - The opposite input still produces the success result.
evidence:
  artifact_type: grade-file
  required_capture: true
---

# A hand start grades the same six harnesses and four grades

A maintainer runs the hand-start command with no harness filter. The run grades Claude Code, Codex, Grok, OpenCode, Pi, and Cursor. Each harness is graded on the pinned track and the newest track. Each track records the command-list grade, the status grade, the verify grade on a planted defect, and the first-turn grade about asking before expensive work. The hand-started run id is distinct from any nightly run id. The result set has the same shape a nightly run writes. No seventh harness and no fifth grade appear.
