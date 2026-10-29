@@RUN-FLOW flow=FLOW-RUN-02-HAND sprint=sprint-01-evaluator-evidence-spine expect=red cmd_sha=d696c4a8a095ffaf6aeff33d27463167560bf2feb6cc6eda1a34792a9bf66014 head=a5e1d2ced4fa41150cbfc732f4997484aefd303a+dirty at=2026-10-29T01:19:21Z timeout=900s(default)@@
+ node --test tests/sprint-01/run-02-hand.test.mjs --test-name-pattern FLOW-RUN-02-HAND
node:internal/modules/run_main:107
    triggerUncaughtException(
    ^

AssertionError [ERR_ASSERTION]: FLOW-RUN-02-HAND failed (none):
[
  ".github/workflows/harness-eval.yml does not exist: \"could not find any workflows named harness-eval\""
]

false !== true

    at file:///Users/justinrich/Projects/pixel-perfect/.kb-run-sprint/worktrees/sprint-01-evaluator-evidence-spine/T1/tests/sprint-01/run-02-hand.test.mjs:41:8 {
  generatedMessage: false,
  code: 'ERR_ASSERTION',
  actual: false,
  expected: true,
  operator: 'strictEqual',
  diff: 'simple'
}

Node.js v24.14.0
✖ tests/sprint-01/run-02-hand.test.mjs (129.5215ms)
ℹ tests 1
ℹ suites 0
ℹ pass 0
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 148.075125

✖ failing tests:

test at tests/sprint-01/run-02-hand.test.mjs:1:1
✖ tests/sprint-01/run-02-hand.test.mjs (129.5215ms)
  'test failed'
@@GATE-EXIT=1@@
