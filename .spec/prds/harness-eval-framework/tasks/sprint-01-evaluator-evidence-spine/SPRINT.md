---
sequence: 1
timeline: Phase 1
status: planned
sprint_id: sprint-01-evaluator-evidence-spine
prd: ../..
planned_from_roadmap_sha: 88a184d264129d38d77869e8678361d279073128fd9269242b439cdb28c8dcc4
planned_at: 2026-10-28
base_branch: main
integration_schedule:
  version: "1"
---

# Sprint 1: Evidence spine and evaluator core: dispatchable harness-eval run, one real harness graded end to end on a real runner, twelve fail-closed cells

**Status:** Planned
**Sequence:** 1
**Timeline:** Phase 1

## Overview

Committed in ROADMAP.md as Sprint 01. This candidate was rendered by the kb-sprint-tasks-plan
pipeline after its flow lock and all 24 AC scenario contracts passed the three planning
validators (validate_scenario, sprint_graph check, flow_coverage_check task-plan gate).
Flow lock: `human-flows.json` beside this file (8 flows: six task-scope GRD flows, RUN-02-HAND
task-scope, JRN-PLANTED-AND-TWIN journey proven post-integration by T7).

## Human Testing Gate

**Gate:** Done means the maintainer can run `gh workflow run harness-eval --repo hackerpug-ai/pixel-perfect` and read, from the finished run's harness-eval-result artifact, twelve unique (harness, track) cells bound to a 64-hex pins_sha256, in which both claude-code cells each carry command_list, status, verify, and question_before_expensive_work verdicts graded from files-and-event-stream evidence and bound to observed CLI versions and loaded-plugin manifest digests, the verify report names atoms/Button/default at exactly reports/verify-button-drift.json with the clean twin reports/verify-clean.json showing clean_project_failed=false, cursor reads could-not-run/missing-api-key while the four adapter-pending harnesses read could-not-run with named reasons rather than omission, and the controls array records stale-cache, exit0-denied-read, missing-key, and hidden-image-judge negative-control outcomes, proven by jq checks on the downloaded artifact that fail if any cell, identity binding, case-declared report, or negative control is absent.

**Entrypoint:** gh workflow run harness-eval --repo hackerpug-ai/pixel-perfect (product surface 1), read via the run's harness-eval-result artifact and Actions summary (product surface 2)

**Shape:** product

**Before:** harness-eval workflow does not exist: gh workflow list --repo hackerpug-ai/pixel-perfect --all prints no harness-eval row (only ci.yml, pages.yml, tag-release.yml); test/harness/pins.json does not exist; plugins/pixel-perfect/harness does not exist; no grader, stream mapping, or grade writer exists anywhere in the repo — there is no way to grade any harness from evidence.

**Demonstrates:** UC-GRD-01, UC-GRD-02, UC-GRD-03, UC-GRD-04, UC-GRD-05, UC-GRD-06, UC-RUN-02

**Proves (ACs):** UC-GRD-01: AC-1, AC-3, AC-4, AC-5, AC-6; UC-GRD-02: AC-1, AC-2, AC-3; UC-GRD-03: AC-1, AC-2, AC-3; UC-GRD-04: AC-1, AC-2, AC-3, AC-4, AC-5, AC-6; UC-GRD-05: AC-1, AC-2; UC-GRD-06: AC-1, AC-2; UC-RUN-02: AC-1, AC-2, AC-3

**Forecast:** ~3.5 d (7 waves × 0.5 d/wave, default pace) · horizon 3 d · over ×1.2 — owner-approved (D-01)

**First integrated demonstration:** gh workflow dispatch on hackerpug-ai/pixel-perfect → run completes (conclusion may fail while Cursor lacks a key — the framework refusing) → download harness-eval-result artifact → jq reads twelve cells, claude-code graded checks, verify reports, and the controls array; requires harness-smoke env with ANTHROPIC_API_KEY (owner prerequisite); smallest prerequisite group T1–T9; proof/repair owner: evals-implementer (grader) + github-platform-implementer (recorder).

