@@RUN-FLOW flow=FLOW-GRD-06-MISSING-KEY sprint=sprint-01-evaluator-evidence-spine expect=red cmd_sha=328bdcab81e2f93854714cbb20572572a4e2d0f7969bcdc8db7a04e9e795a068 head=2af55172ef2a3c38b399f3e689e92bc4cc69c1b4+dirty at=2026-10-29T22:08:38Z timeout=900s(default)@@
+ node --test tests/sprint-01/grd-06-missing-key.test.mjs --test-name-pattern FLOW-GRD-06-MISSING-KEY
✖ FLOW-GRD-06-MISSING-KEY (786.598375ms)
ℹ tests 1
ℹ suites 0
ℹ pass 0
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1395.981375

✖ failing tests:

test at tests/sprint-01/grd-06-missing-key.test.mjs:146:1
✖ FLOW-GRD-06-MISSING-KEY (786.598375ms)
  AssertionError [ERR_ASSERTION]: claude-code: 0 smoke steps hold SMOKE_CLAUDE_KEY, expected exactly one
  
  0 !== 1
  
      at TestContext.<anonymous> (file:///private/tmp/t9-red-base.t8s4aV/tests/sprint-01/grd-06-missing-key.test.mjs:529:16)
      at async Test.run (node:internal/test_runner/test:1125:7)
      at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3) {
    generatedMessage: false,
    code: 'ERR_ASSERTION',
    actual: 0,
    expected: 1,
    operator: 'strictEqual',
    diff: 'simple'
  }
@@GATE-EXIT=1@@
