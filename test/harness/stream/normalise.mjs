// CanonicalEvent normalisation: raw captured stdout bytes -> tiled, lossless event stream.
//
// Three invariants, each checkable from the bytes rather than asserted:
//
//   1. LOSSLESS. Every raw line survives as `original_event` beside its terminator, and the
//      concatenation of the events' spans is byte-identical to the capture. A line this table does
//      not map becomes `harness_specific` and keeps its bytes; it is never dropped.
//   2. TILED. Measured line spans cover [0, byte_length) exactly once: no gap, no overlap. The
//      completeness of a capture is therefore stated, never inferred.
//   3. FAIL-CLOSED. A required fact with no mapped event is `could-not-run` naming the fact. The
//      `harness_specific` leftovers cannot satisfy a fact, and no catch-all rule exists to try.
//
// The module reads bytes it is given. It never spawns, never reads a home session file, and never
// consults an exit code: the exit code is not an input to anything here.
import { createHash } from "node:crypto";
import { resolve } from "node:path";

import { StreamError, classifyTool, contentBlocks, extractValue, rulesFor } from "./table.mjs";

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

/**
 * Measured line spans over the raw bytes. The span includes the line's terminator, so consecutive
 * spans abut exactly; a final line with no terminator ends the stream.
 */
export function measureLines(bytes) {
  const out = [];
  let start = 0;
  while (start < bytes.length) {
    const newline = bytes.indexOf(0x0a, start);
    const end = newline === -1 ? bytes.length : newline + 1;
    const rawSpan = bytes.subarray(start, end);
    const rawText = rawSpan.toString("utf8");
    const terminator = rawText.endsWith("\n") ? "\n" : "";
    const text = terminator ? rawText.slice(0, -1) : rawText;
    let json = null;
    try {
      json = text.length > 0 ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    out.push({ offset: start, end_offset: end, text, terminator, json, raw_sha256: sha256(rawSpan) });
    start = end;
  }
  return out;
}

/**
 * The tiling report: do the measured spans cover the capture exactly once? Gaps and overlaps are
 * named by offset, so a truncated or duplicated stream cannot be reported as complete.
 */
export function tilingReport(lines, byteLength) {
  const gaps = [];
  const overlaps = [];
  let cursor = 0;
  for (const line of [...lines].sort((a, b) => a.offset - b.offset)) {
    if (line.offset > cursor) gaps.push({ from: cursor, to: line.offset });
    else if (line.offset < cursor) overlaps.push({ from: line.offset, to: Math.min(cursor, line.end_offset) });
    cursor = Math.max(cursor, line.end_offset);
  }
  if (cursor < byteLength) gaps.push({ from: cursor, to: byteLength });
  return {
    ok: gaps.length === 0 && overlaps.length === 0,
    byte_length: byteLength,
    covered: cursor,
    line_count: lines.length,
    gaps,
    overlaps,
  };
}

/** The block's own name, so a tool-call rule claims only the blocks it matched. */
function extractToolName(table, rule, block) {
  const names = rule.match?.content_block?.name_in ? table.tool_classification?.[rule.match.content_block.name_in] ?? [] : null;
  if (!names) return block?.name;
  return names.includes(block?.name) ? block.name : null;
}

/** The token that survives: what a rule says a line proves, one event per proven thing. */
function eventFor({ table, rule, line, invocationId, sequence, namespacedSession }) {
  const json = line.json;
  const base = {
    type: rule.canonical_type,
    rule_id: rule.rule_id,
    original_event: line.text,
    terminator: line.terminator,
    harness: table.harness,
    invocation_id: invocationId,
    stream_offset: line.offset,
    stream_end_offset: line.end_offset,
    raw_sha256: line.raw_sha256,
    sequence,
    session_id: namespacedSession(),
    fact_ids: [rule.fact_id, rule.also_fact_id].filter((id) => typeof id === "string"),
  };
  if (rule.classification) {
    // A tool call's identity lives on its content block, not on the line: read the very block that
    // satisfied the rule, so a line carrying several tool_use blocks yields one call per block.
    const blockFor = contentBlocks(json).find((block) => block?.type === "tool_use" && block?.name === extractToolName(table, rule, block));
    const chosen = blockFor ?? contentBlocks(json).find((block) => block?.type === "tool_use") ?? null;
    base.classification = rule.classification;
    base.call_id = chosen?.id ?? null;
    base.name = chosen?.name ?? null;
    base.arguments = chosen?.input ?? null;
    if (!base.classification) base.classification = classifyTool(table, base.name);
  }
  if (rule.rule_id === "session-init") {
    base.cli_version = extractValue(json, rule.extract?.cli_version) ?? null;
    base.permission_mode = extractValue(json, rule.extract?.permission_mode) ?? null;
  }
  if (rule.canonical_type === "agent_message") {
    const blocks = contentBlocks(json);
    base.text = blocks.filter((block) => block?.type === "text").map((block) => String(block.text ?? "")).join("");
    base.message_id = json?.message?.id ?? null;
    base.is_api_error_message = json?.is_api_error_message === true;
    base.error = json?.error ?? null;
  }
  if (rule.canonical_type === "tool_result") {
    const block = contentBlocks(json).find((entry) => entry?.type === "tool_result") ?? null;
    base.call_id = block?.tool_use_id ?? null;
    base.is_error = block?.is_error === true;
  }
  if (rule.canonical_type === "session_ended") {
    base.stop_reason = json?.stop_reason ?? null;
    base.is_error = json?.is_error === true;
    base.subtype = json?.subtype ?? null;
    base.terminal_reason = json?.terminal_reason ?? null;
  }
  if (rule.rule_id === "plugin-loaded" || rule.rule_id === "plugin-absent") {
    base.plugin_names = (json?.plugins ?? []).map((plugin) => plugin?.name ?? null);
  }
  return base;
}

/**
 * A denial's requiredness is the CASE's declaration, never the harness's claim: `true` when the
 * target is one of the paths the check declared, `false` when the check declared its paths and this
 * is not one, `null` when nobody declared anything — which the grade-writer refuses to read as
 * permission (`requiredness-undeclared`).
 */
function requirednessFor(target, requiredReadPaths) {
  if (requiredReadPaths === null || requiredReadPaths === undefined) return null;
  if (typeof target !== "string" || target.length === 0) return false;
  const absolute = resolve(target);
  return (requiredReadPaths ?? []).some((path) => {
    const wanted = resolve(String(path));
    return absolute === wanted || absolute.startsWith(`${wanted}/`);
  });
}

/**
 * Normalises a capture into CanonicalEvents.
 *
 * @param {object} options
 * @param {Buffer} options.bytes raw captured stdout
 * @param {object} options.table a table from loadTable()
 * @param {string} [options.invocation_id]
 * @param {string[]|null} [options.required_read_paths] the check's own declaration
 */
export function normalise({ bytes, table, invocation_id = null, required_read_paths = null } = {}) {
  if (!Buffer.isBuffer(bytes)) throw new StreamError("capture-bytes-missing", { type: typeof bytes });
  if (!table) throw new StreamError("mapping-table-missing");
  const lines = measureLines(bytes);
  const sessionOf = (() => {
    let cached;
    return () => {
      if (cached !== undefined) return cached;
      const init = lines.find((line) => line.json?.type === "system" && line.json?.subtype === "init");
      const id = init?.json?.session_id ?? null;
      cached = typeof id === "string" && id.length > 0 ? `${table.harness}:${id}` : null;
      return cached;
    };
  })();

  const events = [];
  for (const line of lines) {
    const rules = rulesFor(table, line);
    if (rules.length === 0) {
      events.push({
        type: "harness_specific",
        original_event: line.text,
        terminator: line.terminator,
        harness: table.harness,
        invocation_id,
        stream_offset: line.offset,
        stream_end_offset: line.end_offset,
        raw_sha256: line.raw_sha256,
        sequence: events.length,
        session_id: sessionOf(),
        fact_ids: [],
      });
      continue;
    }
    for (const rule of rules) {
      // A denial rule expands its array: zero denials means zero events, never one empty denial.
      if (rule.rule_id === "required-read-denial") {
        for (const denial of extractValue(line.json, rule.extract?.denials) ?? []) {
          const target = denial?.input?.file_path ?? denial?.input?.path ?? denial?.target ?? null;
          events.push({
            ...eventFor({ table, rule, line, invocationId: invocation_id, sequence: events.length, namespacedSession: sessionOf }),
            operation: denial?.tool_name ?? denial?.tool ?? null,
            target,
            required_read: requirednessFor(target, required_read_paths),
            denial_input: denial?.input ?? null,
          });
        }
        continue;
      }
      events.push(eventFor({ table, rule, line, invocationId: invocation_id, sequence: events.length, namespacedSession: sessionOf }));
    }
  }

  const tiling = tilingReport(lines, bytes.length);
  const factIds = new Set(events.flatMap((event) => event.fact_ids));
  const facts = (table.required_facts ?? []).map((fact) => ({
    fact_id: fact.fact_id,
    canonical_type: fact.canonical_type,
    source_event_path: fact.source_event_path,
    observed: factIds.has(fact.fact_id),
    offsets: events.filter((event) => event.fact_ids.includes(fact.fact_id)).map((event) => event.stream_offset),
  }));
  const missing = facts.filter((fact) => !fact.observed).map((fact) => fact.fact_id);
  const observed_version =
    events.find((event) => event.rule_id === "session-init")?.cli_version ?? null;

  return {
    events,
    lines,
    tiling,
    facts,
    missing,
    unknown_lines: events.filter((event) => event.type === "harness_specific").length,
    observed: {
      cli_version: observed_version,
      session_id: sessionOf(),
    },
    coverage: {
      verdict: tiling.ok && missing.length === 0 ? "pass" : "could-not-run",
      reason: !tiling.ok ? "capture-not-tiled" : missing.length > 0 ? "required-fact-unmapped" : null,
    },
  };
}

/**
 * Rebuilds the capture from the events' spans. Several rules may fire on one line (an `init` line is
 * both a session start and a plugin verdict), so the rebuild iterates the UNIQUE spans in order and
 * takes each span's bytes once — a rebuild that concatenated every event would duplicate those bytes.
 */
export function reconstruct(events) {
  const byOffset = new Map();
  for (const event of events) byOffset.set(event.stream_offset, event);
  return Buffer.from(
    [...byOffset.values()]
      .sort((a, b) => a.stream_offset - b.stream_offset)
      .map((event) => `${event.original_event}${event.terminator ?? ""}`)
      .join(""),
    "utf8",
  );
}

/**
 * The losslessness proof: the rebuilt bytes equal the capture exactly, and every event's own
 * `original_event` is the bytes at its span (so no rule may rewrite the line it cites).
 */
export function lossless(events, bytes) {
  const rebuilt = reconstruct(events);
  const rewritten = [];
  for (const event of events) {
    const span = bytes.subarray(event.stream_offset, event.stream_end_offset).toString("utf8");
    if (span !== `${event.original_event}${event.terminator ?? ""}`) {
      rewritten.push({ sequence: event.sequence, stream_offset: event.stream_offset });
    }
  }
  return {
    ok: rebuilt.equals(bytes) && rewritten.length === 0,
    sha256: sha256(rebuilt),
    byte_length: rebuilt.length,
    expected: sha256(bytes),
    rewritten,
    unique_spans: new Set(events.map((event) => event.stream_offset)).size,
  };
}

/** The events whose type is one of the named canonical types. */
export const eventsOfType = (events, ...types) => events.filter((event) => types.includes(event.type));

/** The first event of a canonical type that satisfies a predicate, or null. */
export const firstEvent = (events, type, predicate = () => true) =>
  events.find((event) => event.type === type && predicate(event)) ?? null;
