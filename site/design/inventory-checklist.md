# Inventory checklist — the component floor

Human-owned floor for `pixel-perfect:build` Phase 4a (red-hat review 2026-09-29, CHG-002). It was assembled by looking at full-page renders of the design exports at 1440 and 390 px in both themes, not by reading markup.

**Rule:** Phase 4a may not confirm `design/inventory.json` while any atom, molecule, or organism row below has no matching inventory entry. If the inventory chooses a different name, rename the row here in the same commit so the mapping stays visible. This is a floor, not the list: the inventory may add more, but never fewer.

Check (exact match on inventory `name` fields; exits 1 and lists any row the inventory lacks):

```bash
node -e 'const fs=require("fs");const names=new Set();(function walk(o){if(Array.isArray(o))o.forEach(walk);else if(o&&typeof o==="object"){if(typeof o.name==="string")names.add(o.name.toLowerCase());Object.values(o).forEach(walk)}})(require("./site/design/inventory.json"));const rows=fs.readFileSync("site/design/inventory-checklist.md","utf8").split("\n").filter(l=>/^\| (atom|molecule|organism) /.test(l)).map(l=>l.split("|")[2].trim());const miss=rows.filter(r=>!names.has(r.toLowerCase()));console.log(miss.length?"missing: "+miss.join(", "):"all "+rows.length+" rows present");process.exit(miss.length?1:0)'
```

Slice keys refer to the review's renders: `L1440-N` / `L390-N` are the landing page, light, slice N; `D` means dark; `CS` is the component sheet; `SP` is the social preview; `U1`/`U2` are the uploads.

## Tokens (recorded in `manifest.json` → `tokens`)

| Layer | Name | What | Seen in |
|---|---|---|---|
| token | Color | paper, sheet, ink, muted, line, cyan, cyan-ink, magenta, magenta-ink, yellow, mark-fg, stripe, blend — both themes | Landing:23-24, CS |
| token | CodeColor | code-bg, code-fg, code-comment, code-rule, code-control-border, code-key, code-value, code-success | L1440-3, CS |
| token | Drift | the drifted card's off-system gray, used only there | L1440-2 |
| token | Type | Anybody 700/800 at wdth 100–118%, Libre Franklin 400/500/600, IBM Plex Mono 400/500, five display clamp sizes | CS |
| token | Radius / Layout / Motion | radius 2/3/4/5/999; max-width 1200; gutters 32/16; breakpoint 720; see `manifest.motion` | Landing:32-36 |

## Atoms

| Layer | Name | Variants and states | Seen in |
|---|---|---|---|
| atom | Button | primary, secondary, small-on-code; label Copy → Copied ✓ / Selected; hover and focus per manifest ui_states | L1440-1/5/6/7, CS |
| atom | ThemeToggle | dot + "Dark" / "Light" label | L1440-1, D1440-1 |
| atom | TextLink | magenta, underlined, external ↗; hover | L1440-1/7 |
| atom | NavLink | header navigation link; hover, current | L1440-1 |
| atom | Logo | mark + wordmark lockup; mark A (header), mark C (footer), light/dark | L1440-1/7 |
| atom | CropMark | corner crop marks framing the proof sheet | L1440-1, D1440-1 |
| atom | RegistrationTarget | small crosshair marker on slider panes and figures | L1440-1 |
| atom | ColorStrip | eight-swatch color control strip, per theme tints | L1440-1, D1440-1, CS |
| atom | SlugLine | mono caps job line ("PIXEL-PERFECT · V9 · PROOF SHEET · date") | L1440-1, CS |
| atom | PlateLabel | mono caps eyebrow / plate label ("DESIGN FRAME", "APPROVED", "STEP 1 · …") | L1440-1/2/3 |
| atom | ProofMark | numbered magenta proofreader badge 1–4 | L1440-2, CS |
| atom | VersionPill | filled and outline pills (v9.1, v9.0, v8.4) | L1440-4 |
| atom | Stat | number + label | L1440-4 |
| atom | InlineCode | mono inline code run | L1440-3/5 |
| atom | PlayButton | demo video play control | L1440-4 |
| atom | SliderHandle | proof slider's draggable handle (◂▸); focus-visible | L1440-1 |
| atom | Tab | selected / unselected; focus-visible | L1440-6, CS |
| atom | DisclosureIcon | FAQ "+" and its open state | L1440-6, CS |
| atom | PlateText | display text with cyan/magenta/yellow plate copies (hero and close headlines) | L1440-1/7, SP |

