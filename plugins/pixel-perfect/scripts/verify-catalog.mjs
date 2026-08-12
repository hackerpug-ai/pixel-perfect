#!/usr/bin/env node
// verify-catalog.mjs — deterministic catalog-capture gate.
//
// Runs the project's sandbox capture command (or a structural catalog walk), then
// compares the resulting structural artifacts to committed goldens. Staleness is
// never stored — it is computed at read time by re-capturing and diffing.
//
// Zero runtime dependencies. Exit vocabulary matches verify-styling-contract.mjs:
//   0 pass · 1 drift/violations · 2 config/usage error · 3 vacuous scan
//
// Usage:
//   node verify-catalog.mjs <mode> <project-root> [options]
//
// Modes (exactly one):
//   --baseline            capture → write goldens (after a layer is approved)
//   --check               capture → diff vs goldens; non-zero on unreviewed drift
//   --blast <name>        perturb <name>, report which stories move (downstream)
//   --reach <name...>     report which live roots each name reaches (upstream)
//   --accept <glob>       promote drifted captures to goldens (intentional change)
//
// Options:
//   --platform <id>       platform key in design/manifest.json (default: sole platform, else required)
//   --json                emit only the JSON report on stdout
//   --layer <layer>       restrict to one layer (atoms|molecules|organisms|screens|tokens)
//   --perturb-dir <path>  directory of story sources used for --blast/--reach (default: sandbox/catalog)

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, relative, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";

// ---------------------------------------------------------------------------
// Glob matcher (same subset as verify-styling-contract.mjs)
// ---------------------------------------------------------------------------

function braceExpand(pattern) {
  const start = pattern.indexOf("{");
  if (start === -1) return [pattern];
  let depth = 0;
  let end = -1;
  for (let i = start; i < pattern.length; i++) {
    if (pattern[i] === "{") depth++;
    else if (pattern[i] === "}") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end === -1) return [pattern];
  const head = pattern.slice(0, start);
  const body = pattern.slice(start + 1, end);
  const tail = pattern.slice(end + 1);
  const out = [];
  for (const opt of body.split(",")) {
    for (const expanded of braceExpand(tail)) out.push(head + opt + expanded);
  }
  return out;
}

const escapeRe = (s) => s.replace(/[.+()$^|\\]/g, "\\$&");

function globToRegex(pattern) {
  let r = "^";
  let i = 0;
  while (i < pattern.length) {
    const c = pattern[i];
    if (c === "*" && pattern[i + 1] === "*") {
      i += 2;
      if (pattern[i] === "/") {
        i++;
        r += "(?:.*/)?";
      } else {
        r += ".*";
      }
    } else if (c === "*") {
      r += "[^/]*";
      i++;
    } else if (c === "?") {
      r += "[^/]";
      i++;
    } else if (c === "[") {
      const j = pattern.indexOf("]", i + 1);
      if (j === -1) {
        r += "\\[";
        i++;
      } else {
        let cls = pattern.slice(i + 1, j);
        if (cls.startsWith("!")) cls = "^" + cls.slice(1);
        r += "[" + cls + "]";
        i = j + 1;
      }
    } else if (c === "/") {
      r += "/";
      i++;
    } else {
      r += escapeRe(c);
      i++;
    }
  }
  return new RegExp(r + "$");
}

function makeMatcher(patterns) {
  const expanded = [];
  for (const p of patterns) for (const e of braceExpand(p)) expanded.push(globToRegex(e));
  return (path) => expanded.some((re) => re.test(path));
}

// ---------------------------------------------------------------------------
// FS helpers
// ---------------------------------------------------------------------------

const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", ".next", ".turbo", "coverage", ".cache"]);
const STRUCTURAL_EXTS = new Set([".txt", ".dom", ".json", ".html", ".tree"]);

function walkFiles(root, acc = []) {
  let entries;
  try {
    entries = readdirSync(root);
  } catch {
    return acc;
  }
  for (const name of entries) {
    if (name.startsWith(".") && name !== ".captures") continue;
    const full = join(root, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      if (SKIP_DIRS.has(name)) continue;
      walkFiles(full, acc);
    } else {
      acc.push(full);
    }
  }
  return acc;
}

function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
}

function writeText(path, content) {
  ensureDir(dirname(path));
  writeFileSync(path, content, "utf8");
}

