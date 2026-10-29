// The fixture-grader: four checks per graded cell, decided from files and the event stream.
//
// This module is the only place a cell's verdict is assembled. It runs with no model credential and
// reads no API key. Every part it accepts names the evidence that produced it, and the aggregate is
// could-not-run before fail before pass — with every constituent part kept, so a setup or storage
// failure can never be relabelled as a plugin defect, and a detected defect can never be relabelled
// as a setup failure.
//
// The process exit code travels beside a verdict as a diagnostic and is never an input to one:
// `gradeVerifyCheck` passes on the planted case while the oracle's own exit code is 1.
import { worstVerdict, VERDICTS } from "../lib/verdict.mjs";
import { assertPassEvidence, validateAgainst } from "../validate.mjs";
import { commandNames, parseCommandList, statusFacts } from "../adapters/claude-code.mjs";
import { gradeQuestionPolicy, mustAskFacts } from "../stream/question-boundary.mjs";

import { REPORT_REASONS, readVerifyReportAt } from "./report-writer.mjs";

export const SOURCE = "files-and-event-stream";
/** The four checks one graded cell carries, in the order the cell reports them. */
export const CHECK_IDS = Object.freeze(["command_list", "status", "verify", "question_before_expensive_work"]);

const block = (verdict, reason, detail = {}) => ({ verdict, reason, ...detail });

/** One check record. Every field a later reader needs to re-derive the verdict travels with it. */
export function part({ check_id, verdict, reason = null, invocation_id = null, evidence_paths = [], blocks = null, ...detail }) {
  if (!CHECK_IDS.includes(check_id)) throw new Error(`unknown check_id ${check_id}`);
  if (!VERDICTS.includes(verdict)) throw new Error(`check ${check_id} carries no binary verdict: ${JSON.stringify(verdict)}`);
  // A part always contributes at least one block, so its reason can never be lost in the aggregate.
  const kept = Array.isArray(blocks) && blocks.length > 0 ? blocks : [block(verdict, reason)];
  return { check_id, verdict, reason, source: SOURCE, invocation_id, evidence_paths: [...evidence_paths], blocks: kept, ...detail };
}

/** A check whose evidence only a hosted run can produce. Never a pass, never a fabricated failure. */
export function notExecutedPart({ check_id, reason, owner, invocation_id = null, evidence_paths = [] }) {
  return part({
    check_id,
    verdict: "could-not-run",
    reason,
    invocation_id,
    evidence_paths,
    blocks: [block("could-not-run", reason, { not_executed: true, owner })],
    not_executed: { owner, reason },
  });
}

/**
 * The verify check, graded from the pair of reports at their case-declared paths.
 *
 * Pass requires BOTH halves: the planted report names the planted defect with the capture hash and
 * byte offsets the oracle itself produced, and the clean twin reports clean with
 * `clean_project_failed === false`. A copied `expected_defect_key` with no evidence is not detection.
 */
