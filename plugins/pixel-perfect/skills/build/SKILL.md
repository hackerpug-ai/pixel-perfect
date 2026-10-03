---
name: build
description: "Implement or resume the confirmed component and screen plan. Use evolve when updated designs require reassessing completed work."
---

# Pixel Perfect: Build

Read [the runtime contract](../../workflows/RUNTIME-CONTRACT.md). If `design/manifest.json` or `design/manifest.yaml` exists, read [the process context](../process-context/SKILL.md). Then read [the complete build workflow](../../workflows/build.md) and execute it as authoritative.

Do not summarize, replace, or stub any implementation, test, sandbox, or gate.

Invoke with the active harness's syntax from the harness mappings table in the runtime contract, treat the user's remaining text as input, collect choices through that harness's input mechanism one call per declared batch, never printing a decision as prose and ending the turn, and represent transient workflow tasks with its planning tools. Follow the runtime contract's turn shape: open with a status digest of twelve lines or fewer, write longer analysis to the artifact the workflow names, run no search, install, or generation before the decision authorizing it, and ask when the input does not resolve to exactly one thing. Durable completion comes only from the manifest and required evidence.

Select when: A confirmed plan has unfinished implementation.
Inputs and prerequisites: Scaffolded project, confirmed inventory, and optional platform.
Outputs and side effects: Writes components, screens, stories, and verification records.
Handoffs: pixel-perfect:evolve, pixel-perfect:refine, pixel-perfect:verify, pixel-perfect:status. Example: `pixel-perfect:build --platform web-desktop`.
