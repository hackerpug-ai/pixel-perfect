# TASK-T14 — Preserve a declared requiredness through capture so an optional denial is not a refusal

> Task ID: T14
> Sprint: [SPRINT.md](./SPRINT.md)
> Status: Backlog
> Assignee: ai-tooling-implementer
> Priority: P0
> Points: 3
> Type: BUG
> Planner: evals-planner
> Reviewer: evals-reviewer
> Proposed By: evals-reviewer
> Wave: 1
> Depends On: T3 (the capture layer), T6 (the harness mapper), T13 (landed: the graded cell path)
> TDD_MODE: red_first · RED_GREEN_REQUIRED: true

AGENT: planner=evals-planner | implementer=ai-tooling-implementer | reviewer=evals-reviewer

**Depends on:** T3 (`test/harness/runtime/capture.mjs` — `createCapture`, `observe`, `denials`, `undeclaredDenials`, `observedFacts`), T6 (`test/harness/adapters/claude-code.mjs` — `mapCapturedLine`, the mapper that declares requiredness per denial), T13 (the graded cell path and the archived exit-0 denied-write capture this task replays)
**Blocks:** T15 (its hosted producer cannot deliver a required denial while a declared `false` collapses to `null`), gate steps 6, 7 and 10, and the sprint's done statement

## Background

- **Source:** `PLAN-AMENDMENT-2026-10-30-capture-requiredness.json` (owner-authorized, item `amendment:T14`) and `.kb-run-sprint/sprint-01-evaluator-evidence-spine/decisions/amendment-T14.decision.json` (`outcome: add`, all five owner answers recorded). The finding is T13's cycle-2 uncertainty **U-T13-2**, reproduced by its reviewer and routed to the capture-layer owner because `test/harness/runtime/capture.mjs` was outside T13's write scope.
- **The hosted symptom:** run **41139161972** on `hackerpug-ai/pixel-perfect`, head `09547bc663f2c8326cc9d02a858b596969cb8bb7`, recorded at `.kb-run-sprint/sprint-01-evaluator-evidence-spine/T11/evidence/reviewer-cycle-3-r0/hosted-run-41139161972-result.json`. Both claude-code cells carry `command_list pass` and then `status: could-not-run / requiredness-undeclared` and `verify: could-not-run / requiredness-undeclared`. Every check whose stream contains a denial refuses, and no re-dispatch can change that while the capture layer erases the declaration.
- **The defect, located in one function** — `test/harness/runtime/capture.mjs:189-195`, inside `observe()`:

  ```js
  let required = null;
  if (observation.required_read === true) required = true;
  else if (required_read_paths !== null && observation.target != null) {
    required = required_read_paths.includes(observation.target);
  }
  ```

  Only `=== true` is honoured as a declaration. The single call site in the tree passes `{ required_read_paths: null }` (`test/harness/adapters/claude-code.mjs:1072`), so a mapper that declares `required_read: false` has it **overwritten with `null`**. The file's own doc comment above `observe()` promises all three values: "Requiredness is three-valued: true (declared required), false (declared optional because the caller named the required paths and this is not one), null (undeclared). Undeclared is not optional - the grader fails closed on it rather than reading silence as permission." The code implements two of the three.
- **Downstream, the erased value becomes a refusal:** `undeclaredDenials()` (`capture.mjs:304-309`) selects denials whose `required_read` is neither `true` nor `false`; `gradeFromEvidence` (`test/harness/runtime/grade-writer.mjs:94-98`) turns a non-empty result into `block("could-not-run", "requiredness-undeclared")`, and the aggregate makes that the cell's verdict.
- **The declared `false` is a real declaration, not a hypothetical:** the archived real capture `test/harness/smoke/fixtures/denied-write/claude-code-denied-write.{capture.json,stdout.bin}` records one guarded `claude -p` under `--permission-mode dontAsk` that exited **0** and attempted two denials inside one `result` event — a `Write` on `<cwd>/work/keep.txt` and a `Bash` command whose `tool_input` carries no file path. `mapCapturedLine` declares requiredness with `isRequiredPath(target, entry)` (`claude-code.mjs:762-767`), which returns `false` for a target-less denial: a deliberate `false`, recorded today as `null`. Replaying those bytes through `createCapture` + `mapCapturedLine` gives `denials: 1, undeclared: 1`, and `gradeFromEvidence` reads `could-not-run / requiredness-undeclared` — the hosted symptom, reproduced locally from real bytes.
- **Gate steps:** 6 (four `pass` verdicts per claude-code cell), 7 (identity), 10 (`files-and-event-stream` count and raw exit code), and 13 through them. **Capability:** CAP-EVAL-01. **PRD:** `09-technical-requirements/03-data-schema.md` § InvocationCapture (`observations[].required_read`); `02-system-components.md` § capture layer, § stream-grader; `07-uc-grd.md` UC-GRD-03 AC-1 (a graded verdict is not an exit code) and AC-2 (a denial a required path was denied is `fail`).
- **Why it matters:** the sprint's done statement asks for four graded claude-code checks, and two of the four (`status`, `verify`) are exactly the checks that read a stream in which the model attempted a tool call it did not need. A layer that converts the harness's own optional declaration into "undeclared" cannot grade them, so the gate is blocked by a one-line defect in shared code rather than by anything the product does.
- **Current (consumed):** T3's `createCapture`/`observe`/`denials`/`undeclaredDenials`/`observedFacts`; T6's `mapCapturedLine` and `isRequiredPath`; T7's block assembly; T13's `seed/denied-write-capture` and the graded cell path.
- **Desired (provided):** a capture layer that stores what the mapper declared, uses `required_read_paths` only where the mapper declared nothing, and stores `null` where nobody declared — so the same real stream grades `fail / denied_tool_call` from its required denial while an undeclared denial still fails closed.
- **Boundary contracts (read before editing):** `test/harness/smoke/observations.mjs:158` (`observeExit0DeniedRead`) selects `required_read === true`; `grade-writer.mjs:96` refuses on `requiredness-undeclared`; `tests/sprint-01/grd-03-evidence.test.mjs:345-355` asserts that an undeclared mapper records `null` and counts no denial (**that assertion must keep passing**); `grd-03:173,401,423` pass `required_read_paths` lists and must keep their denial counts; `test/harness/stream/normalise.mjs` and `grade-stream.mjs` carry a *separate* three-valued implementation that this task does not touch.

## Critical Constraints

- MUST preserve a mapper-declared boolean `required_read` verbatim, for **both** `true` and `false`, and MUST consult `required_read_paths` only when the mapper declared neither (`null` or the field absent).
- MUST keep `required_read: null` where neither the mapper nor a paths list declares, and MUST NOT soften `undeclaredDenials` or the `requiredness-undeclared` block: silence stays a refusal.
- MUST NOT derive requiredness from `process_status.exit_code`, from the presence of a denial, or from a second mapper pass. The declaration comes from the mapper and from nowhere else.
- MUST NOT change the observation record shape: `sequence`, `fact_id`, `kind`, `operation`, `target`, `detail`, `stream_offset`, `stream_end_offset` and `raw_sha256` keep their fields, order and values.
- MUST NOT modify `.github/workflows/harness-eval.yml`, `test/harness/smoke/observations.mjs`, `test/harness/adapters/claude-code.mjs`, `test/harness/runtime/grade-writer.mjs`, `test/harness/stream/**`, or any locked flow test file (`tests/sprint-01/grd-0*.test.mjs`, `t11-*`, `t13-*`). T15 owns the hosted producer path; this task is a single-layer fix in the capture module.
- MUST run the tests over the real archived bytes through the real `createCapture`/`observe` path. A fabricated stream, a replaced `observe`, or a mocked grader is not evidence and is refused at review.

