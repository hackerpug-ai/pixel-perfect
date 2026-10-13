// gate.mjs is the only writer of passed and verified. These tests drive main() on real
// temp projects: real files, a real PNG, and the shipped catalog capture. Nothing is mocked.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { digest } from "../plugins/pixel-perfect/scripts/reference-revisions.mjs";
import { main } from "../plugins/pixel-perfect/scripts/gate.mjs";
import { inkImage } from "./helpers/png.mjs";
import { removeDirs, scratchProject, writeIn } from "./helpers/catalog.mjs";

const PNG = inkImage({ width: 32, height: 32, inkCount: 200 });

function run(args) {
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
  let report = null;
  try {
    report = JSON.parse(stdout);
  } catch {
    report = null;
  }
  return { code, stdout, stderr, report };
}

function project(dir, { stories, items, gates = {}, pixels = "required", command = null, extra = {} }) {
  const capture = {
    medium: "dom+png",
    goldens: "design/goldens/web-desktop",
    catalog: "sandbox/catalog",
    staging: "design/.captures/web-desktop",
    viewport: "390x300",
    pixels,
  };
  if (pixels === "none") capture.pixels_reason = "text fixture";
  if (command) capture.command = command;
  writeIn(
    dir,
    "design/manifest.json",
    JSON.stringify(
      {
        goal: "gate fixture",
        platforms: {
          "web-desktop": {
            tools: {
              style_contract_source: "none",
              component_contract_source: "none",
            },
            capture,
            gates,
            ...items,
            ...extra,
          },
        },
      },
      null,
      2,
    ) + "\n",
  );
  for (const [rel, body] of Object.entries(stories)) {
    if (rel.endsWith(".png")) writeIn(dir, `sandbox/catalog/${rel}`, body);
    else writeIn(dir, `sandbox/catalog/${rel}`, body);
  }
  return dir;
}

function buttonStories(png = PNG) {
  return {
    "atoms/Button/default.txt": "Button\nlabel=Save\n",
    "atoms/Button/default.png": png,
  };
}

function writeButtonSources(dir) {
  writeIn(dir, "src/Button.tsx", "export const Button = () => <button>Save</button>;\n");
  writeIn(dir, "src/Button.stories.tsx", "export const Default = {};\n");
}

function buttonProject(dir, gates = {}) {
  project(dir, {
    stories: buttonStories(),
    gates,
    items: {
      atoms: [{ name: "Button", file: "src/Button.tsx", story: "src/Button.stories.tsx", status: "pending" }],
    },
  });
  writeButtonSources(dir);
  return dir;
}

function manifestBytes(dir) {
  return readFileSync(path.join(dir, "design/manifest.json"));
}

function manifest(dir) {
  return JSON.parse(manifestBytes(dir));
}

function hashesFor(dir) {
  const staging = path.join(dir, "design/.captures/web-desktop/atoms/Button");
  return {
    golden: digest(readFileSync(path.join(staging, "default.txt"))),
    file: digest(readFileSync(path.join(dir, "src/Button.tsx"))),
    story: digest(readFileSync(path.join(dir, "src/Button.stories.tsx"))),
    frames: "none",
    render: digest(readFileSync(path.join(staging, "default.png"))),
  };
}

function judgment(hashes, overrides = {}) {
  return {
    kind: "contract-review",
    verdict: "pass",
    reviewer: "judge",
    reason: "matches the frame",
    discrepancies: [],
    hashes,
    ...overrides,
  };
}

function passButton(dir) {
  assert.equal(run(["item", dir, "--platform", "web-desktop", "--layer", "atoms", "--name", "Button"]).code, 0);
  const file = writeIn(dir, "design/.briefs/judgment.json", JSON.stringify(judgment(hashesFor(dir))));
  assert.equal(run(["record", dir, "--platform", "web-desktop", "--layer", "atoms", "--name", "Button", "--judgment", file]).code, 0);
  return run(["layer", dir, "--platform", "web-desktop", "--layer", "atoms"]);
}

