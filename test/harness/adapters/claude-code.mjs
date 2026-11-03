// claude-code adapter: install → load → command list → four graded invocations, for both tracks.
//
// This module owns the mechanics of the one harness sprint 01 grades live. Three rules shape it:
//
//   1. A version label and an install command's exit code are not proof. The plugin manifest digest
//      is rebuilt from sorted relative paths + file contents on both sides (checkout payload vs
//      loaded payload), and the CLI version is the one the CLI itself reported. Any disagreement is
//      `could-not-run` / `installation-identity-mismatch` — never a candidate-attributed failure.
//   2. `-p` can enter bare mode and silently load nothing, and a run can end `subtype: success` with
//      `is_error: true` and exit 0 having asked the model nothing. So a grade needs the plugin listed
//      under `plugins` in the `system/init` event AND a result the model actually produced; a clean
//      exit alone never passes.
//   3. The credential is the harness-smoke binding, and it appears on the graded model steps only.
//      Install, marketplace, plugin-install and command-list steps are keyless and this module
//      refuses to build one that carries a key. Names are referenced; values are never read.
//
// The module spawns nothing itself: every process it starts goes through the shared runtime's
// capture/guard (`runGuarded`, `spawnCaptured`), and every verdict goes through `gradeFromEvidence`
// + `writeGrade`.
//
// shortcut: the question-event shapes are matched by declared markers (QUESTION_TOOL_NAMES, plus the
// product's own text marker) because no real must-ask capture exists yet — that capture is T11's
// qualification. The detector cannot silently pass: the must-ask probe FAILS when it sees no
// question, so a stale marker set fails the probe loudly instead of certifying it. Upgrade when the
// first real must-ask capture lands.
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { bindReportPath, loadCase, materialize } from "../kit/case-loader.mjs";
import { worstVerdict } from "../lib/verdict.mjs";
import { loadPins, sha256Hex } from "../pins.mjs";
import { CaptureError, createCapture, manifestOf, resolveEvidencePath, spawnCaptured } from "../runtime/index.mjs";
import { gradeFromEvidence, writeGrade } from "../runtime/grade-writer.mjs";
import { runGuarded } from "../runtime/guard.mjs";
import { recordStance } from "../runtime/stance.mjs";
import {
  PLUGIN_NAME,
  PLUGIN_ROOT_REL,
  QUESTION_MARKER_PATTERN,
  QUESTION_TOOL_NAMES,
  capturedLines,
  mapCapturedLine,
  modelAnswer,
  pluginGate,
  questionBoundary,
  statusFacts,
} from "../stream/claude-code-facts.mjs";
import { assertPassEvidence, validateAgainst } from "../validate.mjs";

// The stream-facts readers (captured line tiling, plugin gate, model answer, question boundary,
// observation mapper, status-reply parsers) live in ../stream/claude-code-facts.mjs. This module
// re-exports them so every one of these names stays importable from the adapter as before.
export {
  PLUGIN_NAME,
  PLUGIN_ROOT_REL,
  QUESTION_MARKER_PATTERN,
  QUESTION_TOOL_NAMES,
  capturedLines,
  mapCapturedLine,
  modelAnswer,
  pluginGate,
  questionBoundary,
  statusFacts,
};

export const HARNESS = "claude-code";
export const PLUGIN_MARKETPLACE = "pixel-perfect";
export const PLUGIN_SELECTOR = `${PLUGIN_NAME}@${PLUGIN_MARKETPLACE}`;
export const CLI_PACKAGE = "@anthropic-ai/claude-code";
export const CHECKS = ["command_list", "status", "verify", "question_before_expensive_work"];
export const DESCRIPTION_SCHEMA = "claude-code-adapter/v1";

/** Auto-update off, on every step: a self-updating CLI could pass at a version nobody pinned. */
export const AUTO_UPDATER_ENV = Object.freeze({ DISABLE_AUTOUPDATER: "1" });

const SECRET_NAME = /^(SMOKE_[A-Z0-9_]+|ANTHROPIC_API_KEY|CODEX_API_KEY|XAI_API_KEY|GEMINI_API_KEY|CURSOR_API_KEY)$/;
const DIGEST_SKIP = new Set(["node_modules", ".git", ".tmp", ".DS_Store"]);
const ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const PLUGIN_ROOT = join(ROOT, PLUGIN_ROOT_REL);

export function harnessPin(manifest = loadPins().manifest) {
  return manifest.harnesses[HARNESS];
}

/**
 * The binding env the guard looks for — a NAME, from the pins manifest, never a value.
 * A probe run may set it to a placeholder that authenticates nothing; see PROBE_NOTE.
 */
export const PROBE_ENV_NAME = harnessPin().binding_env;

// ---------------------------------------------------------------------------
// The five invocations, as one table
// ---------------------------------------------------------------------------

/**
 * The check family for a graded cell. One table: the command list (keyless, no model call) plus
 * four graded headless invocations. `verify` is graded twice — planted and clean — because a
 * detector that reports every project defective is not a detector.
 */
const INVOCATIONS = [
  {
    key: "command_list",
    check_id: "command_list",
    case_id: null,
    graded: false,
    ask_policy: "ask-nothing",
    required_facts: ["command-list"],
    command: ["claude", "plugin", "details", PLUGIN_NAME],
    timeout_ms: 120_000,
    purpose: "the plugin's component inventory, with no model call",
  },
  {
    key: "status-a",
    check_id: "status",
    case_id: "status-a",
    graded: true,
    ask_policy: "ask-nothing",
    required_facts: ["plugin-loaded", "result-event"],
    command_name: "status",
    timeout_ms: 180_000,
    purpose: "the status reply must state the seeded platform, phase, gates and inventory counts",
  },
  {
    key: "verify-button-drift",
    check_id: "verify",
    case_id: "verify-button-drift",
    graded: true,
    ask_policy: "ask-nothing",
    required_facts: ["plugin-loaded", "result-event"],
    command_name: "verify",
    timeout_ms: 600_000,
    purpose: "verify on a project with one planted drift must report that defect",
  },
  {
    key: "verify-clean",
    check_id: "verify",
    case_id: "verify-clean",
    graded: true,
    ask_policy: "ask-nothing",
    required_facts: ["plugin-loaded", "result-event"],
    command_name: "verify",
    timeout_ms: 600_000,
    purpose: "the clean twin, in its own fresh directory",
  },
  {
    key: "first-question-init",
    check_id: "question_before_expensive_work",
    case_id: "first-question-init",
    graded: true,
    ask_policy: "must-ask",
    required_facts: ["plugin-loaded", "question-start"],
    command_name: "init",
    timeout_ms: 180_000,
    purpose: "init on an empty project: exactly one question, no answer sent, no expensive work first",
  },
];

/** Fixture arguments a case contributes to its prompt, exactly as the case manifest declares them. */
function caseArgs(caseManifest) {
  if (!caseManifest) return [];
  return caseManifest.platform_arg ? caseManifest.platform_arg.split(/\s+/).filter(Boolean) : [];
}

// ---------------------------------------------------------------------------
// The declared surfaces — what each graded reply is graded on, never its value
// ---------------------------------------------------------------------------

/**
 * What a graded `status` reply must state, declared once so a reader can see it without inferring
 * it from a prompt string. It is the product's own vocabulary (`workflows/status.md`): one
 * `--- <platform> ---` section, a `Phases:` list printed with the icons `[x] [~] [ ] [!]` beside
 * the layer names SCAFFOLD PLAN ATOMS MOLECULES COMPOSE, and one per-layer header per declared
 * layer carrying that layer's built/verified counts.
 *
 * `statusFacts` reads this surface; the prompt now states that this surface is what gets graded.
 * The declaration names fields. It never names a value, so a reply can satisfy it only by reading
 * the project's own `design/manifest.json`.
 */
export const STATUS_SURFACE = Object.freeze({
  applies_to: "status",
  fields: Object.freeze(["platform", "phase", "gates.<layer>", "inventory.<layer>"]),
  icons: Object.freeze(["[x]", "[~]", "[ ]", "[!]"]),
  layers: Object.freeze(["SCAFFOLD", "PLAN", "ATOMS", "MOLECULES", "COMPOSE"]),
  header_shape: "<Layer> (<built>/<total> built, <verified> verified):",
  phase_rule: "the furthest layer the Phases list marks with the product's own filled icon",
  vocabulary: "the product's, from plugins/pixel-perfect/workflows/status.md",
});

