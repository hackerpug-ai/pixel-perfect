---
flow_id: FLOW-GRD-03-EVENT-COVERAGE
service: harness-eval
feature: UC-GRD-03
priority: P1
type: boundary
tier: holdout
scope: task
test_tier: e2e
---

# All required stream facts are qualified per version

For every harness and each resolved version retain real captures and a mapping table for incremental text, question-tool start, expensive-tool start, required-read denial, session identity, and completion. Demonstrate a denied required read even when the real process exits 0; its evaluation fails. Truncate a real captured stream and remove a required mapping in separate negative controls: the affected check is could-not-run. Final reply output or opaque harness_specific records cannot establish first-question ordering. Raw original_event bytes and offsets remain lossless.
