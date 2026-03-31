# Multi-Platform Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable pixel-perfect projects to support multiple independent platforms, each with its own toolchain and phase progression, and allow adding new platforms post-init.

**Architecture:** The manifest schema changes from a flat structure (single tools/gates) to a per-platform nested structure. A new `add-platform` command handles post-init platform addition. All existing commands gain `--platform` scoping. Auto-migration converts v4.x manifests transparently.

**Tech Stack:** Markdown command files (Claude Code plugin), JSON manifest

---

## File Structure

| File | Responsibility |
|------|---------------|
| `commands/init.md` | Phases 1-3, writes v5.0 manifest format |
| `commands/add-platform.md` | **New.** Post-init platform addition (TARGET + EQUIP for one platform) |
| `commands/scaffold.md` | Phase 4, now platform-scoped with theme carry-over |
| `commands/build.md` | Phases 4b-6, now platform-scoped |
| `commands/verify.md` | Gate checks, now platform-scoped |
| `commands/status.md` | All-platform summary view |
| `commands/refine.md` | Iteration, now platform-scoped |
| `skills/process-context/SKILL.md` | Auto-loaded context, migration logic, per-platform phase awareness |
| `.claude-plugin/plugin.json` | Plugin metadata, version bump |

---

### Task 1: Update process-context with migration logic and per-platform awareness

**Files:**
- Modify: `skills/process-context/SKILL.md`

This is the foundation — process-context auto-loads on every command and must understand both formats.

- [ ] **Step 1: Read current process-context**

Read `skills/process-context/SKILL.md` to confirm current content (already done during planning, content captured above).

- [ ] **Step 2: Add v4-to-v5 migration section**

After the existing "Legacy YAML Migration" section (line 16-29), add a new section:

```markdown
## Legacy v4.x Manifest Migration

If `design/manifest.json` exists and its `platforms` field is an **array** (v4.x format), auto-migrate to v5.0 object format before proceeding:

1. Read the existing manifest
2. Create a `platforms` object. For each platform name in the array, create a key with:
   - `tools`: copy from the top-level `tools` object
   - `phase`: copy from the top-level `phase`
   - `gates`: copy scaffold, plan, atoms, molecules, compose from top-level `gates`
   - `atoms`: copy from top-level `atoms` (or `[]` if missing)
   - `molecules`: copy from top-level `molecules` (or `[]` if missing)
   - `screens`: copy from top-level `screens` (or `[]` if missing)
3. Keep top-level `gates` with only: discover, target, equip
4. Remove top-level `tools`, `phase`, `atoms`, `molecules`, `screens`
5. Set `version` to `5.0.0`
6. Write back `design/manifest.json`
7. Inform user:

\`\`\`
Migrated manifest to v5.0.0 (multi-platform format).
  Platforms: {list of platform keys}
  All data preserved.
\`\`\`

This migration is automatic and transparent. No user confirmation needed.
```

- [ ] **Step 3: Update "Read the Manifest" section**

Replace the existing "Read the Manifest" section (lines 42-50) with platform-aware instructions:

```markdown
## Read the Manifest

Before doing any component or screen work, read `design/manifest.json` to understand:

- **Project-level**: `goal`, `vibe`, `spec`, `references` (shared across all platforms)
- **Shared gates**: discover, target, equip (top-level `gates`)
- **Platforms**: `platforms` object — each key is a platform name containing:
  - `tools`: framework, style, components, icons, sandbox for this platform
  - `phase`: current active phase for this platform
  - `gates`: scaffold through compose gate status for this platform
  - `atoms`, `molecules`, `screens`: component inventory for this platform

When a command operates on a specific platform, read `platforms[platformName]` for all platform-specific state.
```

- [ ] **Step 4: Update Phase Awareness table**

Replace the existing Phase Awareness table (lines 53-63) to add platform context:

