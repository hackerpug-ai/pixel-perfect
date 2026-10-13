// Shared helpers for the catalog-gate integration tests. Every project is a real temp directory
// cloned from a committed fixture (or written from scratch for one rule). Nothing here stands in
// for a capture: the pixel fixture renders through real headless Chrome.

import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { main } from "../../plugins/pixel-perfect/scripts/verify-catalog.mjs";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const SCRIPTS = path.join(ROOT, "plugins/pixel-perfect/scripts");
export const VERIFY = path.join(SCRIPTS, "verify-catalog.mjs");
export const PIXEL_FIXTURE = path.join(ROOT, "test/fixtures/pixel-web");
export const CONSUMER_FIXTURE = path.join(ROOT, "test/fixtures/consumer-web");
export const CATALOG_FIXTURE = path.join(ROOT, "test/fixtures/catalog-project");

// The pixel-web capture command renders through chrome.mjs; it finds the plugin's scripts here.
process.env.PIXEL_PERFECT_SCRIPTS ??= SCRIPTS;

export function cloneFixture(source, prefix = "pp-catalog-") {
  const dir = mkdtempSync(path.join(tmpdir(), prefix));
  cpSync(source, dir, { recursive: true });
  return dir;
}

export function scratchProject(prefix = "pp-scratch-") {
  return mkdtempSync(path.join(tmpdir(), prefix));
}

export function removeDirs(...dirs) {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
}

// In-process CLI run through main(), so exit codes match the binary path. Output is captured.
export function runCli(args) {
  const prevOut = process.stdout.write;
  const prevErr = process.stderr.write;
  let stdout = "";
  let stderr = "";
  process.stdout.write = (chunk) => {
    stdout += chunk;
    return true;
  };
  process.stderr.write = (chunk) => {
    stderr += chunk;
    return true;
  };
  let code;
  try {
    code = main(args);
  } finally {
    process.stdout.write = prevOut;
    process.stderr.write = prevErr;
  }
  return { code, stdout, stderr, report: parseReport(stdout) };
}

function parseReport(stdout) {
  try {
    return JSON.parse(stdout);
  } catch {
    return null;
  }
}

export function writeIn(dir, rel, content) {
  const full = path.join(dir, rel);
  mkdirSync(path.dirname(full), { recursive: true });
  writeFileSync(full, content, "utf8");
  return full;
}

export function readIn(dir, rel) {
  return readFileSync(path.join(dir, rel), "utf8");
}

export function manifestPath(dir) {
  return path.join(dir, "design/manifest.json");
}

export function editManifest(dir, edit) {
  const file = manifestPath(dir);
  const manifest = JSON.parse(readFileSync(file, "utf8"));
  edit(manifest);
  writeFileSync(file, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  return manifest;
}

// Run fn with the given environment overrides applied, then restore the previous values.
export function withEnv(overrides, fn) {
  const saved = {};
  for (const [key, value] of Object.entries(overrides)) {
    saved[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    return fn();
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

// A catalog-walk project (no capture command): structural text stories only. Used where the
// rule under test is the PNG sibling, which the walk copies from the catalog when present.
export function writeCatalogProject(dir, stories, capture = {}) {
  writeIn(
    dir,
    "design/manifest.json",
    JSON.stringify(
      {
        goal: "catalog-walk project",
        platforms: {
          "web-desktop": {
            capture: {
              medium: "text",
              goldens: "design/goldens/web-desktop",
              catalog: "sandbox/catalog",
              staging: "design/.captures/web-desktop",
              viewport: "390x300",
              ...capture,
            },
            atoms: Object.keys(stories)
              .filter((rel) => rel.startsWith("atoms/"))
              .map((rel) => ({ name: rel.split("/")[1], status: "verified" })),
          },
        },
      },
      null,
      2,
    ),
  );
  for (const [rel, body] of Object.entries(stories)) writeIn(dir, `sandbox/catalog/${rel}`, body);
  return dir;
}

// A project whose capture command is a probe that ignores its sources: it writes fixed
// structural text and records the env variables verify-catalog passed it. Pixels are declared
// none with a reason, because the probe renders no image.
export const PROBE_SCRIPT = `import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
const out = process.env.PIXEL_PERFECT_CAPTURE_OUT;
const stories = {
  "atoms/Env/default.txt": "Env\\nlayer=" + (process.env.PIXEL_PERFECT_CAPTURE_LAYER ?? "") + "\\nonly=" + (process.env.PIXEL_PERFECT_CAPTURE_ONLY ?? "") + "\\n",
  "atoms/Other/default.txt": "Other\\nfixed=1\\n",
  "atoms/Lone/default.txt": "Lone\\nfixed=1\\n",
  "molecules/Card/default.txt": "Card\\nfixed=1\\n",
};
for (const [rel, body] of Object.entries(stories)) {
  mkdirSync(dirname(join(out, rel)), { recursive: true });
  writeFileSync(join(out, rel), body, "utf8");
}
`;

export function writeProbeProject(dir, sources = {}) {
  writeIn(dir, "sandbox/probe.mjs", PROBE_SCRIPT);
  writeIn(
    dir,
    "design/manifest.json",
    JSON.stringify(
      {
        goal: "compiled-stack probe: output does not read story sources",
        platforms: {
          "web-desktop": {
            capture: {
              command: "node sandbox/probe.mjs",
              medium: "text",
              goldens: "design/goldens/web-desktop",
              catalog: "sandbox/stories",
              staging: "design/.captures/web-desktop",
              pixels: "none",
              pixels_reason: "probe command writes structural text only; no image is rendered",
            },
            atoms: [
              { name: "Env", status: "verified" },
              { name: "Other", status: "verified" },
              { name: "Lone", status: "verified" },
            ],
            molecules: [{ name: "Card", status: "verified" }],
          },
        },
      },
      null,
      2,
    ),
  );
  for (const [rel, body] of Object.entries(sources)) writeIn(dir, `sandbox/stories/${rel}`, body);
  return dir;
}

// A project whose capture command is the given script (a file under sandbox/). `capture` overrides
// the default text-only capture block; an undefined value removes the key.
export function writeCommandProject(dir, script, capture = {}, items = {}) {
  writeIn(dir, "sandbox/cmd.mjs", script);
  const block = {
    command: "node sandbox/cmd.mjs",
    medium: "text",
    goldens: "design/goldens/web-desktop",
    catalog: "sandbox/stories",
    staging: "design/.captures/web-desktop",
    pixels: "none",
    pixels_reason: "command test project: text output only",
    ...capture,
  };
  for (const key of Object.keys(block)) if (block[key] === undefined) delete block[key];
  writeIn(dir, "design/manifest.json", JSON.stringify({ platforms: { "web-desktop": { capture: block, ...items } } }, null, 2));
  return dir;
}

// Writes `files` (rel → body) into the staging folder the command receives, at the current directory.
export const STAGE_SCRIPT_HEAD = `import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
const out = process.env.PIXEL_PERFECT_CAPTURE_OUT;
const put = (rel, body) => { mkdirSync(dirname(join(out, rel)), { recursive: true }); writeFileSync(join(out, rel), body); };
`;
