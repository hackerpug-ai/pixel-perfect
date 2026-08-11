import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { AdapterBuildError, buildAdapters, loadCapabilities, renderAdapters } from "../scripts/build-adapters.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INTERACTIVE_WORKFLOWS = ["add-platform", "build", "init", "refine", "scaffold", "wireframe"];
const SILENT_WORKFLOWS = ["design-deconstruct", "research", "status", "verify"];
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

test("renderAdapters is deterministic and covers all 10×3 surfaces", async () => {
  const first = await renderAdapters(ROOT);
  const second = await renderAdapters(ROOT);
  assert.equal(first.capabilities.length, 10);
  assert.equal(first.files.size, 30);
  assert.deepEqual([...first.files.keys()].sort(), [...second.files.keys()].sort());
  for (const [relativePath, content] of first.files) {
    assert.equal(content, second.files.get(relativePath), relativePath);
    assert.ok(content.split("\n").length <= 24, `${relativePath} exceeds thin-adapter budget`);
  }

  for (const capability of first.capabilities) {
    const commandPath = `plugins/pixel-perfect/commands/${capability.name}.md`;
    const skillPath = `plugins/pixel-perfect/skills/${capability.name}/SKILL.md`;
    const opencodePath = `plugins/pixel-perfect/.opencode/commands/${capability.name}.md`;
    assert.ok(first.files.has(commandPath), commandPath);
    assert.ok(first.files.has(skillPath), skillPath);
    assert.ok(first.files.has(opencodePath), opencodePath);
    assert.equal(first.files.get(commandPath), first.files.get(opencodePath));
    assert.match(first.files.get(commandPath), /~\/\.cursor\/plugins\//);
    assert.doesNotMatch(first.files.get(skillPath), /Codex invocation/);
  }
});

test("buildAdapters --check passes on the clean repository tree", async () => {
  const result = await buildAdapters(ROOT, { check: true });
  assert.equal(result.mode, "check");
  assert.equal(result.capabilities, 10);
  assert.equal(result.surfaces, 30);
  assert.deepEqual(result.drifts, []);
});

test("buildAdapters --check fails with the mutated path", async () => {
  const relativePath = "plugins/pixel-perfect/commands/status.md";
  const source = path.join(ROOT, relativePath);
  const original = await readFile(source, "utf8");
  try {
    await writeFile(source, `${original}\n# drift\n`, "utf8");
    await assert.rejects(
      buildAdapters(ROOT, { check: true }),
      (error) =>
        error instanceof AdapterBuildError &&
        error.details.some((detail) => detail.includes(relativePath)),
    );
  } finally {
    await writeFile(source, original, "utf8");
  }
  await buildAdapters(ROOT, { check: true });
});