function relPosix(from, to) {
  return relative(from, to).split(sep).join("/");
}

// ---------------------------------------------------------------------------
// Normalization — strip volatile output before write/diff
// ---------------------------------------------------------------------------

/**
 * Normalize a structural capture so machine-local noise never becomes drift.
 * Strips framework-generated ids, hash-suffixed class names, absolute paths,
 * and timestamps. Determinism requirements from the living-design-system plan.
 */
export function normalizeCapture(text, projectRoot = "") {
  let out = String(text).replace(/\r\n/g, "\n");
  // absolute paths → <root>
  if (projectRoot) {
    const abs = resolve(projectRoot).split(sep).join("/");
    const absEsc = escapeRe(abs);
    out = out.replace(new RegExp(absEsc, "g"), "<root>");
  }
  // common absolute path shapes
  out = out.replace(/(?:\/Users|\/home|\/var|\/tmp|C:\\Users)[^\s"'`]+/g, "<abs>");
  // data-reactid / data-testid auto ids with long hashes
  out = out.replace(/\b(?:id|data-id|data-reactid)=["'][^"']*["']/gi, (m) => {
    if (/[a-f0-9]{8,}/i.test(m)) return m.replace(/["'][^"']*["']/, '="<id>"');
    return m;
  });
  // CSS modules / styled-components hash suffixes: Foo_a1b2c3d
  out = out.replace(/\b([A-Za-z][A-Za-z0-9]*)[_-][a-f0-9]{5,}\b/g, "$1_<hash>");
  // ISO timestamps
  out = out.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?/g, "<ts>");
  // unix ms timestamps in obvious contexts
  out = out.replace(/\b1[6-9]\d{11}\b/g, "<epoch>");
  // trailing whitespace per line
  out = out
    .split("\n")
    .map((l) => l.replace(/[ \t]+$/g, ""))
    .join("\n");
  if (!out.endsWith("\n")) out += "\n";
  return out;
}

export function fingerprint(text) {
  return createHash("sha256").update(text).digest("hex").slice(0, 16);
}

// ---------------------------------------------------------------------------
// Manifest / capture config
// ---------------------------------------------------------------------------

function loadManifest(projectRoot) {
  const path = join(projectRoot, "design", "manifest.json");
  if (!existsSync(path)) {
    throw new Error(`No design/manifest.json under ${projectRoot}`);
  }
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    throw new Error(`design/manifest.json is not valid JSON: ${e.message}`);
  }
}

function resolvePlatform(manifest, requested) {
  const platforms = manifest.platforms && typeof manifest.platforms === "object" ? manifest.platforms : null;
  if (!platforms || Object.keys(platforms).length === 0) {
    // allow top-level capture without platforms for fixtures
    if (manifest.capture) {
      return { id: requested || "default", config: manifest };
    }
    throw new Error("manifest has no platforms and no top-level capture config");
  }
  const ids = Object.keys(platforms);
  if (requested) {
    if (!platforms[requested]) throw new Error(`Unknown platform "${requested}". Known: ${ids.join(", ")}`);
    return { id: requested, config: platforms[requested] };
  }
  if (ids.length === 1) return { id: ids[0], config: platforms[ids[0]] };
  throw new Error(`Multiple platforms (${ids.join(", ")}); pass --platform <id>`);
}

function resolveCaptureConfig(platformConfig, platformId) {
  const capture = platformConfig.capture || {};
  const goldens = capture.goldens || `design/goldens/${platformId}`;
  const medium = capture.medium || "text";
  const command = capture.command || null;
  const catalogDir = capture.catalog || "sandbox/catalog";
  const staging = capture.staging || `design/.captures/${platformId}`;
  return { goldens, medium, command, catalogDir, staging, captured_at: capture.captured_at || null };
}

// ---------------------------------------------------------------------------
// Capture: run project command OR walk structural catalog sources
// ---------------------------------------------------------------------------

/**
 * Resolve live composition markers so dependents re-capture when a composed
 * entity changes. Markers:
 *   @compose Name            — inline the current default state of Name
 *   --- composed:Name ---    — same, optional body until --- end --- is replaced
 *
 * A story that *re-implements* instead of composing has no marker and will not
 * move when the dependency is perturbed (the composition mutation check).
 */
