#!/usr/bin/env node
/**
 * Real render capture for the pixel-web fixture.
 *
 * Renders every sandbox story (sandbox/stories/{layer}/{name}/{state}.html) in headless
 * Chrome at the platform's declared viewport, and writes per story:
 *   {out}/{layer}/{name}/{state}.dom  — serialized DOM of the story root (structural gate)
 *   {out}/{layer}/{name}/{state}.png  — screenshot (required evidence for fidelity review)
 *
 * Composition: `<!-- @compose Name -->` is replaced by Name's default story body (recursive,
 * cycle-checked). A missing dependency fails the capture; it never renders a silent gap.
 *
 * Environment:
 *   PIXEL_PERFECT_CAPTURE_OUT     staging directory (set by verify-catalog)
 *   PIXEL_PERFECT_CAPTURE_LAYER   restrict to one layer (honored here; verify-catalog also filters)
 *   PIXEL_PERFECT_CAPTURE_ONLY    restrict to one <layer>/<Name> (honored here; verify-catalog also filters)
 *   PIXEL_PERFECT_SCRIPTS         the plugin's scripts/ directory, which holds chrome.mjs
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, sep } from "node:path";
import { pathToFileURL } from "node:url";

function fail(message, code = 1) {
  process.stderr.write(`capture: ${message}\n`);
  process.exit(code);
}

const scriptsDir = process.env.PIXEL_PERFECT_SCRIPTS;
if (!scriptsDir || !existsSync(join(scriptsDir, "chrome.mjs"))) {
  fail("PIXEL_PERFECT_SCRIPTS must name the plugin scripts/ directory (it holds chrome.mjs)", 2);
}
const { launchChrome } = await import(pathToFileURL(join(scriptsDir, "chrome.mjs")).href);

const root = process.cwd();
const outDir = process.env.PIXEL_PERFECT_CAPTURE_OUT || join(root, "design/.captures/web-desktop");
const layerFilter = process.env.PIXEL_PERFECT_CAPTURE_LAYER || null;
const onlyFilter = process.env.PIXEL_PERFECT_CAPTURE_ONLY || null;
const storiesRoot = join(root, "sandbox/stories");

const manifest = JSON.parse(readFileSync(join(root, "design/manifest.json"), "utf8"));
const platformId = manifest.platforms[basename(outDir)] ? basename(outDir) : Object.keys(manifest.platforms)[0];
const viewport = manifest.platforms[platformId].capture.viewport;
const [W, H] = String(viewport).split("x").map(Number);

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

// Every story, unfiltered: composition needs dependencies even when only one story is rendered.
function allStoryFiles() {
  return walk(storiesRoot)
    .map((full) => {
      const rel = relative(storiesRoot, full).split(sep).join("/");
      const parts = rel.split("/");
      return { full, rel, layer: parts[0], name: parts[1], file: parts[2] };
    })
    .filter((s) => s.file && s.file.endsWith(".html") && s.file.indexOf(".") > 0)
    .map((s) => ({ ...s, state: s.file.slice(0, s.file.lastIndexOf(".")) }));
}

// The stories this run renders, honoring the layer and single-story filters.
function storyFiles() {
  return allStoryFiles()
    .filter((s) => !layerFilter || s.layer === layerFilter)
    .filter((s) => !onlyFilter || `${s.layer}/${s.name}` === onlyFilter);
}

function readDefault(name) {
  const hit = allStoryFiles().find((s) => s.name === name && s.state === "default");
  return hit ? readFileSync(hit.full, "utf8") : null;
}

function resolveCompositions(html, stack) {
  return html.replace(/<!--\s*@compose\s+([A-Za-z][A-Za-z0-9]*)\s*-->/g, (_, dep) => {
    if (stack.includes(dep)) throw new Error(`composition cycle: ${[...stack, dep].join(" -> ")}`);
    const body = readDefault(dep);
    if (body == null) throw new Error(`composed story not found: ${dep}`);
    return resolveCompositions(body, [...stack, dep]).trim();
  });
}

function documentFor(body) {
  return (
    '<!doctype html><html><head><meta charset="utf-8"><style>' +
    "html,body{margin:0;padding:0;background:#fff}" +
    "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}" +
    '</style></head><body><div id="story">' +
    body +
    "</div></body></html>"
  );
}

const stories = storyFiles();
if (stories.length === 0) fail("zero stories under sandbox/stories", 1);

mkdirSync(outDir, { recursive: true });
const { cdp, proc, userData, ws } = await launchChrome({ windowSize: [W, H] });
const evaluate = async (expression) => {
  const res = await cdp.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (res.exceptionDetails) throw new Error(`render script failed: ${res.exceptionDetails.text}`);
  return res.result.value;
};
try {
  const { frameTree } = await cdp.send("Page.getFrameTree");
  const frameId = frameTree.frame.id;
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  for (const story of stories) {
    const body = resolveCompositions(readFileSync(story.full, "utf8"), [story.name]);
    await cdp.send("Page.setDocumentContent", { frameId, html: documentFor(body) });
    await evaluate(
      "document.fonts.ready.then(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))",
    );
    const dom = await evaluate('document.getElementById("story").innerHTML');
    const scrollWidth = await evaluate("document.documentElement.scrollWidth");
    const shot = await cdp.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
      clip: { x: 0, y: 0, width: Math.max(W, scrollWidth), height: H, scale: 1 },
    });
    const base = join(outDir, story.layer, story.name, story.state);
    mkdirSync(dirname(base), { recursive: true });
    writeFileSync(`${base}.dom`, dom.endsWith("\n") ? dom : `${dom}\n`, "utf8");
    writeFileSync(`${base}.png`, Buffer.from(shot.data, "base64"));
  }
} finally {
  ws.close();
  proc.kill("SIGKILL");
  rmSync(userData, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
process.stderr.write(`capture: ${stories.length} stor${stories.length === 1 ? "y" : "ies"} → ${outDir}\n`);
