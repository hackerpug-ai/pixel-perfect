---
roadmap: 1
project: Harness eval framework
generated: 2026-10-28T21:44:53Z
prd: .spec/prds/harness-eval-framework/README.md
sprint_count: 6
commit_horizon: 1
pr_sequencing: false
---

# Sprint Roadmap: Harness eval framework

## Overview

**Sprints:** 6  (2 committed · 4 provisional)
**Total Tasks:** 37  (committed sprints only; provisional sprints carry a size band)
**Current Sprint:** 1 - Evidence spine and evaluator core

Fused from both planning specialists (github-agentic-workflow-planner + evals-planner) with an evals integrity review; holdouts on for every sprint.

## Sprint Sequence

| # | Milestone | Sprint | Gate | Tasks | Dependencies | Status | Forecast |
|---|-----------|--------|------|-------|--------------|--------|----------|
| 1 | — | [Sprint 01: Evidence spine and evaluator core: dispatchable harness-eval run, one real harness graded end to end on a real runner, twelve fail-closed cells](#sprint-01-evidence-spine-and-evaluator-core-dispatchable-harness-eval-run-one-real-harness-graded-end-to-end-on-a-real-runner-twelve-fail-closed-cells) | Twelve evidence-graded cells from one dispatched run; claude-code live, cursor fail-closed | 12 | — | Planned | ~3.5 d / over ×1.2 (owner-approved — see Open Owner Decisions D-01) |
| 2 | — | [Sprint 02: Four live adapters: Codex, Grok, OpenCode, Pi graded on both tracks; per-harness mappings, controls, and honest could-not-run cells](#sprint-02-four-live-adapters-codex-grok-opencode-pi-graded-on-both-tracks-per-harness-mappings-controls-and-honest-could-not-run-cells) | Codex, Grok, OpenCode, Pi graded on both tracks; denial controls despite exit 0 | 21 | Sprint 01 | In Progress | ~1 d / fits |
| 3 | — | [Sprint 03: Triggers and release-adjacent records: nightly cron, push path filter, drift-proof job, harness-eval/pinned and harness-eval/drift statuses, published-mode resolution](#sprint-03-triggers-and-release-adjacent-records-nightly-cron-push-path-filter-drift-proof-job-harness-eval-pinned-and-harness-eval-drift-statuses-published-mode-resolution) | Push starts an exact-checkout run writing harness-eval/pinned; PR starts nothing; nightly deployed | — | Sprint 01 | Planned | band 21–34 pts |
| 4 | — | [Sprint 04: Release gate resolver: release.mjs verify/publish and tag-release.yml refuse without fresh trusted checkout evidence; adapter publish governed; full truth table](#sprint-04-release-gate-resolver-release-mjs-verify-publish-and-tag-release-yml-refuse-without-fresh-trusted-checkout-evidence-adapter-publish-governed-full-truth-table) | release.mjs verify + tag-release.yml + adapter publish refuse without fresh trusted checkout evidence | — | Sprints 01, 02, 03 | Planned | band 34–55 pts |
| 5 | — | [Sprint 05: Newest-only fix pipeline: reproduce, repair with the pinned Claude CLI, allowlisted patch, confirming run, app-opened PR a person merges](#sprint-05-newest-only-fix-pipeline-reproduce-repair-with-the-pinned-claude-cli-allowlisted-patch-confirming-run-app-opened-pr-a-person-merges) | Newest-only failure yields one allowlisted, app-opened PR a person merges; negative controls open nothing | — | Sprints 02, 03, 04 | Planned | band 34–55 pts |
| 6 | — | [Sprint 06: Report-only later checks and the one resume-with-text path across all six harnesses](#sprint-06-report-only-later-checks-and-the-one-resume-with-text-path-across-all-six-harnesses) | later_checks reports five report-only checks over one resume-with-text path; release verdict byte-identical | — | Sprints 01, 02 | Planned | band 21–34 pts |

## UC Ledger

```
UC-GRD-01 · AC-1,3,4,5,6 ↦ sprint-01 · AC-2 ↦ sprint-02 · closes at sprint-02
UC-GRD-02 · AC-1,2,3 ↦ sprint-01 (claude-code) · re-proven per harness ↦ sprint-02 · closes at sprint-02
UC-GRD-03 · AC-1,2,3 ↦ sprint-01 · per-harness ↦ sprint-02 · closes at sprint-02
UC-GRD-04 · AC-1..6 ↦ sprint-01 · AC-6 per-harness ↦ sprint-02 · closes at sprint-02
UC-REL-02 · AC-1,2,4,5 ↦ sprint-04 · AC-1..5 ↦ sprint-05 · closes at sprint-05
UC-REL-04 · AC-1..6 ↦ sprint-04 · AC-4 ↦ sprint-05 · closes at sprint-04
UC-REL-05 · AC-3,4,5 ↦ sprint-03 · AC-1,2,6 ↦ sprint-04 · closes at sprint-04
```

## Open Owner Decisions

- **D-01** (2026-10-28): Sprint 01 forecast is OVER ×1.2 (~3.5 d vs the 3-day check-in horizon). Owner approved the rationale: the sprint is the irreducible evidence spine — its gate is the first honest twelve-cell read, and narrowing the verdict or peeling foundation would break the gate's own could-not-run semantics.
- **D-02** (2026-10-31): The evaluator writes the verify report, per PRD 03-data-schema. Sprint 01's T16 landed at 6872fbd with its verify prompt and one-path write allow-list still in, after this decision; run 41249460968 still reads verify fail report-missing with them. Sprint 02's GAW-11 removes both; T16's status half stays, and it works.
- **D-03** (2026-10-31): Graded runs may execute node on every gated harness, and nothing wider. Pi's no-gate row is approved. GAW-11 adds the rule on Claude Code; T16 landed without it. Ceiling: Bash(node *) also admits node -e, and fixture hashes are what catch a stray write.
- **D-04** (2026-10-31): Each graded run publishes raw streams and reports as 90-day artifacts on this public repository, after a key scan that withholds any match (GAW-9).
- **D-05** (2026-10-31): A newest cell with no exact table is graded through the pinned table only when that run's own captures re-prove every required fact, and it records that basis (E9).
- **D-06** (2026-10-31): OpenCode's args channel is proven this sprint. The shipped OpenCode plugin returns nothing and kills headless runs on 1.18.34 and 1.19.5, so a one-point fix joins the sprint (GAW-10).
- **D-07** (2026-10-31): Sprint 02 runs only after sprint 01's gate is verified, because that gate's step 9 needs these four harnesses to read could-not-run. Sprint 02 is 92 points against its 34-55 band, because the hosted path never used the sprint 01 grader.

## Per-Sprint Details


### Sprint 01: Evidence spine and evaluator core: dispatchable harness-eval run, one real harness graded end to end on a real runner, twelve fail-closed cells

**Sequence:** 1
**Timeline:** Phase 1
**Status:** Planned
**Fidelity:** committed
**Proposed by:** github-agentic-workflow-planner + evals-planner
**Milestone:** —

#### Human Testing Gate

**Gate:** Done means the maintainer can run `gh workflow run harness-eval --repo hackerpug-ai/pixel-perfect` and read, from the finished run's harness-eval-result artifact, twelve unique (harness, track) cells bound to a 64-hex pins_sha256, in which both claude-code cells each carry command_list, status, verify, and question_before_expensive_work verdicts graded from files-and-event-stream evidence and bound to observed CLI versions and loaded-plugin manifest digests, the verify report names atoms/Button/default at exactly reports/verify-button-drift.json with the clean twin reports/verify-clean.json showing clean_project_failed=false, cursor reads could-not-run/missing-api-key while the four adapter-pending harnesses read could-not-run with named reasons rather than omission, and the controls array records stale-cache, exit0-denied-read, missing-key, and hidden-image-judge negative-control outcomes, proven by jq checks on the downloaded artifact that fail if any cell, identity binding, case-declared report, or negative control is absent.
**Entrypoint:** gh workflow run harness-eval --repo hackerpug-ai/pixel-perfect (product surface 1), read via the run's harness-eval-result artifact and Actions summary (product surface 2)
**Shape:** product
**Before:** harness-eval workflow does not exist: gh workflow list --repo hackerpug-ai/pixel-perfect --all prints no harness-eval row (only ci.yml, pages.yml, tag-release.yml); test/harness/pins.json does not exist; plugins/pixel-perfect/harness does not exist; no grader, stream mapping, or grade writer exists anywhere in the repo — there is no way to grade any harness from evidence.
**Demonstrates:** UC-GRD-01, UC-GRD-02, UC-GRD-03, UC-GRD-04, UC-GRD-05, UC-GRD-06, UC-RUN-02
**Proves (ACs):** UC-GRD-01: AC-1, AC-3, AC-4, AC-5, AC-6; UC-GRD-02: AC-1, AC-2, AC-3; UC-GRD-03: AC-1, AC-2, AC-3; UC-GRD-04: AC-1, AC-2, AC-3, AC-4, AC-5, AC-6; UC-GRD-05: AC-1, AC-2; UC-GRD-06: AC-1, AC-2; UC-RUN-02: AC-1, AC-2, AC-3
**Forecast:** ~3.5 d (7 waves × 0.5 d/wave, default pace) · horizon 3 d · over ×1.2 — owner-approved (D-01)

**First integrated demonstration:** gh workflow dispatch on hackerpug-ai/pixel-perfect → run completes (conclusion may fail while Cursor lacks a key — the framework refusing) → download harness-eval-result artifact → jq reads twelve cells, claude-code graded checks, verify reports, and the controls array; requires harness-smoke env with ANTHROPIC_API_KEY (owner prerequisite); smallest prerequisite group T1–T9; proof/repair owner: evals-implementer (grader) + github-platform-implementer (recorder).

**Owner questions (answer before the sprint starts):**
- Approve the recorded permission stance candidate for claude-code graded runs (--permission-mode dontAsk plus --add-dir of the plugin root; bypassPermissions rejected), understanding the exact flags are an engineering choice under the not-approve-everything constraint (R-stance-open)? (needed by: sprint-01 task T5 qualification runs)
- Create the harness-smoke GitHub environment with ANTHROPIC_API_KEY (later the five other bindings); the workflow places keys only on smoke model steps and the repo owner controls environments and secrets. (needed by: sprint-01 gate)
- Confirm the initial pinned claude-code CLI version for test/harness/pins.json (proposed: 2.1.291, to be qualified on a real hosted runner, since historical surveyed versions are not automatically qualified pins)? (needed by: sprint-01 task T2)

**Test Steps:** *(as many as coverage requires — each stranger-runnable verbatim)*
1. Run `gh workflow list --repo hackerpug-ai/pixel-perfect --all` — One line contains `harness-eval` and `active`. Before this sprint no such line exists (only ci.yml, pages.yml, tag-release.yml).   `exercises: T1`
2. Run `gh workflow run harness-eval --repo hackerpug-ai/pixel-perfect && sleep 15 && gh run list --workflow harness-eval --repo hackerpug-ai/pixel-perfect --limit 1 --json databaseId,event,status --jq '.[0] | (.databaseId|tostring) + " " + .event + " " + .status'` — One line ending in `workflow_dispatch` plus `queued` or `in_progress` (no install_mode input was passed, so the run uses the checkout default).   `exercises: T1, T8`
3. Run `RUN_ID=$(gh run list --workflow harness-eval --repo hackerpug-ai/pixel-perfect --limit 1 --json databaseId --jq '.[0].databaseId') && gh run watch $RUN_ID --repo hackerpug-ai/pixel-perfect; gh run view $RUN_ID --repo hackerpug-ai/pixel-perfect --json status --jq .status` — `completed`. The conclusion may be failure while Cursor has no key — that is the framework refusing (fail-closed), not an error; the artifact checks below are the proof. Job list shows the twelve-cell smoke matrix and the grade recorder.   `exercises: T1, T8`
4. Run `gh api repos/hackerpug-ai/pixel-perfect/actions/runs/$RUN_ID/artifacts --jq '.artifacts[].name'` — Output includes `harness-eval-result-<RUN_ID>-1` and `harness-eval-verify-reports-<RUN_ID>-1` (attempt-qualified physical names).   `exercises: T8`
5. Run `rm -rf /tmp/he1 && gh run download $RUN_ID --repo hackerpug-ai/pixel-perfect -n harness-eval-result-$RUN_ID-1 -D /tmp/he1 && jq '.cells | length' /tmp/he1/harness-eval-result.json && jq '[.cells[].harness] | unique | length' /tmp/he1/harness-eval-result.json && jq -r '.pins_sha256' /tmp/he1/harness-eval-result.json` — `12`, then `6`, then a 64-character hex string (twelve cells, all six harnesses including cursor, pins bound by digest).   `exercises: T8, T10, T2`
6. Run `jq -r '.cells[] | select(.harness=="claude-code" and .track=="pinned") | .checks[] | .check_id + " " + .verdict' /tmp/he1/harness-eval-result.json` — Exactly four lines: `command_list pass`, `status pass`, `verify pass`, `question_before_expensive_work pass` (any other verdict word is a real finding the gate surfaces, not a setup error).   `exercises: T5, T7, T9`
7. Run `jq -r '.cells[] | select(.harness=="claude-code") | .track + " cli=" + .installation.observed_cli_version + " manifest=" + ((.installation.observed_plugin_manifest_sha256 // "MISSING")[0:12])' /tmp/he1/harness-eval-result.json` — Two lines (pinned and newest), each with a dotted CLI version (for example `2.1.291`) and 12 hex characters after `manifest=`. Any `MISSING`, `null`, or empty version fails the step.   `exercises: T5, T2`
8. Run `rm -rf /tmp/he1v && gh run download $RUN_ID --repo hackerpug-ai/pixel-perfect -n harness-eval-verify-reports-$RUN_ID-1 -D /tmp/he1v && jq -r '.expected_defect_key + " " + .observed_defect_key + " " + .observed_verify_outcome' /tmp/he1v/reports/verify-button-drift.json && jq -r '.clean_project_failed' /tmp/he1v/reports/verify-clean.json && jq -r '.harness + " " + .track' /tmp/he1v/reports/verify-button-drift.json` — `atoms/Button/default atoms/Button/default defect-detected`, then `false`, then `claude-code pinned` (defect named by canonical key at the case-declared path; clean twin not a failure; report bound to its producing cell).   `exercises: T4, T7`
9. Run `jq -r '.cells[] | select(.harness=="cursor") | .checks[0].verdict + " " + .checks[0].reason' /tmp/he1/harness-eval-result.json && jq -r '[.cells[] | select(.harness=="codex" or .harness=="grok" or .harness=="opencode" or .harness=="pi") | .checks[0].verdict] | unique | join(",")' /tmp/he1/harness-eval-result.json` — First command prints `could-not-run missing-api-key` (cursor present as a real cell with the PRD's named day-one reason). Second prints exactly `could-not-run` — the four adapter-pending harnesses are present with named reasons, never omitted, never pass.   `exercises: T10`
10. Run `jq '[.cells[] | select(.harness=="claude-code" and .track=="pinned") | .checks[] | select(.source=="files-and-event-stream")] | length' /tmp/he1/harness-eval-result.json && jq -r '.cells[] | select(.harness=="claude-code" and .track=="pinned") | .checks[0].process_exit_code' /tmp/he1/harness-eval-result.json` — `4`, then a raw integer exit code printed as a diagnostic — the step-6 verdicts were graded from evidence and stand next to whatever this integer is. This whole step ran from the artifact with no product screen or UI session.   `exercises: T6, T3`
11. Run `jq -r '.controls[] | .control_id + " " + .verdict + " " + .reason' /tmp/he1/harness-eval-result.json` — Includes `missing-key could-not-run missing-api-key`, `stale-cache could-not-run installation-identity-mismatch`, `exit0-denied-read fail denied_tool_call`, and a `hidden-image-judge` row proving no screenshot judging occurred in the verify child tree.   `exercises: T9, T11`
12. Run `gh run view $RUN_ID --repo hackerpug-ai/pixel-perfect` — The run's summary renders the twelve-cell table with verdict word and observed CLI version per cell, cursor always present, and the release effect next to each result so no one infers it from the exit code.   `exercises: T8`
13. First contact: as the maintainer, run `gh workflow run harness-eval --repo hackerpug-ai/pixel-perfect`, open https://github.com/hackerpug-ai/pixel-perfect/actions/workflows/harness-eval.yml, click the newest run, and read the twelve-cell summary on the run page for THIS repo, holding these promises in mind — Promise (UC-GRD-01): "Sits under 'Maintainer reads pass, fail, or could-not-run for each harness on the pinned version and the newest version.' The summary is the reader. There is no product screen, and a missing screenshot score is not a gap." Promise (UC-GRD-02): "Sits under 'Maintainer reads the command list, status, verify on a planted defect, and whether the first turn asked before expensive work. List, status, and verify ask nothing. The separate must-ask probe asks once and stops without receiving an answer.'" Promise (UC-GRD-03): "Sits under 'Maintainer reads each grade from written results and the event stream.' A clean exit is not a pass, and a denied tool call is visible." Promise (UC-GRD-04): "Sits under 'Maintainer reads the planted defect when verify fails.' The failing case names the report path. The grader does not invent a filename." Promise (UC-GRD-05): "Sits under 'Maintainer reads a clean project as not a verify failure.' The clean twin of the planted-defect check does not fail." Promise (UC-GRD-06): "Sits under 'System fails a run that is missing its credential.' A missing key cannot be read as a pass." Promise (UC-RUN-02): "Sits under 'Maintainer starts the grade by hand.' A hand start grades the same harnesses and the same checks as the night run." State what you see about this repo's run: which cells carried live grades and which read could-not-run and why. — The maintainer reads the real summary on hackerpug-ai/pixel-perfect and can point at the twelve cells, the four graded claude-code checks, the verify report naming atoms/Button/default, the cursor missing-key refusal (expected day-one behavior, not a framework failure), and the controls rows.   `exercises: T1, T5, T8, T10`

**Dark tasks:** T12 (3 pts) — A review task produces no observable product-surface behavior; its checks are exercised indirectly through gate steps 6-11 which fail if the reviewed contracts are broken. Only dark task: 3 of 60 points (~5%), under the 30% ceiling.

#### Holdout Promise Map

| Obligation/version | Approved source and exact quote | Beneficiary | Promise | Failure cost | Public falsifier | Boundary | Purpose/encounter | Preserve | Coverage |
|---|---|---|---|---|---|---|---|---|---|
| exit-zero-is-not-success/1.0.2 | `b1774cd (PRD 1.0.2, 2026-10-28; 04-uc-grd.md UC-GRD-03 AC-2; objective in 00-overview.md)`: "Maintainer can treat an exit code of 0 as not success." | maintainer reading a green-looking run | No cell verdict is derived from a process exit code, a Claude success subtype, a Codex type error, o | Exit-0 green runs are exactly how a harness release with every tool call denied ships unno | A cell whose process_exit_code is 0 but whose stream shows a denied required read or a missed defect | integrated | make evidence, not process status, the grade | grade-writer read-back must match verdict, harness, version, track, and check id; the stor | candidate |
| verify-report-case-declared-path/1.0.2 | `b1774cd (PRD 1.0.2, 2026-10-28; 09-technical-requirements/03-data-schema.md)`: "report_relative_path: reports/verify-button-drift.json (planted), reports/verify-clean.json (clean), each inside its inv" | maintainer releasing pixel-perfect | The evaluator writes verify reports only at the exact paths the case manifest declared before launch | A grader that invents filenames can pass on evidence the plugin never produced, so a broke | Any run whose verify evidence cites a report path other than the two case-declared paths, or whose r | integrated | bind the verify grade to evidence the harness actually emitted, not metadata the grader copied | path confinement rules (reject absolute, parent traversal, symlinks, paths outside the inv | candidate |
| missing-key-could-not-run/1.0.2 | `b1774cd (PRD 1.0.2, 2026-10-28; 04-uc-grd.md UC-GRD-06 AC-1)`: "Maintainer can rely on a missing consumed API key producing could-not-run and blocking release before any model request." | maintainer releasing pixel-perfect | invocation-guard refuses to start when the harness's consumed key is missing, records could-not-run  | A missing credential silently reading as pass would authorize releases on evidence that wa | Run the suite with the consumed key and all allowed alternative credential sources removed: any mode | integrated | fail closed on absent credentials | guard runs before any key-carrying step; no key during install or command listing | candidate |

#### Tasks

| ID | Title | Agent | Points | Wave | Status |
|----|-------|-------|--------|------|--------|
| T1 | Scaffold .github/workflows/harness-eval.yml: workflow_dispatch (install_mode input, checkout default), empty d | github-platform-implementer | 5 | A | ⬜ Pending |
| T2 | Create test/harness/pins.json (six exact CLI versions, provider/model, credential env names, pins-vs-package.j | evals-implementer | 3 | A | ⬜ Pending |
| T3 | Build shared runtime: invocation-guard, InvocationCapture, PermissionStance, and grade-writer | ai-tooling-implementer | 5 | B | ⬜ Pending |
| T4 | Build test/harness/kit fixture and ALL case manifests — VerifyPair, StatusCase, FirstQuestionCase — with the c | evals-implementer | 5 | A | ⬜ Pending |
| T5 | Implement the claude-code adapter: pinned/newest install with DISABLE_AUTOUPDATER=1, marketplace add + plugin  | ai-tooling-implementer | 8 | C | ⬜ Pending |
| T6 | Implement the claude-code CanonicalEvent stream mapping, the per-version mapping validator, and question-bound | evals-implementer | 8 | D | ⬜ Pending |
| T7 | Implement the deterministic graders: fixture-grader (verify pair + status), question-boundary checks, VerifyRe | evals-implementer | 8 | E | ⬜ Pending |
| T8 | Implement the grade recorder job: schema validation, twelve-unique-cell enforcement, GitHub job-timestamp copy | github-platform-implementer | 5 | B | ⬜ Pending |
| T9 | Wire the harness-smoke environment and credential binding with least-exposure verification | devops-engineer | 2 | B | ⬜ Pending |
| T10 | Wire fail-closed cells: cursor version-lookup + could-not-run missing-api-key on every check, and adapter-abse | evals-implementer | 3 | C | ⬜ Pending |
| T11 | Qualify the negative controls on a real hosted run and record them in the result's controls array | evals-implementer | 5 | F | ⬜ Pending |
| T12 | Review the evaluator workflow, capture layer, and grader contracts: secret placement, banned triggers, path co | github-agentic-workflow-reviewer | 3 | G | ⬜ Pending |
| T13 | Make the smoke matrix observe and export what it grades: per-leg graded cells from files-and-event-stream evid | evals-implementer | 8 | H | ⬜ Pending |
| T14 | Fix the capture layer so a mapper-declared `required_read: false` survives instead of collapsing to `null` | ai-tooling-implementer | 3 | I | ⬜ Pending |
| T15 | Give the four negative controls a real hosted producer, hosted/pair wiring, and a four-pair gate | ai-tooling-implementer | 5 | J | ⬜ Pending |
| T16 | Make a hosted claude-code cell grade: status surface + verify report path/id declared to the invocation | ai-tooling-implementer | 5 | K | ⬜ Pending |

**Waves:** A(3) → B(3) → C(2) → D(1) → E(1) → F(1) → G(1) — 7 waves over 12 tasks (≈1.7 at once)

#### Dependencies

- Blocks: Sprint 02, Sprint 03, Sprint 04, Sprint 05, Sprint 06
- Dependent on: —

#### PRD Coverage

- 00-overview.md (objective; G1/G4 slices), 01-scope.md (deliverables: run summary cells, verify report at case-named path, missing-credential failure), 04-uc-grd.md (all six GRD UCs), 07-uc-run.md (UC-RUN-02) …

#### Capability Coverage

- CAP-EVAL-01: Install and grade


### Sprint 02: Four live adapters: Codex, Grok, OpenCode, Pi graded on both tracks; per-harness mappings, controls, and honest could-not-run cells

**Sequence:** 2
**Timeline:** Phase 2
**Status:** In Progress
**Fidelity:** committed
**Proposed by:** github-agentic-workflow-planner + evals-planner
**Milestone:** —

#### Human Testing Gate

**Gate:** Done means one hand dispatch grades command_list, status, planted-defect verify, and question_before_expensive_work from real event streams for Claude Code, Codex, Grok, OpenCode, and Pi on pinned and newest — Cursor remaining could-not-run by design — with every unqualified mapping reported as could-not-run with a stream-mapping reason instead of an omission, proven by jq over the result artifact showing four check verdicts with evidence paths in all ten keyed cells plus a per-harness missing-key control and an exit0-denied-read control that yields fail on a cell whose process_exit_code is 0.
**Entrypoint:** gh workflow run harness-eval --repo hackerpug-ai/pixel-perfect, read via the run's harness-eval-result artifact (surfaces 1 and 2)
**Shape:** product
**Before:** Run 41249460968 on hackerpug-ai/pixel-perfect at 36e864a (workflow_dispatch, conclusion failure) records twelve cells, and all twelve read could-not-run. codex, grok, opencode and pi read `<harness>-adapter-not-implemented` on all 32 of their check rows. Both cursor cells read `missing-api-key`. claude-code pinned at 2.1.291 reads command_list pass, status pass, verify fail report-missing and question_before_expensive_work could-not-run required-fact-unobserved; claude-code newest observes 2.1.316 with the same four rows and cell reason installation-identity-mismatch. 0 of the 40 keyed check rows carry evidence_paths, harness-eval-verify-reports holds INDEX.json with `reports: []`, and only the two claude-code cells carry control_observations.
**Demonstrates:** UC-GRD-01, UC-GRD-02, UC-GRD-03, UC-GRD-04
**Proves (ACs):** UC-GRD-01: AC-2, AC-6; UC-GRD-02: AC-1, AC-2, AC-3; UC-GRD-03: AC-1, AC-2, AC-3; UC-GRD-04: AC-6
**Forecast:** 4 waves × 0.25 d/wave = ~1 d · horizon 3 d · fits

**First integrated demonstration:** a landed commit on main with GAW-1 to GAW-11 and GAW-I1 → gh workflow run harness-eval --repo hackerpug-ai/pixel-perfect → grade/harness-eval-result.json in the run's artifact, read with the gate's jq steps, plus the harness-eval-evidence artifacts the later steps open; requires harness-smoke keys and the owner's recorded stance rows; proof/repair owner: github-platform-implementer.

**Owner questions (answer before the sprint starts):**
- Approve the Grok permission stance rule given that --trust may appear only in a keyless install step (this Mac's approve-everything Grok config must not be copied to the runner), and confirm the Codex pinned version plus hosted-runner sandbox support (unprivileged user namespaces) as a runner requirement for the --sandbox read-only and workspace-write steps? (needed by: sprint-02 grok + codex qualification) — answered: approved both (owner, 2026-10-31).
- Which exact provider/model go in pins.json for Pi (SMOKE_PI_KEY to GEMINI_API_KEY, provider google) and OpenCode (selected Anthropic provider with ANTHROPIC_API_KEY)? (needed by: sprint-02 pi + opencode qualification) — answered: google gemini-2.5-pro and anthropic claude-sonnet-4-5, keys confirmed (owner, 2026-10-31).
- OpenCode verify: the channel for fixture args such as --platform web-desktop is unknown, so verify on OpenCode is could-not-run until the join is known — accept that cell state, or fund the argv research inside this sprint? (needed by: sprint-02 opencode adapter) — answered: prove it this sprint (owner, 2026-10-31).
- Should OpenCode's newest track keep following npm's opencode-ai, or follow OpenCode's GitHub releases? (needed by: GAW-5) — open; the plan assumes npm until answered.

**Test Steps:** *(as many as coverage requires — each stranger-runnable verbatim)*
1. Run `gh api repos/hackerpug-ai/pixel-perfect/environments/harness-smoke/secrets --jq '[.secrets[].name]|sort'` — prints exactly `["SMOKE_CLAUDE_KEY","SMOKE_CODEX_KEY","SMOKE_GROK_KEY","SMOKE_OPENCODE_KEY","SMOKE_PI_KEY"]`, names only, and no Cursor key.   `exercises: GAW-8`
2. Run `gh workflow run harness-eval --repo hackerpug-ai/pixel-perfect && sleep 15 && gh run list --workflow harness-eval --repo hackerpug-ai/pixel-perfect --limit 1 --json databaseId,event,status --jq '.[0] | (.databaseId|tostring) + " " + .event + " " + .status'` — one line ending in `workflow_dispatch queued` or `workflow_dispatch in_progress`.   `exercises: GAW-7`
3. In the same shell run `RUN_ID=$(gh run list --workflow harness-eval --repo hackerpug-ai/pixel-perfect --limit 1 --json databaseId --jq '.[0].databaseId'); gh run watch "$RUN_ID" --repo hackerpug-ai/pixel-perfect; rm -rf /tmp/he2 && gh run download "$RUN_ID" --repo hackerpug-ai/pixel-perfect -n "harness-eval-result-$RUN_ID-1" -D /tmp/he2 && jq '(.cells | length), ([.cells[].harness] | unique | length)' /tmp/he2/grade/harness-eval-result.json` — prints `12` then `6`. The run's conclusion may be failure while Cursor has no key: that is the framework refusing, and the artifact checks below are the proof.   `exercises: GAW-1, GAW-7, E1`
4. Run `jq -r '.cells[] | select(.harness != "cursor") | .harness + " " + .track + " " + ([.checks[] | .check_id + ":" + .verdict] | join(" "))' /tmp/he2/grade/harness-eval-result.json` — ten lines, one per claude-code, codex, grok, opencode and pi on newest and pinned, each naming `command_list`, `status`, `verify` and `question_before_expensive_work` once, each followed by `pass`, `fail` or `could-not-run`.   `exercises: GAW-1, GAW-3, GAW-4, GAW-5, GAW-6`
5. Run `jq '[.cells[] | select(.harness != "cursor") | .checks[] | select(.source == "files-and-event-stream" and ((.evidence_paths // []) | length > 0))] | length' /tmp/he2/grade/harness-eval-result.json` — prints `40`: ten keyed cells, four check verdicts each, every row citing evidence. Run 41235273928 prints `0`.   `exercises: E1, E4, E5, E6, E7, E8, GAW-1, GAW-7, GAW-3, GAW-4, GAW-5, GAW-6`
6. Run `jq '[.cells[].checks[].reason // empty | select(endswith("-adapter-not-implemented"))] | length' /tmp/he2/grade/harness-eval-result.json` — prints `0`. Run 41235273928 prints `32`.   `exercises: E5, E6, E7, E8, GAW-3, GAW-4, GAW-5, GAW-6`
7. Run `jq -r '.cells[] | select(.harness == "cursor") | .track + " " + .verdict + " " + .reason' /tmp/he2/grade/harness-eval-result.json` — prints `newest could-not-run missing-api-key` and `pinned could-not-run missing-api-key`. Cursor stays present and could-not-run by design.   `exercises: GAW-7, E1`
8. Run `jq -r '.candidate_sha[0:12] as $sha | .cells[] | select(.harness != "cursor") | [.harness, .track, .installation.requested_cli_version, .installation.observed_cli_version, ((.installation.plugin_revision // "MISSING")[0:12] == $sha), (.installation.observed_plugin_manifest_sha256 // "MISSING")[0:12]] | @tsv' /tmp/he2/grade/harness-eval-result.json` — ten rows. In every row column 3 equals column 4, column 5 is `true`, and column 6 is the same 12 hex characters. Pinned rows read claude-code 2.1.291, codex 0.160.1, grok 1.0.46, opencode 1.18.34, pi 1.0.4. A row with `MISSING` must also read could-not-run with a named install reason in `.reason`, and it is a real finding about that harness.   `exercises: GAW-1, GAW-3, GAW-4, GAW-5, GAW-6`
9. Run `grep -c '| files-and-event-stream |' /tmp/he2/recorder.log` — prints `40`: the rendered summary has one row per check on each keyed cell, naming where the grade came from. Today it prints `0`.   `exercises: GAW-7, GAW-3, GAW-4, GAW-5, GAW-6`
10. Run `for h in claude-code codex grok opencode pi; do rm -rf /tmp/he2e-$h; gh run download $RUN_ID --repo hackerpug-ai/pixel-perfect -n harness-eval-evidence-$RUN_ID-1-$h-pinned -D /tmp/he2e-$h; jq -r --arg h $h '.cells[] | select(.harness == $h and .track == "pinned") | .checks[].evidence_paths[0]' /tmp/he2/grade/harness-eval-result.json | while read -r p; do if [ -f "/tmp/he2e-$h/$p" ]; then echo "$h found"; else echo "$h MISSING $p"; fi; done; done | sort -u` — exactly five lines: `claude-code found`, `codex found`, `grok found`, `opencode found`, `pi found`. Any `MISSING` line fails the step: a path nobody can open is not evidence.   `exercises: E3, GAW-1, GAW-3, GAW-4, GAW-5, GAW-6, GAW-9, E4, E5, E6, E7, E8`
11. Run `jq -r '.cells[] | select(.harness != "cursor" and .track == "pinned") | .harness + " " + .stream_mapping.table + " " + .stream_mapping.state' /tmp/he2/grade/harness-eval-result.json | sort` — exactly `claude-code claude-code@2.1.291 qualified`, `codex codex@0.160.1 qualified`, `grok grok@1.0.46 qualified`, `opencode opencode@1.18.34 qualified`, `pi pi@1.0.4 qualified`. `qualified` means a table for that exact version, backed by committed captures from that version. A pinned cell never reads `reproved`, `unqualified` or `absent`. Today `.stream_mapping` does not exist.   `exercises: E4, E5, E6, E7, E8, GAW-3, GAW-4, GAW-5, GAW-6, E1`
12. Run `jq '[.cells[] | select(.harness != "cursor" and .track == "pinned") | .checks[] | select((.reason // "") | startswith("stream-mapping-"))] | length' /tmp/he2/grade/harness-eval-result.json` — prints `0`: every pinned row was read through a qualified table. Then run `jq '[.cells[] | select(.harness != "cursor" and .track == "newest" and (.stream_mapping.state == "qualified" or .stream_mapping.state == "reproved")) | .checks[] | select((.reason // "") | startswith("stream-mapping-"))] | length' /tmp/he2/grade/harness-eval-result.json` — prints `0`: a newest cell whose mapping held carries no stream-mapping reason. A non-zero count on either command fails this step and names the mapping.   `exercises: E4, E5, E6, E7, E8, GAW-3, GAW-4, GAW-5, GAW-6, E1, E9`
13. Run `jq -r '.cells[] | select(.harness != "cursor" and .track == "newest") | [.harness, .installation.observed_cli_version, .stream_mapping.state, .stream_mapping.table, (.stream_mapping.basis.captures // [] | length), ([.checks[] | select(.verdict == "could-not-run") | .reason] | unique | join(","))] | @tsv' /tmp/he2/grade/harness-eval-result.json | sort` — exactly five rows, one per keyed harness. Column 3 is the state. `reproved` is the expected word while a harness's newest version differs from its pin: the pinned table named in column 4 graded this version because this run's own captures, counted in column 5 and at least 1, showed every required fact through it. `qualified` means a table exists for that exact version. Either way column 6 lists no `stream-mapping-` reason. `unqualified` is an honest finding: this run's captures did not show every required fact, for example after a renamed event, so column 6 lists `stream-mapping-unqualified` and `.stream_mapping.missing_facts` names the facts. Column 6 may also list a named refusal from checks that never ran, such as `opencode-args-channel-unknown` if the hosted capture proves that channel fails. An empty column 3 is allowed only beside a named install failure in column 6. `absent`, or any other reason on a check that did run, fails the step, because every keyed harness now has a pinned table. No row is omitted, and no row is graded with a table its own captures did not re-prove.   `exercises: E1, E4, E5, E6, E7, E8, GAW-1, GAW-3, GAW-4, GAW-5, GAW-6, E9`
14. Run `jq -r '.cells[] | select(.harness != "cursor" and .track == "pinned") | .harness + " " + ([.checks[] | .check_id + "=" + .verdict] | join(" "))' /tmp/he2/grade/harness-eval-result.json | sort` — five lines, each naming `command_list=`, `status=`, `verify=` and `question_before_expensive_work=` with a word from pass, fail, could-not-run. `pass` is the target; a `fail` is a real finding this gate surfaces, not a setup error. Then run `jq '[.cells[] | select(.harness != "cursor") | .checks[] | select(.verdict != "pass" and ((.reason // "") | length == 0))] | length' /tmp/he2/grade/harness-eval-result.json` — prints `0`.   `exercises: E1, E2, E4, E5, E6, E7, E8, GAW-1, GAW-3, GAW-4, GAW-5, GAW-6, GAW-11`
15. Run `jq -r '.cells[] | select(.harness != "cursor" and .track == "pinned") | .harness + " " + ([.checks[] | select(.check_id == "question_before_expensive_work") | (.question_count | tostring) + " " + (.answers_delivered | tostring) + " " + (.reason // "-")] | join(""))' /tmp/he2/grade/harness-eval-result.json | sort` — five lines; the target line is `<harness> 1 0 -`, and `<harness> 0 0 no-question-asked` is a real finding. No line reads `required-fact-unobserved`, which is what run 41235273928 prints on claude-code even though its capture was complete. The second number is `0` on every line: no answer was sent.   `exercises: E1, E4, E5, E6, E7, E8, GAW-2, GAW-3, GAW-4, GAW-5, GAW-6`
16. Run `rm -rf /tmp/he2v && gh run download $RUN_ID --repo hackerpug-ai/pixel-perfect -n harness-eval-verify-reports-$RUN_ID-1 -D /tmp/he2v && find /tmp/he2v -name verify-button-drift.json | wc -l && find /tmp/he2v -name verify-clean.json | wc -l && find /tmp/he2v -name verify-button-drift.json -exec jq -r '.harness + " " + .track + " " + .expected_defect_key + " " + (.observed_defect_key // "none") + " " + .observed_verify_outcome' {} + | sort` — `10`, then `10`, then ten lines, each naming its own harness and track. The target line ends `atoms/Button/default atoms/Button/default defect-detected`. A line ending `none missed-defect` is a real finding. A line ending `none unavailable` carries a `could_not_run_reason`. Run 41235273928 prints `0` and `0`, because its INDEX.json reads `reports: []`.   `exercises: E2, E4, E5, E6, E7, E8, GAW-3, GAW-4, GAW-5, GAW-6, GAW-9, E1, GAW-11`
17. Run `find /tmp/he2v -name verify-clean.json -exec jq -r '.harness + " " + (.clean_project_failed | tostring)' {} + | sort -u` — one line per keyed harness ending `false`, or naming a real false positive as `true`. Then run `find /tmp/he2v -name denied-write-probe.json -exec jq -r '.harness + " exit=" + (.process_exit_code | tostring) + " " + .denied_tool_call.operation + " " + .evaluation_verdict' {} + | sort` — includes `claude-code exit=0 Write fail`: the report itself shows the denied tool call on a clean exit.   `exercises: E2, E3, GAW-3, GAW-4, GAW-5, GAW-6, GAW-9, GAW-11`
18. Run `rm -rf /tmp/he2-codex && gh run download "$RUN_ID" --repo hackerpug-ai/pixel-perfect -n "harness-eval-evidence-$RUN_ID-1-codex-pinned" -D /tmp/he2-codex && find /tmp/he2-codex -name '*.capture.json' -not -path '*denied-write-probe*' -exec jq -r 'select(.check_id == "status" or .check_id == "verify") | .check_id + " " + (.argv as $a | $a[($a | index("--sandbox")) + 1])' {} + | sort` — exactly `status read-only`, `verify workspace-write`, `verify workspace-write`.   `exercises: GAW-3, GAW-I1, GAW-9`
19. Run `rm -rf /tmp/he2-grok && gh run download "$RUN_ID" --repo hackerpug-ai/pixel-perfect -n "harness-eval-evidence-$RUN_ID-1-grok-pinned" -D /tmp/he2-grok && find /tmp/he2-grok -name '*.capture.json' -exec jq -r 'select((.argv // []) | index("--trust")) | .check_id' {} + | sort -u` — exactly one line, `plugin-install`. No graded invocation carries `--trust`.   `exercises: GAW-4, GAW-9`
20. Run `find /tmp/he2-grok -name '*.capture.json' -exec jq -r 'select(.check_id == "question_before_expensive_work") | .termination_kind + " " + (.boundary_event_offset | tostring)' {} +` — one line, `boundary-stop` followed by an integer: the probe stopped at its first question and sent no answer. `native null` means the first turn asked nothing, which is a real finding about Grok.   `exercises: GAW-2, GAW-4, GAW-9, E1, E6`
21. Run `jq -r '.cells[] | select(.harness == "opencode") | .track + " " + ([.checks[] | select(.check_id == "status" or .check_id == "verify") | .check_id + ":" + .verdict + ":" + (.reason // "none")] | join(" "))' /tmp/he2/grade/harness-eval-result.json` — two lines, one per track, neither containing `adapter-not-implemented`. Each of `status` and `verify` reads a verdict from that run's own bytes. `could-not-run:opencode-args-channel-failed` means the run's session shows the fixture arguments never reached the command, and `could-not-run:opencode-no-user-message` means the session died before the command started; each is a real finding about OpenCode, not a setup error. Then run `rm -rf /tmp/he2-oc && gh run download "$RUN_ID" --repo hackerpug-ai/pixel-perfect -n "harness-eval-evidence-$RUN_ID-1-opencode-pinned" -D /tmp/he2-oc && find /tmp/he2-oc -name 'session-export.json' -exec jq -r '[.messages[]? | select(.info.role == "user") | .parts[]?.text // empty] | join(" ")' {} + | grep -c 'Invocation input: .--platform web-desktop'` — prints `3` when the channel holds: status and both verify runs received the argument. This capture decides the channel.   `exercises: GAW-5, GAW-9, E7, GAW-10`
22. Run `rm -rf /tmp/he2-pi && gh run download "$RUN_ID" --repo hackerpug-ai/pixel-perfect -n "harness-eval-evidence-$RUN_ID-1-pi-pinned" -D /tmp/he2-pi && find /tmp/he2-pi -name '*.stdout.bin' -exec jq -rR 'fromjson? | select(.type == "message_end" and .message.role == "assistant") | .message.provider + "/" + .message.model' {} + | sort -u` — exactly one line, `google/gemini-2.5-pro`: Pi answered through the pinned provider and no other.   `exercises: GAW-6, GAW-I1, GAW-9`
23. Run `jq -r '.controls[] | select(.control_id == "missing-key") | .per_harness | to_entries[] | [.key, .value.verdict, .value.reason, (.value.model_request_count | tostring), (.value.child_ran | tostring)] | @tsv' /tmp/he2/grade/harness-eval-result.json` — five rows, for claude-code, codex, grok, opencode and pi, each reading `could-not-run`, `missing-api-key`, `0`, `false`. Today the same command stops with a jq error because per_harness is absent.   `exercises: GAW-8`
24. Run `jq -r '.cells[] | select(.harness != "cursor" and .track == "pinned") | .harness + " " + (.control_observations["exit0-denied-read"] | .verdict + " " + .reason + " exit=" + (.evidence.process_exit_code | tostring))' /tmp/he2/grade/harness-eval-result.json | sort` — includes `claude-code fail denied_tool_call exit=0`; `codex`, `grok` and `opencode` print that same shape or `could-not-run control-unobservable exit=null` when their denial did not exit 0; `pi` prints `could-not-run stream-mapping-fact-not-applicable exit=null`, because Pi has no permission gate that could deny anything.   `exercises: E3, E5, E6, E7, E8, GAW-3, GAW-4, GAW-5, GAW-6, E4, GAW-1`
25. Run `jq -r '.cells[] | select(.harness != "cursor" and .track == "pinned") | .harness + " " + .control_observations["hidden-image-judge"].reason' /tmp/he2/grade/harness-eval-result.json | sort` — exactly five lines ending `no-image-judge-in-child-tree`. Then run `jq -r '.controls[] | .control_id + " " + .verdict + " " + .reason + " " + (.qualified | tostring)' /tmp/he2/grade/harness-eval-result.json` — `missing-key could-not-run missing-api-key true`, `stale-cache could-not-run installation-identity-mismatch true`, `exit0-denied-read fail denied_tool_call true`, `hidden-image-judge pass no-image-judge-in-child-tree true`.   `exercises: E3, GAW-3, GAW-4, GAW-5, GAW-6, GAW-8`
26. First contact — as the maintainer, run `gh workflow run harness-eval --repo hackerpug-ai/pixel-perfect`, open https://github.com/hackerpug-ai/pixel-perfect/actions/workflows/harness-eval.yml, click the newest run, and when it finishes read its summary on the run page for THIS repo, holding these promises in mind. Promise (UC-GRD-01): "Sits under 'Maintainer reads pass, fail, or could-not-run for each harness on the pinned version and the newest version.' The summary is the reader. There is no product screen, and a missing screenshot score is not a gap." Promise (UC-GRD-02): "Sits under 'Maintainer reads the command list, status, verify on a planted defect, and whether the first turn asked before expensive work.' List, status, and verify ask nothing. The separate must-ask probe asks once and stops without receiving an answer." Promise (UC-GRD-03): "Sits under 'Maintainer reads each grade from written results and the event stream.' A clean exit is not a pass, and a denied tool call is visible." Promise (UC-GRD-04): "Sits under 'Maintainer reads the planted defect when verify fails.' The failing case names the report path. The grader does not invent a filename." State what you see about this repo's run: for Claude Code, Codex, Grok, OpenCode and Pi on pinned and newest, which of the four grades came back pass or fail and which read could-not-run and why, and that Cursor reads could-not-run missing-api-key. You should be able to point at all twelve cells, and no keyed cell should say its adapter is missing.   `exercises: GAW-3, GAW-4, GAW-5, GAW-6, GAW-7, E1, E2, E3`

**Dark tasks:** none — every task is exercised by a gate step.

#### Tasks

| ID | Title | Agent | Points | Wave | Status |
|----|-------|-------|--------|------|--------|
| GAW-1 | Run every keyed harness through one adapter contract, recording the version it really installed | ai-tooling-implementer | 8 | A | ⬜ Pending |
| GAW-2 | Stop a must-ask probe at its first question | ai-tooling-implementer | 3 | A | ⬜ Pending |
| GAW-8 | Refuse each keyed harness by name when its own key is absent | devops-engineer | 3 | A | ⬜ Pending |
| GAW-I1 | Give the smoke job the runner the Pi and Codex CLIs need | devops-engineer | 2 | A | ⬜ Pending |
| E1 | Grade every keyed cell's rows from its own captured bytes through a per-harness table, on the live path | evals-implementer | 8 | B | ⬜ Pending |
| E3 | Exit-0 denials and hidden image judging are observed per keyed harness, and each graded row cites evidence a reader can open | evals-implementer | 5 | B | ⬜ Pending |
| GAW-10 | Keep a headless OpenCode session alive with the shipped plugin | ai-tooling-implementer | 1 | B | ⬜ Pending |
| GAW-3 | Install, load and invoke Codex on both tracks | ai-tooling-implementer | 5 | B | ⬜ Pending |
| GAW-4 | Install, load and invoke Grok on both tracks, with --trust only where no key exists | ai-tooling-implementer | 5 | B | ⬜ Pending |
| GAW-5 | Install, load and invoke OpenCode on both tracks through its namespaced commands | ai-tooling-implementer | 5 | B | ⬜ Pending |
| GAW-6 | Install, load and invoke Pi on both tracks through the pinned provider only | ai-tooling-implementer | 5 | B | ⬜ Pending |
| GAW-7 | Show the ten keyed cells' four grades and their identity from the finished run | github-platform-implementer | 3 | B | ⬜ Pending |
| GAW-9 | Keep each cell's captures and reports after the runner is gone, minus anything holding its key | github-platform-implementer | 5 | B | ⬜ Pending |
| E2 | The evaluator writes each case's verify report at its declared path on the live path, for every keyed cell | evals-implementer | 5 | C | ⬜ Pending |
| E4 | Qualify the claude-code 2.1.291 table on hosted captures | evals-implementer | 3 | C | ⬜ Pending |
| E5 | Map and qualify the Codex stream at its pinned version | evals-implementer | 5 | C | ⬜ Pending |
| E6 | Map and qualify the Grok stream at its pinned version | evals-implementer | 5 | C | ⬜ Pending |
| E7 | Map and qualify the OpenCode stream at its pinned version | evals-implementer | 5 | C | ⬜ Pending |
| E8 | Map and qualify the Pi stream at its pinned version | evals-implementer | 5 | C | ⬜ Pending |
| E9 | Grade a newest cell with the pinned table only when that run's own captures re-prove every required fact | evals-implementer | 3 | C | ⬜ Pending |

**Waves:** A(4) → B(1) → C(9) → D(7) — 4 waves over 21 tasks (≈5.2 at once)

#### Next Sprint Tasks

Generated by /kb-sprint-tasks-plan on 2026-10-31

- TASK-E1.md
- TASK-E2.md
- TASK-E3.md
- TASK-E4.md
- TASK-E5.md
- TASK-E6.md
- TASK-E7.md
- TASK-E8.md
- TASK-E9.md
- TASK-GAW-1.md
- TASK-GAW-10.md
- TASK-GAW-11.md
- TASK-GAW-2.md
- TASK-GAW-3.md
- TASK-GAW-4.md
- TASK-GAW-5.md
- TASK-GAW-6.md
- TASK-GAW-7.md
- TASK-GAW-8.md
- TASK-GAW-9.md
- TASK-GAW-I1.md

#### Dependencies

- Blocks: Sprint 04, Sprint 05, Sprint 06
- Dependent on: Sprint 01

#### PRD Coverage

- 04-uc-grd.md (UC-GRD-02, UC-GRD-03, UC-GRD-04 AC-6), 09-technical-requirements/02-system-components.md (codex-adapter, grok-adapter, pi-adapter, opencode-adapter, stream-grader, question-boundary), 09-technical-requirements/03-data-schema.md (StatusCase, CommandTranslation/CredentialBinding rows CODEX_API_KEY, XAI_API_KEY, SMOKE_PI_KEY, ANTHROPIC_API_KEY, CanonicalEvent mapping qualification), 09-technical-requirements/08-technical-risks.md (R-exit-zero, R-grok-trust, R-opencode-layout, R-list-count, R-question-signal, R-codex-cache, R-pi-model-call, R-no-wall-clock, R-stance-open, R-mode-mixup) …

#### Capability Coverage

- CAP-EVAL-01: Install and grade


### Sprint 03: Triggers and release-adjacent records: nightly cron, push path filter, drift-proof job, harness-eval/pinned and harness-eval/drift statuses, published-mode resolution

**Sequence:** 3
**Timeline:** Phase 3
**Status:** Planned
**Fidelity:** provisional
**Proposed by:** github-agentic-workflow-planner + evals-planner
**Milestone:** —

#### Human Testing Gate

**Gate:** Done means a push to main touching plugins/pixel-perfect/** starts an exact-checkout evaluation whose completion writes commit status harness-eval/pinned naming run, attempt, and mode in its description with harness-eval/drift separate beside it, a pull request starts nothing, the 06:17 UTC nightly cron is deployed and resolves the published release once to an immutable commit before fan-out, and a hand dispatch in published mode produces the same twelve cells under published identity, proven by gh api commit-status output on the pushed SHA, a gh pr create that produces no eval run, and gh workflow view showing the schedule.
**Entrypoint:** git push to main on a plugin path, then gh api repos/hackerpug-ai/pixel-perfect/commits/{sha}/status (product surface 3) and the push-triggered run itself (surface 1)
**Shape:** product
**Before:** The workflow has no schedule or push trigger, gh api on any commit shows no harness-eval/pinned context, the drift proof runs nowhere inside the eval run, and no published-mode resolution exists.
**Demonstrates:** UC-RUN-01, UC-RUN-03, UC-REL-05
**Proves (ACs):** UC-RUN-01: AC-1, AC-2, AC-3; UC-RUN-03: AC-1, AC-2, AC-3, AC-4; UC-REL-05: AC-3, AC-4, AC-5
**Sizing (provisional):** ~6 items · ~21-34 pts — Union of both specialists' trigger/status work: schedule and push triggers with the plugin path filter and PR-does-not-trigger control are small; the drift-proof job wraps existing validate scripts (no environment, no keys, contents:read, cache allowed there only); the cost centers are the pinned-channel status job's authoritative-run selection (paginate every status record, never combined/latest-per-context, older completion cannot replace a newer status, mode disambiguation on a shared SHA) and published-mode release resolution bound once before fan-out.

**First integrated demonstration:** Real dispatch of harness-eval on the real repo after this sprint's work lands, reading the real artifact the gate names; prerequisites anticipated from the size sketch, revalidated at promotion.

**Owner questions (answer before the sprint starts):**
- Confirm the plugin push path filter set (plugins/pixel-perfect/** plus scripts/adapters/** per R-allowlist) — is that the exact filter the owner wants spending harness-smoke keys? (needed by: sprint-03-triggers-status-drift)
- Procure CURSOR_API_KEY or confirm it stays absent so cursor remains an honest could-not-run that will refuse day-one releases by design; and if procured, authorize a qualified runner-only Cursor trial (the maintainer Mac must never run the Cursor installer because it relinks ~/.local/bin/agent away from Grok)? (needed by: sprint-03-triggers-status-drift (cell reason); sprint-04-release-gate (refusal semantics))

#### Holdout Promise Map

| Obligation/version | Approved source and exact quote | Beneficiary | Promise | Failure cost | Public falsifier | Boundary | Purpose/encounter | Preserve | Coverage |
|---|---|---|---|---|---|---|---|---|---|
| published-hold-cannot-be-cleared-by-later-success/1.0.2 | `b1774cd (PRD 1.0.2, 2026-10-28; 09-technical-requirements/04-api-design.md step 5)`: "A later published success, pull request, merge, or later-check report cannot clear a relevant hold." | maintainer releasing pixel-perfect | A completed published pinned failure or could-not-run in the relevant interval holds the release unt | A broken newest harness release observed nightly would be washed out by the next nightly s | Create a published pinned failure, then a later published success on the same release, then run the  | integrated | nightly compatibility observations cannot be self-healed by later observations of the same broken artifact | equality blocks — clearance requires the checkout to start strictly after the blocker comp | candidate |

> Test steps and the task table are authored when this sprint becomes next (`/kb-sprint-tasks-plan`), against the codebase as it is then. See COMMIT-HORIZON.md.

#### Dependencies

- Blocks: Sprint 04
- Dependent on: Sprint 01

#### PRD Coverage

- 07-uc-run.md (UC-RUN-01, UC-RUN-03), 05-uc-rel.md (UC-REL-05 drift-separable ACs), 09-technical-requirements/02-system-components.md (drift-proof job, pinned-channel status job, grade recorder hardening), 09-technical-requirements/04-api-design.md (full trigger/mode matrix, authoritative run selection steps 1-3) …

#### Capability Coverage

- CAP-EVAL-02: Release gate


### Sprint 04: Release gate resolver: release.mjs verify/publish and tag-release.yml refuse without fresh trusted checkout evidence; adapter publish governed; full truth table

**Sequence:** 4
**Timeline:** Phase 4
**Status:** Planned
**Fidelity:** provisional
**Proposed by:** github-agentic-workflow-planner + evals-planner
**Milestone:** —

#### Human Testing Gate

**Gate:** Done means `node scripts/release.mjs verify` (and the tag-release.yml gate plus publish-opencode-adapter job sharing the same deterministic resolver) on a real checkout refuses release naming the blocking evidence — a pinned graded failure naming harness and check, a could-not-run cell including Cursor, drift, or stale/absent/mismatched/superseded checkout evidence outside the 36-hour window — returns allow-with-newest-warning without publishing when only newest evaluated checks fail, and allows only while a complete, fresh, trusted checkout pass stands, proven by dry-run transcripts through the nine named rejection controls including a newer cancelled attempt after an older success, a blocking published nightly hold cleared only by a later qualifying checkout, and wrong-producer/mismatched-pointer/wrong-artifact-attempt refusals.
**Entrypoint:** node scripts/release.mjs verify on a real checkout (product surface 4); tag-release.yml gate job on a real tag push
**Shape:** product
**Before:** scripts/release.mjs verify passes today with no harness evidence at all — no resolver, no 36-hour rule, no artifact attempt binding, no status contexts; publish-opencode-adapter runs on tag push without any eval verdict, and a pinned harness failure cannot hold anything.
**Demonstrates:** UC-REL-01, UC-REL-02, UC-REL-04, UC-REL-05
**Proves (ACs):** UC-REL-01: AC-1, AC-2, AC-3, AC-4; UC-REL-02: AC-1, AC-2, AC-4, AC-5; UC-REL-04: AC-1, AC-2, AC-3, AC-4, AC-5, AC-6; UC-REL-05: AC-1, AC-2, AC-6
**Sizing (provisional):** ~7 items · ~34-55 pts — The resolver is the most rule-dense component in the PRD (six verification steps, full status pagination, attempt binding via physical artifact names plus recorder-job provenance, interval-based published holds including runs pending across the boundary); 04-api-design's acceptance-evidence list names nine distinct real-GitHub-record rejection controls that must each exist; plus truth-table wiring, tag-release.yml gate job, and the publish-opencode-adapter disposition (runs only after a recomputed allow or allow-with-newest-warning).

**First integrated demonstration:** Real dispatch of harness-eval on the real repo after this sprint's work lands, reading the real artifact the gate names; prerequisites anticipated from the size sketch, revalidated at promotion.

**Owner questions (answer before the sprint starts):**
- Is the 36-hour authorization window compatible with the owner's actual release cadence (releases land within a day or two at 10.x pace), given every release needs a fresh qualifying checkout evaluation? (needed by: sprint-04-release-gate)
- Day-one expectation check: until CURSOR_API_KEY exists, every release is refused on Cursor could-not-run — confirm the owner accepts refused releases as the steady state and treats the refusal text as the signal to add the key; and confirm the gate job placement in tag-release.yml with ci.yml staying out of scope for release secrets and authority? (needed by: sprint-04-release-gate)

#### Holdout Promise Map

| Obligation/version | Approved source and exact quote | Beneficiary | Promise | Failure cost | Public falsifier | Boundary | Purpose/encounter | Preserve | Coverage |
|---|---|---|---|---|---|---|---|---|---|
| thirty-six-hour-fail-closed-authorization/1.0.2 | `b1774cd (PRD 1.0.2, 2026-10-28; 09-technical-requirements/04-api-design.md step 4)`: "At the publish gate's UTC time, age must be between zero and 36 hours inclusive. A result older than 36 hours, or dated " | maintainer publishing a release | Only the latest trusted, complete, exact-checkout evaluation for the publish commit, aged zero to 36 | Stale evidence authorizing a release publishes over a break that landed after the evidence | A dry-run gate log on a SHA whose qualifying evidence is 36h+1m old (or superseded by a newer cancel | integrated | release authority decays with time and supersession, fail closed | selection takes highest run number then highest attempt including queued, pending, cancell | candidate |

> Test steps and the task table are authored when this sprint becomes next (`/kb-sprint-tasks-plan`), against the codebase as it is then. See COMMIT-HORIZON.md.

#### Dependencies

- Blocks: Sprint 05
- Dependent on: Sprints 01, 02, 03

#### PRD Coverage

- 05-uc-rel.md (UC-REL-01, UC-REL-02 warn/no-hold side, UC-REL-04, UC-REL-05 full refusal semantics), 09-technical-requirements/04-api-design.md (entire: authoritative run selection, artifact attempt binding, release truth table, acceptance evidence, governed side effects), 09-technical-requirements/02-system-components.md (release gate, pinned-channel status interplay, adapter publish governance), 09-technical-requirements/03-data-schema.md (HarnessEvalResult release block) …

#### Capability Coverage

- CAP-EVAL-02: Release gate


### Sprint 05: Newest-only fix pipeline: reproduce, repair with the pinned Claude CLI, allowlisted patch, confirming run, app-opened PR a person merges

**Sequence:** 5
**Timeline:** Phase 5
**Status:** Planned
**Fidelity:** provisional
**Proposed by:** github-agentic-workflow-planner + evals-planner
**Milestone:** —

#### Human Testing Gate

**Gate:** Done means a real newest-only graded failure yields exactly one fix pull request on branch heal/<run_id> whose diff touches only plugins/pixel-perfect/harness/*.json and plugins/pixel-perfect/skills/**, carries the confirmation run's before/after verdicts and evidence links, is denied to the heal app 5156617 on merge and merged or rejected by a person, while a pinned failure, a could-not-run, an unreproduced failure, and an out-of-allowlist or no-op patch all open nothing with visible reasons, proven by gh pr view fields, an app-token merge-denial receipt, and the absence of any PR from the negative controls.
**Entrypoint:** gh pr view on the app-opened heal pull request (product surface 5), reached from the warning in the run summary (surface 2)
**Shape:** product
**Before:** No fix-agent, patch-recheck, confirming-run, or heal-PR jobs exist; a newest-only failure produces a warning in the summary with nowhere to go, app 5156617 has no heal/* branch or PR workflow, and no merge-restriction proof or person-merge path exists.
**Demonstrates:** UC-REL-02, UC-REL-03, UC-REL-04
**Proves (ACs):** UC-REL-02: AC-1, AC-2, AC-3, AC-4, AC-5; UC-REL-03: AC-1, AC-2, AC-3, AC-4, AC-5, AC-6; UC-REL-04: AC-4
**Sizing (provisional):** ~8 items · ~34-55 pts — Union of both specialists' healer plans: fix-agent job invoking the exact pinned Claude Code CLI directly (not the GitHub action) with restricted local read/edit tools, no network tool, turn/budget caps, and proof of the invocation restrictions on a real hosted job; patch recheck job with the full rejection set; confirming run re-executing the full twelve-cell suite against immutable base graders (the expensive leg); heal PR job with SHA-pinned create-github-app-token for app 5156617, base-moved check, never merge/tag/publish; merge-denial plus human merge/reject receipts; not-reproduced and no-op-patch negative paths. Unmerged branch 9624a4b is mechanics salvage only — its root harness/ and gate wiring must not land.

**First integrated demonstration:** Real dispatch of harness-eval on the real repo after this sprint's work lands, reading the real artifact the gate names; prerequisites anticipated from the size sketch, revalidated at promotion.

**Owner questions (answer before the sprint starts):**
- Repository owner prerequisite: activate and verify the main-branch update restriction (designated human maintainers bypass; heal app 5156617 has none; heal/* exempt) and provision the heal-agent environment ANTHROPIC_API_KEY for the direct pinned Claude CLI invocation — when can both be done? (needed by: sprint-05-fix-pull-request heal jobs)
- How should the gate stage a real newest-only graded failure for this sprint's human merge decision — wait for a genuine newest-CLI break, or authorize a temporary reproduction that the fixer then repairs for real? (needed by: sprint-05-fix-pull-request human gate)

#### Holdout Promise Map

| Obligation/version | Approved source and exact quote | Beneficiary | Promise | Failure cost | Public falsifier | Boundary | Purpose/encounter | Preserve | Coverage |
|---|---|---|---|---|---|---|---|---|---|
| fix-allowlist-never-widens/1.0.2 | `b1774cd (PRD 1.0.2, 2026-10-28; 09-technical-requirements/03-data-schema.md, FixPatch/FixPullRequest)`: "Repository-relative paths allowed are `plugins/pixel-perfect/harness/*.json` and `plugins/pixel-perfect/skills/**`. Use " | repository owner and reviewers of heal PRs | No generated fix touches anything outside the plugin harness/skills allowlist, and the same normaliz | A fix that edits graders, tests, or CI can make its own failing evidence disappear — the e | The patch recheck job's rejection log on a planted out-of-allowlist patch, plus the recorded patch S | integrated | keep repair authority strictly smaller than grading authority | never widen the allowlist without an explicit re-check; resolving the plugins/pixel-perfec | candidate |

> Test steps and the task table are authored when this sprint becomes next (`/kb-sprint-tasks-plan`), against the codebase as it is then. See COMMIT-HORIZON.md.

#### Dependencies

- Blocks: none
- Dependent on: Sprints 02, 03, 04

#### PRD Coverage

- 05-uc-rel.md (UC-REL-02, UC-REL-03, UC-REL-04 AC-4), 09-technical-requirements/02-system-components.md (fix-agent job, patch recheck job, confirming run, heal pull-request job, main-branch restriction prerequisite), 09-technical-requirements/03-data-schema.md (FixPatch/FixPullRequest, allowlist and salvage boundary at :133), 09-technical-requirements/04-api-design.md (newest warning never publishes; release side effects) …

#### Capability Coverage

- CAP-EVAL-03: Fix pull request


### Sprint 06: Report-only later checks and the one resume-with-text path across all six harnesses

**Sequence:** 6
**Timeline:** Phase 6
**Status:** Planned
**Fidelity:** provisional
**Proposed by:** github-agentic-workflow-planner + evals-planner
**Milestone:** —

#### Human Testing Gate

**Gate:** Done means the finished run's harness-eval-result artifact carries a later_checks block reporting decline-change, scripted-answers, resume, one-full-layer, and plain-language-command-choice verdicts with blocks_release=false for all six harnesses — each scripted answer delivered over one persistent resume-with-text native session resumed in a second process with a context-dependent continuation, Pi omitting --no-session on the later path only, and a missing-session negative control per harness — and a deliberately failing later check leaves `node scripts/release.mjs verify` output byte-identical to its no-later-checks state, proven by jq over later_checks and unchanged dry-run transcripts.
**Entrypoint:** gh workflow run harness-eval --repo hackerpug-ai/pixel-perfect, read via the result artifact's later_checks section (surface 2), cross-checked against node scripts/release.mjs verify (surface 4)
**Shape:** product
**Before:** The result artifact has no later_checks block, no LaterCheckReport/ResumeState records exist, no resume-with-text argv exists for any harness, and nothing measures decline-change, one-full-layer, or plain-language command choice.
**Demonstrates:** UC-RPT-01, UC-RPT-02
**Proves (ACs):** UC-RPT-01: AC-1, AC-2, AC-3; UC-RPT-02: AC-1, AC-2, AC-3
**Sizing (provisional):** ~6 items · ~21-34 pts — Reuses the entire sprint-01..03 spine: one resume-with-text runtime (persist isolated native session, record namespaced ID/session directory/fixture identity/question header, stop, resume the same conversation in a separate process with one plain-text answer, prove context-dependent continuation using facts not repeated in the answer, capture evidence, clean up) parameterized per harness; five later-check cases wired to existing streams; per-harness missing-session negative control; first-checks-consume-no-answers regression control. Per-version argv qualification is the schedule risk, not code volume.

**First integrated demonstration:** Real dispatch of harness-eval on the real repo after this sprint's work lands, reading the real artifact the gate names; prerequisites anticipated from the size sketch, revalidated at promotion.

**Owner questions (answer before the sprint starts):**
- Confirm the per-version resume-with-text argv proof plan — each harness's exact continuation flags demonstrated against its real CLI before the later check reports anything other than could-not-run, or accept per-harness could-not-run where real argv cannot be shown? (needed by: sprint-06-later-checks-resume per-harness qualification)

#### Holdout Promise Map

| Obligation/version | Approved source and exact quote | Beneficiary | Promise | Failure cost | Public falsifier | Boundary | Purpose/encounter | Preserve | Coverage |
|---|---|---|---|---|---|---|---|---|---|
| later-checks-never-hold-a-release/1.0.2 | `b1774cd (PRD 1.0.2, 2026-10-28; 09-technical-requirements/04-api-design.md, release truth table)`: "Later check fails or could-not-run | Report only; cannot block or clear" | maintainer reading a run with weak later-check results | Later-check results are recorded with blocks_release=false and can never appear as the reason a rele | A flaky report-only check holding a release would turn optional instrumentation into an ou | A run with a failing later check whose release dry-run verdict or reasons differ from the same SHA's | integrated | keep the release gate driven only by the four grades, drift, and evidence authority | LaterCheckReport.blocks_release is false by construction; recorder exit code and release b | candidate |
| first-checks-consume-no-scripted-answers/1.0.2 | `b1774cd (PRD 1.0.2, 2026-10-28; 06-uc-rpt.md UC-RPT-02 AC-3)`: "Maintainer can rely on list, status, and verify still asking nothing and the separate must-ask probe receiving no answer" | maintainer trusting the four grades | Command list, status, and verify invocations ask nothing and consume no scripted answer on any harne | A harness that answers its own question via a queued script could pass a check that would  | Queue a scripted answer before a first-check run and inspect the captured stream: no answer text may | integrated | keep the four first grades honest before scripted answers exist anywhere | must-ask probe stops at first valid question and sends nothing; boundary-stop capture neve | candidate |

> Test steps and the task table are authored when this sprint becomes next (`/kb-sprint-tasks-plan`), against the codebase as it is then. See COMMIT-HORIZON.md.

#### Dependencies

- Blocks: none
- Dependent on: Sprints 01, 02

#### PRD Coverage

- 06-uc-rpt.md (UC-RPT-01, UC-RPT-02), 09-technical-requirements/02-system-components.md (resume-with-text), 09-technical-requirements/03-data-schema.md (LaterCheckReport/ResumeState), 09-technical-requirements/08-technical-risks.md (R-resume-untested, R-question-signal) …

#### Capability Coverage

- CAP-EVAL-04: Resume with text
