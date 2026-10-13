---
stability: FEATURE_SPEC
last_validated: 2026-10-13
prd_version: 1.0.0
functional_group: GRD
---

# Use Cases: Harness grades (GRD)

| ID | Title | Description |
|----|-------|-------------|
| UC-GRD-01 | Read pass, fail, or could-not-run | Sits under 'Maintainer reads pass, fail, or could-not-run for each harness on the pinned version and the newest version. |
| UC-GRD-02 | Read the four grades | Sits under 'Maintainer reads the command list, status, verify on a planted defect, and whether the first turn asked before expensive work. |
| UC-GRD-03 | Read grades from evidence, not the exit code | Sits under 'Maintainer reads each grade from written results and the event stream. |
| UC-GRD-04 | Read the planted defect when verify fails | Sits under 'Maintainer reads the planted defect when verify fails. |
| UC-GRD-05 | Read a clean project as not a verify failure | Sits under 'Maintainer reads a clean project as not a verify failure. |
| UC-GRD-06 | Fail a run that is missing its credential | Sits under 'System fails a run that is missing its credential. |

---

## UC-GRD-01: Read pass, fail, or could-not-run

Sits under 'Maintainer reads pass, fail, or could-not-run for each harness on the pinned version and the newest version.' The summary is the reader. There is no product screen, and a missing screenshot score is not a gap.

### Acceptance Criteria

- ☐ Maintainer can read a result of pass, fail, or could-not-run for Claude Code, Codex, Grok, OpenCode, Pi, and Cursor from the finished run's summary.
- ☐ Maintainer can read that result for the pinned version and for the newest version of each of those harnesses.
- ☐ Maintainer can see that Cursor is present as a real channel and is never omitted.
- ☐ Maintainer can read the summary without a navigable product screen.
- ☐ Maintainer can read a finished run that has no screenshot score and can see that the missing score is not a gap.
- ☐ Maintainer can rely on no model having judged screenshots and on design fidelity staying out of the grade.

## UC-GRD-02: Read the four grades

Sits under 'Maintainer reads the command list, status, verify on a planted defect, and whether the first turn asked before expensive work.' These first checks ask nothing of the maintainer.

### Acceptance Criteria

- ☐ Maintainer can read a command-list grade, a status grade, a verify grade on a planted defect, and a grade for whether the first turn reached a question before expensive work.
- ☐ Maintainer can read those four grades for each harness on the pinned version and on the newest version.
- ☐ Maintainer can rely on these first checks asking no question and using no scripted answer.

## UC-GRD-03: Read grades from evidence, not the exit code

Sits under 'Maintainer reads each grade from written results and the event stream.' A clean exit is not a pass, and a denied tool call is visible.

### Acceptance Criteria

- ☐ Maintainer can read, from the summary, that each grade comes from files and the event stream.
- ☐ Maintainer can treat an exit code of 0 as not success.
- ☐ Maintainer can see a denied tool call and can see that the grade fails even when the process exited 0.

## UC-GRD-04: Read the planted defect when verify fails

Sits under 'Maintainer reads the planted defect when verify fails.' The failing case names the report path. The grader does not invent a filename.

### Acceptance Criteria

- ☐ Maintainer can read the name of the known planted defect when verify fails.
- ☐ Maintainer can read a report file when verify fails, at the path the failing case names.
- ☐ Maintainer can rely on the grader not inventing that report filename.
- ☐ Maintainer can read, in that report, the harness, whether the version was pinned or newest, and the name of the planted defect.
- ☐ Maintainer can tell a missed defect apart from could-not-run.
- ☐ Maintainer can see a denied tool call in that report even when the process exited 0.

## UC-GRD-05: Read a clean project as not a verify failure

Sits under 'Maintainer reads a clean project as not a verify failure.' The clean twin of the planted-defect check does not fail.

### Acceptance Criteria

- ☐ Maintainer can see that the same verify check on the clean twin does not fail.
- ☐ Maintainer can rely on a clean project not being reported as a verify failure.

## UC-GRD-06: Fail a run that is missing its credential

Sits under 'System fails a run that is missing its credential.' A missing key cannot be read as a pass.

### Acceptance Criteria

- ☐ Maintainer can rely on a run with a missing API key failing.
- ☐ Maintainer can rely on that missing-key result not being readable as a pass.

