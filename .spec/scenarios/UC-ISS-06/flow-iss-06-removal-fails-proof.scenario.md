---
flow_id: FLOW-ISS-06-REMOVAL-FAILS-PROOF
service: harness-eval
feature: UC-ISS-06
priority: P0
type: security
tier: holdout
scope: task
test_tier: e2e
ac_ref: AC-6
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
    - "Removing a public command leaves the `drift proof` job reading `failure`, so the proof's last line is not `success`."
  must_not_observe:
    - "A fix that deletes what it should repair and reads as proven."
negative_control:
  would_fail_if:
    - "Deleting `plugins/pixel-perfect/commands/verify.md` reads as proven because `command_list` takes its expected names from the same tree."
    - "Editing `test/harness/graders/fixture-grader.mjs` prints nothing in the proof's `git diff` step."
evidence:
  artifact_type: grade-file
  required_capture: true
---

# Deleting the thing is not a fix

A fixer takes the shortest path and removes the failing command. `command_list` does not notice, because it reads its expected names from the plugin under test. The drift proof does, and the issue's proof reads it. Removing the whole plugin leaves the cells could-not-run. Removing a harness or track leaves no result. A grader edited to pass is printed for a person to read. The proof makes a bad fix visible; it does not make one impossible.
