---
flow_id: FLOW-ISS-03-PROOF-COMMANDS-RUN
service: harness-eval
feature: UC-ISS-03
priority: P0
type: happy_path
tier: visible
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
    - "Copied unedited from `## Prove the fix`, the commands print the fix commit, then `0`, then a grid with every earlier `pass` intact, then `success`."
  must_not_observe:
    - "A command that needs editing before it runs."
negative_control:
  would_fail_if:
    - "The same commands print the expected lines on an unfixed commit."
    - "The commands read `harness-eval-result.json` at the artifact root, where the file does not land."
evidence:
  artifact_type: grade-file
  required_capture: true
---

# The issue's own commands prove the fix

A real finding is filed, and a real fix lands on main. A person copies the block from the issue, with no other reference, and runs it. It starts a new checkout run, waits, downloads the result, and prints what the issue said it would. The same commands on the unfixed commit print something else. This is the human gate for this use case.