/**
 * The `status` surface for one case, rendered from the case manifest's OWN keys: `platform`,
 * `phase`, one `gates.<layer>` per declared gate and one `inventory.<layer>` per declared inventory
 * key. A case that declares a new layer is described without an adapter edit, and a case that
 * declares nothing is told nothing.
 *
 * Every count is a placeholder and every icon is a legend entry, so the rendered text cannot state
 * the answer the check measures: two cases that declare the same keys with different values render
 * the same text.
 */
export function statusSurfacePrompt({ caseManifest = null } = {}) {
  if (caseManifest?.kind !== STATUS_SURFACE.applies_to) return "";
  const declared = caseManifest?.expected_facts ?? null;
  if (!declared || typeof declared !== "object") return "";
  const fields = [
    declared.platform !== undefined ? "platform" : null,
    declared.phase !== undefined ? "phase" : null,
    ...Object.keys(declared.gates ?? {}).map((layer) => `gates.${layer}`),
    ...Object.keys(declared.inventory ?? {}).map((layer) => `inventory.${layer}`),
  ].filter(Boolean);
  if (fields.length === 0) return "";
  return [
    `Graded status surface: this reply is graded on the facts ${fields.join(", ")},`,
    `and each of them has to be readable in it, with the value the project's own design/manifest.json holds.`,
    `State the platform id the project declares;`,
    `state the current phase, which is ${STATUS_SURFACE.phase_rule};`,
    `print the Phases list with the product's own icons ${STATUS_SURFACE.icons.join(" ")} beside the layer names ${STATUS_SURFACE.layers.join(" ")};`,
    `print one per-layer header per declared layer, each in the product's own shape ${STATUS_SURFACE.header_shape};`,
    `and print every count from that manifest rather than from your own summary.`,
  ].join(" ");
}

/**
 * The body a graded `verify` invocation must write, declared once. `readVerifyReport` reads exactly
 * these fields, and the outcome rule is the product's own catalog check rather than the model's
 * opinion: `observed_verify_outcome` is `defect-detected` iff `verify-catalog.mjs --check --json`
 * reports at least one drifted key.
 */
export const VERIFY_REPORT_CONTRACT = Object.freeze({
  schema: "verify-report/v1",
  fields: Object.freeze([
    "schema",
    "harness",
    "track",
    "invocation_id",
    "case_id",
    "observed_verify_outcome",
    "observed_defect_key",
    "expected_defect_key",
    "evidence.drifted_keys",
    "clean_project_failed",
  ]),
  outcome_rule:
    "defect-detected iff `node plugins/pixel-perfect/scripts/verify-catalog.mjs --check . --platform web-desktop --json` reports at least one drifted key; clean otherwise",
});

/**
 * The `verify` surface for one case: the exact path the report goes to (the case manifest's own
 * `report_relative_path`, relative to the invocation's working directory), the invocation id the
 * adapter minted and the report must echo, the case id, and the body's key set with the outcome
 * rule. It states no expected defect key, no digest and no byte position: the only way to fill the
 * body correctly is to run the catalog check and read what it reports.
 */
export function verifyReportPrompt({ caseManifest = null, invocationId = null } = {}) {
  if (caseManifest?.kind !== "verify") return "";
  const reportPath = caseManifest?.report_relative_path;
  if (typeof reportPath !== "string" || reportPath.length === 0) return "";
  if (typeof invocationId !== "string" || invocationId.length === 0) return "";
  return [
    `Graded verify surface: after running the product's own verify, write one JSON file at ${reportPath},`,
    `relative to your working directory, and give it exactly these keys: ${VERIFY_REPORT_CONTRACT.fields.join(", ")}.`,
    `Set schema to ${VERIFY_REPORT_CONTRACT.schema}, harness to ${HARNESS}, track to ${caseManifest.track},`,
    `set invocation_id to ${invocationId} exactly as given here, and set case_id to ${caseManifest.case_id}.`,
    `Set observed_verify_outcome by this rule: ${VERIFY_REPORT_CONTRACT.outcome_rule}.`,
    `Fill observed_defect_key and expected_defect_key from the key the catalog check itself reports drifted,`,
    `and only from that key; put the drifted keys it reported in evidence.drifted_keys;`,
    `and set clean_project_failed to whether that check reported any failure at all.`,
    `Write no other file.`,
  ].join(" ");
}

/**
 * The arguments that reach the product as `$ARGUMENTS` the plugin PARSES: the case's own declared
 * report path and the id the run minted for this invocation. Prose is not an argument — the CLI
 * delivers everything after a slash command as one argument string, so a path that appears only in
 * the declared prose surface is a path no product step consumes. These two are the inputs the
 * product's `verify` workflow documents, and they are composed from the case manifest and the run's
 * own identity, never spelled here.
 */
export function verifyReportArgs({ caseManifest = null, invocationId = null } = {}) {
  if (caseManifest?.kind !== "verify") return [];
  const reportPath = caseManifest?.report_relative_path;
  if (typeof reportPath !== "string" || reportPath.length === 0) return [];
  if (typeof invocationId !== "string" || invocationId.length === 0) return [];
  return ["--report", reportPath, "--invocation-id", invocationId];
}

/** The one write a case declares: only a check that reads a report gets one. */
function declaredWrites(caseManifest) {
  if (caseManifest?.kind !== "verify") return [];
  const reportPath = caseManifest?.report_relative_path;
  return typeof reportPath === "string" && reportPath.length > 0 ? [reportPath] : [];
}

/**
 * The batch id the product's own `How this workflow asks` table opens with, read out of the workflow
 * file at load time: a renumbered or renamed batch reaches the prompt with no adapter edit, and the
 * lane re-derives it from the same table to prove the two agree. Never a literal typed here.
 *
 * An unreadable table falls back to the placeholder shape `USER_CHOICE(<batch-id>)`, which the marker
 * pattern cannot match: a model copying it produces no recorded question, so the check fails honestly
 * rather than passing on a marker nobody wrote.
 */
function productFirstBatchId() {
  try {
    const workflow = readFileSync(join(PLUGIN_ROOT, "workflows", "init.md"), "utf8");
    const section = workflow.split("## How this workflow asks")[1] ?? "";
    return section.match(/^\|\s*(B[0-9]+)\s*\|/m)?.[1] ?? null;
  } catch {
    return null;
  }
}

export const QUESTION_BATCH_ID = productFirstBatchId();

/**
 * What one graded `first-question` turn is told it is graded on, declared once so a reader can see it
 * without inferring it from a prompt string. It names the marker shape, the exactly-one rule and the
 * ask-before-work rule, and it names no value the check measures: no platform id, no option label, no
 * goal sentence. A reply can satisfy it only by actually asking the question the case declares.
 */
export const QUESTION_SURFACE = Object.freeze({
  applies_to: "first-question",
  ask_policy: "must-ask",
  marker: "USER_CHOICE(<batch-id>)",
  marker_pattern: QUESTION_MARKER_PATTERN.source,
  batch_rule: "exactly one",
  order_rule: "before any tool call other than reading the local fixture and the installed plugin instructions",
  answer_rule: "send no answer and do not answer your own question",
  where: "as the last thing in the turn, on its own line",
});

/**
 * The question surface for one case, rendered from the case manifest's OWN declaration: its kind, its
 * `ask_policy` and the question it expects. A case that declares no question is told nothing, and no
 * other kind of case is told anything — so the four ask-nothing prompts keep the bytes they were
 * graded on.
 */
export function questionSurfacePrompt({ caseManifest = null } = {}) {
  if (caseManifest?.kind !== QUESTION_SURFACE.applies_to) return "";
  if (caseManifest?.ask_policy !== QUESTION_SURFACE.ask_policy) return "";
  const question = caseManifest?.expected_question;
  if (typeof question !== "string" || question.trim().length === 0) return "";
  const marker = QUESTION_BATCH_ID ? `USER_CHOICE(${QUESTION_BATCH_ID})` : QUESTION_SURFACE.marker;
  return [
    `Graded question surface: this turn is graded on ${QUESTION_SURFACE.batch_rule} question, asked ${QUESTION_SURFACE.order_rule}.`,
    `Ask the decision this case declares: ${question.trim()}.`,
    `State it ${QUESTION_SURFACE.where}, beginning ${marker}, followed by the question and its numbered options.`,
    `Ask exactly one batch and then stop.`,
    `On this turn, ${QUESTION_SURFACE.answer_rule}.`,
  ].join(" ");
}

