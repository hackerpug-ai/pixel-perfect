# Lens identity

- **name@version:** `states-coverage@1.0`
- **inputs:** the PNG of one screen×state; the AX/DOM snapshot (targeting only); the project's `DESIGN.md`; the screen's declared `states` list from the manifest.
- **outputs:** 0–8 findings in `skills/polish/findings-schema.json`.

# Rubric

Empty, loading, error, and long-content states must exist and be designed — not blank, not a raw exception string, not the default view with one word swapped.

- **EMPTY** — a designed empty state is visible (illustration or copy + a next action), not a vacant table.
- **LOADING** — a designed pending treatment (skeleton, spinner + label), not a frozen default.
- **ERROR** — a designed failure treatment with recovery, not an unstyled stack dump.
- **LONG-CONTENT** — long names / wrapped headings still fit (pairs with D3 when the capture includes an adversarial variant).

Tier: missing empty/loading/error treatments are **T2** (additive). A present-but-ugly state is **T1**. Removing a state or changing which route owns it is **T3**.

# Calibration — what NOT to file

- Do not file EMPTY on a screen whose declared states do not include `empty`.
- Do not file LOADING on a static marketing view with no async data.
- Do not file ERROR because an error *state capture* uses the word "error" — that is success.
- Do not file LONG-CONTENT unless the image actually shows overflow or the capture included a long-content variant.
- Inventory the visible controls before claiming a next action is missing.

# Output contract

Emit only schema-valid findings. Target with `element.ax_ref` / `testID`.

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
  "lens": "states-coverage@1.0",
  "principle": "EMPTY",
  "tier": "T2",
  "severity": "MAJOR",
  "observed": "Visible controls: page title, filter chip. The main region is a blank table with no empty copy and no Create action.",
  "proposal": "Add an empty-state block with a one-line explanation and a primary Create order button.",
  "element": { "ax_ref": "orders-main", "bbox": null },
  "evidence": { "shot": "design/polish/runs/<ts>/shots/orders.empty.png" },
  "fingerprint": "sha1(orders|EMPTY|orders-main)"
}
```

```json
{
  "screen": "orders",
  "state": "error",
  "platform": "web",
  "lens": "states-coverage@1.0",
  "principle": "ERROR",
  "tier": "T1",
  "severity": "MINOR",
  "observed": "The error state is a raw red paragraph of exception text with no retry control.",
  "proposal": "Replace the stack string with a short failure sentence and a Retry button using the primary token.",
  "element": { "ax_ref": "orders-error", "bbox": null },
  "evidence": { "shot": "design/polish/runs/<ts>/shots/orders.error.png" },
  "fingerprint": "sha1(orders|ERROR|orders-error)"
}
```
