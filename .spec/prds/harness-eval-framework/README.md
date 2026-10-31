---
title: Harness eval framework
version: 2.0.0
scope_posture: full
pr_sequencing: false
base_branches: []
---

# Harness eval framework - PRD

A nightly, hand-started, and post-merge grade of the pixel-perfect plugin on Claude Code, Codex, Grok, OpenCode, Pi, and Cursor. A pinned failure blocks the release. A newest-only graded failure opens a fix a person merges. Each distinct unexpected failure files an issue on this repository that names the eval to re-run to prove the fix.

> ⚠️ FEATURE_SPEC changed in v2.0.0. Sprint 01 takes it through plan amendments T16 (evidence export) and T17 (filing). Re-run `/kb-sprint-plan --delta-replan` for later sprints.

## PRD Metadata

| Field | Value |
|-------|-------|
| Version | 2.0.0 |
| Scope Posture | Full feature |
| PR Sequencing | Disabled |
| Base Branches | None (lands on trunk) |
| Created | 2026-10-13 |
| Last Updated | 2026-10-30 |

## Document Index

| Section | File | Stability |
|---------|------|-----------|
| [Overview](00-overview.md) | 00-overview.md | PRODUCT_CONTEXT |
| [Scope](01-scope.md) | 01-scope.md | FEATURE_SPEC |
| [Roles](02-roles.md) | 02-roles.md | PRODUCT_CONTEXT |
| [Functional groups](03-functional-groups.md) | 03-functional-groups.md | FEATURE_SPEC |
| [Use cases: Harness grades](04-uc-grd.md) | 04-uc-grd.md | FEATURE_SPEC |
| [Use cases: Release holds](05-uc-rel.md) | 05-uc-rel.md | FEATURE_SPEC |
| [Use cases: Later reports](06-uc-rpt.md) | 06-uc-rpt.md | FEATURE_SPEC |
| [Use cases: Scheduled and hand grades](07-uc-run.md) | 07-uc-run.md | FEATURE_SPEC |
| [Use cases: Failure issues](12-uc-iss.md) | 12-uc-iss.md | FEATURE_SPEC |
| [Team contributions](08-team-contributions.md) | 08-team-contributions.md | FEATURE_SPEC |
| [Technical requirements](09-technical-requirements/README.md) | 09-technical-requirements/README.md | CONSTITUTION |
| [E2E testing criteria](10-e2e-testing-criteria.md) | 10-e2e-testing-criteria.md | TEST_SPEC |

[Remediation and evidence boundary](11-remediation.md) maps all seventeen findings to requirements and scenarios.

## Quick Stats

| Item | Count |
|------|-------|
| Groups | 5 |
| Use cases | 22 |
| Test criteria | 99 |

## Version History

| Version | Date | Change |
|---------|------|--------|
| 2.0.0 | 2026-10-30 | Failure issues. A finished run files one issue per distinct unexpected failure, in the change-request format, unattended under the owner's standing authorization, and every issue names the eval to re-run to prove the fix. New group ISS with six use cases and 34 criteria; new technical file 11-failure-issues.md; evidence export required so issues can cite something that exists. Objective statement changed. The accepted remediation decisions moved from the scope section to team contributions, unchanged. Written without a specialist lens; runtime proof remains unverified. |
| 1.0.2 | 2026-10-28 | Review round 2 (red-hat-20261028T114257Z) applied: OpenCode and Cursor adapter premises refreshed to bd53ad0 reality (namespaced commands, real-copy install, serve password), resolver governs the adapter npm publish and disposes pages.yml, pins.json declared greenfield with package.json reconciliation, branch-9624a4b sequencing recorded, T-GRD-004 oracle fixed, per-cell observed CLI version required, day-one Cursor refusal framed as expected, scenario negative-control schema created (remaining template placeholders enumerated for the build). Ten changes; runtime proof remains unverified. |
| 1.0.1 | 2026-10-14 | Seventeen review findings remediated in the specification; published-only nightly and 36-hour checkout evidence. Runtime proof remains unverified. |
| 1.0.0 | 2026-10-13 | Initial PRD. Cursor is included. Goals G1–G4 are proposed, not confirmed. |

## Next Steps

- Confirm or replace the proposed goals.
- Preserve Cursor blocking and the current plugin-root fix allowlist unless the owner explicitly changes them.
- `/kb-sprint-plan` to turn this PRD into sprints.
- The e2e constitution's reference flow is not green yet. The first build has to prove it on a real runner.
