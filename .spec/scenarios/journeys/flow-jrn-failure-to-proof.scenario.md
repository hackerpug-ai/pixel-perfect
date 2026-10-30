---
flow_id: FLOW-JRN-FAILURE-TO-PROOF
service: harness-eval
feature: journey
priority: P0
type: happy_path
tier: visible
scope: journey
covers_ucs: [UC-ISS-01, UC-ISS-02, UC-ISS-03, UC-ISS-04, UC-ISS-05, UC-ISS-06]
test_tier: e2e
---

# From a failed run to a proven fix

A real dispatch on main reads claude-code could-not-run with `requiredness-undeclared`, and Cursor could-not-run with `missing-api-key`. With nobody present, the run files one issue for the first and nothing for the second. A second dispatch of the same commit adds nothing. A fixer opens the issue, reads the affected rows, the twelve-cell grid, and the limits, opens the evidence it names, and lands a fix in the evaluator. The stream's text never reached the issue. The fixer copies the issue's commands and runs them: a new checkout run of the fix commit, the reason gone, `command_list` still passing, and the drift proof succeeding. They close the issue as completed with a comment naming the fix commit and that run. The release effect of the remaining could-not-run cells is the same before and after: closing the issue cleared nothing.
