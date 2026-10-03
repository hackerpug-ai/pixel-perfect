---
name: status
description: "Inspect current progress, reference freshness, unfinished refresh work, and the next appropriate command without changing project configuration."
---

# Pixel Perfect: Status

Read [the runtime contract](../../workflows/RUNTIME-CONTRACT.md). If `design/manifest.json` or `design/manifest.yaml` exists, read [the process context](../process-context/SKILL.md). Then read [the complete status workflow](../../workflows/status.md) and execute it as authoritative.

Report actual state without inventing progress.

Invoke with the active harness's syntax from the harness mappings table in the runtime contract, treat the user's remaining text as input, collect choices through that harness's input mechanism, and represent transient workflow tasks with its planning tools. Durable completion comes only from the manifest and required evidence.

Select when: Returning to a project or deciding the next command.
Inputs and prerequisites: Project directory and existing manifest, if present.
Outputs and side effects: Reports shape, capture readiness, historical passes, and pending work; never migrates.
Handoffs: pixel-perfect:init, pixel-perfect:scaffold, pixel-perfect:build, pixel-perfect:evolve, pixel-perfect:verify. Example: `pixel-perfect:status`.
