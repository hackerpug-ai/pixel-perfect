// Grading from the CanonicalEvent stream, not from the process.
//
// The record-level rules (termination, resolvable citations, required facts, required-read denials)
// stay in T3's `gradeFromEvidence`. What this module changes is where the FACTS come from: the
// capture's `observations` are replaced by what the normaliser derived from the captured bytes, so a
// claim can only exist if an event supports it at a real span with a real digest. Three of the rules
// below are the ones the sprint exists to get right:
//
//   * `subtype: success` / `is_error: false` is not a verdict. A completion event is a fact; whether
//     the model answered is a separate question, and when the CLI reports an API error it did not.
//   * a question in a list/status/verify stream fails that check at the question's own offset.
//   * a must-ask probe needs exactly one question and zero deliveries, and may only be graded from a
//     prefix the recorder marked complete (see question-boundary.mjs).
//
// The process exit code is never read here. It travels beside the verdict as a diagnostic, which is
// exactly because it is not one.
import { worstVerdict } from "../lib/verdict.mjs";

import { gradeFromEvidence } from "../runtime/grade-writer.mjs";
import { assertPassEvidence, validateAgainst } from "../validate.mjs";
import { gradeQuestionPolicy, questionBoundary } from "./question-boundary.mjs";

const block = (verdict, reason, detail = {}) => ({ verdict, reason, ...detail });

/** The identity a caller may omit: every unproven field null, which the schema still accepts. */
export function provisionalInstallation(version) {
  return {
    requested_cli_version: version ?? null,
    resolved_cli_version: version ?? null,
    observed_cli_version: null,
    install_mode: "checkout",
    plugin_revision: null,
    expected_plugin_manifest_sha256: null,
    observed_plugin_manifest_sha256: null,
    loaded_plugin_root: null,
    plugin_load_evidence: null,
  };
}

/**
 * Turns events into the observations `gradeFromEvidence` grades from. One observation per fact an
 * event claims, keeping the event's span and digest, so the citation still resolves against the
 * captured bytes. Nothing is added that an event did not produce.
 */
export function observationsFromEvents(events = []) {
  const out = [];
  for (const event of events) {
    for (const factId of event.fact_ids ?? []) {
      out.push({
        sequence: out.length,
        fact_id: factId,
        kind: event.type,
        operation: event.operation ?? null,
        target: event.target ?? null,
        required_read: event.required_read ?? null,
        stream_offset: event.stream_offset,
        stream_end_offset: event.stream_end_offset,
        raw_sha256: event.raw_sha256,
      });
    }
    if (event.type === "permission_denied") {
      out.push({
        sequence: out.length,
        fact_id: null,
        kind: "permission_denied",
        operation: event.operation ?? null,
        target: event.target ?? null,
        required_read: event.required_read ?? null,
        stream_offset: event.stream_offset,
        stream_end_offset: event.stream_end_offset,
        raw_sha256: event.raw_sha256,
      });
    }
  }
  return out;
}

/**
 * What the stream says the model produced. `answered` is true only when an agent message carries
 * text AND the completion event reported no error: the CLI's own auth failure emits a text block
 * ("Not logged in · Please run /login") under `subtype: success`, which is precisely the shape that
 * must never be read as an answer.
 */
export function streamAnswer(events = []) {
  const messages = events.filter((event) => event.type === "agent_message" && event.rule_id === "agent-text");
  const completion = events.find((event) => event.type === "session_ended") ?? null;
  const text = messages.map((event) => event.text ?? "").join("");
  const apiError = messages.find((event) => event.is_api_error_message === true) ?? null;
  if (!completion) return { answered: false, reason: "no-completion-event", text: null, completion: null };
  if (completion.is_error === true) {
    return {
      answered: false,
      reason: "model-never-answered",
      detail: { stop_reason: completion.stop_reason ?? null, terminal_reason: completion.terminal_reason ?? null, subtype: completion.subtype ?? null },
      text: null,
      completion,
    };
  }
  if (apiError) return { answered: false, reason: "model-never-answered", detail: { error: apiError.error ?? null }, text: null, completion };
  if (text.trim() === "") return { answered: false, reason: "empty-model-reply", text: null, completion };
  return { answered: true, reason: null, text, completion };
}

