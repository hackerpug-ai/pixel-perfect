> **ARCHIVE**: This document is the architecture proposal that informed pixel-perfect v3.0.0.
> It is kept for reference. For current documentation, see [README.md](README.md).

# pixel-perfect v4: Code, Not Abstractions

## In the Era of AI, Abstractions Are Useless

The finger pointing at the moon isn't the moon.

YAML describing a button isn't the button. A JSON spec defining a screen layout isn't the screen. An HTML mockup showing what a component should look like isn't the component. These are all fingers pointing at the moon -- and in the era of AI, we can just go to the moon.

The v1 insight was correct: AI understands structured text better than screenshots. But we stopped one step too short. We created _descriptions of code_ instead of _code_. We built an elaborate pipeline (YAML -> JSON -> HTML) that produces increasingly detailed descriptions of what the software should be -- when the AI could have just written the software.

Here's what the research confirms:

> "AI agents produce significantly better output when they have running code examples vs. abstract specifications. Benchmarks show agents finish tasks faster with fewer tokens when working from component metadata."
> -- Storybook MCP research, 2026

> "Your current YAML pipeline creates an abstraction layer that must be re-interpreted every time implementation code is generated. A code-based approach gives actual running components as context, eliminating the lossy YAML-to-code translation step."
> -- Internal research analysis

> "As AI commoditizes code, the divide shifts from who can code to who can engineer."
> -- Nate B Jones, "AI Didn't Kill Engineering"

The v1 plugin generated artifacts _about_ the design. The v2 plugin generates _the design itself_ -- as real, running code.

---

## What Changes

|                         | v1 (current)                     | v2 (proposed)                        |
| ----------------------- | -------------------------------- | ------------------------------------ |
| **Output**              | HTML mockups (design references) | Running code (the actual thing)      |
| **Intermediate format** | YAML -> JSON -> HTML             | None. Code is the artifact.          |
| **Plugin's role**       | Generate design documents        | Enforce a build process              |
| **AI's role**           | Translate YAML to HTML           | Write actual components              |
| **Value proposition**   | "Blueprint for your contractor"  | "Foreman who keeps the job on track" |

The plugin stops being an **artifact generator** and becomes a **process orchestrator**. It doesn't care if you use React or Bubbletea -- it cares that you defined your goal before picking tools, picked tools before scaffolding, and built atoms before composing screens.

**What the plugin enforces is a PROCESS, not technical decisions.**

---

## Required Plugin: frontend-design

pixel-perfect v2 has a hard dependency on the **`frontend-design`** plugin. Process without taste produces working code that looks like AI slop. pixel-perfect handles the _process_; frontend-design handles the _aesthetics_.

**Why this is non-negotiable:**

The v1 plugin produced HTML mockups -- static documents that could look however you wanted because no one ran them. In v2, the output is real, running code. If that code looks generic, the plugin has failed. Every component the AI writes during ATOMS and COMPOSE phases must go through frontend-design's aesthetic lens:

- **Typography**: Distinctive, characterful font choices -- never Inter, Roboto, Arial
- **Color & Theme**: Cohesive palettes with dominant colors and sharp accents -- never timid, evenly-distributed pastels
- **Motion**: High-impact animations at key moments -- never scattered micro-interactions
- **Spatial Composition**: Unexpected layouts, asymmetry, intentional negative space -- never cookie-cutter grids
- **Visual Details**: Atmosphere through textures, gradients, shadows -- never flat solid backgrounds

**How it integrates with the 7-phase process:**

| Phase    | frontend-design's Role                                                                                 |
| -------- | ------------------------------------------------------------------------------------------------------ |
| DISCOVER | Vibe captured here feeds directly into frontend-design's "tone" parameter                              |
| SCAFFOLD | Theme file generation uses frontend-design principles (bold palette from vibe, font pairing selection) |
| ATOMS    | Every component written must pass frontend-design's aesthetic bar -- no generic AI output              |
| COMPOSE  | Screen layouts use frontend-design's spatial composition rules -- asymmetry, intentional flow          |
| VERIFY   | Gate checks include aesthetic review, not just "does it render"                                        |

**The contract:** When pixel-perfect dispatches work to AI agents during ATOMS and COMPOSE, it injects the frontend-design skill as required context. The AI doesn't just build a `StatusBadge` -- it builds a `StatusBadge` that is visually distinctive, uses the project's font pairing, respects the vibe's color hierarchy, and has intentional motion design.

