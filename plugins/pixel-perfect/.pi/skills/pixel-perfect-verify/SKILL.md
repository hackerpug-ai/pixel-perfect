---
name: pixel-perfect-verify
description: "Check implementation, reference fidelity, and affected behavior; record evidence and incomplete work. Apply repairs only when requested with --fix."
---

# Pixel Perfect: Verify

Read [the canonical Pixel Perfect verify skill](../../../skills/verify/SKILL.md) and execute it as authoritative. Treat text after `/skill:pixel-perfect-verify` as the invocation input.

Never fake evidence, weaken a gate, or report a partial check as complete.

Select when: Current evidence or outstanding work needs checking.
Inputs and prerequisites: Existing project; optional --refresh <run-id>, --platform <name>, or --fix.
Outputs and side effects: Reports current checks and incomplete work; --fix authorizes repairs.
Handoffs: pixel-perfect:refine, pixel-perfect:evolve, pixel-perfect:build, pixel-perfect:status. Example: `pixel-perfect:verify --refresh refresh-20261002`.
