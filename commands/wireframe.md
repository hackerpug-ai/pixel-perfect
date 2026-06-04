---
description: "Optional first step: generate low-fidelity ASCII wireframes from plans/targets into design/wireframes/ — a pre-step to design-deconstruct or high-fidelity design (Phase 0)"
---

# Wireframe (Phase 0 — low-fidelity on-ramp)

The cheapest rung of the design ladder. Point this at **plans or any other target** (a PRD, a sprint ROADMAP/SPRINT/TASK, a spec, the manifest, a deconstruction inventory, or a written concept) and it produces **ASCII box-drawing wireframes** in `design/wireframes/` — one per screen, desktop + mobile, annotated and mapped to the components they imply.

ASCII is deliberate: it's token-cheap, diff-able, version-controllable, needs **no renderer** (no Chrome), and the AI reads/writes it natively. A wireframe forces the **structural** decisions — layout, information architecture, hierarchy, states — *before* you spend effort on pixels. It is a pre-step to high-fidelity design or `/pixel-perfect:design-deconstruct`, completing the fidelity ladder:

```
wireframe (ASCII, structure)  →  mockup (HTML, design-deconstruct / high-fi)  →  component (real, Storybook)
```

Wireframes are **targets/specs, never the deliverable** — the real components supersede them. They live in `design/wireframes/` and are never shipped.

## Usage

```
/pixel-perfect:wireframe [<target>] [options]
```

## Arguments

