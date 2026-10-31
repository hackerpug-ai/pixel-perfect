# TASK-GAW-1: Run every keyed harness through one adapter contract, recording the version it really installed

> Task ID: GAW-1
> Sprint: [SPRINT.md](./SPRINT.md)
> Status: Backlog
> Assignee: ai-tooling-implementer
> Priority: P0
> Points: 8
> Type: FEATURE
> Planner: github-agentic-workflow-planner
> Reviewer: ai-tooling-reviewer
> Proposed By: github-agentic-workflow-planner
> Wave: B
> TDD_MODE: red_first · RED_GREEN_REQUIRED: true

AGENT: planner=github-agentic-workflow-planner | implementer=ai-tooling-implementer | reviewer=ai-tooling-reviewer

## Background

- **Problem:** `smoke/cell.mjs` and `smoke/install.mjs` call `claudeCode.*` directly, so no other harness can run. `install.mjs` line 95 and `cell.mjs` line 174 call `executeLoad` with no version, and `claude-code.mjs` lines 1475-1476 stamp the pin, so every newest cell whose version differs from the pin reads `installation-identity-mismatch`. `cellFor` drops per-check evidence paths. `guard.mjs` line 27 scrubs five named keys, and a probe on this Mac reached OpenRouter through a sixth.
- **Why it matters:** this is the foundation under the four adapters and E1. Nothing else in the sprint can run a second harness until this seam exists.
- **State of main:** T16 landed at 6872fbd with its status half working and its verify half live. GAW-11 removes the verify half and adds the node rule (ROADMAP D-02 and D-03), and this task starts after it.
- **Gate steps that exercise this task:** 3, 4, 5, 8, 10, 13, 14, 24. Capability: CAP-EVAL-01.

## Critical Constraints

- **MUST:** T16 is on main at 6872fbd: its status declaration works, and run 41249460968 at 36e864a shows claude-code status passing. GAW-11 removes its verify half and write allow-list and adds the node rule, so this record starts from that stance.
- **MUST:** Move nothing out of claude-code.mjs. GAW-11 and E1 edit named functions there, so a move collides with both. adapters/contract.mjs re-exports the harness-neutral pieces from claude-code.mjs (cellFor, approveIdentity, installationIdentity, manifestDigest, commandNames, statusSurfacePrompt) and adds only new code. Ceiling: a shared module imports from one adapter. Move the pieces once those tasks have landed, if that starts to hurt.
- **MUST:** That floor is a seam-stub. It never reports success, it is flagged in the code, and FLOW-GRD-02's trunk replay replaces it: step 11 reads stream_mapping, which only E1 produces. It is not complete work on its own.
- **MUST:** A harness with no row in the table is could-not-run stance-unrecorded. --trust, --auto, --always-approve, bypassPermissions and every --dangerously-* flag are refused in a stance for every harness.
- **MUST:** Credential scrubbing is an allowlist for keyless steps and a pattern for keyed ones: every *_API_KEY, *_TOKEN and SMOKE_* name except the step's own binding is removed. The current regex names five keys, and a probe on this Mac reached OpenRouter through a sixth.
- AC-4: UNIT_TEST_JUSTIFIED: the stance table is pure logic with zero I/O: an object in, a refusal or an approved argv out.
- AC-6: UNIT_TEST_JUSTIFIED: declarationFor is pure logic with zero I/O: a case manifest in, a string out.

## Specification

- **Objective:** Every keyed harness runs through one adapter contract in the shared cell loop, and each cell records the version its own track resolved plus four check rows that cite evidence.
- **Success state:** `runCell` and `installStep` get the adapter from the registry. A keyless claude-code leg through that loop yields 4 check rows, each citing a file on disk. A newest leg's `requested_cli_version` equals the version its track resolved. Five stance rows are the only runnable stances, and a keyless child holds no `_API_KEY` name.

Contract details:

- The contract is what an adapter supplies: installPlan, executeLoad, listCommands, invocationTable, controlProbeEntry when the harness has a permission gate, and the harness name and binary. Adapters install, load, list, invoke and capture. They do not grade status, verify or the first question. An adapter that finds a run unusable records a named refusal through capture.recordDecision, the path the guard already uses, so gradeInvocation and E2's writer see one shape.
- runCell grades through one seam with E1's signature, gradeInvocation({record, entry, track, installation}), exported by contract.mjs. It delegates to E1's export once that has landed. Before then it returns could-not-run stream-mapping-absent with the capture cited. claude-code keeps its own gradeCheck through an optional adapter.grade until E1 rewires it, so its cells do not regress.
- declarationFor({caseManifest}) in contract.mjs is the one place an adapter gets T16's status text. It returns that text for a status case and an empty string for every other case. The evaluator writes the verify report, so verify carries no declaration, and the first-question prompt stays as it is. Each adapter writes its own first token and appends this text.
- stance.mjs becomes a per-harness table of owner-approved rows, and it holds no path list for writes. claude-code is --permission-mode dontAsk --add-dir <plugin root> --allowedTools Bash(node *), the node rule GAW-11 adds. grok is --permission-mode dontAsk --allow Bash(node *). opencode is OPENCODE_PERMISSION with bash denied except node *, edit denied and webfetch denied. codex is --sandbox read-only for status and init and --sandbox workspace-write for verify. pi records no-approval-gate. Node scripts are allowed on every gated harness and nothing wider. No row admits a Write or Edit rule.
- executeLoad takes the track's resolved version. Its evidence dir sits under cell/evidence/load so the load captures can leave the runner.
- plugin_revision in checkout mode is the dispatch commit, recorded only when the loaded payload digest equals the checkout digest.
- This record owns the per-check evidence_paths field in cellFor and its schema entry. A check that never reached the CLI still cites a file: a refusal cites its persisted capture, and an install failure cites the install capture on all four checks. So every keyed cell has 4 evidenced rows.
- cellFor copies each check row whole instead of field by field, because E1 adds question_count and answers_delivered to the row. verify is graded from two invocations, so it keeps the worse row whole, with both invocations' evidence_paths. cellFor also keeps a top-level stream_mapping from its per-check cells; they share one table because they share one CLI version.
- runCell copies each invocation's existing report to <evidenceDir>/reports/<entry.key>/<file name> before it removes its work dirs. E2 writes each report in its invocation directory during grading. GAW-9 exports from there.
- runGuarded forwards stop_at to spawnCaptured, the option GAW-2 adds.
- This is the only denied-write probe runner for codex, grok and opencode: contract.mjs runProbe({adapter, env, evidenceDir, track}) runs an adapter's two controlProbeEntry halves through the same guard and capture, and smoke/control-probe.mjs is its CLI. It persists both captures. E3 adds the one call at the end of that file that attaches them through attachDeniedWriteProbe, where E2 writes reports/denied-write-probe.json. runProbe leaves its work dirs in place so GAW-9's export can still read that report. claude-code's T15 probe stays exactly as it is, because tests/sprint-01/t15-hosted-controls.test.mjs extracts that block. This record stays the one writer of smoke/model-step.mjs.
- tests/sprint-02/real-cli.mjs installs a pinned CLI under a temp prefix and temp HOME and starts every child from an empty env plus an allowlist. It never touches the real HOME and never installs globally.
- The three superseded sprint-01 tests assert REGISTERED is claude-code alone, which goes red on the first adapter. Change only these: grd-02-four-grades lines 577-578 assert REGISTERED contains claude-code; t13-smoke-observations lines 184, 220 and 792 and t15-hosted-controls line 252 pass a Set holding claude-code alone in place of REGISTERED.

