---
name: pixel-perfect-add-platform
description: "Add a target platform to an existing project while preserving its existing platform configuration and progress."
---

# Pixel Perfect: Add Platform

Read [the canonical Pixel Perfect add-platform skill](../../../skills/add-platform/SKILL.md) and execute it as authoritative. Treat text after `/skill:pixel-perfect-add-platform` as the invocation input.

Preserve every selection, validation, and manifest gate.

Select when: An initialized project needs another platform.
Inputs and prerequisites: Existing manifest and target platform.
Outputs and side effects: Adds one platform and its setup gates.
Handoffs: pixel-perfect:scaffold, pixel-perfect:status. Example: `pixel-perfect:add-platform mobile-ios`.
