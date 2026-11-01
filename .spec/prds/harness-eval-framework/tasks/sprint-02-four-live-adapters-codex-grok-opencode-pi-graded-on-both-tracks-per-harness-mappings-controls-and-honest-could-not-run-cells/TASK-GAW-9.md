# TASK-GAW-9: Keep each cell's captures and reports after the runner is gone, minus anything holding its key

> Task ID: GAW-9
> Sprint: [SPRINT.md](./SPRINT.md)
> Status: Backlog
> Assignee: github-platform-implementer
> Priority: P0
> Points: 5
> Type: FEATURE
> Planner: github-agentic-workflow-planner
> Reviewer: github-agentic-workflow-reviewer
> Proposed By: github-agentic-workflow-planner
> Wave: C
> TDD_MODE: red_first · RED_GREEN_REQUIRED: true

AGENT: planner=github-agentic-workflow-planner | implementer=github-platform-implementer | reviewer=github-agentic-workflow-reviewer

## Background

- **Problem:** the smoke job uploads `cell/cell.json` alone, so a cited capture dies with the runner. Run 41140522995 shows each cell artifact holding `cell.json` only and the verify reports index reading `reports: []`.
- **Contract:** `09-technical-requirements/11-failure-issues.md`, section Evidence must outlive the runner. ROADMAP D-04 approves publishing raw streams and reports for 90 days on this public repository, after a key scan.
- **Source:** scope (a) to (d) of the untracked `PLAN-AMENDMENT-2026-10-30-evidence-export.json`, which no task owns. That amendment calls this T16, but the published T16 is different work.
- **Gate steps that exercise this task:** 10, 16, 17, 18, 19, 20, 21, 22. Capability: CAP-EVAL-01.

## Critical Constraints

- **MUST:** This is a one-way door on a public repository, and the owner approved publishing with this scan. The scan must run before anything is uploaded, and it must fail closed. export.mjs copies each scanned clean file into cell/export.partial and renames that to cell/export only after every file is scanned. Only cell/export is uploaded, so a crash uploads nothing. It deletes nothing.
- **MUST:** Only a keyed step holds the key, and test/harness/ENVIRONMENT.md forbids a second step from holding it. So each keyed step body sets trap 'node test/harness/smoke/export.mjs <harness> --cell-dir cell || true' EXIT right after set -eu. That runs on a non-zero exit, and after the denied-write probe in any keyed step that runs one.
- **MUST:** The scan reads the binding name from pins.json and the value from the step env. It compares raw bytes against the value and its base64 form. It never prints or stores the value. An empty value means nothing to compare. Ceiling: it cannot catch a key the model altered, and a runner holds no other key by design.
- **MUST:** A file that matches is not copied, and cell/export/withheld.json names its path. A check left with no evidence reads could-not-run evidence-withheld, and the cell aggregate is recomputed. If cell.json itself matches, it is replaced by a bare could-not-run record with reason evidence-withheld.
- **MUST:** A test that sets a key uses a placeholder, and starts children from an empty env plus an allowlist.

## Specification

- **Objective:** Every cell leaves a scanned evidence artifact whose cited paths open from the artifact root, and no uploaded file holds the key its step held.
- **Success state:** After `export.mjs` runs, each cited path in `cell.json` resolves under `cell/export`, and a file holding the key is absent and named in `withheld.json`. Each keyed step exports through a trap on exit, including a failing step. Two new uploads ship only `cell/export/` and `cell/export/reports/`.

Contract details:

