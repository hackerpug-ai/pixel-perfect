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
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
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
  node render-frames.mjs --merge-from <run-dir> [<ref>...] --out <dir>

A <ref> is an HTML deck, an image, a URL, a wireframes directory, or a directory
whose html/htm/png/jpg/jpeg/webp files are each rendered as their own source.

Options:
  --out <dir>               output directory (required)
  --frame-selector <css>    CSS selector for frames, or auto (default): .fr, then
                            [data-screen-label] sections, then top-most bordered boxes
                            >=300x200 (Claude Design canvases), then the full page
  --reserve <frames.json>   treat that index's slugs as taken (a run rendered outside
                            design/reference); the same ref keeps its reserved slug
  --merge-from <run-dir>    copy sources (all, or only the named refs) and their frames
                            from a run directory into --out, without rendering
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
  if (existsSync(ref) && statSync(ref).isDirectory() && existsSync(join(ref, "wireframes.json"))) {
    return "wireframes";
  }
  return null;
}

const DESIGN_FILE = /\.(html?|png|jpe?g|webp)$/i;

// A directory (other than a wireframes directory) stands for its design files: each html or
// image child becomes its own source, in name order, non-recursively. Anything that cannot be
// a source is reported unreadable here, before Chrome starts, instead of crashing the run.
function expandRefs(refs) {
  const expanded = [];
  const unreadable = [];
  for (const ref of refs) {
    const isUrl = ref.startsWith("http://") || ref.startsWith("https://");
    if (!isUrl && existsSync(ref) && statSync(ref).isDirectory() && !existsSync(join(ref, "wireframes.json"))) {
      const children = readdirSync(ref).filter((f) => DESIGN_FILE.test(f)).sort();
      if (children.length === 0) unreadable.push({ ref, why: "directory has no html or image files" });
      for (const child of children) expanded.push(join(ref, child));
    } else if (detectRefKind(ref) === null) {
      unreadable.push({ ref, why: existsSync(ref) ? "unsupported reference type" : "not found" });
    } else {
      expanded.push(ref);
    }
  }
  return { expanded, unreadable };
}

// Copy chosen sources and their frame files from a run directory's index into another index.
// A slug already owned by a different ref in the destination is refused: merging it would
// replace that source's frames.
function mergeFrom(runDir, outDir, onlyRefs) {
  const read = (dir) => {
    const file = join(dir, "frames.json");
    return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : { version: 1, rendered_at: "", sources: [], frames: [] };
  };
  if (!existsSync(join(runDir, "frames.json"))) {
    console.error(`✗ ${runDir} — unreadable: no frames.json to merge from`);
    return 2;
  }
  const run = read(runDir);
  const dst = read(outDir);
  const want = onlyRefs.length ? new Set(onlyRefs) : null;
  const chosen = run.sources.filter((src) => !want || want.has(src.ref));
  if (want) {
    for (const ref of want) {
      if (!chosen.some((src) => src.ref === ref)) {
        console.error(`✗ ${ref} — unreadable: not a source in ${runDir}`);
        return 2;
      }
    }
  }
  for (const src of chosen) {
    const owner = dst.sources.find((d) => d.slug === src.slug && d.ref !== src.ref);
    if (owner) {
      console.error(`✗ ${src.ref} — slug "${src.slug}" is owned by another ref in ${outDir} (${owner.ref}); re-render the run with --reserve`);
      return 2;
    }
  }
  ensureDir(outDir);
  for (const src of chosen) {
    rmSync(join(outDir, src.slug), { recursive: true, force: true });
    if (existsSync(join(runDir, src.slug))) cpSync(join(runDir, src.slug), join(outDir, src.slug), { recursive: true });
    dst.sources = dst.sources.filter((d) => d.ref !== src.ref);
    dst.sources.push(src);
    dst.frames = dst.frames.filter((f) => f.id.split("/")[0] !== src.slug);
    dst.frames.push(...run.frames.filter((f) => f.id.split("/")[0] === src.slug));
  }
  dst.rendered_at = new Date().toISOString();
  writeFileSync(join(outDir, "frames.json"), JSON.stringify(dst, null, 2) + "\n");
  console.log(`✓ merged ${chosen.length} source(s) from ${runDir} into ${outDir}`);
  return 0;
}

