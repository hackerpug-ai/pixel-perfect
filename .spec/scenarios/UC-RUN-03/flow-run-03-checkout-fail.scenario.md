---
flow_id: FLOW-RUN-03-CHECKOUT-FAIL
service: harness-eval
feature: UC-RUN-03
priority: P1
type: error_handling
tier: holdout
scope: task
test_tier: e2e
---

# A failed checkout of the merge does not become a pass

A merge that changes the plugin lands on main. The grader receives the merge SHA, then the checkout fails because the object store returns an error. The run is recorded as failed to start, with that SHA and the checkout error. No harness is marked pass. The release gate does not treat the merge as graded clean. A later successful run of a newer SHA is a separate run id and does not rewrite the failed checkout into a pass.
