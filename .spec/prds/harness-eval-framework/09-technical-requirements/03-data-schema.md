---
stability: CONSTITUTION
last_validated: 2026-10-13
prd_version: 1.0.0
---

# Data Schema

## Run record

### HarnessEvalResult

- schema harness-eval-result/v1
- run_id
- run_attempt
- head_sha
- base_ref
- event schedule|workflow_dispatch|push
- cells[12]
- later_checks
- drift
- release.pinned_blocked
- release.could_not_run_blocked
- release.newest_warning
- release.drift_refused
- release.allowed
- release.block_reasons
- fix.started
- fix.reason
- fix.pull_request_url

One record per eval run. Artifact harness-eval-result. The pinned commit status points at the run that produced it. The release gate refuses when this record is missing or does not match the publish SHA.

### HarnessCell

- harness claude-code|codex|grok|opencode|pi|cursor
- channel pinned|newest
- version
- grade pass|fail|could-not-run
- could_not_run_reason
- source files-and-event-stream
- process_exit_code not authoritative
- denied_tool_call
- checks.command_list
- checks.status
- checks.verify
- checks.question_before_expensive_work
- verify_report_path
- evidence_paths

Twelve cells belong to one HarnessEvalResult. A newest fail cell may be named in one FixPullRequest. A could-not-run cell blocks release and is not a fix input.

### VerifyReport

- harness
- channel pinned|newest
- version
- planted_defect_name
- project planted|clean
- outcome fail|could-not-run
- could_not_run_reason
- missed_defect
- denied_tool_call
- process_exit_code not authoritative
- clean_project_failed

Required when a cell's verify check is not pass. Uploaded in artifact harness-eval-verify-reports. Linked from the summary and, when verify is the newest failure, from the fix pull request. Not plugin source, so it may name the defect.

### DriftRecord

- verdict clear|refused
- rules command-list, adapters, question-rules, manifests, public-skill-names, runtime-paths, question-shape, contract-wiring, package-contents
- public_skill_names_checked 11
- moved
- looks_at_pixels false

Attached to HarnessEvalResult and to commit status harness-eval/drift. Independent of HarnessCell grades. release.mjs repeats this proof at publish time.

### LaterCheckReport

- name decline-change|scripted-answers|resume|one-full-layer|plain-language-command-choice
- grade pass|fail|could-not-run
- blocks_release false
- scripted_answers_path resume-with-text

Attached to HarnessEvalResult for the summary Reports section only. Does not change release.allowed or harness-eval/pinned.

### FixPatch

- base_sha
- diff
- allowlist harness/*.json and skills/**
- rejected_symlinks
- rejected_mode_changes
- max_bytes 100000
- forbidden_paths tests, fixtures, graders, validators, CI, scripts/release.mjs

Produced by the fix-agent job from newest fail cells. Accepted or rejected by the patch recheck against the base SHA. The confirming run and the pull-request job consume only an accepted patch.

### FixPullRequest

- branch heal/<run_id>
- base main
- app_id 5156617
- newest_failures harness and grade
- summary_url
- verify_report_path
- merged_by person
- clears_pinned_block false
- opened_by_ci_publish false

One pull request per eval run that has at least one newest fail after recheck and confirm. Linked from the run summary. Does not change a pinned fail or a could-not-run into a pass.

## Per-harness grade

### HarnessGrade

- harness: Claude Code, Codex, Grok, OpenCode, Pi, or Cursor
- version: the exact CLI version installed for this run
- track: pinned or newest
- install_mode: published or checkout
- check_id: command-list, status, verify-button-drift, verify-clean, or stop-at-first-question
- verdict: pass, fail, or could-not-run
- reason: missing-api-key, plugin-not-loaded, permission-denied, timeout, stance-not-recorded, report-missing, name-missing, mutated, asked, model-call-failed, or another short cause
- exit_code: stored raw process status, never the verdict
- command_names_found: names parsed by the list probe, extras included
- report_paths: files the grader treated as the verify failure report



### CanonicalEvent

- type: closed enum session_started, session_ended, user_message, agent_message, tool_call, tool_result, file_edit, shell_command, permission_request, permission_granted, permission_denied, checkpoint_marker, agent_idle, agent_active, harness_specific
- original_event: the raw harness object or raw line, kept losslessly
- harness: channel name
- invocation_id: one id for the process and its capture
- stream_offset: byte offset in the stdout capture
- session_id: harness-prefixed id, for example codex:<native-id>, empty when the run has no session



### PermissionStance

- harness
- recorded: false until security records a stance
- adopted_approve_everything: false
- codex_status: --sandbox read-only
- codex_verify: --sandbox workspace-write
- claude_code_candidate: --permission-mode dontAsk and --add-dir of the plugin root, untested
- grok_candidate: an explicit mode other than bypassPermissions, with --allow rules, untested
- opencode_candidate: OPENCODE_PERMISSION explicit rules, untested
- pi: no permission flag and no sandbox
- cursor_candidate: none adopted; --trust and --force are not the stance
- rejected: bypassPermissions, OpenCode --auto, Cursor --trust, Cursor --force, and grok --trust on a keyed step



### VerifyPair

- defect_case: verify-button-drift
- control_case: verify-clean
- overlay: overlays/button-drift
- platform_arg: --platform web-desktop
- oracle_script: verify-catalog.mjs
- oracle_defect_exit: 1
- oracle_clean_exit: 0
- oracle_includes: drifted[].key contains atoms/Button/default
- live_name_required: Button
- gate_path: platforms.web-desktop.gates.molecules
- gate_equals: pending
- gate_file_must_stay_untouched: true
- capture_glob: design/.captures/web-desktop/atoms/Button/default.txt
- report_glob: unset in the worked case; the grader must not invent a filename



### CommandTranslation

- fixture_command: a bare public name such as status or verify
- codex_prompt: single-quoted $pixel-perfect:<name> plus args
- claude_code_prompt: /pixel-perfect:<name> plus args
- grok_prompt: /pixel-perfect:<name> plus args
- pi_prompt: /skill:pixel-perfect-<name> plus args
- opencode_argv: run --command <name>, args channel unknown
- cursor_prompt: /<name> plus args, untested
- ask_policy: ask-nothing for list, status, and verify



### InvocationCapture

- events_path: stdout stream for the run
- reply_path: Codex -o file; other harness reply fields as named in the stream grader
- stdin: closed
- timeout_seconds: the case value for model runs
- workdir: a copy of the fixture, never the fixture source
- before_hash: fixture files after install and before the model run


