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

# A crashed scheduler at 06:17 does not leave a false pass

The nightly scheduler is killed at 06:17:00 UTC after it has noted the tick and before it has written any harness grade. Five minutes later the operator opens the run list. There is a failed-to-start or missed-tick record, and there is no run marked pass. No harness grade file from that tick contains a pass. A replacement scheduler brought up at 06:19 UTC does not backfill a silent pass for 06:17. The missed tick stays visible until a later grade run actually completes.
