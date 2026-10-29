// FLOW-RUN-02-HAND — UC-RUN-02: the maintainer starts the grade by hand.
//
// The flow is owned by T1 and its `verify` command is:
//   node --test tests/sprint-01/run-02-hand.test.mjs --test-name-pattern FLOW-RUN-02-HAND
//
// Two proof tiers exist and the artifact names which one ran:
//   live-dispatch        — a real `gh workflow run` (or a replay of one) plus its GitHub run
//                          record. The only tier that can report AC-1 as met.
//   workflow-declaration — what .github/workflows/harness-eval.yml promises when dispatched
//                          with no inputs. Honest ONLY while no dispatch is possible, never
//                          claims AC-1, and is refused the moment harness-eval.yml is
//                          registered on the default branch (that is how the T2/T8 deferral
//                          expires instead of going green forever).
//
// This module carries BOTH halves of the flow's proof, because two tasks own parts of it:
//   T1 (below, first) — the flow replay: the proof tiers, the trigger/permission/matrix/secret
//        declaration scan, the expiry rule, and the exit tripwire.
//   T2 (below, second) — the invariants: one pinned authority reconciled against package.json,
//        and a hand dispatch's identity (the digest recomputed from the manifest bytes, no
//        unevidenced pass, a dispatch sha threaded in from outside, never a self-comparison).
// Neither half may be dropped or weakened: the frozen check has to be red for either reason.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path, { join } from "node:path";
import test from "node:test";
import {
  ARTIFACT_DIR,
  BANNED_TRIGGERS,
  HARNESSES,
  chooseProofTier,
  readProbeOutcome,
  ROOT,
  WORKFLOW_PATH,
  inspectWorkflowDeclaration,
  parseYaml,
  readWorkflow,
  runFlow,
} from "./flow-runner.mjs";
// T2's half keeps the roster it actually grades against, from the pins/validate layer, so
// neither half is ever asserted against a roster borrowed from the other module.
import {
  HARNESSES as PINS_HARNESSES,
  assertReconciled,
  cellsFromPins,
  identityEnvelope,
  loadPins,
  reconcilePackageJson,
} from "../../test/harness/pins.mjs";
import { validateDispatchIdentity, validateResult } from "../../test/harness/validate.mjs";

const FLOW = "FLOW-RUN-02-HAND";

// The flow's graded artifact. SPRINT.md, TASK-T1.contract.json and human-flows.json pin this
// exact path, so it belongs to the flow replay and nothing else may write it.
const ARTIFACT = path.join(ARTIFACT_DIR, "run-02-hand.json");

// T2's invariant report is a different document and gets its own name: sharing the flow's
// path would let either half's next run erase the other half's evidence.
const REPORT_DIR = path.join(ROOT, ".tmp", "sprint-01-verification");
const PINS_REPORT = path.join(REPORT_DIR, "run-02-hand-pins.json");
const LIVE_ARTIFACT =
  process.env.HARNESS_EVAL_RESULT ?? path.join(ROOT, ".tmp", "sprint-01-artifacts", "he1", "harness-eval-result.json");

function fileFingerprint(target) {
  return {
    sha256: createHash("sha256").update(readFileSync(target)).digest("hex"),
    mtimeMs: statSync(target).mtimeMs,
  };
}

function writeReport(report) {
  mkdirSync(REPORT_DIR, { recursive: true });
  writeFileSync(PINS_REPORT, `${JSON.stringify(report, null, 2)}\n`);
}

// --- the gate itself, outside any test() ------------------------------------
// `node --test --test-name-pattern FLOW-RUN-02-HAND` reports exit 0 when the named test is
// skipped or renamed away (Node then counts the file as the passing test). This module-level
// block runs whatever the name filter does, so neither `test.skip` nor a rename can turn the
// gate green without the flow actually passing. It throws with the flow's own failure list.
const flowRun = await runFlow(FLOW, {});
assert.equal(
  flowRun.ok,
  true,
  `FLOW-RUN-02-HAND failed (${flowRun.proof_tier}):\n${JSON.stringify(flowRun.failures, null, 2)}`,
);

