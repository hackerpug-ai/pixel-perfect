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

// Per-surface naming rule, carried in scripts/adapters/capabilities.json as the
// single source of truth (see Goal C). Every rendered path and every invocation
// name below derives from it; there is no hardcoded surface table in code.
const SURFACE_KEYS = Object.freeze(["claude", "codex", "cursor", "grok", "opencode", "pi"]);
const SURFACE_KINDS = new Set(["command", "skill", "pi-skill"]);

function surfacePath(surface, name) {
  return surface.path.replace(/\{name\}/g, name);
}

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

function validateNaming(naming) {
  if (!naming || typeof naming !== "object" || Array.isArray(naming)) {
    throw new AdapterBuildError(["capabilities.json must carry a non-empty `naming` object"]);
  }
  const keys = Object.keys(naming);
  if (keys.length !== SURFACE_KEYS.length || SURFACE_KEYS.some((key) => !keys.includes(key))) {
    throw new AdapterBuildError([`naming must define exactly the surfaces: ${SURFACE_KEYS.join(", ")}`]);
  }
  for (const key of SURFACE_KEYS) {
    const surface = naming[key];
    if (!surface || typeof surface !== "object") throw new AdapterBuildError([`naming.${key} must be an object`]);
    if (typeof surface.path !== "string" || !surface.path.includes("{name}")) {
      throw new AdapterBuildError([`naming.${key}.path must include a {name} placeholder`]);
    }
    if (!SURFACE_KINDS.has(surface.kind)) {
      throw new AdapterBuildError([`naming.${key}.kind must be one of: ${[...SURFACE_KINDS].join(", ")}`]);
    }
    if (typeof surface.invocation !== "string" || !surface.invocation.includes("{name}")) {
      throw new AdapterBuildError([`naming.${key}.invocation must include a {name} placeholder`]);
    }
    // The rendered path must land inside the plugin tree so it ships with the package.
    if (!surface.path.startsWith(`${PLUGIN_ROOT}/`)) {
      throw new AdapterBuildError([`naming.${key}.path must render inside ${PLUGIN_ROOT}/`]);
    }
  }
  return naming;
}

export async function loadCapabilities(root = REPOSITORY_ROOT) {
  const capabilitiesPath = path.join(root, "scripts/adapters/capabilities.json");
  const document = JSON.parse(await readFile(capabilitiesPath, "utf8"));
  if (!document || typeof document !== "object" || Array.isArray(document)) {
    throw new AdapterBuildError(["capabilities.json must be an object with a `naming` rule and a `capabilities` array"]);
  }
  const capabilities = document.capabilities;
  if (!Array.isArray(capabilities) || capabilities.length === 0) {
    throw new AdapterBuildError(["capabilities.json must carry a non-empty `capabilities` array"]);
  }
  const names = new Set(capabilities.map((entry) => entry.name));
  const expected = ['add-platform', 'assimilate', 'build', 'evolve', 'init', 'refine', 'research', 'scaffold', 'status', 'verify', 'wireframe'];
  if (names.size !== expected.length || capabilities.length !== names.size || expected.some((name) => !names.has(name))) {
    throw new AdapterBuildError(['capabilities must define exactly the 11 public commands']);
  }
  for (const entry of capabilities) {
    for (const field of ['title', 'description', 'preservation', 'selection', 'inputs', 'outputs', 'example']) {
      if (typeof entry[field] !== 'string' || !entry[field].trim() || /[\r\n]/.test(entry[field])) {
        throw new AdapterBuildError([`${entry.name}.${field} must be nonempty single-line text`]);
      }
    }
    if (!Array.isArray(entry.handoffs) || !entry.handoffs.length || entry.handoffs.some((name) => !names.has(name) || name === entry.name) || new Set(entry.handoffs).size !== entry.handoffs.length) {
      throw new AdapterBuildError([`${entry.name}.handoffs must name distinct related public commands`]);
    }
    if (!entry.example.startsWith(`pixel-perfect:${entry.name}`)) throw new AdapterBuildError([`${entry.name}.example must invoke its command`]);
  }
  const naming = validateNaming(document.naming);
  return { naming, capabilities };
}

export async function renderAdapters(root = REPOSITORY_ROOT) {
  const [commandTemplate, skillTemplate, piSkillTemplate, loaded] = await Promise.all([
    readFile(path.join(root, "scripts/adapters/command.template.md"), "utf8"),
    readFile(path.join(root, "scripts/adapters/skill.template.md"), "utf8"),
    readFile(path.join(root, "scripts/adapters/pi-skill.template.md"), "utf8"),
    loadCapabilities(root),
  ]);
  const { naming, capabilities } = loaded;

  const files = new Map();
  for (const capability of capabilities) {
    const { name, title, description, preservation, interactive } = capability;
    const guidance = {
      description_yaml: JSON.stringify(description),
      selection_guidance: `Select when: ${capability.selection}\nInputs and prerequisites: ${capability.inputs}\nOutputs and side effects: ${capability.outputs}\nHandoffs: ${capability.handoffs.map((next) => `pixel-perfect:${next}`).join(', ')}. Example: \`${capability.example}\`.`,
    };
    if (!name || !title || !description || !preservation || typeof interactive !== "boolean") {
      throw new AdapterBuildError([`invalid capability entry: ${JSON.stringify(capability)}`]);
    }

    const commandBody = normalizeBody(
      renderTemplate(commandTemplate, {
        ...guidance,
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
        ...guidance,
        name,
        title,
        description,
        preservation,
        skill_footer: skillFooter,
      }),
    );
    const piSkillBody = normalizeBody(
      renderTemplate(piSkillTemplate, {
        ...guidance,
        name,
        title,
        description,
        preservation,
      }),
    );

    // Every rendered path derives from the per-surface naming rule. Claude reads
    // the bare command surface; Codex and Grok share the bare skill surface;
    // Cursor, OpenCode, and Pi each carry their prefix in the path. The `files`
    // map dedupes the shared surfaces, leaving 11 capabilities × 5 file groups.
    const bodies = { command: commandBody, skill: skillBody, "pi-skill": piSkillBody };
    for (const surface of Object.values(naming)) {
      files.set(surfacePath(surface, name), bodies[surface.kind]);
    }
  }
  return { capabilities, naming, files };
}

export async function buildAdapters(root = REPOSITORY_ROOT, options = {}) {
  const check = Boolean(options.check);
  const { capabilities, naming, files } = await renderAdapters(root);
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
          `adapters in sync: ${result.capabilities} capabilities × ${SURFACE_KEYS.length} harness surfaces (${result.surfaces} files)\n`,
        );
      } else {
        process.stdout.write(
          `adapters written: ${result.capabilities} capabilities × ${SURFACE_KEYS.length} harness surfaces (${result.surfaces} files)\n`,
        );
      }
    })
    .catch((error) => {
      process.stderr.write(`${error.message}\n`);
      for (const detail of error.details ?? []) process.stderr.write(`- ${detail}\n`);
      process.exitCode = 1;
    });
}
