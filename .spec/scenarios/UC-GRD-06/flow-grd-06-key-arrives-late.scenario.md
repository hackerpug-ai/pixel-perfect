---
flow_id: FLOW-GRD-06-KEY-ARRIVES-LATE
service: harness-eval
feature: UC-GRD-06
priority: P1
type: boundary
tier: holdout
scope: task
test_tier: e2e
---

# Pi credential binding is immutable within an invocation

Bind SMOKE_PI_KEY to GEMINI_API_KEY for the selected google model. Start Pi's guarded invocation with GEMINI_API_KEY absent and no alternate login/provider credentials. It records missing-api-key/could-not-run without calling the model. Adding a secret for a later workflow invocation cannot mutate the first result. A fresh run with the valid binding must make a real authenticated model call. Record separate run/attempt IDs. PI_API_KEY is not a substitute for the consumed variable.
