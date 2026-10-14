---
stability: CONSTITUTION
last_validated: 2026-10-14
prd_version: 1.0.1
---

# System Components

The Actions lens owns the workflow, the result record, the release gate, and the fix pull request. The harness-adapter lens owns install and grade for each CLI.

## Workflow, gate, and fix

### harness-eval workflow

File .github/workflows/harness-eval.yml. Triggers are schedule (published only), workflow_dispatch (checkout by default, published selectable), and push to main with the plugin path filter (checkout). Banned events are pull_request, pull_request_target, and workflow_run. Follow the authoritative trigger/mode and run-selection tables in [API Design](04-api-design.md). Resolve refs and pins once before fan-out. Default permissions are empty. Concurrency group harness-eval does not cancel an in-progress run. Runner is GitHub-hosted ubuntu-latest, one fresh VM per job. No self-hosted secret-bearing workspace, OIDC, cloud deploy, or publishing.

### drift-proof job

No environment and no API keys. permissions contents: read. Runs the existing release proof and uploads a drift record. Failure means a rule moved. It does not grade harnesses and does not start a fix. Package-manager cache is allowed only on this job because it holds no secrets.

### smoke matrix

Twelve cells: six harnesses by pinned and newest. fail-fast is false. Environment harness-smoke. permissions contents: read. No cache. Install and load steps receive no key. The smoke step for that cell is the only step with that harness key. The job uploads the grade file, the event stream, and any verify report even when the process exits non-zero. It does not decide the grade from the exit code.

### grade recorder

No environment. permissions contents: read and actions: read (to obtain trusted run/job metadata). Runs even if smoke or drift failed. Validates grade and event schemas, InstallationIdentity, complete mapping coverage, and twelve unique cells; builds harness-eval-result.json and the Actions summary. Copies actual smoke-job timestamps from GitHub; missing timestamps block. Uploads the logical result and both planted/clean verify reports under run/attempt-qualified physical names with overwrite disabled for 90 days. Retains the immutable upload artifact ID/digest and attempt-specific recorder job/upload provenance for release binding. Retention does not extend the 36-hour authorization lifetime. Exits non-zero for a live pinned failure or could-not-run, zero for newest-only graded failures. Later checks never affect that exit. Correct planted detection is a pass, not a product failure. Mode and candidate eligibility remain explicit.

### pinned-channel status job

No environment or harness secrets. permissions contents: read, actions: read, statuses: write. Before writing, resolves the authoritative run/attempt for the same SHA and mode so an older completion cannot replace a newer status. Writes harness-eval/pinned and harness-eval/drift with mode, run ID, and attempt in the target link/description. A published success is compatibility-only. A checkout success is eligible only through the release resolver's freshness, provenance, and hold checks. The resolver paginates all status records and selects the exact matching checkout run/attempt/mode; combined/latest-per-context status is forbidden because published and checkout may share a SHA. Does not wait for the fixer.

### release gate

scripts/release.mjs publish and a gate job in tag-release.yml share the deterministic resolver in [API Design](04-api-design.md). permissions contents: read and actions: read; no model or app secrets. Verify repository/workflow/event/branch metadata through GitHub, select the latest qualifying checkout run/attempt for the publish SHA, require its exact status/artifact and plugin identity, enforce 36 hours, and honor published compatibility holds. Missing/incomplete/untrusted evidence refuses release. Repeat local drift proof and recheck authority immediately before publishing. A green workflow or status alone cannot authorize publish. ci.yml does not acquire these secrets or this responsibility.

### fix-agent job

Select only newest evaluated fail checks, never pinned failures or could-not-run. Resolve current main as repair_base_sha and reproduce motivating failures there using the original resolved harness versions; if absent, record not-reproduced and stop. Environment heal-agent. A preparation step may read the repository with contents: read and persist-credentials false. Invoke the exact pinned Claude Code CLI directly, not anthropics/claude-code-action. The model process receives only ANTHROPIC_API_KEY, no GitHub/App/OIDC token, persisted git credential, or credential helper. It has restricted local read/edit tools, no network tool, and the turn/budget caps. Model-provider transport is the only required external access. Record the actual invocation/tool restrictions and prove them on a real hosted job before enabling healing. Upload the diff; do not open a PR.

