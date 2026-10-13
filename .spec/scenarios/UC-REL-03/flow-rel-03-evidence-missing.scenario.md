---
flow_id: FLOW-REL-03-EVIDENCE-MISSING
service: harness-eval
feature: UC-REL-03
priority: P1
type: error_handling
tier: holdout
scope: task
test_tier: e2e
---

# Deleted evidence stays missing and is not replaced with a made-up excerpt

A fix pull request names Codex, the status grade, and reports/codex-pinned-status.md. Before a person reads it, that report is deleted from the run archive. The pull request still names Codex and the status grade. The evidence line is shown as missing. The body does not grow a fabricated log excerpt. The grader does not retarget the pull request at a different file that says pass. A person can still close the pull request, and the missing file remains the error they see.