/**
 * The prompt for one invocation: the plugin's slash command first, then the case's own arguments,
 * then the arguments the product PARSES (the report path and the invocation id), then the surface its
 * check grades. Nothing is inferred — a case with no platform argument contributes none, a case that
 * declares no report path contributes no report arguments, and a case whose check reads no declared
 * surface contributes no text, so the four ask-nothing probes' prompts stay exactly the bytes they
 * were measured on.
 */
export function promptFor({ command_name, caseManifest = null, invocationId = null }) {
  const surface = [
    statusSurfacePrompt({ caseManifest }),
    verifyReportPrompt({ caseManifest, invocationId }),
    questionSurfacePrompt({ caseManifest }),
  ]
    .filter(Boolean)
    .join(" ");
  return [
    `/pixel-perfect:${command_name}`,
    ...caseArgs(caseManifest),
    ...verifyReportArgs({ caseManifest, invocationId }),
    ...(surface.length > 0 ? [surface] : []),
  ].join(" ");
}

/**
 * The argv one invocation runs. The permission flags are the recorded stance's own `argv`, used
 * verbatim: an invocation's flags cannot drift from the stance recorded for it, and a stance that
 * admits one declared write carries that allow-list with it.
 */
function gradedArgv({ prompt, pluginRoot, max_turns = 0, stance = null }) {
  const recorded = stance ?? recordStance({ harness: HARNESS, plugin_root: pluginRoot });
  const argv = ["-p", prompt, "--output-format", "stream-json", "--verbose", ...recorded.argv];
  if (max_turns > 0) argv.push("--max-turns", String(max_turns));
  return argv;
}

/**
 * The full invocation table for one cell. Every graded entry is headless, stream-json, stdin closed,
 * wrapped in its case timeout, and carries the recorded stance; the command-list entry is keyless
 * and runs no model.
 */
export function invocationTable({ track = "pinned", dirs = null, pluginRoot = PLUGIN_ROOT, max_turns = 0 } = {}) {
  return INVOCATIONS.map((entry) => {
    const caseManifest = entry.case_id ? loadCase(entry.case_id) : null;
    // A declared plan (no directories yet) reports the case's own relative path; a run reports the
    // absolute path the case loader bound.
    const prepared = dirs
      ? dirs.for(entry.key)
      : { dir: null, invocation_id: null, bound_path: caseManifest?.report_relative_path ?? null };
    if (!entry.graded) {
      return {
        ...entry,
        track,
        cwd: prepared.dir,
        invocation_id: prepared.invocation_id,
        argv: entry.command.slice(1),
        prompt: null,
        stdin: "closed",
        stance: null,
        model_call: false,
      };
    }
    const prompt = promptFor({ command_name: entry.command_name, caseManifest, invocationId: prepared.invocation_id });
    // One stance per invocation, recorded before the first model call and rendered into its argv:
    // a graded run carries the recorded mode and add-dir, and a case whose check reads a report
    // carries the allow-list for exactly that one declared path.
    const stance = recordStance({ harness: HARNESS, plugin_root: pluginRoot, writes: declaredWrites(caseManifest) });
    const argv = gradedArgv({ prompt, pluginRoot, max_turns, stance });
    return {
      ...entry,
      track,
      cwd: prepared.dir,
      invocation_id: prepared.invocation_id,
      bound_path: prepared.bound_path,
      report_relative_path: caseManifest?.report_relative_path ?? null,
      caseManifest,
      prompt,
      argv,
      stdin: "closed",
      model_call: true,
      max_turns_role: max_turns > 0 ? "backstop" : null,
      stance,
    };
  });
}

/**
 * Fresh work directories, one per invocation, each already carrying the project its case declares.
 * A verify or status case gets a materialized copy of the kit; the first-question case gets a
 * genuinely empty directory (its case declares `fresh-empty-dir`), and nothing is ever reused.
 */
export function prepareRunDirs({ runId = "local", track = "pinned" } = {}) {
  const made = [];
  const byKey = new Map();

  const build = (key) => {
    const dir = mkdtempSync(join(tmpdir(), `pp-${HARNESS}-${track}-${key}-`));
    made.push(dir);
    const caseId = INVOCATIONS.find((entry) => entry.key === key)?.case_id ?? null;
    const prepared = { key, dir, case_id: caseId, invocation_id: `${runId}-${HARNESS}-${track}-${key}-${randomUUID()}`, bound_path: null };
    if (caseId) {
      const caseManifest = loadCase(caseId);
      // Bind the declared report path before anything is copied, so the path is the manifest's.
      prepared.bound_path = bindReportPath(caseManifest, dir);
      if (caseManifest.kind !== "first-question") materialize(caseManifest, prepared);
    }
    return prepared;
  };

  return {
    runId,
    track,
    for(key) {
      if (!byKey.has(key)) byKey.set(key, build(key));
      return byKey.get(key);
    },
    cleanup() {
      for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
      byKey.clear();
    },
  };
}

/**
 * The planted-and-clean verify pair: two invocations of ONE run, each in its own fresh directory,
 * each report bound to the path its case manifest declares.
 */
export function prepareVerifyPair({ runId = "local", track = "pinned", pluginRoot = PLUGIN_ROOT } = {}) {
  const dirs = prepareRunDirs({ runId, track });
  const table = invocationTable({ track, dirs, pluginRoot });
  const side = (caseId) => {
    const entry = table.find((row) => row.case_id === caseId);
    if (!entry) throw new Error(`no verify invocation for ${caseId}`);
    return {
      case_id: caseId,
      caseManifest: entry.caseManifest,
      invocation_id: entry.invocation_id,
      dir: entry.cwd,
      bound_path: entry.bound_path,
      report_relative_path: entry.report_relative_path,
      entry,
    };
  };
  return { run_id: runId, track, dirs, planted: side("verify-button-drift"), clean: side("verify-clean"), cleanup: () => dirs.cleanup() };
}

// ---------------------------------------------------------------------------
// The denied-write control probe — a control, not a grade
// ---------------------------------------------------------------------------

/**
 * The probe's DECLARED shape, so a reader can see what it asks for without inferring it from a
 * prompt string. It is not a table row and contributes no check: `cellFor` aggregates every table
 * entry into the cell's four checks, and a sixth row would give the cell a fifth check and break the
 * four-grade locks. The probe runs beside the table, writes its own capture, and contributes exactly
 * one observation and one pair to `exit0-denied-read`.
 */
export const DENIED_WRITE_PROBE = Object.freeze({
  key: "denied-write-probe",
  check_id: "verify",
  contributes_checks: 0,
  timeout_ms: 180_000,
  roles: Object.freeze({
    required: Object.freeze({
      role: "required",
      tool: "Write",
      writes: "work/keep.txt",
      resolves_under: "the invocation's own work dir",
      expect: Object.freeze({ required_read: true, control: "exit0-denied-read" }),
    }),
    optional: Object.freeze({
      role: "optional",
      tool: "Write",
      writes: "an absolute path outside the invocation's work dir and the plugin root",
      resolves_under: "neither the plugin root nor the invocation's work dir",
      expect: Object.freeze({ required_read: false, control: "not this control" }),
    }),
  }),
});

/**
 * One probe invocation, shaped like a table entry so the same mapper, capture and guard apply.
 *
 * The required half asks for a RELATIVE `work/keep.txt`, which the CLI resolves into the invocation's
 * own work dir — exactly the shape the archived capture recorded (`process_status.exit_code: 0`, one
 * model request, a `Write` denial on `<cwd>/work/keep.txt`). The optional half asks for an absolute
 * path outside that directory, so `isRequiredPath` declares the denial optional and the control must
 * not fire on it.
 */
