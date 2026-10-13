---
stability: TEST_SPEC
last_validated: 2026-10-13
prd_version: 1.0.0
---

# E2E / Human Testing Criteria for Harness eval framework

Version 1.0.0. Date 2026-10-13. Every acceptance criterion has one row. Live rows run on a real GitHub-hosted runner with real CLIs and real API keys. They are not mocked.

## GRD: Harness grades

### UC-GRD-01: Read pass, fail, or could-not-run

| # | Criterion | AC Ref | Type | Setup | Pass/Fail |
|---|-----------|--------|------|-------|-----------|
| T-GRD-001 | Maintainer can read a result of pass, fail, or could-not-run for Claude Code, Codex, Grok, OpenCode, Pi, and Cursor from the finished run's summary | AC-1 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |
| T-GRD-002 | Maintainer can read that result for the pinned version and for the newest version of each of those harnesses | AC-2 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |
| T-GRD-003 | Maintainer can see that Cursor is present as a real channel and is never omitted | AC-3 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |
| T-GRD-004 | Maintainer can read the summary without a navigable product screen | AC-4 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |
| T-GRD-005 | Maintainer can read a finished run that has no screenshot score and can see that the missing score is not a gap | AC-5 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |
| T-GRD-006 | Maintainer can rely on no model having judged screenshots and on design fidelity staying out of the grade | AC-6 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |

### UC-GRD-02: Read the four grades

| # | Criterion | AC Ref | Type | Setup | Pass/Fail |
|---|-----------|--------|------|-------|-----------|
| T-GRD-007 | Maintainer can read a command-list grade, a status grade, a verify grade on a planted defect, and a grade for whether the first turn reached a question before expensive work | AC-1 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |
| T-GRD-008 | Maintainer can read those four grades for each harness on the pinned version and on the newest version | AC-2 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |
| T-GRD-009 | Maintainer can rely on these first checks asking no question and using no scripted answer | AC-3 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |

### UC-GRD-03: Read grades from evidence, not the exit code

| # | Criterion | AC Ref | Type | Setup | Pass/Fail |
|---|-----------|--------|------|-------|-----------|
| T-GRD-010 | Maintainer can read, from the summary, that each grade comes from files and the event stream | AC-1 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |
| T-GRD-011 | Maintainer can treat an exit code of 0 as not success | AC-2 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |
| T-GRD-012 | Maintainer can see a denied tool call and can see that the grade fails even when the process exited 0 | AC-3 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |

### UC-GRD-04: Read the planted defect when verify fails

| # | Criterion | AC Ref | Type | Setup | Pass/Fail |
|---|-----------|--------|------|-------|-----------|
| T-GRD-013 | Maintainer can read the name of the known planted defect when verify fails | AC-1 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |
| T-GRD-014 | Maintainer can read a report file when verify fails, at the path the failing case names | AC-2 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |
| T-GRD-015 | Maintainer can rely on the grader not inventing that report filename | AC-3 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |
| T-GRD-016 | Maintainer can read, in that report, the harness, whether the version was pinned or newest, and the name of the planted defect | AC-4 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |
| T-GRD-017 | Maintainer can tell a missed defect apart from could-not-run | AC-5 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |
| T-GRD-018 | Maintainer can see a denied tool call in that report even when the process exited 0 | AC-6 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |

### UC-GRD-05: Read a clean project as not a verify failure

| # | Criterion | AC Ref | Type | Setup | Pass/Fail |
|---|-----------|--------|------|-------|-----------|
| T-GRD-019 | Maintainer can see that the same verify check on the clean twin does not fail | AC-1 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |
| T-GRD-020 | Maintainer can rely on a clean project not being reported as a verify failure | AC-2 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |

### UC-GRD-06: Fail a run that is missing its credential

| # | Criterion | AC Ref | Type | Setup | Pass/Fail |
|---|-----------|--------|------|-------|-----------|
| T-GRD-021 | Maintainer can rely on a run with a missing API key failing | AC-1 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |
| T-GRD-022 | Maintainer can rely on that missing-key result not being readable as a pass | AC-2 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |

## REL: Release holds

### UC-REL-01: Hold the next release for a pinned failure

| # | Criterion | AC Ref | Type | Setup | Pass/Fail |
|---|-----------|--------|------|-------|-----------|
| T-REL-001 | Maintainer can rely on a pinned-version graded failure blocking the next release | AC-1 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |
| T-REL-002 | Maintainer can read, in the summary, the harness and the grade that blocked the release | AC-2 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |
| T-REL-003 | Maintainer can rely on an exit code of 0 not clearing that block | AC-3 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |
| T-REL-004 | Maintainer can rely on an open fix pull request not clearing that block | AC-4 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |

### UC-REL-02: Warn on a newest-only graded failure

