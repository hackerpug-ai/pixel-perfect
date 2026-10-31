# TASK-GAW-8: Refuse each keyed harness by name when its own key is absent

> Task ID: GAW-8
> Sprint: [SPRINT.md](./SPRINT.md)
> Status: Backlog
> Assignee: devops-engineer
> Priority: P1
> Points: 3
> Type: FEATURE
> Planner: github-agentic-workflow-planner
> Reviewer: github-agentic-workflow-reviewer
> Proposed By: github-agentic-workflow-planner
> Wave: A
> TDD_MODE: red_first · RED_GREEN_REQUIRED: true

AGENT: planner=github-agentic-workflow-planner | implementer=devops-engineer | reviewer=github-agentic-workflow-reviewer

## Background

- **Problem:** the gate needs a missing-key refusal per keyed harness. Today one Keyless control step runs on claude-code pinned. The inline merge in `jobs.download` (`harness-eval.yml` line 386) is last-write-wins, so a later leg hides an earlier failure as soon as more than one harness observes.
- **Source:** `target-sprint.json` gate sentence, and `test/harness/ENVIRONMENT.md`.
- **Gate steps that exercise this task:** 1, 23, 25. Capability: CAP-EVAL-01.

## Critical Constraints

- **MUST:** Leave the existing Keyless control step exactly as it is: tests/sprint-01/grd-06-missing-key.test.mjs line 607 and tests/sprint-01/t15-hosted-controls.test.mjs line 188 pin it to claude-code. Add one step named Per-harness keyless control, with if: matrix.track == 'pinned' && matrix.harness != 'claude-code' && matrix.harness != 'cursor'. It binds no secret and runs the same absence loop, the same guard and the existing attachMissingKey.
- **MUST:** .controls stays four rows. The missing-key row gains per_harness, keyed by harness, with verdict, reason, model_request_count and child_ran. The row reads matched and qualified only when all five entries read could-not-run missing-api-key with 0 model requests and child_ran false.
- **MUST:** The inline producer in jobs.download merges leg observations last-write-wins. That hides a failure as soon as more than one harness observes. test/harness/controls/merge.mjs holds one function that keeps, for each control, the observation furthest from that control's own expect, and a second that adds per_harness to the rows qualifyControls returns. The step keeps its qualifyControls({ observations, pairs }) call text, and calls both.
- **MUST:** The merge order for each control, strongest first: an observation that disagrees with that control's expect pair, including a could-not-run with any other reason; then one that equals expect; then could-not-run with reason control-unobservable or stream-mapping-fact-not-applicable, which only say a leg could not observe. So Pi's stream-mapping-fact-not-applicable cannot sink exit0-denied-read, and a real pass on any leg still does.
- **MUST:** The locked t11 flow executes that step with only test/harness/controls reachable, so the module must live there. It is a new file so that E3 stays the one writer of controls/index.mjs and smoke/observations.mjs.

## Specification

- **Objective:** Each keyed harness refuses by name with zero model requests when its own key is absent, and each control row reports the leg furthest from that control's own expect.
- **Success state:** A Per-harness keyless control step runs on the codex, grok, opencode and pi pinned legs. The `missing-key` row carries `per_harness` with 5 keys and matches only when all 5 refuse. A failure on any leg survives either file walk order. `test/harness/ENVIRONMENT.md` names the new step.

Contract details:

- The harness comes from an env entry on that step, so the body stays runnable outside a matrix.
- The pair comes from the same leg as the kept observation. A tie prefers a leg carrying a pair, then sorts by harness and track, so the file walk order never decides a row.
- The result schema's controls items already accept extra fields, so no schema edit is needed.

## Acceptance Criteria (GIVEN-WHEN-THEN)

### AC-1: The real step body refuses each harness with zero requests [PRIMARY]

- **GIVEN:** the real `harness-eval.yml` step body with every credential removed
- **WHEN:** it executes for each of codex, grok, opencode and pi, then once with that harness's binding set to a placeholder
- **THEN:** 4 rows read `could-not-run` `missing-api-key` with `model_requests` 0 and `child_ran` false, and the placeholder run exits non-zero with `the keyless control is invalid`

