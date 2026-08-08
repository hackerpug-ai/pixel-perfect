# Refine (Code Iteration)

Collect feedback on specific components or screens, regenerate the affected code, and re-run verification. This is how you iterate after the initial build. Every refinement produces updated real code and re-verifies it in the sandbox.

## Usage

```
pixel-perfect:refine [target] [feedback]
pixel-perfect:refine --component <name> [feedback]
pixel-perfect:refine --screen <name> [feedback]
```

## Arguments

- `[target]`: Directory to refine. Defaults to current directory.
- `[feedback]`: Optional free-form feedback text. If provided, auto-detects what's affected.

## Options

- `--platform <name>`: Target platform to refine. Required when multiple platforms exist. Auto-selected when only one platform is configured.
- `--component <name>`: Target a specific component for refinement
- `--screen <name>`: Target a specific screen for refinement
- `--vibe`: Refine the project vibe and regenerate the theme
- `--theme`: Refine the theme file without changing the vibe

## Gate Check

**Requires:** `design/manifest.json` exists with at least `scaffold: passed`.

## Workflow

### Mode 1: Targeted (component or screen specified)

```
pixel-perfect:refine --component StatusBadge "Make the badge more rounded, use a subtle gradient background"
```

1. Load the component file and its story
2. Load adapter context and theme
3. Load `docs/DESIGN-CONTRACT.md` and run `DESIGN_EXECUTE` with the current surface plus the feedback
4. Regenerate the component with the resulting decisions applied
5. Regenerate the story — ensure all props remain wired to `argTypes` controls
6. Run verification for the affected component (compile, render, controls check)
7. If this component is used in screens, note which screens may need updates

```
Refining: StatusBadge

Applied changes:
  - Increased border radius to pill shape
  - Added subtle gradient background using theme primary colors

Verification:
  [x] StatusBadge compiles
  [x] StatusBadge renders in sandbox
  [x] Story updated with new appearance
  [x] All props wired to argTypes controls

Note: StatusBadge is used in these screens (may need re-compose):
  - TodayFeed
  - JobDetail

Run pixel-perfect:refine --screen TodayFeed to update if needed.
```

### Mode 2: Smart Detection (feedback only)

```
pixel-perfect:refine "The color palette feels too muted, and the job cards need more visual weight"
```

Analyzes feedback to detect affected items:

| Keywords | Affects |
|----------|---------|
| "color", "palette", "colors" | Theme file + Design System/Colors token story |
| "font", "typography" | Theme file + Design System/Typography token story |
| "spacing", "padding", "margin" | Theme file or specific components + Design System/Spacing token story |
| Component name (e.g., "job card") | Named component + its story |
| Screen name (e.g., "today feed") | Named screen + its story |
| "vibe", "feel", "aesthetic" | Theme + token stories + potentially all components |
| "controls", "props" | Story argTypes for named component |

```
Detected refinement targets:
  - Theme (color palette)
  - Design System/Colors token story
  - JobCard component (visual weight)
```

Then confirm, naming the actual detected targets:

```user_choice
batch: R1 — what the feedback touches
- header: Targets
  question: Your feedback maps to these three targets. Refine all of them?
  options:
    - label: Refine all three (Recommended)
      description: Applies the feedback to the theme, the Colors token story, and the JobCard component together, then re-verifies each. Refining them separately risks the token story drifting from the theme it documents.
    - label: Change the list
      description: Choose Other and name the targets to add or drop. Useful when the feedback reads as touching a component but you only meant the theme underneath it.
```

### Mode 3: Interactive (no feedback)

```
pixel-perfect:refine
```

A project usually has more refinable items than one question can hold, so **ask by category first**, then narrow. Both questions go in one call when the categories are already known; otherwise the narrowing question follows immediately.

```user_choice
batch: R2 — what to refine
- header: Scope
  multiSelect: true
  question: What would you like to refine? Select every area that applies.
  options:
    - label: Theme and vibe
      description: The color palette, type scale, and spacing that every component inherits. Changing this changes how everything looks at once, and the token stories regenerate with it.
    - label: Token stories
      description: The Colors, Typography, and Spacing stories that document the theme in the sandbox. Refine these when the theme is right but the documentation of it reads badly.
    - label: Components
      description: Individual atoms and molecules — StatusBadge, JobCard, DateChip, SectionHeader, ActionButton. The next question narrows to which ones.
    - label: Screens
      description: Full screen layouts such as TodayFeed and JobDetail, including how molecules are arranged and spaced. The next question narrows to which ones.
- header: Which ones
  multiSelect: true
  question: Which components should be refined? Select every one you want to change.
  options:
    - label: JobCard
      description: The job summary card used in the feed and the detail header. Refining it changes both screens that compose it, so those screens are re-verified afterward.
    - label: StatusBadge
      description: The status pill used inside JobCard and on the detail screen. The smallest of these, and the one most other components depend on.
    - label: DateChip
      description: The date and time chip used in the feed rows. Self-contained, so refining it re-verifies only the screens it appears on.
    - label: Something else
      description: Choose Other and name the components. Useful when the component you want is not among the ones listed here.
```

