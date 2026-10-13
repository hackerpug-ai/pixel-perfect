// Pixel evidence, empty and duplicate captures, and --render for verify-catalog.mjs.
// Every render goes through real headless Chrome (test/fixtures/pixel-web). The only
// hand-built bytes are a palette PNG, which exists to prove the decoder declines a format.

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { buildPng, inkImage, sampleBytes } from "./helpers/png.mjs";
import {
  CATALOG_FIXTURE,
  PIXEL_FIXTURE,
  cloneFixture,
  editManifest,
  removeDirs,
  runCli,
  scratchProject,
  writeCatalogProject,
  writeIn,
  readIn,
} from "./helpers/catalog.mjs";

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const GOLDENS = "design/goldens/web-desktop";
const STAGING = "design/.captures/web-desktop";

function pixelClone() {
  return cloneFixture(PIXEL_FIXTURE, "pp-pixel-");
}

function isPng(bytes) {
  return PNG_SIGNATURE.every((b, i) => bytes[i] === b);
}

function violationsOf(report, kind) {
  return (report?.violations || []).filter((v) => v.kind === kind);
}

// --- A: pixels are required and must be a real, non-blank image ---

test("full pixel path: baseline writes a DOM golden per story; PNGs are evidence, not goldens", () => {
  const dir = pixelClone();
  try {
    const { code, stderr, report } = runCli(["--baseline", dir, "--platform", "web-desktop"]);
    assert.equal(code, 0, stderr);
    assert.equal(report.pixels, "required");
    assert.deepEqual(report.violations, []);
    assert.ok(report.written.includes("atoms/Button/default.dom"), JSON.stringify(report.written));
    // the staged PNG is a real Chrome render, not a copied placeholder
    const png = readFileSync(path.join(dir, STAGING, "atoms/Button/default.png"));
    assert.ok(isPng(png), "staged Button PNG must carry the PNG signature");
    assert.equal(png.readUInt32BE(16), 390, "Button renders at the declared 390px viewport");
    // the DOM golden is the rendered story root, not a wrapper
    assert.match(readIn(dir, `${GOLDENS}/atoms/Button/default.dom`), />Save</);
    // PNGs stay out of goldens
    assert.equal(existsSync(path.join(dir, GOLDENS, "atoms/Button/default.png")), false);
  } finally {
    removeDirs(dir);
  }
});

test("missing PNG sibling is a violation that names the story and writes no goldens", () => {
  const dir = writeCatalogProject(scratchProject(), { "atoms/Badge/default.txt": "Badge\ntone=info\n" });
  try {
    const { code, stderr, report } = runCli(["--baseline", dir, "--platform", "web-desktop"]);
    assert.equal(code, 1, stderr);
    const missing = violationsOf(report, "missing-png");
    assert.deepEqual(missing.map((v) => v.key), ["atoms/Badge/default"]);
    assert.match(stderr, /atoms\/Badge\/default/);
    assert.equal(existsSync(path.join(dir, GOLDENS)), false, "a violating capture must write no goldens");
  } finally {
    removeDirs(dir);
  }
});

test("a file named .png that is not a PNG is an invalid-png violation", () => {
  const dir = writeCatalogProject(scratchProject(), {
    "atoms/Badge/default.txt": "Badge\ntone=info\n",
    "atoms/Badge/default.png": "this is text, not an image\n",
  });
  try {
    const { code, report } = runCli(["--baseline", dir, "--platform", "web-desktop"]);
    assert.equal(code, 1);
    assert.deepEqual(violationsOf(report, "invalid-png").map((v) => v.key), ["atoms/Badge/default"]);
  } finally {
    removeDirs(dir);
  }
});

test("a blank PNG from a really rendered blank page is a blank-png violation", () => {
  const dir = pixelClone();
  try {
    writeIn(dir, "sandbox/stories/atoms/Blank/default.html", '<div style="height:20px;color:#fff"> </div>\n');
    const { code, report } = runCli(["--baseline", dir, "--platform", "web-desktop"]);
    assert.equal(code, 1);
    assert.deepEqual(violationsOf(report, "blank-png").map((v) => v.key), ["atoms/Blank/default"]);
    assert.equal(existsSync(path.join(dir, GOLDENS)), false);
  } finally {
    removeDirs(dir);
  }
});

