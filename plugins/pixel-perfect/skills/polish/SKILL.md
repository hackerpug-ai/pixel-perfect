---
name: polish
description: "Internal lens pack and findings schema for the forthcoming polish capability. Not a public command — lenses and schema only. P6 will add the workflow."
---

# Polish lens pack (internal)

This directory is **not** a public capability. It holds:

- `findings-schema.json` — the one findings shape every lens emits
- `lenses/*.md` — seven self-contained judge prompts

Do not add `commands/polish.md` or `workflows/polish.md` here. Those arrive with task P6.

Load a lens file in full. Each file stands alone: identity, rubric, calibration, output contract (including laws 5, 6, and 13 verbatim), and two worked examples.

Tiers are mechanical:

| Tier | Meaning | Action |
|------|---------|--------|
| T1 | Visual polish | auto-fix |
| T2 | Additive UX | auto-fix |
| T3 | Structural (IA / flow / removals) | propose-only |
