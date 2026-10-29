// The per-harness, per-version mapping table: the accepted coverage of a captured event stream.
//
// The table is data (JSON under tables/), not code, so a reviewer can diff it and so the coverage it
// claims is the coverage the validator checks. Three rules shape this module:
//
//   1. A table is keyed by harness AND exact version. There is no wildcard and no `latest`: a capture
//      that reports a different CLI version is not validated by this table, it is refused.
//   2. Coverage is a property of the TABLE (does every required fact have a rule that maps it to a
//      CanonicalEvent type?), and it is never satisfied by a permissive catch-all. The
//      `harness_specific` fallback is not a rule in this file: it is what is left over, and it never
//      counts as a fact.
//   3. Provenance travels with the table: which captured bytes prove which facts, with their sha256.
//      A table may honestly declare a fact proven only by a capture at another version — that is
//      shape evidence, not qualification, and `qualified` says which is which.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const STREAM_DIR = dirname(fileURLToPath(import.meta.url));
export const TABLE_DIR = join(STREAM_DIR, "tables");
export const TABLE_SCHEMA = "stream-mapping/v1";
export const CANONICAL_TYPES = Object.freeze([
  "session_started",
  "session_ended",
  "user_message",
  "agent_message",
  "tool_call",
  "tool_result",
  "file_edit",
  "shell_command",
  "permission_request",
  "permission_granted",
  "permission_denied",
  "checkpoint_marker",
  "agent_idle",
  "agent_active",
  "harness_specific",
]);
export const TOOL_CLASSIFICATIONS = Object.freeze(["question", "local-read", "expensive", "image-judge", "other"]);

export class StreamError extends Error {
  constructor(reason, detail = {}) {
    super(`${reason}: ${JSON.stringify(detail)}`);
    this.name = "StreamError";
    this.reason = reason;
    this.detail = detail;
  }
}

export const tableId = (harness, version) => `${harness}@${version}`;

/**
 * Loads one table by harness and exact version. An absent table is a refusal with the version named:
 * an unknown version is not graded with a neighbouring table's rules.
 */
export function loadTable({ harness = "claude-code", version, dir = TABLE_DIR } = {}) {
  if (typeof version !== "string" || !/^[0-9]+\.[0-9]+\.[0-9]+/.test(version)) {
    throw new StreamError("version-not-exact", { version: version ?? null });
  }
  const path = join(dir, `${tableId(harness, version)}.json`);
  if (!existsSync(path)) throw new StreamError("mapping-table-absent", { harness, version, path });
  const table = JSON.parse(readFileSync(path, "utf8"));
  validateTable(table, { harness, version });
  return { ...table, path, id: tableId(harness, version) };
}

/** Every table on disk, for a caller that wants to report coverage without naming a version. */
export function listTables({ dir = TABLE_DIR } = {}) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => name.slice(0, -5))
    .sort();
}

/** Structural checks a reviewer can read: schema, harness/version binding, closed vocabularies. */
export function validateTable(table, { harness = table?.harness, version = table?.cli_version } = {}) {
  const problems = [];
  const at = (why) => problems.push(why);
  if (table?.schema !== TABLE_SCHEMA) at(`schema must be ${TABLE_SCHEMA}`);
  if (table?.harness !== harness) at(`harness ${table?.harness} does not match ${harness}`);
  if (table?.cli_version !== version) at(`cli_version ${table?.cli_version} does not match ${version}`);
  if (!Array.isArray(table?.rules) || table.rules.length === 0) at("no rules");
  for (const rule of table?.rules ?? []) {
    if (typeof rule?.rule_id !== "string" || rule.rule_id.length === 0) at("a rule has no rule_id");
    if (!CANONICAL_TYPES.includes(rule?.canonical_type)) at(`rule ${rule?.rule_id} has canonical_type ${rule?.canonical_type}`);
    if (rule?.canonical_type === "harness_specific") at(`rule ${rule.rule_id} claims the fallback type as a mapping`);
    if (rule?.classification && !TOOL_CLASSIFICATIONS.includes(rule.classification)) {
      at(`rule ${rule.rule_id} has classification ${rule.classification}`);
    }
    if (typeof rule?.source_event_path !== "string" || rule.source_event_path.length === 0) {
      at(`rule ${rule.rule_id} names no source_event_path`);
    }
  }
  const ids = new Set((table?.rules ?? []).map((rule) => rule.rule_id));
  if (ids.size !== (table?.rules ?? []).length) at("duplicate rule_id");
  for (const fact of table?.required_facts ?? []) {
    if (!CANONICAL_TYPES.includes(fact?.canonical_type)) at(`required fact ${fact?.fact_id} has an unknown canonical_type`);
    if (!(table?.rules ?? []).some((rule) => rule.fact_id === fact.fact_id || rule.also_fact_id === fact.fact_id)) {
      at(`required fact ${fact?.fact_id} has no rule mapping it`);
    }
  }
  if (problems.length > 0) throw new StreamError("mapping-table-invalid", { table: tableId(harness, version), problems });
  return true;
}

