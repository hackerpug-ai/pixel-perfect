# Cross-Mockup Consistency Validation

Ensure design patterns remain consistent across all mockups in an epic.

## Why Cross-Consistency Matters

Per-mockup review validates each mockup against its spec. But specs don't guarantee consistency **between** mockups:

- Footer in view A has icons `[home, search, profile]`
- Footer in view B has icons `[home, profile, search]` ← inconsistent order
- Both pass per-mockup review, but user experience is broken

## Pattern Extraction

Before consistency review, patterns are extracted from all mockups:

### Headers

```
SELECTOR: header, [role='banner'], .header-*, [class*='app-bar']

EXTRACT:
  - Structure signature (element hierarchy hash)
  - Back button presence
  - Title text or placeholder
  - Action icons (names and order)
  - Background color/style
```

### Footers / Bottom Navigation

```
SELECTOR: footer, nav[role='navigation'], .bottom-nav, .tab-bar, [class*='bottom-nav']

EXTRACT:
  - Structure signature
  - Navigation items (labels, icons)
  - Item order (critical for consistency)
  - Active state indicator style
  - FAB presence and position
```

### Cards

```
SELECTOR: .card, [class*='card'], article

EXTRACT:
  - Structure signature
  - Header/body/footer sections
  - Action buttons
  - Image placement
  - Metadata display pattern
```

### Icons (Library-Aware)

Selector is determined by the configured icon library in `config.yaml`:

| Library | Selector |
|---------|----------|
| Material Symbols | `.material-symbols-*` |
| Lucide | `[data-lucide]` |
| Heroicons | `svg[class*='hero']`, `svg.h-*` |
| Phosphor | `.ph`, `[class*='ph-']` |
| Tabler | `.ti`, `[class*='ti-']` |
| Font Awesome | `.fa-solid`, `.fa-regular`, `.fa-light`, `.fa-brands` |
| Ionicons | `ion-icon` |
| Feather | `[data-feather]` |
| Remix | `[class*='ri-']` |
| Bootstrap Icons | `.bi`, `[class*='bi-']` |
| Ant Design Icons | `.anticon` |

**Fallback** (when no library configured): Use broad selector `.material-symbols-*, [class*='icon'], .lucide-*, svg[class*='icon']`

```
EXTRACT:
  - Icon name (normalized to library convention)
  - Size (px or token)
  - Library (should match config — flag if different)
  - Color (if not inherited)
  - Mockups where used
```

## Consistency Rules

### Rule 1: Component Identity

Same component must look identical across all views.

```
FOR EACH pattern_type IN [headers, footers, cards]:
  FOR EACH pattern IN extracted_patterns[pattern_type]:
    IF pattern.mockups.length > 1:
      base = get_html(pattern.first_seen_in, pattern_type)
      FOR EACH mockup IN pattern.mockups[1:]:
        current = get_html(mockup, pattern_type)
        diff = compute_structural_diff(base, current)
        IF diff.significant:
          REPORT: "{pattern_type} differs between {pattern.first_seen_in} and {mockup}"
```

**Significant differences**:
- Different number of child elements
- Different icon names or order
- Different text content (except dynamic placeholders)
- Different interactive elements

**Allowed variations**:
- Active state highlighting (e.g., current tab)
- Dynamic content (e.g., page title)
- Conditional elements defined in spec

### Rule 2: Footer/Navigation Order

Navigation items must appear in identical order across all views.

```
FOR EACH footer IN extracted_patterns.footers:
  IF footer.mockups.length > 1:
    base_order = footer.icon_order
    FOR EACH mockup IN footer.mockups:
      current_order = extract_icon_order(mockup, footer)
      IF current_order != base_order:
        REPORT: "Footer icon order differs: {base_order} vs {current_order}"
```

**Example Issue**:
```
dashboard_main: [home, search, jobs, profile]
jobs_list:      [home, search, jobs, profile]  ✓ consistent
profile_view:   [home, jobs, search, profile]  ✗ inconsistent
```