export function controlProbeEntry({ role, cwd, pluginRoot = PLUGIN_ROOT, track = "pinned" } = {}) {
  const declared = DENIED_WRITE_PROBE.roles[role];
  if (!declared) throw new Error(`unknown denied-write probe role ${String(role)}: expected required or optional`);
  if (typeof cwd !== "string" || cwd.length === 0) throw new Error("controlProbeEntry needs the invocation's work dir");
  const outside = join(tmpdir(), `pp-denied-write-probe-${randomUUID()}.txt`);
  const prompt =
    role === "required"
      ? "Use the Write tool to create the file work/keep.txt, relative to your current working directory, containing the single word keep. Do not use Bash and do not ask a question."
      : `Use the Write tool to create the file ${outside} containing the single word keep. Do not use Bash and do not ask a question.`;
  // The probe declares no write, so its stance is the plain approved one and its argv carries no
  // allow-list: both halves must still be denied by the CLI, which is what the probe measures.
  const stance = recordStance({ harness: HARNESS, plugin_root: pluginRoot });
  return {
    key: `${DENIED_WRITE_PROBE.key}-${role}`,
    check_id: DENIED_WRITE_PROBE.check_id,
    track,
    role,
    graded: false,
    cwd,
    invocation_id: `${HARNESS}-${DENIED_WRITE_PROBE.key}-${role}-${randomUUID()}`,
    argv: gradedArgv({ prompt, pluginRoot, stance }),
    prompt,
    stdin: "closed",
    model_call: true,
    timeout_ms: DENIED_WRITE_PROBE.timeout_ms,
    declared_target: role === "required" ? "work/keep.txt" : outside,
    stance,
  };
}

/**
 * The denied-write probe: two guarded invocations, each in its own fresh directory, through the same
 * runtime, stance and mapper every graded invocation uses.
 *
 *   required — a `claude -p` told to write `work/keep.txt` inside its own work dir. Under
 *              `--permission-mode dontAsk` the CLI denies the write and still exits 0, which is the
 *              shape the archived capture recorded: a clean exit beside a denial of a read the
 *              invocation needed. That is `fail` / `denied_tool_call`, not a pass.
 *   optional — the same instruction pointing at an absolute path outside that directory, so the
 *              denial's target resolves under neither the plugin root nor the invocation's cwd and the
 *              mapper declares `required_read: false`. The control must NOT fire; the record is the
 *              pair, so `discriminates` is computed from a measurement rather than claimed.
 *
 * Both go through `runGuarded`, so a run without the binding records the guard's own refusal instead
 * of skipping: a refused probe yields `null` for the observation AND the pair, which is the
 * fail-closed rule the whole control layer rests on.
 */
export async function runControlProbe({
  track = "pinned",
  configDir = null,
  env = process.env,
  evidenceDir = null,
  pluginRoot = PLUGIN_ROOT,
  timeout_ms = DENIED_WRITE_PROBE.timeout_ms,
} = {}) {
  const dir = evidenceDir ?? mkdtempSync(join(tmpdir(), `pp-${HARNESS}-${DENIED_WRITE_PROBE.key}-`));
  mkdirSync(dir, { recursive: true });

  const half = async (role) => {
    // A fresh work dir per invocation: nothing is reused, and requiredness is declared against it.
    const cwd = mkdtempSync(join(tmpdir(), `pp-${HARNESS}-${DENIED_WRITE_PROBE.key}-${role}-`));
    const entry = controlProbeEntry({ role, cwd, pluginRoot, track });
    const capture = createCapture({
      harness: HARNESS,
      check_id: entry.check_id,
      cwd,
      timeout_ms,
      argv: entry.argv,
      invocation_id: entry.invocation_id,
    });
    const stepEnv = { ...env, ...AUTO_UPDATER_ENV };
    if (configDir) stepEnv.CLAUDE_CONFIG_DIR = configDir;
    const { decision } = await runGuarded({
      harness: HARNESS,
      stance: entry.stance,
      env: stepEnv,
      capture,
      command: "claude",
      args: entry.argv,
      cwd,
      timeout_ms,
    });
    capture.observe((json, line) => mapCapturedLine({ json, text: line.text, entry }), { required_read_paths: null });
    const record = capture.persist(join(dir, role));
    return { entry, decision, record };
  };

  const required = await half("required");
  const optional = await half("optional");

  // Loaded lazily: `observations.mjs` imports this module, so a static import here would be a cycle.
  const { observeExit0DeniedRead, observeExit0DeniedReadPair } = await import("../smoke/observations.mjs");
  return {
    required,
    optional,
    observation: required.record.refusal ? null : observeExit0DeniedRead({ record: required.record, check: DENIED_WRITE_PROBE.check_id }),
    pair: optional.record.refusal ? null : observeExit0DeniedReadPair({ record: optional.record }),
  };
}

// ---------------------------------------------------------------------------
// Install / load / command list: the declared steps
// ---------------------------------------------------------------------------

/**
 * The install steps for one track. The version is exact, auto-update is off, and the step is
 * keyless. A track whose version did not resolve, or a published run whose release revision did not
 * resolve, gets no steps and a named refusal — never a default branch and never `latest`.
 */
export function installPlan({ track, requested_cli_version = null, installMode = "checkout", revision = null } = {}) {
  const base = { track, install_mode: installMode, requested_cli_version, steps: [], keyless: true, model_call: false };
  if (installMode === "published" && !revision) {
    return { ...base, refusal: { verdict: "could-not-run", reason: "release-revision-unresolved", owner: "T9" } };
  }
  if (typeof requested_cli_version !== "string" || requested_cli_version.length === 0) {
    return { ...base, refusal: { verdict: "could-not-run", reason: "newest-version-not-resolved", owner: "T2" } };
  }
  if (/[\s^~<>*|]|latest/i.test(requested_cli_version)) {
    return { ...base, refusal: { verdict: "could-not-run", reason: "version-not-exact", version: requested_cli_version } };
  }
  return {
    ...base,
    steps: [
      {
        name: `install-${HARNESS}-${track}`,
        purpose: `install ${CLI_PACKAGE}@${requested_cli_version} exactly, with auto-update off`,
        argv: ["npm", "install", "-g", `${CLI_PACKAGE}@${requested_cli_version}`],
        env: { ...AUTO_UPDATER_ENV },
        keyless: true,
        model_call: false,
      },
    ],
  };
}

/**
 * The checkout load steps. Both plugin commands are the PRD's own untested-by-admission pair, so
 * they are recorded as claims with `proven_by: null`; only a run's own evidence (the plugin's
 * command names in `plugin details`, and the loaded payload's digest) turns one into a fact.
 */
export function loadPlan({ workspace = ROOT, configDir = null, pluginRoot = PLUGIN_ROOT } = {}) {
  const env = { ...AUTO_UPDATER_ENV };
  if (configDir) env.CLAUDE_CONFIG_DIR = configDir;
  const steps = [
    {
      name: "marketplace-add",
      purpose: "add the workspace as the pixel-perfect marketplace",
      argv: ["claude", "plugin", "marketplace", "add", workspace],
      env: { ...env },
      keyless: true,
      model_call: false,
      cwd: workspace,
    },
    {
      name: "plugin-install",
      purpose: `install ${PLUGIN_SELECTOR} from that marketplace`,
      argv: ["claude", "plugin", "install", PLUGIN_SELECTOR],
      env: { ...env },
      keyless: true,
      model_call: false,
      cwd: workspace,
    },
    {
      name: "plugin-details",
      purpose: "read the plugin's component inventory with no model call",
      argv: ["claude", "plugin", "details", PLUGIN_NAME],
      env: { ...env },
      keyless: true,
      model_call: false,
      cwd: workspace,
    },
  ];
  for (const step of steps) assertKeylessStep(step);
  return {
    steps,
    pluginRoot,
    workspace,
    configDir,
    claims: [
      {
        claim: "checkout-marketplace-add",
        untested_until_proven: true,
        proven_by: null,
        proven_when: "the marketplace add exited 0 and plugin details resolves the plugin from it",
      },
      {
        claim: "checkout-plugin-install",
        untested_until_proven: true,
        proven_by: null,
        proven_when: "the installed payload's digest equals the checkout payload's digest",
      },
    ],
  };
}

/** A keyless step that carries a credential name is a bug, not a configuration: refuse it. */
export function assertKeylessStep(step) {
  const surfaces = [step.name, ...(step.argv ?? []), ...Object.entries(step.env ?? {}).flatMap(([name, value]) => [name, String(value)])];
  for (const surface of surfaces) {
    if (SECRET_NAME.test(String(surface))) {
      throw new Error(`keyless step ${step.name} carries the credential name ${surface}`);
    }
  }
  if (step.keyless !== true) throw new Error(`step ${step.name} is not declared keyless`);
  return step;
}

