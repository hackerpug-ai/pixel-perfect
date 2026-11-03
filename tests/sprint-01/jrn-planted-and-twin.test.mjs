// FLOW-JRN-PLANTED-AND-TWIN — the planted-and-clean verify pair through one real
// dispatched run, from oracle precheck to the summary links.
//
// This journey is executed by T7's workflow; T4 supplies the fixtures it replays and
// exercises it at human-testing gate step 8. It therefore has three parts:
//
//   1. local and always provable: a missing planted report on an otherwise evaluable
//      run downgrades to fail `report-missing`, and a static replay with no live-run
//      provenance grades `not-executed` — never pass;
//   2. the live dispatch: resolve a run (HARNESS_EVAL_RUN_ID / HARNESS_EVAL_RUN_ATTEMPT,
//      or dispatch `harness-eval` ourselves), WAIT for that run to finish, download the
//      attempt-qualified verify-reports artifact, and require its oracle transcript and
//      both reports to agree with the case manifests. The wait is not optional: a run is
//      resolved seconds after it starts, still `in_progress`, while its artifact is published
//      when it ends — run 41715244415 failed exactly there. `waitForRunCompletion` polls
//      `gh run view` until GitHub reports `completed`; a run that outlives the deadline is a
//      `dispatch-timeout` failure of the leg, never a not-executed record and never a download;
//   3. honest not-executed for exactly THREE kinds of cause, all probed BEFORE any dispatch
//      but only when NO run id is supplied,
//      is attempted and all carried with their reason (one helper, `preDispatchRefusal`):
//        a. the workflow file is not in this tree (T7 lands it, post-integration obligation
//           obl-FLOW-JRN-PLANTED-AND-TWIN);
//        b. the remote has not registered a workflow of that name yet — GitHub registers it
//           only once the file lands on main, so a branch that carries the file still has
//           nothing to dispatch (probe: gh api .../actions/workflows/harness-eval.yml → 404);
//        c. the flow's surface policy does not permit a dispatch from this ref at all (it
//           bans a non-main ref, so a task branch may never dispatch).
//      Two carve-outs, owner-approved (red-hat F-001, 2026-11-03, extended in round 3): a
//      permission-class environment — 403 on a read-only token, bad credentials, not
//      authenticated — cannot dispatch at all, so it records the SAME named deferral as the
//      probe (runner-cannot-dispatch, classified by the shared dispatchDeferral in
//      flow-runner.mjs) wherever it surfaces: at the dispatch START resolveLiveRun returns
//      it, and at the run-GRADE leg (gh auth status, a run read or a mid-poll `gh run view`,
//      a run list) gradeLiveRun classifies the failure reason itself. A mid-poll 403 is
//      therefore a CLASSIFICATION, not a deliberate red (round 3): the environment that cannot
//      dispatch cannot read the run either, so it records the same named not-executed.
//      Every other way the live leg can fail — a start failure outside the permission class
//      (network, 422, a 5xx, an unregistered workflow name), the run list unreadable, no run
//      appearing, a run that outlives the deadline, a registered workflow whose probe cannot be
//      read, a foreign commit, a download that fails under working auth — is a failure to
//      execute the leg and goes RED. A dispatch-timeout belongs on that red list and only
//      there: the leg dispatched, so it must earn the run or say it failed — a timeout handed
//      back as `deferral: true` would let T7's gate step stay green while the journey's THEN
//      was never observed (review round 2, D-1a).
//
// The eight shapes are reproducible as process exit codes (0 = the leg honestly records
// not-executed, 1 = it goes red): `node tests/sprint-01/jrn-planted-and-twin.test.mjs
// --shape=<absent|unregistered-remote|policy-refused|dispatch-failed|unauthenticated|
// run-list-error|no-run|dispatch-timeout>`.

import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { bindReport, prepareVerifyPair, runCheck } from "../../test/harness/adapters/claude-code.mjs";
import { loadCase, sha256File } from "../../test/harness/kit/case-loader.mjs";
import { validateDispatchIdentity } from "../../test/harness/validate.mjs";
import { dispatchDeferral, fixtureInstallation, missingPlantedReport, runVerifyCase } from "./flow-runner.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "../..");
const WORKFLOW_PATH = ".github/workflows/harness-eval.yml";
const REPO = process.env.HARNESS_EVAL_REPO || "hackerpug-ai/pixel-perfect";

const gh = (args, opts = {}) => spawnSync("gh", args, { encoding: "utf8", cwd: REPO_ROOT, timeout: 120_000, ...opts });

/**
 * Provenance for one downloaded artifact. A directory of reports with no live-run
 * binding is a replay: it grades `not-executed`, never pass.
 */
export function readProvenance(dir, { runId, attempt }) {
  const candidates = ["harness-eval-result.json", "run.json", "provenance.json"];
  const file = candidates.map((name) => path.join(dir, name)).find((p) => existsSync(p));
  if (!file) return { live: false, reason: `no live-run provenance in ${dir} — a static replay cannot grade pass` };
  let meta;
  try {
    meta = JSON.parse(readFileSync(file, "utf8"));
  } catch (err) {
    return { live: false, reason: `unparseable provenance ${path.basename(file)}: ${err.message}` };
  }
  const observedRun = String(meta.run_id ?? meta.workflow_run_id ?? "");
  const observedAttempt = String(meta.run_attempt ?? "");
  if (!observedRun || observedRun !== String(runId)) {
    return { live: false, reason: `provenance run_id ${observedRun || "(absent)"} does not match the dispatched run ${runId}` };
  }
  if (!observedAttempt) return { live: false, reason: "provenance carries no run_attempt" };
  if (attempt !== undefined && observedAttempt !== String(attempt)) {
    return { live: false, reason: `provenance run_attempt ${observedAttempt} does not match ${attempt}` };
  }
  return { live: true, runId: observedRun, attempt: observedAttempt, file };
}

/** Read the oracle transcript the run recorded, if it shipped one. */
export function readOracleTranscript(dir) {
  for (const name of ["oracle-precheck.json", "oracle.json"]) {
    const p = path.join(dir, name);
    if (existsSync(p)) return JSON.parse(readFileSync(p, "utf8"));
  }
  return null;
}

const POLICY_PATH = ".spec/e2e-policy/sprint-01/dispatch-allowed.json";
const DISPATCH_FLOW = "FLOW-RUN-02-HAND";
const WORKFLOW_SLUG = "harness-eval";
/** Where the remote registers this workflow, once its file has landed on main. */
export const REGISTRATION_ENDPOINT = `repos/${REPO}/actions/workflows/${WORKFLOW_SLUG}.yml`;

/** The ref this checkout is on, when no env names it (CI sets GITHUB_REF_NAME). */
function currentRef() {
  if (process.env.GITHUB_REF_NAME) return process.env.GITHUB_REF_NAME;
  const res = spawnSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { encoding: "utf8", cwd: REPO_ROOT });
  return (res.stdout || "").trim() || "HEAD";
}

/**
 * Whether the flow's surface policy permits a dispatch at all from `ref`. The policy bans
 * "dispatching from a fork or non-main ref", so a non-main checkout may never dispatch:
 * that is a refusal to attempt, not a dispatch that failed. No policy file means nothing
 * forbids the dispatch, so the leg goes on to attempt it and hard-fails if it fails.
 */
export function dispatchAllowedFrom(ref, { policyPath = path.join(REPO_ROOT, POLICY_PATH) } = {}) {
  const flow = existsSync(policyPath) ? JSON.parse(readFileSync(policyPath, "utf8"))?.flows?.[DISPATCH_FLOW] : null;
  if (typeof flow !== "string") return { allowed: true };
  if (/\bnon-main ref\b/.test(flow) && ref !== "main") {
    return {
      allowed: false,
      reason: `the ${DISPATCH_FLOW} surface policy (${POLICY_PATH}) does not permit a dispatch from a non-main ref, and this checkout is ${ref}`,
    };
  }
  return { allowed: true };
}

/**
 * The one place the three legitimate pre-dispatch impossibilities live. Each is established by
 * a probe, in order, BEFORE any dispatch is attempted, and each returns a named cause with its
 * reason. `null` means none of them applies: the leg must go on and earn a run — a dispatch it
 * then fails to start is a failure, unless GitHub refused the START itself for a permission
 * reason (403 / bad credentials / not authenticated), which resolveLiveRun resolves as the
 * owner-approved runner-cannot-dispatch deferral below.
 *
 *   workflow-file-absent     the file is not in this tree            (no gh consulted)
 *   remote-not-registered    gh api .../workflows/harness-eval.yml → 404
 *   policy-refused-ref       dispatch-allowed.json bans a non-main ref from dispatching
 *
 * A probe that fails some other way (5xx, a permissions error) is NOT a refusal: it is an
 * unreadable probe, so it falls through and the dispatch decides.
 */
export function preDispatchRefusal({
  ref = currentRef(),
  hasWorkflow = () => existsSync(path.join(REPO_ROOT, WORKFLOW_PATH)),
  probe = gh,
  policyPath = path.join(REPO_ROOT, POLICY_PATH),
} = {}) {
  if (!hasWorkflow()) {
    return {
      cause: "workflow-file-absent",
      reason: `no ${WORKFLOW_PATH} to dispatch — the harness-eval workflow is not on this branch (T7 owns it)`,
    };
  }

  // GitHub registers a workflow only once its file lands on main. A branch that carries the
  // file therefore still has no dispatchable workflow on the remote, and `gh workflow run`
  // answers "could not find any workflows named harness-eval" — which is a cannot-yet, not a
  // failure to attempt.
  const registered = probe(["api", REGISTRATION_ENDPOINT]);
  if (registered.status !== 0 && /\b404\b|Not Found/.test(registered.stderr || "")) {
    return {
      cause: "remote-not-registered",
      reason: `the remote has not registered ${WORKFLOW_PATH} yet (gh api ${REGISTRATION_ENDPOINT} → 404) — GitHub registers a workflow only once its file has landed on main`,
    };
  }

  const policy = dispatchAllowedFrom(ref, { policyPath });
  if (!policy.allowed) return { cause: "policy-refused-ref", reason: policy.reason };

  return null;
}

