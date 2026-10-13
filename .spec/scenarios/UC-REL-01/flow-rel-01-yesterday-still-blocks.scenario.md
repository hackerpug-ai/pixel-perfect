---
flow_id: FLOW-REL-01-YESTERDAY-STILL-BLOCKS
service: harness-eval
feature: UC-REL-01
priority: P1
type: boundary
tier: holdout
scope: task
test_tier: e2e
---

# Monday's pinned command-list failure still blocks early Tuesday

Monday's nightly recorded a fail for Pi pinned on the command-list grade, while status, verify, and the first-turn grade on that track passed. At 06:10 UTC on Tuesday the new nightly has not started, and a release is requested. The release stays blocked by Monday's command-list failure. Tuesday's missing result is not treated as a pass. No release artifact is published for the 06:10 request. Monday's passing Pi newest cell does not stand in for the pinned cell.
