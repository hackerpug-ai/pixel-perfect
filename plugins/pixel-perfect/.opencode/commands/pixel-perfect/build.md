---
description: "Implement or resume the confirmed component and screen plan. Use evolve when updated designs require reassessing completed work."
---

# Pixel Perfect: Build

Invocation input: `$ARGUMENTS`

Resolve the Pixel Perfect plugin root: Claude Code substitutes `${CLAUDE_PLUGIN_ROOT}`; Grok uses the enabled Claude-compatible plugin root; OpenCode uses `.pixel-perfect/plugins/pixel-perfect` from the project root; Cursor uses the plugin directory that contains this command under `~/.cursor/plugins/` (marketplace) or `~/.cursor/plugins/local/` (local).

Read `<plugin-root>/workflows/RUNTIME-CONTRACT.md`. If `design/manifest.json` or `design/manifest.yaml` exists, read `<plugin-root>/skills/process-context/SKILL.md`. Then read `<plugin-root>/workflows/build.md` and execute it as the authoritative workflow with the invocation input.

Do not summarize, replace, or stub any implementation, test, sandbox, or gate. Translate only the neutral runtime primitives for the active harness.

Collect every decision through the harness's structured question mechanism as the runtime contract's user choice protocol specifies — `AskUserQuestion` in Claude Code, one call per declared batch. Never print a decision as prose and end the turn.

Follow the runtime contract's turn shape. Open with a status digest of twelve lines or fewer — where the project stands, what the next move is, what is being asked — and put any longer analysis in the artifact the workflow names. Run no web search, no install, and no generation before the decision that authorizes it. When the invocation input does not resolve to exactly one thing, ask which was meant instead of guessing.

Select when: A confirmed plan has unfinished implementation.
Inputs and prerequisites: Scaffolded project, confirmed inventory, and optional platform.
Outputs and side effects: Writes components, screens, stories, and verification records.
Handoffs: pixel-perfect:evolve, pixel-perfect:refine, pixel-perfect:verify, pixel-perfect:status. Example: `pixel-perfect:build --platform web-desktop`.
