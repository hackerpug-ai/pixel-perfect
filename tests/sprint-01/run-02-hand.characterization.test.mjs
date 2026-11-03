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
import test from "node:test";

import { ARTIFACT_DIR, runFlow } from "./flow-runner.mjs";

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
