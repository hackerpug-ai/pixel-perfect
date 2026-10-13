---
flow_id: FLOW-JRN-GAPS-DRIFT-LATER
service: harness-eval
feature: journey
priority: P0
type: happy_path
tier: visible
scope: journey
covers_ucs: [UC-GRD-06, UC-REL-04, UC-REL-05, UC-RUN-02, UC-RUN-03, UC-RPT-01, UC-RPT-02]
test_tier: e2e
---

# Missing key, could-not-run, drift, both extra starts, and later reports

A maintainer starts a run by hand, and it grades the same six harnesses and four grades as the nightly job. A merge to main that changes the plugin starts another grade, and the pull request that carried that change did not start a grade while it was open. Grok's API key is unset, so Grok's run fails and is not stored as pass. Pi newest is could-not-run, which blocks the release, opens no fix pull request, and is treated the same way when the cell is Cursor. The command baseline has also drifted while the live grades that did run are pass, so the release is refused again without looking at pixels. The later checks then report on a declined change, scripted answers, resume, one full layer, and a plain-language command choice, and none of those reports block or clear the release. The scripted answers travel on one resume-with-text path for Claude Code, Codex, Grok, OpenCode, Pi, and Cursor. The command-list and status checks ask nothing and do not consume those answers.