```text
FLOW_REF:              null
TEST_TIER:             integration
VERIFICATION_SERVICE:  real workflow file, real guard, real child process marker
SURFACE_POLICY:        null
TDD_STATE:             none
TEST_FILE:             tests/sprint-02/missing-key-per-harness.test.mjs
TEST_FUNCTION:         MISSING-KEY-PER-HARNESS
VERIFY:                node --test --test-name-pattern 'MISSING-KEY-PER-HARNESS' tests/sprint-02/missing-key-per-harness.test.mjs
```

SCENARIO_SUMMARY: The real step body refuses all 4 harnesses with zero requests, and a bound placeholder invalidates the control.

### AC-2: A failing leg cannot be hidden by a later leg, a leg that could not observe cannot sink a row, and one bad harness unmatches the row [PRIMARY]

- **GIVEN:** cell files with `hidden-image-judge` failing on the first leg walked, `exit0-denied-read` reading `fail denied_tool_call` on claude-code and could-not-run `stream-mapping-fact-not-applicable` on pi
- **WHEN:** the producer step body runs over them, then with the file names reversed, then with codex's `exit0-denied-read` reading pass, then with grok's missing-key row reading pass
- **THEN:** both walks keep `hidden-image-judge` at `fail` and `exit0-denied-read` at `fail` with `matched` true, `missing-key` carries 5 `per_harness` keys, codex's pass reads `matched` false on that row, and grok's pass reads `matched` false on `missing-key`

```text
FLOW_REF:              null
TEST_TIER:             integration
VERIFICATION_SERVICE:  real controls module and the real producer step body over real cell files on disk
SURFACE_POLICY:        null
TDD_STATE:             none
TEST_FILE:             tests/sprint-02/missing-key-per-harness.test.mjs
TEST_FUNCTION:         CONTROLS-WORST-LEG-WINS
VERIFY:                node --test --test-name-pattern 'CONTROLS-WORST-LEG-WINS' tests/sprint-02/missing-key-per-harness.test.mjs
```

SCENARIO_SUMMARY: Real cell files in both walk orders: a failure survives, a leg that could not observe sinks nothing, and one bad harness unmatches the row.

Each AC's RED input and positive example are in its row of the contract block below.

## Test Criteria

Each TC runs its mapped AC's VERIFY.

| ID | Statement | Maps to |
|---|---|---|
| TC-1 | Each of the 4 step runs writes reason `missing-api-key` when no credential is set | AC-1 |
| TC-2 | The step body exits non-zero with `the keyless control is invalid` when the harness's binding holds a placeholder | AC-1 |
| TC-3 | The step holds no `secrets.` reference when the workflow file is parsed | AC-1 |
| TC-4 | `hidden-image-judge` reads `fail` in controls.json when the first leg walked failed it | AC-2 |
| TC-5 | `exit0-denied-read` reads `fail` when claude-code failed it while pi read `stream-mapping-fact-not-applicable` | AC-2 |
| TC-6 | `missing-key` reads `matched` false when grok's row reads pass | AC-2 |

## Reading List

1. `.github/workflows/harness-eval.yml` lines 209-256: the existing keyless control
2. `.github/workflows/harness-eval.yml` lines 362-412: the inline observation merge
3. `test/harness/smoke/observations.mjs` lines 425-455: attachMissingKey, reused unchanged
4. `test/harness/controls/index.mjs` lines 122-158: recordControl and the row's local half
5. `tests/sprint-01/grd-06-missing-key.test.mjs` lines 600-612: what the locked flow pins and how it executes a step body

Standards: `AGENTS.md`, `brain/docs/kanban/SCENARIO-CONTRACT-V1.md`.

## Guardrails

WRITE-ALLOWED:

- .github/workflows/harness-eval.yml (MODIFY)
- test/harness/controls/merge.mjs (NEW)
- test/harness/ENVIRONMENT.md (MODIFY)
- tests/sprint-02/missing-key-per-harness.test.mjs (NEW)

WRITE-PROHIBITED:

- test/harness/controls/index.mjs - E3 is its one writer
- test/harness/smoke/observations.mjs - E2 and E3 own it; `attachMissingKey` is reused unchanged
- The existing Keyless control step - sprint-01 flows pin it
- Any file not listed in WRITE-ALLOWED

## Code Pattern

```js
// .github/workflows/harness-eval.yml:386: the merge this task replaces. Last write wins.
const merge = (into, from) => {
  for (const [id, value] of Object.entries(from ?? {})) if (value != null) into[id] = hosted ? { ...value, hosted } : value;
};
```

- **Anti-pattern:** Binding a key on the new step; ranking every could-not-run as worst; editing `qualifyControls`; adding a fifth control row; letting file walk order decide a row.

