<p align="center">
  <img src="assets/banner.png" alt="pixel-perfect banner" width="100%">
</p>

# pixel-perfect

A Claude Code plugin that skips the mockup abstraction entirely. Instead of generating designs that get "lost in translation," it builds the **real components in your target framework** during design ideation — browsable in a **native sandbox** it generates from scratch (Storybook optional).

---

## Why Skip the Abstraction?

Your Figma mock is not your product. And AI just made that abstraction obsolete.

**AI reads code better than it reads pixels.** That insight flipped everything. Why mock when you can just… make the thing?

The unlock was the **sandbox** — a tiny component browser. Storybook is one web version of it; but the AI can generate one from scratch in *any* framework. Turns out when the sandbox builds itself, every stack gets one.

pixel-perfect follows the organic design process:
1. Define theme tokens
2. Build atomic components
3. Scaffold entire views

All in a sandbox — native to your framework (or Storybook, if you prefer). All production-ready from the start. No more pointing at the moon — you just go there.

---

## The 7-Phase Process

| Phase | What Happens | Gate Checks |
|-------|--------------|-------------|
| **DISCOVER** | Define goal + vibe from PRD | Goal statement exists, vibe captured |
| **TARGET** | Select platforms + framework | Platform/framework declared |
| **EQUIP** | Select style + component libraries | Adapters validated |
| **SCAFFOLD** | Install tools, create theme, generate token stories | Theme renders, sandbox runs |
| **ATOMS** | Build individual components | Each component has story + controls |
| **COMPOSE** | Assemble screens from atoms | Screens render with real data shapes |
| **INTEGRATE** | Wire navigation + state | App navigates, state persists |

Each phase has a **gate** that must pass before you proceed. The plugin tracks state in `design/manifest.json` and blocks forward progress until gates clear.

---

## Quick Start

### Installation

```
/plugin marketplace add https://github.com/hackerpug-ai/pixel-perfect
/plugin install pixel-perfect@pixel-perfect
```

### First Project

```bash
# 0. (Optional) Start from an existing design instead of a blank PRD
/pixel-perfect:design-deconstruct https://example.com   # or a screenshot, repo, or concept

# 1. Set up your project (phases 1-3)
/pixel-perfect:init

# 2. Scaffold tools, theme, token stories (phase 4)
/pixel-perfect:scaffold

# 3. Build components and screens (phases 5-7)
/pixel-perfect:build

# Check progress anytime
/pixel-perfect:status
```

Init walks you through:
1. **Where are your requirements?** (auto-detects PRD.md)
2. **What's the goal?** (one sentence)
3. **What's the design vibe?** (clean, bold, playful, etc.)
4. **What platforms?** (web-desktop, web-mobile, mobile-ios, mobile-android)
5. **What framework?** (React, Next.js, Vite, SvelteKit, React Native, Expo, or provide docs URL)
6. **What style system?** (Tailwind, NativeWind, CSS Modules, or provide docs URL)
7. **What component library?** (shadcn, shadcn-svelte, Bits UI, Skeleton, Paper, Mantine, none, or provide docs URL)

The UI library is completely flexible — use whatever you want or build from scratch. pixel-perfect uses `AskUserQuestion` to follow your lead.

---

## The Sandbox — a spec, not a tool

A **sandbox** is just a component browser: it catalogs your components by layer and renders each one in isolation, themed. Storybook is *one* implementation of that idea (for the web) — not the idea. So pixel-perfect treats the sandbox as a **spec** ([`docs/sandbox-spec.md`](docs/sandbox-spec.md)) and, by default, **builds one from scratch in your target framework** — rendering the *real* components, nothing extra to install. An off-the-shelf tool is used only if you ask.

The spec is ~7 small pieces (a layer-keyed story registry · isolated render · a two-pane navigator · token codegen from `theme.*.json` · a run command · pixel-target refs). It's derived from two real, running sandboxes built from scratch in Rust — a GPUI desktop one and a Ratatui TUI one — the same concept in totally different paradigms.

