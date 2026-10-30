# TASK-T8 — Implement the grade recorder job: schema validation, twelve-unique-cell enforcement, GitHub job-timestamp copy, attempt-qualified artifacts (overwrite disabled, 90-day retention), Actions summary, exit semantics

> Status: ✅ Completed

Commit: 356dafa858b6b51794c0366a1a7186eb576c2795
> Assignee: github-platform-implementer
> Priority: P1
> Points: 5
> Type: FEATURE
> Planner: github-agentic-workflow-planner
> Proposed By: github-agentic-workflow-planner + evals-planner
> TDD_MODE: red_first
> RED_GREEN_REQUIRED: true

planner=github-agentic-workflow-planner | implementer=github-platform-implementer | reviewer=github-agentic-workflow-reviewer

**Depends on:** T1 (the workflow file and matrix job shape whose cells this recorder collects), T2 (the pins/schemas module the recorder validates against — `pins_sha256`, `InstallationIdentity`, verdict vocabulary)
**Blocks:** T10 (its cells land in this result shape), T11 (controls are recorded in this result), T12 (reviews this recorder)

## What this does

Implements the grade-recorder job in `.github/workflows/harness-eval.yml` plus `test/harness/recorder.mjs`: validate every grade and event record against the schema, reject a result that is not exactly twelve unique (harness, track) cells, copy the real smoke-job start/completion timestamps from GitHub, upload the logical result and both verify reports under run/attempt-qualified physical names with overwrite disabled, render the Actions summary table, and apply the documented exit semantics.

## Why

UC-GRD-01's promise is that the maintainer reads pass/fail/could-not-run for all six harnesses on both tracks — with Cursor always present. That reading is only trustworthy if one component refuses to emit a result with eleven cells, a duplicate cell, an invented verdict word, or a made-up timestamp. The recorder is that component: it runs even when the smoke matrix failed, so a broken cell still produces evidence instead of a missing artifact.

## How to verify

- `jq '.cells | length'` on the downloaded `harness-eval-result.json` prints `12`, `[.cells[].harness] | unique | length` prints `6`, and `.pins_sha256` is a 64-character hex string.
- The artifact's physical name is attempt-qualified (`harness-eval-result-<RUN_ID>-1`) and the run page renders the twelve-cell table with verdict word and observed CLI version per cell.
- `node --test tests/sprint-01/grd-01-twelve-cells.test.mjs --test-name-pattern FLOW-GRD-01-TWELVE-CELLS` exits 0; a drop-one-cell mutation makes it exit non-zero with `cells-incomplete`.

## Scope

`write_allowed`: `test/harness/recorder.mjs`, `test/harness/recorder/**`, the recorder job block of `.github/workflows/harness-eval.yml` (shared lane — coordinate marker with T1/T9), `tests/sprint-01/grd-01-twelve-cells.test.mjs`, `tests/sprint-01/run-02-hand.test.mjs` (shared with T1, coordinate marker).

<details>
<summary>▸ Full agent specification (TASK-TEMPLATE v5.2 — required reading for implementer + reviewer)</summary>

```
TASK_TYPE:  FEATURE
PRIORITY:   P1
POINTS:     5
AGENT:      planner=github-agentic-workflow-planner | implementer=github-platform-implementer | reviewer=github-agentic-workflow-reviewer

RUNTIME_COMMANDS:
  test:      node --test tests/sprint-01/grd-01-twelve-cells.test.mjs
  lint:      node scripts/validate-workflows.mjs

PROGRESS:   AC-1 none · AC-2 none · 0/2 complete
```

--------------------------------------------------------------------------------
OUTCOME (1 sentence, ≤30 words — observable success)
--------------------------------------------------------------------------------

A dispatched run always produces one attempt-qualified `harness-eval-result` artifact containing exactly twelve unique cells with real GitHub job timestamps, a twelve-cell summary table, and the documented exit semantics.

--------------------------------------------------------------------------------
🚫 CRITICAL CONSTRAINTS (Never tier — read before acting)
--------------------------------------------------------------------------------

- NEVER emit a result with fewer or more than twelve cells, or with a duplicate (harness, track) pair. A missing cell blocks: the recorder exits non-zero with a named reason, it does not "complete" the missing cells.
- NEVER invent `evaluation_started_at` / `evaluation_completed_at`. They are copied from the real smoke jobs via the Actions API; a missing timestamp blocks (02-system-components `grade recorder`).
- NEVER let the recorder's exit code be decided by anything but the documented rule: non-zero for a live pinned failure or any `could-not-run`, zero when only newest-track checks failed. Later checks and controls never change it.
- NEVER upload with overwrite enabled, and never reuse an old artifact name. Physical names carry `${{ github.run_id }}` and `${{ github.run_attempt }}`; retention is 90 days and does not extend the 36-hour authorization lifetime.
- NEVER grant the recorder an environment or a model key. It gets `contents: read` and `actions: read` only, and it must run even when the smoke matrix failed (`if: always()`).

--------------------------------------------------------------------------------
DONE WHEN
--------------------------------------------------------------------------------

