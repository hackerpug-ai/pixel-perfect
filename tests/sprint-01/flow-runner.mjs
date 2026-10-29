// Shared flow runner for the sprint-01 verification flows.
//
// SHARED LANE — T1, T3 and T9 all add to this file. Each block is delimited by its owning
// task. Add a new block; never rewrite a block another task owns.
//
// CLI: node tests/sprint-01/flow-runner.mjs <FLOW_ID> [--repo <owner/name>] [--dispatch]
//                                         [--run latest|<id>] [--out <path>] [--json]

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const ARTIFACT_DIR = path.join(ROOT, ".tmp/sprint-01-verification");
export const WORKFLOW_PATH = ".github/workflows/harness-eval.yml";
export const WORKFLOW_NAME = "harness-eval";

// ---------------------------------------------------------------------------
// [shared] process + artifact IO
// ---------------------------------------------------------------------------

/**
 * Runs a command and returns its outcome instead of throwing, so a flow can record what
 * the outside world actually said.
 *
 * @param {string} command
 * @param {string[]} [args]
 * @param {{ cwd?: string, timeout?: number }} [options]
 * @returns {{ ok: boolean, status: number|null, stdout: string, stderr: string }}
 */
export function runCommand(command, args = [], options = {}) {
  try {
    const stdout = execFileSync(command, args, {
      cwd: options.cwd ?? ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: options.timeout ?? 120_000,
    });
    return { ok: true, status: 0, stdout, stderr: "" };
  } catch (error) {
    return {
      ok: false,
      status: typeof error.status === "number" ? error.status : null,
      stdout: error.stdout?.toString() ?? "",
      stderr: (error.stderr?.toString() ?? String(error.message ?? error)).trim(),
    };
  }
}

function writeJson(file, value) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return file;
}

/** Writes a passing flow artifact. */
export function writeArtifact(file, artifact) {
  return writeJson(path.resolve(ROOT, file), artifact);
}

// No `.red` writer lives here on purpose: a RED proof is only evidence when the gate runner
// captured it (`run_flow.py --expect red`), so this module never authors the file it would be
// graded on. A failing run keeps its own record at `<artifact>.failed.json` instead.

// ---------------------------------------------------------------------------
// [shared] YAML subset reader
// ---------------------------------------------------------------------------

// GitHub Actions workflows use block mappings, block sequences, empty flow collections,
// flow sequences of scalars, quoted scalars and block scalars. That subset is read here so
// the flows can assert the real bytes of a workflow file with no third-party dependency and
// no network call. Anything outside the subset is left as the literal string it parsed as.

function stripComment(text) {
  let quote = null;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quote) {
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === "#" && (index === 0 || /\s/.test(text[index - 1]))) return text.slice(0, index);
  }
  return text;
}

