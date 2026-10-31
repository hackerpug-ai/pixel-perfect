---
flow_id: FLOW-ISS-06-ONLY-CREATE-AND-COMMENT
service: harness-eval
feature: UC-ISS-06
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
    - "The job's API log shows only listing, one create-issue call per new finding, and create-comment calls on issues it authored."
  must_not_observe:
    - "A close, edit, label, assign, pull request, push, merge, tag, or publish call."
negative_control:
  would_fail_if:
    - "The helper lets a `PATCH` on an issue through."
    - "The helper comments on an issue a person wrote."
    - "A body contains an `@` mention."
evidence:
  artifact_type: grade-file
  required_capture: true
---

# Filing can only file

The issue job has one narrow permission and one helper, and the helper refuses every other method and path before a request leaves. Whatever a bug in the rest of the code tries, the only thing it can do to this repository is add an issue or a comment.
