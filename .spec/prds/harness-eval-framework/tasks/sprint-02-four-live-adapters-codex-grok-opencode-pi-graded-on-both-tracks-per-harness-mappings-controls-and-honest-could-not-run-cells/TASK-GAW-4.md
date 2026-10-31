# TASK-GAW-4: Install, load and invoke Grok on both tracks, with --trust only where no key exists

> Task ID: GAW-4
> Sprint: [SPRINT.md](./SPRINT.md)
> Status: Backlog
> Assignee: ai-tooling-implementer
> Priority: P0
> Points: 5
> Type: FEATURE
> Planner: github-agentic-workflow-planner
> Reviewer: ai-tooling-reviewer
> Proposed By: github-agentic-workflow-planner
> Wave: C
> TDD_MODE: red_first · RED_GREEN_REQUIRED: true

AGENT: planner=github-agentic-workflow-planner | implementer=ai-tooling-implementer | reviewer=ai-tooling-reviewer

## Background

- **Problem:** Grok's cells read `grok-adapter-not-implemented`, and no Linux install of the Grok CLI has ever been run.
- **Owner decisions:** `--trust` is approved in a keyless install only. Node scripts are the widest thing a graded run may do (ROADMAP D-03).
- **Gate steps that exercise this task:** 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 19, 20, 24, 25, 26. Capability: CAP-EVAL-01.

## Critical Constraints

- **MUST:** Load, keyless only: grok plugin install <workspace>/plugins/pixel-perfect --trust. The owner approved this rule. A table entry that holds a key and carries --trust throws at build time.
- **MUST:** Run: grok -p '/pixel-perfect:<name> <args>' --output-format streaming-json -m grok-4.6 --permission-mode dontAsk --allow 'Bash(node *)', stdin closed. A status prompt also carries contract.mjs declarationFor's text; verify carries none, because the evaluator writes its report. Copy no config from this Mac: it approves every tool call.
- **STRICTLY:** That stance is the owner-approved row: node scripts are allowed and nothing wider. Grok's help names --allowedTools as an alias of --allow, but this rule's grammar is unverified: the first hosted capture must show a node script admitted and another Bash command denied.
- **MUST:** controlProbeEntry: the required half asks to write work/keep.txt under the graded stance, and the optional half asks to write outside the work dir. In this harness's keyed workflow step add one line, on the pinned track only: node test/harness/smoke/control-probe.mjs grok --cell-dir cell.
- **MUST:** Verified on this Mac at 1.0.46, no key, temp HOME: the installer accepts the exact version, plugin install exits 0, inspect returns 13 names, and the installed digest equals the checkout digest. Linux and any model run are unproven. This Mac's real Grok reads the plugin through Claude compatibility, so a test must never use the real HOME.

## Specification

- **Objective:** Grok installs, loads and runs through the adapter contract on both tracks, with `--trust` only where no key exists.
- **Success state:** A keyless load at 1.0.46 in a temp HOME proves the installed plugin's digest equals the checkout's and lists 11 of 11 commands. Exactly one plan step holds `--trust`, and a keyed entry carrying it throws at build time. The registry serves this adapter, and the keyed step runs the denied-write probe on pinned.

Contract details:

- Install, keyless: curl -fsSL https://x.ai/cli/install.sh | bash -s <version> with GROK_DISABLE_AUTOUPDATER=1. The binary is $HOME/.grok/bin/grok; call it by absolute path. A failed first Linux install is could-not-run grok-install-failed, and that is an honest result for this cell.
- List: grok inspect --json, skills whose source.plugin_name is pixel-perfect. Identity hashes $HOME/.grok/installed-plugins/pixel-perfect-*.
- FLOW-GRD-01 and the other flows' gate steps list this task, so the trunk replay proves these cells, including the first Linux install, on a hosted run.

## Acceptance Criteria (GIVEN-WHEN-THEN)

### AC-1: The pinned CLI installs the checkout's plugin with no key and the identity is proven [PRIMARY]

- **GIVEN:** the pinned Grok CLI in a temp HOME with an allowlisted env and no Claude install beside it
- **WHEN:** the adapter's keyless load runs against this checkout
- **THEN:** `observed_cli_version` reads `1.0.46` with `identity_decision.ok` true, 11 of 11 command names are present, and `loaded_plugin_root` sits under the temp HOME's `.grok/installed-plugins`

