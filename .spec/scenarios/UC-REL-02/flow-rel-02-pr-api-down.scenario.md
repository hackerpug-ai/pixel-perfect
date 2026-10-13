---
flow_id: FLOW-REL-02-PR-API-DOWN
service: harness-eval
feature: UC-REL-02
priority: P1
type: error_handling
tier: holdout
scope: task
test_tier: e2e
---

# A 500 while opening the fix request stays a warning and does not publish

Grok newest fails the command-list grade, and every pinned grade passes. The run tries to open a fix pull request, and the host returns HTTP 500. No pull request exists afterward. The run records the warning and does not convert the newest failure into a pinned block. The run does not publish. The 500 is visible on the run as a pull-request error. A later retry would be a separate action and is not created by this failed call.
