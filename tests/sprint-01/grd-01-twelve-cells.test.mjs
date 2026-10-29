// FLOW-GRD-01-TWELVE-CELLS: the twelve-cell identity contract.
//
// The real things this test exercises: the on-disk test/harness/pins.json bytes (its SHA-256 is
// recomputed here, never read from a registry), the six installed harness CLIs probed for a real
// `--version` with every credential variable scrubbed, the shipped JSON schemas, and this worktree's
// real commit `git rev-parse HEAD`. Grades are NOT claimed: without a hosted run every cell is
// could-not-run with the reason the probe actually produced.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  CHECKS,
  HARNESSES,
  TRACKS,
  assertPinsManifest,
  cellsFromPins,
  createVersionResolver,
  identityEnvelope,
  loadPins,
} from "../../test/harness/pins.mjs";
import { validateAgainst, validateResult } from "../../test/harness/validate.mjs";
import { inspectWorkflowDeclaration, parseYaml, readWorkflow } from "./flow-runner.mjs";
import {
  RESULT_FILENAME,
  assembleResult,
  collectCells,
  copyJobTimestamps,
  main,
  readCellArtifacts,
  recorderExit,
  runContextFromEnv,
  uploadPlan,
  writeResult,
  writeVerifyReceipt,
} from "../../test/harness/recorder.mjs";
import { runVerifyCase } from "./flow-runner.mjs";
import { renderSummary } from "../../test/harness/recorder/summary.mjs";
import { ADAPTER_PENDING, ABSENT_REASONS, absentReason } from "../../test/harness/adapters/absent.mjs";
import { CELL_SOURCES, LOOKUP_FAILED_REASON, planCells } from "../../test/harness/adapters/registry.mjs";
import { guardInvocation } from "../../test/harness/runtime/guard.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ADAPTERS_DIR = join(ROOT, "test/harness/adapters");
const REPORT_DIR = join(ROOT, ".tmp", "sprint-01-verification");
// A downloaded attempt-qualified artifact, when one exists. No hosted run exists in this worktree.
const LIVE_ARTIFACT =
  process.env.HARNESS_EVAL_RESULT ?? join(ROOT, ".tmp", "sprint-01-artifacts", "he1", "harness-eval-result.json");

// Command listing / version probes must not see a key (no key on install or listing steps).
const SCRUBBED_ENV = Object.fromEntries(
  Object.entries(process.env).filter(
    ([name]) => !/^(SMOKE_[A-Z_]+|ANTHROPIC_API_KEY|CODEX_API_KEY|XAI_API_KEY|GEMINI_API_KEY|CURSOR_API_KEY)$/.test(name),
  ),
);

const BINARIES = {
  "claude-code": "claude",
  codex: "codex",
  grok: "grok",
  opencode: "opencode",
  pi: "pi",
  cursor: "cursor-agent",
};

// The job lists the timestamp rules are proven against. They are bytes in this file on purpose:
// deriving the control from `gh run list --limit 1` made this check's verdict a function of which
// run happened to be newest, so a harness-eval run — the state this flow's own required dispatch
// creates — turned it red. A fixed payload owns the evidence; the live read below is supplementary.
const FIXED_SMOKE_JOBS = [
  { name: "drift proof", started_at: "2026-02-01T10:00:00Z", completed_at: "2026-02-01T10:01:00Z" },
  { name: "smoke claude-code pinned", started_at: "2026-02-01T10:01:30Z", completed_at: "2026-02-01T10:09:00Z" },
  { name: "smoke claude-code newest", started_at: "2026-02-01T10:01:30Z", completed_at: "2026-02-01T10:08:00Z" },
  { name: "smoke cursor pinned", started_at: "2026-02-01T10:02:00Z", completed_at: "2026-02-01T10:12:30Z" },
  { name: "download the collected cells", started_at: "2026-02-01T10:13:00Z", completed_at: "2026-02-01T10:13:20Z" },
  { name: "grade", started_at: "2026-02-01T10:13:30Z", completed_at: "2026-02-01T10:15:00Z" },
];
// A run whose jobs are not a smoke matrix at all (the CodeQL shape this control was first written
// against). No job name matches `smoke <harness> <track>`, so the interval is not knowable.
const FIXED_NO_SMOKE_JOBS = [
  { name: "Analyze (python)", started_at: "2026-02-01T09:00:00Z", completed_at: "2026-02-01T09:04:00Z" },
  { name: "Analyze (javascript-typescript)", started_at: "2026-02-01T09:00:00Z", completed_at: "2026-02-01T09:05:00Z" },
  { name: "Adjust Configuration", started_at: "2026-02-01T09:05:30Z", completed_at: "2026-02-01T09:05:40Z" },
];

