---
flow_id: FLOW-GRD-04-PATH-ESCAPE
service: harness-eval
feature: UC-GRD-04
priority: P1
type: security
tier: holdout
scope: task
test_tier: e2e
---

# Unsafe report paths fail before writing

Set the case path to reports/../../outside/stolen.json; separately place a symlink in its parent path. The real case loader rejects both as invalid-case-path/could-not-run before verification starts. Nothing is written outside the invocation directory, no sanitized substitute is used, release is blocked, and no fix is opened. An ordinary confined case path succeeds as a control.
