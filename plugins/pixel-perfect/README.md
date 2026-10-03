# Pixel Perfect for Pi

Pixel Perfect provides eleven design-system workflows to the Pi coding agent as namespaced skills.

Install the package:

```bash
pi install npm:@hackerpug-ai/pixel-perfect
```

From a repository checkout, install the local package with `pi install ./plugins/pixel-perfect`.

Start a workflow with `/skill:pixel-perfect-<name>`. For example:

```text
/skill:pixel-perfect-init
/skill:pixel-perfect-build atoms
/skill:pixel-perfect-status
```

The package includes the complete workflow, design contract, validators, and reference documentation. Pi loads thin namespaced adapters from `.pi/skills`; each adapter delegates to the same canonical runtime used by the other supported harnesses.
## Refresh an existing library

Use `evolve --refresh <source...> [--platform <name>] [--reanalyze]` to reassess completed UI against updated HTML/image exports or extracted bundles. Confirm one change plan, then resume with `evolve --resume <run-id>` and inspect evidence with `verify --refresh <run-id>`. Use `refine` for a specific named correction. Refresh preserves component identities, history, and unrelated progress; incomplete or stale evidence keeps the run open.

See the packaged `docs/RETURNING-PROJECT.md` and `docs/REFRESH-CONTRACT.md` for the recovery sequence and helper contract. `polish` remains an internal lens pack, not a public command.