## Design

None. This task has no UI surface.

## Agent Instructions

Work AC-1 then AC-2, one RED, GREEN, REFACTOR cycle each. Test by executing the real step body extracted from the workflow file. Start each run from an empty env plus an allowlist, and use only a literal placeholder as a key.

## Orchestrator Verification Protocol

1. **VERIFY_RED:** each VERIFY fails on base for the reason its RED names.
2. **VERIFY_GREEN:** each VERIFY exits 0.
3. Run every Evidence Gate and compare with Expected.
4. `git diff --name-only` lists only WRITE-ALLOWED paths.
5. Dispatch `github-agentic-workflow-reviewer` with this file, the RED and GREEN output, and the evidence.

## Agent Assignment

- **Planner:** `github-agentic-workflow-planner`
- **Implementer:** `devops-engineer`
- **Reviewer:** `github-agentic-workflow-reviewer`
- **Rationale:** `devops-engineer` owns workflow credential wiring. `github-agentic-workflow-reviewer` audits that a control can fail and that no secret moved.

## Evidence Gates

Every VERIFY above exits 0, then:

- **tests:** `node --test tests/sprint-02/missing-key-per-harness.test.mjs`. Expected: exit 0 with 2 passing tests
- **regression-controls:** `node --test tests/sprint-01/grd-06-missing-key.test.mjs tests/sprint-01/t15-hosted-controls.test.mjs tests/sprint-01/t11-controls-wiring.test.mjs`. Expected: exit 0: the locked keyless control and the producer step still hold
- **validate:** `pnpm validate`. Expected: exit 0

## Review Criteria

Must pass:

- One test per AC, named exactly as its TEST_FUNCTION.
- The new step binds no secret, and its harness comes from an env entry.
- `.controls` stays 4 rows.
- The kept pair comes from the same leg as the kept observation.
- The Keyless control step is byte-identical.

Should verify:

- The step keeps its `qualifyControls({ observations, pairs })` call text.
- A tie prefers a leg carrying a pair, then sorts by harness and track.

Verdict: APPROVED or NEEDS_FIXES, with file and line for each finding.

## Dependencies

- **Depends on:** none
- **Blocks:** none

## Notes

- **Flows:** owns no locked flow. Both ACs are task-local; gate step 23 reads the `per_harness` row, and step 25 reads the observations beside it.
- **Provenance:** target-sprint.json gate_sentence, per-harness missing-key control; test/harness/ENVIRONMENT.md

