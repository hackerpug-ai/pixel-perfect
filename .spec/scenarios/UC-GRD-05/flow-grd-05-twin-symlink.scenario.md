---
flow_id: FLOW-GRD-05-TWIN-SYMLINK
service: harness-eval
feature: UC-GRD-05
priority: P1
type: security
tier: holdout
scope: task
test_tier: e2e
---

# A symlink from the clean twin back to the defect is tampering

The clean twin's source file is replaced by a symlink to the planted tree's defective file. The link target contains DEF-SHIFT-BASELINE. The grader does not score this as an ordinary product verify failure. It records the twin as tampered or could-not-run and names the symlink. It does not write the usual planted-defect report as if the product had shipped the bug. It does not record a pass either. The planted tree stays a separate fixture with its own grade.
