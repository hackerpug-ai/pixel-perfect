#!/bin/bash
# _preflight.sh — Phase 0 concept smoke-render + per-frame reference extraction.
#
# design-deconstruct staged tooling. Copied into <output>/_preflight.sh.
#
#   bash _preflight.sh <concept.html> [outdir]     # default outdir: reference/
#
# WHY: bundled concept exports (Claude Design "standalone HTML") resolve every
# asset at runtime via an inline JS bundler (base64 → blob: URLs). A render
# captured before the bundler settles is an empty page — and without this
# preflight that is discovered at Phase 5, the most expensive possible moment.
#
# WHAT IT DOES (deterministic):
#   1. Renders the RAW concept with a generous virtual-time budget
#      (VTB env, default 15000ms) to <outdir>/concept-full.png.
#   2. BLANK CHECK — fails closed if the render has near-zero pixel variance
#      (the empty-page signature), printing the blob:/asset-id diagnosis.
#   3. FRAME EXTRACTION — measures each frame's bounding rect FROM THE DOM
#      (a wrapper page iframes the concept and reads getBoundingClientRect for
#      FRAME_SELECTOR, default ".fr" — the Claude Design frame class) and crops
#      <outdir>/frame-NN.png from the full render in reading order. Pixel
#      heuristics are deliberately NOT used: real decks put cream phones on a
#      cream page with shadow-filled gaps, which defeats background detection.
#      No selector match → the full render is the single reference (warned).
#      These reference PNGs feed the OPTIONAL vision-fidelity pass; the three
#      deterministic audit axes never depend on them.
#
# Env:
#   VTB=<ms>            virtual-time budget (default 15000)
#   CHROME=<path>       Chrome binary override
#   FRAME_SELECTOR=<css> frame elements in the concept DOM (default ".fr")
#
# Exit: 0 = render is live (frame count printed)
#       1 = BLANK RENDER — do not proceed to any phase; fix the settle first.
set -u
CONCEPT="$1"
OUT="${2:-reference}"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
VTB="${VTB:-15000}"
FRAME_SELECTOR="${FRAME_SELECTOR:-.fr}"
DIR="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$DIR/$OUT"
ABS="$(cd "$(dirname "$CONCEPT")" && pwd)/$(basename "$CONCEPT")"
FULL="$DIR/$OUT/concept-full.png"

# 1 ── full render (window width 1440 is the coordinate system the rects map onto)
"$CHROME" --headless=new --disable-gpu --hide-scrollbars \
  --virtual-time-budget="$VTB" --window-size=1440,24000 \
  --screenshot="$FULL" "file://$ABS" 2>/dev/null

# 2 ── blank check (fail closed before any phase runs)
python3 - "$FULL" <<'PY' || exit 1
import sys, os
from PIL import Image, ImageStat
full = sys.argv[1]
if not os.path.exists(full):
    print("PREFLIGHT ✗ Chrome produced no screenshot — check CHROME path / file URL"); sys.exit(1)
im = Image.open(full).convert('RGB')
var = sum(ImageStat.Stat(im).stddev) / 3.0
if var < 4.0:
    print(f"PREFLIGHT ✗ BLANK RENDER (pixel stddev {var:.1f} over {im.size[0]}x{im.size[1]})")
    print("  The concept resolves assets at runtime (JS bundler → blob: URLs) and the")
    print("  capture happened before it settled. Raise VTB (e.g. VTB=30000), verify the")
    print("  file opens in a real browser, or pre-rewrite asset-id srcs to real paths.")
    sys.exit(1)
PY

# 3 ── frame rects from the DOM (wrapper page + --dump-dom; no pixel heuristics)
WRAP="$DIR/$OUT/_rects.html"
cat > "$WRAP" <<EOF
<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0}iframe{width:1440px;height:24000px;border:0;display:block}</style></head>
<body><iframe id="f" src="file://$ABS"></iframe><pre id="out"></pre>
<script>
document.getElementById('f').addEventListener('load', () => {
  setTimeout(() => {
    try {
      const doc = document.getElementById('f').contentDocument;
      const els = doc.querySelectorAll('$FRAME_SELECTOR');
      const rects = [...els].map(e => { const r = e.getBoundingClientRect();
        return {x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height)}; });
      document.getElementById('out').textContent = 'RECTS::' + JSON.stringify(rects);
    } catch (e) { document.getElementById('out').textContent = 'RECTS::[]'; }
  }, 3000);
});
</script></body></html>
EOF
"$CHROME" --headless=new --disable-gpu --allow-file-access-from-files \
  --virtual-time-budget="$VTB" --dump-dom "file://$WRAP" 2>/dev/null \
  | grep -o 'RECTS::\[[^<]*' | head -1 | sed 's/^RECTS:://' > "$DIR/$OUT/_rects.json"
rm -f "$WRAP"

# 4 ── crop each rect from the full render, reading order (rows, then left→right)
python3 - "$FULL" "$DIR/$OUT" <<'PY'
import sys, os, json, glob
from PIL import Image, ImageStat
full, out = sys.argv[1], sys.argv[2]
im = Image.open(full).convert('RGB'); W, H = im.size
var = sum(ImageStat.Stat(im).stddev) / 3.0
try:
    rects = json.load(open(os.path.join(out, '_rects.json')))
except Exception:
    rects = []
for f in glob.glob(os.path.join(out, 'frame-*.png')): os.remove(f)
if not rects:
    print(f"PREFLIGHT ✓ live render ({W}x{H}, stddev {var:.1f}) — 0 frame rects for the")
    print("  configured FRAME_SELECTOR; concept-full.png is the single reference.")
    print("  Set FRAME_SELECTOR to the concept's frame element class and re-run.")
    raise SystemExit(0)
med_h = sorted(r['h'] for r in rects)[len(rects) // 2] or 1
rects.sort(key=lambda r: (r['y'] // max(1, med_h // 2), r['x']))
PAD = 6
n = 0
for r in rects:
    if r['w'] < 40 or r['h'] < 40: continue
    n += 1
    im.crop((max(0, r['x'] - PAD), max(0, r['y'] - PAD),
             min(W, r['x'] + r['w'] + PAD), min(H, r['y'] + r['h'] + PAD))
            ).save(os.path.join(out, f"frame-{n:02d}.png"), optimize=True)
print(f"PREFLIGHT ✓ live render ({W}x{H}, stddev {var:.1f}) — {n} reference frame(s) → {out}/")
PY
