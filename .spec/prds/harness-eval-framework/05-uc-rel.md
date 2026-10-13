---
stability: FEATURE_SPEC
last_validated: 2026-10-13
prd_version: 1.0.0
functional_group: REL
---

# Use Cases: Release holds (REL)

| ID | Title | Description |
|----|-------|-------------|
| UC-REL-01 | Hold the next release for a pinned failure | Sits under 'System holds the next release when a pinned harness fails a grade. |
| UC-REL-02 | Warn on a newest-only graded failure | Sits under 'System warns and does not hold the release when only the newest version fails a grade' and 'System opens a fix a person merges for that newest-only failure. |
| UC-REL-03 | Review the newest-only fix | Sits under 'System opens a fix a person merges for that newest-only failure. |
| UC-REL-04 | Hold the release when a harness could not run | Sits under 'System holds the release when a harness could not run and does not open a fix. |
| UC-REL-05 | Refuse a release for plugin drift | Sits under 'System refuses a release when commands, adapters, or question rules have drifted' and 'Maintainer reads a drift refusal apart from a live harness grade. |

---

## UC-REL-01: Hold the next release for a pinned failure

Sits under 'System holds the next release when a pinned harness fails a grade.' The summary names what blocked the release. A zero exit or an open fix does not clear it.

### Acceptance Criteria

- ☐ Maintainer can rely on a pinned-version graded failure blocking the next release.
- ☐ Maintainer can read, in the summary, the harness and the grade that blocked the release.
- ☐ Maintainer can rely on an exit code of 0 not clearing that block.
- ☐ Maintainer can rely on an open fix pull request not clearing that block.

## UC-REL-02: Warn on a newest-only graded failure

Sits under 'System warns and does not hold the release when only the newest version fails a grade' and 'System opens a fix a person merges for that newest-only failure.' The warning is not a release block, and the run does not publish.

### Acceptance Criteria

- ☐ Maintainer can read a warning, rather than a release block, when the only break is a graded failure on the newest version.
- ☐ Maintainer can read, in the summary, that the pinned release is not blocked by those newest results.
- ☐ Maintainer can open the fix pull request from that warning and can see it waiting for a person to merge it onto main.
- ☐ Maintainer can rely on the open pull request not counting as a cleared release.
- ☐ Maintainer can rely on the run not publishing a release.

## UC-REL-03: Review the newest-only fix

Sits under 'System opens a fix a person merges for that newest-only failure.' The pull request says which harness failed on newest, which grade failed, and where the evidence is.

### Acceptance Criteria

- ☐ Maintainer can read, in the fix pull request, which harness failed on the newest version rather than the pinned version.
- ☐ Maintainer can read which of the four grades failed.
- ☐ Maintainer can read where the evidence is, including the verify report and the named defect when the failed grade is verify.
- ☐ Maintainer can merge or reject that pull request.
- ☐ Maintainer can rely on merging it not clearing a pinned release block.
- ☐ Maintainer can rely on a newest-only graded break waiting on that merge without itself blocking the release.

## UC-REL-04: Hold the release when a harness could not run

Sits under 'System holds the release when a harness could not run and does not open a fix.' Could-not-run is not a pass and not a graded product failure. Cursor is not exempt from this rule.

### Acceptance Criteria

- ☐ Maintainer can read could-not-run as its own result, not as a pass and not as a graded product failure.
- ☐ Maintainer can read why the harness did not run.
- ☐ Maintainer can rely on could-not-run failing the release on the pinned version or on the newest version.
- ☐ Maintainer can rely on could-not-run not opening a fix pull request.
- ☐ Maintainer can read the release effect next to that result and does not have to infer it from the exit code.
- ☐ Maintainer can rely on Cursor not being exempted from this could-not-run block while the owner has not said to exempt it.

## UC-REL-05: Refuse a release for plugin drift

Sits under 'System refuses a release when commands, adapters, or question rules have drifted' and 'Maintainer reads a drift refusal apart from a live harness grade.' The drift proof is not a live harness result and does not look at pixels.

### Acceptance Criteria

- ☐ Maintainer can rely on a release being refused when the plugin's command list, adapters, or question rules have drifted, even when no live harness was graded.
- ☐ Maintainer can rely on that same proof still covering manifests, the 11 public skill names, runtime paths, question-shape rules, contract wiring, and package contents.
- ☐ Maintainer can rely on that proof not looking at pixels.
- ☐ Maintainer can rely on that proof not standing in for a live harness result.
- ☐ Maintainer can read command-list drift and question-rule drift, including drift of the question-before-expensive-work rule, apart from the live grades.
- ☐ Maintainer can read a release refusal that names drift or a live pinned break without mixing the two.

