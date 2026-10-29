// Keyless oracle precheck: runs the shipped `verify-catalog.mjs` against a
// materialized kit project and returns what it actually observed.
//
// Contract (02-system-components.md § oracle-precheck): the planted project must
// exit 1 with `drifted[].key` `atoms/Button/default`; the clean project must exit 0.
// No model, no API key, no network.

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(HERE, "../../..");
export const ORACLE_SCRIPT = path.join(REPO_ROOT, "plugins/pixel-perfect/scripts/verify-catalog.mjs");

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

/**
 * Byte offset and length of the first run of bytes where `captured` differs from
 * `golden`. These are the offsets the report cites; nothing here is asserted from
 * the case manifest.
 */
export function diffRegion(goldenBuf, capturedBuf) {
  const limit = Math.min(goldenBuf.length, capturedBuf.length);
  let start = 0;
  while (start < limit && goldenBuf[start] === capturedBuf[start]) start++;
  if (start === limit && goldenBuf.length === capturedBuf.length) return null;
  let end = capturedBuf.length;
  return { offset: start, end_offset: end, byte_length: end - start };
}

/**
 * Run the real oracle with no model credential. Returns the parsed report plus
 * its exit code, and never throws on a non-zero exit — exit 1 is the expected
 * answer for the planted project.
 */
export function runOraclePrecheck(projectDir, { platform = "web-desktop", script = ORACLE_SCRIPT } = {}) {
  // No model credential: the precheck is deterministic and must never see a key.
  const env = { ...process.env };
  for (const name of ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "GOOGLE_API_KEY", "GEMINI_API_KEY", "XAI_API_KEY", "ZAI_API_KEY"]) {
    delete env[name];
  }
  const args = [script, "--check", projectDir, "--platform", platform, "--json"];
  const run = spawnSync(process.execPath, args, { cwd: projectDir, encoding: "utf8", env, timeout: 120_000 });
  let report = null;
  let parseError = null;
  try {
    report = JSON.parse(run.stdout);
  } catch (err) {
    parseError = err.message;
  }
  return {
    command: `${process.execPath} ${args.join(" ")}`,
    exit_code: run.status,
    report,
    parse_error: parseError,
    stderr: (run.stderr || "").trim(),
  };
}

/**
 * Turn an oracle run into the observed evidence a VerifyReport cites: the capture
 * file, its hash, and the byte offsets where the capture left the golden.
 */
export function observedEvidence(projectDir, caseManifest, oracleRun) {
  const capturePath = caseManifest.capture_path;
  const goldenPath = caseManifest.golden_path;
  const captureAbs = path.join(projectDir, capturePath);
  const evidence = {
    capture_path: capturePath,
    capture_exists: existsSync(captureAbs),
    capture_sha256: null,
    golden_path: goldenPath,
    golden_sha256: null,
    event_offsets: null,
    drifted_keys: (oracleRun.report?.drifted || []).map((d) => d.key),
    oracle_exit_code: oracleRun.exit_code,
  };
  if (!evidence.capture_exists) return evidence;
  const captured = readFileSync(captureAbs);
  evidence.capture_sha256 = sha256(captured);
  const goldenAbs = path.join(projectDir, goldenPath);
  if (existsSync(goldenAbs)) {
    const golden = readFileSync(goldenAbs);
    evidence.golden_sha256 = sha256(golden);
    evidence.event_offsets = diffRegion(golden, captured);
  }
  return evidence;
}
