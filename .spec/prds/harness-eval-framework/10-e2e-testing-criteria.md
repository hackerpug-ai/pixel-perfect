---
stability: TEST_SPEC
last_validated: 2026-10-14
prd_version: 1.0.1
---

# E2E / Human Testing Criteria for Harness eval framework

Version 1.0.1. Date 2026-10-14. Every acceptance criterion has one row. Live rows run on a real GitHub-hosted runner with real CLIs and real API keys. They are not mocked.

## GRD: Harness grades

### UC-GRD-01: Read pass, fail, or could-not-run

| # | Criterion | AC Ref | Type | Setup | Pass/Fail |
|---|-----------|--------|------|-------|-----------|
| T-GRD-001 | Maintainer can read a result of pass, fail, or could-not-run for Claude Code, Codex, Grok, OpenCode, Pi, and Cursor from the finished run's summary | AC-1 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |
| T-GRD-002 | Maintainer can read that result for the pinned and newest versions of each harness, bound to the observed CLI version and actual loaded plugin revision and digest | AC-2 | [e2e-automated] | Distinct release and checkout revisions plus an intentionally stale real cache; FLOW-GRD-01-LOADED-IDENTITY. | Observed loaded digests/CLI versions match the selected identity; mismatch is could-not-run; equal versions preserve both tracks. |
| T-GRD-003 | Maintainer can see that Cursor is present as a real channel and is never omitted | AC-3 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |
| T-GRD-004 | Maintainer can read the summary without a navigable product screen | AC-4 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |
| T-GRD-005 | Maintainer can read a finished run that has no screenshot score and can see that the missing score is not a gap | AC-5 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |
| T-GRD-006 | Maintainer can rely on no model having judged screenshots and on design fidelity staying out of the grade | AC-6 | [e2e-automated] | Real structural-only public verify plus a deliberate real image-judge negative control; FLOW-GRD-01-HIDDEN-IMAGE-JUDGE. | Complete child/tool/model evidence proves no screenshot judging; a hidden judge call fails; incomplete observation is could-not-run. |

### UC-GRD-02: Read the four grades

| # | Criterion | AC Ref | Type | Setup | Pass/Fail |
|---|-----------|--------|------|-------|-----------|
| T-GRD-007 | Maintainer can read a command-list grade, a status grade, a verify grade on a planted defect, and a grade for whether the first turn reached a question before expensive work | AC-1 | [e2e-automated] | Real list, two factual status fixtures, planted/clean verify pair, and empty-project init; FLOW-GRD-02-FOUR-GRADES, STATUS-FACTS, MUST-ASK. | Four independent verdicts; generic status, missed defect, clean false positive, or expensive work before the question fails its check. |
| T-GRD-008 | Maintainer can read those four grades for each harness on the pinned version and on the newest version | AC-2 | [e2e-automated] | Repeat the four real cases for all twelve identity-qualified cells. | All six harnesses and both tracks have four checks with evidence; missing mapping is could-not-run, not omission. |
| T-GRD-009 | Maintainer can rely on list, status, and verify asking no question, while the separate must-ask probe stops at its first question and none consumes a scripted answer | AC-3 | [e2e-automated] | Separate ask-nothing list/status/verify and must-ask init with incremental capture. | First three ask nothing; init stops at first valid question; zero scripted answers consumed by any of these checks. |

### UC-GRD-03: Read grades from evidence, not the exit code

| # | Criterion | AC Ref | Type | Setup | Pass/Fail |
|---|-----------|--------|------|-------|-----------|
| T-GRD-010 | Maintainer can read, from the summary, that each grade comes from files and the event stream | AC-1 | [e2e-automated] | Real per-version streams and content-hashed fixture/report evidence; FLOW-GRD-03-EVENT-COVERAGE. | Every verdict cites original_event/capture offsets and files; opaque required events cannot establish absence. |
| T-GRD-011 | Maintainer can treat an exit code of 0 as not success | AC-2 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |
| T-GRD-012 | Maintainer can see a denied tool call and can see that the grade fails even when the process exited 0 | AC-3 | [e2e-automated] | Real required-read denial, including an observed exit-0 case, for each supported mapping. | Observed denial yields fail regardless of exit code; missing denial mapping yields could-not-run. |

### UC-GRD-04: Read the planted defect when verify fails

