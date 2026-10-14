---
stability: TEST_SPEC
last_validated: 2026-10-14
prd_version: 1.0.1
---

# Review remediation record

Source: red-hat-20261014T132609Z-harness-eval-framework, report contract 2, reviewed commit 9825d9c25c4eb4def9a5e980b1ac0928991a7036. The original report and reviewer evidence remain unchanged under `.spec/reviews/`. This revision addresses its 17 findings (12 HIGH, 5 MEDIUM) in the specification only.

## Accepted decisions and authority

The owner selected published-only nightly evaluation and a 36-hour lifetime for checkout evidence. Manual runs default to checkout; plugin pushes evaluate their exact commit. Newer pending, failed, or cancelled candidate attempts invalidate older success. Published blocking observations require later qualifying checkout proof. The authoritative release transition is [API Design](09-technical-requirements/04-api-design.md); data and evidence contracts are in [Data Schema](09-technical-requirements/03-data-schema.md).

Preserve all 65 existing T-* identities, all 68 original FLOW-* identities, and all 16 use cases. Nine additional scenarios strengthen existing criteria; no new acceptance IDs are needed. The resulting 77 scenarios are definitions, not executions. Goals remain proposed. Cursor is not exempted. The fix allowlist remains limited to its existing patterns, now explicitly relative to plugins/pixel-perfect. Later checks remain report-only. No runtime, deployment, or repository-settings change is included in this remediation.

## Finding disposition

Every row has specification edits and a discriminating planned observation. Final independent review and structural-check results are recorded below. Runtime status for every row is **unverified**; a written requirement or green document check is not service proof.

| Finding / change | Contract correction | Primary source | Stable criteria | Required scenario |
|------------------|---------------------|----------------|-----------------|-------------------|
| F-001 / CHG-001 | Loaded plugin and harness identity | [03-data-schema.md](09-technical-requirements/03-data-schema.md) | T-GRD-002; T-RUN-007 | [flow-grd-01-loaded-identity.scenario](../../scenarios/UC-GRD-01/flow-grd-01-loaded-identity.scenario.md) |
| F-002 / CHG-002 | Trusted latest run, holds, and 36-hour authorization | [04-api-design.md](09-technical-requirements/04-api-design.md) | T-REL-001,003,004,008,014,018 | [flow-rel-01-authoritative-run.scenario](../../scenarios/UC-REL-01/flow-rel-01-authoritative-run.scenario.md) |
| F-003 / CHG-003 | Observed defect versus evaluation verdict | [03-data-schema.md](09-technical-requirements/03-data-schema.md) | T-GRD-007,013,017,019; T-REL-001 | [flow-grd-02-four-grades.scenario](../../scenarios/UC-GRD-02/flow-grd-02-four-grades.scenario.md) |
| F-004 / CHG-004 | Case-declared report producer/path/evidence | [03-data-schema.md](09-technical-requirements/03-data-schema.md) | T-GRD-013–018 | [flow-grd-04-named-path.scenario](../../scenarios/UC-GRD-04/flow-grd-04-named-path.scenario.md) |
| F-005 / CHG-005 | Complete incremental canonical facts | [03-data-schema.md](09-technical-requirements/03-data-schema.md) | T-GRD-007,009,010,012,018 | [flow-grd-03-event-coverage.scenario](../../scenarios/UC-GRD-03/flow-grd-03-event-coverage.scenario.md) |
| F-006 / CHG-006 | Factual status with two seeded states | [03-data-schema.md](09-technical-requirements/03-data-schema.md) | T-GRD-007,008 | [flow-grd-02-status-facts.scenario](../../scenarios/UC-GRD-02/flow-grd-02-status-facts.scenario.md) |
| F-007 / CHG-007 | Concrete independent must-ask probe | [03-data-schema.md](09-technical-requirements/03-data-schema.md) | T-GRD-007–009; T-RPT-006 | [flow-grd-02-must-ask.scenario](../../scenarios/UC-GRD-02/flow-grd-02-must-ask.scenario.md) |
| F-008 / CHG-008 | Consumed credentials and isolated negative setup | [03-data-schema.md](09-technical-requirements/03-data-schema.md) | T-GRD-021,022 | [flow-grd-06-missing-key.scenario](../../scenarios/UC-GRD-06/flow-grd-06-missing-key.scenario.md) |
| F-009 / CHG-009 | Direct pinned CLI fixer with credential separation | [02-system-components.md](09-technical-requirements/02-system-components.md) | T-REL-007,010–013 | [flow-rel-02-patch-confirmation.scenario](../../scenarios/UC-REL-02/flow-rel-02-patch-confirmation.scenario.md) |
| F-010 / CHG-010 | Reachable newest repair and actual human gate | [02-system-components.md](09-technical-requirements/02-system-components.md) | T-REL-010–014 | [flow-rel-03-person-decides.scenario](../../scenarios/UC-REL-03/flow-rel-03-person-decides.scenario.md) |
| F-011 / CHG-011 | Repository-enforced bot merge denial | [02-system-components.md](09-technical-requirements/02-system-components.md) | T-REL-007,013 | [flow-rel-03-remote-evidence.scenario](../../scenarios/UC-REL-03/flow-rel-03-remote-evidence.scenario.md) |
| F-012 / CHG-012 | Effective exact-patch confirmation | [03-data-schema.md](09-technical-requirements/03-data-schema.md) | T-REL-007,011,012 | [flow-rel-02-patch-confirmation.scenario](../../scenarios/UC-REL-02/flow-rel-02-patch-confirmation.scenario.md) |
| F-013 / CHG-013 | Actual Actions schedule and delayed/missed behavior | [04-api-design.md](09-technical-requirements/04-api-design.md) | T-RUN-001–004 | [flow-run-01-scheduler-crash.scenario](../../scenarios/UC-RUN-01/flow-run-01-scheduler-crash.scenario.md) |
| F-014 / CHG-014 | Persistent later native sessions | [03-data-schema.md](09-technical-requirements/03-data-schema.md) | T-RPT-004–006 | [flow-rpt-02-resume-text.scenario](../../scenarios/UC-RPT-02/flow-rpt-02-resume-text.scenario.md) |
| F-015 / CHG-015 | Observe forbidden screenshot judging | [03-data-schema.md](09-technical-requirements/03-data-schema.md) | T-GRD-006 | [flow-grd-01-hidden-image-judge.scenario](../../scenarios/UC-GRD-01/flow-grd-01-hidden-image-judge.scenario.md) |
| F-016 / CHG-016 | Separate trunk process/history proof | [10-e2e-testing.md](09-technical-requirements/10-e2e-testing.md) | T-RUN-010 | [flow-run-03-trunk-history.scenario](../../scenarios/UC-RUN-03/flow-run-03-trunk-history.scenario.md) |
| F-017 / CHG-017 | One explicit plugin-root allowlist | [03-data-schema.md](09-technical-requirements/03-data-schema.md) | T-REL-007,012 | [flow-rel-02-patch-confirmation.scenario](../../scenarios/UC-REL-02/flow-rel-02-patch-confirmation.scenario.md) |