function resolveCompositions(raw, catalogRoot, stack = []) {
  // @compose Name
  let out = raw.replace(/@compose\s+([A-Za-z][A-Za-z0-9]*)/g, (_, depName) => {
    if (stack.includes(depName)) return `@compose ${depName} /*cycle*/`;
    const body = readComposee(catalogRoot, depName);
    if (body == null) return `@compose ${depName} /*missing*/`;
    return resolveCompositions(body, catalogRoot, [...stack, depName]).trimEnd();
  });
  // --- composed:Name --- ... --- end ---  (body ignored; live source wins)
  out = out.replace(
    /---\s*composed:([A-Za-z][A-Za-z0-9]*)\s*---[\s\S]*?---\s*end\s*---/g,
    (_, depName) => {
      if (stack.includes(depName)) return `--- composed:${depName} --- /*cycle*/ --- end ---`;
      const body = readComposee(catalogRoot, depName);
      if (body == null) return `--- composed:${depName} --- /*missing*/ --- end ---`;
      const resolved = resolveCompositions(body, catalogRoot, [...stack, depName]).trimEnd();
      return `--- composed:${depName} ---\n${resolved}\n--- end ---`;
    },
  );
  return out;
}

function readComposee(catalogRoot, name) {
  // Prefer default.txt under any layer; first match wins (atoms before molecules by walk order)
  const hits = [];
  for (const full of walkFiles(catalogRoot)) {
    const rel = relPosix(catalogRoot, full);
    const parts = rel.split("/");
    if (parts.length < 3) continue;
    if (parts[1] === name && parts[2].startsWith("default.")) hits.push(full);
  }
  if (hits.length === 0) return null;
  return readFileSync(hits[0], "utf8");
}

/**
 * Built-in structural capture for the fixture / text medium.
 * Walks `{catalogDir}/{layer}/{name}/{state}.{ext}` and writes normalized
 * artifacts to staging with the same layout. Composition is resolved live from
 * `@compose` / `--- composed:Name ---` markers so blast/reach measure real reachability.
 */
export function captureFromCatalog(projectRoot, catalogRel, stagingRel, layerFilter = null) {
  const catalogRoot = join(projectRoot, catalogRel);
  if (!existsSync(catalogRoot)) {
    throw new Error(`Catalog directory not found: ${catalogRel} (under ${projectRoot})`);
  }
  const stagingRoot = join(projectRoot, stagingRel);
  // clean staging for this run
  if (existsSync(stagingRoot)) rmSync(stagingRoot, { recursive: true, force: true });
  ensureDir(stagingRoot);

  const files = walkFiles(catalogRoot);
  const stories = [];
  for (const full of files) {
    const rel = relPosix(catalogRoot, full);
    const parts = rel.split("/");
    // expect layer/name/state.ext
    if (parts.length < 3) continue;
    const [layer, name, file] = parts;
    if (layerFilter && layer !== layerFilter) continue;
    const dot = file.lastIndexOf(".");
    if (dot === -1) continue;
    const state = file.slice(0, dot);
    const ext = file.slice(dot);
    if (!STRUCTURAL_EXTS.has(ext) && ext !== ".png") continue;
    // structural gate uses text-like media; skip binary png for authoritative compare
    if (ext === ".png") continue;
    const raw = readFileSync(full, "utf8");
    const composed = resolveCompositions(raw, catalogRoot, [name]);
    const normalized = normalizeCapture(composed, projectRoot);
    const outRel = `${layer}/${name}/${state}${ext === ".txt" ? ".txt" : ext}`;
    const outFull = join(stagingRoot, outRel);
    writeText(outFull, normalized);
    stories.push({
      layer,
      name,
      state,
      rel: outRel,
      hash: fingerprint(normalized),
      bytes: Buffer.byteLength(normalized, "utf8"),
    });
  }
  return { stories, stagingRel, count: stories.length };
}

