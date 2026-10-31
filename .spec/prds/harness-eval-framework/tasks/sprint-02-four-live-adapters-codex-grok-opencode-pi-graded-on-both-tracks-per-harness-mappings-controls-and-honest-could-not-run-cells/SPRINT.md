---
sequence: 2
timeline: Phase 2
status: planned
sprint_id: sprint-02-four-live-adapters-codex-grok-opencode-pi-graded-on-both-tracks-per-harness-mappings-controls-and-honest-could-not-run-cells
prd: ../..
planned_from_roadmap_sha: 447248ee1a4b127c7b58c8e5913471401e585b7b33d22ec013dd3bf594a32957
planned_from_source_sha: c5c927280e0a69734e53204388126e4936ba0b4e
planned_from_source_kind: git-head
planned_at: 2026-10-31
integration_schedule:
  version: "1"
---

# Sprint 2: Four live adapters: Codex, Grok, OpenCode, Pi graded on both tracks; per-harness mappings, controls, and honest could-not-run cells

**Status:** Planned
**Sequence:** 2
**Timeline:** Phase 2

## Overview

Committed in ROADMAP.md as Sprint 02. Four harness adapters plus the live grading path they need: the hosted run did not reach the sprint-01 grader, so this sprint wires it in, then adds Codex, Grok, OpenCode and Pi, each with a qualified stream mapping. This sprint runs only after sprint 01's gate is verified, because that gate's step 9 needs these four harnesses to read could-not-run (ROADMAP D-07).

Flow lock: `human-flows.json` beside this file (4 task-scope flows; 1 journey deferred to a later sprint).

## Human Testing Gate

**Gate:** Done means one hand dispatch grades command_list, status, planted-defect verify, and question_before_expensive_work from real event streams for Claude Code, Codex, Grok, OpenCode, and Pi on pinned and newest — Cursor remaining could-not-run by design — with every unqualified mapping reported as could-not-run with a stream-mapping reason instead of an omission, proven by jq over the result artifact showing four check verdicts with evidence paths in all ten keyed cells plus a per-harness missing-key control and an exit0-denied-read control that yields fail on a cell whose process_exit_code is 0.

**Entrypoint:** gh workflow run harness-eval --repo hackerpug-ai/pixel-perfect, read via the run's harness-eval-result artifact (surfaces 1 and 2)

**Shape:** product

**Before:** Run 41249460968 on hackerpug-ai/pixel-perfect at 36e864a (workflow_dispatch, conclusion failure) records twelve cells, and all twelve read could-not-run. codex, grok, opencode and pi read `<harness>-adapter-not-implemented` on all 32 of their check rows. Both cursor cells read `missing-api-key`. claude-code pinned at 2.1.291 reads command_list pass, status pass, verify fail report-missing and question_before_expensive_work could-not-run required-fact-unobserved; claude-code newest observes 2.1.316 with the same four rows and cell reason installation-identity-mismatch. 0 of the 40 keyed check rows carry evidence_paths, harness-eval-verify-reports holds INDEX.json with `reports: []`, and only the two claude-code cells carry control_observations.

**Demonstrates:** UC-GRD-01, UC-GRD-02, UC-GRD-03, UC-GRD-04

**Proves (ACs):** UC-GRD-01: AC-2, AC-6; UC-GRD-02: AC-1, AC-2, AC-3; UC-GRD-03: AC-1, AC-2, AC-3; UC-GRD-04: AC-6

**Forecast:** 4 waves × 0.25 d/wave = ~1 d · horizon 3 d · fits

**First integrated demonstration:** a landed commit on main with GAW-1 to GAW-11 and GAW-I1 → gh workflow run harness-eval --repo hackerpug-ai/pixel-perfect → grade/harness-eval-result.json in the run's artifact, read with the gate's jq steps, plus the harness-eval-evidence artifacts the later steps open; requires harness-smoke keys and the owner's recorded stance rows; proof/repair owner: github-platform-implementer.

