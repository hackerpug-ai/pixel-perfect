/* ============================================================================
 * _split.mjs — split a two-theme mock HTML into dark.html + light.html.
 *
 * design-deconstruct staged tooling. Copied into <output>/_split.mjs at run start.
 *
 *   node _split.mjs <input.html> <outDir>
 *
 * The phase subagent authors ONE document with both theme panes (dark + light)
 * wrapped in <div data-theme="…"> blocks. This deterministic step emits the two
 * single-theme files the THEME-PAIR contract requires — so the per-theme
 * separation is never an agent judgment call.
 *
 * Emits <outDir>/dark.html and <outDir>/light.html:
 *   - <html data-theme=THEME>
 *   - every <div … data-theme="OPPOSITE" …>…</div> removed (balanced <div> scan,
 *     HTML comments pre-stripped so the scan can't be fooled by commented markup)
 *   - all .view-theme-label bars removed (theme annotation no longer needed)
 *   - <head> <link>s rebuilt at the correct depth for the output path (_head.mjs)
 *   - <style> block + <title> + <body …> attrs preserved verbatim
 * Each emitted file is self-validated (one <html data-theme>, no opposite-theme
 * div, every <link href> resolves). Fails CLOSED: a malformed split never writes
 * a half-broken file silently — the validation surfaces the error.
 * ========================================================================== */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildLinks } from './_head.mjs';

const stripComments = (s) => s.replace(/<!--[\s\S]*?-->/g, '');

/** Remove every balanced <div …data-theme="dropTheme"…>…</div> from html. */
function dropThemeDivs(html, dropTheme) {
  const open = new RegExp(`<div\\b[^>]*\\bdata-theme="${dropTheme}"[^>]*>`, 'g');
  const tag = /<\/?div\b[^>]*>/g;
  let out = '', i = 0, m;
  while ((open.lastIndex = i), (m = open.exec(html))) {
    out += html.slice(i, m.index);
    let depth = 0, end = -1; tag.lastIndex = m.index; let t;
    while ((t = tag.exec(html))) { depth += t[0].startsWith('</') ? -1 : 1; if (depth === 0) { end = tag.lastIndex; break; } }
    if (end < 0) { out += html.slice(m.index); return out; } // malformed — bail, keep remainder
    i = end;
  }
  return out + html.slice(i);
}

/** Remove single-level theme-label bars (balanced, both themes). */
function dropThemeLabels(html) {
  const open = /<div\b[^>]*\bclass="view-theme-label"[^>]*>/g;
  const tag = /<\/?div\b[^>]*>/g;
  let out = '', i = 0, m;
  while ((open.lastIndex = i), (m = open.exec(html))) {
    out += html.slice(i, m.index);
    let depth = 0, end = -1; tag.lastIndex = m.index; let t;
    while ((t = tag.exec(html))) { depth += t[0].startsWith('</') ? -1 : 1; if (depth === 0) { end = tag.lastIndex; break; } }
    if (end < 0) { out += html.slice(m.index); return out; }
    i = end;
  }
  return out + html.slice(i);
}

export function split(inAbs, outDir) {
  const src = readFileSync(inAbs, 'utf8');
  const title = (src.match(/<title>[\s\S]*?<\/title>/i) || ['<title>mock</title>'])[0];
  const style = (src.match(/<style[\s\S]*?<\/style>/i) || [''])[0];
  // ordered, de-duped stylesheet basenames the source references
  const refs = [...new Set([...src.matchAll(/<link[^>]+href="[^"]*?([\w.-]+\.css)"/g)].map((m) => m[1]))];
  const bodyAttrs = (src.match(/<body([^>]*)>/i) || ['', ''])[1];
  const bodyInner = stripComments((src.match(/<body[^>]*>([\s\S]*)<\/body>/i) || ['', ''])[1]);
  mkdirSync(outDir, { recursive: true });

  const results = [];
  for (const theme of ['dark', 'light']) {
    const outAbs = join(outDir, `${theme}.html`);
    let body = dropThemeLabels(dropThemeDivs(bodyInner, theme === 'dark' ? 'light' : 'dark'));
    const links = buildLinks(outAbs, refs);
    const html = `<!doctype html>
<html lang="en" data-theme="${theme}">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
${title}
${links}
${style}
</head>
<body${bodyAttrs}>${body}</body>
</html>
`;
    writeFileSync(outAbs, html);
    // ── self-validate ──
    const errs = [];
    const opp = theme === 'dark' ? 'light' : 'dark';
    if (new RegExp(`data-theme="${opp}"`).test(html.replace(style, ''))) errs.push(`opposite-theme markup remains (${opp})`);
    if ((html.match(/<html[^>]*data-theme/g) || []).length !== 1) errs.push('not exactly one <html data-theme>');
    for (const hm of html.matchAll(/<link[^>]+href="([^"]+\.css)"/g)) if (!existsSync(resolve(outDir, hm[1]))) errs.push(`broken link: ${hm[1]}`);
    results.push({ outAbs, errs });
  }
  return results;
}

// ── CLI ── (guarded: runs ONLY when _split.mjs is the entry module, so importers
// like _process.mjs don't trigger it with their own argv)
const isMain = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
const [, , inArg, outArg] = process.argv;
if (isMain && inArg && outArg) {
  const r = split(resolve(inArg), resolve(outArg));
  let bad = 0;
  for (const { outAbs, errs } of r) { if (errs.length) { bad++; console.log(`✗ ${outAbs}\n   ${errs.join('\n   ')}`); } }
  if (!bad) console.log(`✓ split ${inArg} → ${outArg}/{dark,light}.html`);
  process.exit(bad ? 1 : 0);
}