| # | Criterion | AC Ref | Type | Setup | Pass/Fail |
|---|-----------|--------|------|-------|-----------|
| T-GRD-013 | Maintainer can read the observed planted defect by its canonical key even when correct detection earns an evaluation pass | AC-1 | [e2e-automated] | Real atoms/Button/default planted defect and clean twin. | Report cites actual detected canonical key; correct detection plus clean pass earns evaluation pass; copied metadata alone cannot pass. |
| T-GRD-014 | Maintainer can read the evidence-bound planted and clean verify reports at the exact paths their cases declare, including when evaluation passes | AC-2 | [e2e-automated] | Exact case-declared report paths; unrelated/stale/swapped report controls. | Both invocation-bound reports persist and validate; unrelated file cannot substitute; storage failure is could-not-run. |
| T-GRD-015 | Maintainer can rely on the grader not inventing that report filename | AC-3 | [e2e-automated] | Confined case path plus traversal, symlink, and unwritable-directory controls. | No alternative filename or path escape; invalid path refuses before writing; no discovery fallback. |
| T-GRD-016 | Maintainer can read, in that report, the harness, whether the version was pinned or newest, and the name of the planted defect | AC-4 | [e2e-automated] | Two distinct real harness/track/invocation reports; swap bodies as a negative control. | Harness, track, canonical defect, identity, and evidence hashes match the producing invocation; swapped body rejected. |
| T-GRD-017 | Maintainer can tell a missed defect apart from could-not-run | AC-5 | [e2e-automated] | Real missed defect versus unavailable model/setup controls. | Missed defect is fail; unavailable prerequisites are could-not-run; neither passes or borrows expected metadata. |
| T-GRD-018 | Maintainer can see a denied tool call in that report even when the process exited 0 | AC-6 | [e2e-automated] | Real denied read with exit 0 and its exact case report. | Report names denied operation and observed evidence; evaluated check fails. |

### UC-GRD-05: Read a clean project as not a verify failure

| # | Criterion | AC Ref | Type | Setup | Pass/Fail |
|---|-----------|--------|------|-------|-----------|
| T-GRD-019 | Maintainer can see that the same verify check on the clean twin does not fail | AC-1 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |
| T-GRD-020 | Maintainer can rely on a clean project not being reported as a verify failure | AC-2 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |

### UC-GRD-06: Fail a run that is missing its credential

| # | Criterion | AC Ref | Type | Setup | Pass/Fail |
|---|-----------|--------|------|-------|-----------|
| T-GRD-021 | Maintainer can rely on a missing consumed API key producing could-not-run and blocking release before any model request | AC-1 | [e2e-automated] | Remove actual consumed keys and fallback stores; Grok XAI_API_KEY, Pi GEMINI_API_KEY; pair with real authenticated controls. | Guard records missing-api-key/could-not-run before any model request; release blocks and no repair opens. |
| T-GRD-022 | Maintainer can rely on that missing-key result not being readable as a pass | AC-2 | [e2e-automated] | Use missing and invalid consumed keys on real isolated invocations. | Missing/authentication-rejected states never become pass through exit 0 or another harness credential. |

## REL: Release holds

### UC-REL-01: Hold the next release for a pinned failure

| # | Criterion | AC Ref | Type | Setup | Pass/Fail |
|---|-----------|--------|------|-------|-----------|
| T-REL-001 | Maintainer can rely on a pinned-version evaluated failure blocking release until a trusted, complete checkout evaluation for the exact publish commit clears it within its 36-hour lifetime | AC-1 | [e2e-automated] | Real GitHub producer/run/attempt/status/artifact records; FLOW-REL-01-AUTHORITATIVE-RUN and PUBLISHED-HOLD. | Pinned evaluation failure blocks; old success, expired evidence, wrong producer, pending/cancelled latest attempt cannot authorize; only qualifying fresh checkout clears. |
| T-REL-002 | Maintainer can read, in the summary, the harness and the grade that blocked the release | AC-2 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |
| T-REL-003 | Maintainer can rely on an exit code of 0 not clearing that block | AC-3 | [e2e-automated] | Failing real grade despite process exit 0; trusted latest run. | Release dry-run refuses from actual grades, never exit status. |
| T-REL-004 | Maintainer can rely on an open fix pull request not clearing that block | AC-4 | [e2e-automated] | Independent pinned block and real newest-fix PR. | Open PR leaves pinned block and original evidence unchanged. |

### UC-REL-02: Warn on a newest-only graded failure

| # | Criterion | AC Ref | Type | Setup | Pass/Fail |
|---|-----------|--------|------|-------|-----------|
| T-REL-005 | Maintainer can read a warning, rather than a release block, when the only break is a graded failure on the newest version | AC-1 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |
| T-REL-006 | Maintainer can read, in the summary, that the pinned release is not blocked by those newest results | AC-2 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |
| T-REL-007 | Maintainer can open the fix pull request from that warning and can see it waiting for a person to merge it onto main | AC-3 | [e2e-automated] | Real newest failure reproduced on main, direct CLI repair, exact patch confirmation, real app PR. | Summary links confirmed PR awaiting human decision; ineffective/unreproduced/forbidden patch opens none with visible reason. |
| T-REL-008 | Maintainer can rely on the open pull request not counting as a cleared release | AC-4 | [e2e-automated] | Real newest-fix PR and release resolver. | PR existence does not supply checkout proof or clear holds/freshness failures. |
| T-REL-009 | Maintainer can rely on the run not publishing a release | AC-5 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |

