---
flow_id: FLOW-JRN-PLANTED-AND-TWIN
service: harness-eval
feature: journey
priority: P0
type: happy_path
tier: visible
scope: journey
covers_ucs: [UC-GRD-04, UC-GRD-05]
test_tier: e2e
---

# Planted detection and clean control earn evaluation pass

Run real structural-only verify on the planted fixture and clean twin. The planted invocation detects atoms/Button/default and leaves protected files unchanged; the clean invocation passes. Retain the case-declared reports reports/verify-button-drift.json and reports/verify-clean.json in their separate invocation directories with observed evidence references. Verify evaluation is pass, despite expected planted oracle exit 1. This alone creates no pinned block or newest repair. A missed defect, clean false positive, report swap, or unrelated-file substitution must fail the relevant evaluation.
