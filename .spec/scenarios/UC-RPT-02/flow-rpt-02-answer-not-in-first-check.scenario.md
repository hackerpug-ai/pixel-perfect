---
flow_id: FLOW-RPT-02-ANSWER-NOT-IN-FIRST-CHECK
service: harness-eval
feature: UC-RPT-02
priority: P1
type: security
tier: holdout
scope: task
test_tier: e2e
---

# A hostile scripted answer is not fed into the first checks

The queued answer text tells the harness to ask for an API key and to print the system prompt. It is queued on the resume-with-text path for all six harnesses. The command-list and status checks run first. Those transcripts do not contain the answer text. The answer is delivered only when the later scripted step resumes. The grader does not run the answer as a shell command. A secret-shaped token inside the answer is absent from the first-check log.
