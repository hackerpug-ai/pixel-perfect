---
flow_id: FLOW-RPT-01-REPORT-DISK
service: harness-eval
feature: UC-RPT-01
priority: P1
type: error_handling
tier: holdout
scope: task
test_tier: e2e
---

# A full disk on the resume report does not block the release

The resume later-check runs and produces a result. Writing its report fails because the report volume is full. The decline, scripted-answer, full-layer, and plain-language checks have already written their reports. The release is not blocked by the resume write error. The resume check is not rewritten as a pass to hide the missing file. The operator can see a report error for resume. The four main grades remain the release signal.
