---
name: pixel-perfect-evolve
description: "Reconcile an existing UI system with updated designs or requirements, plan visual and inventory changes, and coordinate implementation and verification."
---

# Pixel Perfect: Evolve

Read [the canonical Pixel Perfect evolve skill](../../../skills/evolve/SKILL.md) and execute it as authoritative. Treat text after `/skill:pixel-perfect-evolve` as the invocation input.

Confirm the full delta before any write or delete; hand additions to build; prove with re-capture; never silent-duplicate or silent-sweep.

Select when: Updated exports or requirements require broad reassessment of built work.
Inputs and prerequisites: Existing project; --refresh <source...> [--platform <name>] [--reanalyze], --resume <run-id>, or an inventory delta.
Outputs and side effects: Stages revisions and one change plan; accepted edits create resumable progress and evidence.
Handoffs: pixel-perfect:refine, pixel-perfect:build, pixel-perfect:verify, pixel-perfect:status. Example: `pixel-perfect:evolve --refresh ./exports --platform web-desktop`.
