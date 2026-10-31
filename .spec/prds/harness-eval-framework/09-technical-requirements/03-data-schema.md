---
stability: CONSTITUTION
last_validated: 2026-10-30
prd_version: 2.0.0
---

# Data Schema

All records are schema-validated before use. Invalid or missing required evidence is could-not-run, never pass. These are planned contracts; no runtime conformance is asserted by this document.

## Run and installation identity

### HarnessPins

Authoritative file: `test/harness/pins.json`, created by this initiative (it does not exist before the evaluator lands) and version-controlled with the evaluator. Pins reconcile with package.json, which independently pins locally-exercised versions (for example @earendil-works/pi-coding-agent): a validation check fails when pins.json and package.json disagree for the same harness, pins.json wins for grading, and an intentional difference is recorded as a named exception inside pins.json. It has one exact CLI version for each of claude-code, codex, grok, opencode, pi, cursor; no ranges, latest aliases, or missing entries. It also records the selected provider/model and the credential environment name per harness. Initial pins and platform support require real runner qualification; historical surveyed versions are not automatically qualified pins. The fixer CLI uses a separate exact version field in this same manifest. The fixer cannot edit this file.

### HarnessEvalResult

- schema: harness-eval-result/v1 (unreleased contract revised with this PRD)
- repository_id, repository_full_name, workflow_id, workflow_path, workflow_source_sha, source_branch
- run_id, run_number, run_attempt, event: schedule|workflow_dispatch|push
- head_sha: workflow commit; candidate_sha: checkout commit or null for published
- install_mode: checkout|published; plugin_requested_ref, plugin_revision, expected_plugin_manifest_sha256
- pins_sha256, resolution_completed_at; versions: requested/resolved CLI versions for all twelve cells
- evaluation_started_at, evaluation_completed_at: GitHub start of the first required smoke job and completion of the last required smoke job, copied by the recorder and checked by the publish gate
- cells[12], later_checks, drift
- release: pinned_blocked, could_not_run_blocked, newest_warning, drift_refused, compatibility_hold_run_ids, evidence_blocked, block_reasons, allowed
- fix: started, reason, pull_request_url

One run, one install mode, twelve unique (harness, track) cells, even when pinned and newest resolve to the same version. A missing or duplicate cell blocks. `release.allowed` is a provisional observation, not a durable publish grant. [API Design](04-api-design.md) owns selection and expiration. Artifact ID/digest, run identity, job timestamps, and status pointer are verified outside the self-reported JSON. GitHub artifact metadata has workflow_run.id, not run_attempt: bind the attempt through the trusted recorder's attempt-qualified physical name, attempt-specific job/upload provenance, and creation-time interval, as API Design requires. Logical artifact harness-eval-result uploads as harness-eval-result-<run_id>-<run_attempt> without overwrite.

### InstallationIdentity

Each cell stores requested_cli_version, resolved_cli_version, observed_cli_version, plugin_revision, expected_plugin_manifest_sha256, observed_plugin_manifest_sha256, loaded_plugin_root, install_mode, and plugin_load_evidence. Resolve moving refs once before fan-out; install the exact resolved versions with auto-updates disabled. Build the expected plugin manifest from sorted relative paths and SHA-256 file contents of the evaluated plugin payload; adapter-generated files require a declared deterministic mapping and separate digests. Exclude only declared harness metadata, never skill/workflow/source files. Record that mapping with the evaluator version. Cache version labels and an install command's exit code are not byte proof. A digest/version/load mismatch is could-not-run (`installation-identity-mismatch`), never attributed to the candidate. No stale-cache or published fallback is allowed.

## Grades and reports

### HarnessCell / HarnessGrade

- harness: claude-code|codex|grok|opencode|pi|cursor
- track: pinned|newest; installation: InstallationIdentity
- invocation_id, check_id, verdict: pass|fail|could-not-run, reason
- process_exit_code: raw status, not authoritative
- checks: command_list, status, verify, question_before_expensive_work
- source: files-and-event-stream; denied_tool_call; evidence_paths; report_paths
- observed_verify_outcome: defect-detected|clean|missed-defect|false-positive|permission-denied|prohibited-mutation|unavailable

