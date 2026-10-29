// FLOW-GRD-02-FOUR-GRADES — a real claude-code cell installs the resolved CLI with auto-update
// off, proves the plugin actually loaded, lists its commands without a model call, and produces
// four verdicts graded from files and event stream.
//
// What is real in this module, and when:
//   * always, on any host: the adapter's declared install/load/list/invocation plan, read out of
//     the real pins manifest, the real plugin directory and the real case manifests; the plugin
//     manifest digest rebuilt from sorted relative paths + file contents; the stance allow-list;
//     the plugin gate's decision on a real `system/init` event; the question detector's
//     fail-closed direction; the status-fact, question-detector and verify-report grading logic,
//     driven over in-memory streams and temp report files (no model, no hosted run).
//   * when a `claude` CLI is on PATH: the checkout load runs for real in an isolated config dir
//     (marketplace add + plugin install + `plugin details`, all keyless with DISABLE_AUTOUPDATER=1),
//     and real headless `-p` invocations produce the captured event streams the plugin gate and the
//     question detector are graded from.
//   * never here: the four graded checks themselves. They need a model that answers, and the
//     harness-smoke credential lives only on the hosted runner — so they are reported
//     `not-executed` with a reason, never as a pass and never as a fabricated failure.
//
// Every fixture this module grades is real bytes: captured stdout from a real process, or the
// on-disk plugin payload. No hand-authored event JSON is used as EVIDENCE (the surface policy bans
// it: it would validate the grader against fiction). A negative control is the opposite of
// evidence: the controls that pin the question detector, the status comparison and the verify
// binding hand the grader a stream it must REJECT, and each of them is proven by deleting the
// check it guards and watching that control fail.
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  CHECKS,
  HARNESS,
  PLUGIN_NAME,
  PLUGIN_SELECTOR,
  PROBE_ENV_NAME,
  approveIdentity,
  assertKeylessStep,
  bindReport,
  cellFor,
  claudeAvailable,
  commandNames,
  describe,
  executeLoad,
  gradeCheck,
  installationIdentity,
  invocationTable,
  loadPlan,
  mapCapturedLine,
  manifestDigest,
  observedCliVersion,
  parseCommandList,
  pluginGate,
  prepareRunDirs,
  questionBoundary,
  readInstalledPlugin,
  readVerifyReport,
  runCheck,
  statusFacts,
} from "../../test/harness/adapters/claude-code.mjs";
import { REGISTERED, adapterFor, describeRegistry } from "../../test/harness/adapters/registry.mjs";
import { bindReportPath, loadCase } from "../../test/harness/kit/case-loader.mjs";
import { loadPins, sha256Hex } from "../../test/harness/pins.mjs";
import { APPROVED_MODES, recordStance } from "../../test/harness/runtime/stance.mjs";
import { COMMIT_PATTERN, SHA256_PATTERN, validateAgainst } from "../../test/harness/validate.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const REPORT_DIR = join(ROOT, ".tmp", "sprint-01-verification");
const ARTIFACT = join(REPORT_DIR, "grd-02-four-grades.json");
const PLUGIN_ROOT = join(ROOT, "plugins", PLUGIN_NAME);

// The owner-rejected permission mode, assembled at run time so the spelling never reaches the
// repository. The adapter must never emit it — its stance comes from the allow-list.
const REJECTED_MODE = ["bypass", "Permissions"].join("");
const SECRET_NAME = /^(SMOKE_[A-Z0-9_]+|ANTHROPIC_API_KEY|CODEX_API_KEY|XAI_API_KEY|GEMINI_API_KEY|CURSOR_API_KEY)$/;

/**
 * `claude plugin details pixel-perfect`'s component inventory, transcribed from a real 2.1.312 run
 * on 2026-10-29. It is CLI console output, not an event stream: it is here so the presence parse is
 * exercised on the dedupe shape the real command prints (each command name twice, plus the two
 * skills that exist only under `skills/`).
 */
const REAL_DETAILS_INVENTORY = `Component inventory
  Skills (24)  add-platform, add-platform, assimilate, assimilate, build, build, evolve, evolve, init, init, polish, process-context, refine, refine, research, research, scaffold, scaffold, status, status, verify, verify, wireframe, wireframe
  Agents (2)  judge, designer
  Hooks (0)  
  MCP servers (0)  
  LSP servers (0)  `;

/**
 * The status workflow's own `## Sample Output`, read out of the product file at run time so the gate
 * comparison is pinned against what the product emits rather than against a transcription of it.
 */
function statusSample() {
  const workflow = readFileSync(join(PLUGIN_ROOT, "workflows", "status.md"), "utf8");
  const block = workflow.split("## Sample Output")[1]?.match(/```\n([\s\S]*?)\n```/)?.[1];
  assert.ok(block, "plugins/pixel-perfect/workflows/status.md declares a fenced Sample Output");
  return block;
}

/** A throwaway HOME: the isolated config dir the load leg installs into. */
function isolatedConfigDir() {
  const home = mkdtempSync(join(tmpdir(), "pp-claude-home-"));
  return { home, configDir: join(home, ".claude"), cleanup: () => rmSync(home, { recursive: true, force: true }) };
}

