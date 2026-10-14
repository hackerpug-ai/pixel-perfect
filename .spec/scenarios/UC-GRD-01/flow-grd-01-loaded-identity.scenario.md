---
flow_id: FLOW-GRD-01-LOADED-IDENTITY
service: harness-eval
feature: UC-GRD-01
priority: P1
type: boundary
tier: holdout
scope: task
test_tier: e2e
---

# Loaded bytes must match the selected installation

On a real runner use a released tag whose plugin differs from current main. Published mode resolves that release once; checkout mode resolves the exact trigger commit. Observe loaded roots/digests and CLI versions for all six harnesses. Deliberately leave older Codex plugin bytes under a matching cache version label: checkout must report installation-identity-mismatch/could-not-run, not attribute a pass to main. Correct reinstallation must restore candidate equality. Same pinned/newest version strings remain distinct tracks. Capture install/load evidence and content manifests, not only installer exit codes.
