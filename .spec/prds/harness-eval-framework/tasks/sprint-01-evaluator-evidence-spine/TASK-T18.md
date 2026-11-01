# TASK-T18 — Invite the question the must-ask probe grades, and record the shape a headless invocation can actually produce

> Task ID: T18
> Sprint: [SPRINT.md](./SPRINT.md)
> Status: Backlog
> Assignee: ai-tooling-implementer
> Priority: P0
> Points: 3
> Type: BUG
> Planner: evals-planner
> Reviewer: evals-reviewer
> Wave: 5
> Depends On: T5, T6, T16
> TDD_MODE: red_first · RED_GREEN_REQUIRED: true

AGENT: planner=evals-planner | implementer=ai-tooling-implementer | reviewer=evals-reviewer

**Depends on:** T5 (`gradeCheck`, `promptFor`, `mapCapturedLine`, `questionBoundary` and the five-entry `INVOCATIONS` table this task extends), T6 (the stream layer: `table.mjs`'s `ruleMatches` with its `text_match` predicate, `normalise.mjs`, `question-boundary.mjs`'s `questions()`, and the `claude-code@2.1.291` table this task gains one rule in), T16 (`promptFor`'s surface-composition idiom, the must-ask prompt it left byte-identical, and the recorded pre-fix artifact of run 41249460968 this task measures itself against).
**Blocks:** human-testing-gate step 6 (both claude-code cells carry four graded checks), step 10 (four `files-and-event-stream` checks on the pinned cell), T11's four integration obligations, T12's review of the graded output.

## Background

- **Source:** the owner's recorded authorization for this amendment, `.kb-run-sprint/sprint-01-evaluator-evidence-spine/decisions/amendment-T18.decision.json` (questions 1, 3 and 5 answered `true`), and its authorizing answer file `.kb-run-sprint/sprint-01-evaluator-evidence-spine/owner-answers/d4c2407be63c6631c06f7573e58e6d999e6cfcbb0a2dea8bfe391f221fda3bdf.json`.
- **What the hosted run proves:** run **41249460968** (head `36e864a`, attempt 1) published a 12-cell artifact in which **both** claude-code cells read `question_before_expensive_work` → `could-not-run` / `required-fact-unobserved` with `missing: ["question-start"]`, and the same cell record carries a check block reading `fail` / `no-question-asked`. Those two blocks are the whole reading: the invocation produced a reply, and the stream carried no question the reader accepted.
- **Why "it produced a reply" is not an inference.** `gradeCheck` (`test/harness/adapters/claude-code.mjs:1170-1173`) adds a `could-not-run` block with `modelAnswer`'s own reason — `no-result-event`, `model-never-answered`, `empty-model-reply` — whenever the model did not answer. Neither artifact carries any of those, so `modelAnswer` returned `answered: true` and the invocation completed with text.
- **Which invocation owns the must-ask case.** The `first-question-init` entry of `INVOCATIONS` (`test/harness/adapters/claude-code.mjs:124-134`): `check_id: "question_before_expensive_work"`, `ask_policy: "must-ask"`, `command_name: "init"`, `required_facts: ["plugin-loaded", "question-start"]`. Its prompt is rendered by `promptFor` (`:262-267`), which joins the slash command, the case's arguments and whichever surfaces apply. `statusSurfacePrompt` (`:178-198`) and `verifyReportPrompt` (`:231-247`) both return `""` for `kind: "first-question"`, so the invocation is sent exactly **`/pixel-perfect:init`** and nothing else. This is the "the prompt never invites a question" half.
- **What the boundary reader keys on.** `questionBoundary(record)` (`test/harness/adapters/claude-code.mjs:952-964`) counts the captured lines that `isQuestionEvent` (`:933-940`) accepts, and it accepts exactly three shapes: a `tool_use` content block whose name is in `QUESTION_TOOL_NAMES` = `["AskUserQuestion"]` (`:53`); a line with `type: "user_choice"`; a line with `subtype: "ask_user_question"`. The stream layer expresses the same three shapes as data: rules `question-tool-call` (`test/harness/stream/tables/claude-code@2.1.291.json:76`), `question-user-choice-event` (`:86`) and `question-assistant-subtype` (`:94`), with `questions()` accepting only a canonical `tool_call` whose `classification` is `"question"` (`test/harness/stream/question-boundary.mjs:24`). The required fact that `required-fact-unobserved` names is minted only by `mapCapturedLine` (`claude-code.mjs:1013-1015`), which calls the same predicate; `grade-writer.mjs:90-92` then refuses the cell because `entry.required_facts` (`:1145`) declared `question-start`. This is the "the capture/mapping never records the event" half.
- **Why the shape the reader accepts cannot be produced here — measured, not assumed.** `AskUserQuestion` is not in the headless toolset, and the repo's own real captures say so: `test/harness/stream/captures/claude-code-stream-probe.stdout.bin` (CLI 2.1.312, a `system/init` listing 23 tools) and `test/harness/smoke/fixtures/denied-write/claude-code-denied-write.stdout.bin` (CLI 2.1.314, 130 tools including MCP servers) both omit it. The product's own contract supplies the fallback for precisely this harness: `plugins/pixel-perfect/workflows/RUNTIME-CONTRACT.md:125` — "If unavailable, a numbered plain-text batch as the last thing in the turn" — while `plugins/pixel-perfect/commands/init.md:15` routes every decision through `AskUserQuestion`, and `RUNTIME-CONTRACT.md:37` forbids printing a decision as prose. So the best a headless `init` can do is ask in text, and no reader counts text.
- **The defect, stated as one sentence, with the half that makes it `could-not-run`.** The must-ask invocation's prompt never tells it that this turn is graded on asking or in what shape a headless question is recorded (`claude-code.mjs:262-267`), and the two readers accept only markers this harness cannot emit (`:933-940`; `tables/claude-code@2.1.291.json:76-99`) — so a question that the product does ask in its sanctioned text fallback lands as `harness_specific`/agent text, `question-start` is never observed, and the record-level `could-not-run` outranks the check's own honest `fail no-question-asked`.
- **Gate steps:** 6 and 10. **Capability:** CAP-EVAL-01. **PRD:** `09-technical-requirements/02-system-components.md` § claude-code-adapter and § grade recorder; `03-data-schema.md:80-89` (FirstQuestionCase: "expected question: a goal/platform/initialization decision using the current USER_CHOICE shape"); `10-e2e-testing.md`; flow `FLOW-GRD-02-MUST-ASK` (`.spec/scenarios/UC-GRD-02/flow-grd-02-must-ask.scenario.md`).
- **Current (consumed):** T5's `promptFor`, `invocationTable`, `mapCapturedLine`, `questionBoundary`, `gradeCheck` and the `INVOCATIONS` entries; T6's `ruleMatches` (`text_match`, `table.mjs:201-205`), `normalise`, `questions()`, and the `claude-code@2.1.291` table's three question rules; T16's prompt-composition shape and its promise that the must-ask prompt stays exactly what the boundary was measured on.
- **Desired (provided):** the must-ask prompt names the one surface it is graded on — ask exactly one decision batch, before any non-read tool call, and state it under the marker the record keeps — and both readers then record that marker as **one** question event at its own measured offset, while a real capture with no marker still reads zero.

## Critical Constraints

- MUST declare the question surface **from the case manifest** — `kind: "first-question"`, `ask_policy: "must-ask"` and `expected_question` — never from a case id, a command name or a literal batch id typed into the adapter. A case that declares no `expected_question` renders `""`, and the check then fails on its own evidence rather than on an invented instruction.
- MUST render the surface as **one instruction about asking**, naming the marker, the exactly-one rule and the ask-before-work rule — and nothing that could be the answer. The rendered text MUST NOT contain `web-desktop`, any platform id, any goal sentence, or any option label.
- MUST keep the marker **one literal shape**: `USER_CHOICE(<batch-id>)` — the product's own notation (`RUNTIME-CONTRACT.md:15`) — with a batch id of `[A-Za-z0-9][A-Za-z0-9_-]*`. The adapter exports one constant for it and BOTH readers use that one shape.
- MUST recognise the marker **only in assistant text**, never in a `user` line, never in a raw-byte scan of the whole capture. The declaration lives in the prompt, so a reader that scanned `user` lines or raw bytes could count the harness's own instruction as the model's question and pass without the model asking anything.
- MUST NOT widen the question predicate beyond "the three structured markers it already accepts **plus** this one text marker". No `?` heuristic, no "any text longer than N", no "any numbered list", no "any assistant text at all". A real assistant text block that discusses asking must still count zero — and `test/harness/smoke/fixtures/denied-write/claude-code-denied-write.stdout.bin` is the real bytes that prove it.
- MUST keep the ask-nothing legs' teeth. The four `ask_policy: "ask-nothing"` entries (`command_list`, `status-a`, `verify-button-drift`, `verify-clean`) keep `gradeAskNothing`'s rule unchanged: their prompts MUST be byte-identical to base, they receive no declaration, and a capture carrying one marker graded ask-nothing MUST still read `fail question-in-ask-nothing` at that marker's offset.
- MUST NOT touch `test/harness/stream/*.mjs`. `ruleMatches` already supports `match.text_match` (`table.mjs:201-205`), so the stream-layer half is **one rule in the table's data**, not code. An implementer who believes a module change is needed **stops and escalates**.
- MUST NOT touch `test/harness/smoke/cell.mjs`. The replay path already grades from records (`cell.mjs:186-198` calls `claudeCode.gradeCheck`), and `runCell` already runs the must-ask entry through the same table, so no leg change is needed for either the lane or a dispatch. If the implementer believes it must change, the task is mis-scoped and escalates.
- MUST NOT change `gradeAskNothing`, `gradeMustAsk`, `boundaryStopCheck`, `gradeFromEvidence`'s required-fact rule, the `required_facts` lists, `CHECKS`, the five `INVOCATIONS` entries, or `cellFor`.
- MUST NOT add a fallback for a missing question (no synthetic event, no "assume one question", no `could-not-run` swapped for `pass`). The only allowed change is that a real question marker is now recorded.
- MUST NOT edit `plugins/pixel-perfect/**` (the product is graded, not edited here; T17 owns the only product change in this round) or `.github/workflows/**`. Dispatching the workflow is allowed and required; editing it is not.
- MUST keep the marker's match independent of model wording: the marker line is the model's own text, so the test asserts the marker's **offset** and the **count**, never the sentence around it.

## Specification

### Seam 1 — the must-ask prompt declares the one question it is graded on (prompt half)

`test/harness/adapters/claude-code.mjs` gains one declaration and one renderer, beside `STATUS_SURFACE`/`statusSurfacePrompt`'s idiom (T16's shape):

