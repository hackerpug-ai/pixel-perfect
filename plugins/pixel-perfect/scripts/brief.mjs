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

import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadManifest, resolvePlatform } from "./verify-catalog.mjs";
import { inside } from "./reference-revisions.mjs";
import { GateError, resolveContract as resolveGateContract } from "./verify-styling-contract.mjs";

const PLUGIN_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const GATE_SCRIPT = join(PLUGIN_ROOT, "scripts/verify-styling-contract.mjs");
const LAYERS = ["atoms", "molecules", "organisms", "screens"];
const SLUG_PATTERN = /^[a-z0-9-]+$/;
const USAGE =
  "Usage: brief.mjs build <project-root> --platform <id> --layer <atoms|molecules|organisms|screens> --name <Name> [--findings <file.json>]\n" +
  "       brief.mjs wrap  <project-root> --slug <short-name> <task-brief-file | ->";
const NO_FRAME = "No frame shows this item. The design contract and the project's theme tokens are the target.";
const NO_INVENTORY = "No inventory entry for this item: the spec is the source.";
const SANDBOX_ADAPTER = { custom: "custom-sandbox" }; // docs/adapters/README.md: tools.sandbox → adapter file
// The contract kinds, as the gate names them, with the label the brief shows and the tools-key prefix.
const KINDS = {
  style: { gate: "styling", label: "Styling" },
  component: { gate: "component", label: "Component" },
};
// The gate key that records each layer's pass, as build.md's exit gates name them.
const LAYER_GATE = { atoms: "atoms", molecules: "molecules", organisms: "organisms", screens: "compose" };

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
 * One "## " section of docs/BUILD-BRIEF.md, heading line included, from its heading to the next
 * heading. A line inside a code fence never starts a section, so a fenced example is safe.
 */
