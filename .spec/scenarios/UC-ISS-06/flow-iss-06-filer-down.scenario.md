---
flow_id: FLOW-ISS-06-FILER-DOWN
service: harness-eval
feature: UC-ISS-06
priority: P1
type: error_handling
tier: visible
scope: task
test_tier: e2e
ac_ref: AC-4
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
    - "With issue writes refused, the job fails and its receipt names what was not filed, while the cells, the result artifact, and the release effect are unchanged."
  must_not_observe:
    - "A verdict or release effect that depends on whether filing worked."
negative_control:
  would_fail_if:
    - "A failed filer changes `harness-eval-result.json` for the same inputs."
    - "The next run does not retry what failed to file."
evidence:
  artifact_type: grade-file
  required_capture: true
---

# A filing failure changes no grade

GitHub refuses the write, or the API is down. The job fails visibly and says what it did not file. Every grade stands, because the result was written before this job started and this job cannot write it. The next run retries, because a fingerprint makes filing repeatable.
