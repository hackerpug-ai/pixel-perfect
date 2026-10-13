---
flow_id: FLOW-REL-04-COULD-NOT-RUN
service: harness-eval
feature: UC-REL-04
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
    - Pi newest ends as could-not-run because the harness never wrote a grade file.
  must_not_observe:
    - A pass taken from process exit code 0 alone.
negative_control:
  would_fail_if:
    - The opposite input still produces the success result.
evidence:
  artifact_type: grade-file
  required_capture: true
---

# could-not-run blocks either track and opens no fix, including Cursor

Pi newest ends as could-not-run because the harness never wrote a grade file. The release is blocked. No fix pull request is opened for Pi. In a second run every harness completes except Cursor pinned, which is could-not-run. The release is blocked again. No fix pull request is opened for Cursor. Cursor is not exempt on that cell. Both runs show a block and zero fix pull requests opened from the could-not-run result.
