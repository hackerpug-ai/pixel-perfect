@@RUN-FLOW flow=FLOW-GRD-03-FILES-AND-STREAM sprint=sprint-01-evaluator-evidence-spine expect=red cmd_sha=f4cb73c296576beab33ec0c0f8cd43706a2eebff9113085c2a98fa0767f9c115 head=8a9c1ceacacd920cefb9212360cb67eab870c3e3+dirty at=2026-10-29T05:56:14Z timeout=900s(default)@@
+ node --test tests/sprint-01/grd-03-evidence.test.mjs --test-name-pattern FLOW-GRD-03-FILES-AND-STREAM
✔ FLOW-GRD-03-FILES-AND-STREAM (672.1465ms)
ℹ controls=exit0-denied-read:fail/denied_tool_call,tampered-readback:could-not-run/read-back-mismatch,partial-grade-file:could-not-run/grade-partial,fabricated-denial:could-not-run/evidence-unresolvable,absent-evidence-path:could-not-run/evidence-unresolvable,undeclared-required-read:could-not-run/requiredness-undeclared,moved-artifact-regrade:fail/denied_tool_call,exit0-no-required-fact:could-not-run/required-fact-unobserved,required-fact-observed-pass:pass/null,pass-twin-fact-removed:could-not-run/required-fact-unobserved,optional-fact-not-required:could-not-run/required-fact-unobserved,nothing-declared:could-not-run/nothing-graded,pass-without-exit-status:refused/pass-without-evidence,timeout:could-not-run/termination-timeout,truncated-boundary-prefix:could-not-run/capture-prefix-incomplete
ℹ archived_capture=absent
ℹ live_artifact=absent
✖ FLOW-GRD-03-FILES-AND-STREAM (1.763ms)
ℹ tests 2
ℹ suites 0
ℹ pass 1
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 750.803041

✖ failing tests:

test at tests/sprint-01/grd-03-evidence.test.mjs:693:1
✖ FLOW-GRD-03-FILES-AND-STREAM (1.763ms)
  Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/private/tmp/t6-red-base-proof/test/harness/stream/index.mjs' imported from /private/tmp/t6-red-base-proof/tests/sprint-01/grd-03-evidence.test.mjs
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
    url: 'file:///private/tmp/t6-red-base-proof/test/harness/stream/index.mjs'
  }
@@GATE-EXIT=1@@
