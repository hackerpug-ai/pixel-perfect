---
stability: FEATURE_SPEC
last_validated: 2026-10-13
prd_version: 1.0.0
functional_group: RPT
---

# Use Cases: Later reports (RPT)

| ID | Title | Description |
|----|-------|-------------|
| UC-RPT-01 | Read later checks that do not hold a release | Sits under 'Maintainer reads decline-a-change, scripted-answer, resume, one-full-layer, and plain-language command results without those results holding a release. |
| UC-RPT-02 | Carry a later answer on one resume path | Sits under 'System carries a later answer on a shared resume path. |

---

## UC-RPT-01: Read later checks that do not hold a release

Sits under 'Maintainer reads decline-a-change, scripted-answer, resume, one-full-layer, and plain-language command results without those results holding a release.' These checks are in this initiative and only report.

### Acceptance Criteria

- ☐ Maintainer can read a result for decline a change, scripted answers, resume, one full layer, and plain-language command choice.
- ☐ Maintainer can rely on those results not blocking a release.
- ☐ Maintainer can rely on those results not appearing as the reason a release was blocked.

## UC-RPT-02: Carry a later answer on one resume path

Sits under 'System carries a later answer on a shared resume path.' Scripted answers for every harness use that one path. The first checks still ask nothing.

### Acceptance Criteria

- ☐ Maintainer can rely on scripted answers using one resume-with-text path for Claude Code, Codex, Grok, OpenCode, Pi, and Cursor.
- ☐ Maintainer can rely on that path being used for later answers only.
- ☐ Maintainer can rely on the first checks still asking nothing when this later path exists.