test("a render wider than the declared viewport is a violation (the 559px-at-390px case)", () => {
  const dir = pixelClone();
  try {
    writeIn(dir, "sandbox/stories/atoms/Wide/default.html", '<div style="width:559px;height:40px;background:#f00"></div>\n');
    const { code, report } = runCli(["--baseline", dir, "--platform", "web-desktop"]);
    assert.equal(code, 1);
    const wide = violationsOf(report, "wider-than-viewport");
    assert.deepEqual(wide.map((v) => v.key), ["atoms/Wide/default"]);
    assert.equal(wide[0].width, 559);
    assert.equal(wide[0].limit, 390);
  } finally {
    removeDirs(dir);
  }
});

test("manifest scale widens the allowed render: 559px fails at scale 1 and passes at scale 2", () => {
  const dir = pixelClone();
  try {
    writeIn(dir, "sandbox/stories/atoms/Wide/default.html", '<div style="width:559px;height:40px;background:#f00"></div>\n');
    editManifest(dir, (m) => {
      m.platforms["web-desktop"].capture.viewport = "300x300";
    });
    const narrow = runCli(["--baseline", dir, "--platform", "web-desktop"]);
    assert.equal(narrow.code, 1, "559px is wider than 300px at scale 1");
    // Home is also wider than 300px at this viewport, so the check names every violator, Wide among them.
    assert.ok(violationsOf(narrow.report, "wider-than-viewport").some((v) => v.key === "atoms/Wide/default"));

    editManifest(dir, (m) => {
      m.platforms["web-desktop"].capture.scale = 2;
    });
    const { code, stderr, report } = runCli(["--baseline", dir, "--platform", "web-desktop"]);
    assert.equal(code, 0, stderr + JSON.stringify(report?.violations));
  } finally {
    removeDirs(dir);
  }
});

test("pixels none with a reason turns the PNG requirement off and says so in the report", () => {
  const dir = cloneFixture(CATALOG_FIXTURE, "pp-none-");
  try {
    const { code, stderr, report } = runCli(["--baseline", dir, "--platform", "web-desktop"]);
    assert.equal(code, 0, stderr);
    assert.equal(report.pixels, "none");
    assert.match(report.pixelsReason, /Structural text fixture/);
    assert.ok(existsSync(path.join(dir, GOLDENS, "atoms/Button/default.txt")));
  } finally {
    removeDirs(dir);
  }
});

test("pixels none without a reason is a config error (exit 2)", () => {
  const dir = cloneFixture(CATALOG_FIXTURE, "pp-none-");
  try {
    editManifest(dir, (m) => {
      delete m.platforms["web-desktop"].capture.pixels_reason;
    });
    const { code, stderr } = runCli(["--baseline", dir, "--platform", "web-desktop"]);
    assert.equal(code, 2);
    assert.match(stderr, /pixels_reason/);
  } finally {
    removeDirs(dir);
  }
});

test("an unknown pixels value is a config error (exit 2), never a silent pass", () => {
  const dir = cloneFixture(CATALOG_FIXTURE, "pp-none-");
  try {
    editManifest(dir, (m) => {
      m.platforms["web-desktop"].capture.pixels = "sometimes";
    });
    assert.equal(runCli(["--baseline", dir, "--platform", "web-desktop"]).code, 2);
  } finally {
    removeDirs(dir);
  }
});

test("an interlaced PNG is an undecodable-png violation that says how to fix it", () => {
  const dir = writeCatalogProject(scratchProject(), { "atoms/Badge/default.txt": "Badge\ntone=info\n" });
  try {
    writeIn(dir, "sandbox/catalog/atoms/Badge/default.png", buildPng({ width: 16, height: 16, colorType: 2, samples: sampleBytes(16 * 16 * 3, 21), interlace: 1 }));
    const { code, stderr, report } = runCli(["--baseline", dir, "--platform", "web-desktop"]);
    assert.equal(code, 1, stderr);
    const [v] = violationsOf(report, "undecodable-png");
    assert.equal(v.key, "atoms/Badge/default");
    assert.match(v.reason, /cannot verify this image; write a non-interlaced 8- or 16-bit PNG/);
    assert.equal(existsSync(path.join(dir, GOLDENS)), false);
  } finally {
    removeDirs(dir);
  }
});

