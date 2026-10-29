@@RUN-FLOW flow=FLOW-GRD-02-FOUR-GRADES sprint=sprint-01-evaluator-evidence-spine expect=red cmd_sha=b5d8113f97755a71c9d19afecb736ea0561a7ca1428032740a55b1e7bf648a39 head=8a9c1ceacacd920cefb9212360cb67eab870c3e3+dirty at=2026-10-29T05:55:59Z timeout=900s(default)@@
+ node --test tests/sprint-01/grd-02-four-grades.test.mjs --test-name-pattern FLOW-GRD-02-FOUR-GRADES
▶ FLOW-GRD-02-FOUR-GRADES
  ✔ the install step pins the exact resolved version with auto-update off and no credential, for both tracks (5.148041ms)
  ✔ checkout load adds the workspace marketplace then installs the plugin, both untested until a run proves them (0.366542ms)
  ✔ the command list is model-free and the eleven names are asserted by presence, not by count (1.180417ms)
  ✔ the five real invocations carry the recorded stance, stream-json, a closed stdin and a fresh directory each (99.942083ms)
  ✔ InstallationIdentity carries all nine fields and every version/digest/load mismatch is could-not-run installation-identity-mismatch (51.025917ms)
  ✔ the real CLI installs the checkout plugin with auto-update off and the loaded payload matches the expected digest (2129.418584ms)
  ℹ local CLI 2.1.312 != pin 2.1.291: the graded cell is could-not-run installation-identity-mismatch until the hosted runner installs the pin
  ✔ the plugin gate reads system/init: a run with the plugin loaded cites it, a run without it is could-not-run (4506.943083ms)
  ✔ the question boundary fails closed: a real stream with no question can never pass the must-ask probe (4503.169166ms)
  ✔ the four graded checks are not-executed here, with a reason, and the cell is could-not-run rather than a pass (591.867625ms)
  ✔ no harness API key reaches an install, marketplace, plugin-install or command-list step (2.424875ms)
  ✔ the registry answers for all six harnesses and only claude-code is available (0.394ms)
  ✔ a report produced by another invocation is refused, so no twin can borrow a body (0.350625ms)
  ✔ the status facts are compared against the seeded gate state: a reply with the right platform, phase and counts but no gate state fails (34.643208ms)
  ✔ the question detector recognises all three declared question shapes, and one real question in an ask-nothing stream fails that check (27.718916ms)
  ✔ the verify report is graded from its bound file: a borrowed, mis-outcomed or wrong-key body each fails, and the correct body passes (3.486375ms)
  ✔ a keyless step that names a credential is refused at declaration time (0.656708ms)
✔ FLOW-GRD-02-FOUR-GRADES (11970.9805ms)
ℹ probe run exit_code=1 verdict=could-not-run reason=model-never-answered
ℹ not-executed leg=question-in-ask-nothing owner=T11 reason=the red fixture is a splice of real bytes (the must-ask USER_CHOICE inserted into a real verify stream) and no keyed must-ask capture exists on this branch; the surface policy bans hand-authored event JSON
ℹ not-executed leg=four-graded-checks owner=T5 reason=the four graded verdicts need a model that answers: the harness-smoke credential (SMOKE_CLAUDE_KEY) exists only on the hosted runner, so locally the guard refuses with missing-api-key and zero model requests
ℹ pins_sha256=aed5c0c03c0ced2f879b67703163ed94191cff662cc07768b01d1833d3c9d411
ℹ not_executed=question-in-ask-nothing,four-graded-checks
ℹ report=/private/tmp/t6-red-base-proof/.tmp/sprint-01-verification/grd-02-four-grades.json
✖ FLOW-GRD-02-FOUR-GRADES (1.11825ms)
ℹ tests 18
ℹ suites 0
ℹ pass 17
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 12064.13025

✖ failing tests:

test at tests/sprint-01/grd-02-four-grades.test.mjs:922:1
✖ FLOW-GRD-02-FOUR-GRADES (1.11825ms)
  Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/private/tmp/t6-red-base-proof/test/harness/stream/index.mjs' imported from /private/tmp/t6-red-base-proof/tests/sprint-01/grd-02-four-grades.test.mjs
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
