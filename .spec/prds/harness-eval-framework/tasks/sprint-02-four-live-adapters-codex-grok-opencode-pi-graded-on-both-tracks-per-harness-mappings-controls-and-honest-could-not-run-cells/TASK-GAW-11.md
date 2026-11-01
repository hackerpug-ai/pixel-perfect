# TASK-GAW-11: Remove T16's verify declaration and write allow-list, and admit node scripts on claude-code

> Task ID: GAW-11
> Sprint: [SPRINT.md](./SPRINT.md)
> Status: Backlog
> Assignee: ai-tooling-implementer
> Priority: P0
> Points: 3
> Type: FEATURE
> Planner: github-agentic-workflow-planner
> Reviewer: ai-tooling-reviewer
> Proposed By: github-agentic-workflow-planner
> Wave: A
> TDD_MODE: red_first · RED_GREEN_REQUIRED: true

AGENT: planner=github-agentic-workflow-planner | implementer=ai-tooling-implementer | reviewer=ai-tooling-reviewer

## Background

- **Problem:** T16 landed at 6872fbd without its amendment. A verify prompt still tells the invocation to write its report (`verifyReportPrompt`, `VERIFY_REPORT_CONTRACT`), `stance.mjs` still admits that one write through `allowed_writes` with an `Edit(path)` rule, and no node rule exists.
- **Evidence:** run 41249460968 at 36e864a shows claude-code status passing, so the status half stays, and verify still reading report-missing.
- **Owner decisions:** ROADMAP D-02 (the evaluator writes the verify report) and D-03 (node scripts on every gated harness, nothing wider).
- **Gate steps that exercise this task:** 14, 16, 17. Capability: CAP-EVAL-01.

## Critical Constraints

- **MUST:** T16 landed at 6872fbd with its verify half live, and ROADMAP D-02 and D-03 stand. Run 41249460968 at 36e864a shows claude-code status passing and verify still reading report-missing. This task removes that half and adds the node rule in one landing, because E1, E2 and E4 need Bash(node *) on the claude-code row from the moment the removal lands.
- **MUST:** Remove VERIFY_REPORT_CONTRACT, verifyReportPrompt and declaredWrites from claude-code.mjs, and the invocationId argument from promptFor. A verify prompt becomes the slash command plus the case's own arguments. prepareRunDirs, bindReportPath, readVerifyReport and each entry's bound_path stay, because E2 writes the report at that path.
- **MUST:** Remove WRITE_ALLOW_TOOL, writeAllowRule, the write path checks and allowed_writes from stance.mjs. Every claude-code stance's argv becomes --permission-mode dontAsk --add-dir <plugin root> --allowedTools Bash(node *). assertStance keeps comparing the whole argv exactly, so a recorded stance holding any other rule is refused.
- **MUST:** Keep STATUS_SURFACE, statusSurfacePrompt and every status assertion in tests/sprint-01/t16-claude-code-grades.test.mjs. Run 41249460968 proved that half works.
- **STRICTLY:** Edit tests/sprint-01/t16-claude-code-grades.test.mjs only where it pins the removed half: in t16-verify-report-declared lines 300-302, 318-324, 332 and 337-372, rewritten to assert that a verify prompt names no report path and no invocation id; in t16-verify-grades-written-report lines 455-461; in t16-report-written-by-invocation lines 586, 601-603 and 608; and the comment at line 198. Keep every test name, so T16's published verify commands still select them.

## Specification

- **Objective:** A claude-code verify invocation is told nothing about a report and can write nothing by rule, and every claude-code graded run may execute node scripts.
- **Success state:** Verify prompts read `/pixel-perfect:verify --platform web-desktop`. Each graded argv ends with `--allowedTools Bash(node *)`, and no recorded argv holds `Edit(`. `VERIFY_REPORT_CONTRACT`, `verifyReportPrompt` and `allowed_writes` are gone. The status prompt still holds `Phase:`, and T16's status assertions are unchanged.

Contract details:

- tests/sprint-01/grd-06-missing-key.test.mjs line 286 pins the four-flag argv. Change only that line, adding the node rule. No other sprint-01 test pins the argv's length: grd-02 lines 247-249 read by index, and t16-cell-shape-intact compares the argv with the stance's own.
- The denied-write probe keeps its prompt, which tells the model not to use Bash, and takes the plain stance. Correct the comments at claude-code.mjs lines 308-310 and 443-444, which describe the allow-list.
- Ceiling: Bash(node *) also admits node -e, so a model could write a file through node, while D-03 means the plugin's own scripts. The fixture's before and after hashes catch a stray write in the project. Mark this with a ponytail comment beside the rule: the upgrade is a rule naming the plugin's scripts directory, if a capture shows the wider form being used.
- A local test cannot show enforcement, because that needs a model. This task proves the form the real CLI starts with. The first hosted claude-code verify capture proves the effect: a node Bash call that ran with no denial.

## Acceptance Criteria (GIVEN-WHEN-THEN)

### AC-1: A verify case gets no declaration, and the status half stays [PRIMARY]

- **GIVEN:** real run directories from `prepareVerifyPair` and `prepareRunDirs` over the real case manifests
- **WHEN:** the verify pair and the invocation table are built, and each graded entry's prompt and `bound_path` are read
- **THEN:** the planted and clean prompts each equal `/pixel-perfect:verify --platform web-desktop`, the status-a prompt holds `Phase:`, and each verify `bound_path` ends with its case's `report_relative_path` under its own run directory

```text
FLOW_REF:              null
TEST_TIER:             integration
VERIFICATION_SERVICE:  real invocation table, case manifests and run directories
SURFACE_POLICY:        null
TDD_STATE:             none
TEST_FILE:             tests/sprint-02/claude-code-verify-undeclared.test.mjs
TEST_FUNCTION:         CLAUDE-CODE-VERIFY-UNDECLARED
VERIFY:                node --test --test-name-pattern 'CLAUDE-CODE-VERIFY-UNDECLARED' tests/sprint-02/claude-code-verify-undeclared.test.mjs
```

SCENARIO_SUMMARY: Real manifests and directories: verify prompts name no report, status keeps its surface, and the report path stays bound for E2.

### AC-2: The claude-code row admits node scripts and nothing else, in a form the real CLI starts with [PRIMARY]

- **GIVEN:** the real claude CLI with an empty env plus an allowlist, a temp HOME, a closed local endpoint and a placeholder key
- **WHEN:** each graded entry's argv is read, the CLI starts with the status entry's flags until its init event, and a recorded stance is edited to hold each of `Edit(reports/a.json)`, `Bash(*)` and `Bash`
- **THEN:** each of the 4 graded argv holds `--allowedTools` `Bash(node *)`, the init event reads `permissionMode` `dontAsk`, and each edited stance throws `stance-argv-not-approved`

```text
FLOW_REF:              null
TEST_TIER:             integration
VERIFICATION_SERVICE:  real claude CLI with an empty env, a closed local endpoint and a placeholder key
SURFACE_POLICY:        null
TDD_STATE:             none
TEST_FILE:             tests/sprint-02/claude-code-verify-undeclared.test.mjs
TEST_FUNCTION:         CLAUDE-CODE-NODE-RULE
VERIFY:                node --test --test-name-pattern 'CLAUDE-CODE-NODE-RULE' tests/sprint-02/claude-code-verify-undeclared.test.mjs
```

SCENARIO_SUMMARY: The real CLI starts with the node rule and spends nothing, and any other recorded rule is refused.

Each AC's RED input and positive example are in its row of the contract block below.

## Test Criteria

Each TC runs its mapped AC's VERIFY.

| ID | Statement | Maps to |
|---|---|---|
| TC-1 | The planted verify prompt equals `/pixel-perfect:verify --platform web-desktop` when the pair is built | AC-1 |
| TC-2 | The clean verify prompt names no `reports/` path when the pair is built | AC-1 |
| TC-3 | The status-a prompt holds `Phase:` when the table is built | AC-1 |
| TC-4 | Each verify entry's `bound_path` sits under its own run directory when the pair is built | AC-1 |
| TC-5 | Every graded argv holds `Bash(node *)` when the table is built | AC-2 |
| TC-6 | The CLI's init event reads `permissionMode` `dontAsk` when it starts with the status entry's flags | AC-2 |
| TC-7 | `assertStance` throws `stance-argv-not-approved` when a recorded argv holds `Edit(reports/a.json)` | AC-2 |

