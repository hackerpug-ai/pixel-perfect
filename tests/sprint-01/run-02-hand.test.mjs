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

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  ARTIFACT_DIR,
  BANNED_TRIGGERS,
  HARNESSES,
  chooseProofTier,
  ROOT,
  WORKFLOW_PATH,
  inspectWorkflowDeclaration,
  parseYaml,
  readWorkflow,
  runFlow,
} from "./flow-runner.mjs";

const FLOW = "FLOW-RUN-02-HAND";
const ARTIFACT = path.join(ARTIFACT_DIR, "run-02-hand.json");

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
});
