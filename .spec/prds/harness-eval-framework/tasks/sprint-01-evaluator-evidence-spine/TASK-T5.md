# TASK-T5 — Implement the claude-code adapter: pinned/newest install with `DISABLE_AUTOUPDATER=1`, marketplace add + plugin install, plugin-details list (no model), headless `-p` graded runs, `system/init` plugin gate, InstallationIdentity digest verification

> Status: ✅ Completed

Commit: 5465703879e58a5fb53ba4947f5492ccc9226c5e
> Assignee: ai-tooling-implementer
> Priority: P1
> Points: 8
> Type: FEATURE
> Planner: github-agentic-workflow-planner
> Proposed By: github-agentic-workflow-planner + evals-planner
> TDD_MODE: red_first
> RED_GREEN_REQUIRED: true

planner=github-agentic-workflow-planner | implementer=ai-tooling-implementer | reviewer=ai-tooling-reviewer

**why_required:** serves FLOW-GRD-02-FOUR-GRADES and FLOW-JRN-PLANTED-AND-TWIN: the claude-code adapter is what produces the four graded invocations and the planted/clean verify pair those two flows read

**Depends on:** T2 (the pins/schemas/lookup module supplying the exact CLI version, provider/model and `ANTHROPIC_API_KEY` binding this adapter installs and invokes), T3 (the guard, capture, stance and writer every invocation runs through), T4 (the fixture kit and case manifests the four graded invocations address)
**Blocks:** T6 (maps this adapter's real stdout), T10 (its cell wiring reuses the adapter registry), T11 (qualifies the negative controls from this adapter's captures)

## What this does

Installs and invokes the real Claude Code CLI for both tracks: `npm install -g @anthropic-ai/claude-code@<version>` with `DISABLE_AUTOUPDATER=1`, `claude plugin marketplace add` + `claude plugin install pixel-perfect@pixel-perfect` in checkout mode, a model-free command list via `claude plugin details pixel-perfect`, and four graded `claude -p "/pixel-perfect:<name>"` invocations whose result depends on a `system/init` plugin gate and a verified `InstallationIdentity`.

## Why

UC-GRD-02's reader must see the command list, status, verify on a planted defect, and whether the first turn asked before expensive work — for the pinned and the newest build. Claude Code is the one harness this sprint grades live, so its adapter is the only place the framework's whole promise is actually exercised: if the adapter trusts exit 0, or installs without pinning, or ignores that `-p` entered bare mode and never loaded the plugin, the twelve-cell result is a fiction.

## How to verify

- Both `claude-code` cells carry a dotted observed CLI version and a 64-hex observed plugin manifest digest (`MISSING`, `null` or empty fails the test step).
- The pinned cell's four checks read `command_list pass`, `status pass`, `verify pass`, `question_before_expensive_work pass`, each graded from files and event stream.
- `node --test tests/sprint-01/grd-02-four-grades.test.mjs --test-name-pattern FLOW-GRD-02-FOUR-GRADES` and `node --test tests/sprint-01/jrn-planted-and-twin.test.mjs --test-name-pattern FLOW-JRN-PLANTED-AND-TWIN` exit 0.

## Scope

`write_allowed`: `test/harness/adapters/claude-code.mjs`, `test/harness/adapters/registry.mjs`, `tests/sprint-01/grd-02-four-grades.test.mjs`, `tests/sprint-01/jrn-planted-and-twin.test.mjs`. It owns no flow (T7 owns GRD-02 and the journey), so it carries no integration obligation.

<details>
<summary>▸ Full agent specification (TASK-TEMPLATE v5.2 — required reading for implementer + reviewer)</summary>

```
TASK_TYPE:  FEATURE
PRIORITY:   P1
POINTS:     8
AGENT:      planner=github-agentic-workflow-planner | implementer=ai-tooling-implementer | reviewer=ai-tooling-reviewer

RUNTIME_COMMANDS:
  test:      node --test tests/sprint-01/grd-02-four-grades.test.mjs tests/sprint-01/jrn-planted-and-twin.test.mjs
  lint:      node scripts/validate-plugin.mjs

PROGRESS:   AC-1 none · AC-2 none · 0/2 complete
```

--------------------------------------------------------------------------------
OUTCOME (1 sentence, ≤30 words — observable success)
--------------------------------------------------------------------------------

Both claude-code cells install the exact resolved CLI with auto-update off, prove the plugin actually loaded, and produce four evidence-graded verdicts from real headless invocations.

--------------------------------------------------------------------------------
🚫 CRITICAL CONSTRAINTS (Never tier — read before acting)
--------------------------------------------------------------------------------

- NEVER adopt `--permission-mode bypassPermissions`. The recorded stance is `--permission-mode dontAsk` plus `--add-dir` of the plugin root (owner-approved). Denied required reads are `fail`, not a pass and not a could-not-run.
- NEVER grade a run whose `system/init` event does not list `pixel-perfect` under plugins. `-p` can enter bare mode and silently skip plugins; without that line the run is `could-not-run`.
- NEVER let a cache version label, a stale plugin cache, or an install command's exit code stand as byte proof. The expected plugin manifest digest is rebuilt from sorted relative paths + file contents; a digest/version/load mismatch is `could-not-run` (`installation-identity-mismatch`).
- NEVER install or invoke without `DISABLE_AUTOUPDATER=1`, and never fall back to the default branch in published mode — published binds the run-resolved release revision.
- NEVER put the API key on an install, marketplace, plugin-install, or command-list step. `ANTHROPIC_API_KEY` sits on the graded model steps only.

--------------------------------------------------------------------------------
DONE WHEN
--------------------------------------------------------------------------------