<!-- REQUIREMENT-CONTRACT v1 -->
<!--
{"version":"1","task_id":"GAW-8","task_type":"FEATURE","tdd_mode":"red_first","verification_policy":{"requires_tests":true,"requires_red_evidence":true,"requires_seeded_evidence":true},"guardrails":{"write_allowed":[".github/workflows/harness-eval.yml (MODIFY)","test/harness/controls/merge.mjs (NEW)","test/harness/ENVIRONMENT.md (MODIFY)","tests/sprint-02/missing-key-per-harness.test.mjs (NEW)"],"write_prohibited":["test/harness/controls/index.mjs - E3 is its one writer","test/harness/smoke/observations.mjs - E2 and E3 own it; `attachMissingKey` is reused unchanged","The existing Keyless control step - sprint-01 flows pin it","Any file not listed in WRITE-ALLOWED"]},"fixtures":{"seed/real-workflow-step":{"description":"The real harness-eval.yml, whose new step body is executed in a sandbox with every credential removed, once per keyed harness","seed_method":"cli","records":["5 keyed harnesses: claude-code, codex, grok, opencode, pi"]}},"verification_gates":[{"gate":"tests","command":"node --test tests/sprint-02/missing-key-per-harness.test.mjs","expected":"exit 0 with 2 passing tests","positive_example":"both tests pass over the real workflow file and real cell files"},{"gate":"regression-controls","command":"node --test tests/sprint-01/grd-06-missing-key.test.mjs tests/sprint-01/t15-hosted-controls.test.mjs tests/sprint-01/t11-controls-wiring.test.mjs","expected":"exit 0: the locked keyless control and the producer step still hold","positive_example":"the three sprint-01 files pass with the merge module in place"},{"gate":"validate","command":"pnpm validate","expected":"exit 0","positive_example":"every repo validator prints its pass line"}],"integration_obligations":[],"requirements":[{"id":"AC-1","type":"acceptance_criterion","primary":true,"description":"GIVEN the real `harness-eval.yml` step body with every credential removed WHEN it executes for each of codex, grok, opencode and pi, then once with that harness's binding set to a placeholder THEN 4 rows read `could-not-run` `missing-api-key` with `model_requests` 0 and `child_ran` false, and the placeholder run exits non-zero with `the keyless control is invalid`","flow_ref":null,"test_file":"tests/sprint-02/missing-key-per-harness.test.mjs","test_function":"MISSING-KEY-PER-HARNESS","verify":"node --test --test-name-pattern 'MISSING-KEY-PER-HARNESS' tests/sprint-02/missing-key-per-harness.test.mjs","test_tier":"integration","verification_service":"real workflow file, real guard, real child process marker","surface_policy":null,"positive_example":"For each of codex, grok, opencode and pi the body writes a row reading could-not-run, missing-api-key, 0 model requests, child_ran false, and attaches it to that cell record.","red":"On base no Per-harness keyless control step exists in harness-eval.yml, so the test finds no body to run.","maps_to_ac":null,"scenario":{"tier":"visible","test_tier":"integration","verification_service":"real workflow file, real guard, real child process marker","topology":"single-node","negative_control":{"would_fail_if":["the step binds a key, so absence proves nothing","the guard is removed and the marker child starts","the row is a hardcoded constant rather than the guard's own reason"]},"evidence":{"forms":["file_artifact","stdout"],"examples":["keyless-control.json per harness"],"required_capture":true},"build_proof":{"range":"anything that proves each keyed harness's binding is what the guard looks for and that it refuses without it","examples":["the guard reading that harness's pin"]},"cases":[{"start_ref":"seed/real-workflow-step","action":{"actor":"runner","steps":["extract the step body from the real workflow file","execute it for each of codex, grok, opencode, pi with every credential removed","execute it once with that harness's binding set to a placeholder"]},"end_state":{"must_observe":["4 rows reading `could-not-run` and `missing-api-key` with `model_requests` 0 and `child_ran` false","the placeholder run exits non-zero with `the keyless control is invalid`"],"must_not_observe":["`secrets.` anywhere in the step","a row reading pass","an empty row file"]}}]}},{"id":"AC-2","type":"acceptance_criterion","primary":true,"description":"GIVEN cell files with `hidden-image-judge` failing on the first leg walked, `exit0-denied-read` reading `fail denied_tool_call` on claude-code and could-not-run `stream-mapping-fact-not-applicable` on pi WHEN the producer step body runs over them, then with the file names reversed, then with codex's `exit0-denied-read` reading pass, then with grok's missing-key row reading pass THEN both walks keep `hidden-image-judge` at `fail` and `exit0-denied-read` at `fail` with `matched` true, `missing-key` carries 5 `per_harness` keys, codex's pass reads `matched` false on that row, and grok's pass reads `matched` false on `missing-key`","flow_ref":null,"test_file":"tests/sprint-02/missing-key-per-harness.test.mjs","test_function":"CONTROLS-WORST-LEG-WINS","verify":"node --test --test-name-pattern 'CONTROLS-WORST-LEG-WINS' tests/sprint-02/missing-key-per-harness.test.mjs","test_tier":"integration","verification_service":"real controls module and the real producer step body over real cell files on disk","surface_policy":null,"positive_example":"Five cell files with matching missing-key rows give a per_harness map of 5 and matched true. With claude-code reading fail denied_tool_call and pi reading could-not-run stream-mapping-fact-not-applicable, exit0-denied-read reads fail denied_tool_call in either walk order. A fail on any leg's hidden-image-judge survives in either order.","red":"On base the producer's merge overwrites by file order, so a later pass replaces an earlier hidden-image-judge fail, and a pi leg walked last replaces exit0-denied-read, and this test fails.","maps_to_ac":null,"scenario":{"tier":"visible","test_tier":"integration","verification_service":"real controls module and the real producer step body over real cell files on disk","topology":"single-node","negative_control":{"would_fail_if":["the merge stays last-write-wins, so a failing observation is removed","the merge ranks every could-not-run as worst, so a leg with no gate sinks exit0-denied-read","per_harness is omitted and one row speaks for five harnesses"]},"evidence":{"forms":["file_artifact"],"examples":["cells/controls.json"],"required_capture":true},"build_proof":{"range":"anything that proves each row reports the leg furthest from its own expect, and that the missing-key row names every keyed harness","examples":["one merge function in controls/merge.mjs"]},"cases":[{"start_ref":"seed/real-workflow-step","action":{"actor":"runner","steps":["write cell files for the keyed harnesses, with hidden-image-judge failing on the first in walk order, exit0-denied-read reading fail denied_tool_call on claude-code, and could-not-run stream-mapping-fact-not-applicable on pi","run the producer step body over them, then again with the file names reversed","run it again with codex's exit0-denied-read reading pass, then with grok's missing-key row reading pass"]},"end_state":{"must_observe":["`hidden-image-judge` reads `fail` in controls.json on both walks","`exit0-denied-read` reads `fail` `denied_tool_call` with `matched` true on both walks","`missing-key` carries `per_harness` with 5 keys on the first run","codex's pass makes `exit0-denied-read` read `pass` with `matched` false, and grok's pass makes `missing-key` read `matched` false"],"must_not_observe":["a controls array with other than 4 rows","`hidden-image-judge` reading pass on the first run","`exit0-denied-read` reading `stream-mapping-fact-not-applicable` while another leg observed it","an empty per_harness map"]}}]}},{"id":"TC-1","type":"test_criterion","description":"Each of the 4 step runs writes reason `missing-api-key` when no credential is set","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'MISSING-KEY-PER-HARNESS' tests/sprint-02/missing-key-per-harness.test.mjs","positive_example":"For each of codex, grok, opencode and pi the body writes a row reading could-not-run, missing-api-key, 0 model requests, child_ran false, and attaches it to that cell record."},{"id":"TC-2","type":"test_criterion","description":"The step body exits non-zero with `the keyless control is invalid` when the harness's binding holds a placeholder","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'MISSING-KEY-PER-HARNESS' tests/sprint-02/missing-key-per-harness.test.mjs","positive_example":"For each of codex, grok, opencode and pi the body writes a row reading could-not-run, missing-api-key, 0 model requests, child_ran false, and attaches it to that cell record."},{"id":"TC-3","type":"test_criterion","description":"The step holds no `secrets.` reference when the workflow file is parsed","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'MISSING-KEY-PER-HARNESS' tests/sprint-02/missing-key-per-harness.test.mjs","positive_example":"For each of codex, grok, opencode and pi the body writes a row reading could-not-run, missing-api-key, 0 model requests, child_ran false, and attaches it to that cell record."},{"id":"TC-4","type":"test_criterion","description":"`hidden-image-judge` reads `fail` in controls.json when the first leg walked failed it","maps_to_ac":"AC-2","verify":"node --test --test-name-pattern 'CONTROLS-WORST-LEG-WINS' tests/sprint-02/missing-key-per-harness.test.mjs","positive_example":"Five cell files with matching missing-key rows give a per_harness map of 5 and matched true. With claude-code reading fail denied_tool_call and pi reading could-not-run stream-mapping-fact-not-applicable, exit0-denied-read reads fail denied_tool_call in either walk order. A fail on any leg's hidden-image-judge survives in either order."},{"id":"TC-5","type":"test_criterion","description":"`exit0-denied-read` reads `fail` when claude-code failed it while pi read `stream-mapping-fact-not-applicable`","maps_to_ac":"AC-2","verify":"node --test --test-name-pattern 'CONTROLS-WORST-LEG-WINS' tests/sprint-02/missing-key-per-harness.test.mjs","positive_example":"Five cell files with matching missing-key rows give a per_harness map of 5 and matched true. With claude-code reading fail denied_tool_call and pi reading could-not-run stream-mapping-fact-not-applicable, exit0-denied-read reads fail denied_tool_call in either walk order. A fail on any leg's hidden-image-judge survives in either order."},{"id":"TC-6","type":"test_criterion","description":"`missing-key` reads `matched` false when grok's row reads pass","maps_to_ac":"AC-2","verify":"node --test --test-name-pattern 'CONTROLS-WORST-LEG-WINS' tests/sprint-02/missing-key-per-harness.test.mjs","positive_example":"Five cell files with matching missing-key rows give a per_harness map of 5 and matched true. With claude-code reading fail denied_tool_call and pi reading could-not-run stream-mapping-fact-not-applicable, exit0-denied-read reads fail denied_tool_call in either walk order. A fail on any leg's hidden-image-judge survives in either order."}]}
-->