- [ ] `test/harness/recorder.mjs` validates grade and event records against the schema and rejects an unknown verdict word — maps to AC-1
- [ ] Twelve-unique-cell enforcement: a cell set with 11 cells or a duplicate pair is refused with `cells-incomplete` / `cells-duplicate` — maps to AC-1
- [ ] `InstallationIdentity` completeness and mapping coverage are validated before a cell is accepted — maps to AC-1
- [ ] `evaluation_started_at` / `evaluation_completed_at` are copied from the first/last required smoke job via the Actions API; absence blocks — maps to AC-1
- [ ] The result records run id, run number, attempt, event, `head_sha`, `candidate_sha`, `install_mode`, `plugin_revision`, `expected_plugin_manifest_sha256`, `pins_sha256`, resolution timestamp, the twelve cells, `later_checks`, `drift`, `release`, `fix` — maps to AC-1
- [ ] Upload uses `harness-eval-result-${{ github.run_id }}-${{ github.run_attempt }}` and `harness-eval-verify-reports-<run_id>-<attempt>` with `overwrite: false`, retention 90 days — maps to AC-1
- [ ] The Actions summary renders the twelve-cell table (harness, track, verdict word, observed CLI version, reason) — maps to AC-1 (TC-2)
- [ ] The recorder job runs with `if: always()`, no environment, `contents: read` + `actions: read`, and applies the documented exit rule — maps to AC-2
- [ ] Both flow modules pass; `git diff --name-only` ⊆ `GUARDRAILS.write_allowed`

--------------------------------------------------------------------------------
BACKGROUND
--------------------------------------------------------------------------------

`02-system-components` gives the grade recorder a slightly unusual posture: it has no environment and no model key, it must run even if smoke or drift failed, and it is the only job allowed to read the Actions API for trusted run/job metadata. `04-api-design` explains why the physical artifact name matters: GitHub artifact metadata carries `workflow_run.id` but not `run_attempt`, so the attempt is bound through the attempt-qualified physical name plus the recorder job's own attempt-specific provenance.

Sprint 01 makes this job the sole reader of the grid (UC-GRD-01) and the sole writer of the artifact the whole gate's steps 4–12 read.

--------------------------------------------------------------------------------
SPECIFICATION
--------------------------------------------------------------------------------

**objective:** Make one component responsible for turning per-cell grade files into the single trusted `harness-eval-result` — validated, complete, timestamped, attempt-qualified, and summarized.

**success_state:** `gh run download <RUN_ID> -n harness-eval-result-<RUN_ID>-1` yields a JSON with exactly 12 unique cells (6 harnesses including cursor), each with a verdict and an observed CLI version, `pins_sha256` a 64-hex digest, real job timestamps, and a run page whose summary shows the same twelve-cell table.

Contract fixed by the PRD (do not substitute alternatives):

| Concern | Required value | Source |
|---|---|---|
| Permissions / environment | no environment; `contents: read` + `actions: read`; runs even if smoke/drift failed | 02-system-components |
| Validation | grade + event schemas, `InstallationIdentity`, complete mapping coverage, twelve unique cells | 02-system-components; 03-data-schema |
| Timestamps | `evaluation_started_at` = GitHub start of the first required smoke job; `evaluation_completed_at` = completion of the last required smoke job; copied, never inferred; missing blocks | 03-data-schema |
| Artifact names | logical `harness-eval-result`, physical `harness-eval-result-<run_id>-<run_attempt>`; verify reports `harness-eval-verify-reports-<run_id>-<run_attempt>`; overwrite disabled; 90-day retention | 03-data-schema; 04-api-design |
| Provenance | retain immutable upload artifact ID/digest and attempt-specific recorder job/upload provenance for release binding | 02-system-components |
| Exit semantics | non-zero for a live pinned failure or any `could-not-run`; zero when only newest-track checks failed; later checks never affect it | 02-system-components |
| Summary | twelve-cell table with verdict word and observed CLI version per cell, cursor always present, release effect next to each result | SPRINT-01 gate step 12 |

--------------------------------------------------------------------------------
ACCEPTANCE CRITERIA (TDD Beads — ordered happy-path first)
--------------------------------------------------------------------------------

AC-1: Twelve-cell summary — every (harness, track) cell present, cursor never omitted [PRIMARY]
  GIVEN: a completed dispatched run whose cell jobs produced grade files (some cells honestly failed or could not run)
  WHEN:  the recorder validates them, copies the real job timestamps, writes the result and uploads it attempt-qualified
  THEN:  the downloaded artifact holds twelve unique cells covering six harnesses with cursor present as `could-not-run`, and `pins_sha256` is a 64-hex digest

  FLOW_REF:              FLOW-GRD-01-TWELVE-CELLS
  TEST_TIER:             integration
  VERIFICATION_SERVICE:  GitHub Actions harness-eval workflow + real harness CLIs + harness-smoke keys
  SURFACE_POLICY:        .spec/e2e-policy/sprint-01/artifact-only-read.json
  TDD_STATE:             none
  TEST_FILE:             tests/sprint-01/grd-01-twelve-cells.test.mjs
  TEST_FUNCTION:         FLOW-GRD-01-TWELVE-CELLS
  VERIFY:                node --test tests/sprint-01/grd-01-twelve-cells.test.mjs --test-name-pattern FLOW-GRD-01-TWELVE-CELLS

  RED_INPUT:    Run the same command on base `main`: `gh workflow list` shows no `harness-eval` row, the artifact download 404s, the module exits 1 and writes the `.red` report — this is the repo today, verified by gate step 1's before state.
  RED_PROOF:    .tmp/sprint-01-verification/grd-01-twelve-cells.json.red
  POSITIVE_EXAMPLE: A fixture artifact with exactly 12 unique (harness, track) cells, each carrying an `observed_cli_version` and cursor present with `could-not-run` — the module exits 0. A mutation fixture that drops the cursor/pinned cell flips it to exit 1 with `cells-incomplete`.

  SCENARIO_SUMMARY: A real dispatch completed → `gh run download` of the attempt-qualified artifact → `cells|length` is 12, unique harnesses is 6 including cursor, the pinned claude-code cell prints four `pass` verdicts, cursor prints `could-not-run missing-api-key`, `pins_sha256` is 64 hex; the drop-one-cell mutation is refused with `cells-incomplete` and 0 writes to the original artifact.

