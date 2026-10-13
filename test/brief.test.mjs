// Behavioral tests for scripts/brief.mjs against the real shipped files and a real-shaped
// fixture project (test/fixtures/brief-project). Every check runs the CLI as a child
// process and compares real bytes and real paths on disk. No mocks.

import assert from "node:assert/strict";
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, writeFileSync, unlinkSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { describe, test } from "node:test";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PLUGIN = path.join(ROOT, "plugins/pixel-perfect");
const SCRIPT = path.join(PLUGIN, "scripts/brief.mjs");
const VERIFY_INVENTORY = path.join(PLUGIN, "scripts/verify-inventory.mjs");
const FIXTURE_SRC = path.join(ROOT, "test/fixtures/brief-project");
const PROMPT_SRC = path.join(PLUGIN, "agents/designer.md");
const CONTRACT_SRC = path.join(PLUGIN, "docs/DESIGN-CONTRACT.md");
const BUILD_BRIEF_SRC = path.join(PLUGIN, "docs/BUILD-BRIEF.md");

const SUCCESS_LINE = (file) =>
  `Read ${file} and follow it exactly. It is your complete assignment; return the result it asks for.\n`;

const EXPECTED_PLACEHOLDERS = ["COMPOSES", "FILES", "FRAMES", "GATES", "ITEM", "ITEM_ID", "LIBRARY", "PLATFORM", "PRIOR_FINDINGS", "RENDER", "RULES", "STACK", "STATE"];
const LAYERS = ["atoms", "molecules", "organisms", "screens"];

function cloneFixture() {
  const dir = mkdtempSync(path.join(tmpdir(), "pp-brief-"));
  cpSync(FIXTURE_SRC, dir, { recursive: true });
  return dir;
}

function tempDir() {
  return mkdtempSync(path.join(tmpdir(), "pp-brief-input-"));
}

function runCli(args, input) {
  const result = spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf8", input, timeout: 60_000 });
  return { code: result.status, stdout: result.stdout, stderr: result.stderr };
}

