---
flow_id: FLOW-ISS-05-EXPECTED-FILES-NOTHING
service: harness-eval
feature: UC-ISS-05
priority: P0
type: happy_path
tier: visible
scope: task
test_tier: e2e
ac_ref: AC-1
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
    - "No issue names `cursor/missing-api-key` or the four `<harness>-adapter-not-implemented` pairs, and the receipt lists all ten cells as expected."
  must_not_observe:
    - "A nightly issue for Cursor's missing key."
negative_control:
  would_fail_if:
    - "Run 41140522995's ten expected cells produce an issue."
    - "Removing the Cursor entry from the list still files nothing."
evidence:
  artifact_type: grade-file
  required_capture: true
---

# Results the plan expects file nothing

Cursor has no key, and four adapters do not exist yet. The plan says so, and an issue about it every night would teach the maintainer to ignore issues. The exact pairs are on a reviewed list. They file nothing, and they still hold the release.
