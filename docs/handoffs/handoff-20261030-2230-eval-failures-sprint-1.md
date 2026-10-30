# HANDOFF — Sprint 1 evaluation failures, for a separate plugin-fixing session

**Written** 2026-10-30T22:35Z by opencode/deepseek-v4.1-flash
**Repo** pixel-perfect · **Branch** `main` · **HEAD at time of writing** `88e1e82` (this handoff is committed immediately on top of it)
**How to use this**: read §1–§3, run §4's checks, start at §2.
Claims are labeled VERIFIED / CLAIMED / ASSUMED — re-verify anything not VERIFIED before relying on it. Raw evidence is in §10.

> **Read this first, it changes the job.** Sprint 1's evaluation found **no proven plugin defect**. It found that the *evaluator* could not observe the plugin, and it found and fixed a series of evaluator defects. No `fail` verdict has ever been produced for any harness, because no run has ever graded a cell. If you sit down to "fix the plugin", the first thing you must do is produce one graded read (§2) — otherwise you are fixing something nobody has measured.

## 1. Mission

Get one real hosted `harness-eval` run that grades a claude-code cell, then fix whatever the graded evidence shows is wrong. "Done" for sprint 1 is a 12-cell result artifact in which both claude-code cells carry four checks graded from files-and-event-stream evidence, and the `controls` array records four observed negative controls.

**Out of scope**: sprints 02–06 (four more harness adapters, triggers, release gating, the fix-PR pipeline, later checks). Do not touch `plugins/pixel-perfect/**` until a graded run names a plugin defect — every defect below is in the evaluator (`test/harness/**`, `.github/workflows/harness-eval.yml`).

## 2. Start Here

```bash
cd /Users/justinrich/Projects/pixel-perfect

# 1. The sprint run state and what it says to do next
python3 ~/Projects/brain/tools/sprint-handoff/sprint_handoff.py inspect \
  --repo "$PWD" --sprint sprint-01-evaluator-evidence-spine --read-only --summary --limit 4

# 2. The one open prerequisite: T14 (see §7). It needs the owner to commit the amendment:
#    .spec/prds/harness-eval-framework/tasks/sprint-01-evaluator-evidence-spine/PLAN-AMENDMENT-2026-10-30-capture-requiredness.json
# 3. After T14 lands, dispatch and read the result (this is the whole point):
gh workflow run harness-eval --repo hackerpug-ai/pixel-perfect
RUN_ID=$(gh run list --workflow harness-eval --repo hackerpug-ai/pixel-perfect --limit 1 --json databaseId --jq '.[0].databaseId')
gh run watch $RUN_ID --repo hackerpug-ai/pixel-perfect
gh run download $RUN_ID --repo hackerpug-ai/pixel-perfect -n harness-eval-result-$RUN_ID-1 -D /tmp/he
jq -r '.cells[] | select(.harness=="claude-code") | .track + " " + .verdict + " " + ((.checks // []) | map(.check_id + ":" + .verdict) | join(" "))' /tmp/he/grade/harness-eval-result.json
```

## 3. State of Play

**Landed (VERIFIED, `git log --oneline` in §10)**: `45142ee` (T13 cycle 2) → merge `1b8c5b9` → completion `88e1e82`. T13 is `completed`; T11-FIX2 is `completed`; T1–T10 are `landed` with handoff delivery owed.

**The hosted sample run** — `VERIFIED` at candidate `0ff5575`: workflow run **41086556471**, 15 jobs (14 success), artifacts published, and the result read:

```
12 cells / 6 harnesses — all verdict could-not-run, reason smoke-not-implemented
4 controls / 0 qualified — all could-not-run / control-unobservable
```

That run predates T13, which is what made the matrix observe anything at all.

**The only real local leg** — `VERIFIED` at `45142ee`, artifact `T13/evidence/implementer-cycle-2/green/real-leg-local-run.log`:

```
command_list:pass/null, status:could-not-run/model-never-answered,
verify:could-not-run/model-never-answered, question_before_expensive_work:could-not-run/model-never-answered
invocation_id: true, process_exit_code: 1, evidence_paths: 10
reason: installation-identity-mismatch   # host CLI 2.1.314 vs pin 2.1.291
```

### Evaluation failures found in sprint 1

