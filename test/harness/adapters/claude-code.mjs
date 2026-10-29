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
// shortcut: the question-event shapes are matched by declared markers (QUESTION_TOOL_NAMES) because
// no real must-ask capture exists yet — that capture is T11's qualification. The detector cannot
// silently pass: the must-ask probe FAILS when it sees no question, so a stale marker set fails the
// probe loudly instead of certifying it. Upgrade when the first real must-ask capture lands.
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
import { assertPassEvidence, validateAgainst } from "../validate.mjs";

export const HARNESS = "claude-code";
export const PLUGIN_NAME = "pixel-perfect";
export const PLUGIN_MARKETPLACE = "pixel-perfect";
export const PLUGIN_SELECTOR = `${PLUGIN_NAME}@${PLUGIN_MARKETPLACE}`;
export const PLUGIN_ROOT_REL = `plugins/${PLUGIN_NAME}`;
export const CLI_PACKAGE = "@anthropic-ai/claude-code";
export const CHECKS = ["command_list", "status", "verify", "question_before_expensive_work"];
export const DESCRIPTION_SCHEMA = "claude-code-adapter/v1";

/** Auto-update off, on every step: a self-updating CLI could pass at a version nobody pinned. */
export const AUTO_UPDATER_ENV = Object.freeze({ DISABLE_AUTOUPDATER: "1" });

/** The tool names a first question arrives as. Declared here, matched by the stream mapper. */
export const QUESTION_TOOL_NAMES = Object.freeze(["AskUserQuestion"]);

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

/**
 * The prompt for one invocation: the plugin's slash command first, then the case's own arguments.
 * Nothing is inferred — a case with no platform argument contributes none.
 */
export function promptFor({ command_name, caseManifest = null }) {
  return [`/pixel-perfect:${command_name}`, ...caseArgs(caseManifest)].join(" ");
}

function gradedArgv({ prompt, pluginRoot, max_turns = 0 }) {
  const argv = [
    "-p",
    prompt,
    "--output-format",
    "stream-json",
    "--verbose",
    "--permission-mode",
    "dontAsk",
    "--add-dir",
    pluginRoot,
  ];
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
    const prompt = promptFor({ command_name: entry.command_name, caseManifest });
    const argv = gradedArgv({ prompt, pluginRoot, max_turns });
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
      stance: recordStance({ harness: HARNESS, plugin_root: pluginRoot }),
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

// ---------------------------------------------------------------------------
// Captured streams → facts
// ---------------------------------------------------------------------------

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

/** A question is a tool start on a question tool, or an explicit question marker in the stream. */
function isQuestionEvent(json) {
  if (!json) return false;
  if (json.type === "user_choice" || json.subtype === "ask_user_question") return true;
  const content = json.message?.content;
  if (!Array.isArray(content)) return false;
  return content.some((block) => block?.type === "tool_use" && QUESTION_TOOL_NAMES.includes(block?.name));
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
      const target = denial?.input?.file_path ?? denial?.input?.path ?? denial?.target ?? null;
      const required = isRequiredPath(target, entry);
      out.push({
        kind: "permission_denied",
        operation: denial?.tool_name ?? denial?.tool ?? null,
        target,
        required_read: required,
        detail: { mode: json.permissionMode ?? null },
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

const block = (verdict, reason, detail = {}) => ({ verdict, reason, ...detail });

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
  const blocks = [];

  if (entry.graded && record.model_request_count > 0 && !gate.loaded) {
    blocks.push(block("could-not-run", "plugin-not-loaded", { evidence: gate.evidence }));
  }

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
export async function executeLoad({ workspace = ROOT, configDir, env = process.env, pluginRoot = PLUGIN_ROOT, evidenceDir = null } = {}) {
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
    install_mode: "checkout",
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

  const cell = {
    harness,
    track,
    installation,
    invocation_id: null,
    check_id: null,
    verdict,
    reason: winner.reason ?? null,
    source: "files-and-event-stream",
    denied_tool_call: perCheck.map((entry) => entry.denied_tool_call).find((denial) => denial != null) ?? null,
    process_exit_code: perCheck.map((entry) => entry.process_exit_code).find((code) => Number.isInteger(code)) ?? null,
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
