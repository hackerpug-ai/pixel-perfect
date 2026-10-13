---
flow_id: FLOW-REL-03-MERGE-NEWEST-ONLY
service: harness-eval
feature: UC-REL-03
priority: P1
type: boundary
tier: holdout
scope: task
test_tier: e2e
---

# Merging the newest fix leaves a different harness's pinned block

One pull request is the newest warning for Cursor status. It names Cursor, the status grade, and reports/cursor-newest-status.md. A separate block exists because Claude Code pinned failed verify. A person merges only the Cursor pull request. That merge succeeds. The Claude Code pinned block remains. The merged Cursor request does not gain a line saying the release block is cleared. The merge publishes no release, and Claude Code's verify evidence is unchanged.
