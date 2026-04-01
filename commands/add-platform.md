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

- `[platform]`: Optional. The platform to add (e.g., `mobile-ios`, `web-desktop`, `web-mobile`). If omitted, presents the platform selection prompt.

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

Present confirmation summary:

```
Adding platform "web-mobile":

  Framework:   Next.js
  Style:       Tailwind CSS
  Components:  shadcn/ui
  Icons:       Lucide React
  Sandbox:     storybook (auto-selected for web)

? Confirm and add to manifest? [Yes / Change something]
```

If "Change something", loop back to the relevant TARGET step.

Validate adapter availability:
```
Adapter check:
  [x] storybook  -> docs/adapters/storybook.md
  [x] tailwind   -> docs/adapters/tailwind.md
  [x] shadcn     -> docs/adapters/shadcn.md
```

## Step 5: Update Manifest

Add the new platform entry to `manifest.platforms`:

```json
{
  "platforms": {
    "existing-platform": { "..." : "..." },
    "web-mobile": {
      "tools": {
        "framework": "nextjs",
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

**Do not modify** any existing platform entries or top-level fields.

## Completion Output

```
Platform "web-mobile" added successfully.

  Framework:   Next.js
  Style:       Tailwind CSS
  Components:  shadcn/ui
  Icons:       Lucide React
  Sandbox:     storybook (auto-selected for web)

Next: /pixel-perfect:scaffold --platform web-mobile
  This will set up the web-mobile project with Tailwind CSS + shadcn/ui + storybook
```

## What It Does NOT Do

- Does not re-run DISCOVER (goal, vibe, spec are project-wide)
- Does not affect existing platforms or their progress
- Does not run scaffold (that's a separate step)
- Does not modify top-level gates
