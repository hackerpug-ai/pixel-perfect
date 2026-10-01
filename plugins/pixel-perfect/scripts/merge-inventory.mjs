#!/usr/bin/env node
// merge-inventory.mjs — deterministic merge of an additive read over the prior inventory.
//
// An additive design analysis (assimilate, evolve) asks the read for what it ADDS or CHANGES,
// then merges that delta over the prior here, in code. A model asked to copy a large prior
// verbatim drops things; a union in code cannot. verify-inventory.mjs --prior still checks
// the result, so a defect here fails loudly instead of losing data.
//
//   node merge-inventory.mjs <prior.json> <delta.json> --out <merged.json>
//
// Exit: 0 written · 2 unreadable input or usage error.

import { readFileSync, writeFileSync } from "node:fs";

const unique = (xs) => [...new Set(xs)];
const byKey = (items, key) => new Map((items || []).map((x) => [x[key], x]));

// Arrays a component carries that grow by union; scalars keep the prior's value unless absent.
const LIST_FIELDS = ["composes", "states", "variants", "appears_on"];

function mergeItem(prior, delta) {
  const out = { ...delta, ...prior };
  for (const field of LIST_FIELDS) {
    if (prior[field] || delta[field]) out[field] = unique([...(prior[field] || []), ...(delta[field] || [])]);
  }
  if (prior.evidence && delta.evidence && prior.evidence !== delta.evidence) out.evidence = `${prior.evidence} · ${delta.evidence}`;
  // A delta that finally draws an undrawn item retires the undrawn reason.
  if (out.undrawn && (delta.appears_on || []).length) delete out.undrawn;
  return out;
}

function mergeList(prior = [], delta = [], key, mergeOne) {
  const merged = byKey(prior, key);
  for (const d of delta) merged.set(d[key], merged.has(d[key]) ? mergeOne(merged.get(d[key]), d) : d);
  return [...merged.values()];
}

function mergeScreen(prior, delta) {
  const out = mergeItem({ ...prior, states: undefined }, { ...delta, states: undefined });
  out.states = mergeList(prior.states, delta.states, "name", (p, d) => ({ ...d, ...p, frames: unique([...(p.frames || []), ...(d.frames || [])]) }));
  return out;
}

function mergeDeep(prior = {}, delta = {}) {
  const out = { ...prior };
  for (const [k, v] of Object.entries(delta)) {
    out[k] = v && typeof v === "object" && !Array.isArray(v) && prior[k] && typeof prior[k] === "object" ? mergeDeep(prior[k], v) : (prior[k] ?? v);
  }
  return out;
}

export function mergeInventories(prior, delta) {
  const merged = {
    version: 1,
    status: prior.status === "blocked" || delta.status === "blocked" ? "blocked" : "complete",
    sources: mergeList(prior.sources, delta.sources, "ref", (p, d) => ({ ...p, ...d, frames: unique([...(p.frames || []), ...(d.frames || [])]) })),
    frames: mergeList(prior.frames, delta.frames, "id", (p, d) => ({ ...p, shows: unique([...(p.shows || []), ...(d.shows || [])]) })),
    screens: mergeList(prior.screens, delta.screens, "name", mergeScreen),
    organisms: mergeList(prior.organisms, delta.organisms, "name", mergeItem),
    molecules: mergeList(prior.molecules, delta.molecules, "name", mergeItem),
    atoms: mergeList(prior.atoms, delta.atoms, "name", mergeItem),
  };
  const unclaimed = mergeList(prior.unclaimed_frames, delta.unclaimed_frames, "id", (p) => p);
  if (unclaimed.length) merged.unclaimed_frames = unclaimed;
  const blocked = unique([...(prior.blocked || []), ...(delta.blocked || [])]);
  if (blocked.length) merged.blocked = blocked;
  const tokens = mergeDeep(prior.tokens_observed, delta.tokens_observed);
  if (Object.keys(tokens).length) merged.tokens_observed = tokens;
  const notes = unique([...(prior.notes || []), ...(delta.notes || [])]);
  if (notes.length) merged.notes = notes;
  return merged; // never `confirmed`: the caller confirms after its own question
}

export async function main(argv = process.argv.slice(2)) {
  const outIndex = argv.indexOf("--out");
  const out = outIndex >= 0 ? argv[outIndex + 1] : null;
  const [priorPath, deltaPath] = argv.filter((a, i) => !a.startsWith("--") && i !== outIndex + 1);
  if (!priorPath || !deltaPath || !out) {
    console.error("Usage: merge-inventory.mjs <prior.json> <delta.json> --out <merged.json>");
    return 2;
  }
  let prior;
  let delta;
  try {
    prior = JSON.parse(readFileSync(priorPath, "utf8"));
    delta = JSON.parse(readFileSync(deltaPath, "utf8"));
    if (!prior || typeof prior !== "object" || !delta || typeof delta !== "object") throw new Error("not an inventory object");
  } catch (error) {
    console.error(`✗ unreadable inventory: ${error.message}`);
    return 2;
  }
  writeFileSync(out, JSON.stringify(mergeInventories(prior, delta), null, 2) + "\n");
  console.log(`✓ merged ${deltaPath} over ${priorPath} → ${out}`);
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) process.exit(await main());
