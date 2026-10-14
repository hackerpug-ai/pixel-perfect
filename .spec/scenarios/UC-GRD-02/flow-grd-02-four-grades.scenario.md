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
    - All four grades have independent positive evidence, and correct planted detection earns evaluation pass.
  must_not_observe:
    - A pass taken from process exit code 0 alone.
negative_control:
  would_fail_if:
    - The opposite input still produces the success result.
evidence:
  artifact_type: grade-file
  required_capture: true
---

# Four distinct grades use positive evidence

Run real Claude Code pinned against the case fixtures. Command listing contains all public commands with no model call. Status reports the seeded platform, phase, gates, and inventory counts without mutation. Structural-only verify detects atoms/Button/default in the planted project and passes the clean twin; both exact case-declared reports exist with source evidence. This earns verify evaluation pass despite the planted oracle exit 1. Independently, init on the empty project reaches a valid first USER_CHOICE before expensive work, and is stopped without an answer. List, status, and verify ask nothing and no first check consumes a scripted answer.

Negative controls: generic status text fails; a missed defect or clean false positive fails verify; no question or an expensive tool start before the question fails the must-ask probe. A missing required event mapping is could-not-run rather than an invented pass.
