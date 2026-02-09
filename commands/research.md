---
description: "Research UI/UX design patterns, trends, and inspirations using web search tools"
---

# Design Research

Research UI/UX design patterns, trends, and competitor designs using web search tools. Save findings to a shared research library that informs the design planning phase.

## Usage

```
/pixel-perfect:research <query> [options]
/pixel-perfect:research --topic <topic> [options]
/pixel-perfect:research --trend <trend-name> [options]
/pixel-perfect:research --competitor <url> [options]
```

## Arguments

- `<query>`: Free-form search query for design research

## Options

- `--topic <topic>`: Research a specific design topic (e.g., "mobile-navigation", "form-design")
- `--trend <name>`: Research current design trends (e.g., "bento-grids", "glassmorphism")
- `--competitor <url>`: Analyze a competitor's design patterns
- `--sources <list>`: Specific sources to use (exa, jina, web)
- `--save`: Save research to design-research folder (default: true)
- `--append <file>`: Append to existing research file
- `--no-save`: Display research only, don't save

## Research Sources

The command uses available web search tools in this priority order:

| Source | Description | Use For |
|--------|-------------|---------|
| **Exa** | Advanced semantic search | Finding design articles, case studies, trend analysis |
| **Jina** | Web reading and URL analysis | Extracting patterns from specific URLs |
| **Web Search** | General web search | Fallback for broad queries |

**Source availability:** The command automatically detects which tools are available and falls back gracefully.

## Output Locations

Research artifacts are saved to the configured research folder:

```
{specRoot}/design-research/
├── INDEX.md              # Catalog of all research
├── topics/               # Research by design topic
│   ├── mobile-navigation.md
│   ├── form-design.md
│   └── ...
├── trends/               # Trend research
│   ├── bento-grids.md
│   ├── glassmorphism.md
│   └── ...
└── competitors/          # Competitor analysis
    ├── competitor-name.md
    └── ...
```

**Default path:** `design-research/` (relative to `specRoot`)

**Configure via** `.pixel-perfect/config.json`:
```json
{
  "designResearch": {
    "enabled": true,
    "path": "design-research",
    "sources": ["exa", "jina"]
  }
}
```

## Research Workflow

```
1. User runs: /pixel-perfect:research "mobile bottom navigation patterns 2025"

2. Command:
   - Reads config for research sources and destination
   - Searches using available tools (Exa, Jina, Web)
   - Aggregates and structures findings

3. Output saved to:
   {specRoot}/design-research/topics/mobile-bottom-navigation.md

4. INDEX.md updated with:
   - Topic name
   - Date researched
   - Sources used
   - Key findings summary

5. Research available for plan phase:
   - Plan command checks design-research/ for relevant topics
   - Incorporates findings into paradigm.yaml
```

## Examples

### Research a design topic

```
> /pixel-perfect:research --topic "mobile bottom navigation" 2025

Searching for: mobile bottom navigation 2025
Using sources: Exa, Jina

Found 12 relevant sources...

✓ Saved to: .spec/design-research/topics/mobile-bottom-navigation.md
✓ Updated INDEX.md

Key findings:
  - FAB integration is standard pattern (87% of apps)
  - Label-free icons trending in Android design
  - Gesture navigation influencing tab placement
```

### Research current trends

```
> /pixel-perfect:research --trend "bento grids"

Researching trend: bento grids
Using sources: Exa

Found 8 relevant sources...

✓ Saved to: .spec/design-research/trends/bento-grids.md

Summary:
  - Grid-based layouts gaining popularity
  - Key characteristic: asymmetric tiles
  - Popularized by Apple, linear.app
  - Best for: dashboards, analytics, content-heavy apps
```

### Analyze competitor

```
> /pixel-perfect:research --competitor "https://linear.app" --sources jina

Analyzing: https://linear.app
Using source: Jina

Extracted patterns:
  - Dark mode default
  - Bento grid dashboard layout
  - Command palette (Cmd+K) prominent
  - Left sidebar navigation
  - Status badges with color coding

✓ Saved to: .spec/design-research/competitors/linear-app.md
```

### Quick research without saving

```
> /pixel-perfect:research "card spacing patterns" --no-save

Searching for: card spacing patterns

Quick findings:
  - 8px-16px-24px rhythm (tailwind spacing scale)
  - Card padding: 16px mobile, 24px desktop
  - Gap between cards: 16px minimum
  - Section spacing: 48px-64px

(Research not saved)
```

### Append to existing research

```
> /pixel-perfect:research "mobile navigation gestures" --append "mobile-navigation"

Found additional patterns...
✓ Appended to: .spec/design-research/topics/mobile-navigation.md
```

## Research Artifact Format

Saved research files follow this structure:

```markdown
# Mobile Bottom Navigation Patterns

**Researched:** 2025-02-01
**Sources:** Exa, Jina, Web Search
**Query:** mobile bottom navigation patterns 2025

## Summary

Brief overview of key findings... (2-3 sentences)

## Patterns Found

### Pattern 1: Floating Action Button Integration
- **Source:** [Article URL]
- **Description:** The FAB is positioned between nav items, replacing the center tab
- **Usage:** Popular in productivity apps (Gmail, Tasks)
- **Platforms:** Primarily Android, some iOS adoption
- **Best for:** Apps with a single primary action

### Pattern 2: Label-Free Icons
- **Source:** [Case Study URL]
- **Description:** Navigation uses icons only, no text labels
- **Usage:** Emerging trend, space-constrained designs
- **Platforms:** Primarily Android
- **Consideration:** Discoverability tradeoff

## Key Insights

1. FAB integration increases primary action engagement by ~40%
2. Label-free navigation saves ~20% vertical space
3. Gesture navigation (swipe) is reducing reliance on bottom tabs
4. Animation duration: 200-300ms for tab transitions

## References

- [Mobile Navigation Patterns 2025](URL) - Comprehensive analysis
- [Case Study: Gmail's Navigation Redesign](URL) - FAB integration deep dive
- [Apple HIG: Tab Bars](URL) - Official guidelines

## Related Topics

- [[Mobile Navigation Hierarchies]](./mobile-navigation-hierarchies.md)
- [[Gesture-Based Navigation]](./gesture-navigation.md)
- [[Tab Bar Alternatives]](./tab-alternatives.md)

## Last Updated

2025-02-01
```

