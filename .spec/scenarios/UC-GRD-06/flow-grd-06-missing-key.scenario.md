---
flow_id: FLOW-GRD-06-MISSING-KEY
service: harness-eval
feature: UC-GRD-06
priority: P0
type: happy_path
tier: visible
scope: task
test_tier: e2e
ac_ref: AC-1
start_state:
  description: A clean checkout and an empty run list for this flow.
  seed_method: public_workflow
  records: []
action:
  actor: github_actions
  steps:
    - Run the harness-eval workflow for this use case on a real runner.
end_state:
  must_observe:
    - Grok records missing-api-key/could-not-run before a model request when XAI_API_KEY and fallback credentials are absent.
  must_not_observe:
    - A pass taken from process exit code 0 alone.
negative_control:
  would_fail_if:
    - The opposite input still produces the success result.
evidence:
  artifact_type: grade-file
  required_capture: true
---

# Remove the key Grok actually consumes

Run real Grok pinned and newest through invocation-guard with XAI_API_KEY absent. Use an empty isolated HOME/config and exclude login credentials and inherited alternative keys. Record could-not-run with missing-api-key before starting any model request. Both cells block release and neither enters repair. Removing only the unused GROK_API_KEY while XAI_API_KEY remains is an explicit counterexample and must not be called a missing-key trial. In a separate fresh invocation provide the valid XAI_API_KEY and observe a real authenticated request, without recording its value.