```markdown
## Phase Awareness

Commands that operate on build phases (scaffold, build, verify, refine) are **platform-scoped**:

- If only one platform exists in the manifest, it is auto-selected
- If multiple platforms exist and no `--platform` flag is provided, prompt the user to choose
- The `--platform` flag explicitly selects which platform to operate on

| Current Phase | What You Should Do | What You Should NOT Do |
|---------------|-------------------|----------------------|
| discover | Help define goal and vibe | Write any code |
| target | Help select platforms, framework, style, components | Write any code |
| equip | Help confirm tool selections | Write any code |
| scaffold | Set up project, create theme, generate token stories **for the selected platform** | Build feature components |
| plan | Review the BUILD PLAN for the selected platform | Write component code |
| atoms | Build individual components for the selected platform | Skip to molecules or compose directly |
| molecules | Build functional atom compositions for the selected platform | Compose screens before molecules are verified |
| compose | Assemble screens from molecules and atoms for the selected platform | Skip atom/molecule verification, wire data |

**Important:** Each platform progresses independently. One platform may be at `compose: passed` while another is at `scaffold: in-progress`. Always check the selected platform's gates, not another platform's.
```

- [ ] **Step 5: Update Adapter Conventions sandbox section**

Replace the `When tools.sandbox is storybook:` section (lines 87-93) and the `When tools.sandbox is tui-sandbox:` section (lines 95-103) to clarify these are per-platform:

```markdown
### When `platforms[name].tools.sandbox` is storybook:
- Co-locate stories with components (`ComponentName.stories.tsx`)
- Use CSF3 format
- Every component gets at least a Default story
- Interactive components get variant stories

For full argTypes control conventions, see `docs/storybook-conventions.md`.

### When `platforms[name].tools.sandbox` is tui-sandbox:
- Stories use `.story.ts` format (not CSF3)
- Co-locate stories in `stories/` directory (not with components)
- Stories have `StoryMeta` default export with `title`, `adapter`, `terminal` dimensions
- Stories use declarative `mount` or imperative `run` functions
- Terminal output is captured as frames, not browser DOM
- Use `createTestHarness()` for automated testing
- ANSI codes must be stripped for text assertions
```

- [ ] **Step 6: Update Commands Reference**

Add the new command to the table (line 120-130):

```markdown
## Commands Reference

| Command | What It Does |
|---------|-------------|
| `/pixel-perfect:init` | Phases 1-3: discover + target + equip |
| `/pixel-perfect:add-platform` | Add a new platform to an existing project (post-init) |
| `/pixel-perfect:scaffold` | Phase 4: set up project structure, theme, token stories |
| `/pixel-perfect:build` | Phases 4b-6: plan -> atoms -> molecules -> compose |
| `/pixel-perfect:verify` | Run gate checks for current phase |
| `/pixel-perfect:status` | Show progress (all platforms) |
| `/pixel-perfect:research` | Design research |
| `/pixel-perfect:refine` | Iterate on code |
```

- [ ] **Step 7: Update version reference**

Replace `pixel-perfect v4.4.2` on line 10 with `pixel-perfect v5.0.0`.

- [ ] **Step 8: Commit**

```bash
git add skills/process-context/SKILL.md
git commit -m "feat: update process-context for v5.0 multi-platform manifest

Add v4-to-v5 auto-migration logic, per-platform phase awareness,
platform-scoped adapter conventions, and add-platform command reference."
```

---

### Task 2: Update init.md to write v5.0 manifest format

**Files:**
- Modify: `commands/init.md`

- [ ] **Step 1: Read current init.md**

Read `commands/init.md` to confirm content (already captured during planning).

- [ ] **Step 2: Update Manifest Output section**

Replace the "Manifest Output" section (lines 557-614) with the v5.0 format. The key change is `platforms` becomes an object and tools/gates/phase move per-platform:

```markdown
## Manifest Output

Creates `{directory}/design/manifest.json`:

**Single platform example (web):**
```json
{
  "version": "5.0.0",
  "created": "2026-03-31",
  "goal": "Field service management app for HVAC technicians",
  "vibe": "clean, professional, high-contrast for outdoor use",
  "spec": "PRD.md",
  "references": [
    "https://servicetitan.com"
  ],
  "gates": {
    "discover": "passed",
    "target": "passed",
    "equip": "passed"
  },
  "platforms": {
    "web-desktop": {
      "tools": {
        "framework": "vite",
        "style": "tailwind",
        "components": "shadcn",
        "icons": "lucide-react",
        "sandbox": "storybook"
      },
      "phase": "equip",
      "gates": {
        "scaffold": "pending",
        "plan": "pending",
        "atoms": "pending",
        "molecules": "pending",
        "compose": "pending"
      }
    }
  }
}
```

**Multi-platform example (mobile):**
```json
{
  "version": "5.0.0",
  "created": "2026-03-31",
  "goal": "Field service management app for HVAC technicians",
  "vibe": "clean, professional, high-contrast for outdoor use",
  "spec": "PRD.md",
  "references": [
    "https://servicetitan.com"
  ],
  "gates": {
    "discover": "passed",
    "target": "passed",
    "equip": "passed"
  },
  "platforms": {
    "mobile-ios": {
      "tools": {
        "framework": "expo",
        "style": "nativewind",
        "components": "react-native-reusables",
        "icons": "lucide-react-native",
        "sandbox": "storybook-native"
      },
      "phase": "equip",
      "gates": {
        "scaffold": "pending",
        "plan": "pending",
        "atoms": "pending",
        "molecules": "pending",
        "compose": "pending"
      }
    },
    "mobile-android": {
      "tools": {
        "framework": "expo",
        "style": "nativewind",
        "components": "react-native-reusables",
        "icons": "lucide-react-native",
        "sandbox": "storybook-native"
      },
      "phase": "equip",
      "gates": {
        "scaffold": "pending",
        "plan": "pending",
        "atoms": "pending",
        "molecules": "pending",
        "compose": "pending"
      }
    }
  }
}
```

**TUI example:**
```json
{
  "version": "5.0.0",
  "created": "2026-03-31",
  "goal": "Terminal dashboard for system monitoring",
  "vibe": "technical, brutalist",
  "spec": "PRD.md",
  "gates": {
    "discover": "passed",
    "target": "passed",
    "equip": "passed"
  },
  "platforms": {
    "tui": {
      "tools": {
        "framework": "bubbletea",
        "style": "lipgloss",
        "components": "bubbletea",
        "icons": "nerd-fonts",
        "sandbox": "tui-sandbox"
      },
      "phase": "equip",
      "gates": {
        "scaffold": "pending",
        "plan": "pending",
        "atoms": "pending",
        "molecules": "pending",
        "compose": "pending"
      }
    }
  }
}
```

The `spec` field is the path to the spec/PRD document (relative to the project root) that drives the component hierarchy during build. If no spec was provided, this field is omitted.

**When "Other" is selected for any tool**, the manifest includes the docs URL inside the platform's tools:

```json
{
  "platforms": {
    "web-desktop": {
      "tools": {
        "framework": "custom",
        "framework_docs": "https://example.com/framework/docs",
        "style": "custom",
        "style_docs": "https://example.com/style-system/docs",
        "components": "react-native-paper",
        "icons": "custom",
        "icons_docs": "https://example.com/icons/docs",
        "sandbox": "storybook"
      }
    }
  }
}
```
```

- [ ] **Step 3: Update Confirmation Summary examples in Phase 3: EQUIP**

Update the confirmation summary section (lines 456-506) to reflect that the manifest structure changed but the user-facing confirmation display stays the same. No structural change needed to the confirmation prompts — they already show the right info. Just update the internal note about what gets written.

Replace the line "This is **not a user choice**. The manifest records the platform-appropriate variant automatically:" (line 441) with:

```markdown
This is **not a user choice**. Each platform entry in the manifest records the platform-appropriate sandbox variant automatically:
```

- [ ] **Step 4: Update Next Steps section**

Replace the "Next Steps" section (lines 629-639) with:

```markdown
## Next Steps

After init completes:
```
Initialization complete. Manifest saved to design/manifest.json

Next: /pixel-perfect:scaffold
  This will set up your project with {style} + {components} + Storybook

To add another platform later: /pixel-perfect:add-platform
```

The message uses the actual tools selected during init (from the manifest).
```

- [ ] **Step 5: Commit**

```bash
git add commands/init.md
git commit -m "feat: update init to write v5.0 multi-platform manifest format

Platforms is now an object keyed by platform name. Tools, phase, and
build gates live per-platform. Shared gates (discover/target/equip)
remain top-level."
```

---

### Task 3: Create add-platform.md command

**Files:**
- Create: `commands/add-platform.md`