### Why custom (v6 default)

**Storybook is great — for web projects that want Storybook.** But pixel-perfect builds UI in *any* framework: React, SvelteKit, React Native, Expo, GPUI, Ratatui, SwiftUI. Shoehorning all of those into Storybook means fighting Storybook — native-web shimming, addon incompatibilities, version conflicts, and an entire toolchain that doesn't apply outside a browser.

The agentic development model changes the calculus. An AI agent can generate a sandbox from scratch in ~60 lines — a registry + a two-pane shell + token codegen + a run command — *in whatever language and framework you're actually using*. That's cheaper than installing, configuring, and maintaining Storybook in a project where it's a poor fit.

**Why this works better cross-platform:**

| Concern | Storybook | Custom sandbox (v6 default) |
|---------|-----------|----------------------------|
| React web | ✅ native fit | ✅ tiny Vite browser, same result |
| SvelteKit | ⚠️ needs adapter, some rough edges | ✅ generated in Svelte, native |
| React Native / Expo | ⚠️ web shimming required | ✅ runs on-device in your framework |
| TUI (Ratatui / Bubbletea) | ❌ impossible | ✅ terminal-native, derived from real Rust sandboxes |
| Desktop (GPUI, SwiftUI) | ❌ impossible | ✅ platform-native |
| Maintenance burden | Storybook upgrades, addon compat, version pinning | ~60 lines you own; agent can regenerate anytime |
| Install footprint | ~200 deps, 30s+ cold start | ~0 deps, instant |

The agent **generates the sandbox during scaffold** — it's not a manual step. The spec (`docs/sandbox-spec.md`) is small and stable; the implementation varies by framework. Two real sandboxes (GPUI + Ratatui) prove the spec works across entirely different rendering paradigms.

Storybook remains a **first-class opt-in** for web projects that want it. Set `"sandbox": "storybook"` in the manifest and the scaffold step installs and configures it normally. But it's no longer the default — because the default should work for *every* platform.

| `tools.sandbox` | What you get | Launch |
|-----------------|-------------|--------|
| **`custom`** (default) | a native component browser generated in your framework | `npm run sandbox` / `make sandbox` |
| `storybook` | off-the-shelf Storybook (web) | `pnpm storybook` → localhost:6006 |
| `storybook-native` | on-device Storybook (RN/Expo) | `pnpm storybook` → simulator |
| `tui-sandbox` | terminal browser (experimental) | `tsbx dev` |

> **v6 (breaking):** the default sandbox is now `custom`, not Storybook. Existing projects that want to keep Storybook: set `"sandbox": "storybook"` under the platform's `tools` in `design/manifest.json`.

The scaffold phase generates the sandbox and sets everything up. Run `npm run sandbox` (or `make sandbox` / `pnpm storybook` if you opted into Storybook) and start building.

### Sidebar Organization

```
Design System/          ← Token reference stories (scaffold phase)
  Colors
  Typography
  Spacing
  Icons
Components/             ← Atomic components (atoms phase)
  StatusBadge
  JobCard
  ActionButton
Screens/                ← Composed screens (compose phase)
  TodayFeed
  JobDetail
```

### Controls

Every component prop is wired to sandbox controls (`argTypes` in Storybook; labeled variants in a custom sandbox). This makes every component interactive — you can tweak props directly in the browser or terminal.

---

## Commands

