# TASK-GAW-3: Install, load and invoke Codex on both tracks

> Task ID: GAW-3
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

- **Problem:** Codex's cells read `codex-adapter-not-implemented` on both tracks, so nothing about Codex is graded. Gate step 6 counts 32 such reasons across the four harnesses on run 41235273928.
- **Owner decisions:** the sandbox split is an approved stance row, and the owner approved the user-namespace sysctl that GAW-I1 adds.
- **Gate steps that exercise this task:** 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 24, 25, 26. Capability: CAP-EVAL-01.

## Critical Constraints

- **MUST:** Install: npm install -g @openai/codex@<version>. Load, keyless: codex plugin marketplace add <workspace>, then codex plugin add pixel-perfect@pixel-perfect. Identity compares the digest of $CODEX_HOME/plugins/cache/pixel-perfect/pixel-perfect/<version> with the checkout; a stale cache is could-not-run.
- **MUST:** Keyless runner probe in the load: codex sandbox linux /bin/true. A failure reads could-not-run codex-sandbox-unavailable on status and verify, never a harness failure. The owner approved the user-namespace sysctl GAW-I1 adds.
- **MUST:** Run: codex exec '$pixel-perfect:<name> <args>' --json -o <file> -m gpt-6.1-sol --skip-git-repo-check with stdin closed. A status prompt also carries contract.mjs declarationFor's text; verify carries none, because the evaluator writes its report. Status and init use --sandbox read-only, and verify uses --sandbox workspace-write. CODEX_API_KEY reaches the exec child only.
- **STRICTLY:** That sandbox split is this harness's approved stance row. Ceiling: workspace-write lets the run write any file in its work dir, so the fixture's before and after hashes are what catch a stray write.
- **MUST:** controlProbeEntry: the required half asks to write work/keep.txt under --sandbox read-only, and the optional half asks to write outside the work dir. In this harness's keyed workflow step add one line, on the pinned track only: node test/harness/smoke/control-probe.mjs codex --cell-dir cell.

## Specification

- **Objective:** Codex installs, loads and runs through the adapter contract on both tracks, with status read-only and verify workspace-write.
- **Success state:** A keyless load at 0.160.1 proves the cached plugin's digest equals the checkout's and lists 11 of 11 commands. Each graded entry's argv records its approved sandbox, and no key means no request. The registry serves this adapter, and the keyed step runs the denied-write probe on pinned.

Contract details:

- List: codex debug prompt-input 'x', names matching pixel-perfect:[a-z-]*. Assert the plugin's 11 commands are present; the list holds 13, so never assert a count.
- Verified on this Mac at 0.160.1, no key: both plugin commands exit 0, the list returns 13 names, the cache digest equals the checkout digest, and gpt-6.1-sol is in codex debug models. Linux and any model run are unproven.
- FLOW-GRD-01 and the other flows' gate steps list this task, so the trunk replay proves these cells on a hosted run.

## Acceptance Criteria (GIVEN-WHEN-THEN)

### AC-1: The pinned CLI loads the checkout's plugin with no key and the identity is proven [PRIMARY]

- **GIVEN:** the pinned Codex CLI under a temp prefix with a temp HOME and CODEX_HOME and an allowlisted env
- **WHEN:** the adapter's keyless load runs against this checkout, then the identity check runs against a copy of the cache with one byte changed
- **THEN:** `observed_cli_version` reads `0.160.1` with `identity_decision.ok` true, 11 of 11 command names are present in a raw list of 13, and the changed copy reads `installation-identity-mismatch` naming `observed_plugin_manifest_sha256`

```text
FLOW_REF:              null
TEST_TIER:             integration
VERIFICATION_SERVICE:  real @openai/codex at the pinned version in a temp HOME
SURFACE_POLICY:        null
TDD_STATE:             none
TEST_FILE:             tests/sprint-02/adapter-codex.test.mjs
TEST_FUNCTION:         ADAPTER-CODEX-KEYLESS-LOAD
VERIFY:                node --test --test-name-pattern 'ADAPTER-CODEX-KEYLESS-LOAD' tests/sprint-02/adapter-codex.test.mjs
```

SCENARIO_SUMMARY: Fresh temp HOME at the pinned version: the plugin Codex loads is this checkout's, and one changed byte is caught.

### AC-2: Status and verify ask for different sandboxes, the probe is declared, and no key means no request [PRIMARY]

- **GIVEN:** the adapter's real invocation table with every credential removed
- **WHEN:** each graded entry and both probe entries run through the real guard and capture, and the persisted captures are read
- **THEN:** status holds `--sandbox` `read-only`, both verify entries hold `--sandbox` `workspace-write`, the required probe holds `read-only` with a prompt naming `work/keep.txt`, and each record reads `missing-api-key` with `model_request_count` 0

