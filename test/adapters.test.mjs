import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { AdapterBuildError, buildAdapters, loadCapabilities, renderAdapters } from "../scripts/build-adapters.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INTERACTIVE_WORKFLOWS = ["add-platform", "assimilate", "build", "evolve", "init", "refine", "scaffold", "wireframe"];
const SILENT_WORKFLOWS = ["research", "status", "verify"];
const PUBLIC_CAPABILITIES = [...INTERACTIVE_WORKFLOWS, ...SILENT_WORKFLOWS].sort();

test("capabilities match interactive flags from validate-workflows", async () => {
  const capabilities = await loadCapabilities(ROOT);
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

test("renderAdapters is deterministic and covers all 11×4 surfaces", async () => {
  const first = await renderAdapters(ROOT);
  const second = await renderAdapters(ROOT);
  assert.equal(first.capabilities.length, 11);
  assert.equal(first.files.size, 44);
  assert.deepEqual([...first.files.keys()].sort(), [...second.files.keys()].sort());
  for (const [relativePath, content] of first.files) {
    assert.equal(content, second.files.get(relativePath), relativePath);
    assert.ok(content.split("\n").length <= 24, `${relativePath} exceeds thin-adapter budget`);
  }

  for (const capability of first.capabilities) {
    const commandPath = `plugins/pixel-perfect/commands/${capability.name}.md`;
    const skillPath = `plugins/pixel-perfect/skills/${capability.name}/SKILL.md`;
    const opencodePath = `plugins/pixel-perfect/.opencode/commands/${capability.name}.md`;
    const piPath = `plugins/pixel-perfect/.pi/skills/pixel-perfect-${capability.name}/SKILL.md`;
    assert.ok(first.files.has(commandPath), commandPath);
    assert.ok(first.files.has(skillPath), skillPath);
    assert.ok(first.files.has(opencodePath), opencodePath);
    assert.ok(first.files.has(piPath), piPath);
    assert.equal(first.files.get(commandPath), first.files.get(opencodePath));
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
  assert.equal(result.surfaces, 44);
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
    const catalog = await loadCapabilities(temp);
    catalog[0].description = 'Use "quotes": C:\\design and #tags safely';
    await writeFile(file, JSON.stringify(catalog));
    const { files } = await renderAdapters(temp);
    for (const entry of catalog) {
      for (const content of [...files.entries()].filter(([file]) => file.endsWith(`/${entry.name}.md`) || file.includes(`/${entry.name}/`) || file.includes(`/pixel-perfect-${entry.name}/`)).map(([, content]) => content)) {
        const description = content.split('\n').find((line) => line.startsWith('description: ')).slice(13);
        assert.equal(JSON.parse(description), entry.description);
        assert.ok(content.includes(entry.selection));
        assert.ok(content.includes(entry.inputs));
        assert.ok(content.includes(entry.outputs));
        assert.ok(content.includes(entry.example));
        for (const name of entry.handoffs) assert.ok(content.includes(`pixel-perfect:${name}`));
      }
    }
    catalog[0].handoffs = ['polish']; await writeFile(file, JSON.stringify(catalog));
    await assert.rejects(loadCapabilities(temp), /adapter build failed/);
    catalog[0].handoffs = ['status']; delete catalog[0].inputs; await writeFile(file, JSON.stringify(catalog));
    await assert.rejects(loadCapabilities(temp), /adapter build failed/);
  } finally { await rm(temp, { recursive: true, force: true }); }
});
