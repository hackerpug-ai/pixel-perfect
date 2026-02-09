---
description: "Review mockups against specifications and design standards"
---

# Design Review

Review mockups against specifications and design standards, including cross-mockup consistency validation and icon rendering checks.

## Usage

```
/pixel-perfect:review <epic-path> [options]
/pixel-perfect:review <epic-path> --consistency-only
/pixel-perfect:review <epic-path> --icon-check-only
```

## Arguments

- `<target>`: Epic or feature with mockups. Supports smart path resolution:
  - **Full path**: `.spec/epics/epic-1` → uses exact path
  - **Name only**: `epic-1` → searches spec directory for matching folder

## Command Order: init → plan → prompts → mockups → **review**

Review is step 5. Before running, check previous steps are complete.

## Scope Resolution

If no target specified, find the nearest `design/` directory or `design.config.yaml` from current location.

## Dependency Check

**BEFORE doing anything else**, verify prerequisites for the scoped directory:

```
CHECK 1: {target}/design/design.config.yaml exists?
  NO  → Run /pixel-perfect:init first

CHECK 2: {target}/design/views.yaml exists?
  NO  → Run /pixel-perfect:plan first

CHECK 3: {target}/design/prompts/*.spec.json exists?
  NO  → Run /pixel-perfect:prompts first

CHECK 4: {target}/design/mocks/*.mock.html exists?
  NO  → Run /pixel-perfect:mockups first

ALL CHECKS PASS → Proceed to review
```

Use `--skip-deps` to error instead of auto-running missing steps.

## Options

- `--skip-init`: Error if design.config.yaml missing instead of running init
- `--key <design_key>`: Review single mockup only
- `--all`: Review all mockups regardless of status
- `--continue`: Continue review from last position
- `--reset`: Reset all review statuses to pending
- `--consistency-only`: Run only cross-mockup consistency phase (skip per-mockup)
- `--skip-consistency`: Skip consistency phase (per-mockup only)
- `--icon-check-only`: Only check icon rendering across mockups

## Review Phases

### Phase 1: Per-Mockup Review

Standard review against specifications:

1. **Spec Compliance** - Matches specification requirements
2. **Component Usage** - Uses defined components correctly
   - If design system selected: validates component names match design system conventions
3. **Token Consistency** - Applies design tokens properly
   - If design system selected: validates token format matches design system (e.g., HSL for shadcn)
4. **Flow Integration** - Fits within user flows
5. **Accessibility** - Meets accessibility guidelines
6. **Icon Rendering** - Icons render as glyphs, not text (see [Icon Rendering Validation](../docs/validators/icon-rendering.md))
   - Uses configured icon library for validation rules
7. **Design System Compliance** (only when design system selected)
   - CSS framework matches design system (e.g., Tailwind classes for shadcn/ui)
   - CDN links present and correct for CSS + icons
   - Component patterns follow design system conventions
   - Icon library matches configured library (no cross-library contamination)

### Phase 2: Cross-Mockup Consistency Review

After all mockups reviewed, validate consistency across views:

1. **Component Identity** - Same component looks identical across all views
2. **Footer/Header Consistency** - Nav items in same order, same icons
3. **Token Uniformity** - No off-by-one color variants (#3BC4A6 vs #3BC4A7)
4. **Icon Coherence** - Same icon for same action, uniform sizing
   - **All icons from configured library** (no mixing libraries across mockups)
   - Icon HTML pattern matches library convention
   - Same CDN link for icon library in every mockup `<head>`
5. **Navigation State** - Active tab matches current view

See [Cross-Consistency Validation](../docs/validators/cross-consistency.md) for detailed rules.

## Pattern Extraction

Before cross-mockup review, patterns are extracted from all mockups:

```yaml
extracted_patterns:
  headers:
    - pattern_id: "header-v1"
      first_seen_in: "dashboard_main"
      mockups: ["dashboard_main", "settings", "profile"]
      components: [back_button, title, action_icons]

  footers:
    - pattern_id: "footer-nav-v1"
      first_seen_in: "dashboard_main"
      mockups: ["dashboard_main", "jobs_list", "profile"]
      icons: ["home", "search", "profile", "settings"]
      icon_order: [0, 1, 2, 3]

  icons:
    home:
      mockups: ["dashboard_main", "settings"]
      sizes: ["24px", "24px"]
      library: "material-symbols"

  icon_gore:
    - mockup: "profile_view"
      expected_icon: "home"
      found_text: "home_icon"
```

## Icon Gore Detection

Icon gore = text displayed where icon glyph should render.

**Indicators**:
- Element has icon class but displays snake_case text (e.g., "home_icon")
- Material Symbols element shows ligature name instead of glyph
- SVG element is empty or shows error placeholder

**Example**:
```html
<!-- GORE: Shows "home_icon" text instead of icon -->
<span class="material-symbols-outlined">home_icon</span>

<!-- CORRECT: Shows home icon glyph -->
<span class="material-symbols-outlined">home</span>
```

## Status Values

| Status | Meaning |
|--------|---------|
| `pending` | Awaiting review |
| `in_progress` | Currently being reviewed |
| `approved` | Passed review (per-mockup + consistency) |
| `needs_work` | Failed review, needs revision |
| `failed` | Error occurred |

## Output Format

Updates `{epic}/design/mocks/DESIGN-REVIEW.md` with enhanced output:

```
═══════════════════════════════════════════════════════
design-review | epics/epic-1
═══════════════════════════════════════════════════════
Status: needs-work

Mockups:
  ✓ dashboard_main
  ✓ jobs_list
  ✗ profile_view (2 issues)

Mockup Summary: 2/3 approved, 1 need work

Cross-Consistency Review:
  ✓ Header patterns: consistent (1 pattern across 3 views)
  ✗ Footer patterns: INCONSISTENT
    - Icon order differs: dashboard [home,search,profile] vs profile [home,profile,search]
  ✓ Icon rendering: 24/24 icons render correctly
  ✗ Token consistency: 1 variant detected
    - primary color: #3BC4A6 (2 views) vs #3BC4A7 (1 view)

Icon Gore Detected: 0

Overall: NEEDS WORK (consistency issues)
═══════════════════════════════════════════════════════
```

## Example

```
# Review all pending mockups
/pixel-perfect:review .spec/epics/epic-1

# Review single mockup (skips consistency phase)
/pixel-perfect:review .spec/epics/epic-1 --key user_profile

# Reset and re-review all
/pixel-perfect:review .spec/epics/epic-1 --reset --all

# Only check cross-mockup consistency
/pixel-perfect:review .spec/epics/epic-1 --consistency-only

# Only check icon rendering
/pixel-perfect:review .spec/epics/epic-1 --icon-check-only

# Skip consistency phase (faster, per-mockup only)
/pixel-perfect:review .spec/epics/epic-1 --skip-consistency
```

## Design System Validation Checklist

When `config.yaml` specifies a `designSystem`, these additional checks run during review:

- [ ] **CDN links correct** - CSS framework and icon library CDN links match config
- [ ] **CSS framework** - Classes/styles match the design system's CSS approach
- [ ] **Component naming** - Components use design system naming conventions
- [ ] **Token format** - Color values match design system format (hex, hsl, rgb)
- [ ] **Icon library** - All icons from the configured library (no mixed libraries)
- [ ] **Icon HTML pattern** - Icon markup follows library convention (data-lucide, material-symbols class, svg paths, etc.)
- [ ] **Icon names valid** - All icon names exist in the library's icon set (reference: `docs/icon-libraries/{name}.md`)

## Related Docs

- [Icon Rendering Validation](../docs/validators/icon-rendering.md)
- [Cross-Consistency Validation](../docs/validators/cross-consistency.md)
- [Design Conventions](../docs/DESIGN-CONVENTIONS.md)
