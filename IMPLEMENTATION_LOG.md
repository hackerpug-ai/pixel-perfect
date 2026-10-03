# Pixel Perfect 9.3.0 implementation log

Baseline: `3cb0058` on the existing main branch. Work was isolated on `release/9.3.0-refresh`; the original `.gitignore` change and Ruthwell work were preserved.

Implemented the reference-refresh branch, deterministic rendered revisions, explicit replacement mappings, resumable write journals, conflict reconciliation, and current-evidence completion gates. Refresh visual edits and targeted refine share an execution contract. All 11 public commands now carry validated selection metadata across 44 generated adapters. Returning-project inspection does not migrate manifests.

Validation:

- `npm run ci`: release/version checks, adapter synchronization, plugin/skill/runtime/workflow/contract/package validation, and 219 tests passed with no skips.
- Focused refresh tests use real temporary files, real HTTP, and Chrome. They cover CSS-only revision changes, stable identity, reordered/renamed/partial exports, stale/dangling mappings, selected progress reopening, actual filesystem write interruption and journal recovery, outside-edit reconciliation, stale/missing evidence, and unchanged reruns (including render-neutral export edits).
- Pi's real package manager installs the packed artifact in a temporary home and discovers exactly 11 commands with their canonical descriptions. Runtime helpers and refresh documents are required packed files.
- Mutation: replacing the judged screenshot set with `[]` fails the exact nonempty-set assertion (exit 1).
- Mutation: treating a moved intermediate component as a screen root fails the exact empty-root assertion (exit 1).
- JavaScript syntax and `git diff --check` passed. This repository uses native `.mjs` scripts and its existing CI validation gates; it has no TypeScript or lint script for these helpers.

Test judgments exercise the explicit evidence protocol. They do not claim a model-driven application refresh. Reference-refresh workflow and helpers shipped; plugin checks passed; Ruthwell application acceptance deferred to the user. Ruthwell was not modified, launched, or refreshed.

Release/distribution: use the clean main checkout and `scripts/release.mjs publish 9.3.0` for GitHub; publish the validated npm tarball separately. The authenticated npm account is `hackerpugai`; preflight initially returned `Scope not found` for `@hackerpug-ai`. Do not claim npm distribution until the registry serves 9.3.0. Preserve Pi's existing local-source registration during local updates. Existing harness sessions require reload to discover changed instructions.
