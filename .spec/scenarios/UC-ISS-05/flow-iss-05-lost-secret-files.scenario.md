---
flow_id: FLOW-ISS-05-LOST-SECRET-FILES
service: harness-eval
feature: UC-ISS-05
priority: P0
type: edge_case
tier: holdout
scope: task
test_tier: e2e
ac_ref: AC-2
start_state:
  description: A finished harness-eval run on main in this repository, with its result artifact.
  seed_method: public_workflow
  records: []
action:
  actor: github_actions
  steps:
    - Run the harness-eval workflow on a real runner, then read the issues, the receipt, and the summary.
end_state:
  must_observe:
    - "An issue titled `harness-eval: could-not-run (missing-api-key)` lists `codex`, while `cursor` is not listed."
  must_not_observe:
    - "A wildcard list entry that silences the reason on every harness."
negative_control:
  would_fail_if:
    - "`codex` reading `missing-api-key` files nothing because `cursor` reading it is expected."
    - "A list entry with a `fail` verdict or a wildcard passes the schema."
evidence:
  artifact_type: grade-file
  required_capture: true
---

# The same reason on another harness is a real finding

Someone removes the Codex secret from the environment. Codex now reads the same reason Cursor reads every night, but only Cursor's pair is expected. The issue files and names Codex alone. A graded failure can never be put on this list.
