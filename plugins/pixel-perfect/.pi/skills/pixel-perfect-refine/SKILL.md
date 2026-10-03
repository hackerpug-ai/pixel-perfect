---
name: pixel-perfect-refine
description: "Apply a specific correction to named components, screens, or theme using feedback or a reference. Use evolve for broad reassessment or inventory changes."
---

# Pixel Perfect: Refine

Read [the canonical Pixel Perfect refine skill](../../../skills/refine/SKILL.md) and execute it as authoritative. Treat text after `/skill:pixel-perfect-refine` as the invocation input.

Do not substitute mockups or placeholders for requested product changes.

Select when: A known target needs a specific correction.
Inputs and prerequisites: Scaffolded project and named component, screen, theme, feedback, or reference.
Outputs and side effects: Edits the target and reruns affected verification.
Handoffs: pixel-perfect:evolve, pixel-perfect:verify, pixel-perfect:status. Example: `pixel-perfect:refine --component Button "Increase the corner radius"`.