- export.mjs ships every path in the cell's report_paths, including reports/denied-write-probe.json, because E2 writes each report in its invocation directory. A report under cell/evidence/reports/ exports with the rest of that tree and keeps its relative path. An absolute path outside cell/evidence that still exists lands at reports/<file name>. A path that no longer exists is matched by file name under cell/evidence/reports/. Every report is scanned like a capture. One it cannot find is dropped from report_paths, because the grade already reads report-missing.
- Add one upload to jobs.smoke with if: always(), name harness-eval-evidence-${{ github.run_id }}-${{ github.run_attempt }}-${{ matrix.harness }}-${{ matrix.track }}, path cell/export/, retention-days 90, overwrite false, if-no-files-found warn. The cell upload stays exactly cell/cell.json.
- Add a second upload, harness-eval-verify-${{ github.run_id }}-${{ github.run_attempt }}-${{ matrix.harness }}-${{ matrix.track }}, path cell/export/reports/, same settings. In jobs.grade change the download pattern to harness-eval-verify-${{ github.run_id }}-${{ github.run_attempt }}-*. The old pattern also matches an earlier attempt's harness-eval-verify-reports bundle. writeVerifyReceipt walks whatever arrives, so the recorder and tests/sprint-01/grd-01-twelve-cells.test.mjs lines 771-777 need no edit.
- export.mjs rewrites evidence_paths, checks[].evidence_paths and report_paths in cell.json so they are relative to the artifact root, for example status-a/captures/x.capture.json and reports/verify-button-drift/verify-button-drift.json, and drops any path it did not copy. Skipped: the capture_path on the missing-key row's local half stays a runner path, because that keyless step runs after the export and its capture holds no stream. Add it when a reader needs to open it.
- The superseded test is tests/sprint-01/t11-controls-wiring.test.mjs lines 296-302, which asserts every smoke upload ships cell/cell.json. Narrow it to uploads named harness-eval-cell-. Change nothing else in that file.
- Sprint 01's gate text still says reports/verify-button-drift.json at the artifact root and harness-eval-result.json at the root. Both are wrong, and that text is sprint 01's to correct.

## Acceptance Criteria (GIVEN-WHEN-THEN)

### AC-1: Every path a cell cites opens from the exported tree, including a report outside the evidence dir [PRIMARY]

- **GIVEN:** a real keyless claude-code leg's cell dir, with one report outside `cell/evidence` and one `report_paths` entry naming a missing file
- **WHEN:** `export.mjs` runs with no binding in the env, and each cited path in `cell.json` is joined to `cell/export`
- **THEN:** 100% of `evidence_paths` and `report_paths` entries resolve with 0 misses, `report_paths` holds `reports/denied-write-probe.json`, the missing entry is gone, and no entry starts with `/` or `cell/`

```text
FLOW_REF:              null
TEST_TIER:             integration
VERIFICATION_SERVICE:  real export module over a real keyless leg's files on disk
SURFACE_POLICY:        null
TDD_STATE:             none
TEST_FILE:             tests/sprint-02/evidence-export.test.mjs
TEST_FUNCTION:         EVIDENCE-EXPORT-PATHS
VERIFY:                node --test --test-name-pattern 'EVIDENCE-EXPORT-PATHS' tests/sprint-02/evidence-export.test.mjs
```

SCENARIO_SUMMARY: A real leg's every cited path opens from the export tree, including a report that lived outside it.

### AC-2: A capture or report holding the key never reaches the upload, and the cell says so [PRIMARY]

- **GIVEN:** real captures with one holding the literal placeholder, and a report holding it outside `cell/evidence`
- **WHEN:** `export.mjs` runs with the binding env set to the placeholder, the tree is searched for the placeholder and its base64 form, and it runs again with an unreadable file in `cell/evidence`
- **THEN:** 0 files under `cell/export` hold it, `withheld.json` lists 2 paths, the affected check reads `could-not-run` `evidence-withheld`, and the unreadable run leaves no `cell/export`

```text
FLOW_REF:              null
TEST_TIER:             integration
VERIFICATION_SERVICE:  real export module over real captures from a real child process
SURFACE_POLICY:        null
TDD_STATE:             none
TEST_FILE:             tests/sprint-02/evidence-export.test.mjs
TEST_FUNCTION:         EVIDENCE-EXPORT-WITHHOLDS-KEY
VERIFY:                node --test --test-name-pattern 'EVIDENCE-EXPORT-WITHHOLDS-KEY' tests/sprint-02/evidence-export.test.mjs
```

