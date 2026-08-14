// Behavioral tests for capture-polish.mjs against the real shipped script
// and a fixture that actually renders in Chrome. No synthetic PNGs.

import assert from "node:assert/strict";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, test } from "node:test";
import {
  buildCaptureMatrix,
  findChrome,
  loadManifest,
  main,
  resolvePlatform,
} from "../plugins/pixel-perfect/scripts/capture-polish.mjs";
import { validateFinding } from "../plugins/pixel-perfect/scripts/findings.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE_SRC = path.join(ROOT, "test/fixtures/polish-app");

function cloneFixture() {
  const dir = mkdtempSync(path.join(tmpdir(), "pp-polish-cap-"));
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
    stderr += chunk;
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

describe("capture-polish", () => {
test("usage exits 2", async () => {
  const silent = async (args) => {
    const { code } = await runCli(args);
    return code;
  };
  assert.equal(await silent([]), 2);
  assert.equal(await silent(["--bogus"]), 2);
});

test("vacuous manifest (no screens) exits 3", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "pp-polish-empty-"));
  try {
    const dest = path.join(dir, "design");
    cpSync(path.join(FIXTURE_SRC, "design"), dest, { recursive: true });
    const manifest = JSON.parse(readFileSync(path.join(dest, "manifest.json"), "utf8"));
    manifest.platforms["web-desktop"].screens = [];
    writeFileSync(path.join(dest, "manifest.json"), JSON.stringify(manifest), "utf8");
    cpSync(path.join(FIXTURE_SRC, "app"), path.join(dir, "app"), { recursive: true });
    const { code, stdout } = await runCli([dir]);
    assert.equal(code, 3, stdout);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("fixture matrix includes declared screens and seed variants", () => {
  const manifest = loadManifest(FIXTURE_SRC);
  const { config } = resolvePlatform(manifest, "web-desktop");
  const seed = JSON.parse(readFileSync(path.join(FIXTURE_SRC, "design/polish/seed.json"), "utf8"));
  const matrix = buildCaptureMatrix(manifest, config, seed);
  const slugs = matrix.map((m) => m.slug);
  assert.ok(slugs.includes("home.default"));
  assert.ok(slugs.includes("home.empty"));
  assert.ok(slugs.includes("orders.default"));
  assert.ok(slugs.includes("orders.error"));
  assert.ok(slugs.includes("checkout.default"));
  assert.ok(slugs.includes("checkout.invalid"));
  assert.ok(slugs.includes("broken.default"));
  assert.ok(slugs.includes("orders.default.long-names"));
  assert.ok(slugs.includes("home.default.wrapped-headings"));
  assert.ok(slugs.includes("checkout.invalid.validation-errors"));
  assert.ok(slugs.includes("home.default.localized"));
});

async function assertCaptureRun(dir, runId) {
  const chrome = findChrome();
  assert.ok(chrome, "Chrome must be available to capture a real fixture");
  const { code, stdout, stderr } = await runCli([dir, "--run-id", runId]);
  const reportPath = path.join(dir, "design/polish/runs", runId, "report.json");
  assert.equal(code, 0, `exit ${code}\nstderr=${stderr}\nreportExists=${existsSync(reportPath)}\nstdoutBytes=${Buffer.byteLength(stdout)}`);
  assert.ok(existsSync(reportPath), `missing capture receipt ${reportPath}`);
  const report = JSON.parse(readFileSync(reportPath, "utf8"));
  assert.ok(report.run.endsWith(runId), report.run);
  const runDir = path.join(dir, report.run);
  const required = buildCaptureMatrix(
    loadManifest(dir),
    resolvePlatform(loadManifest(dir), "web-desktop").config,
    JSON.parse(readFileSync(path.join(dir, "design/polish/seed.json"), "utf8")),
  );
  for (const entry of required) {
    const ax = path.join(runDir, "ax", `${entry.slug}.json`);
    const cons = path.join(runDir, "console", `${entry.slug}.json`);
    assert.ok(existsSync(ax), `missing ax ${entry.slug}`);
    assert.ok(existsSync(cons), `missing console ${entry.slug}`);
    assert.ok(statSize(ax) > 2, `empty ax ${entry.slug}`);
    assert.ok(statSize(cons) > 1, `empty console ${entry.slug}`);
  }
  const broken = report.findings.filter((f) => f.principle === "RENDER");
  assert.ok(broken.length >= 1, "expected a RENDER BLOCKER");
  for (const finding of broken) {
    assert.equal(finding.severity, "BLOCKER");
    assert.equal(validateFinding(finding).ok, true, validateFinding(finding).errors.join("; "));
    assert.equal(finding.evidence.shot, null);
  }
  const brokenAx = JSON.parse(readFileSync(path.join(runDir, "ax", "broken.default.json"), "utf8"));
  assert.equal(brokenAx.ready, false, "RENDER must come from a live page that never painted [data-screen]");
  assert.equal(brokenAx.screen, null, "unpainted /broken must not mount a screen root");
  assert.match(brokenAx.html, /id="root"/, "broken route must load the real app document, not a server stub");
  assert.doesNotMatch(brokenAx.html, /<title>Broken<\/title>/);
  const judgedSlugs = report.judged.map((p) => path.basename(p, ".png"));
  assert.equal(judgedSlugs.includes("broken.default"), false, "broken shot must not be judged");
  for (const shot of report.judged) {
    const abs = path.join(dir, shot);
    assert.ok(existsSync(abs), `missing shot ${shot}`);
    const buf = readFileSync(abs);
    assert.ok(buf.length > 100, `tiny shot ${shot}`);
    assert.equal(buf[0], 0x89);
    assert.equal(buf[1], 0x50);
  }
  return report;
}

function statSize(file) {
  return readFileSync(file).byteLength;
}

test("real capture writes shot+ax+console for the matrix and a RENDER blocker for /broken", { timeout: 180_000 }, async () => {
  const dir = cloneFixture();
  try {
    const first = await assertCaptureRun(dir, "run1");
    const second = await assertCaptureRun(dir, "run2");
    assert.equal(first.matrix.length, second.matrix.length);
    const firstBroken = first.findings.filter((f) => f.principle === "RENDER").length;
    const secondBroken = second.findings.filter((f) => f.principle === "RENDER").length;
    assert.equal(firstBroken, secondBroken);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
});
