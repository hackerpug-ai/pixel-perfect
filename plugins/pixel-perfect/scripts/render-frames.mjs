#!/usr/bin/env node
// render-frames.mjs — deterministic frame rendering for design inventory
//
// Turns design references (HTML decks, images, URLs) into cropped PNG frames
// plus a frames.json index. Zero runtime dependencies; uses Node ≥ 20.
//
// Exit codes:
//   0 — all sources rendered
//   1 — at least one blank/failed (but all attempted)
//   2 — usage error, unreadable ref, no Chrome
//   3 — zero frames produced

import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { dirname, extname, join, resolve, basename } from "node:path";
import { pathToFileURL } from "node:url";
import { findChrome, sleep, launchChrome, startStaticServer } from "./chrome.mjs";

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

function usage() {
  console.error(`
render-frames.mjs — render design frames for inventory

Usage:
  node render-frames.mjs <ref>... --out <dir> [options]

Options:
  --out <dir>               output directory (required)
  --frame-selector <css>    CSS selector for frames, or auto (default): .fr, then
                            top-most bordered boxes >=300x200 (Claude Design canvases),
                            then the full page
  --settle <ms>             settle time after load (default: 15000)
  --width <px>              desktop viewport width (default: 1440)
  --mobile-width <px>       mobile viewport width (default: 390)
  --json                    output only frames.json to stdout
`);
}

function slug(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "item";
}

function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
}

function sha256(data) {
  return "sha256:" + createHash("sha256").update(data).digest("hex");
}

async function readRefAsBuffer(ref) {
  const ext = extname(ref).toLowerCase();
  if ([".html", ".htm"].includes(ext)) {
    return readFileSync(ref, "utf8");
  }
  if ([".png", ".jpg", ".jpeg", ".webp"].includes(ext)) {
    return readFileSync(ref);
  }
  throw new Error(`Unsupported ref type: ${ref}`);
}

function detectRefKind(ref) {
  if (ref.startsWith("http://") || ref.startsWith("https://")) {
    return "url";
  }
  const ext = extname(ref).toLowerCase();
  if ([".html", ".htm"].includes(ext)) {
    return "html-deck";
  }
  if ([".png", ".jpg", ".jpeg", ".webp"].includes(ext)) {
    return "image";
  }
  if (existsSync(ref) && statSync(ref).isDirectory()) {
    if (existsSync(join(ref, "wireframes.json"))) {
      return "wireframes";
    }
    const htmlFiles = require("fs")
      .readdirSync(ref)
      .filter((f) => [".html", ".htm"].includes(extname(f).toLowerCase()));
    if (htmlFiles.length > 0) {
      return "html-deck-dir";
    }
  }
  throw new Error(`Cannot detect ref kind for: ${ref}`);
}

async function renderHtmlDeck(cdp, url, selector, settleMs, widths) {
  // widths can be a number (legacy) or array [desktop, mobile]
  const widthArray = Array.isArray(widths) ? widths : [widths];
  const allFrames = [];

  // First detect if this deck has a [data-theme="dark"] CSS rule
  await cdp.send("Page.navigate", { url });
  await cdp.waitFor("Page.loadEventFired");

  const hasDarkTheme = await cdp.send("Runtime.evaluate", {
    expression: `(function() {
      let found = false;
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules || []) {
            if (rule.selectorText && rule.selectorText.includes('[data-theme="dark"') || rule.selectorText?.includes('[data-theme=dark')) {
              found = true;
              break;
            }
          }
          if (found) break;
        } catch (e) {}
      }
      return found;
    })()`,
    returnByValue: true,
  }).then(r => r.result?.value || false);

  const themes = hasDarkTheme ? ["default", "dark"] : ["default"];

  // Render at each width and theme combination
  let resolvedSelector = selector;
  for (const width of widthArray) {
    for (const theme of themes) {
      const frames = await renderHtmlDeckAtWidthAndTheme(cdp, url, selector, settleMs, width, theme);
      if (frames) {
        allFrames.push(...frames.frames);
        if (frames.resolvedSelector && resolvedSelector === selector) {
          resolvedSelector = frames.resolvedSelector;
        }
      }
    }
  }

  if (allFrames.length === 0) {
    return { blank: true, diagnosis: `No frames captured` };
  }

  return { blank: false, resolvedSelector, frames: allFrames };
}

