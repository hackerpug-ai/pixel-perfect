---
name: init
description: "Initialize a new UI project and record its goals, platforms, and toolchain. For an existing project, inspect status and resume its workflow."
---

# Pixel Perfect: Init

Read [the runtime contract](../../workflows/RUNTIME-CONTRACT.md). If `design/manifest.json` or `design/manifest.yaml` exists, read [the process context](../process-context/SKILL.md). Then read [the complete init workflow](../../workflows/init.md) and execute it as authoritative.

Preserve every discovery, selection, validation, and manifest gate.

Invoke with the active harness's syntax from the harness mappings table in the runtime contract, treat the user's remaining text as input, collect choices through that harness's input mechanism one call per declared batch, never printing a decision as prose and ending the turn, and represent transient workflow tasks with its planning tools. Follow the runtime contract's turn shape: open with a status digest of twelve lines or fewer, write longer analysis to the artifact the workflow names, run no search, install, or generation before the decision authorizing it, and ask when the input does not resolve to exactly one thing. Durable completion comes only from the manifest and required evidence.

Select when: Starting a project without a confirmed setup.
Inputs and prerequisites: Project goals and directory; existing manifests are inspected first.
Outputs and side effects: Records confirmed project and platform setup.
Handoffs: pixel-perfect:status, pixel-perfect:add-platform, pixel-perfect:scaffold. Example: `pixel-perfect:init`.
