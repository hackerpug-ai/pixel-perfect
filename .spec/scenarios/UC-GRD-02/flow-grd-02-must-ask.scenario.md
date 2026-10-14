---
flow_id: FLOW-GRD-02-MUST-ASK
service: harness-eval
feature: UC-GRD-02
priority: P1
type: boundary
tier: holdout
scope: task
test_tier: e2e
---

# Initialization asks before expensive work

Invoke real init on an empty project with no supplied goal/platform or quick/automatic-answer option. Permit bounded local reads/listing of fixture and plugin instructions. Require a valid initial USER_CHOICE about goal/platform/init choices; stop at its incremental text or tool start and send no answer. Capture that no search, install, render, child model dispatch, or write occurred first. Real no-question, malformed-question, and expensive-work-first variants fail; unavailable required stream mapping is could-not-run. List/status/verify remain separate ask-nothing invocations.

Boundary-stop control: capture a real Pi question incrementally, stop immediately before its native message_end, and record runner termination_kind boundary-stop with a complete prefix. This can pass the must-ask check without inventing message_end. Repeat with the capture truncated before the question or an unexplained process kill: could-not-run, never pass. A native-completion check still requires its genuine completion evidence.