test("item leaves a bad story not verified and does not write the manifest", () => {
  const dir = scratchProject("pp-gate-");
  try {
    buttonProject(dir);
    writeIn(dir, "sandbox/catalog/atoms/Button/default.png", Buffer.from("not a png"));
    const before = manifestBytes(dir);
    const { code, report } = run(["item", dir, "--platform", "web-desktop", "--layer", "atoms", "--name", "Button"]);
    assert.equal(code, 1);
    assert.match(report.message, /atoms\/Button/);
    assert.equal(manifest(dir).platforms["web-desktop"].atoms[0].status, "pending");
    assert.notEqual(manifest(dir).platforms["web-desktop"].atoms[0].status, "verified");
    assert.deepEqual(manifestBytes(dir), before);
  } finally {
    removeDirs(dir);
  }
});

test("item sets built only when the file, the story, the contract, and a real PNG are present", () => {
  const dir = scratchProject("pp-gate-");
  try {
    buttonProject(dir);
    const missing = run(["item", dir, "--platform", "web-desktop", "--layer", "atoms", "--name", "Button"]);
    assert.equal(missing.code, 0, missing.stderr);
    const item = manifest(dir).platforms["web-desktop"].atoms[0];
    assert.equal(item.status, "built");
    assert.notEqual(item.status, "verified");
    assert.equal(manifest(dir).platforms["web-desktop"].gates?.atoms, undefined);
  } finally {
    removeDirs(dir);
  }
});

test("record rejects an unbound judgment and a render hash that does not match the capture", () => {
  const dir = scratchProject("pp-gate-");
  try {
    buttonProject(dir);
    assert.equal(run(["item", dir, "--platform", "web-desktop", "--layer", "atoms", "--name", "Button"]).code, 0);
    const unbound = writeIn(dir, "design/.briefs/unbound.json", JSON.stringify(judgment({ golden: "sha256:nope" }, { hashes: undefined })));
    const rejected = run(["record", dir, "--platform", "web-desktop", "--layer", "atoms", "--name", "Button", "--judgment", unbound]);
    assert.equal(rejected.code, 1, rejected.stderr);
    assert.match(rejected.report.message, /not bound/);
    assert.equal(existsSync(path.join(dir, "design/fidelity/web-desktop/atoms/Button.json")), false);

    const wrong = hashesFor(dir);
    wrong.render = `sha256:${"ab".repeat(32)}`;
    const file = writeIn(dir, "design/.briefs/wrong.json", JSON.stringify(judgment(wrong)));
    const mismatched = run(["record", dir, "--platform", "web-desktop", "--layer", "atoms", "--name", "Button", "--judgment", file]);
    assert.equal(mismatched.code, 1, mismatched.stderr);
    assert.match(mismatched.report.message, /render hash does not match the capture/);
  } finally {
    removeDirs(dir);
  }
});

test("layer refuses organisms while molecules are not passed and leaves the manifest byte-identical", () => {
  const dir = scratchProject("pp-gate-");
  try {
    project(dir, {
      stories: buttonStories(),
      items: {
        atoms: [{ name: "Button", file: "src/Button.tsx", story: "src/Button.stories.tsx", status: "verified" }],
        molecules: [{ name: "Card", file: "src/Card.tsx", story: "src/Card.stories.tsx", status: "pending" }],
        organisms: [{ name: "Dialog", file: "src/Dialog.tsx", story: "src/Dialog.stories.tsx", status: "pending" }],
      },
      gates: { atoms: "passed" },
    });
    writeIn(dir, "design/fidelity/web-desktop/gate.json", JSON.stringify({ version: 1, platform: "web-desktop", layers: { atoms: { items: ["Button"] } } }) + "\n");
    const before = manifestBytes(dir);
    const { code, report } = run(["layer", dir, "--platform", "web-desktop", "--layer", "organisms"]);
    assert.equal(code, 1, report?.message);
    assert.match(report.message, /organisms is refused: molecules is not passed/);
    assert.deepEqual(manifestBytes(dir), before);
  } finally {
    removeDirs(dir);
  }
});

