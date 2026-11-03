// Characterization pins for FLOW-RUN-02-HAND (run02Hand, flow-runner.mjs).
//
// These tests record what the flow DOES today, not what it should do: every assertion is
// the observed value of an artifact field, asserted with exact equality, so a reshape of
// run02Hand or inspectWorkflowDeclaration that moves behavior turns a pin red. The flow
// itself always runs for real — the workflow declaration is read from this repo's actual
// .github/workflows/harness-eval.yml and graded by the real rules. Only the GitHub-side
// collaborators are injected through the flow's option seams (options.probe today; the
// run reader and dispatcher once parameterized), because a unit test must not reach the
// network, and a unit test that talks to GitHub would not be one.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

import { ROOT, dispatchDeferral, readProbeOutcome, runFlow } from "./flow-runner.mjs";

const FLOW = "FLOW-RUN-02-HAND";

// An injected probe that says the workflow is not registered on the default branch — the
// only probe answer that honestly leaves the declaration tier standing.
const UNREGISTERED_PROBE_DETAIL = "harness-eval.yml is not registered on the default branch (HTTP 404)";
const unregisteredProbe = () => ({ available: false, detail: UNREGISTERED_PROBE_DETAIL });

const DISPATCH_REASON =
  "dispatching is allowed only from main (.spec/e2e-policy/sprint-01/dispatch-allowed.json forbids a non-main ref), " +
  "so this branch proves the workflow declaration and the hosted dispatch is replayed at the sprint gate";

// Observed declaration of the repo's real harness-eval.yml: the twelve cells in declared
// matrix order and the job keys in file order.
const DECLARED_CELLS = [
  { harness: "claude-code", track: "pinned" },
  { harness: "claude-code", track: "newest" },
  { harness: "codex", track: "pinned" },
  { harness: "codex", track: "newest" },
  { harness: "grok", track: "pinned" },
  { harness: "grok", track: "newest" },
  { harness: "opencode", track: "pinned" },
  { harness: "opencode", track: "newest" },
  { harness: "pi", track: "pinned" },
  { harness: "pi", track: "newest" },
  { harness: "cursor", track: "pinned" },
  { harness: "cursor", track: "newest" },
];

test("run02Hand grades the declaration tier when the probe reports the workflow unregistered", async () => {
  const artifact = await runFlow(FLOW, {
    probe: unregisteredProbe,
    out: ".tmp/sprint-01-verification/run-02-hand.characterization.tier-b.json",
  });

  // Observed: the real declaration is clean, so the flow is ok even though nothing hosted
  // has run — and it never claims AC-1 from a declaration.
  assert.equal(artifact.ok, true);
  assert.equal(artifact.proof_tier, "workflow-declaration");
  assert.equal(artifact.ac1_satisfied, false);
  assert.deepEqual(artifact.failures, []);

  assert.deepEqual(artifact.live_dispatch, {
    attempted: false,
    available: false,
    probe: UNREGISTERED_PROBE_DETAIL,
    reason: DISPATCH_REASON,
    mode: "none",
  });

  assert.deepEqual(artifact.awaiting_hosted_run, [
    "run.event == workflow_dispatch",
    "the run's artifact records install_mode == checkout for a no-input dispatch",
    "run.headSha == the dispatch commit (candidate_sha)",
    "twelve cells run on a hosted runner",
  ]);

  assert.deepEqual(artifact.identity, {
    event: "workflow_dispatch",
    install_mode: "checkout",
    install_mode_source: "declared default of on.workflow_dispatch.inputs.install_mode",
    candidate_sha: null,
    candidate_sha_source: "awaiting a hosted dispatch: the dispatch commit is not knowable from this branch",
    harnesses: ["claude-code", "codex", "cursor", "grok", "opencode", "pi"],
    cell_count: 12,
    cells: DECLARED_CELLS,
  });
});

test("run02Hand grades the real workflow declaration with zero failures when the declaration tier stands", async () => {
  const artifact = await runFlow(FLOW, {
    probe: unregisteredProbe,
    out: ".tmp/sprint-01-verification/run-02-hand.characterization.tier-b.json",
  });

  // Observed: the whole declaration object the flow copies into the artifact, exactly.
  // Every rule family of inspectWorkflowDeclaration feeds `failures`, so any extraction
  // that adds, drops, reorders or reworded a failure turns this pin red.
  assert.deepEqual(artifact.declaration, {
    triggers: ["workflow_dispatch"],
    event: "workflow_dispatch",
    install_mode: "checkout",
    install_mode_options: ["checkout", "published"],
    install_mode_source: "declared default of on.workflow_dispatch.inputs.install_mode",
    permissions: {},
    concurrency: { group: "harness-eval", "cancel-in-progress": false },
    jobs: ["drift", "smoke", "download", "grade"],
    harnesses: ["claude-code", "codex", "grok", "opencode", "pi", "cursor"],
    tracks: ["pinned", "newest"],
    cells: DECLARED_CELLS,
    failures: [],
  });
});