| # | Criterion | AC Ref | Type | Setup | Pass/Fail |
|---|-----------|--------|------|-------|-----------|
| T-REL-005 | Maintainer can read a warning, rather than a release block, when the only break is a graded failure on the newest version | AC-1 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |
| T-REL-006 | Maintainer can read, in the summary, that the pinned release is not blocked by those newest results | AC-2 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |
| T-REL-007 | Maintainer can open the fix pull request from that warning and can see it waiting for a person to merge it onto main | AC-3 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |
| T-REL-008 | Maintainer can rely on the open pull request not counting as a cleared release | AC-4 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |
| T-REL-009 | Maintainer can rely on the run not publishing a release | AC-5 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |

### UC-REL-03: Review the newest-only fix

| # | Criterion | AC Ref | Type | Setup | Pass/Fail |
|---|-----------|--------|------|-------|-----------|
| T-REL-010 | Maintainer can read, in the fix pull request, which harness failed on the newest version rather than the pinned version | AC-1 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |
| T-REL-011 | Maintainer can read which of the four grades failed | AC-2 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |
| T-REL-012 | Maintainer can read where the evidence is, including the verify report and the named defect when the failed grade is verify | AC-3 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |
| T-REL-013 | Maintainer can merge or reject that pull request | AC-4 | [human-gate] | A real pull request opened by the heal app. A person merges or rejects it. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |
| T-REL-014 | Maintainer can rely on merging it not clearing a pinned release block | AC-5 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |
| T-REL-015 | Maintainer can rely on a newest-only graded break waiting on that merge without itself blocking the release | AC-6 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |

### UC-REL-04: Hold the release when a harness could not run

| # | Criterion | AC Ref | Type | Setup | Pass/Fail |
|---|-----------|--------|------|-------|-----------|
| T-REL-016 | Maintainer can read could-not-run as its own result, not as a pass and not as a graded product failure | AC-1 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |
| T-REL-017 | Maintainer can read why the harness did not run | AC-2 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |
| T-REL-018 | Maintainer can rely on could-not-run failing the release on the pinned version or on the newest version | AC-3 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |
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
| T-RPT-004 | Maintainer can rely on scripted answers using one resume-with-text path for Claude Code, Codex, Grok, OpenCode, Pi, and Cursor | AC-1 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |
| T-RPT-005 | Maintainer can rely on that path being used for later answers only | AC-2 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |
| T-RPT-006 | Maintainer can rely on the first checks still asking nothing when this later path exists | AC-3 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |

## RUN: Scheduled and hand grades

### UC-RUN-01: Start the nightly grade

| # | Criterion | AC Ref | Type | Setup | Pass/Fail |
|---|-----------|--------|------|-------|-----------|
| T-RUN-001 | Maintainer can leave the grade to start on its own at 06:17 UTC | AC-1 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |
| T-RUN-002 | Maintainer can read that this nightly start installs pixel-perfect into Claude Code, Codex, Grok, OpenCode, Pi, and Cursor | AC-2 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |
| T-RUN-003 | Maintainer can rely on a pull request not being what starts this nightly grade | AC-3 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |

### UC-RUN-02: Start the grade by hand

| # | Criterion | AC Ref | Type | Setup | Pass/Fail |
|---|-----------|--------|------|-------|-----------|
| T-RUN-004 | Maintainer can start the grade by hand before the night run | AC-1 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |
| T-RUN-005 | Maintainer can read the same six harnesses on the hand start as on the nightly start | AC-2 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |
| T-RUN-006 | Maintainer can read the command list, status, verify on a planted defect, and whether the first turn reached a question before expensive work on that hand start | AC-3 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |

### UC-RUN-03: Grade accepted plugin changes, not a proposal

| # | Criterion | AC Ref | Type | Setup | Pass/Fail |
|---|-----------|--------|------|-------|-----------|
| T-RUN-007 | Maintainer can rely on a grade starting after a merge to main when the plugin changes | AC-1 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |
| T-RUN-008 | Maintainer can rely on a pull request not starting this grade | AC-2 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |
| T-RUN-009 | Maintainer can read the same six-harness grade from that post-merge run as from the nightly run | AC-3 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |
| T-RUN-010 | Maintainer can rely on accepted work for this initiative staying on main, with no pull request tracked per sprint | AC-4 | [e2e-automated] | Real harness-eval workflow on a GitHub-hosted runner, real CLIs, real keys in harness-smoke. Not mocked. | The observable result in the criterion is true on a real run, and the opposite input does not produce it. |

## Summary

| Type | Count |
|------|-------|
| build-gate | 3 |
| e2e-automated | 61 |
| human-gate | 1 |
| Total | 65 |

## Maintenance

Add a row when an acceptance criterion is added. Keep the `T-{PREFIX}-{NNN}` id stable. Do not renumber a row that later sprints already cite.