function unquote(text) {
  const trimmed = text.trim();
  if (trimmed.length >= 2 && ((trimmed[0] === '"' && trimmed.at(-1) === '"') || (trimmed[0] === "'" && trimmed.at(-1) === "'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

// Index of the `:` that separates a key from its value, skipping quoted regions.
function keySeparator(text) {
  let quote = null;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quote) {
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === ":" && (index === text.length - 1 || text[index + 1] === " ")) return index;
  }
  return -1;
}

function splitFlow(text) {
  const parts = [];
  let depth = 0;
  let quote = null;
  let current = "";
  for (const char of text) {
    if (quote) {
      current += char;
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      current += char;
      continue;
    }
    if (char === "[" || char === "{") depth += 1;
    if (char === "]" || char === "}") depth -= 1;
    if (char === "," && depth === 0) {
      parts.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  if (current.trim()) parts.push(current);
  return parts;
}

function parseScalar(text) {
  const trimmed = text.trim();
  if (trimmed === "{}") return {};
  if (trimmed === "[]") return [];
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) return splitFlow(trimmed.slice(1, -1)).map(parseScalar);
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    const out = {};
    for (const pair of splitFlow(trimmed.slice(1, -1))) {
      const separator = keySeparator(pair);
      if (separator === -1) continue;
      out[unquote(pair.slice(0, separator))] = parseScalar(pair.slice(separator + 1));
    }
    return out;
  }
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null" || trimmed === "~") return null;
  if (/^-?\d+$/.test(trimmed)) return Number(trimmed);
  return unquote(trimmed);
}

function tokenize(text) {
  return text.split("\n").map((raw) => ({
    raw,
    indent: raw.length - raw.trimStart().length,
    text: raw.trim(),
  }));
}

function nextSignificant(tokens, index) {
  for (let cursor = index; cursor < tokens.length; cursor += 1) {
    if (tokens[cursor].text && !tokens[cursor].text.startsWith("#")) return cursor;
  }
  return -1;
}

function readBlockScalar(tokens, index, parentIndent) {
  const body = [];
  let cursor = index;
  while (cursor < tokens.length && (tokens[cursor].raw.trim() === "" || tokens[cursor].indent > parentIndent)) {
    body.push(tokens[cursor].raw);
    cursor += 1;
  }
  return [body.join("\n").trim(), cursor];
}

function parseMapping(tokens, start, indent) {
  const out = {};
  let cursor = start;
  for (;;) {
    const index = nextSignificant(tokens, cursor);
    if (index === -1) return [out, tokens.length];
    const token = tokens[index];
    if (token.indent !== indent || token.text.startsWith("- ")) return [out, index];
    const separator = keySeparator(token.text);
    if (separator === -1) return [out, index];
    const key = unquote(token.text.slice(0, separator));
    const rest = token.text.slice(separator + 1).trim();
    if (/^[|>][+-]?$/.test(rest)) {
      const [body, next] = readBlockScalar(tokens, index + 1, indent);
      out[key] = body;
      cursor = next;
      continue;
    }
    if (rest !== "") {
      out[key] = parseScalar(rest);
      cursor = index + 1;
      continue;
    }
    const [value, next] = parseNode(tokens, index + 1, indent + 1);
    out[key] = value;
    cursor = next;
  }
}

function parseSequence(tokens, start, indent) {
  const out = [];
  let cursor = start;
  for (;;) {
    const index = nextSignificant(tokens, cursor);
    if (index === -1) return [out, tokens.length];
    const token = tokens[index];
    if (token.indent !== indent || !token.text.startsWith("-")) return [out, index];
    const rest = token.text.slice(1).trim();
    if (rest === "") {
      const [value, next] = parseNode(tokens, index + 1, indent + 1);
      out.push(value);
      cursor = next;
      continue;
    }
    const separator = keySeparator(rest);
    if (separator === -1) {
      out.push(parseScalar(rest));
      cursor = index + 1;
      continue;
    }
    // `- key: value` starts a mapping whose remaining keys sit at the key's own column.
    const keyColumn = indent + (token.text.length - token.text.slice(1).trimStart().length);
    const key = unquote(rest.slice(0, separator));
    const valueText = rest.slice(separator + 1).trim();
    const entry = {};
    let next;
    if (valueText === "") {
      const [value, after] = parseNode(tokens, index + 1, keyColumn + 1);
      entry[key] = value;
      next = after;
    } else {
      entry[key] = parseScalar(valueText);
      next = index + 1;
    }
    const sibling = nextSignificant(tokens, next);
    if (sibling !== -1 && tokens[sibling].indent === keyColumn && !tokens[sibling].text.startsWith("- ")) {
      const [more, after] = parseMapping(tokens, sibling, keyColumn);
      Object.assign(entry, more);
      next = after;
    }
    out.push(entry);
    cursor = next;
  }
}

function parseNode(tokens, start, indent) {
  const index = nextSignificant(tokens, start);
  if (index === -1) return [null, tokens.length];
  if (tokens[index].indent < indent) return [null, index];
  if (tokens[index].text.startsWith("- ")) return parseSequence(tokens, index, tokens[index].indent);
  return parseMapping(tokens, index, tokens[index].indent);
}

/**
 * Parses the YAML subset GitHub Actions workflows use.
 *
 * @param {string} text
 * @returns {Record<string, unknown>}
 */
export function parseYaml(text) {
  const [value] = parseNode(tokenize(text), 0, 0);
  return value ?? {};
}

// ---------------------------------------------------------------------------
// [shared] reading the harness-eval workflow
// ---------------------------------------------------------------------------

/** Reads the harness-eval workflow off disk. Throws the real reason it is unreadable. */
export function readWorkflow(relativePath = WORKFLOW_PATH) {
  const absolute = path.join(ROOT, relativePath);
  if (!existsSync(absolute)) {
    throw new Error(`${relativePath} does not exist: "could not find any workflows named harness-eval"`);
  }
  const text = readFileSync(absolute, "utf8");
  return { path: relativePath, text, yaml: parseYaml(text) };
}

// ---------------------------------------------------------------------------
// [T1 / FLOW-RUN-02-HAND] declaration inspection
// ---------------------------------------------------------------------------

export const HARNESSES = ["claude-code", "codex", "grok", "opencode", "pi", "cursor"];
export const TRACKS = ["pinned", "newest"];
export const BANNED_TRIGGERS = ["pull_request", "pull_request_target", "workflow_run"];

function stepsOf(job) {
  return Array.isArray(job?.steps) ? job.steps : [];
}

// A step's own text — the surfaces a secret could reach. `env` is excluded here because it is
// the one place a key is allowed; see the placement rule in inspectWorkflowDeclaration.
function stepText(step) {
  return [...Object.values(step?.with ?? {}), step?.run ?? "", step?.name ?? ""].join("\n");
}

const NOOP_BODY = /^(?:true|:|exit 0|echo)$/;

function needsOf(job) {
  const needs = job?.needs;
  if (Array.isArray(needs)) return needs.map(String);
  return needs === undefined || needs === null ? [] : [String(needs)];
}

/**
 * Reads what the workflow DECLARES: its triggers, the dispatch input default, permissions,
 * the matrix shape and the skeleton jobs. Pure: takes the parsed workflow, returns the
 * declared identity plus every declaration-level failure.
 *
 * Nothing here reads a log or an exit code, so no mode or grade can be inferred from text.
 *
 * @param {Record<string, any>} yaml
 */
export function inspectWorkflowDeclaration(yaml) {
  const failures = [];
  const fail = (message) => failures.push(message);

  // `gh workflow list` and `gh workflow run harness-eval` both resolve this name.
  if (yaml?.name !== WORKFLOW_NAME) fail(`workflow name is ${String(yaml?.name)}, expected ${WORKFLOW_NAME}`);

  const triggers = yaml?.on && typeof yaml.on === "object" ? Object.keys(yaml.on) : [];
  for (const banned of BANNED_TRIGGERS) {
    if (triggers.includes(banned)) fail(`banned trigger declared: ${banned}`);
  }
  if (!triggers.includes("workflow_dispatch")) fail(`no workflow_dispatch trigger (declared: ${triggers.join(", ") || "none"})`);

  const input = yaml?.on?.workflow_dispatch?.inputs?.install_mode;
  if (!input) fail("on.workflow_dispatch.inputs.install_mode is missing");
  if (input && input.type !== "choice") fail(`install_mode type is ${input.type}, expected choice`);
  if (input && input.default !== "checkout") fail(`install_mode default is ${String(input.default)}, expected checkout`);
  const options = Array.isArray(input?.options) ? input.options : [];
  for (const required of ["checkout", "published"]) {
    if (!options.includes(required)) fail(`install_mode options missing ${required}`);
  }

  const permissions = yaml?.permissions;
  if (permissions === null || permissions === undefined) fail("workflow-level permissions block is missing");
  else if (typeof permissions !== "object" || Object.keys(permissions).length > 0) {
    fail(`workflow-level permissions is not empty: ${JSON.stringify(permissions)}`);
  }

  if (yaml?.concurrency?.group !== WORKFLOW_NAME) fail(`concurrency group is ${String(yaml?.concurrency?.group)}, expected ${WORKFLOW_NAME}`);
  if (yaml?.concurrency?.["cancel-in-progress"] !== false) fail("concurrency cancel-in-progress must be false");

  const jobs = yaml?.jobs ?? {};
  const smoke = jobs.smoke;
  if (!smoke) fail("jobs.smoke is missing");
  if (smoke?.strategy?.["fail-fast"] !== false) fail("jobs.smoke strategy.fail-fast must be false");
  if (smoke?.environment !== "harness-smoke") fail(`jobs.smoke environment is ${String(smoke?.environment)}, expected harness-smoke`);
  // Every job opts in explicitly and no job ever holds a write scope. A scope named `actions`
  // is allowed at read level only (T8 needs it to read the run's job metadata).
  for (const [name, job] of Object.entries(jobs)) {
    const jobPermissions = job?.permissions;
    if (!jobPermissions || typeof jobPermissions !== "object") {
      fail(`jobs.${name} declares no permissions block`);
      continue;
    }
    for (const [scope, level] of Object.entries(jobPermissions)) {
      if (!["contents", "actions"].includes(scope)) fail(`jobs.${name} requests the unexpected scope ${scope}`);
      if (level !== "read") fail(`jobs.${name} permissions ${scope}: ${String(level)} is not read`);
    }
    if (!("contents" in jobPermissions)) fail(`jobs.${name} permissions is missing contents: read`);
  }
  if (Object.keys(smoke?.permissions ?? {}).some((scope) => scope !== "contents")) {
    fail(`jobs.smoke permissions is ${JSON.stringify(smoke?.permissions)}, expected only contents: read`);
  }

  // Every step must do something: `run: "true"` is not an install, a record or a transfer.
  for (const [name, job] of Object.entries(jobs)) {
    const steps = stepsOf(job);
    if (steps.length === 0) fail(`jobs.${name} has no steps`);
    for (const step of steps) {
      const label = `${name}/${String(step?.name ?? step?.uses ?? "unnamed step")}`;
      if (step?.uses) continue;
      const body = String(step?.run ?? "").trim();
      if (body === "" || NOOP_BODY.test(body)) fail(`step ${label} runs no real command (${JSON.stringify(body)})`);
    }
  }

  // A harness key may only ever sit in a matrix cell's own step `env:` block (T9). Any other
  // surface — a `run:` body, a `with:` input, a step name — is a leak, whatever the step is
  // called, and no non-smoke job may hold one at all.
  for (const [name, job] of Object.entries(jobs)) {
    for (const step of stepsOf(job)) {
      const label = `${name}/${String(step?.name ?? "unnamed step")}`;
      if (/secrets\./.test(stepText(step))) fail(`step ${label} references a secret outside its env block`);
      const envSecrets = JSON.stringify(step?.env ?? {});
      if (/secrets\./.test(envSecrets) && name !== "smoke") fail(`step ${label} binds a secret in a non-smoke job`);
    }
  }

  // The dispatch input must reach the record, not a literal that happens to look like it.
  const recorder = Object.entries(jobs).flatMap(([name, job]) =>
    stepsOf(job).map((step) => ({ job: name, step })),
  ).find(({ step }) => /cell\/cell\.json/.test(String(step?.run ?? "")));
  if (!recorder) fail("no step writes cell/cell.json, so nothing records the cell");
  else {
    const run = String(recorder.step.run);
    if (!run.includes("${{ inputs.install_mode }}")) {
      fail(`step ${recorder.job}/${recorder.step.name} does not interpolate the install_mode input into the record`);
    }
    if (/"install_mode"\s*:\s*"(?:checkout|published)"/.test(run)) {
      fail(`step ${recorder.job}/${recorder.step.name} writes a hardcoded install_mode`);
    }
  }

  // The skeleton chain has to be wired: cells in, cells through, receipt out.
  const needs = {
    download: needsOf(jobs.download),
    grade: needsOf(jobs.grade),
  };
  if (jobs.download && !needs.download.includes("smoke")) fail(`jobs.download needs ${JSON.stringify(needs.download)}, expected smoke`);
  if (jobs.grade && !needs.grade.includes("download")) fail(`jobs.grade needs ${JSON.stringify(needs.grade)}, expected download`);
  for (const [name, required] of [["download", "download-artifact"], ["grade", "download-artifact"], ["grade", "upload-artifact"]]) {
    const used = stepsOf(jobs[name]).some((step) => new RegExp(`actions/${required}`).test(String(step?.uses ?? "")));
    if (!used) fail(`jobs.${name} never uses actions/${required}`);
  }

  const matrix = smoke?.strategy?.matrix ?? {};
  const harnesses = Array.isArray(matrix.harness) ? matrix.harness : [];
  const tracks = Array.isArray(matrix.track) ? matrix.track : [];
  const cells = harnesses.flatMap((harness) => tracks.map((track) => ({ harness, track })));
  if (cells.length !== 12) fail(`matrix declares ${cells.length} cells, expected 12`);
  if (new Set(cells.map((cell) => `${cell.harness}/${cell.track}`)).size !== cells.length) fail("matrix cells are not unique");
  for (const harness of HARNESSES) {
    if (!harnesses.includes(harness)) fail(`matrix is missing harness ${harness}`);
  }
  if (!harnesses.includes("cursor")) fail("matrix is missing cursor");
  for (const track of TRACKS) {
    if (!tracks.includes(track)) fail(`matrix is missing track ${track}`);
  }

  const smokeSteps = stepsOf(smoke);
  const cacheSteps = smokeSteps.filter((step) => /actions\/cache/.test(step?.uses ?? "") || "cache" in (step?.with ?? {}));
  if (cacheSteps.length > 0) fail(`jobs.smoke has a cache step: ${cacheSteps.map((step) => step.name).join(", ")}`);
  if (!smokeSteps.some((step) => /actions\/upload-artifact/.test(step?.uses ?? ""))) fail("jobs.smoke uploads no artifact");

  // The install slot must speak for the cell it runs in, not for one hardcoded harness.
  const installSlot = smokeSteps.find((step) => step?.run && /matrix\.harness/.test(String(step.run)));
  if (!installSlot) fail("jobs.smoke has no step whose command names ${{ matrix.harness }}");

  // A checkout dispatch evaluates the dispatch commit, so the cell must not pin another ref.
  const checkout = smokeSteps.find((step) => /actions\/checkout/.test(step?.uses ?? ""));
  if (!checkout) fail("jobs.smoke has no actions/checkout step");
  if (checkout && "ref" in (checkout.with ?? {})) fail("jobs.smoke checkout pins a ref, so candidate_sha would not be the dispatch commit");
  if (checkout && checkout.with?.["persist-credentials"] !== false) fail("jobs.smoke checkout must set persist-credentials: false");

  for (const skeleton of ["download", "grade"]) {
    const job = jobs[skeleton];
    if (!job) {
      fail(`jobs.${skeleton} skeleton job is missing`);
      continue;
    }
    if (!stepsOf(job).some((step) => /actions\/download-artifact/.test(step?.uses ?? ""))) {
      fail(`jobs.${skeleton} does not fetch artifacts`);
    }
  }

  // Every upload must run on failure and carry this attempt in its physical name.
  const uploads = ["smoke", "download", "grade"]
    .flatMap((name) => stepsOf(jobs[name]).map((step) => ({ job: name, step })))
    .filter(({ step }) => /actions\/upload-artifact/.test(step?.uses ?? ""));
  if (uploads.length === 0) fail("no upload-artifact step anywhere");
  for (const { job, step } of uploads) {
    if (!/always\(\)/.test(String(step.if ?? ""))) fail(`${job} upload "${step.name}" does not use if: always()`);
    const name = String(step.with?.name ?? "");
    if (!name.includes("github.run_id") || !name.includes("github.run_attempt")) {
      fail(`${job} upload "${step.name}" is not attempt-qualified: ${name}`);
    }
  }

  return {
    triggers,
    event: triggers.includes("workflow_dispatch") && triggers.length === 1 ? "workflow_dispatch" : null,
    install_mode: input?.default ?? null,
    install_mode_options: options,
    install_mode_source: "declared default of on.workflow_dispatch.inputs.install_mode",
    permissions,
    concurrency: yaml?.concurrency ?? null,
    jobs: Object.keys(jobs),
    harnesses,
    tracks,
    cells,
    failures,
  };
}

// ---------------------------------------------------------------------------
// [T1 / FLOW-RUN-02-HAND] the flow
// ---------------------------------------------------------------------------

const DISPATCH_BAN =
  "dispatching is allowed only from main (.spec/e2e-policy/sprint-01/dispatch-allowed.json forbids a non-main ref), " +
  "so this branch proves the workflow declaration and the hosted dispatch is replayed at the sprint gate";

/** `gh workflow run harness-eval` — the one write surface this flow may use. */
export function dispatchWorkflow({ repo, inputs = {}, ref } = {}) {
  const args = ["workflow", "run", WORKFLOW_NAME, "--repo", repo];
  if (ref) args.push("--ref", ref);
  for (const [key, value] of Object.entries(inputs)) args.push("-f", `${key}=${value}`);
  return runCommand("gh", args);
}

/**
 * Can a live dispatch happen at all? `gh workflow run` only resolves a workflow registered on
 * the repo's default branch, so this is the honest test of whether the declaration tier is
 * still the best proof available.
 */
export function probeLiveDispatch({ repo } = {}) {
  const result = runCommand("gh", ["api", `repos/${repo}/actions/workflows/${WORKFLOW_NAME}.yml`, "--silent"]);
  if (result.ok) return { available: true, detail: `${WORKFLOW_NAME}.yml is registered on the default branch of ${repo}` };
  return { available: false, detail: (result.stderr || `gh api exited ${result.status}`).trim().split("\n").at(-1) };
}

/** One run record, read from GitHub rather than from a log. */
export function readRun({ repo, runId }) {
  const result = runCommand("gh", [
    "run",
    "view",
    String(runId),
    "--repo",
    repo,
    "--json",
    "databaseId,event,headSha,status,conclusion,attempt",
  ]);
  if (!result.ok) return { ok: false, reason: result.stderr || `gh run view exited ${result.status}` };
  return { ok: true, run: JSON.parse(result.stdout || "{}") };
}

/** The newest run of this workflow, read from GitHub rather than from a log. */
export function latestRun({ repo }) {
  const result = runCommand("gh", [
    "run",
    "list",
    "--repo",
    repo,
    "--workflow",
    WORKFLOW_NAME,
    "--limit",
    "1",
    "--json",
    "databaseId,event,headSha,status,conclusion,attempt",
  ]);
  if (!result.ok) return { ok: false, reason: result.stderr || `gh run list exited ${result.status}` };
  const runs = JSON.parse(result.stdout || "[]");
  if (runs.length === 0) return { ok: false, reason: `no run of ${WORKFLOW_NAME} exists in ${repo}` };
  return { ok: true, run: runs[0] };
}

/** Downloads one attempt-qualified artifact. */
export function downloadArtifact({ repo, runId, name, dir }) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  return runCommand("gh", ["run", "download", String(runId), "--repo", repo, "-n", name, "-D", dir]);
}

/**
 * Which tier can prove this flow? A live dispatch wins whenever one is possible — once
 * `harness-eval.yml` is registered on the default branch the declaration is no longer evidence,
 * which is what makes the T2/T8 deferral expire instead of surviving as a green shape gate.
 */
export function chooseProofTier({ dispatch = false, run = null, available = false } = {}) {
  return dispatch || run || available ? "live-dispatch" : "workflow-declaration";
}

async function run02Hand(options = {}) {
  const repo = options.repo ?? "hackerpug-ai/pixel-perfect";
  // The probe is injected only by the negative control that proves the deferral expires;
  // every real run asks GitHub.
  const probe = options.probe ?? probeLiveDispatch;
  const artifact = {
    flow: "FLOW-RUN-02-HAND",
    uc_ref: "UC-RUN-02",
    generated_at: new Date().toISOString(),
    workflow_path: WORKFLOW_PATH,
    repo,
    proof_tier: null,
    ac1_satisfied: false,
    identity: null,
    declaration: null,
    live_dispatch: { attempted: false, available: null, probe: null, reason: DISPATCH_BAN },
    awaiting_hosted_run: [],
    failures: [],
  };

  let workflow;
  try {
    workflow = readWorkflow();
  } catch (error) {
    artifact.proof_tier = "none";
    artifact.failures.push(error.message);
    return { ok: false, ...artifact };
  }

  const declaration = inspectWorkflowDeclaration(workflow.yaml);
  artifact.declaration = declaration;
  artifact.failures.push(...declaration.failures);

  const live = probe({ repo });
  artifact.live_dispatch.available = live.available;
  artifact.live_dispatch.probe = live.detail;

  const identity = {
    event: declaration.event,
    install_mode: declaration.install_mode,
    install_mode_source: declaration.install_mode_source,
    candidate_sha: null,
    candidate_sha_source: "awaiting a hosted dispatch: the dispatch commit is not knowable from this branch",
    harnesses: [...declaration.harnesses].sort(),
    cell_count: declaration.cells.length,
  };

  // Tier A — live: the flow performs the hand start itself (or replays one). This is the only
  // tier that can report AC-1 met, and it is the tier that takes over automatically as soon as
  // harness-eval.yml is registered on the default branch — which is how the T2/T8 deferral
  // expires instead of staying green forever.
  const tier = chooseProofTier({ dispatch: Boolean(options.dispatch), run: options.run, available: live.available });
  if (tier === "live-dispatch") {
    artifact.proof_tier = tier;
    artifact.live_dispatch.attempted = true;
    let run = null;
    if (options.run) {
      artifact.live_dispatch.mode = "replay";
      const replay = readRun({ repo, runId: options.run });
      if (!replay.ok) artifact.failures.push(`run ${options.run} is unreadable: ${replay.reason}`);
      else run = replay.run;
    } else {
      // `--dispatch` demands that the graded commit is this checkout; without it the flow still
      // starts the grade (UC-RUN-02) but grades whatever the default branch holds.
      artifact.live_dispatch.mode = options.dispatch ? "dispatch" : "auto";
      const head = runCommand("git", ["rev-parse", "HEAD"]);
      const localHead = head.ok ? head.stdout.trim() : null;
      const dispatch = dispatchWorkflow({ repo, inputs: options.inputs ?? {} });
      artifact.live_dispatch.local_head = localHead;
      artifact.live_dispatch.accepted = dispatch.ok;
      artifact.live_dispatch.message = dispatch.ok
        ? dispatch.stdout.trim()
        : dispatch.stderr || `gh exited ${dispatch.status}`;
      if (!dispatch.ok) artifact.failures.push(`dispatch rejected: ${artifact.live_dispatch.message}`);
      else {
        const latest = latestRun({ repo });
        if (!latest.ok) artifact.failures.push(`dispatch produced no readable run: ${latest.reason}`);
        else run = latest.run;
      }
      if (options.dispatch) artifact.live_dispatch.dispatch_commit = localHead;
    }
    if (run) {
      artifact.live_dispatch.run = run;
      identity.event = run.event;
      identity.candidate_sha = run.headSha;
      identity.candidate_sha_source = `GitHub run record ${run.databaseId} headSha`;
      if (run.event !== "workflow_dispatch") artifact.failures.push(`run event is ${run.event}, expected workflow_dispatch`);
      if (!/^[0-9a-f]{40}$/.test(String(run.headSha ?? ""))) artifact.failures.push(`run headSha ${String(run.headSha)} is not a commit sha`);
      if (options.dispatch && artifact.live_dispatch.dispatch_commit && run.headSha !== artifact.live_dispatch.dispatch_commit) {
        artifact.failures.push(`run headSha ${run.headSha} does not equal the dispatch commit ${artifact.live_dispatch.dispatch_commit}`);
      }
    }
  } else {
    // Tier B — the declaration, honest only while a live dispatch is impossible, and it never
    // claims AC-1: ac1_satisfied stays false until a hosted run supplies candidate_sha.
    artifact.proof_tier = tier;
    artifact.live_dispatch.mode = "none";
    artifact.awaiting_hosted_run = [
      "run.event == workflow_dispatch",
      "the run's artifact records install_mode == checkout for a no-input dispatch",
      "run.headSha == the dispatch commit (candidate_sha)",
      "twelve cells run on a hosted runner",
    ];
  }

  identity.cells = declaration.cells;
  artifact.identity = identity;
  if (declaration.event !== "workflow_dispatch") artifact.failures.push(`event is ${String(declaration.event)}, expected workflow_dispatch`);
  if (declaration.install_mode !== "checkout") artifact.failures.push(`install_mode default is ${String(declaration.install_mode)}, expected checkout`);
  for (const harness of HARNESSES) {
    if (!identity.harnesses.includes(harness)) artifact.failures.push(`identity is missing harness ${harness}`);
  }
  if (artifact.proof_tier !== "live-dispatch" && identity.candidate_sha !== null) {
    artifact.failures.push("candidate_sha was asserted without a hosted dispatch");
  }
  artifact.ac1_satisfied = artifact.proof_tier === "live-dispatch" && identity.candidate_sha !== null && artifact.failures.length === 0;

  return { ok: artifact.failures.length === 0, ...artifact };
}

// ---------------------------------------------------------------------------
// [shared] flow registry + CLI
// ---------------------------------------------------------------------------

export const FLOWS = {
  "FLOW-RUN-02-HAND": { artifact: ".tmp/sprint-01-verification/run-02-hand.json", run: run02Hand },
};

/** Runs one flow and writes its artifact (or, on failure, its own `.failed.json` record).
 * The flow's declared `.red` path belongs to the gate runner alone — never to this module. */
export async function runFlow(flowId, options = {}) {
  const flow = FLOWS[flowId];
  if (!flow) throw new Error(`unknown flow ${flowId}; known: ${Object.keys(FLOWS).join(", ")}`);
  const artifact = await flow.run(options);
  const out = options.out ?? flow.artifact;
  if (artifact.ok) writeArtifact(out, artifact);
  else writeJson(path.resolve(ROOT, `${out}.failed.json`), artifact);
  return artifact;
}

function parseArgs(argv) {
  const options = { repo: undefined, out: undefined, dispatch: false, run: undefined, json: false };
  const rest = [];
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dispatch") options.dispatch = true;
    else if (arg === "--json") options.json = true;
    else if (arg === "--repo") options.repo = argv[++index];
    else if (arg === "--out") options.out = argv[++index];
    else if (arg === "--run") options.run = argv[++index];
    else rest.push(arg);
  }
  options.flowId = rest[0];
  return options;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const options = parseArgs(process.argv.slice(2));
  if (!options.flowId) {
    process.stderr.write("usage: node tests/sprint-01/flow-runner.mjs <FLOW_ID> [--repo R] [--dispatch|--run ID] [--out PATH]\n");
    process.exitCode = 2;
  } else {
    const artifact = await runFlow(options.flowId, options);
    if (options.json) process.stdout.write(`${JSON.stringify(artifact, null, 2)}\n`);
    else {
      process.stdout.write(`${options.flowId} ${artifact.ok ? "ok" : "RED"} (${artifact.proof_tier})\n`);
      for (const failure of artifact.failures ?? []) process.stdout.write(`- ${failure}\n`);
    }
    process.exitCode = artifact.ok ? 0 : 1;
  }
}