Without frontend-design, you get process-correct software that looks like every other AI-generated interface. With it, you get process-correct software that looks like someone gave a damn.

---

## The 7-Phase Process

```
Phase 1: DISCOVER     -> Define goal, vibe, direction
Phase 2: TARGET       -> Define output: desktop, mobile, web, CUI
Phase 3: EQUIP        -> Pick style system + component system
Phase 4: SCAFFOLD     -> Set up sandbox, theme, project structure
Phase 5: ATOMS        -> Build + verify individual components
Phase 6: COMPOSE      -> Assemble components into screens/views
Phase 7: INTEGRATE    -> Wire navigation, state, data
```

Each phase has an **entry gate** (what must exist to start) and an **exit gate** (what must be verified to proceed). The plugin tracks phase state and blocks forward progress until gates pass.

### Phase 1: DISCOVER

Define what you're building. Read the PRD if one exists. Capture the essentials.

**Captures:**

- Project name
- Goal statement (one sentence: what does this thing do?)
- Design vibe (modern, minimal, playful, brutalist, etc.)
- Reference URLs (optional -- things that feel right)

**Exit gate:** `design/manifest.yaml` exists with goal + vibe.

### Phase 2: TARGET

Define your output medium. This shapes everything downstream -- the tools you pick, the sandbox you use, the way components are verified.

**Options:**

- `web-desktop` -- Browser, large viewport
- `web-mobile` -- Browser, mobile viewport
- `mobile-ios` -- Native iOS
- `mobile-android` -- Native Android
- `tui` -- Terminal UI (full interactive)
- `cli` -- Command-line output (formatted text)

**Exit gate:** Platforms recorded in manifest.

### Phase 3: EQUIP

Pick your tools. The plugin presents options organized by category, informed by your target platform. You choose. The plugin records your choices and loads the relevant adapter.

**Style systems:**
| Platform | Options |
|----------|---------|
| Web | Tailwind CSS, CSS Modules, Vanilla Extract, UnoCSS |
| Mobile | NativeWind, StyleSheet, Tamagui |
| TUI | Lipgloss (Go), Rich (Python), Ink styles (JS) |
| CLI | Charm Gum (Go), chalk (JS), colorama (Python) |

**Component systems:**
| Platform | Options |
|----------|---------|
| Web | shadcn/ui, Radix, Mantine, Chakra, Headless UI, DaisyUI |
| Mobile | React Native Paper, Tamagui, Gluestack |
| TUI | Bubbletea (Go), Textual (Python), Ink (JS) |
| CLI | Cobra (Go), Click (Python), Commander (JS) |

**Component sandbox:**
| Platform | Options |
|----------|---------|
| Web/Mobile | Storybook (recommended), Ladle (web-only), none |
| TUI/CLI | Terminal preview, none |

**Exit gate:** Tools recorded in manifest. Plugin loads the relevant tool adapter.

### Phase 4: SCAFFOLD

Set up the project for the chosen tools. The plugin orchestrates installation, configuration, and initial structure. This is where choices become reality.

**frontend-design activates here.** The vibe from DISCOVER gets translated into concrete aesthetic decisions: font pairing, color palette, motion philosophy. These are written into the theme file as real code, not abstract tokens.

**What happens (example: React + Tailwind + shadcn + Storybook):**

1. Install/configure Storybook with MCP addon
2. **frontend-design**: Select font pairing + color palette from vibe (e.g., "brutalist" -> Geist Mono + stark contrast palette)
3. Create theme file with frontend-design's aesthetic choices (actual `theme.ts`, not `tokens.yaml`)
4. Configure Tailwind with theme tokens
5. Initialize shadcn with theme colors
6. Create first "hello world" component + story to verify everything works

**What happens (example: Go + Bubbletea + Lipgloss):**

1. Initialize Go module if needed
2. **frontend-design**: Select color palette + terminal aesthetic from vibe
3. Create Lipgloss theme from vibe (actual `theme.go`)
4. Scaffold Bubbletea model boilerplate
5. Create first "hello world" model to verify rendering

**Exit gate:** Sandbox runs. Theme file exists with frontend-design aesthetic choices. First component renders and looks intentional.

### Phase 5: ATOMS

Build individual components. The plugin reads requirements (PRD, user input) and breaks the work into atomic components. Each atom is a real component file with a real test/story file.

