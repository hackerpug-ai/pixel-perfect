---
stability: CONSTITUTION
last_validated: 2026-10-30
prd_version: 2.0.0
---

# Architecture Posture

- The grade runs on GitHub-hosted runners. A throwaway home directory on that runner is the isolation. No sandbox service is added.
- The verdict is pass, fail, or could-not-run. It is read from the grade file and the event stream. The process exit code is stored and is not the verdict.
- A pinned graded failure blocks the next release. A newest-only graded failure warns and may open a fix. Could-not-run blocks the release on either track and does not open a fix.
- The fix agent job has no write token and no network tool. A separate job, holding only the pixel-perfect-heal GitHub App token, opens the pull request. A person merges it. This workflow never publishes.
- Two install modes stay distinct. Published install answers "a harness release broke us". Checkout install answers "our change broke a harness".
- Secrets stay off pull-request workflows. The owner added a run after a push to main when the plugin changes. That push is not a pull request.
- There is no product HTTP API and no navigable UI.
- The fix diff allowlist stays `harness/*.json` and `skills/**`, relative to `plugins/pixel-perfect/`, until the open decision on `workflows/` and `scripts/adapters/` is re-checked.
- Cursor is a real channel. Until a key and a real headless trial exist, its cells are could-not-run. The owner has not exempted it.

- Nightly is published-only; plugin pushes use their exact checkout; manual defaults to checkout with published selectable. Modes never share cells.
- Only authoritative checkout evidence for the publish commit can authorize release, for at most 36 hours; newer incomplete attempts invalidate older success. Published blocking results require a subsequent qualifying checkout to clear.
- Detecting the planted defect correctly is an evaluation pass when the clean twin also passes. The report is retained.
- A finished run files issues for unexpected failures with plain code, no model, and a token that can write only issues. An issue grants no authority and has no effect on a grade or a release. See [Failure Issues](11-failure-issues.md).
