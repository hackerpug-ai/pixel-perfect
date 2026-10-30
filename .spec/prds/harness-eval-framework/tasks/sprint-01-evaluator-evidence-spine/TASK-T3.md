# TASK-T3 — Build shared runtime: invocation-guard, `InvocationCapture`, `PermissionStance`, and grade-writer

> Status: ✅ Completed

Commit: 48ed78e276bdf48c0580d5dca2f9ac57cc7d85c4
> Assignee: ai-tooling-implementer
> Priority: P1
> Points: 5
> Type: FEATURE
> Planner: github-agentic-workflow-planner
> Proposed By: github-agentic-workflow-planner + evals-planner
> TDD_MODE: red_first
> RED_GREEN_REQUIRED: true

planner=github-agentic-workflow-planner | implementer=ai-tooling-implementer | reviewer=ai-tooling-reviewer

**why_required:** serves FLOW-GRD-06-MISSING-KEY and FLOW-GRD-03-FILES-AND-STREAM: the guard, the capture layer and the grade writer are the runtime those two flows replay, and without them neither flow can produce evidence at all

**Depends on:** T2 (the pins/schemas/lookup module this runtime imports for harness identity, credential env names, and CanonicalEvent shapes)
**Blocks:** T5 (the claude-code adapter calls the guard, capture and grade writer), T6 (stream mapping consumes `InvocationCapture` output), T10 (fail-closed cells are built on the guard's refusal path)

## What this does

Builds the shared per-harness runtime every adapter calls: a guard that refuses to start a model call without a credential or a recorded permission stance, a capture layer that records stdout by byte offset with a termination kind, a recorded `PermissionStance`, and a grade writer whose read-back must match before a verdict exists.

## Why

UC-GRD-06's promise is that a missing key cannot be read as a pass, and UC-GRD-03's is that a grade comes from files and the event stream — never the exit code. Both are properties of this runtime, not of any single adapter: without it each adapter would invent its own refusal, its own capture and its own write path, and the first one to grade exit 0 as success would silently satisfy the gate.

## How to verify

- A keyless invocation refuses with `could-not-run` / `missing-api-key` before any model request, while a paired authenticated invocation in the same run grades `pass` (the guard fires on absence, not unconditionally).
- A recorded stream where a required read was denied and the process exited 0 grades `fail`, not `pass`.
- `node --test tests/sprint-01/grd-06-missing-key.test.mjs --test-name-pattern FLOW-GRD-06-MISSING-KEY` and `node --test tests/sprint-01/grd-03-evidence.test.mjs --test-name-pattern FLOW-GRD-03-FILES-AND-STREAM` exit 0.

## Scope

`write_allowed`: `test/harness/runtime/` (NEW), `test/harness/lib/**` (NEW), `tests/sprint-01/grd-06-missing-key.test.mjs` (NEW), `tests/sprint-01/grd-03-evidence.test.mjs` (NEW), `tests/sprint-01/flow-runner.mjs` (shared lane, coordinate marker). It owns no flow, so it carries no integration obligation.

<details>
<summary>▸ Full agent specification (TASK-TEMPLATE v5.2 — required reading for implementer + reviewer)</summary>

```
TASK_TYPE:  FEATURE
PRIORITY:   P1
POINTS:     5
AGENT:      planner=github-agentic-workflow-planner | implementer=ai-tooling-implementer | reviewer=ai-tooling-reviewer

RUNTIME_COMMANDS:
  test:      node --test tests/sprint-01/grd-06-missing-key.test.mjs tests/sprint-01/grd-03-evidence.test.mjs
  lint:      node scripts/validate-plugin.mjs

PROGRESS:   AC-1 none · AC-2 none · 0/2 complete
```

--------------------------------------------------------------------------------
OUTCOME (1 sentence, ≤30 words — observable success)
--------------------------------------------------------------------------------

Every model call goes through one guard that refuses keyless or stance-less starts, one capture that records byte offsets and a termination kind, and one writer whose read-back must match before a verdict exists.

--------------------------------------------------------------------------------
🚫 CRITICAL CONSTRAINTS (Never tier — read before acting)
--------------------------------------------------------------------------------

- NEVER treat exit code 0, a Codex `type: error` item, a Claude Code `subtype: success`, or `is_error: false` as a verdict. The verdict comes from evidence (03-data-schema `HarnessGrade`, 02-system-components `invocation-guard`).
- NEVER let `bypassPermissions` appear in any stance, adapter call, or test fixture. The approved stance is `--permission-mode dontAsk` plus `--add-dir` of the plugin root; it is recorded before the first model call.
- NEVER spawn a model process without closing stdin (`</dev/null`) and wrapping it in a timeout. A hung CLI must become `could-not-run`, never a silent pass.
- NEVER write a grade in place. Temp file in the grade directory → fsync → rename → read back; a mismatch or partial file is `could-not-run` (02-system-components `grade-writer`).
- NEVER hold or read an API key in the writer or in any install/list path; the runtime passes the binding to the model subprocess only.

--------------------------------------------------------------------------------
DONE WHEN
--------------------------------------------------------------------------------

- [ ] `test/harness/runtime/` exposes the guard, capture, stance and writer as importable modules with no model dependency — maps to AC-1 / AC-2
- [ ] The guard refuses with `missing-api-key` when the harness binding and every permitted fallback are absent, and records zero model requests before the refusal — maps to AC-2 (TC-1, TC-2)
- [ ] The guard refuses when no `PermissionStance` is recorded for that harness — maps to AC-2
- [ ] `InvocationCapture` records incremental stdout with byte offsets, original bytes, hashes, before/after fixture manifests, and `termination_kind: native|boundary-stop|timeout|unexpected` — maps to AC-1
- [ ] A denial visible in a captured stream yields `fail` even when `process_exit_code` is 0, with the denial offset cited — maps to AC-1
- [ ] The writer's read-back compares verdict, harness, version, track and check id, and a mismatch yields `could-not-run` — maps to AC-1
- [ ] Both flow modules pass: `grd-03-evidence` and `grd-06-missing-key`
- [ ] `git diff --name-only` ⊆ `GUARDRAILS.write_allowed`

--------------------------------------------------------------------------------
BACKGROUND
--------------------------------------------------------------------------------

The PRD splits one runtime into four named components ([02-system-components](../../09-technical-requirements/02-system-components.md)): `invocation-guard`, `InvocationCapture`/`PermissionStance`, `grade-writer`, and the per-harness adapters that use them. This task owns the first three; the adapters (T5, T10) own the fourth. The capture's termination model is load-bearing: an intentional question-boundary stop is *not* native completion, and only a boundary-stop may be graded without a native `session_ended` (03-data-schema `InvocationCapture / PermissionStance`).

--------------------------------------------------------------------------------
SPECIFICATION
--------------------------------------------------------------------------------

**objective:** Ship one shared runtime — guard, capture, stance, writer — so that every adapter's model call has a single refusal path, a single evidence record, and a single write path.

**success_state:** With `ANTHROPIC_API_KEY` and every permitted fallback unset, the guard refuses `could-not-run`/`missing-api-key` and the capture contains zero model-request events; with the key present, the same code path proceeds and the paired authenticated cells grade. A captured stream showing a denied required read grades `fail` beside a raw `process_exit_code` of `0`.

Component contracts fixed by the PRD (do not redesign):

| Component | Required behaviour | Source |
|---|---|---|
| invocation-guard | refuses on missing harness key → `could-not-run`/`missing-api-key`; refuses when no stance is recorded; closes stdin; wraps in `timeout`; uses a streaming output format so a question is visible before exit; namespaces the saved session id by harness; does not pass `grok --trust` in any keyed step | 02-system-components `invocation-guard` |
| PermissionStance | recorded before any model call; approved candidate is `--permission-mode dontAsk` + `--add-dir <plugin root>`; `bypassPermissions` rejected; an unrecorded stance blocks the run; the assembled Bash allow list is not evidence that reads succeed | 02-system-components `claude-code-adapter`; owner decision (approved) |
| InvocationCapture | stdout captured incrementally by byte offset; original bytes; final reply when available; hashes; timeout; invocation id; before/after fixture manifests; `termination_kind` + boundary offset + `prefix_complete` + raw status | 03-data-schema `InvocationCapture / PermissionStance` |
| grade-writer | one grade file per harness × version track × install mode × check; temp → fsync → rename → read back; read-back must match verdict, harness, version, track, check id; mismatch/partial = `could-not-run`; holds no key | 02-system-components `grade-writer` |
| Verdict precedence | aggregate `could-not-run` before `fail` before `pass`, preserving every constituent result and block reason | 03-data-schema `HarnessGrade` |

`InvocationCapture` is deliberately not the stream grader: it records bytes and provenance; mapping bytes to `CanonicalEvent` is T6's job. Keep the seam a plain JSON record so T6 can consume it without importing your process launcher.

--------------------------------------------------------------------------------
ACCEPTANCE CRITERIA (TDD Beads — ordered happy-path first)
--------------------------------------------------------------------------------

AC-1: Evidence-not-exit-code grading — a denied read fails on exit 0, citations carry offsets
  GIVEN: a real captured claude-code stream in which a required read was denied and the process exited 0
  WHEN:  the runtime's capture and grade writer record that invocation and the artifact is read back
  THEN:  the verdict is `fail` with `denied_tool_call` and the denial offset cited, while `process_exit_code` stays the raw 0

  FLOW_REF:              FLOW-GRD-03-FILES-AND-STREAM
  TEST_TIER:             integration
  VERIFICATION_SERVICE:  GitHub Actions harness-eval workflow + real harness CLIs + harness-smoke keys
  SURFACE_POLICY:        .spec/e2e-policy/sprint-01/artifact-only-read.json
  TDD_STATE:             none
  TEST_FILE:             tests/sprint-01/grd-03-evidence.test.mjs
  TEST_FUNCTION:         FLOW-GRD-03-FILES-AND-STREAM
  VERIFY:                node --test tests/sprint-01/grd-03-evidence.test.mjs --test-name-pattern FLOW-GRD-03-FILES-AND-STREAM

  RED_INPUT:    Base main: no capture or writer exists, so the module exits 1 with `.red`. Behaviour RED: a verdict that merely mirrors the exit-code mapping (pass on exit 0 with a denied-read stream) makes the module exit 1 — the negative fixture is the recorded deny-under-default-mode stream captured during T5 qualification.
  RED_PROOF:    .tmp/sprint-01-verification/grd-03-evidence.json.red
  POSITIVE_EXAMPLE: A controls row `exit0-denied-read fail denied_tool_call` next to a raw `process_exit_code` of 0, with every graded check citing at least one evidence path — module exits 0.

  SCENARIO_SUMMARY: The downloaded result artifact of a real run → `jq` reads each claude-code/pinned check's `source` and `process_exit_code`, plus the `exit0-denied-read` control → four checks cite `files-and-event-stream` and the denial still reads `fail`.

  NOTE: this AC is not the [PRIMARY] owner of FLOW-GRD-03-FILES-AND-STREAM (T6 owns it). It asserts the runtime half — capture offsets and writer read-back — that the flow needs.

AC-2: Missing credential fails closed before any model request
  GIVEN: a workflow step in which `ANTHROPIC_API_KEY` and every permitted fallback credential store are absent
  WHEN:  the guard-evaluated invocation runs in the same workflow as authenticated invocations
  THEN:  the keyless invocation records `could-not-run`/`missing-api-key` with zero model-request events, and the authenticated cells still grade `pass`

  FLOW_REF:              FLOW-GRD-06-MISSING-KEY
  TEST_TIER:             integration
  VERIFICATION_SERVICE:  GitHub Actions harness-eval workflow + real harness CLIs + harness-smoke keys
  SURFACE_POLICY:        .spec/e2e-policy/sprint-01/artifact-only-read.json
  TDD_STATE:             none
  TEST_FILE:             tests/sprint-01/grd-06-missing-key.test.mjs
  TEST_FUNCTION:         FLOW-GRD-06-MISSING-KEY
  VERIFY:                node --test tests/sprint-01/grd-06-missing-key.test.mjs --test-name-pattern FLOW-GRD-06-MISSING-KEY

  RED_INPUT:    Base main: no guard exists, so the module exits 1 with `.red`. Behaviour RED: with the key unset and all fallback stores absent, nothing refuses today; the guard must refuse with `missing-api-key` and zero model requests in the capture.
  RED_PROOF:    .tmp/sprint-01-verification/grd-06-missing-key.json.red
  POSITIVE_EXAMPLE: A controls row `missing-key could-not-run missing-api-key` with an empty request stream, paired with the authenticated claude-code pass rows from the same run — module exits 0.

  SCENARIO_SUMMARY: The keyless control step inside the real workflow → env-absence assertion, refusal, capture with zero model events → `could-not-run missing-api-key`, and the same guard lets the keyed cells proceed.

  NOTE: T10 owns FLOW-GRD-06-MISSING-KEY as the [PRIMARY] owner; this AC asserts the guard-level both-ways behaviour.

--------------------------------------------------------------------------------
TEST CRITERIA (Boolean Verification)
--------------------------------------------------------------------------------

| # | Boolean Statement | Maps To AC | Verify | Status |
|---|-------------------|------------|--------|--------|
| 1 | The guard records `missing-api-key` when the binding and all fallbacks are absent | AC-2 | `node --test tests/sprint-01/grd-06-missing-key.test.mjs --test-name-pattern FLOW-GRD-06-MISSING-KEY` | [ ] TRUE [ ] FALSE |
| 2 | The keyless capture contains zero model-request events before the refusal | AC-2 | `node --test tests/sprint-01/grd-06-missing-key.test.mjs --test-name-pattern FLOW-GRD-06-MISSING-KEY` | [ ] TRUE [ ] FALSE |
| 3 | A graded verdict is `fail` when a required read was denied and the process exited 0 | AC-1 | `node --test tests/sprint-01/grd-03-evidence.test.mjs --test-name-pattern FLOW-GRD-03-FILES-AND-STREAM` | [ ] TRUE [ ] FALSE |
| 4 | The missing-key flow module finds zero `bypassPermissions` stances recorded by the runtime | AC-2 | `node --test tests/sprint-01/grd-06-missing-key.test.mjs --test-name-pattern FLOW-GRD-06-MISSING-KEY` | [ ] TRUE [ ] FALSE |

TC-4 is a static stance claim; the flow module reads the recorded stance and scans `test/harness/runtime/`
before it exercises the guard, so the module proves it without a second command shape.

--------------------------------------------------------------------------------
SCOPE / GUARDRAILS (WRITE-ALLOWED / WRITE-PROHIBITED)
--------------------------------------------------------------------------------

writeAllowed:
- `test/harness/runtime/` (NEW) — guard, capture, stance, writer modules and their unit tests
- `test/harness/lib/**` (NEW) — shared helpers (process spawn, hashing, JSON record shapes)
- `tests/sprint-01/grd-06-missing-key.test.mjs` (NEW) — the locked flow module for FLOW-GRD-06-MISSING-KEY
- `tests/sprint-01/grd-03-evidence.test.mjs` (NEW) — the locked flow module for FLOW-GRD-03-FILES-AND-STREAM
- `tests/sprint-01/flow-runner.mjs` (shared lane, coordinate marker — append helpers, never rewrite T1's block)

writeProhibited:
- `plugins/pixel-perfect/**` — the evaluated product; changing it invalidates the grade
- `.github/workflows/**` — workflow wiring is T1/T8/T9
- `test/*.test.mjs` — the repo's existing suite is not this task's surface
- `test/harness/pins.json` — T2 is the sole pins authority
- anything not listed in writeAllowed

--------------------------------------------------------------------------------
BOUNDARIES (✅ Always / ⚠️ Ask First)
--------------------------------------------------------------------------------

✅ Always:
- Record the stance and the credential binding decision in the capture record, even when it is the default.
- Quote fixture paths and user-supplied arguments when building child argv; never interpolate a raw string into a shell.
- Keep the runtime importable with no side effects at module load (no spawn, no fs write, no env read).
- Emit JSON records with stable field names exactly as 03-data-schema names them (`termination_kind`, `stream_offset`, `prefix_complete`, `observed_verify_outcome`).

⚠️ Ask First:
- Adding a new runtime dependency (the repo has none for this; Node stdlib only).
- Widening `InvocationCapture` past the fields this task needs.
- Changing the repo's `node --test` invocation shape.

--------------------------------------------------------------------------------
DELIVERABLE
--------------------------------------------------------------------------------

- `test/harness/runtime/guard.mjs` (NEW): credential resolution per harness, stance requirement, refusal record (`could-not-run` / `missing-api-key`), stdin-close + timeout wrapper, harness-namespaced session id.
- `test/harness/runtime/capture.mjs` (NEW): incremental stdout capture by byte offset, original bytes, hashes, before/after fixture manifests, `termination_kind` and boundary offset.
- `test/harness/runtime/stance.mjs` (NEW): the recorded `PermissionStance` value and its serialization (`dontAsk` + `--add-dir`); refuses `bypassPermissions`.
- `test/harness/runtime/grade-writer.mjs` (NEW): temp → fsync → rename → read-back with the five identity fields compared.
- `tests/sprint-01/grd-06-missing-key.test.mjs`, `tests/sprint-01/grd-03-evidence.test.mjs` (NEW): the two locked flow modules.

--------------------------------------------------------------------------------
CODE PATTERN
--------------------------------------------------------------------------------

Follow the existing Node ESM + `node --test` style used by `test/gate.test.mjs` and `test/workflows.test.mjs`: `import { test } from "node:test"`, `assert` from `node:assert/strict`, fixture helpers under `test/helpers/`. Machine-readable records are plain objects serialized with `JSON.stringify`, never a class hierarchy.

--------------------------------------------------------------------------------
DESIGN
--------------------------------------------------------------------------------

none — no UI surface. The reader is the result artifact and the run summary.

--------------------------------------------------------------------------------
AGENT INSTRUCTIONS (TDD Flow)
--------------------------------------------------------------------------------

## FOR EACH ACCEPTANCE CRITERION:

### RED PHASE
  READ:   The AC, 02-system-components `invocation-guard` / `grade-writer`, 03-data-schema `InvocationCapture / PermissionStance`
  WRITE:  ONE failing flow module (or ONE new assertion in it)
  RUN:    the AC's VERIFY command
  VERIFY: It fails and writes the `.red` sibling
  RETURN: { phase: "RED", test_file, test_function, failure_output }

### GREEN PHASE (after orchestrator VERIFY_RED passes)
  READ:   The failing assertion and the component contract table above
  WRITE:  The smallest runtime module that satisfies it
  RUN:    the AC's VERIFY command
  VERIFY: exits 0, artifact shows the seeded values (not just "ok")
  RETURN: { phase: "GREEN", files_changed, test_output }

### REFACTOR PHASE (after orchestrator VERIFY_GREEN passes)
  READ:   The runtime you wrote
  WRITE:  Only de-duplication; behaviour frozen
  VERIFY: Both flow modules still pass
  RETURN: { phase: "REFACTOR", files_changed, still_passing }

--------------------------------------------------------------------------------
READING LIST (max 5 files — canonical pattern first)
--------------------------------------------------------------------------------

1. `test/gate.test.mjs` [PRIMARY PATTERN] — this repo's `node --test` + fixture style.
2. `.spec/prds/harness-eval-framework/09-technical-requirements/02-system-components.md` — `invocation-guard`, `grade-writer`, `InvocationCapture`, `PermissionStance`.
3. `.spec/prds/harness-eval-framework/09-technical-requirements/03-data-schema.md` — `HarnessGrade`, `InstallationIdentity`, `CanonicalEvent`, `InvocationCapture`.
4. `.spec/prds/harness-eval-framework/04-uc-grd.md` — UC-GRD-03 and UC-GRD-06 acceptance criteria.
5. `.spec/prds/harness-eval-framework/09-technical-requirements/01-architecture-posture.md` — verdict vocabulary and the exit-code rule.

--------------------------------------------------------------------------------
ORCHESTRATOR VERIFICATION PROTOCOL
--------------------------------------------------------------------------------

1. VERIFY_RED: both `.red` artifacts exist and their captured failures name the missing runtime, not a syntax error.
2. VERIFY_GREEN: both flow modules exit 0; require the artifact's `missing-api-key` row and the `exit0-denied-read` row, not merely exit 0.
3. VERIFY_NO_KEYS: grep the runtime for `secrets.` and key-value reads on the write path; the writer must hold no key.
4. VERIFY_STANCE: grep for `bypassPermissions` across `test/harness/runtime/` returns 0 hits.
5. VERIFY_SCOPE: `git diff --name-only` ⊆ writeAllowed.

--------------------------------------------------------------------------------
EVIDENCE GATES (fast/cheap first — fail fast)
--------------------------------------------------------------------------------

Gate 1: RED evidence for both ACs.
Gate 2: One assertion set per AC in the named file.
Gate 3: `node --test tests/sprint-01/grd-06-missing-key.test.mjs tests/sprint-01/grd-03-evidence.test.mjs` exits 0.
Gate 4: Seeded evidence — the keyless capture's model-request count is 0 and the authenticated pair passes in the same run.
Gate 5: Stance — `dontAsk` + `--add-dir` recorded; zero `bypassPermissions`.
Gate 6: Scope compliance.
Gate 7: Anti-fakeability — a static "always refuse" guard must fail TC-1's paired authenticated assertion; run the key-present-misfire fixture from AC-2's second case and require `.red`.

--------------------------------------------------------------------------------
AGENT ASSIGNMENT
--------------------------------------------------------------------------------

- **Implementer:** `ai-tooling-implementer` — harness adapter/runtime code (spawn, flags, capture) is this role's domain per AGENTS.md.
- **Reviewer:** `ai-tooling-reviewer` — adapter review for ecosystem patterns, TDD compliance, plugin contracts.
- **Planner:** `github-agentic-workflow-planner` (no `ai-tooling-planner` exists in the roster).

--------------------------------------------------------------------------------
OUT OF SCOPE
--------------------------------------------------------------------------------

- Mapping raw stdout to `CanonicalEvent` (T6) — record bytes and provenance only, keep the seam a JSON object.
- The claude-code adapter itself, its install and its four invocations (T5).
- Per-harness credential names and CLI versions (`test/harness/pins.json`, T2).
- The recorder, artifact upload and summary (T8).
- Fixture kit and case manifests (T4).

--------------------------------------------------------------------------------
CONTEXT (read if unclear)
--------------------------------------------------------------------------------

**Current state:** no capture layer, guard, stance or writer exists anywhere in the repo; every harness invocation today is a hand-run with no record.
**Gap:** Without one refusal path and one write path, a missing key or a denied read can be recorded as a pass by any adapter that maps exit 0 to success.

--------------------------------------------------------------------------------
REVIEW CRITERIA (for ai-tooling-reviewer)
--------------------------------------------------------------------------------

Must pass (≤5, evidence-gate-backed):
- Guard, capture, stance and writer exist as separate modules with the field names 03-data-schema specifies.
- The refusal path is proven both ways: keyless → `missing-api-key`, keyed → proceeds.
- Verdict is never derived from exit code, `subtype`, `is_error`, or a Codex error item.
- Writer read-back compares all five identity fields and a mismatch yields `could-not-run`.
- RED evidence present for both ACs; scope respected.

Should verify (≤5, judgment):
- No secret value is logged, echoed, or persisted by any runtime path.
- Stdin is closed and a timeout wraps every spawn.
- `termination_kind` distinguishes boundary-stop from native completion.
- The runtime imports cleanly with no side effects.

Verdict: [APPROVED | NEEDS_FIXES]

--------------------------------------------------------------------------------
DEPENDENCIES
--------------------------------------------------------------------------------

Depends on: T2 (the pins/schemas/lookup module this runtime imports for harness identity, credential env names, and CanonicalEvent field names)

Blocks: T5 (uses guard/capture/writer), T6 (consumes capture records), T10 (builds on the refusal path), T11 (controls read the guard's records).

Not a dependency: T4 — this task's flow modules need a fixture kit to test against; that joins the gate step's `exercises`, not a code edge.

--------------------------------------------------------------------------------
NOTES
--------------------------------------------------------------------------------

- This task owns no locked flow: both of its ACs are non-primary assertions of flows T6 (GRD-03) and T10 (GRD-06) own. That is why the contract carries no `integration_obligations` entry.
- `tests/sprint-01/flow-runner.mjs` is a shared lane. Append helper functions; never rewrite a block another task added.
- The owner-approved stance is `--permission-mode dontAsk` plus `--add-dir` of the plugin root; `bypassPermissions` is rejected and must not appear even in a fixture that is never executed.

<!-- REQUIREMENT-CONTRACT v1 -->
<!--
{
  "version": "1",
  "task_id": "T3",
  "task_type": "FEATURE",
  "tdd_mode": "red_first",
  "why_required": "serves FLOW-GRD-06-MISSING-KEY and FLOW-GRD-03-FILES-AND-STREAM: the guard, the capture layer and the grade writer are the runtime those two flows replay, and without them neither flow can produce evidence at all",
  "verification_policy": {
    "requires_tests": true,
    "requires_red_evidence": true,
    "requires_seeded_evidence": true
  },
  "fixtures": {
    "seed/env/key-removed": {
      "entrypoint": "control step's real environment with ANTHROPIC_API_KEY and all fallbacks unset (asserted in-step)",
      "description": "missing-key refusal capture with zero model events",
      "seed_method": "cli"
    },
    "seed/env/anthropic-key-present": {
      "entrypoint": "harness-smoke environment, ANTHROPIC_API_KEY on exec steps (owner secret)",
      "description": "authenticated cells + key-present-misfire control",
      "seed_method": "cli"
    },
    "seed/streams/exit0-denied-read": {
      "entrypoint": "real claude-code capture from T11 qualification (recorded-stance run, reads denied, exit 0); archived under test/harness/fixtures/streams/ with capture hash",
      "description": "raw stream bytes with offsets",
      "seed_method": "recorded_external"
    },
    "seed/live-dispatch-run": {
      "entrypoint": "gh workflow run harness-eval --repo hackerpug-ai/pixel-perfect (real dispatch, checkout default)",
      "description": "RUN_ID + attempt-qualified artifacts via gh run download",
      "seed_method": "cli"
    }
  },
  "guardrails": {
    "write_allowed": [
      "test/harness/runtime/",
      "test/harness/lib/**",
      "tests/sprint-01/grd-06-missing-key.test.mjs",
      "tests/sprint-01/flow-runner.mjs",
      "tests/sprint-01/grd-03-evidence.test.mjs"
    ],
    "write_prohibited": [
      "plugins/pixel-perfect/**",
      ".github/workflows/**",
      "test/*.test.mjs"
    ]
  },
  "requirements": [
    {
      "id": "AC-1",
      "type": "acceptance_criterion",
      "primary": false,
      "flow_ref": "FLOW-GRD-03-FILES-AND-STREAM",
      "title": "Evidence-not-exit-code grading: verdicts cite files and stream offsets; a denied read fails on exit 0",
      "description": "GIVEN a real captured claude-code stream in which a required read was denied and the process exited 0 WHEN the capture and grade writer record that invocation and the artifact is read back THEN the verdict is fail with denied_tool_call and the denial offset cited while process_exit_code stays the raw 0",
      "test_tier": "integration",
      "verification_service": "GitHub Actions harness-eval workflow + real harness CLIs + harness-smoke keys",
      "verify": "node --test tests/sprint-01/grd-03-evidence.test.mjs --test-name-pattern FLOW-GRD-03-FILES-AND-STREAM",
      "test_file": "tests/sprint-01/grd-03-evidence.test.mjs",
      "test_function": "FLOW-GRD-03-FILES-AND-STREAM",
      "positive_example": "Controls row exit0-denied-read fail denied_tool_call present next to a raw process_exit_code of 0, and every graded check citing at least 1 evidence path \u2014 module exits 0.",
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "maps_to_ac": null,
      "red_input": "Base main: no grader exists, module exits 1 with .red. Behavior RED: a verdict equal to its exit-code mapping (pass with exit 0 and a denied-read stream) makes the module exit 1 \u2014 the negative fixture is the recorded deny-under-default-mode stream from T5.",
      "red_proof": ".tmp/sprint-01-verification/grd-03-evidence.json.red",
      "scenario": {
        "tier": "e2e-automated",
        "topology_note": "InvocationCapture records stdout with byte offsets; stream-grader normalizes to CanonicalEvent; grader cites offsets and capture hashes; live artifact carries source and process_exit_code per check",
        "test_tier": "e2e",
        "negative_control": {
          "would_fail_if": [
            "a denied required read with exit 0 graded pass \u2014 the real exit0-denied-read capture yields fail denied_tool_call",
            "an unmapped required fact silently omitted \u2014 version-bumped capture yields could-not-run",
            "the stored exit code could influence the verdict"
          ]
        },
        "evidence": {
          "forms": [
            "CanonicalEvent records with original_event preserved",
            "capture hashes and stream_offset citations",
            "controls row exit0-denied-read"
          ],
          "examples": [
            "source files-and-event-stream count == 4",
            "process_exit_code 0 next to verdict fail",
            "denied_tool_call naming operation and target path"
          ],
          "required_capture": "the raw exit-0 denial capture from T11 qualification with before/after fixture manifests"
        },
        "build_proof": {
          "range": "anything that proves a verdict is computed from captured evidence and cited by offset",
          "examples": [
            "a capture record with stream_offset + hash feeding a verdict record"
          ]
        },
        "cases": [
          {
            "start_ref": "seed/live-dispatch-run",
            "action": {
              "actor": "maintainer",
              "steps": [
                "download result artifact",
                "jq claude-code/pinned checks for source and process_exit_code"
              ]
            },
            "end_state": {
              "must_observe": [
                "checks with .source files-and-event-stream count == 4",
                "raw integer `process_exit_code` present as diagnostic",
                "controls row exit0-denied-read fail denied_tool_call"
              ],
              "must_not_observe": [
                "any check where verdict equals an exit-code mapping",
                "pass verdict with non-empty denied_tool_call",
                "opaque events used to infer absence"
              ]
            }
          },
          {
            "start_ref": "seed/streams/exit0-denied-read",
            "action": {
              "actor": "runner",
              "steps": [
                "node tests/sprint-01/flow-runner.mjs grd-03 --fixture exit0-denied-read --expect red"
              ]
            },
            "end_state": {
              "must_observe": [
                "verdict fail with denied_tool_call citing the denial offset while process_exit_code reads 0",
                "mapping-validator \"pass\" on the qualified version"
              ],
              "must_not_observe": [
                "pass or could-not-run on an observable denial",
                "fabricated denial events with no capture provenance"
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
      "flow_ref": "FLOW-GRD-06-MISSING-KEY",
      "title": "Missing credential fails closed: could-not-run missing-api-key before any model request, never readable as pass",
      "description": "GIVEN a workflow step in which ANTHROPIC_API_KEY and every permitted fallback credential store are absent WHEN the guard-evaluated invocation runs in the same workflow as authenticated invocations THEN the keyless invocation records could-not-run/missing-api-key with zero model-request events and the authenticated cells still grade pass",
      "test_tier": "integration",
      "verification_service": "GitHub Actions harness-eval workflow + real harness CLIs + harness-smoke keys",
      "verify": "node --test tests/sprint-01/grd-06-missing-key.test.mjs --test-name-pattern FLOW-GRD-06-MISSING-KEY",
      "test_file": "tests/sprint-01/grd-06-missing-key.test.mjs",
      "test_function": "FLOW-GRD-06-MISSING-KEY",
      "positive_example": "Controls row missing-key could-not-run missing-api-key with an empty request stream, paired with the authenticated claude-code pass rows from the same run \u2014 module exits 0.",
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "maps_to_ac": null,
      "red_input": "Base main: no guard exists, module exits 1 with .red. Behavior RED: env with ANTHROPIC_API_KEY unset and all fallback stores absent \u2014 guard must refuse with missing-api-key and zero model requests in the capture; on base nothing refuses, exit 1.",
      "red_proof": ".tmp/sprint-01-verification/grd-06-missing-key.json.red",
      "scenario": {
        "tier": "e2e-automated",
        "topology_note": "invocation-guard evaluates the credential binding inside the real workflow; one control step runs with the key actually removed; paired authenticated cells in the same run; results in the controls array",
        "test_tier": "e2e",
        "negative_control": {
          "would_fail_if": [
            "the guard recorded missing-api-key while the key was present (key-present-misfire: a static always-refusing guard)",
            "any model request appeared in the missing-key capture before the refusal \u2014 control invalid",
            "the missing-key result readable as pass anywhere",
            "the cursor cell reason came from a special-cased string instead of the guard code path"
          ]
        },
        "evidence": {
          "forms": [
            "controls rows control_id/verdict/reason",
            "missing-key capture empty of model events",
            "cursor cell reason string"
          ],
          "examples": [
            "missing-key could-not-run missing-api-key",
            "stale-cache could-not-run installation-identity-mismatch",
            "exit0-denied-read fail denied_tool_call",
            "hidden-image-judge row with child-tree scan evidence",
            "cursor reason identical to the control row's reason"
          ],
          "required_capture": "the keyless step's env-absence assertion, its capture with zero model events before refusal, and the authenticated cells' passes in the same run"
        },
        "build_proof": {
          "range": "anything that proves the refusal happens before the first model request on a real binding absence",
          "examples": [
            "a guard decision record plus a capture whose model-request count is 0"
          ]
        },
        "cases": [
          {
            "start_ref": "seed/env/key-removed",
            "action": {
              "actor": "workflow",
              "steps": [
                "run guard-evaluated invocation with ANTHROPIC_API_KEY and all fallbacks removed",
                "run paired authenticated invocations in the same workflow"
              ]
            },
            "end_state": {
              "must_observe": [
                "controls row missing-key reads \"could-not-run missing-api-key\"",
                "missing-key capture has 0 model-request events before refusal",
                "paired authenticated cells grade \"pass\" (guard fires on absence, not unconditionally)",
                "cursor/pinned reason == \"missing-api-key\" from the same guard path"
              ],
              "must_not_observe": [
                "pass on the keyless cell",
                "0 model requests in the keyless capture",
                "the authenticated control also recording missing-api-key"
              ]
            }
          },
          {
            "start_ref": "seed/env/anthropic-key-present",
            "action": {
              "actor": "runner",
              "steps": [
                "node tests/sprint-01/flow-runner.mjs grd-06 --fixture key-present-misfire --expect red"
              ]
            },
            "end_state": {
              "must_observe": [
                "guard does not emit \"missing-api-key\" when the binding is present",
                ".red records the with-key guard decision (\"no missing-api-key refusal\")"
              ],
              "must_not_observe": [
                "a \"missing-api-key\" refusal on a key-present environment (the fallback-store enumeration comes up empty)",
                "refusal logged before the credential check ran"
              ]
            }
          }
        ]
      }
    },
    {
      "id": "TC-1",
      "type": "test_criterion",
      "description": "The invocation guard records missing-api-key when the binding and every permitted fallback are absent",
      "verify": "node --test tests/sprint-01/grd-06-missing-key.test.mjs --test-name-pattern FLOW-GRD-06-MISSING-KEY",
      "maps_to_ac": "AC-2"
    },
    {
      "id": "TC-2",
      "type": "test_criterion",
      "description": "The keyless capture contains zero model-request events before the refusal",
      "verify": "node --test tests/sprint-01/grd-06-missing-key.test.mjs --test-name-pattern FLOW-GRD-06-MISSING-KEY",
      "maps_to_ac": "AC-2"
    },
    {
      "id": "TC-3",
      "type": "test_criterion",
      "description": "A graded verdict reads fail when a required read was denied and the process exited 0",
      "verify": "node --test tests/sprint-01/grd-03-evidence.test.mjs --test-name-pattern FLOW-GRD-03-FILES-AND-STREAM",
      "maps_to_ac": "AC-1"
    },
    {
      "id": "TC-4",
      "type": "test_criterion",
      "description": "The missing-key flow module finds zero bypassPermissions stances recorded by the runtime",
      "verify": "node --test tests/sprint-01/grd-06-missing-key.test.mjs --test-name-pattern FLOW-GRD-06-MISSING-KEY",
      "maps_to_ac": "AC-2"
    }
  ]
}
-->
</details>

## Handoff

```json
{
  "task": "T3",
  "commit_sha": "48ed78e276bdf48c0580d5dca2f9ac57cc7d85c4",
  "done": "PROVISIONAL SUBSTITUTE-AUTHOR DRAFT ONLY; unapproved and not original-author testimony. Inspection of the approved candidate and frozen cycle-2 review reconstructs the landed shared runtime: credential/stance refusal before spawn; namespaced sessions and filtered child credentials; incremental byte capture with hashes, fixture manifests and termination metadata; evidence-based grading with could-not-run/fail/pass precedence; and atomic grade publication with five-field identity read-back. The recorded landing is merge d35b46b447633f98cbb0efdcd21048e851f0393b. This draft does not record a handoff, complete T3, or establish hosted acceptance.",
  "deviations": [
    "The authoring session is a recovery substitute, not registered original implementer fa382dab-8a9e-4db. That session is historical/unreachable in the current orchestration context; no owner authorization for substitution has been supplied.",
    "AC-1 runtime verification used a real spawned Node child producing an OS EACCES denial on exit 0; it did not establish a real claude-code denial capture. AC-2 used a real guard/child-environment control, not authenticated model passes in a hosted workflow. Frozen review preserves both ACs and flows as DEFERRED.",
    "A refused never-started capture retains termination_kind unexpected under the locked enum, with refusal carried separately and prefix_complete true; the writer preserves the guard refusal reason instead of labeling it a crash.",
    "Boundary-stop prefix gating was exercised with caller-supplied status on real bytes; the shared launcher has no question-boundary producer."
  ],
  "concerns": [
    "AC-1 and FLOW-GRD-03-FILES-AND-STREAM remain deferred on T11/T6/T7/T9. AC-2 and FLOW-GRD-06-MISSING-KEY remain deferred on T10/T11/T9. Historical reviewer output reports archived_capture=absent and live_artifact=absent; this draft does not recheck later hosted state.",
    "F-T3-9 remains advisory: SIGKILL and spawn errors can be labeled native; grading a killed child with an observed required fact throws pass-without-evidence instead of producing a could-not-run cell. T5 must not infer native session completion from this label; downstream controls need supported error handling.",
    "F-T3-7 remains advisory: offsets and hashes establish that bytes exist, not that an observation accurately describes them or that observations were not removed. The capture module explicitly hands semantic corroboration to the T6 mapper and archived capture.",
    "Historical cycle-2 repo-suite run exited 1: 588 of 589 tests passed, with pi-package failing because the review worktree lacked node_modules/.bin/pi. The frozen reviewer reports a passing home-repository Pi rerun. No fresh suite or runtime execution occurred during draft preparation."
  ],
  "findings": [
    "Frozen cycle-2 verdict is APPROVED for the exact candidate against base 0903c9d7b697c5f5568841e6419df8c39e07464a. F-T3-1 through F-T3-4 are FIXED; TC-1 through TC-4 and both frozen local checks are PASS. AC-1/AC-2 and both end-to-end flows remain DEFERRED.",
    "F-T3-5 remains advisory for the missing boundary-stop producer. F-T3-6 remains advisory for its offset-trust/test gap: independent mutation evidence killed 21 of 22 mutants, with M10 surviving; the digest half is checked and the offset half is caught later during grading.",
    "F-T3-6 fixture hashing/span checks and F-T3-8 artifact relocation were verified fixed in substance in the reviewer summary, but their structured finding rows still say ADVISORY with null resolution. This draft preserves that discrepancy and does not close them.",
    "Frozen review resolved U-T3-1 as absent hosted/archived proof assigned to the declared deferred owners; U-T3-2 accepts the OS-denial test as runtime proof only; U-T3-3 was addressed by F-T3-3 positive/negative writer controls."
  ],
  "scope_impact": [
    {
      "target": "T5",
      "found": "The runtime accepts boundary-stop metadata but does not produce it; native can also label a killed or unspawned process (F-T3-5/F-T3-9).",
      "change": "Carry the advisories into adapter integration; establish a real boundary producer and native-session evidence before relying on these fields."
    },
    {
      "target": "T6",
      "found": "Capture citations verify byte spans, while observation semantics remain supplied by the mapper (F-T3-7); M10 leaves an offset-trust/test gap.",
      "change": "Corroborate observations against archived harness bytes and retain negative controls that detect misleading citations."
    },
    {
      "target": "GATE:FLOW-GRD-03-FILES-AND-STREAM",
      "found": "The exact frozen review defers the flow on T11/T6/T7/T9; local EACCES proof and file presence do not establish archived harness replay or hosted grading.",
      "change": "Keep the flow deferred until the declared owners supply archived claude-code denial replay and hosted artifact evidence."
    },
    {
      "target": "GATE:FLOW-GRD-06-MISSING-KEY",
      "found": "The exact frozen review defers the flow on T10/T11/T9; the guard-level paired control does not establish authenticated pass cells in the same hosted run.",
      "change": "Keep the flow deferred until hosted evidence shows the missing-key control, zero pre-refusal model requests, and authenticated passes from that same run."
    }
  ],
  "feedback": [
    "This reconstruction inspected exact Git objects, task bytes, state, frozen review bundles, historical logs and artifact hashes. It ran no product tests, model requests, or hosted workflows and fabricated no native receipts.",
    "Historical review records both frozen checks passing, the sprint lane 26/26, plugin validation passing, and 21/22 independent mutants killed. These are retained reviewer evidence, not execution claims by this substitute author.",
    "Evidence and unresolved recovery questions are in .kb-run-sprint/sprint-01-evaluator-evidence-spine/recovery/handoff-drafts/T3.evidence.md. Any future substitute recording needs explicit owner authorization and actual native provenance under Brain sprint-handoff CONTRACT.md; this draft supplies neither."
  ]
}
```
