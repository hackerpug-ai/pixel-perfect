# Install pixel-perfect

pixel-perfect is an agent skill for Claude Code, Codex, Cursor, Grok, OpenCode, and Pi. This page installs, upgrades, and removes it.

## If you are a coding agent

1. Find the section for the agent you are running as: [Claude Code](#claude-code), [Codex](#codex), [Cursor](#cursor), [Grok](#grok), [OpenCode](#opencode), or [Pi](#pi).
2. If you cannot tell which agent you are, ask the user. Do not guess.
3. Tell the user what the table below lists for your agent.
4. Run the section's install block as one command. Do not split it into separate commands. If it exits non-zero, stop and show the user its output.
5. Run the section's confirm command.
6. Give the user the section's next step. You cannot type slash commands, so every step here is a shell command.

## What this changes on your machine

Every install downloads from `github.com/hackerpug-ai/pixel-perfect`. None edits your shell profile or installs system software. The skill ships no hooks and no MCP servers.

| Agent | Files land in | What is registered |
|-------|---------------|--------------------|
| Claude Code | `~/.claude/plugins/` | The `pixel-perfect` marketplace and the `pixel-perfect@pixel-perfect` agent skill, in `~/.claude/settings.json` |
| Codex | `~/.codex/plugins/` and `~/.codex/.tmp/marketplaces/` | The `pixel-perfect` marketplace and agent skill, in `~/.codex/config.toml` |
| Cursor | `~/.cursor/plugins/local/pixel-perfect` | Nothing. Cursor reads the folder when it reloads. |
| Grok | `~/.grok/installed-plugins/` | An entry in `~/.grok/installed-plugins/registry.json`, and `pixel-perfect` in `[plugins].enabled` in `~/.grok/config.toml` |
| OpenCode | `.pixel-perfect/` (a git clone) and `.opencode/` in the current project | Two symlinks: `.opencode/commands` and `.opencode/skills` |
| Pi | `~/.pi/pixel-perfect` | One package path, in `~/.pi/agent/settings.json` |

Claude Code, Codex, and Grok track the repository's default branch. Cursor, OpenCode, and Pi install the newest release tag, which the install block looks up.

<a name="claude-code"></a>
## Claude Code

```bash
claude plugin marketplace add hackerpug-ai/pixel-perfect
claude plugin install pixel-perfect@pixel-perfect
```

- **Confirm:** run `claude plugin list | grep -A3 'pixel-perfect@'`. The output shows the version and `Status: ✔ enabled`.
- **Next step:** tell the user to restart Claude Code, open it in a project that has their design, and run `/pixel-perfect:init`.
- **Upgrade:** run `claude plugin marketplace update pixel-perfect`, then `claude plugin update pixel-perfect@pixel-perfect`. Restart Claude Code.
- **Uninstall:** run `claude plugin uninstall pixel-perfect@pixel-perfect`, then `claude plugin marketplace remove pixel-perfect`.

<a name="codex"></a>
## Codex

```bash
codex plugin marketplace add hackerpug-ai/pixel-perfect
codex plugin add pixel-perfect@pixel-perfect
```

- **Confirm:** run `codex plugin list | grep 'pixel-perfect@'`. The output shows `pixel-perfect@pixel-perfect` as `installed, enabled`.
- **Next step:** tell the user to start Codex in a project that has their design and run `$pixel-perfect:init`.
- **Upgrade:** run `codex plugin marketplace upgrade pixel-perfect`, then `codex plugin add pixel-perfect@pixel-perfect`.
- **Uninstall:** run `codex plugin remove pixel-perfect@pixel-perfect`, then `codex plugin marketplace remove pixel-perfect`.

If the confirm output also shows `pixel-perfect@personal` as `installed, enabled`, remove that older source. Two enabled sources create duplicate `$pixel-perfect:*` namespaces.

```bash
codex plugin remove pixel-perfect@personal
codex plugin add pixel-perfect@pixel-perfect
```

Keep the `personal` marketplace itself if it holds other entries.

<a name="cursor"></a>
## Cursor

Cursor loads local packages from `~/.cursor/plugins/local/`. Copy the folder. Do not symlink it: Cursor has known failures loading symlinked local packages. The block stops, and changes nothing, if it finds no release tag or the download fails.

```bash
bash -e <<'SH'
TAG=$(git ls-remote --tags --refs --sort=-v:refname https://github.com/hackerpug-ai/pixel-perfect.git 'v*' | sed -n 's|.*refs/tags/\(v[0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*\)$|\1|p' | head -n 1)
test -n "$TAG" || { echo "no release tag found" >&2; exit 1; }
SRC=$(mktemp -d)
git clone --branch "$TAG" --depth 1 https://github.com/hackerpug-ai/pixel-perfect.git "$SRC"
mkdir -p "$HOME/.cursor/plugins/local"
rm -rf "$HOME/.cursor/plugins/local/pixel-perfect"
cp -R "$SRC/plugins/pixel-perfect" "$HOME/.cursor/plugins/local/pixel-perfect"
rm -rf "$SRC"
SH
```

- **Confirm:** run the command below. It prints `ok` when the folder holds `.cursor-plugin/plugin.json` and is a real copy.
- **Next step:** tell the user to reload Cursor (Command Palette, then "Developer: Reload Window"), open a project that has their design, and run `/init`.
- **Upgrade:** run the install block again. It fetches the newest release and replaces the copy. Reload Cursor.
- **Uninstall:** run `rm -rf "$HOME/.cursor/plugins/local/pixel-perfect"`.

```bash
test -f "$HOME/.cursor/plugins/local/pixel-perfect/.cursor-plugin/plugin.json" && ! test -L "$HOME/.cursor/plugins/local/pixel-perfect" && echo ok
```

<a name="grok"></a>
## Grok

If the Claude Code install is on this machine, Grok already reads it. Run `grok inspect` and look for `plugin: pixel-perfect` under Skills. If it is there, skip the install and go to the next step.

```bash
grok plugin install hackerpug-ai/pixel-perfect#plugins/pixel-perfect --trust
```

`--trust` skips Grok's confirmation prompt. Grok needs the trust grant before it loads the skills. Do not add an `@ref` to the source: Grok skips updates for a pinned install.

- **Confirm:** run `grok plugin list`. The output lists `pixel-perfect`. If you skipped the install, run `grok inspect` instead.
- **Next step:** tell the user to start Grok in a project that has their design and run `/pixel-perfect:init`.
- **Upgrade:** run `grok plugin update pixel-perfect`. Running the install command again fails with `already installed`.
- **Uninstall:** run `grok plugin uninstall pixel-perfect`. If the Claude Code install is also on this machine, Grok keeps reading it until you remove that too.

<a name="opencode"></a>
## OpenCode

OpenCode installs per project. Run this block from the root of each project that uses pixel-perfect. It stops, and changes nothing, if `.opencode/commands` or `.opencode/skills` is a real directory, if `.pixel-perfect` is not a pixel-perfect checkout, or if it finds no release tag. If it stops, ask the user.

```bash
bash -e <<'SH'
for d in commands skills; do
  if [ -e ".opencode/$d" ] && [ ! -L ".opencode/$d" ]; then echo ".opencode/$d is a real directory. Ask the user." >&2; exit 1; fi
done
if [ -e .pixel-perfect ] && ! git -C .pixel-perfect remote get-url origin 2>/dev/null | grep -q 'hackerpug-ai/pixel-perfect'; then echo ".pixel-perfect exists and is not a pixel-perfect checkout. Ask the user." >&2; exit 1; fi
TAG=$(git ls-remote --tags --refs --sort=-v:refname https://github.com/hackerpug-ai/pixel-perfect.git 'v*' | sed -n 's|.*refs/tags/\(v[0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*\)$|\1|p' | head -n 1)
test -n "$TAG" || { echo "no release tag found" >&2; exit 1; }
rm -rf .pixel-perfect.new
git clone --branch "$TAG" --depth 1 https://github.com/hackerpug-ai/pixel-perfect.git .pixel-perfect.new
rm -rf .pixel-perfect
mv .pixel-perfect.new .pixel-perfect
mkdir -p .opencode
ln -sfn ../.pixel-perfect/plugins/pixel-perfect/.opencode/commands .opencode/commands
ln -sfn ../.pixel-perfect/plugins/pixel-perfect/.opencode/skills .opencode/skills
SH
```

`.pixel-perfect/` is a git clone inside the project. Do not commit it. Offer to add it to the project's `.gitignore`.

- **Confirm:** run `test -f .opencode/commands/init.md && test -f .opencode/skills/process-context/SKILL.md && echo ok`. It prints `ok`.
- **Next step:** tell the user to restart OpenCode in this project, with their design in it, and run `/init`.
- **Upgrade:** run the install block again. It fetches the newest release and keeps the links intact. Restart OpenCode. The version is in `.pixel-perfect/plugins/pixel-perfect/.opencode/package.json`.
- **Uninstall:** run `rm -rf .pixel-perfect .opencode/commands .opencode/skills`.

<a name="pi"></a>
## Pi

The npm package `@hackerpug-ai/pixel-perfect` is not published yet, so Pi installs from a checkout. Do not run `pi install git:github.com/hackerpug-ai/pixel-perfect`. It installs the repository root, which has no Pi skills. The block stops, and changes nothing, if it finds no release tag or the download fails.

```bash
bash -e <<'SH'
TAG=$(git ls-remote --tags --refs --sort=-v:refname https://github.com/hackerpug-ai/pixel-perfect.git 'v*' | sed -n 's|.*refs/tags/\(v[0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*\)$|\1|p' | head -n 1)
test -n "$TAG" || { echo "no release tag found" >&2; exit 1; }
rm -rf "$HOME/.pi/pixel-perfect.new"
git clone --branch "$TAG" --depth 1 https://github.com/hackerpug-ai/pixel-perfect.git "$HOME/.pi/pixel-perfect.new"
rm -rf "$HOME/.pi/pixel-perfect"
mv "$HOME/.pi/pixel-perfect.new" "$HOME/.pi/pixel-perfect"
pi install "$HOME/.pi/pixel-perfect/plugins/pixel-perfect"
SH
```

- **Confirm:** run `pi list`, then `test -f "$HOME/.pi/pixel-perfect/plugins/pixel-perfect/.pi/skills/pixel-perfect-init/SKILL.md" && echo ok`. Run both: Pi accepts a folder that has no skills.
- **Next step:** tell the user to start Pi in a project that has their design and run `/skill:pixel-perfect-init`.
- **Upgrade:** run the install block again. It fetches the newest release into the same path. Restart Pi.
- **Uninstall:** run `pi remove "$HOME/.pi/pixel-perfect/plugins/pixel-perfect"`, then `rm -rf "$HOME/.pi/pixel-perfect"`.

## Upgrading from an older major version

- From 7.x: <https://github.com/hackerpug-ai/pixel-perfect/blob/main/plugins/pixel-perfect/docs/UPGRADING-8.0.md>
- From 8.x: <https://github.com/hackerpug-ai/pixel-perfect/blob/main/plugins/pixel-perfect/docs/UPGRADING-9.0.md>
- Returning to an existing project: <https://github.com/hackerpug-ai/pixel-perfect/blob/main/plugins/pixel-perfect/docs/RETURNING-PROJECT.md>
