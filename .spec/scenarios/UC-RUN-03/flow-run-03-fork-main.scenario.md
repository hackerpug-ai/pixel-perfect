---
flow_id: FLOW-RUN-03-FORK-MAIN
service: harness-eval
feature: UC-RUN-03
priority: P1
type: security
tier: holdout
scope: task
test_tier: e2e
---

# A fork main push, a tag, and a lookalike branch do not start the grade

A fork named hackerpug-ai-fork receives a push to its branch main that edits plugin/commands.md. The upstream run list does not gain a run id. A tag v9 pushed on the upstream repo, pointing at that same plugin commit on a side branch, also adds no run id. Updating the upstream branch main-backup with the same plugin file adds no run id. After all three updates, the upstream main run list is unchanged.