test("a passing layer writes the manifest and the receipt together", () => {
  const dir = scratchProject("pp-gate-");
  try {
    buttonProject(dir);
    const { code, stderr, report } = passButton(dir);
    assert.equal(code, 0, stderr + JSON.stringify(report));
    const platform = manifest(dir).platforms["web-desktop"];
    assert.equal(platform.atoms[0].status, "verified");
    assert.equal(platform.gates.atoms, "passed");
    assert.equal(platform.gates.atoms_capture, "passed");
    const gateReceipt = JSON.parse(readFileSync(path.join(dir, "design/fidelity/web-desktop/gate.json"), "utf8"));
    assert.deepEqual(gateReceipt.layers.atoms.items, ["Button"]);
    assert.equal(existsSync(path.join(dir, "design/goldens/web-desktop/receipt.json")), true);
    const catalog = JSON.parse(readFileSync(path.join(dir, "design/goldens/web-desktop/receipt.json"), "utf8"));
    assert.equal(catalog.goldens["atoms/Button/default"].hash.length > 0, true);
  } finally {
    removeDirs(dir);
  }
});

test("a failing layer leaves the manifest byte-identical", () => {
  const dir = scratchProject("pp-gate-");
  try {
    buttonProject(dir);
    assert.equal(passButton(dir).code, 0);
    const before = manifestBytes(dir);
    writeFileSync(path.join(dir, "src/Button.tsx"), "export const Button = () => <button>Edited</button>;\n");
    const { code, report } = run(["layer", dir, "--platform", "web-desktop", "--layer", "atoms"]);
    assert.equal(code, 1, report?.message);
    assert.match(report.message, /atoms\/Button/);
    assert.match(report.message, /stale file hash/);
    assert.deepEqual(manifestBytes(dir), before);
    writeFileSync(path.join(dir, "src/Button.tsx"), "export const Button = () => <button>Save</button>;\n");
    writeFileSync(path.join(dir, "src/Button.stories.tsx"), "export const Default = { args: { edited: true } };\n");
    const story = run(["layer", dir, "--platform", "web-desktop", "--layer", "atoms"]);
    assert.equal(story.code, 1);
    assert.match(story.report.message, /atoms\/Button/);
    assert.match(story.report.message, /stale story hash/);
    assert.deepEqual(manifestBytes(dir), before);
  } finally {
    removeDirs(dir);
  }
});

