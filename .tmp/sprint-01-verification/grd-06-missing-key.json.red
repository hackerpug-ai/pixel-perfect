@@RUN-FLOW flow=FLOW-GRD-06-MISSING-KEY sprint=sprint-01-evaluator-evidence-spine expect=red cmd_sha=328bdcab81e2f93854714cbb20572572a4e2d0f7969bcdc8db7a04e9e795a068 head=a3238db8b8f861e5c86004db117305d6cfeb0c9d+dirty at=2026-10-29T04:34:27Z timeout=900s(default)@@
+ node --test tests/sprint-01/grd-06-missing-key.test.mjs --test-name-pattern FLOW-GRD-06-MISSING-KEY
node:internal/modules/esm/resolve:275
    throw new ERR_MODULE_NOT_FOUND(
          ^

Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/Users/justinrich/Projects/pixel-perfect/.kb-run-sprint/worktrees/sprint-01-evaluator-evidence-spine/T10/test/harness/adapters/absent.mjs' imported from /Users/justinrich/Projects/pixel-perfect/.kb-run-sprint/worktrees/sprint-01-evaluator-evidence-spine/T10/tests/sprint-01/grd-06-missing-key.test.mjs
    at finalizeResolution (node:internal/modules/esm/resolve:275:11)
    at moduleResolve (node:internal/modules/esm/resolve:865:10)
    at defaultResolve (node:internal/modules/esm/resolve:991:11)
    at #cachedDefaultResolve (node:internal/modules/esm/loader:719:20)
    at #resolveAndMaybeBlockOnLoaderThread (node:internal/modules/esm/loader:736:38)
    at ModuleLoader.resolveSync (node:internal/modules/esm/loader:765:52)
    at #resolve (node:internal/modules/esm/loader:701:17)
    at ModuleLoader.getOrCreateModuleJob (node:internal/modules/esm/loader:621:35)
    at ModuleJob.syncLink (node:internal/modules/esm/module_job:160:33)
    at ModuleJob.link (node:internal/modules/esm/module_job:245:17) {
  code: 'ERR_MODULE_NOT_FOUND',
  url: 'file:///Users/justinrich/Projects/pixel-perfect/.kb-run-sprint/worktrees/sprint-01-evaluator-evidence-spine/T10/test/harness/adapters/absent.mjs'
}

Node.js v24.14.0
✖ tests/sprint-01/grd-06-missing-key.test.mjs (62.250083ms)
ℹ tests 1
ℹ suites 0
ℹ pass 0
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 67.727

✖ failing tests:

test at tests/sprint-01/grd-06-missing-key.test.mjs:1:1
✖ tests/sprint-01/grd-06-missing-key.test.mjs (62.250083ms)
  'test failed'
@@GATE-EXIT=1@@
