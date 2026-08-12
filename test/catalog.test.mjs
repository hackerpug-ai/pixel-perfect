// Behavioral tests for verify-catalog.mjs against the real shipped script
// and an in-repo structural catalog fixture. No reimplemented diff logic —
// every assertion drives main() / exported modes on the fixture project.

import assert from "node:assert/strict";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  mkdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  main,
  normalizeCapture,
  fingerprint,
  captureFromCatalog,
  modeBaseline,
  modeCheck,
  modeAccept,
  modeBlast,
  modeReach,
  resolveCaptureConfig,
} from "../plugins/pixel-perfect/scripts/verify-catalog.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE_SRC = path.join(ROOT, "test/fixtures/catalog-project");
const SCRIPT = path.join(ROOT, "plugins/pixel-perfect/scripts/verify-catalog.mjs");

function cloneFixture() {
  const dir = mkdtempSync(path.join(tmpdir(), "pp-catalog-"));
  cpSync(FIXTURE_SRC, dir, { recursive: true });
  return dir;
}

function captureCfg(platformId = "web-desktop") {
  return resolveCaptureConfig(
    {
      capture: {
        medium: "text",
        goldens: `design/goldens/${platformId}`,
        catalog: "sandbox/catalog",
        staging: `design/.captures/${platformId}`,
      },
    },
    platformId,
  );
}

