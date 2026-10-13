---
flow_id: FLOW-GRD-06-REJECTED-KEY
service: harness-eval
feature: UC-GRD-06
priority: P1
type: error_handling
tier: holdout
scope: task
test_tier: e2e
---

# A provider 401 fails the run even though a key was present

OpenCode starts with an API key present, and the provider rejects it with HTTP 401. OpenCode pinned and OpenCode newest are not pass. The recorded reason is an authentication rejection, not a product-grade pass. Command list, status, verify, and first-turn are not filled in as pass after the 401. A wrapper that exits 0 after ignoring the 401 does not change the result. The other harnesses are not marked failed only because OpenCode was rejected.
