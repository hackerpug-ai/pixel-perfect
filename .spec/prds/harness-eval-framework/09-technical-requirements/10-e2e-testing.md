---
stability: CONSTITUTION
last_validated: 2026-10-13
prd_version: 1.0.0
---

# E2E Harness Constitution

The constitution is incomplete until the reference flow below is green on a real runner. That spike is a gating prerequisite for the rest of the build.

## Framework

GitHub Actions drives real harness CLIs. The surfaces are the six CLIs (Claude Code, Codex, Grok, OpenCode, Pi, Cursor) on a GitHub-hosted Linux runner, plus the local release script. There is no browser and no device. The pinned track blocks a release. The newest track warns. Desktop GUI harnesses are out.

## Determinism seam

Do not assert the model's prose as the pass. Assert engine outcomes: the grade file verdict, the event-stream facts (plugin loaded, tool call denied, question seen), the verify report, the manifest gate left pending, and the fixture hashes. The planted defect is a file change the oracle script already detects with no model. The fixture is copied and never run in place. Install finishes before the before-hash.

Reset: a fresh work directory and a fresh home per cell. Seed: the kit project plus the named overlay. Replay: the case file's expected files and the oracle script.

## Turnkey runner

One workflow, `harness-eval`, is the runner: schedule, hand dispatch, and push to main for plugin changes. It installs, grades, writes the summary, and uploads the result. A flow counts only when it runs through that workflow.

## Landmine ledger

- Exit code 0 is not success. Claude Code has reported success while its own workflow reads were denied. Pi JSON mode exits 0 when the model call fails. Codex warnings use an error event and still exit 0.
- No harness has a wall clock. Close stdin and wrap the call in timeout. Cursor headless runs have hung in Actions before.
- Do not install the Cursor CLI on the maintainer's Mac. The installer relinks `~/.local/bin/agent`, which is Grok.
- `grok --trust` is forbidden on a step that holds an API key.
- OpenCode published install clones the whole repository into the work directory. Slash text does not run a command.
- Codex runs skills from its plugin cache, not from the working tree.
- Nothing in the research has been run on Linux.

## Proven reference flow

Not proven. The spike is: on a real Linux runner, install Pi from the checkout, list the 11 public commands with no model call, run `status` on a copy of the fixture, and show a grade file whose verdict is not the process exit code. Until that run is green, this constitution is a plan.

## Flake policy

Run once. A failure is real. Do not retry a cell to turn it green.

## CI lanes

The pinned status blocks publish. The newest track does not, unless the cell could not run. Later checks do not fail the job. Drift is its own status. Pull requests do not run this workflow.
