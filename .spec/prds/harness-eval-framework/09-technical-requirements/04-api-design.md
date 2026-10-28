---
stability: CONSTITUTION
last_validated: 2026-10-28
prd_version: 1.0.2
---

# API Design

This product does not expose an HTTP API. GitHub Actions records are the external release interface. The release gate implements these decisions deterministically; a model never selects or clears evidence.

## Trigger and installation contract

| Trusted trigger | Install mode | Plugin target | Release use |
|-----------------|--------------|---------------|-------------|
| schedule, cron `17 6 * * *` on main | published | Latest published release tag, resolved once to an immutable commit and content manifest before fan-out | Compatibility observation; never candidate authorization |
| push to main, plugin path filter | checkout | Exact triggering commit | Candidate evidence for that commit only |
| workflow_dispatch on main | Input `install_mode`: checkout (default) or published | Exact dispatch commit for checkout; same release resolver as nightly for published | Checkout can authorize its exact commit; published cannot |

One invocation selects one mode and produces twelve cells. Do not merge modes or overwrite cells across runs. Workflow `head_sha` identifies workflow execution; `plugin_revision` identifies the evaluated plugin. Published installs must use the resolved release, even where an existing INSTALL example follows a moving default branch. Missing release resolution is could-not-run, with no branch fallback.

06:17 UTC is the schedule request, not an exact-start guarantee. Record actual GitHub event and timestamps. A delayed or dropped schedule creates no synthetic grade or missed-tick record. There is no local scheduler or webhook receiver. A manual checkout evaluation refreshes stale candidate evidence. No new watchdog service is included.

## Authoritative run selection

Three release-adjacent side effects are governed by the same resolver: `scripts/release.mjs publish`, the release gate in `tag-release.yml`, and the `publish-opencode-adapter` job in `tag-release.yml` (the npm publish of pixel-perfect-opencode-adapter, added 2026-10-27 in bd53ad0). The adapter publish is a release side effect: it runs only after the recomputed verdict is allow or allow-with-newest-warning, never while a hold or refuse verdict stands, and never from the eval workflow. The `pages.yml` site deploy on main is explicitly outside hold scope: it publishes the site, not a plugin release artifact. Every side effect under `.github/workflows/` carries a disposition here; a new publish path is added to this list or refused:

1. Query GitHub for the configured repository ID and `.github/workflows/harness-eval.yml` workflow ID/path. Verify its source branch is main and event is an allowed push or manual dispatch for checkout. Do not trust these values solely because an artifact asserts them. Reject fork, PR, other workflow, other branch, and published-mode records as candidate authorization.
2. For the exact publish commit and checkout mode, choose the highest workflow run number, then the highest attempt of that run, including queued, pending, cancelled, and failed attempts. Do not search backward for a successful attempt. Unknown mode while a qualifying run is pending blocks until its trusted dispatch inputs/result resolve it. Rerunning an older run cannot supersede a newer run number.
3. Require that attempt's completed evaluation jobs, commit status `harness-eval/pinned`, and artifact `harness-eval-result` agree on repository, workflow, run ID, attempt, candidate commit, mode, and plugin digest. Enumerate every page of commit statuses; do not use the combined-status or latest-per-context response. Select the status whose trusted producer, target run/attempt, and mode match the selected checkout. A later published status on the same SHA/context cannot hide that checkout record. Download only the immutable artifact bound to the selected attempt using the binding below, and verify its GitHub-provided digest. Old attempts must not overwrite a newer authoritative status. Missing, inaccessible, ambiguous, or mismatched records refuse release.
4. Require `evaluation_completed_at` to match the latest required smoke-job completion for that attempt. At the publish gate's UTC time, age must be between zero and 36 hours inclusive. A result older than 36 hours, or dated in the future, refuses release. Artifact retention (90 days) is not freshness.
5. Inspect trusted published evaluations whose evaluation completion is at or after the selected checkout evaluation start. Include runs created earlier that were still pending/running across that boundary; filtering only by run creation time is insufficient. Each completed published pinned failure or could-not-run on either track in this interval establishes a hold. Equality blocks: clearance requires the checkout to start strictly after the blocker completes. Earlier completed holds are cleared by that qualifying later checkout and do not require indefinite artifact retention. A later published success, pull request, merge, or later-check report cannot clear a relevant hold. Missing history or unreadable completed published grades in this relevant interval refuses release; missing expired evidence before the boundary does not. Pending published observations are shown as pending and do not supply authorization or a completed hold.
6. Evaluate the truth table below and repeat the existing drift proof locally at publication. Re-resolve authority immediately before the publish side effect; abort if a newer applicable run/attempt or hold appeared. Never publish from the eval workflow.

## Artifact attempt binding

`harness-eval-result` is the logical artifact name. Its physical upload name is `harness-eval-result-<run_id>-<run_attempt>`, derived by the trusted recorder from GitHub context, with overwrite disabled. Verify-report bundles use the same run/attempt suffix. Record immutable artifact ID and SHA-256 digest from the upload result/API outside the result payload; an artifact cannot attest its own archive digest.

GitHub artifact metadata identifies workflow_run.id but does not supply a native run_attempt field. Verify attempt using the physical name plus the trusted recorder job from the attempt-specific jobs API, its upload step/output identifying that artifact ID, and artifact creation time within that job's start/completion interval. Verify repository, workflow, head SHA, artifact run ID, embedded result identity, and digest as well. An uploader name or JSON assertion alone is insufficient. Missing job/upload provenance, duplicate physical artifact, overwrite/replacement, or an earlier attempt's artifact refuses release. Reruns use new attempt-qualified artifacts; never delete an old artifact to reuse its name.

## Release truth table

| Evidence state | Gate result |
|----------------|-------------|
| No eligible checkout evaluation; pending/cancelled/incomplete latest attempt; stale or untrusted evidence | Refuse, with an evidence reason |
| Any pinned evaluated check fails | Refuse, naming harness and check |
| Any required cell/check is could-not-run, or any of twelve cells is absent | Refuse, including Cursor |
| Only newest evaluated checks fail; pinned checks pass; complete, fresh evidence; no compatibility hold | Allow with newest warning |
| All required checks pass; complete, fresh evidence; no compatibility hold | Allow |
| Local drift proof refuses | Refuse independently of live grades |
| Later check fails or could-not-run | Report only; cannot block or clear |

`harness-eval/pinned` success is the live-policy result of its producing run, not sufficient authorization by itself. Its description and target URL identify mode and run/attempt. Published success is explicitly compatibility-only. `harness-eval/drift` remains separate. `release.allowed` in the artifact is provisional at recording time; the publish gate recomputes authority, freshness, compatibility holds, and drift. Opening or merging a newest fix is never a clearance transition.

## Acceptance evidence

Use real GitHub runs/statuses/artifacts and a release dry-run: old success followed by cancellation/failure on the same SHA, wrong workflow producer, mismatched status pointer, wrong artifact attempt, stale checkout after 36 hours, published pass without checkout, and a blocking published result followed by a later passing checkout. Preserve run IDs, attempts, timestamps, digest checks, and gate reasons. A same-name local JSON fixture is not GitHub provenance proof.
