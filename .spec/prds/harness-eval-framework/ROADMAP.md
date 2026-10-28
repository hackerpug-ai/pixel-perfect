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

**Sprints:** 6  (1 committed · 5 provisional)
**Total Tasks:** 12  (committed sprint only; provisional sprints carry a size band)
**Current Sprint:** 1 - Evidence spine and evaluator core

Fused from both planning specialists (github-agentic-workflow-planner + evals-planner) with an evals integrity review; holdouts on for every sprint.

## Sprint Sequence

| # | Milestone | Sprint | Gate | Tasks | Dependencies | Status | Forecast |
|---|-----------|--------|------|-------|--------------|--------|----------|
| 1 | — | [Sprint 01: Evidence spine and evaluator core](#sprint-01-evidence-spine-and-evaluator-core) | Twelve evidence-graded cells from one dispatched run; claude-code live, cursor fail-closed | 12 | — | Planned | ~3.5 d / over ×1.2 (owner-approved — see Open Owner Decisions D-01) |
| 2 | — | [Sprint 02: Four live adapters](#sprint-02-four-live-adapters) | Codex, Grok, OpenCode, Pi graded on both tracks; denial controls despite exit 0 | — | Sprint 01 | Planned | band 34–55 pts |
| 3 | — | [Sprint 03: Triggers, status, drift](#sprint-03-triggers-status-drift) | Push starts an exact-checkout run writing harness-eval/pinned; PR starts nothing; nightly deployed | — | Sprint 01 | Planned | band 21–34 pts |
| 4 | — | [Sprint 04: Release gate resolver](#sprint-04-release-gate) | release.mjs verify + tag-release.yml + adapter publish refuse without fresh trusted checkout evidence | — | Sprints 01, 02, 03 | Planned | band 34–55 pts |
| 5 | — | [Sprint 05: Fix pull request pipeline](#sprint-05-fix-pull-request-pipeline) | Newest-only failure yields one allowlisted, app-opened PR a person merges; negative controls open nothing | — | Sprints 02, 03, 04 | Planned | band 34–55 pts |
| 6 | — | [Sprint 06: Later checks + resume](#sprint-06-later-checks-resume) | later_checks reports five report-only checks over one resume-with-text path; release verdict byte-identical | — | Sprints 01, 02 | Planned | band 21–34 pts |

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
**Status:** Planned
**Fidelity:** provisional
**Proposed by:** github-agentic-workflow-planner + evals-planner
**Milestone:** —

#### Human Testing Gate

**Gate:** Done means one hand dispatch grades command_list, status, planted-defect verify, and question_before_expensive_work from real event streams for Claude Code, Codex, Grok, OpenCode, and Pi on pinned and newest — Cursor remaining could-not-run by design — with every unqualified mapping reported as could-not-run with a stream-mapping reason instead of an omission, proven by jq over the result artifact showing four check verdicts with evidence paths in all ten keyed cells plus a per-harness missing-key control and an exit0-denied-read control that yields fail on a cell whose process_exit_code is 0.
**Entrypoint:** gh workflow run harness-eval --repo hackerpug-ai/pixel-perfect, read via the run's harness-eval-result artifact (surfaces 1 and 2)
**Shape:** product
**Before:** Only the claude-code cells carry graded verdicts; codex, grok, opencode, and pi cells read could-not-run adapter-absent in every run, no Linux install of the Grok CLI has ever been run, Pi status is unproven on both 0.84.4 and 1.0.x, and the OpenCode serve-password extraction with dashes has never run in CI.
**Demonstrates:** UC-GRD-01, UC-GRD-02, UC-GRD-03, UC-GRD-04
**Proves (ACs):** UC-GRD-01: AC-2, AC-6; UC-GRD-02: AC-1, AC-2, AC-3; UC-GRD-03: AC-1, AC-2, AC-3; UC-GRD-04: AC-6
**Sizing (provisional):** ~9 items · ~34-55 pts — Four adapters (codex, grok, opencode, pi), each mirroring sprint-01's adapter+mapping scope while reusing the capture/grader spine: install+identity, no-model list, four graded invocations, per-version stream mapping + validator entry, per-harness missing-key control. Union specifics from both specialists: Grok needs a first-ever Linux install and a keyless-only --trust rule; Pi needs auth preflight, --model provider/id, and the boundary-stop/message_end rule on JSON-mode exit 0; OpenCode needs the real-copy INSTALL.md install, the namespaced .opencode/commands/pixel-perfect/ list (flat path matches nothing), the serve command.list fallback with whole-third-field password extraction (dashes allowed), OPENCODE_PERMISSION stance, and the run --command pixel-perfect/<name> form with verify honestly could-not-run while the fixture-args join is unknown; Codex needs cache-resident plugin identity verification and the read-only vs workspace-write sandbox split. Documented unknowns may resolve to honest could-not-run cells rather than code, which is why the band is wide.

**First integrated demonstration:** Real dispatch of harness-eval on the real repo after this sprint's work lands, reading the real artifact the gate names; prerequisites anticipated from the size sketch, revalidated at promotion.

**Owner questions (answer before the sprint starts):**
- Approve the Grok permission stance rule given that --trust may appear only in a keyless install step (this Mac's approve-everything Grok config must not be copied to the runner), and confirm the Codex pinned version plus hosted-runner sandbox support (unprivileged user namespaces) as a runner requirement for the --sandbox read-only and workspace-write steps? (needed by: sprint-02 grok + codex qualification)
- Which exact provider/model go in pins.json for Pi (SMOKE_PI_KEY to GEMINI_API_KEY, provider google) and OpenCode (selected Anthropic provider with ANTHROPIC_API_KEY)? (needed by: sprint-02 pi + opencode qualification)
- OpenCode verify: the channel for fixture args such as --platform web-desktop is unknown, so verify on OpenCode is could-not-run until the join is known — accept that cell state, or fund the argv research inside this sprint? (needed by: sprint-02 opencode adapter)

> Test steps and the task table are authored when this sprint becomes next (`/kb-sprint-tasks-plan`), against the codebase as it is then. See COMMIT-HORIZON.md.

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
