---
flow_id: FLOW-GRD-01-EXTRA-HARNESS
service: harness-eval
feature: UC-GRD-01
priority: P1
type: security
tier: holdout
scope: task
test_tier: e2e
---

# A fake harness file does not satisfy one of the six

Someone drops a grade file named claude-code-evil into the run directory with the result pass. The reader does not add a seventh harness. The Claude Code pinned and newest cells are unchanged. The Cursor cells are unchanged. The extra file does not count toward a complete set of twelve. A path written as ../cursor, aimed outside the run directory, is not read as Cursor's result. The Cursor cell stays the file the run wrote inside the run directory.