// --- the live-dispatch tier, replayed through the injected run readers ----------------------

const REPLAY_SHA = "3f7a1c9e2b8d4f6a0c5e7b9d1f3a5c7e9b2d4f6a";
const REPLAY_RUN = {
  databaseId: 424242,
  event: "workflow_dispatch",
  headSha: REPLAY_SHA,
  status: "completed",
  conclusion: "success",
  attempt: 1,
};

test("run02Hand carries a replayed workflow_dispatch run record as candidate identity and reports AC-1 met", async () => {
  const readRunCalls = [];
  const artifact = await runFlow(FLOW, {
    probe: unregisteredProbe,
    run: "424242",
    readRun: (args) => {
      readRunCalls.push(args);
      return { ok: true, run: REPLAY_RUN };
    },
    out: ".tmp/sprint-01-verification/run-02-hand.characterization.replay.json",
  });

  // Observed: the reader got exactly the repo and run id the flow was given.
  assert.deepEqual(readRunCalls, [{ repo: "hackerpug-ai/pixel-perfect", runId: "424242" }]);

  assert.equal(artifact.ok, true);
  assert.equal(artifact.proof_tier, "live-dispatch");
  assert.equal(artifact.ac1_satisfied, true);
  assert.deepEqual(artifact.failures, []);
  assert.deepEqual(artifact.awaiting_hosted_run, []);

  assert.deepEqual(artifact.live_dispatch, {
    attempted: true,
    available: false,
    probe: UNREGISTERED_PROBE_DETAIL,
    reason: DISPATCH_REASON,
    mode: "replay",
    run: REPLAY_RUN,
  });

  assert.deepEqual(artifact.identity, {
    event: "workflow_dispatch",
    install_mode: "checkout",
    install_mode_source: "declared default of on.workflow_dispatch.inputs.install_mode",
    candidate_sha: REPLAY_SHA,
    candidate_sha_source: "GitHub run record 424242 headSha",
    harnesses: ["claude-code", "codex", "cursor", "grok", "opencode", "pi"],
    cell_count: 12,
    cells: DECLARED_CELLS,
  });
});

test("run02Hand reports an unreadable replayed run as a failure and never claims AC-1", async () => {
  const artifact = await runFlow(FLOW, {
    probe: unregisteredProbe,
    run: "424242",
    readRun: () => ({ ok: false, reason: "gh run view exited 1: no run found" }),
    out: ".tmp/sprint-01-verification/run-02-hand.characterization.replay-unreadable.json",
  });

  assert.equal(artifact.ok, false);
  assert.equal(artifact.proof_tier, "live-dispatch");
  assert.equal(artifact.ac1_satisfied, false);
  assert.deepEqual(artifact.failures, ["run 424242 is unreadable: gh run view exited 1: no run found"]);

  // Observed: with no readable record, no run lands in live_dispatch and the identity keeps
  // its declaration-tier shape (null candidate_sha).
  assert.deepEqual(artifact.live_dispatch, {
    attempted: true,
    available: false,
    probe: UNREGISTERED_PROBE_DETAIL,
    reason: DISPATCH_REASON,
    mode: "replay",
  });
  assert.equal(artifact.identity.candidate_sha, null);
  assert.equal(artifact.identity.event, "workflow_dispatch");
});

test("run02Hand fails a replayed record whose event is not workflow_dispatch or whose headSha is not a commit sha", async () => {
  const artifact = await runFlow(FLOW, {
    probe: unregisteredProbe,
    run: "77",
    readRun: () => ({
      ok: true,
      run: { databaseId: 77, event: "schedule", headSha: "not-a-sha", status: "completed", conclusion: "failure", attempt: 2 },
    }),
    out: ".tmp/sprint-01-verification/run-02-hand.characterization.replay-bad-record.json",
  });

  // Observed: both run-record rules fire, in this order, and the record still supplies the
  // identity it carries — but AC-1 stays unclaimed because failures exist.
  assert.deepEqual(artifact.failures, [
    "run event is schedule, expected workflow_dispatch",
    "run headSha not-a-sha is not a commit sha",
  ]);
  assert.equal(artifact.ok, false);
  assert.equal(artifact.ac1_satisfied, false);
  assert.equal(artifact.identity.event, "schedule");
  assert.equal(artifact.identity.candidate_sha, "not-a-sha");
  assert.equal(artifact.identity.candidate_sha_source, "GitHub run record 77 headSha");
});

