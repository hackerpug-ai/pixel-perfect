---
flow_id: FLOW-REL-02-NEWEST-WARN
service: harness-eval
feature: UC-REL-02
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
    - Cursor newest fails the status grade.
  must_not_observe:
    - A pass taken from process exit code 0 alone.
negative_control:
  would_fail_if:
    - A pinned Cursor failure produces the same warn-and-wait outcome instead of a release block.
    - The fix pull request auto-merges, or the run publishes a release or package despite the newest failure.
evidence:
  artifact_type: grade-file
  required_capture: true
---

# A newest-only failure warns, opens a waiting fix, and does not publish

Cursor newest fails the status grade. Cursor pinned passes, and every pinned grade on the other harnesses passes. The run records a warning that names Cursor, newest, and the status grade. The pinned release gate stays clear. A fix pull request is opened and left for a person, with no auto-merge. The run does not publish a release, a package, or a merged fix. The warning is still visible after the run process exits.
