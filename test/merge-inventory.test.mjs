// Pure-logic tests for the deterministic inventory merge (no I/O in mergeInventories):
// an additive read returns only what it adds or changes, and the orchestrator merges it
// over the prior so nothing the prior held can be lost by a model omission.
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { mergeInventories, main } from "../plugins/pixel-perfect/scripts/merge-inventory.mjs";
import { verifyInventory } from "../plugins/pixel-perfect/scripts/verify-inventory.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const prior = () => JSON.parse(readFileSync(path.join(ROOT, "test/fixtures/inventory/valid.json"), "utf8"));
const delta = () => ({
  version: 1,
  status: "complete",
  sources: [{ ref: "https://fieldpro.example/pricing", kind: "url", hash: `sha256:${"a".repeat(64)}`, slug: "pricing", role: "inspiration" }],
  frames: [{ id: "pricing/01", png: "pricing/01.png", source: "https://fieldpro.example/pricing", label: "desktop", viewport: "1440x2000", shows: ["Button", "BillingToggle"] }],
  screens: [],
  atoms: [{ name: "Button", variants: ["ghost-arrow"], appears_on: ["pricing/01"], evidence: "ghost button with an arrow" }],
  molecules: [{ name: "BillingToggle", composes: ["Button"], appears_on: ["pricing/01"], evidence: "monthly / yearly switch" }],
  organisms: [],
  tokens_observed: { inspiration: { "https://fieldpro.example/pricing": { typography: "grotesk" } } },
  notes: ["Brand and copy from fieldpro.example were not assimilated."],
});

test("merge keeps everything the prior held and adds the delta", () => {
  const merged = mergeInventories(prior(), delta());
  const result = verifyInventory(merged, { prior: prior() });
  assert.equal(result.violations.filter((v) => v.class === "prior-dropped").length, 0, JSON.stringify(result.violations));
  assert.equal(merged.sources.length, 3);
  assert.equal(merged.frames.length, prior().frames.length + 1);
  assert.ok(merged.molecules.some((m) => m.name === "BillingToggle"));
  assert.deepEqual(merged.unclaimed_frames, prior().unclaimed_frames);
});

test("an existing component gains the delta's variants and frames; its own fields survive", () => {
  const p = prior();
  const before = p.atoms.find((a) => a.name === "Button");
  const merged = mergeInventories(p, delta());
  const button = merged.atoms.find((a) => a.name === "Button");
  assert.deepEqual(button.appears_on, [...before.appears_on, "pricing/01"]);
  assert.ok(button.variants.includes("ghost-arrow"));
  for (const v of before.variants || []) assert.ok(button.variants.includes(v), `kept variant ${v}`);
  assert.match(button.evidence, /ghost button with an arrow/);
  if (before.evidence) assert.ok(button.evidence.includes(before.evidence), "prior evidence kept");
});

test("a delta that omits prior items cannot remove them, and nothing is duplicated", () => {
  const d = delta();
  d.frames.push({ ...prior().frames[0] }); // a prior frame repeated in the delta
  const merged = mergeInventories(prior(), d);
  const ids = merged.frames.map((f) => f.id);
  assert.equal(new Set(ids).size, ids.length, "no duplicate frame ids");
  const names = merged.atoms.map((a) => a.name);
  assert.equal(new Set(names).size, names.length, "no duplicate atom names");
  for (const s of prior().screens) assert.ok(merged.screens.some((x) => x.name === s.name), `kept screen ${s.name}`);
});

test("tokens_observed and notes merge rather than replace", () => {
  const p = prior();
  p.tokens_observed = { aesthetic: { color: "ink on paper" } };
  p.notes = ["prior note"];
  const merged = mergeInventories(p, delta());
  assert.equal(merged.tokens_observed.aesthetic.color, "ink on paper");
  assert.equal(merged.tokens_observed.inspiration["https://fieldpro.example/pricing"].typography, "grotesk");
  assert.deepEqual(merged.notes, ["prior note", "Brand and copy from fieldpro.example were not assimilated."]);
  assert.equal(merged.confirmed, undefined, "a merged result is unconfirmed until the caller confirms");
});

test("CLI writes the merged inventory; a missing input is exit 2", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "pp-merge-inv-"));
  const priorPath = path.join(dir, "prior.json");
  const deltaPath = path.join(dir, "delta.json");
  const outPath = path.join(dir, "out.json");
  writeFileSync(priorPath, JSON.stringify(prior()));
  writeFileSync(deltaPath, JSON.stringify(delta()));
  assert.equal(await main([priorPath, deltaPath, "--out", outPath]), 0);
  assert.ok(JSON.parse(readFileSync(outPath, "utf8")).molecules.some((m) => m.name === "BillingToggle"));
  assert.equal(await main([path.join(dir, "missing.json"), deltaPath, "--out", outPath]), 2);
});
