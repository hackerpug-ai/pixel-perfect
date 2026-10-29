// Schema validation for the harness eval result contract: test/harness/schemas/*.schema.json.
//
// A small JSON-Schema subset (type, required, properties, enum, const, pattern, minimum, items, $ref
// to a sibling schema file) is enough for these contracts and keeps the shipped schema files the
// authority rather than decoration. Beyond structure this module enforces the sprint's fail-closed
// rules: twelve unique (harness, track) cells, the pins digest, and one install mode per run.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { loadPins } from "./pins.mjs";

const SCHEMA_DIR = join(dirname(fileURLToPath(import.meta.url)), "schemas");

export const HARNESSES = ["claude-code", "codex", "grok", "opencode", "pi", "cursor"];
export const TRACKS = ["pinned", "newest"];
export const VERDICTS = ["pass", "fail", "could-not-run"];
export const SHA256_PATTERN = /^[0-9a-f]{64}$/;
export const COMMIT_PATTERN = /^[0-9a-f]{40}([0-9a-f]{24})?$/;

export class SchemaError extends Error {
  constructor(reason, details) {
    super(`${reason}: ${JSON.stringify(details)}`);
    this.name = "SchemaError";
    this.reason = reason;
    this.details = details;
  }
}

const cache = new Map();

export function loadSchema(name) {
  if (cache.has(name)) return cache.get(name);
  const schema = JSON.parse(readFileSync(join(SCHEMA_DIR, name), "utf8"));
  cache.set(name, schema);
  return schema;
}

/** Validate a value against a shipped schema file; throws SchemaError("schema-invalid"). */
export function validateAgainst(schemaName, value) {
  const errors = [];
  walk(loadSchema(schemaName), value, "$", errors);
  if (errors.length > 0) throw new SchemaError("schema-invalid", errors.slice(0, 8));
  return true;
}

function typeOf(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (Number.isInteger(value)) return "integer";
  return typeof value;
}

function matchesType(expected, value) {
  const actual = typeOf(value);
  if (expected === "number") return actual === "number" || actual === "integer";
  if (expected === "integer") return actual === "integer";
  return actual === expected;
}

function walk(schema, value, path, errors) {
  if (!schema || typeof schema !== "object") return;
  if (schema.$ref) {
    walk(loadSchema(schema.$ref), value, path, errors);
    return;
  }
  if (schema.type) {
    const expected = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!expected.some((type) => matchesType(type, value))) {
      errors.push({ path, message: `expected ${expected.join("|")}, got ${typeOf(value)}` });
      return;
    }
  }
  if (schema.const !== undefined && value !== schema.const) {
    errors.push({ path, message: `expected ${JSON.stringify(schema.const)}, got ${JSON.stringify(value)}` });
  }
  if (schema.enum && !schema.enum.some((option) => option === value)) {
    errors.push({ path, message: `expected one of ${JSON.stringify(schema.enum)}, got ${JSON.stringify(value)}` });
  }
  if (typeof schema.pattern === "string" && typeof value === "string" && !new RegExp(schema.pattern).test(value)) {
    errors.push({ path, message: `does not match ${schema.pattern}: ${JSON.stringify(value)}` });
  }
  if (schema.minimum !== undefined && typeof value === "number" && value < schema.minimum) {
    errors.push({ path, message: `below minimum ${schema.minimum}` });
  }
  if (Array.isArray(value)) {
    if (schema.items) value.forEach((item, index) => walk(schema.items, item, `${path}[${index}]`, errors));
    return;
  }
  if (value && typeof value === "object") {
    for (const required of schema.required ?? []) {
      if (!(required in value)) errors.push({ path, message: `missing required property ${required}` });
    }
    for (const [key, subSchema] of Object.entries(schema.properties ?? {})) {
      if (key in value) walk(subSchema, value[key], `${path}.${key}`, errors);
    }
  }
}

/**
 * The pins digest the artifact must bind to, computed here from the manifest bytes. A caller cannot
 * opt out of the binding, and an unreadable manifest is a refusal, never a skipped check.
 */
export function manifestPinsDigest() {
  try {
    return loadPins().pins_sha256;
  } catch (cause) {
    throw new SchemaError("pins-manifest-unreadable", { reason: cause.reason ?? String(cause) });
  }
}

/**
 * A pass needs evidence: artifacts on disk, the invocation that produced them, its raw exit status,
 * and at least one check that actually ran. A version match alone is not a grade.
 */
