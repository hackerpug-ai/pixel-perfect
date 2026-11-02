@@RUN-FLOW flow=FLOW-GRD-06-MISSING-KEY sprint=sprint-01-evaluator-evidence-spine expect=red cmd_sha=328bdcab81e2f93854714cbb20572572a4e2d0f7969bcdc8db7a04e9e795a068 head=c833c746c0f35921a899e510f541f5983247b95e+dirty at=2026-10-29T22:51:25Z timeout=900s(default)@@
+ node --test tests/sprint-01/grd-06-missing-key.test.mjs --test-name-pattern FLOW-GRD-06-MISSING-KEY
✔ FLOW-GRD-06-MISSING-KEY (4270.249583ms)
ℹ controls=missing-key:could-not-run/missing-api-key,missing-key-cell:could-not-run/missing-api-key,key-present:proceeded/null,static-always-refuse-guard:caught/the bound invocation did not proceed,no-stance:could-not-run/stance-unrecorded,cursor-missing-key:could-not-run/missing-api-key,registry-missing-key:could-not-run/missing-api-key
ℹ rejected_mode_hits=0
ℹ live_artifact=absent
ℹ bindings=claude-code:SMOKE_CLAUDE_KEY->ANTHROPIC_API_KEY,codex:SMOKE_CODEX_KEY->CODEX_API_KEY,grok:SMOKE_GROK_KEY->XAI_API_KEY,opencode:SMOKE_OPENCODE_KEY->ANTHROPIC_API_KEY,pi:SMOKE_PI_KEY->GEMINI_API_KEY
ℹ keyless_control=missing-key:could-not-run/missing-api-key/0
ℹ environment=observed
ℹ t9_hosted=not-executed
✖ FLOW-GRD-06-MISSING-KEY (6.485375ms)
ℹ tests 2
ℹ suites 0
ℹ pass 1
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 4558.424791

✖ failing tests:

test at tests/sprint-01/grd-06-missing-key.test.mjs:822:1
✖ FLOW-GRD-06-MISSING-KEY (6.485375ms)
  Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/private/tmp/pp-t11-red-base/test/harness/controls/index.mjs' imported from /private/tmp/pp-t11-red-base/tests/sprint-01/grd-06-missing-key.test.mjs
      at finalizeResolution (node:internal/modules/esm/resolve:275:11)
      at moduleResolve (node:internal/modules/esm/resolve:865:10)
      at defaultResolve (node:internal/modules/esm/resolve:991:11)
      at #cachedDefaultResolve (node:internal/modules/esm/loader:719:20)
      at #resolveAndMaybeBlockOnLoaderThread (node:internal/modules/esm/loader:736:38)
      at ModuleLoader.resolveSync (node:internal/modules/esm/loader:765:52)
      at #resolve (node:internal/modules/esm/loader:701:17)
      at ModuleLoader.getOrCreateModuleJob (node:internal/modules/esm/loader:621:35)
      at onImport.tracePromise.__proto__ (node:internal/modules/esm/loader:650:32)
      at TracingChannel.tracePromise (node:diagnostics_channel:350:14) {
    code: 'ERR_MODULE_NOT_FOUND',
    url: 'file:///private/tmp/pp-t11-red-base/test/harness/controls/index.mjs'
  }
@@GATE-EXIT=1@@