## Specification

- **Objective:** make `CaptureSession.observe()` store the requiredness the mapper declared, so an optional denial in a real stream is optional rather than a refusal, while an undeclared denial still fails closed.
- **Success state:** `node --test tests/sprint-01/t14-capture-requiredness.test.mjs` is green with `tests 3`, `pass 3`, `fail 0`; `node --test test/harness/runtime/capture-observe.test.mjs` is green with `tests 2`, `pass 2`, `fail 0`; the archived exit-0 denied-write stream grades `fail / denied_tool_call` with `undeclaredDenials(record).length === 0`; the same stream with the optional denial's declaration removed still reads `could-not-run / requiredness-undeclared`.

### The change — one precedence, three values

`observe()` decides requiredness in this order, once per observation:

| Rank | Source | Stored value |
|---|---|---|
| 1 | the mapper declared a boolean (`observation.required_read === true \| false`) | that boolean, unchanged |
| 2 | the mapper declared nothing and `required_read_paths` is a non-null array and `observation.target != null` | `required_read_paths.includes(observation.target)` |
| 3 | nobody declared (mapper silent, no list, or a list with a `null` target) | `null` |

```js
let required = null;
if (typeof observation.required_read === "boolean") required = observation.required_read;
else if (required_read_paths !== null && observation.target != null) {
  required = required_read_paths.includes(observation.target);
}
```

The declaration outranks the fallback because the mapper is the only thing that knows what the harness's event means: T6's mapper decides requiredness from the resolved target and the invocation root, and a target-less denial is declared optional on purpose. `required_read_paths` remains what it is documented to be — the caller's answer for a mapper that could not say.

Nothing else moves. `denials()`, `undeclaredDenials()`, `observedFacts()`, `gradeFromEvidence` and the grade vocabulary are untouched; the fix changes what `observe()` stores, not what anyone does with it.

### Where the two new test files sit, and why

1. `test/harness/runtime/capture-observe.test.mjs` (**new**) — the capture module's own unit test. T3's write scope named "`test/harness/runtime/` (NEW) — guard, capture, stance, writer modules **and their unit tests**", and no unit test exists there today (`git ls-files test/harness/runtime` lists five modules and no test); until now `observe()` was exercised only indirectly through `FLOW-GRD-03`. Two tests: `observe-three-valued-contract` (the precedence table) and `observe-undeclared-stays-null` (the fallback the locked flow depends on).
2. `tests/sprint-01/t14-capture-requiredness.test.mjs` (**new**) — the sprint lane test. Three tests: `declared-optional-survives-capture` (AC-1), `undeclared-denial-still-closed` (AC-2) and `optional-denial-is-not-a-fact` (the derived views: `observedFacts` and the grade of the same record).

## Acceptance Criteria (GIVEN-WHEN-THEN)

### AC-1: A mapper-declared required_read: false survives capture, and its denial is not graded as undeclared

- **GIVEN:** `seed/denied-write-capture` — the archived exit-0 guarded invocation, whose real mapper declares the `Write` denial required and the target-less `Bash` denial optional
- **WHEN:** `node --test tests/sprint-01/t14-capture-requiredness.test.mjs --test-name-pattern declared-optional-survives-capture`
- **THEN:** exit 0, `tests 1`, `pass 1`, `fail 0`; the `Bash` denial records `required_read: false`; the `Write` denial records `true`; `undeclaredDenials(record).length` is `0`; `denials(record).length` is `1`; the graded cell reads `fail` with reason `denied_tool_call`; `process_status.exit_code` is `0` beside that verdict; and with `required_read_paths: ["/nonexistent/required.txt"]` the same two values hold

```text
TEST_TIER:             integration
VERIFICATION_SERVICE:  local: real createCapture replay of archived claude-code bytes + mapCapturedLine + gradeFromEvidence, node --test (no dispatch)
SURFACE_POLICY:        .spec/e2e-policy/sprint-01/artifact-only-read.json
TDD_STATE:             red_first
VERIFY:                node --test tests/sprint-01/t14-capture-requiredness.test.mjs --test-name-pattern declared-optional-survives-capture
EXPECT:                exit 0 · tests 1 · pass 1 · fail 0
```

- **RED input (fails on base):** `observe()` honours only `required_read === true`, so with `required_read_paths: null` the declared `false` is stored as `null`; `undeclaredDenials(record).length` is `1` and the cell reads `could-not-run / requiredness-undeclared`. Measured on base with the archived bytes: `permission_denied Bash required_read = null`, `permission_denied Write required_read = true`, `denials: 1 undeclared: 1`, cell `could-not-run / requiredness-undeclared`. The owned test file does not exist yet, so the command also fails before any assertion runs.
- **RED proof:** `.tmp/sprint-01-verification/t14-capture-requiredness.red.log`
- **positive_example (passes after landing):** `Bash → false`, `Write → true`, `undeclaredDenials` `0`, `denials` `1`, cell `fail / denied_tool_call` — the four numbers measured against a patched copy of `observe()` before this task was written.

SCENARIO_SUMMARY: complete SCENARIO lives once, in this AC's entry of the locked-scenarios block below.

### AC-2: An undeclared denial still reads null and still fails closed, so the fix never turns silence into permission

- **GIVEN:** `seed/declaration-stripped-capture` (the same archived bytes with the target-less `Bash` denial's declaration removed by the test's mapper) and `seed/empty-path-declaration` (the same bytes with `required_read_paths: []`)
- **WHEN:** `node --test tests/sprint-01/t14-capture-requiredness.test.mjs --test-name-pattern undeclared-denial-still-closed`
- **THEN:** exit 0, `tests 1`, `pass 1`, `fail 0`; the `Bash` denial records `required_read: null`; `undeclaredDenials(record).length` is `1`; `denials(record).length` is `1` for the declared `Write` denial; the cell reads `could-not-run` with reason `requiredness-undeclared`; and an empty paths list with a `null` target leaves the value `null` rather than inferring `false`

```text
TEST_TIER:             integration
VERIFICATION_SERVICE:  local: the same real replay with the declaration removed, graded through gradeFromEvidence, node --test (no dispatch)
SURFACE_POLICY:        .spec/e2e-policy/sprint-01/artifact-only-read.json
TDD_STATE:             red_first
VERIFY:                node --test tests/sprint-01/t14-capture-requiredness.test.mjs --test-name-pattern undeclared-denial-still-closed
EXPECT:                exit 0 · tests 1 · pass 1 · fail 0
```

- **RED input (fails on base):** the import fails because the owned file does not exist. The *behaviour* this AC pins is already correct on base (`null` → `requiredness-undeclared`), so this AC is the guard that stops the fix from buying AC-1 with permission: it goes red the moment `observe()` infers `false` from an absent declaration or from an empty paths list.
- **RED proof:** `.tmp/sprint-01-verification/t14-capture-requiredness.red.log`
- **positive_example (passes after landing):** `Bash → null`, `Write → true`, `undeclaredDenials` `1`, `denials` `1`, cell `could-not-run / requiredness-undeclared` — measured on a patched copy with the target-less denial's declaration stripped.

