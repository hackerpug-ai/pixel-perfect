---
name: status
description: Inspect and report a Pixel Perfect project's current phase, gate status, component coverage, sandbox state, and next required action.
---

# Pixel Perfect: Status

Read [the runtime contract](../../workflows/RUNTIME-CONTRACT.md). If `design/manifest.json` or `design/manifest.yaml` exists, read [the process context](../process-context/SKILL.md). Then read [the complete status workflow](../../workflows/status.md) and execute it as authoritative.

Report actual state without inventing progress.

Invoke with the active harness's syntax from the harness mappings table in the runtime contract, treat the user's remaining text as input, collect choices through that harness's input mechanism, and represent transient workflow tasks with its planning tools. Durable completion comes only from the manifest and required evidence.