```text
FLOW_REF:              null
TEST_TIER:             integration
VERIFICATION_SERVICE:  real guard and capture over the adapter's real invocation table
SURFACE_POLICY:        null
TDD_STATE:             none
TEST_FILE:             tests/sprint-02/adapter-codex.test.mjs
TEST_FUNCTION:         ADAPTER-CODEX-SANDBOX-SPLIT
VERIFY:                node --test --test-name-pattern 'ADAPTER-CODEX-SANDBOX-SPLIT' tests/sprint-02/adapter-codex.test.mjs
```

SCENARIO_SUMMARY: Every entry refuses with no key, and its capture records the sandbox the stance row approves.

Each AC's RED input and positive example are in its row of the contract block below.

## Test Criteria

Each TC runs its mapped AC's VERIFY.

| ID | Statement | Maps to |
|---|---|---|
| TC-1 | `observed_cli_version` reads `0.160.1` when the keyless load finishes | AC-1 |
| TC-2 | The load finds 11 of 11 command names when the raw list holds 13 | AC-1 |
| TC-3 | Identity reads `installation-identity-mismatch` when one byte changes in a copy of the cache | AC-1 |
| TC-4 | The status entry's argv holds `--sandbox` `read-only` when read from its capture | AC-2 |
| TC-5 | Both verify entries' argv hold `--sandbox` `workspace-write` when read from their captures | AC-2 |
| TC-6 | Each record reads reason `missing-api-key` when no credential is set | AC-2 |

## Reading List

1. `test/harness/adapters/claude-code.mjs` lines 79-135: the invocation table this mirrors
2. `test/harness/adapters/claude-code.mjs` lines 1281-1341: runCheck, the guard and capture path
3. `test/harness/adapters/claude-code.mjs` lines 402-529: the denied-write probe entry shape
4. `test/harness/cases/verify-button-drift.json` lines 1-27: platform_arg and the case-declared report path
5. `.spec/prds/harness-eval-framework/09-technical-requirements/02-system-components.md` lines 77-83: codex-adapter

Standards: `AGENTS.md`, `brain/docs/kanban/SCENARIO-CONTRACT-V1.md`.

## Guardrails

WRITE-ALLOWED:

- test/harness/adapters/codex.mjs (NEW)
- test/harness/adapters/registry.mjs (MODIFY)
- .github/workflows/harness-eval.yml (MODIFY)
- tests/sprint-02/adapter-codex.test.mjs (NEW)

WRITE-PROHIBITED:

- test/harness/graders/** - adapters do not grade
- test/harness/stream/** - E5 owns Codex's table
- plugins/pixel-perfect/** - no plugin change in this task
- Any keyed step in `.github/workflows/harness-eval.yml` except Codex's, which gains one line
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

- **Anti-pattern:** `--dangerously-bypass-approvals-and-sandbox`; one sandbox for every check; asserting a count of 11 on the raw list; a stale cache or a missing sandbox reading fail.

## Design

None. This task has no UI surface.

## Agent Instructions

Work AC-1 then AC-2, one RED, GREEN, REFACTOR cycle each. Install through `tests/sprint-02/real-cli.mjs` from GAW-1. Every child starts from an empty env plus an allowlist, and no test holds a key. Model runs happen only in the hosted keyed step.

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

- **tests:** `node --test tests/sprint-02/adapter-codex.test.mjs`. Expected: exit 0 with 2 passing tests
- **regression-sprint-01:** `node --test tests/sprint-01/grd-01-twelve-cells.test.mjs tests/sprint-01/grd-06-missing-key.test.mjs`. Expected: exit 0: the twelve-cell plan and the keyless rules still hold
- **validate:** `pnpm validate`. Expected: exit 0

## Review Criteria

Must pass:

- One test per AC, named exactly as its TEST_FUNCTION.
- The digest is computed from the cache the install created.
- Status and verify carry different sandboxes.
- A keyless entry never spawns the CLI.
- The workflow gains only the one probe line, on the pinned track.

Should verify:

- `CODEX_API_KEY` reaches the exec child only.
- `codex sandbox linux /bin/true` runs in the load, keyless.

Verdict: APPROVED or NEEDS_FIXES, with file and line for each finding.

## Dependencies

- **Depends on:** GAW-1 (the adapter contract, declarations, stance table, probe runner and real-cli test harness this adapter builds on), GAW-2 (the stop_at option its must-ask entry passes to the runtime)
- **Blocks:** E5

## Notes

- **Flows:** owns no locked flow. Both ACs are task-local, and FLOW-GRD-01 to FLOW-GRD-04 replay the hosted cells through the gate steps above.
- **Unproven on this Mac:** Linux and any model run. The first hosted run decides them.
- **Provenance:** prd 09-technical-requirements/02-system-components.md codex-adapter

<!-- REQUIREMENT-CONTRACT v1 -->
<!--
{"version":"1","task_id":"GAW-3","task_type":"FEATURE","tdd_mode":"red_first","verification_policy":{"requires_tests":true,"requires_red_evidence":true,"requires_seeded_evidence":true},"guardrails":{"write_allowed":["test/harness/adapters/codex.mjs (NEW)","test/harness/adapters/registry.mjs (MODIFY)",".github/workflows/harness-eval.yml (MODIFY)","tests/sprint-02/adapter-codex.test.mjs (NEW)"],"write_prohibited":["test/harness/graders/** - adapters do not grade","test/harness/stream/** - E5 owns Codex's table","plugins/pixel-perfect/** - no plugin change in this task","Any keyed step in `.github/workflows/harness-eval.yml` except Codex's, which gains one line","Any file not listed in WRITE-ALLOWED"]},"fixtures":{"seed/pinned-codex":{"description":"@openai/codex at the pinned version installed by npm under a temp prefix, with a temp HOME and CODEX_HOME and an allowlisted env","seed_method":"cli","records":["codex --version prints codex-cli 0.160.1"]}},"verification_gates":[{"gate":"tests","command":"node --test tests/sprint-02/adapter-codex.test.mjs","expected":"exit 0 with 2 passing tests","positive_example":"both ADAPTER-CODEX tests pass against the pinned CLI"},{"gate":"regression-sprint-01","command":"node --test tests/sprint-01/grd-01-twelve-cells.test.mjs tests/sprint-01/grd-06-missing-key.test.mjs","expected":"exit 0: the twelve-cell plan and the keyless rules still hold","positive_example":"both sprint-01 files pass with codex registered"},{"gate":"validate","command":"pnpm validate","expected":"exit 0","positive_example":"every repo validator prints its pass line"}],"integration_obligations":[],"requirements":[{"id":"AC-1","type":"acceptance_criterion","primary":true,"description":"GIVEN the pinned Codex CLI under a temp prefix with a temp HOME and CODEX_HOME and an allowlisted env WHEN the adapter's keyless load runs against this checkout, then the identity check runs against a copy of the cache with one byte changed THEN `observed_cli_version` reads `0.160.1` with `identity_decision.ok` true, 11 of 11 command names are present in a raw list of 13, and the changed copy reads `installation-identity-mismatch` naming `observed_plugin_manifest_sha256`","flow_ref":null,"test_file":"tests/sprint-02/adapter-codex.test.mjs","test_function":"ADAPTER-CODEX-KEYLESS-LOAD","verify":"node --test --test-name-pattern 'ADAPTER-CODEX-KEYLESS-LOAD' tests/sprint-02/adapter-codex.test.mjs","test_tier":"integration","verification_service":"real @openai/codex at the pinned version in a temp HOME","surface_policy":null,"positive_example":"Fresh temp HOME: identity approved at 0.160.1, loaded digest equal to the checkout digest, and all 11 command names in the list.","red":"On base the registry answers codex-adapter-not-implemented, no load runs, and the identity assertion fails.","maps_to_ac":null,"scenario":{"tier":"visible","test_tier":"integration","verification_service":"real @openai/codex at the pinned version in a temp HOME","topology":"single-node","negative_control":{"would_fail_if":["the digest is computed from the checkout twice, so a stale cache passes","the list is a static array of names","a credential is present in the child env"]},"evidence":{"forms":["file_artifact","stdout"],"examples":["load.json identity and command names"],"required_capture":true},"build_proof":{"range":"anything that proves the plugin Codex runs is byte-for-byte this checkout's","examples":["hashing the plugin cache directory the install created"]},"cases":[{"start_ref":"seed/pinned-codex","action":{"actor":"runner","steps":["run the adapter's keyless load against this checkout","change one byte in a copy of the cache and run the identity check against that copy"]},"end_state":{"must_observe":["`observed_cli_version` is `0.160.1` and identity_decision.ok is true","11 of 11 command names present, and the raw list holds 13","the changed copy reads reason `installation-identity-mismatch` naming `observed_plugin_manifest_sha256`"],"must_not_observe":["a null loaded_plugin_root","a model request: `model_request_count` above 0"]}}]}},{"id":"AC-2","type":"acceptance_criterion","primary":true,"description":"GIVEN the adapter's real invocation table with every credential removed WHEN each graded entry and both probe entries run through the real guard and capture, and the persisted captures are read THEN status holds `--sandbox` `read-only`, both verify entries hold `--sandbox` `workspace-write`, the required probe holds `read-only` with a prompt naming `work/keep.txt`, and each record reads `missing-api-key` with `model_request_count` 0","flow_ref":null,"test_file":"tests/sprint-02/adapter-codex.test.mjs","test_function":"ADAPTER-CODEX-SANDBOX-SPLIT","verify":"node --test --test-name-pattern 'ADAPTER-CODEX-SANDBOX-SPLIT' tests/sprint-02/adapter-codex.test.mjs","test_tier":"integration","verification_service":"real guard and capture over the adapter's real invocation table","surface_policy":null,"positive_example":"Keyless run of every entry: refusal captures record --sandbox read-only for status and --sandbox workspace-write for verify, with the literal prompt starting $pixel-perfect:, and the required probe entry names work/keep.txt.","red":"On base no codex table exists, so reading its argv from a persisted refusal capture fails.","maps_to_ac":null,"scenario":{"tier":"visible","test_tier":"integration","verification_service":"real guard and capture over the adapter's real invocation table","topology":"single-node","negative_control":{"would_fail_if":["both checks use one sandbox, so the split is absent","the guard is removed and a keyless entry spawns the CLI"]},"evidence":{"forms":["file_artifact"],"examples":["capture.json argv"],"required_capture":true},"build_proof":{"range":"anything that proves the capability split and the keyless refusal hold for every codex entry","examples":["table rows naming their sandbox"]},"cases":[{"start_ref":"seed/pinned-codex","action":{"actor":"runner","steps":["run each graded entry and both probe entries with every credential removed and read the persisted captures"]},"end_state":{"must_observe":["status argv holds `--sandbox` `read-only`","both verify entries hold `--sandbox` `workspace-write`","the required probe's argv holds `--sandbox` `read-only` and a prompt naming `work/keep.txt`","each record reads reason `missing-api-key` with `model_request_count` 0"],"must_not_observe":["`--dangerously-bypass-approvals-and-sandbox` in any argv","a capture with no argv recorded"]}}]}},{"id":"TC-1","type":"test_criterion","description":"`observed_cli_version` reads `0.160.1` when the keyless load finishes","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'ADAPTER-CODEX-KEYLESS-LOAD' tests/sprint-02/adapter-codex.test.mjs","positive_example":"Fresh temp HOME: identity approved at 0.160.1, loaded digest equal to the checkout digest, and all 11 command names in the list."},{"id":"TC-2","type":"test_criterion","description":"The load finds 11 of 11 command names when the raw list holds 13","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'ADAPTER-CODEX-KEYLESS-LOAD' tests/sprint-02/adapter-codex.test.mjs","positive_example":"Fresh temp HOME: identity approved at 0.160.1, loaded digest equal to the checkout digest, and all 11 command names in the list."},{"id":"TC-3","type":"test_criterion","description":"Identity reads `installation-identity-mismatch` when one byte changes in a copy of the cache","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'ADAPTER-CODEX-KEYLESS-LOAD' tests/sprint-02/adapter-codex.test.mjs","positive_example":"Fresh temp HOME: identity approved at 0.160.1, loaded digest equal to the checkout digest, and all 11 command names in the list."},{"id":"TC-4","type":"test_criterion","description":"The status entry's argv holds `--sandbox` `read-only` when read from its capture","maps_to_ac":"AC-2","verify":"node --test --test-name-pattern 'ADAPTER-CODEX-SANDBOX-SPLIT' tests/sprint-02/adapter-codex.test.mjs","positive_example":"Keyless run of every entry: refusal captures record --sandbox read-only for status and --sandbox workspace-write for verify, with the literal prompt starting $pixel-perfect:, and the required probe entry names work/keep.txt."},{"id":"TC-5","type":"test_criterion","description":"Both verify entries' argv hold `--sandbox` `workspace-write` when read from their captures","maps_to_ac":"AC-2","verify":"node --test --test-name-pattern 'ADAPTER-CODEX-SANDBOX-SPLIT' tests/sprint-02/adapter-codex.test.mjs","positive_example":"Keyless run of every entry: refusal captures record --sandbox read-only for status and --sandbox workspace-write for verify, with the literal prompt starting $pixel-perfect:, and the required probe entry names work/keep.txt."},{"id":"TC-6","type":"test_criterion","description":"Each record reads reason `missing-api-key` when no credential is set","maps_to_ac":"AC-2","verify":"node --test --test-name-pattern 'ADAPTER-CODEX-SANDBOX-SPLIT' tests/sprint-02/adapter-codex.test.mjs","positive_example":"Keyless run of every entry: refusal captures record --sandbox read-only for status and --sandbox workspace-write for verify, with the literal prompt starting $pixel-perfect:, and the required probe entry names work/keep.txt."}]}
-->
