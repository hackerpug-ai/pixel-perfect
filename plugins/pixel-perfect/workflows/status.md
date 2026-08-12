# Project Status

Display the current state of the pixel-perfect build process: phase progress, gate statuses, tool choices, design token stories, **catalog drift from capture**, and component/screen tracking. Status reports **what is**, not only what the manifest claimed.

## Usage

```
pixel-perfect:status [directory]
```

## Arguments

- `[directory]`: Directory to check. Defaults to current directory.

## What It Shows

Reads `design/manifest.json` **and** runs catalog capture when goldens exist:

1. **Project info** - Goal, vibe (shared across all platforms)
2. **Platform overview** - All platforms with phase status and tool summary
3. **Per-platform detail** - For each platform: gates, tools, atoms, molecules, screens
4. **Catalog drift** (from `verify-catalog.mjs --check`) — not manifest archaeology:
   - stories whose capture no longer matches goldens
   - entities with missing goldens
   - deprecated entities that still have live dependents (`--reach`)
   - **dead inventory** — entities that reach no live root (screen)
5. **Design engine** - Whether `frontend-designer` or the bundled design contract will execute aesthetic work
6. **Design artifacts** - Whether wireframes (`design/wireframes/` + `wireframed: true`) or a `design-deconstruct` system (`design/system/` + `deconstructed: true`) seed this project
7. **Next action** - What to do next based on platform states

## Status Icons

| Icon | Meaning |
|------|---------|
| `[x]` | Gate passed |
| `[~]` | In progress |
| `[ ]` | Pending |
| `[!]` | Capture drift (golden mismatch or missing) |

## Catalog drift section

When `platforms[platform].capture` is configured (or goldens exist under `design/goldens/`), run:

```
node {plugin}/scripts/verify-catalog.mjs --check <project-root> --platform {platform}
node {plugin}/scripts/verify-catalog.mjs --reach <each inventory name> <project-root> --platform {platform}
```

Report:

```
Catalog (web-desktop):
  [x] check clean — 12 stories match goldens
  [!] drift: atoms/StatusBadge/default (unreviewed change)
  [!] missing golden: molecules/JobRow/empty
  Dead inventory: UnusedChip (reaches no live root)
  Deprecated with live dependents: LegacyJobCard → Home, Settings
```

Staleness is **never stored** on the manifest. A drifted capture *is* the stale signal. Dead inventory is reported separately from removals proposed by `evolve`.

Pinned entities (`platforms[platform].pinned`) are noted when they appear in dead inventory so the user is not told to delete deliberate primitives.

## Sample Output

```
pixel-perfect v8.0.0 — Project Status
====================================

Goal: Field service management app for HVAC technicians
Vibe: clean, professional, high-contrast for outdoor use

Platforms:
  web-desktop  [compose passed]     vite + tailwind + shadcn -> custom sandbox
  mobile-ios   [scaffold pending]   expo + nativewind + react-native-reusables -> custom sandbox

--- web-desktop ---

  Phases:
    [x] SCAFFOLD    — Project structure ready, theme configured
    [x] PLAN        — Build plan confirmed
    [x] ATOMS       — 5/5 components verified · atoms_capture passed
    [x] MOLECULES   — 2/2 molecules verified · molecules_capture passed
    [x] COMPOSE     — 2/2 screens verified · compose_capture passed

  Tools:
    Framework:  Vite
    Style:      Tailwind CSS      (adapter: tailwind.md)
    Components: shadcn/ui         (adapter: shadcn.md)
    Icons:      Lucide React      (adapter: n/a)
    Sandbox:    Custom            (adapter: custom-sandbox.md)
    Capture:    npm run sandbox:capture → design/goldens/web-desktop

  Catalog:
    [x] check clean — 14 stories match goldens
    Dead inventory: (none)
    Pinned: EmptyState

  Atoms (5/5 verified):
    [x] StatusBadge     src/components/StatusBadge.tsx
    [x] JobCard         src/components/JobCard.tsx
    [x] DateChip        src/components/DateChip.tsx
    [x] SectionHeader   src/components/SectionHeader.tsx
    [x] ActionButton    src/components/ActionButton.tsx

  Screens (2/2 verified):
    [x] TodayFeed   /today      src/screens/TodayFeed.tsx   (3 states: default, empty, loading)
    [x] JobDetail   /jobs/:id   src/screens/JobDetail.tsx   (2 states: default, loading)

--- mobile-ios ---

  Phases:
    [ ] SCAFFOLD    — Pending
    [ ] PLAN        — Pending
    [ ] ATOMS       — Pending
    [ ] MOLECULES   — Pending
    [ ] COMPOSE     — Pending

  Tools:
    Framework:  Expo
    Style:      NativeWind        (adapter: nativewind.md)
    Components: React Native Reusables (adapter: react-native-reusables.md)
    Icons:      Lucide React Native (adapter: n/a)
    Sandbox:    Custom            (adapter: custom-sandbox.md)

design engine:   frontend-designer (bundled contract loaded)
wireframes:     design/wireframes/ (3 screens) — structural targets
deconstruction: design/system/ (4 views, 9 atoms) — pixel-perfect targets active

Next: Scaffold the mobile-ios platform
  pixel-perfect:scaffold --platform mobile-ios
```

## No Manifest Found

If no `design/manifest.json` exists in the directory or parents:

```
pixel-perfect v8.0.0 — Project Status
====================================

Status: Not initialized

No design/manifest.json found in this directory or parent directories.

Next: pixel-perfect:init
  This will walk you through project setup (discover → target → equip)
```

## Design Engine Detection

The status command checks whether the named `frontend-designer` agent is available at runtime. If it is, report `design engine: frontend-designer`. Otherwise report `design engine: bundled contract`. Aesthetic gates remain active in both cases because the primary agent executes `docs/DESIGN-CONTRACT.md` directly when delegation is unavailable.

## Workflow Integration

Status is informational only — it reads the manifest and capture, and displays them. It does not modify any files (it may run `--check` / `--reach` which are read-only relative to goldens; staging under `design/.captures/` is ephemeral).

Use it:
- Before starting work to see where things stand
- After running build, evolve, or verify to confirm progress
- To determine what command to run next (`evolve` when inventory must change; `refine` when only implementation changes)
