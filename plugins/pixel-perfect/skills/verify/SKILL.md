---
name: verify
description: Run Pixel Perfect verification gates for the current phase, report concrete evidence, and advance only when every required check passes.
---

# Pixel Perfect: Verify

Read [the runtime contract](../../workflows/RUNTIME-CONTRACT.md). If `design/manifest.json` or `design/manifest.yaml` exists, read [the process context](../process-context/SKILL.md). Then read [the complete verify workflow](../../workflows/verify.md) and execute it as authoritative.

Never fake evidence, weaken a gate, or report a partial check as complete.

Use `$pixel-perfect:verify` as the Codex invocation, treat the user's remaining text as its input, collect choices through the available Codex input mechanism, and represent transient workflow tasks with Codex planning. Durable completion comes only from the manifest and required evidence.
