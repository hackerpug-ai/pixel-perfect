// T16 — declare the graded surface to the invocation, so `status` and `verify` grade what the
// product really produced.
//
// Two defects, one cause: both checks grade an expectation the invocation never received.
//   (a) `status` graded the case's `expected_facts` while the prompt asked only for
//       `/pixel-perfect:status --platform web-desktop` — run 41157270388 read
//       `fail status-facts-absent` with seven missing facts.
//   (b) `verify` graded a report at the case-declared path bound to a minted invocation id while
//       the prompt named neither — the same run read `fail report-missing` twice.
// The fix is one seam per defect and one rule: declare the surface, never the value. The stance
// change is the third piece: `--permission-mode dontAsk` denies the write the prompt now asks for,
// so the case-declared report path is allow-listed — path-scoped, derived from the case manifest,
// and every other denial unchanged.
//
// What is REAL in this file:
//   * the real adapter module (table, prompts, mapper, `gradeCheck`, `readVerifyReport`),
//   * the real stance module, the real capture reader and the real `mapCapturedLine`,
//   * the product's own documented `status` output, read out of `workflows/status.md` and seeded to
//     the case's numbers by the same transform grd-02 applies,
//   * the product's own `scripts/verify-catalog.mjs --check --json`, run for real in a materialized
//     kit project, whose `drifted` list is what the report body is built from,
//   * the recorded 12-cell artifact of run 41157270388 through its tracked cell projection under
//     `test/harness/smoke/fixtures/dispatched-run/`, which records the artifact's sha256 — read
//     unconditionally, so the shape assertions are alive in a clean checkout.
//
// What is NOT here, and is said plainly: no model call. No harness-smoke binding exists on this
// host, so no guarded `claude -p` can run and no capture of a real status/verify invocation can be
// recorded. The status fixture is therefore a DOCUMENTED-OUTPUT fixture — the product's own sample
// reply in the CLI's stream-json envelope — labelled `recorded: false` in its provenance file, and
// this file's first assertion proves the reply still derives from `workflows/status.md` byte for
// byte. The four `pass` verdicts of a dispatched run are the sprint gate's receipt, not this file's.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import * as adapter from "../../test/harness/adapters/claude-code.mjs";
import { loadCase } from "../../test/harness/kit/case-loader.mjs";
import { loadPins, sha256Hex } from "../../test/harness/pins.mjs";
import { createCapture } from "../../test/harness/runtime/capture.mjs";
import * as stance from "../../test/harness/runtime/stance.mjs";
import { sandbox } from "./flow-runner.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const PLUGIN_ROOT = join(ROOT, "plugins", adapter.PLUGIN_NAME);
const FIXTURE_DIR = join(ROOT, "test/harness/smoke/fixtures/status-reply");
const PINNED = loadPins().manifest.harnesses[adapter.HARNESS].pinned_cli_version;

/**
 * The tracked projection of the 12-cell result artifact of the run this task repairs. The artifact
 * itself lives under the git-ignored `.kb-run-sprint/`, so a copy of it is never in a clean
 * checkout; the projection is committed and read unconditionally, with the artifact's sha256
 * recorded in it. The cell assertions therefore run everywhere, and a re-recorded run whose cells
 * changed fails here rather than being skipped.
 */
const RECORDED_CELLS_PATH = join(ROOT, "test/harness/smoke/fixtures/dispatched-run/run-41157270388.cells.json");

function recordedRunProjection() {
  const projection = JSON.parse(readFileSync(RECORDED_CELLS_PATH, "utf8"));
  assert.equal(projection.schema, "dispatched-run-cells/v1", "the projection declares its own schema");
  assert.equal(projection.result_schema, "harness-eval-result/v1", "it projects a harness-eval result artifact");
  assert.match(projection.run_id, /^\d+$/, "it names the run it projects");
  assert.match(projection.head_sha, /^[0-9a-f]{40}$/, "it names the head the run evaluated");
  assert.match(projection.artifact.sha256, /^[0-9a-f]{64}$/, "it records the artifact's sha256");
  assert.ok(
    Array.isArray(projection.cells) && projection.cells.length > 0,
    "the projection carries the run's cells, not an empty list a shape assertion could pass on",
  );
  return projection;
}

const cellsOf = (artifact) => artifact.cells.map((cell) => ({ harness: cell.harness, track: cell.track, reason: cell.reason ?? null }));

/**
 * The archived reply with the facts it declares removed: the `Phases:` block, the phase lines and
 * the per-layer headers. What remains is the same reply text with nothing to read the graded facts
 * from, so the only thing that can grade it `pass` is a parser that was loosened to pass anything.
 */
