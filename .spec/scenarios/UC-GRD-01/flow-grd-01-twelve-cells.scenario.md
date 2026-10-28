---
flow_id: FLOW-GRD-01-TWELVE-CELLS
service: harness-eval
feature: UC-GRD-01
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
    - A finished run has results for Claude Code, Codex, Grok, OpenCode, Pi, and Cursor, each on pinned and newest.
  must_not_observe:
    - A pass taken from process exit code 0 alone.
negative_control:
  would_fail_if:
    - The summary is only readable through a navigable product screen and the reader still reports twelve complete cells (violates T-GRD-004).
    - A summary missing any cell, any verdict word, or any observed CLI version still passes the reader check.
evidence:
  artifact_type: grade-file
  required_capture: true
---

# Twelve cells read pass, fail, or could-not-run with no screenshot score

A finished run has results for Claude Code, Codex, Grok, OpenCode, Pi, and Cursor, each on pinned and newest. The reader shows twelve cells. Every cell is one of pass, fail, or could-not-run. In this run Claude Code pinned is pass, Codex newest is fail, and Pi pinned is could-not-run, and those are the words the reader shows. The reader has no screenshot score, no pixel percentage, and no image-diff field. A screenshot path left in a harness log does not add a score column. The twelve cells are the only scores. The reader reads the summary artifact alone; no product screen or UI session exists in this flow.
