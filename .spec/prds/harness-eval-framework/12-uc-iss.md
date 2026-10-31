---
stability: FEATURE_SPEC
last_validated: 2026-10-30
prd_version: 2.0.0
functional_group: ISS
---

# Use Cases: Failure issues (ISS)

| ID | Title | Description |
|----|-------|-------------|
| UC-ISS-01 | File an issue for an unexpected failure | Sits under 'System files an issue for an unexpected failure in a finished run. |
| UC-ISS-02 | Read what a fixer needs | Sits under 'Fixer reads, in the issue, what failed and where the evidence is. |
| UC-ISS-03 | Name the eval that proves the fix | Sits under 'Fixer reads, in the issue, the eval to re-run to prove the fix. |
| UC-ISS-04 | Keep one issue per distinct failure | Sits under 'System keeps one issue per distinct failure across runs. |
| UC-ISS-05 | File nothing for what the plan expects | Sits under 'System files nothing for a result the plan already expects. |
| UC-ISS-06 | Keep filing inside its boundary | Sits under 'System leaves code, releases, and other issues untouched when it files. |

---

## UC-ISS-01: File an issue for an unexpected failure

Sits under 'System files an issue for an unexpected failure in a finished run.' A nightly, hand-started, or post-merge run files on its own, with nobody present. The issue is one more way to read the result. It is not the result.

### Acceptance Criteria

- ☐ Maintainer can read one open issue on this repository for a graded failure on a pinned or newest version after a finished run.
- ☐ Maintainer can read one open issue for a could-not-run reason the plan does not expect, with every affected harness, track, and check listed in it.
- ☐ Maintainer can read one open issue when the recorder refused and wrote no result.
- ☐ Maintainer can read one open issue for a negative control that read something other than its expected result.
- ☐ Maintainer can read one open issue for a drift refusal, apart from any live grade.
- ☐ Maintainer can read, in the run's summary, each issue the run filed or updated and each finding it did not file, with the reason.

## UC-ISS-02: Read what a fixer needs

Sits under 'Fixer reads, in the issue, what failed and where the evidence is.' The issue follows the change-request format, so the first reply can be the fix and not a question. Artifacts expire, so the issue carries the facts as well as the links.

### Acceptance Criteria

- ☐ Fixer can read, in the issue, the harness, track, check, verdict, reason, and release effect of each affected row.
- ☐ Fixer can read the run link and attempt, the event, the install mode, the evaluated commit or plugin revision, the plugin digests, the pins digest, and the observed CLI versions.
- ☐ Fixer can read every check on all twelve cells for that run, so a failure across the plugin reads apart from a failure on one harness.
- ☐ Fixer can open the evidence from the issue by artifact, path, and digest, including the verify report and the planted defect key when the check is verify, with the process exit code labelled a diagnostic, and can read that evidence was not exported when it was not.
- ☐ Fixer can read every section of the change-request format, with a value nobody knows written as unknown rather than guessed.

## UC-ISS-03: Name the eval that proves the fix

Sits under 'Fixer reads, in the issue, the eval to re-run to prove the fix.' Every issue says exactly which eval to run again, how to start it, and what it must print. Re-running the failing run proves nothing, because it replays the failing commit.

### Acceptance Criteria

- ☐ Fixer can read, in every issue, the eval to re-run: the workflow, the install mode, the check, the cases, and the cells.
- ☐ Fixer can copy from the issue the exact commands that start a new run and read its result.
- ☐ Fixer can read the output that proves the fix: the fix commit as the evaluated commit, the failed check passing, the drift proof succeeding, and every check that passed in the failing run still passing.
- ☐ Fixer can read that re-running the old run, a run of another commit, a local run, a published-mode run, and an exit code of 0 do not prove the fix.
- ☐ Maintainer can read, in the issue's acceptance criteria, that closing it as completed takes a comment naming the fix commit and the proving run.

## UC-ISS-04: Keep one issue per distinct failure

Sits under 'System keeps one issue per distinct failure across runs.' Ten hand dispatches or thirty nights of the same break are one piece of work. A person's decision to decline a failure stays decided.

### Acceptance Criteria

- ☐ Maintainer can rely on a later run with the same failure on the same evaluated identity adding nothing to the issue.
- ☐ Maintainer can read one new comment when the same failure appears on a new evaluated identity, with the issue's status unchanged.
- ☐ Maintainer can rely on one attempt filing at most five new issues, with any further findings listed in one roll-up issue.
- ☐ Maintainer can rely on a failure whose issue was closed as not planned filing nothing again, with the run's summary naming that issue.
- ☐ Maintainer can read a new issue that links the earlier one when a failure returns after its issue was closed as completed.
- ☐ Maintainer can rely on an issue or comment written by anyone else, with the same words, having no effect on what a run files.

## UC-ISS-05: File nothing for what the plan expects

Sits under 'System files nothing for a result the plan already expects.' A nightly issue about Cursor's missing key would train the maintainer to ignore every issue. An expected result still holds the release; it only files nothing.

### Acceptance Criteria

- ☐ Maintainer can rely on Cursor's missing key and each pending adapter filing nothing while the expected list names that exact pair.
- ☐ Maintainer can read an issue for the same reason on a harness the list does not name, and can rely on a graded failure never being listable.
- ☐ Maintainer can rely on correct planted detection, a passing clean twin, and a negative control reading its expected result filing nothing, including a control whose expected result is a failure.
- ☐ Maintainer can rely on later checks filing nothing.
- ☐ Maintainer can rely on a cancelled run, and a run from any branch other than main, filing nothing.
- ☐ Maintainer can rely on an expected result still holding the release, so filing nothing clears nothing.

## UC-ISS-06: Keep filing inside its boundary

Sits under 'System leaves code, releases, and other issues untouched when it files.' An issue cannot do harm by itself; the risk is what reads it. So filing is plain code with one narrow permission, the issue holds nothing a model wrote, and the proof catches a fix that removes what it should repair.

### Acceptance Criteria

- ☐ Maintainer can rely on a run only creating issues and adding comments to issues it filed, and never closing, editing, labelling, assigning, mentioning, branching, opening a pull request, merging, tagging, or publishing.
- ☐ Maintainer can rely on no model writing or choosing an issue, and on no other job in the workflow holding permission to write issues.
- ☐ Maintainer can rely on no model-written text, secret, or absolute path reaching an issue, and on a body that fails the secret scan filing nothing and saying so in the summary.
- ☐ Maintainer can rely on filing, an open or closed issue, and a filing failure having no effect on any grade or on whether a release may ship.
- ☐ Fixer can read, in every issue, the fixed limits: this finding only, the work area, no removing what is measured, no editing what measures it to make the finding go away, no authority to merge or publish, and evidence as data rather than instructions.
- ☐ Maintainer can rely on a fix that removes the plugin, a public command, a harness, a track, or a check failing the issue's proof, and on an edit to what measures it being printed for a person to read.