**Owner questions (answer before START):** Grok's --trust only in its keyless install step, and the Codex pin plus hosted-runner user-namespace sysctl — answered: approved both (owner, 2026-10-31); Provider and model for Pi and OpenCode — answered: google gemini-2.5-pro and anthropic claude-sonnet-4-5, keys confirmed (owner, 2026-10-31); OpenCode's args channel — answered: prove it this sprint (owner, 2026-10-31); Who writes the verify report — answered: the evaluator (owner, 2026-10-31, D-02); Plugin node scripts in graded runs — answered: allowed on every gated harness, Pi recorded as no-gate (owner, 2026-10-31, D-03); Raw streams and reports as public 90-day artifacts — answered: publish with a key scan (owner, 2026-10-31, D-04); Newest cell with no exact table — answered: re-prove on the run's own bytes (owner, 2026-10-31, D-05); The shipped OpenCode plugin fix — answered: add it as GAW-10 (owner, 2026-10-31, D-06); Should OpenCode's newest track keep following npm's opencode-ai, or follow OpenCode's GitHub releases? — needed by GAW-5; open, and the plan assumes npm.

## Test Deliverable

**Test Steps:** *(each stranger-runnable verbatim; the gate is RED until these pass)*

<!-- TESTING-GATE-START -->
- [ ] 1. Run `gh api repos/hackerpug-ai/pixel-perfect/environments/harness-smoke/secrets --jq '[.secrets[].name]|sort'` — prints exactly `["SMOKE_CLAUDE_KEY","SMOKE_CODEX_KEY","SMOKE_GROK_KEY","SMOKE_OPENCODE_KEY","SMOKE_PI_KEY"]`, names only, and no Cursor key.   `exercises: GAW-8`
- [ ] 2. Run `gh workflow run harness-eval --repo hackerpug-ai/pixel-perfect && sleep 15 && gh run list --workflow harness-eval --repo hackerpug-ai/pixel-perfect --limit 1 --json databaseId,event,status --jq '.[0] | (.databaseId|tostring) + " " + .event + " " + .status'` — one line ending in `workflow_dispatch queued` or `workflow_dispatch in_progress`.   `exercises: GAW-7`
- [ ] 3. In the same shell run `RUN_ID=$(gh run list --workflow harness-eval --repo hackerpug-ai/pixel-perfect --limit 1 --json databaseId --jq '.[0].databaseId'); gh run watch "$RUN_ID" --repo hackerpug-ai/pixel-perfect; rm -rf /tmp/he2 && gh run download "$RUN_ID" --repo hackerpug-ai/pixel-perfect -n "harness-eval-result-$RUN_ID-1" -D /tmp/he2 && jq '(.cells | length), ([.cells[].harness] | unique | length)' /tmp/he2/grade/harness-eval-result.json` — prints `12` then `6`. The run's conclusion may be failure while Cursor has no key: that is the framework refusing, and the artifact checks below are the proof.   `exercises: GAW-1, GAW-7, E1`
- [ ] 4. Run `jq -r '.cells[] | select(.harness != "cursor") | .harness + " " + .track + " " + ([.checks[] | .check_id + ":" + .verdict] | join(" "))' /tmp/he2/grade/harness-eval-result.json` — ten lines, one per claude-code, codex, grok, opencode and pi on newest and pinned, each naming `command_list`, `status`, `verify` and `question_before_expensive_work` once, each followed by `pass`, `fail` or `could-not-run`.   `exercises: GAW-1, GAW-3, GAW-4, GAW-5, GAW-6`
- [ ] 5. Run `jq '[.cells[] | select(.harness != "cursor") | .checks[] | select(.source == "files-and-event-stream" and ((.evidence_paths // []) | length > 0))] | length' /tmp/he2/grade/harness-eval-result.json` — prints `40`: ten keyed cells, four check verdicts each, every row citing evidence. Run 41235273928 prints `0`.   `exercises: E1, E4, E5, E6, E7, E8, GAW-1, GAW-7, GAW-3, GAW-4, GAW-5, GAW-6`
- [ ] 6. Run `jq '[.cells[].checks[].reason // empty | select(endswith("-adapter-not-implemented"))] | length' /tmp/he2/grade/harness-eval-result.json` — prints `0`. Run 41235273928 prints `32`.   `exercises: E5, E6, E7, E8, GAW-3, GAW-4, GAW-5, GAW-6`
- [ ] 7. Run `jq -r '.cells[] | select(.harness == "cursor") | .track + " " + .verdict + " " + .reason' /tmp/he2/grade/harness-eval-result.json` — prints `newest could-not-run missing-api-key` and `pinned could-not-run missing-api-key`. Cursor stays present and could-not-run by design.   `exercises: GAW-7, E1`
- [ ] 8. Run `jq -r '.candidate_sha[0:12] as $sha | .cells[] | select(.harness != "cursor") | [.harness, .track, .installation.requested_cli_version, .installation.observed_cli_version, ((.installation.plugin_revision // "MISSING")[0:12] == $sha), (.installation.observed_plugin_manifest_sha256 // "MISSING")[0:12]] | @tsv' /tmp/he2/grade/harness-eval-result.json` — ten rows. In every row column 3 equals column 4, column 5 is `true`, and column 6 is the same 12 hex characters. Pinned rows read claude-code 2.1.291, codex 0.160.1, grok 1.0.46, opencode 1.18.34, pi 1.0.4. A row with `MISSING` must also read could-not-run with a named install reason in `.reason`, and it is a real finding about that harness.   `exercises: GAW-1, GAW-3, GAW-4, GAW-5, GAW-6`
- [ ] 9. Run `grep -c '| files-and-event-stream |' /tmp/he2/recorder.log` — prints `40`: the rendered summary has one row per check on each keyed cell, naming where the grade came from. Today it prints `0`.   `exercises: GAW-7, GAW-3, GAW-4, GAW-5, GAW-6`
- [ ] 10. Run `for h in claude-code codex grok opencode pi; do rm -rf /tmp/he2e-$h; gh run download $RUN_ID --repo hackerpug-ai/pixel-perfect -n harness-eval-evidence-$RUN_ID-1-$h-pinned -D /tmp/he2e-$h; jq -r --arg h $h '.cells[] | select(.harness == $h and .track == "pinned") | .checks[].evidence_paths[0]' /tmp/he2/grade/harness-eval-result.json | while read -r p; do if [ -f "/tmp/he2e-$h/$p" ]; then echo "$h found"; else echo "$h MISSING $p"; fi; done; done | sort -u` — exactly five lines: `claude-code found`, `codex found`, `grok found`, `opencode found`, `pi found`. Any `MISSING` line fails the step: a path nobody can open is not evidence.   `exercises: E3, GAW-1, GAW-3, GAW-4, GAW-5, GAW-6, GAW-9, E4, E5, E6, E7, E8`
- [ ] 11. Run `jq -r '.cells[] | select(.harness != "cursor" and .track == "pinned") | .harness + " " + .stream_mapping.table + " " + .stream_mapping.state' /tmp/he2/grade/harness-eval-result.json | sort` — exactly `claude-code claude-code@2.1.291 qualified`, `codex codex@0.160.1 qualified`, `grok grok@1.0.46 qualified`, `opencode opencode@1.18.34 qualified`, `pi pi@1.0.4 qualified`. `qualified` means a table for that exact version, backed by committed captures from that version. A pinned cell never reads `reproved`, `unqualified` or `absent`. Today `.stream_mapping` does not exist.   `exercises: E4, E5, E6, E7, E8, GAW-3, GAW-4, GAW-5, GAW-6, E1`
- [ ] 12. Run `jq '[.cells[] | select(.harness != "cursor" and .track == "pinned") | .checks[] | select((.reason // "") | startswith("stream-mapping-"))] | length' /tmp/he2/grade/harness-eval-result.json` — prints `0`: every pinned row was read through a qualified table. Then run `jq '[.cells[] | select(.harness != "cursor" and .track == "newest" and (.stream_mapping.state == "qualified" or .stream_mapping.state == "reproved")) | .checks[] | select((.reason // "") | startswith("stream-mapping-"))] | length' /tmp/he2/grade/harness-eval-result.json` — prints `0`: a newest cell whose mapping held carries no stream-mapping reason. A non-zero count on either command fails this step and names the mapping.   `exercises: E4, E5, E6, E7, E8, GAW-3, GAW-4, GAW-5, GAW-6, E1, E9`
- [ ] 13. Run `jq -r '.cells[] | select(.harness != "cursor" and .track == "newest") | [.harness, .installation.observed_cli_version, .stream_mapping.state, .stream_mapping.table, (.stream_mapping.basis.captures // [] | length), ([.checks[] | select(.verdict == "could-not-run") | .reason] | unique | join(","))] | @tsv' /tmp/he2/grade/harness-eval-result.json | sort` — exactly five rows, one per keyed harness. Column 3 is the state. `reproved` is the expected word while a harness's newest version differs from its pin: the pinned table named in column 4 graded this version because this run's own captures, counted in column 5 and at least 1, showed every required fact through it. `qualified` means a table exists for that exact version. Either way column 6 lists no `stream-mapping-` reason. `unqualified` is an honest finding: this run's captures did not show every required fact, for example after a renamed event, so column 6 lists `stream-mapping-unqualified` and `.stream_mapping.missing_facts` names the facts. Column 6 may also list a named refusal from checks that never ran, such as `opencode-args-channel-unknown` if the hosted capture proves that channel fails. An empty column 3 is allowed only beside a named install failure in column 6. `absent`, or any other reason on a check that did run, fails the step, because every keyed harness now has a pinned table. No row is omitted, and no row is graded with a table its own captures did not re-prove.   `exercises: E1, E4, E5, E6, E7, E8, GAW-1, GAW-3, GAW-4, GAW-5, GAW-6, E9`
- [ ] 14. Run `jq -r '.cells[] | select(.harness != "cursor" and .track == "pinned") | .harness + " " + ([.checks[] | .check_id + "=" + .verdict] | join(" "))' /tmp/he2/grade/harness-eval-result.json | sort` — five lines, each naming `command_list=`, `status=`, `verify=` and `question_before_expensive_work=` with a word from pass, fail, could-not-run. `pass` is the target; a `fail` is a real finding this gate surfaces, not a setup error. Then run `jq '[.cells[] | select(.harness != "cursor") | .checks[] | select(.verdict != "pass" and ((.reason // "") | length == 0))] | length' /tmp/he2/grade/harness-eval-result.json` — prints `0`.   `exercises: E1, E2, E4, E5, E6, E7, E8, GAW-1, GAW-3, GAW-4, GAW-5, GAW-6, GAW-11`
- [ ] 15. Run `jq -r '.cells[] | select(.harness != "cursor" and .track == "pinned") | .harness + " " + ([.checks[] | select(.check_id == "question_before_expensive_work") | (.question_count | tostring) + " " + (.answers_delivered | tostring) + " " + (.reason // "-")] | join(""))' /tmp/he2/grade/harness-eval-result.json | sort` — five lines; the target line is `<harness> 1 0 -`, and `<harness> 0 0 no-question-asked` is a real finding. No line reads `required-fact-unobserved`, which is what run 41235273928 prints on claude-code even though its capture was complete. The second number is `0` on every line: no answer was sent.   `exercises: E1, E4, E5, E6, E7, E8, GAW-2, GAW-3, GAW-4, GAW-5, GAW-6`
- [ ] 16. Run `rm -rf /tmp/he2v && gh run download $RUN_ID --repo hackerpug-ai/pixel-perfect -n harness-eval-verify-reports-$RUN_ID-1 -D /tmp/he2v && find /tmp/he2v -name verify-button-drift.json | wc -l && find /tmp/he2v -name verify-clean.json | wc -l && find /tmp/he2v -name verify-button-drift.json -exec jq -r '.harness + " " + .track + " " + .expected_defect_key + " " + (.observed_defect_key // "none") + " " + .observed_verify_outcome' {} + | sort` — `10`, then `10`, then ten lines, each naming its own harness and track. The target line ends `atoms/Button/default atoms/Button/default defect-detected`. A line ending `none missed-defect` is a real finding. A line ending `none unavailable` carries a `could_not_run_reason`. Run 41235273928 prints `0` and `0`, because its INDEX.json reads `reports: []`.   `exercises: E2, E4, E5, E6, E7, E8, GAW-3, GAW-4, GAW-5, GAW-6, GAW-9, E1, GAW-11`
- [ ] 17. Run `find /tmp/he2v -name verify-clean.json -exec jq -r '.harness + " " + (.clean_project_failed | tostring)' {} + | sort -u` — one line per keyed harness ending `false`, or naming a real false positive as `true`. Then run `find /tmp/he2v -name denied-write-probe.json -exec jq -r '.harness + " exit=" + (.process_exit_code | tostring) + " " + .denied_tool_call.operation + " " + .evaluation_verdict' {} + | sort` — includes `claude-code exit=0 Write fail`: the report itself shows the denied tool call on a clean exit.   `exercises: E2, E3, GAW-3, GAW-4, GAW-5, GAW-6, GAW-9, GAW-11`
- [ ] 18. Run `rm -rf /tmp/he2-codex && gh run download "$RUN_ID" --repo hackerpug-ai/pixel-perfect -n "harness-eval-evidence-$RUN_ID-1-codex-pinned" -D /tmp/he2-codex && find /tmp/he2-codex -name '*.capture.json' -not -path '*denied-write-probe*' -exec jq -r 'select(.check_id == "status" or .check_id == "verify") | .check_id + " " + (.argv as $a | $a[($a | index("--sandbox")) + 1])' {} + | sort` — exactly `status read-only`, `verify workspace-write`, `verify workspace-write`.   `exercises: GAW-3, GAW-I1, GAW-9`
- [ ] 19. Run `rm -rf /tmp/he2-grok && gh run download "$RUN_ID" --repo hackerpug-ai/pixel-perfect -n "harness-eval-evidence-$RUN_ID-1-grok-pinned" -D /tmp/he2-grok && find /tmp/he2-grok -name '*.capture.json' -exec jq -r 'select((.argv // []) | index("--trust")) | .check_id' {} + | sort -u` — exactly one line, `plugin-install`. No graded invocation carries `--trust`.   `exercises: GAW-4, GAW-9`
- [ ] 20. Run `find /tmp/he2-grok -name '*.capture.json' -exec jq -r 'select(.check_id == "question_before_expensive_work") | .termination_kind + " " + (.boundary_event_offset | tostring)' {} +` — one line, `boundary-stop` followed by an integer: the probe stopped at its first question and sent no answer. `native null` means the first turn asked nothing, which is a real finding about Grok.   `exercises: GAW-2, GAW-4, GAW-9, E1, E6`
- [ ] 21. Run `jq -r '.cells[] | select(.harness == "opencode") | .track + " " + ([.checks[] | select(.check_id == "status" or .check_id == "verify") | .check_id + ":" + .verdict + ":" + (.reason // "none")] | join(" "))' /tmp/he2/grade/harness-eval-result.json` — two lines, one per track, neither containing `adapter-not-implemented`. Each of `status` and `verify` reads a verdict from that run's own bytes. `could-not-run:opencode-args-channel-failed` means the run's session shows the fixture arguments never reached the command, and `could-not-run:opencode-no-user-message` means the session died before the command started; each is a real finding about OpenCode, not a setup error. Then run `rm -rf /tmp/he2-oc && gh run download "$RUN_ID" --repo hackerpug-ai/pixel-perfect -n "harness-eval-evidence-$RUN_ID-1-opencode-pinned" -D /tmp/he2-oc && find /tmp/he2-oc -name 'session-export.json' -exec jq -r '[.messages[]? | select(.info.role == "user") | .parts[]?.text // empty] | join(" ")' {} + | grep -c 'Invocation input: .--platform web-desktop'` — prints `3` when the channel holds: status and both verify runs received the argument. This capture decides the channel.   `exercises: GAW-5, GAW-9, E7, GAW-10`
- [ ] 22. Run `rm -rf /tmp/he2-pi && gh run download "$RUN_ID" --repo hackerpug-ai/pixel-perfect -n "harness-eval-evidence-$RUN_ID-1-pi-pinned" -D /tmp/he2-pi && find /tmp/he2-pi -name '*.stdout.bin' -exec jq -rR 'fromjson? | select(.type == "message_end" and .message.role == "assistant") | .message.provider + "/" + .message.model' {} + | sort -u` — exactly one line, `google/gemini-2.5-pro`: Pi answered through the pinned provider and no other.   `exercises: GAW-6, GAW-I1, GAW-9`
- [ ] 23. Run `jq -r '.controls[] | select(.control_id == "missing-key") | .per_harness | to_entries[] | [.key, .value.verdict, .value.reason, (.value.model_request_count | tostring), (.value.child_ran | tostring)] | @tsv' /tmp/he2/grade/harness-eval-result.json` — five rows, for claude-code, codex, grok, opencode and pi, each reading `could-not-run`, `missing-api-key`, `0`, `false`. Today the same command stops with a jq error because per_harness is absent.   `exercises: GAW-8`
- [ ] 24. Run `jq -r '.cells[] | select(.harness != "cursor" and .track == "pinned") | .harness + " " + (.control_observations["exit0-denied-read"] | .verdict + " " + .reason + " exit=" + (.evidence.process_exit_code | tostring))' /tmp/he2/grade/harness-eval-result.json | sort` — includes `claude-code fail denied_tool_call exit=0`; `codex`, `grok` and `opencode` print that same shape or `could-not-run control-unobservable exit=null` when their denial did not exit 0; `pi` prints `could-not-run stream-mapping-fact-not-applicable exit=null`, because Pi has no permission gate that could deny anything.   `exercises: E3, E5, E6, E7, E8, GAW-3, GAW-4, GAW-5, GAW-6, E4, GAW-1`
- [ ] 25. Run `jq -r '.cells[] | select(.harness != "cursor" and .track == "pinned") | .harness + " " + .control_observations["hidden-image-judge"].reason' /tmp/he2/grade/harness-eval-result.json | sort` — exactly five lines ending `no-image-judge-in-child-tree`. Then run `jq -r '.controls[] | .control_id + " " + .verdict + " " + .reason + " " + (.qualified | tostring)' /tmp/he2/grade/harness-eval-result.json` — `missing-key could-not-run missing-api-key true`, `stale-cache could-not-run installation-identity-mismatch true`, `exit0-denied-read fail denied_tool_call true`, `hidden-image-judge pass no-image-judge-in-child-tree true`.   `exercises: E3, GAW-3, GAW-4, GAW-5, GAW-6, GAW-8`
- [ ] 26. First contact — as the maintainer, run `gh workflow run harness-eval --repo hackerpug-ai/pixel-perfect`, open https://github.com/hackerpug-ai/pixel-perfect/actions/workflows/harness-eval.yml, click the newest run, and when it finishes read its summary on the run page for THIS repo, holding these promises in mind. Promise (UC-GRD-01): "Sits under 'Maintainer reads pass, fail, or could-not-run for each harness on the pinned version and the newest version.' The summary is the reader. There is no product screen, and a missing screenshot score is not a gap." Promise (UC-GRD-02): "Sits under 'Maintainer reads the command list, status, verify on a planted defect, and whether the first turn asked before expensive work.' List, status, and verify ask nothing. The separate must-ask probe asks once and stops without receiving an answer." Promise (UC-GRD-03): "Sits under 'Maintainer reads each grade from written results and the event stream.' A clean exit is not a pass, and a denied tool call is visible." Promise (UC-GRD-04): "Sits under 'Maintainer reads the planted defect when verify fails.' The failing case names the report path. The grader does not invent a filename." State what you see about this repo's run: for Claude Code, Codex, Grok, OpenCode and Pi on pinned and newest, which of the four grades came back pass or fail and which read could-not-run and why, and that Cursor reads could-not-run missing-api-key. You should be able to point at all twelve cells, and no keyed cell should say its adapter is missing.   `exercises: GAW-3, GAW-4, GAW-5, GAW-6, GAW-7, E1, E2, E3`
<!-- TESTING-GATE-END -->

