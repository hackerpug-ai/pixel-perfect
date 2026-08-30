#!/usr/bin/env node
// verify-inventory.mjs — deterministic gate over design/inventory.json
//
// Validates that an inventory file meets structural and cross-reference requirements:
// - Every frame is claimed or excused
// - All component references are defined
// - Layering is correct (atoms don't compose; molecules only atoms; etc.)
// - Names are unique and PascalCase
// - Frame IDs match the required pattern
//
// Zero runtime dependencies. Exit vocabulary:
//   0 pass
//   1 violations/unclaimed frames
//   2 config/usage/shape error
//   3 vacuous (empty frames array)
//
// Usage:
//   node verify-inventory.mjs <inventory.json> [--frames <frames.json>] [--json]

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// ---------------------------------------------------------------------------
// Validators and Checks
// ---------------------------------------------------------------------------

const FRAME_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*\/[0-9]{2,}$/;
const NAME_PATTERN = /^[A-Z][A-Za-z0-9]*$/;
const HASH_PATTERN = /^sha256:[0-9a-f]{64}$/;

function validateFrameId(id) {
  return FRAME_ID_PATTERN.test(id);
}

function validateName(name) {
  return NAME_PATTERN.test(name);
}

function validateHash(hash) {
  return HASH_PATTERN.test(hash);
}

/**
 * Performs schema-level validation. Returns { valid, errors } where errors
 * is an array of messages. These are treated as exit code 2 (usage/shape).
 */