| # | Failure | Status |
|---|---|---|
| 1 | **All 12 cells published nothing gradeable** — `Record the cell` wrote a constant bare record; nothing called `runCheck`/`gradeCheck`/`cellFor`. | **FIXED** `ca14dc9`+`45142ee` |
| 2 | `executeLoad` hardcoded `install_mode: "checkout"`; `recorder/validate.mjs:126-132` refuses that on a published run. | **FIXED** `45142ee` |
| 3 | `cellFor` set `invocation_id: null`/`check_id: null`, so `assertPassEvidence` threw `pass-without-evidence` — **a graded pass was unrepresentable**. | **FIXED** `45142ee` |
| 4 | **The stream mapper read `permission_denials[].input`, but the CLI sends `tool_input`** — every real exit-0 denial was invisible, so the `exit0-denied-read` control could never fire on real data. | **FIXED** `45142ee` |
| 5 | `hidden-image-judge` scanned the kit-project run dirs (never the captured stream) and returned `pass` with `files_scanned: 0` on an empty tree. | **FIXED** `45142ee` |
| 6 | The observation merge that actually runs in CI was an inline duplicate **no test executed**; `Object.assign` let a null erase a real observation. | **FIXED** `45142ee` |
| 7 | `JSON.parse(process.env.HARNESS_EVAL_CONTROL_OBSERVATIONS ?? "{}")` threw, because Actions delivers an unset value as `""`. | **FIXED** `45142ee` |
| 8 | Controls array absent from the schema, recorder defaulted `[]`; nothing produced `controls.json`. | **FIXED** `63503ce` (T11-FIX2) |
| 9 | `actions/checkout@v4` ran **after** the cells download and wiped the twelve cell dirs — a real run still published nothing. | **FIXED** `63503ce` |
| 10 | Smoke upload shipped the whole `cell/` dir, so non-cell JSON was graded as cells (`cell-harness-unknown`). | **FIXED** `63503ce` |
| 11 | **`capture.observe` collapses a mapper-declared `required_read: false` to `null`** when `required_read_paths` is null (`test/harness/runtime/capture.mjs:182-199`), and `grade-writer.mjs:95-97` turns that into `could-not-run requiredness-undeclared` — so any real stream containing one *optional* denial cannot grade. | **OPEN** — T14, §7 |
| 12 | Only `stale-cache` can ever discriminate; `missing-key`, `exit0-denied-read`, `hidden-image-judge` pass no pair to `qualifyControls`, so `qualified` can never be true. | **OPEN** (advisory, recorded `F-T13-7`) |
| 13 | `node --test <file> --test-name-pattern <name>` does **not** filter on Node 24.14 — every per-AC receipt is the whole file, so receipts are not attributable. Leading form (`--test-name-pattern '<name>' <file>`) does filter. | **OPEN** (advisory, `F-T13-5`) |
| 14 | `adapters/registry.mjs:14-19` decides the credential **before** adapter absence, so `<harness>-adapter-not-implemented` is unreachable under the keyless GIVEN that AC-3 describes. | **OPEN** (advisory, `F-T13-6`) |

**Plugin defects: none observed** — `VERIFIED` in the sense that no `fail` verdict exists anywhere; every cell is `could-not-run`. Claiming a plugin bug today would be inventing one.

### 3b. Per-harness: what is failing, and what is merely not running

There is **no per-harness list of failing commands**, because no command has ever been graded. This table is the honest substitute: per harness, what its cells actually read, whether a *command* failed, and what would have to be true before you could fix anything.

| Harness | Adapter | Cells read (VERIFIED from run 41086556471) | Is a command failing? | What would have to be true to grade it |
|---|---|---|---|---|
| **claude-code** | built (`test/harness/adapters/claude-code.mjs`) | all 12 cells read `smoke-not-implemented`; the only real local leg read `command_list:pass`, other three `model-never-answered`, refused at `installation-identity-mismatch` | **unknown** — `status`, `verify` (planted + clean), `init` have never been graded | land T14, push `main`, dispatch with `SMOKE_CLAUDE_KEY`, read the four checks |
| **cursor** | none — the **guard** refuses before any adapter | `could-not-run` / `missing-api-key` | no — by design; there is no `CURSOR_API_KEY` | supply the key, then a sprint-02/03 adapter; the refusal is the intended signal |
| **codex** | none (`adapters/absent.mjs`) | `could-not-run` / `codex-adapter-not-implemented` | no — the plugin's commands were **never invoked** | sprint 02 builds the adapter; nothing to fix before that |
| **grok** | none | `could-not-run` / `grok-adapter-not-implemented` | no | sprint 02 |
| **opencode** | none | `could-not-run` / `opencode-adapter-not-implemented` | no | sprint 02 |
| **pi** | none | `could-not-run` / `pi-adapter-not-implemented` | no | sprint 02 |