- `<target>`: what to wireframe (auto-detected). One of:
  - a **plan/spec** path — `PRD.md`, `ROADMAP.md`, `SPRINT.md`, a `TASK-*.md`, or any spec markdown
  - a **directory** (scans for the above)
  - `design/manifest.json` (uses the project's `spec` + any seeded screen list)
  - `design/deconstruction.json` (re-wireframe from a deconstruction inventory)
  - a **quoted concept/goal** — e.g. `"a field-service dashboard: today's jobs, job detail, settings"`
  - **omitted** → auto-detect via `init.md`'s requirements-discovery order (`manifest.spec`, then `PRD.md`, `requirements.md`, `README.md`, `*.md`)

## Options

- `--output <dir>`: output directory (default: `design/wireframes`)
- `--screens "A,B,C"`: explicit screen list (skips screen-derivation)
- `--width <n>`: desktop character width (default: `100`)
- `--desktop-only`: skip the mobile variant
- `--force`: regenerate existing wireframes
- `--no-seed`: write `design/wireframes/` only; do **not** write `design/wireframes.json` or touch the manifest

## Gate Check

**No gate required** — this runs before `init`. If a `design/manifest.json` exists, the seed step (Step 3) updates it in place; otherwise the artifacts are left for `init` to detect.

---

## Workflow

### Step 0: Detect engine

Check whether the **`frontend-designer`** agent is available.
- **Available** → delegate generation to it (Step 2A) with a strict ASCII override brief.
- **Not available** → run the **built-in inline generator** (Step 2B).

Report which engine will run. No renderer is needed — ASCII is plain text. Never silently substitute a stub.

> Note: the `frontend-designer` agent is built for *high-fidelity* HTML/React (it normally invokes the `frontend-design` skill). For wireframes its brief must **force low-fidelity ASCII** (Step 2A). The inline generator (2B) is the reliable backstop and is used whenever the agent is absent **or** returns non-ASCII output.

### Step 1: Acquire the target + derive the screen list

1. Resolve `<target>` (or auto-detect). Read the plan/spec. If `design/deconstruction.json` or a manifest screen list already exists, reuse that inventory rather than re-deriving.
2. For **each screen/view**, extract: its regions/sections, the components each region implies, the **states** (default / empty / loading / error), key interactions, and representative data.
3. **Confirm the screen list with the user** before generating (as `init` and `build` do):
   ```
   Screens derived from PRD.md:
     1. TodayFeed   — job list for today, status, quick actions
     2. JobDetail   — single job, actions, history
     3. Settings    — profile, preferences
   ? Wireframe these screens? [Yes / Add / Remove / Edit]
   ```
   If a source genuinely yields no screens, **stop and report** — never fabricate.

### Step 2A: Generate via `frontend-designer` (when available)

For **each screen, sequentially**, dispatch one subagent with a low-fidelity override brief:

```
Agent(subagent_type="frontend-designer", prompt = <ASCII WIREFRAME CONTRACT below>
      + screen excerpt + width + desktop/mobile flag)
```

The brief MUST open with the override (the agent defaults to high-fi React — this turns it off):

```
LOW-FIDELITY ASCII WIREFRAME ONLY.
- Output ASCII/Unicode box-drawing TEXT — NOT HTML, NOT CSS, NOT React, NOT a component.
- Do NOT invoke the frontend-design skill. Do NOT scan for components. Do NOT write code.
- No color, no fonts, no pixel values. Fidelity is STRUCTURAL: layout, IA, hierarchy, labels, states.
- Box-drawing vocabulary + composition: follow ~/Projects/brain/skills/tui-design/SKILL.md
  (─│┌┐└┘├┤┬┴┼ · rounded ╭╮╰╯ · blocks ▀▄█▌▐░▒▓ · status ●○◆▶✓✗ · title-on-border ` ─ Title ─ `).
- Produce the exact file shape in the ASCII WIREFRAME CONTRACT.
```

**Validate** each returned file: it must contain box-drawing characters and **must not** contain `<…>` tags or CSS braces. If it drifted into HTML/React, discard it and generate that screen via Step 2B. Report any screen that fell back.

### Step 2B: Inline generator (when the agent is absent or drifted)

The orchestrator generates the wireframes directly using the **same** ASCII WIREFRAME CONTRACT. This is real output, just without the designer's layout sensibility. State that `engine: builtin` ran.

### THE ASCII WIREFRAME CONTRACT (shared by 2A + 2B)

Write one file per screen: `design/wireframes/{screen}.md`. Each file contains:

1. A `# {Screen}` heading + one-line purpose.
2. A **Desktop** fenced ASCII block at `--width` (default ~100 chars), using box-drawing per `tui-design`, with `[n]` callouts on regions.
3. A **Mobile** fenced ASCII block (~40 chars) — show the *responsive transform* (e.g. sidebar → bottom tab bar). Omit if `--desktop-only`.
4. **Annotations** — each `[n]` callout → the component it implies and its level: `[n] Name (atom|molecule)`.
5. **States** — default / empty / loading / error notes. This seeds the screen's `states` list: **one wireframe = one route = one screen with N states**, not N screens. The real screen owns internal state to switch between them and renders one sandbox story per state (see `docs/state-patterns.md`).
6. A `→ Build mapping:` line listing the atoms / molecules / screen this implies (this is what seeds the build inventory).

No color, no CSS, no pixel values — structural only.

**Gold-standard example (`design/wireframes/TodayFeed.md`):**

````markdown
# TodayFeed
Main view: today's scheduled jobs with status and quick actions.

## Desktop (~100ch)
```
┌────────────────────────────────────────────────────────────────────────┐
│  ☰  ACME FIELD SERVICE          [ search… ]              ◍ Profile ▾     │ [1]
├────────────┬─────────────────────────────────────────────────────────────┤
│ ▸ Today    │  ── TODAY · Tue Apr 14 ──                       [ + New Job ]│ [2][3]
│   Schedule │ ┌─────────────────────────────────────────────────────────┐ │
│   Jobs     │ │ ● In progress   Annual HVAC Service        9:00–11:00 AM │ │ [4]
│   Invoices │ │   123 Oak St · J. Rivera                        [ View ▸]│ │
│   Settings │ ├─────────────────────────────────────────────────────────┤ │
│            │ │ ○ Open          Filter Replacement         1:00–2:00 PM  │ │
│            │ │   88 Pine Ave · M. Chen                         [ View ▸]│ │
│            │ └─────────────────────────────────────────────────────────┘ │
│            │  ░ empty: "No jobs today — enjoy the quiet." ░               │ [5]
└────────────┴─────────────────────────────────────────────────────────────┘
```

## Mobile (~40ch)
```
┌──────────────────────────────────┐
│ ☰  ACME              ◍ ▾          │ [1]
├──────────────────────────────────┤
│ ── TODAY · Apr 14 ──   [ + New ] │ [3]
│ ┌──────────────────────────────┐ │
│ │ ● In progress       9:00 AM  │ │ [4]
│ │ Annual HVAC Service          │ │
│ │ 123 Oak St · Rivera   [View ▸]│ │
│ ├──────────────────────────────┤ │
│ │ ○ Open              1:00 PM  │ │
│ │ Filter Replacement           │ │
│ │ 88 Pine Ave · Chen    [View ▸]│ │
│ └──────────────────────────────┘ │
├──────────────────────────────────┤
│ [Today]  Schedule  Jobs  ⋯ More  │ [2] (sidebar → bottom tabs)
└──────────────────────────────────┘
```

## Annotations
- [1] AppBar (molecule) — logo · GlobalSearch (atom) · ProfileMenu (atom)
- [2] SideNav (molecule) — NavItem (atom) ×5; active = "Today"; collapses to bottom tabs on mobile
- [3] SectionHeader (molecule) — title + ActionButton "New Job" (atom)
- [4] JobCard (molecule) — StatusBadge (atom) + time + address + tech + "View" link
- [5] States: default · empty ("No jobs today…") · loading (skeleton rows) · error (retry banner)

→ Build mapping: atoms[StatusBadge, NavItem, ActionButton, GlobalSearch, ProfileMenu] · molecules[AppBar, SideNav, SectionHeader, JobCard] · screen[TodayFeed]
````

Also write `design/wireframes/index.md` — a legend (box-drawing key) + a gallery linking each screen file.

### Step 3: Wire outputs into pixel-perfect

(Skip if `--no-seed`.)

1. Write **`design/wireframes.json`** — the inventory + section→future-component mapping:
   ```json
   {
     "engine": "frontend-designer",
     "source": { "type": "plan", "ref": "PRD.md" },
     "screens": [
       { "name": "TodayFeed", "file": "design/wireframes/TodayFeed.md",
         "atoms": ["StatusBadge","NavItem","ActionButton","GlobalSearch","ProfileMenu"],
         "molecules": ["AppBar","SideNav","SectionHeader","JobCard"] }
     ]
   }
   ```
2. **Manifest markers** — if `design/manifest.json` exists, set top-level `"wireframed": true`, `"wireframes": "design/wireframes"`, `"wireframes_engine": "frontend-designer" | "builtin"`, and append each wireframe file to `references`. If no manifest exists, leave the files for `init` to detect.

### Step 4: Report + next step

```
Wireframed: <target>  (engine: frontend-designer | builtin[; N screens fell back])

  design/wireframes/{screen}.md   desktop + mobile ASCII + annotations + build mapping
  design/wireframes/index.md      legend + gallery
  design/wireframes.json          inventory + build mapping

  Screens: TodayFeed, JobDetail, Settings

These wireframes are structural TARGETS for the next, higher-fidelity step.

Next:
  • /pixel-perfect:design-deconstruct design/wireframes   → turn them into HTML mockups + tokens
  • or /pixel-perfect:init                                 → it detects the wireframes and pre-seeds your screens
```

---

## Edge Cases

| Case | Handling |
|------|----------|
| Target missing / yields no screens | Stop and report; suggest a valid plan/target. Never fabricate screens. |
| `frontend-designer` agent absent | Run the inline generator (Step 2B); state `engine: builtin`. |
| Agent returns HTML/React (drift) | Discard that screen's output, regenerate it inline, and report which screens fell back. |
| Existing `design/wireframes/` | Without `--force`, ask which screens to regenerate; preserve the rest. |
| Very large plan (many screens) | Wireframe the primary screens; **log included vs deferred** in the report. |
| Manifest already past `init` | Write the files + seed; note that re-seeding the screen list may need confirmation during the next `init`/`build`. |

## Relationship to other commands

- **Fidelity ladder:** `wireframe` (structure) → `design-deconstruct` / high-fi (pixels) → `build` (real components). Each rung is a target the next rung is built to match.
- **`/pixel-perfect:design-deconstruct design/wireframes`** consumes these wireframes as a *source* (it normalizes the ASCII into a concept HTML, then produces token-governed HTML mockups).
- **`/pixel-perfect:init`** detects `design/wireframes/` and pre-seeds the screen list + references.
- **`/pixel-perfect:research`** gathers external patterns; wireframes encode *your* structure. They compose — research informs the layout, the wireframe commits to it.

## Examples

```bash
# From a PRD (auto-detected)
/pixel-perfect:wireframe

# From a specific plan, desktop-only, narrower
/pixel-perfect:wireframe .spec/prds/field-service/PRD.md --desktop-only --width 90

# From a one-line concept
/pixel-perfect:wireframe "analytics dashboard: overview, reports, alerts, settings"

# Re-wireframe from an existing deconstruction inventory
/pixel-perfect:wireframe design/deconstruction.json --force

# Then climb the ladder
/pixel-perfect:design-deconstruct design/wireframes
```
