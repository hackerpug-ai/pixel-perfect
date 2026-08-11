#!/usr/bin/env node

import { lstat, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PLUGIN_ROOT = "plugins/pixel-perfect";

const INTERACTIVE_COMMAND_BLOCK =
  "Collect every decision through the harness's structured question mechanism as the runtime contract's user choice protocol specifies — `AskUserQuestion` in Claude Code, one call per declared batch. Never print a decision as prose and end the turn.\n\n" +
  "Follow the runtime contract's turn shape. Open with a status digest of twelve lines or fewer — where the project stands, what the next move is, what is being asked — and put any longer analysis in the artifact the workflow names. Run no web search, no install, and no generation before the decision that authorizes it. When the invocation input does not resolve to exactly one thing, ask which was meant instead of guessing.";

const SILENT_SKILL_FOOTER =
  "Invoke with the active harness's syntax from the harness mappings table in the runtime contract, treat the user's remaining text as input, collect choices through that harness's input mechanism, and represent transient workflow tasks with its planning tools. Durable completion comes only from the manifest and required evidence.";

const INTERACTIVE_SKILL_FOOTER =
  "Invoke with the active harness's syntax from the harness mappings table in the runtime contract, treat the user's remaining text as input, collect choices through that harness's input mechanism one call per declared batch, never printing a decision as prose and ending the turn, and represent transient workflow tasks with its planning tools. Follow the runtime contract's turn shape: open with a status digest of twelve lines or fewer, write longer analysis to the artifact the workflow names, run no search, install, or generation before the decision authorizing it, and ask when the input does not resolve to exactly one thing. Durable completion comes only from the manifest and required evidence.";

export class AdapterBuildError extends Error {
  constructor(details) {
    super("adapter build failed");
    this.name = "AdapterBuildError";
    this.details = details;
  }
}

function renderTemplate(template, values) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!(key in values)) throw new Error(`missing template value: ${key}`);
    return values[key];
  });
}

function normalizeBody(text) {
  return `${text.replace(/\s+$/u, "")}\n`;
}

async function writeGeneratedFile(absolutePath, content) {
  try {
    const metadata = await lstat(absolutePath);
    if (metadata.isSymbolicLink()) await rm(absolutePath);
  } catch {
    // Missing path is fine; mkdir handles parents below.
  }
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
}

export async function loadCapabilities(root = REPOSITORY_ROOT) {
  const capabilitiesPath = path.join(root, "scripts/adapters/capabilities.json");
  const capabilities = JSON.parse(await readFile(capabilitiesPath, "utf8"));
  if (!Array.isArray(capabilities) || capabilities.length === 0) {
    throw new AdapterBuildError(["capabilities.json must be a non-empty array"]);
  }
  return capabilities;
}

export async function renderAdapters(root = REPOSITORY_ROOT) {
  const [commandTemplate, skillTemplate, capabilities] = await Promise.all([
    readFile(path.join(root, "scripts/adapters/command.template.md"), "utf8"),
    readFile(path.join(root, "scripts/adapters/skill.template.md"), "utf8"),
    loadCapabilities(root),
  ]);

  const files = new Map();
  for (const capability of capabilities) {
    const { name, title, description, preservation, interactive } = capability;
    if (!name || !title || !description || !preservation || typeof interactive !== "boolean") {
      throw new AdapterBuildError([`invalid capability entry: ${JSON.stringify(capability)}`]);
    }

    const commandBody = normalizeBody(
      renderTemplate(commandTemplate, {
        name,
        title,
        description,
        preservation,
        interactive_block: interactive ? `\n\n${INTERACTIVE_COMMAND_BLOCK}` : "",
      }),
    );

    const skillFooter = renderTemplate(interactive ? INTERACTIVE_SKILL_FOOTER : SILENT_SKILL_FOOTER, { name });
    const skillBody = normalizeBody(
      renderTemplate(skillTemplate, {
        name,
        title,
        description,
        preservation,
        skill_footer: skillFooter,
      }),
    );

    files.set(`${PLUGIN_ROOT}/commands/${name}.md`, commandBody);
    files.set(`${PLUGIN_ROOT}/skills/${name}/SKILL.md`, skillBody);
    files.set(`${PLUGIN_ROOT}/.opencode/commands/${name}.md`, commandBody);
  }
  return { capabilities, files };
}

export async function buildAdapters(root = REPOSITORY_ROOT, options = {}) {
  const check = Boolean(options.check);
  const { capabilities, files } = await renderAdapters(root);
  const drifts = [];

  for (const [relativePath, expected] of files) {
    const absolutePath = path.join(root, relativePath);
    if (check) {
      let actual;
      try {
        actual = await readFile(absolutePath, "utf8");
      } catch {
        drifts.push(relativePath);
        continue;
      }
      if (actual !== expected) drifts.push(relativePath);
      continue;
    }

    await writeGeneratedFile(absolutePath, expected);
  }

  if (check && drifts.length > 0) {
    throw new AdapterBuildError(drifts.map((relativePath) => `adapter drift: ${relativePath}`));
  }

  return {
    mode: check ? "check" : "write",
    capabilities: capabilities.length,
    surfaces: files.size,
    drifts,
  };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const check = process.argv.includes("--check");
  buildAdapters(REPOSITORY_ROOT, { check })
    .then((result) => {
      if (check) {
        process.stdout.write(
          `adapters in sync: ${result.capabilities} capabilities × 3 surfaces (${result.surfaces} files)\n`,
        );
      } else {
        process.stdout.write(
          `adapters written: ${result.capabilities} capabilities × 3 surfaces (${result.surfaces} files)\n`,
        );
      }
    })
    .catch((error) => {
      process.stderr.write(`${error.message}\n`);
      for (const detail of error.details ?? []) process.stderr.write(`- ${detail}\n`);
      process.exitCode = 1;
    });
}
