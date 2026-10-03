---
name: pixel-perfect-init
description: "Initialize a new UI project and record its goals, platforms, and toolchain. For an existing project, inspect status and resume its workflow."
---

# Pixel Perfect: Init

Read [the canonical Pixel Perfect init skill](../../../skills/init/SKILL.md) and execute it as authoritative. Treat text after `/skill:pixel-perfect-init` as the invocation input.

Preserve every discovery, selection, validation, and manifest gate.

Select when: Starting a project without a confirmed setup.
Inputs and prerequisites: Project goals and directory; existing manifests are inspected first.
Outputs and side effects: Records confirmed project and platform setup.
Handoffs: pixel-perfect:status, pixel-perfect:add-platform, pixel-perfect:scaffold. Example: `pixel-perfect:init`.
