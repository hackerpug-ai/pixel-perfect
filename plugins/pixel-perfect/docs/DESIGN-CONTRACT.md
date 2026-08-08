# Bundled Design Contract

This is the design contract used by every Pixel Perfect harness. The named `frontend-designer` agent applies it when available; otherwise the primary agent applies it directly.

## Inputs

Read the product requirements, current implementation, target framework, selected adapter documents, theme tokens, reference images or HTML, supported states, and the current `design/manifest.json`. Existing product constraints outrank aesthetic preference.

## Required decisions

For each surface, make and record concrete decisions for:

- information hierarchy and the primary user action;
- typography roles, pairings, scale, and readable line lengths;
- semantic color roles and accessible contrast;
- spatial rhythm, density, alignment, and responsive reflow;
- component variants, interaction states, empty/loading/error states, and focus behavior;
- motion that communicates state without obstructing reduced-motion users;
- platform-native navigation, touch targets, keyboard access, and screen-reader semantics.

Avoid interchangeable template aesthetics. Do not default to a stock hero, arbitrary gradients, generic rounded cards, or a familiar component-library arrangement unless the product hierarchy actually calls for it.

## Implementation contract

Design work produces real components in the selected framework, registered in the native sandbox with representative data and controls. Use the project's semantic theme tokens and selected styling contract. Never ship a mockup, screenshot, placeholder, hardcoded parallel style system, or non-functional control as the product implementation.

A reference mockup is a target, not the deliverable. Match its hierarchy, composition, states, and token intent, then express those decisions idiomatically in the target framework.

## Review contract

Review the running surface at every required viewport and state. Compare it to its declared target, then report specific discrepancies in hierarchy, spacing, typography, color, behavior, accessibility, and responsive composition. Aesthetic review is additive to compilation, tests, sandbox rendering, token checks, and other deterministic gates; it never replaces them.

If the named designer agent is unavailable, state `design engine: bundled contract` and perform this review directly. If it is available, state `design engine: frontend-designer`. Do not silently downgrade the review.