Complete scenario (single copy) — see this AC's row in the REQUIREMENT-CONTRACT block below.

AC-2: Hand dispatch records its mode and matrix truthfully
  GIVEN: no `install_mode` input is passed to a dispatch
  WHEN:  the recorder builds the result from that run
  THEN:  the result records `event workflow_dispatch`, `install_mode checkout`, `candidate_sha` equal to the dispatch commit, and the same twelve cells the nightly matrix shape uses

  FLOW_REF:              FLOW-RUN-02-HAND
  TEST_TIER:             integration
  VERIFICATION_SERVICE:  GitHub Actions harness-eval workflow + real harness CLIs + harness-smoke keys
  SURFACE_POLICY:        .spec/e2e-policy/sprint-01/dispatch-allowed.json
  TDD_STATE:             none
  TEST_FILE:             tests/sprint-01/run-02-hand.test.mjs
  TEST_FUNCTION:         FLOW-RUN-02-HAND
  VERIFY:                node --test tests/sprint-01/run-02-hand.test.mjs --test-name-pattern FLOW-RUN-02-HAND

  RED_INPUT:    Base main: `gh workflow run harness-eval` fails with "could not find any workflows named harness-eval" — the module captures that failure, exits 1 and writes `.red`.
  RED_PROOF:    .tmp/sprint-01-verification/run-02-hand.json.red
  POSITIVE_EXAMPLE: A dispatch with no inputs creates a run with `event workflow_dispatch` and `install_mode=checkout` recorded in the result (same twelve cells, same four checks as the nightly matrix shape) — module exits 0.

  SCENARIO_SUMMARY: A no-input dispatch → artifact identity fields → `workflow_dispatch` + `checkout` + `candidate_sha == dispatch commit` + six harnesses; an explicit `published` dispatch records `published` with `candidate_sha null` and never substitutes checkout identity.

  NOTE: T1 is the [PRIMARY] owner of FLOW-RUN-02-HAND; this AC asserts the recorder's half — that the mode and candidate identity are recorded from GitHub context, not asserted.

--------------------------------------------------------------------------------
TEST CRITERIA (Boolean Verification)
--------------------------------------------------------------------------------

| # | Boolean Statement | Maps To AC | Verify | Status |
|---|-------------------|------------|--------|--------|
| 1 | The twelve-cell flow module fails when the result artifact is not twelve cells over six harnesses including cursor | AC-1 | `node --test tests/sprint-01/grd-01-twelve-cells.test.mjs --test-name-pattern FLOW-GRD-01-TWELVE-CELLS` | [ ] TRUE [ ] FALSE |
| 2 | The twelve-cell flow module fails when `pins_sha256` is absent or not 64 lowercase hex characters | AC-1 | `node --test tests/sprint-01/grd-01-twelve-cells.test.mjs --test-name-pattern FLOW-GRD-01-TWELVE-CELLS` | [ ] TRUE [ ] FALSE |
| 3 | A default dispatch records event workflow_dispatch and install_mode checkout | AC-2 | `node --test tests/sprint-01/run-02-hand.test.mjs --test-name-pattern FLOW-RUN-02-HAND` | [ ] TRUE [ ] FALSE |
| 4 | The recorder refuses an eleven-cell result with reason cells-incomplete | AC-1 | `node --test tests/sprint-01/grd-01-twelve-cells.test.mjs --test-name-pattern FLOW-GRD-01-TWELVE-CELLS` | [ ] TRUE [ ] FALSE |

--------------------------------------------------------------------------------
SCOPE / GUARDRAILS (WRITE-ALLOWED / WRITE-PROHIBITED)
--------------------------------------------------------------------------------

writeAllowed:
- `test/harness/recorder.mjs` (NEW) — schema validation, cell-set enforcement, timestamp copy, result assembly, upload plan
- `test/harness/recorder/**` (NEW) — validator modules and their unit tests
- `.github/workflows/harness-eval.yml` (MODIFY — recorder job block only; coordinate marker: T1 owns the trigger/matrix, T9 owns the smoke step `env:` blocks)
- `tests/sprint-01/grd-01-twelve-cells.test.mjs` (NEW) — the locked flow module for FLOW-GRD-01-TWELVE-CELLS
- `tests/sprint-01/run-02-hand.test.mjs` (MODIFY — assertions only; T1 owns the module skeleton)

writeProhibited:
- `scripts/release.mjs` — the publish gate is a later sprint and must not learn this artifact's shape from here
- `plugins/pixel-perfect/**` — the evaluated product
- `.github/workflows/ci.yml`, `.github/workflows/tag-release.yml`
- `test/harness/pins.json` — T2 is the sole pins authority
- anything not listed in writeAllowed

--------------------------------------------------------------------------------
BOUNDARIES (✅ Always / ⚠️ Ask First)
--------------------------------------------------------------------------------

✅ Always:
- Fail closed: an unvalidatable input means a non-zero recorder exit with a named reason, never a partial artifact.
- Keep the exit rule in one function with the truth table in a comment beside it.
- Write the summary from the same validated object that is uploaded — never re-derive it for the page.
- Upload verify reports under invocation-specific paths so two invocations cannot collide.

⚠️ Ask First:
- Adding any field to `schema: harness-eval-result/v1` (contract change).
- Widening the recorder's permissions past `contents: read` + `actions: read`.
- Handling published-mode cells beyond recording them as `could-not-run` with a named reason.

--------------------------------------------------------------------------------
DELIVERABLE
--------------------------------------------------------------------------------

