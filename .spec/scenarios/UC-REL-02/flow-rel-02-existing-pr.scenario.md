---
flow_id: FLOW-REL-02-EXISTING-PR
service: harness-eval
feature: UC-REL-02
priority: P1
type: boundary
tier: holdout
scope: task
test_tier: e2e
---

# The same newest failure on the next day does not open a second fix

Pi newest failed yesterday, and a fix pull request for that status failure is already open. Today's run fails only Pi newest on status, and every pinned grade passes. The run records a warning. It does not open a second pull request for the same harness, track, and grade. The existing pull request stays unmerged. The run does not publish. The pinned release gate stays clear.
