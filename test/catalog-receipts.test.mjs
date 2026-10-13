// Golden receipts: --baseline and --accept record what wrote each golden; --check refuses goldens
// that no mode wrote; --audit reads goldens and sources without running a capture.

import assert from "node:assert/strict";
import { existsSync, readFileSync, rmSync, writeFileSync, copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { digest } from "../plugins/pixel-perfect/scripts/reference-revisions.mjs";
import {
  auditGoldens,
  captureAndGate,
  fingerprint,
  loadManifest,
  planGoldens,
  resolveCaptureConfig,
  resolvePlatform,
  writeReceipts,
} from "../plugins/pixel-perfect/scripts/verify-catalog.mjs";
import {
  PIXEL_FIXTURE,
  cloneFixture,
  editManifest,
  readIn,
  removeDirs,
  runCli,
  writeIn,
} from "./helpers/catalog.mjs";

const GOLDENS = "design/goldens/web-desktop";
const RECEIPT = `${GOLDENS}/receipt.json`;

function pixelClone() {
  return cloneFixture(PIXEL_FIXTURE, "pp-receipt-");
}

function receiptOf(dir) {
  return JSON.parse(readIn(dir, RECEIPT));
}

function baselineOk(dir) {
  const r = runCli(["--baseline", dir, "--platform", "web-desktop"]);
  assert.equal(r.code, 0, r.stderr);
  return r;
}

test("--baseline writes receipt.json with version, platform, hash, ext and mode, and no timestamps", () => {
  const dir = pixelClone();
  try {
    baselineOk(dir);
    const raw = readIn(dir, RECEIPT);
    assert.doesNotMatch(raw, /\d{4}-\d{2}-\d{2}T/, "receipts must not carry timestamps");
    const receipt = JSON.parse(raw);
    assert.equal(receipt.version, 1);
    assert.equal(receipt.platform, "web-desktop");
    const entry = receipt.goldens["atoms/Button/default"];
    assert.equal(entry.ext, ".dom");
    assert.equal(entry.mode, "baseline");
    assert.match(entry.hash, /^[0-9a-f]{16}$/);
    assert.equal(entry.hash, fingerprint(readIn(dir, `${GOLDENS}/atoms/Button/default.dom`)), "receipt hash must be the golden's hash");
    assert.equal(entry.source, undefined, "no source is recorded when the manifest names none");
  } finally {
    removeDirs(dir);
  }
});

test("receipt source is filled from the manifest item's file and story, hashed with the reference digest", () => {
  const dir = pixelClone();
  try {
    writeIn(dir, "src/Button.tsx", "export const Button = () => null;\n");
    editManifest(dir, (m) => {
      const button = m.platforms["web-desktop"].atoms.find((e) => e.name === "Button");
      button.file = "src/Button.tsx";
      button.story = "sandbox/stories/atoms/Button/default.html";
    });
    baselineOk(dir);
    const entry = receiptOf(dir).goldens["atoms/Button/default"];
    assert.deepEqual(Object.keys(entry.source).sort(), ["file", "fileHash", "story", "storyHash"]);
    assert.equal(entry.source.file, "src/Button.tsx");
    assert.equal(entry.source.fileHash, digest(readFileSync(path.join(dir, "src/Button.tsx"))));
    assert.equal(entry.source.storyHash, digest(readFileSync(path.join(dir, "sandbox/stories/atoms/Button/default.html"))));
    assert.equal(receiptOf(dir).goldens["atoms/Badge/default"].source, undefined);
  } finally {
    removeDirs(dir);
  }
});

test("a manifest source path that does not exist blocks the baseline (exit 2) and writes no goldens", () => {
  const dir = pixelClone();
  try {
    editManifest(dir, (m) => {
      m.platforms["web-desktop"].atoms.find((e) => e.name === "Button").file = "src/Missing.tsx";
    });
    const { code, stderr } = runCli(["--baseline", dir, "--platform", "web-desktop"]);
    assert.equal(code, 2, stderr);
    assert.match(stderr, /src\/Missing\.tsx/);
    assert.equal(existsSync(path.join(dir, GOLDENS)), false, "no golden may move when its receipt cannot be written");
  } finally {
    removeDirs(dir);
  }
});

test("--accept writes its receipt entries with mode accept", () => {
  const dir = pixelClone();
  try {
    baselineOk(dir);
    writeIn(dir, "sandbox/stories/atoms/Button/default.html", "<button>Accepted</button>\n");
    // Card and Home compose Button, so their captures move too: accept the whole catalog.
    const r = runCli(["--accept", "**", dir, "--platform", "web-desktop"]);
    assert.equal(r.code, 0, r.stderr);
    const entry = receiptOf(dir).goldens["atoms/Button/default"];
    assert.equal(entry.mode, "accept");
    assert.equal(entry.hash, fingerprint(readIn(dir, `${GOLDENS}/atoms/Button/default.dom`)));
    assert.equal(runCli(["--check", dir, "--platform", "web-desktop"]).code, 0);
  } finally {
    removeDirs(dir);
  }
});

test("a golden copied in by hand is rejected by --check as unreceipted", () => {
  const dir = pixelClone();
  try {
    baselineOk(dir);
    mkdirSync(path.join(dir, GOLDENS, "atoms/Ghost"), { recursive: true });
    copyFileSync(path.join(dir, GOLDENS, "atoms/Button/default.dom"), path.join(dir, GOLDENS, "atoms/Ghost/default.dom"));
    const { code, report, stderr } = runCli(["--check", dir, "--platform", "web-desktop"]);
    assert.equal(code, 1, stderr);
    const hit = report.unreceipted.find((u) => u.key === "atoms/Ghost/default");
    assert.ok(hit, JSON.stringify(report.unreceipted));
    assert.equal(hit.reason, "golden was not written by --baseline or --accept");
    assert.match(stderr, /golden was not written by --baseline or --accept/);
  } finally {
    removeDirs(dir);
  }
});

test("a golden edited by hand after its receipt is unreceipted", () => {
  const dir = pixelClone();
  try {
    baselineOk(dir);
    writeFileSync(path.join(dir, GOLDENS, "atoms/Badge/default.dom"), "<span>hand edited</span>\n", "utf8");
    const { code, report } = runCli(["--check", dir, "--platform", "web-desktop"]);
    assert.equal(code, 1);
    assert.deepEqual(report.unreceipted.map((u) => u.key), ["atoms/Badge/default"]);
  } finally {
    removeDirs(dir);
  }
});

test("goldens with no receipt.json fail --check and name the fix", () => {
  const dir = pixelClone();
  try {
    baselineOk(dir);
    rmSync(path.join(dir, RECEIPT));
    const { code, report, stderr } = runCli(["--check", dir, "--platform", "web-desktop"]);
    assert.equal(code, 1, stderr);
    assert.equal(report.receiptMissing, true);
    assert.match(report.message, /receipt\.json/);
    assert.match(report.message, /run --baseline to stamp goldens that match and add new ones/);
    assert.match(report.message, /changed goldens need --accept <glob>/);
  } finally {
    removeDirs(dir);
  }
});

test("a layer-restricted baseline updates only its layer's receipt entries and keeps the rest", () => {
  const dir = pixelClone();
  try {
    baselineOk(dir);
    const before = receiptOf(dir).goldens;
    writeIn(dir, "sandbox/stories/atoms/Button/default.html", "<button>Moved</button>\n");
    writeIn(dir, "sandbox/stories/molecules/Card/default.html", "<section>Card moved</section>\n");
    const r = runCli(["--accept", "atoms/Button/**", dir, "--platform", "web-desktop", "--layer", "atoms"]);
    assert.equal(r.code, 0, r.stderr);
    const after = receiptOf(dir).goldens;
    assert.deepEqual(after["molecules/Card/default"], before["molecules/Card/default"], "molecules receipt entry must be kept");
    assert.notEqual(after["atoms/Button/default"].hash, before["atoms/Button/default"].hash, "atoms receipt entry must be updated");
    assert.deepEqual(after["atoms/Badge/default"], before["atoms/Badge/default"], "an atoms entry that was not re-captured changes nothing");
  } finally {
    removeDirs(dir);
  }
});

// --- --audit: reads goldens and sources; runs no capture ---

test("--audit on a clean receipted baseline exits 0", () => {
  const dir = pixelClone();
  try {
    baselineOk(dir);
    const { code, report } = runCli(["--audit", dir, "--platform", "web-desktop"]);
    assert.equal(code, 0, JSON.stringify(report));
    assert.deepEqual(report.unreceipted, []);
    assert.deepEqual(report.empty, []);
    assert.deepEqual(report.crossComponentDuplicates, []);
    assert.deepEqual(report.staleSources, []);
  } finally {
    removeDirs(dir);
  }
});

test("--audit names an unreceipted golden, an empty golden, a cross-component duplicate and a source edited after baseline, with the capture command broken", () => {
  const dir = pixelClone();
  try {
    writeIn(dir, "src/Button.tsx", "export const Button = 1;\n");
    editManifest(dir, (m) => {
      const button = m.platforms["web-desktop"].atoms.find((e) => e.name === "Button");
      button.file = "src/Button.tsx";
    });
    baselineOk(dir);

    // Break the capture command: an audit that ran it would exit 2 with "capture command failed".
    writeIn(dir, "sandbox/capture.mjs", "process.exit(7);\n");

    // unreceipted: hand copy of an existing golden under a new key
    mkdirSync(path.join(dir, GOLDENS, "atoms/Ghost"), { recursive: true });
    copyFileSync(path.join(dir, GOLDENS, "atoms/Button/default.dom"), path.join(dir, GOLDENS, "atoms/Ghost/default.dom"));
    // empty golden
    mkdirSync(path.join(dir, GOLDENS, "atoms/Empty"), { recursive: true });
    writeFileSync(path.join(dir, GOLDENS, "atoms/Empty/default.dom"), "", "utf8");
    // cross-component identical bodies: a molecules golden with the Badge atom's bytes
    mkdirSync(path.join(dir, GOLDENS, "molecules/Twin"), { recursive: true });
    copyFileSync(path.join(dir, GOLDENS, "atoms/Badge/default.dom"), path.join(dir, GOLDENS, "molecules/Twin/default.dom"));
    // source edited after its golden was written
    writeIn(dir, "src/Button.tsx", "export const Button = 2;\n");

    const { code, report, stderr } = runCli(["--audit", dir, "--platform", "web-desktop"]);
    assert.equal(code, 1, stderr);
    assert.ok(report.unreceipted.some((u) => u.key === "atoms/Ghost/default"), JSON.stringify(report.unreceipted));
    assert.ok(report.empty.some((e) => e.key === "atoms/Empty/default"), JSON.stringify(report.empty));
    const twins = report.crossComponentDuplicates.find((g) => g.keys.includes("molecules/Twin/default"));
    assert.ok(twins, JSON.stringify(report.crossComponentDuplicates));
    assert.ok(twins.keys.includes("atoms/Badge/default"));
    const stale = report.staleSources.find((s) => s.key === "atoms/Button/default");
    assert.ok(stale, JSON.stringify(report.staleSources));
    assert.equal(stale.field, "file");
    assert.equal(stale.reason, "edited after its golden was written");
  } finally {
    removeDirs(dir);
  }
});

test("auditGoldens is importable and needs no capture run", () => {
  const dir = pixelClone();
  try {
    baselineOk(dir);
    writeIn(dir, "sandbox/capture.mjs", "process.exit(7);\n");
    const manifest = loadManifest(dir);
    const { id, config } = resolvePlatform(manifest, "web-desktop");
    const audit = auditGoldens(dir, config, id);
    assert.deepEqual(audit.unreceipted, []);
    assert.equal(audit.exit, 0);
    assert.ok(audit.goldenCount >= 4);
  } finally {
    removeDirs(dir);
  }
});

// --- S4: receipt hygiene ---

test("a corrupt receipt is exit 2 and nothing is written, before any golden is copied", () => {
  const dir = pixelClone();
  try {
    baselineOk(dir);
    rmSync(path.join(dir, GOLDENS, "atoms/Badge/default.dom"));
    writeIn(dir, RECEIPT, "{not json");
    const { code, stderr } = runCli(["--baseline", dir, "--platform", "web-desktop"]);
    assert.equal(code, 2, stderr);
    assert.equal(existsSync(path.join(dir, GOLDENS, "atoms/Badge/default.dom")), false, "no golden may be copied over a corrupt receipt");
  } finally {
    removeDirs(dir);
  }
});

test("a receipt entry whose golden file is gone is pruned on the next write", () => {
  const dir = pixelClone();
  try {
    baselineOk(dir);
    rmSync(path.join(dir, GOLDENS, "molecules/Card/default.dom"));
    const { code, stderr } = runCli(["--baseline", dir, "--platform", "web-desktop", "--layer", "atoms"]);
    assert.equal(code, 0, stderr);
    assert.equal(receiptOf(dir).goldens["molecules/Card/default"], undefined, "the pruned entry must not remain");
    assert.ok(receiptOf(dir).goldens["atoms/Button/default"], "entries with a golden are kept");
  } finally {
    removeDirs(dir);
  }
});

test("a golden saved with CRLF line endings matches its receipt", () => {
  const dir = pixelClone();
  try {
    baselineOk(dir);
    const golden = path.join(dir, GOLDENS, "atoms/Badge/default.dom");
    writeFileSync(golden, readFileSync(golden, "utf8").replace(/\n/g, "\r\n"));
    const check = runCli(["--check", dir, "--platform", "web-desktop"]);
    assert.equal(check.code, 0, check.stderr);
    const audit = runCli(["--audit", dir, "--platform", "web-desktop"]);
    assert.equal(audit.code, 0, JSON.stringify(audit.report));
  } finally {
    removeDirs(dir);
  }
});

test("audit reports the golden count as goldenCount and keeps goldens as the folder path", () => {
  const dir = pixelClone();
  try {
    baselineOk(dir);
    const { report } = runCli(["--audit", dir, "--platform", "web-desktop"]);
    assert.equal(report.goldenCount, 4);
    assert.equal(report.goldens, GOLDENS);
  } finally {
    removeDirs(dir);
  }
});

test("audit flags a receipt with no source hashes once the manifest names a file for a built item", () => {
  const dir = pixelClone();
  try {
    baselineOk(dir);
    writeIn(dir, "src/Button.tsx", "export const Button = 1;\n");
    editManifest(dir, (m) => {
      m.platforms["web-desktop"].atoms.find((e) => e.name === "Button").file = "src/Button.tsx";
    });
    const { code, report } = runCli(["--audit", dir, "--platform", "web-desktop"]);
    assert.equal(code, 1);
    assert.deepEqual(report.noSourceHashes, [
      { key: "atoms/Button/default", reason: "receipt has no source hashes for atoms/Button/default" },
    ]);
  } finally {
    removeDirs(dir);
  }
});

// --- S5: baseline never blesses drift ---

test("baseline refuses a changed golden, names it, and writes nothing", () => {
  const dir = pixelClone();
  try {
    baselineOk(dir);
    const goldenBefore = readIn(dir, `${GOLDENS}/atoms/Button/default.dom`);
    const receiptBefore = readIn(dir, RECEIPT);
    writeIn(dir, "sandbox/stories/atoms/Button/default.html", "<button>Changed</button>\n");
    const { code, report, stderr } = runCli(["--baseline", dir, "--platform", "web-desktop"]);
    assert.equal(code, 1, stderr);
    assert.ok(report.changed.includes("atoms/Button/default"), JSON.stringify(report.changed));
    assert.deepEqual(report.written, []);
    assert.match(report.message, /use --accept <glob> to accept a changed golden/);
    assert.equal(readIn(dir, `${GOLDENS}/atoms/Button/default.dom`), goldenBefore);
    assert.equal(readIn(dir, RECEIPT), receiptBefore);
  } finally {
    removeDirs(dir);
  }
});

test("baseline adds new goldens and stamps receipts for goldens that already match", () => {
  const dir = pixelClone();
  try {
    baselineOk(dir);
    rmSync(path.join(dir, GOLDENS, "atoms/Badge/default.dom"));
    rmSync(path.join(dir, RECEIPT));
    const { code, report, stderr } = runCli(["--baseline", dir, "--platform", "web-desktop"]);
    assert.equal(code, 0, stderr);
    assert.deepEqual(report.added, ["atoms/Badge/default"]);
    assert.ok(report.unchanged.includes("atoms/Button/default"));
    assert.deepEqual(report.changed, []);
    assert.deepEqual(Object.keys(receiptOf(dir).goldens).sort(), [
      "atoms/Badge/default",
      "atoms/Button/default",
      "molecules/Card/default",
      "screens/Home/default",
    ]);
  } finally {
    removeDirs(dir);
  }
});

test("the lower-level functions are exported so another script can apply its own policy", () => {
  const dir = pixelClone();
  try {
    const { id, config } = resolvePlatform(loadManifest(dir), "web-desktop");
    const cfg = resolveCaptureConfig(config, id);
    const { capture, gate } = captureAndGate(dir, cfg, null, {});
    assert.equal(capture.stories.length, 4);
    assert.deepEqual(gate.violations, []);
    const plan = planGoldens(dir, cfg, capture.stories);
    assert.equal(plan.added.length, 4);
    assert.equal(typeof writeReceipts, "function");
  } finally {
    removeDirs(dir);
  }
});

