---
description: "Run Pixel Perfect verification gates for the current phase, report concrete evidence, and advance only when every required check passes."
---

# Pixel Perfect: Verify

Invocation input: `$ARGUMENTS`

Resolve the Pixel Perfect plugin root: Claude Code substitutes `${CLAUDE_PLUGIN_ROOT}`; Grok uses the enabled Claude-compatible plugin root; OpenCode uses `.pixel-perfect/plugins/pixel-perfect` from the project root.

Read `<plugin-root>/workflows/RUNTIME-CONTRACT.md`. If `design/manifest.json` or `design/manifest.yaml` exists, read `<plugin-root>/skills/process-context/SKILL.md`. Then read `<plugin-root>/workflows/verify.md` and execute it as the authoritative workflow with the invocation input.

Never fake evidence, weaken a gate, or report a partial check as complete. Translate only the neutral runtime primitives for the active harness.
