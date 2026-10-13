---
stability: CONSTITUTION
last_validated: 2026-10-13
prd_version: 1.0.0
---

# System Components

The Actions lens owns the workflow, the result record, the release gate, and the fix pull request. The harness-adapter lens owns install and grade for each CLI.

## Workflow, gate, and fix

### harness-eval workflow

File .github/workflows/harness-eval.yml. Triggers are schedule, workflow_dispatch, and push to main with the plugin path filter. Banned events are pull_request, pull_request_target, and workflow_run. Default permissions are empty. Concurrency group harness-eval does not cancel an in-progress run. Runner is GitHub-hosted ubuntu-latest, one fresh VM per job, because secret-bearing jobs must not use a self-hosted workspace. No OIDC and no cloud deploy. This workflow never publishes.

### drift-proof job

No environment and no API keys. permissions contents: read. Runs the existing release proof and uploads a drift record. Failure means a rule moved. It does not grade harnesses and does not start a fix. Package-manager cache is allowed only on this job because it holds no secrets.

### smoke matrix

Twelve cells: six harnesses by pinned and newest. fail-fast is false. Environment harness-smoke. permissions contents: read. No cache. Install and load steps receive no key. The smoke step for that cell is the only step with that harness key. The job uploads the grade file, the event stream, and any verify report even when the process exits non-zero. It does not decide the grade from the exit code.

### grade recorder

No environment. permissions contents: read. Runs even if smoke or drift failed. Builds harness-eval-result.json from files and event streams, writes the Actions summary, and uploads artifact harness-eval-result for 90 days plus verify reports. Exits non-zero when the live release rule fails. Exits zero when the only live reds are newest graded failures. Ignores later-check failures when choosing that exit.

### pinned-channel status job

No environment and no harness secrets. permissions contents: read and statuses: write. Writes harness-eval/pinned and harness-eval/drift on the graded SHA. Does not wait for the fixer. success on the pinned context means the live release rule allows publish. The description separates a newest warning from a pinned block and from drift.

### release gate

scripts/release.mjs publish and a gate job in tag-release.yml. permissions on that job are contents: read and actions: read. No harness, Anthropic, or app secrets. Reads the pinned commit status and the harness-eval-result artifact for the publish SHA. Refuses when the probe is red or missing. Does not treat a green workflow conclusion as a pass. Does not replace the local drift proof. Publish jobs need this gate. ci.yml is not given this duty and is not given these secrets.

### fix-agent job

Runs only for newest cells whose grade is fail. Environment heal-agent. permissions contents: read. Uses SHA-pinned anthropics/claude-code-action with the Anthropic key, no GitHub token, no network tool, and the turn and budget caps. Uploads the diff as an artifact. Does not open the pull request.

### patch recheck job

