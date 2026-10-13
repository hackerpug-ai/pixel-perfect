---
flow_id: FLOW-GRD-04-TWO-REPORTS
service: harness-eval
feature: UC-GRD-04
priority: P1
type: boundary
tier: holdout
scope: task
test_tier: e2e
---

# Two verify failures keep the two paths and do not swap bodies

In one run, Cursor newest fails verify on DEF-LAYER-GAP, and Pi pinned fails verify on DEF-QUESTION-RULE. The Cursor case names reports/cursor-newest-verify.md. The Pi case names reports/pi-pinned-verify.md. Both files exist at those paths. The Cursor file names Cursor, newest, and DEF-LAYER-GAP, and it does not mention Pi. The Pi file names Pi, pinned, and DEF-QUESTION-RULE, and it does not mention Cursor. There is no third blended file, and neither defect string is turned into a filename.
