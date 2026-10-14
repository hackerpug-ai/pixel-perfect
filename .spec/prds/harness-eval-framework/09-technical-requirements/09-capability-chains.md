---
stability: CONSTITUTION
last_validated: 2026-10-14
prd_version: 1.0.1
---

# Capability Chains

## CAP-EVAL-01 Install and grade

- Promise: six harnesses by pinned/newest, one install mode, actual loaded-byte identity, four evidence-based grades.
- Trigger: published nightly; checkout plugin push; manual mode selection, checkout default.
- Hops: resolve pins and plugin once; install with no key; verify loaded digest; no-model list; factual status; structural-only planted/clean verify pair; independent must-ask init probe; deterministic grade/report writer.
- Failure: unavailable dependencies/mapping/identity is could-not-run; observed behavioral violations fail. Correct planted detection plus clean pass is evaluation pass. Exit code alone decides nothing.
- Proof: real runner/CLIs/keys with stale-cache, positive-status, report-binding, question-order, and hidden-image-judge controls. Per-version mappings and Linux installs remain unverified.
- Owners: harness-adapter implementer, GitHub Actions implementer.

## CAP-EVAL-02 Release gate

- Promise: only the latest trusted exact-checkout evidence, within 36 hours, can authorize release; newest-only failures warn, could-not-run blocks either track.
- Hops: [API Design](04-api-design.md) authenticates producer/run/attempt/status/artifact, selects without success fallback, checks identity/freshness/published holds, repeats drift locally, and rechecks authority before publish.
- Failure: pending/cancelled/incomplete/stale/mismatched/missing evidence refuses release. Published success, open/merged fix, and later reports never authorize it.
- Proof: real GitHub records and dry-run rejection controls, including a newer cancelled attempt after success and the 36-hour boundary.
- Owners: GitHub Actions implementer, release-script owner.

## CAP-EVAL-03 Fix pull request

- Promise: newest evaluated fail checks can produce a confirmed patch for a person to merge; pinned failures and could-not-run are never repair inputs.
- Hops: reproduce on current main repair base with original versions; directly invoke pinned Claude CLI without GitHub/OIDC credentials; enforce plugin-root allowlist; confirm exact patch against immutable base graders across twelve cells; verify unchanged base; separate app opens PR.
- Failure: no reproduction, forbidden path, no-op/ineffective/regressing patch, required could-not-run, missing planted/clean controls, changed base, or absent human-only merge enforcement opens no PR. Report the reason; do not broaden permissions/scope.
- Proof: real provider call and local diff; real confirmation; app creates branch/PR but is refused merge by repository policy; human merge and reject receipts. Independent pinned failure remains a release block.
- Owners: GitHub Actions implementer; repository owner for rule prerequisite; human maintainer for merge/reject gate.

## CAP-EVAL-04 Resume with text

- Promise: later answers use one resume-with-text path on every harness; report-only.
- Hops: persist native session in isolated storage, capture question/context and session identity, stop process, resume same conversation in another process with one answer, prove context-dependent continuation, retain evidence then clean up. Pi omits --no-session on this path.
- Failure: missing state/unsupported argv is could-not-run; no new-session or second-channel fallback. First checks consume no scripted answers.
- Proof: real cross-process continuation per harness and missing-session negative control. Exact per-version argv remains unverified.
- Owners: harness-adapter implementer.