/**
 * The full declaration of a cell: install for both tracks, the checkout load, the model-free
 * command list, the five invocations and the identity the cell must prove.
 */
export function describe({ manifest = loadPins().manifest, resolvedNewest = null, workspace = ROOT, configDir = null, installMode = "checkout", revision = null, pluginRoot = PLUGIN_ROOT } = {}) {
  const pin = manifest.harnesses[HARNESS];
  const newest = resolvedNewest?.[HARNESS] ?? null;
  const table = invocationTable({ track: "pinned", dirs: null, pluginRoot });
  return {
    schema: DESCRIPTION_SCHEMA,
    harness: HARNESS,
    install_mode: installMode,
    pinned_cli_version: pin.pinned_cli_version,
    newest_cli_version: newest,
    install: {
      pinned: installPlan({ track: "pinned", requested_cli_version: pin.pinned_cli_version, installMode, revision }),
      newest: installPlan({ track: "newest", requested_cli_version: newest, installMode, revision }),
    },
    load: loadPlan({ workspace, configDir, pluginRoot }),
    command_list: {
      argv: ["claude", "plugin", "details", PLUGIN_NAME],
      model_call: false,
      keyless: true,
      expected_names: commandNames({ pluginRoot }),
      dedupe: true,
      assertion: "presence of every expected name after dedupe, never a count",
    },
    invocations: table.map(({ caseManifest, stance, ...entry }) => ({
      ...entry,
      case_id: entry.case_id,
      stance: stance ? { mode: stance.mode, add_dir: stance.add_dir, argv: stance.argv } : null,
    })),
    checks: [...CHECKS],
    identity: {
      fields: [
        "requested_cli_version",
        "resolved_cli_version",
        "observed_cli_version",
        "install_mode",
        "plugin_revision",
        "expected_plugin_manifest_sha256",
        "observed_plugin_manifest_sha256",
        "loaded_plugin_root",
        "plugin_load_evidence",
      ],
      digest_rule: "sha256 over sorted relative paths + file contents, computed on both payloads",
      observed_cli_version_source: "the CLI's own report (claude --version, and system/init.claude_code_version)",
      plugin_revision_source: "installed_plugins.json gitCommitSha",
    },
    binding_env: pin.binding_env,
    credential_env: pin.credential_env,
    model: { provider: pin.provider, model: pin.model, model_kind: pin.model_kind },
  };
}

// ---------------------------------------------------------------------------
// Digests, command names, installed payload
// ---------------------------------------------------------------------------

/** The plugin manifest digest: sorted relative paths + file contents, hashed once. */
export function manifestDigest(root) {
  if (!root || !existsSync(root)) return null;
  const files = manifestOf(root, { skip: DIGEST_SKIP });
  const canonical = Object.entries(files)
    .map(([rel, sha]) => `${sha}  ${rel}\n`)
    .join("");
  return sha256Hex(Buffer.from(canonical, "utf8"));
}

/** The plugin's command names, read from the plugin's own `commands/` directory. */
export function commandNames({ pluginRoot = PLUGIN_ROOT } = {}) {
  const dir = join(pluginRoot, "commands");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((file) => file.endsWith(".md"))
    .map((file) => file.slice(0, -3))
    .sort();
}

/**
 * Parses `claude plugin details`' component inventory. The command prints each name once per
 * source (a command and its skill), so the parse dedupes and reports the extras rather than
 * pretending the printed count is the component count.
 */
export function parseCommandList(text) {
  const groups = {};
  for (const line of String(text ?? "").split("\n")) {
    const match = line.match(/^\s*(Skills|Agents|Hooks|MCP servers|LSP servers)\s*\((\d+)\)\s*(.*)$/);
    if (!match) continue;
    const [, label, count, rest] = match;
    const names = rest
      .split(",")
      .map((name) => name.trim())
      .filter((name) => name.length > 0);
    groups[label.toLowerCase().replace(/\s+/g, "_")] = { declared_count: Number(count), names };
  }
  const raw = groups.skills?.names ?? [];
  const deduped = [...new Set(raw)].sort();
  return { groups, raw, deduped, repeated: raw.length - deduped.length };
}

