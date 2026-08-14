// Behavioral tests for design-md.mjs against the real shipped script
// and an in-repo fixture. lint/diff drive the pinned @google/design.md CLI
// via the script's spawn — this file does not reimplement lint or diff.

import assert from "node:assert/strict";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  DESIGNMD_BIN,
  DESIGNMD_PACKAGE,
  DESIGNMD_PIN,
  main,
} from "../plugins/pixel-perfect/scripts/design-md.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE_SRC = path.join(ROOT, "test/fixtures/polish-app");
const INIT = path.join(ROOT, "plugins/pixel-perfect/workflows/init.md");
const REFINE = path.join(ROOT, "plugins/pixel-perfect/workflows/refine.md");

function cloneFixture() {
  const dir = mkdtempSync(path.join(tmpdir(), "pp-design-md-"));
  cpSync(FIXTURE_SRC, dir, { recursive: true });
  return dir;
}

function runCli(args) {
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

test("pin uses the portable designmd bin, not the Windows-colliding design.md name", () => {
  assert.equal(DESIGNMD_PACKAGE, "@google/design.md");
  assert.equal(DESIGNMD_BIN, "designmd");
  assert.match(DESIGNMD_PIN, /@google\/design\.md@\d+\.\d+\.\d+/);
});

test("usage and missing project exit 2", () => {
  assert.equal(runCli([]).code, 2);
  assert.equal(runCli(["--lint"]).code, 2);
  assert.equal(runCli(["--bogus", ROOT]).code, 2);
  assert.equal(runCli(["--lint", path.join(tmpdir(), "pp-no-such-project")]).code, 2);
});

test("--lint without DESIGN.md exits 3 (vacuous)", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "pp-design-md-empty-"));
  try {
    const { code, stdout } = runCli(["--lint", dir]);
    assert.equal(code, 3, stdout);
    const report = JSON.parse(stdout);
    assert.equal(report.vacuous, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--generate without tokens exits 3 (vacuous)", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "pp-design-md-notokens-"));
  try {
    mkdirSync(path.join(dir, "design"), { recursive: true });
    writeFileSync(
      path.join(dir, "design/manifest.json"),
      JSON.stringify({ goal: "empty", platforms: {} }),
      "utf8",
    );
    const { code, stdout } = runCli(["--generate", dir]);
    assert.equal(code, 3, stdout);
    assert.equal(existsSync(path.join(dir, "DESIGN.md")), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--generate writes a project-root DESIGN.md that --lint reports 0 errors", () => {
  const dir = cloneFixture();
  try {
    const gen = runCli(["--generate", dir]);
    assert.equal(gen.code, 0, gen.stdout + gen.stderr);
    const dest = path.join(dir, "DESIGN.md");
    assert.ok(existsSync(dest), "DESIGN.md missing at project root");
    const md = readFileSync(dest, "utf8");
    assert.match(md, /^---\n/);
    assert.match(md, /\n## Do's and Don'ts\n/);
    assert.match(md, /ink-on-limestone/);
    assert.doesNotMatch(md, /\/Users\//);

    const lint = runCli(["--lint", dir]);
    assert.equal(lint.code, 0, lint.stdout + lint.stderr);
    const report = JSON.parse(lint.stdout);
    assert.ok(report.google?.summary, "lint must carry the real designmd summary");
    assert.equal(report.google.summary.errors, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("generate + lint run twice with consistent success", () => {
  const dir = cloneFixture();
  try {
    for (const pass of [1, 2]) {
      const gen = runCli(["--generate", dir]);
      assert.equal(gen.code, 0, `generate #${pass}: ${gen.stdout}`);
      const lint = runCli(["--lint", dir]);
      assert.equal(lint.code, 0, `lint #${pass}: ${lint.stdout}`);
      const report = JSON.parse(lint.stdout);
      assert.equal(report.google.summary.errors, 0);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a real token-source edit flips --diff regression and exits 1", () => {
  const dir = cloneFixture();
  try {
    assert.equal(runCli(["--generate", dir]).code, 0);
    assert.equal(runCli(["--lint", dir]).code, 0);

    const tokenPath = path.join(dir, "design/system/tokens/theme.light.json");
    const tokens = JSON.parse(readFileSync(tokenPath, "utf8"));
    tokens.accent.primary = "#EEEEEE";
    tokens.accent["primary-fg"] = "#F7F5F2";
    writeFileSync(tokenPath, JSON.stringify(tokens, null, 2) + "\n", "utf8");

    const gen2 = runCli(["--generate", dir]);
    assert.equal(gen2.code, 0, gen2.stdout);
    assert.ok(existsSync(path.join(dir, "design/.design-md.previous.md")));

    const diff = runCli(["--diff", dir]);
    assert.equal(diff.code, 1, diff.stdout + diff.stderr);
    const report = JSON.parse(diff.stdout);
    assert.equal(report.regression, true);
    assert.ok(existsSync(path.join(dir, "design/design-md-diff.json")), "drift receipt missing");
    const receipt = JSON.parse(readFileSync(path.join(dir, "design/design-md-diff.json"), "utf8"));
    assert.equal(receipt.regression, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("init and refine regenerate DESIGN.md after token/theme changes and keep a --diff receipt", () => {
  const init = readFileSync(INIT, "utf8");
  const refine = readFileSync(REFINE, "utf8");
  assert.match(init, /design-md\.mjs --generate/);
  assert.match(init, /design-md\.mjs --diff/);
  assert.match(refine, /design-md\.mjs --generate/);
  assert.match(refine, /design-md\.mjs --diff/);
  assert.match(refine, /design-md-diff\.json|drift receipt/);
});
