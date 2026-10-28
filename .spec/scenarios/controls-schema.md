---
stability: TEST_SPEC
created: 2026-10-28
source: red-hat-20261028T114257Z-harness-eval-framework CHG-007
---

# Scenario negative-control schema

Every scenario file under `.spec/scenarios/` carries a `negative_control.would_fail_if` list with at least one CONCRETE, case-declared discriminating condition: a state or input specific to this flow whose presence would flip the outcome. The evaluator's scenario validator must enforce this.

## Banned placeholder strings (validator rejects verbatim, case-insensitive)

- `The opposite input still produces the success result.`
- Any sentence that restates the criterion with "opposite" substituted and names no flow-specific state, actor, or artifact.

## Requirements

1. Each `would_fail_if` entry names flow-specific observables (cells, artifacts, verdicts, actors, credentials) — not the template sentence.
2. All 77 scenarios pass the validator, including the 9 remediation-added prose scenarios.
3. A scenario whose negative control cannot be made concrete is marked `negative_control: not-yet-statable` with a one-line reason and an owning use case — never silently left as the template sentence.
