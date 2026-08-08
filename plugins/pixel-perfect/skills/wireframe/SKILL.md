---
name: wireframe
description: Generate low-fidelity ASCII wireframes from plans, targets, specs, or concepts as governed structural input to higher-fidelity work.
---

# Pixel Perfect: Wireframe

Read [the runtime contract](../../workflows/RUNTIME-CONTRACT.md). If `design/manifest.json` or `design/manifest.yaml` exists, read [the process context](../process-context/SKILL.md). Then read [the complete wireframe workflow](../../workflows/wireframe.md) and execute it as authoritative.

Produce the complete required wireframe set, states, annotations, and mappings.

Use `$pixel-perfect:wireframe` as the Codex invocation, treat the user's remaining text as its input, collect choices through the available Codex input mechanism one call per declared batch, never printing a decision as prose and ending the turn, and represent transient workflow tasks with Codex planning. Follow the runtime contract's turn shape: open with a status digest of twelve lines or fewer, write longer analysis to the artifact the workflow names, run no search, install, or generation before the decision authorizing it, and ask when the input does not resolve to exactly one thing. Durable completion comes only from the manifest and required evidence.
