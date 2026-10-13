---
flow_id: FLOW-GRD-02-TRUNCATED-LIST
service: harness-eval
feature: UC-GRD-02
priority: P1
type: error_handling
tier: holdout
scope: task
test_tier: e2e
---

# A command name cut in half fails only the list grade

The command-list file for Codex newest is cut off mid-name and ends in the token pixel-per. The command-list grade is fail. That broken token is not stored as a real command. The status grade, the verify grade, and the first-turn grade for Codex newest are still present. Their results are the results those checks produced, not blanks copied from the bad list. The reader does not drop the whole Codex newest row because one file was truncated.
