---
flow_id: FLOW-GRD-04-UNWRITABLE-DIR
service: harness-eval
feature: UC-GRD-04
priority: P1
type: error_handling
tier: holdout
scope: task
test_tier: e2e
---

# Unwritable report storage cannot select a fallback

Make the invocation report parent genuinely read-only for the evaluator's runtime user. Actual report creation fails. Record report-unavailable/could-not-run, refuse release, and open no repair PR for this storage failure. No file appears in the working-directory root or /tmp as a substitute. Restore write permission in a fresh invocation and require its exact case report to persist successfully.