// A test that never executed asserted nothing, so the file refuses to pass: Node reports exit 0
// for a skipped test ("skipped 1") and for a name filter that matches no test ("pass 1", the
// FILE counted as the test). Whoever edits this lane next — T9, T12 — cannot make the frozen
// check green by disabling this flow, only by keeping it true.
let namedTestRan = false;
process.on("exit", () => {
  if (!namedTestRan) {
    console.error(`${FLOW}: the named test did not execute (skipped, or renamed out of --test-name-pattern) — a gate that asserts nothing is not a pass`);
    process.exitCode = 1;
  }
});

test("FLOW-RUN-02-HAND starts the hand grade with the checkout default and a twelve-cell, trigger-safe workflow", async () => {
  namedTestRan = true;
  const artifact = flowRun;
  const label = JSON.stringify({ tier: artifact.proof_tier, failures: artifact.failures }, null, 2);

  // Every declaration-level failure collected by the flow (trigger, permissions, matrix,
  // cache, key placement, step bodies, skeleton wiring, attempt-qualified uploads) is empty.
  assert.equal(artifact.ok, true, `flow failed:\n${label}`);
  assert.deepEqual(artifact.failures, [], label);

  // --- AC-1 / TC-1: the no-input dispatch records the checkout default ---------------
  assert.equal(artifact.identity.install_mode, "checkout", "a no-input dispatch must record install_mode checkout");
  assert.match(
    artifact.identity.install_mode_source,
    /declared default of on\.workflow_dispatch\.inputs\.install_mode/,
    "install_mode must come from the declared input default, never from a log",
  );
  assert.deepEqual(artifact.declaration.install_mode_options, ["checkout", "published"]);
  assert.ok(artifact.identity.harnesses.includes("cursor"), "cursor may never be omitted");

  // --- AC-1 / TC-3: the recorded event and mode live in the artifact -----------------
  assert.equal(artifact.identity.event, "workflow_dispatch");
  assert.equal(artifact.declaration.triggers.length, 1, `triggers: ${artifact.declaration.triggers.join(", ")}`);

  // --- AC-1: twelve unique cells, six harnesses, both tracks -------------------------
  assert.equal(artifact.identity.cell_count, 12);
  assert.deepEqual(artifact.identity.harnesses, [...HARNESSES].sort());
  assert.deepEqual(artifact.declaration.tracks.slice().sort(), ["newest", "pinned"]);
  const pairs = new Set(artifact.declaration.cells.map((cell) => `${cell.harness}/${cell.track}`));
  assert.equal(pairs.size, 12, "every (harness, track) pair must be its own cell");

  // --- AC-1: the tier that ran decides which identity claim is honest ---------------
  // Both branches are asserted against the SAME artifact, so neither tier can borrow the
  // other's evidence: a declaration run must never claim AC-1, and a live run must carry the
  // dispatch commit.
  assert.ok(["live-dispatch", "workflow-declaration"].includes(artifact.proof_tier), `tier: ${artifact.proof_tier}`);
  assert.ok(String(artifact.live_dispatch.probe).length > 0, "the probe that decided the tier must be recorded");
  if (artifact.proof_tier === "live-dispatch") {
    assert.equal(artifact.ac1_satisfied, true, "a live dispatch is the only tier that satisfies AC-1");
    assert.match(String(artifact.identity.candidate_sha), /^[0-9a-f]{40}$/, "candidate_sha must be the run's headSha");
    assert.ok(artifact.identity.candidate_sha_source.includes("headSha"), "candidate_sha must be read from the run record");
    assert.equal(artifact.live_dispatch.attempted, true, "a live tier means a dispatch or a replay really happened");
    assert.ok(["dispatch", "auto", "replay"].includes(artifact.live_dispatch.mode));
    if (artifact.live_dispatch.mode === "dispatch") {
      assert.equal(artifact.identity.candidate_sha, artifact.live_dispatch.dispatch_commit, "candidate_sha must equal the dispatch commit");
    }
    assert.deepEqual(artifact.awaiting_hosted_run, [], "a live run has no outstanding hosted-run gap");
  } else {
    assert.equal(artifact.identity.candidate_sha, null, "this branch cannot know the dispatch commit");
    assert.equal(artifact.ac1_satisfied, false, "the declaration tier must never report AC-1 as satisfied");
    assert.equal(artifact.live_dispatch.available, false, "the declaration tier is honest only while a dispatch is impossible");
    assert.equal(artifact.live_dispatch.attempted, false);
    assert.ok(artifact.awaiting_hosted_run.length >= 3, "the artifact must name what awaits a hosted run");
    assert.ok(
      artifact.awaiting_hosted_run.some((item) => /candidate_sha/.test(item)),
      "the hosted-run gap must name candidate_sha",
    );
  }

  // --- AC-1: workflow-level permissions are empty, jobs opt in narrowly --------------
  assert.deepEqual(artifact.declaration.permissions, {});
  assert.deepEqual(artifact.declaration.jobs.sort(), ["download", "drift", "grade", "smoke"]);

  // --- Gate 2 evidence: the artifact on disk is the one that was read ---------------
  const written = JSON.parse(readFileSync(ARTIFACT, "utf8"));
  assert.equal(written.flow, FLOW);
  assert.equal(written.identity.event, "workflow_dispatch");
  assert.equal(written.identity.install_mode, "checkout");
  assert.equal(written.workflow_path, WORKFLOW_PATH);
  assert.equal(written.ok, true);
  assert.ok(ROOT.length > 0);

  // --- the deferral expires: the declaration stops being a proof the moment it can be -----
  // The tier is decided by one pure function, so the expiry rule is asserted directly instead
  // of by faking a dispatch: a registered workflow forces the live tier, whatever else is true,
  // and the tier the artifact reports must be the one that rule picked.
  assert.equal(chooseProofTier({ available: true }), "live-dispatch", "a dispatchable workflow ends the declaration tier");
  assert.equal(chooseProofTier({ available: false }), "workflow-declaration");
  assert.equal(chooseProofTier({ run: "123456" }), "live-dispatch");
  assert.equal(chooseProofTier({ dispatch: true }), "live-dispatch");
  assert.equal(
    artifact.proof_tier,
    chooseProofTier({ available: artifact.live_dispatch.available }),
    "the reported tier must be the one the rule picked",
  );

  // --- TC-2 / TC-1 / AC-1: weakening a rule is rejected, proven on the real file ------
  // Every negative control mutates the real workflow text, so it cannot drift from the file.
  const { text } = readWorkflow();
  const mutate = (from, to, why) => {
    const mutated = text.replace(from, to);
    assert.notEqual(mutated, text, `negative control could not apply ${why} — the file moved`);
    return inspectWorkflowDeclaration(parseYaml(mutated)).failures;
  };

  for (const trigger of BANNED_TRIGGERS) {
    const failures = mutate(/\non:\n/, `\non:\n  ${trigger}:\n`, `banned trigger ${trigger}`);
    assert.ok(
      failures.some((failure) => failure === `banned trigger declared: ${trigger}`),
      `${trigger} was not rejected: ${JSON.stringify(failures)}`,
    );
  }

  // TC-1 — a published default must not pass as checkout identity.
  assert.ok(
    mutate(/default: checkout/, "default: published", "install_mode default").some((failure) => /install_mode default is published/.test(failure)),
    "a published default was accepted as checkout identity",
  );

  // AC-1 — dropping cursor must fail, not silently shrink the grid.
  const noCursor = text.replace(/harness: \[([^\]]*)\]/g, (match, inner) =>
    inner.includes("cursor")
      ? `harness: [${inner.split(",").map((name) => name.trim()).filter((name) => name !== "cursor").join(", ")}]`
      : match,
  );
  assert.notEqual(noCursor, text, "negative control could not remove cursor from the matrix");
  assert.ok(
    inspectWorkflowDeclaration(parseYaml(noCursor)).failures.some((failure) => /matrix is missing cursor/.test(failure)),
    "a cursor-less matrix was accepted",
  );

  // --- TC-4: the one place a key may live, and the one place it never may ------------
  // T9 binds each harness key inside that cell's own step `env:` block; the same binding
  // anywhere else is a leak. Both directions are asserted so the allowance cannot widen.
  const keyEnv = '        env:\n          SMOKE_KEY: ${{ secrets.SMOKE_CELL_KEY }}\n';
  const inSmoke = mutate("      - name: Record the cell\n        run: |", `      - name: Record the cell\n${keyEnv}        run: |`, "key in the smoke cell env");
  assert.deepEqual(inSmoke.filter((failure) => /secret/.test(failure)), [], `the smoke cell's own env may hold a key: ${JSON.stringify(inSmoke)}`);
  const outsideSmoke = mutate("      - name: Fetch every cell from this attempt\n", `      - name: Fetch every cell from this attempt\n${keyEnv}`, "key on the download job");
  assert.ok(
    outsideSmoke.some((failure) => /binds a secret in a non-smoke job/.test(failure)),
    `a key bound outside the smoke job was accepted: ${JSON.stringify(outsideSmoke)}`,
  );
  // A key on any other smoke step — the install slot above all — is a leak too.
  const onInstall = mutate("      - name: Install ${{ matrix.harness }} ${{ matrix.track }}\n", "      - name: Install ${{ matrix.harness }} ${{ matrix.track }}\n        env:\n          SMOKE_KEY: ${{ secrets.SMOKE_CELL_KEY }}\n", "key on the install slot");
  assert.ok(
    onInstall.some((failure) => /binds a secret outside the cell's own recording step/.test(failure)),
    `a key on the install slot was accepted: ${JSON.stringify(onInstall)}`,
  );
  // An `env:` map above step level hands the key to every step that inherits it — the install
  // slot included — without any step declaring it, so the step scan alone cannot see it.
  const workflowEnv = mutate("\npermissions: {}\n", "\npermissions: {}\n\nenv:\n  SMOKE_KEY: ${{ secrets.SMOKE_CELL_KEY }}\n", "workflow-level env");
  assert.ok(
    workflowEnv.some((failure) => /the workflow env binds a secret/.test(failure)),
    `a workflow-level env holding a key was accepted: ${JSON.stringify(workflowEnv)}`,
  );
  const smokeJobEnv = mutate("    environment: harness-smoke\n", "    environment: harness-smoke\n    env:\n      SMOKE_KEY: ${{ secrets.SMOKE_CELL_KEY }}\n", "job-level env");
  assert.ok(
    smokeJobEnv.some((failure) => /the jobs\.smoke env binds a secret/.test(failure)),
    `a job-level env holding a key was accepted: ${JSON.stringify(smokeJobEnv)}`,
  );

  // --- F-T1-10: only a 404 means "not registered" -----------------------------------
  // Anything else (no gh, no token, no network) proves nothing about the repository, so it is
  // refused rather than graded as an honest declaration.
  assert.equal(readProbeOutcome({ ok: false, stderr: "gh: Not Found (HTTP 404)" }).error, undefined);
  assert.equal(readProbeOutcome({ ok: true, stderr: "" }).available, true);
  assert.match(
    String(readProbeOutcome({ ok: false, stderr: "gh: Bad credentials (HTTP 401)" }).error),
    /HTTP 401/,
    "a broken token must not read as 'not registered'",
  );
  assert.match(
    String(readProbeOutcome({ ok: false, stderr: "spawnSync gh ENOENT" }).error),
    /ENOENT/,
    "a missing gh must not read as 'not registered'",
  );
});

