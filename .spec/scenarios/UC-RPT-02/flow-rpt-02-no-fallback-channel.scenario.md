---
flow_id: FLOW-RPT-02-NO-FALLBACK-CHANNEL
service: harness-eval
feature: UC-RPT-02
priority: P1
type: error_handling
tier: holdout
scope: task
test_tier: e2e
---

# A rejected resume payload does not grow a second answer channel

The shared resume-with-text path rejects Pi's payload with a harness error. Pi's scripted-answer result is fail or could-not-run, and the error names resume-with-text. The runner does not switch Pi to keystrokes, a clipboard paste, or a Pi-only reply tool. The other five harnesses still use resume-with-text. Their success does not mark Pi pass. Pi's command-list and status transcripts contain no question. No second answer channel appears in Pi's transcript.