/** Denials the stream shows, split by the requiredness the CASE declared. */
export function streamDenials(events = []) {
  const all = events.filter((event) => event.type === "permission_denied");
  return {
    all,
    required: all.filter((event) => event.required_read === true),
    optional: all.filter((event) => event.required_read === false),
    undeclared: all.filter((event) => event.required_read !== true && event.required_read !== false),
  };
}

/**
 * Grades one check from a stream and its capture record.
 *
 * @param {object} options
 * @param {object} options.record the InvocationCapture record (termination, citations, exit code)
 * @param {object[]} options.events the CanonicalEvents for that record's bytes
 * @param {string} options.check_id
 * @param {string} [options.ask_policy] ask-nothing | must-ask
 * @param {string[]} [options.required_facts] fact ids the check must see (default: what the events claim)
 */
export function gradeStreamCheck({
  record,
  events,
  check_id,
  ask_policy = "ask-nothing",
  required_facts = null,
  installation = null,
  harness = "claude-code",
  track = "pinned",
  evidence_paths = null,
  report_paths = [],
  graded = true,
} = {}) {
  if (!record) throw new Error("gradeStreamCheck needs a capture record");
  if (!Array.isArray(events)) throw new Error("gradeStreamCheck needs normalised events");

  const facts = required_facts ?? [...new Set(events.flatMap((event) => event.fact_ids ?? []))];
  const streamRecord = { ...record, observations: observationsFromEvents(events) };
  const base = gradeFromEvidence({
    record: streamRecord,
    installation: installation ?? provisionalInstallation(null),
    harness,
    track,
    check_id,
    evidence_paths: evidence_paths ?? record.evidence_paths ?? [],
    report_paths,
    required_facts: facts.map((fact_id) => ({ fact_id })),
  });

  if (record.refusal) {
    return { cell: base, blocks: base.block_reasons, answer: null, questions: questionBoundary(events), stop: null };
  }

  const blocks = [];
  const answer = streamAnswer(events);
  const pluginEvent = events.find((event) => event.rule_id === "plugin-loaded" || event.rule_id === "plugin-absent") ?? null;
  const pluginLoaded = pluginEvent?.rule_id === "plugin-loaded";

  if (graded && (record.model_request_count ?? 0) > 0 && pluginEvent && !pluginLoaded) {
    blocks.push(block("could-not-run", "plugin-not-loaded", { plugins: pluginEvent.plugin_names ?? [] }));
  }

  const policy = gradeQuestionPolicy({ events, ask_policy, record, question_mapped: true });
  for (const entry of policy.blocks) if (entry.verdict !== "pass") blocks.push(entry);

  const questionSatisfied = ask_policy === "must-ask" && policy.boundary.count > 0;
  if (graded && !questionSatisfied && !answer.answered) {
    blocks.push(block("could-not-run", answer.reason, answer.detail ?? {}));
  }

  const verdict = worstVerdict([base.verdict, ...blocks.map((entry) => entry.verdict)]);
  const winner =
    blocks.find((entry) => entry.verdict === verdict) ??
    base.block_reasons.find((entry) => entry.verdict === verdict) ??
    null;

  const cell = {
    ...base,
    verdict,
    reason: winner?.reason ?? base.reason,
    checks: [{ check_id, verdict, reason: winner?.reason ?? base.reason, source: base.source }],
    block_reasons: [...blocks, ...base.block_reasons],
    stream_evidence: {
      event_count: events.length,
      unknown_lines: events.filter((event) => event.type === "harness_specific").length,
      completion: answer.completion
        ? {
            stream_offset: answer.completion.stream_offset,
            is_error: answer.completion.is_error,
            subtype: answer.completion.subtype,
            stop_reason: answer.completion.stop_reason,
          }
        : null,
      questions: questionBoundary(events),
      boundary_stop: policy.stop,
    },
  };
  if (worstVerdict([base.verdict, verdict]) !== verdict) {
    throw new Error(`check ${check_id} improved the record verdict ${base.verdict} -> ${verdict}`);
  }
  // The cell was validated inside gradeFromEvidence; this module then added the stream evidence, so
  // the contract is re-checked on the object that will actually travel.
  validateAgainst("harness-cell.v1.schema.json", cell);
  assertPassEvidence(cell);
  return { cell, blocks, answer, questions: cell.stream_evidence.questions, stop: policy.stop };
}
