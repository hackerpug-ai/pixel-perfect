/* ============================================================================
 * design-deconstruct · Phase 1 token synthesizer  (TEMPLATE)
 * ----------------------------------------------------------------------------
 * DETERMINISTIC emitter — the single source for the deconstructed token system.
 * The Phase-1 frontend-designer subagent fills the two DATA tables below from the
 * concept (CONCEPT primitives + SEMANTIC aliases); EVERYTHING ELSE — resolution,
 * round-trip validation, and all six emitted files — is generic machinery and
 * must NOT be edited per project.
 *
 *   ★ FILL PER CONCEPT ★  → const CONCEPT = { … }   (Tier 1 — the source's keys)
 *   ★ FILL PER CONCEPT ★  → S(…) / SLIT(…) calls    (Tier 2 — role-named aliases)
 *   ★ FILL PER CONCEPT ★  → const SOURCE = '…'      (path to the concept)
 *
 * Holds:
 *   CONCEPT  — Tier 1 primitives = the source's own keys, verbatim.
 *              dark  = EXACT source values (the round-trip target).
 *              light = DERIVED counterpart when the source is single-theme
 *                      (NOT in source; flagged). If the source HAS both themes,
 *                      put both real values and `themed` resolves automatically.
 *   SEMANTIC — Tier 2 role-named aliases → each references a CONCEPT key (or, for
 *              a value with no source primitive, a flagged derived literal).
 *
 * Emits (all guaranteed mutually consistent):
 *   tokens.css            two tiers, :root = dark, [data-theme=light] = derived
 *   theme.dark.json       semantic layer resolved for dark
 *   theme.light.json      semantic layer resolved for light (identical keys)
 *   theme.schema.json     enforces key parity across themes
 *   semantic-tokens.json  machine round-trip (semantic.id → per-theme conceptRef)
 *   TOKEN-MAP.md          human bidirectional map (semantic ↔ concept ↔ value)
 *
 * Run:  node tokens/build-tokens.mjs
 * ========================================================================== */

import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = dirname(fileURLToPath(import.meta.url));
const VOCAB_VERSION = '2.0.0';
const SOURCE = '<<CONCEPT_PATH>>'; // ★ FILL: path to the concept (e.g. apps/web/src/lib/tokens.js)

/* ─────────────────────────────────────────────────────────────────────────
 * TIER 1 — CONCEPT PRIMITIVES  ★ FILL PER CONCEPT ★
 *   C(dark, light, group, note) → themed primitive (light derived OR real)
 *   K(value, group)             → theme-invariant (sizes, spacing, motion, …)
 *   `themed` is auto: true when light !== dark.
 * The example below is illustrative and RUNS as-is — replace it wholesale with
 * the concept's actual keys (preserve the source key names verbatim).
 * ───────────────────────────────────────────────────────────────────────── */
const C = (dark, light, group, note) => ({ dark, light: light ?? dark, group, themed: light !== undefined && light !== dark, note });
const K = (val, group) => ({ dark: val, light: val, group, themed: false }); // invariant

const CONCEPT = {
  /* COLOR · surfaces (dark = source · light = derived) */
  '--bg-page':       C('#101014', '#F7F6F3', 'surface', 'default page'),
  '--bg-raised':     C('#1A1A20', '#FFFFFF', 'surface', 'elevated / hover-row'),
  '--bg-sunken':     C('#0A0A0D', '#EFEDE8', 'surface', 'recessed / code inset'),

  /* COLOR · foregrounds */
  '--fg-heading':    C('#F4F2EC', '#16161A', 'text', 'headings'),
  '--fg-body':       C('#CFCBC2', '#33333A', 'text', 'body'),
  '--fg-muted':      C('#8A867C', '#6B6B72', 'text', 'secondary'),

  /* COLOR · dividers + accent + state */
  '--rule':          C('#2A2A30', '#DCDAD3', 'border', 'default border'),
  '--accent':        C('#E0603A', '#C24A26', 'brand',  'primary accent'),
  '--accent-fg':     C('#101014', '#FFFFFF', 'brand',  'foreground on accent fill'),
  '--ok':            C('#4FB286', '#2E8C63', 'state',  'success'),
  '--danger':        C('#E0506A', '#C23048', 'state',  'error / destructive'),

  /* TYPE · families (invariant) */
  '--font-sans':     K('ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif', 'font'),
  '--font-mono':     K('ui-monospace, SFMono-Regular, Menlo, monospace', 'font'),

  /* TYPE · sizes (invariant) */
  '--t-12': K('12px', 'type-size'), '--t-14': K('14px', 'type-size'), '--t-16': K('16px', 'type-size'),
  '--t-20': K('20px', 'type-size'), '--t-28': K('28px', 'type-size'), '--t-40': K('40px', 'type-size'),

  /* TYPE · weight / leading / tracking (invariant) */
  '--fw-regular': K('400', 'type-weight'), '--fw-medium': K('500', 'type-weight'), '--fw-bold': K('700', 'type-weight'),
  '--lh-tight': K('1.15', 'leading'), '--lh-body': K('1.55', 'leading'),
  '--ls-tight': K('-0.02em', 'tracking'), '--ls-normal': K('0', 'tracking'), '--ls-caps': K('0.12em', 'tracking'),

  /* SPACING scale (invariant) */
  '--s-0': K('0', 'space'), '--s-1': K('4px', 'space'), '--s-2': K('8px', 'space'), '--s-3': K('12px', 'space'),
  '--s-4': K('16px', 'space'), '--s-5': K('24px', 'space'), '--s-6': K('32px', 'space'), '--s-7': K('48px', 'space'),

  /* RADIUS / STROKE / MOTION (invariant) */
  '--r-0': K('0', 'radius'), '--r-1': K('4px', 'radius'), '--r-pill': K('999px', 'radius'),
  '--bw-1': K('1px', 'stroke'), '--bw-2': K('2px', 'stroke'),
  '--tx-fast': K('120ms', 'motion'), '--tx-base': K('200ms', 'motion'),
};

