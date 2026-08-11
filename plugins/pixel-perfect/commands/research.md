---
description: "Research UI patterns, competitors, trends, or ecosystem libraries and save evidence-backed findings into the project's design research library."
---

# Pixel Perfect: Research

Invocation input: `$ARGUMENTS`

Resolve the Pixel Perfect plugin root: Claude Code substitutes `${CLAUDE_PLUGIN_ROOT}`; Grok uses the enabled Claude-compatible plugin root; OpenCode uses `.pixel-perfect/plugins/pixel-perfect` from the project root; Cursor uses the plugin directory that contains this command under `~/.cursor/plugins/` (marketplace) or `~/.cursor/plugins/local/` (local).

Read `<plugin-root>/workflows/RUNTIME-CONTRACT.md`. If `design/manifest.json` or `design/manifest.yaml` exists, read `<plugin-root>/skills/process-context/SKILL.md`. Then read `<plugin-root>/workflows/research.md` and execute it as the authoritative workflow with the invocation input.

Use current sources and preserve every required evidence field and output. Translate only the neutral runtime primitives for the active harness.
