// Question boundary semantics, read from the stream and from nothing else.
//
// The two policies the PRD splits:
//
//   * ask-nothing (list / status / verify): the FIRST question observed in the stream fails the
//     check, and the failure cites that question's stream offset. A zero-question count is what
//     makes the check satisfiable at all, so an empty count can never be a pass on its own.
//   * must-ask (the independent FirstQuestionCase): the probe stops at the first valid question and
//     sends nothing. Exactly one question passes; zero and two both fail.
//
// The boundary-stop exception is narrow and cannot be widened here. A capture may grade a must-ask
// probe from its prefix WITHOUT a native `session_ended`, but only when the recorder says
// `termination_kind: boundary-stop`, the recorded `boundary_event_offset` is the first question's own
// offset, and the prefix really is complete through it. A timeout, an unexplained kill, or a
// boundary offset that names no question stays `could-not-run` — the exception must never turn a
// broken capture into a pass. Nothing in this module fabricates a stop: a boundary that the capture
// did not record is reported as absent, not manufactured.
import { worstVerdict } from "../lib/verdict.mjs";

export const ASK_POLICIES = Object.freeze(["ask-nothing", "must-ask"]);

/** Every question event in the stream, in order, with the offset that proves each one. */
export function questions(events = []) {
  return events.filter((event) => event.type === "tool_call" && event.classification === "question");
}

/**
 * What the stream says about questions.
 *
 * `answers_delivered` counts answer deliveries the stream itself shows. A `-p` invocation with a
 * closed stdin cannot receive one, so the count is 0 and `answers_possible` is false — recorded as
 * the observation it is, rather than asserted from the flag.
 */
export function questionBoundary(events = []) {
  const asked = questions(events);
  const delivered = events.filter((event) => event.type === "user_message" && event.answer_delivery === true);
  return {
    count: asked.length,
    offsets: asked.map((event) => event.stream_offset),
    first_offset: asked[0]?.stream_offset ?? null,
    first_call_id: asked[0]?.call_id ?? null,
    answers_delivered: delivered.length,
    answers_possible: false,
    stop_mechanism: "stdin-closed",
  };
}

const block = (verdict, reason, detail = {}) => ({ verdict, reason, ...detail });

/**
 * The ask-nothing rule. The first question in a list/status/verify stream fails the check, and the
 * citation is that question's own offset in the captured bytes.
 */
export function gradeAskNothing(events = []) {
  const boundary = questionBoundary(events);
  if (boundary.count === 0) return { verdict: null, blocks: [], boundary };
  return {
    verdict: "fail",
    blocks: [
      block("fail", "question-in-ask-nothing", {
        count: boundary.count,
        offsets: boundary.offsets,
        first_offset: boundary.first_offset,
        call_id: boundary.first_call_id,
      }),
    ],
    boundary,
  };
}

/**
 * Whether a boundary stop may grade a must-ask prefix. Returns the exception it is using, or the
 * reason it may not use one — never a bare boolean, so a caller cannot lose the justification.
 */
export function boundaryStopCheck({ record, events = [] }) {
  const boundary = questionBoundary(events);
  const kind = record?.termination_kind ?? null;
  const recorded = record?.boundary_event_offset ?? null;
  const base = {
    termination_kind: kind,
    boundary_event_offset: recorded,
    first_question_offset: boundary.first_offset,
    prefix_complete: record?.prefix_complete === true,
  };
  if (record?.prefix_complete === false) {
    return { ...base, ok: false, exception: null, verdict: "could-not-run", reason: "capture-prefix-incomplete" };
  }
  if (kind === "timeout") {
    return { ...base, ok: false, exception: null, verdict: "could-not-run", reason: "termination-timeout" };
  }
  if (kind === "boundary-stop") {
    if (!Number.isInteger(recorded)) {
      return { ...base, ok: false, exception: null, verdict: "could-not-run", reason: "boundary-offset-absent" };
    }
    if (recorded > (record?.stdout?.byte_length ?? 0)) {
      return { ...base, ok: false, exception: null, verdict: "could-not-run", reason: "boundary-offset-outside-capture" };
    }
    if (boundary.count === 0 || recorded !== boundary.first_offset) {
      return { ...base, ok: false, exception: null, verdict: "could-not-run", reason: "boundary-offset-not-a-question" };
    }
    return { ...base, ok: true, exception: "boundary-stop", verdict: null, reason: null };
  }
  if (kind === "native") {
    // The process ended on its own with the question already captured: the prefix is complete in
    // the ordinary sense, and the exception is NOT claimed. Named so no reader mistakes it for one.
    return { ...base, ok: true, exception: "post-hoc-complete-prefix", verdict: null, reason: null };
  }
  return { ...base, ok: false, exception: null, verdict: "could-not-run", reason: "termination-unexpected" };
}

