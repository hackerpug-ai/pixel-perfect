---
flow_id: FLOW-GRD-05-AFTER-PLANTED-FAIL
service: harness-eval
feature: UC-GRD-05
priority: P1
type: boundary
tier: holdout
scope: task
test_tier: e2e
---

# A planted failure in the same process does not sink the twin

Verify fails on the planted tree for OpenCode newest and writes reports/opencode-newest-verify.md for DEF-STALE-ADAPTER. The same process then verifies the clean twin, which does not contain that defect. The twin's verify grade is pass. The planted report is not rewritten to say the twin failed. The twin does not get a failure report. A second clean twin, for Cursor, is not compared with OpenCode's defect file. Cursor's twin is graded only from Cursor's own tree.
