---
flow_id: FLOW-REL-03-REMOTE-EVIDENCE
service: harness-eval
feature: UC-REL-03
priority: P1
type: security
tier: holdout
scope: task
test_tier: e2e
---

# Actual repository enforcement rejects the heal app merge

In a disposable repository, activate the main update restriction with the designated human maintainer permitted and heal app excluded from bypass. Record the effective rule ID and actor configuration. The real app token creates a heal branch and PR, then attempts the merge API. Require API denial and unchanged main. A designated human can merge a separately qualified PR; capture that receipt. Missing rule or inability to prove denial disables healing. A remote link inserted into a PR body cannot replace the original artifact identity and is not fetched as grade evidence.
