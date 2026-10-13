---
flow_id: FLOW-REL-05-MANIFEST-MISSING
service: harness-eval
feature: UC-REL-05
priority: P1
type: error_handling
tier: holdout
scope: task
test_tier: e2e
---

# A missing adapter manifest refuses the release instead of meaning no drift

The live grades are all pass. The adapter manifest the drift check reads is absent. The release is refused. The missing file is not reported as zero drift. No pixel comparison is used in place of the manifest. The refusal names the missing manifest. The command-list check is not skipped just because the adapter file failed to open. No release artifact is published from this attempt.
