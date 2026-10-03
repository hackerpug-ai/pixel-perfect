---
name: pixel-perfect-assimilate
description: "Analyze new mockups or inspiration and propose additions to the design system. Use evolve to reconcile refreshed designs with built components."
---

# Pixel Perfect: Assimilate

Read [the canonical Pixel Perfect assimilate skill](../../../skills/assimilate/SKILL.md) and execute it as authoritative. Treat text after `/skill:pixel-perfect-assimilate` as the invocation input.

Run the complete shared design analysis and gate, write the report, and persist only what the user confirms.

Select when: New inspiration or mockups need design analysis.
Inputs and prerequisites: HTML/image exports, extracted bundles, URLs, or inspiration.
Outputs and side effects: Writes an analysis report; persists confirmed additions.
Handoffs: pixel-perfect:evolve, pixel-perfect:build. Example: `pixel-perfect:assimilate ./inspiration`.
