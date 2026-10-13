#!/usr/bin/env node
// verify-catalog.mjs — deterministic catalog-capture gate.
//
// Runs the project's sandbox capture command (or a structural catalog walk), then
// compares the resulting structural artifacts to committed goldens. Staleness is
// never stored — it is computed at read time by re-capturing and diffing.
//
// Every capture needs pixels beside its structural artifact (unless the platform declares
// capture.pixels "none" with a reason). Goldens are written only by --baseline and --accept,
// and each write records a receipt, so a golden copied in by hand is refused by --check.
//
// Zero runtime dependencies. Exit vocabulary matches verify-styling-contract.mjs:
//   0 pass · 1 drift/violations · 2 config/usage error · 3 vacuous scan
//
// Usage:
//   node verify-catalog.mjs <mode> <project-root> [options]
//
// Modes (exactly one):
//   --baseline            capture → gate → write goldens and receipts (after a layer is approved)
//   --check               capture → gate → diff vs goldens; unreceipted goldens; non-zero on drift
//   --accept <glob>       promote drifted captures to goldens (intentional change)
//   --render              capture → pixel gate → print structural and PNG paths; writes no goldens
//   --audit               read goldens, receipts and sources; runs NO capture
//   --blast <name>        perturb <name>, report which stories move (downstream)
//   --reach <name...>     report which live roots each name reaches (upstream)
//
// Options:
//   --platform <id>       platform key in design/manifest.json (default: sole platform, else required)
//   --json                emit only the JSON report on stdout (suppress the stderr summary)
//   --layer <layer>       restrict to one layer (atoms|molecules|organisms|screens|tokens)
//   --only <layer>/<Name> restrict to one story's states; passed to the command as PIXEL_PERFECT_CAPTURE_ONLY
//   --out <dir>           staging directory for this run (default design/.captures/{platform})
//   --perturb-dir <path>  directory of story sources used for --blast/--reach (default: capture.catalog,
//                         else sandbox/catalog); {layer}/{Name}/… or flat {layer}/{Name}.{ext}
//
// Capture command environment (set by this script):
//   PIXEL_PERFECT_CAPTURE_OUT    staging directory the command must write to
//   PIXEL_PERFECT_CAPTURE_LAYER  the --layer value, when given
//   PIXEL_PERFECT_CAPTURE_ONLY   the --only value, when given
// A command may ignore the last two and capture everything; this script still restricts what it keeps.

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";
import { digest } from "./reference-revisions.mjs";
import { inspectPng } from "./png.mjs";

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
const RECEIPT_FILE = "receipt.json";

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

