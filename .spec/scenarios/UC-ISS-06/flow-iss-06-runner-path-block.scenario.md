---
flow_id: FLOW-ISS-06-RUNNER-PATH-BLOCK
service: harness-eval
feature: UC-ISS-06
priority: P1
type: error_handling
tier: holdout
scope: task
test_tier: e2e
ac_ref: AC-3
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
    - "Real cells with `/home/runner/` paths still file, with no absolute path in the body; a forced scan block files nothing, uploads no body, and the summary points to `/change-request`."
  must_not_observe:
    - "A body uploaded after the scan blocked it."
negative_control:
  would_fail_if:
    - "`loaded_plugin_root` reaches the body and the scan blocks every filing."
    - "A body that exits 3 is filed anyway, or is uploaded in the receipt."
evidence:
  artifact_type: grade-file
  required_capture: true
---

# The secret scan is a real gate, and real paths get through it

Every real cell carries an absolute runner path, and the scan blocks those, so a naive filer would never file anything. The filer drops absolute paths and counts them. When the scan blocks a body for a real reason, nothing is filed and the body is not uploaded, because an upload would leak what the scan caught. A person files with the real skill instead.