async function renderHtmlDeckAtWidthAndTheme(cdp, url, selector, settleMs, width, theme) {
  // Set theme if dark
  if (theme === "dark") {
    await cdp.send("Runtime.evaluate", {
      expression: `(function() {
        const root = document.documentElement;
        root.setAttribute('data-theme', 'dark');
        // Also set on [data-pp-root] if it exists
        const ppRoot = document.querySelector('[data-pp-root]');
        if (ppRoot) ppRoot.setAttribute('data-theme', 'dark');
      })()`,
      returnByValue: true,
    });
    // Wait for paint
    await sleep(500);
  }

  await cdp.send("Page.navigate", { url });
  await cdp.waitFor("Page.loadEventFired");

  // Settle: poll innerText length and element count until stable
  let prevLength = -1;
  let prevCount = -1;
  let stableCount = 0;
  const startTime = Date.now();

  while (Date.now() - startTime < settleMs && stableCount < 2) {
    await sleep(250);
    const info = await cdp.send("Runtime.evaluate", {
      expression: `(function() {
        const innerLength = document.body.innerText.length;
        const sizedCount = Array.from(document.querySelectorAll('*')).filter(el => {
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        }).length;
        return { innerLength, sizedCount };
      })()`,
      returnByValue: true,
    });
    if (!info.result || !info.result.value) continue;
    const { innerLength, sizedCount } = info.result.value;
    if (innerLength === prevLength && sizedCount === prevCount) {
      stableCount++;
    } else {
      stableCount = 0;
    }
    prevLength = innerLength;
    prevCount = sizedCount;
  }

  // Check for blank render
  const bodyInfo = await cdp.send("Runtime.evaluate", {
    expression: `(function() {
      const innerText = (document.body.innerText || "").trim();
      const hasMedia = document.querySelector('img, canvas, svg[viewBox], svg:not([viewBox]) > *') !== null;
      return { textLen: innerText.length, hasMedia };
    })()`,
    returnByValue: true,
  });

  if (!bodyInfo.result || !bodyInfo.result.value) throw new Error("Runtime.evaluate returned no value for body check");
  const { textLen, hasMedia } = bodyInfo.result.value;
  if (textLen < 20 && !hasMedia) {
    return {
      blank: true,
      diagnosis: `BLANK RENDER: no content detected. Try raising --settle (currently ${settleMs}ms), opening in a real browser, or checking asset-id values in src attributes.`,
    };
  }

  // Set device metrics for full-page captures. App-frame decks scroll inside an
  // overflow:auto region, so documentElement.scrollHeight stops at one viewport;
  // include every scrollable region's extent or frames below its fold capture blank.
  const scrollHeightResp = await cdp.send("Runtime.evaluate", {
    expression: `Math.max(
      document.documentElement.scrollHeight,
      ...Array.from(document.querySelectorAll('*')).flatMap(el => {
        const s = getComputedStyle(el);
        if (s.overflowY !== 'auto' && s.overflowY !== 'scroll') return [];
        return [Math.round(el.getBoundingClientRect().top + el.scrollTop + el.scrollHeight)];
      })
    )`,
    returnByValue: true,
  });
  const scrollHeight = scrollHeightResp.result?.value || 0;

  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width,
    height: Math.round(scrollHeight),
    deviceScaleFactor: 1,
    mobile: width < 720,
    hasTouch: width < 720,
  });

  // Query frames. "auto" tries [data-screen-label], then .fr, then top-most bordered boxes
  const RECT_MAP = `els.map(el => {
        const rect = el.getBoundingClientRect();
        return {
          x: Math.round(rect.left),
          y: Math.round(rect.top),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          label: el.getAttribute('data-screen-label') || el.getAttribute('data-label') || el.getAttribute('aria-label') || el.getAttribute('title') || null,
          route: el.getAttribute('data-route') || null,
          state: el.getAttribute('data-state') || null,
          heading: (el.querySelector('h1, h2, h3')?.textContent || '').trim().slice(0, 80) || null,
        };
      })`;
  const bySelector = (sel) => `(function() { const els = Array.from(document.querySelectorAll(${JSON.stringify(sel)})); return ${RECT_MAP}; })()`;
  const SCREEN_LABELS = `(function() {
      const els = Array.from(document.querySelectorAll('[data-screen-label]'));
      return ${RECT_MAP};
    })()`;
  const BORDERED = `(function() {
      const cands = Array.from(document.querySelectorAll('div,section,article,figure')).filter(el => {
        const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
        return r.width >= 300 && r.height >= 200 && parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none';
      });
      const els = cands.filter(el => !cands.some(o => o !== el && o.contains(el)));
      return ${RECT_MAP};
    })()`;
  const query = async (expression) => (await cdp.send("Runtime.evaluate", { expression, returnByValue: true })).result?.value || [];

  let frames = [];
  let resolvedSelector = selector;
  if (selector === "auto") {
    frames = await query(bySelector("[data-screen-label]"));
    resolvedSelector = "auto:[data-screen-label]";
    if (frames.length === 0) {
      frames = await query(bySelector(".fr"));
      resolvedSelector = "auto:.fr";
    }
    if (frames.length === 0) {
      frames = await query(BORDERED);
      resolvedSelector = "auto:bordered";
    }
  } else {
    frames = await query(bySelector(selector));
  }

  // Capture frames at this width/theme
  const captured = [];

  // Capture selected frames if any
  for (const frame of frames) {
    if (frame.width > 0 && frame.height > 0) {
      const shot = await cdp.send("Page.captureScreenshot", {
        format: "png",
        clip: {
          x: frame.x,
          y: frame.y,
          width: frame.width,
          height: frame.height,
          scale: 1,
        },
        captureBeyondViewport: true,
      });
      captured.push({
        png: Buffer.from(shot.data, "base64"),
        label: frame.label || frame.heading,
        route: frame.route,
        state: frame.state,
        viewport: `${frame.width}x${frame.height}`,
        width: frame.width,
        height: frame.height,
      });
    }
  }

  // If no selected frames, capture only full page (fallback)
  // Otherwise, also add full-page frame for each width/theme combination
  if (frames.length === 0) {
    const fullPage = await cdp.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
    });
    captured.push({
      png: Buffer.from(fullPage.data, "base64"),
      label: null,
      route: null,
      state: null,
      viewport: `${width}x${Math.round(scrollHeight)}`,
      width,
      height: Math.round(scrollHeight),
    });
  } else {
    // Add full-page frame for coverage (dimensions by width/theme)
    const fullPage = await cdp.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
    });
    captured.push({
      png: Buffer.from(fullPage.data, "base64"),
      label: theme === "dark" ? `full · ${width} · dark` : `full · ${width}`,
      route: null,
      state: theme === "dark" ? "dark" : null,
      viewport: `${width}x${Math.round(scrollHeight)}`,
      width,
      height: Math.round(scrollHeight),
    });
  }

  return { blank: false, resolvedSelector, frames: captured };
}

