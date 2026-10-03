---
description: "Initialize a new UI project and record its goals, platforms, and toolchain. For an existing project, inspect status and resume its workflow."
---

# Pixel Perfect: Init

Invocation input: `$ARGUMENTS`

Resolve the Pixel Perfect plugin root: Claude Code substitutes `${CLAUDE_PLUGIN_ROOT}`; Grok uses the enabled Claude-compatible plugin root; OpenCode uses `.pixel-perfect/plugins/pixel-perfect` from the project root; Cursor uses the plugin directory that contains this command under `~/.cursor/plugins/` (marketplace) or `~/.cursor/plugins/local/` (local).

Read `<plugin-root>/workflows/RUNTIME-CONTRACT.md`. If `design/manifest.json` or `design/manifest.yaml` exists, read `<plugin-root>/skills/process-context/SKILL.md`. Then read `<plugin-root>/workflows/init.md` and execute it as the authoritative workflow with the invocation input.

Preserve every discovery, selection, validation, and manifest gate. Translate only the neutral runtime primitives for the active harness.

Collect every decision through the harness's structured question mechanism as the runtime contract's user choice protocol specifies — `AskUserQuestion` in Claude Code, one call per declared batch. Never print a decision as prose and end the turn.

Follow the runtime contract's turn shape. Open with a status digest of twelve lines or fewer — where the project stands, what the next move is, what is being asked — and put any longer analysis in the artifact the workflow names. Run no web search, no install, and no generation before the decision that authorizes it. When the invocation input does not resolve to exactly one thing, ask which was meant instead of guessing.

Select when: Starting a project without a confirmed setup.
Inputs and prerequisites: Project goals and directory; existing manifests are inspected first.
Outputs and side effects: Records confirmed project and platform setup.
Handoffs: pixel-perfect:status, pixel-perfect:add-platform, pixel-perfect:scaffold. Example: `pixel-perfect:init`.
