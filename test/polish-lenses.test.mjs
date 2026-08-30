// Schema + lens-pack tests. Validator is the shipped findings.mjs.
// Lens files are the shipped prompts — this test checks they stand alone.

import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  exampleFinding,
  findingFingerprint,
  validateFinding,
} from "../plugins/pixel-perfect/scripts/findings.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PLUGIN = path.join(ROOT, "plugins/pixel-perfect");
const LENSES_DIR = path.join(PLUGIN, "skills/polish/lenses");
const SCHEMA_PATH = path.join(PLUGIN, "skills/polish/findings-schema.json");

const LAW_5 =
  "A lens must list the visible controls BEFORE any \"X is missing\" claim (defeats hallucinated absence — same image judged missing/present/missing across runs in the documented experiment).";
const LAW_6 =
  "\"MUST return at most 8 findings per screen. No exceptions.\" — polite phrasing (\"be ruthless\") was ignored on every measured run.";
const LAW_13 =
  "Lens prompts contain the image, the rubric, and DESIGN.md — never a narrative of what the screen is \"supposed\" to be (framing leaks into findings: models report the controls they were told to expect).";

const EXPECTED = {
  "cognitive.md": ["C1", "C2", "C3", "C4", "C5", "C6"],
  "composition.md": ["D1", "D2", "D3"],
  "a11y-manual.md": ["FOCUS-VISIBLE", "FOCUS-ORDER", "A1", "MEANINGFUL-SEQUENCE", "KEYBOARD"],
  "states-coverage.md": ["EMPTY", "LOADING", "ERROR", "LONG-CONTENT"],
  "consistency.md": ["CROSS-SCREEN"],
  "adherence.md": ["DESIGN-DO", "DESIGN-DONT"],
  "anti-slop.md": ["SLOP-GRID", "SLOP-CTA", "SLOP-PALETTE", "SLOP-DIRECTION"],
};

test("findings schema file exists and lists the required fields", () => {
  const schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf8"));
  for (const field of [
    "screen",
    "state",
    "platform",
    "lens",
    "principle",
    "tier",
    "severity",
    "observed",
    "proposal",
    "element",
    "evidence",
    "fingerprint",
  ]) {
    assert.ok(schema.properties[field], `schema missing ${field}`);
  }
  assert.deepEqual(schema.properties.tier.enum, ["T1", "T2", "T3"]);
  assert.deepEqual(schema.properties.severity.enum, ["BLOCKER", "MAJOR", "MINOR", "POLISH"]);
});

test("validator accepts a complete example finding", () => {
  const finding = exampleFinding();
  const result = validateFinding(finding);
  assert.equal(result.ok, true, result.errors.join("; "));
  assert.equal(finding.fingerprint, findingFingerprint("orders", "D3", "orders-empty-heading"));
});

test("validator rejects missing and wrong fields", () => {
  assert.equal(validateFinding({}).ok, false);
  assert.equal(validateFinding(exampleFinding({ tier: "T9" })).ok, false);
  assert.equal(validateFinding(exampleFinding({ severity: "LOW" })).ok, false);
  const missing = exampleFinding();
  delete missing.observed;
  assert.equal(validateFinding(missing).ok, false);
});

test("validator rejects model-coordinate-only element (law 9)", () => {
  const finding = exampleFinding({
    element: { ax_ref: null, testID: null, bbox: { x: 12, y: 40, width: 80, height: 20 } },
  });
  const result = validateFinding(finding);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => /ax_ref or testID|law 9/i.test(e)), result.errors.join("; "));
});

test("seven standalone lens files carry identity, rubric, calibration, contract, laws, and two examples", () => {
  const files = readdirSync(LENSES_DIR).filter((n) => n.endsWith(".md")).sort();
  assert.deepEqual(files, Object.keys(EXPECTED).sort());

  for (const [file, ids] of Object.entries(EXPECTED)) {
    const text = readFileSync(path.join(LENSES_DIR, file), "utf8");
    assert.match(text, /name@version/i, `${file} missing identity`);
    assert.match(text, /@1\.0/, `${file} missing versioned name`);
    assert.match(text, /inputs?:/i, `${file} missing inputs`);
    assert.match(text, /# Rubric|# rubric/i, `${file} missing rubric`);
    for (const id of ids) {
      assert.match(text, new RegExp(id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${file} missing rubric id ${id}`);
    }
    assert.match(text, /what NOT to file|Calibration/i, `${file} missing calibration`);
    assert.match(text, /Output contract/i, `${file} missing output contract`);
    assert.ok(text.includes(LAW_5), `${file} missing law 5 verbatim`);
    assert.ok(text.includes(LAW_6), `${file} missing law 6 verbatim`);
    assert.ok(text.includes(LAW_13), `${file} missing law 13 verbatim`);
    const examples = text.match(/```json\n\{[\s\S]*?\n\}\n```/g) || [];
    assert.ok(examples.length >= 2, `${file} needs 2 worked examples, found ${examples.length}`);
  }
});

test("no public polish command, workflow, or capability is registered", () => {
  assert.equal(existsSync(path.join(PLUGIN, "commands/polish.md")), false);
  assert.equal(existsSync(path.join(PLUGIN, "workflows/polish.md")), false);
  const caps = JSON.parse(readFileSync(path.join(ROOT, "scripts/adapters/capabilities.json"), "utf8"));
  assert.equal(caps.some((c) => c.name === "polish"), false);
  assert.equal(caps.length, 10);
});
