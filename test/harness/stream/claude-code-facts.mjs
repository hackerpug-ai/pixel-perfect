// claude-code stream facts: what one capture record proves, read in one place.
//
// This module owns the stream-facts cluster of the claude-code adapter: the captured line tiling,
// the plugin gate, what the model actually produced, the question boundary, the observation mapper
// (with its declared required-read paths), and the status-reply parsers. The adapter imports every
// exported name from here and re-exports it, so callers keep importing from the adapter; this
// module imports nothing from the adapter, so the pair can never form an import cycle.
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { sha256Hex } from "../pins.mjs";
import { CaptureError, resolveEvidencePath } from "../runtime/index.mjs";

export const PLUGIN_NAME = "pixel-perfect";
export const PLUGIN_ROOT_REL = `plugins/${PLUGIN_NAME}`;

const ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const PLUGIN_ROOT = join(ROOT, PLUGIN_ROOT_REL);

/** The tool names a first question arrives as. Declared here, matched by the stream mapper. */
export const QUESTION_TOOL_NAMES = Object.freeze(["AskUserQuestion"]);

/**
 * The one literal question marker a headless turn can carry, and the one `RegExp` BOTH readers use —
 * this predicate and the stream table's `text_match`, so the two cannot diverge on what a question is.
 *
 * `AskUserQuestion` cannot be the answer here, and that is measured rather than assumed: the repo's
 * own real captures list 23 tools at CLI 2.1.312 and 130 at 2.1.314 and omit it from both. The
 * product supplies the fallback for exactly this harness — "a numbered plain-text batch as the last
 * thing in the turn" (`plugins/pixel-perfect/workflows/RUNTIME-CONTRACT.md:125`) — and its own
 * notation for that batch is `USER_CHOICE(batch)` (`RUNTIME-CONTRACT.md:15`). The harness therefore
 * declares the product's marker instead of inventing a vocabulary.
 *
 * The shape is literal and narrow: `USER_CHOICE(` + one batch id + `)`. Not a `?`, not a numbered
 * list, not "any assistant text" — an ordinary reply that discusses asking must still count zero.
 */
export const QUESTION_MARKER_PATTERN = /USER_CHOICE\([A-Za-z0-9][A-Za-z0-9_-]*\)/;

/** The captured stdout, line by line, with the byte span each line occupies. */
export function capturedLines(record) {
  if (!record) return [];
  const cited = (record.evidence_paths ?? []).find((path) => path.endsWith(".stdout.bin"));
  if (!cited) return [];
  const path = resolveEvidencePath(record, cited);
  const bytes = readFileSync(path);
  if (sha256Hex(bytes) !== record.stdout?.sha256) {
    throw new CaptureError("captured-bytes-tampered", { path, expected: record.stdout?.sha256 });
  }
  const out = [];
  let start = 0;
  while (start < bytes.length) {
    const newline = bytes.indexOf(0x0a, start);
    const end = newline === -1 ? bytes.length : newline + 1;
    const raw = bytes.subarray(start, end);
    const text = raw.toString("utf8").replace(/\r?\n$/, "");
    if (text.length > 0) {
      let json = null;
      try {
        json = JSON.parse(text);
      } catch {
        json = null;
      }
      out.push({ text, json, offset: start, end_offset: start + Buffer.byteLength(text) });
    }
    start = end;
  }
  return out;
}

function eventsOf(record, type, subtype = null) {
  return capturedLines(record).filter(
    (line) => line.json?.type === type && (subtype === null || line.json?.subtype === subtype),
  );
}

/**
 * The plugin gate. `-p` can enter bare mode and load nothing, and this is the only line that says
 * otherwise: the `system/init` event's plugin list. Without `pixel-perfect` in it the run is not
 * graded.
 */
