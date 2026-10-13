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
    - Verify failed on OpenCode pinned for DEF-STALE-ADAPTER.
  must_not_observe:
    - A pass taken from process exit code 0 alone.
negative_control:
  would_fail_if:
    - The opposite input still produces the success result.
evidence:
  artifact_type: grade-file
  required_capture: true
---

# The fix request names the harness, grade, and evidence, and a merge leaves the block

Verify failed on OpenCode pinned for DEF-STALE-ADAPTER. The fix pull request names the harness OpenCode, the grade verify, and the evidence path reports/opencode-pinned-verify.md. A person can merge it, and a person can close it without merging. In this run the person merges it. The pinned release block remains after the merge. The merge does not publish the release. The evidence path is the failing run's report, not a summary with no path.
