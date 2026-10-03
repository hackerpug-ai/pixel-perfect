---
name: pixel-perfect-scaffold
description: "Set up the selected framework, tokens, component sandbox, and capture tooling before building product components."
---

# Pixel Perfect: Scaffold

Read [the canonical Pixel Perfect scaffold skill](../../../skills/scaffold/SKILL.md) and execute it as authoritative. Treat text after `/skill:pixel-perfect-scaffold` as the invocation input.

Preserve every installation, render, and verification gate.

Select when: Tool selections are confirmed and the platform needs setup.
Inputs and prerequisites: Initialized manifest and selected platform/toolchain.
Outputs and side effects: Installs tools and writes theme, sandbox, and capture setup.
Handoffs: pixel-perfect:build, pixel-perfect:verify. Example: `pixel-perfect:scaffold --platform web-desktop`.