- [ ] **Step 1: Write the add-platform command**

```markdown
---
description: "Add a new platform to an existing pixel-perfect project (post-init TARGET + EQUIP for one platform)"
---

# Add Platform

Add a new platform to an existing pixel-perfect project. Runs the TARGET drill-down (framework, style, components, icons) and EQUIP validation for the new platform only, then adds it to the manifest with all build gates pending.

## Usage

```
/pixel-perfect:add-platform [platform]
```

## Arguments

- `[platform]`: Optional. The platform to add (e.g., `tui`, `web-desktop`, `mobile-ios`). If omitted, presents the platform selection prompt.

## Gate Check

**Requires:** `design/manifest.json` with top-level gates discover, target, and equip = passed.

If gates are not met:
```
Cannot add platform: project not initialized.
Run /pixel-perfect:init first.
```

## What It Does

1. Read manifest and verify preconditions
2. Show current platforms with their phase status
3. Present available platforms (excluding already-added ones)
4. Run TARGET drill-down for the new platform
5. Auto-select sandbox
6. Run EQUIP validation (adapter check)
7. Add platform entry to manifest
8. Inform user of next step

---

## Step 1: Show Current Platforms

Display what's already configured:

```
Current platforms:
  web-desktop  [compose passed]   vite + tailwind + shadcn -> storybook
```

## Step 2: Platform Selection

Present available platforms, excluding those already in the manifest:

```
? Add a platform:
  [ ] web-desktop      (already added)
  [ ] web-mobile
  [ ] mobile-ios
  [ ] mobile-android
  > tui
  [ ] cli
```

If the `[platform]` argument was provided and is valid, skip this prompt.

If the platform is already in the manifest:
```
Platform "web-desktop" is already configured.
Current platforms: web-desktop

Use /pixel-perfect:status to see progress.
```

## Step 3: TARGET Drill-Down

Run the same framework, style, component library, and icon library selection as Phase 2 of init, but scoped to the new platform's category only.

**Framework selection** — same options as init Phase 2, Step 2, filtered to the platform category:

- TUI platforms (`tui`, `cli`): Bubbletea, Textual, Ink, Other
- Web platforms (`web-desktop`, `web-mobile`): React, Next.js, Vite, Other
- Mobile platforms (`mobile-ios`, `mobile-android`): React Native, Expo, Other

**Style system selection** — same options as init Phase 2, Step 3, filtered to framework.

**Component library selection** — same options as init Phase 2, Step 4, filtered to framework.

**Icon library selection** — same options as init Phase 2, Step 5, filtered to framework.

Follow the same PRD keyword detection and `package.json` auto-detection logic from init.

## Step 4: EQUIP Validation

Auto-select sandbox based on platform (same mapping as init Phase 3):

| Platform | Sandbox |
|----------|---------|
| `web-desktop`, `web-mobile` | `storybook` |
| `mobile-ios`, `mobile-android` | `storybook-native` |
| `tui`, `cli` | `tui-sandbox` |

Present confirmation summary:

```
Adding platform "tui":

  Framework:   Bubbletea
  Style:       Lipgloss
  Components:  Bubbletea (built-in)
  Icons:       Nerd Fonts
  Sandbox:     tui-sandbox (auto-selected for TUI)

? Confirm and add to manifest? [Yes / Change something]
```

If "Change something", loop back to the relevant TARGET step.

Validate adapter availability:
```
Adapter check:
  [x] tui-sandbox  -> docs/adapters/tui-sandbox.md
  [x] lipgloss     -> docs/adapters/lipgloss.md
  [x] bubbletea    -> docs/adapters/bubbletea.md
```

## Step 5: Update Manifest

Add the new platform entry to `manifest.platforms`:

```json
{
  "platforms": {
    "existing-platform": { "..." : "..." },
    "tui": {
      "tools": {
        "framework": "bubbletea",
        "style": "lipgloss",
        "components": "bubbletea",
        "icons": "nerd-fonts",
        "sandbox": "tui-sandbox"
      },
      "phase": "equip",
      "gates": {
        "scaffold": "pending",
        "plan": "pending",
        "atoms": "pending",
        "molecules": "pending",
        "compose": "pending"
      }
    }
  }
}
```

**Do not modify** any existing platform entries or top-level fields.

## Completion Output

```
Platform "tui" added successfully.

  Framework:   Bubbletea
  Style:       Lipgloss
  Components:  Bubbletea (built-in)
  Icons:       Nerd Fonts
  Sandbox:     tui-sandbox (auto-selected for TUI)

