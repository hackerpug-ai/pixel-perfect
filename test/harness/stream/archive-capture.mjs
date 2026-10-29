// Archive one REAL claude-code stdout stream, so the mapping table can cite captured bytes.
//
// The capture this produces is a keyless first turn: the CLI is started with an isolated config
// directory, stdin closed, auto-update off, and every credential name stripped from the child's
// environment. The CLI therefore emits its real `system/init` and `result` events and then stops at
// `Not logged in` — zero model calls, zero cost, and no secret in the record. That is enough to
// prove the session-identity and completion mapping on bytes the harness really wrote; it is NOT
// enough to qualify a version for grading, and the table says so.
//
// Nothing here invents an event. If the CLI is absent or the child is killed by the timeout, the
// archiver reports why and writes nothing.
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createCapture, spawnCaptured } from "../runtime/capture.mjs";
import { sha256Hex } from "../pins.mjs";
import { StreamError } from "./table.mjs";

export const STREAM_DIR = dirname(fileURLToPath(import.meta.url));
export const CAPTURE_DIR = join(STREAM_DIR, "captures");
export const HARNESS = "claude-code";

/** The argv of the keyless probe. `-p` with stream-json is the shape the graded invocations use. */
export const PROBE_ARGV = [
  "-p",
  "reply with the single word: ready",
  "--output-format",
  "stream-json",
  "--verbose",
  "--permission-mode",
  "dontAsk",
];

/** Every credential name the pins manifest and the harnesses know. None may reach the child. */
const SECRET_NAME = /^(SMOKE_[A-Z0-9_]+|ANTHROPIC_API_KEY|ANTHROPIC_AUTH_TOKEN|CLAUDE_CODE_OAUTH_TOKEN|CODEX_API_KEY|XAI_API_KEY|GEMINI_API_KEY|CURSOR_API_KEY)$/;

export function credentialNames(env = process.env) {
  return Object.keys(env).filter((name) => SECRET_NAME.test(name)).sort();
}

/** The child's environment: every credential name removed, the config directory isolated. */
export function probeEnv({ configDir, env = process.env } = {}) {
  const out = { ...env, CLAUDE_CONFIG_DIR: configDir, DISABLE_AUTOUPDATER: "1" };
  for (const name of Object.keys(out)) if (SECRET_NAME.test(name)) delete out[name];
  return out;
}

export function claudeOnPath({ env = process.env } = {}) {
  for (const dir of String(env.PATH ?? "").split(process.platform === "win32" ? ";" : ":")) {
    if (!dir) continue;
    const candidate = join(dir, "claude");
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

/**
 * Runs the keyless probe for real and returns the capture. No write, no secret, no model call:
 * the record's own `model_requests` stays empty because the guard is not consulted here and the
 * CLI refuses before dispatching (its `result` event carries `apiKeySource: "none"`).
 */
export async function captureFirstTurn({ timeout_ms = 90_000, env = process.env } = {}) {
  if (!claudeOnPath({ env })) return { available: false, reason: "claude-cli-absent", record: null };
  const configDir = mkdtempSync(join(tmpdir(), "pp-stream-probe-config-"));
  const removed = credentialNames(env);
  const capture = createCapture({
    harness: HARNESS,
    check_id: "stream-probe",
    cwd: process.cwd(),
    timeout_ms,
    stream_source: "live-subprocess",
    argv: PROBE_ARGV,
    invocation_id: `${HARNESS}-stream-probe`,
  });
  try {
    const status = await spawnCaptured({
      command: "claude",
      args: PROBE_ARGV,
      cwd: process.cwd(),
      env: probeEnv({ configDir, env }),
      capture,
      timeout_ms,
    });
    capture.finish(status);
    const record = capture.toRecord();
    return {
      available: true,
      reason: null,
      capture,
      record,
      credential_names_removed: removed,
      credential_names_in_child: [],
      timed_out: status.timed_out === true,
    };
  } finally {
    rmSync(configDir, { recursive: true, force: true });
  }
}

/** The archiver: writes `<id>.stdout.bin` + `<id>.capture.json` + `<id>.meta.json` under captures/. */
export async function archive({ id = "claude-code-keyless-first-turn", dir = CAPTURE_DIR, timeout_ms = 90_000 } = {}) {
  const run = await captureFirstTurn({ timeout_ms });
  if (!run.available) return { ok: false, reason: run.reason, path: null };
  if (run.timed_out) return { ok: false, reason: "probe-timed-out", path: null };
  mkdirSync(dir, { recursive: true });
  const record = run.capture.persist(dir);
  const stdoutPath = record.evidence_paths.find((path) => path.endsWith(".stdout.bin"));
  const observed = record.observations ?? [];
  const meta = {
    capture_id: id,
    harness: HARNESS,
    argv: PROBE_ARGV,
    stream_source: "live-subprocess",
    captured_at: new Date().toISOString(),
    platform: process.platform,
    stdout_sha256: record.stdout.sha256,
    stdout_byte_length: record.stdout.byte_length,
    exit_code: record.process_status?.exit_code ?? null,
    termination_kind: record.termination_kind,
    credential_names_removed: run.credential_names_removed,
    credential_names_in_child: run.credential_names_in_child,
    model_requests: record.model_request_count,
    how: "keyless first turn: isolated CLAUDE_CONFIG_DIR, stdin closed, DISABLE_AUTOUPDATER=1, every credential name stripped",
    why_unqualified: "the local CLI reports 2.1.312; the sprint pins 2.1.291, so these bytes prove shape, not version qualification",
    stdout_path: stdoutPath ? stdoutPath.split(/[\\/]/).pop() : null,
    record_path: record.evidence_paths.find((path) => path.endsWith(".capture.json"))?.split(/[\\/]/).pop() ?? null,
    observations: observed.length,
  };
  writeFileSync(join(dir, `${id}.meta.json`), `${JSON.stringify(meta, null, 2)}\n`, "utf8");
  return { ok: true, reason: null, path: join(dir, `${id}.capture.json`), meta, stdout_sha256: record.stdout.sha256 };
}

/**
 * Reads an archived capture record back, together with the bytes it cites. The bytes are re-hashed
 * against the record's own citation, so a tampered archive is refused here rather than graded.
 */
export function readArchived(recordPath) {
  const record = JSON.parse(readFileSync(resolve(recordPath), "utf8"));
  const stdoutName = (record.evidence_paths ?? []).map((path) => path.split(/[\\/]/).pop()).find((name) => name?.endsWith(".stdout.bin"));
  if (!stdoutName) throw new StreamError("captured-bytes-uncited", { recordPath });
  const stdoutPath = join(dirname(resolve(recordPath)), stdoutName);
  if (!existsSync(stdoutPath)) throw new StreamError("captured-bytes-absent", { stdoutPath });
  const bytes = readFileSync(stdoutPath);
  const sha256 = sha256Hex(bytes);
  const intact = sha256 === record.stdout?.sha256 && bytes.length === record.stdout?.byte_length;
  return { record, bytes, stdoutPath, sha256, intact };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  const id = process.argv[2] ?? "claude-code-keyless-first-turn";
  const out = await archive({ id });
  process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
  process.exitCode = out.ok ? 0 : 1;
}
