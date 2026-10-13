---
flow_id: FLOW-REL-04-EXEMPT-TRAILER
service: harness-eval
feature: UC-REL-04
priority: P1
type: security
tier: holdout
scope: task
test_tier: e2e
---

# An exempt trailer does not spare a could-not-run cell or open a fix

Cursor newest is could-not-run. The commit under test carries the trailer Release-Exempt: cursor and a body line that says to open a fix and not block. The release gate ignores the trailer and the body line. The release stays blocked. No fix pull request is opened for Cursor or for any other harness. An author label named flake does not change the gate. The release list does not gain a version from this commit.