**frontend-design is injected as context for every atom.** The AI doesn't just build a functional component -- it builds one that reflects the project's aesthetic direction. A button isn't just clickable; it has the right font, the right motion on hover, the right spatial presence.

**For each atom:**

1. AI writes the component with frontend-design aesthetic context (actual `.tsx`, `.go`, `.py` file)
2. AI writes the story/test showing all states (`.stories.tsx`, `_test.go`, `test_*.py`)
3. Plugin verifies: file exists, story/test passes, component renders
4. **Aesthetic gate**: Component uses project font pairing, respects color hierarchy, has intentional motion (not default transitions)

**Exit gate:** All atoms built. All stories/tests pass. Aesthetic gate passed (no generic styling). Component manifest available (Storybook MCP or equivalent).

### Phase 6: COMPOSE

Assemble atoms into screens. The plugin reads flow requirements and creates screen-level compositions. Each screen composes atoms into a complete view.

**frontend-design's spatial composition rules apply here.** Screens aren't just atoms arranged in a grid. Layout should have intentional flow, considered negative space, and hierarchy that guides the eye. frontend-design pushes the AI past safe, predictable arrangements.

**For each screen:**

1. AI writes the screen layout composing atoms with frontend-design spatial rules
2. AI writes a screen-level story/test
3. Plugin verifies: screen renders, all atoms used correctly, layout matches intent
4. **Aesthetic gate**: Layout has intentional hierarchy, not uniform spacing. Visual flow guides user attention.

**Exit gate:** All screens built and verified. Aesthetic gate passed. Navigation structure documented.

### Phase 7: INTEGRATE

Wire up the real-world connections: navigation between screens, state management, data fetching, API connections. This is the final mile from "components that render" to "software that works."

**What happens:**

1. Navigation/routing configured for all screens
2. State management wired (if needed)
3. Data fetching connected (if applicable)
4. End-to-end flow verified

**Exit gate:** Screens navigate correctly. Data flows. The thing works.

---

## What Gets Removed

| v1 Artifact           | v2 Replacement                                  |
| --------------------- | ----------------------------------------------- |
| `tokens.yaml`         | `theme.ts` / `theme.go` / actual code           |
| `components.yaml`     | Actual component files                          |
| `views.yaml`          | Actual screen files                             |
| `screens.yaml`        | Router/navigation config                        |
| `flows.yaml`          | Captured in manifest, verified in integration   |
| `workflows.yaml`      | Captured in manifest                            |
| `prompts/*.spec.json` | Eliminated entirely                             |
| `mocks/*.mock.html`   | Eliminated -- the sandbox IS the mock           |
| `paradigm.yaml`       | Research stays (optional), not an artifact gate |

**The `design/` folder shrinks to:**

```
design/
├── manifest.yaml        # Goal, vibe, platforms, tools, phase state
└── research/            # Optional research (from /research command)
```

Everything else is **actual project code** in the project's source tree.

---

## Commands

| v1 Command                | v2 Command                | What it does                                                  |
| ------------------------- | ------------------------- | ------------------------------------------------------------- |
| `/pixel-perfect:init`     | `/pixel-perfect:init`     | Phases 1-3: discover + target + equip                         |
| `/pixel-perfect:plan`     | `/pixel-perfect:scaffold` | Phase 4: set up sandbox, theme, project structure             |
| `/pixel-perfect:prompts`  | _removed_                 | No intermediate specs needed                                  |
| `/pixel-perfect:mockups`  | _removed_                 | No HTML mockups -- the code IS the mockup                     |
| `/pixel-perfect:review`   | `/pixel-perfect:verify`   | Run gate checks for current phase                             |
| `/pixel-perfect:design`   | `/pixel-perfect:build`    | Full orchestration: scaffold -> atoms -> compose -> integrate |
| `/pixel-perfect:status`   | `/pixel-perfect:status`   | Show current phase + gate status                              |
| `/pixel-perfect:research` | `/pixel-perfect:research` | Unchanged -- still useful for design inspiration              |
| `/pixel-perfect:refine`   | `/pixel-perfect:refine`   | Iterates on actual code, not YAML                             |
| `/pixel-perfect:merge`    | _removed_                 | No artifacts to promote -- code lives in the source tree      |

---

## Tool Adapters

Adapters are lightweight knowledge files that tell the orchestrator how to scaffold and verify for a specific tool. They answer three questions:

1. **How do I set up?** (scaffold steps)
2. **How do I verify a component?** (gate checks)
3. **How do I run the sandbox?** (preview/dev server)