export function gradeVerifyCheck({ planted, clean }) {
  const sides = [
    ["planted", planted],
    ["clean", clean],
  ];
  const read = sides.map(([side, entry]) => [side, readVerifyReportAt({ caseManifest: entry.caseManifest, invocation: entry.invocation })]);
  const blocks = [];
  const evidence_paths = [];

  for (const [side, result] of read) {
    if (result.ok) evidence_paths.push(result.path);
    else blocks.push(block(result.verdict, result.reason, { side, path: result.path ?? null, why: result.why ?? null, code: result.code ?? null }));
  }
  const byside = Object.fromEntries(read);
  const invocation_id = planted?.invocation?.invocationId ?? null;

  if (planted && clean && byside.planted.ok && byside.clean.ok) {
    const plantedReport = byside.planted.report;
    const cleanReport = byside.clean.report;

    if (plantedReport.observed_verify_outcome !== "defect-detected") {
      blocks.push(block("fail", `verify-${plantedReport.observed_verify_outcome ?? "unknown"}`, { side: "planted", expected: "defect-detected" }));
    }
    const plantedKey = planted.caseManifest?.defect_key ?? null;
    const named = plantedReport.observed_defect_key ?? null;
    const drifted = (plantedReport.evidence?.drifted_keys ?? []).includes(plantedKey);
    if (plantedKey && named !== plantedKey && !drifted) {
      blocks.push(block("fail", "verify-defect-key-mismatch", { side: "planted", expected: plantedKey, named }));
    }
    // Detection is a citation, not a word: the capture and the byte span the oracle measured.
    const evidence = plantedReport.evidence ?? {};
    const unevidenced = [];
    if (typeof evidence.capture_path !== "string" || evidence.capture_path.length === 0) unevidenced.push("capture_path");
    if (typeof evidence.capture_sha256 !== "string" || !/^[0-9a-f]{64}$/.test(evidence.capture_sha256)) unevidenced.push("capture_sha256");
    if (!evidence.event_offsets || !Number.isInteger(evidence.event_offsets.offset)) unevidenced.push("event_offsets");
    if (unevidenced.length > 0) {
      blocks.push(block("fail", REPORT_REASONS.unboundEvidence, { side: "planted", missing: unevidenced }));
    }

    if (cleanReport.clean_project_failed === true) {
      blocks.push(block("fail", "clean-false-positive", { side: "clean" }));
    }
    if (cleanReport.observed_verify_outcome !== "clean") {
      blocks.push(block("fail", `clean-${cleanReport.observed_verify_outcome ?? "unknown"}`, { side: "clean", expected: "clean" }));
    }

    if (plantedReport.invocation_id === cleanReport.invocation_id) {
      blocks.push(block("fail", REPORT_REASONS.unbound, { binding: "twin", why: "both reports share one invocation_id" }));
    }
    if (byside.planted.sha256 && byside.planted.sha256 === byside.clean.sha256) {
      blocks.push(block("fail", REPORT_REASONS.unbound, { binding: "twin", why: "both report bodies hash the same" }));
    }
  }

  if (blocks.length === 0) blocks.push(block("pass", null));
  const verdict = worstVerdict(blocks.map((entry) => entry.verdict));
  const winner = blocks.find((entry) => entry.verdict === verdict) ?? {};
  return part({
    check_id: "verify",
    verdict,
    reason: winner.reason ?? null,
    invocation_id,
    evidence_paths,
    blocks,
    report_paths: evidence_paths,
    invocation_ids: [byside.planted?.report?.invocation_id ?? null, byside.clean?.report?.invocation_id ?? null],
    observed_verify_outcome:
      verdict === "pass" ? "defect-detected" : (byside.planted?.report?.observed_verify_outcome ?? null),
  });
}

/**
 * The status check: the reply must state the seeded platform, phase, gate state and inventory
 * counts. A generic acknowledgement states none of them, so it fails — and an undeclared expectation
 * is could-not-run, because a check with nothing to compare against is not a pass.
 */
export function gradeStatusCheck({ reply, expectedFacts = null, evidencePaths = [], invocationId = null }) {
  if (!expectedFacts) {
    return part({
      check_id: "status",
      verdict: "could-not-run",
      reason: "no-status-facts-declared",
      invocation_id: invocationId,
      evidence_paths: evidencePaths,
      blocks: [block("could-not-run", "no-status-facts-declared")],
    });
  }
  const text = String(reply ?? "");
  const facts = statusFacts(text, expectedFacts);
  const missing = facts.missing ?? [];
  const blocks = [];
  if (text.trim().length === 0) blocks.push(block("fail", "status-reply-empty"));
  else if (missing.length > 0) blocks.push(block("fail", "status-facts-absent", { missing }));
  if (blocks.length === 0) blocks.push(block("pass", null));
  const verdict = worstVerdict(blocks.map((entry) => entry.verdict));
  return part({
    check_id: "status",
    verdict,
    reason: (blocks.find((entry) => entry.verdict === verdict) ?? {}).reason ?? null,
    invocation_id: invocationId,
    evidence_paths: evidencePaths,
    blocks,
    facts: { platform: facts.platform, phase: facts.phase, gates: facts.gates, inventory: facts.inventory, missing },
  });
}

