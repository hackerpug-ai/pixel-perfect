---
name: assimilate
description: "Analyze new mockups or inspiration and propose additions to the design system. Use evolve to reconcile refreshed designs with built components."
---

# Pixel Perfect: Assimilate

Read [the runtime contract](../../workflows/RUNTIME-CONTRACT.md). If `design/manifest.json` or `design/manifest.yaml` exists, read [the process context](../process-context/SKILL.md). Then read [the complete assimilate workflow](../../workflows/assimilate.md) and execute it as authoritative.

Run the complete shared design analysis and gate, write the report, and persist only what the user confirms.

Invoke with the active harness's syntax from the harness mappings table in the runtime contract, treat the user's remaining text as input, collect choices through that harness's input mechanism one call per declared batch, never printing a decision as prose and ending the turn, and represent transient workflow tasks with its planning tools. Follow the runtime contract's turn shape: open with a status digest of twelve lines or fewer, write longer analysis to the artifact the workflow names, run no search, install, or generation before the decision authorizing it, and ask when the input does not resolve to exactly one thing. Durable completion comes only from the manifest and required evidence.

Select when: New inspiration or mockups need design analysis.
Inputs and prerequisites: HTML/image exports, extracted bundles, URLs, or inspiration.
Outputs and side effects: Writes an analysis report; persists confirmed additions.
Handoffs: pixel-perfect:evolve, pixel-perfect:build. Example: `pixel-perfect:assimilate ./inspiration`.
