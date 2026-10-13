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
    - Scripted answers are on for a run of all six harnesses.
  must_not_observe:
    - A pass taken from process exit code 0 alone.
negative_control:
  would_fail_if:
    - The opposite input still produces the success result.
evidence:
  artifact_type: grade-file
  required_capture: true
---

# Scripted answers use one resume-with-text path and first checks stay silent

Scripted answers are on for a run of all six harnesses. Claude Code, Codex, Grok, OpenCode, Pi, and Cursor each receive the answer text Use the status command through one resume-with-text path. None of them receive it through a keystroke channel or a private reply API. The command-list check asks no question and consumes no scripted answer. The status check asks no question and consumes no scripted answer. The answer appears only on the later scripted step. The six transcripts name the same path.
