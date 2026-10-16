---
description: "Apply a specific correction to named components, screens, or theme using feedback or a reference. Use evolve for broad reassessment or inventory changes."
---

# Pixel Perfect: Refine

Invocation input: `$ARGUMENTS`

Resolve the Pixel Perfect plugin root: Claude Code substitutes `${CLAUDE_PLUGIN_ROOT}`; Grok uses the enabled Claude-compatible plugin root; OpenCode uses `.pixel-perfect/plugins/pixel-perfect` from the project root; Cursor uses the plugin directory that contains this command under `~/.cursor/plugins/` (marketplace) or `~/.cursor/plugins/local/` (local).

Read `<plugin-root>/workflows/RUNTIME-CONTRACT.md`. If `design/manifest.json` or `design/manifest.yaml` exists, read `<plugin-root>/skills/process-context/SKILL.md`. Then read `<plugin-root>/workflows/refine.md` and execute it as the authoritative workflow with the invocation input.

Do not substitute mockups or placeholders for requested product changes. Translate only the neutral runtime primitives for the active harness.

Collect every decision through the harness's structured question mechanism as the runtime contract's user choice protocol specifies — `AskUserQuestion` in Claude Code, one call per declared batch. Never print a decision as prose and end the turn.

Follow the runtime contract's turn shape. Open with a status digest of twelve lines or fewer — where the project stands, what the next move is, what is being asked — and put any longer analysis in the artifact the workflow names. Run no web search, no install, and no generation before the decision that authorizes it. When the invocation input does not resolve to exactly one thing, ask which was meant instead of guessing.

Select when: A known target needs a specific correction.
Inputs and prerequisites: Scaffolded project and named component, screen, theme, feedback, or reference.
Outputs and side effects: Edits the target and reruns affected verification.
Handoffs: pixel-perfect:evolve, pixel-perfect:verify, pixel-perfect:status. Example: `pixel-perfect:refine --component Button "Increase the corner radius"`.
