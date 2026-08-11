#!/usr/bin/env node

import { lstat, readFile, readdir, realpath, stat } from "node:fs/promises";
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
const INTERNAL_SKILLS = ["deconstruct-engine", "process-context"];
const PROHIBITED_SEGMENTS = new Set([".git", ".handoff", ".tmp", "node_modules", "planning"]);
const PROHIBITED_ROOT_FILES = new Set([
  "CHANGELOG.md",
  "plugin-release.json",
  "V4-DIRECTION.md",
  "package.json",
  "opencode.json",
]);

export class PackageValidationError extends Error {
  constructor(details) {
    super("package validation failed");
    this.name = "PackageValidationError";
    this.details = details;
  }
}

async function walk(directory, prefix = "") {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    output.push({ relativePath, entry });
    if (entry.isDirectory()) output.push(...(await walk(path.join(directory, entry.name), relativePath)));
  }
  return output;
}

async function requirePath(packageRoot, relativePath, errors) {
  try {
    await lstat(path.join(packageRoot, relativePath));
  } catch {
    errors.push(`missing required package path: ${relativePath}`);
  }
}

async function namesIn(directory, suffix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  return entries
    .filter((entry) => !suffix || entry.name.endsWith(suffix))
    .map((entry) => (suffix ? entry.name.slice(0, -suffix.length) : entry.name))
    .sort();
}

function compareNames(actual, expected, label, errors) {
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    errors.push(`${label} must be exactly [${wanted.join(", ")}]; found [${actual.join(", ")}]`);
  }
}

