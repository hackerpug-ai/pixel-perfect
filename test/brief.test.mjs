// Behavioral tests for scripts/brief.mjs against the real shipped files and a real-shaped
// fixture project (test/fixtures/brief-project). Every check runs the CLI as a child
// process and compares real bytes and real paths on disk. No mocks.

import assert from "node:assert/strict";
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync, unlinkSync } from "node:fs";
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

const EXPECTED_PLACEHOLDERS = ["COMPOSES", "FILES", "FRAMES", "GATES", "ITEM", "ITEM_ID", "PLATFORM", "PRIOR_FINDINGS", "RENDER", "STACK"];

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
        '"renders": [{"state": "", "png": ""}]',
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

  test("docs/BUILD-BRIEF.md holds one fenced block whose placeholders are exactly the documented set", () => {
    const lines = readFileSync(BUILD_BRIEF_SRC, "utf8").split("\n");
    const fenceAt = lines.flatMap((line, i) => (line.startsWith("```") ? [i] : []));
    assert.equal(fenceAt.length, 2, "BUILD-BRIEF.md must hold exactly one fenced block");
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