// --- T2's half: one pinned authority, reconciled, and a hand dispatch's identity ------------
// The real things this test exercises: the on-disk test/harness/pins.json bytes and its digest,
// the repository's real package.json read read-only (hashed and mtime-compared before and
// after), and this worktree's real commit `git rev-parse HEAD` as the dispatch commit. Mode
// comes from artifact fields only. Grades are not claimed: no hosted run exists in this worktree.
test("FLOW-RUN-02-HAND", async (t) => {
  const pins = loadPins();
  const packageJsonPath = join(ROOT, "package.json");
  const before = fileFingerprint(packageJsonPath);

  // ---- the digest is recomputed from the manifest bytes here, not taken from the loader ----
  assert.equal(pins.pins_sha256, createHash("sha256").update(pins.bytes).digest("hex"));

  // ---- pins.json wins; every difference from package.json is a named exception with a reason ----
  const reconciliation = assertReconciled(reconcilePackageJson({ manifest: pins.manifest, packageJsonPath }));
  const piRow = reconciliation.comparisons.find((row) => row.harness === "pi");
  assert.ok(piRow, "pi is pinned independently in package.json, so it is reconciled");
  assert.equal(piRow.package_name, "@earendil-works/pi-coding-agent");
  assert.equal(piRow.pins_value, "1.0.4", "pins.json wins for grading");
  assert.equal(piRow.package_json_value, "0.84.4");
  assert.equal(piRow.agrees, false);
  assert.ok(piRow.exception, "the difference is a named exception, not a comment");
  assert.ok(piRow.exception.reason.length > 20, "the exception carries a real reason");
  for (const row of reconciliation.comparisons) {
    assert.ok(row.agrees || row.exception, `${row.harness} either agrees or names its exception`);
  }
  assert.equal(reconciliation.unnamedDisagreements.length, 0);
  assert.equal(reconciliation.unusedExceptions.length, 0);

  // ---- negative control: an unrecorded disagreement is refused, not silently tolerated ----
  const unnamed = structuredClone(pins.manifest);
  unnamed.exceptions = [];
  assert.throws(
    () => assertReconciled(reconcilePackageJson({ manifest: unnamed, packageJsonPath })),
    (error) => error.reason === "pins-package-disagreement" && /pi/.test(error.message),
    "a pins.json value differing from package.json with no recorded exception is refused",
  );

  // ---- negative control: an exception for a harness that actually agrees is refused ----
  const stale = structuredClone(pins.manifest);
  stale.exceptions = [
    {
      harness: "pi",
      package_name: "@earendil-works/pi-coding-agent",
      pins_value: "1.0.4",
      package_json_value: "0.84.4",
      reason: "kept",
    },
    {
      harness: "claude-code",
      package_name: "@anthropic-ai/claude-code",
      pins_value: "2.1.291",
      package_json_value: "2.1.291",
      reason: "not actually a disagreement",
    },
  ];
  stale.harnesses.pi.pinned_cli_version = "0.84.4"; // now agrees, so its exception is stale
  assert.throws(
    () => assertReconciled(reconcilePackageJson({ manifest: stale, packageJsonPath })),
    (error) => error.reason === "exception-without-disagreement",
    "an exception with no disagreement behind it is refused",
  );

  // ---- package.json is read-only: identical bytes and mtime after every reconciliation ----
  const after = fileFingerprint(packageJsonPath);
  assert.deepEqual(after, before, "package.json was not written by reconciliation");

  // ---- hand dispatch identity, read from artifact fields only ----
  const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
  const cells = cellsFromPins(pins.manifest, { credentialEnv: process.env });
  const checkout = identityEnvelope({
    cells,
    pinsSha256: pins.pins_sha256,
    candidateSha: head,
    event: "workflow_dispatch",
    installMode: "checkout",
    now: new Date().toISOString(),
  });
  validateResult(checkout, { dispatchSha: head, requiredPinsSha256: pins.pins_sha256 });
  assert.equal(checkout.event, "workflow_dispatch", "a hand dispatch records its real event");
  assert.equal(checkout.install_mode, "checkout", "a no-input dispatch defaults to checkout");
  assert.equal(checkout.candidate_sha, head, "candidate_sha is the dispatch commit");
  const present = new Set(checkout.cells.map((cell) => cell.harness));
  assert.deepEqual([...present].sort(), [...PINS_HARNESSES].sort(), "all six harnesses are present");

  // ---- published mode never borrows checkout identity and grades nothing in sprint-01 ----
  const published = identityEnvelope({
    cells,
    pinsSha256: pins.pins_sha256,
    candidateSha: head,
    event: "workflow_dispatch",
    installMode: "published",
    now: new Date().toISOString(),
  });
  validateResult(published);
  assert.equal(published.candidate_sha, null, "published carries no checkout commit");
  assert.ok(published.cells.every((cell) => cell.verdict === "could-not-run"));

  // ---- negative controls: the mode guards fire with their named reasons ----
  assert.throws(
    () => validateResult({ ...published, candidate_sha: head }),
    (error) => error.reason === "mode-mixup",
    "a published run carrying checkout identity is refused",
  );
  assert.throws(
    () => validateResult({ ...checkout, candidate_sha: null }),
    (error) => error.reason === "candidate-sha-missing",
    "a checkout run without its commit is refused",
  );
  assert.throws(
    () => validateDispatchIdentity(checkout, { dispatchSha: "0".repeat(40) }),
    (error) => error.reason === "candidate-sha-mismatch",
    "a checkout candidate that is not the dispatch commit is refused",
  );

  // ---- F-T2-2: check-AC-2 defends the manifest bytes too, with only default arguments ----
  const derivativeDigest = createHash("sha256").update(JSON.stringify(pins.manifest)).digest("hex");
  assert.notEqual(derivativeDigest, pins.pins_sha256);
  assert.throws(
    () => validateResult({ ...checkout, pins_sha256: derivativeDigest }),
    (error) => error.reason === "pins-digest-mismatch" && error.message.includes(pins.pins_sha256),
    "a registry-style derivative digest is refused without the caller opting in",
  );

  // ---- F-T2-3: the dispatch comparison is against a trusted sha, never the record's own value ----
  const foreignCommit = { ...checkout, candidate_sha: "a".repeat(40) };
  assert.notEqual(foreignCommit.candidate_sha, head);
  assert.throws(
    () => validateResult(foreignCommit),
    (error) => error.reason === "dispatch-sha-unknown",
    "a checkout record with no trusted dispatch sha is refused",
  );
  assert.throws(
    () => validateResult(foreignCommit, { dispatchSha: head }),
    (error) => error.reason === "candidate-sha-mismatch",
    "a grade produced at another commit is refused as this commit's",
  );
  const logInferred = { ...checkout, logs: "install_mode: checkout" };
  delete logInferred.install_mode;
  assert.throws(
    () => validateResult(logInferred),
    (error) => error.reason === "schema-invalid" && /install_mode/.test(error.message),
    "a mode asserted from logs instead of artifact fields is refused",
  );
  const gradedPublished = structuredClone(published);
  const gradedCell = gradedPublished.cells[0];
  // A fully evidenced pass, so the refusal comes from the mode guard and not from pass-without-evidence.
  gradedCell.verdict = "pass";
  gradedCell.evidence_paths = ["reports/verify.json"];
  gradedCell.invocation_id = "inv-1";
  gradedCell.process_exit_code = 0;
  gradedCell.checks[0] = { ...gradedCell.checks[0], verdict: "pass" };
  assert.throws(
    () => validateResult(gradedPublished),
    (error) => error.reason === "published-mode-graded",
    "a pass verdict on a published-mode cell is refused in sprint-01",
  );

  // ---- a downloaded artifact, when one exists, must agree with these same identity rules ----
  let live = "absent";
  if (existsSync(LIVE_ARTIFACT)) {
    const artifact = JSON.parse(readFileSync(LIVE_ARTIFACT, "utf8"));
    const dispatchSha = process.env.HARNESS_EVAL_DISPATCH_SHA ?? artifact.head_sha ?? null;
    validateResult(artifact, { dispatchSha, requiredPinsSha256: pins.pins_sha256 });
    assert.equal(artifact.event, "workflow_dispatch");
    assert.equal(artifact.install_mode, "checkout");
    assert.equal(artifact.candidate_sha, dispatchSha);
    live = "validated";
  }

  writeReport({
    flow: "FLOW-RUN-02-HAND",
    task: "T2",
    pins_sha256: pins.pins_sha256,
    package_json: { path: packageJsonPath, ...before, untouched: true },
    reconciliation: {
      comparisons: reconciliation.comparisons,
      unnamed_disagreements: reconciliation.unnamedDisagreements,
      unused_exceptions: reconciliation.unusedExceptions,
    },
    dispatch_identity: {
      dispatch_sha: head,
      event: checkout.event,
      install_mode: checkout.install_mode,
      candidate_sha: checkout.candidate_sha,
      harnesses: [...present].sort(),
      published_candidate_sha: published.candidate_sha,
    },
    negative_controls: [
      "unnamed disagreement -> pins-package-disagreement",
      "stale exception -> exception-without-disagreement",
      "derivative-document pins_sha256 (default args) -> pins-digest-mismatch",
      "published + checkout sha -> mode-mixup",
      "checkout + null sha -> candidate-sha-missing",
      "checkout without trusted dispatch sha -> dispatch-sha-unknown",
      "candidate != dispatch sha -> candidate-sha-mismatch",
      "mode from logs -> schema-invalid(install_mode)",
      "published pass verdict -> published-mode-graded",
    ],
    live_artifact: { path: LIVE_ARTIFACT, status: live },
  });

  t.diagnostic(`pins_sha256=${pins.pins_sha256}`);
  t.diagnostic(`pi pins=${piRow.pins_value} package.json=${piRow.package_json_value} exception=named`);
  t.diagnostic(`dispatch_sha=${head} install_mode=${checkout.install_mode} harnesses=${[...present].sort().join(",")}`);
  t.diagnostic(`live_artifact=${live}`);
});