Next: /pixel-perfect:scaffold --platform tui
  This will set up the TUI project with Lipgloss + Bubbletea + tui-sandbox
```

## What It Does NOT Do

- Does not re-run DISCOVER (goal, vibe, spec are project-wide)
- Does not affect existing platforms or their progress
- Does not run scaffold (that's a separate step)
- Does not modify top-level gates
```

- [ ] **Step 2: Commit**

```bash
git add commands/add-platform.md
git commit -m "feat: add add-platform command for post-init platform addition

New command runs TARGET + EQUIP for a single new platform and adds
it to the manifest without affecting existing platforms."
```

---

### Task 4: Update scaffold.md with --platform flag and theme carry-over

**Files:**
- Modify: `commands/scaffold.md`

- [ ] **Step 1: Add --platform option and update Usage**

Replace the Usage and Arguments sections (lines 9-17) with:

```markdown
## Usage

```
/pixel-perfect:scaffold [directory] [options]
```

## Arguments

- `[directory]`: Project directory. Defaults to current directory.

## Options

- `--platform <name>`: Target platform to scaffold (e.g., `tui`, `web-desktop`). Required when multiple platforms exist. Auto-selected when only one platform is configured.
```

- [ ] **Step 2: Update Gate Check**

Replace the Gate Check section (lines 19-31) with:

```markdown
## Gate Check

**Requires:** `design/manifest.json` with top-level gates discover, target, and equip = passed.

**Platform selection:**
- If only one platform exists in the manifest, it is auto-selected.
- If multiple platforms exist and `--platform` is not provided, prompt:
  ```
  Multiple platforms configured:
    1. web-desktop (scaffold: passed)
    2. tui (scaffold: pending)

  ? Which platform to scaffold? [1/2]
  ```
- If the selected platform's scaffold gate is already `passed`:
  ```
  Scaffold already complete for "web-desktop".
  Run with --force to re-scaffold, or choose a different platform.
  ```

If top-level gates are not met:
```
Cannot scaffold: missing prerequisites.
  discover: passed
  target: passed
  equip: NOT PASSED — run /pixel-perfect:init first

Run /pixel-perfect:init to complete project setup.
```
```

- [ ] **Step 3: Update Step 1: Load Adapter Docs**

Replace the manifest field references in the table (lines 60-64) to be platform-scoped:

```markdown
### Step 1: Load Adapter Docs

Read the selected platform's tool choices from `manifest.platforms[platform].tools`, then load the corresponding docs:

| Manifest field | Adapter location |
|----------------|-----------------|
| `platforms[platform].tools.style` | `docs/adapters/{style}.md` |
| `platforms[platform].tools.components` | `docs/adapters/{components}.md` |
| `platforms[platform].tools.sandbox` | `docs/adapters/{sandbox}.md` |

If no adapter exists for a tool, load `docs/adapters/generic.md` and warn:
```
No adapter found for "{tool}". Using generic adapter (process enforcement only).
The AI will use its general knowledge for tool-specific setup.
```
```

- [ ] **Step 4: Add theme carry-over step before Step 4: Create Theme**

Insert a new section before "Step 4: Create Theme" (before line 122):

```markdown
### Step 3b: Theme Carry-Over Check

Before generating a theme, check if any sibling platform in the manifest already has a theme (its scaffold gate is `passed`).

If a sibling theme exists, prompt the user:

```
Existing theme found from {sibling_platform}:
  Primary: {primary_color}, Secondary: {secondary_color}, Destructive: {destructive_color}
  Font: {font_family}, Spacing scale: {spacing_base}

