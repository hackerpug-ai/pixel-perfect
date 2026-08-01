/* ============================================================================
 * _audit.mjs — orchestrator-owned token-purity + link-resolution gate.
 *
 * design-deconstruct staged tooling. Copied into <output>/_audit.mjs.
 *
 *   node _audit.mjs atoms            # audit every atom component (recursive)
 *   node _audit.mjs molecules mol-x  # audit one component subtree
 *
 * Scans every component HTML (<style> blocks + inline style="" + svg fill/stroke)
 * under a layer for violations of the semantic-token contract. RECURSES nested
 * folders (views nest route→state subfolders, each with dark.html/light.html).
 *
 * Two axes, both blocking:
 *   1. token purity   — no hex / rgb / numeric type / raw-px-spacing / Tier-1 (--_)
 *                       leaks / non-semantic var() refs. Allowlist = the Tier-2
 *                       semantic cssVars from tokens/semantic-tokens.json.
 *   2. link resolution — every <link href> stylesheet must resolve on disk
 *                       (catches depth bugs; pairs with render-sanity in _sanity.py).
 * ========================================================================== */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = dirname(fileURLToPath(import.meta.url));
const sem = JSON.parse(readFileSync(join(DIR, 'tokens/semantic-tokens.json'), 'utf8'));
const ALLOWED = new Set(sem.tokens.map(t => t.cssVar));
ALLOWED.add('--font-features'); // commonly declared in fonts.css; harmless

const layer = process.argv[2];
const only = process.argv[3];
if (!layer) { console.error('usage: node _audit.mjs <layer> [component]'); process.exit(2); }

const layerDir = join(DIR, layer);

const ALLOWED_PX = new Set(['0', '1', '2', '3']); // hairline borders / zero
const violations = [];

// Blank out comment bodies (keep newlines so line numbers stay accurate) so we
// never flag documentation like `/* maps --fire → --domain-fire */`.
function blankComments(s, open, close) {
  let out = '', i = 0;
  while (i < s.length) {
    const o = s.indexOf(open, i);
    if (o < 0) { out += s.slice(i); break; }
    out += s.slice(i, o);
    const c = s.indexOf(close, o + open.length);
    const end = c < 0 ? s.length : c + close.length;
    out += s.slice(o, end).replace(/[^\n]/g, ' ');
    i = end;
  }
  return out;
}

