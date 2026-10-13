---
flow_id: FLOW-RUN-01-NIGHTLY
service: harness-eval
feature: UC-RUN-01
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
    - The scheduler is set for 06:17 UTC and the clock reaches 06:17:00 UTC on a Tuesday.
  must_not_observe:
    - A pass taken from process exit code 0 alone.
negative_control:
  would_fail_if:
    - The opposite input still produces the success result.
evidence:
  artifact_type: grade-file
  required_capture: true
---

# Nightly grade starts at 06:17 UTC and a pull request does not

The scheduler is set for 06:17 UTC and the clock reaches 06:17:00 UTC on a Tuesday. The nightly grade starts and records a run id for that UTC minute. The run includes the six harnesses on both the pinned and newest tracks. At 14:03 UTC the same day, a pull request is opened that edits a plugin command file. That pull request does not start a grade run, and the only run id so far is the 06:17 run. Updating the pull request with another commit still does not start a grade. The next scheduled start is the following day at 06:17 UTC, and that start gets a new run id.
