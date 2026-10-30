---
stability: CONSTITUTION
last_validated: 2026-10-30
prd_version: 2.0.0
---

# External Dependencies

| Dependency | Used by | Documentation |
|------------|---------|---------------|
| GitHub Actions workflows, environments, concurrency, artifacts, and job summaries | harness-eval workflow, smoke matrix, grade recorder, confirming run | https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions |
| GitHub Actions security hardening and SHA pinning | harness-eval workflow, fix-agent job, heal pull-request job | https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions |
| GitHub Actions environments harness-smoke, heal-agent, and heal-pr | smoke matrix, confirming run, fix-agent job, heal pull-request job | https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment |
| GitHub commit statuses API | pinned-channel status job and release gate | https://docs.github.com/en/rest/commits/statuses |
| GitHub issues and issue comments APIs | issue job | https://docs.github.com/en/rest/issues/issues |
| change-request skill: issue template and secret scan, as byte copies with recorded digests | issue job | https://github.com/hackerpug-ai/brain/tree/main/skills/change-request |
| GitHub Actions artifacts API | grade recorder and release gate | https://docs.github.com/en/rest/actions/artifacts |
| Pinned Claude Code CLI, direct programmatic execution | fix-agent job; no GitHub/OIDC token in model process | https://code.claude.com/docs/en/headless |
| GitHub branch rulesets: restrict updates and explicit bypass actors | human-only merge prerequisite | https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets#restrict-updates |
| actions/create-github-app-token | heal pull-request job | https://github.com/actions/create-github-app-token |
| actions/checkout, actions/upload-artifact, and actions/download-artifact | every job in harness-eval and the tag-release gate | https://github.com/actions/checkout |
| GitHub App pixel-perfect-heal app id 5156617 | heal pull-request job | https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/making-authenticated-api-requests-with-a-github-app |
| Actions retention for runs, statuses, and artifacts | release gate | https://github.blog/changelog/2026-10-01-actions-retention-now-covers-checks-runs-and-statuses |
| Codex version lookup: npm view @openai/codex version (checked) | version-lookup | https://www.npmjs.com/package/@openai/codex |
| Codex install: npm install -g @openai/codex@<version> (docs) | codex-adapter | https://www.npmjs.com/package/@openai/codex |
| Codex command list: codex debug prompt-input, 13 names (checked) | codex-adapter | https://www.npmjs.com/package/@openai/codex |
| Codex exec status with --json and -o; warnings use type error and exit 0 (agent-ran) | codex-adapter | https://www.npmjs.com/package/@openai/codex |
| Codex checkout plugin install: marketplace add workspace and plugin add pixel-perfect@pixel-perfect (untested) | codex-adapter | https://www.npmjs.com/package/@openai/codex |
| Codex hosted sandbox needs unprivileged user namespaces (docs) | codex-adapter | https://github.com/openai/codex-action |
| Claude Code version lookup: npm view @anthropic-ai/claude-code version (checked) | version-lookup | https://www.npmjs.com/package/@anthropic-ai/claude-code |
| Claude Code install: npm install -g @anthropic-ai/claude-code@<version> with DISABLE_AUTOUPDATER=1 (docs) | claude-code-adapter | https://www.npmjs.com/package/@anthropic-ai/claude-code |
| Claude Code command list: claude plugin details pixel-perfect (checked) | claude-code-adapter | https://www.npmjs.com/package/@anthropic-ai/claude-code |
| Claude Code default-mode run reports success while plugin workflow reads are denied (checked) | claude-code-adapter | https://code.claude.com/docs/en/sessions |
| Claude Code -p bare mode skips plugins; system/init lists loaded plugins (docs) | claude-code-adapter | https://www.npmjs.com/package/@anthropic-ai/claude-code |
| Claude Code checkout plugin install and the dontAsk --add-dir run (untested) | claude-code-adapter | https://www.npmjs.com/package/@anthropic-ai/claude-code |
| Grok version lookup: curl https://x.ai/cli/stable (checked) | version-lookup | https://x.ai/cli/stable |
| Grok install script and GROK_DISABLE_AUTOUPDATER=1 (docs) | grok-adapter | https://x.ai/cli/install.sh |
| Grok Linux x64 binary is published; Linux install was not run (checked) | grok-adapter | https://x.ai/cli/install.sh |
| Grok command list: grok inspect --json, 13 names (checked) | grok-adapter | https://x.ai/cli/install.sh |
| Grok -p /pixel-perfect:status loaded the skill; a 6-turn cap exited 1 with JSON on stdout (agent-ran) | grok-adapter | https://x.ai/cli/install.sh |
| Grok permission flags exist; the Mac default approves every tool and was not a clean observation (checked) | grok-adapter | https://x.ai/cli/install.sh |
| Grok checkout install: grok plugin install ./plugins/pixel-perfect (untested) | grok-adapter | https://x.ai/cli/install.sh |
| Pi version lookup: npm view @earendil-works/pi-coding-agent version (checked) | version-lookup | https://www.npmjs.com/package/@earendil-works/pi-coding-agent |
| Pi install: npm install -g --ignore-scripts @earendil-works/pi-coding-agent@<version>, Node 22.19 or newer (docs) | pi-adapter | https://www.npmjs.com/package/@earendil-works/pi-coding-agent |
| Pi command list: --mode rpc get_commands --offline, 11 skill names, no key (checked) | pi-adapter | https://www.npmjs.com/package/@earendil-works/pi-coding-agent |
| Pi /skill:<name> expands headless on a probe skill at 0.84.4; pixel-perfect status was not run (agent-ran) | pi-adapter | https://www.npmjs.com/package/@earendil-works/pi-coding-agent |
| Pi auth check --provider <name> --json (agent-ran) | pi-adapter | https://www.npmjs.com/package/@earendil-works/pi-coding-agent |
| Pi JSON mode exits 0 when the model call fails; Pi has no sandbox (docs) | pi-adapter | https://www.npmjs.com/package/@earendil-works/pi-coding-agent |
| OpenCode version lookup: npm view opencode-ai version (checked) | version-lookup | https://www.npmjs.com/package/opencode-ai |
| OpenCode install: npm install -g opencode-ai@<version> with OPENCODE_DISABLE_AUTOUPDATE=1 (docs) | opencode-adapter | https://www.npmjs.com/package/opencode-ai |
| OpenCode headless: opencode run --command <name> on a scratch command; slash text is not a command (agent-ran) | opencode-adapter | https://www.npmjs.com/package/opencode-ai |
| OpenCode OPENCODE_PERMISSION flag exists; --auto approves asks (checked) | opencode-adapter | https://www.npmjs.com/package/opencode-ai |
| OpenCode published install clones the whole repo into .pixel-perfect/; checkout command is unknown (docs) | opencode-adapter | https://www.npmjs.com/package/opencode-ai |
| OpenCode pixel-perfect status and fixture arg joining (untested) | opencode-adapter | https://www.npmjs.com/package/opencode-ai |
| Cursor version lookup from the installer page, latest seen 2026.10.01-e373342 (checked) | version-lookup | https://cursor.com/install |
| Cursor installer and pinned tarball https://downloads.cursor.com/lab/<version>/linux/x64/agent-cli-package.tar.gz (docs) | cursor-adapter | https://cursor.com/install |
| Cursor headless cursor-agent -p stream-json /status, including --trust --force (untested) | cursor-adapter | https://cursor.com/install |
| No Cursor CLI on the maintainer Mac; installer relinks ~/.local/bin/agent, which is Grok (checked) | cursor-adapter | https://cursor.com/install |
| Cursor headless /name resolves to a same-named skill; all 11 commands have a skill; no no-model list exists (checked) | cursor-adapter | https://cursor.com/install |