Which commands are graded at all, per harness: only claude-code has an invocation table (`claude-code.mjs:79-140` — keyless `claude plugin details`, then `/pixel-perfect:status`, `/pixel-perfect:verify` ×2, `/pixel-perfect:init`). The other five harnesses' cells never invoke a plugin command, so no command-level defect can exist there yet.

**The first graded read is what produces a per-harness failure list.** Until then, the actionable work is §3's evaluator items — chiefly #11, which will make a real claude-code stream refuse before any check verdict is read.


## 4. Perishable — Check Before Touching Anything

Observed 2026-10-30T22:30Z. Re-check before acting.

- **Hosted run 41086556471** is finished (`failure`, conclusion expected: exit 1 because every cell is could-not-run). No job is running. Re-check: `gh run view 41086556471 --repo hackerpug-ai/pixel-perfect --json status,conclusion`.
- **Remote** `origin/main` = `0ff5575`. Local `main` is **ahead by 4 commits** (`8b15772`, `b73b44f`, `1b8c5b9`, `88e1e82` + the T13 commits). Nothing is pushed since `0ff5575`. Re-check: `git rev-list --left-right --count origin/main...main`.
- **Worktrees**: ~24 registered under `.kb-run-sprint/worktrees/sprint-01-evaluator-evidence-spine/` (T1–T13 plus `-review` copies) and a dozen detached ones under `/private/tmp`. Do not prune blindly — several hold RED evidence. `git worktree list` is in §10.
- **Uncommitted**: two untracked files, no tracked changes —
  - `.spec/.../PLAN-AMENDMENT-2026-10-30-capture-requiredness.json` — the T14 authorization awaiting the owner's commit (§7).
  - `.spec/.../RESUME.md` — a pre-existing pointer from an earlier session.
  Nothing is at risk, but the amendment is the only copy of the T14 authorization wording.
- **Sprint state** lives in `.kb-run-sprint/sprint-01-evaluator-evidence-spine/state.json` — **gitignored, local only**. A fresh clone cannot resume the run without it.

## 5. Decisions — Do Not Undo Without Reading

