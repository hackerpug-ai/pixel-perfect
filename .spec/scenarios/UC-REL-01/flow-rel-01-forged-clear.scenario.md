---
flow_id: FLOW-REL-01-FORGED-CLEAR
service: harness-eval
feature: UC-REL-01
priority: P1
type: security
tier: holdout
scope: task
test_tier: e2e
---

# A force flag or a rewritten workspace file does not clear the block

Codex pinned failed the status grade, and the release is blocked. A caller starts the release job with a force flag and a commit message that says the block is cleared. The job does not publish, and the pinned block remains. The force flag is ignored or rejected. A bot token then rewrites the grade file inside the release workspace so that it says pass. The gate still reads the original grade record and stays blocked. The workspace copy is not a clearance.