/* ─────────────────────────────────────────────────────────────────────────
 * TIER 2 — SEMANTIC ALIASES  ★ FILL PER CONCEPT ★
 *   S(category, name, cssVar, conceptKey, purpose)  → aliases a Tier-1 primitive
 *   SLIT(category, name, cssVar, literal, purpose)  → derived literal (no source
 *                                                      primitive; flagged derived)
 * Components consume ONLY these Tier-2 cssVars. Categories should come from the
 * canonical vocabulary in docs/SEMANTIC-TOKENS.md (surface/text/border/accent/
 * state/spacing/type/radius/elevation/motion/domain).
 * ───────────────────────────────────────────────────────────────────────── */
const SEM = [];
const S = (category, name, cssVar, conceptRef, purpose) =>
  SEM.push({ id: `semantic.${category}.${name}`, category, cssVar, conceptRef, purpose });
const SLIT = (category, name, cssVar, literal, purpose) =>
  SEM.push({ id: `semantic.${category}.${name}`, category, cssVar, literal, derived: true, purpose });

/* surface */
S('surface', 'page',   '--surface-page',   '--bg-page',   'Default page background');
S('surface', 'raised', '--surface-raised', '--bg-raised', 'Elevated surface / hover row');
S('surface', 'sunken', '--surface-sunken', '--bg-sunken', 'Recessed / code inset');
/* text */
S('text', 'heading', '--text-heading', '--fg-heading', 'Headings');
S('text', 'body',    '--text-body',    '--fg-body',    'Body text');
S('text', 'muted',   '--text-muted',   '--fg-muted',   'Secondary text');
S('text', 'on-accent','--text-on-accent','--accent-fg', 'Text on a brand fill');
/* border */
S('border', 'default', '--border-default', '--rule',  'Default component border');
S('border', 'focus',   '--border-focus',   '--accent','Focus ring');
/* accent */
S('accent', 'primary',    '--accent-primary',    '--accent',    'Primary brand accent');
S('accent', 'primary-fg', '--accent-primary-fg', '--accent-fg', 'Foreground on primary fill');
/* state */
S('state', 'success', '--state-success', '--ok',     'Success');
S('state', 'danger',  '--state-danger',  '--danger', 'Error / destructive');
/* type — families / sizes / weight / leading / tracking */
S('type', 'font-sans',     '--font-sans',          '--font-sans', 'Sans family');
S('type', 'font-mono',     '--font-mono',          '--font-mono', 'Mono family');
S('type', 'size-body',     '--text-size-body',     '--t-14', 'Body size');
S('type', 'size-meta',     '--text-size-meta',     '--t-12', 'Meta / caption');
S('type', 'size-title',    '--text-size-title',    '--t-20', 'Title');
S('type', 'size-section',  '--text-size-section',  '--t-28', 'Section heading');
S('type', 'size-display',  '--text-size-display',  '--t-40', 'Display');
S('type', 'weight-regular','--font-weight-regular','--fw-regular', 'Regular weight');
S('type', 'weight-medium', '--font-weight-medium', '--fw-medium',  'Medium weight');
S('type', 'weight-bold',   '--font-weight-bold',   '--fw-bold',    'Bold weight');
S('type', 'leading-tight', '--leading-tight',      '--lh-tight',   'Heading leading');
S('type', 'leading-body',  '--leading-body',       '--lh-body',    'Body leading');
S('type', 'tracking-tight','--tracking-tight',     '--ls-tight',   'Display tracking');
S('type', 'tracking-normal','--tracking-normal',   '--ls-normal',  'Default tracking');
S('type', 'tracking-caps', '--tracking-caps',      '--ls-caps',    'Caps tracking');
/* spacing — semantic roles atop the scale */
S('spacing', 'none',    '--space-none',    '--s-0', 'Zero');
S('spacing', 'inline',  '--space-inline',  '--s-2', 'Inline gap (8)');
S('spacing', 'stack',   '--space-stack',   '--s-3', 'Stack gap (12)');
S('spacing', 'inset',   '--space-inset',   '--s-4', 'Card/panel padding (16)');
S('spacing', 'gutter',  '--space-gutter',  '--s-5', 'Section gutter (24)');
S('spacing', 'block',   '--space-block',   '--s-6', 'Block spacing (32)');
S('spacing', 'section', '--space-section', '--s-7', 'Between sections (48)');
/* radius / stroke */
S('radius', 'none',        '--radius-none',   '--r-0',    'Square corners');
S('radius', 'default',     '--radius-default','--r-1',    'Standard radius');
S('radius', 'pill',        '--radius-pill',   '--r-pill', 'Fully rounded');
S('radius', 'stroke-hair', '--stroke-hair',   '--bw-1',   'Hairline border width');
S('radius', 'stroke-medium','--stroke-medium','--bw-2',   'Medium border width');
/* motion */
S('motion', 'fast', '--motion-fast', '--tx-fast', 'Hover / color / border');
S('motion', 'base', '--motion-base', '--tx-base', 'Fades / transitions');
SLIT('motion', 'ease-out', '--motion-ease-out', 'cubic-bezier(0.16, 1, 0.3, 1)', 'Deceleration curve (no source primitive → derived)');

