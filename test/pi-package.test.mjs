import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { access, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PACKAGE_ROOT = path.join(ROOT, "plugins/pixel-perfect");
const PI_BIN = path.join(ROOT, "node_modules/.bin/pi");
const CAPABILITIES = [
  "add-platform",
  "build",
  "evolve",
  "init",
  "refine",
  "research",
  "scaffold",
  "status",
  "verify",
  "wireframe",
];
const PI_COMMANDS = CAPABILITIES.map((name) => `skill:pixel-perfect-${name}`).sort();

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? ROOT,
      env: options.env ?? process.env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code, signal) => resolve({ code, signal, stdout, stderr }));
    child.stdin.end(options.input ?? "");
  });
}

async function packPackage(directory) {
  const result = await run("npm", ["pack", "--json", "--pack-destination", directory, PACKAGE_ROOT]);
  assert.equal(result.code, 0, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  assert.equal(report.length, 1);
  return path.join(directory, report[0].filename);
}

test("pi package manifest exposes only namespaced Pixel Perfect skills", async () => {
  const manifest = JSON.parse(await readFile(path.join(PACKAGE_ROOT, "package.json"), "utf8"));
  assert.equal(manifest.name, "@hackerpug-ai/pixel-perfect");
  assert.equal(manifest.version, "9.1.0");
  assert.ok(manifest.keywords.includes("pi-package"));
  assert.deepEqual(manifest.pi, { skills: ["./.pi/skills"] });
  assert.equal(manifest.publishConfig.access, "public");
  assert.equal(manifest.private, undefined);
});

test("npm pack contains the canonical runtime and every pi adapter", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "pixel-perfect-pi-pack-"));
  try {
    const tarball = await packPackage(directory);
    const result = await run("tar", ["-tf", tarball]);
    assert.equal(result.code, 0, result.stderr);
    const entries = new Set(result.stdout.trim().split("\n"));
    assert.ok(entries.has("package/package.json"));
    assert.ok(entries.has("package/workflows/RUNTIME-CONTRACT.md"));
    assert.ok(entries.has("package/skills/process-context/SKILL.md"));
    for (const capability of CAPABILITIES) {
      assert.ok(entries.has(`package/workflows/${capability}.md`));
      assert.ok(entries.has(`package/skills/${capability}/SKILL.md`));
      assert.ok(entries.has(`package/.pi/skills/pixel-perfect-${capability}/SKILL.md`));
    }
    assert.equal([...entries].some((entry) => entry.includes("node_modules/")), false);
    assert.equal([...entries].some((entry) => entry.includes("CHANGE-PLAN.md")), false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("the real pi package manager installs the packed artifact and discovers every skill", { timeout: 30_000 }, async () => {
  await access(PI_BIN);
  const directory = await mkdtemp(path.join(tmpdir(), "pixel-perfect-pi-runtime-"));
  try {
    const tarball = await packPackage(directory);
    const extract = await run("tar", ["-xzf", tarball, "-C", directory]);
    assert.equal(extract.code, 0, extract.stderr);
    const packageRoot = path.join(directory, "package");
    const piHome = path.join(directory, "pi-home");
    const projectRoot = path.join(directory, "project");
    await mkdir(projectRoot);
    const env = { ...process.env, PI_CODING_AGENT_DIR: piHome, PI_OFFLINE: "1" };
    const install = await run(PI_BIN, ["install", packageRoot], { cwd: projectRoot, env });
    assert.equal(install.code, 0, install.stderr || install.stdout);
    const result = await run(
      PI_BIN,
      [
        "--mode",
        "rpc",
        "--offline",
        "--no-session",
        "--no-context-files",
        "--no-extensions",
        "--no-prompt-templates",
        "--no-themes",
      ],
      {
        cwd: projectRoot,
        env,
        input: '{"id":"pixel-perfect-commands","type":"get_commands"}\n',
      },
    );
    assert.equal(result.code, 0, result.stderr || result.stdout);
    const messages = result.stdout
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    const response = messages.find((message) => message.id === "pixel-perfect-commands");
    assert.equal(response?.success, true, result.stdout);
    const packageCommands = response.data.commands.filter(
      (command) => command.sourceInfo?.path?.startsWith(packageRoot),
    );
    const commands = packageCommands
      .map((command) => command.name)
      .sort();
    assert.deepEqual(commands, PI_COMMANDS);
    for (const command of packageCommands) {
      assert.ok(command.sourceInfo.path.startsWith(packageRoot), command.sourceInfo.path);
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
