#!/usr/bin/env node

// Validates that the two contract kinds stay wired symmetrically.
//
// The component-library decision went unenforced for a long time not because
// anyone decided against enforcing it, but because build.md simply never
// mentioned it — while naming the styling contract by field, with both
// resolution branches and a fail-closed clause, two lines away. Nothing noticed.
//
// This validator is what notices. If a future edit drops the component contract
// from a layer's Load context, from an exit gate, or ships a contract no
// resolution table can select, CI fails here instead of a user discovering it
// after a build.

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LAYERS = ["atoms", "molecules", "organisms", "compose"];

class ContractWiringError extends Error {
  constructor(details) {
    super("contract wiring validation failed");
    this.details = details;
  }
}

// Every "N. **Load context:**" list, up to the next numbered bold step.
function loadContextBlocks(markdown) {
  const blocks = [];
  const start = /^\d+\.\s+\*\*Load context:\*\*/gm;
  let match;
  while ((match = start.exec(markdown)) !== null) {
    const from = match.index;
    const rest = markdown.slice(from + match[0].length);
    const next = rest.search(/^\d+\.\s+\*\*/m);
    blocks.push(markdown.slice(from, next === -1 ? undefined : from + match[0].length + next));
  }
  return blocks;
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

export async function validateContracts(root = REPOSITORY_ROOT) {
  const packageRoot = path.join(root, "plugins/pixel-perfect");
  const errors = [];

  const build = await readFile(path.join(packageRoot, "workflows/build.md"), "utf8");
  const init = await readFile(path.join(packageRoot, "workflows/init.md"), "utf8");

  // 1. Every layer loads both contracts. This is the check that would have caught
  //    the original asymmetry: atoms named the styling contract by field and the
  //    component library not at all.
  const blocks = loadContextBlocks(build);
  if (blocks.length !== LAYERS.length) {
    errors.push(`build.md has ${blocks.length} "Load context" blocks, expected ${LAYERS.length} (one per layer)`);
  }
  // The bare field, not one of its suffixed siblings: a plain `includes` here
  // matches "tools.component_contract_overrides" and reports a layer as wired
  // when all it does is mention the override bag.
  const namesField = (block, field) => new RegExp(`tools\\.${field}_contract(?!_)`).test(block);

  blocks.forEach((block, index) => {
    const label = `build.md "Load context" block ${index + 1}`;
    if (!namesField(block, "style")) errors.push(`${label} does not name tools.style_contract`);
    if (!namesField(block, "component")) errors.push(`${label} does not name tools.component_contract`);
    if (!/docs\/adapters\/\{components\}\.md/.test(block)) {
      errors.push(`${label} does not resolve docs/adapters/{components}.md from tools.components`);
    }
  });

  // 2. Every layer records both gate results, so a reader can tell a passing gate
  //    from a gate that was never run.
  for (const layer of LAYERS) {
    if (!build.includes(`${layer}_styling_contract`)) errors.push(`build.md exit gates never record ${layer}_styling_contract`);
    if (!build.includes(`${layer}_component_contract`)) errors.push(`build.md exit gates never record ${layer}_component_contract`);
  }

  // 3. The component gate is actually invoked and its enforcement level honored.
  if (!build.includes("component_contract_enforcement")) {
    errors.push("build.md never honors component_contract_enforcement — the gate cannot be set to warn or off");
  }
  if (!build.includes("docs/component-contracts/")) {
    errors.push("build.md never resolves a component contract path");
  }
  if (!build.includes("component_contract_overrides")) {
    errors.push("build.md never passes component_contract_overrides to the gate as --allow globs");
  }

  // 3b. The no-library path stays silent. A project with no component library is a
  //     first-class project: no gate, no prompt, no notice. If a future edit drops
  //     the skip condition, every such project starts failing a gate for a contract
  //     it was never supposed to have — so the skip is enforced, not just intended.
  const skipStated = (haystack, label) => {
    if (!/component_contract_source[^.\n]{0,80}(?:"none"|`none`|is `?"?none)/i.test(haystack)) {
      errors.push(`${label} does not state the skip condition for component_contract_source "none"`);
    }
  };
  const step1c = build.slice(build.indexOf("### Step 1c"), build.indexOf("### Step 2: Build Each Atom (continued)"));
  if (!step1c || build.indexOf("### Step 1c") === -1) {
    errors.push("build.md has no 'Step 1c' applying the component contract");
  } else {
    skipStated(step1c, "build.md Step 1c");
    if (!/\bskip\b/i.test(step1c)) errors.push("build.md Step 1c never says to skip when no contract is in force");
  }
  if (!/skip[^.\n]{0,120}component_contract_source/i.test(build) && !/component_contract_source[^.\n]{0,120}skip/i.test(build)) {
    errors.push("build.md Step 4 does not skip the component gate when no contract is in force");
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