export function validateShape(inventory) {
  const errors = [];

  if (!inventory || typeof inventory !== "object") {
    errors.push("Inventory is not a JSON object");
    return { valid: false, errors };
  }

  // Check required top-level keys
  const requiredKeys = ["version", "status", "sources", "frames", "screens", "organisms", "molecules", "atoms"];
  for (const key of requiredKeys) {
    if (!(key in inventory)) {
      errors.push(`Missing required key: ${key}`);
    }
  }

  // Check for unknown top-level keys (additionalProperties: false)
  const allowedKeys = new Set([
    "version",
    "status",
    "blocked",
    "notes",
    "sources",
    "frames",
    "unclaimed_frames",
    "screens",
    "organisms",
    "molecules",
    "atoms",
    "tokens_observed",
    "confirmed",
  ]);
  for (const key of Object.keys(inventory)) {
    if (!allowedKeys.has(key)) {
      errors.push(`Unknown top-level key: ${key}`);
    }
  }

  // version must be exactly 1
  if (inventory.version !== 1) {
    errors.push(`version must be 1, found: ${inventory.version}`);
  }

  // status must be "complete" or "blocked"
  if (!["complete", "blocked"].includes(inventory.status)) {
    errors.push(`status must be "complete" or "blocked", found: ${inventory.status}`);
  }

  // If status is "blocked", blocked array must exist and be non-empty
  if (inventory.status === "blocked") {
    if (!Array.isArray(inventory.blocked) || inventory.blocked.length === 0) {
      errors.push(`status is "blocked" but blocked array is missing or empty`);
    }
  }

  // Validate sources array
  if (!Array.isArray(inventory.sources)) {
    errors.push("sources must be an array");
  } else if (inventory.sources.length === 0) {
    errors.push("sources must have at least one item");
  } else {
    for (let i = 0; i < inventory.sources.length; i++) {
      const src = inventory.sources[i];
      if (!src.ref || typeof src.ref !== "string") {
        errors.push(`sources[${i}].ref must be a string`);
      }
      if (!src.kind || !["html-deck", "url", "image", "wireframes", "code"].includes(src.kind)) {
        errors.push(`sources[${i}].kind must be one of: html-deck, url, image, wireframes, code`);
      }
      if (!src.hash || typeof src.hash !== "string" || !validateHash(src.hash)) {
        errors.push(`sources[${i}].hash must match sha256:<64 hex>, found: ${src.hash}`);
      }
      if (src.slug !== undefined && typeof src.slug === "string") {
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(src.slug)) {
          errors.push(`sources[${i}].slug must match kebab-case pattern`);
        }
      }
      if (src.frames !== undefined && !Array.isArray(src.frames)) {
        errors.push(`sources[${i}].frames must be an array if present`);
      }
    }
  }

  // Validate frames array
  if (!Array.isArray(inventory.frames)) {
    errors.push("frames must be an array");
  } else {
    for (let i = 0; i < inventory.frames.length; i++) {
      const frame = inventory.frames[i];
      if (!frame.id || !validateFrameId(frame.id)) {
        errors.push(`frames[${i}].id must match {source-slug}/{NN} pattern, found: ${frame.id}`);
      }
      if (!frame.png || typeof frame.png !== "string") {
        errors.push(`frames[${i}].png must be a string`);
      }
      if (!frame.source || typeof frame.source !== "string") {
        errors.push(`frames[${i}].source must be a string`);
      }
      if (frame.shows !== undefined && !Array.isArray(frame.shows)) {
        errors.push(`frames[${i}].shows must be an array if present`);
      }
    }
  }

  // Validate unclaimed_frames
  if (inventory.unclaimed_frames !== undefined) {
    if (!Array.isArray(inventory.unclaimed_frames)) {
      errors.push("unclaimed_frames must be an array");
    } else {
      for (let i = 0; i < inventory.unclaimed_frames.length; i++) {
        const unc = inventory.unclaimed_frames[i];
        if (!unc.id || !validateFrameId(unc.id)) {
          errors.push(`unclaimed_frames[${i}].id must match {source-slug}/{NN} pattern`);
        }
        if (!unc.reason || typeof unc.reason !== "string" || unc.reason.length < 3) {
          errors.push(`unclaimed_frames[${i}].reason must be a string of at least 3 characters`);
        }
      }
    }
  }

  // Validate screens
  if (!Array.isArray(inventory.screens)) {
    errors.push("screens must be an array");
  } else {
    for (let i = 0; i < inventory.screens.length; i++) {
      const screen = inventory.screens[i];
      if (!screen.name || !validateName(screen.name)) {
        errors.push(`screens[${i}].name must be PascalCase, found: ${screen.name}`);
      }
      if (!screen.route || typeof screen.route !== "string" || screen.route.length === 0) {
        errors.push(`screens[${i}].route must be a non-empty string`);
      }
      if (!Array.isArray(screen.states) || screen.states.length === 0) {
        errors.push(`screens[${i}].states must be a non-empty array`);
      } else {
        for (let j = 0; j < screen.states.length; j++) {
          const state = screen.states[j];
          if (!state.name || typeof state.name !== "string" || state.name.length === 0) {
            errors.push(`screens[${i}].states[${j}].name must be a non-empty string`);
          }
        }
      }
      if (screen.composes !== undefined && !Array.isArray(screen.composes)) {
        errors.push(`screens[${i}].composes must be an array if present`);
      }
    }
  }

  // Validate organisms
  if (!Array.isArray(inventory.organisms)) {
    errors.push("organisms must be an array");
  } else {
    for (let i = 0; i < inventory.organisms.length; i++) {
      const org = inventory.organisms[i];
      if (!org.name || !validateName(org.name)) {
        errors.push(`organisms[${i}].name must be PascalCase`);
      }
      if (!Array.isArray(org.composes)) {
        errors.push(`organisms[${i}].composes must be an array`);
      }
    }
  }

  // Validate molecules
  if (!Array.isArray(inventory.molecules)) {
    errors.push("molecules must be an array");
  } else {
    for (let i = 0; i < inventory.molecules.length; i++) {
      const mol = inventory.molecules[i];
      if (!mol.name || !validateName(mol.name)) {
        errors.push(`molecules[${i}].name must be PascalCase`);
      }
      if (!Array.isArray(mol.composes)) {
        errors.push(`molecules[${i}].composes must be an array`);
      }
    }
  }

  // Validate atoms
  if (!Array.isArray(inventory.atoms)) {
    errors.push("atoms must be an array");
  } else {
    for (let i = 0; i < inventory.atoms.length; i++) {
      const atom = inventory.atoms[i];
      if (!atom.name || !validateName(atom.name)) {
        errors.push(`atoms[${i}].name must be PascalCase`);
      }
      // Atoms must not have non-empty composes
      if (Array.isArray(atom.composes) && atom.composes.length > 0) {
        errors.push(`atoms[${i}].name (${atom.name}): atoms must not compose anything`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Performs content-level validation. Returns { exit, violations, warnings, summary }
 * where violations is an array of { class, path, message } objects.
 */
export function verifyInventory(inventory, options = {}) {
  const violations = [];
  const warnings = [];

  // Early exit for vacuous scan (empty frames)
  if (!Array.isArray(inventory.frames) || inventory.frames.length === 0) {
    return {
      exit: 3,
      violations: [],
      warnings: [],
      summary: { frames: 0, claimed: 0, unclaimed: 0, atoms: 0, molecules: 0, organisms: 0, screens: 0, states: 0 },
    };
  }

  // Build indexes for quick lookup
  const frameIds = new Set(inventory.frames.map((f) => f.id));
  const unclaimedIds = new Set((inventory.unclaimed_frames || []).map((u) => u.id));

  const atomsByName = new Map(inventory.atoms.map((a) => [a.name, a]));
  const moleculesByName = new Map(inventory.molecules.map((m) => [m.name, m]));
  const organismsByName = new Map(inventory.organisms.map((o) => [o.name, o]));
  const screensByName = new Map(inventory.screens.map((s) => [s.name, s]));

  // Track all names for duplicate detection
  const allNames = new Map();
  for (const a of inventory.atoms) allNames.set(a.name.toLowerCase(), { name: a.name, layer: "atom" });
  for (const m of inventory.molecules) allNames.set(m.name.toLowerCase(), { name: m.name, layer: "molecule" });
  for (const o of inventory.organisms) allNames.set(o.name.toLowerCase(), { name: o.name, layer: "organism" });
  for (const s of inventory.screens) allNames.set(s.name.toLowerCase(), { name: s.name, layer: "screen" });

  // Check A1: status "blocked" means gate fails immediately
  if (inventory.status === "blocked") {
    for (const reason of inventory.blocked || []) {
      violations.push({
        class: "status-blocked",
        path: `blocked[]`,
        message: reason,
      });
    }
    return {
      exit: 1,
      violations,
      warnings,
      summary: {
        frames: inventory.frames.length,
        claimed: 0,
        unclaimed: (inventory.unclaimed_frames || []).length,
        atoms: inventory.atoms.length,
        molecules: inventory.molecules.length,
        organisms: inventory.organisms.length,
        screens: inventory.screens.length,
        states: inventory.screens.reduce((sum, s) => sum + (s.states || []).length, 0),
      },
    };
  }

  // Check A2: atoms must not compose (already checked in shape, but verify again)
  for (let i = 0; i < inventory.atoms.length; i++) {
    const atom = inventory.atoms[i];
    if (Array.isArray(atom.composes) && atom.composes.length > 0) {
      violations.push({
        class: "atom-composing",
        path: `atoms[${i}].${atom.name}`,
        message: `atoms must not compose; found: ${atom.composes.join(", ")}`,
      });
    }
  }

  // Check B: Unclaimed frames — frames not referenced anywhere and not in unclaimed_frames
  const referencedFrames = new Set();
  for (const screen of inventory.screens) {
    for (const state of screen.states || []) {
      for (const frameId of state.frames || []) {
        referencedFrames.add(frameId);
      }
    }
  }
  for (const atom of inventory.atoms) {
    for (const frameId of atom.appears_on || []) {
      referencedFrames.add(frameId);
    }
  }
  for (const mol of inventory.molecules) {
    for (const frameId of mol.appears_on || []) {
      referencedFrames.add(frameId);
    }
  }
  for (const org of inventory.organisms) {
    for (const frameId of org.appears_on || []) {
      referencedFrames.add(frameId);
    }
  }

  for (let i = 0; i < inventory.frames.length; i++) {
    const frame = inventory.frames[i];
    if (!referencedFrames.has(frame.id) && !unclaimedIds.has(frame.id)) {
      violations.push({
        class: "unclaimed-frame",
        path: `frames[${i}]`,
        message: `${frame.id}: not referenced by any screen state or component appears_on, and not in unclaimed_frames`,
      });
    }
  }

  // Check C: Unknown frame references — any frame id referenced in shows[], appears_on[], etc. that isn't in frames[]
  const allReferences = new Set();
  for (const frame of inventory.frames) {
    for (const show of frame.shows || []) {
      // shows names are component names, not frame ids, handled separately
    }
  }
  for (const screen of inventory.screens) {
    for (const state of screen.states || []) {
      for (const frameId of state.frames || []) {
        allReferences.add(frameId);
        if (!frameIds.has(frameId) && !unclaimedIds.has(frameId)) {
          violations.push({
            class: "unknown-frame-reference",
            path: `screens[].${screen.name}.states[].${state.name}.frames[]`,
            message: `${frameId}: referenced in screen state but not in frames[] or unclaimed_frames[]`,
          });
        }
      }
    }
  }
  for (const atom of inventory.atoms) {
    for (const frameId of atom.appears_on || []) {
      allReferences.add(frameId);
      if (!frameIds.has(frameId) && !unclaimedIds.has(frameId)) {
        violations.push({
          class: "unknown-frame-reference",
          path: `atoms[].${atom.name}.appears_on[]`,
          message: `${frameId}: referenced in atom appears_on but not in frames[] or unclaimed_frames[]`,
        });
      }
    }
  }
  for (const mol of inventory.molecules) {
    for (const frameId of mol.appears_on || []) {
      allReferences.add(frameId);
      if (!frameIds.has(frameId) && !unclaimedIds.has(frameId)) {
        violations.push({
          class: "unknown-frame-reference",
          path: `molecules[].${mol.name}.appears_on[]`,
          message: `${frameId}: referenced in molecule appears_on but not in frames[] or unclaimed_frames[]`,
        });
      }
    }
  }
  for (const org of inventory.organisms) {
    for (const frameId of org.appears_on || []) {
      allReferences.add(frameId);
      if (!frameIds.has(frameId) && !unclaimedIds.has(frameId)) {
        violations.push({
          class: "unknown-frame-reference",
          path: `organisms[].${org.name}.appears_on[]`,
          message: `${frameId}: referenced in organism appears_on but not in frames[] or unclaimed_frames[]`,
        });
      }
    }
  }
  for (const unc of inventory.unclaimed_frames || []) {
    if (!frameIds.has(unc.id) && !unclaimedIds.has(unc.id)) {
      violations.push({
        class: "unknown-frame-reference",
        path: `unclaimed_frames[].${unc.id}`,
        message: `${unc.id}: in unclaimed_frames but not in frames[]`,
      });
    }
  }

  // Check D: Layering — molecules compose only atoms; organisms compose atoms/molecules; screens compose atoms/molecules/organisms
  for (let i = 0; i < inventory.molecules.length; i++) {
    const mol = inventory.molecules[i];
    for (const compName of mol.composes || []) {
      if (moleculesByName.has(compName)) {
        violations.push({
          class: "layering",
          path: `molecules[${i}].${mol.name}.composes[]`,
          message: `molecule ${mol.name} composes another molecule ${compName} (only atoms allowed)`,
        });
      }
      if (organismsByName.has(compName)) {
        violations.push({
          class: "layering",
          path: `molecules[${i}].${mol.name}.composes[]`,
          message: `molecule ${mol.name} composes organism ${compName} (only atoms allowed)`,
        });
      }
      if (screensByName.has(compName)) {
        violations.push({
          class: "layering",
          path: `molecules[${i}].${mol.name}.composes[]`,
          message: `molecule ${mol.name} composes screen ${compName} (invalid)`,
        });
      }
      if (!atomsByName.has(compName) && !moleculesByName.has(compName) && !organismsByName.has(compName) && !screensByName.has(compName)) {
        violations.push({
          class: "unknown-compose",
          path: `molecules[${i}].${mol.name}.composes[]`,
          message: `molecule ${mol.name} composes unknown name: ${compName}`,
        });
      }
    }
  }

  for (let i = 0; i < inventory.organisms.length; i++) {
    const org = inventory.organisms[i];
    for (const compName of org.composes || []) {
      if (organismsByName.has(compName)) {
        violations.push({
          class: "layering",
          path: `organisms[${i}].${org.name}.composes[]`,
          message: `organism ${org.name} composes another organism ${compName} (only atoms/molecules allowed)`,
        });
      }
      if (screensByName.has(compName)) {
        violations.push({
          class: "layering",
          path: `organisms[${i}].${org.name}.composes[]`,
          message: `organism ${org.name} composes screen ${compName} (invalid)`,
        });
      }
      if (!atomsByName.has(compName) && !moleculesByName.has(compName) && !organismsByName.has(compName) && !screensByName.has(compName)) {
        violations.push({
          class: "unknown-compose",
          path: `organisms[${i}].${org.name}.composes[]`,
          message: `organism ${org.name} composes unknown name: ${compName}`,
        });
      }
    }
  }

  for (let i = 0; i < inventory.screens.length; i++) {
    const screen = inventory.screens[i];
    for (const compName of screen.composes || []) {
      if (!atomsByName.has(compName) && !moleculesByName.has(compName) && !organismsByName.has(compName) && !screensByName.has(compName)) {
        violations.push({
          class: "unknown-compose",
          path: `screens[${i}].${screen.name}.composes[]`,
          message: `screen ${screen.name} composes unknown name: ${compName}`,
        });
      }
    }
  }

  // Check E: Unknown shows — a frame's shows[] name that doesn't exist in any layer
  for (let i = 0; i < inventory.frames.length; i++) {
    const frame = inventory.frames[i];
    for (const showName of frame.shows || []) {
      if (!atomsByName.has(showName) && !moleculesByName.has(showName) && !organismsByName.has(showName) && !screensByName.has(showName)) {
        violations.push({
          class: "unknown-shows",
          path: `frames[${i}].${frame.id}.shows[]`,
          message: `shows name ${showName} not found in any layer or screen`,
        });
      }
    }
  }

  // Check F: Undrawn state — a screen state with no frames and no undrawn reason
  for (let i = 0; i < inventory.screens.length; i++) {
    const screen = inventory.screens[i];
    for (let j = 0; j < (screen.states || []).length; j++) {
      const state = screen.states[j];
      const hasFrames = Array.isArray(state.frames) && state.frames.length > 0;
      const hasUndrawn = typeof state.undrawn === "string" && state.undrawn.length >= 3;
      if (!hasFrames && !hasUndrawn) {
        violations.push({
          class: "undrawn-state",
          path: `screens[${i}].${screen.name}.states[${j}].${state.name}`,
          message: `screen state has no frames and no undrawn reason`,
        });
      }
    }
  }

  // Check G: Undrawn component — atoms/molecules/organisms with no appears_on and no undrawn reason
  for (let i = 0; i < inventory.atoms.length; i++) {
    const atom = inventory.atoms[i];
    const hasAppears = Array.isArray(atom.appears_on) && atom.appears_on.length > 0;
    const hasUndrawn = typeof atom.undrawn === "string" && atom.undrawn.length >= 3;
    if (!hasAppears && !hasUndrawn) {
      violations.push({
        class: "undrawn-component",
        path: `atoms[${i}].${atom.name}`,
        message: `atom has no appears_on and no undrawn reason`,
      });
    }
  }
  for (let i = 0; i < inventory.molecules.length; i++) {
    const mol = inventory.molecules[i];
    const hasAppears = Array.isArray(mol.appears_on) && mol.appears_on.length > 0;
    const hasUndrawn = typeof mol.undrawn === "string" && mol.undrawn.length >= 3;
    if (!hasAppears && !hasUndrawn) {
      violations.push({
        class: "undrawn-component",
        path: `molecules[${i}].${mol.name}`,
        message: `molecule has no appears_on and no undrawn reason`,
      });
    }
  }
  for (let i = 0; i < inventory.organisms.length; i++) {
    const org = inventory.organisms[i];
    const hasAppears = Array.isArray(org.appears_on) && org.appears_on.length > 0;
    const hasUndrawn = typeof org.undrawn === "string" && org.undrawn.length >= 3;
    if (!hasAppears && !hasUndrawn) {
      violations.push({
        class: "undrawn-component",
        path: `organisms[${i}].${org.name}`,
        message: `organism has no appears_on and no undrawn reason`,
      });
    }
  }

  // Check H: Duplicate names (case-insensitive)
  const namesCounted = new Map();
  for (const atom of inventory.atoms) {
    const lower = atom.name.toLowerCase();
    namesCounted.set(lower, (namesCounted.get(lower) || 0) + 1);
  }
  for (const mol of inventory.molecules) {
    const lower = mol.name.toLowerCase();
    namesCounted.set(lower, (namesCounted.get(lower) || 0) + 1);
  }
  for (const org of inventory.organisms) {
    const lower = org.name.toLowerCase();
    namesCounted.set(lower, (namesCounted.get(lower) || 0) + 1);
  }
  for (const screen of inventory.screens) {
    const lower = screen.name.toLowerCase();
    namesCounted.set(lower, (namesCounted.get(lower) || 0) + 1);
  }
  for (const [lower, count] of namesCounted.entries()) {
    if (count > 1) {
      violations.push({
        class: "duplicate-name",
        path: lower,
        message: `name ${lower} appears ${count} times across layers (case-insensitive)`,
      });
    }
  }

  // Check I: Duplicate routes
  const routesCounted = new Map();
  for (const screen of inventory.screens) {
    const route = screen.route;
    routesCounted.set(route, (routesCounted.get(route) || 0) + 1);
  }
  for (const [route, count] of routesCounted.entries()) {
    if (count > 1) {
      violations.push({
        class: "duplicate-route",
        path: route,
        message: `route ${route} appears ${count} times`,
      });
    }
  }

  // Check J: Frames coverage (with --frames option)
  if (options.frames) {
    const renderedFrameIds = new Set(options.frames.frames?.map((f) => f.id) || []);
    for (const frameId of renderedFrameIds) {
      if (!frameIds.has(frameId) && !unclaimedIds.has(frameId)) {
        violations.push({
          class: "frames-coverage",
          path: frameId,
          message: `rendered frame ${frameId} not in inventory frames[] or unclaimed_frames[]`,
        });
      }
    }

    // Check for rendered sources with non-"rendered" status (warnings, not violations)
    for (const source of options.frames.sources || []) {
      if (source.status && source.status !== "rendered") {
        warnings.push({
          class: "source-status",
          message: `source ${source.ref} has status "${source.status}" (not rendered)`,
        });
      }
    }
  }

  const claimedCount = Array.from(referencedFrames).filter((id) => frameIds.has(id)).length;

  return {
    exit: violations.length === 0 ? 0 : 1,
    violations,
    warnings,
    summary: {
      frames: inventory.frames.length,
      claimed: claimedCount,
      unclaimed: (inventory.unclaimed_frames || []).length,
      atoms: inventory.atoms.length,
      molecules: inventory.molecules.length,
      organisms: inventory.organisms.length,
      screens: inventory.screens.length,
      states: inventory.screens.reduce((sum, s) => sum + (s.states || []).length, 0),
    },
  };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function usage() {
  process.stderr.write("Usage: verify-inventory.mjs <inventory.json> [--frames <frames.json>] [--json]\n" +
    "  Exit: 0 pass · 1 violations · 2 config/usage/shape · 3 vacuous (empty frames)\n");
}

function parseArgs(argv) {
  if (argv.length === 0) return { error: "No inventory file specified" };

  let inventoryPath = null;
  let framesPath = null;
  let jsonOnly = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") {
      return { help: true };
    }
    if (arg === "--json") {
      jsonOnly = true;
    } else if (arg === "--frames") {
      framesPath = argv[++i];
      if (!framesPath) return { error: "--frames requires a path" };
    } else if (!inventoryPath) {
      inventoryPath = arg;
    } else {
      return { error: `Unexpected argument: ${arg}` };
    }
  }

  if (!inventoryPath) return { error: "No inventory file specified" };

  return { inventoryPath, framesPath, jsonOnly };
}

export function main(argv) {
  const parsed = parseArgs(argv);

  if (parsed.help) {
    usage();
    return 0;
  }

  if (parsed.error) {
    process.stderr.write(`USAGE ERROR: ${parsed.error}\n`);
    usage();
    return 2;
  }

  const { inventoryPath, framesPath, jsonOnly } = parsed;

  // Read inventory
  let inventory;
  try {
    if (!existsSync(inventoryPath)) {
      throw new Error(`File not found`);
    }
    const content = readFileSync(inventoryPath, "utf8");
    inventory = JSON.parse(content);
  } catch (error) {
    const msg = error.message.includes("Unexpected token")
      ? `inventory is not valid JSON: ${error.message}`
      : `cannot read inventory file: ${error.message}`;
    if (!jsonOnly) process.stderr.write(`CONFIG ERROR: ${msg}\n`);
    return 2;
  }

  // Validate shape
  const shapeCheck = validateShape(inventory);
  if (!shapeCheck.valid) {
    const msg = shapeCheck.errors[0];
    if (!jsonOnly) process.stderr.write(`CONFIG ERROR: ${msg}\n`);
    if (jsonOnly) {
      process.stdout.write(JSON.stringify({
        exit: 2,
        summary: {},
        violations: shapeCheck.errors.map((m) => ({ class: "schema", message: m })),
        warnings: [],
      }) + "\n");
    }
    return 2;
  }

  // Read frames.json if provided
  let framesData = null;
  if (framesPath) {
    try {
      if (!existsSync(framesPath)) {
        throw new Error(`File not found`);
      }
      const content = readFileSync(framesPath, "utf8");
      framesData = JSON.parse(content);
    } catch (error) {
      const msg = error.message.includes("Unexpected token")
        ? `frames.json is not valid JSON: ${error.message}`
        : `cannot read frames file: ${error.message}`;
      if (!jsonOnly) process.stderr.write(`CONFIG ERROR: ${msg}\n`);
      return 2;
    }
  }

  // Verify
  const result = verifyInventory(inventory, framesData ? { frames: framesData } : {});

  // Output
  if (jsonOnly) {
    process.stdout.write(JSON.stringify({
      exit: result.exit,
      summary: result.summary,
      violations: result.violations,
      warnings: result.warnings,
    }) + "\n");
  } else {
    const { summary, violations, warnings } = result;
    const firstLine = `INVENTORY — ${summary.frames} frames (${summary.claimed} claimed · ${summary.unclaimed} unclaimed) · ` +
      `${summary.atoms} atoms · ${summary.molecules} molecules · ${summary.organisms} organisms · ` +
      `${summary.screens} screens (${summary.states} states)`;
    process.stdout.write(firstLine + "\n");

    for (const v of violations) {
      process.stdout.write(`✗ [${v.class}] ${v.path} — ${v.message}\n`);
    }
    for (const w of warnings) {
      process.stdout.write(`⚠ ${w.message}\n`);
    }

    if (result.exit === 0) {
      process.stdout.write("✓ INVENTORY COVERED\n");
    }
  }

  return result.exit;
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) process.exit(main(process.argv.slice(2)));
