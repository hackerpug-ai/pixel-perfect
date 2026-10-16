# Pixel Perfect Runtime Contract

This file defines the harness-neutral primitives used by every canonical workflow. Read it before the selected workflow. The workflow body is authoritative; an adapter translates only invocation syntax and transient interaction mechanics.

## Durable truth

`design/manifest.json`, generated source files, sandbox registrations, test results, render artifacts, and deterministic audit output are durable truth. A task list or plan is transient coordination state and never proves that a gate passed.

Never stub product logic, invent render or test evidence, substitute placeholders for required components, or mark a partial gate complete.

## Neutral primitives

- `pixel-perfect:<name>` means invoke the named public capability in the active harness.
- `DIGEST` means the short status the user reads in the chat — twelve lines or fewer. See "Turn shape" below.
- `USER_CHOICE(batch)` means present a batch of related decisions through the harness's structured input mechanism and wait for the answer. A workflow never prints a decision as prose and never ends a turn on analysis. See "User choice protocol" below — it binds every workflow and every adapter.
- `TASK_CREATE`, `TASK_UPDATE`, `TASK_LIST`, and `TASK_RESET` mean use the harness's transient planning surface. Preserve the workflow's dependencies and statuses; do not write a second durable state file.
- `LOAD_SKILL(name, input)` means load the bundled skill from this plugin and pass the stated input.
- `SUBAGENT(agent, brief command)` means start one packaged child agent with a brief. See "Packaged agents".
- `DESIGN_EXECUTE(brief)` means always the packaged designer. Write the task brief to a file, then run `SUBAGENT(designer, brief.mjs wrap <project-root> --slug <short-name> <brief-file>)`. During `pixel-perfect:build`, one component or screen uses `brief.mjs build` in place of `wrap`. See "Packaged agents".

## Turn shape

A workflow's job is to move the project forward, not to demonstrate how much it looked at. Every turn is a `DIGEST` plus either a `USER_CHOICE` or completed work. Analysis that does not fit the digest goes in a file.

**The digest.** Twelve lines or fewer, and it answers exactly three things: where the project stands, what the next move is, and what is being asked. It names paths for anything written. It is prose or a short list, never a full-width report, never a table of findings, never a per-item scorecard. A workflow that has more to say writes the rest to the artifact it names and says where it went.

**Expensive work waits for the gate that authorizes it.** Web search, package installation, subagent dispatch, rendering, and generating more than one file are all *execution*. None of them may run before the `USER_CHOICE` that approves the work they belong to. Auditing what is already on disk and reading the spec are cheap and come first, because they are what the digest reports. A workflow that researches before asking has spent the user's time on work they never approved.

**Uncertainty is asked, not guessed.** When the invocation input does not resolve — an unrecognized argument, a misspelled phase or component name, a flag whose value is missing, two readings of the same request — the workflow opens with a `USER_CHOICE` whose option 1 is the nearest match and whose alternatives are the other plausible readings. It never picks silently and it never proceeds on the assumption that the closest match was meant. The same applies mid-run: a step that cannot be completed without an assumption that changes the output asks instead of assuming.

**Fenced blocks are shapes, not scripts.** Every example block in a workflow shows the *structure* of an output filled with placeholder values from a fictional field-service app. It is filled from the real project and trimmed to what that project actually has. It is never reproduced verbatim, never padded back to the example's length, and never treated as a minimum.

**Resuming says less, not more.** A workflow re-entered mid-run reports the level it stopped at, the count remaining, and the next item — then continues or asks. It does not re-derive or re-present analysis the manifest already records.

## User choice protocol

`USER_CHOICE` is the only sanctioned way a workflow asks for a decision. A `user_choice` fenced block in a workflow is **authoring material** — the wording and options to use with the harness's question mechanism. It is never text to print. Printing a decision and ending the turn is a contract violation: a turn ends on a structured question or on completed work.

### Notation

Workflows declare decisions in a fenced block tagged `user_choice`:

```user_choice
batch: B3 — where it runs and what it is built on
- header: Platforms
  multiSelect: true
  question: Which platforms does this project ship to? Select every one that applies.
  options:
    - label: iOS (Recommended)
      description: What this option is, what it means concretely for this project, and its trade-off — written for someone who read nothing above this prompt.
    - label: Desktop web
      description: A browser application at desktop widths. Adds a web-desktop platform that picks its own framework and component library.
```

### Rules

**Batch.** One call carries 1–4 decisions answerable at the same moment. A decision whose option list depends on an unanswered decision belongs in a later batch. Batch aggressively — round trips are the cost being minimized.

| Field | Rule |
|-------|------|
| `batch` | An id and a plain-language title. Declared once per call. |
| `header` | 12 characters or fewer. The chip shown while answering (`Framework`, `Style`, `Icons`). |
| `question` | One plain sentence. No codenames, no reference to text that came before it. |
| `options` | 2–4. Each has a `label` of 1–5 plain words and a self-contained `description`. |
| `multiSelect` | `true` when the choices are not mutually exclusive. Default `false`. |

