// T19 — the smoke steps' refusal ladders, pinned as records: the shell never carries a verdict.
//
// What is pinned here, with exact equality, as the code behaves TODAY:
//   * `install.mjs codex pinned` — an adapter the tree does not implement refuses with the named
//     record (reason `codex-adapter-not-implemented`), exit 0, and `install.json` is the only file
//     the cell dir gains: no spawn, no evidence, no install.
//   * `model-step.mjs codex pinned` — the guard refuses before any spawn: the binding row names the
//     credential names it checked and booleans only, the cell record is the registry's own
//     `could-not-run / missing-api-key / invocation-guard` cell with every field pinned, and the
//     leg writes exactly two files. `failure.json` is pinned ABSENT here on purpose: the leg's
//     failure file is the workflow's fallback for a leg that wrote no cell at all, and this leg
//     wrote one — cell.json itself carries the reason. If a pin ever shows failure.json appearing
//     for a registry-refused cell, that is a behavior change, not a repair.
//   * `bindingRow` — both row shapes, with and without the binding name in the env: names,
//     booleans and the deciding strings only, never a value.
//   * `installStep` through its own seams — the two no-spawn refusals: an unsubstituted matrix
//     track (`<track>`) and a pins manifest that names no pin for the harness. Each refusal is the
//     record the module returns AND the bytes it left in install.json.
//
// What is NOT here: no credential (the child env has no binding name in it — presence of one is
// pinned on the imported function with an inert non-empty string, never sent anywhere), no
// network (every pinned path refuses before spawn), no graded claude-code leg, no hosted run, and
// no fixture fabrication: the real CLIs run as real subprocesses over the real pins manifest.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { REGISTERED } from "../../test/harness/adapters/registry.mjs";
import { SECRET_NAME } from "../../test/harness/runtime/guard.mjs";
import { installStep } from "../../test/harness/smoke/install.mjs";
import { BINDING_FILE, FAILURE_FILE, bindingRow } from "../../test/harness/smoke/model-step.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..", "..");
const INSTALL_CLI = join(ROOT, "test/harness/smoke/install.mjs");
const MODEL_STEP_CLI = join(ROOT, "test/harness/smoke/model-step.mjs");

/** The child env: the parent's non-credential environment. Presence of a binding name is pinned separately. */
function keylessChildEnv() {
  const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !SECRET_NAME.test(name)));
  assert.equal(env.CODEX_API_KEY, undefined, "the pinned child must run with no codex binding in its env");
  return env;
}

function scratchDir(label) {
  return mkdtempSync(join(tmpdir(), `pp-t19-${label}-`));
}

// The refusal record the install slot leaves for a harness with no adapter in this tree, exactly
// as installStep builds it: the requested pin is named, `installed` stays false, the shell exits 0.
const CODEX_INSTALL_REFUSAL = {
  harness: "codex",
  track: "pinned",
  install_mode: "checkout",
  requested_cli_version: "0.160.1",
  adapter_loaded: false,
  installed: false,
  exit_code: null,
  reason: "codex-adapter-not-implemented",
};

// The binding row exactly as bindingRow resolves it for codex: the pins manifest's two names, the
// booleans, and the deciding verdict strings. No credential value ever appears in any field.
const CODEX_BINDING_ROW_ABSENT = {
  harness: "codex",
  credential_env: "SMOKE_CODEX_KEY",
  binding_env: "CODEX_API_KEY",
  present: false,
  present_name: null,
  checked: ["CODEX_API_KEY"],
  verdict: "could-not-run",
  reason: "missing-api-key",
};

const CODEX_BINDING_ROW_PRESENT = {
  harness: "codex",
  credential_env: "SMOKE_CODEX_KEY",
  binding_env: "CODEX_API_KEY",
  present: true,
  present_name: "CODEX_API_KEY",
  checked: ["CODEX_API_KEY"],
  verdict: "bound",
  reason: null,
};

// The registry's refusal cell, field for field (recorded_at pinned separately: it is a wall clock).
const CODEX_CELL_REFUSAL = {
  harness: "codex",
  track: "pinned",
  installation: {
    requested_cli_version: "0.160.1",
    resolved_cli_version: null,
    observed_cli_version: null,
    install_mode: "checkout",
    plugin_revision: null,
    expected_plugin_manifest_sha256: null,
    observed_plugin_manifest_sha256: null,
    loaded_plugin_root: null,
    plugin_load_evidence: null,
  },
  verdict: "could-not-run",
  reason: "missing-api-key",
  invocation_id: null,
  check_id: null,
  process_exit_code: null,
  source: "invocation-guard",
  denied_tool_call: null,
  evidence_paths: [],
  report_paths: [],
  observed_verify_outcome: null,
  checks: ["command_list", "status", "verify", "question_before_expensive_work"].map((check_id) => ({
    check_id,
    verdict: "could-not-run",
    reason: "missing-api-key",
    source: "invocation-guard",
  })),
};

