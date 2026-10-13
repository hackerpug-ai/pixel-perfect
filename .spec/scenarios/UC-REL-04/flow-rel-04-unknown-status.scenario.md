---
flow_id: FLOW-REL-04-UNKNOWN-STATUS
service: harness-eval
feature: UC-REL-04
priority: P1
type: error_handling
tier: holdout
scope: task
test_tier: e2e
---

# A crashed wrapper's unknown token is not stored as pass and opens no fix

The grade file for Codex pinned contains the result ??? because the wrapper crashed while writing it. The reader does not store pass. The release is not published. No fix pull request is opened to change product code for that token. The cell is not dropped so the other eleven can look like a full pass. A timeout with no grade file on that same track is also unpublished and opens no fix pull request. The operator can see the bad token or the timeout in the run record.
