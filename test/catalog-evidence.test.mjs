// Pixel evidence in receipts, the loud pixel exemption, PNG-level duplicates, and the forged-receipt
// case from review. Real temp projects and real headless Chrome renders where pixels matter.

import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fingerprint } from "../plugins/pixel-perfect/scripts/verify-catalog.mjs";
import { inkImage } from "./helpers/png.mjs";
import {
  CATALOG_FIXTURE,
  PIXEL_FIXTURE,
  STAGE_SCRIPT_HEAD,
  ROOT,
  cloneFixture,
  readIn,
  removeDirs,
  runCli,
  scratchProject,
  writeCommandProject,
  writeIn,
} from "./helpers/catalog.mjs";
import { pathToFileURL } from "node:url";

const GOLDENS = "design/goldens/web-desktop";
const RECEIPT = `${GOLDENS}/receipt.json`;
const NOT_REQUIRED = "PIXELS NOT REQUIRED: Structural text fixture for the catalog gate";
const HELPER_PNG = pathToFileURL(path.join(ROOT, "test/helpers/png.mjs")).href;

function pixelClone() {
  return cloneFixture(PIXEL_FIXTURE, "pp-evidence-");
}

function noneClone() {
  return cloneFixture(CATALOG_FIXTURE, "pp-exempt-");
}

// --- M1: a pixel exemption is loud in every mode and recorded in the receipt ---

test("pixels none prints PIXELS NOT REQUIRED on stderr in baseline, check, accept, render and audit", () => {
  const dir = noneClone();
  try {
    const base = runCli(["--baseline", dir, "--platform", "web-desktop"]);
    assert.equal(base.code, 0, base.stderr);
    assert.ok(base.stderr.includes(NOT_REQUIRED), base.stderr);

    const check = runCli(["--check", dir, "--platform", "web-desktop"]);
    assert.ok(check.stderr.includes(NOT_REQUIRED), check.stderr);

    const accept = runCli(["--accept", "**", dir, "--platform", "web-desktop"]);
    assert.ok(accept.stderr.includes(NOT_REQUIRED), accept.stderr);

    const render = runCli(["--render", dir, "--platform", "web-desktop", "--only", "atoms/Badge", "--out", "design/.captures/none-badge"]);
    assert.ok(render.stderr.includes(NOT_REQUIRED), render.stderr);

    const audit = runCli(["--audit", dir, "--platform", "web-desktop"]);
    assert.ok(audit.stderr.includes(NOT_REQUIRED), audit.stderr);
  } finally {
    removeDirs(dir);
  }
});

test("receipt.json records pixels none and the reason at the top level", () => {
  const dir = noneClone();
  try {
    assert.equal(runCli(["--baseline", dir, "--platform", "web-desktop"]).code, 0);
    const receipt = JSON.parse(readIn(dir, RECEIPT));
    assert.equal(receipt.pixels, "none");
    assert.match(receipt.pixelsReason, /Structural text fixture/);
    assert.equal(receipt.goldens["atoms/Badge/default"].png, undefined, "no PNG evidence when pixels are none");
  } finally {
    removeDirs(dir);
  }
});

test("the audit reports pixels and the reason in its JSON and its message", () => {
  const dir = noneClone();
  try {
    assert.equal(runCli(["--baseline", dir, "--platform", "web-desktop"]).code, 0);
    const { code, report } = runCli(["--audit", dir, "--platform", "web-desktop"]);
    assert.equal(code, 0);
    assert.equal(report.pixels, "none");
    assert.match(report.pixelsReason, /Structural text fixture/);
    assert.match(report.message, /pixels not required/);
  } finally {
    removeDirs(dir);
  }
});

// --- M4: PNG evidence per receipt entry, PNG-level duplicates, and the missing-evidence audit ---

test("each receipt entry records its PNG evidence: sha256, width, height and ink pixels", () => {
  const dir = pixelClone();
  try {
    assert.equal(runCli(["--baseline", dir, "--platform", "web-desktop"]).code, 0);
    const receipt = JSON.parse(readIn(dir, RECEIPT));
    const png = receipt.goldens["atoms/Button/default"].png;
    assert.match(png.hash, /^sha256:[0-9a-f]{64}$/);
    assert.equal(png.width, 390);
    assert.equal(png.height, 300);
    assert.ok(png.inkPixels >= 64, JSON.stringify(png));
    assert.equal(receipt.pixels, "required");
    assert.equal(receipt.pixelsReason, null);
  } finally {
    removeDirs(dir);
  }
});