- [ ] `test/harness/adapters/claude-code.mjs` installs `@anthropic-ai/claude-code@<resolved>` with `DISABLE_AUTOUPDATER=1`, for both the pinned and the newest track — maps to AC-1
- [ ] Checkout mode runs `claude plugin marketplace add` on the workspace then `claude plugin install pixel-perfect@pixel-perfect`, and records that both are untested-until-proven — maps to AC-1
- [ ] `claude plugin details pixel-perfect` produces the command list with no model call; the 11 names are deduped and asserted by presence, never by count alone — maps to AC-1
- [ ] Four graded invocations run through the runtime's guard/capture: `claude -p "/pixel-perfect:<name>"` with fixture args, `--output-format stream-json --verbose`, stdin closed, case timeout, recorded stance — maps to AC-1
- [ ] `InstallationIdentity` records requested / resolved / observed CLI version, `observed_plugin_manifest_sha256`, `loaded_plugin_root`, install mode and `plugin_load_evidence` — maps to AC-1 (TC-3)
- [ ] A missing or mismatched identity yields `could-not-run` / `installation-identity-mismatch`, never a candidate-attributed failure — maps to AC-1
- [ ] The planted verify and the clean twin both produce their case-declared reports, bound to distinct invocation ids of the same live run — maps to AC-2
- [ ] Both flow modules pass; `git diff --name-only` ⊆ `GUARDRAILS.write_allowed`

--------------------------------------------------------------------------------
BACKGROUND
--------------------------------------------------------------------------------

`02-system-components` fixes the claude-code adapter's mechanics from a real probe: surveyed and newest were both 2.1.291 on 2026-10-06; the plugin list prints the 11 skill names twice plus `polish` and `process-context`; a checked `--permission-mode default` run ended `subtype: success` / `is_error: false` while reads of `workflows/RUNTIME-CONTRACT.md` and `workflows/status.md` were **denied**. That last fact is why this task may not treat a clean exit as a pass, and why the stance must be recorded and its denials honoured.

The pin: the owner approved `2.1.291` as the initial pinned CLI version in `test/harness/pins.json`, subject to qualification on a real hosted runner. T2 owns that file; this adapter reads it and records the version it actually installed.

--------------------------------------------------------------------------------
SPECIFICATION
--------------------------------------------------------------------------------

**objective:** Make claude-code a real, identity-bound, evidence-graded harness on a hosted runner — install, load proof, command list, and four graded invocations — for both tracks.

**success_state:** A dispatched run yields two claude-code cells, each with `observed_cli_version` and `observed_plugin_manifest_sha256` present and matching the installed payload, the pinned cell's four checks graded `pass` from files and event stream, and the planted/clean verify pair landing at exactly their case-declared report paths.

Adapter contract fixed by the PRD (do not substitute alternatives):

| Concern | Required value | Source |
|---|---|---|
| Install | `npm install -g @anthropic-ai/claude-code@<version>` with `DISABLE_AUTOUPDATER=1`; published mode binds the run-resolved release revision, no default-branch fallback | 02-system-components `claude-code-adapter` |
| Load | checkout mode: `claude plugin marketplace add` (workspace) + `claude plugin install pixel-perfect@pixel-perfect`; both untested until a real run proves them | same |
| Command list (no model) | `claude plugin details pixel-perfect`, then dedupe; presence assertions, never a count-only check | same |
| Graded invocation | `claude -p "/pixel-perfect:<name>"` with fixture args in that prompt, `--output-format stream-json --verbose`, stdin closed, case timeout, recorded stance | same |
| Reply field | the `result` field | same |
| Plugin gate | `could-not-run` unless the `system/init` event lists `pixel-perfect` under plugins | same |
| Stance | `--permission-mode dontAsk` + `--add-dir` plugin root; `bypassPermissions` rejected; `--max-turns` is a backstop only | same; owner decision |
| Identity | `InstallationIdentity` from 03-data-schema; a version/digest/load mismatch is `could-not-run` `installation-identity-mismatch` | 03-data-schema |
| Credential | `ANTHROPIC_API_KEY`, on the graded model steps only | 03-data-schema `CredentialBinding` |

--------------------------------------------------------------------------------
ACCEPTANCE CRITERIA (TDD Beads — ordered happy-path first)
--------------------------------------------------------------------------------

AC-1: Four grades per graded cell — ask-nothing enforced, must-ask stops at its first question
  GIVEN: a claude-code cell installed at the resolved version with the plugin loaded (proven by `system/init`) on a real hosted runner
  WHEN:  the adapter runs the command list, the status check, the planted and clean verify invocations and the must-ask init probe
  THEN:  the cell carries four verdicts graded from files and event stream, with zero question events in the ask-nothing streams and exactly one unanswered question in the must-ask probe

  FLOW_REF:              FLOW-GRD-02-FOUR-GRADES
  TEST_TIER:             integration
  VERIFICATION_SERVICE:  GitHub Actions harness-eval workflow + real harness CLIs + harness-smoke keys
  SURFACE_POLICY:        .spec/e2e-policy/sprint-01/artifact-only-read.json
  TDD_STATE:             none
  TEST_FILE:             tests/sprint-01/grd-02-four-grades.test.mjs
  TEST_FUNCTION:         FLOW-GRD-02-FOUR-GRADES
  VERIFY:                node --test tests/sprint-01/grd-02-four-grades.test.mjs --test-name-pattern FLOW-GRD-02-FOUR-GRADES

  RED_INPUT:    On base main the module finds no grade record (no `test/harness` exists) and exits 1 writing `.red`; locally, a fixture whose status stream contains a question flips the verdict to `fail`.
  RED_PROOF:    .tmp/sprint-01-verification/grd-02-four-grades.json.red
  POSITIVE_EXAMPLE: A fixture pair: the claude-code pinned cell carries four `pass` verdicts where the list/status/verify streams contain zero question events and the init prefix stops at the first `USER_CHOICE` with no answer sent — module exits 0.

  SCENARIO_SUMMARY: A real claude-code cell → list, status, planted verify, clean verify and must-ask init through `claude -p` → four verdicts, `web-desktop` status facts with nonzero inventory counts, exactly 1 USER_CHOICE and 0 answers delivered.

  NOTE: this AC is not the [PRIMARY] owner of FLOW-GRD-02-FOUR-GRADES (T7 owns it); it asserts the adapter-produced evidence the flow reads.