test("a one-pixel-different image is a blank-png violation: the render shows almost nothing", () => {
  const dir = writeCatalogProject(scratchProject(), { "atoms/Badge/default.txt": "Badge\ntone=info\n" }, { viewport: "16x16" });
  try {
    writeIn(dir, "sandbox/catalog/atoms/Badge/default.png", inkImage({ width: 16, height: 16, inkCount: 1 }));
    const { code, report } = runCli(["--baseline", dir, "--platform", "web-desktop"]);
    assert.equal(code, 1);
    const [v] = violationsOf(report, "blank-png");
    assert.equal(v.key, "atoms/Badge/default");
    assert.match(v.reason, /render shows almost nothing/);
  } finally {
    removeDirs(dir);
  }
});

test("a 4x4 image is a blank-png violation even when it has ink", () => {
  const dir = writeCatalogProject(scratchProject(), { "atoms/Badge/default.txt": "Badge\ntone=info\n" }, { viewport: "16x16" });
  try {
    writeIn(dir, "sandbox/catalog/atoms/Badge/default.png", inkImage({ width: 4, height: 4, inkCount: 16 }));
    const { code, report } = runCli(["--baseline", dir, "--platform", "web-desktop"]);
    assert.equal(code, 1);
    assert.deepEqual(violationsOf(report, "blank-png").map((v) => v.key), ["atoms/Badge/default"]);
  } finally {
    removeDirs(dir);
  }
});

// --- B: empty and duplicate captures ---

test("a whitespace-only structural capture is an empty-capture violation", () => {
  const dir = pixelClone();
  try {
    writeIn(dir, "sandbox/stories/atoms/Empty/default.html", "   \n   \n");
    const { code, report } = runCli(["--baseline", dir, "--platform", "web-desktop"]);
    assert.equal(code, 1);
    assert.deepEqual(violationsOf(report, "empty-capture").map((v) => v.key), ["atoms/Empty/default"]);
  } finally {
    removeDirs(dir);
  }
});

test("identical bodies for two different components fail, and every member is listed", () => {
  const dir = pixelClone();
  try {
    // Chip renders exactly what Badge renders: the wrapper-only signature in miniature.
    const badge = readFileSync(path.join(dir, "sandbox/stories/atoms/Badge/default.html"), "utf8");
    writeIn(dir, "sandbox/stories/atoms/Chip/default.html", badge);
    const { code, report } = runCli(["--baseline", dir, "--platform", "web-desktop"]);
    assert.equal(code, 1);
    const groups = violationsOf(report, "cross-component-duplicate");
    assert.equal(groups.length, 1, JSON.stringify(report.violations));
    assert.deepEqual([...groups[0].keys].sort(), ["atoms/Badge/default", "atoms/Chip/default"]);
    assert.equal(existsSync(path.join(dir, GOLDENS)), false);
  } finally {
    removeDirs(dir);
  }
});

test("identical bodies across states of one component are reported as duplicates, not failures", () => {
  const dir = pixelClone();
  try {
    const button = readFileSync(path.join(dir, "sandbox/stories/atoms/Button/default.html"), "utf8");
    writeIn(dir, "sandbox/stories/atoms/Button/hover.html", button);
    const { code, stderr, report } = runCli(["--baseline", dir, "--platform", "web-desktop"]);
    assert.equal(code, 0, stderr);
    assert.deepEqual(violationsOf(report, "cross-component-duplicate"), []);
    const group = report.duplicates.find((d) => d.keys.includes("atoms/Button/hover"));
    assert.ok(group, JSON.stringify(report.duplicates));
    assert.deepEqual([...group.keys].sort(), ["atoms/Button/default", "atoms/Button/hover"]);
  } finally {
    removeDirs(dir);
  }
});

