---
flow_id: FLOW-RUN-03-DOCS-ONLY
service: harness-eval
feature: UC-RUN-03
priority: P1
type: boundary
tier: holdout
scope: task
test_tier: e2e
---

# A docs-only merge starts nothing and the same SHA starts once

A merge to main changes only the landing-page README and a screenshot. No grade starts, because no plugin file changed. A later merge changes one plugin command file and the README together. Exactly one grade run starts for that merge SHA. A mirror remote delivers the same SHA a second time. That duplicate delivery does not start another grade. The run list shows a single post-merge run for that SHA.
