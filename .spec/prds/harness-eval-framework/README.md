---
title: Harness eval framework
version: 1.0.0
scope_posture: full
pr_sequencing: false
base_branches: []
---

# Harness eval framework - PRD

A nightly, hand-started, and post-merge grade of the pixel-perfect plugin on Claude Code, Codex, Grok, OpenCode, Pi, and Cursor. A pinned failure blocks the release. A newest-only graded failure opens a fix a person merges.

## PRD Metadata

| Field | Value |
|-------|-------|
| Version | 1.0.0 |
| Scope Posture | Full feature |
| PR Sequencing | Disabled |
| Base Branches | None (lands on trunk) |
| Created | 2026-10-13 |
| Last Updated | 2026-10-13 |

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
| [Team contributions](08-team-contributions.md) | 08-team-contributions.md | FEATURE_SPEC |
| [Technical requirements](09-technical-requirements/README.md) | 09-technical-requirements/README.md | CONSTITUTION |
| [E2E testing criteria](10-e2e-testing-criteria.md) | 10-e2e-testing-criteria.md | TEST_SPEC |

## Quick Stats

| Item | Count |
|------|-------|
| Groups | 4 |
| Use cases | 16 |
| Test criteria | 65 |

## Version History

| Version | Date | Change |
|---------|------|--------|
| 1.0.0 | 2026-10-13 | Initial PRD. Cursor is included. Goals G1–G4 are proposed, not confirmed. |

## Next Steps

- Confirm or replace the proposed goals.
- Settle the two open decisions: Cursor's could-not-run block, and the fix-diff allowlist.
- `/kb-sprint-plan` to turn this PRD into sprints.
- The e2e constitution's reference flow is not green yet. The first build has to prove it on a real runner.