- **Evaluation grades from evidence, never from exit codes.** The process exit code travels beside a verdict as a diagnostic only. This is the sprint's central claim and the reason `verify` passes on the planted case while the oracle exits 1.
- **Four checks, three graded commands** (`status`, `verify`×2, `init`) out of the plugin's 11 commands. They were chosen to cover distinct failure modes, not to enumerate the surface. Coverage breadth is sprint 06 (`later_checks`).
- **`verify` is graded twice** (planted + clean twin) because a detector that calls everything defective is not a detector.
- **`cursor` is `could-not-run`/`missing-api-key` by design**; `codex`/`grok`/`opencode`/`pi` are `adapter-not-implemented` until sprint 02. Neither is a plugin defect and neither should be "fixed" by weakening a check.
- **The identity gate runs before any check verdict.** Local runs on this Mac can only ever demonstrate the refusal path (host CLI 2.1.314 vs pin 2.1.291) — that is why the hosted run is required.
- **T13 was published by direct commit, not `publish-plan`** (brain#27). Its task file is the planner's own bytes; the SPRINT/ROADMAP diffs were verified purely additive.

## 6. Dead Ends & Traps

- **Trap — a fabricated fixture hid a real bug.** Cycle 1's `exit0-denied-read` test appended a hand-written `permission_denials` line in the shape the parser *expected*. The parser was wrong (`input` vs `tool_input`); the fixture made it look right. When you write an evaluator fixture, capture it from the real CLI. Symptom: a control that passes locally and never fires on a hosted run.
- **Trap — `--test-name-pattern` after the file is silently ignored** on Node 24.14. You will believe you ran one test and actually ran the file. Symptom: every receipt says `tests 5`.
- **Trap — `actions/checkout@v4` wipes the workspace.** Any step that downloads artifacts must run *after* the checkout, or the download is destroyed. `clean: false` does not help when `.git` is absent.
- **Trap — the registry decides the credential first.** With every key absent, all twelve cells read `missing-api-key`; adapter-absence reasons only appear when that harness's binding is present.
- **Dead end — hand-editing runner state to clear an admission refusal.** It fails on later frozen-source checks. brain#23 was the real fix and is now on `main` in the brain clone (`cd4ea6f5e`).
- **Dead end — `publish-plan` for an `add` on an enrolled sprint.** It demands the complete plan projection in the planner's result, byte-bound to the native response; a 154 KB emission came back malformed. Filed as brain#27. The workaround used twice here: commit the planner's files + write the projection into `state.integration.task_plan` by hand, then `reproject` (which is idempotent when the bytes agree).

## 7. Blockers

1. **T14 needs the owner's commit** — the amendment is drafted and validated; only the commit is missing, and the workflow forbids writing it ourselves:

   ```bash
   git add .spec/prds/harness-eval-framework/tasks/sprint-01-evaluator-evidence-spine/PLAN-AMENDMENT-2026-10-30-capture-requiredness.json
   git commit -m "plan(sprint-01): authorize T14 to preserve a denial's requiredness through capture"
   ```

   Without T14, a hosted claude-code cell whose stream carries any optional denial grades `could-not-run requiredness-undeclared` — which is what a real model session often does.
2. **`harness-smoke` credentials** must exist for the dispatch to grade anything keyed (`SMOKE_CLAUDE_KEY` etc. — names only; the environment is reported to already exist).
3. **brain#27** (add on an enrolled sprint cannot be published) and **brain#23** (fixed) — see §8.

## 8. Map — Pointers, Not Payloads

| What | Where |
|---|---|
| Run state (gitignored) | `.kb-run-sprint/sprint-01-evaluator-evidence-spine/state.json` |
| Hosted result, run 41086556471 | `.kb-run-sprint/sprint-01-evaluator-evidence-spine/hosted/run-41086556471/` |
| T13 evidence (cycles + reviewer probes) | `.kb-run-sprint/sprint-01-evaluator-evidence-spine/T13/` |
| T13 contract | `.spec/prds/harness-eval-framework/tasks/sprint-01-evaluator-evidence-spine/TASK-T13.md` |
| T11-FIX2 contract | `…/TASK-T11-FIX2.md` |
| T14 amendment (uncommitted) | `…/PLAN-AMENDMENT-2026-10-30-capture-requiredness.json` |
| Real denial capture fixture | `test/harness/smoke/fixtures/denied-write/` |
| The capture defect | `test/harness/runtime/capture.mjs:182-199` |
| The block it produces | `test/harness/runtime/grade-writer.mjs:95-97` |
| Adapter + invocation table | `test/harness/adapters/claude-code.mjs:79-140` |
| Grader (only place a verdict forms) | `test/harness/graders/fixture-grader.mjs` |
| Workflow | `.github/workflows/harness-eval.yml` |
| Run-skill handoff notes | `.kb-run-sprint/sprint-01-evaluator-evidence-spine/HANDOFF.md` §11a–§11c |
| Brain #23 (admission deadlock, fixed) | https://github.com/hackerpug-ai/brain/issues/23 |
| Brain #27 (add cannot publish) | https://github.com/hackerpug-ai/brain/issues/27 |

## 9. Environment & Bootstrap

**Build**: none. **Test**: `node --test tests/sprint-01/*.test.mjs` (sprint-eval lane, 10 files) · `node --test test/*.test.mjs` (plugin asset tests, 30 files) · `pnpm validate` (workflow/schema/contract/adapter checks).
This session `VERIFIED`: `node --test tests/sprint-01/*.test.mjs` → **103 pass / 0 fail** at `ca14dc9` (CLAIMED by the implementer at `45142ee`; the reviewer re-ran the five frozen checks and the locked trio green at that commit).
**Run**: `gh workflow run harness-eval --repo hackerpug-ai/pixel-perfect`.

Constraints that are not obvious:
- Never commit evidence. `tests/sprint-01` evidence lives under `.kb-run-sprint/…/evidence/` and is gitignored on purpose.
- Do not run the Cursor installer on this Mac — it relinks `~/.local/bin/agent` away from Grok.
- `plugins/pixel-perfect/**` is write-prohibited for every sprint-01 task except by the sprint-05 fix pipeline.

## 10. Evidence Appendix

```text
$ date -u +%Y-%m-%dT%H:%M:%SZ
2026-10-30T22:30:45Z

$ git rev-parse --short HEAD
88e1e82
$ git branch --show-current
main
$ git status --porcelain=v1
?? .spec/prds/harness-eval-framework/tasks/sprint-01-evaluator-evidence-spine/PLAN-AMENDMENT-2026-10-30-capture-requiredness.json
?? .spec/prds/harness-eval-framework/tasks/sprint-01-evaluator-evidence-spine/RESUME.md
$ git log --oneline -15
88e1e82 task(T13): record approved handoff and completion
1b8c5b9 Merge commit '45142ee711db83891a1b559e057fe699de79ba63'
45142ee fix(sprint-01): scan the bytes a leg produced, and prove the producer that ships
ca14dc9 fix(sprint-01): make the smoke matrix observe and export what it grades
b73b44f plan(sprint-01): publish T13, the smoke-observation task (owner-authorized direct publish; brain#27 tracks the publish-plan gap)
8b15772 plan(sprint-01): authorize T13 to make the smoke matrix observe what it grades
0ff5575 task(T11-FIX2): record approved handoff and completion
1acf5a9 Merge commit '63503ce81e70004b0a8a2a1fb73900fcd93c6f2d'
63503ce fix(t11-fix2): reset the workspace before the cells land, and pin both orderings
90b3b50 fix(t11-fix2): produce, require and classify the four control rows
f6e5cae plan(t11-fix): bind every verify to the task's own sprint test
ba17619 plan(t11-fix): scenarios with concrete anchors that pass publication
5ed4bc9 plan(t11-fix): bound the remediation task's write scope to its own contract files
213d47b plan(t11-fix): author the task that produces and validates the controls array
7e08e1a Merge commit '395b371ca36fdc688f6407458e4e10f0e44683bb'

$ git diff --stat        # empty
$ git diff --cached --stat  # empty
$ git stash list         # empty
```

```text
Hosted run 41086556471 (VERIFIED from the downloaded artifact)
run_id: 41086556471
candidate: 0ff55750adc7
pins_sha256: aed5c0c03c0ced2f...
cells: 12  verdicts: {'could-not-run': 12}  reasons: {'smoke-not-implemented': 12}
controls: 4  qualified: 0  verdicts: {'could-not-run': 4}
jobs: 15 total, 14 success, 1 failure (grade recorder — exit 1 because every cell is could-not-run)
artifacts: harness-eval-result-41086556471-1, harness-eval-verify-reports-41086556471-1
```

```text
The capture defect (VERIFIED by reading; reproduced behaviourally by the T13 reviewer, evidence E-19)
test/harness/runtime/capture.mjs:191-193
  if (observation.required_read === true) required = true;
  else if (required_read_paths !== null && observation.target != null) { required = required_read_paths.includes(observation.target); }
  // a mapper-declared `required_read: false` with required_read_paths === null falls through to null
test/harness/runtime/grade-writer.mjs:95-97
  const undeclared = undeclaredDenials(record);
  blocks.push(block("could-not-run", "requiredness-undeclared", { denials: undeclared.length }));
```

```text
Registry precedence (VERIFIED)
test/harness/adapters/registry.mjs:14-19
  1. the invocation-guard's credential check — a missing key is the truth even when the adapter is also absent
  2. adapter absence — a real cell with a named reason
  3. the newest-version lookup
```

```text
Real denial fixture (VERIFIED)
test/harness/smoke/fixtures/denied-write/
  claude-code-denied-write.capture.json   11187 bytes
  claude-code-denied-write.stdout.bin    172589 bytes
  claude-code-denied-write.stderr.bin       153 bytes
  result event carries permission_denials[].tool_input, exit 0, model_request_count 1
```

```text
Worktrees (VERIFIED, truncated to the sprint's own)
/Users/justinrich/Projects/pixel-perfect                                       88e1e82 [main]
.../.kb-run-sprint/worktrees/sprint-01-evaluator-evidence-spine/T1             164d28a [kb-run-sprint/.../T1]
.../T10 d097163 · T11 32d6ca7 · T11-FIX e4848f5 · T11-FIX2 63503ce · T13 (see §4)
plus /private/tmp/{pp-t11-red-base, pp-t4-repro, t10-red, t11-author, t4-redproof-base,
t6-red, t6-red-base-proof, t7-red-base, t7c2/*, t8-red-base} — detached, holding RED evidence
```
