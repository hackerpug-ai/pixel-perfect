# Add Platform

Add a new platform to an existing pixel-perfect project. Runs the TARGET drill-down (framework, style, components, icons) and EQUIP validation for the new platform only, then adds it to the manifest with all build gates pending.

## Usage

```
pixel-perfect:add-platform [platform]
```

## Arguments

- `[platform]`: Optional. The platform to add (e.g., `mobile-ios`, `web-desktop`, `web-mobile`). If omitted, presents the platform selection prompt.

## Gate Check

**Requires:** `design/manifest.json` with top-level gates discover, target, and equip = passed.

If gates are not met:
```
Cannot add platform: project not initialized.
Run pixel-perfect:init first.
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
  web-desktop  [compose passed]   vite + tailwind + shadcn -> custom sandbox
```

## Step 2: Platform Selection

Offer only the platforms not already in the manifest — one option each, no option marked, because which platform to add next is the user's call rather than the workflow's:

```user_choice
batch: A1 — the platform to add
- header: Platform
  multiSelect: true
  question: Which platforms should be added? Select every one you want.
  options:
    - label: Mobile web
      description: A responsive browser build at phone widths, sharing component source with the desktop web platform already configured. Gets its own theme and its own gate set.
    - label: iOS
      description: A native iOS app. Adds a mobile-ios platform that picks its own framework and component library, and whose gates pass or fail independently of the web platforms.
    - label: Android
      description: A native Android app. Adds a mobile-android platform that picks its own framework and component library, and whose gates pass or fail independently of the web platforms.
```

If the `[platform]` argument was provided and is valid, skip this question and report the platform as settled.

If the platform is already in the manifest:
```
Platform "web-desktop" is already configured.
Current platforms: web-desktop

Use pixel-perfect:status to see progress.
```

## Step 3: TARGET Drill-Down

Run the same framework, style, component library, and icon library selection as Phase 2 of init, but scoped to the new platform's category only.

**Framework selection** — same options as init Phase 2, Step 2, filtered to the platform category:

- Web platforms (`web-desktop`, `web-mobile`): React, Next.js, Vite, SvelteKit, Other
- Mobile platforms (`mobile-ios`, `mobile-android`): React Native, Expo, Other

**Style system selection** — same options as init Phase 2, Step 3, filtered to framework.

**Component library selection** — same options as init Phase 2, Step 4, filtered to framework. For **SvelteKit**, present the Svelte libraries (shadcn-svelte, Bits UI, Skeleton, Flowbite Svelte, Other, None) — React libraries do not apply.

**Icon library selection** — same options as init Phase 2, Step 5, filtered to framework.

Follow the same PRD keyword detection and `package.json` auto-detection logic from init.

## Step 4: EQUIP Validation

The **sandbox defaults to `custom`** for all platforms (a native component browser generated in the target framework per `docs/sandbox-spec.md`). Use the same sandbox choice flow as init Phase 3 — custom by default, Storybook/tui-sandbox only if the user asks.

| Platform | Default Sandbox |
|----------|---------|
| all platforms | `custom` (native browser generated in the framework) |

Present confirmation summary:

```
Adding platform "web-mobile":

  Framework:   Next.js
  Style:       Tailwind CSS
  Components:  shadcn/ui
  Icons:       Lucide React
  Sandbox:     custom (native Next.js component browser)
```

Then ask, naming the actual platform and tools:

```user_choice
batch: A2 — lock in the new platform
- header: Confirm
  question: Add this platform to the manifest with this toolchain?
  options:
    - label: Add the platform (Recommended)
      description: Writes the new platform entry with its own pending gate set. The platforms already configured are untouched, and their gates keep whatever state they were in.
    - label: Change the toolchain
      description: Reopens the framework, style system, component library, and icon questions for this platform only. Nothing is written to the manifest until you confirm.
    - label: Cancel
      description: Writes nothing and exits. The manifest keeps exactly the platforms it already had.
```

Validate adapter availability (include the framework adapter when one exists, e.g. `sveltekit`; omit the row for React/Next/Vite):
```
Adapter check:
  [x] sveltekit      -> docs/adapters/sveltekit.md   (framework adapter)
  [x] custom-sandbox -> docs/adapters/custom-sandbox.md (default)
  [x] tailwind       -> docs/adapters/tailwind.md
  [x] shadcn-svelte  -> docs/adapters/shadcn-svelte.md
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
        "sandbox": "custom"
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
  Sandbox:     custom (native Next.js component browser)

Next: pixel-perfect:scaffold --platform web-mobile
  This will set up the web-mobile project with Tailwind CSS + shadcn/ui + custom sandbox
```

## What It Does NOT Do

- Does not re-run DISCOVER (goal, vibe, spec are project-wide)
- Does not affect existing platforms or their progress
- Does not run scaffold (that's a separate step)
- Does not modify top-level gates
