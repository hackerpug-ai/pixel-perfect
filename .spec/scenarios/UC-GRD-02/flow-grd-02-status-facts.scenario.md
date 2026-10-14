---
flow_id: FLOW-GRD-02-STATUS-FACTS
service: harness-eval
feature: UC-GRD-02
priority: P1
type: boundary
tier: holdout
scope: task
test_tier: e2e
---

# Generic status cannot satisfy factual status

Create two real valid project fixtures with recorded web-desktop platform, phase, gate state, and nonzero inventory counts. Change one valid phase/gate fact between them. Invoke real status on each and require observed facts matching its own fixture plus unchanged protected hashes. Generic acknowledgment, empty reply, or repeating the first fixture facts on the second fails. Keep expected values outside the observed output oracle; case metadata cannot count as a reply.
