# Changelog

All notable changes to Pixel Perfect are documented here.

## [Unreleased]

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