### UC-REL-03: Review the newest-only fix

| # | Criterion | AC Ref | Type | Setup | Pass/Fail |
|---|-----------|--------|------|-------|-----------|
| T-REL-010 | Maintainer can read, in the fix pull request, which harness failed on the newest version rather than the pinned version | AC-1 | [e2e-automated] | FLOW-REL-03-PERSON-DECIDES with a real OpenCode newest missed-defect failure. | PR identifies newest, original check/report, source evaluation, repair base, patch digest, and confirmation. |
| T-REL-011 | Maintainer can read which of the four grades failed | AC-2 | [e2e-automated] | Real confirmed newest repair PR. | PR names the actual motivating check; no expected planted detection is mislabeled a product failure. |
| T-REL-012 | Maintainer can read where the evidence is, including the verify report and the named defect when the failed grade is verify | AC-3 | [e2e-automated] | Actual failure reports and confirmation artifacts linked from app-created PR. | Evidence resolves to bound run/attempt/invocation and names canonical defect when relevant; unavailable evidence is not fabricated. |
| T-REL-013 | Maintainer can merge or reject that pull request | AC-4 | [human-gate] | Real GitHub UI; two distinct app-created newest-fix PRs; designated human; independent pinned block. | Person follows summary link, reviews evidence/diff, merges one and rejects the other; retain actor/time/PR/head receipts; neither decision alone clears pinned block. |
| T-REL-014 | Maintainer can rely on merging it not clearing a pinned release block | AC-5 | [e2e-automated] | Human newest-fix merge with independent pinned failure. | Merge alone preserves block; only a subsequent qualifying checkout evaluation may clear it. |
| T-REL-015 | Maintainer can rely on a newest-only graded break waiting on that merge without itself blocking the release | AC-6 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |

### UC-REL-04: Hold the release when a harness could not run

| # | Criterion | AC Ref | Type | Setup | Pass/Fail |
|---|-----------|--------|------|-------|-----------|
| T-REL-016 | Maintainer can read could-not-run as its own result, not as a pass and not as a graded product failure | AC-1 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |
| T-REL-017 | Maintainer can read why the harness did not run | AC-2 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |
| T-REL-018 | Maintainer can rely on could-not-run failing the release on the pinned version or on the newest version | AC-3 | [e2e-automated] | Any real could-not-run cell on either track, including Cursor. | Release dry-run refuses; incomplete/absent cells cannot be hidden by other passes. |
| T-REL-019 | Maintainer can rely on could-not-run not opening a fix pull request | AC-4 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |
| T-REL-020 | Maintainer can read the release effect next to that result and does not have to infer it from the exit code | AC-5 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |
| T-REL-021 | Maintainer can rely on Cursor not being exempted from this could-not-run block while the owner has not said to exempt it | AC-6 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |

### UC-REL-05: Refuse a release for plugin drift

| # | Criterion | AC Ref | Type | Setup | Pass/Fail |
|---|-----------|--------|------|-------|-----------|
| T-REL-022 | Maintainer can rely on a release being refused when the plugin's command list, adapters, or question rules have drifted, even when no live harness was graded | AC-1 | [build-gate] | The existing validate and release scripts on a real checkout, plus the drift status. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |
| T-REL-023 | Maintainer can rely on that same proof still covering manifests, the 11 public skill names, runtime paths, question-shape rules, contract wiring, and package contents | AC-2 | [build-gate] | The existing validate and release scripts on a real checkout, plus the drift status. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |
| T-REL-024 | Maintainer can rely on that proof not looking at pixels | AC-3 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |
| T-REL-025 | Maintainer can rely on that proof not standing in for a live harness result | AC-4 | [build-gate] | The existing validate and release scripts on a real checkout, plus the drift status. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |
| T-REL-026 | Maintainer can read command-list drift and question-rule drift, including drift of the question-before-expensive-work rule, apart from the live grades | AC-5 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |
| T-REL-027 | Maintainer can read a release refusal that names drift or a live pinned break without mixing the two | AC-6 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |

## RPT: Later reports

### UC-RPT-01: Read later checks that do not hold a release

| # | Criterion | AC Ref | Type | Setup | Pass/Fail |
|---|-----------|--------|------|-------|-----------|
| T-RPT-001 | Maintainer can read a result for decline a change, scripted answers, resume, one full layer, and plain-language command choice | AC-1 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |
| T-RPT-002 | Maintainer can rely on those results not blocking a release | AC-2 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |
| T-RPT-003 | Maintainer can rely on those results not appearing as the reason a release was blocked | AC-3 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |

