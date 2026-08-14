# Lens identity

- **name@version:** `anti-slop@1.0`
- **inputs:** the PNG of one screen×state; the AX/DOM snapshot (targeting only); the project's `DESIGN.md`.
- **outputs:** 0–8 findings in `skills/polish/findings-schema.json`.

# Rubric

Generic-template tells. The page should look like *this* product, not a default dashboard kit.

- **SLOP-GRID** — identical card grids with even, timid gaps and no committed hierarchy.
- **SLOP-CTA** — default-blue (or default-purple) CTAs that ignore the DESIGN.md accent.
- **SLOP-PALETTE** — evenly-spread, low-commitment palette; every surface a slightly different gray, no ink/accent decision.
- **SLOP-DIRECTION** — no committed direction: every weight medium, every radius the default, nothing the page is "about."

Tier: swapping a default-blue CTA or tightening a grid to the project's tokens is **T1**. Adding a missing distinctive pattern the DESIGN.md already names is **T2**. A full restyle of IA is **T3**.

# Calibration — what NOT to file

- Do not file SLOP-GRID on a table or list that is supposed to be uniform rows.
- Do not file SLOP-CTA if the button already uses the DESIGN.md primary token, even if that token happens to be blue.
- Do not file SLOP-PALETTE because a disabled state is muted — muted is a role.
- Do not file SLOP-DIRECTION on a settings form whose job is quiet density.
- Do not punish restraint that DESIGN.md asked for ("minimal", "high-contrast neutrals").
- Inventory before claiming a distinctive element is missing.

# Output contract

Emit only schema-valid findings. Target with `element.ax_ref` / `testID`. Tie `observed` to what is in the image, not to a story about the brand.

**Tiers (mechanical):** T1 visual polish → auto-fix. T2 additive UX → auto-fix. T3 structural → propose-only.

Laws 5, 6, and 13 apply verbatim:

5. **Inventory before absence.** A lens must list the visible controls BEFORE any "X is missing" claim (defeats hallucinated absence — same image judged missing/present/missing across runs in the documented experiment).
6. **Binding caps, not polite ones.** "MUST return at most 8 findings per screen. No exceptions." — polite phrasing ("be ruthless") was ignored on every measured run.
13. **Strip the framing.** Lens prompts contain the image, the rubric, and DESIGN.md — never a narrative of what the screen is "supposed" to be (framing leaks into findings: models report the controls they were told to expect).

# Worked examples

```json
{
  "screen": "home",
  "state": "default",
  "platform": "web",
  "lens": "anti-slop@1.0",
  "principle": "SLOP-CTA",
  "tier": "T1",
  "severity": "MAJOR",
  "observed": "The only filled button is a saturated default blue that does not match the ink/clay tokens in DESIGN.md.",
  "proposal": "Paint the primary button with the DESIGN.md primary (and on-primary) tokens.",
  "element": { "ax_ref": "create-order", "bbox": null },
  "evidence": { "shot": "design/polish/runs/<ts>/shots/home.default.png" },
  "fingerprint": "sha1(home|SLOP-CTA|create-order)"
}
```

```json
{
  "screen": "orders",
  "state": "default",
  "platform": "web",
  "lens": "anti-slop@1.0",
  "principle": "SLOP-GRID",
  "tier": "T1",
  "severity": "POLISH",
  "observed": "Six identical white cards sit in a 3×2 grid with the same shadow, the same 16px padding, and the same medium title weight. Nothing is primary.",
  "proposal": "Break the grid: make the first card a featured span and raise its title to the h1 token; keep the rest as secondary rows.",
  "element": { "ax_ref": "orders-grid", "bbox": null },
  "evidence": { "shot": "design/polish/runs/<ts>/shots/orders.default.png" },
  "fingerprint": "sha1(orders|SLOP-GRID|orders-grid)"
}
```