**Dark tasks:** none — every task is exercised by a gate step.

## Automated Functional Coverage

| Flow ID | Kind | Gate step(s) | Owner task/AC | Test file/function | Replay |
|---|---|---|---|---|---|
| FLOW-GRD-01-TWELVE-CELLS | core | 3,4,5,6,7,8,9 | GAW-7/AC-1 | tests/sprint-02/grd-01-twelve-cells.test.mjs :: FLOW-GRD-01-TWELVE-CELLS | post-integration |
| FLOW-GRD-02-FOUR-GRADES | core | 5,7,13,14,15 | E1/AC-1 | tests/sprint-02/grd-02-four-grades.test.mjs :: FLOW-GRD-02-FOUR-GRADES | post-integration |
| FLOW-GRD-03-FILES-AND-STREAM | core | 10,24,25 | E3/AC-1 | tests/sprint-02/grd-03-files-and-stream.test.mjs :: FLOW-GRD-03-FILES-AND-STREAM | post-integration |
| FLOW-GRD-04-NAMED-PATH | core | 16,17 | E2/AC-1 | tests/sprint-02/grd-04-named-path.test.mjs :: FLOW-GRD-04-NAMED-PATH | post-integration |

Deferred journey: FLOW-JRN-NIGHTLY-PINNED-BLOCK (outstanding UC-REL-01, UC-RUN-01).

