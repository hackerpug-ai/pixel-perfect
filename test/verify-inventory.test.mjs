// Test suite for verify-inventory.mjs
// Integration tests against real inventory JSON and the gate logic.

import assert from "node:assert/strict";
import { readFileSync, existsSync, mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { main, verifyInventory, validateShape } from "../plugins/pixel-perfect/scripts/verify-inventory.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURES_DIR = path.join(ROOT, "test/fixtures/inventory");

function loadFixture(name) {
  const filePath = path.join(FIXTURES_DIR, `${name}.json`);
  if (!existsSync(filePath)) {
    throw new Error(`Fixture not found: ${filePath}`);
  }
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function runCli(args) {
  // Capture stdout/stderr
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
  return { code, stdout, stderr };
}

// --- Tests ---

test("valid.json passes with exit 0", () => {
  const inv = loadFixture("valid");
  const result = verifyInventory(inv);
  assert.equal(result.exit, 0, "Should pass");
  assert.equal(result.violations.length, 0, "Should have no violations");
  assert.equal(result.summary.frames, 5);
  assert.equal(result.summary.atoms, 7);
  assert.equal(result.summary.molecules, 4);
  assert.equal(result.summary.organisms, 2);
  assert.equal(result.summary.screens, 3);
});

test("valid.json CLI mode produces expected output", () => {
  const tmpDir = mkdtempSync(path.join(tmpdir(), "pp-inv-"));
  const invPath = path.join(tmpDir, "inventory.json");
  const inv = loadFixture("valid");
  writeFileSync(invPath, JSON.stringify(inv), "utf8");

  const { code, stdout } = runCli([invPath]);
  assert.equal(code, 0);
  assert.match(stdout, /INVENTORY —/);
  assert.match(stdout, /✓ INVENTORY COVERED/);
  assert.ok(!stdout.includes("✗"), "Should have no violation markers");
});

test("vacuous (empty frames) exits 3", () => {
  const inv = loadFixture("vacuous");
  const result = verifyInventory(inv);
  assert.equal(result.exit, 3, "Should exit 3 for empty frames");
  assert.equal(result.summary.frames, 0);
});

test("unclaimed-frame violation detected", () => {
  const inv = loadFixture("unclaimed-frame");
  const result = verifyInventory(inv);
  assert.equal(result.exit, 1);
  assert.ok(result.violations.some((v) => v.class === "unclaimed-frame"), "Should have unclaimed-frame violation");
  const msg = result.violations.find((v) => v.class === "unclaimed-frame")?.message;
  assert.ok(msg.includes("not referenced"));
});

test("unknown-frame-reference violation in screen states", () => {
  const inv = loadFixture("unknown-frame-reference");
  const result = verifyInventory(inv);
  assert.equal(result.exit, 1);
  assert.ok(result.violations.some((v) => v.class === "unknown-frame-reference"));
});

test("layering violation: molecule composing molecule", () => {
  const inv = loadFixture("layering-molecule");
  const result = verifyInventory(inv);
  assert.equal(result.exit, 1);
  assert.ok(result.violations.some((v) => v.class === "layering"));
});

test("layering violation: organism composing organism", () => {
  const inv = loadFixture("layering-organism");
  const result = verifyInventory(inv);
  assert.equal(result.exit, 1);
  assert.ok(result.violations.some((v) => v.class === "layering"));
});

test("atom composing violation", () => {
  const inv = loadFixture("atom-composing");
  const result = verifyInventory(inv);
  assert.equal(result.exit, 1);
  assert.ok(result.violations.some((v) => v.class === "atom-composing"));
});

test("unknown-shows violation", () => {
  const inv = loadFixture("unknown-shows");
  const result = verifyInventory(inv);
  assert.equal(result.exit, 1);
  assert.ok(result.violations.some((v) => v.class === "unknown-shows"));
});

test("undrawn-state violation", () => {
  const inv = loadFixture("undrawn-state");
  const result = verifyInventory(inv);
  assert.equal(result.exit, 1);
  assert.ok(result.violations.some((v) => v.class === "undrawn-state"));
});

test("undrawn-component violation", () => {
  const inv = loadFixture("undrawn-component");
  const result = verifyInventory(inv);
  assert.equal(result.exit, 1);
  assert.ok(result.violations.some((v) => v.class === "undrawn-component"));
});

test("duplicate-name violation", () => {
  const inv = loadFixture("duplicate-name");
  const result = verifyInventory(inv);
  assert.equal(result.exit, 1);
  assert.ok(result.violations.some((v) => v.class === "duplicate-name"));
});

test("duplicate-route violation", () => {
  const inv = loadFixture("duplicate-route");
  const result = verifyInventory(inv);
  assert.equal(result.exit, 1);
  assert.ok(result.violations.some((v) => v.class === "duplicate-route"));
});

test("status blocked causes exit 1", () => {
  const inv = loadFixture("status-blocked");
  const result = verifyInventory(inv);
  assert.equal(result.exit, 1);
  assert.ok(result.violations.some((v) => v.class === "status-blocked"));
});

// --- Shape validation tests (exit 2) ---

test("bad version exits 2", () => {
  const inv = loadFixture("valid");
  inv.version = 2;
  const shape = validateShape(inv);
  assert.equal(shape.valid, false);
  assert.ok(shape.errors.some((e) => e.includes("version must be 1")));
});

test("bad status exits 2", () => {
  const inv = loadFixture("valid");
  inv.status = "invalid";
  const shape = validateShape(inv);
  assert.equal(shape.valid, false);
});

test("bad frame id pattern exits 2", () => {
  const inv = loadFixture("valid");
  inv.frames[0].id = "invalid";
  const shape = validateShape(inv);
  assert.equal(shape.valid, false);
});

test("bad hash format exits 2", () => {
  const inv = loadFixture("valid");
  inv.sources[0].hash = "not-a-hash";
  const shape = validateShape(inv);
  assert.equal(shape.valid, false);
});

test("unknown top-level key exits 2", () => {
  const inv = loadFixture("valid");
  inv.unknownKey = "value";
  const shape = validateShape(inv);
  assert.equal(shape.valid, false);
  assert.ok(shape.errors.some((e) => e.includes("Unknown top-level key")));
});

test("atom with non-PascalCase name exits 2", () => {
  const inv = loadFixture("valid");
  inv.atoms[0].name = "badName";
  const shape = validateShape(inv);
  assert.equal(shape.valid, false);
});

// --- CLI tests ---

test("CLI exits 2 for non-existent file", () => {
  const { code, stderr } = runCli(["/nonexistent/file.json"]);
  assert.equal(code, 2);
  assert.match(stderr, /CONFIG ERROR|cannot read/i);
});

test("CLI exits 2 for invalid JSON", () => {
  const tmpDir = mkdtempSync(path.join(tmpdir(), "pp-inv-"));
  const invPath = path.join(tmpDir, "inventory.json");
  writeFileSync(invPath, "not json", "utf8");
  const { code } = runCli([invPath]);
  assert.equal(code, 2);
});

test("CLI with --json outputs JSON only", () => {
  const tmpDir = mkdtempSync(path.join(tmpdir(), "pp-inv-"));
  const invPath = path.join(tmpDir, "inventory.json");
  const inv = loadFixture("valid");
  writeFileSync(invPath, JSON.stringify(inv), "utf8");

  const { code, stdout, stderr } = runCli([invPath, "--json"]);
  assert.equal(code, 0);
  const json = JSON.parse(stdout);
  assert.ok(json.exit !== undefined);
  assert.ok(Array.isArray(json.violations));
  assert.ok(Array.isArray(json.warnings));
  // Should not print to stderr in JSON mode
  assert.equal(stderr, "");
});

test("CLI with --frames checks coverage", () => {
  const tmpDir = mkdtempSync(path.join(tmpdir(), "pp-inv-"));
  const invPath = path.join(tmpDir, "inventory.json");
  const framesPath = path.join(tmpDir, "frames.json");

  const inv = loadFixture("valid");
  const frames = {
    version: 1,
    rendered_at: "2026-08-30T00:00:00Z",
    sources: [],
    frames: [
      { id: "cockpit/01", png: "...", source: "...", index: 0, label: "...", viewport: "...", width: 1440, height: 900, route: "/", state: "idle" },
      { id: "cockpit/99", png: "...", source: "...", index: 1, label: "...", viewport: "...", width: 1440, height: 900, route: "/", state: "idle" }, // Extra frame not in inventory
    ],
  };

  writeFileSync(invPath, JSON.stringify(inv), "utf8");
  writeFileSync(framesPath, JSON.stringify(frames), "utf8");

  const { code, stdout } = runCli([invPath, "--frames", framesPath]);
  assert.equal(code, 1); // Should fail due to cockpit/99 not claimed
  assert.match(stdout, /frames-coverage/);
  assert.match(stdout, /cockpit\/99/);
});

test("CLI reports violations with paths", () => {
  const tmpDir = mkdtempSync(path.join(tmpdir(), "pp-inv-"));
  const invPath = path.join(tmpDir, "inventory.json");
  const inv = loadFixture("unclaimed-frame");
  writeFileSync(invPath, JSON.stringify(inv), "utf8");

  const { code, stdout } = runCli([invPath]);
  assert.equal(code, 1);
  assert.match(stdout, /\✗ \[unclaimed-frame\]/);
  assert.match(stdout, /frames\[\d+\]/);
});
