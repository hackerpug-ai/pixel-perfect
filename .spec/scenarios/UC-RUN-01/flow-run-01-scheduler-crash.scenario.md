---
flow_id: FLOW-RUN-01-SCHEDULER-CRASH
service: harness-eval
feature: UC-RUN-01
priority: P1
type: error_handling
tier: holdout
scope: task
test_tier: e2e
---

# Delayed or absent Actions runs cannot refresh evidence

The legacy flow ID is retained; there is no local scheduler to kill. Inspect real Actions history during a missed/delayed observation interval or disable the schedule in a disposable repository, retaining the actual configuration and history. No run means no grade, synthetic success, or invented missed-tick record. Use an actual checkout evaluation older than 36 hours: release dry-run refuses stale evidence. Start a real manual checkout run and require its new trusted completed result before authorization returns. Do not alter the host clock or substitute local JSON for GitHub history.
