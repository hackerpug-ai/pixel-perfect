#!/usr/bin/env node
// The grade recorder — the one component that turns per-cell artifacts into the single trusted
// `harness-eval-result`. It is the only reader of the grid and the only writer of the artifact the
// gate's steps read.
//
// It refuses rather than completes: a cell set that is not exactly twelve unique (harness, track)
// pairs, a verdict word outside the closed vocabulary, an incomplete InstallationIdentity, or an
// absent GitHub job timestamp stops the run with a named reason and writes NOTHING it could later
// pass off as a result.
//
// Inputs come only from the GitHub-supplied environment (never a secret): INSTALL_MODE from the
// dispatch input, GITHUB_* for run identity, HARNESS_EVAL_CELLS_DIR / HARNESS_EVAL_VERIFY_DIR /
// HARNESS_EVAL_OUT_DIR for the artifact layout.
//
// The pure layer (validate → enforce → timestamp → assemble → upload plan → summary → exit) is
// exported so a flow module can drive it against real inputs; `main` is the thin job shell.
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync, copyFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

import { loadPins } from "./pins.mjs";
import { RecorderRefusal, collectCells } from "./recorder/validate.mjs";
import {
  RESULT_FILENAME,
  SUMMARY_FILENAME,
  assembleResult,
  copyJobTimestamps,
  fetchRunJobs,
  recorderExit,
  runContextFromEnv,
  uploadPlan,
} from "./recorder/result.mjs";
import { renderSummary } from "./recorder/summary.mjs";

export {
  RESULT_FILENAME,
  SUMMARY_FILENAME,
  RecorderRefusal,
  assembleResult,
  collectCells,
  copyJobTimestamps,
  fetchRunJobs,
  recorderExit,
  runContextFromEnv,
  renderSummary,
  uploadPlan,
};

const VERIFY_INDEX = "INDEX.json";

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile()) out.push(full);
  }
  return out.sort();
}

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (cause) {
    throw new RecorderRefusal("cell-record-invalid", { file, why: cause.message });
  }
}

const relativePath = (root, file) => relative(root, file).split(sep).join("/");

/**
 * The three control-evidence forms a cell leg may also ship. They are evidence ABOUT a control, not
 * cell records and not the four controls: `binding.json` says which credential that harness binds,
 * `keyless-control.json` is one cell's keyless row, and `*.capture.json` is one invocation's captured
 * bytes. They are kept in their own bucket and never read as either.
 */
function controlEvidenceForm(record, file) {
  if (record === null || typeof record !== "object" || Array.isArray(record)) return null;
  if (typeof record.credential_env === "string" && typeof record.binding_env === "string") return "binding";
  if (typeof record.control_id === "string" && "verdict" in record) return "control-row";
  if (file.endsWith(".capture.json") && typeof record.check_id === "string" && "model_request_count" in record) return "capture";
  return null;
}

const isCellRecord = (record) =>
  record !== null && typeof record === "object" && typeof record.harness === "string" && typeof record.track === "string";

/**
 * Reads the downloaded artifact layout: one record per cell artifact, plus any `controls.json` a
 * controls step attached, plus the control-evidence forms kept separately. A missing directory is a
 * refusal, not an empty cell set.
 *
 * Every `*.json` is classified by WHAT IT IS. A record that is neither a cell nor one of the named
 * forms is refused by name — the walk is fail-closed, so a truncated or misnamed cell stops the run
 * instead of quietly shrinking the grid.
 */
export function readCellArtifacts(dir) {
  const root = resolve(dir);
  if (!existsSync(root) || !statSync(root).isDirectory()) {
    throw new RecorderRefusal("cells-missing", { dir: root, why: "no cell artifact was downloaded for this attempt" });
  }
  const files = walk(root);
  const jsonFiles = files.filter((file) => file.endsWith(".json"));
  if (jsonFiles.length === 0) {
    throw new RecorderRefusal("cells-missing", { dir: root, why: "no json record arrived for this attempt" });
  }
  const cells = [];
  const controls = [];
  const controlEvidence = [];
  for (const file of jsonFiles) {
    const record = readJson(file);
    if (file.endsWith(`${sep}${VERIFY_INDEX}`)) continue;
    if (file.endsWith(`${sep}controls.json`)) {
      if (!Array.isArray(record)) throw new RecorderRefusal("controls-invalid", { file, why: "controls.json is a JSON array" });
      controls.push(...record);
      continue;
    }
    if (isCellRecord(record)) {
      cells.push(record);
      continue;
    }
    const form = controlEvidenceForm(record, file);
    if (form) {
      controlEvidence.push({ form, file: relativePath(root, file), record });
      continue;
    }
    throw new RecorderRefusal("cell-unclassified", {
      file: relativePath(root, file),
      why: "not a cell record (no string harness and track) and not one of the three named control-evidence forms",
    });
  }
  return { cells, controls, controlEvidence, files: files.map((file) => relative(root, file)) };
}

/**
 * Writes the result atomically: a `*.partial` body is renamed into place, so a half-written file can
 * never be mistaken for the artifact. The summary is rendered from the same record that is written.
 */
