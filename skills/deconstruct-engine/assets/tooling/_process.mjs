/* ============================================================================
 * _process.mjs — ONE deterministic call per component: split → render → audit
 * → sanity, emitting a single JSON verdict.
 *
 * design-deconstruct staged tooling. Copied into <output>/_process.mjs.
 *
 *   node _process.mjs <layer> <component-subpath>
 *   node _process.mjs atoms button
 *   node _process.mjs views rig/arena-terminal/timeout
 *
 * Replaces the 4-command sequence the orchestrator previously ran by hand after
 * every subagent return. One call, one verdict — the orchestrator cannot skip a
 * sub-step, and the verdict is machine-parseable (last line of stdout is JSON).
 *
 * Steps (each fails closed; later steps still run so the verdict is complete):
 *   1. SPLIT   — if {layer}/{comp}/_src.html exists, _split.mjs → dark/light.html.
 *                _src.html is removed ONLY on a clean split.
 *   2. RENDER  — bash _render.sh <layer> <comp>  (VTB env passes through).
 *   3. AUDIT   — node _audit.mjs <layer> <comp>  (token purity + link resolution).
 *   4. SANITY  — python3 _sanity.py {layer}/{comp}  (render sanity).
 *
 * Exit 0 iff every step passed. The JSON verdict is ALWAYS the last stdout line:
 *   { layer, component, split: "ok"|"skipped"|"fail", render: "ok"|"fail",
 *     audit: {ok, output}, sanity: {ok, output}, ok }
 * ========================================================================== */
import { existsSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { split } from './_split.mjs';

const DIR = dirname(fileURLToPath(import.meta.url));
const [, , layer, comp] = process.argv;
if (!layer || !comp) { console.error('usage: node _process.mjs <layer> <component-subpath>'); process.exit(2); }

const compDir = join(DIR, layer, comp);
const tail = (s, n = 2000) => (s || '').trim().slice(-n);
const verdict = { layer, component: comp, split: 'skipped', render: 'ok', audit: { ok: false, output: '' }, sanity: { ok: false, output: '' }, ok: false };

// 1 ── SPLIT (only when an authored _src.html is present)
const srcHtml = join(compDir, '_src.html');
if (existsSync(srcHtml)) {
  try {
    const results = split(srcHtml, compDir);
    const errs = results.flatMap(r => r.errs.map(e => `${r.outAbs}: ${e}`));
    if (errs.length) { verdict.split = 'fail'; verdict.splitErrors = errs; }
    else { verdict.split = 'ok'; unlinkSync(srcHtml); }
  } catch (e) { verdict.split = 'fail'; verdict.splitErrors = [String(e.message || e)]; }
}

// 2 ── RENDER (scoped to this component's subtree)
const r = spawnSync('bash', [join(DIR, '_render.sh'), layer, comp], { cwd: DIR, encoding: 'utf8', env: process.env });
if (r.status !== 0) { verdict.render = 'fail'; verdict.renderOutput = tail(r.stdout + '\n' + r.stderr); }

// 3 ── AUDIT (token purity + link resolution)
const a = spawnSync('node', [join(DIR, '_audit.mjs'), layer, comp], { cwd: DIR, encoding: 'utf8' });
verdict.audit = { ok: a.status === 0, output: tail(a.stdout + (a.stderr ? '\n' + a.stderr : '')) };

// 4 ── SANITY (render sanity: dark reads dark, light reads light)
const s = spawnSync('python3', [join(DIR, '_sanity.py'), join(layer, comp)], { cwd: DIR, encoding: 'utf8' });
verdict.sanity = { ok: s.status === 0, output: tail(s.stdout + (s.stderr ? '\n' + s.stderr : '')) };

verdict.ok = verdict.split !== 'fail' && verdict.render === 'ok' && verdict.audit.ok && verdict.sanity.ok;
console.log(JSON.stringify(verdict));
process.exit(verdict.ok ? 0 : 1);
