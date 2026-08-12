#!/usr/bin/env node
// evolve-lib.mjs — deterministic inventory apply + prove helpers for evolve E5/E6.
//
// Interactive E4 (USER_CHOICE confirm) stays in the workflow; this module is the
// atomic apply/prove machinery that agents and tests drive after confirmation.
// Zero runtime deps beyond Node + verify-catalog.

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
  unlinkSync,
} from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import {
  fingerprint,
  modeBaseline,
  modeCheck,
  resolveCaptureConfig,
  resolvePlatform,
  runCapture,
  inventoryDir,
  storyKey,
} from "./verify-catalog.mjs";

const SKIP = new Set(["node_modules", ".git", "dist", "build", ".next", ".turbo", "coverage", ".cache"]);

function walk(root, acc = []) {
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
      if (SKIP.has(name)) continue;
      walk(full, acc);
    } else acc.push(full);
  }
  return acc;
}

function loadManifest(projectRoot) {
  const p = join(projectRoot, "design", "manifest.json");
  return JSON.parse(readFileSync(p, "utf8"));
}

function saveManifest(projectRoot, manifest) {
  writeFileSync(join(projectRoot, "design", "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");
}

function ensureDir(d) {
  mkdirSync(d, { recursive: true });
}

/**
 * Mark an entity deprecated on the platform, badge its story sources, and
 * ensure composing it becomes a gate violation under verify-catalog --check.
 */
export function applyDeprecation(projectRoot, platformId, name, meta = {}) {
  const manifest = loadManifest(projectRoot);
  const { id, config } = resolvePlatform(manifest, platformId);
  if (!config.deprecations || typeof config.deprecations !== "object") config.deprecations = {};
  config.deprecations[name] = {
    since: meta.since || new Date().toISOString().slice(0, 10),
    replacement: meta.replacement || null,
    reason: meta.reason || "Deprecated via evolve --deprecate",
  };
  if (manifest.platforms) manifest.platforms[id] = config;
  else Object.assign(manifest, config);
  saveManifest(projectRoot, manifest);

  const captureCfg = resolveCaptureConfig(config, id);
  const catalogRoot = join(projectRoot, captureCfg.catalogDir);
  const badged = [];
  if (existsSync(catalogRoot)) {
    for (const full of walk(catalogRoot)) {
      const rel = relative(catalogRoot, full).split(sep).join("/");
      const parts = rel.split("/");
      if (parts.length >= 3 && parts[1] === name) {
        let body = readFileSync(full, "utf8");
        if (!body.includes("[deprecated]")) {
          body = `[deprecated] ${name}${meta.replacement ? ` → use ${meta.replacement}` : ""}\n` + body;
          writeFileSync(full, body, "utf8");
          badged.push(rel);
        }
      }
    }
  }
  // Also badge any source files under src/ that share the component name
  const srcRoot = join(projectRoot, "src");
  if (existsSync(srcRoot)) {
    for (const full of walk(srcRoot)) {
      if (!full.includes(name)) continue;
      if (!/\.(tsx?|jsx?|svelte|txt|md)$/.test(full)) continue;
      let body = readFileSync(full, "utf8");
      if (!body.includes("[deprecated]") && (full.includes(`/${name}.`) || full.includes(`/${name}/`))) {
        body = `/** [deprecated] ${name}${meta.replacement ? ` → use ${meta.replacement}` : ""} */\n` + body;
        writeFileSync(full, body, "utf8");
        badged.push(relative(projectRoot, full).split(sep).join("/"));
      }
    }
  }
  return { platform: id, name, deprecation: config.deprecations[name], badged };
}

/**
 * Scan project sources for composition of deprecated names.
 * A file that is the deprecated entity itself is exempt; dependents that import
 * or compose it are violations.
 */
export function detectDeprecatedComposition(projectRoot, platformId) {
  const manifest = loadManifest(projectRoot);
  const { id, config } = resolvePlatform(manifest, platformId);
  const deps = config.deprecations || {};
  const names = Object.keys(deps);
  if (names.length === 0) return { platform: id, violations: [], deprecations: names };

  const violations = [];
  const roots = ["src", "sandbox"].map((r) => join(projectRoot, r)).filter(existsSync);
  for (const root of roots) {
    for (const full of walk(root)) {
      const rel = relative(projectRoot, full).split(sep).join("/");
      // skip the deprecated entity's own files
      let content;
      try {
        content = readFileSync(full, "utf8");
      } catch {
        continue;
      }
      for (const name of names) {
        const isSelf =
          rel.includes(`/${name}/`) ||
          rel.includes(`/${name}.`) ||
          rel.endsWith(`/${name}`) ||
          new RegExp(`(^|/)${name}\\.[^/]+$`).test(rel);
        if (isSelf) continue;
        // composition markers or imports
        const patterns = [
          new RegExp(`---\\s*composed:${name}\\s*---`),
          new RegExp(`@compose\\s+${name}\\b`),
          new RegExp(`from\\s+['"][^'"]*${name}['"]`),
          new RegExp(`import\\s*\\{[^}]*\\b${name}\\b`),
          new RegExp(`<${name}[\\s/>]`),
          new RegExp(`\\b${name}\\b`, "g"),
        ];
        // For text catalogs, require a strong signal (compose marker or import)
        const strong = patterns.slice(0, 5).some((re) => re.test(content));
        if (strong) {
          violations.push({
            file: rel,
            deprecated: name,
            replacement: deps[name]?.replacement || null,
            reason: deps[name]?.reason || "",
          });
        }
      }
    }
  }
  return { platform: id, violations, deprecations: names };
}

/**
 * Atomic removal checklist (E5): component/story sources, goldens, manifest entries.
 * Returns a report; does not run prove (caller must call proveRemoval).
 */
export function applyRemoval(projectRoot, platformId, names) {
  const manifest = loadManifest(projectRoot);
  const { id, config } = resolvePlatform(manifest, platformId);
  const captureCfg = resolveCaptureConfig(config, id);
  const removed = { sources: [], goldens: [], manifest: [] };
  const nameSet = new Set(names);

  // sources under catalog
  const catalogRoot = join(projectRoot, captureCfg.catalogDir);
  if (existsSync(catalogRoot)) {
    for (const full of walk(catalogRoot)) {
      const rel = relative(catalogRoot, full).split(sep).join("/");
      const parts = rel.split("/");
      if (parts.length >= 2 && nameSet.has(parts[1])) {
        unlinkSync(full);
        removed.sources.push(rel);
      }
    }
  }
  // sources under src/
  const srcRoot = join(projectRoot, "src");
  if (existsSync(srcRoot)) {
    for (const full of walk(srcRoot)) {
      const rel = relative(projectRoot, full).split(sep).join("/");
      if ([...nameSet].some((n) => rel.includes(`/${n}/`) || rel.includes(`/${n}.`))) {
        unlinkSync(full);
        removed.sources.push(rel);
      }
    }
  }
  // goldens
  const goldensRoot = join(projectRoot, captureCfg.goldens);
  if (existsSync(goldensRoot)) {
    for (const full of walk(goldensRoot)) {
      const rel = relative(goldensRoot, full).split(sep).join("/");
      const parts = rel.split("/");
      if (parts.length >= 2 && nameSet.has(parts[1])) {
        unlinkSync(full);
        removed.goldens.push(rel);
      }
    }
  }
  // manifest inventory
  for (const key of ["atoms", "molecules", "organisms", "screens"]) {
    if (!Array.isArray(config[key])) continue;
    const before = config[key].length;
    config[key] = config[key].filter((e) => !nameSet.has(e.name));
    if (config[key].length !== before) removed.manifest.push(key);
  }
  if (manifest.platforms) manifest.platforms[id] = config;
  saveManifest(projectRoot, manifest);
  return { platform: id, names: [...nameSet], removed };
}

/**
 * Add a new story source + optional manifest entry (E5 add side before build handoff).
 */
export function applyAddition(projectRoot, platformId, { layer, name, state = "default", body, file, story }) {
  const manifest = loadManifest(projectRoot);
  const { id, config } = resolvePlatform(manifest, platformId);
  const captureCfg = resolveCaptureConfig(config, id);
  const catalogRoot = join(projectRoot, captureCfg.catalogDir);
  ensureDir(join(catalogRoot, layer, name));
  const rel = `${layer}/${name}/${state}.txt`;
  writeFileSync(join(catalogRoot, rel), body.endsWith("\n") ? body : body + "\n", "utf8");

  const invKey =
    layer === "screens" || layer === "views"
      ? "screens"
      : layer === "organisms"
        ? "organisms"
        : layer === "molecules"
          ? "molecules"
          : "atoms";
  if (!Array.isArray(config[invKey])) config[invKey] = [];
  if (!config[invKey].some((e) => e.name === name)) {
    config[invKey].push({
      name,
      file: file || `src/${invKey}/${name}.tsx`,
      story: story || `src/${invKey}/${name}.stories.tsx`,
      status: "verified",
    });
  }
  if (manifest.platforms) manifest.platforms[id] = config;
  saveManifest(projectRoot, manifest);
  return { platform: id, layer, name, state, rel };
}

/**
 * E6 prove add: every pre-existing golden hash must still match after re-capture;
 * new entity goldens must exist.
 */
export function proveAddition(projectRoot, platformId, newNames, priorGoldenHashes) {
  const manifest = loadManifest(projectRoot);
  const { id, config } = resolvePlatform(manifest, platformId);
  const captureCfg = resolveCaptureConfig(config, id);
  // baseline new stories into goldens
  modeBaseline(projectRoot, captureCfg, null);
  const check = modeCheck(projectRoot, captureCfg, null);
  const goldens = inventoryDir(projectRoot, captureCfg.goldens);
  const byKey = new Map(goldens.map((g) => [storyKey(g), g]));
  const disturbed = [];
  for (const [key, hash] of Object.entries(priorGoldenHashes || {})) {
    const g = byKey.get(key);
    if (!g) {
      disturbed.push({ key, reason: "pre-existing golden missing after add" });
      continue;
    }
    if (g.hash !== hash) disturbed.push({ key, reason: "pre-existing golden moved", before: hash, after: g.hash });
  }
  const missingNew = [];
  for (const name of newNames) {
    const found = goldens.some((g) => g.name === name);
    if (!found) missingNew.push(name);
  }
  return {
    ok: disturbed.length === 0 && missingNew.length === 0 && check.exit === 0,
    disturbed,
    missingNew,
    check,
    platform: id,
  };
}

/**
 * E6 prove remove: removed stories gone; remaining goldens unchanged vs prior snapshot.
 */
export function proveRemoval(projectRoot, platformId, removedNames, priorRemainingHashes) {
  const manifest = loadManifest(projectRoot);
  const { id, config } = resolvePlatform(manifest, platformId);
  const captureCfg = resolveCaptureConfig(config, id);
  const check = modeCheck(projectRoot, captureCfg, null);
  const goldens = inventoryDir(projectRoot, captureCfg.goldens);
  const stillPresent = goldens.filter((g) => removedNames.includes(g.name)).map((g) => storyKey(g));
  const moved = [];
  const byKey = new Map(goldens.map((g) => [storyKey(g), g]));
  for (const [key, hash] of Object.entries(priorRemainingHashes || {})) {
    const g = byKey.get(key);
    if (!g) {
      moved.push({ key, reason: "remaining golden disappeared" });
      continue;
    }
    if (g.hash !== hash) moved.push({ key, reason: "remaining golden moved", before: hash, after: g.hash });
  }
  return {
    ok: stillPresent.length === 0 && moved.length === 0 && (check.exit === 0 || check.exit === 3),
    stillPresent,
    moved,
    check,
    platform: id,
  };
}

export function snapshotGoldenHashes(projectRoot, platformId) {
  const manifest = loadManifest(projectRoot);
  const { id, config } = resolvePlatform(manifest, platformId);
  const captureCfg = resolveCaptureConfig(config, id);
  const goldens = inventoryDir(projectRoot, captureCfg.goldens);
  const out = {};
  for (const g of goldens) out[storyKey(g)] = g.hash;
  return out;
}

export {
  loadManifest,
  saveManifest,
  resolvePlatform,
  resolveCaptureConfig,
  modeBaseline,
  modeCheck,
  runCapture,
  fingerprint,
};