- `test/harness/recorder.mjs` (NEW): entry point — read cell artifacts, validate, enforce the twelve-cell set, copy timestamps, assemble `HarnessEvalResult`, emit summary markdown, apply exit semantics.
- `test/harness/recorder/validate.mjs` (NEW): per-record schema validation and verdict vocabulary (`pass|fail|could-not-run` only).
- `test/harness/recorder/result.mjs` (NEW): result assembly and identity binding (`pins_sha256`, plugin revision, install mode, candidate sha).
- `test/harness/recorder/summary.mjs` (NEW): the twelve-cell summary table.
- `.github/workflows/harness-eval.yml` (MODIFY): the recorder job block — `if: always()`, `contents: read` + `actions: read`, `actions/download-artifact`, run the recorder, `actions/upload-artifact` with both attempt-qualified names and `overwrite: false`, `$GITHUB_STEP_SUMMARY`.

--------------------------------------------------------------------------------
CODE PATTERN
--------------------------------------------------------------------------------

Node ESM modules under `test/harness/recorder/`, mirroring the repo's `scripts/validate-*.mjs` style: a `main()` that reads inputs, a pure `validate/assemble` layer that unit tests can call with fixtures, and a thin job-shell adapter. Workflow steps follow `.github/workflows/ci.yml` conventions with SHA-pinned actions.

--------------------------------------------------------------------------------
DESIGN
--------------------------------------------------------------------------------

none — no product screen. The reader is the run summary and the artifact (UC-GRD-01: "The summary is the reader").

--------------------------------------------------------------------------------
AGENT INSTRUCTIONS (TDD Flow)
--------------------------------------------------------------------------------

## FOR EACH ACCEPTANCE CRITERION:

### RED PHASE
  READ:   AC, 03-data-schema `HarnessEvalResult`, 02-system-components `grade recorder`, 04-api-design artifact binding
  WRITE:  ONE failing flow module
  RUN:    the AC's VERIFY command
  VERIFY: fails and writes `.red`; for AC-1 also run the `drop-cell` mutation and require exit 1 with `cells-incomplete`
  RETURN: { phase: "RED", test_file, test_function, failure_output }

### GREEN PHASE (after orchestrator VERIFY_RED passes)
  READ:   The failing assertion and the contract table
  WRITE:  The smallest recorder that satisfies it (validate → enforce → timestamp → assemble → upload → summary → exit)
  RUN:    the AC's VERIFY command
  VERIFY: exits 0 with twelve unique cells, six harnesses, 64-hex pins digest
  RETURN: { phase: "GREEN", files_changed, test_output }

### REFACTOR PHASE (after orchestrator VERIFY_GREEN passes)
  READ:   The recorder you wrote
  WRITE:  Split validation from assembly if the module grew past one failure mode; behaviour frozen
  VERIFY: Both flow modules still pass
  RETURN: { phase: "REFACTOR", files_changed, still_passing }

--------------------------------------------------------------------------------
READING LIST (max 5 files — canonical pattern first)
--------------------------------------------------------------------------------

1. `.github/workflows/ci.yml` [PRIMARY PATTERN] — job shape, permissions, artifact steps in this repo.
2. `.spec/prds/harness-eval-framework/09-technical-requirements/02-system-components.md` — `grade recorder` (permissions, exit semantics, provenance).
3. `.spec/prds/harness-eval-framework/09-technical-requirements/03-data-schema.md` — `HarnessEvalResult`, `HarnessCell`, `InstallationIdentity`.
4. `.spec/prds/harness-eval-framework/09-technical-requirements/04-api-design.md` — artifact attempt binding.
5. `.spec/prds/harness-eval-framework/04-uc-grd.md` — UC-GRD-01 acceptance criteria (cursor never omitted).

--------------------------------------------------------------------------------
ORCHESTRATOR VERIFICATION PROTOCOL
--------------------------------------------------------------------------------

1. VERIFY_RED: `.red` artifacts exist; the grd-01 `.red` records the mutated artifact hash and the `cells-incomplete` reason.
2. VERIFY_GREEN: both modules exit 0.
3. VERIFY_ARTIFACT: download by physical name; require 12 cells, 6 harnesses including cursor, 64-hex `pins_sha256`, real timestamps.
4. VERIFY_SUMMARY: the run page renders the twelve-cell table with a verdict word and observed CLI version per cell.
5. VERIFY_EXIT_RULE: a run with a could-not-run cell exits non-zero; a newest-only graded failure exits zero (proven on two real runs, or on a fixture pair).
6. VERIFY_SCOPE: `git diff --name-only` ⊆ writeAllowed, and the recorder job block shows no environment and no `secrets.*`.

--------------------------------------------------------------------------------
EVIDENCE GATES (fast/cheap first — fail fast)
--------------------------------------------------------------------------------

Gate 1: RED evidence for both ACs.
Gate 2: One test per AC.
Gate 3: Both flow modules exit 0.
Gate 4: Seeded evidence — cell count, harness set and pins digest read from the downloaded artifact, not from a local fixture.
Gate 5: Mutation — the drop-cell fixture is refused with `cells-incomplete` and writes nothing to the downloaded original.
Gate 6: Timestamps — the result's `evaluation_started_at`/`evaluation_completed_at` equal the real smoke-job timestamps from the Actions API.
Gate 7: Scope compliance.

--------------------------------------------------------------------------------
AGENT ASSIGNMENT
--------------------------------------------------------------------------------

- **Implementer:** `github-platform-implementer` — job shape, permissions, artifact plumbing and provenance in Actions are this role's surface per AGENTS.md.
- **Reviewer:** `github-agentic-workflow-reviewer` — adversarial review of workflows: green-runs-that-wrote-nothing, silent-drop keys, permission creep.
- **Planner:** `github-agentic-workflow-planner`.

--------------------------------------------------------------------------------
OUT OF SCOPE
--------------------------------------------------------------------------------

