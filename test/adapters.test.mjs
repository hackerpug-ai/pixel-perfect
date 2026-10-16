import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";
import { AdapterBuildError, buildAdapters, loadCapabilities, renderAdapters } from "../scripts/build-adapters.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INTERACTIVE_WORKFLOWS = ["add-platform", "assimilate", "build", "evolve", "init", "refine", "scaffold", "wireframe"];
const SILENT_WORKFLOWS = ["research", "status", "verify"];
const PUBLIC_CAPABILITIES = [...INTERACTIVE_WORKFLOWS, ...SILENT_WORKFLOWS].sort();

test("capabilities match interactive flags from validate-workflows", async () => {
  const { capabilities } = await loadCapabilities(ROOT);
  const names = capabilities.map((entry) => entry.name).sort();
  assert.deepEqual(names, PUBLIC_CAPABILITIES);

  for (const capability of capabilities) {
    if (INTERACTIVE_WORKFLOWS.includes(capability.name)) {
      assert.equal(capability.interactive, true, `${capability.name} must be interactive`);
    } else if (SILENT_WORKFLOWS.includes(capability.name)) {
      assert.equal(capability.interactive, false, `${capability.name} must be silent`);
    } else {
      assert.fail(`unknown capability ${capability.name}`);
    }
  }
});

