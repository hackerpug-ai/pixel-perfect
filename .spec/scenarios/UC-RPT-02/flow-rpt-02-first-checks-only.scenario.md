---
flow_id: FLOW-RPT-02-FIRST-CHECKS-ONLY
service: harness-eval
feature: UC-RPT-02
priority: P1
type: boundary
tier: holdout
scope: task
test_tier: e2e
---

# First checks alone do not call resume-with-text, and an empty answer is incomplete

Scripted answers are configured with the text Use the status command. This run executes only the command-list and status checks, then stops before any later check. Across Claude Code, Codex, Grok, OpenCode, Pi, and Cursor, resume-with-text is not called. Neither first check asks a question. The unused answer is not copied into those transcripts. A second run configures an empty answer string and does not report a successful scripted resume on any harness. That empty attempt stays on the resume-with-text path and is recorded as incomplete.
