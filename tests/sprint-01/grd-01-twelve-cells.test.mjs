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
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
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

test("FLOW-GRD-01-TWELVE-CELLS", async (t) => {
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