/** The command-list check: every declared command must appear in text a harness actually printed. */
export function gradeCommandListCheck({ capturedText, pluginRoot, evidencePaths = [], invocationId = null }) {
  const declared = commandNames({ pluginRoot });
  if (!declared) throw new Error("gradeCommandListCheck needs the plugin root to read the declared inventory");
  const parsed = parseCommandList(String(capturedText ?? ""));
  const present = declared.filter((name) => parsed.deduped.includes(name));
  const blocks = [];
  if (parsed.deduped.length === 0) blocks.push(block("could-not-run", "command-list-unreadable"));
  else if (present.length !== declared.length) {
    blocks.push(block("fail", "command-list-incomplete", { missing: declared.filter((name) => !present.includes(name)) }));
  }
  if (blocks.length === 0) blocks.push(block("pass", null));
  const verdict = worstVerdict(blocks.map((entry) => entry.verdict));
  return part({
    check_id: "command_list",
    verdict,
    reason: (blocks.find((entry) => entry.verdict === verdict) ?? {}).reason ?? null,
    invocation_id: invocationId,
    evidence_paths: evidencePaths,
    blocks,
    declared: declared.length,
    present: present.length,
  });
}

/**
 * The question check: ask-nothing forbids the first question in a list/status/verify stream;
 * must-ask requires exactly one and no answer delivered. The rules live in the stream layer; this
 * only attaches the identity and the evidence a cell needs.
 */
export function gradeQuestionCheck({ record, events, ask_policy = "ask-nothing", check_id = "question_before_expensive_work", question_mapped = true, evidencePaths = [], invocationId = null }) {
  const graded = gradeQuestionPolicy({ events, ask_policy, record, question_mapped });
  const facts = ask_policy === "must-ask" ? mustAskFacts(events) : null;
  const blocks = graded.blocks.map((entry) => ({ ...entry }));

  // `gradeAskNothing` returns a null verdict on zero questions: nothing was refused, and nothing was
  // observed. That is a pass ONLY when the question fact was mapped and the capture may be graded at
  // all — an unmapped question marker or a truncated prefix is could-not-run, never a pass.
  let verdict = graded.verdict;
  if (verdict === null && ask_policy === "ask-nothing") {
    if (question_mapped !== true) {
      verdict = "could-not-run";
      blocks.push(block("could-not-run", "question-mapping-unavailable"));
    } else if (!graded.stop?.ok) {
      verdict = graded.stop?.verdict ?? "could-not-run";
      blocks.push(block(verdict, graded.stop?.reason ?? "capture-not-gradable", { stop: graded.stop ?? null }));
    } else {
      verdict = "pass";
      blocks.push(block("pass", null));
    }
  }
  if (verdict === null) {
    verdict = "could-not-run";
    blocks.push(block("could-not-run", "ask-policy-undeclared", { ask_policy }));
  }

  return part({
    check_id,
    verdict,
    reason: (blocks.find((entry) => entry.verdict === verdict) ?? {}).reason ?? null,
    invocation_id: invocationId ?? record?.invocation_id ?? null,
    evidence_paths: evidencePaths,
    blocks,
    ask_policy,
    question_count: graded.boundary.count,
    question_offsets: graded.boundary.offsets,
    answers_delivered: graded.boundary.answers_delivered,
    must_ask_facts: facts,
  });
}

/**
 * Fills a partial check set out to all four ids, and reports the malformed parts separately so the
 * caller can force the cell to could-not-run instead of silently dropping a lane.
 *
 * A missing check is could-not-run, never absent from the array: a reader must be able to see that a
 * lane produced nothing at all.
 */
