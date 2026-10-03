---
name: scaffold
description: "Set up the selected framework, tokens, component sandbox, and capture tooling before building product components."
---

# Pixel Perfect: Scaffold

Read [the runtime contract](../../workflows/RUNTIME-CONTRACT.md). If `design/manifest.json` or `design/manifest.yaml` exists, read [the process context](../process-context/SKILL.md). Then read [the complete scaffold workflow](../../workflows/scaffold.md) and execute it as authoritative.

Preserve every installation, render, and verification gate.

Invoke with the active harness's syntax from the harness mappings table in the runtime contract, treat the user's remaining text as input, collect choices through that harness's input mechanism one call per declared batch, never printing a decision as prose and ending the turn, and represent transient workflow tasks with its planning tools. Follow the runtime contract's turn shape: open with a status digest of twelve lines or fewer, write longer analysis to the artifact the workflow names, run no search, install, or generation before the decision authorizing it, and ask when the input does not resolve to exactly one thing. Durable completion comes only from the manifest and required evidence.

Select when: Tool selections are confirmed and the platform needs setup.
Inputs and prerequisites: Initialized manifest and selected platform/toolchain.
Outputs and side effects: Installs tools and writes theme, sandbox, and capture setup.
Handoffs: pixel-perfect:build, pixel-perfect:verify. Example: `pixel-perfect:scaffold --platform web-desktop`.