export function assertPassEvidence(cell) {
  if (cell?.verdict !== "pass") return true;
  const missing = [];
  if (!Array.isArray(cell.evidence_paths) || cell.evidence_paths.length === 0) missing.push("evidence_paths");
  if (typeof cell.invocation_id !== "string" || cell.invocation_id.length === 0) missing.push("invocation_id");
  if (!Number.isInteger(cell.process_exit_code)) missing.push("process_exit_code");
  const checks = Array.isArray(cell.checks) ? cell.checks : [];
  if (checks.length === 0 || checks.every((check) => check.verdict === "could-not-run")) missing.push("checks");
  if (missing.length > 0) {
    throw new SchemaError("pass-without-evidence", { cell: `${cell.harness}/${cell.track}`, missing });
  }
  return true;
}

/**
 * Validate a harness-eval-result/v1 record: structure, then the rules a schema cannot state —
 * twelve unique cells over six harnesses, a pins digest bound to this tree's manifest bytes, an
 * evidenced-only pass, and one install mode compared with a trusted dispatch sha.
 */
export function validateResult(record, { dispatchSha = null, requiredPinsSha256 } = {}) {
  // Identity first: an absent or non-hex digest is named for what it is, not for a schema symptom.
  if (typeof record?.pins_sha256 !== "string" || !SHA256_PATTERN.test(record.pins_sha256)) {
    throw new SchemaError("pins-digest-invalid", { pins_sha256: record?.pins_sha256 ?? null });
  }
  validateAgainst("harness-eval-result.v1.schema.json", record);

  const manifestSha256 = manifestPinsDigest();
  if (record.pins_sha256 !== manifestSha256) {
    throw new SchemaError("pins-digest-mismatch", { artifact: record.pins_sha256, manifest: manifestSha256 });
  }
  if (requiredPinsSha256 !== undefined && requiredPinsSha256 !== manifestSha256) {
    throw new SchemaError("pins-digest-caller-mismatch", { caller: requiredPinsSha256, manifest: manifestSha256 });
  }

  const cells = record.cells ?? [];
  const pairs = new Set(cells.map((cell) => `${cell.harness}::${cell.track}`));
  const problems = [];
  if (cells.length !== 12) problems.push(`${cells.length} cells, expected 12`);
  if (pairs.size !== cells.length) problems.push("duplicate (harness, track) pair");
  for (const harness of HARNESSES) {
    for (const track of TRACKS) {
      if (!pairs.has(`${harness}::${track}`)) problems.push(`missing cell ${harness}/${track}`);
    }
  }
  if (problems.length > 0) throw new SchemaError("cells-incomplete", problems);

  for (const cell of cells) assertPassEvidence(cell);

  validateDispatchIdentity(record, { dispatchSha });
  return { cells: cells.length, harnesses: pairs.size === 0 ? 0 : new Set(cells.map((cell) => cell.harness)).size, pairs: pairs.size };
}

/**
 * One run, one install mode, read from artifact fields — never inferred from logs. A default
 * (no-input) dispatch is checkout with the dispatch commit; published carries no checkout identity
 * and grades nothing in sprint-01.
 */
export function validateDispatchIdentity(record, { dispatchSha = null } = {}) {
  if (!["checkout", "published"].includes(record.install_mode)) {
    throw new SchemaError("mode-not-recorded", { install_mode: record.install_mode ?? null });
  }

  if (record.install_mode === "checkout") {
    if (typeof record.candidate_sha !== "string" || !COMMIT_PATTERN.test(record.candidate_sha)) {
      throw new SchemaError("candidate-sha-missing", { candidate_sha: record.candidate_sha ?? null });
    }
    // The comparison target is the caller's trusted dispatch commit, never the record's own value.
    if (!dispatchSha) {
      throw new SchemaError("dispatch-sha-unknown", { candidate_sha: record.candidate_sha });
    }
    if (record.candidate_sha !== dispatchSha) {
      throw new SchemaError("candidate-sha-mismatch", { candidate_sha: record.candidate_sha, dispatch_sha: dispatchSha });
    }
  } else {
    if (record.candidate_sha !== null && record.candidate_sha !== undefined) {
      throw new SchemaError("mode-mixup", { install_mode: "published", candidate_sha: record.candidate_sha });
    }
    const graded = (record.cells ?? []).filter((cell) => cell.verdict === "pass");
    if (graded.length > 0) {
      throw new SchemaError("published-mode-graded", {
        cells: graded.map((cell) => `${cell.harness}/${cell.track}`),
      });
    }
  }
  return true;
}
