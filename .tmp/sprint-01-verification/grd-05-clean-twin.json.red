@@RUN-FLOW flow=FLOW-GRD-05-CLEAN-TWIN sprint=sprint-01-evaluator-evidence-spine expect=red cmd_sha=5100eb9f542982413c339feb088000bebb39b4c2921d8bedecb8093f941239f3 head=0903c9d7b697c5f5568841e6419df8c39e07464a+dirty at=2026-10-29T06:20:23Z timeout=900s(default)@@
+ node --test tests/sprint-01/grd-05-clean-twin.test.mjs --test-name-pattern FLOW-GRD-05-CLEAN-TWIN
node:internal/modules/esm/resolve:275
    throw new ERR_MODULE_NOT_FOUND(
          ^

Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/private/tmp/t4-redproof-base/test/harness/kit/case-loader.mjs' imported from /private/tmp/t4-redproof-base/tests/sprint-01/grd-05-clean-twin.test.mjs
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
  url: 'file:///private/tmp/t4-redproof-base/test/harness/kit/case-loader.mjs'
}

Node.js v24.14.0
✖ tests/sprint-01/grd-05-clean-twin.test.mjs (59.438208ms)
ℹ tests 1
ℹ suites 0
ℹ pass 0
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 68.379958

✖ failing tests:

test at tests/sprint-01/grd-05-clean-twin.test.mjs:1:1
✖ tests/sprint-01/grd-05-clean-twin.test.mjs (59.438208ms)
  'test failed'
@@GATE-EXIT=1@@
