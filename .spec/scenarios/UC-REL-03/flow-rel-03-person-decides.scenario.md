---
flow_id: FLOW-REL-03-PERSON-DECIDES
service: harness-eval
feature: UC-REL-03
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
    - A real newest-failure PR is merged by a person and a second is rejected, with receipts and an independent pinned block preserved.
  must_not_observe:
    - A pass taken from process exit code 0 alone.
negative_control:
  would_fail_if:
    - The opposite input still produces the success result.
evidence:
  artifact_type: grade-file
  required_capture: true
---

# A reachable newest fix reaches a real human decision

Use a controlled repository with the real workflow and heal app. Produce an OpenCode newest evaluated verify failure by an actual missed atoms/Button/default detection; correct detection is not the failure. Pin and record the real versions, repair base, and actual source defect. Reproduce on current main, generate an allowlisted patch with the direct Claude CLI, and require the exact patch confirmation to pass. The app creates a real PR with OpenCode, newest, verify, original report, and confirmation links.

A person follows the Actions summary link in GitHub, inspects the evidence and diff, and merges the first PR. Repeat with a distinct real PR and have the person close it without merging. Capture run URLs, both PR URLs/head SHAs, actor identities, timestamps, and merged versus closed-unmerged receipts. Keep an independent Claude Code pinned failure observable; neither decision alone clears it or publishes a release. A pinned-only failure must not create either PR. This is the T-REL-013 human gate; automated assertions cannot replace the person's two observations.
