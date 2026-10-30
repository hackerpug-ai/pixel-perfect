---
stability: FEATURE_SPEC
last_validated: 2026-10-30
prd_version: 2.0.0
---

# Functional Groups

| Group | Prefix | Description |
|-------|--------|-------------|
| Harness grades | GRD | The maintainer reads pass, fail, or could-not-run for every harness on both versions, reads the four grades from written results and the event stream, and can see a named planted defect without a clean project failing. |
| Release holds | REL | A pinned graded failure or a could-not-run holds the next release. A newest-only graded failure warns and waits for a person to merge a fix. Drift refuses a release apart from any live grade. |
| Later reports | RPT | Decline a change, scripted answers, resume, one full layer, and plain-language command choice report in this same initiative and do not hold a release. Later answers share one resume path. |
| Scheduled and hand grades | RUN | The grade starts on its own each night, when the maintainer starts it, and after accepted plugin changes land. A change that is still proposed does not start it. |
| Failure issues | ISS | A finished run files one issue per distinct unexpected failure, with the evidence a fixer needs and the eval to re-run to prove the fix. Results the plan expects file nothing. An issue grants no authority and has no effect on a release. |

## Use Case Summary

| Group | Use cases |
|-------|-----------|
| GRD | 6 |
| REL | 5 |
| RPT | 2 |
| RUN | 3 |
| ISS | 6 |