/** A project-relative path joins the root; an absolute path (from --out) stands on its own. */
function under(root, rel) {
  return isAbsolute(rel) ? rel : join(root, rel);
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

export function loadManifest(projectRoot) {
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

export function resolvePlatform(manifest, requested) {
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

const ITEM_LAYERS = ["atoms", "molecules", "organisms", "screens"];

/**
 * Resolve a platform's capture block. Throws on a declaration the gate cannot honor, so a bad
 * manifest is a config error (exit 2), never a silent pass.
 */
export function resolveCaptureConfig(platformConfig, platformId) {
  const capture = platformConfig.capture || {};
  const goldens = capture.goldens || `design/goldens/${platformId}`;
  const medium = capture.medium || "text";
  const command = capture.command || null;
  const catalogDir = capture.catalog || "sandbox/catalog";
  const staging = capture.staging || `design/.captures/${platformId}`;
  return {
    platform: platformId,
    goldens,
    medium,
    command,
    catalogDir,
    staging,
    captured_at: capture.captured_at || null,
    ...resolvePixels(capture),
    viewport: parseViewport(capture.viewport),
    scale: parseScale(capture.scale),
    items: manifestItems(platformConfig),
  };
}

function resolvePixels(capture) {
  const declared = capture.pixels;
  if (declared === undefined || declared === "required") return { pixels: "required", pixelsReason: null };
  if (declared === "none") {
    const reason = typeof capture.pixels_reason === "string" ? capture.pixels_reason.trim() : "";
    if (!reason) {
      throw new Error('capture.pixels is "none" but capture.pixels_reason is empty: state why no image is rendered');
    }
    return { pixels: "none", pixelsReason: reason };
  }
  throw new Error(`capture.pixels must be "required" or "none", got ${JSON.stringify(declared)}`);
}

function parseViewport(value) {
  if (value === undefined) return null;
  const m = /^(\d+)x(\d+)$/.exec(String(value));
  if (!m) throw new Error(`capture.viewport must be "WxH", got ${JSON.stringify(value)}`);
  return { width: Number(m[1]), height: Number(m[2]) };
}

function parseScale(value) {
  if (value === undefined) return 1;
  const n = Number(value);
  if (!(n > 0)) throw new Error(`capture.scale must be a positive number, got ${JSON.stringify(value)}`);
  return n;
}

/** Manifest items by "layer/name", carrying the file and story paths receipts hash. */
function manifestItems(platformConfig) {
  const items = {};
  for (const layer of ITEM_LAYERS) {
    for (const item of platformConfig[layer] || []) {
      if (item && item.name) items[`${layer}/${item.name}`] = { file: item.file, story: item.story };
    }
  }
  return items;
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

function storyRecord(layer, name, state, rel, content) {
  return {
    layer,
    name,
    state,
    rel,
    hash: fingerprint(content),
    bytes: Buffer.byteLength(content, "utf8"),
    empty: content.trim() === "",
  };
}

/**
 * Built-in structural capture for the fixture / text medium.
 * Walks `{catalogDir}/{layer}/{name}/{state}.{ext}` and writes normalized
 * artifacts to staging with the same layout. Composition is resolved live from
 * `@compose` / `--- composed:Name ---` markers so blast/reach measure real reachability.
 * A PNG found beside a structural artifact is copied into staging with it.
 */
export function captureFromCatalog(projectRoot, catalogRel, stagingRel, layerFilter = null) {
  const catalogRoot = join(projectRoot, catalogRel);
  if (!existsSync(catalogRoot)) {
    throw new Error(`Catalog directory not found: ${catalogRel} (under ${projectRoot})`);
  }
  const stagingRoot = under(projectRoot, stagingRel);
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
    if (!STRUCTURAL_EXTS.has(ext)) continue;
    const raw = readFileSync(full, "utf8");
    const composed = resolveCompositions(raw, catalogRoot, [name]);
    const normalized = normalizeCapture(composed, projectRoot);
    const outRel = `${layer}/${name}/${state}${ext}`;
    writeText(join(stagingRoot, outRel), normalized);
    stories.push(storyRecord(layer, name, state, outRel, normalized));
  }
  for (const full of files) {
    const rel = relPosix(catalogRoot, full);
    const parts = rel.split("/");
    if (parts.length < 3 || !rel.endsWith(".png")) continue;
    if (layerFilter && parts[0] !== layerFilter) continue;
    const outFull = join(stagingRoot, rel);
    ensureDir(dirname(outFull));
    copyFileSync(full, outFull);
  }
  return { stories, stagingRel, count: stories.length };
}

function setOrUnset(env, key, value) {
  if (value) env[key] = value;
  else delete env[key];
}

function runCaptureCommand(projectRoot, command, stagingRel, { layer = null, onlyKey = null } = {}) {
  const stagingRoot = under(projectRoot, stagingRel);
  if (existsSync(stagingRoot)) rmSync(stagingRoot, { recursive: true, force: true });
  ensureDir(stagingRoot);
  const env = { ...process.env, PIXEL_PERFECT_CAPTURE_OUT: stagingRoot };
  setOrUnset(env, "PIXEL_PERFECT_CAPTURE_LAYER", layer);
  setOrUnset(env, "PIXEL_PERFECT_CAPTURE_ONLY", onlyKey);
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
    const [l, name, file] = parts;
    const dot = file.lastIndexOf(".");
    if (dot === -1) continue;
    const state = file.slice(0, dot);
    const ext = file.slice(dot);
    if (ext === ".png") continue; // pixel evidence is checked by pixelGate, never compared
    const content = normalizeCapture(readFileSync(full, "utf8"), projectRoot);
    writeText(full, content);
    stories.push(storyRecord(l, name, state, rel, content));
  }
  return { stories, stagingRel, count: stories.length };
}

const byKey = (a, b) => (storyKey(a) < storyKey(b) ? -1 : storyKey(a) > storyKey(b) ? 1 : 0);

/**
 * Capture once and keep only what the run asked for. --layer and --only restrict the stories
 * kept here as well as the environment the command receives, so a command that ignores the
 * variables still cannot leak other stories into a baseline.
 */
export function runCapture(projectRoot, captureCfg, layerFilter = null, opts = {}) {
  const only = opts.only || null;
  const onlyKey = only ? `${only.layer}/${only.name}` : null;
  let captured;
  if (captureCfg.command) {
    // Prefer an explicit capture.command when present (real consumer sandboxes).
    captured = runCaptureCommand(projectRoot, captureCfg.command, captureCfg.staging, { layer: layerFilter, onlyKey });
  } else if (existsSync(join(projectRoot, captureCfg.catalogDir))) {
    // Fall back to structural catalog walk for fixtures without a shell command.
    captured = captureFromCatalog(projectRoot, captureCfg.catalogDir, captureCfg.staging, layerFilter);
  } else {
    throw new Error(
      `No capture.command in manifest and no catalog at ${captureCfg.catalogDir} — cannot capture`,
    );
  }
  const stories = captured.stories
    .filter((s) => !layerFilter || s.layer === layerFilter)
    .filter((s) => !only || (s.layer === only.layer && s.name === only.name))
    .sort(byKey);
  return { stories, stagingRel: captureCfg.staging, count: stories.length };
}

// ---------------------------------------------------------------------------
// Gates: pixels, empty captures, duplicate captures
// ---------------------------------------------------------------------------

/**
 * Pixel evidence. Every captured story needs a sibling {state}.png that is a real image, is not
 * blank, and is no wider than the declared viewport. Platforms that declare pixels "none" skip it.
 * A PNG format this module cannot decode is never failed; it is listed in pixelSkipped.
 */
export function pixelGate(stories, stagingAbs, captureCfg) {
  const violations = [];
  const pixelSkipped = [];
  const statuses = new Map();
  const pngPaths = new Map();
  for (const s of stories) {
    const key = storyKey(s);
    if (captureCfg.pixels === "none") {
      statuses.set(key, "not-required");
      pngPaths.set(key, null);
      continue;
    }
    const pngRel = `${s.layer}/${s.name}/${s.state}.png`;
    const pngPath = join(stagingAbs, pngRel);
    pngPaths.set(key, pngPath);
    if (!existsSync(pngPath)) {
      violations.push({ kind: "missing-png", key, rel: pngRel, reason: "no PNG was captured beside this structural artifact" });
      statuses.set(key, "missing-png");
      continue;
    }
    const info = inspectPng(readFileSync(pngPath));
    if (!info.valid) {
      violations.push({ kind: "invalid-png", key, rel: pngRel, reason: info.reason });
      statuses.set(key, "invalid-png");
      continue;
    }
    if (!info.decodable) pixelSkipped.push({ key, rel: pngRel, reason: info.reason });
    const problems = [];
    const limit = captureCfg.viewport ? captureCfg.viewport.width * captureCfg.scale : null;
    if (limit !== null && info.width > limit) {
      problems.push({ kind: "wider-than-viewport", width: info.width, limit, reason: `render is wider than the viewport (${info.width}px > ${limit}px)` });
    }
    if (info.blank === true) {
      problems.push({ kind: "blank-png", reason: "every pixel is the same colour: the render is blank" });
    }
    for (const p of problems) violations.push({ ...p, key, rel: pngRel });
    statuses.set(key, problems[0]?.kind ?? "ok");
  }
  return { violations, pixelSkipped, statuses, pngPaths };
}

/**
 * Structural evidence. An empty artifact is a violation. Identical bodies for different
 * components are a violation (the wrapper-only signature). Identical bodies across states of
 * one component are reported as duplicates and do not fail.
 */
export function structureGate(stories) {
  const violations = [];
  const duplicates = [];
  const byHash = new Map();
  for (const s of stories) {
    if (s.empty) {
      violations.push({ kind: "empty-capture", key: storyKey(s), rel: s.rel, reason: "structural artifact is empty after normalization" });
      continue;
    }
    byHash.set(s.hash, [...(byHash.get(s.hash) || []), s]);
  }
  for (const [hash, group] of byHash) {
    if (group.length < 2) continue;
    const keys = group.map(storyKey).sort();
    const components = new Set(group.map((s) => `${s.layer}/${s.name}`));
    if (components.size > 1) {
      violations.push({
        kind: "cross-component-duplicate",
        hash,
        keys,
        reason: "identical bodies for different components: the capture is a wrapper, not the components",
      });
    } else {
      duplicates.push({ hash, keys, reason: "identical bodies across states of one component (reported, not a failure)" });
    }
  }
  return { violations, duplicates };
}

/** Both gates over one capture run. */
export function gateCapture(stories, stagingAbs, captureCfg) {
  const pixel = pixelGate(stories, stagingAbs, captureCfg);
  const structure = structureGate(stories);
  return { violations: [...pixel.violations, ...structure.violations], duplicates: structure.duplicates, pixel };
}

function gateFields(captureCfg, gate) {
  return {
    pixels: captureCfg.pixels,
    pixelsReason: captureCfg.pixelsReason,
    pixelSkipped: gate.pixel.pixelSkipped,
    violations: gate.violations,
    duplicates: gate.duplicates,
  };
}

function describeViolation(v) {
  return v.key ?? v.keys.join(" = ");
}

function blocked(mode, captureCfg, cap, gate) {
  const names = gate.violations.map((v) => `${v.kind} ${describeViolation(v)}`).join("; ");
  return {
    mode,
    exit: 1,
    vacuous: false,
    message: `${gate.violations.length} capture violation(s): ${names}. Nothing was written.`,
    stories: cap.stories,
    written: [],
    ...gateFields(captureCfg, gate),
  };
}

// ---------------------------------------------------------------------------
// Detection: composition of deprecated entities
// ---------------------------------------------------------------------------

/**
 * Detect composition of deprecated entities (imports / compose markers).
 * The deprecated entity's own files are exempt; dependents are violations.
 */
export function detectDeprecatedComposition(projectRoot, deprecations) {
  const names = Object.keys(deprecations || {});
  if (names.length === 0) return [];
  const violations = [];
  const roots = ["src", "sandbox"].map((r) => join(projectRoot, r)).filter(existsSync);
  for (const root of roots) {
    for (const full of walkFiles(root)) {
      const rel = relPosix(projectRoot, full);
      let content;
      try {
        content = readFileSync(full, "utf8");
      } catch {
        continue;
      }
      for (const name of names) {
        const isSelf =
          rel.includes(`/${name}/`) ||
          new RegExp(`(^|/)${name}\\.[^/]+$`).test(rel);
        if (isSelf) continue;
        const strong =
          new RegExp(`---\\s*composed:${name}\\s*---`).test(content) ||
          new RegExp(`@compose\\s+${name}\\b`).test(content) ||
          new RegExp(`from\\s+['"][^'"]*${name}['"]`).test(content) ||
          new RegExp(`import\\s*\\{[^}]*\\b${name}\\b`).test(content) ||
          new RegExp(`<${name}[\\s/>]`).test(content);
        if (strong) {
          violations.push({
            file: rel,
            deprecated: name,
            replacement: deprecations[name]?.replacement || null,
            reason: deprecations[name]?.reason || "",
          });
        }
      }
    }
  }
  return violations;
}

// ---------------------------------------------------------------------------
// Inventory goldens / staging
// ---------------------------------------------------------------------------

export function inventoryDir(root, baseRel) {
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

export function storyKey(s) {
  return `${s.layer}/${s.name}/${s.state}`;
}

// ---------------------------------------------------------------------------
// Receipts: what --baseline and --accept wrote, and from which sources
// ---------------------------------------------------------------------------

const NOT_RECEIPTED = "golden was not written by --baseline or --accept";
const EDITED_AFTER_RECEIPT =
  "golden differs from the hash its receipt recorded (edited by hand after --baseline or --accept)";
const NO_RECEIPT_FILE = "no receipt.json beside the goldens: goldens were not written by --baseline or --accept";

function receiptPath(projectRoot, captureCfg) {
  return join(under(projectRoot, captureCfg.goldens), RECEIPT_FILE);
}

/** The receipt, or null when none exists. A file that is not a version 1 receipt is a config error. */
export function readReceipts(projectRoot, captureCfg) {
  const file = receiptPath(projectRoot, captureCfg);
  if (!existsSync(file)) return null;
  let receipt;
  try {
    receipt = JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    throw new Error(`${file} is not valid JSON: ${e.message}`);
  }
  if (receipt?.version !== 1 || !receipt.goldens || typeof receipt.goldens !== "object") {
    throw new Error(`${file} is not a version 1 receipt`);
  }
  return receipt;
}

/** The receipt entry for one captured story. Source digests come from the manifest item, when it names files. */
function receiptEntry(projectRoot, captureCfg, story, mode) {
  const entry = { hash: story.hash, ext: story.rel.slice(story.rel.lastIndexOf(".")), mode };
  const item = captureCfg.items[`${story.layer}/${story.name}`];
  if (item && (item.file || item.story)) {
    const source = {};
    if (item.file) {
      source.file = item.file;
      source.fileHash = digestOf(projectRoot, item.file, "file");
    }
    if (item.story) {
      source.story = item.story;
      source.storyHash = digestOf(projectRoot, item.story, "story");
    }
    entry.source = source;
  }
  return entry;
}

function digestOf(projectRoot, rel, field) {
  const abs = join(projectRoot, rel);
  if (!existsSync(abs)) {
    throw new Error(`manifest ${field} "${rel}" does not exist, so its revision cannot be recorded in the receipt`);
  }
  return digest(readFileSync(abs));
}

/** Merge entries into receipt.json atomically. Entries not named here keep their prior values. */
function writeReceipts(projectRoot, captureCfg, entries) {
  const file = receiptPath(projectRoot, captureCfg);
  ensureDir(dirname(file));
  const prior = readReceipts(projectRoot, captureCfg);
  const merged = { ...(prior?.goldens || {}), ...entries };
  const goldens = Object.fromEntries(Object.keys(merged).sort().map((k) => [k, merged[k]]));
  const body = JSON.stringify({ version: 1, platform: captureCfg.platform, goldens }, null, 2) + "\n";
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, body, "utf8");
  renameSync(tmp, file);
}

/** Goldens that no receipt vouches for: never written by a mode, or changed since. */
function unreceiptedFor(goldens, receipts) {
  const out = [];
  for (const g of goldens) {
    const key = storyKey(g);
    if (receipts === null) {
      out.push({ key, rel: g.rel, reason: NO_RECEIPT_FILE });
      continue;
    }
    const entry = receipts.goldens[key];
    if (!entry) out.push({ key, rel: g.rel, reason: NOT_RECEIPTED });
    else if (entry.hash !== g.hash) out.push({ key, rel: g.rel, reason: EDITED_AFTER_RECEIPT });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Modes
// ---------------------------------------------------------------------------

export function modeBaseline(projectRoot, captureCfg, layerFilter = null, opts = {}) {
  const cap = runCapture(projectRoot, captureCfg, layerFilter, opts);
  if (cap.count === 0) {
    return {
      mode: "baseline",
      exit: 3,
      vacuous: true,
      message: `Zero stories captured under ${captureCfg.catalogDir || captureCfg.command}`,
      stories: [],
      written: [],
      violations: [],
      duplicates: [],
    };
  }
  const stagingAbs = under(projectRoot, captureCfg.staging);
  const gate = gateCapture(cap.stories, stagingAbs, captureCfg);
  if (gate.violations.length) return blocked("baseline", captureCfg, cap, gate);

  // Receipts are computed before any golden moves, so a missing source file leaves nothing half-written.
  const entries = {};
  for (const s of cap.stories) entries[storyKey(s)] = receiptEntry(projectRoot, captureCfg, s, "baseline");
  const goldensRoot = under(projectRoot, captureCfg.goldens);
  ensureDir(goldensRoot);
  const written = [];
  for (const s of cap.stories) {
    const dst = join(goldensRoot, s.rel);
    ensureDir(dirname(dst));
    copyFileSync(join(stagingAbs, s.rel), dst);
    written.push(s.rel);
  }
  writeReceipts(projectRoot, captureCfg, entries);
  return {
    mode: "baseline",
    exit: 0,
    vacuous: false,
    message: `Wrote ${written.length} golden(s) under ${captureCfg.goldens}`,
    stories: cap.stories,
    written,
    ...gateFields(captureCfg, gate),
  };
}

const RECEIPT_HELP =
  "run --check to see drift, then --baseline to write receipts for the approved captures";

export function modeCheck(projectRoot, captureCfg, layerFilter, deprecations = {}, opts = {}) {
  const cap = runCapture(projectRoot, captureCfg, layerFilter, opts);
  if (cap.count === 0) {
    return {
      mode: "check",
      exit: 3,
      vacuous: true,
      message: `Zero stories captured — vacuous scan (never a pass)`,
      stories: [],
      drifted: [],
      missing: [],
      extra: [],
      deprecatedUsage: [],
      uncatalogued: [],
      unreceipted: [],
      violations: [],
      duplicates: [],
    };
  }
  const stagingAbs = under(projectRoot, captureCfg.staging);
  const gate = gateCapture(cap.stories, stagingAbs, captureCfg);
  const goldens = inventoryDir(projectRoot, captureCfg.goldens);
  const scoped = goldens.filter((g) => !layerFilter || g.layer === layerFilter);
  const goldenByKey = new Map(goldens.map((g) => [storyKey(g), g]));
  const capByKey = new Map(cap.stories.map((s) => [storyKey(s), s]));

  const drifted = [];
  const missing = [];
  const extra = [];

  for (const s of cap.stories) {
    const g = goldenByKey.get(storyKey(s));
    if (!g) {
      extra.push({ key: storyKey(s), rel: s.rel, reason: "no golden" });
      continue;
    }
    if (g.hash !== s.hash) {
      drifted.push({ key: storyKey(s), rel: s.rel, goldenHash: g.hash, captureHash: s.hash });
    }
  }
  for (const g of scoped) {
    if (!capByKey.has(storyKey(g))) {
      missing.push({ key: storyKey(g), rel: g.rel, reason: "story gone from capture" });
    }
  }

  const receipts = readReceipts(projectRoot, captureCfg);
  const unreceipted = unreceiptedFor(scoped, receipts);
  const receiptMissing = scoped.length > 0 && receipts === null;
  const deprecatedUsage = detectDeprecatedComposition(projectRoot, deprecations);
  const uncatalogued = findUncatalogued(projectRoot, cap.stories, layerFilter);
  const violations =
    drifted.length +
    missing.length +
    extra.length +
    deprecatedUsage.length +
    uncatalogued.length +
    gate.violations.length +
    unreceipted.length;
  const parts = [];
  if (drifted.length) parts.push(`${drifted.length} changed`);
  if (missing.length) parts.push(`${missing.length} missing goldens`);
  if (extra.length) parts.push(`${extra.length} new stories`);
  if (deprecatedUsage.length) parts.push(`${deprecatedUsage.length} deprecated composition(s)`);
  if (uncatalogued.length) parts.push(`${uncatalogued.length} inventoried without a story`);
  if (gate.violations.length) parts.push(`${gate.violations.length} capture violation(s)`);
  if (unreceipted.length) parts.push(`${unreceipted.length} unreceipted golden(s)`);
  let message;
  if (violations === 0) {
    message = `Catalog matches goldens (${cap.count} stor${cap.count === 1 ? "y" : "ies"})`;
  } else if (receiptMissing) {
    message =
      `No ${RECEIPT_FILE} under ${captureCfg.goldens}: goldens were not written by --baseline. ` +
      `To fix: ${RECEIPT_HELP}. (${parts.join(", ")})`;
  } else {
    message = `Drift: ${parts.join(", ")}`;
  }
  return {
    mode: "check",
    exit: violations === 0 ? 0 : 1,
    vacuous: false,
    message,
    stories: cap.stories,
    drifted,
    missing,
    extra,
    deprecatedUsage,
    uncatalogued,
    unreceipted,
    receiptMissing,
    ...gateFields(captureCfg, gate),
  };
}

export function modeAccept(projectRoot, captureCfg, globPattern, layerFilter = null, opts = {}) {
  if (!globPattern) throw new Error("--accept requires a glob (e.g. '**' or 'atoms/Button/**')");
  const match = makeMatcher([globPattern, globPattern.endsWith("/**") ? globPattern : `${globPattern}/**`, globPattern]);
  const cap = runCapture(projectRoot, captureCfg, layerFilter, opts);
  if (cap.count === 0) {
    return {
      mode: "accept",
      exit: 3,
      vacuous: true,
      message: "Zero stories captured — nothing to accept",
      accepted: [],
      violations: [],
      duplicates: [],
    };
  }
  const stagingAbs = under(projectRoot, captureCfg.staging);
  const gate = gateCapture(cap.stories, stagingAbs, captureCfg);
  if (gate.violations.length) return { ...blocked("accept", captureCfg, cap, gate), accepted: [] };

  const chosen = cap.stories.filter((s) => match(s.rel) || match(storyKey(s)) || match(`${s.layer}/${s.name}/**`));
  if (chosen.length === 0) {
    return {
      mode: "accept",
      exit: 1,
      vacuous: false,
      message: `No captured stories matched accept glob "${globPattern}"`,
      accepted: [],
      ...gateFields(captureCfg, gate),
    };
  }
  const entries = {};
  for (const s of chosen) entries[storyKey(s)] = receiptEntry(projectRoot, captureCfg, s, "accept");
  const goldensRoot = under(projectRoot, captureCfg.goldens);
  ensureDir(goldensRoot);
  const accepted = [];
  for (const s of chosen) {
    const dst = join(goldensRoot, s.rel);
    ensureDir(dirname(dst));
    copyFileSync(join(stagingAbs, s.rel), dst);
    accepted.push(s.rel);
  }
  writeReceipts(projectRoot, captureCfg, entries);
  return {
    mode: "accept",
    exit: 0,
    vacuous: false,
    message: `Accepted ${accepted.length} golden(s) matching "${globPattern}"`,
    accepted,
    ...gateFields(captureCfg, gate),
  };
}

/**
 * --render: capture, run the pixel gate, write no goldens, and name the artifact paths for
 * every state so a reviewer can open the PNG that the gate judged.
 */
export function modeRender(projectRoot, captureCfg, layerFilter = null, opts = {}) {
  const cap = runCapture(projectRoot, captureCfg, layerFilter, opts);
  if (cap.count === 0) {
    return {
      mode: "render",
      exit: 3,
      vacuous: true,
      message: "Zero stories captured — nothing to render",
      stories: [],
      states: [],
      violations: [],
    };
  }
  const stagingAbs = under(projectRoot, captureCfg.staging);
  const pixel = pixelGate(cap.stories, stagingAbs, captureCfg);
  const states = cap.stories.map((s) => {
    const key = storyKey(s);
    return { key, structural: join(stagingAbs, s.rel), png: pixel.pngPaths.get(key), status: pixel.statuses.get(key) };
  });
  const exit = pixel.violations.length ? 1 : 0;
  return {
    mode: "render",
    exit,
    vacuous: false,
    message:
      exit === 0
        ? `Rendered ${states.length} state(s); pixels ${captureCfg.pixels}`
        : `${pixel.violations.length} pixel violation(s): a state lacks a valid, non-blank PNG`,
    stories: cap.stories,
    states,
    pixels: captureCfg.pixels,
    pixelsReason: captureCfg.pixelsReason,
    pixelSkipped: pixel.pixelSkipped,
    violations: pixel.violations,
  };
}

/** Find catalog source files for a component name (any layer/state). */
function findCatalogSources(projectRoot, catalogRel, name) {
  const catalogRoot = join(projectRoot, catalogRel);
  if (!existsSync(catalogRoot)) return [];
  const hits = [];
  for (const full of walkFiles(catalogRoot)) {
    const rel = relPosix(catalogRoot, full);
    const parts = rel.split("/");
    // Nested catalog: {layer}/{Name}/{file} (the custom sandbox's layout).
    if (parts.length >= 3 && parts[1] === name) hits.push({ full, rel, layer: parts[0], name });
    // Flat components: {layer}/{Name}.{ext} (e.g. a Storybook project's src/lib/components). Only the
    // component file itself: `Name.stories.svelte` has a different basename and is never perturbed.
    else if (parts.length === 2 && parts[1].slice(0, parts[1].lastIndexOf(".")) === name) {
      hits.push({ full, rel, layer: parts[0], name });
    }
  }
  return hits;
}

// When one component layer is verified, every component the inventory lists for that layer
// must have a captured story. A component that was inventoried but never built has no story
// and no golden, so the drift diff alone would pass it. The whole-catalog view (no --layer)
// skips this: mid-build, later layers legitimately have no stories yet.
const COMPONENT_LAYERS = new Set(["atoms", "molecules", "organisms"]);
function findUncatalogued(projectRoot, stories, layerFilter) {
  if (!COMPONENT_LAYERS.has(layerFilter)) return [];
  const invPath = join(projectRoot, "design", "inventory.json");
  if (!existsSync(invPath)) return [];
  const inventory = JSON.parse(readFileSync(invPath, "utf8"));
  const captured = new Set(stories.filter((s) => s.layer === layerFilter).map((s) => s.name));
  return (inventory[layerFilter] || [])
    .filter((c) => !captured.has(c.name))
    .map((c) => ({ key: `${layerFilter}/${c.name}`, reason: "inventoried but no captured story" }));
}

export function modeBlast(projectRoot, captureCfg, name, layerFilter) {
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
export function modeReach(projectRoot, captureCfg, names, layerFilter) {
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
    const roots = liveRoots;
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

/**
 * --audit core: every golden must be receipted, non-empty, and not a copy of another component's
 * body; every receipted source must still match the file on disk. Runs no capture.
 */
export function auditGoldens(projectRoot, platformConfig, platformId = "default") {
  const captureCfg = resolveCaptureConfig(platformConfig, platformId);
  const goldens = inventoryDir(projectRoot, captureCfg.goldens);
  const receipts = readReceipts(projectRoot, captureCfg);
  const unreceipted = unreceiptedFor(goldens, receipts);
  const empty = goldens
    .filter((g) => readFileSync(g.full, "utf8").trim() === "")
    .map((g) => ({ key: storyKey(g), rel: g.rel }));
  const crossComponentDuplicates = groupGoldensByHash(goldens);
  const staleSources = staleSourcesOf(projectRoot, receipts);
  const failing = unreceipted.length + empty.length + crossComponentDuplicates.length + staleSources.length;
  const exit = goldens.length === 0 ? 3 : failing > 0 ? 1 : 0;
  return {
    mode: "audit",
    platform: platformId,
    exit,
    vacuous: goldens.length === 0,
    message:
      goldens.length === 0
        ? `No goldens under ${captureCfg.goldens} to audit`
        : failing === 0
          ? `Audit clean: ${goldens.length} golden(s) receipted, non-empty, distinct; sources unchanged`
          : `Audit failed: ${unreceipted.length} unreceipted, ${empty.length} empty, ${crossComponentDuplicates.length} cross-component duplicate group(s), ${staleSources.length} stale source(s)`,
    goldens: goldens.length,
    receiptMissing: goldens.length > 0 && receipts === null,
    unreceipted,
    empty,
    crossComponentDuplicates,
    staleSources,
  };
}

function groupGoldensByHash(goldens) {
  const byHash = new Map();
  for (const g of goldens) byHash.set(g.hash, [...(byHash.get(g.hash) || []), g]);
  const groups = [];
  for (const [hash, group] of byHash) {
    const components = new Set(group.map((g) => `${g.layer}/${g.name}`));
    if (components.size < 2) continue;
    groups.push({ hash, keys: group.map(storyKey).sort() });
  }
  return groups;
}

function staleSourcesOf(projectRoot, receipts) {
  const stale = [];
  for (const [key, entry] of Object.entries(receipts?.goldens || {})) {
    for (const field of ["file", "story"]) {
      const rel = entry.source?.[field];
      if (!rel) continue;
      const recorded = entry.source[`${field}Hash`];
      const abs = join(projectRoot, rel);
      if (!existsSync(abs)) {
        stale.push({ key, field, path: rel, recorded, current: null, reason: "source file is missing" });
        continue;
      }
      const current = digest(readFileSync(abs));
      if (current !== recorded) {
        stale.push({ key, field, path: rel, recorded, current, reason: "edited after its golden was written" });
      }
    }
  }
  return stale;
}

// ---------------------------------------------------------------------------
// Cross-platform identity (informational)
// ---------------------------------------------------------------------------

/**
 * For each pair of platforms that have goldens, how many golden keys exist on both sides and how many
 * of those are byte-identical. Informational: it never changes an exit code.
 */
export function identicalAcrossPlatforms(projectRoot, manifest) {
  const ids = manifest.platforms && typeof manifest.platforms === "object" ? Object.keys(manifest.platforms) : [];
  const sets = [];
  for (const id of ids) {
    const cfg = resolveCaptureConfig(manifest.platforms[id], id);
    const goldens = inventoryDir(projectRoot, cfg.goldens);
    if (goldens.length === 0) continue;
    const files = new Map(goldens.map((g) => [g.rel, g.full]));
    sets.push({ id, files });
  }
  const pairs = [];
  for (let i = 0; i < sets.length; i++) {
    for (let j = i + 1; j < sets.length; j++) {
      const a = sets[i];
      const b = sets[j];
      let shared = 0;
      let identical = 0;
      for (const [rel, fullA] of a.files) {
        if (!b.files.has(rel)) continue;
        shared++;
        if (readFileSync(fullA).equals(readFileSync(b.files.get(rel)))) identical++;
      }
      pairs.push({ a: a.id, b: b.id, shared, identical });
    }
  }
  return pairs;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function usage() {
  process.stderr.write(
    "Usage: verify-catalog.mjs <mode> <project-root> [options]\n" +
      "  Modes: --baseline | --check | --accept <glob> | --render | --audit | --blast <name> | --reach <name...>\n" +
      "  Options: --platform <id>  --layer <layer>  --only <layer>/<Name>  --out <dir>  --json\n" +
      "  Exit: 0 pass · 1 drift or violation · 2 config/usage · 3 vacuous (zero stories)\n",
  );
}

function parseOnly(value) {
  const m = /^([a-z][a-z0-9-]*)\/([A-Za-z][A-Za-z0-9]*)$/.exec(value || "");
  if (!m) throw new Error("--only requires <layer>/<Name>, for example --only atoms/Button");
  return { layer: m[1], name: m[2] };
}

function parseArgs(argv) {
  const positional = [];
  let mode = null;
  let blastName = null;
  const reachNames = [];
  let acceptGlob = null;
  let platform = null;
  let layer = null;
  let only = null;
  let out = null;
  let jsonOnly = false;
  let perturbDir = null;

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
    if (a === "--only") {
      only = parseOnly(argv[++i]);
      continue;
    }
    if (a === "--out") {
      out = argv[++i];
      if (!out || out.startsWith("--")) throw new Error("--out requires a directory");
      continue;
    }
    if (a === "--perturb-dir") {
      perturbDir = argv[++i];
      if (!perturbDir || perturbDir.startsWith("--")) throw new Error("--perturb-dir requires a path");
      continue;
    }
    if (a === "--baseline" || a === "--check" || a === "--render" || a === "--audit") {
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
  return {
    help: false,
    mode,
    blastName,
    reachNames,
    acceptGlob,
    platform,
    layer,
    only,
    out,
    jsonOnly,
    perturbDir,
    positional,
  };
}

/** A staging directory that would contain the project root is refused: rendering must never wipe the project. */
function checkedStaging(projectRoot, out) {
  const abs = resolve(projectRoot, out);
  if (abs === projectRoot || projectRoot.startsWith(abs + sep)) {
    throw new Error(`--out ${out} would contain the project root; give a dedicated directory`);
  }
  return out;
}

const AUDIT_AND_BASELINE_MODES = new Set(["baseline", "check", "accept", "audit"]);

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
    if (parsed.perturbDir) captureCfg.catalogDir = parsed.perturbDir;
    if (parsed.out) captureCfg.staging = checkedStaging(projectRoot, parsed.out);

    const deprecations = platformConfig.deprecations || {};
    const opts = { only: parsed.only };
    switch (parsed.mode) {
      case "baseline":
        report = modeBaseline(projectRoot, captureCfg, parsed.layer, opts);
        break;
      case "check":
        report = modeCheck(projectRoot, captureCfg, parsed.layer, deprecations, opts);
        break;
      case "accept":
        report = modeAccept(projectRoot, captureCfg, parsed.acceptGlob, parsed.layer, opts);
        break;
      case "render":
        report = modeRender(projectRoot, captureCfg, parsed.layer, opts);
        break;
      case "audit":
        report = auditGoldens(projectRoot, platformConfig, platformId);
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
    if (AUDIT_AND_BASELINE_MODES.has(parsed.mode)) {
      report.identicalAcrossPlatforms = identicalAcrossPlatforms(projectRoot, manifest);
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
    describeReport(report);
  }
  return report.exit;
}

function describeReport(report) {
  const lines = [];
  for (const d of report.drifted || []) lines.push(`  drift  ${d.key}`);
  for (const m of report.missing || []) lines.push(`  missing golden  ${m.key}`);
  for (const e of report.extra || []) lines.push(`  new story  ${e.key}`);
  for (const u of report.uncatalogued || []) lines.push(`  no story  ${u.key} (inventoried)`);
  for (const u of report.unreceipted || []) lines.push(`  unreceipted  ${u.key}: ${u.reason}`);
  for (const v of report.violations || []) lines.push(`  violation  ${v.kind}  ${describeViolation(v)}  ${v.reason}`);
  for (const e of report.empty || []) lines.push(`  empty golden  ${e.key}`);
  for (const g of report.crossComponentDuplicates || []) lines.push(`  identical across components  ${g.keys.join(" = ")}`);
  for (const s of report.staleSources || []) lines.push(`  stale source  ${s.key} ${s.field} ${s.path}: ${s.reason}`);
  for (const s of report.states || []) {
    lines.push(`  state  ${s.key}  structural=${s.structural}  png=${s.png ?? "(not required)"}  ${s.status}`);
  }
  for (const m of report.moved || []) lines.push(`  moved  ${m.key}`);
  for (const d of report.deprecatedUsage || []) lines.push(`  deprecated  ${d.file} composes ${d.deprecated}`);
  for (const r of report.results || []) {
    lines.push(`  ${r.name} reaches: ${(r.reaches || []).map((x) => x.key).join(", ") || "(none)"}`);
  }
  if (report.note) lines.push(`  note  ${report.note}`);
  for (const line of lines) process.stderr.write(`${line}\n`);
}

export { findCatalogSources, braceExpand, globToRegex, makeMatcher, parseArgs };

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) process.exit(main(process.argv.slice(2)));
