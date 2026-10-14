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

# Use UTC cron and actual run identities

Read the deployed cron 17 6 * * * and actual GitHub schedule metadata. Change the test observer's display timezone without changing the workflow; the requested UTC schedule remains unchanged. Preserve distinct run IDs and attempts for actual deliveries rather than asserting that host clock reads launch jobs. A delayed delivery may start outside the requested minute. A second observer reading the same run must not create a second evaluation record. A manual run remains a distinct event and cannot be relabeled scheduled.
