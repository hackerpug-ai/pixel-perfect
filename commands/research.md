---
description: "Research UI/UX design patterns, trends, and competitor designs using web search tools"
---

# Design Research

Research UI/UX design patterns, trends, and competitor designs using web search tools. Save findings to a research library that informs the DISCOVER phase and ongoing design decisions.

## Usage

```
/pixel-perfect:research <query> [options]
/pixel-perfect:research --topic <topic> [options]
/pixel-perfect:research --trend <trend-name> [options]
/pixel-perfect:research --competitor <url> [options]
/pixel-perfect:research --libraries <pattern> [options]
/pixel-perfect:research --ecosystem <pattern> [options]
```

## Arguments

- `<query>`: Free-form search query for design research

## Options

- `--topic <topic>`: Research a specific design topic (e.g., "mobile-navigation", "form-design")
- `--trend <name>`: Research current design trends (e.g., "bento-grids", "glassmorphism")
- `--competitor <url>`: Analyze a competitor's design patterns
- `--libraries <pattern>` or `--ecosystem <pattern>`: Research ecosystem libraries for a UI pattern (e.g., "data-table", "date-picker", "drag-and-drop")
- `--framework <name>`: Filter library results to framework-compatible libraries (inferred from manifest if available)
- `--max-results <n>`: Maximum library results to return (default: 5)
- `--sources <list>`: Specific sources to use (exa, jina, web)
- `--save`: Save research to design/research/ folder (default: true)
- `--append <file>`: Append to existing research file
- `--no-save`: Display research only, don't save

## Research Sources

The command uses available web search tools in priority order:

| Source | Description | Use For |
|--------|-------------|---------|
| **Exa** | Advanced semantic search | Design articles, case studies, trend analysis |
| **Jina** | Web reading and URL analysis | Extracting patterns from specific URLs |
| **Web Search** | General web search | Broad queries, fallback |

Source availability is detected automatically with graceful fallback.

## Output Location

Research artifacts save to `design/research/` (compatible with the manifest structure):

```
design/
├── manifest.json          # Process state (created by init)
└── research/              # Research artifacts
    ├── INDEX.md           # Catalog of all research
    ├── topics/
    │   ├── mobile-navigation.md
    │   └── form-design.md
    ├── trends/
    │   ├── bento-grids.md
    │   └── glassmorphism.md
    ├── competitors/
    │   └── competitor-name.md
    └── libraries/
        ├── data-table.md
        └── drag-and-drop.md
```

## Library Research Mode

Research ecosystem libraries for a specific UI pattern, scored against the vetting rubric in `docs/library-vetting-rubric.md`. Results are saved to `design/research/libraries/` and reused by the Ecosystem Scan (Phase 4b Step 2b of `/pixel-perfect:build`) for 30 days.

### When to Use

- **Before `/pixel-perfect:build`**: Pre-research libraries so the BUILD PLAN has scored recommendations ready
- **During `/pixel-perfect:build`**: The Ecosystem Scan triggers this automatically for complex patterns
- **Independently**: "What's the best React chart library right now?"

### Workflow

```
1. User runs: /pixel-perfect:research --libraries "data-table"

2. Command:
   a. Detects framework from manifest (or --framework flag)
   b. Searches for candidates:
      - "best {framework} data-table library 2026"
      - "{framework} data-table component npm"
      - "data-table library comparison 2026"
   c. For each candidate (up to --max-results):
      - Verifies npm/GitHub existence, downloads, stars
      - Checks recent commits, open/closed issue ratio
      - Applies vetting rubric from docs/library-vetting-rubric.md
      - Scores and ranks
   d. Presents ranked, scored results
   e. Saves to design/research/libraries/data-table.md

3. Output:
   LIBRARY RESEARCH: data-table (React Vite)
   =======================================

   #1 TanStack Table — 8/8 ★ Top pick
      Package: @tanstack/react-table@^8.20.0
      Weekly downloads: 2.1M | Stars: 26K+
      Bundle: ~13KB gzipped (tree-shakeable)
      Last release: 2026-05-15
      License: MIT
      Tradeoffs: Headless — requires UI wrapper. shadcn/ui provides a built-in wrapper.

   #2 AG Grid — 7/8
      Package: ag-grid-react@^32.0.0
      Weekly downloads: 890K | Stars: 12K+
      Bundle: ~200KB gzipped
      Last release: 2026-05-28
      License: MIT (community), Commercial (enterprise)
      Tradeoffs: Heavy bundle. Enterprise features (row grouping, server-side model) need paid license.

   #3 react-data-table-component — 5/8
      Package: react-data-table-component@^7.6.0
      Weekly downloads: 310K | Stars: 2K+
      Bundle: ~28KB gzipped
      Last release: 2025-11-02 (6 months ago)
      License: MIT
      Tradeoffs: Maintenance concern — no release in 6 months. Simpler API than TanStack.

   Saved to: design/research/libraries/data-table.md

4. Saved artifact is reused by the Ecosystem Scan for 30 days.
```

### Research Artifact Format