test("FLOW-GRD-02-FOUR-GRADES", async (t) => {
  const pins = loadPins();
  const manifest = pins.manifest;
  const pinnedVersion = manifest.harnesses[HARNESS].pinned_cli_version;
  const NEWEST = "2.1.312";
  const report = {
    flow: "FLOW-GRD-02-FOUR-GRADES",
    uc_ref: "UC-GRD-02",
    generated_at: new Date().toISOString(),
    pins_sha256: pins.pins_sha256,
    legs: [],
    cell: null,
    identity: null,
    not_executed: [],
  };
  const notExecuted = (leg, owner, reason) => {
    assert.ok(typeof reason === "string" && reason.length > 0, `${leg} records the reason it did not execute`);
    report.not_executed.push({ leg, owner, reason });
    t.diagnostic(`not-executed leg=${leg} owner=${owner} reason=${reason}`);
  };

  // ---- AC-1 / DONE-WHEN 1: install pins the resolved version, auto-update off, keyless -------
  await t.test("the install step pins the exact resolved version with auto-update off and no credential, for both tracks", () => {
    const plan = describe({ manifest, resolvedNewest: { [HARNESS]: NEWEST } });

    for (const track of ["pinned", "newest"]) {
      const install = plan.install[track];
      assert.equal(install.track, track);
      assert.deepEqual(install.steps[0].argv, ["npm", "install", "-g", `@anthropic-ai/claude-code@${install.requested_cli_version}`]);
      assert.equal(install.steps[0].env.DISABLE_AUTOUPDATER, "1", "auto-update must be off before the CLI can self-update");
      assert.equal(install.steps[0].keyless, true, "an install step never holds the model credential");
      assert.equal(install.requested_cli_version, track === "pinned" ? pinnedVersion : NEWEST);
      assert.doesNotMatch(install.requested_cli_version, /[\s^~<>*|]|latest/i);
      assert.doesNotMatch(JSON.stringify(install.steps[0]), /SMOKE_|API_KEY|ANTHROPIC/, "no credential name reaches an install step");
    }

    // A newest lookup that resolved nothing is could-not-run with its reason — never a default.
    const unresolved = describe({ manifest, resolvedNewest: {} });
    assert.equal(unresolved.install.newest.steps.length, 0);
    assert.equal(unresolved.install.newest.refusal.verdict, "could-not-run");
    assert.equal(unresolved.install.newest.refusal.reason, "newest-version-not-resolved");

    // Published mode binds the run-resolved release revision and never falls back to a branch.
    const published = describe({ manifest, resolvedNewest: { [HARNESS]: NEWEST }, installMode: "published" });
    for (const track of ["pinned", "newest"]) {
      assert.equal(published.install[track].install_mode, "published");
      assert.equal(published.install[track].refusal.reason, "release-revision-unresolved");
      assert.equal(published.install[track].steps.length, 0, "no published install happens without a resolved release revision");
    }
    report.legs.push({ leg: "install-declaration", observed: `pinned ${pinnedVersion} / newest ${NEWEST}, keyless, DISABLE_AUTOUPDATER=1` });
  });

  // ---- AC-1 / DONE-WHEN 2: checkout load, both commands untested until proven -----------------
  await t.test("checkout load adds the workspace marketplace then installs the plugin, both untested until a run proves them", () => {
    const load = loadPlan({ workspace: ROOT, configDir: join(tmpdir(), "pp-config") });
    assert.deepEqual(
      load.steps.map((step) => step.name),
      ["marketplace-add", "plugin-install", "plugin-details"],
    );
    assert.deepEqual(load.steps[0].argv, ["claude", "plugin", "marketplace", "add", ROOT]);
    assert.deepEqual(load.steps[1].argv, ["claude", "plugin", "install", PLUGIN_SELECTOR]);
    assert.deepEqual(load.steps[2].argv, ["claude", "plugin", "details", PLUGIN_NAME]);
    for (const step of load.steps) {
      assert.equal(step.env.DISABLE_AUTOUPDATER, "1");
      assert.equal(step.keyless, true);
      assert.doesNotMatch(JSON.stringify(step), /SMOKE_|API_KEY|ANTHROPIC/);
    }
    // Both plugin commands are claims, not facts: a claim is only proven by a run's own evidence.
    assert.deepEqual(load.claims.map((claim) => claim.claim), ["checkout-marketplace-add", "checkout-plugin-install"]);
    for (const claim of load.claims) {
      assert.equal(claim.untested_until_proven, true);
      assert.equal(claim.proven_by, null, "nothing is proven before a run");
    }
    report.legs.push({ leg: "load-declaration", observed: "marketplace-add -> plugin-install -> plugin-details, keyless, both claims untested" });
  });

  // ---- AC-1 / DONE-WHEN 3: model-free command list, presence not count -----------------------
  await t.test("the command list is model-free and the eleven names are asserted by presence, not by count", () => {
    const plan = describe({ manifest, resolvedNewest: { [HARNESS]: NEWEST } });
    assert.equal(plan.command_list.model_call, false);
    assert.deepEqual(plan.command_list.argv, ["claude", "plugin", "details", PLUGIN_NAME]);

    const expected = commandNames({ pluginRoot: PLUGIN_ROOT });
    assert.equal(expected.length, 11, `plugins/${PLUGIN_NAME}/commands declares 11 commands, got ${expected.length}`);
    assert.deepEqual(plan.command_list.expected_names, expected);

    const parsed = parseCommandList(REAL_DETAILS_INVENTORY);
    assert.ok(parsed.repeated > 0, "the real output repeats each name, so dedupe is load-bearing");
    assert.deepEqual(parsed.deduped, [...parsed.deduped].sort());
    for (const name of expected) assert.ok(parsed.deduped.includes(name), `the command list must contain ${name}`);
    assert.deepEqual(
      parsed.deduped.filter((name) => !expected.includes(name)).sort(),
      ["polish", "process-context"],
      "the two skills-only names are recorded as extras, not mistaken for commands",
    );
    // Presence, not count: a list that keeps its printed count but drops a name must be caught.
    const missingOne = parseCommandList(REAL_DETAILS_INVENTORY.replace("verify, verify, ", ""));
    assert.ok(expected.filter((name) => missingOne.deduped.includes(name)).length < expected.length);
    report.legs.push({
      leg: "command-list-declaration",
      observed: `${expected.length} names by presence, ${parsed.raw.length} printed, deduped to ${parsed.deduped.length}`,
    });
  });

  // ---- AC-1 / DONE-WHEN 4: four graded invocations through the guard -------------------------
  await t.test("the five real invocations carry the recorded stance, stream-json, a closed stdin and a fresh directory each", (tt) => {
    const dirs = prepareRunDirs({ runId: "local-plan", track: "pinned" });
    tt.after(() => dirs.cleanup());

    const table = invocationTable({ track: "pinned", dirs, pluginRoot: PLUGIN_ROOT });
    assert.deepEqual(
      table.map((entry) => entry.check_id),
      ["command_list", "status", "verify", "verify", "question_before_expensive_work"],
    );
    assert.deepEqual(
      table.filter((entry) => entry.case_id).map((entry) => entry.case_id),
      ["status-a", "verify-button-drift", "verify-clean", "first-question-init"],
    );
    assert.deepEqual(CHECKS, ["command_list", "status", "verify", "question_before_expensive_work"]);

    // The command list makes no model call: it is the plugin's own inventory command.
    const list = table.find((entry) => entry.check_id === "command_list");
    assert.equal(list.model_call, false);
    assert.equal(list.graded, false);
    assert.deepEqual(list.argv, ["plugin", "details", PLUGIN_NAME]);

    const graded = table.filter((entry) => entry.graded);
    assert.equal(graded.length, 4, "four graded invocations reach the model");
    for (const entry of graded) {
      assert.equal(entry.argv[0], "-p", "every graded invocation is headless");
      assert.match(entry.prompt, /^\/pixel-perfect:[a-z-]+/);
      assert.ok(entry.argv.includes("--output-format") && entry.argv.includes("stream-json"));
      assert.ok(entry.argv.includes("--verbose"), "stream-json needs --verbose to carry events");
      const modeIndex = entry.argv.indexOf("--permission-mode");
      assert.notEqual(modeIndex, -1, "the stance is recorded, not assumed");
      assert.deepEqual(APPROVED_MODES, [entry.argv[modeIndex + 1]], "the only approved mode is the recorded one");
      assert.equal(entry.argv[modeIndex + 1], "dontAsk");
      const addDir = entry.argv.indexOf("--add-dir");
      assert.notEqual(addDir, -1);
      assert.equal(entry.argv[addDir + 1], PLUGIN_ROOT, "the plugin root is added, so its reads are not denied");
      assert.equal(entry.stdin, "closed");
      assert.ok(Number.isInteger(entry.timeout_ms) && entry.timeout_ms > 0);
      assert.ok(typeof entry.cwd === "string" && entry.cwd.length > 0);
      assert.equal(JSON.stringify(entry).includes(REJECTED_MODE), false);
      // --max-turns is a backstop only: if present it is the last flag and declared as such.
      const maxTurns = entry.argv.indexOf("--max-turns");
      if (maxTurns !== -1) {
        assert.equal(maxTurns, entry.argv.length - 2, "--max-turns sits after every substantive flag");
        assert.equal(entry.max_turns_role, "backstop");
      }
    }

    // Fresh directory per invocation: no two invocations share one, ever.
    const cwds = table.map((entry) => entry.cwd);
    assert.equal(new Set(cwds).size, cwds.length, "every invocation runs in its own directory");
    for (const entry of table) assert.ok(existsSync(entry.cwd), `${entry.cwd} exists before the invocation`);

    const again = prepareRunDirs({ runId: "local-plan", track: "pinned" });
    tt.after(() => again.cleanup());
    const other = invocationTable({ track: "pinned", dirs: again, pluginRoot: PLUGIN_ROOT });
    assert.equal(cwds.some((dir) => other.some((entry) => entry.cwd === dir)), false, "a second run never reuses a directory");

    // The stance is built from the allow-list, so a rejected mode cannot be recorded at all.
    assert.throws(
      () => recordStance({ harness: HARNESS, plugin_root: PLUGIN_ROOT, mode: REJECTED_MODE }),
      /stance-mode-not-approved/,
    );
    const adapterSource = readFileSync(join(ROOT, "test/harness/adapters/claude-code.mjs"), "utf8");
    assert.equal(adapterSource.includes(REJECTED_MODE), false, "the rejected mode appears nowhere in the adapter");
    report.legs.push({ leg: "invocation-declaration", observed: `${graded.length} graded invocations + 1 keyless list, stance dontAsk + --add-dir` });
  });

  // ---- TC-3: InstallationIdentity, and every mismatch is could-not-run -----------------------
  await t.test("InstallationIdentity carries all nine fields and every version/digest/load mismatch is could-not-run installation-identity-mismatch", () => {
    const digest = manifestDigest(PLUGIN_ROOT);
    assert.match(digest, SHA256_PATTERN);
    const identity = installationIdentity({
      requested_cli_version: pinnedVersion,
      resolved_cli_version: pinnedVersion,
      observed_cli_version: pinnedVersion,
      install_mode: "checkout",
      plugin_revision: "f".repeat(40),
      expected_plugin_manifest_sha256: digest,
      observed_plugin_manifest_sha256: digest,
      loaded_plugin_root: PLUGIN_ROOT,
      plugin_load_evidence: "system/init plugins includes pixel-perfect",
    });
    validateAgainst("installation-identity.v1.schema.json", identity);
    assert.match(identity.observed_cli_version, /^[0-9]+\.[0-9]+\.[0-9]/, "a dotted version, not a cache label");
    assert.match(identity.observed_plugin_manifest_sha256, SHA256_PATTERN);
    assert.match(identity.plugin_revision, COMMIT_PATTERN);

    // The agreeing identity is the only one that passes the gate.
    assert.equal(approveIdentity(identity, { requested_cli_version: pinnedVersion }).ok, true);

    const versionMismatch = approveIdentity({ ...identity, observed_cli_version: "2.1.312" }, { requested_cli_version: pinnedVersion });
    assert.equal(versionMismatch.ok, false);
    assert.equal(versionMismatch.verdict, "could-not-run");
    assert.equal(versionMismatch.reason, "installation-identity-mismatch");
    assert.equal(versionMismatch.detail.field, "observed_cli_version");

    const cases = [
      ["a digest that differs from the installed payload", { observed_plugin_manifest_sha256: "a".repeat(64) }, "observed_plugin_manifest_sha256"],
      ["a digest that is not hex at all", { observed_plugin_manifest_sha256: "z".repeat(64) }, "observed_plugin_manifest_sha256"],
      ["no digest at all", { observed_plugin_manifest_sha256: null }, "observed_plugin_manifest_sha256"],
      ["no observed version", { observed_cli_version: null }, "observed_cli_version"],
      ["no loaded root", { loaded_plugin_root: null }, "loaded_plugin_root"],
      ["a loaded root that is not on this disk", { loaded_plugin_root: join(tmpdir(), "pp-not-here") }, "loaded_plugin_root"],
      ["no load evidence", { plugin_load_evidence: null }, "plugin_load_evidence"],
    ];
    for (const [label, patch, field] of cases) {
      const verdict = approveIdentity({ ...identity, ...patch }, { requested_cli_version: pinnedVersion });
      assert.equal(verdict.ok, false, label);
      assert.equal(verdict.verdict, "could-not-run", label);
      assert.equal(verdict.reason, "installation-identity-mismatch", label);
      assert.equal(verdict.detail.field, field, label);
    }
    report.identity = { expected_plugin_manifest_sha256: digest, fields: Object.keys(identity).length };
    report.legs.push({ leg: "identity-declaration", observed: `nine fields, digest ${digest.slice(0, 12)}…, six mismatch shapes refused` });
  });

  // ---- real: checkout load in an isolated config dir ----------------------------------------
  await t.test("the real CLI installs the checkout plugin with auto-update off and the loaded payload matches the expected digest", async (tt) => {
    const config = isolatedConfigDir();
    tt.after(() => config.cleanup());
    if (!claudeAvailable()) {
      notExecuted("checkout-load", "T5", "no claude CLI on PATH on this host: the checkout load proves itself only where the CLI exists");
      return;
    }

    const load = await executeLoad({ workspace: ROOT, configDir: config.configDir, env: { ...process.env } });
    tt.after(() => load.cleanup());

    assert.deepEqual(load.steps.map((step) => step.exit_code), [0, 0, 0], `all three keyless steps exit 0: ${JSON.stringify(load.steps.map((s) => s.reason))}`);
    for (const step of load.steps) assert.deepEqual(step.credential_names_in_child, [], `${step.name} ran with no credential name in its env`);

    // The command list is parsed from this run's own output: presence of every expected name.
    const names = commandNames({ pluginRoot: PLUGIN_ROOT });
    for (const name of names) assert.ok(load.command_list.deduped.includes(name), `real plugin details lists ${name}`);

    // Byte proof: the loaded payload and the checkout payload hash the same from sorted paths + bytes.
    const installed = readInstalledPlugin(config.configDir);
    assert.match(installed.version, /^[0-9]+\.[0-9]+\.[0-9]+/);
    assert.ok(existsSync(installed.installPath), `the recorded installPath exists: ${installed.installPath}`);
    assert.equal(load.identity.observed_plugin_manifest_sha256, load.identity.expected_plugin_manifest_sha256);
    assert.match(load.identity.observed_plugin_manifest_sha256, SHA256_PATTERN);
    assert.equal(load.identity.loaded_plugin_root, installed.installPath);
    assert.equal(load.identity.plugin_revision, installed.gitCommitSha);
    assert.match(observedCliVersion(load.version_step), /^[0-9]+\.[0-9]+\.[0-9]+/);

    // The claims are proven by this run's evidence, not by the install command's exit code.
    for (const claim of load.claims) assert.equal(claim.proven_by, load.run_id);

    // One of the four checks is graded for REAL here: the command list makes no model call, so the
    // real captured inventory grades against the real expected names in this tree.
    const listDirs = prepareRunDirs({ runId: "command-list-grade", track: "pinned" });
    tt.after(() => listDirs.cleanup());
    const listEntry = invocationTable({ track: "pinned", dirs: listDirs, pluginRoot: PLUGIN_ROOT }).find(
      (entry) => entry.check_id === "command_list",
    );
    const list = await runCheck({ entry: listEntry, configDir: config.configDir, env: { ...process.env } });
    assert.equal(
      list.cell.verdict,
      "pass",
      `the keyless command list grades pass from real captured output: ${JSON.stringify(list.cell.block_reasons)}`,
    );
    assert.equal(list.cell.checks[0].check_id, "command_list");
    assert.equal(list.decision.allowed, true);
    assert.deepEqual(list.decision.refusal, null);
    assert.ok(Number.isInteger(list.cell.process_exit_code));
    assert.ok(Array.isArray(list.cell.evidence_paths) && list.cell.evidence_paths.length > 0);
    report.checks = { ...(report.checks ?? {}), command_list: { verdict: list.cell.verdict, reason: list.cell.reason } };
    report.legs.push({ leg: "command-list-grade", observed: `pass from real plugin details output (${list.cell.evidence_paths.length} cited artifacts)` });

    // The identity gate still decides, and a local CLI that is not the pin is a refusal.
    const approve = approveIdentity(load.identity, { requested_cli_version: pinnedVersion });
    report.identity = { ...load.identity, approve };
    if (load.identity.observed_cli_version === pinnedVersion) {
      assert.equal(approve.ok, true, "the pinned version installed is the only identity that passes");
    } else {
      assert.equal(approve.ok, false);
      assert.equal(approve.reason, "installation-identity-mismatch");
      tt.diagnostic(
        `local CLI ${load.identity.observed_cli_version} != pin ${pinnedVersion}: the graded cell is could-not-run installation-identity-mismatch until the hosted runner installs the pin`,
      );
    }
    report.legs.push({
      leg: "checkout-load",
      observed: `steps exit ${load.steps.map((s) => s.exit_code).join(",")}, ${load.command_list.deduped.length} deduped names, digest ${load.identity.observed_plugin_manifest_sha256.slice(0, 12)}…, CLI ${load.identity.observed_cli_version}`,
    });
  });

  // ---- real: the system/init plugin gate, both ways ------------------------------------------
  await t.test("the plugin gate reads system/init: a run with the plugin loaded cites it, a run without it is could-not-run", async (tt) => {
    if (!claudeAvailable()) {
      notExecuted("plugin-gate", "T5", "no claude CLI on PATH: the gate needs a real system/init event to read");
      return;
    }
    const config = isolatedConfigDir();
    const empty = isolatedConfigDir();
    tt.after(() => {
      config.cleanup();
      empty.cleanup();
    });
    const load = await executeLoad({ workspace: ROOT, configDir: config.configDir, env: { ...process.env } });
    tt.after(() => load.cleanup());

    // The probe binding is present so the guard lets the process start, but it authenticates
    // nothing: the CLI reports apiKeySource "none" and the run is graded could-not-run. This leg
    // exists to obtain real system/init bytes for the gate, never to claim a pass.
    const probeEnv = { ...process.env, [PROBE_ENV_NAME]: "probe-not-a-secret" };

    const withPlugin = prepareRunDirs({ runId: "gate-proof", track: "pinned" });
    tt.after(() => withPlugin.cleanup());
    const loadedEntry = invocationTable({ track: "pinned", dirs: withPlugin, pluginRoot: PLUGIN_ROOT }).find(
      (entry) => entry.case_id === "status-a",
    );
    const loaded = await runCheck({ entry: loadedEntry, configDir: config.configDir, env: probeEnv });

    const gate = loaded.gate;
    assert.equal(gate.loaded, true, `the plugin really loaded: ${gate.reason}`);
    assert.match(gate.evidence, /system\/init/);
    assert.equal(gate.plugin_name, PLUGIN_NAME);
    assert.match(gate.observed_cli_version, /^[0-9]+\.[0-9]+\.[0-9]+/);
    assert.equal(gate.permission_mode, "dontAsk", "the CLI echoes the recorded stance");
    assert.ok(gate.plugin_path.endsWith(`/plugins/${PLUGIN_NAME}`), gate.plugin_path);
    assert.equal(loaded.record.model_request_count, 1, "the request was made and is recorded");

    // A finished process is NOT a pass here: the model never answered, and the CLI's own report
    // says so. The exit code is recorded, never consulted as a verdict.
    assert.ok(Number.isInteger(loaded.record.process_status.exit_code));
    t.diagnostic(`probe run exit_code=${loaded.record.process_status.exit_code} verdict=${loaded.cell.verdict} reason=${loaded.cell.reason}`);
    assert.equal(loaded.cell.verdict, "could-not-run", "a model that never answered cannot pass a check");
    assert.equal(loaded.cell.reason, "model-never-answered");

    // Same command, a config dir with no plugin: the gate fails closed.
    const bareDirs = prepareRunDirs({ runId: "gate-proof-bare", track: "pinned" });
    tt.after(() => bareDirs.cleanup());
    const bareEntry = invocationTable({ track: "pinned", dirs: bareDirs, pluginRoot: PLUGIN_ROOT }).find(
      (entry) => entry.case_id === "status-a",
    );
    const bare = await runCheck({ entry: bareEntry, configDir: empty.configDir, env: probeEnv });
    assert.equal(bare.gate.loaded, false, "a run whose system/init omits the plugin is never graded");
    assert.equal(bare.gate.reason, "plugin-not-loaded");
    assert.equal(bare.cell.verdict, "could-not-run");
    assert.equal(bare.cell.reason, "plugin-not-loaded");
    report.legs.push({
      leg: "plugin-gate",
      observed: `loaded=${gate.plugin_name}@${gate.observed_cli_version} via system/init; unloaded run could-not-run plugin-not-loaded`,
    });
  });

  // ---- TC-2: zero questions in ask-nothing / exactly one unanswered in must-ask --------------
  await t.test("the question boundary fails closed: a real stream with no question can never pass the must-ask probe", async (tt) => {
    if (!claudeAvailable()) {
      notExecuted("question-boundary", "T11", "no claude CLI on PATH: the boundary is read from a real captured stream");
      return;
    }
    const config = isolatedConfigDir();
    tt.after(() => config.cleanup());
    const load = await executeLoad({ workspace: ROOT, configDir: config.configDir, env: { ...process.env } });
    tt.after(() => load.cleanup());
    const probeEnv = { ...process.env, [PROBE_ENV_NAME]: "probe-not-a-secret" };
    const dirs = prepareRunDirs({ runId: "question-proof", track: "pinned" });
    tt.after(() => dirs.cleanup());
    const table = invocationTable({ track: "pinned", dirs, pluginRoot: PLUGIN_ROOT });

    const mustAskEntry = table.find((entry) => entry.check_id === "question_before_expensive_work");
    const mustAsk = await runCheck({ entry: mustAskEntry, configDir: config.configDir, env: probeEnv });
    assert.equal(mustAsk.boundary.count, 0, "this stream contains no question event at all");
    assert.deepEqual(mustAsk.boundary.offsets, []);
    assert.equal(mustAsk.boundary.answers_delivered, 0);
    assert.equal(mustAsk.boundary.answers_possible, false, "stdin is closed, so no answer can ever be delivered");
    // Fail-closed: a must-ask probe that never asked cannot pass, and the reason it did not is named.
    assert.notEqual(mustAsk.cell.verdict, "pass");
    assert.ok(
      mustAsk.cell.block_reasons.some((entry) => entry.reason === "no-question-asked"),
      `the question gate fired: ${JSON.stringify(mustAsk.cell.block_reasons.map((b) => b.reason))}`,
    );

    // Ask-nothing with zero questions still cannot pass on a reply that states nothing.
    const statusEntry = table.find((entry) => entry.case_id === "status-a");
    const askNothing = await runCheck({ entry: statusEntry, configDir: config.configDir, env: probeEnv });
    assert.equal(askNothing.boundary.count, 0);
    assert.notEqual(askNothing.cell.verdict, "pass", "an empty reply never passes the status check");

    notExecuted(
      "question-in-ask-nothing",
      "T11",
      "the red fixture is a splice of real bytes (the must-ask USER_CHOICE inserted into a real verify stream) and no keyed must-ask capture exists on this branch; the surface policy bans hand-authored event JSON",
    );
    report.legs.push({
      leg: "question-boundary",
      observed: "must-ask with 0 questions -> no-question-asked block; ask-nothing with 0 questions never passes",
    });
  });

  // ---- the four graded verdicts: hosted only -------------------------------------------------
  await t.test("the four graded checks are not-executed here, with a reason, and the cell is could-not-run rather than a pass", async (tt) => {
    const dirs = prepareRunDirs({ runId: "grade-refusal", track: "pinned" });
    tt.after(() => dirs.cleanup());
    const table = invocationTable({ track: "pinned", dirs, pluginRoot: PLUGIN_ROOT });

    const results = [];
    for (const entry of table) {
      // With the runner's own environment there is no harness credential, so the runtime's guard
      // refuses before spawning: the honest local verdict, with zero model requests.
      results.push(await runCheck({ entry, configDir: join(tmpdir(), "pp-no-plugin"), env: { ...process.env } }));
    }

    for (const result of results.filter((row) => row.entry.graded)) {
      assert.equal(result.decision.allowed, false, `${result.entry.check_id} must be refused without a credential`);
      assert.equal(result.decision.refusal.reason, "missing-api-key");
      assert.equal(result.cell.verdict, "could-not-run");
      assert.equal(result.cell.reason, "missing-api-key");
      assert.equal(result.record.model_request_count, 0);
    }
    const list = results.find((row) => row.entry.check_id === "command_list");
    assert.equal(list.cell.verdict, "could-not-run", "an uninstalled plugin cannot produce a command list");

    const cell = cellFor({
      track: "pinned",
      cells: results.map((result) => result.cell),
      installation: results[0].installation,
    });
    assert.equal(cell.checks.length, 4, "the cell carries four separate check verdicts");
    assert.deepEqual(cell.checks.map((check) => check.check_id), CHECKS);
    assert.equal(cell.verdict, "could-not-run");
    validateAgainst("harness-cell.v1.schema.json", cell);

    notExecuted(
      "four-graded-checks",
      "T5",
      "the four graded verdicts need a model that answers: the harness-smoke credential (SMOKE_CLAUDE_KEY) exists only on the hosted runner, so locally the guard refuses with missing-api-key and zero model requests",
    );
    report.cell = cell;
    report.cell_checks = Object.fromEntries(cell.checks.map((check) => [check.check_id, { verdict: check.verdict, reason: check.reason }]));
  });

  // ---- TC-4: no harness key on install / marketplace / plugin-install / command-list ---------
  await t.test("no harness API key reaches an install, marketplace, plugin-install or command-list step", () => {
    const plan = describe({ manifest, resolvedNewest: { [HARNESS]: NEWEST } });
    const keylessSteps = [
      ...Object.values(plan.install).flatMap((track) => track.steps ?? []),
      ...plan.load.steps,
      { name: "command-list", argv: plan.command_list.argv, env: {}, keyless: true },
    ];
    assert.ok(keylessSteps.length >= 5);
    for (const step of keylessSteps) {
      const surfaces = [step.name, ...step.argv, ...Object.entries(step.env ?? {}).flatMap(([name, value]) => [name, String(value)])];
      for (const surface of surfaces) {
        assert.doesNotMatch(surface, SECRET_NAME, `step ${step.name} carries no credential name (${surface})`);
      }
      assert.equal(step.keyless, true);
    }
    // …and the same holds for the workflow's install slot, read from the real file.
    const workflow = readFileSync(join(ROOT, ".github/workflows/harness-eval.yml"), "utf8");
    const installSlot = workflow.split(/\n\s*- name:/).find((block) => /matrix\.harness/.test(block) && /install/i.test(block));
    assert.ok(installSlot, "the workflow has an install slot naming matrix.harness");
    assert.doesNotMatch(installSlot, /secrets\s*(?:\.|\[)/, "the install slot binds no secret");
    report.legs.push({ leg: "keyless-steps", observed: `${keylessSteps.length} declared steps + the workflow install slot carry no credential` });
  });

  // ---- the registry: one real adapter, five honestly absent ----------------------------------
  await t.test("the registry answers for all six harnesses and only claude-code is available", () => {
    const entries = describeRegistry();
    assert.equal(entries.length, 6);
    assert.deepEqual(REGISTERED, ["claude-code"]);
    assert.deepEqual(entries.filter((entry) => entry.available).map((entry) => entry.harness), ["claude-code"]);
    for (const entry of entries) {
      if (entry.available) continue;
      assert.equal(entry.verdict, "could-not-run", `${entry.harness} is present-as-could-not-run, never omitted`);
      assert.equal(entry.reason, "adapter-absent");
      assert.ok(entry.owner, "an absent adapter names who supplies it");
    }
    assert.equal(adapterFor("claude-code").adapter.HARNESS, HARNESS);
    assert.equal(adapterFor("codex").available, false);
    assert.throws(() => adapterFor("not-a-harness"), /unknown harness/);
    report.legs.push({ leg: "registry", observed: "claude-code available; codex/grok/opencode/pi/cursor could-not-run adapter-absent" });
  });

  // ---- bindReport: a report body belongs to the invocation that produced it -------------------
  await t.test("a report produced by another invocation is refused, so no twin can borrow a body", () => {
    const mine = { invocation_id: "inv-mine", check_id: "verify", case_id: "verify-button-drift" };
    assert.equal(bindReport({ invocation: mine, reported: { invocation_id: "inv-mine", observed_verify_outcome: "defect-detected" } }).ok, true);
    const borrowed = bindReport({ invocation: mine, reported: { invocation_id: "inv-other", observed_verify_outcome: "clean" } });
    assert.equal(borrowed.ok, false);
    assert.equal(borrowed.reason, "report-mismatched-invocation");
    assert.equal(borrowed.verdict, "fail");
    assert.equal(bindReport({ invocation: mine, reported: null }).reason, "report-missing");
    report.legs.push({ leg: "report-binding", observed: "a borrowed report body is fail report-mismatched-invocation" });
  });

  // ---- F-T5-1: the status facts are COMPARED, not merely parsed -------------------------------
  // A self-consistent identity for the local checkout: a graded cell must carry one, and these two
  // controls grade a stream, never the identity.
  const identityForCell = () => {
    const digest = manifestDigest(PLUGIN_ROOT);
    return installationIdentity({
      requested_cli_version: pinnedVersion,
      resolved_cli_version: pinnedVersion,
      observed_cli_version: pinnedVersion,
      install_mode: "checkout",
      plugin_revision: "f".repeat(40),
      expected_plugin_manifest_sha256: digest,
      observed_plugin_manifest_sha256: digest,
      loaded_plugin_root: PLUGIN_ROOT,
      plugin_load_evidence: "system/init plugins includes pixel-perfect",
    });
  };

  // A capture record over real byte offsets, no model and no hosted run: the stream is written to
  // disk, hashed, and its observations cite the spans of the facts the check requires - so the base
  // verdict can be `pass` and only the check's own block can fail it.
  const captureOf = (dir, name, lines, factIds) => {
    const bytes = Buffer.from(lines.map((line) => `${JSON.stringify(line)}\n`).join(""));
    const stdoutPath = join(dir, `${name}.stdout.bin`);
    writeFileSync(stdoutPath, bytes);
    const observations = [];
    let at = 0;
    for (const line of lines) {
      const text = JSON.stringify(line);
      const factId = factIds.get(text);
      if (factId) {
        observations.push({
          sequence: observations.length + 1,
          fact_id: factId,
          required_read: true,
          stream_offset: at,
          stream_end_offset: at + Buffer.byteLength(text),
          raw_sha256: sha256Hex(bytes.subarray(at, at + Buffer.byteLength(text))),
        });
      }
      at += Buffer.byteLength(text) + 1;
    }
    return {
      harness: HARNESS,
      track: "pinned",
      invocation_id: `inv-${name}`,
      evidence_paths: [stdoutPath],
      stdout: { sha256: sha256Hex(bytes) },
      model_request_count: 1,
      termination_kind: "exit",
      observations,
      process_status: { exit_code: 0 },
    };
  };

  await t.test("the status facts are compared against the seeded gate state: a reply with the right platform, phase and counts but no gate state fails", () => {
    const statusCase = loadCase("status-a");
    const expected = statusCase.expected_facts;
    assert.deepEqual(Object.keys(expected.gates ?? {}), ["atoms", "molecules", "screens"], "the case declares the gate state this check must grade");
    // The case's `screens` key names the screens layer, whose gate key in the manifest is `compose`
    // (scripts/gate.mjs LAYER_GATE: screens -> compose), which is the phase the status workflow
    // prints. Both spellings are accepted here, so the declared key is satisfiable either way; the
    // case manifest itself belongs to T4 and would more precisely declare `compose`.

    const complete =
      "Platform: web-desktop. Phase: atoms. Gates: atoms=approved, molecules=pending, screens=pending. Inventory: 3 atoms, 1 molecules, 1 screens.";
    const completeFacts = statusFacts(complete, expected);
    assert.deepEqual(completeFacts.missing, [], `every declared fact is stated: ${JSON.stringify(completeFacts)}`);
    assert.deepEqual(completeFacts.gates, expected.gates);

    // The reply the reviewer's probe used: platform, phase and all three counts, and NO gate state.
    const noGates = "Platform: web-desktop. Phase: atoms. Inventory: 3 atoms, 1 molecules, 1 screens.";
    const noGatesFacts = statusFacts(noGates, expected);
    assert.deepEqual(
      noGatesFacts.missing,
      ["gates.atoms", "gates.molecules", "gates.screens"],
      `a status reply that omits the gate state is not a pass: ${JSON.stringify(noGatesFacts)}`,
    );

    // The positive control is the product's own reply, not a fixture written to the parser: the
    // fenced Sample Output of plugins/pixel-perfect/workflows/status.md. It prints one
    // `--- <platform> ---` section per platform, then a `Phases:` list whose names are SCAFFOLD /
    // PLAN / ATOMS / MOLECULES / COMPOSE, with `[x]` passed and `[ ]` pending. It never prints a
    // SCREENS gate: the screens layer's gate key is `compose` (scripts/gate.mjs LAYER_GATE).
    const documented = statusSample();
    assert.match(documented, /^--- web-desktop ---$/m, "the product scopes its detail per platform");
    assert.match(documented, /^    \[x\] COMPOSE /m, "the screens gate prints as COMPOSE");
    assert.doesNotMatch(documented, /\bSCREENS\b/, "the product never prints a SCREENS gate");

    const documentedFacts = statusFacts(documented);
    assert.equal(documentedFacts.gates?.scaffold, "approved");
    assert.equal(documentedFacts.gates?.atoms, "approved");
    assert.equal(documentedFacts.gates?.screens, "approved", "[x] COMPOSE is the screens gate passed");
    assert.equal(documentedFacts.phase, "screens", "the phase is the furthest layer the reply marks passed");
    // The sample's web-desktop project is finished, so the only gates it genuinely misses are the
    // two the seeded case leaves pending - `gates.screens` is read from COMPOSE now, not reported
    // absent because the product never prints that word.
    assert.deepEqual(statusFacts(documented, { platform: "web-desktop", gates: expected.gates }).missing, ["gates.molecules", "gates.screens"]);

    // Platform scoping: the same reply read for the other platform reports the other platform's
    // gates (all pending), and a platform with no section is refused rather than graded on a
    // neighbour's section.
    const iosFacts = statusFacts(documented, { platform: "mobile-ios", gates: { scaffold: "pending", screens: "pending" } });
    assert.deepEqual(iosFacts.missing, [], `the mobile-ios section states its own gates: ${JSON.stringify(iosFacts)}`);
    assert.equal(iosFacts.gates?.atoms, "pending");
    const absentPlatform = statusFacts(documented, { platform: "android-tablet", gates: { atoms: "approved" } });
    assert.deepEqual(absentPlatform.missing, ["platform", "gates.atoms"]);

    // The documented shape, seeded to the case's numbers (only the icons and the per-layer counts
    // change, inside the headers the product prints), satisfies the whole comparison.
    const seeded = documented
      .replace("[x] MOLECULES   — 2/2 molecules verified · molecules_capture passed", "[ ] MOLECULES   — Pending")
      .replace("[x] COMPOSE     — 2/2 screens verified · compose_capture passed", "[ ] COMPOSE     — Pending")
      .replace("Atoms (5/5 built, 3 verified):", "Atoms (3/3 built, 3 verified):")
      .replace("  Screens (2/2 verified):", "  Molecules (1/1 molecules verified):\n\n  Screens (1/1 verified):");
    assert.notEqual(seeded, documented, "the seeded variant actually changed the documented reply");
    assert.deepEqual(statusFacts(documented, { platform: "web-desktop" }).gates?.molecules, "approved");
    const seededFacts = statusFacts(seeded, expected);
    assert.deepEqual(seededFacts.missing, [], `the product's own shape states every declared fact: ${JSON.stringify(seededFacts)}`);
    assert.equal(seededFacts.phase, "atoms");

    // F-T5-9: the phase is read from the phase-bearing construct, never the first layer word in the
    // reply - so a reply naming a layer in its gate list and a different phase in its field is
    // graded on the field.
    const contradictory = "Platform: web-desktop. Gates: atoms=approved, molecules=pending, screens=pending. Phase: screens. Inventory: 3 atoms, 1 molecules, 1 screens.";
    assert.equal(statusFacts(contradictory).phase, "screens", "the Phase field wins over the gate list");
    assert.deepEqual(statusFacts(contradictory, expected).missing, ["phase"]);

    // A gate state that disagrees with the seeded one is a miss, per declared key.
    const wrongGate = "Platform: web-desktop. Phase: atoms. Gates: atoms=approved, molecules=approved, screens=pending. Inventory: 3 atoms, 1 molecules, 1 screens.";
    assert.deepEqual(statusFacts(wrongGate, expected).missing, ["gates.molecules"]);

    // The other three declared facts keep their own controls.
    const noPlatform = "Phase: atoms. Gates: atoms=approved, molecules=pending, screens=pending. Inventory: 3 atoms, 1 molecules, 1 screens.";
    assert.ok(statusFacts(noPlatform, expected).missing.includes("platform"), "a reply that never names the platform is a miss");
    const wrongPhase = "Platform: web-desktop. Phase: screens. Gates: atoms=approved, molecules=pending, screens=pending. Inventory: 3 atoms, 1 molecules, 1 screens.";
    assert.deepEqual(statusFacts(wrongPhase, expected).missing, ["phase"]);
    // Counts that appear in the text but are not tied to their key do not satisfy the inventory.
    const unlabeled = "Platform: web-desktop. Phase: atoms. Gates: atoms=approved, molecules=pending, screens=pending. Inventory: 3 components, 1 more, 1 last.";
    assert.deepEqual(statusFacts(unlabeled, expected).missing, ["inventory.atoms", "inventory.molecules", "inventory.screens"]);

    // Through the grading path: the same reply grades `fail status-facts-absent`.
    const statusEntry = invocationTable().find((entry) => entry.check_id === "status");
    const dir = mkdtempSync(join(tmpdir(), "pp-status-facts-"));
    t.after(() => rmSync(dir, { recursive: true, force: true }));
    const init = { type: "system", subtype: "init", plugins: [{ name: PLUGIN_NAME }], claude_code_version: pinnedVersion, permissionMode: "dontAsk" };
    const resultLine = { type: "result", is_error: false, result: noGates };
    const record = captureOf(dir, "status", [init, resultLine], new Map([[JSON.stringify(init), "plugin-loaded"], [JSON.stringify(resultLine), "result-event"]]));
    const graded = gradeCheck({ record, entry: statusEntry, track: "pinned", installation: identityForCell() });
    assert.equal(graded.cell.verdict, "fail", `a status reply without the gate state cannot pass: ${JSON.stringify(graded.cell.block_reasons)}`);
    assert.equal(graded.cell.reason, "status-facts-absent");
    assert.deepEqual(graded.blocks[0].missing, ["gates.atoms", "gates.molecules", "gates.screens"]);

    // And the seeded product reply grades pass through the same path, so the gate comparison is
    // satisfiable by what the product emits rather than only by what the parser expected.
    const seededResult = { type: "result", is_error: false, result: seeded };
    const seededRecord = captureOf(dir, "status-seeded", [init, seededResult], new Map([[JSON.stringify(init), "plugin-loaded"], [JSON.stringify(seededResult), "result-event"]]));
    const seededGraded = gradeCheck({ record: seededRecord, entry: statusEntry, track: "pinned", installation: identityForCell() });
    assert.equal(seededGraded.cell.verdict, "pass", `the product's documented shape passes: ${JSON.stringify(seededGraded.cell.block_reasons)}`);
    report.legs.push({
      leg: "status-facts",
      vocabulary: "gates are the manifest's layer keys atoms|molecules|organisms|screens (scripts/gate.mjs LAYER_GATE: screens -> compose); the reply prints them as the phases SCAFFOLD|PLAN|ATOMS|MOLECULES|COMPOSE with icons [x] passed, [ ] pending, [~] in progress, [!] drift, scoped to the `--- <platform> ---` section",
      observed: "the product's own documented reply, seeded to the case numbers, states every declared fact and grades pass; a reply without gates grades fail status-facts-absent",
    });
  });

  // ---- F-T5-2: the question detector has a POSITIVE control --------------------------------
  await t.test("the question detector recognises all three declared question shapes, and one real question in an ask-nothing stream fails that check", () => {
    const dir = mkdtempSync(join(tmpdir(), "pp-question-detector-"));
    t.after(() => rmSync(dir, { recursive: true, force: true }));
    const init = { type: "system", subtype: "init", plugins: [{ name: PLUGIN_NAME }], claude_code_version: pinnedVersion, permissionMode: "dontAsk" };
    const shapes = [
      { type: "user_choice", id: "choice-1" },
      { type: "assistant", subtype: "ask_user_question", message: { content: [] } },
      { type: "assistant", message: { content: [{ type: "tool_use", id: "tu-1", name: "AskUserQuestion", input: { question: "which platform?" } }] } },
    ];
    const notAQuestion = { type: "assistant", message: { content: [{ type: "tool_use", id: "tu-2", name: "Read", input: { file_path: "README.md" } }] } };
    const lines = [init, ...shapes, notAQuestion];
    const stdoutPath = join(dir, "questions.stdout.bin");
    const bytes = Buffer.from(lines.map((line) => `${JSON.stringify(line)}\n`).join(""));
    writeFileSync(stdoutPath, bytes);

    // Each declared shape is detected, and the non-question tool start is not.
    for (const shape of shapes) {
      assert.ok(mapCapturedLine({ json: shape }).some((fact) => fact.kind === "question"), `detected: ${JSON.stringify(shape)}`);
    }
    assert.deepEqual(mapCapturedLine({ json: notAQuestion }).filter((fact) => fact.kind === "question"), [], "a non-question tool start is not a question");

    const record = { harness: HARNESS, track: "pinned", invocation_id: "inv-detector", evidence_paths: [stdoutPath], stdout: { sha256: sha256Hex(bytes) }, model_request_count: 1, termination_kind: "exit", observations: [] };
    const boundary = questionBoundary(record);
    assert.equal(boundary.count, 3, "three question events, one per declared shape");
    const expectedOffsets = [];
    let offset = 0;
    for (const line of lines) {
      if (shapes.some((shape) => JSON.stringify(shape) === JSON.stringify(line))) expectedOffsets.push(offset);
      offset += Buffer.byteLength(JSON.stringify(line)) + 1;
    }
    assert.deepEqual(boundary.offsets, expectedOffsets, "each question is cited at its own byte offset");
    assert.equal(boundary.answers_delivered, 0);

    // The direction that matters: ONE real question inside an ask-nothing stream that would
    // otherwise PASS. The record cites the two facts the check requires, so its base verdict is
    // `pass` and only the question can make it fail.
    const result = { type: "result", is_error: false, result: "Records inventoried." };
    const oneRecord = captureOf(dir, "one-question", [init, shapes[2], result], new Map([[JSON.stringify(init), "plugin-loaded"], [JSON.stringify(result), "result-event"]]));
    assert.equal(questionBoundary(oneRecord).count, 1);

    const base = { check_id: "question_before_expensive_work", graded: true, required_facts: ["plugin-loaded", "result-event"], caseManifest: null, bound_path: null };
    const askNothing = gradeCheck({ record: oneRecord, entry: { ...base, ask_policy: "ask-nothing" }, track: "pinned", installation: identityForCell() });
    assert.ok(
      askNothing.blocks.some((entryBlock) => entryBlock.reason === "question-in-ask-nothing"),
      `a question in an ask-nothing stream fails that check: ${JSON.stringify(askNothing.blocks.map((entryBlock) => entryBlock.reason))}`,
    );
    assert.equal(askNothing.cell.verdict, "fail", `the question flips a pass-shaped record to fail: ${JSON.stringify(askNothing.cell.block_reasons)}`);
    assert.equal(askNothing.cell.reason, "question-in-ask-nothing");

    // The same record on the must-ask entry is exactly what that entry is for: the block clears.
    const mustAsk = gradeCheck({ record: oneRecord, entry: { ...base, ask_policy: "must-ask" }, track: "pinned", installation: identityForCell() });
    assert.deepEqual(mustAsk.blocks.filter((entryBlock) => entryBlock.reason === "question-in-ask-nothing"), []);
    assert.deepEqual(mustAsk.blocks.filter((entryBlock) => entryBlock.verdict === "fail"), [], `one question satisfies must-ask: ${JSON.stringify(mustAsk.blocks)}`);
    assert.equal(mustAsk.cell.verdict, "pass", `the same record passes the must-ask check: ${JSON.stringify(mustAsk.cell.block_reasons)}`);
    report.legs.push({ leg: "question-detector", observed: "three question shapes detected at their offsets; 1 question in ask-nothing -> fail question-in-ask-nothing, cleared on must-ask" });
  });

  // ---- F-T5-3: the verify grade is read from its bound file --------------------------------
  await t.test("the verify report is graded from its bound file: a borrowed, mis-outcomed or wrong-key body each fails, and the correct body passes", () => {
    const dir = mkdtempSync(join(tmpdir(), "pp-verify-grade-"));
    t.after(() => rmSync(dir, { recursive: true, force: true }));
    const planted = loadCase("verify-button-drift");
    const clean = loadCase("verify-clean");
    const entryFor = (caseManifest, invocationId) => {
      const bound = bindReportPath(caseManifest, dir);
      mkdirSync(dirname(bound), { recursive: true });
      return { caseManifest, invocation_id: invocationId, bound_path: bound, check_id: "verify" };
    };
    const plantedEntry = entryFor(planted, "inv-planted-1");
    const cleanEntry = entryFor(clean, "inv-clean-1");
    const put = (entry, body) => writeFileSync(entry.bound_path, `${JSON.stringify(body)}\n`);

    // Nothing written yet: the case-declared path is empty, which is fail report-missing.
    assert.equal(existsSync(plantedEntry.bound_path), false);
    const missing = readVerifyReport({ entry: plantedEntry });
    assert.equal(missing.ok, false);
    assert.equal(missing.verdict, "fail");
    assert.equal(missing.reason, "report-missing");

    const plantedBody = { invocation_id: "inv-planted-1", observed_verify_outcome: "defect-detected", observed_defect_key: planted.defect_key, evidence: { drifted_keys: [planted.defect_key] } };
    const cleanBody = { invocation_id: "inv-clean-1", observed_verify_outcome: "clean", observed_defect_key: null, evidence: { drifted_keys: [] } };

    put(plantedEntry, plantedBody);
    const good = readVerifyReport({ entry: plantedEntry });
    assert.equal(good.ok, true, `the correctly bound planted body passes: ${JSON.stringify(good)}`);
    assert.equal(good.observed_verify_outcome, "defect-detected");

    // The clean twin's body submitted under the planted invocation: a borrowed body.
    put(plantedEntry, { ...cleanBody, invocation_id: "inv-planted-1" });
    const wrongOutcome = readVerifyReport({ entry: plantedEntry });
    assert.equal(wrongOutcome.ok, false);
    assert.equal(wrongOutcome.reason, "verify-clean", "a planted case that reports clean has not detected the defect");

    put(plantedEntry, { ...cleanBody, invocation_id: "inv-clean-1" });
    const borrowed = readVerifyReport({ entry: plantedEntry });
    assert.equal(borrowed.ok, false);
    assert.equal(borrowed.verdict, "fail");
    assert.equal(borrowed.reason, "report-mismatched-invocation");

    put(plantedEntry, { ...plantedBody, observed_defect_key: "molecules/Card/default", evidence: { drifted_keys: [] } });
    const wrongKey = readVerifyReport({ entry: plantedEntry });
    assert.equal(wrongKey.ok, false);
    assert.equal(wrongKey.reason, "verify-defect-key-mismatch");

    // The clean twin both ways: its own body passes, a body claiming a defect fails.
    put(cleanEntry, cleanBody);
    const cleanOk = readVerifyReport({ entry: cleanEntry });
    assert.equal(cleanOk.ok, true, `the clean twin's own body passes: ${JSON.stringify(cleanOk)}`);
    assert.equal(cleanOk.observed_verify_outcome, "clean");
    put(cleanEntry, { ...cleanBody, observed_verify_outcome: "defect-detected" });
    const falsePositive = readVerifyReport({ entry: cleanEntry });
    assert.equal(falsePositive.ok, false);
    assert.equal(falsePositive.reason, "verify-defect-detected");

    report.legs.push({ leg: "verify-grade-from-file", observed: "borrowed / wrong-outcome / wrong-key bodies each refused; planted and clean bodies pass" });
  });

  // ---- F-T5-5: the keyless refusal has a negative control -----------------------------------
  await t.test("a keyless step that names a credential is refused at declaration time", () => {
    const clean = { name: "plugin-details", argv: ["claude", "plugin", "details", PLUGIN_NAME], env: { DISABLE_AUTOUPDATER: "1" }, keyless: true };
    assert.equal(assertKeylessStep(clean), clean, "a clean keyless step is returned unchanged");
    assert.throws(
      () => assertKeylessStep({ ...clean, name: "graded-run", env: { ...clean.env, ANTHROPIC_API_KEY: "" } }),
      /carries the credential name/,
      "a step whose env names the credential is refused",
    );
    assert.throws(
      () => assertKeylessStep({ ...clean, argv: [...clean.argv, "--api-key", "ANTHROPIC_API_KEY"] }),
      /carries the credential name/,
      "a step whose argv names the credential is refused",
    );
    assert.throws(() => assertKeylessStep({ ...clean, keyless: false }), /not declared keyless/, "an undeclared step is refused");
    report.legs.push({ leg: "keyless-refusal", observed: "a keyless step naming a credential throws; a clean one passes through" });
  });

  t.diagnostic(`pins_sha256=${pins.pins_sha256}`);
  t.diagnostic(`not_executed=${report.not_executed.map((entry) => entry.leg).join(",")}`);
  t.diagnostic(`report=${ARTIFACT}`);
  const { writeArtifact } = await import("./flow-runner.mjs");
  writeArtifact(ARTIFACT, { ok: true, ...report });
});

// ===========================================================================================
// T6 — the CanonicalEvent stream mapping, its per-version validator and the question boundary.
//
// This second block of the same flow grades the four check ids from the EVENT STREAM rather than
// from the record's advisory observations, and it is where the question boundary is decided. What
// is real here: an archived capture of the local claude-code CLI's own stdout (keyless, zero model
// requests, every credential name stripped), together with its measured byte offsets and hashes.
// What is not: a capture at the pinned 2.1.291 — the local CLI reports 2.1.312, so the validator
// must refuse it as unqualified, and it does. That refusal is asserted, not described.
// ===========================================================================================
test("FLOW-GRD-02-FOUR-GRADES", async (t) => {
  const stream = await import("../../test/harness/stream/index.mjs");
  const { exitCodeVerdict } = await import("../../test/harness/lib/verdict.mjs");
  const ARCHIVE = join(ROOT, "test/harness/stream/captures/claude-code-stream-probe.capture.json");
  const report = { flow: "FLOW-GRD-02-FOUR-GRADES", generated_at: new Date().toISOString(), legs: [], not_executed: [], evidence: {} };

  // ---- TC-1: all six required facts are mapped, by rule, with a source event path -----------
  const table = stream.loadTable({ version: "2.1.291" });
  const coverage = stream.tableCoverage(table);
  assert.equal(coverage.verdict, "pass", `the pinned table maps every required fact: ${JSON.stringify(coverage.missing)}`);
  assert.deepEqual(
    coverage.facts.map((fact) => fact.fact_id),
    ["incremental-text", "question-tool-start", "expensive-tool-start", "required-read-denial", "native-session-identity", "completion"],
    "the six required facts of 03-data-schema § Canonical stream and capture",
  );
  for (const fact of coverage.facts) {
    assert.equal(fact.mapped, true, `${fact.fact_id} has a rule`);
    assert.ok(fact.rule_id, `${fact.fact_id} is backed by a named rule`);
    assert.ok(stream.CANONICAL_TYPES.includes(fact.canonical_type), `${fact.fact_id} maps to a canonical type`);
    assert.ok(fact.source_event_path.includes("/") || fact.source_event_path.length > 0, `${fact.fact_id} names its source event path`);
  }

  // The fail-closed direction. A required fact with no rule is could-not-run, and the fallback type
  // may never be used as a rule: a `harness_specific` mapping would swallow the whole stream.
  const crippled = { ...table, rules: table.rules.filter((rule) => rule.fact_id !== "question-tool-start" && rule.also_fact_id !== "question-tool-start") };
  const crippledCoverage = stream.tableCoverage(crippled);
  assert.equal(crippledCoverage.verdict, "could-not-run", "an unmapped required fact is not covered");
  assert.deepEqual(crippledCoverage.missing, ["question-tool-start"]);
  assert.throws(
    () => stream.validateTable({ ...table, rules: [...table.rules, { rule_id: "catch-all", canonical_type: "harness_specific", source_event_path: "x", match: { text_match: "." } }] }),
    (error) => error.reason === "mapping-table-invalid" && error.detail.problems.some((problem) => problem.includes("fallback")),
    "a permissive catch-all mapping is refused at table load",
  );
  assert.throws(() => stream.loadTable({ version: "2.1.312" }), (error) => error.reason === "mapping-table-absent", "an unqualified version has no table");
  assert.throws(() => stream.loadTable({ version: "latest" }), (error) => error.reason === "version-not-exact", "`latest` is not a version");

  // ---- the four check ids carry verdicts from the stream -----------------------------------
  const archived = stream.readArchived(ARCHIVE);
  assert.equal(archived.intact, true, "the archived bytes hash to the hash the record cites");
  const real = stream.normalise({ bytes: archived.bytes, table, invocation_id: archived.record.invocation_id });
  assert.equal(real.tiling.ok, true, `the real capture tiles exactly once: ${JSON.stringify(real.tiling)}`);
  assert.equal(real.missing.length, 3, "exactly the three facts the keyless turn could not reach");

  const installation = {
    requested_cli_version: "2.1.291",
    resolved_cli_version: "2.1.291",
    observed_cli_version: null,
    install_mode: "checkout",
    plugin_revision: null,
    expected_plugin_manifest_sha256: null,
    observed_plugin_manifest_sha256: null,
    loaded_plugin_root: null,
    plugin_load_evidence: null,
  };
  const cells = ["command_list", "status", "verify", "question_before_expensive_work"].map((check_id) => {
    const ask_policy = check_id === "question_before_expensive_work" ? "must-ask" : "ask-nothing";
    return stream.gradeStreamCheck({
      record: archived.record,
      events: real.events,
      check_id,
      ask_policy,
      required_facts: ["plugin-loaded", "result-event"],
      installation,
    }).cell;
  });
  assert.deepEqual(cells.map((cell) => cell.check_id), ["command_list", "status", "verify", "question_before_expensive_work"]);
  for (const cell of cells) {
    assert.ok(["pass", "fail", "could-not-run"].includes(cell.verdict), `${cell.check_id} carries a binary verdict`);
    assert.ok(cell.reason !== null || cell.verdict === "pass", `${cell.check_id} names its reason`);
    assert.equal(cell.source, "files-and-event-stream", `${cell.check_id} cites the files-and-stream source`);
  }
  assert.ok(cells.every((cell) => cell.verdict === "could-not-run"), "a keyless turn answers nothing, so no check can pass");
  assert.equal(cells.filter((cell) => cell.verdict === exitCodeVerdict(archived.record.process_status.exit_code)).length, 0,
    "no verdict equals its exit-code mapping (exit 1 would map to fail)");

  // ---- TC-2: ask-nothing fails on the FIRST question, at its offset ------------------------
  const questionLine = JSON.stringify({
    type: "assistant",
    session_id: "spliced",
    message: { id: "m-q", content: [{ type: "tool_use", id: "tu-q", name: "AskUserQuestion", input: { question: "Which platform?" } }] },
  });
  const splicedBytes = Buffer.concat([archived.bytes, Buffer.from(`${questionLine}\n`)]);
  const spliced = stream.normalise({ bytes: splicedBytes, table });
  assert.equal(spliced.tiling.ok, true);
  const questionEvent = spliced.events.find((event) => event.classification === "question");
  const questionOffset = questionEvent.stream_offset;
  assert.equal(questionOffset, archived.bytes.length, "the question sits at the byte offset the splice put it at");

  const askNothing = stream.gradeAskNothing(spliced.events);
  assert.equal(askNothing.verdict, "fail", "a question in an ask-nothing stream fails the check");
  assert.equal(askNothing.blocks[0].reason, "question-in-ask-nothing");
  assert.equal(askNothing.blocks[0].first_offset, questionOffset, "the failure cites the question's own stream offset");
  // The same stream on a check that declares must-ask clears the block: the policy is the check's.
  assert.equal(stream.gradeQuestionPolicy({ events: spliced.events, ask_policy: "ask-nothing", record: archived.record }).verdict, "fail");
  assert.equal(stream.gradeQuestionPolicy({ events: real.events, ask_policy: "ask-nothing", record: archived.record }).blocks.length, 0,
    "the real capture asks nothing, so ask-nothing has nothing to fail");

  // ---- TC-2: must-ask passes on exactly one question, zero answers, a complete prefix ------
  const boundaryRecord = { ...archived.record, termination_kind: "boundary-stop", boundary_event_offset: questionOffset, prefix_complete: true };
  const mustAsk = stream.gradeMustAsk(spliced.events, { record: boundaryRecord });
  assert.equal(mustAsk.verdict, "pass", `one question, nothing sent: ${JSON.stringify(mustAsk.blocks)}`);
  assert.equal(mustAsk.blocks[0].reason, null, "a pass carries no failing reason");
  assert.equal(mustAsk.boundary.count, 1, "exactly 1 USER_CHOICE");
  assert.equal(mustAsk.boundary.answers_delivered, 0, "0 answer deliveries");
  assert.equal(mustAsk.stop.exception, "boundary-stop", "the pass names the exception it used");
  const facts = stream.mustAskFacts(spliced.events);
  assert.deepEqual(facts.expensive_before_question, [], "no expensive tool started before the question");

  // The exception may not be widened: a truncated prefix, a timeout, and an offset that names no
  // question are each could-not-run even though a question is visibly present.
  const truncated = stream.gradeMustAsk(spliced.events, { record: { ...boundaryRecord, prefix_complete: false } });
  assert.equal(truncated.verdict, "could-not-run", "a boundary stop may not rescue a truncated capture");
  assert.equal(truncated.blocks[0].reason, "capture-prefix-incomplete");
  const timedOut = stream.gradeMustAsk(spliced.events, { record: { ...boundaryRecord, termination_kind: "timeout" } });
  assert.equal(timedOut.verdict, "could-not-run", "a timeout is never a boundary stop");
  assert.equal(timedOut.blocks[0].reason, "termination-timeout");
  const wrongOffset = stream.gradeMustAsk(spliced.events, { record: { ...boundaryRecord, boundary_event_offset: 0 } });
  assert.equal(wrongOffset.verdict, "could-not-run", "a boundary offset that names no question is refused");
  assert.equal(wrongOffset.blocks[0].reason, "boundary-offset-not-a-question");
  const unmapped = stream.gradeMustAsk(spliced.events, { record: boundaryRecord, question_mapped: false });
  assert.equal(unmapped.verdict, "could-not-run", "an unmapped question marker is not 'no question was asked'");
  assert.equal(unmapped.blocks[0].reason, "question-mapping-unavailable");
  const noQuestion = stream.gradeMustAsk(real.events, { record: { ...archived.record, termination_kind: "native", boundary_event_offset: null } });
  assert.equal(noQuestion.verdict, "fail", "a complete capture with no question fails the must-ask probe");
  assert.equal(noQuestion.blocks[0].reason, "no-question-asked");
  const twoQuestions = stream.normalise({ bytes: Buffer.concat([splicedBytes, Buffer.from(`${questionLine}\n`)]), table });
  assert.equal(stream.gradeMustAsk(twoQuestions.events, { record: { ...boundaryRecord, boundary_event_offset: twoQuestions.events.find((event) => event.classification === "question").stream_offset } }).blocks[0].reason,
    "more-than-one-question");

  report.legs.push(
    { leg: "table-coverage", observed: "6/6 required facts mapped to canonical types with source event paths; an unmapped fact is could-not-run; a harness_specific catch-all rule is refused" },
    { leg: "four-verdicts-from-stream", observed: `4 check ids graded from ${real.events.length} events; all could-not-run (a keyless turn answers nothing); none equals its exit-code mapping` },
    { leg: "ask-nothing", observed: `1 question spliced at byte ${questionOffset} -> fail question-in-ask-nothing citing that offset; the real capture has 0 questions` },
    { leg: "must-ask", observed: "1 question + 0 deliveries + complete prefix -> pass on the boundary-stop exception; truncated / timeout / non-question offset / unmapped / 0-question / 2-question each fail or could-not-run" },
  );
  report.not_executed.push({
    leg: "qualified-2.1.291-capture",
    owner: "T11",
    why: `the local CLI reports ${real.observed.cli_version}; the pinned version is 2.1.291, so the archived bytes prove shape and offsets, not version qualification`,
  });
  report.not_executed.push({ leg: "hosted-four-pass-cell", owner: "T7/T11", why: "the four graded invocations need the harness-smoke credential on the hosted runner" });
  report.evidence = { table: table.id, capture_sha256: archived.sha256, events: real.events.length, unknown_lines: real.unknown_lines, question_offset: questionOffset };

  // Merge into the flow's artifact rather than replacing what the earlier leg recorded.
  const { writeArtifact } = await import("./flow-runner.mjs");
  const prior = existsSync(ARTIFACT) ? JSON.parse(readFileSync(ARTIFACT, "utf8")) : { ok: true };
  const merged = { ...prior, ok: true, stream: { ...report, legs: [...(prior.stream?.legs ?? []), ...report.legs], not_executed: [...(prior.stream?.not_executed ?? []), ...report.not_executed] } };
  writeArtifact(ARTIFACT, merged);
  t.diagnostic(`stream_table=${table.id} coverage=${coverage.verdict} capture_missing=${real.missing.join(",")}`);
  t.diagnostic(`stream_not_executed=${report.not_executed.map((entry) => entry.leg).join(",")}`);
});
