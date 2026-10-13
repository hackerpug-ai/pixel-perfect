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

# A report path that climbs out of the run directory is refused

The verify case names the report path reports/../../outside/stolen.md. Verify has failed for Pi pinned on defect DEF-QUESTION-RULE. The grader does not write outside/stolen.md or any file above the run directory. It does not rewrite the escape into reports/stolen.md and call that the named path. The reporting step fails closed. The verify grade stays fail. The harness and defect are not saved under a filename the grader chose.