export function writeResult({ outDir, result, summary }) {
  mkdirSync(outDir, { recursive: true });
  const target = join(outDir, RESULT_FILENAME);
  const partial = `${target}.partial`;
  writeFileSync(partial, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  renameSync(partial, target);
  const summaryPath = join(outDir, SUMMARY_FILENAME);
  writeFileSync(summaryPath, summary, "utf8");
  return { resultPath: target, summaryPath };
}

/**
 * Bundles the verify reports this attempt produced under invocation-specific paths, so two
 * invocations can never collide, and records what actually arrived. An empty bundle states the
 * reason instead of inventing a report.
 */
export function writeVerifyReceipt({ outDir, verifyDir }) {
  const target = join(outDir, "verify-reports");
  mkdirSync(target, { recursive: true });
  const entries = [];
  const root = resolve(verifyDir);
  if (existsSync(root) && statSync(root).isDirectory()) {
    for (const file of walk(root)) {
      const rel = relative(root, file).split(sep).join("/");
      const destination = join(target, rel);
      mkdirSync(dirname(destination), { recursive: true });
      copyFileSync(file, destination);
      entries.push({ path: rel, bytes: statSync(file).size, sha256: createHash("sha256").update(readFileSync(file)).digest("hex") });
    }
  }
  const index = {
    schema: "harness-eval-verify-reports-index/v1",
    reports: entries,
    reason: entries.length === 0 ? `no verify report artifact arrived for this attempt (looked in ${verifyDir})` : null,
  };
  writeFileSync(join(target, VERIFY_INDEX), `${JSON.stringify(index, null, 2)}\n`, "utf8");
  return index;
}

/**
 * Removes every result file this process could have written. A refusal must leave nothing that reads
 * as a success, and the write order alone cannot guarantee that: a summary append, a stdout write or
 * an upload-plan refusal can still throw after the result landed. The catch block calls this.
 */
export function discardResults({ outDir }) {
  const removed = [];
  for (const name of [RESULT_FILENAME, SUMMARY_FILENAME, `${RESULT_FILENAME}.partial`]) {
    const path = join(outDir, name);
    if (!existsSync(path)) continue;
    rmSync(path, { force: true });
    removed.push(name);
  }
  return removed;
}

function appendStepSummary(path, text) {
  if (path) appendFileSync(path, text, "utf8");
}

/**
 * The job shell. Returns the process exit code: every artifact is written before the exit rule is
 * applied, so a failing run still leaves the evidence a maintainer reads.
 */
export async function main({ env = process.env, fetchImpl = globalThis.fetch } = {}) {
  const outDir = env.HARNESS_EVAL_OUT_DIR ?? "grade";
  try {
    const context = runContextFromEnv(env);
    const pins = loadPins();
    const artifacts = readCellArtifacts(env.HARNESS_EVAL_CELLS_DIR ?? "cells");
    const cells = collectCells(artifacts.cells, { pins, installMode: context.installMode });
    // The cell defects above are named first, then this: every run executes the four controls, so a
    // cells dir without them is a refused run, not a result whose `.controls[]` the gate prints as
    // nothing forever.
    if (artifacts.controls.length === 0) {
      throw new RecorderRefusal("controls-missing", {
        dir: env.HARNESS_EVAL_CELLS_DIR ?? "cells",
        why: "every run executes the four negative controls; controls.json never arrived, so .controls[] would be empty and the gate would print nothing",
      });
    }
    const jobs = await fetchRunJobs({
      apiUrl: context.apiUrl,
      repository: context.repository,
      runId: context.runId,
      token: context.token,
      fetchImpl,
    });
    const timestamps = copyJobTimestamps(jobs);
    const result = assembleResult({ cells, pins, context, timestamps, controls: artifacts.controls });
    const exit = recorderExit({ cells });
    const summary = renderSummary(result);

    // The verify bundle is written first and the result last, so the artifact that reads as a
    // success is the last thing on disk; discardResults() below removes it if anything still throws.
    writeVerifyReceipt({ outDir, verifyDir: env.HARNESS_EVAL_VERIFY_DIR ?? "verify-reports" });
    writeResult({ outDir, result, summary });
    for (const entry of uploadPlan({ runId: context.runId, attempt: context.attempt })) {
      process.stdout.write(`upload ${entry.name} (overwrite ${entry.overwrite}, ${entry.retentionDays} days)\n`);
    }
    appendStepSummary(env.GITHUB_STEP_SUMMARY, summary);
    process.stdout.write(summary);
    return exit.code;
  } catch (error) {
    const reason = error.reason ?? "recorder-crashed";
    const detail = error.details === undefined ? String(error.message ?? error) : JSON.stringify(error.details);
    // No result file survives a refusal: a partial artifact must never look valid, whatever threw.
    let discarded = [];
    try {
      discarded = discardResults({ outDir });
    } catch {
      // The refusal report below is the record; the removal is best effort on a broken filesystem.
    }
    try {
      appendStepSummary(
        env.GITHUB_STEP_SUMMARY,
        `## harness-eval recorder refused\n\n**${reason}**\n\n\`\`\`\n${detail}\n\`\`\`\n\nDiscarded: ${discarded.length > 0 ? discarded.join(", ") : "nothing (no result was written)"}. No result was written, so no incomplete artifact can be read as a green run.\n`,
      );
    } catch {
      // An unwritable step summary is often the failure being reported; the step log still carries it.
    }
    process.stderr.write(`::error title=harness-eval recorder refused::${reason}\n${reason}: ${detail}\n`);
    return 1;
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) process.exitCode = await main();