| Command | Phases | What It Does |
|---------|--------|-------------|
| `/pixel-perfect:wireframe` | 0 (optional) | Low-fi: ASCII wireframes from plans/targets into `design/wireframes/` — a pre-step to design-deconstruct |
| `/pixel-perfect:design-deconstruct` | 0 (optional) | Deconstruct existing UI (code, URL, screenshot, concept) into token-governed HTML mockups that seed the build |
| `/pixel-perfect:init` | 1-3 | DISCOVER goal + vibe, TARGET platforms + framework + tools, EQUIP |
| `/pixel-perfect:scaffold` | 4 | Install tools, create theme, generate design token stories, verify hello-world |
| `/pixel-perfect:build` | 5-7 | Build atoms, compose screens, wire integration |
| `/pixel-perfect:verify` | any | Run gate checks for current phase |
| `/pixel-perfect:status` | any | Show phase progress, controls coverage, and component tracking |
| `/pixel-perfect:research` | any | Research design patterns and competitors |
| `/pixel-perfect:refine` | 5+ | Iterate on components/screens with feedback |

### Command Flow

```
wireframe ─▶ design-deconstruct      research (optional)
(ASCII,      (HTML mockups,                 |
 optional)    optional)                     |
        \           \                       |
         v           v                      v
        init  ──▶  scaffold  ──▶  build  ──▶  verify
        (1-3)      (4)           (5-7)       (gates)
                                  |
                                  v
                               refine (iterate)
```

---

## Starting From Existing UI or Concepts

Not every project starts from a written PRD. If you already have a design — a competitor's site, an old app's components, a screenshot, a Claude Design export, or just a concept — run the optional **`design-deconstruct`** step first:

```
/pixel-perfect:design-deconstruct <source>   # code path, URL, image, HTML, or concept text
```

It normalizes the source into a concept HTML, then deconstructs it into a **token-governed atomic design system** under `design/system/` — semantic tokens plus atom / molecule / organism / view HTML mockups (with PNG references). Those outputs seed the rest of the process:

- the extracted **tokens** become the theme (`scaffold` reads `design/theme-seed.json`)
- the **inventory** pre-fills the atom / molecule / screen build lists
- each **view mockup** becomes a pixel-perfect *target* the real component is built to match

**This does not contradict "skip the mockup abstraction."** The deconstructed HTML is a precise, token-governed *reference spec* — clean markup the AI reads perfectly — not a lossy hand-drawn mock, and never the deliverable. The real components in your framework's native sandbox still supersede it. When the standalone `design-deconstruct` skill is installed, pixel-perfect delegates to it; otherwise a lighter built-in path runs.

### Wireframe first (the low-fi rung)

When you're starting from **plans** rather than existing UI, run `/pixel-perfect:wireframe` first. It turns a PRD / sprint plan / spec (or a one-line concept) into **ASCII box-drawing wireframes** in `design/wireframes/` — one per screen, desktop + mobile, annotated and mapped to the components they imply. No renderer, no pixels: it commits the *structure* (layout, IA, hierarchy, states) cheaply. That gives the full **fidelity ladder**:

> **wireframe** (ASCII, structure) → **mockup** (HTML, design-deconstruct / high-fi) → **component** (real, in your framework's native sandbox)

Each rung is a *target* the next is built to match. Wireframes feed `design-deconstruct` directly (`/pixel-perfect:design-deconstruct design/wireframes`) or seed `init` (it detects them and pre-fills your screen list).

---

## Adapter System

Adapters are reference docs that teach the AI how to scaffold, build, and verify for specific tools. They're loaded based on the user's choices during init. The commands themselves are tool-agnostic.

| Category | What It Controls | Loaded When |
|----------|-----------------|-------------|
| **Style** | Visual styling | User selects a style system |
| **Components** | UI component library | User selects a component library |
| **Sandbox** | Component browser | `custom` by default (Storybook opt-in) |

### Included Adapters

| Adapter | Category | Status |
|---------|----------|--------|
| SvelteKit | framework (web) | stable |
| Tailwind / NativeWind | style | stable |
| shadcn/ui | components (web) | stable |
| shadcn-svelte / Bits UI / Skeleton | components (Svelte) | stable |
| React Native Paper | components (mobile) | stable |
| Custom Sandbox | sandbox (**default**) | stable |
| Storybook / Storybook Native | sandbox (opt-in) | stable |
| tui-sandbox | sandbox (opt-in, TUI/CLI) | experimental |
| Lipgloss / Rich / Ink | style (TUI) | experimental |
| Bubbletea / Textual / Ink | components (TUI) | experimental |
| Generic | fallback | stable |

No specific library is required. Select "None" or "Other" with a docs URL, and the AI adapts.

---

## The Manifest

`design/manifest.json` is the single source of truth for process state:

```json
{
  "version": "4.0",
  "created": "2026-03-01",
  "goal": "Dashboard for monitoring real-time analytics",
  "vibe": "clean, data-dense, dark mode",
  "spec": "PRD.md",
  "platforms": ["web-desktop"],
  "tools": {
    "framework": "vite",
    "style": "tailwind",
    "components": "shadcn",
    "sandbox": "custom"
  },
  "phase": "atoms",
  "gates": {
    "discover": "passed",
    "target": "passed",
    "equip": "passed",
    "scaffold": "passed",
    "atoms": "in-progress",
    "compose": "pending",
    "integrate": "pending"
  },
  "atoms": [
    {
      "name": "StatusBadge",
      "file": "src/components/StatusBadge.tsx",
      "story": "src/components/StatusBadge.stories.tsx",
      "status": "verified",
      "controls": true
    }
  ],
  "screens": [
    {
      "name": "TodayFeed",
      "file": "src/screens/TodayFeed.tsx",
      "story": "src/screens/TodayFeed.stories.tsx",
      "status": "pending",
      "atoms": ["StatusBadge", "JobCard", "DateChip", "SectionHeader"]
    }
  ]
}
```

---

## frontend-design Integration

pixel-perfect handles the **process**. The optional `frontend-design` plugin handles **aesthetics**.

When frontend-design is installed:
- **Scaffold**: Vibe is translated into concrete font pairings, color palettes, and motion philosophy
- **Atoms**: Components get distinctive typography, intentional color hierarchy, and considered motion
- **Compose**: Screens get spatial composition rules -- asymmetry, visual flow, intentional negative space
- **Verify**: Gate checks include aesthetic review, not just "does it render"

When frontend-design is NOT installed:
- Process gates still enforce (files exist, tests pass, theme is used)
- Theme generation uses keyword-to-value mapping (functional but potentially generic)
- A warning is shown recommending the plugin

---

## Auto-Activating Skill

When you work in a project that has `design/manifest.json`, the **process-context** skill auto-activates. Even without running pixel-perfect commands explicitly, the AI will:

- Know the current build phase
- Follow adapter conventions for the chosen tools
- Use theme tokens instead of hardcoded values
- Wire all props to sandbox controls (Storybook `argTypes` or custom sandbox variants)
- Respect gate requirements before advancing phases

---

## Documentation

- [Adapter System](docs/adapters/README.md) - How adapters work and compose
- [Storybook Conventions](docs/storybook-conventions.md) - Controls, token stories, organization (Storybook opt-in)
- [Sandbox Spec](docs/sandbox-spec.md) - The seven-piece spec every sandbox implements (custom default)
- [Design Systems](docs/design-systems/README.md) - Supported design system references
- [Icon Libraries](docs/icon-libraries/README.md) - Supported icon library references

---

## Migration from v2

v4 is a clean break from v2. There is no incremental migration path.

- **v2 users**: Stay on the v2 git tag. Your YAML artifacts remain valid.
- **v4+**: Starts fresh with the 7-phase process. Real code is the artifact, the sandbox is generated natively in your framework.
- **Research**: `/pixel-perfect:research` output is compatible with both versions.

---

## Requirements

- Claude Code with plugin support
- A project directory with requirements (PRD.md or similar)

---

## License

MIT

---

*The best mockup of a component is the component. Stop pointing at the moon -- go there.*
