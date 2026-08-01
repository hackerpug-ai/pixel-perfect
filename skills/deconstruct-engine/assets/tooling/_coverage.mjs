/* ============================================================================
 * _coverage.mjs — deterministic view-coverage gate against an EXTERNAL
 * inventory (the --views-from checklist).
 *
 * design-deconstruct staged tooling. Copied into <output>/_coverage.mjs.
 *
 *   node _coverage.mjs <inventory.md> [--manifest manifest.json] [--advisory]
 *
 * WHY: driven only by the concept deck, Phase 5 emits a folder per drawn frame,
 * passes every audit, and looks complete while covering a fraction of the
 * product's real view variants. The inventory file (e.g. a routes.md view
 * directory) is the checklist; this gate makes "looks complete" and "is
 * complete" the same thing.
 *
 * INVENTORY FORMAT (markdown):
 *   - A section header (## or ###) introduces a route/surface. If the header
 *     contains "·", the text after the LAST "·" is the route name (e.g.
 *     "## §2 · /setup" → "/setup"); otherwise the full header text is used.
 *   - Inside a section, a variants table whose header row starts
 *     | # | State | ... enumerates the variants. Each data row:
 *     | <n> | <state> | <variant description> | <source> | [status glyph] |
 *   - Rows whose glyph column contains ⚠️ (spec gap — undefined) are counted
 *     separately and never gate.
 *
 * COVERAGE CLAIMS live in manifest.json (orchestrator-recorded as Phase 5
 * dispatches each mock):
 *   "coverage": {
 *     "<route>::<state>::<n>": { "status": "mocked",   "path": "views/…" }
 *                             | { "status": "deferred", "reason": "…" }
 *   }
 * A "mocked" claim is VERIFIED ON DISK — the named folder must hold
 * dark.html + light.html + dark.png + light.png, else it counts as a broken
 * claim (a claim is not coverage; the artifact is).
 *
 * EXIT: 0 iff missing == 0 and broken == 0 (spec-gap ⚠️ rows never gate).
 *       --advisory always exits 0 (report-only mode).
 * ========================================================================== */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const advisory = args.includes('--advisory');
const mi = args.indexOf('--manifest');
const manifestPath = mi >= 0 ? resolve(args[mi + 1]) : join(DIR, 'manifest.json');
const invPath = args.find((a, i) => !a.startsWith('--') && (mi < 0 || i !== mi + 1));
if (!invPath) { console.error('usage: node _coverage.mjs <inventory.md> [--manifest manifest.json] [--advisory]'); process.exit(2); }

// ── parse the inventory ────────────────────────────────────────────────────
const src = readFileSync(resolve(invPath), 'utf8');
const lines = src.split('\n');
let route = null, shape = null; // shape: 'state' (| # | State | variant …) or 'variant' (| # | Variant | …)
const variants = []; // {key, route, state, variant, gap}
const clean = s => s.replace(/`/g, '').trim();
for (const line of lines) {
  const h = line.match(/^#{2,3}\s+(.*)$/);
  if (h) {
    const t = h[1].trim();
    route = clean((t.includes('·') ? t.split('·').slice(1).join('·') : t).replace(/\*\*/g, ''));
    shape = null;
    continue;
  }
  const th = line.match(/^\|\s*#\s*\|\s*(State|Variant)\s*\|/i);
  if (th) { shape = th[1].toLowerCase(); continue; }
  if (shape && /^\|\s*-/.test(line)) continue; // separator row
  if (shape) {
    const cells = line.split('|').map(c => c.trim());
    // state shape:   ["", n, state, variant, source, glyph?, ""]
    // variant shape: ["", n, variant, …,               glyph?, ""]
    if (cells.length < 4 || !/^\d+$/.test(cells[1])) { if (!line.startsWith('|')) shape = null; continue; }
    const n = cells[1];
    const state = shape === 'state' ? clean(cells[2]) : '-';
    const variant = shape === 'state' ? cells[3] : cells[2];
    const glyph = cells[cells.length - 2] || '';
    variants.push({
      key: `${route}::${state}::${n}`,
      route, state, n,
      variant: clean(variant.replace(/\*\*/g, '')).slice(0, 90),
      gap: glyph.includes('⚠'),
    });
  }
}
if (variants.length === 0) {
  console.error(`COVERAGE: no variants parsed from ${invPath}.`);
  console.error('Expected: sections ("## §N · <route>") containing tables headed "| # | State | …",');
  console.error('with one data row per concrete variant. See SKILL.md § --views-from.');
  process.exit(2);
}

// ── join with manifest coverage claims ─────────────────────────────────────
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};
const claims = manifest.coverage || {};
const PAIR = ['dark.html', 'light.html', 'dark.png', 'light.png'];
const rows = variants.map(v => {
  const c = claims[v.key];
  if (v.gap && !c) return { ...v, status: 'spec-gap' };
  if (!c) return { ...v, status: 'missing' };
  if (c.status === 'deferred') return { ...v, status: c.reason ? 'deferred' : 'broken', reason: c.reason || 'deferred without a reason' };
  if (c.status === 'mocked') {
    const missing = PAIR.filter(f => !existsSync(join(DIR, c.path, f)));
    return missing.length ? { ...v, status: 'broken', reason: `claimed ${c.path} lacks ${missing.join(', ')}` } : { ...v, status: 'mocked', path: c.path };
  }
  return { ...v, status: 'broken', reason: `unknown claim status "${c.status}"` };
});

// ── report ─────────────────────────────────────────────────────────────────
const by = s => rows.filter(r => r.status === s);
const total = rows.length;
console.log(`COVERAGE vs ${invPath} — ${total} variant(s) across ${new Set(rows.map(r => r.route)).size} route(s)`);
console.log(`  mocked ${by('mocked').length} · deferred ${by('deferred').length} · missing ${by('missing').length} · broken ${by('broken').length} · spec-gap ${by('spec-gap').length}`);
const perRoute = {};
for (const r of rows) (perRoute[r.route] ??= []).push(r);
for (const [rt, rs] of Object.entries(perRoute)) {
  const m = rs.filter(r => r.status === 'mocked').length;
  console.log(`  ${rt}  ${m}/${rs.length} mocked`);
}
for (const s of ['broken', 'missing']) {
  for (const r of by(s)) console.log(`  ✗ [${s}] ${r.key} — ${r.variant}${r.reason ? `  (${r.reason})` : ''}`);
}
for (const r of by('deferred')) console.log(`  ◌ [deferred] ${r.key} — ${r.reason}`);
const gate = by('missing').length + by('broken').length;
if (gate === 0) console.log('  ✓ COVERED — every non-gap variant is mocked or deferred-with-reason');
process.exit(advisory ? 0 : gate === 0 ? 0 : 1);
