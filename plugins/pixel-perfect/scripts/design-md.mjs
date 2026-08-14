#!/usr/bin/env node
// design-md.mjs — generate / lint / diff a project-root DESIGN.md.
//
// DESIGN.md is generated from the pixel-perfect manifest + design tokens
// (never hand-authored). lint and diff shell to the pinned
// `@google/design.md` CLI via `npx -p @google/design.md designmd`.
//
// Exit vocabulary matches verify-catalog.mjs:
//   0 pass · 1 drift (incl. Google's regression: true) · 2 config/usage · 3 vacuous
//
// Usage:
//   node design-md.mjs --generate <project-root>
//   node design-md.mjs --lint <project-root>
//   node design-md.mjs --diff <project-root>
//   node design-md.mjs --diff --before <a.md> --after <b.md>

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const DESIGNMD_PACKAGE = "@google/design.md";
export const DESIGNMD_VERSION = "0.4.0";
export const DESIGNMD_PIN = `${DESIGNMD_PACKAGE}@${DESIGNMD_VERSION}`;
export const DESIGNMD_BIN = "designmd";

const PREVIOUS_REL = "design/.design-md.previous.md";
const RECEIPT_REL = "design/design-md-diff.json";
const DESIGN_REL = "DESIGN.md";

const COLOR_RE = /^(#(?:[0-9a-f]{3,8})|rgba?\(|hsla?\(|oklch\(|oklab\(|lab\(|lch\(|color\()/i;
const DIM_RE = /^-?\d+(\.\d+)?(px|rem|em)$/i;

// ---------------------------------------------------------------------------
// FS / YAML
// ---------------------------------------------------------------------------

function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
}

function yamlScalar(value) {
  if (value == null) return '""';
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  const s = String(value);
  if (/^[A-Za-z0-9._/-]+$/.test(s) && !/^(true|false|null|yes|no|on|off)$/i.test(s)) return s;
  return JSON.stringify(s);
}

