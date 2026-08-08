---
name: refine
description: Refine Pixel Perfect components, screens, or theme from targeted feedback, update real code, and rerun the affected verification gates.
---

# Pixel Perfect: Refine

Read [the runtime contract](../../workflows/RUNTIME-CONTRACT.md). If `design/manifest.json` or `design/manifest.yaml` exists, read [the process context](../process-context/SKILL.md). Then read [the complete refine workflow](../../workflows/refine.md) and execute it as authoritative.

Do not substitute mockups or placeholders for requested product changes.

Use `$pixel-perfect:refine` as the Codex invocation, treat the user's remaining text as its input, collect choices through the available Codex input mechanism one call per declared batch, never printing a decision as prose and ending the turn, and represent transient workflow tasks with Codex planning. Durable completion comes only from the manifest and required evidence.