**Owner questions (answer before START):** Approve the recorded permission stance candidate for claude-code graded runs (`--permission-mode dontAsk` plus `--add-dir` of the plugin root; bypassPermissions rejected), the exact flags remaining an engineering choice under the not-approve-everything constraint — answered: approved 2026-10-28 by the repo owner, with bypassPermissions explicitly rejected — needed by sprint-01 T5; Create the `harness-smoke` environment with the model credentials — answered: the environment already exists with `SMOKE_CLAUDE_KEY`, `SMOKE_CODEX_KEY`, `SMOKE_GROK_KEY`, `SMOKE_OPENCODE_KEY` and `SMOKE_PI_KEY`; the workflow consumes those names and never a new `ANTHROPIC_API_KEY` — needed by sprint-01 gate; Confirm the initial pinned claude-code CLI version for `test/harness/pins.json` — answered: pin 2.1.291, subject to qualification on a real hosted runner — needed by sprint-01 T2.

## Test Deliverable

**Test Steps:** *(each stranger-runnable verbatim; the gate is RED until step 1 passes)*

<!-- TESTING-GATE-START -->
- [ ] 1. Run `gh workflow list --repo hackerpug-ai/pixel-perfect --all` — One line contains `harness-eval` and `active`. Before this sprint no such line exists (only ci.yml, pages.yml, tag-release.yml).   _exercises: T1_

- [ ] 2. Run `gh workflow run harness-eval --repo hackerpug-ai/pixel-perfect && sleep 15 && gh run list --workflow harness-eval --repo hackerpug-ai/pixel-perfect --limit 1 --json databaseId,event,status --jq '.[0] | (.databaseId|tostring) + " " + .event + " " + .status'` — One line ending in `workflow_dispatch` plus `queued` or `in_progress` (no install_mode input was passed, so the run uses the checkout default).   _exercises: T1, T8_

- [ ] 3. Run `RUN_ID=$(gh run list --workflow harness-eval --repo hackerpug-ai/pixel-perfect --limit 1 --json databaseId --jq '.[0].databaseId') && gh run watch $RUN_ID --repo hackerpug-ai/pixel-perfect; gh run view $RUN_ID --repo hackerpug-ai/pixel-perfect --json status --jq .status` — `completed`. The conclusion may be failure while Cursor has no key — that is the framework refusing (fail-closed), not an error; the artifact checks below are the proof. Job list shows the twelve-cell smoke matrix and the grade recorder.   _exercises: T1, T8_

- [ ] 4. Run `gh api repos/hackerpug-ai/pixel-perfect/actions/runs/$RUN_ID/artifacts --jq '.artifacts[].name'` — Output includes `harness-eval-result-<RUN_ID>-1` and `harness-eval-verify-reports-<RUN_ID>-1` (attempt-qualified physical names).   _exercises: T8_

- [ ] 5. Run `rm -rf /tmp/he1 && gh run download $RUN_ID --repo hackerpug-ai/pixel-perfect -n harness-eval-result-$RUN_ID-1 -D /tmp/he1 && jq '.cells | length' /tmp/he1/harness-eval-result.json && jq '[.cells[].harness] | unique | length' /tmp/he1/harness-eval-result.json && jq -r '.pins_sha256' /tmp/he1/harness-eval-result.json` — `12`, then `6`, then a 64-character hex string (twelve cells, all six harnesses including cursor, pins bound by digest).   _exercises: T8, T10, T2_

- [ ] 6. Run `jq -r '.cells[] | select(.harness=="claude-code" and .track=="pinned") | .checks[] | .check_id + " " + .verdict' /tmp/he1/harness-eval-result.json` — Exactly four lines: `command_list pass`, `status pass`, `verify pass`, `question_before_expensive_work pass` (any other verdict word is a real finding the gate surfaces, not a setup error).   _exercises: T5, T7, T9_

- [ ] 7. Run `jq -r '.cells[] | select(.harness=="claude-code") | .track + " cli=" + .installation.observed_cli_version + " manifest=" + ((.installation.observed_plugin_manifest_sha256 // "MISSING")[0:12])' /tmp/he1/harness-eval-result.json` — Two lines (pinned and newest), each with a dotted CLI version (for example `2.1.291`) and 12 hex characters after `manifest=`. Any `MISSING`, `null`, or empty version fails the step.   _exercises: T5, T2_

