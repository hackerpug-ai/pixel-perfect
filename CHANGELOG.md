# Changelog

All notable changes to Pixel Perfect are documented here.

## [Unreleased]

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