async function renderUrl(cdp, url, widths) {
  const frames = [];
  const labels = ["desktop", "mobile"];

  for (let i = 0; i < widths.length; i++) {
    const width = widths[i];
    const height = 800;

    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: i === 1,
      hasTouch: i === 1,
    });

    await cdp.send("Page.navigate", { url });
    await cdp.waitFor("Page.loadEventFired");
    await sleep(500);

    const scrollHeightResp = await cdp.send("Runtime.evaluate", {
      expression: "document.documentElement.scrollHeight",
      returnByValue: true,
    });
    const scrollHeight = scrollHeightResp.result?.value || height;
    const fullHeight = Math.round(scrollHeight);
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width,
      height: fullHeight,
      deviceScaleFactor: 1,
      mobile: i === 1,
      hasTouch: i === 1,
    });

    const shot = await cdp.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
    });

    frames.push({
      png: Buffer.from(shot.data, "base64"),
      label: labels[i],
      route: null,
      state: null,
      viewport: `${width}x${fullHeight}`,
      width,
      height: fullHeight,
    });
  }

  return { blank: false, frames };
}

export async function main(args = process.argv.slice(2)) {
  const refs = [];
  let outDir = null;
  let selector = "auto";
  let settleMs = 15000;
  let width = 1440;
  let mobileWidth = 390;
  let jsonOnly = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--out" && i + 1 < args.length) {
      outDir = args[++i];
    } else if (args[i] === "--frame-selector" && i + 1 < args.length) {
      selector = args[++i];
    } else if (args[i] === "--settle" && i + 1 < args.length) {
      settleMs = parseInt(args[++i], 10);
    } else if (args[i] === "--width" && i + 1 < args.length) {
      width = parseInt(args[++i], 10);
    } else if (args[i] === "--mobile-width" && i + 1 < args.length) {
      mobileWidth = parseInt(args[++i], 10);
    } else if (args[i] === "--json") {
      jsonOnly = true;
    } else if (!args[i].startsWith("--")) {
      refs.push(args[i]);
    }
  }

  if (refs.length === 0 || !outDir) {
    usage();
    return 2;
  }

  const chrome = findChrome();
  if (!chrome) {
    console.error("No Chrome binary found (tried CHROME env var and common paths)");
    return 2;
  }

  ensureDir(outDir);

  // Load existing frames.json to preserve other sources
  let existing = { version: 1, rendered_at: "", chrome, sources: [], frames: [] };
  const framesPath = join(outDir, "frames.json");
  if (existsSync(framesPath)) {
    try {
      existing = JSON.parse(readFileSync(framesPath, "utf8"));
    } catch {}
  }

  const sources = [];
  const newFrames = [];
  const slugByRef = new Map(existing.sources.map((s) => [s.ref, s.slug]));
  const slugUsed = new Map();
  const sourceSlugsToRemove = new Set();
  let hasBlank = false;
  let hasError = false;
  let hasUnreadable = false;

  // Local HTML decks are served over HTTP from their own directory — never copied.
  // file:// navigation would load, but Chrome blocks fetch() between file:// URLs, so a
  // deck runtime that resolves sibling partials (Claude Design <dc-import>) renders them
  // as blank panels. One server per deck directory, closed at the end of the run.
  const deckServers = new Map();
  const serveDeck = async (ref) => {
    const dir = dirname(resolve(ref));
    if (!deckServers.has(dir)) deckServers.set(dir, await startStaticServer(dir));
    return `http://127.0.0.1:${deckServers.get(dir).port}/${encodeURIComponent(basename(ref))}`;
  };

  // Launch Chrome once
  let session;
  try {
    session = await launchChrome({ windowSize: [width, 800] });
  } catch (err) {
    console.error(`Chrome launch failed: ${err.message}`);
    return 2;
  }

  try {
    for (const ref of refs) {
      const kind = detectRefKind(ref);

      // Preserve slug if this ref was rendered before, otherwise generate new one
      let refSlug;
      if (slugByRef.has(ref)) {
        refSlug = slugByRef.get(ref);
      } else {
        refSlug = slug(basename(ref).replace(extname(ref), ""));
        // De-duplicate with other new slugs in this run
        let counter = 2;
        while (slugUsed.has(refSlug) || slugByRef.has(ref)) {
          refSlug = `${slug(basename(ref).replace(extname(ref), ""))}-${counter++}`;
        }
      }

      slugUsed.set(refSlug, true);
      slugByRef.set(ref, refSlug);

      sourceSlugsToRemove.add(refSlug);
      const framesForSource = [];

      const source = { ref, kind, hash: "", slug: refSlug, frame_selector: null, frames: [] };

      try {
        if (kind === "html-deck") {
          if (!existsSync(ref)) {
            console.error(`✗ ${refSlug} — unreadable: file not found`);
            hasUnreadable = true;
            continue;
          }

          const content = readFileSync(ref, "utf8");
          source.hash = sha256(content);

          let result;
          try {
            result = await renderHtmlDeck(session.cdp, await serveDeck(ref), selector, settleMs, [width, mobileWidth]);
          } catch (renderErr) {
            throw new Error(`renderHtmlDeck failed: ${renderErr.message}`);
          }

          if (result.blank) {
            source.frames = [];
            source.status = "blank";
            source.diagnosis = result.diagnosis;
            console.error(`✗ ${refSlug} — BLANK RENDER: ${result.diagnosis}`);
            existing.sources = existing.sources.filter((s) => s.slug !== refSlug);
            existing.sources.push(source);
            hasBlank = true;
            continue;
          }

          source.frame_selector = result.resolvedSelector;
          for (let i = 0; i < result.frames.length; i++) {
            const f = result.frames[i];
            const frameId = `${refSlug}/${String(i + 1).padStart(2, "0")}`;
            const framePath = join(outDir, refSlug, `${String(i + 1).padStart(2, "0")}.png`);
            ensureDir(dirname(framePath));
            writeFileSync(framePath, f.png);
            framesForSource.push(frameId);
            newFrames.push({
              id: frameId,
              png: `${refSlug}/${String(i + 1).padStart(2, "0")}.png`,
              source: ref,
              index: i + 1,
              label: f.label,
              viewport: f.viewport,
              width: f.width,
              height: f.height,
              route: f.route,
              state: f.state,
            });
          }

          if (result.warning) {
            console.error(`⚠ ${refSlug} — ${result.warning}`);
          }
          console.log(`✓ ${refSlug} — ${framesForSource.length} frames (${result.resolvedSelector})`);
        } else if (kind === "url") {
          const html = await (await fetch(ref)).text();
          source.hash = sha256(html);

          const result = await renderUrl(session.cdp, ref, [width, mobileWidth]);

          for (let i = 0; i < result.frames.length; i++) {
            const f = result.frames[i];
            const frameId = `${refSlug}/${String(i + 1).padStart(2, "0")}`;
            const framePath = join(outDir, refSlug, `${String(i + 1).padStart(2, "0")}.png`);
            ensureDir(dirname(framePath));
            writeFileSync(framePath, f.png);
            framesForSource.push(frameId);
            newFrames.push({
              id: frameId,
              png: `${refSlug}/${String(i + 1).padStart(2, "0")}.png`,
              source: ref,
              index: i + 1,
              label: f.label,
              viewport: f.viewport,
              width: f.width,
              height: f.height,
              route: f.route,
              state: f.state,
            });
          }
          console.log(`✓ ${refSlug} — ${framesForSource.length} frames (desktop, mobile)`);
        } else if (kind === "image") {
          if (!existsSync(ref)) {
            console.error(`✗ ${refSlug} — unreadable: file not found`);
            hasUnreadable = true;
            continue;
          }

          const content = readFileSync(ref);
          source.hash = sha256(content);

          const ext = extname(ref);
          const frameId = `${refSlug}/01`;
          const framePath = join(outDir, refSlug, `01${ext}`);
          ensureDir(dirname(framePath));
          writeFileSync(framePath, content);
          framesForSource.push(frameId);
          newFrames.push({
            id: frameId,
            png: `${refSlug}/01${ext}`,
            source: ref,
            index: 1,
            label: null,
            viewport: null,
            width: null,
            height: null,
            route: null,
            state: null,
          });
          console.log(`✓ ${refSlug} — 1 frame (image)`);
        } else if (kind === "wireframes") {
          console.log(`⚠ ${refSlug} — wireframes directory (no frames rendered)`);
          source.frames = [];
        }

        source.frames = framesForSource;
        source.status = kind === "wireframes" ? "text" : "rendered";

        // Update existing sources, removing old version if present
        existing.sources = existing.sources.filter((s) => s.slug !== refSlug);
        existing.sources.push(source);
      } catch (err) {
        console.error(`✗ ${refSlug} — ${err.message}`);
        source.frames = [];
        source.status = "failed";
        source.diagnosis = err.message;
        existing.sources = existing.sources.filter((s) => s.slug !== refSlug);
        existing.sources.push(source);
        hasError = true;
      }
    }

    // Merge new frames with existing ones: keep frames from sources not being updated
    const newFrameIds = new Set(newFrames.map((f) => f.id));
    const surviving = existing.frames.filter((f) => {
      const sourceSlug = f.id.split("/")[0];
      return !sourceSlugsToRemove.has(sourceSlug);
    });
    existing.frames = [...surviving, ...newFrames];
    existing.rendered_at = new Date().toISOString();

    // Write frames.json (always — --json additionally prints it)
    writeFileSync(framesPath, JSON.stringify(existing, null, 2) + "\n");
    if (jsonOnly) console.log(JSON.stringify(existing, null, 2));

    // Exit precedence: 2 unreadable ref · 1 a source blank/failed (everything else written) ·
    // 3 nothing rendered at all · 0 every source rendered
    if (hasUnreadable) return 2;
    if (hasBlank || hasError) return 1;
    if (newFrames.length === 0) return 3;
    return 0;
  } finally {
    for (const { server } of deckServers.values()) {
      try { server.close(); } catch {}
    }
    // Cleanup Chrome
    try {
      session.ws.close();
      session.proc.kill("SIGKILL");
      rmSync(session.userData, { recursive: true, force: true });
    } catch {}
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const code = await main();
  process.exit(code);
}