- Producing the verdicts (T7 graders) and the captures (T3/T6) it validates.
- The pinned-channel status job and `harness-eval/pinned` / `harness-eval/drift` statuses (later sprint).
- The release gate in `scripts/release.mjs` / `tag-release.yml` (later sprint).
- The fix-agent, patch recheck, confirming run and heal PR jobs (later sprints).
- Populating the pins file (T2).

--------------------------------------------------------------------------------
CONTEXT (read if unclear)
--------------------------------------------------------------------------------

**Current state:** no recorder exists; nothing in the repo produces a validated, complete result artifact.
**Gap:** Without one enforcing component, an eleven-cell or duplicate-cell result would ship as a green run and every downstream release decision would rest on it.

--------------------------------------------------------------------------------
REVIEW CRITERIA (for github-agentic-workflow-reviewer)
--------------------------------------------------------------------------------

Must pass (≤5, evidence-gate-backed):
- Twelve-unique-cell enforcement is proven by a mutation, not just by a passing run.
- Timestamps come from the Actions API; any invented value is a defect.
- Physical artifact names carry run id and attempt; `overwrite: false`; retention 90 days.
- Recorder job: `if: always()`, no environment, `contents: read` + `actions: read`, no `secrets.*`.
- Exit semantics match the PRD table exactly; later checks cannot change them.

Should verify (≤5, judgment):
- Verdict vocabulary is closed; an unknown word is refused with a named reason.
- Summary is generated from the uploaded object, not re-derived.
- Verify reports upload under invocation-specific paths.
- A partial write cannot produce a valid-looking artifact.

Verdict: [APPROVED | NEEDS_FIXES]

--------------------------------------------------------------------------------
DEPENDENCIES
--------------------------------------------------------------------------------

Depends on: T1 (the workflow file and matrix job shape the recorder collects from), T2 (schemas and pins identity the recorder validates against)

Blocks: T10 (its honest `could-not-run` cells are recorded here), T11 (controls are recorded here), T12 (reviews this job).

Not a dependency: T7 — the recorder is built against the published grade schema the PRD fixes, not T7's implementation; a real grader output is what T7's landing supplies to the flow's `available_after`.

--------------------------------------------------------------------------------
NOTES
--------------------------------------------------------------------------------

- FLOW-GRD-01-TWELVE-CELLS is owned here (single [PRIMARY] owner). T1 owns FLOW-RUN-02-HAND and this task's AC-2 is a non-primary assertion of it.
- The workflow file is a shared lane. T1 owns trigger + matrix, T9 owns the smoke `env:` blocks, this task owns the recorder job. Land each region separately.
- `artifacts/*.json` field names are a contract: `pins_sha256`, `evaluation_started_at`, `evaluation_completed_at`, `install_mode`, `candidate_sha` are consumed by the gate's `jq` steps and by later sprints' release resolver.