The verify grade aggregates the planted and clean invocations. Missing prerequisites, invalid setup, absent required stream mappings, model-call failure, and identity mismatch are could-not-run. Observed denied required reads, prohibited changes, wrong facts, missing the planted defect, and a clean false positive are fail. Aggregate could-not-run before fail before pass, while preserving every constituent result and block reason. A missing case-declared report after an otherwise evaluable run is fail (`report-missing`); unwritable artifact storage or an unsafe case path is could-not-run (`report-unavailable` or `invalid-case-path`). The evaluator must not relabel those setup/storage failures as plugin defects.

| Real verify observations | Evaluation verdict |
|--------------------------|--------------------|
| Planted defect detected with cited evidence, valid report, unchanged protected files, clean twin passes | pass |
| Defect missed, clean false positive, denied required read, or prohibited mutation | fail |
| Required service, plugin identity, valid fixture, or observable event mapping unavailable | could-not-run |

An oracle exit 1 for the planted project is expected. It does not create a pinned block or newest fix. The observed defect and its report remain visible on an evaluation pass.

### VerifyPair / VerifyReport

The case manifest declares these values before either invocation:

- defect_case: verify-button-drift; control_case: verify-clean; overlay: overlays/button-drift
- defect_key: atoms/Button/default; display_name: Button
- platform_arg: --platform web-desktop; verification_scope: structural-only
- oracle_script: verify-catalog.mjs; defect exit 1 with drifted[].key atoms/Button/default; clean exit 0
- gate_path: platforms.web-desktop.gates.molecules; seeded value pending; protected manifest unchanged for planted case
- capture_path: design/.captures/web-desktop/atoms/Button/default.txt
- report_relative_path: reports/verify-button-drift.json (planted), reports/verify-clean.json (clean), each inside its invocation's fresh work directory

The case loader binds these exact relative paths and invocation directories before launch. No glob, discovery, timestamp fallback, or any-new-file fallback is allowed. Reject absolute paths, `..`, symlinks in any ancestor/leaf, and resolved paths outside the invocation directory. Each output is new for that invocation. Upload under invocation-specific artifact paths to avoid collisions.

The deterministic evaluator, with no model credential, owns the report. The plugin supplies observed output and tool evidence, not the evaluator's verdict. Each report contains schema version, run/attempt, invocation_id, case_id, harness, track, installation identity, expected_defect_key, observed_defect_key (nullable), observed_verify_outcome, evaluation_verdict, missed_defect, clean_project_failed, denied_tool_call, process_exit_code, could_not_run_reason, and evidence references (capture path/hash and event byte offsets). Case metadata may label the expected defect but cannot count as detection. Detection must cite actual harness output or a completed verification tool result that the harness invoked. A filename or copied expected key alone cannot pass.

Retain both reports, including correct planted detection on evaluation pass and a clean pass. Never reuse the planted report for the twin. Missing, stale, mismatched, unrelated, or self-asserted evidence cannot satisfy the report contract. Artifact: harness-eval-verify-reports; link exact invocation path from the summary and relevant fix PR.

### StatusCase

Use the real project fixture's existing manifest/inventory schema. Materialize two valid copies with known platform web-desktop, phase, gate values, and nonzero inventory counts. Record the exact expected facts in the case before launch. Change one valid phase/gate fact between copies and keep other facts equal. Require the reply to state the platform, phase, gate state, and inventory counts correctly; wording may vary. Verify protected hashes also remain unchanged. Empty output, generic acknowledgment, fixture instructions to mark pass, and the first fixture's facts repeated on the second all fail. Expected metadata never substitutes for observed output.

### FirstQuestionCase