test("run02Hand reports a rejected dispatch, records the local head as the dispatch commit, and claims no AC-1", async () => {
  const dispatchCalls = [];
  const artifact = await runFlow(FLOW, {
    probe: unregisteredProbe,
    dispatch: true,
    dispatchWorkflow: (args) => {
      dispatchCalls.push(args);
      return { ok: false, status: 1, stdout: "", stderr: "gh: could not dispatch; workflow not registered" };
    },
    out: ".tmp/sprint-01-verification/run-02-hand.characterization.dispatch-rejected.json",
  });

  // Observed: the flow dispatches with no inputs and no ref.
  assert.deepEqual(dispatchCalls, [{ repo: "hackerpug-ai/pixel-perfect", inputs: {} }]);

  // Observed: local_head is this checkout's real HEAD.
  const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
  assert.equal(artifact.ok, false);
  assert.equal(artifact.proof_tier, "live-dispatch");
  assert.equal(artifact.ac1_satisfied, false);
  assert.deepEqual(artifact.failures, ["dispatch rejected: gh: could not dispatch; workflow not registered"]);
  assert.deepEqual(artifact.live_dispatch, {
    attempted: true,
    available: false,
    probe: UNREGISTERED_PROBE_DETAIL,
    reason: DISPATCH_REASON,
    mode: "dispatch",
    local_head: head,
    accepted: false,
    message: "gh: could not dispatch; workflow not registered",
    dispatch_commit: head,
  });
  assert.equal(artifact.identity.candidate_sha, null);
});

// --- the runner-cannot-dispatch deferral (owner-approved, red-hat F-001, 2026-11-03) --------
//
// A runner that cannot authenticate to gh can never start a hosted dispatch, so the gate
// hard-failing on the probe error grades the environment instead of the product. The owner
// approved one named carve-out: the deferral is recorded honestly on the live_dispatch leg
// (reason: runner-cannot-dispatch) and the DECLARATION tier is graded. Anything else —
// network, missing binary, an unclassifiable probe error — keeps today's fail path.

const DEFERRAL_PROBE = () => ({
  available: false,
  error: "gh is not authenticated",
  deferral: "runner-cannot-dispatch",
});

// REAL gh stderr, captured from gh 2.96.0 on 2026-11-03 (empty GH_CONFIG_DIR for the
// unauthenticated case, a bogus GH_TOKEN for bad credentials): unauthenticated is a
// TWO-LINE message on exit 4, a revoked token is a single "Bad credentials" line, and a
// token without the workflow scope gets a 403 body. No pin below asserts a string gh
// never emits.
const REAL_UNAUTHENTICATED_STDERR =
  "To get started with GitHub CLI, please run:  gh auth login\n" +
  "Alternatively, populate the GH_TOKEN environment variable with a GitHub API authentication token.";
const REAL_UNAUTH_LAST_LINE =
  "Alternatively, populate the GH_TOKEN environment variable with a GitHub API authentication token.";

test("readProbeOutcome surfaces the joined stderr, and dispatchDeferral classifies the real two-line unauthenticated message end-to-end", () => {
  // F-1: gh's unauthenticated output is TWO lines and the last-line rule alone hides the
  // auth hint, so the probe outcome must carry the full stderr for the classifier.
  const verdict = readProbeOutcome({ ok: false, stderr: REAL_UNAUTHENTICATED_STDERR });
  assert.equal(verdict.available, false);
  assert.ok(verdict.error, "a probe that failed for a reason other than not-registered still carries its error");
  assert.equal(verdict.detail, REAL_UNAUTH_LAST_LINE, "detail stays the last stderr line");
  assert.equal(verdict.stderr, REAL_UNAUTHENTICATED_STDERR, "the joined stderr must be surfaced");
  assert.equal(
    dispatchDeferral(verdict.stderr),
    "runner-cannot-dispatch",
    "the probe path classifies the FULL stderr, end-to-end through readProbeOutcome + dispatchDeferral",
  );
});