function stripDeclaredFacts(reply) {
  return reply
    .split("\n")
    .filter(
      (line) =>
        !/^\s*Phases:\s*$/.test(line) &&
        !/^\s*\[[x ~!]\]\s*(SCAFFOLD|PLAN|ATOMS|MOLECULES|COMPOSE)\b/.test(line) &&
        !/^\s*(Atoms|Molecules|Screens)\s*\(/.test(line),
    )
    .join("\n");
}

/**
 * The product's own documented `status` reply, seeded to the numbers case `status-a` declares.
 * The transform is the one grd-02:711-722 already feeds the real parser: only the icons and the
 * per-layer counts change, inside the headers the product itself prints.
 */
function documentedStatusReply() {
  const workflow = readFileSync(join(PLUGIN_ROOT, "workflows", "status.md"), "utf8");
  const documented = workflow.split("## Sample Output")[1]?.match(/```\n([\s\S]*?)\n```/)?.[1];
  assert.ok(documented, "plugins/pixel-perfect/workflows/status.md declares a fenced Sample Output");
  return documented
    .replace("[x] MOLECULES   — 2/2 molecules verified · molecules_capture passed", "[ ] MOLECULES   — Pending")
    .replace("[x] COMPOSE     — 2/2 screens verified · compose_capture passed", "[ ] COMPOSE     — Pending")
    .replace("Atoms (5/5 built, 3 verified):", "Atoms (3/3 built, 3 verified):")
    .replace("  Screens (2/2 verified):", "  Molecules (1/1 molecules verified):\n\n  Screens (1/1 verified):");
}

/** The archived status fixture bytes plus its provenance. A tampered fixture refuses to load. */
function statusFixture() {
  const bytes = readFileSync(join(FIXTURE_DIR, "claude-code-status-a.documented-output.stdout.bin"));
  const provenance = JSON.parse(
    readFileSync(join(FIXTURE_DIR, "claude-code-status-a.documented-output.provenance.json"), "utf8"),
  );
  assert.equal(sha256Hex(bytes), provenance.stdout_sha256, "the archived status bytes are the bytes the provenance cites");
  return { bytes, provenance };
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
 * One invocation's capture over bytes, through the real capture reader and the real mapper, so the
 * verdict below is the adapter's own reading of a stream rather than a value this file supplies.
 */
function replayedRecord({ dir, bytes, entry }) {
  const capture = createCapture({
    harness: adapter.HARNESS,
    check_id: entry.check_id,
    cwd: entry.cwd ?? null,
    timeout_ms: entry.timeout_ms,
    argv: entry.argv,
    invocation_id: entry.invocation_id,
  });
  capture.append(bytes);
  capture.observe((json, line) => adapter.mapCapturedLine({ json, text: line.text, entry }), { required_read_paths: null });
  capture.finish({ exit_code: 0, signal: null, timed_out: false, spawn_error: null });
  return capture.persist(dir);
}

/** A one-line stream-json result event carrying a reply (and, optionally, the CLI's denials). */
function resultStream({ reply, permission_denials = [] }) {
  const init = {
    type: "system",
    subtype: "init",
    plugins: [{ name: adapter.PLUGIN_NAME, path: "plugins/pixel-perfect", source: "pixel-perfect@pixel-perfect" }],
    claude_code_version: PINNED,
    permissionMode: "dontAsk",
  };
  const result = { type: "result", subtype: "success", is_error: false, terminal_reason: "end_turn", permission_denials, result: reply };
  return Buffer.from(`${JSON.stringify(init)}\n${JSON.stringify(result)}\n`, "utf8");
}

/**
 * Runs the product's own catalog check in a materialized project. This is the oracle: the exit code
 * and the `drifted` keys are the product's output, never this file's opinion.
 */
function runCatalogCheck(cwd) {
  const script = join(PLUGIN_ROOT, "scripts", "verify-catalog.mjs");
  let stdout;
  let status = 0;
  try {
    stdout = execFileSync(process.execPath, [script, "--check", ".", "--platform", "web-desktop", "--json"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch (error) {
    stdout = error.stdout;
    status = typeof error.status === "number" ? error.status : -1;
  }
  const report = JSON.parse(stdout);
  assert.equal(report.exit, status, "the catalog check's JSON exit and its process exit agree");
  return report;
}

/**
 * The report body `VERIFY_REPORT_CONTRACT` and the rendered prompt ask the invocation for. Every
 * observed field is read out of the catalog check's own output; the invocation id is the one the
 * adapter minted for this entry.
 */
function reportBodyFor({ report, caseManifest, invocationId }) {
  const driftedKeys = (report.drifted ?? []).map((drifted) => drifted.key);
  return {
    schema: "verify-report/v1",
    harness: adapter.HARNESS,
    track: caseManifest.track,
    invocation_id: invocationId,
    case_id: caseManifest.case_id,
    observed_verify_outcome: driftedKeys.length > 0 ? "defect-detected" : "clean",
    observed_defect_key: driftedKeys[0] ?? null,
    expected_defect_key: caseManifest.defect_key ?? null,
    evidence: { drifted_keys: driftedKeys },
    clean_project_failed: report.exit !== 0,
  };
}

/**
 * Stands in for the invocation: writes the body at the path the case declares. The adapter holds no
 * writer (TC-4 asserts that), so this is the only place a report is produced in this file.
 */
function writeReportAsInvocation(boundPath, body) {
  mkdirSync(dirname(boundPath), { recursive: true });
  writeFileSync(boundPath, `${JSON.stringify(body, null, 2)}\n`, "utf8");
  return boundPath;
}

// ---------------------------------------------------------------------------
// TC-1 — the status surface is declared, derived from the case, and carries no value
// ---------------------------------------------------------------------------

test("t16-status-surface-declared", () => {
  assert.ok(adapter.STATUS_SURFACE, "the adapter declares STATUS_SURFACE");
  assert.equal(adapter.STATUS_SURFACE.applies_to, "status");
  assert.equal(typeof adapter.statusSurfacePrompt, "function", "the adapter renders the status surface");

  const statusA = loadCase("status-a");
  const prompt = adapter.promptFor({ command_name: "status", caseManifest: statusA });

  // The slash command and its declared arguments stay first: the declaration is appended.
  assert.ok(
    prompt.startsWith("/pixel-perfect:status --platform web-desktop"),
    `the invocation is still the product's own command: ${prompt.slice(0, 120)}`,
  );

  // Every fact the case declares is named by its key, in the keys the case actually uses.
  for (const field of ["platform", "phase"]) {
    assert.ok(prompt.includes(field), `the surface names ${field}`);
  }
  for (const layer of Object.keys(statusA.expected_facts.gates)) {
    assert.ok(prompt.includes(`gates.${layer}`), `the surface names gates.${layer}`);
  }
  for (const layer of Object.keys(statusA.expected_facts.inventory)) {
    assert.ok(prompt.includes(`inventory.${layer}`), `the surface names inventory.${layer}`);
  }

  // No declared VALUE reaches the prompt: not a gate word, not a built/total pair.
  assert.doesNotMatch(prompt, /approved|pending/i, "the prompt states no gate value");
  assert.doesNotMatch(prompt, /\b\d+\s*\/\s*\d+\b/, "the prompt states no built/total pair");

  // The same keys with different declared values render the same surface: status-a and status-b
  // differ only in `gates.atoms` (approved vs pending), so an identical surface proves the render
  // reads keys and not values.
  const statusB = loadCase("status-b");
  assert.notDeepEqual(statusA.expected_facts.gates, statusB.expected_facts.gates, "the two cases really do declare different values");
  assert.equal(
    adapter.statusSurfacePrompt({ caseManifest: statusA }),
    adapter.statusSurfacePrompt({ caseManifest: statusB }),
    "the rendered surface is a function of the declared keys, never of their values",
  );

  // A case that declares a different key set is described without an adapter edit, and a declared
  // count never appears in the text.
  const synthetic = {
    ...statusA,
    case_id: "status-synthetic",
    expected_facts: { platform: "web-desktop", phase: "plan", gates: { plan: "pending" }, inventory: { organisms: 7 } },
  };
  const rendered = adapter.statusSurfacePrompt({ caseManifest: synthetic });
  assert.ok(rendered.includes("gates.plan"), "a case's own gate key is rendered");
  assert.ok(rendered.includes("inventory.organisms"), "a case's own inventory key is rendered");
  assert.equal(rendered.includes("gates.atoms"), false, "a key the case does not declare is not rendered");
  assert.doesNotMatch(rendered, /\b7\b/, "the declared count is not rendered");

  // A case that declares no facts is told nothing, and the must-ask case's prompt is untouched.
  assert.equal(adapter.statusSurfacePrompt({ caseManifest: { ...statusA, expected_facts: null } }), "");
  assert.equal(adapter.statusSurfacePrompt({ caseManifest: loadCase("first-question-init") }), "");
  // T18 deliberately opens the promise this pair used to pin: the question probe's prompt is now the
  // command PLUS the one declared question surface, so it still begins with the command and is no
  // longer the bare 22-character command the boundary was first measured on.
  const questionPrompt = adapter.promptFor({ command_name: "init", caseManifest: loadCase("first-question-init") });
  assert.ok(questionPrompt.startsWith("/pixel-perfect:init"), "the question probe's prompt still begins with the command");
  assert.notEqual(questionPrompt, "/pixel-perfect:init", "the question probe's prompt is no longer the bare command alone");
});

// ---------------------------------------------------------------------------
// TC-2 — each verify invocation is told its own path and its own id, and no expected value
// ---------------------------------------------------------------------------

test("t16-verify-report-declared", (t) => {
  assert.ok(adapter.VERIFY_REPORT_CONTRACT, "the adapter declares VERIFY_REPORT_CONTRACT");
  assert.equal(adapter.VERIFY_REPORT_CONTRACT.schema, "verify-report/v1");
  assert.equal(typeof adapter.verifyReportPrompt, "function", "the adapter renders the verify surface");

  const pair = adapter.prepareVerifyPair({ runId: "t16-tc2" });
  t.after(() => pair.cleanup());

  const planted = pair.planted.entry;
  const clean = pair.clean.entry;
  assert.equal(planted.caseManifest.report_relative_path, "reports/verify-button-drift.json");
  assert.equal(clean.caseManifest.report_relative_path, "reports/verify-clean.json");

  for (const [slot, entry, expectedPath, otherPath] of [
    ["planted", planted, "reports/verify-button-drift.json", "reports/verify-clean.json"],
    ["clean", clean, "reports/verify-clean.json", "reports/verify-button-drift.json"],
  ]) {
    const prompt = entry.prompt;
    assert.ok(prompt.startsWith("/pixel-perfect:verify --platform web-desktop"), `${slot}: the command stays first`);
    assert.ok(prompt.includes(expectedPath), `${slot}: the prompt names its own report path`);
    assert.equal(prompt.includes(otherPath), false, `${slot}: the prompt names no other case's report path`);
    assert.ok(prompt.includes(entry.invocation_id), `${slot}: the prompt echoes the id the adapter minted`);
    assert.ok(prompt.includes(entry.caseManifest.case_id), `${slot}: the prompt names the case id`);
    for (const field of adapter.VERIFY_REPORT_CONTRACT.fields) {
      assert.ok(prompt.includes(field), `${slot}: the prompt declares the field ${field}`);
    }
    // No expected value: not the planted key, not a digest, not a byte offset.
    assert.doesNotMatch(prompt, /atoms\/Button\/default/, `${slot}: the prompt never states the defect key`);
    assert.doesNotMatch(prompt, /[0-9a-f]{64}/, `${slot}: the prompt carries no 64-hex digest`);
    assert.doesNotMatch(prompt, /offset/i, `${slot}: the prompt carries no byte offset`);
  }

  assert.notEqual(planted.invocation_id, clean.invocation_id, "the two verify entries carry different ids");
  assert.notEqual(planted.prompt, clean.prompt, "the two verify prompts are not the same text");
  assert.equal(planted.bound_path, join(planted.cwd, "reports/verify-button-drift.json"));
  assert.equal(clean.bound_path, join(clean.cwd, "reports/verify-clean.json"));

  // A case with no declared report path, or another kind, is told nothing.
  assert.equal(adapter.verifyReportPrompt({ caseManifest: { ...planted.caseManifest, report_relative_path: null }, invocationId: "x" }), "");
  assert.equal(adapter.verifyReportPrompt({ caseManifest: loadCase("status-a"), invocationId: "x" }), "");

  // The allow-list that lets the report be written is path-scoped: exactly one rule, exactly the
  // declared path, and nothing wider can be recorded at all.
  assert.deepEqual(planted.stance.allowed_writes, ["Edit(reports/verify-button-drift.json)"]);
  assert.deepEqual(clean.stance.allowed_writes, ["Edit(reports/verify-clean.json)"]);
  assert.equal(planted.argv.includes("--allowedTools"), true, "the invocation's own argv carries the rule");
  const allowedTools = planted.argv[planted.argv.indexOf("--allowedTools") + 1];
  assert.ok(allowedTools.includes("reports/verify-button-drift.json"));
  // `--allowedTools` splits its value on commas, so one path must stay one rule: a path carrying a
  // comma would arrive as two, one of them a rule nobody declared.
  assert.equal(allowedTools.split(",").length, 1, `one declared path is one rule: ${allowedTools}`);
  assert.equal(allowedTools.split("Edit(").length - 1, 1, "and the value carries exactly one rule");
  for (const wider of [
    "reports/**",
    "/tmp/reports/verify-button-drift.json",
    "reports/",
    "reports/../escape.json",
    "reports/*.json",
    // The three forms that widen without a wildcard, an absolute path or a `..`:
    ".", // the invocation's whole working directory
    "reports", // a directory, not a file: no extension, no leaf
    "reports/verify-button-drift.json,reports/verify-clean.json", // two rules once `--allowedTools` splits
  ]) {
    assert.throws(
      () => stance.recordStance({ harness: adapter.HARNESS, plugin_root: PLUGIN_ROOT, writes: [wider] }),
      /write-allow-path/,
      `the stance refuses to record ${JSON.stringify(wider)}`,
    );
    assert.throws(() => stance.writeAllowRule(wider), /write-allow-path/, `no rule can be minted for ${JSON.stringify(wider)}`);
  }
  // A case that declares no report path gets no rule, so its argv is unchanged.
  const question = adapter.invocationTable().find((entry) => entry.case_id === "first-question-init");
  assert.deepEqual(question.stance.allowed_writes, [], "the question probe is not given a write rule");
});

// ---------------------------------------------------------------------------
// AC-1 — the status check grades a reply the invocation was asked to produce
// ---------------------------------------------------------------------------

test("t16-status-grades-real-reply", (t) => {
  const { bytes, provenance } = statusFixture();
  assert.equal(provenance.recorded, false, "the fixture declares itself a documented-output fixture, not a recorded run");
  assert.equal(provenance.seed_method, "documented_output");

  // The fixture is the product's documented shape, proved by re-deriving it from the workflow file.
  const lines = bytes.toString("utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line));
  assert.deepEqual(lines.map((line) => line.type), ["system", "result"]);
  const reply = lines[1].result;
  assert.equal(reply, documentedStatusReply(), "the archived reply is the product's documented output, seeded to the case numbers");
  assert.ok(lines[0].plugins.some((plugin) => plugin.name === adapter.PLUGIN_NAME), "the init event loads the plugin");

  const dirs = adapter.prepareRunDirs({ runId: "t16-ac1", track: "pinned" });
  t.after(() => dirs.cleanup());
  const entry = adapter.invocationTable({ track: "pinned", dirs, pluginRoot: PLUGIN_ROOT }).find((row) => row.check_id === "status");

  // The invocation that produced this stream was ASKED for this surface: the prompt it ran carries
  // it. Without that, a good reply has no visible cause — the defect this task repairs is exactly
  // that the reply graded today was never asked for the fields it is graded on.
  const askedFor = entry.argv[entry.argv.indexOf("-p") + 1];
  assert.ok(askedFor.includes("gates.atoms"), `the status invocation is asked for gates.atoms: ${askedFor.slice(0, 160)}`);
  assert.ok(askedFor.includes("inventory.screens"), "the status invocation is asked for inventory.screens");
  assert.doesNotMatch(askedFor, /approved|pending/i, "and it is asked for the keys, never the values");

  const record = replayedRecord({ dir: join(sandbox(t, "t16-ac1-record-"), "captures"), bytes, entry });
  const graded = adapter.gradeCheck({ record, entry, track: "pinned", installation: identityForCell() });

  // The reply states the surface the prompt asked for, and the real parser agrees.
  assert.match(reply, /Phase: atoms|\[x\] ATOMS/, "the reply states the phase it was asked for");
  assert.match(reply, /^\s*\[x\] ATOMS\b/m, "the reply prints the ATOMS phase line with the product's icon");
  for (const header of [/^\s*Atoms \(3\/3 built/m, /^\s*Molecules \(1\/1/m, /^\s*Screens \(1\/1/m]) {
    assert.match(reply, header, `the reply prints the per-layer header ${header}`);
  }

  const facts = adapter.statusFacts(reply, entry.caseManifest.expected_facts);
  assert.deepEqual(facts.missing, [], `the reply states every declared fact: ${JSON.stringify(facts)}`);

  assert.equal(graded.cell.verdict, "pass", `the status check grades the reply pass: ${JSON.stringify(graded.blocks)}`);
  assert.equal(graded.cell.reason, null);
  assert.equal(graded.cell.block_reasons.length, 1);
  assert.equal(graded.cell.block_reasons[0].verdict, "pass");
  assert.equal(graded.cell.observed_verify_outcome, null);

  // The pass above is only evidence if the same reader can refuse: the identical bytes with the
  // declared facts removed are graded again, through the same entry, the same reader and the same
  // reporter. A `statusFacts` that answered `missing: []` for every reply would still satisfy the
  // pass assertions, so this half is what makes AC-1 causal on the parser rather than on the prompt.
  const strippedReply = stripDeclaredFacts(reply);
  assert.notEqual(strippedReply, reply, "the strip actually removed the stated facts");
  assert.doesNotMatch(strippedReply, /^\s*Atoms\s*\(/m, "no per-layer header survives the strip");
  const stripped = adapter.gradeCheck({
    record: replayedRecord({ dir: join(sandbox(t, "t16-ac1-stripped-"), "captures"), bytes: resultStream({ reply: strippedReply }), entry }),
    entry,
    track: "pinned",
    installation: identityForCell(),
  });
  assert.equal(stripped.cell.verdict, "fail", `the reply without its facts cannot pass: ${JSON.stringify(stripped.blocks)}`);
  assert.equal(stripped.cell.reason, "status-facts-absent", "the refusal is the fact check's own reason");
  for (const fact of ["phase", "gates.atoms", "gates.screens", "inventory.atoms", "inventory.screens"]) {
    assert.ok(stripped.blocks[0].missing.includes(fact), `the refusal names ${fact}: ${JSON.stringify(stripped.blocks[0].missing)}`);
  }
  assert.notDeepEqual(stripped.blocks[0].missing, [], "a reply with no facts is never graded as stating them");
});

// ---------------------------------------------------------------------------
// AC-2 — the verify check finds the report the invocation wrote, bound to its own id
// ---------------------------------------------------------------------------

test("t16-verify-grades-written-report", (t) => {
  const pair = adapter.prepareVerifyPair({ runId: "t16-ac2" });
  t.after(() => pair.cleanup());

  const side = (slot) => {
    const prepared = pair[slot];
    const report = runCatalogCheck(prepared.dir);
    const body = reportBodyFor({ report, caseManifest: prepared.caseManifest, invocationId: prepared.invocation_id });
    writeReportAsInvocation(prepared.bound_path, body);
    // The invocation could only write here because it was told the path and the id: the prompt it
    // ran names both, and the body it wrote echoes exactly that id.
    assert.ok(
      prepared.entry.prompt.includes(prepared.caseManifest.report_relative_path),
      `${slot}: the invocation is told the path it must write`,
    );
    assert.ok(prepared.entry.prompt.includes(prepared.invocation_id), `${slot}: the invocation is told the id it must echo`);
    assert.equal(body.invocation_id, prepared.invocation_id, `${slot}: the report echoes that id`);
    const record = replayedRecord({
      dir: join(sandbox(t, `t16-ac2-${slot}-`), "captures"),
      bytes: resultStream({ reply: `verify ${prepared.caseManifest.case_id}: ${report.message}` }),
      entry: prepared.entry,
    });
    const graded = adapter.gradeCheck({ record, entry: prepared.entry, track: "pinned", installation: identityForCell() });
    return { prepared, report, body, graded };
  };

  // The oracle already disagrees between the two sides, from the product's own catalog check.
  const planted = side("planted");
  const clean = side("clean");
  assert.equal(planted.report.exit, 1, "the planted project drifts");
  assert.ok(planted.report.drifted.some((drifted) => drifted.key === "atoms/Button/default"), "the planted drift names the declared key");
  assert.equal(clean.report.exit, 0, "the clean twin is clean");
  assert.deepEqual(clean.report.drifted, []);

  // What the contract asks the invocation to write, and what the grader reads back.
  assert.equal(planted.body.observed_verify_outcome, "defect-detected");
  assert.equal(planted.body.evidence.drifted_keys.length > 0, true);
  assert.equal(planted.body.clean_project_failed, true);
  assert.equal(clean.body.observed_verify_outcome, "clean");
  assert.equal(clean.body.clean_project_failed, false);

  assert.equal(planted.graded.cell.verdict, "pass", `the written planted report grades pass: ${JSON.stringify(planted.graded.blocks)}`);
  assert.equal(planted.graded.cell.observed_verify_outcome, "defect-detected");
  assert.equal(clean.graded.cell.verdict, "pass", `the written clean report grades pass: ${JSON.stringify(clean.graded.blocks)}`);
  assert.equal(clean.graded.cell.observed_verify_outcome, "clean");
  for (const side of [planted, clean]) {
    assert.equal(side.graded.cell.reason, null);
    assert.equal(
      (side.graded.cell.block_reasons ?? []).some((entryBlock) => entryBlock.reason === "report-missing"),
      false,
      "neither side reads report-missing",
    );
  }

  // A borrowed body is refused by the binding, not accepted as a detection.
  const borrowedPath = writeReportAsInvocation(planted.prepared.bound_path, {
    ...planted.body,
    invocation_id: clean.prepared.invocation_id,
  });
  assert.equal(borrowedPath, planted.prepared.bound_path, "the borrowed body sits at the planted path");
  const borrowed = adapter.gradeCheck({
    record: replayedRecord({
      dir: join(sandbox(t, "t16-ac2-borrowed-"), "captures"),
      bytes: resultStream({ reply: `verify ${planted.prepared.caseManifest.case_id}: ${planted.report.message}` }),
      entry: planted.prepared.entry,
    }),
    entry: planted.prepared.entry,
    track: "pinned",
    installation: identityForCell(),
  });
  assert.equal(borrowed.cell.verdict, "fail");
  assert.equal(borrowed.cell.reason, "report-mismatched-invocation");
  assert.equal(borrowed.blocks[0].expected, planted.prepared.invocation_id);
  assert.equal(borrowed.blocks[0].seen, clean.prepared.invocation_id);
});

// ---------------------------------------------------------------------------
// TC-3 — the status check still has teeth
// ---------------------------------------------------------------------------

test("t16-status-check-has-teeth", (t) => {
  const { bytes } = statusFixture();
  const reply = bytes.toString("utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line))[1].result;
  const caseManifest = loadCase("status-a");
  const dirs = adapter.prepareRunDirs({ runId: "t16-tc3", track: "pinned" });
  t.after(() => dirs.cleanup());
  const entry = adapter.invocationTable({ track: "pinned", dirs, pluginRoot: PLUGIN_ROOT }).find((row) => row.check_id === "status");

  const grade = (label, mutantReply) => {
    const record = replayedRecord({ dir: join(sandbox(t, `t16-tc3-${label}-`), "captures"), bytes: resultStream({ reply: mutantReply }), entry });
    return adapter.gradeCheck({ record, entry, track: "pinned", installation: identityForCell() });
  };

  // The unmutated reply passes, so the mutations below differ only in their content.
  const full = grade("full", reply);
  assert.equal(full.cell.verdict, "pass", `the untouched reply grades pass: ${JSON.stringify(full.blocks)}`);

  // Strip the Phases block, its lines and the per-layer headers: the gates and the inventory are gone.
  const stripped = stripDeclaredFacts(reply);
  assert.notEqual(stripped, reply, "the strip actually removed content");
  const strippedGrade = grade("stripped", stripped);
  assert.equal(strippedGrade.cell.verdict, "fail", "a reply that drops the gates cannot pass");
  assert.equal(strippedGrade.cell.reason, "status-facts-absent");
  assert.ok(strippedGrade.blocks[0].missing.includes("gates.atoms"), `the refusal names gates.atoms: ${JSON.stringify(strippedGrade.blocks[0])}`);
  assert.ok(strippedGrade.blocks[0].missing.includes("inventory.atoms"), "the refusal names inventory.atoms");
  // The stripped reply is the same shape the dispatched run recorded for this cell.
  assert.deepEqual(strippedGrade.blocks[0].missing, [
    "phase",
    "gates.atoms",
    "gates.molecules",
    "gates.screens",
    "inventory.atoms",
    "inventory.molecules",
    "inventory.screens",
  ]);

  // One layer stated against the manifest: MOLECULES is declared pending and this says approved.
  const flipped = reply.replace("    [ ] MOLECULES   — Pending", "    MOLECULES gate approved");
  assert.notEqual(flipped, reply, "the flip actually changed the reply");
  const flippedGrade = grade("flipped", flipped);
  assert.equal(flippedGrade.cell.verdict, "fail");
  assert.equal(flippedGrade.cell.reason, "status-facts-absent");
  assert.deepEqual(flippedGrade.blocks[0].missing, ["gates.molecules"], "only the layer that disagrees is named");
});

// ---------------------------------------------------------------------------
// TC-4 — the report is the invocation's, not the harness's
// ---------------------------------------------------------------------------

test("t16-report-written-by-invocation", (t) => {
  const source = readFileSync(join(ROOT, "test/harness/adapters/claude-code.mjs"), "utf8");
  assert.equal(source.includes("writeVerifyReport"), false, "the adapter calls no report writer");
  assert.equal(source.includes("writeObservedReport"), false, "the adapter calls no kit writer");
  assert.equal((source.match(/reports\//g) ?? []).length, 0, "the adapter hardcodes no reports/ path");
  assert.equal(/readdirSync\(\s*[^)]*reports/.test(source), false, "the adapter lists no reports directory");

  const pair = adapter.prepareVerifyPair({ runId: "t16-tc4" });
  t.after(() => pair.cleanup());
  for (const prepared of [pair.planted, pair.clean]) {
    const declared = prepared.caseManifest.report_relative_path;
    assert.ok(prepared.entry.prompt.includes(declared), "the prompt's path is the case's declared path");
    assert.equal(prepared.bound_path, join(prepared.dir, declared), "the graded path is that same declared path, bound to the run dir");
  }

  // With no report, the grade is still `fail report-missing` — no fallback, no could-not-run.
  const prepared = pair.planted;
  rmSync(prepared.bound_path, { force: true });
  const missing = adapter.readVerifyReport({ entry: prepared.entry });
  assert.equal(missing.ok, false);
  assert.equal(missing.verdict, "fail");
  assert.equal(missing.reason, "report-missing");

  // A write outside the allow-list is still denied, and still grades as it does today. The status
  // entry is used because its check reads no report: the denial is the only block, so the reason is
  // the denial's own — the vocabulary this task leaves untouched.
  const outsideTarget = join(prepared.dir, "reports", "not-the-declared-path.json");
  assert.equal(prepared.entry.stance.allowed_writes.includes(`Edit(${outsideTarget})`), false);
  assert.deepEqual(prepared.entry.stance.allowed_writes, [`Edit(${prepared.caseManifest.report_relative_path})`]);

  const dirs = adapter.prepareRunDirs({ runId: "t16-tc4-status", track: "pinned" });
  t.after(() => dirs.cleanup());
  const statusEntry = adapter.invocationTable({ track: "pinned", dirs, pluginRoot: PLUGIN_ROOT }).find((row) => row.check_id === "status");
  assert.deepEqual(statusEntry.stance.allowed_writes, [], "the status entry is given no write rule, so policy there is unchanged");
  const statusOutside = join(statusEntry.cwd, "reports", "not-the-declared-path.json");
  const denied = replayedRecord({
    dir: join(sandbox(t, "t16-tc4-denied-"), "captures"),
    bytes: resultStream({
      reply: documentedStatusReply(),
      permission_denials: [{ tool_name: "Write", tool_input: { file_path: statusOutside } }],
    }),
    entry: statusEntry,
  });
  const deniedGrade = adapter.gradeCheck({ record: denied, entry: statusEntry, track: "pinned", installation: identityForCell() });
  assert.equal(deniedGrade.cell.verdict, "fail", "an out-of-list write is a denial, and a denial on a required path is a fail");
  assert.equal(deniedGrade.cell.reason, "denied_tool_call", "the denial reason is exactly the one the run already reports");
  assert.equal(deniedGrade.cell.denied_tool_call.target, statusOutside);
  assert.equal(deniedGrade.cell.denied_tool_call.required_read, true, "requiredness is unchanged: a write under the work dir is required");
});

// ---------------------------------------------------------------------------
// AC-3 — twelve cells, four checks, and the ten untouched neighbours
// ---------------------------------------------------------------------------

test("t16-cell-shape-intact", (t) => {
  assert.deepEqual(adapter.CHECKS, ["command_list", "status", "verify", "question_before_expensive_work"]);

  const dirs = adapter.prepareRunDirs({ runId: "t16-ac3", track: "pinned" });
  t.after(() => dirs.cleanup());
  const table = adapter.invocationTable({ track: "pinned", dirs, pluginRoot: PLUGIN_ROOT });
  assert.equal(table.length, 5, "five invocations, one table");
  assert.equal(new Set(table.map((entry) => entry.check_id)).size, 4, "four distinct check ids");
  assert.deepEqual(
    table.map((entry) => entry.check_id),
    ["command_list", "status", "verify", "verify", "question_before_expensive_work"],
  );
  for (const entry of table.filter((row) => row.graded)) {
    assert.equal(entry.argv[0], "-p");
    assert.equal(entry.argv[entry.argv.indexOf("--permission-mode") + 1], "dontAsk");
    assert.equal(entry.argv[entry.argv.indexOf("--add-dir") + 1], PLUGIN_ROOT);
    assert.equal(JSON.stringify(entry).includes("bypassPermissions"), false);
    // The stance recorded on the entry is the argv the invocation runs, rule for rule.
    assert.deepEqual(entry.argv.slice(entry.argv.indexOf("--permission-mode")), entry.stance.argv);
  }

  // The recorded artifact's cells, read from the tracked projection — never from an in-file copy and
  // never conditionally: the artifact itself is git-ignored, so a comparison that only ran where the
  // artifact happened to be on disk would assert nothing in a clean checkout.
  const projection = recordedRunProjection();
  const recorded = projection.cells;
  assert.equal(recorded.length, 12, "the recorded run holds twelve cells");
  assert.equal(new Set(recorded.map((cell) => `${cell.harness}/${cell.track}`)).size, 12, "twelve unique (harness, track) cells");
  const outside = recorded.filter((cell) => cell.harness !== adapter.HARNESS);
  assert.equal(outside.length, 10, "ten cells outside claude-code");
  assert.ok(outside.every((cell) => typeof cell.reason === "string" && cell.reason.length > 0), "every neighbour keeps a named reason");
  assert.deepEqual([...new Set(outside.map((cell) => cell.reason))].sort(), [
    "codex-adapter-not-implemented",
    "grok-adapter-not-implemented",
    "missing-api-key",
    "opencode-adapter-not-implemented",
    "pi-adapter-not-implemented",
  ]);
  assert.equal(recorded.filter((cell) => cell.harness === adapter.HARNESS).length, 2);

  // Where the artifact itself is on disk, it must be the file the projection describes: same sha256,
  // same cells. A re-recorded run therefore fails here until the projection records it.
  const artifactPath = join(ROOT, projection.artifact.path);
  if (existsSync(artifactPath)) {
    const onDisk = readFileSync(artifactPath);
    assert.equal(sha256Hex(onDisk), projection.artifact.sha256, "the artifact on disk is the run the projection records");
    const artifact = JSON.parse(onDisk.toString("utf8"));
    assert.equal(String(artifact.run_id), projection.run_id, "the artifact is the run the projection names");
    assert.equal(artifact.head_sha, projection.head_sha, "the artifact is the head the projection names");
    assert.deepEqual(cellsOf(artifact), recorded, "the projection's cells are the artifact's cells");
  }
});
