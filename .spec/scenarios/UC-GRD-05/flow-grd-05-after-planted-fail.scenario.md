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

# A planted observation does not contaminate the clean invocation

Run real verify in separate fresh invocation directories for OpenCode newest planted and clean fixtures. Correctly observe atoms/Button/default only in the planted case and retain reports/verify-button-drift.json there. The clean invocation passes and retains reports/verify-clean.json with clean outcome. The pair earns evaluation pass. Neither report overwrites the other. Swap evidence between these invocations, or between OpenCode and Cursor: report identity validation fails. No shared process/session state may substitute for independent fixture evidence.
