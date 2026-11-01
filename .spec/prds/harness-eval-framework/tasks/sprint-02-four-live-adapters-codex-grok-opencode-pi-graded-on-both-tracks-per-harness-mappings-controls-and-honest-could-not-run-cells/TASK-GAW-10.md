# TASK-GAW-10: Keep a headless OpenCode session alive with the shipped plugin

> Task ID: GAW-10
> Sprint: [SPRINT.md](./SPRINT.md)
> Status: Backlog
> Assignee: ai-tooling-implementer
> Priority: P0
> Points: 1
> Type: FEATURE
> Planner: github-agentic-workflow-planner
> Reviewer: ai-tooling-reviewer
> Proposed By: github-agentic-workflow-planner
> Wave: C
> TDD_MODE: red_first · RED_GREEN_REQUIRED: true

AGENT: planner=github-agentic-workflow-planner | implementer=ai-tooling-implementer | reviewer=ai-tooling-reviewer

## Background

- **Problem:** `plugins/pixel-perfect/.opencode/plugins/pixel-perfect.ts` returns nothing, and OpenCode expects a hooks object. With the real INSTALL.md copies at 1.18.34 and 1.19.5, a headless run ends in `Unexpected server error` and its session holds no user message. The log at 1.18.34 reads `plugin config hook failed: undefined is not an object (evaluating 'N.config')`.
- **Why it matters:** until this lands, every graded OpenCode check reads could-not-run `opencode-no-user-message`, and E7 has no model events to qualify. ROADMAP D-06 funds this fix.
- **Gate steps that exercise this task:** 21. Capability: CAP-EVAL-01.

## Critical Constraints

- **MUST:** Change only what PixelPerfectPlugin returns: an empty hooks object on both paths. Its check and its stderr diagnostic stay as they are, and test/adapters.test.mjs lines 120-160 stay green.
- **MUST:** The proof uses the real INSTALL.md copies, the CLI at the pinned version and at the version the newest lookup resolves, an empty env, and a placeholder key the API rejects. Nothing is spent.
- **NEVER** leave the plugin module out of the copies to get a run through: INSTALL.md's install is what is under test.

## Specification

- **Objective:** A headless OpenCode run with the shipped plugin installed reaches its command at the pinned version and at the version the newest lookup resolves.
- **Success state:** At both versions, `opencode export` shows 1 user message holding `Invocation input: --platform web-desktop`, and the stream holds no `Unexpected server error`.

## Acceptance Criteria (GIVEN-WHEN-THEN)

### AC-1: A headless run reaches the command with the plugin installed, on both tracked versions [PRIMARY]

- **GIVEN:** a fresh project holding the INSTALL.md real copies, including the plugin module, with the CLI installed under a temp prefix and temp HOME
- **WHEN:** `opencode run --command pixel-perfect/status --format json -- --platform web-desktop` runs with the placeholder key at each version, and `opencode export` reads that session in a keyless child
- **THEN:** the export holds 1 user message at each of the 2 versions, that message holds `Invocation input: --platform web-desktop`, and the stream holds no `Unexpected server error`

```text
FLOW_REF:              null
TEST_TIER:             integration
VERIFICATION_SERVICE:  real opencode-ai at the pinned and newest versions, with an empty env and a placeholder key the API rejects
SURFACE_POLICY:        null
TDD_STATE:             none
TEST_FILE:             tests/sprint-02/opencode-plugin-session.test.mjs
TEST_FUNCTION:         OPENCODE-PLUGIN-KEEPS-SESSION
VERIFY:                node --test --test-name-pattern 'OPENCODE-PLUGIN-KEEPS-SESSION' tests/sprint-02/opencode-plugin-session.test.mjs
```

SCENARIO_SUMMARY: Real copies at both versions with a key the API rejects: the session keeps its user message and the arguments reach the command.

Each AC's RED input and positive example are in its row of the contract block below.

## Test Criteria

Each TC runs its mapped AC's VERIFY.

| ID | Statement | Maps to |
|---|---|---|
| TC-1 | The export holds 1 user message at the pinned version when the run uses the shipped module | AC-1 |
| TC-2 | The export holds 1 user message at the newest resolved version when the run uses the shipped module | AC-1 |
| TC-3 | The user message holds `Invocation input: --platform web-desktop` when those arguments follow `--` | AC-1 |
| TC-4 | The stream holds no `Unexpected server error` when the module returns a hooks object | AC-1 |

## Reading List

1. `plugins/pixel-perfect/.opencode/plugins/pixel-perfect.ts` lines 1-25: the module that returns nothing
2. `INSTALL.md` lines 120-157: the copies that put it in every project
3. `test/adapters.test.mjs` lines 120-160: the existing checks on this module

