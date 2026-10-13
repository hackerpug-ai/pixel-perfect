---
flow_id: FLOW-GRD-03-EXIT-ONE
service: harness-eval
feature: UC-GRD-03
priority: P1
type: boundary
tier: holdout
scope: task
test_tier: e2e
---

# A non-zero exit does not override a file and stream that agree

Codex pinned exits 1. The command-list file says pass, and the event stream says pass, with no denied tool call. The recorded command-list grade is pass. The exit code stays visible beside the grade and does not change it. Cursor newest exits 2 because a wrapper printed a warning, while its four grade files and its stream agree on pass and show no denial. Those four grades stay pass. The wrapper exit code is not copied over them.
