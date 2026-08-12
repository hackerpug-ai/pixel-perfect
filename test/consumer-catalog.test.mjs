// Consumer-style catalog smoke: real capture.command (npm run sandbox:capture),
// not the composition-marker fixture alone. Drives shipped verify-catalog.mjs.

import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { main } from "../plugins/pixel-perfect/scripts/verify-catalog.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE = path.join(ROOT, "test/fixtures/consumer-web");
const SCRIPT = path.join(ROOT, "plugins/pixel-perfect/scripts/verify-catalog.mjs");

function clone() {
  const dir = mkdtempSync(path.join(tmpdir(), "pp-consumer-"));
  cpSync(FIXTURE, dir, { recursive: true });
  // drop any committed captures/goldens noise
  for (const p of ["design/.captures", "design/goldens"]) {
    const full = path.join(dir, p);
    if (existsSync(full)) rmSync(full, { recursive: true, force: true });
  }
  return dir;
}

function runCli(args) {
  let stdout = "";
  let stderr = "";
  const po = process.stdout.write;
  const pe = process.stderr.write;
  process.stdout.write = (c) => {
    stdout += c;
    return true;
  };
  process.stderr.write = (c) => {
    stderr += c;
    return true;
  };
  let code;
  try {
    code = main(args);
  } finally {
    process.stdout.write = po;
    process.stderr.write = pe;
  }
  return { code, stdout, stderr };
}

test("consumer fixture ships a real capture command", () => {
  const pkg = JSON.parse(readFileSync(path.join(FIXTURE, "package.json"), "utf8"));
  assert.equal(pkg.scripts["sandbox:capture"], "node sandbox/capture.mjs");
  assert.ok(existsSync(path.join(FIXTURE, "sandbox/capture.mjs")));
  const manifest = JSON.parse(readFileSync(path.join(FIXTURE, "design/manifest.json"), "utf8"));
  assert.match(manifest.platforms["web-desktop"].capture.command, /sandbox:capture|capture\.mjs/);
  assert.ok(existsSync(SCRIPT));
});

test("consumer: baseline → mutate → check=1 → accept → check=0", () => {
  const dir = clone();
  try {
    assert.equal(runCli(["--baseline", dir, "--platform", "web-desktop"]).code, 0);
    const golden = path.join(dir, "design/goldens/web-desktop/atoms/Button/default.txt");
    assert.ok(existsSync(golden), "baseline must write Button golden via capture.command");

    const button = path.join(dir, "sandbox/stories/atoms/Button/default.txt");
    writeFileSync(button, readFileSync(button, "utf8") + "label=DRIFTED\n", "utf8");
    const drift = runCli(["--check", dir, "--platform", "web-desktop"]);
    assert.equal(drift.code, 1, drift.stdout);
    const report = JSON.parse(drift.stdout);
    assert.ok(report.drifted.some((d) => d.key.includes("Button")), JSON.stringify(report.drifted));

    assert.equal(runCli(["--accept", "**", dir]).code, 0);
    assert.equal(runCli(["--check", dir]).code, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("consumer: capture.command is executed (not silent catalog-only path)", () => {
  const dir = clone();
  try {
    // Break the capture script → baseline must fail with config/capture error (exit 2)
    writeFileSync(path.join(dir, "sandbox/capture.mjs"), "process.exit(7);\n", "utf8");
    const { code, stderr, stdout } = runCli(["--baseline", dir]);
    assert.equal(code, 2, `expected capture failure, got ${code}\n${stderr}\n${stdout}`);
    assert.match(stderr + stdout, /capture command failed|CONFIG ERROR/i);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