## Molecules

| Layer | Name | Variants and states | Seen in |
|---|---|---|---|
| molecule | CopyBlock | card with helper line ("Paste into any of the six agents"), bare one-line row; copied state | L1440-1/5, L390-1, CS |
| molecule | CommandRow | dark numbered command row with small copy button | L1440-6, L390-6 |
| molecule | CodePanel | filename header, "Example output" tag, syntax-colored body; clips at 390 | L1440-3/4, CS |
| molecule | StepCard | step on the progress rail (label, title, command, output) | L1440-3 |
| molecule | CopyBlock | the drawn $24 plan card was placeholder content (placeholder register); the real install card (CopyBlock) fills its slot in the slider, the drift comparison, and the social image (owner's decision 2026-09-30) | L1440-1/2 |
| molecule | ProofNote | numbered note matching a ProofMark | L1440-2, CS |
| atom | PrincipleCard | one of the four principles | L1440-2 |
| molecule | GrowCard | evolve / refine / add-platform card with cascade line | L1440-4 |
| molecule | ThreadRow | YOU / AGENT exchange line | L1440-4 |
| molecule | MetaStrip | MIT · by · View source · six agents · frameworks; wraps to 3 rows at 390 | L1440-1, L390-1 |
| molecule | StatGrid | 4+1 columns at 1440, 3+2 at 390 | L1440-4, L390-4 |
| molecule | FaqItem | closed and open | L1440-6, CS |
| atom | TabNote | per-tab note and warning (Codex duplicate installs, Cursor symlinks) | export markup Landing:369-370; open with #install-codex, #install-cursor (manifest ui_states.install_tabs) |
| molecule | TouchList | "what it touches" column (reads / writes / runs) | L1440-6 |
| molecule | ScanBox | dashed third-party scan box | L1440-6 |
| molecule | FigureCaption | "Fig. N" caption line | L1440-1/5 |
| molecule | ChangelogMini | the assembled Changelog page in Grow it | L1440-4 |
| molecule | DesignMdCard | the generated DESIGN.md card | L1440-5 |
| molecule | SectionStrip | mobile slug-line section nav under the header (manifest ui_states.mobile_header) | designed in the manifest |
| molecule | CopyNextStep | the 'Next: … /pixel-perfect:init' line, always shown under the Install tabs (decided at B-inv) | L1440-6 |

## Organisms

| Layer | Name | Variants and states | Seen in |
|---|---|---|---|
| organism | SiteHeader | sticky; at ≤720 the logo, an Install link, and an icon-only toggle (manifest ui_states.mobile_header) | L1440-1, L390-1 |
| organism | Hero | slug line, headline (primary / alternate), lede, install stack, meta strip, slider + Fig. 1 | L1440-1, L390-1 |
| organism | ProofSlider | design frame vs built component; split 0–100 | L1440-1, L390-1, SP |
| organism | LayerStack | Fig. 1: flat → tilted → separated; hidden at ≤720 | L1440-1, D1440-1, U1, U2 |
| organism | DriftComparison | approved vs drifted card with proof notes | L1440-2, L390-2 |
| organism | PrinciplesGrid | four principle cards | L1440-2, L390-2 |
| organism | StepsTimeline | four steps on the magenta rail | L1440-3, L390-3 |
| organism | DemoStats | demo video + stat grid | L1440-4, L390-4 |
| organism | EvolveThread | scripted evolve thread + changelog mini page | L1440-4, L390-4 |
| organism | DesignMdPromo | DESIGN.md section | L1440-5, L390-5 |
| organism | InstallSection | paste line, npx line, six tabs with panels, stability note, touch list, scan box; tabs wrap at 390 | L1440-5/6, L390-6 |
| organism | FaqList | eight FAQ items | L1440-6, L390-6 |
| organism | CloseCta | close headline (plate effect) + install button + GitHub link | L1440-7, L390-7 |
| organism | SiteFooter | footer with mark C | L1440-7, L390-7 |
| organism | SocialCard | 1200×630 social image, rendered to og.png | SP |

## Screens

| Layer | Name | States | Seen in |
|---|---|---|---|
| screen | Home `/` | default, dark, install-claude, install-codex, install-cursor, install-grok, install-opencode, install-pi, faq-open, copied, headline-alternate — at 1440 and 390 | all |
