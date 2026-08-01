#!/bin/bash
# _render.sh — render PDF + PNG for EVERY *.html under a layer (recurses nested
# state folders), trimming each PNG against the canvas implied by its theme.
#
# design-deconstruct staged tooling. Copied into <output>/_render.sh.
#
# The THEME-PAIR contract means each leaf folder holds dark.html + light.html;
# this renders dark.* and light.* separately (one theme per artifact — never
# both crammed in one image). The trim canvas is read PER THEME from the emitted
# tokens (tokens/theme.{dark,light}.json) — NOT hardcoded — so it generalizes to
# any concept's palette.
#
# Usage: _render.sh <layer> [subpath]
#   _render.sh atoms                  # every atom gallery (desktop only)
#   _render.sh atoms button           # ONE component subtree (used by _process.mjs)
#   _render.sh views                  # full pages: desktop + 375px mobile
#   _render.sh views rig/timeout      # one nested view-state leaf
#
# Env:
#   VTB=<ms>     virtual-time budget per shot (default 7000). Raise for documents
#                that resolve assets at runtime (JS bundlers, blob: URLs) — see
#                RENDER-ARTIFACTS.md § settle.
#   CHROME=<path> Chrome binary override.
set -u
LAYER="$1"
SUBPATH="${2:-}"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
VTB="${VTB:-7000}"
DIR="$(cd "$(dirname "$0")" && pwd)"
SCOPE="$DIR/$LAYER${SUBPATH:+/$SUBPATH}"
if [ "$LAYER" = "views" ]; then CW=1320; CH=9000; else CW=1320; CH=5200; fi
shoot(){ "$CHROME" --headless=new --disable-gpu --hide-scrollbars --virtual-time-budget="$VTB" "$@" 2>/dev/null; }
n=0
while IFS= read -r html; do
  d="$(dirname "$html")"; stem="$(basename "$html" .html)"
  shoot --no-pdf-header-footer --print-to-pdf="$d/$stem.pdf" "file://$html"
  shoot --window-size="$CW,$CH" --screenshot="$d/$stem.png" "file://$html"
  [ "$LAYER" = "views" ] && shoot --window-size="375,13000" --screenshot="$d/$stem-mobile.png" "file://$html"
  n=$((n+1))
done < <(find "$SCOPE" -name '*.html' | sort)

# Trim each PNG to content. Canvas RGB per theme is resolved from the emitted
# tokens: dark.* trims against theme.dark.json's page surface, light.* against
# theme.light.json's. Tries surface.arena → surface.page → first surface value.
python3 - "$SCOPE" "$DIR" <<'PY'
import sys, os, glob, json, re
from PIL import Image
base, root = sys.argv[1], sys.argv[2]

def to_rgb(v, fallback):
    if not isinstance(v, str): return fallback
    s = v.strip()
    m = re.match(r'#([0-9a-fA-F]{3})$', s)
    if m: return tuple(int(c*2, 16) for c in m.group(1))
    m = re.match(r'#([0-9a-fA-F]{6})', s)
    if m: return tuple(int(s[1+i:3+i], 16) for i in (0, 2, 4))
    m = re.match(r'rgba?\(\s*([0-9]+)\D+([0-9]+)\D+([0-9]+)', s)
    if m: return tuple(int(m.group(i)) for i in (1, 2, 3))
    return fallback

def canvas_for(theme):
    fb = (10, 10, 12) if theme == 'dark' else (240, 234, 221)
    p = os.path.join(root, 'tokens', f'theme.{theme}.json')
    if not os.path.exists(p): return fb
    surf = (json.load(open(p)) or {}).get('surface', {})
    for key in ('arena', 'page'):
        if key in surf: return to_rgb(surf[key], fb)
    return to_rgb(next(iter(surf.values()), None), fb) if surf else fb

CANVAS = {'dark': canvas_for('dark'), 'light': canvas_for('light')}
for png in glob.glob(os.path.join(base, '**', '*.png'), recursive=True):
    canvas = CANVAS['light'] if os.path.basename(png).startswith('light') else CANVAS['dark']
    im = Image.open(png).convert('RGB'); w, h = im.size; px = im.load(); bottom = h - 1
    for y in range(h - 1, -1, -1):
        xs = [40, w // 4, w // 2, 3 * w // 4, w - 40]
        if any(any(abs(px[x, y][i] - canvas[i]) > 6 for i in range(3)) for x in xs): bottom = y; break
    crop = min(bottom + 40, h)
    if crop < h: im.crop((0, 0, w, crop)).save(png, optimize=True)
PY
echo "rendered + trimmed $LAYER${SUBPATH:+/$SUBPATH} ($n html)"
