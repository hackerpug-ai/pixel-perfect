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
    - A real GitHub schedule event records actual timestamps and twelve published-mode cells.
  must_not_observe:
    - A pass taken from process exit code 0 alone.
negative_control:
  would_fail_if:
    - The opposite input still produces the success result.
evidence:
  artifact_type: grade-file
  required_capture: true
---

# Observe an actual published nightly evaluation

Inspect the accepted workflow cron 17 6 * * * on main. Wait for an actual GitHub schedule event and retain its run ID, event metadata, requested schedule, and actual queued/start/completion times. Require published mode and the same run-resolved release revision across twelve cells. Delay relative to 06:17 UTC is not failure by itself. Open and update a real plugin-changing PR in the controlled repository; neither PR event starts a secret-bearing eval. A manual dispatch is labeled manual and cannot substitute for the schedule observation. No exact-second assertion is used.
