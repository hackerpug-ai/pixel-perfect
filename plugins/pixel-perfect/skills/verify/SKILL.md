---
name: verify
description: "Check implementation, reference fidelity, and affected behavior; record evidence and incomplete work. Apply repairs only when requested with --fix."
---

# Pixel Perfect: Verify

Read [the runtime contract](../../workflows/RUNTIME-CONTRACT.md). If `design/manifest.json` or `design/manifest.yaml` exists, read [the process context](../process-context/SKILL.md). Then read [the complete verify workflow](../../workflows/verify.md) and execute it as authoritative.

Never fake evidence, weaken a gate, or report a partial check as complete.

Invoke with the active harness's syntax from the harness mappings table in the runtime contract, treat the user's remaining text as input, collect choices through that harness's input mechanism, and represent transient workflow tasks with its planning tools. Durable completion comes only from the manifest and required evidence.

Select when: Current evidence or outstanding work needs checking.
Inputs and prerequisites: Existing project; optional --refresh <run-id>, --platform <name>, or --fix.
Outputs and side effects: Reports current checks and incomplete work; --fix authorizes repairs.
Handoffs: pixel-perfect:refine, pixel-perfect:evolve, pixel-perfect:build, pixel-perfect:status. Example: `pixel-perfect:verify --refresh refresh-20261002`.
