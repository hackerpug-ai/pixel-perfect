# Changelog

All notable changes to Pixel Perfect are documented here.

## [Unreleased]

## [9.3.0] - 2026-10-02

### Existing-project reference refresh

- Added `evolve --refresh <source...> [--platform <name>] [--reanalyze]`, `evolve --resume <run-id>`, and `verify --refresh <run-id>`.
- Stage freshly rendered exports, resolve explicit source/frame mappings, preserve identities and history, and confirm one complete change plan. Partial exports and ambiguous mappings keep work unresolved.
- Journal accepted edits, resume interrupted writes, block conflicting outside edits, and reopen only affected progress. Visual updates share refine's execution path; additions/extensions use build.
- Separate implementation regression, accepted-reference fidelity, and affected consumer behavior. Current captures, revisions, implementation fingerprints, explicit judgments, and real check receipts govern completion. Browser capture of React Native remains browser evidence.
- Updated selection metadata and descriptions for all 11 public commands across all 44 generated adapter surfaces. Polish remains an internal lens pack.
- Added a returning-project recovery recipe that inspects manifest shape and capture readiness and preserves validated configuration.

### Validation and acceptance

Reference-refresh workflow and helpers shipped; plugin checks passed; Ruthwell application acceptance deferred to the user. Automated plugin validation covers real filesystem, HTTP, Chrome, package installation/discovery, conflict and freshness gates, and strengthened mutation oracles. Full model-driven application refresh is deferred. Ruthwell was not modified, launched, or refreshed.

## [9.2.0] - 2026-10-01

### Added

- Added `pixel-perfect:assimilate`, which analyzes something that is not usable components — a new mockup of your own, or the UI of a site or design you admire — and folds the findings into your design system after you read a report and confirm. It works before `init` (a brand-new project) and on an existing system. Sources you admire contribute components, tokens, and patterns in your own style; their brand, copy, and screens are never copied, and their screenshots stay local (git-ignored).
- Added `docs/DESIGN-ANALYSIS.md`, the one design analysis (render, one whole-design read, gate, persist) that `build` Phase 4a, `assimilate`, and `evolve` now share.
- Bundled the `frontend-design` skill (Apache-2.0) as `docs/frontend-design/FRONTEND-DESIGN.md`, the analysis's aesthetic lens.
- Inventory provenance: `sources[].role` (`own` | `inspiration`); `verify-inventory.mjs` Check N (an inspiration source never defines your screens) and `--prior` (an additive run may not drop anything the prior inventory held).
- `render-frames.mjs`: a directory renders each html or image file as its own source; `--reserve` and `--merge-from` let a run render outside `design/reference` and merge only what is kept.
- `merge-inventory.mjs`: an additive read returns only what it adds or changes and is merged over the prior inventory in code, so a model omission cannot drop anything; persisting is staged and swapped in only after the gate passes.
- `verify-inventory.mjs` Check P: every frame comes from a declared source, under that source's slug.

### Fixed

- `render-frames.mjs` crashed on any directory without `wireframes.json` (a CommonJS `require` in an ES module), and a new source whose file name matched another source's slug deleted that source's frames.
- `evolve` E1 rendered into `design/reference` before its E4 confirmation; it now renders into its delta directory.
- `init` recorded products to borrow from in `references`, which `build` renders as your own design. They are now `assimilate_candidates`.
- The test suite could hang: capture-polish deleted Chrome's profile while Chrome's helpers were still writing it (`ENOTEMPTY`), and the error skipped closing its server, so the process never exited. Profile cleanup now retries and can no longer skip the server close. `render-frames.mjs` launches Chrome only when a source needs it (an HTML deck or a URL); images and wireframes are read from disk.

## [9.1.0] - 2026-09-02

### Added

