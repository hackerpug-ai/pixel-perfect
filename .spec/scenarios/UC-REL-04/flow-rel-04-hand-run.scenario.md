---
flow_id: FLOW-REL-04-HAND-RUN
service: harness-eval
feature: UC-REL-04
priority: P1
type: boundary
tier: holdout
scope: task
test_tier: e2e
---

# A could-not-run cell on a hand run still blocks and opens nothing

A maintainer starts the grade by hand, not from the nightly clock. The hand run writes pass for every cell except Grok newest, which is could-not-run because the binary was not on the path. The release gate reads that hand run and blocks the release. No fix pull request is opened for the missing binary. The other passes stay visible and do not shrink the block into a warning. The nightly clock is not required for this block to apply.