### Rule 3: Token Uniformity

No off-by-one color variants or spacing deviations.

```
FOR EACH token_type IN [colors, spacing]:
  values = collect_values_across_mockups(token_type)
  FOR EACH semantic_name IN values:
    unique_values = unique(values[semantic_name])
    IF unique_values.length > 1:
      REPORT: "Token '{semantic_name}' has variants: {unique_values}"
```

**Example Issue**:
```
primary color:
  dashboard_main: #3BC4A6
  jobs_list:      #3BC4A6
  profile_view:   #3BC4A7  ← off-by-one variant
```

### Rule 4: Icon Coherence (Extended)

Same action uses same icon everywhere. Additionally validates single-library enforcement.

```
configured_library = config.iconLibrary.name
action_icon_map = {}  # action -> icon_name
libraries_found = set()

FOR EACH mockup:
  FOR EACH interactive_element:
    action = infer_action(element)  # e.g., "navigate_home", "open_settings"
    icon = extract_icon(element)
    library = detect_library(element)
    libraries_found.add(library)

    IF action IN action_icon_map:
      IF action_icon_map[action] != icon:
        REPORT: "Action '{action}' uses different icons: {action_icon_map[action]} vs {icon}"
    ELSE:
      action_icon_map[action] = icon

# Single library enforcement
IF configured_library AND libraries_found.length > 1:
  REPORT: "Mixed icon libraries detected: {libraries_found}. Config requires: {configured_library}"

IF configured_library AND configured_library NOT IN libraries_found:
  REPORT: "Configured library '{configured_library}' not found. Found: {libraries_found}"
```

**CDN consistency:** The same CDN link for the icon library must appear in every mockup's `<head>`. Mixed or missing CDN links are flagged.

### Rule 5: Navigation State

Active tab must match current view.

```
FOR EACH mockup:
  current_view = extract_view_name(mockup)
  active_tab = extract_active_nav_item(mockup)
  expected_tab = map_view_to_tab(current_view)
  IF active_tab != expected_tab:
    REPORT: "Active tab '{active_tab}' doesn't match view '{current_view}'"
```

## Validation Output

```json
{
  "status": "needs-work",
  "cross_check_results": {
    "header_consistency": {
      "consistent": true,
      "pattern_count": 1,
      "mockups_checked": 5,
      "issues": []
    },
    "footer_consistency": {
      "consistent": false,
      "pattern_count": 1,
      "issues": [
        {
          "pattern": "footer-nav-v1",
          "issue": "Icon order differs",
          "expected": ["home", "search", "jobs", "profile"],
          "found": ["home", "jobs", "search", "profile"],
          "mockup": "profile_view",
          "fix": "Reorder footer icons to match dashboard_main"
        }
      ]
    },
    "icon_consistency": {
      "consistent": true,
      "unique_icons": 12,
      "issues": []
    },
    "token_consistency": {
      "consistent": false,
      "issues": [
        {
          "token": "primary",
          "expected": "#3BC4A6",
          "found": "#3BC4A7",
          "mockups": ["profile_view"],
          "fix": "Use exact token value #3BC4A6"
        }
      ]
    },
    "navigation_state": {
      "consistent": true,
      "issues": []
    }
  }
}
```

## Intentional Variations

Some variations are intentional and should not be flagged:

### Modal Headers

Modals may have different headers than main views:
```yaml
# In components.yaml
modal_header:
  differs_from: main_header
  reason: "Modals use close button instead of back"
```

### Contextual Navigation

Some views may hide navigation:
```yaml
# In views.yaml
fullscreen_player:
  hides: [bottom_nav]
  reason: "Immersive media experience"
```

### Platform Variations

iOS vs Android may have different patterns:
```yaml
# In paradigm.yaml
navigation:
  ios: tab_bar_bottom
  android: bottom_navigation_with_fab
```

## Approval Threshold

- **Pass**: 95%+ consistency (allows minor intentional variations)
- **Needs Work**: Any unintentional inconsistency detected
