#!/usr/bin/env node

import { lstat, readFile, readdir, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC_CAPABILITIES = [
  "add-platform",
  "build",
  "design-deconstruct",
  "init",
  "refine",
  "research",
  "scaffold",
  "status",
  "verify",
  "wireframe",
];

class RuntimePathError extends Error {
  constructor(details) {
    super("runtime path validation failed");
    this.details = details;
  }
}

async function exists(target) {
  try {
    await lstat(target);
    return true;
  } catch {
    return false;
  }
}

function cleanReference(reference) {
  return reference.split("#")[0].replace(/[.,;:]$/, "");
}

export async function checkRuntimePaths(root = REPOSITORY_ROOT) {
  const packageRoot = path.join(root, "plugins/pixel-perfect");
  const errors = [];

  for (const capability of PUBLIC_CAPABILITIES) {
    const commandPath = path.join(packageRoot, `commands/${capability}.md`);
    const opencodePath = path.join(packageRoot, `.opencode/commands/${capability}.md`);
    const codexPath = path.join(packageRoot, `skills/${capability}/SKILL.md`);
    const workflowPath = path.join(packageRoot, `workflows/${capability}.md`);

    try {
      const [opencode, command] = await Promise.all([readFile(opencodePath, "utf8"), readFile(commandPath, "utf8")]);
      if (opencode !== command) {
        errors.push(`OpenCode ${capability} adapter must be byte-identical to commands/${capability}.md`);
      }
    } catch (error) {
      errors.push(`cannot compare OpenCode ${capability} adapter: ${error.message}`);
    }

    try {
      const command = await readFile(commandPath, "utf8");
      for (const match of command.matchAll(/<plugin-root>\/([A-Za-z0-9._/-]+)/g)) {
        const target = path.join(packageRoot, cleanReference(match[1]));
        if (!(await exists(target))) errors.push(`missing command adapter target in commands/${capability}.md: ${match[1]}`);
      }
    } catch (error) {
      errors.push(`cannot inspect commands/${capability}.md: ${error.message}`);
    }

    try {
      const codex = await readFile(codexPath, "utf8");
      for (const match of codex.matchAll(/\]\(([^)]+)\)/g)) {
        if (/^[a-z]+:\/\//i.test(match[1])) continue;
        const target = path.resolve(path.dirname(codexPath), cleanReference(match[1]));
        if (!(await exists(target))) errors.push(`missing Codex adapter target in ${capability}: ${match[1]}`);
      }
    } catch (error) {
      errors.push(`cannot inspect Codex ${capability} adapter: ${error.message}`);
    }

    try {
      const workflow = await readFile(workflowPath, "utf8");
      if (!workflow.startsWith("# ")) errors.push(`canonical workflow has harness frontmatter: workflows/${capability}.md`);
      if (/\$ARGUMENTS|\$\{CLAUDE_PLUGIN_ROOT\}|agent:\s*primary/.test(workflow)) {
        errors.push(`canonical workflow contains adapter-specific syntax: workflows/${capability}.md`);
      }
    } catch (error) {
      errors.push(`cannot inspect workflows/${capability}.md: ${error.message}`);
    }
  }

  const pathBearingFiles = [
    ...PUBLIC_CAPABILITIES.map((name) => `workflows/${name}.md`),
    "workflows/RUNTIME-CONTRACT.md",
    "skills/process-context/SKILL.md",
    "docs/ecosystem-patterns.md",
    "docs/library-vetting-rubric.md",
    "docs/styling-contracts/README.md",
    "docs/component-contracts/README.md",
  ];
  for (const relativePath of pathBearingFiles) {
    let content;
    try {
      content = await readFile(path.join(packageRoot, relativePath), "utf8");
    } catch (error) {
      errors.push(`${relativePath}: ${error.message}`);
      continue;
    }
    for (const match of content.matchAll(/`((?:docs|workflows|skills|scripts)\/[^`\s|),;]+)/g)) {
      const reference = cleanReference(match[1]);
      if (/[{}*<>…]/.test(reference) || reference.endsWith("/")) continue;
      const target = path.join(packageRoot, reference);
      if (!(await exists(target))) errors.push(`${relativePath} references missing runtime path: ${reference}`);
    }
  }

  try {
    const opencodeEngine = await readFile(path.join(packageRoot, ".opencode/skills/deconstruct-engine/SKILL.md"), "utf8");
    for (const match of opencodeEngine.matchAll(/`\.pixel-perfect\/plugins\/pixel-perfect\/([^`]+)`/g)) {
      if (!(await exists(path.join(packageRoot, cleanReference(match[1]))))) {
        errors.push(`OpenCode deconstruct-engine references missing path: ${match[1]}`);
      }
    }
    const processContextTarget = await realpath(path.join(packageRoot, ".opencode/skills/process-context/SKILL.md"));
    if (processContextTarget !== path.join(packageRoot, "skills/process-context/SKILL.md")) {
      errors.push("OpenCode process-context must resolve to the canonical internal skill");
    }
  } catch (error) {
    errors.push(`cannot validate OpenCode internal skill paths: ${error.message}`);
  }

  const runtimeDirectories = ["commands", "skills", ".opencode/commands", "workflows"];
  for (const relativePath of runtimeDirectories) {
    try {
      if ((await readdir(path.join(packageRoot, relativePath))).length === 0) errors.push(`${relativePath} is empty`);
    } catch (error) {
      errors.push(`${relativePath}: ${error.message}`);
    }
  }

  if (errors.length) throw new RuntimePathError([...new Set(errors)]);
  return { checkedCapabilities: PUBLIC_CAPABILITIES.length, checkedFiles: pathBearingFiles.length };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  checkRuntimePaths()
    .then((result) => process.stdout.write(`runtime paths valid: ${result.checkedCapabilities} capabilities, ${result.checkedFiles} canonical files\n`))
    .catch((error) => {
      process.stderr.write(`${error.message}\n`);
      for (const detail of error.details ?? []) process.stderr.write(`- ${detail}\n`);
      process.exitCode = 1;
    });
}
