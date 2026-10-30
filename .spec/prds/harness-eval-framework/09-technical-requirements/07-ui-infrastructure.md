---
stability: CONSTITUTION
last_validated: 2026-10-30
prd_version: 2.0.0
---

# UI Infrastructure

No design library, no style tokens, and no product components. There is no navigable UI.

There is no website, app screen, or component library, so there is nothing to navigate; a person only reads a GitHub Actions run summary, a verify report file, a fix pull request, and a failure issue.

## What a person reads

- **GitHub Actions run summary** (maintainer): Pass, fail, or could-not-run for Claude Code, Codex, Grok, OpenCode, Pi, and Cursor; A pinned-version result and a newest-version result for each harness; Four grades per cell: command list, status, verify, and whether the first turn reached a question before expensive work; Exit code 0 was not treated as success.
- **Verify report file** (maintainer): Retained for both planted and clean invocations, including evaluation pass; exact case path; harness and track; loaded identity; observed defect; source evidence.
- **Fix pull request** (maintainer): Opened only for a newest-version failure; The harness; The failed grade; The evidence.
- **Failure issue** (fixer, maintainer): What failed and its release effect; The twelve-cell grid; The evidence by path and digest; The eval to re-run to prove the fix; The fixed limits.

## Feasibility limits

- No product UI. A person can read the grades only on the GitHub Actions job summary, the uploaded verify-report artifact, the pull request body, and the failure issue.
- Those four surfaces are enough for six harnesses (Claude Code, Codex, Grok, OpenCode, Pi, Cursor), two tracks (pinned, newest), four checks, a pass/fail/could-not-run label, a separate drift section, and a later-checks section, if each surface uses headings and one row per harness and track instead of one wide grid.
- GitHub markdown has no design tokens and drops style and script. Do not use color or custom components. Write the words pass, fail, and could-not-run.
- A heading can say that later checks do not block a release. None of the four surfaces can change the workflow badge or required-status checks. A failing job still looks like a release block on the pull request Checks list.

Every summary identifies published versus checkout mode, actual plugin revision/digest, CLI versions, run/attempt, evidence age, and compatibility holds. Published results say compatibility-only. A correct planted finding is displayed separately from the evaluation verdict.