AC-2: Journey — a planted-and-clean verify pair through a real dispatched run
  GIVEN: a dispatched harness-eval run on the hosted runner with the claude-code cells live
  WHEN:  the run completes and the maintainer downloads the verify-reports artifact
  THEN:  the planted report names `atoms/Button/default` with `defect-detected` and the clean twin reports `clean_project_failed false`, both bound to distinct invocation ids of the same live run

  FLOW_REF:              null (journey proof — T7 owns FLOW-JRN-PLANTED-AND-TWIN post-integration)
  TEST_TIER:             e2e
  VERIFICATION_SERVICE:  GitHub Actions harness-eval workflow + real harness CLIs + harness-smoke keys
  SURFACE_POLICY:        .spec/e2e-policy/sprint-01/artifact-only-read.json
  TDD_STATE:             none
  TEST_FILE:             tests/sprint-01/jrn-planted-and-twin.test.mjs
  TEST_FUNCTION:         FLOW-JRN-PLANTED-AND-TWIN
  VERIFY:                node --test tests/sprint-01/jrn-planted-and-twin.test.mjs --test-name-pattern FLOW-JRN-PLANTED-AND-TWIN

  RED_INPUT:    Base main: the journey cannot start — there is no workflow to dispatch and no oracle wrapper — so the module exits 1 with `.red`.
  RED_PROOF:    .tmp/sprint-01-verification/jrn-planted-and-twin.json.red
  POSITIVE_EXAMPLE: One real dispatched run whose artifact chain satisfies: the oracle exits 1 on planted with `drifted[].key atoms/Button/default` and 0 on clean, the planted report reads `defect-detected` at its declared path, the clean report reads `clean`, and both are linked from the summary — module exits 0.

  SCENARIO_SUMMARY: A live dispatch → the real CLI runs planted then clean verify in fresh work directories → both case-declared reports exist with distinct invocation ids, and deleting the planted report downgrades to `fail report-missing`, never `could-not-run`.

--------------------------------------------------------------------------------
TEST CRITERIA (Boolean Verification)
--------------------------------------------------------------------------------

| # | Boolean Statement | Maps To AC | Verify | Status |
|---|-------------------|------------|--------|--------|
| 1 | The claude-code pinned cell grades four separate check verdicts from files and event stream | AC-1 | `node --test tests/sprint-01/grd-02-four-grades.test.mjs --test-name-pattern FLOW-GRD-02-FOUR-GRADES` | [ ] TRUE [ ] FALSE |
| 2 | The ask-nothing streams contain zero question events while the must-ask probe stops at exactly one unanswered question | AC-1 | `node --test tests/sprint-01/grd-02-four-grades.test.mjs --test-name-pattern FLOW-GRD-02-FOUR-GRADES` | [ ] TRUE [ ] FALSE |
| 3 | The four-grades flow module requires each claude-code cell to record a dotted observed CLI version and a 64-hex plugin manifest digest | AC-1 | `node --test tests/sprint-01/grd-02-four-grades.test.mjs --test-name-pattern FLOW-GRD-02-FOUR-GRADES` | [ ] TRUE [ ] FALSE |
| 4 | The four-grades flow module finds no harness API key on an install, marketplace, plugin-install or command-list step | AC-1 | `node --test tests/sprint-01/grd-02-four-grades.test.mjs --test-name-pattern FLOW-GRD-02-FOUR-GRADES` | [ ] TRUE [ ] FALSE |

TC-3 and TC-4 are the two claims about the result artifact and the workflow shape that the
four-grades module reads before grading, so the same module proves all four rows.

--------------------------------------------------------------------------------
SCOPE / GUARDRAILS (WRITE-ALLOWED / WRITE-PROHIBITED)
--------------------------------------------------------------------------------

writeAllowed:
- `test/harness/adapters/claude-code.mjs` (NEW) — install, load proof, command list, four graded invocations, `InstallationIdentity`
- `test/harness/adapters/registry.mjs` (NEW) — the adapter registry the cell wiring selects from (T10 adds the other five as absent/`could-not-run`)
- `tests/sprint-01/grd-02-four-grades.test.mjs` (NEW) — the locked flow module for FLOW-GRD-02-FOUR-GRADES
- `tests/sprint-01/jrn-planted-and-twin.test.mjs` (NEW) — the journey module

writeProhibited:
- `plugins/pixel-perfect/**` — the evaluated product; repairing it is the fix-agent's job in a later sprint, and an inline repair invalidates the grade
- `.github/workflows/**` — workflow/step wiring is T1/T8/T9
- `test/harness/pins.json` — T2 is the sole pinned authority
- `test/harness/runtime/**` — T3's runtime; call it, never edit it
- anything not listed in writeAllowed

--------------------------------------------------------------------------------
BOUNDARIES (✅ Always / ⚠️ Ask First)
--------------------------------------------------------------------------------

✅ Always:
- Record what was actually installed (`observed_cli_version`) next to what was requested, and refuse to grade when they differ.
- Keep the install step keyless and the model step keyed; assert the env-absence in the keyless step.
- Run the four graded invocations in fresh work directories the case loader created; never twice in one directory.
- Capture before/after fixture manifests so a mutation is attributable.

