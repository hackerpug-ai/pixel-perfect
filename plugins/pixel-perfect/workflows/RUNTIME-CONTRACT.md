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
- `DESIGN_EXECUTE(brief)` means follow the design execution rule below.

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

**Degradation.** If the harness exposes no structured input, ask the batch as a numbered plain-text list as the last thing in the turn, and wait. Never assume an answer to a decision that changes product behavior.

## Design execution

Always load `docs/DESIGN-CONTRACT.md` for design authoring or design review. If the harness exposes the named `frontend-designer` agent, dispatch that agent with the complete contract and task brief. If it is unavailable, the primary agent executes the same contract directly. Do not substitute another design subagent, weaken the contract, or skip deterministic gates.

## Harness mappings

### Claude Code

- Invocation: `/pixel-perfect:<name>`.
- User choices: one `AskUserQuestion` call per declared batch — at most 4 questions per call, 2–4 options each, `multiSelect` per question, and the harness supplies the Other escape. If unavailable, a numbered plain-text batch as the last thing in the turn. Never a printed question followed by an ended turn.
- Task tracking: Claude task-list tools.
- Plugin paths: resolve from `${CLAUDE_PLUGIN_ROOT}`.

### Grok

- Invocation: `/pixel-perfect:<name>` through Claude Code plugin compatibility.
- User choices and task tracking: Grok's native mechanisms, one call per declared batch as above. Never a printed question followed by an ended turn.
- Plugin paths: resolve from the enabled Claude-compatible plugin root.

### Codex

- Invocation: `$pixel-perfect:<name>`.
- User choices: the Codex input mechanism, one call per declared batch; otherwise a numbered plain-text batch as the last thing in the turn. Never a printed question followed by an ended turn.
- Task tracking: Codex planning (`update_plan`); keep at most one step in progress.
- Plugin paths: resolve relative to the loaded skill's plugin root.

### OpenCode

- Invocation: `/<name>`.
- User choices and task tracking: OpenCode's native question and todo/planning mechanisms, one call per declared batch; otherwise a numbered plain-text batch as the last thing in the turn. Never a printed question followed by an ended turn.
- Plugin paths: adapters include canonical files from `.pixel-perfect/plugins/pixel-perfect/`.

## Process context

Before executing an entry workflow, check for `design/manifest.json` or legacy `design/manifest.yaml`. If either exists, load `skills/process-context/SKILL.md` and perform its required migrations before continuing. There is no implicit auto-activation metadata.
