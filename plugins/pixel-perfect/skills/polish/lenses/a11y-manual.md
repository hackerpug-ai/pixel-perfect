# Lens identity

- **name@version:** `a11y-manual@1.0`
- **inputs:** the PNG of one screen×state; the AX/DOM snapshot (targeting only — confirm what can receive focus, do not judge the DOM instead of the image); the project's `DESIGN.md`.
- **outputs:** 0–8 findings in `skills/polish/findings-schema.json`.

# Rubric

This lens covers the criteria automation (axe) catches 0% of. Principle IDs:

- **FOCUS-VISIBLE** — the focused control must show a visible focus indicator in the image (or a focus-state capture). A ring that exists only in CSS you did not see does not count.
- **FOCUS-ORDER** — visible tab order must match the reading order. A control that appears first visually but last in the AX tree is a finding.
- **A1 Non-text Contrast** — WCAG 1.4.11, ≥3:1 for UI component boundaries against the adjacent background. This is **not** the DESIGN.md text-contrast 4.5:1 rule.
- **MEANINGFUL-SEQUENCE** — the visual sequence of content matches a meaningful programmatic sequence.
- **KEYBOARD** — every visible interactive control is reachable from the keyboard (present in the AX tree as a focusable role). Keyboard reach, not "has a click handler."

A2 Semantic Structure and A3 Target Size are defined in the taxonomy; they are not required for this v1 lens. A4/A5 are out of scope.

Tier: focus-ring and contrast fixes are **T1**. Missing keyboard reach / focus order that can be repaired without changing the flow is **T2**. Reordering the whole IA is **T3**.

# Calibration — what NOT to file

- Do not file FOCUS-VISIBLE on a screenshot that is not a focus state unless the page shows a focused control with no ring.
- Do not file A1 against text; text contrast is Google's DESIGN.md lint (4.5:1), not this lens (3:1 non-text).
- Do not file KEYBOARD for disabled controls that are visibly disabled.
- Do not file MEANINGFUL-SEQUENCE because a decorative icon sits before its label if they share one AX node.
- Do not report axe-style issues this lens is not for (missing html lang, duplicate ids).

# Output contract

Emit only schema-valid findings. Target with `element.ax_ref` / `testID`. Never model-guessed coordinates.

**Tiers (mechanical):** T1 visual polish → auto-fix. T2 additive UX → auto-fix. T3 structural → propose-only.

Laws 5, 6, and 13 apply verbatim:

5. **Inventory before absence.** A lens must list the visible controls BEFORE any "X is missing" claim (defeats hallucinated absence — same image judged missing/present/missing across runs in the documented experiment).
6. **Binding caps, not polite ones.** "MUST return at most 8 findings per screen. No exceptions." — polite phrasing ("be ruthless") was ignored on every measured run.
13. **Strip the framing.** Lens prompts contain the image, the rubric, and DESIGN.md — never a narrative of what the screen is "supposed" to be (framing leaks into findings: models report the controls they were told to expect).

# Worked examples

```json
{
  "screen": "checkout",
  "state": "default",
  "platform": "web",
  "lens": "a11y-manual@1.0",
  "principle": "FOCUS-VISIBLE",
  "tier": "T1",
  "severity": "MAJOR",
  "observed": "The focused Pay now button shows no ring, outline, or contrast change against the surrounding bar.",
  "proposal": "Apply the focus-border token as a 2px ring with offset on the primary button.",
  "element": { "ax_ref": "pay-now", "bbox": null },
  "evidence": { "shot": "design/polish/runs/<ts>/shots/checkout.default.png" },
  "fingerprint": "sha1(checkout|FOCUS-VISIBLE|pay-now)"
}
```

```json
{
  "screen": "home",
  "state": "default",
  "platform": "web",
  "lens": "a11y-manual@1.0",
  "principle": "A1",
  "tier": "T1",
  "severity": "MINOR",
  "observed": "The unselected segment-control pill has a 1px border that is nearly the same color as the page surface; the control boundary disappears.",
  "proposal": "Restyle the idle pill border to the default-border token so the boundary meets 3:1 against the page.",
  "element": { "ax_ref": "segment-today", "bbox": null },
  "evidence": { "shot": "design/polish/runs/<ts>/shots/home.default.png" },
  "fingerprint": "sha1(home|A1|segment-today)"
}
```
