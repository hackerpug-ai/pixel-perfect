---
flow_id: FLOW-RPT-01-DOES-NOT-CLEAR-PINNED
service: harness-eval
feature: UC-RPT-01
priority: P1
type: boundary
tier: holdout
scope: task
test_tier: e2e
---

# Passing later checks do not lift an existing pinned verify block

Claude Code pinned has already failed verify, so the release is already blocked. The five later checks then all report pass: decline a change, scripted answers, resume, one full layer, and a plain-language command choice. Each report is readable and says pass. The pinned verify block remains. Those reports do not publish the release. They do not edit the verify grade to pass.
