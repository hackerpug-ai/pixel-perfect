#!/usr/bin/env node
// verify-report.mjs — the product's own machine-readable verify report.
//
// The graded `verify` check reads one JSON file at the path its case declares and refuses it as
// `report-missing` otherwise. That file's two load-bearing facts — `observed_verify_outcome` and
// `evidence.drifted_keys` — are the output of `verify-catalog.mjs --check`, so a model that cannot
// run the check can only guess them, and a guessed body that happens to match grades a defect
// nobody detected. This script removes the guess: it runs the product's own catalog check, writes
// the body from what the check reported, and exits `0` whatever the outcome — a detected defect is a
// successful report, not a failed step.
//
// Usage:
//   node verify-report.mjs --out <case-relative path> --invocation-id <id> \
//     --case-id <id> --harness <h> --track <pinned|newest> \
//     [--platform <id>] [--project <root>] [--publish-dir <absolute dir>] [--json]
//
//   --out <path>            report path, relative to the working directory (`--report` is a synonym,
//                           so the slash command's own flag can be passed straight through)
//   --invocation-id <id>    the id the run minted; echoed verbatim into the body
//   --case-id <id>          the case the report belongs to
//   --harness <h>          the harness whose run produced it
//   --track <pinned|newest> the track whose subject was graded
//   --platform <id>         platform key for the catalog check (passed through)
//   --project <root>        project the catalog check runs against (default: the working directory)
//   --publish-dir <dir>     absolute directory to also write a byte-identical copy into
//                           (or PIXEL_PERFECT_VERIFY_PUBLISH_DIR)
//   --json                  emit only the JSON receipt (the receipt is always the last stdout line)
//
// Exit vocabulary, matching verify-catalog.mjs and gate.mjs:
//   0 report written (defect detected or not) · 2 usage error · 3 refusal, no file created
//
// Refusals are decided before anything is written: a path that would leave the invocation's own
// working directory, a leaf that is not `.json`, a publish directory that is not absolute, and an
// absent, empty or blank invocation id are all refused with one JSON line and no file. An unbound
// report therefore cannot exist — `bindReport` refuses a body whose id is not the invocation's, so
// the writer refuses first, at the moment the id is missing.
//
// The graded copy stays inside the invocation's working directory and only a job ever publishes a
// copy out of it. Zero runtime dependencies; run it with `node`.

import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, isAbsolute, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const SCHEMA = "verify-report/v1";
const PLUGIN_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CATALOG = join(PLUGIN_ROOT, "scripts", "verify-catalog.mjs");
const PUBLISH_ENV = "PIXEL_PERFECT_VERIFY_PUBLISH_DIR";

/** The body's keys, in the order the declared contract lists them. Nothing else is ever written. */
const FIELDS = [
  "schema",
  "harness",
  "track",
  "invocation_id",
  "case_id",
  "observed_verify_outcome",
  "observed_defect_key",
  "expected_defect_key",
  "evidence",
  "clean_project_failed",
];

const VALUE_FLAGS = new Map([
  ["--out", "out"],
  ["--report", "out"],
  ["--invocation-id", "invocation_id"],
  ["--case-id", "case_id"],
  ["--harness", "harness"],
  ["--track", "track"],
  ["--platform", "platform"],
  ["--project", "project"],
  ["--publish-dir", "publish_dir"],
]);
const BOOLEAN_FLAGS = new Set(["--json", "--help"]);

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

class UsageError extends Error {}

class Refusal extends Error {
  constructor(reason, detail) {
    super(reason);
    this.reason = reason;
    this.detail = detail;
  }
}

function usage() {
  return [
    "Usage: node verify-report.mjs --out <relative path> --invocation-id <id>",
    "         --case-id <id> --harness <h> --track <pinned|newest>",
    "         [--platform <id>] [--project <root>] [--publish-dir <absolute dir>] [--json]",
    "  --report <path> is a synonym for --out.",
  ].join("\n");
}

