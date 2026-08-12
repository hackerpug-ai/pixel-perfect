#!/usr/bin/env node

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PLUGIN_ROOT = "plugins/pixel-perfect";
const PUBLIC_CAPABILITIES = [
  "add-platform",
  "build",
  "design-deconstruct",
  "evolve",
  "init",
  "refine",
  "research",
  "scaffold",
  "status",
  "verify",
  "wireframe",
];
const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ALLOWED_FIELDS = new Set(["name", "description", "license", "compatibility", "metadata"]);

class SkillValidationError extends Error {
  constructor(details) {
    super("skill validation failed");
    this.details = details;
  }
}

function scalar(value) {
  const trimmed = value.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed.slice(1, -1);
    }
  }
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) return trimmed.slice(1, -1);
  return trimmed;
}

function parseFrontmatter(content, relativePath, errors) {
  if (!content.startsWith("---\n")) {
    errors.push(`${relativePath} must start with YAML frontmatter`);
    return {};
  }
  const end = content.indexOf("\n---\n", 4);
  if (end === -1) {
    errors.push(`${relativePath} has unterminated YAML frontmatter`);
    return {};
  }

  const metadata = {};
  for (const line of content.slice(4, end).split("\n")) {
    if (!line.trim() || /^\s/.test(line)) continue;
    const separator = line.indexOf(":");
    if (separator === -1) {
      errors.push(`${relativePath} has malformed frontmatter line: ${line}`);
      continue;
    }
    const key = line.slice(0, separator).trim();
    if (!ALLOWED_FIELDS.has(key)) errors.push(`${relativePath} has unsupported frontmatter field: ${key}`);
    metadata[key] = scalar(line.slice(separator + 1));
  }
  if (!content.slice(end + 5).trim()) errors.push(`${relativePath} has no skill instructions`);
  return metadata;
}

async function validateSkill(root, relativePath, errors) {
  let content;
  try {
    content = await readFile(path.join(root, relativePath), "utf8");
  } catch (error) {
    errors.push(`${relativePath}: ${error.message}`);
    return;
  }
  const metadata = parseFrontmatter(content, relativePath, errors);
  const directoryName = path.basename(path.dirname(relativePath));
  if (!SKILL_NAME.test(metadata.name ?? "")) errors.push(`${relativePath} has invalid skill name: ${metadata.name}`);
  if (metadata.name !== directoryName) errors.push(`${relativePath} name must match directory ${directoryName}`);
  if (typeof metadata.description !== "string" || metadata.description.length < 1 || metadata.description.length > 1024) {
    errors.push(`${relativePath} description must be 1-1024 characters`);
  }
  if (/\bautoActivate\b/.test(content)) errors.push(`${relativePath} contains unsupported autoActivate metadata`);
}

export async function validateSkills(root = REPOSITORY_ROOT) {
  const errors = [];
  const paths = [
    `${PLUGIN_ROOT}/skills/deconstruct-engine/SKILL.md`,
    `${PLUGIN_ROOT}/skills/process-context/SKILL.md`,
    `${PLUGIN_ROOT}/.opencode/skills/deconstruct-engine/SKILL.md`,
    `${PLUGIN_ROOT}/.opencode/skills/process-context/SKILL.md`,
    ...PUBLIC_CAPABILITIES.map((name) => `${PLUGIN_ROOT}/skills/${name}/SKILL.md`),
  ];
  await Promise.all(paths.map((relativePath) => validateSkill(root, relativePath, errors)));

  for (const adapterDirectory of [`${PLUGIN_ROOT}/commands`]) {
    let names = [];
    try {
      names = (await readdir(path.join(root, adapterDirectory)))
        .map((name) => name.replace(/\.md$/, ""))
        .sort();
    } catch (error) {
      errors.push(`${adapterDirectory}: ${error.message}`);
      continue;
    }
    if (JSON.stringify(names) !== JSON.stringify([...PUBLIC_CAPABILITIES].sort())) {
      errors.push(`${adapterDirectory} does not expose exactly the ${PUBLIC_CAPABILITIES.length} public capabilities`);
    }
  }
  try {
    const rootSkillNames = await readdir(path.join(root, `${PLUGIN_ROOT}/skills`));
    const publicSkillNames = rootSkillNames.filter((name) => PUBLIC_CAPABILITIES.includes(name)).sort();
    if (JSON.stringify(publicSkillNames) !== JSON.stringify([...PUBLIC_CAPABILITIES].sort())) {
      errors.push(`${PLUGIN_ROOT}/skills does not expose exactly the ${PUBLIC_CAPABILITIES.length} public capabilities`);
    }
  } catch (error) {
    errors.push(`${PLUGIN_ROOT}/skills: ${error.message}`);
  }

  for (const capability of PUBLIC_CAPABILITIES) {
    for (const relativePath of [
      `${PLUGIN_ROOT}/commands/${capability}.md`,
      `${PLUGIN_ROOT}/skills/${capability}/SKILL.md`,
    ]) {
      try {
        const content = await readFile(path.join(root, relativePath), "utf8");
        if (!content.includes("design/manifest.json") || !content.includes("process-context/SKILL.md")) {
          errors.push(`${relativePath} must explicitly load process-context when a manifest exists`);
        }
      } catch {
        // Missing files are reported by the package validator and skill checks.
      }
    }
  }

  if (errors.length) throw new SkillValidationError([...new Set(errors)]);
  return { count: paths.length, publicCapabilities: PUBLIC_CAPABILITIES.length };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  validateSkills()
    .then((result) => process.stdout.write(`skills valid: ${result.count} harness skill surfaces, ${result.publicCapabilities} public capabilities\n`))
    .catch((error) => {
      process.stderr.write(`${error.message}\n`);
      for (const detail of error.details ?? []) process.stderr.write(`- ${detail}\n`);
      process.exitCode = 1;
    });
}