## Holdouts

Sprint: `sprint-02-four-live-adapters-codex-grok-opencode-pi-graded-on-both-tracks-per-harness-mappings-controls-and-honest-could-not-run-cells`. Authored from this sprint's holdout scenarios and the PRD; no promise map.

| Repository | Boundary | Selection | Digest | Exposure |
|---|---|---|---|---|
| pixel-perfect | task | sel-341645fe17e4b34c | e121a7c7603e40700c31a20165936f351a49af6f106f48794c300b57cfd2998b | cooperative_unexposed |

Selected obligations (task scope; none integrated):

- `grd06-keyless/v1` — A keyed harness whose own key is absent records could-not-run with the missing-key reason on both tracks. Preserve: One harness's key never satisfies another; No key value reaches a record.
- `grd03-coverage/v1` — Each of Codex, Grok, OpenCode and Pi is graded through a qualified table for its pinned version, backed by real bytes showing every required fact; a truncated capture or removed mapping cannot pass. Preserve: Captured bytes stay lossless; Other harnesses' tables keep loading.
- `grd02-boundary-pi/v1` — A real Pi question stopped at its boundary can pass must-ask from its prefix; a capture cut before it, an unexplained kill, or expensive work first cannot. Preserve: Ask-nothing checks still fail at the question's own offset.
- `grd01-identity-codex/v1` — A Codex cell records the version the CLI reports and the digest of the loaded bytes; older bytes under the same cache label cannot read as the candidate, and a correct reinstall restores equality. Preserve: The candidate checkout stays clean.
- `grd03-planted-path/v1` — A check cannot pass on a citation that is a symlink or outside this run's evidence, and a stream failure stays a failure. Preserve: Real regular files still pass.