export function resolveLiveRun({
  hasWorkflow = () => existsSync(path.join(REPO_ROOT, WORKFLOW_PATH)),
  gh: runGh = gh,
  env = process.env,
  ref = currentRef(),
  policyPath = path.join(REPO_ROOT, POLICY_PATH),
  sleep = defaultSleep,
  timeoutMs = DISPATCH_TIMEOUT_MS,
  pollMs = DISPATCH_POLL_MS,
  now = Date.now,
} = {}) {
  // A pinned run wins over everything, including the three pre-dispatch refusals: the leg
  // already has the run it was told to grade, so no refusal is a reason to discard it. That
  // is how T7's gate step 8 replays a run from a task branch, where all three can apply.
  // A pinned run that cannot be fetched is a hard failure (downloadVerifyReports throws).
  const suppliedRun = env.HARNESS_EVAL_RUN_ID;
  if (suppliedRun) {
    return { ok: true, runId: suppliedRun, attempt: env.HARNESS_EVAL_RUN_ATTEMPT || "1", dispatched: false };
  }

  // With no run supplied, the only deferral is a probed pre-dispatch refusal. Everything
  // below is a genuine failure to execute the leg and must not reach the green branch.
  const refusal = preDispatchRefusal({ ref, hasWorkflow, probe: runGh, policyPath });
  if (refusal) return { ok: false, deferral: true, cause: refusal.cause, reason: refusal.reason };

  const auth = runGh(["auth", "status"]);
  if (auth.status !== 0) return { ok: false, reason: "gh is not authenticated" };

  const dispatch = runGh(["workflow", "run", WORKFLOW_SLUG, "--repo", REPO]);
  if (dispatch.status !== 0) {
    // A start failure inside the permission class (owner-approved deferral, red-hat F-001,
    // 2026-11-03) is an environment that cannot dispatch at all — the SAME named deferral as
    // the probe, resolved through the shared classifier. Every other start failure keeps the
    // fail path.
    const dispatchDetail = (dispatch.stderr || "").trim() || `gh workflow run exited ${dispatch.status}`;
    const deferral = dispatchDeferral(dispatchDetail);
    if (deferral) {
      return {
        ok: false,
        deferral: true,
        cause: deferral,
        reason: `${deferral}: gh workflow run ${WORKFLOW_SLUG} failed: ${dispatchDetail}`,
      };
    }
    return { ok: false, reason: `gh workflow run ${WORKFLOW_SLUG} failed: ${dispatchDetail}` };
  }
  const list = runGh(["run", "list", "--repo", REPO, "--workflow", WORKFLOW_SLUG, "--limit", "1", "--json", "databaseId,attempt,status"]);
  if (list.status !== 0) return { ok: false, reason: `gh run list failed: ${(list.stderr || "").trim()}` };
  const [latest] = JSON.parse(list.stdout || "[]");
  if (!latest) return { ok: false, reason: "no harness-eval run appeared after dispatch" };
  const runId = String(latest.databaseId);
  const attempt = String(latest.attempt || 1);
  // The run list answers with the run as it is THIS second: for a run this leg just started,
  // still `in_progress`. Its verify-reports artifact is published when it finishes, so resolve
  // only what has finished — otherwise the caller downloads an artifact that does not exist
  // (run 41715244415). A run that never finishes fails the leg; it is never returned as earned.
  const awaited = waitForRunCompletion(runId, attempt, { runGh, sleep, timeoutMs, pollMs, now });
  if (!awaited.ok) return { ok: false, reason: awaited.reason };
  return { ok: true, runId, attempt, dispatched: true, status: awaited.status, conclusion: awaited.conclusion };
}

/**
 * Grade the live leg's resolution. `deferral: true` — one of `preDispatchRefusal`'s three probed
 * causes, or a dispatch-start failure inside the permission class (the shared
 * runner-cannot-dispatch deferral) — records not-executed directly. A plain failure whose REASON
 * is itself inside the permission class (the same environment that cannot dispatch cannot read:
 * gh unauthenticated, bad credentials, a 403) is classified through the shared dispatchDeferral
 * at grade time and records the SAME named not-executed — round 3's third gh consumer, the
 * run-grade leg on a tokenless checkout of main. Any other failure to start the leg — a 500, a
 * network error, a bad run id, a download that fails under working auth — fails the check.
 */
export function gradeLiveRun(run, emitDiagnostic) {
  if (run.ok) return;
  if (run.deferral) {
    assert.ok(run.reason && run.reason.length > 0, "a deferred live leg always carries its reason");
    emitDiagnostic(`not-executed leg=live-dispatched-run owner=T7 obligation=obl-FLOW-JRN-PLANTED-AND-TWIN reason=${run.reason}`);
    return;
  }
  const deferral = dispatchDeferral(run.reason);
  if (deferral) {
    assert.ok(run.reason && run.reason.length > 0, "a classified live leg always carries its reason");
    emitDiagnostic(`not-executed leg=live-dispatched-run owner=T7 obligation=obl-FLOW-JRN-PLANTED-AND-TWIN reason=${deferral}: ${run.reason}`);
    return;
  }
  assert.fail(`live-dispatched-run could not execute: ${run.reason}`);
}

/**
 * How long the live leg waits for a run it dispatched (or was pinned), and how often it looks.
 * One hour at ten seconds: a harness-eval run is minutes, and the deadline exists so a wedged
 * run fails the leg instead of hanging the suite forever.
 */
export const DISPATCH_TIMEOUT_MS = 60 * 60 * 1000;
export const DISPATCH_POLL_MS = 10 * 1000;

/** A real sleep — the poll's only cost. Every test injects its own; nothing here waits on wall time. */
function defaultSleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * Wait for one run to finish, so that the attempt-qualified artifact exists by the time the leg
 * asks for it. This is the step the live leg never had: `gh run list` answers with the run as it
 * is THIS second, which for a fresh dispatch is `in_progress`, and an artifact published at the
 * end of a run cannot be downloaded at its start (run 41715244415).
 *
 * `gh run view <id> --repo <REPO> --json status,conclusion` is polled until GitHub reports
 * `completed`. Every failure here is a failure to execute the leg, never a not-executed record —
 * the leg dispatched, so it must earn the run it grades:
 *
 *   gh run view failed: <stderr>                                     an unreadable run, not retried
 *   gh run view returned unparseable JSON / no status: <body>         a body that is not a run view
 *   dispatch-timeout: run <id> did not complete within <ms>ms        a run that outlives the deadline
 *
 * One carve-out, and GRADE decides it, not this function: when the poll's stderr is inside the
 * permission class (403 on a read-only token, bad credentials, not authenticated) the environment
 * that cannot dispatch cannot read the run either, so gradeLiveRun classifies that reason through
 * the shared dispatchDeferral and records the same named runner-cannot-dispatch not-executed
 * (round 3). A mid-poll 403 is therefore a classification, NOT a deliberate red. A 404, a 5xx or a
 * network failure names no such environment and stays red. `dispatch-timeout` is never deferrable
 * in any of those places: this function returns no deferral marker, and a caller that adds one
 * launders the leg's own failure into a green gate — review round 2's D-1a mutation, pinned in
 * "a dispatched run that outlives the deadline is RED".
 *
 * Returns `{ ok: true, runId, attempt, status: "completed", conclusion, polls }`. The attempt is
 * echoed so the caller names the artifact of the attempt it waited for.
 */
export function waitForRunCompletion(
  runId,
  attempt,
  { runGh = gh, sleep = defaultSleep, timeoutMs = DISPATCH_TIMEOUT_MS, pollMs = DISPATCH_POLL_MS, now = Date.now } = {},
) {
  const id = String(runId);
  const startedAt = now();
  let polls = 0;
  for (;;) {
    polls += 1;
    const view = runGh(["run", "view", id, "--repo", REPO, "--json", "status,conclusion"]);
    if (view.status !== 0) return { ok: false, reason: `gh run view failed: ${(view.stderr || "").trim()}` };
    let body;
    try {
      body = JSON.parse(view.stdout || "{}");
    } catch (err) {
      return { ok: false, reason: `gh run view returned unparseable JSON: ${err.message}` };
    }
    if (body === null || typeof body !== "object" || typeof body.status !== "string" || body.status === "") {
      return { ok: false, reason: `gh run view returned no status: ${(view.stdout || "").trim()}` };
    }
    if (body.status === "completed") {
      // gh prints both null and "" for a conclusion that does not exist; an unfinished run
      // never reaches this branch, so a completed one reports its real conclusion.
      const conclusion = body.conclusion === undefined || body.conclusion === "" ? null : body.conclusion;
      return { ok: true, runId: id, attempt: String(attempt), status: body.status, conclusion, polls };
    }
    if (now() - startedAt >= timeoutMs) {
      return { ok: false, reason: `dispatch-timeout: run ${id} did not complete within ${timeoutMs}ms` };
    }
    sleep(pollMs);
  }
}

/**
 * The live leg's last two steps, in the only order that works: wait for the run to finish, then
 * fetch its attempt-qualified artifact. A pinned run needs this as much as a dispatched one —
 * `resolveLiveRun` returns a pinned run the moment it is named, which says nothing about whether
 * it has finished yet.
 */
