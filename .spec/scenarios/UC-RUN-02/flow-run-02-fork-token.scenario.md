---
flow_id: FLOW-RUN-02-FORK-TOKEN
service: harness-eval
feature: UC-RUN-02
priority: P1
type: security
tier: holdout
scope: task
test_tier: e2e
---

# A fork pull request token cannot start a hand run

A workflow on a forked pull request calls the hand-start endpoint with the fork workflow token. The token is valid for the fork and is not a maintainer credential. The endpoint rejects the call. No run id is created. No grade files are written in the upstream run directory. The same call with a maintainer credential still starts a run, so the rejection is the credential and not a dead endpoint.