- check_id: stop-at-first-question; command: init; no quick/automatic-answer options
- fixture: fresh empty project directory without requirements, goal, platform, package, or design manifest
- ask_policy: must-ask; expected question: a goal/platform/initialization decision using the current USER_CHOICE shape
- allowed prefix: reads/listing of the local fixture and installed plugin instructions
- forbidden prefix: external search, installation, rendering, model/subagent dispatch, file creation/edit, or other expensive work
- stop: immediately at first valid question text or question-tool start; send no answer

The independent command-list, status, and both verify invocations have ask_policy ask-nothing. Any question there fails and stops the process. Neither group consumes scripted answers. No question before completion/timeout, malformed question, or expensive work before the question fails the must-ask check when the stream is observable. Incomplete capture is could-not-run. Later scripted-answer cases are separate.

## Canonical stream and capture

### CanonicalEvent

- type: session_started, session_ended, user_message, agent_message, tool_call, tool_result, file_edit, shell_command, permission_request, permission_granted, permission_denied, checkpoint_marker, agent_idle, agent_active, harness_specific
- original_event: lossless raw object or raw line (this spelling is canonical)
- harness, invocation_id, stream_offset, stream_end_offset, sequence, session_id (harness-prefixed)
- agent_message: incremental text and message identity; tool_call: call ID, name, arguments, start phase, classification question|local-read|expensive|image-judge|other
- tool_result: call ID, result/error; permission_denied: call ID, operation, target, required_read
- session_ended: observed stop reason and completeness; child invocation IDs where tools dispatch children

Each supported harness/version must provide a mapping table backed by real captured stdout for all required facts: incremental text, question-tool start, expensive-tool start, required-read denial, native session identity when resumable, and completion. Store capture hashes and source event paths with the table. The existing partial mappings are research leads, not accepted coverage. Preserve unknown lines as harness_specific, but an unknown required fact makes the affected check could-not-run. Final reply files can corroborate content but cannot prove ordering. Do not infer absence of questions, denials, or judging from opaque events or exit 0.

### InvocationCapture / PermissionStance

Capture stdout incrementally by byte offset, with original bytes, final reply when available, hashes, timeout, invocation ID, and before/after fixture manifests. Close stdin. Apply and record a qualified permission stance before any model call. No approve-everything mode is adopted. Capture question and expensive-call starts before waiting for completion; stop at the required boundary. Denied required reads are failures even on exit 0.

A structural-only verification run must exercise the real public verify route and its deterministic catalog check, without image-judge dispatch or model screenshot input anywhere in its child tree. Store tool/model request provenance and capture completeness; inaccessible child activity is could-not-run. Observed image judging is fail even if its score is hidden. If the current plugin cannot provide this bounded structural path, that capability is an implementation prerequisite, not permission to substitute a direct script for the live harness. The separate oracle precheck remains necessary but insufficient.

An intentional question boundary stop is distinct from native completion. InvocationCapture records termination_kind native|boundary-stop|timeout|unexpected, the runner stop reason and signal, boundary_event_offset, prefix_complete, and raw process status. For boundary-stop only, a fully captured valid question event plus a complete prefix through that event is sufficient to grade question ordering without a native session_ended/message_end or stopReason=stop. Do not fabricate such an event. A must-ask probe can pass on that evidence; an ask-nothing check fails on the observed question. Missing bytes/mappings, an unexplained kill, or a model error before the boundary remains could-not-run. This exception cannot turn an unrelated timeout or truncated capture into a pass. It applies consistently to all six adapters, including Pi.

### CommandTranslation / CredentialBinding

The canonical case names list/status/verify/init; each adapter translates to its actual public command and documented argument channel. Unknown translation or permission support is could-not-run until a real runner proves it. Preserve current rejection of bypassPermissions, OpenCode --auto, Cursor --trust/--force, and keyed Grok --trust.

