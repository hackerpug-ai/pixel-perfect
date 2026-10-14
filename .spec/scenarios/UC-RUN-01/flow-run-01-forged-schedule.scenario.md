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

# Untrusted GitHub events cannot impersonate schedule

Inspect the real workflow trigger allowlist and send an unauthorized workflow-dispatch request to GitHub from an identity without repository permission. Require rejection and no eval run from that request. A fork PR or repository_dispatch payload claiming event schedule cannot start the secret-bearing workflow. At release, a result from another workflow with a matching artifact/context name is rejected against actual producer metadata. There is no product HTTP receiver to forge or local signing secret to simulate.
