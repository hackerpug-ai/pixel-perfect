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
```

## Arguments

- `<query>`: Free-form search query for design research

## Options

- `--topic <topic>`: Research a specific design topic (e.g., "mobile-navigation", "form-design")
- `--trend <name>`: Research current design trends (e.g., "bento-grids", "glassmorphism")
- `--competitor <url>`: Analyze a competitor's design patterns
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
    └── competitors/
        └── competitor-name.md
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
