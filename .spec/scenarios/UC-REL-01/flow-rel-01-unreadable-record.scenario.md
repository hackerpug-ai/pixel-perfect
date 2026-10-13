---
flow_id: FLOW-REL-01-UNREADABLE-RECORD
service: harness-eval
feature: UC-REL-01
priority: P1
type: error_handling
tier: holdout
scope: task
test_tier: e2e
---

# A corrupt grade record stops the release instead of counting as clean

The release job opens the grade record and finds corrupt JSON where the pinned results should be. It cannot tell whether Claude Code pinned passed. The release is blocked. The corrupt record is not treated as no failure. Nothing is published. The job does not write a fresh pass over the corrupt file. The operator can see that the stop was an unreadable record.
