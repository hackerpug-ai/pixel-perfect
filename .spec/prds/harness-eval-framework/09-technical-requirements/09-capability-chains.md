---
stability: CONSTITUTION
last_validated: 2026-10-13
prd_version: 1.0.0
---

# Capability Chains

## CAP-EVAL-01 Install and grade

- Promise: each of the six harnesses, on the pinned version and the newest version, produces a grade file and an event stream.
- Trigger: nightly schedule, hand dispatch, or a push to main that touches the plugin.
- Hops: resolve version, install in the selected mode with no API key, list commands with no model call, copy the fixture, run the ask-nothing checks with stdin closed and an outer timeout, write the grade.
- Failure: a missing key, a missing grade file, a timeout, or a plugin that did not load is could-not-run. A parsed run that breaks a check is fail. Exit code 0 does not choose.
- Proof: a real runner, real CLIs, and real keys. Linux installs are unproven until that run exists.
- Owners: harness-adapter implementer, GitHub Actions implementer.

## CAP-EVAL-02 Release gate

- Promise: publish refuses a red or missing pinned channel and a could-not-run, and does not refuse a newest-only graded failure.
- Trigger: `scripts/release.mjs publish` or the tag-release workflow.
- Hops: read commit status `harness-eval/pinned` and artifact `harness-eval-result` for the publish SHA. Repeat the drift proof locally.
- Failure: missing status, missing artifact, SHA mismatch, pinned fail, could-not-run, or drift refuses the publish. A green workflow conclusion is not a pass.
- Proof: a real tag dry-run against a real status and a real artifact.
- Owners: GitHub Actions implementer, the release-script owner.

## CAP-EVAL-03 Fix pull request

- Promise: a newest-only graded failure opens one pull request a person merges. A pinned failure and a could-not-run do not.
- Trigger: at least one newest cell whose grade is fail.
- Hops: read-only fix agent with no GitHub token, patch recheck on the graded base SHA, confirming run using graders from the base branch, app token opens the pull request.
- Failure: a patch outside `harness/*.json` and `skills/**`, a patch that touches tests, fixtures, graders, validators, CI, or the release script, a confirming run that could not run, or a planted defect that is no longer red. No pull request is opened.
- Proof: a real run with a deliberately broken path, and a real pull request opened by the app.
- Owners: GitHub Actions implementer.

## CAP-EVAL-04 Resume with text

- Promise: later checks that must receive an answer use one resume-with-text path on every harness.
- Trigger: a later check, not the command list, status, or verify.
- Hops: resume the namespaced session and send one plain-text answer. The exact flag per CLI is untested. A missing assignment is could-not-run.
- Failure: inventing an argv is not allowed. These checks report and do not block a release.
- Proof: one real resume on each harness before the path is treated as working.
- Owners: harness-adapter implementer.