SCENARIO_SUMMARY: A placeholder key in a capture and a report: both withheld and named, the check says so, and a scan failure uploads nothing.

### AC-3: The workflow exports on a failing step, and uploads only the scanned tree [PRIMARY]

- **GIVEN:** the real `harness-eval.yml`
- **WHEN:** its `jobs.smoke` is parsed, and a keyed body's trap line runs in bash in a sandbox cell dir before the shell exits 7
- **THEN:** 5 keyed steps hold the trap line, uploads `harness-eval-evidence-` and `harness-eval-verify-` carry `github.run_attempt` and ship paths under `cell/export/`, `harness-eval-cell-` still ships `cell/cell.json`, and the shell exits 7 with `cell/export` present

```text
FLOW_REF:              null
TEST_TIER:             integration
VERIFICATION_SERVICE:  the real workflow file and a real bash run of its trap line
SURFACE_POLICY:        null
TDD_STATE:             none
TEST_FILE:             tests/sprint-02/evidence-export.test.mjs
TEST_FUNCTION:         EVIDENCE-EXPORT-WORKFLOW
VERIFY:                node --test --test-name-pattern 'EVIDENCE-EXPORT-WORKFLOW' tests/sprint-02/evidence-export.test.mjs
```

SCENARIO_SUMMARY: The real workflow exports on a failing step, and its uploads ship only the scanned tree.

Each AC's RED input and positive example are in its row of the contract block below.

## Test Criteria

Each TC runs its mapped AC's VERIFY.

| ID | Statement | Maps to |
|---|---|---|
| TC-1 | 100% of `evidence_paths` entries resolve under `cell/export` when `export.mjs` finishes | AC-1 |
| TC-2 | No `cell.json` path starts with `/` when `export.mjs` finishes | AC-1 |
| TC-3 | `report_paths` holds `reports/denied-write-probe.json` when that report sits outside `cell/evidence` | AC-1 |
| TC-4 | 0 files under `cell/export` hold the placeholder when a capture holding it was scanned | AC-2 |
| TC-5 | The affected check reads reason `evidence-withheld` when its only capture was withheld | AC-2 |
| TC-6 | No `cell/export` directory exists when the scan meets an unreadable file | AC-2 |
| TC-7 | All 5 keyed model steps hold the `export.mjs` trap line when the workflow is parsed | AC-3 |
| TC-8 | `cell/export` exists when the shell running the trap line exits 7 | AC-3 |
| TC-9 | No upload path names `cell/evidence` when `jobs.smoke` is parsed | AC-3 |

## Reading List

1. `.github/workflows/harness-eval.yml` lines 280-291: the cell upload and why it ships one file
2. `.github/workflows/harness-eval.yml` lines 456-463: the verify download that matches nothing today
3. `.github/workflows/harness-eval.yml` lines 116-160: the claude-code keyed step, its early exit and its probe
4. `test/harness/recorder.mjs` lines 155-178: writeVerifyReceipt
5. `tests/sprint-01/t11-controls-wiring.test.mjs` lines 290-306: the upload assertion this narrows
6. `.spec/prds/harness-eval-framework/09-technical-requirements/11-failure-issues.md` lines 145-156: the contract
7. `.spec/prds/harness-eval-framework/tasks/sprint-01-evaluator-evidence-spine/PLAN-AMENDMENT-2026-10-30-evidence-export.json` lines 1-14: scope (a) to (d)

Standards: `AGENTS.md`, `brain/docs/kanban/SCENARIO-CONTRACT-V1.md`.

## Guardrails

WRITE-ALLOWED:

- .github/workflows/harness-eval.yml (MODIFY)
- test/harness/smoke/export.mjs (NEW)
- tests/sprint-02/evidence-export.test.mjs (NEW)
- tests/sprint-01/t11-controls-wiring.test.mjs (MODIFY)