⚠️ Ask First:
- Adding `--max-turns` or any flag not named in the PRD's adapter table beyond the recorded stance.
- Treating a newly discovered `system/init` shape as the plugin gate (the gate needs `pixel-perfect` under plugins).
- Any change to the case manifests in `test/harness/kit` (T4 owns them).

--------------------------------------------------------------------------------
DELIVERABLE
--------------------------------------------------------------------------------

- `test/harness/adapters/claude-code.mjs` (NEW): install (pinned/newest), marketplace+plugin install for checkout, `plugin details` list, the four graded invocations, `InstallationIdentity` assembly and digest verification.
- `test/harness/adapters/registry.mjs` (NEW): harness → adapter lookup with an explicit "adapter absent" result so T10 can render `could-not-run` honestly.
- `tests/sprint-01/grd-02-four-grades.test.mjs` (NEW), `tests/sprint-01/jrn-planted-and-twin.test.mjs` (NEW): the two locked flow modules.

--------------------------------------------------------------------------------
CODE PATTERN
--------------------------------------------------------------------------------

Node ESM modules under `test/harness/` matching the repo's test style (`test/gate.test.mjs`, `test/adapters.test.mjs`). The adapter exposes `describe()` (install steps + identity expectations) and `run(check)` (one graded invocation) and imports the runtime from `test/harness/runtime/*` — never spawns a process itself.

--------------------------------------------------------------------------------
DESIGN
--------------------------------------------------------------------------------

none — no UI surface.

--------------------------------------------------------------------------------
AGENT INSTRUCTIONS (TDD Flow)
--------------------------------------------------------------------------------

## FOR EACH ACCEPTANCE CRITERION:

### RED PHASE
  READ:   The AC, the adapter contract table, the recorded 2026-10-06 probe facts, pins.json from T2
  WRITE:  ONE failing flow module
  RUN:    the AC's VERIFY command
  VERIFY: fails with `.red`; for AC-1 also run the `question-in-ask-nothing` fixture and require `fail`
  RETURN: { phase: "RED", test_file, test_function, failure_output }

### GREEN PHASE (after orchestrator VERIFY_RED passes)
  READ:   The failing assertion and the adapter contract table
  WRITE:  The smallest adapter that satisfies it (install → load proof → list → four invocations → identity)
  RUN:    the AC's VERIFY command
  VERIFY: exits 0; identity fields present; the plugin gate asserted from `system/init`
  RETURN: { phase: "GREEN", files_changed, test_output }

### REFACTOR PHASE (after orchestrator VERIFY_GREEN passes)
  READ:   The adapter you wrote
  WRITE:  De-duplicate the five invocation descriptions into one table; behaviour frozen
  VERIFY: Both flow modules still pass
  RETURN: { phase: "REFACTOR", files_changed, still_passing }

--------------------------------------------------------------------------------
READING LIST (max 5 files — canonical pattern first)
--------------------------------------------------------------------------------

1. `test/adapters.test.mjs` [PRIMARY PATTERN] — how this repo tests adapter surfaces.
2. `.spec/prds/harness-eval-framework/09-technical-requirements/02-system-components.md` — `claude-code-adapter`, `invocation-guard`, `question-boundary`.
3. `.spec/prds/harness-eval-framework/09-technical-requirements/03-data-schema.md` — `InstallationIdentity`, `FirstQuestionCase`, `StatusCase`, `VerifyPair`.
4. `.spec/prds/harness-eval-framework/04-uc-grd.md` — UC-GRD-02 / UC-GRD-04 / UC-GRD-05 acceptance criteria.
5. `INSTALL.md` — the published-mode install mechanism this adapter binds to the resolved release revision.

--------------------------------------------------------------------------------
ORCHESTRATOR VERIFICATION PROTOCOL
--------------------------------------------------------------------------------

1. VERIFY_RED: both `.red` artifacts exist; the grd-02 `.red` must show the question-in-ask-nothing fixture flipping to `fail`.
2. VERIFY_GREEN: both modules exit 0.
3. VERIFY_IDENTITY: read the result artifact — every claude-code cell has a dotted `observed_cli_version` and a 64-hex `observed_plugin_manifest_sha256`; no `MISSING`, `null` or empty.
4. VERIFY_GATE: the cell's `plugin_load_evidence` cites the `system/init` plugin list.
5. VERIFY_KEYLESS: grep the workflow — no `ANTHROPIC_API_KEY` on install/list steps.
6. VERIFY_SCOPE: `git diff --name-only` ⊆ writeAllowed.

--------------------------------------------------------------------------------
EVIDENCE GATES (fast/cheap first — fail fast)
--------------------------------------------------------------------------------

Gate 1: RED evidence for both ACs.
Gate 2: One test per AC, matched by the flow name pattern.
Gate 3: Both flow modules exit 0.
Gate 4: Seeded evidence — the pinned cell's `status` reply states `web-desktop` with nonzero inventory counts matching `StatusCase`; a generic acknowledgement fails.
Gate 5: Identity — observed version and manifest digest present and equal to the installed payload.
Gate 6: Plugin gate — `system/init` lists `pixel-perfect`; a run without it is `could-not-run`, proven by a negative fixture.
Gate 7: Scope compliance.

--------------------------------------------------------------------------------
AGENT ASSIGNMENT
--------------------------------------------------------------------------------

- **Implementer:** `ai-tooling-implementer` — harness adapter code for Claude Code (CLI flags, plugin manifest, install paths) is this role's domain per AGENTS.md.
- **Reviewer:** `ai-tooling-reviewer` — adapter review: ecosystem patterns, TDD compliance, plugin contracts.
- **Planner:** `github-agentic-workflow-planner` (no `ai-tooling-planner` exists in the roster).

