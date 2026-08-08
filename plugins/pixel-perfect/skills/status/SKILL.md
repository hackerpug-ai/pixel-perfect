---
name: status
description: Inspect and report a Pixel Perfect project's current phase, gate status, component coverage, sandbox state, and next required action.
---

# Pixel Perfect: Status

Read [the runtime contract](../../workflows/RUNTIME-CONTRACT.md). If `design/manifest.json` or `design/manifest.yaml` exists, read [the process context](../process-context/SKILL.md). Then read [the complete status workflow](../../workflows/status.md) and execute it as authoritative.

Report actual state without inventing progress.

Use `$pixel-perfect:status` as the Codex invocation, treat the user's remaining text as its input, collect choices through the available Codex input mechanism, and represent transient workflow tasks with Codex planning. Durable completion comes only from the manifest and required evidence.
