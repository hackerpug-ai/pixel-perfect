---
stability: FEATURE_SPEC
last_validated: 2026-10-13
prd_version: 1.0.0
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
- The grade starts nightly at 06:17 UTC, by hand, and after a merge to main when the plugin changes. It does not start on a pull request.
- When verify fails, the failing case names the report path. The grader does not invent a filename. The report names the harness, pinned or newest, and the planted defect. A missed defect is distinct from could-not-run. The clean twin does not fail.
- A missing credential fails the run and cannot be read as a pass.
- The drift refusal is separate from any live harness result. It still covers manifests, the 11 public skill names, runtime paths, question-shape rules, contract wiring, and package contents. It does not look at pixels, and it does not stand in for a live grade.
- A person merges fix pull requests. Continuous integration never publishes. Merging a newest-only fix does not clear a pinned block.
- The first checks ask nothing. Later scripted answers use one resume-with-text path for every harness. That path is specified and not yet proven.
- No model judges screenshots. Design fidelity stays out. A missing screenshot score is not a gap.
- The permission stance is not approve-everything. Exact launch flags are not a product feature.

### Open decisions

- **Whether Cursor may be exempted from the could-not-run release block before a Cursor key and a real headless trial exist.** Recommendation: Do not pick an exemption. Until a key and a real headless trial exist, every Cursor cell is could-not-run, which blocks the release and does not open a fix. The owner has not said to exempt Cursor. Decide by: Only if the owner explicitly exempts Cursor, or after a Cursor key and a real headless trial exist. Not before the first release this grade can block.
- **Whether a newest-version behavior fix may change workflow files or adapter scripts, or must stay inside harness/*.json and skills/**.** Recommendation: Do not widen the allowlist. Research said behavior fixes may need workflows/ and scripts/adapters/, and that claim was not re-checked. Keep the allowlist until that re-check is done. Decide by: Before the first newest-version fix is opened, if that fix cannot be expressed inside harness/*.json and skills/**.
- **Which confirmed goal, if any, the later-report area serves. Decline a change, scripted answers, resume, one full layer, and plain-language command choice are in the confirmed objective and report rather than block, but none of G1 through G4 states that outcome.** Recommendation: Leave the area in scope. Do not add a goal unless the owner confirms one, and do not drop the area to force a match with G1 through G4. Decide by: Before the overview goals are confirmed.
- **Which exact permission flags the live harness commands use.** Recommendation: Leave the flags to engineering. The product stance is only that permission is not approve-everything. Decide by: Before the harness launch commands are written. This is not a product gate.
