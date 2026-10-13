---
flow_id: FLOW-RUN-02-MISSING-OUTDIR
service: harness-eval
feature: UC-RUN-02
priority: P1
type: error_handling
tier: holdout
scope: task
test_tier: e2e
---

# Hand start fails closed when the output directory is missing

A maintainer runs the hand-start command after the grade output directory has been removed. The command exits non-zero and names the missing directory. No pass row is written for any harness. The four grades are not filled in as pass. The release gate does not see a successful hand run. Restoring the directory and starting again creates a new run id and does not rewrite the failed attempt as a pass.
