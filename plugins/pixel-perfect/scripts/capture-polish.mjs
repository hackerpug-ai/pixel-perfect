#!/usr/bin/env node
// capture-polish.mjs — capture every manifest screen×state of a REAL running
// fixture/app: PNG + AX/DOM snapshot + console. Failed renders become RENDER
// BLOCKER findings and are never placed in the judged-shot set.
//
// Exit: 0 captured · 1 capture defects (optional) · 2 config/launcher · 3 vacuous

import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
  mkdtempSync,
} from "node:fs";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { extname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { findingFingerprint, validateFinding } from "./findings.mjs";
import { findChrome, sleep, Cdp, launchChrome, startStaticServer } from "./chrome.mjs";

export { findChrome };

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

const COLLECT_AX = `(() => {
  const nodes = [];
  const interesting = new Set(["A", "BUTTON", "INPUT", "SELECT", "TEXTAREA", "H1", "H2", "H3", "NAV", "MAIN", "FORM", "ARTICLE", "SECTION"]);
  const walk = (el, path) => {
    if (!el || el.nodeType !== 1) return;
    const testID = el.getAttribute("data-testid") || el.getAttribute("data-test-id");
    const id = el.id || "";
    const role = el.getAttribute("role");
    const label = el.getAttribute("aria-label");
    const tag = el.tagName;
    if (testID || id || role || label || interesting.has(tag)) {
      nodes.push({
        ax_ref: testID || id || path,
        testID: testID || null,
        tag: tag.toLowerCase(),
        role: role || null,
        name: label || (el.innerText || "").trim().slice(0, 80) || null,
      });
    }
    const children = el.children || [];
    for (let i = 0; i < children.length; i++) {
      walk(children[i], path + "/" + tag.toLowerCase() + "[" + i + "]");
    }
  };
  walk(document.body, "body");
  const root = document.querySelector("[data-screen]");
  return {
    title: document.title,
    ready: Boolean(root),
    screen: root ? root.getAttribute("data-screen") : null,
    state: root ? root.getAttribute("data-state") : null,
    bodyText: (document.body && document.body.innerText || "").trim(),
    html: document.documentElement.outerHTML,
    nodes,
  };
})()`;

function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
}