export function pluginGate(record) {
  const init = eventsOf(record, "system", "init")[0] ?? null;
  const empty = {
    loaded: false,
    reason: "no-init-event",
    evidence: null,
    plugin_name: null,
    plugin_path: null,
    plugin_version: null,
    observed_cli_version: null,
    permission_mode: null,
    plugins: [],
  };
  if (!init) return empty;
  const plugins = Array.isArray(init.json.plugins) ? init.json.plugins : [];
  const mine = plugins.find((plugin) => plugin?.name === PLUGIN_NAME) ?? null;
  return {
    loaded: mine !== null,
    reason: mine ? null : "plugin-not-loaded",
    evidence: `system/init plugins=[${plugins.map((plugin) => plugin?.name ?? "?").join(", ")}]`,
    plugin_name: mine?.name ?? null,
    plugin_path: mine?.path ?? null,
    plugin_version: mine?.version ?? null,
    observed_cli_version: init.json.claude_code_version ?? null,
    permission_mode: init.json.permissionMode ?? null,
    added_dirs: Array.isArray(init.json.additional_directories) ? init.json.additional_directories : [],
    stream_offset: init.offset,
    plugins,
  };
}

/**
 * What the model actually produced. Exit 0 with `subtype: success` and `is_error: true` is the
 * shape the PRD's own probe recorded while nothing had been graded, so it is could-not-run here.
 */
export function modelAnswer(record) {
  const result = eventsOf(record, "result")[0] ?? null;
  if (!result) return { answered: false, reason: "no-result-event", detail: {} };
  if (result.json.is_error === true) {
    return {
      answered: false,
      reason: "model-never-answered",
      detail: { terminal_reason: result.json.terminal_reason ?? null, error: result.json.error ?? null },
    };
  }
  if (typeof result.json.result !== "string" || result.json.result.trim() === "") {
    return { answered: false, reason: "empty-model-reply", detail: {} };
  }
  return { answered: true, reason: null, reply: result.json.result, stream_offset: result.offset };
}

/**
 * A question is a tool start on a question tool, an explicit question marker, or — the one shape a
 * headless turn can carry — the product's own text marker in assistant text.
 *
 * The text clause reads `assistant` lines only, on purpose: the declaration lives in the prompt, so a
 * reader that also scanned `user` lines (or the raw bytes) could count the harness's own instruction
 * as the model's question and pass with nothing asked.
 */
function isQuestionEvent(json) {
  if (!json) return false;
  if (json.type === "user_choice" || json.subtype === "ask_user_question") return true;
  const content = json.message?.content;
  if (!Array.isArray(content)) return false;
  if (content.some((block) => block?.type === "tool_use" && QUESTION_TOOL_NAMES.includes(block?.name))) return true;
  return (
    json.type === "assistant" &&
    content.some((block) => block?.type === "text" && typeof block?.text === "string" && QUESTION_MARKER_PATTERN.test(block.text))
  );
}

/**
 * The question boundary: how many questions the stream contains, where they are, and whether any
 * answer could have been delivered.
 *
 * The stop mechanism is the closed stdin, not a mid-stream kill: the runtime's `spawnCaptured`
 * exposes no per-chunk hook, so `termination_kind: "boundary-stop"` has no producer (T3's open
 * note). Closing stdin reaches the same end — with `-p` and no input, a question ends the turn and
 * no answer can ever be delivered — and it is recorded as such rather than dressed up as a
 * boundary stop.
 */
export function questionBoundary(record) {
  const offsets = [];
  for (const line of capturedLines(record)) {
    if (isQuestionEvent(line.json)) offsets.push(line.offset);
  }
  return {
    count: offsets.length,
    offsets,
    answers_delivered: 0,
    answers_possible: false,
    stop_mechanism: "stdin-closed",
  };
}

/**
 * The observation mapper: what each captured line proves, and whether the read it names was a
 * required one. Requiredness is declared here, never inferred later — an undeclared denial would be
 * read as permission by the writer, so every denial gets an explicit true or false.
 */
