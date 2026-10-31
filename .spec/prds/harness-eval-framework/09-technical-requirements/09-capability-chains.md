---
stability: CONSTITUTION
last_validated: 2026-10-30
prd_version: 2.0.0
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

## CAP-EVAL-05 Failure issue

- Promise: each distinct unexpected failure in a finished run reaches this repository as one issue that names the eval to re-run, and filing changes nothing else.
- Trigger: any finished, uncancelled run on main in this repository.
- Hops: read this attempt's result or refusal record; derive findings from check rows; drop exact pairs on the expected list; list this filer's own issues and comments; render the body from validated fields; run the secret scan; create the issue or comment through the allowlisted helper; upload the receipt and append to the summary.
- Boundary contracts: `issues: write` on this job only; no model key; no App token; three GitHub operations; no model-written text. Scope: this repository. Expiry and rotation: the per-job `GITHUB_TOKEN`. Redaction: the secret scan blocks the filing, not just the line, and a blocked body is not uploaded.
- Failure: a blocked scan files nothing and names it. An API failure fails the job and names what was not filed. Filing is repeatable by fingerprint, so the next run retries. No failure here changes a grade, the result artifact, a status, or the release decision.
- Proof: real runs on GitHub filing real issues; a second run adding nothing; a real scan block on a real runner path; a stranger's matching issue having no effect; the issue's own commands run verbatim against a new run. The graded-failure path waits on the first real graded failure.
- Owners: GitHub Actions implementer; evals implementer for finding classes; a person for merging any fix.
