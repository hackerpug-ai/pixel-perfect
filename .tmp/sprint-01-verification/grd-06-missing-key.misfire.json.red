@@RUN-FLOW flow=FLOW-GRD-06-MISSING-KEY sprint=sprint-01-evaluator-evidence-spine expect=red cmd_sha=328bdcab81e2f93854714cbb20572572a4e2d0f7969bcdc8db7a04e9e795a068 head=c833c746c0f35921a899e510f541f5983247b95e+dirty at=2026-10-29T22:51:13Z timeout=900s(default)@@
+ node --test tests/sprint-01/grd-06-missing-key.test.mjs --test-name-pattern FLOW-GRD-06-MISSING-KEY
✔ FLOW-GRD-06-MISSING-KEY (2303.922ms)
ℹ controls=missing-key:could-not-run/missing-api-key,missing-key-cell:could-not-run/missing-api-key,key-present:proceeded/null,static-always-refuse-guard:caught/the bound invocation did not proceed,no-stance:could-not-run/stance-unrecorded,cursor-missing-key:could-not-run/missing-api-key,registry-missing-key:could-not-run/missing-api-key
ℹ rejected_mode_hits=0
ℹ live_artifact=absent
ℹ bindings=claude-code:SMOKE_CLAUDE_KEY->ANTHROPIC_API_KEY,codex:SMOKE_CODEX_KEY->CODEX_API_KEY,grok:SMOKE_GROK_KEY->XAI_API_KEY,opencode:SMOKE_OPENCODE_KEY->ANTHROPIC_API_KEY,pi:SMOKE_PI_KEY->GEMINI_API_KEY
ℹ keyless_control=missing-key:could-not-run/missing-api-key/0
ℹ environment=observed
ℹ t9_hosted=not-executed
✖ FLOW-GRD-06-MISSING-KEY (292.737875ms)
ℹ tests 2
ℹ suites 0
ℹ pass 1
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2934.823917

✖ failing tests:

test at tests/sprint-01/grd-06-missing-key.test.mjs:822:1
✖ FLOW-GRD-06-MISSING-KEY (292.737875ms)
  AssertionError [ERR_ASSERTION]: an always-refusing guard was accepted as discrimination
  
  true !== false
  
      at TestContext.<anonymous> (file:///private/tmp/pp-t11-red-base/tests/sprint-01/grd-06-missing-key.test.mjs:1018:12)
      at async Test.run (node:internal/test_runner/test:1125:7)
      at async Test.processPendingSubtests (node:internal/test_runner/test:787:7) {
    generatedMessage: false,
    code: 'ERR_ASSERTION',
    actual: true,
    expected: false,
    operator: 'strictEqual',
    diff: 'simple'
  }
@@GATE-EXIT=1@@
