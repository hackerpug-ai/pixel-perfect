@@RUN-FLOW flow=FLOW-GRD-01-TWELVE-CELLS sprint=sprint-01-evaluator-evidence-spine expect=red cmd_sha=c6d9abf415370d8d9be4368636767b099a954fd7c86fb5a988cf1d5f74a3b6e6 head=a3238db8b8f861e5c86004db117305d6cfeb0c9d+dirty at=2026-10-29T04:34:24Z timeout=900s(default)@@
+ node --test tests/sprint-01/grd-01-twelve-cells.test.mjs --test-name-pattern FLOW-GRD-01-TWELVE-CELLS
node:internal/modules/esm/resolve:275
    throw new ERR_MODULE_NOT_FOUND(
          ^

Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/Users/justinrich/Projects/pixel-perfect/.kb-run-sprint/worktrees/sprint-01-evaluator-evidence-spine/T10/test/harness/adapters/absent.mjs' imported from /Users/justinrich/Projects/pixel-perfect/.kb-run-sprint/worktrees/sprint-01-evaluator-evidence-spine/T10/tests/sprint-01/grd-01-twelve-cells.test.mjs
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
✖ tests/sprint-01/grd-01-twelve-cells.test.mjs (64.102041ms)
ℹ tests 1
ℹ suites 0
ℹ pass 0
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 70.646333

✖ failing tests:

test at tests/sprint-01/grd-01-twelve-cells.test.mjs:1:1
✖ tests/sprint-01/grd-01-twelve-cells.test.mjs (64.102041ms)
  'test failed'
@@GATE-EXIT=1@@
