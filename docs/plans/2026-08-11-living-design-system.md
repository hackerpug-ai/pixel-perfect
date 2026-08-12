# Living Design System — the catalog capture and the change engine

Status: proposed
Date: 2026-08-11

The plugin bootstraps a design system well and cannot evolve one. This plan closes that in
two halves that depend on each other:

1. **The substrate** — a single fingerprint mechanism (catalog capture) that makes drift,
   dependency, and fidelity questions answerable by diffing real rendered components.
2. **The change engine** — one command that absorbs a new screen, extends an existing
   entity, or sheds a screen along with the components that were unique to it.

The substrate without the engine is change *management* with no way to ask for a change.
The engine without the substrate is the hand-holding problem again, because nothing can
answer "does this already exist" or "what was only used here" without inspecting the real
system. Neither half ships alone.

## The problem

The plugin is a one-way pipeline with a text-only feedback loop. Every artifact assumes it
is authored once:

- `design/deconstruction.json` is written once and `build` treats it as "the required set".
- `build` Phase 4b computes delta as **spec vs. code** — never **design vs. code**.
- `refine` accepts only *words*, never *a new mock*, and never changes what exists.
- Nothing removes anything, ever.

So a new mockup arriving for an existing project has no entry point: `design-deconstruct`
offers `--force` (nuke and redo) or `--resume-from` (redo a whole phase), and `refine`
would read the mock as a sentence. The "is this a new atom or an existing one" analysis is
a real workflow step that exists in no command, so a human performs it by hand every time.
And a screen that is no longer wanted stays forever, along with every component that only
it used.

Second, quieter cause: **the plugin cannot detect drift even after it happens.**

- "stale" appears in `refine.md` prose ("their gates are marked stale") but there is no
  `stale` status anywhere in the manifest schema and nothing computes one.
- `molecules[].atoms`, `screens[].organisms` etc. are authored by the model at write time
  and never reconciled against what the code actually imports.
- `status` reads the manifest and prints it, so it reports what was *claimed*, not what *is*.

---

# Part 1 — The substrate: catalog capture

The project mantra is *build the real thing; don't maintain a model of it*. Bookkeeping
about the design system (hash ledgers, `stale` flags, a declared dependency graph and a
script to reconcile it) is exactly the second thing this project refuses to build.

