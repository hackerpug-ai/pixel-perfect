---
stability: FEATURE_SPEC
last_validated: 2026-10-14
prd_version: 1.0.1
scope_posture: full
---

# Scope

## Scope Posture

Full feature.

## Objective

Each night, when the owner starts a run by hand, and after accepted plugin changes land, GitHub Actions installs pixel-perfect into Claude Code, Codex, Grok, OpenCode, Pi, and Cursor and grades command lists, status, verify on a planted defect, and whether the first turn reaches a question before expensive work. A failure on a pinned harness version blocks the next release, and a graded failure on the newest version warns and opens a fix pull request that a person merges. Grades use files and the event stream, exit code 0 is not success, later checks in this same initiative report rather than block, and a model judging screenshots stays out.

## Deliverables

- A run summary with pass, fail, or could-not-run for each harness on the pinned version and the newest version
- A verify report when verify fails, at the path the failing case names
- A release hold when a pinned harness fails a grade or a harness could not run
- A warning and a fix pull request when only the newest version fails a grade
- A drift refusal, separate from any live harness result, when commands, adapters, or question rules have drifted
- Reported results for the later checks that do not hold a release

## In Scope

### Scheduled and hand grades (G1, G3, G4)

- System starts the grade on its own each night
- Maintainer starts the grade by hand
- System starts the grade after accepted plugin changes land
- System does not grade a change that is still proposed
### Harness grades (G1, G4)

- Maintainer reads pass, fail, or could-not-run for each harness on the pinned version and the newest version
- Maintainer reads the command list, status, verify on a planted defect, and whether the first turn asked before expensive work
- Maintainer reads each grade from written results and the event stream
- Maintainer reads the planted defect when verify fails
- Maintainer reads a clean project as not a verify failure
- System fails a run that is missing its credential
### Release holds (G2, G3)

- System holds the next release when a pinned harness fails a grade
- System warns and does not hold the release when only the newest version fails a grade
- System opens a fix a person merges for that newest-only failure
- System holds the release when a harness could not run and does not open a fix
- System refuses a release when commands, adapters, or question rules have drifted
- Maintainer reads a drift refusal apart from a live harness grade
### Later reports (objective statement)

- Maintainer reads decline-a-change, scripted-answer, resume, one-full-layer, and plain-language command results without those results holding a release
- System carries a later answer on a shared resume path

## Out of Scope

- A model judging screenshots or scoring design fidelity. Design fidelity stays out. A missing screenshot score is not a gap in the run.
- A navigable product screen or desktop application. Readers use the run summary, the verify report, and the fix pull request.
- Publishing a release from this grade, or merging a fix without a person. A person merges every fix. The run never publishes.
- Grading a change that is still proposed. The grade runs on its own, by hand, and after accepted plugin changes land. It does not run on a pull request.
- Pull-request tracking for each sprint. Accepted work lands on main.
- An approve-everything permission stance. The stance is not approve-everything. The exact flags are an engineering choice, not a product feature.
- A fix pull request for a could-not-run result. Could-not-run is not a graded product defect. It blocks the release and does not open a fix.
- Scripted answers on the first grades. List, status, and verify ask nothing; the independent must-ask probe stops at its first question and receives no answer. The shared resume path is only for later answers.
- Clearing a pinned release block by merging a newest-only fix. That merge does not clear a pinned block, and an open fix is not a cleared release.

## Constraints

- A person merges every fix. This grade never publishes a release.
- Accepted work lands on main. This initiative does not track a pull request per sprint.
- Cursor is a real channel. It has no key yet and no headless trial, and the owner has not exempted it.
- Permission is not approve-everything. Choosing the exact flags is outside this product scope.
- A fix stays inside the current change allowlist until that limit is explicitly re-checked.

## Accepted remediation decisions (2026-10-14)

Nightly runs evaluate only the published plugin, resolved once per run. Plugin pushes evaluate the exact checkout. Manual runs select a mode and default to checkout. Each run retains twelve cells. Candidate release authorization requires the latest trusted complete checkout evaluation for that commit, at most 36 hours old; a newer pending, failed, or cancelled attempt invalidates the older pass. A blocking published observation requires a subsequent qualifying checkout evaluation to clear it. The detailed transition rules are in [API Design](09-technical-requirements/04-api-design.md).

Correct planted-defect detection is an evaluation pass if the clean twin passes and evidence is valid. List, status, and verify ask nothing. The separate initialization question probe stops at its first valid question without an answer. Later scripted-answer checks remain report-only. Structural-only live verification must prove that no image judging occurred, including in child calls.

The existing fix patterns are relative to plugins/pixel-perfect. Resolving that root does not widen the allowlist. A newest failure must reproduce on the recorded main repair base and its exact patch must pass confirmation before a human-reviewable PR exists. Repository enforcement must deny the heal app merge authority. These are specification requirements, not claims of deployed controls.