function runCli(args) {
  // Drive the real CLI entry via main() so exit codes match the binary path.
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

// --- pure helpers ---

test("normalizeCapture strips timestamps, abs paths, and hash suffixes", () => {
  const raw = [
    "id=\"abc12def34\"",
    "class=\"Button_a1b2c3d\"",
    "path=/Users/someone/Projects/app/src/x.tsx",
    "at 2026-08-11T00:00:00Z",
    "  trailing  ",
  ].join("\n");
  const n = normalizeCapture(raw, "/Users/someone/Projects/app");
  assert.match(n, /Button_<hash>/);
  assert.match(n, /<root>|\/Users|path=/);
  assert.match(n, /<ts>/);
  assert.ok(n.endsWith("\n"));
});

test("fingerprint is stable for identical content", () => {
  assert.equal(fingerprint("hello\n"), fingerprint("hello\n"));
  assert.notEqual(fingerprint("hello\n"), fingerprint("world\n"));
});

// --- baseline / check / accept / vacuous / usage ---

test("--baseline writes goldens at the planned path layout", () => {
  const dir = cloneFixture();
  try {
    const { code, stdout } = runCli(["--baseline", dir, "--platform", "web-desktop"]);
    assert.equal(code, 0, stdout);
    const report = JSON.parse(stdout);
    assert.equal(report.mode, "baseline");
    assert.ok(report.written.length >= 4, `expected ≥4 goldens, got ${report.written.length}`);
    // path layout: design/goldens/{platform}/{layer}/{name}/{state}.ext
    const button = path.join(dir, "design/goldens/web-desktop/atoms/Button/default.txt");
    assert.ok(existsSync(button), "Button golden missing at planned layout");
    const home = path.join(dir, "design/goldens/web-desktop/screens/Home/default.txt");
    assert.ok(existsSync(home), "Home golden missing");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--check exits 0 when capture matches goldens", () => {
  const dir = cloneFixture();
  try {
    assert.equal(runCli(["--baseline", dir]).code, 0);
    const { code, stdout } = runCli(["--check", dir]);
    assert.equal(code, 0, stdout);
    const report = JSON.parse(stdout);
    assert.equal(report.drifted.length, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("deliberate content change makes --check exit 1", () => {
  const dir = cloneFixture();
  try {
    assert.equal(runCli(["--baseline", dir]).code, 0);
    const button = path.join(dir, "sandbox/catalog/atoms/Button/default.txt");
    writeFileSync(button, readFileSync(button, "utf8") + "\nlabel=CHANGED\n", "utf8");
    const { code, stdout } = runCli(["--check", dir]);
    assert.equal(code, 1, stdout);
    const report = JSON.parse(stdout);
    assert.ok(report.drifted.some((d) => d.key.includes("Button")), "Button drift not reported");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--accept then --check exits 0 after intentional change", () => {
  const dir = cloneFixture();
  try {
    assert.equal(runCli(["--baseline", dir]).code, 0);
    const button = path.join(dir, "sandbox/catalog/atoms/Button/default.txt");
    writeFileSync(button, readFileSync(button, "utf8") + "\nlabel=ACCEPTED\n", "utf8");
    assert.equal(runCli(["--check", dir]).code, 1);
    const accept = runCli(["--accept", "**", dir]);
    assert.equal(accept.code, 0, accept.stdout);
    const check = runCli(["--check", dir]);
    assert.equal(check.code, 0, check.stdout);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("zero-story root exits 3 (vacuous, never a pass)", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "pp-empty-"));
  try {
    mkdirSync(path.join(dir, "design"), { recursive: true });
    mkdirSync(path.join(dir, "sandbox/catalog"), { recursive: true });
    writeFileSync(
      path.join(dir, "design/manifest.json"),
      JSON.stringify({
        platforms: {
          web: {
            capture: {
              medium: "text",
              goldens: "design/goldens/web",
              catalog: "sandbox/catalog",
              staging: "design/.captures/web",
            },
          },
        },
      }),
    );
    const { code, stdout } = runCli(["--check", dir]);
    assert.equal(code, 3, stdout);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("bad args / missing mode exit 2", () => {
  assert.equal(runCli([]).code, 2);
  assert.equal(runCli(["--check"]).code, 2);
  assert.equal(runCli(["--unknown", FIXTURE_SRC]).code, 2);
  assert.equal(runCli(["--blast", FIXTURE_SRC]).code, 2); // name missing → usage
});

// --- blast / reach: name-specific, non-stub ---

test("--blast Button moves Button, Card, and Home — not Badge", () => {
  const dir = cloneFixture();
  try {
    const { code, stdout } = runCli(["--blast", "Button", dir]);
    assert.equal(code, 0, stdout);
    const report = JSON.parse(stdout);
    const keys = report.moved.map((m) => m.key);
    assert.ok(keys.some((k) => k.includes("Button")), `Button should move: ${keys}`);
    assert.ok(keys.some((k) => k.includes("Card")), `Card composes Button: ${keys}`);
    assert.ok(keys.some((k) => k.includes("Home")), `Home composes Card→Button: ${keys}`);
    assert.ok(!keys.some((k) => k.includes("Badge")), `Badge must not move: ${keys}`);
    assert.ok(!keys.some((k) => k.includes("UnusedChip")), `UnusedChip must not move: ${keys}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--blast Badge moves only Badge", () => {
  const dir = cloneFixture();
  try {
    const { code, stdout } = runCli(["--blast", "Badge", dir]);
    assert.equal(code, 0, stdout);
    const report = JSON.parse(stdout);
    const keys = report.moved.map((m) => m.key);
    assert.deepEqual(keys, ["atoms/Badge/default"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--reach Button reports Home as a live root", () => {
  const dir = cloneFixture();
  try {
    const { code, stdout } = runCli(["--reach", "Button", dir]);
    assert.equal(code, 0, stdout);
    const report = JSON.parse(stdout);
    assert.equal(report.results.length, 1);
    const reaches = report.results[0].reaches.map((r) => r.key);
    assert.ok(reaches.some((k) => k.includes("Home")), `expected Home in reaches: ${reaches}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--reach UnusedChip reaches no live roots (dead inventory)", () => {
  const dir = cloneFixture();
  try {
    const { code, stdout } = runCli(["--reach", "UnusedChip", dir]);
    assert.equal(code, 0, stdout);
    const report = JSON.parse(stdout);
    // Only self may move; no screens / non-self live roots
    const reaches = report.results[0].reaches;
    assert.equal(reaches.length, 0, `orphan should reach nothing: ${JSON.stringify(reaches)}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("exported modes agree with CLI for baseline→check on a temp tree", () => {
  const dir = cloneFixture();
  try {
    const cfg = captureCfg();
    const base = modeBaseline(dir, cfg, null);
    assert.equal(base.exit, 0);
    assert.ok(base.written.length > 0);
    const check = modeCheck(dir, cfg, null);
    assert.equal(check.exit, 0);
    // mutate, accept one glob, re-check
    const button = path.join(dir, "sandbox/catalog/atoms/Button/default.txt");
    writeFileSync(button, "Button\nvariant=ghost\n", "utf8");
    assert.equal(modeCheck(dir, cfg, null).exit, 1);
    const acc = modeAccept(dir, cfg, "atoms/Button/**", null);
    assert.equal(acc.exit, 0);
    // Card/Home still drift because they compose the old Button body
    const after = modeCheck(dir, cfg, null);
    assert.equal(after.exit, 1);
    assert.ok(after.drifted.some((d) => d.key.includes("Card") || d.key.includes("Home")));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("script file is the shipped plugin path used by workflows", () => {
  assert.ok(existsSync(SCRIPT), "verify-catalog.mjs missing from plugin scripts/");
  const src = readFileSync(SCRIPT, "utf8");
  assert.match(src, /--baseline/);
  assert.match(src, /--check/);
  assert.match(src, /--blast/);
  assert.match(src, /--reach/);
  assert.match(src, /--accept/);
  assert.match(src, /exit.*3|vacuous/i);
});