function runCaptureCommand(projectRoot, command, stagingRel) {
  const stagingRoot = join(projectRoot, stagingRel);
  if (existsSync(stagingRoot)) rmSync(stagingRoot, { recursive: true, force: true });
  ensureDir(stagingRoot);
  const env = { ...process.env, PIXEL_PERFECT_CAPTURE_OUT: stagingRoot };
  const result = spawnSync(command, {
    cwd: projectRoot,
    env,
    shell: true,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    const err = (result.stderr || result.stdout || "").trim() || `exit ${result.status}`;
    throw new Error(`capture command failed: ${err}`);
  }
  // inventory what landed
  const files = walkFiles(stagingRoot);
  const stories = [];
  for (const full of files) {
    const rel = relPosix(stagingRoot, full);
    const parts = rel.split("/");
    if (parts.length < 3) continue;
    const [layer, name, file] = parts;
    const dot = file.lastIndexOf(".");
    if (dot === -1) continue;
    const state = file.slice(0, dot);
    const ext = file.slice(dot);
    if (ext === ".png") continue; // visual review only
    let content;
    try {
      content = normalizeCapture(readFileSync(full, "utf8"), projectRoot);
    } catch {
      continue;
    }
    // re-write normalized
    writeText(full, content);
    stories.push({
      layer,
      name,
      state,
      rel,
      hash: fingerprint(content),
      bytes: Buffer.byteLength(content, "utf8"),
    });
  }
  return { stories, stagingRel, count: stories.length };
}

export function runCapture(projectRoot, captureCfg, layerFilter = null) {
  // Prefer catalog walk when catalog dir exists (deterministic, no shell).
  // Fall back to capture.command when catalog is absent.
  const catalogAbs = join(projectRoot, captureCfg.catalogDir);
  if (existsSync(catalogAbs)) {
    return captureFromCatalog(projectRoot, captureCfg.catalogDir, captureCfg.staging, layerFilter);
  }
  if (captureCfg.command) {
    return runCaptureCommand(projectRoot, captureCfg.command, captureCfg.staging);
  }
  throw new Error(
    `No catalog at ${captureCfg.catalogDir} and no capture.command in manifest — cannot capture`,
  );
}

// ---------------------------------------------------------------------------
// Inventory goldens / staging
// ---------------------------------------------------------------------------

function inventoryDir(root, baseRel) {
  const abs = join(root, baseRel);
  if (!existsSync(abs)) return [];
  const out = [];
  for (const full of walkFiles(abs)) {
    const rel = relPosix(abs, full);
    const parts = rel.split("/");
    if (parts.length < 3) continue;
    const [layer, name, file] = parts;
    const dot = file.lastIndexOf(".");
    if (dot === -1) continue;
    const state = file.slice(0, dot);
    const ext = file.slice(dot);
    if (ext === ".png") continue;
    let content;
    try {
      content = readFileSync(full, "utf8");
    } catch {
      continue;
    }
    out.push({
      layer,
      name,
      state,
      rel,
      hash: fingerprint(content),
      bytes: Buffer.byteLength(content, "utf8"),
      full,
    });
  }
  return out;
}

function storyKey(s) {
  return `${s.layer}/${s.name}/${s.state}`;
}

// ---------------------------------------------------------------------------
// Modes
// ---------------------------------------------------------------------------

function modeBaseline(projectRoot, captureCfg, layerFilter) {
  const capture = runCapture(projectRoot, captureCfg, layerFilter);
  if (capture.count === 0) {
    return {
      mode: "baseline",
      exit: 3,
      vacuous: true,
      message: `Zero stories captured under ${captureCfg.catalogDir || captureCfg.command}`,
      stories: [],
      written: [],
    };
  }
  const goldensRoot = join(projectRoot, captureCfg.goldens);
  ensureDir(goldensRoot);
  const written = [];
  for (const s of capture.stories) {
    const src = join(projectRoot, captureCfg.staging, s.rel);
    const dst = join(goldensRoot, s.rel);
    ensureDir(dirname(dst));
    copyFileSync(src, dst);
    written.push(s.rel);
  }
  return {
    mode: "baseline",
    exit: 0,
    vacuous: false,
    message: `Wrote ${written.length} golden(s) under ${captureCfg.goldens}`,
    stories: capture.stories,
    written,
  };
}

function modeCheck(projectRoot, captureCfg, layerFilter) {
  const capture = runCapture(projectRoot, captureCfg, layerFilter);
  if (capture.count === 0) {
    return {
      mode: "check",
      exit: 3,
      vacuous: true,
      message: `Zero stories captured — vacuous scan (never a pass)`,
      stories: [],
      drifted: [],
      missing: [],
      extra: [],
    };
  }
  const goldens = inventoryDir(projectRoot, captureCfg.goldens);
  const goldenByKey = new Map(goldens.map((g) => [storyKey(g), g]));
  const capByKey = new Map(capture.stories.map((s) => [storyKey(s), s]));

  const drifted = [];
  const missing = [];
  const extra = [];

  for (const s of capture.stories) {
    const g = goldenByKey.get(storyKey(s));
    if (!g) {
      extra.push({ key: storyKey(s), rel: s.rel, reason: "no golden" });
      continue;
    }
    if (g.hash !== s.hash) {
      drifted.push({ key: storyKey(s), rel: s.rel, goldenHash: g.hash, captureHash: s.hash });
    }
  }
  for (const g of goldens) {
    if (layerFilter && g.layer !== layerFilter) continue;
    if (!capByKey.has(storyKey(g))) {
      missing.push({ key: storyKey(g), rel: g.rel, reason: "story gone from capture" });
    }
  }

  const violations = drifted.length + missing.length + extra.length;
  return {
    mode: "check",
    exit: violations === 0 ? 0 : 1,
    vacuous: false,
    message:
      violations === 0
        ? `Catalog matches goldens (${capture.count} stor${capture.count === 1 ? "y" : "ies"})`
        : `Drift: ${drifted.length} changed, ${missing.length} missing goldens, ${extra.length} new stories`,
    stories: capture.stories,
    drifted,
    missing,
    extra,
  };
}

function modeAccept(projectRoot, captureCfg, globPattern, layerFilter) {
  if (!globPattern) throw new Error("--accept requires a glob (e.g. '**' or 'atoms/Button/**')");
  const match = makeMatcher([globPattern, globPattern.endsWith("/**") ? globPattern : `${globPattern}/**`, globPattern]);
  const capture = runCapture(projectRoot, captureCfg, layerFilter);
  if (capture.count === 0) {
    return {
      mode: "accept",
      exit: 3,
      vacuous: true,
      message: "Zero stories captured — nothing to accept",
      accepted: [],
    };
  }
  const goldensRoot = join(projectRoot, captureCfg.goldens);
  ensureDir(goldensRoot);
  const accepted = [];
  for (const s of capture.stories) {
    if (!match(s.rel) && !match(storyKey(s)) && !match(`${s.layer}/${s.name}/**`)) continue;
    const src = join(projectRoot, captureCfg.staging, s.rel);
    const dst = join(goldensRoot, s.rel);
    ensureDir(dirname(dst));
    copyFileSync(src, dst);
    accepted.push(s.rel);
  }
  if (accepted.length === 0) {
    return {
      mode: "accept",
      exit: 1,
      vacuous: false,
      message: `No captured stories matched accept glob "${globPattern}"`,
      accepted: [],
    };
  }
  return {
    mode: "accept",
    exit: 0,
    vacuous: false,
    message: `Accepted ${accepted.length} golden(s) matching "${globPattern}"`,
    accepted,
  };
}

/**
 * Find catalog source files for a component name (any layer/state).
 * Used by blast/reach to perturb real story sources, not goldens.
 */
function findCatalogSources(projectRoot, catalogRel, name) {
  const catalogRoot = join(projectRoot, catalogRel);
  if (!existsSync(catalogRoot)) return [];
  const hits = [];
  for (const full of walkFiles(catalogRoot)) {
    const rel = relPosix(catalogRoot, full);
    const parts = rel.split("/");
    if (parts.length < 3) continue;
    if (parts[1] === name) hits.push({ full, rel, layer: parts[0], name: parts[1] });
  }
  return hits;
}

function modeBlast(projectRoot, captureCfg, name, layerFilter) {
  if (!name) throw new Error("--blast requires a component name");
  const before = runCapture(projectRoot, captureCfg, layerFilter);
  if (before.count === 0) {
    return {
      mode: "blast",
      exit: 3,
      vacuous: true,
      message: "Zero stories captured — cannot compute blast radius",
      name,
      moved: [],
    };
  }
  const sources = findCatalogSources(projectRoot, captureCfg.catalogDir, name);
  if (sources.length === 0) {
    return {
      mode: "blast",
      exit: 2,
      vacuous: false,
      message: `No catalog sources found for "${name}" under ${captureCfg.catalogDir}`,
      name,
      moved: [],
    };
  }

  // Perturb every matching source, re-capture, restore.
  const backups = sources.map((s) => ({ full: s.full, content: readFileSync(s.full, "utf8") }));
  try {
    for (const s of sources) {
      const raw = readFileSync(s.full, "utf8");
      writeFileSync(s.full, raw + `\n/* PERTURB:${name}:${Date.now()} */\n`, "utf8");
    }
    const after = runCapture(projectRoot, captureCfg, layerFilter);
    const beforeMap = new Map(before.stories.map((s) => [storyKey(s), s]));
    const moved = [];
    for (const s of after.stories) {
      const prev = beforeMap.get(storyKey(s));
      if (!prev || prev.hash !== s.hash) {
        moved.push({ key: storyKey(s), layer: s.layer, name: s.name, state: s.state });
      }
    }
    // Also report brand-new keys if any
    return {
      mode: "blast",
      exit: 0,
      vacuous: false,
      message: `Perturbed "${name}": ${moved.length} stor${moved.length === 1 ? "y" : "ies"} moved`,
      name,
      sources: sources.map((s) => s.rel),
      moved,
      beforeCount: before.count,
      afterCount: after.count,
    };
  } finally {
    for (const b of backups) writeFileSync(b.full, b.content, "utf8");
  }
}

/**
 * --reach: for each named component, report which live-root stories (screens)
 * move when it is perturbed. Upstream question of the same perturbation.
 */
function modeReach(projectRoot, captureCfg, names, layerFilter) {
  if (!names.length) throw new Error("--reach requires one or more component names");
  const results = [];
  let anyVacuous = false;
  let anyConfig = false;
  for (const name of names) {
    const blast = modeBlast(projectRoot, captureCfg, name, layerFilter);
    if (blast.exit === 3) anyVacuous = true;
    if (blast.exit === 2) anyConfig = true;
    const liveRoots = (blast.moved || []).filter(
      (m) => m.layer === "screens" || m.layer === "views" || m.layer === "Screens" || m.layer === "Views",
    );
    // If no screen layer exists in this catalog, treat any non-self story as a "live root"
    // for fixture projects that only model atoms/molecules.
    const roots =
      liveRoots.length > 0
        ? liveRoots
        : (blast.moved || []).filter((m) => m.name !== name);
    results.push({
      name,
      reaches: roots,
      moved: blast.moved || [],
      exit: blast.exit,
      message: blast.message,
    });
  }
  const exit = anyConfig ? 2 : anyVacuous ? 3 : 0;
  return {
    mode: "reach",
    exit,
    vacuous: anyVacuous,
    message: results.map((r) => `${r.name} → ${r.reaches.map((x) => x.key).join(", ") || "(no live roots)"}`).join("; "),
    results,
  };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function usage() {
  process.stderr.write(
    "Usage: verify-catalog.mjs <mode> <project-root> [options]\n" +
      "  Modes: --baseline | --check | --blast <name> | --reach <name...> | --accept <glob>\n" +
      "  Options: --platform <id>  --layer <layer>  --json\n" +
      "  Exit: 0 pass · 1 drift · 2 config/usage · 3 vacuous (zero stories)\n",
  );
}

function parseArgs(argv) {
  const positional = [];
  let mode = null;
  let blastName = null;
  const reachNames = [];
  let acceptGlob = null;
  let platform = null;
  let layer = null;
  let jsonOnly = false;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-h" || a === "--help") return { help: true };
    if (a === "--json") {
      jsonOnly = true;
      continue;
    }
    if (a === "--platform") {
      platform = argv[++i];
      continue;
    }
    if (a === "--layer") {
      layer = argv[++i];
      continue;
    }
    if (a === "--baseline" || a === "--check") {
      if (mode) throw new Error("Only one mode is allowed");
      mode = a.slice(2);
      continue;
    }
    if (a === "--blast") {
      if (mode) throw new Error("Only one mode is allowed");
      mode = "blast";
      blastName = argv[++i];
      if (!blastName || blastName.startsWith("--")) throw new Error("--blast requires a name");
      continue;
    }
    if (a === "--reach") {
      if (mode) throw new Error("Only one mode is allowed");
      mode = "reach";
      // Collect component names only — stop before a path-like / existing-dir arg
      // so the project-root positional is not swallowed.
      while (argv[i + 1] && !argv[i + 1].startsWith("--")) {
        const next = argv[i + 1];
        const looksLikePath =
          next === "." ||
          next === ".." ||
          next.includes("/") ||
          next.includes("\\") ||
          /^[A-Za-z]:[\\/]/.test(next);
        if (looksLikePath) break;
        try {
          if (existsSync(resolve(next)) && statSync(resolve(next)).isDirectory()) break;
        } catch {
          /* not a dir */
        }
        reachNames.push(argv[++i]);
      }
      if (reachNames.length === 0) throw new Error("--reach requires one or more names");
      continue;
    }
    if (a === "--accept") {
      if (mode) throw new Error("Only one mode is allowed");
      mode = "accept";
      acceptGlob = argv[++i];
      if (!acceptGlob || acceptGlob.startsWith("--")) throw new Error("--accept requires a glob");
      continue;
    }
    if (a.startsWith("--")) throw new Error(`Unknown option: ${a}`);
    positional.push(a);
  }
  return { help: false, mode, blastName, reachNames, acceptGlob, platform, layer, jsonOnly, positional };
}

export function main(argv) {
  let parsed;
  try {
    parsed = parseArgs(argv);
  } catch (e) {
    process.stderr.write(`USAGE ERROR: ${e.message}\n`);
    usage();
    return 2;
  }
  if (parsed.help) {
    usage();
    return 0;
  }
  if (!parsed.mode || parsed.positional.length < 1) {
    usage();
    return 2;
  }
  const projectRoot = resolve(parsed.positional[0]);
  if (!existsSync(projectRoot) || !statSync(projectRoot).isDirectory()) {
    process.stderr.write(`CONFIG ERROR: project root not found: ${projectRoot}\n`);
    return 2;
  }

  let report;
  try {
    const manifest = loadManifest(projectRoot);
    const { id: platformId, config: platformConfig } = resolvePlatform(manifest, parsed.platform);
    const captureCfg = resolveCaptureConfig(platformConfig, platformId);

    switch (parsed.mode) {
      case "baseline":
        report = modeBaseline(projectRoot, captureCfg, parsed.layer);
        break;
      case "check":
        report = modeCheck(projectRoot, captureCfg, parsed.layer);
        break;
      case "accept":
        report = modeAccept(projectRoot, captureCfg, parsed.acceptGlob, parsed.layer);
        break;
      case "blast":
        report = modeBlast(projectRoot, captureCfg, parsed.blastName, parsed.layer);
        break;
      case "reach":
        report = modeReach(projectRoot, captureCfg, parsed.reachNames, parsed.layer);
        break;
      default:
        throw new Error(`Unknown mode: ${parsed.mode}`);
    }
    report.platform = platformId;
    report.goldens = captureCfg.goldens;
    report.medium = captureCfg.medium;
  } catch (e) {
    process.stderr.write(`CONFIG ERROR: ${e.message}\n`);
    return 2;
  }

  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  if (!parsed.jsonOnly) {
    const icon = report.exit === 0 ? "✓" : report.exit === 3 ? "∅" : "✗";
    process.stderr.write(`${icon} catalog ${report.mode}: ${report.message}\n`);
    if (report.drifted?.length) {
      for (const d of report.drifted) process.stderr.write(`  drift  ${d.key}\n`);
    }
    if (report.missing?.length) {
      for (const m of report.missing) process.stderr.write(`  missing golden  ${m.key}\n`);
    }
    if (report.extra?.length) {
      for (const e of report.extra) process.stderr.write(`  new story  ${e.key}\n`);
    }
    if (report.moved?.length) {
      for (const m of report.moved) process.stderr.write(`  moved  ${m.key}\n`);
    }
    if (report.results) {
      for (const r of report.results) {
        process.stderr.write(`  ${r.name} reaches: ${(r.reaches || []).map((x) => x.key).join(", ") || "(none)"}\n`);
      }
    }
  }
  return report.exit;
}

export {
  braceExpand,
  globToRegex,
  makeMatcher,
  loadManifest,
  resolvePlatform,
  resolveCaptureConfig,
  inventoryDir,
  storyKey,
  modeBaseline,
  modeCheck,
  modeAccept,
  modeBlast,
  modeReach,
  parseArgs,
};

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) process.exit(main(process.argv.slice(2)));
