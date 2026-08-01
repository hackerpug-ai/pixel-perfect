# TOKEN-AUDIT

The governance gate run at the end of every phase (after the subagent returns and
the orchestrator has split + rendered, before TaskUpdate → completed). **Three axes**,
all blocking, all recursive. Implemented by the staged `_audit.mjs` (axes 1–2) and
`_sanity.py` (axis 3) — this doc defines the policy.

```bash
node _audit.mjs <layer> [component]     # axis 1 (token purity) + axis 2 (link resolution)
python3 _sanity.py <layer-dir>          # axis 3 (render sanity)
```

Both recurse arbitrary depth, so nested view state folders
(`views/rig/arena-terminal/timeout/dark.html`) are covered.

## AXIS 1 — TOKEN PURITY

The allowlist is the set of **Tier-2 semantic cssVars** from
`tokens/semantic-tokens.json` (read at runtime). A component may reference ONLY those
(plus its own in-file `--local` custom props). Rejected:

| Rule | Reason |
|---|---|
| `#rgb` / `#rrggbb` / `#rrggbbaa` hex literal | colors must be `var(--{semantic})` |
| `rgb()` / `rgba()` / `hsl()` / `hsla()` literal | same |
| `font-size: <numeric>` (no `var`) | use `var(--text-size-*)` |
| `font-weight: <3-digit>` (no `var`) | use `var(--font-weight-*)` |
| `line-height: <numeric>` (no `var`, not 0/normal/inherit) | use `var(--leading-*)` |
| `letter-spacing: <numeric>em` (no `var`, not 0/normal) | use `var(--tracking-*)` |
| raw `<n>px` in padding/margin/gap (not 0/1/2/3, not in `var()/calc()/clamp()`) | use `var(--space-*)` |
| `var(--_x)` — a Tier-1 primitive leak | components consume Tier-2 only |
| `var(--x)` not in the allowlist and not an in-file local | bare-concept / undefined token |

**Allowed:** `1px/2px/3px` hairlines and `0`; `%`/`ch`/`vw` content-adaptive units;
`aspect-ratio` ratios; values inside `var()`/`calc()`/`clamp()`; SVG path/viewBox
geometry; `stroke-width`. Comment bodies are blanked before scanning, so
documentation like `/* maps --fire → --domain-fire */` never false-positives.

> Removed in the per-theme model: the old "dual-theme preview-chrome literal allowed"
> exception. Files are now single-theme (`dark.html`/`light.html`) — there is no
> in-document `[data-theme] { background: #… }` pinning, so no literal exception.

## AXIS 2 — LINK RESOLUTION

A mock only "works" if its stylesheets load. `_audit.mjs` flags:
- `no-stylesheet-links` — the file links no local stylesheet at all.
- `broken-stylesheet-link` — a `<link href>` that does not resolve on disk.

This is the structural guard for the link-depth bug class. Depth is computed by
`_head.mjs` on split, so a broken link means a basename/staging error, not a
hand-count mistake — but the gate catches it regardless.

## AXIS 3 — RENDER SANITY

`_sanity.py` opens every `dark*.png` / `light*.png` and checks the top band's luma:
a `dark.*` that reads bright (unstyled / wrong-theme) or a `light.*` that reads dark
is flagged. Catches the failures axes 1–2 cannot: a broken render or a theme applied
to the wrong file.

## REJECT-AND-REGEN POLICY

```
Run all three axes for the phase's layer.
IF any axis reports violations:
  Group by file. Re-dispatch the offending component's subagent with:
    "AUDIT FAILURE: the following must resolve to Tier-2 tokens / the render is
     wrong-theme / a stylesheet link is broken. Fix and re-author _src.html. If a
     needed token does not exist, emit TOKEN_GAP at the top of your reply."
    + per-file numbered offending lines (from _audit.mjs output).
  Orchestrator then re-runs `node _process.mjs <layer> <component>`.
  Cap at 2 re-dispatches per component; after that log to manifest.json "gaps"
  and surface in the final report.
```

A clean phase = all three axes pass for every file in the layer AND any `TOKEN_GAP:`
escapes were resolved (alias added to `build-tokens.mjs`, rebuilt, re-verified).

## WHEN TO EXTEND TOKENS vs. REJECT-AND-REGEN

- Subagent emitted `TOKEN_GAP:` → orchestrator adds the alias (and any primitive) to
  `tokens/build-tokens.mjs`, re-runs the generator, continues.
- Axis 1 found a literal with no accompanying `TOKEN_GAP:` → regression; re-dispatch.
