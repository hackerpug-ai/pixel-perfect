---
flow_id: FLOW-GRD-03-EMPTY-STREAM
service: harness-eval
feature: UC-GRD-03
priority: P1
type: error_handling
tier: holdout
scope: task
test_tier: e2e
---

# A pass file with no matching events is not a pass

The verify file for Grok newest says pass, and the process exit code is 0. The event stream contains no verify events. The recorded verify grade is not pass. The reader shows a stream gap, a fail, or could-not-run for that grade. Other grades that have both a file and matching events keep their own results. The empty stream is not filled in from the exit code. A later read of the same run still shows the non-pass.