WRITE-PROHIBITED:

- test/harness/recorder.mjs - `writeVerifyReceipt` already walks what arrives
- tests/sprint-01/grd-01-twelve-cells.test.mjs - no edit needed
- test/harness/smoke/cell.mjs - GAW-1, E1, E2 and E9 own it
- .spec/** - sprint 01's gate text is sprint 01's to correct
- Any file not listed in WRITE-ALLOWED

SUPERSEDES:

- tests/sprint-01/t11-controls-wiring.test.mjs

## Code Pattern

```yaml
# Shape in each keyed step, right after set -eu:
run: |
  set -eu
  trap 'node test/harness/smoke/export.mjs <harness> --cell-dir cell || true' EXIT

# Upload added to jobs.smoke. Source for its settings: harness-eval.yml:280-291.
- name: Upload this cell's scanned evidence
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: harness-eval-evidence-${{ github.run_id }}-${{ github.run_attempt }}-${{ matrix.harness }}-${{ matrix.track }}
    path: cell/export/
    if-no-files-found: warn
    retention-days: 90
    overwrite: false
```

- **Anti-pattern:** A second step holding the key; an upload of `cell/evidence`; printing or storing the key's value; deleting a file to hide it; copying files into `cell/export` before the whole scan has passed.

## Design

None. This task has no UI surface.

## Agent Instructions

Work AC-1 to AC-3 in order, one RED, GREEN, REFACTOR cycle each. Tests use `sk-test-placeholder-not-a-key` and no other key value, and start children from an empty env plus an allowlist. Never read a real secret value to test this scan.

## Orchestrator Verification Protocol

1. **VERIFY_RED:** each VERIFY fails on base for the reason its RED names.
2. **VERIFY_GREEN:** each VERIFY exits 0.
3. Run every Evidence Gate and compare with Expected.
4. `git diff --name-only` lists only WRITE-ALLOWED paths.
5. Dispatch `github-agentic-workflow-reviewer` with this file, the RED and GREEN output, and the evidence.

## Agent Assignment

- **Planner:** `github-agentic-workflow-planner`
- **Implementer:** `github-platform-implementer`
- **Reviewer:** `github-agentic-workflow-reviewer`
- **Rationale:** `github-platform-implementer` owns artifact uploads and retention on this repository. `github-agentic-workflow-reviewer` audits what leaves the runner and whether the scan fails closed.

## Evidence Gates

Every VERIFY above exits 0, then:

- **tests:** `node --test tests/sprint-02/evidence-export.test.mjs`. Expected: exit 0 with 3 passing tests
- **superseded-sprint-01:** `node --test tests/sprint-01/t11-controls-wiring.test.mjs tests/sprint-01/grd-01-twelve-cells.test.mjs`. Expected: exit 0: the narrowed upload assertion and the recorder's walk both hold
- **validate:** `pnpm validate`. Expected: exit 0

## Review Criteria

Must pass:

- One test per AC, named exactly as its TEST_FUNCTION.
- Only `cell/export` is uploaded, and it appears only through the final rename.
- The scan compares raw bytes against the value and its base64 form.
- No output, log or file holds the value.
- The cell upload still ships exactly `cell/cell.json`.

Should verify:

- `jobs.grade`'s pattern is attempt-qualified and cannot match an earlier attempt's bundle.
- The t11 edit touches only lines 296-302.
- A report is scanned the same way as a capture.

Verdict: APPROVED or NEEDS_FIXES, with file and line for each finding.

## Dependencies

- **Depends on:** GAW-1 (the report copy the shared loop leaves under the evidence dir before it removes its work dirs)
- **Blocks:** E4, E5, E6, E7, E8

## Notes

- **Flows:** owns no locked flow. All three ACs are task-local; gate steps 10, 16 to 22 read this artifact on a hosted run.
- **Drops if:** sprint 01 lands the same export first. Then this task drops, and the gate steps read that artifact unchanged.
- **Provenance:** .spec/prds/harness-eval-framework/tasks/sprint-01-evaluator-evidence-spine/PLAN-AMENDMENT-2026-10-30-evidence-export.json#items[0]

<!-- REQUIREMENT-CONTRACT v1 -->
<!--
{"version":"1","task_id":"GAW-9","task_type":"FEATURE","tdd_mode":"red_first","verification_policy":{"requires_tests":true,"requires_red_evidence":true,"requires_seeded_evidence":true},"guardrails":{"write_allowed":[".github/workflows/harness-eval.yml (MODIFY)","test/harness/smoke/export.mjs (NEW)","tests/sprint-02/evidence-export.test.mjs (NEW)","tests/sprint-01/t11-controls-wiring.test.mjs (MODIFY)"],"write_prohibited":["test/harness/recorder.mjs - `writeVerifyReceipt` already walks what arrives","tests/sprint-01/grd-01-twelve-cells.test.mjs - no edit needed","test/harness/smoke/cell.mjs - GAW-1, E1, E2 and E9 own it",".spec/** - sprint 01's gate text is sprint 01's to correct","Any file not listed in WRITE-ALLOWED"]},"fixtures":{"seed/keyless-leg":{"description":"A cell dir produced by a real keyless claude-code leg through runCell, holding real captures under cell/evidence and a real cell.json","seed_method":"cli","records":["10 evidence paths under cell/evidence in cell.json"]},"seed/capture-holding-key":{"description":"A real node child run through createCapture and spawnCaptured that prints its placeholder binding value on stdout, persisted beside a second capture that does not","seed_method":"cli","records":["2 captures under cell/evidence, one holding the literal placeholder sk-test-placeholder-not-a-key"]},"seed/real-workflow-file":{"description":"The real harness-eval.yml, whose keyed step trap line is executed in a sandbox cell dir by a shell that then exits 7","seed_method":"cli","records":["5 keyed model steps and 1 cell upload in jobs.smoke"]}},"verification_gates":[{"gate":"tests","command":"node --test tests/sprint-02/evidence-export.test.mjs","expected":"exit 0 with 3 passing tests","positive_example":"all three EVIDENCE-EXPORT tests pass on real captures and the real workflow file"},{"gate":"superseded-sprint-01","command":"node --test tests/sprint-01/t11-controls-wiring.test.mjs tests/sprint-01/grd-01-twelve-cells.test.mjs","expected":"exit 0: the narrowed upload assertion and the recorder's walk both hold","positive_example":"both sprint-01 files pass with the two new uploads present"},{"gate":"validate","command":"pnpm validate","expected":"exit 0","positive_example":"every repo validator prints its pass line"}],"integration_obligations":[],"requirements":[{"id":"AC-1","type":"acceptance_criterion","primary":true,"description":"GIVEN a real keyless claude-code leg's cell dir, with one report outside `cell/evidence` and one `report_paths` entry naming a missing file WHEN `export.mjs` runs with no binding in the env, and each cited path in `cell.json` is joined to `cell/export` THEN 100% of `evidence_paths` and `report_paths` entries resolve with 0 misses, `report_paths` holds `reports/denied-write-probe.json`, the missing entry is gone, and no entry starts with `/` or `cell/`","flow_ref":null,"test_file":"tests/sprint-02/evidence-export.test.mjs","test_function":"EVIDENCE-EXPORT-PATHS","verify":"node --test --test-name-pattern 'EVIDENCE-EXPORT-PATHS' tests/sprint-02/evidence-export.test.mjs","test_tier":"integration","verification_service":"real export module over a real keyless leg's files on disk","surface_policy":null,"positive_example":"After export, each of the cell's evidence paths joined to cell/export resolves to a file with the same digest as its source, and a report_paths entry naming reports/denied-write-probe.json in a temp invocation dir resolves at cell/export/reports/denied-write-probe.json.","red":"On base test/harness/smoke/export.mjs does not exist, and the cell's paths read cell/evidence/... and /tmp/..., so joining them to an artifact root opens nothing.","maps_to_ac":null,"scenario":{"tier":"visible","test_tier":"integration","verification_service":"real export module over a real keyless leg's files on disk","topology":"single-node","negative_control":{"would_fail_if":["paths stay absolute or stay rooted at cell/","a file is omitted from the copy while the cell still cites it","a report outside cell/evidence is omitted from the export","the rename is removed, so a partial tree is left at cell/export"]},"evidence":{"forms":["file_artifact"],"examples":["cell.json and the cell/export tree"],"required_capture":true},"build_proof":{"range":"anything that proves a reader holding only the artifact can open every path the cell record cites","examples":["relative paths plus a copy into one export root"]},"cases":[{"start_ref":"seed/keyless-leg","action":{"actor":"runner","steps":["write reports/denied-write-probe.json in a temp invocation dir and add that absolute path to the cell's report_paths","add a second report_paths entry naming a file that does not exist","run export.mjs on the cell dir with no binding in the env","join each cited path in cell.json to cell/export"]},"end_state":{"must_observe":["100% of `evidence_paths` and `report_paths` entries resolve to a file, with 0 misses","`report_paths` holds `reports/denied-write-probe.json`, and the missing file's entry is gone","no entry starts with `/` or `cell/`","`cell/cell.json` still parses with 4 checks"],"must_not_observe":["an absolute `/tmp` path in `report_paths`","an empty cell/export directory"]}}]}},{"id":"AC-2","type":"acceptance_criterion","primary":true,"description":"GIVEN real captures with one holding the literal placeholder, and a report holding it outside `cell/evidence` WHEN `export.mjs` runs with the binding env set to the placeholder, the tree is searched for the placeholder and its base64 form, and it runs again with an unreadable file in `cell/evidence` THEN 0 files under `cell/export` hold it, `withheld.json` lists 2 paths, the affected check reads `could-not-run` `evidence-withheld`, and the unreadable run leaves no `cell/export`","flow_ref":null,"test_file":"tests/sprint-02/evidence-export.test.mjs","test_function":"EVIDENCE-EXPORT-WITHHOLDS-KEY","verify":"node --test --test-name-pattern 'EVIDENCE-EXPORT-WITHHOLDS-KEY' tests/sprint-02/evidence-export.test.mjs","test_tier":"integration","verification_service":"real export module over real captures from a real child process","surface_policy":null,"positive_example":"With the placeholder bound, the capture and the report holding it are absent from cell/export, withheld.json names both paths, the check reads could-not-run evidence-withheld, and a grep of cell/export for the placeholder and its base64 form finds 0 files.","red":"On base nothing scans or withholds, so a tree copied for upload holds the placeholder and the grep assertion finds it.","maps_to_ac":null,"scenario":{"tier":"visible","test_tier":"integration","verification_service":"real export module over real captures from a real child process","topology":"single-node","negative_control":{"would_fail_if":["the scan is removed and every capture is copied","the scan runs only on stdout, so the same value in stderr or cell.json is omitted","a report read from outside cell/evidence skips the scan and is copied unchecked","a scan crash leaves a tree at cell/export"]},"evidence":{"forms":["file_artifact","stdout"],"examples":["withheld.json with a path and no value"],"required_capture":true},"build_proof":{"range":"anything that proves the upload tree cannot hold the value of the key its own step held","examples":["a byte comparison before each copy, with an atomic rename at the end"]},"cases":[{"start_ref":"seed/capture-holding-key","action":{"actor":"runner","steps":["write a report holding the placeholder in a temp invocation dir and name it in the cell's report_paths","run export.mjs with the binding env set to the placeholder","grep the cell/export tree for the placeholder and its base64 form","run it again with an unreadable file in cell/evidence"]},"end_state":{"must_observe":["0 files under cell/export hold `sk-test-placeholder-not-a-key`","`withheld.json` lists 2 paths and the clean capture is copied","the affected check reads `could-not-run` with reason `evidence-withheld`","the unreadable run leaves no `cell/export` directory"],"must_not_observe":["the placeholder in stdout or in withheld.json","an empty withheld.json on the first run"]}}]}},{"id":"AC-3","type":"acceptance_criterion","primary":true,"description":"GIVEN the real `harness-eval.yml` WHEN its `jobs.smoke` is parsed, and a keyed body's trap line runs in bash in a sandbox cell dir before the shell exits 7 THEN 5 keyed steps hold the trap line, uploads `harness-eval-evidence-` and `harness-eval-verify-` carry `github.run_attempt` and ship paths under `cell/export/`, `harness-eval-cell-` still ships `cell/cell.json`, and the shell exits 7 with `cell/export` present","flow_ref":null,"test_file":"tests/sprint-02/evidence-export.test.mjs","test_function":"EVIDENCE-EXPORT-WORKFLOW","verify":"node --test --test-name-pattern 'EVIDENCE-EXPORT-WORKFLOW' tests/sprint-02/evidence-export.test.mjs","test_tier":"integration","verification_service":"the real workflow file and a real bash run of its trap line","surface_policy":null,"positive_example":"Two new uploads ship cell/export/ and cell/export/reports/ with attempt-qualified names and if: always(); the cell upload still ships cell/cell.json; a shell running the trap line and exiting 7 still leaves cell/export.","red":"On base jobs.smoke has one upload, no keyed step sets a trap, and the grade job's pattern is harness-eval-verify-*.","maps_to_ac":null,"scenario":{"tier":"visible","test_tier":"integration","verification_service":"the real workflow file and a real bash run of its trap line","topology":"single-node","negative_control":{"would_fail_if":["the trap is omitted from a keyed step, so a failing step exports nothing","an upload ships cell/evidence, so unscanned bytes leave the runner","a secret is added to an upload step","the grade pattern stays broad, so it matches an earlier attempt's bundle"]},"evidence":{"forms":["file_artifact","stdout"],"examples":["the parsed jobs.smoke steps"],"required_capture":true},"build_proof":{"range":"anything that proves the upload path is the scanned tree and that the export runs however the keyed step ends","examples":["a trap on EXIT in each keyed body"]},"cases":[{"start_ref":"seed/real-workflow-file","action":{"actor":"runner","steps":["parse the real workflow file","run a keyed body's trap line in bash in a sandbox cell dir, then exit 7"]},"end_state":{"must_observe":["5 keyed model steps hold the `export.mjs` trap line","uploads named `harness-eval-evidence-` and `harness-eval-verify-` carry `github.run_attempt` and ship paths under `cell/export/`","the upload named `harness-eval-cell-` still ships `cell/cell.json`","the shell exits 7 and `cell/export` exists"],"must_not_observe":["an upload path of `cell/evidence`","`secrets.` on an upload step","an empty cell/export after the exit"]}}]}},{"id":"TC-1","type":"test_criterion","description":"100% of `evidence_paths` entries resolve under `cell/export` when `export.mjs` finishes","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'EVIDENCE-EXPORT-PATHS' tests/sprint-02/evidence-export.test.mjs","positive_example":"After export, each of the cell's evidence paths joined to cell/export resolves to a file with the same digest as its source, and a report_paths entry naming reports/denied-write-probe.json in a temp invocation dir resolves at cell/export/reports/denied-write-probe.json."},{"id":"TC-2","type":"test_criterion","description":"No `cell.json` path starts with `/` when `export.mjs` finishes","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'EVIDENCE-EXPORT-PATHS' tests/sprint-02/evidence-export.test.mjs","positive_example":"After export, each of the cell's evidence paths joined to cell/export resolves to a file with the same digest as its source, and a report_paths entry naming reports/denied-write-probe.json in a temp invocation dir resolves at cell/export/reports/denied-write-probe.json."},{"id":"TC-3","type":"test_criterion","description":"`report_paths` holds `reports/denied-write-probe.json` when that report sits outside `cell/evidence`","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'EVIDENCE-EXPORT-PATHS' tests/sprint-02/evidence-export.test.mjs","positive_example":"After export, each of the cell's evidence paths joined to cell/export resolves to a file with the same digest as its source, and a report_paths entry naming reports/denied-write-probe.json in a temp invocation dir resolves at cell/export/reports/denied-write-probe.json."},{"id":"TC-4","type":"test_criterion","description":"0 files under `cell/export` hold the placeholder when a capture holding it was scanned","maps_to_ac":"AC-2","verify":"node --test --test-name-pattern 'EVIDENCE-EXPORT-WITHHOLDS-KEY' tests/sprint-02/evidence-export.test.mjs","positive_example":"With the placeholder bound, the capture and the report holding it are absent from cell/export, withheld.json names both paths, the check reads could-not-run evidence-withheld, and a grep of cell/export for the placeholder and its base64 form finds 0 files."},{"id":"TC-5","type":"test_criterion","description":"The affected check reads reason `evidence-withheld` when its only capture was withheld","maps_to_ac":"AC-2","verify":"node --test --test-name-pattern 'EVIDENCE-EXPORT-WITHHOLDS-KEY' tests/sprint-02/evidence-export.test.mjs","positive_example":"With the placeholder bound, the capture and the report holding it are absent from cell/export, withheld.json names both paths, the check reads could-not-run evidence-withheld, and a grep of cell/export for the placeholder and its base64 form finds 0 files."},{"id":"TC-6","type":"test_criterion","description":"No `cell/export` directory exists when the scan meets an unreadable file","maps_to_ac":"AC-2","verify":"node --test --test-name-pattern 'EVIDENCE-EXPORT-WITHHOLDS-KEY' tests/sprint-02/evidence-export.test.mjs","positive_example":"With the placeholder bound, the capture and the report holding it are absent from cell/export, withheld.json names both paths, the check reads could-not-run evidence-withheld, and a grep of cell/export for the placeholder and its base64 form finds 0 files."},{"id":"TC-7","type":"test_criterion","description":"All 5 keyed model steps hold the `export.mjs` trap line when the workflow is parsed","maps_to_ac":"AC-3","verify":"node --test --test-name-pattern 'EVIDENCE-EXPORT-WORKFLOW' tests/sprint-02/evidence-export.test.mjs","positive_example":"Two new uploads ship cell/export/ and cell/export/reports/ with attempt-qualified names and if: always(); the cell upload still ships cell/cell.json; a shell running the trap line and exiting 7 still leaves cell/export."},{"id":"TC-8","type":"test_criterion","description":"`cell/export` exists when the shell running the trap line exits 7","maps_to_ac":"AC-3","verify":"node --test --test-name-pattern 'EVIDENCE-EXPORT-WORKFLOW' tests/sprint-02/evidence-export.test.mjs","positive_example":"Two new uploads ship cell/export/ and cell/export/reports/ with attempt-qualified names and if: always(); the cell upload still ships cell/cell.json; a shell running the trap line and exiting 7 still leaves cell/export."},{"id":"TC-9","type":"test_criterion","description":"No upload path names `cell/evidence` when `jobs.smoke` is parsed","maps_to_ac":"AC-3","verify":"node --test --test-name-pattern 'EVIDENCE-EXPORT-WORKFLOW' tests/sprint-02/evidence-export.test.mjs","positive_example":"Two new uploads ship cell/export/ and cell/export/reports/ with attempt-qualified names and if: always(); the cell upload still ships cell/cell.json; a shell running the trap line and exiting 7 still leaves cell/export."}]}
-->
