---
flow_id: FLOW-GRD-06-MISSING-KEY
service: harness-eval
feature: UC-GRD-06
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
    - The Grok tracks start with GROK_API_KEY unset, and no key is passed on the command line.
  must_not_observe:
    - A pass taken from process exit code 0 alone.
negative_control:
  would_fail_if:
    - The opposite input still produces the success result.
evidence:
  artifact_type: grade-file
  required_capture: true
---

# A missing API key fails the run and is not stored as pass

The Grok tracks start with GROK_API_KEY unset, and no key is passed on the command line. Grok pinned and Grok newest are not pass. The run result for Grok is a failure, and the reason says the API key is missing. Harnesses that have their own keys still receive real grades. The overall run is not a pass while Grok has no key. A release gate that reads this run sees a failed Grok run rather than two green cells.