/** Reads the flags. An unknown flag is a usage error (2), never a silently ignored option. */
export function parseArgs(argv) {
  const options = { json: false, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (BOOLEAN_FLAGS.has(flag)) {
      if (flag === "--json") options.json = true;
      else options.help = true;
      continue;
    }
    const key = VALUE_FLAGS.get(flag);
    if (!key) throw new UsageError(`unknown argument: ${flag}`);
    const value = argv[index + 1];
    if (value === undefined) throw new UsageError(`${flag} needs a value`);
    options[key] = value;
    index += 1;
  }
  if (options.help) return options;
  for (const required of ["case_id", "harness", "track"]) {
    const flag = required === "case_id" ? "--case-id" : required === "harness" ? "--harness" : "--track";
    if (typeof options[required] !== "string" || options[required].trim() === "") throw new UsageError(`${flag} is required`);
  }
  return options;
}

/** Every segment of a path, with Windows separators normalised away. */
const segments = (value) => String(value).split(/[\\/]+/).filter((part) => part.length > 0);

/**
 * Refuses anything that could leave the invocation's working directory, and anything that is not a
 * report: an absolute path, a `..` segment, a leaf that is not `.json`, and a path that resolves back
 * to the directory itself. Pure — it reads no file and creates nothing.
 */
export function assertConfinedOut(out, cwd) {
  if (typeof out !== "string" || out.trim() === "") throw new Refusal("report-out-missing", { out: out ?? null });
  if (isAbsolute(out) || /^[A-Za-z]:[\\/]/.test(out)) throw new Refusal("report-out-not-relative", { out, why: "absolute path" });
  if (segments(out).includes("..")) throw new Refusal("report-out-not-relative", { out, why: "contains a .. segment" });
  if (!out.endsWith(".json")) throw new Refusal("report-out-not-json", { out });
  const root = resolve(cwd);
  const absolute = resolve(root, out);
  if (!absolute.startsWith(root + sep)) throw new Refusal("report-out-not-relative", { out, why: "resolves outside the working directory" });
  return absolute;
}

/** Writes `bytes` atomically at `target`: a `.partial` body is renamed into place. */
function writeAtomic(target, bytes) {
  mkdirSync(dirname(target), { recursive: true });
  const partial = `${target}.partial`;
  writeFileSync(partial, bytes);
  try {
    renameSync(partial, target);
  } catch (error) {
    rmSync(partial, { force: true });
    throw error;
  }
  return target;
}

/**
 * Runs the product's own catalog check and returns what it reported. The check's own exit decides
 * the outcome; this script never trusts a caller's claim about the project.
 */
export function runCatalogCheck({ project, platform, cwd }) {
  const args = [CATALOG, "--check", project, ...(platform ? ["--platform", platform] : []), "--json"];
  const result = spawnSync(process.execPath, args, { cwd, encoding: "utf8", timeout: 600_000 });
  const stdout = String(result.stdout ?? "");
  const stderr = String(result.stderr ?? "");
  if (result.error) {
    throw new Refusal("catalog-check-unreadable", { command: [process.execPath, ...args].join(" "), why: result.error.code ?? result.error.message });
  }
  let report;
  try {
    report = JSON.parse(stdout);
  } catch {
    report = null;
  }
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new Refusal("catalog-check-unreadable", {
      command: [process.execPath, ...args].join(" "),
      exit_code: result.status,
      why: "the catalog check printed no JSON report",
      stderr: stderr.trim().split("\n").slice(-3).join(" | "),
    });
  }
  const exit = typeof report.exit === "number" ? report.exit : result.status;
  const driftedKeys = (Array.isArray(report.drifted) ? report.drifted : []).map((entry) => entry?.key).filter((key) => typeof key === "string");
  return { report, exit, driftedKeys };
}

/**
 * The body, computed only from the catalog check's own report. There is no flag, no case id and no
 * opinion that can change the outcome: `defect-detected` iff the check reported a drifted key.
 */
export function reportBody({ harness, track, invocationId, caseId, exit, driftedKeys }) {
  const first = driftedKeys[0] ?? null;
  const body = {
    schema: SCHEMA,
    harness,
    track,
    invocation_id: invocationId,
    case_id: caseId,
    observed_verify_outcome: driftedKeys.length > 0 ? "defect-detected" : "clean",
    observed_defect_key: first,
    expected_defect_key: first,
    evidence: { drifted_keys: [...driftedKeys] },
    clean_project_failed: exit !== 0,
  };
  if (JSON.stringify(Object.keys(body)) !== JSON.stringify(FIELDS)) {
    throw new Error(`verify-report: body keys drifted from the declared contract: ${Object.keys(body).join(", ")}`);
  }
  return body;
}

