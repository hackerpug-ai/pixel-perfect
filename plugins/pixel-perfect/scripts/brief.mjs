#!/usr/bin/env node
// brief.mjs — writes one designer assignment file, so the orchestrator never composes a
// child's prompt by hand. A brief is three parts, in order: the packaged designer prompt
// (agents/designer.md without frontmatter), the design contract (docs/DESIGN-CONTRACT.md),
// and the task. For `build` the task is docs/BUILD-BRIEF.md filled from the project's
// manifest, inventory, and frames index. For `wrap` the task is the caller's text, verbatim.
//
// Zero runtime dependencies. stdout carries exactly one line on success; diagnostics go to
// stderr. Exit codes: 0 written · 2 usage or configuration error.
//
// Usage:
//   node brief.mjs build <project-root> --platform <id> --layer <atoms|molecules|organisms|screens> --name <Name> [--findings <file.json>]
//   node brief.mjs wrap  <project-root> --slug <short-name> <task-brief-file | ->

import { existsSync, lstatSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadManifest, resolvePlatform } from "./verify-catalog.mjs";
import { inside } from "./reference-revisions.mjs";

const PLUGIN_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const LAYERS = ["atoms", "molecules", "organisms", "screens"];
const SLUG_PATTERN = /^[a-z0-9-]+$/;
const USAGE =
  "Usage: brief.mjs build <project-root> --platform <id> --layer <atoms|molecules|organisms|screens> --name <Name> [--findings <file.json>]\n" +
  "       brief.mjs wrap  <project-root> --slug <short-name> <task-brief-file | ->";
const NO_FRAME = "No frame shows this item. The design contract and the project's theme tokens are the target.";
const SANDBOX_ADAPTER = { custom: "custom-sandbox" }; // docs/adapters/README.md: tools.sandbox → adapter file
const CONTRACTS = {
  style: { label: "Styling", dir: "styling-contracts", research: "design/research/styling" },
  component: { label: "Component", dir: "component-contracts", research: "design/research/libraries" },
};
const ENFORCEMENT = ["hard-fail", "warn", "off"];
const CONTRACT_SOURCES = ["builtin", "manual", "researched"];

export class BriefError extends Error {}

const fail = (message) => {
  throw new BriefError(message);
};

// ---------------------------------------------------------------------------
// Arguments
// ---------------------------------------------------------------------------

export function parseArgs(argv) {
  const [command, ...rest] = argv;
  if (command !== "build" && command !== "wrap") fail(USAGE);
  const flags = command === "build"
    ? { "--platform": "platform", "--layer": "layer", "--name": "name", "--findings": "findings" }
    : { "--slug": "slug" };
  const parsed = {};
  const positional = [];
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg.startsWith("--")) {
      const key = flags[arg];
      if (!key) fail(`unknown option ${arg} for ${command}\n${USAGE}`);
      const value = rest[++i];
      if (value === undefined || value.startsWith("--")) fail(`${arg} needs a value\n${USAGE}`);
      parsed[key] = value;
    } else {
      positional.push(arg);
    }
  }
  if (command === "build") {
    if (positional.length !== 1) fail(`build takes one project root\n${USAGE}`);
    for (const key of ["platform", "layer", "name"]) if (!parsed[key]) fail(`build needs --${key}\n${USAGE}`);
    if (!LAYERS.includes(parsed.layer)) fail(`unknown layer "${parsed.layer}"; use ${LAYERS.join(", ")}`);
    // Both values become path segments of the brief file name, so they must be plain names.
    safeName(parsed.platform, "--platform");
    safeName(parsed.name, "--name");
    return { command, root: resolve(positional[0]), platform: parsed.platform, layer: parsed.layer, name: parsed.name, findings: parsed.findings };
  }
  if (positional.length !== 2) fail(`wrap takes a project root and a task file (or -)\n${USAGE}`);
  if (!parsed.slug) fail(`wrap needs --slug\n${USAGE}`);
  return { command, root: resolve(positional[0]), slug: parsed.slug, taskFile: positional[1] };
}

// ---------------------------------------------------------------------------
// Pure assembly
// ---------------------------------------------------------------------------

/** The packaged agent prompt: the markdown body after its YAML frontmatter. */
export function packagedPrompt(markdown) {
  const match = /^---\n[\s\S]*?\n---\n/.exec(markdown);
  if (!match) fail("agents/designer.md has no YAML frontmatter block");
  return markdown.slice(match[0].length).trim();
}

