// --layer, --only, --out and the capture environment for verify-catalog.mjs.
// The pixel fixture renders through real headless Chrome; the probe project is a capture command
// that ignores its sources, so it proves what verify-catalog hands the command.

import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  PIXEL_FIXTURE,
  cloneFixture,
  removeDirs,
  runCli,
  scratchProject,
  writeIn,
  readIn,
  writeProbeProject,
} from "./helpers/catalog.mjs";

const GOLDENS = "design/goldens/web-desktop";
const STAGING = "design/.captures/web-desktop";

function pixelClone() {
  return cloneFixture(PIXEL_FIXTURE, "pp-scope-");
}

test("--layer with a capture command baselines only that layer; another layer's golden is untouched", () => {
  const dir = pixelClone();
  try {
    assert.equal(runCli(["--baseline", dir, "--platform", "web-desktop"]).code, 0);
    const cardBefore = readIn(dir, `${GOLDENS}/molecules/Card/default.dom`);
    writeIn(dir, "sandbox/stories/atoms/Button/default.html", "<button>Send</button>\n");
    writeIn(dir, "sandbox/stories/molecules/Card/default.html", "<section>Changed card</section>\n");

    // A changed golden is accepted, never baselined: --accept is the only write that moves one.
    const { code, stderr, report } = runCli(["--accept", "atoms/**", dir, "--platform", "web-desktop", "--layer", "atoms"]);
    assert.equal(code, 0, stderr);
    assert.ok(report.accepted.length > 0);
    assert.ok(report.accepted.every((rel) => rel.startsWith("atoms/")), JSON.stringify(report.accepted));
    assert.match(readIn(dir, `${GOLDENS}/atoms/Button/default.dom`), /Send/);
    assert.equal(readIn(dir, `${GOLDENS}/molecules/Card/default.dom`), cardBefore, "molecules golden must not move");

    // The unbaselined Card change is still drift, and only in the molecules layer.
    const drift = runCli(["--check", dir, "--platform", "web-desktop", "--layer", "molecules"]);
    assert.equal(drift.code, 1, drift.stderr);
    assert.deepEqual(drift.report.drifted.map((d) => d.key), ["molecules/Card/default"]);
  } finally {
    removeDirs(dir);
  }
});

test("the layer and single-story variables reach the command; the script restricts what it keeps", () => {
  const dir = writeProbeProject(scratchProject(), {});
  try {
    const { code, stderr, report } = runCli([
      "--render",
      dir,
      "--platform",
      "web-desktop",
      "--layer",
      "atoms",
      "--only",
      "atoms/Env",
      "--out",
      "design/.captures/render-env",
    ]);
    assert.equal(code, 0, stderr);
    assert.deepEqual(report.states.map((s) => s.key), ["atoms/Env/default"], "probe wrote four stories; only Env is kept");
    const text = readFileSync(report.states[0].structural, "utf8");
    assert.match(text, /layer=atoms/, "PIXEL_PERFECT_CAPTURE_LAYER must reach the command");
    assert.match(text, /only=atoms\/Env/, "PIXEL_PERFECT_CAPTURE_ONLY must reach the command");
  } finally {
    removeDirs(dir);
  }
});

test("--layer is not forwarded as a stale variable when it is not given", () => {
  const dir = writeProbeProject(scratchProject(), {});
  try {
    const { code, report } = runCli(["--render", dir, "--platform", "web-desktop", "--only", "atoms/Env", "--out", "design/.captures/render-env"]);
    assert.equal(code, 0);
    const text = readFileSync(report.states[0].structural, "utf8");
    assert.match(text, /layer=\n/, "no layer variable may leak in from the parent environment");
  } finally {
    removeDirs(dir);
  }
});

test("--only renders one story into --out and leaves the main staging folder intact", () => {
  const dir = pixelClone();
  try {
    assert.equal(runCli(["--baseline", dir, "--platform", "web-desktop"]).code, 0);
    const mainBefore = readdirSync(path.join(dir, STAGING), { recursive: true }).filter((f) => f.endsWith(".dom")).sort();
    assert.equal(mainBefore.length, 4);

    const { code, stderr, report } = runCli([
      "--render",
      dir,
      "--platform",
      "web-desktop",
      "--only",
      "atoms/Button",
      "--out",
      "design/.captures/render-button",
    ]);
    assert.equal(code, 0, stderr);
    assert.equal(report.states.length, 1);
    const renderDir = path.join(dir, "design/.captures/render-button");
    const rendered = readdirSync(renderDir, { recursive: true }).filter((f) => f.endsWith(".dom"));
    assert.deepEqual(rendered, [path.join("atoms", "Button", "default.dom")]);
    const mainAfter = readdirSync(path.join(dir, STAGING), { recursive: true }).filter((f) => f.endsWith(".dom")).sort();
    assert.deepEqual(mainAfter, mainBefore, "rendering one story must not wipe the main staging folder");
  } finally {
    removeDirs(dir);
  }
});

test("--out may be an absolute path outside the project", () => {
  const dir = pixelClone();
  const elsewhere = scratchProject("pp-render-out-");
  try {
    const { code, report } = runCli([
      "--render",
      dir,
      "--platform",
      "web-desktop",
      "--only",
      "atoms/Badge",
      "--out",
      elsewhere,
    ]);
    assert.equal(code, 0);
    assert.ok(report.states[0].structural.startsWith(elsewhere), report.states[0].structural);
    assert.ok(existsSync(report.states[0].png));
  } finally {
    removeDirs(dir, elsewhere);
  }
});

test("--out naming the project root is refused (exit 2) so a render cannot wipe the project", () => {
  const dir = pixelClone();
  try {
    const { code, stderr } = runCli(["--render", dir, "--platform", "web-desktop", "--out", "."]);
    assert.equal(code, 2);
    assert.match(stderr, /--out/);
    assert.ok(existsSync(path.join(dir, "sandbox/stories/atoms/Button/default.html")));
  } finally {
    removeDirs(dir);
  }
});

test("--only requires the layer/Name form", () => {
  const dir = pixelClone();
  try {
    const { code, stderr } = runCli(["--render", dir, "--platform", "web-desktop", "--only", "Button"]);
    assert.equal(code, 2);
    assert.match(stderr, /--only requires <layer>\/<Name>/);
  } finally {
    removeDirs(dir);
  }
});