test("a failing verdict, an unaccepted difference, a stale golden, and a stale frame each fail the layer and name the component", () => {
  const dir = scratchProject("pp-gate-");
  try {
    buttonProject(dir);
    writeIn(dir, "design/reference/frames.json", JSON.stringify({ frames: [{ id: "f1", png: "f1.png", viewport: "390x300" }] }));
    writeIn(dir, "design/reference/f1.png", PNG);
    const body = manifest(dir);
    body.platforms["web-desktop"].atoms[0].appears_on = ["f1"];
    writeFileSync(path.join(dir, "design/manifest.json"), JSON.stringify(body, null, 2) + "\n");
    assert.equal(run(["item", dir, "--platform", "web-desktop", "--layer", "atoms", "--name", "Button"]).code, 0);
    const hashes = hashesFor(dir);
    hashes.frames = digest(readFileSync(path.join(dir, "design/reference/f1.png")));
    const file = writeIn(
      dir,
      "design/.briefs/frames.json",
      JSON.stringify(judgment(hashes, { kind: "frames", discrepancies: [{ description: "type is heavier", accepted: false }] })),
    );
    assert.equal(run(["record", dir, "--platform", "web-desktop", "--layer", "atoms", "--name", "Button", "--judgment", file]).code, 0);
    const open = run(["layer", dir, "--platform", "web-desktop", "--layer", "atoms"]);
    assert.equal(open.code, 1);
    assert.match(open.report.message, /atoms\/Button/);
    assert.match(open.report.message, /unaccepted difference/);

    const accepted = writeIn(
      dir,
      "design/.briefs/fail.json",
      JSON.stringify(judgment(hashes, { kind: "frames", verdict: "fail", discrepancies: [] })),
    );
    assert.equal(run(["record", dir, "--platform", "web-desktop", "--layer", "atoms", "--name", "Button", "--judgment", accepted]).code, 0);
    const failed = run(["layer", dir, "--platform", "web-desktop", "--layer", "atoms"]);
    assert.equal(failed.code, 1);
    assert.match(failed.report.message, /atoms\/Button/);
    assert.match(failed.report.message, /failing verdict/);

    const passing = writeIn(dir, "design/.briefs/ok.json", JSON.stringify(judgment(hashes, { kind: "frames" })));
    assert.equal(run(["record", dir, "--platform", "web-desktop", "--layer", "atoms", "--name", "Button", "--judgment", passing]).code, 0);
    assert.equal(run(["layer", dir, "--platform", "web-desktop", "--layer", "atoms"]).code, 0);
    const before = manifestBytes(dir);
    writeFileSync(path.join(dir, "design/goldens/web-desktop/atoms/Button/default.txt"), "Button\nlabel=No\n");
    const golden = run(["layer", dir, "--platform", "web-desktop", "--layer", "atoms"]);
    assert.equal(golden.code, 1);
    assert.match(golden.report.message, /atoms\/Button/);
    assert.match(golden.report.message, /stale golden/);
    assert.deepEqual(manifestBytes(dir), before);

    writeFileSync(path.join(dir, "design/goldens/web-desktop/atoms/Button/default.txt"), readFileSync(path.join(dir, "design/.captures/web-desktop/atoms/Button/default.txt")));
    writeFileSync(path.join(dir, "design/reference/f1.png"), inkImage({ width: 32, height: 32, inkCount: 400 }));
    const frame = run(["layer", dir, "--platform", "web-desktop", "--layer", "atoms"]);
    assert.equal(frame.code, 1);
    assert.match(frame.report.message, /atoms\/Button/);
    assert.match(frame.report.message, /stale frames/);
  } finally {
    removeDirs(dir);
  }
});

test("a component with no frames needs a contract-review judgment", () => {
  const dir = scratchProject("pp-gate-");
  try {
    buttonProject(dir);
    assert.equal(run(["item", dir, "--platform", "web-desktop", "--layer", "atoms", "--name", "Button"]).code, 0);
    const hashes = hashesFor(dir);
    const file = writeIn(dir, "design/.briefs/frames.json", JSON.stringify(judgment(hashes, { kind: "frames" })));
    const { code, report } = run(["record", dir, "--platform", "web-desktop", "--layer", "atoms", "--name", "Button", "--judgment", file]);
    assert.equal(code, 1, report?.message);
    assert.match(report.message, /contract-review/);
  } finally {
    removeDirs(dir);
  }
});