test("a PNG identical across two different components is a violation, listing each group", () => {
  const dir = pixelClone();
  try {
    // Chip differs from Badge in its markup (a trailing semicolon in the style attribute), so the
    // structural body differs and only the pixels match.
    const badge = readFileSync(path.join(dir, "sandbox/stories/atoms/Badge/default.html"), "utf8").trim();
    writeIn(dir, "sandbox/stories/atoms/Chip/default.html", badge.replace('border-radius:999px"', 'border-radius:999px;"') + "\n");
    const { code, report } = runCli(["--baseline", dir, "--platform", "web-desktop"]);
    assert.equal(code, 1, JSON.stringify(report?.violations));
    const groups = report.violations.filter((v) => v.kind === "cross-component-png-duplicate");
    assert.equal(groups.length, 1, JSON.stringify(report.violations));
    assert.deepEqual([...groups[0].keys].sort(), ["atoms/Badge/default", "atoms/Chip/default"]);
    assert.equal(report.violations.some((v) => v.kind === "cross-component-duplicate"), false, "the markup differs, so no structural duplicate");
  } finally {
    removeDirs(dir);
  }
});

test("identical PNGs across states of one component are reported as duplicates, not failures", () => {
  const dir = pixelClone();
  try {
    const button = readFileSync(path.join(dir, "sandbox/stories/atoms/Button/default.html"), "utf8");
    writeIn(dir, "sandbox/stories/atoms/Button/hover.html", button);
    const { code, report } = runCli(["--baseline", dir, "--platform", "web-desktop"]);
    assert.equal(code, 0, JSON.stringify(report?.violations));
    const pngGroup = report.duplicates.find((d) => d.basis === "png" && d.keys.includes("atoms/Button/hover"));
    assert.ok(pngGroup, JSON.stringify(report.duplicates));
  } finally {
    removeDirs(dir);
  }
});

test("audit names every receipt entry that has no pixel evidence where pixels are required", () => {
  const dir = pixelClone();
  try {
    assert.equal(runCli(["--baseline", dir, "--platform", "web-desktop"]).code, 0);
    const receipt = JSON.parse(readIn(dir, RECEIPT));
    for (const entry of Object.values(receipt.goldens)) delete entry.png;
    writeFileSync(path.join(dir, RECEIPT), JSON.stringify(receipt, null, 2) + "\n");
    const { code, report, stderr } = runCli(["--audit", dir, "--platform", "web-desktop"]);
    assert.equal(code, 1, stderr);
    const keys = report.noPixelEvidence.map((e) => e.key).sort();
    assert.deepEqual(keys, Object.keys(receipt.goldens).sort());
    assert.equal(report.noPixelEvidence[0].reason, "golden has no pixel evidence");
  } finally {
    removeDirs(dir);
  }
});

// --- The forged-receipt case from review: hand-written receipt, hand-copied goldens, one tiny PNG per story ---

function forgedProject() {
  // A capture command that writes the forger's structural text and a 1x1 PNG for every story.
  const dir = writeCommandProject(
    scratchProject("pp-forge-"),
    `${STAGE_SCRIPT_HEAD}import { inkImage } from ${JSON.stringify(HELPER_PNG)};\nput("atoms/Thing/default.txt", "Thing\\nforged=1\\n");\nput("atoms/Thing/default.png", inkImage({ width: 1, height: 1, inkCount: 0 }));\n`,
    { pixels: "required", pixels_reason: undefined, viewport: "390x300" },
    { atoms: [{ name: "Thing", status: "verified" }] },
  );
  // The forger hand-copies the golden and hand-writes a receipt that vouches for it.
  const golden = "Thing\nforged=1\n";
  writeIn(dir, `${GOLDENS}/atoms/Thing/default.txt`, golden);
  writeIn(
    dir,
    RECEIPT,
    JSON.stringify({
      version: 1,
      platform: "web-desktop",
      goldens: { "atoms/Thing/default": { hash: fingerprint(golden), ext: ".txt", mode: "baseline" } },
    }),
  );
  return dir;
}

test("forged receipt with a tiny PNG per story fails check (blank-png) and audit (no pixel evidence)", () => {
  const dir = forgedProject();
  try {
    const check = runCli(["--check", dir, "--platform", "web-desktop"]);
    assert.equal(check.code, 1, check.stderr);
    assert.deepEqual(check.report.violations.map((v) => [v.kind, v.key]), [["blank-png", "atoms/Thing/default"]]);

    const audit = runCli(["--audit", dir, "--platform", "web-desktop"]);
    assert.equal(audit.code, 1, audit.stderr);
    assert.deepEqual(audit.report.noPixelEvidence.map((e) => e.key), ["atoms/Thing/default"]);
  } finally {
    removeDirs(dir);
  }
});