```text
FLOW_REF:              null
TEST_TIER:             integration
VERIFICATION_SERVICE:  real Grok CLI at the pinned version in a temp HOME
SURFACE_POLICY:        null
TDD_STATE:             none
TEST_FILE:             tests/sprint-02/adapter-grok.test.mjs
TEST_FUNCTION:         ADAPTER-GROK-KEYLESS-LOAD
VERIFY:                node --test --test-name-pattern 'ADAPTER-GROK-KEYLESS-LOAD' tests/sprint-02/adapter-grok.test.mjs
```

SCENARIO_SUMMARY: Fresh temp HOME: Grok loads this checkout's plugin from its own install directory, never through a Claude directory.

### AC-2: --trust appears only in the keyless plugin install, and the probe is declared [PRIMARY]

- **GIVEN:** the adapter's plan and invocation table, and the real workflow file
- **WHEN:** every plan step's argv and env are read, each graded and probe entry runs with every credential removed, and a keyed copy of an entry gains `--trust` before the table builds
- **THEN:** exactly 1 step holds `--trust`, named `plugin-install`, with 0 credential names in its env, the keyed copy throws `trust-on-keyed-step`, and the required probe's prompt names `work/keep.txt`

```text
FLOW_REF:              null
TEST_TIER:             integration
VERIFICATION_SERVICE:  the real workflow file and the real guard and capture over the adapter's table
SURFACE_POLICY:        null
TDD_STATE:             none
TEST_FILE:             tests/sprint-02/adapter-grok.test.mjs
TEST_FUNCTION:         ADAPTER-GROK-NO-TRUST-WHEN-KEYED
VERIFY:                node --test --test-name-pattern 'ADAPTER-GROK-NO-TRUST-WHEN-KEYED' tests/sprint-02/adapter-grok.test.mjs
```

SCENARIO_SUMMARY: One keyless step holds `--trust`, and a keyed entry that tries to carry it cannot be built.

Each AC's RED input and positive example are in its row of the contract block below.

## Test Criteria

Each TC runs its mapped AC's VERIFY.

| ID | Statement | Maps to |
|---|---|---|
| TC-1 | `observed_cli_version` reads `1.0.46` when the keyless load finishes | AC-1 |
| TC-2 | `loaded_plugin_root` sits under the temp HOME's `.grok/installed-plugins` when the load finishes | AC-1 |
| TC-3 | The load finds 11 of 11 command names when `grok inspect --json` runs | AC-1 |
| TC-4 | Exactly 1 plan step holds `--trust` when the plan is read | AC-2 |
| TC-5 | Building the table throws `trust-on-keyed-step` when a keyed entry carries `--trust` | AC-2 |
| TC-6 | The required probe's prompt names `work/keep.txt` when read from its capture | AC-2 |

## Reading List

1. `INSTALL.md` lines 96-118: the Grok install and why --trust is needed
2. `.github/workflows/harness-eval.yml` lines 170-178: the keyed grok step and its no --trust rule
3. `.spec/prds/harness-eval-framework/09-technical-requirements/02-system-components.md` lines 89-93: grok-adapter
4. `test/harness/adapters/claude-code.mjs` lines 1448-1507: the keyless load shape
5. `test/harness/adapters/claude-code.mjs` lines 402-529: the denied-write probe entry shape

Standards: `AGENTS.md`, `brain/docs/kanban/SCENARIO-CONTRACT-V1.md`.

## Guardrails

WRITE-ALLOWED:

- test/harness/adapters/grok.mjs (NEW)
- test/harness/adapters/registry.mjs (MODIFY)
- .github/workflows/harness-eval.yml (MODIFY)
- tests/sprint-02/adapter-grok.test.mjs (NEW)

WRITE-PROHIBITED:

- test/harness/graders/** - adapters do not grade
- test/harness/stream/** - E6 owns Grok's table
- plugins/pixel-perfect/** - no plugin change in this task
- Any keyed step in `.github/workflows/harness-eval.yml` except Grok's, which gains one line
- Any file not listed in WRITE-ALLOWED

## Code Pattern

```yaml
# .github/workflows/harness-eval.yml:170-174: the rule this adapter keeps.
# grok's keyed step passes no --trust: a keyed invocation never widens its own permissions.
- name: Smoke model step grok ${{ matrix.track }}
  if: matrix.harness == 'grok'
  env:
    XAI_API_KEY: ${{ secrets.SMOKE_GROK_KEY }}
```

- **Anti-pattern:** `--trust` on a keyed entry; `--always-approve`; reading the real HOME, where Grok sees the plugin through Claude compatibility; copying this Mac's Grok config.

## Design

None. This task has no UI surface.

## Agent Instructions

Work AC-1 then AC-2, one RED, GREEN, REFACTOR cycle each. Every test sets a temp HOME and calls Grok by absolute path. Every child starts from an empty env plus an allowlist, and no test holds a key.

## Orchestrator Verification Protocol

1. **VERIFY_RED:** each VERIFY fails on base for the reason its RED names.
2. **VERIFY_GREEN:** each VERIFY exits 0.
3. Run every Evidence Gate and compare with Expected.
4. `git diff --name-only` lists only WRITE-ALLOWED paths.
5. Dispatch `ai-tooling-reviewer` with this file, the RED and GREEN output, and the evidence.

## Agent Assignment

- **Planner:** `github-agentic-workflow-planner`
- **Implementer:** `ai-tooling-implementer`
- **Reviewer:** `ai-tooling-reviewer`
- **Rationale:** `ai-tooling-implementer` owns harness adapter code. `ai-tooling-reviewer` checks the adapter against the real CLI's surface and the plugin contract.

## Evidence Gates

Every VERIFY above exits 0, then:

- **tests:** `node --test tests/sprint-02/adapter-grok.test.mjs`. Expected: exit 0 with 2 passing tests
- **regression-sprint-01:** `node --test tests/sprint-01/grd-01-twelve-cells.test.mjs tests/sprint-01/grd-06-missing-key.test.mjs`. Expected: exit 0: the twelve-cell plan and the keyless rules still hold
- **validate:** `pnpm validate`. Expected: exit 0

## Review Criteria

Must pass:

- One test per AC, named exactly as its TEST_FUNCTION.
- `--trust` appears in one keyless step.
- The refusal lives in the table builder.
- No test reads the real HOME.
- The workflow gains only the one probe line, on the pinned track.

Should verify:

- A failed first Linux install reads could-not-run `grok-install-failed`.
- The first hosted capture shows a node script admitted and another Bash command denied, because this rule's grammar is unverified.

Verdict: APPROVED or NEEDS_FIXES, with file and line for each finding.

## Dependencies

- **Depends on:** GAW-1 (the adapter contract, declarations, stance table, probe runner and real-cli test harness this adapter builds on), GAW-2 (the stop_at option its must-ask entry passes to the runtime)
- **Blocks:** E6

## Notes

- **Flows:** owns no locked flow. Both ACs are task-local, and FLOW-GRD-01 to FLOW-GRD-04 replay the hosted cells through the gate steps above.
- **Unproven on this Mac:** the Linux install and any model run. The first hosted run decides them, and gate steps 19 and 20 read the result.
- **Provenance:** prd 09-technical-requirements/02-system-components.md grok-adapter; 08-technical-risks.md R-grok-trust

<!-- REQUIREMENT-CONTRACT v1 -->
<!--
{"version":"1","task_id":"GAW-4","task_type":"FEATURE","tdd_mode":"red_first","verification_policy":{"requires_tests":true,"requires_red_evidence":true,"requires_seeded_evidence":true},"guardrails":{"write_allowed":["test/harness/adapters/grok.mjs (NEW)","test/harness/adapters/registry.mjs (MODIFY)",".github/workflows/harness-eval.yml (MODIFY)","tests/sprint-02/adapter-grok.test.mjs (NEW)"],"write_prohibited":["test/harness/graders/** - adapters do not grade","test/harness/stream/** - E6 owns Grok's table","plugins/pixel-perfect/** - no plugin change in this task","Any keyed step in `.github/workflows/harness-eval.yml` except Grok's, which gains one line","Any file not listed in WRITE-ALLOWED"]},"fixtures":{"seed/pinned-grok":{"description":"Grok at the pinned version installed by its own installer into a temp HOME with an allowlisted env and no Claude install beside it","seed_method":"cli","records":["grok --version prints grok 1.0.46"]}},"verification_gates":[{"gate":"tests","command":"node --test tests/sprint-02/adapter-grok.test.mjs","expected":"exit 0 with 2 passing tests","positive_example":"both ADAPTER-GROK tests pass against the pinned CLI in a temp HOME"},{"gate":"regression-sprint-01","command":"node --test tests/sprint-01/grd-01-twelve-cells.test.mjs tests/sprint-01/grd-06-missing-key.test.mjs","expected":"exit 0: the twelve-cell plan and the keyless rules still hold","positive_example":"both sprint-01 files pass with grok registered"},{"gate":"validate","command":"pnpm validate","expected":"exit 0","positive_example":"every repo validator prints its pass line"}],"integration_obligations":[],"requirements":[{"id":"AC-1","type":"acceptance_criterion","primary":true,"description":"GIVEN the pinned Grok CLI in a temp HOME with an allowlisted env and no Claude install beside it WHEN the adapter's keyless load runs against this checkout THEN `observed_cli_version` reads `1.0.46` with `identity_decision.ok` true, 11 of 11 command names are present, and `loaded_plugin_root` sits under the temp HOME's `.grok/installed-plugins`","flow_ref":null,"test_file":"tests/sprint-02/adapter-grok.test.mjs","test_function":"ADAPTER-GROK-KEYLESS-LOAD","verify":"node --test --test-name-pattern 'ADAPTER-GROK-KEYLESS-LOAD' tests/sprint-02/adapter-grok.test.mjs","test_tier":"integration","verification_service":"real Grok CLI at the pinned version in a temp HOME","surface_policy":null,"positive_example":"Fresh temp HOME: identity approved at 1.0.46, installed digest equal to the checkout digest, and all 11 command names among the 13 inspect returns.","red":"On base the registry answers grok-adapter-not-implemented, no load runs, and the identity assertion fails.","maps_to_ac":null,"scenario":{"tier":"visible","test_tier":"integration","verification_service":"real Grok CLI at the pinned version in a temp HOME","topology":"single-node","negative_control":{"would_fail_if":["the test reads the real HOME, so a Claude-compatible plugin shadows the install","the digest is computed from the checkout twice","the list is a static array of names"]},"evidence":{"forms":["file_artifact","stdout"],"examples":["load.json identity and command names"],"required_capture":true},"build_proof":{"range":"anything that proves the plugin Grok loads is byte-for-byte this checkout's on a machine with no Claude install","examples":["hashing the installed-plugins directory the install created"]},"cases":[{"start_ref":"seed/pinned-grok","action":{"actor":"runner","steps":["run the adapter's keyless load against this checkout in the temp HOME"]},"end_state":{"must_observe":["`observed_cli_version` is `1.0.46` and identity_decision.ok is true","11 of 11 command names present","`loaded_plugin_root` sits under the temp HOME's `.grok/installed-plugins`"],"must_not_observe":["a loaded_plugin_root under a `.claude` directory","a model request: `model_request_count` above 0"]}}]}},{"id":"AC-2","type":"acceptance_criterion","primary":true,"description":"GIVEN the adapter's plan and invocation table, and the real workflow file WHEN every plan step's argv and env are read, each graded and probe entry runs with every credential removed, and a keyed copy of an entry gains `--trust` before the table builds THEN exactly 1 step holds `--trust`, named `plugin-install`, with 0 credential names in its env, the keyed copy throws `trust-on-keyed-step`, and the required probe's prompt names `work/keep.txt`","flow_ref":null,"test_file":"tests/sprint-02/adapter-grok.test.mjs","test_function":"ADAPTER-GROK-NO-TRUST-WHEN-KEYED","verify":"node --test --test-name-pattern 'ADAPTER-GROK-NO-TRUST-WHEN-KEYED' tests/sprint-02/adapter-grok.test.mjs","test_tier":"integration","verification_service":"the real workflow file and the real guard and capture over the adapter's table","surface_policy":null,"positive_example":"plugin-install carries --trust and no key; each graded and probe entry's refusal capture holds no --trust, --always-approve or bypassPermissions.","red":"On base no grok table exists, so reading argv from its persisted refusal captures fails.","maps_to_ac":null,"scenario":{"tier":"visible","test_tier":"integration","verification_service":"the real workflow file and the real guard and capture over the adapter's table","topology":"single-node","negative_control":{"would_fail_if":["the build-time refusal is removed and a keyed entry carries --trust","the keyed workflow step gains --trust and the check reads a hardcoded copy of the file"]},"evidence":{"forms":["file_artifact"],"examples":["capture.json argv per entry"],"required_capture":true},"build_proof":{"range":"anything that proves a step holding XAI_API_KEY cannot widen its own permissions","examples":["a refusal in the adapter's table builder"]},"cases":[{"start_ref":"seed/pinned-grok","action":{"actor":"runner","steps":["read every plan step's argv and env, then run each graded and probe entry with every credential removed","add --trust to a keyed copy of an entry and build the table"]},"end_state":{"must_observe":["exactly 1 step holds `--trust`, named `plugin-install`, with 0 credential names in its env","the keyed copy throws reason `trust-on-keyed-step`","the required probe's prompt names `work/keep.txt`"],"must_not_observe":["`--always-approve` in any argv","`bypassPermissions` in any argv","an empty plan with 0 steps"]}}]}},{"id":"TC-1","type":"test_criterion","description":"`observed_cli_version` reads `1.0.46` when the keyless load finishes","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'ADAPTER-GROK-KEYLESS-LOAD' tests/sprint-02/adapter-grok.test.mjs","positive_example":"Fresh temp HOME: identity approved at 1.0.46, installed digest equal to the checkout digest, and all 11 command names among the 13 inspect returns."},{"id":"TC-2","type":"test_criterion","description":"`loaded_plugin_root` sits under the temp HOME's `.grok/installed-plugins` when the load finishes","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'ADAPTER-GROK-KEYLESS-LOAD' tests/sprint-02/adapter-grok.test.mjs","positive_example":"Fresh temp HOME: identity approved at 1.0.46, installed digest equal to the checkout digest, and all 11 command names among the 13 inspect returns."},{"id":"TC-3","type":"test_criterion","description":"The load finds 11 of 11 command names when `grok inspect --json` runs","maps_to_ac":"AC-1","verify":"node --test --test-name-pattern 'ADAPTER-GROK-KEYLESS-LOAD' tests/sprint-02/adapter-grok.test.mjs","positive_example":"Fresh temp HOME: identity approved at 1.0.46, installed digest equal to the checkout digest, and all 11 command names among the 13 inspect returns."},{"id":"TC-4","type":"test_criterion","description":"Exactly 1 plan step holds `--trust` when the plan is read","maps_to_ac":"AC-2","verify":"node --test --test-name-pattern 'ADAPTER-GROK-NO-TRUST-WHEN-KEYED' tests/sprint-02/adapter-grok.test.mjs","positive_example":"plugin-install carries --trust and no key; each graded and probe entry's refusal capture holds no --trust, --always-approve or bypassPermissions."},{"id":"TC-5","type":"test_criterion","description":"Building the table throws `trust-on-keyed-step` when a keyed entry carries `--trust`","maps_to_ac":"AC-2","verify":"node --test --test-name-pattern 'ADAPTER-GROK-NO-TRUST-WHEN-KEYED' tests/sprint-02/adapter-grok.test.mjs","positive_example":"plugin-install carries --trust and no key; each graded and probe entry's refusal capture holds no --trust, --always-approve or bypassPermissions."},{"id":"TC-6","type":"test_criterion","description":"The required probe's prompt names `work/keep.txt` when read from its capture","maps_to_ac":"AC-2","verify":"node --test --test-name-pattern 'ADAPTER-GROK-NO-TRUST-WHEN-KEYED' tests/sprint-02/adapter-grok.test.mjs","positive_example":"plugin-install carries --trust and no key; each graded and probe entry's refusal capture holds no --trust, --always-approve or bypassPermissions."}]}
-->