export function awaitRunThenDownload(
  run,
  { runGh = gh, sleep = defaultSleep, timeoutMs = DISPATCH_TIMEOUT_MS, pollMs = DISPATCH_POLL_MS, now = Date.now } = {},
) {
  const awaited = waitForRunCompletion(run.runId, run.attempt, { runGh, sleep, timeoutMs, pollMs, now });
  if (!awaited.ok) assert.fail(`live-dispatched-run could not read run ${run.runId}: ${awaited.reason}`);
  return downloadVerifyReports(run.runId, run.attempt, { runGh });
}

/**
 * Fetch the attempt-qualified verify-reports artifact for one run. An unfetchable run throws:
 * the live leg has no third outcome, so a pinned run the remote cannot serve is red, never a
 * not-executed record.
 */
export function downloadVerifyReports(runId, attempt, { runGh = gh } = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), `pp-verify-reports-${runId}-`));
  const name = `harness-eval-verify-reports-${runId}-${attempt}`;
  const res = runGh(["run", "download", runId, "--repo", REPO, "-n", name, "-D", dir]);
  if (res.status !== 0) {
    rmSync(dir, { recursive: true, force: true });
    assert.fail(`could not download ${name}: ${(res.stderr || "").trim()}`);
  }
  return { dir, name };
}

/**
 * The JSON `gh run view <id> --repo <REPO> --json status,conclusion` really prints, one string
 * per state. Pinned as bytes so a poll is checked against the CLI's own output, not against a
 * shape this test invented: an unfinished run prints a null (or empty) conclusion, and only a
 * completed run carries one.
 */
export const VIEW_IN_PROGRESS = '{"status":"in_progress","conclusion":null}';
export const VIEW_QUEUED = '{"status":"queued","conclusion":""}';
export const VIEW_COMPLETED = '{"status":"completed","conclusion":"success"}';

/**
 * A `gh` TEST DOUBLE — never the thing under test. It models only the calls the live leg makes,
 * and exactly the three registration-probe outcomes a `gh api .../workflows/harness-eval.yml`
 * can answer with: `registered` (200), `unregistered` (404 — the file is not on main yet), and
 * `unreadable` (502 — an error that is NOT a refusal). A dispatch-start failure's stderr is
 * posed by name (`dispatchStderr`, default: the unregistered-workflow answer) so the real
 * permission-class shapes — "Resource not accessible by integration (HTTP 403)" on a
 * read-only token, "gh: Bad credentials (HTTP 401)" — can be replayed against the
 * runner-cannot-dispatch classifier without inventing a network. Each shape is posed by name
 * instead of by hand-rolled ternaries, and any gh call it does not model throws, so a new call
 * cannot silently pass through it. `calls` is the probe log the controls assert on.
 *
 * `view` models `gh run view <id> --repo <REPO> --json status,conclusion`: one body printed
 * forever, or an array of bodies consumed in order with the last one repeating. The bodies are
 * the real gh JSON shapes (VIEW_* below) rather than objects, so a poll is pinned to the bytes
 * the CLI actually prints. `viewStatus`/`viewStderr` pose an unreadable run instead.
 */
export function modelGh({ auth = 0, registration = "registered", dispatch = 0, dispatchStderr = "could not find any workflows named harness-eval", listStatus = 0, runList = "[]", download = 0, view = VIEW_COMPLETED, viewStatus = 0, viewStderr = "gh: run not found (HTTP 404)" } = {}) {
  const outcomes = {
    registered: { status: 0, stdout: '{"id":1}', stderr: "" },
    unregistered: { status: 1, stdout: "", stderr: "gh: Not Found (HTTP 404)" },
    unreadable: { status: 1, stdout: "", stderr: "gh: Server Error (HTTP 502)" },
  };
  if (!outcomes[registration]) throw new Error(`modelGh: unknown registration outcome ${registration}`);
  const views = Array.isArray(view) ? [...view] : [view];
  const calls = [];
  const double = (args) => {
    calls.push(args.join(" "));
    if (args[0] === "auth") return { status: auth, stdout: "", stderr: auth === 0 ? "" : "gh: not logged in" };
    if (args[0] === "api") return outcomes[registration];
    if (args[0] === "workflow" && args[1] === "run") {
      return { status: dispatch, stdout: "", stderr: dispatch === 0 ? "" : dispatchStderr };
    }
    if (args[0] === "run" && args[1] === "list") {
      return listStatus === 0 ? { status: 0, stdout: runList, stderr: "" } : { status: listStatus, stdout: "", stderr: "gh: run list failed" };
    }
    if (args[0] === "run" && args[1] === "download") {
      return { status: download, stdout: "", stderr: download === 0 ? "" : "gh: run not found (HTTP 404)" };
    }
    if (args[0] === "run" && args[1] === "view") {
      if (viewStatus !== 0) return { status: viewStatus, stdout: "", stderr: viewStderr };
      const body = views.length > 1 ? views.shift() : views[0];
      return { status: 0, stdout: body, stderr: "" };
    }
    throw new Error(`modelGh: does not model gh ${args.join(" ")}`);
  };
  double.calls = calls;
  return double;
}

const DISPATCH_CALL = `workflow run ${WORKFLOW_SLUG} --repo ${REPO}`;

/**
 * A clock whose only advance is the poll's injected sleep. A one-hour dispatch deadline is
 * therefore provable in microseconds, the poll's cadence is the sleep log itself, and nothing
 * here waits on wall time — no 10-second sleeps in the suite, no dependence on a machine's
 * load to decide whether a deadline was reached.
 */
function fakeClock() {
  const sleeps = [];
  let t = 0;
  return {
    sleeps,
    now: () => t,
    sleep: (ms) => {
      sleeps.push(ms);
      t += ms;
    },
  };
}

/** Write a throwaway surface policy; `undefined` body means "no policy file at all". */
function writePolicy(dir, name, body) {
  const p = path.join(dir, name);
  if (body !== undefined) writeFileSync(p, JSON.stringify(body), "utf8");
  return p;
}

