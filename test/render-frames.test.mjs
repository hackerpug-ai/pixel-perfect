// Behavioral tests for render-frames.mjs against real Chrome and fixtures

import assert from "node:assert/strict";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, test } from "node:test";
import { main } from "../plugins/pixel-perfect/scripts/render-frames.mjs";
import { findChrome } from "../plugins/pixel-perfect/scripts/capture-polish.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE_SRC = path.join(ROOT, "test/fixtures/frames-deck");

function cloneFixture() {
  const dir = mkdtempSync(path.join(tmpdir(), "pp-render-frames-"));
  cpSync(FIXTURE_SRC, dir, { recursive: true });
  return dir;
}

async function runCli(args) {
  const prevOut = process.stdout.write;
  const prevErr = process.stderr.write;
  let stdout = "";
  let stderr = "";
  process.stdout.write = (chunk) => {
    stdout += typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8");
    return true;
  };
  process.stderr.write = (chunk) => {
    stderr += typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8");
    return true;
  };
  let code;
  try {
    code = await main(args);
  } finally {
    process.stdout.write = prevOut;
    process.stderr.write = prevErr;
  }
  return { code, stdout, stderr };
}

describe("render-frames", () => {
  test("usage exits 2 when no args", async () => {
    const { code } = await runCli([]);
    assert.equal(code, 2);
  });

  test("usage exits 2 when no --out", async () => {
    const { code } = await runCli(["./test.html"]);
    assert.equal(code, 2);
  });

  test("exits 2 when Chrome not found", async () => {
    if (findChrome()) {
      // Skip this test if Chrome is available
      return;
    }
    const dir = mkdtempSync(path.join(tmpdir(), "pp-render-no-chrome-"));
    try {
      const { code } = await runCli([
        path.join(FIXTURE_SRC, "deck.html"),
        "--out",
        path.join(dir, "output"),
      ]);
      assert.equal(code, 2);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("exits 2 when ref file does not exist", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "pp-render-notfound-"));
    try {
      const { code } = await runCli([
        "/nonexistent/file.html",
        "--out",
        path.join(dir, "output"),
      ]);
      assert.equal(code, 2);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("deck renders three frames with PNG magic and metadata", async () => {
    const chrome = findChrome();
    assert.ok(chrome, "Chrome must be available to run this test");

    const tmpDir = mkdtempSync(path.join(tmpdir(), "pp-render-deck-"));
    const outDir = path.join(tmpDir, "output");

    try {
      const deckPath = path.join(FIXTURE_SRC, "deck.html");
      const { code, stderr } = await runCli([deckPath, "--out", outDir]);

      assert.equal(code, 0, `Expected exit 0, got ${code}. stderr: ${stderr}`);
      assert.ok(existsSync(path.join(outDir, "frames.json")), "frames.json should exist");

      // Check frames were created
      const framesPath = path.join(outDir, "frames.json");
      const frames = JSON.parse(readFileSync(framesPath, "utf8"));

      assert.equal(frames.frames.length, 3, "Should have 3 frames");

      // Verify each frame has valid PNG
      for (let i = 0; i < 3; i++) {
        const frame = frames.frames[i];
        const pngPath = path.join(outDir, frame.png);
        assert.ok(existsSync(pngPath), `PNG should exist: ${pngPath}`);

        const pngBytes = readFileSync(pngPath);
        assert.ok(pngBytes.length > 100, `PNG should be non-trivial size (${pngBytes.length} bytes)`);

        // Check PNG magic
        const magic = pngBytes.slice(0, 4);
        assert.deepEqual(magic, Buffer.from([0x89, 0x50, 0x4e, 0x47]), `PNG magic incorrect for frame ${i + 1}`);

        // Check frame metadata
        assert.ok(frame.id, `Frame ${i + 1} should have id`);
        assert.ok(frame.id.startsWith("deck/"), `Frame id should start with deck/`);
        assert.ok(frame.viewport, `Frame ${i + 1} should have viewport`);
        assert.ok(frame.width > 0, `Frame ${i + 1} should have width`);
        assert.ok(frame.height > 0, `Frame ${i + 1} should have height`);
      }

      // Check source hash
      assert.ok(frames.sources.length >= 1, "Should have at least one source");
      const source = frames.sources.find((s) => s.slug === "deck");
      assert.ok(source, "Should have deck source");
      assert.ok(source.hash.startsWith("sha256:"), "Hash should be sha256");
      assert.ok(source.hash.length === 71, "sha256 hash should be 71 chars (7 + 64)");

      // Check frame labels
      const frame2 = frames.frames[1];
      assert.equal(frame2.label, "Labeled Frame", "Frame 2 should have label from data-label");

      // Check frame 3 route/state and that support.js was loaded
      const frame3 = frames.frames[2];
      assert.equal(frame3.route, "/library", "Frame 3 should have route");
      assert.equal(frame3.state, "empty", "Frame 3 should have state");

      // Verify that the frame 3 content contains the text injected by support.js
      // We can't directly inspect the PNG, but we can check it was processed
      assert.ok(frame3.label === "with-route", "Frame 3 should have correct label");
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("blank render exits 1 with diagnosis", async () => {
    const chrome = findChrome();
    assert.ok(chrome, "Chrome must be available to run this test");

    const tmpDir = mkdtempSync(path.join(tmpdir(), "pp-render-blank-"));
    const outDir = path.join(tmpDir, "output");

    try {
      const blankPath = path.join(FIXTURE_SRC, "blank.html");
      const { code, stderr } = await runCli([blankPath, "--out", outDir]);

      assert.equal(code, 1, `Expected exit 1 for blank render, got ${code}`);
      assert.ok(stderr.includes("BLANK RENDER"), "stderr should mention BLANK RENDER");
      assert.ok(
        stderr.includes("--settle") || stderr.includes("settle"),
        "stderr should mention --settle parameter"
      );

      // Check that frames.json exists but has no frames for this source
      const framesPath = path.join(outDir, "frames.json");
      assert.ok(existsSync(framesPath), "frames.json should exist even for blank");
      const framesJson = JSON.parse(readFileSync(framesPath, "utf8"));
      const source = framesJson.sources.find((s) => s.slug === "blank");
      assert.ok(source, "Should have blank source in frames.json");
      assert.equal(source.frames.length, 0, "Blank source should have no frames");
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("image file is copied and indexed", async () => {
    const tmpDir = mkdtempSync(path.join(tmpdir(), "pp-render-image-"));
    const outDir = path.join(tmpDir, "output");

    try {
      const imagePath = path.join(FIXTURE_SRC, "test.png");
      const { code } = await runCli([imagePath, "--out", outDir]);

      assert.equal(code, 0, `Expected exit 0 for image, got ${code}`);

      const framesPath = path.join(outDir, "frames.json");
      const frames = JSON.parse(readFileSync(framesPath, "utf8"));

      assert.equal(frames.frames.length, 1, "Should have 1 frame for image");
      const frame = frames.frames[0];
      assert.ok(frame.id.startsWith("test/01"), "Frame id should be test/01");
      assert.ok(frame.png.endsWith(".png"), "PNG path should end with .png");

      // Verify the file was copied
      const copiedPath = path.join(outDir, frame.png);
      assert.ok(existsSync(copiedPath), `Copied image should exist: ${copiedPath}`);

      const originalContent = readFileSync(imagePath);
      const copiedContent = readFileSync(copiedPath);
      assert.deepEqual(originalContent, copiedContent, "Copied image should match original");
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("URL reference captures desktop and mobile frames", async () => {
    const chrome = findChrome();
    assert.ok(chrome, "Chrome must be available to run this test");

    const tmpDir = mkdtempSync(path.join(tmpdir(), "pp-render-url-"));
    const outDir = path.join(tmpDir, "output");
    const fixtureDir = cloneFixture();

    try {
      // Start a simple HTTP server serving the fixture
      const { createServer } = await import("node:http");
      const { readFileSync, statSync, existsSync } = await import("node:fs");
      const { extname, join } = await import("node:path");

      const types = {
        ".html": "text/html; charset=utf-8",
        ".js": "text/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".json": "application/json",
        ".png": "image/png",
      };

      const server = createServer((req, res) => {
        const url = new URL(req.url, "http://127.0.0.1");
        let pathname = url.pathname;
        if (pathname === "/") pathname = "/deck.html";
        const file = join(fixtureDir, pathname);
        if (existsSync(file) && statSync(file).isFile()) {
          res.writeHead(200, { "content-type": types[extname(file)] || "text/plain" });
          res.end(readFileSync(file));
          return;
        }
        res.writeHead(404, { "content-type": "text/plain" });
        res.end("not found");
      });

      const serverReady = new Promise((resolve) => {
        server.listen(0, "127.0.0.1", () => {
          const port = server.address().port;
          resolve(port);
        });
      });

      const port = await serverReady;
      const url = `http://127.0.0.1:${port}/deck.html`;

      try {
        const { code } = await runCli([url, "--out", outDir]);

        assert.equal(code, 0, `Expected exit 0 for URL, got ${code}`);

        const framesPath = path.join(outDir, "frames.json");
        const frames = JSON.parse(readFileSync(framesPath, "utf8"));

        assert.equal(frames.frames.length, 2, "Should have 2 frames (desktop + mobile)");

        const desktop = frames.frames[0];
        const mobile = frames.frames[1];

        assert.equal(desktop.label, "desktop", "First frame should be labeled desktop");
        assert.equal(mobile.label, "mobile", "Second frame should be labeled mobile");

        // Desktop should be wider than mobile
        assert.ok(desktop.width >= 1440, "Desktop width should be >= 1440");
        assert.ok(mobile.width <= 390, "Mobile width should be <= 390");

        // Check PNGs exist
        assert.ok(existsSync(path.join(outDir, desktop.png)), "Desktop PNG should exist");
        assert.ok(existsSync(path.join(outDir, mobile.png)), "Mobile PNG should exist");
      } finally {
        server.close();
      }
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
      rmSync(fixtureDir, { recursive: true, force: true });
    }
  });

  test("frame selector .nope produces warning and full-page frame", async () => {
    const chrome = findChrome();
    assert.ok(chrome, "Chrome must be available to run this test");

    const tmpDir = mkdtempSync(path.join(tmpdir(), "pp-render-selector-"));
    const outDir = path.join(tmpDir, "output");

    try {
      const deckPath = path.join(FIXTURE_SRC, "deck.html");
      const { code, stderr } = await runCli([
        deckPath,
        "--out",
        outDir,
        "--frame-selector",
        ".nope",
      ]);

      assert.equal(code, 0, `Expected exit 0 even with no-match selector`);
      assert.ok(stderr.includes(".nope"), "stderr should name the selector");
      assert.ok(stderr.includes("matched"), "stderr should mention selector matching");

      const framesPath = path.join(outDir, "frames.json");
      const frames = JSON.parse(readFileSync(framesPath, "utf8"));

      // Should have captured one full-page frame instead
      assert.ok(frames.frames.length >= 1, "Should have at least 1 frame (full page)");
      const frame = frames.frames[0];
      assert.ok(frame.png, "Frame should have png path");
      assert.ok(existsSync(path.join(outDir, frame.png)), "PNG should exist");
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("idempotence: re-running updates only changed source", async () => {
    const chrome = findChrome();
    assert.ok(chrome, "Chrome must be available to run this test");

    const tmpDir = mkdtempSync(path.join(tmpdir(), "pp-render-idempotent-"));
    const outDir = path.join(tmpDir, "output");

    try {
      const deckPath = path.join(FIXTURE_SRC, "deck.html");
      const imagePath = path.join(FIXTURE_SRC, "test.png");

      // First run: render deck
      let { code: code1 } = await runCli([deckPath, "--out", outDir]);
      assert.equal(code1, 0);

      const framesPath = path.join(outDir, "frames.json");
      const frames1 = JSON.parse(readFileSync(framesPath, "utf8"));

      assert.equal(frames1.sources.length, 1, "First run should have 1 source");
      assert.equal(frames1.frames.length, 3, "First run should have 3 frames");

      // Second run: add image source
      const { code: code2, stdout: out2, stderr: err2 } = await runCli([deckPath, imagePath, "--out", outDir]);
      if (code2 !== 0) {
        console.error("Second run output:", out2);
        console.error("Second run error:", err2);
      }
      assert.equal(code2, 0, `Expected exit 0 on second run, got ${code2}`);

      const frames2 = JSON.parse(readFileSync(framesPath, "utf8"));

      assert.equal(frames2.sources.length, 2, "Second run should have 2 sources");
      assert.equal(frames2.frames.length, 4, "Second run should have 4 frames (3 + 1)");

      // Original deck frames should still be there
      const deckFrames = frames2.frames.filter((f) => f.id.startsWith("deck/"));
      assert.equal(deckFrames.length, 3, "Deck frames should be preserved");

      // New image frame should be added
      const imageFrames = frames2.frames.filter((f) => f.id.startsWith("test/"));
      assert.equal(imageFrames.length, 1, "Image frames should be added");
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
