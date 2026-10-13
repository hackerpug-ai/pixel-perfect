#!/usr/bin/env node

// Validates that the two contract kinds stay wired symmetrically, and that every build
// item loop hands its items to the packaged designer through brief.mjs.
//
// The component-library decision went unenforced for a long time not because
// anyone decided against enforcing it, but because build.md simply never
// mentioned it — while naming the styling contract by field, with both
// resolution branches and a fail-closed clause, two lines away. Nothing noticed.
//
// This validator is what notices. Contract loading and gate commands now live in
// scripts/brief.mjs, not in build.md. So this file checks three things: each item
// loop in build.md assigns through brief.mjs with its own layer; docs/BUILD-BRIEF.md
// has rules for each layer; and a real brief built from the fixture project names the
// contracts, adapters, and gate commands the platform records. If a future edit drops
// any of them, CI fails here instead of a user discovering it after a build.

import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { buildBrief, layerRules } from "../plugins/pixel-perfect/scripts/brief.mjs";

const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Gate-key layers, as build.md's exit gates name them. "compose" is the screens layer.
const LAYERS = ["atoms", "molecules", "organisms", "compose"];
// The four item loops, as brief.mjs --layer names them.
const ITEM_LOOPS = [
  { heading: "## Phase 5: ATOMS", layer: "atoms" },
  { heading: "## Phase 5b: MOLECULES", layer: "molecules" },
  { heading: "## Phase 5c: ORGANISMS", layer: "organisms" },
  { heading: "## Phase 6: COMPOSE", layer: "screens" },
];
const BRIEF_LAYERS = ["atoms", "molecules", "organisms", "screens"];
// A real-shaped project: web-desktop has both contracts in force; terminal-cli has no library.
const FIXTURE_ROOT = "test/fixtures/brief-project";

class ContractWiringError extends Error {
  constructor(details) {
    super("contract wiring validation failed");
    this.details = details;
  }
}