**Self-contained options.** Every `description` states what the option is, what it means concretely for this project, and its trade-off — written for a user who read nothing before the prompt. "As described above", "Approach A", and bare product names with no explanation are all violations. An option that cannot be explained in three sentences is not ready to be offered: explain it in the workflow's brief and shorten the option.

**Recommended first.** When the workflow has a defensible default it is option 1 and its `label` ends with `(Recommended)`. In a multi-select, every option the workflow proposes to check carries that suffix and sorts first — no harness exposes a preselect field, so the suffix is how a proposal is conveyed. Do not invent one. When a decision is deliberately taste-only, no option is marked and the `question` says the choice is open.

**Free text arrives through Other.** Harnesses append an "Other" escape that accepts typed input. A free-text decision — a goal sentence, a vibe, a list of URLs — is therefore asked as a choice whose option 1 is the workflow's *proposed value*, phrased so accepting it is one click, with materially different alternatives as options 2–4. The `question` names Other as the way to type something else. The stored value is the user's own text when they choose Other, and the option's plain sentence (never the short label) when they do not.

**A detected value is option 1, not a yes/no.** When a value has already been detected or inferred — from a requirements document, `package.json`, a lockfile, a prior artifact — do not spend a round trip confirming it. Offer the detected value as option 1 with its evidence inside the description, and the plausible alternatives as options 2–4. One call, one answer.

**A settled decision is shown, not asked.** A decision fixed by durable evidence — a value passed as an invocation option, exactly one candidate present in the repository, a value already recorded in `design/manifest.json` — is reported in the summary as a settled fact with its evidence, and consumes no question slot. Only genuine forks are asked. If the user disagrees they say so, and the workflow reopens that one decision as its own call.

**Analysis is an artifact; the question is how the turn ends.** When a decision needs more explanation than the option descriptions carry, write the explanation to the artifact the workflow names, state in the turn where it was written and summarize it in a few lines, then fire `USER_CHOICE` in that same turn. The explanation is durable, re-readable, and cannot be lost to a rendering quirk, and the options stand alone, so the user is never left holding prose with no way to answer. A general convention that an explanation must occupy a turn of its own does not apply here: that convention exists to guarantee the explanation is delivered, and the artifact delivers it more reliably than a turn boundary does.

**Every interactive workflow declares its batches up front.** A `## How this workflow asks` section near the top lists every batch in a table — id, phase, the decisions it carries, and when it fires — followed by the worst-case and common-case call counts. This is what makes the round-trip cost of a workflow visible and reviewable rather than emergent. A workflow whose table shows more calls than it can justify is a workflow to re-batch.

**Degradation.** If the harness has no structured input, ask the batch as a numbered plain-text list as the last thing in the turn, and wait. Never assume an answer to a decision that changes product behavior.

## Packaged agents

The plugin ships its own agents under `agents/`. Every child agent a workflow starts is one of them. There are two: `designer` (`agents/designer.md`) and `judge` (`agents/judge.md`). Harnesses that load plugin agents register them as `pixel-perfect:designer` and `pixel-perfect:judge`. A workflow never starts an agent the plugin does not ship. That includes a client agent with a similar name and any other name from the harness's agent list. A type is named only when the tool lists it. Grok must not be given an unlisted type; the brief still carries the prompt.

`SUBAGENT(agent, brief command)` means:

1. **Write the assignment.** Run the `brief.mjs` command the workflow states. `<project-root>` is the directory that holds `design/manifest.json`.
   - `build` (one component or screen during `pixel-perfect:build`): `node <plugin-root>/scripts/brief.mjs build <project-root> --platform <id> --layer <layer> --name <Name>`. The build workflow supplies `--platform`, `--layer`, and `--name`.
   - `wrap` (every other design brief): write the task brief to `<project-root>/design/.briefs/<slug>.task.md`, or pipe it on stdin with `-`. Then run `node <plugin-root>/scripts/brief.mjs wrap <project-root> --slug <slug> <task-brief-file | ->`. The slug is lowercase letters, digits and hyphens. Use one slug per dispatch, named for the work: for example `inventory-read`, `theme`, `wireframe-<screen>`, or `refine-<component>`. The task brief must name every file the child may write and the result it must return.

   The command writes one file that holds the packaged agent's full prompt, the design contract, and the task. It prints one line: the prompt for the child. Use that line unchanged as the child's whole prompt. Do not paraphrase it, add to it, or paste the brief into it.

   **Failure rule.** If the `brief.mjs` command exits non-zero, stop and report its error. Never write the brief by hand, and never start a child without the printed line. If the spawn call itself fails, report the error. Do not switch to the inline row.