function emitYamlMap(obj, indent = 0) {
  const pad = "  ".repeat(indent);
  let out = "";
  for (const [key, value] of Object.entries(obj)) {
    if (value == null) continue;
    if (typeof value === "object" && !Array.isArray(value)) {
      out += `${pad}${key}:\n${emitYamlMap(value, indent + 1)}`;
    } else {
      out += `${pad}${key}: ${yamlScalar(value)}\n`;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Color contrast (so generated components stay WCAG AA for Google's lint)
// ---------------------------------------------------------------------------

function parseHex(color) {
  if (typeof color !== "string") return null;
  const m = color.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function relLuminance(rgb) {
  const lin = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

export function contrastRatio(a, b) {
  const pa = parseHex(a);
  const pb = parseHex(b);
  if (!pa || !pb) return null;
  const la = relLuminance(pa);
  const lb = relLuminance(pb);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

function pickOnColor(bg) {
  const white = contrastRatio(bg, "#FFFFFF") ?? 0;
  const black = contrastRatio(bg, "#111111") ?? 0;
  return white >= black ? "#FFFFFF" : "#111111";
}

// ---------------------------------------------------------------------------
// Token collection
// ---------------------------------------------------------------------------

function walkJsonFiles(dir, acc = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const name of entries) {
    if (name.startsWith(".")) continue;
    const full = join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      if (name === "node_modules") continue;
      walkJsonFiles(full, acc);
    } else if (name.endsWith(".json") && name !== "CHANGELOG.json" && name !== "theme.schema.json") {
      acc.push(full);
    }
  }
  return acc;
}

function tokenSearchRoots(projectRoot) {
  return [
    join(projectRoot, "design/system/tokens"),
    join(projectRoot, "design/tokens"),
    join(projectRoot, "design/system"),
  ].filter((p) => existsSync(p));
}

function lookUp(obj, dotted) {
  const parts = dotted.split(".");
  let cur = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = cur[p];
  }
  return cur;
}

function firstString(sources, paths) {
  for (const src of sources) {
    for (const p of paths) {
      const v = lookUp(src, p);
      if (typeof v === "string" && v.trim()) return v.trim();
    }
  }
  return undefined;
}

function flattenLeaves(obj, prefix = [], acc = []) {
  if (obj == null) return acc;
  if (typeof obj !== "object" || Array.isArray(obj)) {
    acc.push({ path: prefix.join("."), value: obj });
    return acc;
  }
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith("$")) continue;
    flattenLeaves(v, [...prefix, k], acc);
  }
  return acc;
}

function isColor(value) {
  return typeof value === "string" && COLOR_RE.test(value.trim());
}

function isDimension(value) {
  if (typeof value === "number" && Number.isFinite(value)) return true;
  return typeof value === "string" && DIM_RE.test(value.trim());
}

function asDimension(value) {
  if (typeof value === "number") return `${value}px`;
  return String(value).trim();
}

export function collectTokenSources(projectRoot) {
  const files = [];
  const seed = join(projectRoot, "design/theme-seed.json");
  if (existsSync(seed)) files.push(seed);
  for (const root of tokenSearchRoots(projectRoot)) {
    for (const f of walkJsonFiles(root)) {
      if (!files.includes(f)) files.push(f);
    }
  }
  // Prefer light theme when both exist so generated DESIGN.md is one identity.
  files.sort((a, b) => {
    const al = /theme\.light\.json$/.test(a) ? 0 : /theme\.dark\.json$/.test(a) ? 2 : 1;
    const bl = /theme\.light\.json$/.test(b) ? 0 : /theme\.dark\.json$/.test(b) ? 2 : 1;
    return al - bl || a.localeCompare(b);
  });
  const sources = [];
  for (const file of files) {
    try {
      const parsed = JSON.parse(readFileSync(file, "utf8"));
      if (parsed && typeof parsed === "object") sources.push(parsed);
    } catch {
      // skip unreadable token files
    }
  }
  return { files, sources };
}

export function mapTokensToFrontMatter(sources, manifest = {}) {
  const colors = {};
  const typography = {};
  const rounded = {};
  const spacing = {};

  const primary =
    firstString(sources, [
      "accent.primary",
      "color.primary",
      "colors.primary",
      "primary",
      "text.heading",
    ]) || "#1A1C1E";
  const onPrimary =
    firstString(sources, ["accent.primary-fg", "text.inverse", "on-primary", "colors.on-primary"]) ||
    pickOnColor(primary);
  const secondary =
    firstString(sources, ["text.muted", "text.body", "color.secondary", "colors.secondary", "secondary"]) ||
    "#5C6166";
  const tertiary =
    firstString(sources, ["accent.cta", "accent.secondary", "color.tertiary", "colors.tertiary", "tertiary"]) ||
    primary;
  const neutral =
    firstString(sources, ["surface.page", "color.neutral", "colors.neutral", "neutral", "surface.raised"]) ||
    "#F7F5F2";
  const heading =
    firstString(sources, ["text.heading", "color.heading"]) || primary;
  const body = firstString(sources, ["text.body", "color.body"]) || secondary;

  colors.primary = primary;
  colors["on-primary"] = onPrimary;
  colors.secondary = secondary;
  colors.tertiary = tertiary;
  colors.neutral = neutral;
  if (heading !== primary) colors.heading = heading;
  if (body !== secondary) colors.body = body;

  // Pull any leftover hex colors under a stable kebab name so they are not dropped.
  for (const src of sources) {
    for (const leaf of flattenLeaves(src)) {
      if (!isColor(leaf.value)) continue;
      const last = leaf.path.split(".").pop();
      const key = last.replace(/[^A-Za-z0-9_-]/g, "-").toLowerCase();
      if (!key || colors[key]) continue;
      if (["page", "raised", "sunken", "soft", "overlay"].includes(key)) {
        if (!colors[key]) colors[key] = leaf.value;
      }
    }
  }

  const fontFamily =
    firstString(sources, ["type.font-body", "typography.fontFamily", "font.family", "fontFamily"]) ||
    "Public Sans";
  const h1Size = firstString(sources, ["type.page-title", "type.h1", "typography.h1.fontSize"]) || "32px";
  const bodySize = firstString(sources, ["type.body", "typography.body.fontSize"]) || "16px";
  const labelSize = firstString(sources, ["type.meta", "type.label", "typography.label.fontSize"]) || "12px";

  typography.h1 = { fontFamily, fontSize: h1Size, fontWeight: 600, lineHeight: 1.2 };
  typography["body-md"] = { fontFamily, fontSize: bodySize, fontWeight: 400, lineHeight: 1.5 };
  typography["label-sm"] = { fontFamily, fontSize: labelSize, fontWeight: 600, lineHeight: 1.3 };

  const rSubtle = firstString(sources, ["radius.subtle", "radius.sm", "rounded.sm"]);
  const rDefault = firstString(sources, ["radius.default", "radius.md", "rounded.md"]);
  rounded.sm = asDimension(rSubtle || "4px");
  rounded.md = asDimension(rDefault || "8px");

  const sMicro = firstString(sources, ["spacing.micro", "spacing.sm", "space.sm"]);
  const sInternal = firstString(sources, ["spacing.internal", "spacing.md", "space.md"]);
  const sBetween = firstString(sources, ["spacing.between", "spacing.lg", "space.lg"]);
  spacing.sm = asDimension(sMicro || "8px");
  spacing.md = asDimension(sInternal || "16px");
  if (sBetween) spacing.lg = asDimension(sBetween);

  // Fallback: first dimension-looking leaves if spacing/radius were empty.
  if (!sMicro && !sInternal) {
    for (const src of sources) {
      for (const leaf of flattenLeaves(src)) {
        if (!isDimension(leaf.value)) continue;
        if (/\b(space|spacing|gap|pad)/i.test(leaf.path) && Object.keys(spacing).length < 3) {
          const key = leaf.path.split(".").pop().replace(/[^A-Za-z0-9_-]/g, "-");
          if (key && !spacing[key]) spacing[key] = asDimension(leaf.value);
        }
      }
    }
  }

  const name =
    (typeof manifest.goal === "string" && manifest.goal.trim().slice(0, 80)) ||
    (typeof manifest.vibe === "string" && manifest.vibe.trim().slice(0, 60)) ||
    "Pixel Perfect";

  const buttonBg = colors.primary;
  const buttonFg =
    (contrastRatio(buttonBg, colors["on-primary"]) ?? 0) >= 4.5
      ? colors["on-primary"]
      : pickOnColor(buttonBg);
  if (buttonFg !== colors["on-primary"]) colors["on-primary"] = buttonFg;

  const components = {
    "button-primary": {
      backgroundColor: "{colors.primary}",
      textColor: "{colors.on-primary}",
      typography: "{typography.label-sm}",
      rounded: "{rounded.md}",
      padding: "12px",
    },
    "surface-page": {
      backgroundColor: "{colors.neutral}",
      textColor: "{colors.secondary}",
      typography: "{typography.body-md}",
      rounded: "{rounded.sm}",
    },
  };

  return {
    version: "alpha",
    name,
    colors,
    typography,
    rounded,
    spacing,
    components,
  };
}

export function extractThemeRationale(briefText) {
  if (!briefText || typeof briefText !== "string") return "";
  const section = briefText.match(/##\s+Theme rationale\s*\n([\s\S]*?)(?=\n##\s|$)/i);
  if (section) return section[1].trim();
  const paras = briefText
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p && !p.startsWith("#") && !p.startsWith("---"));
  return paras.slice(0, 2).join("\n\n");
}

function tasteRules(manifest, briefText) {
  const vibe = String(manifest.vibe || "").toLowerCase();
  const rules = [
    "Do use semantic tokens (or DESIGN.md token references) for color, type, space, and radius — never a hardcoded hex or pixel in a component.",
    "Don't introduce a second accent color. The primary accent is reserved for the single most important action on a screen.",
    "Do keep one primary action per view. Equal-weight CTAs are a Hick's Law failure.",
    "Don't ship a screen without empty, loading, and error treatments when the view can be in those states.",
    "Do keep same-function controls visually identical across screens.",
    "Don't guess layout coordinates. Target elements by accessibility-tree ref or testID.",
  ];
  if (/\bminimal\b/.test(vibe)) {
    rules.push("Do leave unused space unused. Extra chrome to 'fill the canvas' is a Don't.");
  }
  if (/\bbold\b/.test(vibe)) {
    rules.push("Do let the accent carry the visual weight. Don't dilute it across decorative fills.");
  }
  if (briefText) {
    for (const line of briefText.split("\n")) {
      const m = line.match(/^\s*[-*]\s+(Do|Don't)\s+.+/i);
      if (m) rules.push(m[0].replace(/^\s*[-*]\s+/, "").trim());
    }
  }
  // de-dupe while preserving order
  const seen = new Set();
  const out = [];
  for (const r of rules) {
    const k = r.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

export function renderDesignMarkdown(frontMatter, { manifest = {}, rationale = "" } = {}) {
  const goal = manifest.goal ? String(manifest.goal).trim() : "";
  const vibe = manifest.vibe ? String(manifest.vibe).trim() : "";
  const yaml = emitYamlMap(frontMatter).trimEnd();
  const colorLines = Object.entries(frontMatter.colors)
    .map(([k, v]) => `- **${k} (${v}):** token \`${k}\`.`)
    .join("\n");
  const rules = tasteRules(manifest, rationale);
  const overviewBits = [];
  if (goal) overviewBits.push(goal.endsWith(".") ? goal : `${goal}.`);
  if (vibe) overviewBits.push(`Visual direction: ${vibe}.`);
  if (rationale) overviewBits.push(rationale);
  if (overviewBits.length === 0) {
    overviewBits.push(
      "This DESIGN.md is generated from the project's design tokens. Tokens are the source of truth; prose explains how to apply them.",
    );
  }

  return `---
${yaml}
---

## Overview

${overviewBits.join("\n\n")}

## Colors

The palette is token-governed. Agents must use these values (or the semantic tokens they came from), not invent near-matches.

${colorLines}

## Typography

Type roles map to the project's type tokens. Headings use \`h1\`; body copy uses \`body-md\`; control labels use \`label-sm\`. Do not introduce a third family.

## Layout

Spacing follows the semantic scale in the front matter. Same-level siblings share the same gap. Density changes belong in the token file, not as one-off padding on a single screen.

## Components

Primary actions use \`button-primary\`. Page chrome uses \`surface-page\`. Variants (hover, pressed) inherit the same tokens rather than a parallel palette.

## Do's and Don'ts

${rules.map((r) => `- ${r}`).join("\n")}
`;
}

export function loadManifest(projectRoot) {
  const p = join(projectRoot, "design/manifest.json");
  if (!existsSync(p)) throw new Error(`design/manifest.json not found in ${projectRoot}`);
  return JSON.parse(readFileSync(p, "utf8"));
}

function loadInitBrief(projectRoot) {
  const p = join(projectRoot, "design/init-brief.md");
  if (!existsSync(p)) return "";
  try {
    return readFileSync(p, "utf8");
  } catch {
    return "";
  }
}

export function generateDesignMd(projectRoot) {
  const manifest = loadManifest(projectRoot);
  const { files, sources } = collectTokenSources(projectRoot);
  if (sources.length === 0) {
    return {
      mode: "generate",
      exit: 3,
      vacuous: true,
      message: "No design tokens found — nothing to generate",
      tokenFiles: files,
    };
  }
  const frontMatter = mapTokensToFrontMatter(sources, manifest);
  const rationale = extractThemeRationale(loadInitBrief(projectRoot));
  const markdown = renderDesignMarkdown(frontMatter, { manifest, rationale });
  const dest = join(projectRoot, DESIGN_REL);
  let previous = null;
  if (existsSync(dest)) {
    const prevPath = join(projectRoot, PREVIOUS_REL);
    ensureDir(dirname(prevPath));
    copyFileSync(dest, prevPath);
    previous = PREVIOUS_REL;
  }
  writeFileSync(dest, markdown, "utf8");
  return {
    mode: "generate",
    exit: 0,
    vacuous: false,
    message: `Wrote ${DESIGN_REL}`,
    written: DESIGN_REL,
    previous,
    tokenFiles: files.map((f) => f.slice(projectRoot.length + 1)),
    tokens: {
      colors: Object.keys(frontMatter.colors).length,
      typography: Object.keys(frontMatter.typography).length,
      spacing: Object.keys(frontMatter.spacing).length,
    },
  };
}

// ---------------------------------------------------------------------------
// CLI spawn — real pinned @google/design.md (designmd alias)
// ---------------------------------------------------------------------------

export function spawnDesignmd(args, cwd = process.cwd()) {
  return spawnSync("npx", ["-y", "-p", DESIGNMD_PIN, DESIGNMD_BIN, ...args], {
    cwd,
    encoding: "utf8",
    timeout: 180_000,
    env: process.env,
  });
}

function parseGoogleJson(stdout, stderr) {
  const text = String(stdout || "").trim();
  if (!text) throw new Error(`designmd produced no JSON\n${stderr || ""}`.trim());
  // npx may prefix noise; take the outermost JSON object.
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`designmd output was not JSON\n${text.slice(0, 400)}`);
  }
  return JSON.parse(text.slice(start, end + 1));
}

export function lintDesignMd(filePath) {
  if (!existsSync(filePath)) {
    return {
      mode: "lint",
      exit: 3,
      vacuous: true,
      message: `No DESIGN.md at ${filePath}`,
      file: filePath,
    };
  }
  const spawned = spawnDesignmd(["lint", filePath], dirname(filePath));
  if (spawned.error) {
    return {
      mode: "lint",
      exit: 2,
      vacuous: false,
      message: `Failed to spawn ${DESIGNMD_PIN}: ${spawned.error.message}`,
    };
  }
  if (spawned.status === 2 || (spawned.status !== 0 && spawned.status !== 1)) {
    // designmd lint: 0 ok, 1 errors. Anything else is config/runtime.
    if (spawned.status !== 1) {
      return {
        mode: "lint",
        exit: 2,
        vacuous: false,
        message: `designmd lint failed (status ${spawned.status}): ${(spawned.stderr || spawned.stdout || "").trim()}`,
        googleStatus: spawned.status,
      };
    }
  }
  let google;
  try {
    google = parseGoogleJson(spawned.stdout, spawned.stderr);
  } catch (e) {
    return { mode: "lint", exit: 2, vacuous: false, message: e.message };
  }
  const errors = google?.summary?.errors ?? (spawned.status === 1 ? 1 : 0);
  return {
    mode: "lint",
    exit: errors > 0 || spawned.status === 1 ? 1 : 0,
    vacuous: false,
    message: errors > 0 ? `DESIGN.md lint: ${errors} error(s)` : "DESIGN.md lint-clean",
    file: filePath,
    google,
  };
}

function tokenChangeCount(google) {
  const tokens = google?.tokens;
  if (!tokens || typeof tokens !== "object") return 0;
  let n = 0;
  for (const group of Object.values(tokens)) {
    if (!group || typeof group !== "object") continue;
    n += (group.added?.length || 0) + (group.removed?.length || 0) + (group.modified?.length || 0);
  }
  return n;
}

export function diffDesignMd(beforePath, afterPath, { receiptPath = null } = {}) {
  if (!existsSync(beforePath) || !existsSync(afterPath)) {
    return {
      mode: "diff",
      exit: 3,
      vacuous: true,
      message: "Nothing to diff — missing before and/or after DESIGN.md",
      before: beforePath,
      after: afterPath,
    };
  }
  const spawned = spawnDesignmd(["diff", beforePath, afterPath], dirname(afterPath));
  if (spawned.error) {
    return {
      mode: "diff",
      exit: 2,
      vacuous: false,
      message: `Failed to spawn ${DESIGNMD_PIN}: ${spawned.error.message}`,
    };
  }
  if (spawned.status !== 0 && spawned.status !== 1) {
    return {
      mode: "diff",
      exit: 2,
      vacuous: false,
      message: `designmd diff failed (status ${spawned.status}): ${(spawned.stderr || spawned.stdout || "").trim()}`,
      googleStatus: spawned.status,
    };
  }
  let google;
  try {
    google = parseGoogleJson(spawned.stdout, spawned.stderr);
  } catch (e) {
    return { mode: "diff", exit: 2, vacuous: false, message: e.message };
  }
  const changes = tokenChangeCount(google);
  const googleRegression = google?.regression === true || spawned.status === 1;
  const regression = googleRegression || changes > 0;
  const report = {
    mode: "diff",
    exit: regression ? 1 : 0,
    vacuous: false,
    message: regression
      ? `DESIGN.md drift (regression=${google?.regression === true}, tokenChanges=${changes})`
      : "DESIGN.md unchanged",
    before: beforePath,
    after: afterPath,
    regression,
    googleRegression: google?.regression === true,
    tokenChanges: changes,
    google,
  };
  if (receiptPath) {
    ensureDir(dirname(receiptPath));
    writeFileSync(receiptPath, JSON.stringify(report, null, 2) + "\n", "utf8");
    report.receipt = receiptPath;
  }
  return report;
}

export function diffProject(projectRoot) {
  const before = join(projectRoot, PREVIOUS_REL);
  const after = join(projectRoot, DESIGN_REL);
  return diffDesignMd(before, after, { receiptPath: join(projectRoot, RECEIPT_REL) });
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function usage() {
  process.stderr.write(
    "Usage: design-md.mjs <mode> <project-root>\n" +
      "  Modes: --generate | --lint | --diff\n" +
      "  --diff also accepts --before <file> --after <file>\n" +
      "  Exit: 0 pass · 1 drift · 2 config/usage · 3 vacuous\n",
  );
}

export function parseArgs(argv) {
  const positional = [];
  let mode = null;
  let before = null;
  let after = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-h" || a === "--help") return { help: true };
    if (a === "--generate" || a === "--lint" || a === "--diff") {
      if (mode) throw new Error("Only one mode is allowed");
      mode = a.slice(2);
      continue;
    }
    if (a === "--before") {
      before = argv[++i];
      if (!before || before.startsWith("--")) throw new Error("--before requires a file");
      continue;
    }
    if (a === "--after") {
      after = argv[++i];
      if (!after || after.startsWith("--")) throw new Error("--after requires a file");
      continue;
    }
    if (a.startsWith("--")) throw new Error(`Unknown option: ${a}`);
    positional.push(a);
  }
  return { help: false, mode, before, after, positional };
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
  if (!parsed.mode) {
    usage();
    return 2;
  }

  let report;
  try {
    if (parsed.mode === "diff" && parsed.before && parsed.after) {
      report = diffDesignMd(resolve(parsed.before), resolve(parsed.after));
    } else {
      if (parsed.positional.length < 1) {
        usage();
        return 2;
      }
      const projectRoot = resolve(parsed.positional[0]);
      if (!existsSync(projectRoot) || !statSync(projectRoot).isDirectory()) {
        process.stderr.write(`CONFIG ERROR: project root not found: ${projectRoot}\n`);
        return 2;
      }
      if (parsed.mode === "generate") report = generateDesignMd(projectRoot);
      else if (parsed.mode === "lint") report = lintDesignMd(join(projectRoot, DESIGN_REL));
      else if (parsed.mode === "diff") report = diffProject(projectRoot);
      else throw new Error(`Unknown mode: ${parsed.mode}`);
    }
  } catch (e) {
    process.stderr.write(`CONFIG ERROR: ${e.message}\n`);
    return 2;
  }

  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  const icon = report.exit === 0 ? "✓" : report.exit === 3 ? "∅" : "✗";
  process.stderr.write(`${icon} design-md ${report.mode}: ${report.message}\n`);
  return report.exit;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) process.exit(main(process.argv.slice(2)));
