// T18 — the must-ask invocation asks, and the boundary records it.
//
// One defect, two halves, and both are measured here:
//   (a) the PROMPT half. `promptFor` rendered `/pixel-perfect:init` and nothing else (22 characters),
//       because `statusSurfacePrompt` and `verifyReportPrompt` both return "" for `kind:
//       "first-question"`. The invocation was never told that this turn is graded on asking, or in
//       what shape a headless turn can ask.
//   (b) the CAPTURE half. `isQuestionEvent` accepted three markers — an `AskUserQuestion` tool_use, a
//       `user_choice` line and an `assistant.subtype: ask_user_question` — and `AskUserQuestion` is
//       not in the headless toolset: the repo's own real captures list 23 tools at 2.1.312 and 130 at
//       2.1.314 and carry it in neither. The product's own fallback for exactly this harness is
//       `workflows/RUNTIME-CONTRACT.md:125` — "a numbered plain-text batch as the last thing in the
//       turn" — and no reader counted text, so `question-start` was never observed and the record
//       read `could-not-run required-fact-unobserved` beside its own honest `no-question-asked`.
//
// The fix declares the product's own notation (`USER_CHOICE(batch)`, RUNTIME-CONTRACT:15) in the
// prompt and records that one literal marker, in assistant text only, in both readers. It does not
// widen the predicate: `?`, a numbered list, `USER_CHOICE()` with no batch id and the committed real
// reply that discusses `don't ask` mode all still read zero — that is what keeps this a grader
// rather than a detector.
//
// What is REAL in this file:
//   * the real adapter module (invocation table, prompts, mapper, `questionBoundary`, `gradeCheck`,
//     `cellFor`), the real capture reader and the real stream normaliser/questions over the real
//     table (`tables/claude-code@2.1.291.json`),
//   * the real case manifests, read through `loadCase`,
//   * the product's own `workflows/init.md`: the batch id is read out of its "How this workflow asks"
//     table and the fixture's batch text is re-derived from its "The B1 batch" block, so neither the
//     surface nor the fixture can drift from the product,
//   * the committed real 2.1.314 capture (`smoke/fixtures/denied-write/...stdout.bin`) as the
//     negative control for every zero reading.
//
// What is NOT here, and is said plainly: no model call. No harness-smoke binding exists on this host,
// so no guarded `claude -p /pixel-perfect:init` can be recorded. The positive capture is a
// DOCUMENTED-OUTPUT fixture in the CLI's stream-json envelope, labelled `recorded: false` in its
// provenance file, and its first assertion proves the batch text still derives from `init.md` byte
// for byte. The dispatched `pass` is AC-3's artifact, not this file's.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import * as adapter from "../../test/harness/adapters/claude-code.mjs";
import { loadCase } from "../../test/harness/kit/case-loader.mjs";
import { loadPins, sha256Hex } from "../../test/harness/pins.mjs";
import { createCapture, observedFacts } from "../../test/harness/runtime/capture.mjs";
import { normalise } from "../../test/harness/stream/normalise.mjs";
import { questions } from "../../test/harness/stream/question-boundary.mjs";
import { loadTable } from "../../test/harness/stream/table.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const PLUGIN_ROOT = join(ROOT, "plugins", adapter.PLUGIN_NAME);
const PINNED = loadPins().manifest.harnesses[adapter.HARNESS].pinned_cli_version;
const TABLE = loadTable({ harness: adapter.HARNESS, version: PINNED });

const FIXTURE_DIR = join(ROOT, "test/harness/smoke/fixtures/question-boundary");
const FIXTURE_STDOUT = join(FIXTURE_DIR, "claude-code-first-question.documented-output.stdout.bin");
const FIXTURE_PROVENANCE = join(FIXTURE_DIR, "claude-code-first-question.documented-output.provenance.json");
const REAL_CAPTURE = join(ROOT, "test/harness/smoke/fixtures/denied-write/claude-code-denied-write.stdout.bin");

/** The four ask-nothing entries whose prompts must stay byte-identical, by invocation key. */
const ASK_NOTHING_KEYS = ["command_list", "status-a", "verify-button-drift", "verify-clean"];

// ---------------------------------------------------------------------------
// Fixtures and the product's own words
// ---------------------------------------------------------------------------

/** The product's `How this workflow asks` table, parsed: the batch ids it declares, in order. */
function productBatchIds() {
  const workflow = readFileSync(join(PLUGIN_ROOT, "workflows", "init.md"), "utf8");
  const section = workflow.split("## How this workflow asks")[1];
  assert.ok(section, "plugins/pixel-perfect/workflows/init.md declares a `How this workflow asks` section");
  const ids = [...section.matchAll(/^\|\s*(B[0-9]+)\s*\|/gm)].map((match) => match[1]);
  assert.ok(ids.length > 0, "the batch table declares at least one batch id");
  return ids;
}

/** The product's own B1 `user_choice` block, re-derived at test time — never copied into the fixture by hand. */
function productB1Block() {
  const workflow = readFileSync(join(PLUGIN_ROOT, "workflows", "init.md"), "utf8");
  const section = workflow.split("### The B1 batch")[1];
  assert.ok(section, "init.md carries a `### The B1 batch` section");
  const block = section.match(/```user_choice\n([\s\S]*?)\n```/)?.[1];
  assert.ok(block, "the B1 section carries one fenced user_choice block");
  assert.match(block, /^batch: B1 /, "the block is the B1 batch");
  return block;
}

