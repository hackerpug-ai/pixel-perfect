---
flow_id: FLOW-JRN-NEWEST-HUMAN-MERGE
service: harness-eval
feature: journey
priority: P0
type: happy_path
tier: visible
scope: journey
covers_ucs: [UC-REL-02, UC-REL-03]
test_tier: e2e
---

# Newest warning through a human merge

Cursor newest fails the status grade while every pinned grade passes. The run records a warning, does not block the pinned release gate, and does not publish. It opens a fix pull request and leaves it for a person. The pull request names Cursor, the status grade, and the evidence path reports/cursor-newest-status.md. A person merges that pull request. The merge does not publish a release. A pinned block that already exists for a different harness stays in place, because merging this newest fix does not clear it.
