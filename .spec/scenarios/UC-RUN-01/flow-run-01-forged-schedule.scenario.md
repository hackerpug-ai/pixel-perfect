---
flow_id: FLOW-RUN-01-FORGED-SCHEDULE
service: harness-eval
feature: UC-RUN-01
priority: P1
type: security
tier: holdout
scope: task
test_tier: e2e
---

# A forged schedule event does not start the nightly grade

An HTTP client that is not the scheduler posts a body claiming the cron time is 06:17 UTC and asking to start the nightly grade. The client has no maintainer credential. The service rejects the request and writes no run id. No grade file appears for any harness. A second attempt posts a GitHub-shaped schedule payload signed with the wrong secret at 11:00 UTC. That attempt is rejected too, and the run list stays unchanged. Only the real scheduler at the next 06:17 UTC starts the nightly grade.