/** The archived documented-output capture plus its provenance. A tampered fixture refuses to load. */
function documentedCapture() {
  const bytes = readFileSync(FIXTURE_STDOUT);
  const provenance = JSON.parse(readFileSync(FIXTURE_PROVENANCE, "utf8"));
  assert.equal(sha256Hex(bytes), provenance.stdout_sha256, "the archived bytes are the bytes the provenance cites");
  assert.equal(bytes.length, provenance.stdout_byte_length, "the archived length is the cited length");
  return { bytes, provenance };
}

/** The one assistant text line of a capture, or null. */
function assistantTextsOf(bytes) {
  return bytes
    .toString("utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .filter((json) => json.type === "assistant")
    .flatMap((json) => (json.message?.content ?? []).filter((block) => block?.type === "text").map((block) => String(block.text ?? "")));
}

/**
 * The documented envelope: one `system/init` listing the plugin (and NOT AskUserQuestion — that is
 * the whole reason a text marker exists), one assistant line per supplied text, one `result`.
 */
function envelope({ texts = [], withPlugin = true, session = "t18-session" }) {
  const init = {
    type: "system",
    subtype: "init",
    cwd: "/tmp/pixel-perfect-t18",
    session_id: session,
    tools: ["Task", "Bash", "Glob", "Grep", "Read", "Edit", "Write", "WebFetch", "WebSearch", "TodoWrite", "Skill"],
    permissionMode: "dontAsk",
    claude_code_version: PINNED,
    plugins: withPlugin ? [{ name: adapter.PLUGIN_NAME, path: "plugins/pixel-perfect", version: "1.0.0", source: "pixel-perfect@pixel-perfect" }] : [],
  };
  const assistants = texts.map((text, index) => ({
    type: "assistant",
    message: {
      id: `msg_t18_${index}`,
      type: "message",
      role: "assistant",
      model: "claude-opus-4-1",
      content: [{ type: "text", text }],
      stop_reason: null,
    },
    session_id: session,
  }));
  const result = {
    type: "result",
    subtype: "success",
    is_error: false,
    terminal_reason: "end_turn",
    stop_reason: "end_turn",
    duration_ms: 1000,
    result: "the turn asked, and nothing was written",
    session_id: session,
    permission_denials: [],
  };
  return Buffer.from(`${[init, ...assistants, result].map((json) => JSON.stringify(json)).join("\n")}\n`, "utf8");
}

/** The committed real capture's bytes: CLI 2.1.314, one assistant text block, no marker anywhere. */
function realCaptureBytes() {
  const bytes = readFileSync(REAL_CAPTURE);
  assert.ok(bytes.length > 10_000, "the real capture is the recorded run, not a stub");
  const texts = assistantTextsOf(bytes);
  assert.ok(texts.some((text) => /don't ask/i.test(text)), "the real reply discusses `don't ask` mode");
  assert.equal(bytes.toString("utf8").includes("USER_CHOICE("), false, "the real capture carries no marker");
  return bytes;
}

// ---------------------------------------------------------------------------
// The grading path: real capture reader, real mapper, real graders
// ---------------------------------------------------------------------------

function sandbox(t, label = "t18-") {
  const dir = mkdtempSync(join(tmpdir(), label));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

/** The identity a graded cell carries. Digests are measured over the payload on disk. */
function identityForCell() {
  const digest = adapter.manifestDigest(PLUGIN_ROOT);
  return adapter.installationIdentity({
    requested_cli_version: PINNED,
    resolved_cli_version: PINNED,
    observed_cli_version: adapter.observedCliVersion({ text: `${PINNED} (Claude Code)`, exit_code: 0 }),
    install_mode: "checkout",
    plugin_revision: null,
    expected_plugin_manifest_sha256: digest,
    observed_plugin_manifest_sha256: digest,
    loaded_plugin_root: PLUGIN_ROOT,
    plugin_load_evidence: "system/init plugins includes pixel-perfect",
  });
}

/**
 * One capture record over real bytes, through the real capture reader and the real mapper.
 *
 * `required_read_paths: []` is this lane's own declaration: it grades the question policy, not a
 * required read, so no denial in the archived traffic is declared required by a test that never
 * asked for that path.
 */
function replayedRecord({ dir, bytes, entry }) {
  const capture = createCapture({
    harness: adapter.HARNESS,
    check_id: entry.check_id,
    cwd: entry.cwd ?? null,
    timeout_ms: entry.timeout_ms,
    argv: entry.argv,
    invocation_id: entry.invocation_id ?? undefined,
  });
  capture.append(bytes);
  capture.observe((json, line) => adapter.mapCapturedLine({ json, text: line.text, entry }), { required_read_paths: [] });
  capture.finish({ exit_code: 0, signal: null, timed_out: false, spawn_error: null });
  return capture.persist(dir);
}

/** Both readers on one capture: the adapter's boundary (live path) and the stream layer's questions. */
function readerCounts({ bytes, entry, dir }) {
  const record = replayedRecord({ dir, bytes, entry });
  const boundary = adapter.questionBoundary(record);
  const stream = questions(normalise({ bytes, table: TABLE }).events);
  return { record, boundary, stream, streamOffsets: stream.map((event) => event.stream_offset) };
}

/** The graded readings for one capture on one entry. */
function grade({ bytes, entry, dir }) {
  const record = replayedRecord({ dir, bytes, entry });
  return adapter.gradeCheck({ record, entry, track: entry.track ?? "pinned", installation: identityForCell() });
}

const reasonsOf = (blocks) => (blocks ?? []).map((entryBlock) => entryBlock.reason);
const findReason = (blocks, reason) => (blocks ?? []).find((entryBlock) => entryBlock.reason === reason) ?? null;

/** The entries of the pinned table, rendered exactly as a run renders them. */
function pinnedTable(t, { withDirs = false } = {}) {
  if (!withDirs) return adapter.invocationTable({ track: "pinned", pluginRoot: PLUGIN_ROOT });
  const dirs = adapter.prepareRunDirs({ runId: "t18", track: "pinned" });
  t.after(() => dirs.cleanup());
  return adapter.invocationTable({ track: "pinned", dirs, pluginRoot: PLUGIN_ROOT });
}

const entryOf = (table, key) => table.find((entry) => entry.key === key);

/**
 * `promptFor`'s composition WITHOUT the question surface: the command, the case's declared platform
 * arguments, the parsed report arguments and the verify surface. T18 adds nothing here, so these are
 * the bytes the four ask-nothing legs were always graded on.
 */
function composedWithoutQuestionSurface({ command_name, caseManifest = null, invocationId = null }) {
  const platformArgs = caseManifest?.platform_arg ? caseManifest.platform_arg.split(/\s+/).filter(Boolean) : [];
  const surface = [adapter.statusSurfacePrompt({ caseManifest }), adapter.verifyReportPrompt({ caseManifest, invocationId })]
    .filter(Boolean)
    .join(" ");
  return [
    `/pixel-perfect:${command_name}`,
    ...platformArgs,
    ...adapter.verifyReportArgs({ caseManifest, invocationId }),
    ...(surface.length > 0 ? [surface] : []),
  ].join(" ");
}

// ---------------------------------------------------------------------------
// AC-1 — the must-ask invocation is told to ask exactly one question, and told nothing that answers
// ---------------------------------------------------------------------------

test("t18-must-ask-prompt-declares-one-question", () => {
  // The declaration exists and is one shape, spelled the product's own way.
  const surface = adapter.QUESTION_SURFACE;
  assert.ok(surface, "the adapter declares QUESTION_SURFACE");
  assert.equal(surface.applies_to, "first-question");
  assert.equal(surface.ask_policy, "must-ask");
  assert.equal(surface.marker, "USER_CHOICE(<batch-id>)", "the marker is the product's own notation, with a batch id");
  assert.ok(adapter.QUESTION_MARKER_PATTERN instanceof RegExp, "the adapter exports the one marker pattern");
  assert.equal(surface.marker_pattern, adapter.QUESTION_MARKER_PATTERN.source, "the declaration and the pattern are the same shape");
  assert.equal(typeof adapter.questionSurfacePrompt, "function", "the adapter renders the question surface");

  const caseManifest = loadCase("first-question-init");
  const prompt = adapter.promptFor({ command_name: "init", caseManifest });

  // The command stays first — the declaration is appended to it, never before it.
  assert.ok(prompt.startsWith("/pixel-perfect:init"), `the invocation is still the product's command: ${prompt.slice(0, 80)}`);
  assert.notEqual(prompt, "/pixel-perfect:init", "the must-ask prompt is no longer the bare command of run 41249460968");
  assert.ok(prompt.length > 22, `the prompt is longer than the 22-character base prompt (was ${prompt.length})`);

  // Exactly one marker occurrence: the surface names the shape once and never echoes a second one.
  assert.equal((prompt.match(/USER_CHOICE\(/g) ?? []).length, 1, "the prompt carries exactly one USER_CHOICE( occurrence");

  // The batch id comes from the product's own table, and this case renders it.
  const [firstBatchId] = productBatchIds();
  assert.equal(firstBatchId, "B1", "the product's first batch id is B1");
  assert.ok(prompt.includes(`USER_CHOICE(${firstBatchId})`), "the surface names the product's own first batch id");

  // The two rules the check grades on, in words a model can act on.
  assert.match(prompt, /exactly one/i, "the surface states the exactly-one rule");
  assert.match(prompt, /before any tool call/i, "the surface states the ask-before-work rule");
  assert.match(prompt, /last thing in the turn/i, "the surface states where a headless question goes");

  // Derived from the case, not typed into the adapter: the case's own expected question is quoted.
  assert.ok(prompt.includes(caseManifest.expected_question), "the surface quotes the question the case declares");

  // Nothing that could BE the answer: no platform id, no option label, no goal sentence.
  assert.doesNotMatch(prompt, /web-desktop|mobile-ios/, "the surface carries no platform id");
  assert.doesNotMatch(prompt, /Recommended|Field service management|Clean and high-contrast/, "the surface carries no option label");
  assert.doesNotMatch(prompt, /manifest\.json"?\s*with/i, "the surface states no goal sentence of its own");

  // The same surface reaches the entry the run actually dispatches.
  const entry = entryOf(adapter.invocationTable({ track: "pinned", pluginRoot: PLUGIN_ROOT }), "first-question-init");
  assert.equal(entry.prompt, prompt, "the table renders the same prompt the renderer does");
  assert.ok(entry.argv[entry.argv.indexOf("-p") + 1].includes("USER_CHOICE("), "the declaration reaches the invocation's argv");

  // A case that declares no question is told nothing, and no other kind is told anything.
  assert.equal(adapter.questionSurfacePrompt({ caseManifest: loadCase("status-a") }), "");
  assert.equal(adapter.questionSurfacePrompt({ caseManifest: loadCase("verify-clean") }), "");
  assert.equal(
    adapter.questionSurfacePrompt({ caseManifest: { ...caseManifest, expected_question: undefined } }),
    "",
    "a must-ask case that declares no expected_question renders no surface",
  );
  assert.equal(
    adapter.questionSurfacePrompt({ caseManifest: { ...caseManifest, ask_policy: "ask-nothing" } }),
    "",
    "the surface is bound to the case's declared policy, not to its kind",
  );
});

// ---------------------------------------------------------------------------
// TC-1 — the declaration reaches the must-ask entry and no other
// ---------------------------------------------------------------------------

test("t18-other-prompts-unchanged", (t) => {
  const table = pinnedTable(t, { withDirs: true });
  const mustAsk = entryOf(table, "first-question-init");
  assert.equal((mustAsk.prompt.match(/USER_CHOICE\(/g) ?? []).length, 1, "the must-ask prompt carries one marker");

  // The four ask-nothing prompts are byte-identical to the composition without a question surface.
  const compared = [];
  for (const key of ASK_NOTHING_KEYS) {
    const entry = entryOf(table, key);
    assert.ok(entry, `the table carries the ${key} entry`);
    const base = composedWithoutQuestionSurface({
      command_name: entry.command_name ?? "plugin details",
      caseManifest: entry.caseManifest,
      invocationId: entry.invocation_id,
    });
    if (entry.prompt === null) {
      // The command-list invocation makes no model call and carries no prompt at all.
      assert.equal(entry.prompt, null, "the command-list entry carries no prompt");
      assert.equal(entry.model_call, false, "and no model call");
      compared.push(key);
      continue;
    }
    assert.equal(entry.prompt, base, `${key}: the ask-nothing prompt is byte-identical to its base composition`);
    assert.equal(sha256Hex(Buffer.from(entry.prompt)), sha256Hex(Buffer.from(base)), `${key}: the two sha256 values agree`);
    assert.equal(entry.prompt.includes("USER_CHOICE("), false, `${key}: no ask-nothing prompt carries the marker`);
    assert.ok(entry.prompt.length > 0, `${key}: the prompt is not empty`);
    assert.equal(adapter.questionSurfacePrompt({ caseManifest: entry.caseManifest }), "", `${key}: the renderer contributes nothing`);
    compared.push(key);
  }
  assert.equal(compared.length, 4, "all four ask-nothing legs were compared");

  // The status leg still carries the product's own command and platform argument, untouched.
  const status = entryOf(table, "status-a");
  assert.ok(status.prompt.startsWith("/pixel-perfect:status --platform web-desktop"), "status-a still names its platform argument");
  assert.ok(status.prompt.includes("gates.atoms"), "status-a still carries T16's declared status surface");

  // The verify leg still names its own report path and invocation id.
  const verify = entryOf(table, "verify-button-drift");
  assert.ok(verify.prompt.includes("reports/verify-button-drift.json"), "verify-button-drift still names its report path");
  assert.ok(verify.prompt.includes(verify.invocation_id), "verify-button-drift still echoes its invocation id");
});

// ---------------------------------------------------------------------------
// TC-2 — the marker is the only text signal, and it is read from assistant text only
// ---------------------------------------------------------------------------

test("t18-marker-is-the-only-signal", (t) => {
  const entry = entryOf(adapter.invocationTable({ track: "pinned", pluginRoot: PLUGIN_ROOT }), "first-question-init");
  const count = (bytes, label) => {
    const { boundary, stream } = readerCounts({ bytes, entry, dir: sandbox(t, `t18-tc2-${label}-`) });
    return { adapter: boundary.count, stream: stream.length };
  };

  // 1. The documented marker in assistant text is one question, in both readers.
  const marked = envelope({ texts: ["USER_CHOICE(B1)\nWhich document describes what this project should do?\n1. PRD.md\n2. README.md"] });
  assert.deepEqual(count(marked, "assistant"), { adapter: 1, stream: 1 }, "assistant text carrying the marker is one question");

  // 2. The same bytes in a `user` line are not the model's question: the declaration lives in the
  //    prompt, so a reader that scanned user lines could count the harness's own instruction.
  const userLine = envelope({ texts: [] });
  const withUserMarker = Buffer.concat([
    userLine,
    Buffer.from(`${JSON.stringify({ type: "user", message: { role: "user", content: [{ type: "text", text: "USER_CHOICE(B1)" }] } })}\n`, "utf8"),
  ]);
  assert.deepEqual(count(withUserMarker, "user"), { adapter: 0, stream: 0 }, "a marker in a user line is not a question");

  // 3. The committed real capture: one assistant text block, no marker, a reply that discusses asking.
  assert.deepEqual(count(realCaptureBytes(), "real"), { adapter: 0, stream: 0 }, "the real reply is not a question");

  // 4. A reply that ends in a question mark is not an ask.
  assert.deepEqual(count(envelope({ texts: ["Which document describes this project?"] }), "qmark"), { adapter: 0, stream: 0 }, "a trailing ? is not a question");

  // 5. A numbered list is not an ask.
  const numbered = envelope({ texts: ["Here is what I found:\n1. No requirements document\n2. No design manifest\n3. Nothing written yet"] });
  assert.deepEqual(count(numbered, "numbered"), { adapter: 0, stream: 0 }, "a numbered list is not a question");

  // 6. The marker without a batch id is not the declared shape.
  assert.deepEqual(count(envelope({ texts: ["USER_CHOICE()\nWhich document?"] }), "empty-id"), { adapter: 0, stream: 0 }, "USER_CHOICE() with no batch id is not a question");

  // 7. The matcher is the declared pattern, not the fixture's literal: another batch id still counts.
  assert.deepEqual(count(envelope({ texts: ["USER_CHOICE(B3)\nWhere does it run?"] }), "b3"), { adapter: 1, stream: 1 }, "a second batch id is the same shape");
  assert.deepEqual(count(envelope({ texts: ["USER_CHOICE(init-batch_2)\nWhere does it run?"] }), "slug"), { adapter: 1, stream: 1 }, "the declared id charset is accepted");

  // And the raw bytes of the real capture contain no marker at all — the zero above is absence, measured.
  assert.equal(realCaptureBytes().toString("utf8").includes("USER_CHOICE("), false);
});

// ---------------------------------------------------------------------------
// TC-3 — the two readers agree on the same bytes, and the fact is bound to a real span
// ---------------------------------------------------------------------------

test("t18-two-readers-agree", (t) => {
  const { bytes, provenance } = documentedCapture();
  const entry = entryOf(adapter.invocationTable({ track: "pinned", pluginRoot: PLUGIN_ROOT }), "first-question-init");

  // The fixture still derives from the product, byte for byte: a reworded workflow fails here.
  const text = assistantTextsOf(bytes);
  assert.equal(text.length, 1, "the documented capture carries one assistant text block");
  assert.equal(text[0], `USER_CHOICE(B1)\n${productB1Block()}`, "the fixture's batch text is the product's own B1 block");
  assert.equal(provenance.recorded, false, "the fixture declares itself documented, not recorded");

  const marked = readerCounts({ bytes, entry, dir: sandbox(t, "t18-tc3-documented-") });
  assert.equal(marked.boundary.count, 1, "the adapter counts one question");
  assert.equal(marked.stream.length, 1, "the stream layer counts one question");
  assert.equal(marked.boundary.offsets.length, 1);
  assert.equal(marked.boundary.offsets[0], marked.streamOffsets[0], "both readers cite the same offset");
  assert.equal(marked.boundary.offsets[0], provenance.marker_offset, "the offset is the marker line's own measured byte");
  assert.ok(marked.boundary.offsets[0] > 0, "the offset is measured, not a copied zero");
  assert.equal(marked.stream[0].classification, "question", "the stream event is classified as a question");
  assert.equal(marked.stream[0].type, "tool_call", "the canonical type is a tool call");

  const real = readerCounts({ bytes: realCaptureBytes(), entry, dir: sandbox(t, "t18-tc3-real-") });
  assert.equal(real.boundary.count, 0, "the adapter counts no question in the real capture");
  assert.equal(real.stream.length, 0, "the stream layer counts none either");

  // One literal shape in both layers: the table's text_match IS the adapter's pattern.
  const rule = (TABLE.rules ?? []).find((candidate) => candidate.rule_id === "question-text-marker");
  assert.ok(rule, "the table declares the question-text-marker rule");
  assert.equal(rule.match.type, "assistant", "the rule matches assistant lines only");
  assert.equal(rule.classification, "question", "the rule classifies the event as a question");
  assert.equal(rule.fact_id, "question-tool-start", "the rule mints the table's question fact");
  assert.equal(rule.also_fact_id, "question-start", "and the adapter's fact alongside it");
  assert.ok(rule.match.text_match.includes(adapter.QUESTION_MARKER_PATTERN.source), "the table's text_match carries the adapter's pattern");
  assert.equal(new RegExp(rule.match.text_match).source, adapter.QUESTION_MARKER_PATTERN.source, "the two shapes are one shape");
  assert.equal((TABLE.rules ?? []).length, 15, "the table has fourteen data rules plus this one");
  assert.equal((TABLE.required_facts ?? []).length, 6, "the fact vocabulary is unchanged");

  // The observation is bound to the captured span, and it re-hashes.
  const fact = observedFacts(marked.record).get("question-start");
  assert.ok(fact, "the record observed question-start");
  assert.equal(fact.required_read, true, "the fact is a required read, not an optional one");
  assert.equal(fact.stream_offset, provenance.marker_offset, "the observation cites the marker's offset");
  assert.ok(fact.stream_end_offset > fact.stream_offset, "the observation spans more than zero bytes");
  assert.equal(
    fact.raw_sha256,
    sha256Hex(bytes.subarray(fact.stream_offset, fact.stream_end_offset)),
    "the cited digest re-hashes to the captured span",
  );
  assert.equal(observedFacts(real.record).has("question-start"), false, "the real capture observed no question-start");
});

// ---------------------------------------------------------------------------
// AC-2 — the question is captured and mapped to `question-start`, so the check grades pass
// ---------------------------------------------------------------------------

test("t18-question-boundary-recorded", (t) => {
  const { bytes, provenance } = documentedCapture();
  const plain = adapter.invocationTable({ track: "pinned", pluginRoot: PLUGIN_ROOT });
  const mustAsk = entryOf(plain, "first-question-init");
  const askNothing = entryOf(plain, "status-a");

  // 1. The documented capture grades the must-ask check `pass`.
  const documentedRecord = replayedRecord({ dir: sandbox(t, "t18-ac2-documented-"), bytes, entry: mustAsk });
  const graded = adapter.gradeCheck({ record: documentedRecord, entry: mustAsk, track: "pinned", installation: identityForCell() });
  assert.equal(graded.cell.check_id, "question_before_expensive_work");
  assert.equal(graded.cell.verdict, "pass", `the must-ask check grades the documented question pass: ${JSON.stringify(graded.blocks)}`);
  assert.equal(graded.cell.reason, null, "a pass names no reason");
  assert.equal(graded.boundary.count, 1, "one question was recorded");
  assert.deepEqual(graded.boundary.offsets, [provenance.marker_offset], "at the marker's own measured offset");
  assert.equal(graded.boundary.answers_delivered, 0, "and no answer was delivered");
  assert.equal(reasonsOf(graded.blocks).includes("required-fact-unobserved"), false, "question-start is no longer missing");
  assert.equal(reasonsOf(graded.blocks).includes("no-question-asked"), false, "and the check no longer reads no-question-asked");
  assert.equal(reasonsOf(graded.cell.block_reasons).includes("required-fact-unobserved"), false, "the record carries no required-fact-unobserved block");
  const documentedFact = observedFacts(documentedRecord).get("question-start");
  assert.ok(documentedFact, "the record observed question-start");
  assert.equal(documentedFact.required_read, true, "as a required read");

  // 2. The committed real capture reads zero, and `question-start` stays absent — the fact is not
  //    declared observed by a capture that asked nothing. (The record-level required-fact rule still
  //    says so, which is what stops the fix from being "drop the requirement".)
  const real = grade({ bytes: realCaptureBytes(), entry: mustAsk, dir: sandbox(t, "t18-ac2-real-") });
  assert.equal(real.boundary.count, 0, "the real capture asked nothing");
  assert.equal(reasonsOf(real.blocks).includes("no-question-asked"), true, "the check's own reading is no-question-asked");
  const realFactRule = findReason(real.cell.block_reasons, "required-fact-unobserved");
  assert.ok(realFactRule, "the record-level required-fact rule still fires for a capture with no question");
  assert.deepEqual(realFactRule.missing, ["question-start"], "and it names the fact it did not observe");

  // 3. The same documented bytes graded ask-nothing fail at the marker's offset.
  const askNothingRead = grade({ bytes, entry: askNothing, dir: sandbox(t, "t18-ac2-asknothing-") });
  const inAskNothing = findReason(askNothingRead.blocks, "question-in-ask-nothing");
  assert.ok(inAskNothing, "the ask-nothing leg refuses the same bytes");
  assert.deepEqual(inAskNothing.offsets, [provenance.marker_offset], "citing the marker's offset");

  // 4. Two batches read must-ask are more than one question.
  const twoBatch = twoBatchBytes();
  const twoRead = grade({ bytes: twoBatch, entry: mustAsk, dir: sandbox(t, "t18-ac2-two-") });
  assert.equal(twoRead.cell.verdict, "fail");
  assert.equal(twoRead.cell.reason, "more-than-one-question");
  const moreThanOne = findReason(twoRead.blocks, "more-than-one-question");
  assert.ok(moreThanOne, "the two-batch capture carries more-than-one-question");
  assert.equal(moreThanOne.count, 2, "with two counted questions");
  assert.equal(twoRead.boundary.count, 2, "and the boundary agrees");

  // 5. The cell still carries four check ids: the question row is one of them, and it is the pass.
  const dirs = adapter.prepareRunDirs({ runId: "t18-ac2-cell", track: "pinned" });
  t.after(() => dirs.cleanup());
  const runTable = adapter.invocationTable({ track: "pinned", dirs, pluginRoot: PLUGIN_ROOT });
  const cells = runTable.map((row) => grade({ bytes, entry: row, dir: sandbox(t, `t18-ac2-${row.key}-`) }).cell);
  const cell = adapter.cellFor({ track: "pinned", cells, installation: identityForCell() });
  assert.equal(cell.checks.length, 4, "the cell carries four check ids");
  const questionRow = cell.checks.find((check) => check.check_id === "question_before_expensive_work");
  assert.ok(questionRow, "the question row is one of the four");
  assert.equal(questionRow.verdict, "pass", "and it is the pass this task bought");
  assert.equal(questionRow.reason, null);
});

/** The documented capture with a second, different batch appended before the `result` line. */
function twoBatchBytes() {
  const { bytes } = documentedCapture();
  const lines = bytes.toString("utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line));
  const index = lines.findIndex((json) => json.type === "result");
  assert.ok(index > 0, "the documented capture ends with a result line");
  const second = {
    type: "assistant",
    message: {
      id: "msg_t18_second",
      type: "message",
      role: "assistant",
      model: "claude-opus-4-1",
      content: [{ type: "text", text: "USER_CHOICE(B3)\n1. react-native\n2. nextjs" }],
      stop_reason: null,
    },
    session_id: "t18-second",
  };
  lines.splice(index, 0, second);
  return Buffer.from(`${lines.map((json) => JSON.stringify(json)).join("\n")}\n`, "utf8");
}

// ---------------------------------------------------------------------------
// TC-4 — the ask-nothing rule keeps its teeth on the same bytes
// ---------------------------------------------------------------------------

test("t18-ask-nothing-keeps-teeth", (t) => {
  const { bytes, provenance } = documentedCapture();
  const plain = adapter.invocationTable({ track: "pinned", pluginRoot: PLUGIN_ROOT });
  const mustAsk = entryOf(plain, "first-question-init");
  const askNothing = entryOf(plain, "status-a");

  // The same bytes that pass must-ask fail ask-nothing, at the same offset.
  const refused = grade({ bytes, entry: askNothing, dir: sandbox(t, "t18-tc4-documented-") });
  const block = findReason(refused.blocks, "question-in-ask-nothing");
  assert.ok(block, `the documented capture is refused on the ask-nothing leg: ${JSON.stringify(refused.blocks)}`);
  assert.deepEqual(block.offsets, [provenance.marker_offset], "the refusal cites the marker's own offset");
  assert.equal(block.count, 1, "and counts the one question it found");

  // Two batches: fail on both legs, with both offsets cited.
  const twoBatch = twoBatchBytes();
  const twoMustAsk = grade({ bytes: twoBatch, entry: mustAsk, dir: sandbox(t, "t18-tc4-two-mustask-") });
  assert.equal(twoMustAsk.cell.reason, "more-than-one-question");
  assert.equal(findReason(twoMustAsk.blocks, "more-than-one-question").count, 2);
  const twoAskNothing = grade({ bytes: twoBatch, entry: askNothing, dir: sandbox(t, "t18-tc4-two-asknothing-") });
  const twoBlock = findReason(twoAskNothing.blocks, "question-in-ask-nothing");
  assert.ok(twoBlock, "the two-batch bytes are refused on the ask-nothing leg too");
  assert.equal(twoBlock.offsets.length, 2, "both batches are cited");
  assert.ok(twoBlock.offsets.every((offset) => Number.isInteger(offset) && offset > 0), "each offset is a measured byte");

  // The real capture: the check says no-question-asked, and never could-not-run in its own blocks.
  const real = grade({ bytes: realCaptureBytes(), entry: mustAsk, dir: sandbox(t, "t18-tc4-real-") });
  assert.equal(findReason(real.blocks, "no-question-asked") !== null, true, "the real capture is graded on its own silence");
  assert.equal((real.blocks ?? []).some((entryBlock) => entryBlock.verdict === "could-not-run"), false, "the check's blocks are not could-not-run");

  // And the ask-nothing legs are told nothing: the declaration is bound to the must-ask case.
  for (const key of ["status-a", "verify-button-drift", "verify-clean", "command_list"]) {
    const entry = entryOf(plain, key);
    assert.equal(adapter.questionSurfacePrompt({ caseManifest: entry.caseManifest }), "", `${key}: no declaration`);
    if (entry.prompt !== null) assert.equal(entry.prompt.includes("USER_CHOICE("), false, `${key}: the prompt carries no marker`);
  }
  assert.notEqual(adapter.questionSurfacePrompt({ caseManifest: mustAsk.caseManifest }), "", "and the must-ask case is told");
});

// ---------------------------------------------------------------------------
// AC-3 — a dispatched run grades the question pass on the pinned cell
// ---------------------------------------------------------------------------

/** Where the sprint gate's downloaded artifact lands, relative to this worktree. */
const DISPATCHED = join(ROOT, ".tmp/sprint-01-verification/t18/harness-eval-result.json");

/**
 * The recorded pre-fix artifact of run 41249460968, resolved through the workspace the worktree
 * belongs to (the sprint state directory is git-ignored, so it is never in a clean checkout).
 */
function recordedPreFixArtifact() {
  try {
    const commonDir = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], { cwd: ROOT, encoding: "utf8" }).trim();
    const workspace = dirname(commonDir);
    const path = join(
      workspace,
      ".kb-run-sprint/sprint-01-evaluator-evidence-spine/T16/hosted/run-41249460968/harness-eval-result-41249460968-1/grade/harness-eval-result.json",
    );
    return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : null;
  } catch {
    return null;
  }
}

const claudeCells = (artifact) => (artifact?.cells ?? []).filter((cell) => cell.harness === adapter.HARNESS);
const questionRow = (cell) => (cell?.checks ?? []).find((check) => check.check_id === "question_before_expensive_work") ?? null;
const questionRowReads = (artifact) =>
  claudeCells(artifact).map((cell) => ({ track: cell.track, row: questionRow(cell), reasons: reasonsOf(cell.block_reasons) }));

test("t18-dispatched-question-pass", (t) => {
  // The pre-fix reading, from the run this task repairs: both claude-code cells read
  // `could-not-run required-fact-unobserved` for `question-start` beside their own `no-question-asked`.
  const preFix = recordedPreFixArtifact();
  if (preFix) {
    assert.equal(preFix.schema, "harness-eval-result/v1", "the recorded artifact declares its schema");
    assert.equal((preFix.cells ?? []).length, 12, "the recorded run holds twelve cells");
    const pre = questionRowReads(preFix);
    assert.equal(pre.length, 2, "both claude-code cells are recorded");
    for (const { track, row, reasons } of pre) {
      assert.equal(row.verdict, "could-not-run", `${track}: the pre-fix question row is could-not-run`);
      assert.equal(row.reason, "required-fact-unobserved", `${track}: with the recorded reason`);
      assert.equal(reasons.includes("no-question-asked"), true, `${track}: beside the check's own no-question-asked`);
      const missing = findReason((claudeCells(preFix).find((cell) => cell.track === track)?.block_reasons ?? []), "required-fact-unobserved");
      assert.deepEqual(missing.missing, ["question-start"], `${track}: naming the fact nothing observed`);
    }
    const outside = (preFix.cells ?? []).filter((cell) => cell.harness !== adapter.HARNESS);
    assert.equal(outside.length, 10, "ten cells outside claude-code");
    assert.ok(outside.every((cell) => typeof cell.reason === "string" && cell.reason.length > 0), "each keeps a named reason");
  } else {
    t.diagnostic("recorded pre-fix artifact (run 41249460968) is not resolvable from this worktree; the pre-fix leg is unmeasured here");
  }

  // The post-fix reading must be a dispatched artifact. Nothing local can supply it.
  if (!existsSync(DISPATCHED)) {
    assert.fail(
      `dispatched-artifact-absent: no harness-eval artifact at ${DISPATCHED}. Dispatch \`gh workflow run harness-eval --ref <this task's landed commit>\`, then \`gh run download <run-id> -n harness-eval-result-<run-id>-1 -D .tmp/sprint-01-verification/t18\`. Until then this check cannot be graded, and a hand-written stand-in would not be evidence.`,
    );
  }

  const artifact = JSON.parse(readFileSync(DISPATCHED, "utf8"));
  assert.equal(artifact.schema, "harness-eval-result/v1", "the artifact declares its schema");
  assert.match(String(artifact.head_sha ?? ""), /^[0-9a-f]{40}$/, "the artifact names the head it evaluated");
  assert.equal((artifact.cells ?? []).length, 12, "the artifact holds twelve cells");
  assert.equal(new Set((artifact.cells ?? []).map((cell) => `${cell.harness}/${cell.track}`)).size, 12, "twelve unique cells");

  const post = questionRowReads(artifact);
  assert.equal(post.length, 2, "both claude-code cells are graded");
  const pinned = post.find((entry) => entry.track === "pinned");
  assert.ok(pinned, "the pinned cell is present");
  assert.equal(pinned.row.verdict, "pass", `the pinned question row reads pass: ${JSON.stringify(pinned.row)}`);
  assert.equal(pinned.row.reason, null, "a pass names no reason");
  assert.equal(pinned.reasons.includes("required-fact-unobserved"), false, "no required-fact-unobserved block survives on the pinned cell");

  for (const { track, row } of post) {
    assert.notEqual(row.reason, "required-fact-unobserved", `${track}: no claude-code question row is required-fact-unobserved`);
    assert.doesNotMatch(String(row.reason ?? ""), /-adapter-not-implemented/, `${track}: no adapter-not-implemented reason on a claude-code row`);
  }

  const pinnedCell = claudeCells(artifact).find((cell) => cell.track === "pinned");
  assert.equal((pinnedCell.checks ?? []).length, 4, "the pinned cell still carries four check rows");

  // The neighbours keep their own readings, and no ask-nothing row records a question.
  for (const { track, reasons } of post) {
    assert.equal(reasons.filter((reason) => reason === "question-in-ask-nothing").length, 0, `${track}: no ask-nothing leg recorded a question`);
  }
  const outside = (artifact.cells ?? []).filter((cell) => cell.harness !== adapter.HARNESS);
  assert.equal(outside.length, 10, "the ten other cells are unchanged in count");
  assert.ok(outside.every((cell) => typeof cell.reason === "string" && cell.reason.length > 0), "every other cell keeps a named reason");
});
