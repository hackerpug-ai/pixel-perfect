# Lens identity

- **name@version:** `adherence@1.0`
- **inputs:** the PNG of one screen×state; the AX/DOM snapshot (targeting only); the project's generated `DESIGN.md`, especially the **Do's and Don'ts** section.
- **outputs:** 0–8 findings in `skills/polish/findings-schema.json`.

# Rubric

Judge the image against the project's `DESIGN.md`, not against generic taste.

- **DESIGN-DO** — a Do from DESIGN.md is visibly broken (e.g. "Do keep a single accent" but two competing accents appear).
- **DESIGN-DONT** — a Don't from DESIGN.md is visible in the image (e.g. "Don't hardcode a second brand color").
- Token violations that are also visual (wrong primary, wrong type role) are **DESIGN-DO** at **T1**.

Conformance is a floor, never a score. Do not maximize token coverage.

Tier: token/type/space violations are **T1**. Missing a pattern the Do's require and that can be added without a flow change is **T2**. Changing IA to satisfy a Don't is **T3**.

# Calibration — what NOT to file

- Do not file against a rule that is not in this project's DESIGN.md.
- Do not file "generic best practice" that the Do's and Don'ts never stated.
- Do not treat a warning from `design-md.mjs --lint` as a visual finding unless the image shows it.
- Do not invent a Do by paraphrasing the Overview.
- Inventory visible controls before claiming a required control from the Do's is missing.

# Output contract

Emit only schema-valid findings. Quote the Do/Don't you are applying in `observed`. Target with `element.ax_ref` / `testID`.

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
  "lens": "adherence@1.0",
  "principle": "DESIGN-DONT",
  "tier": "T1",
  "severity": "MAJOR",
  "observed": "DESIGN.md Don't: \"Don't introduce a second accent color.\" The page uses the ink primary on Create and a separate bright blue on Filter.",
  "proposal": "Restyle Filter to the secondary/ghost treatment so only Create uses the accent.",
  "element": { "ax_ref": "filter", "bbox": null },
  "evidence": { "shot": "design/polish/runs/<ts>/shots/home.default.png" },
  "fingerprint": "sha1(home|DESIGN-DONT|filter)"
}
```

```json
{
  "screen": "orders",
  "state": "default",
  "platform": "web",
  "lens": "adherence@1.0",
  "principle": "DESIGN-DO",
  "tier": "T1",
  "severity": "MINOR",
  "observed": "DESIGN.md Do: \"Do use semantic tokens for color.\" The status chip is a raw lime fill that does not match any color token swatch in DESIGN.md.",
  "proposal": "Map the chip to the success state token (or the muted text token if no success token exists).",
  "element": { "ax_ref": "status-open", "bbox": null },
  "evidence": { "shot": "design/polish/runs/<ts>/shots/orders.default.png" },
  "fingerprint": "sha1(orders|DESIGN-DO|status-open)"
}
```
