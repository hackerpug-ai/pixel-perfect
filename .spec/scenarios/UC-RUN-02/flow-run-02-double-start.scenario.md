---
flow_id: FLOW-RUN-02-DOUBLE-START
service: harness-eval
feature: UC-RUN-02
priority: P1
type: boundary
tier: holdout
scope: task
test_tier: e2e
---

# Two hand starts one second apart do not overwrite each other

A maintainer starts a hand run, then issues a second hand start one second later while the first is still going. The second start is refused, or it receives its own run id and its own grade files. The first run still grades all six harnesses. The first run's command-list file is not replaced by the second attempt. Neither run drops Pi or Cursor because the other run exists. The run list shows the overlap instead of one blended pass.