- Added a publishable Pi package with ten namespaced skills (`/skill:pixel-perfect-<name>`) that delegate to the canonical Pixel Perfect runtime. The package ships the workflows, contracts, validators, and reference documentation required to execute them.
- Added a real packed-artifact integration test that starts Pi in isolated Remote Procedure Call (RPC) mode and verifies that Pi discovers every namespaced skill from the npm tarball.

### Changed

- Pi now participates in release-version lockstep with Claude Code, Codex, Cursor, Grok, and OpenCode.

## [9.0.0] - 2026-08-30

### Added

- **Build Phase 4a — DESIGN INVENTORY.** When the manifest lists design references and `design/inventory.json` is missing or stale, `build` renders every reference to frames (`scripts/render-frames.mjs`, node + headless Chrome, sources loaded in place), dispatches one whole-design read against `docs/INVENTORY-CONTRACT.md`, gates it with `scripts/verify-inventory.mjs` (every frame claimed or excused; layering; undrawn reasons; unique names; `--frames` coverage), and confirms with `B-inv`. Later phases read their lists from the inventory; `B-atoms`/`B-mol`/`B-org` never fire on an inventoried project. Schema: `docs/inventory.schema.json`.
- `render-frames.mjs` auto frame detection: `.fr`, then top-most bordered screen-sized boxes by computed style (Claude Design canvases), then full page. `scripts/chrome.mjs` — the shared headless-Chrome/CDP launcher `capture-polish.mjs` and `render-frames.mjs` both use.

### Removed

- **Breaking:** `pixel-perfect:design-deconstruct` and the bundled `deconstruct-engine` (five phases of token-pure HTML mockups, per-theme renders, audits, Design Review Browser, `theme-seed.json`, `deconstruction.json`, native mode). The design is the reference and the component is the deliverable; nothing is generated that is not shipped. See `docs/UPGRADING-9.0.md`.

### Changed

- **Breaking:** per-item targets are reference frames (`design/reference/{slug}/{NN}.png`, tied to entities by `design/inventory.json`), not `design/system` mockups. `init` seeds from `design/inventory.json`; `scaffold` reads the spec's token table, then the design references, then vibe keywords (no `theme-seed.json`); `status` reports the inventory receipt; `evolve` acquires new designs through `render-frames.mjs`; `wireframe`'s ladder is wireframe → inventory → component.

## [8.0.0] - 2026-08-12

### Added

- Added **catalog capture** as sandbox-spec piece #8 and the second deterministic plugin gate script (`plugins/pixel-perfect/scripts/verify-catalog.mjs`) with modes `--baseline`, `--check`, `--blast`, `--reach`, and `--accept`. Exit codes match the styling gate (`0` pass, `1` drift, `2` config/usage, `3` vacuous). Goldens live at `design/goldens/{platform}/{layer}/{name}/{state}.{ext}` and are the fingerprint of the real system.
- Added the composition mutation check: perturb an atom with `--blast` and assert declared dependents move — a non-moving dependent is a copy, not a composition.
- Added public capability **`evolve`** (interactive workflow + generated command/skill/OpenCode surfaces) covering inventory change E1–E6: acquire, classify against the golden catalog (reuse|variant|new|promote|remove|token-change), reach/blast, one confirm gate before writes, apply adds via `build` / atomic removals, prove with re-capture (non-disturbance on add; nothing-else-moved on remove). Supports `--deprecate` and token changelog handling.
- Added fixture-driven tests under `test/catalog.test.mjs` that drive the real catalog script (baseline/check/accept/vacuous/blast/reach).

### Changed

