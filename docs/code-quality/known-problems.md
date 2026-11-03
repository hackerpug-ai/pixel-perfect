# Known problems

Recorded by code-quality reviews and clean-code runs; each row is observed, not fixed. Newest last.

- 2026-11-03 initialization survey: no production caller reaches `test/harness/graders/` yet; the hosted path keeps private copies of its logic inside `test/harness/adapters/claude-code.mjs` (sprint-02 wires `gradeInvocation` — dedupe before the second copy lands).
- 2026-11-03 initialization survey: `tests/sprint-01/` helpers (`sandbox()`, `installation()`, `REJECTED_MODE`, `SECRET_NAMES`, `LIVE_ARTIFACT`) are copy-pasted per test file; `flow-runner.mjs` is the intended home.
- 2026-11-03 initialization survey: `scripts/` + plugin scripts carry 6 directory-walker, 5 atomic-write, 2 isMain-style, 2 glob-matcher, and 2 `detectDeprecatedComposition` private copies.
- 2026-11-03 initialization survey: the 11 public capability names are restated as string arrays in 5 code files instead of derived from `scripts/adapters/capabilities.json`.