## Acceptance Criteria (GIVEN-WHEN-THEN)

### AC-1: A newest leg records the version its track resolved [PRIMARY]

- **GIVEN:** the real claude CLI loaded keyless into a temp config dir
- **WHEN:** the adapter load runs with a resolved version equal to the host's `claude --version`, then with one a patch away
- **THEN:** the first run's `requested_cli_version` equals `observed_cli_version` with `identity_decision.ok` true, and the second reads `installation-identity-mismatch` naming `observed_cli_version`

```text
FLOW_REF:              null
TEST_TIER:             integration
VERIFICATION_SERVICE:  real claude CLI loaded keyless into a temp config dir
SURFACE_POLICY:        null
TDD_STATE:             none
TEST_FILE:             tests/sprint-02/adapter-contract.test.mjs
TEST_FUNCTION:         ADAPTER-CONTRACT-NEWEST-IDENTITY
VERIFY:                node --test --test-name-pattern 'ADAPTER-CONTRACT-NEWEST-IDENTITY' tests/sprint-02/adapter-contract.test.mjs
```

SCENARIO_SUMMARY: Keyless load at the host version, then one patch away: the first approves on the resolved version and the second refuses on `observed_cli_version`.

### AC-2: A keyless leg through the shared loop yields four whole check rows, each citing its own evidence [PRIMARY]

- **GIVEN:** that keyless load with every credential removed
- **WHEN:** `runCell` runs claude-code pinned and writes `cell.json`, and those per-check cells pass through `cellFor` again with `question_count`, `answers_delivered` and `stream_mapping` added
- **THEN:** `checks` holds 4 rows in order, each citing a file on disk, `command_list` reads `pass`, the other 3 read `could-not-run` `missing-api-key`, and the added fields survive

```text
FLOW_REF:              null
TEST_TIER:             integration
VERIFICATION_SERVICE:  real claude CLI and the real capture, guard and cell writer
SURFACE_POLICY:        null
TDD_STATE:             none
TEST_FILE:             tests/sprint-02/adapter-contract.test.mjs
TEST_FUNCTION:         ADAPTER-CONTRACT-FOUR-CHECKS-EVIDENCED
VERIFY:                node --test --test-name-pattern 'ADAPTER-CONTRACT-FOUR-CHECKS-EVIDENCED' tests/sprint-02/adapter-contract.test.mjs
```

SCENARIO_SUMMARY: Keyless claude-code leg: 4 ordered rows, each citing a real file, with one pass and three named refusals, and a whole row survives `cellFor`.

### AC-3: No keyless child inherits a credential the regex did not name [PRIMARY]

- **GIVEN:** a parent env holding `OPENROUTER_API_KEY`, `XAI_API_KEY1` and `GEMINI_API_KEY` set to a literal placeholder
- **WHEN:** one keyless child and one keyed child bound to `GEMINI_API_KEY` start through `spawnCaptured` and print their env names
- **THEN:** the keyless child prints 0 names matching `_API_KEY`, and the keyed child prints exactly `GEMINI_API_KEY`

```text
FLOW_REF:              null
TEST_TIER:             integration
VERIFICATION_SERVICE:  real child process started through spawnCaptured
SURFACE_POLICY:        null
TDD_STATE:             none
TEST_FILE:             tests/sprint-02/adapter-contract.test.mjs
TEST_FUNCTION:         ADAPTER-CONTRACT-ENV-SCRUB
VERIFY:                node --test --test-name-pattern 'ADAPTER-CONTRACT-ENV-SCRUB' tests/sprint-02/adapter-contract.test.mjs
```

SCENARIO_SUMMARY: Placeholder keys in the parent, two real children: 0 key names in the keyless child and only its binding in the keyed child.

### AC-4: Only the approved rows can run: node scripts on every gated harness and nothing wider

- **GIVEN:** the approved stance table
- **WHEN:** each of the 5 rows is recorded, then recorded again carrying each of 7 rejected entries
- **THEN:** each row is approved as the table states, and each rejected entry throws on 5 of 5 harnesses with `stance-mode-not-approved` for bypassPermissions and `stance-argv-not-approved` for the rest

