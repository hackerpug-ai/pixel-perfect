# TASK-GAW-6: Install, load and invoke Pi on both tracks through the pinned provider only

> Task ID: GAW-6
> Sprint: [SPRINT.md](./SPRINT.md)
> Status: Backlog
> Assignee: ai-tooling-implementer
> Priority: P0
> Points: 5
> Type: FEATURE
> Planner: github-agentic-workflow-planner
> Reviewer: ai-tooling-reviewer
> Proposed By: github-agentic-workflow-planner
> Wave: C
> TDD_MODE: red_first · RED_GREEN_REQUIRED: true

AGENT: planner=github-agentic-workflow-planner | implementer=ai-tooling-implementer | reviewer=ai-tooling-reviewer

## Background

- **Problem:** Pi's cells read `pi-adapter-not-implemented`, and Pi's status is unproven on both 0.84.4 and 1.0.x.
- **Risk this guards:** Pi has no sandbox and no approval prompts, and on this Mac the slash model form answered through OpenRouter. A graded run must answer through the pinned provider or not at all.
- **Owner decisions:** the owner confirmed `google` `gemini-2.5-pro`, that `SMOKE_PI_KEY` is a Gemini key, and the no-gate stance row (ROADMAP D-03).
- **Gate steps that exercise this task:** 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 22, 24, 25, 26. Capability: CAP-EVAL-01.

## Critical Constraints

- **MUST:** Install: npm install -g --ignore-scripts @earendil-works/pi-coding-agent@<version>. It declares node >=22.19.0, which GAW-I1 provides. Load, keyless: pi install <workspace>/plugins/pixel-perfect with stdin closed.
- **MUST:** Preflight in the keyed step: pi auth check --provider google --json. Anything but status ready reads could-not-run pi-auth-not-ready, recorded through a persisted refusal capture so each check still cites evidence.
- **MUST:** Run: pi --mode json --no-session --provider google --model gemini-2.5-pro '/skill:pixel-perfect-<name> <args>', stdin closed. A status prompt also carries contract.mjs declarationFor's text; verify carries none, because the evaluator writes its report. The owner confirmed that model and that SMOKE_PI_KEY is a Gemini key. Use --provider google, not the slash form: on this Mac --model google/gemini-2.5-pro with no Google key answered through OpenRouter's model of that name. A stream whose assistant message_end names any other provider reads could-not-run provider-mismatch.
- **STRICTLY:** On a normally completing run, a missing last assistant message_end or a stopReason other than stop reads could-not-run. Pi has no approval prompts and no sandbox. Its stance row is the owner-approved no-approval-gate, it has no denied-write probe, and the runner is its only isolation.

## Specification

- **Objective:** Pi installs, loads and runs through the adapter contract on both tracks, and it can answer only through the pinned provider.
- **Success state:** A keyless load at 1.0.4 lists 11 of 11 skills from the plugin root with no model call. With no key, the real auth check prints `not_ready` and the check reads `pi-auth-not-ready` with 0 model requests. Each graded argv holds `--provider google` and `--model gemini-2.5-pro`. The registry serves this adapter.

Contract details:

- List, keyless: get_commands on pi --mode rpc --no-session --offline. At 1.0.4 the names read skill:pixel-perfect-<name>, so strip that prefix and keep those whose source path starts at the plugin root.
- Verified on this Mac at 1.0.4 in a temp HOME: install exits 0; rpc returns 11 names; auth check prints status not_ready, reason credentials_not_configured with no key; with an empty env and --provider google the run exits 1 with No API key found for google; the catalog lists google gemini-2.5-pro. One accidental OpenRouter run also showed the skill expanding and reading workflows from the plugin root. That is shape evidence, not a grade.
- FLOW-GRD-01 and the other flows' gate steps list this task, so the trunk replay proves these cells on a hosted run.

## Acceptance Criteria (GIVEN-WHEN-THEN)

### AC-1: The pinned CLI lists all eleven skills with no key and no model call [PRIMARY]

