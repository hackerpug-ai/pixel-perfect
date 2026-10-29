@@RUN-FLOW flow=FLOW-JRN-PLANTED-AND-TWIN sprint=sprint-01-evaluator-evidence-spine expect=red cmd_sha=29e9d1661c5377e6c4d9672a7bbcc79e71ec4c37dace670a50a0e37e8f4a759f head=34f826229e8e7768f19869ca18cb691876efb58b+dirty at=2026-10-29T21:34:27Z timeout=900s(default)@@
+ node --test tests/sprint-01/jrn-planted-and-twin.test.mjs --test-name-pattern FLOW-JRN-PLANTED-AND-TWIN
▶ FLOW-JRN-PLANTED-AND-TWIN
  ✔ a missing planted report downgrades to fail report-missing, not could-not-run (1176.7595ms)
  ✔ a static replay with no live-run provenance grades not-executed, never pass (2.809875ms)
  ✔ provenance bound to a different run is rejected (0.969542ms)
  ✔ pre-dispatch refusal 1: the workflow file is absent (0.478792ms)
  ✔ pre-dispatch refusal 2: the remote has not registered the workflow (1.330667ms)
  ✔ pre-dispatch refusal 3: the surface policy forbids this ref, (5.22475ms)
  ✔ a pinned run id outranks every pre-dispatch refusal, and an unfetchable one is red (1.135542ms)
  ✔ everything that is not a probed refusal still goes red (461.78575ms)
  ✔ one live dispatched run: oracle precheck, both reports, distinct invocation_ids (1166.072917ms)
  ℹ not-executed leg=live-dispatched-run owner=T7 obligation=obl-FLOW-JRN-PLANTED-AND-TWIN reason=the remote has not registered .github/workflows/harness-eval.yml yet (gh api repos/hackerpug-ai/pixel-perfect/actions/workflows/harness-eval.yml → 404) — GitHub registers a workflow only once its file has landed on main
  ✔ the adapter binds the planted and the clean report to distinct invocations of one run (2348.343708ms)
  ℹ not-executed leg=harness-verify-pair owner=T7 reason=the report bodies need a model that answers; the harness-smoke credential exists only on the hosted runner
✔ FLOW-JRN-PLANTED-AND-TWIN (5172.460125ms)
✖ FLOW-JRN-PLANTED-AND-TWIN (0.806333ms)
ℹ tests 12
ℹ suites 0
ℹ pass 11
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 5349.039708

✖ failing tests:

test at tests/sprint-01/jrn-planted-and-twin.test.mjs:679:1
✖ FLOW-JRN-PLANTED-AND-TWIN (0.806333ms)
  Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/private/tmp/t7c2/t7-red-base/test/harness/graders/index.mjs' imported from /private/tmp/t7c2/t7-red-base/tests/sprint-01/jrn-planted-and-twin.test.mjs
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
    url: 'file:///private/tmp/t7c2/t7-red-base/test/harness/graders/index.mjs'
  }
@@GATE-EXIT=1@@