2. **Start one child.** Use the agent-spawning tool you have. Set the agent type from this table. Set no model. The child runs on the session's model.

   | Tool you have | Agent type |
   |---------------|------------|
   | `Agent` or `Task` | `pixel-perfect:<agent>` if your tool's list of agent types contains exactly that name. Otherwise leave the type out. |
   | `spawn_subagent` | `pixel-perfect:<agent>` if the tool's listed types contain exactly that name. Otherwise leave `subagent_type` out. Set `background: false` so the call waits for the result (it defaults to true). |
   | `spawn_agent` | `default`, with `fork_turns: "none"` (older builds: `fork_context: false`) so the child starts with a fresh context. This instruction is the explicit request for delegation. |
   | `task` | `general` |
   | none of these | No child. Read the brief file yourself and follow it, one item at a time, re-reading it for each item. |

   Only ever set a type that appears in your tool's list, character for character. Some harnesses replace a name that is not in the list with a different listed agent. So naming an unlisted agent starts the wrong one. This applies to `pixel-perfect:<agent>`. `default` and `general` are the tools' built-in generic values. Use them as written.

3. **Wait for the child.** Use its result. The child cannot ask the user and does not start other agents. If it returns `status: blocked`, resolve the blocker, or put it to the user through `USER_CHOICE`, then start the child again with the same brief command. Do not finish its work from memory.

Whichever row applies, the child reads the same packaged prompt. It reads that prompt as its system prompt where the harness registered the agent, and as the top of the brief file everywhere. Report the route once per run:

| Route | Report as |
|-------|-----------|
| Started with the type exactly `pixel-perfect:designer` | `design engine: packaged designer (registered)` |
| Started with no type, `default`, or `general`, so the brief file carries the prompt | `design engine: packaged designer (in brief)` |
| No child, so the orchestrator followed the brief file itself | `design engine: packaged designer (inline)` |

Never weaken the design contract or skip a deterministic gate. Do not start another design agent in the designer's place. Always load `docs/DESIGN-CONTRACT.md` for design authoring or design review.

## Harness mappings

### Claude Code

- Invocation: `/pixel-perfect:<name>`.
- User choices: one `AskUserQuestion` call per declared batch — at most 4 questions per call, 2–4 options each, `multiSelect` per question, and the harness supplies the Other escape. If unavailable, a numbered plain-text batch as the last thing in the turn. Never a printed question followed by an ended turn.
- Task tracking: Claude task-list tools.
- Plugin paths: resolve from `${CLAUDE_PLUGIN_ROOT}`.

### Grok

- Invocation: `/pixel-perfect:<name>`. Grok lists each command under its prefixed name; the bare `/<name>` also runs. Both forms run.
- User choices and task tracking: Grok's native mechanisms, one call per declared batch as above. Never a printed question followed by an ended turn. Grok stops waiting for an answer after 30 minutes by default; `INSTALL.md` shows how to turn that timeout off. A return of "User declined to answer the questions" with no text the user typed is that timeout, not an answer. At a gate, never proceed on best judgment. End the turn with the batch as a numbered plain-text list, the last thing in the turn, and wait for the reply.
- Plugin paths: resolve from the enabled Claude-compatible plugin root.

### Codex

- Invocation: `$pixel-perfect:<name>`.
- User choices: the Codex input mechanism, one call per declared batch; otherwise a numbered plain-text batch as the last thing in the turn. Never a printed question followed by an ended turn.
- Task tracking: Codex planning (`update_plan`); keep at most one step in progress.
- Plugin paths: resolve relative to the loaded skill's plugin root.

### OpenCode

- Invocation: `/pixel-perfect/<name>`. OpenCode discovers namespaced commands from the nested `.opencode/commands/pixel-perfect/` path, so every public command is namespaced and none takes over a built-in such as `/init`.
- User choices and task tracking: OpenCode's native question and todo/planning mechanisms, one call per declared batch; otherwise a numbered plain-text batch as the last thing in the turn. Never a printed question followed by an ended turn.
- Plugin paths: adapters include canonical files from `.pixel-perfect/plugins/pixel-perfect/`.

### Pi

- Invocation: `/skill:pixel-perfect-<name>` from the installed Pi package.
- User choices: Pi's structured question or input mechanism when available, one call per declared batch; otherwise a numbered plain-text batch as the last thing in the turn. Never print a question and then end the turn.
- Task tracking: Pi's task or todo mechanism when installed. Do not write a second durable state file.
- Plugin paths: resolve relative to the loaded namespaced skill under the installed package's `.pi/skills/` directory.

### Cursor

- Invocation: `/<name>` (slash command from the installed plugin) or the skill name when skills are discovered by convention.
- User choices: Cursor's native structured input when available, one call per declared batch; otherwise a numbered plain-text batch as the last thing in the turn. Never a printed question followed by an ended turn.
- Task tracking: Cursor's native task/todo tools when available.
- Plugin paths: resolve from the plugin directory that contains the loaded command or skill under `~/.cursor/plugins/` (marketplace) or `~/.cursor/plugins/local/` (local install). There is no `CLAUDE_PLUGIN_ROOT` equivalent — locate the plugin root by the directory that holds `.cursor-plugin/plugin.json`.

## Process context

Before executing an entry workflow, check for `design/manifest.json` or legacy `design/manifest.yaml`. If either exists, load `skills/process-context/SKILL.md` and perform its required migrations before continuing. There is no implicit auto-activation metadata.
