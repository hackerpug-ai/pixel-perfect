@@RUN-FLOW flow=FLOW-GRD-03-FILES-AND-STREAM sprint=sprint-01-evaluator-evidence-spine expect=red cmd_sha=f4cb73c296576beab33ec0c0f8cd43706a2eebff9113085c2a98fa0767f9c115 head=c833c746c0f35921a899e510f541f5983247b95e+dirty at=2026-10-29T22:50:55Z timeout=900s(default)@@
+ node --test tests/sprint-01/grd-03-evidence.test.mjs --test-name-pattern FLOW-GRD-03-FILES-AND-STREAM
✔ FLOW-GRD-03-FILES-AND-STREAM (1343.729708ms)
ℹ controls=exit0-denied-read:fail/denied_tool_call,tampered-readback:could-not-run/read-back-mismatch,partial-grade-file:could-not-run/grade-partial,fabricated-denial:could-not-run/evidence-unresolvable,absent-evidence-path:could-not-run/evidence-unresolvable,undeclared-required-read:could-not-run/requiredness-undeclared,moved-artifact-regrade:fail/denied_tool_call,exit0-no-required-fact:could-not-run/required-fact-unobserved,required-fact-observed-pass:pass/null,pass-twin-fact-removed:could-not-run/required-fact-unobserved,optional-fact-not-required:could-not-run/required-fact-unobserved,nothing-declared:could-not-run/nothing-graded,pass-without-exit-status:refused/pass-without-evidence,timeout:could-not-run/termination-timeout,truncated-boundary-prefix:could-not-run/capture-prefix-incomplete
ℹ archived_capture=absent
ℹ live_artifact=absent
✔ FLOW-GRD-03-FILES-AND-STREAM (183.022041ms)
ℹ stream_capture_sha256=47298ec50ca80cde9ef86eabce7c3de0da7a591f1722da4263730eb4bef100ab events=8 unknown=4
ℹ stream_tiling=true lossless=true validator=could-not-run/version-not-qualified
ℹ stream_controls=version-bumped-capture:could-not-run,capture-facts-unobserved:could-not-run,denied-required-read:fail,exit0-denied-read-stream:fail,undeclared-denial:could-not-run,clean-exit-without-declared-facts:could-not-run,unattributable-denial-exit0:could-not-run,lossy-capture:could-not-run,citation-hash-mismatch:could-not-run,table-only-unqualified:could-not-run,tampered-archive:could-not-run
ℹ stream_awaiting=live-result-artifact
▶ FLOW-GRD-03-FILES-AND-STREAM
  ✔ four checks cite files-and-event-stream, and each carries at least one evidence path (2.874417ms)
  ✔ the planted verify check passes while the oracle's raw exit code is 1 — the verdict is not the exit code (0.174584ms)
  ✔ a check that claims pass with no citation is downgraded to could-not-run, never trusted (0.302ms)
  ✔ a non-pass check with no reason — or a whitespace-only one — is refused, so no verdict travels unexplained (0.433833ms)
  ✔ a pass whose citation does not resolve to bytes is could-not-run, never a pass (1270.364083ms)
✔ FLOW-GRD-03-FILES-AND-STREAM (3499.653875ms)
ℹ cell_checks=command_list:could-not-run:files-and-event-stream,status:could-not-run:files-and-event-stream,verify:pass:files-and-event-stream,question_before_expensive_work:pass:files-and-event-stream
ℹ exit_code_independence=planted:exit1->pass clean:exit0->clean
✖ FLOW-GRD-03-FILES-AND-STREAM (2.027834ms)
ℹ tests 9
ℹ suites 0
ℹ pass 8
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 5239.56775

✖ failing tests:

test at tests/sprint-01/grd-03-evidence.test.mjs:1295:1
✖ FLOW-GRD-03-FILES-AND-STREAM (2.027834ms)
  Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/private/tmp/pp-t11-red-base/test/harness/controls/index.mjs' imported from /private/tmp/pp-t11-red-base/tests/sprint-01/grd-03-evidence.test.mjs
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
