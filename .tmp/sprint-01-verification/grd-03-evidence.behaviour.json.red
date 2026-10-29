@@RUN-FLOW flow=FLOW-GRD-03-FILES-AND-STREAM sprint=sprint-01-evaluator-evidence-spine expect=red cmd_sha=f4cb73c296576beab33ec0c0f8cd43706a2eebff9113085c2a98fa0767f9c115 head=433e6559515efe35161fe04ea5da4bb362371741+dirty at=2026-10-29T23:04:18Z timeout=900s(default) mutation=grade-writer.mjs:97 "if (denied.length > 0)" -> "if (false \&\& denied.length > 0)" (a denied required read grades pass; reverted after capture)@@
+ node --test tests/sprint-01/grd-03-evidence.test.mjs --test-name-pattern FLOW-GRD-03-FILES-AND-STREAM
✖ FLOW-GRD-03-FILES-AND-STREAM (849.765791ms)
✖ FLOW-GRD-03-FILES-AND-STREAM (69.325875ms)
▶ FLOW-GRD-03-FILES-AND-STREAM
  ✔ four checks cite files-and-event-stream, and each carries at least one evidence path (0.579916ms)
  ✔ the planted verify check passes while the oracle's raw exit code is 1 — the verdict is not the exit code (0.3555ms)
  ✔ a check that claims pass with no citation is downgraded to could-not-run, never trusted (4.077375ms)
  ✔ a non-pass check with no reason — or a whitespace-only one — is refused, so no verdict travels unexplained (1.725167ms)
  ✔ a pass whose citation does not resolve to bytes is could-not-run, never a pass (1375.9655ms)
✔ FLOW-GRD-03-FILES-AND-STREAM (4500.162792ms)
ℹ cell_checks=command_list:could-not-run:files-and-event-stream,status:could-not-run:files-and-event-stream,verify:pass:files-and-event-stream,question_before_expensive_work:pass:files-and-event-stream
ℹ exit_code_independence=planted:exit1->pass clean:exit0->clean
✖ FLOW-GRD-03-FILES-AND-STREAM (116.768833ms)
ℹ tests 9
ℹ suites 0
ℹ pass 6
ℹ fail 3
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 6070.587042

✖ failing tests:

test at tests/sprint-01/grd-03-evidence.test.mjs:148:1
✖ FLOW-GRD-03-FILES-AND-STREAM (849.765791ms)
  AssertionError [ERR_ASSERTION]: a denied required read is fail even on exit 0
  + actual - expected
  
  + 'could-not-run'
  - 'fail'
  
      at TestContext.<anonymous> (file:///Users/justinrich/Projects/pixel-perfect/.kb-run-sprint/worktrees/sprint-01-evaluator-evidence-spine/T11/tests/sprint-01/grd-03-evidence.test.mjs:208:12)
      at async Test.run (node:internal/test_runner/test:1125:7)
      at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3) {
    generatedMessage: false,
    code: 'ERR_ASSERTION',
    actual: 'could-not-run',
    expected: 'fail',
    operator: 'strictEqual',
    diff: 'simple'
  }

test at tests/sprint-01/grd-03-evidence.test.mjs:693:1
✖ FLOW-GRD-03-FILES-AND-STREAM (69.325875ms)
  AssertionError [ERR_ASSERTION]: an observable denial is a fail block: [{"verdict":"could-not-run","reason":"model-never-answered","stop_reason":"stop_sequence","terminal_reason":"api_error","subtype":"success"},{"verdict":"pass","reason":null}]
      at TestContext.<anonymous> (file:///Users/justinrich/Projects/pixel-perfect/.kb-run-sprint/worktrees/sprint-01-evaluator-evidence-spine/T11/tests/sprint-01/grd-03-evidence.test.mjs:868:10)
      at async Test.run (node:internal/test_runner/test:1125:7)
      at async Test.processPendingSubtests (node:internal/test_runner/test:787:7) {
    generatedMessage: false,
    code: 'ERR_ASSERTION',
    actual: undefined,
    expected: true,
    operator: '==',
    diff: 'simple'
  }

test at tests/sprint-01/grd-03-evidence.test.mjs:1295:1
✖ FLOW-GRD-03-FILES-AND-STREAM (116.768833ms)
  AssertionError [ERR_ASSERTION]: a denied required read on exit 0 graded pass: [{"verdict":"pass","reason":null}]
  
  'pass' !== 'fail'
  
      at TestContext.<anonymous> (file:///Users/justinrich/Projects/pixel-perfect/.kb-run-sprint/worktrees/sprint-01-evaluator-evidence-spine/T11/tests/sprint-01/grd-03-evidence.test.mjs:1379:12)
      at async Test.run (node:internal/test_runner/test:1125:7)
      at async Test.processPendingSubtests (node:internal/test_runner/test:787:7) {
    generatedMessage: false,
    code: 'ERR_ASSERTION',
    actual: 'pass',
    expected: 'fail',
    operator: 'strictEqual',
    diff: 'simple'
  }
@@GATE-EXIT=1@@
