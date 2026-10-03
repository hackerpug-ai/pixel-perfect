---
name: wireframe
description: "Create low-fidelity layouts and state maps from requirements or concepts before implementation."
---

# Pixel Perfect: Wireframe

Read [the runtime contract](../../workflows/RUNTIME-CONTRACT.md). If `design/manifest.json` or `design/manifest.yaml` exists, read [the process context](../process-context/SKILL.md). Then read [the complete wireframe workflow](../../workflows/wireframe.md) and execute it as authoritative.

Produce the complete required wireframe set, states, annotations, and mappings.

Invoke with the active harness's syntax from the harness mappings table in the runtime contract, treat the user's remaining text as input, collect choices through that harness's input mechanism one call per declared batch, never printing a decision as prose and ending the turn, and represent transient workflow tasks with its planning tools. Follow the runtime contract's turn shape: open with a status digest of twelve lines or fewer, write longer analysis to the artifact the workflow names, run no search, install, or generation before the decision authorizing it, and ask when the input does not resolve to exactly one thing. Durable completion comes only from the manifest and required evidence.

Select when: Requirements need a structural design before building.
Inputs and prerequisites: Requirements, concept, or specification.
Outputs and side effects: Writes layouts, state maps, and design mappings.
Handoffs: pixel-perfect:assimilate, pixel-perfect:build. Example: `pixel-perfect:wireframe ./requirements.md`.