test("FLOW-JRN-PLANTED-AND-TWIN", async (t) => {
  const planted = loadCase("verify-button-drift");
  const clean = loadCase("verify-clean");

  // ---- Part 1: local, always provable -------------------------------------
  await t.test("a missing planted report downgrades to fail report-missing, not could-not-run", () => {
    const { verdict, planted_listing } = missingPlantedReport();
    assert.equal(verdict.ok, false, "an evaluable run missing its planted report must not pass");
    assert.ok(
      verdict.failures.some((f) => f.code === "report-missing"),
      `expected report-missing, got ${verdict.failures.map((f) => f.code)}`,
    );
    assert.ok(
      !verdict.failures.some((f) => f.code === "report-unavailable" || f.code === "could-not-run"),
      "a missing report is never excused as could-not-run",
    );
    assert.deepEqual(planted_listing, [], "the planted report really was removed from its declared path");
  });

  await t.test("a static replay with no live-run provenance grades not-executed, never pass", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "pp-replay-"));
    try {
      writeFileSync(path.join(dir, "verify-button-drift.json"), JSON.stringify({ observed_verify_outcome: "defect-detected" }), "utf8");
      writeFileSync(path.join(dir, "verify-clean.json"), JSON.stringify({ observed_verify_outcome: "clean" }), "utf8");
      const provenance = readProvenance(dir, { runId: "12345", attempt: "1" });
      assert.equal(provenance.live, false, "a replay is not a live run");
      assert.match(provenance.reason, /no live-run provenance/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  await t.test("provenance bound to a different run is rejected", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "pp-replay-"));
    try {
      writeFileSync(path.join(dir, "harness-eval-result.json"), JSON.stringify({ run_id: 999, run_attempt: 1 }), "utf8");
      const provenance = readProvenance(dir, { runId: "12345", attempt: "1" });
      assert.equal(provenance.live, false);
      assert.match(provenance.reason, /does not match the dispatched run 12345/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // ---- Part 2/3: the live journey, or one of the three probed not-executed causes ----
  await t.test("pre-dispatch refusal 1: the workflow file is absent", () => {
    const ghDouble = modelGh();
    const absent = resolveLiveRun({ env: {}, ref: "main", hasWorkflow: () => false, gh: ghDouble });
    assert.equal(absent.ok, false);
    assert.equal(absent.deferral, true);
    assert.equal(absent.cause, "workflow-file-absent");
    assert.deepEqual(ghDouble.calls, [], "a missing file is decided without gh");
    const emitted = [];
    gradeLiveRun(absent, (m) => emitted.push(m));
    assert.equal(emitted.length, 1);
    assert.match(
      emitted[0],
      /^not-executed leg=live-dispatched-run owner=T7 .*reason=no \.github\/workflows\/harness-eval\.yml to dispatch/,
    );
  });

  await t.test("pre-dispatch refusal 2: the remote has not registered the workflow", () => {
    // The file is in this tree, but GitHub only registers a workflow once the file lands on
    // main — so `gh workflow run` would answer "could not find any workflows named
    // harness-eval". The 404 probe establishes that before anything is dispatched.
    const ghDouble = modelGh({ registration: "unregistered" });
    const unregistered = resolveLiveRun({ env: {}, ref: "main", hasWorkflow: () => true, gh: ghDouble });
    assert.equal(unregistered.ok, false);
    assert.equal(unregistered.deferral, true, "an unregistered workflow is a cannot-yet, not a failed attempt");
    assert.equal(unregistered.cause, "remote-not-registered");
    assert.deepEqual(
      ghDouble.calls,
      [`api ${REGISTRATION_ENDPOINT}`],
      "only the registration probe runs — no auth, no dispatch attempt, and no run list",
    );
    const emitted = [];
    gradeLiveRun(unregistered, (m) => emitted.push(m));
    assert.equal(emitted.length, 1);
    assert.match(
      emitted[0],
      /^not-executed leg=live-dispatched-run owner=T7 .*reason=the remote has not registered \.github\/workflows\/harness-eval\.yml yet .*→ 404/,
    );

    // The probe outcome is what decides, not the file's presence: the same tree whose
    // workflow IS registered goes on to attempt the dispatch.
    const registeredGh = modelGh();
    const registered = resolveLiveRun({ env: {}, ref: "main", hasWorkflow: () => true, gh: registeredGh });
    assert.equal(registered.deferral, undefined, "a registered workflow is never excused as not-yet-registered");
    assert.ok(registeredGh.calls.includes(DISPATCH_CALL), "a registered workflow really dispatches");
  });

  await t.test("pre-dispatch refusal 3: the surface policy forbids this ref,", () => {
    // The file is present and registered, so neither earlier excuse applies; the flow's
    // surface policy bans dispatching from a non-main ref, so no dispatch is attempted at all.
    const refusedGh = modelGh();
    const refused = resolveLiveRun({
      env: {},
      ref: "kb-run-sprint/sprint-01-evaluator-evidence-spine/T4",
      hasWorkflow: () => true,
      gh: refusedGh,
    });
    assert.equal(refused.ok, false);
    assert.equal(refused.deferral, true, "a policy refusal is a pre-dispatch refusal, not an attempt");
    assert.equal(refused.cause, "policy-refused-ref");
    assert.deepEqual(refusedGh.calls, [`api ${REGISTRATION_ENDPOINT}`], "the refusal costs a probe, never a dispatch");
    const emitted = [];
    gradeLiveRun(refused, (m) => emitted.push(m));
    assert.equal(emitted.length, 1);
    assert.match(
      emitted[0],
      /^not-executed leg=live-dispatched-run owner=T7 .*reason=the FLOW-RUN-02-HAND surface policy .*non-main ref/,
    );

    // F-T4-11: the refusal is READ OUT OF dispatch-allowed.json, not assumed from the ref.
    // Each policy below is a non-main-ref-shaped mutant killer: a check that defers on any
    // non-main ref while ignoring the file fails every one of them.
    const dir = mkdtempSync(path.join(tmpdir(), "pp-policy-"));
    try {
      for (const [label, policyPath] of [
        ["a policy permitting any ref", writePolicy(dir, "permits.json", { flows: { [DISPATCH_FLOW]: "One workflow_dispatch of harness-eval, from any ref." } })],
        ["a policy with no entry for this flow", writePolicy(dir, "no-flow.json", { flows: {} })],
        ["no policy file at all", writePolicy(dir, "absent.json", undefined)],
      ]) {
        const permittingGh = modelGh({ dispatch: 1 });
        const run = resolveLiveRun({ env: {}, ref: "kb-run-sprint/sprint-01-evaluator-evidence-spine/T4", hasWorkflow: () => true, gh: permittingGh, policyPath });
        assert.equal(run.deferral, undefined, `${label} must not excuse a non-main ref`);
        assert.ok(permittingGh.calls.includes(DISPATCH_CALL), `the dispatch really was attempted under ${label}`);
        assert.throws(
          () => gradeLiveRun(run, () => {}),
          /live-dispatched-run could not execute: gh workflow run harness-eval failed/,
          `${label} leaves a failed attempt red`,
        );
      }

      // …and a throwaway policy that DOES ban a non-main ref defers again, so the file is read
      // in both directions rather than the answer being hard-coded either way.
      const banning = writePolicy(dir, "bans.json", { flows: { [DISPATCH_FLOW]: "Banned: dispatching from a fork or non-main ref." } });
      const banningGh = modelGh({ dispatch: 1 });
      const deferredAgain = resolveLiveRun({ env: {}, ref: "not-main", hasWorkflow: () => true, gh: banningGh, policyPath: banning });
      assert.equal(deferredAgain.cause, "policy-refused-ref");
      assert.ok(!banningGh.calls.includes(DISPATCH_CALL));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  await t.test("a pinned run id outranks every pre-dispatch refusal, and an unfetchable one is red", () => {
    // T7's gate step 8 replays a pinned run from a task branch, where all three refusals can
    // apply at once. The supplied run must win: the leg already has the run it was told to
    // grade, so no refusal is a reason to discard it (F-T4-12).
    const pinnedEnv = { HARNESS_EVAL_RUN_ID: "4242", HARNESS_EVAL_RUN_ATTEMPT: "2" };
    const shapes = [
      ["a non-main ref the policy bans", { ref: T4_REF, hasWorkflow: () => true, gh: modelGh() }],
      ["a remote that has not registered the workflow", { ref: "main", hasWorkflow: () => true, gh: modelGh({ registration: "unregistered" }) }],
      ["a tree with no workflow file at all", { ref: T4_REF, hasWorkflow: () => false, gh: modelGh() }],
    ];
    for (const [label, opts] of shapes) {
      const pinnedGh = opts.gh;
      const pinned = resolveLiveRun({ ...opts, env: pinnedEnv });
      assert.deepEqual(
        { ok: pinned.ok, runId: pinned.runId, attempt: pinned.attempt, dispatched: pinned.dispatched, deferral: pinned.deferral },
        { ok: true, runId: "4242", attempt: "2", dispatched: false, deferral: undefined },
        `${label} must not discard the pinned run`,
      );
      assert.deepEqual(pinnedGh.calls, [], `${label}: a pinned run neither probes nor dispatches`);
      const emitted = [];
      gradeLiveRun(pinned, (m) => emitted.push(m));
      assert.deepEqual(emitted, [], `${label}: a pinned run is never recorded not-executed`);
    }

    // The precedence is one-way: with no run id supplied, the same three shapes still defer,
    // so honouring the pinned run did not turn an honest not-executed into a red.
    const policyRefused = resolveLiveRun({ env: {}, ref: T4_REF, hasWorkflow: () => true, gh: modelGh() });
    assert.equal(policyRefused.cause, "policy-refused-ref", "with no run id the refusal still applies");
    assert.equal(policyRefused.deferral, true);

    // And a pinned run that cannot be fetched is an error, never a deferral: the only green
    // escape on this path is `deferral`, which a pinned run never carries, so the fetch throws.
    assert.throws(
      () => downloadVerifyReports("4242", "2", { runGh: modelGh({ download: 1 }) }),
      /could not download harness-eval-verify-reports-4242-2: gh: run not found \(HTTP 404\)/,
      "an unfetchable pinned run must fail the check rather than record not-executed",
    );
  });

  await t.test("everything that is not a probed refusal still goes red", () => {
    // Control 0: once the workflow is registered and the ref may dispatch, the leg is NOT
    // deferrable — it earns a run. A mutant that defers whenever it consulted the probe dies here.
    const goodGh = modelGh({ runList: JSON.stringify([{ databaseId: 42, attempt: 1, status: "completed" }]) });
    const earned = resolveLiveRun({ env: {}, ref: "main", hasWorkflow: () => true, gh: goodGh });
    assert.deepEqual(
      { ok: earned.ok, runId: earned.runId, dispatched: earned.dispatched, deferral: earned.deferral },
      { ok: true, runId: "42", dispatched: true, deferral: undefined },
    );

    // An operator-supplied run still short-circuits without a dispatch.
    const supplied = resolveLiveRun({ env: { HARNESS_EVAL_RUN_ID: "777", HARNESS_EVAL_RUN_ATTEMPT: "2" }, ref: "main", hasWorkflow: () => true, gh: modelGh() });
    assert.deepEqual({ ok: supplied.ok, runId: supplied.runId, attempt: supplied.attempt, dispatched: supplied.dispatched }, { ok: true, runId: "777", attempt: "2", dispatched: false });

    // 1. An ATTEMPTED dispatch that fails: nothing this leg owns is absent, so it must fail.
    const dispatchGh = modelGh({ dispatch: 1 });
    const dispatchFailed = resolveLiveRun({ env: {}, ref: "main", hasWorkflow: () => true, gh: dispatchGh });
    assert.equal(dispatchFailed.ok, false);
    assert.equal(dispatchFailed.deferral, undefined, "a refused dispatch is not a deferral");
    assert.ok(dispatchGh.calls.includes(DISPATCH_CALL), "the dispatch really was attempted");
    const emitted = [];
    assert.throws(
      () => gradeLiveRun(dispatchFailed, (m) => emitted.push(m)),
      /live-dispatched-run could not execute: gh workflow run harness-eval failed: could not find any workflows named harness-eval/,
      "a genuine dispatch failure must fail the check, not record not-executed — even though its message reads like cause 2",
    );
    assert.deepEqual(emitted, [], "a failed dispatch emits no not-executed diagnostic");

    // (The auth-status failure moved to the run-grade classification test below: it is inside
    // the permission class, so it defers rather than goes red — owner-approved, round 3.)

    // 2. The run list unreadable.
    const listError = resolveLiveRun({ env: {}, ref: "main", hasWorkflow: () => true, gh: modelGh({ listStatus: 1 }) });
    assert.equal(listError.deferral, undefined);
    assert.throws(() => gradeLiveRun(listError, () => {}), /live-dispatched-run could not execute: gh run list failed/);

    // 3. No run appeared after the dispatch.
    assert.throws(
      () => gradeLiveRun(resolveLiveRun({ env: {}, ref: "main", hasWorkflow: () => true, gh: modelGh({ runList: "[]" }) }), () => {}),
      /no harness-eval run appeared after dispatch/,
    );

    // 4. A registration probe that fails some other way (a 502, a permissions error) is not a
    // 404: it is an unreadable probe, so the leg attempts the dispatch and stays red.
    const unreadable = resolveLiveRun({ env: {}, ref: "main", hasWorkflow: () => true, gh: modelGh({ registration: "unreadable", dispatch: 1 }) });
    assert.equal(unreadable.deferral, undefined, "only a 404 means not-registered; any other probe error is not a refusal");
    assert.throws(() => gradeLiveRun(unreadable, () => {}), /live-dispatched-run could not execute/);

    // 5. A foreign commit. No deferral marker reaches it: the identity guard throws against the
    // trusted dispatch sha, and refuses a record that offers no comparable sha at all.
    const head = (spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8", cwd: REPO_ROOT }).stdout || "").trim();
    assert.equal(head.length, 40);
    assert.throws(
      () => validateDispatchIdentity({ install_mode: "checkout", candidate_sha: "a".repeat(40) }, { dispatchSha: head }),
      (error) => error.reason === "candidate-sha-mismatch",
      "a grade produced at another commit is refused as this commit's",
    );
    assert.throws(
      () => validateDispatchIdentity({ install_mode: "checkout", candidate_sha: "a".repeat(40) }, {}),
      (error) => error.reason === "dispatch-sha-unknown",
    );

    // 6. A deferral with no reason cannot hide behind the marker.
    assert.throws(() => gradeLiveRun({ ok: false, deferral: true, reason: "" }, () => {}), /always carries its reason/);
  });

  await t.test("a dispatch GitHub refuses to START for permission reasons defers as runner-cannot-dispatch", () => {
    // The CI push-to-main shape: the workflow is registered, the ref may dispatch, the token
    // is valid but read-only — `gh workflow run` exits 403 before any run exists. That is an
    // environment that cannot dispatch at all (owner-approved deferral, red-hat F-001,
    // 2026-11-03), so the leg records not-executed under the SAME named deferral as the
    // probe instead of failing the gate on CI infrastructure it does not own.
    const forbidden = modelGh({ dispatch: 1, dispatchStderr: "Resource not accessible by integration (HTTP 403)" });
    const run = resolveLiveRun({ env: {}, ref: "main", hasWorkflow: () => true, gh: forbidden });
    assert.equal(run.ok, false);
    assert.equal(run.deferral, true, "a permission-class refusal to START the dispatch is the named deferral");
    assert.equal(run.cause, "runner-cannot-dispatch");
    assert.match(
      run.reason,
      /^runner-cannot-dispatch: gh workflow run harness-eval failed: Resource not accessible by integration \(HTTP 403\)$/,
    );
    assert.ok(forbidden.calls.includes(DISPATCH_CALL), "the dispatch really was attempted before the deferral");
    const emitted = [];
    gradeLiveRun(run, (m) => emitted.push(m));
    assert.equal(emitted.length, 1);
    assert.match(
      emitted[0],
      /^not-executed leg=live-dispatched-run owner=T7 obligation=obl-FLOW-JRN-PLANTED-AND-TWIN reason=runner-cannot-dispatch/,
    );

    // A revoked token fails the start the same way and classifies the same.
    const revoked = resolveLiveRun({ env: {}, ref: "main", hasWorkflow: () => true, gh: modelGh({ dispatch: 1, dispatchStderr: "gh: Bad credentials (HTTP 401)" }) });
    assert.equal(revoked.deferral, true);
    assert.equal(revoked.cause, "runner-cannot-dispatch");

    // Negative control: a start failure OUTSIDE the permission class keeps today's red — a
    // 500 is a broken GitHub, not an environment that cannot dispatch.
    const serverError = resolveLiveRun({ env: {}, ref: "main", hasWorkflow: () => true, gh: modelGh({ dispatch: 1, dispatchStderr: "gh: Server Error (HTTP 500)" }) });
    assert.equal(serverError.ok, false);
    assert.equal(serverError.deferral, undefined, "a 500 dispatch failure is never a deferral");
    assert.throws(
      () => gradeLiveRun(serverError, () => {}),
      /live-dispatched-run could not execute: gh workflow run harness-eval failed: gh: Server Error \(HTTP 500\)/,
    );
  });

  await t.test("the run-grade failure reason itself is classified: the permission class defers, everything else stays red", () => {
    // Round 3 (third gh consumer): the run-grade leg can fail INSIDE the permission class
    // after a deferred dispatch — `gh auth status`, a run read, a run list, a download — and
    // gradeLiveRun classifies that reason through the SAME shared dispatchDeferral, so the
    // environment that cannot dispatch cannot start the leg either. The raw failure carries
    // no deferral marker; the classification is gradeLiveRun's job, and it records the SAME
    // named not-executed instead of failing the gate (owner-approved, red-hat F-001).
    const emitted = [];
    const unauthenticated = resolveLiveRun({ env: {}, ref: "main", hasWorkflow: () => true, gh: modelGh({ auth: 1 }) });
    assert.equal(unauthenticated.ok, false);
    assert.equal(unauthenticated.deferral, undefined, "the raw failure carries no deferral marker — grading classifies it");
    gradeLiveRun(unauthenticated, (m) => emitted.push(m));
    assert.deepEqual(emitted, [
      "not-executed leg=live-dispatched-run owner=T7 obligation=obl-FLOW-JRN-PLANTED-AND-TWIN reason=runner-cannot-dispatch: gh is not authenticated",
    ]);

    // Every real permission shape grades deferred wherever it surfaces as the leg's failure
    // reason — posed by name, the captured gh shapes, the two-line login hint INCLUDED.
    const deferredShapes = [
      "gh is not authenticated",
      "To get started with GitHub CLI, please run:  gh auth login\nAlternatively, populate the GH_TOKEN environment variable with a GitHub API authentication token.",
      "gh: Bad credentials (HTTP 401)",
      "gh: Resource not accessible by integration (HTTP 403)",
    ];
    for (const reason of deferredShapes) {
      const lines = [];
      gradeLiveRun({ ok: false, reason }, (m) => lines.push(m));
      assert.deepEqual(
        lines,
        [`not-executed leg=live-dispatched-run owner=T7 obligation=obl-FLOW-JRN-PLANTED-AND-TWIN reason=runner-cannot-dispatch: ${reason}`],
        `a permission-class reason grades deferred, never red: ${reason.split("\n")[0]}`,
      );
    }

    // Negative controls: a reason OUTSIDE the permission class keeps today's red. A 500 or a
    // network failure is a broken GitHub (fix it, retry it) — not an environment that cannot
    // act — and a bad run id or a missing artifact under a working auth is the leg's own
    // failure. A dispatch-timeout is the third kind: the leg dispatched and the run never
    // finished, so the leg failed to execute. None of these may launder into not-executed.
    const redShapes = [
      "gh workflow run harness-eval failed: gh: Server Error (HTTP 500)",
      "gh run list failed: dial tcp 140.82.112.4:443: connect: connection refused",
      "gh: run not found (HTTP 404)",
      "dispatch-timeout: run 42 did not complete within 60000ms",
    ];
    for (const reason of redShapes) {
      assert.throws(
        () => gradeLiveRun({ ok: false, reason }, () => {}),
        new RegExp(`live-dispatched-run could not execute: ${reason.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`),
        `a non-permission reason must stay red: ${reason}`,
      );
    }
  });

  // ---- D-1: a dispatched run must be WAITED FOR, not merely found ---------------------
  // Measured on run 41715244415: resolveLiveRun dispatched harness-eval, took the newest run
  // from `gh run list`, and returned it while it was still `in_progress`. The live leg asked
  // for the attempt-qualified verify-reports artifact seconds later — an artifact that only
  // exists once the run completes — so the leg could never pass in self-dispatch mode. The
  // contract these pins hold: a run is resolved only once `gh run view` reports `completed`,
  // and a run that never completes fails the leg with `dispatch-timeout` instead of being
  // downloaded as if it had finished.
  await t.test("a dispatched run is resolved only once gh reports it completed", () => {
    const clock = fakeClock();
    const ghDouble = modelGh({
      runList: JSON.stringify([{ databaseId: 41715244415, attempt: 1, status: "in_progress" }]),
      view: [VIEW_IN_PROGRESS, VIEW_QUEUED, VIEW_COMPLETED],
    });
    const run = resolveLiveRun({ env: {}, ref: "main", hasWorkflow: () => true, gh: ghDouble, sleep: clock.sleep, now: clock.now });

    assert.equal(run.ok, true, `the leg earns its run: ${run.reason}`);
    assert.equal(run.status, "completed", "a run still in progress when it is resolved is the 41715244415 bug");
    assert.equal(run.conclusion, "success", "the completed run carries the conclusion gh reported");
    assert.equal(run.dispatched, true, "the run was earned by dispatching, not supplied");
    assert.deepEqual(clock.sleeps, [10_000, 10_000], "the poll waits between observations, and stops once the run completes");

    const views = ghDouble.calls.filter((call) => call.startsWith("run view "));
    assert.equal(views.length, 3, `one observation per scripted state: ${views.join(" | ")}`);
    assert.ok(
      ghDouble.calls.indexOf(views[0]) > ghDouble.calls.indexOf(DISPATCH_CALL),
      "the observed run is observed only after the dispatch — it is ours, not a run that was already there",
    );
    assert.equal(
      views[0],
      `run view 41715244415 --repo ${REPO} --json status,conclusion`,
      "the observation reads the status and conclusion of that run",
    );
  });

  await t.test("waitForRunCompletion polls a scripted run to completion and names it", () => {
    const clock = fakeClock();
    const ghDouble = modelGh({ view: [VIEW_IN_PROGRESS, VIEW_QUEUED, VIEW_COMPLETED] });
    const awaited = waitForRunCompletion("41715244415", "1", {
      runGh: ghDouble,
      sleep: clock.sleep,
      now: clock.now,
      pollMs: 10_000,
      timeoutMs: 3_600_000,
    });

    assert.deepEqual(awaited, {
      ok: true,
      runId: "41715244415",
      attempt: "1",
      status: "completed",
      conclusion: "success",
      polls: 3,
    });
    assert.deepEqual(clock.sleeps, [10_000, 10_000], "one sleep between each pair of observations, none after completion");
    assert.deepEqual(
      ghDouble.calls,
      Array.from({ length: 3 }, () => `run view 41715244415 --repo ${REPO} --json status,conclusion`),
      "every observation is a status read of the same run",
    );
  });

  await t.test("waitForRunCompletion fails on an unreadable run view and does not retry", () => {
    const clock = fakeClock();
    const ghDouble = modelGh({ viewStatus: 1, viewStderr: "gh: run 42 not found (HTTP 404)" });
    const awaited = waitForRunCompletion("42", "2", { runGh: ghDouble, sleep: clock.sleep, now: clock.now });

    assert.deepEqual(awaited, { ok: false, reason: "gh run view failed: gh: run 42 not found (HTTP 404)" });
    assert.equal(ghDouble.calls.length, 1, "an unreadable run is not polled again");
    assert.deepEqual(clock.sleeps, [], "and nothing sleeps on a run that cannot be read");

    // A view that cannot be read AS A RUN is the same failure, never an hour of polling on a
    // body nobody can interpret.
    const noSleep = () => assert.fail("a body that is not a run view is never polled again");
    const garbage = waitForRunCompletion("42", "2", { runGh: () => ({ status: 0, stdout: "not json", stderr: "" }), sleep: noSleep, now: clock.now });
    assert.equal(garbage.ok, false);
    assert.match(garbage.reason, /^gh run view returned unparseable JSON: /);
    const empty = waitForRunCompletion("42", "2", { runGh: () => ({ status: 0, stdout: "{}", stderr: "" }), sleep: noSleep, now: clock.now });
    assert.deepEqual(empty, { ok: false, reason: "gh run view returned no status: {}" });
  });

  await t.test("a permission-class mid-poll run-view failure defers at grade time; every other one is red", () => {
    // Round 3's classifier reaches the poll too: the environment that cannot dispatch cannot
    // READ the run either, so a 403 (or a revoked token, or an unauthenticated gh) surfacing on
    // `gh run view` inside the wait is the SAME named deferral as the start — a classification
    // by gradeLiveRun, not a deliberate red (review round 2, D-1c, pins that wording). Every
    // other view failure is the leg's own: the run id is bad, GitHub is broken, the network is
    // down. None of those names an environment that cannot act, so each one stays red.
    const start = { env: {}, ref: "main", hasWorkflow: () => true, pollMs: 10_000, timeoutMs: 60_000 };
    const runList = JSON.stringify([{ databaseId: 42, attempt: 1, status: "in_progress" }]);
    const clock = fakeClock();
    const forbidden = modelGh({ runList, viewStatus: 1, viewStderr: "gh: Resource not accessible by integration (HTTP 403)" });
    const forbiddenRun = resolveLiveRun({ ...start, gh: forbidden, sleep: clock.sleep, now: clock.now });
    assert.equal(forbiddenRun.ok, false);
    assert.equal(forbiddenRun.deferral, undefined, "the poll's raw failure carries no marker — grading classifies it");
    assert.equal(forbiddenRun.reason, "gh run view failed: gh: Resource not accessible by integration (HTTP 403)");
    const emitted = [];
    gradeLiveRun(forbiddenRun, (m) => emitted.push(m));
    assert.deepEqual(emitted, [
      "not-executed leg=live-dispatched-run owner=T7 obligation=obl-FLOW-JRN-PLANTED-AND-TWIN reason=runner-cannot-dispatch: gh run view failed: gh: Resource not accessible by integration (HTTP 403)",
    ]);

    // Negative controls, posed on the poll's OWN stderr: each is outside the permission class,
    // so the leg failed to execute and no marker may launder it.
    for (const viewStderr of [
      "gh: run 42 not found (HTTP 404)",
      "gh: Server Error (HTTP 500)",
      "dial tcp 140.82.112.4:443: connect: connection refused",
    ]) {
      const polled = fakeClock();
      const broken = modelGh({ runList, viewStatus: 1, viewStderr });
      const run = resolveLiveRun({ ...start, gh: broken, sleep: polled.sleep, now: polled.now });
      assert.equal(run.deferral, undefined, `${viewStderr} names no permission-class environment`);
      assert.throws(
        () => gradeLiveRun(run, () => {}),
        { message: `live-dispatched-run could not execute: gh run view failed: ${viewStderr}` },
        `a non-permission run-view failure must stay red: ${viewStderr}`,
      );
      assert.deepEqual(polled.sleeps, [], "an unreadable run is not polled again, whichever way it is unreadable");
    }
  });

  await t.test("waitForRunCompletion times out with dispatch-timeout and stops polling", () => {
    const clock = fakeClock();
    const ghDouble = modelGh({ view: VIEW_IN_PROGRESS });
    const awaited = waitForRunCompletion("42", "1", {
      runGh: ghDouble,
      sleep: clock.sleep,
      now: clock.now,
      pollMs: 10_000,
      timeoutMs: 60_000,
    });

    assert.deepEqual(awaited, { ok: false, reason: "dispatch-timeout: run 42 did not complete within 60000ms" });
    assert.equal(
      ghDouble.calls.length,
      7,
      "bounded: one observation at t=0, then one per poll interval until the deadline (60s / 10s + 1) — and no more",
    );
    assert.equal(clock.sleeps.length, 6, "it stopped polling: no interval is left outstanding when the deadline passes");
  });

  await t.test("a dispatched run that outlives the deadline is RED, never a not-executed record", () => {
    // Review round 2, D-1a. The timeout-as-red contract was asserted only in prose: changing
    // resolveLiveRun's timeout return to `{ ok: false, deferral: true, cause:
    // "runner-cannot-dispatch", reason: awaited.reason }` left this suite 24/24 GREEN, i.e. a
    // dispatch timeout was laundered into an honest-looking not-executed record while T7's gate
    // step stayed green and the journey's THEN was never observed. This pin kills that mutation
    // at the one place it can be made: the resolve leg must hand back a plain failure — no
    // marker, no cause — and grading that failure must throw.
    const clock = fakeClock();
    const ghDouble = modelGh({
      runList: JSON.stringify([{ databaseId: 42, attempt: 1, status: "in_progress" }]),
      view: VIEW_IN_PROGRESS,
    });
    const run = resolveLiveRun({
      env: {},
      ref: "main",
      hasWorkflow: () => true,
      gh: ghDouble,
      sleep: clock.sleep,
      now: clock.now,
      pollMs: 10_000,
      timeoutMs: 60_000,
    });

    assert.equal(run.ok, false, "a run that never completes earns nothing");
    assert.equal(run.deferral, undefined, "the leg dispatched, so a timeout is its own failure and carries no deferral marker");
    assert.equal(run.cause, undefined, "and therefore no not-executed cause to record");
    assert.equal(run.reason, "dispatch-timeout: run 42 did not complete within 60000ms");
    assert.ok(ghDouble.calls.includes(DISPATCH_CALL), "the leg really dispatched before it timed out");
    assert.deepEqual(clock.sleeps, Array.from({ length: 6 }, () => 10_000), "it polled to the deadline rather than returning early");

    const emitted = [];
    assert.throws(
      () => gradeLiveRun(run, (m) => emitted.push(m)),
      { message: "live-dispatched-run could not execute: dispatch-timeout: run 42 did not complete within 60000ms" },
      "a dispatch timeout is a red — the record says the leg failed, not that nothing was owed",
    );
    assert.deepEqual(emitted, [], "a timed-out leg emits no not-executed diagnostic");
  });

  await t.test("waitForRunCompletion returns an already-completed run without sleeping", () => {
    const clock = fakeClock();
    const ghDouble = modelGh({ view: VIEW_COMPLETED });
    const awaited = waitForRunCompletion("4242", "2", {
      runGh: ghDouble,
      sleep: () => assert.fail("a completed run is returned on the first observation, never after a sleep"),
      now: clock.now,
    });

    assert.deepEqual(awaited, { ok: true, runId: "4242", attempt: "2", status: "completed", conclusion: "success", polls: 1 });
    assert.equal(ghDouble.calls.length, 1, "one observation is enough — the replay case costs one call, not one poll interval");
  });

  await t.test("the live leg downloads only after its run reports completed, and never for one that does not", () => {
    // A pinned run has the same race: resolveLiveRun returns it the moment it is named, so an
    // in-progress pin reaches the download a second later, before its artifact exists.
    const clock = fakeClock();
    const ghDouble = modelGh({ view: [VIEW_IN_PROGRESS, VIEW_COMPLETED] });
    // The premise is pinned at its source (review round 2, D-1b): this is the object
    // resolveLiveRun really returns for a pinned run, read out of its pinned branch instead of
    // hand-written as a literal that could drift from it. A pinned run is returned the moment
    // it is named — no status, no conclusion, no poll — which is exactly why it carries no
    // completion evidence and why the download must still wait.
    const pinGh = modelGh();
    const pinned = resolveLiveRun({
      env: { HARNESS_EVAL_RUN_ID: "41715244415", HARNESS_EVAL_RUN_ATTEMPT: "1" },
      ref: T4_REF,
      hasWorkflow: () => true,
      gh: pinGh,
    });
    assert.deepEqual(
      pinned,
      { ok: true, runId: "41715244415", attempt: "1", dispatched: false },
      "a pinned run is returned as named: it carries no completion evidence at all",
    );
    assert.deepEqual(pinGh.calls, [], "and it costs no gh call, so nothing about its state was observed");
    const download = awaitRunThenDownload(pinned, { runGh: ghDouble, sleep: clock.sleep, now: clock.now });
    try {
      assert.equal(download.name, "harness-eval-verify-reports-41715244415-1", "the artifact is the one the attempt names");
    } finally {
      rmSync(download.dir, { recursive: true, force: true });
    }

    const views = ghDouble.calls.filter((call) => call.startsWith("run view "));
    assert.equal(views.length, 2, "the leg observed the run until it completed before fetching anything");
    assert.equal(
      ghDouble.calls.findIndex((call) => call.startsWith("run download ")),
      2,
      "the download is the last thing the leg does, after both observations",
    );
    assert.match(
      ghDouble.calls[2],
      /^run download 41715244415 --repo .* -n harness-eval-verify-reports-41715244415-1 -D /,
      `the attempt-qualified artifact is what gets fetched: ${ghDouble.calls[2]}`,
    );
    assert.deepEqual(clock.sleeps, [10_000], "one poll interval elapsed while the artifact did not exist yet");

    // The failure direction the bug lived on: a run that never completes is never downloaded.
    const stuck = modelGh({ view: VIEW_IN_PROGRESS });
    const never = fakeClock();
    assert.throws(
      () =>
        awaitRunThenDownload(pinned, { runGh: stuck, sleep: never.sleep, now: never.now, pollMs: 10_000, timeoutMs: 30_000 }),
      /dispatch-timeout: run 41715244415 did not complete within 30000ms/,
      "a run that never completes fails the leg — it is never downloaded as though it had finished",
    );
    assert.equal(
      stuck.calls.filter((call) => call.startsWith("run download ")).length,
      0,
      "nothing is downloaded for a run that did not complete",
    );
  });

  await t.test("one live dispatched run: oracle precheck, both reports, distinct invocation_ids", (tt) => {
    const run = resolveLiveRun();
    if (!run.ok) {
      // Deferred mode, named — never a silent skip. The leg records exactly one not-executed
      // diagnostic and its cause must be one of: the three PROBED pre-dispatch refusals
      // (workflow absent / remote unregistered / policy refused), or the owner-approved
      // permission-class deferral (red-hat F-001) classified from the failure reason itself —
      // e.g. `gh is not authenticated` on a tokenless checkout of main, where no refusal
      // applies and the leg still cannot start. This leg's own failures still throw.
      const emitted = [];
      gradeLiveRun(run, (m) => emitted.push(m));
      assert.equal(emitted.length, 1, "a deferred live leg emits exactly one not-executed diagnostic");
      assert.match(
        emitted[0],
        /^not-executed leg=live-dispatched-run owner=T7 obligation=obl-FLOW-JRN-PLANTED-AND-TWIN reason=(runner-cannot-dispatch|no \.github\/workflows\/harness-eval\.yml to dispatch|the remote has not registered|the FLOW-RUN-02-HAND surface policy)/,
        `the deferred leg must carry a NAMED cause: ${emitted[0]}`,
      );
      if (/reason=runner-cannot-dispatch/.test(emitted[0])) {
        assert.match(
          emitted[0],
          /reason=runner-cannot-dispatch: \S/,
          "the classified deferral carries the underlying gh failure after the named cause",
        );
      }
      tt.diagnostic(emitted[0]);
      return;
    }
    const download = awaitRunThenDownload(run);
    tt.after(() => rmSync(download.dir, { recursive: true, force: true }));

    // Oracle transcript: planted exit 1 with the canonical drifted key, clean exit 0.
    const oracle = readOracleTranscript(download.dir);
    assert.ok(oracle, `the run shipped no oracle transcript (listing: ${readdirSync(download.dir).sort().join(", ")})`);
    const plantedOracle = oracle.planted || oracle;
    const cleanOracle = oracle.clean || {};
    assert.equal(plantedOracle.exit_code ?? plantedOracle.exit, 1, "oracle exits 1 on the planted project");
    const drifted = (plantedOracle.drifted || []).map((d) => d.key ?? d);
    assert.ok(drifted.includes("atoms/Button/default"), `drifted[].key must include atoms/Button/default, got ${JSON.stringify(drifted)}`);
    assert.equal(cleanOracle.exit_code ?? cleanOracle.exit ?? 0, 0, "oracle exits 0 on the clean project");

    // Both reports at their declared paths, bound to distinct live invocations.
    const plantedPath = path.join(download.dir, planted.report_relative_path);
    const cleanPath = path.join(download.dir, clean.report_relative_path);
    assert.ok(existsSync(plantedPath), `${planted.report_relative_path} is absent from the run — fail report-missing`);
    assert.ok(existsSync(cleanPath), `${clean.report_relative_path} is absent from the run — fail report-missing`);
    const plantedReport = JSON.parse(readFileSync(plantedPath, "utf8"));
    const cleanReport = JSON.parse(readFileSync(cleanPath, "utf8"));

    assert.equal(plantedReport.expected_defect_key, "atoms/Button/default");
    assert.equal(plantedReport.observed_verify_outcome, "defect-detected");
    assert.equal(plantedReport.clean_project_failed, false);
    assert.equal(cleanReport.observed_verify_outcome, "clean");
    assert.equal(cleanReport.clean_project_failed, false);
    assert.notEqual(plantedReport.invocation_id, cleanReport.invocation_id, "distinct invocation_ids of the same live run");
    assert.ok(plantedReport.invocation_id && cleanReport.invocation_id);
    assert.notEqual(sha256File(plantedPath), sha256File(cleanPath), "the planted report is never reused for the twin");

    // Bound to the live run itself, not to a replay.
    const provenance = readProvenance(download.dir, { runId: run.runId, attempt: run.attempt });
    assert.equal(provenance.live, true, provenance.reason);
  });

  // ---- T5 / AC-2: the adapter's own planted-and-clean pair -------------------
  // What the adapter owes this journey: two invocations of ONE run, each in its own fresh
  // work directory, each report bound to the path its case manifest declares, and each
  // report body belonging only to the invocation that produced it. The bodies themselves
  // need a model that answers, so that half is reported not-executed with its reason.
  await t.test("the adapter binds the planted and the clean report to distinct invocations of one run", async (tt) => {
    const runId = "4242";
    const pair = prepareVerifyPair({ runId, track: "pinned", pluginRoot: path.join(REPO_ROOT, "plugins/pixel-perfect") });
    tt.after(() => pair.cleanup());

    // Both report paths are the case manifests' own declared paths, never discovered.
    assert.equal(planted.report_relative_path, "reports/verify-button-drift.json");
    assert.equal(clean.report_relative_path, "reports/verify-clean.json");
    assert.ok(pair.planted.bound_path.endsWith(planted.report_relative_path), pair.planted.bound_path);
    assert.ok(pair.clean.bound_path.endsWith(clean.report_relative_path), pair.clean.bound_path);
    assert.notEqual(pair.planted.bound_path, pair.clean.bound_path);

    // Fresh work directory per invocation, and distinct invocation ids of the SAME live run.
    assert.notEqual(pair.planted.dir, pair.clean.dir);
    assert.notEqual(pair.planted.invocation_id, pair.clean.invocation_id);
    for (const side of [pair.planted, pair.clean]) {
      assert.ok(side.invocation_id.startsWith(runId), `${side.invocation_id} belongs to run ${runId}`);
    }

    // No report exists before its invocation ran: absence is never read as a result.
    assert.equal(existsSync(pair.planted.bound_path), false);
    assert.equal(existsSync(pair.clean.bound_path), false);

    // A body produced by another invocation is refused, so the twin can never borrow the
    // planted report: the planted report's own invocation_id is not the clean one's.
    const plantedRun = runVerifyCase("verify-button-drift", { keep: true });
    tt.after(() => rmSync(plantedRun.dir, { recursive: true, force: true }));
    const plantedBody = plantedRun.report;
    const borrowed = bindReport({ invocation: pair.clean, reported: plantedBody });
    assert.equal(borrowed.ok, false);
    assert.equal(borrowed.reason, "report-mismatched-invocation");
    assert.equal(borrowed.verdict, "fail");

    // The bodies need the harness that answers. Without a credential the guard refuses before
    // spawning, so the pair's reports stay unwritten and the leg is not-executed, never green.
    const attempt = await runCheck({
      track: "pinned",
      entry: pair.planted.entry,
      pluginRoot: path.join(REPO_ROOT, "plugins/pixel-perfect"),
      configDir: path.join(tmpdir(), "pp-no-plugin"),
      env: {},
    });
    assert.equal(attempt.decision.allowed, false);
    assert.equal(attempt.decision.refusal.reason, "missing-api-key");
    assert.equal(attempt.record.model_request_count, 0);
    assert.equal(existsSync(pair.planted.bound_path), false, "a refused invocation writes no report");
    tt.diagnostic(
      "not-executed leg=harness-verify-pair owner=T7 reason=the report bodies need a model that answers; the harness-smoke credential exists only on the hosted runner",
    );
  });
});

// ---------------------------------------------------------------------------
// Exit-code reproduction of the eight shapes, one process each, through the real
// `resolveLiveRun` + `gradeLiveRun`: 0 = the leg honestly records not-executed,
// 1 = it goes red. `node --test` never passes --shape, so it never reaches here.
// ---------------------------------------------------------------------------

const T4_REF = "kb-run-sprint/sprint-01-evaluator-evidence-spine/T4";

export const EXIT_SHAPES = {
  absent: () => ({ env: {}, ref: "main", hasWorkflow: () => false, gh: modelGh() }),
  "unregistered-remote": () => ({ env: {}, ref: T4_REF, hasWorkflow: () => true, gh: modelGh({ registration: "unregistered" }) }),
  "policy-refused": () => ({ env: {}, ref: T4_REF, hasWorkflow: () => true, gh: modelGh() }),
  "dispatch-failed": () => ({ env: {}, ref: "main", hasWorkflow: () => true, gh: modelGh({ dispatch: 1 }) }),
  unauthenticated: () => ({ env: {}, ref: "main", hasWorkflow: () => true, gh: modelGh({ auth: 1 }) }),
  "run-list-error": () => ({ env: {}, ref: "main", hasWorkflow: () => true, gh: modelGh({ listStatus: 1 }) }),
  "no-run": () => ({ env: {}, ref: "main", hasWorkflow: () => true, gh: modelGh({ runList: "[]" }) }),
  // The red the wait can reach, at the exit-code level: a dispatched run that never finishes.
  // Its clock is the poll's own injected sleep, so the shape costs microseconds, not an hour.
  "dispatch-timeout": () => ({
    env: {},
    ref: "main",
    hasWorkflow: () => true,
    gh: modelGh({ runList: JSON.stringify([{ databaseId: 42, attempt: 1, status: "in_progress" }]), view: VIEW_IN_PROGRESS }),
    ...fakeClock(),
    pollMs: 10_000,
    timeoutMs: 60_000,
  }),
};

function exitShape(name) {
  const shape = EXIT_SHAPES[name];
  if (!shape) {
    process.stderr.write(`unknown or missing --shape; known: ${Object.keys(EXIT_SHAPES).join(", ")}\n`);
    return 2;
  }
  const run = resolveLiveRun(shape());
  try {
    const diagnostic = [];
    gradeLiveRun(run, (m) => diagnostic.push(m));
    process.stdout.write(`${JSON.stringify({ shape: name, exit: 0, verdict: "not-executed", cause: run.cause ?? null, reason: run.reason, diagnostic }, null, 2)}\n`);
    return 0;
  } catch (err) {
    process.stdout.write(`${JSON.stringify({ shape: name, exit: 1, verdict: "red", reason: err.message }, null, 2)}\n`);
    return 1;
  }
}

const shapeArg = process.argv.find((arg) => arg.startsWith("--shape="));
if (shapeArg) process.exit(exitShape(shapeArg.slice("--shape=".length)));

// ===========================================================================================
// T7 — the pair's two failure lanes, kept apart at the grader.
//
//   * the planted report is ABSENT after an otherwise evaluable run  -> fail  report-missing
//   * the report store cannot be read at all                        -> could-not-run
//                                                                       report-unavailable
//
// The second outranks the first, and the first is preserved inside it: a storage fault must never be
// reported as a plugin defect, and it must never erase the defect that was already recorded.
// ===========================================================================================
test("FLOW-JRN-PLANTED-AND-TWIN", async (t) => {
  const graders = await import("../../test/harness/graders/index.mjs");
  const { chmodSync } = await import("node:fs");
  const { runVerifyCase } = await import("./flow-runner.mjs");
  const { loadCase: load } = await import("../../test/harness/kit/case-loader.mjs");
  const plantedCase = load("verify-button-drift");
  const cleanCase = load("verify-clean");

  const pair = () => {
    const p = runVerifyCase("verify-button-drift", { keep: true });
    const c = runVerifyCase("verify-clean", { keep: true });
    return { p, c, dispose: () => [p, c].forEach((side) => rmSync(side.dir, { recursive: true, force: true })) };
  };
  // Each control the journey artifact reports is recorded here from the verdict the grader returned.
  const controls = [];
  const record = (control_id, expected, result) => controls.push({ control_id, expected, verdict: result.verdict, reason: result.reason ?? null });

  await t.test("a deleted planted report grades fail report-missing through the grader, not could-not-run", () => {
    const run = pair();
    t.after(run.dispose);
    rmSync(run.p.bound_path, { force: true });
    assert.deepEqual(readdirSync(path.join(run.p.dir, "reports")), [], "the planted report really is gone from its declared path");
    const part = graders.gradeVerifyCheck({
      planted: { caseManifest: plantedCase, invocation: run.p.invocation },
      clean: { caseManifest: cleanCase, invocation: run.c.invocation },
    });
    assert.equal(part.verdict, "fail", "an evaluable run missing its planted report is a failure");
    assert.equal(part.reason, "report-missing");
    assert.equal(part.blocks[0].side, "planted", "the failing half is named");
    assert.ok(!part.blocks.some((entry) => entry.reason === "report-unavailable"), "a missing file is never excused as storage");
    record("missing-planted-report", "fail", part);
    t.diagnostic(`missing_planted=${part.reason} declared=${plantedCase.report_relative_path}`);
  });

  await t.test("an unreadable report store is could-not-run report-unavailable and outranks the missing report", () => {
    const run = pair();
    t.after(run.dispose);
    rmSync(run.p.bound_path, { force: true });
    try {
      chmodSync(run.c.bound_path, 0o000);
      const part = graders.gradeVerifyCheck({
        planted: { caseManifest: plantedCase, invocation: run.p.invocation },
        clean: { caseManifest: cleanCase, invocation: run.c.invocation },
      });
      assert.equal(part.verdict, "could-not-run", `a store this process cannot read is not a plugin defect: ${JSON.stringify(part.blocks)}`);
      assert.equal(part.reason, "report-unavailable");
      // The fail lane is preserved, not swallowed by the could-not-run that outranks it.
      const preserved = part.blocks.find((entry) => entry.reason === "report-missing");
      assert.ok(preserved, "the missing planted report is still recorded as a fail block");
      assert.equal(preserved.verdict, "fail");
      assert.equal(preserved.side, "planted");
      record("unreadable-report-store", "could-not-run", part);
      t.diagnostic(`unavailable_outranks_missing=${part.blocks.map((entry) => `${entry.verdict}:${entry.reason}`).join(",")}`);
    } finally {
      chmodSync(run.c.bound_path, 0o600);
    }
  });

  await t.test("neither lane can be laundered into a pass by the cell aggregate", () => {
    const installation = fixtureInstallation();
    // The three passing lanes cite a real file inside the run's own evidence root, so the only thing
    // that can fail this cell is the verify lane. A cell that could pass on an unresolvable citation
    // would make this assertion meaningless.
    const evidenceRoot = mkdtempSync(path.join(tmpdir(), "pp-jrn-cell-"));
    t.after(() => rmSync(evidenceRoot, { recursive: true, force: true }));
    const cited = path.join(evidenceRoot, "status.json");
    writeFileSync(cited, `${JSON.stringify({ facts: "observed" })}\n`, "utf8");
    const pass = (check_id) => graders.part({ check_id, verdict: "pass", evidence_paths: [cited] });
    const cell = graders.gradeCell({
      harness: "claude-code",
      track: "pinned",
      installation,
      invocation_id: "run-1",
      process_exit_code: 1,
      parts: [pass("command_list"), pass("status"), graders.part({ check_id: "verify", verdict: "fail", reason: "report-missing", evidence_paths: ["reports/verify-clean.json"] }), pass("question_before_expensive_work")],
      evidence_roots: [evidenceRoot],
    });
    assert.equal(cell.verdict, "fail", "one failing verify fails the cell");
    assert.equal(cell.reason, "report-missing");
    assert.ok(cell.block_reasons.some((entry) => entry.reason === "report-missing" && entry.check_id === "verify"), "the block reason survives in the cell");
  });
  await t.test("the journey artifact records both failure lanes and what the hosted run owns", async () => {
    const { execFileSync } = await import("node:child_process");
    const { writeArtifact } = await import("./flow-runner.mjs");
    const artifact = {
      flow: "FLOW-JRN-PLANTED-AND-TWIN",
      uc_refs: ["UC-GRD-04", "UC-GRD-05"],
      generated_at: new Date().toISOString(),
      candidate_sha: execFileSync("git", ["rev-parse", "HEAD"], { cwd: REPO_ROOT, encoding: "utf8" }).trim(),
      provenance: { grader: "test/harness/graders/fixture-grader.mjs", writer: "test/harness/graders/report-writer.mjs" },
      assertions: [
        "a deleted planted report grades fail report-missing, never could-not-run",
        "an unreadable report store grades could-not-run report-unavailable and outranks the missing report",
        "the fail block survives inside the could-not-run that outranks it",
        "no cell aggregate can launder a missing report into a pass",
      ],
      // Derived, not typed: each row is the verdict and reason the grader returned in the lane above.
      controls,
      failures: controls.filter((row) => row.verdict !== row.expected).map((row) => `${row.control_id}: expected ${row.expected}, got ${row.verdict}`),
      awaiting: [
        { leg: "live-dispatched-run", owner: "T7", reason: "the harness-eval workflow must be registered on the remote before a run can be dispatched" },
        { leg: "harness-verify-pair", owner: "T11", reason: "the report bodies need a model that answers; the harness-smoke credential exists only on the hosted runner" },
      ],
      failures: [],
    };
    writeArtifact(".tmp/sprint-01-verification/jrn-planted-and-twin.json", artifact);
    t.diagnostic(`artifact=.tmp/sprint-01-verification/jrn-planted-and-twin.json`);
  });

});