--------------------------------------------------------------------------------
OUT OF SCOPE
--------------------------------------------------------------------------------

- The other five adapters (T10 renders them as `could-not-run` with named reasons).
- Mapping raw stdout to `CanonicalEvent` and the per-version mapping validator (T6).
- Deciding the verdicts (T7) and recording the result artifact (T8).
- Changing the fixture kit or case manifests (T4).
- Repairing the plugin if a grade fails — that is the fix-agent job in a later sprint.

--------------------------------------------------------------------------------
CONTEXT (read if unclear)
--------------------------------------------------------------------------------

**Current state:** no adapter, no install path, no plugin-load proof exists in the repo; claude-code has never been invoked from a workflow here.
**Gap:** The framework's only live harness has no code that installs it reproducibly or proves the plugin loaded.

--------------------------------------------------------------------------------
REVIEW CRITERIA (for ai-tooling-reviewer)
--------------------------------------------------------------------------------

Must pass (≤5, evidence-gate-backed):
- Install pins the resolved version and sets `DISABLE_AUTOUPDATER=1` for both tracks.
- The plugin gate reads `system/init`; a run without `pixel-perfect` in plugins is `could-not-run`.
- `InstallationIdentity` carries all eight fields, including `observed_plugin_manifest_sha256` and `loaded_plugin_root`.
- Stance recorded as `dontAsk` + `--add-dir`; zero `bypassPermissions`.
- Denied required reads are `fail`; a clean exit alone never passes.

Should verify (≤5, judgment):
- The command list asserts presence of the 11 names, not a count.
- Fresh work directory per invocation; no reuse.
- `--max-turns` only as a backstop, never as the question signal.
- Both untested plugin commands are marked untested until a run proves them.

Verdict: [APPROVED | NEEDS_FIXES]

--------------------------------------------------------------------------------
DEPENDENCIES
--------------------------------------------------------------------------------

Depends on: T2 (pins + schemas + lookup: exact CLI version, provider/model, credential env name, `CanonicalEvent` field names), T3 (guard, `InvocationCapture`, `PermissionStance`, grade-writer this adapter calls), T4 (the fixture kit and case manifests the four graded invocations address)