- **Breaking:** Manifest stores decisions and receipts only. Authored composition-edge arrays (`molecules[].atoms`, `screens[].organisms`, …) and `controls: true` are no longer authority. Dependencies and controls coverage come from catalog capture. Per-platform fields: `capture`, `pinned`, `deprecations`.
- Scaffold generates a capture command and requires a hello-world golden before the scaffold gate advances.
- Build layer exit gates write goldens and record `{layer}_capture` beside the contract gate keys.
- Verify requires catalog capture (`--check`) per layer alongside styling and component contracts.
- Refine re-captures after change so R4 cascade options come from the diff; inventory-level requests route to `evolve`. Staleness is computed at read time (no stored `stale` field).
- Status reports catalog drift, missing goldens, deprecated-with-live-dependents, and dead inventory from capture — not manifest archaeology.
- Design-deconstruct Step 2.5 captures goldens per layer so a deconstruct-seeded project arrives at build already fingerprinted.
- Custom-sandbox adapter documents `sandbox:capture` generation alongside the run command.

## [7.4.0] - 2026-08-11

### Added

- Added **Cursor** as a first-class release channel with `.cursor-plugin/plugin.json`, root marketplace metadata, README install path (`~/.cursor/plugins/local/`), and version lockstep alongside Claude, Codex, Grok, and OpenCode.
- Added a single adapter generator (`scripts/build-adapters.mjs` + `scripts/adapters/`) that emits all ten public capabilities to commands, skills, and OpenCode command files from one capability source, with a `--check` drift gate wired into `npm run validate`.
- Added a `### Cursor` harness mapping in `workflows/RUNTIME-CONTRACT.md` covering invocation, user choice, task tracking, and plugin-root location under `~/.cursor/plugins/` / `~/.cursor/plugins/local/`.

### Changed

- OpenCode command adapters are generated real files (byte-identical to `commands/`) instead of symlinks, so packaging and Windows installs no longer depend on symlink support.
- Command adapters document Cursor plugin-root resolution; skill adapters no longer hard-code Codex-only invocation wording and instead defer to the harness mappings table.
- Release verification and package validation require the Cursor manifest and marketplace surfaces.

## [7.3.0] - 2026-08-08

### Added

- Added **component contracts** — a second machine-checked contract kind that enforces *what a component is built on*, alongside the styling contract that enforces *how it is styled*. A project could declare a component library at init, let scaffold install it, and then hand-roll every primitive from raw framework elements: the result passed every gate, because hand-rolled markup with correct utility classes satisfies a styling contract completely. Ships five built-ins — `react-native-reusables`, `shadcn`, `shadcn-svelte` (vendored copy-in) and `react-native-paper`, `mantine` (package import) — resolved at init EQUIP from `tools.components` and enforced at every build layer by the existing gate script.
- Added four manifest fields mirroring the styling four: `component_contract`, `component_contract_source`, `component_contract_enforcement`, `component_contract_overrides`.
- Added `Step 1c: Apply Component Contract` to `build`, structurally identical to the styling step including its fail-closed STOP clause, and explicit that a design reference tells you what a component must look like, never what to build it on.
- Added `mode: "file"` to the gate script — the regex runs against whole file content instead of per line. Import statements are the signal for a component contract, and a formatter wraps a long import list across lines the moment it exceeds the print width, which a per-line scan structurally cannot see. Without it the gate is defeated by running prettier.
- Added a `## Compose` section to the `react-native-reusables` and `shadcn` adapters. Adapter docs were install guides — Scaffold, Theme, Verify, Sandbox — and said nothing about how to build a component on the library once installed.
- Added `validate-contracts.mjs` to CI: every build layer must name both contracts in its load context and record both exit-gate keys, the no-library skip must stay stated, and shipped contracts must agree with init's resolution table in both directions. Verified against five mutations, including a revert of `build.md` to the exact prose that allowed the original drift.
- Added tests where there were none: nothing previously exercised the gate script and nothing validated the contract corpus, so a typo in a contract regex shipped green and surfaced only inside a user's project. Adds corpus tests over all twelve contracts and behavioral tests against a two-variant fixture.

### Changed

