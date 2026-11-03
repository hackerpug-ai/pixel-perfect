# Cleaning plan — pixel-perfect

## Last run

2026-11-03 clean-code-plan sprint sprint-01-evaluator-evidence-spine --go (END-of-sprint cleanup): 12 units + 1 closing-review repair merged, start 8bc293e → end HEAD; nobody confirmed the plan. See the Log.

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

Item 1 is done (claude-code.mjs 1774 → ~1560 lines; stream-facts half now test/harness/stream/claude-code-facts.mjs). Item 3 is done (sprint-01 helpers unified). Next: item 2 (graders/gradeInvocation dedupe — sprint-02 owns the wiring; do the dedupe when the second caller lands), then items 4–6.

## Log

- 2026-11-03 initialization (--go): profile.md + roadmap.md + known-problems.md written from survey batch (4 surveyors + trajectory reader); nobody confirmed.

- 2026-11-03 run 1 (--go): 12 units, 4 waves, all merged (U1 flow-runner yaml out + rule families + run02Hand pins; U2 write-durable + gradeFromEvidence rules; U3 smoke extracts + carry split; U4 verify-report extracts; U5 adapter stream-facts out + gradeCheck/cellFor + authorities; U6 graders batteries + report-read core; U7 stream extracts; U8 smoke writers onto write-durable; U9 sprint-test helpers unified + count-guard 76→77 measured; U10 one splitLines; U11 new pins t19 + grd-03b; U12 locked suite wired into CI). Closing review: 1 BLOCK (7th sha256 copy in lib/lines.mjs) fixed as U10-repair; 7 recorded findings into known-problems; 1 placement needs_human (lib/ row in the profile table). Baseline and every wave: validate exit 0, unit suite 589/589. Known deltas recorded in plan.json: U8 aligns cell-record read-back-mismatch to write-durable's destroy canon (fail-closed; receipts identical); U5 lazy questionBatchId (no external importers); U5 PROBE_ENV_NAME left eager (grd-02 imports it); U12 CI list excludes t18 (hosted-gated by its own header).
