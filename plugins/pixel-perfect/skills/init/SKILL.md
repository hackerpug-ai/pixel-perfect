---
name: init
description: Initialize a Pixel Perfect project through DISCOVER, TARGET, and EQUIP, capturing goal, platforms, framework, styling, libraries, and sandbox choices.
---

# Pixel Perfect: Init

Read [the runtime contract](../../workflows/RUNTIME-CONTRACT.md). If `design/manifest.json` or `design/manifest.yaml` exists, read [the process context](../process-context/SKILL.md). Then read [the complete init workflow](../../workflows/init.md) and execute it as authoritative.

Preserve every discovery, selection, validation, and manifest gate.

Use `$pixel-perfect:init` as the Codex invocation, treat the user's remaining text as its input, collect choices through the available Codex input mechanism one call per declared batch, never printing a decision as prose and ending the turn, and represent transient workflow tasks with Codex planning. Durable completion comes only from the manifest and required evidence.
