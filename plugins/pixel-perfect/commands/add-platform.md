---
description: "Add a platform to an existing Pixel Perfect project by running TARGET and EQUIP for that platform and recording its gated build state."
---

# Pixel Perfect: Add Platform

Invocation input: `$ARGUMENTS`

Resolve the Pixel Perfect plugin root: Claude Code substitutes `${CLAUDE_PLUGIN_ROOT}`; Grok uses the enabled Claude-compatible plugin root; OpenCode uses `.pixel-perfect/plugins/pixel-perfect` from the project root.

Read `<plugin-root>/workflows/RUNTIME-CONTRACT.md`. If `design/manifest.json` or `design/manifest.yaml` exists, read `<plugin-root>/skills/process-context/SKILL.md`. Then read `<plugin-root>/workflows/add-platform.md` and execute it as the authoritative workflow with the invocation input.

Preserve every selection, validation, and manifest gate. Translate only the neutral runtime primitives for the active harness.

Collect every decision through the harness's structured question mechanism as the runtime contract's user choice protocol specifies — `AskUserQuestion` in Claude Code, one call per declared batch. Never print a decision as prose and end the turn.