test("dispatchDeferral classifies gh's real auth/permission stderr shapes and everything else as null", () => {
  // Real shapes (gh 2.96.0): either line of the two-line login hint, a revoked token, and
  // a 403 body from a token without the workflow scope.
  assert.equal(dispatchDeferral(REAL_UNAUTHENTICATED_STDERR), "runner-cannot-dispatch");
  assert.equal(dispatchDeferral("To get started with GitHub CLI, please run:  gh auth login"), "runner-cannot-dispatch");
  assert.equal(dispatchDeferral(REAL_UNAUTH_LAST_LINE), "runner-cannot-dispatch");
  assert.equal(dispatchDeferral("gh: Bad credentials (HTTP 401)"), "runner-cannot-dispatch");
  assert.equal(dispatchDeferral("Resource not accessible by integration (HTTP 403)"), "runner-cannot-dispatch");
  // Everything else keeps the fail path: registered-elsewhere, network, missing binary,
  // silent, a 5xx — and a dispatch-start failure outside the permission class, because
  // jrn-planted-and-twin resolves its dispatch-start failures through this same classifier.
  assert.equal(dispatchDeferral(UNREGISTERED_PROBE_DETAIL), null);
  assert.equal(dispatchDeferral("dial tcp 140.82.112.17:443: connect: connection refused"), null);
  assert.equal(dispatchDeferral("spawnSync gh ENOENT"), null);
  assert.equal(dispatchDeferral("gh api exited 1"), null);
  assert.equal(dispatchDeferral("could not find any workflows named harness-eval"), null);
  assert.equal(dispatchDeferral("gh: Server Error (HTTP 500)"), null);
  assert.equal(dispatchDeferral(""), null);
  assert.equal(dispatchDeferral(null), null);
  assert.equal(dispatchDeferral(undefined), null);
});

test("run02Hand honors the runner-cannot-dispatch deferral: the declaration tier stands with the reason recorded", async () => {
  const artifact = await runFlow(FLOW, {
    probe: DEFERRAL_PROBE,
    out: ".tmp/sprint-01-verification/run-02-hand.characterization.deferral.json",
  });

  // Observed: the auth error never reaches failures, so the repo's clean declaration grades
  // the declaration tier and the artifact names why no live dispatch was possible.
  assert.equal(artifact.ok, true);
  assert.equal(artifact.proof_tier, "workflow-declaration");
  assert.equal(artifact.ac1_satisfied, false);
  assert.deepEqual(artifact.failures, []);

  assert.deepEqual(artifact.live_dispatch, {
    attempted: false,
    available: false,
    probe: undefined,
    reason: "runner-cannot-dispatch",
    mode: "none",
  });
  assert.ok(artifact.awaiting_hosted_run.length >= 3, "the artifact must still name the hosted-run gap");
  assert.equal(artifact.identity.candidate_sha, null);
});

test("run02Hand still fails on the same probe error when it carries no deferral flag", async () => {
  // The narrow carve-out: identical error text without the named deferral keeps today's
  // fail path exactly — a broken environment is never an honest proof.
  const artifact = await runFlow(FLOW, {
    probe: () => ({ available: false, error: "gh is not authenticated" }),
    out: ".tmp/sprint-01-verification/run-02-hand.characterization.deferral-unguarded.json",
  });

  assert.equal(artifact.ok, false);
  assert.equal(artifact.proof_tier, "workflow-declaration");
  assert.equal(artifact.ac1_satisfied, false);
  assert.deepEqual(artifact.failures, ["gh is not authenticated"]);

  assert.deepEqual(artifact.live_dispatch, {
    attempted: false,
    available: false,
    probe: undefined,
    reason: DISPATCH_REASON,
    mode: "none",
  });
});

test("run02Hand reports an accepted auto dispatch that produced no readable run as a failure", async () => {
  const artifact = await runFlow(FLOW, {
    // Observed: without --dispatch or --run, only an available probe puts the flow in the
    // live tier's auto leg, so the probe here reports the workflow registered.
    probe: () => ({ available: true, detail: "harness-eval.yml is registered on the default branch of owner/repo" }),
    dispatchWorkflow: () => ({ ok: true, status: 0, stdout: '✓ Created workflow_dispatch event for "harness-eval" at main\n', stderr: "" }),
    latestRun: () => ({ ok: false, reason: "no run of harness-eval exists in owner/repo" }),
    out: ".tmp/sprint-01-verification/run-02-hand.characterization.dispatch-no-run.json",
  });

  // Observed: the auto leg accepts the dispatch, and when the run list comes back empty the
  // flow fails instead of claiming an identity.
  const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
  assert.equal(artifact.ok, false);
  assert.equal(artifact.proof_tier, "live-dispatch");
  assert.equal(artifact.ac1_satisfied, false);
  assert.deepEqual(artifact.failures, ["dispatch produced no readable run: no run of harness-eval exists in owner/repo"]);
  assert.deepEqual(artifact.live_dispatch, {
    attempted: true,
    available: true,
    probe: "harness-eval.yml is registered on the default branch of owner/repo",
    reason: DISPATCH_REASON,
    mode: "auto",
    local_head: head,
    accepted: true,
    message: '✓ Created workflow_dispatch event for "harness-eval" at main',
  });
  assert.equal(artifact.identity.candidate_sha, null);
});
