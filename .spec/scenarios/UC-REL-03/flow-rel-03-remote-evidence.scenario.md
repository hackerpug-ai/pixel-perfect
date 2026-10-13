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

# A remote evidence link and a bot merge do not decide the request

Someone edits the pull request so the evidence link is https://example.invalid/pass.png instead of the in-repo report. The grader does not fetch that URL and does not treat it as proof. A bot token then calls the merge API on the pull request. The merge is refused because the actor is not a person on the maintainer list. The pull request stays open. The grade record's harness name and failed grade are still the ones in the original body.
