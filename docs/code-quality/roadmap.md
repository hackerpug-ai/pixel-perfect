# Cleaning plan — pixel-perfect

## Last run

none yet (initialization 2026-11-03, by clean-code-plan `--go` at the END of sprint-01; nobody confirmed the drafts).

## Decisions

- 2026-11-03: initialization. Stack = node-typescript (+react for site). Survey slices: harness core, harness support, plugin+scripts, tests+workflows. Organization plan drafted from surveys + stated rules; nobody confirmed.

## Work list (ranked coarse → fine)

1. **`test/harness/adapters/claude-code.mjs` does nine jobs** (invocation table, prompts, install/load, identity, stream parsing, grading, verify-report binding, control probe, CLI) — the survey's largest several-jobs file, and sprint-02 adds four more adapters next to it. Extract along its existing seams (stream parsing → stream layer; grading → `graders/`; install/load plans → a plans module) so new adapters inherit pieces instead of copying a 1500-line file. Co-change evidence: adapter + stream table + sprint-01 t16/t17/t18 tests change together.
2. **`graders/fixture-grader.mjs` vs the adapter's private grading copy.** `graders/` has no production caller yet; the hosted path keeps private copies of grading logic inside the adapter. Sprint-02 will wire `gradeInvocation` — land the dedupe before the second caller copies the private version again.
3. **`tests/sprint-01/` copy-pasted helpers.** `sandbox()`, `installation()`, `REJECTED_MODE`, `SECRET_NAMES`, `LIVE_ARTIFACT` re-declared per file while `flow-runner.mjs` is already the shared module. Promote the small helpers; six files stop diverging.
4. **Validator plumbing duplication in `scripts/` + plugin scripts.** Six directory walkers, five atomic-write variants, two isMain styles, two glob-matcher copies, `detectDeprecatedComposition` twice with differing exemptions. One shared `lib` module per side (plugin scripts vs repo validators), imported by name.
5. **Capabilities list restated in five files.** Derive the 11-name list from `scripts/adapters/capabilities.json` at validate time instead of restating string arrays.
6. **`verify-catalog.mjs` is library + 8-mode CLI in one file.** Split CLI parsing/dispatch from the exported library consumers (gate/brief/refresh-run/evolve-lib) already depend on.

## Next up

Run 1: items 1–3 (sprint-01's own landed code), then 4–6 as later runs.

## Log

- 2026-11-03 initialization (--go): profile.md + roadmap.md + known-problems.md written from survey batch (4 surveyors + trajectory reader); nobody confirmed.