function loadJson(file, fallback = null) {
  if (!existsSync(file)) return fallback;
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

export function loadManifest(projectRoot) {
  const p = join(projectRoot, "design/manifest.json");
  if (!existsSync(p)) throw new Error(`design/manifest.json not found in ${projectRoot}`);
  return JSON.parse(readFileSync(p, "utf8"));
}

export function resolvePlatform(manifest, platformId) {
  const platforms = manifest.platforms || {};
  const ids = Object.keys(platforms);
  if (platformId) {
    if (!platforms[platformId]) throw new Error(`Unknown platform: ${platformId}`);
    return { id: platformId, config: platforms[platformId] };
  }
  if (ids.length === 1) return { id: ids[0], config: platforms[ids[0]] };
  throw new Error("--platform is required when multiple platforms exist");
}

export function buildCaptureMatrix(manifest, platformConfig, seed = null) {
  const screens = platformConfig.screens || [];
  const matrix = [];
  for (const screen of screens) {
    const states = screen.states && screen.states.length ? screen.states : ["default"];
    for (const state of states) {
      matrix.push({
        screen: screen.name,
        state,
        route: screen.route || "/",
        variant: null,
        slug: `${slug(screen.name)}.${slug(state)}`,
      });
    }
  }
  const adversarial = seed?.adversarial || {};
  for (const [variant, spec] of Object.entries(adversarial)) {
    if (!spec || !spec.screen) continue;
    const screen = screens.find((s) => s.name === spec.screen);
    if (!screen) continue;
    const state = spec.state || "default";
    matrix.push({
      screen: screen.name,
      state,
      route: screen.route || "/",
      variant,
      slug: `${slug(screen.name)}.${slug(state)}.${slug(variant)}`,
    });
  }
  return matrix;
}

function slug(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "item";
}

function pageUrl(port, entry) {
  const url = new URL(entry.route || "/", `http://127.0.0.1:${port}`);
  url.searchParams.set("state", entry.state);
  if (entry.variant) url.searchParams.set("variant", entry.variant);
  return url.toString();
}

function renderBlocker(entry, observed, runRel) {
  const axRef = "document";
  const finding = {
    screen: slug(entry.screen),
    state: entry.variant ? `${entry.state}.${entry.variant}` : entry.state,
    platform: "web",
    lens: "capture@1.0",
    principle: "RENDER",
    tier: "T1",
    severity: "BLOCKER",
    observed,
    proposal: "Fix the route so the screen paints before any polish lens runs.",
    element: { ax_ref: axRef, bbox: null },
    evidence: { shot: null },
    fingerprint: findingFingerprint(slug(entry.screen), "RENDER", axRef),
  };
  const checked = validateFinding(finding);
  if (!checked.ok) throw new Error(`RENDER finding failed schema: ${checked.errors.join("; ")}`);
  finding._run = runRel;
  return finding;
}

export async function captureProject(projectRoot, { platform = null, runId = null } = {}) {
  const manifest = loadManifest(projectRoot);
  const { id: platformId, config } = resolvePlatform(manifest, platform);
  const seed = loadJson(join(projectRoot, "design/polish/seed.json"), {});
  const matrix = buildCaptureMatrix(manifest, config, seed);
  if (matrix.length === 0) {
    return {
      mode: "capture",
      exit: 3,
      vacuous: true,
      message: "No screens in the manifest — vacuous capture",
      matrix: [],
    };
  }

  const appRoot = join(projectRoot, config.polish?.root || "app");
  if (!existsSync(join(appRoot, "index.html"))) {
    return {
      mode: "capture",
      exit: 2,
      vacuous: false,
      message: `No runnable app at ${appRoot}/index.html`,
    };
  }

  const ts = runId || new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const runRel = `design/polish/runs/${ts}`;
  const runDir = join(projectRoot, runRel);
  const shotsDir = join(runDir, "shots");
  const axDir = join(runDir, "ax");
  const consoleDir = join(runDir, "console");
  ensureDir(shotsDir);
  ensureDir(axDir);
  ensureDir(consoleDir);

  const { server, port } = await startStaticServer(appRoot);
  let session;
  try {
    session = await launchChrome();
  } catch (error) {
    server.close();
    if (error.code === "CHROME_UNAVAILABLE") {
      return {
        mode: "capture",
        exit: 2,
        vacuous: false,
        launcherUnavailable: true,
        message: "No Chrome/Chromium binary — cannot capture real shots",
      };
    }
    return {
      mode: "capture",
      exit: 2,
      vacuous: false,
      launcherUnavailable: true,
      message: `Browser launcher failed: ${error.message}`,
    };
  }

  const judged = [];
  const findings = [];
  const captured = [];

  try {
    for (const entry of matrix) {
      const url = pageUrl(port, entry);
      session.cdp.console = [];
      let navFailed = false;
      let navError = "";
      try {
        const loaded = session.cdp.waitFor("Page.loadEventFired", 12_000);
        await session.cdp.send("Page.navigate", { url });
        await loaded;
        await sleep(150);
      } catch (error) {
        navFailed = true;
        navError = error.message;
      }

      let snapshot = { ready: false, bodyText: "", html: "", nodes: [], title: "" };
      try {
        const evaluated = await session.cdp.send("Runtime.evaluate", {
          expression: COLLECT_AX,
          returnByValue: true,
          awaitPromise: true,
        });
        snapshot = evaluated?.result?.value || snapshot;
      } catch {
        navFailed = true;
        navError = navError || "Runtime.evaluate failed";
      }

      const failed = navFailed || !snapshot.ready || !String(snapshot.bodyText || "").trim();

      const consoleLog = session.cdp.console.slice();
      writeFileSync(join(consoleDir, `${entry.slug}.json`), JSON.stringify(consoleLog, null, 2) + "\n", "utf8");
      writeFileSync(
        join(axDir, `${entry.slug}.json`),
        JSON.stringify(
          {
            url,
            title: snapshot.title,
            ready: snapshot.ready,
            screen: snapshot.screen,
            state: snapshot.state,
            nodes: snapshot.nodes || [],
            html: snapshot.html || "",
          },
          null,
          2,
        ) + "\n",
        "utf8",
      );

      if (failed) {
        const observed = navFailed
          ? `Navigate failed: ${navError}`
          : `Page did not render a [data-screen] root (title=${snapshot.title || "empty"}, body empty=${!String(snapshot.bodyText || "").trim()}).`;
        findings.push(renderBlocker(entry, observed, runRel));
        captured.push({ ...entry, url, render: "blocker" });
        continue;
      }

      const shotName = `${entry.slug}.png`;
      const { data } = await session.cdp.send("Page.captureScreenshot", { format: "png" });
      const buf = Buffer.from(data, "base64");
      if (buf.length < 32 || !buf.subarray(0, 4).equals(PNG_MAGIC)) {
        findings.push(renderBlocker(entry, "Screenshot was not a PNG", runRel));
        captured.push({ ...entry, url, render: "blocker" });
        continue;
      }
      writeFileSync(join(shotsDir, shotName), buf);
      judged.push(`${runRel}/shots/${shotName}`);
      captured.push({ ...entry, url, render: "ok", shot: `${runRel}/shots/${shotName}` });
    }
  } finally {
    try {
      session.ws.close();
    } catch {
      /* ignore */
    }
    session.proc.kill("SIGKILL");
    rmSync(session.userData, { recursive: true, force: true });
    await new Promise((r) => server.close(r));
  }

  const report = {
    mode: "capture",
    exit: 0,
    vacuous: false,
    message: `Captured ${captured.length} screen×state(s); ${findings.length} RENDER blocker(s)`,
    platform: platformId,
    run: runRel,
    matrix: captured,
    judged,
    findings,
  };
  writeFileSync(join(runDir, "report.json"), JSON.stringify(report, null, 2) + "\n", "utf8");
  return report;
}

function usage() {
  process.stderr.write(
    "Usage: capture-polish.mjs <project-root> [--platform <id>] [--run-id <ts>]\n" +
      "  Exit: 0 captured · 2 config/launcher · 3 vacuous\n",
  );
}

export function parseArgs(argv) {
  const positional = [];
  let platform = null;
  let runId = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-h" || a === "--help") return { help: true };
    if (a === "--platform") {
      platform = argv[++i];
      continue;
    }
    if (a === "--run-id") {
      runId = argv[++i];
      continue;
    }
    if (a.startsWith("--")) throw new Error(`Unknown option: ${a}`);
    positional.push(a);
  }
  return { help: false, platform, runId, positional };
}

export async function main(argv) {
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
  if (parsed.positional.length < 1) {
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
    report = await captureProject(projectRoot, { platform: parsed.platform, runId: parsed.runId });
  } catch (e) {
    process.stderr.write(`CONFIG ERROR: ${e.message}\n`);
    return 2;
  }
  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  const icon = report.exit === 0 ? "✓" : report.exit === 3 ? "∅" : "✗";
  process.stderr.write(`${icon} capture-polish: ${report.message}\n`);
  return report.exit;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) {
  main(process.argv.slice(2)).then((code) => process.exit(code ?? 0));
}
