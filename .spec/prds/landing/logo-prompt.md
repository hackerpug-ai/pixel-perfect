---
title: Logo prompt — pixel-perfect "PP" plates
source: .spec/prds/landing/strategy.md §10.4; design/concepts/pixel-perfect.html (Fig. 1 plates, headline registration)
date: 2026-09-29
status: ready to paste
---

# Logo prompt

Paste everything below the line into Claude Design (or any image/logo model). It asks for two P's drawn as the same stacked plates Fig. 1 uses, with the registration/CMYK treatment as a variant. Decision D5 (retire the amber banner) is assumed. The existing registration-target mark stays available as a fallback favicon.

---

Design a logo for **pixel-perfect**, an open-source agent skill that turns a design mockup into a verified, composable component system. The mark is **two letter P's drawn as stacked plates**, in the exact style of the product's "separation" figure, where a mockup is split into five thin layers (tokens, atoms, molecules, organisms, screens) and each layer must **register** with the one below it. The two P's are the two acts of the product: *build it* and *grow it*. When they line up, they read as one P. When they separate, they read as PP.

## 1. The plate style to match

Reproduce this construction, which already exists in the product's design:

- **Plates** are thin, square, flat sheets stacked along one axis with even spacing, like glass plates in a rack. Each plate is a **1 px ink outline** with a nearly transparent fill (the page color at about 12% opacity). The bottom plate is solid.
- The stack is viewed **tilted**: the plates are rotated about 58° back on the X axis and 45° on the Z axis, so each plate reads as a rhombus and the stack reads as a short isometric column. The gap between plates is about one sixth of the plate's edge length.
- Content sits *on* the plates and is never distorted: the glyphs are flat shapes lying on their plate.
- Guide lines are **1 px dashed magenta**. Reference dots are **magenta, 7 px, circular**. Labels are IBM Plex Mono, small, sentence case.
- Nothing is decorative. Every line is either a plate edge, a glyph, or a registration guide.

## 2. The mark

- Two P glyphs, one per plate, in **Anybody** (variable; width about 112%, weight 800) or a hand-drawn equivalent: wide, heavy, geometric, with a **square counter** (the bowl's inner space is a square, not a circle).
- The rear plate carries the first P in **cyan**. The front plate carries the second P in **ink** (black in light mode, off-white in dark mode). Where they overlap in the flat view, the cyan shows through the ink using **multiply** in light mode and **screen** in dark mode, exactly as ink behaves on paper and light on a screen.
- The two P's are **offset by one registration step**: the front P sits up and to the right of the rear one by about 12% of the cap height, so both stems and both bowls are readable. From the tilted view, the offset comes from the plate gap, not from moving the glyph.
- **One magenta square pixel** sits in the front P's counter. It is the one pixel that registered. It is the only magenta in the mark.
- No gradients, no shadows, no bevels, no 3D shading beyond the plate outlines. Depth comes from the stack geometry only.

## 3. Variants to explore

Produce all three, then recommend one:

- **A. Stacked plates (primary).** The full construction above: two rhombus plates, tilted, each carrying its P, magenta pixel in the front counter.
- **B. Registration, flat.** No plates. The two P's straight on, the cyan P offset behind the ink P with the blend, plus the magenta pixel. This is the mark's own headline effect: a C plate and a K plate slightly out of register.
- **C. Registered.** The two P's exactly aligned, so only one P is visible, with a thin cyan halo on the left and bottom edges where the rear plate peeks out by 1 px, and the magenta pixel in the counter. This is the "assembled" state, the same way the figure's plates can be assembled into one mockup.

The favicon and any use below 24 px must be variant B or C. Variant A is for the site header, the README banner, and the social image.

## 4. Color

| Token | Light | Dark |
|---|---|---|
| ink | `#111316` | `#ECEDE8` |
| cyan | `#0096D1` | `#29C1F0` |
| magenta | `#E0007A` | `#FF3D9E` |
| paper (background) | `#F3F4F1` | `#0D0F12` |
| blend | multiply | screen |

Also deliver a **single-color** version (ink only; the rear P becomes a 1 px outline, the pixel becomes a filled square) for print, stickers, and monochrome contexts. Yellow is never used in the mark.

## 5. Lockup

- Wordmark: **pixel-perfect**, all lowercase, hyphen kept, in Anybody at width about 105% and weight 700, ink color. The hyphen is the one place the mark's geometry can echo: make it a short square-ended dash, not a round one.
- Horizontal lockup: mark on the left, wordmark to the right, baseline aligned to the front P's baseline, gap equal to the mark's stem width.
- Stacked lockup: mark centered above the wordmark for square avatars.
- Clear space: half the mark's height on all sides.

## 6. Constraints

- Must read at 16 px (favicon), 28 px (nav), 64 px (avatar), and 1200 px (banner). Check each size; simplify the plate outlines rather than let them fill in.
- Must read in both themes on their paper colors and on the code panel color `#14171B`.
- No mascot, no pixel-art texture, no CRT glow, no retro-game cues. The product is not a game.
- No amber, no orange. The previous banner was amber pixel art and is being retired.
- Keep the plate outlines at exactly 1 px at 28 px and scale the stroke proportionally above that.

## 7. Deliverables

1. Variants A, B, and C as SVG, light and dark, with the blend mode implemented (`mix-blend-mode`) and a fallback flat fill for renderers that don't support it.
2. Single-color ink version of the chosen variant.
3. Horizontal and stacked lockups, light and dark.
4. Favicon set: 16, 32, 64, and 180 px, from variant B or C.
5. A 1200×630 social image: variant A at left on paper, the wordmark and the line "Your mockup is a picture. Ship the system inside it." at right, with crop marks in the corners.
6. A README banner, 1280×320, same construction, with the plates separated a little wider than in the mark.
7. A one-page sheet showing the construction grid: plate angle, gap, glyph offset, pixel position, clear space.