| Harness | Smoke credential binding |
|---------|--------------------------|
| Codex | CODEX_API_KEY |
| Claude Code | ANTHROPIC_API_KEY |
| Grok | XAI_API_KEY |
| Pi | SMOKE_PI_KEY secret to GEMINI_API_KEY, provider google; select and record an available exact Gemini model in pins |
| OpenCode | Selected Anthropic provider to ANTHROPIC_API_KEY; explicit provider/model in pins |
| Cursor | CURSOR_API_KEY |

No key is exposed during install or command listing. Each model subprocess receives only its binding; isolated HOME/config has no login cache, alternate provider secret, or inherited fallback. Negative tests remove the actual consumed key and all allowed alternative credential sources, then assert invocation-guard returns missing-api-key/could-not-run before any model request. Pair with a real successful authenticated call using the same binding. Unsupported credential mapping is a blocker, not an invented success.

## Repair, continuation, and drift

### FixPatch / FixPullRequest

Record source evaluation/run/attempt/failed check IDs, source plugin revision, repair_base_sha (current main resolved once), unpatched reproduction evidence, patch_sha256, confirmation_run_id, and per-check before/after verdicts. A published failure must reproduce on repair_base_sha using the same resolved harness versions before repair starts. Otherwise record not-reproduced and open no PR.

Allowlist root is plugins/pixel-perfect. Repository-relative paths allowed are `plugins/pixel-perfect/harness/*.json` and `plugins/pixel-perfect/skills/**`. Use that one coordinate system throughout. Reject symlinks, mode changes, patches over 100000 bytes, traversal, and changes to tests, fixtures, graders, validators, CI, workflows, adapter scripts, or scripts/release.mjs. The planned harness directory may be absent; do not guess another root or widen scope. Assets and sequencing: unmerged branch 9624a4b (improvement imp-all-6-steps-utilize-github) predates this PRD and carries root-level harness/*.json, probes for five channels, and a gate wired into scripts/release.mjs. It is salvage for probe mechanics only — its root-level harness/ directory, its harness-matrix.yml, and its gate wiring must not land before this build, and the canonical homes remain plugins/pixel-perfect/harness/, test/harness/pins.json, and .github/workflows/harness-eval.yml.

Confirmation uses immutable graders/fixtures from repair_base_sha. Every motivating failure must become pass; every previously passing required check must stay pass; planted detection and clean controls must remain correct; no required check may be could-not-run. Only that exact tested patch may reach branch heal/<run_id>. If main advances before PR creation, stop with base-moved and require a new reproduction/recheck/confirmation; do not rebase silently. PR metadata names harness/track/check/evidence, app ID 5156617, base main, merged_by person, clears_pinned_block false, opened_by_ci_publish false. A no-op, ineffective patch, or regression opens no PR.

### LaterCheckReport / ResumeState

Later names: decline-change, scripted-answers, resume, one-full-layer, plain-language-command-choice. Each stores verdict and blocks_release false. Record harness/native session ID, isolated persistent session directory, fixture identity, start and resumed process IDs, question header, answer, and continuation evidence. Pi later sessions omit --no-session; first checks remain ephemeral. Persist before terminating the first process, resume the same conversation with one plain-text answer, then clean up after evidence capture. Missing state yields could-not-run, never fresh-session fallback. A mismatched scripted answer fails that later check. Exact per-version argv remains unverified until demonstrated against each real CLI.

### DriftRecord

Verdict clear|refused; rules checked: command list, adapters, question rules, manifests, 11 public skill names, runtime paths, question shape, contract wiring, package contents. Store moved rules and looks_at_pixels false. Attach to the result and harness-eval/drift. Repeat locally at publish; neither structural drift nor later reports replace required live grades.

## Failure issues

The finding classes, fingerprints, identity, expected list (`test/harness/issues/expected.json`), allowed text, and receipt (`harness-eval-issues/v1`) are in [Failure Issues](11-failure-issues.md). The receipt is its own artifact and never enters `harness-eval-result`, so issue state cannot reach anything the release gate reads.