test("renderAdapters is deterministic and covers all 11×5 surfaces", async () => {
  const first = await renderAdapters(ROOT);
  const second = await renderAdapters(ROOT);
  assert.equal(first.capabilities.length, 11);
  assert.equal(first.files.size, 55);
  assert.deepEqual([...first.files.keys()].sort(), [...second.files.keys()].sort());
  for (const [relativePath, content] of first.files) {
    assert.equal(content, second.files.get(relativePath), relativePath);
    assert.ok(content.split("\n").length <= 24, `${relativePath} exceeds thin-adapter budget`);
  }

  for (const capability of first.capabilities) {
    const commandPath = `plugins/pixel-perfect/commands/${capability.name}.md`;
    const skillPath = `plugins/pixel-perfect/skills/${capability.name}/SKILL.md`;
    const cursorPath = `plugins/pixel-perfect/.cursor-plugin/commands/pixel-perfect-${capability.name}.md`;
    const opencodePath = `plugins/pixel-perfect/.opencode/commands/pixel-perfect/${capability.name}.md`;
    const piPath = `plugins/pixel-perfect/.pi/skills/pixel-perfect-${capability.name}/SKILL.md`;
    assert.ok(first.files.has(commandPath), commandPath);
    assert.ok(first.files.has(skillPath), skillPath);
    assert.ok(first.files.has(cursorPath), cursorPath);
    assert.ok(first.files.has(opencodePath), opencodePath);
    assert.ok(first.files.has(piPath), piPath);
    assert.equal(first.files.get(commandPath), first.files.get(opencodePath));
    assert.equal(first.files.get(cursorPath), first.files.get(commandPath));
    assert.match(first.files.get(commandPath), /~\/\.cursor\/plugins\//);
    assert.doesNotMatch(first.files.get(skillPath), /Codex invocation/);
    assert.match(first.files.get(piPath), new RegExp(`name: pixel-perfect-${capability.name}`));
    assert.match(first.files.get(piPath), new RegExp(`skills/${capability.name}/SKILL\\.md`));
    assert.match(first.files.get(piPath), new RegExp(`/skill:pixel-perfect-${capability.name}`));
  }
});

test("buildAdapters --check passes on the clean repository tree", async () => {
  const result = await buildAdapters(ROOT, { check: true });
  assert.equal(result.mode, "check");
  assert.equal(result.capabilities, 11);
  assert.equal(result.surfaces, 55);
  assert.deepEqual(result.drifts, []);
});

test("buildAdapters --check fails with the mutated path", async () => {
  const testRoot = await mkdtemp(path.join(tmpdir(), "pixel-perfect-adapter-drift-"));
  await mkdir(path.join(testRoot, "scripts"), { recursive: true });
  await cp(path.join(ROOT, "scripts/adapters"), path.join(testRoot, "scripts/adapters"), { recursive: true });
  await cp(path.join(ROOT, "plugins"), path.join(testRoot, "plugins"), { recursive: true });
  const relativePath = "plugins/pixel-perfect/commands/status.md";
  const source = path.join(testRoot, relativePath);
  const original = await readFile(source, "utf8");
  try {
    await writeFile(source, `${original}\n# drift\n`, "utf8");
    await assert.rejects(
      buildAdapters(testRoot, { check: true }),
      (error) =>
        error instanceof AdapterBuildError &&
        error.details.some((detail) => detail.includes(relativePath)),
    );
  } finally {
    await rm(testRoot, { recursive: true, force: true });
  }
  await buildAdapters(ROOT, { check: true });
});

test('selection metadata is complete and every surface includes it with escaped YAML descriptions', async () => {
  const temp = await mkdtemp(path.join(tmpdir(), 'pp-metadata-'));
  try {
    await mkdir(path.join(temp, 'scripts'), { recursive: true });
    await cp(path.join(ROOT, 'scripts/adapters'), path.join(temp, 'scripts/adapters'), { recursive: true });
    const file = path.join(temp, 'scripts/adapters/capabilities.json');
    const { naming, capabilities: catalog } = await loadCapabilities(temp);
    catalog[0].description = 'Use "quotes": C:\\design and #tags safely';
    await writeFile(file, JSON.stringify({ naming, capabilities: catalog }));
    const { files } = await renderAdapters(temp);
    for (const entry of catalog) {
      for (const content of [...files.entries()].filter(([file]) => file.endsWith(`/${entry.name}.md`) || file.endsWith(`/pixel-perfect-${entry.name}.md`) || file.includes(`/${entry.name}/`) || file.includes(`/pixel-perfect-${entry.name}/`)).map(([, content]) => content)) {
        const description = content.split('\n').find((line) => line.startsWith('description: ')).slice(13);
        assert.equal(JSON.parse(description), entry.description);
        assert.ok(content.includes(entry.selection));
        assert.ok(content.includes(entry.inputs));
        assert.ok(content.includes(entry.outputs));
        assert.ok(content.includes(entry.example));
        for (const name of entry.handoffs) assert.ok(content.includes(`pixel-perfect:${name}`));
      }
    }
    catalog[0].handoffs = ['polish']; await writeFile(file, JSON.stringify({ naming, capabilities: catalog }));
    await assert.rejects(loadCapabilities(temp), /adapter build failed/);
    catalog[0].handoffs = ['status']; delete catalog[0].inputs; await writeFile(file, JSON.stringify({ naming, capabilities: catalog }));
    await assert.rejects(loadCapabilities(temp), /adapter build failed/);
  } finally { await rm(temp, { recursive: true, force: true }); }
});

const OPENCODE_PLUGIN_PATH = "plugins/pixel-perfect/.opencode/plugins/pixel-perfect.ts";

test("OpenCode plugin module exports a Plugin function with no third-party imports, network, or writes", async () => {
  const source = await readFile(path.join(ROOT, OPENCODE_PLUGIN_PATH), "utf8");
  for (const match of source.matchAll(/^\s*import\s+(?:[^"']+\s+from\s+)?["']([^"']+)["']/gm)) {
    assert.ok(match[1].startsWith("node:"), `plugin must not import third-party module "${match[1]}"`);
  }
  assert.match(source, /export\s+(?:async\s+function|function|const)\s+PixelPerfectPlugin/);
  assert.doesNotMatch(source, /\b(fetch|XMLHttpRequest|WebSocket|http\.request|https\.request)\b/);
  assert.doesNotMatch(source, /\b(writeFile|writeFileSync|appendFile|appendFileSync|mkdir|mkdirSync|rm|rmSync|unlink|unlinkSync|rename|renameSync|copyFile|copyFileSync|truncate|truncateSync)\b/);
});

test("OpenCode plugin writes one structured stderr line only when the namespaced command link is missing", async () => {
  const moduleUrl = pathToFileURL(path.join(ROOT, OPENCODE_PLUGIN_PATH)).href;
  const plugin = await import(moduleUrl);

  const resolved = await mkdtemp(path.join(tmpdir(), "pp-opencode-plugin-resolved-"));
  const missing = await mkdtemp(path.join(tmpdir(), "pp-opencode-plugin-missing-"));
  try {
    await mkdir(path.join(resolved, ".opencode/commands/pixel-perfect"), { recursive: true });
    await writeFile(path.join(resolved, ".opencode/commands/pixel-perfect/init.md"), "x", "utf8");

    const originalWrite = process.stderr.write.bind(process.stderr);
    const captured = [];
    process.stderr.write = (chunk) => { captured.push(chunk); return true; };
    try {
      await plugin.PixelPerfectPlugin({ directory: resolved });
    } finally {
      process.stderr.write = originalWrite;
    }
    assert.deepEqual(captured, [], "plugin must be silent when the namespaced link resolves");

    const capturedMissing = [];
    process.stderr.write = (chunk) => { capturedMissing.push(chunk); return true; };
    try {
      await plugin.PixelPerfectPlugin({ directory: missing });
    } finally {
      process.stderr.write = originalWrite;
    }
    assert.equal(capturedMissing.length, 1, "plugin must write exactly one diagnostic line");
    const diagnostic = JSON.parse(capturedMissing[0]);
    assert.equal(diagnostic.plugin, "pixel-perfect");
    assert.equal(diagnostic.status, "missing");
    assert.equal(diagnostic.path, path.join(missing, ".opencode/commands/pixel-perfect/init.md"));
  } finally {
    await rm(resolved, { recursive: true, force: true });
    await rm(missing, { recursive: true, force: true });
  }
});

test("every rendered path derives from the per-surface naming rule", async () => {
  const { files, naming } = await renderAdapters(ROOT);
  const expected = new Set();
  for (const capability of (await loadCapabilities(ROOT)).capabilities) {
    for (const surface of Object.values(naming)) {
      expected.add(surface.path.replace(/\{name\}/g, capability.name));
    }
  }
  assert.deepEqual([...files.keys()].sort(), [...expected].sort());
});

test("RUNTIME-CONTRACT.md harness mappings agree with the rendered invocation names", async () => {
  const contract = await readFile(path.join(ROOT, "plugins/pixel-perfect/workflows/RUNTIME-CONTRACT.md"), "utf8");
  const { naming } = await loadCapabilities(ROOT);
  const harnessHeadings = { "Claude Code": "claude", Grok: "grok", Codex: "codex", OpenCode: "opencode", Pi: "pi", Cursor: "cursor" };
  for (const [heading, key] of Object.entries(harnessHeadings)) {
    const start = contract.indexOf(`### ${heading}`);
    assert.ok(start >= 0, `RUNTIME-CONTRACT.md has no "### ${heading}" section`);
    const rest = contract.slice(start);
    const end = rest.indexOf("\n### ", 1);
    const section = end === -1 ? rest : rest.slice(0, end);
    const invocationLine = section.split("\n").find((line) => /^- Invocation:/.test(line));
    assert.ok(invocationLine, `"### ${heading}" has no "- Invocation:" line`);
    const quoted = invocationLine.match(/`([^`]+)`/);
    assert.ok(quoted, `"### ${heading}" invocation is not backtick-quoted: ${invocationLine}`);
    const normalized = quoted[1].replace(/<name>/g, "{name}");
    assert.equal(normalized, naming[key].invocation, `"${heading}" invocation disagrees with the naming rule`);
  }
});