async function loadAndSettle(cdp, url, settleMs) {
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
    if (!info.result || !info.result.value) continue; // Skip if no value yet
    const { innerLength, sizedCount } = info.result.value;
    if (innerLength === prevLength && sizedCount === prevCount) {
      stableCount++;
    } else {
      stableCount = 0;
    }
    prevLength = innerLength;
    prevCount = sizedCount;
  }
}

async function pageHeight(cdp) {
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
  return scrollHeightResp.result?.value || 0;
}

async function renderHtmlDeck(cdp, url, selector, settleMs, width) {
  await loadAndSettle(cdp, url, settleMs);

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

  const scrollHeight = await pageHeight(cdp);

  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width,
    height: Math.round(scrollHeight),
    deviceScaleFactor: 1,
    mobile: false,
    hasTouch: false,
  });

  // Query frames. "auto" tries the Claude Design frame class first, then labelled sections
  // ([data-screen-label], how Claude Design marks the sections of a long page), then a
  // computed-style heuristic — top-most bordered boxes of screen size — because deck runtimes
  // re-serialize inline colors (hex -> rgb()), so an attribute selector on the authored style
  // never matches.
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
    frames = await query(bySelector(".fr"));
    resolvedSelector = "auto:.fr";
    if (frames.length === 0) {
      frames = await query(bySelector("[data-screen-label]"));
      resolvedSelector = "auto:[data-screen-label]";
    }
    if (frames.length === 0) {
      frames = await query(BORDERED);
      resolvedSelector = "auto:bordered";
    }
  } else {
    frames = await query(bySelector(selector));
  }

  // If no frames found with selector, capture full page
  if (frames.length === 0) {
    const fullPage = await cdp.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
    });
    return {
      blank: false,
      frames: [
        {
          png: Buffer.from(fullPage.data, "base64"),
          label: null,
          route: null,
          state: null,
          viewport: `${width}x${Math.round(scrollHeight)}`,
          width,
          height: Math.round(scrollHeight),
        },
      ],
      resolvedSelector: "full-page",
      warning: `Selector ${resolvedSelector} matched no elements; captured full page instead.`,
    };
  }

  // Capture each frame
  const captured = [];
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

  return { blank: false, resolvedSelector, frames: captured };
}

// A frame selector only sees what it selects: a sticky header or an unbordered hero outside
// every selected box would reach no frame, and a deck is otherwise rendered at one width in
// its default theme. So every deck also gets one full-page frame per (width x theme); the
// dark pass runs only when the deck styles [data-theme="dark"].
const HAS_DARK_RULE = `(function() {
  const re = /\\[data-theme=["']?dark["']?\\]/;
  const walk = (rules) => Array.from(rules || []).some(r => (r.selectorText && re.test(r.selectorText)) || (r.cssRules && walk(r.cssRules)));
  return Array.from(document.styleSheets).some(sh => { try { return walk(sh.cssRules); } catch { return false; } });
})()`;

