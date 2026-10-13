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

# A read-only report directory does not get a fallback filename

Verify fails for Codex newest on the planted defect DEF-STALE-ADAPTER. The case names reports/codex-newest-verify.md, and the reports directory cannot be created because the parent is read-only. The run marks the reporting step failed. No file appears at ./codex-newest-verify.md or /tmp/verify.md. The defect id is not used as a filename. The grade remains a verify failure plus a reporting error. A search of the run directory finds no report name the grader invented.