For each selected item, propose the change rather than asking blank — read the item's current implementation and offer the refinements it most plausibly needs, with Other as the way to describe something different. Ask at most four items per call.

```user_choice
batch: R2b — the change for each item
- header: JobCard
  question: What should change about JobCard? Choose Other to describe something else.
  options:
    - label: Stronger status signal
      description: Adds a left border accent colored by job status and deepens the shadow, so a scanning eye picks up state before reading any text. Touches the card's container only, not its contents.
    - label: Tighter density
      description: Reduces vertical padding and the gap between rows so more jobs fit on one screen. Costs some touch-target comfort on mobile, which matters if it is used with gloves on.
    - label: Clearer hierarchy
      description: Raises the job title's weight and lowers the metadata's contrast, so the two stop competing. Changes type only — no layout, spacing, or color-token changes.
```

### Vibe Refinement

```
pixel-perfect:refine --vibe "More industrial, less corporate. Think construction site, not office."
```

1. Update the vibe in manifest (top-level — shared across all platforms)
2. For the selected platform (or prompt if multiple): regenerate theme file with new vibe interpretation
3. Regenerate Design Token stories (Colors, Typography, Spacing) for the selected platform
4. Run `DESIGN_EXECUTE` with the bundled design contract to re-derive aesthetic decisions
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
  - mobile-ios (scaffold: passed)
```

```user_choice
batch: R3 — the other platforms
- header: Propagate
  question: Should the new vibe be applied to the other platform's theme too?
  options:
    - label: Apply it everywhere (Recommended)
      description: Regenerates the mobile-ios theme from the same vibe, so both platforms stay recognizably the same product. Components on that platform will look different afterward and are re-verified.
    - label: Leave the other platform alone
      description: Only this platform's theme changes. The two platforms will diverge visually until you refine the other one deliberately, which is what you want if they are intentionally distinct.
```

## Controls Refinement

When refining a component that has new or changed props, the story must be updated to match:

- **New prop added** → Add corresponding `argType` control
- **Prop type changed** → Update `argType` control type (e.g., string → select)
- **Prop removed** → Remove `argType` entry

After refinement, verification confirms:
```
Controls check:
  [x] All component props have matching argTypes
  [x] Control types match prop types
  [x] Default args are set for required props
```

## Cascade Handling

When a refinement affects upstream items, downstream items may need updates:

```
Refinement cascade:
  Theme changed → All components use theme tokens → Visual change expected
  Theme changed → Design Token stories → Must regenerate
  StatusBadge changed → Used in TodayFeed, JobDetail → Screens may need re-compose
```

```user_choice
batch: R4 — the cascade
- header: Cascade
  question: Should the screens affected by this refinement be updated too?
  options:
    - label: Update them now (Recommended)
      description: Re-composes TodayFeed and JobDetail against the changed components and re-verifies both. Skipping this leaves screens rendering against components that no longer look the way the screens assume.
    - label: I will handle the screens
      description: Refines only what you selected and leaves the screens as they are. Their gates are marked stale so the next verify reports them, rather than letting the drift go unnoticed.
```

## Manifest Updates

Refine updates the manifest to reflect changed items:

```json
{
  "atoms": [
    {
      "name": "StatusBadge",
      "file": "src/components/StatusBadge.tsx",
      "story": "src/components/StatusBadge.stories.tsx",
      "status": "verified",
      "controls": true
    }
  ]
}
```

If verification fails after refinement, status reverts to `in-progress`:
```json
{
  "status": "in-progress",
  "controls": false
}
```

## Examples

### Refine a specific component
```
pixel-perfect:refine --component ActionButton "Add a loading spinner state and increase the touch target to 48px"
```

### Refine a screen layout
```
pixel-perfect:refine --screen TodayFeed "Add pull-to-refresh and a floating action button for new job"
```

### Broad feedback
```
pixel-perfect:refine "Everything feels too cramped on mobile. Need more breathing room between cards."
```
→ Detects: theme spacing + Design System/Spacing token story + JobCard + TodayFeed layout

### Theme-only change
```
pixel-perfect:refine --theme "Switch to dark mode as default"
```
→ Regenerates: theme file + all Design Token stories