/* ─────────────────────────────────────────────────────────────────────────
 * RESOLUTION + VALIDATION  (generic — do not edit per project)
 * ───────────────────────────────────────────────────────────────────────── */
const THEMES = ['dark', 'light'];
// Tier-1 primitives live under a private `--_` prefix so the clean role names
// belong to Tier 2. The source key suffix is preserved verbatim:
// `--accent` (source) → `--_accent` (Tier 1) — round-trip stays transparent.
const priv = (key) => '--_' + key.slice(2);
function conceptValue(key, theme) {
  const c = CONCEPT[key];
  if (!c) throw new Error(`semantic references missing concept key: ${key}`);
  return c[theme];
}
function resolved(tok, theme) {
  if (tok.literal !== undefined) return tok.literal;
  return conceptValue(tok.conceptRef, theme);
}

// round-trip + sanity checks
const errors = [];
for (const t of SEM) {
  if (t.conceptRef && !CONCEPT[t.conceptRef]) errors.push(`dangling conceptRef ${t.conceptRef} (${t.id})`);
  if (!t.cssVar.startsWith('--')) errors.push(`bad cssVar ${t.cssVar}`);
}
const cssVars = SEM.map(t => t.cssVar);
const dupVars = cssVars.filter((v, i) => cssVars.indexOf(v) !== i);
if (dupVars.length) errors.push(`duplicate cssVars: ${[...new Set(dupVars)].join(', ')}`);
const ids = SEM.map(t => t.id);
const dupIds = ids.filter((v, i) => ids.indexOf(v) !== i);
if (dupIds.length) errors.push(`duplicate ids: ${[...new Set(dupIds)].join(', ')}`);
// collision guard: a Tier-2 semantic cssVar must NEVER equal a Tier-1 --_ primitive
// name (that WOULD create a circular var()). Matching a *bare* source name like
// --surface-panel is fine — Tier 1 emits it as --_surface-panel.
const privSet = new Set(Object.keys(CONCEPT).map(priv));
for (const t of SEM) {
  if (privSet.has(t.cssVar)) errors.push(`semantic ${t.cssVar} collides with a Tier-1 --_ primitive`);
}
if (errors.length) { console.error('TOKEN BUILD ERRORS:\n' + errors.join('\n')); process.exit(1); }

/* ─────────────────────────────────────────────────────────────────────────
 * EMIT · tokens.css
 * ───────────────────────────────────────────────────────────────────────── */
const conceptByGroup = {};
for (const [k, v] of Object.entries(CONCEPT)) (conceptByGroup[v.group] ??= []).push([k, v]);
const semByCat = {};
for (const t of SEM) (semByCat[t.category] ??= []).push(t);

