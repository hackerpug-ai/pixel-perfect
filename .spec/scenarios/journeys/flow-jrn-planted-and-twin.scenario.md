---
flow_id: FLOW-JRN-PLANTED-AND-TWIN
service: harness-eval
feature: journey
priority: P0
type: happy_path
tier: visible
scope: journey
covers_ucs: [UC-GRD-04, UC-GRD-05]
test_tier: e2e
---

# Planted defect and clean twin

Verify runs on a planted tree for Claude Code pinned and fails on DEF-SHIFT-BASELINE. The report appears only at reports/claude-code-pinned-verify.md, the path the case names. The file states Claude Code, pinned, and that defect. The grader does not add a filename of its own. The clean twin of the same tree, which does not contain the defect, then runs verify. The twin's verify grade is pass. No failure report is written for the twin, and the planted report is not rewritten to blame the twin.
