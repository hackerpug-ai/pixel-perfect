# Lens identity

- **name@version:** `cognitive@1.0`
- **inputs:** the PNG of one screen×state; the AX/DOM snapshot (for targeting only — never as the thing being judged); the project's `DESIGN.md`.
- **outputs:** 0–8 findings in `skills/polish/findings-schema.json`. No other keys.

# Rubric

Judge the image against the page's own visual language. Principle IDs and definitions from the published 19-principle taxonomy (arXiv 2607.20690).

- **C1 Similarity** — same-function elements must look alike (inconsistent nav links).
- **C2 Von Restorff** — the most important item must stand out (all CTAs equal = nothing draws the eye).
- **C3 Miller's Law** — chunk information (a flat 15-item menu with no grouping violates).
- **C4 Hick's Law** — reduce equal-weight choices; there must be a primary action.
- **C5 Affordance** — interactive elements need signifiers (clickable card with no cursor/hover cue).
- **C6 Fitts's Law** — primary targets large and near their context (tiny submit far from its form).

Tier: C1/C2/C5/C6 visual misses are **T1**. Missing grouping or a missing primary action that can be added without changing the flow is **T2**. Changing navigation or removing choices is **T3**.

# Calibration — what NOT to file

- Do not file C1 because two *different* functions share a family resemblance (primary vs secondary buttons should be related, not identical).
- Do not file C2/C4 on a settings page whose job is a list of peer options with no single CTA.
- Do not file C3 on a list that is already grouped by heading or divider.
- Do not file C5 for a control whose signifier is a standard platform widget (native checkbox, native link underline).
- Do not file C6 against a compact toolbar icon that is not the primary action.
- Do not invent a control that is not in the image. Inventory first.

# Output contract

Emit only schema-valid findings. `element.ax_ref` (or `testID`) is the target; `bbox` may be null. Never guess coordinates.

**Tiers (mechanical):** T1 visual polish → auto-fix. T2 additive UX → auto-fix. T3 structural → propose-only.

Laws 5, 6, and 13 apply verbatim:

5. **Inventory before absence.** A lens must list the visible controls BEFORE any "X is missing" claim (defeats hallucinated absence — same image judged missing/present/missing across runs in the documented experiment).
6. **Binding caps, not polite ones.** "MUST return at most 8 findings per screen. No exceptions." — polite phrasing ("be ruthless") was ignored on every measured run.
13. **Strip the framing.** Lens prompts contain the image, the rubric, and DESIGN.md — never a narrative of what the screen is "supposed" to be (framing leaks into findings: models report the controls they were told to expect).

# Worked examples

```json
{
  "screen": "orders",
  "state": "default",
  "platform": "web",
  "lens": "cognitive@1.0",
  "principle": "C4",
  "tier": "T2",
  "severity": "MAJOR",
  "observed": "Three same-weight text buttons sit in the header: Filter, Export, and Create order. None is visually primary.",
  "proposal": "Promote Create order to the primary button token and demote Filter and Export to ghost/text.",
  "element": { "ax_ref": "create-order", "bbox": null },
  "evidence": { "shot": "design/polish/runs/<ts>/shots/orders.default.png" },
  "fingerprint": "sha1(orders|C4|create-order)"
}
```

```json
{
  "screen": "home",
  "state": "default",
  "platform": "web",
  "lens": "cognitive@1.0",
  "principle": "C1",
  "tier": "T1",
  "severity": "MINOR",
  "observed": "The two nav items that go to list views are styled differently: Orders is a filled chip, Jobs is a plain text link.",
  "proposal": "Render both list-nav items with the same nav-link token.",
  "element": { "ax_ref": "nav-jobs", "bbox": null },
  "evidence": { "shot": "design/polish/runs/<ts>/shots/home.default.png" },
  "fingerprint": "sha1(home|C1|nav-jobs)"
}
```