async function renderFullPages(cdp, url, settleMs, widths, skip = new Set()) {
  const frames = [];
  let dark = null;
  for (const [i, width] of widths.entries()) {
    const mobile = i > 0;
    for (const theme of ["default", "dark"]) {
      if (theme === "dark" && dark === false) continue;
      const key = `${width}:${theme}`;
      await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: theme === "dark" ? "dark" : "light" }] });
      await cdp.send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile, hasTouch: mobile });
      await loadAndSettle(cdp, url, settleMs);
      if (dark === null) dark = (await cdp.send("Runtime.evaluate", { expression: HAS_DARK_RULE, returnByValue: true })).result?.value === true;
      if (theme === "dark") {
        if (!dark) continue;
        // After load: a navigation would reset it. Themed roots carry data-theme; else the document.
        await cdp.send("Runtime.evaluate", { expression: `(function() {
          const els = document.querySelectorAll('[data-theme]');
          (els.length ? els : [document.documentElement]).forEach(el => el.setAttribute('data-theme', 'dark'));
        })()` });
        await sleep(300);
      }
      if (skip.has(key)) continue;
      const height = Math.round(await pageHeight(cdp));
      await cdp.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile, hasTouch: mobile });
      const shot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
      const png = Buffer.from(shot.data, "base64");
      // Record the image's real size: a page wider than a phone viewport is zoomed out to fit
      // under mobile emulation, as on a real phone, so the PNG can differ from the viewport.
      frames.push({
        png,
        label: `full · ${width} · ${theme}`,
        route: null,
        state: theme,
        viewport: `${width}x${height}`,
        width: png.readUInt32BE(16),
        height: png.readUInt32BE(20),
      });
    }
  }
  // Leave the session as renderHtmlDeck expects it: desktop metrics, no emulated media.
  await cdp.send("Emulation.setEmulatedMedia", { features: [] });
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: widths[0], height: 900, deviceScaleFactor: 1, mobile: false, hasTouch: false });
  return frames;
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
  let reservePath = null;
  let mergeFromDir = null;

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
    } else if (args[i] === "--reserve" && i + 1 < args.length) {
      reservePath = args[++i];
    } else if (args[i] === "--merge-from" && i + 1 < args.length) {
      mergeFromDir = args[++i];
    } else if (!args[i].startsWith("--")) {
      refs.push(args[i]);
    }
  }

  if (mergeFromDir) {
    if (!outDir) {
      usage();
      return 2;
    }
    return mergeFrom(mergeFromDir, outDir, refs);
  }

  if (refs.length === 0 || !outDir) {
    usage();
    return 2;
  }

  const { expanded, unreadable } = expandRefs(refs);
  for (const { ref, why } of unreadable) console.error(`✗ ${ref} — unreadable: ${why}`);
  if (expanded.length === 0) return 2;

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
  // A slug is taken when another ref owns it in this index or in the --reserve index; reusing it
  // would overwrite that source's frames. The same ref keeps the slug it already has.
  const takenBy = new Map(existing.sources.map((s) => [s.slug, s.ref]));
  if (reservePath && existsSync(reservePath)) {
    for (const s of JSON.parse(readFileSync(reservePath, "utf8")).sources || []) {
      if (!takenBy.has(s.slug)) takenBy.set(s.slug, s.ref);
      if (!slugByRef.has(s.ref)) slugByRef.set(s.ref, s.slug);
    }
  }
  let hasUnreadableRef = unreadable.length > 0;
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
    for (const ref of expanded) {
      const kind = detectRefKind(ref);

      // Preserve slug if this ref was rendered before, otherwise generate new one
      let refSlug;
      if (slugByRef.has(ref)) {
        refSlug = slugByRef.get(ref);
      } else {
        const base = slug(basename(ref).replace(extname(ref), ""));
        refSlug = base;
        // De-duplicate against this run and against slugs other refs own
        let counter = 2;
        while (slugUsed.has(refSlug) || (takenBy.has(refSlug) && takenBy.get(refSlug) !== ref)) {
          refSlug = `${base}-${counter++}`;
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
            result = await renderHtmlDeck(session.cdp, await serveDeck(ref), selector, settleMs, width);
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
          // A full-page fallback already is the desktop default-theme full page.
          const skip = new Set(result.resolvedSelector === "full-page" ? [`${width}:default`] : []);
          result.frames.push(...(await renderFullPages(session.cdp, await serveDeck(ref), settleMs, [width, mobileWidth], skip)));
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
    if (hasUnreadable || hasUnreadableRef) return 2;
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
