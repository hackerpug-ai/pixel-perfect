// FLOW-RUN-02-HAND — UC-RUN-02: the maintainer starts the grade by hand.
//
// The flow is owned by T1 and its `verify` command is:
//   node --test tests/sprint-01/run-02-hand.test.mjs --test-name-pattern FLOW-RUN-02-HAND
//
// Two proof tiers exist and the artifact names which one ran:
//   workflow-declaration — what .github/workflows/harness-eval.yml promises when dispatched
//                          with no inputs. Provable from any branch.
//   live-dispatch        — a real `gh workflow run` plus its GitHub run record. Only allowed
//                          from main (.spec/e2e-policy/sprint-01/dispatch-allowed.json), so it
//                          is replayed at the sprint gate and by the post-integration obligation.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  ARTIFACT_DIR,
  BANNED_TRIGGERS,
  HARNESSES,
  ROOT,
  WORKFLOW_PATH,
  inspectWorkflowDeclaration,
  parseYaml,
  readWorkflow,
  runFlow,
} from "./flow-runner.mjs";

const FLOW = "FLOW-RUN-02-HAND";
const ARTIFACT = path.join(ARTIFACT_DIR, "run-02-hand.json");

test("FLOW-RUN-02-HAND starts the hand grade with the checkout default and a twelve-cell, trigger-safe workflow", async () => {
  const artifact = await runFlow(FLOW, {});
  const label = JSON.stringify({ tier: artifact.proof_tier, failures: artifact.failures }, null, 2);

  // Every declaration-level failure collected by the flow (trigger, permissions, matrix,
  // cache, key placement, skeleton jobs, attempt-qualified uploads) has to be empty.
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

  // --- AC-1: identity is honest about what a branch cannot prove ---------------------
  // candidate_sha is the dispatch commit. Asserting it here would be a fabricated identity.
  assert.equal(artifact.identity.candidate_sha, null);
  assert.equal(artifact.proof_tier, "workflow-declaration");
  assert.ok(artifact.awaiting_hosted_run.length >= 3, "the artifact must name what awaits a hosted run");
  assert.ok(
    artifact.awaiting_hosted_run.some((item) => /candidate_sha/.test(item)),
    "the hosted-run gap must name candidate_sha",
  );

  // --- AC-1: workflow-level permissions are empty, jobs opt in narrowly --------------
  assert.deepEqual(artifact.declaration.permissions, {});
  assert.deepEqual(artifact.declaration.jobs.sort(), ["download", "drift", "grade", "smoke"]);

  // --- TC-2: a banned trigger is rejected, proven on the real file ------------------
  // The negative control mutates the real workflow text, so it cannot drift from the file.
  const { text } = readWorkflow();
  const banned = (trigger) => {
    const mutated = text.replace(/\non:\n/, `\non:\n  ${trigger}:\n`);
    assert.notEqual(mutated, text, `negative control could not inject ${trigger} — the on: block moved`);
    return inspectWorkflowDeclaration(parseYaml(mutated)).failures;
  };
  for (const trigger of BANNED_TRIGGERS) {
    const failures = banned(trigger);
    assert.ok(
      failures.some((failure) => failure === `banned trigger declared: ${trigger}`),
      `${trigger} was not rejected: ${JSON.stringify(failures)}`,
    );
  }

  // --- TC-1 negative control: a published default must not pass as checkout ---------
  const republished = text.replace(/default: checkout/, "default: published");
  assert.notEqual(republished, text, "negative control could not move the install_mode default");
  assert.ok(
    inspectWorkflowDeclaration(parseYaml(republished)).failures.some((failure) => /install_mode default is published/.test(failure)),
    "a published default was accepted as checkout identity",
  );

  // --- AC-1 negative control: dropping cursor must fail, not silently shrink --------
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

  // --- Gate 2 evidence: the artifact on disk is the one that was read ---------------
  const written = JSON.parse(readFileSync(ARTIFACT, "utf8"));
  assert.equal(written.flow, FLOW);
  assert.equal(written.identity.event, "workflow_dispatch");
  assert.equal(written.identity.install_mode, "checkout");
  assert.equal(written.workflow_path, WORKFLOW_PATH);
  assert.equal(written.ok, true);
  assert.ok(ROOT.length > 0);
});
