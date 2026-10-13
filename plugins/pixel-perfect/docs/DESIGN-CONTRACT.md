# Design Contract

This is the design contract every Pixel Perfect design run uses. The packaged `pixel-perfect:designer` agent applies it. `workflows/RUNTIME-CONTRACT.md`, section "Packaged agents", says how that agent is started.

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

Avoid interchangeable template aesthetics. Do not default to a stock hero, arbitrary gradients, generic rounded cards, or a stock component-library *layout* unless the product hierarchy actually calls for it.

That is a constraint on how a surface **looks** — never on what it is **built on**. Distinctiveness comes from typography, color, spacing, and motion, not from rebuilding a primitive the project's component library already provides. Composing that library's `Button` and restyling it through the theme is how a surface becomes distinctive; hand-rolling a button from raw framework primitives to escape a perceived "library look" produces a component that is off-theme, less accessible, and inconsistent with every other control — and is blocked by the component contract.

## Implementation contract

Design work produces real components in the selected framework, registered in the native sandbox with representative data and controls. Use the project's semantic theme tokens, its selected styling contract, and its selected component contract. Never ship a mockup, screenshot, placeholder, hardcoded parallel style system, a primitive re-implemented from scratch when the component library provides one, or a non-functional control as the product implementation.

A reference mockup is a target, not the deliverable. Match its hierarchy, composition, states, and token intent, then express those decisions idiomatically in the target framework — which means through the project's chosen libraries, not by translating the mockup's markup into raw primitives. A design reference tells you what a component must look like; it never tells you what to build it on.

## Review contract

Review the running surface at every required viewport and state. Compare it to its declared target, then report specific discrepancies in hierarchy, spacing, typography, color, behavior, accessibility, and responsive composition. Aesthetic review is additive to compilation, tests, sandbox rendering, token checks, and other deterministic gates; it never replaces them.

The packaged designer performs this review. State the route it ran through: `design engine: packaged designer (registered)`, `(in brief)`, or `(inline)`. When no child can start, the orchestrator reads the brief and performs the review inline, and it says so. Do not silently downgrade the review.