- `build` now names `tools.components` and resolves `docs/adapters/{components}.md` by manifest field. It previously never mentioned `tools.components` at all, saying only "Adapter docs for the chosen tools" — degrading to the literal words "Adapter docs" by the screens phase.
- All four build layers now carry identical contract wiring. Previously atoms received the full treatment and molecules, organisms, and compose received a noun phrase.
- `DESIGN-CONTRACT.md` no longer tells the designer to avoid "a familiar component-library arrangement" without qualification — read literally, an argument for the drift. The constraint is now scoped to visual genericism, with the structural case stated.
- `process-context` gained the missing `react-native-reusables` conventions block. It went straight from shadcn-svelte to react-native-paper, so an RNR project received no library conventions from the skill meant to carry them.
- `verify`'s Atoms Gate replaces a row that was permanently `n/a` for the chosen component library with real styling and component contract rows.
- A project with **no** component library is unaffected: no contract, no gate, no prompt, no notice. This is enforced by the validator, not merely intended.

## [7.2.0] - 2026-08-08

### Added

- Added a binding turn shape to the runtime contract: every turn is a twelve-line digest plus either a question or finished work; longer analysis goes to a named artifact; expensive work waits for the decision that authorizes it; unresolved input is asked rather than guessed.
- Added a `## How this workflow asks` section to all six interactive workflows, declaring every batch, what it decides, and when it fires — so a workflow's round-trip cost is reviewable up front.
- Added `B-arg` to `build`: free-form input that does not resolve to exactly one phase, component, screen, or platform now opens a question instead of a guess. `build molicules` asks; it no longer picks.
- Added two validator rules with ten tests: interactive workflows must declare their batches in a table that accounts for every batch they ask, and an illustrative output block a workflow tells the agent to print may not exceed twelve lines.

### Changed

- `build` no longer researches before it asks. The Ecosystem Scan — web searches, star and download lookups, rubric scoring, and trial installs for every planned component — moved from Phase 4b Step 2b to Step 5, behind the plan gate, and now scans only the components the approved plan will create that match a complex-pattern category. The first question fires after a codebase audit and a spec read, both cheap.
- `build` drops from 1,492 to 1,227 lines, and its four wall-of-text report templates become digests. Phase-level progress is one line naming the count and the next item, not a re-listing of everything already done.
- `build` no longer re-confirms an atom list the user just approved at the plan gate; `B-atoms` fires only when the list is genuinely open.
- `refine` executes feedback that names its own target instead of confirming it, and `R1` fires only on a multi-target match.
- `init`, `scaffold`, `add-platform`, and `wireframe` replaced their repeated adapter-check, configuration, and verification templates with single-line digests. Four near-identical adapter-check examples in `init` become one rule: name only what is missing.
- `status`, `research`, and `design-deconstruct` are exempt from the digest budget — a workflow whose deliverable is a report is doing what it was invoked to do at any length.

## [7.1.0] - 2026-08-07

### Added

- Added a version-locked Codex Git marketplace and self-contained runtime package.
- Added thin Claude/Grok, Codex, and OpenCode adapters over one canonical workflow set.
- Added deterministic prepare, verify, and publish release commands with four-channel checks.
- Added CI, tag validation, package-content checks, and release regression tests.
- Added a binding user choice protocol to the runtime contract: batched structured questions, self-contained options, detected values offered as option 1, and settled decisions shown rather than asked.
- Added `scripts/validate-workflows.mjs` to the validate chain, failing CI on printed decisions, stale yes/no round trips, and malformed question batches.

### Changed

- Workflows now collect every decision through `USER_CHOICE` instead of printing a mock terminal prompt. `init` alone drops from 28 printed prompts to five batched calls, and eight yes/no round trips disappear.
- `init` now writes its analysis to `design/init-brief.md` and asks in the same turn, rather than ending a turn on a wall of prose with no way to answer.
- Grok now intentionally resolves the Claude marketplace version.
- OpenCode now records the Pixel Perfect release independently from its adapter dependency versions.
- Entry points explicitly load process context instead of relying on unsupported auto-activation metadata.