## Verification and remaining proof

- Structural validation: 17/17 checks passed: criterion agreement, stable/unique IDs, local links, coverage, versions, YAML frontmatter, whitespace, and 187 preserved review/WIP file hashes. See the [validation record](../../reviews/remediation-evidence-20261014-harness-eval-framework/validation.md).
- Independent review: harness, security, and test-quality reviewers approved planning closure after source rechecks. The Pi boundary-stop contradiction, status pagination control, artifact attempt provenance, and bounded published-hold history were corrected during review. Initial findings and final dispositions are retained in the evidence directory; the original red-hat review is unchanged.
- Runtime: unverified. Required real evidence includes six harness installs/load identities, version-specific stream mappings, actual provider credential controls, planted/clean structural verification, hidden-judge rejection, GitHub provenance/freshness/schedule records, fixer model execution, app merge denial plus human merge/reject, and native cross-process resume.
- The real Linux Pi reference flow remains a prerequisite. Unsupported CLI arguments, missing keys/stances, and unavailable observations stay could-not-run; none may be filled with stubs or claimed passed from documentation.

## Re-review evidence

- [Harness review and boundary-stop recheck](../../reviews/remediation-evidence-20261014-harness-eval-framework/harness-review.md)
- [Security findings and final disposition](../../reviews/remediation-evidence-20261014-harness-eval-framework/security-review.md)
- [Test-quality review of 65 criteria, 77 scenarios, and 17 findings](../../reviews/remediation-evidence-20261014-harness-eval-framework/test-quality-review.md)

All F-001–F-017 / CHG-001–CHG-017 are resolved at the specification/planning level by the revision and independent rechecks. No runtime closure is implied. Repository regression validation passed `pnpm run ci`: verification, validation, and 576 tests, with zero failures, skips, or TODOs. These existing-product checks do not execute the proposed harness framework.
