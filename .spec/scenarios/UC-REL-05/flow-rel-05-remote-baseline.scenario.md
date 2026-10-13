---
flow_id: FLOW-REL-05-REMOTE-BASELINE
service: harness-eval
feature: UC-REL-05
priority: P1
type: security
tier: holdout
scope: task
test_tier: e2e
---

# A remote document cannot clear in-repo question-rule drift

The question-rule file in the repo differs from the sealed baseline the checker ships with. An attacker hosts a document that says the rules match and that the pixels are fine. A workflow variable points the checker at that URL. The checker still reads the in-repo baseline and refuses the release. It does not download the URL. It does not open an image. The live grades are all pass and do not override the refusal.
