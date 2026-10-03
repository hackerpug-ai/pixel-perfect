---
description: "Check implementation, reference fidelity, and affected behavior; record evidence and incomplete work. Apply repairs only when requested with --fix."
---

# Pixel Perfect: Verify

Invocation input: `$ARGUMENTS`

Resolve the Pixel Perfect plugin root: Claude Code substitutes `${CLAUDE_PLUGIN_ROOT}`; Grok uses the enabled Claude-compatible plugin root; OpenCode uses `.pixel-perfect/plugins/pixel-perfect` from the project root; Cursor uses the plugin directory that contains this command under `~/.cursor/plugins/` (marketplace) or `~/.cursor/plugins/local/` (local).

Read `<plugin-root>/workflows/RUNTIME-CONTRACT.md`. If `design/manifest.json` or `design/manifest.yaml` exists, read `<plugin-root>/skills/process-context/SKILL.md`. Then read `<plugin-root>/workflows/verify.md` and execute it as the authoritative workflow with the invocation input.

Never fake evidence, weaken a gate, or report a partial check as complete. Translate only the neutral runtime primitives for the active harness.

Select when: Current evidence or outstanding work needs checking.
Inputs and prerequisites: Existing project; optional --refresh <run-id>, --platform <name>, or --fix.
Outputs and side effects: Reports current checks and incomplete work; --fix authorizes repairs.
Handoffs: pixel-perfect:refine, pixel-perfect:evolve, pixel-perfect:build, pixel-perfect:status. Example: `pixel-perfect:verify --refresh refresh-20261002`.
