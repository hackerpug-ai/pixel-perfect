---
flow_id: FLOW-GRD-02-EXTRA-COMMAND
service: harness-eval
feature: UC-GRD-02
priority: P1
type: boundary
tier: holdout
scope: task
test_tier: e2e
---

# One unexpected command fails the list and leaves the other three

OpenCode pinned lists every expected command plus one command that is not on the list, named pixel-perfect.secret-dump. The command-list grade is fail. Status, verify, and the first-turn grade are still recorded on that same row. A pass on status does not flip the command-list grade to pass. The extra name is visible in the grade detail. The row still has four separate grades rather than one combined score.
