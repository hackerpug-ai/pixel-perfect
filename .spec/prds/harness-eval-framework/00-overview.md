---
stability: PRODUCT_CONTEXT
last_validated: 2026-10-30
prd_version: 2.0.0
---

# Harness eval framework

Pixel-perfect ships to six coding-agent command lines: Claude Code, Codex, Grok, OpenCode, Pi, and Cursor. This work gives the person who releases the plugin a grade for each of those harnesses, on the version the release pins and on the newest version, without asking them to notice a break by hand.

## Objective

Each night, when the owner starts a run by hand, and after accepted plugin changes land, GitHub Actions installs pixel-perfect into Claude Code, Codex, Grok, OpenCode, Pi, and Cursor and grades command lists, status, verify on a planted defect, and whether the first turn reaches a question before expensive work. A failure on a pinned harness version blocks the next release, and a graded failure on the newest version warns and opens a fix pull request that a person merges. An unexpected failed or ungradable result files an issue on this repository that names the eval to re-run to prove the fix, and filing changes nothing else. Grades use files and the event stream, exit code 0 is not success, later checks in this same initiative report rather than block, and a model judging screenshots stays out.

### Goals

- **G1** — The maintainer can see, for each of the six harnesses, whether the pinned version and the newest version passed, failed, or could not run. (proposed — not confirmed)
- **G2** — A release is still refused when the plugin's command list, adapters, or question rules have drifted, and that proof is separate from whether a live harness can run the plugin. (proposed — not confirmed)
- **G3** — A release does not go out while a pinned harness is broken. A break only on the newest release warns the maintainer and waits for them to merge a fix. (proposed — not confirmed)
- **G4** — When verify is shown a known defect, the maintainer can see that defect named, and the same check on a clean project does not fail. (proposed — not confirmed)

## Problem

A harness release can break the plugin, and the maintainer has to notice. A process can exit 0 while every tool call was denied, so a green exit is not a working plugin. When verify fails it leaves no file, so a failed run cannot be graded from disk. Cursor was left out of earlier coverage. The maintainer asked for it to be a real channel. A pinned failure or a could-not-run holds the release and opens no fix, so nothing records the work it needs, and a failed nightly run leaves that work on a run page nobody may open.

## Solution

A GitHub Actions run installs the plugin into all six harnesses and grades the command list, status, verify on a planted defect, and whether the first turn reaches a question before expensive work. The grade is read from files and the event stream. A pinned failure or a could-not-run holds the next release. A graded failure only on the newest version warns and opens a fix pull request that a person merges. Each distinct unexpected failure also becomes one issue on this repository, carrying the evidence a fixer needs and the eval to re-run to prove the fix. An issue grants no authority and has no effect on a release. A separate drift check still refuses a release when the plugin's own commands, adapters, or question rules have moved. Later checks in this same initiative report and do not hold a release.
