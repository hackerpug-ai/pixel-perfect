---
flow_id: FLOW-GRD-06-KEY-ARRIVES-LATE
service: harness-eval
feature: UC-GRD-06
priority: P1
type: boundary
tier: holdout
scope: task
test_tier: e2e
---

# A key exported after start does not flip the in-flight run

Pi starts with PI_API_KEY unset. The run has already marked Pi pinned as a failed run for the missing key. Thirty seconds later the operator exports PI_API_KEY in the same shell. The in-flight Pi pinned result stays a failure. Pi newest, started in that same run without the key, stays a failure too. A new hand start after the export is a different run id. The first run id still shows the missing-key failure.
