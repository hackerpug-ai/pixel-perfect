// Result assembly for the grade recorder: the Actions API timestamp copy, the identity binding, the
// attempt-qualified upload plan, and the one exit rule.
//
// Timestamps are copied from the real smoke jobs and never inferred. The result is validated against
// the shipped schema and the pins bytes before it is returned, so a caller can never hold a record
// this module would refuse to upload.
import { identityEnvelope } from "../pins.mjs";
import { validateResult } from "../validate.mjs";
import { RecorderRefusal } from "./validate.mjs";

export const RESULT_FILENAME = "harness-eval-result.json";
export const SUMMARY_FILENAME = "harness-eval-summary.md";
export const RETENTION_DAYS = 90;

// The smoke matrix names every job `smoke <harness> <track>`; those are the required jobs whose
// start and completion define the evaluation interval.
const REQUIRED_SMOKE_JOB = /^smoke\s+\S+\s+\S+$/;

export function isRequiredSmokeJob(job) {
  return REQUIRED_SMOKE_JOB.test(String(job?.name ?? "").trim());
}

/**
 * `evaluation_started_at` = the earliest real start of a required smoke job, and
 * `evaluation_completed_at` = the latest real completion. Any missing timestamp blocks: a job that
 * never started or never finished means the evaluation interval is not knowable.
 */
export function copyJobTimestamps(jobs, { match = isRequiredSmokeJob } = {}) {
  const all = Array.isArray(jobs) ? jobs : [];
  const matched = all.filter(match);
  if (matched.length === 0) {
    throw new RecorderRefusal("timestamps-missing", {
      why: "no required smoke job in this attempt, so the evaluation interval is not knowable",
      jobs: all.length,
    });
  }
  const notStarted = matched.filter((job) => !job.started_at).map((job) => job.name);
  if (notStarted.length > 0) throw new RecorderRefusal("timestamps-missing", { why: "a required smoke job never started", jobs: notStarted });
  const notCompleted = matched.filter((job) => !job.completed_at).map((job) => job.name);
  if (notCompleted.length > 0) {
    throw new RecorderRefusal("timestamps-missing", { why: "a required smoke job has not completed", jobs: notCompleted });
  }
  const starts = matched.map((job) => job.started_at).sort();
  const completions = matched.map((job) => job.completed_at).sort();
  return {
    evaluation_started_at: starts[0],
    evaluation_completed_at: completions.at(-1),
    smoke_jobs: matched.length,
  };
}