function emitConceptBlock(theme) {
  const lines = [];
  for (const [group, entries] of Object.entries(conceptByGroup)) {
    const themed = entries.filter(([, v]) => theme === 'dark' || v.themed);
    if (theme === 'light' && themed.length === 0) continue;
    lines.push(`  /* ${group} */`);
    for (const [k, v] of themed) lines.push(`  ${priv(k)}: ${v[theme]};`);
  }
  return lines.join('\n');
}

let css = `/* ============================================================================
 * Deconstructed token system  (design-deconstruct Phase 1)
 * GENERATED by tokens/build-tokens.mjs — DO NOT EDIT BY HAND.
 *
 * TWO TIERS:
 *   Tier 1 — concept primitives, prefixed --_ (private). The suffix is the
 *            source's own key (${SOURCE}) verbatim: source --accent → --_accent.
 *            These are the round-trip target. dark = EXACT source values.
 *            light = real source value, or DERIVED counterpart (flagged) when the
 *            source is single-theme.
 *   Tier 2 — semantic aliases (role-named, NO prefix) → reference a Tier-1
 *            --_ primitive. Components consume ONLY Tier-2 names. Theme flips
 *            Tier 1; Tier 2 inherits automatically.
 *
 * DEFAULT THEME = dark. Light is provided via [data-theme="light"].
 * ========================================================================== */

/* ─── TIER 1 · concept primitives — DARK (canonical, exact source) ───────── */
:root,
[data-theme="dark"] {
${emitConceptBlock('dark')}
}

/* ─── TIER 1 · concept primitives — LIGHT ────────────────────────────────── */
[data-theme="light"] {
${emitConceptBlock('light')}
}

/* ─── TIER 2 · semantic aliases (role-named · theme-invariant keys) ──────────
 * Declared under :root AND [data-theme] so the var() substitution RE-RESOLVES
 * inside any themed subtree. (If declared only on :root, the aliases compute
 * once against :root's primitives and inherit as resolved values — a nested
 * [data-theme="light"] would NOT switch. Matching [data-theme] re-declares the
 * whole semantic layer on the themed element, re-resolving against its --_ scope.)
 */
:root,
[data-theme] {
`;
for (const [cat, toks] of Object.entries(semByCat)) {
  css += `  /* ${cat} */\n`;
  for (const t of toks) {
    const rhs = t.literal !== undefined ? t.literal : `var(${priv(t.conceptRef)})`;
    css += `  ${t.cssVar}: ${rhs};\n`;
  }
}
css += `}\n`;
writeFileSync(join(DIR, 'tokens.css'), css);

/* ─────────────────────────────────────────────────────────────────────────
 * EMIT · theme.{dark,light}.json  (semantic layer resolved, grouped by category)
 * ───────────────────────────────────────────────────────────────────────── */
function themeJson(theme) {
  const out = { $theme: theme, $generated: 'build-tokens.mjs', $derived: theme === 'light' && Object.values(CONCEPT).some(c => c.themed && c.note) };
  for (const t of SEM) {
    const [, cat, name] = t.id.split('.');
    (out[cat] ??= {})[name] = resolved(t, theme);
  }
  return out;
}
writeFileSync(join(DIR, 'theme.dark.json'), JSON.stringify(themeJson('dark'), null, 2));
writeFileSync(join(DIR, 'theme.light.json'), JSON.stringify(themeJson('light'), null, 2));

/* ─────────────────────────────────────────────────────────────────────────
 * EMIT · theme.schema.json  (enforces identical keys across themes)
 * ───────────────────────────────────────────────────────────────────────── */
const catProps = {};
for (const t of SEM) {
  const [, cat, name] = t.id.split('.');
  (catProps[cat] ??= { type: 'object', required: [], properties: {}, additionalProperties: false });
  catProps[cat].required.push(name);
  catProps[cat].properties[name] = { type: ['string', 'number'] };
}
const schema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'urn:design-deconstruct:theme.schema.json',
  title: 'Semantic theme (key-parity enforced across dark/light)',
  type: 'object',
  required: ['$theme', ...Object.keys(catProps)],
  properties: {
    $theme: { enum: THEMES },
    $generated: { type: 'string' },
    $derived: { type: 'boolean' },
    ...catProps,
  },
  additionalProperties: false,
};
writeFileSync(join(DIR, 'theme.schema.json'), JSON.stringify(schema, null, 2));

/* ─────────────────────────────────────────────────────────────────────────
 * EMIT · semantic-tokens.json  (machine round-trip map)
 * ───────────────────────────────────────────────────────────────────────── */
