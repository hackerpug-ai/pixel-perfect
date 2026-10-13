---
flow_id: FLOW-REL-05-PIXELS-ONLY
service: harness-eval
feature: UC-REL-05
priority: P1
type: boundary
tier: holdout
scope: task
test_tier: e2e
---

# Screenshot churn and a non-shipped comment are not this drift check

The landing-page screenshots change by a large visual diff. Commands, adapters, and question rules still match the baseline, and the live grades are all pass. This gate does not refuse the release because of the screenshots. It does not open the images to decide. A comment added in a non-shipped example file also does not refuse the release. A one-character rename of a real shipped command does refuse the release even though every live grade passed. That refusal names the command and does not mention pixels.
