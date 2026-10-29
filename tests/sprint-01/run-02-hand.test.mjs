// FLOW-RUN-02-HAND: one pinned authority, reconciled, and a hand dispatch's identity.
//
// The real things this test exercises: the on-disk test/harness/pins.json bytes and its digest, the
// repository's real package.json read read-only (hashed and mtime- compared before and after), and
// this worktree's real commit `git rev-parse HEAD` as the dispatch commit. Mode comes from artifact
// fields only. Grades are not claimed: no hosted run exists in this worktree.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  HARNESSES,
  assertReconciled,
  cellsFromPins,
  identityEnvelope,
  loadPins,
  reconcilePackageJson,
} from "../../test/harness/pins.mjs";
import { validateDispatchIdentity, validateResult } from "../../test/harness/validate.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const REPORT_DIR = join(ROOT, ".tmp", "sprint-01-verification");
const LIVE_ARTIFACT =
  process.env.HARNESS_EVAL_RESULT ?? join(ROOT, ".tmp", "sprint-01-artifacts", "he1", "harness-eval-result.json");

function fileFingerprint(path) {
  return {
    sha256: createHash("sha256").update(readFileSync(path)).digest("hex"),
    mtimeMs: statSync(path).mtimeMs,
  };
}

function writeReport(report) {
  mkdirSync(REPORT_DIR, { recursive: true });
  writeFileSync(join(REPORT_DIR, "run-02-hand.json"), `${JSON.stringify(report, null, 2)}\n`);
}

test("FLOW-RUN-02-HAND", async (t) => {
  const pins = loadPins();
  const packageJsonPath = join(ROOT, "package.json");
  const before = fileFingerprint(packageJsonPath);

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
  validateResult(checkout, { requiredPinsSha256: pins.pins_sha256 });
  assert.equal(checkout.event, "workflow_dispatch", "a hand dispatch records its real event");
  assert.equal(checkout.install_mode, "checkout", "a no-input dispatch defaults to checkout");
  assert.equal(checkout.candidate_sha, head, "candidate_sha is the dispatch commit");
  const present = new Set(checkout.cells.map((cell) => cell.harness));
  assert.deepEqual([...present].sort(), [...HARNESSES].sort(), "all six harnesses are present");

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
  const logInferred = { ...checkout, logs: "install_mode: checkout" };
  delete logInferred.install_mode;
  assert.throws(
    () => validateResult(logInferred),
    (error) => error.reason === "schema-invalid" && /install_mode/.test(error.message),
    "a mode asserted from logs instead of artifact fields is refused",
  );
  const gradedPublished = structuredClone(published);
  gradedPublished.cells[0].verdict = "pass";
  assert.throws(
    () => validateResult(gradedPublished),
    (error) => error.reason === "published-mode-graded",
    "a pass verdict on a published-mode cell is refused in sprint-01",
  );

  // ---- a downloaded artifact, when one exists, must agree with these same identity rules ----
  let live = "absent";
  if (existsSync(LIVE_ARTIFACT)) {
    const artifact = JSON.parse(readFileSync(LIVE_ARTIFACT, "utf8"));
    validateResult(artifact, { requiredPinsSha256: pins.pins_sha256 });
    assert.equal(artifact.event, "workflow_dispatch");
    assert.equal(artifact.install_mode, "checkout");
    assert.equal(artifact.candidate_sha, head);
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
      "published + checkout sha -> mode-mixup",
      "checkout + null sha -> candidate-sha-missing",
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
