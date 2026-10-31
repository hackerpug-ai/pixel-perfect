---
stability: FEATURE_SPEC
last_validated: 2026-10-30
prd_version: 2.0.0
---

# Team Contributions

`engineering-manager` and `ui-designer` are not on disk. The engineering lens was split across the GitHub Actions planner and the harness-adapter planner. The design lens was told not to invent a screen.

## Phase 1: User Personas

Delivered: `product-manager` and the design lens.

The maintainer reads grades and holds or ships a release. The fix reviewer merges a newest-only pull request and is often the same person. There is no end-user screen.

## Phase 2: Architecture

Delivered: `product-manager` (FR-1 through FR-13), the GitHub Actions lens, and the harness-adapter lens.

The product requirements are the thirteen functional requirements in the staged architecture file. The Actions lens specified the workflow, the result record, the release gate, and the fix pull request. The harness lens specified install and grade behavior for each of the six CLIs, including what is still untested.

Merge note: the October 2026 security control named Read, Edit, and Grep for the fix agent. The Actions lens also named Write and Glob, and a turn cap of 8 and a budget of 2 USD. Those figures are that lens's proposal. They are not an owner decision.

## Phase 3: UI Infrastructure

Delivered: the design lens and an engineering feasibility pass.

There is no navigable UI. A person reads the Actions summary, the verify report file, and the fix pull request. GitHub markdown cannot use color to mean pass or fail. The words pass, fail, and could-not-run have to be written out. A job that fails still looks failed in the checks list, so later checks must not fail the job if they are not a release block.

## Synthesis

Keep one initiative. The later checks stay here because they must report without becoming a release block, and the drift refusal stays here because the maintainer has to tell it apart from a live harness grade. Splitting either one would hide that distinction.

### Product calls

- G1 through G4 stay proposed until the owner confirms them. Do not add goals.
- Cursor is a real channel and is never omitted. Could-not-run is its own result, not a pass and not a graded product failure.
- A graded failure on a pinned version blocks the next release. A graded failure only on the newest version warns and opens a fix. Could-not-run is not that warning path: it blocks on either version and opens no fix.
- A zero exit code is not success and does not clear a block. A denied tool call fails the grade even when the process exited 0.
- Grades come from files and the event stream. The run summary is the place the maintainer reads them. There is no navigable screen.
- The grade is requested nightly at 06:17 UTC (published), by hand (mode selectable, checkout default), and after a push to main when the plugin changes (exact checkout). Actual scheduled start time is recorded, not guaranteed. It does not start on a pull request.
- Each planted/clean verify case names its report path before invocation; the evaluator retains the evidence-bound report even when correct detection earns evaluation pass. The grader does not invent a filename. The report names the harness, pinned or newest, and the planted defect. A missed defect is distinct from could-not-run. The clean twin does not fail.
- A missing credential fails the run and cannot be read as a pass.
- The drift refusal is separate from any live harness result. It still covers manifests, the 11 public skill names, runtime paths, question-shape rules, contract wiring, and package contents. It does not look at pixels, and it does not stand in for a live grade.
- A person merges fix pull requests. Continuous integration never publishes. Merging a newest-only fix does not clear a pinned block.
- List, status, and verify ask nothing; the independent must-ask probe stops at its first question and receives no answer. Later scripted answers use one resume-with-text path for every harness. That path is specified and not yet proven.
- No model judges screenshots. Design fidelity stays out. A missing screenshot score is not a gap.
- The permission stance is not approve-everything. Exact launch flags are not a product feature.
- A finished run files one issue per distinct unexpected failure, unattended, under the owner's standing authorization. The issue follows the change-request format and names the eval to re-run. Filing changes no grade and no release state. See [Failure Issues](09-technical-requirements/11-failure-issues.md).

### Open decisions