test("audit does not capture and names each planted defect", () => {
  const dir = scratchProject("pp-gate-");
  const marker = path.join(dir, "captured.txt");
  try {
    const command = `node -e ${JSON.stringify(`require("fs").writeFileSync(${JSON.stringify(marker)}, "ran")`)}`;
    project(dir, {
      stories: {},
      command,
      items: {
        atoms: [{ name: "Button", file: "src/Button.tsx", story: "src/Button.stories.tsx", status: "pending" }],
        molecules: [{ name: "Card", file: "src/Card.tsx", story: "src/Card.stories.tsx", status: "pending" }],
        organisms: [{ name: "Dialog", file: "src/Dialog.tsx", story: "src/Dialog.stories.tsx", status: "verified" }],
      },
      gates: { atoms: "passed" },
      extra: {
        tools: {
          style_contract: "tailwind-web",
          style_contract_source: "builtin",
          style_contract_enforcement: "hard-fail",
          component_contract_source: "none",
          framework: "react",
        },
      },
    });
    writeIn(dir, "src/Button.tsx", "export const Button = () => null;\n");
    writeIn(dir, "notes/Button.tsx", "export const Button = () => null;\n");
    const body = manifest(dir);
    body.platforms["web-desktop"].atoms[0].file = "notes/Button.tsx";
    body.platforms["web-desktop"].atoms[0].status = "built";
    writeFileSync(path.join(dir, "design/manifest.json"), JSON.stringify(body, null, 2) + "\n");
    const golden = "Button\nlabel=Save\n";
    writeIn(dir, "design/goldens/web-desktop/atoms/Empty/default.txt", "\n");
    writeIn(dir, "design/goldens/web-desktop/atoms/Ghost/default.txt", golden);
    writeIn(dir, "design/goldens/web-desktop/atoms/Button/default.txt", golden);
    const hash = createHash("sha256").update(golden).digest("hex").slice(0, 16);
    writeIn(
      dir,
      "design/goldens/web-desktop/receipt.json",
      JSON.stringify({
        version: 1,
        platform: "web-desktop",
        pixels: "required",
        pixelsReason: null,
        goldens: { "atoms/Button/default": { hash, ext: ".txt", mode: "baseline" } },
      }) + "\n",
    );
    const { code, report } = run(["audit", dir, "--platform", "web-desktop"]);
    assert.equal(code, 1, report?.message);
    assert.equal(report.captured, false);
    assert.equal(existsSync(marker), false, "audit must not run the capture command");
    assert.match(report.message, /empty golden: atoms\/Empty\/default/);
    assert.match(report.message, /copied golden: atoms\/Ghost\/default/);
    assert.match(report.message, /missing pixels: atoms\/Button\/default/);
    assert.match(report.message, /organisms verified while molecules were pending/);
    assert.match(report.message, /empty styling scope/);
    assert.match(report.message, /hand-typed passed: atoms/);
  } finally {
    removeDirs(dir);
  }
});

test("scaffold fails with no PNG and passes with one real PNG", () => {
  const dir = scratchProject("pp-gate-");
  try {
    project(dir, {
      stories: { "atoms/Hello/default.txt": "Hello\n\n" },
      items: { atoms: [{ name: "Hello", file: "src/Hello.tsx", story: "src/Hello.stories.tsx", status: "pending" }] },
    });
    writeIn(dir, "src/Hello.tsx", "export const Hello = () => <p>Hello</p>;\n");
    writeIn(dir, "src/Hello.stories.tsx", "export const Default = {};\n");
    const before = manifestBytes(dir);
    const missing = run(["layer", dir, "--platform", "web-desktop", "--layer", "scaffold"]);
    assert.equal(missing.code, 1, missing.stderr);
    assert.match(missing.report.message, /Hello/);
    assert.deepEqual(manifestBytes(dir), before);

    writeIn(dir, "sandbox/catalog/atoms/Hello/default.png", PNG);
    const passed = run(["layer", dir, "--platform", "web-desktop", "--layer", "scaffold"]);
    assert.equal(passed.code, 0, passed.stderr + JSON.stringify(passed.report));
    assert.equal(manifest(dir).platforms["web-desktop"].gates.scaffold, "passed");
    assert.equal(existsSync(path.join(dir, "design/fidelity/web-desktop/gate.json")), true);
  } finally {
    removeDirs(dir);
  }
});

test("an empty layer scope fails and leaves the manifest byte-identical", () => {
  const dir = scratchProject("pp-gate-");
  try {
    buttonProject(dir, { atoms: "passed" });
    writeIn(dir, "design/fidelity/web-desktop/gate.json", JSON.stringify({ version: 1, platform: "web-desktop", layers: { atoms: { items: ["Button"] } } }) + "\n");
    const before = manifestBytes(dir);
    const { code, report } = run(["layer", dir, "--platform", "web-desktop", "--layer", "molecules"]);
    assert.equal(code, 1);
    assert.match(report.message, /empty scope/);
    assert.deepEqual(manifestBytes(dir), before);
  } finally {
    removeDirs(dir);
  }
});