## Tasks

| ID | Title | Agent | Points | Wave | Status |
|----|-------|-------|--------|------|--------|
| GAW-11 | Remove T16's verify declaration and write allow-list, and admit node scripts on claude-code | ai-tooling-implementer | 3 | A | ⬜ Pending |
| GAW-2 | Stop a must-ask probe at its first question | ai-tooling-implementer | 3 | A | ⬜ Pending |
| GAW-8 | Refuse each keyed harness by name when its own key is absent | devops-engineer | 3 | A | ⬜ Pending |
| GAW-I1 | Give the smoke job the runner the Pi and Codex CLIs need | devops-engineer | 2 | A | ⬜ Pending |
| GAW-1 | Run every keyed harness through one adapter contract, recording the version it really installed | ai-tooling-implementer | 8 | B | ⬜ Pending |
| E1 | Grade every keyed cell's rows from its own captured bytes through a per-harness table, on the live path | evals-implementer | 8 | C | ⬜ Pending |
| E3 | Exit-0 denials and hidden image judging are observed per keyed harness, and each graded row cites evidence a reader can open | evals-implementer | 5 | C | ⬜ Pending |
| GAW-10 | Keep a headless OpenCode session alive with the shipped plugin | ai-tooling-implementer | 1 | C | ⬜ Pending |
| GAW-3 | Install, load and invoke Codex on both tracks | ai-tooling-implementer | 5 | C | ⬜ Pending |
| GAW-4 | Install, load and invoke Grok on both tracks, with --trust only where no key exists | ai-tooling-implementer | 5 | C | ⬜ Pending |
| GAW-5 | Install, load and invoke OpenCode on both tracks through its namespaced commands | ai-tooling-implementer | 5 | C | ⬜ Pending |
| GAW-6 | Install, load and invoke Pi on both tracks through the pinned provider only | ai-tooling-implementer | 5 | C | ⬜ Pending |
| GAW-7 | Show the ten keyed cells' four grades and their identity from the finished run | github-platform-implementer | 3 | C | ⬜ Pending |
| GAW-9 | Keep each cell's captures and reports after the runner is gone, minus anything holding its key | github-platform-implementer | 5 | C | ⬜ Pending |
| E2 | The evaluator writes each case's verify report at its declared path on the live path, for every keyed cell | evals-implementer | 5 | D | ⬜ Pending |
| E4 | Qualify the claude-code 2.1.291 table on hosted captures | evals-implementer | 3 | D | ⬜ Pending |
| E5 | Map and qualify the Codex stream at its pinned version | evals-implementer | 5 | D | ⬜ Pending |
| E6 | Map and qualify the Grok stream at its pinned version | evals-implementer | 5 | D | ⬜ Pending |
| E7 | Map and qualify the OpenCode stream at its pinned version | evals-implementer | 5 | D | ⬜ Pending |
| E8 | Map and qualify the Pi stream at its pinned version | evals-implementer | 5 | D | ⬜ Pending |
| E9 | Grade a newest cell with the pinned table only when that run's own captures re-prove every required fact | evals-implementer | 3 | D | ⬜ Pending |

