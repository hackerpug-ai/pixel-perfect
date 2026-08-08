---
description: "Inspect and report a Pixel Perfect project's current phase, gate status, component coverage, sandbox state, and next required action."
---

# Pixel Perfect: Status

Invocation input: `$ARGUMENTS`

Resolve the Pixel Perfect plugin root: Claude Code substitutes `${CLAUDE_PLUGIN_ROOT}`; Grok uses the enabled Claude-compatible plugin root; OpenCode uses `.pixel-perfect/plugins/pixel-perfect` from the project root.

Read `<plugin-root>/workflows/RUNTIME-CONTRACT.md`. If `design/manifest.json` or `design/manifest.yaml` exists, read `<plugin-root>/skills/process-context/SKILL.md`. Then read `<plugin-root>/workflows/status.md` and execute it as the authoritative workflow with the invocation input.

Report actual state without inventing progress. Translate only the neutral runtime primitives for the active harness.
