---
flow_id: FLOW-GRD-01-BAD-LABEL
service: harness-eval
feature: UC-GRD-01
priority: P1
type: error_handling
tier: holdout
scope: task
test_tier: e2e
---

# Skipped, blank, and passed are not shown as pass

Codex pinned writes the result skipped. The reader does not display pass for that cell. The cell is shown as invalid or could-not-run, and the word skipped stays visible to the operator. OpenCode newest writes an empty result. That cell is not pass. Grok pinned writes passed, which is not the token pass, and Grok pinned is not shown as pass. Cells that really contain the token pass stay pass.