```text
FLOW_REF:              null
TEST_TIER:             unit
VERIFICATION_SERVICE:  none: pure stance logic
SURFACE_POLICY:        null
TDD_STATE:             none
UNIT_TEST_JUSTIFIED:   the stance table is pure logic with zero I/O: an object in, a refusal or an approved argv out.
TEST_FILE:             tests/sprint-02/adapter-contract.test.mjs
TEST_FUNCTION:         ADAPTER-CONTRACT-STANCE-TABLE
VERIFY:                node --test --test-name-pattern 'ADAPTER-CONTRACT-STANCE-TABLE' tests/sprint-02/adapter-contract.test.mjs
```

SCENARIO_SUMMARY: The 5 approved rows record, and 7 wider entries throw on every harness with their named reasons.

### AC-5: A harness with no table reads stream-mapping-absent and still cites its capture [PRIMARY]

- **GIVEN:** a real child capture labelled codex at version 0.0.0
- **WHEN:** `gradeInvocation({record, entry, track, installation})` runs on it
- **THEN:** `verdict` reads `could-not-run`, `reason` reads `stream-mapping-absent`, and `evidence_paths` holds its `.capture.json` on disk

```text
FLOW_REF:              null
TEST_TIER:             integration
VERIFICATION_SERVICE:  real child process capture through the real seam
SURFACE_POLICY:        null
TDD_STATE:             none
TEST_FILE:             tests/sprint-02/adapter-contract.test.mjs
TEST_FUNCTION:         ADAPTER-CONTRACT-GRADE-FLOOR
VERIFY:                node --test --test-name-pattern 'ADAPTER-CONTRACT-GRADE-FLOOR' tests/sprint-02/adapter-contract.test.mjs
```

SCENARIO_SUMMARY: A real capture no table covers reads could-not-run `stream-mapping-absent` and cites that capture.

### AC-6: Only a status case gets a declaration, and it carries no value

- **GIVEN:** the real case manifests
- **WHEN:** `declarationFor` renders status-a, verify-button-drift, verify-clean and first-question-init
- **THEN:** the status-a text holds `Phase:` with no value, and the other three each return a string of length 0

```text
FLOW_REF:              null
TEST_TIER:             unit
VERIFICATION_SERVICE:  none: pure text composition over the real case manifests
SURFACE_POLICY:        null
TDD_STATE:             none
UNIT_TEST_JUSTIFIED:   declarationFor is pure logic with zero I/O: a case manifest in, a string out.
TEST_FILE:             tests/sprint-02/adapter-contract.test.mjs
TEST_FUNCTION:         ADAPTER-CONTRACT-DECLARATIONS
VERIFY:                node --test --test-name-pattern 'ADAPTER-CONTRACT-DECLARATIONS' tests/sprint-02/adapter-contract.test.mjs
```

SCENARIO_SUMMARY: Four real manifests: only status-a gets text, and that text holds no answer.

Each AC's RED input and positive example are in its row of the contract block below.

## Test Criteria

Each TC runs its mapped AC's VERIFY.

| ID | Statement | Maps to |
|---|---|---|
| TC-1 | `requested_cli_version` equals `observed_cli_version` when the load receives the host's resolved version | AC-1 |
| TC-2 | `identity_decision` reads `installation-identity-mismatch` when the resolved version is one patch from the host version | AC-1 |
| TC-3 | Each of the 4 check rows cites a file that exists when `runCell` finishes a keyless claude-code leg | AC-2 |
| TC-4 | `question_count` survives `cellFor` when a per-check row carries it | AC-2 |
| TC-5 | The keyless child prints 0 `_API_KEY` names when the parent env holds 3 of them | AC-3 |
| TC-6 | The keyed child prints `GEMINI_API_KEY` as its only `_API_KEY` name when that is its binding | AC-3 |
| TC-7 | `recordStance` throws `stance-argv-not-approved` when a row carries `Bash(*)` | AC-4 |
| TC-8 | `recordStance` throws `stance-mode-not-approved` when a row carries bypassPermissions | AC-4 |
| TC-9 | `gradeInvocation` returns reason `stream-mapping-absent` when no table covers the capture's version | AC-5 |
| TC-10 | `declarationFor` returns an empty string when the case is verify-button-drift | AC-6 |

## Reading List

1. `test/harness/smoke/cell.mjs` lines 139-259: runCell, the direct claudeCode calls that become the seam, and the cleanup in finally
2. `test/harness/smoke/install.mjs` lines 27-112: the install slot and the executeLoad call that drops the version
3. `test/harness/adapters/claude-code.mjs` lines 1448-1507: executeLoad and the hard-coded pin
4. `test/harness/adapters/claude-code.mjs` lines 1518-1582: cellFor, where per-check evidence paths are lost
5. `test/harness/adapters/claude-code.mjs` lines 402-529: the denied-write probe the shared runner mirrors
6. `test/harness/adapters/registry.mjs` lines 21-66: REGISTERED and IMPLEMENTATIONS
7. `test/harness/runtime/stance.mjs` lines 1-156: the exact argv check this generalizes; read it as GAW-11 leaves it, with no write list and the node rule
8. `test/harness/runtime/guard.mjs` lines 27-27: the five-name secret regex
9. `test/harness/adapters/claude-code.mjs` lines 158-197: STATUS_SURFACE and statusSurfacePrompt, the status text declarationFor wraps

Standards: `AGENTS.md`, `brain/docs/kanban/SCENARIO-CONTRACT-V1.md`.

## Guardrails

WRITE-ALLOWED:

