---
flow_id: FLOW-RPT-02-RESUME-TEXT
service: harness-eval
feature: UC-RPT-02
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
    - A second process continues the persisted native conversation using context absent from the answer.
  must_not_observe:
    - A pass taken from process exit code 0 alone.
negative_control:
  would_fail_if:
    - The opposite input still produces the success result.
evidence:
  artifact_type: grade-file
  required_capture: true
---

# Resume the same persisted conversation in a second process

For each real harness, start a later check in an isolated persistent session directory. Establish a session-specific context fact and record the question header, native session ID, and fixture identity. Stop the first process after persistence, then resume with one matching plain-text answer that does not repeat the context fact. Require a separate process, the same native conversation, and a continuation that uses the earlier fact correctly. Pi must omit --no-session here. Capture argv, session paths/IDs, process IDs, and real streams before cleanup. Unsupported version-specific resume stays could-not-run, report-only.

Delete the stored session before a separate resume trial: the result must be could-not-run, never a newly created conversation reported as resumed. List/status/verify remain ask-nothing and the independent must-ask probe receives no answer. None uses this later answer channel.