### UC-RPT-02: Carry a later answer on one resume path

| # | Criterion | AC Ref | Type | Setup | Pass/Fail |
|---|-----------|--------|------|-------|-----------|
| T-RPT-004 | Maintainer can rely on scripted answers using one resume-with-text path for Claude Code, Codex, Grok, OpenCode, Pi, and Cursor | AC-1 | [e2e-automated] | Real persisted native session per harness, second process, context absent from answer; missing-session control. | Same native conversation continues using prior context; Pi later path persists; missing state is could-not-run without fresh-session fallback. |
| T-RPT-005 | Maintainer can rely on that path being used for later answers only | AC-2 | [e2e-automated] | Capture first-check and later invocation streams/session IDs. | Only later cases deliver scripted answers via resume-with-text. |
| T-RPT-006 | Maintainer can rely on list, status, and verify still asking nothing and the separate must-ask probe receiving no answer when this later path exists | AC-3 | [e2e-automated] | Run first checks alongside queued later answers. | List/status/verify ask nothing; must-ask stops without answer; no queued text leaks into either. |

## RUN: Scheduled and hand grades

### UC-RUN-01: Start the nightly grade

| # | Criterion | AC Ref | Type | Setup | Pass/Fail |
|---|-----------|--------|------|-------|-----------|
| T-RUN-001 | Maintainer can rely on a daily 06:17 UTC schedule request for published evaluation, with actual Actions start times recorded and no exact-start guarantee | AC-1 | [e2e-automated] | Inspect deployed cron and actual GitHub schedule event; delayed/missing-run observation. | Cron requests 06:17 UTC, actual timestamps retained; no exact-second promise or invented missed-tick success. |
| T-RUN-002 | Maintainer can read that this nightly start installs pixel-perfect into Claude Code, Codex, Grok, OpenCode, Pi, and Cursor | AC-2 | [e2e-automated] | Actual published nightly with one resolved release and twelve cells. | Six named harnesses on both tracks share published identity; no checkout substitution. |
| T-RUN-003 | Maintainer can rely on a pull request not being what starts this nightly grade | AC-3 | [e2e-automated] | Actual PR/fork/unauthorized dispatch controls against deployed workflow. | No secret-bearing eval from forbidden event; metadata cannot be relabeled scheduled. |

### UC-RUN-02: Start the grade by hand

| # | Criterion | AC Ref | Type | Setup | Pass/Fail |
|---|-----------|--------|------|-------|-----------|
| T-RUN-004 | Maintainer can start the grade by hand, choosing published or checkout mode with checkout as the default | AC-1 | [e2e-automated] | Two real manual dispatches: default and explicit published. | Default selects exact checkout; explicit published resolves release once; both record mode and actual identity. |
| T-RUN-005 | Maintainer can read the same six harnesses on the hand start as on the nightly start | AC-2 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |
| T-RUN-006 | Maintainer can read the command list, status, verify on a planted defect, and whether the first turn reached a question before expensive work on that hand start | AC-3 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |

### UC-RUN-03: Grade accepted plugin changes, not a proposal

| # | Criterion | AC Ref | Type | Setup | Pass/Fail |
|---|-----------|--------|------|-------|-----------|
| T-RUN-007 | Maintainer can rely on an exact-checkout grade starting after accepted plugin changes are pushed to main | AC-1 | [e2e-automated] | Accepted plugin push with actual full SHA and install/load evidence. | Checkout grade binds loaded bytes to exact pushed commit; PR event does not trigger it. |
| T-RUN-008 | Maintainer can rely on a pull request not starting this grade | AC-2 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |
| T-RUN-009 | Maintainer can read the same six-harness grade from that post-merge run as from the nightly run | AC-3 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |
| T-RUN-010 | Maintainer can rely on accepted work for this initiative staying on main, with no pull request tracked per sprint | AC-4 | [process-gate] | Authoritative sprint tracker path/revision, accepted contribution SHA list, and acceptance main SHA; FLOW-RUN-03-TRUNK-HISTORY. | Every accepted SHA is reachable from main and tracker has no per-sprint PR sequencing; divergent contribution or PR-sequenced tracker fails. |

## Summary

| Type | Count |
|------|-------|
| build-gate | 3 |
| e2e-automated | 60 |
| human-gate | 1 |
| process-gate | 1 |
| Total | 65 |

## Maintenance

Add a row when an acceptance criterion is added. Keep the `T-{PREFIX}-{NNN}` id stable. Do not renumber a row that later sprints already cite.