// The contract ids selectable from init's "Resolve Component Contract" table.
function selectableComponentContracts(initMarkdown) {
  const heading = initMarkdown.indexOf("### Resolve Component Contract");
  if (heading === -1) return null;
  const rest = initMarkdown.slice(heading + 1);
  const end = rest.search(/^###\s/m);
  const section = end === -1 ? rest : rest.slice(0, end);
  const ids = new Set();
  for (const row of section.matchAll(/^\|\s*`[^`]+`\s*\|\s*`([a-z0-9-]+)`\s*\|/gm)) ids.add(row[1]);
  return ids;
}

// One "## " section of build.md, from its heading line to the next "## " heading.
function phaseSection(markdown, heading) {
  const lines = markdown.split("\n");
  const start = lines.indexOf(heading);
  if (start === -1) return null;
  const end = lines.findIndex((line, index) => index > start && line.startsWith("## "));
  return lines.slice(start, end === -1 ? undefined : end).join("\n");
}

// Builds the atoms brief for the fixture's Button, the way the orchestrator's command does.
function fixtureBrief(root, { platform = "web-desktop", layer = "atoms", name = "Button" } = {}) {
  return buildBrief({ root: path.join(root, FIXTURE_ROOT), platform, layer, name }).content;
}

// A line of the brief that names a file. Returns the named path, or null when the line is absent.
function namedPath(content, pattern) {
  const match = pattern.exec(content);
  return match ? match[1].trim() : null;
}

export async function validateContracts(root = REPOSITORY_ROOT) {
  const packageRoot = path.join(root, "plugins/pixel-perfect");
  const errors = [];

  const build = await readFile(path.join(packageRoot, "workflows/build.md"), "utf8");
  const brief = await readFile(path.join(packageRoot, "docs/BUILD-BRIEF.md"), "utf8");
  const init = await readFile(path.join(packageRoot, "workflows/init.md"), "utf8");

  // 1. Each item loop assigns through brief.mjs with its own layer, works one item at a
  //    time, and caps re-assignment at two with findings written to the layer's file. A
  //    loop that loads context or writes a component file itself has drifted back.
  for (const { heading, layer } of ITEM_LOOPS) {
    const label = `build.md "${heading}"`;
    const section = phaseSection(build, heading);
    if (section === null) {
      errors.push(`${label} is missing`);
      continue;
    }
    const assign = new RegExp(
      `SUBAGENT\\(designer, node <plugin-root>/scripts/brief\\.mjs build <project-root> --platform \\{platform\\} --layer ${layer} --name \\{Name\\}\\)`,
    );
    if (!assign.test(section)) errors.push(`${label} does not assign each item with brief.mjs build --layer ${layer} through SUBAGENT(designer, ...)`);
    // The phrase must sit in body text. A heading ("Step 3: ... One at a Time") does not count.
    const body = section.split("\n").filter((line) => !line.startsWith("#"));
    if (!body.some((line) => /one at a time/i.test(line))) errors.push(`${label} does not say its items run one at a time`);
    if (!/two re-assignments/i.test(section)) errors.push(`${label} does not cap re-assignment at two`);
    if (!/--findings/.test(section)) errors.push(`${label} never re-runs the brief with --findings`);
    if (!new RegExp(`design/\\.briefs/\\{platform\\}/${layer}-\\{Name\\}\\.findings\\.json`).test(section)) {
      errors.push(`${label} does not name its findings file design/.briefs/{platform}/${layer}-{Name}.findings.json`);
    }
    if (/Load context/.test(section)) errors.push(`${label} still loads context itself; brief.mjs loads it`);
  }

  // 1b. docs/BUILD-BRIEF.md has rules for every layer, and each layer's rules carry the
  //     shared rules and none of another layer's. layerRules is the same function the
  //     script uses to fill the task, so this checks what a child is actually handed.
  if (!brief.includes("## Rules for every layer")) errors.push("docs/BUILD-BRIEF.md has no \"## Rules for every layer\" section");
  for (const layer of BRIEF_LAYERS) {
    let rules;
    try {
      rules = layerRules(brief, layer);
    } catch (error) {
      errors.push(`docs/BUILD-BRIEF.md has no rules for ${layer}: ${error.message}`);
      continue;
    }
    for (const other of BRIEF_LAYERS.filter((name) => name !== layer)) {
      if (rules.includes(`## Rules for ${other}`)) errors.push(`${layer} rules carry the ${other} rules`);
    }
  }
  if (!/no component contract is in force, skip this section/i.test(brief)) {
    errors.push("docs/BUILD-BRIEF.md does not say to skip the component rules when no component contract is in force");
  }

  // 1c. A real brief from the fixture names both contracts with files on disk, the
  //     adapters for the stack, and the gate commands with their enforcement level.
  //     This is the contract and adapter resolution the orchestrator no longer does.
  try {
    const atoms = fixtureBrief(root);
    const styleContract = namedPath(atoms, /^- Styling contract: tailwind-web \(source: builtin, enforcement: hard-fail\)\. Read it first: (.+)$/m);
    const componentContract = namedPath(atoms, /^- Component contract: shadcn \(source: builtin, enforcement: hard-fail\)\. Read it first: (.+)$/m);
    if (!styleContract || !existsSync(styleContract)) errors.push("the fixture's atoms brief does not name a styling contract file that is on disk");
    if (!componentContract || !componentContract.endsWith("docs/component-contracts/shadcn.md") || !existsSync(componentContract)) {
      errors.push("the fixture's atoms brief does not name the component contract docs/component-contracts/shadcn.md on disk");
    }
    const adapter = namedPath(atoms, /^- Components adapter: (.+)$/m);
    if (!adapter || !adapter.endsWith("docs/adapters/shadcn.md") || !existsSync(adapter)) {
      errors.push("the fixture's atoms brief does not resolve docs/adapters/shadcn.md from tools.components");
    }
    if (!/^- Component contract \(shadcn, hard-fail\):/m.test(atoms)) {
      errors.push("the fixture's atoms brief has no component gate with its enforcement level");
    }
    const gateLine = atoms.split("\n").find((line) => line.includes("verify-styling-contract.mjs") && line.includes("component-contracts/shadcn.md"));
    if (!gateLine) errors.push("the fixture's atoms brief has no component gate command for docs/component-contracts/shadcn.md");
    if (!atoms.includes("- Installed library primitives: none recorded.")) {
      errors.push("the fixture's atoms brief does not say which library primitives scaffold installed");
    }
  } catch (error) {
    errors.push(`brief.mjs cannot build the fixture's atoms brief: ${error.message}`);
  }

  // 2. Every layer records both contract gate results, so a reader can tell a
  //    passing gate from a gate that was never run. Catalog capture is a third
  //    deterministic gate (v8 living design system) recorded beside them.
  for (const layer of LAYERS) {
    if (!build.includes(`${layer}_styling_contract`)) errors.push(`build.md exit gates never record ${layer}_styling_contract`);
    if (!build.includes(`${layer}_component_contract`)) errors.push(`build.md exit gates never record ${layer}_component_contract`);
    if (!build.includes(`${layer}_capture`)) errors.push(`build.md exit gates never record ${layer}_capture`);
  }
  if (!build.includes("verify-catalog.mjs")) {
    errors.push("build.md never invokes verify-catalog.mjs for catalog capture");
  }
  if (!build.includes("Composition mutation check") && !build.includes("composition mutation")) {
    errors.push("build.md never names the composition mutation check (--blast)");
  }

  // 3. The no-library path stays silent. A project with no component library is a
  //    first-class project: no gate, no prompt, no notice. The brief for such a platform
  //    must say no contract is in force and run no contract gate. build.md must still
  //    state the skip for its prepare step, where it pulls library primitives.
  const skipStated = (haystack, label) => {
    if (!/component_contract_source[^.\n]{0,80}(?:"none"|`none`|is `?"?none)/i.test(haystack)) {
      errors.push(`${label} does not state the skip condition for component_contract_source "none"`);
    }
  };
  skipStated(build, "build.md");
  if (!/skip[^.\n]{0,120}component_contract_source/i.test(build) && !/component_contract_source[^.\n]{0,120}skip/i.test(build)) {
    errors.push("build.md does not skip the library primitive pull when no component contract is in force");
  }
  try {
    const terminal = fixtureBrief(root, { platform: "terminal-cli" });
    if (!terminal.includes("- Component contract: none in force")) {
      errors.push("the terminal-cli brief does not say no component contract is in force");
    }
    if (terminal.includes("component-contracts/")) errors.push("the terminal-cli brief names a component contract file");
    if (!terminal.includes("No contract gate applies to this platform.")) {
      errors.push("the terminal-cli brief runs a contract gate although no contract is in force");
    }
  } catch (error) {
    errors.push(`brief.mjs cannot build the fixture's terminal-cli brief: ${error.message}`);
  }
  if (!/component_contract_source[^.\n]{0,120}(?:"none"|none)/i.test(init)) {
    errors.push("init.md does not define the no-library outcome for component_contract_source");
  }

  // 4. init resolves and records all four fields, and keeps the no-library path silent.
  for (const field of [
    "component_contract_source",
    "component_contract_enforcement",
    "component_contract_overrides",
  ]) {
    if (!init.includes(field)) errors.push(`init.md never records ${field}`);
  }
  if (!/### Resolve Component Contract/.test(init)) {
    errors.push("init.md has no 'Resolve Component Contract' step");
  }

  // 5. Built-in contracts and the table that selects them agree in both directions.
  //    A contract no table can select is dead; a table row with no file is a crash.
  const dir = path.join(packageRoot, "docs/component-contracts");
  let shipped;
  try {
    shipped = (await readdir(dir)).filter((f) => f.endsWith(".md") && f !== "README.md").map((f) => f.replace(/\.md$/, ""));
  } catch (error) {
    errors.push(`cannot read docs/component-contracts: ${error.message}`);
    shipped = [];
  }
  const selectable = selectableComponentContracts(init);
  if (selectable === null) {
    errors.push("init.md has no component-contract resolution table");
  } else {
    for (const id of shipped) {
      if (!selectable.has(id)) errors.push(`component contract '${id}' ships but no init.md table row selects it`);
    }
    for (const id of selectable) {
      if (!shipped.includes(id)) errors.push(`init.md selects component contract '${id}' but docs/component-contracts/${id}.md does not exist`);
    }
  }

  if (errors.length) throw new ContractWiringError([...new Set(errors)]);
  return { layers: LAYERS.length, builtinComponentContracts: shipped.length };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  validateContracts()
    .then((result) =>
      process.stdout.write(
        `contract wiring valid: ${result.layers} layers gated, ${result.builtinComponentContracts} built-in component contracts\n`
      )
    )
    .catch((error) => {
      process.stderr.write(`${error.message}\n`);
      for (const detail of error.details ?? []) process.stderr.write(`- ${detail}\n`);
      process.exitCode = 1;
    });
}