## Reading List

1. `test/harness/adapters/claude-code.mjs` lines 158-197: the status half, which stays
2. `test/harness/adapters/claude-code.mjs` lines 200-268: the verify half and promptFor
3. `test/harness/adapters/claude-code.mjs` lines 305-312: where the table records a stance with a write list
4. `test/harness/adapters/claude-code.mjs` lines 443-445: the probe's stance and its stale comment
5. `test/harness/runtime/stance.mjs` lines 1-156: the write allow-list to remove and the exact argv check to keep
6. `tests/sprint-01/t16-claude-code-grades.test.mjs` lines 299-372: t16-verify-report-declared, which pins the removed half
7. `tests/sprint-01/t16-claude-code-grades.test.mjs` lines 446-470: the two prompt assertions in t16-verify-grades-written-report
8. `tests/sprint-01/t16-claude-code-grades.test.mjs` lines 575-612: the prompt and allow-list assertions in t16-report-written-by-invocation
9. `tests/sprint-01/grd-06-missing-key.test.mjs` lines 282-290: the four-flag argv pin
10. `.spec/prds/harness-eval-framework/ROADMAP.md` lines 44-52: owner decisions D-02 and D-03

Standards: `AGENTS.md`, `brain/docs/kanban/SCENARIO-CONTRACT-V1.md`.

## Guardrails

WRITE-ALLOWED:

- test/harness/adapters/claude-code.mjs (MODIFY)
- test/harness/runtime/stance.mjs (MODIFY)
- tests/sprint-01/t16-claude-code-grades.test.mjs (MODIFY)
- tests/sprint-01/grd-06-missing-key.test.mjs (MODIFY)
- tests/sprint-02/claude-code-verify-undeclared.test.mjs (NEW)

WRITE-PROHIBITED:

- test/harness/graders/** - E1 and E2 own grading and the report writer
- test/harness/smoke/** - GAW-1 owns the loop
- plugins/pixel-perfect/** - no plugin change in this task
- .github/workflows/harness-eval.yml - no workflow change in this task
- Any other file under tests/sprint-01/
- Any file not listed in WRITE-ALLOWED

SUPERSEDES:

- tests/sprint-01/t16-claude-code-grades.test.mjs
- tests/sprint-01/grd-06-missing-key.test.mjs

## Code Pattern

```js
// test/harness/adapters/claude-code.mjs:262-267: the composition to simplify.
export function promptFor({ command_name, caseManifest = null, invocationId = null }) {
  const surface = [statusSurfacePrompt({ caseManifest }), verifyReportPrompt({ caseManifest, invocationId })]
    .filter(Boolean)
    .join(" ");
  return [`/pixel-perfect:${command_name}`, ...caseArgs(caseManifest), ...(surface.length > 0 ? [surface] : [])].join(" ");
}
```

- **Anti-pattern:** Leaving the contract constant behind for E2; keeping `allowed_writes` as an empty field; `Bash(*)` or a bare `Bash`; renaming a T16 test; deleting a status assertion.

## Design

None. This task has no UI surface.

## Agent Instructions

Work AC-1 then AC-2, one RED, GREEN, REFACTOR cycle each, then edit the two sprint-01 tests at the named lines. AC-2's child starts from an empty env plus an allowlist, points at a closed local port and holds only the literal placeholder, and the test stops it after the init event, so nothing is spent.

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

- **tests:** `node --test tests/sprint-02/claude-code-verify-undeclared.test.mjs`. Expected: exit 0 with 2 passing tests
- **superseded-sprint-01:** `node --test tests/sprint-01/t16-claude-code-grades.test.mjs tests/sprint-01/grd-06-missing-key.test.mjs`. Expected: exit 0: T16's status half holds and the argv pin carries the node rule
- **regression-sprint-01:** `node --test tests/sprint-01/grd-02-four-grades.test.mjs tests/sprint-01/t15-hosted-controls.test.mjs`. Expected: exit 0: the adapter table and the denied-write probe still hold
- **validate:** `pnpm validate`. Expected: exit 0

## Review Criteria

Must pass:

- One test per AC, named exactly as its TEST_FUNCTION.
- No `Edit(` rule, no `allowed_writes` and no `VERIFY_REPORT_CONTRACT` remain in the two modules.
- `git diff` of the T16 test touches only the named lines, and every status assertion is unchanged.
- The node rule lands in the same commit as the removal.
- `grd-06` changes on line 286 alone.

Should verify:

- The ceiling on `node -e` is marked beside the rule.
- The stale comments at `claude-code.mjs` lines 308-310 and 443-444 are corrected.

Verdict: APPROVED or NEEDS_FIXES, with file and line for each finding.

## Dependencies

- **Depends on:** none
- **Blocks:** E2, GAW-1

## Notes

- **Flows:** owns no locked flow. Both ACs are task-local; gate steps 14, 16 and 17 read the outcome on a hosted run.
- **Test names:** `t16-verify-report-declared` and `t16-report-written-by-invocation` keep their names so T16's published verify commands still select them, even though each now asserts less or the opposite. Rename them when sprint 01's contract no longer cites them.
- **Why this is its own task:** it removes shipped behavior and has its own proof, and folding it into GAW-1 would take that task past 8 points for work that lands cleanly first.
- **Provenance:** ROADMAP D-02 and D-03; run 41249460968 at 36e864a

<!-- REQUIREMENT-CONTRACT v1 -->
<!--
{"version":"1","task_id":"GAW-11","task_type":"FEATURE","tdd_mode":"red_first","verification_policy":{"requires_tests":true,"requires_red_evidence":true,"requires_seeded_evidence":true},"guardrails":{"write_allowed":["test/harness/adapters/claude-code.mjs (MODIFY)","test/harness/runtime/stance.mjs (MODIFY)","tests/sprint-01/t16-claude-code-grades.test.mjs (MODIFY)","tests/sprint-01/grd-06-missing-key.test.mjs (MODIFY)","tests/sprint-02/claude-code-verify-undeclared.test.mjs (NEW)"],"write_prohibited":["test/harness/graders/** - E1 and E2 own grading and the report writer","test/harness/smoke/** - GAW-1 owns the loop","plugins/pixel-perfect/** - no plugin change in this task",".github/workflows/harness-eval.yml - no workflow change in this task","Any other file under tests/sprint-01/","Any file not listed in WRITE-ALLOWED"]},"fixtures":{"seed/real-run-dirs":{"description":"Real run directories from prepareVerifyPair and prepareRunDirs over the real case manifests","seed_method":"cli","records":["verify-button-drift, verify-clean, status-a and first-question-init"]},"seed/keyless-claude-cli":{"description":"The real claude CLI on the host, started from an empty env plus an allowlist, with a temp HOME and CLAUDE_CONFIG_DIR, ANTHROPIC_BASE_URL at a closed local port, and a literal placeholder key","seed_method":"cli","records":["the CLI's init event arrives with no model request"]}},"verification_gates":[{"gate":"tests","command":"node --test tests/sprint-02/claude-code-verify-undeclared.test.mjs","expected":"exit 0 with 2 passing tests","positive_example":"both tests pass against the real table and the real CLI"},{"gate":"superseded-sprint-01","command":"node --test tests/sprint-01/t16-claude-code-grades.test.mjs tests/sprint-01/grd-06-missing-key.test.mjs","expected":"exit 0: T16's status half holds and the argv pin carries the node rule","positive_example":"both edited files pass, with every T16 test name still present"},{"gate":"regression-sprint-01","command":"node --test tests/sprint-01/grd-02-four-grades.test.mjs tests/sprint-01/t15-hosted-controls.test.mjs","expected":"exit 0: the adapter table and the denied-write probe still hold","positive_example":"both files pass unedited with the node rule on the argv"},{"gate":"validate","command":"pnpm validate","expected":"exit 0","positive_example":"every repo validator prints its pass line"}],"integration_obligations":[],"requirements":[{"id":"AC-1","type":"acceptance_criterion","primary":true,"description":"GIVEN real run directories from `prepareVerifyPair` and `prepareRunDirs` over the real case manifests WHEN the verify pair and the invocation table are built, and each graded entry's prompt and `bound_path` are read THEN the planted and clean prompts each equal `/pixel-perfect:verify --platform web-desktop`, the status-a prompt holds `Phase:`, and each verify `bound_path` ends with its case's `report_relative_path` under its own run directory","flow_ref":null,"test_file":"tests/sprint-02/claude-code-verify-undeclared.test.mjs","test_function":"CLAUDE-CODE-VERIFY-UNDECLARED","verify":"node --test --test-name-pattern 'CLAUDE-CODE-VERIFY-UNDECLARED' tests/sprint-02/claude-code-verify-undeclared.test.mjs","test_tier":"integration","verification_service":"real invocation table, case manifests and run directories","surface_policy":null,"positive_example":"The planted and clean prompts each read exactly /pixel-perfect:verify --platform web-desktop, the status-a prompt still holds Phase:, and each verify entry's bound_path sits under its own run directory.","red":"On base the planted verify prompt names reports/verify-button-drift.json and the invocation id, so the first assertion fails.","maps_to_ac":null,"scenario":{"tier":"visible","test_tier":"integration","verification_service":"real invocation table, case manifests and run directories","topology":"single-node","negative_control":{"would_fail_if":["verifyReportPrompt is still appended, so a verify prompt names the report path","the status surface is removed with the verify half","bound_path is removed, so E2 has nowhere to write"]},"evidence":{"forms":["stdout"],"examples":["the rendered prompt per entry"],"required_capture":true},"build_proof":{"range":"anything that proves a graded verify run is never told to write a report, while status keeps its surface and the report path stays bound","examples":["promptFor composing only the status surface"]},"cases":[{"start_ref":"seed/real-run-dirs","action":{"actor":"runner","steps":["build the verify pair and the invocation table over the real manifests","read each graded entry's prompt and bound_path"]},"end_state":{"must_observe":["the planted and clean `prompt` each equal `/pixel-perfect:verify --platform web-desktop`","the status-a prompt holds `Phase:`","each verify `bound_path` ends with its case's `report_relative_path` under its own run directory"],"must_not_observe":["`reports/` in a verify prompt","the entry's `invocation_id` in a verify prompt","an empty prompt on any graded entry"]}}]}},{"id":"AC-2","type":"acceptance_criterion","primary":true,"description":"GIVEN the real claude CLI with an empty env plus an allowlist, a temp HOME, a closed local endpoint and a placeholder key WHEN each graded entry's argv is read, the CLI starts with the status entry's flags until its init event, and a recorded stance is edited to hold each of `Edit(reports/a.json)`, `Bash(*)` and `Bash` THEN each of the 4 graded argv holds `--allowedTools` `Bash(node *)`, the init event reads `permissionMode` `dontAsk`, and each edited stance throws `stance-argv-not-approved`","flow_ref":null,"test_file":"tests/sprint-02/claude-code-verify-undeclared.test.mjs","test_function":"CLAUDE-CODE-NODE-RULE","verify":"node --test --test-name-pattern 'CLAUDE-CODE-NODE-RULE' tests/sprint-02/claude-code-verify-undeclared.test.mjs","test_tier":"integration","verification_service":"real claude CLI with an empty env, a closed local endpoint and a placeholder key","surface_policy":null,"positive_example":"Each graded entry's argv ends with --allowedTools Bash(node *), the real CLI's init event reads permissionMode dontAsk with those flags, and a recorded stance edited to hold Edit(reports/a.json), Bash(*) or Bash is refused.","red":"On base a stance with no declared write has no --allowedTools, so the argv assertion fails.","maps_to_ac":null,"scenario":{"tier":"visible","test_tier":"integration","verification_service":"real claude CLI with an empty env, a closed local endpoint and a placeholder key","topology":"single-node","negative_control":{"would_fail_if":["the node rule is omitted from the row","the exact argv comparison is removed, so a wider rule is admitted","the write list is left in place, so an Edit rule still reaches the argv"]},"evidence":{"forms":["stdout"],"examples":["the CLI's init event"],"required_capture":true},"build_proof":{"range":"anything that proves every claude-code stance holds exactly the node rule, and that the CLI starts with it","examples":["stanceArgv ending with the rule"]},"cases":[{"start_ref":"seed/keyless-claude-cli","action":{"actor":"runner","steps":["read each graded entry's argv from the real table","start the real CLI with the status entry's own flags, read its init event, then stop it","edit a recorded stance's argv to hold each of `Edit(reports/a.json)`, `Bash(*)` and `Bash`, then call assertStance"]},"end_state":{"must_observe":["each of the 4 graded argv holds `--allowedTools` `Bash(node *)`","the init event reads `permissionMode` `dontAsk`","each of the 3 edited stances throws `stance-argv-not-approved`"],"must_not_observe":["`Edit(` in any recorded argv","`allowed_writes` on a recorded stance","an empty argv on a graded entry"]}}]}},{"id":"TC-1","type":"test_criterion","description":"The planted verify prompt equals `/pixel-perfect:verify --platform web-desktop` when the pair is built","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'CLAUDE-CODE-VERIFY-UNDECLARED' tests/sprint-02/claude-code-verify-undeclared.test.mjs","positive_example":"The planted and clean prompts each read exactly /pixel-perfect:verify --platform web-desktop, the status-a prompt still holds Phase:, and each verify entry's bound_path sits under its own run directory."},{"id":"TC-2","type":"test_criterion","description":"The clean verify prompt names no `reports/` path when the pair is built","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'CLAUDE-CODE-VERIFY-UNDECLARED' tests/sprint-02/claude-code-verify-undeclared.test.mjs","positive_example":"The planted and clean prompts each read exactly /pixel-perfect:verify --platform web-desktop, the status-a prompt still holds Phase:, and each verify entry's bound_path sits under its own run directory."},{"id":"TC-3","type":"test_criterion","description":"The status-a prompt holds `Phase:` when the table is built","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'CLAUDE-CODE-VERIFY-UNDECLARED' tests/sprint-02/claude-code-verify-undeclared.test.mjs","positive_example":"The planted and clean prompts each read exactly /pixel-perfect:verify --platform web-desktop, the status-a prompt still holds Phase:, and each verify entry's bound_path sits under its own run directory."},{"id":"TC-4","type":"test_criterion","description":"Each verify entry's `bound_path` sits under its own run directory when the pair is built","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'CLAUDE-CODE-VERIFY-UNDECLARED' tests/sprint-02/claude-code-verify-undeclared.test.mjs","positive_example":"The planted and clean prompts each read exactly /pixel-perfect:verify --platform web-desktop, the status-a prompt still holds Phase:, and each verify entry's bound_path sits under its own run directory."},{"id":"TC-5","type":"test_criterion","description":"Every graded argv holds `Bash(node *)` when the table is built","maps_to_ac":"AC-2","verify":"node --test --test-name-pattern 'CLAUDE-CODE-NODE-RULE' tests/sprint-02/claude-code-verify-undeclared.test.mjs","positive_example":"Each graded entry's argv ends with --allowedTools Bash(node *), the real CLI's init event reads permissionMode dontAsk with those flags, and a recorded stance edited to hold Edit(reports/a.json), Bash(*) or Bash is refused."},{"id":"TC-6","type":"test_criterion","description":"The CLI's init event reads `permissionMode` `dontAsk` when it starts with the status entry's flags","maps_to_ac":"AC-2","verify":"node --test --test-name-pattern 'CLAUDE-CODE-NODE-RULE' tests/sprint-02/claude-code-verify-undeclared.test.mjs","positive_example":"Each graded entry's argv ends with --allowedTools Bash(node *), the real CLI's init event reads permissionMode dontAsk with those flags, and a recorded stance edited to hold Edit(reports/a.json), Bash(*) or Bash is refused."},{"id":"TC-7","type":"test_criterion","description":"`assertStance` throws `stance-argv-not-approved` when a recorded argv holds `Edit(reports/a.json)`","maps_to_ac":"AC-2","verify":"node --test --test-name-pattern 'CLAUDE-CODE-NODE-RULE' tests/sprint-02/claude-code-verify-undeclared.test.mjs","positive_example":"Each graded entry's argv ends with --allowedTools Bash(node *), the real CLI's init event reads permissionMode dontAsk with those flags, and a recorded stance edited to hold Edit(reports/a.json), Bash(*) or Bash is refused."}]}
-->
