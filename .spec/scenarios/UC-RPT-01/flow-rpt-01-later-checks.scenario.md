---
flow_id: FLOW-RPT-01-LATER-CHECKS
service: harness-eval
feature: UC-RPT-01
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
    - The four main grades pass on every pinned and newest cell.
  must_not_observe:
    - A pass taken from process exit code 0 alone.
negative_control:
  would_fail_if:
    - The opposite input still produces the success result.
evidence:
  artifact_type: grade-file
  required_capture: true
---

# Later checks write reports and do not block the release

The four main grades pass on every pinned and newest cell. The run then does the later checks: a person declines a proposed change, scripted answers are applied, a session is resumed, one full layer is graded, and a plain-language command choice is recorded. Each of the five writes a report the operator can open. In this run the full-layer check fails and the other four pass. The release is not blocked. No release hold is created from the full-layer report. The reports are still there after the release gate opens.