<!-- REQUIREMENT-CONTRACT v1 -->
<!--
{
  "version": "1",
  "task_id": "T8",
  "task_type": "FEATURE",
  "tdd_mode": "red_first",
  "verification_policy": {
    "requires_tests": true,
    "requires_red_evidence": true,
    "requires_seeded_evidence": true
  },
  "fixtures": {
    "seed/live-dispatch-run": {
      "entrypoint": "gh workflow run harness-eval --repo hackerpug-ai/pixel-perfect (real dispatch, checkout default)",
      "description": "RUN_ID + attempt-qualified artifacts via gh run download",
      "seed_method": "cli"
    },
    "seed/result-artifact": {
      "entrypoint": "gh run download <RUN_ID> -n harness-eval-result-<RUN_ID>-1",
      "description": "harness-eval-result.json with cells, controls, pins_sha256, identity fields",
      "seed_method": "cli"
    },
    "seed/verify-reports-artifact": {
      "entrypoint": "gh run download <RUN_ID> -n harness-eval-verify-reports-<RUN_ID>-1",
      "description": "reports/verify-button-drift.json and reports/verify-clean.json",
      "seed_method": "cli"
    },
    "seed/live-dispatch-published": {
      "entrypoint": "gh workflow run harness-eval -f install_mode=published",
      "description": "second RUN_ID recording published mode",
      "seed_method": "cli"
    }
  },
  "guardrails": {
    "write_allowed": [
      "test/harness/recorder.mjs",
      "test/harness/recorder/**",
      ".github/workflows/harness-eval.yml (recorder job block)",
      "tests/sprint-01/grd-01-twelve-cells.test.mjs",
      "tests/sprint-01/run-02-hand.test.mjs"
    ],
    "write_prohibited": [
      "scripts/release.mjs",
      "plugins/pixel-perfect/**"
    ]
  },
  "integration_obligations": [
    {
      "id": "obl-FLOW-GRD-01-TWELVE-CELLS",
      "obligation_id": "obl-FLOW-GRD-01-TWELVE-CELLS",
      "flow_ref": "FLOW-GRD-01-TWELVE-CELLS",
      "phase": "post-integration",
      "mandatory": true,
      "owner_task_id": "T8",
      "available_after": [
        "T1",
        "T10",
        "T2",
        "T8"
      ],
      "required_by": [
        "T11",
        "T12"
      ],
      "recheck_on": [
        "T11",
        "T12"
      ],
      "recheck_paths": [
        "tests/sprint-01/grd-01-twelve-cells.test.mjs",
        "test/harness/pins.json",
        ".github/workflows/harness-eval.yml"
      ],
      "completion_rule": "After T1, T2, T8 and T10 land, replay FLOW-GRD-01-TWELVE-CELLS on the trunk: the downloaded attempt-qualified result must hold twelve unique cells over six harnesses with cursor present as could-not-run and a 64-hex pins_sha256.",
      "verification_gates": [],
      "requirements": [],
      "owner_bindings": [
        {
          "owner_task_id": "T8",
          "flow_ref": "FLOW-GRD-01-TWELVE-CELLS",
          "command": "node --test tests/sprint-01/grd-01-twelve-cells.test.mjs --test-name-pattern FLOW-GRD-01-TWELVE-CELLS"
        }
      ]
    }
  ],
  "requirements": [
    {
      "id": "AC-1",
      "type": "acceptance_criterion",
      "primary": true,
      "flow_ref": "FLOW-GRD-01-TWELVE-CELLS",
      "title": "Twelve-cell summary: every (harness, track) cell present with verdict word and observed CLI version, cursor never omitted, readable from the artifact alone",
      "description": "GIVEN a completed dispatched run whose cell jobs produced grade files WHEN the recorder validates them, copies the real job timestamps, writes the result and uploads it attempt-qualified THEN the downloaded artifact holds twelve unique cells covering six harnesses with cursor present as could-not-run and pins_sha256 is a 64-hex digest",
      "test_tier": "integration",
      "verification_service": "GitHub Actions harness-eval workflow + real harness CLIs + harness-smoke keys",
      "verify": "node --test tests/sprint-01/grd-01-twelve-cells.test.mjs --test-name-pattern FLOW-GRD-01-TWELVE-CELLS",
      "test_file": "tests/sprint-01/grd-01-twelve-cells.test.mjs",
      "test_function": "FLOW-GRD-01-TWELVE-CELLS",
      "positive_example": "A fixture artifact with exactly 12 unique (harness,track) cells, each carrying an observed_cli_version, cursor present with could-not-run \u2014 the module exits 0. Mutation fixture (drop the cursor/pinned cell) flips it to 1.",
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "maps_to_ac": null,
      "red_input": "Run the same command on base main: gh workflow list shows no harness-eval row, the download 404s, the module exits 1 and writes the .red report \u2014 exists today, verified by step 1's before state.",
      "red_proof": ".tmp/sprint-01-verification/grd-01-twelve-cells.json.red",
      "scenario": {
        "tier": "e2e-automated",
        "topology_note": "GitHub-hosted runner runs harness-eval (12-cell matrix) + grade recorder; local replay downloads harness-eval-result-<run_id>-<attempt> via gh and validates with the recorder's own schema validator",
        "test_tier": "e2e",
        "negative_control": {
          "would_fail_if": [
            "the recorder emitted fewer than 12 cells or a duplicate (harness, track) pair \u2014 the .red drop-cell mutation must be rejected with reason cells-incomplete",
            "any verdict outside pass|fail|could-not-run appeared \u2014 vocabulary rejection fires",
            "an absent adapter were omitted instead of present-as-could-not-run \u2014 cells|length != 12 fails",
            "pins_sha256 were absent or not 64-hex \u2014 identity binding fails"
          ]
        },
        "evidence": {
          "forms": [
            "harness-eval-result artifact JSON",
            "Actions run metadata"
          ],
          "examples": [
            "cells|length == 12",
            "unique harnesses == 6",
            "pins_sha256 matches ^[0-9a-f]{64}$"
          ],
          "required_capture": "the downloaded artifact file plus its gh api artifact listing line so cell counts are bound to a real run"
        },
        "build_proof": {
          "range": "anything that proves the twelve-cell result was emitted by a real recorder run against real cell artifacts",
          "examples": [
            "artifact listing line + downloaded harness-eval-result-<RUN_ID>-1"
          ]
        },
        "cases": [
          {
            "start_ref": "seed/live-dispatch-run",
            "action": {
              "actor": "maintainer",
              "steps": [
                "gh workflow run harness-eval",
                "gh run watch <RUN_ID> until completed",
                "gh run download <RUN_ID> -n harness-eval-result-<RUN_ID>-1 -D /tmp/he1"
              ]
            },
            "end_state": {
              "must_observe": [
                "jq '.cells|length' prints 12",
                "unique harness count prints 6 with cursor in the set",
                "claude-code/pinned checks print exactly: command_list pass, status pass, verify pass, question_before_expensive_work pass",
                "cursor/pinned prints \"could-not-run missing-api-key\"",
                "pins_sha256 is a 64-character hex string"
              ],
              "must_not_observe": [
                "any empty or null .verdict field",
                "a cursor cell with reason adapter-absent",
                "any of codex/grok/opencode/pi cells with verdict pass",
                "cells|length of 11 or 13, or a duplicate (harness,track) pair"
              ]
            }
          },
          {
            "start_ref": "seed/live-dispatch-run",
            "action": {
              "actor": "runner",
              "steps": [
                "node tests/sprint-01/flow-runner.mjs grd-01 --run latest --mutate drop-cell --expect red"
              ]
            },
            "end_state": {
              "must_observe": [
                "exit code non-zero with rejection reason containing \"cells-incomplete\"",
                ".red file written recording the 11-cell mutated artifact hash"
              ],
              "must_not_observe": [
                "validator acceptance of the 11-cell result",
                "any write to the downloaded original artifact (0 writes besides the flow report)"
              ]
            }
          }
        ]
      }
    },
    {
      "id": "AC-2",
      "type": "acceptance_criterion",
      "primary": false,
      "flow_ref": "FLOW-RUN-02-HAND",
      "title": "Hand dispatch: maintainer starts the grade by hand, checkout default, same matrix and checks as nightly",
      "description": "GIVEN no install_mode input is passed to a dispatch WHEN the recorder builds the result from that run THEN the result records event workflow_dispatch, install_mode checkout, candidate_sha equal to the dispatch commit, and the same twelve cells the nightly matrix shape uses",
      "test_tier": "integration",
      "verification_service": "GitHub Actions harness-eval workflow + real harness CLIs + harness-smoke keys",
      "verify": "node --test tests/sprint-01/run-02-hand.test.mjs --test-name-pattern FLOW-RUN-02-HAND",
      "test_file": "tests/sprint-01/run-02-hand.test.mjs",
      "test_function": "FLOW-RUN-02-HAND",
      "positive_example": "Dispatch with no inputs creates a run with event workflow_dispatch and install_mode=checkout recorded in the result (same twelve cells, same four checks as the nightly matrix shape) \u2014 module exits 0.",
      "surface_policy": ".spec/e2e-policy/sprint-01/dispatch-allowed.json",
      "maps_to_ac": null,
      "red_input": "Base main: gh workflow run harness-eval fails with 'could not find any workflows named harness-eval' \u2014 the module captures that failure, exits 1, writes .red. Exists today.",
      "red_proof": ".tmp/sprint-01-verification/run-02-hand.json.red",
      "scenario": {
        "tier": "e2e-automated",
        "topology_note": "workflow_dispatch on main with install_mode input (checkout default); artifact records event, install_mode, candidate_sha; a second dispatch with explicit published records published mode without checkout substitution",
        "test_tier": "e2e",
        "negative_control": {
          "would_fail_if": [
            "a default (no-input) dispatch recorded install_mode published or a release candidate_sha \u2014 the checkout identity is omitted",
            "a published dispatch carried checkout identity \u2014 R-mode-mixup guard fires",
            "mode were inferred from logs instead of artifact fields"
          ]
        },
        "evidence": {
          "forms": [
            "artifact identity fields (event, install_mode, candidate_sha, plugin_revision)",
            "gh run list event column"
          ],
          "examples": [
            "event workflow_dispatch",
            "install_mode checkout with candidate_sha == dispatch commit",
            "published input yields install_mode published, candidate_sha null, could-not-run cells naming release resolution"
          ],
          "required_capture": "dispatch commit sha from git and the artifact's candidate_sha for equality, plus both run ids"
        },
        "build_proof": {
          "range": "anything that proves the recorder wrote the mode and candidate identity from GitHub context",
          "examples": [
            "result artifact identity fields matching gh run view output"
          ]
        },
        "cases": [
          {
            "start_ref": "seed/live-dispatch-run",
            "action": {
              "actor": "maintainer",
              "steps": [
                "git rev-parse HEAD",
                "gh workflow run harness-eval with no inputs",
                "download artifact and read event/install_mode/candidate_sha"
              ]
            },
            "end_state": {
              "must_observe": [
                "event == workflow_dispatch",
                "install_mode == checkout",
                "candidate_sha == the dispatch commit sha",
                "six harnesses present (\"claude-code\", \"codex\", \"grok\", \"opencode\", \"pi\", \"cursor\")"
              ],
              "must_not_observe": [
                "install_mode \"published\" on a default (no-input) dispatch",
                "candidate_sha null on the checkout run",
                "mode asserted from logs"
              ]
            }
          },
          {
            "start_ref": "seed/live-dispatch-published",
            "action": {
              "actor": "runner",
              "steps": [
                "gh workflow run harness-eval -f install_mode=published",
                "node tests/sprint-01/flow-runner.mjs run-02 --fixture published-dispatch --expect red"
              ]
            },
            "end_state": {
              "must_observe": [
                "artifact records install_mode \"published\" and candidate_sha null",
                "cells honestly read \"could-not-run\" naming release resolution, never checkout-substituted"
              ],
              "must_not_observe": [
                "candidate_sha == dispatch commit on the published run",
                "a pass verdict on any published-mode cell in sprint-01 (no graded cells exist there)"
              ]
            }
          }
        ]
      }
    },
    {
      "id": "TC-1",
      "type": "test_criterion",
      "description": "The twelve-cell flow module fails when the result artifact is not twelve cells over six harnesses including cursor",
      "verify": "node --test tests/sprint-01/grd-01-twelve-cells.test.mjs --test-name-pattern FLOW-GRD-01-TWELVE-CELLS",
      "maps_to_ac": "AC-1"
    },
    {
      "id": "TC-2",
      "type": "test_criterion",
      "description": "The twelve-cell flow module fails when pins_sha256 is absent or not 64 lowercase hex characters",
      "verify": "node --test tests/sprint-01/grd-01-twelve-cells.test.mjs --test-name-pattern FLOW-GRD-01-TWELVE-CELLS",
      "maps_to_ac": "AC-1"
    },
    {
      "id": "TC-3",
      "type": "test_criterion",
      "description": "A default dispatch records event workflow_dispatch and install_mode checkout in the result artifact",
      "verify": "node --test tests/sprint-01/run-02-hand.test.mjs --test-name-pattern FLOW-RUN-02-HAND",
      "maps_to_ac": "AC-2"
    },
    {
      "id": "TC-4",
      "type": "test_criterion",
      "description": "The recorder refuses an eleven-cell result with reason cells-incomplete",
      "verify": "node --test tests/sprint-01/grd-01-twelve-cells.test.mjs --test-name-pattern FLOW-GRD-01-TWELVE-CELLS",
      "maps_to_ac": "AC-1"
    }
  ]
}
-->
</details>

