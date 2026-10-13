---
flow_id: FLOW-GRD-06-KEY-IN-LOG
service: harness-eval
feature: UC-GRD-06
priority: P1
type: security
tier: holdout
scope: task
test_tier: e2e
---

# A key in a comment or a neighboring env is not borrowed

Claude Code has a real key in the environment, and Codex has none. The Codex failure report and the event log do not contain Claude Code's key. A pull request comment includes a line labeled as a Codex key and asks the grader to use it. The grader does not take a key from pull request text, and Codex stays a failed run. A repo file secrets.txt that holds a key is not opened to fill the gap. The Codex log says the key is missing and does not quote the comment or the file.