function scan(file, rawSrc) {
  const src = blankComments(blankComments(rawSrc, '/*', '*/'), '<!--', '-->');
  // component-local custom properties (e.g. `--atom-corner-color: var(--domain-fire)`)
  // are a legitimate variant-parameterization pattern. Collect their names and allow
  // var() references to them — any LITERAL in their definition is still caught by the
  // hex/color/type rules, which scan all declarations including these.
  const localDefs = new Set();
  for (const m of src.matchAll(/(--[a-z0-9_-]+)\s*:/g)) if (!m[1].startsWith('--_')) localDefs.add(m[1]);
  // regions to check: <style> blocks + inline style attrs + svg fill/stroke attrs
  const regions = [];
  for (const m of src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) regions.push({ text: m[1], base: offsetToLine(src, m.index) });
  for (const m of src.matchAll(/style="([^"]*)"/g)) regions.push({ text: m[1], base: offsetToLine(src, m.index) });
  for (const m of src.matchAll(/(?:fill|stroke)="([^"]*)"/g)) regions.push({ text: `_attr: ${m[1]}`, base: offsetToLine(src, m.index) });

  for (const region of regions) {
    const lines = region.text.split('\n');
    lines.forEach((line, i) => {
      const ln = region.base + i;
      const add = (rule, matched) => violations.push({ file, line: ln, rule, matched: matched.slice(0, 80) });

      // 1) hex literal (allow svg url(#id) anchors → require # followed by 3/6/8 hex AND word-boundary, not letters)
      for (const mm of line.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
        const hex = mm[0];
        if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(hex)) add('hex-literal', hex);
      }
      // 2) rgb/rgba/hsl literal
      for (const mm of line.matchAll(/\b(?:rgba?|hsla?)\(\s*[0-9]/g)) add('color-fn-literal', mm[0]);
      // 3) numeric font-size / weight / line-height / letter-spacing (no var)
      for (const [re, rule] of [
        [/font-size:\s*([^;}\n]+)/g, 'font-size-literal'],
        [/font-weight:\s*(\d{3})\b/g, 'font-weight-literal'],
        [/line-height:\s*([^;}\n]+)/g, 'line-height-literal'],
        [/letter-spacing:\s*([^;}\n]+)/g, 'letter-spacing-literal'],
      ]) {
        for (const mm of line.matchAll(re)) {
          const v = (mm[1] || '').trim();
          if (/var\(/.test(v)) continue;
          if (rule === 'line-height-literal' && /^(0|inherit|initial|unset|normal)$/.test(v)) continue;
          if (rule === 'letter-spacing-literal' && /^(0|0em|normal|inherit)$/.test(v)) continue;
          if (rule === 'font-size-literal' && /^(inherit|initial|0)$/.test(v)) continue;
          add(rule, mm[0]);
        }
      }
      // 4) raw px in padding/margin/gap (allow 0/1/2/3, clamp()/calc(), var())
      for (const mm of line.matchAll(/(padding|margin|gap|row-gap|column-gap)(?:-[a-z]+)?:\s*([^;}\n]+)/g)) {
        const v = mm[2];
        if (/var\(|clamp\(|calc\(/.test(v)) continue;
        for (const pn of v.matchAll(/(\d+(?:\.\d+)?)px/g)) if (!ALLOWED_PX.has(pn[1])) { add('raw-space-px', mm[0]); break; }
      }
      // 5) var(--X) referencing a non-Tier-2 token (catches --_ Tier-1 leaks + bare concept names)
      for (const mm of line.matchAll(/var\(\s*(--[a-z0-9_-]+)/g)) {
        const name = mm[1];
        if (ALLOWED.has(name) || localDefs.has(name)) continue;
        add(name.startsWith('--_') ? 'tier1-leak' : 'non-semantic-var', name);
      }
    });
  }
}
function offsetToLine(src, idx) { return (src.slice(0, idx).match(/\n/g) || []).length + 1; }

let scanned = 0;
// Recurse the layer (or one component subtree) — folders may nest state subfolders,
// each holding dark.html / light.html. Scan every .html found.
const root = only ? join(layerDir, only) : layerDir;
const htmlFiles = [];
(function walk(dir) {
  if (!existsSync(dir)) return;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.html')) htmlFiles.push(p);
  }
})(root);
if (htmlFiles.length === 0) violations.push({ file: `${layer}${only ? '/' + only : ''}`, line: 0, rule: 'no-html-found', matched: '' });
for (const abs of htmlFiles.sort()) {
  const rel = relative(DIR, abs);
  const src = readFileSync(abs, 'utf8');
  scan(rel, src);
  // a mock only "works" if its stylesheets actually resolve — flag any 404 <link href>.
  const hrefs = [...src.matchAll(/<link[^>]+href="([^"]+\.css)"/g)].map(m => m[1]).filter(h => !h.startsWith('http'));
  if (hrefs.length === 0) violations.push({ file: rel, line: 0, rule: 'no-stylesheet-links', matched: '' });
  for (const h of hrefs) if (!existsSync(resolve(dirname(abs), h))) violations.push({ file: rel, line: 0, rule: 'broken-stylesheet-link', matched: h });
  scanned++;
}

const byFile = {};
for (const v of violations) (byFile[v.file] ??= []).push(v);
const n = violations.length;
console.log(`AUDIT ${layer}${only ? '/' + only : ''} — ${scanned} component(s) scanned`);
if (n === 0) { console.log('  ✓ CLEAN — zero violations'); process.exit(0); }
for (const [f, vs] of Object.entries(byFile)) {
  console.log(`\n  ✗ ${f}  (${vs.length})`);
  for (const v of vs) console.log(`     L${v.line}  [${v.rule}]  ${v.matched}`);
}
console.log(`\n  ${n} violation(s) across ${Object.keys(byFile).length} file(s)`);
process.exit(1);
