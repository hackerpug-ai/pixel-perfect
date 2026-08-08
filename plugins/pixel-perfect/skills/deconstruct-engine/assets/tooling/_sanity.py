#!/usr/bin/env python3
# _sanity.py — render-sanity (the third governance axis, alongside _audit.mjs).
#
# design-deconstruct staged tooling. Copied into <output>/_sanity.py.
#
# A dark*.png must read DARK at its top band; a light*.png must read LIGHT.
# Catches the two render failures token/link audits can't see:
#   - unstyled render (404 CSS → white page) → a dark.png reads bright → flagged
#   - wrong-theme render (light tokens under a dark file) → flagged
#
# Theme-agnostic: uses a luma threshold on the top band, not exact canvas RGB,
# so it works for any concept's palette.
#
#   python3 _sanity.py <layer-dir-or-.>
import sys, os, glob
from PIL import Image

base = sys.argv[1] if len(sys.argv) > 1 else '.'
luma = lambda p: 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]
bad = 0; n = 0
for png in sorted(glob.glob(os.path.join(base, '**', '*.png'), recursive=True)):
    bn = os.path.basename(png)
    theme = 'light' if bn.startswith('light') else ('dark' if bn.startswith('dark') else None)
    if theme is None:  # skip non-theme artifacts (e.g. a tokens index)
        continue
    im = Image.open(png).convert('RGB'); w, h = im.size; px = im.load()
    ys = [y for y in (20, 40, 80) if y < h] or [h // 2]
    xs = [w // 6, w // 3, w // 2, 2 * w // 3, 5 * w // 6]
    vals = [luma(px[x, y]) for y in ys for x in xs]
    mean = sum(vals) / len(vals); n += 1
    if theme == 'dark' and mean > 110:
        bad += 1; print(f"✗ DARK too bright (unstyled/wrong-theme?) mean={mean:.0f}  {png}")
    if theme == 'light' and mean < 130:
        bad += 1; print(f"✗ LIGHT too dark (wrong-theme?) mean={mean:.0f}  {png}")
print(f"render-sanity: {n} themed PNG checked · {bad} suspicious")
sys.exit(1 if bad else 0)