Blocks: T6 (maps this adapter's stdout), T10 (its cell wiring), T11 (its captures become the qualified negatives).

Not a dependency: T7/T8 — this task's flow output feeds them, which is `available_after` on the flow obligation, not a code edge.

--------------------------------------------------------------------------------
NOTES
--------------------------------------------------------------------------------

- T5 owns no flow: both its ACs are non-primary assertions of flows T7 owns. No `integration_obligations` entry is written here.
- The `claude plugin marketplace add` / `plugin install` pair is untested by the PRD's own admission. Do not launder an untested command as verified: prove the loaded content manifest, and let a mismatch be `could-not-run`.
- Published mode is accepted at dispatch and recorded, but this sprint grades checkout only; published cells read `could-not-run` naming release resolution.

<!-- REQUIREMENT-CONTRACT v1 -->
<!--
{
  "version": "1",
  "task_id": "T5",
  "task_type": "FEATURE",
  "tdd_mode": "red_first",
  "why_required": "serves FLOW-GRD-02-FOUR-GRADES and FLOW-JRN-PLANTED-AND-TWIN: the claude-code adapter is what produces the four graded invocations and the planted/clean verify pair those two flows read",
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
    "seed/verify-reports-artifact": {
      "entrypoint": "gh run download <RUN_ID> -n harness-eval-verify-reports-<RUN_ID>-1",
      "description": "reports/verify-button-drift.json and reports/verify-clean.json",
      "seed_method": "cli"
    },
    "seed/streams/question-in-ask-nothing": {
      "entrypoint": "splice of real bytes only: USER_CHOICE from the must-ask capture inserted into the real verify stream, provenance hashes recorded",
      "description": "the GRD-02 red fixture",
      "seed_method": "recorded_external"
    },
    "seed/streams/clean-verify-pass": {
      "entrypoint": "real captured clean-verify invocation from the same qualification run",
      "description": "grader-passing capture fixture",
      "seed_method": "recorded_external"
    },
    "seed/case/verify-button-drift": {
      "entrypoint": "test/harness/kit/project fresh copy + overlays/button-drift by the case loader",
      "description": "planted invocation dir with declared report path",
      "seed_method": "migration_fixture"
    },
    "seed/case/verify-clean": {
      "entrypoint": "same kit copy without overlay, separate fresh dir",
      "description": "clean invocation dir",
      "seed_method": "migration_fixture"
    }
  },
  "guardrails": {
    "write_allowed": [
      "test/harness/adapters/claude-code.mjs",
      "test/harness/adapters/registry.mjs",
      "tests/sprint-01/grd-02-four-grades.test.mjs",
      "tests/sprint-01/jrn-planted-and-twin.test.mjs"
    ],
    "write_prohibited": [
      "plugins/pixel-perfect/**",
      ".github/workflows/**"
    ]
  },
  "requirements": [
    {
      "id": "AC-1",
      "type": "acceptance_criterion",
      "primary": false,
      "flow_ref": "FLOW-GRD-02-FOUR-GRADES",
      "title": "Four grades per graded cell: command_list, status, verify, question_before_expensive_work \u2014 ask-nothing enforced, must-ask stops unanswered",
      "description": "GIVEN a claude-code cell installed at the resolved version with the plugin proven loaded on a real hosted runner WHEN the adapter runs the command list, the status check, the planted and clean verify invocations and the must-ask init probe THEN the cell carries four verdicts graded from files and event stream with zero question events in the ask-nothing streams and exactly one unanswered question in the must-ask probe",
      "test_tier": "integration",
      "verification_service": "GitHub Actions harness-eval workflow + real harness CLIs + harness-smoke keys",
      "verify": "node --test tests/sprint-01/grd-02-four-grades.test.mjs --test-name-pattern FLOW-GRD-02-FOUR-GRADES",
      "test_file": "tests/sprint-01/grd-02-four-grades.test.mjs",
      "test_function": "FLOW-GRD-02-FOUR-GRADES",
      "positive_example": "Fixture pair: claude-code pinned cell with four pass verdicts where list/status/verify streams contain zero question events and the init prefix stops at the first USER_CHOICE with no answer sent \u2014 module exits 0.",
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "maps_to_ac": null,
      "red_input": "On base main the module cannot find any grade record (no test/harness exists) and exits 1 writing .red; locally, a fixture where the status check's stream contains a question flips verdict to fail.",
      "red_proof": ".tmp/sprint-01-verification/grd-02-four-grades.json.red",
      "scenario": {
        "tier": "e2e-automated",
        "topology_note": "real claude-code CLI executes list/status/planted-verify/clean-verify/must-ask-init; keyless grader reads files plus CanonicalEvent streams; replay runs the same grader over archived real captures",
        "test_tier": "e2e",
        "negative_control": {
          "would_fail_if": [
            "a question event appeared in any list/status/verify stream and the grader still passed that check (an empty question count must fail ask-nothing)",
            "the must-ask probe graded pass with zero question events or with an answer delivered",
            "a generic status reply passed the status check",
            "verdicts were derived from exit codes instead of streams"
          ]
        },
        "evidence": {
          "forms": [
            "CanonicalEvent streams with original_event bytes and offsets",
            "grade records per check",
            "archived real captures with provenance hashes"
          ],
          "examples": [
            "four check_ids with verdicts for claude-code/pinned",
            "question event count 0 in ask-nothing streams",
            "USER_CHOICE count 1, answers sent 0 in must-ask"
          ],
          "required_capture": "raw captured stdout per invocation with byte offsets, capture hashes, grader evidence citations"
        },
        "build_proof": {
          "range": "anything that proves the four verdicts come from captured files and streams of real invocations",
          "examples": [
            "per-check grade record citing a capture hash and stream offsets"
          ]
        },
        "cases": [
          {
            "start_ref": "seed/live-dispatch-run",
            "action": {
              "actor": "workflow",
              "steps": [
                "adapter runs the five real invocations via claude -p with stream-json",
                "grader assigns four verdicts from files and streams"
              ]
            },
            "end_state": {
              "must_observe": [
                "claude-code/pinned cell shows all 4 checks \"pass\"",
                "status reply states platform \"web-desktop\", seeded phase, gate state, nonzero inventory counts matching StatusCase",
                "must-ask capture contains exactly 1 valid USER_CHOICE and 0 answer deliveries"
              ],
              "must_not_observe": [
                "any question event in list/status/verify streams",
                "a scripted answer consumed by any first check",
                "an empty checks array or null reason on a pass verdict"
              ]
            }
          },
          {
            "start_ref": "seed/streams/question-in-ask-nothing",
            "action": {
              "actor": "runner",
              "steps": [
                "node tests/sprint-01/flow-runner.mjs grd-02 --fixture question-in-ask-nothing --expect red"
              ]
            },
            "end_state": {
              "must_observe": [
                "grader returns \"fail\" citing the question event offset",
                ".red records the spliced capture's \"provenance hashes\""
              ],
              "must_not_observe": [
                "pass on a stream containing a question",
                "synthetic event JSON with no capture provenance"
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
      "flow_ref": null,
      "title": "Journey: planted-and-clean verify pair through a real dispatched run, from oracle precheck to summary links",
      "description": "GIVEN a dispatched harness-eval run on the hosted runner with the claude-code cells live WHEN the run completes and the maintainer downloads the verify-reports artifact THEN the planted report names atoms/Button/default with defect-detected and the clean twin reports clean_project_failed false, bound to distinct invocation ids of the same live run",
      "test_tier": "e2e",
      "verification_service": "GitHub Actions harness-eval workflow + real harness CLIs + harness-smoke keys",
      "verify": "node --test tests/sprint-01/jrn-planted-and-twin.test.mjs --test-name-pattern FLOW-JRN-PLANTED-AND-TWIN",
      "test_file": "tests/sprint-01/jrn-planted-and-twin.test.mjs",
      "test_function": "FLOW-JRN-PLANTED-AND-TWIN",
      "positive_example": "One real dispatched run whose artifact chain satisfies: oracle exited 1 on planted with drifted[].key atoms/Button/default and 0 on clean, planted report defect-detected at its declared path, clean report clean, both linked from the summary \u2014 module exits 0.",
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "maps_to_ac": null,
      "red_input": "Base main: the journey cannot start (no workflow to dispatch, no oracle wrapper) \u2014 module exits 1 with .red.",
      "red_proof": ".tmp/sprint-01-verification/jrn-planted-and-twin.json.red",
      "scenario": {
        "tier": "e2e-automated",
        "topology_note": "one live dispatch drives planted verify and clean twin through the real CLI on the runner; maintainer reads both reports; replay revalidates the downloaded pair",
        "test_tier": "e2e",
        "negative_control": {
          "would_fail_if": [
            "the planted report went missing from an otherwise-evaluable run and the cell still passed \u2014 fail report-missing",
            "the journey claimed execution from a cached replay instead of a live run \u2014 a static replay must grade not-executed, never pass"
          ]
        },
        "evidence": {
          "forms": [
            "verify-reports pair",
            "live run result cells",
            "oracle precheck transcript"
          ],
          "examples": [
            "planted: atoms/Button/default defect-detected; clean: clean_project_failed false"
          ],
          "required_capture": "live run_id/attempt binding, both invocation captures, maintainer's gate-step-13 reading"
        },
        "build_proof": {
          "range": "anything that proves both reports came from one live run's distinct invocations",
          "examples": [
            "two invocation ids in one run's verify-reports artifact"
          ]
        },
        "cases": [
          {
            "start_ref": "seed/live-dispatch-run",
            "action": {
              "actor": "maintainer",
              "steps": [
                "dispatch",
                "watch to completion",
                "download verify-reports",
                "read the defect name and twin result"
              ]
            },
            "end_state": {
              "must_observe": [
                "planted names \"atoms/Button/default\" with \"defect-detected\"",
                "clean twin clean_project_failed == false",
                "both bound to distinct `invocation_id`s of the same live run"
              ],
              "must_not_observe": [
                "pass claimed from a replay with no live run",
                "either report absent"
              ]
            }
          },
          {
            "start_ref": "seed/verify-reports-artifact",
            "action": {
              "actor": "runner",
              "steps": [
                "delete planted report from a copied artifact",
                "node tests/sprint-01/flow-runner.mjs jrn-planted-twin --fixture missing-planted-report --expect red"
              ]
            },
            "end_state": {
              "must_observe": [
                "validator downgrades the check to fail \"report-missing\" (not could-not-run, not pass)"
              ],
              "must_not_observe": [
                "the missing report excused as could-not-run report-unavailable",
                "a silent pass",
                "no report-missing downgrade recorded for the missing report"
              ]
            }
          }
        ]
      }
    },
    {
      "id": "TC-1",
      "type": "test_criterion",
      "description": "The claude-code pinned cell grades four separate check verdicts from files and event stream",
      "verify": "node --test tests/sprint-01/grd-02-four-grades.test.mjs --test-name-pattern FLOW-GRD-02-FOUR-GRADES",
      "maps_to_ac": "AC-1"
    },
    {
      "id": "TC-2",
      "type": "test_criterion",
      "description": "The ask-nothing streams contain zero question events while the must-ask probe stops at exactly one unanswered question",
      "verify": "node --test tests/sprint-01/grd-02-four-grades.test.mjs --test-name-pattern FLOW-GRD-02-FOUR-GRADES",
      "maps_to_ac": "AC-1"
    },
    {
      "id": "TC-3",
      "type": "test_criterion",
      "description": "The four-grades flow module requires each claude-code cell to record a dotted observed CLI version and a 64-hex plugin manifest digest",
      "verify": "node --test tests/sprint-01/grd-02-four-grades.test.mjs --test-name-pattern FLOW-GRD-02-FOUR-GRADES",
      "maps_to_ac": "AC-2"
    },
    {
      "id": "TC-4",
      "type": "test_criterion",
      "description": "The four-grades flow module finds no harness API key on an install, marketplace, plugin-install or command-list step",
      "verify": "node --test tests/sprint-01/grd-02-four-grades.test.mjs --test-name-pattern FLOW-GRD-02-FOUR-GRADES",
      "maps_to_ac": "AC-1"
    }
  ]
}
-->
</details>

## Handoff

```json
{
  "task": "T5",
  "commit_sha": "5465703879e58a5fb53ba4947f5492ccc9226c5e",
  "done": "PROVISIONAL SUBSTITUTE-AUTHOR DRAFT — unapproved reconstruction, not original-author testimony or a completion claim. Saved landing records candidate 5465703879e58a5fb53ba4947f5492ccc9226c5e merged as 51c0f4ee7594efc0fd26463fe52c611f895cee81 after cycle 3/revision 0 review against frozen base cf84326a0cb85ebaf0eb9bfb8ddf2cb0ae5e6274. The landed four-file change adds the Claude Code adapter and registry plus adapter checks: exact-version install plans with auto-update disabled; keyless checkout marketplace/plugin loading and command inventory; guarded headless invocations with capture and identity checks; status fact comparison using platform sections and COMPOSE-to-screens mapping; question grading; and verify-report path/invocation validation. These are source-inspected mechanisms and retained review observations. Real hosted four-grade and provider-produced planted/clean journey acceptance remain unproven.",
  "deviations": [
    "This draft was reconstructed by a substitute from the exact candidate and retained evidence. Registered original implementer session 11347c19-c47d-4d1 is historical/unreachable in this recovery context. No substitute-author authorization, original final report, native response receipt, record-handoff operation or completion authority is supplied by this draft.",
    "The frozen review defers AC-1 and FLOW-GRD-02-FOUR-GRADES on T6/T7/T9. It records AC-2 and both command checks PASS while retaining OPEN U-T5-3 and logs that explicitly report the live journey and harness verify bodies not-executed. Preserve those historical rows without promoting them to hosted acceptance.",
    "The question boundary uses closed stdin rather than a stream-driven first-question stop; answers_delivered=0 and answers_possible=false are assigned by the adapter. No keyed must-ask capture or actual stop-at-first-question observation is established by the inspected candidate.",
    "Persistent RED copies remain in T5/evidence/c2-red-artifacts. The review records absent declared .tmp RED paths, drifting source line references and no fresh cycle-3 .red capture; retained mutation results are historical supporting evidence, not a replacement RED execution by this reconstruction."
  ],
  "concerns": [
    "BLOCKER — real integration acceptance: no exact-candidate hosted run reviewed here demonstrates four passing graded checks, the real question splice, or both provider-produced verify reports. Retained logs show a local CLI/pin mismatch, missing-key refusals and a historically unregistered remote workflow. Those environment observations are historical and have not been refreshed.",
    "BLOCKER — synthetic core proof remains: grd-02 constructs observed CLI identity, plugin-load text, a repeated-f revision, hand-authored event streams, model_request_count=1, exit 0 and verify report bodies, then obtains positive grades from them. The journey module also contains canned modelGh responses and uses local runId 4242 for the T5 pair. Real filesystem writes/hashes do not turn those synthetic inputs into real provider or GitHub evidence. These controls cannot satisfy the task's integration/e2e contract or the no-stub completion rule.",
    "BLOCKER — report producer seam: readVerifyReport requires the case-declared path and a report invocation_id equal to a random adapter id. At this candidate promptFor sends only the slash command and platform argument; materialize copies the fixture/overlay, and runCheck passes no adapter report path or invocation id to the CLI. The inspected product verify workflow supplies no matching report-envelope instruction. A real producer path and bound pair are therefore unestablished; hand-written test report bodies bypass this seam.",
    "Provider/session qualification gap: describe reports the pin's anthropic/opus selection, but gradedArgv has no model selection and runCheck does not apply that pin to the child command. The runtime's generated session_id is capture metadata and is not passed as a native CLI session argument. runCheck inherits the supplied environment and isolates CLAUDE_CONFIG_DIR only when its caller supplies one; it does not itself establish isolated HOME or provider-login state. No native session/provider-selection proof is claimed.",
    "Authorship blocker: this unapproved substitute draft cannot be recorded or used to complete T5 without the separate owner-authorized substitute envelope and native response provenance required by Brain's handoff contract. Saved T5 status remains landed with handoff delivery pending."
  ],
  "findings": [
    "Historical cycle-3 APPROVED disposition: F-T5-1/2/3/4/8 are FIXED. Retained review describes status gate/inventory comparisons, question detection, report binding, retained RED evidence and product-vocabulary/platform parsing; this reconstruction did not rerun those checks or independently approve the implementation.",
    "Preserve F-T5-5/6/7/9/10 as ADVISORY in the saved review. F-T5-5's untested-refusal wording is stale relative to the new negative control and review C11 kill; F-T5-6 describes an older redundant digest branch absent from the inspected comparison; F-T5-9 remains ADVISORY despite summary/E-06 reporting its phase bug fixed. F-T5-7's assembled rejected permission token remains a negative-control visibility concern. F-T5-10's four incorrect scripts/gate.mjs citations remain; the table is actually plugins/pixel-perfect/scripts/gate.mjs:43.",
    "Preserve OPEN U-T5-1/2/3/4/5/6: hosted grades; real question-splice ownership; live report bodies; RED line drift; the shared journey file byte-identity checklist conflict; and persistent RED/cycle-3 RED provenance. U-T5-3's prose still says PARTIAL even though the AC-2 row is PASS. These inconsistencies require disposition, not silent cleanup in a substitute draft.",
    "Current read-only checks matched the landing's bundle/context digests, all referenced bundle members, all 20 cycle-3 evidence artifact digests and nine inspected source files to the approved candidate. Historical records report 17/17 and 11/11 checks, 28/28 two-module tests, 51/51 sprint-lane tests, plugin validation and 15/15 mutation kills. Those results were inspected, not executed by this reconstruction, and do not prove the missing hosted behaviors."
  ],
  "scope_impact": [
    {
      "target": "T5",
      "found": "Landed adapter mechanisms coexist with synthetic positive proof, an unestablished report producer path, unapplied model selection and unqualified native-session isolation; original handoff remains pending.",
      "change": "Keep this draft provisional and preserve the recorded landing. Route the concrete source/proof gaps for governed review and bounded repair or qualification; recording/completion additionally requires owner substitution authorization and native provenance. This draft grants neither."
    },
    {
      "target": "T7",
      "found": "The live planted/clean journey and provider-generated report bodies were explicitly not-executed in the retained logs, despite historical green command/AC-2 rows.",
      "change": "Require an exact-candidate hosted run with both case-declared report paths, distinct matching invocation ids, planted atoms/Button/default detection, a passing clean twin and retained artifact linkage before claiming integrated journey acceptance."
    },
    {
      "target": "T11",
      "found": "Question shapes and a must-ask positive grade are hand-authored local controls; the retained real-byte question-in-ask-nothing splice is not produced.",
      "change": "Retain U-T5-2 and require the qualified keyed must-ask capture, real-byte splice provenance and observed unanswered first-question behavior. Do not treat the synthetic detector control as that proof."
    },
    {
      "target": "GATE:FLOW-GRD-02-FOUR-GRADES",
      "found": "Frozen cycle 3 explicitly deferred the flow and AC-1 on T6/T7/T9; command exit 0 includes not-executed core legs.",
      "change": "Keep the integrated acceptance obligation unresolved until its actual current proof is supplied through the governed path. Later dependency landings alone do not establish the missing observations."
    },
    {
      "target": "ROADMAP",
      "found": "The saved review retains advisory/status inconsistencies and U-T5-5's byte-identity checklist conflict; substitute authorship has not been approved.",
      "change": "Have the orchestrator disposition these items without changing historical evidence or inferring sprint completion. This recovery writes only the draft and evidence notes."
    }
  ],
  "feedback": [
    "Use T5.evidence.md beside this file for candidate/base/bundle identities, source line support, historical-result boundaries and reconstruction checks. No tests, workflow dispatch, provider calls, runtime launches, product edits, Git lifecycle, receipts or sprint-state writes were performed for this draft.",
    "Source inspection qualifies the retained E-16 claim 'No stub of any kind': synthetic identity/capture/report positives and canned GitHub seams remain visible in the actual tests. Preserve that discrepancy as a blocker to real-service acceptance rather than rewriting the historical review or claiming the feature complete."
  ]
}
```
