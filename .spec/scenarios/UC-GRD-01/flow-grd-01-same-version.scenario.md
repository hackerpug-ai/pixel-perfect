---
flow_id: FLOW-GRD-01-SAME-VERSION
service: harness-eval
feature: UC-GRD-01
priority: P1
type: boundary
tier: holdout
scope: task
test_tier: e2e
---

# Matching version numbers still leave two tracks

On this date the pinned build and the newest build of Grok are both version 1.4.2. The reader still shows Grok pinned and Grok newest as two cells. A pass on pinned does not hide or overwrite newest. A fail on newest does not change the pinned cell. The shared version string does not remove the track name. No cell is dropped as a duplicate. The Grok result count is two.