test("t19-install-cli-refuses-unimplemented-adapter", (t) => {
  const dir = scratchDir("install-cli");
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const cellDir = join(dir, "cell");

  const run = spawnSync(process.execPath, [INSTALL_CLI, "codex", "pinned", "--cell-dir", cellDir], {
    encoding: "utf8",
    env: keylessChildEnv(),
    timeout: 60_000,
  });

  assert.equal(run.status, 0, `the step exits 0; the record reports, the shell does not (stderr: ${run.stderr})`);
  assert.equal(run.stdout, '{"harness":"codex","track":"pinned","installed":false,"reason":"codex-adapter-not-implemented"}\n');

  assert.deepEqual(readdirSync(cellDir).sort(), ["install.json"], "a no-spawn refusal leaves no evidence dir");
  const pinned = JSON.parse(readFileSync(join(cellDir, "install.json"), "utf8"));
  assert.deepEqual(pinned, CODEX_INSTALL_REFUSAL);
  assert.ok(REGISTERED.includes("claude-code") && !REGISTERED.includes("codex"), "the tree registers exactly claude-code today");
});

test("t19-model-step-cli-records-guard-refusal", (t) => {
  const dir = scratchDir("model-step-cli");
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const cellDir = join(dir, "cell");

  const run = spawnSync(process.execPath, [MODEL_STEP_CLI, "codex", "pinned", "--cell-dir", cellDir], {
    encoding: "utf8",
    env: keylessChildEnv(),
    timeout: 60_000,
  });

  assert.equal(run.status, 0, `the step exits 0; the verdict reports, the shell does not (stderr: ${run.stderr})`);
  // Line 1 is the binding row, line 2 the step summary: both serialized exactly as observed.
  assert.equal(
    run.stdout,
    '{"harness":"codex","credential_env":"SMOKE_CODEX_KEY","binding_env":"CODEX_API_KEY","present":false,"present_name":null,"checked":["CODEX_API_KEY"],"verdict":"could-not-run","reason":"missing-api-key"}\n'
      + '{"harness":"codex","track":"pinned","verdict":"could-not-run","cell_state":null,"reason":"missing-api-key"}\n',
  );

  assert.deepEqual(readdirSync(cellDir).sort(), [BINDING_FILE, "cell.json"], "the guard-refused leg writes the row and the cell, nothing else");
  const bindingPath = join(cellDir, BINDING_FILE);
  assert.equal(readFileSync(bindingPath, "utf8"), `${JSON.stringify(CODEX_BINDING_ROW_ABSENT)}\n`, "binding.json is the row serialized exactly as the step prints it");

  const cell = JSON.parse(readFileSync(join(cellDir, "cell.json"), "utf8"));
  const { recorded_at: stampedAt, ...pinnedCell } = cell;
  assert.deepEqual(pinnedCell, CODEX_CELL_REFUSAL);
  assert.equal(new Date(stampedAt).toISOString(), stampedAt, "recorded_at is an exact ISO-8601 instant");

  assert.equal(
    existsSync(join(cellDir, FAILURE_FILE)),
    false,
    "failure.json stays absent for a registry-refused cell: cell.json already carries the reason (the workflow reads failure.json only when no cell was written)",
  );
});

test("t19-binding-row-shapes-with-and-without-binding-name", () => {
  const keyless = { PATH: process.env.PATH };
  const withBinding = { ...keyless, CODEX_API_KEY: "present-only-never-read-never-sent" };

  assert.deepEqual(bindingRow({ harness: "codex", env: keyless }), CODEX_BINDING_ROW_ABSENT);
  assert.deepEqual(bindingRow({ harness: "codex", env: withBinding }), CODEX_BINDING_ROW_PRESENT);
  // The value itself is never carried: every field is a name, a boolean or a deciding string.
  const row = bindingRow({ harness: "codex", env: withBinding });
  assert.equal(JSON.stringify(row).includes("present-only-never-read-never-sent"), false, "no credential value appears in the row");
});

test("t19-install-step-refuses-unsubstituted-track", async (t) => {
  const dir = scratchDir("unsub-track");
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const cellDir = join(dir, "cell");

  const refused = await installStep({ harness: "claude-code", track: "<track>", cellDir });

  assert.deepEqual(refused, {
    harness: "claude-code",
    track: "<track>",
    install_mode: "checkout",
    requested_cli_version: null,
    adapter_loaded: true,
    installed: false,
    exit_code: null,
    reason: "install-track-unsubstituted",
  });
  assert.deepEqual(JSON.parse(readFileSync(join(cellDir, "install.json"), "utf8")), refused, "the record on disk is the record returned");
});

test("t19-install-step-refuses-missing-pin", async (t) => {
  const dir = scratchDir("missing-pin");
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const cellDir = join(dir, "cell");

  // claude-code HAS an adapter in this tree, so this reaches the version check: a pins manifest
  // that names no pin for the harness refuses with pinned-version-missing, spawning nothing.
  const refused = await installStep({ harness: "claude-code", track: "pinned", manifest: { harnesses: {} }, cellDir });

  assert.deepEqual(refused, {
    harness: "claude-code",
    track: "pinned",
    install_mode: "checkout",
    requested_cli_version: null,
    adapter_loaded: true,
    installed: false,
    exit_code: null,
    reason: "pinned-version-missing",
  });
  assert.deepEqual(JSON.parse(readFileSync(join(cellDir, "install.json"), "utf8")), refused, "the record on disk is the record returned");
  assert.deepEqual(readdirSync(cellDir).sort(), ["install.json"], "no spawn happened, so no evidence dir exists");
});