/** Real `--version` of the CLI that is installed right now; null when it is not installed. */
function probeObservedVersion(harness) {
  try {
    const out = execFileSync(BINARIES[harness], ["--version"], {
      encoding: "utf8",
      timeout: 30_000,
      stdio: ["ignore", "pipe", "ignore"],
      env: SCRUBBED_ENV,
    });
    const match = out.match(/(\d+\.\d+\.\d+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

// The PRD's per-harness newest-version lookup (02-system-components.md § version-lookup).
const PRD_LOOKUPS = {
  "claude-code": "npm view @anthropic-ai/claude-code version",
  codex: "npm view @openai/codex version",
  grok: "curl -fsSL https://x.ai/cli/stable",
  opencode: "npm view opencode-ai version",
  pi: "npm view @earendil-works/pi-coding-agent version",
};

function writeReport(report) {
  mkdirSync(REPORT_DIR, { recursive: true });
  writeFileSync(join(REPORT_DIR, "grd-01-twelve-cells.json"), `${JSON.stringify(report, null, 2)}\n`);
}

// --- the gate itself, outside any test() ------------------------------------
// `node --test --test-name-pattern` reports exit 0 when the named test is skipped or renamed away
// (Node then counts the FILE as the passing test). Both halves of this flow's proof live here —
// T2's pins/schema half and T8's recorder half — so the tripwire counts them: skipping or dropping
// either one leaves the count short and the frozen check red.
const EXPECTED_TESTS = 3;
let testsExecuted = 0;
process.on("exit", () => {
  if (testsExecuted !== EXPECTED_TESTS) {
    console.error(
      `FLOW-GRD-01-TWELVE-CELLS: ${testsExecuted} of ${EXPECTED_TESTS} tests executed (skipped, or renamed out of --test-name-pattern) — a gate that asserts nothing is not a pass`,
    );
    process.exitCode = 1;
  }
});

test("FLOW-GRD-01-TWELVE-CELLS", async (t) => {
  testsExecuted += 1;
  // ---- pins authority: the digest is of the manifest bytes, recomputed here ----
  const pins = loadPins();
  const recomputed = createHash("sha256").update(pins.bytes).digest("hex");
  assert.match(pins.pins_sha256, /^[0-9a-f]{64}$/, "pins_sha256 is 64 lowercase hex characters");
  assert.equal(pins.pins_sha256, recomputed, "pins_sha256 is the SHA-256 of the exact pins.json bytes");
  assert.equal(pins.manifest.harnesses["claude-code"].pinned_cli_version, "2.1.291");

  // ---- exactly six exact pins, the harness-smoke secret names, no range and no latest alias ----
  const EXPECTED_PINS = {
    "claude-code": "2.1.291",
    codex: "0.160.1",
    grok: "1.0.46",
    opencode: "1.18.34",
    pi: "1.0.4",
    cursor: "2026.10.01-e373342",
  };
  const EXPECTED_SECRETS = {
    "claude-code": "SMOKE_CLAUDE_KEY",
    codex: "SMOKE_CODEX_KEY",
    grok: "SMOKE_GROK_KEY",
    opencode: "SMOKE_OPENCODE_KEY",
    pi: "SMOKE_PI_KEY",
    cursor: "CURSOR_API_KEY",
  };
  assert.equal(Object.keys(pins.manifest.harnesses).length, 6, "exactly six harness entries");
  for (const harness of HARNESSES) {
    const pin = pins.manifest.harnesses[harness];
    assert.equal(pin.pinned_cli_version, EXPECTED_PINS[harness], `${harness} carries its exact pin`);
    assert.equal(pin.credential_env, EXPECTED_SECRETS[harness], `${harness} names the harness-smoke credential`);
    assert.ok(pin.provider && pin.model, `${harness} records its provider and model selection`);
  }
  assert.equal(pins.manifest.fixer_cli_version, "2.1.291", "the fixer CLI has its own exact version field");
  assert.equal(pins.manifest.qualification.status, "unqualified", "this file qualifies no pin by itself");

  // ---- negative controls: a range, a latest alias, or a missing harness is refused by name ----
  const ranged = structuredClone(pins.manifest);
  ranged.harnesses.codex.pinned_cli_version = "^0.160.1";
  assert.throws(
    () => assertPinsManifest(ranged),
    (error) => error.reason === "version-not-exact",
    "a semver range is refused as a pin",
  );
  const aliased = structuredClone(pins.manifest);
  aliased.harnesses.grok.pinned_cli_version = "latest";
  assert.throws(
    () => assertPinsManifest(aliased),
    (error) => error.reason === "version-not-exact",
    "a latest alias is refused as a pin",
  );
  const missing = structuredClone(pins.manifest);
  delete missing.harnesses.cursor;
  assert.throws(
    () => assertPinsManifest(missing),
    (error) => error.reason === "harness-missing" && error.detail.harness === "cursor",
    "a missing pin is a missing pin, never a default",
  );
  const inventedSecret = structuredClone(pins.manifest);
  inventedSecret.harnesses["claude-code"].credential_env = "ANTHROPIC_API_KEY";
  assert.throws(
    () => assertPinsManifest(inventedSecret),
    (error) => error.reason === "credential-env-not-a-secret-name",
    "a provider variable is not accepted as the secret name",
  );

  // ---- real observations: one dotted version per installed CLI, null when absent ----
  const observed = Object.fromEntries(HARNESSES.map((harness) => [harness, probeObservedVersion(harness)]));
  const cells = cellsFromPins(pins.manifest, { observed, credentialEnv: process.env });

  // ---- twelve cells, six harnesses, cursor never omitted ----
  assert.equal(cells.length, 12, "twelve cells");
  const harnesses = new Set(cells.map((cell) => cell.harness));
  assert.equal(harnesses.size, 6, "six unique harnesses");
  for (const harness of HARNESSES) assert.ok(harnesses.has(harness), `${harness} present`);
  assert.ok(harnesses.has("cursor"), "cursor is in the set");
  const pairs = new Set(cells.map((cell) => `${cell.harness}/${cell.track}`));
  assert.equal(pairs.size, 12, "twelve unique (harness, track) pairs");
  assert.equal(TRACKS.length, 2);
  assert.equal(CHECKS.length, 4);

  for (const cell of cells) {
    assert.ok(cell.verdict, `${cell.harness}/${cell.track} carries a verdict word`);
    assert.ok(cell.reason, `${cell.harness}/${cell.track} carries a named reason, never an omission`);
    assert.notEqual(cell.verdict, "pass", `${cell.harness}/${cell.track} may not read pass without a hosted run`);
    assert.ok(
      cell.verdict !== "pass" || cell.evidence_paths.length > 0,
      `${cell.harness}/${cell.track}: a pass always implies evidence`,
    );
    validateAgainst("harness-cell.v1.schema.json", cell);
    assert.equal(cell.checks.length, 4);
  }
  assert.equal(cells.filter((cell) => cell.verdict === "pass").length, 0, "a version match is not a grade");

  const cursorCell = cells.find((cell) => cell.harness === "cursor" && cell.track === "pinned");
  assert.equal(cursorCell.verdict, "could-not-run", "cursor day one is could-not-run, never pass");
  assert.equal(cursorCell.reason, "missing-api-key", "cursor reason is the PRD's named day-one reason");

  const dotted = cells.filter((cell) => cell.installation.observed_cli_version !== null);
  for (const cell of dotted) {
    assert.match(cell.installation.observed_cli_version, /^\d+\.\d+\.\d+/, `${cell.harness} observed a dotted CLI version`);
  }

  // ---- the identity envelope validates against the shipped result schema ----
  const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
  const record = identityEnvelope({
    cells,
    pinsSha256: pins.pins_sha256,
    candidateSha: head,
    event: "workflow_dispatch",
    installMode: "checkout",
    now: new Date().toISOString(),
  });
  const summary = validateResult(record, { dispatchSha: head, requiredPinsSha256: pins.pins_sha256 });
  assert.deepEqual(summary, { cells: 12, harnesses: 6, pairs: 12 });
  assert.match(record.pins_sha256, /^[0-9a-f]{64}$/);
  assert.equal(record.candidate_sha, head);

  // ---- negative controls: the validator refuses each forged shape with its named reason ----
  const dropCursor = { ...record, cells: record.cells.filter((cell) => !(cell.harness === "cursor" && cell.track === "pinned")) };
  assert.throws(
    () => validateResult(dropCursor),
    (error) => error.reason === "cells-incomplete" && /missing cell cursor\/pinned/.test(error.message),
    "dropping the cursor/pinned cell is refused with cells-incomplete",
  );

  const duplicatePair = { ...record, cells: [...record.cells.slice(0, 11), structuredClone(record.cells[0])] };
  assert.throws(
    () => validateResult(duplicatePair),
    (error) => error.reason === "cells-incomplete",
    "a duplicate (harness, track) pair is refused with cells-incomplete",
  );

  const badVerdict = structuredClone(record);
  badVerdict.cells[0].verdict = "passs";
  assert.throws(
    () => validateResult(badVerdict),
    (error) => error.reason === "schema-invalid" && /verdict/.test(error.message),
    "a verdict outside pass|fail|could-not-run is refused",
  );

  const badDigest = { ...record, pins_sha256: "not-a-digest" };
  assert.throws(
    () => validateResult(badDigest),
    (error) => error.reason === "pins-digest-invalid",
    "an absent or non-hex pins_sha256 is refused",
  );

  // ---- F-T2-2: the digest binds to the manifest bytes even when the caller passes no option ----
  const derivativeDigest = createHash("sha256").update(JSON.stringify(pins.manifest)).digest("hex");
  assert.notEqual(derivativeDigest, recomputed, "a serialized re-encoding is not the manifest bytes digest");
  assert.throws(
    () => validateResult({ ...record, pins_sha256: derivativeDigest }),
    (error) => error.reason === "pins-digest-mismatch" && error.message.includes(recomputed),
    "a digest of a derivative document is refused with only default arguments",
  );
  assert.throws(
    () => validateResult(record, { dispatchSha: head, requiredPinsSha256: "0".repeat(64) }),
    (error) => error.reason === "pins-digest-caller-mismatch",
    "a caller-supplied digest that disagrees with the manifest bytes is refused, never obeyed",
  );

  // ---- F-T2-1: a pass needs evidence, an invocation, an exit status and a check that ran ----
  const unevidenced = structuredClone(record);
  for (const cell of unevidenced.cells) {
    cell.verdict = "pass";
    cell.reason = null;
  }
  assert.throws(
    () => validateResult(unevidenced, { dispatchSha: head }),
    (error) =>
      error.reason === "pass-without-evidence" &&
      ["evidence_paths", "invocation_id", "process_exit_code", "checks"].every((field) =>
        error.details.missing.includes(field),
      ),
    "twelve passes with no evidence at all are refused",
  );

  const evidencedButUnrun = structuredClone(record);
  evidencedButUnrun.cells[0].verdict = "pass";
  evidencedButUnrun.cells[0].evidence_paths = ["reports/verify.json"];
  evidencedButUnrun.cells[0].invocation_id = "inv-1";
  evidencedButUnrun.cells[0].process_exit_code = 0;
  assert.throws(
    () => validateResult(evidencedButUnrun, { dispatchSha: head }),
    (error) => error.reason === "pass-without-evidence" && error.details.missing.join() === "checks",
    "a pass whose four checks all read could-not-run is refused",
  );

  // ---- F-T2-3: the candidate sha is compared with the dispatch commit, never with itself ----
  const foreignCommit = { ...record, candidate_sha: "a".repeat(40) };
  assert.notEqual(foreignCommit.candidate_sha, head, "the fixture commit is not this worktree's HEAD");
  assert.throws(
    () => validateResult(foreignCommit),
    (error) => error.reason === "dispatch-sha-unknown",
    "a checkout record with no trusted dispatch sha is refused rather than self-compared",
  );
  assert.throws(
    () => validateResult(foreignCommit, { dispatchSha: head }),
    (error) => error.reason === "candidate-sha-mismatch",
    "a candidate sha that is not the dispatch commit is refused",
  );

  // ---- F-T2-6: verdict is required, not merely described ----
  const noVerdictKey = structuredClone(record);
  delete noVerdictKey.cells[0].verdict;
  assert.throws(
    () => validateResult(noVerdictKey, { dispatchSha: head }),
    (error) => error.reason === "schema-invalid" && /missing required property verdict/.test(error.message),
    "a cell without a verdict key is refused by the schema's required list",
  );

  // ---- newest-version lookup: frozen once per run, parsed from each CLI's real output shape ----
  const calls = [];
  const resolver = createVersionResolver({
    manifest: pins.manifest,
    exec: (command) => {
      calls.push(command);
      if (command.includes("@anthropic-ai/claude-code")) return "2.1.312\n";
      if (command.includes("@openai/codex")) return "0.165.0\n";
      if (command.includes("https://x.ai/cli/stable")) return "grok 1.0.70 (f50904eaee6c) [stable]\n";
      if (command.includes("opencode-ai")) return "2.0.29\n";
      if (command.includes("pi-coding-agent")) return "1.3.0\n";
      if (command.includes("cursor.com/install")) {
        return "curl -fsSL https://downloads.cursor.com/lab/2026.10.01-e373342/linux/x64/agent-cli-package.tar.gz";
      }
      throw new Error(`unexpected lookup command: ${command}`);
    },
  });
  for (const harness of HARNESSES) {
    resolver.resolve(harness);
    resolver.resolve(harness); // second call must be served from the frozen snapshot
  }
  assert.equal(calls.length, 6, "each newest-version lookup ran exactly once per run");
  assert.deepEqual(resolver.snapshot(), {
    "claude-code": "2.1.312",
    codex: "0.165.0",
    grok: "1.0.70",
    opencode: "2.0.29",
    pi: "1.3.0",
    cursor: "2026.10.01-e373342",
  });

  // ---- F-T2-4: a failed newest lookup is null and frozen null, never a substituted version ----
  const failedCommand = pins.manifest.harnesses.codex.newest_lookup;
  const failing = [];
  const failingResolver = createVersionResolver({
    manifest: pins.manifest,
    exec: (command) => {
      failing.push(command);
      if (command === failedCommand) throw new Error("lookup failed");
      return "9.9.9\n";
    },
  });
  assert.equal(failingResolver.resolve("codex"), null, "a failed lookup resolves to null, not a default version");
  assert.equal(failingResolver.resolve("codex"), null, "the second resolve is served from the frozen null");
  assert.equal(failing.filter((command) => command === failedCommand).length, 1, "the failed lookup ran only once");
  const unresolved = cellsFromPins(pins.manifest, {
    observed: { codex: "0.160.1" },
    credentialEnv: { ...process.env, SMOKE_CODEX_KEY: "set" },
    resolvedNewest: failingResolver.snapshot(),
  });
  for (const track of TRACKS) {
    const cell = unresolved.find((candidate) => candidate.harness === "codex" && candidate.track === track);
    assert.equal(cell.installation.requested_cli_version === null, track === "newest", `${track}: no substitution`);
    if (track === "newest") {
      assert.equal(cell.verdict, "could-not-run", "an unresolved newest track grades nothing");
      assert.equal(cell.reason, "newest-version-not-resolved", "the reason names the failed lookup");
    }
  }

  // ---- the pins' lookup commands are the PRD's documented per-harness lookups ----
  for (const [harness, command] of Object.entries(PRD_LOOKUPS)) {
    assert.equal(pins.manifest.harnesses[harness].newest_lookup, command, `${harness} newest_lookup matches the PRD`);
  }
  assert.match(pins.manifest.harnesses.cursor.newest_lookup, /cursor\.com\/install/);
  assert.match(pins.manifest.harnesses.cursor.newest_lookup, /downloads\[\.\]cursor\[\.\]com\/lab/);

  // ---- a downloaded artifact, when one exists, must bind to this same digest ----
  let live = "absent";
  if (existsSync(LIVE_ARTIFACT)) {
    const artifact = JSON.parse(readFileSync(LIVE_ARTIFACT, "utf8"));
    // A dispatch's trusted commit is GitHub's recorded workflow head; the checkout must be the same.
    const dispatchSha = process.env.HARNESS_EVAL_DISPATCH_SHA ?? artifact.head_sha ?? null;
    assert.equal(artifact.candidate_sha, dispatchSha, "the checkout commit is the dispatch commit");
    validateResult(artifact, { dispatchSha, requiredPinsSha256: pins.pins_sha256 });
    live = "validated";
  }

  writeReport({
    flow: "FLOW-GRD-01-TWELVE-CELLS",
    task: "T2",
    pins_path: pins.path,
    pins_sha256: pins.pins_sha256,
    recomputed_sha256: recomputed,
    cells: cells.length,
    harnesses: [...harnesses].sort(),
    pairs: pairs.size,
    observed_cli_versions: observed,
    verdicts: cells.map((cell) => ({
      cell: `${cell.harness}/${cell.track}`,
      verdict: cell.verdict,
      reason: cell.reason,
      observed_cli_version: cell.installation.observed_cli_version,
    })),
    candidate_sha: head,
    live_artifact: { path: LIVE_ARTIFACT, status: live },
    negative_controls: [
      "drop-cell -> cells-incomplete",
      "duplicate-pair -> cells-incomplete",
      "verdict vocabulary -> schema-invalid",
      "missing required property verdict -> schema-invalid",
      "non-hex pins_sha256 -> pins-digest-invalid",
      "derivative-document pins_sha256 (default args) -> pins-digest-mismatch",
      "caller digest disagreeing with the manifest bytes -> pins-digest-caller-mismatch",
      "unevidenced pass -> pass-without-evidence",
      "pass with all four checks could-not-run -> pass-without-evidence",
      "checkout without trusted dispatch sha -> dispatch-sha-unknown",
      "candidate sha != dispatch commit -> candidate-sha-mismatch",
      "failed newest lookup -> newest-version-not-resolved, no substitution",
      "semver range -> version-not-exact",
      "latest alias -> version-not-exact",
      "missing harness -> harness-missing",
      "provider variable as secret name -> credential-env-not-a-secret-name",
    ],
    newest_lookup: { frozen_once: true, executed_commands: calls },
  });

  t.diagnostic(`pins_sha256=${pins.pins_sha256}`);
  t.diagnostic(`cells=${cells.length} harnesses=${[...harnesses].sort().join(",")} pairs=${pairs.size}`);
  t.diagnostic(`observed=${JSON.stringify(observed)}`);
  t.diagnostic(`live_artifact=${live}`);
});

// ---------------------------------------------------------------------------
// T8 — the grade recorder: the one component that refuses eleven cells, a duplicate pair, an
// invented verdict word or a made-up timestamp.
//
// The real things this test exercises: the on-disk pins bytes and its recomputed digest, the six
// installed CLIs probed for a real `--version`, this worktree's real commit as the dispatch
// commit, the recorder's own entry point driven end to end, and the real bytes of
// .github/workflows/harness-eval.yml. The job payloads the timestamp rules are proven against are
// pinned bytes in this file, never whichever run happens to be newest. The hosted half of the flow
// — the recorder's own run inside workflow_dispatch — is reported `not-executed` with its reason,
// never asserted.
// ---------------------------------------------------------------------------

const RECORDER = "test/harness/recorder.mjs";

function gitHead() {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
}

/** Mirrors the artifact layout the smoke matrix uploads: <artifact-name>/cell/cell.json. */
function writeCellArtifacts(dir, records, { prefix = "harness-eval-cell-9000000001-1" } = {}) {
  for (const record of records) {
    const folder = join(dir, `${prefix}-${record.harness}-${record.track}`, "cell");
    mkdirSync(folder, { recursive: true });
    writeFileSync(join(folder, "cell.json"), `${JSON.stringify(record, null, 2)}\n`, "utf8");
  }
  return dir;
}

/** The bare smoke-cell record T1's matrix writes today: identity plus an honest named reason. */
function bareCell(harness, track, reason, installMode = "checkout") {
  return {
    harness,
    track,
    cell_state: "could-not-run",
    reason,
    install_mode: installMode,
    event: "workflow_dispatch",
    run_id: "9000000001",
    run_attempt: "1",
  };
}

function writeRecorderReport(report) {
  mkdirSync(REPORT_DIR, { recursive: true });
  writeFileSync(join(REPORT_DIR, "grd-01-twelve-cells-recorder.json"), `${JSON.stringify(report, null, 2)}\n`);
}

function listFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath ?? entry.path, entry.name))
    .sort();
}

test("FLOW-GRD-01-TWELVE-CELLS recorder", async (t) => {
  testsExecuted += 1;

  // ---- real inputs: the pins authority, real CLI probes, the real credential names ----
  const pins = loadPins();
  const observed = Object.fromEntries(HARNESSES.map((harness) => [harness, probeObservedVersion(harness)]));
  const gradedCells = cellsFromPins(pins.manifest, { observed, credentialEnv: process.env });
  assert.equal(gradedCells.length, 12);

  const sandbox = mkdtempSync(join(tmpdir(), "pp-recorder-"));
  const cellsDir = writeCellArtifacts(join(sandbox, "cells"), gradedCells);
  const outDir = join(sandbox, "grade");

  // ---- the recorder reads the artifact layout, not a hand-built array ----
  const artifacts = readCellArtifacts(cellsDir);
  assert.equal(artifacts.cells.length, 12, "every cell artifact is read");
  assert.deepEqual(artifacts.controls, [], "no controls artifact arrived, so none is invented");

  const cells = collectCells(artifacts.cells, { pins, installMode: "checkout" });
  assert.equal(cells.length, 12);
  assert.equal(new Set(cells.map((cell) => `${cell.harness}/${cell.track}`)).size, 12, "twelve unique pairs");
  assert.equal(new Set(cells.map((cell) => cell.harness)).size, 6, "six harnesses");
  for (const cell of cells) assert.notEqual(cell.verdict, "pass", "this run graded nothing");

  // ---- a bare smoke cell is accepted as present-as-could-not-run, never as a verdict ----
  const bareDir = writeCellArtifacts(
    join(sandbox, "cells-bare"),
    HARNESSES.flatMap((harness) => TRACKS.map((track) => bareCell(harness, track, "smoke-not-implemented"))),
  );
  const bare = collectCells(readCellArtifacts(bareDir).cells, { pins, installMode: "checkout" });
  assert.equal(bare.length, 12, "twelve bare smoke cells are twelve cells");
  const bareCursor = bare.find((cell) => cell.harness === "cursor" && cell.track === "pinned");
  assert.equal(bareCursor.verdict, "could-not-run");
  assert.equal(bareCursor.reason, "smoke-not-implemented", "the reason travels from the artifact, never a default");
  assert.equal(bareCursor.installation.requested_cli_version, "2026.10.01-e373342", "the pinned request comes from the pins authority");
  assert.equal(bareCursor.installation.observed_cli_version, null, "an unobserved version is null, never invented");

  // ---- job timestamps: the copy and its refusals are proven on pinned payload bytes ----
  const repo = "hackerpug-ai/pixel-perfect";
  // The required-smoke predicate selects the matrix jobs alone, so the interval is theirs.
  const smokeOnly = copyJobTimestamps(FIXED_SMOKE_JOBS);
  assert.equal(smokeOnly.smoke_jobs, 3, "three required smoke jobs in the pinned payload");
  assert.equal(smokeOnly.evaluation_started_at, "2026-02-01T10:01:30Z", "the start is the earliest smoke start, not the run's");
  assert.equal(smokeOnly.evaluation_completed_at, "2026-02-01T10:12:30Z", "the completion is the latest smoke completion, not the grade job's");

  // Derivation checked against an independent computation over the same pinned bytes.
  const allJobs = copyJobTimestamps(FIXED_SMOKE_JOBS, { match: () => true });
  const starts = FIXED_SMOKE_JOBS.map((job) => job.started_at).filter(Boolean).sort();
  const completions = FIXED_SMOKE_JOBS.map((job) => job.completed_at).filter(Boolean).sort();
  assert.equal(allJobs.evaluation_started_at, starts[0], "started_at is the earliest real job start");
  assert.equal(allJobs.evaluation_completed_at, completions.at(-1), "completed_at is the latest real job completion");

  // A job list with no required smoke job blocks — whatever the repository's newest run happens to be.
  assert.throws(
    () => copyJobTimestamps(FIXED_NO_SMOKE_JOBS),
    (error) => error.reason === "timestamps-missing" && /smoke job/.test(error.message),
    "a run with no required smoke job blocks with timestamps-missing",
  );
  // A required smoke job that never completed blocks too — an inferred completion is a defect.
  assert.throws(
    () => copyJobTimestamps([{ name: "smoke claude-code pinned", started_at: starts[0], completed_at: null }]),
    (error) => error.reason === "timestamps-missing" && /not completed/.test(error.message),
    "an incomplete required smoke job blocks with timestamps-missing",
  );
  assert.throws(
    () => copyJobTimestamps([{ name: "smoke claude-code pinned", started_at: null, completed_at: null }]),
    (error) => error.reason === "timestamps-missing",
    "a required smoke job that never started blocks",
  );

  // Supplementary, non-required observation: what this repository's newest run reports right now.
  // Recorded for a human, never asserted — a check whose verdict moves with repo traffic is not proof.
  const liveObservation = (() => {
    try {
      const [newest] = JSON.parse(
        execFileSync("gh", ["run", "list", "--repo", repo, "--limit", "1", "--json", "databaseId,workflowName"], {
          encoding: "utf8",
          stdio: ["ignore", "pipe", "ignore"],
        }),
      );
      const payload = JSON.parse(
        execFileSync("gh", ["api", `repos/${repo}/actions/runs/${newest.databaseId}/jobs?per_page=100`], {
          encoding: "utf8",
          stdio: ["ignore", "pipe", "ignore"],
        }),
      );
      const jobs = Array.isArray(payload?.jobs) ? payload.jobs : [];
      return {
        ok: true,
        newest_run: newest.databaseId,
        workflow: newest.workflowName,
        jobs: jobs.length,
        required_smoke_jobs: jobs.filter((job) => /^smoke\s+\S+\s+\S+$/.test(String(job.name ?? "").trim())).length,
      };
    } catch (error) {
      return { ok: false, why: String(error.message ?? error).slice(0, 200) };
    }
  })();

  // ---- AC-2 shape, read here too: one run, one mode, from GitHub context only ----
  const dispatchSha = gitHead();
  const context = runContextFromEnv({
    INSTALL_MODE: "checkout",
    GITHUB_RUN_ID: "9000000001",
    GITHUB_RUN_NUMBER: "7",
    GITHUB_RUN_ATTEMPT: "1",
    GITHUB_EVENT_NAME: "workflow_dispatch",
    GITHUB_SHA: dispatchSha,
    GITHUB_REPOSITORY: repo,
    GITHUB_REF_NAME: "main",
  });
  assert.equal(context.dispatchSha, dispatchSha, "the dispatch commit is the workflow commit GitHub supplies");

  const result = assembleResult({ cells, pins, context, timestamps: smokeOnly });
  validateAgainst("harness-eval-result.v1.schema.json", result);
  assert.equal(result.cells.length, 12);
  assert.equal(new Set(result.cells.map((cell) => cell.harness)).size, 6);
  assert.match(result.pins_sha256, /^[0-9a-f]{64}$/, "pins_sha256 is a 64-hex digest");
  assert.equal(result.pins_sha256, createHash("sha256").update(pins.bytes).digest("hex"), "bound to the exact pins bytes");
  assert.equal(result.evaluation_started_at, smokeOnly.evaluation_started_at, "the start is the copied GitHub timestamp");
  assert.equal(result.evaluation_completed_at, smokeOnly.evaluation_completed_at, "the completion is the copied timestamp");
  assert.equal(result.run_id, 9000000001);
  assert.equal(result.run_attempt, 1);
  assert.equal(result.event, "workflow_dispatch");
  assert.equal(result.install_mode, "checkout");
  assert.equal(result.candidate_sha, dispatchSha);
  assert.deepEqual(validateResult(result, { dispatchSha, requiredPinsSha256: pins.pins_sha256 }), {
    cells: 12,
    harnesses: 6,
    pairs: 12,
  });

  // ---- eleven cells and a duplicate pair are both refused, with their own names ----
  const withoutCursorPinned = gradedCells.filter((cell) => !(cell.harness === "cursor" && cell.track === "pinned"));
  assert.equal(withoutCursorPinned.length, 11, "the mutation drops exactly one cell");
  const dropCellDir = writeCellArtifacts(join(sandbox, "cells-drop"), withoutCursorPinned);
  const dropped = readCellArtifacts(dropCellDir).cells;
  assert.throws(
    () => collectCells(dropped, { pins, installMode: "checkout" }),
    (error) => error.reason === "cells-incomplete" && /cursor\/pinned/.test(error.message),
    "eleven cells are refused with cells-incomplete naming the absent cursor/pinned cell",
  );
  // A duplicate arrives as its own artifact folder, so it cannot overwrite the original file.
  const withoutCursorNewest = gradedCells.filter((cell) => !(cell.harness === "cursor" && cell.track === "newest"));
  const duplicateDir = writeCellArtifacts(join(sandbox, "cells-dup"), withoutCursorNewest);
  writeCellArtifacts(duplicateDir, [{ ...gradedCells[0] }], { prefix: "harness-eval-cell-9000000001-1-dup" });
  assert.throws(
    () => collectCells(readCellArtifacts(duplicateDir).cells, { pins, installMode: "checkout" }),
    (error) => error.reason === "cells-duplicate" && /claude-code\/pinned/.test(error.message),
    "a duplicate (harness, track) pair is refused with cells-duplicate",
  );
  // ...and a refusal writes nothing, so no partial artifact can look valid. That is ENFORCED, not
  // merely observed, further down: main() itself is driven through a refusal and through a throw
  // after the result write, and the output directory is inspected there.

  // ---- a verdict word outside the closed vocabulary is refused ----
  const badVerdict = structuredClone(gradedCells);
  badVerdict[0].verdict = "passs";
  assert.throws(
    () => collectCells(badVerdict, { pins, installMode: "checkout" }),
    (error) => error.reason === "verdict-vocabulary" && /passs/.test(error.message),
    "an invented verdict word is refused by name",
  );
  // A bare smoke cell may not claim a verdict it has no grade record for.
  const barePass = HARNESSES.flatMap((harness) => TRACKS.map((track) => bareCell(harness, track, "r")));
  barePass[0].cell_state = "pass";
  assert.throws(
    () => collectCells(barePass, { pins, installMode: "checkout" }),
    (error) => error.reason === "cell-state-not-a-verdict",
    "a bare cell claiming pass is refused — a verdict needs a grade record",
  );

  // ---- InstallationIdentity completeness is enforced before a cell is accepted ----
  const tornIdentity = structuredClone(gradedCells);
  delete tornIdentity[3].installation.observed_plugin_manifest_sha256;
  assert.throws(
    () => collectCells(tornIdentity, { pins, installMode: "checkout" }),
    (error) => error.reason === "schema-invalid" && /observed_plugin_manifest_sha256/.test(error.message),
    "an incomplete InstallationIdentity is refused, not filled in",
  );
  // One run has one install mode: a cell from another mode is refused.
  const otherMode = structuredClone(gradedCells);
  otherMode[2].installation.install_mode = "published";
  assert.throws(
    () => collectCells(otherMode, { pins, installMode: "checkout" }),
    (error) => error.reason === "cell-install-mode-mismatch",
    "a cell installed in another mode is refused",
  );
  // ...and the same contradiction is refused on the BARE path, where the record's own mode must not
  // be relabelled into the run's mode before it is compared.
  const bareForeign = HARNESSES.flatMap((harness) => TRACKS.map((track) => bareCell(harness, track, "smoke-not-implemented")));
  bareForeign[0].install_mode = "published";
  assert.throws(
    () => collectCells(bareForeign, { pins, installMode: "checkout" }),
    (error) => error.reason === "cell-install-mode-mismatch" && /published/.test(error.message),
    "a bare cell whose artifact records another install mode is refused, not relabelled",
  );

  // ---- attempt-qualified physical names, overwrite disabled, 90-day retention ----
  const plan = uploadPlan({ runId: 9000000001, attempt: 1 });
  assert.deepEqual(plan.map((entry) => entry.name), [
    "harness-eval-result-9000000001-1",
    "harness-eval-verify-reports-9000000001-1",
  ]);
  for (const entry of plan) {
    assert.equal(entry.overwrite, false, `${entry.name} must not overwrite`);
    assert.equal(entry.retentionDays, 90, `${entry.name} keeps 90 days`);
  }
  assert.notDeepEqual(uploadPlan({ runId: 9000000001, attempt: 2 }).map((e) => e.name), plan.map((e) => e.name), "a rerun gets its own names");
  assert.throws(
    () => uploadPlan({ runId: null, attempt: 1 }),
    (error) => error.reason === "run-identity-missing",
    "an unqualified name is refused rather than reused",
  );

  // ---- the summary is rendered from the same validated object that is uploaded ----
  const summary = renderSummary(result);
  const rows = summary.split("\n").filter((line) => /^\|\s*(claude-code|codex|grok|opencode|pi|cursor)\s*\|/.test(line));
  assert.equal(rows.length, 12, `the summary renders twelve cell rows, not ${rows.length}`);
  const cursorRow = rows.find((line) => /^\|\s*cursor\s*\|\s*pinned\s*\|/.test(line));
  assert.ok(cursorRow, "cursor is present in the summary");
  assert.match(cursorRow, /could-not-run/);
  assert.match(cursorRow, /missing-api-key/);
  for (const row of rows) {
    assert.match(row, /\|\s*(pass|fail|could-not-run)\s*\|/, `a verdict word appears in ${row}`);
  }
  // The observed CLI version column is filled from the cell itself, never re-derived.
  const claudeRow = rows.find((line) => /^\|\s*claude-code\s*\|\s*pinned\s*\|/.test(line));
  const observedVersion = result.cells.find((c) => c.harness === "claude-code" && c.track === "pinned").installation
    .observed_cli_version;
  assert.ok(claudeRow.includes(observedVersion ?? "not observed"), `the observed version appears in the summary: ${claudeRow}`);
  assert.match(summary, /Blocks release|No effect|newest warning/, "each row carries its release effect");

  // ---- the write path: atomic, and the summary on disk is the summary of the uploaded record ----
  const written = writeResult({ outDir, result, summary });
  assert.equal(written.resultPath, join(outDir, RESULT_FILENAME));
  assert.equal(existsSync(`${written.resultPath}.partial`), false, "no partial file survives the rename");
  const onDisk = JSON.parse(readFileSync(written.resultPath, "utf8"));
  assert.deepEqual(onDisk, result, "the file on disk is the record that was validated");
  assert.equal(readFileSync(written.summaryPath, "utf8"), summary, "the page is rendered from the same object");

  // ---- verify reports are bundled under invocation-specific paths, from the real report bytes ----
  const realReport = runVerifyCase("verify-button-drift", { keep: true });
  const verifyDir = join(sandbox, "verify-reports");
  const bundled = join(verifyDir, "harness-eval-verify-button-drift", "reports");
  mkdirSync(bundled, { recursive: true });
  const realReportBytes = readFileSync(realReport.bound_path);
  writeFileSync(join(bundled, "verify-button-drift.json"), realReportBytes);
  const receipt = writeVerifyReceipt({ outDir, verifyDir });
  assert.equal(receipt.reports.length, 1);
  assert.equal(receipt.reports[0].path, "harness-eval-verify-button-drift/reports/verify-button-drift.json");
  assert.equal(receipt.reports[0].sha256, createHash("sha256").update(realReportBytes).digest("hex"), "the digest is of the real report bytes");
  assert.deepEqual(
    JSON.parse(readFileSync(join(outDir, "verify-reports", "INDEX.json"), "utf8")),
    receipt,
    "the index on disk is the receipt that was returned",
  );
  // An attempt with no reports states that, and still produces a bundle rather than an absent one.
  const emptyReceipt = writeVerifyReceipt({ outDir: join(sandbox, "grade-empty"), verifyDir: join(sandbox, "no-reports") });
  assert.deepEqual(emptyReceipt.reports, []);
  assert.match(emptyReceipt.reason, /no verify report artifact arrived/);
  rmSync(realReport.dir, { recursive: true, force: true });

  // ---- the entry point: a refusal writes nothing, and a late throw leaves no result behind ----
  // Both legs drive main(), not a library function: the ordering inside the shell is exactly what
  // F-T8-2 broke, and an assertion on a directory no code path wrote cannot catch that.
  const entryEnv = {
    INSTALL_MODE: "checkout",
    GITHUB_RUN_ID: "9000000001",
    GITHUB_RUN_NUMBER: "7",
    GITHUB_RUN_ATTEMPT: "1",
    GITHUB_EVENT_NAME: "workflow_dispatch",
    GITHUB_SHA: dispatchSha,
    GITHUB_REPOSITORY: repo,
    GITHUB_REF_NAME: "main",
  };
  // The Actions API boundary: a pinned job payload, so the entry point is driven with fixed bytes.
  const pinnedFetch = async () => ({ ok: true, json: async () => ({ jobs: FIXED_SMOKE_JOBS, total_count: FIXED_SMOKE_JOBS.length }) });
  const allBare = HARNESSES.flatMap((harness) => TRACKS.map((track) => bareCell(harness, track, "smoke-not-implemented")));

  const refusedOut = join(sandbox, "grade-entry-refused");
  const refusedCode = await main({
    env: {
      ...entryEnv,
      HARNESS_EVAL_CELLS_DIR: writeCellArtifacts(join(sandbox, "cells-entry-11"), allBare.slice(0, 11)),
      HARNESS_EVAL_VERIFY_DIR: join(sandbox, "no-verify"),
      HARNESS_EVAL_OUT_DIR: refusedOut,
    },
    fetchImpl: pinnedFetch,
  });
  assert.equal(refusedCode, 1, "eleven cells exit 1 through the entry point");
  assert.deepEqual(listFiles(refusedOut), [], "a refused cell set leaves no file behind, not one written and orphaned");

  // A throw AFTER the result write — here an unwritable step summary — must not leave the artifact.
  const crashOut = join(sandbox, "grade-entry-crash");
  const summaryAsDir = join(sandbox, "summary-is-a-directory");
  mkdirSync(summaryAsDir, { recursive: true });
  const crashCode = await main({
    env: {
      ...entryEnv,
      HARNESS_EVAL_CELLS_DIR: writeCellArtifacts(join(sandbox, "cells-entry-12"), allBare),
      HARNESS_EVAL_VERIFY_DIR: join(sandbox, "no-verify"),
      HARNESS_EVAL_OUT_DIR: crashOut,
      GITHUB_STEP_SUMMARY: summaryAsDir,
    },
    fetchImpl: pinnedFetch,
  });
  assert.equal(crashCode, 1, "a failure after the writes exits 1");
  assert.equal(
    existsSync(join(crashOut, RESULT_FILENAME)),
    false,
    "a failed run leaves no result file, so the uploaded artifact can never read as a success",
  );

  // ---- the exit rule: one function, and nothing but a cell verdict reaches it ----
  const gradedRun = structuredClone(gradedCells);
  assert.equal(recorderExit({ cells: gradedRun }).code, 1, "a could-not-run cell exits non-zero (cursor on day one)");
  assert.equal(recorderExit({ cells: gradedRun }).reason, "could-not-run");

  const allPass = gradedCells.map((cell) => ({ ...cell, verdict: "pass" }));
  assert.equal(recorderExit({ cells: allPass }).code, 0, "twelve passes exit zero");
  const newestOnlyFail = allPass.map((cell) =>
    cell.track === "newest" ? { ...cell, verdict: "fail" } : cell,
  );
  assert.equal(recorderExit({ cells: newestOnlyFail }).code, 0, "newest-only graded failures exit zero");
  const pinnedFail = allPass.map((cell) =>
    cell.harness === "claude-code" && cell.track === "pinned" ? { ...cell, verdict: "fail" } : cell,
  );
  assert.equal(recorderExit({ cells: pinnedFail }).code, 1, "a live pinned failure exits non-zero");
  // Later checks, controls and drift never change it.
  assert.equal(
    recorderExit({ cells: newestOnlyFail, controls: [{ control_id: "exit0-denied-read", verdict: "fail", reason: "denied_tool_call" }], laterChecks: [{ verdict: "fail" }] }).code,
    0,
    "a failing later check or control cannot change the exit",
  );
  assert.equal(
    recorderExit({ cells: allPass, controls: [{ control_id: "exit0-denied-read", verdict: "fail", reason: "denied_tool_call" }] }).code,
    0,
    "a failing control cannot change the exit",
  );

  // ---- the recorder job block: no environment, no secret, actions: read, if: always() ----
  const workflow = readWorkflow();
  assert.deepEqual(inspectWorkflowDeclaration(workflow.yaml).failures, [], "the workflow still satisfies the T1 declaration rules");
  const grade = workflow.yaml.jobs.grade;
  assert.ok(grade, "the recorder job exists");
  assert.equal(grade.if, "always()", "the recorder runs even when the smoke matrix failed");
  assert.equal(grade.environment, undefined, "the recorder holds no environment");
  assert.deepEqual(grade.permissions, { contents: "read", actions: "read" }, "contents: read + actions: read only");
  const gradeText = JSON.stringify(grade);
  assert.doesNotMatch(gradeText, /secrets\s*(?:\.|\[)/, "the recorder binds no secret");
  const recorderStep = grade.steps.find((step) => String(step.run ?? "").includes(RECORDER));
  assert.ok(recorderStep, `a step runs ${RECORDER}`);
  assert.equal(recorderStep.env.INSTALL_MODE, "${{ inputs.install_mode }}", "the mode reaches the recorder from the dispatch input");
  const gradeUploads = grade.steps.filter((step) => /actions\/upload-artifact/.test(String(step.uses ?? "")));
  assert.equal(gradeUploads.length, 2, "the recorder uploads the result and the verify reports");
  assert.deepEqual(
    gradeUploads.map((step) => step.with.name),
    ["harness-eval-result-${{ github.run_id }}-${{ github.run_attempt }}", "harness-eval-verify-reports-${{ github.run_id }}-${{ github.run_attempt }}"],
  );
  for (const step of gradeUploads) {
    assert.equal(step.with.overwrite, false, `${step.with.name} must not overwrite`);
    assert.equal(step.with["retention-days"], 90, `${step.with.name} keeps 90 days`);
    assert.match(String(step.if ?? ""), /always\(\)/, `${step.with.name} uploads even when the recorder refused`);
  }

  // ---- the hosted half is not executed here, and says so ----
  const notExecuted = [
    {
      leg: "recorder-in-workflow_dispatch",
      reason:
        "no harness-eval run exists for this branch: the workflow is only dispatchable from the default branch, so the recorder's own run, its smoke-job timestamps and its uploaded artifact are read at the sprint gate",
      owner: "T1",
    },
    {
      leg: "smoke-job-timestamps",
      reason:
        "evaluation_started_at/completed_at must equal the real smoke matrix timestamps; no run of this workflow exists yet, so the copy is proven on the real Actions API job list of another run in this repository",
      owner: "T1",
    },
    {
      leg: "live-grade-verdicts",
      reason: "T7's graders and T5's adapter produce the first graded cells; until they land every cell is could-not-run",
      owner: "T5/T7",
    },
  ];
  for (const leg of notExecuted) assert.ok(leg.reason.length > 30, `${leg.leg} states why it was not executed`);

  writeRecorderReport({
    flow: "FLOW-GRD-01-TWELVE-CELLS",
    task: "T8",
    recorder: RECORDER,
    artifact: `harness-eval-result-${context.runId}-${context.attempt}`,
    result_file: RESULT_FILENAME,
    pins_sha256: result.pins_sha256,
    cells: result.cells.length,
    harnesses: [...new Set(result.cells.map((cell) => cell.harness))].sort(),
    verdicts: result.cells.map((cell) => ({
      cell: `${cell.harness}/${cell.track}`,
      verdict: cell.verdict,
      reason: cell.reason,
      observed_cli_version: cell.installation.observed_cli_version,
    })),
    timestamps: {
      evaluation_started_at: result.evaluation_started_at,
      evaluation_completed_at: result.evaluation_completed_at,
      source: "pinned job payload in tests/sprint-01/grd-01-twelve-cells.test.mjs (FIXED_SMOKE_JOBS)",
      source_run: null,
      source_workflow: null,
      note: "the refusals and the copy are proven on payload bytes this check owns; the smoke-matrix run is read at the gate",
      live_observation: liveObservation,
    },
    upload_plan: plan,
    exit: recorderExit({ cells: result.cells }),
    negative_controls: [
      "drop-one-cell -> cells-incomplete (cursor/pinned named), 0 files written",
      "duplicate pair -> cells-duplicate (claude-code/pinned named)",
      "verdict outside pass|fail|could-not-run -> verdict-vocabulary",
      "bare cell claiming pass -> cell-state-not-a-verdict",
      "incomplete InstallationIdentity -> schema-invalid",
      "cell from another install mode -> cell-install-mode-mismatch",
      "bare cell whose artifact records another install mode -> cell-install-mode-mismatch",
      "no required smoke job -> timestamps-missing",
      "smoke job that never completed -> timestamps-missing",
      "smoke job that never started -> timestamps-missing",
      "unqualified artifact name -> run-identity-missing",
      "a throw after the result write -> no result file survives (discarded)",
    ],
    not_executed: notExecuted,
  });

  t.diagnostic(`cells=${result.cells.length} harnesses=${new Set(result.cells.map((c) => c.harness)).size}`);
  t.diagnostic(`pins_sha256=${result.pins_sha256}`);
  t.diagnostic(`timestamps=${result.evaluation_started_at}..${result.evaluation_completed_at} (pinned payload; live ${JSON.stringify(liveObservation)})`);
  t.diagnostic(`exit=${recorderExit({ cells: result.cells }).code} ${recorderExit({ cells: result.cells }).reason}`);

  rmSync(sandbox, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// T10 — the fail-closed half of the twelve-cell promise: every cell exists, cursor reads
// could-not-run `missing-api-key` from the guard's own credential check, and the four
// adapter-pending harnesses read could-not-run with their own named reasons.
//
// What is real here: the on-disk pins bytes, a real `--version` probe of each installed CLI, the
// runtime's real invocation-guard, the recorder's real twelve-cell validator applied to the cells
// this registry produces, and the module bytes of the registry itself (scanned to prove the cursor
// reason is not a constant written there). The newest-version lookup seam is driven with the pinned
// command strings, never with a restated command.
// ---------------------------------------------------------------------------

const SURVEYED_NEWEST = {
  // 02-system-components.md § version-lookup: the observed versions on 2026-10-06.
  "claude-code": "2.1.291",
  codex: "0.160.1",
  grok: "1.0.46",
  opencode: "1.18.34",
  pi: "1.0.4",
  cursor: "2026.10.01-e373342",
};

/**
 * A lookup resolver whose `exec` answers from the pins' own command strings, so a simulated run
 * cannot restate a command the pins own. `failing` names a harness whose lookup throws.
 */
function simulatedResolver(pins, { failing = null, versions = SURVEYED_NEWEST } = {}) {
  const byCommand = new Map(Object.entries(pins.manifest.harnesses).map(([harness, pin]) => [pin.newest_lookup, harness]));
  const commands = [];
  const resolver = createVersionResolver({
    manifest: pins.manifest,
    exec: (command) => {
      commands.push(command);
      const harness = byCommand.get(command);
      if (harness === undefined) throw new Error(`unexpected lookup command: ${command}`);
      if (harness === failing) throw new Error(`simulated lookup failure for ${harness}`);
      const version = versions[harness];
      // Cursor's lookup is the install script; its version is the first downloads.cursor.com/lab token.
      return harness === "cursor"
        ? `curl -fsSL https://downloads.cursor.com/lab/${version}/linux/x64/agent-cli-package.tar.gz`
        : `${version}\n`;
    },
  });
  return { resolver, commands };
}

/** The harness-smoke binding shape as a child env: five bindings present, Cursor's absent. */
function smokeShapedEnv() {
  const env = { ...SCRUBBED_ENV };
  const placeholders = new Set(Object.values(SMOKE_BINDINGS));
  for (const name of placeholders) env[name] = `placeholder-not-a-credential-${name.toLowerCase()}`;
  return env;
}

// § CommandTranslation / CredentialBinding: the five bindings harness-smoke supplies, and Cursor's
// own name, which harness-smoke does not.
const SMOKE_BINDINGS = {
  "claude-code": "ANTHROPIC_API_KEY",
  codex: "CODEX_API_KEY",
  grok: "XAI_API_KEY",
  opencode: "ANTHROPIC_API_KEY",
  pi: "GEMINI_API_KEY",
};
const CURSOR_BINDING = "CURSOR_API_KEY";

test("FLOW-GRD-01-TWELVE-CELLS adapter cells", async (t) => {
  testsExecuted += 1;
  const pins = loadPins();
  assert.match(pins.pins_sha256, /^[0-9a-f]{64}$/, "pins_sha256 is a 64-hex digest");

  // Real observations: each installed CLI reports its own version, or null when it is absent.
  const observed = Object.fromEntries(HARNESSES.map((harness) => [harness, probeObservedVersion(harness)]));

  // ---- day one: the harness-smoke binding shape, and no adapter loaded -------------------
  const env = smokeShapedEnv();
  assert.equal(Boolean(env[CURSOR_BINDING]), false, "cursor's binding is absent before any refusal is asserted");
  for (const name of new Set(Object.values(SMOKE_BINDINGS))) {
    assert.equal(typeof env[name], "string", `${name} is present, so absence is the only thing that can refuse`);
  }

  const { resolver, commands } = simulatedResolver(pins);
  const dayOne = planCells({ manifest: pins.manifest, env, adapters: new Set(), resolver, observed, installMode: "checkout" });

  // The twelve-cell rule, asserted on the cells this registry actually produced.
  assert.equal(dayOne.pairs.length, 12, "twelve (harness, track) pairs are enumerated, not discovered");
  assert.equal(new Set(dayOne.pairs).size, 12, "no duplicate pair");
  assert.equal(dayOne.cells.length + dayOne.adapterOwned.length, 12, "no cell is dropped between the registry and the adapters");
  assert.deepEqual(dayOne.adapterOwned, [], "no adapter is loaded in this worktree");
  assert.equal(dayOne.cells.length, 12);
  assert.deepEqual(
    [...new Set(dayOne.cells.map((cell) => cell.harness))].sort(),
    [...HARNESSES].sort(),
    "six harnesses, cursor included",
  );
  for (const cell of dayOne.cells) {
    assert.equal(cell.verdict, "could-not-run", `${cell.harness}/${cell.track} has graded nothing, so it may not pass`);
    assert.ok(cell.reason && cell.reason.length > 0, `${cell.harness}/${cell.track} names its reason`);
    assert.ok(
      Object.hasOwn(cell.installation, "observed_cli_version"),
      `${cell.harness}/${cell.track} carries the observed version field`,
    );
  }
  // The observed version is the CLI's own, and an uninstalled CLI is null — never invented.
  const claudePinned = dayOne.cells.find((cell) => cell.harness === "claude-code" && cell.track === "pinned");
  assert.equal(claudePinned.installation.observed_cli_version, observed["claude-code"], "the observed version is the probe's");
  assert.equal(claudePinned.installation.requested_cli_version, pins.manifest.harnesses["claude-code"].pinned_cli_version, "the pinned request is the pins authority's");
  const cursorPinned = dayOne.cells.find((cell) => cell.harness === "cursor" && cell.track === "pinned");
  assert.equal(cursorPinned.installation.observed_cli_version, null, "no Cursor CLI is installed here, and none is invented");
  assert.equal(commands.length, 0, "no adapter is loaded, so no newest lookup ran at all — a lookup can never stand in for a grade");

  // The default path a caller takes: no manifest argument, so the registry loads the pins bytes.
  const defaulted = planCells({ env, adapters: new Set() });
  assert.equal(defaulted.cells.length, 12, "the registry loads the pins authority itself");
  assert.equal(
    defaulted.cells.find((cell) => cell.harness === "codex" && cell.track === "pinned").installation.requested_cli_version,
    pins.manifest.harnesses.codex.pinned_cli_version,
    "the pinned request still comes from the pins authority when the caller passes no manifest",
  );

  // ---- cursor reads could-not-run missing-api-key from the guard's own check -------------
  const cursorDecision = guardInvocation({ harness: "cursor", stance: null, env });
  assert.equal(cursorDecision.credential.present, false, "the guard's own check sees the absent binding");
  assert.equal(cursorDecision.refusal.check, "credential", "the refusal is the credential check, not the stance");
  assert.equal(cursorDecision.refusal.model_requests, 0, "nothing was spawned before the refusal");
  assert.equal(cursorDecision.refusal.decided_before, "model-request");
  for (const track of TRACKS) {
    const cell = dayOne.cells.find((candidate) => candidate.harness === "cursor" && candidate.track === track);
    assert.equal(cell.verdict, "could-not-run", `cursor/${track} is never a pass`);
    assert.equal(cell.reason, cursorDecision.refusal.reason, `cursor/${track} carries the guard's own reason, not a constant`);
    assert.equal(cell.source, CELL_SOURCES.GUARD, `cursor/${track} was decided by the guard`);
  }
  assert.equal(cursorPinned.reason, "missing-api-key", "the AC's own words, produced by the guard");

  // ...and that reason cannot be a string written in this task's modules.
  for (const modulePath of [ADAPTERS_DIR + "/registry.mjs", ADAPTERS_DIR + "/absent.mjs"]) {
    assert.equal(
      readFileSync(modulePath, "utf8").includes(cursorPinned.reason),
      false,
      `${modulePath} must not spell the cursor reason; it comes from the guard`,
    );
  }

  // ---- a key-present environment must not refuse: the control a hardcoded reason fails ----
  const keyedEnv = { ...env, [CURSOR_BINDING]: "placeholder-not-a-credential-cursor" };
  const keyedCursor = planCells({ manifest: pins.manifest, env: keyedEnv, adapters: new Set(), resolver, observed, installMode: "checkout" });
  const keyedCursorPinned = keyedCursor.cells.find((cell) => cell.harness === "cursor" && cell.track === "pinned");
  assert.equal(keyedCursor.decisions.find((d) => d.harness === "cursor").credential.present, true, "the guard sees the binding now");
  assert.notEqual(keyedCursorPinned.reason, cursorPinned.reason, "a per-harness constant would refuse here too");
  assert.equal(keyedCursorPinned.reason, absentReason("cursor"), "with a key present, the honest reason is the absent adapter");
  assert.equal(keyedCursorPinned.source, CELL_SOURCES.ABSENT);

  // ---- the four adapter-pending harnesses are present with distinct named reasons --------
  assert.deepEqual([...ADAPTER_PENDING], ["codex", "grok", "opencode", "pi"], "the four pending harnesses");
  const pendingReasons = [];
  for (const harness of ADAPTER_PENDING) {
    for (const track of TRACKS) {
      const cell = dayOne.cells.find((candidate) => candidate.harness === harness && candidate.track === track);
      assert.ok(cell, `${harness}/${track} exists`);
      assert.equal(cell.verdict, "could-not-run", `${harness}/${track} is never a pass`);
      assert.equal(cell.reason, absentReason(harness), `${harness}/${track} carries its own named reason`);
      // Distinctness alone lets a meaningless string through, so pin the documented shape.
      assert.match(cell.reason, new RegExp(`^${harness}-adapter-not-implemented$`), `${harness}/${track} names why nothing was graded`);
      assert.equal(cell.source, CELL_SOURCES.ABSENT);
      assert.notEqual(cell.reason, cursorPinned.reason, `${harness} is not reported as a key problem`);
    }
    pendingReasons.push(absentReason(harness));
  }
  assert.equal(new Set(pendingReasons).size, 4, "four distinct named reasons, not one shared string");
  for (const harness of HARNESSES) assert.ok(ABSENT_REASONS[harness], `${harness} has a named absent reason`);
  assert.throws(() => absentReason("not-a-harness"), /no absent reason/, "an unknown harness cannot borrow a reason");

  // ---- a failed newest lookup keeps the cell and names the lookup ------------------------
  const failing = simulatedResolver(pins, { failing: "cursor" }).resolver;
  const lookupFailed = planCells({
    manifest: pins.manifest,
    // A key present AND an adapter loaded is the only way the lookup is reached at all.
    env: keyedEnv,
    adapters: new Set(["cursor"]),
    resolver: failing,
    observed,
    installMode: "checkout",
  });
  assert.equal(lookupFailed.pairs.length, 12, "the lookup failure did not drop a pair");
  assert.equal(lookupFailed.cells.length + lookupFailed.adapterOwned.length, 12, "the cell count stays at twelve");
  const unresolvedCursor = lookupFailed.cells.find((cell) => cell.harness === "cursor" && cell.track === "newest");
  assert.ok(unresolvedCursor, "cursor/newest is present as a cell, not omitted");
  assert.equal(unresolvedCursor.verdict, "could-not-run");
  assert.equal(unresolvedCursor.reason, LOOKUP_FAILED_REASON, "the reason names the lookup");
  assert.equal(unresolvedCursor.installation.requested_cli_version, null, "no version is substituted for the failed lookup");
  assert.equal(unresolvedCursor.source, CELL_SOURCES.LOOKUP);
  assert.deepEqual(
    lookupFailed.adapterOwned.map((entry) => entry.pair),
    ["cursor/pinned"],
    "pinned needs no lookup, so it is the adapter's to grade",
  );
  // The credential still outranks the lookup: the keyless cursor cell never mentions a lookup.
  assert.equal(
    dayOne.cells.find((cell) => cell.harness === "cursor" && cell.track === "newest").reason,
    cursorDecision.refusal.reason,
    "the credential check is decided before any lookup",
  );

  // A newest cell with no resolver is a caller error, named — never a silent unresolved version.
  assert.throws(
    () => planCells({ manifest: pins.manifest, env: keyedEnv, adapters: new Set(["cursor"]) }),
    (error) => error.reason === "resolver-missing" && error.detail.track === "newest",
    "a newest cell without a resolver is refused by name",
  );

  // ---- the recorder's own validator accepts these cells, and refuses a dropped one --------
  const accepted = collectCells(dayOne.cells, { pins, installMode: "checkout" });
  assert.equal(accepted.length, 12);
  assert.equal(new Set(accepted.map((cell) => `${cell.harness}/${cell.track}`)).size, 12);
  assert.equal(new Set(accepted.map((cell) => cell.harness)).size, 6);
  for (const cell of accepted) assert.notEqual(cell.verdict, "pass", "a could-not-run cell never reads as a pass");

  const droppedPair = "cursor/pinned";
  const dropped = dayOne.cells.filter((cell) => `${cell.harness}/${cell.track}` !== droppedPair);
  assert.equal(dropped.length, 11, "the mutation drops exactly one cell");
  assert.throws(
    () => collectCells(dropped, { pins, installMode: "checkout" }),
    (error) => error.reason === "cells-incomplete" && error.details.missing.includes(droppedPair),
    "eleven cells produced here are refused with cells-incomplete naming the absent cell",
  );
  const duplicated = [...dayOne.cells, dayOne.cells[0]];
  assert.throws(
    () => collectCells(duplicated, { pins, installMode: "checkout" }),
    (error) => error.reason === "cells-duplicate",
    "a thirteenth record cannot complete an eleven-cell set",
  );

  // ---- the hosted half: the downloaded artifact, when one exists -------------------------
  let live = "absent";
  if (existsSync(LIVE_ARTIFACT)) {
    const artifact = JSON.parse(readFileSync(LIVE_ARTIFACT, "utf8"));
    assert.equal(artifact.cells.length, 12, "the hosted artifact carries twelve cells");
    assert.equal(new Set(artifact.cells.map((cell) => `${cell.harness}/${cell.track}`)).size, 12);
    assert.ok(artifact.cells.some((cell) => cell.harness === "cursor"), "cursor is in the hosted artifact");
    const hosted = artifact.cells.find((cell) => cell.harness === "cursor" && cell.track === "pinned");
    assert.equal(hosted.verdict, "could-not-run");
    assert.equal(hosted.reason, "missing-api-key", "cursor/pinned reads could-not-run missing-api-key on a real run");
    assert.match(artifact.pins_sha256, /^[0-9a-f]{64}$/);
    live = "validated";
  }

  mkdirSync(REPORT_DIR, { recursive: true });
  writeFileSync(
    join(REPORT_DIR, "grd-01-twelve-cells-adapters.json"),
    `${JSON.stringify(
      {
        flow: "FLOW-GRD-01-TWELVE-CELLS",
        task: "T10",
        pins_sha256: pins.pins_sha256,
        cells: dayOne.cells.length,
        pairs: dayOne.pairs.length,
        harnesses: [...new Set(dayOne.cells.map((cell) => cell.harness))].sort(),
        cells_detail: dayOne.cells.map((cell) => ({
          cell: `${cell.harness}/${cell.track}`,
          verdict: cell.verdict,
          reason: cell.reason,
          source: cell.source,
          observed_cli_version: cell.installation.observed_cli_version,
        })),
        cursor_reason: { value: cursorPinned.reason, from_guard: cursorDecision.refusal.check, model_requests: cursorDecision.refusal.model_requests },
        pending_adapters: Object.fromEntries(ADAPTER_PENDING.map((harness) => [harness, absentReason(harness)])),
        lookup_mutation: {
          reason: unresolvedCursor.reason,
          requested: unresolvedCursor.installation.requested_cli_version,
          cells_after_failure: lookupFailed.cells.length + lookupFailed.adapterOwned.length,
        },
        negative_controls: [
          "drop one cell -> cells-incomplete (cursor/pinned named)",
          "duplicate record -> cells-duplicate",
          "cursor key present -> not missing-api-key, the absent-adapter reason",
          "cursor reason spelled in registry.mjs/absent.mjs -> refused by the module scan",
          "failed newest lookup -> version-lookup-failed, requested null, twelve cells kept",
          "unknown harness -> no absent reason invented",
        ],
        live_artifact: { path: LIVE_ARTIFACT, status: live },
      },
      null,
      2,
    )}\n`,
  );

  t.diagnostic(`cells=${dayOne.cells.length} pairs=${dayOne.pairs.length} harnesses=${[...new Set(dayOne.cells.map((c) => c.harness))].sort().join(",")}`);
  t.diagnostic(`cursor/pinned=${cursorPinned.verdict} ${cursorPinned.reason} (check=${cursorDecision.refusal.check})`);
  t.diagnostic(`pending=${ADAPTER_PENDING.map((h) => absentReason(h)).join(",")}`);
  t.diagnostic(`lookup_mutation=${unresolvedCursor.reason} cells=${lookupFailed.cells.length + lookupFailed.adapterOwned.length}`);
  t.diagnostic(`live_artifact=${live}`);
});