export async function validatePackage(root = REPOSITORY_ROOT) {
  const packageRoot = path.join(root, "plugins/pixel-perfect");
  const errors = [];
  const required = [
    ".claude-plugin/plugin.json",
    ".codex-plugin/plugin.json",
    ".cursor-plugin/plugin.json",
    ".opencode/package.json",
    ".opencode/package-lock.json",
    "assets/icon.png",
    "docs/DESIGN-CONTRACT.md",
    "docs/component-contracts/README.md",
    "docs/component-contracts/react-native-reusables.md",
    "docs/styling-contracts/README.md",
    "LICENSE",
    "scripts/verify-styling-contract.mjs",
    "skills/deconstruct-engine/SKILL.md",
    "skills/process-context/SKILL.md",
    "workflows/RUNTIME-CONTRACT.md",
  ];
  for (const capability of PUBLIC_CAPABILITIES) {
    required.push(
      `commands/${capability}.md`,
      `skills/${capability}/SKILL.md`,
      `.opencode/commands/${capability}.md`,
      `workflows/${capability}.md`,
    );
  }
  for (const skill of INTERNAL_SKILLS) required.push(`.opencode/skills/${skill}/SKILL.md`);
  await Promise.all(required.map((relativePath) => requirePath(packageRoot, relativePath, errors)));

  let entries = [];
  try {
    entries = await walk(packageRoot);
  } catch (error) {
    throw new PackageValidationError([`cannot inspect plugins/pixel-perfect: ${error.message}`]);
  }

  let totalBytes = 0;
  for (const { relativePath, entry } of entries) {
    const segments = relativePath.split("/");
    if (segments.some((segment) => PROHIBITED_SEGMENTS.has(segment))) {
      errors.push(`repository-only content is forbidden in package: ${relativePath}`);
    }
    if (segments[0] === "docs" && ["plans", "superpowers"].includes(segments[1])) {
      errors.push(`planning documentation is forbidden in package: ${relativePath}`);
    }
    if (segments.length === 1 && PROHIBITED_ROOT_FILES.has(relativePath)) {
      errors.push(`repository-only root file is forbidden in package: ${relativePath}`);
    }

    const absolutePath = path.join(packageRoot, relativePath);
    if (entry.isSymbolicLink()) {
      try {
        const resolved = await realpath(absolutePath);
        const boundary = `${packageRoot}${path.sep}`;
        if (resolved !== packageRoot && !resolved.startsWith(boundary)) {
          errors.push(`symlink escapes package: ${relativePath} -> ${resolved}`);
        }
      } catch (error) {
        errors.push(`broken package symlink: ${relativePath} (${error.message})`);
      }
    } else if (entry.isFile()) {
      totalBytes += (await stat(absolutePath)).size;
    }
  }
  if (totalBytes > 10 * 1024 * 1024) errors.push(`package is unexpectedly large: ${totalBytes} bytes`);

  try {
    compareNames(await namesIn(path.join(packageRoot, "commands"), ".md"), PUBLIC_CAPABILITIES, "Claude/OpenCode command adapters", errors);
    compareNames(await namesIn(path.join(packageRoot, ".opencode/commands"), ".md"), PUBLIC_CAPABILITIES, "OpenCode command adapters", errors);
    compareNames(
      await namesIn(path.join(packageRoot, "skills")),
      [...PUBLIC_CAPABILITIES, ...INTERNAL_SKILLS],
      "Codex and internal skills",
      errors,
    );
    compareNames(await namesIn(path.join(packageRoot, ".opencode/skills")), INTERNAL_SKILLS, "OpenCode internal skills", errors);
    compareNames(
      (await namesIn(path.join(packageRoot, "workflows"), ".md")).filter((name) => name !== "RUNTIME-CONTRACT"),
      PUBLIC_CAPABILITIES,
      "canonical workflows",
      errors,
    );
  } catch (error) {
    errors.push(`cannot enumerate package capabilities: ${error.message}`);
  }

  for (const capability of PUBLIC_CAPABILITIES) {
    for (const adapterPath of [`commands/${capability}.md`, `skills/${capability}/SKILL.md`]) {
      try {
        const lines = (await readFile(path.join(packageRoot, adapterPath), "utf8")).split("\n").length;
        if (lines > 24) errors.push(`adapter is not thin (${lines} lines): ${adapterPath}`);
      } catch {
        // Missing paths were already reported above.
      }
    }
  }

  const textExtensions = new Set([".json", ".md", ".mjs", ".js", ".css", ".html", ".py", ".sh"]);
  for (const { relativePath, entry } of entries) {
    if (!entry.isFile() && !entry.isSymbolicLink()) continue;
    if (!textExtensions.has(path.extname(relativePath)) && path.basename(relativePath) !== "LICENSE") continue;
    let content;
    try {
      content = await readFile(path.join(packageRoot, relativePath), "utf8");
    } catch {
      continue;
    }
    if (/\bautoActivate\b/.test(content)) errors.push(`unsupported autoActivate metadata in ${relativePath}`);
    if (/\bdesign-(?:planner|implementer|reviewer)\b/.test(content)) errors.push(`retired design agent referenced in ${relativePath}`);
    if (/\/Users\//.test(content) || /~\/Projects\//.test(content)) errors.push(`machine-specific path in ${relativePath}`);
  }

  try {
    const runtimeContract = await readFile(path.join(packageRoot, "workflows/RUNTIME-CONTRACT.md"), "utf8");
    const designContract = await readFile(path.join(packageRoot, "docs/DESIGN-CONTRACT.md"), "utf8");
    if (!runtimeContract.includes("frontend-designer") || !runtimeContract.includes("executes the same contract directly")) {
      errors.push("runtime contract must define frontend-designer and bundled direct-execution behavior");
    }
    if (!designContract.includes("real components") || !designContract.includes("deterministic gates")) {
      errors.push("bundled design contract is missing implementation or verification requirements");
    }
  } catch {
    // Required path checks report these files.
  }

  if (errors.length > 0) throw new PackageValidationError([...new Set(errors)]);
  return { packageRoot, capabilities: PUBLIC_CAPABILITIES.length, internalSkills: INTERNAL_SKILLS.length, totalBytes };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  validatePackage()
    .then((result) => {
      process.stdout.write(
        `package content valid: ${result.capabilities} public capabilities, ${result.internalSkills} internal skills, ${result.totalBytes} bytes\n`,
      );
    })
    .catch((error) => {
      process.stderr.write(`${error.message}\n`);
      for (const detail of error.details ?? []) process.stderr.write(`- ${detail}\n`);
      process.exitCode = 1;
    });
}