**Waves:** A(4) → B(1) → C(9) → D(7) — 4 waves over 21 tasks (≈5.2 at once)

## Source Coverage

- UC-GRD-01
- UC-GRD-02
- UC-GRD-03
- UC-GRD-04

## PRD Coverage

- 04-uc-grd.md (UC-GRD-02, UC-GRD-03, UC-GRD-04 AC-6), 09-technical-requirements/02-system-components.md (codex-adapter, grok-adapter, pi-adapter, opencode-adapter, stream-grader, question-boundary), 09-technical-requirements/03-data-schema.md (StatusCase, CommandTranslation/CredentialBinding rows CODEX_API_KEY, XAI_API_KEY, SMOKE_PI_KEY, ANTHROPIC_API_KEY, CanonicalEvent mapping qualification), 09-technical-requirements/08-technical-risks.md (R-exit-zero, R-grok-trust, R-opencode-layout, R-list-count, R-question-signal, R-codex-cache, R-pi-model-call, R-no-wall-clock, R-stance-open, R-mode-mixup) …

## Capability Coverage

- CAP-EVAL-01: Install and grade

## Blocks

- Sprint 04, Sprint 05, Sprint 06

## Task Detail Files

Generated by /kb-sprint-tasks-plan on 2026-10-31

- TASK-E1.md
- TASK-E2.md
- TASK-E3.md
- TASK-E4.md
- TASK-E5.md
- TASK-E6.md
- TASK-E7.md
- TASK-E8.md
- TASK-E9.md
- TASK-GAW-1.md
- TASK-GAW-10.md
- TASK-GAW-11.md
- TASK-GAW-2.md
- TASK-GAW-3.md
- TASK-GAW-4.md
- TASK-GAW-5.md
- TASK-GAW-6.md
- TASK-GAW-7.md
- TASK-GAW-8.md
- TASK-GAW-9.md
- TASK-GAW-I1.md
