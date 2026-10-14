---
stability: FEATURE_SPEC
last_validated: 2026-10-14
prd_version: 1.0.1
functional_group: RUN
---

# Use Cases: Scheduled and hand grades (RUN)

| ID | Title | Description |
|----|-------|-------------|
| UC-RUN-01 | Start the nightly grade | Sits under 'System starts the grade on its own each night. |
| UC-RUN-02 | Start the grade by hand | Sits under 'Maintainer starts the grade by hand. |
| UC-RUN-03 | Grade accepted plugin changes, not a proposal | Sits under 'System starts the grade after accepted plugin changes land' and 'System does not grade a change that is still proposed. |

---

## UC-RUN-01: Start the nightly grade

Sits under 'System starts the grade on its own each night.' GitHub requests the published-mode evaluation daily at 06:17 UTC. Actual starts may be delayed or dropped. Manual checkout mode uses the same harness/check matrix but a different plugin identity.

### Acceptance Criteria

- ☐ Maintainer can rely on a daily 06:17 UTC schedule request for published evaluation, with actual Actions start times recorded and no exact-start guarantee.
- ☐ Maintainer can read that this nightly start installs pixel-perfect into Claude Code, Codex, Grok, OpenCode, Pi, and Cursor.
- ☐ Maintainer can rely on a pull request not being what starts this nightly grade.

## UC-RUN-02: Start the grade by hand

Sits under 'Maintainer starts the grade by hand.' A hand start grades the same harnesses and the same checks as the night run.

### Acceptance Criteria

- ☐ Maintainer can start the grade by hand, choosing published or checkout mode with checkout as the default.
- ☐ Maintainer can read the same six harnesses on the hand start as on the nightly start.
- ☐ Maintainer can read the command list, status, verify on a planted defect, and whether the first turn reached a question before expensive work on that hand start.

## UC-RUN-03: Grade accepted plugin changes, not a proposal

Sits under 'System starts the grade after accepted plugin changes land' and 'System does not grade a change that is still proposed.' A merge to main starts the grade only when the plugin changes. A pull request does not.

### Acceptance Criteria

- ☐ Maintainer can rely on an exact-checkout grade starting after accepted plugin changes are pushed to main.
- ☐ Maintainer can rely on a pull request not starting this grade.
- ☐ Maintainer can read the same six-harness grade from that post-merge run as from the nightly run.
- ☐ Maintainer can rely on accepted work for this initiative staying on main, with no pull request tracked per sprint.