export function mapCapturedLine({ json = null, text = "", entry = null }) {
  const out = [];
  if (json?.type === "system" && json?.subtype === "init") {
    const names = (json.plugins ?? []).map((plugin) => plugin?.name ?? "?");
    out.push({
      fact_id: names.includes(PLUGIN_NAME) ? "plugin-loaded" : "plugin-absent",
      kind: "plugin_load",
      target: PLUGIN_NAME,
      required_read: true,
      detail: { plugins: names, cli_version: json.claude_code_version ?? null, permission_mode: json.permissionMode ?? null },
    });
  }
  if (json?.type === "result") {
    out.push({
      fact_id: "result-event",
      kind: "result",
      target: null,
      required_read: true,
      detail: { is_error: json.is_error === true, terminal_reason: json.terminal_reason ?? null },
    });
    // The CLI's own denial record. A denial on a required path is a `fail`; anything else is
    // declared optional here rather than left for a later reader to assume.
    for (const denial of json.permission_denials ?? []) {
      // The real event carries the tool's arguments under `tool_input` (with a `tool_use_id` beside
      // it); older shapes used `input`. Both are read, and the keys are recorded so a reader can see
      // which shape this denial really had.
      const input = denial?.tool_input ?? denial?.input ?? null;
      const target = input?.file_path ?? input?.path ?? denial?.target ?? null;
      const required = isRequiredPath(target, entry);
      out.push({
        kind: "permission_denied",
        operation: denial?.tool_name ?? denial?.tool ?? null,
        target,
        required_read: required,
        detail: {
          mode: json.permissionMode ?? null,
          tool_use_id: denial?.tool_use_id ?? null,
          input_keys: input && typeof input === "object" ? Object.keys(input).sort() : [],
        },
      });
    }
  }
  if (isQuestionEvent(json)) {
    out.push({ fact_id: "question-start", kind: "question", target: null, required_read: true, detail: { markers: QUESTION_TOOL_NAMES } });
  }
  if (!json && /Component inventory/.test(text)) {
    out.push({ fact_id: "command-list", kind: "command_list", target: null, required_read: true, detail: { text: text.trim() } });
  }
  return out;
}

/** A read the invocation needs: under the plugin root (its own instructions) or under its work dir. */
function isRequiredPath(target, entry) {
  if (typeof target !== "string" || target.length === 0) return false;
  const absolute = resolve(target);
  const roots = [resolve(PLUGIN_ROOT), entry?.cwd ? resolve(entry.cwd) : null].filter(Boolean);
  return roots.some((root) => absolute === root || absolute.startsWith(`${root}/`));
}

/**
 * The gate state a status reply must state, in the product's own vocabulary, keyed by the manifest's
 * layer names. `workflows/status.md` prints one `--- <platform> ---` section per platform whose
 * `Phases:` list names SCAFFOLD / PLAN / ATOMS / MOLECULES / COMPOSE with its own icons; the screens
 * layer's gate key is `compose` (scripts/gate.mjs LAYER_GATE), so `[x] COMPOSE` is the screens gate
 * passed and the product never prints a SCREENS gate. A reply may also state its gates as words
 * (`atoms=approved`, `screens pending`). Anything else states no gate, so a reply that drops them is
 * a miss rather than a silent pass.
 */
const GATE_ICONS = Object.freeze({ x: "approved", " ": "pending", "~": "in-progress", "!": "drift" });
const PHASE_LAYER = Object.freeze({ scaffold: "scaffold", plan: "plan", atoms: "atoms", molecules: "molecules", organisms: "organisms", compose: "screens" });
const LAYER_OF = (name) => PHASE_LAYER[String(name).toLowerCase()] ?? String(name).toLowerCase();
const LAYER_WORDS = ["scaffold", "plan", "atoms", "molecules", "organisms", "screens", "compose"];
const PHASE_LINE = /\[([x ~!])\]\s*([A-Za-z]+)/;

/**
 * The reply's section for one platform, or "" when the reply is sectioned but has no such section -
 * a status reply carries a section per platform, so reading another platform's gates for this case
 * would report the wrong platform's state.
 */