/**
 * The directory a byte-identical copy of the report is also published into, or null: the flag wins
 * over the environment, and a blank value means absent. Part of the refuse-before-writing stage — a
 * relative directory is refused outright, and one that cannot be created is refused with the reason.
 */
function resolvePublishDir(options, env) {
  const publishDir = options.publish_dir ?? env[PUBLISH_ENV] ?? null;
  if (publishDir !== null && String(publishDir).trim() !== "") {
    if (!isAbsolute(publishDir)) {
      throw new Refusal("publish-dir-not-absolute", { publish_dir: publishDir });
    }
    try {
      mkdirSync(publishDir, { recursive: true });
    } catch (error) {
      throw new Refusal("publish-dir-unwritable", { publish_dir: publishDir, why: error.code ?? error.message });
    }
  }
  return publishDir;
}

export function main(argv = process.argv.slice(2), { cwd = process.cwd(), env = process.env } = {}) {
  let options;
  try {
    options = parseArgs(argv);
  } catch (error) {
    if (!(error instanceof UsageError)) throw error;
    process.stderr.write(`USAGE ERROR: ${error.message}\n${usage()}\n`);
    return 2;
  }
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return 0;
  }

  const refuse = (error) => {
    process.stdout.write(`${JSON.stringify({ ok: false, reason: error.reason, detail: error.detail })}\n`);
    return 3;
  };

  try {
    // 1. Refuse before writing: the id, the path and the publish directory, in that order.
    if (typeof options.invocation_id !== "string" || options.invocation_id.trim() === "") {
      throw new Refusal("report-invocation-id-missing", {
        why: "a report without the invocation's own id cannot be bound, so none is written",
        given: options.invocation_id ?? null,
      });
    }
    const target = assertConfinedOut(options.out, cwd);

    const publishDir = resolvePublishDir(options, env);

    // 2. The product's own check decides the outcome.
    const project = options.project ?? ".";
    const checked = runCatalogCheck({ project, platform: options.platform ?? null, cwd });

    // 3. The body, at the invocation's own declared path, atomically.
    const body = reportBody({
      harness: options.harness,
      track: options.track,
      invocationId: options.invocation_id,
      caseId: options.case_id,
      exit: checked.exit,
      driftedKeys: checked.driftedKeys,
    });
    const bytes = Buffer.from(`${JSON.stringify(body, null, 2)}\n`, "utf8");
    writeAtomic(target, bytes);
    const out = { path: target, bytes: bytes.length, sha256: sha256(bytes) };

    // 4. Publish a byte-identical copy when asked, so a job can ship it while the graded copy stays
    //    inside the invocation's directory. The copy is written from the same bytes and then read
    //    back, so its digest is measured rather than assumed.
    let publish = null;
    if (publishDir !== null && String(publishDir).trim() !== "") {
      const destination = join(publishDir, options.out);
      writeAtomic(destination, bytes);
      const published = sha256(readFileSync(destination));
      if (published !== out.sha256) {
        throw new Error(`the published copy ${destination} reads sha256 ${published}, but the graded report is ${out.sha256}`);
      }
      publish = { path: destination, bytes: bytes.length, sha256: published };
    }

    const receipt = { ok: true, out, publish, outcome: body.observed_verify_outcome, drifted_keys: body.evidence.drifted_keys, sha256: out.sha256 };
    process.stdout.write(`${JSON.stringify(receipt)}\n`);
    if (!options.json) {
      process.stderr.write(
        `${body.observed_verify_outcome === "defect-detected" ? "✗" : "✓"} verify report: ${body.observed_verify_outcome}` +
          `${checked.driftedKeys.length > 0 ? ` (${checked.driftedKeys.join(", ")})` : ""} → ${options.out}\n`,
      );
    }
    return 0;
  } catch (error) {
    if (error instanceof Refusal) return refuse(error);
    process.stderr.write(`CONFIG ERROR: ${error.message}\n`);
    return 2;
  }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) process.exit(main());