/** The one fenced block in docs/BUILD-BRIEF.md, without its fence lines. */
export function extractTemplate(markdown) {
  const lines = markdown.split("\n");
  const open = lines.findIndex((line) => line.startsWith("```"));
  if (open === -1) fail("docs/BUILD-BRIEF.md has no fenced task block");
  const close = lines.findIndex((line, i) => i > open && line.startsWith("```"));
  if (close === -1) fail("docs/BUILD-BRIEF.md fenced task block is not closed");
  return lines.slice(open + 1, close).join("\n") + "\n";
}

/**
 * Fill <<NAME>> placeholders in one pass. A placeholder alone on its line with an empty value
 * removes that line. A placeholder with no value is a configuration error. Inserted text is
 * never scanned again, so data that happens to contain "<<X>>" cannot break the fill.
 */
export function fillTemplate(template, values) {
  const out = [];
  for (const line of template.split("\n")) {
    const whole = /^<<([A-Z_]+)>>$/.exec(line);
    if (whole && values[whole[1]] === "") continue;
    out.push(
      line.replace(/<<([A-Z_]+)>>/g, (_, key) => {
        const value = values[key];
        if (typeof value !== "string") fail(`brief template has no value for <<${key}>>`);
        return value;
      }),
    );
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n");
}

/** Three top-level parts, in the order the designer reads them. The task is inserted verbatim. */
export function assembleBrief({ prompt, contract, task }) {
  const withNewline = (text) => (text.endsWith("\n") ? text : `${text}\n`);
  return [
    `# Part 1: agent prompt\n\n${prompt.trim()}\n`,
    `# Part 2: design contract\n\n${withNewline(contract)}`,
    `# Part 3: task\n\n${task}`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

/** Shell-safe argument. Plain paths pass through unquoted so commands stay readable. */
export function shellQuote(value) {
  const text = String(value);
  return /^[A-Za-z0-9_/.:@%+=,-]+$/.test(text) ? text : `'${text.replace(/'/g, "'\\''")}'`;
}

function fenceFor(text) {
  const longest = Math.max(0, ...[...text.matchAll(/`+/g)].map((m) => m[0].length));
  return "`".repeat(Math.max(3, longest + 1));
}

function fencedJson(value) {
  const text = JSON.stringify(value, null, 2);
  const fence = fenceFor(text);
  return `${fence}json\n${text}\n${fence}`;
}

function safeName(value, what) {
  if (typeof value !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value) || value.includes("..")) {
    fail(`${what} must be a plain name; found ${JSON.stringify(value)}`);
  }
  return value;
}

function readJsonFile(file, label) {
  if (!existsSync(file)) fail(`No ${label} at ${file}`);
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    fail(`${label} is not valid JSON: ${error.message}`);
  }
}

function readInventory(root) {
  const file = join(root, "design/inventory.json");
  return readJsonFile(file, "design/inventory.json");
}

function findItem(inventory, layer, name) {
  const item = (inventory[layer] ?? []).find((entry) => entry.name === name);
  if (!item) fail(`${name} is not a ${layer} entry in design/inventory.json`);
  return item;
}

function manifestEntry(config, layer, name, platformId) {
  const entry = (config[layer] ?? []).find((candidate) => candidate.name === name);
  if (!entry || !entry.file || !entry.story) {
    fail(`No file and story recorded for ${layer}/${name} on platform ${platformId}. Record its file and story in design/manifest.json first.`);
  }
  return entry;
}

function loadFrameIndex(root, manifest) {
  const dir = inside(root, manifest.inventory?.reference ?? "design/reference");
  const file = join(dir, "frames.json");
  if (!existsSync(file)) fail(`no frames index at ${file}`);
  const index = readJsonFile(file, "frames index");
  if (!Array.isArray(index.frames)) fail(`${file} has no frames array`);
  return { dir, file, byId: new Map(index.frames.map((frame) => [frame.id, frame])) };
}

function frameLine(index, id) {
  const frame = index.byId.get(id);
  if (!frame) fail(`frame ${id} is not in the frames index ${index.file}`);
  const png = inside(index.dir, frame.png);
  if (!existsSync(png)) fail(`PNG for frame ${id} is not on disk: ${png}`);
  return `- ${id}: ${png} (viewport ${frame.viewport ?? "not recorded"})`;
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

function framesSection(item, layer, index) {
  if (layer === "screens") {
    const states = item.states ?? [];
    if (!states.some((state) => (state.frames ?? []).length > 0)) return NO_FRAME;
    return states
      .map((state) => {
        const ids = state.frames ?? [];
        const body = ids.length
          ? ids.map((id) => frameLine(index, id))
          : [`No frame draws this state.${state.undrawn ? ` Spec-only reason: ${state.undrawn}` : ""}`];
        return [`### State: ${state.name}`, "", ...body].join("\n");
      })
      .join("\n\n");
  }
  const ids = item.appears_on ?? [];
  if (ids.length === 0) return NO_FRAME;
  return ids.map((id) => frameLine(index, id)).join("\n");
}

function toolLine(label, key, tools) {
  const docs = tools[`${key}_docs`];
  return `- ${label}: ${tools[key] ?? "not recorded"}${docs ? ` (docs: ${docs})` : ""}`;
}

function adapterLine(label, kind, name, tools) {
  if (kind === "framework") {
    if (!name) return `- ${label} adapter: none recorded; follow the framework's own conventions.`;
    safeName(name, "tools.framework");
    const file = join(PLUGIN_ROOT, "docs/adapters", `${name}.md`);
    return existsSync(file)
      ? `- ${label} adapter: ${file}`
      : `- ${label} adapter: none (no framework adapter named ${name}); follow the framework's own conventions.`;
  }
  if (!name) return `- ${label} adapter: ${join(PLUGIN_ROOT, "docs/adapters/generic.md")} (no ${kind} recorded; generic fallback).`;
  safeName(name, `tools.${kind}`);
  const base = kind === "sandbox" ? (SANDBOX_ADAPTER[name] ?? name) : name;
  const file = join(PLUGIN_ROOT, "docs/adapters", `${base}.md`);
  if (existsSync(file)) return `- ${label} adapter: ${file}`;
  return `- ${label} adapter: ${join(PLUGIN_ROOT, "docs/adapters/generic.md")} (no adapter named ${base}; generic fallback).`;
}

function resolveContract(kind, { root, tools }) {
  const spec = CONTRACTS[kind];
  const id = tools[`${kind}_contract`];
  const source = tools[`${kind}_contract_source`];
  const enforcement = tools[`${kind}_contract_enforcement`] ?? "hard-fail";
  const overrides = Object.entries(tools[`${kind}_contract_overrides`] ?? {});
  const base = { label: spec.label, id, source, enforcement, overrides };
  if (source === undefined || source === "none") return { ...base, inForce: false };
  if (!CONTRACT_SOURCES.includes(source)) {
    fail(`tools.${kind}_contract_source must be builtin, manual, researched or none; found ${JSON.stringify(source)}`);
  }
  if (!ENFORCEMENT.includes(enforcement)) fail(`tools.${kind}_contract_enforcement must be hard-fail, warn or off; found ${JSON.stringify(enforcement)}`);
  if (!id) fail(`tools.${kind}_contract_source is ${source} but tools.${kind}_contract records no id`);
  safeName(id, `tools.${kind}_contract`);
  const file = source === "researched"
    ? join(root, spec.research, `${id}.md`)
    : join(PLUGIN_ROOT, "docs", spec.dir, `${id}.md`);
  if (!existsSync(file)) fail(`${spec.label.toLowerCase()} contract ${id} (${source}) is not on disk at ${file}`);
  return { ...base, inForce: true, path: file };
}

function contractLines(contract) {
  if (!contract.inForce) return [`- ${contract.label} contract: none in force (source: ${contract.source ?? "not recorded"}).`];
  const head = `- ${contract.label} contract: ${contract.id} (source: ${contract.source}, enforcement: ${contract.enforcement}). Read it first: ${contract.path}`;
  const off = contract.enforcement === "off" ? " Enforcement is off, so its gate is not run." : "";
  const overrides = contract.overrides.length
    ? contract.overrides.map(([name, reason]) => `  - Override ${name}: ${reason}`)
    : ["  - Overrides: none."];
  return [`${head}${off}`, ...overrides];
}

function stackSection({ platformId, sourceRoot, tools, contracts }) {
  return [
    `- Platform: ${platformId}. Source root: ${sourceRoot} (the directory that contains src/).`,
    toolLine("Framework", "framework", tools),
    toolLine("Style", "style", tools),
    toolLine("Components", "components", tools),
    toolLine("Icons", "icons", tools),
    toolLine("Sandbox", "sandbox", tools),
    "",
    "Adapter docs, in this order:",
    adapterLine("Framework", "framework", tools.framework, tools),
    adapterLine("Style", "style", tools.style, tools),
    adapterLine("Components", "components", tools.components, tools),
    adapterLine("Sandbox", "sandbox", tools.sandbox, tools),
    "",
    ...contractLines(contracts.style),
    ...contractLines(contracts.component),
  ].join("\n");
}

function filesSection(entry, sourceRoot) {
  return [
    "You may write exactly these files:",
    "",
    `- ${inside(sourceRoot, entry.file)} (the component)`,
    `- ${inside(sourceRoot, entry.story)} (its story)`,
    "",
    "You may also add exactly one line to the sandbox's story registry, for this story only, if the sandbox adapter needs one. Change no other line in that registry.",
    "",
    "Write no other file. The manifest, package files, lockfiles, theme tokens, and every other component belong to the orchestrator; if you need one of them, return it under needs.",
  ].join("\n");
}

function composesSection(item, layer, name, config, sourceRoot) {
  const names = item.composes ?? [];
  if (names.length === 0) return "";
  const lines = names.map((dep) => {
    const entry = LAYERS.flatMap((l) => config[l] ?? []).find((candidate) => candidate.name === dep);
    if (!entry || !entry.file) fail(`${layer}/${name} composes ${dep}, which has no manifest entry; build ${dep} first`);
    if (entry.status === undefined || entry.status === "pending") fail(`${layer}/${name} composes ${dep}, which is still pending; build ${dep} first`);
    return `- ${dep}: ${inside(sourceRoot, entry.file)}`;
  });
  return ["## Composes: build on these, do not rebuild them", "", ...lines].join("\n");
}

// Text-rendered platforms (terminal UIs) need both fields. Anything else is image-required.
function rendersText(capture) {
  return capture.pixels === "none" && typeof capture.pixels_reason === "string" && capture.pixels_reason.trim() !== "";
}

function renderSection({ root, platformId, layer, name, config }) {
  const capture = config.capture ?? {};
  const command = capture.command;
  if (!command) {
    return "No render command is configured for this platform (capture.command is missing from design/manifest.json). Return status blocked with reason no-render-command.";
  }
  const out = join(root, "design/.captures", `${platformId}-item`);
  const where = `${out}/${layer}/${name}/`;
  const env = `PIXEL_PERFECT_CAPTURE_OUT=${shellQuote(out)} PIXEL_PERFECT_CAPTURE_ONLY=${shellQuote(`${layer}/${name}`)}`;
  const output = rendersText(capture)
    ? `This platform renders text, not pixels (${capture.pixels_reason.trim()}). The command writes one text artifact per state under ${where}. Read each artifact, and compare its text render with its frame.`
    : `It writes one image per state at ${where}<state>.png. Open each image, and compare it with its frame.`;
  return [
    "Run this command from the project root. It first deletes the output folder, so every render you read was written by this run:",
    "",
    `    rm -rf ${shellQuote(out)} && ${env} ${command}`,
    "",
    `${output} A capture command that ignores the filter renders every story: it is slower, and its output is still correct.`,
  ].join("\n");
}

function gatesSection({ sourceRoot, contracts }) {
  const gates = [contracts.style, contracts.component].filter((c) => c.inForce && c.enforcement !== "off");
  if (gates.length === 0) return "No contract gate applies to this platform.";
  const script = join(PLUGIN_ROOT, "scripts/verify-styling-contract.mjs");
  const intro =
    "Run each command as written, after your files are written. Exit codes: 0 pass; 1 violations; 2 contract or usage error; 3 vacuous scan (wrong source root). Under hard-fail, any non-zero exit blocks you: fix your files and run again. Under warn, list the violations in notes and carry on.";
  const commands = gates.map((gate) => {
    const allow = gate.overrides.map(([name]) => ` --allow ${shellQuote(name)}`).join("");
    return `- ${gate.label} contract (${gate.id}, ${gate.enforcement}):\n\n    node ${shellQuote(script)} ${shellQuote(gate.path)} ${shellQuote(sourceRoot)}${allow}`;
  });
  return [intro, "", ...commands].join("\n");
}

function findingsSection(text) {
  if (text === undefined) return "";
  const fence = fenceFor(text);
  return [
    "## Prior review",
    "",
    "Context: a previous attempt was reviewed; fix exactly these findings and nothing else.",
    "",
    `${fence}json`,
    text,
    fence,
  ].join("\n");
}

function readFindings(file) {
  const abs = resolve(file);
  let text;
  try {
    text = readFileSync(abs, "utf8");
  } catch (error) {
    fail(`cannot read findings file ${abs}: ${error.code ?? error.message}`);
  }
  try {
    JSON.parse(text);
  } catch (error) {
    fail(`findings file ${abs} is not valid JSON: ${error.message}`);
  }
  return text.trimEnd();
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

export function buildBrief({ root, platform, layer, name, findings }) {
  const manifest = loadManifest(root);
  const { id: platformId, config } = resolvePlatform(manifest, platform);
  const inventory = readInventory(root);
  const item = findItem(inventory, layer, name);
  const entry = manifestEntry(config, layer, name, platformId);
  const sourceRoot = resolve(root, config.root ?? ".");
  const index = loadFrameIndex(root, manifest);
  const tools = config.tools ?? {};
  const contracts = {
    style: resolveContract("style", { root, tools }),
    component: resolveContract("component", { root, tools }),
  };
  const template = extractTemplate(readFileSync(join(PLUGIN_ROOT, "docs/BUILD-BRIEF.md"), "utf8"));
  const task = fillTemplate(template, {
    ITEM_ID: `${layer}/${name}`,
    PLATFORM: platformId,
    ITEM: fencedJson(item),
    FRAMES: framesSection(item, layer, index),
    STACK: stackSection({ platformId, sourceRoot, tools, contracts }),
    FILES: filesSection(entry, sourceRoot),
    COMPOSES: composesSection(item, layer, name, config, sourceRoot),
    RENDER: renderSection({ root, platformId, layer, name, config }),
    GATES: gatesSection({ sourceRoot, contracts }),
    PRIOR_FINDINGS: findingsSection(findings === undefined ? undefined : readFindings(findings)),
  });
  const prompt = packagedPrompt(readFileSync(join(PLUGIN_ROOT, "agents/designer.md"), "utf8"));
  const contract = readFileSync(join(PLUGIN_ROOT, "docs/DESIGN-CONTRACT.md"), "utf8");
  return {
    file: join(root, "design/.briefs", platformId, `${layer}-${name}.md`),
    content: assembleBrief({ prompt, contract, task }),
  };
}

export function wrapBrief({ root, slug, taskFile }) {
  if (!SLUG_PATTERN.test(slug)) fail(`--slug must match [a-z0-9-]+; found ${JSON.stringify(slug)}`);
  let task;
  if (taskFile === "-") {
    try {
      task = readFileSync(0, "utf8");
    } catch (error) {
      fail(`cannot read the task from stdin: ${error.message}`);
    }
  } else {
    try {
      task = readFileSync(resolve(taskFile), "utf8");
    } catch (error) {
      fail(`cannot read task file ${taskFile}: ${error.code ?? error.message}`);
    }
  }
  if (task.trim() === "") fail("the task text is empty");
  const prompt = packagedPrompt(readFileSync(join(PLUGIN_ROOT, "agents/designer.md"), "utf8"));
  const contract = readFileSync(join(PLUGIN_ROOT, "docs/DESIGN-CONTRACT.md"), "utf8");
  return {
    file: join(root, "design/.briefs", `${slug}.md`),
    content: assembleBrief({ prompt, contract, task }),
  };
}

// Writes one brief under <root>/design/.briefs. Symlinks on the way are refused, as refresh-run.mjs
// refuses them: a link could send the write anywhere. The temp file is removed if the rename fails.
function writeBrief(root, file, content) {
  const rel = relative(join(root, "design/.briefs"), resolve(file));
  if (rel === "" || rel.startsWith("..") || isAbsolute(rel)) fail(`refusing to write outside design/.briefs: ${file}`);
  const parts = rel.split(sep);
  let current = root;
  for (const part of ["design", ".briefs", ...parts.slice(0, -1)]) {
    current = join(current, part);
    if (existsSync(current)) {
      const stat = lstatSync(current);
      if (stat.isSymbolicLink()) fail(`refusing to write through a symlink: ${current}`);
      if (!stat.isDirectory()) fail(`not a directory: ${current}`);
    } else {
      mkdirSync(current);
    }
  }
  const target = join(current, parts.at(-1));
  if (existsSync(target) && lstatSync(target).isSymbolicLink()) fail(`refusing to replace a symlink: ${target}`);
  const temp = `${target}.${randomUUID()}.tmp`;
  try {
    writeFileSync(temp, content, "utf8");
    renameSync(temp, target);
  } catch (error) {
    rmSync(temp, { force: true });
    fail(`cannot write ${target}: ${error.code ?? error.message}`);
  }
}

export function main(argv) {
  try {
    const args = parseArgs(argv);
    if (!existsSync(args.root) || !statSync(args.root).isDirectory()) fail(`project root not found: ${args.root}`);
    const result = args.command === "build" ? buildBrief(args) : wrapBrief(args);
    writeBrief(args.root, result.file, result.content);
    process.stdout.write(
      `Read ${result.file} and follow it exactly. It is your complete assignment; return the result it asks for.\n`,
    );
    return 0;
  } catch (error) {
    process.stderr.write(`brief: ${error.message}\n`);
    return 2;
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) process.exitCode = main(process.argv.slice(2));
