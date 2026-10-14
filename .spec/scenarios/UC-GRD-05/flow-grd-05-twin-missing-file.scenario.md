---
flow_id: FLOW-GRD-05-TWIN-MISSING-FILE
service: harness-eval
feature: UC-GRD-05
priority: P1
type: error_handling
tier: holdout
scope: task
test_tier: e2e
---

# A clean twin missing its manifest is a setup error, not a product fail

The clean twin is missing design/manifest.json because the copy step failed. Verify does not record a product failure for atoms/Button/default. It records an error or could-not-run for the twin setup and names the missing manifest. The grade is not pass, because the twin never ran. No report says the defect was found in the twin. The planted tree, if it ran, keeps the grade that tree earned.
