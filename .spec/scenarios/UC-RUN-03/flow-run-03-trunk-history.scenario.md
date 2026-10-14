---
flow_id: FLOW-RUN-03-TRUNK-HISTORY
service: harness-eval
feature: UC-RUN-03
priority: P1
type: boundary
tier: holdout
scope: task
test_tier: process
---

# Accepted contributions and sprint tracking prove trunk policy

Treat T-RUN-010 as a process/history gate. At acceptance, name the authoritative sprint tracker and record its revision/hash, list accepted contribution SHAs, and record the acceptance main SHA. Verify every accepted SHA is an ancestor of that main SHA, and inspect the tracker for absence of per-sprint PR sequencing. An accepted contribution outside main or a sprint entry requiring its own PR fails. A plugin-trigger workflow run alone cannot satisfy this gate. Preserve source-history and tracker receipts; no synthetic harness run is required.