No secrets. permissions contents: read. Checks out the graded base SHA with persist-credentials false. Rejects symlinks, mode changes, diffs over 100000 bytes, paths outside harness/*.json and skills/**, edits to tests, fixtures, graders, validators, CI, or scripts/release.mjs, and fixture names added to plugin source. Does not widen that allowlist.

### confirming run

Environment harness-smoke. permissions contents: read. No cache. Fresh checkout of the same base SHA, then the accepted patch only. Graders and fixtures come from the base branch, copied aside before the patch is applied. Same key rule as smoke. Must report planted defects still red. Does not open a pull request when that fails or when it could not run.

### heal pull-request job

Environment heal-pr only. permissions contents: read for GITHUB_TOKEN. Mints an installation token with SHA-pinned actions/create-github-app-token for app id 5156617. Pushes branch heal/<run_id> and opens one pull request. Does not merge, tag, or publish. The app is limited to this repository, contents write and pull requests write, with no Actions and no secrets permission. The token is not printed.

### CLI invocation boundary

Another lens owns how Claude Code, Codex, Grok, OpenCode, Pi, and Cursor are installed, how pinned and newest versions are chosen, and every CLI flag, including the single resume-with-text path. This workflow only schedules that work, places keys on smoke steps, and reads the grade file, the event stream, and the verify report. It does not design per-CLI flags.

## Per-harness invocation

### invocation-guard

Harness: all.

Applies the rules shared by every model call. It refuses to start when that harness's API key is missing and records could-not-run with reason missing-api-key. It refuses to start when no permission stance is recorded for that harness. It closes stdin with </dev/null, wraps the process in timeout, and uses a streaming output format so a question can be seen before exit. It namespaces a saved session id by harness. It does not treat exit code 0, a Codex type of error, a Claude Code subtype of success, or is_error false as a verdict. It does not pass grok --trust in any step that holds an API key.

### version-lookup

Harness: all.

Resolves the newest version without installing. Codex, Claude Code, Pi, and OpenCode use npm view on @openai/codex, @anthropic-ai/claude-code, @earendil-works/pi-coding-agent, and opencode-ai. Grok uses curl -fsSL https://x.ai/cli/stable. Cursor parses the first downloads.cursor.com/lab/<version> token from https://cursor.com/install. The observed versions on 2026-10-06 were Codex 0.160.1, Claude Code 2.1.291, Grok 1.0.46, Pi 1.0.4, OpenCode 1.18.34, and Cursor 2026.10.01-e373342. Those values are not a support promise. The grade records the version that was actually installed. A lookup failure makes the newest track could-not-run.

### codex-adapter

Harness: Codex.

Surveyed CLI 0.160.0, with newest lookup 0.160.1. Installs npm install -g @openai/codex@<version>. Published mode runs the INSTALL.md default-branch block. Checkout mode runs codex plugin marketplace add on the workspace and codex plugin add pixel-perfect@pixel-perfect. Both plugin commands are untested. The running skills come from ~/.codex/plugins/cache/pixel-perfect/pixel-perfect/<version>, not from the working tree, so checkout mode must install before the run and can still be stale. Lists commands with no model call: codex debug prompt-input 'x', then the pixel-perfect:[a-z-]* names. That returned 13 names. Runs codex exec with the prompt single-quoted so $pixel is not expanded, for example '$pixel-perfect:verify --platform web-desktop', plus --json, -o for the reply, stdin closed, and the case timeout. Status uses --sandbox read-only. Verify uses --sandbox workspace-write. Adds --skip-git-repo-check only when the work directory is not a git repo. Sets CODEX_API_KEY on the exec step only. A JSON item of type error is a warning unless a file or reply check fails. Hosted-runner sandbox support needs unprivileged user namespaces. The exec resume path is untested.

### claude-code-adapter

Harness: Claude Code.

Surveyed CLI 2.1.291, which was also the newest lookup. Installs npm install -g @anthropic-ai/claude-code@<version> with DISABLE_AUTOUPDATER=1. Published mode runs the INSTALL.md default-branch block. Checkout mode runs claude plugin marketplace add on the workspace and claude plugin install pixel-perfect@pixel-perfect. Both plugin commands are untested. Lists commands with no model call via claude plugin details pixel-perfect, then dedupes. The printed skills are the 11 names twice plus polish and process-context. Graded runs use claude -p "/pixel-perfect:<name>" with fixture args in that prompt, --output-format stream-json --verbose, stdin closed, and the case timeout. The reply is the result field. The run is could-not-run unless the system/init event lists pixel-perfect under plugins, because -p can enter bare mode and skip plugins. A recorded stance is required. The candidate is --permission-mode dontAsk plus --add-dir of the plugin root. That candidate is untested and is not claimed to clear denials. bypassPermissions is not adopted. The assembled Bash(node *) allow list is not evidence that reads succeed. Under --permission-mode default, a checked run ended subtype success and is_error false while reads of workflows/RUNTIME-CONTRACT.md and workflows/status.md were denied. Denied required reads are fail, not a pass. ANTHROPIC_API_KEY is the key. The turn ending is not the question signal. --max-turns is a backstop only.

### grok-adapter

Harness: Grok.

Surveyed CLI 1.0.46, which was also the newest stable lookup. Installs with curl -fsSL https://x.ai/cli/install.sh | bash -s <version>, puts $HOME/.grok/bin on the path, and sets GROK_DISABLE_AUTOUPDATER=1. A Linux x64 binary exists, but no Linux install has been run. Published mode runs the INSTALL.md default-branch block. Checkout mode runs grok plugin install ./plugins/pixel-perfect. That command is untested. --trust may be considered only in a separate install step that has no API key. A step that holds XAI_API_KEY must not pass --trust. Lists commands with no model call: grok inspect --json, keeping skills whose source.plugin_name is pixel-perfect. That returned 13 names. Runs grok -p "/pixel-perfect:<name>" with fixture args in that prompt, --output-format streaming-json, stdin closed, and the case timeout. The reply is .text. A recorded stance is required. Modes that exist are default, acceptEdits, auto, dontAsk, bypassPermissions, and plan, and --allow adds rules. bypassPermissions is not adopted. This Mac's Grok config approves every tool call, so the runner default was not observed and must not be copied. A checked probe with a 6-turn cap ran about two minutes, exited 1 at the cap, and still wrote JSON. A cap exit is not a pass. The turn ending is not the question signal, because Grok tells the model to continue.

### pi-adapter

Harness: Pi.

Surveyed CLI and repo pin 0.84.4. Newest lookup was 1.0.4, and pixel-perfect's own status is unproven on both. Installs npm install -g --ignore-scripts @earendil-works/pi-coding-agent@<version>. The repo pin can instead be pnpm exec pi. Requires Node 22.19 or newer. On 1.0.x, and on every model run here, pass --model provider/id. Published mode runs the INSTALL.md newest-tag block. Checkout mode runs pi install on plugins/pixel-perfect with stdin closed. The repo CI already uses that install path. The key is one provider key. The scope's SMOKE_PI_KEY is a Gemini key. Before a model run, preflight with pi auth check --provider <name> --json. Lists commands with no model call and no key: a get_commands request on pi --mode rpc --no-session --offline, keeping skill commands whose source path starts at the installed plugin root. That returned the 11 names. The check still asserts presence, not a length of 11. Runs pi --mode json --no-session --model "$PI_MODEL" "/skill:pixel-perfect-<name>" with fixture args in that prompt, stdin closed, and the case timeout. The hyphenated skill form is taken from /skill:pixel-perfect-status and is untested for the other names. Pi waits for stdin to close. JSON mode exits 0 when the model call fails, so a missing last assistant message_end, or stopReason other than stop, is could-not-run. Pi has no approval prompts and no sandbox. The turn can end when the model prints a question. The question signal is still the stream text, not the exit code.

### opencode-adapter

Harness: OpenCode.

Surveyed CLI 1.18.34, which was also the newest lookup. Installs npm install -g opencode-ai@<version> with OPENCODE_DISABLE_AUTOUPDATE=1. The binary name is opencode. Published mode runs the INSTALL.md per-project block for the newest tag. That block clones the whole repository into .pixel-perfect/ inside the working directory, before the before-hash. Checkout mode has no command in the evidence and is could-not-run. Lists commands with no model call and no secret by listing .opencode/commands/*.md and reading the file stems. If that directory is missing, the list grade is could-not-run, not fail. opencode debug config also exposes the command map, but it prints provider config, so it is not used in a step that holds a key. Headless runs use opencode run --command <name> --model provider/model --format json, with stdin closed and the case timeout. A slash message such as /status is literal text and does not run the command. A scratch --command run worked. pixel-perfect status has not been run. Where fixture args such as --platform web-desktop go is not in the evidence, so any case with args, including verify, is could-not-run on OpenCode until the join is known. The reply field name is not in the evidence. File checks still grade. An @reply text check is could-not-run until a captured stream names the field. Button may still match a design markdown file. run rejects every ask unless --auto is passed. --auto is not adopted. The candidate stance is OPENCODE_PERMISSION set to explicit rules. There is no ephemeral flag, so leftover sessions are not a grade signal. The provider key is a key such as ANTHROPIC_API_KEY.

### cursor-adapter

Harness: Cursor.

No Cursor CLI is installed on the maintainer Mac, and this adapter must not run the Cursor installer there. The installer relinks ~/.local/bin/agent, which is Grok. Cursor is proven only on a runner. Newest lookup parses https://cursor.com/install. The looked-up version was 2026.10.01-e373342. Install on a runner is the install script, or, to pin, the linux/x64 agent-cli-package.tar.gz from downloads.cursor.com/lab/<version>/, then a link, as the installer does. Both are unproven on Linux. Published mode keeps the INSTALL.md copy of the newest tag and also passes --plugin-dir. Checkout mode copies the workspace plugin and passes --plugin-dir. Reports conflict on whether the CLI reads ~/.cursor/plugins/local by itself. CURSOR_API_KEY is required and is absent from the harness-smoke environment. A missing key is could-not-run. No no-model command list exists, so the list grade is could-not-run and a model call must not replace it. Headless /name resolves against skills, not commands/. All 11 commands have a same-named skill. The assembled run is untested: timeout plus cursor-agent -p --trust --force --disable-auto-update --plugin-dir "$HOME/.cursor/plugins/local/pixel-perfect" --model "$CURSOR_MODEL" --output-format stream-json "/status", stdin closed. This design does not adopt --trust or --force. Until security records a stance and a runner trial exists, live model grades stay could-not-run. The call is cursor-agent, not agent. The prompt form, if a trial is authorized, is "/<name>" plus fixture args. The reply field is unnamed. The turn ending is not the question signal, because Cursor tells the model that questions were skipped. Headless runs have hung in GitHub Actions before, so a timeout is could-not-run, not a pass.

### fixture-grader

Harness: all.

Copies test/harness/kit/project into a fresh work directory, applies overlays/button-drift for the drift case, and never runs the fixture in place. Install finishes before the before-hash. The status hash set is the fixture files, excluding harness debris such as .pixel-perfect/ and .opencode/. For verify-button-drift it requires the staged capture design/.captures/web-desktop/atoms/Button/default.txt, platforms.web-desktop.gates.molecules equal to pending, the name Button in the reply or in design/*.md, and unchanged hashes for design/manifest.json, design/goldens/**, sandbox/**, src/**, and package.json. The pending value is the seeded value. Verify must not write it. It also requires a failure report, detected as a new fixture file outside the capture and harness debris, until the contract names the path. The clean twin, verify-clean, passes only when live verify passes. The grader then runs with no API key and fails if test/harness changed. OpenCode's cloned repository sits in the work directory once a tag contains the fixture, so the hash exclusion matters.

### oracle-precheck

Harness: all.

Runs plugins/pixel-perfect's verify-catalog.mjs with no model and no API key before live verify. The drift arguments are --check . --platform web-desktop --json. The drift must exit 1 and include drifted[].key atoms/Button/default. The clean project must exit 0. This script already did that on a scratch copy of consumer-web: baseline exit 0, clean exit 0, and exit 1 after label=DRIFTED was appended to Button's story. If the oracle does not match, the live harness result is could-not-run.

### question-boundary

Harness: all.

Tails the stdout capture by byte offset. It does not watch home-directory session files and does not read a terminal. For ask-nothing cases, the first question fails the check and the process is stopped. For must-ask cases, it keeps the prefix up to the first question, stops the process, and fails the prefix if it contains a search, install, render, or file-changing tool call. A printed question is an agent_message. A question tool is a tool_call. Both are recognized with the contract's question-shape rules, not with a new event type. Process exit is never the question signal on Claude Code, Grok, or Cursor. Grok's continue instruction and Cursor's skipped-question result are harness-specific and are not answers. Codex's question tool returns an error and the model may continue. The grade still stops at the tool call. No must-ask case file is in the evidence.

### stream-grader

Harness: all.

Reads the captured stream and stores every raw object on originalEvent. Known mappings are: Claude Code system/init to session_started, Claude Code denials to permission_denied, Claude Code result text to agent_message, and Claude Code subtype success to a field on session_ended rather than to a pass. Codex type error maps to harness_specific, and the -o file maps to agent_message. Grok .text maps to agent_message. Pi assistant text maps to agent_message, and Pi message_end maps to session_ended. Its stopReason must be stop or the model call is could-not-run. Unmapped lines, including OpenCode and Cursor streams, stay harness_specific. This design did not read raw session files. A missing Claude Code plugin in system/init is could-not-run. Denied required reads are fail.

### resume-with-text

Harness: all.

Phase two only. One path for every harness: resume the namespaced native session and send one plain-text answer, with stdin closed, the case timeout, the same stance, and the same file and stream grade. The research names the flags --resume, exec resume, --session, and --continue, but it does not assign a flag to a harness. The exact argv is untested everywhere, so this component does not invent one. A missing assignment is could-not-run, not a pass. Recorded answers match the user_choice header. A question with no matching answer fails that run. This path is not used for the command list, status, or verify. It does not publish or open a pull request.

### grade-writer

Harness: all.

Writes one grade file per harness, version track, install mode, and check. It writes a temp file in the grade directory, fsyncs it, renames it in the same directory, and reads it back. The read-back must match verdict, harness, version, track, and check id. A mismatch or a partial file is could-not-run, not a pass. The stored exit code cannot become the verdict. The writer holds no API key.
