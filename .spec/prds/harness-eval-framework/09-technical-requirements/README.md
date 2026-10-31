# Technical Requirements

Routing: N/A — no navigable UI. Readers use the Actions summary, the verify report file, the fix pull request, and the failure issue. See `07-ui-infrastructure.md`.

## Section Index

| # | File | Topic | Stability |
|---|------|-------|-----------|
| 01 | [01-architecture-posture.md](01-architecture-posture.md) | Architecture posture | CONSTITUTION |
| 02 | [02-system-components.md](02-system-components.md) | System components | CONSTITUTION |
| 03 | [03-data-schema.md](03-data-schema.md) | Data schema | CONSTITUTION |
| 04 | [04-api-design.md](04-api-design.md) | API design | CONSTITUTION |
| 05 | [05-architecture-diagram.md](05-architecture-diagram.md) | Architecture diagram | CONSTITUTION |
| 06 | [06-external-dependencies.md](06-external-dependencies.md) | External dependencies | CONSTITUTION |
| 07 | [07-ui-infrastructure.md](07-ui-infrastructure.md) | UI infrastructure | CONSTITUTION |
| 08 | [08-technical-risks.md](08-technical-risks.md) | Technical risks | CONSTITUTION |
| 09 | [09-capability-chains.md](09-capability-chains.md) | Capability chains | CONSTITUTION |
| 10 | [10-e2e-testing.md](10-e2e-testing.md) | E2E harness constitution | CONSTITUTION |
| 11 | [11-failure-issues.md](11-failure-issues.md) | Failure issues: format, boundaries, rerun proof | CONSTITUTION |

## Cross-references

- Scope: [../01-scope.md](../01-scope.md)
- Roles: [../02-roles.md](../02-roles.md)
- Groups: [../03-functional-groups.md](../03-functional-groups.md)
- Use cases: the `uc-*.md` files in the parent folder

## Version History

| Version | Date | Notes |
|---------|------|-------|
| 2.0.0 | 2026-10-30 | Failure issues: new 11-failure-issues.md; issue job in 02; pointer in 03; hold-scope disposition and truth-table row in 04; diagram, dependencies, UI surfaces, risks, CAP-EVAL-05, and e2e landmines updated. |
| 1.1.0 | 2026-10-28 | Review round 2 corrections: 02-system-components (OpenCode, Cursor), 03-data-schema (pins authority, branch sequencing), 04-api-design (adapter publish gate, pages.yml disposition), 08-technical-risks (checkout install known). |
| 1.0.0 | 2026-10-13 | Initial folder. |

Parent PRD: [../README.md](../README.md)
