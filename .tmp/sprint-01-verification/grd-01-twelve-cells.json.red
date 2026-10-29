# RED — FLOW-GRD-01-TWELVE-CELLS recorder half, T8 (captured 2026-10-29T02:52:34Z)
# command: node --test tests/sprint-01/grd-01-twelve-cells.test.mjs --test-name-pattern FLOW-GRD-01-TWELVE-CELLS
# base sha: f5423e74d0c9b23e3d5c260b69b7ca257f1d81ec (branch main)
# the recorder does not exist yet, so the flow module cannot load:
node:internal/modules/esm/resolve:275
    throw new ERR_MODULE_NOT_FOUND(
          ^

Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/Users/justinrich/Projects/pixel-perfect/test/harness/recorder.mjs' imported from /Users/justinrich/Projects/pixel-perfect/tests/sprint-01/grd-01-twelve-cells.test.mjs
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
  url: 'file:///Users/justinrich/Projects/pixel-perfect/test/harness/recorder.mjs'
}

Node.js v24.14.0
✖ tests/sprint-01/grd-01-twelve-cells.test.mjs (61.616834ms)
ℹ tests 1
ℹ suites 0
ℹ pass 0
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 68.873667

✖ failing tests:

test at tests/sprint-01/grd-01-twelve-cells.test.mjs:1:1
✖ tests/sprint-01/grd-01-twelve-cells.test.mjs (61.616834ms)
  'test failed'
# exit code: 1
