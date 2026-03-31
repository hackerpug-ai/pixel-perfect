---
description: "Iterate on components, screens, and theme with targeted feedback, then re-verify"
---

# Refine (Code Iteration)

Collect feedback on specific components or screens, regenerate the affected code, and re-run verification. This is how you iterate after the initial build. Every refinement produces updated real code and re-verifies it in the Storybook sandbox.

## Usage

```
/pixel-perfect:refine [target] [feedback]
/pixel-perfect:refine --component <name> [feedback]
/pixel-perfect:refine --screen <name> [feedback]
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
/pixel-perfect:refine --component StatusBadge "Make the badge more rounded, use a subtle gradient background"
```

1. Load the component file and its story
2. Load adapter context and theme
3. Load frontend-design context (if available)
4. Regenerate the component with feedback applied
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
  [x] StatusBadge renders in Storybook
  [x] Story updated with new appearance
  [x] All props wired to argTypes controls

Note: StatusBadge is used in these screens (may need re-compose):
  - TodayFeed
  - JobDetail

Run /pixel-perfect:refine --screen TodayFeed to update if needed.
```

### Mode 2: Smart Detection (feedback only)

```
/pixel-perfect:refine "The color palette feels too muted, and the job cards need more visual weight"
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

? Confirm targets? [Yes / Modify]
```

### Mode 3: Interactive (no feedback)

```
/pixel-perfect:refine
```

Shows selection of what to refine:

```
? What would you like to refine?
  [ ] Theme / Vibe
  [ ] Design Token Stories
  [ ] StatusBadge
  [ ] JobCard
  [ ] DateChip
  [ ] SectionHeader
  [ ] ActionButton
  [ ] TodayFeed (screen)
  [ ] JobDetail (screen)
```

For each selected item, prompts for feedback:

```
? What changes for JobCard?
> Add a left border accent color based on job status. Make the shadow more pronounced.
```

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

? Auto-propagate to affected screens? [Yes / No, I'll do it manually]
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
/pixel-perfect:refine --component ActionButton "Add a loading spinner state and increase the touch target to 48px"
```

### Refine a screen layout
```
/pixel-perfect:refine --screen TodayFeed "Add pull-to-refresh and a floating action button for new job"
```

### Broad feedback
```
/pixel-perfect:refine "Everything feels too cramped on mobile. Need more breathing room between cards."
```
→ Detects: theme spacing + Design System/Spacing token story + JobCard + TodayFeed layout

### Theme-only change
```
/pixel-perfect:refine --theme "Switch to dark mode as default"
```
→ Regenerates: theme file + all Design Token stories
