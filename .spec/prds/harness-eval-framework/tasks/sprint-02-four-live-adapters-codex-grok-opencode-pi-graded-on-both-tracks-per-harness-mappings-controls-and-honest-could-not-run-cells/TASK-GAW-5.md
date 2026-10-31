# TASK-GAW-5: Install, load and invoke OpenCode on both tracks through its namespaced commands

> Task ID: GAW-5
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

- **Problem:** OpenCode's cells read `opencode-adapter-not-implemented`. Its message is the only channel into a command, and nobody has shown fixture arguments reach it on a graded run.
- **Owner decisions:** ROADMAP D-06 proves the args channel this sprint, and GAW-10 fixes the plugin crash that blocks it. The owner confirmed `anthropic/claude-sonnet-4-5` and that `SMOKE_OPENCODE_KEY` is an Anthropic key.
- **Gate steps that exercise this task:** 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 21, 24, 25, 26. Capability: CAP-EVAL-01.

## Critical Constraints

- **MUST:** Run: opencode run --command pixel-perfect/<name> --model anthropic/claude-sonnet-4-5 --format json -- <message>, stdin closed. The owner confirmed that model and that SMOKE_OPENCODE_KEY is an Anthropic key. Never --auto.
- **MUST:** The message is the only channel into a command, and this sprint proves it. Status sends --platform, web-desktop and contract.mjs declarationFor's text as separate argv elements after --. Verify sends --platform and web-desktop. First-question sends no message. The -- is required: at 1.18.34, without it the CLI reads --platform as its own flag and prints usage.
- **MUST:** One hosted capture decides. If the export holds no user message, the session died before the command started: record the refusal opencode-no-user-message. If its user message lacks the fixture's arguments, record the refusal opencode-args-channel-failed. Each reads could-not-run, cites the capture, and is an honest result. Never fall back to another channel, and never grade a run whose arguments did not arrive.
- **STRICTLY:** OPENCODE_PERMISSION is the owner-approved row: {"bash":{"*":"deny","node *":"allow"},"edit":"deny","webfetch":"deny"}. Node scripts are allowed and nothing wider. It round-trips through debug config at 1.18.34; enforcement is unverified until a hosted capture shows it.
- **MUST:** Do not leave the plugin module out of the copies to get a run through: INSTALL.md's install is what is under test. At 1.18.34 and 1.19.5 the shipped module crashes a headless run before the user message exists, so until it is fixed these cells read opencode-no-user-message.

## Specification

- **Objective:** OpenCode installs and runs through its namespaced commands on both tracks, and each graded run proves from its own session whether its arguments reached the command.
- **Success state:** After a real-copy install, the CLI's own config lists 11 of 11 commands. Every graded argv holds its command with no `--auto`. A placeholder-key run's export shows the arguments in the user message, and a run they did not reach reads a named could-not-run. The registry serves this adapter, and the keyed step runs the denied-write probe on pinned.

Contract details:

- Install: npm install -g opencode-ai@<version> with OPENCODE_DISABLE_AUTOUPDATE=1. Load is per invocation directory, before the before-hash: real copies of plugins/pixel-perfect to .pixel-perfect/plugins/pixel-perfect, then the INSTALL.md copies into .opencode/commands, .opencode/skills and .opencode/plugins. Never a symlink.
- List: file stems of .opencode/commands/pixel-perfect/*.md. A missing directory is could-not-run, not fail. The flat path .opencode/commands/*.md matches nothing and must not be read. opencode debug config prints provider config, so it runs only in a keyless step.
- After each graded run, take the sessionID from the stream's first event, run opencode export <sessionID> in a keyless child, and persist the output as session-export.json beside that invocation's capture, so GAW-9 exports it and E7 can read it.
- controlProbeEntry: the required half asks to write work/keep.txt under that edit deny rule, and the optional half asks to write outside the work dir. Neither carries fixture args. In this harness's keyed workflow step add one line, on the pinned track only: node test/harness/smoke/control-probe.mjs opencode --cell-dir cell.
- Skipped on purpose: the opencode serve command.list fallback. Both tracked versions list through the directory, and that fallback only matters on the 2.x line, which npm does not serve. Add it if the owner moves a track to 2.x.
- Verified on this Mac at 1.18.34, no key: run --help reads the command to run, use message for args; debug config lists all 11 pixel-perfect/<name> keys after a real-copy install; the copied plugin digest equals the checkout digest. Verified at 1.18.34 and 1.19.5 with an empty env and a placeholder key the API rejects, using a plugin module that returns {}: the export's user message reads Invocation input: --platform web-desktop "PROBE SENTINEL". No model has answered yet.
- Test placeholder runs use an empty env plus the literal placeholder, so nothing else can answer and nothing is spent.
- FLOW-GRD-01 and the other flows' gate steps list this task, so the trunk replay proves these cells on a hosted run.

## Acceptance Criteria (GIVEN-WHEN-THEN)

### AC-1: The pinned CLI registers all eleven namespaced commands from real copies [PRIMARY]

- **GIVEN:** the pinned OpenCode CLI in a temp HOME and a fresh invocation directory
- **WHEN:** the adapter's keyless load runs, then runs again with the commands directory removed
- **THEN:** `opencode debug config` lists 11 of 11 names including `pixel-perfect/status`, `observed_cli_version` reads `1.18.34` with `identity_decision.ok` true, and the removed directory reads `could-not-run` on command_list

```text
FLOW_REF:              null
TEST_TIER:             integration
VERIFICATION_SERVICE:  real opencode-ai at the pinned version in a temp HOME
SURFACE_POLICY:        null
TDD_STATE:             none
TEST_FILE:             tests/sprint-02/adapter-opencode.test.mjs
TEST_FUNCTION:         ADAPTER-OPENCODE-KEYLESS-LOAD
VERIFY:                node --test --test-name-pattern 'ADAPTER-OPENCODE-KEYLESS-LOAD' tests/sprint-02/adapter-opencode.test.mjs
```

SCENARIO_SUMMARY: A real-copy install registers every command with OpenCode itself, and a missing directory never reads as fail.

### AC-2: The graded argv never self-approves, the message reaches the command, and a run it did not reach reads could-not-run [PRIMARY]

- **GIVEN:** the adapter's invocation table at the pinned CLI, with an empty env and a placeholder key the API rejects
- **WHEN:** each graded entry runs keyless and its argv is read, then the status entry runs with the placeholder key under a plugin module returning `{}`, then under one returning nothing, then with its message dropped, and `opencode debug config` reads the permission
- **THEN:** each argv holds its command and `--format` `json` with no `--auto`, the first export's user message holds `Invocation input: --platform web-desktop`, the other two read `opencode-no-user-message` and `opencode-args-channel-failed`, and `permission` equals the adapter's rules

```text
FLOW_REF:              null
TEST_TIER:             integration
VERIFICATION_SERVICE:  real opencode run, export and debug config at the pinned version, with an empty env and a placeholder key the API rejects
SURFACE_POLICY:        null
TDD_STATE:             none
TEST_FILE:             tests/sprint-02/adapter-opencode.test.mjs
TEST_FUNCTION:         ADAPTER-OPENCODE-STANCE-AND-ARGS
VERIFY:                node --test --test-name-pattern 'ADAPTER-OPENCODE-STANCE-AND-ARGS' tests/sprint-02/adapter-opencode.test.mjs
```

SCENARIO_SUMMARY: A placeholder-key run shows the arguments reaching the command, and each run they did not reach reads a named could-not-run.

Each AC's RED input and positive example are in its row of the contract block below.

## Test Criteria

Each TC runs its mapped AC's VERIFY.

| ID | Statement | Maps to |
|---|---|---|
| TC-1 | `opencode debug config` lists 11 of 11 names when the load uses real copies | AC-1 |
| TC-2 | `command_list` reads `could-not-run` when the commands directory is removed | AC-1 |
| TC-3 | No path under `.opencode` is a symlink when the load finishes | AC-1 |
| TC-4 | No graded argv holds `--auto` when read from the captures | AC-2 |
| TC-5 | The export's user message holds `Invocation input: --platform web-desktop` when the plugin module returns `{}` | AC-2 |
| TC-6 | The check reads reason `opencode-no-user-message` when the plugin module returns nothing | AC-2 |
| TC-7 | The check reads reason `opencode-args-channel-failed` when the run's message is dropped | AC-2 |

## Reading List

1. `INSTALL.md` lines 120-157: the real-copy install block this adapter follows for checkout mode
2. `plugins/pixel-perfect/commands/status.md` lines 1-14: OpenCode's plugin root is .pixel-perfect/plugins/pixel-perfect
3. `test/harness/cases/status-a.json` lines 1-17: status also carries a platform_arg
4. `.spec/prds/harness-eval-framework/09-technical-requirements/02-system-components.md` lines 101-105: opencode-adapter
5. `test/harness/adapters/claude-code.mjs` lines 402-529: the denied-write probe entry shape

Standards: `AGENTS.md`, `brain/docs/kanban/SCENARIO-CONTRACT-V1.md`.

## Guardrails

WRITE-ALLOWED:

- test/harness/adapters/opencode.mjs (NEW)
- test/harness/adapters/registry.mjs (MODIFY)
- .github/workflows/harness-eval.yml (MODIFY)
- tests/sprint-02/adapter-opencode.test.mjs (NEW)

WRITE-PROHIBITED:

- plugins/pixel-perfect/** - GAW-10 owns the plugin fix
- test/harness/graders/** - adapters do not grade
- test/harness/stream/** - E7 owns OpenCode's table
- Any keyed step in `.github/workflows/harness-eval.yml` except OpenCode's, which gains one line
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

// The approved row, verbatim:
// OPENCODE_PERMISSION={"bash":{"*":"deny","node *":"allow"},"edit":"deny","webfetch":"deny"}
```

- **Anti-pattern:** A symlink under `.opencode`; `--auto`; another channel when the message fails; grading a run whose arguments did not arrive; `opencode debug config` in a keyed step.

## Design

None. This task has no UI surface.

## Agent Instructions

Work AC-1 then AC-2, one RED, GREEN, REFACTOR cycle each. Install through `tests/sprint-02/real-cli.mjs` from GAW-1. The plugin modules in AC-2 are test copies in a temp directory; never edit the shipped one here. Placeholder runs use an empty env plus the literal placeholder, so nothing else can answer and nothing is spent.

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

- **tests:** `node --test tests/sprint-02/adapter-opencode.test.mjs`. Expected: exit 0 with 2 passing tests
- **regression-sprint-01:** `node --test tests/sprint-01/grd-01-twelve-cells.test.mjs tests/sprint-01/grd-06-missing-key.test.mjs`. Expected: exit 0: the twelve-cell plan and the keyless rules still hold
- **validate:** `pnpm validate`. Expected: exit 0

## Review Criteria

Must pass:

- One test per AC, named exactly as its TEST_FUNCTION.
- The `--` sits before the message in every status and verify argv.
- Each run with no arguments in its session records a named refusal.
- `session-export.json` sits beside the invocation's capture.
- The workflow gains only the one probe line, on the pinned track.

Should verify:

- The export runs in a keyless child.
- Enforcement of the permission rules is checked in the first hosted capture, because it is unverified.

Verdict: APPROVED or NEEDS_FIXES, with file and line for each finding.

## Dependencies

- **Depends on:** GAW-1 (the adapter contract, declarations, stance table, probe runner and real-cli test harness this adapter builds on), GAW-2 (the stop_at option its must-ask entry passes to the runtime)
- **Blocks:** E7

## Notes

- **Flows:** owns no locked flow. Both ACs are task-local, and FLOW-GRD-01 to FLOW-GRD-04 replay the hosted cells through the gate steps above.
- **Plugin fix:** GAW-10 lands the module fix. Until it does, a real install reads `opencode-no-user-message`, which is honest. Gate step 21 reads the channel on the hosted run.
- **Open owner question:** should OpenCode's newest track keep following npm's `opencode-ai`, or OpenCode's GitHub releases? This task assumes npm until it is answered.
- **Provenance:** prd 09-technical-requirements/02-system-components.md opencode-adapter; 08-technical-risks.md R-opencode-layout

<!-- REQUIREMENT-CONTRACT v1 -->
<!--
{"version":"1","task_id":"GAW-5","task_type":"FEATURE","tdd_mode":"red_first","verification_policy":{"requires_tests":true,"requires_red_evidence":true,"requires_seeded_evidence":true},"guardrails":{"write_allowed":["test/harness/adapters/opencode.mjs (NEW)","test/harness/adapters/registry.mjs (MODIFY)",".github/workflows/harness-eval.yml (MODIFY)","tests/sprint-02/adapter-opencode.test.mjs (NEW)"],"write_prohibited":["plugins/pixel-perfect/** - GAW-10 owns the plugin fix","test/harness/graders/** - adapters do not grade","test/harness/stream/** - E7 owns OpenCode's table","Any keyed step in `.github/workflows/harness-eval.yml` except OpenCode's, which gains one line","Any file not listed in WRITE-ALLOWED"]},"fixtures":{"seed/pinned-opencode":{"description":"opencode-ai at the pinned version installed by npm under a temp prefix, with a temp HOME and an allowlisted env, and a fresh invocation directory","seed_method":"cli","records":["opencode --version prints 1.18.34"]}},"verification_gates":[{"gate":"tests","command":"node --test tests/sprint-02/adapter-opencode.test.mjs","expected":"exit 0 with 2 passing tests","positive_example":"both ADAPTER-OPENCODE tests pass against the pinned CLI"},{"gate":"regression-sprint-01","command":"node --test tests/sprint-01/grd-01-twelve-cells.test.mjs tests/sprint-01/grd-06-missing-key.test.mjs","expected":"exit 0: the twelve-cell plan and the keyless rules still hold","positive_example":"both sprint-01 files pass with opencode registered"},{"gate":"validate","command":"pnpm validate","expected":"exit 0","positive_example":"every repo validator prints its pass line"}],"integration_obligations":[],"requirements":[{"id":"AC-1","type":"acceptance_criterion","primary":true,"description":"GIVEN the pinned OpenCode CLI in a temp HOME and a fresh invocation directory WHEN the adapter's keyless load runs, then runs again with the commands directory removed THEN `opencode debug config` lists 11 of 11 names including `pixel-perfect/status`, `observed_cli_version` reads `1.18.34` with `identity_decision.ok` true, and the removed directory reads `could-not-run` on command_list","flow_ref":null,"test_file":"tests/sprint-02/adapter-opencode.test.mjs","test_function":"ADAPTER-OPENCODE-KEYLESS-LOAD","verify":"node --test --test-name-pattern 'ADAPTER-OPENCODE-KEYLESS-LOAD' tests/sprint-02/adapter-opencode.test.mjs","test_tier":"integration","verification_service":"real opencode-ai at the pinned version in a temp HOME","surface_policy":null,"positive_example":"Fresh invocation directory: 11 stems under .opencode/commands/pixel-perfect, debug config lists the same 11 keys, and the identity digest equals the checkout digest.","red":"On base the registry answers opencode-adapter-not-implemented, no load runs, and the command assertion fails.","maps_to_ac":null,"scenario":{"tier":"visible","test_tier":"integration","verification_service":"real opencode-ai at the pinned version in a temp HOME","topology":"single-node","negative_control":{"would_fail_if":["the install uses a symlink, so the CLI registers 0 commands","the list reads the flat path","the commands directory is absent and the check reads fail instead of could-not-run"]},"evidence":{"forms":["file_artifact","stdout"],"examples":["debug config command keys"],"required_capture":true},"build_proof":{"range":"anything that proves OpenCode itself sees the checkout's commands in this directory","examples":["the CLI's own command map after the copy"]},"cases":[{"start_ref":"seed/pinned-opencode","action":{"actor":"runner","steps":["run the adapter's keyless load into a fresh directory","run it again with the commands directory removed"]},"end_state":{"must_observe":["11 of 11 names, including `pixel-perfect/status`, in `opencode debug config`'s command map","`observed_cli_version` is `1.18.34` and identity_decision.ok is true","the removed directory reads `could-not-run` on command_list"],"must_not_observe":["a command_list `fail` on the removed directory","a symlink anywhere under `.opencode`","an empty command map with 0 keys on the first run"]}}]}},{"id":"AC-2","type":"acceptance_criterion","primary":true,"description":"GIVEN the adapter's invocation table at the pinned CLI, with an empty env and a placeholder key the API rejects WHEN each graded entry runs keyless and its argv is read, then the status entry runs with the placeholder key under a plugin module returning `{}`, then under one returning nothing, then with its message dropped, and `opencode debug config` reads the permission THEN each argv holds its command and `--format` `json` with no `--auto`, the first export's user message holds `Invocation input: --platform web-desktop`, the other two read `opencode-no-user-message` and `opencode-args-channel-failed`, and `permission` equals the adapter's rules","flow_ref":null,"test_file":"tests/sprint-02/adapter-opencode.test.mjs","test_function":"ADAPTER-OPENCODE-STANCE-AND-ARGS","verify":"node --test --test-name-pattern 'ADAPTER-OPENCODE-STANCE-AND-ARGS' tests/sprint-02/adapter-opencode.test.mjs","test_tier":"integration","verification_service":"real opencode run, export and debug config at the pinned version, with an empty env and a placeholder key the API rejects","surface_policy":null,"positive_example":"In a directory whose plugin module returns {}, the status entry's run leaves a session whose user message reads Invocation input: --platform web-desktop followed by the declaration, and no refusal is recorded. A plugin module returning nothing reads opencode-no-user-message. The same run with its message dropped reads opencode-args-channel-failed.","red":"On base no opencode table exists, so reading its argv from a persisted capture fails.","maps_to_ac":null,"scenario":{"tier":"visible","test_tier":"integration","verification_service":"real opencode run, export and debug config at the pinned version, with an empty env and a placeholder key the API rejects","topology":"single-node","negative_control":{"would_fail_if":["--auto is present in the argv","the -- is omitted, so the CLI reads --platform as its own flag","the export check is removed, so a run whose arguments never arrived is graded","the refusal persists no capture, so the check cites no evidence","the bare command name is used, so the plugin command is absent"]},"evidence":{"forms":["file_artifact","stdout"],"examples":["capture.json argv and session-export.json"],"required_capture":true},"build_proof":{"range":"anything that proves a keyed OpenCode step cannot approve itself, that fixture arguments and the status declaration reach the command, and that the run says so when they do not","examples":["a check of the exported session's user message"]},"cases":[{"start_ref":"seed/pinned-opencode","action":{"actor":"runner","steps":["run each graded entry with every credential removed and read the persisted captures' argv","run the status entry with the placeholder key in a directory whose plugin module returns {}, and read session-export.json","run it again in a directory whose plugin module returns nothing","run it again with the message dropped, and run opencode debug config in a keyless child with the adapter's OPENCODE_PERMISSION"]},"end_state":{"must_observe":["each argv holds `--command` `pixel-perfect/<name>` and `--format` `json`, status and verify hold `--` `--platform` `web-desktop`, and first-question holds no message","the export's user message holds `Invocation input: --platform web-desktop`, and no refusal is recorded","the module returning nothing reads reason `opencode-no-user-message`, and the dropped message reads reason `opencode-args-channel-failed`, each with at least 1 evidence path","debug config's `permission` equals the adapter's rules"],"must_not_observe":["`--auto` in any argv","a `pass` on a case whose arguments never reached the command","an empty argv in any capture"]}}]}},{"id":"TC-1","type":"test_criterion","description":"`opencode debug config` lists 11 of 11 names when the load uses real copies","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'ADAPTER-OPENCODE-KEYLESS-LOAD' tests/sprint-02/adapter-opencode.test.mjs","positive_example":"Fresh invocation directory: 11 stems under .opencode/commands/pixel-perfect, debug config lists the same 11 keys, and the identity digest equals the checkout digest."},{"id":"TC-2","type":"test_criterion","description":"`command_list` reads `could-not-run` when the commands directory is removed","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'ADAPTER-OPENCODE-KEYLESS-LOAD' tests/sprint-02/adapter-opencode.test.mjs","positive_example":"Fresh invocation directory: 11 stems under .opencode/commands/pixel-perfect, debug config lists the same 11 keys, and the identity digest equals the checkout digest."},{"id":"TC-3","type":"test_criterion","description":"No path under `.opencode` is a symlink when the load finishes","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'ADAPTER-OPENCODE-KEYLESS-LOAD' tests/sprint-02/adapter-opencode.test.mjs","positive_example":"Fresh invocation directory: 11 stems under .opencode/commands/pixel-perfect, debug config lists the same 11 keys, and the identity digest equals the checkout digest."},{"id":"TC-4","type":"test_criterion","description":"No graded argv holds `--auto` when read from the captures","maps_to_ac":"AC-2","verify":"node --test --test-name-pattern 'ADAPTER-OPENCODE-STANCE-AND-ARGS' tests/sprint-02/adapter-opencode.test.mjs","positive_example":"In a directory whose plugin module returns {}, the status entry's run leaves a session whose user message reads Invocation input: --platform web-desktop followed by the declaration, and no refusal is recorded. A plugin module returning nothing reads opencode-no-user-message. The same run with its message dropped reads opencode-args-channel-failed."},{"id":"TC-5","type":"test_criterion","description":"The export's user message holds `Invocation input: --platform web-desktop` when the plugin module returns `{}`","maps_to_ac":"AC-2","verify":"node --test --test-name-pattern 'ADAPTER-OPENCODE-STANCE-AND-ARGS' tests/sprint-02/adapter-opencode.test.mjs","positive_example":"In a directory whose plugin module returns {}, the status entry's run leaves a session whose user message reads Invocation input: --platform web-desktop followed by the declaration, and no refusal is recorded. A plugin module returning nothing reads opencode-no-user-message. The same run with its message dropped reads opencode-args-channel-failed."},{"id":"TC-6","type":"test_criterion","description":"The check reads reason `opencode-no-user-message` when the plugin module returns nothing","maps_to_ac":"AC-2","verify":"node --test --test-name-pattern 'ADAPTER-OPENCODE-STANCE-AND-ARGS' tests/sprint-02/adapter-opencode.test.mjs","positive_example":"In a directory whose plugin module returns {}, the status entry's run leaves a session whose user message reads Invocation input: --platform web-desktop followed by the declaration, and no refusal is recorded. A plugin module returning nothing reads opencode-no-user-message. The same run with its message dropped reads opencode-args-channel-failed."},{"id":"TC-7","type":"test_criterion","description":"The check reads reason `opencode-args-channel-failed` when the run's message is dropped","maps_to_ac":"AC-2","verify":"node --test --test-name-pattern 'ADAPTER-OPENCODE-STANCE-AND-ARGS' tests/sprint-02/adapter-opencode.test.mjs","positive_example":"In a directory whose plugin module returns {}, the status entry's run leaves a session whose user message reads Invocation input: --platform web-desktop followed by the declaration, and no refusal is recorded. A plugin module returning nothing reads opencode-no-user-message. The same run with its message dropped reads opencode-args-channel-failed."}]}
-->