? Translate these values to your {current_platform} platform?
  > Yes, adapt for {platform_type} (map to closest {color_system}, keep semantic names)
    Start fresh (generate new theme from vibe)
    Cherry-pick (I'll tell you which tokens to keep)
```

For TUI platforms, "adapt" means mapping hex colors to the closest ANSI 256-color equivalents while preserving semantic token names (primary, secondary, destructive, etc.).

If no sibling theme exists, skip this step and proceed to theme generation as normal.
```

- [ ] **Step 5: Update Step 3: Configure Storybook**

Replace the sandbox check (lines 113-118) to read from the platform:

```markdown
### Step 3: Configure Storybook

Check `manifest.platforms[platform].tools.sandbox`:
- `"storybook-native"` -> Follow `docs/adapters/storybook-native.md`
- `"storybook"` -> Follow `docs/adapters/storybook.md`
- `"tui-sandbox"` -> Follow `docs/adapters/tui-sandbox.md`
```

- [ ] **Step 6: Update Step 8: Update Manifest**

Replace the manifest update example (lines 234-243) to be platform-scoped:

```markdown
### Step 8: Update Manifest

On success, update the selected platform's gates:
```json
{
  "platforms": {
    "{platform}": {
      "phase": "scaffold",
      "gates": {
        "scaffold": "passed"
      }
    }
  }
}
```
```

- [ ] **Step 7: Update Completion Output**

Replace the completion output (lines 265-277) to include platform name:

```markdown
## Completion Output

```
Scaffold complete for: [project name] ({platform})

Tools configured: [framework] / [style] / [components] / [sandbox]
Theme created: [files] — [font pairing], [primary color]
[Component library pulled: N components (if CLI-based)]
Design token stories: Colors, Typography, Spacing[, Icons]

Next: /pixel-perfect:build --platform {platform}
```
```

- [ ] **Step 8: Commit**

```bash
git add commands/scaffold.md
git commit -m "feat: add --platform flag and theme carry-over to scaffold

Scaffold is now platform-scoped. When a sibling platform already has
a theme, prompts user to translate, start fresh, or cherry-pick tokens."
```

---

### Task 5: Update build.md with --platform flag

**Files:**
- Modify: `commands/build.md`

- [ ] **Step 1: Add --platform option**

Add `--platform` to the Options section (lines 19-24). Insert after `--phase`:

```markdown
## Options

- `--platform <name>`: Target platform to build (e.g., `tui`, `web-desktop`). Required when multiple platforms exist. Auto-selected when only one platform is configured.
- `--phase <name>`: Start from a specific phase (atoms, molecules, compose). Default: resume from current phase.
- `--component <name>`: Build or rebuild a specific component
- `--screen <name>`: Build or rebuild a specific screen
```

- [ ] **Step 2: Update Gate Check**

Replace the gate check section (lines 26-32) with platform-scoped logic:

```markdown
## Gate Check

**Requires:** `design/manifest.json` with the selected platform's `scaffold: passed`.

**Platform selection:**
- If only one platform exists, auto-selected.
- If multiple platforms exist and `--platform` is not provided, prompt the user to choose.
- If the selected platform's scaffold gate is not passed:
  ```
  Cannot build: scaffold not complete for "{platform}".
  Run /pixel-perfect:scaffold --platform {platform} first.
  ```
```

- [ ] **Step 3: Update manifest references throughout**

All references to `manifest.spec`, `manifest.tools`, `manifest.phase`, `manifest.gates`, `manifest.atoms`, `manifest.molecules`, `manifest.screens` throughout the file need to be understood as platform-scoped. Add a note after the Overview section (after line 48):

```markdown
### Platform Scoping

All build operations read from and write to `manifest.platforms[platform]`. References to `tools`, `phase`, `gates`, `atoms`, `molecules`, `screens` in this document refer to the selected platform's fields. The `spec` field remains top-level (shared across platforms).
```

- [ ] **Step 4: Update Completion output**

Replace the completion output (lines 699-714) to include platform:

```markdown
## Completion

```
Build complete for {platform}!

  Atoms:    5/5 verified (all controls wired)
  Molecules: verified (if applicable)
  Screens:  2/2 verified

All phases passed for {platform}. Your project has running code with:
  - 5 themed components with full Storybook controls
  - Functional molecule compositions sandboxed in Storybook
  - 2 composed screens at target viewport

To iterate: /pixel-perfect:refine --platform {platform}
To verify:  /pixel-perfect:verify --platform {platform}
To check:   /pixel-perfect:status
```
```

- [ ] **Step 5: Commit**

```bash
git add commands/build.md
git commit -m "feat: add --platform flag to build command

Build phases now operate on a single platform. All manifest reads/writes
are scoped to manifest.platforms[platform]."
```

---

### Task 6: Update verify.md with --platform flag

**Files:**
- Modify: `commands/verify.md`

- [ ] **Step 1: Add --platform option**

Add to the Options section (lines 25-29):

```markdown
## Options

- `--platform <name>`: Target platform to verify. Required when multiple platforms exist. Auto-selected when only one platform is configured.
- `--phase <name>`: Verify a specific phase instead of current (scaffold, atoms, compose, integrate)
- `--component <name>`: Verify a specific component only
- `--screen <name>`: Verify a specific screen only
- `--fix`: Attempt to fix failures automatically before reporting
```

- [ ] **Step 2: Update What It Does**

Replace lines 36-38 with:

```markdown
## What It Does

1. Reads `design/manifest.json` and selects the target platform
2. Reads the selected platform's current phase from `manifest.platforms[platform].phase`
3. Runs gate checks appropriate for that phase
4. Reports results per check
5. If all pass, advances the platform's phase gate in manifest
```

- [ ] **Step 3: Update Manifest Updates section**

Replace the manifest update example (lines 239-249) to be platform-scoped:

```markdown
## Manifest Updates

On full phase pass, verify updates the selected platform's manifest entry:

```json
{
  "platforms": {
    "{platform}": {
      "gates": {
        "atoms": "passed"
      }
    }
  }
}
```

On failure, the gate remains unchanged and the manifest is not modified.
```

- [ ] **Step 4: Commit**

```bash
git add commands/verify.md
git commit -m "feat: add --platform flag to verify command

Gate checks and manifest updates now scoped to selected platform."
```

---

### Task 7: Update status.md for all-platform summary

**Files:**
- Modify: `commands/status.md`

- [ ] **Step 1: Update What It Shows**

Replace the "What It Shows" section (lines 20-32) with:

```markdown
## What It Shows

Reads `design/manifest.json` and displays:

1. **Project info** - Goal, vibe (shared across all platforms)
2. **Platform overview** - All platforms with phase status and tool summary
3. **Per-platform detail** - For each platform: gates, tools, atoms, molecules, screens
4. **frontend-design detection** - Whether the frontend-design plugin is available
5. **Next action** - What to do next based on platform states
```

- [ ] **Step 2: Replace Sample Output**

Replace the sample output (lines 43-98) with multi-platform format:

```markdown
## Sample Output

```
pixel-perfect v5.0.0 — Project Status
====================================

Goal: Field service management app for HVAC technicians
Vibe: clean, professional, high-contrast for outdoor use

Platforms:
  web-desktop  [compose passed]     vite + tailwind + shadcn -> storybook
  tui          [scaffold pending]   bubbletea + lipgloss -> tui-sandbox

--- web-desktop ---

  Phases:
    [x] SCAFFOLD    — Project structure ready, theme configured
    [x] PLAN        — Build plan confirmed
    [x] ATOMS       — 5/5 components verified
    [x] MOLECULES   — 2/2 molecules verified
    [x] COMPOSE     — 2/2 screens verified

  Tools:
    Framework:  Vite
    Style:      Tailwind CSS      (adapter: tailwind.md)
    Components: shadcn/ui         (adapter: shadcn.md)
    Icons:      Lucide React      (adapter: n/a)
    Sandbox:    Storybook         (adapter: storybook.md)

  Atoms (5/5 verified):
    [x] StatusBadge     src/components/StatusBadge.tsx        (controls: yes)
    [x] JobCard         src/components/JobCard.tsx            (controls: yes)
    [x] DateChip        src/components/DateChip.tsx           (controls: yes)
    [x] SectionHeader   src/components/SectionHeader.tsx      (controls: yes)
    [x] ActionButton    src/components/ActionButton.tsx       (controls: yes)

  Screens (2/2 verified):
    [x] TodayFeed       src/screens/TodayFeed.tsx
    [x] JobDetail       src/screens/JobDetail.tsx

--- tui ---

  Phases:
    [ ] SCAFFOLD    — Pending
    [ ] PLAN        — Pending
    [ ] ATOMS       — Pending
    [ ] MOLECULES   — Pending
    [ ] COMPOSE     — Pending

  Tools:
    Framework:  Bubbletea
    Style:      Lipgloss          (adapter: lipgloss.md)
    Components: Bubbletea         (adapter: bubbletea.md)
    Icons:      Nerd Fonts        (adapter: n/a)
    Sandbox:    tui-sandbox       (adapter: tui-sandbox.md)

frontend-design: available (aesthetic gates active)

Next: Scaffold the tui platform
  /pixel-perfect:scaffold --platform tui
```
```

- [ ] **Step 3: Update version reference**

Replace `pixel-perfect v4.4.2` in the sample output with `pixel-perfect v5.0.0`.

- [ ] **Step 4: Commit**

```bash
git add commands/status.md
git commit -m "feat: update status command for multi-platform summary

Shows all platforms with phase status, then per-platform detail sections
with tools, gates, atoms, molecules, and screens."
```

---

### Task 8: Update refine.md with --platform flag

**Files:**
- Modify: `commands/refine.md`

- [ ] **Step 1: Add --platform option**

Add to the Options section (lines 22-28):

```markdown
## Options

- `--platform <name>`: Target platform to refine. Required when multiple platforms exist. Auto-selected when only one platform is configured.
- `--component <name>`: Target a specific component for refinement
- `--screen <name>`: Target a specific screen for refinement
- `--vibe`: Refine the project vibe and regenerate the theme
- `--theme`: Refine the theme file without changing the vibe
```

- [ ] **Step 2: Update Vibe Refinement section**

The vibe refinement (lines 127-155) affects the top-level vibe (shared), but theme regeneration is per-platform. Add a note after "Update the vibe in manifest" (line 130):

```markdown
### Vibe Refinement

```
/pixel-perfect:refine --vibe "More industrial, less corporate. Think construction site, not office."
```

1. Update the vibe in manifest (top-level — shared across all platforms)
2. For the selected platform (or prompt if multiple): regenerate theme file with new vibe interpretation
3. Regenerate Design Token stories (Colors, Typography, Spacing) for the selected platform
4. If frontend-design available: re-derive aesthetic decisions
5. List components on the selected platform that may look different with the new theme
6. Prompt: regenerate all components with new theme, or one at a time?
7. If multiple platforms exist, ask: propagate vibe to other platforms too?

```
Vibe updated: "More industrial, less corporate"

Theme regenerated for web-desktop:
  - Primary: #1E3A5F -> #D97706 (amber/orange)
  - Font: Inter -> Space Mono
  - Border radius: rounded -> sharp

Other platforms with existing themes:
  - tui (scaffold: passed)

? Propagate new vibe to tui theme? [Yes / No, keep existing tui theme]
```
```

- [ ] **Step 3: Commit**

```bash
git add commands/refine.md
git commit -m "feat: add --platform flag to refine command

Refinement is now platform-scoped. Vibe changes are shared but theme
regeneration and propagation are per-platform with user confirmation."
```

---

### Task 9: Update plugin.json version and description

**Files:**
- Modify: `.claude-plugin/plugin.json`

- [ ] **Step 1: Update version and description**

Replace the current content with:

```json
{
  "name": "pixel-perfect",
  "description": "Process orchestrator for building real UIs: enforces a 6-phase build process from PRD to running code sandboxed in Storybook. Supports web (React, Next.js, Vite), mobile (React Native, Expo), and TUI (Bubbletea, Textual, Ink) with independent per-platform progression.",
  "version": "5.0.0",
  "author": {
    "name": "Justin Rich"
  },
  "homepage": "https://github.com/hackerpug-ai/pixel-perfect",
  "repository": "https://github.com/hackerpug-ai/pixel-perfect",
  "license": "MIT",
  "keywords": [
    "design",
    "ux",
    "ui",
    "process",
    "orchestrator",
    "scaffolding",
    "components",
    "storybook",
    "multi-platform",
    "tui"
  ]
}
```

- [ ] **Step 2: Commit**

```bash
git add .claude-plugin/plugin.json
git commit -m "chore: bump version to 5.0.0 for multi-platform support

Update description to mention TUI support and per-platform progression.
Add multi-platform and tui keywords."
```
