---
stability: CONSTITUTION
last_validated: 2026-10-13
prd_version: 1.0.0
---

# API Design

This product does not expose an HTTP API.

The release gate reads two GitHub records, as the Actions lens specified:

| Call | Contract |
|------|----------|
| Commit status `harness-eval/pinned` on the graded SHA | `success` only when every pinned cell passed, all twelve cells are present, and no cell is could-not-run. A newest warning stays `success`. |
| Commit status `harness-eval/drift` | Separate from the pinned status. Drift is not folded into the live grade. |
| Artifact `harness-eval-result` | The JSON record for that run. Publish refuses when the status is missing, the artifact is missing, or the SHA does not match. |

`scripts/release.mjs publish` and `tag-release.yml` read those records. They do not treat a green workflow conclusion as a pass. The eval workflow never calls publish.
