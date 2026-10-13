---
flow_id: FLOW-GRD-03-SYMLINK-FILE
service: harness-eval
feature: UC-GRD-03
priority: P1
type: security
tier: holdout
scope: task
test_tier: e2e
---

# A symlink or an outside grade path is not accepted as this run

The status path for Claude Code pinned is a symlink to an older run's pass file. The grader refuses the symlink and does not record pass. A second path points at ../../other-run/pass.json, outside this run directory. That path is rejected and is not read as this run's result. This run's event stream shows a denied tool call on the command-list check. The command-list grade stays fail. Neither planted path replaces the stream.