## Handoff

```json
{
  "task": "T8",
  "commit_sha": "356dafa858b6b51794c0366a1a7186eb576c2795",
  "done": "PROVISIONAL SUBSTITUTE-AUTHOR DRAFT, UNAPPROVED: reconstructed from landed code and retained cycle-3 evidence, not original-author testimony. Against base f5423e74d0c9b23e3d5c260b69b7ca257f1d81ec, the candidate adds the grade recorder and its validation/result/summary modules, the harness-eval grade job, and recorder assertions in two flow modules. It validates twelve unique cells over six harnesses, installation mode and schema/pins identity; assembles result identity and timestamps; bundles verify reports; writes result/summary with refusal cleanup; renders the twelve-cell table; and applies the pinned-failure/could-not-run/newest-warning exit rule. Workflow uploads use run/attempt-qualified names, overwrite=false and 90-day retention. Saved cycle 3 revision 0 is APPROVED and records landing cf84326a0cb85ebaf0eb9bfb8ddf2cb0ae5e6274; handoff delivery remains pending. This draft neither records a handoff nor completes T8 or its hosted acceptance.",
  "deviations": [
    "The original registered implementer session 9c426bb2-9fd0-4f8 is historical and unavailable to this reconstruction. No saved native final report was supplied here. This is preparation for explicit owner review of a substitute-author record; it carries no substitution authorization or native response receipt.",
    "The retained local checks exercise real files, pins bytes, CLI version probes and workflow declarations, but also use fabricated cell records, fixed job payloads, synthetic GITHUB_* contexts and an injected canned pinnedFetch response in main() tests. These legs do not prove the Actions API integration or a real dispatched evaluator run.",
    "Frozen review leaves AC-1 and FLOW-GRD-01-TWELVE-CELLS DEFERRED on T10. Historical AC-2/FLOW-RUN-02-HAND PASS includes local declaration/context proof and a retained governed replay, while both frozen checks reported live_artifact=absent."
  ],
  "concerns": [
    "U-T8-1 remains OPEN: hosted behavior when actions/download-artifact@v4 pattern harness-eval-verify-* matches nothing was not established; a failed download can prevent the recorder step from running despite job-level always().",
    "U-T8-2 remains OPEN: no retained proof establishes the hosted recorder execution, real smoke-matrix timestamp equality, attempt-qualified result download, run-page table, or no-input and published dispatch identities. Historical statements that no harness-eval run existed are historical observations, not a current remote inventory.",
    "F-T8-5 remains unresolved ADVISORY: bare pinned cells set resolved_cli_version to requested_cli_version without resolution and observed_cli_version remains null; run context also defaults the repository when GITHUB_REPOSITORY is absent. These fields must not be promoted into observed installation/run provenance.",
    "Artifact names and result fields do not independently establish origin. Production run/job lookup uses /actions/runs/{runId}/jobs with no attempt argument; local optional artifact validation falls back to artifact.head_sha when HARNESS_EVAL_DISPATCH_SHA is absent. This reconstruction establishes no independent hosted run/attempt/source binding.",
    "Refusal cleanup is best effort if filesystem removal itself fails. The verify-reports upload retains if-no-files-found:error, and its extra failure on an early refusal remains possible.",
    "The emitted not_executed smoke-job-timestamps reason still claims another run's live API job list proves the copy, although timestamps.source correctly identifies the fixed payload. C3-5's retained JSON internally names subject_sha 8cd6eecc474e5a8b35e1f8bc38ea30541f04046c despite the verdict's 356dafa attribution; the retained union-diff log reports identical tracked trees, but this draft does not rewrite provenance."
  ],
  "findings": [
    "Saved cycle-3 statuses are preserved: F-T8-1 timestamp ambient-state dependency FIXED; F-T8-2 result survival after refusal FIXED; F-T8-3 unreachable bare-cell mode guard FIXED; F-T8-4/F-T8-5/F-T8-6 ADVISORY with null resolutions; F-T8-7 shared-lane modification premise REFUTED. U-T8-1/U-T8-2 OPEN; U-T8-3 RESOLVED.",
    "The cycle-3 summary says F-T8-4's vacuous assertion was replaced by main()-driven refusal/late-throw legs and F-T8-6's missing refusal log was incidentally addressed by uploading recorder.log. Their retained formal ADVISORY statuses are not silently closed here.",
    "Historical evidence C3-1/C3-2 reports 2/2 and 3/3 local tests passing with live_artifact=absent; C3-10..C3-14 reports five mutations turning the check red; C3-23/C3-24 records a governed FLOW-RUN-02-HAND replay at 356dafa. These commands were inspected, not rerun for this draft.",
    "Read-only reconstruction confirmed the candidate worktree HEAD and hashed the cycle-3 bundle/context/verdict plus all 24 referenced artifact files; all referenced artifact digests match their retained verdict entries. Matching bytes preserve the historical evidence; they do not validate hosted semantics or supply original-author testimony."
  ],
  "scope_impact": [
    {
      "target": "GATE:FLOW-GRD-01-TWELVE-CELLS",
      "found": "The frozen review explicitly defers AC-1/the twelve-cell flow and retains U-T8-1/U-T8-2; the contract requires a downloaded artifact bound to real Actions metadata.",
      "change": "Keep the obligation unresolved until its governed integrated replay supplies actual run/attempt/source identity, twelve unique cells including cursor, real smoke timestamps, pins digest, graded evidence and the drop-cell refusal."
    },
    {
      "target": "GATE:FLOW-RUN-02-HAND",
      "found": "Historical PASS proves local declaration/context behavior and retained replay, while hosted no-input/published dispatch legs remain not executed.",
      "change": "Keep hosted confirmation separate; retain both real run IDs, trusted GitHub head/event/mode metadata and matching downloaded artifact fields before claiming hosted acceptance."
    },
    {
      "target": "T8",
      "found": "Saved code landing exists, but original-author handoff delivery is pending and this reconstruction lacks substitute authorization.",
      "change": "Leave delivery/completion state unchanged. Any later recording must follow the native original-session route or the contract's explicit owner-authorized substitute envelope and provenance requirements."
    }
  ],
  "feedback": [
    "Use T8.evidence.md beside this draft for exact source lines, frozen identities, historical evidence references and limits. Do not interpret this reconstruction as a new review, current live inventory, approval, implementation report or completion receipt."
  ]
}
```