- **GIVEN:** the pinned Pi CLI installed with `--ignore-scripts` in a temp HOME, with an allowlisted env holding no provider key
- **WHEN:** the adapter's keyless load runs against this checkout, then its list
- **THEN:** 11 of 11 command names appear, including `status` from `skill:pixel-perfect-status`, `observed_cli_version` reads `1.0.4` with `identity_decision.ok` true, and `model_request_count` stays 0

```text
FLOW_REF:              null
TEST_TIER:             integration
VERIFICATION_SERVICE:  real Pi CLI at the pinned version in a temp HOME
SURFACE_POLICY:        null
TDD_STATE:             none
TEST_FILE:             tests/sprint-02/adapter-pi.test.mjs
TEST_FUNCTION:         ADAPTER-PI-KEYLESS-LOAD
VERIFY:                node --test --test-name-pattern 'ADAPTER-PI-KEYLESS-LOAD' tests/sprint-02/adapter-pi.test.mjs
```

SCENARIO_SUMMARY: With no key, Pi itself resolves all 11 of the checkout's skills and makes no model call.

### AC-2: No credential means could-not-run, through the real auth check and the real run [PRIMARY]

- **GIVEN:** that install with no provider key in the child env and `OPENROUTER_API_KEY` set to a placeholder in the parent env
- **WHEN:** the preflight runs, and the graded entries' argv is read
- **THEN:** the auth check prints `status` `not_ready`, the check reads `pi-auth-not-ready` with `model_request_count` 0, each argv holds `--provider` `google` and `--model` `gemini-2.5-pro`, and `OPENROUTER_API_KEY` is absent from the child env

```text
FLOW_REF:              null
TEST_TIER:             integration
VERIFICATION_SERVICE:  real Pi auth check and real JSON-mode run with no credential in the child env
SURFACE_POLICY:        null
TDD_STATE:             none
TEST_FILE:             tests/sprint-02/adapter-pi.test.mjs
TEST_FUNCTION:         ADAPTER-PI-AUTH-PREFLIGHT
VERIFY:                node --test --test-name-pattern 'ADAPTER-PI-AUTH-PREFLIGHT' tests/sprint-02/adapter-pi.test.mjs
```

SCENARIO_SUMMARY: A placeholder OpenRouter key in the parent cannot reach Pi, and the real auth check refuses the run by name.

Each AC's RED input and positive example are in its row of the contract block below.

## Test Criteria

Each TC runs its mapped AC's VERIFY.

| ID | Statement | Maps to |
|---|---|---|
| TC-1 | The load finds 11 of 11 command names when `get_commands` runs with no key | AC-1 |
| TC-2 | `observed_cli_version` reads `1.0.4` when the keyless load finishes | AC-1 |
| TC-3 | The auth check prints `not_ready` when the child env holds no provider key | AC-2 |
| TC-4 | The check reads reason `pi-auth-not-ready` when the auth check prints `not_ready` | AC-2 |
| TC-5 | Each graded argv holds `--provider` `google` when read from the table | AC-2 |
| TC-6 | `OPENROUTER_API_KEY` is absent from the child env when the parent env holds it | AC-2 |

## Reading List

1. `INSTALL.md` lines 159-176: Pi's install and confirm commands
2. `test/pi-package.test.mjs` lines 1-40: the repo's existing pi install path
3. `.spec/prds/harness-eval-framework/09-technical-requirements/02-system-components.md` lines 95-99: pi-adapter
4. `test/harness/pins.json` lines 47-56: pin, exact model and the 0.84.4 exception

Standards: `AGENTS.md`, `brain/docs/kanban/SCENARIO-CONTRACT-V1.md`.

## Guardrails

WRITE-ALLOWED:

- test/harness/adapters/pi.mjs (NEW)
- test/harness/adapters/registry.mjs (MODIFY)
- tests/sprint-02/adapter-pi.test.mjs (NEW)

WRITE-PROHIBITED:

- .github/workflows/harness-eval.yml - Pi has no denied-write probe to wire
- test/harness/graders/** - adapters do not grade
- test/harness/stream/** - E8 owns Pi's table
- plugins/pixel-perfect/** - no plugin change in this task
- Any file not listed in WRITE-ALLOWED

## Code Pattern

```js
// test/harness/adapters/claude-code.mjs:92-102: the entry shape each adapter's table mirrors.
{
  key: "status-a",
  check_id: "status",
  case_id: "status-a",
  graded: true,
  ask_policy: "ask-nothing",
  required_facts: ["plugin-loaded", "result-event"],
  command_name: "status",
  timeout_ms: 180_000,
}
```

- **Anti-pattern:** The slash form `--model google/gemini-2.5-pro`; reading the exit code as the verdict; a denied-write probe for a harness with no gate; any real key in a test.

## Design

None. This task has no UI surface.

## Agent Instructions

Work AC-1 then AC-2, one RED, GREEN, REFACTOR cycle each. Install through `tests/sprint-02/real-cli.mjs` from GAW-1. Every child starts from an empty env plus an allowlist. Scrub `OPENROUTER_API_KEY` and every other key name before any Pi call: one probe on this Mac spent tokens through it.

## Orchestrator Verification Protocol

1. **VERIFY_RED:** each VERIFY fails on base for the reason its RED names.
2. **VERIFY_GREEN:** each VERIFY exits 0.
3. Run every Evidence Gate and compare with Expected.
4. `git diff --name-only` lists only WRITE-ALLOWED paths.
5. Dispatch `ai-tooling-reviewer` with this file, the RED and GREEN output, and the evidence.

## Agent Assignment

- **Planner:** `github-agentic-workflow-planner`
- **Implementer:** `ai-tooling-implementer`
- **Reviewer:** `ai-tooling-reviewer`
- **Rationale:** `ai-tooling-implementer` owns harness adapter code. `ai-tooling-reviewer` checks the adapter against the real CLI's surface and the plugin contract.

## Evidence Gates

Every VERIFY above exits 0, then:

- **tests:** `node --test tests/sprint-02/adapter-pi.test.mjs`. Expected: exit 0 with 2 passing tests
- **regression-sprint-01:** `node --test tests/sprint-01/grd-01-twelve-cells.test.mjs tests/sprint-01/grd-06-missing-key.test.mjs`. Expected: exit 0: the twelve-cell plan and the keyless rules still hold
- **validate:** `pnpm validate`. Expected: exit 0

## Review Criteria

Must pass:

- One test per AC, named exactly as its TEST_FUNCTION.
- The refusal is persisted as a capture, so each check still cites evidence.
- No code path can reach a provider but `google`.
- A stream whose assistant `message_end` names another provider reads `provider-mismatch`.

Should verify:

- `get_commands` runs with `--offline`, so no network call decides the list.
- A skill from outside the plugin root is not counted.

Verdict: APPROVED or NEEDS_FIXES, with file and line for each finding.

## Dependencies

- **Depends on:** GAW-1 (the adapter contract, declarations, stance table and real-cli test harness this adapter builds on), GAW-2 (the stop_at option its must-ask entry passes to the runtime)
- **Blocks:** E8

## Notes

- **Flows:** owns no locked flow. Both ACs are task-local, and FLOW-GRD-01 to FLOW-GRD-04 replay the hosted cells through the gate steps above.
- **No gate:** Pi's no-gate row is owner-approved, so this adapter has no `controlProbeEntry` and its `exit0-denied-read` reads not applicable. Gate step 22 reads the provider on the hosted run.
- **Provenance:** prd 09-technical-requirements/02-system-components.md pi-adapter; 08-technical-risks.md R-pi-model-call

<!-- REQUIREMENT-CONTRACT v1 -->
<!--
{"version":"1","task_id":"GAW-6","task_type":"FEATURE","tdd_mode":"red_first","verification_policy":{"requires_tests":true,"requires_red_evidence":true,"requires_seeded_evidence":true},"guardrails":{"write_allowed":["test/harness/adapters/pi.mjs (NEW)","test/harness/adapters/registry.mjs (MODIFY)","tests/sprint-02/adapter-pi.test.mjs (NEW)"],"write_prohibited":[".github/workflows/harness-eval.yml - Pi has no denied-write probe to wire","test/harness/graders/** - adapters do not grade","test/harness/stream/** - E8 owns Pi's table","plugins/pixel-perfect/** - no plugin change in this task","Any file not listed in WRITE-ALLOWED"]},"fixtures":{"seed/pinned-pi":{"description":"Pi at the pinned version installed by npm under a temp prefix with --ignore-scripts, a temp HOME, and an allowlisted env holding no provider key","seed_method":"cli","records":["pi --version prints 1.0.4"]}},"verification_gates":[{"gate":"tests","command":"node --test tests/sprint-02/adapter-pi.test.mjs","expected":"exit 0 with 2 passing tests","positive_example":"both ADAPTER-PI tests pass against the pinned CLI in a temp HOME"},{"gate":"regression-sprint-01","command":"node --test tests/sprint-01/grd-01-twelve-cells.test.mjs tests/sprint-01/grd-06-missing-key.test.mjs","expected":"exit 0: the twelve-cell plan and the keyless rules still hold","positive_example":"both sprint-01 files pass with pi registered"},{"gate":"validate","command":"pnpm validate","expected":"exit 0","positive_example":"every repo validator prints its pass line"}],"integration_obligations":[],"requirements":[{"id":"AC-1","type":"acceptance_criterion","primary":true,"description":"GIVEN the pinned Pi CLI installed with `--ignore-scripts` in a temp HOME, with an allowlisted env holding no provider key WHEN the adapter's keyless load runs against this checkout, then its list THEN 11 of 11 command names appear, including `status` from `skill:pixel-perfect-status`, `observed_cli_version` reads `1.0.4` with `identity_decision.ok` true, and `model_request_count` stays 0","flow_ref":null,"test_file":"tests/sprint-02/adapter-pi.test.mjs","test_function":"ADAPTER-PI-KEYLESS-LOAD","verify":"node --test --test-name-pattern 'ADAPTER-PI-KEYLESS-LOAD' tests/sprint-02/adapter-pi.test.mjs","test_tier":"integration","verification_service":"real Pi CLI at the pinned version in a temp HOME","surface_policy":null,"positive_example":"Fresh temp HOME: identity approved at 1.0.4 and 11 names returned from get_commands with the plugin root as their source.","red":"On base the registry answers pi-adapter-not-implemented, no load runs, and the command assertion fails.","maps_to_ac":null,"scenario":{"tier":"visible","test_tier":"integration","verification_service":"real Pi CLI at the pinned version in a temp HOME","topology":"single-node","negative_control":{"would_fail_if":["the list is a static array of names","a skill from outside the plugin root is counted","the --offline flag is omitted and a network call decides the list"]},"evidence":{"forms":["file_artifact","stdout"],"examples":["get_commands reply names"],"required_capture":true},"build_proof":{"range":"anything that proves Pi itself resolves the checkout's skills","examples":["filtering get_commands by its own source path"]},"cases":[{"start_ref":"seed/pinned-pi","action":{"actor":"runner","steps":["run the adapter's keyless load against this checkout, then its list"]},"end_state":{"must_observe":["11 of 11 command names, including `status` from `skill:pixel-perfect-status`","`observed_cli_version` is `1.0.4` and identity_decision.ok is true"],"must_not_observe":["0 skills from the plugin root","a model request: `model_request_count` above 0"]}}]}},{"id":"AC-2","type":"acceptance_criterion","primary":true,"description":"GIVEN that install with no provider key in the child env and `OPENROUTER_API_KEY` set to a placeholder in the parent env WHEN the preflight runs, and the graded entries' argv is read THEN the auth check prints `status` `not_ready`, the check reads `pi-auth-not-ready` with `model_request_count` 0, each argv holds `--provider` `google` and `--model` `gemini-2.5-pro`, and `OPENROUTER_API_KEY` is absent from the child env","flow_ref":null,"test_file":"tests/sprint-02/adapter-pi.test.mjs","test_function":"ADAPTER-PI-AUTH-PREFLIGHT","verify":"node --test --test-name-pattern 'ADAPTER-PI-AUTH-PREFLIGHT' tests/sprint-02/adapter-pi.test.mjs","test_tier":"integration","verification_service":"real Pi auth check and real JSON-mode run with no credential in the child env","surface_policy":null,"positive_example":"No key in the child env: auth check prints status not_ready, the adapter reads could-not-run pi-auth-not-ready, and no message_end from any provider exists.","red":"On base no pi adapter exists, so the preflight reason is absent and this test fails.","maps_to_ac":null,"scenario":{"tier":"visible","test_tier":"integration","verification_service":"real Pi auth check and real JSON-mode run with no credential in the child env","topology":"single-node","negative_control":{"would_fail_if":["the preflight is removed and the run falls through to another provider's key","the argv uses the slash form, so the model id resolves on an alternate provider","the exit code is read as the verdict"]},"evidence":{"forms":["stdout","file_artifact"],"examples":["auth check JSON"],"required_capture":true},"build_proof":{"range":"anything that proves Pi cannot answer through any provider but the pinned one","examples":["--provider google in the argv and a provider check over the stream"]},"cases":[{"start_ref":"seed/pinned-pi","action":{"actor":"runner","steps":["run the preflight with no provider key in the child env, and with OPENROUTER_API_KEY=placeholder in the parent env","read the graded entries' argv"]},"end_state":{"must_observe":["auth check prints `status` `not_ready`","the check reads reason `pi-auth-not-ready` with `model_request_count` 0","each argv holds `--provider` `google` and `--model` `gemini-2.5-pro`"],"must_not_observe":["`OPENROUTER_API_KEY` in the child env","an argv holding the slash form `google/gemini-2.5-pro`","an empty auth check reply"]}}]}},{"id":"TC-1","type":"test_criterion","description":"The load finds 11 of 11 command names when `get_commands` runs with no key","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'ADAPTER-PI-KEYLESS-LOAD' tests/sprint-02/adapter-pi.test.mjs","positive_example":"Fresh temp HOME: identity approved at 1.0.4 and 11 names returned from get_commands with the plugin root as their source."},{"id":"TC-2","type":"test_criterion","description":"`observed_cli_version` reads `1.0.4` when the keyless load finishes","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'ADAPTER-PI-KEYLESS-LOAD' tests/sprint-02/adapter-pi.test.mjs","positive_example":"Fresh temp HOME: identity approved at 1.0.4 and 11 names returned from get_commands with the plugin root as their source."},{"id":"TC-3","type":"test_criterion","description":"The auth check prints `not_ready` when the child env holds no provider key","maps_to_ac":"AC-2","verify":"node --test --test-name-pattern 'ADAPTER-PI-AUTH-PREFLIGHT' tests/sprint-02/adapter-pi.test.mjs","positive_example":"No key in the child env: auth check prints status not_ready, the adapter reads could-not-run pi-auth-not-ready, and no message_end from any provider exists."},{"id":"TC-4","type":"test_criterion","description":"The check reads reason `pi-auth-not-ready` when the auth check prints `not_ready`","maps_to_ac":"AC-2","verify":"node --test --test-name-pattern 'ADAPTER-PI-AUTH-PREFLIGHT' tests/sprint-02/adapter-pi.test.mjs","positive_example":"No key in the child env: auth check prints status not_ready, the adapter reads could-not-run pi-auth-not-ready, and no message_end from any provider exists."},{"id":"TC-5","type":"test_criterion","description":"Each graded argv holds `--provider` `google` when read from the table","maps_to_ac":"AC-2","verify":"node --test --test-name-pattern 'ADAPTER-PI-AUTH-PREFLIGHT' tests/sprint-02/adapter-pi.test.mjs","positive_example":"No key in the child env: auth check prints status not_ready, the adapter reads could-not-run pi-auth-not-ready, and no message_end from any provider exists."},{"id":"TC-6","type":"test_criterion","description":"`OPENROUTER_API_KEY` is absent from the child env when the parent env holds it","maps_to_ac":"AC-2","verify":"node --test --test-name-pattern 'ADAPTER-PI-AUTH-PREFLIGHT' tests/sprint-02/adapter-pi.test.mjs","positive_example":"No key in the child env: auth check prints status not_ready, the adapter reads could-not-run pi-auth-not-ready, and no message_end from any provider exists."}]}
-->
