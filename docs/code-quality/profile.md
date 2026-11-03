# Organization plan — pixel-perfect

Stack pages: [node-typescript](https://github.com/hackerpug-ai/brain/docs/clean-code/stacks/node-typescript.md), react. Written by clean-code-plan initialization (--go): synthesized from whole-codebase surveys (2026-11-03) and the repo's stated rules; nobody confirmed it.

## Architecture in one paragraph

Three layers with one allowed dependency direction. **Product plugin** (`plugins/pixel-perfect/`): deterministic gate/verify CLIs (`scripts/verify-*.mjs`, `gate.mjs`, `refresh-run.mjs`, `brief.mjs`), pure libraries (`png.mjs`, `findings.mjs`, `merge-inventory.mjs`), capture layer (`chrome.mjs`, `render-frames.mjs`, `capture-polish.mjs`), and markdown surfaces (commands/workflows/docs) rendered from `scripts/adapters/capabilities.json` by `scripts/build-adapters.mjs`. **Repo tooling** (`scripts/validate-*.mjs`, `check-runtime-paths.mjs`, `release.mjs`): package/release validators that read the plugin but are edited independently; they may import plugin libraries, never the reverse. **Evidence harness** (`test/harness/`): runtime capture/guard/grade primitives ← stream layer (version-keyed mapping tables) ← adapters (per-harness invocation+grading) ← graders/controls/recorder (aggregation and refusal) ← `tests/sprint-01/` locked flow gates and `.github/workflows/harness-eval.yml`, the only caller that runs it hosted. Dependency direction: harness → plugin (reads product bytes as evidence), plugin ↛ harness; validators → plugin; nothing → validators except CI.

## Where things go

| Kind of code | Path |
| --- | --- |
| Gate/verify CLI (exported library + isMain CLI twin) | `plugins/pixel-perfect/scripts/<name>.mjs` |
| Pure utility library (no CLI) | `plugins/pixel-perfect/scripts/<name>.mjs` (no isMain block) |
| Chrome/CDP capture driver | `plugins/pixel-perfect/scripts/{chrome,render-frames,capture-polish,capture-refresh-browser}.mjs` |
| Package/release validator (one exported validate fn, error with `.details`) | `scripts/<name>.mjs` |
| Adapter surface template + naming authority | `scripts/adapters/{capabilities.json,*.template.md}`; rendered output never hand-edited |
| Eval runtime primitive (capture, guard, stance, grade-writer) | `test/harness/runtime/` |
| Stream mapping (rule tables per CLI version) | `test/harness/stream/tables/<harness>@<version>.json` (data) + `test/harness/stream/*.mjs` (code) |
| Per-harness adapter | `test/harness/adapters/<harness>.mjs` + `registry.mjs` + `absent.mjs` |
| Grader / control / recorder | `test/harness/{graders,controls,recorder}/` |
| Case manifests + schemas (data) | `test/harness/{cases,schemas}/` |
| Smoke leg (workflow step twin: exported fn + CLI) | `test/harness/smoke/<leg>.mjs` |
| Locked flow-gate test (one owned file per task/flow) | `tests/sprint-01/<id>-*.test.mjs`; shared runner `tests/sprint-01/flow-runner.mjs` |
| Committed fixture project | `test/fixtures/<name>/`, `test/harness/kit/project/` — cloned to temp, never run in place |
| Landing site | `site/` (built by pages.yml; goldens/captures are data) |

## Good examples

- `test/harness/runtime/grade-writer.mjs` — the durable-write dance (temp → fsync → rename → read-back, destroy on mismatch) with contract header.
- `test/harness/lib/verdict.mjs` — verdict vocabulary + aggregation order in one small data-first module.
- `scripts/validate-package.mjs` — validator shape: exported `validate` fn, error with `.details`, isMain printer.
- `test/harness/adapters/registry.mjs` — data-first registry (guard > absence > lookup) instead of conditionals.
- `tests/sprint-01/grd-04-named-path.test.mjs` — flow gate: header names the flow, real kit project, named refusals asserted.

## Patterns not to copy

- **Private copies of the shared plugin library.** `loadManifest`/`resolvePlatform` exist four times (`capture-polish.mjs`, `design-md.mjs`, `evolve-lib.mjs` private; `verify-catalog.mjs` is the canonical export others import). New code imports from `verify-catalog.mjs`.
- **Locally re-implemented walkers, atomic writes, parseArgs, isMain guards.** Five atomic-write variants and six walkers exist; the losing way is a fresh private copy per file (see `scripts/release.mjs` `transactionalWrite` vs `gate.mjs` `writeJsonAtomic`). A shared helper is the fix direction, not more copies.
- **Restating the 11 capability names as string arrays.** `capabilities.json` is the authority (`naming` object); `build-adapters`, `check-runtime-paths`, `validate-package`, `validate-skills`, `release.mjs` each restate the list. Import/derive from the registry.
- **Exit codes as verdicts.** Process exit code is a diagnostic; only `recorder/result.mjs` `recorderExit()` turns verdicts into an exit code, via its truth table. (See P-3.)

## Project rules

- **P-1 Zero runtime dependencies.** Node builtins only; external tools are spawned (npx-pinned CLIs, Chrome, project capture commands). Reason: the plugin runs inside six different host harnesses; installs must stay instant and hermetic.
- **P-2 Exit vocabulary 0/1/2/3** (pass / drift-violation / usage-config / vacuous) documented in every gate CLI header. Reason: gates compose in CI and workflows; callers branch on documented codes.
- **P-3 An exit code never carries a verdict.** Evidence-not-exit-code: grades cite files/stream offsets; `recorderExit()` is the one sanctioned place verdicts become an exit code. Reason: the harness-eval contract (FLOW-GRD-03) is built on it.
- **P-4 Adapter naming is declared once** in `scripts/adapters/capabilities.json` `naming`; rendered adapter paths derive from it; `RUNTIME-CONTRACT.md` mappings must agree. Reason: 44 rendered surfaces drift silently otherwise (asserted by validators).
- **P-5 Releases only via `scripts/release.mjs prepare/verify/publish`;** `plugin-release.json` is the only hand-edited version, all six channels in lockstep. Reason: cross-channel version skew is the release failure mode.
- **P-6 Tests use real bytes and real subprocesses, no module mocks.** Archived captures, cloned fixture projects, temp dirs; negative controls proven by deleting the guarded check, not by stubbing. Reason: the evidence harness certifies real behavior; a mocked proof certifies nothing.
- **P-7 Durable writes are atomic with read-back.** temp → fsync → rename → read-back compare; a failed read-back destroys the file. Reason: artifacts are legal evidence for gates; partial writes must never read back as valid.
- **P-8 Every eval module opens with a contract header** naming its owner task/flow and the rule it enforces. Reason: the harness is audited against locked flow contracts; the header is the audit anchor.

## Tool command

none (no duplication/complexity tool wired; co-change and survey evidence in `docs/code-quality/roadmap.md`).

## Testing

- **Policy:** No test doubles for product behavior (P-6). Temp dirs + cloned fixtures + archived real bytes; spawning is the seam for external tools (Chrome, CLIs).
- **How to run one area's tests:** plugin/unit suite: `node --test test/<area>.test.mjs`. Sprint flow gates: `node --test tests/sprint-01/<file>.test.mjs --test-name-pattern <name>`. Validators: `pnpm run validate`. Full CI: `pnpm run ci`.
- **Test points:** catalog gates → import `plugins/pixel-perfect/scripts/verify-catalog.mjs` mode fns (7 test files do); harness runtime → `createCapture`/`gradeFromEvidence`/`recordStance` directly; recorder → `assembleResult`/`collectCells` against on-disk cells layouts; adapters → `runCheck`/`promptFor`/registry lookups; workflow bytes → `readWorkflow`/`inspectWorkflowDeclaration` from `tests/sprint-01/flow-runner.mjs`.
- **Library wrappers:** none (node builtins only, P-1).