function buildArgs(root, overrides = {}) {
  const flags = { "--platform": "web-desktop", "--layer": "atoms", "--name": "Button", ...overrides };
  const args = ["build", root];
  for (const [flag, value] of Object.entries(flags)) if (value !== undefined) args.push(flag, value);
  return args;
}

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function writeJson(file, value) {
  writeFileSync(file, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function setPlatformField(root, field, value) {
  const manifestPath = path.join(root, "design/manifest.json");
  const manifest = readJson(manifestPath);
  const platform = manifest.platforms["web-desktop"];
  if (value === undefined) delete platform.tools[field];
  else platform.tools[field] = value;
  writeJson(manifestPath, manifest);
}

function setItemStatus(root, layer, name, status) {
  const manifestPath = path.join(root, "design/manifest.json");
  const manifest = readJson(manifestPath);
  const entry = manifest.platforms["web-desktop"][layer].find((e) => e.name === name);
  entry.status = status;
  writeJson(manifestPath, manifest);
}

function designerPromptBody() {
  const raw = readFileSync(PROMPT_SRC, "utf8");
  const match = raw.match(/^---\n[\s\S]*?\n---\n/);
  assert.ok(match, "agents/designer.md must start with YAML frontmatter");
  return raw.slice(match[0].length).trim();
}

// Text of one "## heading" section: from its line to the next "## " line (or the end).
function sectionOf(content, heading) {
  const lines = content.split("\n");
  const start = lines.findIndex((line) => line.startsWith(`## ${heading}`));
  assert.ok(start >= 0, `brief has no "## ${heading}" section`);
  const end = lines.findIndex((line, i) => i > start && line.startsWith("## "));
  return lines.slice(start, end === -1 ? undefined : end).join("\n");
}

function briefPath(root, platform, layer, name) {
  return path.join(root, "design/.briefs", platform, `${layer}-${name}.md`);
}

function inventoryEntry(root, layer, name) {
  return readJson(path.join(root, "design/inventory.json"))[layer].find((e) => e.name === name);
}

describe("brief build: atom with frames", () => {
  test("exits 0, prints exactly one line naming the brief file, and writes it", () => {
    const root = cloneFixture();
    try {
      const { code, stdout, stderr } = runCli(buildArgs(root));
      const file = briefPath(root, "web-desktop", "atoms", "Button");
      assert.equal(code, 0, stderr);
      assert.equal(stdout, SUCCESS_LINE(file));
      assert.equal(stderr, "");
      assert.ok(existsSync(file), `brief file missing at ${file}`);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("holds the designer prompt body, without its frontmatter, then the contract, then the task", () => {
    const root = cloneFixture();
    try {
      runCli(buildArgs(root));
      const content = readFileSync(briefPath(root, "web-desktop", "atoms", "Button"), "utf8");
      assert.ok(content.includes(designerPromptBody()), "agent prompt body missing");
      assert.ok(!content.includes("model: inherit"), "frontmatter leaked into the brief");
      assert.ok(!content.includes("name: designer\n"), "frontmatter name leaked into the brief");
      const prompt = content.indexOf(designerPromptBody());
      const contract = content.indexOf(readFileSync(CONTRACT_SRC, "utf8"));
      assert.ok(contract > prompt, "design contract must follow the agent prompt");
      assert.ok(content.indexOf("# Part 3: task") > contract, "task must follow the design contract");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("holds the design contract verbatim", () => {
    const root = cloneFixture();
    try {
      runCli(buildArgs(root));
      const content = readFileSync(briefPath(root, "web-desktop", "atoms", "Button"), "utf8");
      assert.ok(content.includes(readFileSync(CONTRACT_SRC, "utf8")), "design contract text is not verbatim in the brief");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("holds the item's inventory entry as the exact JSON from design/inventory.json", () => {
    const root = cloneFixture();
    try {
      runCli(buildArgs(root));
      const content = readFileSync(briefPath(root, "web-desktop", "atoms", "Button"), "utf8");
      const entry = inventoryEntry(root, "atoms", "Button");
      assert.ok(content.includes(JSON.stringify(entry, null, 2)), "inventory entry JSON missing from the brief");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("lists every frame the item appears on, with an absolute PNG path that exists on disk", () => {
    const root = cloneFixture();
    try {
      runCli(buildArgs(root));
      const content = readFileSync(briefPath(root, "web-desktop", "atoms", "Button"), "utf8");
      const frames = [
        ["brief-deck/01", "design/reference/brief-deck/01.png", "720x166"],
        ["brief-deck/02", "design/reference/brief-deck/02.png", "720x276"],
      ];
      for (const [id, rel, viewport] of frames) {
        const png = path.join(root, rel);
        assert.ok(existsSync(png), `fixture frame missing on disk: ${png}`);
        assert.ok(content.includes(id), `frame id ${id} missing`);
        assert.ok(content.includes(png), `absolute PNG path for ${id} missing`);
        assert.ok(content.includes(viewport), `viewport ${viewport} for ${id} missing`);
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("names the resolved adapter and contract files as absolute paths that exist", () => {
    const root = cloneFixture();
    try {
      runCli(buildArgs(root));
      const content = readFileSync(briefPath(root, "web-desktop", "atoms", "Button"), "utf8");
      const resolved = [
        "docs/adapters/tailwind.md",
        "docs/adapters/shadcn.md",
        "docs/adapters/custom-sandbox.md",
        "docs/styling-contracts/tailwind-web.md",
        "docs/component-contracts/shadcn.md",
      ];
      for (const rel of resolved) {
        const abs = path.join(PLUGIN, rel);
        assert.ok(existsSync(abs), `shipped file missing: ${abs}`);
        assert.ok(content.includes(abs), `brief does not name ${abs}`);
      }
      assert.ok(!content.includes(path.join(PLUGIN, "docs/adapters/generic.md")), "generic adapter used where a named adapter exists");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("names the framework and tool docs URLs the manifest records", () => {
    const root = cloneFixture();
    try {
      runCli(buildArgs(root));
      const content = readFileSync(briefPath(root, "web-desktop", "atoms", "Button"), "utf8");
      assert.ok(content.includes("https://tailwindcss.com/docs"), "style docs URL missing");
      assert.ok(content.includes("https://ui.shadcn.com/docs"), "components docs URL missing");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("gives the file fence as absolute component and story paths from the manifest", () => {
    const root = cloneFixture();
    try {
      runCli(buildArgs(root));
      const content = readFileSync(briefPath(root, "web-desktop", "atoms", "Button"), "utf8");
      const files = sectionOf(content, "Files");
      assert.ok(files.includes(path.join(root, "src/components/Button.tsx")), "component file path missing from Files");
      assert.ok(files.includes(path.join(root, "src/components/Button.stories.tsx")), "story file path missing from Files");
      assert.ok(files.includes("sandbox"), "Files must mention the one allowed sandbox-registry line");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("gives the render command with both capture environment variables, run from the project root", () => {
    const root = cloneFixture();
    try {
      runCli(buildArgs(root));
      const content = readFileSync(briefPath(root, "web-desktop", "atoms", "Button"), "utf8");
      const out = path.join(root, "design/.captures/web-desktop-item");
      const command = `PIXEL_PERFECT_CAPTURE_OUT=${out} PIXEL_PERFECT_CAPTURE_ONLY=atoms/Button npm run sandbox:capture`;
      const render = sectionOf(content, "Render");
      assert.ok(render.includes(command), `render command missing from Render:\n${render}`);
      assert.ok(render.includes(`${out}/atoms/Button/`), "output layout <out>/<layer>/<Name>/<state>.png not stated");
      assert.ok(render.includes("project root"), "render section must say to run from the project root");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("spells out the one-JSON-object result shape the orchestrator parses", () => {
    const root = cloneFixture();
    try {
      runCli(buildArgs(root));
      const content = readFileSync(briefPath(root, "web-desktop", "atoms", "Button"), "utf8");
      const shape = [
        '"status": "complete" | "blocked"',
        '"item": "atoms/Button"',
        '"files_written": []',
        '"renders": [{"state": "", "path": ""}]',
        '"compared": [{"frame": "", "render": "", "differences_fixed": [], "differences_remaining": []}]',
        '"needs": []',
        '"flags": []',
        '"notes": ""',
        '"reason"',
      ];
      for (const fragment of shape) assert.ok(content.includes(fragment), `result shape missing: ${fragment}`);
      assert.ok(content.includes("three rounds"), "the three-round fix limit is not stated");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("leaves no unfilled placeholder and no temp file behind", () => {
    const root = cloneFixture();
    try {
      runCli(buildArgs(root));
      const file = briefPath(root, "web-desktop", "atoms", "Button");
      const content = readFileSync(file, "utf8");
      assert.ok(!content.includes("<<"), "a << placeholder marker is left in the brief");
      assert.doesNotMatch(content, /<<[A-Z_]+>>/);
      assert.deepEqual(readdirSync(path.dirname(file)), ["atoms-Button.md"]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("an atom with no composes has no Composes section", () => {
    const root = cloneFixture();
    try {
      runCli(buildArgs(root));
      const content = readFileSync(briefPath(root, "web-desktop", "atoms", "Button"), "utf8");
      assert.ok(!content.includes("## Composes"), "Button composes nothing, so no Composes section");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("brief build: molecule, screen, and dependencies", () => {
  test("a molecule lists the file of each composed component", () => {
    const root = cloneFixture();
    try {
      const { code, stderr } = runCli(buildArgs(root, { "--layer": "molecules", "--name": "SearchBar" }));
      assert.equal(code, 0, stderr);
      const content = readFileSync(briefPath(root, "web-desktop", "molecules", "SearchBar"), "utf8");
      const composes = sectionOf(content, "Composes");
      assert.ok(composes.includes(path.join(root, "src/components/Input.tsx")), "Input file missing from Composes");
      assert.ok(composes.includes(path.join(root, "src/components/Icon.tsx")), "Icon file missing from Composes");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("a molecule whose composed component is still pending exits 2 and writes no brief", () => {
    const root = cloneFixture();
    try {
      setItemStatus(root, "atoms", "Input", "pending");
      const { code, stdout, stderr } = runCli(buildArgs(root, { "--layer": "molecules", "--name": "SearchBar" }));
      assert.equal(code, 2);
      assert.equal(stdout, "");
      assert.match(stderr, /Input/);
      assert.match(stderr, /pending|not built/);
      assert.ok(!existsSync(briefPath(root, "web-desktop", "molecules", "SearchBar")), "a brief must not be written on failure");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("a screen whose composed atom is still pending exits 2", () => {
    const root = cloneFixture();
    try {
      setItemStatus(root, "molecules", "SearchBar", "verified");
      const { code, stderr } = runCli(buildArgs(root, { "--layer": "screens", "--name": "Library" }));
      assert.equal(code, 2);
      assert.match(stderr, /Button/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("a screen gives its frames grouped by state, in state order, and says which state no frame draws", () => {
    const root = cloneFixture();
    try {
      setItemStatus(root, "atoms", "Button", "verified");
      setItemStatus(root, "molecules", "SearchBar", "verified");
      const { code, stderr } = runCli(buildArgs(root, { "--layer": "screens", "--name": "Library" }));
      assert.equal(code, 0, stderr);
      const content = readFileSync(briefPath(root, "web-desktop", "screens", "Library"), "utf8");
      const frames = sectionOf(content, "Frames");
      const defaultAt = frames.indexOf("### State: default");
      const resultsAt = frames.indexOf("### State: results");
      const emptyAt = frames.indexOf("### State: empty");
      assert.ok(defaultAt >= 0 && resultsAt > defaultAt && emptyAt > resultsAt, "states must appear in inventory order");
      const frame01 = path.join(root, "design/reference/brief-deck/01.png");
      const frame02 = path.join(root, "design/reference/brief-deck/02.png");
      assert.ok(frames.slice(defaultAt, resultsAt).includes(frame01), "default state must list frame 01 under its heading");
      assert.ok(frames.slice(resultsAt, emptyAt).includes(frame02), "results state must list frame 02 under its heading");
      assert.ok(frames.slice(emptyAt).includes("No frame draws this state"), "empty state must say no frame draws it");
      assert.ok(frames.slice(emptyAt).includes("The spec requires an empty library state"), "empty state must carry its undrawn reason");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("a screen lists the file of each composed molecule or atom", () => {
    const root = cloneFixture();
    try {
      setItemStatus(root, "atoms", "Button", "verified");
      setItemStatus(root, "molecules", "SearchBar", "verified");
      runCli(buildArgs(root, { "--layer": "screens", "--name": "Library" }));
      const content = readFileSync(briefPath(root, "web-desktop", "screens", "Library"), "utf8");
      const composes = sectionOf(content, "Composes");
      assert.ok(composes.includes(path.join(root, "src/components/SearchBar.tsx")));
      assert.ok(composes.includes(path.join(root, "src/components/Button.tsx")));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("an item no frame shows gets the no-frame sentence and still exits 0", () => {
    const root = cloneFixture();
    try {
      const { code, stderr } = runCli(buildArgs(root, { "--name": "Badge" }));
      assert.equal(code, 0, stderr);
      const content = readFileSync(briefPath(root, "web-desktop", "atoms", "Badge"), "utf8");
      const frames = sectionOf(content, "Frames");
      assert.ok(frames.includes("No frame shows this item."), "no-frame sentence missing");
      assert.ok(frames.includes("The design contract and the project's theme tokens are the target."), "target sentence missing");
      assert.ok(!frames.includes(".png"), "no PNG may be listed for an item no frame shows");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("an item's undrawn reason reaches the child inside the item JSON", () => {
    const root = cloneFixture();
    try {
      runCli(buildArgs(root, { "--name": "Badge" }));
      const content = readFileSync(briefPath(root, "web-desktop", "atoms", "Badge"), "utf8");
      assert.ok(content.includes("The spec names status badges"), "the item's undrawn reason must reach the child");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("brief build: prior findings", () => {
  test("--findings puts the reviewed findings verbatim into the brief", () => {
    const root = cloneFixture();
    const dir = tempDir();
    try {
      const findingsPath = path.join(dir, "findings.json");
      writeFileSync(findingsPath, JSON.stringify({ findings: [{ id: "F1", problem: "padding is 12px; frame shows 16px" }] }, null, 2) + "\n");
      const { code, stderr } = runCli(buildArgs(root, { "--findings": findingsPath }));
      assert.equal(code, 0, stderr);
      const content = readFileSync(briefPath(root, "web-desktop", "atoms", "Button"), "utf8");
      assert.ok(content.includes("a previous attempt was reviewed; fix exactly these"), "findings introduction missing");
      assert.ok(content.includes(readFileSync(findingsPath, "utf8").trimEnd()), "findings text is not verbatim");
    } finally {
      rmSync(root, { recursive: true, force: true });
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("without --findings the prior-findings section is absent", () => {
    const root = cloneFixture();
    try {
      runCli(buildArgs(root));
      const content = readFileSync(briefPath(root, "web-desktop", "atoms", "Button"), "utf8");
      assert.ok(!content.includes("a previous attempt was reviewed"), "findings section must be removed when no findings are given");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("a findings file that is not JSON exits 2", () => {
    const root = cloneFixture();
    const dir = tempDir();
    try {
      const findingsPath = path.join(dir, "findings.json");
      writeFileSync(findingsPath, "not json at all");
      const { code, stdout, stderr } = runCli(buildArgs(root, { "--findings": findingsPath }));
      assert.equal(code, 2);
      assert.equal(stdout, "");
      assert.match(stderr, /findings/);
    } finally {
      rmSync(root, { recursive: true, force: true });
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("brief build: determinism and fixture integrity", () => {
  test("two builds of the same item produce byte-identical files", () => {
    const root = cloneFixture();
    try {
      const file = briefPath(root, "web-desktop", "atoms", "Button");
      runCli(buildArgs(root));
      const first = readFileSync(file);
      runCli(buildArgs(root));
      const second = readFileSync(file);
      assert.ok(first.equals(second), "brief bytes differ between two runs");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("the fixture inventory passes the real verify-inventory gate with its frames index", () => {
    const result = spawnSync(
      process.execPath,
      [VERIFY_INVENTORY, path.join(FIXTURE_SRC, "design/inventory.json"), "--frames", path.join(FIXTURE_SRC, "design/reference/frames.json")],
      { encoding: "utf8" },
    );
    assert.equal(result.status, 0, result.stdout);
    assert.match(result.stdout, /INVENTORY COVERED/);
  });

  test("each frame PNG on disk is a real image whose size matches its index viewport", () => {
    const index = readJson(path.join(FIXTURE_SRC, "design/reference/frames.json"));
    for (const frame of index.frames) {
      const png = readFileSync(path.join(FIXTURE_SRC, "design/reference", frame.png));
      assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], `${frame.id} is not a PNG`);
      const size = `${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`;
      assert.equal(size, frame.viewport, `${frame.id} image size differs from its viewport`);
      assert.ok(statSync(path.join(FIXTURE_SRC, "design/reference", frame.png)).size > 1000, `${frame.id} is implausibly small`);
    }
  });

  test("docs/BUILD-BRIEF.md opens its task with one fenced template whose placeholders are exactly the documented set", () => {
    const lines = readFileSync(BUILD_BRIEF_SRC, "utf8").split("\n");
    const fenceAt = lines.flatMap((line, i) => (line.startsWith("```") ? [i] : []));
    assert.ok(fenceAt.length >= 2, "BUILD-BRIEF.md must hold a fenced task template");
    const block = lines.slice(fenceAt[0] + 1, fenceAt[1]).join("\n");
    const names = [...new Set([...block.matchAll(/<<([A-Z_]+)>>/g)].map((m) => m[1]))].sort();
    assert.deepEqual(names, EXPECTED_PLACEHOLDERS);
  });
});

describe("brief build: gates and overrides", () => {
  test("a component contract with source none is left out of the gate section", () => {
    const root = cloneFixture();
    try {
      setPlatformField(root, "component_contract", undefined);
      setPlatformField(root, "component_contract_source", "none");
      const { code, stderr } = runCli(buildArgs(root));
      assert.equal(code, 0, stderr);
      const content = readFileSync(briefPath(root, "web-desktop", "atoms", "Button"), "utf8");
      const gates = sectionOf(content, "Gates");
      assert.ok(!gates.includes("component-contracts"), "component contract gate must be omitted");
      assert.ok(gates.includes(path.join(PLUGIN, "scripts/verify-styling-contract.mjs")), "styling gate must still run");
      assert.ok(gates.includes(path.join(PLUGIN, "docs/styling-contracts/tailwind-web.md")), "styling gate contract path missing");
      assert.ok(!content.includes("docs/component-contracts/"), "a none component contract must not be named anywhere");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("a contract with enforcement off is still read, but its gate is not run", () => {
    const root = cloneFixture();
    try {
      setPlatformField(root, "style_contract_enforcement", "off");
      runCli(buildArgs(root));
      const content = readFileSync(briefPath(root, "web-desktop", "atoms", "Button"), "utf8");
      const gates = sectionOf(content, "Gates");
      assert.ok(!gates.includes(path.join(PLUGIN, "docs/styling-contracts/tailwind-web.md")), "off styling contract must not be gated");
      assert.ok(content.includes(path.join(PLUGIN, "docs/styling-contracts/tailwind-web.md")), "off contract must still be named to read");
      assert.ok(gates.includes(path.join(PLUGIN, "docs/component-contracts/shadcn.md")), "component gate must still run");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("manifest overrides are passed to the gates as --allow and recorded in the stack", () => {
    const root = cloneFixture();
    try {
      setPlatformField(root, "component_contract_overrides", { Button: "wraps the Radix primitive for focus handling" });
      runCli(buildArgs(root));
      const content = readFileSync(briefPath(root, "web-desktop", "atoms", "Button"), "utf8");
      assert.ok(sectionOf(content, "Gates").includes("--allow Button"), "override not passed to the gate");
      assert.ok(sectionOf(content, "Stack").includes("wraps the Radix primitive for focus handling"), "override reason not recorded in Stack");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("the gate commands use the platform source root and the real verify-styling-contract script", () => {
    const root = cloneFixture();
    try {
      runCli(buildArgs(root));
      const gates = sectionOf(readFileSync(briefPath(root, "web-desktop", "atoms", "Button"), "utf8"), "Gates");
      const command = `node ${path.join(PLUGIN, "scripts/verify-styling-contract.mjs")} ${path.join(PLUGIN, "docs/styling-contracts/tailwind-web.md")} ${root}`;
      assert.ok(gates.includes(command), `styling gate command missing:\n${gates}`);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("with no capture command the render section tells the child to return blocked: no-render-command", () => {
    const root = cloneFixture();
    try {
      const manifestPath = path.join(root, "design/manifest.json");
      const manifest = readJson(manifestPath);
      delete manifest.platforms["web-desktop"].capture.command;
      writeJson(manifestPath, manifest);
      const { code, stderr } = runCli(buildArgs(root));
      assert.equal(code, 0, stderr);
      const render = sectionOf(readFileSync(briefPath(root, "web-desktop", "atoms", "Button"), "utf8"), "Render");
      assert.ok(render.includes("no-render-command"), "no-render-command reason missing");
      assert.ok(render.includes("status") && render.includes("blocked"), "blocked status instruction missing");
      assert.ok(!render.includes("PIXEL_PERFECT_CAPTURE_OUT="), "no render command may be invented");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("a tool with no adapter file falls back to generic.md", () => {
    const root = cloneFixture();
    try {
      setPlatformField(root, "style", "nativewind");
      runCli(buildArgs(root));
      const content = readFileSync(briefPath(root, "web-desktop", "atoms", "Button"), "utf8");
      const generic = path.join(PLUGIN, "docs/adapters/generic.md");
      assert.ok(existsSync(generic));
      assert.ok(sectionOf(content, "Stack").includes(generic), "generic adapter fallback missing from Stack");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("brief build: usage and configuration errors exit 2", () => {
  test("no arguments exits 2 with a usage line on stderr and nothing on stdout", () => {
    const { code, stdout, stderr } = runCli([]);
    assert.equal(code, 2);
    assert.equal(stdout, "");
    assert.match(stderr, /Usage/);
  });

  test("an unknown platform exits 2", () => {
    const root = cloneFixture();
    try {
      const { code, stdout, stderr } = runCli(buildArgs(root, { "--platform": "no-such-platform" }));
      assert.equal(code, 2);
      assert.equal(stdout, "");
      assert.match(stderr, /no-such-platform/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("an unknown item exits 2", () => {
    const root = cloneFixture();
    try {
      const { code, stderr } = runCli(buildArgs(root, { "--name": "NoSuchThing" }));
      assert.equal(code, 2);
      assert.match(stderr, /NoSuchThing/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("an unknown layer exits 2", () => {
    const root = cloneFixture();
    try {
      const { code } = runCli(buildArgs(root, { "--layer": "widgets" }));
      assert.equal(code, 2);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("a missing inventory exits 2", () => {
    const root = cloneFixture();
    try {
      unlinkSync(path.join(root, "design/inventory.json"));
      const { code, stderr } = runCli(buildArgs(root));
      assert.equal(code, 2);
      assert.match(stderr, /inventory/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("a missing manifest exits 2", () => {
    const root = cloneFixture();
    try {
      unlinkSync(path.join(root, "design/manifest.json"));
      const { code, stderr } = runCli(buildArgs(root));
      assert.equal(code, 2);
      assert.match(stderr, /manifest/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("a missing frames index exits 2", () => {
    const root = cloneFixture();
    try {
      unlinkSync(path.join(root, "design/reference/frames.json"));
      const { code, stderr } = runCli(buildArgs(root));
      assert.equal(code, 2);
      assert.match(stderr, /frames/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("a frame id absent from the frames index exits 2 and names it", () => {
    const root = cloneFixture();
    try {
      const inventoryPath = path.join(root, "design/inventory.json");
      const inventory = readJson(inventoryPath);
      inventory.atoms.find((a) => a.name === "Button").appears_on.push("brief-deck/09");
      writeJson(inventoryPath, inventory);
      const { code, stderr } = runCli(buildArgs(root));
      assert.equal(code, 2);
      assert.match(stderr, /brief-deck\/09/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("a PNG the frames index names but that is not on disk exits 2", () => {
    const root = cloneFixture();
    try {
      unlinkSync(path.join(root, "design/reference/brief-deck/01.png"));
      const { code, stderr } = runCli(buildArgs(root));
      assert.equal(code, 2);
      assert.match(stderr, /01\.png/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("an item with no manifest file or story exits 2 and tells the orchestrator to record them", () => {
    const root = cloneFixture();
    try {
      const manifestPath = path.join(root, "design/manifest.json");
      const manifest = readJson(manifestPath);
      delete manifest.platforms["web-desktop"].atoms.find((a) => a.name === "Button").file;
      writeJson(manifestPath, manifest);
      const { code, stdout, stderr } = runCli(buildArgs(root));
      assert.equal(code, 2);
      assert.equal(stdout, "");
      assert.match(stderr, /file and story/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("brief wrap", () => {
  const TASK = "# Custom task\n\nBuild the thing exactly as written.\nLiteral <<NOT_A_PLACEHOLDER>> stays.\n";

  test("a task file is wrapped verbatim after the agent prompt and design contract", () => {
    const root = cloneFixture();
    const dir = tempDir();
    try {
      const taskPath = path.join(dir, "task.md");
      writeFileSync(taskPath, TASK);
      const { code, stdout, stderr } = runCli(["wrap", root, "--slug", "custom-check", taskPath]);
      const file = path.join(root, "design/.briefs/custom-check.md");
      assert.equal(code, 0, stderr);
      assert.equal(stdout, SUCCESS_LINE(file));
      const content = readFileSync(file, "utf8");
      assert.ok(content.includes(designerPromptBody()), "agent prompt missing from wrap");
      assert.ok(content.includes(readFileSync(CONTRACT_SRC, "utf8")), "design contract missing from wrap");
      assert.ok(content.endsWith(TASK), "the task text must end the brief verbatim");
      assert.ok(content.indexOf(designerPromptBody()) < content.indexOf(TASK), "task must come after the prompt");
    } finally {
      rmSync(root, { recursive: true, force: true });
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("a task read from stdin with - is wrapped verbatim too", () => {
    const root = cloneFixture();
    try {
      const { code, stdout, stderr } = runCli(["wrap", root, "--slug", "stdin-check", "-"], TASK);
      const file = path.join(root, "design/.briefs/stdin-check.md");
      assert.equal(code, 0, stderr);
      assert.equal(stdout, SUCCESS_LINE(file));
      assert.ok(readFileSync(file, "utf8").endsWith(TASK), "stdin task must end the brief verbatim");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("two wraps of the same input produce byte-identical files", () => {
    const root = cloneFixture();
    const dir = tempDir();
    try {
      const taskPath = path.join(dir, "task.md");
      writeFileSync(taskPath, TASK);
      const file = path.join(root, "design/.briefs/repeat.md");
      runCli(["wrap", root, "--slug", "repeat", taskPath]);
      const first = readFileSync(file);
      runCli(["wrap", root, "--slug", "repeat", taskPath]);
      assert.ok(first.equals(readFileSync(file)), "wrap bytes differ between runs");
    } finally {
      rmSync(root, { recursive: true, force: true });
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("a slug outside [a-z0-9-] exits 2 and writes nothing", () => {
    const root = cloneFixture();
    const dir = tempDir();
    try {
      const taskPath = path.join(dir, "task.md");
      writeFileSync(taskPath, TASK);
      for (const slug of ["Bad_Slug", "../escape", "has space", "UPPER", ""]) {
        const { code, stdout } = runCli(["wrap", root, "--slug", slug, taskPath]);
        assert.equal(code, 2, `slug ${JSON.stringify(slug)} must exit 2`);
        assert.equal(stdout, "");
      }
      assert.ok(!existsSync(path.join(root, "design/escape.md")), "a rejected slug must not write outside .briefs");
      assert.ok(!existsSync(path.join(root, "design/.briefs")) || readdirSync(path.join(root, "design/.briefs")).length === 0, "a rejected slug must write no brief");
    } finally {
      rmSync(root, { recursive: true, force: true });
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("a task file that does not exist exits 2", () => {
    const root = cloneFixture();
    try {
      const { code, stderr } = runCli(["wrap", root, "--slug", "missing", path.join(root, "no-such-task.md")]);
      assert.equal(code, 2);
      assert.match(stderr, /no-such-task\.md/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("wrap without --slug exits 2", () => {
    const root = cloneFixture();
    const dir = tempDir();
    try {
      const taskPath = path.join(dir, "task.md");
      writeFileSync(taskPath, TASK);
      const { code } = runCli(["wrap", root, taskPath]);
      assert.equal(code, 2);
    } finally {
      rmSync(root, { recursive: true, force: true });
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// Review round 2: path safety, atomic writes, contract sources, quoting, render
// semantics, fallbacks, and template wording. Each assertion names concrete text.
// ---------------------------------------------------------------------------

function briefsDirOf(root) {
  return path.join(root, "design/.briefs");
}

function tmpLeftovers(dir) {
  return existsSync(dir) ? readdirSync(dir).filter((name) => name.endsWith(".tmp")) : [];
}

function taskPart(content) {
  return content.slice(content.indexOf("# Part 3: task"));
}

describe("brief: path safety", () => {
  test("an item name with path separators exits 2 and writes nothing outside design/.briefs", () => {
    const root = cloneFixture();
    try {
      const evil = "../../../../evilA";
      const inventoryPath = path.join(root, "design/inventory.json");
      const inventory = readJson(inventoryPath);
      inventory.atoms.push({ name: evil, states: ["default"], undrawn: "hostile name used only to test path safety" });
      writeJson(inventoryPath, inventory);
      const manifestPath = path.join(root, "design/manifest.json");
      const manifest = readJson(manifestPath);
      manifest.platforms["web-desktop"].atoms.push({ name: evil, file: "src/evil.tsx", story: "src/evil.stories.tsx", status: "pending" });
      writeJson(manifestPath, manifest);
      const { code, stdout, stderr } = runCli(buildArgs(root, { "--name": evil }));
      assert.equal(code, 2, stderr);
      assert.equal(stdout, "");
      assert.ok(!existsSync(path.join(root, "evilA.md")), "the item name escaped design/.briefs and wrote evilA.md at the project root");
      assert.equal(existsSync(briefsDirOf(root)), false, "nothing may be created before the name is validated");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("a platform id with path separators exits 2 and writes nothing outside design/.briefs", () => {
    const root = cloneFixture();
    try {
      const key = `../../../pp-evil-${randomUUID().slice(0, 8)}`;
      const manifestPath = path.join(root, "design/manifest.json");
      const manifest = readJson(manifestPath);
      manifest.platforms[key] = manifest.platforms["web-desktop"];
      writeJson(manifestPath, manifest);
      const escaped = path.resolve(briefsDirOf(root), key, "atoms-Button.md");
      const { code, stdout, stderr } = runCli(buildArgs(root, { "--platform": key }));
      assert.equal(code, 2, stderr);
      assert.equal(stdout, "");
      assert.match(stderr, /--platform must be a plain name/, "the platform id must be rejected by name validation");
      assert.ok(!existsSync(escaped), `the platform id escaped design/.briefs: ${escaped}`);
      assert.equal(existsSync(briefsDirOf(root)), false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("an item name with a newline exits 2 with a single stderr line and nothing on stdout", () => {
    const root = cloneFixture();
    try {
      const bad = "Bad\nName";
      const inventoryPath = path.join(root, "design/inventory.json");
      const inventory = readJson(inventoryPath);
      inventory.atoms.push({ name: bad, states: ["default"], undrawn: "control character used only to test safety" });
      writeJson(inventoryPath, inventory);
      const { code, stdout, stderr } = runCli(buildArgs(root, { "--name": bad }));
      assert.equal(code, 2);
      assert.equal(stdout, "");
      assert.equal(stderr.trim().split("\n").length, 1, `stderr must be one line: ${JSON.stringify(stderr)}`);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("a wrap slug containing a slash or a newline exits 2 and writes nothing", () => {
    const root = cloneFixture();
    try {
      for (const slug of ["a/b", "x\ny"]) {
        const { code, stdout } = runCli(["wrap", root, "--slug", slug, "-"], "task\n");
        assert.equal(code, 2, `slug ${JSON.stringify(slug)} must exit 2`);
        assert.equal(stdout, "");
      }
      assert.equal(existsSync(briefsDirOf(root)), false, "a rejected slug must write no brief");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("a design/.briefs symlink that points outside the project exits 2 for build and wrap", () => {
    const root = cloneFixture();
    const outside = mkdtempSync(path.join(tmpdir(), "pp-brief-outside-"));
    try {
      symlinkSync(outside, briefsDirOf(root));
      const built = runCli(buildArgs(root));
      assert.equal(built.code, 2, built.stderr);
      assert.equal(built.stdout, "");
      assert.match(built.stderr, /symlink/);
      assert.deepEqual(readdirSync(outside), [], "build wrote through the symlink");
      const wrapped = runCli(["wrap", root, "--slug", "linked", "-"], "task text\n");
      assert.equal(wrapped.code, 2, wrapped.stderr);
      assert.deepEqual(readdirSync(outside), [], "wrap wrote through the symlink");
    } finally {
      rmSync(root, { recursive: true, force: true });
      rmSync(outside, { recursive: true, force: true });
    }
  });

  test("a brief target that is an existing directory exits 2 and leaves no temp file", () => {
    const root = cloneFixture();
    try {
      const target = path.join(briefsDirOf(root), "web-desktop/atoms-Button.md");
      mkdirSync(target, { recursive: true });
      const { code, stdout, stderr } = runCli(buildArgs(root));
      assert.equal(code, 2, stderr);
      assert.equal(stdout, "");
      assert.equal(stderr.trim().split("\n").length, 1, `stderr must be one line: ${JSON.stringify(stderr)}`);
      assert.ok(statSync(target).isDirectory(), "the existing directory must be left alone");
      assert.deepEqual(tmpLeftovers(path.dirname(target)), [], "a .tmp file was left behind");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("a wrap target that is an existing directory exits 2 and leaves no temp file", () => {
    const root = cloneFixture();
    try {
      const target = path.join(briefsDirOf(root), "dir-target.md");
      mkdirSync(target, { recursive: true });
      const { code, stderr } = runCli(["wrap", root, "--slug", "dir-target", "-"], "task text\n");
      assert.equal(code, 2, stderr);
      assert.deepEqual(tmpLeftovers(briefsDirOf(root)), [], "a .tmp file was left behind");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("a frame PNG path that escapes the reference directory exits 2", () => {
    const root = cloneFixture();
    try {
      const indexPath = path.join(root, "design/reference/frames.json");
      const index = readJson(indexPath);
      index.frames[0].png = "../../../../outside.png";
      writeJson(indexPath, index);
      const { code, stderr } = runCli(buildArgs(root));
      assert.equal(code, 2);
      assert.match(stderr, /escapes root/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("a manifest file path that escapes the source root exits 2 and writes no brief", () => {
    const root = cloneFixture();
    try {
      const manifestPath = path.join(root, "design/manifest.json");
      const manifest = readJson(manifestPath);
      manifest.platforms["web-desktop"].atoms.find((a) => a.name === "Button").file = "../escape.tsx";
      writeJson(manifestPath, manifest);
      const { code, stderr } = runCli(buildArgs(root));
      assert.equal(code, 2);
      assert.match(stderr, /escapes root/);
      assert.equal(existsSync(briefPath(root, "web-desktop", "atoms", "Button")), false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("brief: contract sources and enforcement", () => {
  test("a researched styling contract resolves under design/research/styling", () => {
    const root = cloneFixture();
    try {
      setPlatformField(root, "style_contract_source", "researched");
      const researched = path.join(root, "design/research/styling/tailwind-web.md");
      mkdirSync(path.dirname(researched), { recursive: true });
      writeFileSync(researched, "# Researched styling contract\n");
      const { code, stderr } = runCli(buildArgs(root));
      assert.equal(code, 0, stderr);
      const content = readFileSync(briefPath(root, "web-desktop", "atoms", "Button"), "utf8");
      assert.ok(content.split("\n").includes(`- Styling contract: tailwind-web (source: researched, enforcement: hard-fail). Read it first: ${researched}`), "researched path missing from Stack");
      assert.ok(sectionOf(content, "Gates").includes(`node ${path.join(PLUGIN, "scripts/verify-styling-contract.mjs")} ${researched} ${root}`), "gate must use the researched file");
      assert.ok(!content.includes(path.join(PLUGIN, "docs/styling-contracts/tailwind-web.md")), "researched source must not resolve to the built-in file");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("a missing researched contract file exits 2 and names its path", () => {
    const root = cloneFixture();
    try {
      setPlatformField(root, "style_contract_source", "researched");
      const { code, stderr } = runCli(buildArgs(root));
      assert.equal(code, 2);
      assert.ok(stderr.includes(path.join(root, "design/research/styling/tailwind-web.md")), stderr);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("an unknown contract source exits 2", () => {
    const root = cloneFixture();
    try {
      setPlatformField(root, "style_contract_source", "bogus");
      const { code, stderr } = runCli(buildArgs(root));
      assert.equal(code, 2);
      assert.match(stderr, /style_contract_source/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("a contract source set with no contract id exits 2", () => {
    const root = cloneFixture();
    try {
      setPlatformField(root, "style_contract", undefined);
      const { code, stderr } = runCli(buildArgs(root));
      assert.equal(code, 2);
      assert.match(stderr, /style_contract/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("an invalid enforcement value exits 2", () => {
    const root = cloneFixture();
    try {
      setPlatformField(root, "style_contract_enforcement", "strict");
      const { code, stderr } = runCli(buildArgs(root));
      assert.equal(code, 2);
      assert.match(stderr, /style_contract_enforcement/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("default enforcement is hard-fail when the field is absent", () => {
    const root = cloneFixture();
    try {
      setPlatformField(root, "style_contract_enforcement", undefined);
      const { code, stderr } = runCli(buildArgs(root));
      assert.equal(code, 0, stderr);
      const content = readFileSync(briefPath(root, "web-desktop", "atoms", "Button"), "utf8");
      assert.ok(sectionOf(content, "Gates").split("\n").includes("- Styling contract (tailwind-web, hard-fail):"), "default must gate as hard-fail");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("enforcement off states the exact sentence and does not run the gate", () => {
    const root = cloneFixture();
    try {
      setPlatformField(root, "style_contract_enforcement", "off");
      const { code, stderr } = runCli(buildArgs(root));
      assert.equal(code, 0, stderr);
      const content = readFileSync(briefPath(root, "web-desktop", "atoms", "Button"), "utf8");
      const contract = path.join(PLUGIN, "docs/styling-contracts/tailwind-web.md");
      assert.ok(
        content.split("\n").includes(`- Styling contract: tailwind-web (source: builtin, enforcement: off). Read it first: ${contract} Enforcement is off, so its gate is not run.`),
        "exact off sentence missing from Stack",
      );
      assert.ok(!sectionOf(content, "Gates").includes(contract), "an off contract's gate must not run");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("brief: wrap input and findings", () => {
  test("wrap with an empty task file exits 2 and writes nothing", () => {
    const root = cloneFixture();
    const dir = tempDir();
    try {
      const taskPath = path.join(dir, "empty.md");
      writeFileSync(taskPath, "");
      const { code, stdout } = runCli(["wrap", root, "--slug", "empty-file", taskPath]);
      assert.equal(code, 2);
      assert.equal(stdout, "");
      assert.equal(existsSync(path.join(briefsDirOf(root), "empty-file.md")), false);
    } finally {
      rmSync(root, { recursive: true, force: true });
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("wrap with whitespace-only stdin exits 2 and writes nothing", () => {
    const root = cloneFixture();
    try {
      const { code, stdout } = runCli(["wrap", root, "--slug", "blank-stdin", "-"], "  \n\n");
      assert.equal(code, 2);
      assert.equal(stdout, "");
      assert.equal(existsSync(path.join(briefsDirOf(root), "blank-stdin.md")), false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("a findings file that contains a ``` fence still yields a well-formed brief", () => {
    const root = cloneFixture();
    const dir = tempDir();
    try {
      const findingsPath = path.join(dir, "findings.json");
      const text = JSON.stringify({ findings: [{ id: "F1", problem: "wrap the sample in a ```tsx block" }] }, null, 2);
      writeFileSync(findingsPath, text + "\n");
      const { code, stderr } = runCli(buildArgs(root, { "--findings": findingsPath }));
      assert.equal(code, 0, stderr);
      const content = readFileSync(briefPath(root, "web-desktop", "atoms", "Button"), "utf8");
      const lines = content.split("\n");
      assert.equal(lines.filter((line) => line === "````json").length, 1, "the outer fence must be four backticks");
      assert.equal(lines.filter((line) => line === "````").length, 1, "the closing fence must be four backticks");
      assert.ok(content.includes("````json\n" + text + "\n````\n"), "findings text must sit inside the four-backtick fence");
    } finally {
      rmSync(root, { recursive: true, force: true });
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("section removal never leaves more than one blank line in a row in the task", () => {
    const root = cloneFixture();
    const dir = tempDir();
    try {
      runCli(buildArgs(root));
      const plain = taskPart(readFileSync(briefPath(root, "web-desktop", "atoms", "Button"), "utf8"));
      assert.ok(!/\n\n\n/.test(plain), "a removed section left two or more blank lines in a row");
      const findingsPath = path.join(dir, "findings.json");
      writeFileSync(findingsPath, "{\"findings\":[]}\n");
      runCli(buildArgs(root, { "--name": "SearchBar", "--layer": "molecules" }));
      runCli(buildArgs(root, { "--findings": findingsPath }));
      const withFindings = taskPart(readFileSync(briefPath(root, "web-desktop", "atoms", "Button"), "utf8"));
      assert.ok(!/\n\n\n/.test(withFindings), "findings section left blank-line runs");
    } finally {
      rmSync(root, { recursive: true, force: true });
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("brief: quoting, fallbacks, and screens without frames", () => {
  test("a project path with a space is quoted in the render and gate command lines", () => {
    const parent = mkdtempSync(path.join(tmpdir(), "pp-brief-space-"));
    const root = path.join(parent, "my project");
    cpSync(FIXTURE_SRC, root, { recursive: true });
    try {
      const { code, stderr } = runCli(buildArgs(root));
      assert.equal(code, 0, stderr);
      const content = readFileSync(briefPath(root, "web-desktop", "atoms", "Button"), "utf8");
      const out = path.join(root, "design/.captures/web-desktop-item");
      const renderLine = `    rm -rf '${out}/atoms/Button' && PIXEL_PERFECT_CAPTURE_OUT='${out}' PIXEL_PERFECT_CAPTURE_ONLY=atoms/Button npm run sandbox:capture`;
      assert.ok(sectionOf(content, "Render").split("\n").includes(renderLine), `exact render line missing:\n${sectionOf(content, "Render")}`);
      const gateLine = `    node ${path.join(PLUGIN, "scripts/verify-styling-contract.mjs")} ${path.join(PLUGIN, "docs/styling-contracts/tailwind-web.md")} '${root}'`;
      assert.ok(sectionOf(content, "Gates").split("\n").includes(gateLine), `exact gate line missing:\n${sectionOf(content, "Gates")}`);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  test("a screen with no frame in any state gets the exact no-frame sentence and no state headings", () => {
    const root = cloneFixture();
    try {
      setItemStatus(root, "atoms", "Button", "verified");
      setItemStatus(root, "molecules", "SearchBar", "verified");
      const inventoryPath = path.join(root, "design/inventory.json");
      const inventory = readJson(inventoryPath);
      inventory.screens[0].states = [
        { name: "default", undrawn: "no frame draws the default state in this fixture" },
        { name: "results", undrawn: "no frame draws the results state in this fixture" },
      ];
      writeJson(inventoryPath, inventory);
      const { code, stderr } = runCli(buildArgs(root, { "--layer": "screens", "--name": "Library" }));
      assert.equal(code, 0, stderr);
      const frames = sectionOf(readFileSync(briefPath(root, "web-desktop", "screens", "Library"), "utf8"), "Frames");
      assert.ok(frames.trim().endsWith("No frame shows this item. The design contract and the project's theme tokens are the target."), frames);
      assert.ok(!frames.includes("### State"), "no state heading may appear when no state has frames");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("a platform whose framework has no adapter gets the exact fallback sentence", () => {
    const root = cloneFixture();
    try {
      runCli(buildArgs(root));
      const content = readFileSync(briefPath(root, "web-desktop", "atoms", "Button"), "utf8");
      assert.ok(
        content.split("\n").includes("- Framework adapter: none (no framework adapter named vite); follow the framework's own conventions."),
        "exact framework fallback sentence missing",
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("a platform with no framework recorded gets the exact no-framework sentence", () => {
    const root = cloneFixture();
    try {
      setPlatformField(root, "framework", undefined);
      runCli(buildArgs(root));
      const content = readFileSync(briefPath(root, "web-desktop", "atoms", "Button"), "utf8");
      assert.ok(content.split("\n").includes("- Framework adapter: none recorded; follow the framework's own conventions."));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("brief: render semantics (pixels field) and stale output", () => {
  test("an image platform deletes its output folder first and asks for one PNG per state", () => {
    const root = cloneFixture();
    try {
      const { code, stderr } = runCli(buildArgs(root));
      assert.equal(code, 0, stderr);
      const content = readFileSync(briefPath(root, "web-desktop", "atoms", "Button"), "utf8");
      const out = path.join(root, "design/.captures/web-desktop-item");
      const render = sectionOf(content, "Render");
      assert.ok(render.split("\n").includes(`    rm -rf ${out}/atoms/Button && PIXEL_PERFECT_CAPTURE_OUT=${out} PIXEL_PERFECT_CAPTURE_ONLY=atoms/Button npm run sandbox:capture`), render);
      assert.ok(render.includes(`It writes one image per state at ${out}/atoms/Button/<state>.png.`), render);
      assert.ok(!render.includes("text artifact"), "an image platform must not be described as text");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("a platform with pixels none and a reason gets a text render, not an image promise", () => {
    const root = cloneFixture();
    try {
      const { code, stderr } = runCli(buildArgs(root, { "--platform": "terminal-cli" }));
      assert.equal(code, 0, stderr);
      const content = readFileSync(briefPath(root, "terminal-cli", "atoms", "Button"), "utf8");
      const out = path.join(root, "design/.captures/terminal-cli-item");
      const render = sectionOf(content, "Render");
      assert.ok(render.split("\n").includes(`    rm -rf ${out}/atoms/Button && PIXEL_PERFECT_CAPTURE_OUT=${out} PIXEL_PERFECT_CAPTURE_ONLY=atoms/Button npm run sandbox:capture`), render);
      assert.ok(render.includes(`one text artifact per state under ${out}/atoms/Button/`), render);
      assert.ok(render.includes("compare its text render with its frame"), render);
      assert.ok(!render.includes("<state>.png"), "a text platform must not promise PNG images");
      assert.ok(render.includes("terminal UI: the sandbox renders text, not pixels"), "the manifest reason must be stated");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("pixels none without a reason is treated as image-required", () => {
    const root = cloneFixture();
    try {
      const manifestPath = path.join(root, "design/manifest.json");
      const manifest = readJson(manifestPath);
      delete manifest.platforms["terminal-cli"].capture.pixels_reason;
      writeJson(manifestPath, manifest);
      const { code, stderr } = runCli(buildArgs(root, { "--platform": "terminal-cli" }));
      assert.equal(code, 0, stderr);
      const render = sectionOf(readFileSync(briefPath(root, "terminal-cli", "atoms", "Button"), "utf8"), "Render");
      assert.ok(render.includes("<state>.png"), "without a reason the platform must be image-required");
      assert.ok(!render.includes("text artifact"));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("a platform with no pixels field is treated as image-required", () => {
    const root = cloneFixture();
    try {
      const manifestPath = path.join(root, "design/manifest.json");
      const manifest = readJson(manifestPath);
      delete manifest.platforms["web-desktop"].capture.pixels;
      writeJson(manifestPath, manifest);
      runCli(buildArgs(root));
      const render = sectionOf(readFileSync(briefPath(root, "web-desktop", "atoms", "Button"), "utf8"), "Render");
      assert.ok(render.includes("<state>.png"));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("the template tells the child to return blocked with reason gate-failed and the gate output in notes", () => {
    const root = cloneFixture();
    try {
      runCli(buildArgs(root));
      const steps = sectionOf(readFileSync(briefPath(root, "web-desktop", "atoms", "Button"), "utf8"), "Steps");
      assert.ok(steps.includes("return status blocked with reason gate-failed, and put the gate's output in notes"), steps);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("the reuse step reads correctly whether or not the brief has a Composes section", () => {
    const root = cloneFixture();
    try {
      runCli(buildArgs(root));
      const content = readFileSync(briefPath(root, "web-desktop", "atoms", "Button"), "utf8");
      assert.ok(!content.includes("## Composes"), "Button has no Composes section");
      const steps = sectionOf(content, "Steps");
      assert.ok(steps.includes("the components this brief lists to build on"), steps);
      assert.ok(!steps.includes("under Composes"), "the reuse step must not point at a section that may be absent");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

// --- Per-layer rules, installed primitives, declared state, library wrappers ---

const LAYER_ITEM = { atoms: "Button", molecules: "SearchBar", organisms: "Panel", screens: "Library" };
// Each layer's story-title rule, as BUILD-BRIEF.md words it. Unique to its layer.
const LAYER_RULE = {
  atoms: "`Components/` prefix",
  molecules: "`Molecules/` prefix",
  organisms: "`Organisms/` prefix",
  screens: "`Screens/` prefix",
};
const STATE_PATTERNS = path.join(PLUGIN, "docs/state-patterns.md");

function patchManifest(root, mutate) {
  const manifestPath = path.join(root, "design/manifest.json");
  const manifest = readJson(manifestPath);
  mutate(manifest.platforms);
  writeJson(manifestPath, manifest);
}

// The fixture has no organism, and its molecule and screen compose atoms that are still
// pending. Add the organism and verify the composed items so every layer's brief can be built.
function prepareFixture(root) {
  const inventoryPath = path.join(root, "design/inventory.json");
  const inventory = readJson(inventoryPath);
  if (!(inventory.organisms ?? []).some((entry) => entry.name === "Panel")) {
    inventory.organisms = [...(inventory.organisms ?? []), { name: "Panel", composes: [] }];
    writeJson(inventoryPath, inventory);
  }
  patchManifest(root, (platforms) => {
    const organisms = platforms["web-desktop"].organisms ?? [];
    if (!organisms.some((entry) => entry.name === "Panel")) {
      organisms.push({ name: "Panel", file: "src/components/Panel.tsx", story: "src/components/Panel.stories.tsx", status: "pending" });
    }
    platforms["web-desktop"].organisms = organisms;
  });
  setItemStatus(root, "atoms", "Button", "verified");
  setItemStatus(root, "molecules", "SearchBar", "verified");
}

function buildLayer(root, layer, platform = "web-desktop") {
  prepareFixture(root);
  const result = runCli(buildArgs(root, { "--platform": platform, "--layer": layer, "--name": LAYER_ITEM[layer] }));
  assert.equal(result.code, 0, result.stderr);
  return readFileSync(briefPath(root, platform, layer, LAYER_ITEM[layer]), "utf8");
}

describe("brief build: per-layer rules", () => {
  test("each layer's brief carries the shared rules once and its own layer rules", () => {
    const root = cloneFixture();
    try {
      for (const layer of LAYERS) {
        const content = buildLayer(root, layer);
        assert.equal(content.split("## Rules for every layer").length - 1, 1, `${layer}: the shared rules appear once`);
        assert.ok(content.includes(`## Rules for ${layer}\n`), `${layer}: its own rules heading is present`);
        assert.ok(content.includes(LAYER_RULE[layer]), `${layer}: its story-title rule is present`);
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("no layer's brief carries another layer's rules", () => {
    const root = cloneFixture();
    try {
      for (const layer of LAYERS) {
        const content = buildLayer(root, layer);
        for (const other of LAYERS.filter((name) => name !== layer)) {
          assert.ok(!content.includes(`## Rules for ${other}\n`), `${layer} brief must not carry the ${other} rules`);
          assert.ok(!content.includes(LAYER_RULE[other]), `${layer} brief must not carry the ${other} story-title rule`);
        }
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("two builds of a screen and of a molecule produce byte-identical briefs", () => {
    const root = cloneFixture();
    try {
      for (const layer of ["screens", "molecules"]) {
        const first = buildLayer(root, layer);
        const second = buildLayer(root, layer);
        assert.equal(first, second, `${layer} brief must not vary between builds`);
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("the stack names the primitives scaffold installed when a component contract is in force", () => {
    const root = cloneFixture();
    try {
      patchManifest(root, (platforms) => {
        platforms["web-desktop"].scaffold = { components: ["Button", "Input"] };
      });
      assert.ok(buildLayer(root, "atoms").includes("- Installed library primitives: Button, Input.\n"));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("a component contract in force with no scaffold record says none recorded", () => {
    const root = cloneFixture();
    try {
      assert.ok(buildLayer(root, "atoms").includes("- Installed library primitives: none recorded.\n"));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("a platform with no component library gets no installed-primitive line and says no contract is in force", () => {
    const root = cloneFixture();
    try {
      const result = runCli(buildArgs(root, { "--platform": "terminal-cli", "--layer": "atoms", "--name": "Button" }));
      assert.equal(result.code, 0, result.stderr);
      const content = readFileSync(briefPath(root, "terminal-cli", "atoms", "Button"), "utf8");
      assert.ok(!content.includes("Installed library primitives"));
      assert.ok(content.includes("- Component contract: none in force"));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("a stateful molecule gets its declared state, its scenarios, and the state-patterns path", () => {
    const root = cloneFixture();
    try {
      patchManifest(root, (platforms) => {
        platforms["web-desktop"].molecules[0].state = {
          declared: [{ name: "query", type: "string", initial: "''" }],
          scenarios: ["empty", "typing"],
        };
      });
      const section = sectionOf(buildLayer(root, "molecules"), "Declared state");
      assert.ok(section.includes('"scenarios"'), section);
      assert.ok(section.includes('"typing"'), section);
      assert.ok(section.includes(STATE_PATTERNS), section);
      assert.ok(existsSync(STATE_PATTERNS));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("a pure-composition molecule says it declares no state", () => {
    const root = cloneFixture();
    try {
      patchManifest(root, (platforms) => {
        platforms["web-desktop"].molecules[0].state = null;
      });
      assert.ok(sectionOf(buildLayer(root, "molecules"), "Declared state").includes("This item declares no state."));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("a screen lists its states and the state-patterns path", () => {
    const root = cloneFixture();
    try {
      patchManifest(root, (platforms) => {
        platforms["web-desktop"].screens[0].states = ["default", "empty"];
      });
      const section = sectionOf(buildLayer(root, "screens"), "States");
      assert.ok(section.includes("default, empty"), section);
      assert.ok(section.includes(STATE_PATTERNS), section);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("an atom with no declared state or states gets neither state section", () => {
    const root = cloneFixture();
    try {
      const content = buildLayer(root, "atoms");
      assert.ok(!content.includes("## Declared state"));
      assert.ok(!content.includes("## States"));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("an item with an approved ecosystem library gets the wrapper rules and the library record", () => {
    const root = cloneFixture();
    try {
      patchManifest(root, (platforms) => {
        platforms["web-desktop"].atoms[0].ecosystemLib = {
          package: "@tanstack/react-table",
          version: "^8.20.0",
          purpose: "Headless table logic",
        };
      });
      const content = buildLayer(root, "atoms");
      assert.ok(content.includes("## Rules for a library wrapper"), "the wrapper rules are missing");
      assert.ok(content.includes('"package": "@tanstack/react-table"'), "the library record is missing");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("an item with no ecosystem library record gets no wrapper rules", () => {
    const root = cloneFixture();
    try {
      assert.ok(!buildLayer(root, "atoms").includes("## Rules for a library wrapper"));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
