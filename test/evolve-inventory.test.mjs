// Evolve add + remove (orphan sweep) with E6 prove assertions.
// E4 confirm stays workflow-required (static); apply/prove drive real scripts.

import assert from "node:assert/strict";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  applyAddition,
  applyDeprecation,
  applyRemoval,
  detectDeprecatedComposition,
  proveAddition,
  proveRemoval,
  snapshotGoldenHashes,
  modeBaseline,
  modeCheck,
  resolveCaptureConfig,
  resolvePlatform,
  loadManifest,
} from "../plugins/pixel-perfect/scripts/evolve-lib.mjs";
import { main } from "../plugins/pixel-perfect/scripts/verify-catalog.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE = path.join(ROOT, "test/fixtures/consumer-web");
const EVOLVE_WF = path.join(ROOT, "plugins/pixel-perfect/workflows/evolve.md");

function clone() {
  const dir = mkdtempSync(path.join(tmpdir(), "pp-evolve-"));
  cpSync(FIXTURE, dir, { recursive: true });
  for (const p of ["design/.captures", "design/goldens"]) {
    const full = path.join(dir, p);
    if (existsSync(full)) rmSync(full, { recursive: true, force: true });
  }
  return dir;
}

function cfg(dir) {
  const m = loadManifest(dir);
  const { id, config } = resolvePlatform(m, "web-desktop");
  return { id, config, capture: resolveCaptureConfig(config, id) };
}

test("evolve workflow requires E4 confirm-before-write and E6 prove matrix", () => {
  const wf = readFileSync(EVOLVE_WF, "utf8");
  assert.match(wf, /### E4 — CONFIRM/);
  assert.match(wf, /Nothing is written, installed, or deleted before this gate/);
  assert.match(wf, /### E6 — PROVE/);
  assert.match(wf, /Every pre-existing golden is unchanged/);
  assert.match(wf, /no remaining story moved/i);
  assert.match(wf, /--deprecate/);
});

test("evolve add: new entity goldens appear; prior goldens undisturbed", () => {
  const dir = clone();
  try {
    const { capture } = cfg(dir);
    assert.equal(modeBaseline(dir, capture, null).exit, 0);
    const prior = snapshotGoldenHashes(dir, "web-desktop");
    assert.ok(Object.keys(prior).length >= 4);

    applyAddition(dir, "web-desktop", {
      layer: "atoms",
      name: "ProgressDot",
      body: "ProgressDot\nsize=sm\n",
    });

    const proved = proveAddition(dir, "web-desktop", ["ProgressDot"], prior);
    assert.equal(proved.ok, true, JSON.stringify(proved, null, 2));
    assert.equal(proved.disturbed.length, 0);
    assert.equal(proved.missingNew.length, 0);
    assert.ok(existsSync(path.join(dir, "design/goldens/web-desktop/atoms/ProgressDot/default.txt")));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("evolve remove + orphan sweep: removed gone; remaining goldens unchanged", () => {
  const dir = clone();
  try {
    const { capture } = cfg(dir);
    assert.equal(modeBaseline(dir, capture, null).exit, 0);
    const all = snapshotGoldenHashes(dir, "web-desktop");

    // Remove Home screen + UnusedChip (orphan). Keep Button/Badge/Card.
    const removeSet = ["Home", "UnusedChip"];
    const remaining = Object.fromEntries(
      Object.entries(all).filter(([k]) => !removeSet.some((n) => k.includes(`/${n}/`))),
    );

    applyRemoval(dir, "web-desktop", removeSet);
    const proved = proveRemoval(dir, "web-desktop", removeSet, remaining);
    assert.equal(proved.stillPresent.length, 0, JSON.stringify(proved.stillPresent));
    assert.equal(proved.moved.length, 0, JSON.stringify(proved.moved));
    assert.equal(proved.ok, true, JSON.stringify(proved, null, 2));

    const m = loadManifest(dir);
    const names = (k) => (m.platforms["web-desktop"][k] || []).map((e) => e.name);
    assert.ok(!names("screens").includes("Home"));
    assert.ok(!names("atoms").includes("UnusedChip"));
    assert.ok(names("atoms").includes("Button"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("deprecate writes deprecations, badges story, and check fails on composition", () => {
  const dir = clone();
  try {
    const { capture } = cfg(dir);
    assert.equal(modeBaseline(dir, capture, null).exit, 0);

    const result = applyDeprecation(dir, "web-desktop", "Button", {
      replacement: "PrimaryButton",
      reason: "Rename for clarity",
    });
    assert.ok(result.deprecation.replacement === "PrimaryButton");
    const m = loadManifest(dir);
    assert.ok(m.platforms["web-desktop"].deprecations.Button);

    // Story badge
    const story = readFileSync(path.join(dir, "sandbox/stories/atoms/Button/default.txt"), "utf8");
    assert.match(story, /\[deprecated\]/);

    // Card still composes Button → gate violation
    const hits = detectDeprecatedComposition(dir, "web-desktop");
    assert.ok(hits.violations.some((v) => v.deprecated === "Button"), JSON.stringify(hits));

    // CLI --check must exit 1 with deprecatedUsage
    let stdout = "";
    const po = process.stdout.write;
    const pe = process.stderr.write;
    process.stdout.write = (c) => {
      stdout += c;
      return true;
    };
    process.stderr.write = () => true;
    let code;
    try {
      code = main(["--check", dir, "--platform", "web-desktop"]);
    } finally {
      process.stdout.write = po;
      process.stderr.write = pe;
    }
    assert.equal(code, 1, stdout);
    const report = JSON.parse(stdout);
    assert.ok(report.deprecatedUsage?.length > 0, stdout);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
