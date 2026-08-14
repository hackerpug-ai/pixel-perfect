# Lens identity

- **name@version:** `composition@1.0`
- **inputs:** the PNG of one screen×state; the AX/DOM snapshot (targeting only); the project's `DESIGN.md`.
- **outputs:** 0–8 findings in `skills/polish/findings-schema.json`.

# Rubric

C/D violations are judged relative to the page's own visual language.

- **D1 Spacing Consistency** — even gaps between same-level elements (jittery card grid).
- **D2 Visual Balance** — weight distributed, not lopsided (content crammed to one side).
- **D3 Content-Container Fit** — no overflow/clipping/under-fill (text spilling out of a button).

Tier: D1/D3 are **T1**. D2 that needs a layout restructure (not a spacing tweak) is **T3**; a balance fix that is just padding/alignment is **T1**.

# Calibration — what NOT to file

- Do not file D1 on intentional exception spacing called out by DESIGN.md (e.g. a hero with a larger gap).
- Do not file D2 because a sidebar is narrower than the main column — that is a layout, not a lopsided accident.
- Do not file D3 for an ellipsis that is the designed truncation of a single-line title.
- Do not file overflow that is only visible if you imagine a longer string than the image shows.
- Do not use model-guessed pixel coordinates as the target.

# Output contract

Emit only schema-valid findings. Target with `element.ax_ref` / `testID`. `bbox` may be null.

**Tiers (mechanical):** T1 visual polish → auto-fix. T2 additive UX → auto-fix. T3 structural → propose-only.

Laws 5, 6, and 13 apply verbatim:

5. **Inventory before absence.** A lens must list the visible controls BEFORE any "X is missing" claim (defeats hallucinated absence — same image judged missing/present/missing across runs in the documented experiment).
6. **Binding caps, not polite ones.** "MUST return at most 8 findings per screen. No exceptions." — polite phrasing ("be ruthless") was ignored on every measured run.
13. **Strip the framing.** Lens prompts contain the image, the rubric, and DESIGN.md — never a narrative of what the screen is "supposed" to be (framing leaks into findings: models report the controls they were told to expect).

# Worked examples

```json
{
  "screen": "orders",
  "state": "empty",
  "platform": "web",
  "lens": "composition@1.0",
  "principle": "D3",
  "tier": "T1",
  "severity": "MAJOR",
  "observed": "The empty-state heading overflows the card's right edge; the last word is clipped.",
  "proposal": "Allow the heading to wrap and raise the card's min-height so the full sentence is visible.",
  "element": { "ax_ref": "orders-empty-heading", "bbox": null },
  "evidence": { "shot": "design/polish/runs/<ts>/shots/orders.empty.png" },
  "fingerprint": "sha1(orders|D3|orders-empty-heading)"
}
```

```json
{
  "screen": "home",
  "state": "default",
  "platform": "web",
  "lens": "composition@1.0",
  "principle": "D1",
  "tier": "T1",
  "severity": "MINOR",
  "observed": "The three metric cards sit in one row but the gaps are 8px, 20px, and 8px — same-level items with uneven spacing.",
  "proposal": "Set the row gap to the between-spacing token on all three cards.",
  "element": { "ax_ref": "metrics-row", "bbox": null },
  "evidence": { "shot": "design/polish/runs/<ts>/shots/home.default.png" },
  "fingerprint": "sha1(home|D1|metrics-row)"
}
```
