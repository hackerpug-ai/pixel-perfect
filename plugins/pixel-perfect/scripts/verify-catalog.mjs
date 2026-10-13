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
//   --composes            check each composing item's source names what the inventory says it composes
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
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { basename, dirname, extname, isAbsolute, join, parse, relative, resolve, sep } from "node:path";
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
    ...resolvePixels(capture, platformId),
    viewport: parseViewport(capture.viewport),
    scale: parseScale(capture.scale),
    timeoutMs: parseTimeout(capture.timeout_ms),
    items: manifestItems(platformConfig),
  };
}

function resolvePixels(capture, platformId) {
  const declared = capture.pixels;
  if (declared === undefined || declared === "required") {
    if (!parseViewport(capture.viewport)) {
      throw new Error(`pixels are required, so declare platforms.${platformId}.capture.viewport, for example "390x844"`);
    }
    return { pixels: "required", pixelsReason: null };
  }
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

function parseTimeout(value) {
  if (value === undefined) return 600000;
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new Error(`capture.timeout_ms must be a positive whole number of milliseconds, got ${JSON.stringify(value)}`);
  return n;
}

function parseScale(value) {
  if (value === undefined) return 1;
  const n = Number(value);
  if (!(n > 0)) throw new Error(`capture.scale must be a positive number, got ${JSON.stringify(value)}`);
  return n;
}

/** Built items (not pending) that have no captured story, within the layers in scope. */
function uncapturedItems(captureCfg, stories, layerFilter) {
  const captured = new Set(stories.map((s) => `${s.layer}/${s.name}`));
  const out = [];
  for (const [key, item] of Object.entries(captureCfg.items)) {
    if (layerFilter && key.split("/")[0] !== layerFilter) continue;
    if (item.status === "pending" || captured.has(key)) continue;
    out.push({ kind: "uncaptured-item", key, reason: `no story captured for ${key}` });
  }
  return out;
}

/** Manifest items by "layer/name", carrying the file and story paths receipts hash. */
function manifestItems(platformConfig) {
  const items = {};
  for (const layer of ITEM_LAYERS) {
    for (const item of platformConfig[layer] || []) {
      if (item && item.name) items[`${layer}/${item.name}`] = { file: item.file, story: item.story, status: item.status };
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

function storyRecord(layer, name, state, rel, content, png = null) {
  return {
    layer,
    name,
    state,
    rel,
    hash: fingerprint(content),
    bytes: Buffer.byteLength(content, "utf8"),
    empty: content.trim() === "",
    png,
  };
}

/**
 * Built-in structural capture for the fixture / text medium.
 * Walks `{catalogDir}/{layer}/{name}/{state}.{ext}` and writes normalized
 * artifacts to staging with the same layout. Composition is resolved live from
 * `@compose` / `--- composed:Name ---` markers so blast/reach measure real reachability.
 * A PNG found beside a structural artifact is copied into staging with it.
 */
export function captureFromCatalog(projectRoot, catalogRel, stagingRel, layerFilter = null, goldensRel = "design/goldens") {
  const catalogRoot = join(projectRoot, catalogRel);
  if (!existsSync(catalogRoot)) {
    throw new Error(`Catalog directory not found: ${catalogRel} (under ${projectRoot})`);
  }
  // The allow-check runs here, at the delete, so a caller that skips the CLI cannot remove another path.
  const stagingRoot = clearStaging(projectRoot, stagingRel, "capture.staging", goldensRel);
  ensureDir(stagingRoot);

  const files = walkFiles(catalogRoot);
  const stories = [];
  const seen = new Map();
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
    const key = `${layer}/${name}/${state}`;
    if (seen.has(key)) throw new Error(`two structural artifacts for ${key}: ${seen.get(key)} and ${rel}; one story state has one structural artifact`);
    seen.set(key, rel);
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
  for (const s of stories) {
    const pngFull = join(stagingRoot, s.layer, s.name, `${s.state}.png`);
    s.png = existsSync(pngFull) ? pngFull : null;
  }
  return { stories, stagingRel, count: stories.length, ignoredFiles: [] };
}

function setOrUnset(env, key, value) {
  if (value) env[key] = value;
  else delete env[key];
}

const MAX_COMMAND_OUTPUT = 64 * 1024 * 1024;

function fileDigest(full) {
  return createHash("sha256").update(readFileSync(full)).digest("hex");
}

/** Hashes of every file the gate reads and must not see changed by the capture command. */
function gateInputs(projectRoot, goldensRel) {
  const goldensAbs = under(projectRoot, goldensRel);
  const files = [
    join(projectRoot, "design", "manifest.json"),
    join(projectRoot, "design", "inventory.json"),
    join(goldensAbs, RECEIPT_FILE),
    ...(existsSync(goldensAbs) ? walkFiles(goldensAbs) : []),
  ];
  const digests = new Map();
  for (const full of files) if (existsSync(full)) digests.set(relPosix(projectRoot, full), fileDigest(full));
  return digests;
}

function changedInputs(before, after) {
  const names = new Set([...before.keys(), ...after.keys()]);
  return [...names].filter((n) => before.get(n) !== after.get(n)).sort();
}

function runCaptureCommand(projectRoot, command, stagingRel, { layer = null, onlyKey = null, goldens, timeoutMs }) {
  const inputsBefore = gateInputs(projectRoot, goldens);
  // Same allow-check as the CLI, at this delete. A refused path is not created and nothing outside it is removed.
  const stagingRoot = clearStaging(projectRoot, stagingRel, "capture.staging", goldens);
  ensureDir(stagingRoot);
  const env = { ...process.env, PIXEL_PERFECT_CAPTURE_OUT: stagingRoot };
  setOrUnset(env, "PIXEL_PERFECT_CAPTURE_LAYER", layer);
  setOrUnset(env, "PIXEL_PERFECT_CAPTURE_ONLY", onlyKey);
  const result = spawnSync(command, {
    cwd: projectRoot,
    env,
    shell: true,
    encoding: "utf8",
    timeout: timeoutMs,
    maxBuffer: MAX_COMMAND_OUTPUT,
  });
  if (result.error?.code === "ETIMEDOUT") {
    throw new Error(`capture command timed out after ${timeoutMs} ms (capture.timeout_ms)`);
  }
  if (result.error) throw new Error(`capture command could not run: ${result.error.message}`);
  if (result.status !== 0) {
    const err = (result.stderr || result.stdout || "").trim() || `exit ${result.status}`;
    throw new Error(`capture command failed: ${err}`);
  }
  const changed = changedInputs(inputsBefore, gateInputs(projectRoot, goldens));
  if (changed.length) {
    throw new Error(`the capture command modified gate inputs: ${changed.join(", ")}. Capture must only write to its staging folder.`);
  }

  // Inventory what landed. One structural artifact per story state; PNGs found case-insensitively.
  const structural = new Map();
  const pngs = new Map();
  const ignoredFiles = [];
  for (const full of walkFiles(stagingRoot)) {
    const rel = relPosix(stagingRoot, full);
    const parts = rel.split("/");
    const file = parts[parts.length - 1];
    const dot = file.lastIndexOf(".");
    if (parts.length !== 3 || dot <= 0) {
      ignoredFiles.push(rel);
      continue;
    }
    const [l, name] = parts;
    const state = file.slice(0, dot);
    const ext = file.slice(dot);
    const key = `${l}/${name}/${state}`;
    if (ext.toLowerCase() === ".png") {
      pngs.set(key, full);
      continue;
    }
    if (!STRUCTURAL_EXTS.has(ext)) {
      ignoredFiles.push(rel);
      continue;
    }
    if (structural.has(key)) {
      throw new Error(`two structural artifacts for ${key}: ${structural.get(key).rel} and ${rel}; one story state has one structural artifact`);
    }
    const content = normalizeCapture(readFileSync(full, "utf8"), projectRoot);
    writeText(full, content);
    structural.set(key, storyRecord(l, name, state, rel, content));
  }
  const stories = [...structural.entries()].map(([key, s]) => ({ ...s, png: pngs.get(key) ?? null }));
  return { stories, stagingRel, count: stories.length, ignoredFiles: ignoredFiles.sort() };
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
    captured = runCaptureCommand(projectRoot, captureCfg.command, captureCfg.staging, {
      layer: layerFilter,
      onlyKey,
      goldens: captureCfg.goldens,
      timeoutMs: captureCfg.timeoutMs,
    });
  } else if (existsSync(join(projectRoot, captureCfg.catalogDir))) {
    // Fall back to structural catalog walk for fixtures without a shell command.
    captured = captureFromCatalog(projectRoot, captureCfg.catalogDir, captureCfg.staging, layerFilter, captureCfg.goldens);
  } else {
    throw new Error(
      `No capture.command in manifest and no catalog at ${captureCfg.catalogDir} — cannot capture`,
    );
  }
  const stories = captured.stories
    .filter((s) => !layerFilter || s.layer === layerFilter)
    .filter((s) => !only || (s.layer === only.layer && s.name === only.name))
    .sort(byKey);
  return { stories, stagingRel: captureCfg.staging, count: stories.length, ignoredFiles: captured.ignoredFiles };
}

// ---------------------------------------------------------------------------
// Gates: pixels, empty captures, duplicate captures
// ---------------------------------------------------------------------------

/**
 * Pixel evidence. Every captured story needs a sibling {state}.png that is a real, decodable image,
 * is no wider than the declared viewport, and shows something: at least 8x8 and 64 pixels that
 * differ from the image's most common colour. An image this module cannot decode is a violation,
 * never a pass. Platforms that declare pixels "none" skip the gate.
 * `evidence` holds what each receipt records for a passing image: its hash, size and ink pixels.
 */
export function pixelGate(stories, stagingAbs, captureCfg) {
  const violations = [];
  const statuses = new Map();
  const pngPaths = new Map();
  const evidence = new Map();
  for (const s of stories) {
    const key = storyKey(s);
    if (captureCfg.pixels === "none") {
      statuses.set(key, "not-required");
      pngPaths.set(key, null);
      continue;
    }
    const pngRel = `${s.layer}/${s.name}/${s.state}.png`;
    const pngPath = s.png ?? join(stagingAbs, pngRel);
    pngPaths.set(key, pngPath);
    if (!existsSync(pngPath)) {
      violations.push({ kind: "missing-png", key, rel: pngRel, reason: "no PNG was captured beside this structural artifact" });
      statuses.set(key, "missing-png");
      continue;
    }
    const bytes = readFileSync(pngPath);
    const info = inspectPng(bytes);
    if (info.status === "invalid" || info.status === "undecodable") {
      const kind = info.status === "invalid" ? "invalid-png" : "undecodable-png";
      violations.push({ kind, key, rel: pngRel, reason: info.reason });
      statuses.set(key, kind);
      continue;
    }
    const problems = [];
    const limit = captureCfg.viewport ? captureCfg.viewport.width * captureCfg.scale : null;
    if (limit !== null && info.width > limit) {
      problems.push({ kind: "wider-than-viewport", width: info.width, limit, reason: `render is wider than the viewport (${info.width}px > ${limit}px)` });
    }
    if (info.width < 8 || info.height < 8 || info.inkPixels < 64) {
      problems.push({
        kind: "blank-png",
        reason: `render shows almost nothing (${info.width}x${info.height}, ${info.inkPixels} pixels differ from the background; need at least 8x8 and 64)`,
      });
    }
    for (const p of problems) violations.push({ ...p, key, rel: pngRel });
    statuses.set(key, problems[0]?.kind ?? "ok");
    if (problems.length === 0) {
      evidence.set(key, {
        hash: `sha256:${createHash("sha256").update(bytes).digest("hex")}`,
        width: info.width,
        height: info.height,
        inkPixels: info.inkPixels,
      });
    }
  }
  return { violations, statuses, pngPaths, evidence };
}

/**
 * Structural evidence. An empty artifact is a violation. Identical bodies for different
 * components are a violation (the wrapper-only signature). Identical bodies across states of
 * one component are reported as duplicates (basis "structure") and do not fail.
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
      duplicates.push({ basis: "structure", hash, keys, reason: "identical bodies across states of one component (reported, not a failure)" });
    }
  }
  return { violations, duplicates };
}

/** PNG-level duplicates: identical pixels for different components fail; one component's states are reported. */
function pngDuplicates(stories, evidence) {
  const byHash = new Map();
  for (const s of stories) {
    const e = evidence.get(storyKey(s));
    if (e) byHash.set(e.hash, [...(byHash.get(e.hash) || []), s]);
  }
  const violations = [];
  const duplicates = [];
  for (const [hash, group] of byHash) {
    if (group.length < 2) continue;
    const keys = group.map(storyKey).sort();
    const components = new Set(group.map((s) => `${s.layer}/${s.name}`));
    if (components.size > 1) {
      violations.push({
        kind: "cross-component-png-duplicate",
        hash,
        keys,
        reason: "identical pixels for different components: the render does not show the component",
      });
    } else {
      duplicates.push({ basis: "png", hash, keys, reason: "identical pixels across states of one component (reported, not a failure)" });
    }
  }
  return { violations, duplicates };
}

/** Both gates over one capture run, plus the PNG-level duplicate check. */
export function gateCapture(stories, stagingAbs, captureCfg, ignoredFiles = []) {
  const pixel = pixelGate(stories, stagingAbs, captureCfg);
  const structure = structureGate(stories);
  const png = pngDuplicates(stories, pixel.evidence);
  return {
    violations: [...pixel.violations, ...structure.violations, ...png.violations],
    duplicates: [...structure.duplicates, ...png.duplicates],
    pixel,
    ignoredFiles,
  };
}

function gateFields(captureCfg, gate) {
  return {
    pixels: captureCfg.pixels,
    pixelsReason: captureCfg.pixelsReason,
    violations: gate.violations,
    duplicates: gate.duplicates,
    ignoredFiles: gate.ignoredFiles,
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
      content = readFileSync(full, "utf8").replace(/\r\n/g, "\n");
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
const NO_RECEIPT_FILE = "no receipt.json beside the goldens: run --baseline to stamp them, or --accept <glob> for a changed one";

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

/**
 * The receipt entry for one captured story. Pixels-required platforms also record the PNG evidence.
 * Source digests come from the manifest item, when it names files.
 */
export function receiptEntry(projectRoot, captureCfg, story, mode, evidence = null) {
  const entry = { hash: story.hash, ext: story.rel.slice(story.rel.lastIndexOf(".")), mode };
  if (captureCfg.pixels === "required") {
    if (!evidence) throw new Error(`no pixel evidence for ${storyKey(story)}; the pixel gate should have refused it`);
    entry.png = evidence;
  }
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

/**
 * Merge entries into receipt.json atomically, with the platform's pixel decision at the top.
 * Entries whose golden file is gone are pruned. `prior` must be read before any golden moves.
 */
export function writeReceipts(projectRoot, captureCfg, entries, prior = readReceipts(projectRoot, captureCfg)) {
  const file = receiptPath(projectRoot, captureCfg);
  const goldensAbs = under(projectRoot, captureCfg.goldens);
  ensureDir(dirname(file));
  const merged = { ...(prior?.goldens || {}), ...entries };
  const kept = Object.keys(merged)
    .sort()
    .filter((k) => existsSync(join(goldensAbs, `${k}${merged[k].ext}`)));
  const goldens = Object.fromEntries(kept.map((k) => [k, merged[k]]));
  const body =
    JSON.stringify(
      { version: 1, platform: captureCfg.platform, pixels: captureCfg.pixels, pixelsReason: captureCfg.pixelsReason, goldens },
      null,
      2,
    ) + "\n";
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

/** Which stories are new, unchanged, or changed against the goldens on disk. Hashes are line-ending-normalized. */
export function planGoldens(projectRoot, captureCfg, stories) {
  const goldensAbs = under(projectRoot, captureCfg.goldens);
  const plan = { added: [], unchanged: [], changed: [] };
  for (const s of stories) {
    const dst = join(goldensAbs, s.rel);
    const key = storyKey(s);
    if (!existsSync(dst)) plan.added.push(key);
    else if (goldenHash(dst) === s.hash) plan.unchanged.push(key);
    else plan.changed.push(key);
  }
  return plan;
}

function goldenHash(full) {
  return fingerprint(readFileSync(full, "utf8").replace(/\r\n/g, "\n"));
}

/** Copy the given captured stories from staging into the goldens folder. Returns their rel paths. */
export function writeGoldenSet(projectRoot, captureCfg, stories) {
  const stagingAbs = under(projectRoot, captureCfg.staging);
  const goldensAbs = under(projectRoot, captureCfg.goldens);
  ensureDir(goldensAbs);
  const written = [];
  for (const s of stories) {
    const dst = join(goldensAbs, s.rel);
    ensureDir(dirname(dst));
    copyFileSync(join(stagingAbs, s.rel), dst);
    written.push(s.rel);
  }
  return written;
}

/** Capture once and gate the result, without writing anything. For scripts that apply their own policy. */
export function captureAndGate(projectRoot, captureCfg, layerFilter = null, opts = {}) {
  const capture = runCapture(projectRoot, captureCfg, layerFilter, opts);
  const gate = gateCapture(capture.stories, under(projectRoot, captureCfg.staging), captureCfg, capture.ignoredFiles);
  return { capture, gate };
}

// ---------------------------------------------------------------------------
// Modes
// ---------------------------------------------------------------------------

/**
 * --baseline never blesses drift. Stories with no golden are added. A golden that already matches the
 * capture is stamped with a receipt. A golden that differs is refused: nothing is written, and the
 * changed keys are listed for --accept.
 */
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
      added: [],
      unchanged: [],
      changed: [],
      violations: [],
      duplicates: [],
    };
  }
  const stagingAbs = under(projectRoot, captureCfg.staging);
  const gate = gateCapture(cap.stories, stagingAbs, captureCfg, cap.ignoredFiles);
  gate.violations.push(...uncapturedItems(captureCfg, cap.stories, layerFilter));
  if (gate.violations.length) return blocked("baseline", captureCfg, cap, gate);

  const prior = readReceipts(projectRoot, captureCfg);
  const plan = planGoldens(projectRoot, captureCfg, cap.stories);
  if (plan.changed.length) {
    return {
      mode: "baseline",
      exit: 1,
      vacuous: false,
      message:
        `${plan.changed.length} golden(s) differ from the capture: ${plan.changed.join(", ")}. ` +
        `Nothing was written; use --accept <glob> to accept a changed golden.`,
      stories: cap.stories,
      written: [],
      ...plan,
      ...gateFields(captureCfg, gate),
    };
  }
  // Receipt entries are built before any golden moves, so a missing source file leaves nothing half-written.
  const entries = {};
  for (const s of cap.stories) entries[storyKey(s)] = receiptEntry(projectRoot, captureCfg, s, "baseline", gate.pixel.evidence.get(storyKey(s)));
  const added = cap.stories.filter((s) => plan.added.includes(storyKey(s)));
  const written = writeGoldenSet(projectRoot, captureCfg, added);
  writeReceipts(projectRoot, captureCfg, entries, prior);
  return {
    mode: "baseline",
    exit: 0,
    vacuous: false,
    message: `Added ${plan.added.length} golden(s); stamped ${plan.unchanged.length} matching golden(s) under ${captureCfg.goldens}`,
    stories: cap.stories,
    written,
    ...plan,
    ...gateFields(captureCfg, gate),
  };
}

const RECEIPT_HELP = "run --baseline to stamp goldens that match and add new ones; changed goldens need --accept <glob>";

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
  const gate = gateCapture(cap.stories, stagingAbs, captureCfg, cap.ignoredFiles);
  gate.violations.push(...uncapturedItems(captureCfg, cap.stories, layerFilter));
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
  const gate = gateCapture(cap.stories, stagingAbs, captureCfg, cap.ignoredFiles);
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
  const prior = readReceipts(projectRoot, captureCfg);
  const entries = {};
  for (const s of chosen) entries[storyKey(s)] = receiptEntry(projectRoot, captureCfg, s, "accept", gate.pixel.evidence.get(storyKey(s)));
  const accepted = writeGoldenSet(projectRoot, captureCfg, chosen);
  writeReceipts(projectRoot, captureCfg, entries, prior);
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
      ...(moved.length === 0
        ? {
            note:
              "A comment-only perturbation does not change a compiled render, so no story moving here does not mean " +
              "nothing depends on this component. --composes is the composition gate.",
          }
        : {}),
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
 * --audit core. Every golden must be receipted, non-empty, and not a copy of another component's body.
 * Every receipted source must still match the file on disk. Where pixels are required, every receipt
 * entry must carry PNG evidence, and a built item that names a source must have its source hashes.
 * Runs no capture.
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
  const noPixelEvidence =
    captureCfg.pixels === "required"
      ? Object.keys(receipts?.goldens || {})
          .sort()
          .filter((key) => !receipts.goldens[key].png)
          .map((key) => ({ key, reason: "golden has no pixel evidence" }))
      : [];
  const noSourceHashes = noSourceHashesOf(captureCfg, receipts);
  const failing =
    unreceipted.length +
    empty.length +
    crossComponentDuplicates.length +
    staleSources.length +
    noPixelEvidence.length +
    noSourceHashes.length;
  const exit = goldens.length === 0 ? 3 : failing > 0 ? 1 : 0;
  const pixelNote = captureCfg.pixels === "none" ? ` (pixels not required: ${captureCfg.pixelsReason})` : "";
  return {
    mode: "audit",
    platform: platformId,
    exit,
    vacuous: goldens.length === 0,
    pixels: captureCfg.pixels,
    pixelsReason: captureCfg.pixelsReason,
    message:
      goldens.length === 0
        ? `No goldens under ${captureCfg.goldens} to audit`
        : failing === 0
          ? `Audit clean: ${goldens.length} golden(s) receipted, non-empty, distinct; sources unchanged${pixelNote}`
          : `Audit failed: ${unreceipted.length} unreceipted, ${empty.length} empty, ${crossComponentDuplicates.length} cross-component duplicate group(s), ${staleSources.length} stale source(s), ${noPixelEvidence.length} without pixel evidence, ${noSourceHashes.length} without source hashes${pixelNote}`,
    goldenCount: goldens.length,
    receiptMissing: goldens.length > 0 && receipts === null,
    unreceipted,
    empty,
    crossComponentDuplicates,
    staleSources,
    noPixelEvidence,
    noSourceHashes,
  };
}

function noSourceHashesOf(captureCfg, receipts) {
  const out = [];
  for (const key of Object.keys(receipts?.goldens || {}).sort()) {
    const [layer, name] = key.split("/");
    const item = captureCfg.items[`${layer}/${name}`];
    if (!item || item.status === "pending" || !(item.file || item.story)) continue;
    if (receipts.goldens[key].source) continue;
    out.push({ key, reason: `receipt has no source hashes for ${key}` });
  }
  return out;
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
// --composes: does each composing item's source actually name what it composes?
// ---------------------------------------------------------------------------

const C_LIKE_EXT = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".mts", ".cts", ".swift", ".kt", ".kts", ".java", ".go", ".rs", ".c", ".h", ".cc", ".cpp", ".hpp", ".cs", ".dart", ".scala", ".m", ".mm", ".groovy"]);
const MARKUP_EXT = new Set([".html", ".htm", ".svelte", ".vue", ".astro", ".xml"]);
const HASH_EXT = new Set([".py", ".rb", ".ex", ".exs", ".sh", ".bash", ".pl", ".yml", ".yaml", ".r"]);
const DASH_EXT = new Set([".lua", ".sql", ".hs"]);
const IMPORT_LINE = /^\s*(import\b|use\s|using\s|require\b|from\s+\S+\s+import\b|package\s|#include|@import\b|export\s*\{[^}]*\}\s*from\b)/;

/** Blank out comments and string literals, keeping line breaks, so only code is searched. */
function scanCode(text, { line, block }) {
  let out = "";
  let i = 0;
  const n = text.length;
  while (i < n) {
    const c = text[i];
    if (line && text.startsWith(line, i)) {
      while (i < n && text[i] !== "\n") {
        out += " ";
        i++;
      }
      continue;
    }
    if (block && text.startsWith("/*", i)) {
      const end = text.indexOf("*/", i + 2);
      const stop = end < 0 ? n : end + 2;
      out += text.slice(i, stop).replace(/[^\n]/g, " ");
      i = stop;
      continue;
    }
    if (c === '"' || c === "'" || (block && c === "`")) {
      let j = i + 1;
      while (j < n && text[j] !== c) {
        if (text[j] === "\\") j++;
        if (text[j] === "\n" && c !== "`") break;
        j++;
      }
      const stop = Math.min(j + 1, n);
      out += text.slice(i, stop).replace(/[^\n]/g, " ");
      i = stop;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

/** Drop import, use, require and re-export lines: naming a component there is not using it. */
function dropImports(code) {
  return code
    .split("\n")
    .map((l) => (IMPORT_LINE.test(l) || /\brequire\s*\(/.test(l) ? "" : l))
    .join("\n");
}

/**
 * The code of one source file, with comments, string literals and import lines removed. Comment
 * syntax follows the file extension. Markup files take <!-- --> comments; their <script> blocks take
 * the C-like rules.
 */
export function stripCode(text, file) {
  const ext = extname(file).toLowerCase();
  if (MARKUP_EXT.has(ext)) {
    const noMarkupComments = text.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, " "));
    return noMarkupComments.replace(
      /(<script\b[^>]*>)([\s\S]*?)(<\/script>)/gi,
      (_, open, body, close) => open + dropImports(scanCode(body, { line: "//", block: true })) + close,
    );
  }
  if (HASH_EXT.has(ext)) return dropImports(scanCode(text, { line: "#", block: false }));
  if (DASH_EXT.has(ext)) return dropImports(scanCode(text, { line: "--", block: false }));
  return dropImports(scanCode(text, { line: "//", block: true }));
}

/**
 * Does the code use the name? A use is <Name (markup, incl. </Name>), Name( or Name { (call or trailing
 * closure), or Name. (member access). It is not a bare word, and not part of a longer identifier.
 */
export function usesName(code, name) {
  const n = escapeRe(name);
  const pattern = new RegExp(
    `<${n}(?=[\\s/>])|<\\/${n}\\s*>|(?<![\\w$.\\-])${n}\\s*[({]|(?<![\\w$.\\-])${n}\\.`,
  );
  return pattern.test(code);
}

const COMPOSES_NOTE =
  "Checks syntax, not types. A use is a name written as <Name, Name( or Name {, or Name. A bare word, a string, a comment, " +
  "an import, or a longer identifier does not count. Not seen: a component reached only through a re-export under another " +
  "name; a name built at run time; a use that is only a type or a value, with no call, markup or member access. Comment and " +
  "string stripping is a text scan: approximate for Python, Ruby, Lua, SQL and Haskell, and Rust lifetimes are read as quotes.";

/**
 * --composes: for each inventory entry that lists composes, the manifest item must be built (not pending,
 * with a file that exists) and its source must use every composed name. Unbuilt entries are a failure with
 * --layer, and are listed under notBuilt without it. Zero entries checked is exit 3.
 */
export function modeComposes(projectRoot, platformConfig, layerFilter = null) {
  const invPath = join(projectRoot, "design", "inventory.json");
  if (!existsSync(invPath)) {
    throw new Error(`--composes needs design/inventory.json; none found under ${projectRoot}`);
  }
  let inventory;
  try {
    inventory = JSON.parse(readFileSync(invPath, "utf8"));
  } catch (e) {
    throw new Error(`design/inventory.json is not valid JSON: ${e.message}`);
  }
  const checked = [];
  const notBuilt = [];
  const violations = [];
  for (const layer of ITEM_LAYERS) {
    if (layerFilter && layer !== layerFilter) continue;
    for (const entry of inventory[layer] || []) {
      if (!Array.isArray(entry.composes) || entry.composes.length === 0) continue;
      const key = `${layer}/${entry.name}`;
      const item = (platformConfig[layer] || []).find((i) => i && i.name === entry.name);
      const built = Boolean(item && item.status !== "pending" && item.file && existsSync(join(projectRoot, item.file)));
      if (!built) {
        if (layerFilter) {
          violations.push({
            kind: "not-built",
            item: entry.name,
            layer,
            composes: entry.composes,
            file: item?.file ?? null,
            reason: `${key} lists composes but is not built or not recorded`,
          });
        } else {
          notBuilt.push(key);
        }
        continue;
      }
      const code = stripCode(readFileSync(join(projectRoot, item.file), "utf8"), item.file);
      const missing = entry.composes.filter((name) => !usesName(code, name));
      checked.push(key);
      if (missing.length) {
        violations.push({
          kind: "composes-not-used",
          item: entry.name,
          layer,
          composes: entry.composes,
          missing,
          file: item.file,
          reason: `${key} does not use ${missing.join(", ")} in ${item.file}`,
        });
      }
    }
  }
  const exit = violations.length ? 1 : checked.length ? 0 : 3;
  return {
    mode: "composes",
    exit,
    vacuous: exit === 3,
    message: violations.length
      ? `${violations.length} item(s) do not use what they compose`
      : checked.length
        ? `Composition uses what it composes for ${checked.length} item(s)`
        : "No built item declares composes; nothing was checked",
    checked: checked.length,
    checkedItems: checked,
    notBuilt,
    violations,
    note: checked.length ? COMPOSES_NOTE : `No built item declares composes; nothing was checked. ${COMPOSES_NOTE}`,
  };
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
      "  Modes: --baseline | --check | --accept <glob> | --render | --audit | --blast <name> | --reach <name...> | --composes\n" +
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
    if (a === "--baseline" || a === "--check" || a === "--render" || a === "--audit" || a === "--composes") {
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
  if (only && mode !== "render") throw new Error("--only is valid only with --render");
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

const inside = (p, root) => p === root || p.startsWith(root + sep);

function isSymlink(p) {
  try {
    return lstatSync(p).isSymbolicLink();
  } catch {
    return false;
  }
}

/** The nearest existing ancestor of abs, resolved through symbolic links, with the missing rest appended. */
function realpathNearest(abs) {
  let cur = abs;
  const rest = [];
  while (!existsSync(cur)) {
    rest.unshift(basename(cur));
    const parent = dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  return join(realpathSync(cur), ...rest);
}

/**
 * A staging directory is deleted before each capture, so it must be unambiguous. It is accepted only
 * when, after realpath, it lies inside <project>/design/.captures/ or the system temporary directory.
 * It must not be the filesystem root, the project, anything containing the project or design/, or
 * overlap the goldens. A symbolic link on the path inside the project is refused. Throws before anything
 * is deleted.
 */
export function assertStagingAllowed(projectRoot, stagingRel, label, goldensRel) {
  const proj = resolve(projectRoot);
  const abs = resolve(proj, stagingRel);
  const refuse = (why) => {
    throw new Error(`${label} ${stagingRel} is not an allowed staging directory: ${why}`);
  };
  if (abs === parse(abs).root) refuse("it is the filesystem root");
  const relToProj = relative(proj, abs);
  if (relToProj && !relToProj.startsWith("..") && !isAbsolute(relToProj)) {
    let cur = proj;
    for (const seg of relToProj.split(sep)) {
      cur = join(cur, seg);
      if (isSymlink(cur)) refuse(`a symbolic link is on the path (${relative(proj, cur)})`);
    }
  }
  const real = realpathNearest(abs);
  const realProj = realpathSync(proj);
  const designDir = join(realProj, "design");
  const capDir = join(designDir, ".captures");
  const goldensReal = realpathNearest(resolve(proj, goldensRel));
  const tmp = realpathSync(tmpdir());
  if (inside(realProj, real)) refuse("it would contain the project root");
  if (inside(designDir, real)) refuse("it would contain design/");
  if (inside(real, goldensReal) || inside(goldensReal, real)) refuse("it overlaps the goldens folder");
  if (inside(real, designDir) && !inside(real, capDir)) refuse("it is inside design/ but outside design/.captures/");
  if (inside(real, capDir) || inside(real, tmp)) return stagingRel;
  return refuse("it must be inside design/.captures/ or the system temporary directory");
}

/**
 * Delete a staging directory only after assertStagingAllowed. Both capture deletes call this,
 * so the refusal does not depend on the CLI having already checked the path.
 */
function clearStaging(projectRoot, stagingRel, label, goldensRel) {
  assertStagingAllowed(projectRoot, stagingRel, label, goldensRel);
  const stagingRoot = under(projectRoot, stagingRel);
  if (existsSync(stagingRoot)) rmSync(stagingRoot, { recursive: true, force: true });
  return stagingRoot;
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
    if (captureCfg.pixels === "none") process.stderr.write(`PIXELS NOT REQUIRED: ${captureCfg.pixelsReason}\n`);
    const stagingRel = parsed.out ?? captureCfg.staging;
    assertStagingAllowed(projectRoot, stagingRel, parsed.out ? "--out" : "capture.staging", captureCfg.goldens);
    captureCfg.staging = stagingRel;

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
      case "composes":
        report = modeComposes(projectRoot, platformConfig, parsed.layer);
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
  if (report.mode === "composes") {
    for (const v of report.violations) {
      lines.push(`  composes  ${v.reason}`);
    }
  } else {
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
  }
  for (const line of lines) process.stderr.write(`${line}\n`);
}

export { findCatalogSources, braceExpand, globToRegex, makeMatcher, parseArgs, pngDuplicates };

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) process.exit(main(process.argv.slice(2)));
