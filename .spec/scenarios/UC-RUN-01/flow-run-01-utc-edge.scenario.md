---
flow_id: FLOW-RUN-01-UTC-EDGE
service: harness-eval
feature: UC-RUN-01
priority: P1
type: boundary
tier: holdout
scope: task
test_tier: e2e
---

# Local 06:17 and the edges of the UTC minute do not double-start

The host timezone is US Pacific. At 06:17 Pacific, which is 13:17 UTC, the nightly grade does not start. At 06:16:59 UTC the grade does not start. At 06:17:00 UTC it starts once. A second clock reading at 06:17:59 UTC does not start another nightly for the same UTC date. The run list shows one nightly run id for that date from the schedule. The next date at 06:17:00 UTC starts a different run id.
