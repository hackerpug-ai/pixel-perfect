# Change Plan: Distribute Pixel Perfect as a pi Package

## Summary

Turn the canonical `plugins/pixel-perfect` runtime bundle into an installable pi package. Generate namespaced pi skill adapters from the existing capability registry, add pi to the shared release authority, document installation, and verify the package with the real pi runtime.

## Change Type

**MINOR** - This adds a supported harness and a new public installation channel without breaking existing harness contracts.

## Current Version

9.0.0

## New Version

9.1.0

## Affected Files

| File | Change | Description |
|---|---|---|
| `plugins/pixel-perfect/package.json` | add | Define the publishable pi package and its resource manifest. |
| `plugins/pixel-perfect/.pi/skills/*/SKILL.md` | add | Provide namespaced pi entry adapters generated from the capability registry. |
| `scripts/build-adapters.mjs` | modify | Generate and drift-check pi adapters. |
| `scripts/validate-package.mjs` | modify | Validate pi package contents and capability parity. |
| `scripts/release.mjs` | modify | Synchronize and verify the pi product version and release channel. |
| `plugins/pixel-perfect/workflows/RUNTIME-CONTRACT.md` | modify | Define pi invocation, interaction, task, and path mappings. |
| `plugin-release.json` and harness manifests | modify | Bump all governed product versions to 9.1.0 and add pi. |
| `README.md` and `CHANGELOG.md` | modify | Document pi installation and the 9.1.0 release. |
| `test/*.test.mjs` | modify | Cover pi packaging, generated adapters, version sync, and real install behavior. |

## Implementation Tasks

- [x] Add a package manifest with `pi-package` metadata and a narrow files allowlist.
- [x] Generate one namespaced pi skill adapter for each public capability.
- [x] Add pi to the runtime contract and release authority.
- [x] Document npm and local package installation.
- [x] Preserve all existing Claude Code, Codex, Cursor, Grok, and OpenCode behavior.

## Required: Version Bump

- [x] Set `plugin-release.json` to 9.1.0.
- [x] Synchronize Claude Code, Codex, Cursor, Grok, OpenCode, and pi version surfaces through `scripts/release.mjs`.
- [x] Add a non-empty 9.1.0 changelog section.

## Required: Test Updates

- [x] Add failing tests for the pi package manifest and namespaced adapter set before implementation.
- [x] Verify generated adapter parity and package boundaries.
- [x] Run the complete repository CI suite.
- [x] Pack the actual npm artifact and load it with the installed pi CLI in an isolated environment.