SCENARIO_SUMMARY: complete SCENARIO lives once, in this AC's entry of the locked-scenarios block below.

## Test Criteria

| ID | What it pins | Command | Expected |
|---|---|---|---|
| TC-1 | The three-valued precedence: a declared boolean wins, the paths list decides only where the mapper was silent, neither leaves `null` | `node --test test/harness/runtime/capture-observe.test.mjs --test-name-pattern observe-three-valued-contract` | exit 0 · `tests 1` · `pass 1` · `fail 0` |
| TC-2 | The paths fallback `FLOW-GRD-03` depends on is unchanged: no list → `null`, target named → `true`, target omitted → `false` | `node --test test/harness/runtime/capture-observe.test.mjs --test-name-pattern observe-undeclared-stays-null` | exit 0 · `tests 1` · `pass 1` · `fail 0` |
| TC-3 | A preserved `false` invents no required fact and does not weaken the required denial beside it | `node --test tests/sprint-01/t14-capture-requiredness.test.mjs` | exit 0 · `tests 3` · `pass 3` · `fail 0` |

Each SCENARIO for TC-1, TC-2 and TC-3 is in the locked-scenarios block below.

## Locked scenarios

Validated with `python3 /Users/justinrich/Projects/brain/tools/validate-scenario/validate_scenario.py`:
`ok: true`, five scenarios, zero violations. The `fixtures` map is the same one the projection carries, so a `start_ref` resolves to one definition.

