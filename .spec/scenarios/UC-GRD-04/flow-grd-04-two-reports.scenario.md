---
flow_id: FLOW-GRD-04-TWO-REPORTS
service: harness-eval
feature: UC-GRD-04
priority: P1
type: boundary
tier: holdout
scope: task
test_tier: e2e
---

# Separate invocations cannot exchange reports

Run the same canonical atoms/Button/default planted case for Pi pinned and Claude Code newest. Each invocation declares reports/verify-button-drift.json relative to its own directory. Both evaluator reports name their actual harness, track, invocation, loaded identity, and source capture hash. Correct detection can pass both evaluations. Swap the bodies or provide a stale report from another attempt: evidence binding fails, even though the defect key and relative filename are equal. No merged report replaces either one.
