// pixel-perfect mark builders. Pure functions returning SVG strings.
var PPLogo = (function () {
  const T = {
    light: { ink: '#111316', cyan: '#0096D1', magenta: '#E0007A', paper: '#F3F4F1', blend: 'multiply' },
    dark:  { ink: '#ECEDE8', cyan: '#29C1F0', magenta: '#FF3D9E', paper: '#0D0F12', blend: 'screen' },
  };
  // P glyph: cap 100, width 80, stem 24, square 32×32 counter centred at (40,40)
  const P = 'M0 0H80V80H24V100H0ZM24 24H56V56H24Z';
  const NS = 'xmlns="http://www.w3.org/2000/svg"';
  const glyph = (fill, x, y, extra = '') => `<path d="${P}" fill="${fill}" fill-rule="evenodd" transform="translate(${x} ${y})"${extra}/>`;
  const outline = (stroke, x, y, w) => `<path d="${P}" fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linejoin="miter" transform="translate(${x} ${y})"/>`;
  const pixel = (fill, x, y, s = 12) => `<rect x="${x + 40 - s / 2}" y="${y + 40 - s / 2}" width="${s}" height="${s}" fill="${fill}"/>`;
  const wrap = (vb, body, bg) => `<svg ${NS} viewBox="${vb}" style="isolation:isolate">${bg ? `<rect x="${vb.split(' ')[0]}" y="${vb.split(' ')[1]}" width="${vb.split(' ')[2]}" height="${vb.split(' ')[3]}" fill="${bg}"/>` : ''}${body}</svg>`;

  // Variant B — registration, flat
  function B(theme, o = {}) {
    const t = T[theme];
    return wrap('-6 -6 104 124',
      glyph(t.cyan, 0, 12) +
      `<g style="mix-blend-mode:${t.blend}">${glyph(t.ink, 12, 0)}</g>` +
      pixel(t.magenta, 12, 0), o.bg);
  }
  // Variant C — registered
  function C(theme, o = {}) {
    const t = T[theme]; const h = o.halo ?? 3;
    return wrap('-6 -6 92 112',
      glyph(t.cyan, -h, h) +
      `<g style="mix-blend-mode:${t.blend}">${glyph(t.ink, 0, 0)}</g>` +
      pixel(t.magenta, 0, 0), o.bg);
  }
  // Variant A — stacked plates. rotateX 58°, rotateZ 45°: (x,y) → (.7071(x−y), .3747(x+y)); gap 20 lifts by 20·sin58 ≈ 17
  const M = 'matrix(0.7071 0.3747 -0.7071 0.3747 0 0)';
  function A(theme, o = {}) {
    const t = T[theme]; const gap = o.gap ?? 20; const lift = (gap * 0.848).toFixed(1);
    const sw = o.stroke ?? 1; const ve = o.scaleStroke ? '' : ' vector-effect="non-scaling-stroke"';
    const plate = (op) => `<rect width="120" height="120" fill="${t.paper}" fill-opacity="${op}" stroke="${t.ink}" stroke-width="${sw}"${ve}/>`;
    const top = -lift - 6, h = 96 + Number(lift) + 12;
    return wrap(`-90 ${top} 180 ${h}`,
      `<g transform="${M}">${plate(1)}<g transform="translate(32 25) scale(0.7)">${glyph(t.cyan, 0, 0)}</g></g>` +
      `<g transform="translate(0 -${lift})"><g transform="${M}">${plate(0.12)}<g transform="translate(32 25) scale(0.7)"><g style="mix-blend-mode:${t.blend}">${glyph(t.ink, 0, 0)}</g>${pixel(t.magenta, 0, 0)}</g></g></g>`, o.bg);
  }
  // Single-colour ink versions
  function monoA(theme, o = {}) {
    const t = T[theme]; const lift = 17; const sw = o.stroke ?? 1; const ve = o.scaleStroke ? '' : ' vector-effect="non-scaling-stroke"';
    const plate = `<rect width="120" height="120" fill="none" stroke="${t.ink}" stroke-width="${sw}"${ve}/>`;
    return wrap('-90 -23 180 125',
      `<g transform="${M}">${plate}<g transform="translate(32 25) scale(0.7)">${outline(t.ink, 0, 0, sw * 2.5)}</g></g>` +
      `<g transform="translate(0 -${lift})"><g transform="${M}">${plate}<g transform="translate(32 25) scale(0.7)">${glyph(t.ink, 0, 0)}${pixel(t.ink, 0, 0)}</g></g></g>`, o.bg);
  }
  function monoB(theme, o = {}) {
    const t = T[theme];
    return wrap('-6 -6 104 124', outline(t.ink, 0, 12, 2) + glyph(t.ink, 12, 0) + pixel(t.ink, 12, 0), o.bg);
  }
  // Construction sheet (guides in magenta, dashed)
  function construction(theme) {
    const t = T[theme]; const g = t.magenta; const lift = 17;
    const proj = (x, y, dy = 0) => [(0.7071 * (x - y)).toFixed(1), (0.3747 * (x + y) + dy).toFixed(1)];
    const corners = [[0, 0], [120, 0], [120, 120], [0, 120]];
    const dot = ([x, y]) => `<circle cx="${x}" cy="${y}" r="3.5" fill="${g}"/>`;
    const dash = (a, b) => `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${g}" stroke-width="1" stroke-dasharray="3 3"/>`;
    const txt = (x, y, s, anchor = 'start') => `<text x="${x}" y="${y}" font-family="IBM Plex Mono, monospace" font-size="7" fill="${t.ink}" text-anchor="${anchor}">${s}</text>`;
    let guides = '';
    corners.forEach(c => { const a = proj(c[0], c[1]), b = proj(c[0], c[1], -lift); guides += dash(a, [b[0], b[1] - 14]) + dot(a) + dot(b); });
    // glyph baseline guides & pixel
    const gb = proj(32, 95, -lift), gb2 = proj(88, 95, -lift);
    const px = proj(60, 53, -lift);
    guides += dash([gb[0], gb[1]], [gb2[0], gb2[1]]) + dot(px);
    // clear space (½ mark height ≈ 55 around bbox −85..85 × −23..90)
    guides += `<rect x="-140" y="-78" width="280" height="223" fill="none" stroke="${g}" stroke-width="1" stroke-dasharray="3 3"/>`;
    const body = A(theme).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
    return `<svg ${NS} viewBox="-230 -160 540 400" style="isolation:isolate"><rect x="-230" y="-160" width="540" height="400" fill="${t.paper}"/>${body}${guides}` +
      txt(-225, -150, 'pixel-perfect · construction') +
      txt(-225, -138, 'plate: 120 square · rotateX 58° · rotateZ 45° · outline 1 px at 28 px, proportional above') +
      txt(-225, -126, 'gap: side ÷ 6 = 20 · projected lift 17') +
      txt(-225, -114, 'glyph: Anybody 800 wdth 112 · cap 100 · stem 24 · counter 32 square') +
      txt(-225, -102, 'offset: from the gap only; flat variants use 12 % of cap') +
      txt(-225, -90, 'pixel: 12 square, centred in the front counter · the only magenta') +
      txt(-136, 233, 'clear space: ½ mark height on all sides') +
      txt(96, -46, 'registration guides') +
      `</svg>`;
  }
  return { T, A, B, C, monoA, monoB, construction };
})();
if (typeof window !== 'undefined') window.PPLogo = PPLogo;