```json
{
  "fixtures": {
    "seed/denied-write-capture": {
      "entrypoint": "test/harness/smoke/fixtures/denied-write/claude-code-denied-write.capture.json plus claude-code-denied-write.stdout.bin: one real guarded `claude -p` under --permission-mode dontAsk that exited 0, whose result event carries two permission denials (a Write on <cwd>/work/keep.txt, and a Bash denial whose tool_input holds no file path)",
      "description": "the archived exit-0 run whose real mapper declares the Write denial required and the target-less Bash denial optional; replayed through createCapture it is the one stream that carries a declared true and a declared false side by side",
      "seed_method": "recorded_external"
    },
    "seed/declaration-stripped-capture": {
      "entrypoint": "the same archived bytes replayed through createCapture().append, with only the target-less Bash denial's `required_read` key removed from mapCapturedLine's output before observe() sees it (no byte is edited and no capture method is replaced)",
      "description": "the same real stream with the optional denial declared neither way, so the layer must read silence as undeclared and refuse rather than pass",
      "seed_method": "migration_fixture"
    },
    "seed/empty-path-declaration": {
      "entrypoint": "the same archived bytes observed with { required_read_paths: [] } and the same stripped mapper, so the caller declared a required-path list that names nothing",
      "description": "a caller declaration with no entries: a denial whose target is null must still read undeclared rather than be inferred optional from an empty list",
      "seed_method": "migration_fixture"
    },
    "seed/hosted-run-41139161972": {
      "entrypoint": ".kb-run-sprint/sprint-01-evaluator-evidence-spine/T11/evidence/reviewer-cycle-3-r0/hosted-run-41139161972-result.json (gh run download 41139161972 -n harness-eval-result-41139161972-1)",
      "description": "the dispatched receipt at head 09547bc663f2c8326cc9d02a858b596969cb8bb7: both claude-code cells carry command_list pass, then status and verify at could-not-run / requiredness-undeclared",
      "seed_method": "recorded_external"
    }
  },
  "scenarios": [
    {
      "id": "SC-T14-AC1",
      "tier": "e2e-automated",
      "test_tier": "e2e",
      "negative_control": {
        "would_fail_if": [
          "observe() keeps honouring only `required_read === true`, so the mapper's declared `false` is stored as `null`, undeclaredDenials counts it, and any check on a stream with a target-less denial grades `could-not-run` / `requiredness-undeclared` exactly as hosted run 41139161972 did",
          "the fix infers requiredness from process_status.exit_code or from a retry instead of preserving the mapper's own declaration, so a denial is graded `fail` without any observation declaring it required",
          "the fix hardcodes `false` for every denial, so the required Write denial stops counting and a cell whose required write was denied grades `pass`"
        ]
      },
      "evidence": {
        "forms": [
          "the persisted InvocationCapture record's observations[].required_read for both denials",
          "the graded cell's verdict, reason and blocks[] assembled by gradeFromEvidence"
        ]
      },
      "cases": [
        {
          "start_ref": "seed/denied-write-capture",
          "action": {
            "actor": "runner",
            "steps": [
              "replay the archived stdout bytes through createCapture().append -> observe(mapCapturedLine, { required_read_paths: null }) -> finish({ exit_code: 0 }) -> persist(dir)",
              "node --test tests/sprint-01/t14-capture-requiredness.test.mjs --test-name-pattern declared-optional-survives-capture"
            ]
          },
          "end_state": {
            "must_observe": [
              "the target-less `Bash` denial records `required_read` `false`",
              "the `Write` denial on `<cwd>/work/keep.txt` records `required_read` `true`",
              "`undeclaredDenials(record).length` is 0",
              "`denials(record).length` is 1",
              "the graded cell reads `fail` with reason `denied_tool_call`",
              "`process_status.exit_code` is 0 beside that `fail` verdict"
            ],
            "must_not_observe": [
              "`requiredness-undeclared` in the cell's `reason` or in any `blocks[]` entry",
              "the target-less `Bash` denial recorded as `null`",
              "an empty `observations[]` array or a record with 0 denials"
            ]
          }
        },
        {
          "start_ref": "seed/denied-write-capture",
          "action": {
            "actor": "runner",
            "steps": [
              "observe the same bytes with { required_read_paths: [\"/nonexistent/required.txt\"] }, a caller declaration that names no denial target"
            ]
          },
          "end_state": {
            "must_observe": [
              "the target-less `Bash` denial still records `required_read` `false`",
              "the `Write` denial still records `required_read` `true`",
              "`undeclaredDenials(record).length` is 0"
            ],
            "must_not_observe": [
              "the mapper's `true` on the `Write` denial demoted to `false` by the paths list",
              "`required_read` `null` for a denial the mapper declared",
              "an empty `denials` set while a required write was denied"
            ]
          }
        }
      ],
      "topology_note": "one CaptureSession replay of real archived bytes; mapCapturedLine (T6, the real harness mapper) declares requiredness per denial, observe() stores it, and gradeFromEvidence (T7) turns undeclaredDenials into a could-not-run requiredness-undeclared block before any verdict is read; the cell is the same object T13's smoke leg writes",
      "tier_note": "the replay uses the real capture module, the real mapper and the real grader over the archived stdout bytes; only the child process is not re-spawned, because the bytes it produced are archived"
    },
    {
      "id": "SC-T14-AC2",
      "tier": "e2e-automated",
      "test_tier": "e2e",
      "negative_control": {
        "would_fail_if": [
          "the fix defaults an undeclared denial to `false`, so silence is read as permission and a stream nobody declared grades `pass` instead of refusing",
          "the fix removes the `requiredness-undeclared` block from gradeFromEvidence, so a capture that never declared requiredness still grades from its remaining observations",
          "the fix infers optional requiredness from an empty `required_read_paths` list while `target` is `null`"
        ]
      },
      "evidence": {
        "forms": [
          "the persisted record's observations[].required_read for a denial nobody declared",
          "the graded cell's could-not-run / requiredness-undeclared block"
        ]
      },
      "cases": [
        {
          "start_ref": "seed/declaration-stripped-capture",
          "action": {
            "actor": "runner",
            "steps": [
              "replay the archived bytes with a mapper that returns mapCapturedLine's observations minus the `required_read` key on the target-less `Bash` denial only",
              "grade the persisted record through gradeFromEvidence",
              "node --test tests/sprint-01/t14-capture-requiredness.test.mjs --test-name-pattern undeclared-denial-still-closed"
            ]
          },
          "end_state": {
            "must_observe": [
              "the `Bash` denial records `required_read` `null`",
              "`undeclaredDenials(record).length` is 1",
              "`denials(record).length` is 1 for the declared `Write` denial",
              "the cell reads `could-not-run` with reason `requiredness-undeclared`"
            ],
            "must_not_observe": [
              "the undeclared denial recorded as `false`",
              "a `pass` verdict beside an undeclared denial",
              "an empty `blocks[]` array"
            ]
          }
        },
        {
          "start_ref": "seed/empty-path-declaration",
          "action": {
            "actor": "runner",
            "steps": [
              "observe the same bytes with { required_read_paths: [] } and the same stripped mapper, so a declaration exists but names nothing and the denied target is null"
            ]
          },
          "end_state": {
            "must_observe": [
              "the `Bash` denial still records `required_read` `null`",
              "the cell reads `could-not-run` with reason `requiredness-undeclared`",
              "`undeclaredDenials(record).length` is 1"
            ],
            "must_not_observe": [
              "`required_read` `false` inferred from an empty paths list and a `null` target",
              "a `pass` verdict",
              "an empty `undeclaredDenials` set with 0 entries while the denial was never declared"
            ]
          }
        }
      ],
      "topology_note": "same replay path as AC-1, with the declaration removed instead of changed; undeclaredDenials -> gradeFromEvidence's requiredness-undeclared block is the whole fail-closed chain, so a fix that relaxes any link shows up as a pass here",
      "tier_note": "the undeclared shape is produced by the real mapper minus its declaration, over the same archived bytes; no capture method, no grader and no byte is replaced"
    },
    {
      "id": "SC-T14-TC1",
      "tier": "e2e-automated",
      "test_tier": "unit",
      "primary": false,
      "negative_control": {
        "would_fail_if": [
          "observe() keeps overwriting a declared `false` with `null`, so the precedence is not implemented and every optional denial becomes a refusal",
          "observe() lets `required_read_paths` override a mapper declaration, so a declared `true` is demoted whenever the caller's list omits the target",
          "observe() hardcodes the declaration away and returns `false` for everything the mapper left `null`"
        ]
      },
      "evidence": {
        "forms": [
          "the observations observe() returns for three declarations over the same captured line",
          "the node --test summary line counts"
        ]
      },
      "cases": [
        {
          "start_ref": "seed/denied-write-capture",
          "action": {
            "actor": "runner",
            "steps": [
              "node --test test/harness/runtime/capture-observe.test.mjs --test-name-pattern observe-three-valued-contract",
              "observe the archived bytes three ways: mapper declares `false`, mapper declares `true`, mapper declares nothing beside a paths list naming another target"
            ]
          },
          "end_state": {
            "must_observe": [
              "a mapper-declared `false` is stored as `false`",
              "a mapper-declared `true` is stored as `true`",
              "an undeclared denial beside `required_read_paths: [\"/x\"]` is stored as `null`",
              "`tests 1` with `pass 1` and `fail 0` from node --test"
            ],
            "must_not_observe": [
              "a declared `false` stored as `null`",
              "a declared `true` demoted by a paths list that omits its target",
              "an empty result set with 0 observations from the mapper"
            ]
          }
        }
      ],
      "topology_note": "the unit test drives the real CaptureSession over the archived bytes with a three-line table of declarations; nothing is mocked between the mapper and the stored observation",
      "tier_note": "unit: the module under test is observe() itself over one real captured stream, with no child process and no grader"
    },
    {
      "id": "SC-T14-TC2",
      "tier": "e2e-automated",
      "test_tier": "unit",
      "primary": false,
      "negative_control": {
        "would_fail_if": [
          "observe() ignores `required_read_paths` once the declaration path is added, so the caller's list is omitted and an undeclared mapper is never decided",
          "observe() returns `null` where a paths list naming the target exists, so a declared-required read is counted as undeclared",
          "observe() returns `false` where no declaration and no list exist, so the locked FLOW-GRD-03 assertion that an undeclared read is undeclared breaks"
        ]
      },
      "evidence": {
        "forms": [
          "the observations observe() returns for the three declaration shapes",
          "the node --test summary line counts"
        ]
      },
      "cases": [
        {
          "start_ref": "seed/denied-write-capture",
          "action": {
            "actor": "runner",
            "steps": [
              "node --test test/harness/runtime/capture-observe.test.mjs --test-name-pattern observe-undeclared-stays-null",
              "observe the archived bytes with a mapper that omits required_read, once with no paths list, once naming the archived Write target, once naming a different target"
            ]
          },
          "end_state": {
            "must_observe": [
              "with no paths list the denial records `required_read` `null`",
              "with the `Write` target declared required the same denial records `true`",
              "with a list that omits the target it records `false`",
              "`tests 1` with `pass 1` and `fail 0` from node --test"
            ],
            "must_not_observe": [
              "`null` where a paths list naming the target exists",
              "`false` where no declaration and no list exist",
              "an empty capture with 0 observations passing these assertions"
            ]
          }
        }
      ],
      "topology_note": "the unit test drives observe() over the same archived bytes three times with different caller declarations, which is exactly the axis FLOW-GRD-03's readAttemptMapper relies on",
      "tier_note": "unit: no child process, no grader; the only input is the archived stream and the caller's required_read_paths"
    },
    {
      "id": "SC-T14-TC3",
      "tier": "e2e-automated",
      "test_tier": "integration",
      "negative_control": {
        "would_fail_if": [
          "the preserved `false` is treated as a required fact, so a denied optional read inflates observedFacts and a cell passes on a fact nobody required",
          "the fix stops counting the declared-required Write denial, so a cell whose required write was denied loses the `fail` and the optional denial is all that is left",
          "the owned file adds tests without assertions, so `pass 3` is reported by an empty suite"
        ]
      },
      "evidence": {
        "forms": [
          "observedFacts(record) keys from the persisted record",
          "the graded cell's verdict and reason",
          "the node --test summary line counts"
        ]
      },
      "cases": [
        {
          "start_ref": "seed/denied-write-capture",
          "action": {
            "actor": "runner",
            "steps": [
              "node --test tests/sprint-01/t14-capture-requiredness.test.mjs",
              "read observedFacts(record) and grade the same record twice: once with no required facts and once with plugin-loaded and result-event declared required"
            ]
          },
          "end_state": {
            "must_observe": [
              "`tests 3` with `pass 3` and `fail 0`",
              "`observedFacts(record)` holds exactly 2 entries: `plugin-loaded` and `result-event`",
              "the record graded with both required facts satisfied still reads `fail` with reason `denied_tool_call`"
            ],
            "must_not_observe": [
              "an `observedFacts` entry for the optional `Bash` denial",
              "a `pass` verdict where a declared-required write was denied",
              "an empty test file with 0 tests reporting `pass 3`"
            ]
          }
        }
      ],
      "topology_note": "the owned file's third case runs the same real replay and reads two derived views of one record - the fact map and the grade - so a change in either direction (false counted as a fact, or the required denial dropped) fails it",
      "tier_note": "integration: real capture module, real mapper, real grade writer, archived bytes; no child process"
    }
  ]
}
```

## Guardrails

WRITE-ALLOWED:

- test/harness/runtime/capture.mjs
- test/harness/runtime/capture-observe.test.mjs
- tests/sprint-01/t14-capture-requiredness.test.mjs
- .spec/prds/harness-eval-framework/tasks/sprint-01-evaluator-evidence-spine/TASK-T14.md

WRITE-PROHIBITED:

- .github/workflows/harness-eval.yml
- test/harness/smoke/observations.mjs
- test/harness/adapters/claude-code.mjs
- test/harness/runtime/grade-writer.mjs
- test/harness/stream/**
- tests/sprint-01/grd-0*.test.mjs
- tests/sprint-01/t11-*.test.mjs
- tests/sprint-01/t13-smoke-observations.test.mjs
- .kb-run-sprint/**
- plugins/pixel-perfect/**
- Any file not listed in write_allowed

## Evidence Gates

- **AC-1:** `node --test tests/sprint-01/t14-capture-requiredness.test.mjs --test-name-pattern declared-optional-survives-capture`. Expected: exit 0, `tests 1`, `pass 1`, `fail 0`.
- **AC-2:** `node --test tests/sprint-01/t14-capture-requiredness.test.mjs --test-name-pattern undeclared-denial-still-closed`. Expected: exit 0, `tests 1`, `pass 1`, `fail 0`.
- **TC-1:** `node --test test/harness/runtime/capture-observe.test.mjs --test-name-pattern observe-three-valued-contract`. Expected: exit 0, `tests 1`, `pass 1`, `fail 0`.
- **TC-2:** `node --test test/harness/runtime/capture-observe.test.mjs --test-name-pattern observe-undeclared-stays-null`. Expected: exit 0, `tests 1`, `pass 1`, `fail 0`.
- **TC-3:** `node --test tests/sprint-01/t14-capture-requiredness.test.mjs`. Expected: exit 0, `tests 3`, `pass 3`, `fail 0`.
- **Owned unit file:** `node --test test/harness/runtime/capture-observe.test.mjs`. Expected: `tests 2`, `pass 2`, `fail 0`.
- **regression (three locked files):** `node --test tests/sprint-01/grd-03-evidence.test.mjs --test-name-pattern FLOW-GRD-03-FILES-AND-STREAM` → `pass 8`, `fail 0` (measured on base 2026-10-30); `node --test tests/sprint-01/grd-06-missing-key.test.mjs --test-name-pattern FLOW-GRD-06-MISSING-KEY` → `tests 1`, `pass 1`, `fail 0` (measured on base); `node --test tests/sprint-01/t13-smoke-observations.test.mjs` → `tests 5`, `pass 5`, `fail 0` (measured on base). All three must stay green: grd-03 pins the `null` case this task preserves, and t13 replays the same archived capture whose `Write` denial must keep counting.
- **repro (not a verify):** the base reproduction is recorded in `.tmp/sprint-01-verification/t14-capture-requiredness.red.log`; it replays `claude-code-denied-write.stdout.bin` through `createCapture` + `mapCapturedLine` and prints the two denials' `required_read` values plus the graded verdict.

## Review Criteria

Must pass:

- `observe()` stores a mapper-declared `true` **and** a mapper-declared `false`; `required_read_paths` is consulted only when the mapper declared nothing; `null` survives when neither declared.
- The change is confined to `observe()`'s requiredness computation. `denials`, `undeclaredDenials`, `observedFacts`, `gradeFromEvidence` and the observation record shape are byte-for-byte unchanged.
- Both new files drive the real `createCapture`. No stubbed `observe`, no fabricated stream, no mocked grader; the archived bytes are read from `test/harness/smoke/fixtures/denied-write/`.
- Every expected count in this task file is the count the command prints; the RED proof predates the fix.
- The three locked regressions are green and unmodified; `git diff --name-only` lists only WRITE-ALLOWED paths.
- The AC-2 guard is real: a fix that infers `false` for an undeclared denial fails it.

Should verify: `observe()` called with no options at all (`observe(mapper)`) behaves like `{ required_read_paths: null }`; the unit file names the real archived fixture as its input rather than a hand-written line; no new field appears on an observation.

Verdict: APPROVED or NEEDS_FIXES, with file and line for each finding.

## Dependencies

- **Depends on:** T3 (capture layer, landed), T6 (the mapper, landed), T13 (the archived exit-0 capture and the graded cell path, landed `45142ee`).
- **Blocks:** T15 (the hosted producer path cannot produce a required denial while the declaration is erased at capture), gate steps 6, 7, 10.

A shared file is not a dependency, and needing another task's output to test against is that flow's integration obligation, not an edge. `test/harness/adapters/claude-code.mjs` and `test/harness/smoke/observations.mjs` are **read** by this task and written by T15; the archive is read-only input.

## Out of Scope

- The hosted producer path: emitting a required denial from a real smoke leg, and the `installation-identity-mismatch` that hosted run 41139161972 also shows on the `newest` track. T15 owns both.
- Deciding whether a target-less `Bash` authority denial *should* be required. `isRequiredPath(null, entry)` returns `false`, T6 declared that deliberately, and changing it is a product decision nobody has made. This task preserves the declaration; it does not choose one.
- Re-grading the hosted receipt, dispatching a run, adding a grade reason, or touching the separate requiredness implementation in `test/harness/stream/normalise.mjs` and `grade-stream.mjs`.

## Notes

- **Why this is not a stubbed test.** Every assertion runs through the real path a hosted run uses: `createCapture()` builds a `CaptureSession`, `append()` receives the **archived stdout bytes** produced by a real guarded `claude -p` (`test/harness/smoke/fixtures/denied-write/claude-code-denied-write.stdout.bin`, 172 589 bytes, sha256 `dbbdfe9c…594b`), `lines()` measures each line's byte span, `mapCapturedLine` (T6's production mapper) declares requiredness per denial, `observe()` stores it, `spanOf()` re-hashes each cited span, `finish({ exit_code: 0 })` records the real exit, `persist(dir)` writes the record and its bytes, and `gradeFromEvidence` (T7's production grader) assembles the cell through the same schema validation a hosted cell passes. The only thing not re-run is the child process, because the bytes it produced are archived — the capture layer cannot tell the difference, and that is the point of the archive. The one deliberate input change is the mapper's declaration in AC-2, which is the axis under test, and it removes a key rather than inventing an observation.
- **Why the declaration outranks the paths list.** `required_read_paths` is the *caller's* answer for events the mapper could not classify; a mapper that classified an event has said something stronger. Ranking the list above the declaration would also silently re-open the defect in the other direction: a caller passing a shorter list would demote a required denial to optional, which is the failure `FLOW-GRD-03` exists to catch.
- **The unit test is new, not moved.** `git ls-files test/harness/runtime` shows five modules and no test file; T3's write scope promised "and their unit tests", and none were written. `observe()` has been covered only through `FLOW-GRD-03`, which is why a one-line erasure survived four landed tasks.
- **Why `false` is not the same as absent.** `undeclaredDenials` exists because a missing declaration is a hole in the evidence, not a permission. Preserving a declared `false` makes the evidence *more* specific; inferring `false` from silence would make it weaker. The same word means two different things and only one of them is honest, which is why AC-2 is written as a guard rather than a follow-up.
- **Flow ownership:** this task owns no locked flow. It repairs the module `FLOW-GRD-03-FILES-AND-STREAM` and `FLOW-GRD-06-MISSING-KEY` read; both keep every assertion.
- **Split check:** not triggered — 3 points, one function, two behaviours (preserve a declaration, refuse silence), and the second is a guard rather than a second feature.
- **Build order:** AC-1's `observe()` change, then `test/harness/runtime/capture-observe.test.mjs` (TC-1, TC-2 — they run without the sprint lane file), then `tests/sprint-01/t14-capture-requiredness.test.mjs` (AC-1, AC-2, TC-3), then the three locked regressions. Do not dispatch: the hosted receipt is the sprint gate.
- **Owner:** `evals-planner`; sprint `sprint-01-evaluator-evidence-spine`.

## Handoff

```json
{
  "task": "T14",
  "status": "not started — placeholder, written by the implementer on completion",
  "commit_sha": null,
  "done": null,
  "deviations": [],
  "concerns": [],
  "findings": [],
  "scope_impact": [],
  "feedback": []
}
```

## Review

Placeholder — the reviewer writes the verdict here.

```json
{
  "task": "T14",
  "verdict": null,
  "cycle": null,
  "findings": [],
  "notes": "Placeholder. The reviewer replaces this block with APPROVED or NEEDS_FIXES and one entry per finding, each carrying file, line and basis (reproduced | reasoned | suspected)."
}
```

<!-- REQUIREMENT-CONTRACT v1 -->
<!--
{
  "version": "1",
  "task_id": "T14",
  "task_type": "BUG",
  "tdd_mode": "red_first",
  "verification_policy": {
    "requires_red_evidence": true,
    "requires_seeded_evidence": true,
    "requires_tests": true
  },
  "guardrails": {
    "write_allowed": [
      "test/harness/runtime/capture.mjs",
      "test/harness/runtime/capture-observe.test.mjs",
      "tests/sprint-01/t14-capture-requiredness.test.mjs",
      ".spec/prds/harness-eval-framework/tasks/sprint-01-evaluator-evidence-spine/TASK-T14.md"
    ],
    "write_prohibited": [
      "plugins/pixel-perfect/**"
    ]
  },
  "fixtures": {
    "seed/declaration-stripped-capture": {
      "description": "the same real stream with the optional denial declared neither way, so the layer must read silence as undeclared and refuse rather than pass",
      "entrypoint": "the same archived bytes replayed through createCapture().append, with only the target-less Bash denial's `required_read` key removed from mapCapturedLine's output before observe() sees it (no byte is edited and no capture method is replaced)",
      "seed_method": "migration_fixture"
    },
    "seed/denied-write-capture": {
      "description": "the archived exit-0 run whose real mapper declares the Write denial required and the target-less Bash denial optional; replayed through createCapture it is the one stream that carries a declared true and a declared false side by side",
      "entrypoint": "test/harness/smoke/fixtures/denied-write/claude-code-denied-write.capture.json plus claude-code-denied-write.stdout.bin: one real guarded `claude -p` under --permission-mode dontAsk that exited 0, whose result event carries two permission denials (a Write on <cwd>/work/keep.txt, and a Bash denial whose tool_input holds no file path)",
      "seed_method": "recorded_external"
    },
    "seed/empty-path-declaration": {
      "description": "a caller declaration with no entries: a denial whose target is null must still read undeclared rather than be inferred optional from an empty list",
      "entrypoint": "the same archived bytes observed with { required_read_paths: [] } and the same stripped mapper, so the caller declared a required-path list that names nothing",
      "seed_method": "migration_fixture"
    },
    "seed/hosted-run-41139161972": {
      "description": "the dispatched receipt at head 09547bc663f2c8326cc9d02a858b596969cb8bb7: both claude-code cells carry command_list pass, then status and verify at could-not-run / requiredness-undeclared",
      "entrypoint": ".kb-run-sprint/sprint-01-evaluator-evidence-spine/T11/evidence/reviewer-cycle-3-r0/hosted-run-41139161972-result.json (gh run download 41139161972 -n harness-eval-result-41139161972-1)",
      "seed_method": "recorded_external"
    }
  },
  "requirements": [
    {
      "description": "GIVEN seed/denied-write-capture WHEN declared-optional-survives-capture runs THEN the declared-optional Bash denial records false, the declared-required Write denial records true, undeclaredDenials is empty, and the cell grades fail/denied_tool_call beside exit 0",
      "flow_ref": null,
      "id": "AC-1",
      "maps_to_ac": null,
      "positive_example": "the archived exit-0 stream grades fail / denied_tool_call: the target-less Bash denial records required_read false, the Write denial records true, undeclaredDenials(record).length is 0, denials(record).length is 1, and the same declaration still wins when the caller passes a required_read_paths list that names no denial target.",
      "primary": true,
      "red_input": "on base main observe() starts `required = null` and honours only `required_read === true`, so with required_read_paths null the mapper's declared false for the target-less Bash denial is stored as null, undeclaredDenials(record).length is 1, and the cell reads could-not-run / requiredness-undeclared - the exact verdict both claude-code cells carry in hosted run 41139161972",
      "red_proof": ".tmp/sprint-01-verification/t14-capture-requiredness.red.log",
      "scenario": {
        "cases": [
          {
            "action": {
              "actor": "runner",
              "steps": [
                "replay the archived stdout bytes through createCapture().append -> observe(mapCapturedLine, { required_read_paths: null }) -> finish({ exit_code: 0 }) -> persist(dir)",
                "node --test tests/sprint-01/t14-capture-requiredness.test.mjs --test-name-pattern declared-optional-survives-capture"
              ]
            },
            "end_state": {
              "must_not_observe": [
                "`requiredness-undeclared` in the cell's `reason` or in any `blocks[]` entry",
                "the target-less `Bash` denial recorded as `null`",
                "an empty `observations[]` array or a record with 0 denials"
              ],
              "must_observe": [
                "the target-less `Bash` denial records `required_read` `false`",
                "the `Write` denial on `<cwd>/work/keep.txt` records `required_read` `true`",
                "`undeclaredDenials(record).length` is 0",
                "`denials(record).length` is 1",
                "the graded cell reads `fail` with reason `denied_tool_call`",
                "`process_status.exit_code` is 0 beside that `fail` verdict"
              ]
            },
            "start_ref": "seed/denied-write-capture"
          },
          {
            "action": {
              "actor": "runner",
              "steps": [
                "observe the same bytes with { required_read_paths: [\"/nonexistent/required.txt\"] }, a caller declaration that names no denial target"
              ]
            },
            "end_state": {
              "must_not_observe": [
                "the mapper's `true` on the `Write` denial demoted to `false` by the paths list",
                "`required_read` `null` for a denial the mapper declared",
                "an empty `denials` set while a required write was denied"
              ],
              "must_observe": [
                "the target-less `Bash` denial still records `required_read` `false`",
                "the `Write` denial still records `required_read` `true`",
                "`undeclaredDenials(record).length` is 0"
              ]
            },
            "start_ref": "seed/denied-write-capture"
          }
        ],
        "evidence": {
          "forms": [
            "the persisted InvocationCapture record's observations[].required_read for both denials",
            "the graded cell's verdict, reason and blocks[] assembled by gradeFromEvidence"
          ]
        },
        "id": "SC-T14-AC1",
        "negative_control": {
          "would_fail_if": [
            "observe() keeps honouring only `required_read === true`, so the mapper's declared `false` is stored as `null`, undeclaredDenials counts it, and any check on a stream with a target-less denial grades `could-not-run` / `requiredness-undeclared` exactly as hosted run 41139161972 did",
            "the fix infers requiredness from process_status.exit_code or from a retry instead of preserving the mapper's own declaration, so a denial is graded `fail` without any observation declaring it required",
            "the fix hardcodes `false` for every denial, so the required Write denial stops counting and a cell whose required write was denied grades `pass`"
          ]
        },
        "test_tier": "e2e",
        "tier": "e2e-automated",
        "tier_note": "the replay uses the real capture module, the real mapper and the real grader over the archived stdout bytes; only the child process is not re-spawned, because the bytes it produced are archived",
        "topology_note": "one CaptureSession replay of real archived bytes; mapCapturedLine (T6, the real harness mapper) declares requiredness per denial, observe() stores it, and gradeFromEvidence (T7) turns undeclaredDenials into a could-not-run requiredness-undeclared block before any verdict is read; the cell is the same object T13's smoke leg writes"
      },
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "test_file": "tests/sprint-01/t14-capture-requiredness.test.mjs",
      "test_function": "declared-optional-survives-capture",
      "test_tier": "integration",
      "title": "A mapper-declared required_read: false survives capture, and its denial is not graded as undeclared",
      "type": "acceptance_criterion",
      "verify": "node --test tests/sprint-01/t14-capture-requiredness.test.mjs --test-name-pattern declared-optional-survives-capture"
    },
    {
      "description": "GIVEN seed/declaration-stripped-capture and seed/empty-path-declaration WHEN undeclared-denial-still-closed runs THEN the undeclared denial reads null, undeclaredDenials counts it, and the cell reads could-not-run / requiredness-undeclared",
      "flow_ref": null,
      "id": "AC-2",
      "maps_to_ac": null,
      "positive_example": "a stream whose target-less Bash denial was never declared reads required_read null, undeclaredDenials(record).length is 1 beside a properly declared Write denial, and the cell reads could-not-run / requiredness-undeclared - even when the caller passes required_read_paths: [] and the denial target is null.",
      "primary": false,
      "red_input": "on base main the undeclared case already reads null, so this AC is not red for the fix - it is the guard that the fix does not buy AC-1 with permission: it goes red the moment observe() infers false (or a caller's empty list infers false), and its RED proof is the same base run recorded for AC-1",
      "red_proof": ".tmp/sprint-01-verification/t14-capture-requiredness.red.log",
      "scenario": {
        "cases": [
          {
            "action": {
              "actor": "runner",
              "steps": [
                "replay the archived bytes with a mapper that returns mapCapturedLine's observations minus the `required_read` key on the target-less `Bash` denial only",
                "grade the persisted record through gradeFromEvidence",
                "node --test tests/sprint-01/t14-capture-requiredness.test.mjs --test-name-pattern undeclared-denial-still-closed"
              ]
            },
            "end_state": {
              "must_not_observe": [
                "the undeclared denial recorded as `false`",
                "a `pass` verdict beside an undeclared denial",
                "an empty `blocks[]` array"
              ],
              "must_observe": [
                "the `Bash` denial records `required_read` `null`",
                "`undeclaredDenials(record).length` is 1",
                "`denials(record).length` is 1 for the declared `Write` denial",
                "the cell reads `could-not-run` with reason `requiredness-undeclared`"
              ]
            },
            "start_ref": "seed/declaration-stripped-capture"
          },
          {
            "action": {
              "actor": "runner",
              "steps": [
                "observe the same bytes with { required_read_paths: [] } and the same stripped mapper, so a declaration exists but names nothing and the denied target is null"
              ]
            },
            "end_state": {
              "must_not_observe": [
                "`required_read` `false` inferred from an empty paths list and a `null` target",
                "a `pass` verdict",
                "an empty `undeclaredDenials` set with 0 entries while the denial was never declared"
              ],
              "must_observe": [
                "the `Bash` denial still records `required_read` `null`",
                "the cell reads `could-not-run` with reason `requiredness-undeclared`",
                "`undeclaredDenials(record).length` is 1"
              ]
            },
            "start_ref": "seed/empty-path-declaration"
          }
        ],
        "evidence": {
          "forms": [
            "the persisted record's observations[].required_read for a denial nobody declared",
            "the graded cell's could-not-run / requiredness-undeclared block"
          ]
        },
        "id": "SC-T14-AC2",
        "negative_control": {
          "would_fail_if": [
            "the fix defaults an undeclared denial to `false`, so silence is read as permission and a stream nobody declared grades `pass` instead of refusing",
            "the fix removes the `requiredness-undeclared` block from gradeFromEvidence, so a capture that never declared requiredness still grades from its remaining observations",
            "the fix infers optional requiredness from an empty `required_read_paths` list while `target` is `null`"
          ]
        },
        "test_tier": "e2e",
        "tier": "e2e-automated",
        "tier_note": "the undeclared shape is produced by the real mapper minus its declaration, over the same archived bytes; no capture method, no grader and no byte is replaced",
        "topology_note": "same replay path as AC-1, with the declaration removed instead of changed; undeclaredDenials -> gradeFromEvidence's requiredness-undeclared block is the whole fail-closed chain, so a fix that relaxes any link shows up as a pass here"
      },
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "test_file": "tests/sprint-01/t14-capture-requiredness.test.mjs",
      "test_function": "undeclared-denial-still-closed",
      "test_tier": "integration",
      "title": "An undeclared denial still reads null and still fails closed, so the fix never turns silence into permission",
      "type": "acceptance_criterion",
      "verify": "node --test tests/sprint-01/t14-capture-requiredness.test.mjs --test-name-pattern undeclared-denial-still-closed"
    },
    {
      "description": "The capture module's own unit test pins the three-valued precedence: a mapper-declared boolean wins, a paths list decides only where the mapper declared nothing, and neither leaves null",
      "flow_ref": null,
      "id": "TC-1",
      "maps_to_ac": "AC-1",
      "positive_example": "observe() over one line stores `false` for a declared false, `true` for a declared true, and `null` when the mapper omitted the field beside a paths list that names a different target - asserted as three separate observations of the same real bytes.",
      "primary": false,
      "red_input": "on base main the false and null rows collapse to the same stored value, so the test fails on the very assertion it was written for; the file does not exist yet, so it fails at import",
      "red_proof": ".tmp/sprint-01-verification/t14-capture-requiredness.red.log",
      "scenario": {
        "cases": [
          {
            "action": {
              "actor": "runner",
              "steps": [
                "node --test test/harness/runtime/capture-observe.test.mjs --test-name-pattern observe-three-valued-contract",
                "observe the archived bytes three ways: mapper declares `false`, mapper declares `true`, mapper declares nothing beside a paths list naming another target"
              ]
            },
            "end_state": {
              "must_not_observe": [
                "a declared `false` stored as `null`",
                "a declared `true` demoted by a paths list that omits its target",
                "an empty result set with 0 observations from the mapper"
              ],
              "must_observe": [
                "a mapper-declared `false` is stored as `false`",
                "a mapper-declared `true` is stored as `true`",
                "an undeclared denial beside `required_read_paths: [\"/x\"]` is stored as `null`",
                "`tests 1` with `pass 1` and `fail 0` from node --test"
              ]
            },
            "start_ref": "seed/denied-write-capture"
          }
        ],
        "evidence": {
          "forms": [
            "the observations observe() returns for three declarations over the same captured line",
            "the node --test summary line counts"
          ]
        },
        "id": "SC-T14-TC1",
        "negative_control": {
          "would_fail_if": [
            "observe() keeps overwriting a declared `false` with `null`, so the precedence is not implemented and every optional denial becomes a refusal",
            "observe() lets `required_read_paths` override a mapper declaration, so a declared `true` is demoted whenever the caller's list omits the target",
            "observe() hardcodes the declaration away and returns `false` for everything the mapper left `null`"
          ]
        },
        "primary": false,
        "test_tier": "unit",
        "tier": "e2e-automated",
        "tier_note": "unit: the module under test is observe() itself over one real captured stream, with no child process and no grader",
        "topology_note": "the unit test drives the real CaptureSession over the archived bytes with a three-line table of declarations; nothing is mocked between the mapper and the stored observation"
      },
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "test_file": "test/harness/runtime/capture-observe.test.mjs",
      "test_function": "observe-three-valued-contract",
      "test_tier": "unit",
      "type": "test_criterion",
      "verify": "node --test test/harness/runtime/capture-observe.test.mjs --test-name-pattern observe-three-valued-contract"
    },
    {
      "description": "The paths fallback that FLOW-GRD-03 depends on is unchanged: a mapper that declares nothing is decided by required_read_paths, and null only when there is no list at all",
      "flow_ref": null,
      "id": "TC-2",
      "maps_to_ac": "AC-2",
      "positive_example": "with no paths list the undeclared denial records null; with the denied Write target declared required the same denial records true; with a list that omits it the denial records false - the three outcomes the locked flow asserts.",
      "primary": false,
      "red_input": "on base main this branch already behaves, so the test passes before the fix; it exists to pin the branch the fix touches most, and it fails if the fix replaces the fallback with a blanket default",
      "red_proof": ".tmp/sprint-01-verification/t14-capture-requiredness.red.log",
      "scenario": {
        "cases": [
          {
            "action": {
              "actor": "runner",
              "steps": [
                "node --test test/harness/runtime/capture-observe.test.mjs --test-name-pattern observe-undeclared-stays-null",
                "observe the archived bytes with a mapper that omits required_read, once with no paths list, once naming the archived Write target, once naming a different target"
              ]
            },
            "end_state": {
              "must_not_observe": [
                "`null` where a paths list naming the target exists",
                "`false` where no declaration and no list exist",
                "an empty capture with 0 observations passing these assertions"
              ],
              "must_observe": [
                "with no paths list the denial records `required_read` `null`",
                "with the `Write` target declared required the same denial records `true`",
                "with a list that omits the target it records `false`",
                "`tests 1` with `pass 1` and `fail 0` from node --test"
              ]
            },
            "start_ref": "seed/denied-write-capture"
          }
        ],
        "evidence": {
          "forms": [
            "the observations observe() returns for the three declaration shapes",
            "the node --test summary line counts"
          ]
        },
        "id": "SC-T14-TC2",
        "negative_control": {
          "would_fail_if": [
            "observe() ignores `required_read_paths` once the declaration path is added, so the caller's list is omitted and an undeclared mapper is never decided",
            "observe() returns `null` where a paths list naming the target exists, so a declared-required read is counted as undeclared",
            "observe() returns `false` where no declaration and no list exist, so the locked FLOW-GRD-03 assertion that an undeclared read is undeclared breaks"
          ]
        },
        "primary": false,
        "test_tier": "unit",
        "tier": "e2e-automated",
        "tier_note": "unit: no child process, no grader; the only input is the archived stream and the caller's required_read_paths",
        "topology_note": "the unit test drives observe() over the same archived bytes three times with different caller declarations, which is exactly the axis FLOW-GRD-03's readAttemptMapper relies on"
      },
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "test_file": "test/harness/runtime/capture-observe.test.mjs",
      "test_function": "observe-undeclared-stays-null",
      "test_tier": "unit",
      "type": "test_criterion",
      "verify": "node --test test/harness/runtime/capture-observe.test.mjs --test-name-pattern observe-undeclared-stays-null"
    },
    {
      "description": "The owned lane file pins that a preserved false neither invents a required fact nor weakens the required denial beside it",
      "flow_ref": null,
      "id": "TC-3",
      "maps_to_ac": "AC-1",
      "positive_example": "observedFacts(record) holds exactly plugin-loaded and result-event - no entry for the optional Bash denial - and the same record graded with both required facts satisfied still reads fail / denied_tool_call.",
      "primary": false,
      "red_input": "on base main the optional Bash denial is stored as null, so observedFacts and the grade are read from a record whose requiredness was destroyed; the import of the owned file fails before any assertion runs",
      "red_proof": ".tmp/sprint-01-verification/t14-capture-requiredness.red.log",
      "scenario": {
        "cases": [
          {
            "action": {
              "actor": "runner",
              "steps": [
                "node --test tests/sprint-01/t14-capture-requiredness.test.mjs",
                "read observedFacts(record) and grade the same record twice: once with no required facts and once with plugin-loaded and result-event declared required"
              ]
            },
            "end_state": {
              "must_not_observe": [
                "an `observedFacts` entry for the optional `Bash` denial",
                "a `pass` verdict where a declared-required write was denied",
                "an empty test file with 0 tests reporting `pass 3`"
              ],
              "must_observe": [
                "`tests 3` with `pass 3` and `fail 0`",
                "`observedFacts(record)` holds exactly 2 entries: `plugin-loaded` and `result-event`",
                "the record graded with both required facts satisfied still reads `fail` with reason `denied_tool_call`"
              ]
            },
            "start_ref": "seed/denied-write-capture"
          }
        ],
        "evidence": {
          "forms": [
            "observedFacts(record) keys from the persisted record",
            "the graded cell's verdict and reason",
            "the node --test summary line counts"
          ]
        },
        "id": "SC-T14-TC3",
        "negative_control": {
          "would_fail_if": [
            "the preserved `false` is treated as a required fact, so a denied optional read inflates observedFacts and a cell passes on a fact nobody required",
            "the fix stops counting the declared-required Write denial, so a cell whose required write was denied loses the `fail` and the optional denial is all that is left",
            "the owned file adds tests without assertions, so `pass 3` is reported by an empty suite"
          ]
        },
        "test_tier": "integration",
        "tier": "e2e-automated",
        "tier_note": "integration: real capture module, real mapper, real grade writer, archived bytes; no child process",
        "topology_note": "the owned file's third case runs the same real replay and reads two derived views of one record - the fact map and the grade - so a change in either direction (false counted as a fact, or the required denial dropped) fails it"
      },
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "test_file": "tests/sprint-01/t14-capture-requiredness.test.mjs",
      "test_function": "optional-denial-is-not-a-fact",
      "test_tier": "integration",
      "type": "test_criterion",
      "verify": "node --test tests/sprint-01/t14-capture-requiredness.test.mjs"
    }
  ],
  "integration_obligations": [],
  "verification_gates": []
}
-->
