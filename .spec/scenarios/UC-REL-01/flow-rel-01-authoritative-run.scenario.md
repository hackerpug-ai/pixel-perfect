---
flow_id: FLOW-REL-01-AUTHORITATIVE-RUN
service: harness-eval
feature: UC-REL-01
priority: P1
type: security
tier: holdout
scope: task
test_tier: e2e
---

# Only the latest trusted fresh checkout can authorize release

In a disposable GitHub repository with the real workflow and release dry-run, retain an exact-SHA checkout success, then create a newer failed or cancelled attempt for that SHA. The old pass must not authorize release; queued/pending/incomplete latest attempts also refuse. Reject a same-name artifact from another workflow and a status pointer to a different run/attempt. A passing published evaluation cannot authorize checkout. Use genuine GitHub timestamps to test a checkout result older than 36 hours; do not backdate an artifact or clock. A new passing checkout authorizes only when all other release rules permit. Capture actual run IDs, attempts, status URLs, artifact digests, timestamps, and rejection reasons.

Same-SHA collision control: complete a valid checkout, then a published run that writes the same status context. Create enough real commit statuses on this SHA to exceed the resolver's configured page size, placing the selected checkout record on a later page and the published same-context record on page one. Retain actual paginated API request/response metadata (with credentials redacted); a first-page-only resolver must fail this control. The resolver must paginate all status records and still select the exact checkout record, subject to published hold rules. Rerun one workflow: require a distinct attempt-qualified artifact and upload provenance. Reject the prior attempt artifact even though GitHub reports the same workflow_run.id; do not assume artifact metadata contains run_attempt.
