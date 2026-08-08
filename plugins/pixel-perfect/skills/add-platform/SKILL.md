---
name: add-platform
description: Add a platform to an existing Pixel Perfect project by running TARGET and EQUIP for that platform and recording its gated build state.
---

# Pixel Perfect: Add Platform

Read [the runtime contract](../../workflows/RUNTIME-CONTRACT.md). If `design/manifest.json` or `design/manifest.yaml` exists, read [the process context](../process-context/SKILL.md). Then read [the complete add-platform workflow](../../workflows/add-platform.md) and execute it as authoritative.

Preserve every selection, validation, and manifest gate.

Use `$pixel-perfect:add-platform` as the Codex invocation, treat the user's remaining text as its input, collect choices through the available Codex input mechanism one call per declared batch, never printing a decision as prose and ending the turn, and represent transient workflow tasks with Codex planning. Durable completion comes only from the manifest and required evidence.