- test/harness/adapters/contract.mjs (NEW)
- test/harness/adapters/claude-code.mjs (MODIFY)
- test/harness/adapters/registry.mjs (MODIFY)
- test/harness/smoke/cell.mjs (MODIFY)
- test/harness/smoke/install.mjs (MODIFY)
- test/harness/smoke/model-step.mjs (MODIFY)
- test/harness/smoke/control-probe.mjs (NEW)
- test/harness/runtime/stance.mjs (MODIFY)
- test/harness/runtime/guard.mjs (MODIFY)
- test/harness/schemas/harness-cell.v1.schema.json (MODIFY)
- tests/sprint-02/adapter-contract.test.mjs (NEW)
- tests/sprint-02/real-cli.mjs (NEW)
- tests/sprint-01/grd-02-four-grades.test.mjs (MODIFY)
- tests/sprint-01/t13-smoke-observations.test.mjs (MODIFY)
- tests/sprint-01/t15-hosted-controls.test.mjs (MODIFY)

WRITE-PROHIBITED:

- plugins/pixel-perfect/** - no plugin change in this task
- test/harness/graders/** - E1 and E2 own grading
- test/harness/stream/** - E1 and E4 to E8 own the tables
- .github/workflows/harness-eval.yml - GAW-3 to GAW-9 own its edits
- test/harness/smoke/observations.mjs - E2 and E3 own it
- Any file not listed in WRITE-ALLOWED

SUPERSEDES:

- tests/sprint-01/grd-02-four-grades.test.mjs
- tests/sprint-01/t13-smoke-observations.test.mjs
- tests/sprint-01/t15-hosted-controls.test.mjs

## Code Pattern

```js
// test/harness/runtime/stance.mjs, assertStance: approval is an exact argv comparison.
if (JSON.stringify(stance.argv) !== JSON.stringify(expected)) {
  throw new StanceError("stance-argv-not-approved", { argv: stance.argv ?? null, expected });
}

// test/harness/smoke/install.mjs:95: the call that drops the version.
const load = await claudeCode.executeLoad({ workspace, configDir, env, installMode });
```

- **Anti-pattern:** A deny-list of bad flags; a seam that returns pass; a `Write(` rule on any row; moving shared functions out of `claude-code.mjs`.

## Design

None. This task has no UI surface.

## Agent Instructions

Build `tests/sprint-02/real-cli.mjs` first. Then work AC-1 to AC-6 in order, one RED, GREEN, REFACTOR cycle each. Every child starts from an empty env plus an allowlist. Tests set only the literal placeholder as a key, so nothing is spent. Flag the grade floor as a seam-stub in the code, and report it as incomplete until E1 lands.

## Orchestrator Verification Protocol

1. Confirm GAW-11 is on `main` before dispatch; if it is not, hold this task.
2. **VERIFY_RED:** each VERIFY fails on base for the reason its RED names.
3. **VERIFY_GREEN:** each VERIFY exits 0.
4. Run every Evidence Gate and compare with Expected.
5. `git diff --name-only` lists only WRITE-ALLOWED paths.
6. Dispatch `ai-tooling-reviewer` with this file, the RED and GREEN output, and the evidence.

## Agent Assignment

- **Planner:** `github-agentic-workflow-planner`
- **Implementer:** `ai-tooling-implementer`
- **Reviewer:** `ai-tooling-reviewer`
- **Rationale:** `ai-tooling-implementer` owns harness adapter code and the plugin contract. `ai-tooling-reviewer` checks the contract against each harness's real surface.

## Evidence Gates

Every VERIFY above exits 0, then:

- **tests:** `node --test tests/sprint-02/adapter-contract.test.mjs`. Expected: exit 0 with 6 passing tests
- **superseded-sprint-01:** `node --test tests/sprint-01/grd-02-four-grades.test.mjs tests/sprint-01/t13-smoke-observations.test.mjs tests/sprint-01/t15-hosted-controls.test.mjs`. Expected: exit 0: claude-code cells do not regress through the new seam
- **validate:** `pnpm validate`. Expected: exit 0

## Review Criteria

Must pass:

- One test per AC, named exactly as its TEST_FUNCTION.
- Real RED output for every AC, each failing for its named reason.
- No stance row admits a `Write(` or `Edit(` rule, and no row is wider than node scripts.
- The grade floor returns no success and is flagged in the code as a seam-stub.
- Only the named lines change in the three superseded sprint-01 tests.

Should verify:

- `claude-code.mjs` lost no function and kept its T15 probe block unchanged.
- A failed install cites the install capture on all four checks.
- `real-cli.mjs` never touches the real HOME.

Verdict: APPROVED or NEEDS_FIXES, with file and line for each finding.

## Dependencies

- **Depends on:** GAW-11 (the stance with no write list and the claude-code node rule that this task's per-harness table carries forward)
- **Blocks:** E1, E3, E9, GAW-10, GAW-3, GAW-4, GAW-5, GAW-6, GAW-7, GAW-9

## Notes

- **Flows:** owns no locked flow. Every AC is task-local, and FLOW-GRD-01, FLOW-GRD-02 and FLOW-GRD-03 replay the outcome through the gate steps above.
- **Seam-stub:** the grade floor is contract-derived, never reports success, and is bonded to FLOW-GRD-02's trunk replay. It stays incomplete until E1 lands.
- **Sequencing:** ROADMAP D-07 runs this sprint only after sprint 01's gate is verified.
- **Line numbers:** the reading list is against 36e864a. GAW-11 removes about 60 lines above line 402 in `claude-code.mjs`, so expect those ranges to move up.
- **Split check:** Tried cutting the identity fix from the dispatch change. They cross the same two calls: install.mjs must ask the registry for the adapter and pass that adapter the track's resolved version, so a cut leaves one half unable to run. Stance is one small table only this record touches, and every adapter imports it with the contract.
- **Sizing:** Foundation under TASK SHAPE (f): smoke/cell.mjs and smoke/install.mjs call claudeCode.* directly, so no adapter can land until the seam exists.
- **Provenance:** .tmp/kb-sprint-tasks-plan/sprint-02-round/input/prior-evidence.json#newest_hosted_run.cells[harness=claude-code,track=newest]

<!-- REQUIREMENT-CONTRACT v1 -->
<!--
{"version":"1","task_id":"GAW-1","task_type":"FEATURE","tdd_mode":"red_first","verification_policy":{"requires_tests":true,"requires_red_evidence":true,"requires_seeded_evidence":true},"guardrails":{"write_allowed":["test/harness/adapters/contract.mjs (NEW)","test/harness/adapters/claude-code.mjs (MODIFY)","test/harness/adapters/registry.mjs (MODIFY)","test/harness/smoke/cell.mjs (MODIFY)","test/harness/smoke/install.mjs (MODIFY)","test/harness/smoke/model-step.mjs (MODIFY)","test/harness/smoke/control-probe.mjs (NEW)","test/harness/runtime/stance.mjs (MODIFY)","test/harness/runtime/guard.mjs (MODIFY)","test/harness/schemas/harness-cell.v1.schema.json (MODIFY)","tests/sprint-02/adapter-contract.test.mjs (NEW)","tests/sprint-02/real-cli.mjs (NEW)","tests/sprint-01/grd-02-four-grades.test.mjs (MODIFY)","tests/sprint-01/t13-smoke-observations.test.mjs (MODIFY)","tests/sprint-01/t15-hosted-controls.test.mjs (MODIFY)"],"write_prohibited":["plugins/pixel-perfect/** - no plugin change in this task","test/harness/graders/** - E1 and E2 own grading","test/harness/stream/** - E1 and E4 to E8 own the tables",".github/workflows/harness-eval.yml - GAW-3 to GAW-9 own its edits","test/harness/smoke/observations.mjs - E2 and E3 own it","Any file not listed in WRITE-ALLOWED"]},"fixtures":{"seed/keyless-claude-load":{"description":"The real claude CLI on the host, loaded keyless into a temp CLAUDE_CONFIG_DIR from this checkout","seed_method":"cli","records":["plugin details lists the 11 command names","no credential name in the child env"]},"seed/real-child-capture":{"description":"A real node child, run through createCapture and spawnCaptured, that prints 3 JSON lines, labelled with a harness and a version no table covers","seed_method":"cli","records":["capture.json and stdout.bin exist on disk for harness codex at version 0.0.0"]},"seed/approved-stance-table":{"description":"The owner-approved rows in test/harness/runtime/stance.mjs","seed_method":"cli","records":["5 rows: claude-code, codex, grok, opencode, pi"]},"seed/real-case-manifests":{"description":"The real case manifests in test/harness/cases, read through the case loader","seed_method":"cli","records":["status-a, verify-button-drift, verify-clean and first-question-init"]}},"verification_gates":[{"gate":"tests","command":"node --test tests/sprint-02/adapter-contract.test.mjs","expected":"exit 0 with 6 passing tests","positive_example":"all six ADAPTER-CONTRACT tests pass against the real claude CLI"},{"gate":"superseded-sprint-01","command":"node --test tests/sprint-01/grd-02-four-grades.test.mjs tests/sprint-01/t13-smoke-observations.test.mjs tests/sprint-01/t15-hosted-controls.test.mjs","expected":"exit 0: claude-code cells do not regress through the new seam","positive_example":"the three edited files pass with REGISTERED no longer pinned to claude-code alone"},{"gate":"validate","command":"pnpm validate","expected":"exit 0","positive_example":"every repo validator prints its pass line"}],"integration_obligations":[],"requirements":[{"id":"AC-1","type":"acceptance_criterion","primary":true,"description":"GIVEN the real claude CLI loaded keyless into a temp config dir WHEN the adapter load runs with a resolved version equal to the host's `claude --version`, then with one a patch away THEN the first run's `requested_cli_version` equals `observed_cli_version` with `identity_decision.ok` true, and the second reads `installation-identity-mismatch` naming `observed_cli_version`","flow_ref":null,"test_file":"tests/sprint-02/adapter-contract.test.mjs","test_function":"ADAPTER-CONTRACT-NEWEST-IDENTITY","verify":"node --test --test-name-pattern 'ADAPTER-CONTRACT-NEWEST-IDENTITY' tests/sprint-02/adapter-contract.test.mjs","test_tier":"integration","verification_service":"real claude CLI loaded keyless into a temp config dir","surface_policy":null,"positive_example":"Resolved version equal to `claude --version` on the host: requested, resolved and observed all match and approveIdentity returns ok true.","red":"On base executeLoad stamps pins.json 2.1.291 whatever the host reports, so with the host CLI at another version approveIdentity reads installation-identity-mismatch and this test fails.","maps_to_ac":null,"scenario":{"tier":"visible","test_tier":"integration","verification_service":"real claude CLI loaded keyless into a temp config dir","topology":"single-node","negative_control":{"would_fail_if":["executeLoad keeps a hard-coded pin","the resolved version is omitted from the call in install.mjs"]},"evidence":{"forms":["file_artifact","stdout"],"examples":["load.json identity with requested equal to observed"],"required_capture":true},"build_proof":{"range":"anything that proves the identity a cell is approved against is the version its own track resolved","examples":["install.mjs passing the resolved version to the adapter's load"]},"cases":[{"start_ref":"seed/keyless-claude-load","action":{"actor":"runner","steps":["run the adapter load with the resolved version equal to the host `claude --version`","run it again with a resolved version one patch away"]},"end_state":{"must_observe":["first run: `requested_cli_version` equals `observed_cli_version` and identity_decision.ok is true","second run: reason `installation-identity-mismatch` naming field `observed_cli_version`"],"must_not_observe":["requested_cli_version equal to the pin 2.1.291 when the track resolved another version","a null or empty observed_cli_version on the first run"]}}]}},{"id":"AC-2","type":"acceptance_criterion","primary":true,"description":"GIVEN that keyless load with every credential removed WHEN `runCell` runs claude-code pinned and writes `cell.json`, and those per-check cells pass through `cellFor` again with `question_count`, `answers_delivered` and `stream_mapping` added THEN `checks` holds 4 rows in order, each citing a file on disk, `command_list` reads `pass`, the other 3 read `could-not-run` `missing-api-key`, and the added fields survive","flow_ref":null,"test_file":"tests/sprint-02/adapter-contract.test.mjs","test_function":"ADAPTER-CONTRACT-FOUR-CHECKS-EVIDENCED","verify":"node --test --test-name-pattern 'ADAPTER-CONTRACT-FOUR-CHECKS-EVIDENCED' tests/sprint-02/adapter-contract.test.mjs","test_tier":"integration","verification_service":"real claude CLI and the real capture, guard and cell writer","surface_policy":null,"positive_example":"A keyless claude-code leg: command_list passes on real plugin details bytes, and the three model checks read could-not-run missing-api-key, each citing its persisted refusal capture. The same per-check cells with question_count on a row and stream_mapping beside it keep both through cellFor.","red":"On base cellFor copies only check_id, verdict, reason and source into checks, so every check has no evidence_paths and this test fails on the first check.","maps_to_ac":null,"scenario":{"tier":"visible","test_tier":"integration","verification_service":"real claude CLI and the real capture, guard and cell writer","topology":"single-node","negative_control":{"would_fail_if":["checks drop their evidence_paths","a refused invocation persists no capture, so its path list is empty","the loop keeps calling claudeCode directly for a harness the registry named","cellFor copies rows field by field, so question_count is omitted"]},"evidence":{"forms":["file_artifact"],"examples":["cell.json with checks[].evidence_paths"],"required_capture":true},"build_proof":{"range":"anything that proves every check of a keyed cell cites captured bytes that exist on disk and keeps every field its grader wrote","examples":["cellFor spreading each check row"]},"cases":[{"start_ref":"seed/keyless-claude-load","action":{"actor":"runner","steps":["run runCell for claude-code pinned with every credential removed and write cell.json","pass that run's per-check cells to cellFor again, with `question_count` 1 and `answers_delivered` 0 on one row and `stream_mapping` beside them"]},"end_state":{"must_observe":["`checks` has 4 rows in order command_list, status, verify, question_before_expensive_work","each row has at least 1 path in `evidence_paths` that resolves to a file on disk","command_list reads `pass`, and the other 3 read `could-not-run` with reason `missing-api-key`","the second cell's row keeps `question_count` 1 and `answers_delivered` 0, and the cell keeps `stream_mapping`"],"must_not_observe":["a check with an empty evidence_paths array","any check reading pass on a model invocation that never started"]}}]}},{"id":"AC-3","type":"acceptance_criterion","primary":true,"description":"GIVEN a parent env holding `OPENROUTER_API_KEY`, `XAI_API_KEY1` and `GEMINI_API_KEY` set to a literal placeholder WHEN one keyless child and one keyed child bound to `GEMINI_API_KEY` start through `spawnCaptured` and print their env names THEN the keyless child prints 0 names matching `_API_KEY`, and the keyed child prints exactly `GEMINI_API_KEY`","flow_ref":null,"test_file":"tests/sprint-02/adapter-contract.test.mjs","test_function":"ADAPTER-CONTRACT-ENV-SCRUB","verify":"node --test --test-name-pattern 'ADAPTER-CONTRACT-ENV-SCRUB' tests/sprint-02/adapter-contract.test.mjs","test_tier":"integration","verification_service":"real child process started through spawnCaptured","surface_policy":null,"positive_example":"Parent env holding OPENROUTER_API_KEY=placeholder and XAI_API_KEY1=placeholder: the keyless child prints neither name, and a keyed child prints only its binding.","red":"On base keylessEnv and childEnvFor match five named keys, so OPENROUTER_API_KEY reaches the child and this test reads its name in the child's printed env.","maps_to_ac":null,"scenario":{"tier":"visible","test_tier":"integration","verification_service":"real child process started through spawnCaptured","topology":"single-node","negative_control":{"would_fail_if":["the scrub stays a five-name regex","the scrub is removed, so the child env is unchanged from the parent"]},"evidence":{"forms":["stdout"],"examples":["the child's env names, values never printed"],"required_capture":true},"build_proof":{"range":"anything that proves a graded or keyless child can only hold its own binding","examples":["an allowlist for keyless steps and a pattern for keyed ones"]},"cases":[{"start_ref":"seed/keyless-claude-load","action":{"actor":"runner","steps":["set OPENROUTER_API_KEY, XAI_API_KEY1 and GEMINI_API_KEY to the literal placeholder in the parent env","start one keyless child and one keyed child with binding GEMINI_API_KEY, each printing its env names"]},"end_state":{"must_observe":["keyless child: 0 names matching `_API_KEY`","keyed child: exactly 1 such name, `GEMINI_API_KEY`"],"must_not_observe":["`OPENROUTER_API_KEY` in either child","any secret value in the capture","an empty list of env names from either child"]}}]}},{"id":"AC-4","type":"acceptance_criterion","primary":false,"description":"GIVEN the approved stance table WHEN each of the 5 rows is recorded, then recorded again carrying each of 7 rejected entries THEN each row is approved as the table states, and each rejected entry throws on 5 of 5 harnesses with `stance-mode-not-approved` for bypassPermissions and `stance-argv-not-approved` for the rest","flow_ref":null,"test_file":"tests/sprint-02/adapter-contract.test.mjs","test_function":"ADAPTER-CONTRACT-STANCE-TABLE","verify":"node --test --test-name-pattern 'ADAPTER-CONTRACT-STANCE-TABLE' tests/sprint-02/adapter-contract.test.mjs","test_tier":"unit","verification_service":"none: pure stance logic","unit_test_justified":"UNIT_TEST_JUSTIFIED: the stance table is pure logic with zero I/O: an object in, a refusal or an approved argv out.","surface_policy":null,"positive_example":"The five rows are approved: claude-code and grok with Bash(node *), opencode with its permission rules, codex with its two sandboxes, pi with no-approval-gate. --trust, --auto, --always-approve, bypassPermissions, Bash(*), a bare Bash and a Write rule are each refused on every row.","red":"On base recordStance refuses every mode but dontAsk and approves only the claude argv shape, so a codex row is refused and this test fails.","maps_to_ac":null,"scenario":{"tier":"visible","test_tier":"unit","unit_test_justified":"UNIT_TEST_JUSTIFIED: the stance table is pure logic with zero I/O.","verification_service":"none: pure stance logic","topology":"single-node","negative_control":{"would_fail_if":["the table is a no-op that approves any stance","a harness with no approved row is omitted from the refusal path","the node rule check is removed, so Bash(*) is admitted"]},"evidence":{"forms":["stdout"],"examples":["refusal reason stance-argv-not-approved"],"required_capture":true},"build_proof":{"range":"anything that proves each harness can run only its approved row, and that a wider Bash rule or a write rule cannot appear on any harness","examples":["a per-harness approved table"]},"cases":[{"start_ref":"seed/approved-stance-table","action":{"actor":"runner","steps":["record the approved row for each of the 5 harnesses","record each row again carrying each of --trust, --auto, --always-approve, bypassPermissions, `Bash(*)`, `Bash` and `Write(reports/verify-button-drift.json)`"]},"end_state":{"must_observe":["the claude-code and grok argv each hold `Bash(node *)`","opencode's OPENCODE_PERMISSION allows `node *`, denies `*`, and denies edit","codex status holds `read-only`, codex verify holds `workspace-write`, and pi reads `no-approval-gate`","each of the 7 rejected entries throws on 5 of 5 harnesses: reason `stance-mode-not-approved` for bypassPermissions, reason `stance-argv-not-approved` for the rest"],"must_not_observe":["an approved stance holding a `Write(` rule","a harness with no row reading approved by default"]}}]}},{"id":"AC-5","type":"acceptance_criterion","primary":true,"description":"GIVEN a real child capture labelled codex at version 0.0.0 WHEN `gradeInvocation({record, entry, track, installation})` runs on it THEN `verdict` reads `could-not-run`, `reason` reads `stream-mapping-absent`, and `evidence_paths` holds its `.capture.json` on disk","flow_ref":null,"test_file":"tests/sprint-02/adapter-contract.test.mjs","test_function":"ADAPTER-CONTRACT-GRADE-FLOOR","verify":"node --test --test-name-pattern 'ADAPTER-CONTRACT-GRADE-FLOOR' tests/sprint-02/adapter-contract.test.mjs","test_tier":"integration","verification_service":"real child process capture through the real seam","surface_policy":null,"positive_example":"A real capture labelled codex at 0.0.0: verdict could-not-run, reason stream-mapping-absent, and its capture.json in evidence_paths, both before and after E1 lands.","red":"On base contract.mjs does not exist, so the seam cannot be called and this test fails.","maps_to_ac":null,"scenario":{"tier":"visible","test_tier":"integration","verification_service":"real child process capture through the real seam","topology":"single-node","negative_control":{"would_fail_if":["the seam returns a static pass","the capture is omitted from evidence_paths","the seam grades with another version's rules"]},"evidence":{"forms":["file_artifact"],"examples":["the returned cell"],"required_capture":true},"build_proof":{"range":"anything that proves a harness with no mapping reads the gate's named reason and keeps its evidence","examples":["the seam in contract.mjs"]},"cases":[{"start_ref":"seed/real-child-capture","action":{"actor":"runner","steps":["call gradeInvocation({record, entry, track, installation}) with that capture"]},"end_state":{"must_observe":["`verdict` is `could-not-run` and `reason` is `stream-mapping-absent`","`evidence_paths` holds 1 path ending `.capture.json` that resolves on disk"],"must_not_observe":["`verdict` reading pass","an empty evidence_paths array"]}}]}},{"id":"AC-6","type":"acceptance_criterion","primary":false,"description":"GIVEN the real case manifests WHEN `declarationFor` renders status-a, verify-button-drift, verify-clean and first-question-init THEN the status-a text holds `Phase:` with no value, and the other three each return a string of length 0","flow_ref":null,"test_file":"tests/sprint-02/adapter-contract.test.mjs","test_function":"ADAPTER-CONTRACT-DECLARATIONS","verify":"node --test --test-name-pattern 'ADAPTER-CONTRACT-DECLARATIONS' tests/sprint-02/adapter-contract.test.mjs","test_tier":"unit","verification_service":"none: pure text composition over the real case manifests","unit_test_justified":"UNIT_TEST_JUSTIFIED: declarationFor is pure logic with zero I/O: a case manifest in, a string out.","surface_policy":null,"positive_example":"status-a returns text naming the phase and gate fields with no value; verify-button-drift, verify-clean and first-question-init each return an empty string.","red":"On base declarationFor does not exist, so this test fails on its first call.","maps_to_ac":null,"scenario":{"tier":"visible","test_tier":"unit","unit_test_justified":"UNIT_TEST_JUSTIFIED: declarationFor is pure logic with zero I/O.","verification_service":"none: pure text composition over the real case manifests","topology":"single-node","negative_control":{"would_fail_if":["a verify case still gets a declaration, so the invocation is told to write the report","the status text hardcodes the expected values","the first-question case is not left empty"]},"evidence":{"forms":["stdout"],"examples":["the rendered text per case"],"required_capture":true},"build_proof":{"range":"anything that proves every adapter gets T16's status text from one function, that it carries no answer, and that no other case gets any text","examples":["contract.mjs wrapping T16's status renderer"]},"cases":[{"start_ref":"seed/real-case-manifests","action":{"actor":"runner","steps":["render declarationFor for status-a, verify-button-drift, verify-clean and first-question-init"]},"end_state":{"must_observe":["the status-a text holds `Phase:`","verify-button-drift, verify-clean and first-question-init each return a string of length 0"],"must_not_observe":["`reports/` in any text","`atoms/Button/default` in any text","`approved` or `pending` in the status text","an empty string for status-a"]}}]}},{"id":"TC-1","type":"test_criterion","description":"`requested_cli_version` equals `observed_cli_version` when the load receives the host's resolved version","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'ADAPTER-CONTRACT-NEWEST-IDENTITY' tests/sprint-02/adapter-contract.test.mjs","positive_example":"Resolved version equal to `claude --version` on the host: requested, resolved and observed all match and approveIdentity returns ok true."},{"id":"TC-2","type":"test_criterion","description":"`identity_decision` reads `installation-identity-mismatch` when the resolved version is one patch from the host version","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'ADAPTER-CONTRACT-NEWEST-IDENTITY' tests/sprint-02/adapter-contract.test.mjs","positive_example":"Resolved version equal to `claude --version` on the host: requested, resolved and observed all match and approveIdentity returns ok true."},{"id":"TC-3","type":"test_criterion","description":"Each of the 4 check rows cites a file that exists when `runCell` finishes a keyless claude-code leg","maps_to_ac":"AC-2","verify":"node --test --test-name-pattern 'ADAPTER-CONTRACT-FOUR-CHECKS-EVIDENCED' tests/sprint-02/adapter-contract.test.mjs","positive_example":"A keyless claude-code leg: command_list passes on real plugin details bytes, and the three model checks read could-not-run missing-api-key, each citing its persisted refusal capture. The same per-check cells with question_count on a row and stream_mapping beside it keep both through cellFor."},{"id":"TC-4","type":"test_criterion","description":"`question_count` survives `cellFor` when a per-check row carries it","maps_to_ac":"AC-2","verify":"node --test --test-name-pattern 'ADAPTER-CONTRACT-FOUR-CHECKS-EVIDENCED' tests/sprint-02/adapter-contract.test.mjs","positive_example":"A keyless claude-code leg: command_list passes on real plugin details bytes, and the three model checks read could-not-run missing-api-key, each citing its persisted refusal capture. The same per-check cells with question_count on a row and stream_mapping beside it keep both through cellFor."},{"id":"TC-5","type":"test_criterion","description":"The keyless child prints 0 `_API_KEY` names when the parent env holds 3 of them","maps_to_ac":"AC-3","verify":"node --test --test-name-pattern 'ADAPTER-CONTRACT-ENV-SCRUB' tests/sprint-02/adapter-contract.test.mjs","positive_example":"Parent env holding OPENROUTER_API_KEY=placeholder and XAI_API_KEY1=placeholder: the keyless child prints neither name, and a keyed child prints only its binding."},{"id":"TC-6","type":"test_criterion","description":"The keyed child prints `GEMINI_API_KEY` as its only `_API_KEY` name when that is its binding","maps_to_ac":"AC-3","verify":"node --test --test-name-pattern 'ADAPTER-CONTRACT-ENV-SCRUB' tests/sprint-02/adapter-contract.test.mjs","positive_example":"Parent env holding OPENROUTER_API_KEY=placeholder and XAI_API_KEY1=placeholder: the keyless child prints neither name, and a keyed child prints only its binding."},{"id":"TC-7","type":"test_criterion","description":"`recordStance` throws `stance-argv-not-approved` when a row carries `Bash(*)`","maps_to_ac":"AC-4","verify":"node --test --test-name-pattern 'ADAPTER-CONTRACT-STANCE-TABLE' tests/sprint-02/adapter-contract.test.mjs","positive_example":"The five rows are approved: claude-code and grok with Bash(node *), opencode with its permission rules, codex with its two sandboxes, pi with no-approval-gate. --trust, --auto, --always-approve, bypassPermissions, Bash(*), a bare Bash and a Write rule are each refused on every row."},{"id":"TC-8","type":"test_criterion","description":"`recordStance` throws `stance-mode-not-approved` when a row carries bypassPermissions","maps_to_ac":"AC-4","verify":"node --test --test-name-pattern 'ADAPTER-CONTRACT-STANCE-TABLE' tests/sprint-02/adapter-contract.test.mjs","positive_example":"The five rows are approved: claude-code and grok with Bash(node *), opencode with its permission rules, codex with its two sandboxes, pi with no-approval-gate. --trust, --auto, --always-approve, bypassPermissions, Bash(*), a bare Bash and a Write rule are each refused on every row."},{"id":"TC-9","type":"test_criterion","description":"`gradeInvocation` returns reason `stream-mapping-absent` when no table covers the capture's version","maps_to_ac":"AC-5","verify":"node --test --test-name-pattern 'ADAPTER-CONTRACT-GRADE-FLOOR' tests/sprint-02/adapter-contract.test.mjs","positive_example":"A real capture labelled codex at 0.0.0: verdict could-not-run, reason stream-mapping-absent, and its capture.json in evidence_paths, both before and after E1 lands."},{"id":"TC-10","type":"test_criterion","description":"`declarationFor` returns an empty string when the case is verify-button-drift","maps_to_ac":"AC-6","verify":"node --test --test-name-pattern 'ADAPTER-CONTRACT-DECLARATIONS' tests/sprint-02/adapter-contract.test.mjs","positive_example":"status-a returns text naming the phase and gate fields with no value; verify-button-drift, verify-clean and first-question-init each return an empty string."}]}
-->