### patch recheck job

No secrets. permissions contents: read. Checks out repair_base_sha with persist-credentials false. The plugin-root allowlist resolves only to plugins/pixel-perfect/harness/*.json and plugins/pixel-perfect/skills/**. Reject traversal, symlinks, mode changes, diffs over 100000 bytes, paths outside that set, edits to tests, fixtures, graders, validators, CI, workflows, adapter scripts, or scripts/release.mjs, and fixture names added to plugin source. Record accepted patch SHA-256. Use the same normalized repository-relative paths during generation, recheck, confirmation, and application; never widen the allowlist.

### confirming run

Environment harness-smoke. permissions contents: read. No cache. Fresh checkout of repair_base_sha plus only the accepted patch. Copy graders, pins, and fixtures from the unpatched base aside before applying the patch. Use original resolved CLI versions and the same credential rule as smoke. Re-run all twelve cells: motivating newest failures become pass, prior required passes stay pass, no required check becomes could-not-run, planted defects remain detected without repair, and clean twins pass. Bind results to base SHA and patch digest. Ineffective/no-op patches, regressions, or missing controls open no PR. An independent pinned failure may remain a recorded release block; it is never converted to a pass by the newest repair.

### heal pull-request job

Environment heal-pr only. permissions contents: read for GITHUB_TOKEN. Mint an installation token with SHA-pinned actions/create-github-app-token for app id 5156617. Verify main still equals repair_base_sha; on base-moved stop and require a new reproduction/recheck/confirmation, without silent rebase. Consume only the exact confirmed patch. Push heal/<run_id> and open one PR targeting main with original failure and confirmation evidence. Never merge, tag, or publish. The app is repository-scoped with contents write and pull requests write, no Actions/secrets permission; never print its token.

Before enabling this job, the repository owner must activate and verify a main-branch update restriction. Designated human maintainers have bypass authority; the heal app has none. Do not apply that restriction to heal/* branches. A real app-token merge attempt must be denied while a designated human can merge or reject in GitHub. Missing rule or missing proof disables healing and reports a blocker, without changing the newest-only release warning. This is a deployment prerequisite, not a claim about today's repository settings.

### CLI invocation boundary

Another lens owns how Claude Code, Codex, Grok, OpenCode, Pi, and Cursor are installed, how pinned and newest versions are chosen, and every CLI flag, including the single resume-with-text path. This workflow only schedules that work, places keys on smoke steps, and reads the grade file, the event stream, and the verify report. It does not design per-CLI flags.

## Per-harness invocation

### invocation-guard

Harness: all.

Applies the rules shared by every model call. It refuses to start when that harness's API key is missing and records could-not-run with reason missing-api-key. It refuses to start when no permission stance is recorded for that harness. It closes stdin with </dev/null, wraps the process in timeout, and uses a streaming output format so a question can be seen before exit. It namespaces a saved session id by harness. It does not treat exit code 0, a Codex type of error, a Claude Code subtype of success, or is_error false as a verdict. It does not pass grok --trust in any step that holds an API key.

### version-lookup

Harness: all.

Resolves the newest version without installing. Codex, Claude Code, Pi, and OpenCode use npm view on @openai/codex, @anthropic-ai/claude-code, @earendil-works/pi-coding-agent, and opencode-ai. Grok uses curl -fsSL https://x.ai/cli/stable. Cursor parses the first downloads.cursor.com/lab/<version> token from https://cursor.com/install. The observed versions on 2026-10-06 were Codex 0.160.1, Claude Code 2.1.291, Grok 1.0.46, Pi 1.0.4, OpenCode 1.18.34, and Cursor 2026.10.01-e373342. Those values are not a support promise. The grade records the version that was actually installed. A lookup failure makes the newest track could-not-run. test/harness/pins.json is the sole pinned authority; these historical observations do not populate qualified pins automatically. Each resolved version is frozen once per run and checked against the installed CLI.

### codex-adapter

Harness: Codex.

Surveyed CLI 0.160.0, with newest lookup 0.160.1. Installs npm install -g @openai/codex@<version>. Published mode follows the INSTALL.md mechanism but binds it to the run-resolved release revision; default-branch fallback is forbidden. Checkout mode runs codex plugin marketplace add on the workspace and codex plugin add pixel-perfect@pixel-perfect. Both plugin commands are untested. The running skills come from ~/.codex/plugins/cache/pixel-perfect/pixel-perfect/<version>, not from the working tree, so checkout mode must install before the run and verify the loaded content manifest; a stale cache is could-not-run, never candidate evidence. Lists commands with no model call: codex debug prompt-input 'x', then the pixel-perfect:[a-z-]* names. That returned 13 names. Runs codex exec with the prompt single-quoted so $pixel is not expanded, for example '$pixel-perfect:verify --platform web-desktop', plus --json, -o for the reply, stdin closed, and the case timeout. Status uses --sandbox read-only. Verify uses --sandbox workspace-write. Adds --skip-git-repo-check only when the work directory is not a git repo. Sets CODEX_API_KEY on the exec step only. A JSON item of type error is a warning unless a file or reply check fails. Hosted-runner sandbox support needs unprivileged user namespaces. The exec resume path is untested.

### claude-code-adapter

Harness: Claude Code.

Surveyed CLI 2.1.291, which was also the newest lookup. Installs npm install -g @anthropic-ai/claude-code@<version> with DISABLE_AUTOUPDATER=1. Published mode follows the INSTALL.md mechanism but binds it to the run-resolved release revision; default-branch fallback is forbidden. Checkout mode runs claude plugin marketplace add on the workspace and claude plugin install pixel-perfect@pixel-perfect. Both plugin commands are untested. Lists commands with no model call via claude plugin details pixel-perfect, then dedupes. The printed skills are the 11 names twice plus polish and process-context. Graded runs use claude -p "/pixel-perfect:<name>" with fixture args in that prompt, --output-format stream-json --verbose, stdin closed, and the case timeout. The reply is the result field. The run is could-not-run unless the system/init event lists pixel-perfect under plugins, because -p can enter bare mode and skip plugins. A recorded stance is required. The candidate is --permission-mode dontAsk plus --add-dir of the plugin root. That candidate is untested and is not claimed to clear denials. bypassPermissions is not adopted. The assembled Bash(node *) allow list is not evidence that reads succeed. Under --permission-mode default, a checked run ended subtype success and is_error false while reads of workflows/RUNTIME-CONTRACT.md and workflows/status.md were denied. Denied required reads are fail, not a pass. ANTHROPIC_API_KEY is the key. The turn ending is not the question signal. --max-turns is a backstop only.

### grok-adapter

Harness: Grok.

Surveyed CLI 1.0.46, which was also the newest stable lookup. Installs with curl -fsSL https://x.ai/cli/install.sh | bash -s <version>, puts $HOME/.grok/bin on the path, and sets GROK_DISABLE_AUTOUPDATER=1. A Linux x64 binary exists, but no Linux install has been run. Published mode follows the INSTALL.md mechanism but binds it to the run-resolved release revision; default-branch fallback is forbidden. Checkout mode runs grok plugin install ./plugins/pixel-perfect. That command is untested. --trust may be considered only in a separate install step that has no API key. A step that holds XAI_API_KEY must not pass --trust. Lists commands with no model call: grok inspect --json, keeping skills whose source.plugin_name is pixel-perfect. That returned 13 names. Runs grok -p "/pixel-perfect:<name>" with fixture args in that prompt, --output-format streaming-json, stdin closed, and the case timeout. The reply is .text. A recorded stance is required. Modes that exist are default, acceptEdits, auto, dontAsk, bypassPermissions, and plan, and --allow adds rules. bypassPermissions is not adopted. This Mac's Grok config approves every tool call, so the runner default was not observed and must not be copied. A checked probe with a 6-turn cap ran about two minutes, exited 1 at the cap, and still wrote JSON. A cap exit is not a pass. The turn ending is not the question signal, because Grok tells the model to continue.

### pi-adapter

Harness: Pi.

Surveyed CLI and repo pin 0.84.4. Newest lookup was 1.0.4, and pixel-perfect's own status is unproven on both. Installs npm install -g --ignore-scripts @earendil-works/pi-coding-agent@<version>. pnpm exec pi is allowed only if its observed version equals the resolved test/harness/pins.json value. Requires Node 22.19 or newer. On 1.0.x, and on every model run here, pass --model provider/id. Published mode installs the run-resolved release tag without resolving newest again. Checkout mode runs pi install on plugins/pixel-perfect with stdin closed. The repo CI already uses that install path. SMOKE_PI_KEY maps to GEMINI_API_KEY for provider google; exact provider/model is recorded in pins. No login-cache or alternate credential fallback is permitted. Before a model run, preflight with pi auth check --provider <name> --json. Lists commands with no model call and no key: a get_commands request on pi --mode rpc --no-session --offline, keeping skill commands whose source path starts at the installed plugin root. That returned the 11 names. The check still asserts presence, not a length of 11. For first checks only, runs pi --mode json --no-session --model "$PI_MODEL" "/skill:pixel-perfect-<name>" with fixture args in that prompt, stdin closed, and the case timeout. The hyphenated skill form is taken from /skill:pixel-perfect-status and is untested for the other names. Pi waits for stdin to close. JSON mode exits 0 when the model call fails, so on a normally completing invocation a missing last assistant message_end, or stopReason other than stop, is could-not-run. The intentional boundary-stop exception in InvocationCapture applies when the runner stops on an observed question: grade the complete captured prefix, without requiring or fabricating a later native message_end. Pi has no approval prompts and no sandbox. The turn can end when the model prints a question. The question signal is still the stream text, not the exit code.

### opencode-adapter

Harness: OpenCode.

Surveyed CLI 1.18.34, which was also the newest lookup. Installs npm install -g opencode-ai@<version> with OPENCODE_DISABLE_AUTOUPDATE=1. The binary name is opencode. Published mode runs the INSTALL.md per-project mechanism for the run-resolved release tag. That block clones the whole repository into .pixel-perfect/ inside the working directory, before the before-hash. Checkout mode has no command in the evidence and is could-not-run. Lists commands with no model call and no secret by listing .opencode/commands/*.md and reading the file stems. If that directory is missing, the list grade is could-not-run, not fail. opencode debug config also exposes the command map, but it prints provider config, so it is not used in a step that holds a key. Headless runs use opencode run --command <name> --model provider/model --format json, with stdin closed and the case timeout. A slash message such as /status is literal text and does not run the command. A scratch --command run worked. pixel-perfect status has not been run. Where fixture args such as --platform web-desktop go is not in the evidence, so any case with args, including verify, is could-not-run on OpenCode until the join is known. The reply field name is not in the evidence. File checks still grade. An @reply text check is could-not-run until a captured stream names the field. A bare Button match in an existing design file is not detection evidence; VerifyReport requires observed invocation-bound output/tool evidence. run rejects every ask unless --auto is passed. --auto is not adopted. The candidate stance is OPENCODE_PERMISSION set to explicit rules. There is no ephemeral flag, so leftover sessions are not a grade signal. The provider key is a key such as ANTHROPIC_API_KEY.

### cursor-adapter

Harness: Cursor.

No Cursor CLI is installed on the maintainer Mac, and this adapter must not run the Cursor installer there. The installer relinks ~/.local/bin/agent, which is Grok. Cursor is proven only on a runner. Newest lookup parses https://cursor.com/install. The looked-up version was 2026.10.01-e373342. Install on a runner is the install script, or, to pin, the linux/x64 agent-cli-package.tar.gz from downloads.cursor.com/lab/<version>/, then a link, as the installer does. Both are unproven on Linux. Published mode keeps the INSTALL.md copy of the run-resolved release tag and also passes --plugin-dir. Checkout mode copies the workspace plugin and passes --plugin-dir. Reports conflict on whether the CLI reads ~/.cursor/plugins/local by itself. CURSOR_API_KEY is required and is absent from the harness-smoke environment. A missing key is could-not-run. No no-model command list exists, so the list grade is could-not-run and a model call must not replace it. Headless /name resolves against skills, not commands/. All 11 commands have a same-named skill. The assembled run is untested: timeout plus cursor-agent -p --trust --force --disable-auto-update --plugin-dir "$HOME/.cursor/plugins/local/pixel-perfect" --model "$CURSOR_MODEL" --output-format stream-json "/status", stdin closed. This design does not adopt --trust or --force. Until security records a stance and a runner trial exists, live model grades stay could-not-run. The call is cursor-agent, not agent. The prompt form, if a trial is authorized, is "/<name>" plus fixture args. The reply field is unnamed. The turn ending is not the question signal, because Cursor tells the model that questions were skipped. Headless runs have hung in GitHub Actions before, so a timeout is could-not-run, not a pass.

### fixture-grader

Copies test/harness/kit/project into fresh invocation directories; never runs the fixture in place. Install and identity verification finish before the before-hash. Protect manifest, goldens, sandbox, src, and package files; declare harness debris exclusions explicitly. Status requires both unchanged hashes and exact seeded platform/phase/gate/inventory facts from StatusCase. Verify uses VerifyPair: actual structural-only public verify, canonical defect atoms/Button/default, staged text capture, planted gate left pending, and clean control. Expected defect detection plus valid evidence and clean pass earns evaluation pass. The evaluator writes reports only at the case-declared paths and validates their evidence bindings; no any-new-file fallback. Run the grader without model keys, and fail if fixture source changed. See [Data Schema](03-data-schema.md) for outcome, report, and screenshot-observation rules.

### oracle-precheck

Harness: all.

Runs plugins/pixel-perfect's verify-catalog.mjs with no model and no API key before live verify. The drift arguments are --check . --platform web-desktop --json. The drift must exit 1 and include drifted[].key atoms/Button/default. The clean project must exit 0. This script already did that on a scratch copy of consumer-web: baseline exit 0, clean exit 0, and exit 1 after label=DRIFTED was appended to Button's story. If the oracle does not match, the live harness result is could-not-run.

### question-boundary

Use the canonical incremental stdout facts, not home session files or a terminal. For list/status/verify, the first question fails and stops the check. For the independent FirstQuestionCase, run init on the empty fixture without automatic answers, retain the prefix through the first valid USER_CHOICE, stop immediately, and send nothing. Permit bounded local reads/listing only before the question. Search, install, render, child model dispatch, or file changes before it fail. Missing question or malformed shape fails when capture is complete; missing required mapping/capture is could-not-run. Question-tool starts and incremental text are the boundary, never exit or final reply alone.

### stream-grader

Validate per-harness/version mapping coverage before using a stream as grade evidence. Store raw events losslessly as original_event; normalize incremental text, tool starts/results, question calls, permission denials, session identity, completion, and child invocation links according to CanonicalEvent. Existing Claude init/denial, Codex reply, Grok text, and Pi message mappings are partial research evidence, not full qualification. Unknown lines remain harness_specific; an unmapped required fact makes the check could-not-run. A Claude success subtype, Codex error item, or exit 0 is not a verdict. Track the full verification child tree for forbidden image judging. Missing observation is not absence.

### resume-with-text

Later checks only. Persist an isolated native session before stopping the first process. Record its namespaced ID, session directory, fixture identity, and original question header. Pi later invocations omit --no-session; the first checks still use it. Resume that same conversation in a separate process with one matching plain-text answer, stdin closed, timeout, and the same stance. Require context-dependent continuation using facts that are not repeated in the answer. Missing state is could-not-run; never fall back to a new conversation. Capture evidence before cleanup. Per-version argv remains an explicit implementation proof prerequisite for all six harnesses, not guessed here.

### grade-writer

Harness: all.

Writes one grade file per harness, version track, install mode, and check. It writes a temp file in the grade directory, fsyncs it, renames it in the same directory, and reads it back. The read-back must match verdict, harness, version, track, and check id. A mismatch or a partial file is could-not-run, not a pass. The stored exit code cannot become the verdict. The writer holds no API key.
