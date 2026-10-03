---
name: pixel-perfect-status
description: "Inspect current progress, reference freshness, unfinished refresh work, and the next appropriate command without changing project configuration."
---

# Pixel Perfect: Status

Read [the canonical Pixel Perfect status skill](../../../skills/status/SKILL.md) and execute it as authoritative. Treat text after `/skill:pixel-perfect-status` as the invocation input.

Report actual state without inventing progress.

Select when: Returning to a project or deciding the next command.
Inputs and prerequisites: Project directory and existing manifest, if present.
Outputs and side effects: Reports shape, capture readiness, historical passes, and pending work; never migrates.
Handoffs: pixel-perfect:init, pixel-perfect:scaffold, pixel-perfect:build, pixel-perfect:evolve, pixel-perfect:verify. Example: `pixel-perfect:status`.
