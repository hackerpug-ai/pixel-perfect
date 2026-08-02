#!/usr/bin/env node
/**
 * _build-catalog.mjs — scan a design-deconstruct <output>/ tree and emit
 * browse/catalog.json for the Design Review Browser (pixel-perfect deconstruct-engine).
 *
 * Generic: no project-specific constants. Discover structure from disk only.
 *
 *   node _build-catalog.mjs
 *   node _build-catalog.mjs --root /path/to/system
 *   node _build-catalog.mjs --layer views
 *   node _build-catalog.mjs --out browse/catalog.json
 *
 * Exit 0 on success. Exit 1 if no layers found. Unpaired themes warn to stderr.
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── CLI ──────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
function flag(name, def = null) {
  const i = args.indexOf(name);
  if (i < 0) return def;
  return args[i + 1] ?? def;
}
const onlyLayer = flag('--layer');
const root = resolve(flag('--root', process.cwd()));
const outRel = flag('--out', 'browse/catalog.json');
const outPath = resolve(root, outRel);

// ── helpers ──────────────────────────────────────────────────────────────────
function isDir(p) {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function listDirs(p) {
  if (!isDir(p)) return [];
  return readdirSync(p, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
    .map((d) => d.name)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function listFiles(p) {
  if (!isDir(p)) return [];
  return readdirSync(p, { withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => d.name);
}

function rel(from, to) {
  return relative(from, to).split('\\').join('/');
}

/** First markdown H1 walking up from dir toward stopAt (inclusive stop). */
function nearestHeading(dir, stopAt) {
  let cur = dir;
  const stop = resolve(stopAt);
  while (true) {
    const readme = join(cur, 'README.md');
    if (existsSync(readme)) {
      const text = readFileSync(readme, 'utf8');
      const m = text.match(/^#\s+(.+)$/m);
      if (m) {
        // strip backticks / trailing path noise for short labels
        return m[1]
          .replace(/`[^`]+`/g, '')
          .replace(/\s*[—–-].*$/, '')
          .replace(/\s+/g, ' ')
          .trim();
      }
    }
    if (resolve(cur) === stop) break;
    const parent = dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  return null;
}

function parseLeafId(id) {
  const m = id.match(/^(\d+)[-_](.+)$/);
  if (m) {
    return {
      n: parseInt(m[1], 10),
      title: humanize(m[2]),
    };
  }
  return { n: null, title: humanize(id) };
}

function humanize(slug) {
  return slug
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\b(A|An|The|Of|And|Or|To|In|On|For|By|With)\b/g, (w) =>
      w.toLowerCase(),
    )
    .replace(/^\w/, (c) => c.toUpperCase());
}

function shortRouteLabel(id, heading) {
  if (heading) {
    // Prefer last path-ish segment from heading when it looks long
    const cleaned = heading
      .replace(/^views\//i, '')
      .replace(/^\/+/, '')
      .trim();
    if (cleaned.length <= 40) return cleaned;
  }
  // drop common tempo prefixes for display
  return id
    .replace(/^talking-/, '')
    .replace(/^glancing-/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function assetMap(leafDir, rootDir) {
  const files = listFiles(leafDir);
  const pick = (name) =>
    files.includes(name) ? rel(rootDir, join(leafDir, name)) : null;
  return {
    darkHtml: pick('dark.html'),
    lightHtml: pick('light.html'),
    darkPng: pick('dark.png'),
    lightPng: pick('light.png'),
    darkMobile: pick('dark-mobile.png'),
    lightMobile: pick('light-mobile.png'),
    darkPdf: pick('dark.pdf'),
    lightPdf: pick('light.pdf'),
  };
}

function warnUnpaired(path, assets, warnings) {
  if (assets.darkHtml && !assets.lightHtml) {
    warnings.push(`unpaired dark-only: ${path}`);
  }
  if (assets.lightHtml && !assets.darkHtml) {
    warnings.push(`unpaired light-only: ${path}`);
  }
}

// ── coverage from manifest (optional) ────────────────────────────────────────
function loadCoverage(rootDir) {
  const man = join(rootDir, 'manifest.json');
  if (!existsSync(man)) return new Map();
  try {
    const data = JSON.parse(readFileSync(man, 'utf8'));
    const cov = data.coverage || {};
    const byPath = new Map();
    for (const [key, claim] of Object.entries(cov)) {
      if (claim && claim.path) {
        const p = claim.path.replace(/\/$/, '');
        byPath.set(p, { key, ...claim });
      }
    }
    return byPath;
  } catch {
    return new Map();
  }
}

function coverageFor(path, byPath) {
  const norm = path.replace(/\/$/, '');
  if (byPath.has(norm)) {
    const c = byPath.get(norm);
    return c.status === 'deferred'
      ? { status: 'deferred', reason: c.reason || '' }
      : { status: c.status || 'mocked' };
  }
  // try with/without views/ prefix
  const alt = norm.startsWith('views/') ? norm.slice(6) : `views/${norm}`;
  if (byPath.has(alt)) {
    const c = byPath.get(alt);
    return c.status === 'deferred'
      ? { status: 'deferred', reason: c.reason || '' }
      : { status: c.status || 'mocked' };
  }
  return null;
}

// ── scan views ───────────────────────────────────────────────────────────────
/**
 * Find every directory under views/ that contains dark.html or light.html.
 * Skip directories named like tooling (_lower is a file; _shell is a route).
 */
function findViewLeaves(viewsDir) {
  const leaves = [];
  function walk(dir) {
    const files = listFiles(dir);
    if (files.includes('dark.html') || files.includes('light.html')) {
      leaves.push(dir);
      return; // leaf — do not walk into nested content
    }
    for (const name of listDirs(dir)) {
      // skip pure tooling dirs if any appear
      if (name === 'node_modules') continue;
      walk(join(dir, name));
    }
  }
  if (isDir(viewsDir)) walk(viewsDir);
  return leaves.sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );
}

function buildViewsLayer(rootDir, coverage, warnings) {
  const viewsDir = join(rootDir, 'views');
  if (!isDir(viewsDir)) return null;

  const leaves = findViewLeaves(viewsDir);
  /** routeId → stateId → leaves[] */
  const tree = new Map();

  for (const leafDir of leaves) {
    const relPath = rel(rootDir, leafDir); // views/route/...
    const segs = rel(viewsDir, leafDir).split('/').filter(Boolean);
    if (segs.length === 0) continue;

    const routeId = segs[0];
    let stateId;
    let leafId;
    if (segs.length === 1) {
      // single-state route: views/home/dark.html
      stateId = '_base';
      leafId = segs[0];
    } else if (segs.length === 2) {
      // views/capture-in-app/01-toast OR views/route/state with dark at state
      // If the last segment looks like a numbered leaf OR the parent is route
      // and this dir has html, treat as: route / leaf with synthetic state "_".
      // Convention in skill: stateful-route/{state}/ or {surface}/{state}/
      // sidequest: talking-bucket/all/01-populated (3 segs) or capture/01-x (2)
      stateId = '_';
      leafId = segs[1];
    } else {
      // route / state... / leaf  — last is leaf, middle joined as state path
      leafId = segs[segs.length - 1];
      stateId = segs.slice(1, -1).join('/');
    }

    if (!tree.has(routeId)) tree.set(routeId, new Map());
    const states = tree.get(routeId);
    if (!states.has(stateId)) states.set(stateId, []);

    const assets = assetMap(leafDir, rootDir);
    warnUnpaired(relPath, assets, warnings);
    const { n, title } = parseLeafId(leafId);
    const cov = coverageFor(relPath, coverage);

    states.get(stateId).push({
      id: leafId,
      path: relPath,
      n,
      title: segs.length === 1 ? shortRouteLabel(routeId) : title,
      assets,
      ...(cov ? { coverage: cov } : {}),
    });
  }

  const routes = [];
  for (const [routeId, states] of [...tree.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    const routeDir = join(viewsDir, routeId);
    const heading = nearestHeading(routeDir, viewsDir);
    const stateList = [];
    for (const [stateId, leafs] of [...states.entries()].sort((a, b) =>
      a[0].localeCompare(b[0], undefined, { numeric: true }),
    )) {
      leafs.sort((a, b) => {
        if (a.n != null && b.n != null) return a.n - b.n;
        if (a.n != null) return -1;
        if (b.n != null) return 1;
        return a.id.localeCompare(b.id, undefined, { numeric: true });
      });
      stateList.push({
        id: stateId,
        label: stateId === '_' || stateId === '_base' ? 'base' : stateId,
        leaves: leafs,
      });
    }
    const leafCount = stateList.reduce((s, st) => s + st.leaves.length, 0);
    routes.push({
      id: routeId,
      label: shortRouteLabel(routeId, heading),
      readme: existsSync(join(routeDir, 'README.md'))
        ? rel(rootDir, join(routeDir, 'README.md'))
        : null,
      leafCount,
      states: stateList,
    });
  }

  const total = routes.reduce((s, r) => s + r.leafCount, 0);
  return { routes, total };
}

// ── scan component layers ────────────────────────────────────────────────────
function buildComponentLayer(rootDir, layer, warnings) {
  const layerDir = join(rootDir, layer);
  if (!isDir(layerDir)) return [];

  const items = [];
  for (const name of listDirs(layerDir)) {
    if (name.startsWith('_')) continue;
    const compDir = join(layerDir, name);
    const files = listFiles(compDir);
    if (!files.includes('dark.html') && !files.includes('light.html')) continue;
    const path = rel(rootDir, compDir);
    const assets = assetMap(compDir, rootDir);
    warnUnpaired(path, assets, warnings);
    const heading = nearestHeading(compDir, layerDir);
    items.push({
      id: name,
      path,
      label: heading && heading.length <= 48 ? heading : humanize(name),
      assets,
    });
  }
  return items;
}

// ── main ─────────────────────────────────────────────────────────────────────
const warnings = [];
const coverage = loadCoverage(root);

const layers = {};
let any = false;

if (!onlyLayer || onlyLayer === 'views') {
  const views = buildViewsLayer(root, coverage, warnings);
  if (views) {
    layers.views = { routes: views.routes };
    any = true;
  }
}

for (const layer of ['atoms', 'molecules', 'organisms']) {
  if (onlyLayer && onlyLayer !== layer) continue;
  const items = buildComponentLayer(root, layer, warnings);
  if (items.length) {
    layers[layer] = items;
    any = true;
  }
}

if (!any) {
  console.error(
    `_build-catalog.mjs: no design-deconstruct layers found under ${root}`,
  );
  process.exit(1);
}

const counts = {
  views: layers.views
    ? layers.views.routes.reduce((s, r) => s + r.leafCount, 0)
    : 0,
  atoms: layers.atoms?.length ?? 0,
  molecules: layers.molecules?.length ?? 0,
  organisms: layers.organisms?.length ?? 0,
};

// theme availability
const themes = [];
if (existsSync(join(root, 'tokens', 'theme.dark.json')) || counts.views || counts.atoms) {
  themes.push('dark', 'light');
}

// source hint from manifest
let source = null;
try {
  const man = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
  source = man.concept?.original || man.concept?.decoded || man.source || null;
  if (typeof source === 'object' && source?.path) source = source.path;
} catch {
  /* optional */
}

const catalog = {
  version: 1,
  generatedAt: new Date().toISOString(),
  generator: 'deconstruct-engine/_build-catalog.mjs',
  systemRoot: '.',
  source,
  themes,
  counts,
  layers,
};

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(catalog, null, 2) + '\n');

for (const w of warnings) console.warn('  warn:', w);
console.log(
  `catalog written → ${rel(root, outPath)} · views ${counts.views} · atoms ${counts.atoms} · molecules ${counts.molecules} · organisms ${counts.organisms}`,
);