/**
 * The must-ask rule: exactly one question, nothing sent, and a prefix that may be graded (either a
 * recorded boundary stop whose offset is the question, or a natively completed capture).
 *
 * An unmapped question marker is not "no question was asked": when the table's question rules are
 * missing the caller passes `question_mapped: false` and the check is could-not-run, because an
 * absent observation is not absence.
 */
export function gradeMustAsk(events = [], { record = null, question_mapped = true } = {}) {
  const boundary = questionBoundary(events);
  const blocks = [];
  const stop = boundaryStopCheck({ record, events });

  if (question_mapped !== true) {
    blocks.push(block("could-not-run", "question-mapping-unavailable", { call_id: null }));
  } else if (boundary.count === 0) {
    if (!stop.ok) blocks.push(block(stop.verdict, stop.reason, { stop }));
    else blocks.push(block("fail", "no-question-asked"));
  } else if (boundary.count > 1) {
    blocks.push(block("fail", "more-than-one-question", { count: boundary.count, offsets: boundary.offsets }));
  }
  if (boundary.answers_delivered > 0) {
    blocks.push(block("fail", "answer-delivered", { delivered: boundary.answers_delivered }));
  }
  // A question was asked but the capture may not be graded from its prefix: that is not a pass.
  if (boundary.count > 0 && !stop.ok && blocks.length === 0) {
    blocks.push(block(stop.verdict, stop.reason, { stop }));
  }
  if (blocks.length === 0) blocks.push(block("pass", null));

  return {
    verdict: worstVerdict(blocks.map((entry) => entry.verdict)),
    blocks,
    boundary,
    stop,
  };
}

/**
 * Dispatches on the invocation's declared policy. An undeclared policy is `could-not-run`: guessing
 * which one was meant is how a must-ask probe becomes a silent pass.
 */
export function gradeQuestionPolicy({ events = [], ask_policy, record = null, question_mapped = true } = {}) {
  if (ask_policy === "must-ask") return gradeMustAsk(events, { record, question_mapped });
  if (ask_policy === "ask-nothing") {
    const graded = gradeAskNothing(events);
    return { ...graded, stop: boundaryStopCheck({ record, events }), blocks: graded.blocks };
  }
  return { verdict: "could-not-run", blocks: [block("could-not-run", "ask-policy-undeclared", { ask_policy: ask_policy ?? null })], boundary: questionBoundary(events), stop: null };
}

/**
 * The stream-derived facts a must-ask probe grades pass on: one question, no answer, no expensive
 * work before it. Returned as a positive list so a pass names what it saw.
 */
export function mustAskFacts(events = []) {
  const boundary = questionBoundary(events);
  const firstOffset = boundary.first_offset;
  const expensiveBefore =
    firstOffset === null
      ? []
      : events.filter((event) => event.type === "tool_call" && event.classification === "expensive" && event.stream_offset < firstOffset);
  return {
    question_count: boundary.count,
    question_offsets: boundary.offsets,
    answers_delivered: boundary.answers_delivered,
    expensive_before_question: expensiveBefore.map((event) => ({ name: event.name, stream_offset: event.stream_offset })),
  };
}