```markdown
# Library Research: Data Table

**Researched:** 2026-06-04
**Framework:** React (Vite)
**Pattern:** Data Table

## Summary

| # | Library | Score | Package | Downloads/wk | Bundle | License |
|---|---------|-------|---------|-------------|--------|---------|
| 1 | TanStack Table | 8/8 | @tanstack/react-table | 2.1M | ~13KB | MIT |
| 2 | AG Grid | 7/8 | ag-grid-react | 890K | ~200KB | MIT |
| 3 | react-data-table-component | 5/8 | react-data-table-component | 310K | ~28KB | MIT |

## Detailed Scores

### TanStack Table — 8/8 ★ Top Pick

| Criterion | Rating | Notes |
|-----------|--------|-------|
| Maintenance | PASS | Last release 2026-05-15, active commits |
| Popularity | STRONG | 26K+ stars, 2.1M weekly downloads |
| Compatibility | PASS | React 18/19 supported, headless |
| Bundle Size | SMALL | ~13KB gzipped, tree-shakeable by feature |
| Accessibility | YES | ARIA attributes, keyboard nav documented |
| License | COMPATIBLE | MIT |
| Tests | HIGH | 500+ tests in CI |
| Community | ACTIVE | Discord, responsive maintainers |

**Tradeoffs:** Headless — requires UI wrapper. shadcn/ui has a built-in wrapper.

### AG Grid — 7/8

| Criterion | Rating | Notes |
|-----------|--------|-------|
| Maintenance | PASS | Last release 2026-05-28 |
| Popularity | STRONG | 12K+ stars, 890K weekly downloads |
| Compatibility | PASS | React 18/19 supported |
| Bundle Size | LARGE | ~200KB gzipped, not tree-shakeable |
| Accessibility | YES | WCAG 2.1 AA compliant |
| License | COMPATIBLE | MIT (community edition) |
| Tests | HIGH | E2E tests across browsers |
| Community | ACTIVE | Enterprise support available |

**Tradeoffs:** Heavy bundle footprint. Enterprise features need paid license.
```

### Integration with Build Flow

When a BUILD PLAN is generated (Phase 4b), the Ecosystem Scan (Step 2b) uses this same research process. Cached research artifacts in `design/research/libraries/` from the last 30 days are reused — the scan only searches fresh when cached research is stale or absent.

### Fallback Mode

When web search is unavailable, research runs in offline mode using the built-in Category → Library Map from `commands/build.md` Step 2b. Results are marked `"researchMethod": "lookup-table"` and show a warning:

```
Library research ran in offline mode. Recommendations are from the built-in
lookup table and have NOT been verified against the current ecosystem.
Run again when web search is available.
```

## Research Workflow

```
1. User runs: /pixel-perfect:research "mobile bottom navigation patterns"

2. Command:
   - Searches using available tools (Exa, Jina, Web)
   - Aggregates and structures findings
   - Formats as a research artifact

3. Output saved to:
   design/research/topics/mobile-bottom-navigation.md

4. INDEX.md updated with topic name, date, sources, key findings

5. Research informs the build process:
   - DISCOVER phase: vibe selection, reference analysis
   - ATOMS phase: component design patterns
   - COMPOSE phase: screen layout patterns
```

## Research Artifact Format

```markdown
# Mobile Bottom Navigation Patterns

**Researched:** 2026-02-17
**Sources:** Exa, Jina
**Query:** mobile bottom navigation patterns

## Summary

Brief overview of key findings (2-3 sentences).

## Patterns Found

### Pattern 1: [Name]
- **Source:** [URL]
- **Description:** What this pattern is
- **Usage:** Where it's commonly used
- **Platforms:** Which platforms
- **Best for:** When to apply

## Key Insights

1. Numbered takeaways
2. Actionable for design decisions

## References

- [Title](URL) - Brief description

## Last Updated

2026-02-17
```

## INDEX.md Format

```markdown
# Design Research Catalog

Last updated: 2026-02-17

## Topics

| Topic | Date | Sources | Key Findings |
|-------|------|---------|--------------|
| [Mobile Navigation](./topics/mobile-navigation.md) | 2026-02-17 | Exa, Jina | FAB integration, label-free icons |

## Trends

| Trend | Date | Status | Description |
|-------|------|--------|-------------|
| [Bento Grids](./trends/bento-grids.md) | 2026-02-17 | Growing | Asymmetric tile layouts |

## Competitors

| Competitor | Date | Platform | Key Patterns |
|------------|------|----------|--------------|
| [Linear](./competitors/linear-app.md) | 2026-02-17 | Web | Command palette, bento grid |
```

## Examples

### Research a design topic

```
> /pixel-perfect:research --topic "mobile bottom navigation"

Searching for: mobile bottom navigation patterns
Using sources: Exa, Jina

Found 12 relevant sources...

Saved to: design/research/topics/mobile-bottom-navigation.md
Updated INDEX.md

Key findings:
  - FAB integration is standard pattern
  - Label-free icons trending in Android
  - Gesture navigation influencing tab placement
```

### Analyze competitor

```
> /pixel-perfect:research --competitor "https://linear.app"

Analyzing: https://linear.app
Using source: Jina

Extracted patterns:
  - Dark mode default
  - Command palette (Cmd+K) prominent
  - Left sidebar navigation
  - Bento grid dashboard layout

Saved to: design/research/competitors/linear-app.md
```

### Quick research without saving

```
> /pixel-perfect:research "card spacing patterns" --no-save

Quick findings:
  - 8px-16px-24px rhythm
  - Card padding: 16px mobile, 24px desktop
  - Gap between cards: 16px minimum
```

## Best Practices

1. **Research before init** - Inform DISCOVER phase with research findings
2. **Use structured queries** - Include platform + year + specific pattern
3. **Save everything** - Build reusable knowledge base
4. **Include competitor analysis** - Research 2-3 competitors per project
5. **Cross-platform comparison** - Compare patterns across iOS, Android, Web
