<p align="center">
  <img src="assets/banner.png" alt="pixel-perfect banner" width="100%">
</p>

# pixel-perfect

A Claude Code plugin that skips the mockup abstraction entirely. Instead of generating designs that get "lost in translation," it scaffolds real React components during design ideation — all sandboxed in Storybook.

---

## Why Skip the Abstraction?

Your Figma mock is not your product. And AI just made that abstraction obsolete.

**AI reads code better than it reads pixels.** That insight flipped everything. Why mock when you can just… make the thing?

The unlock was Storybook. That tool everyone wants to use but nobody has time to set up? Turns out when you can generate stories automatically, the platform actually works.

pixel-perfect follows the organic design process:
1. Define theme tokens
2. Build atomic components
3. Scaffold entire views

All in a Storybook sandbox. All production-ready from the start. No more pointing at the moon — you just go there.

---

## The 7-Phase Process

| Phase | What Happens | Gate Checks |
|-------|--------------|-------------|
| **DISCOVER** | Define goal + vibe from PRD | Goal statement exists, vibe captured |
| **TARGET** | Select platforms + framework | Platform/framework declared |
| **EQUIP** | Select style + component libraries | Adapters validated |
| **SCAFFOLD** | Install tools, create theme, generate token stories | Theme renders, Storybook runs |
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
5. **What framework?** (React, Next.js, Vite, React Native, Expo, or provide docs URL)
6. **What style system?** (Tailwind, NativeWind, CSS Modules, or provide docs URL)
7. **What component library?** (shadcn, Paper, Mantine, none, or provide docs URL)

The UI library is completely flexible — use whatever you want or build from scratch. pixel-perfect uses `AskUserQuestion` to follow your lead.

---

## Storybook as the Sandbox

Storybook is the universal sandbox. Every component, design token, and screen gets a story — viewable immediately, interactive from day one.

| Platform | Sandbox | Launch |
|----------|---------|--------|
| Web (React, Next.js, Vite) | Browser Storybook | `pnpm storybook` → localhost:6006 |
| Mobile (React Native, Expo) | On-device Storybook | `pnpm storybook` → iOS Simulator / Android Emulator |

The scaffold phase sets everything up. You just run `pnpm storybook` and start building.

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

Every component prop is wired to Storybook controls via `argTypes`. This makes every component interactive — you can tweak props directly in the browser.

---

## Commands

| Command | Phases | What It Does |
|---------|--------|-------------|
| `/pixel-perfect:init` | 1-3 | DISCOVER goal + vibe, TARGET platforms + framework + tools, EQUIP |
| `/pixel-perfect:scaffold` | 4 | Install tools, create theme, generate design token stories, verify hello-world |
| `/pixel-perfect:build` | 5-7 | Build atoms, compose screens, wire integration |
| `/pixel-perfect:verify` | any | Run gate checks for current phase |
| `/pixel-perfect:status` | any | Show phase progress, controls coverage, and component tracking |
| `/pixel-perfect:research` | any | Research design patterns and competitors |
| `/pixel-perfect:refine` | 5+ | Iterate on components/screens with feedback |

### Command Flow

```
research (optional)
    |
    v
  init  -->  scaffold  -->  build  -->  verify
  (1-3)      (4)           (5-7)       (gates)
                              |
                              v
                           refine (iterate)
```

---

## Adapter System

Adapters are reference docs that teach the AI how to scaffold, build, and verify for specific tools. They're loaded based on the user's choices during init. The commands themselves are tool-agnostic.

| Category | What It Controls | Loaded When |
|----------|-----------------|-------------|
| **Style** | Visual styling | User selects a style system |
| **Components** | UI component library | User selects a component library |
| **Sandbox** | Preview environment | Always (Storybook) |

### Included Adapters

| Adapter | Category |
|---------|----------|
| Tailwind / NativeWind | style |
| shadcn/ui | components (web) |
| React Native Paper | components (mobile) |
| Storybook | sandbox |
| Generic | fallback |

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
    "sandbox": "storybook"
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
- Wire all props to Storybook controls
- Respect gate requirements before advancing phases

---

## Documentation

- [Adapter System](docs/adapters/README.md) - How adapters work and compose
- [Storybook Conventions](docs/storybook-conventions.md) - Controls, token stories, organization
- [Design Systems](docs/design-systems/README.md) - Supported design system references
- [Icon Libraries](docs/icon-libraries/README.md) - Supported icon library references

---

## Migration from v2

v4 is a clean break from v2. There is no incremental migration path.

- **v2 users**: Stay on the v2 git tag. Your YAML artifacts remain valid.
- **v4+**: Starts fresh with the 7-phase process. Real code is the artifact, Storybook is the sandbox.
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