const semanticTokens = {
  meta: { themes: THEMES, vocabularyVersion: VOCAB_VERSION, derivedFrom: SOURCE,
          note: 'mappings.{theme}.conceptRef = the source concept key (verbatim); privateVar = where that primitive lives in Tier 1 of tokens.css (--_ prefixed). dark round-trips to exact source values.' },
  tokens: SEM.map(t => ({
    id: t.id, category: t.category, cssVar: t.cssVar, purpose: t.purpose,
    ...(t.derived ? { derived: true } : {}),
    ...(t.conceptRef ? { privateVar: priv(t.conceptRef) } : {}),
    mappings: Object.fromEntries(THEMES.map(theme => [
      theme,
      t.literal !== undefined ? { literal: t.literal } : { conceptRef: t.conceptRef, value: conceptValue(t.conceptRef, theme) },
    ])),
  })),
};
writeFileSync(join(DIR, 'semantic-tokens.json'), JSON.stringify(semanticTokens, null, 2));

/* ─────────────────────────────────────────────────────────────────────────
 * EMIT · TOKEN-MAP.md  (human bidirectional map)
 * ───────────────────────────────────────────────────────────────────────── */
let md = `# TOKEN-MAP — semantic ⇄ concept round-trip

Generated by \`build-tokens.mjs\`. **Do not edit by hand.**

- **Tier 2 (semantic)** — role-named tokens components consume (no prefix).
- **Tier 1 (concept)** — the source's own keys from \`${SOURCE}\` (the round-trip target), stored in \`tokens.css\` under a private \`--_\` prefix (source \`--accent\` → \`--_accent\`).
- **dark** values round-trip **exactly** to the source. **light** values are the source's real light values, or **derived** (flagged ⚠) when the source is single-theme.

## Forward map · semantic → concept

| Semantic (\`--var\`) | → concept key (source) | Tier-1 var | dark value | light value |
|---|---|---|---|---|
`;
for (const t of SEM) {
  const concept = t.conceptRef ?? '— (derived literal)';
  const t1 = t.conceptRef ? `\`${priv(t.conceptRef)}\`` : '—';
  const d = resolved(t, 'dark'), l = resolved(t, 'light');
  const flag = t.derived ? ' ⚠' : '';
  md += `| \`${t.cssVar}\` | \`${concept}\`${flag} | ${t1} | \`${d}\` | \`${l}\` |\n`;
}

md += `\n## Reverse map · concept → semantic(s)\n\nWhich semantic roles each source concept key now backs (concept keys with no semantic alias are listed as *unpromoted*).\n\n| Concept key (source) | dark | light | backs semantic role(s) |\n|---|---|---|---|\n`;
const reverse = {};
for (const t of SEM) if (t.conceptRef) (reverse[t.conceptRef] ??= []).push(t.cssVar);
for (const [k, v] of Object.entries(CONCEPT)) {
  const roles = reverse[k] ? reverse[k].map(x => `\`${x}\``).join(', ') : '*unpromoted*';
  const flag = v.themed ? '' : ' ·inv';
  md += `| \`${k}\` | \`${v.dark}\`${flag} | \`${v.light}\` | ${roles} |\n`;
}

const unpromoted = Object.keys(CONCEPT).filter(k => !reverse[k]);
md += `\n## Coverage\n\n- Concept keys: **${Object.keys(CONCEPT).length}**\n- Semantic tokens: **${SEM.length}** (${SEM.filter(t=>t.derived).length} derived literals)\n- Unpromoted concept keys: **${unpromoted.length}** — ${unpromoted.length ? unpromoted.map(k=>`\`${k}\``).join(', ') : 'none'}\n`;
writeFileSync(join(DIR, 'TOKEN-MAP.md'), md);

/* ─────────────────────────────────────────────────────────────────────────
 * SUMMARY
 * ───────────────────────────────────────────────────────────────────────── */
const conceptCount = Object.keys(CONCEPT).length;
const themedCount = Object.values(CONCEPT).filter(c => c.themed).length;
console.log('TOKENS BUILT ✓');
console.log(`  concept keys : ${conceptCount}  (${themedCount} themed, ${conceptCount - themedCount} invariant)`);
console.log(`  semantic     : ${SEM.length}  (${SEM.filter(t=>t.derived).length} derived literals)`);
console.log(`  categories   : ${Object.keys(semByCat).join(', ')}`);
console.log(`  unpromoted   : ${unpromoted.length ? unpromoted.join(', ') : 'none'}`);
console.log('  emitted      : tokens.css · theme.dark.json · theme.light.json · theme.schema.json · semantic-tokens.json · TOKEN-MAP.md');