- [ ] 8. Run `rm -rf /tmp/he1v && gh run download $RUN_ID --repo hackerpug-ai/pixel-perfect -n harness-eval-verify-reports-$RUN_ID-1 -D /tmp/he1v && jq -r '.expected_defect_key + " " + .observed_defect_key + " " + .observed_verify_outcome' /tmp/he1v/reports/verify-button-drift.json && jq -r '.clean_project_failed' /tmp/he1v/reports/verify-clean.json && jq -r '.harness + " " + .track' /tmp/he1v/reports/verify-button-drift.json` — `atoms/Button/default atoms/Button/default defect-detected`, then `false`, then `claude-code pinned` (defect named by canonical key at the case-declared path; clean twin not a failure; report bound to its producing cell).   _exercises: T4, T7_

- [ ] 9. Run `jq -r '.cells[] | select(.harness=="cursor") | .checks[0].verdict + " " + .checks[0].reason' /tmp/he1/harness-eval-result.json && jq -r '[.cells[] | select(.harness=="codex" or .harness=="grok" or .harness=="opencode" or .harness=="pi") | .checks[0].verdict] | unique | join(",")' /tmp/he1/harness-eval-result.json` — First command prints `could-not-run missing-api-key` (cursor present as a real cell with the PRD's named day-one reason). Second prints exactly `could-not-run` — the four adapter-pending harnesses are present with named reasons, never omitted, never pass.   _exercises: T10_

- [ ] 10. Run `jq '[.cells[] | select(.harness=="claude-code" and .track=="pinned") | .checks[] | select(.source=="files-and-event-stream")] | length' /tmp/he1/harness-eval-result.json && jq -r '.cells[] | select(.harness=="claude-code" and .track=="pinned") | .checks[0].process_exit_code' /tmp/he1/harness-eval-result.json` — `4`, then a raw integer exit code printed as a diagnostic — the step-6 verdicts were graded from evidence and stand next to whatever this integer is. This whole step ran from the artifact with no product screen or UI session.   _exercises: T6, T3_

- [ ] 11. Run `jq -r '.controls[] | .control_id + " " + .verdict + " " + .reason' /tmp/he1/harness-eval-result.json` — Includes `missing-key could-not-run missing-api-key`, `stale-cache could-not-run installation-identity-mismatch`, `exit0-denied-read fail denied_tool_call`, and a `hidden-image-judge` row proving no screenshot judging occurred in the verify child tree.   _exercises: T9, T11_

- [ ] 12. Run `gh run view $RUN_ID --repo hackerpug-ai/pixel-perfect` — The run's summary renders the twelve-cell table with verdict word and observed CLI version per cell, cursor always present, and the release effect next to each result so no one infers it from the exit code.   _exercises: T8_

- [ ] 13. First contact: as the maintainer, run `gh workflow run harness-eval --repo hackerpug-ai/pixel-perfect`, open https://github.com/hackerpug-ai/pixel-perfect/actions/workflows/harness-eval.yml, click the newest run, and read the twelve-cell summary on the run page for THIS repo, holding these promises in mind — Promise (UC-GRD-01): "Sits under 'Maintainer reads pass, fail, or could-not-run for each harness on the pinned version and the newest version.' The summary is the reader. There is no product screen, and a missing screenshot score is not a gap." Promise (UC-GRD-02): "Sits under 'Maintainer reads the command list, status, verify on a planted defect, and whether the first turn asked before expensive work. List, status, and verify ask nothing. The separate must-ask probe asks once and stops without receiving an answer.'" Promise (UC-GRD-03): "Sits under 'Maintainer reads each grade from written results and the event stream.' A clean exit is not a pass, and a denied tool call is visible." Promise (UC-GRD-04): "Sits under 'Maintainer reads the planted defect when verify fails.' The failing case names the report path. The grader does not invent a filename." Promise (UC-GRD-05): "Sits under 'Maintainer reads a clean project as not a verify failure.' The clean twin of the planted-defect check does not fail." Promise (UC-GRD-06): "Sits under 'System fails a run that is missing its credential.' A missing key cannot be read as a pass." Promise (UC-RUN-02): "Sits under 'Maintainer starts the grade by hand.' A hand start grades the same harnesses and the same checks as the night run." State what you see about this repo's run: which cells carried live grades and which read could-not-run and why. — The maintainer reads the real summary on hackerpug-ai/pixel-perfect and can point at the twelve cells, the four graded claude-code checks, the verify report naming atoms/Button/default, the cursor missing-key refusal (expected day-one behavior, not a framework failure), and the controls rows.   _exercises: T1, T5, T8, T10_
<!-- TESTING-GATE-END -->

**Dark tasks:** T12 (3 pts) — A review task produces no observable product-surface behavior; its checks are exercised indirectly through gate steps 6-11 which fail if the reviewed contracts are broken. Only dark task: 3 of 60 points (~5%), under the 30% ceiling.

## Automated Functional Coverage

Locked flows (full commands in `human-flows.json`; each AC's verify is
`node --test tests/sprint-01/<flow>.test.mjs --test-name-pattern <FLOW-ID>`):

| Flow | Scope | Test file | Artifact | Red proof |
|------|-------|-----------|----------|-----------|
| FLOW-RUN-02-HAND | task | tests/sprint-01/run-02-hand.test.mjs | .tmp/sprint-01-verification/run-02-hand.json | .json.red |
| FLOW-GRD-01-TWELVE-CELLS | task | tests/sprint-01/grd-01-twelve-cells.test.mjs | .tmp/sprint-01-verification/grd-01-twelve-cells.json | .json.red |
| FLOW-GRD-02-FOUR-GRADES | task | tests/sprint-01/grd-02-four-grades.test.mjs | .tmp/sprint-01-verification/grd-02-four-grades.json | .json.red |
| FLOW-GRD-03-FILES-AND-STREAM | task | tests/sprint-01/grd-03-evidence.test.mjs | .tmp/sprint-01-verification/grd-03-evidence.json | .json.red |
| FLOW-GRD-04-NAMED-PATH | task | tests/sprint-01/grd-04-named-path.test.mjs | .tmp/sprint-01-verification/grd-04-named-path.json | .json.red |
| FLOW-GRD-05-CLEAN-TWIN | task | tests/sprint-01/grd-05-clean-twin.test.mjs | .tmp/sprint-01-verification/grd-05-clean-twin.json | .json.red |
| FLOW-GRD-06-MISSING-KEY | task | tests/sprint-01/grd-06-missing-key.test.mjs | .tmp/sprint-01-verification/grd-06-missing-key.json | .json.red |
| FLOW-JRN-PLANTED-AND-TWIN | journey | tests/sprint-01/jrn-planted-and-twin.test.mjs | .tmp/sprint-01-verification/jrn-planted-and-twin.json | .json.red |

Surface policies: `.spec/e2e-policy/sprint-01/artifact-only-read.json` and
`.spec/e2e-policy/sprint-01/dispatch-allowed.json` (RUN-02-HAND's single dispatch write);
cold-boot policy: `.spec/e2e-policy/sprint-01/gh-auth-repo.json`.

**Holdouts:** PENDING — the kb-holdout-pilot/v1 freeze has not run yet. The authored 14-case
input is held in the planning session transcript, not on disk; write it to
`~/.local/state/kb-holdouts/pixel-perfect/sprint-01-evaluator-evidence-spine/pixel-perfect-task/input.json`
(normalize project_id to `pixel-perfect`, sprint_id to `sprint-01-evaluator-evidence-spine`),
then run `holdout_check.py pilot freeze` + `pilot brief` and replace this section with the
public holdouts from the brief before [7.5] publish.

## Tasks

| ID | Title | Agent | Points | Wave | Status |
|----|-------|-------|--------|------|--------|
| T1 | Scaffold .github/workflows/harness-eval.yml: workflow_dispatch (install_mode input, checkout default), empty default permissions, six-harness by two-track smoke matrix (fail-fast false, no cache, keyless install), no banned events | github-platform-implementer | 5 | A | ⬜ Pending |
| T2 | Create test/harness/pins.json (six exact CLI versions, provider/model, credential env names, pins-vs-package.json reconciliation) + JSON schemas (harness-eval-result/v1, HarnessCell/HarnessGrade, InstallationIdentity) + version-lookup resolver with pins_sha256 binding | evals-implementer | 3 | A | ⬜ Pending |
| T3 | Build shared runtime: invocation-guard, InvocationCapture, PermissionStance, and grade-writer | ai-tooling-implementer | 5 | B | ⬜ Pending |
| T4 | Build test/harness/kit fixture and ALL case manifests — VerifyPair, StatusCase, FirstQuestionCase — with the case loader and oracle precheck | evals-implementer | 5 | A | ⬜ Pending |
| T5 | Implement the claude-code adapter: pinned/newest install with DISABLE_AUTOUPDATER=1, marketplace add + plugin install, plugin-details list (no model), headless -p graded runs, system/init plugin gate, InstallationIdentity digest verification | ai-tooling-implementer | 8 | C | ⬜ Pending |
| T6 | Implement the claude-code CanonicalEvent stream mapping, the per-version mapping validator, and question-boundary semantics (ask-nothing + FirstQuestion boundary-stop) | evals-implementer | 8 | D | ⬜ Pending |
| T7 | Implement the deterministic graders: fixture-grader (verify pair + status), question-boundary checks, VerifyReport writer, grade records — keyless evaluator owns every verdict | evals-implementer | 8 | E | ⬜ Pending |
| T8 | Implement the grade recorder job: schema validation, twelve-unique-cell enforcement, GitHub job-timestamp copy, attempt-qualified artifacts (overwrite disabled, 90-day retention), Actions summary, exit semantics | github-platform-implementer | 5 | B | ⬜ Pending |
| T9 | Wire the harness-smoke environment and credential binding with least-exposure verification | devops-engineer | 2 | B | ⬜ Pending |
| T10 | Wire fail-closed cells: cursor version-lookup + could-not-run missing-api-key on every check, and adapter-absent could-not-run for codex/grok/opencode/pi so all twelve cells always exist | evals-implementer | 3 | C | ⬜ Pending |
| T11 | Qualify the negative controls on a real hosted run and record them in the result's controls array | evals-implementer | 5 | F | ⬜ Pending |
| T12 | Review the evaluator workflow, capture layer, and grader contracts: secret placement, banned triggers, path confinement, aggregation order, exit-code independence, twelve-cell completeness, no root-level harness/ or branch-9624a4b gate wiring landing | github-agentic-workflow-reviewer | 3 | G | ⬜ Pending |
| T13 | Make the smoke matrix observe and export what it grades: per-leg graded cells from files-and-event-stream evidence plus the four negative-control observations reaching HARNESS_EVAL_CONTROL_OBSERVATIONS | evals-implementer | 8 | H | ⬜ Pending |
| T14 | Fix the capture layer so a mapper-declared `required_read: false` survives as `false` instead of collapsing to `null` (a declared optional denial stops grading as `requiredness-undeclared`) | ai-tooling-implementer | 3 | I | ⬜ Pending |
| T15 | Give the four negative controls a real hosted producer: a graded denied-write probe so `exit0-denied-read` reads `fail denied_tool_call`, producer-side hosted/pair wiring so rows stop publishing `hosted: not-executed` / `qualified: false` / `pair: null`, and a gate that asserts the four exact verdict/reason pairs | ai-tooling-implementer | 5 | J | ⬜ Pending |

**Waves:** A(3) → B(3) → C(2) → D(1) → E(1) → F(1) → G(1) — 7 waves over 12 tasks (≈1.7 at once)

## Source Coverage

- 00-overview.md (objective; G1/G4 slices), 01-scope.md (deliverables: run summary cells, verify report at case-named path, missing-credential failure), 04-uc-grd.md (all six GRD UCs), 07-uc-run.md (UC-RUN-02) …

## Capability Coverage

- CAP-EVAL-01: Install and grade

## Blocks

- Blocks: Sprint 02, Sprint 03, Sprint 04, Sprint 05, Sprint 06
- Dependent on: —

## Task Detail Files

Generated by /kb-sprint-tasks-plan on 2026-10-28

- TASK-T1.md
- TASK-T2.md
- TASK-T3.md
- TASK-T4.md
- TASK-T5.md
- TASK-T6.md
- TASK-T7.md
- TASK-T8.md
- TASK-T9.md
- TASK-T10.md
- TASK-T11.md
- TASK-T12.md