The real system already exists and is already renderable: **every component has a sandbox
story, per layer, per state**, and `docs/sandbox-spec.md` already contemplates a headless
check (piece #5) and per-story snapshots (piece #7) — both currently optional.

Promote that to the load-bearing mechanism:

> **The sandbox emits a deterministic artifact per story, headless, from one command.
> Those artifacts are committed as goldens. Everything else is a diff.**

`workflows/RUNTIME-CONTRACT.md` already classifies "render artifacts and deterministic
audit output" as durable truth, so this needs no new concept — only the tooling to produce
it and gates that consume it.

## Capture medium per platform

The contract is identical everywhere; the medium follows the platform. This is the same
invariance argument `sandbox-spec.md` already makes for its seven pieces.

| Platform | Structural artifact (authoritative) | Visual artifact (review) |
|---|---|---|
| Web (custom / Storybook) | normalized serialized DOM | PNG via headless Chrome |
| TUI (Ratatui / Bubbletea / Textual) | `TestBackend` text buffer — exact, no tolerance needed | none needed |
| Native mobile (Expo / SwiftUI / Compose) | view-tree dump | simulator screenshot |
| GPUI / desktop | element-tree dump | window screenshot when available |

The **structural** artifact is the gate. The **visual** artifact is for human review and for
design-target comparison. A platform that can produce neither declares the degradation
explicitly (the rule `design-deconstruct` already uses for a missing renderer) — it never
silently passes.

## Determinism requirements

Capture is worthless if it is noisy. The generated capture command must:

- disable animation and transitions, and settle before capture;
- use fixed mock data (no `Math.random`, no `Date.now` in fixtures — story fixtures are
  already required to be realistic; they must also be constant);
- normalize volatile output before writing: framework-generated ids, hash-suffixed class
  names, absolute paths, timestamps;
- render at the story's canonical size (sandbox spec piece #2 already fixes this).

## What this deletes

The point of the mechanism is that it is the **only** one. Each item below is either in the
repo today or was in an earlier draft of this plan. None survive.

| Deleted | Replaced by |
|---|---|
| A stored `stale` status field | Re-capture and diff. Staleness is computed at read time, never cached, so nothing has to remember to set it. |
| `molecules[].atoms`, `organisms[].molecules`, `screens[].atoms` — authored composition edges | The blast diff: change X, re-capture, and every story whose artifact moved is a dependent. No parser, no per-language import analysis, identical on Rust TUI and React web. |
| A dependency-graph reconciliation script | Nothing to reconcile — only one source exists. |
| `controls: true` in the manifest | The control surface is in the capture or it is not. |
| Mock-file hash fingerprints | The golden is the fingerprint, and it fingerprints the deliverable rather than the target. |
| A token usage-index script | Change a token, re-capture: the stories that moved are the usage set. |
| verify's "composed, not re-implemented" LLM judgment | The mutation check below. |

### The composition mutation check

Worth naming on its own because it is stronger than what it replaces. A molecule that
*claims* to compose `StatusBadge` but re-implemented its internals will not move when
`StatusBadge` moves. So: perturb an atom, re-capture, and assert its declared dependents
changed. A dependent that does not move is not composing — it is a copy.

That is a real test for the exact defect `docs/component-contracts/` exists to catch, and
it needs no static analysis at all.

## `scripts/verify-catalog.mjs`

The plugin's second deterministic script, deliberately shaped like
`verify-styling-contract.mjs` — same exit vocabulary, same "the decision is deterministic;
the LLM only formats the report" rule.

```
node scripts/verify-catalog.mjs <mode> <project-root> [options]

  --baseline            capture → write goldens (after a layer is approved)
  --check               capture → diff vs goldens; non-zero on unreviewed drift
  --blast <name>        perturb <name>, report which stories move        (downstream)
  --reach <name...>     report which live roots each name reaches         (upstream)
  --accept <glob>       promote drifted captures to goldens (intentional change)
```

Exit codes match the existing script exactly: `0` pass, `1` drift/violations, `2` config or
usage error, `3` vacuous scan (zero stories captured — the failure mode that must never
read as a pass, same as the styling gate's `src/`-instead-of-project-root trap).

Goldens live at `design/goldens/{platform}/{layer}/{name}/{state}.{ext}` and are committed.

`--blast` and `--reach` are the same perturbation with the question asked in opposite
directions, and they are what Part 2 is built on.

---

# Part 2 — The change engine: `pixel-perfect:evolve`

The end state is that a user says "add a progress modal to the job detail screen" or "drop
the settings screen" and the system absorbs or sheds it *reliably* — growing the shared
vocabulary rather than the pile, and leaving nothing orphaned behind.

**Add and remove are one operation**: a change to the system's inventory, with a computed
blast radius, gated on confirmation, proved by re-capture. Splitting them into separate
commands would also make replacement inexpressible, when replacement is just a delta with
both directions in it.

So there is one new capability, `evolve`, and it is the plugin's answer to every
inventory-level change.

| Invocation | Delta |
|---|---|
| `evolve ./progress-modal.png` | classify → add and/or variant |
| `evolve "add a settings screen with profile and billing tabs"` | synthesize → add |
| `evolve "drop the settings screen"` | remove + orphan sweep |
| `evolve --replace /settings ./new-settings.png` | remove + add, one gate |
| `evolve ./updated-design-system/` | full reconciliation — many adds, variants, removes |

`evolve` never grows its own build path. It computes and confirms the delta, then seeds
`build_plan` and hands off to `build`, which already owns the layer gates, contract gates,
and sandbox registration. Removal is its own apply step because `build` has no equivalent,
and it is small and deterministic.

## Phases

### E1 — ACQUIRE

Normalize the input. A file, URL, screenshot, or directory reuses the
`design-deconstruct` Step 1 normalization table unchanged. An instruction in prose is
parsed for its target and intent against the manifest inventory; anything that does not
resolve to exactly one entity is asked, per the runtime contract's "uncertainty is asked,
not guessed" rule.

### E2 — CLASSIFY

Every element of the change is classified against the **golden catalog** — an index of what
the system actually renders today, so matching compares real output rather than manifest
archaeology.

| Outcome | Meaning |
|---|---|
| **reuse** | An existing entity already covers this. Nothing to build. |
| **variant** | An existing entity needs a new state, prop, or size. Extends in place. |
| **new** | A genuinely new entity, placed at its layer. |
| **promote** | A pattern that now appears in two or more places — extract it as a shared molecule/organism. |
| **remove** | An entity the change drops. |
| **token change** | Routed to the token flow below. |

`promote` is what makes this *grow the system* instead of growing the pile. When a new
screen repeats a composition an existing screen already has, the honest answer is to
extract it once and have both compose it — not to add a near-duplicate. Near-duplicate
renders are detectable in the catalog, so the engine can propose this rather than waiting
for a human to notice.

A low-confidence match must **ask**, never silently create a near-duplicate. Duplicate-entity
creep is how a design system rots, and it is the failure mode a classifier is most likely to
introduce.

The existing state-vs-route rule (`build.md` Phase 6 Step 1c) already resolves the modal
case correctly once something consults it: a modal over a page is a *state of that page*, so
a progress modal classifies as a new organism plus a new state on an existing screen — not
a new screen.

### E3 — REACH

Compute the blast radius, in whichever direction the delta needs.

**For additions**, the assertion is *non-disturbance*: adding a screen must not change any
existing component. This is free — capture before and after, and any existing golden that
moves means a shared entity was edited, which is a **variant** that E2 failed to classify.
The engine stops and reclassifies rather than shipping a silent change to everything else
that composes it.

**For removals**, the question is which components were unique to the thing being removed.
This is mark-and-sweep, with the capture as the reachability oracle and no graph anywhere:

- **Live roots** = the screens that remain after the removal.
- For each component in the removed screen's constituent set, perturb it and capture.
- If **no live root moves**, nothing that survives depends on it → sweep candidate.

Transitivity is automatic, because reachability is measured against the remaining roots
rather than against the removal set. An atom used only by a molecule that is used only by
the removed screen moves no live root, so it is swept in the same pass — no recursive
descent, no ordering to get wrong.

Three guards keep the sweep honest:

- **Pinned entities are never swept.** A component built ahead of its use, or deliberately
  kept as a shared primitive, carries `pinned: true` and is exempt. Without this, "unused
  today" and "dead" get conflated.
- **The sweep list is always confirmed**, never automatic. Deleting code is the one
  irreversible thing this plugin does.
- **Pre-existing dead inventory is reported separately.** A component that reached no live
  root *before* the removal was already dead; saying so is useful, but blaming it on this
  change is not.

### E4 — CONFIRM

One `USER_CHOICE` gate carrying the whole delta: what is reused, what is added, what is
promoted, what is removed, and what gets swept with it. This gate *is* the analysis that is
currently hand-held. The digest names counts and the notable calls; the full reasoning goes
to `design/deltas/<date>-<name>/delta.md`, per the runtime contract's "analysis is an
artifact; the question is how the turn ends" rule.

Nothing is written, installed, or deleted before this gate.

### E5 — APPLY

**Additions and variants** update `deconstruction.json` and `build_plan`, then hand to
`build`. New entities pass every existing gate — styling contract, component contract,
sandbox registration, controls, state stories — because they go through the normal path.

**Removals** execute an atomic checklist. Partial removal is the drift that poisons the
next run, so all of it lands together or none does:

- component file and story file
- the sandbox registry entry (spec piece #1 is an explicit registry — it must be edited)
- goldens under `design/goldens/{platform}/…`
- design-system artifacts under `design/system/{layer}/{name}/`
- the `deconstruction.json` inventory entry
- the manifest entry
- the route from navigation, when a screen

### E6 — PROVE

Re-capture and assert, per direction:

| Direction | Assertion |
|---|---|
| Add | Every pre-existing golden is unchanged; new goldens exist for every new entity. |
| Variant | Only the varied entity and the stories that compose it moved. |
| Promote | The extracted entity exists, and its adopters moved to compose it (they must move — a non-moving adopter kept its copy). |
| Remove | The removed stories are gone from the catalog, and **no remaining story moved**. |

The removal assertion is the one that makes shedding safe: if deleting something changes
something else, it had a live dependent that reachability missed, and the change is reverted
rather than reported as done.

## Deprecation is a mode, not a step

An earlier draft required `verified → deprecated → removed`. That is ceremony here: this is
an application's own design system, every consumer is in the repo, and the capture already
identifies them exactly. Forcing two commands to drop one screen violates the project's
own "one thing" principle.

`evolve --deprecate <name>` remains available for the genuine case — a shared entity being
migrated away from over time, where several screens still use it. It marks the entity,
badges its story, and appends the name to a **deprecated inventory** section of the
component contract, so composing it becomes a gate violation caught by the existing
`verify-styling-contract.mjs` machinery with zero new enforcement code. Removal later runs
the normal path.

## Tokens

Tokens get a changelog (`tokens/CHANGELOG.json`), and each change kind's blast radius is
measured rather than declared:

| Change | Handling |
|---|---|
| Value change | Re-capture; the stories that moved are the visual consumers to review. |
| Addition | No cascade. |
| Rename | Codemod the emit sites; re-capture must show **zero** stories moved (a rename that changes rendering is not a rename). |
| Removal | Remove, re-capture; blocked unless nothing moves and nothing fails to build. |

No usage-index script — the capture *is* the index.

## Where `refine` ends and `evolve` begins

The boundary is whether the system's inventory changes.

- **`refine`** changes an existing entity's implementation — "make the badge more rounded".
  Nothing is added, removed, or extended.
- **`evolve`** changes what exists — add, variant, promote, remove.

`refine` detects an inventory-level request and routes it, rather than doing half of it.
This keeps both commands one thing each.

---

# File-by-file changes

## Substrate

| File | Change |
|---|---|
| `plugins/pixel-perfect/scripts/verify-catalog.mjs` | **new** — the capture/diff/blast/reach script above |
| `docs/sandbox-spec.md` | add **piece #8: catalog capture**; promote #5's headless check and #7's snapshots from optional; add the medium table, determinism requirements, and the minimum-bar checklist item |
| `docs/adapters/custom-sandbox.md` | generate the capture command per target framework, alongside the run command |
| `workflows/scaffold.md` | generate the capture command; the scaffold gate requires it to run and produce the hello-world golden, so the first golden exists before the first atom |
| `workflows/build.md` | each layer exit gate writes goldens (`--baseline`); the composition mutation check replaces the "composed, not re-implemented" prose; record `{layer}_capture` beside the existing contract gate keys |
| `workflows/verify.md` | new deterministic row per layer gate (**catalog capture**, exit 0 required), joining the two contract rows as checks that are not the reviewing agent's opinion; derive controls coverage from the capture |
| `workflows/refine.md` | re-capture after refinement so R4's cascade options are filled from the diff; the "marked stale" line becomes true for the first time |
| `workflows/status.md` | drift section from `--check`: stories whose capture no longer matches, entities with missing goldens, deprecated entities with live dependents, **and dead inventory** (entities reaching no live root) |
| `workflows/design-deconstruct.md` | Step 2.5 captures goldens per layer, so a deconstruct-seeded project arrives at `build` already fingerprinted |

## The `evolve` capability

Adding a public capability touches the generator and both validators — this repo generates
three surfaces per capability, so none of it is hand-copied:

| File | Change |
|---|---|
| `scripts/adapters/capabilities.json` | new entry, `interactive: true` |
| `plugins/pixel-perfect/workflows/evolve.md` | the canonical workflow (hand-authored) |
| `scripts/check-runtime-paths.mjs` | `PUBLIC_CAPABILITIES` += `evolve` |
| `scripts/validate-workflows.mjs` | `INTERACTIVE_WORKFLOWS` += `evolve` |
| generated ×3 | `commands/evolve.md`, `skills/evolve/SKILL.md`, `.opencode/commands/evolve.md` via `node scripts/build-adapters.mjs` |
| `plugin-release.json` + channel manifests | version bump (currently 7.4.0) |

The workflow must satisfy `validate-workflows.mjs`: a `## How this workflow asks` section
with the batch table, `user_choice` blocks with 2–4 self-contained options of at least 40
characters, one `(Recommended)` first, headers of 12 characters or fewer, at most 4
questions per batch.

`evolve` is a one-gate command in the common case (E4 confirms the whole delta). A second
call fires only when E2 hits a low-confidence match or E3 finds an ambiguous sweep.

## Manifest schema

Principle: **the manifest stores decisions and receipts, never derivables.**

Add, per platform:

```json
{
  "capture": {
    "command": "npm run sandbox:capture",
    "medium": "dom+png",
    "goldens": "design/goldens/web-desktop",
    "captured_at": "2026-08-11T00:00:00Z"
  },
  "pinned": ["EmptyState"],
  "deprecations": {
    "LegacyJobCard": { "since": "2026-08-11", "replacement": "JobCard", "reason": "…" }
  }
}
```

Remove: composition edge arrays, `controls`. Keep: tools, contracts with their sources,
enforcement and overrides, ecosystem libs with vetting, routes and `states`, gate receipts.

Schema examples appear in `init.md`, `build.md`, `verify.md`, and `status.md` — all four
update together, and `test/contracts.test.mjs` / `test/workflows.test.mjs` assert on them.

---

# Caveats, stated honestly

- **A golden is stored state too.** The asymmetry that justifies it: a ledger that stops
  being maintained fails *silently* and keeps looking authoritative; a golden that stops
  being regenerated fails *loudly* the next time anything diffs against it. Disagreement
  with reality is its designed failure mode — the same relationship a test golden has to
  the code under test.
- **Non-determinism breaks everything downstream.** The determinism requirements are
  load-bearing, not hygiene. A flaky capture trains people to `--accept` everything, which
  silently deletes the mechanism and every gate built on it.
- **Perturbation cost is real.** `--reach` over a removal candidate's constituents is one
  capture per candidate. That is seconds on a TUI and up to minutes on a large web sandbox.
  It runs only for removals, only over the candidate set, and it is still cheaper than the
  parser-per-language alternative it replaces.
- **Pixels are noisy; structure is not.** Font rendering and anti-aliasing differ across
  machines, so the structural artifact is the gate and the PNG is for review. TUI has no
  such problem at all.
- **A behavior change that renders identically escapes the diff.** Compile, contract, and
  state-scenario gates still cover that; capture is not proposed as a total gate.
- **Removal is the one irreversible act.** It is gated, atomic, proved by re-capture, and
  reverted on a failed assertion — and it still deserves the user's explicit confirmation
  every time.

# Sequencing

1. **Capture mechanism** — `verify-catalog.mjs`, sandbox spec piece #8, custom-sandbox
   recipe, scaffold generates the command. Independently useful: `status` and `verify` stop
   echoing the manifest and start reporting reality the moment goldens exist.
2. **Gates consume it** — build layer gates, verify rows, refine blast radius, status drift
   and dead inventory. Delete the derivables from the manifest in the same pass.
3. **`evolve`, add side** — E1 acquire, E2 classify, E4 confirm, E5 apply via `build`, E6
   non-disturbance assertion. This is the "absorb a new screen" half.
4. **`evolve`, remove side** — E3 reachability and the orphan sweep, the atomic removal
   checklist, the nothing-else-moved assertion. This is the "shed a screen" half.
5. **Promote, tokens, deprecate mode** — classifier branches and gate additions on rails
   that already exist by this point.

Steps 3 and 4 are the product; steps 1 and 2 are what make them trustworthy rather than
another thing to hand-hold.
