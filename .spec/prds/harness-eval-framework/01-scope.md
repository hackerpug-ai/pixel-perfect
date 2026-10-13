---
stability: FEATURE_SPEC
last_validated: 2026-10-13
prd_version: 1.0.0
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
- Scripted answers on the first grades. The first checks ask nothing. The shared resume path is only for later answers.
- Clearing a pinned release block by merging a newest-only fix. That merge does not clear a pinned block, and an open fix is not a cleared release.

## Constraints

- A person merges every fix. This grade never publishes a release.
- Accepted work lands on main. This initiative does not track a pull request per sprint.
- Cursor is a real channel. It has no key yet and no headless trial, and the owner has not exempted it.
- Permission is not approve-everything. Choosing the exact flags is outside this product scope.
- A fix stays inside the current change allowlist until that limit is explicitly re-checked.
