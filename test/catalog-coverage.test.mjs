// Coverage of what was built: every manifest item that is not pending needs a captured story, in
// every layer, and a pixel-requiring platform must declare its viewport.

import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { PIXEL_FIXTURE, cloneFixture, editManifest, removeDirs, runCli } from "./helpers/catalog.mjs";

function pixelClone() {
  return cloneFixture(PIXEL_FIXTURE, "pp-coverage-");
}

test("a built screen with no captured story fails baseline (screens are covered too)", () => {
  const dir = pixelClone();
  try {
    rmSync(path.join(dir, "sandbox/stories/screens"), { recursive: true });
    const { code, report, stderr } = runCli(["--baseline", dir, "--platform", "web-desktop"]);
    assert.equal(code, 1, stderr);
    assert.deepEqual(
      report.violations.filter((v) => v.kind === "uncaptured-item").map((v) => [v.key, v.reason]),
      [["screens/Home", "no story captured for screens/Home"]],
    );
  } finally {
    removeDirs(dir);
  }
});

test("a built item with no captured story fails check, with or without --layer", () => {
  const dir = pixelClone();
  try {
    assert.equal(runCli(["--baseline", dir, "--platform", "web-desktop"]).code, 0);
    // Badge is composed by nothing, so removing its story leaves the capture itself intact.
    rmSync(path.join(dir, "sandbox/stories/atoms/Badge"), { recursive: true });
    const whole = runCli(["--check", dir, "--platform", "web-desktop"]);
    assert.equal(whole.code, 1, whole.stderr);
    assert.ok(whole.report.violations.some((v) => v.kind === "uncaptured-item" && v.key === "atoms/Badge"));
    const layer = runCli(["--check", dir, "--platform", "web-desktop", "--layer", "atoms"]);
    assert.equal(layer.code, 1);
    assert.ok(layer.report.violations.some((v) => v.kind === "uncaptured-item" && v.key === "atoms/Badge"));
  } finally {
    removeDirs(dir);
  }
});

test("a pending item with no story is not a violation", () => {
  const dir = pixelClone();
  try {
    editManifest(dir, (m) => {
      const home = m.platforms["web-desktop"].screens.find((e) => e.name === "Home");
      home.status = "pending";
    });
    rmSync(path.join(dir, "sandbox/stories/screens"), { recursive: true });
    const { code, stderr } = runCli(["--baseline", dir, "--platform", "web-desktop"]);
    assert.equal(code, 0, stderr);
  } finally {
    removeDirs(dir);
  }
});

test("an item with no status counts as built", () => {
  const dir = pixelClone();
  try {
    editManifest(dir, (m) => {
      const home = m.platforms["web-desktop"].screens.find((e) => e.name === "Home");
      delete home.status;
    });
    rmSync(path.join(dir, "sandbox/stories/screens"), { recursive: true });
    const { code, report } = runCli(["--baseline", dir, "--platform", "web-desktop"]);
    assert.equal(code, 1);
    assert.ok(report.violations.some((v) => v.key === "screens/Home"));
  } finally {
    removeDirs(dir);
  }
});

test("a layer-restricted baseline checks only its layer's items", () => {
  const dir = pixelClone();
  try {
    rmSync(path.join(dir, "sandbox/stories/screens"), { recursive: true });
    const { code, stderr } = runCli(["--baseline", dir, "--platform", "web-desktop", "--layer", "atoms"]);
    assert.equal(code, 0, stderr);
  } finally {
    removeDirs(dir);
  }
});

test("a pixel-requiring platform without capture.viewport is exit 2 with the fix named", () => {
  const dir = pixelClone();
  try {
    editManifest(dir, (m) => {
      delete m.platforms["web-desktop"].capture.viewport;
    });
    const { code, stderr } = runCli(["--baseline", dir, "--platform", "web-desktop"]);
    assert.equal(code, 2, stderr);
    assert.match(stderr, /declare platforms\.web-desktop\.capture\.viewport, for example "390x844"/);
  } finally {
    removeDirs(dir);
  }
});
