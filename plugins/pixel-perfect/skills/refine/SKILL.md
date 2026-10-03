---
name: refine
description: "Apply a specific correction to named components, screens, or theme using feedback or a reference. Use evolve for broad reassessment or inventory changes."
---

# Pixel Perfect: Refine

Read [the runtime contract](../../workflows/RUNTIME-CONTRACT.md). If `design/manifest.json` or `design/manifest.yaml` exists, read [the process context](../process-context/SKILL.md). Then read [the complete refine workflow](../../workflows/refine.md) and execute it as authoritative.

Do not substitute mockups or placeholders for requested product changes.

Invoke with the active harness's syntax from the harness mappings table in the runtime contract, treat the user's remaining text as input, collect choices through that harness's input mechanism one call per declared batch, never printing a decision as prose and ending the turn, and represent transient workflow tasks with its planning tools. Follow the runtime contract's turn shape: open with a status digest of twelve lines or fewer, write longer analysis to the artifact the workflow names, run no search, install, or generation before the decision authorizing it, and ask when the input does not resolve to exactly one thing. Durable completion comes only from the manifest and required evidence.

Select when: A known target needs a specific correction.
Inputs and prerequisites: Scaffolded project and named component, screen, theme, feedback, or reference.
Outputs and side effects: Edits the target and reruns affected verification.
Handoffs: pixel-perfect:evolve, pixel-perfect:verify, pixel-perfect:status. Example: `pixel-perfect:refine --component Button "Increase the corner radius"`.