export function completeCheckSet(parts = []) {
  const problems = [];
  const byId = new Map();
  for (const entry of parts) {
    if (!CHECK_IDS.includes(entry?.check_id)) {
      problems.push(block("could-not-run", "check-set-unknown", { check_id: entry?.check_id ?? null }));
      continue;
    }
    if (byId.has(entry.check_id)) {
      problems.push(block("could-not-run", "check-set-duplicate", { check_id: entry.check_id }));
      continue;
    }
    byId.set(entry.check_id, entry);
  }
  const checks = CHECK_IDS.map((check_id) =>
    byId.get(check_id) ??
    part({ check_id, verdict: "could-not-run", reason: "check-set-incomplete", blocks: [block("could-not-run", "check-set-incomplete", { missing: check_id })] }),
  );
  return { checks, problems };
}

/**
 * Assembles one HarnessCell from its four parts.
 *
 * - aggregate: could-not-run before fail before pass, over the four parts
 * - every part's own verdict, reason and block reasons are preserved under `block_reasons`
 * - a part claiming pass without a citation is downgraded to could-not-run, never promoted
 * - a non-pass part without a reason is downgraded for the same reason
 */
export function gradeCell({
  harness = "claude-code",
  track = "pinned",
  installation,
  invocation_id = null,
  process_exit_code = null,
  parts = [],
  report_paths = null,
  denied_tool_call = null,
} = {}) {
  const completed = completeCheckSet(parts);
  const checks = completed.checks.map((entry) => {
    if (entry.verdict === "pass" && (entry.evidence_paths ?? []).length === 0) {
      return {
        ...entry,
        verdict: "could-not-run",
        reason: "check-unevidenced",
        blocks: [...(entry.blocks ?? []), block("could-not-run", "check-unevidenced")],
      };
    }
    if (entry.verdict !== "pass" && !entry.reason) {
      return { ...entry, verdict: "could-not-run", reason: "check-reason-absent", blocks: [...(entry.blocks ?? []), block("could-not-run", "check-reason-absent")] };
    }
    return entry;
  });

  const verdict = worstVerdict([...checks.map((entry) => entry.verdict), ...completed.problems.map((entry) => entry.verdict)]);
  const winner = checks.find((entry) => entry.verdict === verdict) ?? completed.problems[0] ?? {};
  const evidence_paths = [...new Set(checks.flatMap((entry) => entry.evidence_paths ?? []))];
  const reports = report_paths ?? [...new Set(checks.flatMap((entry) => entry.report_paths ?? []))];
  const verify = checks.find((entry) => entry.check_id === "verify");
  const denial = denied_tool_call ?? checks.flatMap((entry) => entry.blocks ?? []).find((entry) => entry.reason === "denied_tool_call") ?? null;

  const cell = {
    harness,
    track,
    installation,
    invocation_id,
    verdict,
    reason: winner.reason ?? null,
    source: SOURCE,
    check_id: winner.check_id ?? null,
    process_exit_code: Number.isInteger(process_exit_code) ? process_exit_code : null,
    denied_tool_call: denial,
    evidence_paths,
    report_paths: reports,
    observed_verify_outcome: verify?.observed_verify_outcome ?? null,
    checks: checks.map((entry) => ({
      check_id: entry.check_id,
      verdict: entry.verdict,
      reason: entry.reason ?? null,
      source: entry.source ?? SOURCE,
      invocation_id: entry.invocation_id ?? null,
      evidence_paths: entry.evidence_paths ?? [],
    })),
    block_reasons: [
      ...checks.flatMap((entry) => (entry.blocks ?? []).map((entryBlock) => ({ check_id: entry.check_id, ...entryBlock }))),
      ...completed.problems,
    ],
  };

  validateAgainst("harness-cell.v1.schema.json", cell);
  assertPassEvidence(cell);
  return cell;
}