test("identicalAcrossPlatforms reports how many golden keys match byte-for-byte between platforms", () => {
  const dir = pixelClone();
  try {
    editManifest(dir, (m) => {
      const mobile = structuredClone(m.platforms["web-desktop"]);
      mobile.capture.goldens = "design/goldens/web-mobile";
      mobile.capture.staging = "design/.captures/web-mobile";
      m.platforms["web-mobile"] = mobile;
    });
    assert.equal(runCli(["--baseline", dir, "--platform", "web-desktop"]).code, 0);
    assert.equal(runCli(["--baseline", dir, "--platform", "web-mobile"]).code, 0);
    const { code, report } = runCli(["--check", dir, "--platform", "web-desktop"]);
    assert.equal(code, 0);
    const pair = report.identicalAcrossPlatforms.find((p) => [p.a, p.b].sort().join(",") === "web-desktop,web-mobile");
    assert.ok(pair, JSON.stringify(report.identicalAcrossPlatforms));
    assert.equal(pair.shared, 4);
    assert.equal(pair.identical, 4);
  } finally {
    removeDirs(dir);
  }
});

test("--accept writes nothing when a capture violation blocks it", () => {
  const dir = pixelClone();
  try {
    assert.equal(runCli(["--baseline", dir, "--platform", "web-desktop"]).code, 0);
    const before = readIn(dir, `${GOLDENS}/atoms/Button/default.dom`);
    writeIn(dir, "sandbox/stories/atoms/Blank/default.html", '<div style="height:20px;color:#fff"> </div>\n');
    writeIn(dir, "sandbox/stories/atoms/Button/default.html", "<button>Changed</button>\n");
    const { code, report } = runCli(["--accept", "atoms/Button/**", dir, "--platform", "web-desktop"]);
    assert.equal(code, 1);
    assert.equal(violationsOf(report, "blank-png").length, 1);
    assert.equal(readIn(dir, `${GOLDENS}/atoms/Button/default.dom`), before, "a blocked accept must not move the golden");
  } finally {
    removeDirs(dir);
  }
});

// --- --render: capture, pixel checks, no goldens, print the artifact paths ---

test("--render --only writes no goldens and prints the structural and PNG path per state", () => {
  const dir = pixelClone();
  try {
    const { code, stderr, report } = runCli([
      "--render",
      dir,
      "--platform",
      "web-desktop",
      "--only",
      "atoms/Button",
      "--out",
      "design/.render/button",
    ]);
    assert.equal(code, 0, stderr);
    assert.equal(report.mode, "render");
    assert.equal(report.states.length, 1);
    const [state] = report.states;
    assert.equal(state.key, "atoms/Button/default");
    assert.ok(existsSync(state.structural), `structural artifact missing: ${state.structural}`);
    assert.ok(isPng(readFileSync(state.png)), "PNG path must point at a real image");
    assert.equal(state.status, "ok");
    assert.equal(existsSync(path.join(dir, GOLDENS)), false, "render must write no goldens");
  } finally {
    removeDirs(dir);
  }
});

test("--render exits 1 when a state's PNG is blank", () => {
  const dir = pixelClone();
  try {
    writeIn(dir, "sandbox/stories/atoms/Blank/default.html", '<div style="height:20px;color:#fff"> </div>\n');
    const { code, report } = runCli(["--render", dir, "--platform", "web-desktop", "--only", "atoms/Blank"]);
    assert.equal(code, 1);
    assert.equal(report.states[0].status, "blank-png");
  } finally {
    removeDirs(dir);
  }
});

test("--render for a pixels-none platform writes no PNG requirement and exits 0", () => {
  const dir = cloneFixture(CATALOG_FIXTURE, "pp-none-");
  try {
    const { code, report } = runCli(["--render", dir, "--platform", "web-desktop", "--only", "atoms/Badge"]);
    assert.equal(code, 0);
    assert.equal(report.states[0].png, null);
    assert.equal(report.states[0].status, "not-required");
  } finally {
    removeDirs(dir);
  }
});
