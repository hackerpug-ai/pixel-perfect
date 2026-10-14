---
flow_id: FLOW-REL-01-PUBLISHED-HOLD
service: harness-eval
feature: UC-REL-01
priority: P1
type: boundary
tier: holdout
scope: task
test_tier: e2e
---

# A published failure needs subsequent candidate proof

Produce a real published pinned failure, or could-not-run on either track. A checkout pass completed before this observation cannot clear the compatibility hold. A later published pass, newest-fix merge, and successful later report also cannot clear it. Run a complete passing checkout for the exact publish commit starting after the published blocker completes; the real resolver can clear the hold only with that authoritative result within 36 hours and clear local drift. Preserve the original blocking run and the clearing run linkage.

Boundary controls: include a published run created before checkout starts but completing at or after that start; its blocking result must hold release, including equal timestamps. Missing relevant result/job history refuses release. Expired artifacts for published evaluations completed strictly before a later qualifying checkout do not create a permanent hold or require indefinite retention.