- **Whether Cursor may be exempted from the could-not-run release block before a Cursor key and a real headless trial exist.** Recommendation: Do not pick an exemption. Until a key and a real headless trial exist, every Cursor cell is could-not-run, which blocks the release and does not open a fix. The owner has not said to exempt Cursor. Decide by: Only if the owner explicitly exempts Cursor, or after a Cursor key and a real headless trial exist. Not before the first release this grade can block.
- **Whether a newest-version behavior fix may change workflow files or adapter scripts, or must stay inside harness/*.json and skills/**.** Recommendation: Do not widen the allowlist. Research said behavior fixes may need workflows/ and scripts/adapters/, and that claim was not re-checked. Keep the allowlist until that re-check is done. Decide by: Before the first newest-version fix is opened, if that fix cannot be expressed inside harness/*.json and skills/**.
- **Which confirmed goal, if any, the later-report area serves. Decline a change, scripted answers, resume, one full layer, and plain-language command choice are in the confirmed objective and report rather than block, but none of G1 through G4 states that outcome.** Recommendation: Leave the area in scope. Do not add a goal unless the owner confirms one, and do not drop the area to force a match with G1 through G4. Decide by: Before the overview goals are confirmed.
- **Which exact permission flags the live harness commands use.** Recommendation: Leave the flags to engineering. The product stance is only that permission is not approve-everything. Decide by: Before the harness launch commands are written. This is not a product gate.
- **Which confirmed goal, if any, the failure-issues area serves. It is in the objective statement by the owner's instruction, but none of G1 through G4 states that outcome.** Recommendation: Leave the area in scope and add no goal unless the owner confirms one. Decide by: Before the overview goals are confirmed.

## Failure issues: decisions recorded on 2026-10-30

Written in `--update` mode with no specialist lens consulted. It takes an independent read with `/review-red-hat` before the sprint treats it as settled.

**The premise, corrected.** The owner's instruction cited command failures in the development runs. No `fail` verdict has ever been produced on any harness. Across the twenty hosted runs on 2026-10-30, eight were cancelled, four refused with `timestamps-missing`, and eight wrote a result. Five of those read could-not-run on all 48 checks. Three, at `09547bc`, read could-not-run on 46 and `pass` on 2 (`command_list` on both claude-code cells). All fourteen failures in the sprint 1 handoff are evaluator defects, not plugin defects. So a rule that filed only on graded failures would have filed nothing for the runs that motivated it. That is why could-not-run, recorder refusals, and control mismatches also file.

| Decision | Choice | Reason |
|----------|--------|--------|
| Who files | The run files by itself | The owner picked this over a person filing with `/change-request`, and over a new credential to read the private brain repository. It is an explicit exception to that skill's per-issue yes. |
| Where it lands | Sprint 01, through plan amendment T17 | The owner named this sprint. A pinned failure and a could-not-run have no other route to a work item. T14 and T15 are other sessions' amendments. |
| Evidence export | Its own task, T16, before T17 | An issue citing evidence nobody can open is a dead pointer, and real run 41140522995 proves that is today's state. Gate step 8 needs this with or without issues, and TASK-T13.md says it needs its own task. |
| Rerun reference | Required section in every issue | Owner's instruction. |
| Dedupe trust | Only `github-actions[bot]` issues and comments count | This repository is public. A stranger's issue could otherwise silence a finding. |
| Recovery notes | Left out | A person closes an issue with the proof. Add a note when stale open issues get in the way. |

**Where each acceptance criterion gets proven.** UC-ISS-01 AC-1 needs a real graded failure, and none exists yet. Report it deferred at review and prove it on the first real one, or on the staged failure Sprint 05 already asks the owner about. UC-ISS-01 AC-5 needs the DriftRecord in the result (Sprint 03). UC-ISS-05 AC-4 needs later checks (Sprint 06).

**Evaluator facts found while writing this.** `command_list` takes its expected names from the plugin under test, so it does not catch a removed command; the drift proof does. The cell schema allows fewer than four checks. The sprint gate reads `harness-eval-result.json` at the artifact root, but the real file lands at `grade/harness-eval-result.json`, so those gate steps fail as written. The smoke job exports no evidence, so the gate's verify-report step cannot pass.

## Remediation choices accepted on 2026-10-14

The owner chose published-only nightly evaluation and a 36-hour checkout-evidence lifetime. Direct CLI fixing preserves the existing no-GitHub-token model boundary. Allowlist patterns are plugin-root-relative. No Cursor exemption or allowlist expansion was accepted. The original goals remain proposed.

### Accepted remediation decisions (moved from the scope section in 2.0.0)

Nightly runs evaluate only the published plugin, resolved once per run. Plugin pushes evaluate the exact checkout. Manual runs select a mode and default to checkout. Each run retains twelve cells. Candidate release authorization requires the latest trusted complete checkout evaluation for that commit, at most 36 hours old; a newer pending, failed, or cancelled attempt invalidates the older pass. A blocking published observation requires a subsequent qualifying checkout evaluation to clear it. The detailed transition rules are in [API Design](09-technical-requirements/04-api-design.md).

Correct planted-defect detection is an evaluation pass if the clean twin passes and evidence is valid. List, status, and verify ask nothing. The separate initialization question probe stops at its first valid question without an answer. Later scripted-answer checks remain report-only. Structural-only live verification must prove that no image judging occurred, including in child calls.

The existing fix patterns are relative to plugins/pixel-perfect. Resolving that root does not widen the allowlist. A newest failure must reproduce on the recorded main repair base and its exact patch must pass confirmation before a human-reviewable PR exists. Repository enforcement must deny the heal app merge authority. These are specification requirements, not claims of deployed controls.