function platformScope(text, platform) {
  const marks = [...text.matchAll(/^---[ \t]*(\S+)[ \t]*---[ \t]*$/gm)];
  if (marks.length === 0) return { scope: text, sectioned: false };
  const index = marks.findIndex((mark) => mark[1].toLowerCase() === String(platform ?? "").toLowerCase());
  if (index < 0) return { scope: "", sectioned: true };
  const start = marks[index].index + marks[index][0].length;
  const end = marks[index + 1]?.index ?? text.length;
  return { scope: text.slice(start, end), sectioned: true };
}

function parseGates(text) {
  const gates = {};
  for (const line of text.split("\n")) {
    const icon = line.match(PHASE_LINE);
    const layer = icon ? PHASE_LAYER[icon[2].toLowerCase()] : null;
    if (layer && !(layer in gates)) gates[layer] = GATE_ICONS[icon[1].toLowerCase()];
  }
  for (const match of text.matchAll(new RegExp(`\\b(${LAYER_WORDS.join("|")})\\b[^\\w\\n]{0,12}?(approved|pending)\\b`, "gi"))) {
    const layer = LAYER_OF(match[1]);
    if (!(layer in gates)) gates[layer] = match[2].toLowerCase();
  }
  return Object.keys(gates).length > 0 ? gates : null;
}

/**
 * The phase, from a phase-bearing construct only: an explicit `Phase: <name>` field when the reply
 * states one, otherwise the furthest layer the reply's own icon list marks passed. The first layer
 * word anywhere in the reply is not a phase - a gate list naming atoms before a `Phase: screens`
 * field would otherwise be graded on the wrong word.
 */
function parsePhase(text) {
  const labelled = text.match(/\bphase\s*[:=]\s*([A-Za-z]+)/i);
  if (labelled && LAYER_WORDS.includes(labelled[1].toLowerCase())) return LAYER_OF(labelled[1]);
  let furthest = null;
  for (const line of text.split("\n")) {
    const icon = line.match(PHASE_LINE);
    const layer = icon ? PHASE_LAYER[icon[2].toLowerCase()] : null;
    if (layer && GATE_ICONS[icon[1].toLowerCase()] === "approved") furthest = layer;
  }
  return furthest;
}

/** Facts a status reply must state. A generic acknowledgement states none of them. */
export function statusFacts(reply, expected = null) {
  const text = String(reply ?? "");
  const want = expected?.platform ?? null;
  const scoped = want ? platformScope(text, want) : null;
  const scope = scoped ? scoped.scope : text;
  const platform = want
    ? (scoped.sectioned ? (scope.length > 0 ? want : null) : text.toLowerCase().includes(want.toLowerCase()) ? want : null)
    : (/web-desktop/.test(text) ? "web-desktop" : null);
  const counts = scope.match(/\b(\d+)\b/g)?.map(Number) ?? [];
  const facts = {
    platform,
    phase: parsePhase(scope),
    gates: parseGates(scope),
    inventory: /\binventory\b/i.test(scope) ? { counts } : null,
    nonzero_counts: counts.some((count) => count > 0),
  };
  if (!expected) return facts;
  const missing = [];
  if (expected.platform && facts.platform !== expected.platform) missing.push("platform");
  if (expected.phase && facts.phase !== expected.phase) missing.push("phase");
  for (const [key, value] of Object.entries(expected.gates ?? {})) {
    if (facts.gates?.[LAYER_OF(key)] !== String(value).toLowerCase()) missing.push(`gates.${key}`);
  }
  // A count satisfies the inventory only when it is stated beside its own key, as `3 atoms` or in
  // the per-layer header the product prints (`Atoms (3/3 built, 3 verified):`); three numbers
  // appearing anywhere in the reply are not three inventories.
  for (const [key, value] of Object.entries(expected.inventory ?? {})) {
    const keyed = new RegExp(`\\b${value}\\s+${key}\\b|\\b${key}\\b\\s*[:=]\\s*${value}\\b`, "i").test(scope);
    const header = new RegExp(`^[ \\t]*${key}\\s*\\(\\s*${value}\\s*/`, "im").test(scope);
    if (!keyed && !header) missing.push(`inventory.${key}`);
  }
  return { ...facts, missing };
}