## INDEX.md Format

The research catalog (`INDEX.md`) tracks all research:

```markdown
# Design Research Catalog

Last updated: 2025-02-01

## Topics

| Topic | Date | Sources | Key Findings |
|-------|------|---------|--------------|
| [Mobile Bottom Navigation](./topics/mobile-bottom-navigation.md) | 2025-02-01 | Exa, Jina | FAB integration, label-free icons |
| [Form Design Patterns](./topics/form-design.md) | 2025-01-28 | Exa | Validation placement, single column |
| [Onboarding Flows](./topics/onboarding.md) | 2025-01-25 | Web | Progressive disclosure, skip options |

## Trends

| Trend | Date | Status | Description |
|-------|------|--------|-------------|
| [Bento Grids](./trends/bento-grids.md) | 2025-01-30 | Growing | Asymmetric tile layouts |
| [Glassmorphism](./trends/glassmorphism.md) | 2025-01-20 | Stable | Frosted glass effects |

## Competitors

| Competitor | Date | Platform | Key Patterns |
|------------|------|----------|--------------|
| [Linear](./competitors/linear-app.md) | 2025-01-15 | Web | Bento grids, command palette |
| [Notion](./competitors/notion.md) | 2025-01-10 | Web, Mobile | Block-based, minimal UI |
```

## Integration with Plan Phase

When you run `/pixel-perfect:plan`, the command:

1. **Checks for relevant research** in `design-research/`
2. **Incorporates findings** into `paradigm.yaml` patterns section
3. **References research files** for design rationale

**Example plan output with research:**

```
Generating design artifacts...

Found relevant research:
  ✓ Mobile Bottom Navigation (design-research/topics/mobile-bottom-navigation.md)

Incorporating patterns into paradigm.yaml:
  - bottom_nav_with_fab: Primary action centered pattern
  - label_free_navigation: Space-efficient icon-only pattern
```

## Configuration

Add to `.pixel-perfect/config.json`:

```json
{
  "designResearch": {
    "enabled": true,
    "path": "design-research",
    "sources": ["exa", "jina"],
    "defaultTopics": [
      "mobile-navigation",
      "form-design",
      "onboarding"
    ]
  }
}
```

### Config Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | boolean | `false` | Enable design research feature |
| `path` | string | `"design-research"` | Research folder path (relative to `specRoot`) |
| `sources` | array | `["exa", "jina"]` | Available search sources |
| `defaultTopics` | array | `[]` | Topics to research on init |

## Best Practices

### Essential (always follow)

1. **Research before planning** - Inform paradigm decisions with research findings
2. **Use structured queries** - Include: platform + year + specific pattern
   - Good: `"mobile bottom navigation patterns 2025 iOS"`
   - Bad: `"navigation"`

### Recommended (for better results)

3. **Save everything** - Build reusable knowledge base over time
4. **Link findings** - Cross-reference related topics for discovery
5. **Include competitor analysis** - Research 2-3 competitors per category

### Advanced (for power users)

6. **Update quarterly** - Trends change; refresh research every 3 months
7. **Track pattern evolution** - Note when patterns emerge, peak, decline
8. **Cross-platform comparison** - Research same pattern on iOS vs Android vs Web

> **Deep dive**: See [Design Research Methodology](../docs/DESIGN-RESEARCH-METHODOLOGY.md) for comprehensive guidance on research workflows, source evaluation, and pattern synthesis.

---

## Design Consistency Research

When researching patterns, prioritize cross-view consistency to avoid inconsistencies during review.

### Pattern Consistency Queries

Research these topics to establish consistent patterns before designing:

```
"consistent navigation patterns mobile apps 2025"
"design system component standardization best practices"
"icon library selection material vs lucide vs heroicons"
"design token enforcement strategies"
"cross-platform UI consistency techniques"
```

### Consistency Research Checklist

Before completing research, ensure:

- [ ] **Single component definition** - Same component documented once, reused everywhere
- [ ] **Icon library selected** - One library (Material, Lucide, or Heroicons) for entire project
- [ ] **Token values exact** - No approximations; use precise hex codes, pixel values
- [ ] **Navigation order defined** - Tab/nav item order specified and consistent
- [ ] **Active state rules** - How to indicate current view in navigation

### Research → Review Connection

Research findings directly inform review criteria:

| Research Topic | Review Validation |
|----------------|-------------------|
| Icon library choice | [Icon Rendering Validation](../docs/validators/icon-rendering.md) |
| Navigation patterns | [Cross-Consistency Validation](../docs/validators/cross-consistency.md) |
| Design tokens | Token uniformity checks |
| Component standards | Component identity checks |

## Common Research Queries

**Mobile patterns:**
- "mobile bottom navigation patterns 2025"
- "mobile form validation best practices"
- "gesture-based navigation iOS android"
- "mobile onboarding flow examples"

**Web patterns:**
- "dashboard layout patterns bento grid"
- "sidebar navigation vs top navigation"
- "dark mode design implementation"
- "responsive breakpoints 2025"

**Component research:**
- "dropdown select design patterns"
- "date picker UX best practices"
- "table sorting filtering patterns"
- "modal dialog size guidelines"