/**
 * The table's own coverage: does every required fact have a rule that maps it to a CanonicalEvent
 * type, and does every rule name where in the real stream it matches? This is the claim the
 * validator checks; it says nothing yet about any particular capture.
 */
export function tableCoverage(table) {
  const facts = (table.required_facts ?? []).map((fact) => {
    const rule = (table.rules ?? []).find((candidate) => candidate.fact_id === fact.fact_id || candidate.also_fact_id === fact.fact_id) ?? null;
    return {
      fact_id: fact.fact_id,
      canonical_type: fact.canonical_type,
      source_event_path: fact.source_event_path,
      rule_id: rule?.rule_id ?? null,
      mapped: rule !== null && rule.canonical_type !== "harness_specific",
    };
  });
  const missing = facts.filter((fact) => !fact.mapped).map((fact) => fact.fact_id);
  return {
    verdict: missing.length === 0 ? "pass" : "could-not-run",
    reason: missing.length === 0 ? null : "required-fact-unmapped",
    facts,
    missing,
    rule_count: (table.rules ?? []).length,
    qualified: table.provenance?.qualified === true,
    unqualified_reason: table.provenance?.unqualified_reason ?? null,
  };
}

/** The classification of one tool name, from the table's own map. Undeclared is `other`, never `question`. */
export function classifyTool(table, name) {
  for (const [classification, names] of Object.entries(table.tool_classification ?? {})) {
    if (Array.isArray(names) && names.includes(name)) return classification;
  }
  return "other";
}

/** Content blocks of a captured line's message, or [] when the line carries no message. */
export function contentBlocks(json) {
  const content = json?.message?.content;
  return Array.isArray(content) ? content : [];
}

function matchesAny(expected, actual) {
  const list = Array.isArray(expected) ? expected : [expected];
  return list.some((value) => value === actual);
}

/** Does a content block satisfy a block predicate? `name_in` is a key into the table's tool map. */
function blockMatches(table, block, predicate) {
  if (predicate?.type && block?.type !== predicate.type) return false;
  if (predicate?.name_in) {
    const names = table.tool_classification?.[predicate.name_in] ?? [];
    if (!names.includes(block?.name)) return false;
  }
  return true;
}

/**
 * Does one captured line satisfy one rule? Every predicate present must hold; a rule with no
 * predicate matches nothing, so a blank rule can never swallow the whole stream.
 */
export function ruleMatches(table, rule, line) {
  const match = rule?.match;
  if (!match || typeof match !== "object" || Object.keys(match).length === 0) return false;
  const json = line?.json ?? null;
  const text = String(line?.text ?? "");
  let predicates = 0;
  if (match.type) {
    predicates += 1;
    if (!matchesAny(match.type, json?.type)) return false;
  }
  if (match.subtype) {
    predicates += 1;
    if (!matchesAny(match.subtype, json?.subtype)) return false;
  }
  if (match.has_key) {
    predicates += 1;
    if (!(json && Object.prototype.hasOwnProperty.call(json, match.has_key))) return false;
  }
  if (match.plugin_named) {
    predicates += 1;
    const names = (json?.plugins ?? []).map((plugin) => plugin?.name);
    if (!names.includes(match.plugin_named)) return false;
  }
  if (match.plugin_absent) {
    predicates += 1;
    if (json?.type !== "system" || json?.subtype !== "init") return false;
    const names = (json?.plugins ?? []).map((plugin) => plugin?.name);
    if (names.includes(match.plugin_absent)) return false;
  }
  if (match.content_block) {
    predicates += 1;
    if (!contentBlocks(json).some((block) => blockMatches(table, block, match.content_block))) return false;
  }
  if (match.text_match) {
    predicates += 1;
    if (!new RegExp(match.text_match).test(text)) return false;
  }
  return predicates > 0;
}

/** Every rule that fires on one line, in table order. A line may satisfy several. */
export function rulesFor(table, line) {
  return (table.rules ?? []).filter((rule) => ruleMatches(table, rule, line));
}

/** Reads a dotted extracted path out of a line's JSON, or null. No path traversal beyond the line. */
export function extractValue(json, path) {
  if (typeof path !== "string") return null;
  let cursor = json;
  for (const segment of path.split(".")) {
    if (segment === "[]") {
      if (!Array.isArray(cursor)) return null;
      cursor = cursor.map((entry) => (entry && typeof entry === "object" ? entry : null)).filter(Boolean);
      continue;
    }
    if (cursor == null) return null;
    cursor = cursor[segment];
  }
  return cursor ?? null;
}