export function ruleSection(markdown, title) {
  const heading = `## ${title}`;
  const lines = markdown.split("\n");
  let inFence = false;
  let start = -1;
  let end = lines.length;
  for (const [index, line] of lines.entries()) {
    if (line.startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    if (inFence || !line.startsWith("## ")) continue;
    if (start === -1) {
      if (line === heading) start = index;
      continue;
    }
    end = index;
    break;
  }
  if (start === -1) fail(`docs/BUILD-BRIEF.md has no "${heading}" section`);
  return lines.slice(start, end).join("\n").trim();
}

/** The rules one child gets for one layer: the rules every layer shares, then that layer's own. */
export function layerRules(markdown, layer) {
  if (!LAYERS.includes(layer)) fail(`no rules for layer "${layer}"`);
  return [ruleSection(markdown, "Rules for every layer"), ruleSection(markdown, `Rules for ${layer}`)].join("\n\n");
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

// The inventory is optional: a spec-driven project has none, and its items come from the manifest.
function readInventoryIfPresent(root) {
  const file = join(root, "design/inventory.json");
  return existsSync(file) ? readJsonFile(file, "design/inventory.json") : null;
}

function manifestEntry(config, layer, name, platformId) {
  const entry = (config[layer] ?? []).find((candidate) => candidate.name === name);
  if (!entry) {
    fail(`${layer}/${name} is not recorded in design/manifest.json for platform ${platformId}, and it is not in design/inventory.json either. Record it first.`);
  }
  if (!entry.file || !entry.story) {
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
  if (index === null) fail(`frame ${id} is named, but there is no frames index`);
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

// The contract for one kind, resolved by the gate itself, so the brief and the gate share one rule.
// A GateError (absent source, no contract id, a bad value) becomes exit 2 with the gate's message.
function resolveContractFor(kind, { root, platformId, tools }) {
  let resolved;
  try {
    resolved = resolveGateContract(platformId, root, KINDS[kind].gate, tools);
  } catch (error) {
    if (error instanceof GateError) fail(error.message);
    throw error;
  }
  if (resolved.inForce && !existsSync(resolved.path)) {
    fail(`${kind} contract ${resolved.id} (${resolved.source}) is not on disk at ${resolved.path}`);
  }
  const overrides = Object.entries(tools[`${kind}_contract_overrides`] ?? {});
  return { ...resolved, label: KINDS[kind].label, overrides };
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

// The primitives scaffold pulled from the component library (scaffold.components[] is a list of names).
function installedLine(config) {
  const names = config.scaffold?.components ?? [];
  return names.length ? `- Installed library primitives: ${names.join(", ")}.` : "- Installed library primitives: none recorded.";
}

function stackSection({ platformId, sourceRoot, tools, contracts, config }) {
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
    ...(contracts.component.inForce ? [installedLine(config)] : []),
  ].join("\n");
}

// The declared state of a molecule or organism, or the story states of a screen. Empty for an
// item that declares neither, so the section is removed from its brief.
function stateSection(entry, statePatterns, label) {
  const read = `State patterns for this framework: ${statePatterns}. Read it before you write.`;
  if (entry.state === null) return "## Declared state\n\nThis item declares no state. It is a pure composition: one default story.";
  if (entry.state !== undefined) {
    return [
      "## Declared state",
      "",
      "Keep this state in the component. Each scenario below gets one named story.",
      "",
      fencedJson(entry.state),
      "",
      read,
    ].join("\n");
  }
  if (Array.isArray(entry.states) && entry.states.length > 0) {
    return ["## States", "", `One named story for each: ${stateNames(entry.states, label).join(", ")}.`, "", read].join("\n");
  }
  return "";
}

// A screen's states are names, or objects with a name (the inventory shape). Anything else is an error.
function stateNames(states, label) {
  return states.map((state) => {
    if (typeof state === "string") return state;
    if (state !== null && typeof state === "object" && typeof state.name === "string") return state.name;
    fail(`a state of ${label} must be a name, or an object with a name`);
  });
}

// The layout target: a wireframe named for the screen, when design/wireframes/<Name>.md exists.
function layoutTargetLine(root, layer, name) {
  if (layer !== "screens") return "";
  const file = join(root, "design/wireframes", `${name}.md`);
  if (!existsSync(file)) return "";
  return `Layout target (structure, not pixels): ${file}. Read it, and match its layout, information architecture, and regions. The frames above govern pixels when a frame is listed.`;
}

// The project facts a child cannot see from its item: each line appears only when its source exists.
function contextSection(root, manifest) {
  const lines = [];
  if (typeof manifest.goal === "string" && manifest.goal.trim()) lines.push(`- Goal: ${oneLine(manifest.goal)}`);
  if (typeof manifest.vibe === "string" && manifest.vibe.trim()) lines.push(`- Vibe: ${oneLine(manifest.vibe)}`);
  if (typeof manifest.spec === "string" && manifest.spec.trim() && existsSync(resolve(root, manifest.spec))) {
    lines.push(`- Spec: ${resolve(root, manifest.spec)}. For an item no frame shows, the spec decides behaviour and copy.`);
  }
  const tokensDir = join(root, "design/system/tokens");
  if (existsSync(tokensDir) && statSync(tokensDir).isDirectory()) {
    const files = readdirSync(tokensDir).filter((name) => statSync(join(tokensDir, name)).isFile()).sort();
    if (files.length > 0) {
      lines.push(`- Token files (use these values; invent no token): ${files.map((name) => join(tokensDir, name)).join(", ")}.`);
    }
  }
  if (existsSync(join(root, "DESIGN.md"))) lines.push(`- DESIGN.md: ${join(root, "DESIGN.md")}`);
  const sources = (manifest.inventory?.sources ?? [])
    .map((source) => source?.ref)
    .filter((ref) => typeof ref === "string")
    .map((ref) => resolve(root, ref))
    .filter((file) => existsSync(file));
  if (sources.length > 0) lines.push(`- Design sources (exact values come from these): ${sources.join(", ")}.`);
  if (existsSync(join(root, "design/build-plan.md"))) lines.push(`- Build plan: ${join(root, "design/build-plan.md")}`);
  if (lines.length === 0) return "";
  return ["## Project context", "", ...lines].join("\n");
}

function oneLine(text) {
  return text.replace(/\s+/g, " ").trim();
}

// The layer order: a layer is built only after the layer before it is passed. Atoms come after the
// scaffold gate. A layer with no recorded items is skipped, so the nearest earlier layer with items decides.
function assertLayerOrder({ config, platformId, layer, name }) {
  const gates = config.gates ?? {};
  const item = `${layer}/${name}`;
  if (layer === "atoms") {
    if (gates.scaffold !== "passed") {
      fail(`${item} is not built yet: the scaffold gate is not passed on platform ${platformId} (platforms.${platformId}.gates.scaffold). Pass scaffold first.`);
    }
    return;
  }
  const earlier = LAYERS.slice(0, LAYERS.indexOf(layer)).reverse().find((candidate) => Array.isArray(config[candidate]) && config[candidate].length > 0);
  if (earlier === undefined) return;
  if (gates[LAYER_GATE[earlier]] !== "passed") {
    fail(`${item} is not built yet: the ${earlier} layer has recorded items, and its gate is not passed on platform ${platformId} (platforms.${platformId}.gates.${LAYER_GATE[earlier]}). Pass it first.`);
  }
}

// The approved library record, with the wrapper rules that go with it. Empty for hand-built items.
function librarySection(entry, markdown) {
  if (!entry.ecosystemLib) return "";
  return [
    ruleSection(markdown, "Rules for a library wrapper"),
    "",
    "The library record from the build plan:",
    "",
    fencedJson(entry.ecosystemLib),
  ].join("\n");
}

function filesSection(entry, sourceRoot) {
  return [
    "You may write exactly these files:",
    "",
    `- ${inside(sourceRoot, entry.file)} (the component)`,
    `- ${inside(sourceRoot, entry.story)} (its story)`,
    "",
    "You may also add exactly one entry to the sandbox's story registry, for this story only, if the sandbox adapter needs one. Change no other entry in that registry.",
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
    "Run this command from the project root. It first deletes this item's output folder, so every render you read for it was written by this run:",
    "",
    `    rm -rf ${shellQuote(join(out, layer, name))} && ${env} ${command}`,
    "",
    `${output} A capture command that ignores the filter renders every story: it is slower, and its output is still correct.`,
  ].join("\n");
}

// One gate per contract kind. Manifest mode: the gate reads the contract, the scope, and the
// overrides from design/manifest.json, so the brief passes only the project, the platform, the kind,
// and the item's component file.
function gatesSection({ root, platformId, entry, contracts }) {
  const blocks = Object.entries(KINDS).map(([key, { gate, label }]) => {
    const contract = contracts[key];
    if (!contract.inForce) return `- ${label} gate: none. The ${gate} source is none, so no contract is in force and no gate runs.`;
    if (contract.enforcement === "off") return `- ${label} gate: not run. Enforcement is off, so its gate is not run.`;
    const command = `    node ${shellQuote(GATE_SCRIPT)} --manifest ${shellQuote(root)} --platform ${shellQuote(platformId)} --kind ${gate} --files ${shellQuote(entry.file)}`;
    return `- ${label} contract (${contract.id}, ${contract.enforcement}):\n\n${command}`;
  });
  const intro =
    "Run each command as written, after your files are written. Exit codes: 0 pass; 1 violations; 2 contract or configuration error; 3 a recorded file is outside every check's scope. Under hard-fail, any exit 1 blocks you: fix your files and run again. Under warn, list the violations in notes and carry on. Exit 2 and exit 3 block the item even under warn.";
  return [intro, "", ...blocks].join("\n");
}

function findingsSection(text) {
  if (text === undefined) return "";
  const fence = fenceFor(text);
  return [
    "## Prior review",
    "",
    "A previous attempt was reviewed. Fix these findings first. Then run the Steps again, and fix every other difference you find as well.",
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
  const tools = config.tools;
  if (!tools || typeof tools !== "object" || Array.isArray(tools)) {
    fail(`platform ${platformId} has no tools object in design/manifest.json; the contract sources cannot be read`);
  }
  assertLayerOrder({ config, platformId, layer, name });
  const entry = manifestEntry(config, layer, name, platformId);
  if ((layer === "molecules" || layer === "organisms") && !Object.hasOwn(entry, "state")) {
    fail(`${layer}/${name} has no state key in design/manifest.json: record state, or null when it has none`);
  }
  // An item the inventory lists is built from its inventory entry. One the manifest alone records is
  // built from its manifest entry, and the brief says the spec is the source.
  const inventory = readInventoryIfPresent(root);
  const inInventory = inventory === null ? undefined : (inventory[layer] ?? []).find((candidate) => candidate.name === name);
  const itemText = inInventory === undefined ? `${NO_INVENTORY}\n\n${fencedJson(entry)}` : fencedJson(inInventory);
  const index = inventory === null ? null : loadFrameIndex(root, manifest);
  const sourceRoot = resolve(root, config.root ?? ".");
  const contracts = {
    style: resolveContractFor("style", { root, platformId, tools }),
    component: resolveContractFor("component", { root, platformId, tools }),
  };
  const framesText = [
    framesSection(inInventory ?? entry, layer, index),
    layoutTargetLine(root, layer, name),
  ].filter((text) => text !== "").join("\n\n");
  const brief = readFileSync(join(PLUGIN_ROOT, "docs/BUILD-BRIEF.md"), "utf8");
  const task = fillTemplate(extractTemplate(brief), {
    ITEM_ID: `${layer}/${name}`,
    PLATFORM: platformId,
    ITEM: itemText,
    FRAMES: framesText,
    STACK: stackSection({ platformId, sourceRoot, tools, contracts, config }),
    CONTEXT: contextSection(root, manifest),
    FILES: filesSection(entry, sourceRoot),
    COMPOSES: composesSection(inInventory ?? entry, layer, name, config, sourceRoot),
    STATE: stateSection(entry, join(PLUGIN_ROOT, "docs/state-patterns.md"), `${layer}/${name}`),
    LIBRARY: librarySection(entry, brief),
    RULES: layerRules(brief, layer),
    RENDER: renderSection({ root, platformId, layer, name, config }),
    GATES: gatesSection({ root, platformId, entry, contracts }),
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