### Ships With

| Adapter                          | Platforms         | Scaffold                           | Verify                       |
| -------------------------------- | ----------------- | ---------------------------------- | ---------------------------- |
| **Storybook**                    | Web, React Native | Install + MCP addon + story config | Story exists + renders       |
| **Tailwind CSS**                 | Web               | Install + theme config from vibe   | Classes resolve correctly    |
| **shadcn/ui**                    | Web               | Init + theme colors from vibe      | Component renders with theme |
| **React Native Paper**           | Mobile            | Install + theme provider           | Component renders on device  |
| **Charm (Bubbletea + Lipgloss)** | TUI               | Go module + model scaffold         | Model compiles + renders     |
| **Generic**                      | Any               | Process enforcement only           | File exists + basic checks   |

### Adapter Structure

```yaml
name: storybook
for: [react, react-native]
scaffold:
  - install: "npx storybook@latest init"
  - configure: "Add MCP addon, enable component manifest"
  - theme: "Create theme from manifest vibe"
verify:
  component: "Story file exists and renders without errors"
  screen: "Composition story exists and renders"
sandbox:
  start: "npm run storybook"
  mcp: "http://localhost:6006/mcp"
```

Adapters are additive. New adapters can be contributed without changing the core process engine. If no adapter exists for a tool, the Generic adapter still enforces the 7-phase process -- it just can't automate the tool-specific steps.

---

## The Manifest

The manifest replaces all YAML design artifacts. It's the single source of truth for process state.

```yaml
# design/manifest.yaml
version: "3.0"
created: "2026-02-17"

# Phase 1: DISCOVER
goal: "Field service management app for HVAC technicians"
vibe: "clean, professional, high-contrast for outdoor use"
references:
  - "https://servicetitan.com"
  - "https://housecallpro.com"

# Phase 2: TARGET
platforms:
  - mobile-ios
  - mobile-android

# Phase 3: EQUIP
tools:
  style: nativewind
  components: react-native-paper
  sandbox: storybook

# Process state
phase: atoms
gates:
  discover: passed
  target: passed
  equip: passed
  scaffold: passed
  atoms: in-progress
  compose: pending
  integrate: pending

# Component tracking (populated during atoms/compose phases)
atoms:
  - name: StatusBadge
    file: src/components/StatusBadge.tsx
    story: src/components/StatusBadge.stories.tsx
    status: verified
  - name: JobCard
    file: src/components/JobCard.tsx
    story: src/components/JobCard.stories.tsx
    status: in-progress

screens:
  - name: TodayFeed
    file: src/screens/TodayFeed.tsx
    story: src/screens/TodayFeed.stories.tsx
    status: pending
    atoms: [StatusBadge, JobCard, DateChip, SectionHeader]
```

---

## Why This Works

### For AI agents

- No lossy translation. The AI reads and writes the same language: code.
- Component sandboxes (Storybook MCP) give AI direct access to component APIs, prop types, and usage examples.
- The self-healing loop (write -> test -> fix -> pass) happens in real code, not in YAML-to-HTML pipelines.

### For humans

- You see running components, not HTML approximations.
- You verify on your actual device/browser, not in a mock file.
- The process ensures nothing gets skipped: you can't compose screens before atoms exist, can't integrate before screens are verified.

### For the plugin

- Simpler architecture: no YAML schema validation, no JSON spec generation, no HTML templating.
- The plugin becomes a state machine + adapter system. It tracks where you are and knows what "done" looks like for each phase.
- Extensible: new tools = new adapters, not new pipeline stages.

---

## Migration from v1

v1 and v2 are fundamentally different philosophies. There is no incremental migration path -- they coexist.

- **v1 artifacts** (YAML, JSON specs, HTML mocks) remain valid as design references
- **v2** starts fresh with the 7-phase process
- Existing `/pixel-perfect:research` output is compatible with both versions
- The `design/` folder format changes (manifest.yaml replaces all YAML artifacts)

Users can continue using v1 for projects that benefit from the mockup approach. v2 is for projects where you want the plugin to help you build the real thing.

---

## Version

This document describes **pixel-perfect 3.0** (major version bump reflecting the philosophical shift from artifact generation to process orchestration).

Current: 2.5.0
Proposed: 3.0.0

---

_The best description of code is code. The best mockup of a component is the component. Stop pointing at the moon -- go there._
