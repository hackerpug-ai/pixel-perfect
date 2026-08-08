# Changelog

All notable changes to Pixel Perfect are documented here.

## [Unreleased]

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
