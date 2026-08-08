---
name: build
description: Build a Pixel Perfect project through planning, atoms, molecules, organisms, screens, and integration using real components and required verification gates.
---

# Pixel Perfect: Build

Read [the runtime contract](../../workflows/RUNTIME-CONTRACT.md). If `design/manifest.json` or `design/manifest.yaml` exists, read [the process context](../process-context/SKILL.md). Then read [the complete build workflow](../../workflows/build.md) and execute it as authoritative.

Do not summarize, replace, or stub any implementation, test, sandbox, or gate.

Use `$pixel-perfect:build` as the Codex invocation, treat the user's remaining text as its input, collect choices through the available Codex input mechanism one call per declared batch, never printing a decision as prose and ending the turn, and represent transient workflow tasks with Codex planning. Durable completion comes only from the manifest and required evidence.
