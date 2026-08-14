# Lens identity

- **name@version:** `consistency@1.0`
- **inputs:** the PNG of one screen×state plus the other captured screens in the same run (cross-screen); the AX/DOM snapshot (targeting only); the project's `DESIGN.md`.
- **outputs:** 0–8 findings in `skills/polish/findings-schema.json`.

# Rubric

- **CROSS-SCREEN** — the same control is styled the same everywhere (primary button, nav, list row, empty-state pattern).
- **C1 Similarity** applies inside one screen; this lens applies it *across* screens.

Tier: token/style drift of an existing control is **T1**. A screen that is missing a shared pattern the others have (and can add without a flow change) is **T2**. Replacing one screen's IA to match another is **T3**.

# Calibration — what NOT to file

- Do not file CROSS-SCREEN because a destructive button is redder than the primary button — that is a role difference.
- Do not file a screen that is allowed a documented exception in DESIGN.md.
- Do not file type-scale differences that match the role (page title vs section title).
- Do not compare a loading skeleton to the default state's finished chrome.
- Inventory each screen's visible controls before claiming one is missing a shared control.

# Output contract

Emit only schema-valid findings. Target with `element.ax_ref` / `testID`. Name the other screen in `observed`.

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
  "lens": "consistency@1.0",
  "principle": "CROSS-SCREEN",
  "tier": "T1",
  "severity": "MAJOR",
  "observed": "Pay now is a full-width text link. On Orders, Create order is a filled primary button using the accent token.",
  "proposal": "Restyle Pay now to the same primary button token used by Create order.",
  "element": { "ax_ref": "pay-now", "bbox": null },
  "evidence": { "shot": "design/polish/runs/<ts>/shots/checkout.default.png" },
  "fingerprint": "sha1(checkout|CROSS-SCREEN|pay-now)"
}
```

```json
{
  "screen": "home",
  "state": "empty",
  "platform": "web",
  "lens": "consistency@1.0",
  "principle": "CROSS-SCREEN",
  "tier": "T2",
  "severity": "MINOR",
  "observed": "Visible controls: title, nav. Home empty is a blank main. Orders empty uses a heading + primary action pattern.",
  "proposal": "Reuse the Orders empty-state pattern (heading + primary action) on Home empty.",
  "element": { "ax_ref": "home-main", "bbox": null },
  "evidence": { "shot": "design/polish/runs/<ts>/shots/home.empty.png" },
  "fingerprint": "sha1(home|CROSS-SCREEN|home-main)"
}
```
