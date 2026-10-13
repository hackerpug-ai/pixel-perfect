---
flow_id: FLOW-JRN-NIGHTLY-PINNED-BLOCK
service: harness-eval
feature: journey
priority: P0
type: happy_path
tier: visible
scope: journey
covers_ucs: [UC-RUN-01, UC-GRD-01, UC-GRD-02, UC-GRD-03, UC-REL-01]
test_tier: e2e
---

# Nightly grade through a pinned block

At 06:17 UTC the nightly grade starts on its own, and a pull request opened earlier that night does not start a second run. The run records pass, fail, or could-not-run for Claude Code, Codex, Grok, OpenCode, Pi, and Cursor, on pinned and newest, with no screenshot score. Each cell shows the command-list grade, the status grade, the verify grade on a planted defect, and the first-turn grade, and the first checks asked nothing. Those grades come from the grade files and the event stream. Codex pinned exits 0 and still fails because the stream recorded a denied tool call. That pinned failure blocks the next release. The grader's exit 0 and an already open fix pull request leave the block in place, and nothing is published.