- `QUESTION_SURFACE` — a frozen declaration: `{ applies_to: "first-question", ask_policy: "must-ask", marker: "USER_CHOICE(<batch-id>)", marker_pattern: "USER_CHOICE\\([A-Za-z0-9][A-Za-z0-9_-]*\\)", batch_rule: "exactly one", order_rule: "before any tool call other than reading the local fixture and the installed plugin instructions", answer_rule: "send no answer and do not answer your own question", where: "the last thing in the turn, on its own line" }`.
- `QUESTION_MARKER_PATTERN` — the one `RegExp` both readers use, exported so the lane can assert that the table's `text_match` and the adapter's predicate are the same shape.
- `questionSurfacePrompt({ caseManifest })` — returns `""` unless `caseManifest.kind === "first-question"` and `caseManifest.ask_policy === "must-ask"` and `expected_question` is a non-empty string. Otherwise it renders one instruction: this turn is graded on exactly one question asked before any non-read tool call; the question must be the decision this case declares (`caseManifest.expected_question`, quoted as the product's own sentence); state it as the last thing in the turn under a line beginning `USER_CHOICE(<batch-id>)`, followed by the question and its numbered options; ask exactly one batch and stop; send no answer.
- `promptFor({ command_name, caseManifest, invocationId })` composes it into the same surface list `statusSurfacePrompt` and `verifyReportPrompt` already feed (`:263-266`), so an invocation whose case declares no question renders exactly what it renders today.

### Seam 2 — both readers record that marker as one question at its own offset (capture/mapping half)

- **Adapter (the live path — what a dispatched cell grades).** `isQuestionEvent` (`:933-940`) gains one clause: an `assistant` line whose `message.content` holds a `text` block matching `QUESTION_MARKER_PATTERN`. Everything else about the predicate is unchanged, so `questionBoundary(record)` and `mapCapturedLine` (`:1013-1015`) both pick it up with no further edit — the existing span/digest machinery in `capture.observe` (`runtime/capture.mjs:182-211`) binds the observation to that line's measured offset, and `required-fact-unobserved` can no longer fire for `question-start`.
- **Stream layer (the reader the graders use).** One rule appended to `test/harness/stream/tables/claude-code@2.1.291.json`, data only:

```json
{
  "rule_id": "question-text-marker",
  "canonical_type": "tool_call",
  "fact_id": "question-tool-start",
  "also_fact_id": "question-start",
  "classification": "question",
  "match": { "type": "assistant", "text_match": "USER_CHOICE\\([A-Za-z0-9][A-Za-z0-9_-]*\\)" },
  "extract": null,
  "source_event_path": "assistant.message.content[].type=text"
}
```

`fact_id`/`also_fact_id` mirror `question-tool-call` (`:76-84`) so the table's `required_facts` vocabulary is unchanged and `tableCoverage`/`validateTable` see the same six facts.

### What does not change

| Surface | Change |
|---|---|
| `CHECKS`, the five `INVOCATIONS` entries, `invocationTable`'s entry shape, `cellFor` | none |
| `statusSurfacePrompt`, `verifyReportPrompt`, and every ask-nothing prompt | none — byte-identical |
| `questionBoundary`, `gradeAskNothing`, `gradeMustAsk`, `boundaryStopCheck`, `mustAskFacts` | none |
| `gradeFromEvidence`'s required-fact rule, `required_facts` lists, `grade-writer.mjs` | none |
| `test/harness/stream/*.mjs`, `test/harness/graders/**`, `test/harness/smoke/cell.mjs`, `test/harness/cases/**` | none |
| `plugins/pixel-perfect/**`, `.github/workflows/harness-eval.yml` | none |

## Acceptance Criteria (GIVEN-WHEN-THEN)

### AC-1: The must-ask invocation is told to ask exactly one question, and told nothing that is an answer (PRIMARY)

- **GIVEN:** `seed/kit-cases` — the five case manifests read through `loadCase`, and the product's own B1 batch wording read out of `plugins/pixel-perfect/workflows/init.md:124`
- **WHEN:** `invocationTable({ track: "pinned" })` renders every entry's prompt, and the `first-question-init` prompt is read against its case manifest
- **THEN:** the must-ask prompt starts with `/pixel-perfect:init` and carries exactly one declared question surface naming `USER_CHOICE(<batch-id>)`, the exactly-one rule and the ask-before-work rule; the surface is derived from the case's `expected_question` and `ask_policy`; it carries no platform id and no option label; and the four ask-nothing prompts are byte-identical to base

```text
TEST_TIER:             integration
VERIFICATION_SERVICE:  local: the real adapter module's invocationTable/promptFor against the real case manifests and the product's own workflow text, node --test (no dispatch)
SURFACE_POLICY:        .spec/e2e-policy/sprint-01/artifact-only-read.json
TDD_STATE:             red_first
VERIFY:                node --test tests/sprint-01/t18-question-boundary.test.mjs --test-name-pattern t18-must-ask-prompt-declares-one-question
EXPECT:                exit 0 · TAP `ok` for t18-must-ask-prompt-declares-one-question · fail 0
```

- **RED input (fails on base):** `promptFor` renders `/pixel-perfect:init` and nothing else, so the rendered prompt is `22` characters, names no marker, and states no rule — the exact prompt run 41249460968 sent before its cell read `required-fact-unobserved`.
- **RED proof:** `.tmp/sprint-01-verification/t18-question-boundary.red.log`
- **positive_example (passes after landing):** the prompt reads `/pixel-perfect:init Graded question surface: this turn is graded on exactly one question ... state it as the last thing in the turn under a line beginning USER_CHOICE(<batch-id>) ...`, and `questionSurfacePrompt({ caseManifest: loadCase("status-a") })` is `""`.
- **Hosted receipt (the sprint gate, not this test's proof):** AC-3.

SCENARIO_SUMMARY: complete SCENARIO lives once, in this AC's row of the REQUIREMENT-CONTRACT block below.

### AC-2: The question is captured and mapped to `question-start`, so the check grades `pass` — and the ask-nothing legs still record zero

- **GIVEN:** `seed/first-question-capture` (the product's own B1 batch in the CLI's stream-json envelope), `seed/no-question-capture` (the committed real 2.1.314 capture, whose single assistant text block discusses asking and carries no marker), and `seed/two-batch-capture`
- **WHEN:** each is replayed through the real capture reader, the real `mapCapturedLine`, the real stream normaliser and the real `gradeCheck` on the `first-question-init` and `status-a` entries
- **THEN:** the documented capture grades `question_before_expensive_work` `pass` with boundary `count` `1` at the marker's measured offset and `answers_delivered` `0`, and `question-start` appears among the record's observed facts; the real capture reads `count` `0` with no `question-start`; the documented capture graded ask-nothing reads a `question-in-ask-nothing` block citing that offset; and the two-batch capture read must-ask carries `more-than-one-question` with `count` `2`

```text
TEST_TIER:             integration
VERIFICATION_SERVICE:  local: the real capture reader, mapCapturedLine, normalise/questions and gradeCheck over one documented-output fixture, one committed real capture and one two-batch variant, node --test (no dispatch)
SURFACE_POLICY:        .spec/e2e-policy/sprint-01/artifact-only-read.json
TDD_STATE:             red_first
VERIFY:                node --test tests/sprint-01/t18-question-boundary.test.mjs --test-name-pattern t18-question-boundary-recorded
EXPECT:                exit 0 · TAP `ok` for t18-question-boundary-recorded · fail 0
```

- **RED input (fails on base):** the documented capture's marker line is agent text, and neither reader classifies agent text, so the graded cell reads `could-not-run required-fact-unobserved` with `missing: ["question-start"]` and a `no-question-asked` block — byte for byte the reading of both claude-code cells in run 41249460968.
- **RED proof:** `.tmp/sprint-01-verification/t18-question-boundary.red.log`
- **positive_example (passes after landing):** `{ check_id: "question_before_expensive_work", verdict: "pass", reason: null }` with `boundary: { count: 1, offsets: [<marker offset>], answers_delivered: 0 }`, `observedFacts(record).has("question-start")` true, and the two-batch read carrying `{ verdict: "fail", reason: "more-than-one-question", count: 2 }`.
- **Hosted receipt (the sprint gate, not this test's proof):** AC-3.

SCENARIO_SUMMARY: complete SCENARIO lives once, in this AC's row of the REQUIREMENT-CONTRACT block below.

### AC-3: A dispatched run grades the question `pass` on the pinned cell while both ask-nothing legs keep zero questions

- **GIVEN:** `seed/dispatched-run-t18` — the downloaded result artifact of `harness-eval` on the commit that lands this task, and `seed/dispatched-run-41249460968`, the recorded pre-fix artifact
- **WHEN:** `.cells[]` is read for both claude-code cells and every check row is compared with the pre-fix reading
- **THEN:** the pinned cell's `question_before_expensive_work` reads `pass` with no `required-fact-unobserved` block, its `command_list`, `status` and `verify` rows and the ten other cells keep their own verdicts and named reasons, and no claude-code row records a question on an ask-nothing leg

```text
TEST_TIER:             e2e
VERIFICATION_SERVICE:  real harness-eval dispatch on a hosted runner (real claude-code CLI, the harness-smoke binding), artifact downloaded by run id and read by the lane
SURFACE_POLICY:        .spec/e2e-policy/sprint-01/artifact-only-read.json
TDD_STATE:             red_first
VERIFY:                node --test tests/sprint-01/t18-question-boundary.test.mjs --test-name-pattern t18-dispatched-question-pass
EXPECT:                exit 0 · TAP `ok` for t18-dispatched-question-pass · fail 0
```

- **RED input (fails on base):** no dispatch exists for this commit and the pre-fix artifact reads `could-not-run required-fact-unobserved` on both claude-code cells; the lane fails with the named reason `dispatched-artifact-absent` until the artifact is downloaded to the declared path.
- **RED proof:** `.tmp/sprint-01-verification/t18-question-boundary.red.log`
- **positive_example (passes after landing):** `jq -r '.cells[] | select(.harness=="claude-code") | .track + " " + ([.checks[] | .check_id + " " + .verdict] | join(", "))'` prints two lines whose `question_before_expensive_work pass` appears on `pinned`, and no line contains `required-fact-unobserved`.
- **Gate (not a substitute for the dispatch):** human-testing-gate steps 6 and 10 read this same artifact.

SCENARIO_SUMMARY: complete SCENARIO lives once, in this AC's row of the REQUIREMENT-CONTRACT block below.

## Test Criteria

### TC-1: The declaration reaches the must-ask entry and no other

- **Verify:** `node --test tests/sprint-01/t18-question-boundary.test.mjs --test-name-pattern t18-other-prompts-unchanged`
- **Expected:** exit 0, `pass 1`, `fail 0`; the `first-question-init` prompt contains one occurrence of `USER_CHOICE(`; the `command_list`, `status-a`, `verify-button-drift` and `verify-clean` prompts equal their base strings byte for byte (sha256 equal to the strings `promptFor` renders with no surface); and the declared batch id is `B1`, taken from the product's own "How this workflow asks" table, not from a literal in the adapter.
- **Locked scenarios:** `SC-T18-TC1`.

### TC-2: The marker is the only text signal, and it is read from assistant text only

- **Verify:** `node --test tests/sprint-01/t18-question-boundary.test.mjs --test-name-pattern t18-marker-is-the-only-signal`
- **Expected:** exit 0, `pass 1`, `fail 0`; bytes carrying `USER_CHOICE(B1)` in an assistant text block read `count` `1`; the same marker in a `user`-role line reads `count` `0`; the committed real capture's assistant text — which contains the words `ask` and a `don't ask mode` clause — reads `count` `0`; a reply ending in `?` with no marker reads `count` `0`; a numbered list with no marker reads `count` `0`; and a marker with no batch id, `USER_CHOICE()`, reads `count` `0`.
- **Locked scenarios:** `SC-T18-TC2`.

### TC-3: The two readers agree on the same bytes, and the fact is bound to a real span

- **Verify:** `node --test tests/sprint-01/t18-question-boundary.test.mjs --test-name-pattern t18-two-readers-agree`
- **Expected:** exit 0, `pass 1`, `fail 0`; the adapter's `questionBoundary(record)` and `questions(normalise(...).events)` return the same `count` (`1`) at the same `offset` on the documented capture and the same `count` (`0`) on the real capture; `QUESTION_MARKER_PATTERN.source` appears in the table rule's `text_match`; the `question-start` observation carries a `stream_offset`, a `stream_end_offset` and a `raw_sha256` that re-hashes to the captured span; and `observedFacts(record)` contains `question-start` with `required_read: true`.
- **Locked scenarios:** `SC-T18-TC3`.

### TC-4: The ask-nothing rule keeps its teeth on the same bytes

- **Verify:** `node --test tests/sprint-01/t18-question-boundary.test.mjs --test-name-pattern t18-ask-nothing-keeps-teeth`
- **Expected:** exit 0, `pass 1`, `fail 0`; the documented capture graded ask-nothing carries a `question-in-ask-nothing` block whose `offsets` equal the marker's own offset; the two-batch capture read must-ask carries `more-than-one-question` with `count` `2`; the real capture read must-ask carries `no-question-asked` and not `could-not-run`; and the status entry's prompt still carries no declaration.
- **Locked scenarios:** `SC-T18-TC4`.

## Locked scenarios

The scenarios are carried once, as JSON, in the REQUIREMENT-CONTRACT block at the end of this file (T13/T15/T16's shape). This table is the index; it is not a second copy.

| Scenario | Requirement | What it locks |
|---|---|---|
| `SC-T18-AC1` | AC-1 | one declared question surface, derived from the case, on the must-ask prompt only |
| `SC-T18-AC2` | AC-2 | the marker becomes one captured question at its offset, and the cell grades `pass` |
| `SC-T18-AC3` | AC-3 | a dispatched run grades `pass` on the pinned cell with the other cells unchanged |
| `SC-T18-TC1` | TC-1 | the four ask-nothing prompts are byte-identical to base |
| `SC-T18-TC2` | TC-2 | assistant text only, marker only — a real reply that discusses asking still counts zero |
| `SC-T18-TC3` | TC-3 | both readers count the same offset and the fact is bound to a re-hashable span |
| `SC-T18-TC4` | TC-4 | ask-nothing still fails at the marker's offset, and two batches still fail |

## Guardrails

WRITE-ALLOWED:

- test/harness/adapters/claude-code.mjs
- test/harness/smoke/fixtures/question-boundary/** (new fixture dir and its provenance file only)
- test/harness/stream/tables/claude-code@2.1.291.json (one rule, data only)
- tests/sprint-01/t18-question-boundary.test.mjs

`test/harness/smoke/cell.mjs` is **not** opened, and the reason is in the record: the replay path it owns already calls `gradeCheck` per record (`cell.mjs:186-198`) and `runCell` already walks the same `invocationTable`, so the must-ask entry is graded by the same code in a dispatch as in the lane. `test/harness/stream/*.mjs` is **not** opened either: `ruleMatches` already supports `match.text_match` (`table.mjs:201-205`), so the stream-layer half is data. An implementer who believes either must change stops and escalates rather than widening scope to make a cell green.

WRITE-PROHIBITED:

- plugins/pixel-perfect/**
- test/harness/graders/**
- test/harness/smoke/cell.mjs
- test/harness/smoke/model-step.mjs
- test/harness/smoke/observations.mjs
- test/harness/smoke/image-scan.mjs
- test/harness/stream/normalise.mjs
- test/harness/stream/table.mjs
- test/harness/stream/question-boundary.mjs
- test/harness/stream/grade-stream.mjs
- test/harness/stream/validate-mapping.mjs
- test/harness/stream/archive-capture.mjs
- test/harness/stream/index.mjs
- test/harness/runtime/**
- test/harness/recorder/**
- test/harness/cases/**
- .github/workflows/harness-eval.yml
- tests/sprint-01/grd-01-twelve-cells.test.mjs
- tests/sprint-01/grd-02-four-grades.test.mjs
- tests/sprint-01/grd-03-evidence.test.mjs
- tests/sprint-01/grd-04-named-path.test.mjs
- tests/sprint-01/grd-05-clean-twin.test.mjs
- tests/sprint-01/grd-06-missing-key.test.mjs
- tests/sprint-01/run-02-hand.test.mjs
- tests/sprint-01/jrn-planted-and-twin.test.mjs
- tests/sprint-01/t11-controls-wiring.test.mjs
- tests/sprint-01/t13-smoke-observations.test.mjs
- tests/sprint-01/t14-capture-requiredness.test.mjs
- tests/sprint-01/t15-hosted-controls.test.mjs
- tests/sprint-01/t16-claude-code-grades.test.mjs
- Any file not listed in WRITE-ALLOWED

## Evidence Gates

- **AC-1:** `node --test tests/sprint-01/t18-question-boundary.test.mjs --test-name-pattern t18-must-ask-prompt-declares-one-question`. Expected: exit 0, TAP `ok`, `fail 0`.
- **AC-2:** `node --test tests/sprint-01/t18-question-boundary.test.mjs --test-name-pattern t18-question-boundary-recorded`. Expected: exit 0, TAP `ok`, `fail 0`.
- **AC-3:** `node --test tests/sprint-01/t18-question-boundary.test.mjs --test-name-pattern t18-dispatched-question-pass`. Expected: exit 0, TAP `ok`, `fail 0`, with `.tmp/sprint-01-verification/t18/harness-eval-result.json` downloaded from a run whose `head_sha` is this task's landed commit.
- **TC-1:** `node --test tests/sprint-01/t18-question-boundary.test.mjs --test-name-pattern t18-other-prompts-unchanged`. Expected: exit 0, `pass 1`.
- **TC-2:** `node --test tests/sprint-01/t18-question-boundary.test.mjs --test-name-pattern t18-marker-is-the-only-signal`. Expected: exit 0, `pass 1`.
- **TC-3:** `node --test tests/sprint-01/t18-question-boundary.test.mjs --test-name-pattern t18-two-readers-agree`. Expected: exit 0, `pass 1`.
- **TC-4:** `node --test tests/sprint-01/t18-question-boundary.test.mjs --test-name-pattern t18-ask-nothing-keeps-teeth`. Expected: exit 0, `pass 1`.
- **Owned test file:** `node --test tests/sprint-01/t18-question-boundary.test.mjs`. Expected: `pass 7`, `fail 0`.
- **regression (twelve files):** `node --test tests/sprint-01/grd-01-twelve-cells.test.mjs tests/sprint-01/grd-02-four-grades.test.mjs tests/sprint-01/grd-03-evidence.test.mjs tests/sprint-01/grd-04-named-path.test.mjs tests/sprint-01/grd-05-clean-twin.test.mjs tests/sprint-01/grd-06-missing-key.test.mjs tests/sprint-01/run-02-hand.test.mjs tests/sprint-01/t11-controls-wiring.test.mjs tests/sprint-01/t13-smoke-observations.test.mjs tests/sprint-01/t14-capture-requiredness.test.mjs tests/sprint-01/t15-hosted-controls.test.mjs tests/sprint-01/t16-claude-code-grades.test.mjs`. Expected: `pass 103`, `fail 0` (measured on base main at authoring time; a differing count must be recorded as a baseline, never explained away).
- **table (data-only change):** `node -e "const t=require('./test/harness/stream/tables/claude-code@2.1.291.json');console.log(t.rules.length, t.required_facts.length)"`. Expected: `15` rules (was 14) and `6` required facts — one rule added, the fact vocabulary unchanged.
- **write-scope:** `git diff --name-only`. Expected: only WRITE-ALLOWED paths.
- **dispatch (the sprint gate):** `gh workflow run harness-eval --repo hackerpug-ai/pixel-perfect --ref <landed sha>` then `gh run download <run-id> -n harness-eval-result-<run-id>-1 -D .tmp/sprint-01-verification/t18`. Expected: the artifact lands at the declared path and AC-3's `jq` reading shows `question_before_expensive_work pass` on the `pinned` cell.

## Review Criteria

Must pass:

- The owned test reports `pass 7`, `fail 0`, and each test asserts its row's THEN rather than restating the implementation.
- The marker is one literal shape used by both readers, and the lane asserts the table's `text_match` and the adapter's `QUESTION_MARKER_PATTERN` are that same shape — two readers that could disagree on what a question is fail review.
- The predicate reads assistant text only: TC-2's real-capture and `user`-role cases are the evidence, and a `?`-or-numbered-list heuristic anywhere in the diff is a NEEDS_FIXES.
- The declaration is derived from `caseManifest.expected_question`/`ask_policy` and carries no value the check measures (no platform id, no option label, no goal sentence).
- The four ask-nothing prompts are byte-identical to base and the ask-nothing rule is untouched; the twelve-file regression is green at `pass 103`.
- `git diff --name-only` lists only WRITE-ALLOWED paths; the table diff adds exactly one rule and no `required_facts` entry.
- Assert (judgement, not grep): the fix makes the **product** ask and the reader **record** it, rather than making the grader accept less. A diff that widens the reason vocabulary, drops `question-start` from `required_facts`, swaps `could-not-run` for `pass`, or counts questions on `user` lines or raw bytes is a NEEDS_FIXES regardless of colour.

Should verify: `statusFacts`, `readVerifyReport`, `bindReport`, `CHECKS`, `INVOCATIONS`, `gradeAskNothing`, `gradeMustAsk` and `grade-writer.mjs` are untouched; the fixture's provenance file states `recorded: false` and names the product file and line its batch text derives from; the lane re-derives that text from `init.md` so the fixture cannot drift from the product.

Verdict: APPROVED or NEEDS_FIXES, with file and line for each finding.

## Dependencies

- **Depends on:** T5, T6, T16.

Why T5: it owns `gradeCheck`, `promptFor`, `mapCapturedLine`, `questionBoundary` and the `INVOCATIONS` entry this task extends — the defect lives in that module and nothing can be graded before it exists. Why T6: its `ruleMatches` already carries `match.text_match`, which is the only reason the stream-layer half is one table rule instead of a normaliser change, and its `questions()` is the reader the graders use. Why T16: it established `promptFor`'s surface-composition shape this task copies, it promised the must-ask prompt stayed byte-identical (so this task is the one that opens it, deliberately, once), and its recorded artifact of run 41249460968 is this task's RED reading.

A shared file is not a dependency: T18 appends one clause to a predicate and one rule to a table, and the lane test is what proves it, not an edge.

## Out of Scope

- Any change to `plugins/pixel-perfect/**`. The product's text fallback (`RUNTIME-CONTRACT.md:125`) and its `AskUserQuestion` route (`commands/init.md:15`) stay exactly as they are; the harness declares the surface, the product keeps its contract. T17 owns the only product change in this round.
- `.github/workflows/harness-eval.yml`. Dispatching is required; editing is not.
- `expensive-before-question` grading. The case declares `forbidden_prefix`, and neither `gradeCheck` nor the stream layer fails a must-ask probe for work before the question today; that rule is a separate mechanism (sprint 02's `grade-invocation`) and is not claimed here.
- The `boundary-stop` termination kind. `spawnCaptured` has no per-chunk hook, so a must-ask probe still terminates `native` with a closed stdin, and `boundaryStopCheck`'s exception stays unclaimed.
- Any other harness's question shape. Codex, Grok, OpenCode, Pi and Cursor stay `*-adapter-not-implemented`; their tables are sprint 02's.
- Re-recording the real 2.1.314 capture. It is committed, its bytes are the negative control, and a re-record would change the baseline for no gain.

## Notes

- **One defect, two halves, and which half makes it `could-not-run`.** The prompt half leaves the invocation uninformed (`claude-code.mjs:262-267`); the capture half makes the reading worse than the behaviour (`:933-940` + `grade-writer.mjs:90-92`). Fixing only the prompt would still read `could-not-run` if the model asked in text, and fixing only the reader would count a marker nobody asked the model to write. Both are in scope because they are the same sentence: *nothing declares the surface, and nothing records it.*
- **Why the marker is `USER_CHOICE(<batch-id>)` and not a grader invention.** The product already calls its decision notation `USER_CHOICE(batch)` (`RUNTIME-CONTRACT.md:15`), the case manifest already says the expected question uses "the current USER_CHOICE shape" (`03-data-schema.md:84`), and sprint 02's plan already speaks of "a planted USER_CHOICE-shaped agent text". The harness is not inventing a vocabulary; it is declaring the product's own, in the shape a headless turn can carry.
- **Why `AskUserQuestion` cannot be the answer.** Measured from the repo's own real captures, not from documentation: 23 tools at 2.1.312 and 130 at 2.1.314, and `AskUserQuestion` is in neither list. A fix that keeps waiting for a tool the CLI does not offer would leave this check red forever, and adding it to `QUESTION_TOOL_NAMES` a second time changes nothing.
- **Why the negative control is real bytes.** `test/harness/smoke/fixtures/denied-write/claude-code-denied-write.stdout.bin` is a real guarded run whose assistant text says "I couldn't write to the file" and "Claude Code is in `don't ask` mode". If a widened predicate counted that as a question, the ask-nothing legs would fail on their own real traffic and the suite would be revealed as a detector rather than a grader. The same bytes keep `question-start` absent, which is what `required-fact-unobserved` must still be able to say.
- **Why this is not a stubbed test.** No verdict is typed anywhere. AC-1 reads the real `promptFor` output through the real case loader and the product's own workflow text, and fails on base at `22` characters. AC-2 replays one capture through the real `createCapture`/`mapCapturedLine`/`gradeCheck` and the real `normalise`/`questions`, and its two negative cases are the committed **real** 2.1.314 capture and a two-batch variant of the same bytes, so a reader that counts everything and a reader that stops at the first marker are both caught. AC-3 is not simulated at all: it reads a dispatched run's artifact, and fails with `dispatched-artifact-absent` until one exists. The one constructed artifact is the positive capture's envelope, and it is labelled `recorded: false`, derives its batch text from `plugins/pixel-perfect/workflows/init.md:124` at test time, and fails if the product's wording changes.
- **The recording dependency, stated up front.** No harness-smoke binding exists on the host that produced this task's evidence (T16 recorded the same), so a guarded `claude -p /pixel-perfect:init` cannot be recorded here. The positive fixture is therefore a documented-output fixture in the CLI's stream-json envelope, and the model's own behaviour is proven only by AC-3's dispatch. If the host that lands this task **does** hold the binding, record the real capture instead and replace the fixture — that is strictly better and needs no other change.
- **For the implementer: the marker line's offset is the assertion.** Do not assert the sentence around the marker. The model writes its own wording; the check is about where the batch starts and that nothing expensive started before it.
- **Finding (not fixed here) — the must-ask prompt still forbids nothing.** `first-question-init.json` declares `forbidden_prefix` and `allowed_prefix`, and no grader reads them (`gradeCheck:1155-1173`). After this task a cell can read `pass` while the invocation wrote a file first. That is a separate mechanism, is honest to leave named, and belongs to sprint 02's `expensive-before-question`.
- **Finding (observed, out of scope) — the `newest` cell.** Run 41249460968's newest cell reads `could-not-run installation-identity-mismatch` (requested `2.1.291`, observed `2.1.316`). The identity rule working as designed; the version resolver is another task's surface.
- **Split check:** not triggered — 3 points, one predicate clause, one prompt renderer, one table rule, one lane file.
- **Build order:** TC-1 `QUESTION_SURFACE` + `questionSurfacePrompt` + `promptFor` wiring; TC-2 the `isQuestionEvent` clause and its negative cases; TC-3 the table rule and reader agreement; AC-2 the graded `pass` and the two-batch teeth; TC-4 the ask-nothing reading; AC-3 dispatch, download, and the artifact reading. Do not edit the workflow to get there.
- **Owner:** `evals-planner`; sprint `sprint-01-evaluator-evidence-spine`.

<!-- REQUIREMENT-CONTRACT v1 -->
<!--
{
  "version": "1",
  "task_id": "T18",
  "task_type": "BUG",
  "tdd_mode": "red_first",
  "verification_policy": {
    "requires_tests": true,
    "requires_red_evidence": true,
    "requires_seeded_evidence": true
  },
  "guardrails": {
    "write_allowed": [
      "test/harness/adapters/claude-code.mjs",
      "test/harness/smoke/fixtures/question-boundary/**",
      "test/harness/stream/tables/claude-code@2.1.291.json",
      "tests/sprint-01/t18-question-boundary.test.mjs"
    ],
    "write_prohibited": [
      "plugins/pixel-perfect/**",
      "test/harness/graders/**",
      "test/harness/smoke/cell.mjs",
      "test/harness/smoke/model-step.mjs",
      "test/harness/smoke/observations.mjs",
      "test/harness/smoke/image-scan.mjs",
      "test/harness/stream/normalise.mjs",
      "test/harness/stream/table.mjs",
      "test/harness/stream/question-boundary.mjs",
      "test/harness/stream/grade-stream.mjs",
      "test/harness/stream/validate-mapping.mjs",
      "test/harness/stream/archive-capture.mjs",
      "test/harness/stream/index.mjs",
      "test/harness/runtime/**",
      "test/harness/recorder/**",
      "test/harness/cases/**",
      ".github/workflows/harness-eval.yml",
      "tests/sprint-01/grd-01-twelve-cells.test.mjs",
      "tests/sprint-01/grd-02-four-grades.test.mjs",
      "tests/sprint-01/grd-03-evidence.test.mjs",
      "tests/sprint-01/grd-04-named-path.test.mjs",
      "tests/sprint-01/grd-05-clean-twin.test.mjs",
      "tests/sprint-01/grd-06-missing-key.test.mjs",
      "tests/sprint-01/run-02-hand.test.mjs",
      "tests/sprint-01/jrn-planted-and-twin.test.mjs",
      "tests/sprint-01/t11-controls-wiring.test.mjs",
      "tests/sprint-01/t13-smoke-observations.test.mjs",
      "tests/sprint-01/t14-capture-requiredness.test.mjs",
      "tests/sprint-01/t15-hosted-controls.test.mjs",
      "tests/sprint-01/t16-claude-code-grades.test.mjs",
      "Any file not listed in write_allowed"
    ]
  },
  "fixtures": {
    "seed/kit-cases": {
      "entrypoint": "test/harness/cases/{first-question-init,status-a,status-b,verify-button-drift,verify-clean}.json read through loadCase, plus plugins/pixel-perfect/workflows/init.md's `How this workflow asks` table (line 48) and its B1 `user_choice` block (line 124)",
      "description": "the five case manifests the adapter renders prompts for and the product's own B1 batch wording, so a rendered question surface can be compared with the case that declares it, the batch id can be read from the product instead of invented, and every ask-nothing prompt can be compared with its base bytes",
      "seed_method": "migration_fixture"
    },
    "seed/first-question-capture": {
      "entrypoint": "test/harness/smoke/fixtures/question-boundary/claude-code-first-question.documented-output.stdout.bin plus its .provenance.json, read through createCapture + mapCapturedLine and replayed through gradeCheck on the first-question-init entry, and through normalise + questions for the stream layer",
      "description": "the CLI's stream-json envelope for one headless `/pixel-perfect:init` turn: a `system/init` line listing pixel-perfect, one `assistant` text line carrying the product's own B1 batch as `USER_CHOICE(B1)` followed by that block's question and its options, and one `result` line. The batch text is re-derived at test time from `plugins/pixel-perfect/workflows/init.md` and the fixture fails if the two differ; the provenance file states `recorded: false` and names the product file and line it derives from",
      "seed_method": "migration_fixture"
    },
    "seed/no-question-capture": {
      "entrypoint": "test/harness/smoke/fixtures/denied-write/claude-code-denied-write.stdout.bin and its .capture.json, the committed real 2.1.314 capture",
      "description": "one real guarded `claude -p` run at CLI 2.1.314 whose single assistant text block says the file was not written because Claude Code is in don't-ask mode, with no batch marker anywhere in its bytes \u2014 so the zero reading is measured on real model text rather than on an absence, and the marker is proven not to be `?` or `ask`",
      "seed_method": "recorded_external"
    },
    "seed/two-batch-capture": {
      "entrypoint": "the same documented-output bytes with a second `USER_CHOICE(B3)` batch line appended before the `result` line, at a measured offset, written by the lane into a scratch copy",
      "description": "one capture declaring two batches, so a model that asks twice is caught by `more-than-one-question` and a reader that stops at the first marker cannot pass",
      "seed_method": "migration_fixture"
    },
    "seed/dispatched-run-41249460968": {
      "entrypoint": ".kb-run-sprint/sprint-01-evaluator-evidence-spine/T16/hosted/run-41249460968/harness-eval-result-41249460968-1/grade/harness-eval-result.json",
      "description": "the recorded 12-cell artifact of the run this task repairs: both claude-code cells read `question_before_expensive_work` `could-not-run` `required-fact-unobserved` with `missing: [\"question-start\"]`, each carries a `no-question-asked` block in the same cell, the verify rows read `report-missing`, and the ten non-claude cells keep their named refusals",
      "seed_method": "recorded_external"
    },
    "seed/dispatched-run-t18": {
      "entrypoint": ".tmp/sprint-01-verification/t18/harness-eval-result.json, downloaded by `gh run download <run-id> -n harness-eval-result-<run-id>-1` for a run whose head_sha is this task's landed commit (the run id is re-resolved on every use and never hard-coded)",
      "description": "one finished hand dispatch of `.github/workflows/harness-eval.yml` on the commit that lands this task: 12 cells, both claude-code cells graded, the pinned cell's `question_before_expensive_work` reading `pass` with one question and no answer delivered, both ask-nothing legs recording zero questions, and the ten other cells keeping their named reasons",
      "seed_method": "cli"
    }
  },
  "verification_gates": [],
  "integration_obligations": [],
  "requirements": [
    {
      "id": "AC-1",
      "type": "acceptance_criterion",
      "primary": true,
      "flow_ref": null,
      "title": "The must-ask invocation is told to ask exactly one question, and told nothing that is an answer",
      "description": "GIVEN `seed/kit-cases`, the five case manifests and the product's own B1 batch wording WHEN `invocationTable({ track: \"pinned\" })` renders every entry's prompt and the `first-question-init` prompt is read against its case manifest THEN the must-ask prompt starts with `/pixel-perfect:init` and carries exactly one declared question surface naming `USER_CHOICE(<batch-id>)`, the exactly-one rule and the ask-before-work rule, derived from the case's `expected_question` and `ask_policy`, carrying no platform id and no option label, while the four ask-nothing prompts are byte-identical to base",
      "test_tier": "integration",
      "verify": "node --test tests/sprint-01/t18-question-boundary.test.mjs --test-name-pattern t18-must-ask-prompt-declares-one-question",
      "test_file": "tests/sprint-01/t18-question-boundary.test.mjs",
      "test_function": "t18-must-ask-prompt-declares-one-question",
      "positive_example": "the prompt reads `/pixel-perfect:init Graded question surface: this turn is graded on exactly one question ... state it as the last thing in the turn under a line beginning USER_CHOICE(<batch-id>) ...`, names `B1`, and `questionSurfacePrompt({ caseManifest: loadCase(\"status-a\") })` is `\"\"`.",
      "red_input": "on base `promptFor` renders `/pixel-perfect:init` and nothing else: the prompt is `22` characters, names no marker and states no rule, which is the exact prompt run 41249460968 sent before its cell read `required-fact-unobserved`",
      "red_proof": ".tmp/sprint-01-verification/t18-question-boundary.red.log",
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "scenario": {
        "id": "SC-T18-AC1",
        "tier": "e2e-automated",
        "test_tier": "integration",
        "negative_control": {
          "would_fail_if": [
            "the must-ask prompt is still rendered as `/pixel-perfect:init` alone, `22` characters long, with no surface, so the invocation is never told it is graded on asking and run 41249460968 repeats",
            "the surface is hardcoded for one case id, so a second must-ask case renders the first case's question and the declaration is not derived",
            "the surface is appended to the four ask-nothing entries too, so their prompts change and `gradeAskNothing` is never measured against the bytes it always graded",
            "the surface hands over the answer \u2014 a platform id, an option label or a goal sentence \u2014 so a reply that never asked about it still satisfies the case's `expected_question`"
          ]
        },
        "evidence": {
          "forms": [
            "the rendered prompt string for each of the five invocation-table entries",
            "the case manifests as loaded by `loadCase`, and the product's `workflows/init.md` B1 block as read by the lane"
          ]
        },
        "topology_note": "one local render per entry through the real `invocationTable`/`promptFor`: the surface is compared with the case that declares it and with the product's own batch text, so a hardcoded surface and a missing surface are both visible",
        "cases": [
          {
            "start_ref": "seed/kit-cases",
            "action": {
              "actor": "runner",
              "steps": [
                "node --test tests/sprint-01/t18-question-boundary.test.mjs --test-name-pattern t18-must-ask-prompt-declares-one-question"
              ]
            },
            "end_state": {
              "must_observe": [
                "the `first-question-init` prompt starts with `/pixel-perfect:init` and is longer than `22` characters",
                "it carries exactly `1` occurrence of `USER_CHOICE(`",
                "it names the batch id `B1`, read from the product's own `How this workflow asks` table",
                "it states the exactly-one rule with the literal `exactly one`",
                "it states the ask-before-work rule with the literal `before` beside `tool`",
                "`questionSurfacePrompt({ caseManifest: loadCase(\"status-a\") })` renders `0` characters"
              ],
              "must_not_observe": [
                "the rendered surface containing `web-desktop`",
                "the rendered surface containing an option label from the product's batch",
                "an empty surface on the must-ask entry",
                "0 declarations on the must-ask entry"
              ]
            }
          },
          {
            "start_ref": "seed/kit-cases",
            "action": {
              "actor": "runner",
              "steps": [
                "render the `command_list`, `status-a`, `verify-button-drift` and `verify-clean` prompts with the changed module",
                "compare each against the same string rendered from the base module's composition (no surface)"
              ]
            },
            "end_state": {
              "must_observe": [
                "all `4` ask-nothing prompts are byte-identical to base",
                "the `status-a` prompt still begins `/pixel-perfect:status --platform web-desktop`",
                "each of the `4` prompt sha256 values equals its base value"
              ],
              "must_not_observe": [
                "`USER_CHOICE(` in any ask-nothing prompt",
                "an empty prompt on the `command_list` entry",
                "0 byte-identical prompts"
              ]
            }
          }
        ]
      },
      "maps_to_ac": null
    },
    {
      "id": "AC-2",
      "type": "acceptance_criterion",
      "primary": true,
      "flow_ref": null,
      "title": "The question is captured and mapped to `question-start`, so the check grades `pass` \u2014 and the ask-nothing legs still record zero",
      "description": "GIVEN `seed/first-question-capture`, `seed/no-question-capture` and `seed/two-batch-capture` WHEN each is replayed through the real capture reader, `mapCapturedLine`, the real stream normaliser and `gradeCheck` on the `first-question-init` and `status-a` entries THEN the documented capture grades `question_before_expensive_work` `pass` with boundary `count` `1` at the marker's measured offset and `answers_delivered` `0` with `question-start` among the observed facts, the real capture reads `count` `0` with no `question-start`, the documented capture graded ask-nothing reads `question-in-ask-nothing` at that offset, and the two-batch capture carries `more-than-one-question` with `count` `2`",
      "test_tier": "integration",
      "verify": "node --test tests/sprint-01/t18-question-boundary.test.mjs --test-name-pattern t18-question-boundary-recorded",
      "test_file": "tests/sprint-01/t18-question-boundary.test.mjs",
      "test_function": "t18-question-boundary-recorded",
      "positive_example": "`{ check_id: \"question_before_expensive_work\", verdict: \"pass\", reason: null }` with `boundary: { count: 1, offsets: [<marker offset>], answers_delivered: 0 }`, `observedFacts(record).has(\"question-start\")` true, and the two-batch read carrying `{ verdict: \"fail\", reason: \"more-than-one-question\", count: 2 }`.",
      "red_input": "the marker line is agent text and neither reader classifies agent text, so the graded cell reads `could-not-run required-fact-unobserved` with `missing: [\"question-start\"]` beside a `no-question-asked` block \u2014 the reading of both claude-code cells in run 41249460968",
      "red_proof": ".tmp/sprint-01-verification/t18-question-boundary.red.log",
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "scenario": {
        "id": "SC-T18-AC2",
        "tier": "e2e-automated",
        "test_tier": "integration",
        "negative_control": {
          "would_fail_if": [
            "the question predicate is unchanged, so the marker line stays agent text and the cell still reads `could-not-run required-fact-unobserved` with `missing` naming `question-start`",
            "the predicate is widened to any assistant text, so the committed real capture's reply that discusses `don't ask` mode counts as a question and its zero reading disappears",
            "the graded cell is made green by dropping `question-start` from the entry's `required_facts` or by swapping `could-not-run` for `pass`, so the record no longer has to observe anything",
            "the marker is stubbed into the record instead of read from the bytes, so a capture with no marker would still grade `pass`"
          ]
        },
        "evidence": {
          "forms": [
            "the captured stdout bytes of each capture and the record `createCapture` built from them",
            "the graded cell for `check_id: question_before_expensive_work` with its verdict, boundary count, offsets and `answers_delivered`"
          ]
        },
        "topology_note": "three captures through one grading path: the documented-output envelope with one marker, the committed real capture with none, and the two-batch variant; the same real `mapCapturedLine` and `gradeCheck` produce all three readings, so a detector that counts everything and one that counts nothing are both caught",
        "cases": [
          {
            "start_ref": "seed/first-question-capture",
            "action": {
              "actor": "runner",
              "steps": [
                "node --test tests/sprint-01/t18-question-boundary.test.mjs --test-name-pattern t18-question-boundary-recorded"
              ]
            },
            "end_state": {
              "must_observe": [
                "the graded cell reads `{ check_id: \"question_before_expensive_work\", verdict: \"pass\", reason: null }`",
                "`boundary.count` is `1` at the marker line's measured offset",
                "`answers_delivered` is `0`",
                "`observedFacts(record)` contains `question-start` with `required_read: true`",
                "the cell carries `4` check ids overall"
              ],
              "must_not_observe": [
                "`required-fact-unobserved` anywhere in the cell's block reasons",
                "a `no-question-asked` block on the same cell",
                "0 checks in the cell"
              ]
            }
          },
          {
            "start_ref": "seed/no-question-capture",
            "action": {
              "actor": "runner",
              "steps": [
                "grade the committed real capture through the same mapper and `gradeCheck` on the must-ask entry",
                "grade the same record on the `status-a` entry as ask-nothing"
              ]
            },
            "end_state": {
              "must_observe": [
                "`boundary.count` is `0` on the real capture",
                "`observedFacts(record)` has no `question-start`",
                "the must-ask read carries `no-question-asked` and not `could-not-run`",
                "the ask-nothing read carries `0` question blocks"
              ],
              "must_not_observe": [
                "a question counted from the reply that mentions `don't ask` mode",
                "`question-start` observed on the real capture",
                "an empty block list on the must-ask read"
              ]
            }
          },
          {
            "start_ref": "seed/two-batch-capture",
            "action": {
              "actor": "runner",
              "steps": [
                "grade the two-batch bytes must-ask through the same `gradeCheck`",
                "grade the same bytes ask-nothing"
              ]
            },
            "end_state": {
              "must_observe": [
                "the must-ask read carries `more-than-one-question` with `count` `2`",
                "the ask-nothing read carries `question-in-ask-nothing` with `2` offsets",
                "both offsets are integers greater than `0`"
              ],
              "must_not_observe": [
                "a `pass` on the two-batch must-ask read",
                "0 offsets cited by the ask-nothing block",
                "the second batch line counted as `0` questions"
              ]
            }
          }
        ]
      },
      "maps_to_ac": null
    },
    {
      "id": "AC-3",
      "type": "acceptance_criterion",
      "primary": true,
      "flow_ref": null,
      "title": "A dispatched run grades the question `pass` on the pinned cell while both ask-nothing legs keep zero questions",
      "description": "GIVEN `seed/dispatched-run-t18`, the downloaded result artifact of `harness-eval` on the commit that lands this task, and `seed/dispatched-run-41249460968`, the recorded pre-fix artifact WHEN `.cells[]` is read for both claude-code cells and every check row is compared with the pre-fix reading THEN the pinned cell's `question_before_expensive_work` reads `pass` with no `required-fact-unobserved` block, its three neighbour rows and the ten other cells keep their own verdicts and named reasons, and no claude-code row records a question on an ask-nothing leg",
      "test_tier": "e2e",
      "verify": "node --test tests/sprint-01/t18-question-boundary.test.mjs --test-name-pattern t18-dispatched-question-pass",
      "test_file": "tests/sprint-01/t18-question-boundary.test.mjs",
      "test_function": "t18-dispatched-question-pass",
      "positive_example": "`jq -r '.cells[] | select(.harness==\"claude-code\") | .track + \" \" + ([.checks[] | .check_id + \" \" + .verdict] | join(\", \"))'` prints two lines, and `question_before_expensive_work pass` appears on `pinned` with no `required-fact-unobserved` anywhere in the artifact.",
      "red_input": "no dispatch exists for this commit and the pre-fix artifact reads `could-not-run required-fact-unobserved` on both claude-code cells; the lane fails with the named reason `dispatched-artifact-absent` until the artifact is downloaded to the declared path",
      "red_proof": ".tmp/sprint-01-verification/t18-question-boundary.red.log",
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "scenario": {
        "id": "SC-T18-AC3",
        "tier": "e2e-automated",
        "test_tier": "e2e",
        "negative_control": {
          "would_fail_if": [
            "the dispatched artifact still reads `could-not-run required-fact-unobserved` on both claude-code cells, which is the reading of run 41249460968",
            "the artifact is absent and the lane reads a hand-written stand-in instead of failing with `dispatched-artifact-absent`",
            "a `pass` on the pinned cell comes with a changed reading anywhere else in the artifact, so the ten other cells no longer keep their named reasons",
            "an ask-nothing leg records a question, so the one check that must stay silent is the one that paid for the fix"
          ]
        },
        "evidence": {
          "forms": [
            "the downloaded `harness-eval-result` artifact of the dispatched run",
            "the per-cell check rows of both claude-code cells, read with `jq`"
          ]
        },
        "topology_note": "one real dispatch on a hosted runner with the real claude-code CLI and the harness-smoke binding; the lane reads the downloaded artifact and nothing else, so a verdict cannot be supplied locally",
        "cases": [
          {
            "start_ref": "seed/dispatched-run-t18",
            "action": {
              "actor": "cli_user",
              "steps": [
                "dispatch `harness-eval` on the commit that lands this task and wait for the run to finish",
                "download `harness-eval-result-<run-id>-1` into `.tmp/sprint-01-verification/t18/`",
                "node --test tests/sprint-01/t18-question-boundary.test.mjs --test-name-pattern t18-dispatched-question-pass"
              ]
            },
            "end_state": {
              "must_observe": [
                "the `pinned` claude-code cell's `question_before_expensive_work` row reads `pass`",
                "the same cell still carries `4` check rows",
                "the `newest` cell's `question_before_expensive_work` row no longer reads `required-fact-unobserved`",
                "the artifact names `12` cells and no claude-code row records a question on an ask-nothing leg"
              ],
              "must_not_observe": [
                "`required-fact-unobserved` on either claude-code question row",
                "an `*-adapter-not-implemented` reason on a claude-code row",
                "0 check rows on the pinned cell"
              ]
            }
          },
          {
            "start_ref": "seed/dispatched-run-41249460968",
            "action": {
              "actor": "runner",
              "steps": [
                "read the recorded pre-fix artifact's two claude-code cells",
                "compare their question rows with the post-fix artifact's"
              ]
            },
            "end_state": {
              "must_observe": [
                "the pre-fix artifact reads `could-not-run required-fact-unobserved` with `missing` naming `question-start` on both claude-code cells",
                "the pre-fix artifact's same cell also carries `no-question-asked`",
                "the pre-fix artifact keeps `10` non-claude cells with named reasons"
              ],
              "must_not_observe": [
                "a `pass` on the pre-fix question row",
                "0 non-claude cells in the pre-fix artifact",
                "an empty `missing` list on the pre-fix question row"
              ]
            }
          }
        ]
      },
      "maps_to_ac": null
    },
    {
      "id": "TC-1",
      "type": "test_criterion",
      "primary": false,
      "flow_ref": null,
      "title": "The declaration reaches the must-ask entry and no other",
      "description": "the `first-question-init` prompt contains one `USER_CHOICE(` occurrence with the batch id `B1` taken from the product's own batch table, the four ask-nothing prompts equal their base strings byte for byte, and `verify-button-drift` still names `reports/verify-button-drift.json`",
      "test_tier": "integration",
      "verify": "node --test tests/sprint-01/t18-question-boundary.test.mjs --test-name-pattern t18-other-prompts-unchanged",
      "test_file": "tests/sprint-01/t18-question-boundary.test.mjs",
      "test_function": "t18-other-prompts-unchanged",
      "positive_example": "`1` occurrence of `USER_CHOICE(` on the must-ask prompt, batch id `B1`, and `4` ask-nothing prompt sha256 values equal to base.",
      "red_input": "on base the must-ask prompt carries `0` occurrences of the marker and the batch id is not read from the product at all",
      "red_proof": ".tmp/sprint-01-verification/t18-question-boundary.red.log",
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "scenario": {
        "id": "SC-T18-TC1",
        "tier": "e2e-automated",
        "test_tier": "integration",
        "negative_control": {
          "would_fail_if": [
            "the declaration is a literal in the adapter rather than derived from the case, so a second must-ask case renders `B1`",
            "the four ask-nothing prompts change by even one byte, so the invocation that must stay silent is re-measured against new text",
            "the batch id is invented by the adapter instead of read from the product's own `How this workflow asks` table",
            "the surface is appended after an empty join, leaving a dangling space that changes the prompt's sha256"
          ]
        },
        "evidence": {
          "forms": [
            "the rendered prompt strings and their sha256 values",
            "the product's `workflows/init.md` batch table as parsed by the lane"
          ]
        },
        "topology_note": "the lane renders every entry twice \u2014 once through the changed module, once from the base composition it reconstructs from `promptFor`'s parts \u2014 so an added declaration and a changed ask-nothing prompt cannot both hide",
        "cases": [
          {
            "start_ref": "seed/kit-cases",
            "action": {
              "actor": "runner",
              "steps": [
                "node --test tests/sprint-01/t18-question-boundary.test.mjs --test-name-pattern t18-other-prompts-unchanged"
              ]
            },
            "end_state": {
              "must_observe": [
                "the `first-question-init` prompt contains `1` occurrence of `USER_CHOICE(`",
                "the batch id in the surface equals `B1`, the first id in the product's own batch table",
                "`4` ask-nothing prompt sha256 values equal their base values",
                "the `verify-button-drift` prompt still names `reports/verify-button-drift.json`"
              ],
              "must_not_observe": [
                "a second occurrence of `USER_CHOICE(` in the must-ask prompt",
                "0 byte-identical ask-nothing prompts",
                "a trailing space at the end of the must-ask prompt",
                "an empty `status-a` prompt"
              ]
            }
          }
        ]
      },
      "maps_to_ac": "AC-1"
    },
    {
      "id": "TC-2",
      "type": "test_criterion",
      "primary": false,
      "flow_ref": null,
      "title": "The marker is the only text signal, and it is read from assistant text only",
      "description": "bytes carrying `USER_CHOICE(B1)` in an assistant text block read `count` `1`; the same marker in a `user`-role line, the committed real reply that discusses `don't ask` mode, a reply ending in `?`, a numbered list without a marker, and `USER_CHOICE()` with no batch id all read `count` `0`",
      "test_tier": "integration",
      "verify": "node --test tests/sprint-01/t18-question-boundary.test.mjs --test-name-pattern t18-marker-is-the-only-signal",
      "test_file": "tests/sprint-01/t18-question-boundary.test.mjs",
      "test_function": "t18-marker-is-the-only-signal",
      "positive_example": "`1` for the assistant marker, `0` for each of the five variants that must stay silent.",
      "red_input": "on base no text shape is counted at all, so the assistant marker also reads `0` and this criterion fails at its first assertion",
      "red_proof": ".tmp/sprint-01-verification/t18-question-boundary.red.log",
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "scenario": {
        "id": "SC-T18-TC2",
        "tier": "e2e-automated",
        "test_tier": "integration",
        "negative_control": {
          "would_fail_if": [
            "the predicate counts any assistant text, so the committed real reply that says `don't ask` mode reads as a question",
            "the predicate counts a `user` line, so the harness's own declaration in the prompt reads as the model's question and the check passes with nothing asked",
            "the predicate falls back to a `?` or a numbered list, so an ordinary reply ending in a question mark reads as an ask",
            "the batch id is optional in the pattern, so `USER_CHOICE()` counts and a paraphrase of the token counts too",
            "the marker is hardcoded to the fixture's batch id `B1`, so a second batch id reads `0` and the matcher is a literal rather than the declared pattern"
          ]
        },
        "evidence": {
          "forms": [
            "the counted question events for each byte variant, with their offsets",
            "the committed real capture and its single assistant text block"
          ]
        },
        "topology_note": "one predicate over five byte variants of the same envelope, including the two shapes that must read zero while looking like a question, so a widened matcher is visible without a dispatch",
        "cases": [
          {
            "start_ref": "seed/first-question-capture",
            "action": {
              "actor": "runner",
              "steps": [
                "node --test tests/sprint-01/t18-question-boundary.test.mjs --test-name-pattern t18-marker-is-the-only-signal"
              ]
            },
            "end_state": {
              "must_observe": [
                "the marker line in an assistant text block reads `count` `1`",
                "the same marker in a `user`-role line reads `count` `0`",
                "the committed real capture's assistant text reads `count` `0`",
                "a reply ending in `?` with no marker reads `count` `0`",
                "a numbered list with no marker reads `count` `0`",
                "`USER_CHOICE()` with no batch id reads `count` `0`"
              ],
              "must_not_observe": [
                "a question counted from the `user`-role echo",
                "a question counted from `don't ask` mode text",
                "0 variants asserting a nonzero count, or a `?` reading as `1` question"
              ]
            }
          }
        ]
      },
      "maps_to_ac": "AC-2"
    },
    {
      "id": "TC-3",
      "type": "test_criterion",
      "primary": false,
      "flow_ref": null,
      "title": "The two readers agree on the same bytes, and the fact is bound to a real span",
      "description": "the adapter's `questionBoundary(record)` and the stream layer's `questions(normalise(...).events)` return the same count at the same offset on both captures, the table rule's `text_match` contains `QUESTION_MARKER_PATTERN.source`, and the `question-start` observation re-hashes to its captured span with `required_read: true`",
      "test_tier": "integration",
      "verify": "node --test tests/sprint-01/t18-question-boundary.test.mjs --test-name-pattern t18-two-readers-agree",
      "test_file": "tests/sprint-01/t18-question-boundary.test.mjs",
      "test_function": "t18-two-readers-agree",
      "positive_example": "`1` and `1` at the same offset, `0` and `0` on the real capture, `raw_sha256` matching the span, and the pattern source present in the table rule.",
      "red_input": "on base both readers return `0` on the documented capture and the table carries `0` rules matching agent text, so the agreement assertion has nothing to agree on",
      "red_proof": ".tmp/sprint-01-verification/t18-question-boundary.red.log",
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "scenario": {
        "id": "SC-T18-TC3",
        "tier": "e2e-automated",
        "test_tier": "integration",
        "negative_control": {
          "would_fail_if": [
            "the two readers disagree on the same bytes, so the cell's verdict and the graders' reading of one capture come out different",
            "the observation cites an offset nobody measured \u2014 a `0` offset, a copied constant or a span that does not re-hash to the captured bytes",
            "the fact is minted without `required_read: true`, so `observedFacts` skips it and `required-fact-unobserved` returns",
            "the table's `text_match` and the adapter's pattern drift apart, so the same bytes read `1` and `0` in the two layers",
            "the pattern is duplicated as two independent literals, so one side is edited and the other left unchanged and the readers silently diverge"
          ]
        },
        "evidence": {
          "forms": [
            "the adapter's boundary result and the stream layer's `questions()` result for the same bytes",
            "the `question-start` observation with its span and re-hashed digest"
          ]
        },
        "topology_note": "both readers are driven from the same persisted bytes in one test, and the observation's digest is re-hashed against the captured span, so agreement and evidence resolvability are measured rather than declared",
        "cases": [
          {
            "start_ref": "seed/first-question-capture",
            "action": {
              "actor": "runner",
              "steps": [
                "node --test tests/sprint-01/t18-question-boundary.test.mjs --test-name-pattern t18-two-readers-agree"
              ]
            },
            "end_state": {
              "must_observe": [
                "both readers return `count` `1` at the same offset on the documented capture",
                "both readers return `count` `0` on the committed real capture",
                "the table rule's `text_match` contains `QUESTION_MARKER_PATTERN.source`",
                "the observation carries a `raw_sha256` that re-hashes to its captured span",
                "the observation's `stream_end_offset` is greater than its `stream_offset`"
              ],
              "must_not_observe": [
                "a `0` offset on the observation",
                "a digest mismatch between the observation and its span",
                "the two readers returning different counts on the same bytes",
                "a `question-start` observation with `required_read: false`"
              ]
            }
          }
        ]
      },
      "maps_to_ac": "AC-2"
    },
    {
      "id": "TC-4",
      "type": "test_criterion",
      "primary": false,
      "flow_ref": null,
      "title": "The ask-nothing rule keeps its teeth on the same bytes",
      "description": "the documented capture graded ask-nothing carries `question-in-ask-nothing` at the marker's own offset, the two-batch capture read must-ask carries `more-than-one-question` with `count` `2`, the committed real capture read must-ask carries `no-question-asked` and not `could-not-run`, and the `status-a` prompt carries no declaration",
      "test_tier": "integration",
      "verify": "node --test tests/sprint-01/t18-question-boundary.test.mjs --test-name-pattern t18-ask-nothing-keeps-teeth",
      "test_file": "tests/sprint-01/t18-question-boundary.test.mjs",
      "test_function": "t18-ask-nothing-keeps-teeth",
      "positive_example": "`question-in-ask-nothing` at the marker offset, `more-than-one-question` with `count` `2`, and `no-question-asked` on the real capture.",
      "red_input": "on base the ask-nothing block never fires because nothing counts the marker, so the opposite direction is unmeasured and a loosened detector could not be caught",
      "red_proof": ".tmp/sprint-01-verification/t18-question-boundary.red.log",
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "scenario": {
        "id": "SC-T18-TC4",
        "tier": "e2e-automated",
        "test_tier": "integration",
        "negative_control": {
          "would_fail_if": [
            "the ask-nothing rule is relaxed while the must-ask rule is widened, so one predicate now passes both legs and proves neither",
            "the marker is stripped from the ask-nothing reading, so the same bytes that fail one leg pass the other",
            "two batches read as one, so a model that asks twice still passes the exactly-one rule",
            "the real capture's zero reading turns into `could-not-run`, which would hide a genuine no-question failure",
            "the marker is removed before the ask-nothing read, so the same bytes that fail one leg pass the other and neither direction is measured"
          ]
        },
        "evidence": {
          "forms": [
            "the ask-nothing block reasons and their offsets for the same bytes",
            "the must-ask reading of the committed real capture"
          ]
        },
        "topology_note": "the same three captures are graded on the opposite policy, so the two directions are measured on identical bytes and a detector that fires on both cannot be mistaken for a grader",
        "cases": [
          {
            "start_ref": "seed/first-question-capture",
            "action": {
              "actor": "runner",
              "steps": [
                "node --test tests/sprint-01/t18-question-boundary.test.mjs --test-name-pattern t18-ask-nothing-keeps-teeth"
              ]
            },
            "end_state": {
              "must_observe": [
                "the documented capture graded ask-nothing carries `question-in-ask-nothing` at the marker's own offset",
                "the two-batch capture read must-ask carries `more-than-one-question` with `count` `2`",
                "the committed real capture read must-ask carries `no-question-asked`",
                "the `status-a` prompt carries `0` declarations"
              ],
              "must_not_observe": [
                "a `pass` on the documented capture read ask-nothing",
                "a `pass` on the two-batch capture read must-ask",
                "`could-not-run` in place of `no-question-asked` on the real capture",
                "0 offsets on the ask-nothing block"
              ]
            }
          }
        ]
      },
      "maps_to_ac": "AC-2"
    }
  ],
  "acceptance_criteria": [
    {
      "id": "AC-1",
      "type": "acceptance_criterion",
      "primary": true,
      "flow_ref": null,
      "title": "The must-ask invocation is told to ask exactly one question, and told nothing that is an answer",
      "description": "GIVEN `seed/kit-cases`, the five case manifests and the product's own B1 batch wording WHEN `invocationTable({ track: \"pinned\" })` renders every entry's prompt and the `first-question-init` prompt is read against its case manifest THEN the must-ask prompt starts with `/pixel-perfect:init` and carries exactly one declared question surface naming `USER_CHOICE(<batch-id>)`, the exactly-one rule and the ask-before-work rule, derived from the case's `expected_question` and `ask_policy`, carrying no platform id and no option label, while the four ask-nothing prompts are byte-identical to base",
      "test_tier": "integration",
      "verify": "node --test tests/sprint-01/t18-question-boundary.test.mjs --test-name-pattern t18-must-ask-prompt-declares-one-question",
      "test_file": "tests/sprint-01/t18-question-boundary.test.mjs",
      "test_function": "t18-must-ask-prompt-declares-one-question",
      "positive_example": "the prompt reads `/pixel-perfect:init Graded question surface: this turn is graded on exactly one question ... state it as the last thing in the turn under a line beginning USER_CHOICE(<batch-id>) ...`, names `B1`, and `questionSurfacePrompt({ caseManifest: loadCase(\"status-a\") })` is `\"\"`.",
      "red_input": "on base `promptFor` renders `/pixel-perfect:init` and nothing else: the prompt is `22` characters, names no marker and states no rule, which is the exact prompt run 41249460968 sent before its cell read `required-fact-unobserved`",
      "red_proof": ".tmp/sprint-01-verification/t18-question-boundary.red.log",
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "scenario": {
        "id": "SC-T18-AC1",
        "tier": "e2e-automated",
        "test_tier": "integration",
        "negative_control": {
          "would_fail_if": [
            "the must-ask prompt is still rendered as `/pixel-perfect:init` alone, `22` characters long, with no surface, so the invocation is never told it is graded on asking and run 41249460968 repeats",
            "the surface is hardcoded for one case id, so a second must-ask case renders the first case's question and the declaration is not derived",
            "the surface is appended to the four ask-nothing entries too, so their prompts change and `gradeAskNothing` is never measured against the bytes it always graded",
            "the surface hands over the answer \u2014 a platform id, an option label or a goal sentence \u2014 so a reply that never asked about it still satisfies the case's `expected_question`"
          ]
        },
        "evidence": {
          "forms": [
            "the rendered prompt string for each of the five invocation-table entries",
            "the case manifests as loaded by `loadCase`, and the product's `workflows/init.md` B1 block as read by the lane"
          ]
        },
        "topology_note": "one local render per entry through the real `invocationTable`/`promptFor`: the surface is compared with the case that declares it and with the product's own batch text, so a hardcoded surface and a missing surface are both visible",
        "cases": [
          {
            "start_ref": "seed/kit-cases",
            "action": {
              "actor": "runner",
              "steps": [
                "node --test tests/sprint-01/t18-question-boundary.test.mjs --test-name-pattern t18-must-ask-prompt-declares-one-question"
              ]
            },
            "end_state": {
              "must_observe": [
                "the `first-question-init` prompt starts with `/pixel-perfect:init` and is longer than `22` characters",
                "it carries exactly `1` occurrence of `USER_CHOICE(`",
                "it names the batch id `B1`, read from the product's own `How this workflow asks` table",
                "it states the exactly-one rule with the literal `exactly one`",
                "it states the ask-before-work rule with the literal `before` beside `tool`",
                "`questionSurfacePrompt({ caseManifest: loadCase(\"status-a\") })` renders `0` characters"
              ],
              "must_not_observe": [
                "the rendered surface containing `web-desktop`",
                "the rendered surface containing an option label from the product's batch",
                "an empty surface on the must-ask entry",
                "0 declarations on the must-ask entry"
              ]
            }
          },
          {
            "start_ref": "seed/kit-cases",
            "action": {
              "actor": "runner",
              "steps": [
                "render the `command_list`, `status-a`, `verify-button-drift` and `verify-clean` prompts with the changed module",
                "compare each against the same string rendered from the base module's composition (no surface)"
              ]
            },
            "end_state": {
              "must_observe": [
                "all `4` ask-nothing prompts are byte-identical to base",
                "the `status-a` prompt still begins `/pixel-perfect:status --platform web-desktop`",
                "each of the `4` prompt sha256 values equals its base value"
              ],
              "must_not_observe": [
                "`USER_CHOICE(` in any ask-nothing prompt",
                "an empty prompt on the `command_list` entry",
                "0 byte-identical prompts"
              ]
            }
          }
        ]
      },
      "maps_to_ac": null
    },
    {
      "id": "AC-2",
      "type": "acceptance_criterion",
      "primary": true,
      "flow_ref": null,
      "title": "The question is captured and mapped to `question-start`, so the check grades `pass` \u2014 and the ask-nothing legs still record zero",
      "description": "GIVEN `seed/first-question-capture`, `seed/no-question-capture` and `seed/two-batch-capture` WHEN each is replayed through the real capture reader, `mapCapturedLine`, the real stream normaliser and `gradeCheck` on the `first-question-init` and `status-a` entries THEN the documented capture grades `question_before_expensive_work` `pass` with boundary `count` `1` at the marker's measured offset and `answers_delivered` `0` with `question-start` among the observed facts, the real capture reads `count` `0` with no `question-start`, the documented capture graded ask-nothing reads `question-in-ask-nothing` at that offset, and the two-batch capture carries `more-than-one-question` with `count` `2`",
      "test_tier": "integration",
      "verify": "node --test tests/sprint-01/t18-question-boundary.test.mjs --test-name-pattern t18-question-boundary-recorded",
      "test_file": "tests/sprint-01/t18-question-boundary.test.mjs",
      "test_function": "t18-question-boundary-recorded",
      "positive_example": "`{ check_id: \"question_before_expensive_work\", verdict: \"pass\", reason: null }` with `boundary: { count: 1, offsets: [<marker offset>], answers_delivered: 0 }`, `observedFacts(record).has(\"question-start\")` true, and the two-batch read carrying `{ verdict: \"fail\", reason: \"more-than-one-question\", count: 2 }`.",
      "red_input": "the marker line is agent text and neither reader classifies agent text, so the graded cell reads `could-not-run required-fact-unobserved` with `missing: [\"question-start\"]` beside a `no-question-asked` block \u2014 the reading of both claude-code cells in run 41249460968",
      "red_proof": ".tmp/sprint-01-verification/t18-question-boundary.red.log",
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "scenario": {
        "id": "SC-T18-AC2",
        "tier": "e2e-automated",
        "test_tier": "integration",
        "negative_control": {
          "would_fail_if": [
            "the question predicate is unchanged, so the marker line stays agent text and the cell still reads `could-not-run required-fact-unobserved` with `missing` naming `question-start`",
            "the predicate is widened to any assistant text, so the committed real capture's reply that discusses `don't ask` mode counts as a question and its zero reading disappears",
            "the graded cell is made green by dropping `question-start` from the entry's `required_facts` or by swapping `could-not-run` for `pass`, so the record no longer has to observe anything",
            "the marker is stubbed into the record instead of read from the bytes, so a capture with no marker would still grade `pass`"
          ]
        },
        "evidence": {
          "forms": [
            "the captured stdout bytes of each capture and the record `createCapture` built from them",
            "the graded cell for `check_id: question_before_expensive_work` with its verdict, boundary count, offsets and `answers_delivered`"
          ]
        },
        "topology_note": "three captures through one grading path: the documented-output envelope with one marker, the committed real capture with none, and the two-batch variant; the same real `mapCapturedLine` and `gradeCheck` produce all three readings, so a detector that counts everything and one that counts nothing are both caught",
        "cases": [
          {
            "start_ref": "seed/first-question-capture",
            "action": {
              "actor": "runner",
              "steps": [
                "node --test tests/sprint-01/t18-question-boundary.test.mjs --test-name-pattern t18-question-boundary-recorded"
              ]
            },
            "end_state": {
              "must_observe": [
                "the graded cell reads `{ check_id: \"question_before_expensive_work\", verdict: \"pass\", reason: null }`",
                "`boundary.count` is `1` at the marker line's measured offset",
                "`answers_delivered` is `0`",
                "`observedFacts(record)` contains `question-start` with `required_read: true`",
                "the cell carries `4` check ids overall"
              ],
              "must_not_observe": [
                "`required-fact-unobserved` anywhere in the cell's block reasons",
                "a `no-question-asked` block on the same cell",
                "0 checks in the cell"
              ]
            }
          },
          {
            "start_ref": "seed/no-question-capture",
            "action": {
              "actor": "runner",
              "steps": [
                "grade the committed real capture through the same mapper and `gradeCheck` on the must-ask entry",
                "grade the same record on the `status-a` entry as ask-nothing"
              ]
            },
            "end_state": {
              "must_observe": [
                "`boundary.count` is `0` on the real capture",
                "`observedFacts(record)` has no `question-start`",
                "the must-ask read carries `no-question-asked` and not `could-not-run`",
                "the ask-nothing read carries `0` question blocks"
              ],
              "must_not_observe": [
                "a question counted from the reply that mentions `don't ask` mode",
                "`question-start` observed on the real capture",
                "an empty block list on the must-ask read"
              ]
            }
          },
          {
            "start_ref": "seed/two-batch-capture",
            "action": {
              "actor": "runner",
              "steps": [
                "grade the two-batch bytes must-ask through the same `gradeCheck`",
                "grade the same bytes ask-nothing"
              ]
            },
            "end_state": {
              "must_observe": [
                "the must-ask read carries `more-than-one-question` with `count` `2`",
                "the ask-nothing read carries `question-in-ask-nothing` with `2` offsets",
                "both offsets are integers greater than `0`"
              ],
              "must_not_observe": [
                "a `pass` on the two-batch must-ask read",
                "0 offsets cited by the ask-nothing block",
                "the second batch line counted as `0` questions"
              ]
            }
          }
        ]
      },
      "maps_to_ac": null
    },
    {
      "id": "AC-3",
      "type": "acceptance_criterion",
      "primary": true,
      "flow_ref": null,
      "title": "A dispatched run grades the question `pass` on the pinned cell while both ask-nothing legs keep zero questions",
      "description": "GIVEN `seed/dispatched-run-t18`, the downloaded result artifact of `harness-eval` on the commit that lands this task, and `seed/dispatched-run-41249460968`, the recorded pre-fix artifact WHEN `.cells[]` is read for both claude-code cells and every check row is compared with the pre-fix reading THEN the pinned cell's `question_before_expensive_work` reads `pass` with no `required-fact-unobserved` block, its three neighbour rows and the ten other cells keep their own verdicts and named reasons, and no claude-code row records a question on an ask-nothing leg",
      "test_tier": "e2e",
      "verify": "node --test tests/sprint-01/t18-question-boundary.test.mjs --test-name-pattern t18-dispatched-question-pass",
      "test_file": "tests/sprint-01/t18-question-boundary.test.mjs",
      "test_function": "t18-dispatched-question-pass",
      "positive_example": "`jq -r '.cells[] | select(.harness==\"claude-code\") | .track + \" \" + ([.checks[] | .check_id + \" \" + .verdict] | join(\", \"))'` prints two lines, and `question_before_expensive_work pass` appears on `pinned` with no `required-fact-unobserved` anywhere in the artifact.",
      "red_input": "no dispatch exists for this commit and the pre-fix artifact reads `could-not-run required-fact-unobserved` on both claude-code cells; the lane fails with the named reason `dispatched-artifact-absent` until the artifact is downloaded to the declared path",
      "red_proof": ".tmp/sprint-01-verification/t18-question-boundary.red.log",
      "surface_policy": ".spec/e2e-policy/sprint-01/artifact-only-read.json",
      "scenario": {
        "id": "SC-T18-AC3",
        "tier": "e2e-automated",
        "test_tier": "e2e",
        "negative_control": {
          "would_fail_if": [
            "the dispatched artifact still reads `could-not-run required-fact-unobserved` on both claude-code cells, which is the reading of run 41249460968",
            "the artifact is absent and the lane reads a hand-written stand-in instead of failing with `dispatched-artifact-absent`",
            "a `pass` on the pinned cell comes with a changed reading anywhere else in the artifact, so the ten other cells no longer keep their named reasons",
            "an ask-nothing leg records a question, so the one check that must stay silent is the one that paid for the fix"
          ]
        },
        "evidence": {
          "forms": [
            "the downloaded `harness-eval-result` artifact of the dispatched run",
            "the per-cell check rows of both claude-code cells, read with `jq`"
          ]
        },
        "topology_note": "one real dispatch on a hosted runner with the real claude-code CLI and the harness-smoke binding; the lane reads the downloaded artifact and nothing else, so a verdict cannot be supplied locally",
        "cases": [
          {
            "start_ref": "seed/dispatched-run-t18",
            "action": {
              "actor": "cli_user",
              "steps": [
                "dispatch `harness-eval` on the commit that lands this task and wait for the run to finish",
                "download `harness-eval-result-<run-id>-1` into `.tmp/sprint-01-verification/t18/`",
                "node --test tests/sprint-01/t18-question-boundary.test.mjs --test-name-pattern t18-dispatched-question-pass"
              ]
            },
            "end_state": {
              "must_observe": [
                "the `pinned` claude-code cell's `question_before_expensive_work` row reads `pass`",
                "the same cell still carries `4` check rows",
                "the `newest` cell's `question_before_expensive_work` row no longer reads `required-fact-unobserved`",
                "the artifact names `12` cells and no claude-code row records a question on an ask-nothing leg"
              ],
              "must_not_observe": [
                "`required-fact-unobserved` on either claude-code question row",
                "an `*-adapter-not-implemented` reason on a claude-code row",
                "0 check rows on the pinned cell"
              ]
            }
          },
          {
            "start_ref": "seed/dispatched-run-41249460968",
            "action": {
              "actor": "runner",
              "steps": [
                "read the recorded pre-fix artifact's two claude-code cells",
                "compare their question rows with the post-fix artifact's"
              ]
            },
            "end_state": {
              "must_observe": [
                "the pre-fix artifact reads `could-not-run required-fact-unobserved` with `missing` naming `question-start` on both claude-code cells",
                "the pre-fix artifact's same cell also carries `no-question-asked`",
                "the pre-fix artifact keeps `10` non-claude cells with named reasons"
              ],
              "must_not_observe": [
                "a `pass` on the pre-fix question row",
                "0 non-claude cells in the pre-fix artifact",
                "an empty `missing` list on the pre-fix question row"
              ]
            }
          }
        ]
      },
      "maps_to_ac": null
    }
  ]
}
-->