/** Every page of this attempt's job list from the Actions API. Never prints the token. */
export async function fetchRunJobs({
  apiUrl,
  repository,
  runId,
  token = null,
  fetchImpl = globalThis.fetch,
  perPage = 100,
}) {
  if (!repository || !runId) {
    throw new RecorderRefusal("run-identity-missing", { repository: repository ?? null, run_id: runId ?? null });
  }
  if (typeof fetchImpl !== "function") throw new RecorderRefusal("actions-api-unavailable", { why: "no fetch implementation" });
  const headers = { accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28" };
  if (token) headers.authorization = `Bearer ${token}`;

  const jobs = [];
  for (let page = 1; ; page += 1) {
    const url = `${apiUrl}/repos/${repository}/actions/runs/${runId}/jobs?per_page=${perPage}&page=${page}`;
    const response = await fetchImpl(url, { headers });
    if (!response.ok) {
      throw new RecorderRefusal("actions-api-unavailable", { status: response.status, url, why: "the trusted job list is required to copy the timestamps" });
    }
    const payload = await response.json();
    const batch = Array.isArray(payload?.jobs) ? payload.jobs : [];
    jobs.push(...batch);
    if (batch.length === 0 || jobs.length >= Number(payload?.total_count ?? jobs.length)) break;
  }
  return jobs;
}

/**
 * The recorder's run context, read only from the GitHub-supplied environment. Nothing else can set
 * the event, the mode or the candidate commit — no log, no file, no inference.
 */
export function runContextFromEnv(env = process.env) {
  const installMode = String(env.INSTALL_MODE ?? "").trim();
  if (installMode === "") {
    throw new RecorderRefusal("install-mode-missing", {
      why: "one run is one install mode; INSTALL_MODE must reach the recorder, it is never guessed",
    });
  }
  const runId = String(env.GITHUB_RUN_ID ?? "").trim();
  const attempt = String(env.GITHUB_RUN_ATTEMPT ?? "").trim();
  if (!/^\d+$/.test(runId) || !/^\d+$/.test(attempt)) {
    throw new RecorderRefusal("run-identity-missing", { run_id: runId || null, run_attempt: attempt || null });
  }
  const dispatchSha = String(env.GITHUB_SHA ?? "").trim();
  if (!/^[0-9a-f]{40}$/.test(dispatchSha)) {
    throw new RecorderRefusal("dispatch-sha-missing", { GITHUB_SHA: dispatchSha || null });
  }
  return {
    repository: env.GITHUB_REPOSITORY ?? "hackerpug-ai/pixel-perfect",
    runId: Number(runId),
    runNumber: Number.isInteger(Number(env.GITHUB_RUN_NUMBER)) ? Number(env.GITHUB_RUN_NUMBER) : null,
    attempt: Number(attempt),
    event: env.GITHUB_EVENT_NAME ?? "",
    installMode,
    dispatchSha,
    sourceBranch: env.GITHUB_REF_NAME ?? "main",
    apiUrl: env.GITHUB_API_URL ?? "https://api.github.com",
    token: env.GITHUB_TOKEN ?? null,
    now: new Date().toISOString(),
  };
}

/** Assemble the result record and validate it. A record that fails validation is never returned. */
export function assembleResult({ cells, pins, context, timestamps, controls = [], laterChecks = [] }) {
  if (!pins?.pins_sha256) throw new RecorderRefusal("pins-digest-invalid", { pins_sha256: pins?.pins_sha256 ?? null });
  if (!timestamps?.evaluation_started_at || !timestamps?.evaluation_completed_at) {
    throw new RecorderRefusal("timestamps-missing", { timestamps: timestamps ?? null });
  }
  const result = {
    ...identityEnvelope({
      cells,
      pinsSha256: pins.pins_sha256,
      candidateSha: context.dispatchSha,
      event: context.event,
      installMode: context.installMode,
      now: context.now,
      repositoryFullName: context.repository,
    }),
    run_id: context.runId,
    run_number: context.runNumber,
    run_attempt: context.attempt,
    head_sha: context.dispatchSha,
    workflow_source_sha: context.dispatchSha,
    source_branch: context.sourceBranch,
    evaluation_started_at: timestamps.evaluation_started_at,
    evaluation_completed_at: timestamps.evaluation_completed_at,
    controls,
    later_checks: laterChecks,
  };
  validateResult(result, { dispatchSha: context.dispatchSha, requiredPinsSha256: pins.pins_sha256 });
  return result;
}

/** The attempt-qualified physical names. A name without run id and attempt can never be produced. */
export function uploadPlan({ runId, attempt }) {
  if (runId === null || runId === undefined || attempt === null || attempt === undefined) {
    throw new RecorderRefusal("run-identity-missing", { run_id: runId ?? null, run_attempt: attempt ?? null });
  }
  return [
    { logical: "harness-eval-result", name: `harness-eval-result-${runId}-${attempt}`, overwrite: false, retentionDays: RETENTION_DAYS },
    {
      logical: "harness-eval-verify-reports",
      name: `harness-eval-verify-reports-${runId}-${attempt}`,
      overwrite: false,
      retentionDays: RETENTION_DAYS,
    },
  ];
}

/**
 * The one exit rule (02-system-components § grade recorder). The truth table:
 *
 * | cell set                                              | exit | reason                |
 * |-------------------------------------------------------|------|-----------------------|
 * | any pinned cell failed                                |  1   | pinned-check-failed   |
 * | any cell could-not-run, on either track                |  1   | could-not-run         |
 * | only newest-track cells failed, nothing could-not-run  |  0   | newest-warning        |
 * | every cell passed                                      |  0   | all-pass              |
 *
 * Later checks, controls, drift and the release view never reach this function. Correct planted
 * detection is a pass, not a product failure, so it needs no special case here.
 */
export function recorderExit({ cells = [] } = {}) {
  const failed = (filter) => cells.filter(filter).map((cell) => `${cell.harness}/${cell.track}`);
  const pinnedFailures = failed((cell) => cell.track === "pinned" && cell.verdict === "fail");
  if (pinnedFailures.length > 0) return { code: 1, reason: "pinned-check-failed", cells: pinnedFailures };
  const couldNotRun = failed((cell) => cell.verdict === "could-not-run");
  if (couldNotRun.length > 0) return { code: 1, reason: "could-not-run", cells: couldNotRun };
  const newestFailures = failed((cell) => cell.track === "newest" && cell.verdict === "fail");
  if (newestFailures.length > 0) return { code: 0, reason: "newest-warning", cells: newestFailures };
  return { code: 0, reason: "all-pass", cells: [] };
}