Standards: `AGENTS.md`, `brain/docs/kanban/SCENARIO-CONTRACT-V1.md`.

## Guardrails

WRITE-ALLOWED:

- plugins/pixel-perfect/.opencode/plugins/pixel-perfect.ts (MODIFY)
- tests/sprint-02/opencode-plugin-session.test.mjs (NEW)

WRITE-PROHIBITED:

- plugins/pixel-perfect/** except the named module - nothing else in the plugin changes
- test/adapters.test.mjs - it stays green unedited
- INSTALL.md - the install under test stays as it is
- Any file not listed in WRITE-ALLOWED

## Code Pattern

```ts
// plugins/pixel-perfect/.opencode/plugins/pixel-perfect.ts:13-16: both paths return nothing today.
export async function PixelPerfectPlugin(context: PluginContext = {}): Promise<void> {
  const projectRoot = context.directory ?? process.cwd();
  const namespacedCommand = join(projectRoot, ".opencode/commands/pixel-perfect/init.md");
  if (existsSync(namespacedCommand)) return;
```

- **Anti-pattern:** Adding a hook; changing the diagnostic; testing with a copy of the module that differs from the shipped file.

## Design

None. This task has no UI surface.

## Agent Instructions

One RED, GREEN, REFACTOR cycle. Install through `tests/sprint-02/real-cli.mjs` from GAW-1. Start every child from an empty env plus the literal placeholder key, so the API rejects it and nothing is spent. Never use the real HOME.

## Orchestrator Verification Protocol

1. **VERIFY_RED:** VERIFY fails on base with 0 user messages at both versions.
2. **VERIFY_GREEN:** VERIFY exits 0.
3. Run every Evidence Gate and compare with Expected.
4. `git diff --name-only` lists only WRITE-ALLOWED paths.
5. Dispatch `ai-tooling-reviewer` with this file, the RED and GREEN output, and the evidence.

## Agent Assignment

- **Planner:** `github-agentic-workflow-planner`
- **Implementer:** `ai-tooling-implementer`
- **Reviewer:** `ai-tooling-reviewer`
- **Rationale:** `ai-tooling-implementer` owns the OpenCode plugin surface. `ai-tooling-reviewer` checks the plugin contract against the real CLI.

## Evidence Gates

Every VERIFY above exits 0, then:

- **tests:** `node --test tests/sprint-02/opencode-plugin-session.test.mjs`. Expected: exit 0 with 1 passing test
- **regression-adapters:** `node --test test/adapters.test.mjs`. Expected: exit 0: the module's check and stderr diagnostic hold
- **validate:** `pnpm validate`. Expected: exit 0

## Review Criteria

Must pass:

- The test name is exactly OPENCODE-PLUGIN-KEEPS-SESSION.
- RED shows the shipped module failing at both versions.
- Only the return value changes.
- The proof loads the shipped file through the INSTALL.md copies.

Should verify:

- No key other than the literal placeholder reaches a child.

Verdict: APPROVED or NEEDS_FIXES, with file and line for each finding.

## Dependencies

- **Depends on:** GAW-1 (the real-cli test harness this proof installs the CLI through)
- **Blocks:** E7

## Notes

- **Flows:** owns no locked flow. AC-1 is task-local; gate step 21 replays the outcome on a hosted run, which is why this task sits in that step's exercises.
- **Plugin boundary:** the sprint-01 handoff kept `plugins/` off limits until a graded run named a defect. The owner accepted this fix in D-06.
- **Provenance:** keyless probes of opencode-ai 1.18.34 and 1.19.5 during the sprint-02 fusion round

<!-- REQUIREMENT-CONTRACT v1 -->
<!--
{"version":"1","task_id":"GAW-10","task_type":"FEATURE","tdd_mode":"red_first","verification_policy":{"requires_tests":true,"requires_red_evidence":true,"requires_seeded_evidence":true},"guardrails":{"write_allowed":["plugins/pixel-perfect/.opencode/plugins/pixel-perfect.ts (MODIFY)","tests/sprint-02/opencode-plugin-session.test.mjs (NEW)"],"write_prohibited":["plugins/pixel-perfect/** except the named module - nothing else in the plugin changes","test/adapters.test.mjs - it stays green unedited","INSTALL.md - the install under test stays as it is","Any file not listed in WRITE-ALLOWED"]},"fixtures":{"seed/real-copy-install":{"description":"A fresh project directory holding the INSTALL.md real copies from this checkout, including the plugin module, with the CLI installed under a temp prefix and a temp HOME","seed_method":"cli","records":["11 commands under .opencode/commands/pixel-perfect and 1 module under .opencode/plugins"]}},"verification_gates":[{"gate":"tests","command":"node --test tests/sprint-02/opencode-plugin-session.test.mjs","expected":"exit 0 with 1 passing test","positive_example":"OPENCODE-PLUGIN-KEEPS-SESSION passes at both versions"},{"gate":"regression-adapters","command":"node --test test/adapters.test.mjs","expected":"exit 0: the module's check and stderr diagnostic hold","positive_example":"the existing OpenCode plugin tests pass unedited"},{"gate":"validate","command":"pnpm validate","expected":"exit 0","positive_example":"every repo validator prints its pass line"}],"integration_obligations":[],"requirements":[{"id":"AC-1","type":"acceptance_criterion","primary":true,"description":"GIVEN a fresh project holding the INSTALL.md real copies, including the plugin module, with the CLI installed under a temp prefix and temp HOME WHEN `opencode run --command pixel-perfect/status --format json -- --platform web-desktop` runs with the placeholder key at each version, and `opencode export` reads that session in a keyless child THEN the export holds 1 user message at each of the 2 versions, that message holds `Invocation input: --platform web-desktop`, and the stream holds no `Unexpected server error`","flow_ref":null,"test_file":"tests/sprint-02/opencode-plugin-session.test.mjs","test_function":"OPENCODE-PLUGIN-KEEPS-SESSION","verify":"node --test --test-name-pattern 'OPENCODE-PLUGIN-KEEPS-SESSION' tests/sprint-02/opencode-plugin-session.test.mjs","test_tier":"integration","verification_service":"real opencode-ai at the pinned and newest versions, with an empty env and a placeholder key the API rejects","surface_policy":null,"positive_example":"With the module returning {}, opencode run ends in invalid x-api-key and opencode export shows a user message reading Invocation input: --platform web-desktop.","red":"On base the shipped module returns nothing, so opencode run ends in Unexpected server error and opencode export shows 0 user messages at both 1.18.34 and 1.19.5.","maps_to_ac":null,"scenario":{"tier":"visible","test_tier":"integration","verification_service":"real opencode-ai at the pinned and newest versions, with an empty env and a placeholder key the API rejects","topology":"single-node","negative_control":{"would_fail_if":["the module still returns nothing, so the session dies before its user message","the test omits the plugin module from the copies, so the shipped module is never loaded"]},"evidence":{"forms":["file_artifact","stdout"],"examples":["the session export's user message"],"required_capture":true},"build_proof":{"range":"anything that proves the shipped plugin leaves a headless OpenCode session able to reach its command","examples":["the module returning a hooks object"]},"cases":[{"start_ref":"seed/real-copy-install","action":{"actor":"runner","steps":["run opencode run --command pixel-perfect/status --format json -- --platform web-desktop with the placeholder key, at each version","run opencode export on that run's session in a keyless child"]},"end_state":{"must_observe":["the export holds 1 user message at each of the 2 versions","that message holds `Invocation input: --platform web-desktop`"],"must_not_observe":["`Unexpected server error` in the stream","an empty messages array in the export"]}}]}},{"id":"TC-1","type":"test_criterion","description":"The export holds 1 user message at the pinned version when the run uses the shipped module","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'OPENCODE-PLUGIN-KEEPS-SESSION' tests/sprint-02/opencode-plugin-session.test.mjs","positive_example":"With the module returning {}, opencode run ends in invalid x-api-key and opencode export shows a user message reading Invocation input: --platform web-desktop."},{"id":"TC-2","type":"test_criterion","description":"The export holds 1 user message at the newest resolved version when the run uses the shipped module","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'OPENCODE-PLUGIN-KEEPS-SESSION' tests/sprint-02/opencode-plugin-session.test.mjs","positive_example":"With the module returning {}, opencode run ends in invalid x-api-key and opencode export shows a user message reading Invocation input: --platform web-desktop."},{"id":"TC-3","type":"test_criterion","description":"The user message holds `Invocation input: --platform web-desktop` when those arguments follow `--`","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'OPENCODE-PLUGIN-KEEPS-SESSION' tests/sprint-02/opencode-plugin-session.test.mjs","positive_example":"With the module returning {}, opencode run ends in invalid x-api-key and opencode export shows a user message reading Invocation input: --platform web-desktop."},{"id":"TC-4","type":"test_criterion","description":"The stream holds no `Unexpected server error` when the module returns a hooks object","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'OPENCODE-PLUGIN-KEEPS-SESSION' tests/sprint-02/opencode-plugin-session.test.mjs","positive_example":"With the module returning {}, opencode run ends in invalid x-api-key and opencode export shows a user message reading Invocation input: --platform web-desktop."}]}
-->