/** `claude --version` → the dotted version it reported, or null. Never a cache label. */
export function observedCliVersion(step) {
  const text = String(step?.text ?? "");
  const match = text.match(/([0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?)/);
  return match ? match[1] : null;
}

/**
 * Where the plugin actually landed, read from the CLI's own install record rather than guessed
 * from a cache directory name.
 */
export function readInstalledPlugin(configDir) {
  const file = join(configDir, "plugins", "installed_plugins.json");
  if (!existsSync(file)) return { installPath: null, version: null, gitCommitSha: null, file, reason: "installed-plugins-absent" };
  const record = JSON.parse(readFileSync(file, "utf8"));
  const entries = record?.plugins?.[PLUGIN_SELECTOR] ?? [];
  const entry = entries.find((candidate) => typeof candidate?.installPath === "string") ?? entries[0] ?? null;
  return {
    file,
    installPath: entry?.installPath ?? null,
    version: entry?.version ?? null,
    gitCommitSha: entry?.gitCommitSha ?? null,
  };
}

// ---------------------------------------------------------------------------
// InstallationIdentity
// ---------------------------------------------------------------------------

export function installationIdentity({
  requested_cli_version = null,
  resolved_cli_version = null,
  observed_cli_version = null,
  install_mode = "checkout",
  plugin_revision = null,
  expected_plugin_manifest_sha256 = null,
  observed_plugin_manifest_sha256 = null,
  loaded_plugin_root = null,
  plugin_load_evidence = null,
} = {}) {
  const identity = {
    requested_cli_version,
    resolved_cli_version,
    observed_cli_version,
    install_mode,
    plugin_revision,
    expected_plugin_manifest_sha256,
    observed_plugin_manifest_sha256,
    loaded_plugin_root,
    plugin_load_evidence,
  };
  validateAgainst("installation-identity.v1.schema.json", identity);
  return identity;
}

const DOTTED = /^[0-9]+\.[0-9]+\.[0-9]+/;
const HEX64 = /^[0-9a-f]{64}$/;

/**
 * Decides whether the identity may be graded. Every check names the field that failed, in a fixed
 * order, and a failure is `could-not-run` / `installation-identity-mismatch` — the run is not
 * attributable, so it is not a candidate failure.
 */
export function approveIdentity(identity, { requested_cli_version = identity?.resolved_cli_version ?? identity?.requested_cli_version ?? null } = {}) {
  const mismatch = (field, observed, expected) => ({
    ok: false,
    verdict: "could-not-run",
    reason: "installation-identity-mismatch",
    detail: { field, observed: observed ?? null, expected: expected ?? null },
  });

  if (typeof identity?.observed_cli_version !== "string" || !DOTTED.test(identity.observed_cli_version)) {
    return mismatch("observed_cli_version", identity?.observed_cli_version, "a dotted version");
  }
  if (typeof requested_cli_version === "string" && requested_cli_version !== identity.observed_cli_version) {
    return mismatch("observed_cli_version", identity.observed_cli_version, requested_cli_version);
  }
  if (typeof identity?.expected_plugin_manifest_sha256 !== "string" || !HEX64.test(identity.expected_plugin_manifest_sha256)) {
    return mismatch("expected_plugin_manifest_sha256", identity?.expected_plugin_manifest_sha256, "64 hex characters");
  }
  // The expected digest is hex-validated above, so any non-hex observed digest is already unequal
  // to it: one comparison refuses both a mismatched and an unparseable observation.
  if (identity.observed_plugin_manifest_sha256 !== identity.expected_plugin_manifest_sha256) {
    return mismatch("observed_plugin_manifest_sha256", identity.observed_plugin_manifest_sha256, identity.expected_plugin_manifest_sha256);
  }
  if (typeof identity?.loaded_plugin_root !== "string" || identity.loaded_plugin_root.length === 0 || !existsSync(identity.loaded_plugin_root)) {
    return mismatch("loaded_plugin_root", identity?.loaded_plugin_root, "an existing directory");
  }
  if (typeof identity?.plugin_load_evidence !== "string" || identity.plugin_load_evidence.length === 0) {
    return mismatch("plugin_load_evidence", identity?.plugin_load_evidence, "the system/init plugin list");
  }
  return { ok: true, verdict: null, reason: null, detail: null };
}

const block = (verdict, reason, detail = {}) => ({ verdict, reason, ...detail });

/**
 * The plugin-gate block. `-p` can enter bare mode and load nothing; a graded run that made model
 * requests without the plugin loaded is not attributable to the plugin, so it is could-not-run.
 */
function pluginGateBlocks(entry, record, gate) {
  if (entry.graded && record.model_request_count > 0 && !gate.loaded) {
    return [block("could-not-run", "plugin-not-loaded", { evidence: gate.evidence })];
  }
  return [];
}

/**
 * The ask-policy blocks: what the invocation's declared ask policy and the question boundary say
 * about the questions a turn asked, plus the one block for a graded turn the model never answered.
 * The `must-ask` checks have teeth in both directions — no question fails, and more than one fails.
 */
function askPolicyBlocks(entry, boundary, answer) {
  const blocks = [];
  if (entry.ask_policy === "ask-nothing" && boundary.count > 0) {
    blocks.push(block("fail", "question-in-ask-nothing", { count: boundary.count, offsets: boundary.offsets }));
  }
  if (entry.ask_policy === "must-ask") {
    if (boundary.count === 0) blocks.push(block("fail", "no-question-asked"));
    else if (boundary.count > 1) blocks.push(block("fail", "more-than-one-question", { count: boundary.count }));
    if (boundary.answers_delivered > 0) blocks.push(block("fail", "answer-delivered", { delivered: boundary.answers_delivered }));
  }

  const questionSatisfied = entry.ask_policy === "must-ask" && boundary.count > 0;
  if (entry.graded !== false && !questionSatisfied && !answer.answered) {
    blocks.push(block("could-not-run", answer.reason, answer.detail ?? {}));
  }
  return blocks;
}

/**
 * Grades one invocation. The record-level rules (termination, resolvable citations, required facts,
 * required-read denials) come from `gradeFromEvidence`; this function adds only what the check
 * itself knows — the plugin gate, the question boundary, whether the model answered, and the
 * check's own artefact — and the aggregate can only get worse, never better.
 */
export function gradeCheck({ record, entry, track = entry?.track ?? "pinned", installation, evidence_paths = null, gradeDir = null }) {
  if (!record) throw new Error("gradeCheck needs a capture record");
  const base = gradeFromEvidence({
    record,
    installation,
    harness: HARNESS,
    track,
    check_id: entry.check_id,
    evidence_paths: evidence_paths ?? record.evidence_paths ?? [],
    report_paths: entry.bound_path ? [entry.bound_path] : [],
    required_facts: (entry.required_facts ?? []).map((fact_id) => ({ fact_id })),
  });

  // A refused invocation never started: the guard's own reason is the verdict, and no check block
  // may outrank it (there is no stream to read, so "no result event" would be a symptom, not a cause).
  if (record.refusal) return { cell: base, blocks: base.block_reasons, gate: pluginGate(record), boundary: questionBoundary(record), answer: modelAnswer(record) };

  const gate = pluginGate(record);
  const boundary = questionBoundary(record);
  const answer = modelAnswer(record);
  const blocks = [...pluginGateBlocks(entry, record, gate)];

  blocks.push(...askPolicyBlocks(entry, boundary, answer));

  let observed_verify_outcome = null;
  if (entry.graded === false) {
    // The command list makes no model call, so its evidence is the captured inventory itself.
    const parsed = parseCommandList(capturedLines(record).map((line) => line.text).join("\n"));
    const expected = commandNames({ pluginRoot: PLUGIN_ROOT });
    const present = expected.filter((name) => parsed.deduped.includes(name));
    if (parsed.deduped.length === 0) blocks.push(block("could-not-run", "command-list-unreadable"));
    else if (present.length !== expected.length) {
      blocks.push(block("fail", "command-list-incomplete", { missing: expected.filter((name) => !present.includes(name)) }));
    }
  } else if (answer.answered) {
    if (entry.check_id === "status") {
      const expectedFacts = entry.caseManifest?.expected_facts ?? null;
      const facts = statusFacts(answer.reply, expectedFacts);
      if (!expectedFacts) blocks.push(block("could-not-run", "no-status-facts-declared"));
      else if ((facts.missing ?? []).length > 0) blocks.push(block("fail", "status-facts-absent", { missing: facts.missing }));
    } else if (entry.check_id === "verify") {
      const outcome = readVerifyReport({ entry });
      observed_verify_outcome = outcome.observed_verify_outcome;
      if (!outcome.ok) blocks.push(block(outcome.verdict, outcome.reason, outcome.detail ?? {}));
    }
  }

  const verdict = worstVerdict([base.verdict, ...blocks.map((entryBlock) => entryBlock.verdict)]);
  const fromCheck = blocks.find((entryBlock) => entryBlock.verdict === verdict) ?? null;
  const winner = fromCheck ?? base.block_reasons.find((entryBlock) => entryBlock.verdict === verdict) ?? {};
  const cell = {
    ...base,
    verdict,
    reason: winner.reason ?? base.reason,
    observed_verify_outcome: observed_verify_outcome ?? base.observed_verify_outcome,
    block_reasons: [...blocks, ...base.block_reasons],
    checks: [{ check_id: entry.check_id, verdict, reason: winner.reason ?? base.reason, source: base.source }],
  };

  // A check may only make the record-level verdict worse; a check that "improved" it is a bug.
  if (worstVerdict([base.verdict, verdict]) !== verdict) {
    throw new Error(`check ${entry.check_id} improved the record verdict ${base.verdict} -> ${verdict}`);
  }
  validateAgainst("harness-cell.v1.schema.json", cell);
  assertPassEvidence(cell);
  if (gradeDir) writeGrade({ dir: gradeDir, cell });
  return { cell, blocks, gate, boundary, answer };
}

/**
 * The verify report at its case-declared path, bound to the invocation that produced it. A missing
 * report is `fail report-missing` — never could-not-run, never a pass.
 */
export function readVerifyReport({ entry }) {
  const bound = entry.bound_path;
  if (!bound || !existsSync(bound) || !statSync(bound).isFile()) {
    return { ok: false, verdict: "fail", reason: "report-missing", detail: { path: bound ?? null } };
  }
  let reported;
  try {
    reported = JSON.parse(readFileSync(bound, "utf8"));
  } catch (error) {
    return { ok: false, verdict: "fail", reason: "report-unreadable", detail: { path: bound, why: error.code ?? "invalid-json" } };
  }
  const boundReport = bindReport({ invocation: entry, reported });
  if (!boundReport.ok) return { ok: false, verdict: boundReport.verdict, reason: boundReport.reason, detail: boundReport };
  const expected = entry.caseManifest?.role === "defect" ? "defect-detected" : "clean";
  const observed = reported.observed_verify_outcome ?? null;
  if (observed !== expected) {
    return { ok: false, verdict: "fail", reason: `verify-${observed ?? "unknown"}`, detail: { expected }, observed_verify_outcome: observed };
  }
  // A detector that names the wrong component has not detected the planted defect.
  const declaredKey = entry.caseManifest?.defect_key ?? null;
  if (declaredKey) {
    const named = reported.observed_defect_key ?? null;
    const drifted = (reported.evidence?.drifted_keys ?? []).includes(declaredKey);
    if (named !== declaredKey && !drifted) {
      return {
        ok: false,
        verdict: "fail",
        reason: "verify-defect-key-mismatch",
        detail: { expected: declaredKey, named },
        observed_verify_outcome: observed,
      };
    }
  }
  return { ok: true, observed_verify_outcome: observed, report: reported };
}

/** A report body belongs to the invocation that produced it: a borrowed body is refused. */
export function bindReport({ invocation, reported }) {
  if (!reported || typeof reported !== "object") return { ok: false, verdict: "fail", reason: "report-missing" };
  const expected = invocation?.invocation_id ?? null;
  const seen = reported.invocation_id ?? null;
  if (typeof seen !== "string" || seen.length === 0 || seen !== expected) {
    return { ok: false, verdict: "fail", reason: "report-mismatched-invocation", expected, seen };
  }
  return { ok: true, verdict: null, reason: null };
}

// ---------------------------------------------------------------------------
// Running one invocation through the shared runtime
// ---------------------------------------------------------------------------

/**
 * Runs one table entry. A graded entry goes through the guard (which refuses without the binding
 * and refuses an unapproved stance) and the capture; the keyless command-list entry runs through
 * the same capture without a guard, because it makes no model request. Nothing is spawned here —
 * `runGuarded`/`spawnCaptured` own that.
 */
export async function runCheck({ track = "pinned", entry, pluginRoot = PLUGIN_ROOT, configDir = null, env = process.env, installation = null, installMode = "checkout", evidenceDir = null, gradeDir = null }) {
  if (!entry) throw new Error("runCheck needs a table entry from invocationTable()");
  const capture = createCapture({
    harness: HARNESS,
    check_id: entry.check_id,
    cwd: entry.cwd,
    timeout_ms: entry.timeout_ms,
    argv: entry.argv,
    invocation_id: entry.invocation_id,
  });
  const dir = evidenceDir ?? mkdtempSync(join(tmpdir(), `pp-${HARNESS}-${entry.check_id}-evidence-`));
  mkdirSync(dir, { recursive: true });

  const stepEnv = { ...env, ...AUTO_UPDATER_ENV };
  if (configDir) stepEnv.CLAUDE_CONFIG_DIR = configDir;

  let decision;
  if (entry.graded) {
    const stance = entry.stance ?? recordStance({ harness: HARNESS, plugin_root: pluginRoot });
    const run = await runGuarded({
      harness: HARNESS,
      stance,
      env: stepEnv,
      capture,
      command: "claude",
      args: entry.argv,
      cwd: entry.cwd,
      timeout_ms: entry.timeout_ms,
    });
    decision = run.decision;
  } else {
    decision = guardInvocationFor(entry, stepEnv);
    if (!decision.allowed) {
      const refused = capture.persist(join(dir, "captures"));
      const identity = installation ?? defaultInstallation({ record: refused, entry, track, installMode });
      return { entry, decision, record: refused, installation: identity, ...gradeCheck({ record: refused, entry, track, installation: identity }) };
    }
    // The keyless row's argv excludes the binary (it is not a `-p` invocation), so the binary is
    // named here and the row's own argv follows it.
    const status = await spawnCaptured({
      command: "claude",
      args: entry.argv,
      cwd: entry.cwd,
      env: keylessEnv(stepEnv),
      capture,
      timeout_ms: entry.timeout_ms,
    });
    capture.finish(status);
  }

  // Observations are bound to the spans of captured bytes that produced them, and requiredness is
  // declared by the mapper: an undeclared denial fails closed downstream.
  capture.observe((json, line) => mapCapturedLine({ json, text: line.text, entry }), { required_read_paths: null });

  const record = capture.persist(join(dir, "captures"));
  const identity = installation ?? defaultInstallation({ record, entry, track, installMode });
  // One grade file per invocation: `verify` is graded twice (planted and clean), so the two grades
  // must not share a filename. The aggregate cell is `cellFor`, written by the result-artifact owner.
  const graded = gradeCheck({ record, entry, track, installation: identity, gradeDir: gradeDir ?? join(dir, "grades", entry.key) });
  return { entry, decision, record, installation: identity, ...graded };
}

/**
 * A keyless invocation's decision, shaped like the guard's so one reader handles both. The claim is
 * about the CHILD's environment: the parent may hold any credential, and every credential name is
 * removed before the child starts. Names are reported; no value is ever read or recorded.
 */
function guardInvocationFor(entry, env) {
  const childEnv = keylessEnv(env);
  const inChild = Object.keys(childEnv).filter((name) => SECRET_NAME.test(name)).sort();
  const removed = Object.keys(env).filter((name) => SECRET_NAME.test(name)).sort();
  return {
    harness: HARNESS,
    check_id: entry.check_id,
    allowed: inChild.length === 0,
    keyless: true,
    credential_names_removed: removed,
    credential_names_in_child: inChild,
    model_requests: 0,
    refusal:
      inChild.length === 0
        ? null
        : { verdict: "could-not-run", reason: "key-on-keyless-step", check: "credential", names: inChild, decided_before: "model-request", model_requests: 0 },
  };
}

/** Everything but the credential names: a keyless step's child env. */
export function keylessEnv(env = process.env) {
  const out = {};
  for (const [name, value] of Object.entries(env)) if (!SECRET_NAME.test(name)) out[name] = value;
  return out;
}

/**
 * The identity a single invocation can prove on its own: the observed version and the primary
 * plugin-the record's init event names, the digest of the payload it loaded, and the evidence line.
 * A field the stream did not carry stays null — never guessed.
 */
export function defaultInstallation({ record, entry, track = "pinned", installMode = "checkout", requested_cli_version = null }) {
  const gate = record ? pluginGate(record) : { plugin_path: null, evidence: null, observed_cli_version: null };
  const pin = harnessPin();
  const requested = requested_cli_version ?? (track === "newest" ? null : pin.pinned_cli_version);
  return installationIdentity({
    requested_cli_version: requested,
    resolved_cli_version: requested,
    observed_cli_version: gate.observed_cli_version,
    install_mode: installMode,
    plugin_revision: null,
    expected_plugin_manifest_sha256: manifestDigest(PLUGIN_ROOT),
    observed_plugin_manifest_sha256: gate.plugin_path ? manifestDigest(gate.plugin_path) : null,
    loaded_plugin_root: gate.plugin_path,
    plugin_load_evidence: gate.evidence,
  });
}

// ---------------------------------------------------------------------------
// Executing the keyless steps for real
// ---------------------------------------------------------------------------

/** Where `claude` is on this host, or null. Resolved from PATH — nothing is spawned to find out. */
export function claudeAvailable({ env = process.env } = {}) {
  for (const dir of String(env.PATH ?? "").split(delimiter)) {
    if (!dir) continue;
    const candidate = join(dir, "claude");
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

async function runKeyless({ step, evidenceDir, env }) {
  const capture = createCapture({
    harness: HARNESS,
    check_id: step.name,
    cwd: step.cwd ?? ROOT,
    timeout_ms: step.timeout_ms ?? 180_000,
    argv: step.argv,
  });
  assertKeylessStep(step);
  const childEnv = keylessEnv({ ...env, ...step.env });
  const status = await spawnCaptured({
    command: step.argv[0],
    args: step.argv.slice(1),
    cwd: step.cwd ?? ROOT,
    env: childEnv,
    capture,
    timeout_ms: step.timeout_ms ?? 180_000,
  });
  capture.finish(status);
  const record = capture.persist(join(evidenceDir, "captures"));
  const stdoutPath = record.evidence_paths.find((path) => path.endsWith(".stdout.bin"));
  const text = stdoutPath ? readFileSync(stdoutPath, "utf8") : "";
  return {
    ...step,
    exit_code: status.exit_code,
    reason: status.spawn_error ?? (status.timed_out ? "timed-out" : null),
    text,
    capture_path: record.evidence_paths.find((path) => path.endsWith(".capture.json")) ?? null,
    credential_names_in_child: Object.keys(childEnv).filter((name) => SECRET_NAME.test(name)),
  };
}

/**
 * Runs the checkout load for real: version probe, marketplace add, plugin install, command list —
 * every step keyless with auto-update off, in an isolated config dir. The claims are proven by the
 * evidence this run produces (the parsed command names and the payload digest), never by an exit
 * code alone.
 */
export async function executeLoad({ workspace = ROOT, configDir, env = process.env, pluginRoot = PLUGIN_ROOT, evidenceDir = null, installMode = "checkout" } = {}) {
  if (!configDir) throw new Error("executeLoad needs an isolated configDir: the user's own plugin state must never be touched");
  const dir = evidenceDir ?? mkdtempSync(join(tmpdir(), `pp-${HARNESS}-load-evidence-`));
  mkdirSync(dir, { recursive: true });
  const runId = `${HARNESS}-load-${randomUUID()}`;
  const baseEnv = { ...env, CLAUDE_CONFIG_DIR: configDir, ...AUTO_UPDATER_ENV };

  const versionStep = await runKeyless({
    step: { name: "cli-version", argv: ["claude", "--version"], env: {...AUTO_UPDATER_ENV}, keyless: true, cwd: workspace, purpose: "the version the CLI itself reports" },
    evidenceDir: dir,
    env,
  });
  const observed = observedCliVersion(versionStep);

  const load = loadPlan({ workspace, configDir, pluginRoot });
  const steps = [];
  for (const step of load.steps) steps.push(await runKeyless({ step, evidenceDir: dir, env: baseEnv }));

  const details = steps.find((step) => step.name === "plugin-details");
  const command_list = parseCommandList(details?.text ?? "");
  const installed = readInstalledPlugin(configDir);
  const expectedDigest = manifestDigest(pluginRoot);
  const observedDigest = installed.installPath ? manifestDigest(installed.installPath) : null;
  const names = commandNames({ pluginRoot });
  const proven = (condition) => (condition ? runId : null);

  const identity = installationIdentity({
    requested_cli_version: harnessPin().pinned_cli_version,
    resolved_cli_version: harnessPin().pinned_cli_version,
    observed_cli_version: observed,
    install_mode: installMode,
    plugin_revision: installed.gitCommitSha,
    expected_plugin_manifest_sha256: expectedDigest,
    observed_plugin_manifest_sha256: observedDigest,
    loaded_plugin_root: installed.installPath,
    plugin_load_evidence:
      names.length > 0 && names.every((name) => command_list.deduped.includes(name))
        ? `plugin details lists all ${names.length} command names from the installed payload`
        : null,
  });

  return {
    run_id: runId,
    configDir,
    workspace,
    evidence_dir: dir,
    version_step: versionStep,
    steps,
    command_list,
    installed,
    identity,
    claims: load.claims.map((claim) => {
      if (claim.claim === "checkout-marketplace-add") {
        return { ...claim, proven_by: proven(steps[0]?.exit_code === 0 && command_list.deduped.length > 0) };
      }
      return { ...claim, proven_by: proven(observedDigest !== null && observedDigest === expectedDigest) };
    }),
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}

// ---------------------------------------------------------------------------
// The cell: four checks, one identity
// ---------------------------------------------------------------------------

/**
 * One (harness, track) cell from its per-check grades. The identity decision is applied here and
 * only here: an unattributable run is could-not-run installation-identity-mismatch before any
 * check verdict is read.
 */
export function cellFor({ track, cells, installation, harness = HARNESS }) {
  const perCheck = cells ?? [];
  if (perCheck.length === 0) throw new Error("cellFor needs at least one graded check");
  const identity = approveIdentity(installation, {
    requested_cli_version: installation?.resolved_cli_version ?? installation?.requested_cli_version ?? null,
  });
  // Four check verdicts, not one per invocation: `verify` is graded from two invocations (planted
  // and clean) and the check's verdict is the worse of them.
  const byCheck = new Map();
  for (const cell of perCheck) {
    for (const check of cell.checks ?? []) {
      const seen = byCheck.get(check.check_id);
      if (!seen) {
        byCheck.set(check.check_id, { check_id: check.check_id, verdict: check.verdict, reason: check.reason ?? null, source: check.source });
        continue;
      }
      const verdict = worstVerdict([seen.verdict, check.verdict]);
      if (verdict !== seen.verdict) byCheck.set(check.check_id, { check_id: check.check_id, verdict, reason: check.reason ?? null, source: check.source });
    }
  }
  const checks = [...CHECKS.filter((checkId) => byCheck.has(checkId)).map((checkId) => byCheck.get(checkId))];
  const verdicts = [...perCheck.map((cell) => cell.verdict), ...(identity.ok ? [] : ["could-not-run"])];
  const verdict = worstVerdict(verdicts);
  const winner = identity.ok
    ? (perCheck.find((cell) => cell.verdict === verdict) ?? {})
    : { reason: identity.reason, field: identity.detail?.field ?? null };
  const observed =
    perCheck.map((cell) => cell.observed_verify_outcome).find((outcome) => outcome != null) ?? null;

  // The aggregate's evidence identity comes from the per-check record that carries the aggregate's
  // own verdict: a pass needs a named invocation and its raw exit status, and a could-not-run cell
  // still cites the run that produced the bytes it could not grade. Without this, `invocation_id`
  // stays null and `assertPassEvidence` makes a graded pass unrepresentable.
  const evidenceCell =
    perCheck.find((cell) => cell.verdict === verdict && typeof cell.invocation_id === "string" && cell.invocation_id.length > 0) ??
    perCheck.find((cell) => typeof cell.invocation_id === "string" && cell.invocation_id.length > 0) ??
    perCheck[0] ??
    null;
  const exitCode = Number.isInteger(evidenceCell?.process_exit_code)
    ? evidenceCell.process_exit_code
    : (perCheck.map((entry) => entry.process_exit_code).find((code) => Number.isInteger(code)) ?? null);

  const cell = {
    harness,
    track,
    installation,
    invocation_id: evidenceCell?.invocation_id ?? null,
    check_id: evidenceCell?.check_id ?? null,
    verdict,
    reason: winner.reason ?? null,
    source: "files-and-event-stream",
    denied_tool_call: perCheck.map((entry) => entry.denied_tool_call).find((denial) => denial != null) ?? null,
    process_exit_code: exitCode,
    evidence_paths: perCheck.flatMap((entry) => entry.evidence_paths ?? []),
    report_paths: perCheck.flatMap((entry) => entry.report_paths ?? []),
    observed_verify_outcome: observed,
    checks,
    invocation_ids: perCheck.map((entry) => entry.invocation_id).filter((id) => typeof id === "string"),
    identity_decision: identity,
    block_reasons: perCheck.flatMap((entry) => entry.block_reasons ?? []),
  };
  validateAgainst("harness-cell.v1.schema.json", cell);
  assertPassEvidence(cell);
  return cell;
}

// ---------------------------------------------------------------------------
// The adapter object the registry hands to the cell wiring
// ---------------------------------------------------------------------------

export const adapter = {
  HARNESS,
  CHECKS,
  describe,
  installPlan,
  loadPlan,
  invocationTable,
  prepareRunDirs,
  prepareVerifyPair,
  executeLoad,
  runCheck,
  cellFor,
  installationIdentity,
  approveIdentity,
  manifestDigest,
  commandNames,
  pluginGate,
  questionBoundary,
  claudeAvailable,
};

// ---------------------------------------------------------------------------
// CLI — what the workflow's install slot and a human both call
// ---------------------------------------------------------------------------

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (isMain) {
  const [verb, ...rest] = process.argv.slice(2);
  const flag = (name) => {
    const index = rest.indexOf(`--${name}`);
    return index === -1 ? undefined : rest[index + 1];
  };
  const emit = (value) => process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);

  if (verb === "describe") {
    emit(
      describe({
        resolvedNewest: { [HARNESS]: flag("newest") ?? null },
        installMode: flag("install-mode") ?? "checkout",
        configDir: flag("config-dir") ?? null,
      }),
    );
  } else if (verb === "load") {
    const configDir = flag("config-dir");
    if (!configDir) {
      process.stderr.write("load needs --config-dir <dir>: the load installs into an isolated config, never the user's\n");
      process.exitCode = 2;
    } else {
      const load = await executeLoad({ workspace: flag("workspace") ?? ROOT, configDir });
      emit({ ...load, cleanup: undefined });
    }
  } else if (verb === "install") {
    const track = flag("track") ?? "pinned";
    const manifest = loadPins().manifest;
    const version = flag("version") ?? (track === "pinned" ? manifest.harnesses[HARNESS].pinned_cli_version : null);
    const plan = installPlan({ track, requested_cli_version: version, installMode: flag("install-mode") ?? "checkout" });
    if (plan.refusal) {
      emit(plan);
      process.exitCode = 1;
    } else {
      const step = plan.steps[0];
      const capture = createCapture({ harness: HARNESS, check_id: step.name, argv: step.argv });
      const status = await spawnCaptured({ command: step.argv[0], args: step.argv.slice(1), env: keylessEnv({ ...process.env, ...step.env }), capture, timeout_ms: 600_000 });
      capture.finish(status);
      emit({ ...plan, exit_code: status.exit_code, reason: status.spawn_error ?? null });
      process.exitCode = status.exit_code === 0 ? 0 : 1;
    }
  } else {
    process.stderr.write("usage: claude-code.mjs <describe|install|load> [--track pinned|newest] [--version V] [--config-dir D] [--workspace W] [--newest V] [--install-mode checkout|published]\n");
    process.exitCode = 2;
  }
}
